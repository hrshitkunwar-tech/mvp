#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.env.HOME, '.n8n/database.sqlite');

console.log('🔄 Activating Navigator Main Orchestrator workflow\n');

const db = new Database(DB_PATH);

try {
  // Update the workflow to active
  const stmt = db.prepare('UPDATE workflow_entity SET active = 1 WHERE name = ?');
  const result = stmt.run('Navigator Main Orchestrator');

  if (result.changes > 0) {
    console.log('✅ Workflow activated successfully!\n');
    console.log('📋 Next steps:');
    console.log('   1. Refresh your browser: http://localhost:5678/home/workflows');
    console.log('   2. Look for "Navigator Main Orchestrator" (should now show as Active)');
    console.log('   3. Get webhook URL from the workflow');
    console.log('   4. Test with: node n8n-orchestrator/scripts/test-webhook.js\n');
  } else {
    console.log('❌ Workflow not found or already active\n');
  }

  db.close();
} catch (err) {
  console.error('❌ Activation failed:', err.message);
  db.close();
  process.exit(1);
}
