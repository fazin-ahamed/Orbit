const http = require('http');

console.log('🧪 Testing BusinessOS API endpoints...');

// Test health endpoint
const testHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Health check:', data);
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (err) => {
      console.error('❌ Health check failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Test database health endpoint
const testDatabaseHealth = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/database/health',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Database health:', data);
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (err) => {
      console.error('❌ Database health failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Test tenant creation
const testTenantCreation = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: 'New Test Company',
      subdomain: 'newtestco',
      region: 'global',
      plan_tier: 'free'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/tenants',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Tenant creation response:', data);
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          console.log('⚠️ Tenant creation returned status:', res.statusCode);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Tenant creation failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Run tests
async function runTests() {
  try {
    console.log('🚀 Starting API tests...\n');

    await testHealth();
    console.log('');

    await testDatabaseHealth();
    console.log('');

    await testTenantCreation();
    console.log('');

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();