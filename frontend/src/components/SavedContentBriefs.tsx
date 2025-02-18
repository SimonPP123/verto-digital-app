'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ContentBrief {
  _id: string;
  keyword: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onBriefCompleted?: () => void;
  refreshTrigger?: number;
}

export default function SavedContentBriefs({ onBriefCompleted, refreshTrigger = 0 }: Props) {
  const { isAuthenticated } = useAuth();
  const [contentBriefs, setContentBriefs] = useState<ContentBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBrief, setSelectedBrief] = useState<ContentBrief | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchContentBriefs();
    }
  }, [isAuthenticated, refreshTrigger]);

  const fetchContentBriefs = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/content-briefs/saved`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch content briefs');
      }

      const data = await response.json();
      setContentBriefs(data);
      
      // Notify parent component when briefs are loaded
      if (onBriefCompleted) {
        onBriefCompleted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content brief?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/content-briefs/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete content brief');
      }

      // Remove the deleted brief from state
      setContentBriefs(prevBriefs => prevBriefs.filter(brief => brief._id !== id));
      if (selectedBrief?._id === id) {
        setSelectedBrief(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content brief');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="mt-8">
      {contentBriefs.length === 0 ? (
        <p className="text-gray-600">No saved content briefs found.</p>
      ) : (
        <div className="space-y-6">
          {contentBriefs.map((brief) => (
            <div key={brief._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Keyword: {brief.keyword}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Created: {new Date(brief.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedBrief(selectedBrief?._id === brief._id ? null : brief)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedBrief?._id === brief._id ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(brief._id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {selectedBrief?._id === brief._id && (
                <div 
                  className="mt-4 p-4 bg-gray-50 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: brief.content }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 