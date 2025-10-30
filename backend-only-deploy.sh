#!/bin/bash

# BusinessOS Backend-Only Deployment Script
# This script helps deploy just the backend API to various platforms

echo "🚀 BusinessOS Backend Deployment Guide"
echo "======================================"

echo ""
echo "📁 Current Directory Structure:"
echo "  ├── / (root) - Backend API (Node.js/TypeScript)"
echo "  ├── src/ - TypeScript source files"  
echo "  ├── dist/ - Compiled JavaScript files"
echo "  ├── package.json - Backend dependencies"
echo "  ├── client/ - Frontend (React/TypeScript)"
echo ""

echo "✅ BACKEND IS READY FOR DEPLOYMENT!"
echo ""
echo "🔧 For Render.com:"
echo "1. Push this repo to GitHub"
echo "2. Connect GitHub to render.com"
echo "3. Create new Web Service"
echo "4. Use build command: npm install && npm run build"
echo "5. Use start command: npm start"
echo "6. Set environment variables in dashboard"
echo ""

echo "🔧 For Railway.app:"
echo "1. Install CLI: npm install -g @railway/cli"
echo "2. Login: railway login"
echo "3. Deploy: railway deploy"
echo "4. Set variables: railway variables set DATABASE_URL=..."
echo ""

echo "🔧 For Heroku:"
echo "1. Create app: heroku create businessos-api"
echo "2. Set buildpack: heroku buildpacks:set heroku/nodejs"
echo "3. Deploy: git push heroku main"
echo "4. Set config vars in Heroku dashboard"
echo ""

echo "🌐 Environment Variables Needed:"
echo "  DATABASE_URL=postgresql://neondb_owner:..."
echo "  JWT_SECRET=your-super-secure-jwt-secret"
echo "  JWT_REFRESH_SECRET=your-super-secure-refresh-secret"
echo "  NODE_ENV=production"
echo "  PORT=3000"
echo ""

echo "🧪 Test Commands After Deployment:"
echo "  curl https://your-app.onrender.com/health"
echo "  curl https://your-app.onrender.com/api/ai/providers"
echo ""

echo "🎉 Backend deployment ready!"
echo "The entire codebase deploys, but only the backend API will run."
echo "Frontend can be deployed separately later to Vercel/Netlify."