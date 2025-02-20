'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export default function ChatServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Fetch chat history on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchChatHistory();
    }
  }, [isAuthenticated]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatHistory = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/history`, {
        credentials: 'include'
      });
      const data = await response.json();
      setMessages(data.messages || []);
      if (data.hasActiveFile) {
        setActiveFileName(data.activeFileName);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiUrl}/api/chat/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const data = await response.json();
        if (response.ok) {
          setSelectedFile(file);
          setActiveFileName(file.name);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `File "${file.name}" uploaded successfully. You can now chat with your file. For Excel files, please specify the sheet name in your message (e.g., "Sheet Sheet1", "Sheet Google").`
          }]);
        } else {
          throw new Error(data.error);
        }
      } catch (error) {
        console.error('Upload error:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Error uploading file. Please try again.'
        }]);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const messageInput = messageInputRef.current;
    if (!messageInput || !messageInput.value.trim()) return;

    const message = messageInput.value.trim();
    messageInput.value = '';

    try {
      setIsProcessing(true);
      setMessages(prev => [...prev, { role: 'user', content: message }]);

      const response = await fetch(`${apiUrl}/api/chat/message`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      const data = await response.json();
      
      if (message.toLowerCase() === 'reset the chat') {
        setMessages([]);
        setSelectedFile(null);
        setActiveFileName(null);
        return;
      }

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'An error occurred while processing your request.'
      }]);
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
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Chat with Files</h1>
          <p className="mt-2 text-gray-600">
            Upload a .pdf, .xls, .xlsx, or .csv file and chat with it. For Excel files,
            specify the sheet name in your message (e.g., "Sheet Sheet1", "Sheet Google").
          </p>
          
          {/* File Upload */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File
            </label>
            <input
              type="file"
              accept=".pdf,.xls,.xlsx,.csv"
              onChange={handleFileUpload}
              disabled={isProcessing}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {activeFileName && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-700">
                Active file: {activeFileName}
              </p>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gray-50"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white shadow-md text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white shadow-md rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              ref={messageInputRef}
              type="text"
              placeholder={activeFileName 
                ? "Type your message... (type 'reset the chat' to start over)" 
                : "Please upload a file first..."
              }
              disabled={isProcessing || !activeFileName}
              className="flex-1 rounded-md border-gray-300 shadow-sm 
                focus:border-blue-500 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={isProcessing || !activeFileName}
              className={`px-4 py-2 rounded-md text-white bg-blue-600 
                hover:bg-blue-700 focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors`}
            >
              {isProcessing ? 'Processing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 