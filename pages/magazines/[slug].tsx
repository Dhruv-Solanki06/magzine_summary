// pages/magazines/[slug].tsx — a single magazine: hero + its articles
import React, { useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ArrowLeft, ExternalLink, FileText, MapPin } from 'lucide-react';

import Header from '@/components/common/Header';
import SearchBar from '@/components/browse/SearchBar';
import FilterBar, { type FilterBarValue } from '@/components/browse/FilterBar';
import ArticleGrid from '@/components/browse/ArticleGrid';
import Pagination from '@/components/browse/Pagination';
import { coverTheme } from '@/lib/covers';
import { formatCount } from '@/lib/format';
import { heritageAssetForSeed, SITE_NAME } from '@/lib/brand';

import type {
  Author,
  MagazineWithStats,
  RecordWithDetails,
  SortOption,
  Tag,
} from '@/types';
import type { LanguageFacet } from '@/lib/server/records';

interface MagazineDetailProps {
  magazine: MagazineWithStats;
  records: RecordWithDetails[];
  pagination: { page: number; totalPages: number; totalRecords: number; pageSize: number };
  languages: LanguageFacet[];
  value: FilterBarValue;
  selectedTags: Tag[];
  selectedAuthors: Author[];
  searchQuery: string;
}

const DEFAULT_PAGE_SIZE = 20;
type QueryPatch = Record<string, string | number | undefined>;

const MagazineDetailPage: NextPage<MagazineDetailProps> = ({
  magazine,
  records,
  pagination,
  languages,
  value,
  selectedTags,
  selectedAuthors,
  searchQuery,
}) => {
  const router = useRouter();
  const theme = coverTheme(magazine.id);
  const heroAsset = heritageAssetForSeed(magazine.id);

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
      void router.push(
        { pathname: `/magazines/${magazine.slug}`, query: next },
        undefined,
        { scroll: true },
      );
    },
    [router, magazine.slug],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<FilterBarValue>) => {
      const q: QueryPatch = {};
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
    void router.push(`/magazines/${magazine.slug}`, undefined, { scroll: true });
  }, [router, magazine.slug]);

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

  const hasActive =
    Boolean(searchQuery) ||
    Boolean(value.language) ||
    Boolean(value.yearStart || value.yearEnd) ||
    value.tagIds.length > 0 ||
    value.authorIds.length > 0 ||
    value.sort !== 'title_asc';

  return (
    <>
      <Head>
        <title>{`${magazine.name} | ${SITE_NAME}`}</title>
        <meta
          name="description"
          content={
            magazine.description ||
            `${formatCount(magazine.recordCount)} archived articles from ${magazine.name}.`
          }
        />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        {/* Hero */}
        <div
          className="border-b border-black/[0.06]"
          style={{
            backgroundImage: `linear-gradient(150deg, ${theme.from}f2, ${theme.to}d9), url("${heroAsset.src}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        >
          <div className="w-full px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
            <Link
              href="/magazines"
              className="inline-flex items-center gap-1.5 text-sm font-medium opacity-80 transition hover:opacity-100"
              style={{ color: theme.ink }}
            >
              <ArrowLeft className="h-4 w-4" />
              All publications
            </Link>
            <h1
              className="mt-4 max-w-3xl text-pretty text-[32px] font-bold leading-[1.1] tracking-[-0.5px] sm:text-[44px]"
              style={{ color: theme.ink, fontFamily: 'var(--font-heading)' }}
            >
              {magazine.name}
            </h1>
            {magazine.description && (
              <p
                className="mt-3 max-w-2xl text-[15px] leading-[1.6] opacity-85"
                style={{ color: theme.ink }}
              >
                {magazine.description}
              </p>
            )}
            <div
              className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm opacity-90"
              style={{ color: theme.ink }}
            >
              <span className="inline-flex items-center gap-1.5 font-medium">
                <FileText className="h-4 w-4" />
                {formatCount(magazine.recordCount)} articles
              </span>
              {magazine.founded_year && <span>Est. {magazine.founded_year}</span>}
              {magazine.headquarters && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {magazine.headquarters}
                </span>
              )}
              {magazine.website_url && (
                <a
                  href={magazine.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 underline underline-offset-4"
                >
                  Website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <main className="w-full px-4 pb-16 pt-6 sm:px-6 lg:px-10">
          <div className="flex flex-col gap-3">
            <SearchBar
              initialQuery={searchQuery}
              onSearch={(q) => updateQuery({ search: q || undefined })}
              placeholder={`Search within ${magazine.name}…`}
            />
            <FilterBar
              magazines={[]}
              hideMagazine
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

          <p className="mt-6 text-sm font-medium text-black/54">
            {formatCount(pagination.totalRecords)}{' '}
            {pagination.totalRecords === 1 ? 'article' : 'articles'}
            {searchQuery && (
              <>
                {' '}for <span className="text-black/92">“{searchQuery}”</span>
              </>
            )}
          </p>

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

export const getServerSideProps: GetServerSideProps<MagazineDetailProps> = async ({
  params,
  query,
}) => {
  const {
    fetchMagazineBySlug,
    fetchRecordsWithFilters,
    fetchLanguages,
    getTagsByIds,
    getAuthorsByIds,
  } = await import('@/lib/server/records');

  const slug = String(params?.slug ?? '');
  const magazine = await fetchMagazineBySlug(slug);
  if (!magazine) return { notFound: true };

  const page = Math.max(1, Number(query.page ?? 1) || 1);
  const searchQuery = str(query.search)?.trim() || '';
  const language = str(query.language);
  const yearStart = Number(str(query.yearStart));
  const yearEnd = Number(str(query.yearEnd));
  const tagIds = parseNumberArray(query.tags);
  const authorIds = parseNumberArray(query.authors);
  const defaultSort: SortOption = searchQuery ? 'relevance' : 'title_asc';
  const sort = (str(query.sort) as SortOption) || defaultSort;

  const filters = {
    searchQuery: searchQuery || undefined,
    magazineId: magazine.id,
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

  const [recordsResponse, languages, selectedTags, selectedAuthors] = await Promise.all([
    fetchRecordsWithFilters({ page, pageSize: DEFAULT_PAGE_SIZE, filters, sort }),
    fetchLanguages(),
    getTagsByIds(tagIds),
    getAuthorsByIds(authorIds),
  ]);

  const value: FilterBarValue = JSON.parse(
    JSON.stringify({
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
      magazine,
      records: recordsResponse.data,
      pagination: {
        page: recordsResponse.page,
        totalPages: recordsResponse.totalPages,
        totalRecords: recordsResponse.count,
        pageSize: recordsResponse.pageSize,
      },
      languages,
      value,
      selectedTags,
      selectedAuthors,
      searchQuery,
    },
  };
};

export default MagazineDetailPage;
