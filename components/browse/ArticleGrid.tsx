// components/browse/ArticleGrid.tsx
import React from 'react';
import clsx from 'clsx';
import { SearchX } from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import { magazineName } from '@/lib/format';
import { useBookmarks } from '@/lib/useLibrary';
import { useRouteLoading } from '@/lib/useRouteLoading';
import ArticleCard from './ArticleCard';

interface ArticleGridProps {
  records: RecordWithDetails[];
  onTagClick?: (tagId: number) => void;
  activeTagIds?: number[];
  onReset?: () => void;
}

// Two cards per row on desktop; only step up to three once the viewport is at
// least 1500px wide (a custom breakpoint above Tailwind's default `xl`).
const GRID_CLASS = 'grid grid-cols-1 gap-4 lg:grid-cols-2 min-[1500px]:grid-cols-3';

const SkeletonCard: React.FC = () => (
  <div className="flex h-full animate-pulse flex-col gap-4 rounded-[14px] bg-white p-4 ring-1 ring-black/[0.04] sm:flex-row sm:p-5">
    <div className="h-40 w-full shrink-0 rounded-lg bg-black/[0.06] sm:h-auto sm:w-[108px]" />
    <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-1">
      <div className="h-2.5 w-24 rounded bg-black/[0.06]" />
      <div className="h-4 w-4/5 rounded bg-black/[0.08]" />
      <div className="h-3 w-1/3 rounded bg-black/[0.06]" />
      <div className="mt-1 h-3 w-full rounded bg-black/[0.05]" />
      <div className="h-3 w-11/12 rounded bg-black/[0.05]" />
      <div className="mt-auto flex gap-1.5 pt-2">
        <div className="h-5 w-16 rounded-full bg-black/[0.05]" />
        <div className="h-5 w-20 rounded-full bg-black/[0.05]" />
      </div>
    </div>
  </div>
);

export const ArticleGrid: React.FC<ArticleGridProps> = ({
  records,
  onTagClick,
  activeTagIds = [],
  onReset,
}) => {
  const { isBookmarked, toggle } = useBookmarks();
  const loading = useRouteLoading();

  // First load with no data yet, or navigating with nothing to keep on screen.
  if (records.length === 0 && loading) {
    return (
      <div className={GRID_CLASS}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-black/10 py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
          <SearchX className="h-6 w-6 text-black/40" />
        </div>
        <h3 className="text-base font-semibold text-black/80">No articles found</h3>
        <p className="mt-1 max-w-sm text-sm text-black/50">
          Nothing matches these filters yet. Try broadening your search or clearing a filter.
        </p>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="mt-4 text-sm font-medium text-black/70 underline underline-offset-4 hover:text-black"
          >
            Reset filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        GRID_CLASS,
        'transition-opacity duration-200',
        loading && 'pointer-events-none opacity-50',
      )}
      aria-busy={loading}
    >
      {records.map((record, i) => (
        <div
          key={record.id}
          className="animate-fade-in"
          style={{ animationDelay: `${Math.min(i, 10) * 35}ms`, animationFillMode: 'both' }}
        >
          <ArticleCard
            record={record}
            onTagClick={onTagClick}
            activeTagIds={activeTagIds}
            bookmarked={isBookmarked(record.id)}
            onToggleBookmark={(r) =>
              toggle({
                id: r.id,
                title: r.title_name || 'Untitled article',
                magazine: magazineName(r),
              })
            }
          />
        </div>
      ))}
    </div>
  );
};

export default ArticleGrid;
