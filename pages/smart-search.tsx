import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import Header from '@/components/common/Header';
import SmartSearchResultCard from '@/components/search/SmartSearchResultCard';
import type { SmartSearchResult } from '@/types';
import { smartSearch } from '@/lib/api';

const SmartSearchPage: NextPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const lastExecutedQueryRef = useRef<string>('');

  const performSearch = useCallback(async (input: string) => {
    const raw = input ?? '';
    const trimmed = raw.trim();

    if (!trimmed) {
      setIsLoading(false);
      setResults([]);
      setError(null);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsLoading(true);
    setError(null);

    const { results: fetchedResults, error: fetchError } = await smartSearch(trimmed, 20);

    if (fetchError) {
      setError(fetchError);
      setResults([]);
    } else {
      setResults(fetchedResults);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const qParam = typeof router.query.q === 'string' ? router.query.q : '';
    if (!qParam) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
      setError(null);
      lastExecutedQueryRef.current = '';
      return;
    }

    if (lastExecutedQueryRef.current === qParam) {
      setQuery(qParam);
      return;
    }

    setQuery(qParam);
    lastExecutedQueryRef.current = qParam;
    void performSearch(qParam);
  }, [router.isReady, router.query.q, performSearch]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setError(null);
      setHasSearched(false);
      void router.replace(router.pathname, undefined, { shallow: true, scroll: false });
      return;
    }

    void router.replace(
      {
        pathname: router.pathname,
        query: { q: trimmed },
      },
      undefined,
      { shallow: true, scroll: false },
    );

    lastExecutedQueryRef.current = trimmed;
    void performSearch(trimmed);
  }, [query, performSearch, router]);

  return (
    <>
      <Head>
        <title>Smart Search | Magazine Summary Portal</title>
        <meta
          name="description"
          content="Hybrid smart search combining vector similarity, BM25, and semantic boosts for magazine summaries."
        />
      </Head>
      <Header />
      <main className="bg-gray-100 min-h-screen pb-16">
        <div className="container mx-auto px-6 py-10">
          <section className="max-w-3xl mx-auto text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Smart Search</h1>
            <p className="text-gray-600">
              Surface the most relevant magazine summaries by blending semantic vectors, keyword ranking,
              and contextual boosts tailored for titles, authors, and proper nouns.
            </p>
          </section>

          <section className="max-w-3xl mx-auto mb-12">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (!event.target.value) {
                    setError(null);
                    setResults([]);
                    setHasSearched(false);
                  }
                }}
                placeholder="Try “Jain philosophy history” or “Sethia modern Jainism”"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 bg-white text-gray-900"
                aria-label="Smart search query"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Searching…' : 'Search'}
              </button>
            </form>
            {error && (
              <p className="text-sm text-red-600 mt-3" role="alert">
                {error}
              </p>
            )}
            {!error && hasSearched && !isLoading && results.length === 0 && (
              <p className="text-sm text-gray-500 mt-3">No matches found. Try refining your query.</p>
            )}
          </section>

          <section className="grid gap-6 max-w-5xl mx-auto">
            {isLoading && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-600">
                Running hybrid ranking… this may take a moment.
              </div>
            )}
            {!isLoading &&
              results.map((result, index) => (
                <SmartSearchResultCard key={result.id} result={result} index={index} />
              ))}
          </section>
        </div>
      </main>
    </>
  );
};

export default SmartSearchPage;
