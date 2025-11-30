'use client';

import React from 'react';
import { Bookmark, BookmarkCheck, Download, Eye, Heart } from 'lucide-react';
import { RecordWithDetails } from '@/types';
import { buildPdfViewUrl } from './pdfLinks';
import TagPill from '../browse/TagPill';

interface RecordContentCardProps {
  record: RecordWithDetails;
  onTagClick?: (tagId: number) => void;
  isBookmarked?: boolean;
  onBookmarkToggle?: () => void;
  areAuthorsFavorited?: boolean;
  onFavoriteAuthorsToggle?: () => void;
}

const RecordContentCard: React.FC<RecordContentCardProps> = ({
  record,
  onTagClick,
  isBookmarked = false,
  onBookmarkToggle,
  areAuthorsFavorited = false,
  onFavoriteAuthorsToggle,
}) => {
  const pdfViewUrl = buildPdfViewUrl(record);

  const authors =
    record.record_authors && record.record_authors.length > 0
      ? record.record_authors.map((ra) => ra.authors.name).join(', ')
      : record.authors || 'Unknown Author';

  const summary =
    record.summaries && record.summaries.length > 0
      ? record.summaries[0].summary
      : record.summary;

  const conclusion =
    record.conclusions && record.conclusions.length > 0
      ? record.conclusions[0].conclusion
      : record.conclusion;

  const tags = record.record_tags || [];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg ring-1 ring-slate-100 sm:p-8 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">
          {record.title_name || 'Untitled'}
        </h1>
        <div className="flex flex-wrap gap-2">
          {onFavoriteAuthorsToggle && (
            <button
              type="button"
              onClick={onFavoriteAuthorsToggle}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                areAuthorsFavorited
                  ? 'border-pink-200 bg-pink-50 text-pink-600 hover:bg-pink-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Heart
                className={`h-4 w-4 ${
                  areAuthorsFavorited ? 'fill-pink-500 text-pink-500' : ''
                }`}
              />
              {areAuthorsFavorited ? 'Authors Favorited' : 'Favorite Authors'}
            </button>
          )}
          {onBookmarkToggle && (
            <button
              type="button"
              onClick={onBookmarkToggle}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                isBookmarked
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              {isBookmarked ? 'Bookmarked' : 'Bookmark Summary'}
            </button>
          )}
        </div>
      </div>

      <p className="text-base text-slate-600 sm:text-lg">By {authors}</p>

      <div className="flex flex-wrap gap-2">
        {tags.map((tagRelation) => (
          <TagPill
            key={tagRelation.tags.id}
            tag={tagRelation.tags}
            onClick={onTagClick}
          />
        ))}
      </div>

      {summary && (
        <section className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Summary</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-base">
            {summary}
          </p>
        </section>
      )}

      {conclusion && (
        <section className="mb-6 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">Conclusion</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 sm:text-base">
            {conclusion}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:flex-wrap sm:gap-3">
        {pdfViewUrl && (
          <a
            href={pdfViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-600"
          >
            <Eye className="h-4 w-4" />
            View PDF
          </a>
        )}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  );
};

export default RecordContentCard;
