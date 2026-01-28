/**
 * Tool Framework Contracts
 *
 * Tools are deterministic, auditable functions used by orchestration layer
 * Categories: Observation, Validation, Knowledge Lookup
 */

import { UIState, UIElement, ElementState } from '../schemas/ui-state.schema';
import { ElementSelector, Precondition, SuccessCondition } from '../schemas/procedure.schema';

/**
 * Base Tool Interface
 */
export interface Tool<TInput, TOutput> {
  name: string;
  category: 'observation' | 'validation' | 'knowledge';
  description: string;
  deterministic: boolean;

  execute(input: TInput): Promise<ToolResult<TOutput>>;
}

export interface ToolResult<TOutput> {
  success: boolean;
  output?: TOutput;
  error?: string;
  execution_time_ms: number;
  metadata: Record<string, any>;
}

/**
 * OBSERVATION TOOLS
 * Extract information from UI state without side effects
 */

// Tool: Find Element
export interface FindElementInput {
  ui_state: UIState;
  selector: ElementSelector;
  options?: {
    return_multiple?: boolean;
    min_confidence?: number;
  };
}

export interface FindElementOutput {
  elements: UIElement[];
  match_confidence: number;
  search_strategy_used: string;
}

// Tool: Get Element State
export interface GetElementStateInput {
  ui_state: UIState;
  element_id: string;
}

export interface GetElementStateOutput {
  element: UIElement;
  state: ElementState;
  confidence: number;
}

// Tool: Detect Page Type
export interface DetectPageTypeInput {
  ui_state: UIState;
}

export interface DetectPageTypeOutput {
  page_type: string;
  confidence: number;
  features_detected: string[];
}

// Tool: Extract Form Fields
export interface ExtractFormFieldsInput {
  ui_state: UIState;
}

export interface ExtractFormFieldsOutput {
  fields: FormField[];
  form_completion_percentage: number;
}

export interface FormField {
  element: UIElement;
  field_name: string;
  field_type: string;
  required: boolean;
  filled: boolean;
  current_value?: string;
  validation_state?: 'valid' | 'invalid' | 'unknown';
}

// Tool: Compare UI States
export interface CompareUIStatesInput {
  state_before: UIState;
  state_after: UIState;
  focus_area?: 'full_page' | 'specific_element';
  element_id?: string;
}

export interface CompareUIStatesOutput {
  changed: boolean;
  changes: UIChange[];
  similarity_score: number;
}

export interface UIChange {
  change_type: 'element_added' | 'element_removed' | 'element_state_changed' | 'page_changed';
  description: string;
  element_id?: string;
  before_value?: any;
  after_value?: any;
}

/**
 * VALIDATION TOOLS
 * Check conditions and constraints
 */

// Tool: Validate Precondition
export interface ValidatePreconditionInput {
  precondition: Precondition;
  ui_state: UIState;
}

export interface ValidatePreconditionOutput {
  satisfied: boolean;
  expected: any;
  actual: any;
  error_message?: string;
}

// Tool: Validate Success Condition
export interface ValidateSuccessConditionInput {
  condition: SuccessCondition;
  ui_state: UIState;
  timeout_seconds: number;
}

export interface ValidateSuccessConditionOutput {
  satisfied: boolean;
  expected: any;
  actual: any;
  timed_out: boolean;
  wait_time_seconds: number;
  error_message?: string;
}

// Tool: Check Element Interactability
export interface CheckInteractabilityInput {
  ui_state: UIState;
  element_id: string;
  interaction_type: 'click' | 'type' | 'select';
}

export interface CheckInteractabilityOutput {
  interactable: boolean;
  reasons: string[];
  blocking_issues?: {
    overlapping_elements?: string[];
    not_visible?: boolean;
    not_enabled?: boolean;
  };
}

// Tool: Validate Navigation
export interface ValidateNavigationInput {
  current_state: UIState;
  expected_url_pattern?: string;
  expected_page_type?: string;
}

export interface ValidateNavigationOutput {
  valid: boolean;
  current_url: string;
  expected_url_pattern?: string;
  matches: boolean;
  current_page_type: string;
}

/**
 * KNOWLEDGE LOOKUP TOOLS
 * Query procedure database and product knowledge
 */

// Tool: Find Procedures by Intent
export interface FindProceduresByIntentInput {
  intent_description: string;
  product: string;
  context?: Record<string, any>;
}

export interface FindProceduresByIntentOutput {
  procedures: Array<{
    procedure_id: string;
    name: string;
    relevance_score: number;
  }>;
}

// Tool: Get Procedure by ID
export interface GetProcedureInput {
  procedure_id: string;
}

export interface GetProcedureOutput {
  procedure: any; // Full Procedure object
}

// Tool: Get Step by ID
export interface GetStepInput {
  procedure_id: string;
  step_id: string;
}

export interface GetStepOutput {
  step: any; // ProcedureStep object
  step_context: {
    is_first_step: boolean;
    is_last_step: boolean;
    previous_step_id?: string;
    next_step_id?: string;
  };
}

// Tool: Query Product Knowledge
export interface QueryProductKnowledgeInput {
  query: string;
  product: string;
  category?: 'ui_patterns' | 'business_rules' | 'feature_descriptions';
}

export interface QueryProductKnowledgeOutput {
  results: Array<{
    content: string;
    relevance_score: number;
    source: string;
  }>;
}

/**
 * UTILITY TOOLS
 */

// Tool: Element Selector Resolver
export interface ResolveElementSelectorInput {
  ui_state: UIState;
  selector: ElementSelector;
}

export interface ResolveElementSelectorOutput {
  resolved_element_ids: string[];
  confidence_scores: number[];
  resolution_strategy: string;
}

// Tool: Fuzzy Element Matcher
export interface FuzzyElementMatchInput {
  ui_state: UIState;
  target_label: string;
  target_type?: string;
  similarity_threshold: number;
}

export interface FuzzyElementMatchOutput {
  matches: Array<{
    element: UIElement;
    similarity_score: number;
  }>;
}

/**
 * Tool Registry
 */
export interface ToolRegistry {
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void;
  get<TInput, TOutput>(toolName: string): Tool<TInput, TOutput> | undefined;
  list(): ToolMetadata[];
}

export interface ToolMetadata {
  name: string;
  category: string;
  description: string;
  input_schema: any;
  output_schema: any;
}
