// components/common/Header.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bookmark, BookOpen, LayoutGrid, LibraryBig, LogIn, LogOut, Star, User } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

interface HeaderProps {
  // Kept optional so older call sites don't break.
  onSearch?: (query: string) => void;
  onFiltersClick?: () => void;
  showSearch?: boolean;
  searchQuery?: string;
  title?: string;
}

const NAV = [
  { href: '/', label: 'Articles', icon: BookOpen },
  { href: '/magazines', label: 'Magazines', icon: LibraryBig },
  { href: '/subjects', label: 'Subjects', icon: LayoutGrid },
];

export const Header: React.FC<HeaderProps> = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.error) void router.push('/login');
  };

  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-black/55 transition-colors hover:bg-black/[0.05] hover:text-black/80';

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full items-center gap-4 px-4 sm:px-6 lg:px-10">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#171717] text-[12px] font-bold tracking-[-0.4px] text-white">
            AC
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span
              className="text-[15px] font-bold tracking-[-0.2px] text-black/92"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {SITE_NAME}
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-black/45">
              {SITE_TAGLINE} · {SITE_DOMAIN}
            </span>
          </span>
        </Link>

        {/* Primary nav */}
        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-[15px] transition-colors ${
                  active
                    ? 'bg-black/[0.05] font-medium text-black/92'
                    : 'text-black/55 hover:text-black/80'
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Link href="/bookmarks" className={iconBtn} title="Bookmarks" aria-label="Bookmarks">
            <Bookmark className="h-[18px] w-[18px]" />
          </Link>
          <Link href="/favorites" className={iconBtn} title="Favorite authors" aria-label="Favorites">
            <Star className="h-[18px] w-[18px]" />
          </Link>

          <span className="mx-1 hidden h-5 w-px bg-black/10 sm:block" />

          {user ? (
            <>
              <Link href="/account" className={iconBtn} title="Account" aria-label="Account">
                <User className="h-[18px] w-[18px]" />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className={iconBtn}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              aria-disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/85"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Log in</span>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      <nav className="flex items-center gap-1 border-t border-black/[0.06] px-4 py-1.5 md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                active ? 'bg-black/[0.05] font-medium text-black/92' : 'text-black/55'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
};

export default Header;
