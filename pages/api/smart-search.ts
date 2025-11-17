import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const EMBEDDING_MODEL = 'text-embedding-3-large';
const DEFAULT_RESULT_LIMIT = 20;
const FALLBACK_CANDIDATE_MULTIPLIER = 3;

interface EmbeddingResponse {
  data: { embedding: number[] }[];
}

interface CandidateRow {
  id: number;
  title_name: string | null;
  summary: string | null;
  authors: string | null;
  pdf_url: string | null;
  cosine_similarity?: number | null;
  similarity?: number | null;
  bm25_rank?: number | null;
  engagement_score?: number | null;
  field_match_bonus?: number | null;
  proper_noun_boost?: number | null;
  embedding?: number[] | null;
  match_source?: string;
}

interface CombinedResult {
  id: number;
  title_name: string;
  authors: string;
  summary: string;
  pdf_url: string;
  finalScore: number;
  breakdown: {
    cosineSimilarity: number;
    bm25Rank: number;
    properNounBoost: number;
    fieldMatchBonus: number;
    engagementScore: number;
  };
}

interface QuerySupabaseParams {
  embedding?: number[] | null;
  query: string;
  properNouns: string[];
  limit?: number;
}

interface CombineContext {
  query: string;
  properNouns: string[];
  limit?: number;
}

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedSupabase) {
    return cachedSupabase;
  }

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase credentials are not configured.');
  }

  cachedSupabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  return cachedSupabase;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { query } = (req.body ?? {}) as { query?: string };

  if (typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ message: 'Query must be a non-empty string' });
  }

  const trimmedQuery = query.trim();
  const limitParam = Number(req.query.limit ?? DEFAULT_RESULT_LIMIT);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : DEFAULT_RESULT_LIMIT;

  try {
    const properNouns = extractProperNouns(trimmedQuery);
    const embedding = await getQueryEmbedding(trimmedQuery);
    const rawCandidates = await querySupabase({
      query: trimmedQuery,
      embedding,
      properNouns,
      limit,
    });

    const combined = combineScores(rawCandidates, {
      query: trimmedQuery,
      properNouns,
      limit,
    });

    return res.status(200).json({ results: combined });
  } catch (error) {
    console.error('Smart search failure:', error);
    return res.status(500).json({ message: 'Failed to execute smart search' });
  }
}

function extractProperNouns(input: string): string[] {
  const matches = input.match(/\b(?:[A-Z][\w'-]*(?:\s+[A-Z][\w'-]*)*)\b/g);
  if (!matches) {
    return [];
  }

  const stopWords = new Set([
    'I',
    'We',
    'Us',
    'You',
    'He',
    'She',
    'They',
    'It',
    'A',
    'An',
    'The',
    'And',
    'Or',
    'But',
  ]);

  const unique = new Map<string, string>();

  for (const match of matches) {
    const trimmed = match.trim();
    if (!trimmed || stopWords.has(trimmed)) {
      continue;
    }

    const normalized = trimmed.toLowerCase();
    if (!unique.has(normalized)) {
      unique.set(normalized, trimmed);
    }
  }

  return Array.from(unique.values());
}

async function getQueryEmbedding(query: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OPENAI_API_KEY is not configured. Falling back to text-only smart search.');
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: query,
        model: EMBEDDING_MODEL,
      }),
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.warn(`OpenAI embedding request failed: ${response.status} ${errorDetails}`);
      return null;
    }

    const payload = (await response.json()) as EmbeddingResponse;
    const embedding = payload.data?.[0]?.embedding;

    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn('OpenAI embedding response did not include an embedding vector.');
      return null;
    }

    return embedding;
  } catch (error) {
    console.warn('OpenAI embedding request threw an error, continuing without vector search.', error);
    return null;
  }
}

async function querySupabase({
  query,
  embedding,
  properNouns,
  limit = DEFAULT_RESULT_LIMIT,
}: QuerySupabaseParams): Promise<CandidateRow[]> {
  const supabase = getSupabaseClient();
  const candidateCount = Math.max(limit * FALLBACK_CANDIDATE_MULTIPLIER, 40);

  const candidateMap = new Map<number, CandidateRow>();
  const hasQueryEmbedding = Array.isArray(embedding) && embedding.length > 0;

  if (hasQueryEmbedding) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('smart_search_candidates', {
      query_embedding: embedding,
      query_text: query,
      proper_nouns: properNouns,
      match_count: candidateCount,
    });

    if (!rpcError && Array.isArray(rpcData)) {
      if (rpcData.length > 0) {
        return (rpcData as CandidateRow[]).map((row) => ({
          ...row,
          match_source: row.match_source ?? 'rpc',
        }));
      }

      // Allow hybrid fallback paths to run when the RPC returns no matches.
    }

    if (rpcError) {
      console.warn(
        'smart_search_candidates RPC unavailable; falling back to manual hybrid search:',
        rpcError.message,
      );
    }
  }

  if (hasQueryEmbedding) {
    const vectorResponse: any = await supabase.rpc('match_records', {
      query_embedding: embedding,
      match_count: candidateCount,
    });

    if (!vectorResponse?.error && Array.isArray(vectorResponse?.data)) {
      for (const item of vectorResponse.data as CandidateRow[]) {
        const existing = candidateMap.get(item.id);
        const sanitizedEmbedding = sanitizeEmbedding((item as any).embedding ?? existing?.embedding ?? null);
        let cosine: number | null = null;

        if (sanitizedEmbedding && embedding) {
          cosine = computeCosineSimilarity(sanitizedEmbedding, embedding);
        } else {
          cosine = item.cosine_similarity ?? item.similarity ?? existing?.cosine_similarity ?? null;
        }

        candidateMap.set(item.id, {
          id: item.id,
          title_name: item.title_name ?? existing?.title_name ?? null,
          summary: item.summary ?? existing?.summary ?? null,
          authors: item.authors ?? existing?.authors ?? null,
          pdf_url: item.pdf_url ?? existing?.pdf_url ?? null,
          engagement_score: item.engagement_score ?? existing?.engagement_score ?? null,
          cosine_similarity: cosine,
          bm25_rank: existing?.bm25_rank ?? null,
          field_match_bonus: existing?.field_match_bonus ?? null,
          proper_noun_boost: existing?.proper_noun_boost ?? null,
          embedding: sanitizedEmbedding,
          match_source: existing?.match_source ? `${existing.match_source}+vector` : 'vector',
        });
      }
    }

    if (candidateMap.size === 0) {
      const fallbackVectorCandidates = await supabase
        .from('records')
        .select('id,title_name,summary,authors,pdf_url,engagement_score,embedding')
        .not('embedding', 'is', null)
        .limit(candidateCount);

      if (!fallbackVectorCandidates.error && Array.isArray(fallbackVectorCandidates.data)) {
        for (const item of fallbackVectorCandidates.data as CandidateRow[]) {
          const sanitizedEmbedding = sanitizeEmbedding(item.embedding);
          candidateMap.set(item.id, {
            id: item.id,
            title_name: item.title_name ?? null,
            summary: item.summary ?? null,
            authors: item.authors ?? null,
            pdf_url: item.pdf_url ?? null,
            engagement_score: item.engagement_score ?? null,
            cosine_similarity:
              sanitizedEmbedding && embedding
                ? computeCosineSimilarity(sanitizedEmbedding, embedding)
                : null,
            bm25_rank: null,
            field_match_bonus: null,
            proper_noun_boost: null,
            embedding: sanitizedEmbedding ?? null,
            match_source: 'vector-fallback',
          });
        }
      }
    }
  }

  const textResponse = await supabase
    .from('records')
    .select('id,title_name,summary,authors,pdf_url,engagement_score,embedding')
    .textSearch('fts', query, { type: 'websearch', config: 'english' })
    .limit(candidateCount);

  let textDataResponse = textResponse;

  if (textResponse.error) {
    const escaped = escapeILikePattern(query);
    const orFilter = [
      `title_name.ilike.%${escaped}%`,
      `summary.ilike.%${escaped}%`,
      `authors.ilike.%${escaped}%`,
    ].join(',');

    textDataResponse = await supabase
      .from('records')
      .select('id,title_name,summary,authors,pdf_url,engagement_score,embedding')
      .or(orFilter)
      .limit(candidateCount);
  }

  if (!textDataResponse.error && Array.isArray(textDataResponse.data)) {
    for (const item of textDataResponse.data as CandidateRow[]) {
      const existing = candidateMap.get(item.id);
      const sanitizedEmbedding = sanitizeEmbedding(item.embedding ?? existing?.embedding ?? null);
      candidateMap.set(item.id, {
        id: item.id,
        title_name: item.title_name ?? existing?.title_name ?? null,
        summary: item.summary ?? existing?.summary ?? null,
        authors: item.authors ?? existing?.authors ?? null,
        pdf_url: item.pdf_url ?? existing?.pdf_url ?? null,
        engagement_score: item.engagement_score ?? existing?.engagement_score ?? null,
        cosine_similarity: existing?.cosine_similarity ?? null,
        bm25_rank: existing?.bm25_rank ?? null,
        field_match_bonus: existing?.field_match_bonus ?? null,
        proper_noun_boost: existing?.proper_noun_boost ?? null,
        embedding: sanitizedEmbedding,
        match_source: existing?.match_source ? `${existing.match_source}+text` : 'text',
      });
    }
  }

  if (candidateMap.size === 0) {
    const fallbackLimit = Math.max(limit ?? DEFAULT_RESULT_LIMIT, 10);
    const fallbackPlain = await supabase
      .from('records')
      .select('id,title_name,summary,authors,pdf_url,engagement_score,embedding')
      .limit(fallbackLimit);

    if (!fallbackPlain.error && Array.isArray(fallbackPlain.data)) {
      for (const item of fallbackPlain.data as CandidateRow[]) {
        const sanitizedEmbedding = sanitizeEmbedding(item.embedding);
        candidateMap.set(item.id, {
          id: item.id,
          title_name: item.title_name ?? null,
          summary: item.summary ?? null,
          authors: item.authors ?? null,
          pdf_url: item.pdf_url ?? null,
          engagement_score: item.engagement_score ?? null,
          cosine_similarity:
            sanitizedEmbedding && embedding
              ? computeCosineSimilarity(sanitizedEmbedding, embedding)
              : null,
          bm25_rank: null,
          field_match_bonus: null,
          proper_noun_boost: null,
          embedding: sanitizedEmbedding ?? null,
          match_source: 'fallback',
        });
      }
    }
  }

  const candidates = Array.from(candidateMap.values());

  if (hasQueryEmbedding) {
    for (const row of candidates) {
      if ((row.cosine_similarity === undefined || row.cosine_similarity === null) && Array.isArray(row.embedding) && embedding) {
        row.cosine_similarity = computeCosineSimilarity(row.embedding, embedding);
      }
    }
  }

  return candidates;
}

function combineScores(rows: CandidateRow[], context: CombineContext): CombinedResult[] {
  const limit = context.limit ?? DEFAULT_RESULT_LIMIT;
  const queryTokens = Array.from(new Set(tokenize(context.query)));
  const lowerProperNouns = context.properNouns.map((item) => item.toLowerCase());
  const results: CombinedResult[] = [];

  for (const row of rows) {
    const vectorScore = normaliseCosine(row.cosine_similarity ?? row.similarity ?? 0);
    const bm25FromRow = normaliseBm25(row.bm25_rank);
    const computedBm25 = bm25FromRow > 0 ? bm25FromRow : computeBm25Score(row, queryTokens);
    const properNounScore =
      row.proper_noun_boost !== undefined && row.proper_noun_boost !== null
        ? clamp01(row.proper_noun_boost)
        : computeProperNounBoost(row, lowerProperNouns);
    const fieldBonus =
      row.field_match_bonus !== undefined && row.field_match_bonus !== null
        ? clamp01(row.field_match_bonus)
        : computeFieldMatchBonus(row, queryTokens);
    const engagement = normaliseEngagement(row.engagement_score);

    const totalScore =
      0.45 * vectorScore +
      0.25 * computedBm25 +
      0.15 * properNounScore +
      0.10 * fieldBonus +
      0.05 * engagement;

    results.push({
      id: row.id,
      title_name: row.title_name ?? '',
      authors: row.authors ?? '',
      summary: row.summary ?? '',
      pdf_url: row.pdf_url ?? '',
      finalScore: Number(totalScore.toFixed(6)),
      breakdown: {
        cosineSimilarity: Number(vectorScore.toFixed(6)),
        bm25Rank: Number(computedBm25.toFixed(6)),
        properNounBoost: Number(properNounScore.toFixed(6)),
        fieldMatchBonus: Number(fieldBonus.toFixed(6)),
        engagementScore: Number(engagement.toFixed(6)),
      },
    });
  }

  results.sort((a, b) => b.finalScore - a.finalScore);

  return results.slice(0, limit);
}

function tokenize(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function computeCosineSimilarity(a: number[] | null | undefined, b: number[] | null | undefined): number {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const valueA = a[i];
    const valueB = b[i];
    dot += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function computeBm25Score(row: CandidateRow, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const fieldConfigs = [
    { text: row.title_name, weight: 1.8 },
    { text: row.summary, weight: 1.2 },
    { text: row.authors, weight: 0.8 },
  ];

  let weightedScore = 0;
  let totalWeight = 0;

  for (const { text, weight } of fieldConfigs) {
    if (!text) {
      continue;
    }

    const fieldTokens = tokenize(text);
    if (fieldTokens.length === 0) {
      continue;
    }

    totalWeight += weight;

    const fieldSet = new Set(fieldTokens);
    let hits = 0;

    for (const token of tokens) {
      if (fieldSet.has(token)) {
        hits += 1;
      }
    }

    if (hits === 0) {
      continue;
    }

    const saturation = hits / tokens.length;
    const lengthPenalty = Math.log2(fieldTokens.length + 1);
    weightedScore += weight * (saturation / (lengthPenalty || 1));
  }

  if (totalWeight === 0) {
    return 0;
  }

  const score = weightedScore / totalWeight;
  return clamp01(score * 1.5);
}

function computeFieldMatchBonus(row: CandidateRow, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const fieldConfigs = [
    { text: row.title_name, weight: 0.5 },
    { text: row.summary, weight: 0.3 },
    { text: row.authors, weight: 0.2 },
  ];

  let total = 0;

  for (const { text, weight } of fieldConfigs) {
    if (!text) {
      continue;
    }

    const lower = text.toLowerCase();
    let hits = 0;

    for (const token of tokens) {
      if (lower.includes(token)) {
        hits += 1;
      }
    }

    if (hits === 0) {
      continue;
    }

    const coverage = hits / tokens.length;
    total += weight * coverage;
  }

  return clamp01(total);
}

function computeProperNounBoost(row: CandidateRow, properNouns: string[]): number {
  if (properNouns.length === 0) {
    return 0;
  }

  const haystack = [row.title_name, row.summary, row.authors].filter(Boolean).join(' ').toLowerCase();

  if (!haystack) {
    return 0;
  }

  let hits = 0;

  for (const noun of properNouns) {
    if (haystack.includes(noun)) {
      hits += 1;
    }
  }

  if (hits === 0) {
    return 0;
  }

  const base = hits / properNouns.length;
  const exactTitleHit = row.title_name
    ? properNouns.some((noun) => row.title_name!.toLowerCase().includes(noun))
    : false;

  const bonus = exactTitleHit ? 0.1 : 0;
  return clamp01(base + bonus);
}

function normaliseCosine(value: number | null | undefined): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  const clamped = Math.max(-1, Math.min(1, value));
  return clamped <= 0 ? 0 : clamped;
}

function normaliseBm25(value: number | null | undefined): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  const safe = Math.max(0, value);
  return safe / (safe + 1);
}

function normaliseEngagement(value: number | null | undefined): number {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 0;
  }

  const safe = Math.max(0, value);
  if (safe > 1) {
    return Math.min(1, Math.tanh(safe / 5));
  }

  return clamp01(safe);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function escapeILikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (match) => `\\${match}`);
}

function sanitizeEmbedding(value: unknown): number[] | null {
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return value.slice();
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'number')) {
        return parsed;
      }
    } catch (error) {
      console.warn('Failed to parse embedding string:', error);
    }
  }

  return null;
}
