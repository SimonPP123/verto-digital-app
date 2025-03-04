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
  brandName: string;
  landingPageContent: string;
  landingPageUrl: string;
  additionalInfo: string;
  keywords: string;
  internalKnowledge: string;
  assetLink: string;
  toneAndLanguage: string;
  contentMaterial: string;
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3 text-left bg-gradient-to-r from-blue-50 to-white rounded-t-lg flex justify-between items-center"
      >
        <span className="text-lg font-semibold text-gray-900">{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-200 text-blue-600 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-5 border-t border-gray-200 bg-white rounded-b-lg">
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
  const [brandName, setBrandName] = useState('');
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
            brand_name: formData.get('brand_name'),
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
      
      // Update all form fields with saved data
      setCampaignName(data.campaign_name || '');
      setBrandName(data.brand_name || '');
      setSelectedChannels(data.input_channels ? data.input_channels.split(',').map((c: string) => c.trim()) : []);
      setSelectedContentTypes(data.input_content_types ? data.input_content_types.split(',').map((c: string) => c.trim()) : []);
      setLandingPageContent(data.landing_page_content || '');
      setLandingPageUrl(data.landing_page_url || '');
      setAdditionalInfo(data.additional_information || '');
      setCompetitorInfo(data.competitor_info || '');
      setTargetAudience(data.target_audience || '');
      setToneOfVoice(data.tone_and_language || '');
      setUniqueSellingPoints(data.unique_selling_points || '');

      // Set values directly for fields that use document.getElementById
      const keywordsInput = document.getElementById('keywords') as HTMLTextAreaElement;
      if (keywordsInput) keywordsInput.value = data.keywords || '';

      const internalKnowledgeInput = document.getElementById('internal_knowledge') as HTMLTextAreaElement;
      if (internalKnowledgeInput) internalKnowledgeInput.value = data.internal_knowledge || '';

      const contentMaterialInput = document.getElementById('content_material') as HTMLTextAreaElement;
      if (contentMaterialInput) contentMaterialInput.value = data.content_material || '';

      const assetLinkInput = document.getElementById('asset_link') as HTMLInputElement;
      if (assetLinkInput) assetLinkInput.value = data.asset_link || '';
      
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
    // Clear state-managed fields
    setCampaignName('');
    setBrandName('');
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

    // Clear fields that use direct DOM access
    const keywordsInput = document.getElementById('keywords') as HTMLTextAreaElement;
    if (keywordsInput) keywordsInput.value = '';

    const internalKnowledgeInput = document.getElementById('internal_knowledge') as HTMLTextAreaElement;
    if (internalKnowledgeInput) internalKnowledgeInput.value = '';

    const contentMaterialInput = document.getElementById('content_material') as HTMLTextAreaElement;
    if (contentMaterialInput) contentMaterialInput.value = '';

    const assetLinkInput = document.getElementById('asset_link') as HTMLInputElement;
    if (assetLinkInput) assetLinkInput.value = '';
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

      if (!campaignName || !landingPageContent || !landingPageUrl || !brandName) {
        alert('Please fill in all required fields (Campaign Name, Brand Name, Landing Page Content, and Landing Page URL) before saving the template');
        return;
      }

      // Get values from DOM elements with proper type checking
      const keywordsInput = document.getElementById('keywords') as HTMLTextAreaElement;
      const internalKnowledgeInput = document.getElementById('internal_knowledge') as HTMLTextAreaElement;
      const contentMaterialInput = document.getElementById('content_material') as HTMLTextAreaElement;
      const assetLinkInput = document.getElementById('asset_link') as HTMLInputElement;

      const newTemplate = {
        name: templateName.trim(),
        campaignName,
        brandName,
        landingPageContent,
        landingPageUrl,
        additionalInfo,
        keywords: keywordsInput?.value || '',
        internalKnowledge: internalKnowledgeInput?.value || '',
        contentMaterial: contentMaterialInput?.value || '',
        assetLink: assetLinkInput?.value || '',
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
    // Set state-managed fields
    setCampaignName(template.campaignName || '');
    setBrandName(template.brandName || '');
    setLandingPageContent(template.landingPageContent || '');
    setLandingPageUrl(template.landingPageUrl || '');
    setAdditionalInfo(template.additionalInfo || '');
    setToneOfVoice(template.toneAndLanguage || '');

    // Get DOM elements with proper type checking
    const keywordsInput = document.getElementById('keywords') as HTMLTextAreaElement;
    const internalKnowledgeInput = document.getElementById('internal_knowledge') as HTMLTextAreaElement;
    const contentMaterialInput = document.getElementById('content_material') as HTMLTextAreaElement;
    const assetLinkInput = document.getElementById('asset_link') as HTMLInputElement;

    // Set values for DOM-based fields with null checks
    if (keywordsInput) keywordsInput.value = template.keywords || '';
    if (internalKnowledgeInput) internalKnowledgeInput.value = template.internalKnowledge || '';
    if (contentMaterialInput) contentMaterialInput.value = template.contentMaterial || '';
    if (assetLinkInput) assetLinkInput.value = template.assetLink || '';
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
    <React.Fragment>
      <div className="flex flex-col lg:flex-row min-h-screen w-full bg-gray-50">
        {/* Left Sidebar - Saved Ad Copies */}
        <div className="w-full lg:w-1/5 min-w-[250px] max-w-full lg:max-w-[400px] border-b lg:border-b-0 lg:border-r bg-white shadow-sm">
          <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-white">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Saved Ad Copies</h2>
            <button
              onClick={clearForm}
              className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm hover:shadow-md transition-all duration-200"
            >
              Generate New Copies
            </button>
          </div>
          <div className="h-[calc(100vh-5rem)] overflow-y-auto">
            <SavedAdCopies onSelect={loadSavedAdCopy} selectedId={selectedSavedId} />
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 w-full min-w-0 py-6 lg:py-8 px-4 lg:px-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-blue-900 mb-6 lg:mb-8">
                AI Ad Copy Generator
              </h1>
              <p className="text-blue-800 mb-6 max-w-3xl mx-auto">
                Generate high-converting ad copy for multiple platforms with AI. Simply fill in the details about your campaign, and our AI will create tailored ad copy variations.
              </p>
              <div className="mb-8 aspect-video w-full max-w-4xl mx-auto rounded-lg overflow-hidden shadow-lg border border-gray-200">
                <iframe
                  src="https://www.loom.com/embed/0d51a2a58f7a43218924f154e3f84e60?sid=954da684-b64c-4ed4-a065-36e5ef818a5a"
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
                <div className="flex items-center">
                  <svg className="h-5 w-5 text-red-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-700 font-medium">{error}</p>
                </div>
              </div>
            )}
            
            {/* Templates Section */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-blue-900">Templates</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowTemplateForm(!showTemplateForm)}
                    className="py-2 px-3 bg-blue-100 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {showTemplateForm ? 'Cancel' : 'Save as Template'}
                  </button>
                  <button
                    onClick={loadTemplates}
                    className="py-2 px-3 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              
              {showTemplateForm && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col md:flex-row md:items-end gap-3">
                    <div className="flex-grow">
                      <label htmlFor="template_name" className="block text-sm font-medium text-blue-800 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        id="template_name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <button
                      onClick={saveAsTemplate}
                      className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
              )}
              
              {templatesError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{templatesError}</p>
                </div>
              )}
              
              {isLoadingTemplates ? (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((template) => (
                    <div
                      key={template._id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-blue-900 truncate" title={template.name}>
                          {template.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
                              deleteTemplate(template._id);
                            }
                          }}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete template"
                        >
                          <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 truncate" title={template.campaignName}>
                        {template.campaignName}
                      </p>
                      <button
                        onClick={() => applyTemplate(template)}
                        className="mt-2 w-full py-1.5 px-3 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 focus:outline-none transition-colors"
                      >
                        Apply Template
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-600">
                  No templates found. Save your form as a template to reuse it later.
                </div>
              )}
            </div>
            
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
            }} className="space-y-6 max-w-full bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-blue-900 pb-4 border-b border-gray-200">Campaign Information</h2>
              
              {formError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-600 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-700">{formError}</p>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="campaign_name" className="block text-sm font-medium text-gray-800 mb-1">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    name="campaign_name"
                    id="campaign_name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="brand_name" className="block text-sm font-medium text-gray-800 mb-1">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    name="brand_name"
                    id="brand_name"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="landing_page_url" className="block text-sm font-medium text-gray-800 mb-1">
                    Landing Page URL *
                  </label>
                  <input
                    type="url"
                    name="landing_page_url"
                    id="landing_page_url"
                    value={landingPageUrl}
                    onChange={(e) => setLandingPageUrl(e.target.value)}
                    placeholder="Enter your landing page URL"
                    required
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">URL where users will be directed after clicking the ad</p>
                </div>
              </div>

              <div>
                <label htmlFor="landing_page_content" className="block text-sm font-medium text-gray-800 mb-1">
                  Landing Page Content *
                </label>
                <textarea
                  name="landing_page_content"
                  id="landing_page_content"
                  value={landingPageContent}
                  onChange={(e) => setLandingPageContent(e.target.value)}
                  placeholder="Paste the landing page content here"
                  rows={4}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">Copy and paste the main content from your landing page</p>
              </div>

              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Additional Information</h3>
                
                <div className="space-y-6">
                  <div>
                    <label htmlFor="content_material" className="block text-sm font-medium text-gray-800 mb-1">
                      Asset (ebook, whitepaper, etc.)
                    </label>
                    <textarea
                      name="content_material"
                      id="content_material"
                      placeholder="Paste the asset text here"
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Include content from your downloadable assets if applicable</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="keywords" className="block text-sm font-medium text-gray-800 mb-1">
                        Keywords
                      </label>
                      <textarea
                        name="keywords"
                        id="keywords"
                        placeholder="Enter keywords - one per line or separated by commas"
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Keywords relevant to your campaign</p>
                    </div>

                    <div>
                      <label htmlFor="internal_knowledge" className="block text-sm font-medium text-gray-800 mb-1">
                        ICP, Website Summary and Brand Guidance
                      </label>
                      <textarea
                        name="internal_knowledge"
                        id="internal_knowledge"
                        placeholder="Paste the information about ICP, Website Summary and Brand Guidance here"
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Information about your ideal customer profile and brand</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="additional_information" className="block text-sm font-medium text-gray-800 mb-1">
                        Additional Information
                      </label>
                      <textarea
                        name="additional_information"
                        id="additional_information"
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder="Enter any additional information about your campaign"
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Any other details that might help generate better ad copy</p>
                    </div>

                    <div>
                      <label htmlFor="asset_link" className="block text-sm font-medium text-gray-800 mb-1">
                        Asset Link
                      </label>
                      <input
                        type="url"
                        name="asset_link"
                        id="asset_link"
                        placeholder="Enter the URL of any relevant assets"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">URL to your downloadable asset (if applicable)</p>
                      
                      <div className="mt-4">
                        <label htmlFor="tone_and_language" className="block text-sm font-medium text-gray-800 mb-1">
                          Tone and Language
                        </label>
                        <select
                          name="tone_and_language"
                          id="tone_and_language"
                          value={toneOfVoice}
                          onChange={(e) => setToneOfVoice(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                        >
                          <option value="" className="text-gray-500">Select tone</option>
                          <option value="professional" className="text-gray-900">Professional</option>
                          <option value="friendly" className="text-gray-900">Friendly</option>
                          <option value="casual" className="text-gray-900">Casual</option>
                          <option value="humorous" className="text-gray-900">Humorous</option>
                          <option value="formal" className="text-gray-900">Formal</option>
                          <option value="persuasive" className="text-gray-900">Persuasive</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">Select the tone of voice for your ad copy</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
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
                      Generating Ad Copy...
                    </>
                  ) : 'Generate Ad Copy'}
                </button>
              </div>
            </form>

            <div className="mt-6 flex items-center justify-center">
              <span className="text-gray-600 mr-3">Access all generated ad copies here:</span>
              <a 
                href="https://drive.google.com/drive/folders/1DvIbLMzlbfwR2lXkEmqfHO8XkfzBu2Ct"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-all duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                  <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                </svg>
                Open Google Drive Folder
              </a>
            </div>

            {result && (
              <div className="mt-8 space-y-6 overflow-x-auto max-w-full">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <h2 className="text-xl font-semibold text-blue-900 mb-6 pb-3 border-b border-gray-200">Generated Ad Copies</h2>
                  
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
      </div>
    </React.Fragment>
  );
};

export default AdCopyServicePage; 