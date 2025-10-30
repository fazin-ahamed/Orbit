require('dotenv').config();

const knex = require('knex');

console.log('🏗️ Creating database tables directly...');

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

async function createTablesDirectly() {
  try {
    console.log('🔄 Creating platform schema...');

    // Create platform schema
    await db.raw('CREATE SCHEMA IF NOT EXISTS platform');

    console.log('📋 Creating tenants table in platform schema...');

    // Set default schema to platform
    await db.raw('SET search_path TO platform, public');

    // Create tenants table
    await db.schema.createTable('tenants', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('subdomain').unique();
      table.string('region').defaultTo('global');
      table.string('plan_tier').defaultTo('free');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });

    console.log('📋 Creating users table in platform schema...');

    // Create users table
    await db.schema.createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.string('email').unique().notNullable();
      table.string('hashed_password');
      table.string('first_name');
      table.string('last_name');
      table.string('role').defaultTo('user');
      table.specificType('permissions', 'JSONB').defaultTo('[]');
      table.boolean('mfa_enabled').defaultTo(false);
      table.string('mfa_secret');
      table.boolean('email_verified').defaultTo(false);
      table.string('email_verification_token');
      table.timestamp('email_verified_at');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });

    console.log('📋 Creating audit_logs table in platform schema...');

    // Create audit_logs table
    await db.schema.createTable('audit_logs', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users');
      table.string('action').notNullable();
      table.string('resource_type');
      table.uuid('resource_id');
      table.specificType('details', 'JSONB').defaultTo('{}');
      table.string('ip_address');
      table.string('user_agent');
      table.string('outcome').defaultTo('success');
      table.timestamp('created_at').defaultTo(db.fn.now());
    });

    // Enable UUID extension if not exists
    try {
      await db.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    } catch (error) {
      console.log('ℹ️ UUID extension may already exist or not be needed');
    }

    // Enable Row Level Security
    console.log('🔒 Enabling Row Level Security...');

    await db.raw(`
      ALTER TABLE "platform"."tenants" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "platform"."users" ENABLE ROW LEVEL SECURITY;
      ALTER TABLE "platform"."audit_logs" ENABLE ROW LEVEL SECURITY;
    `);

    // Create basic RLS policies
    await db.raw(`
      DROP POLICY IF EXISTS tenant_isolation_tenants ON "platform"."tenants";
      DROP POLICY IF EXISTS tenant_isolation_users ON "platform"."users";
      DROP POLICY IF EXISTS tenant_isolation_audit ON "platform"."audit_logs";

      CREATE POLICY tenant_isolation_tenants ON "platform"."tenants" USING (true);
      CREATE POLICY tenant_isolation_users ON "platform"."users" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
      CREATE POLICY tenant_isolation_audit ON "platform"."audit_logs" USING ("tenant_id" = current_setting('app.current_tenant_id')::uuid);
    `);

    console.log('🎉 Database tables created successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying table creation...');
    const tables = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'platform'
      ORDER BY table_name;
    `);

    if (tables.rows.length > 0) {
      console.log('✅ Tables created:');
      tables.rows.forEach(table => {
        console.log(`  📋 ${table.table_name}`);
      });
    } else {
      console.log('❌ No tables found in platform schema');
    }

    // Test tenant creation
    console.log('\n🧪 Testing tenant creation...');
    const testTenant = await db('platform.tenants').insert({
      name: 'Test Company',
      subdomain: 'testco',
      region: 'global',
      plan_tier: 'free',
      created_at: new Date(),
      updated_at: new Date()
    }).returning('*');

    if (testTenant && testTenant.length > 0) {
      console.log('✅ Test tenant created successfully!');
      console.log('🆔 Tenant ID:', testTenant[0].id);
      console.log('🏢 Company:', testTenant[0].name);
    }

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

createTablesDirectly();