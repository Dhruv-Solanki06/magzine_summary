// pages/records/[id].tsx — single article detail (SSR)
import React, { useCallback, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ArrowLeft, BookOpen } from 'lucide-react';

import Header from '@/components/common/Header';
import MagazineDetailsCard from '@/components/records/MagazineDetailsCard';
import RecordContentCard from '@/components/records/RecordContentCard';
import IssueNavigator from '@/components/records/IssueNavigator';
import PdfViewerCard from '@/components/records/PdfViewerCard';
import RecordInsightPanel from '@/components/records/RecordInsightPanel';
import ReportContentButton from '@/components/records/ReportContentButton';
import ArticleGrid from '@/components/browse/ArticleGrid';
import type { RecordWithDetails } from '@/types';
import type { VolumeIssueNavItem } from '@/lib/server/records';
import { magazineName } from '@/lib/format';
import { useBookmarks, useFavoriteAuthors } from '@/lib/useLibrary';
import { useArticleReadingTimer } from '@/lib/useReadingTracker';
import { SITE_NAME } from '@/lib/brand';

interface RecordDetailProps {
  record: RecordWithDetails;
  sameIssue: RecordWithDetails[];
  volumeIssues: VolumeIssueNavItem[];
  related: RecordWithDetails[];
}

const RecordDetailPage: NextPage<RecordDetailProps> = ({
  record,
  sameIssue,
  volumeIssues,
  related,
}) => {
  const router = useRouter();
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();
  const { isFavorite, toggle: toggleFavorite } = useFavoriteAuthors();

  // Track reading time / opens / completion for signed-in users.
  useArticleReadingTimer(
    record.id,
    record.title_name || 'Untitled article',
    magazineName(record),
  );

  const authorEntries = useMemo(
    () =>
      (record.record_authors ?? [])
        .map((ra) => ({ id: ra.authors?.id ?? ra.author_id, name: ra.authors?.name }))
        .filter((a): a is { id: number; name: string } => Boolean(a.id && a.name)),
    [record.record_authors],
  );

  const authorsFavorited =
    authorEntries.length > 0 && authorEntries.every((a) => isFavorite(a.id));

  const handleFavoriteAuthors = useCallback(() => {
    if (authorEntries.length === 0) return;
    // Toggle all as a group based on current state.
    authorEntries.forEach((a) => {
      const currentlyFav = isFavorite(a.id);
      if (authorsFavorited && currentlyFav) toggleFavorite(a);
      else if (!authorsFavorited && !currentlyFav) toggleFavorite(a);
    });
  }, [authorEntries, authorsFavorited, isFavorite, toggleFavorite]);

  const bookmarked = isBookmarked(record.id);

  return (
    <>
      <Head>
        <title>{`${record.title_name || 'Article'} | ${SITE_NAME}`}</title>
        <meta name="description" content={(record.summary || '').slice(0, 160)} />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />

        <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6 sm:pt-6 lg:px-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-black/58 transition hover:border-black/20 hover:text-black/86"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <ReportContentButton
                recordId={record.id}
                recordTitle={record.title_name || 'Untitled article'}
              />
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.04] px-3 text-sm font-medium text-black/58 transition hover:bg-black/[0.07] hover:text-black/86"
              >
                <BookOpen className="h-4 w-4" />
                Browse articles
              </Link>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
            <div className="min-w-0 space-y-5">
              <RecordContentCard
                record={record}
                onTagClick={(tagId) => router.push(`/?tags=${tagId}`)}
                isBookmarked={bookmarked}
                onBookmarkToggle={() =>
                  toggleBookmark({
                    id: record.id,
                    title: record.title_name || 'Untitled article',
                    magazine: magazineName(record),
                  })
                }
                areAuthorsFavorited={authorsFavorited}
                onFavoriteAuthorsToggle={handleFavoriteAuthors}
              />

              <RecordInsightPanel record={record} />

              <IssueNavigator
                record={record}
                sameIssue={sameIssue}
                volumeIssues={volumeIssues}
              />

              <PdfViewerCard record={record} />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-24">
              <MagazineDetailsCard record={record} />
            </aside>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <section className="mt-10 border-t border-black/[0.06] pt-8">
              <div className="mb-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
                  Continue reading
                </p>
                <h2
                  className="mt-1 text-[21px] font-bold tracking-[-0.3px] text-black/92"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Related articles
                </h2>
              </div>
              <ArticleGrid records={related} onTagClick={(t) => router.push(`/?tags=${t}`)} />
            </section>
          )}
        </main>
      </div>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<RecordDetailProps> = async ({ params }) => {
  const {
    fetchRecordWithDetailsById,
    fetchRecordsFromSameIssue,
    fetchRecordsWithFilters,
    fetchVolumeIssueSequence,
  } = await import('@/lib/server/records');

  const id = Number(Array.isArray(params?.id) ? params?.id[0] : params?.id);
  if (!Number.isFinite(id)) return { notFound: true };

  const record = await fetchRecordWithDetailsById(id);
  if (!record) return { notFound: true };

  const [sameIssueAll, volumeIssues, relatedResponse] = await Promise.all([
    fetchRecordsFromSameIssue(record),
    fetchVolumeIssueSequence(record),
    (() => {
      const firstTag = record.record_tags?.[0]?.tags?.id;
      const filters = firstTag
        ? { tags: [firstTag] }
        : { magazineId: record.magazine_id ?? undefined };
      return fetchRecordsWithFilters({ page: 1, pageSize: 9, filters, sort: 'random' });
    })(),
  ]);

  const sameIssue = sameIssueAll.some((r) => r.id === id)
    ? sameIssueAll
    : [record, ...sameIssueAll];
  const related = relatedResponse.data.filter((r) => r.id !== id).slice(0, 6);

  return { props: { record, sameIssue, volumeIssues, related } };
};

export default RecordDetailPage;
