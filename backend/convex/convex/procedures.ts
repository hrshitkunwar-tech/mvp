/**
 * Convex Functions: Procedures
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Create a new procedure
 */
export const create = mutation({
  args: {
    procedure: v.any(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('procedures', {
      ...args.procedure,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    return { id };
  },
});

/**
 * Update a procedure
 */
export const update = mutation({
  args: {
    id: v.id('procedures'),
    updates: v.any(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args.updates,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Get procedure by ID
 */
export const getById = query({
  args: {
    id: v.id('procedures'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Get all active procedures for a product
 */
export const getByProduct = query({
  args: {
    product: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('procedures')
      .withIndex('by_product', (q) =>
        q.eq('product', args.product).eq('status', 'active')
      )
      .collect();
  },
});

/**
 * Find procedures matching intent patterns
 */
export const findByIntent = query({
  args: {
    intent: v.any(),
  },
  handler: async (ctx, args) => {
    const allProcedures = await ctx.db
      .query('procedures')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect();

    // Simple intent matching - can be enhanced with semantic search
    const intentDescription = args.intent.intent_description.toLowerCase();

    const matches = allProcedures.filter((proc) => {
      return proc.intent_patterns.some((pattern) =>
        intentDescription.includes(pattern.toLowerCase())
      );
    });

    return matches;
  },
});

/**
 * Get step by ID
 */
export const getStep = query({
  args: {
    procedure_id: v.id('procedures'),
    step_id: v.string(),
  },
  handler: async (ctx, args) => {
    const procedure = await ctx.db.get(args.procedure_id);
    if (!procedure) return null;

    const step = procedure.steps.find((s: any) => s.step_id === args.step_id);
    if (!step) return null;

    const stepIndex = procedure.steps.indexOf(step);

    return {
      step,
      step_context: {
        is_first_step: stepIndex === 0,
        is_last_step: stepIndex === procedure.steps.length - 1,
        previous_step_id: stepIndex > 0 ? procedure.steps[stepIndex - 1].step_id : undefined,
        next_step_id:
          stepIndex < procedure.steps.length - 1
            ? procedure.steps[stepIndex + 1].step_id
            : undefined,
      },
    };
  },
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("procedures").collect();
    const products = Array.from(new Set(all.map((p: any) => p.product)));
    return products;
  },
});
