const axios = require('axios');
const logger = require('./logger');
const GoogleAnalyticsAuth = require('../models/GoogleAnalyticsAuth');

/**
 * Process a Google Analytics query directly without using HTTP requests
 * 
 * @param {Object} requestData - The request data including message and userId
 * @returns {Promise<Object>} - The response from the analytics endpoint
 */
async function processAnalyticsQuery(requestData) {
  try {
    // Extract the userId from the request data
    const userId = requestData.userId;
    
    if (!userId) {
      throw new Error('User ID is required for analytics queries');
    }
    
    // Get the GA4 auth from the database
    const auth = await GoogleAnalyticsAuth.findOne({ user: userId });
    
    if (!auth) {
      logger.error('GA4 auth not found for user:', { 
        userId,
        requestData
      });
      throw new Error('Not authenticated with Google Analytics');
    }
    
    // Check if the token is expired
    const now = new Date();
    if (now >= auth.expiresAt) {
      logger.error('GA4 token expired for user:', { 
        userId,
        tokenExpiry: auth.expiresAt
      });
      throw new Error('Google Analytics token expired');
    }
    
    // Get the webhook URL for the Google Analytics 4 agent
    const n8nUrl = process.env.N8N_GOOGLE_ANALYTICS_4;
    if (!n8nUrl) {
      throw new Error('N8N_GOOGLE_ANALYTICS_4 environment variable is not set');
    }
    
    logger.info('Forwarding GA4 request to n8n directly:', {
      userId,
      url: n8nUrl,
      hasAccessToken: !!auth.accessToken
    });
    
    // Forward the request to n8n with the token
    const response = await axios.post(n8nUrl, {
      ...requestData,
      accessToken: auth.accessToken,
      userId: userId.toString()
    });
    
    return response.data;
  } catch (error) {
    logger.error('Error in processAnalyticsQuery:', error);
    throw error;
  }
}

module.exports = {
  processAnalyticsQuery
}; 