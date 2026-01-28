# Navigator Backend Architecture

## System Overview

Navigator is a **deterministic procedural intelligence platform** that converts raw screenshots into step-by-step product guidance.

### Core Principles

1. **Vision ≠ Reasoning ≠ Execution**
   - Vision models only perceive (screenshots → UI state)
   - Agents only advise (recommendations, not actions)
   - Orchestration layer controls all flow

2. **Deterministic by Design**
   - Same input → same output
   - Fully auditable execution
   - Replayable from any state
   - No hallucinations

3. **Procedures Over Prompts**
   - Product knowledge encoded as executable procedures
   - Each step has preconditions, guidance, targets, success conditions, recovery
   - No free-form generation

## Architecture Layers

### 1. Vision Interpretation Layer

**Purpose**: Convert screenshots → structured UI state

**Input**:
- Screenshot image
- Viewport metadata
- Session context

**Output**:
- UI elements (type, label, bounding box, state, confidence)
- Page classification
- Visible features

**Guarantees**:
- Stateless
- Confidence-scored
- No reasoning or decisions

**Implementation**: `backend/services/vision-service.ts`

### 2. Orchestration Layer (n8n)

**Purpose**: Deterministic control flow

**Responsibilities**:
- Maintain execution state
- Route between agents and tools
- Enforce preconditions
- Validate success conditions
- Log all decisions

**Workflows**:
1. `main-orchestrator.json` - Entry point for screenshot events
2. `intent-inference-workflow.json` - Intent detection → procedure selection
3. `procedure-execution-workflow.json` - Step-by-step execution loop
4. `step-validation-workflow.json` - Precondition/success checking
5. `recovery-workflow.json` - Error handling

**Key Decision**: Agents never control flow. n8n decides what happens next.

### 3. Agent System

**Four Specialized Agents** (all advisory-only):

#### Agent 1: Intent Inference
- **Input**: Current + previous UI states
- **Output**: Intent hypothesis with confidence
- **Role**: "Based on UI sequence, user likely wants to..."

#### Agent 2: Procedure Reasoning
- **Input**: Intent + available procedures + current state
- **Output**: Recommended procedure (or abort)
- **Role**: "Best procedure for this intent is..."

#### Agent 3: Guidance
- **Input**: Current step + UI state + execution context
- **Output**: Contextual user guidance
- **Role**: "Show user: Click the 'Save' button"

#### Agent 4: Recovery
- **Input**: Failed step + error context + UI state
- **Output**: Recovery recommendations
- **Role**: "Step failed because... recommend retry/refresh/abort"

**Implementation**: `backend/agents/`

### 4. Procedural Intelligence Model

**Procedures** encode product knowledge as deterministic step sequences.

**Structure**:
```typescript
Procedure {
  id, name, description
  intent_patterns: ["create project", "new workspace"]
  steps: [
    {
      preconditions: [...],    // What must be true
      guidance: {...},          // What to tell user
      target: {...},            // Where to interact
      success_conditions: [...],// How to verify
      recovery: {...}           // What if it fails
    }
  ]
}
```

**Key Insight**: Steps are data, not code. This prevents hallucination.

**Implementation**: `backend/schemas/procedure.schema.ts`

### 5. Tool Framework

**Three Categories**:

1. **Observation Tools** (read-only)
   - `find_element` - Locate UI elements
   - `get_element_state` - Check element state
   - `detect_page_type` - Identify page
   - `compare_ui_states` - Detect changes

2. **Validation Tools** (check conditions)
   - `validate_precondition` - Check if step can proceed
   - `validate_success_condition` - Check if step succeeded
   - `check_interactability` - Verify element can be interacted with

3. **Knowledge Lookup Tools**
   - `find_procedures_by_intent` - Search procedure database
   - `get_procedure` - Retrieve procedure by ID
   - `query_product_knowledge` - Search product docs

**Implementation**: `backend/tools/`

### 6. State Management (Convex)

**Database Tables**:
- `ui_states` - Vision interpretation results
- `procedures` - Procedure definitions
- `executions` - Active/completed procedure runs
- `agent_logs` - Agent execution audit trail
- `tool_logs` - Tool execution audit trail
- `sessions` - User sessions
- `intent_history` - Intent inference history

**Implementation**: `backend/convex/`

## Execution Flow

### Happy Path: Screenshot → Guidance

```
1. Browser Extension → Screenshot Event
   ↓
2. Main Orchestrator (n8n)
   ↓
3. Vision Interpretation Service
   → UI State (elements, page type, features)
   ↓
4. Store in Convex (ui_states table)
   ↓
5. Check for Active Execution
   ├─ YES → Continue Procedure Execution (Step 10)
   └─ NO → Intent Inference (Step 6)
   ↓
6. Intent Inference Agent
   → Intent hypothesis + confidence
   ↓
7. Find Matching Procedures (Convex query)
   ↓
8. Procedure Reasoning Agent
   → Recommended procedure
   ↓
9. Create Procedure Execution (Convex)
   ↓
10. Procedure Execution Loop:
    ├─ Get Current Step
    ├─ Validate Preconditions (Tool)
    ├─ Generate Guidance (Agent 3)
    ├─ Send to Extension
    ├─ Wait for User Action
    ├─ Validate Success Conditions (Tool)
    ├─ [Success] → Next Step
    └─ [Failure] → Recovery Agent → Retry/Abort
```

### Precondition Validation

```
For each precondition in current step:
1. Call validate_precondition tool
2. Check: element_present | element_state | page_type | feature_visible
3. Result: satisfied (yes/no) + actual vs expected
4. If required=true and not satisfied → Recovery
5. If required=false and not satisfied → Log warning, proceed
```

### Success Condition Validation

```
After user action:
1. Get new UI state
2. For each success condition:
   - Call validate_success_condition tool
   - Check: element_present | element_absent | element_state | page_changed
3. All required conditions met? → Mark step complete
4. Otherwise → Recovery
```

### Recovery Flow

```
Step fails:
1. Recovery Agent analyzes:
   - Failed step definition
   - Error type + message
   - UI state at failure
   - Expected vs actual
2. Agent recommends actions:
   - Retry (with delay)
   - Refresh page
   - Navigate back
   - Manual intervention
   - Abort
3. n8n executes recommended action
4. Update execution history
5. Retry or abort based on max_retries
```

## Anti-Hallucination Guarantees

### 1. Vision Layer
- ✅ Outputs confidence scores
- ✅ No reasoning, only perception
- ✅ Structured output schema enforced

### 2. Agent Layer
- ✅ Agents recommend, never execute
- ✅ All recommendations scored
- ✅ Orchestration validates recommendations

### 3. Procedure Layer
- ✅ Steps are data, not generated
- ✅ Preconditions prevent invalid states
- ✅ Success conditions verify completion
- ✅ Recovery handles failures safely

### 4. Orchestration Layer
- ✅ Deterministic decision logic
- ✅ State machine, not conversation
- ✅ Full audit trail
- ✅ Replayable execution

## Key Design Decisions

### Why n8n for Orchestration?

1. **Visual Workflows** - Non-engineers can understand control flow
2. **Deterministic** - No hidden LLM decisions
3. **Auditable** - Every node logs execution
4. **Recoverable** - Can resume from any node
5. **Extensible** - Easy to add new tools/agents

### Why Separate Agents?

1. **Narrow Scope** - Each agent does one thing well
2. **Testable** - Can validate each agent independently
3. **Replaceable** - Can swap models per agent
4. **Cost Control** - Use cheaper models for simpler agents

### Why Tools?

1. **Deterministic** - Same input → same output
2. **Composable** - Combine tools for complex checks
3. **Testable** - Unit test each tool
4. **Safe** - Read-only tools have no side effects

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│ Browser Extension (captures screenshots)    │
└─────────────────┬───────────────────────────┘
                  │ WebSocket/Webhook
┌─────────────────▼───────────────────────────┐
│ n8n (Orchestration Layer)                   │
│  ├─ Main Orchestrator Workflow              │
│  ├─ Intent Inference Workflow               │
│  ├─ Procedure Execution Workflow            │
│  └─ Recovery Workflow                       │
└──┬────────────┬────────────┬────────────────┘
   │            │            │
   │            │            │
┌──▼─────┐ ┌───▼─────┐ ┌────▼────────┐
│ Vision │ │ Agent   │ │ Tool        │
│ Service│ │ Service │ │ Service     │
│        │ │         │ │             │
│ GPT-4V │ │ GPT-4   │ │ Node.js     │
└────────┘ └─────────┘ └─────────────┘
     │          │            │
     └──────────┴────────────┘
                │
     ┌──────────▼──────────┐
     │ Convex (Database)   │
     │  ├─ ui_states       │
     │  ├─ procedures      │
     │  ├─ executions      │
     │  └─ logs            │
     └─────────────────────┘
```

## Getting Started

### 1. Setup Convex
```bash
cd backend/convex
npm install
npx convex dev
```

### 2. Deploy Vision Service
```bash
cd backend/services
npm install
npm run deploy
```

### 3. Deploy Agent Service
```bash
cd backend/agents
npm install
npm run deploy
```

### 4. Import n8n Workflows
1. Open n8n dashboard
2. Import workflows from `backend/n8n-workflows/`
3. Configure environment variables:
   - `VISION_SERVICE_URL`
   - `AGENT_SERVICE_URL`
   - `CONVEX_URL`
   - `EXTENSION_SOCKET_URL`

### 5. Test End-to-End
```bash
# Send test screenshot event
curl -X POST http://n8n-instance/webhook/navigator-screenshot-event \
  -H "Content-Type: application/json" \
  -d @test/sample-screenshot-event.json
```

## Extending the System

### Add a New Tool

1. Define contract in `tools/tool-contracts.ts`
2. Implement in `tools/observation-tools.ts` or `tools/validation-tools.ts`
3. Register in tool registry
4. Use in n8n workflows

### Add a New Procedure

1. Define procedure JSON matching schema
2. Store in Convex via `procedures.create` mutation
3. Test with matching intent patterns

### Add a New Agent

1. Define contract in `agents/agent-contracts.ts`
2. Implement in `agents/agent-service.ts`
3. Create n8n workflow node to call agent
4. Add to orchestration flow

## Monitoring & Debugging

### Audit Trail

Every execution is fully logged:
- Agent inputs/outputs in `agent_logs`
- Tool inputs/outputs in `tool_logs`
- Execution history in `executions.execution_history`

### Replay Execution

```typescript
// Get execution by ID
const execution = await convex.query("executions.getCurrent", {
  execution_id: "..."
});

// Replay from any step
const step = execution.execution_history[5];
// Resume procedure execution from this step
```

### Debug Workflow

1. Open n8n workflow
2. View execution logs for each node
3. Inspect inputs/outputs at each step
4. Identify where flow diverged

## Performance Optimization

### Vision Caching
- Cache UI states for 30s
- Skip re-interpretation if screenshot unchanged

### Agent Response Streaming
- Stream guidance to user as generated
- Don't wait for full response

### Parallel Tool Execution
- Run independent precondition checks in parallel
- Aggregate results

### Procedure Indexing
- Index procedures by intent patterns
- Use semantic search for better matching

## Security Considerations

### Screenshot Privacy
- Encrypt screenshots at rest
- Auto-delete after 24 hours
- User consent for storage

### Agent Isolation
- Agents run in sandboxed environment
- No direct database access
- All data via API boundaries

### Procedure Validation
- Author authentication required
- Procedure review workflow
- Version control for procedures

## Cost Optimization

### Vision Model Usage
- Use smallest viable model (GPT-4V mini)
- Batch requests where possible
- Cache common UI patterns

### Agent Model Usage
- Intent Inference: GPT-4-turbo
- Procedure Reasoning: GPT-4-turbo
- Guidance: GPT-3.5-turbo (sufficient)
- Recovery: GPT-4-turbo

### Database Optimization
- Index by session_id, timestamp
- Archive old executions
- Compress audit logs

## Testing Strategy

### Unit Tests
- Each tool independently
- Each agent with mock inputs
- Vision service with sample screenshots

### Integration Tests
- Full workflow end-to-end
- Mock LLM responses for determinism
- Verify state transitions

### Procedure Tests
- Each procedure with known UI states
- Verify preconditions/success conditions
- Test recovery paths

## Conclusion

Navigator achieves **deterministic procedural intelligence** by:

1. ✅ Separating perception (vision) from reasoning (agents) from execution (orchestration)
2. ✅ Encoding knowledge as procedures, not prompts
3. ✅ Validating every state transition
4. ✅ Making all decisions auditable and replayable

**Result**: "Given the current screen state, Navigator always knows the next correct step — or safely stops."
