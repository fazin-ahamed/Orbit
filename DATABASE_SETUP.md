# BusinessOS Database Setup Guide

This guide explains how to configure BusinessOS to work with different database options:

- **PostgreSQL** (Traditional self-hosted)
- **Supabase Cloud** (Managed cloud database)
- **Supabase Self-hosted** (Self-hosted Supabase instance)

## Quick Start

### Option 1: PostgreSQL (Default)

1. **Install PostgreSQL** locally
2. **Create database**:
   ```bash
   createdb businessos_dev
   ```
3. **Update `.env`**:
   ```env
   USE_SUPABASE=false
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=businessos_dev
   ```
4. **Run migrations**:
   ```bash
   npm run migrate
   ```

### Option 2: Supabase Cloud

1. **Create Supabase project** at [supabase.com](https://supabase.com)
2. **Get your project credentials** from the dashboard
3. **Update `.env`**:
   ```env
   USE_SUPABASE=true
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_DB_PASSWORD=your-database-password
   SUPABASE_DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
   ```
4. **Run migrations**:
   ```bash
   npm run migrate
   ```

### Option 3: Supabase Self-hosted

1. **Set up self-hosted Supabase** using Docker
2. **Get your connection details**
3. **Update `.env`**:
   ```env
   USE_SUPABASE=true
   SUPABASE_URL=http://localhost:8000
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_DB_PASSWORD=your-db-password
   SUPABASE_DATABASE_URL=postgresql://postgres:password@localhost:54321/postgres
   ```

## Configuration Details

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `USE_SUPABASE` | Enable Supabase mode | No | `false` |
| `SUPABASE_URL` | Supabase project URL | When using Supabase | - |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | When using Supabase | - |
| `SUPABASE_DB_PASSWORD` | Database password | When using Supabase | - |
| `SUPABASE_DATABASE_URL` | Direct database connection string | When using Supabase | - |
| `DATABASE_URL` | PostgreSQL connection string | Production override | - |

### Traditional PostgreSQL Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DB_HOST` | Database host | No | `localhost` |
| `DB_PORT` | Database port | No | `5432` |
| `DB_USER` | Database user | No | `postgres` |
| `DB_PASSWORD` | Database password | No | - |
| `DB_NAME` | Database name | No | `businessos_dev` |

## Database Modes

### Mode Detection

BusinessOS automatically detects which database mode to use based on your environment variables:

```typescript
// Automatic mode detection
DatabaseMode.POSTGRESQL      // Traditional PostgreSQL
DatabaseMode.SUPABASE_CLOUD  // Supabase cloud
DatabaseMode.SUPABASE_SELF_HOSTED // Self-hosted Supabase
```

### Checking Current Mode

```bash
# Health check endpoint shows current mode
curl http://localhost:3000/api/database/health

# Response includes mode information
{
  "status": "healthy",
  "mode": "supabase_cloud",
  "responseTime": 45,
  "connectionInfo": {
    "mode": "supabase_cloud",
    "isSupabase": true,
    "config": {
      "useSupabase": "true",
      "hasDatabaseUrl": false,
      "hasSupabaseConfig": true
    }
  }
}
```

## Migration Management

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Create new migration
npm run migrate:make migration_name

# Rollback last migration
npm run migrate:rollback
```

### Migration Files

- `src/migrations/001_initial_platform.ts` - Core platform tables
- `src/migrations/002_billing_tables.ts` - Billing and usage tables

## Database Schema

### Core Tables

#### `platform.tenants`
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- subdomain (VARCHAR, Unique)
- region (VARCHAR)
- plan_tier (VARCHAR)
- stripe_customer_id (VARCHAR)
- stripe_subscription_id (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `platform.users`
```sql
- id (UUID, Primary Key)
- tenant_id (UUID, Foreign Key)
- email (VARCHAR, Unique)
- hashed_password (VARCHAR)
- first_name (VARCHAR)
- last_name (VARCHAR)
- role (VARCHAR)
- permissions (JSONB)
- mfa_enabled (BOOLEAN)
- mfa_secret (VARCHAR)
- email_verified (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `platform.audit_logs`
```sql
- id (UUID, Primary Key)
- tenant_id (UUID, Foreign Key)
- user_id (UUID, Foreign Key)
- action (VARCHAR)
- resource_type (VARCHAR)
- resource_id (UUID)
- details (JSONB)
- ip_address (VARCHAR)
- user_agent (VARCHAR)
- outcome (VARCHAR)
- created_at (TIMESTAMP)
```

### Billing Tables

#### `billing.usage`
```sql
- id (UUID, Primary Key)
- tenant_id (UUID, Foreign Key)
- resource_type (VARCHAR)
- quantity (INTEGER)
- period_start (DATE)
- period_end (DATE)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

#### `billing.subscriptions`
```sql
- id (UUID, Primary Key)
- tenant_id (UUID, Foreign Key)
- stripe_subscription_id (VARCHAR)
- stripe_customer_id (VARCHAR)
- plan_tier (VARCHAR)
- status (VARCHAR)
- current_period_start (TIMESTAMP)
- current_period_end (TIMESTAMP)
- subscription_data (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Testing Database Connection

### Health Check Endpoints

```bash
# Basic health check
curl http://localhost:3000/api/database/health

# Detailed statistics
curl http://localhost:3000/api/database/stats

# Connection test
curl http://localhost:3000/api/database/test-connection
```

### Manual Connection Test

```typescript
import { DatabaseManager } from './src/lib/supabase';

async function testConnection() {
  const health = await DatabaseManager.healthCheck();
  console.log('Database health:', health);

  const info = DatabaseManager.getConnectionInfo();
  console.log('Connection info:', info);
}

testConnection();
```

## Troubleshooting

### Common Issues

#### 1. Connection Refused
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Or for Docker
docker ps | grep postgres
```

#### 2. SSL Connection Errors
- Ensure `rejectUnauthorized: false` is set for Supabase connections
- Check if your PostgreSQL instance requires SSL

#### 3. Authentication Failed
- Verify database credentials in `.env`
- Check if the user exists and has proper permissions

#### 4. Migration Errors
```bash
# Check current migration status
npm run knex migrate:status

# Unlock migrations if stuck
npm run knex migrate:unlock
```

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=knex:*
NODE_ENV=development
```

## Production Deployment

### Supabase Cloud Production

1. **Set up production project** in Supabase dashboard
2. **Configure environment**:
   ```env
   USE_SUPABASE=true
   SUPABASE_URL=https://your-prod-project.supabase.co
   SUPABASE_ANON_KEY=your-prod-anon-key
   SUPABASE_DATABASE_URL=your-prod-connection-string
   NODE_ENV=production
   ```

3. **Enable PGBouncer** in Supabase for connection pooling
4. **Set up backups** in Supabase dashboard

### Traditional PostgreSQL Production

1. **Configure production database**:
   ```env
   DATABASE_URL=postgresql://user:password@prod-host:5432/businessos_prod
   NODE_ENV=production
   ```

2. **Set up SSL**:
   ```env
   DB_SSL=true
   DB_SSL_CERT=path/to/certificate
   ```

## Security Considerations

### Supabase Cloud
- ✅ Managed by Supabase (SOC2, HIPAA ready)
- ✅ Automatic backups and updates
- ✅ Built-in RLS (Row Level Security)
- ✅ API key management

### Self-hosted Supabase
- ✅ Full control over data
- ✅ Custom security policies
- ❌ Requires infrastructure management
- ❌ Manual backup responsibility

### Traditional PostgreSQL
- ✅ Maximum control and customization
- ❌ Requires PostgreSQL expertise
- ❌ Manual security hardening
- ❌ Infrastructure management overhead

## Performance Optimization

### Connection Pooling

```typescript
// knexfile.ts production config
pool: {
  min: 2,
  max: 20,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
}
```

### Indexes (Auto-created)

- `platform.tenants.subdomain` (unique)
- `platform.users.tenant_id`
- `platform.users.email` (unique)
- `platform.audit_logs.tenant_id`
- `billing.usage.tenant_id`
- `billing.usage.resource_type`

## Monitoring

### Application Metrics

```bash
# Database response times
curl http://localhost:3000/api/database/health

# Table statistics
curl http://localhost:3000/api/database/stats
```

### Supabase Dashboard

- **Database**: Query performance and usage
- **API**: Request logs and analytics
- **Auth**: User authentication metrics
- **Storage**: File storage usage

This setup provides maximum flexibility while maintaining compatibility with all three database deployment options.