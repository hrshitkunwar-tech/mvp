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
});
