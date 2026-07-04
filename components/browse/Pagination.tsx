// components/browse/Pagination.tsx
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { formatCount } from '@/lib/format';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  const getPages = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const max = 7;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  };

  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const navBtn =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm text-black/55 transition-colors hover:bg-black/[0.05] hover:text-black/80 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent';

  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-black/[0.06] pt-6 sm:flex-row">
      <p className="text-sm text-black/50">
        Showing <span className="font-medium text-black/70 tabular-nums">{formatCount(startRecord)}–{formatCount(endRecord)}</span> of{' '}
        <span className="font-medium text-black/70 tabular-nums">{formatCount(totalRecords)}</span>
      </p>

      <div className="flex items-center gap-1">
        <button className={navBtn} onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPages().map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-black/35">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={clsx(
                'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm tabular-nums transition-colors',
                currentPage === p
                  ? 'bg-[#171717] font-medium text-white'
                  : 'text-black/55 hover:bg-black/[0.05] hover:text-black/80',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button className={navBtn} onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
