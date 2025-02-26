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
  
  // Process HTML content to ensure XML-like tags are properly displayed
  const processHtmlContent = (html: string) => {
    if (!html) return '';
    
    // Strip out any script tags for security
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };
  
  return (
    <div className="space-y-6">
      {/* ICP Section */}
      {content.icp && (
        <div className="bg-indigo-50 p-6 rounded-lg shadow-md border border-indigo-200">
          <h3 className="text-xl font-semibold mb-4 text-indigo-800">Ideal Customer Profile (ICP)</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: processHtmlContent(content.icp) }} />
          </div>
        </div>
      )}
      
      {/* Website Summary Section */}
      {content.websiteSummary && (
        <div className="bg-emerald-50 p-6 rounded-lg shadow-md border border-emerald-200">
          <h3 className="text-xl font-semibold mb-4 text-emerald-800">Website Summary</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: processHtmlContent(content.websiteSummary) }} />
          </div>
        </div>
      )}
      
      {/* Scoring Section */}
      {content.scoring && (
        <div className="bg-amber-50 p-6 rounded-lg shadow-md border border-amber-200">
          <h3 className="text-xl font-semibold mb-4 text-amber-800">Audience Scoring</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: processHtmlContent(content.scoring) }} />
          </div>
        </div>
      )}
      
      {/* Categories Section */}
      {content.categories && (
        <div className="bg-purple-50 p-6 rounded-lg shadow-md border border-purple-200">
          <h3 className="text-xl font-semibold mb-4 text-purple-800">Audience Categories</h3>
          <div className="prose max-w-none text-gray-900">
            <div dangerouslySetInnerHTML={{ __html: processHtmlContent(content.categories) }} />
          </div>
        </div>
      )}
      
      {/* Fallback for any additional sections */}
      {Object.entries(content).map(([key, value]) => {
        // Skip the sections we've already handled
        if (['icp', 'websiteSummary', 'scoring', 'categories'].includes(key)) {
          return null;
        }
        
        if (typeof value === 'string' && value.trim()) {
          return (
            <div key={key} className="bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
              <h3 className="text-xl font-semibold mb-4 text-blue-800">{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}</h3>
              <div className="prose max-w-none text-gray-900">
                <div dangerouslySetInnerHTML={{ __html: processHtmlContent(value as string) }} />
              </div>
            </div>
          );
        }
        return null;
      })}
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
              {(() => {
                try {
                  // If isStructured flag is true or content is an object
                  if (analysis.isStructured || (typeof analysis.content === 'object' && analysis.content !== null)) {
                    return renderStructuredContent(analysis.content);
                  }
                  
                  // Try to parse the content as JSON if it's a string
                  if (typeof analysis.content === 'string') {
                    try {
                      const parsedContent = JSON.parse(analysis.content);
                      if (typeof parsedContent === 'object' && parsedContent !== null) {
                        return renderStructuredContent(parsedContent);
                      }
                    } catch (e) {
                      // Not JSON, continue with regular HTML rendering
                    }
                  }
                  
                  // Regular content as HTML
                  return (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                      <div 
                        className="prose max-w-none text-gray-900"
                        dangerouslySetInnerHTML={{ 
                          __html: typeof analysis.content === 'string' 
                            ? analysis.content 
                            : 'No content available'
                        }} 
                      />
                    </div>
                  );
                } catch (error) {
                  return (
                    <div className="bg-red-50 p-6 rounded-lg shadow-md border border-red-200">
                      <p className="text-red-700">Error displaying content</p>
                    </div>
                  );
                }
              })()}
              
              {/* Download button for analysis */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Create a Blob with the analysis content
                    const contentString = typeof analysis.content === 'object'
                      ? JSON.stringify(analysis.content, null, 2)
                      : analysis.content as string;
                    
                    const blob = new Blob([contentString], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    
                    // Create a link and trigger download
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `linkedin-analysis-${analysis.targetUrl.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
                    document.body.appendChild(a);
                    a.click();
                    
                    // Clean up
                    URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download
                </button>
              </div>
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
        
        /* XML-like tags styling - improved for better visibility */
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
        .prose medium_relevance,
        .prose low_relevance {
          display: block;
          margin: 1.25rem 0;
          padding: 1.25rem;
          border-radius: 0.5rem;
          border-left: 5px solid #4f46e5;
          background-color: #eef2ff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
          font-size: 1rem;
          color: #1f2937;
        }
        
        /* Add a label to each XML tag for better context */
        .prose icp::before,
        .prose firmographic::before,
        .prose technographic::before,
        .prose behavioral_psychographic::before,
        .prose organizational_operational::before,
        .prose strategic_alignment::before,
        .prose explanation::before,
        .prose summary::before,
        .prose page_analysis::before,
        .prose business_summary::before,
        .prose job_title_scoring_analysis::before,
        .prose scoring_system::before,
        .prose analysis::before,
        .prose relevance_categories::before,
        .prose category1::before,
        .prose category2::before,
        .prose category3::before,
        .prose category4::before,
        .prose category5::before,
        .prose category6::before,
        .prose category7::before,
        .prose category8::before,
        .prose category9::before,
        .prose category10::before,
        .prose name::before,
        .prose description::before,
        .prose high_relevance::before,
        .prose medium_relevance::before,
        .prose low_relevance::before {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6366f1;
          margin-bottom: 0.5rem;
          content: attr(tagName);
        }
        
        .prose icp::before { content: "ICP"; }
        .prose firmographic::before { content: "Firmographic Data"; }
        .prose technographic::before { content: "Technographic Data"; }
        .prose behavioral_psychographic::before { content: "Behavioral & Psychographic"; }
        .prose organizational_operational::before { content: "Organizational & Operational"; }
        .prose strategic_alignment::before { content: "Strategic Alignment"; }
        .prose explanation::before { content: "Explanation"; }
        .prose summary::before { content: "Summary"; }
        .prose page_analysis::before { content: "Page Analysis"; }
        .prose business_summary::before { content: "Business Summary"; }
        .prose job_title_scoring_analysis::before { content: "Job Title Scoring Analysis"; }
        .prose scoring_system::before { content: "Scoring System"; }
        .prose analysis::before { content: "Analysis"; }
        .prose relevance_categories::before { content: "Relevance Categories"; }
        .prose name::before { content: "Name"; }
        .prose description::before { content: "Description"; }
        .prose high_relevance::before { content: "High Relevance"; }
        .prose medium_relevance::before { content: "Medium Relevance"; }
        .prose low_relevance::before { content: "Low Relevance"; }
        
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
        
        .prose medium_relevance {
          border-left-color: #d97706;
          background-color: #fffbeb;
        }
        
        .prose low_relevance {
          border-left-color: #dc2626;
          background-color: #fef2f2;
        }
        
        /* Add nested styling for better hierarchy */
        .prose icp > *,
        .prose firmographic > *,
        .prose explanation > *,
        .prose technographic > *,
        .prose behavioral_psychographic > *,
        .prose organizational_operational > *,
        .prose strategic_alignment > *,
        .prose summary > *,
        .prose page_analysis > *,
        .prose business_summary > *,
        .prose job_title_scoring_analysis > *,
        .prose scoring_system > *,
        .prose analysis > *,
        .prose relevance_categories > *,
        .prose category1 > *,
        .prose category2 > *,
        .prose category3 > *,
        .prose category4 > *,
        .prose category5 > *,
        .prose category6 > *,
        .prose category7 > *,
        .prose category8 > *,
        .prose category9 > *,
        .prose category10 > *,
        .prose name > *,
        .prose description > *,
        .prose high_relevance > *,
        .prose medium_relevance > *,
        .prose low_relevance > * {
          margin-left: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default SavedAudienceAnalyses; 