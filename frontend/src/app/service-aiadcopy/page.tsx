'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedAdCopies from '../../components/SavedAdCopies';
import PageLayout from '../../components/PageLayout';
import Sidebar from '../../components/Sidebar';

interface ContentItem {
  type: 'subheading' | 'listItem' | 'text';
  text: string;
}

interface Subsection {
  title: string;
  content: ContentItem[];
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

interface ConceptDetails {
  [key: string]: string;
}

interface Template {
  id?: string;
  _id: string;
  name: string;
  campaignName: string;
  landingPageContent: string;
  landingPageUrl: string;
  additionalInfo: string;
  keywords: string;
  internalKnowledge: string;
  assetLink: string;
  toneAndLanguage: string;
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

const AdCopyServicePage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Variations | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string>();
  const [campaignName, setCampaignName] = useState('');
  const [landingPageContent, setLandingPageContent] = useState('');
  const [landingPageUrl, setLandingPageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [competitorInfo, setCompetitorInfo] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [uniqueSellingPoints, setUniqueSellingPoints] = useState('');
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsProcessing(true);

    try {
      const formData = new FormData(event.currentTarget);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dify/adcopy`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            campaign_name: formData.get('campaign_name'),
            input_channels: 'Google, Linkedin, Email, Reddit, Twitter, Facebook',
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

  const loadSavedAdCopy = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setSelectedSavedId(id);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/adcopy/${id}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load saved ad copy');
      }

      const data = await response.json();
      console.log('Loaded ad copy data:', data);
      
      // Update form fields with saved data
      setCampaignName(data.campaign_name || '');
      setSelectedChannels(data.input_channels ? data.input_channels.split(',').map((c: string) => c.trim()) : []);
      setSelectedContentTypes(data.input_content_types ? data.input_content_types.split(',').map((c: string) => c.trim()) : []);
      setLandingPageContent(data.landing_page_content || '');
      setLandingPageUrl(data.landing_page_url || '');
      setAdditionalInfo(data.additional_information || '');
      setCompetitorInfo(data.competitor_info || '');
      setTargetAudience(data.target_audience || '');
      setToneOfVoice(data.tone_and_language || '');
      setUniqueSellingPoints(data.unique_selling_points || '');
      
      // Handle the generated copy
      if (data.variations) {
        console.log('Variations data:', data.variations);
        // Convert Map to object if necessary
        const variationsObject = data.variations instanceof Map 
          ? Object.fromEntries(data.variations)
          : data.variations;
        
        // Process the variations object
        const processedVariations: Variations = {};
        for (const [key, value] of Object.entries(variationsObject)) {
          if (value && typeof value === 'string') {
            processedVariations[key] = value;
          }
        }
        
        console.log('Processed variations:', processedVariations);
        setResult(processedVariations);
      } else if (data.generated_copy) {
        console.log('Generated copy data:', data.generated_copy);
        try {
          const parsedCopy = typeof data.generated_copy === 'string'
            ? JSON.parse(data.generated_copy)
            : data.generated_copy;
          setResult(parsedCopy);
        } catch (e) {
          console.error('Error parsing generated copy:', e);
          setResult(data.generated_copy);
        }
      } else {
        console.log('No variations or generated copy found in the data');
        setResult(null);
      }
      
    } catch (err) {
      console.error('Error loading ad copy:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while loading the saved ad copy');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setCampaignName('');
    setLandingPageContent('');
    setLandingPageUrl('');
    setAdditionalInfo('');
    setCompetitorInfo('');
    setTargetAudience('');
    setToneOfVoice('');
    setUniqueSellingPoints('');
    setSelectedSavedId(undefined);
    setResult(null);
    setError(null);
    setFormError(null);
  };

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      setTemplatesError(null);
      console.log('Fetching templates...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
        credentials: 'include'
      });
      console.log('Template response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to load templates: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Templates loaded:', data);
      if (!Array.isArray(data)) {
        console.warn('Received non-array data from templates API:', data);
      }
      // Map MongoDB _id to id field for frontend use
      const processedTemplates = Array.isArray(data) ? data.map(template => ({
        ...template,
        id: template._id
      })) : [];
      setTemplates(processedTemplates);
      console.log('Templates state updated:', processedTemplates);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      setTemplatesError(`Failed to load templates: ${error?.message || 'Unknown error'}`);
      setTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const saveAsTemplate = async () => {
    try {
      if (!templateName.trim()) {
        alert('Please enter a template name');
        return;
      }

      if (!campaignName || !landingPageContent || !landingPageUrl) {
        alert('Please fill in all required fields (Campaign Name, Landing Page Content, and Landing Page URL) before saving the template');
        return;
      }

      const newTemplate = {
        name: templateName.trim(),
        campaignName,
        landingPageContent,
        landingPageUrl,
        additionalInfo,
        keywords: (document.getElementById('keywords') as HTMLInputElement)?.value || '',
        internalKnowledge: (document.getElementById('internal_knowledge') as HTMLInputElement)?.value || '',
        assetLink: (document.getElementById('asset_link') as HTMLInputElement)?.value || '',
        toneAndLanguage: toneOfVoice
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTemplate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      await loadTemplates(); // Reload templates after saving
      setShowTemplateForm(false);
      setTemplateName('');
      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert(error instanceof Error ? error.message : 'Failed to save template. Please try again.');
    }
  };

  const applyTemplate = (template: Template) => {
    setCampaignName(template.campaignName);
    setLandingPageContent(template.landingPageContent);
    setLandingPageUrl(template.landingPageUrl);
    setAdditionalInfo(template.additionalInfo);
    setToneOfVoice(template.toneAndLanguage);
    // Add other field setters as needed
  };

  const deleteTemplate = async (templateId: string) => {
    if (!templateId) {
      alert('Invalid template ID. Cannot delete template.');
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/templates/${templateId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete template');
      }

      setTemplates(templates.filter(template => template.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
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
    <React.Fragment>
      <div className="flex flex-col lg:flex-row min-h-screen w-full">
        {/* Left Sidebar - Saved Ad Copies */}
        <div className="w-full lg:w-1/5 min-w-[250px] max-w-full lg:max-w-[400px] border-b lg:border-b-0 lg:border-r bg-gray-50">
          <div className="p-4 border-b bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Saved Ad Copies</h2>
            <button
              onClick={clearForm}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Generate New Copies
            </button>
          </div>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto">
            <SavedAdCopies onSelect={loadSavedAdCopy} selectedId={selectedSavedId} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 w-full min-w-0 py-6 lg:py-8 px-4 lg:px-8">
          <div className="max-w-full mx-auto">
            <div className="text-center">
              <div className="mb-8 aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg">
                <iframe
                  src="https://www.loom.com/embed/79720afad6a048e5a6850069c8137b70?sid=c40d4b78-c30c-4992-a5c7-d11e8d6c08e7"
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6 lg:mb-8">
                AI Ad Copy Generator
              </h1>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
              </div>
            )}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const campaignName = formData.get('campaign_name');
              const landingPageContent = formData.get('landing_page_content');
              const landingPageUrl = formData.get('landing_page_url');

              if (!campaignName || !landingPageContent || !landingPageUrl) {
                setFormError('Please fill in all required fields (Campaign Name, Landing Page Content, and Landing Page URL) before continuing.');
                return;
              }
              setFormError(null);
              handleSubmit(e);
            }} className="space-y-6 max-w-full">
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700">{formError}</p>
                </div>
              )}
              
              <div>
                <label htmlFor="campaign_name" className="block text-sm font-medium text-gray-800">
                  Campaign Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="campaign_name"
                  id="campaign_name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter your campaign name"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="landing_page_content" className="block text-sm font-medium text-gray-800">
                  Landing Page Content <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="landing_page_content"
                  id="landing_page_content"
                  value={landingPageContent}
                  onChange={(e) => setLandingPageContent(e.target.value)}
                  placeholder="Paste the landing page content here"
                  rows={4}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="content_material" className="block text-sm font-medium text-gray-800">
                  Asset (ebook, whitepaper, etc.)
                </label>
                <textarea
                  name="content_material"
                  id="content_material"
                  placeholder="Paste the asset text here"
                  rows={4}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="keywords" className="block text-sm font-medium text-gray-800">
                  Keywords
                </label>
                <textarea
                  name="keywords"
                  id="keywords"
                  placeholder="Enter keywords - one per line or separated by commas"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="internal_knowledge" className="block text-sm font-medium text-gray-800">
                  ICP, Website Summary and Brand Guidance
                </label>
                <textarea
                  name="internal_knowledge"
                  id="internal_knowledge"
                  placeholder="Paste the information about ICP, Website Summary and Brand Guidance here"
                  rows={3}
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
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Enter any additional information about your campaign"
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
                  placeholder="Enter the URL of any relevant assets"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
              </div>

              <div>
                <label htmlFor="landing_page_url" className="block text-sm font-medium text-gray-800">
                  Landing Page URL <span className="text-red-600">*</span>
                </label>
                <input
                  type="url"
                  name="landing_page_url"
                  id="landing_page_url"
                  value={landingPageUrl}
                  onChange={(e) => setLandingPageUrl(e.target.value)}
                  placeholder="Enter your landing page URL"
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
                  value={toneOfVoice}
                  onChange={(e) => setToneOfVoice(e.target.value)}
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
              <div className="mt-8 space-y-6 overflow-x-auto max-w-full">
                <div className="bg-white rounded-lg shadow p-4 lg:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Ad Copies</h2>
                  
                  {Object.entries(result).map(([key, value]) => {
                    // Skip if value is null or empty
                    if (!value) return null;

                    // Helper function to get the platform name
                    const getPlatformName = (key: string) => {
                      if (key.startsWith('G /')) return 'Google';
                      if (key.startsWith('LI /')) return 'LinkedIn';
                      if (key.startsWith('FB/IG')) return 'Facebook/Instagram';
                      if (key.startsWith('Reddit')) return 'Reddit';
                      if (key.startsWith('Twitter')) return 'Twitter';
                      if (key.startsWith('Email')) return 'Email';
                      return key;
                    };

                    // Helper function to get the content type
                    const getContentType = (key: string) => {
                      if (key.includes('Single Image')) return 'Single Image';
                      if (key.includes('Carousel')) return 'Carousel';
                      if (key.includes('Conversation')) return 'Conversation';
                      if (key.includes('Documents')) return 'Documents';
                      if (key.includes('Search')) return 'Search';
                      if (key.includes('Email')) return 'Email';
                      return null;
                    };

                    // Filter out unwanted variations and keep only specific ones
                    const shouldShowVariation = (key: string) => {
                      if (key === 'Email 1') return true;
                      if (key === 'LI / Carousel 2') return true;  // Changed to show Carousel 2 instead of 1
                      if (key.endsWith('2') && key !== 'LI / Carousel 1') return true;
                      return false;
                    };

                    if (!shouldShowVariation(key)) return null;

                    const platform = getPlatformName(key);
                    const contentType = getContentType(key);

                    let title;
                    if (key === 'LI / Carousel 2') {
                      title = 'LinkedIn Carousel Copies';
                    } else if (key === 'Email 1') {
                      title = 'Email Copies';
                    } else {
                      title = `${platform}${contentType ? ` ${contentType}` : ''} Copies`;
                    }

                    return (
                      <CollapsibleSection 
                        key={`variation-${key}`}
                        title={title}
                      >
                        <div className="prose max-w-none">
                          {(() => {
                            // Extract and parse different content sections
                            const adCopyContent = value.includes('<ad_copy>') 
                              ? value.split('<ad_copy>')[1]?.split('</ad_copy>')[0]?.trim()
                              : null;

                            const visualContent = value.includes('<visual_concept_rationale>') 
                              ? value.split('<visual_concept_rationale>')[1]?.split('</visual_concept_rationale>')[0]?.trim()
                              : null;

                            const emailContent = value.includes('<email>') 
                              ? value.split('<email>')[1]?.split('</email>')[0]?.trim()
                              : null;

                            return (
                              <div className="space-y-6">
                                {/* Ad Copy Section */}
                                {adCopyContent && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Copy</h3>
                                    {(() => {
                                      const lines = adCopyContent.split('\n').map(line => line.trim()).filter(Boolean);
                                      
                                      // Check if this is LinkedIn Conversation content
                                      if (lines[0]?.startsWith('## LinkedIn Conversation Ad Content')) {
                                        const sections = adCopyContent.split(/(?=## LinkedIn Conversation Ad Content)/).filter(Boolean);
                                        
                                        return (
                                          <div className="space-y-8">
                                            {sections.map((section, sectionIndex) => {
                                              const sectionLines = section.split('\n').filter(line => line.trim());
                                              const title = sectionLines[0].replace(/^##\s+/, '');
                                              
                                              // Group content by subsections
                                              const subsections: Subsection[] = [];
                                              let currentSubsection: Subsection | null = null;
                                              
                                              for (let i = 1; i < sectionLines.length; i++) {
                                                const line = sectionLines[i].trim();
                                                if (line.startsWith('###')) {
                                                  if (currentSubsection) {
                                                    subsections.push(currentSubsection);
                                                  }
                                                  currentSubsection = {
                                                    title: line.replace(/^###\s+/, ''),
                                                    content: []
                                                  };
                                                } else if (line.startsWith('####')) {
                                                  if (currentSubsection) {
                                                    currentSubsection.content.push({
                                                      type: 'subheading',
                                                      text: line.replace(/^####\s+/, '')
                                                    });
                                                  }
                                                } else if (line.match(/^\d+\./)) {
                                                  if (currentSubsection) {
                                                    currentSubsection.content.push({
                                                      type: 'listItem',
                                                      text: line.replace(/^\d+\.\s+/, '')
                                                    });
                                                  }
                                                } else if (line) {
                                                  if (currentSubsection) {
                                                    currentSubsection.content.push({
                                                      type: 'text',
                                                      text: line
                                                    });
                                                  }
                                                }
                                              }
                                              
                                              if (currentSubsection) {
                                                subsections.push(currentSubsection);
                                              }

                                              return (
                                                <div key={`section-${sectionIndex}`} className="bg-white rounded-lg p-6 shadow-sm">
                                                  <h4 className="text-xl font-bold text-gray-900 mb-6">{title}</h4>
                                                  
                                                  <div className="space-y-6">
                                                    {subsections.map((subsection, subsectionIndex) => (
                                                      <div key={`subsection-${sectionIndex}-${subsectionIndex}`} className="space-y-3">
                                                        <h5 className="text-lg font-semibold text-gray-800">
                                                          {subsection.title}
                                                        </h5>
                                                        
                                                        <div className="space-y-3 pl-4">
                                                          {subsection.content.map((item, itemIndex) => {
                                                            if (item.type === 'subheading') {
                                                              return (
                                                                <h6 key={`subheading-${sectionIndex}-${subsectionIndex}-${itemIndex}`} className="text-md font-semibold text-gray-700 mt-4">
                                                                  {item.text}
                                                                </h6>
                                                              );
                                                            } else if (item.type === 'listItem') {
                                                              return (
                                                                <div key={`listItem-${sectionIndex}-${subsectionIndex}-${itemIndex}`} className="flex items-center space-x-2">
                                                                  <span className="text-blue-600 font-medium">{itemIndex + 1}.</span>
                                                                  <span className="text-gray-700">{item.text}</span>
                                                                </div>
                                                              );
                                                            } else {
                                                              return (
                                                                <p key={`text-${sectionIndex}-${subsectionIndex}-${itemIndex}`} className="text-gray-600">
                                                                  {item.text}
                                                                </p>
                                                              );
                                                            }
                                                          })}
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      }

                                      // Find the table start for other content types
                                      const tableStartIndex = lines.findIndex(line => line.includes('|'));
                                      if (tableStartIndex === -1) {
                                        // If no table format, display as regular text
                                        return (
                                          <div className="prose prose-sm max-w-none">
                                            {lines.map((line, index) => (
                                              <p key={`line-${index}`} className="text-gray-700">{line}</p>
                                            ))}
                                          </div>
                                        );
                                      }

                                      // Parse table headers and data
                                      const headerRow = lines[tableStartIndex]
                                        .split('|')
                                        .map(cell => cell.trim())
                                        .filter(Boolean);

                                      // Skip the separator line and get data rows
                                      const dataRows = lines.slice(tableStartIndex + 2)
                                        .filter(line => line.includes('|'))
                                        .map(line => {
                                          const cells = line
                                            .split('|')
                                            .map(cell => cell.trim())
                                            .filter(Boolean);
                                          return cells;
                                        })
                                        .filter(row => row.length >= 2);

                                      // Render table with consistent styling for all content types
                                      return (
                                        <div className="overflow-x-auto shadow-sm rounded-lg">
                                          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                                            <thead className="bg-gray-50">
                                              <tr>
                                                {headerRow.map((header, index) => (
                                                  <th
                                                    key={`header-${key}-${index}`}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                                  >
                                                    {header}
                                                  </th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                              {dataRows.map((row, rowIndex) => (
                                                <tr key={`row-${key}-${rowIndex}`} className={rowIndex % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                                  {row.map((cell, cellIndex) => (
                                                    <td
                                                      key={`cell-${key}-${rowIndex}-${cellIndex}`}
                                                      className={`px-6 py-4 text-sm ${
                                                        cellIndex === 0
                                                          ? 'font-medium text-gray-900 whitespace-nowrap'
                                                          : 'text-gray-900'
                                                      }`}
                                                    >
                                                      {cell}
                                                    </td>
                                                  ))}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Visual Concept Section */}
                                {visualContent && (
                                  <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Visual Concepts</h3>
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                      {(() => {
                                        // LinkedIn Carousel Copies format
                                        if (key === 'LI / Carousel 2') {
                                          // Split the visual content into Ratings and Selected Concepts parts
                                          const parts = visualContent.split('**Selected Concepts:**');
                                          const ratingsText = parts[0] ? parts[0].trim() : '';
                                          const selectedConceptsText = parts[1] ? parts[1].trim() : '';

                                          // Parse Ratings using regex to capture all concept ratings (handling optional carriage return)
                                          const ratings: { concept: string; ratings: string }[] = [];
                                          const ratingPattern = /- \*\*(Concept \d+):\*\* ([^*]+?)(?=\s+- \*\*Concept|\s*$)/g;
                                          let ratingMatch;
                                          while ((ratingMatch = ratingPattern.exec(ratingsText)) !== null) {
                                            const [_, concept, ratingDetails] = ratingMatch;
                                            const ratingsArray = ratingDetails
                                              .split(',')
                                              .map(r => r.trim())
                                              .filter(Boolean);
                                            ratings.push({ 
                                              concept, 
                                              ratings: ratingsArray.join(', ')
                                            });
                                          }

                                          // Parse Selected Concepts using regex to capture blocks for each concept
                                          const selectedConcepts: { title: string; details: ConceptDetails }[] = [];
                                          const conceptPattern = /- \*\*(Concept\s*\d+):\s*([^*]+)\*\*\s*((?:[\s\S]*?)(?=\s*-\s*\*\*Concept|\s*$))/g;
                                          let conceptMatch;
                                          while ((conceptMatch = conceptPattern.exec(selectedConceptsText)) !== null) {
                                            const [_, title, name, detailsText] = conceptMatch;
                                            const details: ConceptDetails = {
                                              name: name.trim(),
                                              'Visual Elements': '',
                                              'Color Schemes': '',
                                              'Imagery': '',
                                              'Layout': '',
                                              'Alignment': '',
                                              'Resonance': ''
                                            };

                                            // Parse details using regex
                                            const detailPattern = /\*\*([\w\s]+):\*\*\s*([^\n]+)/g;
                                            let detailMatch;
                                            while ((detailMatch = detailPattern.exec(detailsText)) !== null) {
                                              const [_, label, value] = detailMatch;
                                              details[label.trim()] = value.trim();
                                            }

                                            selectedConcepts.push({ title: `${title}: ${name}`, details });
                                          }

                                          // Ensure all three concepts are included
                                          const expectedConcepts = ['Concept 1', 'Concept 2', 'Concept 3'];
                                          expectedConcepts.forEach(concept => {
                                            if (!selectedConcepts.some(sc => sc.title.startsWith(concept))) {
                                              selectedConcepts.push({
                                                title: concept,
                                                details: {
                                                  name: '',
                                                  'Visual Elements': '',
                                                  'Color Schemes': '',
                                                  'Imagery': '',
                                                  'Layout': '',
                                                  'Alignment': '',
                                                  'Resonance': ''
                                                }
                                              });
                                            }
                                          });

                                          // Sort concepts by number
                                          selectedConcepts.sort((a, b) => {
                                            const aNum = parseInt(a.title.match(/\d+/)?.[0] || '0');
                                            const bNum = parseInt(b.title.match(/\d+/)?.[0] || '0');
                                            return aNum - bNum;
                                          });

                                          // Render the Ratings and Selected Concepts sections
                                          return (
                                            <div className="space-y-6">
                                              {/* Ratings Section */}
                                              <div className="bg-white rounded-lg p-6 shadow-sm">
                                                <h4 className="text-xl font-bold text-gray-900 mb-4">Visual Concept Ratings</h4>
                                                <div className="space-y-3">
                                                  {ratings.map((item, idx) => (
                                                    <div key={`rating-${idx}`} className="flex flex-col space-y-1">
                                                      <span className="font-semibold text-gray-800">{item.concept}</span>
                                                      <div className="pl-4 text-gray-600">
                                                        {item.ratings.split(',').map((rating, rIndex) => (
                                                          <span key={`rating-${idx}-${rIndex}`} className="mr-4">{rating.trim()}</span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* Selected Concepts Section */}
                                              <div className="bg-white rounded-lg p-6 shadow-sm">
                                                <h4 className="text-xl font-bold text-gray-900 mb-4">Selected Concepts</h4>
                                                <div className="space-y-6">
                                                  {selectedConcepts.map((concept, idx) => (
                                                    <div key={`concept-${idx}`} className="border-t pt-4 first:border-t-0 first:pt-0">
                                                      <h5 className="text-lg font-semibold text-gray-800 mb-3">{concept.title}</h5>
                                                      <div className="space-y-2 pl-4">
                                                        {Object.entries(concept.details).filter(([key]) => key !== 'name').map(([label, value], i) => (
                                                          <div key={`detail-${idx}-${i}`} className="flex flex-col">
                                                            <span className="font-medium text-gray-700">{label}</span>
                                                            <span className="text-gray-600 pl-4">{value || 'Not specified'}</span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }
                                        
                                        // LinkedIn Single Image Copies format
                                        if (key.includes('LI / Single Image')) {
                                          const concepts = visualContent.split(/(?=Visual Concept \d)/).filter(Boolean);
                                          return (
                                            <div className="space-y-4">
                                              {concepts.map((concept, index) => {
                                                const [title, ...details] = concept.split('\n').filter(line => line.trim());
                                                const sections: ConceptDetails = {};
                                                
                                                details.forEach(line => {
                                                  if (line.startsWith('- ')) {
                                                    const [label, content] = line.substring(2).split(': ');
                                                    if (label && content) {
                                                      sections[label] = content;
                                                    }
                                                  }
                                                });
                                                
                                                return (
                                                  <div key={`concept-${index}`} className="bg-white rounded-lg p-4 shadow-sm">
                                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">{title}</h4>
                                                    <div className="space-y-2">
                                                      {Object.entries(sections).map(([label, content], sIndex) => (
                                                        <div key={`section-${index}-${sIndex}`} className="flex flex-col">
                                                          <span className="font-medium text-gray-700">{label}</span>
                                                          <span className="text-gray-600 pl-4">{content}</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        }

                                        // LinkedIn Documents Copies format
                                        if (key.includes('LI / Documents')) {
                                          const sections = visualContent.split(/(?=### )/).filter(Boolean);
                                          return (
                                            <div className="space-y-6">
                                              {sections.map((section, index) => {
                                                const [title, ...points] = section.split('\n').filter(line => line.trim());
                                                return (
                                                  <div key={`section-${index}`} className="bg-white rounded-lg p-4 shadow-sm">
                                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                                      {title.replace(/^###\s+/, '')}
                                                    </h4>
                                                    <ul className="space-y-2 list-disc list-inside">
                                                      {points.map((point, pIndex) => (
                                                        <li key={`point-${index}-${pIndex}`} className="text-gray-600">
                                                          {point.replace(/^-\s+/, '')}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        }

                                        // Google Search Copies format
                                        if (key.startsWith('G /')) {
                                          const sections = visualContent.split(/(?=### )/).filter(Boolean);
                                          return (
                                            <div className="space-y-4">
                                              {sections.map((section, index) => {
                                                const [title, ...points] = section.split('\n').filter(line => line.trim());
                                                return (
                                                  <div key={`section-${index}`} className="bg-white rounded-lg p-4 shadow-sm">
                                                    <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                                      {title.replace(/^###\s+/, '')}
                                                    </h4>
                                                    <ol className="space-y-2 list-decimal list-inside">
                                                      {points.map((point, pIndex) => (
                                                        <li key={`point-${index}-${pIndex}`} className="text-gray-600">
                                                          {point.replace(/^-\s+/, '')}
                                                        </li>
                                                      ))}
                                                    </ol>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          );
                                        }

                                        // Default format for other platforms (Facebook, Twitter, Reddit)
                                        const sections = visualContent.split(/(?=### )/).filter(Boolean);
                                        return (
                                          <div className="space-y-4">
                                            {sections.map((section, index) => {
                                              const [title, ...points] = section.split('\n').filter(line => line.trim());
                                              return (
                                                <div key={`section-${index}`} className="bg-white rounded-lg p-4 shadow-sm">
                                                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                                                    {title.replace(/^###\s+/, '')}
                                                  </h4>
                                                  <ul className="space-y-2">
                                                    {points.map((point, pIndex) => (
                                                      <li key={`point-${index}-${pIndex}`} className="text-gray-600 pl-4">
                                                        {point.replace(/^-\s+/, '')}
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Email Content Section */}
                                {emailContent && (
                                  <div className="mt-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Content</h3>
                                    <div className="bg-white border rounded-lg p-6 max-w-2xl mx-auto">
                                      <div className="prose prose-sm max-w-none">
                                        {emailContent.split('\n')
                                          .filter(line => line.trim())
                                          .map((line, index) => {
                                            let formattedLine = line;
                                            
                                            if (line.startsWith('Subject:')) {
                                              return (
                                                <h4 key={`email-line-${key}-${index}`} className="text-lg font-semibold text-gray-900 mb-4">
                                                  {line}
                                                </h4>
                                              );
                                            }

                                            formattedLine = formattedLine.replace(
                                              /\*\*(.*?)\*\*/g,
                                              '<strong>$1</strong>'
                                            );

                                            formattedLine = formattedLine.replace(
                                              /\*(.*?)\*/g,
                                              '<em>$1</em>'
                                            );

                                            formattedLine = formattedLine.replace(
                                              /\[(.*?)\]\((.*?)\)/g,
                                              '<a href="$2" class="text-blue-600 hover:underline">$1</a>'
                                            );

                                            return (
                                              <div 
                                                key={`email-line-${key}-${index}`}
                                                className="mb-4 text-gray-700"
                                                style={{ maxWidth: '100%', overflowWrap: 'break-word' }}
                                                dangerouslySetInnerHTML={{ __html: formattedLine }}
                                              />
                                            );
                                          })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </CollapsibleSection>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Templates */}
        <div className="w-full lg:w-1/5 min-w-[250px] max-w-full lg:max-w-[400px] border-t lg:border-t-0 lg:border-l bg-gray-50">
          <div className="p-4 border-b bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Templates</h2>
            <button
              onClick={() => setShowTemplateForm(true)}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Save as Template
            </button>
          </div>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto">
            {/* Templates List */}
            <div className="p-4">
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
              ) : templatesError ? (
                <div className="text-red-600 text-sm p-4 bg-red-50 rounded-md">
                  {templatesError}
                </div>
              ) : templates.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No saved templates</p>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => (
                    <div 
                      key={template._id} 
                      className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900 mb-2">{template.name || 'Untitled Template'}</h3>
                      <p className="text-sm text-gray-600 mb-2">{template.campaignName}</p>
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => applyTemplate(template)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Apply Template
                        </button>
                        <button
                          onClick={() => template._id ? deleteTemplate(template._id) : null}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-black mb-4">Save as Template</h3>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              className="w-full mb-4 px-3 py-2 border rounded-md text-black placeholder-gray-500 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowTemplateForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={saveAsTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
};

export default AdCopyServicePage; 