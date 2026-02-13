# PRD: ZoneGuide — AI-Powered Interactive UI Navigation

**Version:** 2.0 (Corrected)  
**Author:** Harshit Kunwar  
**Date:** 2026-02-13  
**Status:** Draft → Ready for Development  

---

## 1. Executive Summary

ZoneGuide is a new feature module for the **Navigator** Chrome extension — an intelligent SaaS copilot that auto-detects what tool a user is on, understands their screen context, and answers queries by routing them through a local AI (Ollama) backed by a domain-specific knowledge base (scraped SaaS documentation, knowledge graph, and Convex database).

ZoneGuide adds **interactive step-by-step UI guidance** using a novel **zone-based heatmap system**. Instead of telling users what to click, ZoneGuide **shows them** — first highlighting the screen region (zone), then the specific element — creating a "teach me" experience that builds muscle memory.

**One-line pitch:** Your SaaS copilot already answers questions — now it walks you through the answer visually.

---

## 2. Parent Product: Navigator Extension (Current State)

### What Navigator Does Today

Navigator is a Chrome extension that acts as an **always-on SaaS copilot:**

```
┌─────────────────────────────────────────────────────────────┐
│                  NAVIGATOR EXTENSION (MV3)                    │
│                                                              │
│  User visits any SaaS product (New Relic, Salesforce, etc.)  │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │  AUTO-DETECT   │                          │
│                  │  • Screen/DOM  │                          │
│                  │  • Tool ID     │                          │
│                  │  • UI Context  │                          │
│                  └───────┬────────┘                          │
│                          │                                   │
│              User asks a question                            │
│                          │                                   │
│                  ┌───────▼────────┐                          │
│                  │ QUERY ROUTER   │                          │
│                  │ (Ollama local) │                          │
│                  └───┬────────┬───┘                          │
│                      │        │                              │
│          ┌───────────▼┐  ┌───▼───────────┐                  │
│          │  GENERAL    │  │ DOMAIN-SPECIFIC│                 │
│          │  QUERY      │  │ QUERY          │                 │
│          │             │  │                │                 │
│          │  Ollama     │  │  Internal KB   │                 │
│          │  streams    │  │  • Scraped     │                 │
│          │  answer     │  │    SaaS docs   │                 │
│          │  directly   │  │  • Knowledge   │                 │
│          │             │  │    Graph       │                 │
│          │             │  │  • Convex DB   │                 │
│          └─────────────┘  └───────────────┘                  │
│                                                              │
│  NO n8n. NO external APIs. Everything local + Convex.        │
└─────────────────────────────────────────────────────────────┘
```

### Navigator's Existing Capabilities
- **Auto-detection:** Content script reads DOM, identifies which SaaS tool the user is on (New Relic, Salesforce, HubSpot, etc.)
- **Screen awareness:** Understands current UI context (what page, what section, what's visible)
- **Query classification:** Ollama determines if a question is general ("what is NRQL?") or domain-specific ("how do I set up alert policies for my APM service?")
- **General answers:** Ollama streams the answer directly — fast, local, no external calls
- **Domain-specific answers:** Routes to internal knowledge base containing scraped SaaS documentation, a knowledge graph of product relationships, and structured data in Convex
- **Fully local intelligence:** Ollama runs on localhost:11434, no cloud LLM dependency

### Navigator's Current Architecture (github.com/hrshitkunwar-tech/mvp)
```
mvp/
├── extension/              # Chrome extension (MV3)
│   ├── manifest.json       # Permissions, content scripts
│   ├── background.js       # Service worker, message routing
│   ├── content.js          # DOM access, screen detection, tool ID
│   ├── popup.html/js       # Extension UI
│   └── styles.css
├── backend/                # Data layer (NO n8n)
│   ├── services/           # Knowledge query services
│   └── convex/             # Convex database (scraped data, KG)
└── navigator-mvp-package/  # Shared utilities
```

---

## 3. The ZoneGuide Feature: What We're Adding

### The Gap in Navigator Today

Navigator can **tell** users how to do something ("Click Alert Policies in the left sidebar, then click Create Policy..."). But it can't **show** them visually on-screen. Users still have to mentally map text instructions to the actual UI.

### What ZoneGuide Adds

ZoneGuide bridges the gap between **answering** and **showing:**

```
TODAY (Navigator without ZoneGuide):
  User: "How do I create an alert policy?"
  Navigator: "Go to Alerts → Click Alert Policies → Click Create..."
  User: *hunting around the screen trying to find these elements*

WITH ZONEGUIDE:
  User: "How do I create an alert policy?"
  Navigator: "Let me walk you through it."
  → Zone heatmap highlights top-left sidebar region
  → Pulsing ring appears on "Alerts & AI" link
  → Tooltip: "Click here to open Alerts"
  → User clicks → Next step...
```

### How ZoneGuide Leverages Navigator's Existing Stack

| Navigator Capability | ZoneGuide Uses It For |
|---------------------|----------------------|
| **DOM access (content.js)** | Zone detection, element finding, overlay injection |
| **Tool auto-detection** | Knowing which SaaS product guides apply to |
| **Ollama (localhost)** | AI fallback when selectors break, auto-generating step instructions |
| **Knowledge graph** | Looking up the correct workflow steps for a domain-specific task |
| **Convex DB** | Storing/retrieving recorded workflow guides |
| **Screen awareness** | Knowing what page the user is on to match the right guide |

---

[Document continues with sections 4-12 from the original PRD...]
