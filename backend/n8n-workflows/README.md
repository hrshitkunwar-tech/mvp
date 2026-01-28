# n8n Orchestration Workflows

This directory contains n8n workflow definitions that implement the deterministic orchestration layer.

## Core Workflows

1. **main-orchestrator.json** - Entry point, handles screenshot events
2. **intent-inference-workflow.json** - Intent detection and procedure selection
3. **procedure-execution-workflow.json** - Step-by-step procedure runner
4. **step-validation-workflow.json** - Precondition and success condition checking
5. **recovery-workflow.json** - Error handling and recovery

## Workflow Architecture

```
Screenshot Event → Main Orchestrator
                        ↓
                  Vision Interpretation
                        ↓
                  Intent Inference (Agent 1)
                        ↓
                  Procedure Selection (Agent 2)
                        ↓
                  Procedure Execution Loop
                        ↓
    ┌───────────────────┴───────────────────┐
    │                                       │
Validate Preconditions              Execute Step
    │                                       │
    └─────────→ Show Guidance (Agent 3) ←───┘
                        ↓
                Validate Success Conditions
                        ↓
         [Success] → Next Step
         [Failure] → Recovery (Agent 4)
```

## Design Principles

- **Deterministic**: Same input → same output
- **Auditable**: Every decision logged
- **Recoverable**: State can be resumed
- **No Agent Autonomy**: Agents advise, n8n decides
