-- Member requests extra hands; organiser approves.
-- Bid windows are stored as timestamptz; the app treats them as IST.
-- Run this in the Supabase SQL editor.

create table if not exists public.hand_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  requested_hands int not null check (requested_hands between 2 and 20),
  current_hands int not null check (current_hands >= 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id)
);

create unique index if not exists hand_requests_pending_unique
  on public.hand_requests (group_id, user_id)
  where status = 'pending';

alter table public.hand_requests enable row level security;

drop policy if exists hand_requests_select on public.hand_requests;
create policy hand_requests_select on public.hand_requests
  for select using (public.is_group_member(group_id));

grant select on public.hand_requests to authenticated;

create or replace function public.request_hands(p_group_id uuid, p_requested_hands int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_seat uuid;
  v_current int;
  v_active int;
  v_planned int;
  v_id uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_requested_hands < 2 then
    raise exception 'Ask for at least 2 hands';
  end if;

  select id into v_seat
  from public.group_members
  where group_id = p_group_id
    and user_id = uid
    and status = 'active'
  order by hand_number
  limit 1;

  if v_seat is null then
    raise exception 'Join this group first';
  end if;

  select count(*) into v_current
  from public.group_members
  where group_id = p_group_id and user_id = uid and status = 'active';

  if p_requested_hands <= v_current then
    raise exception 'You already have % hands', v_current;
  end if;

  if exists (
    select 1 from public.hand_requests
    where group_id = p_group_id and user_id = uid and status = 'pending'
  ) then
    raise exception 'A hand request is already waiting for the organiser';
  end if;

  select planned_member_count into v_planned from public.groups where id = p_group_id;
  select count(*) into v_active
  from public.group_members
  where group_id = p_group_id and status = 'active';

  if v_active + (p_requested_hands - v_current) > v_planned then
    raise exception 'Only % hands are left in this Bhishi', v_planned - v_active;
  end if;

  insert into public.hand_requests (
    group_id, user_id, member_id, requested_hands, current_hands, status
  )
  values (p_group_id, uid, v_seat, p_requested_hands, v_current, 'pending')
  returning id into v_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    p_group_id,
    'member',
    'Asked to play ' || p_requested_hands || ' hands',
    'Organiser must approve before extra hands are added.',
    uid,
    jsonb_build_object('request_id', v_id, 'requested_hands', p_requested_hands)
  );

  return v_id;
end;
$$;

create or replace function public.decide_hand_request(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group uuid;
  v_member uuid;
  v_user uuid;
  v_want int;
  v_have int;
  v_extra int;
  v_i int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select group_id, member_id, user_id, requested_hands, current_hands
    into v_group, v_member, v_user, v_want, v_have
  from public.hand_requests
  where id = p_request_id and status = 'pending'
  for update;

  if v_group is null then
    raise exception 'No pending request';
  end if;
  if not public.is_group_admin(v_group) then
    raise exception 'Only an organiser can decide this';
  end if;

  if not p_approve then
    update public.hand_requests
    set status = 'declined', decided_at = now(), decided_by = uid
    where id = p_request_id;
    insert into public.activity_events (group_id, kind, title, actor_id, metadata)
    values (v_group, 'member', 'Hand request declined', uid, jsonb_build_object('request_id', p_request_id));
    return;
  end if;

  select count(*) into v_have
  from public.group_members
  where group_id = v_group and user_id = v_user and status = 'active';

  v_extra := v_want - v_have;
  if v_extra < 1 then
    update public.hand_requests
    set status = 'approved', decided_at = now(), decided_by = uid
    where id = p_request_id;
    return;
  end if;

  for v_i in 1..v_extra loop
    perform public.add_member_hand(v_member);
  end loop;

  update public.hand_requests
  set status = 'approved', decided_at = now(), decided_by = uid
  where id = p_request_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group,
    'member',
    'Approved ' || v_want || ' hands',
    'Extra hands now pay hapta and can each win once.',
    uid,
    jsonb_build_object('request_id', p_request_id, 'hands', v_want)
  );
end;
$$;

grant execute on function public.request_hands(uuid, int) to authenticated;
grant execute on function public.decide_hand_request(uuid, boolean) to authenticated;
