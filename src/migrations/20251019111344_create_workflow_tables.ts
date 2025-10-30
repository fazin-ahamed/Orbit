import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create workflow schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS workflow');

  // Create workflows table
  await knex.schema.withSchema('workflow').createTable('workflows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('status').defaultTo('draft'); // 'draft', 'active', 'paused', 'archived'
    table.jsonb('nodes').defaultTo('[]'); // Array of workflow nodes
    table.jsonb('edges').defaultTo('[]'); // Array of connections between nodes
    table.jsonb('triggers').defaultTo('[]'); // Array of trigger configurations
    table.jsonb('variables').defaultTo('{}'); // Workflow variables
    table.boolean('is_template').defaultTo(false);
    table.uuid('created_by').references('id').inTable('platform.users');
    table.uuid('updated_by').references('id').inTable('platform.users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['status']);
    table.index(['is_template']);
  });

  // Create workflow executions table
  await knex.schema.withSchema('workflow').createTable('executions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('workflow_id').notNullable().references('id').inTable('workflow.workflows').onDelete('CASCADE');
    table.string('status').defaultTo('running'); // 'running', 'completed', 'failed', 'cancelled'
    table.jsonb('trigger_data').defaultTo('{}'); // Data that triggered the workflow
    table.jsonb('execution_data').defaultTo('{}'); // Current execution state
    table.jsonb('results').defaultTo('{}'); // Final results
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.integer('duration_ms'); // Execution duration in milliseconds
    table.text('error_message');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['workflow_id']);
    table.index(['status']);
    table.index(['started_at']);
  });

  // Create workflow execution steps table
  await knex.schema.withSchema('workflow').createTable('execution_steps', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('execution_id').notNullable().references('id').inTable('workflow.executions').onDelete('CASCADE');
    table.string('node_id').notNullable(); // Node ID from the workflow
    table.string('node_type').notNullable(); // 'trigger', 'action', 'condition', 'delay'
    table.string('status').defaultTo('pending'); // 'pending', 'running', 'completed', 'failed', 'skipped'
    table.jsonb('input_data').defaultTo('{}');
    table.jsonb('output_data').defaultTo('{}');
    table.timestamp('started_at');
    table.timestamp('completed_at');
    table.integer('duration_ms');
    table.text('error_message');
    table.integer('retry_count').defaultTo(0);
    table.timestamp('next_retry_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['execution_id']);
    table.index(['node_id']);
    table.index(['status']);
  });

  // Create workflow triggers table (for event-driven workflows)
  await knex.schema.withSchema('workflow').createTable('triggers', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('event_type').notNullable(); // 'webhook', 'schedule', 'crm.lead.created', 'email.received', etc.
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('config').defaultTo('{}'); // Trigger-specific configuration
    table.boolean('is_active').defaultTo(true);
    table.uuid('created_by').references('id').inTable('platform.users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['event_type']);
    table.index(['is_active']);
  });

  // Create workflow trigger workflows table (many-to-many)
  await knex.schema.withSchema('workflow').createTable('trigger_workflows', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('trigger_id').notNullable().references('id').inTable('workflow.triggers').onDelete('CASCADE');
    table.uuid('workflow_id').notNullable().references('id').inTable('workflow.workflows').onDelete('CASCADE');
    table.jsonb('conditions').defaultTo('{}'); // Additional conditions for triggering
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['trigger_id', 'workflow_id']);
    table.index(['trigger_id']);
    table.index(['workflow_id']);
  });

  // Create workflow templates table
  await knex.schema.withSchema('workflow').createTable('templates', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.string('category').notNullable(); // 'crm', 'marketing', 'operations', 'finance'
    table.jsonb('nodes').notNullable();
    table.jsonb('edges').notNullable();
    table.jsonb('metadata').defaultTo('{}'); // Template metadata
    table.boolean('is_public').defaultTo(true);
    table.uuid('created_by').references('id').inTable('platform.users');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['category']);
    table.index(['is_public']);
  });

  // Enable RLS on workflow tables
  await knex.raw(`
    ALTER TABLE \"workflow\".\"workflows\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"workflow\".\"executions\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"workflow\".\"execution_steps\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"workflow\".\"triggers\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"workflow\".\"trigger_workflows\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"workflow\".\"templates\" ENABLE ROW LEVEL SECURITY;

    -- Tenant isolation policies
    CREATE POLICY tenant_isolation_workflows ON \"workflow\".\"workflows\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_executions ON \"workflow\".\"executions\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_execution_steps ON \"workflow\".\"execution_steps\" USING (\"execution_id\" IN (SELECT id FROM \"workflow\".\"executions\" WHERE \"tenant_id\" = current_setting('app.current_tenant_id')::uuid));
    CREATE POLICY tenant_isolation_triggers ON \"workflow\".\"triggers\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_trigger_workflows ON \"workflow\".\"trigger_workflows\" USING (\"trigger_id\" IN (SELECT id FROM \"workflow\".\"triggers\" WHERE \"tenant_id\" = current_setting('app.current_tenant_id')::uuid));
    CREATE POLICY tenant_isolation_templates ON \"workflow\".\"templates\" USING (\"is_public\" = true OR \"created_by\" IN (SELECT id FROM \"platform\".\"users\" WHERE \"tenant_id\" = current_setting('app.current_tenant_id')::uuid));
  `);

  // Insert some default workflow templates
  const defaultTemplates = [
    {
      name: 'Lead Nurture Automation',
      description: 'Automatically nurture new leads with email sequences and follow-ups',
      category: 'crm',
      nodes: JSON.stringify([
        {
          id: 'trigger-lead-created',
          type: 'trigger',
          data: { event: 'crm.lead.created', label: 'New Lead Created' }
        },
        {
          id: 'delay-1-day',
          type: 'delay',
          data: { duration: 86400, unit: 'seconds', label: 'Wait 1 Day' }
        },
        {
          id: 'send-welcome-email',
          type: 'action',
          data: { action: 'send_email', template: 'welcome', label: 'Send Welcome Email' }
        }
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'trigger-lead-created', target: 'delay-1-day' },
        { id: 'e2', source: 'delay-1-day', target: 'send-welcome-email' }
      ]),
      metadata: JSON.stringify({
        tags: ['crm', 'email', 'automation'],
        estimated_duration: '1 day'
      })
    },
    {
      name: 'Invoice Payment Reminder',
      description: 'Send automated payment reminders for overdue invoices',
      category: 'finance',
      nodes: JSON.stringify([
        {
          id: 'trigger-invoice-overdue',
          type: 'trigger',
          data: { event: 'billing.invoice.overdue', label: 'Invoice Overdue' }
        },
        {
          id: 'send-reminder-1',
          type: 'action',
          data: { action: 'send_email', template: 'payment_reminder_1', label: 'Send First Reminder' }
        },
        {
          id: 'delay-3-days',
          type: 'delay',
          data: { duration: 259200, unit: 'seconds', label: 'Wait 3 Days' }
        },
        {
          id: 'send-reminder-2',
          type: 'action',
          data: { action: 'send_email', template: 'payment_reminder_2', label: 'Send Second Reminder' }
        }
      ]),
      edges: JSON.stringify([
        { id: 'e1', source: 'trigger-invoice-overdue', target: 'send-reminder-1' },
        { id: 'e2', source: 'send-reminder-1', target: 'delay-3-days' },
        { id: 'e3', source: 'delay-3-days', target: 'send-reminder-2' }
      ]),
      metadata: JSON.stringify({
        tags: ['finance', 'billing', 'reminders'],
        estimated_duration: '3 days'
      })
    }
  ];

  for (const template of defaultTemplates) {
    await knex('workflow.templates').insert(template);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('workflow').dropTableIfExists('trigger_workflows');
  await knex.schema.withSchema('workflow').dropTableIfExists('triggers');
  await knex.schema.withSchema('workflow').dropTableIfExists('execution_steps');
  await knex.schema.withSchema('workflow').dropTableIfExists('executions');
  await knex.schema.withSchema('workflow').dropTableIfExists('workflows');
  await knex.schema.withSchema('workflow').dropTableIfExists('templates');

  await knex.raw('DROP SCHEMA IF EXISTS workflow CASCADE');

  // Drop policies
  await knex.raw(`
    DROP POLICY IF EXISTS tenant_isolation_trigger_workflows ON \"workflow\".\"trigger_workflows\";
    DROP POLICY IF EXISTS tenant_isolation_triggers ON \"workflow\".\"triggers\";
    DROP POLICY IF EXISTS tenant_isolation_execution_steps ON \"workflow\".\"execution_steps\";
    DROP POLICY IF EXISTS tenant_isolation_executions ON \"workflow\".\"executions\";
    DROP POLICY IF EXISTS tenant_isolation_workflows ON \"workflow\".\"workflows\";
    DROP POLICY IF EXISTS tenant_isolation_templates ON \"workflow\".\"templates\";
  `);
}
