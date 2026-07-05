'use client';

// pages/tracker.tsx — personal reading tracker + research notes.
// Shows a signed-in reader how much they've read (articles, time spent,
// completions, weekly activity), a reading history, and a lightweight research
// board where notes can be jotted down standalone or attached to an article.

import React, { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileText,
  LineChart,
  LogIn,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';

import Header from '@/components/common/Header';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  useReadingTracker,
  type NoteStatus,
  type ResearchNote,
} from '@/lib/useReadingTracker';
import { formatCount, formatDuration, formatRelativeTime } from '@/lib/format';
import { SITE_NAME } from '@/lib/brand';

const STATUS_ORDER: NoteStatus[] = ['idea', 'reading', 'done', 'archived'];

const STATUS_META: Record<NoteStatus, { label: string; pill: string }> = {
  idea: { label: 'Idea', pill: 'bg-amber-50 text-amber-700 ring-amber-600/15' },
  reading: { label: 'Reading', pill: 'bg-blue-50 text-blue-700 ring-blue-600/15' },
  done: { label: 'Done', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' },
  archived: { label: 'Archived', pill: 'bg-black/[0.04] text-black/50 ring-black/10' },
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/* --------------------------------- Stats --------------------------------- */

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[14px] border border-black/[0.06] bg-white p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-black/45">
        <Icon className="h-4 w-4" />
        <span className="text-[12px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tracking-[-0.5px] text-black/92">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[12.5px] text-black/45">{hint}</p>}
    </div>
  );
}

/* ------------------------------ Note composer ---------------------------- */

function NoteComposer({
  onAdd,
  attachment,
  onClearAttachment,
}: {
  onAdd: (input: {
    title: string;
    body: string;
    status: NoteStatus;
    recordId: number | null;
    recordTitle: string | null;
  }) => void;
  attachment: { recordId: number; recordTitle: string } | null;
  onClearAttachment: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<NoteStatus>('idea');

  const canSave = title.trim().length > 0 || body.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onAdd({
      title: title.trim() || 'Untitled note',
      body: body.trim(),
      status,
      recordId: attachment?.recordId ?? null,
      recordTitle: attachment?.recordTitle ?? null,
    });
    setTitle('');
    setBody('');
    setStatus('idea');
    onClearAttachment();
  };

  return (
    <div className="rounded-[14px] border border-black/[0.08] bg-white p-4 shadow-[var(--shadow-card)]">
      {attachment && (
        <div className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/[0.04] py-1 pl-3 pr-1.5 text-[12.5px] text-black/60">
          <FileText className="h-3.5 w-3.5 shrink-0 text-black/40" />
          <span className="truncate">Attached to “{attachment.recordTitle}”</span>
          <button
            type="button"
            onClick={onClearAttachment}
            aria-label="Detach article"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-black/40 hover:bg-black/[0.06] hover:text-black/70"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title (e.g. “Vedic chronology sources”)"
        className="w-full rounded-lg border border-black/10 px-3 py-2 text-[15px] font-medium text-black/85 outline-none transition focus:border-black/25"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What are you researching? Jot down thoughts, questions, references…"
        rows={3}
        className="mt-2 w-full resize-y rounded-lg border border-black/10 px-3 py-2 text-[14.5px] leading-6 text-black/75 outline-none transition focus:border-black/25"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 transition ${
                status === s
                  ? STATUS_META[s].pill
                  : 'bg-white text-black/50 ring-black/10 hover:text-black/75'
              }`}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!canSave}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#171717] px-4 text-sm font-medium text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          Add note
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Note card ------------------------------ */

function NoteCard({
  note,
  onUpdate,
  onRemove,
}: {
  note: ResearchNote;
  onUpdate: (id: string, patch: Partial<{ title: string; body: string; status: NoteStatus }>) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);

  const save = () => {
    onUpdate(note.id, { title: title.trim() || 'Untitled note', body: body.trim() });
    setEditing(false);
  };

  return (
    <div className="rounded-[14px] border border-black/[0.06] bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-black/15">
      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-[15px] font-semibold text-black/85 outline-none focus:border-black/25"
          />
        ) : (
          <h3 className="min-w-0 flex-1 text-[15.5px] font-semibold tracking-[-0.2px] text-black/90">
            {note.title}
          </h3>
        )}

        <div className="flex shrink-0 items-center gap-1">
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit note"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-black/70"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(note.id)}
            aria-label="Delete note"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-black/40 transition hover:bg-black/[0.05] hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="mt-2 w-full resize-y rounded-lg border border-black/10 px-2.5 py-2 text-[14.5px] leading-6 text-black/75 outline-none focus:border-black/25"
        />
      ) : (
        note.body && (
          <p className="mt-1.5 whitespace-pre-line text-[14.5px] leading-6 text-black/60">
            {note.body}
          </p>
        )
      )}

      {note.recordId && (
        <Link
          href={`/records/${note.recordId}`}
          className="mt-2.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-black/[0.04] py-1 pl-2.5 pr-3 text-[12.5px] text-black/60 transition hover:bg-black/[0.07] hover:text-black/85"
        >
          <FileText className="h-3.5 w-3.5 shrink-0 text-black/40" />
          <span className="truncate">{note.recordTitle || `Article ${note.recordId}`}</span>
        </Link>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-black/[0.05] pt-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-[#171717] px-3.5 py-1.5 text-[13px] font-medium text-white transition hover:bg-black/85"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(note.title);
                setBody(note.body);
                setEditing(false);
              }}
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-black/50 transition hover:text-black/80"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onUpdate(note.id, { status: s })}
                className={`rounded-full px-2.5 py-1 text-[12px] font-medium ring-1 transition ${
                  note.status === s
                    ? STATUS_META[s].pill
                    : 'bg-white text-black/40 ring-black/[0.08] hover:text-black/70'
                }`}
              >
                {STATUS_META[s].label}
              </button>
            ))}
          </div>
        )}
        <span className="text-[12px] text-black/35">{formatRelativeTime(note.updatedAt)}</span>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

function SignedOut() {
  return (
    <div className="mt-8 flex flex-col items-center rounded-[14px] border border-dashed border-black/10 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04]">
        <LineChart className="h-6 w-6 text-black/40" />
      </div>
      <h3 className="text-base font-semibold text-black/80">Log in to open your tracker</h3>
      <p className="mt-1 max-w-sm text-sm text-black/50">
        Your reading time, history and research notes are saved to your account and synced
        across devices.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          href="/login?next=/tracker"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#171717] px-4 text-sm font-medium text-white hover:bg-black/85"
        >
          <LogIn className="h-4 w-4" />
          Log in
        </Link>
        <Link
          href="/signup?next=/tracker"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-black/10 px-4 text-sm font-medium text-black/75 hover:border-black/20 hover:text-black/90"
        >
          <UserPlus className="h-4 w-4" />
          Create an account
        </Link>
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const { user } = useAuth();
  const { progress, notes, loading, addNote, updateNote, removeNote } = useReadingTracker();

  const [statusFilter, setStatusFilter] = useState<NoteStatus | 'all'>('all');
  const [attachment, setAttachment] = useState<{ recordId: number; recordTitle: string } | null>(
    null,
  );

  const stats = useMemo(() => {
    const totalSeconds = progress.reduce((sum, p) => sum + p.readSeconds, 0);
    const completed = progress.filter((p) => p.completed).length;
    const now = Date.now();
    const thisWeek = progress.filter(
      (p) => p.lastReadAt && now - new Date(p.lastReadAt).getTime() < WEEK_MS,
    ).length;
    return { totalSeconds, completed, thisWeek };
  }, [progress]);

  const filteredNotes = useMemo(
    () => (statusFilter === 'all' ? notes : notes.filter((n) => n.status === statusFilter)),
    [notes, statusFilter],
  );

  const scrollToComposer = () => {
    if (typeof document === 'undefined') return;
    document.getElementById('note-composer')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <>
      <Head>
        <title>{`Research tracker | ${SITE_NAME}`}</title>
        <meta name="description" content="Track your reading time, history and research notes." />
      </Head>
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto w-full max-w-[1000px] px-4 pb-20 pt-8 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-black/[0.04] text-black/60">
              <LineChart className="h-5 w-5" />
            </span>
            <div>
              <h1
                className="text-[28px] font-bold leading-none tracking-[-0.4px] text-black/92"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                Research tracker
              </h1>
              <p className="mt-1.5 text-[14.5px] text-black/54">
                Your reading activity and research notes, all in one place.
              </p>
            </div>
          </div>

          {!user ? (
            <SignedOut />
          ) : (
            <>
              {/* Stats */}
              <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  icon={BookOpenCheck}
                  label="Articles read"
                  value={formatCount(progress.length)}
                />
                <StatCard
                  icon={Clock3}
                  label="Time reading"
                  value={formatDuration(stats.totalSeconds)}
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Completed"
                  value={formatCount(stats.completed)}
                  hint={progress.length ? `${stats.completed} of ${progress.length}` : undefined}
                />
                <StatCard
                  icon={LineChart}
                  label="This week"
                  value={formatCount(stats.thisWeek)}
                  hint="articles opened"
                />
              </section>

              <div className="mt-9 grid gap-9 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Reading history */}
                <section>
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-black/45">
                    Reading history
                  </h2>
                  {progress.length === 0 ? (
                    <div className="mt-3 rounded-[14px] border border-dashed border-black/10 px-4 py-10 text-center">
                      <p className="text-sm font-medium text-black/70">
                        {loading ? 'Loading your activity…' : 'No reading activity yet'}
                      </p>
                      <p className="mt-1 text-[13px] text-black/45">
                        Open any article and your time spent will show up here.
                      </p>
                      <Link
                        href="/"
                        className="mt-4 inline-block rounded-full bg-[#171717] px-4 py-2 text-sm font-medium text-white hover:bg-black/85"
                      >
                        Browse articles
                      </Link>
                    </div>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {progress.map((p) => (
                        <li
                          key={p.recordId}
                          className="rounded-xl border border-black/[0.06] bg-white px-4 py-3 transition hover:border-black/15"
                        >
                          <div className="flex items-start gap-3">
                            <Link href={`/records/${p.recordId}`} className="min-w-0 flex-1">
                              <span className="block truncate text-[15px] font-medium text-black/85">
                                {p.title}
                              </span>
                              {p.magazine && (
                                <span className="block truncate text-[13px] text-black/45">
                                  {p.magazine}
                                </span>
                              )}
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setAttachment({ recordId: p.recordId, recordTitle: p.title });
                                scrollToComposer();
                              }}
                              className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-black/10 px-2.5 text-[12.5px] font-medium text-black/55 transition hover:border-black/20 hover:text-black/85"
                            >
                              <NotebookPen className="h-3.5 w-3.5" />
                              Note
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-black/45">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {formatDuration(p.readSeconds)}
                            </span>
                            <span>
                              {p.openCount} {p.openCount === 1 ? 'open' : 'opens'}
                            </span>
                            {p.completed && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 ring-1 ring-emerald-600/15">
                                <CheckCircle2 className="h-3 w-3" />
                                Completed
                              </span>
                            )}
                            <span className="ml-auto">{formatRelativeTime(p.lastReadAt)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Research notes */}
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-black/45">
                      Research notes
                    </h2>
                    <span className="text-[12.5px] text-black/40">
                      {formatCount(notes.length)} {notes.length === 1 ? 'note' : 'notes'}
                    </span>
                  </div>

                  <div id="note-composer" className="mt-3 scroll-mt-24">
                    <NoteComposer
                      onAdd={(input) => void addNote(input)}
                      attachment={attachment}
                      onClearAttachment={() => setAttachment(null)}
                    />
                  </div>

                  {/* Status filter */}
                  {notes.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 transition ${
                          statusFilter === 'all'
                            ? 'bg-black/[0.06] text-black/80 ring-black/10'
                            : 'bg-white text-black/45 ring-black/[0.08] hover:text-black/70'
                        }`}
                      >
                        All
                      </button>
                      {STATUS_ORDER.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatusFilter(s)}
                          className={`rounded-full px-3 py-1 text-[12.5px] font-medium ring-1 transition ${
                            statusFilter === s
                              ? STATUS_META[s].pill
                              : 'bg-white text-black/45 ring-black/[0.08] hover:text-black/70'
                          }`}
                        >
                          {STATUS_META[s].label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {filteredNotes.length === 0 ? (
                      <p className="rounded-[14px] border border-dashed border-black/10 px-4 py-8 text-center text-[13px] text-black/45">
                        {notes.length === 0
                          ? 'No notes yet — capture your first research thought above.'
                          : 'No notes with this status.'}
                      </p>
                    ) : (
                      filteredNotes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          onUpdate={updateNote}
                          onRemove={removeNote}
                        />
                      ))
                    )}
                  </div>
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </>
  );
}
