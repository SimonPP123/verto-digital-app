Infrastructure Components:

1. Virtual Machine (GCP)
   - Location: europe-west3-a
   - OS: Ubuntu 20.04.6 LTS
   - System Resources:
     - Storage: 96.73GB (44.7% used)
     - Memory: 30% usage

2. Docker Containers
   a. Dify AI Stack:
      - dify-nginx (nginx:latest) - Ports: 80, 443
      - dify-api (langgenius/dify-api:0.15.2) - Port: 5001
      - dify-worker (langgenius/dify-api:0.15.2) - Port: 5001
      - dify-sandbox (langgenius/dify-sandbox:0.2.10)
      - dify-redis (redis:6-alpine) - Port: 6379
      - dify-web (langgenius/dify-web:0.15.2) - Port: 3000
      - dify-weaviate (semitechnologies/weaviate:1.19.0)
      - dify-db (postgres:15-alpine) - Port: 5432
      - dify-ssrf_proxy (ubuntu/squid:latest) - Port: 3128

   b. n8n Stack:
      - n8n-nginx (nginx:latest) - Ports: 8081, 5678
      - n8n (docker.n8n.io/n8nio/n8n:latest) - Port: 5678

Application Architecture:

1. Backend (Node.js/Express)
   - Main Components:
     - Authentication (Google OAuth)
     - Database Integration (MongoDB)
     - API Routes:
       - /auth/* - Authentication endpoints
       - /api/* - Service endpoints
     - Middleware:
       - CSRF Protection
       - Rate Limiting
       - Error Handling
       - Request Validation

2. Frontend (Next.js)
   - Key Features:
     - Authentication Context
     - Service Pages:
       - Ad Copy Generation
       - SEO Content Brief
       - LinkedIn Analysis
       - GA4 Reporting
       - Chat Interface
     - Responsive Layout
     - Protected Routes

3. Integration Services:
   - Dify AI for content generation
   - n8n for workflow automation
   - MongoDB for data persistence
   - Redis for caching
   - Google OAuth for authentication

Security Features:
1. CSRF Protection
2. Rate Limiting:
   - API: 100 requests per 15 minutes
   - Auth: 5 requests per 15 minutes
   - Upload: 50 requests per hour
3. Input Validation
4. Secure Session Management
5. CORS Configuration
6. Error Handling and Logging

Environment Configuration:
1. Backend:
   - Port: 5100
   - Database URLs (MongoDB, PostgreSQL)
   - OAuth Credentials
   - External Service Keys (Dify, n8n)
   - CORS Settings

2. Frontend:
   - API URL Configuration
   - Authentication Settings
   - Image Domains
   - Development Tools (ESLint, TypeScript)

Development Workflow:
1. Backend:
   - npm run dev - Development server
   - npm run start - Production server
   - npm run test - Run tests
   - npm run lint - Code linting

2. Frontend:
   - npm run dev - Development server with Turbopack
   - npm run build - Production build
   - npm run start - Production server
   - npm run lint - Code linting

   Deployment Configuration:

1. Directory Structure Setup
/var/www/verto-app/
├── frontend/          # Next.js frontend (Port 3100)
├── backend/          # Node.js backend (Port 5100)
├── logs/            # Application logs
│   ├── access/      # Access logs
│   ├── error/       # Error logs
│   └── debug/       # Debug logs
└── backup/          # Backup directory
    ├── mongo/       # MongoDB backups
    ├── config/      # Configuration backups
    └── ssl/         # SSL certificate backups

2. Environment Files

Backend Environment (.env):
PORT=5100
NODE_ENV=production
MONGODB_URI=mongodb://127.0.0.1:27017/vertodb
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=68723718775-bdbne5i0o4p3rkutjchqpqn3477s9ml2.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
SESSION_SECRET=9ad69607f7c562ecae0abde47a30c9c7ef94235ebec181dff90ac3e4e68dbc1e
DIFY_API_KEY=app-UDJJRlsYD17oL8QNxCIZwkFH
N8N_API_URL=https://vertodigital.app.n8n.cloud/webhook/9453459d-248f-4d7b-95f3-deee8ad2c1bb
FRONTEND_URL=https://bolt.vertodigital.com

Frontend Environment (.env):
NEXT_PUBLIC_API_URL=https://bolt.vertodigital.com/api
NEXT_PUBLIC_APP_URL=https://bolt.vertodigital.com
NEXT_PUBLIC_GOOGLE_CLIENT_ID=68723718775-bdbne5i0o4p3rkutjchqpqn3477s9ml2.apps.googleusercontent.com

3. Nginx Configuration (File: /etc/nginx/sites-available/verto-app)

server {
    listen 80;
    server_name bolt.vertodigital.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name bolt.vertodigital.com;

    ssl_certificate /etc/letsencrypt/live/bolt.vertodigital.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bolt.vertodigital.com/privkey.pem;

    # Frontend Application
    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

4. PM2 Configuration (ecosystem.config.js):

module.exports = {
  apps: [
    {
      name: 'verto-backend',
      cwd: './backend',
      script: 'src/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5100
      }
    },
    {
      name: 'verto-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      }
    }
  ]
};

5. Deployment Steps:

A. Initial Server Setup
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

B. Application Deployment
# Clone repository
git clone https://github.com/SimonPP123/verto-digital-app.git /var/www/verto-app

# Backend setup
cd /var/www/verto-app/backend
npm install
npm run build

# Frontend setup
cd ../frontend
npm install
npm run build

# Start applications with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

6. Backup Scripts:

A. Database Backup (backup-db.sh)
#!/bin/bash
BACKUP_DIR="/backup/verto-app/mongo"
DATE=$(date +%Y%m%d)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# MongoDB backup
mongodump --db vertodb --out $BACKUP_DIR/$DATE

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR/* -type d -mtime +30 -exec rm -rf {} +

B. Configuration Backup (backup-config.sh)
#!/bin/bash
BACKUP_DIR="/backup/verto-app/config"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Backup environment files
cp /var/www/verto-app/backend/.env $BACKUP_DIR/$DATE/
cp /var/www/verto-app/frontend/.env $BACKUP_DIR/$DATE/

# Backup Nginx configuration
cp /etc/nginx/sites-available/verto-app $BACKUP_DIR/$DATE/

# Backup PM2 configuration
cp /var/www/verto-app/ecosystem.config.js $BACKUP_DIR/$DATE/

7. Monitoring and Maintenance Setup

A. PM2 Monitoring Configuration
# Install PM2 monitoring modules
pm2 install pm2-logrotate
pm2 install pm2-server-monit

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# Monitor startup
pm2 startup ubuntu
pm2 save

B. Application Logging Setup
# Create logging directories
mkdir -p /var/www/verto-app/logs/{access,error,debug}
chmod 755 /var/www/verto-app/logs

# Logging configuration in backend/src/config/winston.js:
const winston = require('winston');
require('winston-daily-rotate-file');

const logConfig = {
    file: {
        level: 'info',
        filename: '/var/www/verto-app/logs/app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d'
    },
    error: {
        level: 'error',
        filename: '/var/www/verto-app/logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d'
    }
};

8. Health Check Implementation

A. Backend Health Check Route (/backend/src/routes/health.js):
router.get('/health', async (req, res) => {
    try {
        // Check MongoDB connection
        await mongoose.connection.db.admin().ping();
        
        // Check Redis connection
        await redisClient.ping();

        res.json({
            status: 'healthy',
            mongodb: 'connected',
            redis: 'connected',
            uptime: process.uptime(),
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

B. Monitoring Endpoints:
- Application Health: https://bolt.vertodigital.com/api/health
- PM2 Monitoring: pm2 monit
- Resource Usage: pm2 plus (optional premium monitoring)

9. Security Measures

A. Rate Limiting Configuration (backend/src/middleware/rateLimiter.js):
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5 // limit each IP to 5 requests per windowMs
});

B. CORS Configuration (backend/src/app.js):
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

10. Maintenance Procedures

A. Daily Checks:
- Monitor system resources (CPU, Memory, Disk)
- Check application logs for errors
- Verify backup completion
- Monitor API response times

B. Weekly Tasks:
- Review PM2 logs and metrics
- Check SSL certificate status
- Review security logs
- Cleanup temporary files

C. Monthly Tasks:
- System updates and patches
- Database optimization
- SSL certificate renewal check
- Review and update documentation

11. Troubleshooting Guide

A. Common Issues:
1. Application not starting:
   - Check PM2 logs: pm2 logs
   - Verify environment variables
   - Check port availability

2. Database connection issues:
   - Verify MongoDB service: systemctl status mongod
   - Check connection string
   - Verify network connectivity

3. Frontend/Backend communication:
   - Check CORS settings
   - Verify API endpoints
   - Check Nginx configuration

B. Recovery Procedures:
1. Application Recovery:
   pm2 stop all
   pm2 delete all
   pm2 start ecosystem.config.js
   pm2 save

2. Database Recovery:
   mongorestore --db vertodb /backup/verto-app/mongo/latest/

3. Configuration Recovery:
   cp /backup/verto-app/config/latest/* /var/www/verto-app/

12. Contact Information

A. Technical Support:
- Primary Contact: [Your Name]
- Email: [Your Email]
- Emergency Phone: [Your Phone]

B. Service Providers:
- Domain Provider: [Provider Name]
- Cloud Provider: Google Cloud
- SSL Provider: Let's Encrypt

13. Documentation Updates

Last Updated: [Current Date]
Version: 1.0

Remember to update this documentation when making significant changes to the application or infrastructure.

END OF DOCUMENTATION

14. Service Integration Map

A. Dify Integration:
- Dify API (Port 5001) -> Backend connects via DIFY_API_KEY
- No direct frontend connection to Dify

B. N8N Integration:
- N8N (Port 5678) -> Backend connects via webhook URL
- Webhook triggers automated workflows

C. Redis Usage:
- Share existing Redis instance (Port 6379)
- Separate database index for session storage
- Configuration in backend:
  SESSION_STORE_DB=1  # Add this to backend/.env

16. Extended Monitoring

A. Resource Monitoring:
- Total system memory usage
- Docker container metrics
- Application-specific metrics
- Database performance metrics

B. Alert Configuration:
- Memory threshold alerts
- CPU usage notifications
- Disk space warnings
- Error rate monitoring
