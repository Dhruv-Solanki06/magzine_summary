import { RecordWithDetails } from '@/types';

/**
 * PDFs are stored on UploadThing (see kkms/pdf_proj: `pdf_url` is the ufsUrl,
 * `pdf_public_id` is the UploadThing file key). Those URLs are public, served
 * as `application/pdf` inline with `access-control-allow-origin: *` and no
 * X-Frame-Options, so they embed directly in an <iframe> — no proxy needed.
 */
export function buildPdfViewUrl(
  rec: Pick<RecordWithDetails, 'pdf_url' | 'pdf_public_id'>,
): string | null {
  const url = rec.pdf_url?.trim();
  if (url && /^https?:\/\//i.test(url)) {
    return url;
  }

  // Fallback: reconstruct the UploadThing file URL from the stored key.
  const key = rec.pdf_public_id?.trim();
  if (key) {
    return `https://utfs.io/f/${encodeURIComponent(key)}`;
  }

  return null;
}
