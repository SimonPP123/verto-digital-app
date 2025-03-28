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
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000); // 3 minute timeout
    
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
    
    try {
      let responseData;
      
      // Special handling for GA4 agent with internal endpoint
      if (isGoogleAnalyticsAgent && targetWebhookUrl === '/api/analytics/query') {
        logger.info('Processing Google Analytics 4 query directly', { 
          accountId,
          hasAccountId: !!accountId,
          trimmedAccountId: accountId ? accountId.trim() : null
        });
        
        // Use direct function call instead of HTTP request
        responseData = await processAnalyticsQuery({
          ...requestPayload,
          accessToken: ga4Token
        });
      } else {
        // For all other cases, continue with normal webhook request
        
        // If this is a Google Analytics 4 agent and we have a token, include it
        if (isGoogleAnalyticsAgent) {
          if (ga4Token) {
            requestPayload.accessToken = ga4Token;
          }
          
          // Log the GA4 request details (sensitive data redacted)
          logger.info('Sending GA4 request', {
            hasToken: !!ga4Token,
            hasAccountId: !!accountId,
            accountId: accountId,
            targetWebhookUrl
          });
        }
        
        // Ensure webhook URL is absolute
        if (targetWebhookUrl.startsWith('/')) {
          targetWebhookUrl = `${process.env.BACKEND_URL}${targetWebhookUrl}`;
          logger.info(`Converted relative webhook URL to absolute: ${targetWebhookUrl}`);
        }
      
        // Send the message to the webhook
        const webhookResponse = await fetch(targetWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal
        });
        
        // Log webhook response status and headers
        logger.info('Received webhook response:', {
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          contentType: webhookResponse.headers.get('content-type'),
          contentLength: webhookResponse.headers.get('content-length'),
          isGoogleAnalyticsAgent: isGoogleAnalyticsAgent,
          webhookUrl: targetWebhookUrl
        });
        
        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          logger.error(`Webhook responded with status: ${webhookResponse.status}`, {
            statusText: webhookResponse.statusText,
            errorText: errorText.substring(0, 500), // Log a larger portion of the error
            targetWebhookUrl,
            accountId,
            headers: Object.fromEntries([...webhookResponse.headers.entries()])
          });
          throw new Error(`Webhook responded with status: ${webhookResponse.status} - ${errorText}`);
        }
        
        // Get the response content, handling possible non-JSON responses
        const responseText = await webhookResponse.text();
        
        // Log the raw response for debugging
        logger.info('Raw webhook response text:', {
          length: responseText.length,
          preview: responseText.substring(0, 200),
          isGoogleAnalyticsAgent,
          contentType: webhookResponse.headers.get('content-type')
        });
        
        try {
          // Try to parse as JSON first
          responseData = JSON.parse(responseText);
          
          // Log basic structure of parsed data
          logger.info('Successfully parsed webhook response as JSON:', {
            type: typeof responseData,
            isArray: Array.isArray(responseData),
            length: Array.isArray(responseData) ? responseData.length : null,
            keys: typeof responseData === 'object' && !Array.isArray(responseData) && responseData !== null ? 
              Object.keys(responseData) : null
          });
        } catch (parseError) {
          // If response is not valid JSON, log the error and use the raw text as the response
          logger.error('Failed to parse webhook response as JSON:', {
            parseError: parseError.message,
            responsePreview: responseText.substring(0, 300), // Log more of the response for debugging
            accountId,
            contentType: webhookResponse.headers.get('content-type'),
            isGoogleAnalyticsAgent
          });
          
          // Use the raw text as response data
          responseData = responseText;
        }
      }
      
      clearTimeout(timeoutId);
      
      // Add the assistant response to the conversation
      const assistantMessage = {
        role: 'assistant',
        content: extractResponseContent(responseData),
        timestamp: new Date()
      };
      
      conversation.messages.push(assistantMessage);
      conversation.updatedAt = new Date();
      await conversation.save();
      
      // Return the response to the client
      return res.json({
        success: true,
        response: assistantMessage.content,
        updatedConversation: conversation
      });
    } catch (webhookError) {
      clearTimeout(timeoutId);
      
      // Handle webhook-specific errors
      logger.error('Webhook request error:', webhookError);
      
      // Add an error message to the conversation
      const errorMessage = {
        role: 'assistant',
        content: `I'm sorry, I encountered an error while processing your request. ${webhookError.message}`,
        timestamp: new Date()
      };
      
      conversation.messages.push(errorMessage);
      conversation.updatedAt = new Date();
      await conversation.save();
      
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
    const { error } = assistantTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request format',
        message: error.details[0].message 
      });
    }
    
    const template = new AssistantTemplate({
      title: req.body.title,
      content: req.body.content,
      variables: req.body.variables || [],
      isPublic: req.body.isPublic || false,
      user: req.user._id
    });
    
    await template.save();
    
    res.status(201).json({ 
      success: true, 
      template 
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create template',
      message: error.message 
    });
  }
});

// Update a template
router.put('/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const { error } = assistantTemplateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request format',
        message: error.details[0].message 
      });
    }
    
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
        error: 'You do not have permission to update this template' 
      });
    }
    
    template.title = req.body.title;
    template.content = req.body.content;
    template.variables = req.body.variables || [];
    template.isPublic = req.body.isPublic || false;
    
    await template.save();
    
    res.json({ 
      success: true, 
      template 
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update template',
      message: error.message 
    });
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

module.exports = router; 