'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedAudienceAnalyses from '../../components/SavedAudienceAnalyses';
import CollapsibleSection from '../../components/CollapsibleSection';

type Analysis = {
  content: string | {
    icp?: string;
    websiteSummary?: string;
    scoring?: string;
    categories?: string;
  };
  targetUrl: string;
  createdAt: string;
};

export default function LinkedInServicePage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [targetUrl, setTargetUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [refreshAnalyses, setRefreshAnalyses] = useState(0);
  const [selectedJobFunctions, setSelectedJobFunctions] = useState<string[]>([]);
  const [jobFunctions, setJobFunctions] = useState<string[]>([]);
  const [isJobFunctionsLoading, setIsJobFunctionsLoading] = useState(false);
  const [jobFunctionError, setJobFunctionError] = useState<string | null>(null);

  // Job functions options
  const jobFunctionsOptions = [
    'Accounting',
    'Administrative',
    'Arts and Design',
    'Business Development',
    'Community and Social Services',
    'Consulting',
    'Education',
    'Engineering',
    'Entrepreneurship',
    'Finance',
    'Healthcare Services',
    'Human Resources',
    'Information Technology',
    'Legal',
    'Marketing',
    'Media and Communication',
    'Military and Protective Services',
    'Operations',
    'Product Management',
    'Program and Project Management',
    'Purchasing',
    'Quality Assurance',
    'Real Estate',
    'Research',
    'Sales',
    'Customer Success and Support'
  ];

  // Poll for results
  useEffect(() => {
    if (analysisStatus === 'processing') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/linkedin/audience-analysis/status');
          const data = await response.json();
          
          if (data.status === 'completed') {
            setAnalysisStatus('completed');
            
            // Handle the content based on its type
            if (typeof data.content === 'string') {
              try {
                // Try to parse it as JSON if it's a string that looks like JSON
                const parsedContent = JSON.parse(data.content);
                setAnalysis({
                  content: parsedContent,
                  targetUrl: '',
                  createdAt: new Date().toISOString()
                });
              } catch (e) {
                // If parsing fails, set it as a string
                setAnalysis({
                  content: data.content,
                  targetUrl: '',
                  createdAt: new Date().toISOString()
                });
              }
            } else {
              // It's already an object, set it directly
              setAnalysis({
                content: data.content,
                targetUrl: '',
                createdAt: new Date().toISOString()
              });
            }
            
            setResultMessage("Audience Analysis: Your LinkedIn AI audience analysis has been successfully generated! You can find it below and in the Google Drive folder: https://drive.google.com/drive/u/0/folders/1qLEEcY658Yj1p409NdrG9JACKATpVTin");
            setRefreshAnalyses(prev => prev + 1);
          }
        } catch (error) {
          console.error('Error checking analysis status:', error);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [analysisStatus]);

  // Handle job function selection with a maximum of 13
  const handleJobFunctionToggle = (jobFunction: string) => {
    setJobFunctionError(null);
    
    if (selectedJobFunctions.includes(jobFunction)) {
      // Remove the job function if it's already selected
      setSelectedJobFunctions(prev => prev.filter(job => job !== jobFunction));
    } else {
      // Add the job function if it's not already selected and we haven't reached the limit
      if (selectedJobFunctions.length >= 13) {
        setJobFunctionError("Maximum 13 job functions can be selected");
        return;
      }
      setSelectedJobFunctions(prev => [...prev, jobFunction]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get the form element and extract businessPersona value
    const form = e.target as HTMLFormElement;
    const businessPersonaElement = form.elements.namedItem('businessPersona') as HTMLTextAreaElement;
    const businessPersona = businessPersonaElement?.value;
    
    if (!targetUrl) {
      alert('Please enter a target URL');
      return;
    }
    
    if (!businessPersona) {
      alert('Please enter your business persona');
      return;
    }
    
    if (selectedJobFunctions.length === 0) {
      setJobFunctionError('Please select at least one job function');
      return;
    }
    
    setIsSubmitting(true);
    setAnalysisStatus('processing');
    setResultMessage(null);
    setAnalysis(null);
    
    try {
      const response = await fetch('/api/linkedin/audience-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: targetUrl,
          businessPersona,
          jobFunctions: selectedJobFunctions
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResultMessage('Your LinkedIn AI audience analysis is being generated. This may take a few minutes.');
      } else {
        setAnalysisStatus('error');
        setResultMessage(`Error: ${data.message || 'Failed to submit audience analysis request'}`);
      }
    } catch (error) {
      console.error('Error submitting audience analysis:', error);
      setAnalysisStatus('error');
      setResultMessage('Error: Failed to connect to the server. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add this function to render structured content
  const renderStructuredContent = (content: any) => {
    if (!content) return <div>No content available</div>;

    // Helper function to process HTML content safely
    const processHtmlContent = (html: string) => {
      if (!html) return "";
      // Basic sanitization (remove script tags)
      return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    };

    // Helper function to download analysis as text file
    const downloadAnalysis = () => {
      if (!analysis?.content) return;
      
      const content = typeof analysis.content === 'string' 
        ? analysis.content 
        : JSON.stringify(analysis.content, null, 2);
      
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
            onClick={downloadAnalysis}
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
            'low_relevance'
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50 to-white">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-indigo-100">
          <h1 className="text-2xl font-bold text-indigo-900 mb-4">Access Denied</h1>
          <p className="text-indigo-700">Please log in to access this service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 bg-white rounded-xl shadow-lg">
      <h1 className="text-3xl font-bold text-indigo-900 mb-8 border-b-2 border-indigo-100 pb-4">LinkedIn AI Audience Analysis</h1>
      
      <div className="mb-8">
        <p className="text-indigo-800 mb-6 text-lg">
          Enter your website URL, business persona, and select job functions to generate a comprehensive LinkedIn audience analysis.
        </p>
        
        <div className="bg-gradient-to-r from-indigo-50 to-white p-6 rounded-lg border border-indigo-200 mb-8 shadow-md">
          <h2 className="text-lg font-semibold text-indigo-900 mb-4">How the LinkedIn AI Audience Analysis works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-indigo-700 ml-4">
            <li>Enter your website URL, business persona, and select relevant job functions</li>
            <li>Our AI analyzes your website and business information</li>
            <li>The system generates a comprehensive audience analysis for LinkedIn targeting</li>
            <li>Results include ICP details, website summary, job title scoring, and relevance categories</li>
            <li>Your analysis is saved and can be accessed anytime</li>
          </ol>
          <div className="mt-6 flex items-center">
            <span className="text-indigo-800 mr-3 font-medium">Access all audience analyses here:</span>
            <a 
              href="https://drive.google.com/drive/u/0/folders/1qLEEcY658Yj1p409NdrG9JACKATpVTin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
            >
              Open Google Drive Folder
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-indigo-900 mb-6 pb-3 border-b border-indigo-100">Generate New Analysis</h2>

        <div className="space-y-6">
        <div>
            <label htmlFor="websiteUrl" className="block text-base font-medium text-indigo-900 mb-2">
              Website URL <span className="text-red-500">*</span>
          </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                </svg>
              </div>
          <input
            type="url"
                name="websiteUrl"
                id="websiteUrl"
            required
                placeholder="https://example.com/"
                className="block w-full pl-10 rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 py-3 px-4"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>
            <p className="mt-1 text-sm text-indigo-600">Enter the full URL of the website you want to analyze</p>
        </div>

        <div>
            <label htmlFor="businessPersona" className="block text-base font-medium text-indigo-900 mb-2">
              ICP / Business Persona <span className="text-red-500">*</span>
          </label>
          <textarea
              name="businessPersona"
              id="businessPersona"
              rows={4}
            required
              placeholder="Describe your business, products/services, and target audience..."
              className="block w-full rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 py-3 px-4"
          />
            <p className="mt-1 text-sm text-indigo-600">Provide details about your business and ideal customer profile</p>
        </div>

        <div>
            <label className="block text-base font-medium text-indigo-900 mb-2">
              Job Functions <span className="text-red-500">*</span> <span className="text-sm font-normal text-indigo-600">(Select up to 13)</span>
          </label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border border-indigo-200 rounded-lg bg-indigo-50">
              {jobFunctionsOptions.map(job => (
                <button
                  key={job}
                  type="button"
                  onClick={() => handleJobFunctionToggle(job)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedJobFunctions.includes(job)
                      ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                      : 'bg-white text-indigo-800 hover:bg-indigo-200 border border-indigo-200'
                  }`}
                >
                  {job}
                </button>
              ))}
            </div>
            {jobFunctionError && (
              <p className="mt-2 text-sm text-red-600 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {jobFunctionError}
              </p>
            )}
            {selectedJobFunctions.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-indigo-700 font-medium">
                    Selected: <span className="font-bold">{selectedJobFunctions.length}/13</span>
                  </p>
                  {selectedJobFunctions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedJobFunctions([])}
                      className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="mt-2 p-3 bg-white rounded-lg border border-indigo-200">
                  <div className="flex flex-wrap gap-2">
                    {selectedJobFunctions.map(job => (
                      <span 
                        key={job} 
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-indigo-100 text-indigo-800"
                      >
                        {job}
                        <button
                          type="button"
                          onClick={() => handleJobFunctionToggle(job)}
                          className="ml-1.5 text-indigo-600 hover:text-indigo-900"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200">
        <button
          type="submit"
            disabled={isSubmitting}
            className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : 'transform hover:scale-[1.02]'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : 'Generate Audience Analysis'}
        </button>
        </div>
      </form>

      {resultMessage && (
        <div className={`mt-8 rounded-xl shadow-lg overflow-hidden`}>
          <div className={`p-1 ${
            analysisStatus === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600' : 
            analysisStatus === 'processing' ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 
            'bg-gradient-to-r from-emerald-400 to-emerald-500'
          }`}>
            <div className="bg-white p-6 rounded-lg">
              <div className="flex items-start">
                <div className={`flex-shrink-0 p-2 rounded-full ${
                  analysisStatus === 'error' ? 'bg-red-100 text-red-600' : 
                  analysisStatus === 'processing' ? 'bg-amber-100 text-amber-600' : 
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {analysisStatus === 'error' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : analysisStatus === 'processing' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="ml-4 flex-1">
                  <h2 className={`text-xl font-bold mb-2 ${
                    analysisStatus === 'error' ? 'text-red-800' : 
                    analysisStatus === 'processing' ? 'text-amber-800' : 
                    'text-emerald-800'
                  }`}>
                    {analysisStatus === 'error' ? 'Error' : 
                    analysisStatus === 'processing' ? 'Processing' : 
                    'Success'}
                  </h2>
          <div className="prose max-w-none">
                    {resultMessage.split('\n').map((line, index) => {
                      // Check if the line contains a Google Drive link
                      if (line.includes('https://drive.google.com')) {
                        const beforeLink = line.split('https://')[0];
                        const link = 'https://' + line.split('https://')[1];
                        
                        return (
                          <p key={index} className={`mb-3 ${
                            analysisStatus === 'error' ? 'text-red-700' : 
                            analysisStatus === 'processing' ? 'text-amber-700' : 
                            line.startsWith('Audience Analysis:') ? 'text-emerald-900 font-semibold' : 'text-emerald-700'
                          }`}>
                            {beforeLink}
                            <a 
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                            >
                              Google Drive Folder
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                              </svg>
                            </a>
                          </p>
                        );
                      }
                      
                      return (
                        <p key={index} className={`mb-3 ${
                          analysisStatus === 'error' ? 'text-red-700' : 
                          analysisStatus === 'processing' ? 'text-amber-700' : 
                          line.startsWith('Audience Analysis:') ? 'text-emerald-900 font-semibold' : 'text-emerald-700'
                        }`}>
                          {line}
                        </p>
                      );
                    })}
                  </div>
                  
                  {analysisStatus === 'processing' && (
                    <div className="flex items-center mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-700 mr-3"></div>
                      <p className="text-amber-700">This may take a few minutes. You'll be notified when the analysis is complete.</p>
                    </div>
                  )}
                  
                  {analysisStatus === 'completed' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <a 
                        href="https://drive.google.com/drive/u/0/folders/1qLEEcY658Yj1p409NdrG9JACKATpVTin"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                        Open in Google Drive
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          window.scrollTo({
                            top: document.getElementById('analysis-results')?.offsetTop || 0,
                            behavior: 'smooth'
                          });
                        }}
                        className="inline-flex items-center px-4 py-2 border border-indigo-300 text-sm font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        View Results Below
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          {(() => {
            try {
              // First check if the content is already an object
              if (typeof analysis.content === 'object' && analysis.content !== null) {
                return renderStructuredContent(analysis.content);
              }
              
              // If it's a string, try to parse as JSON
              if (typeof analysis.content === 'string') {
                try {
                  const parsedContent = JSON.parse(analysis.content);
                  return renderStructuredContent(parsedContent);
                } catch (e) {
                  // If it can't be parsed as JSON, render as HTML
                  return (
                    <div>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
                        <button
                          onClick={() => {
                            // Ensure content is a string before creating Blob
                            const content = typeof analysis.content === 'string'
                              ? analysis.content
                              : JSON.stringify(analysis.content, null, 2);
                            
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
                          }}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                          Download Analysis
                        </button>
                      </div>
                      <div 
                        className="prose max-w-none" 
                        dangerouslySetInnerHTML={{ 
                          __html: analysis.content || '<p>No content available</p>' 
                        }} 
                      />
                    </div>
                  );
                }
              }
              
              // Fallback for any other type
              return <div>No readable content available</div>;
            } catch (e) {
              console.error("Error rendering analysis content:", e);
              return <div>Error displaying analysis content</div>;
            }
          })()}
        </div>
      )}

      <CollapsibleSection title="Saved Audience Analyses" defaultOpen={true}>
        <SavedAudienceAnalyses refreshTrigger={refreshAnalyses} />
      </CollapsibleSection>
      
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
      `}</style>
    </div>
  );
} 