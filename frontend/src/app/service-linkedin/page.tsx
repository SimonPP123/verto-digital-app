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
            
            setResultMessage("Audience Analysis: Your LinkedIn AI audience analysis has been successfully generated! You can find it below and in the Google Drive folder.");
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

  if (authLoading) {
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
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
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
          disabled={isSubmitting}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Processing...' : 'Generate Audience Analysis'}
        </button>
      </form>

      {resultMessage && (
        <div className={`mt-8 p-4 rounded-lg ${
          analysisStatus === 'error' ? 'bg-red-50' : 
          analysisStatus === 'processing' ? 'bg-yellow-50' : 
          'bg-green-50'
        }`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {analysisStatus === 'error' ? 'Error' : 
             analysisStatus === 'processing' ? 'Processing' : 
             'Success'}
          </h2>
          <div className="prose max-w-none">
            {resultMessage.split('\n').map((line, index) => (
              <p key={index} className={`mb-2 ${
                analysisStatus === 'error' ? 'text-red-600' : 
                analysisStatus === 'processing' ? 'text-yellow-600' : 
                line.startsWith('Audience Analysis:') ? 'text-gray-900 font-semibold' : 'text-green-600'
              }`}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Analysis Results</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {typeof analysis.content === 'object' && analysis.content !== null ? (
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
        </div>
      )}

      <CollapsibleSection title="Saved Audience Analyses" defaultOpen={true}>
        <SavedAudienceAnalyses refreshTrigger={refreshAnalyses} />
      </CollapsibleSection>
    </div>
  );
} 