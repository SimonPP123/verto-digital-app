'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import PageLayout from '../../components/PageLayout';

export default function LibreChatPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [iframeHeight, setIframeHeight] = useState('calc(100vh - 120px)');
  const [libreChatUrl, setLibreChatUrl] = useState('');

  useEffect(() => {
    // Set the LibreChat URL to your actual instance
    setLibreChatUrl('https://bolt.vertodigital.com/chat');
    
    // Adjust iframe height based on window size
    const handleResize = () => {
      setIframeHeight(`calc(100vh - 120px)`);
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <PageLayout title="LibreChat AI">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-verto-blue-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageLayout title="LibreChat AI">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to access the LibreChat AI service.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="LibreChat AI">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-verto-blue-primary to-blue-700 text-white">
          <h2 className="text-xl font-semibold">LibreChat AI Assistant</h2>
          <p className="text-sm opacity-90">
            Advanced AI chat interface with support for multiple models
          </p>
        </div>
        
        <div className="w-full" style={{ height: iframeHeight }}>
          <iframe
            src={libreChatUrl}
            className="w-full h-full border-0"
            title="LibreChat AI"
            allow="microphone; camera"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
          />
        </div>
      </div>
    </PageLayout>
  );
} 