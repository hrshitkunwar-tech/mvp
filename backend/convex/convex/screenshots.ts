
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const save = mutation({
  args: {
    tool_name: v.string(),
    storageId: v.string(),
    type: v.string(),
    timestamp: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("screenshots", args);
  },
});

export const getByTool = query({
  args: { tool_name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("screenshots")
      .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
      .collect();
  },
});
