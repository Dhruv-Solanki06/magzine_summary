'use client';

// components/records/ReportContentButton.tsx
// Logged-in-only "Report / suggest an edit" flow for an article. Signed-out
// visitors are gated behind the existing AuthRequiredModal; signed-in users get
// a form that logs a row into public.content_reports (note, suggested change,
// record id, email, client id, page URL, user agent, …) for the admin panel to
// review and act on later.

import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flag, Loader2, X } from 'lucide-react';

import { useAuth } from '@/components/auth/AuthProvider';
import AuthRequiredModal from '@/components/auth/AuthRequiredModal';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';
import { getClientId } from '@/lib/clientId';

interface ReportContentButtonProps {
  recordId: number;
  recordTitle: string;
  className?: string;
}

type ReportType = 'correction' | 'inaccuracy' | 'broken_link' | 'inappropriate' | 'other';

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: 'correction', label: 'Suggest a correction' },
  { value: 'inaccuracy', label: 'Incorrect information' },
  { value: 'broken_link', label: 'Broken link / PDF' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Something else' },
];

// Sections of an article a reader might flag. Free-form "Other" is always last.
const FIELD_OPTIONS = [
  '',
  'Title',
  'Author(s)',
  'Summary',
  'Conclusion',
  'Publication date',
  'Language',
  'Volume / Issue',
  'Page numbers',
  'Tags / topics',
  'PDF / links',
  'Other',
];

export default function ReportContentButton({
  recordId,
  recordTitle,
  className,
}: ReportContentButtonProps) {
  const { user } = useAuth();

  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const [reportType, setReportType] = useState<ReportType>('correction');
  const [field, setField] = useState('');
  const [suggestedValue, setSuggestedValue] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Close on Escape while the form dialog is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const resetForm = () => {
    setReportType('correction');
    setField('');
    setSuggestedValue('');
    setNote('');
    setError('');
    setDone(false);
    setSubmitting(false);
  };

  const handleTrigger = () => {
    if (!user) {
      setAuthGateOpen(true);
      return;
    }
    resetForm();
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      setOpen(false);
      setAuthGateOpen(true);
      return;
    }
    if (!note.trim()) {
      setError('Please describe the issue so we can act on it.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: insertError } = await supabase.from('content_reports').insert({
        user_id: user.id,
        email: user.email ?? null,
        record_id: recordId,
        record_title: recordTitle,
        report_type: reportType,
        field: field || null,
        suggested_value: suggestedValue.trim() || null,
        note: note.trim(),
        page_url: typeof window !== 'undefined' ? window.location.href : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        client_id: getClientId(),
      });

      if (insertError) {
        setError(
          "Couldn't submit your report. Please try again in a moment." ,
        );
        setSubmitting(false);
        return;
      }

      setDone(true);
      setSubmitting(false);
    } catch {
      setError("Couldn't submit your report. Please try again in a moment.");
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-black/10 px-3 py-2 text-[14.5px] text-black/80 outline-none transition focus:border-black/25';

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className={
          className ??
          'inline-flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-sm font-medium text-black/58 transition hover:border-black/20 hover:text-black/86'
        }
        title="Report an issue or suggest an edit"
      >
        <Flag className="h-4 w-4" />
        Report / suggest edit
      </button>

      {/* Auth gate for signed-out visitors */}
      <AuthRequiredModal
        open={authGateOpen}
        action="report content"
        onClose={() => setAuthGateOpen(false)}
      />

      {/* Report form */}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-title"
          onClick={close}
        >
          <div
            className="animate-pop-in flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-pop)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-black/[0.06] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-black/60">
                  <Flag className="h-4 w-4" />
                </span>
                <div>
                  <h2
                    id="report-title"
                    className="text-[16px] font-bold tracking-[-0.2px] text-black/92"
                    style={{ fontFamily: 'var(--font-heading)' }}
                  >
                    Report / suggest an edit
                  </h2>
                  <p className="mt-0.5 max-w-[22rem] truncate text-[12.5px] text-black/45">
                    {recordTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-black/90">
                  Thanks — your report was logged
                </h3>
                <p className="mt-1.5 max-w-sm text-[14px] leading-6 text-black/55">
                  Our team will review the suggestion and make corrections where needed.
                  You can view your submissions anytime from your account.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-5 rounded-full bg-[#171717] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black/85"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="scrollbar-thin-light flex-1 overflow-y-auto px-5 py-4">
                {/* Report type */}
                <label className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-black/45">
                  What&apos;s the issue?
                </label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {REPORT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setReportType(t.value)}
                      className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ring-1 transition ${
                        reportType === t.value
                          ? 'bg-black/[0.06] text-black/85 ring-black/15'
                          : 'bg-white text-black/50 ring-black/[0.08] hover:text-black/75'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Field */}
                <label className="mt-4 block text-[12.5px] font-semibold uppercase tracking-[0.1em] text-black/45">
                  Which part? <span className="font-normal normal-case text-black/35">(optional)</span>
                </label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className={`mt-2 ${inputClass}`}
                >
                  {FIELD_OPTIONS.map((f) => (
                    <option key={f || 'general'} value={f}>
                      {f || 'General / whole article'}
                    </option>
                  ))}
                </select>

                {/* Suggested value */}
                <label className="mt-4 block text-[12.5px] font-semibold uppercase tracking-[0.1em] text-black/45">
                  Suggested correction{' '}
                  <span className="font-normal normal-case text-black/35">(optional)</span>
                </label>
                <textarea
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  rows={2}
                  placeholder="What should it say instead?"
                  className={`mt-2 resize-y ${inputClass}`}
                />

                {/* Note */}
                <label className="mt-4 block text-[12.5px] font-semibold uppercase tracking-[0.1em] text-black/45">
                  Details <span className="font-normal normal-case text-rose-500/70">required</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    if (error) setError('');
                  }}
                  rows={4}
                  placeholder="Describe what's incorrect and, if you can, cite a source…"
                  className={`mt-2 resize-y ${inputClass}`}
                />

                {error && (
                  <p className="mt-3 flex items-center gap-1.5 text-[13px] text-rose-600">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {error}
                  </p>
                )}

                <p className="mt-3 text-[12px] leading-5 text-black/40">
                  Submitting as <span className="font-medium text-black/60">{user?.email ?? 'your account'}</span>.
                  Your email and browser info are attached so the team can follow up.
                </p>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-black/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-full px-4 py-2 text-sm font-medium text-black/55 transition hover:text-black/85"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !note.trim()}
                    className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      'Submit report'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
