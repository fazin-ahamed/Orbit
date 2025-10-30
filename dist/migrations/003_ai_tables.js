"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    // Enable PGVector extension if not exists
    try {
        await knex.raw('CREATE EXTENSION IF NOT EXISTS vector');
    }
    catch (error) {
        console.log('PGVector extension may not be available or already exists');
    }
    // Create AI schema
    await knex.raw('CREATE SCHEMA IF NOT EXISTS ai');
    // Create AI model configurations table
    await knex.schema.withSchema('ai').createTable('model_configs', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.string('provider').notNullable(); // 'openai', 'anthropic', 'groq', etc.
        table.text('api_key_encrypted');
        table.string('model_chat').defaultTo('gpt-4o-mini');
        table.string('model_embedding').defaultTo('text-embedding-3-small');
        table.string('fallback_provider');
        table.integer('max_tokens_per_month').defaultTo(100000);
        table.boolean('enabled').defaultTo(true);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        // Index for efficient queries
        table.index(['tenant_id']);
        table.index(['provider']);
    });
    // Create AI vectors table for RAG
    await knex.schema.withSchema('ai').createTable('vectors', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.uuid('source_id').notNullable(); // Reference to source document/content
        table.text('content_chunk').notNullable();
        table.specificType('embedding', 'vector(1536)'); // OpenAI embedding dimensions
        table.jsonb('metadata').defaultTo('{}'); // Additional context (page, chunk_index, etc.)
        table.timestamp('created_at').defaultTo(knex.fn.now());
        // Indexes for performance
        table.index(['tenant_id']);
        table.index(['source_id']);
        // Note: In production, create vector index: CREATE INDEX ON ai.vectors USING ivfflat (embedding vector_cosine_ops);
    });
    // Create AI prompt templates table
    await knex.schema.withSchema('ai').createTable('prompt_templates', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.string('module').notNullable(); // 'crm', 'projects', 'finance', etc.
        table.string('name').notNullable(); // Template name
        table.text('template').notNullable(); // Prompt template with variables
        table.jsonb('variables').defaultTo('[]'); // List of variable names
        table.jsonb('model_params').defaultTo('{}'); // Model parameters (temperature, etc.)
        table.boolean('is_active').defaultTo(true);
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        // Indexes
        table.index(['tenant_id']);
        table.index(['module']);
        table.unique(['tenant_id', 'module', 'name']); // Prevent duplicate templates
    });
    // Create AI usage logs table (extends billing.usage for AI-specific tracking)
    await knex.schema.withSchema('ai').createTable('usage_logs', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
        table.uuid('user_id').references('id').inTable('platform.users');
        table.string('provider').notNullable();
        table.string('model').notNullable();
        table.string('operation').notNullable(); // 'chat_completion', 'embedding', 'moderation'
        table.integer('tokens_used').notNullable();
        table.integer('tokens_prompt').notNullable();
        table.integer('tokens_completion').notNullable();
        table.decimal('cost_usd', 10, 6); // Estimated cost in USD
        table.jsonb('request_metadata').defaultTo('{}');
        table.jsonb('response_metadata').defaultTo('{}');
        table.string('status').defaultTo('success'); // 'success', 'error', 'timeout'
        table.text('error_message');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        // Indexes for analytics
        table.index(['tenant_id', 'created_at']);
        table.index(['provider', 'model']);
        table.index(['operation']);
    });
    // Enable RLS on AI tables
    await knex.raw(`
  ALTER TABLE "ai"."model_configs" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai"."vectors" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai"."prompt_templates" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "ai"."usage_logs" ENABLE ROW LEVEL SECURITY;

  -- Tenant isolation policies
  CREATE POLICY tenant_isolation_model_configs ON "ai"."model_configs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_vectors ON "ai"."vectors" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_prompt_templates ON "ai"."prompt_templates" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_usage_logs ON "ai"."usage_logs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  `);
    // Insert default prompt templates for common use cases
    const defaultTemplates = [
        {
            module: 'crm',
            name: 'lead_scoring',
            template: 'Analyze this lead and provide a score from 1-10 based on fit for our business:\n\nCompany: {company}\nIndustry: {industry}\nSize: {company_size}\nDescription: {description}\n\nScore factors to consider:\n- Industry relevance\n- Company size fit\n- Budget likelihood\n- Timeline urgency\n- Decision-making process\n\nProvide score and brief justification.',
            variables: ['company', 'industry', 'company_size', 'description'],
            model_params: { temperature: 0.3, max_tokens: 300 },
        },
        {
            module: 'projects',
            name: 'task_prioritization',
            template: 'Help prioritize these project tasks based on urgency and importance:\n\n{task_list}\n\nConsider:\n- Business impact\n- Dependencies\n- Resource availability\n- Deadlines\n\nProvide prioritized list with reasoning.',
            variables: ['task_list'],
            model_params: { temperature: 0.2, max_tokens: 400 },
        },
        {
            module: 'support',
            name: 'ticket_categorization',
            template: 'Categorize this support ticket and suggest priority level:\n\nTitle: {ticket_title}\nDescription: {ticket_description}\nCustomer: {customer_tier}\n\nCategories: Bug, Feature Request, Account Issue, General Question\nPriority: Low, Medium, High, Critical\n\nProvide category, priority, and brief reasoning.',
            variables: ['ticket_title', 'ticket_description', 'customer_tier'],
            model_params: { temperature: 0.1, max_tokens: 200 },
        },
    ];
    // Note: Default templates will be inserted programmatically after tenant creation
    // for (const template of defaultTemplates) {
    //   await knex('ai.prompt_templates').insert({
    //     tenant_id: '00000000-0000-0000-0000-000000000000', // Default tenant
    //     module: template.module,
    //     name: template.name,
    //     template: template.template,
    //     variables: JSON.stringify(template.variables),
    //     model_params: JSON.stringify(template.model_params),
    //     is_active: true,
    //   });
    // }
}
async function down(knex) {
    await knex.schema.withSchema('ai').dropTableIfExists('usage_logs');
    await knex.schema.withSchema('ai').dropTableIfExists('prompt_templates');
    await knex.schema.withSchema('ai').dropTableIfExists('vectors');
    await knex.schema.withSchema('ai').dropTableIfExists('model_configs');
    await knex.raw('DROP SCHEMA IF EXISTS ai CASCADE');
    // Drop policies
    await knex.raw('DROP POLICY IF EXISTS tenant_isolation_usage_logs ON "ai"."usage_logs"');
    await knex.raw('DROP POLICY IF EXISTS tenant_isolation_prompt_templates ON "ai"."prompt_templates"');
    await knex.raw('DROP POLICY IF EXISTS tenant_isolation_vectors ON "ai"."vectors"');
    await knex.raw('DROP POLICY IF EXISTS tenant_isolation_model_configs ON "ai"."model_configs"');
}
//# sourceMappingURL=003_ai_tables.js.map