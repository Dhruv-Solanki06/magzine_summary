// pages/magazines/index.tsx — browse the collection by magazine
import React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, NextPage } from 'next';

import Header from '@/components/common/Header';
import MagazineCard from '@/components/browse/MagazineCard';
import type { MagazineWithStats } from '@/types';
import { formatCount } from '@/lib/format';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/brand';

interface MagazinesPageProps {
  magazines: MagazineWithStats[];
  totalArticles: number;
}

const MagazinesPage: NextPage<MagazinesPageProps> = ({ magazines, totalArticles }) => {
  return (
    <>
      <Head>
        <title>{`Publications | ${SITE_NAME}`}</title>
        <meta
          name="description"
          content={SITE_DESCRIPTION}
        />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        <main className="w-full px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          <div className="max-w-2xl">
            <h1
              className="text-[30px] font-bold leading-[1.15] tracking-[-0.5px] text-black/92 sm:text-[36px]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Publications
            </h1>
            <p className="mt-2 text-[15px] leading-[1.55] text-black/54">
              {magazines.length} publications · {formatCount(totalArticles)} archived
              articles. Open a title to browse its issues and cultural articles.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {magazines.map((m) => (
              <MagazineCard key={m.id} magazine={m} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<MagazinesPageProps> = async () => {
  const { fetchAllMagazinesWithStats } = await import('@/lib/server/records');
  const magazines = await fetchAllMagazinesWithStats();
  const totalArticles = magazines.reduce((sum, m) => sum + m.recordCount, 0);
  return { props: { magazines, totalArticles } };
};

export default MagazinesPage;
