'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { Bookmark } from 'lucide-react';
import {
  readBookmarks,
  writeBookmarks,
  type StoredBookmark,
  BOOKMARK_STORAGE_KEY,
} from '@/lib/storage';

const BookmarksPage: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([]);

  const loadBookmarks = useCallback(() => {
    setBookmarks(readBookmarks());
  }, []);

  useEffect(() => {
    loadBookmarks();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === BOOKMARK_STORAGE_KEY) {
        loadBookmarks();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [loadBookmarks]);

  const removeBookmark = (id: number) => {
    const updated = bookmarks.filter((bookmark) => bookmark.id !== id);
    setBookmarks(updated);
    writeBookmarks(updated);
  };

  return (
    <>
      <Head>
        <title>Bookmarks | Magazine Summary Portal</title>
      </Head>
      <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6 lg:py-16">
          <div className="flex flex-col gap-3 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Bookmark className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Bookmarks</h1>
                <p className="text-sm text-slate-600 sm:text-base">
                  Your saved summaries are collected here for quick access.
                </p>
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
                You have not bookmarked any summaries yet. Browse the library and tap the bookmark
                button to collect your favourites here.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/records/${bookmark.id}`}
                        className="text-base font-semibold text-blue-600 hover:text-blue-700 sm:text-lg"
                      >
                        {bookmark.title}
                      </Link>
                      {bookmark.magazine && (
                        <p className="text-sm text-slate-500">{bookmark.magazine}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/records/${bookmark.id}`}
                        className="inline-flex items-center justify-center rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
                      >
                        View Summary
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeBookmark(bookmark.id)}
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      >
                        Remove
                      </button>
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

export default BookmarksPage;
