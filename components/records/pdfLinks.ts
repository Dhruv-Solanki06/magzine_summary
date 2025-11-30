import { RecordWithDetails } from '@/types';

export function buildPdfViewUrl(rec: RecordWithDetails): string | null {
  const ensurePdfExt = (id: string) => (id.endsWith('.pdf') ? id : `${id}.pdf`);

  if (rec.pdf_public_id) {
    const id = ensurePdfExt(rec.pdf_public_id.trim());
    return `/api/pdf/view?id=${encodeURIComponent(id)}`;
  }

  if (!rec.pdf_url) {
    return null;
  }

  try {
    const url = new URL(rec.pdf_url);
    const parts = url.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((segment) => segment === 'upload');
    if (uploadIndex === -1) {
      return rec.pdf_url;
    }

    const afterUpload = parts.slice(uploadIndex + 1);
    let version: string | undefined;

    if (afterUpload[0] && /^v\d+$/i.test(afterUpload[0])) {
      version = afterUpload.shift()!.replace(/^v/i, '');
    }

    const publicIdWithExt = afterUpload.join('/');
    if (!publicIdWithExt.endsWith('.pdf')) {
      return rec.pdf_url;
    }

    const params = new URLSearchParams({ id: publicIdWithExt });
    if (version) {
      params.set('v', version);
    }

    return `/api/pdf/view?${params.toString()}`;
  } catch {
    return rec.pdf_url;
  }
}
