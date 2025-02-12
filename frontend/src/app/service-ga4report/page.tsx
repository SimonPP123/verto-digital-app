'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function GA4ReportServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch('http://localhost:5000/api/dify/ga4report', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          property_id: formData.get('property_id'),
          start_date: formData.get('start_date'),
          end_date: formData.get('end_date'),
          metrics: formData.get('metrics')?.toString().split(','),
          dimensions: formData.get('dimensions')?.toString().split(','),
          report_format: formData.get('report_format'),
        }),
      });

      const data = await response.json();
      setResult(data.result);
    } catch (error) {
      console.error('Error:', error);
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">GA4 Weekly Report Generator</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="metrics" className="block text-sm font-medium text-gray-700">
            Metrics (comma-separated)
          </label>
          <input
            type="text"
            name="metrics"
            id="metrics"
            required
            placeholder="activeUsers, sessions, conversions"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Common metrics: activeUsers, sessions, conversions, eventCount
          </p>
        </div>

        <div>
          <label htmlFor="dimensions" className="block text-sm font-medium text-gray-700">
            Dimensions (comma-separated)
          </label>
          <input
            type="text"
            name="dimensions"
            id="dimensions"
            required
            placeholder="date, deviceCategory, country"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">
            Common dimensions: date, deviceCategory, country, source, medium
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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

      {result && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Report</h2>
          <div className="prose max-w-none">
            {result.split('\n').map((line, index) => (
              <p key={index} className="mb-2">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 