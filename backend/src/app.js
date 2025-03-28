require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const logger = require('./utils/logger');
const connectDB = require('../config/db');
const findAvailablePort = require('./utils/portFinder');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { startCleanupSchedule } = require('./utils/cleanup');

// Initialize Express
const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// CORS configuration - IMPORTANT: This must be before session middleware
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Trust proxy settings
app.set('trust proxy', 1);

async function startServer() {
  try {
    // Connect to MongoDB first
    logger.info('Connecting to MongoDB...');
    const mongoConnection = await connectDB();
    logger.info('MongoDB connected successfully');

    // Start cleanup schedule
    startCleanupSchedule();

    // Session configuration - AFTER MongoDB connection
    app.use(session({
      secret: process.env.SESSION_SECRET || 'your-secret-key',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions",
        ttl: 30 * 24 * 60 * 60, // 30 days
        autoRemove: "native",
        touchAfter: 24 * 3600,
        crypto: {
          secret: process.env.SESSION_SECRET || 'your-secret-key'
        }
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production', // true in production
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true,
        path: '/'
      }
    }));

    // Initialize Passport AFTER session middleware
    app.use(passport.initialize());
    app.use(passport.session());

    // Load Passport configuration
    require('../config/passport')(passport);

    // Routes configuration
    const apiRouter = express.Router();
    apiRouter.use('/auth', require('./routes/auth'));
    apiRouter.use('/assistant', require('./routes/api/assistant'));
    apiRouter.use('/', require('./routes/api'));

    // Health check endpoint
    apiRouter.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok',
        mongodb: 'connected',
        env: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    });

    // Mount all routes under /api
    app.use('/api', apiRouter);

    // Global error handler
    app.use((err, req, res, next) => {
      logger.error('Global error handler caught:');
      logger.error(`Error name: ${err.name}`);
      logger.error(`Error message: ${err.message}`);
      logger.error(`Stack trace: ${err.stack}`);
      
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    // Start the server
    const port = process.env.PORT || 5001;
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
      logger.info('Server setup completed successfully');
    });

    // Handle server errors
    server.on('error', (error) => {
      logger.error('Server error occurred:');
      logger.error(`Error name: ${error.name}`);
      logger.error(`Error message: ${error.message}`);
      process.exit(1);
    });

    // Handle process termination
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        mongoose.connection.close(false, () => {
          logger.info('MongoDB connection closed');
          process.exit(0);
        });
      });
    });

  } catch (err) {
    logger.error('Failed to start server:');
    logger.error(`Error name: ${err.name}`);
    logger.error(`Error message: ${err.message}`);
    if (err.stack) {
      logger.error(`Stack trace: ${err.stack}`);
    }
    process.exit(1);
  }
}

startServer();

module.exports = app;