// scripts/generate-subject-sql.ts
// Generates the Supabase migration that creates the subject taxonomy tables,
// seeds subjects/sub-subjects, classifies every tag, and materialises the
// record↔subject links — all set-based in Postgres.
//
// Run:  node --experimental-strip-types scripts/generate-subject-sql.ts
// Output: supabase/migrations/0001_subjects.sql

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBJECTS } from '../lib/taxonomy.ts';

const q = (s: string) => s.replace(/'/g, "''");

const lines: string[] = [];
const p = (s = '') => lines.push(s);

p('-- ============================================================');
p('-- Subject taxonomy: broad subjects → sub-subjects → tags → records');
p('-- Generated from lib/taxonomy.ts. Safe to re-run (idempotent).');
p('-- Paste into the Supabase SQL editor (or psql) and run once.');
p('-- ============================================================');
p();
p('-- Reset our own (empty) taxonomy tables so re-runs are always clean.');
p('-- NOTE: does NOT touch any pre-existing public.subjects table.');
p('drop table if exists public.record_subsubjects cascade;');
p('drop table if exists public.record_subjects cascade;');
p('drop table if exists public.tag_subsubjects cascade;');
p('drop table if exists public.subsubjects cascade;');
p();
p('create table if not exists public.subject_areas (');
p('  id          serial primary key,');
p('  slug        text unique not null,');
p('  name        text not null,');
p('  description text,');
p('  sort_order  int not null default 0');
p(');');
p();
p('create table if not exists public.subsubjects (');
p('  id          serial primary key,');
p('  subject_id  int not null references public.subject_areas(id) on delete cascade,');
p('  slug        text unique not null,');
p('  name        text not null,');
p('  sort_order  int not null default 0');
p(');');
p();
p('-- Join/materialised tables use FK column types detected from the base');
p('-- tables so the foreign keys are always valid (int4 vs int8 safe).');
p('do $$');
p('declare');
p('  rid_type text;');
p('  tid_type text;');
p('begin');
p("  select format_type(atttypid, atttypmod) into rid_type from pg_attribute where attrelid = 'public.records'::regclass and attname = 'id';");
p("  select format_type(atttypid, atttypmod) into tid_type from pg_attribute where attrelid = 'public.tags'::regclass and attname = 'id';");
p('  execute format($f$');
p('    create table if not exists public.tag_subsubjects (');
p('      tag_id %s not null references public.tags(id) on delete cascade,');
p('      subsubject_id int not null references public.subsubjects(id) on delete cascade,');
p('      primary key (tag_id, subsubject_id)');
p('    )$f$, tid_type);');
p('  execute format($f$');
p('    create table if not exists public.record_subjects (');
p('      record_id %s not null references public.records(id) on delete cascade,');
p('      subject_id int not null references public.subject_areas(id) on delete cascade,');
p('      primary key (record_id, subject_id)');
p('    )$f$, rid_type);');
p('  execute format($f$');
p('    create table if not exists public.record_subsubjects (');
p('      record_id %s not null references public.records(id) on delete cascade,');
p('      subsubject_id int not null references public.subsubjects(id) on delete cascade,');
p('      primary key (record_id, subsubject_id)');
p('    )$f$, rid_type);');
p('end $$;');
p();
p('create index if not exists idx_record_subjects_subject on public.record_subjects(subject_id);');
p('create index if not exists idx_record_subsubjects_sub on public.record_subsubjects(subsubject_id);');
p('create index if not exists idx_tag_subsubjects_sub on public.tag_subsubjects(subsubject_id);');
p();

// ---- seed subjects
p('-- Seed broad subjects');
SUBJECTS.forEach((s, i) => {
  p(
    `insert into public.subject_areas (slug, name, description, sort_order) values ('${q(s.slug)}', '${q(
      s.name,
    )}', '${q(s.description)}', ${i}) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;`,
  );
});
p();

// ---- seed subsubjects
p('-- Seed sub-subjects');
let order = 0;
SUBJECTS.forEach((s) => {
  s.subsubjects.forEach((ss) => {
    p(
      `insert into public.subsubjects (subject_id, slug, name, sort_order) select id, '${q(
        ss.slug,
      )}', '${q(ss.name)}', ${order} from public.subject_areas where slug = '${q(
        s.slug,
      )}' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;`,
    );
    order += 1;
  });
});
p();

// ---- classification rules (subsubject_slug, priority, pattern)
p('-- Classify tags into their highest-priority matching sub-subject.');
p('with rules(subsubject_slug, priority, pattern) as (');
const ruleRows: string[] = [];
let priority = 0;
SUBJECTS.forEach((s) => {
  s.subsubjects.forEach((ss) => {
    priority += 1;
    ss.patterns.forEach((pat) => {
      ruleRows.push(`  ('${q(ss.slug)}', ${priority}, '%${q(pat)}%')`);
    });
  });
});
p('  values');
p(ruleRows.join(',\n'));
p('),');
p('matched as (');
p('  select t.id as tag_id, r.subsubject_slug,');
p('         row_number() over (partition by t.id order by r.priority) as rn');
p('  from public.tags t');
p('  join rules r on t.name ilike r.pattern');
p(')');
p('insert into public.tag_subsubjects (tag_id, subsubject_id)');
p('select m.tag_id, ss.id');
p('from matched m');
p('join public.subsubjects ss on ss.slug = m.subsubject_slug');
p('where m.rn = 1');
p('on conflict do nothing;');
p();

// ---- materialise record links
p('-- Materialise record → subject and record → sub-subject links.');
p('insert into public.record_subjects (record_id, subject_id)');
p('select distinct rt.record_id, ss.subject_id');
p('from public.record_tags rt');
p('join public.tag_subsubjects ts on ts.tag_id = rt.tag_id');
p('join public.subsubjects ss on ss.id = ts.subsubject_id');
p('on conflict do nothing;');
p();
p('insert into public.record_subsubjects (record_id, subsubject_id)');
p('select distinct rt.record_id, ts.subsubject_id');
p('from public.record_tags rt');
p('join public.tag_subsubjects ts on ts.tag_id = rt.tag_id');
p('on conflict do nothing;');
p();
p('-- Let the API roles read the new tables (RLS stays disabled by default).');
p(
  'grant select on public.subject_areas, public.subsubjects, public.tag_subsubjects, public.record_subjects, public.record_subsubjects to anon, authenticated, service_role;',
);
p();
p('-- Refresh PostgREST so the new tables + relationships are queryable.');
p("notify pgrst, 'reload schema';");
p();

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../supabase/migrations/0001_subjects.sql');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines.join('\n'));
console.log(`Wrote ${outPath} (${lines.length} lines, ${ruleRows.length} rules)`);
