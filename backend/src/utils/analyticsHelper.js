const axios = require('axios');
const logger = require('./logger');
const GoogleAnalyticsAuth = require('../models/GoogleAnalyticsAuth');

/**
 * Process a Google Analytics query directly without using HTTP requests
 * 
 * @param {Object} requestData - The request data including message, userId, and ga4AccountId
 * @returns {Promise<Object>} - The response from the analytics endpoint
 */
async function processAnalyticsQuery(requestData) {
  try {
    // Extract the userId from the request data
    const userId = requestData.userId;
    const ga4AccountId = requestData.ga4AccountId;
    
    if (!userId) {
      throw new Error('User ID is required for analytics queries');
    }
    
    // Log if account ID is provided
    if (ga4AccountId) {
      logger.info('GA4 account ID provided:', { 
        ga4AccountId,
        length: ga4AccountId.length,
        isEmptyString: ga4AccountId === '',
        trimmed: ga4AccountId.trim()
      });
    } else {
      logger.warn('No GA4 account ID provided in request');
    }
    
    // Ensure we have a non-empty account ID
    const processedAccountId = ga4AccountId && ga4AccountId.trim();
    
    if (!processedAccountId) {
      logger.error('No valid GA4 account ID found:', {
        originalId: ga4AccountId,
        processedId: processedAccountId
      });
      throw new Error('Google Analytics 4 Account ID is required');
    }
    
    // Get the GA4 auth from the database
    const auth = await GoogleAnalyticsAuth.findOne({ user: userId });
    
    if (!auth) {
      logger.error('GA4 auth not found for user:', { 
        userId,
        requestData: {
          ...requestData,
          accessToken: requestData.accessToken ? '[REDACTED]' : undefined
        }
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
      hasAccessToken: !!auth.accessToken,
      hasAccountId: !!processedAccountId,
      accountId: processedAccountId,
      message: requestData.message ? requestData.message.substring(0, 50) : null
    });
    
    // Prepare the payload for n8n
    const n8nPayload = {
      ...requestData,
      accessToken: auth.accessToken,
      userId: userId.toString(),
      ga4AccountId: processedAccountId
    };
    
    try {
      // Forward the request to n8n with the token and account ID
      const response = await axios.post(n8nUrl, n8nPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        // Add a reasonable timeout
        timeout: 120000 // 2 minutes
      });
      
      // Log some basic info about the response
      logger.info('Received response from n8n:', {
        status: response.status,
        contentType: response.headers['content-type'],
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        dataKeys: typeof response.data === 'object' && !Array.isArray(response.data) ? 
          Object.keys(response.data) : null
      });
      
      // Ensure we have valid data to return
      if (response.data === undefined || response.data === null) {
        logger.warn('n8n returned null or undefined data');
        return [{
          output: 'No data returned from Google Analytics 4'
        }];
      }
      
      // Ensure the response is in a format our system can handle
      if (typeof response.data === 'string') {
        // If it's a string, wrap it in an array with the expected format
        logger.info('Converting string response to structured format');
        return [{
          output: response.data
        }];
      } else if (!Array.isArray(response.data)) {
        // If it's an object but not an array, wrap it in an array
        logger.info('Converting object response to array format');
        return [response.data];
      }
      
      // If it's already an array, return it as is
      return response.data;
    } catch (axiosError) {
      // Enhanced error handling for axios errors
      logger.error('Error in axios request to n8n:', {
        error: axiosError.message,
        status: axiosError.response?.status,
        responseData: axiosError.response?.data 
          ? (typeof axiosError.response.data === 'string' 
             ? axiosError.response.data.substring(0, 200) 
             : JSON.stringify(axiosError.response.data).substring(0, 200))
          : 'No response data',
        url: n8nUrl,
        accountId: processedAccountId,
        timeout: axiosError.code === 'ECONNABORTED' ? 'Request timed out' : null
      });
      
      // If we have response data, throw that, otherwise rethrow the original error
      if (axiosError.response?.data) {
        if (typeof axiosError.response.data === 'string') {
          throw new Error(`N8N Error: ${axiosError.response.data.substring(0, 100)}`);
        } else {
          throw new Error(`N8N Error: ${JSON.stringify(axiosError.response.data)}`);
        }
      }
      
      if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Request to Google Analytics timed out. Please try again with a simpler query.');
      }
      
      throw new Error(`Failed to query GA4: ${axiosError.message}`);
    }
  } catch (error) {
    logger.error('Error in processAnalyticsQuery:', error);
    // Return a structured error response that can be properly handled
    return [{
      output: `Error querying Google Analytics: ${error.message}`
    }];
  }
}

module.exports = {
  processAnalyticsQuery
}; 