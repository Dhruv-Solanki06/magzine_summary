'use client';

// lib/useReadingTracker.tsx
// Per-user reading tracker + research notes, backed by Supabase (RLS-isolated
// per user) — NOT localStorage. Tracks how long each article was read, how many
// times it was opened, whether it was read to the end, and lets a user keep
// lightweight research notes (standalone or attached to an article).
//
// Everything is scoped to the signed-in user and cleared on sign-out. Signed-out
// visitors are never tracked and cannot create notes.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/auth-client';

export interface ReadingProgress {
  recordId: number;
  title: string;
  magazine: string | null;
  readSeconds: number;
  openCount: number;
  completed: boolean;
  firstReadAt: string | null;
  lastReadAt: string | null;
}

export type NoteStatus = 'idea' | 'reading' | 'done' | 'archived';

export interface ResearchNote {
  id: string;
  recordId: number | null;
  recordTitle: string | null;
  title: string;
  body: string;
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
}

export interface NewNoteInput {
  title?: string;
  body?: string;
  status?: NoteStatus;
  recordId?: number | null;
  recordTitle?: string | null;
}

interface RecordReadingOptions {
  title?: string;
  magazine?: string | null;
  opened?: boolean;
  completed?: boolean;
}

interface ReadingTrackerContextValue {
  progress: ReadingProgress[];
  notes: ResearchNote[];
  loading: boolean;
  recordReadingTime: (
    recordId: number,
    seconds: number,
    options?: RecordReadingOptions,
  ) => void;
  addNote: (input: NewNoteInput) => Promise<ResearchNote | null>;
  updateNote: (id: string, patch: Partial<NewNoteInput>) => void;
  removeNote: (id: string) => void;
}

const ReadingTrackerContext = createContext<ReadingTrackerContextValue | undefined>(
  undefined,
);

interface ProgressRow {
  record_id: number | string;
  title: string | null;
  magazine: string | null;
  read_seconds: number | null;
  open_count: number | null;
  completed: boolean | null;
  first_read_at: string | null;
  last_read_at: string | null;
}

interface NoteRow {
  id: string;
  record_id: number | string | null;
  record_title: string | null;
  title: string | null;
  body: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

function mapProgress(row: ProgressRow): ReadingProgress {
  return {
    recordId: Number(row.record_id),
    title: row.title || `Article ${row.record_id}`,
    magazine: row.magazine ?? null,
    readSeconds: Number(row.read_seconds ?? 0),
    openCount: Number(row.open_count ?? 0),
    completed: Boolean(row.completed),
    firstReadAt: row.first_read_at,
    lastReadAt: row.last_read_at,
  };
}

function mapNote(row: NoteRow): ResearchNote {
  const status = (row.status ?? 'idea') as NoteStatus;
  return {
    id: row.id,
    recordId: row.record_id != null ? Number(row.record_id) : null,
    recordTitle: row.record_title ?? null,
    title: row.title || 'Untitled note',
    body: row.body ?? '',
    status: (['idea', 'reading', 'done', 'archived'] as const).includes(status)
      ? status
      : 'idea',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ReadingTrackerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [loading, setLoading] = useState(false);

  // Load (or clear) the signed-in user's tracker data when the account changes.
  useEffect(() => {
    if (!userId) {
      setProgress([]);
      setNotes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    (async () => {
      const [progressRes, notesRes] = await Promise.all([
        supabase
          .from('reading_progress')
          .select(
            'record_id, title, magazine, read_seconds, open_count, completed, first_read_at, last_read_at',
          )
          .order('last_read_at', { ascending: false }),
        supabase
          .from('research_notes')
          .select(
            'id, record_id, record_title, title, body, status, created_at, updated_at',
          )
          .order('updated_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (!progressRes.error && progressRes.data) {
        setProgress((progressRes.data as ProgressRow[]).map(mapProgress));
      }
      if (!notesRes.error && notesRes.data) {
        setNotes((notesRes.data as NoteRow[]).map(mapNote));
      }
      setLoading(false);
    })().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const recordReadingTime = useCallback(
    (recordId: number, seconds: number, options: RecordReadingOptions = {}) => {
      if (!userId) return;
      const secs = Math.max(0, Math.round(seconds));
      const opened = Boolean(options.opened);
      const completed = Boolean(options.completed);
      if (secs === 0 && !opened && !completed) return;

      const nowIso = new Date().toISOString();

      // Optimistic local update so the tracker reflects activity immediately.
      setProgress((prev) => {
        const idx = prev.findIndex((p) => p.recordId === recordId);
        if (idx === -1) {
          const entry: ReadingProgress = {
            recordId,
            title: options.title || `Article ${recordId}`,
            magazine: options.magazine ?? null,
            readSeconds: secs,
            openCount: opened ? 1 : 0,
            completed,
            firstReadAt: nowIso,
            lastReadAt: nowIso,
          };
          return [entry, ...prev];
        }
        const next = [...prev];
        const current = next[idx];
        next[idx] = {
          ...current,
          title: options.title || current.title,
          magazine: options.magazine ?? current.magazine,
          readSeconds: current.readSeconds + secs,
          openCount: current.openCount + (opened ? 1 : 0),
          completed: current.completed || completed,
          lastReadAt: nowIso,
        };
        // Re-sort so most recently read floats to the top.
        next.sort(
          (a, b) =>
            new Date(b.lastReadAt ?? 0).getTime() - new Date(a.lastReadAt ?? 0).getTime(),
        );
        return next;
      });

      const supabase = getSupabaseBrowserClient();
      void supabase
        .rpc('log_reading', {
          p_record_id: recordId,
          p_seconds: secs,
          p_title: options.title ?? null,
          p_magazine: options.magazine ?? null,
          p_opened: opened,
          p_completed: completed,
        })
        .then(({ error }) => {
          // Swallow errors (e.g. migration not yet applied) — tracking is
          // best-effort and must never break the reading experience.
          if (error && process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('log_reading failed:', error.message);
          }
        });
    },
    [userId],
  );

  const addNote = useCallback(
    async (input: NewNoteInput): Promise<ResearchNote | null> => {
      if (!userId) return null;
      const supabase = getSupabaseBrowserClient();
      const payload = {
        user_id: userId,
        record_id: input.recordId ?? null,
        record_title: input.recordTitle ?? null,
        title: input.title?.trim() || 'Untitled note',
        body: input.body ?? '',
        status: input.status ?? 'idea',
      };

      const { data, error } = await supabase
        .from('research_notes')
        .insert(payload)
        .select(
          'id, record_id, record_title, title, body, status, created_at, updated_at',
        )
        .single();

      if (error || !data) return null;
      const note = mapNote(data as NoteRow);
      setNotes((prev) => [note, ...prev]);
      return note;
    },
    [userId],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<NewNoteInput>) => {
      if (!userId) return;
      const nowIso = new Date().toISOString();
      let previous: ResearchNote | undefined;

      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          previous = n;
          return {
            ...n,
            title: patch.title !== undefined ? patch.title || 'Untitled note' : n.title,
            body: patch.body !== undefined ? patch.body : n.body,
            status: patch.status ?? n.status,
            recordId: patch.recordId !== undefined ? patch.recordId : n.recordId,
            recordTitle:
              patch.recordTitle !== undefined ? patch.recordTitle : n.recordTitle,
            updatedAt: nowIso,
          };
        }),
      );

      const dbPatch: globalThis.Record<string, unknown> = { updated_at: nowIso };
      if (patch.title !== undefined) dbPatch.title = patch.title || 'Untitled note';
      if (patch.body !== undefined) dbPatch.body = patch.body;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.recordId !== undefined) dbPatch.record_id = patch.recordId;
      if (patch.recordTitle !== undefined) dbPatch.record_title = patch.recordTitle;

      const supabase = getSupabaseBrowserClient();
      void supabase
        .from('research_notes')
        .update(dbPatch)
        .eq('user_id', userId)
        .eq('id', id)
        .then(({ error }) => {
          if (error && previous) {
            const restore = previous;
            setNotes((prev) => prev.map((n) => (n.id === id ? restore : n)));
          }
        });
    },
    [userId],
  );

  const removeNote = useCallback(
    (id: string) => {
      if (!userId) return;
      let previous: ResearchNote[] = [];
      setNotes((prev) => {
        previous = prev;
        return prev.filter((n) => n.id !== id);
      });
      const supabase = getSupabaseBrowserClient();
      void supabase
        .from('research_notes')
        .delete()
        .eq('user_id', userId)
        .eq('id', id)
        .then(({ error }) => {
          if (error) setNotes(previous);
        });
    },
    [userId],
  );

  const value = useMemo<ReadingTrackerContextValue>(
    () => ({
      progress,
      notes,
      loading,
      recordReadingTime,
      addNote,
      updateNote,
      removeNote,
    }),
    [progress, notes, loading, recordReadingTime, addNote, updateNote, removeNote],
  );

  return (
    <ReadingTrackerContext.Provider value={value}>
      {children}
    </ReadingTrackerContext.Provider>
  );
}

export function useReadingTracker(): ReadingTrackerContextValue {
  const ctx = useContext(ReadingTrackerContext);
  if (!ctx) {
    throw new Error('useReadingTracker must be used inside ReadingTrackerProvider.');
  }
  return ctx;
}

/**
 * Mount on an article page to track reading time. Accrues active (tab-visible)
 * seconds, flushes them to Supabase periodically and on unmount/hide, marks the
 * article opened once, and marks it "completed" when the reader scrolls to the
 * end. No-ops for signed-out visitors.
 */
export function useArticleReadingTimer(
  recordId: number | null | undefined,
  title: string,
  magazine: string | null,
) {
  const { recordReadingTime } = useReadingTracker();
  const { user } = useAuth();

  // Keep the latest labels without retriggering the effect.
  const metaRef = useRef({ title, magazine });
  metaRef.current = { title, magazine };

  useEffect(() => {
    if (!user || !recordId) return;

    const TICK_MS = 5000;
    const FLUSH_EVERY_TICKS = 3; // ~15s between DB writes
    let pending = 0; // accrued, unflushed seconds
    let ticks = 0;
    let completed = false;

    const flush = (markComplete = false) => {
      const secs = pending;
      const done = completed || markComplete;
      if (secs <= 0 && !done) return;
      pending = 0;
      recordReadingTime(recordId, secs, {
        title: metaRef.current.title,
        magazine: metaRef.current.magazine,
        opened: false,
        completed: done,
      });
    };

    // Register the open immediately.
    recordReadingTime(recordId, 0, {
      title: metaRef.current.title,
      magazine: metaRef.current.magazine,
      opened: true,
    });

    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        pending += TICK_MS / 1000;
        ticks += 1;
        if (ticks % FLUSH_EVERY_TICKS === 0) flush();
      }
    }, TICK_MS);

    const onScroll = () => {
      if (completed) return;
      const doc = document.documentElement;
      const reached = window.scrollY + window.innerHeight;
      // Only mark complete on pages long enough to actually scroll.
      if (doc.scrollHeight > 700 && reached >= doc.scrollHeight - 240) {
        completed = true;
        flush(true);
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
      flush();
    };
    // Restart tracking only when the account or the article changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, recordId, recordReadingTime]);
}
