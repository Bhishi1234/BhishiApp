-- Bhishi App initial schema
-- Run this in the Supabase SQL editor, or via: supabase db push

create extension if not exists pgcrypto;

create type public.group_type as enum ('lucky_draw', 'bidding', 'loan');
create type public.group_status as enum ('active', 'completed', 'archived');
create type public.cycle_frequency as enum ('monthly', 'weekly');
create type public.member_role as enum ('admin', 'co_admin', 'member');
create type public.member_status as enum ('invited', 'active', 'left', 'replaced');
create type public.cycle_status as enum ('upcoming', 'open', 'drawn', 'paid_out', 'closed');
create type public.contribution_status as enum ('unpaid', 'partial', 'paid', 'waived');
create type public.payment_mode as enum ('upi', 'cash', 'bank_transfer');
create type public.payout_method as enum ('draw', 'bid');
create type public.payout_status as enum ('pending', 'sent');
create type public.activity_kind as enum ('winner', 'member', 'round', 'payment', 'invite');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  upi_id text,
  locale text not null default 'en',
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.group_type not null,
  contribution_amount numeric(12, 2) not null check (contribution_amount > 0),
  planned_member_count int not null check (planned_member_count between 2 and 50),
  frequency public.cycle_frequency not null default 'monthly',
  start_date date not null,
  currency text not null default 'INR',
  locale text not null default 'en',
  status public.group_status not null default 'active',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid references public.profiles (id),
  display_name text not null,
  phone text,
  role public.member_role not null default 'member',
  status public.member_status not null default 'active',
  joined_at timestamptz not null default now()
);

create unique index group_members_user_unique
  on public.group_members (group_id, user_id)
  where user_id is not null;

create unique index group_members_phone_unique
  on public.group_members (group_id, phone)
  where phone is not null and status = 'active';

create table public.group_settings (
  group_id uuid primary key references public.groups (id) on delete cascade,
  late_fee_notes text,
  dropout_notes text,
  reminder_days_before int not null default 3,
  self_serve_paid boolean not null default false
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique,
  phone text,
  email text,
  expires_at timestamptz,
  accepted_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  cycle_number int not null,
  due_date date not null,
  pool_amount numeric(12, 2) not null,
  status public.cycle_status not null default 'upcoming',
  unique (group_id, cycle_number)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  amount_due numeric(12, 2) not null,
  amount_paid numeric(12, 2) not null default 0,
  status public.contribution_status not null default 'unpaid',
  payment_mode public.payment_mode,
  paid_at timestamptz,
  recorded_by uuid references public.profiles (id),
  member_claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cycle_id, member_id)
);

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references public.cycles (id) on delete cascade,
  winner_member_id uuid not null references public.group_members (id),
  method public.payout_method not null,
  bid_discount numeric(12, 2),
  bonus_per_member numeric(12, 2),
  status public.payout_status not null default 'pending',
  proof_path text,
  upi_ref text,
  paid_at timestamptz,
  eligible_member_ids uuid[] not null default '{}',
  drawn_at timestamptz not null default now(),
  drawn_by uuid references public.profiles (id)
);

create table public.bids (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycles (id) on delete cascade,
  member_id uuid not null references public.group_members (id) on delete cascade,
  discount_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  unique (cycle_id, member_id)
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  kind public.activity_kind not null,
  title text not null,
  body text,
  actor_id uuid references public.profiles (id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index activity_events_group_created_idx
  on public.activity_events (group_id, created_at desc);

create index contributions_member_idx on public.contributions (member_id);
create index cycles_group_idx on public.cycles (group_id, cycle_number);

-- Profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Membership helpers (security definer to avoid RLS recursion)
create or replace function public.is_group_member(gid uuid)
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
      and status = 'active'
  );
$$;

create or replace function public.is_group_admin(gid uuid)
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
      and role in ('admin', 'co_admin')
      and status = 'active'
  );
$$;

create or replace function public.refresh_cycle_pools(gid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount numeric;
  v_count int;
begin
  select contribution_amount into v_amount from public.groups where id = gid;
  select count(*) into v_count
  from public.group_members
  where group_id = gid and status = 'active';

  update public.cycles
  set pool_amount = v_amount * greatest(v_count, 1)
  where group_id = gid
    and status in ('upcoming', 'open');
end;
$$;

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

  v_phone := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
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
    trim(p_display_name) || ' joined the group',
    'Member added by the organiser.',
    uid,
    jsonb_build_object('member_id', new_member)
  );

  return new_member;
end;
$$;

create or replace function public.update_contribution_status(
  p_contribution_id uuid,
  p_status public.contribution_status,
  p_amount_paid numeric default null,
  p_payment_mode public.payment_mode default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_due numeric;
  v_member text;
  v_paid numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.group_id, contrib.amount_due, m.display_name
    into v_group_id, v_due, v_member
  from public.contributions contrib
  join public.cycles c on c.id = contrib.cycle_id
  join public.group_members m on m.id = contrib.member_id
  where contrib.id = p_contribution_id;

  if v_group_id is null then
    raise exception 'Payment record not found';
  end if;
  if not public.is_group_admin(v_group_id) then
    raise exception 'Only an organiser can update payments';
  end if;

  if p_status = 'paid' then
    v_paid := v_due;
  elsif p_status = 'partial' then
    v_paid := coalesce(p_amount_paid, 0);
    if v_paid <= 0 or v_paid >= v_due then
      raise exception 'Partial amount must be between 0 and the amount due';
    end if;
  else
    v_paid := 0;
  end if;

  update public.contributions
  set
    status = p_status,
    amount_paid = v_paid,
    payment_mode = case when p_status = 'unpaid' then null else coalesce(p_payment_mode, payment_mode) end,
    paid_at = case when p_status = 'unpaid' then null else now() end,
    recorded_by = uid
  where id = p_contribution_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'payment',
    case
      when p_status = 'paid' then v_member || ' marked paid'
      when p_status = 'partial' then v_member || ' marked partial'
      else v_member || ' marked unpaid'
    end,
    null,
    uid,
    jsonb_build_object('contribution_id', p_contribution_id, 'status', p_status)
  );
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
    select 1
    from public.cycles
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
    cycle_id, winner_member_id, method, eligible_member_ids, drawn_by
  )
  values (p_cycle_id, v_winner, 'draw', v_eligible, uid);

  update public.cycles set status = 'drawn' where id = p_cycle_id;

  if not exists (
    select 1
    from public.group_members gm
    where gm.group_id = v_group_id
      and gm.status = 'active'
      and not exists (
        select 1
        from public.payouts p
        join public.cycles c on c.id = p.cycle_id
        where c.group_id = v_group_id
          and p.winner_member_id = gm.id
      )
  ) then
    update public.groups set status = 'completed' where id = v_group_id;
  end if;

  insert into public.activity_events (group_id, kind, title, body, actor_id, metadata)
  values (
    v_group_id,
    'winner',
    v_winner_name || ' won this month''s chitthi',
    'Winner locked. Next draw opens on the next due date.',
    uid,
    jsonb_build_object(
      'cycle_id', p_cycle_id,
      'winner_member_id', v_winner,
      'eligible_count', array_length(v_eligible, 1)
    )
  );

  return jsonb_build_object(
    'winner_member_id', v_winner,
    'winner_name', v_winner_name,
    'eligible_member_ids', v_eligible
  );
end;
$$;

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

create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_invite public.invites%rowtype;
  v_profile public.profiles%rowtype;
  v_member uuid;
  v_amount numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invite from public.invites where token = p_token;
  if v_invite.id is null then
    raise exception 'Invite link is invalid';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Invite link has expired';
  end if;

  if exists (
    select 1 from public.group_members
    where group_id = v_invite.group_id and user_id = uid and status = 'active'
  ) then
    return v_invite.group_id;
  end if;

  select * into v_profile from public.profiles where id = uid;
  select contribution_amount into v_amount from public.groups where id = v_invite.group_id;

  select id into v_member
  from public.group_members
  where group_id = v_invite.group_id
    and status = 'active'
    and user_id is null
    and v_profile.phone is not null
    and phone = v_profile.phone
  limit 1;

  if v_member is not null then
    update public.group_members
    set user_id = uid,
        display_name = coalesce(nullif(trim(v_profile.full_name), ''), display_name)
    where id = v_member;
  else
    insert into public.group_members (group_id, user_id, display_name, phone, role, status)
    values (
      v_invite.group_id,
      uid,
      coalesce(nullif(trim(v_profile.full_name), ''), 'Member'),
      v_profile.phone,
      'member',
      'active'
    )
    returning id into v_member;

    insert into public.contributions (cycle_id, member_id, amount_due)
    select c.id, v_member, v_amount
    from public.cycles c
    where c.group_id = v_invite.group_id
    on conflict (cycle_id, member_id) do nothing;

    perform public.refresh_cycle_pools(v_invite.group_id);
  end if;

  update public.invites set accepted_by = uid where id = v_invite.id;

  insert into public.activity_events (group_id, kind, title, actor_id, metadata)
  values (
    v_invite.group_id,
    'member',
    coalesce(nullif(trim(v_profile.full_name), ''), 'A member') || ' joined via invite',
    uid,
    jsonb_build_object('member_id', v_member)
  );

  return v_invite.group_id;
end;
$$;

create or replace function public.mark_payout_sent(
  p_cycle_id uuid,
  p_upi_ref text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  v_group_id uuid;
  v_name text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.group_id, m.display_name
    into v_group_id, v_name
  from public.cycles c
  join public.payouts p on p.cycle_id = c.id
  join public.group_members m on m.id = p.winner_member_id
  where c.id = p_cycle_id;

  if v_group_id is null then
    raise exception 'Payout not found';
  end if;
  if not public.is_group_admin(v_group_id) then
    raise exception 'Only an organiser can mark a payout';
  end if;

  update public.payouts
  set status = 'sent',
      upi_ref = nullif(trim(coalesce(p_upi_ref, '')), ''),
      paid_at = now()
  where cycle_id = p_cycle_id;

  update public.cycles set status = 'paid_out' where id = p_cycle_id;

  insert into public.activity_events (group_id, kind, title, body, actor_id)
  values (v_group_id, 'round', 'Payout marked sent to ' || v_name, p_upi_ref, uid);
end;
$$;

create or replace function public.update_group_settings(
  p_group_id uuid,
  p_late_fee_notes text,
  p_dropout_notes text,
  p_reminder_days_before int
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
    reminder_days_before = greatest(0, least(coalesce(p_reminder_days_before, 3), 28))
  where group_id = p_group_id;
end;
$$;

-- Row level security
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_settings enable row level security;
alter table public.invites enable row level security;
alter table public.cycles enable row level security;
alter table public.contributions enable row level security;
alter table public.payouts enable row level security;
alter table public.bids enable row level security;
alter table public.activity_events enable row level security;

create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1
      from public.group_members mine
      join public.group_members theirs on theirs.group_id = mine.group_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = profiles.id
    )
  );

create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

create policy profiles_update on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid());

create policy groups_select on public.groups
  for select using (created_by = auth.uid() or public.is_group_member(id));

create policy group_members_select on public.group_members
  for select using (public.is_group_member(group_id) or user_id = auth.uid());

create policy group_settings_select on public.group_settings
  for select using (public.is_group_member(group_id));

create policy invites_select on public.invites
  for select using (public.is_group_admin(group_id));

create policy cycles_select on public.cycles
  for select using (public.is_group_member(group_id));

create policy contributions_select on public.contributions
  for select using (
    public.is_group_member((select group_id from public.cycles where id = cycle_id))
  );

create policy payouts_select on public.payouts
  for select using (
    public.is_group_member((select group_id from public.cycles where id = cycle_id))
  );

create policy bids_select on public.bids
  for select using (
    public.is_group_member((select group_id from public.cycles where id = cycle_id))
  );

create policy activity_select on public.activity_events
  for select using (public.is_group_member(group_id));

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

  delete from public.groups where id = p_group_id;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select on public.group_settings to authenticated;
grant select on public.invites to authenticated;
grant select on public.cycles to authenticated;
grant select on public.contributions to authenticated;
grant select on public.payouts to authenticated;
grant select on public.bids to authenticated;
grant select on public.activity_events to authenticated;

grant execute on function public.create_group(text, public.group_type, numeric, int, public.cycle_frequency, date) to authenticated;
grant execute on function public.add_group_member(uuid, text, text) to authenticated;
grant execute on function public.update_contribution_status(uuid, public.contribution_status, numeric, public.payment_mode) to authenticated;
grant execute on function public.run_lucky_draw(uuid) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
grant execute on function public.create_group_invite(uuid) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.mark_payout_sent(uuid, text) to authenticated;
grant execute on function public.update_group_settings(uuid, text, text, int) to authenticated;
create or replace function public.get_invite_preview(p_token text)
returns table (
  group_name text,
  group_type public.group_type,
  contribution_amount numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select g.name, g.type, g.contribution_amount
  from public.invites i
  join public.groups g on g.id = i.group_id
  where i.token = p_token
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.is_group_admin(uuid) to authenticated;
grant execute on function public.get_invite_preview(text) to anon, authenticated;
