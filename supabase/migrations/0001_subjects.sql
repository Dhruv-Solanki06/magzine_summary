-- ============================================================
-- Subject taxonomy: broad subjects → sub-subjects → tags → records
-- Generated from lib/taxonomy.ts. Safe to re-run (idempotent).
-- Paste into the Supabase SQL editor (or psql) and run once.
-- ============================================================

-- Reset our own (empty) taxonomy tables so re-runs are always clean.
-- NOTE: does NOT touch any pre-existing public.subjects table.
drop table if exists public.record_subsubjects cascade;
drop table if exists public.record_subjects cascade;
drop table if exists public.tag_subsubjects cascade;
drop table if exists public.subsubjects cascade;

create table if not exists public.subject_areas (
  id          serial primary key,
  slug        text unique not null,
  name        text not null,
  description text,
  sort_order  int not null default 0
);

create table if not exists public.subsubjects (
  id          serial primary key,
  subject_id  int not null references public.subject_areas(id) on delete cascade,
  slug        text unique not null,
  name        text not null,
  sort_order  int not null default 0
);

-- Join/materialised tables use FK column types detected from the base
-- tables so the foreign keys are always valid (int4 vs int8 safe).
do $$
declare
  rid_type text;
  tid_type text;
begin
  select format_type(atttypid, atttypmod) into rid_type from pg_attribute where attrelid = 'public.records'::regclass and attname = 'id';
  select format_type(atttypid, atttypmod) into tid_type from pg_attribute where attrelid = 'public.tags'::regclass and attname = 'id';
  execute format($f$
    create table if not exists public.tag_subsubjects (
      tag_id %s not null references public.tags(id) on delete cascade,
      subsubject_id int not null references public.subsubjects(id) on delete cascade,
      primary key (tag_id, subsubject_id)
    )$f$, tid_type);
  execute format($f$
    create table if not exists public.record_subjects (
      record_id %s not null references public.records(id) on delete cascade,
      subject_id int not null references public.subject_areas(id) on delete cascade,
      primary key (record_id, subject_id)
    )$f$, rid_type);
  execute format($f$
    create table if not exists public.record_subsubjects (
      record_id %s not null references public.records(id) on delete cascade,
      subsubject_id int not null references public.subsubjects(id) on delete cascade,
      primary key (record_id, subsubject_id)
    )$f$, rid_type);
end $$;

create index if not exists idx_record_subjects_subject on public.record_subjects(subject_id);
create index if not exists idx_record_subsubjects_sub on public.record_subsubjects(subsubject_id);
create index if not exists idx_tag_subsubjects_sub on public.tag_subsubjects(subsubject_id);

-- Seed broad subjects
insert into public.subject_areas (slug, name, description, sort_order) values ('philosophy-doctrine', 'Philosophy & Doctrine', 'Metaphysics, epistemology, ethics and the core doctrinal systems of Jain and Indic thought.', 0) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('scripture-canon', 'Scripture & Canon', 'The canonical texts, their commentaries and the exegetical tradition that preserves them.', 1) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('literature-language', 'Literature & Language', 'Poetry, narrative, drama and the Prakrit, Sanskrit and Apabhramsa languages of the corpus.', 2) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('art-architecture', 'Art, Architecture & Iconography', 'Temples and shrines, sculpture and images, and the painted manuscript traditions.', 3) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('history-politics', 'History & Politics', 'Dynasties and rulers, inscriptions, regional histories and the social fabric of the past.', 4) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('biography-people', 'Biography & People', 'The Tirthankaras and Jinas, the great acharyas and scholars, and modern figures.', 5) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('religion-ritual', 'Religion, Ritual & Practice', 'Worship and festivals, meditation and yoga, and the ascetic life of renunciation.', 6) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('manuscripts-texts', 'Manuscripts & Textual Studies', 'Manuscript collections and catalogues, and the critical editing of texts.', 7) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('comparative-religion', 'Comparative & Interreligious Studies', 'Buddhism, Hinduism and Vedanta, and dialogue across the religious traditions of India.', 8) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;
insert into public.subject_areas (slug, name, description, sort_order) values ('society-culture', 'Society, Culture & Modern Issues', 'Ecology and ethics, education and institutions, trade, and the contemporary diaspora.', 9) on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

-- Seed sub-subjects
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'metaphysics-reality', 'Metaphysics & Reality', 0 from public.subject_areas where slug = 'philosophy-doctrine' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'karma-soul', 'Karma & the Soul', 1 from public.subject_areas where slug = 'philosophy-doctrine' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'ethics-conduct', 'Ethics & Conduct', 2 from public.subject_areas where slug = 'philosophy-doctrine' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'epistemology-logic', 'Epistemology & Logic', 3 from public.subject_areas where slug = 'philosophy-doctrine' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'agamas-canon', 'Agamas & Canon', 4 from public.subject_areas where slug = 'scripture-canon' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'commentary-exegesis', 'Commentaries & Exegesis', 5 from public.subject_areas where slug = 'scripture-canon' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'prakrit-pali', 'Prakrit, Pali & Apabhramsa', 6 from public.subject_areas where slug = 'literature-language' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'sanskrit-kavya', 'Sanskrit & Kavya', 7 from public.subject_areas where slug = 'literature-language' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'narrative-story', 'Narrative & Story', 8 from public.subject_areas where slug = 'literature-language' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'language-grammar', 'Language & Grammar', 9 from public.subject_areas where slug = 'literature-language' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'temple-architecture', 'Temple & Architecture', 10 from public.subject_areas where slug = 'art-architecture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'sculpture-iconography', 'Sculpture & Iconography', 11 from public.subject_areas where slug = 'art-architecture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'painting-manuscript-art', 'Painting & Manuscript Art', 12 from public.subject_areas where slug = 'art-architecture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'epigraphy-inscriptions', 'Epigraphy & Inscriptions', 13 from public.subject_areas where slug = 'history-politics' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'dynasties-rulers', 'Dynasties & Rulers', 14 from public.subject_areas where slug = 'history-politics' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'regional-history', 'Regional & Local History', 15 from public.subject_areas where slug = 'history-politics' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'society-community', 'Society & Community', 16 from public.subject_areas where slug = 'history-politics' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'tirthankaras-jinas', 'Tirthankaras & Jinas', 17 from public.subject_areas where slug = 'biography-people' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'acharyas-scholars', 'Acharyas & Scholars', 18 from public.subject_areas where slug = 'biography-people' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'modern-figures', 'Modern Figures & Reformers', 19 from public.subject_areas where slug = 'biography-people' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'worship-ritual', 'Worship, Ritual & Festivals', 20 from public.subject_areas where slug = 'religion-ritual' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'meditation-yoga', 'Meditation & Yoga', 21 from public.subject_areas where slug = 'religion-ritual' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'asceticism-renunciation', 'Asceticism & Renunciation', 22 from public.subject_areas where slug = 'religion-ritual' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'cosmology-metaphysical-worlds', 'Cosmology & Worlds', 23 from public.subject_areas where slug = 'religion-ritual' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'manuscripts-catalogues', 'Manuscripts & Catalogues', 24 from public.subject_areas where slug = 'manuscripts-texts' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'editions-criticism', 'Editions & Textual Criticism', 25 from public.subject_areas where slug = 'manuscripts-texts' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'buddhism', 'Buddhism', 26 from public.subject_areas where slug = 'comparative-religion' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'hinduism-vedanta', 'Hinduism & Vedanta', 27 from public.subject_areas where slug = 'comparative-religion' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'comparative-interreligious', 'Comparative & Interreligious', 28 from public.subject_areas where slug = 'comparative-religion' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'environment-ecology', 'Environment & Ecology', 29 from public.subject_areas where slug = 'society-culture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'education-institutions', 'Education & Institutions', 30 from public.subject_areas where slug = 'society-culture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'trade-economy', 'Trade & Economy', 31 from public.subject_areas where slug = 'society-culture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
insert into public.subsubjects (subject_id, slug, name, sort_order) select id, 'diaspora-contemporary', 'Diaspora & Contemporary', 32 from public.subject_areas where slug = 'society-culture' on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

-- Classify tags into their highest-priority matching sub-subject.
with rules(subsubject_slug, priority, pattern) as (
  values
  ('metaphysics-reality', 1, '%anekant%'),
  ('metaphysics-reality', 1, '%syadvad%'),
  ('metaphysics-reality', 1, '%saptabhangi%'),
  ('metaphysics-reality', 1, '%nayavad%'),
  ('metaphysics-reality', 1, '%naya %'),
  ('metaphysics-reality', 1, '%dravya%'),
  ('metaphysics-reality', 1, '%substance%'),
  ('metaphysics-reality', 1, '%reality%'),
  ('metaphysics-reality', 1, '%ontolog%'),
  ('metaphysics-reality', 1, '%metaphysic%'),
  ('metaphysics-reality', 1, '%tattva%'),
  ('metaphysics-reality', 1, '%nine principle%'),
  ('metaphysics-reality', 1, '%navatattva%'),
  ('metaphysics-reality', 1, '%pudgala%'),
  ('karma-soul', 2, '%karma%'),
  ('karma-soul', 2, '%jiva%'),
  ('karma-soul', 2, '%soul%'),
  ('karma-soul', 2, '%atman%'),
  ('karma-soul', 2, '%atma%'),
  ('karma-soul', 2, '%bondage%'),
  ('karma-soul', 2, '%rebirth%'),
  ('karma-soul', 2, '%transmigrat%'),
  ('karma-soul', 2, '%reincarnat%'),
  ('karma-soul', 2, '%gunasthana%'),
  ('karma-soul', 2, '%leshya%'),
  ('karma-soul', 2, '%nirjara%'),
  ('karma-soul', 2, '%liberation%'),
  ('karma-soul', 2, '%moksha%'),
  ('karma-soul', 2, '%mukti%'),
  ('ethics-conduct', 3, '%ahimsa%'),
  ('ethics-conduct', 3, '%non-violence%'),
  ('ethics-conduct', 3, '%nonviolence%'),
  ('ethics-conduct', 3, '%ethic%'),
  ('ethics-conduct', 3, '%moral%'),
  ('ethics-conduct', 3, '%conduct%'),
  ('ethics-conduct', 3, '%vrata%'),
  ('ethics-conduct', 3, '%vow%'),
  ('ethics-conduct', 3, '%aparigraha%'),
  ('ethics-conduct', 3, '%satya%'),
  ('ethics-conduct', 3, '%brahmacharya%'),
  ('ethics-conduct', 3, '%celibacy%'),
  ('ethics-conduct', 3, '%anuvrata%'),
  ('ethics-conduct', 3, '%virtue%'),
  ('ethics-conduct', 3, '%compassion%'),
  ('epistemology-logic', 4, '%pramana%'),
  ('epistemology-logic', 4, '%epistemolog%'),
  ('epistemology-logic', 4, '%logic%'),
  ('epistemology-logic', 4, '%nyaya%'),
  ('epistemology-logic', 4, '%inference%'),
  ('epistemology-logic', 4, '%perception%'),
  ('epistemology-logic', 4, '%jnana%'),
  ('epistemology-logic', 4, '%knowledge%'),
  ('epistemology-logic', 4, '%kevala%'),
  ('epistemology-logic', 4, '%omniscience%'),
  ('epistemology-logic', 4, '%valid cognition%'),
  ('agamas-canon', 5, '%agama%'),
  ('agamas-canon', 5, '%canon%'),
  ('agamas-canon', 5, '%sutra%'),
  ('agamas-canon', 5, '%anga%'),
  ('agamas-canon', 5, '%siddhanta%'),
  ('agamas-canon', 5, '%scripture%'),
  ('agamas-canon', 5, '%uttaradhyayana%'),
  ('agamas-canon', 5, '%acaranga%'),
  ('agamas-canon', 5, '%kalpasutra%'),
  ('agamas-canon', 5, '%tattvartha%'),
  ('agamas-canon', 5, '%sacred text%'),
  ('agamas-canon', 5, '%prakirnaka%'),
  ('commentary-exegesis', 6, '%commentary%'),
  ('commentary-exegesis', 6, '%commentaries%'),
  ('commentary-exegesis', 6, '%bhashya%'),
  ('commentary-exegesis', 6, '%bhasya%'),
  ('commentary-exegesis', 6, '%tika%'),
  ('commentary-exegesis', 6, '%niryukti%'),
  ('commentary-exegesis', 6, '%curni%'),
  ('commentary-exegesis', 6, '%churni%'),
  ('commentary-exegesis', 6, '%vritti%'),
  ('commentary-exegesis', 6, '%vrtti%'),
  ('commentary-exegesis', 6, '%exegesis%'),
  ('commentary-exegesis', 6, '%gloss%'),
  ('commentary-exegesis', 6, '%bhasa%'),
  ('prakrit-pali', 7, '%prakrit%'),
  ('prakrit-pali', 7, '%pali%'),
  ('prakrit-pali', 7, '%ardhamagadhi%'),
  ('prakrit-pali', 7, '%apabhram%'),
  ('prakrit-pali', 7, '%magadhi%'),
  ('prakrit-pali', 7, '%sauraseni%'),
  ('sanskrit-kavya', 8, '%sanskrit%'),
  ('sanskrit-kavya', 8, '%kavya%'),
  ('sanskrit-kavya', 8, '%mahakavya%'),
  ('sanskrit-kavya', 8, '%poem%'),
  ('sanskrit-kavya', 8, '%poetry%'),
  ('sanskrit-kavya', 8, '%poet%'),
  ('sanskrit-kavya', 8, '%verse%'),
  ('sanskrit-kavya', 8, '%stotra%'),
  ('sanskrit-kavya', 8, '%hymn%'),
  ('narrative-story', 9, '%narrative%'),
  ('narrative-story', 9, '%story%'),
  ('narrative-story', 9, '%stories%'),
  ('narrative-story', 9, '%tale%'),
  ('narrative-story', 9, '%katha%'),
  ('narrative-story', 9, '%legend%'),
  ('narrative-story', 9, '%fable%'),
  ('narrative-story', 9, '%charita%'),
  ('narrative-story', 9, '%cariyam%'),
  ('narrative-story', 9, '%carita%'),
  ('narrative-story', 9, '%purana%'),
  ('narrative-story', 9, '%prabandha%'),
  ('narrative-story', 9, '%folklore%'),
  ('narrative-story', 9, '%myth%'),
  ('language-grammar', 10, '%grammar%'),
  ('language-grammar', 10, '%grammatical%'),
  ('language-grammar', 10, '%linguistic%'),
  ('language-grammar', 10, '%philolog%'),
  ('language-grammar', 10, '%lexicon%'),
  ('language-grammar', 10, '%lexical%'),
  ('language-grammar', 10, '%language%'),
  ('language-grammar', 10, '%etymolog%'),
  ('temple-architecture', 11, '%architect%'),
  ('temple-architecture', 11, '%temple%'),
  ('temple-architecture', 11, '%shrine%'),
  ('temple-architecture', 11, '%basadi%'),
  ('temple-architecture', 11, '%basti%'),
  ('temple-architecture', 11, '%cave%'),
  ('temple-architecture', 11, '%mandapa%'),
  ('temple-architecture', 11, '%stupa%'),
  ('temple-architecture', 11, '%monument%'),
  ('temple-architecture', 11, '%tirtha%'),
  ('temple-architecture', 11, '%pilgrimage site%'),
  ('temple-architecture', 11, '%khajuraho%'),
  ('temple-architecture', 11, '%building%'),
  ('sculpture-iconography', 12, '%iconograph%'),
  ('sculpture-iconography', 12, '%sculpture%'),
  ('sculpture-iconography', 12, '%sculptur%'),
  ('sculpture-iconography', 12, '%image%'),
  ('sculpture-iconography', 12, '%idol%'),
  ('sculpture-iconography', 12, '%statue%'),
  ('sculpture-iconography', 12, '%bronze%'),
  ('sculpture-iconography', 12, '%murti%'),
  ('sculpture-iconography', 12, '%relief%'),
  ('sculpture-iconography', 12, '%carving%'),
  ('sculpture-iconography', 12, '%yaksha%'),
  ('sculpture-iconography', 12, '%yakshi%'),
  ('sculpture-iconography', 12, '%bahubali%'),
  ('sculpture-iconography', 12, '%gommat%'),
  ('painting-manuscript-art', 13, '%painting%'),
  ('painting-manuscript-art', 13, '%miniature%'),
  ('painting-manuscript-art', 13, '%illustrat%'),
  ('painting-manuscript-art', 13, '%folio%'),
  ('painting-manuscript-art', 13, '%pata%'),
  ('painting-manuscript-art', 13, '%mural%'),
  ('painting-manuscript-art', 13, '%colour%'),
  ('painting-manuscript-art', 13, '%pictorial%'),
  ('epigraphy-inscriptions', 14, '%inscription%'),
  ('epigraphy-inscriptions', 14, '%epigraph%'),
  ('epigraphy-inscriptions', 14, '%copper plate%'),
  ('epigraphy-inscriptions', 14, '%copper-plate%'),
  ('epigraphy-inscriptions', 14, '%charter%'),
  ('epigraphy-inscriptions', 14, '%seal%'),
  ('epigraphy-inscriptions', 14, '%prashasti%'),
  ('epigraphy-inscriptions', 14, '%grant%'),
  ('dynasties-rulers', 15, '%dynasty%'),
  ('dynasties-rulers', 15, '%empire%'),
  ('dynasties-rulers', 15, '%kingdom%'),
  ('dynasties-rulers', 15, '%ruler%'),
  ('dynasties-rulers', 15, '%reign%'),
  ('dynasties-rulers', 15, '%king%'),
  ('dynasties-rulers', 15, '%emperor%'),
  ('dynasties-rulers', 15, '%chola%'),
  ('dynasties-rulers', 15, '%gupta%'),
  ('dynasties-rulers', 15, '%maurya%'),
  ('dynasties-rulers', 15, '%mughal%'),
  ('dynasties-rulers', 15, '%akbar%'),
  ('dynasties-rulers', 15, '%rashtrakuta%'),
  ('dynasties-rulers', 15, '%chalukya%'),
  ('dynasties-rulers', 15, '%hoysala%'),
  ('dynasties-rulers', 15, '%ganga%'),
  ('dynasties-rulers', 15, '%pallava%'),
  ('dynasties-rulers', 15, '%kushan%'),
  ('regional-history', 16, '%gujarat%'),
  ('regional-history', 16, '%rajasthan%'),
  ('regional-history', 16, '%karnataka%'),
  ('regional-history', 16, '%bengal%'),
  ('regional-history', 16, '%tamil%'),
  ('regional-history', 16, '%deccan%'),
  ('regional-history', 16, '%maharashtra%'),
  ('regional-history', 16, '%orissa%'),
  ('regional-history', 16, '%odisha%'),
  ('regional-history', 16, '%kerala%'),
  ('regional-history', 16, '%mathura%'),
  ('regional-history', 16, '%regional%'),
  ('regional-history', 16, '%local history%'),
  ('society-community', 17, '%community%'),
  ('society-community', 17, '%society%'),
  ('society-community', 17, '%social%'),
  ('society-community', 17, '%caste%'),
  ('society-community', 17, '%sangha%'),
  ('society-community', 17, '%sangh%'),
  ('society-community', 17, '%gaccha%'),
  ('society-community', 17, '%gachchha%'),
  ('society-community', 17, '%sect%'),
  ('society-community', 17, '%digambara%'),
  ('society-community', 17, '%svetambara%'),
  ('society-community', 17, '%shvetambara%'),
  ('society-community', 17, '%terapanth%'),
  ('society-community', 17, '%sthanakvasi%'),
  ('society-community', 17, '%patronage%'),
  ('tirthankaras-jinas', 18, '%tirthankar%'),
  ('tirthankaras-jinas', 18, '%trithankar%'),
  ('tirthankaras-jinas', 18, '%jina%'),
  ('tirthankaras-jinas', 18, '%mahavira%'),
  ('tirthankaras-jinas', 18, '%mahavir%'),
  ('tirthankaras-jinas', 18, '%parshva%'),
  ('tirthankaras-jinas', 18, '%parsva%'),
  ('tirthankaras-jinas', 18, '%rishabha%'),
  ('tirthankaras-jinas', 18, '%rsabha%'),
  ('tirthankaras-jinas', 18, '%adinatha%'),
  ('tirthankaras-jinas', 18, '%neminatha%'),
  ('tirthankaras-jinas', 18, '%shantinath%'),
  ('tirthankaras-jinas', 18, '%ford-maker%'),
  ('tirthankaras-jinas', 18, '%ford maker%'),
  ('acharyas-scholars', 19, '%acharya%'),
  ('acharyas-scholars', 19, '%acarya%'),
  ('acharyas-scholars', 19, '%hemachandra%'),
  ('acharyas-scholars', 19, '%hemacandra%'),
  ('acharyas-scholars', 19, '%kundakunda%'),
  ('acharyas-scholars', 19, '%umasvati%'),
  ('acharyas-scholars', 19, '%umaswati%'),
  ('acharyas-scholars', 19, '%haribhadra%'),
  ('acharyas-scholars', 19, '%yasovijaya%'),
  ('acharyas-scholars', 19, '%siddhasena%'),
  ('acharyas-scholars', 19, '%samantabhadra%'),
  ('acharyas-scholars', 19, '%scholar%'),
  ('acharyas-scholars', 19, '%preceptor%'),
  ('acharyas-scholars', 19, '%guru%'),
  ('modern-figures', 20, '%reformer%'),
  ('modern-figures', 20, '%biograph%'),
  ('modern-figures', 20, '%life of%'),
  ('modern-figures', 20, '%life and work%'),
  ('modern-figures', 20, '%personality%'),
  ('modern-figures', 20, '%leader%'),
  ('modern-figures', 20, '%saint%'),
  ('worship-ritual', 21, '%puja%'),
  ('worship-ritual', 21, '%worship%'),
  ('worship-ritual', 21, '%ritual%'),
  ('worship-ritual', 21, '%ceremony%'),
  ('worship-ritual', 21, '%festival%'),
  ('worship-ritual', 21, '%paryushan%'),
  ('worship-ritual', 21, '%mantra%'),
  ('worship-ritual', 21, '%aarti%'),
  ('worship-ritual', 21, '%arti%'),
  ('worship-ritual', 21, '%consecration%'),
  ('worship-ritual', 21, '%pratishtha%'),
  ('worship-ritual', 21, '%vidhi%'),
  ('worship-ritual', 21, '%observance%'),
  ('worship-ritual', 21, '%diwali%'),
  ('worship-ritual', 21, '%mahavir jayanti%'),
  ('meditation-yoga', 22, '%meditat%'),
  ('meditation-yoga', 22, '%dhyana%'),
  ('meditation-yoga', 22, '%yoga%'),
  ('meditation-yoga', 22, '%samayika%'),
  ('meditation-yoga', 22, '%preksha%'),
  ('meditation-yoga', 22, '%contemplat%'),
  ('meditation-yoga', 22, '%mindful%'),
  ('meditation-yoga', 22, '%kayotsarga%'),
  ('asceticism-renunciation', 23, '%ascetic%'),
  ('asceticism-renunciation', 23, '%asceticism%'),
  ('asceticism-renunciation', 23, '%monk%'),
  ('asceticism-renunciation', 23, '%muni%'),
  ('asceticism-renunciation', 23, '%sadhu%'),
  ('asceticism-renunciation', 23, '%sadhvi%'),
  ('asceticism-renunciation', 23, '%nun%'),
  ('asceticism-renunciation', 23, '%mendicant%'),
  ('asceticism-renunciation', 23, '%sallekhana%'),
  ('asceticism-renunciation', 23, '%santhara%'),
  ('asceticism-renunciation', 23, '%renunciat%'),
  ('asceticism-renunciation', 23, '%fasting%'),
  ('asceticism-renunciation', 23, '%tapas%'),
  ('asceticism-renunciation', 23, '%austerit%'),
  ('asceticism-renunciation', 23, '%diksha%'),
  ('asceticism-renunciation', 23, '%initiation%'),
  ('cosmology-metaphysical-worlds', 24, '%cosmolog%'),
  ('cosmology-metaphysical-worlds', 24, '%cosmograph%'),
  ('cosmology-metaphysical-worlds', 24, '%loka%'),
  ('cosmology-metaphysical-worlds', 24, '%universe%'),
  ('cosmology-metaphysical-worlds', 24, '%naraka%'),
  ('cosmology-metaphysical-worlds', 24, '%hell%'),
  ('cosmology-metaphysical-worlds', 24, '%heaven%'),
  ('cosmology-metaphysical-worlds', 24, '%cycle of time%'),
  ('cosmology-metaphysical-worlds', 24, '%kalachakra%'),
  ('manuscripts-catalogues', 25, '%manuscript%'),
  ('manuscripts-catalogues', 25, '%palm-leaf%'),
  ('manuscripts-catalogues', 25, '%palm leaf%'),
  ('manuscripts-catalogues', 25, '%codex%'),
  ('manuscripts-catalogues', 25, '%bhandar%'),
  ('manuscripts-catalogues', 25, '%bhandara%'),
  ('manuscripts-catalogues', 25, '%catalogue%'),
  ('manuscripts-catalogues', 25, '%catalog%'),
  ('manuscripts-catalogues', 25, '%collection%'),
  ('manuscripts-catalogues', 25, '%colophon%'),
  ('manuscripts-catalogues', 25, '%scriptorium%'),
  ('manuscripts-catalogues', 25, '%archive%'),
  ('editions-criticism', 26, '%critical edition%'),
  ('editions-criticism', 26, '%edition%'),
  ('editions-criticism', 26, '%textual%'),
  ('editions-criticism', 26, '%recension%'),
  ('editions-criticism', 26, '%variant reading%'),
  ('editions-criticism', 26, '%emendation%'),
  ('editions-criticism', 26, '%philological%'),
  ('buddhism', 27, '%buddhis%'),
  ('buddhism', 27, '%buddha%'),
  ('buddhism', 27, '%bodhi%'),
  ('buddhism', 27, '%bodhisattva%'),
  ('buddhism', 27, '%theravada%'),
  ('buddhism', 27, '%mahayana%'),
  ('buddhism', 27, '%nirvana %'),
  ('hinduism-vedanta', 28, '%hindu%'),
  ('hinduism-vedanta', 28, '%vedanta%'),
  ('hinduism-vedanta', 28, '%vedic%'),
  ('hinduism-vedanta', 28, '%upanishad%'),
  ('hinduism-vedanta', 28, '%brahmin%'),
  ('hinduism-vedanta', 28, '%brahman%'),
  ('hinduism-vedanta', 28, '%bhagavad%'),
  ('hinduism-vedanta', 28, '%gita%'),
  ('hinduism-vedanta', 28, '%vaishnav%'),
  ('hinduism-vedanta', 28, '%shaiv%'),
  ('hinduism-vedanta', 28, '%saiva%'),
  ('hinduism-vedanta', 28, '%purana %'),
  ('hinduism-vedanta', 28, '%ramayana%'),
  ('hinduism-vedanta', 28, '%mahabharata%'),
  ('comparative-interreligious', 29, '%comparative%'),
  ('comparative-interreligious', 29, '%interreligious%'),
  ('comparative-interreligious', 29, '%inter-religious%'),
  ('comparative-interreligious', 29, '%dialogue%'),
  ('comparative-interreligious', 29, '%christian%'),
  ('comparative-interreligious', 29, '%islam%'),
  ('comparative-interreligious', 29, '%sufi%'),
  ('comparative-interreligious', 29, '%sikh%'),
  ('environment-ecology', 30, '%environment%'),
  ('environment-ecology', 30, '%ecolog%'),
  ('environment-ecology', 30, '%nature%'),
  ('environment-ecology', 30, '%vegetarian%'),
  ('environment-ecology', 30, '%veganism%'),
  ('environment-ecology', 30, '%animal%'),
  ('environment-ecology', 30, '%climate%'),
  ('environment-ecology', 30, '%sustainab%'),
  ('education-institutions', 31, '%education%'),
  ('education-institutions', 31, '%school%'),
  ('education-institutions', 31, '%pathshala%'),
  ('education-institutions', 31, '%university%'),
  ('education-institutions', 31, '%institution%'),
  ('education-institutions', 31, '%academ%'),
  ('education-institutions', 31, '%pedagog%'),
  ('education-institutions', 31, '%teaching of%'),
  ('trade-economy', 32, '%trade%'),
  ('trade-economy', 32, '%merchant%'),
  ('trade-economy', 32, '%economy%'),
  ('trade-economy', 32, '%economic%'),
  ('trade-economy', 32, '%commerce%'),
  ('trade-economy', 32, '%guild%'),
  ('trade-economy', 32, '%business%'),
  ('trade-economy', 32, '%banking%'),
  ('trade-economy', 32, '%wealth%'),
  ('diaspora-contemporary', 33, '%diaspora%'),
  ('diaspora-contemporary', 33, '%global%'),
  ('diaspora-contemporary', 33, '%contemporary%'),
  ('diaspora-contemporary', 33, '%modern jain%'),
  ('diaspora-contemporary', 33, '%america%'),
  ('diaspora-contemporary', 33, '%western%'),
  ('diaspora-contemporary', 33, '%overseas%'),
  ('diaspora-contemporary', 33, '%nri%')
),
matched as (
  select t.id as tag_id, r.subsubject_slug,
         row_number() over (partition by t.id order by r.priority) as rn
  from public.tags t
  join rules r on t.name ilike r.pattern
)
insert into public.tag_subsubjects (tag_id, subsubject_id)
select m.tag_id, ss.id
from matched m
join public.subsubjects ss on ss.slug = m.subsubject_slug
where m.rn = 1
on conflict do nothing;

-- Materialise record → subject and record → sub-subject links.
insert into public.record_subjects (record_id, subject_id)
select distinct rt.record_id, ss.subject_id
from public.record_tags rt
join public.tag_subsubjects ts on ts.tag_id = rt.tag_id
join public.subsubjects ss on ss.id = ts.subsubject_id
on conflict do nothing;

insert into public.record_subsubjects (record_id, subsubject_id)
select distinct rt.record_id, ts.subsubject_id
from public.record_tags rt
join public.tag_subsubjects ts on ts.tag_id = rt.tag_id
on conflict do nothing;

-- Let the API roles read the new tables (RLS stays disabled by default).
grant select on public.subject_areas, public.subsubjects, public.tag_subsubjects, public.record_subjects, public.record_subsubjects to anon, authenticated, service_role;

-- Refresh PostgREST so the new tables + relationships are queryable.
notify pgrst, 'reload schema';
