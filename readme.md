# Verto Digital Web Application

A comprehensive web application for Verto Digital's AI-powered marketing tools.

## Features

- Google OAuth authentication (restricted to @vertodigital.com emails)
- SEO Content Brief Generator
- Chat with Files
- LinkedIn AI Audience Analysis
- AI Ad Copy Generator
- GA4 Weekly Report Generator

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: Passport.js with Google OAuth
- **External Services**: Dify.ai, n8n

## Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SimonPP123/verto-digital-app.git
   cd verto-digital-app
   ```

2. **Install dependencies**:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Set up environment variables**:
   - Copy `.env.example` to `.env` in both backend and frontend directories
   - Update the variables with your credentials

4. **Start the development servers**:
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory)
   npm run dev
   ```

## Production Deployment

1. SSH into the VM:
   ```bash
   gcloud compute ssh dify-vm --project=vm-dify-ai --zone=europe-west3-a
   ```

2. Clone and set up the application:
   ```bash
   cd ~
   git clone https://github.com/SimonPP123/verto-digital-app.git
   cd verto-digital-app
   ```

3. Install dependencies and build:
   ```bash
   # Backend setup
   cd backend
   npm install
   
   # Frontend setup
   cd ../frontend
   npm install
   npm run build
   ```

4. Configure PM2 and start services:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development/production
DATABASE_URL=postgres://user:password@localhost:5432/dbname
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_session_secret
DIFY_API_KEY=your_dify_api_key
N8N_API_KEY=your_n8n_api_key
N8N_API_URL=your_n8n_webhook_url
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
```

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

## License

Proprietary - All rights reserved by Verto Digital