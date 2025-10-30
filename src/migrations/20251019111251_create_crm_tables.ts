import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create CRM schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS crm');

  // Create CRM pipelines table first (referenced by leads)
  await knex.schema.withSchema('crm').createTable('pipelines', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('stages').defaultTo('[]'); // Array of stage objects: [{id, name, order, probability}]
    table.boolean('is_default').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['is_active']);
  });

  // Create CRM contacts table
  await knex.schema.withSchema('crm').createTable('contacts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').unique();
    table.string('phone');
    table.string('company');
    table.string('job_title');
    table.string('source'); // 'website', 'referral', 'social', 'cold_outreach', etc.
    table.string('status').defaultTo('active'); // 'active', 'inactive', 'unsubscribed'
    table.jsonb('custom_fields').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['email']);
    table.index(['status']);
  });

  // Create CRM leads table
  await knex.schema.withSchema('crm').createTable('leads', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('contact_id').references('id').inTable('crm.contacts').onDelete('SET NULL');
    table.string('title').notNullable();
    table.text('description');
    table.decimal('value', 15, 2); // Potential deal value
    table.string('currency').defaultTo('USD');
    table.string('status').defaultTo('new'); // 'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    table.string('priority').defaultTo('medium'); // 'low', 'medium', 'high', 'urgent'
    table.uuid('assigned_to').references('id').inTable('platform.users');
    table.uuid('pipeline_id').references('id').inTable('crm.pipelines');
    table.integer('pipeline_stage').defaultTo(1);
    table.date('expected_close_date');
    table.jsonb('tags').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['status']);
    table.index(['assigned_to']);
    table.index(['pipeline_id']);
  });

  // Create CRM deals table (won leads)
  await knex.schema.withSchema('crm').createTable('deals', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('lead_id').notNullable().references('id').inTable('crm.leads').onDelete('CASCADE');
    table.string('deal_number').unique();
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency').defaultTo('USD');
    table.date('close_date').notNullable();
    table.text('terms');
    table.jsonb('products_services').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['lead_id']);
    table.index(['close_date']);
  });

  // Create CRM activities table
  await knex.schema.withSchema('crm').createTable('activities', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('lead_id').references('id').inTable('crm.leads').onDelete('CASCADE');
    table.uuid('contact_id').references('id').inTable('crm.contacts').onDelete('CASCADE');
    table.uuid('user_id').notNullable().references('id').inTable('platform.users');
    table.string('type').notNullable(); // 'call', 'email', 'meeting', 'note', 'task'
    table.string('subject').notNullable();
    table.text('description');
    table.timestamp('scheduled_at');
    table.timestamp('completed_at');
    table.string('outcome'); // 'completed', 'cancelled', 'rescheduled'
    table.integer('duration_minutes'); // For calls/meetings
    table.jsonb('metadata').defaultTo('{}'); // Additional data like email content, call notes
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['lead_id']);
    table.index(['contact_id']);
    table.index(['user_id']);
    table.index(['type']);
    table.index(['scheduled_at']);
  });

  // Create CRM campaigns table
  await knex.schema.withSchema('crm').createTable('campaigns', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('type').notNullable(); // 'email', 'social', 'webinar', 'event'
    table.string('status').defaultTo('draft'); // 'draft', 'active', 'paused', 'completed'
    table.date('start_date');
    table.date('end_date');
    table.decimal('budget', 12, 2);
    table.string('currency').defaultTo('USD');
    table.jsonb('target_criteria').defaultTo('{}'); // Filters for target audience
    table.jsonb('performance_metrics').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['status']);
    table.index(['type']);
  });

  // Enable RLS on CRM tables
  await knex.raw(`
    ALTER TABLE \"crm\".\"contacts\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"crm\".\"leads\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"crm\".\"pipelines\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"crm\".\"deals\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"crm\".\"activities\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"crm\".\"campaigns\" ENABLE ROW LEVEL SECURITY;

    -- Tenant isolation policies
    CREATE POLICY tenant_isolation_contacts ON \"crm\".\"contacts\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_leads ON \"crm\".\"leads\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_pipelines ON \"crm\".\"pipelines\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_deals ON \"crm\".\"deals\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_activities ON \"crm\".\"activities\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_campaigns ON \"crm\".\"campaigns\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
  `);

  // Note: Default pipeline will be inserted programmatically after tenant creation
  // await knex('crm.pipelines').insert({
  //   tenant_id: '00000000-0000-0000-0000-000000000000', // Default tenant
  //   name: 'Default Sales Pipeline',
  //   description: 'Standard sales pipeline with common stages',
  //   stages: JSON.stringify([
  //     { id: 1, name: 'Lead', order: 1, probability: 10 },
  //     { id: 2, name: 'Contact Made', order: 2, probability: 20 },
  //     { id: 3, name: 'Qualified', order: 3, probability: 40 },
  //     { id: 4, name: 'Proposal', order: 4, probability: 60 },
  //     { id: 5, name: 'Negotiation', order: 5, probability: 80 },
  //     { id: 6, name: 'Closed Won', order: 6, probability: 100 },
  //     { id: 7, name: 'Closed Lost', order: 7, probability: 0 }
  //   ]),
  //   is_default: true,
  //   is_active: true
  // });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('crm').dropTableIfExists('campaigns');
  await knex.schema.withSchema('crm').dropTableIfExists('activities');
  await knex.schema.withSchema('crm').dropTableIfExists('deals');
  await knex.schema.withSchema('crm').dropTableIfExists('leads');
  await knex.schema.withSchema('crm').dropTableIfExists('contacts');
  await knex.schema.withSchema('crm').dropTableIfExists('pipelines');

  await knex.raw('DROP SCHEMA IF EXISTS crm CASCADE');

  // Drop policies
  await knex.raw(`
    DROP POLICY IF EXISTS tenant_isolation_campaigns ON \"crm\".\"campaigns\";
    DROP POLICY IF EXISTS tenant_isolation_activities ON \"crm\".\"activities\";
    DROP POLICY IF EXISTS tenant_isolation_deals ON \"crm\".\"deals\";
    DROP POLICY IF EXISTS tenant_isolation_leads ON \"crm\".\"leads\";
    DROP POLICY IF EXISTS tenant_isolation_contacts ON \"crm\".\"contacts\";
    DROP POLICY IF EXISTS tenant_isolation_pipelines ON \"crm\".\"pipelines\";
  `);
}
