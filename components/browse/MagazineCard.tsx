import React, { useEffect, useState } from 'react';
import { fetchPexelsImage } from '@/lib/pexels';
import { RecordWithDetails } from '@/types';
import TagPill from './TagPill';
import { Download, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    const loadImage = async () => {
      const query = record.title_name || record.name || 'Jainism philosophy';
      const img = await fetchPexelsImage(query);
      setImageUrl(img ?? FALLBACK_IMAGE);
    };
    loadImage();
  }, [record]);

  const summary =
    record.summaries?.[0]?.summary || record.summary || 'No summary available';
  const truncatedSummary =
    summary.length > 220 ? summary.substring(0, 220) + '...' : summary;

  const authors =
    record.record_authors?.map((ra) => ra.authors.name).join(', ') ||
    record.authors ||
    'Unknown Author';
  const tags = record.record_tags || [];

  const formatDate = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const imageOnLeft = imagePosition === 'left';

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 overflow-hidden h-full">
      <div
        className={`flex flex-col ${
          imageOnLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
        } h-full`}
      >
        {/* Image Section */}
        <div className="w-full sm:w-48 md:w-56 flex-shrink-0">
          <img
            src={imageUrl}
            alt={record.title_name || record.name}
            className="w-full h-56 sm:h-full object-cover"
          />
        </div>

        {/* Content Section */}
        <div className="flex flex-col flex-1 p-4 sm:p-5 justify-between h-full">
          {/* Top Content */}
          <div className="flex-1 flex flex-col">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              {record.name}
            </p>

            <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug mb-1">
              {record.title_name || 'Untitled'}
            </h3>

            <p className="text-sm text-gray-600 mb-2">By {authors}</p>

            <p className="text-sm text-gray-700 mb-3 line-clamp-3">
              {truncatedSummary}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
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

            {/* Spacer pushes buttons down evenly */}
            <div className="flex-grow"></div>
          </div>

          {/* Bottom Buttons */}
          <div className="mt-4 flex gap-2 sm:gap-3 pt-2">
            <button
              onClick={() => router.push(`/records/${record.id}`)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 h-10"
            >
              <FileText className="w-4 h-4" />
              Summary
            </button>

            <a
              href={record.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 h-10"
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
