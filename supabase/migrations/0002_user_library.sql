-- ============================================================
-- Per-user library: bookmarks + followed authors.
-- Rows are owned by an authenticated user and isolated with RLS, so a
-- signed-in user can only ever read/write their OWN bookmarks and follows.
-- Paste into the Supabase SQL editor (or psql) and run once. Idempotent.
-- ============================================================

-- ---- Bookmarks -------------------------------------------------------------
create table if not exists public.bookmarks (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  record_id  bigint      not null,
  title      text,
  magazine   text,
  created_at timestamptz not null default now(),
  primary key (user_id, record_id)
);

alter table public.bookmarks enable row level security;

drop policy if exists "bookmarks_select_own" on public.bookmarks;
drop policy if exists "bookmarks_insert_own" on public.bookmarks;
drop policy if exists "bookmarks_delete_own" on public.bookmarks;

create policy "bookmarks_select_own" on public.bookmarks
  for select using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on public.bookmarks
  for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on public.bookmarks
  for delete using (auth.uid() = user_id);

create index if not exists bookmarks_user_created_idx
  on public.bookmarks (user_id, created_at desc);

-- ---- Followed authors ------------------------------------------------------
create table if not exists public.followed_authors (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  author_id  bigint      not null,
  name       text,
  created_at timestamptz not null default now(),
  primary key (user_id, author_id)
);

alter table public.followed_authors enable row level security;

drop policy if exists "followed_authors_select_own" on public.followed_authors;
drop policy if exists "followed_authors_insert_own" on public.followed_authors;
drop policy if exists "followed_authors_delete_own" on public.followed_authors;

create policy "followed_authors_select_own" on public.followed_authors
  for select using (auth.uid() = user_id);
create policy "followed_authors_insert_own" on public.followed_authors
  for insert with check (auth.uid() = user_id);
create policy "followed_authors_delete_own" on public.followed_authors
  for delete using (auth.uid() = user_id);

create index if not exists followed_authors_user_created_idx
  on public.followed_authors (user_id, created_at desc);
