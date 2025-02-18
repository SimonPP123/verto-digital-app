'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function SEOServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [brief, setBrief] = useState<any>(null);

  // Poll for results
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;

    if (status === 'processing') {
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seo/content-brief/status`, {
            credentials: 'include'
          });
          const data = await response.json();
          
          if (data.status === 'completed' && data.content) {
            setStatus('completed');
            setBrief(data.content);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus('processing');
    setBrief(null);
    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/seo/content-brief`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: formData.get('keyword')
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus('processing');
        setResult('Your content brief request is being processed. This might take a few minutes...');
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
      <h1 className="text-3xl font-bold text-gray-900 mb-4">VertoDigital Keyword to SEO Content Brief</h1>
      
      <div className="mb-8 prose">
        <p className="text-gray-600 mb-6">
          Enter the primary keyword or topic for the content brief. This should represent the main focus of the SEO-optimized content you want to create. Once completed, you'll be redirected to a Google Drive folder containing your generated SEO content brief.
        </p>

        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Here is how the workflow works:</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Keyword/topic is searched in Google</li>
            <li>Scrape the content of top 5 ranked pages</li>
            <li>GPT Agent analyses the content and generates the content brief</li>
            <li>Google Doc is created with the SEO content brief text</li>
            <li>You will be redirected to the Google Drive folder, where is your SEO content brief</li>
          </ol>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="keyword" className="block text-sm font-medium text-gray-700">
            Keyword/Topic
          </label>
          <input
            type="text"
            name="keyword"
            id="keyword"
            required
            placeholder="Write your keyword/topic here"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? 'Processing...' : 'Submit'}
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
             'Result'}
          </h2>
          <div className="prose max-w-none">
            {result.split('\n').map((line, index) => (
              <p key={index} className={`mb-2 ${
                status === 'error' ? 'text-red-600' : 
                status === 'processing' ? 'text-yellow-600' : 
                'text-green-600'
              }`}>{line}</p>
            ))}
          </div>
        </div>
      )}

      {brief && (
        <div className="mt-8 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Generated Content Brief</h2>
          <div className="prose max-w-none" 
               dangerouslySetInnerHTML={{ __html: typeof brief === 'string' ? brief : brief.brief || '' }}>
          </div>
        </div>
      )}
    </div>
  );
} 