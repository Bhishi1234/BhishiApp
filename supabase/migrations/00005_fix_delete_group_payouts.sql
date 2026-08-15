-- Fix group delete when a lucky-draw winner already exists.
-- payouts.winner_member_id references group_members without cascade, so
-- DELETE FROM groups can try to remove members first and fail.
-- Run this in the Supabase SQL editor.

create or replace function public.delete_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if not exists (
    select 1
    from public.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role = 'admin'
      and status = 'active'
  ) then
    raise exception 'Only the organiser can delete this group';
  end if;

  -- Payouts point at winning members. Remove cycles first so those rows
  -- cascade away before group_members are deleted with the group.
  delete from public.cycles where group_id = p_group_id;
  delete from public.groups where id = p_group_id;
end;
$$;

grant execute on function public.delete_group(uuid) to authenticated;
