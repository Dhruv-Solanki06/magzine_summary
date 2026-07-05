'use client';

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Bookmark, LogIn, Trash2, UserPlus } from 'lucide-react';

import Header from '@/components/common/Header';
import { useBookmarks } from '@/lib/useLibrary';
import { useAuth } from '@/components/auth/AuthProvider';
import { SITE_NAME } from '@/lib/brand';

export default function BookmarksPage() {
  const { bookmarks, remove, loading } = useBookmarks();
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>{`Bookmarks | ${SITE_NAME}`}</title>
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto max-w-[900px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <h1
            className="text-[28px] font-bold tracking-[-0.4px] text-black/92"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Bookmarks
          </h1>

          {!user ? (
            <div className="mt-8 flex flex-col items-center rounded-[14px] border border-dashed border-black/10 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Bookmark className="h-6 w-6 text-black/40" />
              </div>
              <h3 className="text-base font-semibold text-black/80">Log in to view your bookmarks</h3>
              <p className="mt-1 max-w-sm text-sm text-black/50">
                Bookmarks are saved to your account, so you can pick up where you left off on any
                device.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href="/login?next=/bookmarks"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black/85"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Link>
                <Link
                  href="/signup?next=/bookmarks"
                  className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-medium text-black/75 hover:border-black/20 hover:text-black/90"
                >
                  <UserPlus className="h-4 w-4" />
                  Create an account
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-[15px] text-black/54">
                {bookmarks.length} saved {bookmarks.length === 1 ? 'article' : 'articles'}.
              </p>

              {bookmarks.length === 0 ? (
                <div className="mt-10 flex flex-col items-center rounded-[14px] border border-dashed border-black/10 py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                    <Bookmark className="h-6 w-6 text-black/40" />
                  </div>
                  <h3 className="text-base font-semibold text-black/80">
                    {loading ? 'Loading your bookmarks…' : 'No bookmarks yet'}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-black/50">
                    Tap the bookmark icon on any article to save it here for later.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
                  >
                    Browse articles
                  </Link>
                </div>
              ) : (
                <ul className="mt-6 space-y-2">
                  {bookmarks.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-4 py-3 transition hover:border-black/15"
                    >
                      <Link href={`/records/${b.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-black/85">
                          {b.title}
                        </span>
                        {b.magazine && (
                          <span className="block truncate text-[13px] text-black/45">
                            {b.magazine}
                          </span>
                        )}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(b.id)}
                        aria-label="Remove bookmark"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}
