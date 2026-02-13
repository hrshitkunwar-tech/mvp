/**
 * Procedural Intelligence Schema
 *
 * Procedures encode product knowledge as deterministic step sequences
 * Each step has preconditions, guidance, targets, success conditions, and recovery
 */

export interface Procedure {
  id: string;
  name: string;
  description: string;
  product: string;
  version: string;

  // Activation criteria
  intent_patterns: string[];
  required_context: string[];

  // Execution flow
  steps: ProcedureStep[];

  // Metadata
  created_at: number;
  updated_at: number;
  author: string;
  status: 'draft' | 'active' | 'deprecated';
}

export interface ProcedureStep {
  step_id: string;
  step_number: number;

  // What must be true before this step
  preconditions: Precondition[];

  // What to tell the user
  guidance: StepGuidance;

  // Where the user should act
  target: StepTarget;

  // How to know the step succeeded
  success_conditions: SuccessCondition[];

  // What to do if it fails
  recovery: RecoveryStrategy;

  // Optional branching
  conditional_next?: ConditionalBranch[];
  next_step_id?: string;
}

/**
 * Preconditions - Must be satisfied before step execution
 */
export interface Precondition {
  type: 'element_present' | 'element_state' | 'page_type' | 'feature_visible' | 'custom_validation';
  description: string;

  // Element-based conditions
  element_selector?: ElementSelector;
  expected_state?: Partial<ElementState>;

  // Page-based conditions
  expected_page_type?: string;
  expected_feature?: string;

  // Custom validation via tools
  validation_tool?: string;
  validation_params?: Record<string, any>;

  required: boolean; // If false, step can proceed with warning
}

/**
 * Step Guidance - What to show the user
 */
export interface StepGuidance {
  instruction: string; // Plain text instruction
  visual_cue?: VisualCue;
  tips?: string[];
  warnings?: string[];
  estimated_duration_seconds?: number;
}

export interface VisualCue {
  type: 'highlight' | 'arrow' | 'circle' | 'annotation';
  target_element?: ElementSelector;
  position?: { x: number; y: number };
  message?: string;
}

/**
 * Step Target - Where the user should interact
 */
export interface StepTarget {
  type: 'element' | 'area' | 'page' | 'external' | 'none';

  // Element target
  element_selector?: ElementSelector;
  interaction_type?: 'click' | 'type' | 'select' | 'check' | 'navigate' | 'wait';
  interaction_value?: string; // For typing or selecting

  // Area target
  area?: BoundingBox;

  // Page target
  expected_navigation?: string; // URL pattern

  // External target
  external_url?: string;
}

export interface ElementSelector {
  // Multiple strategies for resilience
  by_label?: string;
  by_role?: string;
  by_type?: UIElementType;
  by_position?: { relative_to: string; direction: 'above' | 'below' | 'left' | 'right' };
  by_attributes?: Record<string, string>;

  // Fuzzy matching
  label_similarity_threshold?: number; // 0-1
  allow_partial_match?: boolean;
}

/**
 * Success Conditions - How to verify step completion
 */
export interface SuccessCondition {
  type: 'element_present' | 'element_absent' | 'element_state' | 'page_changed' | 'validation_passed';
  description: string;

  // Element-based
  element_selector?: ElementSelector;
  expected_state?: Partial<ElementState>;

  // Page-based
  expected_page_type?: string;
  expected_url_pattern?: string;

  // Validation-based
  validation_tool?: string;
  validation_params?: Record<string, any>;

  timeout_seconds: number;
  required: boolean; // If false, can proceed with partial success
}

/**
 * Recovery Strategy - What to do when step fails
 */
export interface RecoveryStrategy {
  max_retries: number;
  retry_delay_seconds: number;

  on_failure: RecoveryAction[];

  // When all retries exhausted
  fallback: 'abort' | 'skip' | 'alternate_step' | 'manual_intervention';
  alternate_step_id?: string;
  manual_intervention_message?: string;
}

export interface RecoveryAction {
  type: 'retry' | 'refresh_page' | 'navigate_back' | 'clear_state' | 'invoke_tool' | 'request_help';
  description: string;

  tool_name?: string;
  tool_params?: Record<string, any>;

  navigation_url?: string;
}

/**
 * Conditional Branching
 */
export interface ConditionalBranch {
  condition: {
    type: 'element_present' | 'element_state' | 'page_type' | 'user_choice';
    element_selector?: ElementSelector;
    expected_state?: Partial<ElementState>;
    expected_page_type?: string;
    choice_options?: string[];
  };
  next_step_id: string;
  description: string;
}

/**
 * Procedure Execution State
 */
export interface ProcedureExecution {
  execution_id: string;
  procedure_id: string;
  session_id: string;

  status: 'active' | 'paused' | 'completed' | 'failed' | 'aborted';

  current_step_id: string;
  current_step_number: number;

  execution_history: StepExecution[];

  context: ExecutionContext;

  started_at: number;
  updated_at: number;
  completed_at?: number;
}

export interface StepExecution {
  step_id: string;
  step_number: number;

  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';

  preconditions_met: boolean;
  precondition_results: PreconditionResult[];

  success_conditions_met: boolean;
  success_condition_results: SuccessConditionResult[];

  retry_count: number;
  recovery_actions_taken: RecoveryAction[];

  started_at: number;
  completed_at?: number;

  ui_state_before?: UIState;
  ui_state_after?: UIState;

  error_message?: string;
}

export interface PreconditionResult {
  precondition: Precondition;
  met: boolean;
  actual_value?: any;
  error_message?: string;
}

export interface SuccessConditionResult {
  condition: SuccessCondition;
  met: boolean;
  actual_value?: any;
  error_message?: string;
}

export interface ExecutionContext {
  user_input?: Record<string, any>;
  captured_values?: Record<string, any>; // Values captured during execution
  session_metadata?: Record<string, any>;
}
