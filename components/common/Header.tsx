// components/common/Header.tsx
import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Bookmark, LineChart, LogIn, LogOut, Menu, Star, User } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { useSidebar } from '@/components/common/AppShell';
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

interface HeaderProps {
  // Kept optional so older call sites don't break.
  onSearch?: (query: string) => void;
  onFiltersClick?: () => void;
  showSearch?: boolean;
  searchQuery?: string;
  title?: string;
}

export const Header: React.FC<HeaderProps> = () => {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { openSidebar } = useSidebar();

  const handleSignOut = async () => {
    const result = await signOut();
    if (!result.error) void router.push('/login');
  };

  const iconBtn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg text-black/55 transition-colors hover:bg-black/[0.05] hover:text-black/80';

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/85 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-3 px-4 sm:px-6 lg:px-10">
        {/* Hamburger — opens the sidebar drawer below lg */}
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open menu"
          className={`${iconBtn} -ml-1 lg:hidden`}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand — the sidebar carries the brand on desktop, so only show it
            here on mobile where the sidebar is hidden. */}
        <Link href="/" className="flex items-center gap-2.5 lg:hidden">
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

        <div className="flex-1" />

        {/* Quick actions */}
        <div className="flex items-center gap-1">
          <Link href="/tracker" className={iconBtn} title="Research tracker" aria-label="Research tracker">
            <LineChart className="h-[18px] w-[18px]" />
          </Link>
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
    </header>
  );
};

export default Header;
