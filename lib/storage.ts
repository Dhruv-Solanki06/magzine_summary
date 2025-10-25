'use client';

export interface StoredBookmark {
  id: number;
  title: string;
  magazine?: string | null;
}

export interface StoredFavoriteAuthor {
  id: number;
  name: string;
}

export const BOOKMARK_STORAGE_KEY = 'magazine_summary_bookmarks';
export const FAVORITE_AUTHORS_STORAGE_KEY = 'magazine_summary_favorite_authors';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function normaliseBookmarks(data: unknown): StoredBookmark[] {
  if (!Array.isArray(data)) return [];
  const result: StoredBookmark[] = [];
  for (const item of data) {
    if (typeof item === 'number') {
      result.push({ id: item, title: `Record ${item}` });
      continue;
    }
    if (item && typeof item === 'object') {
      const { id, title, magazine } = item as {
        id?: unknown;
        title?: unknown;
        magazine?: unknown;
      };
      if (typeof id === 'number') {
        result.push({
          id,
          title: typeof title === 'string' && title.trim().length > 0 ? title : `Record ${id}`,
          magazine: typeof magazine === 'string' ? magazine : null,
        });
      }
    }
  }
  return result;
}

function normaliseFavoriteAuthors(data: unknown): StoredFavoriteAuthor[] {
  if (!Array.isArray(data)) return [];
  const result: StoredFavoriteAuthor[] = [];
  for (const item of data) {
    if (typeof item === 'number') {
      result.push({ id: item, name: `Author ${item}` });
      continue;
    }
    if (item && typeof item === 'object') {
      const { id, name } = item as { id?: unknown; name?: unknown };
      if (typeof id === 'number') {
        result.push({
          id,
          name: typeof name === 'string' && name.trim().length > 0 ? name : `Author ${id}`,
        });
      }
    }
  }
  return result;
}

export function readBookmarks(): StoredBookmark[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARK_STORAGE_KEY);
    if (!raw) return [];
    return normaliseBookmarks(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to read bookmarks from storage:', error);
    return [];
  }
}

export function writeBookmarks(bookmarks: StoredBookmark[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.warn('Failed to write bookmarks to storage:', error);
  }
}

export function readFavoriteAuthors(): StoredFavoriteAuthor[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_AUTHORS_STORAGE_KEY);
    if (!raw) return [];
    return normaliseFavoriteAuthors(JSON.parse(raw));
  } catch (error) {
    console.warn('Failed to read favorite authors from storage:', error);
    return [];
  }
}

export function writeFavoriteAuthors(authors: StoredFavoriteAuthor[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(FAVORITE_AUTHORS_STORAGE_KEY, JSON.stringify(authors));
  } catch (error) {
    console.warn('Failed to write favorite authors to storage:', error);
  }
}
