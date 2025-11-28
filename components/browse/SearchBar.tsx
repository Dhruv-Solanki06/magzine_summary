// components/browse/SearchBar.tsx
import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFiltersClick: () => void;
  // IMPORTANT: gets the current query string
  onSmartSearchClick?: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFiltersClick,
  onSmartSearchClick,
  placeholder = 'Search magazine',
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  // keep input in sync if initialQuery changes from outside
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const submitSearch = () => {
    const trimmed = searchQuery.trim();
    onSearch(trimmed);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submitSearch();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSmartSearchClick = () => {
    const trimmed = searchQuery.trim();
    if (onSmartSearchClick) {
      onSmartSearchClick(trimmed);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
      {/* Filters pill (left) */}
      <button
        type="button"
        onClick={onFiltersClick}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-800 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-900 sm:px-6"
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
      </button>

      {/* Gray bar with search + smart search (right) */}
      <div className="flex w-full items-center gap-2 rounded-full bg-gray-100 px-4 py-2 sm:flex-1">
        {/* Search input section */}
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label="Search"
            className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          />
        </div>

        {/* Smart search pill on the right */}
        {onSmartSearchClick && (
          <button
            type="button"
            onClick={handleSmartSearchClick}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            <span>Try Smart Search</span>
            <Sparkles className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
