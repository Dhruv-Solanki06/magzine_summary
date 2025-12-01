import React from 'react';
import Link from 'next/link';

interface IssueRecord {
  id: number;
  title: string;
  authorsLabel?: string;
  pageLabel?: string;
}

interface IssueContentsSectionProps {
  magazineName: string;
  volumeLabel?: string;
  numberLabel?: string;
  timestampLabel?: string;
  currentRecordId: number;
  records: IssueRecord[];
}

const IssueContentsSection: React.FC<IssueContentsSectionProps> = ({
  magazineName,
  volumeLabel,
  numberLabel,
  timestampLabel,
  currentRecordId,
  records,
}) => {
  if (!records || records.length === 0) return null;

  return (
    <section className="mt-10 rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-slate-900">More from this Issue</h2>
          <p className="text-sm text-slate-500">
            {magazineName}
            {volumeLabel && ` · ${volumeLabel}`}
            {numberLabel && ` · ${numberLabel}`}
            {timestampLabel && ` · ${timestampLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
          {volumeLabel && (
            <span className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
              {volumeLabel}
            </span>
          )}
          {numberLabel && (
            <span className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
              {numberLabel}
            </span>
          )}
          {timestampLabel && (
            <span className="rounded-full bg-slate-100 px-3 py-1 ring-1 ring-slate-200">
              {timestampLabel}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {records.map((rec, index) => {
          const isCurrent = rec.id === currentRecordId;

          const row = (
            <div
              className={`group relative flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm transition ${
                isCurrent
                  ? 'border-blue-200 bg-blue-50/70 shadow-sm ring-1 ring-blue-100'
                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <p
                    className={`line-clamp-2 text-sm font-semibold ${
                      isCurrent ? 'text-blue-900' : 'text-slate-900 group-hover:text-blue-800'
                    }`}
                  >
                    {rec.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {rec.authorsLabel && <span className="line-clamp-1">{rec.authorsLabel}</span>}
                    {rec.pageLabel && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{rec.pageLabel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {isCurrent && (
                <div className="flex items-center gap-2 pl-10 text-xs font-semibold text-blue-700">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  You’re reading this article
                </div>
              )}
            </div>
          );

          if (isCurrent) {
            return <div key={rec.id}>{row}</div>;
          }

          return (
            <Link key={rec.id} href={`/records/${rec.id}`} className="block">
              {row}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default IssueContentsSection;
