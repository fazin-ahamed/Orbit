import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create projects schema
  await knex.raw('CREATE SCHEMA IF NOT EXISTS projects');

  // Create projects table
  await knex.schema.withSchema('projects').createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('description');
    table.string('status').defaultTo('active'); // 'active', 'completed', 'on_hold', 'cancelled'
    table.date('start_date');
    table.date('due_date');
    table.decimal('budget', 12, 2);
    table.string('priority').defaultTo('medium'); // 'low', 'medium', 'high'
    table.uuid('owner_id').references('id').inTable('platform.users');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['status']);
    table.index(['owner_id']);
  });

  // Create tasks table
  await knex.schema.withSchema('projects').createTable('tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('platform.tenants').onDelete('CASCADE');
    table.uuid('project_id').references('id').inTable('projects.projects').onDelete('CASCADE');
    table.string('title').notNullable();
    table.text('description');
    table.string('status').defaultTo('todo'); // 'todo', 'in_progress', 'review', 'done'
    table.string('priority').defaultTo('medium'); // 'low', 'medium', 'high', 'urgent'
    table.uuid('assigned_to').references('id').inTable('platform.users');
    table.uuid('created_by').references('id').inTable('platform.users');
    table.date('due_date');
    table.integer('estimated_hours');
    table.jsonb('tags').defaultTo('[]');
    table.integer('order').defaultTo(0); // For kanban ordering
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id']);
    table.index(['project_id']);
    table.index(['status']);
    table.index(['assigned_to']);
  });

  // Enable RLS
  await knex.raw(`
    ALTER TABLE \"projects\".\"projects\" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE \"projects\".\"tasks\" ENABLE ROW LEVEL SECURITY;

    CREATE POLICY tenant_isolation_projects ON \"projects\".\"projects\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
    CREATE POLICY tenant_isolation_tasks ON \"projects\".\"tasks\" USING (\"tenant_id\" = current_setting('app.current_tenant_id')::uuid);
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.withSchema('projects').dropTableIfExists('tasks');
  await knex.schema.withSchema('projects').dropTableIfExists('projects');

  await knex.raw('DROP SCHEMA IF EXISTS projects CASCADE');

  await knex.raw(`
    DROP POLICY IF EXISTS tenant_isolation_tasks ON \"projects\".\"tasks\";
    DROP POLICY IF EXISTS tenant_isolation_projects ON \"projects\".\"projects\";
  `);
}
