import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new screenshot record
export const create = mutation({
    args: {
        storageId: v.id("_storage"),
        timestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("screenshots", args);
        return id;
    },
});

// Generate upload URL for screenshot
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// Get recent screenshots
export const getRecent = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 20;
        const screenshots = await ctx.db
            .query("screenshots")
            .order("desc")
            .take(limit);

        // Get URLs for each screenshot
        const screenshotsWithUrls = await Promise.all(
            screenshots.map(async (screenshot) => {
                const url = await ctx.storage.getUrl(screenshot.storageId);
                return {
                    ...screenshot,
                    url,
                };
            })
        );

        return screenshotsWithUrls;
    },
});

// Get a single screenshot by ID
export const getById = query({
    args: {
        id: v.id("screenshots"),
    },
    handler: async (ctx, args) => {
        const screenshot = await ctx.db.get(args.id);
        if (!screenshot) return null;

        const url = await ctx.storage.getUrl(screenshot.storageId);
        return {
            ...screenshot,
            url,
        };
    },
});

// Get screenshot count
export const getCount = query({
    args: {},
    handler: async (ctx) => {
        const screenshots = await ctx.db.query("screenshots").collect();
        return screenshots.length;
    },
});

// Delete old screenshots (cleanup)
export const deleteOld = mutation({
    args: {
        olderThanDays: v.number(),
    },
    handler: async (ctx, args) => {
        const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);
        const oldScreenshots = await ctx.db
            .query("screenshots")
            .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
            .collect();

        for (const screenshot of oldScreenshots) {
            await ctx.storage.delete(screenshot.storageId);
            await ctx.db.delete(screenshot._id);
        }

        return oldScreenshots.length;
    },
});
