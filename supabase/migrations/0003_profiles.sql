-- ============================================================
-- Researcher profiles + their works/projects.
-- A profile belongs to one authenticated user (auth.users). Profiles are a
-- PUBLIC directory (anyone can read), but only the owner can create/edit their
-- own profile and works — enforced with RLS (auth.uid() = user_id).
-- Paste into the Supabase SQL editor and run once. Idempotent.
-- ============================================================

-- ---- Profiles --------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid        not null primary key references auth.users (id) on delete cascade,
  username     text,                       -- URL slug, e.g. /profile/<username>
  display_name text,
  tagline      text,                       -- short headline (e.g. field of study)
  pronouns     text,
  bio          text,
  avatar_url   text,                        -- uploaded to UploadThing
  city         text,
  state        text,
  country      text,                        -- ISO country code
  interests    text[]      not null default '{}',  -- research interests (for "similar interests")
  website      text,
  email        text,
  linkedin     text,
  twitter      text,
  github       text,
  scholar      text,                        -- Google Scholar URL
  orcid        text,                        -- ORCID id/URL
  is_public    boolean     not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Case-insensitive unique usernames (ignoring NULLs / unclaimed profiles).
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username))
  where username is not null;

create index if not exists profiles_interests_gin_idx
  on public.profiles using gin (interests);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all"   on public.profiles;
drop policy if exists "profiles_insert_own"    on public.profiles;
drop policy if exists "profiles_update_own"    on public.profiles;
drop policy if exists "profiles_delete_own"    on public.profiles;

-- Public directory: anyone (incl. anon) may read profiles.
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ---- Works / projects ------------------------------------------------------
-- kind = 'publication'  -> shown under "Selected work" (title, venue, year, tags, cover)
-- kind = 'project'      -> shown under "Projects" (title, category, description, images)
create table if not exists public.profile_works (
  id          uuid        not null default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users (id) on delete cascade,
  kind        text        not null default 'publication'
                          check (kind in ('publication', 'project')),
  title       text        not null,
  venue       text,        -- journal / publisher
  year        int,         -- release year
  link        text,
  cover_url   text,        -- publication cover (UploadThing)
  description text,        -- project blurb
  category    text,        -- project category key
  start_year  int,
  end_year    int,
  images      text[]      not null default '{}',  -- project images (UploadThing)
  tags        text[]      not null default '{}',  -- publication tags
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists profile_works_user_kind_idx
  on public.profile_works (user_id, kind, sort_order);

alter table public.profile_works enable row level security;

drop policy if exists "profile_works_select_all" on public.profile_works;
drop policy if exists "profile_works_insert_own"  on public.profile_works;
drop policy if exists "profile_works_update_own"  on public.profile_works;
drop policy if exists "profile_works_delete_own"  on public.profile_works;

create policy "profile_works_select_all" on public.profile_works
  for select using (true);
create policy "profile_works_insert_own" on public.profile_works
  for insert with check (auth.uid() = user_id);
create policy "profile_works_update_own" on public.profile_works
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "profile_works_delete_own" on public.profile_works
  for delete using (auth.uid() = user_id);
