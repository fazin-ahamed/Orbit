require('dotenv').config();

const knex = require('knex');
const fs = require('fs');

console.log('🚀 Running AI migration...');

const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'businessos_dev',
  },
});

async function runAIMigration() {
  try {
    console.log('🔄 Creating AI schema and tables...');

    // Create AI schema
    await db.raw('CREATE SCHEMA IF NOT EXISTS ai');

    // Set search path to include ai schema
    await db.raw('SET search_path TO ai, platform, public');

    // Create model configurations table
    await db.schema.createTable('model_configs', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
      table.string('provider').notNullable();
      table.text('api_key_encrypted');
      table.string('model_chat').defaultTo('gpt-4o-mini');
      table.string('model_embedding').defaultTo('text-embedding-3-small');
      table.string('fallback_provider');
      table.integer('max_tokens_per_month').defaultTo(100000);
      table.boolean('enabled').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.index(['tenant_id']);
      table.index(['provider']);
    });

    // Create vectors table (simplified version for basic functionality)
    await db.schema.createTable('vectors', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
      table.uuid('source_id').notNullable();
      table.text('content_chunk').notNullable();
      table.text('embedding'); // Store as JSON string for now
      table.jsonb('metadata').defaultTo('{}');
      table.timestamp('created_at').defaultTo(db.fn.now());

      table.index(['tenant_id']);
      table.index(['source_id']);
    });

    // Create prompt templates table
    await db.schema.createTable('prompt_templates', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
      table.string('module').notNullable();
      table.string('name').notNullable();
      table.text('template').notNullable();
      table.jsonb('variables').defaultTo('[]');
      table.jsonb('model_params').defaultTo('{}');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());

      table.index(['tenant_id']);
      table.index(['module']);
      table.unique(['tenant_id', 'module', 'name']);
    });

    // Create usage logs table
    await db.schema.createTable('usage_logs', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('platform.users');
      table.string('provider').notNullable();
      table.string('model').notNullable();
      table.string('operation').notNullable();
      table.integer('tokens_used').notNullable();
      table.integer('tokens_prompt').notNullable();
      table.integer('tokens_completion').notNullable();
      table.decimal('cost_usd', 10, 6);
      table.jsonb('request_metadata').defaultTo('{}');
      table.jsonb('response_metadata').defaultTo('{}');
      table.string('status').defaultTo('success');
      table.text('error_message');
      table.timestamp('created_at').defaultTo(db.fn.now());

      table.index(['tenant_id', 'created_at']);
      table.index(['provider', 'model']);
    });

    // Enable RLS
    await db.raw(`
      ALTER TABLE "ai"."model_configs" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "ai"."vectors" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "ai"."prompt_templates" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "ai"."usage_logs" ENABLE ROW LEVEL SECURITY;
    `);

    // Create RLS policies
    await db.raw(`
      DROP POLICY IF EXISTS tenant_isolation_model_configs ON "ai"."model_configs";
      DROP POLICY IF EXISTS tenant_isolation_vectors ON "ai"."vectors";
      DROP POLICY IF EXISTS tenant_isolation_prompt_templates ON "ai"."prompt_templates";
      DROP POLICY IF EXISTS tenant_isolation_usage_logs ON "ai"."usage_logs";

      CREATE POLICY tenant_isolation_model_configs ON "ai"."model_configs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
      CREATE POLICY tenant_isolation_vectors ON "ai"."vectors" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
      CREATE POLICY tenant_isolation_prompt_templates ON "ai"."prompt_templates" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
      CREATE POLICY tenant_isolation_usage_logs ON "ai"."usage_logs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
    `);

    console.log('🎉 AI tables created successfully!');

    // Verify tables were created
    const tables = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'ai'
      ORDER BY table_name;
    `);

    if (tables.rows.length > 0) {
      console.log('✅ AI Tables created:');
      tables.rows.forEach(table => {
        console.log(`  📋 ${table.table_name}`);
      });
    }

    // Test AI configuration
    console.log('\n🧪 Testing AI functionality...');

    // Insert default model configuration for test tenant
    await db('ai.model_configs').insert({
      tenant_id: '00000000-0000-0000-0000-000000000000',
      provider: 'openai',
      model_chat: 'gpt-4o-mini',
      model_embedding: 'text-embedding-3-small',
      max_tokens_per_month: 100000,
      enabled: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    console.log('✅ Default AI model configuration inserted');

    // Insert default prompt templates
    const defaultTemplates = [
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        module: 'crm',
        name: 'lead_scoring',
        template: 'Analyze this lead and provide a score from 1-10 based on fit for our business:\n\nCompany: {company}\nIndustry: {industry}\nSize: {company_size}\n\nScore factors: industry relevance, company size fit, budget likelihood.\n\nProvide score and brief justification.',
        variables: JSON.stringify(['company', 'industry', 'company_size']),
        model_params: JSON.stringify({ temperature: 0.3, max_tokens: 300 }),
      },
      {
        tenant_id: '00000000-0000-0000-0000-000000000000',
        module: 'projects',
        name: 'task_prioritization',
        template: 'Help prioritize these project tasks:\n\n{task_list}\n\nConsider: business impact, dependencies, deadlines.\n\nProvide prioritized list with reasoning.',
        variables: JSON.stringify(['task_list']),
        model_params: JSON.stringify({ temperature: 0.2, max_tokens: 400 }),
      },
    ];

    for (const template of defaultTemplates) {
      await db('ai.prompt_templates').insert(template);
    }

    console.log('✅ Default prompt templates inserted');

  } catch (error) {
    console.error('❌ Error creating AI tables:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

runAIMigration();