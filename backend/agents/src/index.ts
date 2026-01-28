/**
 * Agent Service HTTP Server
 *
 * Exposes 4 specialized agents as REST APIs
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  IntentInferenceAgent,
  ProcedureReasoningAgent,
  GuidanceAgent,
  RecoveryAgent
} from './agent-service';
import type {
  IntentInferenceInput,
  ProcedureReasoningInput,
  GuidanceAgentInput,
  RecoveryAgentInput
} from './agent-contracts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize agents
const intentAgent = new IntentInferenceAgent();
const procedureAgent = new ProcedureReasoningAgent();
const guidanceAgent = new GuidanceAgent();
const recoveryAgent = new RecoveryAgent();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-service',
    agents: ['intent_inference', 'procedure_reasoning', 'guidance', 'recovery'],
    timestamp: Date.now()
  });
});

// Intent Inference Agent
app.post('/agents/intent-inference', async (req, res) => {
  try {
    const input: IntentInferenceInput = req.body;
    console.log(`[Intent Agent] Processing session: ${input.session_context.session_id}`);

    const response = await intentAgent.execute(input);

    console.log(`[Intent Agent] Inferred: ${response.output.inferred_intent.intent_description} (confidence: ${response.output.confidence})`);

    res.json(response);
  } catch (error: any) {
    console.error('[Intent Agent] Error:', error);
    res.status(500).json({
      error: 'Intent inference failed',
      message: error.message
    });
  }
});

// Procedure Reasoning Agent
app.post('/agents/procedure-reasoning', async (req, res) => {
  try {
    const input: ProcedureReasoningInput = req.body;
    console.log(`[Procedure Agent] Selecting procedure for intent: ${input.intent.intent_description}`);

    const response = await procedureAgent.execute(input);

    if (response.output.recommended_procedure) {
      console.log(`[Procedure Agent] Selected: ${response.output.recommended_procedure.procedure.name} (relevance: ${response.output.recommended_procedure.relevance_score})`);
    } else {
      console.log(`[Procedure Agent] No suitable procedure found`);
    }

    res.json(response);
  } catch (error: any) {
    console.error('[Procedure Agent] Error:', error);
    res.status(500).json({
      error: 'Procedure reasoning failed',
      message: error.message
    });
  }
});

// Guidance Agent
app.post('/agents/guidance', async (req, res) => {
  try {
    const input: GuidanceAgentInput = req.body;
    console.log(`[Guidance Agent] Generating guidance for step: ${input.current_step.step_id}`);

    const response = await guidanceAgent.execute(input);

    console.log(`[Guidance Agent] Instruction: ${response.output.primary_instruction}`);

    res.json(response);
  } catch (error: any) {
    console.error('[Guidance Agent] Error:', error);
    res.status(500).json({
      error: 'Guidance generation failed',
      message: error.message
    });
  }
});

// Recovery Agent
app.post('/agents/recovery', async (req, res) => {
  try {
    const input: RecoveryAgentInput = req.body;
    console.log(`[Recovery Agent] Analyzing failure: ${input.failure_context.error_type}`);

    const response = await recoveryAgent.execute(input);

    console.log(`[Recovery Agent] Diagnosis: ${response.output.diagnosis.root_cause}`);
    console.log(`[Recovery Agent] Recommended: ${response.output.recommended_actions[0]?.action.type || 'abort'}`);

    res.json(response);
  } catch (error: any) {
    console.error('[Recovery Agent] Error:', error);
    res.status(500).json({
      error: 'Recovery analysis failed',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Agent Service running on http://localhost:${PORT}`);
  console.log(`🤖 Agents: Intent, Procedure, Guidance, Recovery`);
  console.log(`🔑 OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
