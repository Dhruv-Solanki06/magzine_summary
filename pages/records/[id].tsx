'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/components/common/Header';
import MagazineDetailsCard from '@/components/records/MagazineDetailsCard';
import RecordContentCard from '@/components/records/RecordContentCard';
import RelatedSummaries from '@/components/records/RelatedSummariesCard';
import { fetchRecordById, fetchRecords } from '@/lib/api';
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

export default function RecordDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [record, setRecord] = useState<RecordWithDetails | null>(null);
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE);
  const [candidateRecords, setCandidateRecords] = useState<RecordWithDetails[]>([]);
  const [relatedImageUrls, setRelatedImageUrls] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [favoriteAuthorIds, setFavoriteAuthorIds] = useState<number[]>([]);

  const numericId = useMemo(() => {
    if (!id) return null;
    const value = Array.isArray(id) ? id[0] : id;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id]);

  const loadRecord = useCallback(async () => {
    if (!numericId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recordData = await fetchRecordById(numericId);
      if (!recordData) {
        setError('Record not found');
        setRecord(null);
        return;
      }

      setRecord(recordData);

      // const mainQuery = recordData.conclusion || recordData.summary || recordData.title_name || recordData.name || 'magazine cover';
      // Build query from record tags for more relevant image results
      // const tagNames = (recordData.record_tags?.[0]?.tags?.name + ' ' + recordData.title_name ||  recordData.record_tags?.[0]?.tags?.name || recordData.title_name || 'magazine cover');
      // const tagNames = recordData.record_tags?.[0]?.tags?.name;
      const tagNames = recordData.title_name;
      const mainQuery = tagNames;
      const mainImage = await getCachedPexelsImage(mainQuery);
      setImageUrl(mainImage);

      const primaryTagIds =
        recordData.record_tags?.map((relation) => relation.tag_id ?? relation.tags.id) ?? [];

      const baseResponse =
        primaryTagIds.length > 0
          ? await fetchRecords(1, RELATED_PAGE_SIZE, { tags: [primaryTagIds[0]] })
          : await fetchRecords(1, RELATED_PAGE_SIZE, { magazine: recordData.name });

      const pool = (baseResponse?.data ?? []).filter((item) => item.id !== numericId);

      if (pool.length < 6) {
        const fallbackResponse = await fetchRecords(1, RELATED_PAGE_SIZE);
        const fallbackData = (fallbackResponse?.data ?? []).filter((item) => item.id !== numericId);
        const seen = new Set(pool.map((item) => item.id));
        fallbackData.forEach((item) => {
          if (!seen.has(item.id)) {
            pool.push(item);
            seen.add(item.id);
          }
        });
      }

      setCandidateRecords([...pool]);

      if (pool.length > 0) {
        const map = new Map<number, string>();
        const limitedPool = pool.slice(0, 12);
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
      } else {
        setRelatedImageUrls(new Map());
      }
    } catch (err) {
      console.error('Error loading record:', err);
      setError('Failed to load record. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [numericId]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (!record) {
      return;
    }
    const storedBookmarks = readBookmarks();
    setIsBookmarked(storedBookmarks.some((entry) => entry.id === record.id));

    const storedFavorites = readFavoriteAuthors();
    setFavoriteAuthorIds(storedFavorites.map((entry) => entry.id));
  }, [record]);

  const handleBookmarkToggle = useCallback(() => {
    if (!record) return;
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
    if (!record || !record.record_authors || record.record_authors.length === 0) {
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
    if (!record || !record.record_authors || record.record_authors.length === 0) return false;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <Header onSearch={handleSearch} onFiltersClick={() => undefined} showSearch={false} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-600">Loading record...</span>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <Header onSearch={handleSearch} onFiltersClick={() => undefined} showSearch={false} />
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-16 text-center">
          <div className="rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-200">
            <h2 className="text-2xl font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-2 text-slate-600">
              {error || 'We could not find that summary. Please try again later.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 inline-flex items-center justify-center rounded-full bg-blue-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg ring-1 ring-slate-100 sm:p-8">
          <RelatedSummaries
            current={record}
            allRecords={candidateRecords}
            getImageUrl={relatedImageFor}
            limit={6}
          />
        </div>
      </main>
    </div>
  );
}
