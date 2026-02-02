#!/usr/bin/env node

const http = require('http');

console.log('🧪 Testing Navigator Webhook...\n');

// Test data
const testData = JSON.stringify({
  session_id: 'test_' + Date.now(),
  timestamp: Date.now(),
  screenshot_url: 'https://picsum.photos/1920/1080',
  viewport: {
    width: 1920,
    height: 1080,
    device_pixel_ratio: 2,
    url: 'https://github.com',
    title: 'GitHub',
    domain: 'github.com'
  }
});

const options = {
  hostname: 'localhost',
  port: 5678,
  path: '/webhook/navigator-screenshot',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

console.log('📤 Sending test event to webhook...');
console.log(`   URL: http://localhost:5678/webhook/navigator-screenshot\n`);

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Response Status: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      console.log('✅ Webhook test successful!\n');
      console.log('Response:');
      try {
        const parsed = JSON.parse(body);
        console.log(JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log(body);
      }
      console.log('\n📋 Next steps:');
      console.log('   1. Open http://localhost:5678');
      console.log('   2. Click "Executions" in left sidebar');
      console.log('   3. View your test execution!');
    } else {
      console.log('❌ Webhook test failed!\n');
      console.log('Response:', body);
      console.log('\n💡 Troubleshooting:');
      console.log('   - Make sure workflow is Active in n8n');
      console.log('   - Check webhook URL is correct');
      console.log('   - Verify Vision service is running (port 3001)');
    }
    console.log('');
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\n💡 Make sure:');
  console.log('   - n8n is running (http://localhost:5678)');
  console.log('   - Workflow is imported and Active');
  console.log('   - Webhook URL matches the path in the request\n');
});

req.write(testData);
req.end();
