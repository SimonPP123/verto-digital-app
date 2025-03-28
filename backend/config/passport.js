const GoogleStrategy = require('passport-google-oauth20').Strategy;
const logger = require('../src/utils/logger');
const User = require('../src/models/User');

module.exports = function(passport) {
  // Default callback path - actual URL will be provided in auth route
  const baseCallbackPath = '/api/auth/google/callback';
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: baseCallbackPath,
    proxy: true, // Essential for handling proxied requests correctly
    passReqToCallback: true // Pass the request object to the callback for context
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      // Log the callback URL being used for debugging
      const callbackURL = req.session?.callbackUrl || 'No callback URL in session';
      logger.info(`OAuth callback using URL: ${callbackURL}`);
      
      const email = profile.emails[0].value;
      
      // Check if email is from vertodigital.com domain
      if (!email.endsWith('@vertodigital.com')) {
        logger.error(`Unauthorized email domain attempt: ${email}. Only @vertodigital.com emails are allowed.`);
        return done(null, false, { message: 'Access denied: Only @vertodigital.com email addresses are allowed.' });
      }

      // Check if user exists
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Create new user if doesn't exist
        user = await User.create({
          googleId: profile.id,
          email: email,
          name: profile.displayName,
          picture: profile.photos[0].value
        });
        logger.info(`New user created: ${email}`);
      } else {
        // Update the user's picture if it has changed
        if (user.picture !== profile.photos[0].value) {
          user.picture = profile.photos[0].value;
          await user.save();
          logger.info(`Updated profile picture for user: ${email}`);
        }
      }

      logger.info(`User authenticated successfully: ${email}`);
      return done(null, user);
    } catch (error) {
      logger.error('Authentication error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    logger.info(`Serializing user: ${user.email}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      if (!user) {
        logger.error(`User not found during deserialization: ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      logger.error('Deserialization error:', error);
      done(error, null);
    }
  });
}; 