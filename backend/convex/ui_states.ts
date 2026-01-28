/**
 * Convex Functions: UI States
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Store a new UI state
 */
export const store = mutation({
  args: {
    ui_state: v.any(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('ui_states', args.ui_state);
    return { id };
  },
});

/**
 * Get recent UI states for a session
 */
export const getRecentBySession = query({
  args: {
    session_id: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    const states = await ctx.db
      .query('ui_states')
      .withIndex('by_session', (q) => q.eq('session_id', args.session_id))
      .order('desc')
      .take(limit);

    return states;
  },
});

/**
 * Get latest UI state for a session
 */
export const getLatestBySession = query({
  args: {
    session_id: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query('ui_states')
      .withIndex('by_session', (q) => q.eq('session_id', args.session_id))
      .order('desc')
      .first();

    return state;
  },
});

/**
 * Get UI state by ID
 */
export const getById = query({
  args: {
    id: v.id('ui_states'),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
