-- Fix: CASE in create_group returned text, but cycles.status is cycle_status.
-- Run this in the Supabase SQL editor.

create or replace function public.create_group(
  p_name text,
  p_type public.group_type,
  p_amount numeric,
  p_member_count int,
  p_frequency public.cycle_frequency,
  p_start_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id uuid;
  profile_name text;
  i int;
  v_due date;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_type = 'loan' then
    raise exception 'Loan groups are not available yet';
  end if;
  if length(trim(p_name)) < 2 then
    raise exception 'Group name is too short';
  end if;
  if p_amount <= 0 then
    raise exception 'Amount must be greater than 0';
  end if;
  if p_member_count < 2 or p_member_count > 50 then
    raise exception 'Member count must be between 2 and 50';
  end if;

  insert into public.profiles (id, full_name)
  values (uid, '')
  on conflict (id) do nothing;

  select full_name into profile_name from public.profiles where id = uid;

  insert into public.groups (
    name, type, contribution_amount, planned_member_count,
    frequency, start_date, created_by
  )
  values (
    trim(p_name), p_type, p_amount, p_member_count,
    p_frequency, p_start_date, uid
  )
  returning id into new_id;

  insert into public.group_members (group_id, user_id, display_name, role, status)
  values (
    new_id,
    uid,
    coalesce(nullif(trim(profile_name), ''), 'Organiser'),
    'admin',
    'active'
  );

  insert into public.group_settings (group_id) values (new_id);

  for i in 1..p_member_count loop
    if p_frequency = 'weekly' then
      v_due := (p_start_date + ((i - 1) * 7));
    else
      v_due := (p_start_date + ((i - 1) || ' months')::interval)::date;
    end if;

    insert into public.cycles (group_id, cycle_number, due_date, pool_amount, status)
    values (
      new_id,
      i,
      v_due,
      p_amount * p_member_count,
      case
        when i = 1 then 'open'::public.cycle_status
        else 'upcoming'::public.cycle_status
      end
    );
  end loop;

  insert into public.contributions (cycle_id, member_id, amount_due)
  select c.id, m.id, p_amount
  from public.cycles c
  join public.group_members m on m.group_id = c.group_id
  where c.group_id = new_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id)
  values (
    new_id,
    'round',
    trim(p_name) || ' was created',
    'Add members, then track contributions and run the first round.',
    uid
  );

  return new_id;
end;
$$;

grant execute on function public.create_group(text, public.group_type, numeric, int, public.cycle_frequency, date) to authenticated;
