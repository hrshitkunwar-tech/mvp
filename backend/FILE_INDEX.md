# Navigator Backend - File Index

Complete reference of all implemented files.

## 📚 Documentation (5 files)

| File | Purpose | Start Here? |
|------|---------|-------------|
| **README.md** | System overview, key innovations, FAQ | ✅ **START HERE** |
| **QUICKSTART.md** | Setup guide, test commands, troubleshooting | ✅ Second read |
| **ARCHITECTURE.md** | Deep dive into system design and patterns | Third read |
| **IMPLEMENTATION_SUMMARY.md** | What was built, deliverables, success metrics | Reference |
| **SYSTEM_DIAGRAM.md** | Visual diagrams of data flow and architecture | Reference |

## 🏗️ Core Schemas (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| **schemas/ui-state.schema.ts** | ~150 | Vision output structure (UIState, UIElement, PageClassification) |
| **schemas/procedure.schema.ts** | ~300 | Procedure model (Procedure, ProcedureStep, Preconditions, SuccessConditions) |

**Key exports**:
- `UIState` - Structured UI interpretation
- `Procedure` - Complete workflow definition
- `ProcedureStep` - Single validated step
- `ElementSelector` - Flexible element matching

## 🤖 Agent System (2 files)

| File | Lines | Purpose |
|------|-------|---------|
| **agents/agent-contracts.ts** | ~350 | Agent input/output interfaces for all 4 agents |
| **agents/agent-service.ts** | ~250 | Agent implementations (Intent, Procedure Reasoning, Guidance, Recovery) |

**Agents**:
1. **IntentInferenceAgent** - Detect user intent from UI sequence
2. **ProcedureReasoningAgent** - Select best procedure
3. **GuidanceAgent** - Generate user instructions
4. **RecoveryAgent** - Diagnose failures and recommend fixes

## 🛠️ Tool Framework (3 files)

| File | Lines | Purpose |
|------|-------|---------|
| **tools/tool-contracts.ts** | ~350 | Tool interfaces and types |
| **tools/observation-tools.ts** | ~350 | Read-only tools (FindElement, GetState, Compare) |
| **tools/validation-tools.ts** | ~350 | Validation tools (ValidatePrecondition, ValidateSuccess) |

**Tools**:
- `FindElementTool` - Locate UI elements with fuzzy matching
- `GetElementStateTool` - Check element state
- `DetectPageTypeTool` - Identify page type
- `CompareUIStatesTool` - Detect UI changes
- `ValidatePreconditionTool` - Check step prerequisites
- `ValidateSuccessConditionTool` - Verify step completion

## 👁️ Vision Service (1 file)

| File | Lines | Purpose |
|------|-------|---------|
| **services/vision-service.ts** | ~350 | Vision API wrapper (GPT-4V, Claude, Gemini support) |

**Features**:
- Multi-provider support (OpenAI, Anthropic, Google)
- Structured prompt engineering
- JSON schema enforcement
- Stable element ID generation

## 🔄 n8n Workflows (4 files)

| File | Purpose |
|------|---------|
| **n8n-workflows/README.md** | Workflow documentation |
| **n8n-workflows/main-orchestrator.json** | Entry point for screenshot events |
| **n8n-workflows/intent-inference-workflow.json** | Intent detection → procedure selection |
| **n8n-workflows/procedure-execution-workflow.json** | Step-by-step execution loop |

**Import order**: Main → Intent → Execution

## 🗄️ Convex Database (4 files)

| File | Lines | Purpose |
|------|-------|---------|
| **convex/schema.ts** | ~200 | Database schema (7 tables) |
| **convex/ui_states.ts** | ~80 | UI state queries and mutations |
| **convex/procedures.ts** | ~120 | Procedure CRUD operations |
| **convex/executions.ts** | ~200 | Execution management |

**Tables**:
- `ui_states` - Vision interpretation results
- `procedures` - Procedure definitions
- `executions` - Active/completed runs
- `agent_logs` - Agent execution audit
- `tool_logs` - Tool execution audit
- `sessions` - User sessions
- `intent_history` - Intent inference log

## 📦 Examples & Config (2 files)

| File | Purpose |
|------|---------|
| **examples/example-procedure.json** | Complete "Create GitHub Repo" procedure |
| **package.json** | Project configuration and scripts |

## File Statistics

```
Total files: 23

By category:
- Documentation:  5 files (~5,000 lines)
- Schemas:        2 files (~450 lines)
- Agents:         2 files (~600 lines)
- Tools:          3 files (~1,050 lines)
- Services:       1 file (~350 lines)
- Workflows:      4 files (~500 lines JSON)
- Database:       4 files (~600 lines)
- Examples:       2 files (~200 lines)

By language:
- TypeScript: 14 files (~3,500 lines)
- JSON:       4 files (~700 lines)
- Markdown:   5 files (~5,000 lines)

Total lines: ~9,200 lines
```

## Dependency Graph

```
Schemas (foundation)
  ↓
Tools (use schemas)
  ↓
Agents (use schemas + tools)
  ↓
Services (use schemas)
  ↓
n8n Workflows (orchestrate all)
  ↓
Convex (stores all state)
```

## Reading Order for Understanding

### Quick Understanding (30 minutes)
1. `README.md` - System overview
2. `SYSTEM_DIAGRAM.md` - Visual architecture
3. `examples/example-procedure.json` - See a real procedure

### Deep Understanding (2 hours)
1. `README.md` - Overview
2. `schemas/ui-state.schema.ts` - Vision output
3. `schemas/procedure.schema.ts` - Procedure model
4. `ARCHITECTURE.md` - Full design
5. `n8n-workflows/` - Execution flow

### Implementation Guide (4 hours)
1. `QUICKSTART.md` - Setup
2. `services/vision-service.ts` - Vision integration
3. `agents/agent-service.ts` - Agent implementation
4. `tools/observation-tools.ts` - Tool examples
5. `convex/schema.ts` - Database design
6. Test end-to-end

## Code Organization

### Schemas (Data Models)
```
schemas/
├── ui-state.schema.ts     # Vision output types
└── procedure.schema.ts    # Procedure types
```

### Business Logic
```
agents/
├── agent-contracts.ts     # Agent interfaces
└── agent-service.ts       # Agent implementations

tools/
├── tool-contracts.ts      # Tool interfaces
├── observation-tools.ts   # Read-only tools
└── validation-tools.ts    # Validation tools

services/
└── vision-service.ts      # Vision API wrapper
```

### Orchestration
```
n8n-workflows/
├── README.md
├── main-orchestrator.json
├── intent-inference-workflow.json
└── procedure-execution-workflow.json
```

### State Management
```
convex/
├── schema.ts              # Database schema
├── ui_states.ts          # UI state functions
├── procedures.ts         # Procedure functions
└── executions.ts         # Execution functions
```

## Key Files by Use Case

### "I want to understand the system"
→ `README.md`, `SYSTEM_DIAGRAM.md`

### "I want to set it up"
→ `QUICKSTART.md`, `package.json`

### "I want to add a procedure"
→ `examples/example-procedure.json`, `schemas/procedure.schema.ts`

### "I want to add a tool"
→ `tools/tool-contracts.ts`, `tools/observation-tools.ts`

### "I want to modify agents"
→ `agents/agent-contracts.ts`, `agents/agent-service.ts`

### "I want to change workflows"
→ `n8n-workflows/*.json`

### "I want to query data"
→ `convex/*.ts`

## Import Examples

### Using Schemas
```typescript
import { UIState, UIElement } from './schemas/ui-state.schema';
import { Procedure, ProcedureStep } from './schemas/procedure.schema';
```

### Using Tools
```typescript
import { FindElementTool } from './tools/observation-tools';
import { ValidatePreconditionTool } from './tools/validation-tools';

const findTool = new FindElementTool();
const result = await findTool.execute({
  ui_state: currentState,
  selector: { by_label: "New" }
});
```

### Using Agents
```typescript
import { IntentInferenceAgent } from './agents/agent-service';

const agent = new IntentInferenceAgent();
const response = await agent.execute({
  current_state: uiState,
  previous_states: recentStates,
  session_context: context
});
```

### Using Vision Service
```typescript
import { createVisionService } from './services/vision-service';

const visionService = createVisionService('openai');
const result = await visionService.interpret({
  screenshot_url: "...",
  viewport: {...}
});
```

## Testing Files (to be created)

Recommended test files to add:

```
tests/
├── unit/
│   ├── tools.test.ts          # Test each tool
│   ├── agents.test.ts         # Test agents with mocks
│   └── vision.test.ts         # Test vision service
├── integration/
│   ├── workflow.test.ts       # Test n8n workflows
│   └── end-to-end.test.ts     # Full flow test
└── fixtures/
    ├── ui-states/             # Sample UI states
    ├── procedures/            # Test procedures
    └── screenshots/           # Test images
```

## Next Steps After Reading

1. **Setup**: Follow `QUICKSTART.md`
2. **Test**: Run example procedure
3. **Customize**: Add your own procedure
4. **Extend**: Add tools/agents as needed
5. **Deploy**: Follow deployment guide in `ARCHITECTURE.md`

## Support Resources

- **Quick Help**: See `QUICKSTART.md` troubleshooting
- **Deep Dive**: See `ARCHITECTURE.md`
- **Examples**: See `examples/example-procedure.json`
- **API Reference**: See TypeScript files (fully typed)
