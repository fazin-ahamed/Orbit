require('dotenv').config();

const knex = require('knex');

console.log('🔍 Checking database tables...');

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

async function checkTables() {
  try {
    // Get all tables
    const tables = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'platform'
      ORDER BY table_name;
    `);

    console.log('📋 Tables in platform schema:');
    if (tables.rows.length === 0) {
      console.log('❌ No tables found in platform schema');
    } else {
      tables.rows.forEach(table => {
        console.log(`✅ ${table.table_name}`);
      });
    }

    // Check if platform.tenants exists specifically
    const tenantTable = await db.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'platform'
        AND table_name = 'tenants'
      );
    `);

    console.log('\n🎯 Platform.tenants exists:', tenantTable.rows[0].exists);

    // Try to query the tenants table
    try {
      const count = await db('platform.tenants').count('* as count').first();
      console.log('👥 Tenant count:', count.count);
    } catch (error) {
      console.log('❌ Cannot query platform.tenants:', error.message);
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error.message);
  } finally {
    await db.destroy();
  }
}

checkTables();