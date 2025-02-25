'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AudienceAnalysis {
  _id: string;
  websiteUrl: string;
  businessPersona: string;
  jobFunctions: string[];
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  onAnalysisCompleted?: () => void;
  refreshTrigger?: number;
}

export default function SavedAudienceAnalyses({ onAnalysisCompleted, refreshTrigger = 0 }: Props) {
  const { isAuthenticated } = useAuth();
  const [audienceAnalyses, setAudienceAnalyses] = useState<AudienceAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<AudienceAnalysis | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAudienceAnalyses();
    }
  }, [isAuthenticated, refreshTrigger]);

  const fetchAudienceAnalyses = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/linkedin/audience-analyses/saved`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audience analyses');
      }

      const data = await response.json();
      setAudienceAnalyses(data);
      
      // Notify parent component when analyses are loaded
      if (onAnalysisCompleted) {
        onAnalysisCompleted();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this audience analysis?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/linkedin/audience-analyses/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete audience analysis');
      }

      // Remove the deleted analysis from state
      setAudienceAnalyses(prevAnalyses => prevAnalyses.filter(analysis => analysis._id !== id));
      if (selectedAnalysis?._id === id) {
        setSelectedAnalysis(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete audience analysis');
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
      {audienceAnalyses.length === 0 ? (
        <p className="text-gray-600">No saved audience analyses found.</p>
      ) : (
        <div className="space-y-6">
          {audienceAnalyses.map((analysis) => (
            <div key={analysis._id} className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Website: {analysis.websiteUrl}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {new Date(analysis.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Job Functions:</span> {analysis.jobFunctions.join(', ')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedAnalysis(selectedAnalysis?._id === analysis._id ? null : analysis)}
                    className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {selectedAnalysis?._id === analysis._id ? 'Hide' : 'View'}
                  </button>
                  <button
                    onClick={() => handleDelete(analysis._id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              {selectedAnalysis?._id === analysis._id && (
                <div 
                  className="mt-4 p-4 bg-gray-50 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: analysis.content }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 