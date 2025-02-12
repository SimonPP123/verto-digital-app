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
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=true`,
    session: true
  }),
  (req, res) => {
    logger.info(`User ${req.user.email} successfully authenticated`);
    res.redirect(process.env.FRONTEND_URL);
  }
);

// Check authentication status
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
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