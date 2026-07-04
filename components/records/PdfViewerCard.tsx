'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import { buildPdfViewUrl } from './pdfLinks';

interface PdfViewerCardProps {
  record: RecordWithDetails;
}

function inlinePdfSrc(url: string): string {
  const [base] = url.split('#');
  return `${base}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

function withCheckParam(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}check=1`;
}

const PdfViewerCard: React.FC<PdfViewerCardProps> = ({ record }) => {
  const pdfViewUrl = useMemo(() => buildPdfViewUrl(record), [record]);
  const [status, setStatus] = useState<'checking' | 'ready' | 'missing'>(
    pdfViewUrl ? 'checking' : 'missing',
  );

  useEffect(() => {
    let cancelled = false;
    setStatus(pdfViewUrl ? 'checking' : 'missing');
    if (!pdfViewUrl) return;

    if (!pdfViewUrl.startsWith('/api/pdf/view')) {
      setStatus('ready');
      return;
    }

    fetch(withCheckParam(pdfViewUrl))
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!cancelled) setStatus(payload?.available ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [pdfViewUrl]);

  return (
    <section
      id="original-pdf"
      className="overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-black/[0.06] px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-black/86">
            <FileText className="h-4 w-4 text-black/40" />
            Original PDF
          </h2>
          <p className="mt-0.5 text-xs text-black/45">Inline viewer</p>
        </div>
        {status === 'ready' && (
          <span className="shrink-0 rounded-full bg-black/[0.05] px-2.5 py-1 text-xs font-medium text-black/55">
            View only
          </span>
        )}
      </div>

      {status === 'checking' ? (
        <div className="flex min-h-[180px] items-center justify-center px-6 py-12 text-center">
          <div>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04]">
              <FileText className="h-5 w-5 text-black/35" />
            </div>
            <p className="mt-3 text-sm font-medium text-black/70">Checking source PDF</p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-black/45">
              The viewer will load here if the archive file is reachable.
            </p>
          </div>
        </div>
      ) : status === 'ready' && pdfViewUrl ? (
        <div className="bg-black/[0.03] p-2 sm:p-3">
          <iframe
            title={`${record.title_name || 'Article'} PDF`}
            src={inlinePdfSrc(pdfViewUrl)}
            className="h-[68vh] min-h-[430px] w-full rounded-[10px] border-0 bg-white sm:min-h-[560px] lg:h-[760px]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="flex min-h-[180px] items-center justify-center px-6 py-12 text-center">
          <div>
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/[0.04]">
              <FileText className="h-5 w-5 text-black/35" />
            </div>
            <p className="mt-3 text-sm font-medium text-black/70">PDF unavailable</p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-black/45">
              The archive record does not currently include a viewable source PDF.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default PdfViewerCard;
