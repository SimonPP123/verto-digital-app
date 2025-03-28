const express = require('express');
const passport = require('passport');
const router = express.Router();
const logger = require('../utils/logger');
const url = require('url');
const crypto = require('crypto');

// List of allowed callback domains to match Google Cloud Console configuration
const ALLOWED_CALLBACK_DOMAINS = [
  'https://bolt.vertodigital.com',
  'http://localhost:5001',
  'http://localhost:3000'
];

// Helper function to get the appropriate redirect URL for after authentication
const getRedirectUrl = (req) => {
  // Check if we have origin in the session (set during login initiation)
  if (req.session && req.session.authOrigin) {
    logger.info(`Using saved origin from session: ${req.session.authOrigin}`);
    return req.session.authOrigin;
  }
  
  // If no saved origin, use referer header if available
  const referer = req.get('referer');
  if (referer) {
    try {
      const parsedUrl = new URL(referer);
      const origin = `${parsedUrl.protocol}//${parsedUrl.host}`;
      logger.info(`Using origin from referer: ${origin}`);
      return origin;
    } catch (error) {
      logger.error(`Error parsing referer URL: ${referer}`, error);
    }
  }
  
  // Fall back to the environment variable
  logger.info(`Using FRONTEND_URL from environment: ${process.env.FRONTEND_URL}`);
  return process.env.FRONTEND_URL;
};

// Helper function to get the callback URL registered in Google Cloud Console
const getCallbackUrl = (req) => {
  // Get base domain from request
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const requestOrigin = `${protocol}://${host}`;
  
  logger.info(`Request origin: ${requestOrigin}`);
  
  // Try to match with one of our allowed domains
  for (const domain of ALLOWED_CALLBACK_DOMAINS) {
    if (requestOrigin.startsWith(domain)) {
      const callbackUrl = `${domain}/api/auth/google/callback`;
      logger.info(`Using callback URL: ${callbackUrl}`);
      return callbackUrl;
    }
  }
  
  // Default fallback to environment variable
  const fallbackUrl = `${process.env.BACKEND_URL}/api/auth/google/callback`;
  logger.info(`Using fallback callback URL: ${fallbackUrl}`);
  return fallbackUrl;
};

// Google OAuth login route with dynamic callback URL
router.get('/google', (req, res, next) => {
  logger.info('Initiating Google OAuth login');
  logger.info(`Session ID: ${req.sessionID}`);
  
  // Save the origin in the session for the callback
  const origin = req.get('origin');
  if (origin) {
    logger.info(`Saving origin for redirect: ${origin}`);
    req.session.authOrigin = origin;
  } else {
    const referer = req.get('referer');
    if (referer) {
      try {
        const parsedUrl = new URL(referer);
        const refererOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;
        logger.info(`Saving referer origin for redirect: ${refererOrigin}`);
        req.session.authOrigin = refererOrigin;
      } catch (error) {
        logger.error(`Error parsing referer URL: ${referer}`, error);
      }
    }
  }
  
  // Generate a secure state parameter to prevent CSRF
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;
  
  // Get the appropriate callback URL
  const callbackUrl = getCallbackUrl(req);
  req.session.callbackUrl = callbackUrl;
  
  // Force save the session before redirecting to Google
  req.session.save((err) => {
    if (err) {
      logger.error('Error saving session before Google redirect:', err);
      return res.status(500).send('Error preparing authentication. Please try again.');
    }
    
    // Now that session is saved, authenticate with Google
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      prompt: 'select_account',
      callbackURL: callbackUrl,
      state: state
    })(req, res, next);
  });
});

// Google OAuth callback route
router.get('/google/callback', (req, res, next) => {
  logger.info('Received Google OAuth callback');
  logger.info(`Session ID: ${req.sessionID}`);
  
  // Verify the state parameter to prevent CSRF
  const receivedState = req.query.state;
  const savedState = req.session.oauthState;
  
  if (!savedState || receivedState !== savedState) {
    logger.error(`OAuth state mismatch. Expected: ${savedState}, Received: ${receivedState}`);
    return res.redirect(`${getRedirectUrl(req)}/login?error=security&message=Authentication+failed+due+to+security+concerns`);
  }
  
  // Get the callback URL from the session or regenerate it
  let callbackUrl = req.session.callbackUrl;
  if (!callbackUrl) {
    callbackUrl = getCallbackUrl(req);
    logger.info(`No callback URL in session, generated: ${callbackUrl}`);
  } else {
    logger.info(`Using callback URL from session: ${callbackUrl}`);
  }
  
  // Use the same callback URL for verification that we sent to Google
  passport.authenticate('google', {
    failureRedirect: '/api/auth/failure',
    callbackURL: callbackUrl,
    session: true
  })(req, res, next);
}, (req, res) => {
  if (!req.user) {
    logger.error('Authentication failed: No user data');
    return res.redirect(`${getRedirectUrl(req)}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`);
  }

  if (!req.user.email.endsWith('@vertodigital.com')) {
    logger.error(`Unauthorized email domain: ${req.user.email}`);
    return res.redirect(`${getRedirectUrl(req)}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`);
  }

  logger.info(`User ${req.user.email} successfully authenticated`);
  res.redirect(getRedirectUrl(req));
});

// Authentication failure handler
router.get('/failure', (req, res) => {
  logger.error('Authentication failed');
  res.redirect(`${getRedirectUrl(req)}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`);
});

// Check authentication status
router.get('/status', (req, res) => {
  logger.info('Checking authentication status');
  logger.info(`Session ID: ${req.sessionID}`);
  logger.info(`Is Authenticated: ${req.isAuthenticated()}`);
  if (req.user) {
    logger.info(`User: ${req.user.email}`);
  }

  if (req.isAuthenticated()) {
    // Double-check email domain even after authentication
    if (!req.user.email.endsWith('@vertodigital.com')) {
      req.logout((err) => {
        if (err) {
          logger.error('Error during logout:', err);
        }
      });
      return res.status(403).json({
        isAuthenticated: false,
        user: null,
        error: 'Access denied: Only @vertodigital.com email addresses are allowed'
      });
    }

    res.json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        picture: req.user.picture
      }
    });
  } else {
    res.status(401).json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  const email = req.user?.email;
  logger.info(`Logging out user: ${email}`);
  logger.info(`Session ID: ${req.sessionID}`);
  
  // Get the redirect URL before logout clears the session
  const redirectUrl = `${getRedirectUrl(req)}/login`;
  
  req.logout((err) => {
    if (err) {
      logger.error('Error during logout:', err);
      return res.status(500).json({ error: 'Error during logout' });
    }
    logger.info(`User ${email} logged out successfully`);
    res.redirect(redirectUrl);
  });
});

module.exports = router; 