require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCompleteMigration() {
  try {
    console.log('🚀 Starting BusinessOS Complete Migration...');
    
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knex_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Check migrations table structure
    const { rows: existingMigrations } = await pool.query('SELECT name FROM knex_migrations ORDER BY batch, name');
    const executedMigrations = new Set(existingMigrations.map(r => r.name));
    
    console.log(`🔍 Found ${executedMigrations.size} already executed migrations`);
    
    // Core Platform Tables
    if (!executedMigrations.has('001_core_platform')) {
      console.log('\n📊 Creating core platform tables...');
      
      await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      
      // Tenants (ensure exists)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(255) NOT NULL,
          domain VARCHAR(255),
          settings JSONB DEFAULT '{}',
          ai_config JSONB DEFAULT '{}',
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        );
      `);
      
      // Users
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
      
      // Audit Logs
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
      
      // Refresh Tokens
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
      
      // Record migration
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['001_core_platform', 1]);
      console.log('✅ Core platform tables created');
    }
    
    // Billing Tables
    if (!executedMigrations.has('002_billing_tables')) {
      console.log('\n💰 Creating billing tables...');
      
      // Subscriptions
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
      
      // Usage Tracking
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
      
      // Invoices
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
      
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['002_billing_tables', 2]);
      console.log('✅ Billing tables created');
    }
    
    // AI Platform Tables
    if (!executedMigrations.has('003_ai_tables')) {
      console.log('\n🤖 Creating AI platform tables...');
      
      // AI Providers
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_providers (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          provider_name VARCHAR(100) NOT NULL,
          provider_type VARCHAR(50) NOT NULL,
          api_key_encrypted TEXT,
          base_url VARCHAR(500),
          is_active BOOLEAN DEFAULT true,
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tenant_id, provider_name)
        );
      `);
      
      // AI Models
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_models (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
          model_name VARCHAR(200) NOT NULL,
          model_type VARCHAR(50) NOT NULL,
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
      
      // AI Conversations
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
      
      // AI Messages
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ai_messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          tokens_used INTEGER DEFAULT 0,
          cost DECIMAL(10,4) DEFAULT 0,
          model_used VARCHAR(200),
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // AI Usage Logs
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
      
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['003_ai_tables', 3]);
      console.log('✅ AI platform tables created');
    }
    
    // CRM Tables
    if (!executedMigrations.has('004_crm_tables')) {
      console.log('\n👥 Creating CRM tables...');
      
      // Contacts
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
      
      // Companies
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
      
      // Deals
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
      
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['004_crm_tables', 4]);
      console.log('✅ CRM tables created');
    }
    
    // Projects Tables
    if (!executedMigrations.has('005_projects_tables')) {
      console.log('\n📋 Creating projects tables...');
      
      // Projects
      await pool.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'active',
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
      
      // Tasks
      await pool.query(`
        CREATE TABLE IF NOT EXISTS project_tasks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'todo',
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
      
      // Comments
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
      
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['005_projects_tables', 5]);
      console.log('✅ Projects tables created');
    }
    
    // Workflow Tables
    if (!executedMigrations.has('006_workflow_tables')) {
      console.log('\n⚡ Creating workflow tables...');
      
      // Workflows
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workflows (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'draft',
          trigger_type VARCHAR(100) NOT NULL,
          trigger_config JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT false,
          version INTEGER DEFAULT 1,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Workflow Nodes
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
      
      // Workflow Connections
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
      
      // Workflow Executions
      await pool.query(`
        CREATE TABLE IF NOT EXISTS workflow_executions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
          status VARCHAR(50) DEFAULT 'running',
          trigger_data JSONB DEFAULT '{}',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          execution_log JSONB DEFAULT '[]'
        );
      `);
      
      await pool.query('INSERT INTO knex_migrations (name, batch) VALUES ($1, $2)', ['006_workflow_tables', 6]);
      console.log('✅ Workflow tables created');
    }
    
    console.log('\n🎉 All BusinessOS migrations completed successfully!');
    console.log('\n📊 Database Schema Summary:');
    console.log('  ✅ Core Platform (tenants, users, audit, tokens)');
    console.log('  ✅ Billing (subscriptions, usage, invoices)');
    console.log('  ✅ AI Platform (providers, models, conversations, messages)');
    console.log('  ✅ CRM (contacts, companies, deals)');
    console.log('  ✅ Projects (projects, tasks, comments)');
    console.log('  ✅ Workflows (workflows, nodes, executions)');
    console.log('\n🚀 Your BusinessOS platform is ready to go!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runCompleteMigration();