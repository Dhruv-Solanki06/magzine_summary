import React from 'react';
import Link from 'next/link';
import { FileText } from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import { buildPdfViewUrl } from './pdfLinks';
import Cover from '@/components/common/Cover';
import {
  formatIssueDate,
  formatLanguage,
  issueLabel,
  magazineName,
  magazineSlug,
} from '@/lib/format';

interface MagazineDetailsCardProps {
  record: RecordWithDetails;
}

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 border-t border-black/[0.06] py-2.5 first:border-t-0">
    <span className="text-[13px] text-black/45">{label}</span>
    <span className="max-w-[60%] text-right text-[13px] font-medium text-black/80">{children}</span>
  </div>
);

const MagazineDetailsCard: React.FC<MagazineDetailsCardProps> = ({ record }) => {
  const pdfViewUrl = buildPdfViewUrl(record);
  const mag = magazineName(record);
  const slug = magazineSlug(record);
  const issue = issueLabel(record);
  const date = formatIssueDate(record.timestamp);
  const language = formatLanguage(record.language_legacy);

  return (
    <div className="overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] lg:sticky lg:top-24">
      <div className="aspect-[16/10] w-full">
        <Cover
          seed={record.magazine_id ?? mag}
          title={mag}
          subtitle={issue || date}
          imageUrl={record.magazines?.cover_image_url}
          rounded="rounded-none"
        />
      </div>

      <div className="p-5">
        <div className="pb-1">
          {slug ? (
            <Link
              href={`/magazines/${slug}`}
              className="inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-black/55 hover:text-black/80"
            >
              {mag}
            </Link>
          ) : (
            <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-black/55">
              {mag}
            </span>
          )}
        </div>

        <div className="mt-2">
          {(record.volume || record.number) && <Row label="Issue">{issueLabel(record) || '—'}</Row>}
          {date && <Row label="Published">{date}</Row>}
          {record.page_numbers && <Row label="Pages">{record.page_numbers}</Row>}
          {language && <Row label="Language">{language}</Row>}
        </div>

        <div className="mt-4">
          {pdfViewUrl ? (
            <a
              href="#original-pdf"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#171717] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
            >
              <FileText className="h-4 w-4" />
              View original PDF
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-black/[0.05] px-4 py-2.5 text-sm font-medium text-black/40"
            >
              <FileText className="h-4 w-4" />
              PDF unavailable
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MagazineDetailsCard;
