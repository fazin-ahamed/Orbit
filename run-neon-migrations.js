require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log('🚀 Starting BusinessOS migrations...');
    
    // Create knex_migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knex_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Get list of migrations
    const migrationsDir = './src/migrations';
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.ts'))
      .sort();
    
    console.log(`📁 Found ${files.length} migration files:`);
    files.forEach(file => console.log(`   - ${file}`));
    
    // Check which migrations have been run
    const { rows: existingMigrations } = await pool.query('SELECT name FROM knex_migrations ORDER BY batch, name');
    const executedMigrations = new Set(existingMigrations.map(r => r.name));
    
    console.log(`🔍 Found ${executedMigrations.size} already executed migrations`);
    
    // Run pending migrations
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        console.log(`\n🔄 Running migration: ${file}`);
        
        // Simple table creation approach for now
        // In production, you'd use a proper migration parser
        if (file === '001_initial_platform.ts') {
          await createInitialPlatform();
        } else if (file === '002_billing_tables.ts') {
          await createBillingTables();
        } else if (file === '003_ai_tables.ts') {
          await createAiTables();
        } else if (file === '20251019110435_add_ai_config_to_tenants.ts') {
          await addAiConfigToTenants();
        } else if (file === '20251019111251_create_crm_tables.ts') {
          await createCrmTables();
        } else if (file === '20251019111344_create_workflow_tables.ts') {
          await createWorkflowTables();
        } else if (file === '20251019111504_create_projects_tables.ts') {
          await createProjectsTables();
        }
        
        // Record migration as executed
        await pool.query('INSERT INTO knex_migrations (name, batch) VALUES (?, ?)', [file, 1]);
        console.log(`✅ Migration ${file} completed`);
      }
    }
    
    console.log('\n🎉 All migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Migration functions
async function createInitialPlatform() {
  console.log('  Creating initial platform tables...');
  
  // Enable necessary extensions
  await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  
  // Create tenants table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      settings JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      email_verified BOOLEAN DEFAULT false,
      mfa_enabled BOOLEAN DEFAULT false,
      mfa_secret VARCHAR(255),
      last_login TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create audit_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      resource_id VARCHAR(255),
      metadata JSONB DEFAULT '{}',
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create refresh_tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) UNIQUE NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('  ✅ Initial platform tables created');
}

async function createBillingTables() {
  console.log('  Creating billing tables...');
  
  // Create subscriptions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      stripe_subscription_id VARCHAR(255) UNIQUE,
      stripe_customer_id VARCHAR(255),
      plan_name VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL,
      current_period_start TIMESTAMP WITH TIME ZONE,
      current_period_end TIMESTAMP WITH TIME ZONE,
      cancel_at_period_end BOOLEAN DEFAULT false,
      canceled_at TIMESTAMP WITH TIME ZONE,
      trial_end TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create usage_tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usage_tracking (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      metric_name VARCHAR(100) NOT NULL,
      metric_value INTEGER NOT NULL,
      period_start TIMESTAMP WITH TIME ZONE NOT NULL,
      period_end TIMESTAMP WITH TIME ZONE NOT NULL,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create invoices table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      stripe_invoice_id VARCHAR(255) UNIQUE,
      amount_due INTEGER,
      amount_paid INTEGER,
      currency VARCHAR(3) DEFAULT 'usd',
      status VARCHAR(50),
      invoice_date TIMESTAMP WITH TIME ZONE,
      due_date TIMESTAMP WITH TIME ZONE,
      paid_at TIMESTAMP WITH TIME ZONE,
      hosted_invoice_url VARCHAR(500),
      invoice_pdf VARCHAR(500),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('  ✅ Billing tables created');
}

async function createAiTables() {
  console.log('  Creating AI platform tables...');
  
  // Create ai_providers table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_providers (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider_name VARCHAR(100) NOT NULL,
      provider_type VARCHAR(50) NOT NULL, -- openai, anthropic, groq, etc.
      api_key_encrypted TEXT,
      base_url VARCHAR(500),
      is_active BOOLEAN DEFAULT true,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, provider_name)
    );
  `);
  
  // Create ai_models table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_models (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      model_name VARCHAR(200) NOT NULL,
      model_type VARCHAR(50) NOT NULL, -- text, chat, embedding, etc.
      context_length INTEGER,
      cost_per_input DECIMAL(10,6),
      cost_per_output DECIMAL(10,6),
      is_active BOOLEAN DEFAULT true,
      settings JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(tenant_id, provider_id, model_name)
    );
  `);
  
  // Create ai_conversations table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      title VARCHAR(255),
      provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
      total_tokens INTEGER DEFAULT 0,
      total_cost DECIMAL(10,4) DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create ai_messages table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL, -- user, assistant, system
      content TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0,
      cost DECIMAL(10,4) DEFAULT 0,
      model_used VARCHAR(200),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create vector_documents table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vector_documents (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title VARCHAR(500),
      content TEXT NOT NULL,
      content_type VARCHAR(100) DEFAULT 'text',
      metadata JSONB DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create vector_embeddings table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vector_embeddings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      document_id UUID NOT NULL REFERENCES vector_documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content_chunk TEXT NOT NULL,
      embedding VECTOR(1536), -- OpenAI ada-002 dimension
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create ai_usage_logs table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
      provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
      model_id UUID NOT NULL REFERENCES ai_models(id) ON DELETE CASCADE,
      request_type VARCHAR(50) NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      cost DECIMAL(10,4) DEFAULT 0,
      response_time_ms INTEGER,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('  ✅ AI platform tables created');
}

async function addAiConfigToTenants() {
  console.log('  Adding AI config to tenants...');
  
  await pool.query(`
    ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{}';
  `);
  
  console.log('  ✅ AI config column added to tenants');
}

async function createCrmTables() {
  console.log('  Creating CRM tables...');
  
  // Create contacts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(255),
      phone VARCHAR(50),
      company VARCHAR(200),
      title VARCHAR(200),
      status VARCHAR(50) DEFAULT 'active',
      source VARCHAR(100),
      tags TEXT[],
      custom_fields JSONB DEFAULT '{}',
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create companies table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      domain VARCHAR(255),
      industry VARCHAR(100),
      size VARCHAR(50),
      location VARCHAR(255),
      phone VARCHAR(50),
      custom_fields JSONB DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create deals table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
      company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
      value DECIMAL(15,2),
      currency VARCHAR(3) DEFAULT 'USD',
      stage VARCHAR(100) NOT NULL,
      probability INTEGER DEFAULT 0,
      expected_close_date DATE,
      actual_close_date DATE,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  console.log('  ✅ CRM tables created');
}

async function createWorkflowTables() {
  console.log('  Creating workflow tables...');
  
  // Create workflows table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft', -- draft, active, paused, archived
      trigger_type VARCHAR(100) NOT NULL,
      trigger_config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT false,
      version INTEGER DEFAULT 1,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create workflow_nodes table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_nodes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      node_id VARCHAR(100) NOT NULL,
      node_type VARCHAR(100) NOT NULL,
      position_x DECIMAL(10,2) NOT NULL,
      position_y DECIMAL(10,2) NOT NULL,
      config JSONB DEFAULT '{}',
      data JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create workflow_connections table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_connections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      source_node_id VARCHAR(100) NOT NULL,
      target_node_id VARCHAR(100) NOT NULL,
      source_handle VARCHAR(100),
      target_handle VARCHAR(100),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Create workflow_executions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_executions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
      status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, cancelled
      trigger_data JSONB DEFAULT '{}',
      started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP WITH TIME ZONE,
      error_message TEXT,
      execution_log JSONB DEFAULT '[]'
    );
  `);
  
  console.log('  ✅ Workflow tables created');
}

async function createProjectsTables() {
  console.log('  Creating projects tables...');
  
  // Create projects table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'active', -- active, paused, completed, archived
      priority VARCHAR(50) DEFAULT 'medium',
      start_date DATE,
      end_date DATE,
      budget DECIMAL(15,2),
      currency VARCHAR(3) DEFAULT 'USD',
      progress INTEGER DEFAULT 0,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create project_tasks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'todo', -- todo, in_progress, in_review, done
      priority VARCHAR(50) DEFAULT 'medium',
      due_date DATE,
      estimated_hours DECIMAL(5,2),
      actual_hours DECIMAL(5,2) DEFAULT 0,
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE
    );
  `);
  
  // Create project_comments table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      task_id UUID REFERENCES project_tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('  ✅ Projects tables created');
}

// Run migrations
runMigrations();