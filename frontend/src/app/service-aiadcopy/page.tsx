'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedAdCopies from '../../components/SavedAdCopies';

interface AdCopyResponse {
  answer: string;
  error?: string;
  conversation_id?: string;
  message_id?: string;
}

interface FileUploadResponse {
  file_id: string;
}

interface TableRow {
  [key: string]: string;
}

interface Variations {
  [key: string]: string;
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded-t-lg flex justify-between items-center"
      >
        <span className="text-lg font-semibold text-gray-900">{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

const uploadFile = async (file: File): Promise<FileUploadResponse> => {
  const fileFormData = new FormData();
  fileFormData.append('file', file);
  fileFormData.append('type', file.type.split('/')[1].toUpperCase());
  
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/files/upload`, {
    method: 'POST',
    credentials: 'include',
    body: fileFormData,
  });
  
  if (!response.ok) throw new Error('File upload failed');
  return response.json();
};

export default function AdCopyServicePage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Variations | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<number | undefined>(undefined);
  const [campaignName, setCampaignName] = useState('');
  const [landingPageContent, setLandingPageContent] = useState('');
  const [landingPageUrl, setLandingPageUrl] = useState('');

  const inputChannels = [
    { value: 'Google', label: 'Google' },
    { value: 'Linkedin', label: 'LinkedIn' },
    { value: 'Facebook', label: 'Facebook' },
    { value: 'Twitter', label: 'Twitter' },
    { value: 'Reddit', label: 'Reddit' }
  ];

  const contentTypes = [
    { value: 'Search', label: 'Search' },
    { value: 'Single Image', label: 'Single Image' },
    { value: 'Carousel', label: 'Carousel' },
    { value: 'Documents', label: 'Documents' },
    { value: 'Conversation', label: 'Conversation' }
  ];

  const handleChannelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedChannels(prev => 
      e.target.checked 
        ? [...prev, value]
        : prev.filter(channel => channel !== value)
    );
  };

  const handleContentTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSelectedContentTypes(prev => 
      e.target.checked 
        ? [...prev, value]
        : prev.filter(type => type !== value)
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsProcessing(true);

    try {
      const formData = new FormData(event.currentTarget);
      const files = formData.getAll('files') as File[];
      
      // First upload files if any
      const fileIds = await Promise.all(
        files.map(async (file) => {
          const uploadResponse = await uploadFile(file);
          return uploadResponse.file_id;
        })
      );

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dify/adcopy`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            campaign_name: formData.get('campaign_name'),
            input_channels: selectedChannels.join(','),
            input_content_types: selectedContentTypes.join(','),
            landing_page_content: formData.get('landing_page_content'),
            content_material: formData.get('content_material'),
            additional_information: formData.get('additional_information'),
            keywords: formData.get('keywords'),
            internal_knowledge: formData.get('internal_knowledge'),
            asset_link: formData.get('asset_link'),
            landing_page_url: formData.get('landing_page_url'),
            tone_and_language: formData.get('tone_and_language'),
          },
          response_mode: "blocking",
          user: user?.email
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error.message || 'An error occurred while generating ad copy');
        setResult(null);
        return;
      }

      try {
        // Process the response
        if (Object.keys(data).length === 0) {
          setError('No ad copy variations were generated. Please try adjusting your inputs and try again.');
          setResult(null);
          return;
        }

        // Filter out null values and format the data
        const filteredData = Object.fromEntries(
          Object.entries(data)
            .filter(([key, value]) => {
              // Keep all keys from the expected structure, even if they are null
              const expectedKeys = [
                "G / Search 1",
                "G / Search 2",
                "LI / Single Image 1",
                "LI / Single Image 2",
                "Email 1",
                "LI / Carousel 1",
                "LI / Carousel 2",
                "LI / Conversation 1",
                "LI / Conversation 2",
                "LI / Documents 1",
                "LI / Documents 2",
                "FB/IG All 1",
                "FB/IG All 2",
                "Reddit All 1",
                "Reddit All 2",
                "Twitter All 1",
                "Twitter All 2"
              ];
              return expectedKeys.includes(key);
            })
        ) as Variations;

        if (Object.keys(filteredData).length > 0) {
          setResult(filteredData);
          setError(null);
        } else {
          setError('No valid ad copy variations were generated. Please try adjusting your inputs and try again.');
          setResult(null);
        }
      } catch (error) {
        console.error('Error processing response:', error);
        setError('Failed to process the generated ad copy. Please try again.');
        setResult(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add function to load saved ad copy
  const loadSavedAdCopy = async (id: number) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/adcopy/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load saved ad copy');
      }

      const data = await response.json();
      
      // Check if variations exist and set them directly
      if (data.variations && typeof data.variations === 'object') {
        // Filter out null values
        const filteredVariations = Object.fromEntries(
          Object.entries(data.variations)
            .filter(([key, value]) => value !== null && typeof value === 'string' && !value.includes('Not generated'))
        ) as Variations;
        setResult(filteredVariations);
      } else {
        setResult(null);
      }
      
      setSelectedSavedId(id);
      
      // Set form data if it exists
      if (data.campaignName) {
        setCampaignName(data.campaignName);
      }
      if (data.inputChannels) {
        const channels: string[] = data.inputChannels.split(',').map((c: string) => c.trim());
        setSelectedChannels(channels);
      }
      if (data.inputContentTypes) {
        const types: string[] = data.inputContentTypes.split(',').map((t: string) => t.trim());
        setSelectedContentTypes(types);
      }
      if (data.landingPageContent) {
        setLandingPageContent(data.landingPageContent);
      }
      if (data.landingPageUrl) {
        setLandingPageUrl(data.landingPageUrl);
      }
    } catch (error) {
      console.error('Error loading saved ad copy:', error);
      setError(error instanceof Error ? error.message : 'Failed to load saved ad copy');
    }
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
    <div className="flex">
      {/* Sidebar */}
      <div className="w-80 min-h-screen border-r bg-gray-50">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Saved Ad Copies</h2>
        </div>
        <SavedAdCopies onSelect={loadSavedAdCopy} selectedId={selectedSavedId} />
      </div>

      {/* Main content */}
      <div className="flex-1 max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">AI Ad Copy Generator</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="campaign_name" className="block text-sm font-medium text-gray-800">
              Campaign Name *
            </label>
            <input
              type="text"
              name="campaign_name"
              id="campaign_name"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Input Channels *
            </label>
            <div className="space-y-2">
              {inputChannels.map((channel) => (
                <label key={channel.value} className="inline-flex items-center mr-4">
                  <input
                    type="checkbox"
                    value={channel.value}
                    checked={selectedChannels.includes(channel.value)}
                    onChange={handleChannelChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-800">{channel.label}</span>
                </label>
              ))}
            </div>
            {selectedChannels.length === 0 && (
              <p className="mt-1 text-sm text-red-600">Please select at least one channel</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Input Content Types *
            </label>
            <div className="space-y-2">
              {contentTypes.map((type) => (
                <label key={type.value} className="inline-flex items-center mr-4">
                  <input
                    type="checkbox"
                    value={type.value}
                    checked={selectedContentTypes.includes(type.value)}
                    onChange={handleContentTypeChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-800">{type.label}</span>
                </label>
              ))}
            </div>
            {selectedContentTypes.length === 0 && (
              <p className="mt-1 text-sm text-red-600">Please select at least one content type</p>
            )}
          </div>

          <div>
            <label htmlFor="landing_page_content" className="block text-sm font-medium text-gray-800">
              Landing Page Content *
            </label>
            <textarea
              name="landing_page_content"
              id="landing_page_content"
              rows={4}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="content_material" className="block text-sm font-medium text-gray-800">
              Content Material
            </label>
            <textarea
              name="content_material"
              id="content_material"
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="additional_information" className="block text-sm font-medium text-gray-800">
              Additional Information
            </label>
            <textarea
              name="additional_information"
              id="additional_information"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="keywords" className="block text-sm font-medium text-gray-800">
              Keywords
            </label>
            <input
              type="text"
              name="keywords"
              id="keywords"
              placeholder="Enter keywords separated by commas"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="internal_knowledge" className="block text-sm font-medium text-gray-800">
              Internal Knowledge
            </label>
            <textarea
              name="internal_knowledge"
              id="internal_knowledge"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="asset_link" className="block text-sm font-medium text-gray-800">
              Asset Link
            </label>
            <input
              type="url"
              name="asset_link"
              id="asset_link"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="landing_page_url" className="block text-sm font-medium text-gray-800">
              Landing Page URL
            </label>
            <input
              type="url"
              name="landing_page_url"
              id="landing_page_url"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
          </div>

          <div>
            <label htmlFor="tone_and_language" className="block text-sm font-medium text-gray-800">
              Tone and Language
            </label>
            <select
              name="tone_and_language"
              id="tone_and_language"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            >
              <option value="" className="text-gray-900">Select tone</option>
              <option value="professional" className="text-gray-900">Professional</option>
              <option value="friendly" className="text-gray-900">Friendly</option>
              <option value="casual" className="text-gray-900">Casual</option>
              <option value="humorous" className="text-gray-900">Humorous</option>
              <option value="formal" className="text-gray-900">Formal</option>
              <option value="persuasive" className="text-gray-900">Persuasive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800">
              Upload Files
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              multiple
              className="mt-1 block w-full text-sm text-gray-900
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isProcessing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isProcessing ? 'Generating...' : 'Generate Ad Copy'}
          </button>
        </form>

        {result && (
          <div className="mt-8 p-4 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Ad Copy</h2>
            <div className="space-y-4">
              {Object.entries(result).map(([key, value]) => (
                <CollapsibleSection 
                  key={key} 
                  title={key}
                >
                  <div className="prose max-w-none">
                    {value ? (
                      <p className="text-gray-700 whitespace-pre-wrap">{value}</p>
                    ) : (
                      <p className="text-gray-500 italic">No content generated</p>
                    )}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 