// components/common/Header.tsx
import React from 'react';
import { Bookmark, Star, User, Menu } from 'lucide-react';
import SearchBar from '../browse/SearchBar';

interface HeaderProps {
  onSearch: (query: string) => void;
  onFiltersClick: () => void;
  showSearch?: boolean;
  searchQuery?: string;
}
// Header Component
export const Header: React.FC<HeaderProps> = ({
  onSearch,
  onFiltersClick,
  showSearch = true,
  searchQuery,
}) => {
  return (
    <header className="bg-gray-900 text-white sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold whitespace-nowrap">
              Magazine Summary Portal
            </h1>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="flex-1 max-w-2xl">
              <SearchBar 
                onSearch={onSearch}
                onFiltersClick={onFiltersClick}
                initialQuery={searchQuery}
              />
            </div>
          )}

          {/* Right side icons */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-800 rounded-md transition-colors" title="Bookmarks">
              <Bookmark className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-md transition-colors" title="Favorites">
              <Star className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-md transition-colors" title="Profile">
              <User className="w-5 h-5" />
            </button>
            <button className="p-2 hover:bg-gray-800 rounded-md transition-colors" title="Menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
