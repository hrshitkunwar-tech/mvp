#!/usr/bin/env node

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(process.env.HOME, '.n8n/database.sqlite');
const WORKFLOW_FILE = path.join(__dirname, '../workflows/navigator-main-simple.json');

console.log('🚀 Direct Workflow Import to n8n Database\n');

// Check if database exists
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ n8n database not found at:', DB_PATH);
  process.exit(1);
}

// Read workflow
const workflowData = JSON.parse(fs.readFileSync(WORKFLOW_FILE, 'utf8'));

console.log('📥 Importing workflow:', workflowData.name);

// Generate UUIDs
function generateUUID() {
  return crypto.randomUUID();
}

// Open database
const db = new Database(DB_PATH);

// Prepare workflow data for insert
const id = generateUUID();
const versionId = generateUUID();
const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

const workflowInsert = {
  id: id,
  name: workflowData.name,
  active: 0,
  nodes: JSON.stringify(workflowData.nodes),
  connections: JSON.stringify(workflowData.connections),
  settings: JSON.stringify(workflowData.settings || { executionOrder: 'v1', availableInMCP: false }),
  staticData: workflowData.staticData ? JSON.stringify(workflowData.staticData) : null,
  pinData: JSON.stringify({}),
  versionId: versionId,
  triggerCount: 0,
  meta: null,
  parentFolderId: null,
  createdAt: now,
  updatedAt: now,
  isArchived: 0,
  versionCounter: 1,
  description: null,
  activeVersionId: null
};

// Insert workflow
const sql = `
  INSERT INTO workflow_entity (
    id, name, active, nodes, connections, settings, staticData, pinData,
    versionId, triggerCount, meta, parentFolderId, createdAt, updatedAt,
    isArchived, versionCounter, description, activeVersionId
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

try {
  const stmt = db.prepare(sql);
  const info = stmt.run(
    workflowInsert.id,
    workflowInsert.name,
    workflowInsert.active,
    workflowInsert.nodes,
    workflowInsert.connections,
    workflowInsert.settings,
    workflowInsert.staticData,
    workflowInsert.pinData,
    workflowInsert.versionId,
    workflowInsert.triggerCount,
    workflowInsert.meta,
    workflowInsert.parentFolderId,
    workflowInsert.createdAt,
    workflowInsert.updatedAt,
    workflowInsert.isArchived,
    workflowInsert.versionCounter,
    workflowInsert.description,
    workflowInsert.activeVersionId
  );

  console.log('✅ Workflow imported successfully!\n');
  console.log(`   Workflow ID: ${workflowInsert.id}`);
  console.log(`   Workflow Name: ${workflowInsert.name}\n`);
  console.log('📋 Next steps:');
  console.log('   1. Refresh http://localhost:5678/home/workflows in your browser');
  console.log('   2. Find "Navigator Main Orchestrator"');
  console.log('   3. Click to open it');
  console.log('   4. Toggle "Inactive" → "Active"');
  console.log('   5. Test with: node n8n-orchestrator/scripts/test-webhook.js\n');

  db.close();
} catch (err) {
  console.error('❌ Import failed:', err.message);
  db.close();
  process.exit(1);
}
