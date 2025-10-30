import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Enable UUID extension
  await knex.raw('CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"');

  // Create platform schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS platform');

  // Create platform.tenants table
  await knex.schema.withSchema('platform').createTable('tenants', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('subdomain').unique();
    table.string('region').defaultTo('global');
    table.string('plan_tier').defaultTo('free');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create platform.users table
  await knex.schema.withSchema('platform').createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('email').unique().notNullable();
    table.string('hashed_password');
    table.string('first_name');
    table.string('last_name');
    table.string('role').defaultTo('user');
    table.jsonb('permissions').defaultTo('[]');
    table.boolean('mfa_enabled').defaultTo(false);
    table.string('mfa_secret');
    table.boolean('email_verified').defaultTo(false);
    table.string('email_verification_token');
    table.timestamp('email_verified_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create platform.audit_logs table
  await knex.schema.withSchema('platform').createTable('audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('platform.users');
    table.string('action').notNullable();
    table.string('resource_type');
    table.uuid('resource_id');
    table.jsonb('details').defaultTo('{}');
    table.string('ip_address');
    table.string('user_agent');
    table.string('outcome').defaultTo('success');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Enable RLS on tables
  await knex.raw(`
  ALTER TABLE "platform"."tenants" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "platform"."users" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "platform"."audit_logs" ENABLE ROW LEVEL SECURITY;

  -- Basic tenant isolation policy (refine later)
  CREATE POLICY tenant_isolation_tenants ON "platform"."tenants" USING (true); -- Admins can see all
  CREATE POLICY tenant_isolation_users ON "platform"."users" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  CREATE POLICY tenant_isolation_audit ON "platform"."audit_logs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('platform').dropTableIfExists('audit_logs');
  await knex.schema.withSchema('platform').dropTableIfExists('users');
  await knex.schema.withSchema('platform').dropTableIfExists('tenants');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_audit ON "platform"."audit_logs"');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_users ON "platform"."users"');
  await knex.raw('DROP POLICY IF EXISTS tenant_isolation_tenants ON "platform"."tenants"');
  await knex.raw('DROP SCHEMA IF EXISTS platform CASCADE');
  await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}
