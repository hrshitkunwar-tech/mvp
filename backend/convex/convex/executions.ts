/**
 * Convex Functions: Procedure Executions
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Create a new execution
 */
export const create = mutation({
  args: {
    procedure_id: v.id('procedures'),
    session_id: v.string(),
    intent: v.any(),
  },
  handler: async (ctx, args) => {
    const procedure = await ctx.db.get(args.procedure_id);
    if (!procedure) throw new Error('Procedure not found');

    const firstStep = procedure.steps[0];

    const id = await ctx.db.insert('executions', {
      procedure_id: args.procedure_id,
      session_id: args.session_id,
      status: 'active',
      current_step_id: firstStep.step_id,
      current_step_number: 1,
      execution_history: [],
      context: {
        user_input: {},
        captured_values: {},
        session_metadata: { intent: args.intent },
      },
      started_at: Date.now(),
      updated_at: Date.now(),
    });

    return { id };
  },
});

/**
 * Get current execution by ID
 */
export const getCurrent = query({
  args: {
    execution_id: v.id('executions'),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.execution_id);
    if (!execution) return null;

    const procedure = await ctx.db.get(execution.procedure_id);

    return {
      ...execution,
      procedure,
    };
  },
});

/**
 * Get active execution for session
 */
export const getActiveBySession = query({
  args: {
    session_id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('executions')
      .withIndex('by_session', (q) =>
        q.eq('session_id', args.session_id).eq('status', 'active')
      )
      .first();
  },
});

/**
 * Update step status
 */
export const updateStep = mutation({
  args: {
    execution_id: v.id('executions'),
    step_id: v.string(),
    status: v.string(),
    step_execution: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.execution_id);
    if (!execution) throw new Error('Execution not found');

    const history = [...execution.execution_history];

    if (args.step_execution) {
      history.push(args.step_execution);
    }

    await ctx.db.patch(args.execution_id, {
      execution_history: history,
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Move to next step
 */
export const moveToNextStep = mutation({
  args: {
    execution_id: v.id('executions'),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db.get(args.execution_id);
    if (!execution) throw new Error('Execution not found');

    const procedure = await ctx.db.get(execution.procedure_id);
    if (!procedure) throw new Error('Procedure not found');

    const currentStepIndex = procedure.steps.findIndex(
      (s: any) => s.step_id === execution.current_step_id
    );

    if (currentStepIndex === -1) {
      throw new Error('Current step not found in procedure');
    }

    const nextStepIndex = currentStepIndex + 1;
    if (nextStepIndex >= procedure.steps.length) {
      throw new Error('No next step available');
    }

    const nextStep = procedure.steps[nextStepIndex];

    await ctx.db.patch(args.execution_id, {
      current_step_id: nextStep.step_id,
      current_step_number: nextStepIndex + 1,
      updated_at: Date.now(),
    });

    return { success: true, next_step_id: nextStep.step_id };
  },
});

/**
 * Complete execution
 */
export const complete = mutation({
  args: {
    execution_id: v.id('executions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.execution_id, {
      status: 'completed',
      completed_at: Date.now(),
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Abort execution
 */
export const abort = mutation({
  args: {
    execution_id: v.id('executions'),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.execution_id, {
      status: 'aborted',
      completed_at: Date.now(),
      updated_at: Date.now(),
      context: {
        abort_reason: args.reason,
      },
    });

    return { success: true };
  },
});

/**
 * Pause execution
 */
export const pause = mutation({
  args: {
    execution_id: v.id('executions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.execution_id, {
      status: 'paused',
      updated_at: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Resume execution
 */
export const resume = mutation({
  args: {
    execution_id: v.id('executions'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.execution_id, {
      status: 'active',
      updated_at: Date.now(),
    });

    return { success: true };
  },
});
