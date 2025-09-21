// Simple test script for AI Gateway integration
// Run with: node test-ai-gateway.js

async function testEnvironmentSetup() {
  console.log('🔍 Checking environment setup...');

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: 'Hello! This is a test message.'
          }
        ],
        model: 'openai/gpt-4o'
      }),
    });

    const responseText = await response.text();
    console.log(`📡 API Response: HTTP ${response.status}`);
    console.log(`📝 Response Body: ${responseText.substring(0, 200)}...`);

    if (response.status === 500) {
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Make sure AI_GATEWAY_API_KEY is set in your .env.local file');
      console.log('2. Get your key from: https://vercel.com/ai-gateway');
      console.log('3. Restart your development server after setting the key');
    }

    return response.ok;

  } catch (error) {
    console.log(`❌ Connection Error: ${error.message}`);
    console.log('Make sure your development server is running on port 3000');
    return false;
  }
}

async function runBasicTest() {
  console.log('🚀 AI Gateway Basic Test');
  console.log('========================');

  const success = await testEnvironmentSetup();

  if (success) {
    console.log('\n✅ Basic test passed! Your AI Gateway integration is working.');
  } else {
    console.log('\n❌ Basic test failed. Check the troubleshooting steps above.');
  }
}

runBasicTest().catch(console.error);
