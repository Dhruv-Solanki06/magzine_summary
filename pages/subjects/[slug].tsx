// pages/subjects/[slug].tsx — a broad subject: sub-topics + its records
import React, { useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';

import Header from '@/components/common/Header';
import SearchBar from '@/components/browse/SearchBar';
import ArticleGrid from '@/components/browse/ArticleGrid';
import Pagination from '@/components/browse/Pagination';
import { FilterDropdown, MenuOption } from '@/components/browse/FilterDropdown';
import { SORT_LABELS } from '@/components/browse/FilterBar';
import { coverTheme } from '@/lib/covers';
import { formatCount } from '@/lib/format';
import { SITE_NAME } from '@/lib/brand';
import type { RecordWithDetails, SortOption } from '@/types';
import type { SubsubjectWithCount } from '@/lib/server/subjects';

interface SubjectDetailProps {
  ready: boolean;
  subject: { slug: string; name: string; description: string | null };
  subsubjects: SubsubjectWithCount[];
  activeSub: string | null;
  records: RecordWithDetails[];
  pagination: { page: number; totalPages: number; totalRecords: number; pageSize: number };
  sort: SortOption;
  searchQuery: string;
}

const DEFAULT_PAGE_SIZE = 24;
const SORT_OPTIONS: SortOption[] = ['title_asc', 'title_desc', 'newest', 'oldest'];

type QueryPatch = Record<string, string | number | undefined>;

const SubjectDetailPage: NextPage<SubjectDetailProps> = ({
  ready,
  subject,
  subsubjects,
  activeSub,
  records,
  pagination,
  sort,
  searchQuery,
}) => {
  const router = useRouter();
  const theme = coverTheme(subject.slug);

  const updateQuery = useCallback(
    (patch: QueryPatch, resetPage = true) => {
      const next: Record<string, string> = {};
      Object.entries(router.query).forEach(([k, v]) => {
        if (k === 'slug') return;
        if (Array.isArray(v)) {
          if (v.length) next[k] = v[v.length - 1];
        } else if (v !== undefined) next[k] = v;
      });
      if (resetPage) delete next.page;
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === '' || v === null) delete next[k];
        else next[k] = String(v);
      });
      void router.push({ pathname: `/subjects/${subject.slug}`, query: next }, undefined, {
        scroll: true,
      });
    },
    [router, subject.slug],
  );

  return (
    <>
      <Head>
        <title>{`${subject.name} | ${SITE_NAME}`}</title>
        <meta name="description" content={subject.description ?? subject.name} />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        <div
          className="border-b border-black/[0.06]"
          style={{ background: `linear-gradient(150deg, ${theme.from}, ${theme.to})` }}
        >
          <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 lg:py-14">
            <Link
              href="/subjects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/80 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              All subjects
            </Link>
            <h1
              className="mt-4 max-w-3xl text-pretty text-[32px] font-bold leading-[1.1] tracking-[-0.5px] text-white sm:text-[44px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {subject.name}
            </h1>
            {subject.description && (
              <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-white/85">
                {subject.description}
              </p>
            )}
            {ready && (
              <p className="mt-4 text-sm font-medium text-white/90">
                {formatCount(pagination.totalRecords)} articles
              </p>
            )}
          </div>
        </div>

        <main className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-10 xl:px-14">
          {!ready ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This subject&apos;s records will appear once the taxonomy migration
              (<code className="rounded bg-amber-100 px-1">0001_subjects.sql</code>) has been run
              against the database.
            </div>
          ) : (
            <>
              {/* Sub-topic chips */}
              {subsubjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuery({ sub: undefined })}
                    className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                      !activeSub
                        ? 'bg-[#171717] text-white'
                        : 'bg-black/[0.05] text-black/60 hover:bg-black/[0.08]'
                    }`}
                  >
                    All sub-topics
                  </button>
                  {subsubjects.map((ss) => (
                    <button
                      key={ss.slug}
                      type="button"
                      onClick={() => updateQuery({ sub: ss.slug })}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        activeSub === ss.slug
                          ? 'bg-[#171717] text-white'
                          : 'bg-black/[0.05] text-black/60 hover:bg-black/[0.08]'
                      }`}
                    >
                      {ss.name}
                      <span
                        className={
                          activeSub === ss.slug ? 'text-white/60' : 'text-black/35'
                        }
                      >
                        {formatCount(ss.recordCount)}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search + sort */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <SearchBar
                    initialQuery={searchQuery}
                    onSearch={(q) => updateQuery({ search: q || undefined })}
                    placeholder={`Search within ${subject.name}…`}
                  />
                </div>
                <FilterDropdown label="Sort" selectedLabel={SORT_LABELS[sort]} align="right" plain>
                  {(close) => (
                    <div>
                      {SORT_OPTIONS.map((s) => (
                        <MenuOption
                          key={s}
                          active={s === sort}
                          onClick={() => {
                            updateQuery({ sort: s });
                            close();
                          }}
                        >
                          {SORT_LABELS[s]}
                        </MenuOption>
                      ))}
                    </div>
                  )}
                </FilterDropdown>
              </div>

              <p className="mt-5 text-sm font-medium text-black/54">
                {formatCount(pagination.totalRecords)}{' '}
                {pagination.totalRecords === 1 ? 'article' : 'articles'}
                {searchQuery && (
                  <>
                    {' '}for <span className="text-black/92">“{searchQuery}”</span>
                  </>
                )}
              </p>

              <div className="mt-4">
                <ArticleGrid records={records} onReset={() => updateQuery({ search: undefined, sub: undefined })} />
              </div>

              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                totalRecords={pagination.totalRecords}
                pageSize={pagination.pageSize}
                onPageChange={(p) => {
                  updateQuery({ page: p }, false);
                  if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </>
          )}
        </main>
      </div>
    </>
  );
};

function str(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const getServerSideProps: GetServerSideProps<SubjectDetailProps> = async ({
  params,
  query,
}) => {
  const { fetchSubjectBySlug, fetchSubsubjectsWithCounts, fetchRecordsBySubject } = await import(
    '@/lib/server/subjects'
  );

  const slug = String(params?.slug ?? '');
  const subject = await fetchSubjectBySlug(slug);
  if (!subject) return { notFound: true };

  const ready = subject.id !== -1;
  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const sort = (str(query.sort) as SortOption) || 'title_asc';
  const searchQuery = str(query.search)?.trim() || '';
  const activeSub = str(query.sub) || null;

  let subsubjects: SubsubjectWithCount[] = [];
  let records: RecordWithDetails[] = [];
  let pagination = { page, totalPages: 0, totalRecords: 0, pageSize: DEFAULT_PAGE_SIZE };

  if (ready) {
    subsubjects = await fetchSubsubjectsWithCounts(subject.id);
    const activeSubId = activeSub
      ? subsubjects.find((s) => s.slug === activeSub)?.id
      : undefined;
    const response = await fetchRecordsBySubject({
      subjectId: subject.id,
      subsubjectId: activeSubId,
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sort,
      search: searchQuery || undefined,
    });
    records = response.data;
    pagination = {
      page: response.page,
      totalPages: response.totalPages,
      totalRecords: response.count,
      pageSize: response.pageSize,
    };
  }

  return {
    props: {
      ready,
      subject: { slug: subject.slug, name: subject.name, description: subject.description },
      subsubjects,
      activeSub,
      records,
      pagination,
      sort,
      searchQuery,
    },
  };
};

export default SubjectDetailPage;
