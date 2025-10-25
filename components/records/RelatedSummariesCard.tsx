import React, { useMemo } from 'react';
import Link from 'next/link';
import { RecordWithDetails } from '@/types';

// ---- Small helpers ---------------------------------------------------------

const STOPWORDS = new Set([
  'a','an','and','the','of','on','in','for','to','by','with','from','at','as','is','are','be','or','vs','into','about','over',
  'view','study','notes','report','journal','quarterly','issue','number','volume','vol'
]);

const getYear = (ts?: string | null): number | undefined => {
  if (!ts) return undefined;
  const d = new Date(ts);
  const y = d.getFullYear();
  return isNaN(y) ? undefined : y;
};

const tokenize = (s?: string | null): Set<string> => {
  if (!s) return new Set();
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && !STOPWORDS.has(w))
  );
};

const tagIds = (r: RecordWithDetails): number[] =>
  (r.record_tags ?? []).map(rt => rt.tags.id);

const authorIds = (r: RecordWithDetails): number[] =>
  (r.record_authors ?? []).map(ra => ra.authors.id);

// ---- Scoring ---------------------------------------------------------------

function scoreCandidate(current: RecordWithDetails, candidate: RecordWithDetails): number {
  // shared tags (strong)
  const curTags = new Set(tagIds(current));
  const candTags = new Set(tagIds(candidate));
  let sharedTags = 0;
  candTags.forEach(id => { if (curTags.has(id)) sharedTags += 1; });

  // shared authors (medium)
  const curAuthors = new Set(authorIds(current));
  const candAuthors = new Set(authorIds(candidate));
  let sharedAuthors = 0;
  candAuthors.forEach(id => { if (curAuthors.has(id)) sharedAuthors += 1; });

  // same magazine & language
  const sameMagazine = (current.name?.trim() && candidate.name?.trim() && current.name === candidate.name) ? 1 : 0;
  const sameLanguage = (current.language && candidate.language && current.language === candidate.language) ? 1 : 0;

  // title token overlap (light)
  const curTokens = tokenize(current.title_name || current.summary || '');
  const candTokens = tokenize(candidate.title_name || candidate.summary || '');
  const intersectCount = [...candTokens].reduce((acc, t) => acc + (curTokens.has(t) ? 1 : 0), 0);
  const titleOverlap = curTokens.size > 0 ? Math.min(2, intersectCount / Math.max(6, curTokens.size) * 2 + intersectCount * 0.05) : 0;

  // year proximity bonus
  const y1 = getYear(current.timestamp);
  const y2 = getYear(candidate.timestamp);
  let yearProx = 0;
  if (y1 && y2) {
    const diff = Math.abs(y1 - y2);
    if (diff <= 2) yearProx = 1;
    else if (diff <= 5) yearProx = 0.5;
  }

  // weights
  const score =
    sharedTags * 3 +
    sharedAuthors * 2 +
    sameMagazine * 1.5 +
    sameLanguage * 1 +
    titleOverlap +
    yearProx;

  return score;
}

// ---- Diversity-aware selection --------------------------------------------

function pickWithDiversity(
  ranked: RecordWithDetails[],
  current: RecordWithDetails,
  limit: number
): RecordWithDetails[] {
  const out: RecordWithDetails[] = [];
  const seenPrimaryAuthor = new Set<number>();
  const seenPrimaryTag = new Set<number>();

  for (const r of ranked) {
    if (out.length >= limit) break;

    // primary author/tag (first in list if exists)
    const aId = authorIds(r)[0];
    const tId = tagIds(r)[0];

    // prefer diversity but allow if we are starved
    const violatesAuthor = aId && seenPrimaryAuthor.has(aId);
    const violatesTag = tId && seenPrimaryTag.has(tId);

    if (violatesAuthor || violatesTag) {
      // check if we still have room to be picky
      const remaining = limit - out.length;
      const leftInPool = ranked.length - (out.length + 1);
      if (leftInPool >= remaining + 2) continue; // keep searching for diverse items
    }

    if (aId) seenPrimaryAuthor.add(aId);
    if (tId) seenPrimaryTag.add(tId);
    out.push(r);
  }

  // If we couldn't fill, allow relaxing constraints (append remaining)
  if (out.length < limit) {
    for (const r of ranked) {
      if (out.length >= limit) break;
      if (!out.some(x => x.id === r.id)) out.push(r);
    }
  }
  return out.slice(0, limit);
}

// ---- Card UI ---------------------------------------------------------------

interface RelatedSummariesCardProps {
  record: RecordWithDetails;
  imageUrl: string;
}

const RelatedSummaryCard: React.FC<RelatedSummariesCardProps> = ({ record, imageUrl }) => {
  const authors = (record.record_authors?.length ?? 0) > 0
    ? record.record_authors!.map(ra => ra.authors.name).join(', ')
    : record.authors || 'Unknown Author';

  return (
    <Link href={`/records/${record.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer h-full">
        <div className="flex gap-4">
          <img
            src={imageUrl}
            alt={record.title_name || record.name}
            className="w-24 h-32 object-cover rounded-md flex-shrink-0"
          />
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">{record.name}</p>
            <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
              {record.title_name || 'Untitled'}
            </h3>
            <p className="text-xs text-gray-600 line-clamp-2">By {authors}</p>
          </div>
        </div>
      </div>
    </Link>
  );
};

// ---- Related Summaries container ------------------------------------------

interface RelatedSummariesProps {
  /** The record page the user is currently viewing */
  current: RecordWithDetails;
  /** The pool to choose from (you can pass your already-fetched list) */
  allRecords: RecordWithDetails[];
  /** Provide an image url for a record (pexels/cover/etc.) */
  getImageUrl: (record: RecordWithDetails) => string;
  /** How many items to show (default 6) */
  limit?: number;
  /** Optional: minimum score threshold before fallback (default 1.5) */
  minScore?: number;
}

export const RelatedSummaries: React.FC<RelatedSummariesProps> = ({
  current,
  allRecords,
  getImageUrl,
  limit = 6,
  minScore = 1.5,
}) => {
  const items = useMemo(() => {
    // 1) filter out self and invalids
    const pool = allRecords.filter(r => r.id !== current.id);

    // 2) score
    const scored = pool
      .map(r => ({ r, s: scoreCandidate(current, r) }))
      .sort((a, b) => b.s - a.s);

    // 3) strong candidates
    const strong = scored.filter(x => x.s >= minScore).map(x => x.r);

    // 4) If not enough strong items, fallback to same magazine or most recent
    let ranked: RecordWithDetails[];
    if (strong.length >= Math.min(limit, 3)) {
      ranked = strong;
    } else {
      const sameMagazine = pool.filter(r => r.name && r.name === current.name);
      const recent = [...pool].sort((a, b) => {
        const ya = getYear(a.timestamp) ?? 0;
        const yb = getYear(b.timestamp) ?? 0;
        return yb - ya;
      });
      // merge unique: strong → sameMagazine → recent
      const seen = new Set<number>();
      ranked = [];
      const pushUnique = (arr: RecordWithDetails[]) => {
        for (const x of arr) {
          if (!seen.has(x.id)) {
            ranked.push(x);
            seen.add(x.id);
          }
        }
      };
      pushUnique(strong);
      pushUnique(sameMagazine);
      pushUnique(recent);
    }

    // 5) diversity-aware pick
    return pickWithDiversity(ranked, current, limit);
  }, [current, allRecords, limit, minScore]);

  return (
    <div className="mt-12">
      <h2 className="mb-4 text-2xl font-semibold text-gray-900">Related Summaries</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-600">
          We could not find any closely related summaries right now. Explore the library to
          discover more content.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((rec) => (
            <RelatedSummaryCard
              key={rec.id}
              record={rec}
              imageUrl={getImageUrl(rec)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RelatedSummaries;
