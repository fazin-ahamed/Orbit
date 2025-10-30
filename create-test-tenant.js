require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestTenant() {
  try {
    console.log('🏢 Creating test tenant...');
    
    // Create test tenant
    const tenantResult = await pool.query(`
      INSERT INTO tenants (name, domain) 
      VALUES ($1, $2) 
      RETURNING id, name
    `, ['Test Company', 'testcompany.com']);
    
    const testTenant = tenantResult.rows[0];
    console.log('✅ Test tenant created:', testTenant.id, '-', testTenant.name);
    
    // Create test user
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('testpassword123', 12);
    
    const userResult = await pool.query(`
      INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email
    `, [testTenant.id, 'admin@testcompany.com', passwordHash, 'Test', 'Admin', 'admin']);
    
    const testUser = userResult.rows[0];
    console.log('✅ Test user created:', testUser.id, '-', testUser.email);
    
    console.log('\n🎉 Test setup completed!');
    console.log('📋 Test Credentials:');
    console.log('  Tenant ID:', testTenant.id);
    console.log('  User Email:', testUser.email);
    console.log('  Password: testpassword123');
    
    return {
      tenantId: testTenant.id,
      userId: testUser.id,
      email: testUser.email
    };
    
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
  } finally {
    await pool.end();
  }
}

createTestTenant();