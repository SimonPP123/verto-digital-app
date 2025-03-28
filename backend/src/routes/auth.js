const express = require('express');
const passport = require('passport');
const router = express.Router();
const logger = require('../utils/logger');
const url = require('url');

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

// Helper function to get the full URL including protocol, host and port
const getFullUrl = (req, path) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${protocol}://${host}${path}`;
};

// Google OAuth login route with dynamic callback URL
router.get('/google',
  (req, res, next) => {
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
    
    // Get the host being used for this request
    const host = req.headers.host;
    logger.info(`Request host: ${host}`);
    
    // Save full URL for the callback in the session
    const fullCallbackUrl = getFullUrl(req, '/api/auth/google/callback');
    logger.info(`Using callback URL: ${fullCallbackUrl}`);
    req.session.callbackUrl = fullCallbackUrl;
    
    // Must save session before redirect to Google
    req.session.save((err) => {
      if (err) {
        logger.error('Error saving session:', err);
      }
      
      // Use authenticate with the correct callbackURL for this request
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        prompt: 'select_account',
        callbackURL: fullCallbackUrl
      })(req, res, next);
    });
  }
);

// Google OAuth callback route
router.get('/google/callback',
  (req, res, next) => {
    logger.info('Received Google OAuth callback');
    logger.info(`Session ID: ${req.sessionID}`);
    
    // Get the callback URL from the session or generate it again
    let callbackUrl = req.session.callbackUrl;
    if (!callbackUrl) {
      callbackUrl = getFullUrl(req, '/api/auth/google/callback');
      logger.info(`No callback URL in session, generated: ${callbackUrl}`);
    } else {
      logger.info(`Using callback URL from session: ${callbackUrl}`);
    }
    
    // Use the same callback URL for verification
    passport.authenticate('google', {
      failureRedirect: '/api/auth/failure',
      callbackURL: callbackUrl,
      session: true
    })(req, res, next);
  },
  (req, res) => {
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
  }
);

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