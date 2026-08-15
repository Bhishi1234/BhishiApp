-- Fix: gen_random_bytes() needs pgcrypto, which is not on the function search_path.
-- Run this in the Supabase SQL editor.

create or replace function public.create_group_invite(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_token text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_admin(p_group_id) then
    raise exception 'Only an organiser can invite members';
  end if;

  select token into v_token
  from public.invites
  where group_id = p_group_id
    and accepted_by is null
    and phone is null
  order by created_at desc
  limit 1;

  if v_token is null then
    v_token := md5(random()::text || clock_timestamp()::text || p_group_id::text)
      || md5(random()::text || clock_timestamp()::text);
    insert into public.invites (group_id, token)
    values (p_group_id, v_token);
  end if;

  insert into public.activity_events (group_id, kind, title, body, actor_id)
  values (p_group_id, 'invite', 'Invite link ready', 'Share the link on WhatsApp.', uid);

  return v_token;
end;
$$;

grant execute on function public.create_group_invite(uuid) to authenticated;
