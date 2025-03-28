'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

type GoogleAnalyticsAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export default function GoogleAnalyticsAuthModal({
  isOpen,
  onClose,
  onSuccess
}: GoogleAnalyticsAuthModalProps) {
  const { user } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAuthentication = () => {
    setIsAuthenticating(true);
    setError(null);
    
    // Get current window size to calculate popup position
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    // Open a popup for Google authentication
    const popup = window.open(
      `/api/analytics/auth/google`,
      'GoogleAnalyticsAuth',
      `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,resizable=yes,scrollbars=yes,status=no,toolbar=no`
    );
    
    // Check if popup was blocked
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      setError('Popup blocked. Please allow popups for this site.');
      setIsAuthenticating(false);
      return;
    }
    
    // Poll to check if the popup is closed
    const checkPopupClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopupClosed);
        checkAuthenticationStatus();
      }
    }, 500);
    
    // Add a message listener for the popup to communicate back to the parent window
    window.addEventListener('message', handleAuthMessage);
    
    function handleAuthMessage(event: MessageEvent) {
      // Make sure the message is from your domain
      if (event.origin !== window.location.origin) return;
      
      // Check if this is the authentication message
      if (event.data && event.data.type === 'ga4-auth') {
        window.removeEventListener('message', handleAuthMessage);
        clearInterval(checkPopupClosed);
        
        if (event.data.success) {
          setIsAuthenticating(false);
          onSuccess();
        } else {
          setError(event.data.error || 'Authentication failed');
          setIsAuthenticating(false);
        }
        
        if (popup && !popup.closed) {
          popup.close();
        }
      }
    }
  };
  
  const checkAuthenticationStatus = async () => {
    try {
      const response = await fetch('/api/analytics/auth/status');
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticating(false);
        onSuccess();
      } else {
        setError('Authentication failed or was cancelled. Please try again.');
        setIsAuthenticating(false);
      }
    } catch (error) {
      setError('Error checking authentication status');
      setIsAuthenticating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Google Analytics Authorization</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isAuthenticating}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.95 3.387 9.128 8 10.315V15H9v-3h1v-2c0-1.654 1.346-3 3-3h2v3h-2c-.55 0-1 .45-1 1v1h3v3h-3v7.315c4.613-1.187 8-5.365 8-10.315z" />
            </svg>
            <h3 className="text-lg font-medium mt-2">Connect to Google Analytics</h3>
            <p className="text-gray-600 mt-1">
              To use the Google Analytics 4 agent, you need to authorize access to your Google Analytics account.
            </p>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <div className="flex justify-center">
            <button
              onClick={startAuthentication}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-md px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full mr-2"></div>
              ) : (
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              )}
              {isAuthenticating ? 'Authenticating...' : 'Sign in with Google'}
            </button>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <p>We only request access to your Google Analytics data. Your data will not be shared with third parties.</p>
          </div>
        </div>
        
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              disabled={isAuthenticating}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 