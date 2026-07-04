'use client';

// lib/useLibrary.ts
// Reactive client hooks for bookmarks + favourite authors.
//
// Today these persist to localStorage (works for signed-out visitors too).
// When the parallel auth work lands a per-user table, swap the read/write
// implementations here for Supabase calls keyed on the authenticated user —
// the component API (toggle/has) stays the same.

import { useCallback, useEffect, useState } from 'react';
import {
  readBookmarks,
  writeBookmarks,
  readFavoriteAuthors,
  writeFavoriteAuthors,
  type StoredBookmark,
  type StoredFavoriteAuthor,
} from '@/lib/storage';

const BOOKMARK_EVENT = 'library:bookmarks';
const FAVORITE_EVENT = 'library:favorites';

function emit(name: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(name));
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<StoredBookmark[]>([]);

  const refresh = useCallback(() => setBookmarks(readBookmarks()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(BOOKMARK_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(BOOKMARK_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  const isBookmarked = useCallback(
    (id: number) => bookmarks.some((b) => b.id === id),
    [bookmarks],
  );

  const toggle = useCallback((entry: StoredBookmark) => {
    const current = readBookmarks();
    const exists = current.some((b) => b.id === entry.id);
    const next = exists
      ? current.filter((b) => b.id !== entry.id)
      : [...current, entry];
    writeBookmarks(next);
    setBookmarks(next);
    emit(BOOKMARK_EVENT);
    return !exists;
  }, []);

  const remove = useCallback((id: number) => {
    const next = readBookmarks().filter((b) => b.id !== id);
    writeBookmarks(next);
    setBookmarks(next);
    emit(BOOKMARK_EVENT);
  }, []);

  return { bookmarks, isBookmarked, toggle, remove, refresh };
}

export function useFavoriteAuthors() {
  const [favorites, setFavorites] = useState<StoredFavoriteAuthor[]>([]);

  const refresh = useCallback(() => setFavorites(readFavoriteAuthors()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener(FAVORITE_EVENT, handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(FAVORITE_EVENT, handler);
      window.removeEventListener('storage', handler);
    };
  }, [refresh]);

  const isFavorite = useCallback(
    (id: number) => favorites.some((a) => a.id === id),
    [favorites],
  );

  const toggle = useCallback((entry: StoredFavoriteAuthor) => {
    const current = readFavoriteAuthors();
    const exists = current.some((a) => a.id === entry.id);
    const next = exists
      ? current.filter((a) => a.id !== entry.id)
      : [...current, entry];
    writeFavoriteAuthors(next);
    setFavorites(next);
    emit(FAVORITE_EVENT);
    return !exists;
  }, []);

  const remove = useCallback((id: number) => {
    const next = readFavoriteAuthors().filter((a) => a.id !== id);
    writeFavoriteAuthors(next);
    setFavorites(next);
    emit(FAVORITE_EVENT);
  }, []);

  return { favorites, isFavorite, toggle, remove, refresh };
}
