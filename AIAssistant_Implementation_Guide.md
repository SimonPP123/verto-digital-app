# VertoDigital AI Assistant Implementation Guide

## Overview

This document outlines the implementation steps for creating a new AI assistant service for the VertoDigital Web Application. The service will provide a ChatGPT-like interface where users can interact with an AI assistant through a webhook integration. The service will include features for managing conversation sessions and creating prompt templates with variables.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Testing](#testing)
5. [Deployment](#deployment)

## Project Structure

### New Files to Create

#### Backend

- `backend/src/models/AssistantTemplate.js` - Model for storing prompt templates
- `backend/src/models/AssistantConversation.js` - Model for storing individual chat conversations
- `backend/src/schemas/assistantTemplateSchema.js` - Validation schema for chat templates
- `backend/src/schemas/assistantConversationSchema.js` - Validation schema for chat conversations
- `backend/src/routes/api/assistant.js` - API routes for the assistant service

#### Frontend

- `frontend/src/app/service-ai-assistant/page.tsx` - Main page for the assistant service
- `frontend/src/components/assistant/AssistantInterface.tsx` - Main chat interface component
- `frontend/src/components/assistant/ConversationSidebar.tsx` - Sidebar for conversation sessions
- `frontend/src/components/assistant/TemplatesSidebar.tsx` - Sidebar for prompt templates
- `frontend/src/components/assistant/TemplateForm.tsx` - Form for creating/editing templates
- `frontend/src/components/assistant/MessageDisplay.tsx` - Individual message component
- `frontend/src/components/assistant/MessageControls.tsx` - Message input and controls

## Backend Implementation

### Step 1: Create Models

First, we need to create the necessary models for storing assistant templates and conversations.

#### Create AssistantTemplate Model

```javascript
// backend/src/models/AssistantTemplate.js
const mongoose = require('mongoose');

const assistantTemplateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  variables: [{
    name: String,
    description: String,
    defaultValue: String
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to update the updatedAt timestamp
assistantTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AssistantTemplate', assistantTemplateSchema);
```

#### Create AssistantConversation Model

```javascript
// backend/src/models/AssistantConversation.js
const mongoose = require('mongoose');

const assistantConversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: 'New Conversation',
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isArchived: {
    type: Boolean,
    default: false
  }
});

// Pre-save hook to update the updatedAt timestamp
assistantConversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AssistantConversation', assistantConversationSchema);
```

### Step 2: Create Validation Schemas

Next, create validation schemas using Joi.

#### Create AssistantTemplate Schema

```javascript
// backend/src/schemas/assistantTemplateSchema.js
const Joi = require('joi');

const assistantTemplateSchema = Joi.object({
  title: Joi.string().required().trim().min(1).max(100),
  content: Joi.string().required().min(1),
  variables: Joi.array().items(
    Joi.object({
      name: Joi.string().required().pattern(/^[a-zA-Z0-9_]+$/),
      description: Joi.string().allow(''),
      defaultValue: Joi.string().allow('')
    })
  ),
  isPublic: Joi.boolean().default(false)
});

module.exports = assistantTemplateSchema;
```

#### Create AssistantConversation Schema

```javascript
// backend/src/schemas/assistantConversationSchema.js
const Joi = require('joi');

const messageSchema = Joi.object({
  role: Joi.string().valid('user', 'assistant', 'system').required(),
  content: Joi.string().required(),
  timestamp: Joi.date()
});

const assistantConversationSchema = Joi.object({
  conversationId: Joi.string().allow(null),
  title: Joi.string().default('New Conversation'),
  messages: Joi.array().items(messageSchema),
  isArchived: Joi.boolean().default(false)
});

module.exports = assistantConversationSchema;
```

### Step 3: Create API Routes

Now, let's create the API routes for managing conversation sessions and templates.

```javascript
// backend/src/routes/api/assistant.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const AssistantConversation = require('../../models/AssistantConversation');
const AssistantTemplate = require('../../models/AssistantTemplate');
const assistantConversationSchema = require('../../schemas/assistantConversationSchema');
const assistantTemplateSchema = require('../../schemas/assistantTemplateSchema');

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
    const { error } = assistantConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request format',
        message: error.details[0].message 
      });
    }

    const conversationId = req.body.conversationId || uuidv4();
    const title = req.body.title || 'New Conversation';
    
    // Check if conversation exists
    let conversation = await AssistantConversation.findOne({ 
      conversationId,
      user: req.user._id 
    });
    
    if (conversation) {
      // Update existing conversation
      conversation.messages = req.body.messages || conversation.messages;
      conversation.title = title;
      conversation.isArchived = req.body.isArchived !== undefined ? req.body.isArchived : conversation.isArchived;
    } else {
      // Create new conversation
      conversation = new AssistantConversation({
        conversationId,
        title,
        user: req.user._id,
        messages: req.body.messages || [],
        isArchived: req.body.isArchived || false
      });
    }
    
    await conversation.save();
    
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

// Send a message to the webhook and get a response
router.post('/send', isAuthenticated, async (req, res) => {
  try {
    const { conversationId, message, webhookUrl } = req.body;
    
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
    
    // Send message to webhook
    const webhookEndpoint = process.env.N8N_BIGQUERY || 'https://nn.vertodigital.com:5678/webhook/ampeco-bigquery';
    
    logger.info(`Sending message to webhook: ${webhookEndpoint}`);
    
    // Set a timeout of 3 minutes (180000 ms)
    const timeoutDuration = 180000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
    
    try {
      const webhookResponse = await axios.post(
        webhookEndpoint, 
        { message, conversationId, userId: req.user._id }, 
        { 
          signal: controller.signal,
          timeout: timeoutDuration 
        }
      );
      
      clearTimeout(timeoutId); // Clear the timeout
      
      // Add assistant response to the conversation
      const assistantMessage = {
        role: 'assistant',
        content: webhookResponse.data.response || 'Sorry, I received an empty response.',
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
```

### Step 4: Update main API router

Update the main API router to include the assistant routes:

```javascript
// backend/src/routes/api.js
// Add this line with other route imports
router.use('/assistant', require('./api/assistant'));
```

### Step 5: Update Environment Variables

Add the webhook URL to the .env file:

```
# Add this to backend/.env
N8N_BIGQUERY=https://nn.vertodigital.com:5678/webhook/ampeco-bigquery
```

## Frontend Implementation

Now let's implement the frontend components for the assistant service.

### Step 1: Create Main Page Component

First, create the main page component for the assistant service:

```typescript
// frontend/src/app/service-ai-assistant/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AssistantInterface from '../../components/assistant/AssistantInterface';

export default function AIAssistantServicePage() {
  const { isAuthenticated, isLoading } = useAuth();

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
    <div className="h-[calc(100vh-64px)]">
      <AssistantInterface />
    </div>
  );
}
```

### Step 2: Create AssistantInterface Component

Next, create the main chat interface component that will hold both sidebars and the chat area:

```typescript
// frontend/src/components/assistant/AssistantInterface.tsx
'use client';

import React, { useState, useEffect } from 'react';
import ConversationSidebar from './ConversationSidebar';
import TemplatesSidebar from './TemplatesSidebar';
import MessageDisplay from './MessageDisplay';
import MessageControls from './MessageControls';
import { v4 as uuidv4 } from 'uuid';

// Define types
type MessageType = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
};

type Conversation = {
  conversationId: string;
  title: string;
  messages: MessageType[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type Template = {
  _id: string;
  title: string;
  content: string;
  variables: Array<{
    name: string;
    description: string;
    defaultValue: string;
  }>;
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

  useEffect(() => {
    // Fetch conversation sessions on component mount
    fetchConversationSessions();
    
    // Fetch templates on component mount
    fetchTemplates();
  }, []);

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

  const createNewConversation = () => {
    const conversationId = uuidv4();
    const newConversation = {
      conversationId,
      title: 'New Conversation',
      messages: [],
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    setCurrentConversation(newConversation);
    
    // Add the new conversation to the list
    setConversations(prevConversations => [newConversation, ...prevConversations]);
  };

  const sendMessage = async (message: string, conversationId: string) => {
    if (!message.trim()) return;
    
    try {
      setIsSendingMessage(true);
      setError(null);
      
      // Update UI immediately with the user message
      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date()
      };
      
      // If we have a current conversation, add the message to it
      if (currentConversation) {
        setCurrentConversation(prevConversation => {
          if (!prevConversation) return null;
          
          const updatedMessages = [...prevConversation.messages, userMessage];
          return {
            ...prevConversation,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
        });
      } else {
        // Create a new conversation with the user message
        const newConversation = {
          conversationId,
          title: 'New Conversation',
          messages: [userMessage],
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setCurrentConversation(newConversation);
        setConversations(prevConversations => [newConversation, ...prevConversations]);
      }
      
      // Send the message to the API
      const response = await fetch('/api/assistant/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversationId,
          message
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Add the assistant response to the current conversation
        const assistantMessage = {
          role: 'assistant' as const,
          content: data.response,
          timestamp: new Date()
        };
        
        setCurrentConversation(prevConversation => {
          if (!prevConversation) return null;
          
          const updatedMessages = [...prevConversation.messages, assistantMessage];
          return {
            ...prevConversation,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          };
        });
        
        // Update the conversations list
        setConversations(prevConversations => {
          const conversationIndex = prevConversations.findIndex(c => c.conversationId === conversationId);
          
          if (conversationIndex >= 0) {
            const updatedConversations = [...prevConversations];
            updatedConversations[conversationIndex] = {
              ...updatedConversations[conversationIndex],
              updatedAt: new Date().toISOString()
            };
            return updatedConversations;
          }
          
          return prevConversations;
        });
      } else {
        // Handle error response
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to the conversation
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error instanceof Error ? error.message : 'An error occurred'}. Please try again later.`,
        timestamp: new Date()
      };
      
      setCurrentConversation(prevConversation => {
        if (!prevConversation) return null;
        
        const updatedMessages = [...prevConversation.messages, errorMessage];
        return {
          ...prevConversation,
          messages: updatedMessages,
          updatedAt: new Date().toISOString()
        };
      });
      
      setError('Failed to send message. Please try again later.');
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

  const useTemplate = (template: Template) => {
    // Check if template has variables that need to be filled
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = template.content.match(variableRegex);
    
    if (matches && matches.length > 0) {
      // Template has variables, collect values for them
      const variables: Record<string, string> = {};
      
      // Initialize with default values if available
      template.variables.forEach(variable => {
        variables[variable.name] = variable.defaultValue || '';
      });
      
      // Show prompt to fill variables
      // This is a simplified version - in a real app, you would show a modal with form inputs
      const filledTemplate = template.content.replace(variableRegex, (match, varName) => {
        const variableName = varName.trim();
        const value = prompt(`Enter value for ${variableName}:`, variables[variableName] || '');
        return value || match; // If user cancels, keep the original template variable
      });
      
      // Send the filled template as a message
      if (currentConversation) {
        sendMessage(filledTemplate, currentConversation.conversationId);
      } else {
        const newConversationId = uuidv4();
        createNewConversation();
        sendMessage(filledTemplate, newConversationId);
      }
    } else {
      // Template has no variables, use as is
      if (currentConversation) {
        sendMessage(template.content, currentConversation.conversationId);
      } else {
        const newConversationId = uuidv4();
        createNewConversation();
        sendMessage(template.content, newConversationId);
      }
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Conversation sessions */}
      <div className={`bg-white border-r border-gray-200 transition-all ${
        leftSidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      }`}>
        <ConversationSidebar 
          conversations={conversations}
          currentConversationId={currentConversation?.conversationId}
          onSelectConversation={selectConversation}
          onNewConversation={createNewConversation}
          onRenameConversation={renameConversation}
          onArchiveConversation={archiveConversation}
          onDeleteConversation={deleteConversation}
          onExportConversation={exportConversationAsPdf}
        />
      </div>
      
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
                onSendMessage={(message) => sendMessage(message, currentConversation.conversationId)}
                isSending={isSendingMessage}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI Assistant</h2>
              <p className="text-gray-600 mb-6">Start a new conversation or select an existing one.</p>
              <button
                onClick={createNewConversation}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                New Conversation
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Sidebar - Templates */}
      <div className={`bg-white border-l border-gray-200 transition-all ${
        rightSidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
      }`}>
        <TemplatesSidebar 
          templates={templates}
          onUseTemplate={useTemplate}
          onTemplatesChanged={fetchTemplates}
        />
      </div>
    </div>
  );
}
```

### Step 3: Create ConversationSidebar Component

Now, let's create the sidebar component for conversation sessions:

```typescript
// frontend/src/components/assistant/ConversationSidebar.tsx
'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

type Conversation = {
  conversationId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
};

type ConversationSidebarProps = {
  conversations: Conversation[];
  currentConversationId: string | undefined;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (conversationId: string, newTitle: string) => void;
  onArchiveConversation: (conversationId: string, isArchived: boolean) => void;
  onDeleteConversation: (conversationId: string) => void;
  onExportConversation: (conversationId: string) => void;
};

export default function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onArchiveConversation,
  onDeleteConversation,
  onExportConversation
}: ConversationSidebarProps) {
  const [isRenamingConversation, setIsRenamingConversation] = useState<string | null>(null);
  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleRename = (conversationId: string) => {
    setIsRenamingConversation(conversationId);
    const conversation = conversations.find(c => c.conversationId === conversationId);
    setNewConversationTitle(conversation ? conversation.title : '');
  };
  
  const submitRename = (conversationId: string) => {
    if (newConversationTitle.trim()) {
      onRenameConversation(conversationId, newConversationTitle.trim());
    }
    setIsRenamingConversation(null);
  };
  
  const filteredConversations = conversations.filter(conversation => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      conversation.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by archived status
    const matchesArchived = showArchived || !conversation.isArchived;
    
    return matchesSearch && matchesArchived;
  });
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Conversations</h2>
        
        <button
          onClick={onNewConversation}
          className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center justify-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Conversation
        </button>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="show-archived"
            checked={showArchived}
            onChange={() => setShowArchived(!showArchived)}
            className="mr-2"
          />
          <label htmlFor="show-archived" className="text-sm text-gray-600">
            Show archived conversations
          </label>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            {searchQuery ? 'No conversations match your search' : 'No conversations available'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map(conversation => (
              <li 
                key={conversation.conversationId}
                className={`relative hover:bg-gray-50 ${
                  currentConversationId === conversation.conversationId ? 'bg-blue-50' : ''
                } ${
                  conversation.isArchived ? 'opacity-60' : ''
                }`}
              >
                {isRenamingConversation === conversation.conversationId ? (
                  <div className="p-3">
                    <input
                      type="text"
                      className="w-full p-1 border border-gray-300 rounded"
                      value={newConversationTitle}
                      onChange={(e) => setNewConversationTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          submitRename(conversation.conversationId);
                        } else if (e.key === 'Escape') {
                          setIsRenamingConversation(null);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex mt-2 text-sm">
                      <button
                        onClick={() => submitRename(conversation.conversationId)}
                        className="text-blue-500 hover:text-blue-700 mr-3"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsRenamingConversation(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full text-left p-3 focus:outline-none group"
                    onClick={() => onSelectConversation(conversation.conversationId)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900 truncate max-w-[180px]">
                          {conversation.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(conversation.updatedAt), 'PP p')}
                        </p>
                      </div>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="relative">
                          <button
                            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              const dropdown = document.getElementById(`dropdown-${conversation.conversationId}`);
                              dropdown?.classList.toggle('hidden');
                            }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                          
                          {/* Dropdown menu */}
                          <div
                            id={`dropdown-${conversation.conversationId}`}
                            className="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRename(conversation.conversationId);
                                }}
                              >
                                Rename
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onArchiveConversation(conversation.conversationId, !conversation.isArchived);
                                }}
                              >
                                {conversation.isArchived ? 'Unarchive' : 'Archive'}
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onExportConversation(conversation.conversationId);
                                }}
                              >
                                Export as PDF
                              </button>
                              <button
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
                                    onDeleteConversation(conversation.conversationId);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

### Step 4: Create TemplatesSidebar Component

Next, let's create the sidebar component for prompt templates:

```typescript
// frontend/src/components/assistant/TemplatesSidebar.tsx
'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';

type TemplateVariable = {
  name: string;
  description: string;
  defaultValue: string;
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

type TemplatesSidebarProps = {
  templates: Template[];
  onUseTemplate: (template: Template) => void;
  onTemplatesChanged: () => void;
};

export default function TemplatesSidebar({
  templates,
  onUseTemplate,
  onTemplatesChanged
}: TemplatesSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [showPublicOnly, setShowPublicOnly] = useState(false);
  
  const resetForm = () => {
    setTemplateTitle('');
    setTemplateContent('');
    setTemplateVariables([]);
    setIsPublic(false);
    setEditingTemplate(null);
  };
  
  const handleAddTemplate = () => {
    setShowTemplateForm(true);
    resetForm();
  };
  
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateTitle(template.title);
    setTemplateContent(template.content);
    setTemplateVariables(template.variables || []);
    setIsPublic(template.isPublic);
    setShowTemplateForm(true);
  };
  
  const handleSubmitTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const templateData = {
        title: templateTitle,
        content: templateContent,
        variables: templateVariables,
        isPublic
      };
      
      if (editingTemplate) {
        // Update existing template
        const response = await fetch(`/api/assistant/templates/${editingTemplate._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update template');
        }
      } else {
        // Create new template
        const response = await fetch('/api/assistant/templates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to create template');
        }
      }
      
      // Refresh templates list
      onTemplatesChanged();
      
      // Reset form and hide it
      resetForm();
      setShowTemplateForm(false);
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again later.');
    }
  };
  
  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/assistant/templates/${templateId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete template');
        }
        
        // Refresh templates list
        onTemplatesChanged();
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Failed to delete template. Please try again later.');
      }
    }
  };
  
  const handleAddVariable = () => {
    setTemplateVariables([
      ...templateVariables,
      { name: '', description: '', defaultValue: '' }
    ]);
  };
  
  const handleVariableChange = (index: number, field: keyof TemplateVariable, value: string) => {
    const updatedVariables = [...templateVariables];
    updatedVariables[index] = {
      ...updatedVariables[index],
      [field]: value
    };
    setTemplateVariables(updatedVariables);
  };
  
  const handleRemoveVariable = (index: number) => {
    const updatedVariables = [...templateVariables];
    updatedVariables.splice(index, 1);
    setTemplateVariables(updatedVariables);
  };
  
  const detectVariables = () => {
    // Find all variables in the format {{variableName}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = templateContent.match(variableRegex);
    
    if (matches) {
      const newVariables: TemplateVariable[] = [];
      const varNames = new Set<string>();
      
      matches.forEach(match => {
        const varName = match.slice(2, -2).trim();
        
        if (!varNames.has(varName)) {
          varNames.add(varName);
          
          // Check if variable already exists in the list
          const existingVar = templateVariables.find(v => v.name === varName);
          
          if (existingVar) {
            newVariables.push(existingVar);
          } else {
            newVariables.push({
              name: varName,
              description: '',
              defaultValue: ''
            });
          }
        }
      });
      
      setTemplateVariables(newVariables);
    }
  };
  
  const filteredTemplates = templates.filter(template => {
    // Filter by search query
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by visibility
    const matchesVisibility = !showPublicOnly || template.isPublic;
    
    return matchesSearch && matchesVisibility;
  });
  
  // Sort templates - public templates first, then by title
  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (a.isPublic !== b.isPublic) {
      return a.isPublic ? -1 : 1;
    }
    return a.title.localeCompare(b.title);
  });
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Templates</h2>
        
        <button
          onClick={handleAddTemplate}
          className="w-full py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center justify-center mb-4"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Template
        </button>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center mb-2">
          <input
            type="checkbox"
            id="show-public-only"
            checked={showPublicOnly}
            onChange={() => setShowPublicOnly(!showPublicOnly)}
            className="mr-2"
          />
          <label htmlFor="show-public-only" className="text-sm text-gray-600">
            Show public templates only
          </label>
        </div>
      </div>
      
      {showTemplateForm ? (
        <div className="p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </h3>
          
          <form onSubmit={handleSubmitTemplate}>
            <div className="mb-4">
              <label htmlFor="template-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                id="template-title"
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="template-content" className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <div className="flex items-end mb-1">
                <span className="text-xs text-gray-500 ml-auto">
                  Use {{variableName}} for variables
                </span>
              </div>
              <textarea
                id="template-content"
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                required
              />
              <button
                type="button"
                onClick={detectVariables}
                className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              >
                Detect Variables
              </button>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Variables
                </label>
                <button
                  type="button"
                  onClick={handleAddVariable}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  + Add Variable
                </button>
              </div>
              
              {templateVariables.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No variables defined. Add variables or use the detect button.
                </p>
              ) : (
                <div className="space-y-3">
                  {templateVariables.map((variable, index) => (
                    <div key={index} className="border border-gray-200 rounded-md p-3">
                      <div className="flex justify-between mb-2">
                        <h4 className="text-sm font-medium">Variable {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(index)}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => handleVariableChange(index, 'name', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                          required
                        />
                      </div>
                      
                      <div className="mb-2">
                        <label className="block text-xs text-gray-500 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => handleVariableChange(index, 'description', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Default Value
                        </label>
                        <input
                          type="text"
                          value={variable.defaultValue}
                          onChange={(e) => handleVariableChange(index, 'defaultValue', e.target.value)}
                          className="w-full p-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                  className="mr-2"
                />
                <label htmlFor="is-public" className="text-sm text-gray-700">
                  Make this template public (visible to all users)
                </label>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingTemplate ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowTemplateForm(false);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {sortedTemplates.length === 0 ? (
            <div className="text-center text-gray-500 p-4">
              {searchQuery ? 'No templates match your search' : 'No templates available'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {sortedTemplates.map(template => (
                <li key={template._id} className="relative hover:bg-gray-50">
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 truncate max-w-[180px]">
                            {template.title}
                          </h3>
                          {template.isPublic && (
                            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Public
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(template.updatedAt), 'PP')}
                        </p>
                      </div>
                      
                      <div className="flex">
                        <button
                          className="p-1 text-gray-500 hover:text-gray-700 mr-1"
                          onClick={() => handleEditTemplate(template)}
                          title="Edit template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          className="p-1 text-gray-500 hover:text-gray-700"
                          onClick={() => handleDeleteTemplate(template._id)}
                          title="Delete template"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {template.content}
                    </div>
                    
                    {template.variables && template.variables.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Variables:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map((variable, index) => (
                            <span key={index} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">
                              {variable.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <button
                      className="mt-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      onClick={() => onUseTemplate(template)}
                    >
                      Use Template
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

### Step 5: Create MessageDisplay Component

Now, let's create the component for rendering individual chat messages:

```typescript
// frontend/src/components/assistant/MessageDisplay.tsx
'use client';

import React from 'react';
import { format } from 'date-fns';

type MessageProps = {
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date | string;
  };
};

export default function MessageDisplay({ message }: MessageProps) {
  const timestamp = typeof message.timestamp === 'string' 
    ? new Date(message.timestamp) 
    : message.timestamp;
  
  // Helper function to render content with code blocks
  const renderContent = (content: string) => {
    // Split by code blocks (```code```)
    const parts = content.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // Check if this part is a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract the code and language
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        
        if (match) {
          const [, language, code] = match;
          
          return (
            <div key={index} className="my-2 rounded-md overflow-hidden">
              {language && (
                <div className="bg-gray-800 text-gray-200 text-xs py-1 px-3">
                  {language}
                </div>
              )}
              <pre className="bg-gray-900 text-gray-100 p-3 overflow-x-auto">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        
        // Fallback for malformed code blocks
        return (
          <pre key={index} className="my-2 bg-gray-100 p-3 rounded-md overflow-x-auto">
            <code>{part.slice(3, -3)}</code>
          </pre>
        );
      }
      
      // Regular text - render paragraphs
      return (
        <div key={index} className="whitespace-pre-wrap">
          {part.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < part.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </div>
      );
    });
  };
  
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg p-3 max-w-[85%] ${
        message.role === 'user' 
          ? 'bg-blue-500 text-white' 
          : 'bg-white border border-gray-200 text-gray-800'
      }`}>
        <div className="flex items-center mb-1">
          <div className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.role === 'user' ? 'You' : 'Assistant'}
          </div>
          <div className={`text-xs ml-auto ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
            {format(timestamp, 'p')}
          </div>
        </div>
        <div className={`text-sm ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
          {renderContent(message.content)}
        </div>
      </div>
    </div>
  );
}
```

### Step 6: Create MessageControls Component

Finally, let's create the component for the message input field:

```typescript
// frontend/src/components/assistant/MessageControls.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';

type MessageControlsProps = {
  onSendMessage: (message: string) => void;
  isSending: boolean;
};

export default function MessageControls({ onSendMessage, isSending }: MessageControlsProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSending) return;
    
    onSendMessage(message);
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="relative">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-hidden"
        rows={1}
        disabled={isSending}
      />
      <button
        type="submit"
        className={`absolute right-3 bottom-3 p-1 rounded-full ${
          message.trim() && !isSending 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        disabled={!message.trim() || isSending}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </form>
  );
}
```

## Testing

Let's implement a comprehensive testing plan for the new assistant service.

### Step 1: Backend Testing

Before deploying the application, thoroughly test the backend API routes:

1. **Model Validation**
   - Test creating templates with valid and invalid data
   - Test creating conversation sessions with valid and invalid data

2. **API Route Testing**
   - Test all CRUD operations for conversation sessions
   - Test all CRUD operations for templates
   - Test the webhook integration with proper error handling

3. **Authentication Testing**
   - Verify that authentication is properly enforced for all routes
   - Verify that users can only access their own conversation sessions and templates (unless public)

### Step 2: Frontend Testing

1. **Component Testing**
   - Verify all components render correctly with different props
   - Test user interactions (clicks, form submissions, etc.)
   - Test responsive design on different screen sizes

2. **Integration Testing**
   - Test the conversation flow from sending a message to receiving a response
   - Test template creation, editing, and usage
   - Test exporting conversation sessions to PDF

3. **Error Handling**
   - Test how the UI handles API errors
   - Test webhook timeout scenarios
   - Test validation errors

### Step 3: Manual Testing Checklist

✅ Create a new conversation session
✅ Send messages and receive responses
✅ Archive and unarchive conversation sessions
✅ Rename conversation sessions
✅ Delete conversation sessions
✅ Export conversation sessions to PDF
✅ Create templates with variables
✅ Edit templates
✅ Delete templates
✅ Use templates in conversation
✅ Make templates public/private
✅ Test variable input modal
✅ Test conversation search functionality
✅ Test template search functionality
✅ Test both sidebars collapsing/expanding
✅ Test error messages and loading indicators

## Deployment

Follow these steps to deploy the assistant service to production:

### Step 1: Prepare Backend for Deployment

1. **Update Environment Variables**
   - Ensure the production environment has all necessary configuration:
   
   ```
   # Production .env file additions
   N8N_BIGQUERY=https://nn.vertodigital.com:5678/webhook/ampeco-bigquery
   ```

2. **Update Backend Routes**
   - Make sure the API route for assistant is properly added to the main router:
   
   ```javascript
   // backend/src/routes/api.js
   router.use('/assistant', require('./api/assistant'));
   ```

3. **Deploy Backend**
   - If you use a CI/CD pipeline, make sure to include the new files
   - Update any necessary dependencies

### Step 2: Prepare Frontend for Deployment

1. **Add New Service to Navigation**
   - Update the main navigation component to include the new assistant service.
   - Update the home page service list to include the new assistant service.

   ```typescript
   // Add to services array in frontend/src/app/page.tsx
   {
     title: 'AI Assistant',
     description: 'Interactive AI assistant with template system',
     href: '/service-ai-assistant',
     icon: '🤖',
     underConstruction: false
   }
   ```

2. **Update Layout Component**
   - Add the assistant service to the main layout navigation menu:

   ```typescript
   // Add to the navigation section in frontend/src/components/Layout.tsx
   <Link 
     href="/service-ai-assistant" 
     className="group flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-verto-blue-primary"
   >
     <span className="mr-3">🤖</span>
     <div className="flex-1">
       <span>AI Assistant</span>
     </div>
   </Link>
   ```

3. **Deploy Frontend**
   - Build the frontend for production
   - Deploy the static files to your hosting service

### Step 3: Post-Deployment Steps

1. **Create Default Template Folder Structure**
   - Even though we're not adding initial templates, create a folder structure for future use:
   
   ```javascript
   // Create this logic in a database initialization script
   // or when the application starts
   async function createDefaultFolders() {
     try {
       // Check if 'Default Templates' folder exists
       const defaultFolder = await AssistantTemplateFolder.findOne({ 
         name: 'Default Templates', 
         isSystem: true 
       });
       
       if (!defaultFolder) {
         await AssistantTemplateFolder.create({
           name: 'Default Templates',
           isSystem: true,
           description: 'System-provided templates'
         });
         
         console.log('Created default template folder');
       }
     } catch (error) {
       console.error('Error creating default folder:', error);
     }
   }
   ```

2. **Monitor Performance**
   - Monitor API performance and webhook response times
   - Set up alerts for any failures or timeouts
   - Monitor database usage and growth

3. **User Training**
   - Prepare a brief guide for users on how to use the new assistant service
   - Highlight key features like templates with variables and conversation exports

## Conclusion

The new assistant service provides a powerful way for users to interact with AI through a webhook, with the ability to save and manage conversation sessions and create reusable templates with variables. The implementation follows the existing patterns in the application while adding new capabilities specific to the assistant service.

## Future Enhancements

Here are some potential future enhancements for the assistant service:

1. **Conversation Folders**: Allow users to organize conversations into folders.
2. **Template Categories**: Add category tagging for better template organization.
3. **Rich Text Templates**: Support rich text formatting in templates.
4. **Attachment Support**: Allow users to upload and share files in the conversation.
5. **Collaboration**: Add the ability to share conversation sessions with team members.
6. **Integration with Other Services**: Connect the assistant service with other services in the application.
7. **ChatGPT-like Plugins**: Add support for plugins to extend the capabilities of the assistant service.
8. **Voice Input/Output**: Add support for voice input and text-to-speech output.
9. **Improved Analytics**: Track usage patterns and common queries to improve the service.