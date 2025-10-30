# 🚀 BusinessOS Supabase Quick Start

## Option 1: Local Supabase (Recommended for Development)

### Prerequisites
- ✅ Docker Desktop installed and running
- ✅ Supabase CLI installed (`npm install --save-dev supabase`)

### Step 1: Start Supabase
```bash
# Start Docker Desktop first, then:
npx supabase start
```

### Step 2: Configure Environment
Your `.env` file is already configured for local Supabase:

```env
USE_SUPABASE=true
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_DB_PASSWORD=postgres
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@localhost:54321/postgres
```

### Step 3: Run Migrations
```bash
npm run migrate
```

### Step 4: Start Application
```bash
npm run dev
```

### Step 5: Test Database Connection
```bash
curl http://localhost:3000/api/database/health
```

---

## Option 2: Supabase Cloud (For Immediate Testing)

### Step 1: Create Supabase Cloud Project
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Wait for project to be ready (2-3 minutes)

### Step 2: Get Project Credentials
From your Supabase dashboard:
- **Project URL**: `https://your-project-id.supabase.co`
- **Anon Key**: Found in Settings > API
- **Database Password**: Found in Settings > Database

### Step 3: Update Environment Variables
```env
USE_SUPABASE=true
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_DB_PASSWORD=your-database-password-here
SUPABASE_DATABASE_URL=postgresql://postgres:your-password@db.your-project-id.supabase.co:5432/postgres
```

### Step 4: Run Migrations in Cloud
```bash
npm run migrate
```

### Step 5: Start Application
```bash
npm run dev
```

---

## 🔧 Supabase Services URLs (Local)

Once Supabase is running locally, you'll have access to:

| Service | URL | Description |
|---------|-----|-------------|
| **Local API** | http://localhost:54321 | REST API endpoint |
| **Studio** | http://localhost:54323 | Database dashboard |
| **Database** | postgresql://localhost:54321 | Direct DB connection |
| **Auth** | http://localhost:54321/auth | Authentication service |
| **Storage** | http://localhost:54321/storage | File storage |

---

## 🛠️ Useful Commands

```bash
# Check Supabase status
npx supabase status

# View logs
npx supabase logs

# Stop Supabase
npx supabase stop

# Reset database (⚠️ destroys all data)
npx supabase db reset

# Open Supabase Studio
npx supabase studio
```

---

## 🔍 Troubleshooting

### Docker Issues
```bash
# Check if Docker is running
docker info

# If Docker won't start, try:
# 1. Restart Docker Desktop
# 2. Check Windows Subsystem for Linux (WSL) settings
# 3. Ensure virtualization is enabled in BIOS
```

### Port Conflicts
If you get port conflicts, modify the `.env` file:
```env
SUPABASE_DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Database Connection Issues
```bash
# Test database connection
curl http://localhost:3000/api/database/test-connection

# Check detailed health
curl http://localhost:3000/api/database/health
```

---

## 📊 What's Included

Your BusinessOS setup includes:

- ✅ **Multi-tenant architecture** with Row Level Security
- ✅ **Authentication service** with MFA support
- ✅ **Billing service** with Stripe integration
- ✅ **Database management** with health monitoring
- ✅ **Migration system** for schema management
- ✅ **Supabase compatibility** (both cloud and self-hosted)

---

## 🎯 Next Steps

Once your database is running:

1. **Test the API**: `curl http://localhost:3000/health`
2. **Create a tenant**: Use the tenant management endpoints
3. **Test authentication**: Register and login via auth endpoints
4. **Explore Supabase Studio**: http://localhost:54323 (when running locally)

**Ready to proceed with Phase 2: AI Platform Implementation?** The database foundation is now solid and ready for the next phase!