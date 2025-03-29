const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');
const adCopySchema = require('../schemas/adCopySchema');
const AdCopy = require('../models/AdCopy');
const templateSchema = require('../schemas/templateSchema');
const Template = require('../models/Template');
const ContentBrief = require('../models/ContentBrief');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const FormData = require('form-data');
const ChatSession = require('../models/ChatSession');
const XLSX = require('xlsx');
const AudienceAnalysis = require('../models/AudienceAnalysis');
const GA4Report = require('../models/GA4Report');
const GoogleAnalyticsAuth = require('../models/GoogleAnalyticsAuth');
const crypto = require('crypto');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.xls', '.xlsx', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, XLS, XLSX, and CSV files are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated' });
};

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get user profile
router.get('/profile', isAuthenticated, (req, res) => {
  res.json(req.user);
});

// Dify API proxy
router.post('/dify/run', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.post('https://dify.vertodigital.com:5100/v1/workflows/run', req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`Dify API call successful for user: ${req.user.email}`);
    res.json(response.data);
  } catch (error) {
    logger.error('Dify API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to process the Dify request',
      details: error.response?.data || error.message
    });
  }
});

// Ad Copy Generation endpoint
router.post('/dify/adcopy', isAuthenticated, async (req, res) => {
  try {
    // Validate the request body against the schema
    const { error } = adCopySchema.validate(req.body);
    if (error) {
      logger.error('Ad Copy validation error:', error.details);
      return res.status(400).json({
        error: 'Invalid request format',
        details: error.details[0].message
      });
    }

    // Format request body for Dify API
    const difyRequest = {
      inputs: req.body.inputs,
      response_mode: "blocking",
      user: req.user.email
    };

    logger.info(`Making request to Dify API for user: ${req.user.email}`, {
      inputs: difyRequest
    });

    // Initial request to start the workflow
    const response = await axios.post('https://dify.vertodigital.com:5100/v1/workflows/run', difyRequest, {
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 300000 // 5 minute timeout
    });

    logger.info('Dify API response received:', {
      status: response.status,
      data: response.data,
      workflowId: response.data.workflow_run_id
    });

    // Check if we have a workflow run ID
    if (!response.data.workflow_run_id) {
      logger.error('No workflow run ID in response:', response.data);
      throw new Error('Failed to start workflow - no workflow ID received');
    }

    // Get the workflow execution ID
    const workflowId = response.data.workflow_run_id;

    // Check if we have data in the response
    if (!response.data.data) {
      logger.error('No data object in response:', response.data);
      throw new Error('Invalid workflow response format - missing data object');
    }

    // Check workflow status
    if (response.data.data.status === 'failed') {
      logger.error('Workflow execution failed:', response.data.data.error);
      throw new Error(response.data.data.error || 'Workflow execution failed');
    }

    // Extract the outputs from the response
    let outputs = null;
    if (response.data.data.outputs) {
      outputs = response.data.data.outputs;
    } else if (response.data.outputs) {
      outputs = response.data.outputs;
    }

    if (!outputs) {
      logger.error('No outputs in workflow result:', response.data);
      throw new Error('No answer received from workflow');
    }

    // Log the outputs for debugging
    logger.info('Processing workflow outputs:', {
      outputType: typeof outputs,
      outputKeys: Object.keys(outputs),
      hasNullValues: Object.values(outputs).some(v => v === null),
      workflowId
    });

    // Process the outputs to ensure proper format
    const processedOutputs = {};
    for (const [key, value] of Object.entries(outputs)) {
      if (value === null) {
        processedOutputs[key] = null;
        continue;
      }

      try {
        // If the value is a string that looks like JSON, parse it
        if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
          processedOutputs[key] = JSON.parse(value);
        } else {
          processedOutputs[key] = value;
        }
      } catch (e) {
        logger.warn(`Failed to parse output for ${key}:`, e);
        processedOutputs[key] = value;
      }
    }

    // After successful generation and processing of outputs
    if (processedOutputs) {
      try {
        // Get user ID from the session
        if (!req.user || !req.user.id) {
          throw new Error('User ID not found in session');
        }

        // Save the ad copy to database
        const adCopy = await AdCopy.create({
          user: req.user._id,
          campaign_name: req.body.inputs.campaign_name,
          brand_name: req.body.inputs.brand_name,
          input_channels: req.body.inputs.input_channels,
          variations: processedOutputs,
          landing_page_content: req.body.inputs.landing_page_content,
          content_material: req.body.inputs.content_material || '',
          additional_information: req.body.inputs.additional_information || '',
          keywords: req.body.inputs.keywords || '',
          internal_knowledge: req.body.inputs.internal_knowledge || '',
          asset_link: req.body.inputs.asset_link || '',
          landing_page_url: req.body.inputs.landing_page_url,
          tone_and_language: req.body.inputs.tone_and_language || ''
        });

        logger.info(`Ad copy saved to database with ID: ${adCopy.id}`);
        
        // Only return variations that are not null and don't contain the error message
        const filteredOutputs = {};
        for (const [key, value] of Object.entries(processedOutputs)) {
          if (value && 
              typeof value === 'string' && 
              value.trim() !== '' && 
              !value.includes('Not generated') &&
              !value.includes('null') &&
              !value.includes('undefined')) {
            filteredOutputs[key] = value;
          }
        }

        // Check if we have any valid outputs
        if (Object.keys(filteredOutputs).length === 0) {
          logger.warn('No valid content was generated');
          return res.status(422).json({
            error: 'No valid content was generated',
            message: 'The AI model did not generate any valid content. Please try again with different inputs.'
          });
        }

        res.json(filteredOutputs);
      } catch (dbError) {
        logger.error('Database error:', dbError);
        // Still return the data even if saving to DB fails
        res.json(processedOutputs);
      }
    } else {
      throw new Error('No content was generated');
    }
  } catch (error) {
    logger.error('Ad Copy generation error:', {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
      user: req.user.email
    });
    
    // Handle different error cases
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: 'Request timeout',
        details: 'The request to Dify API timed out. Please try again.'
      });
    } else if (error.response?.status === 404) {
      res.status(404).json({
        error: 'Ad copy workflow not found',
        details: 'The specified workflow does not exist in Dify. Please check the configuration.'
      });
    } else if (error.response?.status === 401) {
      res.status(401).json({
        error: 'Unauthorized access to Dify API',
        details: 'Please check your API key configuration.'
      });
    } else if (error.response?.status === 500) {
      res.status(500).json({
        error: 'Dify API internal error',
        details: error.response?.data?.error || 'The Dify API encountered an internal error. Please try again.',
        message: error.message
      });
    } else {
      res.status(error.response?.status || 500).json({
        error: 'Failed to generate ad copy',
        details: error.response?.data?.error || error.message,
        message: 'An unexpected error occurred while generating ad copy. Please try again.'
      });
    }
  }
});

// Get saved ad copies
router.get('/adcopy/saved', isAuthenticated, async (req, res) => {
  try {
    logger.info('Fetching saved ad copies for user:', {
      userId: req.user._id,
      userEmail: req.user.email
    });

    const adCopies = await AdCopy.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(adCopies);
  } catch (error) {
    logger.error('Error fetching saved ad copies:', {
      error: error.message,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch saved ad copies' });
  }
});

// Get specific ad copy
router.get('/adcopy/:id', isAuthenticated, async (req, res) => {
  try {
    const adCopy = await AdCopy.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!adCopy) {
      return res.status(404).json({ error: 'Ad copy not found' });
    }

    res.json(adCopy);
  } catch (error) {
    logger.error('Error fetching ad copy:', error);
    res.status(500).json({ error: 'Failed to fetch ad copy' });
  }
});

// Update ad copy
router.put('/adcopy/:id', isAuthenticated, async (req, res) => {
  try {
    const adCopy = await AdCopy.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true }
    );

    if (!adCopy) {
      return res.status(404).json({ error: 'Ad copy not found' });
    }

    res.json(adCopy);
  } catch (error) {
    logger.error('Error updating ad copy:', error);
    res.status(500).json({ error: 'Failed to update ad copy' });
  }
});

// Delete ad copy
router.delete('/adcopy/:id', isAuthenticated, async (req, res) => {
  try {
    const adCopy = await AdCopy.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!adCopy) {
      return res.status(404).json({ error: 'Ad copy not found' });
    }

    res.json({ message: 'Ad copy deleted successfully' });
  } catch (error) {
    logger.error('Error deleting ad copy:', error);
    res.status(500).json({ error: 'Failed to delete ad copy' });
  }
});

// n8n API proxy
router.post('/n8n/run', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.post(process.env.N8N_API_URL, req.body, {
      headers: {
        'Authorization': `Bearer ${process.env.N8N_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    logger.info(`n8n API call successful for user: ${req.user.email}`);
    res.json(response.data);
  } catch (error) {
    logger.error('n8n API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to process the n8n request',
      details: error.response?.data || error.message
    });
  }
});

// File upload endpoint
router.post('/chat/upload', upload.array('file', 5), async (req, res) => {
  try {
    const files = req.files;
    const { sessionId } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const chatSession = await ChatSession.findOne({ 
      _id: sessionId,
      user: req.user._id,
      isActive: true 
    });

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Add files to the session's files array with binary data
    const newFiles = await Promise.all(files.map(async file => {
      let sheetNames;
      // If file is Excel, read sheet names
      if (file.mimetype.includes('spreadsheet') || file.originalname.match(/\.(xlsx|xls)$/i)) {
        try {
          const workbook = XLSX.readFile(file.path);
          sheetNames = workbook.SheetNames;
        } catch (err) {
          logger.error('Error reading Excel sheet names:', err);
        }
      }

      return {
        originalName: file.originalname,
        path: file.path,
        type: file.mimetype,
        size: file.size,
        status: 'pending',
        uploadedAt: new Date(),
        isProcessed: false,
        binary: fs.readFileSync(file.path),
        sheetNames: sheetNames // Add sheet names if available
      };
    }));

    chatSession.files.push(...newFiles);
    await chatSession.save();

    // Transform response to match frontend expectations
    const responseFiles = newFiles.map((file, index) => ({
      id: chatSession.files[chatSession.files.length - newFiles.length + index]._id.toString(),
      name: file.originalName,
      type: file.type,
      size: file.size,
      status: file.status,
      path: file.path,
      sheetNames: file.sheetNames // Include sheet names in response
    }));

    // Log successful upload
    logger.info('Files uploaded successfully:', {
      sessionId: chatSession._id,
      fileCount: files.length,
      files: responseFiles.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        sheetNames: f.sheetNames
      }))
    });

    res.json({ 
      message: 'Files uploaded successfully',
      files: responseFiles
    });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ 
      error: 'Error uploading files',
      details: error.message 
    });
  }
});

// Remove file from chat session
router.delete('/chat/files/:fileId', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const chatSession = await ChatSession.findOne({ 
      user: req.user._id,
      _id: sessionId,
      isActive: true
    });

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const fileToRemove = chatSession.files.id(req.params.fileId);
    if (!fileToRemove) {
      return res.status(404).json({ error: 'File not found in session' });
    }

    // Delete the physical file
    if (fileToRemove.path) {
      try {
        await fsPromises.unlink(fileToRemove.path);
      } catch (err) {
        logger.error('Error deleting physical file:', err);
        // Continue even if physical file deletion fails
      }
    }

    // Remove the file from the session using pull
    chatSession.files.pull(req.params.fileId);
    await chatSession.save();

    res.json({ 
      message: 'File removed successfully',
      remainingFiles: chatSession.files.map(file => ({
        id: file._id,
        name: file.originalName,
        type: file.type,
        size: file.size,
        status: file.status
      }))
    });
  } catch (error) {
    logger.error('Error removing file:', error);
    res.status(500).json({ error: 'Failed to remove file' });
  }
});

// Get files in chat session
router.get('/chat/files', isAuthenticated, async (req, res) => {
  try {
    const chatSession = await ChatSession.findOne({ user: req.user._id });
    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json({
      files: chatSession.files.map(file => ({
        id: file._id,
        name: file.originalName,
        type: file.type,
        size: file.size,
        status: file.status,
        uploadedAt: file.uploadedAt
      }))
    });
  } catch (error) {
    logger.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Get templates
router.get('/templates', isAuthenticated, async (req, res) => {
  try {
    logger.info('Fetching templates for user:', {
      userId: req.user._id,
      userEmail: req.user.email
    });

    const templates = await Template.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    logger.error('Error fetching templates:', {
      error: error.message,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create template
router.post('/templates', isAuthenticated, async (req, res) => {
  try {
    // Validate request body
    const { error } = templateSchema.validate({
      ...req.body,
      user: req.user._id
    });

    if (error) {
      logger.error('Template validation error:', error.details);
      return res.status(400).json({
        error: 'Invalid template format',
        details: error.details[0].message
      });
    }

    // Create template
    const template = await Template.create({
      ...req.body,
      user: req.user._id
    });

    logger.info(`Template saved to database with ID: ${template.id}`);
    res.status(201).json(template);
  } catch (error) {
    logger.error('Error creating template:', {
      error: error.message,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Delete template
router.delete('/templates/:id', isAuthenticated, async (req, res) => {
  try {
    const template = await Template.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Send SEO content to n8n webhook
router.post('/seo/content-brief', isAuthenticated, async (req, res) => {
  try {
    const { keyword } = req.body;
    
    // Create a placeholder content brief to track the request
    const placeholderBrief = await ContentBrief.create({
      user: req.user._id,
      content: 'Processing...',
      keyword,
      createdAt: new Date()
    });

    logger.info('Created placeholder content brief:', {
      briefId: placeholderBrief._id,
      userId: req.user._id
    });
    
    // Send data to n8n webhook
    await axios.post(process.env.N8N_CONTENT_BRIEF, {
      data: {
        keyword: keyword,
        user: {
          email: req.user.email,
          id: req.user._id.toString()
        },
        briefId: placeholderBrief._id.toString()
      }
    });

    // Return immediate confirmation
    res.json({
      success: true,
      message: 'Request received and is being processed',
      status: 'processing',
      briefId: placeholderBrief._id
    });
  } catch (error) {
    logger.error('Error sending content brief to n8n:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send content brief request',
      error: error.message
    });
  }
});

// Receive processed SEO content brief from n8n
router.post('/seo/content-brief/callback', express.text({ type: 'text/html' }), async (req, res) => {
  try {
    // Get raw body content
    const rawContent = req.body;
    
    logger.info('Received processed SEO content brief from n8n:', {
      contentLength: rawContent.length,
      contentPreview: rawContent.substring(0, 200) + '...'
    });

    // Format the content with proper classes
    const formattedContent = `
      <div class="prose max-w-none text-gray-900">
        ${rawContent}
      </div>
    `;

    // Find and update the most recent content brief
    const latestBrief = await ContentBrief.findOne()
      .sort({ createdAt: -1 });

    if (!latestBrief) {
      throw new Error('No recent content brief request found');
    }

    // Update the existing brief with the new content
    const updatedBrief = await ContentBrief.findByIdAndUpdate(
      latestBrief._id,
      { 
        content: formattedContent,
        updatedAt: new Date()
      },
      { new: true }
    );

    logger.info('Updated content brief:', {
      briefId: updatedBrief._id,
      userId: updatedBrief.user,
      contentLength: formattedContent.length,
      contentPreview: formattedContent.substring(0, 200) + '...'
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'Content brief updated successfully',
      briefId: updatedBrief._id
    });

  } catch (error) {
    logger.error('Error handling n8n callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle content brief callback',
      error: error.message
    });
  }
});

// Get content brief status
router.get('/seo/content-brief/status', isAuthenticated, async (req, res) => {
  try {
    // Return the latest content brief for this user
    const latestBrief = await ContentBrief.findOne({ 
      user: req.user._id 
    }).sort({ createdAt: -1 });

    if (!latestBrief) {
      return res.json({
        status: 'processing',
        message: 'No content brief found'
      });
    }

    // Check if content is still processing
    if (latestBrief.content === 'Processing...') {
      return res.json({
        status: 'processing',
        message: 'Content brief is being generated'
      });
    }

    res.json({
      status: 'completed',
      content: latestBrief.content
    });
  } catch (error) {
    logger.error('Error getting content brief status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get content brief status'
    });
  }
});

// Get saved content briefs
router.get('/content-briefs/saved', isAuthenticated, async (req, res) => {
  try {
    logger.info('Fetching saved content briefs for user:', {
      userId: req.user._id,
      userEmail: req.user.email
    });

    const contentBriefs = await ContentBrief.find({ user: req.user._id })
      .sort({ createdAt: -1 });

    res.json(contentBriefs);
  } catch (error) {
    logger.error('Error fetching saved content briefs:', {
      error: error.message,
      userId: req.user._id,
      stack: error.stack
    });
    res.status(500).json({ error: 'Failed to fetch saved content briefs' });
  }
});

// Get specific content brief
router.get('/content-briefs/:id', isAuthenticated, async (req, res) => {
  try {
    const contentBrief = await ContentBrief.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!contentBrief) {
      return res.status(404).json({ error: 'Content brief not found' });
    }

    res.json(contentBrief);
  } catch (error) {
    logger.error('Error fetching content brief:', error);
    res.status(500).json({ error: 'Failed to fetch content brief' });
  }
});

// Delete content brief
router.delete('/content-briefs/:id', isAuthenticated, async (req, res) => {
  try {
    const contentBrief = await ContentBrief.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!contentBrief) {
      return res.status(404).json({ error: 'Content brief not found' });
    }

    res.json({ message: 'Content brief deleted successfully' });
  } catch (error) {
    logger.error('Error deleting content brief:', error);
    res.status(500).json({ error: 'Failed to delete content brief' });
  }
});

// Add request validation middleware
const validateN8nRequest = (req, res, next) => {
  try {
    const { message, selectedFileIds } = req.body;
    const chatSession = req.chatSession;

    // Log the current state of files in the session
    logger.info('Current files in session:', {
      sessionId: chatSession._id,
      totalFiles: chatSession.files.length,
      files: chatSession.files.map(f => ({
        id: f._id,
        originalName: f.originalName,
        isProcessed: f.isProcessed,
        status: f.status
      }))
    });

    // Get selected files if IDs are provided
    const selectedFiles = selectedFileIds 
      ? chatSession.files.filter(f => selectedFileIds.includes(f._id.toString()) && !f.isProcessed)
      : chatSession.files.filter(f => !f.isProcessed);

    logger.info('Selected unprocessed files:', {
      count: selectedFiles.length,
      files: selectedFiles.map(f => ({
        id: f._id,
        originalName: f.originalName,
        type: f.type,
        size: f.size
      }))
    });

    // Store validated data for the next middleware
    req.validatedData = {
      message,
      selectedFiles,
      chatSession
    };

    next();
  } catch (error) {
    logger.error('Request validation error:', error);
    res.status(400).json({ error: 'Invalid request data' });
  }
};

// Add n8n request preparation middleware
const prepareN8nRequest = (req, res, next) => {
  try {
    const { message, selectedFiles, chatSession } = req.validatedData;

    // Prepare files data for n8n
    const filesData = selectedFiles.map(file => ({
      id: file._id.toString(),
      name: file.originalName,
      type: file.type,
      size: file.size,
      status: 'processing'
    }));

    // Prepare the payload
    const payload = {
      data: {
        action: filesData.length > 0 ? 'processFile' : 'sendMessage',
        sessionId: chatSession._id.toString(),
        chatInput: message,
        files: filesData
      },
      webhookUrl: process.env.N8N_CHAT_WITH_FILES,
      executionMode: 'production'
    };

    // Log the prepared request
    logger.info('Prepared n8n request:', {
      action: payload.data.action,
      sessionId: payload.data.sessionId,
      messageLength: message.length,
      filesCount: filesData.length,
      files: filesData
    });

    // Store prepared data for the next middleware
    req.n8nRequest = {
      payload,
      selectedFiles
    };

    next();
  } catch (error) {
    logger.error('Request preparation error:', error);
    res.status(500).json({ error: 'Failed to prepare request' });
  }
};

// Chat message endpoint
router.post('/chat/message', isAuthenticated, async (req, res) => {
    try {
        const { action, sessionId, chatInput: message, files, model } = req.body;
        
        if (!message || !sessionId) {
            return res.status(400).json({ error: 'Message and session ID are required' });
        }

        // Get chat session
        let chatSession = await ChatSession.findOne({ 
            user: req.user._id,
            _id: sessionId,
            isActive: true 
        });

        if (!chatSession) {
            return res.status(404).json({ error: 'Chat session not found' });
        }

        // Check if already processing
        if (chatSession.isProcessing) {
            const thirtySecondsAgo = new Date(Date.now() - 30000);
            if (chatSession.lastActivity < thirtySecondsAgo) {
                logger.info('Resetting stuck processing state', {
                    sessionId: chatSession._id,
                    lastActivity: chatSession.lastActivity
                });
                chatSession.isProcessing = false;
            } else {
                return res.status(429).json({ error: 'A request is already being processed' });
            }
        }

        // Set processing flag and save
        chatSession.isProcessing = true;
        chatSession.lastActivity = new Date();
        await chatSession.save();

        try {
            // Add user message
            const userMessage = {
                role: 'user',
                content: message,
                timestamp: new Date(),
                tokens: Math.ceil(message.length / 4)
            };
            chatSession.messages.push(userMessage);
            await chatSession.save();

            // Get pending files and prepare binary data
            const pendingFiles = files ? await Promise.all(files.map(async (fileInfo) => {
                const file = chatSession.files.find(f => 
                    f.originalName === fileInfo.fileName && 
                    !f.isProcessed
                );
                
                if (!file) return null;

                return {
                    fileName: file.originalName,
                    fileSize: fileInfo.fileSize,
                    fileType: fileInfo.fileType,
                    mimeType: file.type,
                    fileExtension: fileInfo.fileExtension,
                    binaryKey: fileInfo.binaryKey,
                    path: file.path
                };
            })) : [];

            // Filter out null values
            const validFiles = pendingFiles.filter(f => f !== null);

            // Create FormData
            const formData = new FormData();

            // Add each field separately
            formData.append('action', 'sendMessage');
            formData.append('sessionId', chatSession._id.toString());
            formData.append('chatInput', message);
            if (model) {
                formData.append('model', model);
            }

            // Add files metadata as separate fields
            validFiles.forEach((file, index) => {
                formData.append(`files[${index}][fileName]`, file.fileName);
                formData.append(`files[${index}][fileSize]`, file.fileSize);
                formData.append(`files[${index}][fileType]`, file.fileType);
                formData.append(`files[${index}][mimeType]`, file.mimeType);
                formData.append(`files[${index}][fileExtension]`, file.fileExtension);
                formData.append(`files[${index}][binaryKey]`, file.binaryKey);
                
                // Add the actual file
                const fileStream = fs.createReadStream(file.path);
                formData.append(file.binaryKey, fileStream, {
                    filename: file.fileName,
                    contentType: file.mimeType
                });
            });

            // Send to n8n webhook with FormData
            const response = await axios.post(process.env.N8N_CHAT_WITH_FILES, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Accept': 'application/json'
                },
                timeout: 300000, // 5 minute timeout
                maxBodyLength: Infinity
            });

            // Mark files as processed
            if (validFiles.length > 0) {
                for (const file of validFiles) {
                    const fileInSession = chatSession.files.find(f => f.originalName === file.fileName);
                    if (fileInSession) {
                        fileInSession.isProcessed = true;
                        fileInSession.status = 'processed';
                    }
                }
                await chatSession.save();
            }

            // Add assistant's response
            const responseContent = typeof response.data === 'string' 
                ? response.data 
                : response.data.message || JSON.stringify(response.data);
            const responseTokens = Math.ceil(responseContent.length / 4);
            const assistantMessage = {
                role: 'assistant',
                content: responseContent,
                tokens: responseTokens,
                timestamp: new Date()
            };
            chatSession.messages.push(assistantMessage);
            chatSession.totalTokens += responseTokens;

            // Check token limit
            if (chatSession.totalTokens > ChatSession.TOKEN_CLEANUP_THRESHOLD) {
                while (chatSession.totalTokens > ChatSession.TOKEN_CLEANUP_THRESHOLD && chatSession.messages.length > 2) {
                    const removed = chatSession.messages.shift();
                    chatSession.totalTokens -= removed.tokens;
                }
            }

            // Clear processing flag and save
            chatSession.isProcessing = false;
            chatSession.lastActivity = new Date();
    await chatSession.save();

    res.json({
                message: responseContent,
                totalTokens: chatSession.totalTokens,
                tokenLimit: ChatSession.TOKEN_LIMIT
            });
        } catch (error) {
            chatSession.isProcessing = false;
            chatSession.lastActivity = new Date();
            await chatSession.save();
            throw error;
        }
    } catch (error) {
        logger.error('Chat message error:', error);
        res.status(500).json({ 
            error: 'Failed to process chat message',
            details: error.message
        });
    }
});

router.get('/chat/history', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Find the specific chat session for this user
    const chatSession = await ChatSession.findOne({
      _id: sessionId,
      user: req.user._id,
      isActive: true
    });

    if (!chatSession) {
      logger.error('Chat session not found:', {
        sessionId,
        userId: req.user._id
      });
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Log the raw session data for debugging
    logger.info('Raw chat history data:', {
      sessionId: chatSession._id,
      messageCount: chatSession.messages?.length || 0,
      fileCount: chatSession.files?.length || 0,
      rawMessages: chatSession.messages,
      rawFiles: chatSession.files
    });

    // Transform the data to match frontend expectations
    const response = {
      messages: chatSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? msg.timestamp.getTime() : Date.now()
      })),
      files: chatSession.files.map(file => ({
        id: file._id.toString(),
        name: file.originalName || file.name,
        type: file.type,
        size: file.size,
        status: file.status || 'pending'
      }))
    };

    logger.info('Transformed chat history data:', {
      sessionId: chatSession._id,
      messageCount: response.messages.length,
      fileCount: response.files.length,
      transformedMessages: response.messages,
      transformedFiles: response.files
    });

    res.json(response);
  } catch (error) {
    logger.error('Chat history error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

// Reset chat endpoint
router.post('/chat/reset', isAuthenticated, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const chatSession = await ChatSession.findOne({ 
      _id: sessionId,
      user: req.user._id,
      isActive: true 
    });

    if (!chatSession) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Delete all uploaded files
    for (const file of chatSession.files) {
      if (file.path) {
        try {
          await fsPromises.unlink(file.path);
          logger.info(`Deleted file: ${file.path}`);
        } catch (err) {
          logger.error('Error deleting file:', err);
          // Continue even if file deletion fails
        }
      }
    }

    // Add reset message to chat history
    chatSession.messages.push({
      role: 'user',
      content: 'reset the chat',
      timestamp: new Date(),
      tokens: 4
    });

    // Add system message about reset
    chatSession.messages.push({
      role: 'system',
      content: 'Chat has been reset. Previous context and files have been cleared.',
      timestamp: new Date(),
      tokens: 12
    });

    // Reset files and processing state
    chatSession.files = [];
    chatSession.isProcessing = false;
    await chatSession.save();

    // Send reset notification to n8n
    try {
      await axios.post(process.env.N8N_CHAT_WITH_FILES, {
        action: 'resetChat',
        sessionId: chatSession._id.toString(),
        chatInput: 'reset the chat'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      logger.error('Error notifying n8n of reset:', error);
      // Continue even if n8n notification fails
    }

    res.json({ 
      message: 'Chat session reset successfully',
      messages: chatSession.messages.slice(-2) // Return the last two messages
    });
  } catch (error) {
    logger.error('Reset chat error:', error);
    res.status(500).json({ error: 'Failed to reset chat' });
  }
});

// Get all chat sessions
router.get('/chat/sessions', isAuthenticated, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ 
      user: req.user._id,
      isActive: true 
    })
    .select('name lastActivity totalTokens isProcessing')
    .sort({ lastActivity: -1 });

    res.json(sessions);
  } catch (error) {
    logger.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// Create new chat session
router.post('/chat/sessions', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    const session = new ChatSession({
      name: name || `Chat ${new Date().toLocaleString()}`,
      user: req.user._id,
      messages: [],
      files: [],
      totalTokens: 0,
      isProcessing: false,
      isActive: true,
      lastActivity: new Date()
    });
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    logger.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// Get specific chat session
router.get('/chat/sessions/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id,
      isActive: true
    });

    if (!session) {
      logger.error('Chat session not found:', {
        sessionId: req.params.sessionId,
        userId: req.user._id
      });
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Log the raw session data for debugging
    logger.info('Raw chat session data:', {
      sessionId: session._id,
      messageCount: session.messages?.length || 0,
      fileCount: session.files?.length || 0,
      rawMessages: session.messages,
      rawFiles: session.files
    });

    // Transform the data to match frontend expectations
    const response = {
      messages: session.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? msg.timestamp.getTime() : Date.now()
      })),
      files: session.files.map(file => ({
        id: file._id.toString(),
        name: file.originalName || file.name,
        type: file.type,
        size: file.size,
        status: file.status || 'pending'
      }))
    };

    logger.info('Transformed chat session data:', {
      sessionId: session._id,
      messageCount: response.messages.length,
      fileCount: response.files.length,
      transformedMessages: response.messages,
      transformedFiles: response.files
    });

    res.json(response);
  } catch (error) {
    logger.error('Error fetching chat session:', {
      error: error.message,
      stack: error.stack,
      sessionId: req.params.sessionId,
      userId: req.user._id
    });
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// Update chat session
router.put('/chat/sessions/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const { name } = req.body;
    const session = await ChatSession.findOneAndUpdate(
      { _id: req.params.sessionId, user: req.user._id },
      { name },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    res.json(session);
  } catch (error) {
    logger.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// Delete chat session (soft delete)
router.delete('/chat/sessions/:sessionId', isAuthenticated, async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      _id: req.params.sessionId,
      user: req.user._id
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Delete all uploaded files
    for (const file of session.files) {
      if (file.path) {
        try {
          await fsPromises.unlink(file.path);
        } catch (err) {
          logger.error('Error deleting file:', err);
          // Continue even if file deletion fails
        }
      }
    }

    // Soft delete by marking as inactive
    session.isActive = false;
    await session.save();

    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    logger.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// Receive chat response callback
router.post('/chat/callback', express.text({ type: '*/*' }), async (req, res) => {
  try {
    logger.info('Received callback request:', {
      contentType: req.headers['content-type'],
      bodyPreview: req.body.substring(0, 200) + '...'
    });

    const sessionId = req.query.sessionId;
    if (!sessionId) {
      logger.error('No session ID provided in request');
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Find the chat session
    const chatSession = await ChatSession.findById(sessionId);
    if (!chatSession) {
      logger.error('Chat session not found:', { sessionId });
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Remove ```html tags if they exist
    let cleanContent = req.body;
    if (cleanContent.startsWith('```html')) {
      cleanContent = cleanContent.substring(7);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.substring(0, cleanContent.length - 3);
    }

    // Format HTML content with proper styling
    const formattedContent = `
      <div class="chat-message prose max-w-none text-gray-900 overflow-x-auto">
        <style>
          .chat-message h1 { font-size: 1.5em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
          .chat-message h2 { font-size: 1.25em; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
          .chat-message ul { list-style-type: disc; margin-left: 1.5em; margin-top: 0.5em; margin-bottom: 0.5em; }
          .chat-message ul ul { list-style-type: circle; }
          .chat-message ul ul ul { list-style-type: square; }
          .chat-message li { margin: 0.25em 0; }
          .chat-message p { margin: 0.75em 0; }
        </style>
        ${cleanContent.trim()}
      </div>
    `;

    // Add assistant's response with formatted HTML
    chatSession.messages.push({
      role: 'assistant',
      content: formattedContent,
      timestamp: new Date(),
      tokens: Math.ceil(req.body.length / 4)
    });

    // Update session
    chatSession.isProcessing = false;
    chatSession.lastActivity = new Date();
    await chatSession.save();

    logger.info('Processed HTML response:', {
      sessionId,
      messageLength: formattedContent.length,
      isProcessing: false
    });

    res.json({ 
      success: true,
      message: 'HTML response processed successfully'
    });
  } catch (error) {
    logger.error('Error processing chat callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat response',
      error: error.message
    });
  }
});

// Submit a new LinkedIn audience analysis request
router.post('/linkedin/audience-analysis', isAuthenticated, async (req, res) => {
  try {
    const { websiteUrl, businessPersona, jobFunctions } = req.body;
    
    // Validate input
    if (!websiteUrl || !businessPersona || !jobFunctions || !Array.isArray(jobFunctions) || jobFunctions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: websiteUrl, businessPersona, or jobFunctions'
      });
    }

    // Create a placeholder audience analysis
    const audienceAnalysis = new AudienceAnalysis({
      user: req.user._id,
      websiteUrl,
      businessPersona,
      jobFunctions,
      content: 'Processing...'
    });

    // Save the placeholder
    const savedAnalysis = await audienceAnalysis.save();

    logger.info('Created placeholder audience analysis:', {
      analysisId: savedAnalysis._id,
      userId: req.user._id
    });

    // Send the request to n8n
    const n8nUrl = process.env.N8N_AI_AUDIENCES;
    if (!n8nUrl) {
      throw new Error('N8N_AI_AUDIENCES environment variable is not set');
    }

    // Provide both callback URL formats
    const callbackUrlWithQuery = `${process.env.API_BASE_URL}/api/ads/ai-audiences/callback?analysisId=${savedAnalysis._id}`;
    const callbackUrlWithPath = `${process.env.API_BASE_URL}/api/ads/ai-audiences/callback/${savedAnalysis._id}`;

    // Send the request to n8n with both callback URLs
    await axios.post(n8nUrl, {
      websiteUrl,
      businessPersona,
      jobFunctions,
      callbackUrl: callbackUrlWithPath, // Use the path-based URL as primary
      callbackUrlWithQuery, // Also provide the query-based URL as a backup
      analysisId: savedAnalysis._id.toString(), // Include the analysis ID directly in the payload
      userId: req.user._id.toString()
    });

    // Return success
    res.json({
      success: true,
      message: 'Audience analysis request submitted successfully',
      analysisId: savedAnalysis._id
    });

  } catch (error) {
    logger.error('Error submitting audience analysis request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit audience analysis request',
      error: error.message
    });
  }
});

// Receive processed LinkedIn AI Audience Analysis from n8n
router.post('/linkedin/audience-analysis/callback', express.text({ type: 'text/html' }), async (req, res) => {
  try {
    // Get raw body content
    const rawContent = req.body;
    
    logger.info('Received LinkedIn audience analysis callback:', {
      contentLength: rawContent.length,
      contentPreview: rawContent.substring(0, 200) + '...'
    });

    // Extract the analysis ID from the HTML content
    let analysisId = req.query.analysisId;
    const analysisIdMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Analysis ID:<\/strong>\s*(.*?)\s*<\/p>/s);
    
    if (analysisIdMatch && analysisIdMatch[1]) {
      analysisId = analysisIdMatch[1].trim();
      logger.info('Extracted analysis ID from HTML content:', { analysisId });
    }
    
    // If no analysisId in query params or HTML, check if it's in the URL path
    if (!analysisId && req.path.includes('/callback/')) {
      const pathParts = req.path.split('/');
      analysisId = pathParts[pathParts.length - 1];
      logger.info('Using analysis ID from URL path:', { analysisId });
    }

    if (!analysisId) {
      throw new Error('No analysis ID provided in callback');
    }

    // Extract structured content from HTML
    let structuredContent = {};
    
    // Extract ICP section
    const icpMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>ICP:<\/strong>\s*(.*?)\s*<\/p><summary>(.*?)<\/summary>/s);
    if (icpMatch) {
      structuredContent.icp = icpMatch[1].trim();
      structuredContent.summary = icpMatch[2].trim();
    }
    
    // Extract Website Summary section
    const websiteSummaryMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Website Summary:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (websiteSummaryMatch) {
      structuredContent.websiteSummary = websiteSummaryMatch[1].trim();
    }
    
    // Extract Scoring section
    const scoringMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Scoring:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (scoringMatch) {
      structuredContent.scoring = scoringMatch[1].trim();
    }
    
    // Extract Categories section
    const categoriesMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Categories:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (categoriesMatch) {
      structuredContent.categories = categoriesMatch[1].trim();
    }
    
    logger.info('Extracted structured content from HTML:', {
      hasIcp: !!structuredContent.icp,
      hasSummary: !!structuredContent.summary,
      hasWebsiteSummary: !!structuredContent.websiteSummary,
      hasScoring: !!structuredContent.scoring,
      hasCategories: !!structuredContent.categories
    });

    // Find the audience analysis
    const analysis = await AudienceAnalysis.findById(analysisId);

    if (!analysis) {
      throw new Error(`Audience analysis with ID ${analysisId} not found`);
    }

    // Determine if we have valid structured content
    const hasStructuredContent = Object.keys(structuredContent).length > 0;
    
    // Format the content based on whether we have structured content
    const formattedContent = hasStructuredContent 
      ? structuredContent  // Store as structured object
      : `<div class="prose max-w-none text-gray-900">${rawContent}</div>`; // Wrap in HTML

    // Update the existing analysis with the new content
    const updatedAnalysis = await AudienceAnalysis.findByIdAndUpdate(
      analysisId,
      { 
        content: formattedContent,
        updatedAt: new Date()
      },
      { new: true }
    );

    logger.info('Updated audience analysis:', {
      analysisId: updatedAnalysis._id,
      userId: updatedAnalysis.user,
      contentType: typeof formattedContent,
      isStructured: hasStructuredContent
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'Audience analysis updated successfully',
      analysisId: updatedAnalysis._id
    });

  } catch (error) {
    logger.error('Error handling audience analysis callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle audience analysis callback',
      error: error.message
    });
  }
});

// Get audience analysis status
router.get('/linkedin/audience-analysis/status', isAuthenticated, async (req, res) => {
  try {
    // Get the latest audience analysis for the user
    const latestAnalysis = await AudienceAnalysis.findOne({ user: req.user.id })
      .sort({ createdAt: -1 });

    if (!latestAnalysis) {
      return res.json({
        status: 'processing',
        message: 'No audience analysis found. Please submit a new analysis.'
      });
    }

    // Check if the content is still processing
    if (latestAnalysis.content === 'Processing...') {
      return res.json({
        status: 'processing',
        message: 'Your audience analysis is being processed. Please check back in a few minutes.'
      });
    }

    // Return the content (could be a string or a structured object)
    return res.json({
      status: 'completed',
      content: latestAnalysis.content
    });

  } catch (error) {
    logger.error('Error fetching audience analysis status:', error, { user: req.user.email });
    return res.status(500).json({
      status: 'failed',
      message: 'Failed to fetch audience analysis status'
    });
  }
});

// Get saved audience analyses
router.get('/linkedin/audience-analyses/saved', isAuthenticated, async (req, res) => {
  try {
    logger.info('Fetching saved audience analyses for user:', { user: req.user.email });
    
    // Find all audience analyses for this user
    const savedAnalyses = await AudienceAnalysis.find({ 
      user: req.user.id,
      content: { $ne: 'Processing...' } // Only return completed analyses
    }).sort({ createdAt: -1 });
    
    // Map the analyses to include only necessary fields
    const formattedAnalyses = savedAnalyses.map(analysis => ({
      id: analysis._id,
      createdAt: analysis.createdAt,
      updatedAt: analysis.updatedAt,
      targetUrl: analysis.websiteUrl, // Use websiteUrl from the model
      content: analysis.content, // This could be a string or a structured object
      isStructured: typeof analysis.content === 'object' && analysis.content !== null
    }));
    
    logger.info('Successfully fetched saved audience analyses:', { 
      count: formattedAnalyses.length,
      user: req.user.email 
    });
    
    return res.json({
      success: true,
      analyses: formattedAnalyses
    });
    
  } catch (error) {
    logger.error('Error fetching saved audience analyses:', error, { user: req.user.email });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch saved audience analyses'
    });
  }
});

// Get specific audience analysis
router.get('/linkedin/audience-analyses/:id', isAuthenticated, async (req, res) => {
  try {
    const audienceAnalysis = await AudienceAnalysis.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!audienceAnalysis) {
      return res.status(404).json({ error: 'Audience analysis not found' });
    }

    res.json(audienceAnalysis);
  } catch (error) {
    logger.error('Error fetching audience analysis:', error);
    res.status(500).json({ error: 'Failed to fetch audience analysis' });
  }
});

// Delete an audience analysis
router.delete('/linkedin/audience-analyses/:id', isAuthenticated, async (req, res) => {
  try {
    const analysisId = req.params.id;
    
    // Log the deletion attempt
    logger.info('Attempting to delete audience analysis:', { 
      analysisId, 
      user: req.user.email 
    });
    
    // Validate the ID
    if (!analysisId) {
      logger.warn('Invalid analysis ID provided for deletion:', { 
        analysisId, 
        user: req.user.email 
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid analysis ID'
      });
    }
    
    // Check if the analysis exists and belongs to the user
    const analysis = await AudienceAnalysis.findOne({
      _id: analysisId,
      user: req.user.id
    });
    
    if (!analysis) {
      logger.warn('Analysis not found or does not belong to user:', { 
        analysisId, 
        user: req.user.email 
      });
      return res.status(404).json({
        success: false,
        message: 'Analysis not found'
      });
    }
    
    // Delete the analysis
    await AudienceAnalysis.deleteOne({ _id: analysisId });
    
    // Log the successful deletion
    logger.info('Successfully deleted audience analysis:', { 
      analysisId, 
      user: req.user.email 
    });
    
    return res.json({
      success: true,
      message: 'Analysis deleted successfully',
      id: analysisId
    });
    
  } catch (error) {
    logger.error('Error deleting audience analysis:', error, { 
      analysisId: req.params.id, 
      user: req.user.email 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete analysis'
    });
  }
});

// Receive processed AI audiences analysis from external service
router.post('/ads/ai-audiences/callback', express.text({ type: 'text/html' }), async (req, res) => {
  try {
    // Get raw body content
    const rawContent = req.body;
    
    logger.info('Received audience analysis callback:', {
      contentLength: rawContent.length,
      contentPreview: rawContent.substring(0, 200) + '...'
    });

    // Extract the analysis ID from the HTML content
    let analysisId = req.query.analysisId;
    const analysisIdMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Analysis ID:<\/strong>\s*(.*?)\s*<\/p>/s);
    
    if (analysisIdMatch && analysisIdMatch[1]) {
      analysisId = analysisIdMatch[1].trim();
      logger.info('Extracted analysis ID from HTML content:', { analysisId });
    }
    
    // If no analysisId in query params or HTML, check if it's in the URL path
    if (!analysisId && req.path.includes('/callback/')) {
      const pathParts = req.path.split('/');
      analysisId = pathParts[pathParts.length - 1];
      logger.info('Using analysis ID from URL path:', { analysisId });
    }

    if (!analysisId) {
      throw new Error('No analysis ID provided in callback');
    }

    // Extract structured content from HTML
    let structuredContent = {};
    
    // Extract ICP section
    const icpMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>ICP:<\/strong>\s*(.*?)\s*<\/p><summary>(.*?)<\/summary>/s);
    if (icpMatch) {
      structuredContent.icp = icpMatch[1].trim();
      structuredContent.summary = icpMatch[2].trim();
    }
    
    // Extract Website Summary section
    const websiteSummaryMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Website Summary:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (websiteSummaryMatch) {
      structuredContent.websiteSummary = websiteSummaryMatch[1].trim();
    }
    
    // Extract Scoring section
    const scoringMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Scoring:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (scoringMatch) {
      structuredContent.scoring = scoringMatch[1].trim();
    }
    
    // Extract Categories section
    const categoriesMatch = rawContent.match(/<p class="text-gray-700 mb-4"><strong>Categories:<\/strong>\s*(.*?)\s*<\/p>/s);
    if (categoriesMatch) {
      structuredContent.categories = categoriesMatch[1].trim();
    }
    
    logger.info('Extracted structured content from HTML:', {
      hasIcp: !!structuredContent.icp,
      hasSummary: !!structuredContent.summary,
      hasWebsiteSummary: !!structuredContent.websiteSummary,
      hasScoring: !!structuredContent.scoring,
      hasCategories: !!structuredContent.categories
    });

    // Find the audience analysis
    const analysis = await AudienceAnalysis.findById(analysisId);

    if (!analysis) {
      throw new Error(`Audience analysis with ID ${analysisId} not found`);
    }

    // Determine if we have valid structured content
    const hasStructuredContent = Object.keys(structuredContent).length > 0;
    
    // Format the content based on whether we have structured content
    const formattedContent = hasStructuredContent 
      ? structuredContent  // Store as structured object
      : `<div class="prose max-w-none text-gray-900">${rawContent}</div>`; // Wrap in HTML

    // Update the existing analysis with the new content
    const updatedAnalysis = await AudienceAnalysis.findByIdAndUpdate(
      analysisId,
      { 
        content: formattedContent,
        updatedAt: new Date()
      },
      { new: true }
    );

    logger.info('Updated audience analysis:', {
      analysisId: updatedAnalysis._id,
      userId: updatedAnalysis.user,
      contentType: typeof formattedContent,
      isStructured: hasStructuredContent
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'Audience analysis updated successfully',
      analysisId: updatedAnalysis._id
    });

  } catch (error) {
    logger.error('Error handling audience analysis callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle audience analysis callback',
      error: error.message
    });
  }
});

// GA4 Reports API Routes

// Submit a new GA4 report request
router.post('/analytics/google-analytics', isAuthenticated, async (req, res) => {
  try {
    const { propertyId, startDate, endDate, metrics, dimensions, filters, reportFormat } = req.body;
    
    // Validate input
    if (!propertyId || !startDate || !endDate || !metrics || !dimensions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Create a placeholder GA4 report
    const ga4Report = new GA4Report({
      user: req.user._id,
      propertyId,
      startDate,
      endDate,
      metrics,
      dimensions,
      filters: filters || null,
      reportFormat: reportFormat || 'summary',
      content: 'Processing...',
      status: 'processing'
    });

    // Save the placeholder
    const savedReport = await ga4Report.save();

    logger.info('Created placeholder GA4 report:', {
      reportId: savedReport._id,
      userId: req.user._id
    });

    // Send the request to n8n
    const n8nUrl = process.env.N8N_GA4_REPORT;
    if (!n8nUrl) {
      throw new Error('N8N_GA4_REPORT environment variable is not set');
    }

    // Calculate base URL for callbacks based on environment
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://bolt.vertodigital.com' 
      : 'http://localhost:5001';

    // Provide callback URL
    const callbackUrl = `${baseUrl}/api/analytics/google-analytics/callback?analysisId=${savedReport._id}`;
    
    logger.info('Sending request to n8n with callback URL:', { 
      callbackUrl,
      n8nUrl: n8nUrl
    });

    // Send the request to n8n
    await axios.post(n8nUrl, {
      propertyId,
      startDate,
      endDate,
      metrics,
      dimensions,
      filters: filters || null,
      reportFormat: reportFormat || 'summary',
      callbackUrl,
      analysisId: savedReport._id.toString(),
      userId: req.user._id.toString()
    });

    return res.json({
      success: true,
      message: 'GA4 report request submitted successfully',
      reportId: savedReport._id
    });
    
  } catch (error) {
    logger.error('Error submitting GA4 report request:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit GA4 report request'
    });
  }
});

// Callback for GA4 reports
router.post('/analytics/google-analytics/callback', express.text({ type: 'text/html' }), async (req, res) => {
  try {
    const { analysisId } = req.query;
    
    if (!analysisId) {
      logger.error('Missing analysisId in callback', { query: req.query });
      return res.status(400).json({ error: 'Missing analysisId' });
    }
    
    // Log request body for debugging
    logger.info('Received GA4 report callback:', { 
      analysisId,
      bodyType: typeof req.body,
      bodyLength: typeof req.body === 'string' ? req.body.length : JSON.stringify(req.body).length,
      requestHeaders: req.headers['content-type'],
      contentPreview: typeof req.body === 'string' ? req.body.substring(0, 100) + '...' : 'object'
    });
    
    const report = await GA4Report.findById(analysisId);
    
    if (!report) {
      logger.error('Report not found in callback', { analysisId });
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Get raw content directly (like LinkedIn audiences)
    const rawContent = req.body;
    
    // Make absolutely sure we're not setting content to "Processing..."
    if (!rawContent || rawContent === 'Processing...') {
      logger.error('Received empty or placeholder content in callback', { analysisId });
      return res.status(400).json({ error: 'Invalid content received' });
    }
    
    // Format HTML content with proper wrapper
    const formattedContent = `<div class="prose max-w-none text-gray-900">${rawContent}</div>`;
    
    logger.info('Processed GA4 report HTML content:', {
      contentLength: rawContent.length,
      formattedLength: formattedContent.length,
      preview: formattedContent.substring(0, 100) + '...'
    });
    
    // Update the report with the actual content and mark as completed
    // This is critical - we MUST store the actual content and update the status
    const updatedReport = await GA4Report.findByIdAndUpdate(
      analysisId,
      { 
        content: formattedContent,
        status: 'completed',
        updatedAt: new Date()
      },
      { new: true }
    );
    
    logger.info('Successfully updated GA4 report with content', { 
      analysisId,
      reportId: updatedReport._id,
      contentType: typeof formattedContent,
      contentLength: formattedContent.length,
      status: updatedReport.status
    });
    
    return res.json({
      success: true,
      message: 'GA4 report updated successfully',
      reportId: updatedReport._id
    });
  } catch (error) {
    logger.error('Error in GA4 report callback:', error);
    return res.status(500).json({ error: 'Failed to process callback' });
  }
});

// Get GA4 report status
router.get('/analytics/google-analytics/status', isAuthenticated, async (req, res) => {
  try {
    // Get the latest GA4 report for the user
    const latestReport = await GA4Report.findOne({ user: req.user._id })
      .sort({ createdAt: -1 });

    if (!latestReport) {
      logger.info('No GA4 report found for user', { userId: req.user._id });
      return res.json({
        status: 'not_found',
        message: 'No GA4 report found. Please submit a new report.'
      });
    }

    // Log the report state for debugging
    logger.info('Retrieved GA4 report for status check:', {
      reportId: latestReport._id,
      status: latestReport.status,
      contentType: typeof latestReport.content,
      contentIsProcessing: latestReport.content === 'Processing...',
      contentLength: typeof latestReport.content === 'string' 
        ? latestReport.content.length 
        : JSON.stringify(latestReport.content).length
    });

    // Auto-fix reports that are completed but still have "Processing..." as content
    if (latestReport.status === 'completed' && 
        (latestReport.content === 'Processing...' || !latestReport.content)) {
      logger.warn('Report marked as completed but has placeholder content - fixing inconsistency', {
        reportId: latestReport._id,
        status: latestReport.status,
        content: latestReport.content
      });
      
      // This is an inconsistent state - set back to processing
      latestReport.status = 'processing';
      await latestReport.save();
      
      return res.json({
        status: 'processing',
        message: 'Your GA4 report is being processed. Please check back in a few minutes.'
      });
    }

    // Auto-fix reports that are stuck in processing state for too long (over 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (latestReport.status === 'processing' && latestReport.createdAt < fiveMinutesAgo) {
      logger.warn('Found a stuck GA4 report, marking as failed', { 
        reportId: latestReport._id,
        createdAt: latestReport.createdAt
      });
      
      latestReport.status = 'failed';
      await latestReport.save();
      
      return res.json({
        status: 'failed',
        message: 'Your GA4 report processing failed due to timeout. Please try again.'
      });
    }

    // Auto-fix reports that have real content but are still marked as processing
    if (latestReport.status === 'processing' && 
        latestReport.content && 
        latestReport.content !== 'Processing...') {
      logger.warn('Found a report with content but wrong status, fixing', { 
        reportId: latestReport._id
      });
      
      latestReport.status = 'completed';
      await latestReport.save();
      
      // Continue to return the content below
    }

    // Check report status - use explicit status field
    if (latestReport.status === 'processing') {
      logger.info('GA4 report still processing', { 
        reportId: latestReport._id,
        createdAt: latestReport.createdAt, 
        timeSinceCreation: Date.now() - latestReport.createdAt
      });
      return res.json({
        status: 'processing',
        message: 'Your GA4 report is being processed. Please check back in a few minutes.'
      });
    } else if (latestReport.status === 'failed') {
      logger.info('GA4 report processing failed', { reportId: latestReport._id });
      return res.json({
        status: 'failed',
        message: 'Your GA4 report processing failed. Please try again.'
      });
    }

    // Log the type and structure of content
    logger.info('Returning completed GA4 report', { 
      reportId: latestReport._id,
      contentType: typeof latestReport.content,
      contentLength: typeof latestReport.content === 'string' ? latestReport.content.length : 'object',
      status: latestReport.status,
      contentSample: typeof latestReport.content === 'string' 
        ? latestReport.content.substring(0, 100) + '...' 
        : 'object'
    });

    // Return the content - for completed reports
    return res.json({
      status: 'completed',
      content: latestReport.content
    });

  } catch (error) {
    logger.error('Error fetching GA4 report status:', error, { user: req.user.email });
    return res.status(500).json({
      status: 'failed',
      message: 'Failed to fetch GA4 report status'
    });
  }
});

// Get saved GA4 reports
router.get('/analytics/google-analytics/saved', isAuthenticated, async (req, res) => {
  try {
    logger.info('Fetching saved GA4 reports for user:', { 
      userId: req.user._id,
      userEmail: req.user.email 
    });
    
    // First, find all reports regardless of status for debugging
    const allReports = await GA4Report.find({ 
      user: req.user._id
    }).sort({ createdAt: -1 });
    
    logger.info('Found GA4 reports with all statuses:', {
      totalCount: allReports.length,
      statusCounts: {
        processing: allReports.filter(r => r.status === 'processing').length,
        completed: allReports.filter(r => r.status === 'completed').length,
        failed: allReports.filter(r => r.status === 'failed').length,
        undefined: allReports.filter(r => !r.status).length
      }
    });
    
    // Now find completed reports
    const savedReports = await GA4Report.find({ 
      user: req.user._id,
      status: 'completed' // Only return completed reports
    }).sort({ createdAt: -1 });
    
    // Log count of found reports
    logger.info(`Found ${savedReports.length} completed GA4 reports`);
    
    // Map the reports to include only necessary fields
    const formattedReports = savedReports.map(report => ({
      id: report._id,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      propertyId: report.propertyId,
      startDate: report.startDate,
      endDate: report.endDate,
      reportFormat: report.reportFormat,
      content: report.content,
      status: report.status
    }));
    
    logger.info('Successfully fetched saved GA4 reports:', { 
      count: formattedReports.length,
      user: req.user.email 
    });
    
    return res.json({
      success: true,
      reports: formattedReports
    });
    
  } catch (error) {
    logger.error('Error fetching saved GA4 reports:', error, { user: req.user.email });
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch saved GA4 reports'
    });
  }
});

// Delete a GA4 report
router.delete('/analytics/google-analytics/:id', isAuthenticated, async (req, res) => {
  try {
    const reportId = req.params.id;
    
    logger.info('Attempting to delete GA4 report:', { 
      reportId, 
      user: req.user.email 
    });
    
    // Check if the report exists and belongs to the user
    const report = await GA4Report.findOne({
      _id: reportId,
      user: req.user._id
    });
    
    if (!report) {
      logger.warn('Report not found or does not belong to user:', { 
        reportId, 
        user: req.user.email 
      });
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }
    
    // Delete the report
    await GA4Report.deleteOne({ _id: reportId });
    
    logger.info('Successfully deleted GA4 report:', { 
      reportId, 
      user: req.user.email 
    });
    
    return res.json({
      success: true,
      message: 'Report deleted successfully',
      id: reportId
    });
    
  } catch (error) {
    logger.error('Error deleting GA4 report:', error, { 
      reportId: req.params.id, 
      user: req.user.email 
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
});

// Google Analytics 4 Authentication Routes

// Helper function to get the appropriate callback URL for Google Analytics
const getGACallbackUrl = (req) => {
  // Default to env setting
  let baseUrl = process.env.BACKEND_URL;
  
  // If request comes from a production domain
  if (req.headers.host && !req.headers.host.includes('localhost')) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    baseUrl = `${protocol}://${req.headers.host}`;
  }
  
  // Origin header can override for non-localhost
  if (req.headers.origin && !req.headers.origin.includes('localhost')) {
    baseUrl = req.headers.origin;
  }
  
  logger.info('Using Google Analytics callback base URL:', baseUrl);
  return `${baseUrl}/api/analytics/auth/callback`;
};

// Get Google Analytics 4 auth status
router.get('/analytics/auth/status', isAuthenticated, async (req, res) => {
  try {
    // Check if the user has a valid GA4 authentication
    const auth = await GoogleAnalyticsAuth.findOne({ user: req.user._id });
    
    if (!auth) {
      return res.json({
        authenticated: false
      });
    }
    
    // Check if the token is expired
    const now = new Date();
    const isExpired = now >= auth.expiresAt;
    
    if (isExpired) {
      // Token is expired, we need to refresh it or consider it invalid
      // For now, we'll consider it invalid and require re-authentication
      return res.json({
        authenticated: false
      });
      
      // TODO: Implement token refresh logic here
    }
    
    // User is authenticated with GA4
    return res.json({
      authenticated: true
    });
  } catch (error) {
    logger.error('Error checking GA4 auth status:', error);
    return res.status(500).json({
      authenticated: false,
      error: 'Failed to check authentication status'
    });
  }
});

// Start Google Analytics 4 OAuth flow
router.get('/analytics/auth/google', isAuthenticated, (req, res) => {
  try {
    // Generate a more secure random state parameter
    const state = crypto.randomBytes(16).toString('hex');
    
    // Save the state in the session to verify later
    req.session.gaOauthState = state;
    
    // Ensure session is saved before continuing
    req.session.save((err) => {
      if (err) {
        logger.error('Error saving session before GA auth:', err);
      }
      
      // Create the OAuth URL
      const scopes = [
        'https://www.googleapis.com/auth/analytics.readonly'
      ];
      
      const redirectUri = getGACallbackUrl(req);
      
      // Create the authorization URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(scopes.join(' '))}&` +
        `access_type=offline&` +
        `prompt=consent&` + // Force consent screen to get refresh token
        `state=${encodeURIComponent(state)}`;
      
      logger.info('Starting GA4 OAuth flow for user:', {
        userId: req.user._id,
        redirectUri,
        state,
        scopes
      });
      
      res.redirect(authUrl);
    });
  } catch (error) {
    logger.error('Error starting GA4 OAuth flow:', error);
    res.status(500).send(`
      <script>
        window.opener.postMessage(
          { type: 'ga4-auth', success: false, error: 'Failed to start authentication process' },
          window.location.origin
        );
        window.close();
      </script>
    `);
  }
});

// Handle Google Analytics 4 OAuth callback
router.get('/analytics/auth/callback', isAuthenticated, async (req, res) => {
  try {
    const { code, state } = req.query;
    
    logger.info('GA OAuth callback received:', { 
      hasState: !!state,
      hasCode: !!code,
      sessionState: req.session.gaOauthState
    });
    
    // Check if the state matches to prevent CSRF attacks
    if (!state || state !== req.session.gaOauthState) {
      logger.error('GA OAuth state mismatch:', {
        sessionState: req.session.gaOauthState,
        receivedState: state,
        userId: req.user._id
      });
      
      return res.status(400).send(`
        <script>
          window.opener.postMessage(
            { type: 'ga4-auth', success: false, error: 'Invalid state parameter - authentication failed' },
            window.location.origin
          );
          window.close();
        </script>
      `);
    }
    
    // Clear the state from the session
    req.session.gaOauthState = null;
    
    if (!code) {
      logger.error('No authorization code received in callback');
      return res.status(400).send(`
        <script>
          window.opener.postMessage(
            { type: 'ga4-auth', success: false, error: 'No authorization code received' },
            window.location.origin
          );
          window.close();
        </script>
      `);
    }
    
    // Exchange the authorization code for tokens
    const redirectUri = getGACallbackUrl(req);
    
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const {
      access_token,
      refresh_token,
      expires_in,
      scope,
      token_type
    } = tokenResponse.data;
    
    if (!access_token) {
      logger.error('No access token received:', tokenResponse.data);
      return res.status(400).send(`
        <script>
          window.opener.postMessage(
            { type: 'ga4-auth', success: false, error: 'Failed to get access token' },
            window.location.origin
          );
          window.close();
        </script>
      `);
    }
    
    // Calculate token expiration time
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
    
    // Save the token in the database
    await GoogleAnalyticsAuth.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        accessToken: access_token,
        refreshToken: refresh_token || '', // Some flows might not return a refresh token
        expiresAt,
        scope,
        tokenType: token_type
      },
      { upsert: true, new: true }
    );
    
    logger.info('GA4 authentication successful for user:', {
      userId: req.user._id,
      scopes: scope,
      expires: expiresAt
    });
    
    // Return success to the opener window and close the popup
    return res.send(`
      <script>
        window.opener.postMessage(
          { type: 'ga4-auth', success: true },
          window.location.origin
        );
        window.close();
      </script>
    `);
  } catch (error) {
    logger.error('Error handling GA4 OAuth callback:', error);
    res.status(500).send(`
      <script>
        window.opener.postMessage(
          { type: 'ga4-auth', success: false, error: 'Authentication failed' },
          window.location.origin
        );
        window.close();
      </script>
    `);
  }
});

// Endpoint to forward analytics requests to n8n with proper authentication
router.post('/analytics/query', isAuthenticated, async (req, res) => {
  try {
    // Check if this is an internal request from the assistant endpoint
    // (which will include userId in the request body)
    const userId = req.body.userId || req.user._id;
    
    // Get the GA4 auth from the database
    const auth = await GoogleAnalyticsAuth.findOne({ user: userId });
    
    if (!auth) {
      logger.error('GA4 auth not found for user:', { 
        userId,
        isInternalRequest: !!req.body.userId,
        body: req.body
      });
      return res.status(401).json({
        success: false,
        message: 'Not authenticated with Google Analytics'
      });
    }
    
    // Check if the token is expired
    const now = new Date();
    if (now >= auth.expiresAt) {
      logger.error('GA4 token expired for user:', { 
        userId,
        tokenExpiry: auth.expiresAt
      });
      return res.status(401).json({
        success: false,
        message: 'Google Analytics token expired'
      });
    }
    
    // Get the webhook URL for the Google Analytics 4 agent
    const n8nUrl = process.env.N8N_GOOGLE_ANALYTICS_4;
    if (!n8nUrl) {
      throw new Error('N8N_GOOGLE_ANALYTICS_4 environment variable is not set');
    }
    
    // Check if this is using the async callback pattern
    const { conversationId, useCallback } = req.body;
    
    // If using callback pattern, send request to n8n and return immediately
    if (useCallback && conversationId) {
      logger.info('Processing GA4 request asynchronously', {
        userId,
        conversationId,
        useCallback: true,
        requestBody: {
          ...req.body,
          accessToken: req.body.accessToken ? '[REDACTED]' : undefined
        }
      });
      
      // Generate callback URL
      const callbackBaseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
      const callbackUrl = `${callbackBaseUrl}/api/analytics/ga4/callback?conversationId=${conversationId}`;
      
      logger.info('Generated callback URL for GA4 request:', {
        callbackUrl,
        baseUrl: callbackBaseUrl,
        n8nUrl
      });
      
      // Start background process to make the request
      (async () => {
        try {
          await axios.post(n8nUrl, {
            ...req.body,
            accessToken: auth.accessToken,
            userId: userId.toString(),
            callbackUrl
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-Request-Timeout': '300' // Request 300 seconds if n8n supports it
            },
            timeout: 300000 // 5 minutes
          });
          
          logger.info('Successfully sent GA4 request to n8n with callback', {
            conversationId,
            targetUrl: n8nUrl
          });
        } catch (error) {
          logger.error('Background GA4 request to n8n failed:', error, {
            conversationId
          });
        }
      })();
      
      return res.json({
        success: true,
        message: 'GA4 request processing started',
        status: 'processing'
      });
    }
    
    // For synchronous requests (legacy support)
    logger.info('Forwarding GA4 request to n8n:', {
      userId,
      url: n8nUrl,
      hasAccessToken: !!auth.accessToken
    });
    
    // Forward the request to n8n with the token
    const response = await axios.post(n8nUrl, {
      ...req.body,
      accessToken: auth.accessToken,
      userId: userId.toString()
    });
    
    return res.json(response.data);
  } catch (error) {
    logger.error('Error forwarding analytics request to n8n:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process analytics request'
    });
  }
});

// Add a callback endpoint for GA4 responses from n8n
router.post('/analytics/ga4/callback', express.text({ type: '*/*' }), async (req, res) => {
  try {
    // Get raw content from request body
    let rawContent = req.body;
    let contentType = req.headers['content-type'] || 'text/plain';
    
    logger.info('Received GA4 callback:', {
      contentType,
      contentLength: typeof rawContent === 'string' ? rawContent.length : 'unknown',
      contentPreview: typeof rawContent === 'string' ? rawContent.substring(0, 200) + '...' : 'not a string',
      requestUrl: req.url,
      queryParams: req.query,
      headers: req.headers
    });

    // Extract the conversation ID from query params
    let conversationId = req.query.conversationId;
    
    // If it's JSON content, try to parse and get conversationId from body
    if (contentType.includes('application/json') && typeof rawContent === 'string') {
      try {
        const jsonContent = JSON.parse(rawContent);
        if (!conversationId && jsonContent.conversationId) {
          conversationId = jsonContent.conversationId;
          logger.info('Extracted conversationId from JSON body:', { conversationId });
          rawContent = jsonContent; // Use the parsed JSON for later processing
        }
      } catch (parseError) {
        logger.error('Error parsing JSON content in GA4 callback:', parseError);
        // Continue with raw content
      }
    }

    if (!conversationId) {
      throw new Error('No conversation ID provided in GA4 callback');
    }

    // Find the conversation - look in the AssistantConversation collection
    const Conversation = mongoose.model('AssistantConversation');
    const conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      throw new Error(`Conversation with ID ${conversationId} not found`);
    }

    // Process the content and extract the actual response
    let responseContent = '';
    
    if (typeof rawContent === 'object' && rawContent !== null) {
      // It's already parsed JSON
      responseContent = extractResponseContentFromGa4(rawContent);
    } else if (typeof rawContent === 'string') {
      // Try to parse as JSON first
      try {
        const parsedContent = JSON.parse(rawContent);
        responseContent = extractResponseContentFromGa4(parsedContent);
      } catch (parseError) {
        // If parsing fails, use the raw content
        responseContent = rawContent;
      }
    } else {
      responseContent = 'Received callback with unknown content format';
    }

    // Update the conversation with the response
    // Find the last message with "Processing..." content
    const processingMessageIndex = conversation.messages.findIndex(
      msg => msg.role === 'assistant' && msg.content === 'Processing your Google Analytics request...'
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

    logger.info('Successfully updated conversation with GA4 callback response', {
      conversationId,
      responseLength: typeof responseContent === 'string' ? responseContent.length : 'not a string'
    });

    // Return success to n8n
    res.json({
      success: true,
      message: 'GA4 response processed successfully',
      conversationId
    });

  } catch (error) {
    logger.error('Error handling GA4 callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to handle GA4 callback',
      error: error.message
    });
  }
});

// Add a status endpoint for GA4 polling
router.get('/analytics/ga4/status/:conversationId', isAuthenticated, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing conversation ID'
      });
    }
    
    // Find the conversation - look in the AssistantConversation collection
    const Conversation = mongoose.model('AssistantConversation');
    const conversation = await Conversation.findOne({
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
      msg => msg.role === 'assistant' && msg.content === 'Processing your Google Analytics request...'
    );
    
    if (isProcessing) {
      return res.json({
        success: true,
        status: 'processing',
        message: 'Your Google Analytics request is still being processed.'
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
    logger.error('Error checking GA4 status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check GA4 status',
      message: error.message
    });
  }
});

/**
 * Helper function to extract response content from GA4 responses
 */
function extractResponseContentFromGa4(responseData) {
  // Handle different response formats
  try {
    if (responseData === null || responseData === undefined) {
      return 'No data received from Google Analytics 4';
    }
    
    // If it's already a string, return it
    if (typeof responseData === 'string') {
      return responseData;
    }
    
    // If it's an array, check if items have output or response field
    if (Array.isArray(responseData)) {
      // If there's only one item and it has an output field, return that
      if (responseData.length === 1 && responseData[0] && typeof responseData[0].output === 'string') {
        return responseData[0].output;
      }
      
      // Otherwise try to process each item
      const results = responseData
        .filter(item => item !== null && item !== undefined)
        .map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object') {
            // Check for common response fields
            if (item.output) return item.output;
            if (item.response) return item.response;
            if (item.content) return item.content;
            if (item.text) return item.text;
            if (item.message) return item.message;
            
            // If no recognized field, stringify the whole object
            try {
              return JSON.stringify(item);
            } catch (e) {
              return 'Unparseable response item';
            }
          }
          return String(item);
        })
        .filter(item => !!item); // Remove empty strings
        
      if (results.length > 0) {
        return results.join('\n\n');
      }
    }
    
    // If it's an object, check for common fields
    if (typeof responseData === 'object') {
      if (responseData.output) return responseData.output;
      if (responseData.response) return responseData.response;
      if (responseData.content) return responseData.content;
      if (responseData.text) return responseData.text;
      if (responseData.message) return responseData.message;
      
      // If no recognized field, stringify the whole object
      try {
        return JSON.stringify(responseData, null, 2);
      } catch (e) {
        return 'Unparseable response object';
      }
    }
    
    // Default - convert to string
    return String(responseData);
  } catch (error) {
    logger.error('Error extracting GA4 response content:', error);
    return 'Error processing response from Google Analytics 4';
  }
}

module.exports = router; 