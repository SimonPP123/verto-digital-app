'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { FaTrash, FaChevronDown, FaChevronUp } from 'react-icons/fa';

type GA4Report = {
  id: string;
  createdAt: string;
  updatedAt: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  reportFormat: string;
  content: any;
};

const renderReportContent = (content: any) => {
  if (!content) return <div>No content available</div>;

  // Process the content for rendering
  if (typeof content === 'string') {
    return (
      <div className="prose max-w-none">
        {content.split('\n').map((line: string, index: number) => (
          <p key={index} className="mb-2">{line}</p>
        ))}
      </div>
    );
  } else {
    // Handle structured content
    return (
      <div className="space-y-4">
        {Object.entries(content).map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg p-4 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">
              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <div className="prose max-w-none">
              {typeof value === 'string' ? (
                value.split('\n').map((line: string, index: number) => (
                  <p key={index} className="mb-2">{line}</p>
                ))
              ) : (
                <pre className="text-sm bg-gray-50 p-3 rounded">{JSON.stringify(value, null, 2)}</pre>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
};

interface SavedGA4ReportsProps {
  refreshTrigger?: number;
}

const SavedGA4Reports: React.FC<SavedGA4ReportsProps> = ({ refreshTrigger = 0 }) => {
  const { isAuthenticated } = useAuth();
  const [reports, setReports] = useState<GA4Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchSavedReports = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/analytics/google-analytics/saved');
        
        if (!response.ok) {
          throw new Error('Failed to fetch saved reports');
        }
        
        const data = await response.json();
        
        if (data.success && Array.isArray(data.reports)) {
          setReports(data.reports);
        } else {
          setReports([]);
        }
      } catch (error) {
        console.error('Error fetching saved reports:', error);
        setError('Failed to load saved reports. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchSavedReports();
    }
  }, [refreshTrigger, isAuthenticated]);

  const toggleExpand = (id: string) => {
    setExpandedReport(expandedReport === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      console.error('Cannot delete report: Invalid ID');
      alert('Error: Unable to delete this report due to an invalid ID. Please refresh the page and try again.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      setIsDeleting(id);
      
      try {
        const response = await fetch(`/api/analytics/google-analytics/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete report');
        }
        
        // Remove the deleted report from the state
        setReports(reports.filter(report => report.id !== id));
        
        // Show success message
        alert('Report deleted successfully!');
      } catch (error) {
        console.error('Error deleting report:', error);
        alert('Failed to delete report. Please try again later.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-center mb-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-lg font-medium text-gray-800">Loading saved reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-lg shadow-sm border border-red-200 p-6">
        <p className="text-lg font-medium text-red-700">{error}</p>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-4 text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No Reports Found</h3>
        <p className="text-gray-600">You haven't generated any GA4 reports yet. Use the form above to create your first report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Saved Reports</h2>
      
      {reports.map((report) => (
        <div key={report.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => toggleExpand(report.id)}>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-semibold text-gray-900">GA4 Report: {report.propertyId}</h3>
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {report.reportFormat.charAt(0).toUpperCase() + report.reportFormat.slice(1)}
                </span>
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-600 space-x-4">
                <span>Date Range: {report.startDate} to {report.endDate}</span>
                <span>Created: {formatDate(report.createdAt)}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(report.id);
                }}
                disabled={isDeleting === report.id}
              >
                {isDeleting === report.id ? (
                  <div className="animate-spin h-5 w-5 border-t-2 border-red-600 rounded-full"></div>
                ) : (
                  <FaTrash size={20} color="currentColor" />
                )}
              </button>
              
              {expandedReport === report.id ? (
                <FaChevronUp size={20} color="currentColor" />
              ) : (
                <FaChevronDown size={20} color="currentColor" />
              )}
            </div>
          </div>
          
          {expandedReport === report.id && (
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              {renderReportContent(report.content)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SavedGA4Reports; 