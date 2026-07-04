// pages/index.tsx — Article repository browse (home)
import React, { useCallback, useMemo } from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { X } from 'lucide-react';

import Header from '@/components/common/Header';
import SearchBar from '@/components/browse/SearchBar';
import FilterBar, { type FilterBarValue } from '@/components/browse/FilterBar';
import ArticleGrid from '@/components/browse/ArticleGrid';
import Pagination from '@/components/browse/Pagination';

import type {
  Author,
  MagazineWithStats,
  RecordWithDetails,
  SortOption,
  Tag,
} from '@/types';
import type { LanguageFacet } from '@/lib/server/records';
import { formatCount } from '@/lib/format';
import {
  HERITAGE_ASSETS,
  SITE_DESCRIPTION,
  SITE_DOMAIN,
  SITE_NAME,
  SITE_URL,
} from '@/lib/brand';

interface BrowsePageProps {
  records: RecordWithDetails[];
  pagination: { page: number; totalPages: number; totalRecords: number; pageSize: number };
  magazines: MagazineWithStats[];
  languages: LanguageFacet[];
  value: FilterBarValue;
  selectedTags: Tag[];
  selectedAuthors: Author[];
  searchQuery: string;
}

const DEFAULT_PAGE_SIZE = 20;

type QueryPatch = Record<string, string | number | undefined>;

const BrowsePage: NextPage<BrowsePageProps> = ({
  records,
  pagination,
  magazines,
  languages,
  value,
  selectedTags,
  selectedAuthors,
  searchQuery,
}) => {
  const router = useRouter();

  const updateQuery = useCallback(
    (patch: QueryPatch, resetPage = true) => {
      const next: Record<string, string> = {};
      Object.entries(router.query).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length) next[k] = v[v.length - 1];
        } else if (v !== undefined) {
          next[k] = v;
        }
      });
      if (resetPage) delete next.page;
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === '' || v === null) delete next[k];
        else next[k] = String(v);
      });
      void router.push({ pathname: '/', query: next }, undefined, { scroll: true });
    },
    [router],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<FilterBarValue>) => {
      const q: QueryPatch = {};
      if ('magazineId' in patch) q.magazineId = patch.magazineId;
      if ('language' in patch) q.language = patch.language;
      if ('yearStart' in patch) q.yearStart = patch.yearStart;
      if ('yearEnd' in patch) q.yearEnd = patch.yearEnd;
      if ('sort' in patch) q.sort = patch.sort;
      if ('tagIds' in patch) q.tags = patch.tagIds?.length ? patch.tagIds.join(',') : undefined;
      if ('authorIds' in patch)
        q.authors = patch.authorIds?.length ? patch.authorIds.join(',') : undefined;
      updateQuery(q);
    },
    [updateQuery],
  );

  const handleReset = useCallback(() => {
    void router.push({ pathname: '/' }, undefined, { scroll: true });
  }, [router]);

  const handleTagClick = useCallback(
    (tagId: number) => {
      const set = new Set(value.tagIds);
      if (set.has(tagId)) {
        set.delete(tagId);
      } else {
        set.add(tagId);
      }
      updateQuery({ tags: set.size ? Array.from(set).join(',') : undefined });
    },
    [value.tagIds, updateQuery],
  );

  const activeChips = useMemo(() => {
    const chips: { label: string; value: string; onRemove: () => void }[] = [];
    if (searchQuery)
      chips.push({ label: 'Search', value: searchQuery, onRemove: () => updateQuery({ search: undefined }) });
    const mag = magazines.find((m) => m.id === value.magazineId);
    if (mag) chips.push({ label: 'Magazine', value: mag.name, onRemove: () => updateQuery({ magazineId: undefined }) });
    if (value.language)
      chips.push({ label: 'Language', value: value.language, onRemove: () => updateQuery({ language: undefined }) });
    if (value.yearStart || value.yearEnd)
      chips.push({
        label: 'Years',
        value: `${value.yearStart ?? '…'} – ${value.yearEnd ?? '…'}`,
        onRemove: () => updateQuery({ yearStart: undefined, yearEnd: undefined }),
      });
    selectedTags.forEach((t) =>
      chips.push({ label: 'Topic', value: t.name, onRemove: () => handleTagClick(t.id) }),
    );
    selectedAuthors.forEach((a) =>
      chips.push({
        label: 'Author',
        value: a.name,
        onRemove: () => {
          const set = new Set(value.authorIds);
          set.delete(a.id);
          updateQuery({ authors: set.size ? Array.from(set).join(',') : undefined });
        },
      }),
    );
    return chips;
  }, [searchQuery, magazines, value, selectedTags, selectedAuthors, updateQuery, handleTagClick]);

  const hasActive =
    activeChips.length > 0 || value.sort !== 'title_asc';

  return (
    <>
      <Head>
        <title>{`${SITE_NAME} | Cultural Article Archive`}</title>
        <meta
          name="description"
          content={SITE_DESCRIPTION}
        />
        <meta property="og:title" content={`${SITE_NAME} | Cultural Article Archive`} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}${HERITAGE_ASSETS[0].src}`} />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        <main className="w-full px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <section className="grid gap-6 border-b border-black/[0.06] pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/45">
                {SITE_DOMAIN}
              </p>
              <h1
                className="mt-2 text-[34px] font-bold leading-[1.05] tracking-[-0.8px] text-black/92 sm:text-[44px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {SITE_NAME}
              </h1>
              <p className="mt-3 text-[15px] leading-[1.65] text-black/58 sm:text-[16px]">
                A research archive for cultural articles, journals, manuscripts and
                literary scholarship from the Indic knowledge tradition.
              </p>
              <p className="mt-3 text-[14px] leading-[1.55] text-black/50">
                {formatCount(pagination.totalRecords)} summarised articles across{' '}
                {magazines.length} magazines &amp; journals. Search full text, then filter by
                topic, author, language and era.
              </p>
            </div>

            <div className="grid h-48 grid-cols-3 gap-2 overflow-hidden rounded-[14px] bg-black/[0.03] p-2 ring-1 ring-black/[0.06] sm:h-56">
              {HERITAGE_ASSETS.slice(0, 3).map((asset, index) => (
                <div
                  key={asset.src}
                  role="img"
                  aria-label={asset.alt}
                  className="min-h-0 rounded-[10px] bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)), url("${asset.src}")`,
                    transform: index === 1 ? 'translateY(18px)' : undefined,
                  }}
                />
              ))}
            </div>
          </section>

          {/* Search + filters */}
          <div className="mt-6 flex flex-col gap-3">
            <SearchBar
              initialQuery={searchQuery}
              onSearch={(q) => updateQuery({ search: q || undefined })}
              placeholder="Search titles, authors, summaries and full text…"
            />
            <FilterBar
              magazines={magazines}
              languages={languages}
              value={value}
              selectedTags={selectedTags}
              selectedAuthors={selectedAuthors}
              allowRelevance={Boolean(searchQuery)}
              onChange={handleFilterChange}
              onReset={handleReset}
              hasActiveFilters={hasActive}
            />
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip, i) => (
                <span
                  key={`${chip.label}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white py-1 pl-3 pr-1.5 text-[13px] text-black/70"
                >
                  <span className="text-black/40">{chip.label}:</span>
                  <span className="max-w-[220px] truncate font-medium">{chip.value}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label}`}
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-black/40 hover:bg-black/[0.06] hover:text-black/70"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Count */}
          <p className="mt-6 text-sm font-medium text-black/54">
            {formatCount(pagination.totalRecords)} {pagination.totalRecords === 1 ? 'article' : 'articles'}
            {searchQuery && (
              <>
                {' '}for <span className="text-black/92">“{searchQuery}”</span>
              </>
            )}
          </p>

          {/* Results */}
          <div className="mt-4">
            <ArticleGrid
              records={records}
              onTagClick={handleTagClick}
              activeTagIds={value.tagIds}
              onReset={handleReset}
            />
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
        </main>
      </div>
    </>
  );
};

function parseNumberArray(value: string | string[] | undefined): number[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : value.split(',');
  return raw.map(Number).filter((n) => Number.isFinite(n));
}

function str(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

export const getServerSideProps: GetServerSideProps<BrowsePageProps> = async ({ query }) => {
  const {
    fetchRecordsWithFilters,
    fetchAllMagazinesWithStats,
    fetchLanguages,
    getTagsByIds,
    getAuthorsByIds,
  } = await import('@/lib/server/records');

  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const searchQuery = str(query.search)?.trim() || '';
  const magazineId = Number(str(query.magazineId));
  const language = str(query.language);
  const yearStart = Number(str(query.yearStart));
  const yearEnd = Number(str(query.yearEnd));
  const tagIds = parseNumberArray(query.tags);
  const authorIds = parseNumberArray(query.authors);

  const defaultSort: SortOption = searchQuery ? 'relevance' : 'title_asc';
  const sort = (str(query.sort) as SortOption) || defaultSort;

  const filters = {
    searchQuery: searchQuery || undefined,
    magazineId: Number.isFinite(magazineId) ? magazineId : undefined,
    language,
    tags: tagIds.length ? tagIds : undefined,
    authors: authorIds.length ? authorIds : undefined,
    yearRange:
      Number.isFinite(yearStart) || Number.isFinite(yearEnd)
        ? {
            start: Number.isFinite(yearStart) ? yearStart : undefined,
            end: Number.isFinite(yearEnd) ? yearEnd : undefined,
          }
        : undefined,
  };

  const [recordsResponse, magazines, languages, selectedTags, selectedAuthors] =
    await Promise.all([
      fetchRecordsWithFilters({ page, pageSize: DEFAULT_PAGE_SIZE, filters, sort }),
      fetchAllMagazinesWithStats(),
      fetchLanguages(),
      getTagsByIds(tagIds),
      getAuthorsByIds(authorIds),
    ]);

  // Strip `undefined` (Next cannot serialize it in props).
  const value: FilterBarValue = JSON.parse(
    JSON.stringify({
      magazineId: filters.magazineId,
      language: language ?? undefined,
      yearStart: Number.isFinite(yearStart) ? yearStart : undefined,
      yearEnd: Number.isFinite(yearEnd) ? yearEnd : undefined,
      sort,
      tagIds,
      authorIds,
    }),
  );

  return {
    props: {
      records: recordsResponse.data,
      pagination: {
        page: recordsResponse.page,
        totalPages: recordsResponse.totalPages,
        totalRecords: recordsResponse.count,
        pageSize: recordsResponse.pageSize,
      },
      magazines,
      languages,
      value,
      selectedTags,
      selectedAuthors,
      searchQuery,
    },
  };
};

export default BrowsePage;
