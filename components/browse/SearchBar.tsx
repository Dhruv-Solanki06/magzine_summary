// components/browse/SearchBar.tsx
import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFiltersClick: () => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onFiltersClick,
  placeholder = "Search for titles, authors, or keywords..." 
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(searchQuery);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-2xl">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-950 w-5 h-5" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:border-gray-400 text-gray-700"
        />
      </div>
      <button
        type="button"
        onClick={onFiltersClick}
        className="px-6 py-3 bg-gray-800 text-white rounded-full hover:bg-gray-700 transition-colors"
      >
        Filters
      </button>
    </div>
  );
};

export default SearchBar;