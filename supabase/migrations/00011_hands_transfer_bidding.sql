-- Multiple hands, win transfer with organiser approval, and bidding windows.
-- Run this in the Supabase SQL editor.

alter table public.group_members
  add column if not exists hand_number int not null default 1;

alter table public.cycles
  add column if not exists bid_opens_at timestamptz,
  add column if not exists bid_closes_at timestamptz;

alter table public.payouts
  add column if not exists drawn_member_id uuid references public.group_members (id),
  add column if not exists acceptance_status text not null default 'accepted',
  add column if not exists transfer_to_member_id uuid references public.group_members (id);

update public.payouts
set drawn_member_id = winner_member_id
where drawn_member_id is null;

alter table public.payouts
  alter column drawn_member_id set default null;

drop index if exists public.group_members_user_unique;
drop index if exists public.group_members_phone_unique;

create unique index if not exists group_members_user_hand_unique
  on public.group_members (group_id, user_id, hand_number)
  where user_id is not null;

create unique index if not exists group_members_phone_hand_unique
  on public.group_members (group_id, phone, hand_number)
  where phone is not null and status = 'active';

create or replace function public.add_group_member(
  p_group_id uuid,
  p_display_name text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_member uuid;
  v_amount numeric;
  v_phone text;
  v_hand int;
  v_planned int;
  v_active int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only an organiser can add members';
  end if;
  if length(trim(p_display_name)) < 2 then
    raise exception 'Member name is too short';
  end if;

  v_phone := public.normalize_in_phone(p_phone);
  if v_phone is null or length(v_phone) <> 10 then
    raise exception 'Mobile number is required';
  end if;

  select contribution_amount, planned_member_count
    into v_amount, v_planned
  from public.groups where id = p_group_id;

  select count(*) into v_active
  from public.group_members
  where group_id = p_group_id and status = 'active';

  if v_active >= v_planned then
    raise exception 'All % hands are filled. Add another hand only if a seat is free.', v_planned;
  end if;

  select coalesce(max(hand_number), 0) + 1 into v_hand
  from public.group_members
  where group_id = p_group_id
    and status = 'active'
    and public.normalize_in_phone(phone) = v_phone;

  insert into public.group_members (group_id, display_name, phone, role, status, hand_number)
  values (p_group_id, trim(p_display_name), v_phone, 'member', 'active', v_hand)
  returning id into new_member;

  insert into public.contributions (cycle_id, member_id, amount_due)
  select c.id, new_member, v_amount
  from public.cycles c
  where c.group_id = p_group_id
  on conflict (cycle_id, member_id) do nothing;

  perform public.refresh_cycle_pools(p_group_id);

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    p_group_id,
    'member',
    trim(p_display_name) || case when v_hand > 1 then ' · hand ' || v_hand else '' end || ' was invited',
    'Each hand pays one hapta and can win the pool once.',
    uid,
    jsonb_build_object('member_id', new_member, 'hand_number', v_hand)
  );

  return new_member;
end;
$$;

create or replace function public.add_member_hand(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_name text;
  v_phone text;
  v_user uuid;
  v_new uuid;
begin
  select group_id, display_name, phone, user_id
    into v_group, v_name, v_phone, v_user
  from public.group_members
  where id = p_member_id and status = 'active';

  if v_group is null then
    raise exception 'Member not found';
  end if;
  if not public.is_group_admin(v_group) then
    raise exception 'Only an organiser can add another hand';
  end if;

  v_new := public.add_group_member(v_group, v_name, v_phone);

  if v_user is not null then
    update public.group_members
    set user_id = v_user
    where id = v_new;
  end if;

  return v_new;
end;
$$;

create or replace function public.claim_phone_invite(p_member_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_phone text;
  v_name text;
  v_group_id uuid;
  v_member_phone text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select public.normalize_in_phone(phone), full_name
    into v_phone, v_name
  from public.profiles
  where id = uid;

  if v_phone is null then
    raise exception 'Add your mobile number in Profile first';
  end if;

  select group_id, public.normalize_in_phone(phone)
    into v_group_id, v_member_phone
  from public.group_members
  where id = p_member_id
    and status = 'active'
  for update;

  if v_group_id is null then
    raise exception 'This invite is no longer available';
  end if;
  if v_member_phone is null or v_member_phone <> v_phone then
    raise exception 'This invite is for a different mobile number';
  end if;

  update public.group_members
  set user_id = uid,
      display_name = coalesce(nullif(trim(v_name), ''), display_name),
      phone = v_phone
  where group_id = v_group_id
    and status = 'active'
    and user_id is null
    and public.normalize_in_phone(phone) = v_phone;

  insert into public.activity_events (group_id, kind, title, actor_id, metadata)
  values (
    v_group_id,
    'member',
    coalesce(nullif(trim(v_name), ''), 'A member') || ' joined from their invite',
    uid,
    jsonb_build_object('member_id', p_member_id)
  );

  return v_group_id;
end;
$$;

create or replace function public.run_lucky_draw(p_cycle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_type public.group_type;
  v_winner uuid;
  v_winner_name text;
  v_eligible uuid[];
  v_member_count int;
  v_due date;
  v_cycle_number int;
  v_today date := (timezone('Asia/Kolkata', now()))::date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.group_id, g.type, c.due_date, c.cycle_number
    into v_group_id, v_type, v_due, v_cycle_number
  from public.cycles c
  join public.groups g on g.id = c.group_id
  where c.id = p_cycle_id;

  if v_group_id is null then
    raise exception 'Round not found';
  end if;
  if v_type <> 'lucky_draw' then
    raise exception 'Lucky draw is only for lucky draw groups';
  end if;
  if not public.is_group_admin(v_group_id) then
    raise exception 'Only an organiser can run the draw';
  end if;
  if exists (select 1 from public.payouts where cycle_id = p_cycle_id) then
    raise exception 'This month already has a winner. Next chitthi is next month.';
  end if;
  if v_due > v_today then
    raise exception 'Chitthi can be drawn only on or after %. One draw each month.', to_char(v_due, 'DD Mon YYYY');
  end if;
  if exists (
    select 1 from public.cycles
    where group_id = v_group_id
      and cycle_number < v_cycle_number
      and status not in ('drawn', 'paid_out', 'closed')
  ) then
    raise exception 'Finish the previous month first';
  end if;

  select count(*) into v_member_count
  from public.group_members
  where group_id = v_group_id and status = 'active';

  if v_member_count < 2 then
    raise exception 'Add at least 1 more member before starting a round';
  end if;

  select coalesce(array_agg(gm.id), '{}')
    into v_eligible
  from public.group_members gm
  where gm.group_id = v_group_id
    and gm.status = 'active'
    and not exists (
      select 1
      from public.payouts p
      join public.cycles c on c.id = p.cycle_id
      where c.group_id = v_group_id
        and p.winner_member_id = gm.id
    );

  if coalesce(array_length(v_eligible, 1), 0) = 0 then
    raise exception 'Everyone has already received the pool';
  end if;

  v_winner := v_eligible[1 + floor(random() * array_length(v_eligible, 1))::int];
  select display_name || case when hand_number > 1 then ' · hand ' || hand_number else '' end
    into v_winner_name from public.group_members where id = v_winner;

  insert into public.payouts (
    cycle_id, winner_member_id, drawn_member_id, method, eligible_member_ids, drawn_by, acceptance_status
  )
  values (p_cycle_id, v_winner, v_winner, 'draw', v_eligible, uid, 'pending_accept');

  update public.cycles set status = 'drawn' where id = p_cycle_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'winner',
    v_winner_name || ' won this month''s chitthi',
    'They can keep it or ask the organiser to transfer it to another hand.',
    uid,
    jsonb_build_object('cycle_id', p_cycle_id, 'winner_member_id', v_winner)
  );

  return jsonb_build_object(
    'winner_member_id', v_winner,
    'winner_name', v_winner_name,
    'eligible_member_ids', v_eligible
  );
end;
$$;

create or replace function public.accept_payout(p_cycle_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_drawn uuid;
  v_status text;
begin
  select c.group_id, p.drawn_member_id, p.acceptance_status
    into v_group, v_drawn, v_status
  from public.payouts p
  join public.cycles c on c.id = p.cycle_id
  where p.cycle_id = p_cycle_id;

  if v_group is null then
    raise exception 'No winner for this month';
  end if;
  if v_status not in ('pending_accept', 'transfer_requested') then
    raise exception 'This month is already settled';
  end if;
  if not public.is_group_admin(v_group)
     and not exists (
       select 1 from public.group_members
       where id = v_drawn and user_id = uid and status = 'active'
     ) then
    raise exception 'Only the winner or organiser can accept';
  end if;

  update public.payouts
  set acceptance_status = 'accepted',
      transfer_to_member_id = null
  where cycle_id = p_cycle_id;

  insert into public.activity_events (group_id, kind, title, actor_id, metadata)
  values (v_group, 'winner', 'Winner kept this month''s pool', uid, jsonb_build_object('cycle_id', p_cycle_id));
end;
$$;

create or replace function public.request_payout_transfer(p_cycle_id uuid, p_to_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_drawn uuid;
  v_status text;
  v_to_name text;
begin
  select c.group_id, p.drawn_member_id, p.acceptance_status
    into v_group, v_drawn, v_status
  from public.payouts p
  join public.cycles c on c.id = p.cycle_id
  where p.cycle_id = p_cycle_id;

  if v_group is null then
    raise exception 'No winner for this month';
  end if;
  if v_status not in ('pending_accept', 'transfer_requested') then
    raise exception 'This month is already settled';
  end if;
  if p_to_member_id = v_drawn then
    raise exception 'Pick a different hand';
  end if;
  if not exists (
    select 1 from public.group_members
    where id = p_to_member_id and group_id = v_group and status = 'active'
  ) then
    raise exception 'That member is not in this group';
  end if;
  if not public.is_group_admin(v_group)
     and not exists (
       select 1 from public.group_members
       where id = v_drawn and user_id = uid and status = 'active'
     ) then
    raise exception 'Only the winner or organiser can request a transfer';
  end if;

  select display_name into v_to_name from public.group_members where id = p_to_member_id;

  update public.payouts
  set acceptance_status = 'transfer_requested',
      transfer_to_member_id = p_to_member_id
  where cycle_id = p_cycle_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group,
    'winner',
    'Transfer requested to ' || v_to_name,
    'Organiser must approve. The original winner stays eligible if approved.',
    uid,
    jsonb_build_object('cycle_id', p_cycle_id, 'to_member_id', p_to_member_id)
  );
end;
$$;

create or replace function public.decide_payout_transfer(p_cycle_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_to uuid;
  v_to_name text;
  v_status text;
begin
  select c.group_id, p.transfer_to_member_id, p.acceptance_status
    into v_group, v_to, v_status
  from public.payouts p
  join public.cycles c on c.id = p.cycle_id
  where p.cycle_id = p_cycle_id;

  if v_group is null then
    raise exception 'No winner for this month';
  end if;
  if not public.is_group_admin(v_group) then
    raise exception 'Only an organiser can approve a transfer';
  end if;
  if v_status <> 'transfer_requested' or v_to is null then
    raise exception 'No transfer is waiting';
  end if;

  if p_approve then
    select display_name into v_to_name from public.group_members where id = v_to;
    update public.payouts
    set winner_member_id = v_to,
        acceptance_status = 'transferred'
    where cycle_id = p_cycle_id;
    insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
    values (
      v_group,
      'winner',
      v_to_name || ' will receive this month''s pool',
      'The chitthi winner stays eligible for later months.',
      uid,
      jsonb_build_object('cycle_id', p_cycle_id, 'to_member_id', v_to)
    );
  else
    update public.payouts
    set acceptance_status = 'pending_accept',
        transfer_to_member_id = null
    where cycle_id = p_cycle_id;
    insert into public.activity_events (group_id, kind, title, actor_id, metadata)
    values (v_group, 'winner', 'Transfer request declined', uid, jsonb_build_object('cycle_id', p_cycle_id));
  end if;
end;
$$;

create or replace function public.set_bid_window(
  p_cycle_id uuid,
  p_opens_at timestamptz,
  p_closes_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group uuid;
  v_type public.group_type;
begin
  select c.group_id, g.type
    into v_group, v_type
  from public.cycles c
  join public.groups g on g.id = c.group_id
  where c.id = p_cycle_id;

  if v_group is null then
    raise exception 'Month not found';
  end if;
  if v_type <> 'bidding' then
    raise exception 'Bidding windows are only for bidding groups';
  end if;
  if not public.is_group_admin(v_group) then
    raise exception 'Only an organiser can set the bidding window';
  end if;
  if exists (select 1 from public.payouts where cycle_id = p_cycle_id) then
    raise exception 'This month is already locked';
  end if;
  if p_closes_at <= p_opens_at then
    raise exception 'Close time must be after open time';
  end if;

  update public.cycles
  set bid_opens_at = p_opens_at,
      bid_closes_at = p_closes_at,
      status = 'open'
  where id = p_cycle_id;
end;
$$;

drop function if exists public.upsert_bid(uuid, numeric);

create or replace function public.upsert_bid(
  p_cycle_id uuid,
  p_discount numeric,
  p_member_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_member uuid;
  v_opens timestamptz;
  v_closes timestamptz;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_discount < 0 then
    raise exception 'Bid cannot be negative';
  end if;

  select c.group_id, c.bid_opens_at, c.bid_closes_at
    into v_group, v_opens, v_closes
  from public.cycles c
  where c.id = p_cycle_id;

  if v_group is null then
    raise exception 'Month not found';
  end if;
  if exists (select 1 from public.payouts where cycle_id = p_cycle_id) then
    raise exception 'Bidding is locked';
  end if;
  if v_opens is null or now() < v_opens then
    raise exception 'Bidding is not open yet';
  end if;
  if v_closes is null or now() > v_closes then
    raise exception 'Bidding window has closed';
  end if;

  if p_member_id is not null then
    select id into v_member
    from public.group_members
    where id = p_member_id
      and group_id = v_group
      and user_id = uid
      and status = 'active'
      and not exists (
        select 1 from public.payouts p
        join public.cycles c on c.id = p.cycle_id
        where c.group_id = v_group and p.winner_member_id = p_member_id
      );
  else
    select id into v_member
    from public.group_members
    where group_id = v_group
      and user_id = uid
      and status = 'active'
      and not exists (
        select 1 from public.payouts p
        join public.cycles c on c.id = p.cycle_id
        where c.group_id = v_group and p.winner_member_id = group_members.id
      )
    order by hand_number
    limit 1;
  end if;

  if v_member is null then
    raise exception 'You cannot bid on this month';
  end if;

  insert into public.bids (cycle_id, member_id, discount_amount)
  values (p_cycle_id, v_member, p_discount)
  on conflict (cycle_id, member_id)
  do update set discount_amount = excluded.discount_amount, created_at = now();
end;
$$;

create or replace function public.close_bidding(p_cycle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_type public.group_type;
  v_pool numeric;
  v_closes timestamptz;
  v_winner uuid;
  v_name text;
  v_discount numeric;
  v_others int;
  v_bonus numeric;
  v_eligible uuid[];
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.group_id, g.type, c.pool_amount, c.bid_closes_at
    into v_group, v_type, v_pool, v_closes
  from public.cycles c
  join public.groups g on g.id = c.group_id
  where c.id = p_cycle_id;

  if v_group is null then
    raise exception 'Month not found';
  end if;
  if v_type <> 'bidding' then
    raise exception 'This is not a bidding group';
  end if;
  if not public.is_group_admin(v_group) then
    raise exception 'Only an organiser can lock the bid';
  end if;
  if exists (select 1 from public.payouts where cycle_id = p_cycle_id) then
    raise exception 'This month is already locked';
  end if;
  if v_closes is not null and now() < v_closes then
    raise exception 'Wait until the bidding window closes';
  end if;

  select coalesce(array_agg(gm.id), '{}')
    into v_eligible
  from public.group_members gm
  where gm.group_id = v_group
    and gm.status = 'active'
    and not exists (
      select 1 from public.payouts p
      join public.cycles c on c.id = p.cycle_id
      where c.group_id = v_group and p.winner_member_id = gm.id
    );

  select b.member_id, b.discount_amount,
         m.display_name || case when m.hand_number > 1 then ' · hand ' || m.hand_number else '' end
    into v_winner, v_discount, v_name
  from public.bids b
  join public.group_members m on m.id = b.member_id
  where b.cycle_id = p_cycle_id
  order by b.discount_amount asc, b.created_at asc
  limit 1;

  if v_winner is null then
    raise exception 'No bids yet';
  end if;

  v_others := greatest(coalesce(array_length(v_eligible, 1), 1) - 1, 1);
  v_bonus := round(v_discount / v_others, 2);

  insert into public.payouts (
    cycle_id, winner_member_id, drawn_member_id, method,
    bid_discount, bonus_per_member, eligible_member_ids, drawn_by, acceptance_status
  )
  values (
    p_cycle_id, v_winner, v_winner, 'bid',
    v_discount, v_bonus, v_eligible, uid, 'accepted'
  );

  update public.cycles set status = 'drawn' where id = p_cycle_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group,
    'winner',
    v_name || ' won the lilav at ' || v_discount::text,
    'Each other hand gets bonus ' || v_bonus::text || '. Winner takes the pool minus the bid.',
    uid,
    jsonb_build_object('cycle_id', p_cycle_id, 'discount', v_discount, 'bonus', v_bonus)
  );

  return jsonb_build_object(
    'winner_member_id', v_winner,
    'winner_name', v_name,
    'discount', v_discount,
    'bonus_per_member', v_bonus,
    'winner_takes', v_pool - v_discount
  );
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bids'
  ) then
    execute 'alter publication supabase_realtime add table public.bids';
  end if;
end $$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_member uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id into v_member
  from public.group_members
  where group_id = p_group_id
    and user_id = uid
    and status = 'active'
    and role <> 'admin'
    and not exists (
      select 1 from public.payouts p
      join public.cycles c on c.id = p.cycle_id
      where c.group_id = p_group_id and p.winner_member_id = group_members.id
    )
  order by hand_number
  limit 1;

  if v_member is null then
    raise exception 'No eligible hand to leave. A hand that received the pool stays.';
  end if;

  perform public.leave_group_seat(v_member);
end;
$$;

create or replace function public.leave_group_seat(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_role public.member_role;
  v_name text;
  v_user uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select group_id, role, display_name, user_id
    into v_group, v_role, v_name, v_user
  from public.group_members
  where id = p_member_id and status = 'active';

  if v_group is null then
    raise exception 'Seat not found';
  end if;
  if v_user is distinct from uid then
    raise exception 'You can only leave your own hand';
  end if;
  if v_role = 'admin' then
    raise exception 'The organiser cannot leave. Delete the group instead.';
  end if;
  if exists (
    select 1 from public.payouts p
    join public.cycles c on c.id = p.cycle_id
    where c.group_id = v_group and p.winner_member_id = p_member_id
  ) then
    raise exception 'A hand that has received the pool cannot leave';
  end if;

  update public.group_members
  set status = 'left', user_id = null
  where id = p_member_id;

  perform public.refresh_cycle_pools(v_group);

  insert into public.activity_events (group_id, kind, title, actor_id, metadata)
  values (
    v_group,
    'member',
    coalesce(v_name, 'A member') || ' left a hand',
    uid,
    jsonb_build_object('member_id', p_member_id)
  );
end;
$$;

grant execute on function public.add_group_member(uuid, text, text) to authenticated;
grant execute on function public.add_member_hand(uuid) to authenticated;
grant execute on function public.claim_phone_invite(uuid) to authenticated;
grant execute on function public.run_lucky_draw(uuid) to authenticated;
grant execute on function public.accept_payout(uuid) to authenticated;
grant execute on function public.request_payout_transfer(uuid, uuid) to authenticated;
grant execute on function public.decide_payout_transfer(uuid, boolean) to authenticated;
grant execute on function public.set_bid_window(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.upsert_bid(uuid, numeric, uuid) to authenticated;
grant execute on function public.close_bidding(uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.leave_group_seat(uuid) to authenticated;
