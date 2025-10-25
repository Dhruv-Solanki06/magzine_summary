'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import {
  readFavoriteAuthors,
  writeFavoriteAuthors,
  type StoredFavoriteAuthor,
  FAVORITE_AUTHORS_STORAGE_KEY,
} from '@/lib/storage';

const FavoritesPage: React.FC = () => {
  const [favoriteAuthors, setFavoriteAuthors] = useState<StoredFavoriteAuthor[]>([]);

  const loadFavorites = useCallback(() => {
    setFavoriteAuthors(readFavoriteAuthors());
  }, []);

  useEffect(() => {
    loadFavorites();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === FAVORITE_AUTHORS_STORAGE_KEY) {
        loadFavorites();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadFavorites]);

  const groupedByInitial = useMemo(() => {
    const map = new Map<string, StoredFavoriteAuthor[]>();
    favoriteAuthors.forEach((author) => {
      const initial = author.name?.charAt(0)?.toUpperCase() ?? '#';
      if (!map.has(initial)) {
        map.set(initial, []);
      }
      map.get(initial)!.push(author);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([initial, entries]) => ({
        initial,
        entries: entries.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [favoriteAuthors]);

  const removeAuthor = (id: number) => {
    const updated = favoriteAuthors.filter((author) => author.id !== id);
    setFavoriteAuthors(updated);
    writeFavoriteAuthors(updated);
  };

  return (
    <>
      <Head>
        <title>Favorite Authors | Magazine Summary Portal</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:py-16">
          <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <Heart className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  Favorite Authors
                </h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  Authors you have marked as favourites appear here for quick reference.
                </p>
              </div>
            </div>

            {favoriteAuthors.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
                You have not favourited any authors yet. When you mark authors as favourites from a
                summary page, they will be listed here.
              </div>
            ) : (
              <div className="space-y-6">
                {groupedByInitial.map(({ initial, entries }) => (
                  <div key={initial} className="space-y-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {initial}
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {entries.map((author) => (
                        <div
                          key={author.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition hover:shadow-md"
                        >
                          <span>{author.name}</span>
                          <button
                            type="button"
                            onClick={() => removeAuthor(author.id)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-600 sm:self-start"
            >
              ← Back to Browse
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default FavoritesPage;
