// components/record/RelatedSummariesCard.tsx
import React from 'react';
import { RecordWithDetails } from '@/types';
import Link from 'next/link';

interface RelatedSummariesCardProps {
  record: RecordWithDetails;
  imageUrl: string;
}

const RelatedSummaryCard: React.FC<RelatedSummariesCardProps> = ({ record, imageUrl }) => {
  const authors = record.record_authors && record.record_authors.length > 0
    ? record.record_authors.map(ra => ra.authors.name).join(', ')
    : record.authors || 'Unknown Author';

  return (
    <Link href={`/records/${record.id}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 cursor-pointer">
        <div className="flex gap-4">
          <img
            src={imageUrl}
            alt={record.title_name || record.name}
            className="w-24 h-32 object-cover rounded-md"
          />
          <div className="flex-1">
            
            <p className="text-xs text-gray-500 mb-1">{record.name}</p>
            <h3 className="text-sm font-bold text-gray-900 mb-1 line-clamp-2">
              {record.title_name || 'Untitled'}
            </h3>
            <p className="text-xs text-gray-600">By {authors}</p>
          </div>
        </div>
      </div>
    </Link>
  );
};

interface RelatedSummariesProps {
  records: RecordWithDetails[];
  getImageUrl: (record: RecordWithDetails) => string;
}

export const RelatedSummaries: React.FC<RelatedSummariesProps> = ({ records, getImageUrl }) => {
  return (
    <div className="mt-12">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Related Summaries</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.slice(0, 3).map((record) => (
          <RelatedSummaryCard 
            key={record.id} 
            record={record}
            imageUrl={getImageUrl(record)}
          />
        ))}
      </div>
    </div>
  );
};

export default RelatedSummaries;