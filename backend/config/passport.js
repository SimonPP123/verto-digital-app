const GoogleStrategy = require('passport-google-oauth20').Strategy;
const logger = require('../src/utils/logger');
const User = require('../src/models/User');

module.exports = function(passport) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.NODE_ENV === 'production' ? 'https://bolt.vertodigital.com:5100' : 'http://localhost:5100'}/auth/google/callback`
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

      // Find or create user
      let user = await User.findOne({ where: { google_id: profile.id } });
      
      if (!user) {
        logger.info(`Creating new user for email: ${email}`);
        user = await User.create({
          google_id: profile.id,
          email: email,
          name: profile.displayName,
          picture: profile.photos?.[0]?.value
        });
      } else {
        // Update user information
        user.last_login = new Date();
        user.picture = profile.photos?.[0]?.value;
        await user.save();
      }

      logger.info(`User logged in successfully: ${email}`, {
        userId: user.id,
        googleId: user.google_id
      });
      return done(null, user);
    } catch (error) {
      logger.error('Error in Google strategy:', error);
      return done(error, null);
    }
  }));

  // Serialize user for the session
  passport.serializeUser((user, done) => {
    logger.info(`Serializing user: ${user.email}`, {
      userId: user.id,
      googleId: user.google_id
    });
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findByPk(id);
      if (!user) {
        logger.error(`Failed to deserialize user: User with ID ${id} not found`);
        return done(null, false);
      }
      logger.info(`Deserialized user: ${user.email}`, {
        userId: user.id,
        googleId: user.google_id
      });
      done(null, user);
    } catch (error) {
      logger.error('Error deserializing user:', error);
      done(error, null);
    }
  });
}; 