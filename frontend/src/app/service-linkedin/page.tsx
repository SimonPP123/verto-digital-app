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
  const [analysis, setAnalysis] = useState<any>(null);
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
            setAnalysis(data.content);
            console.log('Audience Analysis Completed. Content received:', {
              contentLength: data.content.length,
              contentPreview: data.content.substring(0, 200) + '...'
            });
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
      setResult('Audience Analysis: Your LinkedIn AI audience analysis has been successfully generated! You can find it below.');
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

      {analysis && (
        <CollapsibleSection title="Generated Audience Analysis" defaultOpen={true}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6"
               dangerouslySetInnerHTML={{ __html: analysis }}>
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Saved Audience Analyses" defaultOpen={true}>
        <SavedAudienceAnalyses refreshTrigger={refreshAnalyses} />
      </CollapsibleSection>
    </div>
  );
} 