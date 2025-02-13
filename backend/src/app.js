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

// Initialize Express
const app = express();

// Basic middleware that doesn't require DB connection
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL]
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

async function startServer() {
  try {
    // Find available port
    const preferredPort = parseInt(process.env.PORT) || 5000;
    const port = await findAvailablePort(preferredPort);
    
    // Update .env with the new port if it's different
    if (port !== preferredPort) {
      const envPath = path.join(__dirname, '..', '.env');
      let envContent = fs.readFileSync(envPath, 'utf8');
      envContent = envContent.replace(
        /PORT=\d+/,
        `PORT=${port}`
      );
      fs.writeFileSync(envPath, envContent);
      process.env.PORT = port.toString();
    }

    logger.info('Starting server with configuration:');
    logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);
    logger.info(`PORT: ${port}`);

    // Connect to MongoDB
    const mongoConnection = await connectDB();
    logger.info('Setting up session store and authentication...');

    // Session configuration
    app.use(session({
      secret: process.env.SESSION_SECRET || 'default-secret-key',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        ttl: 30 * 24 * 60 * 60, // 30 days
        autoRemove: 'native',
        touchAfter: 24 * 3600 // Only update session once per 24 hours unless data changes
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        httpOnly: true,
        domain: process.env.NODE_ENV === 'production' ? '.vertodigital.com' : undefined
      },
      rolling: true // Resets the cookie expiration on every response
    }));

    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Load Passport configuration
    require('../config/passport')(passport);

    // Routes - all under /api prefix
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api', require('./routes/api'));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok',
        mongodb: 'connected',
        port: port,
        timestamp: new Date().toISOString()
      });
    });

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
    const server = app.listen(port, () => {
      logger.info(`Server is running on port ${port}`);
      logger.info('Server setup completed successfully');
      
      // Write port to a file for the frontend to read
      const portFilePath = path.join(__dirname, '..', '..', 'frontend', '.env.development.local');
      fs.writeFileSync(portFilePath, `NEXT_PUBLIC_API_URL=http://localhost:${port}\n`);
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
        mongoConnection.connection.close(false, () => {
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