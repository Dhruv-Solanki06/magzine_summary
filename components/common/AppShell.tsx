'use client';

// components/common/AppShell.tsx
// Wraps every content page in the persistent sidebar layout and exposes a tiny
// context so the in-page Header can open the mobile drawer via its hamburger.
// Auth screens (login/signup/etc.) render bare — they use their own centered
// AuthShell and shouldn't be wrapped by the app chrome.

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/router';

import { Sidebar } from '@/components/common/Sidebar';

interface SidebarContextValue {
  open: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  openSidebar: () => {},
  closeSidebar: () => {},
});

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

const BARE_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const openSidebar = useCallback(() => setOpen(true), []);
  const closeSidebar = useCallback(() => setOpen(false), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ open, openSidebar, closeSidebar }),
    [open, openSidebar, closeSidebar],
  );

  const bare = BARE_ROUTES.some(
    (route) => router.pathname === route || router.pathname.startsWith(`${route}/`),
  );

  if (bare) return <>{children}</>;

  return (
    <SidebarContext.Provider value={value}>
      <div className="flex min-h-dvh bg-white">
        <Sidebar open={open} onClose={closeSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarContext.Provider>
  );
}

export default AppShell;
