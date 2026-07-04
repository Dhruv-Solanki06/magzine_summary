'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Loader2,
  MessageSquareText,
  Quote,
  Send,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react';
import type { RecordWithDetails } from '@/types';
import { authorLabel, bestConclusion, bestSummary, issueLabel, magazineName } from '@/lib/format';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface RecordInsightPanelProps {
  record: RecordWithDetails;
}

const QUICK_PROMPTS = [
  'Explain the main idea in simple terms.',
  'What should I pay attention to while reading this article?',
  'Give me three discussion questions for this record.',
  'How does this article fit with the rest of this issue?',
];

function buildReadingText(record: RecordWithDetails): string {
  const parts = [
    record.title_name,
    authorLabel(record) ? `By ${authorLabel(record)}.` : '',
    magazineName(record),
    issueLabel(record),
    bestSummary(record) ? `Summary. ${bestSummary(record)}` : '',
    bestConclusion(record) ? `Conclusion. ${bestConclusion(record)}` : '',
  ].filter(Boolean);
  return parts.join('\n\n');
}

const RecordInsightPanel: React.FC<RecordInsightPanelProps> = ({ record }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const readingText = useMemo(() => buildReadingText(record), [record]);

  useEffect(() => {
    const updateSelection = () => {
      const text = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? '';
      setSelectedText(text.length > 20 ? text.slice(0, 700) : '');
    };

    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const askDeepSeek = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || loading) return;

      const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: trimmed }];
      setMessages(nextMessages);
      setInput('');
      setError('');
      setLoading(true);

      try {
        const response = await fetch('/api/record-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recordId: record.id, messages: nextMessages }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error || 'The guide could not answer right now.');
        }

        const answer = String(payload?.answer ?? '').trim();
        if (!answer) throw new Error('The guide returned an empty answer.');
        setMessages([...nextMessages, { role: 'assistant', content: answer }]);
      } catch (requestError) {
        setMessages(nextMessages);
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'The guide could not answer right now.',
        );
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, record.id],
  );

  const useSelectedText = () => {
    if (!selectedText) return;
    setInput(`Explain this passage from the record and why it matters: "${selectedText}"`);
  };

  const speak = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setError('Audio reading is not supported in this browser.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3800));
    utterance.rate = 0.92;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const latestAssistant = [...messages].reverse().find((message) => message.role === 'assistant');

  return (
    <section className="overflow-hidden rounded-[14px] bg-white shadow-[var(--shadow-card)] ring-1 ring-black/[0.04]">
      <div className="border-b border-black/[0.06] bg-[linear-gradient(135deg,rgba(0,0,0,0.04),rgba(255,255,255,0)_42%)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black/40">
              <Sparkles className="h-3.5 w-3.5" />
              DeepSeek guide
            </p>
            <h2
              className="mt-1 text-[21px] font-bold tracking-[-0.3px] text-black/92"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Discuss this record
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/52">
              Ask about the article, its topics, issue context, selected passages, or reading
              strategy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
            <button
              type="button"
              onClick={() => speak(readingText)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-black px-3 text-sm font-medium text-white transition hover:bg-black/85"
            >
              <Volume2 className="h-4 w-4" />
              Listen
            </button>
            <button
              type="button"
              onClick={stopSpeaking}
              disabled={!speaking}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-black/10 px-3 text-sm font-medium text-black/58 transition hover:border-black/20 hover:text-black/86 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_270px]">
        <div className="min-w-0 p-4 sm:p-5">
          <div className="max-h-[430px] min-h-[250px] space-y-3 overflow-y-auto pr-1 scrollbar-thin-light">
            {messages.length === 0 && (
              <div className="rounded-xl border border-dashed border-black/10 bg-black/[0.015] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-black/45">
                    <Bot className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-black/78">Start with the record</p>
                    <p className="mt-1 text-sm leading-6 text-black/50">
                      I can unpack the summary, turn it into study questions, explain a selected
                      passage, or compare it with the other articles in this issue.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[82%] ${
                    message.role === 'user'
                      ? 'bg-black text-white'
                      : 'bg-black/[0.045] text-black/76'
                  }`}
                >
                  <p className="whitespace-pre-line">{message.content}</p>
                  {message.role === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => speak(message.content)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-black/48 hover:text-black/75"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      Read answer
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-full bg-black/[0.045] px-3 py-2 text-sm text-black/52">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking about this record
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {selectedText && (
            <button
              type="button"
              onClick={useSelectedText}
              className="mt-3 flex w-full items-start gap-2 rounded-xl border border-black/[0.08] bg-white px-3 py-2 text-left text-sm text-black/62 transition hover:border-black/18 hover:text-black/82"
            >
              <Quote className="mt-0.5 h-4 w-4 shrink-0 text-black/35" />
              <span className="min-w-0">
                <span className="block font-medium text-black/76">Ask about selected text</span>
                <span className="mt-0.5 block truncate text-xs text-black/42">{selectedText}</span>
              </span>
            </button>
          )}

          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void askDeepSeek(input);
            }}
          >
            <label className="sr-only" htmlFor="record-chat-input">
              Ask about this record
            </label>
            <textarea
              id="record-chat-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask a question about this article..."
              rows={2}
              className="focus-managed max-h-36 min-h-12 flex-1 resize-none rounded-xl border border-black/10 bg-white px-3 py-2 text-sm leading-6 text-black/84 placeholder:text-black/38 focus:outline-none focus:ring-1 focus:ring-black/25"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send question"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-black text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <aside className="border-t border-black/[0.06] bg-black/[0.018] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-black/76">
            <MessageSquareText className="h-4 w-4 text-black/35" />
            Quick starts
          </div>
          <div className="mt-3 grid gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void askDeepSeek(prompt)}
                disabled={loading}
                className="rounded-xl border border-black/[0.07] bg-white px-3 py-2 text-left text-sm leading-5 text-black/64 transition hover:border-black/16 hover:text-black/86 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {latestAssistant && (
            <button
              type="button"
              onClick={() => speak(latestAssistant.content)}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-sm font-medium text-black/62 transition hover:border-black/20 hover:text-black/86"
            >
              <Volume2 className="h-4 w-4" />
              Read latest answer
            </button>
          )}
        </aside>
      </div>
    </section>
  );
};

export default RecordInsightPanel;
