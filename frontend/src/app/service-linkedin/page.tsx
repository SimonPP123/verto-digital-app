'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedAudienceAnalyses from '../../components/SavedAudienceAnalyses';
import CollapsibleSection from '../../components/CollapsibleSection';

export default function LinkedInServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [analysis, setAnalysis] = useState<{
    icp: string;
    websiteSummary: string;
    scoring: string;
    categories: string;
  } | null>(null);
  const [refreshAnalyses, setRefreshAnalyses] = useState(0);
  const [selectedJobFunctions, setSelectedJobFunctions] = useState<string[]>([]);

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
    let pollInterval: NodeJS.Timeout;

    if (status === 'processing') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/linkedin/audience-analysis/status`, {
            credentials: 'include'
          });
          const data = await response.json();
          
          if (data.status === 'completed' && data.content) {
            setStatus('completed');
            // Parse the content if it's a string
            if (typeof data.content === 'string') {
              try {
                // Try to parse as JSON
                const parsedContent = JSON.parse(data.content);
                setAnalysis(parsedContent);
              } catch (e) {
                // If parsing fails, set the content as is
                setAnalysis({
                  icp: data.content,
                  websiteSummary: '',
                  scoring: '',
                  categories: ''
                });
              }
            } else if (typeof data.content === 'object') {
              // If content is already an object, set it directly
              setAnalysis(data.content);
            }
            console.log('Audience Analysis Completed:', data.content);
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.error('Error polling for results:', error);
        }
      }, 5000); // Poll every 5 seconds
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [status]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus('processing');
    setAnalysis(null);
    
    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/linkedin/audience-analysis`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          websiteUrl: formData.get('websiteUrl'),
          businessPersona: formData.get('businessPersona'),
          jobFunctions: selectedJobFunctions
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('processing');
        setResult('Your audience analysis request is being processed. This might take some time...');
      } else {
        setStatus('error');
        setResult('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
      setResult('An error occurred while processing your request.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (status === 'completed') {
      setResult('Audience Analysis: Your LinkedIn AI audience analysis has been successfully generated! You can find it below and in the Google Drive folder.');
      // Trigger refresh of saved analyses
      setRefreshAnalyses(prev => prev + 1);
    }
  }, [status]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access this service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">LinkedIn AI Audience Analysis</h1>
      
      <div className="mb-8 prose">
        <p className="text-gray-600 mb-6">
          Enter your website URL, business persona, and select job functions to generate a comprehensive LinkedIn audience analysis.
        </p>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">How the LinkedIn AI Audience Analysis works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Enter your website URL, business persona, and select relevant job functions</li>
            <li>Our AI analyzes your website and business information</li>
            <li>The system generates a comprehensive audience analysis for LinkedIn targeting</li>
            <li>Results include ICP details, website summary, job title scoring, and relevance categories</li>
            <li>Your analysis is saved and can be accessed anytime</li>
          </ol>
          <div className="mt-6 flex items-center">
            <span className="text-gray-600 mr-3">Access all audience analyses here:</span>
            <a 
              href="https://drive.google.com/drive/u/0/folders/1qLEEcY658Yj1p409NdrG9JACKATpVTin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Open Google Drive Folder
            </a>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700">
            Website URL
          </label>
          <input
            type="url"
            name="websiteUrl"
            id="websiteUrl"
            required
            placeholder="https://google.com/"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="businessPersona" className="block text-sm font-medium text-gray-700">
            ICP / Business Persona
          </label>
          <textarea
            name="businessPersona"
            id="businessPersona"
            rows={4}
            required
            placeholder="Input your ICP here if you have it..."
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
          />
        </div>

        <div>
          <label htmlFor="jobFunctions" className="block text-sm font-medium text-gray-700">
            Job Functions
          </label>
          <select
            name="jobFunctions"
            id="jobFunctions"
            multiple
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
            size={6}
            onChange={handleJobFunctionChange}
          >
            {jobFunctionsOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">Hold Ctrl (or Cmd) to select multiple options</p>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? 'Processing...' : 'Generate Audience Analysis'}
        </button>
      </form>

      {result && (
        <div className={`mt-8 p-4 rounded-lg ${
          status === 'error' ? 'bg-red-50' : 
          status === 'processing' ? 'bg-yellow-50' : 
          'bg-green-50'
        }`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {status === 'error' ? 'Error' : 
             status === 'processing' ? 'Processing' : 
             'Success'}
          </h2>
          <div className="prose max-w-none">
            {result.split('\n').map((line, index) => (
              <p key={index} className={`mb-2 ${
                status === 'error' ? 'text-red-600' : 
                status === 'processing' ? 'text-yellow-600' : 
                line.startsWith('Audience Analysis:') ? 'text-gray-900 font-semibold' : 'text-green-600'
              }`}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Google Drive with all audience analyses</h2>
          <p className="text-gray-600 mb-4">Access all your generated audience analyses in the Google Drive folder below:</p>
          <a 
            href="https://drive.google.com/drive/u/0/folders/1qLEEcY658Yj1p409NdrG9JACKATpVTin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Open Google Drive Folder
          </a>
        </div>
      )}

      {analysis && (
        <CollapsibleSection title="Generated Audience Analysis" defaultOpen={true}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <div className="audience-analysis-content">
              {typeof analysis === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: analysis }} />
              ) : (
                <div className="audience-analysis">
                  {/* ICP Section */}
                  {analysis.icp && (
                    <section className="icp-section">
                      <h2>Ideal Customer Profile (ICP)</h2>
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: analysis.icp }} />
                    </section>
                  )}

                  {/* Website Summary Section */}
                  {analysis.websiteSummary && (
                    <section className="website-summary-section">
                      <h2>Website Analysis</h2>
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: analysis.websiteSummary }} />
                    </section>
                  )}

                  {/* Scoring Section */}
                  {analysis.scoring && (
                    <section className="scoring-section">
                      <h2>Job Title Scoring Analysis</h2>
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: analysis.scoring }} />
                    </section>
                  )}

                  {/* Categories Section */}
                  {analysis.categories && (
                    <section className="categories-section">
                      <h2>Categories Analysis</h2>
                      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: analysis.categories }} />
                    </section>
                  )}
                </div>
              )}
            </div>
            <style jsx global>{`
              .audience-analysis-content .audience-analysis section {
                margin-bottom: 2rem;
                border-radius: 0.5rem;
                overflow: hidden;
              }
              .audience-analysis-content .audience-analysis h2 {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 1rem;
                color: #1e3a8a;
                padding: 0.75rem 1rem;
                background-color: #f0f5ff;
                border-left: 4px solid #3b82f6;
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
                border-left-color: #3b82f6;
                background-color: #eff6ff;
              }
              .audience-analysis-content .website-summary-section h2 {
                border-left-color: #10b981;
                background-color: #ecfdf5;
              }
              .audience-analysis-content .scoring-section h2 {
                border-left-color: #f59e0b;
                background-color: #fffbeb;
              }
              .audience-analysis-content .categories-section h2 {
                border-left-color: #8b5cf6;
                background-color: #f5f3ff;
              }
              .audience-analysis-content .prose {
                max-width: none;
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
              .audience-analysis-content .prose h3 {
                font-size: 1.25rem;
                font-weight: 600;
                margin-top: 1.5rem;
                margin-bottom: 0.75rem;
                color: #374151;
              }
              .audience-analysis-content .prose h4 {
                font-size: 1.125rem;
                font-weight: 600;
                margin-top: 1.25rem;
                margin-bottom: 0.5rem;
                color: #4b5563;
              }
              .audience-analysis-content .prose table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 1rem;
              }
              .audience-analysis-content .prose table th,
              .audience-analysis-content .prose table td {
                padding: 0.5rem 0.75rem;
                border: 1px solid #e5e7eb;
              }
              .audience-analysis-content .prose table th {
                background-color: #f9fafb;
                font-weight: 600;
              }
              /* Additional styles for XML-like tags */
              .audience-analysis-content .prose icp,
              .audience-analysis-content .prose firmographic,
              .audience-analysis-content .prose explanation,
              .audience-analysis-content .prose technographic,
              .audience-analysis-content .prose behavioral_psychographic,
              .audience-analysis-content .prose organizational_operational,
              .audience-analysis-content .prose strategic_alignment,
              .audience-analysis-content .prose summary,
              .audience-analysis-content .prose page_analysis,
              .audience-analysis-content .prose business_summary,
              .audience-analysis-content .prose job_title_scoring_analysis,
              .audience-analysis-content .prose scoring_system,
              .audience-analysis-content .prose analysis,
              .audience-analysis-content .prose relevance_categories,
              .audience-analysis-content .prose category1,
              .audience-analysis-content .prose category2,
              .audience-analysis-content .prose category3,
              .audience-analysis-content .prose category4,
              .audience-analysis-content .prose category5,
              .audience-analysis-content .prose category6,
              .audience-analysis-content .prose category7,
              .audience-analysis-content .prose category8,
              .audience-analysis-content .prose category9,
              .audience-analysis-content .prose category10,
              .audience-analysis-content .prose name,
              .audience-analysis-content .prose description,
              .audience-analysis-content .prose high_relevance,
              .audience-analysis-content .prose low_relevance {
                display: block;
                margin: 1rem 0;
                padding: 0.5rem;
                border-left: 3px solid #3b82f6;
                background-color: #f9fafb;
              }
              .audience-analysis-content .prose firmographic,
              .audience-analysis-content .prose technographic,
              .audience-analysis-content .prose behavioral_psychographic,
              .audience-analysis-content .prose organizational_operational,
              .audience-analysis-content .prose strategic_alignment {
                margin-left: 1rem;
                border-left-color: #10b981;
              }
              .audience-analysis-content .prose explanation {
                margin-left: 1rem;
                font-style: italic;
                color: #6b7280;
                border-left-color: #f59e0b;
              }
              .audience-analysis-content .prose name {
                font-weight: 600;
                color: #1e3a8a;
                border-left-color: #8b5cf6;
              }
              .audience-analysis-content .prose high_relevance,
              .audience-analysis-content .prose low_relevance {
                margin-left: 1rem;
              }
              .audience-analysis-content .prose high_relevance {
                border-left-color: #10b981;
              }
              .audience-analysis-content .prose low_relevance {
                border-left-color: #ef4444;
              }
            `}</style>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Saved Audience Analyses" defaultOpen={true}>
        <SavedAudienceAnalyses refreshTrigger={refreshAnalyses} />
      </CollapsibleSection>
    </div>
  );
} 