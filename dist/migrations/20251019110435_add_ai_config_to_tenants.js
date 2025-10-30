"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.alterTable('platform.tenants', (table) => {
        table.jsonb('ai_config').defaultTo(null); // Store AI provider configuration
    });
}
async function down(knex) {
    await knex.schema.alterTable('platform.tenants', (table) => {
        table.dropColumn('ai_config');
    });
}
//# sourceMappingURL=20251019110435_add_ai_config_to_tenants.js.map