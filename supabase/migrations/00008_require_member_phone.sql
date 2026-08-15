-- Mobile number is required when adding a member.
-- Run this in the Supabase SQL editor.

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

grant execute on function public.add_group_member(uuid, text, text) to authenticated;
