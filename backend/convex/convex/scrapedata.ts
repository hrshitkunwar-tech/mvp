import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Insert or update crawled data (upsert by tool+url)
export const insert = mutation({
    args: {
        tool_name: v.string(),
        url: v.string(),
        title: v.optional(v.string()),
        content: v.string(),
        summary: v.optional(v.union(v.string(), v.null())),
        category: v.optional(v.string()),
        images: v.optional(v.array(v.object({
            url: v.string(),
            alt: v.optional(v.string()),
            description: v.optional(v.string())
        }))),
        crawled_at: v.number(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("scrapedata")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .filter((q) => q.eq(q.field("url"), args.url))
            .first();

        let docId;
        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                title: args.title,
                summary: args.summary,
                category: args.category,
                images: args.images,
                crawled_at: args.crawled_at,
                metadata: args.metadata,
            });
            docId = existing._id;
        } else {
            docId = await ctx.db.insert("scrapedata", args);
        }

        // Keep workflow extraction near real-time as new scraped docs arrive.
        await ctx.scheduler.runAfter(0, api.workflows.enqueueScrapedataForExtraction, {
            scrapedataId: docId,
        });
        await ctx.scheduler.runAfter(0, api.workflows.processNextJob, {});

        return docId;
    },
});

// Get all pages for a specific tool
export const getByTool = query({
    args: { tool_name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("scrapedata")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .collect();
    },
});

// Check if a tool exists in the database
export const toolExists = query({
    args: { tool_name: v.string() },
    handler: async (ctx, args) => {
        const doc = await ctx.db
            .query("scrapedata")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .first();
        return doc !== null;
    },
});

// List all unique tool names in the database
export const listTools = query({
    args: {},
    handler: async (ctx) => {
        const all = await ctx.db.query("scrapedata").collect();
        const names = [...new Set(all.map(d => d.tool_name))].sort();
        return names;
    },
});

// Full-text search across knowledge base
export const searchKnowledge = query({
    args: {
        query: v.string(),
        tool_name: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 5;
        if (args.tool_name) {
            return await ctx.db
                .query("scrapedata")
                .withSearchIndex("search_content", (q) =>
                    q.search("content", args.query).eq("tool_name", args.tool_name!)
                )
                .take(limit);
        }
        return await ctx.db
            .query("scrapedata")
            .withSearchIndex("search_content", (q) => q.search("content", args.query))
            .take(limit);
    },
});

export const getById = query({
    args: { id: v.id("scrapedata") },
    handler: async (ctx, args) => ctx.db.get(args.id),
});

export const list = query({
    args: { limit: v.optional(v.number()) },
    handler: async ({ db }, args) =>
        db.query("scrapedata").order("desc").take(args.limit ?? 20),
});

export const pageForBackfill = query({
    args: {
        cursor: v.optional(v.union(v.string(), v.null())),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const numItems = Math.max(1, Math.min(args.limit ?? 100, 500));
        return await ctx.db
            .query("scrapedata")
            .order("desc")
            .paginate({
                cursor: args.cursor ?? null,
                numItems,
            });
    },
});
