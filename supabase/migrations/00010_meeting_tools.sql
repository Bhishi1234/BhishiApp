-- Co-organiser, postpone a month, and live chitthi updates.
-- Run this in the Supabase SQL editor.

alter table public.cycles
  add column if not exists postpone_note text;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = gid
      and user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.set_co_admin(
  p_member_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_role public.member_role;
  v_user uuid;
  v_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select group_id, role, user_id, display_name
    into v_group_id, v_role, v_user, v_name
  from public.group_members
  where id = p_member_id
    and status = 'active';

  if v_group_id is null then
    raise exception 'Member not found';
  end if;
  if not public.is_group_owner(v_group_id) then
    raise exception 'Only the organiser can appoint a co-organiser';
  end if;
  if v_role = 'admin' then
    raise exception 'The organiser cannot be changed this way';
  end if;

  if p_enabled then
    if v_user is null then
      raise exception 'They must sign in before they can be co-organiser';
    end if;

    update public.group_members
    set role = 'member'
    where group_id = v_group_id
      and role = 'co_admin'
      and status = 'active'
      and id <> p_member_id;

    update public.group_members
    set role = 'co_admin'
    where id = p_member_id;

    insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
    values (
      v_group_id,
      'member',
      v_name || ' is now co-organiser',
      'They can mark hapta and draw the chitthi. Only the organiser can delete the group.',
      uid,
      jsonb_build_object('member_id', p_member_id, 'co_admin', true)
    );
  else
    update public.group_members
    set role = 'member'
    where id = p_member_id
      and role = 'co_admin';

    insert into public.activity_events (group_id, kind, title, actor_id, metadata)
    values (
      v_group_id,
      'member',
      v_name || ' is no longer co-organiser',
      uid,
      jsonb_build_object('member_id', p_member_id, 'co_admin', false)
    );
  end if;
end;
$$;

create or replace function public.postpone_cycle(
  p_cycle_id uuid,
  p_new_due date,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_due date;
  v_number int;
  v_today date := (timezone('Asia/Kolkata', now()))::date;
  v_delta int;
  v_note text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select group_id, due_date, cycle_number
    into v_group_id, v_due, v_number
  from public.cycles
  where id = p_cycle_id;

  if v_group_id is null then
    raise exception 'Month not found';
  end if;
  if not public.is_group_admin(v_group_id) then
    raise exception 'Only an organiser can postpone a month';
  end if;
  if exists (select 1 from public.payouts where cycle_id = p_cycle_id) then
    raise exception 'This month is already drawn and cannot be moved';
  end if;
  if p_new_due < v_today then
    raise exception 'New due date cannot be in the past';
  end if;
  if p_new_due = v_due then
    raise exception 'Pick a different date';
  end if;

  v_delta := p_new_due - v_due;
  v_note := nullif(trim(p_note), '');

  update public.cycles
  set
    due_date = due_date + v_delta,
    postpone_note = case when id = p_cycle_id then v_note else postpone_note end
  where group_id = v_group_id
    and cycle_number >= v_number
    and not exists (select 1 from public.payouts p where p.cycle_id = cycles.id);

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'round',
    'Month ' || v_number || ' postponed to ' || to_char(p_new_due, 'DD Mon YYYY'),
    coalesce(v_note, 'Later undrawn months moved by the same number of days.'),
    uid,
    jsonb_build_object(
      'cycle_id', p_cycle_id,
      'old_due', v_due,
      'new_due', p_new_due,
      'delta_days', v_delta
    )
  );
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payouts'
  ) then
    execute 'alter publication supabase_realtime add table public.payouts';
  end if;
end $$;

grant execute on function public.is_group_owner(uuid) to authenticated;
grant execute on function public.set_co_admin(uuid, boolean) to authenticated;
grant execute on function public.postpone_cycle(uuid, date, text) to authenticated;
