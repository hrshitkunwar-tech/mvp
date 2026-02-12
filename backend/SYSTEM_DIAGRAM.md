# Navigator System Diagram

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser Extension                           │
│                    (Screenshot Capture Layer)                       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Screenshot Event
                             │ { session_id, screenshot_url, viewport }
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     n8n Orchestration Layer                         │
│                   (Deterministic Control Flow)                      │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Main Orchestrator Workflow                      │ │
│  │                                                              │ │
│  │  Screenshot Event → Vision Service → Store UI State         │ │
│  │                           ↓                                  │ │
│  │                  Active Execution?                           │ │
│  │                    ↙           ↘                             │ │
│  │          YES: Continue    NO: Intent Inference               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │         Intent Inference & Procedure Selection Workflow      │ │
│  │                                                              │ │
│  │  Get Recent UI States → Intent Agent → Find Procedures      │ │
│  │           ↓                                                  │ │
│  │  Procedure Reasoning Agent → Select Best Procedure          │ │
│  │           ↓                                                  │ │
│  │  Create Execution → Start Procedure Execution               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │            Procedure Execution Loop Workflow                 │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────┐         │ │
│  │  │ For each step:                                 │         │ │
│  │  │                                                │         │ │
│  │  │  1. Validate Preconditions (Tools)             │         │ │
│  │  │       ↓                                        │         │ │
│  │  │  2. Generate Guidance (Guidance Agent)         │         │ │
│  │  │       ↓                                        │         │ │
│  │  │  3. Send to Extension                          │         │ │
│  │  │       ↓                                        │         │ │
│  │  │  4. Wait for User Action                       │         │ │
│  │  │       ↓                                        │         │ │
│  │  │  5. Validate Success (Tools)                   │         │ │
│  │  │       ↓                                        │         │ │
│  │  │  6. Success? → Next Step                       │         │ │
│  │  │     Failure? → Recovery Agent                  │         │ │
│  │  │                                                │         │ │
│  │  └────────────────────────────────────────────────┘         │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────┬──────────────┬──────────────┬──────────────┬─────────────────┘
     │              │              │              │
     │              │              │              │
     ▼              ▼              ▼              ▼
┌─────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐
│ Vision  │  │   Agent     │  │  Tool    │  │ Convex   │
│ Service │  │  Service    │  │ Service  │  │ Database │
│         │  │             │  │          │  │          │
│ GPT-4V  │  │  4 Agents   │  │ 6+ Tools │  │ 7 Tables │
└─────────┘  └─────────────┘  └──────────┘  └──────────┘
```

## Data Flow: Screenshot to Guidance

```
Step 1: Screenshot Capture
┌──────────────┐
│   Browser    │  User navigates to page
│  Extension   │  Extension captures screenshot
└──────┬───────┘
       │
       │ POST /webhook/screenshot-event
       │ { session_id, screenshot_url, viewport }
       │
       ▼
┌──────────────────────────────────────────────────────┐
│                 Vision Service                       │
│                                                      │
│  Input: Screenshot URL + Viewport metadata          │
│  Process: GPT-4V analyzes image                     │
│  Output: Structured UI State                        │
│                                                      │
│  {                                                   │
│    page_type: "dashboard",                          │
│    elements: [                                       │
│      {                                               │
│        id: "button_new_project",                    │
│        type: "button",                              │
│        label: "New Project",                        │
│        bounding_box: { x: 100, y: 50, ... },       │
│        state: { visible: true, enabled: true },    │
│        confidence: 0.95                             │
│      },                                              │
│      ...                                             │
│    ],                                                │
│    features: [...],                                  │
│    interpretation_confidence: 0.92                   │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       │ Store in Convex
       │
       ▼
┌──────────────────────────────────────────────────────┐
│              Convex: ui_states table                 │
│                                                      │
│  All UI states stored with:                         │
│  - session_id (for querying recent states)          │
│  - timestamp (for ordering)                         │
│  - interpretation (structured data)                 │
└──────┬───────────────────────────────────────────────┘
       │
       │ Check for active execution
       │
       ▼
┌──────────────────────────────────────────────────────┐
│          Intent Inference Agent                      │
│                                                      │
│  Input:                                              │
│  - Current UI state                                  │
│  - Previous 5-10 UI states                          │
│  - Session context                                   │
│                                                      │
│  Process: LLM analyzes sequence                     │
│  - Page transitions                                  │
│  - Element interactions                              │
│  - Time patterns                                     │
│                                                      │
│  Output:                                             │
│  {                                                   │
│    inferred_intent: {                               │
│      intent_description: "User wants to create      │
│                           a new project",           │
│      intent_category: "data_entry",                 │
│      confidence: 0.85,                              │
│      evidence: [...]                                │
│    },                                                │
│    alternative_intents: [...],                      │
│    reasoning: "User navigated to dashboard,         │
│                clicked 'Projects', focused on       │
│                'New' button"                        │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       │ Find matching procedures
       │
       ▼
┌──────────────────────────────────────────────────────┐
│         Convex: Query procedures table               │
│                                                      │
│  Match intent against procedure patterns:            │
│  - "create project" → Create Project procedure       │
│  - "new workspace" → Create Workspace procedure      │
│                                                      │
│  Returns: List of matching procedures               │
└──────┬───────────────────────────────────────────────┘
       │
       │ Select best procedure
       │
       ▼
┌──────────────────────────────────────────────────────┐
│        Procedure Reasoning Agent                     │
│                                                      │
│  Input:                                              │
│  - Inferred intent                                   │
│  - Current UI state                                  │
│  - Available procedures (from query)                │
│                                                      │
│  Process: LLM selects best match                    │
│  - Check relevance to intent                        │
│  - Verify current page matches                      │
│  - Assess preconditions                             │
│                                                      │
│  Output:                                             │
│  {                                                   │
│    recommended_procedure: {                         │
│      procedure: <full procedure object>,            │
│      relevance_score: 0.92,                         │
│      match_reasons: [                               │
│        "Intent matches pattern 'create project'",   │
│        "Current page is dashboard",                 │
│        "New button is visible"                      │
│      ],                                              │
│      potential_issues: []                           │
│    },                                                │
│    should_abort: false                              │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       │ Create execution
       │
       ▼
┌──────────────────────────────────────────────────────┐
│        Convex: executions table                      │
│                                                      │
│  Create new execution record:                        │
│  {                                                   │
│    procedure_id: "proc_001",                        │
│    session_id: "session_123",                       │
│    status: "active",                                │
│    current_step_id: "step_001",                     │
│    current_step_number: 1,                          │
│    execution_history: [],                           │
│    context: { intent: {...} }                       │
│  }                                                   │
└──────┬───────────────────────────────────────────────┘
       │
       │ Start execution loop
       │
       ▼
┌──────────────────────────────────────────────────────┐
│         Step Execution (for each step)               │
│                                                      │
│  Step 1: Validate Preconditions                     │
│  ┌────────────────────────────────────────────┐     │
│  │  Tool: validate_precondition                │     │
│  │                                              │     │
│  │  For each precondition:                     │     │
│  │  - element_present?                         │     │
│  │  - element_state correct?                   │     │
│  │  - page_type matches?                       │     │
│  │                                              │     │
│  │  Tool: find_element                         │     │
│  │  - Search UI state for matching element     │     │
│  │  - Use fuzzy matching on label/type         │     │
│  │  - Return confidence score                  │     │
│  │                                              │     │
│  │  Result: All preconditions satisfied?       │     │
│  │  - YES → Proceed to guidance                │     │
│  │  - NO → Trigger recovery                    │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Step 2: Generate Guidance                          │
│  ┌────────────────────────────────────────────┐     │
│  │  Guidance Agent                             │     │
│  │                                              │     │
│  │  Input:                                     │     │
│  │  - Current step definition                  │     │
│  │  - Current UI state                         │     │
│  │  - Execution context (step 1 of 3)         │     │
│  │                                              │     │
│  │  Process: LLM generates instruction         │     │
│  │                                              │     │
│  │  Output:                                     │     │
│  │  {                                           │     │
│  │    primary_instruction:                     │     │
│  │      "Click the 'New Project' button",     │     │
│  │    contextual_hints: [                      │     │
│  │      "Button is in top right corner"       │     │
│  │    ],                                        │     │
│  │    visual_guidance: {                       │     │
│  │      highlight_element: {                   │     │
│  │        matched_element_id: "button_new",   │     │
│  │        confidence: 0.95                     │     │
│  │      }                                       │     │
│  │    },                                        │     │
│  │    estimated_duration_seconds: 5            │     │
│  │  }                                           │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Step 3: Send to Extension                          │
│  ┌────────────────────────────────────────────┐     │
│  │  WebSocket → Browser Extension              │     │
│  │                                              │     │
│  │  Extension receives guidance and displays:  │     │
│  │  - Instruction overlay                      │     │
│  │  - Visual highlight on button               │     │
│  │  - Progress indicator (Step 1 of 3)        │     │
│  └────────────────────────────────────────────┘     │
│                                                      │
│  Step 4: Wait for User Action                       │
│  (User clicks button)                                │
│  Extension captures new screenshot                   │
│                                                      │
│  Step 5: Validate Success                           │
│  ┌────────────────────────────────────────────┐     │
│  │  Tool: validate_success_condition           │     │
│  │                                              │     │
│  │  Get new UI state (from vision service)     │     │
│  │                                              │     │
│  │  For each success condition:                │     │
│  │  - page_changed?                            │     │
│  │  - element_present?                         │     │
│  │  - element_state correct?                   │     │
│  │                                              │     │
│  │  Tool: compare_ui_states                    │     │
│  │  - Compare before/after UI states           │     │
│  │  - Detect changes                           │     │
│  │  - Verify expected navigation              │     │
│  │                                              │     │
│  │  Result: Success conditions met?            │     │
│  │  - YES → Mark step complete, next step     │     │
│  │  - NO → Trigger recovery                    │     │
│  └────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘

If step fails → Recovery Agent analyzes → Recommends retry/abort
If step succeeds → Move to next step → Repeat loop
If all steps complete → Mark procedure complete → Done!
```

## Component Interaction Matrix

```
┌─────────────────┬────────┬────────┬────────┬─────────┬────────┐
│                 │ Vision │ Agents │  n8n   │  Tools  │ Convex │
├─────────────────┼────────┼────────┼────────┼─────────┼────────┤
│ Vision Service  │   -    │   No   │  Yes   │   No    │  Yes   │
│ Reads from:     │        │        │ (call) │         │ (stor) │
├─────────────────┼────────┼────────┼────────┼─────────┼────────┤
│ Agent Service   │   No   │   -    │  Yes   │   No    │  Yes   │
│ Reads from:     │        │        │ (call) │         │ (read) │
├─────────────────┼────────┼────────┼────────┼─────────┼────────┤
│ n8n Orchestr.   │  Yes   │  Yes   │   -    │   Yes   │  Yes   │
│ Calls:          │ (call) │ (call) │        │ (call)  │ (r/w)  │
├─────────────────┼────────┼────────┼────────┼─────────┼────────┤
│ Tool Service    │   No   │   No   │  Yes   │    -    │  Yes   │
│ Reads from:     │        │        │ (call) │         │ (read) │
├─────────────────┼────────┼────────┼────────┼─────────┼────────┤
│ Convex DB       │  Yes   │  Yes   │  Yes   │   Yes   │   -    │
│ Stores:         │ (writ) │ (log)  │ (r/w)  │  (log)  │        │
└─────────────────┴────────┴────────┴────────┴─────────┴────────┘

Legend:
- "Yes" = Direct interaction
- "No" = No direct interaction
- (call) = Makes API calls to
- (read) = Reads data from
- (writ) = Writes data to
- (r/w) = Reads and writes
- (stor) = Stores results in
- (log) = Logs execution to
```

## Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────┐
│                      PERCEPTION LAYER                           │
│                                                                 │
│  Vision Service: "What's on the screen?"                       │
│  - Screenshots → Structured UI state                           │
│  - NO reasoning, NO decisions                                  │
│  - Output: Facts with confidence scores                        │
│                                                                 │
│  Rule: Vision NEVER controls flow                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       REASONING LAYER                           │
│                                                                 │
│  Agents: "What does this mean?"                                │
│  - Intent Inference: "User wants to..."                       │
│  - Procedure Reasoning: "Best procedure is..."                │
│  - Guidance: "Tell user to..."                                │
│  - Recovery: "Failed because... recommend..."                 │
│                                                                 │
│  Rule: Agents RECOMMEND, never EXECUTE                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DECISION LAYER                             │
│                                                                 │
│  n8n Orchestration: "What happens next?"                       │
│  - Routes between agents and tools                             │
│  - Makes ALL control flow decisions                            │
│  - Enforces business logic                                     │
│  - Logs everything for audit                                   │
│                                                                 │
│  Rule: ONLY n8n controls execution flow                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     VALIDATION LAYER                            │
│                                                                 │
│  Tools: "Did it work?"                                         │
│  - Validate preconditions                                      │
│  - Validate success conditions                                 │
│  - Deterministic, replayable checks                            │
│                                                                 │
│  Rule: Tools are PURE FUNCTIONS (no side effects)              │
└─────────────────────────────────────────────────────────────────┘
```

## Anti-Hallucination Architecture

```
Traditional LLM Chatbot:
┌──────────────┐
│   User asks  │
│  "How do I   │
│ create repo?"│
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│      LLM generates       │
│    step-by-step guide    │
│                          │
│ Problem: May hallucinate │
│ steps that don't exist   │
└──────────────────────────┘

Navigator Approach:
┌──────────────┐
│ Vision sees  │
│  UI state    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────┐
│  Intent Agent infers:    │
│ "User wants to create    │
│  repository" (advisory)  │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Procedure Agent selects: │
│  Pre-authored procedure  │
│  (validated steps)       │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Tools validate each step:│
│ - Preconditions met?     │
│ - Element exists?        │
│ - Success verified?      │
│                          │
│ Result: NEVER guesses    │
└──────────────────────────┘
```

This architecture ensures:
✅ No hallucinated steps (procedures are data)
✅ Every step validated (tools check conditions)
✅ Agents only advise (n8n decides)
✅ Full audit trail (replay any execution)
