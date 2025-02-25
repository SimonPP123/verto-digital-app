'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

type Analysis = {
  id: string;
  createdAt: string;
  updatedAt: string;
  targetUrl: string;
  content: string | {
    icp?: string;
    websiteSummary?: string;
    scoring?: string;
    categories?: string;
  };
  isStructured?: boolean;
};

// Add this function to render structured content
const renderStructuredContent = (content: any) => {
  if (!content) return null;
  
  return (
    <div className="space-y-6">
      {/* ICP Section */}
      {content.icp && (
        <div className="bg-indigo-50 p-6 rounded-lg shadow-md border border-indigo-200">
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Ideal Customer Profile (ICP)</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: content.icp }} />
          </div>
        </div>
      )}
      
      {/* Website Summary Section */}
      {content.websiteSummary && (
        <div className="bg-emerald-50 p-6 rounded-lg shadow-md border border-emerald-200">
          <h3 className="text-xl font-semibold mb-4 text-emerald-800">Website Summary</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: content.websiteSummary }} />
          </div>
        </div>
      )}
      
      {/* Scoring Section */}
      {content.scoring && (
        <div className="bg-amber-50 p-6 rounded-lg shadow-md border border-amber-200">
          <h3 className="text-xl font-semibold mb-4 text-amber-800">Audience Scoring</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: content.scoring }} />
          </div>
        </div>
      )}
      
      {/* Categories Section */}
      {content.categories && (
        <div className="bg-purple-50 p-6 rounded-lg shadow-md border border-purple-200">
          <h3 className="text-xl font-semibold mb-4 text-purple-800">Audience Categories</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: content.categories }} />
          </div>
        </div>
      )}
    </div>
  );
};

interface SavedAudienceAnalysesProps {
  refreshTrigger?: number;
}

const SavedAudienceAnalyses: React.FC<SavedAudienceAnalysesProps> = ({ refreshTrigger = 0 }) => {
  const { isAuthenticated } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to fetch from the audience-analyses/saved endpoint
        const response = await fetch('/api/linkedin/audience-analyses/saved');
        
        if (response.status === 404) {
          // If the endpoint doesn't exist, show a more helpful message
          console.log('Saved analyses endpoint not found. This feature may not be fully implemented yet.');
          setAnalyses([]);
          setError('The saved analyses feature is currently being set up. Please check back later or contact support if this persists.');
          setIsLoading(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved analyses');
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.analyses)) {
          setAnalyses(data.analyses);
        } else {
          setAnalyses([]);
        }
      } catch (error) {
        console.error('Error fetching saved analyses:', error);
        setError('Failed to load saved analyses. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSavedAnalyses();
  }, [refreshTrigger]);

  const toggleExpand = (id: string) => {
    setExpandedAnalysis(expandedAnalysis === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id: string) => {
    // Check if ID is valid
    if (!id) {
      console.error('Cannot delete analysis: Invalid ID');
      alert('Error: Unable to delete this analysis due to an invalid ID. Please refresh the page and try again.');
      return;
    }

    // Use a more user-friendly confirmation dialog
    if (window.confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      setIsDeleting(id);
      
      try {
        const response = await fetch(`/api/linkedin/audience-analyses/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete analysis');
        }
        
        // Remove the deleted analysis from the state
        setAnalyses(analyses.filter(analysis => analysis.id !== id));
        
        // Show success message
        alert('Analysis deleted successfully!');
      } catch (error) {
        console.error('Error deleting analysis:', error);
        alert('Failed to delete analysis. Please try again later.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center mb-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
        <p className="text-lg font-medium text-gray-800">Loading saved analyses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
        <p className="text-lg font-medium text-red-700">{error}</p>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4 text-indigo-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Saved Analyses Found</h3>
        <p className="text-gray-800 text-lg">Generate your first analysis using the form above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-indigo-900 mb-4">Your Saved Audience Analyses</h2>
      
      {analyses.map((analysis) => (
        <div key={analysis.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
          <div className="p-5 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-indigo-900">{analysis.targetUrl || 'Audience Analysis'}</h3>
              <p className="text-sm text-indigo-700">Created: {formatDate(analysis.createdAt)}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => toggleExpand(analysis.id)}
                className="flex items-center px-3 py-1.5 text-indigo-700 hover:text-indigo-900 font-medium rounded-md hover:bg-indigo-100 transition-colors duration-200"
              >
                {expandedAnalysis === analysis.id ? (
                  <>
                    <span className="mr-1"><FaChevronUp /></span> Hide Details
                  </>
                ) : (
                  <>
                    <span className="mr-1"><FaChevronDown /></span> Show Details
                  </>
                )}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(analysis.id);
                }}
                disabled={isDeleting === analysis.id}
                className={`flex items-center px-3 py-1.5 font-medium rounded-md transition-colors duration-200 ${
                  isDeleting === analysis.id 
                    ? 'bg-red-100 text-red-400 cursor-not-allowed' 
                    : 'text-red-600 hover:text-red-800 hover:bg-red-50'
                }`}
              >
                <span className="mr-1">
                  {isDeleting === analysis.id ? (
                    <div className="animate-spin h-4 w-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                  ) : (
                    <FaTrash />
                  )}
                </span> 
                {isDeleting === analysis.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
          
          {expandedAnalysis === analysis.id && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              {analysis.isStructured && typeof analysis.content === 'object' ? (
                renderStructuredContent(analysis.content)
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                  <div 
                    className="prose max-w-none text-gray-900"
                    dangerouslySetInnerHTML={{ __html: analysis.content as string }} 
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      <style jsx global>{`
        .prose {
          max-width: none;
          color: #1f2937;
        }
        .prose ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose ol {
          list-style-type: decimal;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .prose p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
          color: #374151;
        }
        .prose strong {
          font-weight: 600;
          color: #111827;
        }
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #1f2937;
        }
        .prose h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #374151;
        }
        
        /* XML-like tags styling */
        .prose icp,
        .prose firmographic,
        .prose explanation,
        .prose technographic,
        .prose behavioral_psychographic,
        .prose organizational_operational,
        .prose strategic_alignment,
        .prose summary,
        .prose page_analysis,
        .prose business_summary,
        .prose job_title_scoring_analysis,
        .prose scoring_system,
        .prose analysis,
        .prose relevance_categories,
        .prose category1,
        .prose category2,
        .prose category3,
        .prose category4,
        .prose category5,
        .prose category6,
        .prose category7,
        .prose category8,
        .prose category9,
        .prose category10,
        .prose name,
        .prose description,
        .prose high_relevance,
        .prose low_relevance {
          display: block;
          margin: 1rem 0;
          padding: 1rem;
          border-radius: 0.375rem;
          border-left: 4px solid #4f46e5;
          background-color: #eef2ff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .prose firmographic {
          border-left-color: #047857;
          background-color: #ecfdf5;
        }
        
        .prose technographic {
          border-left-color: #1d4ed8;
          background-color: #eff6ff;
        }
        
        .prose behavioral_psychographic {
          border-left-color: #6d28d9;
          background-color: #f5f3ff;
        }
        
        .prose organizational_operational {
          border-left-color: #be185d;
          background-color: #fdf2f8;
        }
        
        .prose strategic_alignment {
          border-left-color: #b45309;
          background-color: #fffbeb;
        }
        
        .prose explanation {
          font-style: italic;
          color: #4b5563;
          border-left-color: #6366f1;
          background-color: #eef2ff;
        }
        
        .prose name {
          font-weight: 600;
          color: #1e3a8a;
          border-left-color: #8b5cf6;
          background-color: #f5f3ff;
        }
        
        .prose high_relevance {
          border-left-color: #059669;
          background-color: #ecfdf5;
        }
        
        .prose low_relevance {
          border-left-color: #dc2626;
          background-color: #fef2f2;
        }
      `}</style>
    </div>
  );
};

export default SavedAudienceAnalyses; 