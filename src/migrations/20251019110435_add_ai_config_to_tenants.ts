import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('platform.tenants', (table) => {
    table.jsonb('ai_config').defaultTo(null); // Store AI provider configuration
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('platform.tenants', (table) => {
    table.dropColumn('ai_config');
  });
}
