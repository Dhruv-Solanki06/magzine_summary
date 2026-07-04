// components/browse/TagPill.tsx
import React from 'react';
import clsx from 'clsx';
import type { Tag } from '@/types';

interface TagPillProps {
  tag: Tag;
  onClick?: (tagId: number) => void;
  selected?: boolean;
  className?: string;
}

export const TagPill: React.FC<TagPillProps> = ({
  tag,
  onClick,
  selected = false,
  className = '',
}) => {
  const clickable = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick ? () => onClick(tag.id) : undefined}
      aria-pressed={selected}
      className={clsx(
        'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        selected
          ? 'bg-[#171717] text-white'
          : 'bg-black/[0.05] text-black/60 hover:bg-black/[0.08] hover:text-black/80',
        clickable ? 'cursor-pointer' : 'cursor-default',
        className,
      )}
    >
      <span className="truncate">{tag.name}</span>
    </button>
  );
};

export default TagPill;
