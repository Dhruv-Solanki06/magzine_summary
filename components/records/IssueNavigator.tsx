import React from 'react';
import Link from 'next/link';
import { CheckCircle2, FileText, Layers, ListOrdered } from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import type { VolumeIssueNavItem } from '@/lib/server/records';
import { authorLabel, formatCount, formatIssueDate, issueLabel, magazineName } from '@/lib/format';

interface IssueNavigatorProps {
  record: RecordWithDetails;
  sameIssue: RecordWithDetails[];
  volumeIssues: VolumeIssueNavItem[];
}

function issueKey(value: string | null | undefined): string {
  return value?.trim() || '__unnumbered__';
}

const IssueNavigator: React.FC<IssueNavigatorProps> = ({
  record,
  sameIssue,
  volumeIssues,
}) => {
  const currentIssue = issueKey(record.number);
  const issueTitle = issueLabel(record) || 'Current issue';
  const recordsInIssue = sameIssue.length > 0 ? sameIssue : [record];

  return (
    <section className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 rounded-[14px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              Article order
            </p>
            <h2
              className="mt-1 text-[19px] font-bold tracking-[-0.2px] text-black/90"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              In this issue
            </h2>
          </div>
          <span className="text-sm text-black/45">{issueTitle}</span>
        </div>

        <div className="mt-4 divide-y divide-black/[0.06] overflow-hidden rounded-xl border border-black/[0.06]">
          {recordsInIssue.map((item) => {
            const active = item.id === record.id;
            return (
              <Link
                key={item.id}
                href={`/records/${item.id}`}
                aria-current={active ? 'page' : undefined}
                className={`group grid gap-3 px-3 py-3 transition sm:grid-cols-[78px_minmax(0,1fr)] sm:px-4 ${
                  active ? 'bg-black/[0.035]' : 'hover:bg-black/[0.02]'
                }`}
              >
                <span className="flex items-center gap-2 text-[12px] font-semibold text-black/45 sm:block sm:pt-0.5">
                  <span className="inline-flex h-7 min-w-12 items-center justify-center rounded-md bg-white px-2 tabular-nums ring-1 ring-black/[0.06]">
                    {item.page_numbers || '—'}
                  </span>
                  {active && (
                    <CheckCircle2 className="h-4 w-4 text-black/45 sm:mt-2 sm:block" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-black/82 group-hover:text-black">
                    {item.title_name || 'Untitled article'}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/45">
                    {authorLabel(item) && <span className="truncate">{authorLabel(item)}</span>}
                    {item.id === record.id && <span>Current article</span>}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <aside className="min-w-0 rounded-[14px] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-black/[0.04] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              Volume sequence
            </p>
            <h2
              className="mt-1 text-[19px] font-bold tracking-[-0.2px] text-black/90"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Vol. {record.volume || '—'}
            </h2>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/45">
            <ListOrdered className="h-5 w-5" />
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-black/48">
          {magazineName(record)}
          {volumeIssues.length > 0 && ` · ${formatCount(volumeIssues.length)} issues`}
        </p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-thin-light lg:max-h-[360px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
          {volumeIssues.map((issue) => {
            const active = issueKey(issue.number) === currentIssue;
            return (
              <Link
                key={`${issue.volume}-${issue.number ?? 'none'}`}
                href={`/records/${issue.firstRecordId}`}
                aria-current={active ? 'location' : undefined}
                className={`flex min-w-[172px] shrink-0 flex-col rounded-xl border px-3 py-3 transition lg:min-w-0 ${
                  active
                    ? 'border-black/20 bg-black text-white'
                    : 'border-black/[0.06] bg-white hover:border-black/15 hover:bg-black/[0.02]'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Layers className={`h-4 w-4 ${active ? 'text-white/70' : 'text-black/35'}`} />
                    {issue.label}
                  </span>
                  {active && <CheckCircle2 className="h-4 w-4 text-white/70" />}
                </span>
                <span className={`mt-2 text-xs ${active ? 'text-white/62' : 'text-black/45'}`}>
                  {formatCount(issue.recordCount)} articles
                  {issue.date && ` · ${formatIssueDate(issue.date)}`}
                </span>
                <span
                  className={`mt-1 flex items-center gap-1 truncate text-xs ${
                    active ? 'text-white/54' : 'text-black/40'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  {issue.pageStart ? `Starts p. ${issue.pageStart}` : issue.firstTitle || 'Open issue'}
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </section>
  );
};

export default IssueNavigator;
