import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'aryan_culture_cache');

/**
 * In-process tier that sits in front of the file cache. The file cache alone
 * still hits the disk on every request and is lost whenever the container is
 * replaced; keeping hot values in memory means repeat requests inside a single
 * container cost neither a disk read nor a Supabase round trip.
 */
const memory = new Map<string, { expires: number; value: unknown }>();
const MEMORY_MAX_ENTRIES = 500;

function memoryGet<T>(key: string): T | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    memory.delete(key);
    return null;
  }
  return hit.value as T;
}

function memorySet<T>(key: string, value: T, ttlMs: number): void {
  // Cheap bound: drop the oldest insertions once the map grows too large.
  if (memory.size >= MEMORY_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { expires: Date.now() + ttlMs, value });
}

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Swallow errors so caching failures do not break requests.
    console.warn('Failed to ensure cache directory:', error);
  }
}

function cacheFileName(key: string): string {
  const hashed = crypto.createHash('sha1').update(key).digest('hex');
  return path.join(CACHE_DIR, `${hashed}.json`);
}

export async function readCache<T>(key: string, ttlMs: number): Promise<T | null> {
  const inMemory = memoryGet<T>(key);
  if (inMemory !== null) return inMemory;

  await ensureCacheDir();
  const filePath = cacheFileName(key);

  try {
    const stats = await fs.stat(filePath);
    const age = Date.now() - stats.mtimeMs;

    if (age > ttlMs) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw) as T;
    // Re-seed memory with the remaining lifetime, not a fresh full TTL.
    memorySet(key, parsed, Math.max(1000, ttlMs - age));
    return parsed;
  } catch (error) {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T, ttlMs?: number): Promise<void> {
  if (ttlMs) memorySet(key, value, ttlMs);

  await ensureCacheDir();
  const filePath = cacheFileName(key);

  try {
    await fs.writeFile(filePath, JSON.stringify(value), 'utf8');
  } catch (error) {
    console.warn('Failed to write cache file:', error);
  }
}

/**
 * Read-through cache around a loader. Every Supabase-backed lookup that is not
 * user-specific should go through this — an uncached read on a hot path (an
 * article page, a search) is what burns database egress.
 *
 * In-flight calls for the same key are shared, so a burst of concurrent
 * requests for a cold key produces exactly one Supabase query.
 */
const inFlight = new Map<string, Promise<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await readCache<T>(key, ttlMs);
  if (cached !== null) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = (async () => {
    try {
      const value = await loader();
      await writeCache(key, value, ttlMs);
      return value;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, promise);
  return promise;
}
