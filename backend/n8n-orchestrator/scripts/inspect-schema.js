#!/usr/bin/env node

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(process.env.HOME, '.n8n/database.sqlite');

console.log('📊 Inspecting n8n Database Schema\n');

const db = new Database(DB_PATH, { readonly: true });

// Get workflow_entity table schema
const schema = db.prepare("PRAGMA table_info(workflow_entity)").all();

console.log('workflow_entity table columns:');
console.table(schema);

// Get a sample workflow if any exist
const sampleWorkflow = db.prepare("SELECT * FROM workflow_entity LIMIT 1").get();

if (sampleWorkflow) {
  console.log('\nSample workflow structure:');
  console.log(JSON.stringify(sampleWorkflow, null, 2));
}

db.close();
