import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create billing schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS billing');

  // Create billing.usage table for tracking resource usage
  await knex.schema.withSchema('billing').createTable('usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('resource_type').notNullable(); // ai_tokens, workflow_runs, api_calls, storage_mb
    table.integer('quantity').notNullable();
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for efficient queries
    table.index(['tenant_id', 'period_start']);
    table.index(['resource_type', 'period_start']);
  });

  // Create billing.subscriptions table for subscription management
  await knex.schema.withSchema('billing').createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('stripe_subscription_id').unique();
    table.string('stripe_customer_id');
    table.string('plan_tier').defaultTo('free');
    table.string('status').defaultTo('active');
    table.timestamp('current_period_start');
    table.timestamp('current_period_end');
    table.timestamp('cancel_at_period_end');
    table.jsonb('subscription_data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index for efficient queries
    table.index(['tenant_id']);
    table.index(['stripe_subscription_id']);
  });

  // Create billing.invoices table for invoice management
  await knex.schema.withSchema('billing').createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('stripe_invoice_id').unique();
    table.string('invoice_number');
    table.integer('amount_due'); // in cents
    table.integer('amount_paid'); // in cents
    table.string('currency').defaultTo('usd');
    table.string('status'); // draft, open, paid, void, uncollectible
    table.timestamp('invoice_date');
    table.timestamp('due_date');
    table.jsonb('invoice_data').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Index for efficient queries
    table.index(['tenant_id']);
    table.index(['stripe_invoice_id']);
    table.index(['status']);
  });

  // Enable RLS on billing tables
  await knex.raw(`
  ALTER TABLE "billing"."usage" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "billing"."subscriptions" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "billing"."invoices" ENABLE ROW LEVEL SECURITY;

  -- Tenant isolation policies
  CREATE POLICY tenant_isolation_usage ON "billing"."usage" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_subscriptions ON "billing"."subscriptions" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_invoices ON "billing"."invoices" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('billing').dropTableIfExists('invoices');
  await knex.schema.withSchema('billing').dropTableIfExists('subscriptions');
  await knex.schema.withSchema('billing').dropTableIfExists('usage');

  await knex.raw('DROP SCHEMA IF EXISTS billing CASCADE');

  // Drop policies
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_invoices ON "billing"."invoices"');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_subscriptions ON "billing"."subscriptions"');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_usage ON "billing"."usage"');
}