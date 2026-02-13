# Navigator Backend System

> **Deterministic procedural intelligence platform that converts screenshots into step-by-step product guidance.**

## What Navigator Does

Navigator watches users interact with software and provides **just-in-time, deterministic guidance** without hallucinations.

**Input**: Screenshot from browser extension
**Output**: "Click the 'Create Project' button" (with confidence this is correct)

## Core Innovation

### The Problem with LLM-Based Guidance

Traditional LLM chatbots:
- ❌ Hallucinate steps that don't exist
- ❌ Make non-deterministic recommendations
- ❌ Can't verify their own guidance
- ❌ No audit trail or replay

### Navigator's Solution: Procedural Intelligence

Navigator separates concerns into a **deterministic architecture**:

```
Vision (perception)  →  Agents (reasoning)  →  Orchestration (decisions)  →  Tools (validation)
     ↓                        ↓                         ↓                         ↓
"Button exists"        "User wants X"         "Execute step 3"         "Step succeeded"
  [factual]            [advisory]             [deterministic]          [verifiable]
```

**Key Insight**: Product knowledge is encoded as **procedures** (data), not prompts (generation).

## System Architecture

### 1. Vision Interpretation Layer

**Purpose**: Screenshot → Structured UI State

- Calls vision models (GPT-4V, Claude Vision, Gemini)
- Extracts: elements, page type, features, confidence scores
- **No reasoning** - pure perception

**Output Example**:
```json
{
  "page_type": "dashboard",
  "elements": [
    {
      "id": "button_new_project",
      "type": "button",
      "label": "New Project",
      "bounding_box": { "x": 100, "y": 50, ... },
      "state": { "visible": true, "enabled": true },
      "confidence": 0.95
    }
  ]
}
```

### 2. Orchestration Layer (n8n)

**Purpose**: Deterministic control flow

- Receives screenshot events
- Routes to agents and tools
- Makes all execution decisions
- Logs everything for replay

**Workflows**:
1. Main Orchestrator - Entry point
2. Intent Inference - Detect user goal
3. Procedure Execution - Step-by-step loop
4. Recovery - Handle failures

### 3. Agent System

**Four specialized agents** (all advisory-only):

| Agent | Input | Output | Role |
|-------|-------|--------|------|
| **Intent Inference** | UI state sequence | Intent hypothesis | "User likely wants to create a project" |
| **Procedure Reasoning** | Intent + procedures | Best procedure | "Use procedure: Create Project" |
| **Guidance** | Step + UI state | User instruction | "Click 'New Project' button" |
| **Recovery** | Failed step + error | Recovery actions | "Retry or refresh page" |

**Critical**: Agents **recommend**, n8n **decides**, tools **validate**.

### 4. Procedural Intelligence Model

Procedures encode product knowledge as **executable flows**:

```typescript
{
  "name": "Create GitHub Repository",
  "steps": [
    {
      "preconditions": [
        { "type": "element_present", "selector": { "label": "New" } }
      ],
      "guidance": {
        "instruction": "Click the 'New' button"
      },
      "target": {
        "type": "element",
        "selector": { "label": "New" },
        "interaction": "click"
      },
      "success_conditions": [
        { "type": "page_changed", "url_pattern": "github.com/new" }
      ],
      "recovery": {
        "max_retries": 2,
        "on_failure": ["retry", "navigate_back"]
      }
    }
  ]
}
```

**Why this works**:
- Steps are **data**, not LLM-generated
- Preconditions **prevent** invalid states
- Success conditions **verify** completion
- Recovery handles failures **safely**

### 5. Tool Framework

**Deterministic validation tools**:

**Observation Tools** (read-only):
- `find_element` - Locate UI elements
- `get_element_state` - Check element state
- `compare_ui_states` - Detect changes

**Validation Tools**:
- `validate_precondition` - Check if step can run
- `validate_success_condition` - Check if step completed
- `check_interactability` - Verify element is clickable

**Knowledge Tools**:
- `find_procedures_by_intent` - Search procedures
- `query_product_knowledge` - Lookup docs

### 6. State Management (Convex)

**Database tables**:
- `ui_states` - Vision interpretation results
- `procedures` - Procedure definitions
- `executions` - Active/completed runs
- `agent_logs` - Agent execution audit
- `tool_logs` - Tool execution audit

## Execution Flow

```
Screenshot Event
    ↓
Vision Interpretation → UI State
    ↓
Store in Convex
    ↓
Active Execution?
├─ Yes → Continue Procedure ──┐
└─ No → Intent Inference      │
         ↓                     │
    Find Procedures            │
         ↓                     │
    Select Best Procedure      │
         ↓                     │
    Create Execution           │
         ↓                     │
    ┌────┴─────────────────────┘
    │
    ▼
Procedure Execution Loop:
    ├─ Get Current Step
    ├─ Validate Preconditions
    ├─ Generate Guidance (Agent)
    ├─ Send to Extension
    ├─ Wait for User Action
    ├─ Validate Success Conditions
    ├─ Success? → Next Step
    └─ Failure? → Recovery Agent
```

## Anti-Hallucination Guarantees

| Layer | Guarantee | How |
|-------|-----------|-----|
| **Vision** | Confidence-scored output | Vision models return confidence for all detections |
| **Agents** | Advisory only | Agents recommend, never execute |
| **Procedures** | Predefined steps | Steps are data, not generated |
| **Validation** | Tool-based verification | Every step validated by deterministic tools |
| **Orchestration** | Auditable decisions | All decisions logged, replayable |

**Result**: Navigator **never guesses**. If uncertain → stop and ask.

## File Structure

```
backend/
├── schemas/                    # TypeScript interfaces
│   ├── ui-state.schema.ts     # Vision output
│   └── procedure.schema.ts    # Procedure model
├── services/
│   └── vision-service.ts      # Vision API integration
├── agents/
│   ├── agent-contracts.ts     # Agent interfaces
│   └── agent-service.ts       # Agent implementations
├── tools/
│   ├── tool-contracts.ts      # Tool interfaces
│   ├── observation-tools.ts   # Read-only tools
│   └── validation-tools.ts    # Condition checking tools
├── n8n-workflows/             # Orchestration workflows
│   ├── main-orchestrator.json
│   ├── intent-inference-workflow.json
│   └── procedure-execution-workflow.json
├── convex/                    # Database schema + functions
│   ├── schema.ts
│   ├── ui_states.ts
│   ├── procedures.ts
│   └── executions.ts
├── examples/
│   └── example-procedure.json # Sample procedure
├── ARCHITECTURE.md            # Detailed architecture
├── QUICKSTART.md             # Setup guide
└── README.md                 # This file
```

## Getting Started

### Quick Start (5 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Start Convex
cd convex && npx convex dev

# 3. Start services
npm run dev

# 4. Import n8n workflows
# (See QUICKSTART.md)

# 5. Test with sample screenshot
curl -X POST http://localhost:5678/webhook/navigator-screenshot-event \
  -d @test/sample-event.json
```

**Full guide**: See [QUICKSTART.md](./QUICKSTART.md)

## Key Design Decisions

### Why n8n for Orchestration?

✅ Visual workflows (non-engineers understand flow)
✅ Deterministic (no hidden LLM decisions)
✅ Auditable (every node logged)
✅ Recoverable (resume from any state)
✅ Extensible (easy to add tools/agents)

### Why Separate Vision from Reasoning?

✅ Vision models are great at **perception** (what's on screen?)
✅ LLMs are great at **reasoning** (what does user want?)
✅ Mixing them causes hallucinations
✅ Separation enables caching and optimization

### Why Procedures Instead of Prompts?

| Prompts (Bad) | Procedures (Good) |
|---------------|-------------------|
| "How do I create a repo?" | Predefined 3-step flow |
| LLM generates steps | Steps are validated data |
| Different every time | Deterministic |
| No validation | Preconditions + success checks |
| Can't audit | Full execution history |

### Why Advisory Agents?

✅ Agents provide **recommendations**, not actions
✅ Orchestration layer makes final decisions
✅ Easy to override agent with manual rules
✅ Can A/B test different agent models
✅ Agents don't have access to execute tools

## Extending the System

### Add a Tool

1. Define contract in `tools/tool-contracts.ts`
2. Implement in `tools/observation-tools.ts`
3. Use in n8n workflows

### Add a Procedure

1. Create JSON following schema
2. Test with `npm run validate-procedure`
3. Upload via Convex mutation

### Add an Agent

1. Define contract in `agents/agent-contracts.ts`
2. Implement in `agents/agent-service.ts`
3. Call from n8n workflow

## Performance

- **Vision latency**: ~2-5 seconds (model dependent)
- **Agent latency**: ~1-3 seconds (GPT-4)
- **Tool execution**: <100ms (deterministic)
- **Total guidance time**: ~3-8 seconds

**Optimizations**:
- Cache UI states (30s)
- Parallel tool execution
- Stream agent responses
- Use faster models for simple agents

## Cost Optimization

| Component | Model | Cost per 1K events |
|-----------|-------|-------------------|
| Vision | GPT-4V | ~$0.50 |
| Intent Agent | GPT-4 | ~$0.10 |
| Procedure Agent | GPT-4 | ~$0.10 |
| Guidance Agent | GPT-3.5 | ~$0.01 |
| Recovery Agent | GPT-4 | ~$0.05 |
| **Total** | | **~$0.76** |

**Savings**:
- Use GPT-3.5 for Guidance Agent (10x cheaper)
- Cache vision results for identical screenshots
- Batch agent calls where possible

## Testing Strategy

### Unit Tests
- Each tool independently
- Each agent with mock inputs
- Vision service with sample screenshots

### Integration Tests
- Full workflow end-to-end
- Mock LLM responses
- Verify state transitions

### Procedure Tests
- Test with real UI states
- Verify preconditions/success conditions
- Test recovery paths

## Deployment

### Development
```bash
npm run dev
```

### Production
```bash
# Deploy Convex
cd convex && npx convex deploy

# Deploy services (example: Railway)
railway up

# Configure n8n cloud
# Import workflows, set env vars
```

## Monitoring

- **Convex Dashboard**: View all executions, logs
- **n8n Dashboard**: View workflow executions
- **Sentry**: Error tracking
- **Datadog**: Performance monitoring

## Roadmap

- [ ] Multi-modal vision (screenshots + DOM)
- [ ] Procedure authoring UI
- [ ] A/B testing framework
- [ ] Real-time collaboration
- [ ] Analytics dashboard

## Architecture Deep Dive

For detailed architecture documentation, see:
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Full system design
- **[QUICKSTART.md](./QUICKSTART.md)** - Setup guide
- **Schema documentation** - See `schemas/` directory

## FAQ

**Q: Why not just use an LLM chatbot?**
A: LLMs hallucinate steps. Navigator validates every step with tools.

**Q: How do you prevent hallucinations?**
A: Procedures are predefined data, not generated. Preconditions prevent invalid states. Success conditions verify completion.

**Q: Can Navigator handle dynamic UIs?**
A: Yes. Vision interprets current state, procedures use fuzzy selectors, tools validate expectations.

**Q: What if a step fails?**
A: Recovery Agent analyzes failure, recommends retry/refresh/abort. Max retries prevent loops.

**Q: How do you handle new features?**
A: Author new procedures via JSON. No code changes needed.

**Q: Is this an RPA tool?**
A: No. Navigator **guides users**, doesn't automate. Users perform actions.

## Contributing

1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit PR

## License

MIT

## Support

- **Documentation**: See `/docs`
- **Issues**: GitHub Issues
- **Discord**: [Join our Discord]
- **Email**: support@navigator.ai

---

**Built with**: TypeScript, n8n, Convex, GPT-4V, GPT-4

**Powered by**: Deterministic orchestration + procedural intelligence
