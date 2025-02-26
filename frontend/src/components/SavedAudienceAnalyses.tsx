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
  if (!content) return <div>No content available</div>;

  // Helper function to process HTML content safely
  const processHtmlContent = (html: string) => {
    if (!html) return "";
    // Basic sanitization (remove script tags)
    let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Special handling for scoring_system content to ensure proper formatting
    // Adding a wrapper class if needed for specific styling
    if (html.includes('<scoring_system>') || html.includes('scoring_system')) {
      sanitized = sanitized.replace(/<scoring_system>/gi, '<div class="scoring_system">');
      sanitized = sanitized.replace(/<\/scoring_system>/gi, '</div>');
    }
    
    // Ensure all content is visible and properly formatted
    return sanitized;
  };

  // Helper function to download analysis as text file
  const downloadAnalysis = (analysisContent: any) => {
    if (!analysisContent) return;
    
    const content = typeof analysisContent === 'string' 
      ? analysisContent 
      : JSON.stringify(analysisContent, null, 2);
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `linkedin-analysis-${date}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Format keys for display (convert camelCase or snake_case to Title Case)
  const formatKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Determine if content is relevance category related
  const isRelevanceCategory = (key: string) => {
    return key.includes('relevance') || 
           key.includes('category') || 
           ['high_relevance', 'medium_relevance', 'low_relevance'].includes(key);
  };

  // Determine color class based on section type
  const getSectionColorClass = (key: string) => {
    if (key === 'icp') return 'text-indigo-900';
    if (key === 'websiteSummary' || key.includes('summary')) return 'text-emerald-800';
    if (key.includes('scoring') || key.includes('score')) return 'text-amber-800';
    if (key.includes('categor')) return 'text-purple-800';
    if (isRelevanceCategory(key)) return 'text-violet-800';
    return 'text-gray-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
        <button
          onClick={() => downloadAnalysis(content)}
          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
        >
          Download Analysis
        </button>
      </div>
      
      {/* ICP Section */}
      {content.icp && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">Ideal Customer Profile (ICP)</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.icp) 
            }} 
          />
        </div>
      )}

      {/* Website Summary Section */}
      {content.websiteSummary && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-emerald-800 mb-4">Website Summary</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.websiteSummary) 
            }} 
          />
        </div>
      )}

      {/* Scoring Section */}
      {content.scoring && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Audience Scoring</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.scoring) 
            }} 
          />
        </div>
      )}

      {/* Job Title Scoring Analysis */}
      {content.job_title_scoring_analysis && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Job Title Scoring Analysis</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.job_title_scoring_analysis) 
            }} 
          />
        </div>
      )}

      {/* Relevance Categories Section */}
      {content.relevance_categories && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-violet-800 mb-4">Relevance Categories</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.relevance_categories) 
            }} 
          />
        </div>
      )}

      {/* Categories Section */}
      {content.categories && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-purple-800 mb-4">Audience Categories</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.categories) 
            }} 
          />
        </div>
      )}

      {/* Summary Section (if it exists separately) */}
      {content.summary && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-blue-800 mb-4">Summary</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.summary) 
            }} 
          />
        </div>
      )}

      {/* Scoring System Section - Handle specifically */}
      {content.scoring_system && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-amber-800 mb-4">Scoring System</h3>
          <div 
            className="prose max-w-none" 
            dangerouslySetInnerHTML={{ 
              __html: processHtmlContent(content.scoring_system) 
            }} 
          />
        </div>
      )}

      {/* Relevance Levels Sections */}
      {(content.high_relevance || content.medium_relevance || content.low_relevance) && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-violet-800 mb-4">Audience Relevance Levels</h3>
          
          {content.high_relevance && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
              <h4 className="text-lg font-semibold text-green-800 mb-2">High Relevance</h4>
              <div 
                className="prose max-w-none" 
                dangerouslySetInnerHTML={{ 
                  __html: processHtmlContent(content.high_relevance) 
                }} 
              />
            </div>
          )}
          
          {content.medium_relevance && (
            <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md">
              <h4 className="text-lg font-semibold text-amber-800 mb-2">Medium Relevance</h4>
              <div 
                className="prose max-w-none" 
                dangerouslySetInnerHTML={{ 
                  __html: processHtmlContent(content.medium_relevance) 
                }} 
              />
            </div>
          )}
          
          {content.low_relevance && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <h4 className="text-lg font-semibold text-red-800 mb-2">Low Relevance</h4>
              <div 
                className="prose max-w-none" 
                dangerouslySetInnerHTML={{ 
                  __html: processHtmlContent(content.low_relevance) 
                }} 
              />
            </div>
          )}
        </div>
      )}

      {/* Category Sections (numbered categories) */}
      {(() => {
        const categoryKeys = Object.keys(content).filter(key => /^category\d+$/.test(key));
        if (categoryKeys.length === 0) return null;
        
        return (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-purple-800 mb-4">Specific Audience Categories</h3>
            {categoryKeys.sort().map((key) => (
              <div key={key} className="audience-category mb-6">
                <h4 className="text-lg font-semibold text-purple-800 mb-2">
                  {formatKey(key)}
                </h4>
                <div 
                  className="prose max-w-none" 
                  dangerouslySetInnerHTML={{ 
                    __html: processHtmlContent(content[key]) 
                  }} 
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Handle any additional sections not specifically defined */}
      {Object.entries(content).map(([key, value]) => {
        // Skip sections we've already rendered
        if ([
          'icp', 
          'websiteSummary', 
          'scoring', 
          'categories', 
          'summary', 
          'job_title_scoring_analysis',
          'relevance_categories',
          'high_relevance', 
          'medium_relevance', 
          'low_relevance',
          'scoring_system'
        ].includes(key) || /^category\d+$/.test(key)) {
          return null;
        }
        
        return (
          <div key={key} className="mb-8">
            <h3 className={`text-xl font-bold ${getSectionColorClass(key)} mb-4`}>
              {formatKey(key)}
            </h3>
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: typeof value === 'string' ? processHtmlContent(value as string) : JSON.stringify(value, null, 2)
              }}
            />
          </div>
        );
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
            <div className="mt-4 border-t border-gray-200 pt-4">
              {typeof analysis.content === 'object' ? (
                renderStructuredContent(analysis.content)
              ) : (
                <>
                  {(() => {
                    try {
                      // Try to parse JSON first
                      const parsedContent = JSON.parse(analysis.content as string);
                      return renderStructuredContent(parsedContent);
                    } catch (e) {
                      // If parsing fails, treat as HTML
                      return (
                        <div>
                          <div 
                            className="prose max-w-none" 
                            dangerouslySetInnerHTML={{ 
                              __html: analysis.content as string || '<p>No content available</p>' 
                            }} 
                          />
                          <div className="mt-4 text-right">
                            <button
                              onClick={() => {
                                const blob = new Blob([
                                  typeof analysis.content === 'string' 
                                    ? analysis.content 
                                    : JSON.stringify(analysis.content, null, 2)
                                ], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                const date = new Date().toISOString().split('T')[0];
                                a.href = url;
                                a.download = `linkedin-analysis-${date}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                            >
                              Download Analysis
                            </button>
                          </div>
                        </div>
                      );
                    }
                  })()}
                </>
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

        /* Specific styling for audience-category divs */
        .prose .audience-category,
        .audience-category {
          display: block;
          margin: 1.5rem 0;
          padding: 1.5rem;
          border-radius: 0.5rem;
          border-left: 5px solid #8b5cf6;
          background-color: #f5f3ff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        }

        /* Make h3 inside audience-category more prominent */
        .prose .audience-category h3,
        .audience-category h3 {
          color: #6d28d9;
          font-size: 1.25rem;
          margin-top: 0;
        }

        /* Ensure ul inside audience-category displays properly */
        .prose .audience-category ul,
        .audience-category ul {
          margin-top: 0.75rem;
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
        
        /* Enhanced styling for scoring system to ensure all nested content displays properly */
        .prose scoring_system h3,
        .prose .scoring_system h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #92400e;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }
        
        .prose scoring_system h4,
        .prose .scoring_system h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #b45309;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .prose scoring_system ul,
        .prose .scoring_system ul {
          list-style-type: disc;
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        
        .prose scoring_system li,
        .prose .scoring_system li {
          margin-bottom: 0.5rem;
        }
        
        .prose scoring_system p,
        .prose .scoring_system p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        /* Special styling for the scoring levels */
        .prose scoring_system strong,
        .prose .scoring_system strong {
          color: #92400e;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default SavedAudienceAnalyses; 