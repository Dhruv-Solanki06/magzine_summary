// lib/uploadthing.ts — client-side UploadThing helpers.
import { generateReactHelpers } from '@uploadthing/react';
import type { OurFileRouter } from '@/pages/api/uploadthing';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

export const { useUploadThing, uploadFiles } =
  generateReactHelpers<OurFileRouter>();

/** Bearer header with the current Supabase access token, for upload auth. */
export async function uploadAuthHeaders(): Promise<Record<string, string>> {
  try {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {};
  } catch {
    return {};
  }
}
