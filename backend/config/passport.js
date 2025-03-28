const GoogleStrategy = require('passport-google-oauth20').Strategy;
const logger = require('../src/utils/logger');
const User = require('../src/models/User');

module.exports = function(passport) {
  // Configure dynamic callback URL based on environment
  let callbackURL = process.env.GOOGLE_CALLBACK_URL;
  
  // In production, ensure callback URL matches the domain
  if (process.env.NODE_ENV === 'production') {
    // Use a relative path that will work with any domain
    callbackURL = '/api/auth/google/callback';
    logger.info(`Using relative callback URL in production: ${callbackURL}`);
  } else {
    logger.info(`Using configured callback URL: ${callbackURL}`);
  }
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL,
    proxy: true // Important for handling proxied requests correctly
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
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
      }

      logger.info(`User authenticated successfully: ${email}`);
      return done(null, user);
    } catch (error) {
      logger.error('Authentication error:', error);
      return done(error, null);
    }
  }));

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      logger.error('Deserialization error:', error);
      done(error, null);
    }
  });
}; 