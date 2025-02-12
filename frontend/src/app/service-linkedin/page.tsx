'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LinkedInServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch('http://localhost:5000/api/dify/linkedin', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile_url: formData.get('profile_url'),
          industry: formData.get('industry'),
          target_audience: formData.get('target_audience'),
          campaign_objective: formData.get('campaign_objective'),
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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">LinkedIn AI Audience Analysis</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="profile_url" className="block text-sm font-medium text-gray-700">
            LinkedIn Profile URL
          </label>
          <input
            type="url"
            name="profile_url"
            id="profile_url"
            required
            placeholder="https://www.linkedin.com/in/username"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
            Industry
          </label>
          <input
            type="text"
            name="industry"
            id="industry"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="target_audience" className="block text-sm font-medium text-gray-700">
            Target Audience Description
          </label>
          <textarea
            name="target_audience"
            id="target_audience"
            rows={3}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="campaign_objective" className="block text-sm font-medium text-gray-700">
            Campaign Objective
          </label>
          <select
            name="campaign_objective"
            id="campaign_objective"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select an objective</option>
            <option value="brand_awareness">Brand Awareness</option>
            <option value="lead_generation">Lead Generation</option>
            <option value="website_traffic">Website Traffic</option>
            <option value="engagement">Engagement</option>
            <option value="sales">Sales</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isProcessing ? 'Analyzing...' : 'Analyze Audience'}
        </button>
      </form>

      {result && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Results</h2>
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