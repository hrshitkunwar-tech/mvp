import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Import knowledge from ScrapeData export
export const importKnowledge = mutation({
    args: {
        tool_name: v.string(),
        tool_id: v.number(),
        source_url: v.string(),
        source_type: v.string(),
        channel: v.string(),
        content: v.string(),
        chunk_index: v.number(),
        section: v.optional(v.string()),
        token_count: v.optional(v.number()),
        content_hash: v.string(),
        metadata: v.any(),
    },
    handler: async (ctx, args) => {
        // Check if this chunk already exists
        const existing = await ctx.db
            .query("tool_knowledge")
            .withIndex("by_source", (q) => q.eq("source_url", args.source_url))
            .filter((q) => q.eq(q.field("chunk_index"), args.chunk_index))
            .first();

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                ...args,
                last_updated: Date.now(),
            });
            return existing._id;
        } else {
            // Create new
            const id = await ctx.db.insert("tool_knowledge", {
                ...args,
                created_at: Date.now(),
                last_updated: Date.now(),
            });
            return id;
        }
    },
});

// Batch import for efficiency
export const importKnowledgeBatch = mutation({
    args: {
        documents: v.array(v.object({
            tool_name: v.string(),
            tool_id: v.number(),
            source_url: v.string(),
            source_type: v.string(),
            channel: v.string(),
            content: v.string(),
            chunk_index: v.number(),
            section: v.optional(v.string()),
            token_count: v.optional(v.number()),
            content_hash: v.string(),
            metadata: v.any(),
        })),
    },
    handler: async (ctx, args) => {
        const results = [];
        for (const doc of args.documents) {
            const id = await ctx.db.insert("tool_knowledge", {
                ...doc,
                created_at: Date.now(),
                last_updated: Date.now(),
            });
            results.push(id);
        }
        return { count: results.length, ids: results };
    },
});

// Query knowledge by tool
export const getKnowledgeByTool = query({
    args: {
        tool_name: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        return await ctx.db
            .query("tool_knowledge")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .take(limit);
    },
});

// Search knowledge (simple text search)
export const searchKnowledge = query({
    args: {
        query: v.string(),
        tool_name: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 10;
        let results = await ctx.db.query("tool_knowledge").collect();

        // Filter by tool if specified
        if (args.tool_name) {
            results = results.filter((doc) => doc.tool_name === args.tool_name);
        }

        // Simple text search in content
        const query = args.query.toLowerCase();
        results = results.filter((doc) =>
            doc.content.toLowerCase().includes(query)
        );

        // Sort by relevance (simple: count occurrences)
        results.sort((a, b) => {
            const aCount = (a.content.toLowerCase().match(new RegExp(query, "g")) || []).length;
            const bCount = (b.content.toLowerCase().match(new RegExp(query, "g")) || []).length;
            return bCount - aCount;
        });

        return results.slice(0, limit);
    },
});

// Get knowledge stats
export const getKnowledgeStats = query({
    args: {},
    handler: async (ctx) => {
        const allDocs = await ctx.db.query("tool_knowledge").collect();

        // Count by tool
        const byTool: Record<string, number> = {};
        const byChannel: Record<string, number> = {};
        const bySourceType: Record<string, number> = {};

        for (const doc of allDocs) {
            byTool[doc.tool_name] = (byTool[doc.tool_name] || 0) + 1;
            byChannel[doc.channel] = (byChannel[doc.channel] || 0) + 1;
            bySourceType[doc.source_type] = (bySourceType[doc.source_type] || 0) + 1;
        }

        return {
            total_documents: allDocs.length,
            total_tools: Object.keys(byTool).length,
            by_tool: byTool,
            by_channel: byChannel,
            by_source_type: bySourceType,
        };
    },
});

// Get available tools
export const getAvailableTools = query({
    args: {},
    handler: async (ctx) => {
        const allDocs = await ctx.db.query("tool_knowledge").collect();
        const tools = new Set(allDocs.map((doc) => doc.tool_name));
        return Array.from(tools).sort();
    },
});

// Delete all knowledge for a tool
export const deleteToolKnowledge = mutation({
    args: {
        tool_name: v.string(),
    },
    handler: async (ctx, args) => {
        const docs = await ctx.db
            .query("tool_knowledge")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .collect();

        for (const doc of docs) {
            await ctx.db.delete(doc._id);
        }

        return { deleted: docs.length };
    },
});

// Clear all knowledge
export const clearAllKnowledge = mutation({
    args: {},
    handler: async (ctx) => {
        const allDocs = await ctx.db.query("tool_knowledge").collect();
        for (const doc of allDocs) {
            await ctx.db.delete(doc._id);
        }
        return { deleted: allDocs.length };
    },
});
