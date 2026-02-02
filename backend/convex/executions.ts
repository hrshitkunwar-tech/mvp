import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new execution record (called by n8n)
 */
export const create = mutation({
    args: {
        procedure: v.object({
            name: v.string(),
            tool: v.string(),
            steps: v.array(v.any()),
        }),
        status: v.string(),
        currentStep: v.number(),
        startedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("executions", {
            ...args,
        });
        return { id };
    },
});

/**
 * Get an execution by ID
 */
export const get = query({
    args: { id: v.id("executions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

/**
 * Update execution status/step
 */
export const update = mutation({
    args: {
        id: v.id("executions"),
        status: v.optional(v.string()),
        currentStep: v.optional(v.number()),
        completedAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return id;
    },
});
