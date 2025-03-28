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
    
    // Log timeout settings
    logger.info('Making request to n8n with timeout settings:', {
      axiosTimeout: 300000, // 5 minutes
      message: 'Increased timeout for complex GA4 queries'
    });
    
    try {
      // Forward the request to n8n with the token and account ID
      const response = await axios.post(n8nUrl, n8nPayload, {
        headers: {
          'Content-Type': 'application/json',
          // Add a hint to n8n about our desired timeout
          'X-Request-Timeout': '300' // Request 300 seconds if n8n supports it
        },
        // Increase axios timeout to maximum value
        timeout: 300000 // 5 minutes - axios timeout
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
        code: axiosError.code,
        isTimeout: axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout'),
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
      
      // Handle various timeout scenarios
      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        logger.error('Request to n8n timed out:', {
          timeoutValue: 300000,
          errorCode: axiosError.code,
          errorMessage: axiosError.message
        });
        
        return [{
          output: "Your Google Analytics query timed out after 5 minutes. This typically happens with complex queries over large date ranges. Please try:\n\n1. Narrowing your date range\n2. Simplifying your query\n3. Breaking your question into smaller, more specific questions"
        }];
      }
      
      // Handle 504 Gateway Timeout errors specifically
      if (axiosError.response?.status === 504) {
        logger.error('Received 504 Gateway Timeout from n8n or proxy:', {
          responseHeaders: axiosError.response.headers,
          responseData: typeof axiosError.response.data === 'string' 
            ? axiosError.response.data.substring(0, 200) 
            : JSON.stringify(axiosError.response.data)
        });
        
        return [{
          output: "The analytics server timed out while processing your request. This likely means your query is too complex or covers too much data. Please try narrowing your question to a specific time period or metric."
        }];
      }
      
      // If we have response data, throw that, otherwise rethrow the original error
      if (axiosError.response?.data) {
        if (typeof axiosError.response.data === 'string') {
          throw new Error(`N8N Error: ${axiosError.response.data.substring(0, 100)}`);
        } else {
          throw new Error(`N8N Error: ${JSON.stringify(axiosError.response.data)}`);
        }
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