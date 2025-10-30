# 🚀 BusinessOS Temporary Deployment Guide

## Quick Deploy Options

### Option 1: Render.com (Recommended for API)
**Free tier with automatic deployments**

1. **Connect GitHub Repository**
   - Push your code to GitHub
   - Go to [render.com](https://render.com)
   - Connect your GitHub account

2. **Create New Web Service**
   ```yaml
   # This will auto-deploy from render.yaml
   - Service Type: Web Service
   - Runtime: Node.js
   - Plan: Free
   ```

3. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://neondb_owner:npg_aIf7JkXTwo9R@ep-old-glade-ag0bkego-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   JWT_SECRET=your-production-jwt-secret
   NODE_ENV=production
   ```

### Option 2: Railway.app (Full Stack)
**Great for quick full-stack deployment**

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Deploy**
   ```bash
   railway login
   railway deploy
   ```

3. **Add Environment Variables**
   ```bash
   railway variables set DATABASE_URL=your-neon-url
   railway variables set JWT_SECRET=your-secret
   ```

### Option 3: Heroku (Classic)
**Well-established platform**

1. **Create Heroku App**
   ```bash
   heroku create businessos-api
   ```

2. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set DATABASE_URL=your-neon-url
   heroku config:set JWT_SECRET=your-secret
   ```

3. **Deploy**
   ```bash
   git push heroku main
   ```

## 🔧 Production Build Configuration

### Backend API Deployment
The API will be available at:
- **Health Check**: `GET /health`
- **API Base**: `GET /api/*`
- **AI Endpoints**: `GET /api/ai/*`
- **CRM Endpoints**: `GET /api/crm/*`

### Frontend Deployment Options

#### Vercel (Recommended for React)
1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   cd client
   npm run build
   vercel --prod
   ```

#### Netlify
1. **Build Command**: `npm run build`
2. **Publish Directory**: `client/dist`
3. **Environment**: Set `VITE_API_BASE_URL` to your deployed API URL

## 🌐 Environment Variables Required

### Production
```bash
# Database
DATABASE_URL=postgresql://neondb_owner:npg_aIf7JkXTwo9R@ep-old-glade-ag0bkego-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Security
JWT_SECRET=your-super-secure-jwt-secret-for-production
JWT_REFRESH_SECRET=your-super-secure-refresh-secret

# API Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-url.vercel.app

# AI Providers (Optional - BYOK)
OPENAI_API_KEY=your-openai-key
GROQ_API_KEY=your-groq-key

# Redis (Optional for queues)
REDIS_URL=redis://localhost:6379
```

### Frontend Environment
```bash
# API Configuration
VITE_API_BASE_URL=https://your-businessos-api.onrender.com

# Supabase (Optional)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📋 Quick Start Commands

### Build for Production
```bash
# Backend
npm run build

# Frontend
cd client
npm run build
```

### Test Production Build
```bash
# Start production server
npm start

# Or with PM2 for production
pm2 start src/index.js --name businessos-api
```

## 🔍 Testing Your Deployment

### API Endpoints to Test
```bash
# Health Check
curl https://your-api-url.onrender.com/health

# AI Providers
curl https://your-api-url.onrender.com/api/ai/providers

# CRM Contacts
curl https://your-api-url.onrender.com/api/crm/contacts \
  -H "x-tenant-id: your-tenant-id"
```

### Sample Frontend Testing
1. Visit your deployed frontend URL
2. Check if API calls work
3. Test authentication flow
4. Verify AI provider integration

## 🚨 Important Notes

### Security
- **Change JWT secrets** in production
- **Use HTTPS** for all connections
- **Configure CORS** properly
- **Set rate limiting** appropriately

### Database
- **NeonDB** is serverless and scales automatically
- **Connection pooling** is configured
- **SSL required** for NeonDB connections

### Monitoring
- **Health checks** enabled at `/health`
- **Error logging** to console
- **Rate limiting** 100 requests/15min per IP

## 🎯 Recommended Deployment Flow

1. **Deploy Backend First** (Render/Railway)
2. **Get API URL** from deployment
3. **Update Frontend Config** with API URL
4. **Deploy Frontend** (Vercel/Netlify)
5. **Test Full Stack** functionality

---

**Temporary Deployment Complete!** 🎉

Your BusinessOS platform will be live and accessible for testing and demonstrations.