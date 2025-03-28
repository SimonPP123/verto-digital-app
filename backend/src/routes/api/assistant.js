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
          description: conversationData.agent.description || 'Default agent'
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
          description: conversationData.agent.description || 'Default agent'
        } : undefined
      });
    }
    
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

// Modify the send message endpoint to handle GA4 authentication
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, message, webhookUrl, ga4Token, isGoogleAnalyticsAgent } = req.body;
    
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
    
    logger.info(`Sending message to webhook: ${targetWebhookUrl} for conversation: ${conversationId}`);
    
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
        logger.info('Processing Google Analytics 4 query directly');
        
        // Use direct function call instead of HTTP request
        responseData = await processAnalyticsQuery({
          ...requestPayload,
          accessToken: ga4Token
        });
      } else {
        // For all other cases, continue with normal webhook request
        
        // If this is a Google Analytics 4 agent and we have a token, include it
        if (isGoogleAnalyticsAgent && ga4Token) {
          requestPayload.accessToken = ga4Token;
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
        
        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          logger.error(`Webhook responded with status: ${webhookResponse.status}`, {
            statusText: webhookResponse.statusText,
            errorText,
            targetWebhookUrl
          });
          throw new Error(`Webhook responded with status: ${webhookResponse.status} - ${errorText}`);
        }
        
        responseData = await webhookResponse.json();
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
 * @param {Object|Array} responseData - The response data from the webhook
 * @returns {string} - The extracted content
 */
function extractResponseContent(responseData) {
  // If it's a simple string, return it
  if (typeof responseData === 'string') {
    return responseData;
  }
  
  // If it's an array with objects that have an 'output' field (GA4 format)
  if (Array.isArray(responseData) && responseData.length > 0) {
    const firstItem = responseData[0];
    if (firstItem && typeof firstItem === 'object') {
      if (firstItem.output) return firstItem.output;
      if (firstItem.response) return firstItem.response;
      if (firstItem.content) return firstItem.content;
    }
    // If it's an array of strings or simple values, join them
    return responseData.map(item => 
      typeof item === 'object' ? JSON.stringify(item) : String(item)
    ).join('\n');
  }
  
  // If it's an object, look for common response fields
  if (responseData && typeof responseData === 'object') {
    if (responseData.response) return responseData.response;
    if (responseData.content) return responseData.content;
    if (responseData.output) return responseData.output;
    if (responseData.text) return responseData.text;
    if (responseData.message) return responseData.message;
    
    // If no common fields found, stringify the object
    try {
      return JSON.stringify(responseData, null, 2);
    } catch (e) {
      logger.error('Error stringifying response data:', e);
    }
  }
  
  // Fallback if nothing is found
  return 'No response content';
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