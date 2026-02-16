import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Screenshots from VisionGuide extension
    screenshots: defineTable({
        storageId: v.id("_storage"),
        timestamp: v.number(),
    }),

    // Tool Knowledge from ScrapeData
    tool_knowledge: defineTable({
        // Tool information
        tool_name: v.string(),
        tool_id: v.number(), // Original ScrapeData tool ID

        // Source information
        source_url: v.string(),
        source_type: v.string(), // docs, blog, readme, etc.
        channel: v.string(), // web, github, api, upload

        // Content
        content: v.string(),
        chunk_index: v.number(),
        section: v.optional(v.string()),

        // Metadata
        token_count: v.optional(v.number()),
        content_hash: v.string(),
        metadata: v.any(), // JSON object with additional info

        // Timestamps
        created_at: v.number(),
        last_updated: v.number(),
    })
        .index("by_tool", ["tool_name"])
        .index("by_source", ["source_url"])
        .index("by_tool_and_type", ["tool_name", "source_type"]),

    // Procedures (Recorded Workflows)
    procedures: defineTable({
        name: v.string(),
        description: v.string(),
        product: v.string(),
        version: v.string(),
        intent_patterns: v.array(v.string()),
        required_context: v.array(v.string()),
        steps: v.any(), // Full step definitions as JSON
        author: v.string(),
        status: v.union(v.literal('draft'), v.literal('active'), v.literal('deprecated')),
        created_at: v.number(),
        updated_at: v.number(),
    })
        .index('by_product', ['product', 'status'])
        .index('by_status', ['status']),

    // Procedure Executions
    executions: defineTable({
        procedure_id: v.id('procedures'),
        session_id: v.string(),
        status: v.union(
            v.literal('active'),
            v.literal('paused'),
            v.literal('completed'),
            v.literal('failed'),
            v.literal('aborted')
        ),
        current_step_id: v.string(),
        current_step_number: v.number(),
        execution_history: v.array(v.any()), // StepExecution objects
        context: v.object({
            user_input: v.optional(v.any()),
            captured_values: v.optional(v.any()),
            session_metadata: v.optional(v.any()),
        }),
        started_at: v.number(),
        updated_at: v.number(),
        completed_at: v.optional(v.number()),
    })
        .index('by_session', ['session_id', 'status'])
        .index('by_status', ['status', 'updated_at']),
});
