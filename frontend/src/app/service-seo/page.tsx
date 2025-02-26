'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedContentBriefs from '../../components/SavedContentBriefs';
import CollapsibleSection from '../../components/CollapsibleSection';

export default function SEOServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [brief, setBrief] = useState<any>(null);
  const [refreshBriefs, setRefreshBriefs] = useState(0);

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
            console.log('Content Brief Completed. Content received:', {
              contentLength: data.content.length,
              contentPreview: data.content.substring(0, 200) + '...',
              fullContent: data.content
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
        setResult('Your content brief request is being processed. This might take some time...');
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
      setResult('Content Brief: Your SEO content brief has been successfully generated! You can find it below and in the Google Drive folder.');
      // Trigger refresh of saved briefs
      setRefreshBriefs(prev => prev + 1);
    }
  }, [status]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-blue-800 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-blue-100">
          <h1 className="text-2xl font-bold text-blue-900 mb-4">Access Denied</h1>
          <p className="text-blue-700">Please log in to access this service.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-blue-900 mb-4">VertoDigital Keyword to SEO Content Brief</h1>
        <p className="text-blue-800 max-w-3xl mx-auto">
          Generate comprehensive SEO content briefs from a single keyword or topic to create high-ranking content.
        </p>
      </div>
      
      <div className="mb-10 aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border border-gray-200">
        <iframe
          src="https://www.loom.com/embed/44de86a9b715443fb51ea7e8b36cfa4d?sid=cf794690-4b37-4b7c-877b-1c5be779f955"
          frameBorder="0"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        <div className="lg:col-span-2">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
            <p className="text-gray-700 mb-6 leading-relaxed">
              Enter the primary keyword or topic for the content brief. This should represent the main focus of the SEO-optimized content you want to create. The generated content brief will be displayed directly in the interface and also saved to your Google Drive folder for easy access.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-lg border border-blue-100 mb-8">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">How the workflow works:</h2>
              <ol className="list-decimal list-inside space-y-3 text-gray-700">
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold mr-2">1</span>
                  <span>Keyword/topic is searched in Google</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold mr-2">2</span>
                  <span>Scrape the content of top 5 ranked pages</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold mr-2">3</span>
                  <span>GPT Agent analyses the content and generates the content brief</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold mr-2">4</span>
                  <span>Google Doc is created with the SEO content brief text</span>
                </li>
                <li className="flex items-start">
                  <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 font-semibold mr-2">5</span>
                  <span>The content brief will be displayed in the interface and also available in your Google Drive folder</span>
                </li>
              </ol>
              <div className="mt-6 flex items-center">
                <span className="text-gray-700 mr-3">Access all content briefs here:</span>
                <a 
                  href="https://drive.google.com/drive/folders/10mOJL_yPD_N9kmiBjL9zP3pzwyPqygXQ"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                  Open Google Drive Folder
                </a>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-lg">
              <div>
                <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-1">
                  Keyword/Topic <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="keyword"
                  id="keyword"
                  required
                  placeholder="Enter your target keyword or topic (e.g., 'content marketing strategies')"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 py-3 px-4"
                />
                <p className="mt-1 text-xs text-gray-500">This will be the primary focus of your SEO content brief</p>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 ${
                  isProcessing ? 'opacity-70 cursor-not-allowed' : 'transform hover:scale-[1.02]'
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : 'Generate SEO Content Brief'}
              </button>
            </form>
          </div>

          {result && (
            <div className={`mb-8 p-6 rounded-lg shadow-sm border ${
              status === 'error' ? 'bg-red-50 border-red-200' : 
              status === 'processing' ? 'bg-yellow-50 border-yellow-200' : 
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center mb-4">
                {status === 'error' ? (
                  <svg className="h-6 w-6 text-red-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : status === 'processing' ? (
                  <svg className="h-6 w-6 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-green-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                <h2 className="text-xl font-semibold text-gray-900">
                  {status === 'error' ? 'Error' : 
                  status === 'processing' ? 'Processing' : 
                  'Success'}
                </h2>
              </div>
              <div className="prose max-w-none">
                {result.split('\n').map((line, index) => (
                  <p key={index} className={`mb-2 ${
                    status === 'error' ? 'text-red-700' : 
                    status === 'processing' ? 'text-yellow-700' : 
                    line.startsWith('Content Brief:') ? 'text-gray-900 font-semibold' : 'text-green-700'
                  }`}>{line}</p>
                ))}
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Content Brief Access Options</h2>
              <p className="text-gray-700 mb-4">Your content brief is displayed below. You can also access all your generated content briefs in Google Drive:</p>
              <a 
                href="https://drive.google.com/drive/folders/10mOJL_yPD_N9kmiBjL9zP3pzwyPqygXQ"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open Google Drive Folder
              </a>
            </div>
          )}

          {brief && (
            <div className="mb-8">
              <CollapsibleSection title="Generated Content Brief" defaultOpen={true}>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                    dangerouslySetInnerHTML={{ __html: brief }}>
                </div>
              </CollapsibleSection>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-blue-900 mb-4">How to Use Content Briefs</h2>
            <div className="text-gray-700 space-y-3">
              <p>Content briefs help you create SEO-optimized content by providing:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Suggested title options</li>
                <li>Key topics to cover</li>
                <li>Relevant keywords</li>
                <li>Word count recommendations</li>
                <li>Content structure guidelines</li>
              </ul>
              <p className="mt-4">Use these insights to create content that ranks well and meets user needs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Content Briefs Section - Moved from sidebar to below main content */}
      <div className="mt-10 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-blue-900 mb-6">Saved Content Briefs</h2>
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <SavedContentBriefs refreshTrigger={refreshBriefs} />
        </div>
      </div>
    </div>
  );
} 