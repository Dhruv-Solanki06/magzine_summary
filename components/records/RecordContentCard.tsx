// components/record/RecordContentCard.tsx
import React from 'react';
import { RecordWithDetails } from '@/types';
import TagPill from '../browse/TagPill';
import { Eye, Download } from 'lucide-react';

interface RecordContentCardProps {
  record: RecordWithDetails;
  imageUrl: string;
  onTagClick?: (tagId: number) => void;
}

export const RecordContentCard: React.FC<RecordContentCardProps> = ({ 
  record, 
  imageUrl,
  onTagClick 
}) => {
  // Get authors
  const authors = record.record_authors && record.record_authors.length > 0
    ? record.record_authors.map(ra => ra.authors.name).join(', ')
    : record.authors || 'Unknown Author';

  // Get summary
  const summary = record.summaries && record.summaries.length > 0
    ? record.summaries[0].summary
    : record.summary;

  // Get conclusion
  const conclusion = record.conclusions && record.conclusions.length > 0
    ? record.conclusions[0].conclusion
    : record.conclusion;

  // Get tags
  const tags = record.record_tags || [];

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="flex gap-8 mb-6">
        {/* Magazine Cover Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={record.title_name || record.name}
            className="w-80 h-96 object-cover rounded-md shadow-lg"
          />
        </div>

        {/* Title and Author */}
        <div className="flex-1">
          
          
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            {record.title_name || 'Untitled'}
          </h1>
          
          <p className="text-lg text-gray-600 mb-6">By {authors}</p>

          {/* Tags at top right */}
          <div className="flex flex-wrap gap-2">
            {tags.map((tagRelation) => (
              <TagPill 
                key={tagRelation.tags.id} 
                tag={tagRelation.tags}
                onClick={onTagClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Summary Section */}
      {summary && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Summary:</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {summary}
          </p>
        </div>
      )}

      {/* Conclusion Section */}
      {conclusion && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">Conclusion:</h2>
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {conclusion}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 items-center pt-4">
        <button className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2">
          <Eye className="w-4 h-4" />
          View PDF
        </button>
        
        <button className="p-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" />
        </button>
        
        
        <a
          href={record.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
        >
          View PDF
        </a>
      </div>
    </div>
  );
};

export default RecordContentCard;