require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function addMissingColumns() {
  try {
    console.log('🔧 Adding missing database columns...');
    
    // Add ai_config column to tenants table
    await pool.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS ai_config JSONB DEFAULT '{}';
    `);
    console.log('✅ Added ai_config column to tenants table');
    
    // Check if other missing columns exist
    try {
      await pool.query('SELECT ai_config FROM tenants LIMIT 1');
      console.log('✅ ai_config column verified');
    } catch (error) {
      console.log('❌ ai_config column still missing:', error.message);
    }
    
    console.log('\n🎉 Database column fixes completed!');
    
  } catch (error) {
    console.error('❌ Column fix failed:', error.message);
  } finally {
    await pool.end();
  }
}

addMissingColumns();