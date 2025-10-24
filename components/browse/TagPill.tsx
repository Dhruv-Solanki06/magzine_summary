// components/browse/TagPill.tsx
import React from 'react';
import { Tag } from '@/types';
import clsx from 'clsx';

interface TagPillProps {
  tag: Tag;
  onClick?: (tagId: number) => void;
  selected?: boolean; // highlight active tag
  variant?: 'default' | 'primary' | 'secondary' | 'accent'; // style variants
  className?: string;
}

export const TagPill: React.FC<TagPillProps> = ({
  tag,
  onClick,
  selected = false,
  variant = 'default',
  className = '',
}) => {
  const handleClick = () => {
    if (onClick) onClick(tag.id);
  };

  const baseClasses =
    'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1';

  // Color variants for aesthetic variety
  const variantClasses: Record<string, string> = {
    default: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
    primary: 'bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-400',
    secondary:
      'bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-400',
    accent:
      'bg-purple-100 text-purple-700 hover:bg-purple-200 focus:ring-purple-400',
  };

  const activeClasses = selected
    ? 'ring-2 ring-offset-1 ring-blue-500 bg-blue-600 text-white hover:bg-blue-700'
    : '';

  return (
    <button
      onClick={handleClick}
      className={clsx(baseClasses, variantClasses[variant], activeClasses, className)}
      aria-pressed={selected}
    >
      #{tag.name}
    </button>
  );
};

export default TagPill;
