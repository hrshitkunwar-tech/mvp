#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const http = require('http');

const workflowFile = path.join(__dirname, '../workflows/navigator-main-simple.json');

console.log('📥 Importing Navigator workflow to n8n...\n');

// Read workflow file
const workflowData = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));

// Prepare for import
const importData = {
  name: workflowData.name || 'Navigator Main Orchestrator',
  nodes: workflowData.nodes,
  connections: workflowData.connections,
  settings: workflowData.settings || {},
  staticData: workflowData.staticData || null,
  active: false
};

// Import via n8n API
const data = JSON.stringify(importData);

const options = {
  hostname: 'localhost',
  port: 5678,
  path: '/api/v1/workflows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const result = JSON.parse(body);
      console.log('✅ Workflow imported successfully!\n');
      console.log(`   Workflow ID: ${result.id}`);
      console.log(`   Workflow Name: ${result.name}\n`);
      console.log('📋 Next steps:');
      console.log('   1. Open http://localhost:5678/home/workflows');
      console.log('   2. Find "Navigator Main Orchestrator"');
      console.log('   3. Click to open it');
      console.log('   4. Toggle "Inactive" → "Active"');
      console.log('   5. Click "Screenshot Webhook" node to get webhook URL\n');
    } else {
      console.error('❌ Import failed!');
      console.error(`   Status: ${res.statusCode}`);
      console.error(`   Response: ${body}\n`);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
  console.log('\nMake sure n8n is running on http://localhost:5678');
});

req.write(data);
req.end();
