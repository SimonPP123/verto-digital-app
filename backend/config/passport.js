const GoogleStrategy = require('passport-google-oauth20').Strategy;
const logger = require('../src/utils/logger');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Extract email from profile
      const email = profile.emails && profile.emails[0].value;
      
      // Check if email is from vertodigital.com domain
      if (!email || !email.endsWith('@vertodigital.com')) {
        logger.warn(`Unauthorized login attempt from email: ${email}`);
        return done(null, false, { message: 'Only @vertodigital.com emails are allowed.' });
      }

      // Here you would typically:
      // 1. Check if user exists in database
      // 2. If not, create new user
      // 3. Return user object
      
      // For now, we'll just return the profile
      const user = {
        id: profile.id,
        email: email,
        name: profile.displayName,
        picture: profile.photos?.[0]?.value
      };

      logger.info(`User logged in successfully: ${email}`);
      return done(null, user);
    } catch (error) {
      logger.error('Error in Google strategy:', error);
      return done(error, null);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user from the session
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}; 