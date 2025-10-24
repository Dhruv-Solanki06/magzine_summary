// components/record/MagazineDetailsCard.tsx
import React from 'react';
import { RecordWithDetails } from '@/types';
import { FileText } from 'lucide-react';

interface MagazineDetailsCardProps {
  record: RecordWithDetails;
}

export const MagazineDetailsCard: React.FC<MagazineDetailsCardProps> = ({ record }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Magazine Details</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Journal Name</p>
          <p className="text-gray-900 font-medium">{record.name}</p>
        </div>

        {record.volume && record.number && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Volume & Issue</p>
            <p className="text-gray-900 font-medium">Volume: {record.volume} No. {record.number}</p>
          </div>
        )}

        {record.timestamp && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Publication Year</p>
            <p className="text-gray-900 font-medium">
              {new Date(record.timestamp).getFullYear()}
            </p>
          </div>
        )}

        {record.page_numbers && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Pages</p>
            <p className="text-gray-900 font-medium">{record.page_numbers}</p>
          </div>
        )}

        {record.language && (
          <div>
            <p className="text-sm text-gray-500 mb-1">Language</p>
            <p className="text-gray-900 font-medium">{record.language}</p>
          </div>
        )}

        <div className="pt-4">
          <button className="w-full px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" />
            Read Full PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagazineDetailsCard;