/**
 * Agent Service
 *
 * HTTP service that exposes all 4 agents as API endpoints
 * Agents are stateless and advisory-only
 */

import {
  IntentInferenceInput,
  IntentInferenceOutput,
  ProcedureReasoningInput,
  ProcedureReasoningOutput,
  GuidanceAgentInput,
  GuidanceAgentOutput,
  RecoveryAgentInput,
  RecoveryAgentOutput,
  AgentResponse,
} from './agent-contracts';

/**
 * Agent 1: Intent Inference
 */
export class IntentInferenceAgent {
  name = 'intent_inference';
  version = '1.0.0';

  async execute(input: IntentInferenceInput): Promise<AgentResponse<IntentInferenceOutput>> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(input);
    const llmResponse = await this.callLLM(prompt);
    const output = this.parseResponse(llmResponse);

    return {
      output,
      metadata: {
        agent_name: this.name,
        agent_version: this.version,
        execution_time_ms: Date.now() - startTime,
        model_used: 'gpt-4-turbo',
      },
      audit_log: [
        {
          timestamp: Date.now(),
          action: 'intent_inferred',
          details: { confidence: output.confidence },
        },
      ],
    };
  }

  private buildPrompt(input: IntentInferenceInput): string {
    return `You are an Intent Inference Agent. Your ONLY job is to infer user intent from UI state sequence.

CRITICAL RULES:
- You provide ADVISORY OUTPUT ONLY
- You do NOT make decisions
- You do NOT execute actions
- You do NOT control flow
- You ONLY analyze and recommend

CURRENT UI STATE:
${JSON.stringify(input.current_state.interpretation, null, 2)}

PREVIOUS UI STATES (last 5):
${input.previous_states.map((s, i) => `State ${i + 1}: ${s.viewport.url} - ${s.interpretation.page_classification.page_type}`).join('\n')}

SESSION CONTEXT:
- Session ID: ${input.session_context.session_id}
- Time in session: ${input.session_context.time_in_session_seconds}s

TASK:
Analyze the UI state sequence and infer what the user is trying to accomplish.

Provide:
1. Primary intent hypothesis (with confidence 0-1)
2. Alternative intent hypotheses (with confidence scores)
3. Evidence for each hypothesis
4. Reasoning

Return JSON matching this interface:

{
  "inferred_intent": {
    "intent_id": "unique_id",
    "intent_description": "User wants to...",
    "intent_category": "navigation|data_entry|configuration|exploration|unknown",
    "evidence": [
      {
        "type": "page_sequence|element_interaction|time_pattern|element_focus",
        "description": "Evidence description",
        "weight": 0.8
      }
    ],
    "confidence": 0.85
  },
  "alternative_intents": [...],
  "reasoning": "Explanation of why this is the most likely intent",
  "confidence": 0.85
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    // Implement LLM API call here
    // Example: OpenAI, Anthropic, etc.
    return '{}'; // Placeholder
  }

  private parseResponse(response: string): IntentInferenceOutput {
    return JSON.parse(response);
  }
}

/**
 * Agent 2: Procedure Reasoning
 */
export class ProcedureReasoningAgent {
  name = 'procedure_reasoning';
  version = '1.0.0';

  async execute(input: ProcedureReasoningInput): Promise<AgentResponse<ProcedureReasoningOutput>> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(input);
    const llmResponse = await this.callLLM(prompt);
    const output = this.parseResponse(llmResponse);

    return {
      output,
      metadata: {
        agent_name: this.name,
        agent_version: this.version,
        execution_time_ms: Date.now() - startTime,
        model_used: 'gpt-4-turbo',
      },
      audit_log: [
        {
          timestamp: Date.now(),
          action: 'procedure_selected',
          details: { procedure_id: output.recommended_procedure?.procedure.id },
        },
      ],
    };
  }

  private buildPrompt(input: ProcedureReasoningInput): string {
    return `You are a Procedure Reasoning Agent. Your ONLY job is to select the best procedure for the current intent and context.

CRITICAL RULES:
- You provide ADVISORY OUTPUT ONLY
- You do NOT execute procedures
- You do NOT control flow
- You ONLY analyze and recommend

INFERRED INTENT:
${JSON.stringify(input.intent, null, 2)}

CURRENT UI STATE:
Page: ${input.current_state.interpretation.page_classification.page_type}
URL: ${input.current_state.viewport.url}
Elements: ${input.current_state.interpretation.elements.length}

AVAILABLE PROCEDURES (${input.available_procedures.length}):
${input.available_procedures.map((p, i) => `${i + 1}. ${p.name}: ${p.description}`).join('\n')}

TASK:
Select the most appropriate procedure for this intent and current state.

Provide:
1. Recommended procedure (or null if none match)
2. Relevance score (0-1)
3. Match reasons
4. Potential issues or warnings
5. Alternative procedures
6. Whether to abort (if no suitable procedure)

Return JSON:

{
  "recommended_procedure": {
    "procedure": <full procedure object>,
    "relevance_score": 0.9,
    "match_reasons": ["Intent matches pattern", "Current page is correct"],
    "potential_issues": [],
    "estimated_completion_time_seconds": 120
  },
  "alternative_procedures": [...],
  "reasoning": "Why this procedure was selected",
  "should_abort": false
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    return '{}'; // Placeholder
  }

  private parseResponse(response: string): ProcedureReasoningOutput {
    return JSON.parse(response);
  }
}

/**
 * Agent 3: Guidance
 */
export class GuidanceAgent {
  name = 'guidance';
  version = '1.0.0';

  async execute(input: GuidanceAgentInput): Promise<AgentResponse<GuidanceAgentOutput>> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(input);
    const llmResponse = await this.callLLM(prompt);
    const output = this.parseResponse(llmResponse);

    return {
      output,
      metadata: {
        agent_name: this.name,
        agent_version: this.version,
        execution_time_ms: Date.now() - startTime,
        model_used: 'gpt-4-turbo',
      },
      audit_log: [
        {
          timestamp: Date.now(),
          action: 'guidance_generated',
          details: { step_id: input.current_step.step_id },
        },
      ],
    };
  }

  private buildPrompt(input: GuidanceAgentInput): string {
    return `You are a Guidance Agent. Your ONLY job is to generate clear, contextual guidance for the current step.

CRITICAL RULES:
- You provide ADVISORY OUTPUT ONLY
- You do NOT execute actions
- You ONLY generate user-facing guidance

CURRENT STEP:
${JSON.stringify(input.current_step, null, 2)}

CURRENT UI STATE:
${JSON.stringify(input.current_state.interpretation, null, 2)}

EXECUTION CONTEXT:
- Step ${input.execution_context.step_number} of ${input.execution_context.total_steps}
- Retry count: ${input.execution_context.retry_count}

TASK:
Generate clear, actionable guidance for this step.

Provide:
1. Primary instruction (simple, clear)
2. Contextual hints
3. Visual guidance (element to highlight)
4. Warnings if needed
5. Estimated duration

Return JSON:

{
  "primary_instruction": "Click the 'Create Project' button",
  "contextual_hints": ["Make sure you have a project name ready"],
  "visual_guidance": {
    "highlight_element": {
      "selector": {...},
      "matched_element_id": "element_123",
      "confidence": 0.95
    }
  },
  "warnings": [],
  "estimated_duration_seconds": 5
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    return '{}'; // Placeholder
  }

  private parseResponse(response: string): GuidanceAgentOutput {
    return JSON.parse(response);
  }
}

/**
 * Agent 4: Recovery
 */
export class RecoveryAgent {
  name = 'recovery';
  version = '1.0.0';

  async execute(input: RecoveryAgentInput): Promise<AgentResponse<RecoveryAgentOutput>> {
    const startTime = Date.now();

    const prompt = this.buildPrompt(input);
    const llmResponse = await this.callLLM(prompt);
    const output = this.parseResponse(llmResponse);

    return {
      output,
      metadata: {
        agent_name: this.name,
        agent_version: this.version,
        execution_time_ms: Date.now() - startTime,
        model_used: 'gpt-4-turbo',
      },
      audit_log: [
        {
          timestamp: Date.now(),
          action: 'recovery_recommended',
          details: { diagnosis: output.diagnosis.root_cause },
        },
      ],
    };
  }

  private buildPrompt(input: RecoveryAgentInput): string {
    return `You are a Recovery Agent. Your ONLY job is to diagnose failures and recommend recovery actions.

CRITICAL RULES:
- You provide ADVISORY OUTPUT ONLY
- You do NOT execute recovery actions
- You ONLY diagnose and recommend

FAILED STEP:
${JSON.stringify(input.failed_step, null, 2)}

FAILURE CONTEXT:
Error type: ${input.failure_context.error_type}
Error message: ${input.failure_context.error_message}
Retry count: ${input.failure_context.retry_count}
Expected vs Actual: ${JSON.stringify(input.failure_context.expected_vs_actual)}

UI STATE AT FAILURE:
${JSON.stringify(input.failure_context.ui_state_at_failure.interpretation, null, 2)}

PROCEDURE CONTEXT:
Step ${input.procedure_context.current_step_number} of ${input.procedure_context.total_steps}

TASK:
Diagnose why this step failed and recommend recovery actions.

Provide:
1. Diagnosis (root cause, likely reason, confidence, evidence)
2. Recommended recovery actions (ordered by success probability)
3. Whether to abort
4. Alternative step if needed

Return JSON:

{
  "diagnosis": {
    "root_cause": "Element not found",
    "likely_reason": "UI changed or element moved",
    "confidence": 0.85,
    "evidence": ["Expected element not in UI state", "Page type changed"]
  },
  "recommended_actions": [
    {
      "action": {
        "type": "refresh_page",
        "description": "Refresh the page and retry"
      },
      "success_probability": 0.7,
      "reasoning": "Page may have timed out"
    }
  ],
  "should_abort": false
}`;
  }

  private async callLLM(prompt: string): Promise<string> {
    return '{}'; // Placeholder
  }

  private parseResponse(response: string): RecoveryAgentOutput {
    return JSON.parse(response);
  }
}
