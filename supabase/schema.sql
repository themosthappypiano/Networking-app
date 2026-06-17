-- Network OS schema for Supabase Postgres.
-- Run this entire file in the Supabase SQL editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  avatar_path text,
  banner_path text,
  gallery_paths text[] not null default '{}',
  linkedin_url text,
  community text not null default '',
  role text not null default '',
  business text not null default '',
  location text not null default '',
  context_level smallint not null default 1 check (context_level between 1 and 5),
  focus_area text not null default 'Other' check (focus_area in ('Attract', 'Convert', 'Deliver', 'Operations', 'Partnerships', 'Investor', 'Friend', 'Other')),
  relationship_status text not null default 'New contact' check (relationship_status in ('New contact', 'Warm', 'Strong relationship', 'Client', 'Potential client', 'Partner', 'Needs follow-up')),
  last_interaction_date date,
  next_follow_up_date date,
  tags text[] not null default '{}',
  notes text not null default '',
  how_we_met text not null default '',
  introduced_by text not null default '',
  context jsonb not null default '{"summary":"","past":"","present":"","future":"","personality":"","beliefs":"","drives":"","opportunities":"","risks":""}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, linkedin_url)
);

alter table public.people
  add column if not exists gallery_paths text[] not null default '{}';

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  interaction_date date not null default current_date,
  type text not null check (type in ('Event meeting', 'Call', 'DM', 'WhatsApp', 'Email', 'In-person')),
  summary text not null,
  key_points text not null default '',
  decisions text not null default '',
  actions_agreed text not null default '',
  personal_details text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  title text not null,
  due_date date,
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  status text not null default 'Todo' check (status in ('Todo', 'In progress', 'Done')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  location text not null default '',
  event_date date,
  description text not null default '',
  notes text not null default '',
  outcomes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_people (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, person_id)
);

create table if not exists public.person_connections (
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  connected_person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (person_id, connected_person_id),
  check (person_id <> connected_person_id)
);

create table if not exists public.linkedin_imports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  linkedin_url text not null,
  apify_actor_id text,
  apify_run_id text,
  status text not null default 'pending' check (status in ('pending', 'running', 'succeeded', 'failed')),
  raw_result jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists people_owner_name_idx on public.people (owner_id, name);
create index if not exists people_owner_tags_idx on public.people using gin (tags);
create index if not exists interactions_person_date_idx on public.interactions (person_id, interaction_date desc);
create index if not exists follow_ups_owner_due_idx on public.follow_ups (owner_id, due_date) where status <> 'Done';
create index if not exists events_owner_date_idx on public.events (owner_id, event_date desc);

drop trigger if exists people_set_updated_at on public.people;
create trigger people_set_updated_at before update on public.people for each row execute function public.set_updated_at();
drop trigger if exists interactions_set_updated_at on public.interactions;
create trigger interactions_set_updated_at before update on public.interactions for each row execute function public.set_updated_at();
drop trigger if exists follow_ups_set_updated_at on public.follow_ups;
create trigger follow_ups_set_updated_at before update on public.follow_ups for each row execute function public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();

alter table public.people enable row level security;
alter table public.interactions enable row level security;
alter table public.follow_ups enable row level security;
alter table public.events enable row level security;
alter table public.event_people enable row level security;
alter table public.person_connections enable row level security;
alter table public.linkedin_imports enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.people to authenticated;
grant select, insert, update, delete on public.interactions to authenticated;
grant select, insert, update, delete on public.follow_ups to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_people to authenticated;
grant select, insert, update, delete on public.person_connections to authenticated;
grant select, insert, update, delete on public.linkedin_imports to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['people', 'events', 'linkedin_imports']
  loop
    execute format('drop policy if exists "Users manage own %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "Users manage own %1$s" on public.%1$I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      table_name
    );
  end loop;
end;
$$;

drop policy if exists "Users manage own interactions" on public.interactions;
create policy "Users manage own interactions"
on public.interactions for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = interactions.person_id and people.owner_id = (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = interactions.person_id and people.owner_id = (select auth.uid()))
);

drop policy if exists "Users manage own follow_ups" on public.follow_ups;
create policy "Users manage own follow_ups"
on public.follow_ups for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = follow_ups.person_id and people.owner_id = (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = follow_ups.person_id and people.owner_id = (select auth.uid()))
);

drop policy if exists "Users manage own event_people" on public.event_people;
create policy "Users manage own event_people"
on public.event_people for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.events where events.id = event_people.event_id and events.owner_id = (select auth.uid()))
  and exists (select 1 from public.people where people.id = event_people.person_id and people.owner_id = (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.events where events.id = event_people.event_id and events.owner_id = (select auth.uid()))
  and exists (select 1 from public.people where people.id = event_people.person_id and people.owner_id = (select auth.uid()))
);

drop policy if exists "Users manage own person_connections" on public.person_connections;
create policy "Users manage own person_connections"
on public.person_connections for all to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = person_connections.person_id and people.owner_id = (select auth.uid()))
  and exists (select 1 from public.people where people.id = person_connections.connected_person_id and people.owner_id = (select auth.uid()))
)
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.people where people.id = person_connections.person_id and people.owner_id = (select auth.uid()))
  and exists (select 1 from public.people where people.id = person_connections.connected_person_id and people.owner_id = (select auth.uid()))
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('banners', 'banners', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own profile images" on storage.objects;
create policy "Users read own profile images"
on storage.objects for select to authenticated
using (bucket_id in ('avatars', 'banners') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users upload own profile images" on storage.objects;
create policy "Users upload own profile images"
on storage.objects for insert to authenticated
with check (bucket_id in ('avatars', 'banners') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update own profile images" on storage.objects;
create policy "Users update own profile images"
on storage.objects for update to authenticated
using (bucket_id in ('avatars', 'banners') and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id in ('avatars', 'banners') and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete own profile images" on storage.objects;
create policy "Users delete own profile images"
on storage.objects for delete to authenticated
using (bucket_id in ('avatars', 'banners') and (storage.foldername(name))[1] = (select auth.uid())::text);
