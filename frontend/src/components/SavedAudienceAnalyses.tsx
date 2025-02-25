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
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div 
                    className="audience-analysis-content"
                    dangerouslySetInnerHTML={{ __html: analysis.content }}
                  />
                  <style jsx global>{`
                    .audience-analysis-content .audience-analysis section {
                      margin-bottom: 2rem;
                    }
                    .audience-analysis-content .audience-analysis h2 {
                      font-size: 1.5rem;
                      font-weight: 600;
                      margin-bottom: 1rem;
                      color: #1e3a8a;
                    }
                    .audience-analysis-content .icp-section,
                    .audience-analysis-content .website-summary-section,
                    .audience-analysis-content .scoring-section,
                    .audience-analysis-content .categories-section {
                      padding: 1.5rem;
                      border-radius: 0.5rem;
                      background-color: white;
                      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                      margin-bottom: 1.5rem;
                      border: 1px solid #e5e7eb;
                    }
                    .audience-analysis-content .icp-section h2 {
                      border-left: 4px solid #3b82f6;
                      padding-left: 0.75rem;
                      background-color: #eff6ff;
                      padding: 0.75rem 1rem;
                    }
                    .audience-analysis-content .website-summary-section h2 {
                      border-left: 4px solid #10b981;
                      padding-left: 0.75rem;
                      background-color: #ecfdf5;
                      padding: 0.75rem 1rem;
                    }
                    .audience-analysis-content .scoring-section h2 {
                      border-left: 4px solid #f59e0b;
                      padding-left: 0.75rem;
                      background-color: #fffbeb;
                      padding: 0.75rem 1rem;
                    }
                    .audience-analysis-content .categories-section h2 {
                      border-left: 4px solid #8b5cf6;
                      padding-left: 0.75rem;
                      background-color: #f5f3ff;
                      padding: 0.75rem 1rem;
                    }
                    .audience-analysis-content .prose ul {
                      list-style-type: disc;
                      margin-left: 1.5rem;
                      margin-bottom: 1rem;
                    }
                    .audience-analysis-content .prose ol {
                      list-style-type: decimal;
                      margin-left: 1.5rem;
                      margin-bottom: 1rem;
                    }
                    .audience-analysis-content .prose p {
                      margin-bottom: 0.75rem;
                      line-height: 1.6;
                    }
                    .audience-analysis-content .prose strong {
                      font-weight: 600;
                      color: #1f2937;
                    }
                  `}</style>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 