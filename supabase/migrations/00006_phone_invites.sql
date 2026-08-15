-- Phone-number invites: if an organiser adds someone by mobile number,
-- that person sees the group on their dashboard after they save the same
-- number on their profile. Run this in the Supabase SQL editor.

create or replace function public.normalize_in_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
      then right(regexp_replace(p_phone, '\D', '', 'g'), 10)
    else nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '')
  end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    public.normalize_in_phone(new.raw_user_meta_data->>'phone')
  )
  on conflict (id) do update
    set full_name = coalesce(nullif(trim(excluded.full_name), ''), public.profiles.full_name),
        phone = coalesce(excluded.phone, public.profiles.phone);
  return new;
end;
$$;

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

  select contribution_amount into v_amount from public.groups where id = p_group_id;

  insert into public.group_members (group_id, display_name, phone, role, status)
  values (p_group_id, trim(p_display_name), v_phone, 'member', 'active')
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
    trim(p_display_name) || ' was invited',
    'They will see this group when they sign in with this mobile number.',
    uid,
    jsonb_build_object('member_id', new_member, 'phone', v_phone)
  );

  return new_member;
end;
$$;

create or replace function public.list_phone_invites()
returns table (
  member_id uuid,
  group_id uuid,
  group_name text,
  group_type public.group_type,
  contribution_amount numeric,
  planned_member_count int,
  invited_as_name text,
  organiser_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_phone text;
begin
  if uid is null then
    return;
  end if;

  select public.normalize_in_phone(phone) into v_phone
  from public.profiles
  where id = uid;

  if v_phone is null then
    return;
  end if;

  return query
  select distinct on (gm.id)
    gm.id,
    g.id,
    g.name,
    g.type,
    g.contribution_amount,
    g.planned_member_count,
    gm.display_name,
    coalesce(organiser.display_name, 'Organiser')
  from public.group_members gm
  join public.groups g on g.id = gm.group_id
  left join public.group_members organiser
    on organiser.group_id = gm.group_id
    and organiser.role = 'admin'
    and organiser.status = 'active'
  where gm.user_id is null
    and gm.status = 'active'
    and public.normalize_in_phone(gm.phone) = v_phone
    and not exists (
      select 1
      from public.group_members mine
      where mine.group_id = gm.group_id
        and mine.user_id = uid
        and mine.status = 'active'
    )
  order by gm.id;
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

  if exists (
    select 1 from public.group_members
    where id = p_member_id and user_id is not null
  ) then
    raise exception 'Someone already joined this seat';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_group_id
      and user_id = uid
      and status = 'active'
  ) then
    return v_group_id;
  end if;

  update public.group_members
  set user_id = uid,
      display_name = coalesce(nullif(trim(v_name), ''), display_name),
      phone = v_phone
  where id = p_member_id;

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

grant execute on function public.normalize_in_phone(text) to authenticated;
grant execute on function public.list_phone_invites() to authenticated;
grant execute on function public.claim_phone_invite(uuid) to authenticated;
grant execute on function public.add_group_member(uuid, text, text) to authenticated;
