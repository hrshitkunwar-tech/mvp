/**
 * Agent Contracts
 *
 * All agents are advisory-only: they provide recommendations, never execute actions
 * Orchestration layer (n8n) makes all decisions and invokes all tools
 */

import { UIState } from '../schemas/ui-state.schema';
import { Procedure, ProcedureStep, ElementSelector } from '../schemas/procedure.schema';

/**
 * Agent 1: Intent Inference Agent
 *
 * Purpose: Infer user intent from UI state sequence
 * Input: Recent UI states
 * Output: Intent hypothesis with confidence
 */
export interface IntentInferenceInput {
  current_state: UIState;
  previous_states: UIState[]; // Last 5-10 states
  session_context: {
    session_id: string;
    time_in_session_seconds: number;
    previous_intents?: InferredIntent[];
  };
}

export interface IntentInferenceOutput {
  inferred_intent: InferredIntent;
  alternative_intents: InferredIntent[];
  reasoning: string; // Explanation for audit trail
  confidence: number;
}

export interface InferredIntent {
  intent_id: string;
  intent_description: string; // e.g., "User wants to create a new project"
  intent_category: 'navigation' | 'data_entry' | 'configuration' | 'exploration' | 'unknown';
  evidence: IntentEvidence[];
  confidence: number;
}

export interface IntentEvidence {
  type: 'page_sequence' | 'element_interaction' | 'time_pattern' | 'element_focus';
  description: string;
  weight: number; // contribution to confidence score
}

/**
 * Agent 2: Procedure Reasoning Agent
 *
 * Purpose: Select best procedure for current intent and context
 * Input: Intent + available procedures + current state
 * Output: Ranked procedure recommendations
 */
export interface ProcedureReasoningInput {
  intent: InferredIntent;
  current_state: UIState;
  available_procedures: Procedure[];
  execution_history?: {
    completed_procedures: string[];
    failed_procedures: string[];
  };
}

export interface ProcedureReasoningOutput {
  recommended_procedure: ProcedureRecommendation | null;
  alternative_procedures: ProcedureRecommendation[];
  reasoning: string;
  should_abort: boolean; // True if no valid procedure found
  abort_reason?: string;
}

export interface ProcedureRecommendation {
  procedure: Procedure;
  relevance_score: number;
  match_reasons: string[];
  potential_issues: string[]; // Warnings about preconditions
  estimated_completion_time_seconds?: number;
}

/**
 * Agent 3: Guidance Agent
 *
 * Purpose: Generate contextual guidance for current step
 * Input: Current step + UI state + execution context
 * Output: Enriched guidance for user
 */
export interface GuidanceAgentInput {
  current_step: ProcedureStep;
  current_state: UIState;
  execution_context: {
    step_number: number;
    total_steps: number;
    retry_count: number;
    previous_failures?: string[];
  };
}

export interface GuidanceAgentOutput {
  primary_instruction: string; // Main instruction to show
  contextual_hints: string[]; // Additional helpful context
  visual_guidance: VisualGuidanceRecommendation;
  warnings: string[]; // Things to watch out for
  estimated_duration_seconds: number;
}

export interface VisualGuidanceRecommendation {
  highlight_element?: {
    selector: ElementSelector;
    matched_element_id?: string; // From current UI state
    confidence: number;
  };
  annotation?: {
    message: string;
    position: { x: number; y: number };
  };
  screen_overlay?: {
    type: 'dim_background' | 'spotlight' | 'arrow';
    target_element_id?: string;
  };
}

/**
 * Agent 4: Recovery Agent
 *
 * Purpose: Diagnose failures and recommend recovery actions
 * Input: Failed step + error context + UI state
 * Output: Recovery recommendations
 */
export interface RecoveryAgentInput {
  failed_step: ProcedureStep;
  failure_context: {
    error_type: 'precondition_failed' | 'success_condition_timeout' | 'element_not_found' | 'unexpected_state' | 'unknown';
    error_message: string;
    retry_count: number;
    ui_state_at_failure: UIState;
    expected_vs_actual: {
      expected: any;
      actual: any;
    };
  };
  procedure_context: {
    procedure_id: string;
    current_step_number: number;
    total_steps: number;
  };
}

export interface RecoveryAgentOutput {
  diagnosis: FailureDiagnosis;
  recommended_actions: RecoveryActionRecommendation[];
  should_abort: boolean;
  abort_reason?: string;
  alternative_step_id?: string;
}

export interface FailureDiagnosis {
  root_cause: string;
  likely_reason: string;
  confidence: number;
  evidence: string[];
}

export interface RecoveryActionRecommendation {
  action: {
    type: 'retry' | 'refresh_page' | 'navigate_back' | 'clear_state' | 'manual_intervention' | 'alternate_path';
    description: string;
    tool_invocation?: {
      tool_name: string;
      tool_params: Record<string, any>;
    };
  };
  success_probability: number;
  reasoning: string;
}

/**
 * Common Agent Interface
 *
 * All agents implement this base contract
 */
export interface AgentExecutor<TInput, TOutput> {
  name: string;
  version: string;

  execute(input: TInput): Promise<AgentResponse<TOutput>>;
}

export interface AgentResponse<TOutput> {
  output: TOutput;
  metadata: {
    agent_name: string;
    agent_version: string;
    execution_time_ms: number;
    model_used: string;
    tokens_used?: number;
  };
  audit_log: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: number;
  action: string;
  details: Record<string, any>;
}
