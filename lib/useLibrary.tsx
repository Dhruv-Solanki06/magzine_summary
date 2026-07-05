'use client';

// lib/useLibrary.tsx
// Per-user bookmarks + followed authors, backed by Supabase (RLS-isolated per
// user) — NOT localStorage. Data is scoped to the currently authenticated user
// and cleared on sign-out, so accounts never see each other's library. Signed-out
// visitors cannot save: any attempt opens the login/signup modal instead.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';
import AuthRequiredModal from '@/components/auth/AuthRequiredModal';

export interface StoredBookmark {
  id: number;
  title: string;
  magazine?: string | null;
}

export interface StoredFavoriteAuthor {
  id: number;
  name: string;
}

interface LibraryContextValue {
  bookmarks: StoredBookmark[];
  favorites: StoredFavoriteAuthor[];
  loading: boolean;
  isBookmarked: (id: number) => boolean;
  isFavorite: (id: number) => boolean;
  toggleBookmark: (entry: StoredBookmark) => boolean;
  toggleFavorite: (entry: StoredFavoriteAuthor) => boolean;
  removeBookmark: (id: number) => void;
  removeFavorite: (id: number) => void;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([]);
  const [favorites, setFavorites] = useState<StoredFavoriteAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; action: string }>({
    open: false,
    action: '',
  });

  // Load (or clear) the signed-in user's library whenever the account changes.
  useEffect(() => {
    if (!userId) {
      setBookmarks([]);
      setFavorites([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const [bookmarkRes, favoriteRes] = await Promise.all([
        supabase
          .from('bookmarks')
          .select('record_id, title, magazine')
          .order('created_at', { ascending: false }),
        supabase
          .from('followed_authors')
          .select('author_id, name')
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (!bookmarkRes.error && bookmarkRes.data) {
        setBookmarks(
          bookmarkRes.data.map((row) => ({
            id: Number(row.record_id),
            title: row.title || `Record ${row.record_id}`,
            magazine: row.magazine ?? null,
          })),
        );
      }
      if (!favoriteRes.error && favoriteRes.data) {
        setFavorites(
          favoriteRes.data.map((row) => ({
            id: Number(row.author_id),
            name: row.name || `Author ${row.author_id}`,
          })),
        );
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const promptAuth = useCallback((action: string) => {
    setAuthModal({ open: true, action });
  }, []);

  const isBookmarked = useCallback(
    (id: number) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );
  const isFavorite = useCallback(
    (id: number) => favorites.some((a) => a.id === id),
    [favorites],
  );

  const toggleBookmark = useCallback(
    (entry: StoredBookmark): boolean => {
      if (!userId) {
        promptAuth('bookmark articles');
        return false;
      }
      const exists = bookmarks.some((b) => b.id === entry.id);
      const supabase = getSupabaseBrowserClient();

      if (exists) {
        setBookmarks((prev) => prev.filter((b) => b.id !== entry.id));
        void supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', userId)
          .eq('record_id', entry.id)
          .then(({ error }) => {
            if (error) setBookmarks((prev) => [entry, ...prev.filter((b) => b.id !== entry.id)]);
          });
        return false;
      }

      setBookmarks((prev) => [entry, ...prev.filter((b) => b.id !== entry.id)]);
      void supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          record_id: entry.id,
          title: entry.title,
          magazine: entry.magazine ?? null,
        })
        .then(({ error }) => {
          if (error) setBookmarks((prev) => prev.filter((b) => b.id !== entry.id));
        });
      return true;
    },
    [bookmarks, promptAuth, userId],
  );

  const toggleFavorite = useCallback(
    (entry: StoredFavoriteAuthor): boolean => {
      if (!userId) {
        promptAuth('follow authors');
        return false;
      }
      const exists = favorites.some((a) => a.id === entry.id);
      const supabase = getSupabaseBrowserClient();

      if (exists) {
        setFavorites((prev) => prev.filter((a) => a.id !== entry.id));
        void supabase
          .from('followed_authors')
          .delete()
          .eq('user_id', userId)
          .eq('author_id', entry.id)
          .then(({ error }) => {
            if (error) setFavorites((prev) => [entry, ...prev.filter((a) => a.id !== entry.id)]);
          });
        return false;
      }

      setFavorites((prev) => [entry, ...prev.filter((a) => a.id !== entry.id)]);
      void supabase
        .from('followed_authors')
        .insert({ user_id: userId, author_id: entry.id, name: entry.name })
        .then(({ error }) => {
          if (error) setFavorites((prev) => prev.filter((a) => a.id !== entry.id));
        });
      return true;
    },
    [favorites, promptAuth, userId],
  );

  const removeBookmark = useCallback(
    (id: number) => {
      if (!userId) return;
      const previous = bookmarks;
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      const supabase = getSupabaseBrowserClient();
      void supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('record_id', id)
        .then(({ error }) => {
          if (error) setBookmarks(previous);
        });
    },
    [bookmarks, userId],
  );

  const removeFavorite = useCallback(
    (id: number) => {
      if (!userId) return;
      const previous = favorites;
      setFavorites((prev) => prev.filter((a) => a.id !== id));
      const supabase = getSupabaseBrowserClient();
      void supabase
        .from('followed_authors')
        .delete()
        .eq('user_id', userId)
        .eq('author_id', id)
        .then(({ error }) => {
          if (error) setFavorites(previous);
        });
    },
    [favorites, userId],
  );

  const value = useMemo<LibraryContextValue>(
    () => ({
      bookmarks,
      favorites,
      loading,
      isBookmarked,
      isFavorite,
      toggleBookmark,
      toggleFavorite,
      removeBookmark,
      removeFavorite,
    }),
    [
      bookmarks,
      favorites,
      loading,
      isBookmarked,
      isFavorite,
      toggleBookmark,
      toggleFavorite,
      removeBookmark,
      removeFavorite,
    ],
  );

  return (
    <LibraryContext.Provider value={value}>
      {children}
      <AuthRequiredModal
        open={authModal.open}
        action={authModal.action}
        onClose={() => setAuthModal((m) => ({ ...m, open: false }))}
      />
    </LibraryContext.Provider>
  );
}

function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside LibraryProvider.');
  return ctx;
}

// Back-compat hook shapes so existing call sites keep working unchanged.
export function useBookmarks() {
  const { bookmarks, isBookmarked, toggleBookmark, removeBookmark, loading } = useLibrary();
  return {
    bookmarks,
    isBookmarked,
    toggle: toggleBookmark,
    remove: removeBookmark,
    loading,
  };
}

export function useFavoriteAuthors() {
  const { favorites, isFavorite, toggleFavorite, removeFavorite, loading } = useLibrary();
  return {
    favorites,
    isFavorite,
    toggle: toggleFavorite,
    remove: removeFavorite,
    loading,
  };
}
