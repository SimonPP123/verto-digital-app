'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Message, File, ChatSession, ChatHistoryResponse, ModelOption } from '../../types/chat';
import { MODEL_OPTIONS } from '../../types/chat';

interface ChatFile {
  _id?: string;
  id?: string;
  originalName?: string;
  name?: string;
  status?: 'pending' | 'processed' | 'error';
  type: string;
  size: number;
  path?: string;
}

// Helper function to create messages with timestamp
const createMessageWithTimestamp = (role: Message['role'], content: string): Message => ({
  role,
  content,
  timestamp: Date.now()
});

export default function ChatServicePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeFiles, setActiveFiles] = useState<File[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newChatName, setNewChatName] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].value);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Add polling effect with shorter interval and better state management
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let lastMessageCount = messages.length;

    if (isProcessing && activeChatId) {
      // Initial fetch immediately
      fetchChatHistory();
      
      // Then poll every 2 seconds
      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${apiUrl}/api/chat/history?sessionId=${activeChatId}`, {
            credentials: 'include'
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch updates');
          }
          
          const data: ChatHistoryResponse = await response.json();
          
          // Update messages if we have new ones
          if (data.messages && Array.isArray(data.messages)) {
            const newMessages = data.messages
              .filter(msg => !msg.content.includes('Workflow was started'))
              .map(msg => ({
                ...msg,
                timestamp: msg.timestamp || Date.now()
              }));

            // Only update if messages have changed
            if (JSON.stringify(newMessages) !== JSON.stringify(messages)) {
              setMessages(newMessages);

              // Check if we have a new complete response
              const currentMessageCount = newMessages.length;
              const lastMessage = newMessages[currentMessageCount - 1];
              const previousMessage = newMessages[currentMessageCount - 2];

              // Stop processing if:
              // 1. We have more messages than before (received a new message)
              // 2. The last message is from the assistant
              // 3. The previous message was from the user
              if (currentMessageCount > lastMessageCount &&
                  lastMessage?.role === 'assistant' &&
                  previousMessage?.role === 'user') {
                setIsProcessing(false);
                clearInterval(pollInterval);
              }

              lastMessageCount = currentMessageCount;
            }
          }
        } catch (error) {
          console.error('Error polling for updates:', error);
          // Stop processing on error after 3 retries
          if (error instanceof Error && error.message.includes('Failed to fetch updates')) {
            setIsProcessing(false);
            clearInterval(pollInterval);
          }
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isProcessing, activeChatId, apiUrl, messages]);

  // Fetch chat sessions on mount
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      console.log('Fetching chat sessions');
      fetchChatSessions();
    }
  }, [isAuthenticated, isLoading]);

  // Fetch chat history when active chat changes
  useEffect(() => {
    if (activeChatId && !isLoading) {
      console.log('Active chat changed, fetching history for:', activeChatId);
      // Clear current messages and files before fetching new ones
      setMessages([]);
      setActiveFiles([]);
      setSelectedFiles([]);
      setSelectedFileIds([]);
      fetchChatHistory();
    }
  }, [activeChatId, isLoading]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchChatSessions = async () => {
    try {
      console.log('Fetching chat sessions from API');
      const response = await fetch(`${apiUrl}/api/chat/sessions`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat sessions');
      }
      
      const data = await response.json();
      console.log('Received chat sessions:', data);
      setChatSessions(data);
      
      // Set first chat as active if none selected
      if (data.length > 0 && !activeChatId) {
        console.log('Setting first chat as active:', data[0]._id);
        setActiveChatId(data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  const createNewChat = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/sessions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newChatName || undefined })
      });
      
      if (response.ok) {
        const newChat = await response.json();
        setChatSessions(prev => [newChat, ...prev]);
        setActiveChatId(newChat._id);
        setNewChatName('');
        setMessages([]);
        setSelectedFiles([]);
        setActiveFiles([]);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const deleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/sessions/${chatId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        setChatSessions(prev => prev.filter(chat => chat._id !== chatId));
        if (activeChatId === chatId) {
          const remainingChats = chatSessions.filter(chat => chat._id !== chatId);
          setActiveChatId(remainingChats[0]?._id || null);
          setMessages([]);
          setSelectedFiles([]);
          setActiveFiles([]);
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const fetchChatHistory = async () => {
    try {
      if (!activeChatId) return;

      console.log('Fetching chat history for session:', activeChatId);
      const response = await fetch(`${apiUrl}/api/chat/history?sessionId=${activeChatId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.status} ${response.statusText}`);
      }
      
      const data: ChatHistoryResponse = await response.json();
      console.log('Received chat history:', data);
      
      // Set messages and files
      if (data.messages && Array.isArray(data.messages)) {
        const filteredMessages = data.messages
          .filter(msg => !msg.content.includes('Workflow was started'))
          .map(msg => ({
            ...msg,
            timestamp: msg.timestamp || Date.now()
          }));
        setMessages(filteredMessages);
      }
      
      if (data.files && Array.isArray(data.files)) {
        setActiveFiles(data.files);
        // Set unprocessed files as selected
        const unprocessedFiles = data.files.filter(f => f.status === 'pending');
        setSelectedFiles(unprocessedFiles);
        setSelectedFileIds(unprocessedFiles.map(file => file.id));
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setMessages([createMessageWithTimestamp(
        'system',
        `Error loading chat history: ${error instanceof Error ? error.message : 'Unknown error'}`
      )]);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeChatId) return;

    try {
        // Check if there's already a pending file
        if (activeFiles.some(file => file.status === 'pending')) {
            setMessages(prev => [
                ...prev,
                createMessageWithTimestamp(
                    'system',
                    'Please send a message about the current file before uploading another one.'
                )
            ]);
            return;
        }

        // Check total files limit
        if (activeFiles.length >= 10) {
            setMessages(prev => [
                ...prev,
                createMessageWithTimestamp(
                    'system',
                    'Maximum number of files (10) reached. Please remove some files before uploading more.'
                )
            ]);
            return;
        }

        setIsProcessing(true);
        const formData = new FormData();
        const file = files[0];
        
        // Only take the first file
        formData.append('file', file);
        formData.append('sessionId', activeChatId);

        const response = await fetch(`${apiUrl}/api/chat/upload`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const data = await response.json();
        if (response.ok && data.files && data.files.length > 0) {
            // Add success message
            setMessages(prev => [
                ...prev,
                createMessageWithTimestamp(
                    'system',
                    `File uploaded successfully: ${file.name}`
                )
            ]);

            // For Excel files, prompt for sheet selection
            if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                setMessages(prev => [
                    ...prev,
                    createMessageWithTimestamp(
                        'system',
                        'Please specify which sheet you would like to use from the Excel file.'
                    )
                ]);
            }

            // Update files list with proper type checking
            const updatedFiles = data.files.map((uploadedFile: ChatFile) => ({
                id: uploadedFile.id || uploadedFile._id,
                name: uploadedFile.name || uploadedFile.originalName,
                type: uploadedFile.type,
                size: uploadedFile.size,
                status: 'pending' as const
            }));
            
            setActiveFiles(prev => [...prev, ...updatedFiles]);
            setSelectedFiles(updatedFiles);
            setSelectedFileIds(updatedFiles.map((file: { id: string }) => file.id).filter(Boolean));
        } else {
            throw new Error(data.error || 'Failed to upload file');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setMessages(prev => [
            ...prev,
            createMessageWithTimestamp(
                'system',
                `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        ]);
      } finally {
        setIsProcessing(false);
        if (event.target) event.target.value = '';
    }
};

  const handleFileRemove = async (fileId: string) => {
    if (!fileId || !activeChatId) {
      console.error('No file ID or active chat ID provided');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`${apiUrl}/api/chat/files/${fileId}?sessionId=${activeChatId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (response.ok) {
        // Update active files list
        setActiveFiles(prev => prev.filter(file => file.id !== fileId));
        // Update selected file IDs
        setSelectedFileIds(prev => prev.filter(id => id !== fileId));
        // Add success message
        setMessages(prev => [
          ...prev,
          createMessageWithTimestamp(
            'system',
            data.message || 'File removed successfully.'
          )
        ]);
      } else {
        throw new Error(data.error || 'Failed to remove file');
      }
    } catch (error) {
      console.error('Remove file error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error removing file. Please try again.';
      
      // Add error message
      setMessages(prev => [
        ...prev,
        createMessageWithTimestamp(
          'system',
          errorMessage
        )
      ]);
      
      // Update file status to error
      setActiveFiles(prev => prev.map(file => 
        file.id === fileId ? { ...file, status: 'error' as const } : file
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isProcessing || !activeChatId) return;

    const userMessage = createMessageWithTimestamp('user', message.trim());
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
        // Get all pending files
        const pendingFiles = activeFiles.filter(file => file.status === 'pending');
        
        // Format files data according to the required structure
        const formattedFiles = pendingFiles.map((file, index) => ({
            fileName: file.name,
            fileSize: file.size > 1024 * 1024 
                ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                : `${(file.size / 1024).toFixed(1)} kB`,
            fileType: file.type.split('/').pop() || '',
            mimeType: file.type,
            fileExtension: file.name.split('.').pop() || '',
            binaryKey: `data${index}`
        }));

        const response = await fetch(`${apiUrl}/api/chat/message`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'sendMessage',
                sessionId: activeChatId,
                chatInput: userMessage.content,
                files: formattedFiles,
                model: selectedModel
            })
        });

        if (response.status === 429) {
            setMessages(prev => [...prev, createMessageWithTimestamp(
                'system',
                'Please wait while the previous request is being processed...'
            )]);
            setIsProcessing(false);
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Mark files as processed after successful message send
        if (pendingFiles.length > 0) {
            setActiveFiles(prev => prev.map(file => 
                pendingFiles.some(pf => pf.id === file.id) 
                    ? { ...file, status: 'processed' as const }
                    : file
            ));
        }

        // Add processing message
        setMessages(prev => [...prev, createMessageWithTimestamp(
            'system',
            'Processing your request...'
        )]);

        // Start polling for response
        let pollAttempts = 0;
        const maxAttempts = 30; // 60 seconds maximum waiting time
        const pollInterval = setInterval(async () => {
            try {
                const historyResponse = await fetch(`${apiUrl}/api/chat/history?sessionId=${activeChatId}`, {
                    credentials: 'include'
                });
                
                if (!historyResponse.ok) {
                    throw new Error('Failed to fetch updates');
                }
                
                const data: ChatHistoryResponse = await historyResponse.json();
                
                if (data.messages && Array.isArray(data.messages)) {
                    const newMessages = data.messages
                        .filter((msg: Message) => !msg.content.includes('Workflow was started'))
                        .map((msg: Message) => ({
                            ...msg,
                            timestamp: msg.timestamp || Date.now()
                        }));

                    // Find the index of our user message
                    const userMessageIndex = newMessages.findIndex(
                        (msg: Message) => msg.role === 'user' && msg.content === message.trim()
                    );

                    if (userMessageIndex !== -1) {
                        // Get all messages up to and including the next assistant message
                        let endIndex = userMessageIndex + 1;
                        while (endIndex < newMessages.length && newMessages[endIndex].role !== 'assistant') {
                            endIndex++;
                        }
                        if (endIndex < newMessages.length) {
                            // Remove the processing message and update with all messages
                            setMessages(prev => prev.filter(msg => 
                                msg.role !== 'system' || !msg.content.includes('Processing your request')
                            ));
                            setMessages(newMessages);
                            setIsProcessing(false);
                            clearInterval(pollInterval);
                            return;
                        }
                    }
                }

                pollAttempts++;
                if (pollAttempts >= maxAttempts) {
                    setIsProcessing(false);
                    clearInterval(pollInterval);
                    setMessages(prev => [...prev, createMessageWithTimestamp(
                        'system',
                        'Request timed out. Please try again.'
                    )]);
                }
            } catch (error) {
                console.error('Error polling for updates:', error);
                setIsProcessing(false);
                clearInterval(pollInterval);
            }
        }, 2000);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setMessages(prev => [...prev, createMessageWithTimestamp(
            'system',
            `Error: ${errorMessage}`
        )]);
        setIsProcessing(false);
    }
  };

  // Add a helper function to check if we can send a message
  const canSendMessage = () => {
    return !isProcessing && activeChatId && activeFiles.length > 0;
  };

  const handleReset = async () => {
    if (!activeChatId) return;

    try {
      setIsProcessing(true);

      // Call the reset endpoint
      const resetResponse = await fetch(`${apiUrl}/api/chat/reset`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: activeChatId }),
      });

      if (!resetResponse.ok) {
        throw new Error('Failed to reset chat');
      }

      const data = await resetResponse.json();

      // Add messages from the backend response
      if (data.messages) {
        setMessages(prev => [
          ...prev,
          ...data.messages.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).getTime()
          }))
        ]);
      }

      // Clear files locally
      setSelectedFiles([]);
      setActiveFiles([]);
      setSelectedFileIds([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      console.error('Reset error:', error);
      setMessages(prev => [
        ...prev,
        createMessageWithTimestamp(
          'system',
          error instanceof Error ? error.message : 'Error resetting chat. Please try again.'
        )
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const setMessagesWithTimestamp = (messages: Message[]) => {
    setMessages(messages.map(msg => ({
      ...msg,
      timestamp: msg.timestamp || Date.now()
    })));
  };

  const addMessage = (message: Omit<Message, 'timestamp'>) => {
    const messageWithTimestamp: Message = {
      ...message,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, messageWithTimestamp]);
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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`bg-gray-800 text-white ${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className={`font-semibold ${isSidebarOpen ? 'block' : 'hidden'}`}>Chat Sessions</h2>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded"
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>
        
        {isSidebarOpen && (
          <>
            <div className="p-4 border-b border-gray-700">
              <input
                type="text"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                placeholder="New chat name..."
                className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400"
              />
              <button
                onClick={createNewChat}
                className="w-full mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                New Chat
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {chatSessions.map(chat => (
                <div
                  key={chat._id}
                  className={`p-4 cursor-pointer hover:bg-gray-700 flex justify-between items-center ${
                    chat._id === activeChatId ? 'bg-gray-700' : ''
                  }`}
                  onClick={() => setActiveChatId(chat._id)}
                >
                  <div className="truncate flex-1">
                    <div className="font-medium">{chat.name}</div>
                    <div className="text-sm text-gray-400">
                      {new Date(chat.lastActivity).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteChat(chat._id);
                    }}
                    className="ml-2 text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {chatSessions.find(chat => chat._id === activeChatId)?.name || 'Chat with Files'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="block w-64 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Files List */}
          {activeFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Active Files:</h3>
              <div className="flex flex-wrap gap-2">
                {activeFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center p-2 mb-2 rounded-lg ${
                      file.status === 'processed' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-2">📄</span>
                      <span>{file.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${message.timestamp || index}`}
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
                  {[1, 2, 3].map((i) => (
                    <div key={`loading-dot-${i}`} className="animate-pulse">
                    <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                  </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 bg-white border-t border-gray-200">
          <form onSubmit={(e) => {
            e.preventDefault();
            const messageInput = messageInputRef.current;
            if (messageInput && canSendMessage()) {
              handleSendMessage(messageInput.value.trim());
              messageInput.value = '';
            }
          }} className="flex items-start space-x-2">
            <textarea
              ref={messageInputRef}
              rows={3}
              placeholder={!activeChatId ? "Select or create a chat to start..." :
                activeFiles.length === 0 ? "Please upload a file first..." :
                isProcessing ? "Processing previous request... Please wait..." :
                "Type your message..."
              }
              disabled={!canSendMessage()}
              className="flex-1 rounded-md border-gray-300 shadow-sm 
                focus:border-blue-500 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-y min-h-[80px] max-h-[400px] p-3
                text-base leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const messageInput = messageInputRef.current;
                  if (messageInput && canSendMessage()) {
                    handleSendMessage(messageInput.value.trim());
                    messageInput.value = '';
                  }
                }
              }}
            />
            
            {/* File Upload Button */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xls,.xlsx,.csv"
                onChange={handleFileUpload}
                disabled={isProcessing || !activeChatId}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center justify-center p-2 rounded-md text-gray-700 
                  bg-gray-100 hover:bg-gray-200 cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors ${(!activeChatId || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </label>
            </div>

            {/* Reset Button */}
            {activeChatId && (
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="p-2 text-red-600 hover:text-red-700 
                  bg-red-50 hover:bg-red-100 rounded-md transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            
            {/* Send Button */}
            <button
              type="submit"
              disabled={!canSendMessage()}
              className={`p-2 rounded-md text-white bg-blue-600 
                hover:bg-blue-700 focus:outline-none focus:ring-2 
                focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
          <div className="mt-2 text-sm text-gray-600">
            Upload one file at a time. Maximum 10 files total.<br/>
            Send a message about each file before uploading the next one.<br/>
            Supported formats: PDF, Excel (.xls, .xlsx), CSV
          </div>
        </div>
      </div>
    </div>
  );
} 