import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    storageId: v.id("_storage"),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("screenshots", {
      storageId: args.storageId,
      timestamp: new Date().toISOString(),
      processed: false,
      metadata: args.metadata,
    });
  },
});

export const markProcessed = mutation({
  args: {
    storageId: v.id("_storage"),
    webhookStatus: v.number(),
  },
  handler: async (ctx, args) => {
    const screenshot = await ctx.db
      .query("screenshots")
      .filter((q) => q.eq(q.field("storageId"), args.storageId))
      .first();
    
    if (screenshot) {
      await ctx.db.patch(screenshot._id, {
        processed: true,
        webhookStatus: args.webhookStatus,
        processedAt: new Date().toISOString(),
      });
    }
  },
});
