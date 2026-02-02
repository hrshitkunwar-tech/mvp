#!/usr/bin/env node

/**
 * Complete n8n Webhook Activation Script
 * Activates the "Main Orchestrator" workflow and verifies webhook setup
 */

const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.env.HOME, '.n8n/database.sqlite');
const WEBHOOK_PATH = '/webhook/navigator-screenshot-event';
const WEBHOOK_URL = `http://localhost:5678${WEBHOOK_PATH}`;

console.log('═══════════════════════════════════════════════════════════════');
console.log('   Navigator n8n Webhook Activation & Verification');
console.log('═══════════════════════════════════════════════════════════════\n');

let activationSuccess = false;

// Step 1: Activate workflow in database
console.log('📋 STEP 1: Activating Main Orchestrator workflow...\n');

try {
  const db = new Database(DB_PATH);
  
  // First, check if workflow exists
  const checkStmt = db.prepare('SELECT id, name, active FROM workflow_entity WHERE name = ?');
  const workflow = checkStmt.get('Main Orchestrator');
  
  if (!workflow) {
    console.log('❌ ERROR: "Main Orchestrator" workflow not found in database');
    console.log('\n   Possible solutions:');
    console.log('   1. Import workflows: npm run import:workflows');
    console.log('   2. Manually import via n8n UI: http://localhost:5678');
    console.log('   3. Check workflow file exists: backend/n8n-orchestrator/workflows/main-orchestrator.json\n');
    process.exit(1);
  }
  
  console.log(`✅ Found workflow: "${workflow.name}" (ID: ${workflow.id})`);
  console.log(`   Current status: ${workflow.active ? 'ACTIVE ✓' : 'INACTIVE ✗'}\n`);
  
  // Activate the workflow
  const activateStmt = db.prepare('UPDATE workflow_entity SET active = 1 WHERE id = ?');
  const result = activateStmt.run(workflow.id);
  
  if (result.changes > 0) {
    activationSuccess = true;
    console.log('✅ Workflow activated successfully!\n');
  } else {
    console.log('⚠️  Workflow already active or activation failed\n');
  }
  
  // Get webhook info
  const webhookStmt = db.prepare('SELECT id, path FROM webhook_entity WHERE workflow_id = ?');
  const webhook = webhookStmt.get(workflow.id);
  
  if (webhook) {
    console.log(`✅ Webhook found: ${webhook.path}`);
    console.log(`   Full URL: ${WEBHOOK_URL}\n`);
  } else {
    console.log('⚠️  No webhook found for this workflow\n');
  }
  
  db.close();
} catch (err) {
  console.error('❌ Database error:', err.message);
  console.log('\n   Make sure:');
  console.log('   - n8n is running: http://localhost:5678');
  console.log('   - Database exists: ~/.n8n/database.sqlite');
  console.log('   - You have permission to access it\n');
  process.exit(1);
}

// Step 2: Test webhook connectivity
console.log('📋 STEP 2: Testing webhook connectivity...\n');

const testData = JSON.stringify({
  session_id: 'activation_test_' + Date.now(),
  timestamp: Date.now(),
  screenshot_url: 'data:image/png;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/',
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
  path: WEBHOOK_PATH,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': testData.length
  }
};

const req = http.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    console.log(`📊 Webhook Response Status: ${res.statusCode}\n`);

    // Step 3: Results and next steps
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (res.statusCode === 200) {
      console.log('✅ SUCCESS: Webhook is active and working!\n');
      console.log('📋 NEXT STEPS:\n');
      console.log('   1. Refresh n8n UI: http://localhost:5678/home/workflows');
      console.log('   2. Find "Main Orchestrator" workflow (should show as Active)');
      console.log('   3. Click on it to open the editor');
      console.log('   4. Click on "Screenshot Event Webhook" node');
      console.log('   5. Copy the Production Webhook URL\n');
      console.log('📝 Production Webhook URL:\n');
      console.log(`   ${WEBHOOK_URL}\n`);
      console.log('✨ Your webhook is ready to receive screenshot events!\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else if (res.statusCode === 404) {
      console.log('❌ WEBHOOK NOT FOUND (404)\n');
      console.log('   The workflow exists but webhook is not active.\n');
      console.log('   🔧 Solutions:\n');
      console.log('   1. Verify workflow is Active:');
      console.log('      - Go to http://localhost:5678/home/workflows');
      console.log('      - Look for "Main Orchestrator"');
      console.log('      - Toggle switch to ON (Active)\n');
      console.log('   2. Re-import workflow:');
      console.log('      - npm run import:workflows');
      console.log('      - Or manually import via UI\n');
      console.log('   3. Check webhook configuration:');
      console.log('      - Open workflow editor');
      console.log('      - Click on webhook node');
      console.log('      - Verify "Path" is set to: navigator-screenshot-event\n');
      console.log('═══════════════════════════════════════════════════════════════\n');
    } else {
      console.log(`⚠️  UNEXPECTED STATUS: ${res.statusCode}\n`);
      console.log('Response body:');
      console.log(body);
      console.log('\n═══════════════════════════════════════════════════════════════\n');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message, '\n');
  console.log('   n8n is not accessible at http://localhost:5678\n');
  console.log('   🔧 Solutions:\n');
  console.log('   1. Start n8n:');
  console.log('      cd backend/n8n-orchestrator');
  console.log('      ./start-n8n.sh\n');
  console.log('   2. Or start via Docker:');
  console.log('      docker run -it --rm -p 5678:5678 n8nio/n8n\n');
  console.log('   3. Wait for n8n to fully start, then run this script again\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
  process.exit(1);
});

req.write(testData);
req.end();
