'use client';

import React, { useState } from 'react';

type GA4AccountIdModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountId: string) => void;
};

export default function GA4AccountIdModal({
  isOpen,
  onClose,
  onSubmit
}: GA4AccountIdModalProps) {
  const [accountId, setAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId.trim()) return;
    
    setIsSubmitting(true);
    try {
      onSubmit(accountId.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Enter Google Analytics 4 Account ID</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6">
            <div className="mb-5 sm:mb-6">
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Please enter your Google Analytics 4 Account ID to continue. This will be used to query your analytics data.
              </p>
              
              <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 mb-1">
                GA4 Account ID
              </label>
              <input
                type="text"
                id="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-base"
                placeholder="Enter your GA4 Account ID (e.g., 123456789)"
                required
              />
            </div>
            
            <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-500">
              <p>The Account ID will be used for this conversation only. You can change it when starting a new conversation.</p>
            </div>
          </div>
          
          <div className="p-3 sm:p-4 border-t bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !accountId.trim()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? 'Submitting...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 