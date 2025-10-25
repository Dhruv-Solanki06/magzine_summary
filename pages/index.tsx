// pages/BrowsePage.tsx

import React, { useState, useEffect } from 'react';
import { RecordWithDetails } from '@/types';
import { fetchRecords, filterRecordsByTag } from '@/pages/api/records';
import Header from '@/components/common/Header';
import MagazineCard from '@/components/browse/MagazineCard';
import Pagination from '@/components/browse/Pagination';
import { Loader2 } from 'lucide-react';

export default function BrowsePage() {
  const [records, setRecords] = useState<RecordWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  const pageSize = 20;

  // Fetch records on mount and when dependencies change
  useEffect(() => {
    loadRecords();
  }, [currentPage, searchQuery, selectedTagId]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;

      if (selectedTagId) {
        // Filter by tag
        response = await filterRecordsByTag(selectedTagId, currentPage, pageSize);
      } else if (searchQuery) {
        // Search with query
        response = await fetchRecords(currentPage, pageSize, { searchQuery });
      } else {
        // Default fetch
        response = await fetchRecords(currentPage, pageSize);
      }

      setRecords(response.data);
      setTotalPages(response.totalPages);
      setTotalRecords(response.count);
    } catch (err) {
      setError('Failed to load records. Please try again later.');
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on new search
    setSelectedTagId(null); // Clear tag filter
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTagClick = (tagId: number) => {
    setSelectedTagId(tagId);
    setCurrentPage(1); // Reset to first page
    setSearchQuery(''); // Clear search
  };

  const handleFiltersClick = () => {
    // TODO: Open filters modal/page
    console.log('Filters clicked - to be implemented');
  };

  return (
    <div className="min-h-s en bg-gray-50">
      {/* Header with Search + Filters */}
      <Header 
        onSearch={handleSearch}
        onFiltersClick={handleFiltersClick}
      />
      
      <main className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <h2 className="text-4xl font-bold text-gray-900 mb-8">
          Summaries A-Z
        </h2>

        {/* Active Filters Display */}
        {(searchQuery || selectedTagId) && (
          <div className="mb-6 flex items-center gap-3 flex-wrap">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-2">
                Search: {searchQuery}
                <button 
                  onClick={() => setSearchQuery('')}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            )}
            {selectedTagId && (
              <div className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center gap-2">
                Tag Filter
                <button 
                  onClick={() => setSelectedTagId(null)}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading summaries...</span>
          </div>
        ) : (
          <>
            {/* Records Grid */}
            {records.length > 0 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {records.map((record, index) => (
                    <MagazineCard
                      key={record.id}
                      record={record}
                      imagePosition={index % 2 === 0 ? 'left' : 'right'}
                      onTagClick={handleTagClick}
                    />
                  ))}
                </div>

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalRecords={totalRecords}
                  pageSize={pageSize}
                  onPageChange={handlePageChange}
                />
              </>
            ) : (
              <div className="text-center py-16 text-gray-600">
                <p className="text-lg mb-2">No summaries found.</p>
                <p className="text-sm">
                  Try adjusting your search or clearing filters to see more results.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
