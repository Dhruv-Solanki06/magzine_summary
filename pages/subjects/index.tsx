// pages/subjects/index.tsx — browse the archive by broad subject area
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { ArrowUpRight, FileText } from 'lucide-react';

import Header from '@/components/common/Header';
import { coverTheme } from '@/lib/covers';
import { formatCount } from '@/lib/format';
import { SITE_NAME } from '@/lib/brand';
import { SUBJECTS as TAXONOMY } from '@/lib/taxonomy';
import type { SubjectWithCount } from '@/lib/server/subjects';

interface SubjectsPageProps {
  ready: boolean;
  subjects: SubjectWithCount[];
}

const SubjectsPage: NextPage<SubjectsPageProps> = ({ ready, subjects }) => {
  const totalArticles = subjects.reduce((n, s) => n + s.recordCount, 0);

  return (
    <>
      <Head>
        <title>{`Subjects | ${SITE_NAME}`}</title>
        <meta
          name="description"
          content="Browse the archive by broad subject area — philosophy, history, art, literature, scripture and more."
        />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="w-full px-4 pb-16 pt-8 sm:px-6 lg:px-10 xl:px-14">
          <div className="max-w-2xl">
            <h1
              className="text-[30px] font-bold leading-[1.15] tracking-[-0.5px] text-black/92 sm:text-[36px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Browse by subject
            </h1>
            <p className="mt-2 text-[15px] leading-[1.55] text-black/54">
              {ready
                ? `${formatCount(totalArticles)} article assignments across ${subjects.length} broad subject areas. Each area gathers related sub-topics drawn from the archive's tags.`
                : 'The subject index groups the archive into broad subject areas and their sub-topics.'}
            </p>
          </div>

          {!ready && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              The subject taxonomy tables haven&apos;t been created in the database yet. Run{' '}
              <code className="rounded bg-amber-100 px-1">supabase/migrations/0001_subjects.sql</code>{' '}
              to populate them; the categories below are shown from the taxonomy definition in the
              meantime.
            </div>
          )}

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {(ready ? subjects : fallbackList()).map((s) => {
              const theme = coverTheme(s.slug);
              const subs = TAXONOMY.find((t) => t.slug === s.slug)?.subsubjects ?? [];
              return (
                <Link
                  key={s.slug}
                  href={`/subjects/${s.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-card-hover)] hover:ring-black/10"
                >
                  <div
                    className="relative flex h-28 items-end p-4"
                    style={{ background: `linear-gradient(145deg, ${theme.from}, ${theme.to})` }}
                  >
                    <h2
                      className="text-pretty text-[18px] font-bold leading-tight text-white"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {s.name}
                    </h2>
                    <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-white/70 transition group-hover:text-white" />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="text-[13px] leading-[1.5] text-black/54 line-clamp-3">
                      {s.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {subs.slice(0, 4).map((ss) => (
                        <span
                          key={ss.slug}
                          className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-black/55"
                        >
                          {ss.name}
                        </span>
                      ))}
                      {subs.length > 4 && (
                        <span className="self-center text-[11px] text-black/40">
                          +{subs.length - 4}
                        </span>
                      )}
                    </div>
                    {ready && (
                      <div className="mt-auto flex items-center gap-1.5 pt-4 text-[12.5px] font-medium text-black/50">
                        <FileText className="h-3.5 w-3.5 text-black/30" />
                        {formatCount(s.recordCount)} articles
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </>
  );
};

function fallbackList(): SubjectWithCount[] {
  return TAXONOMY.map((s, i) => ({
    id: -1 - i,
    slug: s.slug,
    name: s.name,
    description: s.description,
    sort_order: i,
    recordCount: 0,
  }));
}

export const getServerSideProps: GetServerSideProps<SubjectsPageProps> = async () => {
  const { fetchSubjectsWithCounts } = await import('@/lib/server/subjects');
  const { ready, subjects } = await fetchSubjectsWithCounts();
  return { props: { ready, subjects } };
};

export default SubjectsPage;
