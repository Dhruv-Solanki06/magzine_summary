// components/browse/SearchBar.tsx
import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFiltersClick?: () => void;
  placeholder?: string;
  initialQuery?: string;
  loading?: boolean;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search titles, authors, summaries and full text…',
  initialQuery = '',
  loading = false,
  className = '',
}) => {
  const [value, setValue] = useState(initialQuery);

  useEffect(() => {
    setValue(initialQuery);
  }, [initialQuery]);

  const submit = () => onSearch(value.trim());
  const clear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div
      className={`flex min-h-12 w-full items-center gap-2 rounded-xl bg-black/[0.05] pl-3.5 pr-1.5 transition focus-within:bg-white focus-within:ring-1 focus-within:ring-black/20 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin text-black/45" />
      ) : (
        <Search className="h-[18px] w-[18px] shrink-0 text-black/45" />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        aria-label="Search articles"
        className="focus-managed h-11 w-full bg-transparent text-[15px] text-black/92 placeholder:text-black/45 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/45 transition-colors hover:bg-black/[0.06] hover:text-black/70"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={submit}
        aria-label="Search"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#171717] text-white transition-colors hover:bg-black/85 sm:hidden"
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={submit}
        className="hidden h-9 shrink-0 items-center rounded-lg bg-[#171717] px-4 text-sm font-medium text-white transition-colors hover:bg-black/85 sm:inline-flex"
      >
        Search
      </button>
    </div>
  );
};

export default SearchBar;
