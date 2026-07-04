// components/browse/ArticleGrid.tsx
import React from 'react';
import { SearchX } from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import { magazineName } from '@/lib/format';
import { useBookmarks } from '@/lib/useLibrary';
import ArticleCard from './ArticleCard';

interface ArticleGridProps {
  records: RecordWithDetails[];
  onTagClick?: (tagId: number) => void;
  activeTagIds?: number[];
  onReset?: () => void;
}

export const ArticleGrid: React.FC<ArticleGridProps> = ({
  records,
  onTagClick,
  activeTagIds = [],
  onReset,
}) => {
  const { isBookmarked, toggle } = useBookmarks();

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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {records.map((record) => (
        <ArticleCard
          key={record.id}
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
      ))}
    </div>
  );
};

export default ArticleGrid;
