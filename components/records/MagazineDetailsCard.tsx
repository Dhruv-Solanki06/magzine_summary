import React from 'react';
import { FileText } from 'lucide-react';
import { RecordWithDetails } from '@/types';

interface MagazineDetailsCardProps {
  record: RecordWithDetails;
  imageUrl: string;
}

const MagazineDetailsCard: React.FC<MagazineDetailsCardProps> = ({ record, imageUrl }) => {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-lg ring-1 ring-slate-100 lg:sticky lg:top-24">
      <div className="overflow-hidden rounded-t-3xl">
        <img
          src={imageUrl}
          alt={record.name || 'Magazine cover'}
          className="h-64 w-full object-cover sm:h-72"
        />
      </div>
      <div className="space-y-4 p-6 sm:p-7 text-sm text-slate-600">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
            Journal Name
          </p>
          <p className="text-base font-medium text-slate-900">{record.name || 'Unknown'}</p>
        </div>

        {record.volume && record.number && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Volume &amp; Issue
            </p>
            <p className="text-base font-medium text-slate-900">
              Volume {record.volume}, No. {record.number}
            </p>
          </div>
        )}

        {record.timestamp && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Publication Year
            </p>
            <p className="text-base font-medium text-slate-900">
              {new Date(record.timestamp).getFullYear()}
            </p>
          </div>
        )}

        {record.page_numbers && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Pages
            </p>
            <p className="text-base font-medium text-slate-900">{record.page_numbers}</p>
          </div>
        )}

        {record.language && (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Language
            </p>
            <p className="text-base font-medium text-slate-900">{record.language}</p>
          </div>
        )}

        <div className="pt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600">
            <FileText className="h-4 w-4" />
            Read Full PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagazineDetailsCard;
