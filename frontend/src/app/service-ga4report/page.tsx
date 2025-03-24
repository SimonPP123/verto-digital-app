'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import SavedGA4Reports from '../../components/SavedGA4Reports';
import CollapsibleSection from '../../components/CollapsibleSection';
import Select, { MultiValue } from 'react-select';

// Define the type for metric and dimension options
type OptionType = {
  value: string;
  label: string;
};

// Define options for metrics and dimensions
const metricOptions: OptionType[] = [
  { value: 'activeUsers', label: 'Active Users' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'screenPageViews', label: 'Screen/Page Views' },
  { value: 'newUsers', label: 'New Users' },
  { value: 'totalRevenue', label: 'Total Revenue' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'eventCount', label: 'Event Count' },
  { value: 'bounces', label: 'Bounces' },
  { value: 'userEngagementDuration', label: 'User Engagement Duration' },
  { value: 'eventsPerSession', label: 'Events Per Session' },
  { value: 'engagementRate', label: 'Engagement Rate' }
];

const dimensionOptions: OptionType[] = [
  { value: 'date', label: 'Date' },
  { value: 'dateHour', label: 'Date Hour' },
  { value: 'dateHourMinute', label: 'Date Hour Minute' },
  { value: 'day', label: 'Day' },
  { value: 'dayOfWeek', label: 'Day of Week' },
  { value: 'dayOfWeekName', label: 'Day of Week Name' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'sessionSourceMedium', label: 'Source/Medium' },
  { value: 'sessionMedium', label: 'Medium' },
  { value: 'sessionSource', label: 'Source' },
  { value: 'deviceCategory', label: 'Device Category' },
  { value: 'browser', label: 'Browser' },
  { value: 'eventName', label: 'Event Name' },
  { value: 'pageTitle', label: 'Page Title' },
  { value: 'defaultChannelGroup', label: 'Default Channel Group' }
];

export default function GA4ReportServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [resultMessage, setResultMessage] = useState<string>('');
  const [refreshReports, setRefreshReports] = useState(0);
  const [selectedMetrics, setSelectedMetrics] = useState<OptionType[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<OptionType[]>([]);

  // Poll for results
  useEffect(() => {
    if (analysisStatus === 'processing') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/api/analytics/google-analytics/status');
          const data = await response.json();

          if (data.status === 'completed') {
            setAnalysisStatus('completed');
            setResult(data.content);
            setResultMessage('Your GA4 report has been successfully generated! You can find it below.');
            setIsProcessing(false);
            setRefreshReports(prev => prev + 1);
          } else if (data.status === 'failed') {
            setAnalysisStatus('error');
            setResultMessage(`Error: ${data.message || 'Failed to generate report'}`);
            setIsProcessing(false);
          }
        } catch (error) {
          console.error('Error checking report status:', error);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [analysisStatus]);

  // Handle metric selection change
  const handleMetricsChange = (newValue: MultiValue<OptionType>) => {
    setSelectedMetrics(newValue as OptionType[]);
  };

  // Handle dimension selection change
  const handleDimensionsChange = (newValue: MultiValue<OptionType>) => {
    setSelectedDimensions(newValue as OptionType[]);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if metrics and dimensions are selected
    if (selectedMetrics.length === 0) {
      alert('Please select at least one metric');
      return;
    }
    if (selectedDimensions.length === 0) {
      alert('Please select at least one dimension');
      return;
    }
    
    setIsProcessing(true);
    setAnalysisStatus('processing');
    setResult(null);
    setResultMessage('Your GA4 report is being generated. This may take a few minutes.');
    
    try {
      const formData = new FormData(e.currentTarget);
      
      // Extract metrics and dimensions from selected options
      const metrics = selectedMetrics.map(option => option.value);
      const dimensions = selectedDimensions.map(option => option.value);
      
      // Submit request to backend
      const response = await fetch('/api/analytics/google-analytics', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: formData.get('property_id'),
          startDate: formData.get('start_date'),
          endDate: formData.get('end_date'),
          metrics,
          dimensions,
          reportFormat: formData.get('report_format'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit GA4 report request');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Continue polling (handled by useEffect)
      } else {
        setAnalysisStatus('error');
        setResultMessage(`Error: ${data.message || 'Failed to submit report request'}`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setAnalysisStatus('error');
      setResultMessage('An error occurred while processing your request. Please try again later.');
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

  const customSelectStyles = {
    control: (provided: any) => ({
      ...provided,
      borderColor: '#d1d5db',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#3b82f6',
      }
    }),
    multiValue: (provided: any) => ({
      ...provided,
      backgroundColor: '#e0f2fe',
    }),
    multiValueLabel: (provided: any) => ({
      ...provided,
      color: '#0369a1',
    }),
    multiValueRemove: (provided: any) => ({
      ...provided,
      color: '#0369a1',
      '&:hover': {
        backgroundColor: '#bae6fd',
        color: '#0284c7',
      },
    }),
    placeholder: (provided: any) => ({
      ...provided,
      color: '#4b5563', // Darker gray for better visibility
    }),
    input: (provided: any) => ({
      ...provided,
      color: '#111827', // Almost black for better visibility
    }),
    option: (provided: any, state: any) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#e0f2fe' : 'white',
      color: state.isSelected ? 'white' : '#111827',
      '&:active': {
        backgroundColor: '#bfdbfe',
      }
    }),
    singleValue: (provided: any) => ({
      ...provided,
      color: '#111827', // Almost black for better visibility
    }),
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">GA4 Weekly Report Generator</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-200 mb-8">
        <div>
          <label htmlFor="property_id" className="block text-sm font-medium text-gray-700">
            GA4 Property ID
          </label>
          <input
            type="text"
            name="property_id"
            id="property_id"
            required
            placeholder="123456789"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 placeholder-gray-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              name="start_date"
              id="start_date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
            />
          </div>

          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              name="end_date"
              id="end_date"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label htmlFor="metrics" className="block text-sm font-medium text-gray-700">
            Metrics
          </label>
          <Select<OptionType, true>
            id="metrics"
            name="metrics"
            isMulti
            options={metricOptions}
            className="mt-1 block w-full rounded-md shadow-sm"
            placeholder="Select metrics..."
            value={selectedMetrics}
            onChange={handleMetricsChange}
            styles={customSelectStyles}
          />
          <p className="mt-1 text-sm text-gray-500">
            Select one or more metrics to include in your report
          </p>
        </div>

        <div>
          <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700">
            Dimensions
          </label>
          <Select<OptionType, true>
            id="dimensions"
            name="dimensions"
            isMulti
            options={dimensionOptions}
            className="mt-1 block w-full rounded-md shadow-sm"
            placeholder="Select dimensions..."
            value={selectedDimensions}
            onChange={handleDimensionsChange}
            styles={customSelectStyles}
          />
          <p className="mt-1 text-sm text-gray-500">
            Select one or more dimensions to segment your data
          </p>
        </div>

        <div>
          <label htmlFor="report_format" className="block text-sm font-medium text-gray-700">
            Report Format
          </label>
          <select
            name="report_format"
            id="report_format"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
          >
            <option value="summary">Executive Summary</option>
            <option value="detailed">Detailed Analysis</option>
            <option value="highlights">Key Highlights</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? 'Generating Report...' : 'Generate Report'}
        </button>
      </form>

      {/* Status and results section */}
      {analysisStatus !== 'idle' && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-1">
              {analysisStatus === 'processing' && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600"></div>
              )}
              {analysisStatus === 'completed' && (
                <svg className="h-6 w-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {analysisStatus === 'error' && (
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <div className="ml-4 flex-1">
              <h2
                className={`text-xl font-bold mb-2 ${
                  analysisStatus === "error"
                    ? "text-red-800"
                    : analysisStatus === "processing"
                      ? "text-amber-800"
                      : "text-emerald-800"
                }`}
              >
                {analysisStatus === "error"
                  ? "Error"
                  : analysisStatus === "processing"
                    ? "Processing"
                    : "Success"}
              </h2>
              <div className="prose max-w-none">
                <p
                  className={`mb-3 ${
                    analysisStatus === "error"
                      ? "text-red-700"
                      : analysisStatus === "processing"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {resultMessage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved reports section */}
      <CollapsibleSection title="Saved Reports" defaultOpen={refreshReports > 0}>
        <SavedGA4Reports refreshTrigger={refreshReports} />
      </CollapsibleSection>
    </div>
  );
} 