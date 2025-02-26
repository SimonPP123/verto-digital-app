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
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_OPTIONS[0].value);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  // Add polling effect with shorter interval and better state management
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    let lastMessageCount = messages.length;
    let pollAttempts = 0;
    const maxAttempts = 150; // 5 minutes maximum

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

            // Get the last message from both arrays
            const lastNewMessage = newMessages[newMessages.length - 1];
            const lastCurrentMessage = messages[messages.length - 1];

            // Check if we have a new message or if the last messages are different
            const hasNewMessage = newMessages.length > messages.length;
            const lastMessagesDifferent = lastNewMessage && lastCurrentMessage && 
              (lastNewMessage.content !== lastCurrentMessage.content || 
               lastNewMessage.role !== lastCurrentMessage.role);

            if (hasNewMessage || lastMessagesDifferent) {
              // Preserve local messages that aren't in the server response
              const localMessages = messages.filter(msg => 
                !newMessages.some(newMsg => 
                  newMsg.content === msg.content && 
                  newMsg.role === msg.role
                )
              );
              
              // Combine local messages with server messages
              setMessages([...localMessages, ...newMessages]);
              
              // Check if we should stop polling
              if (lastNewMessage?.role === 'assistant') {
                setIsProcessing(false);
                clearInterval(pollInterval);
                return;
              }
            }
          }

          // Increment poll attempts and check timeout
          pollAttempts++;
          if (pollAttempts >= maxAttempts) {
            setIsProcessing(false);
            clearInterval(pollInterval);
            setMessages(prev => [...prev, createMessageWithTimestamp(
              'system',
              'Request timed out after 5 minutes. Please try again.'
            )]);
          }
        } catch (error) {
          console.error('Error polling for updates:', error);
          setIsProcessing(false);
          clearInterval(pollInterval);
          setMessages(prev => [...prev, createMessageWithTimestamp(
            'system',
            'An error occurred while waiting for a response. Please try again.'
          )]);
        }
      }, 2000);
    }

    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isProcessing, activeChatId, apiUrl]);

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
      // Only clear messages if we're not showing the welcome message
      if (!messages.some(msg => msg.content.includes('Welcome to Chat with Files!'))) {
        setMessages([]);
      }
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
        setMessages([
          {
            role: 'assistant',
            content: `
              <div class="chat-message prose max-w-none text-gray-900">
                <h2>👋 Welcome to Chat with Files!</h2>
                <p>Before we begin, I recommend watching this quick overview of how to use the tool:</p>
                <div class="aspect-w-16 aspect-h-9 mt-4 mb-4">
                  <iframe
                    src="https://www.loom.com/embed/79317424724f45f79d875e0f738e8682?sid=8a3c790d-6df5-4b9d-8b4b-d80eb171c78a"
                    frameborder="0"
                    webkitallowfullscreen
                    mozallowfullscreen
                    allowfullscreen
                    style="width: 100%; height: 400px;"
                  ></iframe>
                </div>
                <p>You can now:</p>
                <ul>
                  <li>Upload files (PDF, Excel, CSV) using the + button</li>
                  <li>Ask questions about your documents</li>
                  <li>Get AI-powered insights and analysis</li>
                </ul>
                <p>Let me know if you have any questions!</p>
              </div>
            `,
            timestamp: Date.now()
          }
        ]);
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

        // Only update messages if we have history or if there's no welcome message
        if (filteredMessages.length > 0 || !messages.some(msg => msg.content.includes('Welcome to Chat with Files!'))) {
          setMessages(filteredMessages);
        }
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
            const uploadedFile = data.files[0];
            
            // Add success message
            setMessages(prev => [
                ...prev,
                createMessageWithTimestamp(
                    'system',
                    `File uploaded successfully: ${file.name}`
                )
            ]);

            // For Excel files, show sheet names
            if ((file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) && uploadedFile.sheetNames) {
                setMessages(prev => [
                    ...prev,
                    createMessageWithTimestamp(
                        'system',
                        `Available sheets in "${file.name}": ${uploadedFile.sheetNames.join(', ')}\n\nPlease specify which sheets you want to use by sending a message like:\n"Please use sheets: Sheet ${uploadedFile.sheetNames[0]}${uploadedFile.sheetNames[1] ? `, Sheet ${uploadedFile.sheetNames[1]}` : ''}, Sheet {Name}"`
                    )
                ]);
            }

            // Update files list with proper type checking
            const updatedFiles = data.files.map((uploadedFile: ChatFile & { sheetNames?: string[] }) => ({
                id: uploadedFile.id || uploadedFile._id,
                name: uploadedFile.name || uploadedFile.originalName,
                type: uploadedFile.type,
                size: uploadedFile.size,
                status: 'pending' as const,
                sheetNames: uploadedFile.sheetNames
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
    const processingMessage = createMessageWithTimestamp('system', 'Processing your request...');
    
    // Add both messages immediately
    setMessages(prev => [...prev, userMessage, processingMessage]);
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
                files: formattedFiles.length > 0 ? formattedFiles : undefined,
                model: selectedModel
            })
        });

        if (response.status === 429) {
            setMessages(prev => prev.filter(msg => msg !== processingMessage).concat([
                createMessageWithTimestamp(
                    'system',
                    'Please wait while the previous request is being processed...'
                )
            ]));
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

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Remove processing message and add error message
        setMessages(prev => prev.filter(msg => msg !== processingMessage).concat([
            createMessageWithTimestamp(
                'system',
                `Error: ${errorMessage}`
            )
        ]));
        setIsProcessing(false);
    }
  };

  // Add a helper function to check if we can send a message
  const canSendMessage = () => {
    return !isProcessing && activeChatId;
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
        body: JSON.stringify({
          sessionId: activeChatId,
          chatInput: 'reset the chat'
        }),
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

  const handleRenameChat = async (chatId: string, newName: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/sessions/${chatId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName })
      });
      
      if (response.ok) {
        setChatSessions(prev => prev.map(chat => 
          chat._id === chatId ? { ...chat, name: newName } : chat
        ));
        setEditingChatId(null);
        setEditingChatName('');
      }
    } catch (error) {
      console.error('Error renaming chat:', error);
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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className={`bg-gray-800 text-white ${isSidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className={`font-semibold text-blue-200 ${isSidebarOpen ? 'block' : 'hidden'}`}>Chat Sessions</h2>
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
                className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-300"
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
                    {editingChatId === chat._id ? (
                      <input
                        type="text"
                        value={editingChatName}
                        onChange={(e) => setEditingChatName(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') {
                            handleRenameChat(chat._id, editingChatName);
                          } else if (e.key === 'Escape') {
                            setEditingChatId(null);
                            setEditingChatName('');
                          }
                        }}
                        onBlur={() => {
                          if (editingChatName.trim()) {
                            handleRenameChat(chat._id, editingChatName);
                          } else {
                            setEditingChatId(null);
                            setEditingChatName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 bg-gray-600 text-white rounded border border-gray-500"
                        autoFocus
                      />
                    ) : (
                      <>
                        <div className="font-medium text-white">{chat.name}</div>
                        <div className="text-sm text-gray-300">
                          {new Date(chat.lastActivity).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingChatId(chat._id);
                        setEditingChatName(chat.name);
                      }}
                      className="text-gray-400 hover:text-blue-400 p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat._id);
                      }}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <div className="p-2 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {chatSessions.find(chat => chat._id === activeChatId)?.name || 'Chat with Files'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="block w-64 px-2 py-1 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                {MODEL_OPTIONS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
          style={{ height: 'calc(100vh - 160px)' }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${message.timestamp || index}`}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white shadow-md text-gray-900'
                }`}
              >
                {message.role === 'user' ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div 
                    className="chat-content"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                )}
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
        <div className="p-2 bg-white border-t border-gray-200">
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
              rows={1}
              placeholder={!activeChatId ? "Select or create a chat to start..." :
                isProcessing ? "Processing previous request... Please wait..." :
                "Type your message..."
              }
              disabled={!canSendMessage()}
              className="flex-1 rounded-md border-gray-300 shadow-sm 
                focus:border-blue-500 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-y min-h-[40px] max-h-[80px] p-2
                text-base leading-relaxed text-gray-900 placeholder-gray-500"
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
          
          {/* Active Files List - Moved here */}
          {activeFiles.length > 0 && (
            <div className="mt-2 mb-2">
              <div className="flex flex-wrap gap-1">
                {activeFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center px-2 py-0.5 text-sm rounded-lg ${
                      file.status === 'processed' ? 'bg-green-100' : 'bg-yellow-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="mr-1">📄</span>
                      <span>{file.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-1 text-xs text-gray-700 font-medium">
            <strong>File Upload Instructions:</strong> Upload one file at a time (max 10) • Send a message about each file • Supported: PDF, Excel, CSV<br/>
            <strong>For Excel Files:</strong> After upload, specify which sheets to use (comma-separated). Example: "Please use sheets: Sheet Sheet1, Sheet Sheet2, Sheet [Name]"
          </div>
        </div>
      </div>
    </div>
  );
} 