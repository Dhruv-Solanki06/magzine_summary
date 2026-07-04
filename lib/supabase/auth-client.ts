import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && publishableKey);
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
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

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
