// lib/format.ts — small display helpers shared across the UI.
import type { RecordWithDetails } from '@/types';

const LANGUAGE_LABELS: globalThis.Record<string, string> = {
  hin: 'Hindi',
  hindi: 'Hindi',
  eng: 'English',
  english: 'English',
  npi: 'Nepali',
  mag: 'Magahi',
  lin: 'Lingala',
  gujarati: 'Gujarati',
  sanskrit: 'Sanskrit',
  prakrit: 'Prakrit',
  kannada: 'Kannada',
};

/** Normalise the many spellings/casings of language_legacy into a display label. */
export function formatLanguage(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .split(',')
    .map((part) => {
      const key = part.trim().toLowerCase();
      return LANGUAGE_LABELS[key] ?? part.trim();
    })
    .filter(Boolean)
    .join(', ');
}

/** Pull a 4-digit year out of the free-form timestamp ("1998", "April 1985"). */
export function extractYear(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const match = String(timestamp).match(/\b(1[5-9]\d{2}|20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isFinite(year) ? year : null;
}

/** A human label for the publication date — keeps "April 1985" but tidies bare years. */
export function formatIssueDate(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const trimmed = String(timestamp).trim();
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  return trimmed;
}

export function magazineName(record: RecordWithDetails): string {
  return record.magazines?.name || record.name_legacy || 'Unknown journal';
}

export function magazineSlug(record: RecordWithDetails): string | null {
  return record.magazines?.slug ?? null;
}

export function authorLabel(record: RecordWithDetails): string {
  if (record.record_authors && record.record_authors.length > 0) {
    const names = record.record_authors
      .map((ra) => ra.authors?.name)
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }
  return (record.authors || '').trim();
}

/**
 * Some archived summaries store their line breaks as *literal* escape sequences
 * ("\r\n", "\n", "\t") rather than real control characters, so they render as
 * visible "\r\n" / "\t" text. Turn those back into real whitespace so
 * `whitespace-pre-line` can lay the text out into readable paragraphs, and
 * collapse runaway blank lines.
 */
export function normalizeBodyText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function bestSummary(record: RecordWithDetails): string {
  if (record.summaries && record.summaries.length > 0 && record.summaries[0].summary) {
    return normalizeBodyText(record.summaries[0].summary);
  }
  return normalizeBodyText(record.summary);
}

export function bestConclusion(record: RecordWithDetails): string {
  if (
    record.conclusions &&
    record.conclusions.length > 0 &&
    record.conclusions[0].conclusion
  ) {
    return normalizeBodyText(record.conclusions[0].conclusion);
  }
  return normalizeBodyText(record.conclusion);
}

export function issueLabel(record: {
  volume: string | null;
  number: string | null;
}): string {
  const parts: string[] = [];
  if (record.volume) parts.push(`Vol. ${record.volume}`);
  if (record.number) parts.push(`No. ${record.number}`);
  return parts.join(' · ');
}

export function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Compact human duration for reading time: "12s", "4m", "1h 12m", "3h". */
export function formatDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.round(totalSeconds));
  if (secs < 60) return `${secs}s`;
  const minutes = Math.floor(secs / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return remMinutes ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

/** Short relative time for tracker rows: "just now", "3h ago", "2d ago". */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const diffMs = Date.now() - then;
  if (diffMs < 60_000) return 'just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString();
}
