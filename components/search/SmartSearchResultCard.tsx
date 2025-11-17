import React from 'react';
import Link from 'next/link';
import { ExternalLink, FileText } from 'lucide-react';
import type { SmartSearchResult } from '@/types';

interface SmartSearchResultCardProps {
  result: SmartSearchResult;
  index: number;
}

function toPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

const SmartSearchResultCard: React.FC<SmartSearchResultCardProps> = ({ result, index }) => {
  const {
    id,
    title_name: titleName,
    authors,
    summary,
    pdf_url: pdfUrl,
    finalScore,
    breakdown,
  } = result;

  return (
    <article className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">Result #{index + 1}</div>
          <h2 className="text-lg font-semibold text-gray-900">{titleName || 'Untitled Record'}</h2>
          <p className="text-sm text-gray-600 mt-1">By {authors || 'Unknown Author'}</p>
        </div>
        <div className="flex flex-col items-start sm:items-end">
          <span className="text-xs text-gray-500 uppercase tracking-wide">Composite Score</span>
          <span className="text-2xl font-semibold text-blue-600">{toPercent(finalScore)}</span>
        </div>
      </header>

      <p className="text-sm text-gray-700 leading-relaxed">{summary || 'No summary available.'}</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs text-gray-600">
        <div className="bg-gray-50 rounded-md p-3">
          <span className="block text-gray-500">Vector</span>
          <span className="text-sm font-medium text-gray-900">{toPercent(breakdown.cosineSimilarity)}</span>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <span className="block text-gray-500">BM25</span>
          <span className="text-sm font-medium text-gray-900">{toPercent(breakdown.bm25Rank)}</span>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <span className="block text-gray-500">Proper Nouns</span>
          <span className="text-sm font-medium text-gray-900">{toPercent(breakdown.properNounBoost)}</span>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <span className="block text-gray-500">Field Match</span>
          <span className="text-sm font-medium text-gray-900">{toPercent(breakdown.fieldMatchBonus)}</span>
        </div>
        <div className="bg-gray-50 rounded-md p-3">
          <span className="block text-gray-500">Engagement</span>
          <span className="text-sm font-medium text-gray-900">{toPercent(breakdown.engagementScore)}</span>
        </div>
      </div>

      <footer className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link
          href={`/records/${id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          View Summary
        </Link>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open PDF
          </a>
        ) : (
          <span className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-gray-200 text-gray-400 text-sm font-medium rounded-md cursor-not-allowed">
            <ExternalLink className="w-4 h-4" />
            PDF unavailable
          </span>
        )}
      </footer>
    </article>
  );
};

export default SmartSearchResultCard;
