// components/browse/SearchBar.tsx
import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFiltersClick: () => void;
  onSmartSearchClick?: () => void;
  placeholder?: string;
  initialQuery?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  onFiltersClick,
  onSmartSearchClick,
  placeholder = 'Search for titles, authors, or keywords...',
  initialQuery = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);

  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSearch(searchQuery);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <button
        type="button"
        onClick={onFiltersClick}
        className="inline-flex items-center gap-2 rounded-full bg-amber-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-800"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
      </button>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-full border border-transparent bg-gray-100 px-12 py-3 text-sm text-gray-900 shadow-inner transition focus-visible:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      {onSmartSearchClick && (
        <button
          type="button"
          onClick={onSmartSearchClick}
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
        >
          Try Smart Search
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
