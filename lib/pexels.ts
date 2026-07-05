// lib/pexels.ts — client-side Pexels image lookup with in-memory + session cache.
// Used to give each article a dynamically-fetched cover image.

import { publicEnv } from '@/lib/public-env';

type CacheValue = string | null;
const memoryCache = new Map<string, CacheValue>();
const inFlight = new Map<string, Promise<CacheValue>>();

const SESSION_PREFIX = 'pexels:v1:';

function readSession(key: string): CacheValue | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_PREFIX + key);
    if (raw === null) return undefined;
    return raw === '' ? null : raw;
  } catch {
    return undefined;
  }
}

function writeSession(key: string, value: CacheValue) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_PREFIX + key, value ?? '');
  } catch {
    // storage full / unavailable — ignore
  }
}

/**
 * Resolve a Pexels image URL for a query. Returns null when nothing is found
 * or the key is missing so callers can fall back to a generated cover.
 */
export async function fetchPexelsImage(query: string): Promise<CacheValue> {
  const key = query.trim().toLowerCase();
  if (!key) return null;

  if (memoryCache.has(key)) return memoryCache.get(key)!;
  const session = readSession(key);
  if (session !== undefined) {
    memoryCache.set(key, session);
    return session;
  }
  if (inFlight.has(key)) return inFlight.get(key)!;

  const apiKey = publicEnv('NEXT_PUBLIC_PEXELS_API_KEY');
  if (!apiKey) {
    memoryCache.set(key, null);
    return null;
  }

  const promise = (async () => {
    try {
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(
          query,
        )}&per_page=1&orientation=landscape`,
        { headers: { Authorization: apiKey } },
      );
      if (!res.ok) return null;
      const data = await res.json();
      const photo = data?.photos?.[0]?.src;
      return (photo?.landscape || photo?.large || photo?.medium || null) as CacheValue;
    } catch {
      return null;
    }
  })();

  inFlight.set(key, promise);
  const result = await promise;
  inFlight.delete(key);
  memoryCache.set(key, result);
  writeSession(key, result);
  return result;
}
