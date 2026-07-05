// pages/api/uploadthing.ts — UploadThing file router (Pages Router).
// Reuses the existing UPLOADTHING_TOKEN. Uploads are gated: the client sends the
// Supabase access token as a Bearer header and we verify it here, so only
// signed-in users can upload avatars / work images.
import {
  createUploadthing,
  createRouteHandler,
  type FileRouter,
} from 'uploadthing/next-legacy';
import type { NextApiRequest } from 'next';
import { createClient } from '@supabase/supabase-js';

const f = createUploadthing();

async function requireUserId(req: NextApiRequest): Promise<string> {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new Error('Unauthorized');

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Unauthorized');
  return data.user.id;
}

export const ourFileRouter = {
  avatar: f({ image: { maxFileSize: '4MB', maxFileCount: 1 } })
    .middleware(async ({ req }) => ({ userId: await requireUserId(req) }))
    .onUploadComplete(({ file }) => ({ url: file.ufsUrl })),

  workImage: f({ image: { maxFileSize: '8MB', maxFileCount: 6 } })
    .middleware(async ({ req }) => ({ userId: await requireUserId(req) }))
    .onUploadComplete(({ file }) => ({ url: file.ufsUrl })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;

export default createRouteHandler({ router: ourFileRouter });
