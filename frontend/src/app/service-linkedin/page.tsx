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

  const handleJobFunctionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedValues: string[] = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    
    setSelectedJobFunctions(selectedValues);
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
      alert('Please select at least one job function');
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

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-indigo-900 mb-2">
            Website URL
          </label>
          <input
            type="url"
            name="websiteUrl"
            id="websiteUrl"
            required
            placeholder="https://example.com/"
            className="block w-full rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 py-3 px-4"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="businessPersona" className="block text-sm font-medium text-indigo-900 mb-2">
            ICP / Business Persona
          </label>
          <textarea
            name="businessPersona"
            id="businessPersona"
            rows={4}
            required
            placeholder="Describe your business, products/services, and target audience..."
            className="block w-full rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 py-3 px-4"
          />
        </div>

        <div>
          <label htmlFor="jobFunctions" className="block text-sm font-medium text-indigo-900 mb-2">
            Job Functions
          </label>
          <select
            name="jobFunctions"
            id="jobFunctions"
            multiple
            required
            className="block w-full rounded-md border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 py-3 px-4"
            size={6}
            onChange={handleJobFunctionChange}
          >
            {jobFunctionsOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-indigo-700 font-medium">Hold Ctrl (or Cmd) to select multiple options</p>
          {selectedJobFunctions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedJobFunctions.map(job => (
                <span key={job} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                  {job}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 ${
            isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
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
      </form>

      {resultMessage && (
        <div className={`mt-8 p-6 rounded-lg shadow-md ${
          analysisStatus === 'error' ? 'bg-red-50 border border-red-200' : 
          analysisStatus === 'processing' ? 'bg-amber-50 border border-amber-200' : 
          'bg-emerald-50 border border-emerald-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            analysisStatus === 'error' ? 'text-red-800' : 
            analysisStatus === 'processing' ? 'text-amber-800' : 
            'text-emerald-800'
          }`}>
            {analysisStatus === 'error' ? 'Error' : 
             analysisStatus === 'processing' ? 'Processing' : 
             'Success'}
          </h2>
          <div className="prose max-w-none">
            {resultMessage.split('\n').map((line, index) => (
              <p key={index} className={`mb-2 ${
                analysisStatus === 'error' ? 'text-red-700' : 
                analysisStatus === 'processing' ? 'text-amber-700' : 
                line.startsWith('Audience Analysis:') ? 'text-emerald-900 font-semibold' : 'text-emerald-700'
              }`}>
                {line.includes('https://drive.google.com') ? (
                  <>
                    {line.split('https://')[0]}
                    <a 
                      href={`https://${line.split('https://')[1]}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline"
                    >
                      Google Drive Folder
                    </a>
                  </>
                ) : line}
              </p>
            ))}
          </div>
          
          {analysisStatus === 'processing' && (
            <div className="flex items-center mt-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-700 mr-3"></div>
              <p className="text-amber-700">This may take a few minutes...</p>
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-indigo-200">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6 pb-3 border-b border-indigo-100">Analysis Results</h2>
          <div className="bg-gradient-to-r from-indigo-50 to-white rounded-lg shadow-md border border-indigo-200 overflow-hidden">
            {typeof analysis.content === 'object' && analysis.content !== null ? (
              renderStructuredContent(analysis.content)
            ) : (
              <div className="p-6">
                <div 
                  className="prose max-w-none text-gray-900"
                  dangerouslySetInnerHTML={{ __html: analysis.content as string }} 
                />
              </div>
            )}
          </div>
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
          color: #1f2937;
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
          color: #1e3a8a;
        }
        .prose h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          color: #1e40af;
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
          color: #1f2937;
          border-left-color: #4f46e5;
          background-color: #eef2ff;
        }
        
        .prose name {
          font-weight: 600;
          color: #1e3a8a;
          border-left-color: #7c3aed;
          background-color: #f5f3ff;
        }
        
        .prose high_relevance {
          border-left-color: #047857;
          background-color: #ecfdf5;
        }
        
        .prose low_relevance {
          border-left-color: #b91c1c;
          background-color: #fef2f2;
        }
      `}</style>
    </div>
  );
} 