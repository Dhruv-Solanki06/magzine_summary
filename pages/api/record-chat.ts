import type { NextApiRequest, NextApiResponse } from 'next';
import type { RecordWithDetails } from '@/types';
import {
  authorLabel,
  bestConclusion,
  bestSummary,
  formatIssueDate,
  formatLanguage,
  issueLabel,
  magazineName,
} from '@/lib/format';

type ChatRole = 'user' | 'assistant';

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

interface ChatRequestBody {
  recordId?: unknown;
  messages?: unknown;
}

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1400;
const MAX_CONTEXT_CHARS = 8000;
const DEEPSEEK_TIMEOUT_MS = 45000;

function cleanText(value: unknown, max = MAX_MESSAGE_CHARS): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeMessages(value: unknown): { role: ChatRole; content: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item: IncomingMessage) => {
      const role: ChatRole = item?.role === 'assistant' ? 'assistant' : 'user';
      const content = cleanText(item?.content);
      return { role, content };
    })
    .filter((item) => item.content.length > 0);
}

function compactList(values: Array<string | null | undefined>): string[] {
  return values.map((value) => cleanText(value, 220)).filter(Boolean);
}

function buildRecordContext(record: RecordWithDetails, sameIssue: RecordWithDetails[]): string {
  const tags = compactList((record.record_tags ?? []).map((rel) => rel.tags?.name));
  const sameIssueTitles = sameIssue
    .filter((item) => item.id !== record.id)
    .slice(0, 12)
    .map((item) => {
      const page = item.page_numbers ? `pp. ${item.page_numbers}` : 'pages unknown';
      return `- ${page}: ${item.title_name || 'Untitled article'}`;
    });

  const context = [
    `Title: ${record.title_name || 'Untitled article'}`,
    `Magazine: ${magazineName(record)}`,
    issueLabel(record) ? `Issue: ${issueLabel(record)}` : '',
    record.timestamp ? `Publication date: ${formatIssueDate(record.timestamp)}` : '',
    record.page_numbers ? `Pages: ${record.page_numbers}` : '',
    authorLabel(record) ? `Authors: ${authorLabel(record)}` : '',
    formatLanguage(record.language_legacy) ? `Language: ${formatLanguage(record.language_legacy)}` : '',
    tags.length ? `Topics: ${tags.join(', ')}` : '',
    bestSummary(record) ? `Summary:\n${bestSummary(record)}` : '',
    bestConclusion(record) ? `Conclusion:\n${bestConclusion(record)}` : '',
    sameIssueTitles.length ? `Other articles in the same issue:\n${sameIssueTitles.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return context.slice(0, MAX_CONTEXT_CHARS);
}

async function callDeepSeek(messages: DeepSeekMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('DEEPSEEK_API_KEY is not configured.');
    error.name = 'MissingDeepSeekKey';
    throw error;
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        thinking: { type: 'disabled' },
        temperature: 0.35,
        max_tokens: 900,
        stream: false,
      }),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload?.error?.message || payload?.message || `DeepSeek request failed (${response.status})`;
      const error = new Error(message);
      if (response.status === 401 || response.status === 403 || /authentication/i.test(message)) {
        error.name = 'DeepSeekAuthError';
      }
      throw error;
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new Error('DeepSeek returned an empty response.');
    }
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const body = req.body as ChatRequestBody;
    const recordId = Number(body.recordId);
    const messages = normalizeMessages(body.messages);

    if (!Number.isFinite(recordId)) {
      res.status(400).json({ error: 'A valid recordId is required.' });
      return;
    }
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'A user message is required.' });
      return;
    }

    const { fetchRecordWithDetailsById, fetchRecordsFromSameIssue } = await import(
      '@/lib/server/records'
    );
    const record = await fetchRecordWithDetailsById(recordId);
    if (!record) {
      res.status(404).json({ error: 'Record not found.' });
      return;
    }

    const sameIssue = await fetchRecordsFromSameIssue(record).catch(() => []);
    const context = buildRecordContext(record, sameIssue);

    const deepSeekMessages: DeepSeekMessage[] = [
      {
        role: 'system',
        content:
          'You are Aryan Culture Guide, a careful research companion for a cultural article archive. Answer only from the provided record context unless you clearly label a statement as general background. Be concise, cite specific article details such as title, issue, page numbers, authors, topics, and summary when useful. If the user asks about a selected passage, explain that passage in relation to this record. Do not invent quotes, PDF text, or source details that are not in the context.',
      },
      {
        role: 'system',
        content: `Current record context:\n${context}`,
      },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const answer = await callDeepSeek(deepSeekMessages);
    res.status(200).json({ answer });
    return;
  } catch (error) {
    console.error('Record chat error:', error);
    if (error instanceof Error && error.name === 'MissingDeepSeekKey') {
      res.status(503).json({ error: 'AI chat is not configured yet.' });
      return;
    }
    if (error instanceof Error && error.name === 'DeepSeekAuthError') {
      res.status(401).json({ error: 'DeepSeek rejected the configured API key.' });
      return;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      res.status(504).json({ error: 'AI chat timed out. Please try again.' });
      return;
    }
    res.status(500).json({ error: 'AI chat failed. Please try again.' });
  }
}
