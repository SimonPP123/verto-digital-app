require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const Redis = require('redis');
const RedisStore = require('connect-redis').default;
const logger = require('./utils/logger');
const { testConnection, initDatabase } = require('../config/db');

// Initialize Redis client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  legacyMode: false
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Initialize Redis store
const redisStore = new RedisStore({
  client: redisClient,
  prefix: 'verto:sess:'
});

// Initialize Express
const app = express();

// Middleware Setup
app.use(cors({
  origin: ['http://localhost:3000', process.env.FRONTEND_URL],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Session configuration with Redis
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true
  },
  rolling: true // Resets the cookie expiration on every response
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
  res.status(200).json({ status: 'ok' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
const PORT = process.env.PORT || 5001;

// Kill any existing process on port 5000 before starting
const { exec } = require('child_process');
exec(`lsof -i :${PORT} | grep LISTEN | awk '{print $2}' | xargs kill -9`, async (error) => {
  if (error) {
    logger.info(`No process was running on port ${PORT}`);
  } else {
    logger.info(`Killed process on port ${PORT}`);
  }

  try {
    // Test database connection and initialize
    await testConnection();
    await initDatabase();

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
});

module.exports = app; 