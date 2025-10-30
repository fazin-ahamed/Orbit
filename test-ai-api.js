const http = require('http');

console.log('🤖 Testing AI Platform endpoints...');

// Test AI providers endpoint
const testAIProviders = () => {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/providers',
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ AI Providers:', data);
        resolve(JSON.parse(data));
      });
    });

    req.on('error', (err) => {
      console.error('❌ AI Providers failed:', err.message);
      reject(err);
    });

    req.end();
  });
};

// Test vector storage
const testVectorStorage = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      content: 'This is a test document for vector storage and RAG functionality.',
      metadata: {
        source: 'test',
        type: 'document',
        category: 'sample'
      },
      source_id: 'test-doc-001'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/vectors',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Vector Storage:', data);
        if (res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          console.log('⚠️ Vector Storage returned status:', res.statusCode);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Vector Storage failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Test vector search
const testVectorSearch = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      query: 'test document',
      top_k: 3,
      threshold: 0.5
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/vectors/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Vector Search:', data);
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          console.log('⚠️ Vector Search returned status:', res.statusCode);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Vector Search failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Test AI chat completion (if API key is configured)
const testAIChat = () => {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, can you help me?' }
      ],
      model: 'gpt-4o-mini',
      max_tokens: 100
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/ai/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ AI Chat Response:', data);
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          console.log('⚠️ AI Chat returned status:', res.statusCode);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ AI Chat failed:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
};

// Run AI tests
async function runAITests() {
  try {
    console.log('🚀 Starting AI Platform tests...\n');

    await testAIProviders();
    console.log('');

    await testVectorStorage();
    console.log('');

    await testVectorSearch();
    console.log('');

    // Only test AI chat if we have a proper API key
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key') {
      await testAIChat();
      console.log('');
    } else {
      console.log('⏭️ Skipping AI chat test (no API key configured)');
      console.log('💡 Add OPENAI_API_KEY to .env to test AI chat functionality');
      console.log('');
    }

    console.log('🎉 AI Platform tests completed!');

  } catch (error) {
    console.error('❌ AI test failed:', error.message);
  }
}

runAITests();