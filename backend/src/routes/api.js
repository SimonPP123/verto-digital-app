const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');
const adCopySchema = require('../schemas/adCopySchema');
const AdCopy = require('../models/AdCopy');

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
          input_channels: req.body.inputs.input_channels,
          input_content_types: req.body.inputs.input_content_types,
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
router.post('/upload', isAuthenticated, async (req, res) => {
  try {
    // Handle file upload logic here
    // This is a placeholder for future implementation
    res.status(501).json({ message: 'File upload not implemented yet' });
  } catch (error) {
    logger.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

module.exports = router; 