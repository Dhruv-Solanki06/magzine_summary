'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';
import { Search, SlidersHorizontal, ChevronDown, Loader2 } from 'lucide-react';

import Header from '@/components/common/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAuthGate } from '@/components/auth/AuthGate';
import { ResearcherCard, ResearcherCardSkeleton } from '@/components/researchers/ResearcherCard';
import SortDropdown from '@/components/researchers/SortDropdown';
import {
  RESEARCHERS_PAGE_SIZE,
  researcherSortOptions,
  type ResearcherCardData,
  type ResearcherSearchResults,
  type ResearcherSortValue,
} from '@/lib/profiles';
import { SITE_NAME } from '@/lib/brand';

interface Props {
  initial: ResearcherSearchResults;
}

const defaultSort = researcherSortOptions[0];

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const ResearchersPage: NextPage<Props> = ({ initial }) => {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState(defaultSort);
  const [showSort, setShowSort] = useState(false);
  const [profiles, setProfiles] = useState<ResearcherCardData[]>(initial.data);
  const [totalFound, setTotalFound] = useState(initial.totalFound);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 300);
  const requestId = useRef(0);
  const isFirst = useRef(true);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const fetchPage = useCallback(
    async (nextPage: number, append: boolean, searchValue: string, sortValue: ResearcherSortValue) => {
      const id = ++requestId.current;
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ page: String(nextPage), sort: sortValue });
        if (searchValue.trim()) params.set('search', searchValue.trim());
        const res = await fetch(`/api/researchers?${params.toString()}`);
        if (!res.ok) throw new Error('failed');
        const payload = (await res.json()) as ResearcherSearchResults;
        if (id !== requestId.current) return;

        setProfiles((current) => (append ? [...current, ...payload.data] : payload.data));
        setTotalFound(payload.totalFound);
        setHasMore(payload.hasMore);
        setPage(nextPage);
      } catch {
        if (id === requestId.current) setError('Unable to load researchers right now.');
      } finally {
        if (id === requestId.current) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [],
  );

  // Re-query when search / sort changes (skip the very first render — SSR data).
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    void fetchPage(1, false, debouncedSearch, sort.value);
  }, [debouncedSearch, sort.value, fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return;
    void fetchPage(page + 1, true, debouncedSearch, sort.value);
  }, [debouncedSearch, fetchPage, hasMore, isLoading, isLoadingMore, page, sort.value]);

  useEffect(() => {
    // Infinite scroll is a signed-in convenience; anonymous users get the
    // gated "Load more" button instead (so scrolling never triggers the modal).
    if (!loadMoreRef.current || !hasMore || !user) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' },
    );
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadMore, user]);

  const countLabel = useMemo(
    () => `${totalFound.toLocaleString()} researcher${totalFound === 1 ? '' : 's'}`,
    [totalFound],
  );

  return (
    <>
      <Head>
        <title>{`Researchers | ${SITE_NAME}`}</title>
        <meta
          name="description"
          content="Discover researchers, their publications and projects. Find people who share your interests."
        />
      </Head>
      <div className="min-h-screen bg-white text-[#171717]">
        <Header />
        <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-8 sm:px-6 lg:px-10">
          <h1
            className="text-[32px] font-bold tracking-[-1px] text-black/92 sm:text-4xl"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Researchers
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] text-black/54">
            Discover people sharing their research, publications, and projects — and find others
            with similar interests.
          </p>

          {/* Search */}
          <div className="mt-6 border-b border-[rgba(23,23,23,0.12)] pb-6">
            <div className="flex w-full items-center gap-3 rounded-full border border-black/5 bg-neutral-100 px-4 py-3 focus-within:ring-1 focus-within:ring-black/20 xl:max-w-xl">
              <Search className="h-5 w-5 text-neutral-900" />
              <input
                className="flex-1 bg-transparent text-base leading-5 text-neutral-900 outline-none placeholder:text-[rgba(23,23,23,0.5)]"
                onFocus={(e) => {
                  if (!requireAuth('search researchers')) e.currentTarget.blur();
                }}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search researchers, interests, or locations"
                type="text"
                value={search}
              />
            </div>
          </div>

          {/* Count + sort */}
          <div className="flex w-full flex-wrap items-center justify-between gap-3 py-6 text-sm text-neutral-900">
            <p className="text-[14px] leading-[20px] text-black/70">{countLabel}</p>
            <div className="relative flex items-center gap-3">
              <button
                className="flex items-center justify-center gap-1 overflow-hidden rounded-full px-[14px] py-[12px] text-[14px] font-medium leading-[20px] text-black/70 transition-colors hover:bg-black/5"
                onClick={() => {
                  if (!requireAuth('sort researchers')) return;
                  setShowSort((v) => !v);
                }}
                type="button"
              >
                <SlidersHorizontal className="h-4 w-4 text-black/70" />
                <span className="whitespace-nowrap">{sort.label}</span>
                <ChevronDown className="h-4 w-4 text-black/70" />
              </button>
              {showSort ? (
                <SortDropdown
                  onClose={() => setShowSort(false)}
                  onSelect={(option) => {
                    setSort(option);
                    setShowSort(false);
                  }}
                  options={researcherSortOptions}
                  selected={sort}
                />
              ) : null}
            </div>
          </div>

          {/* Grid */}
          <div className="relative flex w-full flex-col gap-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ResearcherCardSkeleton key={i} />
                ))}
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="rounded-[12px] border border-[rgba(23,23,23,0.09)] bg-white px-6 py-8 text-center text-[16px] text-[#525252]">
                <p>{error}</p>
                <button
                  className="mt-4 rounded-full border border-black/10 bg-zinc-100 px-5 py-2 text-[14px] font-medium text-[#171717] transition-colors hover:bg-zinc-200"
                  onClick={() => void fetchPage(1, false, debouncedSearch, sort.value)}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : null}

            {!isLoading && !error && profiles.length === 0 ? (
              <div className="rounded-[12px] border border-[rgba(23,23,23,0.09)] bg-white px-6 py-8 text-center text-[16px] text-[#525252]">
                No researchers matched your search.
              </div>
            ) : null}

            {!isLoading && profiles.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((writer) => (
                  <ResearcherCard key={writer.user_id} writer={writer} />
                ))}
              </div>
            ) : null}

            {isLoadingMore ? (
              <div className="flex items-center justify-center gap-3 py-6 text-[14px] text-[#525252]">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more…</span>
              </div>
            ) : null}

            {hasMore && !isLoadingMore && !error ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div ref={loadMoreRef} className="h-1 w-full" />
                <button
                  className="rounded-full border border-black/10 bg-zinc-100 px-5 py-2 text-[14px] font-medium text-[#171717] transition-colors hover:bg-zinc-200"
                  onClick={() => {
                    if (requireAuth('browse more researchers')) loadMore();
                  }}
                  type="button"
                >
                  Load more
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const { listResearchers } = await import('@/lib/server/profiles');
  try {
    const initial = await listResearchers({
      sort: 'complete',
      page: 1,
      pageSize: RESEARCHERS_PAGE_SIZE,
    });
    return { props: { initial } };
  } catch (error) {
    console.error('[researchers] SSR failed', error);
    return { props: { initial: { data: [], totalFound: 0, hasMore: false, page: 1 } } };
  }
};

export default ResearchersPage;
