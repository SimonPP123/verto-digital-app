const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const AssistantConversation = require('../../models/AssistantConversation');
const AssistantTemplate = require('../../models/AssistantTemplate');
const assistantConversationSchema = require('../../schemas/assistantConversationSchema');
const assistantTemplateSchema = require('../../schemas/assistantTemplateSchema');
const { availableAgents } = require('../../config/agents');
const { processAnalyticsQuery } = require('../../utils/analyticsHelper');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Get all conversation sessions for current user
router.get('/conversations', isAuthenticated, async (req, res) => {
  try {
    const conversations = await AssistantConversation.find({ 
      user: req.user._id 
    }).sort({ updatedAt: -1 }).select('-messages');
    
    res.json({ success: true, conversations });
  } catch (error) {
    logger.error('Error fetching conversation sessions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversation sessions',
      message: error.message 
    });
  }
});

// Get a specific conversation session with messages
router.get('/conversations/:conversationId', isAuthenticated, async (req, res) => {
  try {
    const conversation = await AssistantConversation.findOne({ 
      conversationId: req.params.conversationId,
      user: req.user._id 
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation session not found' 
      });
    }
    
    res.json({ success: true, conversation });
  } catch (error) {
    logger.error('Error fetching conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch conversation session',
      message: error.message 
    });
  }
});

// Create a new conversation session
router.post('/conversations', isAuthenticated, async (req, res) => {
  try {
    // More permissive validation - we just need the basics to create a conversation
    let conversationData = req.body;
    
    // Log what we receive for debugging
    logger.info('Creating conversation with data:', {
      receivedData: conversationData,
      userId: req.user._id
    });
    
    if (!conversationData) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing request body' 
      });
    }

    const conversationId = conversationData.conversationId || uuidv4();
    const title = conversationData.title || 'New Conversation';
    
    // Check if conversation exists
    let conversation = await AssistantConversation.findOne({ 
      conversationId,
      user: req.user._id 
    });
    
    if (conversation) {
      // Update existing conversation
      if (conversationData.messages) conversation.messages = conversationData.messages;
      conversation.title = title;
      if (conversationData.isArchived !== undefined) conversation.isArchived = conversationData.isArchived;
      
      // Update agent if provided
      if (conversationData.agent) {
        conversation.agent = {
          name: conversationData.agent.name || 'BigQuery Agent',
          webhookUrl: conversationData.agent.webhookUrl || '',
          icon: conversationData.agent.icon || 'database',
          description: conversationData.agent.description || 'Default agent',
          ga4AccountId: conversationData.agent.ga4AccountId || ''
        };
      }
    } else {
      // Create new conversation - ensure user field is properly set
      conversation = new AssistantConversation({
        conversationId,
        title,
        user: req.user._id,
        messages: conversationData.messages || [],
        isArchived: conversationData.isArchived || false,
        agent: conversationData.agent ? {
          name: conversationData.agent.name || 'BigQuery Agent',
          webhookUrl: conversationData.agent.webhookUrl || '',
          icon: conversationData.agent.icon || 'database',
          description: conversationData.agent.description || 'Default agent',
          ga4AccountId: conversationData.agent.ga4AccountId || ''
        } : undefined
      });
    }
    
    // Log the agent data before saving
    logger.info('Saving conversation with agent data:', {
      agent: conversation.agent,
      ga4AccountId: conversation.agent?.ga4AccountId
    });
    
    // Save with proper error handling
    try {
      await conversation.save();
    } catch (saveError) {
      logger.error('Error saving conversation:', saveError);
      return res.status(500).json({
        success: false,
        error: 'Database error while saving conversation',
        details: saveError.message
      });
    }
    
    res.json({ 
      success: true, 
      conversation 
    });
  } catch (error) {
    logger.error('Error creating/updating conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create/update conversation session',
      message: error.message 
    });
  }
});

// Get available agents
router.get('/agents', isAuthenticated, async (req, res) => {
  try {
    res.json({ success: true, agents: availableAgents });
  } catch (error) {
    logger.error('Error fetching agents:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch agents',
      message: error.message 
    });
  }
});

// Modify the send message endpoint to handle GA4 authentication and account ID
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, message, webhookUrl, ga4Token, isGoogleAnalyticsAgent, ga4AccountId } = req.body;
    
    if (!conversationId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Fetch the conversation to get the agent webhook URL if not provided
    let conversation = await AssistantConversation.findOne({
      user: req.user._id,
      conversationId
    });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    // Determine the webhook URL to use
    let targetWebhookUrl = webhookUrl;
    
    // If no webhook URL provided, try to get it from the conversation
    if (!targetWebhookUrl && conversation.agent?.webhookUrl) {
      targetWebhookUrl = conversation.agent.webhookUrl;
    }
    
    // If still no webhook URL, use the default from environment variables
    if (!targetWebhookUrl) {
      targetWebhookUrl = process.env.N8N_DEFAULT_ASSISTANT_WEBHOOK;
    }
    
    // If no webhook URL available, return error
    if (!targetWebhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'No webhook URL available for this conversation'
      });
    }
    
    // Check for GA4 account ID - prioritize the one from the request, then from the conversation
    const accountId = ga4AccountId || conversation.agent?.ga4AccountId;
    
    // Log the account ID for debugging
    logger.info('GA4 Account ID check:', {
      requestAccountId: ga4AccountId,
      conversationAccountId: conversation.agent?.ga4AccountId,
      finalAccountId: accountId,
      isGoogleAnalyticsAgent,
      conversationAgent: conversation.agent
    });
    
    // Add the user message to the conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date();
    await conversation.save();
    
    // Use AbortController to set a timeout
    const controller = new AbortController();
    
    // Set a longer timeout for Google Analytics requests
    const timeoutDuration = isGoogleAnalyticsAgent ? 8 * 60 * 1000 : 3 * 60 * 1000; // 8 minutes for GA4, 3 minutes for others
    logger.info(`Setting request timeout: ${timeoutDuration/1000} seconds for ${isGoogleAnalyticsAgent ? 'GA4' : 'standard'} request`);
    
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    // Prepare webhook request payload
    let requestPayload = {
      conversationId,
      message,
      userId: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email
    };
    
    // Add GA4 account ID if available
    if (isGoogleAnalyticsAgent && accountId) {
      requestPayload.ga4AccountId = accountId.trim();
      
      // Log the account ID for debugging
      logger.info('Including GA4 account ID in request payload:', { 
        ga4AccountId: accountId,
        isEmptyString: accountId === '',
        trimmed: accountId.trim()
      });
    }
    
    // Add conversation history if available
    if (conversation.messages.length > 0) {
      requestPayload.history = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    }
    
    // For normal webhook handling (non-async agents)
    try {
      let responseData;
      
      // Add special handling for BigQuery agent - use asynchronous callback pattern
      if (conversation.agent?.name === 'BigQuery Agent') {
        logger.info('Processing BigQuery request asynchronously', {
          conversationId
        });
        
        // Create a placeholder response message
        const processingMessage = {
          role: 'assistant',
          content: 'Processing your BigQuery request...',
          timestamp: new Date()
        };
        
        // Add the processing message to the conversation
        conversation.messages.push(processingMessage);
        conversation.updatedAt = new Date();
        await conversation.save();
        
        // Use production URL for callbacks in all environments
        const forcedBaseUrl = 'https://bolt.vertodigital.com';
        
        // Create callback URLs that n8n can use directly - simplified for better compatibility
        const callbackUrlWithQuery = `${forcedBaseUrl}/api/assistant/bigquery/callback?conversationId=${conversationId}`;
        const callbackUrlWithPath = `${forcedBaseUrl}/api/assistant/bigquery/callback/${conversationId}`;
        
        // Add callback URLs to the payload
        const callbackPayload = {
          ...requestPayload,
          callbackUrl: callbackUrlWithPath,
          callbackUrlWithQuery,
          conversationId, // Add explicitly at the top level for easier access
          useCallback: true,
          messageNumber: Math.max(1, conversation.messages.length - 1) // Fix messageNumber to be 1 for first message
        };
        
        // Start a background process to send the request to n8n
        (async () => {
          try {
            // Get the direct n8n webhook URL from environment variables
            const n8nUrl = process.env.N8N_BIGQUERY;
            
            if (!n8nUrl) {
              throw new Error('N8N_BIGQUERY environment variable is not set');
            }
            
            // Make a direct request to the n8n webhook URL
            const response = await fetch(n8nUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Request-Timeout': '300' // Request 300 seconds timeout
              },
              body: JSON.stringify(callbackPayload)
            });
            
            if (!response.ok) {
              throw new Error(`N8N responded with status: ${response.status}`);
            }
            
            logger.info('Successfully sent BigQuery request asynchronously', {
              conversationId,
              n8nUrl,
              callbackUrlWithPath,
              callbackUrlWithQuery,
              messageNumber: callbackPayload.messageNumber
            });
          } catch (error) {
            logger.error('Background BigQuery request failed:', error, {
              conversationId
            });
            
            // Update the conversation with error
            try {
              const errorMessage = {
                role: 'assistant',
                content: `Error sending request to BigQuery: ${error.message}`,
                timestamp: new Date()
              };
              
              // Find and replace the processing message
              const updatedConversation = await AssistantConversation.findOne({ conversationId });
              if (updatedConversation) {
                const processingIndex = updatedConversation.messages.findIndex(
                  msg => msg.role === 'assistant' && msg.content === 'Processing your BigQuery request...'
                );
                
                if (processingIndex !== -1) {
                  updatedConversation.messages[processingIndex] = errorMessage;
                } else {
                  updatedConversation.messages.push(errorMessage);
                }
                
                updatedConversation.updatedAt = new Date();
                await updatedConversation.save();
              }
            } catch (dbError) {
              logger.error('Failed to update conversation with error message:', dbError);
            }
          }
        })();
        
        // Return the conversation with the processing message
        return res.json({
          success: true,
          response: processingMessage.content,
          updatedConversation: conversation
        });
      }
      // Check if this is a Google Analytics 4 agent and implement async pattern
      else if (conversation.agent?.name === 'Google Analytics 4') {
        logger.info('Processing Google Analytics 4 request asynchronously', {
          conversationId
        });
        
        // Create a placeholder response message
        const processingMessage = {
          role: 'assistant',
          content: 'Processing your Google Analytics request...',
          timestamp: new Date()
        };
        
        // Add the processing message to the conversation
        conversation.messages.push(processingMessage);
        conversation.updatedAt = new Date();
        await conversation.save();
        
        // Use production URL for callbacks in all environments
        const forcedBaseUrl = 'https://bolt.vertodigital.com';
        const callbackUrl = `${forcedBaseUrl}/api/analytics/ga4/callback?conversationId=${conversationId}`;
        const callbackUrlWithPath = `${forcedBaseUrl}/api/analytics/ga4/callback/${conversationId}`;
        const statusUrl = `${forcedBaseUrl}/api/analytics/ga4/status/${conversationId}`;
        
        // Add the useCallback flag to the payload - simplify structure for n8n
        const asyncPayload = {
          message: requestPayload.message,
          conversationId,
          userId: requestPayload.userId,
          accessToken: ga4Token,
          ga4AccountId: accountId || '',
          history: requestPayload.history,
          useCallback: true,
          callbackUrl,
          callbackUrlWithPath, // Add path-based URL as an alternative
          messageNumber: Math.max(1, conversation.messages.length - 1) // Fix messageNumber to be 1 for first message
        };
        
        // Start a background process to send the request to n8n
        (async () => {
          try {
            // Get the direct n8n webhook URL from environment variables
            const n8nUrl = process.env.N8N_GOOGLE_ANALYTICS_4;
            
            if (!n8nUrl) {
              throw new Error('N8N_GOOGLE_ANALYTICS_4 environment variable is not set');
            }
            
            // Log the request details for debugging
            logger.info('Sending GA4 request to n8n:', {
              hasToken: !!ga4Token,
              tokenType: typeof ga4Token,
              tokenLength: ga4Token ? ga4Token.length : 0,
              n8nUrl,
              callbackUrl,
              callbackUrlWithPath,
              statusUrl,
              messageNumber: asyncPayload.messageNumber
            });
            
            // Use axios instead of fetch for better Node.js compatibility
            const axiosResponse = await axios.post(n8nUrl, asyncPayload, {
              headers: {
                'Content-Type': 'application/json',
                'X-Request-Timeout': '300', // Request 300 seconds timeout
                'User-Agent': 'VertoDigital/AI-Assistant/1.0'
              },
              timeout: 60000 // 60 second connection timeout
            });
            
            logger.info('Successfully sent GA4 request asynchronously with callback', {
              conversationId,
              n8nUrl,
              callbackUrl,
              callbackUrlWithPath,
              statusUrl,
              messageNumber: asyncPayload.messageNumber,
              responseStatus: axiosResponse.status
            });
          } catch (error) {
            logger.error('Background GA4 request failed:', error, {
              conversationId
            });
            
            // Update the conversation with error
            try {
              // Format the error message to be more user-friendly
              let errorMessage = {
                role: 'assistant',
                content: 'Error sending request to Google Analytics. ',
                timestamp: new Date()
              };
              
              // Add more helpful details based on the error
              if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
                errorMessage.content += 'Could not connect to the analytics service. Please try again later.';
              } else if (error.message.includes('status: 401') || error.message.includes('status: 403')) {
                errorMessage.content += 'Authentication error. Please re-authenticate with Google Analytics.';
              } else if (error.message.includes('status: 404')) {
                errorMessage.content += 'The analytics service endpoint was not found. Please contact support.';
              } else if (error.message.includes('status: 500')) {
                errorMessage.content += 'The analytics service encountered an internal error. Please try again later.';
              } else {
                errorMessage.content += `Error details: ${error.message}`;
              }
              
              // Find and replace the processing message
              const updatedConversation = await AssistantConversation.findOne({ conversationId });
              if (updatedConversation) {
                const processingIndex = updatedConversation.messages.findIndex(
                  msg => msg.role === 'assistant' && msg.content === 'Processing your Google Analytics request...'
                );
                
                logger.info('Updating conversation with error message:', {
                  conversationId,
                  foundProcessingMessage: processingIndex !== -1,
                  errorMessage: errorMessage.content
                });
                
                if (processingIndex !== -1) {
                  updatedConversation.messages[processingIndex] = errorMessage;
                } else {
                  updatedConversation.messages.push(errorMessage);
                }
                
                updatedConversation.updatedAt = new Date();
                await updatedConversation.save();
                
                logger.info('Successfully updated conversation with error message', {
                  conversationId
                });
              }
            } catch (dbError) {
              logger.error('Failed to update conversation with error message:', dbError);
            }
          }
        })();
        
        // Return the conversation with the processing message
        return res.json({
          success: true,
          response: processingMessage.content,
          updatedConversation: conversation
        });
      }
      // For all other agents - use synchronous approach
      else {
        // Check if this is a Google Analytics 4 agent request (for direct handling)
        if (isGoogleAnalyticsAgent) {
          // Include token if available
          if (ga4Token) {
            requestPayload.accessToken = ga4Token;
          }
          
          // Log the GA4 request details
          logger.info('Sending GA4 request via axios', { 
            hasToken: !!ga4Token,
            hasAccountId: !!accountId,
            targetWebhookUrl
          });
          
          // Use axios for GA4 requests to avoid fetch issues
          const axiosResponse = await axios.post(targetWebhookUrl, requestPayload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Timeout': '420', // 7 minutes timeout
              'User-Agent': 'VertoDigital/AI-Assistant/1.0'
            },
            timeout: 8 * 60 * 1000 // 8 minute connection timeout
          });
          
          responseData = axiosResponse.data;
          
          logger.info('Received GA4 axios response', {
            status: axiosResponse.status,
            contentType: axiosResponse.headers['content-type'],
            dataType: typeof responseData
          });
        } 
        else {
          // For non-GA4 agents - use fetch
          // Ensure webhook URL is absolute
          if (targetWebhookUrl.startsWith('/')) {
            targetWebhookUrl = `${process.env.BACKEND_URL}${targetWebhookUrl}`;
            logger.info(`Converted relative webhook URL to absolute: ${targetWebhookUrl}`);
          }
          
          // Send message to webhook
          const webhookResponse = await fetch(targetWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Timeout': '300' // 5 minutes timeout
            },
            body: JSON.stringify(requestPayload),
            signal: controller.signal
          });
          
          // Log response info
          logger.info('Received webhook response:', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            contentType: webhookResponse.headers.get('content-type')
          });
          
          // Check for error status
          if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            logger.error(`Webhook error status: ${webhookResponse.status}`, {
              statusText: webhookResponse.statusText,
              errorPreview: errorText.substring(0, 500)
            });
            throw new Error(`Webhook responded with status: ${webhookResponse.status} - ${errorText}`);
          }
          
          // Get response content
          const responseText = await webhookResponse.text();
          
          // Log response preview
          logger.info('Raw webhook response:', {
            length: responseText.length,
            preview: responseText.substring(0, 200)
          });
          
          // Try to parse as JSON
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            logger.error('JSON parse error:', parseError.message);
            responseData = responseText; // Use raw text if not JSON
          }
        }
        
        // Clear the request timeout
        clearTimeout(timeoutId);
        
        // Add assistant response to conversation
        const assistantMessage = {
          role: 'assistant',
          content: extractResponseContent(responseData),
          timestamp: new Date()
        };
        
        conversation.messages.push(assistantMessage);
        conversation.updatedAt = new Date();
        await conversation.save();
        
        // Return success response
        return res.json({
          success: true,
          response: assistantMessage.content,
          updatedConversation: conversation
        });
      }
    } 
    catch (webhookError) {
      // Clear timeout and handle error
      clearTimeout(timeoutId);
      logger.error('Webhook request error:', webhookError);
      
      // Add error message to conversation
      const errorMessage = {
        role: 'assistant',
        content: `I'm sorry, I encountered an error while processing your request. ${webhookError.message}`,
        timestamp: new Date()
      };
      
      conversation.messages.push(errorMessage);
      conversation.updatedAt = new Date();
      await conversation.save();
      
      // Return error response
      return res.status(500).json({
        success: false,
        error: 'Failed to process message via webhook',
        message: webhookError.message,
        updatedConversation: conversation
      });
    }
  } catch (error) {
    logger.error('Error in assistant message endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message',
      message: error.message
    });
  }
});

/**
 * Extracts content from various response formats
 * @param {Object|Array|string} responseData - The response data from the webhook
 * @returns {string} - The extracted content
 */
function extractResponseContent(responseData) {
  try {
    // Log the response structure for debugging
    logger.info('Extracting content from webhook response:', {
      type: typeof responseData,
      isArray: Array.isArray(responseData),
      isNull: responseData === null,
      isUndefined: responseData === undefined,
      structure: responseData === null || responseData === undefined ? 'empty' : 
        typeof responseData === 'object' ? 
          (Array.isArray(responseData) ? 
            `Array[${responseData.length}]` : 
            `Object with keys: ${Object.keys(responseData).join(', ')}`) : 
          typeof responseData
    });
    
    // Handle null or undefined
    if (responseData === null || responseData === undefined) {
      logger.warn('Received null or undefined response from webhook');
      return 'No response content received from the webhook';
    }
    
    // If it's a simple string, return it
    if (typeof responseData === 'string') {
      return responseData;
    }
    
    // If it's an array with objects
    if (Array.isArray(responseData)) {
      if (responseData.length === 0) {
        return 'No data returned from the query';
      }
      
      // Special case for GA4 response format which sometimes returns an array of objects
      if (responseData.length > 0) {
        const firstItem = responseData[0];
        
        // Check for common fields in the first item
        if (firstItem && typeof firstItem === 'object') {
          // Common field names in various webhook responses
          const possibleFields = ['output', 'response', 'content', 'text', 'message', 'result'];
          
          for (const field of possibleFields) {
            if (firstItem[field] !== undefined) {
              return firstItem[field];
            }
          }
          
          // If no specific field is found but the object can be converted to string
          if (firstItem.toString && firstItem.toString() !== '[object Object]') {
            return firstItem.toString();
          }
        }
      }
      
      // If we couldn't extract from a specific field, join the array items
      try {
        return responseData.map(item => 
          typeof item === 'object' ? 
            (item === null ? 'null' : JSON.stringify(item)) : 
            String(item)
        ).join('\n');
      } catch (e) {
        logger.error('Error mapping array response:', e);
        return 'Error processing array response data';
      }
    }
    
    // If it's an object, look for common response fields
    if (typeof responseData === 'object') {
      // Check common field names in object responses
      const possibleFields = ['response', 'content', 'output', 'text', 'message', 'result', 'data'];
      
      for (const field of possibleFields) {
        if (responseData[field] !== undefined) {
          // If the field is an object or array, stringify it
          if (typeof responseData[field] === 'object') {
            try {
              return JSON.stringify(responseData[field], null, 2);
            } catch (e) {
              logger.error(`Error stringifying responseData.${field}:`, e);
            }
          } else {
            return String(responseData[field]);
          }
        }
      }
      
      // If no common fields found, try to stringify the entire object
      try {
        return JSON.stringify(responseData, null, 2);
      } catch (e) {
        logger.error('Error stringifying entire response data:', e);
      }
    }
    
    // Fallback if nothing is found or if there's an error
    return 'No recognized response format found';
  } catch (error) {
    logger.error('Error extracting response content:', error);
    return 'Error processing response from webhook';
  }
}

// Rename a conversation session
router.patch('/conversations/:conversationId/rename', isAuthenticated, async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation title is required' 
      });
    }
    
    const conversation = await AssistantConversation.findOne({ 
      conversationId: req.params.conversationId,
      user: req.user._id 
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation session not found' 
      });
    }
    
    conversation.title = title;
    await conversation.save();
    
    res.json({ 
      success: true, 
      conversation 
    });
  } catch (error) {
    logger.error('Error renaming conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to rename conversation session',
      message: error.message 
    });
  }
});

// Archive/Unarchive a conversation session
router.patch('/conversations/:conversationId/archive', isAuthenticated, async (req, res) => {
  try {
    const { isArchived } = req.body;
    
    if (isArchived === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'isArchived field is required' 
      });
    }
    
    const conversation = await AssistantConversation.findOne({ 
      conversationId: req.params.conversationId,
      user: req.user._id 
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation session not found' 
      });
    }
    
    conversation.isArchived = isArchived;
    await conversation.save();
    
    res.json({ 
      success: true, 
      conversation 
    });
  } catch (error) {
    logger.error('Error archiving/unarchiving conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to archive/unarchive conversation session',
      message: error.message 
    });
  }
});

// Delete a conversation session
router.delete('/conversations/:conversationId', isAuthenticated, async (req, res) => {
  try {
    const result = await AssistantConversation.deleteOne({ 
      conversationId: req.params.conversationId,
      user: req.user._id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation session not found or already deleted' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Conversation session deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete conversation session',
      message: error.message 
    });
  }
});

// Template-related routes

// Get all templates (public and user's private templates)
router.get('/templates', isAuthenticated, async (req, res) => {
  try {
    const templates = await AssistantTemplate.find({ 
      $or: [
        { user: req.user._id },
        { isPublic: true }
      ]
    }).sort({ updatedAt: -1 });
    
    res.json({ success: true, templates });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch templates',
      message: error.message 
    });
  }
});

// Get a specific template
router.get('/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await AssistantTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }
    
    // Check if the template is public or belongs to the user
    if (!template.isPublic && !template.user.equals(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to access this template' 
      });
    }
    
    res.json({ success: true, template });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch template',
      message: error.message 
    });
  }
});

// Create a new template
router.post('/templates', isAuthenticated, async (req, res) => {
  try {
    const { title, content, variables, isPublic } = req.body;
    
    // Perform basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Validate variables format
    if (variables && Array.isArray(variables)) {
      for (const variable of variables) {
        if (!variable.name) {
          return res.status(400).json({ error: 'All variables must have a name' });
        }
        
        if (!['text', 'multiChoice', 'date', 'dateRange'].includes(variable.type)) {
          return res.status(400).json({ error: 'Invalid variable type' });
        }
        
        // If the variable type is multiChoice, ensure options is an array
        if (variable.type === 'multiChoice' && (!Array.isArray(variable.options) || variable.options.length === 0)) {
          return res.status(400).json({ error: 'MultiChoice variables must have options' });
        }
        
        // Validate uiType if provided
        if (variable.uiType && !['select', 'multiChoice'].includes(variable.uiType)) {
          return res.status(400).json({ error: 'Invalid UI type' });
        }
      }
    }
    
    // Create new template
    const template = new AssistantTemplate({
      title,
      content,
      variables: variables || [],
      isPublic: !!isPublic,
      user: req.user._id
    });
    
    await template.save();
    
    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
router.put('/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const { title, content, variables, isPublic } = req.body;
    
    // Perform basic validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    // Find the template and check ownership
    const template = await AssistantTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Check if the user owns the template or if they're admin
    if (template.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to update this template' });
    }
    
    // Validate variables format
    if (variables && Array.isArray(variables)) {
      for (const variable of variables) {
        if (!variable.name) {
          return res.status(400).json({ error: 'All variables must have a name' });
        }
        
        if (!['text', 'multiChoice', 'date', 'dateRange'].includes(variable.type)) {
          return res.status(400).json({ error: 'Invalid variable type' });
        }
        
        // If the variable type is multiChoice, ensure options is an array
        if (variable.type === 'multiChoice' && (!Array.isArray(variable.options) || variable.options.length === 0)) {
          return res.status(400).json({ error: 'MultiChoice variables must have options' });
        }
        
        // Validate uiType if provided
        if (variable.uiType && !['select', 'multiChoice'].includes(variable.uiType)) {
          return res.status(400).json({ error: 'Invalid UI type' });
        }
      }
    }
    
    // Update the template
    template.title = title;
    template.content = content;
    template.variables = variables || [];
    template.isPublic = !!isPublic;
    template.updatedAt = Date.now();
    
    await template.save();
    
    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
router.delete('/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await AssistantTemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ 
        success: false, 
        error: 'Template not found' 
      });
    }
    
    // Check if the template belongs to the user
    if (!template.user.equals(req.user._id)) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to delete this template' 
      });
    }
    
    await AssistantTemplate.deleteOne({ _id: req.params.id });
    
    res.json({ 
      success: true, 
      message: 'Template deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete template',
      message: error.message 
    });
  }
});

// Export conversation session as PDF
router.get('/conversations/:conversationId/export', isAuthenticated, async (req, res) => {
  try {
    const conversation = await AssistantConversation.findOne({ 
      conversationId: req.params.conversationId,
      user: req.user._id 
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false, 
        error: 'Conversation session not found' 
      });
    }
    
    // Import required modules for PDF generation
    const PDFDocument = require('pdfkit');
    const { format } = require('date-fns');
    
    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=conversation-${conversation.conversationId}.pdf`);
    
    // Pipe the PDF to the response
    doc.pipe(res);
    
    // Add document title
    doc.fontSize(20).text(`Conversation: ${conversation.title}`, { align: 'center' });
    doc.moveDown();
    
    // Add creation date
    doc.fontSize(10).text(`Created: ${format(new Date(conversation.createdAt), 'PPpp')}`, { align: 'center' });
    doc.moveDown(2);
    
    // Add messages
    conversation.messages.forEach(msg => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      const roleColor = msg.role === 'user' ? '#0066cc' : '#006633';
      
      doc.fontSize(10)
        .fillColor(roleColor)
        .text(`${role} - ${format(new Date(msg.timestamp), 'PPpp')}:`);
      
      doc.fontSize(12)
        .fillColor('black')
        .text(msg.content, { width: 500 });
      
      doc.moveDown();
    });
    
    // Finalize the PDF
    doc.end();
  } catch (error) {
    logger.error('Error exporting conversation session:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export conversation session',
      message: error.message 
    });
  }
});

// Add a route to handle callback with conversation ID in path
router.post('/bigquery/callback/:conversationId', express.text({ type: '*/*' }), async (req, res) => {
  try {
    // Log that we hit this endpoint
    logger.info('Received BigQuery callback with path param:', {
      conversationId: req.params.conversationId,
      url: req.originalUrl,
      method: req.method
    });
    
    // Add the conversation ID to the query params
    req.query.conversationId = req.params.conversationId;
    
    // Get raw content from request body
    let rawContent = req.body;
    let contentType = req.headers['content-type'] || 'text/plain';
    
    logger.info('Processing path param callback with details:', {
      contentType,
      contentLength: typeof rawContent === 'string' ? rawContent.length : 'unknown',
      contentPreview: typeof rawContent === 'string' ? rawContent.substring(0, 200) + '...' : 'not a string'
    });
    
    // Extract the conversation ID from params
    let conversationId = req.params.conversationId;
    
    if (!conversationId) {
      logger.error('No conversation ID found in request params');
      throw new Error('No conversation ID provided in BigQuery callback URL path');
    }

    // Find the conversation
    const conversation = await AssistantConversation.findOne({ conversationId });

    if (!conversation) {
      logger.error(`Conversation with ID ${conversationId} not found`);
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Process the content and extract the actual response
    let responseContent = '';
    
    if (typeof rawContent === 'object' && rawContent !== null) {
      // It's already parsed JSON
      responseContent = extractResponseContent(rawContent);
    } else if (typeof rawContent === 'string') {
      // Try to parse as JSON first
      try {
        const parsedContent = JSON.parse(rawContent);
        responseContent = extractResponseContent(parsedContent);
      } catch (parseError) {
        // If parsing fails, use the raw content
        responseContent = rawContent;
      }
    } else {
      responseContent = 'Received callback with unknown content format';
    }

    logger.info('Processed response content from path param callback:', {
      conversationId,
      contentLength: typeof responseContent === 'string' ? responseContent.length : 'not a string',
      contentPreview: typeof responseContent === 'string' ? responseContent.substring(0, 200) : 'not a string'
    });

    // Update the conversation with the response
    // Find the last message with "Processing..." content
    const processingMessageIndex = conversation.messages.findIndex(
      msg => msg.role === 'assistant' && msg.content === 'Processing your BigQuery request...'
    );

    if (processingMessageIndex !== -1) {
      // Replace the processing message with the actual response
      conversation.messages[processingMessageIndex] = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
    } else {
      // If no processing message found, add a new assistant message
      conversation.messages.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      });
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    logger.info('Successfully updated conversation with path-based BigQuery callback', {
      conversationId,
      responseLength: typeof responseContent === 'string' ? responseContent.length : 'not a string'
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'BigQuery response processed successfully via path param',
      conversationId
    });
  } catch (error) {
    logger.error('Error in path parameter handler:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle BigQuery callback',
      error: error.message
    });
  }
});

// Add endpoint to check BigQuery response status
router.get('/bigquery/status/:conversationId', isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing conversation ID'
      });
    }
    
    // Find the conversation
    const conversation = await AssistantConversation.findOne({
      conversationId,
      user: req.user._id
    });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    // Check if there's a processing message
    const isProcessing = conversation.messages.some(
      msg => msg.role === 'assistant' && msg.content === 'Processing your BigQuery request...'
    );
    
    if (isProcessing) {
      return res.json({
        success: true,
        status: 'processing',
        message: 'Your BigQuery request is still being processed.'
      });
    } else {
      // Get the last assistant message as the response
      const lastAssistantMessage = [...conversation.messages]
        .reverse()
        .find(msg => msg.role === 'assistant');
      
      return res.json({
        success: true,
        status: 'completed',
        message: lastAssistantMessage ? lastAssistantMessage.content : 'No response available.'
      });
    }
  } catch (error) {
    logger.error('Error checking BigQuery status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check BigQuery status',
      message: error.message
    });
  }
});

// Add a callback endpoint for BigQuery responses from n8n (query param version)
router.post('/bigquery/callback', express.text({ type: '*/*' }), async (req, res) => {
  try {
    // Get raw content from request body
    let rawContent = req.body;
    let contentType = req.headers['content-type'] || 'text/plain';
    
    logger.info('Received BigQuery callback (query param version):', {
      contentType,
      contentLength: typeof rawContent === 'string' ? rawContent.length : 'unknown',
      contentPreview: typeof rawContent === 'string' ? rawContent.substring(0, 200) + '...' : 'not a string',
      url: req.originalUrl,
      path: req.path,
      query: req.query,
      baseUrl: req.baseUrl,
      method: req.method,
      headers: req.headers
    });
    
    // Extract the conversation ID from query params
    let conversationId = req.query.conversationId;
    
    // If it's JSON content, try to parse and get conversationId from body
    if (contentType.includes('application/json') && typeof rawContent === 'string') {
      try {
        const jsonContent = JSON.parse(rawContent);
        logger.info('Parsed JSON content:', {
          hasConversationId: !!jsonContent.conversationId,
          contentKeys: Object.keys(jsonContent),
          bodyPreview: JSON.stringify(jsonContent).substring(0, 200)
        });
        
        if (!conversationId && jsonContent.conversationId) {
          conversationId = jsonContent.conversationId;
          logger.info('Extracted conversationId from JSON body:', { conversationId });
          rawContent = jsonContent; // Use the parsed JSON for later processing
        }
        
        // Try to extract from nested structures that n8n might send
        if (!conversationId && jsonContent.body && typeof jsonContent.body === 'object') {
          if (jsonContent.body.conversationId) {
            conversationId = jsonContent.body.conversationId;
            logger.info('Extracted conversationId from JSON body.body.conversationId:', { conversationId });
          }
        }
        
        // Check if this is an n8n webhook payload
        if (!conversationId && jsonContent.body) {
          // n8n often uses this structure for variables from previous nodes
          // Check if using raw format with {{ $('Webhook').item.json.body.conversationId }}
          const jsonString = JSON.stringify(jsonContent);
          
          // Try to extract conversationId from common n8n template patterns
          const n8nTemplateMatch = jsonString.match(/conversationId['"]*\s*:\s*['"]*([a-f0-9-]+)['"]*/) ||
                                   jsonString.match(/conversationId=([a-f0-9-]+)/) ||
                                   jsonString.match(/[\/\?]([a-f0-9-]{36})/);
          
          if (n8nTemplateMatch && n8nTemplateMatch[1]) {
            conversationId = n8nTemplateMatch[1];
            logger.info('Extracted conversationId from n8n template pattern:', { conversationId, matchPattern: n8nTemplateMatch[0] });
          }
        }
      } catch (parseError) {
        logger.error('Error parsing JSON content in BigQuery callback:', parseError);
        // Continue with raw content
      }
    }
    
    // Last resort - try to find a conversationId pattern in the raw string
    if (!conversationId && typeof rawContent === 'string') {
      // Check if the raw content contains a UUID pattern
      const uuidMatch = rawContent.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (uuidMatch) {
        conversationId = uuidMatch[1];
        logger.info('Extracted conversationId from UUID pattern in raw content:', { conversationId });
      }
    }
    
    if (!conversationId) {
      logger.error('No conversation ID found in request:', { 
        body: typeof rawContent === 'string' ? rawContent.substring(0, 500) : 'non-string body',
        query: req.query,
        path: req.path
      });
      throw new Error('No conversation ID provided in BigQuery callback');
    }

    // Find the conversation
    const conversation = await AssistantConversation.findOne({ conversationId });

    if (!conversation) {
      logger.error(`Conversation with ID ${conversationId} not found`);
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Process the content and extract the actual response
    let responseContent = '';
    
    if (typeof rawContent === 'object' && rawContent !== null) {
      // It's already parsed JSON
      responseContent = extractResponseContent(rawContent);
    } else if (typeof rawContent === 'string') {
      // Try to parse as JSON first
      try {
        const parsedContent = JSON.parse(rawContent);
        responseContent = extractResponseContent(parsedContent);
      } catch (parseError) {
        // If parsing fails, use the raw content
        responseContent = rawContent;
      }
    } else {
      responseContent = 'Received callback with unknown content format';
    }

    logger.info('Processed response content:', {
      conversationId,
      contentLength: typeof responseContent === 'string' ? responseContent.length : 'not a string',
      contentPreview: typeof responseContent === 'string' ? responseContent.substring(0, 200) : 'not a string'
    });

    // Update the conversation with the response
    // Find the last message with "Processing..." content
    const processingMessageIndex = conversation.messages.findIndex(
      msg => msg.role === 'assistant' && msg.content === 'Processing your BigQuery request...'
    );
    
    logger.info('Processing message search result:', {
      foundProcessingMessage: processingMessageIndex !== -1,
      processingIndex: processingMessageIndex,
      messagesCount: conversation.messages.length
    });

    if (processingMessageIndex !== -1) {
      // Replace the processing message with the actual response
      conversation.messages[processingMessageIndex] = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
    } else {
      // If no processing message found, add a new assistant message
      conversation.messages.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      });
    }

    conversation.updatedAt = new Date();
    await conversation.save();

    logger.info('Successfully updated conversation with BigQuery callback response', {
      conversationId,
      responseLength: typeof responseContent === 'string' ? responseContent.length : 'not a string'
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'BigQuery response processed successfully',
      conversationId
    });

  } catch (error) {
    logger.error('Error handling BigQuery callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle BigQuery callback',
      error: error.message
    });
  }
});

module.exports = router; 