import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'magazine_summary_cache');

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
  await ensureCacheDir();
  const filePath = cacheFileName(key);

  try {
    const stats = await fs.stat(filePath);
    const age = Date.now() - stats.mtimeMs;

    if (age > ttlMs) {
      return null;
    }

    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch (error) {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  await ensureCacheDir();
  const filePath = cacheFileName(key);

  try {
    await fs.writeFile(filePath, JSON.stringify(value), 'utf8');
  } catch (error) {
    console.warn('Failed to write cache file:', error);
  }
}
