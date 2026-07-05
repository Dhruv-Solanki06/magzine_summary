-- ============================================================
-- Content reports / edit suggestions.
--
-- Signed-in users can flag incorrect information on an article or suggest a
-- correction. Each report captures the article, the specific field/section, the
-- current vs. suggested value, a freeform note, and useful client metadata
-- (email, browser client id, page URL, user agent) so the admin panel has
-- everything it needs to review and apply corrections.
--
-- Reports are INSERT/SELECT-own under RLS, so a logged-in user can file reports
-- and see their own, but never read anyone else's. The admin panel reads the
-- whole table with the service-role key (which bypasses RLS). Signed-out
-- visitors cannot insert at all — auth.uid() is null and the WITH CHECK fails.
-- Paste into the Supabase SQL editor (or psql) and run once. Idempotent.
-- ============================================================

create table if not exists public.content_reports (
  id              uuid        primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  user_id         uuid        not null references auth.users (id) on delete cascade,
  email           text,                       -- reporter's email (from auth session)
  record_id       bigint,                     -- article the report is about (nullable)
  record_title    text,                       -- denormalised title for admin readability
  report_type     text        not null default 'correction',
  field           text,                       -- which section/field the report concerns
  current_value   text,                       -- what's shown now (optional)
  suggested_value text,                       -- the suggested correction (optional)
  note            text        not null default '',  -- freeform description (required in UI)
  status          text        not null default 'open',
  page_url        text,                       -- URL the report was filed from
  user_agent      text,                       -- reporter's browser UA
  client_id       text,                       -- persistent per-browser id (localStorage)
  constraint content_reports_type_check check (
    report_type in ('correction', 'inaccuracy', 'broken_link', 'inappropriate', 'other')
  ),
  constraint content_reports_status_check check (
    status in ('open', 'reviewing', 'resolved', 'rejected')
  )
);

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_select_own" on public.content_reports;
drop policy if exists "content_reports_insert_own" on public.content_reports;

-- Users may read the reports they themselves filed...
create policy "content_reports_select_own" on public.content_reports
  for select using (auth.uid() = user_id);

-- ...and file new reports as themselves. No update/delete policy: reports are
-- immutable from the client; only the admin panel (service role) can triage.
create policy "content_reports_insert_own" on public.content_reports
  for insert with check (auth.uid() = user_id);

create index if not exists content_reports_status_created_idx
  on public.content_reports (status, created_at desc);

create index if not exists content_reports_record_idx
  on public.content_reports (record_id);

create index if not exists content_reports_user_idx
  on public.content_reports (user_id, created_at desc);
