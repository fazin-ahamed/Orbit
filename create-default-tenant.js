require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createDefaultTenant() {
  try {
    console.log('🔧 Creating default tenant for deployment...');
    
    // First, check if default tenant already exists
    const existingTenant = await pool.query('SELECT id FROM tenants WHERE name = $1', ['Default Tenant']);
    
    if (existingTenant.rows.length > 0) {
      console.log('✅ Default tenant already exists:', existingTenant.rows[0].id);
      console.log('📋 Tenant ID for deployment:', existingTenant.rows[0].id);
      return existingTenant.rows[0].id;
    }
    
    // Create default tenant with proper UUID
    const result = await pool.query(`
      INSERT INTO tenants (id, name, status) 
      VALUES ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'active') 
      RETURNING id, name
    `);
    
    console.log('✅ Default tenant created:', result.rows[0].id);
    console.log('📋 Use this Tenant ID for deployment:', result.rows[0].id);
    
    return result.rows[0].id;
    
  } catch (error) {
    console.error('❌ Error creating default tenant:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDefaultTenant();