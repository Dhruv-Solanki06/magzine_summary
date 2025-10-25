import React, { useEffect, useState } from 'react';
import { fetchPexelsImage } from '@/lib/pexels';
import { RecordWithDetails } from '@/types';
import TagPill from './TagPill';
import { Download, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation'; // ✅ Add this

const FALLBACK_IMAGE = 'https://via.placeholder.com/320x420?text=No+Image';

interface MagazineCardProps {
  record: RecordWithDetails;
  imagePosition: 'left' | 'right';
  onTagClick: (tagId: number) => void;
  activeTagIds?: number[];
}

export const MagazineCard: React.FC<MagazineCardProps> = ({ 
  record, 
  imagePosition,
  onTagClick,
  activeTagIds = [],
}) => {
  const [imageUrl, setImageUrl] = useState<string>(FALLBACK_IMAGE);
  const router = useRouter(); // ✅ Initialize router

  // Load image dynamically from Pexels
  useEffect(() => {
    const loadImage = async () => {
      const query = record.title_name || record.name || 'Jainism philosophy';
      const img = await fetchPexelsImage(query);
      setImageUrl(img ?? FALLBACK_IMAGE);
    };
    loadImage();
  }, [record]);

  const summary = record.summaries?.[0]?.summary || record.summary || 'No summary available';
  const truncatedSummary = summary.length > 200 ? summary.substring(0, 200) + '...' : summary;

  const authors = record.record_authors?.map((ra) => ra.authors.name).join(', ') || record.authors || 'Unknown Author';
  const tags = record.record_tags || [];

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const imageOnLeft = imagePosition === 'left';

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6">
      <div className={`flex gap-6 ${!imageOnLeft ? 'flex-row-reverse' : ''}`}>
        
        {/* Magazine Cover Image */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={record.title_name || record.name}
            className="w-40 h-52 object-cover rounded-md"
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          

          <p className="text-sm text-gray-500 mb-1">{record.name}</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {record.title_name || 'Untitled'}
          </h3>
          <p className="text-sm text-gray-600 mb-3">By {authors}</p>
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">{truncatedSummary}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
            {record.timestamp && <span>{formatDate(record.timestamp)}</span>}
            {record.page_numbers && (
              <>
                <span>•</span>
                <span>Pages {record.page_numbers}</span>
              </>
            )}
            {record.volume && (
              <>
                <span>•</span>
                <span>Vol. {record.volume}</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {tags.slice(0, 3).map((tagRelation) => {
              const tagId = tagRelation.tags.id;
              return (
                <TagPill 
                  key={tagId} 
                  tag={tagRelation.tags}
                  onClick={onTagClick}
                  selected={activeTagIds.includes(tagId)}
                />
              );
            })}
            {tags.length > 3 && (
              <span className="text-xs text-gray-500 self-center">
                +{tags.length - 3} more
              </span>
            )}
          </div>

          <div className="flex gap-3 mt-auto">
            {/* ✅ FIXED BUTTON */}
            <button
              onClick={() => router.push(`/records/${record.id}`)} // ✅ Added navigation
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Summary
            </button>

            <a
              href={record.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              View PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MagazineCard;
