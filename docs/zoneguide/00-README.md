# ZoneGuide: AI-Powered Interactive UI Navigation

> **A feature module for the Navigator Chrome extension.**
> Record once. Guide interactively. Teach with zones.

---

## What is Navigator?

**Navigator** is a Chrome extension that acts as an intelligent SaaS copilot:

1. **Auto-detects** which SaaS tool you're using (New Relic, Salesforce, HubSpot, etc.)
2. **Reads screen context** — understands what page and section you're on
3. **Answers questions** by routing them through local AI (Ollama):
   - **General queries** → Ollama streams the answer directly
   - **Domain-specific queries** → Internal knowledge base (scraped docs, knowledge graph, Convex DB)
4. **Fully local** — Ollama runs on localhost, no cloud LLM dependency

**Repo:** [github.com/hrshitkunwar-tech/mvp](https://github.com/hrshitkunwar-tech/mvp)

---

## What is ZoneGuide?

Navigator can **tell** you how to do something. ZoneGuide makes it **show** you — visually, on-screen, step by step.

```
WITHOUT ZONEGUIDE:
  "Go to Alerts → Click Alert Policies → Click Create..."
  → User hunts around the screen 🔍

WITH ZONEGUIDE:
  → Zone heatmap highlights the sidebar region 🟠
  → Pulsing ring on "Alerts & AI" link ⭕
  → Tooltip: "Click here" 💬
  → User clicks → next step ✅
```

### Three Modes (Priority Order)

| Mode | Experience | MVP? |
|------|-----------|------|
| **★★★ Teach Me** | Zone → element → tooltip. User clicks. Builds muscle memory. | YES |
| **★★ Show Me** | Record a workflow by clicking through it. Creates a reusable guide. | YES |
| **★ Do It For Me** | AI replays autonomously. | Post-MVP |

### The Zone System

Screen divided into 5 zones — progressive disclosure reduces cognitive load:

```
┌───────────────────────────────────┐
│ ARC-TL ╲         ╱ ARC-TR        │  Phase 1: "Look at this region" (1.5s)
│          ╲       ╱                │
│           ★ CENTER ★              │  Phase 2: "Click this element"
│          ╱       ╲                │
│ ARC-BL ╱         ╲ ARC-BR        │  Phase 3: "Nice! Next step..."
└───────────────────────────────────┘
```

---

## How ZoneGuide Fits Into Navigator

ZoneGuide is a **self-contained module** that hooks into Navigator's existing infrastructure:

| Navigator Has | ZoneGuide Uses It For |
|--------------|----------------------|
| DOM access (`content.js`) | Zone detection, element finding, overlay injection |
| Tool auto-detection | Show only relevant guides per SaaS product |
| Ollama connection | AI fallback for broken selectors, instruction generation |
| Knowledge graph | Future: auto-generate guides from step sequences |
| Convex DB | Primary storage for recorded workflows |

**ZoneGuide adds no new backends, no new services, no n8n.** It's ~1,650 lines of vanilla JS + CSS inside `extension/zoneguide/`.

---

## Documentation Index

| # | Document | Purpose |
|---|----------|---------|
| 01 | [PRD](./01-PRD.md) | Product requirements, personas, feature spec, timeline |
| 02 | [Tech Stack](./02-TECH-STACK.md) | Architecture, module breakdown, what's reused vs. new |
| 03 | [Required Skills](./03-REQUIRED-SKILLS.md) | Skill matrix, learning path, LOC estimates |
| 04 | [Implementation Guide](./04-IMPLEMENTATION-GUIDE.md) | Phase-by-phase build plan with code examples |
| 05 | [Data Schemas](./05-DATA-SCHEMAS.md) | Convex schema, workflow JSON, message protocol |
| 06 | [Testing & QA](./06-TESTING-QA.md) | Unit/integration/edge/performance test checklist |
| 07 | [Architecture Decisions](./07-ARCHITECTURE-DECISIONS.md) | 9 ADRs with tradeoff analysis |
| 08 | [Deployment & Rollout](./08-DEPLOYMENT-ROLLOUT.md) | Phased rollout, monitoring, release checklist |

---

## Quick Start: 6-Week Build Path

```
Week 1: FOUNDATION
  ├── Build: zoneguide/zones.js + styles.css
  └── Test: Zone heatmaps render on any website

Week 2: RECORDING
  ├── Build: recorder.js + storage.js (Convex + IndexedDB)
  └── Test: Record 5-click workflow, verify in Convex

Week 3: PLAYBACK (THE CORE)
  ├── Build: overlay.js + player.js
  └── Test: Full record → playback cycle on New Relic

Week 4: AI BRIDGE
  ├── Build: ai-bridge.js (connects to Navigator's Ollama)
  └── Test: Break a selector → AI finds the element

Week 5: INTEGRATION
  ├── Wire: background.js, popup.html, manifest.json
  └── Test: Full flow through extension popup

Week 6: POLISH + SHIP
  ├── Test on 3 SaaS products
  └── Ship to 5 beta testers
```

---

## File Structure

```
mvp/
├── extension/
│   ├── manifest.json           # Updated: keyboard shortcuts
│   ├── background.js           # Updated: ZoneGuide message routing
│   ├── content.js              # Updated: loads ZoneGuide module
│   ├── popup.html/js           # Updated: ZoneGuide controls
│   │
│   └── zoneguide/              # ★ NEW MODULE
│       ├── index.js            # Entry point + API + message handlers
│       ├── zones.js            # Zone detection + heatmap rendering
│       ├── overlay.js          # Highlights, tooltips, animations
│       ├── recorder.js         # Workflow recording engine
│       ├── player.js           # Guided playback (Teach Me mode)
│       ├── ai-bridge.js        # Bridge to Navigator's Ollama
│       ├── storage.js          # Convex (primary) + IndexedDB (cache)
│       └── styles.css          # All visual styles (zg-* namespace)
│
├── backend/
│   └── convex/
│       ├── schema.ts           # Updated: add workflows table
│       └── workflows.ts        # NEW: CRUD for ZoneGuide workflows
│
└── docs/                       # ★ These documentation files
```

---

## Future Vision

The ultimate goal is **zero manual recording:**

```
User: "How do I create an alert policy?"
Navigator: Queries knowledge graph → gets step sequence
ZoneGuide: Auto-generates visual guide from steps
→ No recording needed. Guide adapts as UI changes.
```

This is possible because Navigator already has the knowledge graph with step sequences. ZoneGuide just needs to map step descriptions to on-screen elements — which `ai-bridge.js` already does.

---

**Author:** Harshit Kunwar
CSM @ New Relic | Builder | AI × SaaS Adoption × Behavioral Psychology
[GitHub](https://github.com/hrshitkunwar-tech)
