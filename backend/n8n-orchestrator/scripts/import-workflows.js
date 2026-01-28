#!/usr/bin/env node

/**
 * Automated Workflow Import Script
 *
 * Imports all Navigator workflows into n8n via API
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const N8N_HOST = process.env.N8N_HOST || 'localhost';
const N8N_PORT = process.env.N8N_PORT || 5678;
const WORKFLOWS_DIR = path.join(__dirname, '../workflows');

console.log('🚀 Navigator Workflow Import Tool\n');

// Check if n8n is running
function checkN8nRunning() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${N8N_HOST}:${N8N_PORT}/healthz`, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Import workflow via n8n API
function importWorkflow(workflowData) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(workflowData);

    const options = {
      hostname: N8N_HOST,
      port: N8N_PORT,
      path: '/rest/workflows',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Main import function
async function importAllWorkflows() {
  // Check if n8n is running
  console.log('🔍 Checking if n8n is running...');
  const isRunning = await checkN8nRunning();

  if (!isRunning) {
    console.error('❌ n8n is not running!');
    console.log('\nPlease start n8n first:');
    console.log('  cd n8n-orchestrator');
    console.log('  ./start-n8n.sh');
    console.log('\nThen run this script again.');
    process.exit(1);
  }

  console.log('✅ n8n is running\n');

  // Read all workflow files
  const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
    .filter(file => file.endsWith('.json') && !file.includes('README'));

  if (workflowFiles.length === 0) {
    console.log('⚠️  No workflow files found in ./workflows/');
    process.exit(0);
  }

  console.log(`📁 Found ${workflowFiles.length} workflow(s) to import:\n`);

  let imported = 0;
  let failed = 0;

  for (const file of workflowFiles) {
    const filePath = path.join(WORKFLOWS_DIR, file);
    console.log(`📤 Importing ${file}...`);

    try {
      const workflowData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Ensure workflow has required fields
      if (!workflowData.name) {
        workflowData.name = file.replace('.json', '');
      }
      if (!workflowData.nodes) {
        workflowData.nodes = [];
      }
      if (!workflowData.connections) {
        workflowData.connections = {};
      }

      const result = await importWorkflow(workflowData);
      console.log(`   ✅ Imported successfully (ID: ${result.id})`);
      imported++;
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('═'.repeat(50));
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${workflowFiles.length}\n`);

  if (imported > 0) {
    console.log('🎉 Workflows imported successfully!');
    console.log(`\n📋 Next steps:`);
    console.log(`   1. Open http://localhost:${N8N_PORT}`);
    console.log(`   2. Click on each workflow`);
    console.log(`   3. Configure environment variables:`);
    console.log(`      - VISION_SERVICE_URL`);
    console.log(`      - AGENT_SERVICE_URL`);
    console.log(`      - CONVEX_URL`);
    console.log(`   4. Activate the workflows`);
  }
}

// Run import
importAllWorkflows().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
