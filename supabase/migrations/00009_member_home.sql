-- Member hapta claims, leave/replace seats, and self-serve paid default.
-- Run this in the Supabase SQL editor.

alter table public.group_settings
  alter column self_serve_paid set default true;

update public.group_settings set self_serve_paid = true where self_serve_paid is distinct from true;

create or replace function public.claim_hapta(
  p_contribution_id uuid,
  p_payment_mode public.payment_mode default 'upi'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_member text;
  v_status public.contribution_status;
  v_self_serve boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.group_id, m.display_name, contrib.status, coalesce(s.self_serve_paid, true)
    into v_group_id, v_member, v_status, v_self_serve
  from public.contributions contrib
  join public.cycles c on c.id = contrib.cycle_id
  join public.group_members m on m.id = contrib.member_id
  left join public.group_settings s on s.group_id = c.group_id
  where contrib.id = p_contribution_id
    and m.user_id = uid
    and m.status = 'active';

  if v_group_id is null then
    raise exception 'This hapta row is not yours';
  end if;
  if not v_self_serve then
    raise exception 'The organiser has turned off self-marking for this group';
  end if;
  if v_status = 'paid' then
    raise exception 'This month is already marked paid';
  end if;

  update public.contributions
  set
    member_claimed_at = now(),
    payment_mode = coalesce(p_payment_mode, payment_mode, 'upi')
  where id = p_contribution_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'payment',
    v_member || ' said they paid hapta',
    'Waiting for the organiser to confirm.',
    uid,
    jsonb_build_object('contribution_id', p_contribution_id, 'claimed', true)
  );
end;
$$;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_member uuid;
  v_role public.member_role;
  v_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select id, role, display_name
    into v_member, v_role, v_name
  from public.group_members
  where group_id = p_group_id
    and user_id = uid
    and status = 'active';

  if v_member is null then
    raise exception 'You are not in this group';
  end if;
  if v_role = 'admin' then
    raise exception 'The organiser cannot leave. Delete the group instead.';
  end if;
  if exists (
    select 1 from public.payouts p
    join public.cycles c on c.id = p.cycle_id
    where c.group_id = p_group_id and p.winner_member_id = v_member
  ) then
    raise exception 'A member who has received the pool cannot leave';
  end if;

  update public.group_members
  set status = 'left', user_id = null
  where id = v_member;

  perform public.refresh_cycle_pools(p_group_id);

  insert into public.activity_events (group_id, kind, title, actor_id, metadata)
  values (
    p_group_id,
    'member',
    coalesce(v_name, 'A member') || ' left the group',
    uid,
    jsonb_build_object('member_id', v_member)
  );
end;
$$;

create or replace function public.replace_group_member(
  p_member_id uuid,
  p_display_name text,
  p_phone text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_role public.member_role;
  v_old_name text;
  v_phone text;
  v_new uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if length(trim(p_display_name)) < 2 then
    raise exception 'Member name is too short';
  end if;

  select group_id, role, display_name
    into v_group_id, v_role, v_old_name
  from public.group_members
  where id = p_member_id
    and status = 'active';

  if v_group_id is null then
    raise exception 'Member not found';
  end if;
  if not public.is_group_admin(v_group_id) then
    raise exception 'Only an organiser can replace a member';
  end if;
  if v_role = 'admin' then
    raise exception 'The organiser cannot be replaced this way';
  end if;
  if exists (
    select 1 from public.payouts p
    join public.cycles c on c.id = p.cycle_id
    where c.group_id = v_group_id and p.winner_member_id = p_member_id
  ) then
    raise exception 'A member who has received the pool cannot be replaced';
  end if;

  v_phone := public.normalize_in_phone(p_phone);
  if v_phone is null or length(v_phone) <> 10 then
    raise exception 'Mobile number is required';
  end if;

  update public.group_members
  set status = 'replaced', user_id = null, phone = null
  where id = p_member_id;

  insert into public.group_members (group_id, display_name, phone, role, status)
  values (v_group_id, trim(p_display_name), v_phone, 'member', 'active')
  returning id into v_new;

  update public.contributions
  set member_id = v_new
  where member_id = p_member_id;

  update public.bids
  set member_id = v_new
  where member_id = p_member_id;

  perform public.refresh_cycle_pools(v_group_id);

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'member',
    trim(p_display_name) || ' replaced ' || coalesce(v_old_name, 'a member'),
    'The new person takes over this seat, including hapta already recorded.',
    uid,
    jsonb_build_object('old_member_id', p_member_id, 'new_member_id', v_new)
  );

  return v_new;
end;
$$;

drop function if exists public.update_group_settings(uuid, text, text, int);

create or replace function public.update_group_settings(
  p_group_id uuid,
  p_late_fee_notes text,
  p_dropout_notes text,
  p_reminder_days_before int,
  p_self_serve_paid boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only an organiser can update settings';
  end if;

  update public.group_settings
  set
    late_fee_notes = nullif(trim(p_late_fee_notes), ''),
    dropout_notes = nullif(trim(p_dropout_notes), ''),
    reminder_days_before = greatest(0, least(coalesce(p_reminder_days_before, 3), 28)),
    self_serve_paid = coalesce(p_self_serve_paid, true)
  where group_id = p_group_id;
end;
$$;

grant execute on function public.claim_hapta(uuid, public.payment_mode) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.replace_group_member(uuid, text, text) to authenticated;
grant execute on function public.update_group_settings(uuid, text, text, int, boolean) to authenticated;
