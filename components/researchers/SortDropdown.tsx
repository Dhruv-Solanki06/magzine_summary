import React, { useEffect, useRef } from 'react';
import type { ResearcherSortValue } from '@/lib/profiles';

interface SortOption {
  value: ResearcherSortValue;
  label: string;
}

interface SortDropdownProps {
  onClose: () => void;
  onSelect: (option: SortOption) => void;
  options: SortOption[];
  selected: SortOption;
}

export const SortDropdown = ({ onClose, onSelect, options, selected }: SortDropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-lg border border-[rgba(23,23,23,0.12)] bg-white shadow-[0px_8px_24px_rgba(23,23,23,0.12)]"
    >
      <div className="flex flex-col">
        {options.map((option) => (
          <button
            key={option.value}
            className={[
              'flex w-full items-center px-4 py-3 text-left text-sm font-medium leading-5 transition-colors',
              selected.value === option.value
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-700 hover:bg-neutral-50',
            ].join(' ')}
            onClick={() => onSelect(option)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SortDropdown;
