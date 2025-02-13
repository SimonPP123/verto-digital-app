const express = require('express');
const passport = require('passport');
const router = express.Router();
const logger = require('../utils/logger');

// Google OAuth login route
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account'
  })
);

// Google OAuth callback route
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`,
    session: true
  }),
  (req, res) => {
    if (!req.user) {
      logger.error('Authentication failed: No user data');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`);
    }

    if (!req.user.email.endsWith('@vertodigital.com')) {
      logger.error(`Unauthorized email domain: ${req.user.email}`);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=domain&message=Only+@vertodigital.com+emails+are+allowed`);
    }

    logger.info(`User ${req.user.email} successfully authenticated`);
    res.redirect(process.env.FRONTEND_URL);
  }
);

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    // Double-check email domain even after authentication
    if (!req.user.email.endsWith('@vertodigital.com')) {
      req.logout((err) => {
        if (err) {
          logger.error('Error during logout:', err);
        }
      });
      return res.json({
        isAuthenticated: false,
        user: null,
        error: 'Access denied: Only @vertodigital.com email addresses are allowed'
      });
    }

    res.json({
      isAuthenticated: true,
      user: req.user
    });
  } else {
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Logout route
router.get('/logout', (req, res) => {
  const email = req.user?.email;
  req.logout((err) => {
    if (err) {
      logger.error('Error during logout:', err);
      return res.status(500).json({ error: 'Error during logout' });
    }
    logger.info(`User ${email} logged out successfully`);
    res.redirect(process.env.FRONTEND_URL);
  });
});

module.exports = router; 