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

// Send a message to the webhook and get a response
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    
    if (!conversationId || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Conversation ID and message are required' 
      });
    }
    
    // Get the current conversation or create a new one
    let conversation = await AssistantConversation.findOne({ 
      conversationId,
      user: req.user._id 
    });
    
    if (!conversation) {
      conversation = new AssistantConversation({
        conversationId,
        title: 'New Conversation',
        user: req.user._id,
        messages: []
      });
    }
    
    // Add user message to the conversation
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    conversation.messages.push(userMessage);
    await conversation.save();
    
    // Use the agent's webhook URL if available, or fall back to the default
    const webhookEndpoint = conversation.agent?.webhookUrl || process.env.N8N_BIGQUERY || 'https://nn.vertodigital.com:5678/webhook/ampeco-bigquery';
    
    logger.info(`Sending message to webhook: ${webhookEndpoint}`);
    
    // Set a timeout of 3 minutes (180000 ms)
    const timeoutDuration = 180000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    try {
      const webhookResponse = await axios.post(
        webhookEndpoint, 
        { 
          message, 
          conversationId, 
          userId: req.user._id, 
          messageNumber: conversation.messages.filter(msg => msg.role === 'user').length,
          agent: conversation.agent?.name || 'BigQuery Agent'
        }, 
        { 
          signal: controller.signal,
          timeout: timeoutDuration,
          validateStatus: status => true // Accept any status code to handle errors ourselves
        }
      );
      
      clearTimeout(timeoutId); // Clear the timeout
      
      // Check for non-200 status codes
      if (webhookResponse.status !== 200) {
        throw {
          response: {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            data: {
              message: typeof webhookResponse.data === 'string' 
                ? webhookResponse.data 
                : 'Non-200 status code received from webhook'
            }
          }
        };
      }
      
      // Extract the assistant's response from the webhook response
      let responseContent = 'Sorry, I received an empty response.';
      
      // Check if the response is valid
      if (typeof webhookResponse.data === 'string') {
        // String response - use directly
        responseContent = webhookResponse.data;
      }
      // Check if the response is an array with at least one item
      else if (Array.isArray(webhookResponse.data) && webhookResponse.data.length > 0) {
        // Check if the first item has an output field
        if (webhookResponse.data[0].output) {
          responseContent = webhookResponse.data[0].output;
        }
      } 
      // Also check for the response field format as a fallback
      else if (webhookResponse.data && webhookResponse.data.response) {
        responseContent = webhookResponse.data.response;
      }
      
      // Add assistant response to the conversation
      const assistantMessage = {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };
      
      conversation.messages.push(assistantMessage);
      await conversation.save();
      
      res.json({ 
        success: true, 
        response: assistantMessage.content,
        conversationId: conversation.conversationId
      });
    } catch (webhookError) {
      clearTimeout(timeoutId);
      
      // Handle timeout or other webhook errors
      logger.error('Webhook error:', webhookError);
      
      let errorMessage = 'An error occurred while processing your request.';
      let errorDetails = '';
      
      if (webhookError.code === 'ECONNABORTED' || webhookError.name === 'AbortError') {
        errorMessage = 'Request timed out after 3 minutes. Please try again.';
        errorDetails = 'The webhook took too long to respond.';
      } else if (webhookError.response) {
        errorMessage = `Error: ${webhookError.response.status} ${webhookError.response.statusText}`;
        errorDetails = webhookError.response.data?.message || 'No additional details provided by the server.';
      } else if (webhookError.request) {
        errorMessage = 'No response received from the server.';
        errorDetails = 'The request was made but no response was received.';
      } else {
        errorDetails = webhookError.message;
      }
      
      // Add error message to the conversation
      const errorAssistantMessage = {
        role: 'assistant',
        content: `${errorMessage} Please try again later.`,
        timestamp: new Date()
      };
      
      conversation.messages.push(errorAssistantMessage);
      await conversation.save();
      
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: errorDetails,
        conversationId: conversation.conversationId
      });
    }
  } catch (error) {
    logger.error('Error in send message route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

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