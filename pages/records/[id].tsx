import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { GetServerSideProps, NextPage } from 'next';
import { useRouter } from 'next/router';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/common/Header';
import MagazineDetailsCard from '@/components/records/MagazineDetailsCard';
import RecordContentCard from '@/components/records/RecordContentCard';
import RelatedSummaries from '@/components/records/RelatedSummariesCard';
import IssueContentsSection from '@/components/records/IssueContentsSection';
import {
  fetchRecordById,
  fetchRecordWithDetailsById,
  fetchRecordsFromSameIssue,
  fetchRecordsWithFilters,
  type DbRecord,
} from '@/lib/server/records';
import { fetchPexelsImage } from '@/lib/pexels';
import {
  readBookmarks,
  writeBookmarks,
  readFavoriteAuthors,
  writeFavoriteAuthors,
  type StoredBookmark,
  type StoredFavoriteAuthor,
} from '@/lib/storage';
import type { RecordWithDetails } from '@/types';

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x500?text=No+Image';
const RELATED_PAGE_SIZE = 18;

const imageCache = new Map<string, string>();

async function getCachedPexelsImage(query: string): Promise<string> {
  if (imageCache.has(query)) {
    return imageCache.get(query)!;
  }
  const img = await fetchPexelsImage(query);
  if (img) {
    imageCache.set(query, img);
  }
  return img ?? FALLBACK_IMAGE;
}

interface RecordDetailPageProps {
  record: RecordWithDetails;
  relatedRecords: RecordWithDetails[];
  sameIssueRecords: DbRecord[];
}

const RecordDetailPage: NextPage<RecordDetailPageProps> = ({
  record,
  relatedRecords,
  sameIssueRecords,
}) => {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE);
  const [relatedImageUrls, setRelatedImageUrls] = useState<Map<number, string>>(new Map());
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<number[]>([]);

  useEffect(() => {
    const loadImages = async () => {
      const tagNames = record.title_name;
      const mainQuery = tagNames || record.name || 'magazine cover';
      const mainImage = await getCachedPexelsImage(mainQuery);
      setImageUrl(mainImage);

      if (relatedRecords.length === 0) {
        setRelatedImageUrls(new Map());
        return;
      }

      const map = new Map<number, string>();
      const limitedPool = relatedRecords.slice(0, 12);
      const resolved = await Promise.all(
        limitedPool.map(async (item) => {
          const query = item.title_name || item.name || 'magazine cover';
          const img = await getCachedPexelsImage(query);
          return [item.id, img] as const;
        }),
      );
      resolved.forEach(([itemId, img]) => {
        map.set(itemId, img ?? FALLBACK_IMAGE);
      });
      setRelatedImageUrls(map);
    };

    void loadImages();
  }, [record, relatedRecords]);

  useEffect(() => {
    const storedBookmarks = readBookmarks();
    setIsBookmarked(storedBookmarks.some((entry) => entry.id === record.id));

    const storedFavorites = readFavoriteAuthors();
    setFavoriteAuthorIds(storedFavorites.map((entry) => entry.id));
  }, [record]);

  const handleBookmarkToggle = useCallback(() => {
    const bookmarks = readBookmarks();
    const exists = bookmarks.some((entry) => entry.id === record.id);
    let updated: StoredBookmark[];
    if (exists) {
      updated = bookmarks.filter((entry) => entry.id !== record.id);
    } else {
      updated = [
        ...bookmarks,
        {
          id: record.id,
          title: record.title_name || record.name || 'Untitled',
          magazine: record.name,
        },
      ];
    }
    writeBookmarks(updated);
    setIsBookmarked(!exists);
  }, [record]);

  const handleFavoriteAuthorsToggle = useCallback(() => {
    if (!record.record_authors || record.record_authors.length === 0) {
      return;
    }
    const storedFavorites = readFavoriteAuthors();
    const authorEntries = record.record_authors
      .map((relation) => ({
        id: relation.authors?.id ?? relation.author_id,
        name: relation.authors?.name ?? `Author ${relation.author_id}`,
      }))
      .filter((entry): entry is StoredFavoriteAuthor =>
        typeof entry.id === 'number' && typeof entry.name === 'string',
      );
    const authorIds = authorEntries.map((entry) => entry.id);
    const allStored = authorIds.every((authorId) =>
      storedFavorites.some((entry) => entry.id === authorId),
    );
    let updated: StoredFavoriteAuthor[];
    if (allStored) {
      updated = storedFavorites.filter((entry) => !authorIds.includes(entry.id));
    } else {
      updated = [...storedFavorites];
      authorEntries.forEach((entry) => {
        if (!updated.some((existing) => existing.id === entry.id)) {
          updated.push(entry);
        }
      });
    }
    writeFavoriteAuthors(updated);
    setFavoriteAuthorIds(updated.map((entry) => entry.id));
  }, [record]);

  const areAuthorsFavorited = useMemo(() => {
    if (!record.record_authors || record.record_authors.length === 0) return false;
    const ids = record.record_authors
      .map((relation) => relation.authors?.id ?? relation.author_id)
      .filter((id): id is number => typeof id === 'number');
    if (ids.length === 0) return false;
    return ids.every((idValue) => favoriteAuthorIds.includes(idValue));
  }, [record, favoriteAuthorIds]);

  const relatedImageFor = useCallback(
    (item: RecordWithDetails) => relatedImageUrls.get(item.id) ?? FALLBACK_IMAGE,
    [relatedImageUrls],
  );

  const handleSearch = (query: string) => {
    router.push(`/browse?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <Header onSearch={handleSearch} onFiltersClick={() => undefined} showSearch={false} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex w-fit items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Browse
        </button>

        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <MagazineDetailsCard record={record} imageUrl={imageUrl} />
          </div>
          <div className="lg:col-span-3">
            <RecordContentCard
              record={record}
              onTagClick={(tagId) => router.push(`/browse?tag=${tagId}`)}
              isBookmarked={isBookmarked}
              onBookmarkToggle={handleBookmarkToggle}
              areAuthorsFavorited={areAuthorsFavorited}
              onFavoriteAuthorsToggle={handleFavoriteAuthorsToggle}
            />
          </div>
        </div>

        <IssueContentsSection
          magazineName={record.name}
          volumeLabel={record.volume ? `Vol. ${record.volume}` : undefined}
          numberLabel={record.number ? `No. ${record.number}` : undefined}
          timestampLabel={record.timestamp ?? undefined}
          currentRecordId={record.id}
          records={sameIssueRecords.map((r) => ({
            id: r.id,
            title: r.title_name || '(Untitled)',
            authorsLabel: r.authors || undefined,
            pageLabel: r.page_numbers || undefined,
          }))}
        />

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg ring-1 ring-slate-100 sm:p-8">
          <RelatedSummaries
            current={record}
            allRecords={relatedRecords}
            getImageUrl={relatedImageFor}
            limit={6}
          />
        </div>
      </main>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps<RecordDetailPageProps> = async ({ params }) => {
  const idParam = params?.id;
  const id = Number(Array.isArray(idParam) ? idParam[0] : idParam);

  if (!Number.isFinite(id)) {
    return { notFound: true };
  }

  const baseRecord = await fetchRecordById(id);
  if (!baseRecord) {
    return { notFound: true };
  }

  const record =
    (await fetchRecordWithDetailsById(id)) ??
    ({
      ...baseRecord,
      record_authors: [],
      record_tags: [],
      summaries: [],
      conclusions: [],
    } as RecordWithDetails);

  const sameIssueRecords = await fetchRecordsFromSameIssue(id);

  const primaryTagIds =
    record.record_tags
      ?.map((relation) => relation.tag_id ?? relation.tags?.id)
      .filter((value): value is number => typeof value === 'number') ?? [];

  const baseResponse =
    primaryTagIds.length > 0
      ? await fetchRecordsWithFilters({
          page: 1,
          pageSize: RELATED_PAGE_SIZE,
          filters: { tags: [primaryTagIds[0]] },
        })
      : await fetchRecordsWithFilters({
          page: 1,
          pageSize: RELATED_PAGE_SIZE,
          filters: { magazine: record.name },
        });

  let pool = (baseResponse?.data ?? []).filter((item) => item.id !== id);

  if (pool.length < 6) {
    const fallbackResponse = await fetchRecordsWithFilters({
      page: 1,
      pageSize: RELATED_PAGE_SIZE,
    });
    const fallbackData = (fallbackResponse?.data ?? []).filter((item) => item.id !== id);
    const seen = new Set(pool.map((item) => item.id));
    fallbackData.forEach((item) => {
      if (!seen.has(item.id)) {
        pool.push(item);
        seen.add(item.id);
      }
    });
  }

  return {
    props: {
      record,
      relatedRecords: pool,
      sameIssueRecords,
    },
  };
};

export default RecordDetailPage;
