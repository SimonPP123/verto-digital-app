'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

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
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Ideal Customer Profile (ICP)</h3>
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content.icp }} />
          </div>
        </div>
      )}
      
      {/* Website Summary Section */}
      {content.websiteSummary && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Website Summary</h3>
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content.websiteSummary }} />
          </div>
        </div>
      )}
      
      {/* Scoring Section */}
      {content.scoring && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Audience Scoring</h3>
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: content.scoring }} />
          </div>
        </div>
      )}
      
      {/* Categories Section */}
      {content.categories && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Audience Categories</h3>
          <div className="prose max-w-none">
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

  useEffect(() => {
    const fetchSavedAnalyses = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/linkedin/audience-analyses/saved');
        
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

  if (isLoading) {
    return <div className="text-center py-8">Loading saved analyses...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-600">{error}</div>;
  }

  if (analyses.length === 0) {
    return <div className="text-center py-8">No saved analyses found. Generate your first analysis above!</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Saved Audience Analyses</h2>
      
      {analyses.map((analysis) => (
        <div key={analysis.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
            onClick={() => toggleExpand(analysis.id)}
          >
            <div>
              <h3 className="text-lg font-semibold">{analysis.targetUrl || 'Audience Analysis'}</h3>
              <p className="text-sm text-gray-500">Created: {formatDate(analysis.createdAt)}</p>
            </div>
            <button className="text-blue-600 hover:text-blue-800">
              {expandedAnalysis === analysis.id ? 'Hide Details' : 'Show Details'}
            </button>
          </div>
          
          {expandedAnalysis === analysis.id && (
            <div className="border-t border-gray-200">
              {analysis.isStructured ? (
                renderStructuredContent(analysis.content)
              ) : (
                <div className="p-6">
                  <div 
                    className="prose max-w-none"
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
        }
        .prose strong {
          font-weight: 600;
          color: #1f2937;
        }
        .prose h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }
        .prose h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #4b5563;
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
          padding: 0.75rem;
          border-left: 3px solid #3b82f6;
          background-color: #f9fafb;
          border-radius: 0.25rem;
        }
        
        .prose firmographic,
        .prose technographic,
        .prose behavioral_psychographic,
        .prose organizational_operational,
        .prose strategic_alignment {
          margin-left: 1rem;
          border-left-color: #10b981;
          background-color: #ecfdf5;
        }
        
        .prose explanation {
          margin-left: 1rem;
          font-style: italic;
          color: #6b7280;
          border-left-color: #f59e0b;
          background-color: #fffbeb;
        }
        
        .prose name {
          font-weight: 600;
          color: #1e3a8a;
          border-left-color: #8b5cf6;
          background-color: #f5f3ff;
        }
        
        .prose high_relevance {
          margin-left: 1rem;
          border-left-color: #10b981;
          background-color: #ecfdf5;
        }
        
        .prose low_relevance {
          margin-left: 1rem;
          border-left-color: #ef4444;
          background-color: #fef2f2;
        }
      `}</style>
    </div>
  );
};

export default SavedAudienceAnalyses; 