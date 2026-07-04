'use client';

import React from 'react';
import {
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  FileText,
  Globe2,
  Heart,
  Layers,
} from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import TagPill from '@/components/browse/TagPill';
import {
  authorLabel,
  bestConclusion,
  bestSummary,
  formatIssueDate,
  formatLanguage,
  issueLabel,
} from '@/lib/format';

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
  const authors = authorLabel(record);
  const summary = bestSummary(record);
  const conclusion = bestConclusion(record);
  const tags = record.record_tags ?? [];
  const hasAuthorRecords = (record.record_authors?.length ?? 0) > 0;
  const issue = issueLabel(record);
  const date = formatIssueDate(record.timestamp);
  const language = formatLanguage(record.language_legacy);
  const meta = [
    issue ? { icon: Layers, label: issue } : null,
    date ? { icon: CalendarDays, label: date } : null,
    record.page_numbers ? { icon: FileText, label: `pp. ${record.page_numbers}` } : null,
    language ? { icon: Globe2, label: language } : null,
  ].filter((item): item is { icon: typeof Layers; label: string } => Boolean(item));

  return (
    <article className="overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
      <div className="bg-[linear-gradient(135deg,rgba(0,0,0,0.035),rgba(255,255,255,0)_44%)] p-5 sm:p-8">
      <h1
        className="text-pretty text-[28px] font-bold leading-[1.12] tracking-[-0.5px] text-black/92 sm:text-[38px]"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {record.title_name || 'Untitled article'}
      </h1>

      {authors && <p className="mt-3 text-[15px] leading-6 text-black/60">By {authors}</p>}

      {meta.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {meta.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[13px] font-medium text-black/58"
            >
              <Icon className="h-4 w-4 text-black/32" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
        {onBookmarkToggle && (
          <button
            type="button"
            onClick={onBookmarkToggle}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition ${
              isBookmarked
                ? 'bg-[#171717] text-white hover:bg-black/85'
                : 'border border-black/10 bg-white text-black/70 hover:border-black/20 hover:text-black/90'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            {isBookmarked ? 'Bookmarked' : 'Bookmark'}
          </button>
        )}
        {onFavoriteAuthorsToggle && hasAuthorRecords && (
          <button
            type="button"
            onClick={onFavoriteAuthorsToggle}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition ${
              areAuthorsFavorited
                ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'border-black/10 bg-white text-black/70 hover:border-black/20 hover:text-black/90'
            }`}
          >
            <Heart className={`h-4 w-4 ${areAuthorsFavorited ? 'fill-rose-500 text-rose-500' : ''}`} />
            {areAuthorsFavorited ? 'Following authors' : 'Follow authors'}
          </button>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          {tags.map((rel) => (
            <TagPill key={rel.tags.id} tag={rel.tags} onClick={onTagClick} />
          ))}
        </div>
      )}

      {summary && (
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-black/45">
            Summary
          </h2>
          <p className="mt-3 whitespace-pre-line text-[15.5px] leading-[1.78] text-black/76">
            {summary}
          </p>
        </section>
      )}

      {conclusion && (
        <section className="mt-7 border-t border-black/[0.06] pt-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-black/45">
            Conclusion
          </h2>
          <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.7] text-black/75">
            {conclusion}
          </p>
        </section>
      )}
      </div>
    </article>
  );
};

export default RecordContentCard;
