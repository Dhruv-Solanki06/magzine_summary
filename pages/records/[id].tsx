'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Loader2, ArrowLeft, Bookmark } from 'lucide-react';
import { RecordWithDetails } from '@/types';
import { fetchRecordById, fetchRecords } from '@/lib/api';
import { fetchPexelsImage } from '@/lib/pexels';
import Header from '@/components/common/Header';
import RelatedSummaries from '@/components/records/RelatedSummariesCard';
import TagPill from '@/components/browse/TagPill';

const FALLBACK_IMAGE = 'https://via.placeholder.com/400x500?text=No+Image';
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
  const [relatedRecords, setRelatedRecords] = useState<RecordWithDetails[]>([]);
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE);
  const [relatedImageUrls, setRelatedImageUrls] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecord = useCallback(async () => {
    if (!id) {
      return;
    }

    const normalizedId = Array.isArray(id) ? id[0] : id;
    const recordId = Number(normalizedId);

    if (Number.isNaN(recordId)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const recordData = await fetchRecordById(recordId);

      if (!recordData) {
        setError('Record not found');
        return;
      }

      setRecord(recordData);

      const mainQuery = recordData.title_name || recordData.name || 'magazine cover';
      const mainImage = await getCachedPexelsImage(mainQuery);
      setImageUrl(mainImage);

      const tagIds = recordData.record_tags?.map((rt) => rt.tag_id) ?? [];

      const relatedResponse =
        tagIds.length > 0
          ? await fetchRecords(1, 6, { tags: [tagIds[0]] })
          : await fetchRecords(1, 6, { magazine: recordData.name });

      const relatedData = relatedResponse?.data ?? [];
      const filtered = relatedData.filter((r) => r.id !== recordId);
      setRelatedRecords(filtered);

      const nextImageMap = new Map<number, string>();
      for (const item of filtered) {
        const relatedQuery = item.title_name || item.name || 'magazine cover';
        const relatedImage = await getCachedPexelsImage(relatedQuery);
        nextImageMap.set(item.id, relatedImage);
      }
      setRelatedImageUrls(nextImageMap);
    } catch (err) {
      console.error('Error loading record:', err);
      setError('Failed to load record. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  const handleSearch = (query: string) => {
    router.push(`/browse?search=${encodeURIComponent(query)}`);
  };

  const handleFiltersClick = () => {
    console.log('Filters clicked - to be implemented');
  };

  const handleTagClick = (tagId: number) => {
    router.push(`/browse?tag=${tagId}`);
  };

  const getRelatedImageUrl = (relatedRecord: RecordWithDetails): string =>
    relatedImageUrls.get(relatedRecord.id) ?? FALLBACK_IMAGE;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <Header onSearch={handleSearch} onFiltersClick={handleFiltersClick} showSearch={false} />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-600">Loading record...</span>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
        <Header onSearch={handleSearch} onFiltersClick={handleFiltersClick} showSearch={false} />
        <div className="container mx-auto px-6 py-20">
          <div className="bg-white/80 backdrop-blur rounded-3xl shadow-lg border border-slate-100 px-8 py-12 text-center">
            <h2 className="text-2xl sfont-semibold text-slate-900 mb-3">Something went wrong</h2>
            <p className="text-slate-600">{error || 'We could not find that summary.'}</p>
            <button
              onClick={() => router.push('/browse')}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
            >
              Back to Browse
            </button>
          </div>
        </div>
      </div>
    );
  }

  const authors =
    record.record_authors?.length && record.record_authors[0].authors
      ? record.record_authors.map((ra) => ra.authors.name).join(', ')
      : record.authors || 'Unknown Author';

  const summary =
    record.summaries?.length && record.summaries[0].summary
      ? record.summaries[0].summary
      : record.summary;

  const conclusion =
    record.conclusions?.length && record.conclusions[0].conclusion
      ? record.conclusions[0].conclusion
      : record.conclusion;

  const publicationYear = record.timestamp ? new Date(record.timestamp).getFullYear() : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      <Header onSearch={handleSearch} onFiltersClick={handleFiltersClick} showSearch={false} />

      <main className="container mx-auto px-6 py-8 lg:py-10">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Browse
        </button>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <aside>
            <div className="rounded-3xl bg-white/90 shadow-xl ring-1 ring-slate-100 backdrop-blur">
              <div className="overflow-hidden rounded-t-3xl border-b border-slate-100 bg-slate-50">
                <img
                  src={imageUrl}
                  alt={record.title_name || record.name || 'Magazine cover'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-6 px-6 py-7">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Magazine Details</h3>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                  >
                    <Bookmark className="h-4 w-4" />
                    Follow
                  </button>
                </div>
                <dl className="space-y-4 text-sm text-slate-600">
                  <div>
                    <dt className="font-medium text-slate-500">Journal Name</dt>
                    <dd className="text-slate-800">{record.name || 'Unknown'}</dd>
                  </div>
                  {record.volume || record.number ? (
                    <div>
                      <dt className="font-medium text-slate-500">Volume &amp; Issue</dt>
                      <dd className="text-slate-800">
                        {record.volume ? `Vol. ${record.volume}` : 'Volume N/A'}
                        {record.number ? ` · No. ${record.number}` : ''}
                      </dd>
                    </div>
                  ) : null}
                  {publicationYear ? (
                    <div>
                      <dt className="font-medium text-slate-500">Publication Year</dt>
                      <dd className="text-slate-800">{publicationYear}</dd>
                    </div>
                  ) : null}
                  {record.page_numbers ? (
                    <div>
                      <dt className="font-medium text-slate-500">Pages</dt>
                      <dd className="text-slate-800">{record.page_numbers}</dd>
                    </div>
                  ) : null}
                  {record.language ? (
                    <div>
                      <dt className="font-medium text-slate-500">Language</dt>
                      <dd className="text-slate-800">{record.language}</dd>
                    </div>
                  ) : null}
                  {record.creator_name ? (
                    <div>
                      <dt className="font-medium text-slate-500">Publisher</dt>
                      <dd className="text-slate-800">{record.creator_name}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          </aside>

          <section className="space-y-8">
            <div className="rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-100 backdrop-blur">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                
                {record.timestamp ? (
                  <span className="text-sm text-slate-500">
                    {new Date(record.timestamp).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                ) : null}
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl">
                {record.title_name || 'Untitled Summary'}
              </h1>
              <p className="mt-3 text-lg text-slate-600">By {authors}</p>

              {summary ? (
                <section className="mt-8 space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line text-justify">{summary}</p>
                </section>
              ) : null}

              {conclusion ? (
                <section className="mt-8 space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Conclusion</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line text-justify">{conclusion}</p>
                </section>
              ) : null}

              {record.record_tags?.length ? (
                <section className="mt-8 space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Tags</h2>
                  <div className="flex flex-wrap gap-2">
                    {record.record_tags.map((tagRelation) => (
                      <TagPill
                        key={tagRelation.tags.id}
                        tag={tagRelation.tags}
                        onClick={handleTagClick}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="mt-10 flex flex-wrap gap-3">
                {record.pdf_url ? (
                  <a
                    href={record.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-600"
                  >
                    View PDF
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                  Back to Browse
                </button>
              </div>
            </div>

            {relatedRecords.length > 0 ? (
              <div className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-slate-100 backdrop-blur">
                <RelatedSummaries records={relatedRecords} getImageUrl={getRelatedImageUrl} />
              </div>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
