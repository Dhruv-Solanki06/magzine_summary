-- ============================================================
-- Reading tracker + research notes (per-user, RLS-isolated).
--
--   * reading_progress — one row per (user, article). Accumulates total
--     reading time, how many times the article was opened, whether it was
--     read to the end, and the first/last time it was read.
--   * research_notes   — freeform research notes a user can jot down, either
--     standalone or attached to a specific article, with a lightweight status
--     (idea / reading / done / archived) so the tracker doubles as a simple
--     research board.
--   * log_reading()    — atomic upsert used by the client to add reading time
--     and bump open/complete flags without read-modify-write races.
--
-- Rows are owned by an authenticated user and isolated with RLS, so a user can
-- only ever read/write their OWN tracker data. Paste into the Supabase SQL
-- editor (or psql) and run once. Idempotent.
-- ============================================================

-- ---- Reading progress ------------------------------------------------------
create table if not exists public.reading_progress (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  record_id     bigint      not null,
  title         text,
  magazine      text,
  read_seconds  integer     not null default 0,
  open_count    integer     not null default 0,
  completed     boolean     not null default false,
  first_read_at timestamptz not null default now(),
  last_read_at  timestamptz not null default now(),
  primary key (user_id, record_id)
);

alter table public.reading_progress enable row level security;

drop policy if exists "reading_progress_select_own" on public.reading_progress;
drop policy if exists "reading_progress_insert_own" on public.reading_progress;
drop policy if exists "reading_progress_update_own" on public.reading_progress;
drop policy if exists "reading_progress_delete_own" on public.reading_progress;

create policy "reading_progress_select_own" on public.reading_progress
  for select using (auth.uid() = user_id);
create policy "reading_progress_insert_own" on public.reading_progress
  for insert with check (auth.uid() = user_id);
create policy "reading_progress_update_own" on public.reading_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reading_progress_delete_own" on public.reading_progress
  for delete using (auth.uid() = user_id);

create index if not exists reading_progress_user_last_read_idx
  on public.reading_progress (user_id, last_read_at desc);

-- ---- Research notes --------------------------------------------------------
create table if not exists public.research_notes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  record_id    bigint,               -- optional: note attached to an article
  record_title text,
  title        text        not null default 'Untitled note',
  body         text        not null default '',
  status       text        not null default 'idea',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint research_notes_status_check
    check (status in ('idea', 'reading', 'done', 'archived'))
);

alter table public.research_notes enable row level security;

drop policy if exists "research_notes_select_own" on public.research_notes;
drop policy if exists "research_notes_insert_own" on public.research_notes;
drop policy if exists "research_notes_update_own" on public.research_notes;
drop policy if exists "research_notes_delete_own" on public.research_notes;

create policy "research_notes_select_own" on public.research_notes
  for select using (auth.uid() = user_id);
create policy "research_notes_insert_own" on public.research_notes
  for insert with check (auth.uid() = user_id);
create policy "research_notes_update_own" on public.research_notes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "research_notes_delete_own" on public.research_notes
  for delete using (auth.uid() = user_id);

create index if not exists research_notes_user_updated_idx
  on public.research_notes (user_id, updated_at desc);

-- ---- Atomic reading logger -------------------------------------------------
-- Adds p_seconds to the running total and bumps the open/complete flags in a
-- single statement. Runs with the caller's rights (security invoker) so RLS
-- still guarantees a user can only ever touch their own row.
create or replace function public.log_reading(
  p_record_id bigint,
  p_seconds   integer,
  p_title     text,
  p_magazine  text,
  p_opened    boolean,
  p_completed boolean
) returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'log_reading: not authenticated';
  end if;

  insert into public.reading_progress as rp (
    user_id, record_id, title, magazine,
    read_seconds, open_count, completed, first_read_at, last_read_at
  )
  values (
    auth.uid(), p_record_id, p_title, p_magazine,
    greatest(coalesce(p_seconds, 0), 0),
    case when p_opened then 1 else 0 end,
    coalesce(p_completed, false), now(), now()
  )
  on conflict (user_id, record_id) do update set
    read_seconds = rp.read_seconds + greatest(coalesce(p_seconds, 0), 0),
    open_count   = rp.open_count + (case when p_opened then 1 else 0 end),
    completed    = rp.completed or coalesce(p_completed, false),
    title        = coalesce(excluded.title, rp.title),
    magazine     = coalesce(excluded.magazine, rp.magazine),
    last_read_at = now();
end;
$$;

grant execute on function public.log_reading(bigint, integer, text, text, boolean, boolean)
  to authenticated;
