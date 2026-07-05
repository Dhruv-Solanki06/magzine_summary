import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { publicEnv } from '@/lib/public-env';

let browserClient: SupabaseClient | null = null;

// Resolved lazily (not at module load) so runtime-injected window.__ENV is used.
function resolvePublishableKey(): string | undefined {
  return (
    publicEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
    publicEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  );
}

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(publicEnv('NEXT_PUBLIC_SUPABASE_URL') && resolvePublishableKey());
}

export function getSupabaseAuthConfigError(): string | null {
  if (isSupabaseAuthConfigured()) return null;

  return [
    'Missing Supabase Auth browser configuration.',
    'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
    '(or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) in your environment.',
  ].join(' ');
}

export function getSupabaseBrowserClient(): SupabaseClient {
  const url = publicEnv('NEXT_PUBLIC_SUPABASE_URL');
  const publishableKey = resolvePublishableKey();

  if (!url || !publishableKey) {
    throw new Error(getSupabaseAuthConfigError() ?? 'Supabase Auth is not configured.');
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}
