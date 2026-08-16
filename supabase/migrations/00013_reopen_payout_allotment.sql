-- Re-open keep/allot for lucky draws that were saved as already accepted,
-- and make sure new chitthis wait for the winner to keep or allot.
-- Run this in the Supabase SQL editor after 00011.

alter table public.payouts
  add column if not exists drawn_member_id uuid references public.group_members (id),
  add column if not exists acceptance_status text not null default 'accepted',
  add column if not exists transfer_to_member_id uuid references public.group_members (id);

update public.payouts
set drawn_member_id = winner_member_id
where drawn_member_id is null;

update public.payouts p
set acceptance_status = 'pending_accept'
from public.cycles c
join public.groups g on g.id = c.group_id
where p.cycle_id = c.id
  and g.type = 'lucky_draw'
  and coalesce(p.method, 'draw') = 'draw'
  and p.status = 'pending'
  and p.acceptance_status = 'accepted'
  and coalesce(p.drawn_member_id, p.winner_member_id) = p.winner_member_id
  and c.status = 'drawn';

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
  select display_name into v_winner_name from public.group_members where id = v_winner;

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
    'They can keep the pool or allot it to another member. The organiser must approve an allotment.',
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
