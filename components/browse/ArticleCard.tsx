// components/browse/ArticleCard.tsx
import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  FileText,
  Layers,
} from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import {
  authorLabel,
  bestSummary,
  formatIssueDate,
  issueLabel,
  magazineName,
  truncate,
} from '@/lib/format';
import PexelsCover from '@/components/common/PexelsCover';
import TagPill from './TagPill';

interface ArticleCardProps {
  record: RecordWithDetails;
  onTagClick?: (tagId: number) => void;
  activeTagIds?: number[];
  bookmarked?: boolean;
  onToggleBookmark?: (record: RecordWithDetails) => void;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  record,
  onTagClick,
  activeTagIds = [],
  bookmarked = false,
  onToggleBookmark,
}) => {
  const mag = magazineName(record);
  const authors = authorLabel(record);
  const summary = bestSummary(record);
  const issue = issueLabel(record);
  const date = formatIssueDate(record.timestamp);
  const tags = record.record_tags ?? [];
  const href = `/records/${record.id}`;
  const title = record.title_name || 'Untitled article';
  const coverQuery =
    record.record_tags?.[0]?.tags?.name || record.title_name || mag || 'ancient manuscript';

  return (
    <article className="group relative isolate flex h-full flex-col gap-4 rounded-[14px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] transition-all duration-200 hover:-translate-y-px hover:bg-black/[0.01] hover:shadow-[var(--shadow-card-hover)] hover:ring-black/10 active:translate-y-0 sm:flex-row sm:p-5">
      <Link
        href={href}
        aria-label={`Open ${title}`}
        className="absolute inset-0 z-10 rounded-[14px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/60"
      />

      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-lg sm:h-auto sm:w-[108px]">
        <PexelsCover
          query={coverQuery}
          alt={title}
          seed={record.magazine_id ?? mag}
          title={mag}
          subtitle={issue || date}
        />
        <span className="absolute bottom-2 right-2 hidden items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-black/70 shadow-sm backdrop-blur sm:inline-flex">
          Open
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/45">
            {mag}
          </span>
          {onToggleBookmark && (
            <button
              type="button"
              onClick={() => onToggleBookmark(record)}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
              className={`relative z-20 -mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                bookmarked
                  ? 'text-[#171717]'
                  : 'text-black/35 hover:bg-black/[0.05] hover:text-black/70'
              }`}
            >
              {bookmarked ? (
                <BookmarkCheck className="h-[18px] w-[18px]" />
              ) : (
                <Bookmark className="h-[18px] w-[18px]" />
              )}
            </button>
          )}
        </div>

        <h3
          className="mt-1 text-pretty text-[17px] font-semibold leading-[1.35] tracking-[-0.2px] text-[#171717] line-clamp-2 transition-colors group-hover:text-black"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h3>

        {authors && (
          <p className="mt-1 text-[13px] text-black/55 line-clamp-1">By {authors}</p>
        )}

        {summary && (
          <p className="mt-2 text-[13.5px] leading-[1.5] text-black/54 line-clamp-2">
            {truncate(summary, 200)}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-black/50">
          {date && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-black/30" />
              {date}
            </span>
          )}
          {issue && (
            <span className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-black/30" />
              {issue}
            </span>
          )}
          {record.page_numbers && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-black/30" />
              pp. {record.page_numbers}
            </span>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="relative z-20 mt-auto flex flex-wrap gap-1.5 pt-3">
            {tags.slice(0, 3).map((rel) => (
              <TagPill
                key={rel.tags.id}
                tag={rel.tags}
                onClick={onTagClick}
                selected={activeTagIds.includes(rel.tags.id)}
              />
            ))}
            {tags.length > 3 && (
              <span className="self-center text-xs text-black/40">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ArticleCard;
