'use client';

import React, { useState, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import TemplatesSidebar from './TemplatesSidebar';
import MessageDisplay from './MessageDisplay';
import MessageControls from './MessageControls';
import { v4 as uuidv4 } from 'uuid';
import AgentSelectionModal from './AgentSelectionModal';
import { format } from 'date-fns';
import TemplateVariablesModal, { TemplateVariable } from './TemplateVariablesModal';
import GA4AccountIdModal from './GA4AccountIdModal';

// Define types
type MessageType = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date | string;
};

type Agent = {
  id: string;
  name: string;
  webhookUrl: string;
  icon: string;
  description: string;
};

type Conversation = {
  conversationId: string;
  title: string;
  messages: MessageType[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  agent?: {
    name: string;
    webhookUrl: string;
    icon: string;
    description: string;
    ga4AccountId?: string;
  };
};

type Template = {
  _id: string;
  title: string;
  content: string;
  variables: TemplateVariable[];
  isPublic: boolean;
  user: string;
  createdAt: string;
  updatedAt: string;
};

export default function AssistantInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(256); // 64 * 4 = 256px (w-64)
  const [rightSidebarWidth, setRightSidebarWidth] = useState(320); // 80 * 4 = 320px (w-80)
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showTemplateVarsModal, setShowTemplateVarsModal] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [showGA4AccountIdModal, setShowGA4AccountIdModal] = useState(false);
  const [pendingAgent, setPendingAgent] = useState<Agent | null>(null);
  // Add state to track if we're polling for BigQuery responses
  const [isBigQueryPolling, setIsBigQueryPolling] = useState(false);

  useEffect(() => {
    // Fetch conversation sessions on component mount
    fetchConversationSessions();
    
    // Fetch templates on component mount
    fetchTemplates();
  }, []);

  // Add polling for BigQuery requests
  useEffect(() => {
    // Only poll if we have a current conversation and it's a BigQuery agent
    if (!currentConversation || 
        !currentConversation.agent || 
        currentConversation.agent.name !== 'BigQuery Agent' ||
        !isBigQueryPolling) {
      return;
    }

    // Check if there's a processing message in the conversation
    const hasProcessingMessage = currentConversation.messages.some(
      msg => msg.role === 'assistant' && msg.content === 'Processing your BigQuery request...'
    );

    if (!hasProcessingMessage) {
      // Stop polling if there's no processing message
      setIsBigQueryPolling(false);
      return;
    }

    // Set up polling interval
    const intervalId = setInterval(async () => {
      try {
        // Call the status endpoint
        const response = await fetch(`/api/assistant/bigquery/status/${currentConversation.conversationId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'completed') {
          // If processing is complete, fetch the updated conversation
          await selectConversation(currentConversation.conversationId);
          // Stop polling
          setIsBigQueryPolling(false);
        }
      } catch (error) {
        console.error('Error polling BigQuery status:', error);
        // Log error but continue polling
      }
    }, 3000); // Poll every 3 seconds

    // Cleanup interval on unmount or when polling stops
    return () => clearInterval(intervalId);
  }, [currentConversation, isBigQueryPolling]);

  const fetchConversationSessions = async () => {
    try {
      const response = await fetch('/api/assistant/conversations');
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation sessions');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error('Error fetching conversation sessions:', error);
      setError('Failed to load conversation sessions. Please try again later.');
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/assistant/templates');
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates. Please try again later.');
    }
  };

  const selectConversation = async (conversationId: string) => {
    try {
      setIsLoadingMessages(true);
      setError(null);
      
      const response = await fetch(`/api/assistant/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch conversation session');
      }
      
      const data = await response.json();
      
      if (data.success && data.conversation) {
        setCurrentConversation(data.conversation);
      } else {
        throw new Error('Invalid conversation data received');
      }
    } catch (error) {
      console.error('Error fetching conversation session:', error);
      setError('Failed to load conversation messages. Please try again later.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateNewConversation = () => {
    // Show agent selection modal instead of immediately creating conversation
    setShowAgentModal(true);
  };

  const handleAgentSelected = async (agent: Agent) => {
    // Check if this is a Google Analytics 4 agent
    if (agent.name === 'Google Analytics 4') {
      // Store the selected agent temporarily and show the account ID modal
      setPendingAgent(agent);
      setShowGA4AccountIdModal(true);
      return null;
    }
    
    // For other agents, proceed normally
    return createNewConversation(agent);
  };

  // New function to handle account ID submission
  const handleGA4AccountIdSubmit = async (accountId: string) => {
    if (!pendingAgent) return;
    
    // Validate the account ID - it must not be empty
    if (!accountId || accountId.trim() === '') {
      setError('Please provide a valid Google Analytics 4 Account ID');
      return;
    }
    
    // Close the modal
    setShowGA4AccountIdModal(false);
    
    // Create a new agent object with the account ID
    const agentWithAccountId = {
      ...pendingAgent,
      ga4AccountId: accountId.trim()
    };
    
    // Log the account ID for debugging
    console.log('Creating conversation with GA4 account ID:', accountId.trim());
    
    // Create the conversation with the enhanced agent
    await createNewConversation(agentWithAccountId);
    
    // Clear the pending agent
    setPendingAgent(null);
  };
  
  // Extract conversation creation logic to a separate function
  const createNewConversation = async (agent: Agent & { ga4AccountId?: string }) => {
    try {
      const conversationId = uuidv4();
      
      // Format the current date and time
      const now = new Date();
      const formattedDate = format(now, "MMM d, yyyy 'at' h:mm a");
      
      // Set title to agent name + date/time
      const title = `${agent.name} - ${formattedDate}`;
      
      // Create the conversation object
      const newConversation = {
        conversationId,
        title,
        messages: [],
        isArchived: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        agent: {
          name: agent.name,
          webhookUrl: agent.webhookUrl,
          icon: agent.icon,
          description: agent.description,
          ga4AccountId: agent.ga4AccountId
        }
      };
      
      // Log the conversation data for debugging
      console.log('Creating new conversation:', {
        ...newConversation,
        agent: {
          ...newConversation.agent,
          ga4AccountId: newConversation.agent.ga4AccountId
        }
      });
      
      // First set the conversation in UI to ensure smooth UX
      setCurrentConversation(newConversation);
      setConversations(prevConversations => [newConversation, ...prevConversations]);
      
      // Close the modal
      setShowAgentModal(false);
      
      // Then save to the database
      const response = await fetch('/api/assistant/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newConversation)
      });
      
      if (!response.ok) {
        console.error('Server responded with error:', await response.text());
        throw new Error('Failed to create conversation');
      }
      
      const data = await response.json();
      
      if (data.success && data.conversation) {
        // Update with server data (which might have additional fields)
        setCurrentConversation(data.conversation);
        setConversations(prevConversations => 
          prevConversations.map(c => 
            c.conversationId === conversationId ? data.conversation : c
          )
        );
        return data.conversation; // Return the created conversation
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error) {
      console.error('Error creating new conversation:', error);
      setError('Failed to create new conversation. Please try again.');
      return null; // Return null on failure
    }
  };

  // Add function to get GA4 auth token
  const getGA4Token = async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/analytics/auth/status');
      const data = await response.json();
      
      if (data.authenticated) {
        return data.accessToken || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting GA4 token:', error);
      return null;
    }
  };

  // Update the sendMessage function to include GA4 token if needed
  const sendMessage = async (messageContent: string) => {
    try {
      if (!currentConversation) {
        // Handle case when no conversation is selected
        setError('No active conversation. Please create or select a conversation first.');
        return;
      }

      setIsSendingMessage(true);
      setError(null);

      // Check if this is a BigQuery agent
      const isBigQueryAgent = currentConversation.agent?.name === 'BigQuery Agent';

      // Add the message to the UI immediately for a responsive feel
      const userMessage: MessageType = {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString()
      };

      // Update UI instantly for better UX
      setCurrentConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, userMessage]
        };
      });

      // Prepare the request
      const isGoogleAnalyticsAgent = currentConversation.agent?.name === 'Google Analytics 4';
      let webhookUrl = currentConversation.agent?.webhookUrl;
      let ga4Token = null;
      const ga4AccountId = currentConversation.agent?.ga4AccountId;

      // Log the GA4 account ID for debugging
      if (isGoogleAnalyticsAgent) {
        console.log('GA4 Account ID:', ga4AccountId);
        if (!ga4AccountId) {
          setError('Google Analytics 4 Account ID is required. Please create a new conversation and provide the account ID.');
          return;
        }
      }

      // If using GA4 agent, get the auth token
      if (isGoogleAnalyticsAgent) {
        try {
          ga4Token = await getGA4Token();
          
          if (!ga4Token) {
            console.log('No GA4 token available, using internal query endpoint');
            // If no token, use the query endpoint which handles auth internally
            webhookUrl = '/api/analytics/query';
          } else {
            console.log('GA4 token available for request');
          }
        } catch (authError) {
          console.error('Error getting GA4 token:', authError);
          // If there's an error getting the token, still try using the query endpoint
          webhookUrl = '/api/analytics/query';
        }
      }

      // Send to backend API
      const response = await fetch('/api/assistant/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId: currentConversation.conversationId,
          message: messageContent,
          webhookUrl,
          ga4Token,
          isGoogleAnalyticsAgent,
          ga4AccountId
        })
      });

      // Check for HTTP status first
      if (!response.ok) {
        // Try to get the response content
        const responseText = await response.text();
        
        try {
          // Try to parse as JSON
          const errorData = JSON.parse(responseText);
          
          // If we have an updated conversation in the error response, use it
          if (errorData.updatedConversation) {
            setCurrentConversation(errorData.updatedConversation);
            
            // Also update the conversation in the list
            setConversations(prevConversations => {
              return prevConversations.map(conv => 
                conv.conversationId === errorData.updatedConversation.conversationId
                  ? errorData.updatedConversation
                  : conv
              );
            });
            
            // If this was a Google Analytics authentication error, provide a specific error message
            if (errorData.message && errorData.message.includes('Not authenticated with Google Analytics')) {
              setError('Google Analytics authentication required. Please authenticate and try again.');
            } else {
              // Show general error message based on response
              setError(errorData.message || errorData.error || `Error (${response.status})`);
            }
            
            return; // Early return since we've handled the error
          }
          
          // No updated conversation, throw regular error
          throw new Error(errorData.message || errorData.error || `Server error (${response.status})`);
        } catch (parseError) {
          // If parsing fails, it's not JSON, use the text directly
          console.error('Failed to parse error response:', responseText);
          throw new Error(`Server error (${response.status}): ${responseText.substring(0, 100)}...`);
        }
      }
      
      // For successful responses, get the content and try to parse as JSON
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse server response:', responseText);
        throw new Error(`Failed to parse server response: ${responseText.substring(0, 100)}...`);
      }

      // Process the successful response
      if (data.updatedConversation) {
        // Update the conversation with the server data
        setCurrentConversation(data.updatedConversation);
        
        // Also update the conversation in the list
        setConversations(prevConversations => {
          return prevConversations.map(conv => 
            conv.conversationId === data.updatedConversation.conversationId
              ? data.updatedConversation
              : conv
          );
        });

        // Start polling if this is a BigQuery agent that's processing
        if (isBigQueryAgent && 
            data.updatedConversation.messages.some(
              (msg: MessageType) => 
                msg.role === 'assistant' && 
                msg.content === 'Processing your BigQuery request...'
            )) {
          setIsBigQueryPolling(true);
        }
      }

      if (!data.success) {
        throw new Error(data.message || data.error || 'Failed to send message');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again later.');
      
      // Remove the user message if sending failed and no server response was handled
      setCurrentConversation(prev => {
        if (!prev) return null;
        // Only remove if we haven't already updated with a server response
        if (prev.messages.length > 0 && prev.messages[prev.messages.length - 1].role === 'user') {
          return {
            ...prev,
            messages: prev.messages.slice(0, -1)
          };
        }
        return prev;
      });
    } finally {
      setIsSendingMessage(false);
    }
  };

  const renameConversation = async (conversationId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/assistant/conversations/${conversationId}/rename`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to rename conversation');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the conversation in the conversations list
        setConversations(prevConversations => {
          return prevConversations.map(conversation => {
            if (conversation.conversationId === conversationId) {
              return {
                ...conversation,
                title: newTitle
              };
            }
            return conversation;
          });
        });
        
        // Update current conversation if it's the one being renamed
        if (currentConversation?.conversationId === conversationId) {
          setCurrentConversation(prevConversation => {
            if (!prevConversation) return null;
            
            return {
              ...prevConversation,
              title: newTitle
            };
          });
        }
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      setError('Failed to rename conversation. Please try again later.');
    }
  };

  const archiveConversation = async (conversationId: string, isArchived: boolean) => {
    try {
      const response = await fetch(`/api/assistant/conversations/${conversationId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          isArchived
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive/unarchive conversation');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Update the conversation in the conversations list
        setConversations(prevConversations => {
          return prevConversations.map(conversation => {
            if (conversation.conversationId === conversationId) {
              return {
                ...conversation,
                isArchived
              };
            }
            return conversation;
          });
        });
        
        // Update current conversation if it's the one being archived
        if (currentConversation?.conversationId === conversationId) {
          setCurrentConversation(prevConversation => {
            if (!prevConversation) return null;
            
            return {
              ...prevConversation,
              isArchived
            };
          });
        }
      }
    } catch (error) {
      console.error('Error archiving/unarchiving conversation:', error);
      setError('Failed to archive/unarchive conversation. Please try again later.');
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/assistant/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete conversation');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Remove the conversation from the conversations list
        setConversations(prevConversations => {
          return prevConversations.filter(conversation => conversation.conversationId !== conversationId);
        });
        
        // Clear current conversation if it's the one being deleted
        if (currentConversation?.conversationId === conversationId) {
          setCurrentConversation(null);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      setError('Failed to delete conversation. Please try again later.');
    }
  };

  const exportConversationAsPdf = (conversationId: string) => {
    window.open(`/api/assistant/conversations/${conversationId}/export`, '_blank');
  };

  const useTemplate = async (template: Template) => {
    // Find variables in the template
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = template.content.match(variableRegex);
    
    try {
      let targetConversation = currentConversation;
      
      // If no current conversation, create one first
      if (!targetConversation) {
        // Create a default agent if needed - this is a fallback
        const defaultAgent = {
          id: 'N8N_BIGQUERY',
          name: 'BigQuery Agent',
          webhookUrl: process.env.N8N_BIGQUERY || '',
          icon: 'database',
          description: 'Default BigQuery agent'
        };
        
        // Show agent selection modal and wait for user to select
        setShowAgentModal(true);
        // Note: actual agent selection is handled by handleAgentSelected
        // We can't directly call it here due to the async nature
        return; // Exit early, the modal will handle the rest
      }
      
      if (matches && matches.length > 0 && template.variables.length > 0) {
        // Show modal for template variables
        setCurrentTemplate(template);
        setShowTemplateVarsModal(true);
      } else {
        // Template has no variables, use as is
        sendMessage(template.content);
      }
    } catch (error) {
      console.error('Error using template:', error);
      setError('Failed to use template. Please try again.');
    }
  };
  
  const handleVariablesSubmit = (values: Record<string, string>) => {
    if (!currentTemplate || !currentConversation) return;
    
    // Replace variables in template content
    let messageContent = currentTemplate.content;
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    messageContent = messageContent.replace(variableRegex, (match, varName) => {
      const variableName = varName.trim();
      return values[variableName] || match;
    });
    
    // Send message and close modal
    sendMessage(messageContent);
    setShowTemplateVarsModal(false);
    setCurrentTemplate(null);
  };

  // Handle mouse down event on resizer
  const handleLeftResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingLeft(true);
  };

  const handleRightResizerMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingRight(true);
  };

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        // Set minimum and maximum width constraints
        const newWidth = Math.max(200, Math.min(500, e.clientX));
        setLeftSidebarWidth(newWidth);
      } else if (isResizingRight) {
        const container = document.getElementById('assistant-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          // Set minimum and maximum width constraints
          const newWidth = Math.max(200, Math.min(500, containerRect.right - e.clientX));
          setRightSidebarWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Cursor style when resizing
  useEffect(() => {
    if (isResizingLeft || isResizingRight) {
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingLeft, isResizingRight]);

  // Updated render function to include the agent badge in the UI
  const renderAgentBadge = (conversation: {
    agent?: {
      name: string;
      webhookUrl: string;
      icon: string;
      description: string;
      ga4AccountId?: string;
    };
  }) => {
    if (!conversation.agent) return null;
    
    return (
      <div className="flex items-center bg-blue-50 px-1 py-0.5 rounded-full text-xs">
        <div className="bg-blue-100 text-blue-600 p-0.5 rounded-full">
          {conversation.agent.icon === 'database' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          )}
          {conversation.agent.icon === 'chart-bar' && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          )}
          {(!conversation.agent.icon || conversation.agent.icon === 'bot') && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <div className="ml-1 flex flex-col">
          <span className="text-xs text-blue-600 font-medium">{conversation.agent.name}</span>
          {conversation.agent.ga4AccountId && (
            <span className="text-xxs text-blue-500">ID: {conversation.agent.ga4AccountId}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="assistant-container" className="flex h-full relative">
      {/* Left Sidebar - Conversation sessions */}
      <div 
        className={`bg-white border-r border-gray-200 transition-all overflow-hidden ${
          leftSidebarOpen ? 'block' : 'hidden'
        }`}
        style={{ width: leftSidebarWidth + 'px', minWidth: leftSidebarWidth + 'px' }}
      >
        <ConversationSidebar 
          conversations={conversations}
          currentConversationId={currentConversation?.conversationId}
          onSelectConversation={selectConversation}
          onNewConversation={handleCreateNewConversation}
          onRenameConversation={renameConversation}
          onArchiveConversation={archiveConversation}
          onDeleteConversation={deleteConversation}
          onExportConversation={exportConversationAsPdf}
          renderAgentBadge={renderAgentBadge}
        />
      </div>

      {/* Left sidebar resizer */}
      {leftSidebarOpen && (
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-ew-resize z-10"
          onMouseDown={handleLeftResizerMouseDown}
        />
      )}
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Toggle left sidebar button */}
        <button
          className="absolute top-20 left-2 z-10 p-2 rounded-full bg-white shadow-md text-gray-500 hover:text-blue-500"
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        >
          {leftSidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          )}
        </button>
        
        {/* Toggle right sidebar button */}
        <button
          className="absolute top-20 right-2 z-10 p-2 rounded-full bg-white shadow-md text-gray-500 hover:text-blue-500"
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        >
          {rightSidebarOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
        
        {currentConversation ? (
          <>
            {/* Chat Header with Agent Info */}
            <div className="bg-white border-b border-gray-200 p-3 flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-semibold text-gray-800 mr-2">{currentConversation.title}</h2>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    // Call rename function with current conversation ID
                    const newTitle = prompt('Enter new title:', currentConversation.title);
                    if (newTitle && newTitle.trim() !== '') {
                      renameConversation(currentConversation.conversationId, newTitle);
                    }
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              {currentConversation.agent && (
                <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                  <div className="bg-blue-100 text-blue-600 p-1 rounded-full mr-2">
                    {currentConversation.agent.icon === 'database' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                      </svg>
                    )}
                    {currentConversation.agent.icon === 'chart-bar' && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    {(!currentConversation.agent.icon || currentConversation.agent.icon === 'bot') && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-700 text-sm">{currentConversation.agent.name}</span>
                    {currentConversation.agent.ga4AccountId && (
                      <span className="text-xs text-blue-600">Account ID: {currentConversation.agent.ga4AccountId}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversation.messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-10">
                  <p>Send a message to start a conversation</p>
                </div>
              ) : (
                currentConversation.messages.map((msg, idx) => (
                  <MessageDisplay 
                    key={idx} 
                    message={msg} 
                  />
                ))
              )}
              
              {isSendingMessage && (
                <div className="flex justify-center">
                  <div className="animate-bounce flex space-x-1 text-blue-500">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Chat input */}
            <div className="p-4 border-t border-gray-200">
              <MessageControls 
                onSendMessage={(message) => sendMessage(message)}
                isSending={isSendingMessage}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI Assistant</h2>
              <p className="text-gray-600 mb-6">Start a new conversation with an AI agent.</p>
              <button
                onClick={handleCreateNewConversation}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right sidebar resizer */}
      {rightSidebarOpen && (
        <div
          className="w-1 bg-gray-300 hover:bg-blue-500 cursor-ew-resize z-10"
          onMouseDown={handleRightResizerMouseDown}
        />
      )}
      
      {/* Right Sidebar - Templates */}
      <div 
        className={`bg-white border-l border-gray-200 transition-all overflow-hidden ${
          rightSidebarOpen ? 'block' : 'hidden'
        }`}
        style={{ width: rightSidebarWidth + 'px', minWidth: rightSidebarWidth + 'px' }}
      >
        <TemplatesSidebar 
          templates={templates}
          onUseTemplate={useTemplate}
          onTemplatesChanged={fetchTemplates}
        />
      </div>

      {/* Agent Selection Modal */}
      <AgentSelectionModal
        isOpen={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        onSelectAgent={handleAgentSelected}
      />
      
      {/* Template Variables Modal */}
      {currentTemplate && (
        <TemplateVariablesModal
          isOpen={showTemplateVarsModal}
          onClose={() => {
            setShowTemplateVarsModal(false);
            setCurrentTemplate(null);
          }}
          onSubmit={handleVariablesSubmit}
          variables={currentTemplate.variables}
          templateContent={currentTemplate.content}
        />
      )}

      {/* Add GA4 Account ID Modal */}
      <GA4AccountIdModal
        isOpen={showGA4AccountIdModal}
        onClose={() => {
          setShowGA4AccountIdModal(false);
          setPendingAgent(null);
        }}
        onSubmit={handleGA4AccountIdSubmit}
      />
    </div>
  );
}