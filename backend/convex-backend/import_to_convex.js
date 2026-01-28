/**
 * Import ScrapeData knowledge into Convex
 * 
 * Usage: node import_to_convex.js
 */

const fs = require('fs');
const path = require('path');
const { ConvexHttpClient } = require('convex/browser');

// Convex deployment URL
const CONVEX_URL = 'https://abundant-porpoise-181.convex.cloud';

// Path to exported knowledge
const KNOWLEDGE_PATH = path.join(__dirname, '../../ScrapeData/knowledge_export.json');

async function importKnowledge() {
    console.log('='.repeat(60));
    console.log('IMPORTING SCRAPEDATA KNOWLEDGE TO CONVEX');
    console.log('='.repeat(60));

    // Load exported knowledge
    console.log(`\n📂 Loading knowledge from: ${KNOWLEDGE_PATH}`);

    if (!fs.existsSync(KNOWLEDGE_PATH)) {
        console.error(`❌ Knowledge file not found: ${KNOWLEDGE_PATH}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(KNOWLEDGE_PATH, 'utf8'));
    console.log(`✓ Loaded ${data.normalized_documents.length} documents`);

    // Initialize Convex client
    console.log(`\n🔗 Connecting to Convex: ${CONVEX_URL}`);
    const client = new ConvexHttpClient(CONVEX_URL);

    // Import in batches
    const BATCH_SIZE = 50;
    const documents = data.normalized_documents;
    let imported = 0;
    let errors = 0;

    console.log(`\n📦 Importing ${documents.length} documents in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);

        // Transform documents for Convex
        const convexDocs = batch.map(doc => ({
            tool_name: doc.tool_name,
            tool_id: doc.tool_id,
            source_url: doc.source_url,
            source_type: doc.metadata?.content_type || 'unknown',
            channel: doc.metadata?.channel || 'web',
            content: doc.content,
            chunk_index: doc.chunk_index,
            section: doc.section || undefined,
            token_count: doc.token_count || undefined,
            content_hash: doc.content_hash,
            metadata: doc.metadata || {},
        }));

        try {
            const result = await client.mutation('knowledge:importKnowledgeBatch', {
                documents: convexDocs,
            });
            imported += result.count;
            process.stdout.write(`\r   Progress: ${imported}/${documents.length} (${Math.round(imported / documents.length * 100)}%)`);
        } catch (error) {
            errors++;
            console.error(`\n   ❌ Batch error:`, error.message);
        }
    }

    console.log(`\n\n✅ Import complete!`);
    console.log(`   Imported: ${imported} documents`);
    console.log(`   Errors: ${errors}`);

    // Get stats
    console.log(`\n📊 Fetching knowledge stats...`);
    const stats = await client.query('knowledge:getKnowledgeStats');

    console.log(`\n   Total documents: ${stats.total_documents}`);
    console.log(`   Total tools: ${stats.total_tools}`);
    console.log(`\n   Documents by tool:`);
    for (const [tool, count] of Object.entries(stats.by_tool)) {
        console.log(`     - ${tool}: ${count} chunks`);
    }
    console.log(`\n   Documents by channel:`);
    for (const [channel, count] of Object.entries(stats.by_channel)) {
        console.log(`     - ${channel}: ${count} chunks`);
    }

    client.close();
}

// Run import
importKnowledge().catch(error => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
});
