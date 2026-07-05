'use client';

// components/common/Sidebar.tsx
// Primary navigation rail. On desktop (lg+) it's a persistent sticky column to
// the left of the app; below lg it becomes a slide-in drawer opened by the
// header's hamburger button. Design language matches the light, black-on-white
// editorial surface used across the archive.

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import {
  BookOpen,
  LibraryBig,
  LayoutGrid,
  LineChart,
  Bookmark,
  Star,
  User,
  LogIn,
  LogOut,
  X,
} from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import { SITE_DOMAIN, SITE_NAME, SITE_TAGLINE } from '@/lib/brand';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY: NavItem[] = [
  { href: '/', label: 'Articles', icon: BookOpen },
  { href: '/magazines', label: 'Magazines', icon: LibraryBig },
  { href: '/subjects', label: 'Subjects', icon: LayoutGrid },
  { href: '/tracker', label: 'Research tracker', icon: LineChart },
];

const LIBRARY: NavItem[] = [
  { href: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { href: '/favorites', label: 'Favorite authors', icon: Star },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, signOut } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? router.pathname === '/' : router.pathname.startsWith(href);

  // Close the mobile drawer whenever navigation starts.
  useEffect(() => {
    const handler = () => onClose();
    router.events.on('routeChangeStart', handler);
    return () => router.events.off('routeChangeStart', handler);
  }, [router.events, onClose]);

  // Escape closes the drawer; lock body scroll while it's open on mobile.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSignOut = async () => {
    onClose();
    const result = await signOut();
    if (!result.error) void router.push('/login');
  };

  const navLink = (item: NavItem) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        className={clsx(
          'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[15px] transition-colors',
          active
            ? 'bg-black/[0.05] font-medium text-black/92'
            : 'text-black/60 hover:bg-black/[0.04] hover:text-black/85',
        )}
        aria-current={active ? 'page' : undefined}
      >
        <Icon
          className={clsx('h-[18px] w-[18px] shrink-0', active ? 'text-black/70' : 'text-black/40')}
        />
        {item.label}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[1px] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 z-[60] flex h-dvh w-[min(86vw,320px)] flex-col border-r border-black/[0.06] bg-white',
          'transition-transform duration-200 ease-out',
          'lg:sticky lg:top-0 lg:z-30 lg:w-[248px] lg:shrink-0 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary"
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#171717] text-[12px] font-bold tracking-[-0.4px] text-white">
              AC
            </span>
            <span className="flex flex-col leading-none">
              <span
                className="text-[15px] font-bold tracking-[-0.2px] text-black/92"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {SITE_NAME}
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-black/45">
                {SITE_TAGLINE}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/[0.05] hover:text-black/80 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="scrollbar-thin-light flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
            Browse
          </p>
          <div className="space-y-0.5">{PRIMARY.map(navLink)}</div>

          <p className="px-3 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
            My library
          </p>
          <div className="space-y-0.5">{LIBRARY.map(navLink)}</div>
        </nav>

        {/* Account */}
        <div className="border-t border-black/[0.06] p-3">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition-colors hover:bg-black/[0.04]"
                title="Account"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-black/55">
                  <User className="h-[18px] w-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[13px] font-medium text-black/85">
                    {user.email ?? 'Your account'}
                  </span>
                  <span className="text-[11px] text-black/40">View account</span>
                </span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-black/45 transition hover:bg-black/[0.05] hover:text-black/80"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
          )}
          <p className="mt-2 px-2 text-[11px] text-black/30">{SITE_DOMAIN}</p>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
