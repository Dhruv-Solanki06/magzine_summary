// components/common/Header.tsx
import React from 'react';
import { useRouter } from 'next/router';
import { Bookmark, Star, User, Menu } from 'lucide-react';

interface HeaderProps {
  // Kept optional so existing usages don't break,
  // but they are no longer used here.
  onSearch?: (query: string) => void;
  onFiltersClick?: () => void;
  showSearch?: boolean;
  searchQuery?: string;
  title?: string;
}

// Header Component
export const Header: React.FC<HeaderProps> = ({
  title = 'Magazine Summary Portal',
}) => {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    void router.push(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/95 text-white backdrop-blur">
      <div className="container mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Logo/Title */}
          <div className="flex items-center gap-2">
            <h1 className="whitespace-nowrap text-lg font-bold sm:text-xl">
              {title}
            </h1>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              className="rounded-md p-2 transition-colors hover:bg-gray-800"
              title="Bookmarks"
              onClick={() => handleNavigate('/bookmarks')}
            >
              <Bookmark className="h-5 w-5" />
            </button>
            <button
              className="rounded-md p-2 transition-colors hover:bg-gray-800"
              title="Favorites"
              onClick={() => handleNavigate('/favorites')}
            >
              <Star className="h-5 w-5" />
            </button>
            <button
              className="hidden rounded-md p-2 transition-colors hover:bg-gray-800 sm:inline-flex"
              title="Profile"
            >
              <User className="h-5 w-5" />
            </button>
            {/* Mobile menu / profile entry point */}
            <button
              className="inline-flex rounded-md p-2 transition-colors hover:bg-gray-800 sm:hidden"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* On larger screens show menu icon too if you like */}
            <button
              className="hidden rounded-md p-2 transition-colors hover:bg-gray-800 sm:inline-flex"
              title="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
