'use client';

import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { LogIn, Star, Trash2, UserPlus } from 'lucide-react';

import Header from '@/components/common/Header';
import { useFavoriteAuthors } from '@/lib/useLibrary';
import { useAuth } from '@/components/auth/AuthProvider';
import { SITE_NAME } from '@/lib/brand';

export default function FavoritesPage() {
  const { favorites, remove, loading } = useFavoriteAuthors();
  const { user } = useAuth();

  return (
    <>
      <Head>
        <title>{`Favorite authors | ${SITE_NAME}`}</title>
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto max-w-[900px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <h1
            className="text-[28px] font-bold tracking-[-0.4px] text-black/92"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Favorite authors
          </h1>

          {!user ? (
            <div className="mt-8 flex flex-col items-center rounded-[14px] border border-dashed border-black/10 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                <Star className="h-6 w-6 text-black/40" />
              </div>
              <h3 className="text-base font-semibold text-black/80">
                Log in to view the authors you follow
              </h3>
              <p className="mt-1 max-w-sm text-sm text-black/50">
                Followed authors are saved to your account and synced across your devices.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link
                  href="/login?next=/favorites"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black/85"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Link>
                <Link
                  href="/signup?next=/favorites"
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
                {favorites.length} followed {favorites.length === 1 ? 'author' : 'authors'}.
              </p>

              {favorites.length === 0 ? (
                <div className="mt-10 flex flex-col items-center rounded-[14px] border border-dashed border-black/10 py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
                    <Star className="h-6 w-6 text-black/40" />
                  </div>
                  <h3 className="text-base font-semibold text-black/80">
                    {loading ? 'Loading followed authors…' : 'No favorite authors yet'}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-black/50">
                    Follow authors from any article to keep track of their work here.
                  </p>
                  <Link
                    href="/"
                    className="mt-4 rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
                  >
                    Browse articles
                  </Link>
                </div>
              ) : (
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {favorites.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-4 py-3 transition hover:border-black/15"
                    >
                      <Link href={`/?authors=${a.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-black/85">
                          {a.name}
                        </span>
                        <span className="block text-[13px] text-black/45">View articles</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        aria-label="Remove favorite"
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
