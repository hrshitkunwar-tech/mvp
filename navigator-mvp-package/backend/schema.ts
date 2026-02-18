/**
 * Convex Database Schema
 *
 * Stores all system state: UI states, procedures, executions, audit logs
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // UI States from Vision Interpretation
  ui_states: defineTable({
    session_id: v.string(),
    timestamp: v.number(),
    viewport: v.object({
      width: v.number(),
      height: v.number(),
      device_pixel_ratio: v.number(),
      url: v.string(),
      title: v.string(),
      domain: v.string(),
    }),
    interpretation: v.object({
      page_classification: v.object({
        page_type: v.string(),
        product_area: v.optional(v.string()),
        confidence: v.number(),
      }),
      elements: v.array(
        v.object({
          id: v.string(),
          type: v.string(),
          label: v.string(),
          role: v.string(),
          bounding_box: v.object({
            x: v.number(),
            y: v.number(),
            width: v.number(),
            height: v.number(),
            center_x: v.number(),
            center_y: v.number(),
          }),
          state: v.object({
            visible: v.boolean(),
            enabled: v.boolean(),
            focused: v.boolean(),
            selected: v.optional(v.boolean()),
            checked: v.optional(v.boolean()),
            value: v.optional(v.string()),
            error: v.optional(v.boolean()),
          }),
          confidence: v.number(),
          parent_id: v.optional(v.string()),
          attributes: v.any(), // JSON object
        })
      ),
      features: v.array(
        v.object({
          feature_id: v.string(),
          feature_name: v.string(),
          presence_confidence: v.number(),
          location: v.optional(
            v.object({
              x: v.number(),
              y: v.number(),
              width: v.number(),
              height: v.number(),
              center_x: v.number(),
              center_y: v.number(),
            })
          ),
        })
      ),
      interpretation_confidence: v.number(),
      model_version: v.string(),
    }),
    raw_screenshot_url: v.string(),
  })
    .index('by_session', ['session_id', 'timestamp'])
    .index('by_timestamp', ['timestamp']),

  // Procedures
  procedures: defineTable({
    name: v.string(),
    description: v.string(),
    product: v.string(),
    version: v.string(),
    intent_patterns: v.array(v.string()),
    required_context: v.array(v.string()),
    steps: v.any(), // Full step definitions as JSON
    author: v.string(),
    status: v.union(v.literal('draft'), v.literal('active'), v.literal('deprecated')),
    created_at: v.number(),
    updated_at: v.number(),
  })
    .index('by_product', ['product', 'status'])
    .index('by_status', ['status']),

  // Procedure Executions
  executions: defineTable({
    procedure_id: v.id('procedures'),
    session_id: v.string(),
    status: v.union(
      v.literal('active'),
      v.literal('paused'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('aborted')
    ),
    current_step_id: v.string(),
    current_step_number: v.number(),
    execution_history: v.array(v.any()), // StepExecution objects
    context: v.object({
      user_input: v.optional(v.any()),
      captured_values: v.optional(v.any()),
      session_metadata: v.optional(v.any()),
    }),
    started_at: v.number(),
    updated_at: v.number(),
    completed_at: v.optional(v.number()),
  })
    .index('by_session', ['session_id', 'status'])
    .index('by_status', ['status', 'updated_at']),

  // Agent Execution Logs
  agent_logs: defineTable({
    agent_name: v.string(),
    agent_version: v.string(),
    input: v.any(),
    output: v.any(),
    metadata: v.object({
      execution_time_ms: v.number(),
      model_used: v.string(),
      tokens_used: v.optional(v.number()),
    }),
    audit_trail: v.array(
      v.object({
        timestamp: v.number(),
        action: v.string(),
        details: v.any(),
      })
    ),
    session_id: v.optional(v.string()),
    execution_id: v.optional(v.id('executions')),
    timestamp: v.number(),
  })
    .index('by_agent', ['agent_name', 'timestamp'])
    .index('by_session', ['session_id', 'timestamp'])
    .index('by_execution', ['execution_id', 'timestamp']),

  // Tool Execution Logs
  tool_logs: defineTable({
    tool_name: v.string(),
    category: v.string(),
    input: v.any(),
    output: v.any(),
    success: v.boolean(),
    error: v.optional(v.string()),
    execution_time_ms: v.number(),
    session_id: v.optional(v.string()),
    execution_id: v.optional(v.id('executions')),
    step_id: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_tool', ['tool_name', 'timestamp'])
    .index('by_session', ['session_id', 'timestamp'])
    .index('by_execution', ['execution_id', 'timestamp']),

  // Sessions
  sessions: defineTable({
    session_id: v.string(),
    user_id: v.optional(v.string()),
    product: v.string(),
    started_at: v.number(),
    last_activity_at: v.number(),
    ended_at: v.optional(v.number()),
    metadata: v.any(),
  })
    .index('by_session_id', ['session_id'])
    .index('by_user', ['user_id', 'started_at']),

  // Intent History
  intent_history: defineTable({
    session_id: v.string(),
    inferred_intent: v.object({
      intent_id: v.string(),
      intent_description: v.string(),
      intent_category: v.string(),
      evidence: v.array(v.any()),
      confidence: v.number(),
    }),
    alternative_intents: v.array(v.any()),
    ui_state_id: v.id('ui_states'),
    timestamp: v.number(),
  }).index('by_session', ['session_id', 'timestamp']),

  // Scraped Content for RAG
  scrapedata: defineTable({
    tool_name: v.string(),     // e.g. "Linear", "Notion"
    url: v.string(),           // Source URL
    title: v.optional(v.string()), // Page title
    content: v.string(),       // The markdown/text content
    summary: v.optional(v.string()), // Brief summary
    crawled_at: v.number(),
    metadata: v.optional(v.any()), // Extra metadata from crawler
  })
    .index("by_tool", ["tool_name"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["tool_name"]
    }),
});
