import React, { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import MagazineCard from '@/components/browse/MagazineCard';
import Pagination from '@/components/browse/Pagination';
import FiltersModal, { type FilterState } from '@/components/browse/FiltersModal';
import type {
  Author,
  RecordWithDetails,
  SearchFilters,
  Tag,
  SortOption,
} from '@/types';

interface BrowsePageProps {
  records: RecordWithDetails[];
  pagination: {
    page: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
  };
  appliedFilters: SearchFilters;
  sort: SortOption;
  searchQuery: string;
  tags: Tag[];
  authors: Author[];
}

const DEFAULT_PAGE_SIZE = 20;

const BrowsePage: NextPage<BrowsePageProps> = ({
  records,
  pagination,
  appliedFilters,
  sort,
  searchQuery,
  tags,
  authors,
}) => {
  const router = useRouter();
  const [isFiltersOpen, setFiltersOpen] = useState(false);

  const tagIdSet = useMemo(() => new Set(appliedFilters.tags ?? []), [appliedFilters.tags]);
  const authorIdSet = useMemo(() => new Set(appliedFilters.authors ?? []), [appliedFilters.authors]);

  const selectedTags = useMemo(
    () => tags.filter((tag) => tagIdSet.has(tag.id)),
    [tags, tagIdSet],
  );

  const selectedAuthors = useMemo(
    () => authors.filter((author) => authorIdSet.has(author.id)),
    [authors, authorIdSet],
  );

  const updateQuery = useCallback((updates: Record<string, string | number | undefined>) => {
    const nextQuery: Record<string, string> = {};
    const current = router.query;

    Object.entries(current).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          nextQuery[key] = value[value.length - 1];
        }
      } else if (value !== undefined) {
        nextQuery[key] = value;
      }
    });

    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === null) {
        delete nextQuery[key];
        return;
      }
      nextQuery[key] = String(value);
    });

    router.push(
      {
        pathname: router.pathname,
        query: nextQuery,
      },
      undefined,
      { shallow: false, scroll: true },
    );
  }, [router]);

  const handleSearch = useCallback((query: string) => {
    updateQuery({
      search: query || undefined,
      page: 1,
    });
  }, [updateQuery]);

  const handlePageChange = useCallback(
    (page: number) => {
      updateQuery({ page });
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [updateQuery],
  );

  const handleTagClick = useCallback((tagId: number) => {
    const updated = new Set(appliedFilters.tags ?? []);
    if (updated.has(tagId)) {
      updated.delete(tagId);
    } else {
      updated.add(tagId);
    }

    updateQuery({
      tags: updated.size > 0 ? Array.from(updated).join(',') : undefined,
      page: 1,
    });
  }, [appliedFilters.tags, updateQuery]);

  const handleFiltersApply = useCallback((filters: FilterState) => {
    updateQuery({
      magazine: filters.magazine || undefined,
      language: filters.language || undefined,
      tags: filters.tags.length ? filters.tags.join(',') : undefined,
      authors: filters.authors.length ? filters.authors.join(',') : undefined,
      yearStart: filters.yearStart ?? undefined,
      yearEnd: filters.yearEnd ?? undefined,
      sort: filters.sort,
      page: 1,
    });
  }, [updateQuery]);

  const handleFiltersClear = useCallback(() => {
    updateQuery({
      magazine: undefined,
      language: undefined,
      tags: undefined,
      authors: undefined,
      yearStart: undefined,
      yearEnd: undefined,
      sort: undefined,
      page: 1,
    });
  }, [updateQuery]);

  const activeFilters = useMemo(() => {
    const filters: { label: string; value: string; onRemove: () => void }[] = [];

    if (searchQuery) {
      filters.push({
        label: 'Search',
        value: searchQuery,
        onRemove: () => handleSearch(''),
      });
    }
    if (appliedFilters.magazine) {
      filters.push({
        label: 'Magazine',
        value: appliedFilters.magazine,
        onRemove: () => updateQuery({ magazine: undefined, page: 1 }),
      });
    }
    if (appliedFilters.language) {
      filters.push({
        label: 'Language',
        value: appliedFilters.language,
        onRemove: () => updateQuery({ language: undefined, page: 1 }),
      });
    }
    if (appliedFilters.yearRange?.start || appliedFilters.yearRange?.end) {
      const start = appliedFilters.yearRange?.start ?? '—';
      const end = appliedFilters.yearRange?.end ?? '—';
      filters.push({
        label: 'Years',
        value: `${start} - ${end}`,
        onRemove: () =>
          updateQuery({
            yearStart: undefined,
            yearEnd: undefined,
            page: 1,
          }),
      });
    }
    selectedTags.forEach((tag) => {
      filters.push({
        label: 'Tag',
        value: tag.name,
        onRemove: () => handleTagClick(tag.id),
      });
    });
    selectedAuthors.forEach((author) => {
      filters.push({
        label: 'Author',
        value: author.name,
        onRemove: () => {
          const updated = new Set(appliedFilters.authors ?? []);
          if (updated.has(author.id)) {
            updated.delete(author.id);
          }
          updateQuery({
            authors: updated.size ? Array.from(updated).join(',') : undefined,
            page: 1,
          });
        },
      });
    });

    return filters;
  }, [
    appliedFilters.magazine,
    appliedFilters.language,
    appliedFilters.yearRange,
    appliedFilters.authors,
    handleSearch,
    handleTagClick,
    updateQuery,
    selectedTags,
    selectedAuthors,
    searchQuery,
  ]);

  const modalInitialFilters: FilterState = {
    magazine: appliedFilters.magazine ?? '',
    language: appliedFilters.language ?? '',
    yearStart: appliedFilters.yearRange?.start,
    yearEnd: appliedFilters.yearRange?.end,
    tags: appliedFilters.tags ?? [],
    authors: appliedFilters.authors ?? [],
    sort,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <Header
        onSearch={handleSearch}
        onFiltersClick={() => setFiltersOpen(true)}
        searchQuery={searchQuery}
      />

      <main className="container mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl font-bold text-slate-900">Summaries A-Z</h2>
            <p className="mt-1 text-sm text-slate-500">
              Browse curated magazine summaries with intelligent filters and sorting.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            Open Filters
          </button>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Active filters:</span>
            {activeFilters.map((filter, index) => (
              <span
                key={`${filter.label}-${filter.value}-${index}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm"
              >
                <span className="font-medium text-slate-500">{filter.label}:</span>
                <span>{filter.value}</span>
                <button
                  type="button"
                  onClick={filter.onRemove}
                  className="rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                  aria-label={`Remove ${filter.label} filter`}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={handleFiltersClear}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          </div>
        )}

        <section className="mt-8 space-y-6">
          {records.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
              {records.map((record, index) => (
                <MagazineCard
                  key={record.id}
                  record={record}
                  imagePosition={index % 2 === 0 ? 'left' : 'right'}
                  onTagClick={handleTagClick}
                  activeTagIds={Array.from(tagIdSet)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-white/90 p-12 text-center shadow-lg ring-1 ring-slate-200">
              <h3 className="text-xl font-semibold text-slate-800">No summaries found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try adjusting your filters or search terms to discover more content.
              </p>
            </div>
          )}
        </section>

        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalRecords={pagination.totalRecords}
          pageSize={pagination.pageSize}
          onPageChange={handlePageChange}
        />
      </main>

      <FiltersModal
        open={isFiltersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={handleFiltersApply}
        onClear={handleFiltersClear}
        tags={tags}
        authors={authors}
        initialFilters={modalInitialFilters}
      />
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<BrowsePageProps> = async ({ query }) => {
  const { fetchRecordsWithFilters, fetchAllTags, fetchAllAuthors } = await import('@/lib/server/records');

  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? DEFAULT_PAGE_SIZE);
  const sort = (query.sort ?? 'title_asc') as SortOption;

  const parseNumberArray = (value: string | string[] | undefined): number[] | undefined => {
    if (!value) return undefined;
    const raw = Array.isArray(value) ? value : value.split(',');
    const parsed = raw
      .map((item) => Number(item))
      .filter((num) => Number.isFinite(num));
    return parsed.length ? parsed : undefined;
  };

  const filters: SearchFilters = {
    searchQuery: typeof query.search === 'string' ? query.search : undefined,
    magazine: typeof query.magazine === 'string' ? query.magazine : undefined,
    language: typeof query.language === 'string' ? query.language : undefined,
    tags: parseNumberArray(query.tags),
    authors: parseNumberArray(query.authors),
    yearRange: {
      start: typeof query.yearStart === 'string' ? Number(query.yearStart) : undefined,
      end: typeof query.yearEnd === 'string' ? Number(query.yearEnd) : undefined,
    },
  };

  if (!filters.yearRange?.start && !filters.yearRange?.end) {
    filters.yearRange = undefined;
  }

  const serializableFilters: SearchFilters = {};
  if (filters.searchQuery !== undefined) {
    serializableFilters.searchQuery = filters.searchQuery;
  }
  if (filters.magazine !== undefined) {
    serializableFilters.magazine = filters.magazine;
  }
  if (filters.language !== undefined) {
    serializableFilters.language = filters.language;
  }
  if (filters.tags !== undefined) {
    serializableFilters.tags = filters.tags;
  }
  if (filters.authors !== undefined) {
    serializableFilters.authors = filters.authors;
  }
  if (filters.yearRange) {
    const yearRange: NonNullable<SearchFilters['yearRange']> = {};
    if (filters.yearRange.start !== undefined) {
      yearRange.start = filters.yearRange.start;
    }
    if (filters.yearRange.end !== undefined) {
      yearRange.end = filters.yearRange.end;
    }
    if (Object.keys(yearRange).length > 0) {
      serializableFilters.yearRange = yearRange;
    }
  }

  const [recordsResponse, tagsList, authorsList] = await Promise.all([
    fetchRecordsWithFilters({
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? Math.min(Math.max(pageSize, 1), 50) : DEFAULT_PAGE_SIZE,
      filters,
      sort,
    }),
    fetchAllTags(),
    fetchAllAuthors(),
  ]);

  return {
    props: {
      records: recordsResponse.data,
      pagination: {
        page: recordsResponse.page,
        totalPages: recordsResponse.totalPages,
        totalRecords: recordsResponse.count,
        pageSize: recordsResponse.pageSize,
      },
      appliedFilters: serializableFilters,
      sort,
      searchQuery: filters.searchQuery ?? '',
      tags: tagsList,
      authors: authorsList,
    },
  };
};

export default BrowsePage;
