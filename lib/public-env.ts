// lib/public-env.ts — resolve browser-safe public configuration.
//
// The problem this solves: `NEXT_PUBLIC_*` values are inlined into the client
// bundle at BUILD time. In a build-once / deploy-many Docker setup (build image
// -> push -> `docker pull` on the server) the runtime `.env` on the server can
// no longer influence the already-compiled browser bundle, so the client throws
// "Missing Supabase configuration" even though the server's .env is correct.
//
// Fix: at container start, `docker-entrypoint.sh` writes /public/__env.js which
// sets `window.__ENV` from the *runtime* environment. `_document` loads it before
// the app hydrates. We read from `window.__ENV` first (runtime) and fall back to
// the build-time inlined `process.env` values (so local `next dev` still works).

type PublicEnvKey =
  | 'NEXT_PUBLIC_SUPABASE_URL'
  | 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  | 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'NEXT_PUBLIC_PEXELS_API_KEY'
  | 'NEXT_PUBLIC_API_URL';

declare global {
  interface Window {
    __ENV?: Partial<Record<PublicEnvKey, string>>;
  }
}

// Referenced as literal member expressions so Next can statically inline them
// into the client bundle at build time (the local-dev / baked-in fallback).
const BUILD_TIME: Record<PublicEnvKey, string | undefined> = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_PEXELS_API_KEY: process.env.NEXT_PUBLIC_PEXELS_API_KEY,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
};

/** Read a public config value: runtime `window.__ENV` first, then build-time env. */
export function publicEnv(key: PublicEnvKey): string | undefined {
  if (typeof window !== 'undefined') {
    const runtime = window.__ENV?.[key];
    if (runtime) return runtime;
  }
  return BUILD_TIME[key] || undefined;
}
