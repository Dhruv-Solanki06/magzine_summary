// pages/404.tsx — served with a real 404 status for unknown URLs and for any
// getServerSideProps that returns `notFound`. Links back into the archive so a
// dead inbound link still leads somewhere useful, for readers and crawlers.
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import Header from '@/components/common/Header';
import { SITE_NAME } from '@/lib/brand';

const LINKS = [
  { href: '/', label: 'Browse articles' },
  { href: '/magazines', label: 'Publications' },
  { href: '/subjects', label: 'Subjects' },
  { href: '/researchers', label: 'Researchers' },
];

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title key="title">{`Page not found | ${SITE_NAME}`}</title>
        <meta name="robots" content="noindex, follow" key="robots" />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto max-w-2xl px-5 pt-20 pb-24 sm:px-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-black/45">404</p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.7px] text-black/92">
            This page could not be found
          </h1>
          <p className="mt-3 text-black/58">
            The article, journal or profile you are looking for may have moved or no longer exists.
          </p>
          <nav aria-label="Archive sections" className="mt-8 flex flex-wrap gap-2">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-9 items-center rounded-full bg-black/[0.04] px-4 text-sm font-medium text-black/70 transition hover:bg-black/[0.07] hover:text-black/90"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </main>
      </div>
    </>
  );
}
