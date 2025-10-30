require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testBasicTables() {
  try {
    console.log('🧪 Testing basic table creation...');
    
    // Create basic tenants table first
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        domain VARCHAR(255),
        settings JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tenants table created successfully');
    
    // Test insert
    const result = await pool.query(
      'INSERT INTO tenants (name) VALUES ($1) RETURNING id',
      ['Test Tenant']
    );
    console.log('✅ Test insert successful, ID:', result.rows[0].id);
    
    // Clean up test data
    await pool.query('DELETE FROM tenants WHERE name = $1', ['Test Tenant']);
    console.log('✅ Test cleanup completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testBasicTables();