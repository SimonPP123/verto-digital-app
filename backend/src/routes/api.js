const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Dify API proxy
router.post('/dify/run', isAuthenticated, async (req, res) => {
  try {
    const response = await axios.post('https://dify.vertodigital.com/v1/workflows/run', req.body, {
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