require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const { createClient } = require('redis');
const RedisStore = require('connect-redis').default;
const logger = require('./utils/logger');
const { testConnection, initDatabase } = require('../config/db');

// Initialize client
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  legacyMode: false
});

// Initialize store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'verto:sess:'
});

// Connect to Redis
(async () => {
  await redisClient.connect().catch(console.error);
})();

// Initialize Express
const app = express();

// Middleware Setup
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3100',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Session configuration with Redis
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load Passport configuration
require('../config/passport')(passport);

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5100;

const startServer = async () => {
  try {
    // Test database connection and initialize
    await testConnection();
    await initDatabase();

    // Test Redis connection
    await redisClient.ping();
    console.log('Redis connection successful');
    
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 