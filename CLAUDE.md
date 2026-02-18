# CLAUDE.md — Navigator Procedural Intelligence Platform

## Overview
Procedural intelligence backend: deterministic workflow execution with AI agents that recommend but never decide. n8n orchestrates, tools validate, Convex stores everything.

## Core Principle
**Vision != Agents != Orchestration != Tools** — agents recommend, n8n decides, tools validate. Prevents hallucinations through predefined procedures (JSON), preconditions, and tool-based validation.

## Stack
- **Language**: TypeScript / Node.js
- **Orchestration**: n8n (workflow automation)
- **Database**: Convex (serverless, 7 tables)
- **Services**: Express (vision interpretation via OpenAI/Claude/Gemini)
- **Agents**: 4 specialized (Intent, Procedure Reasoning, Guidance, Recovery)

## Monorepo Structure (npm workspaces)
```
backend/
  services/     — Express API for vision interpretation
  agents/       — 4 AI agents (intent, reasoning, guidance, recovery)
  convex/       — Database schema + functions (7 tables)
  n8n-orchestrator/ — Workflow definitions
  tools/        — Deterministic validation tools
```

## Quick Reference
```bash
cd backend
npm install
npm run dev              # runs ALL services in parallel
cd convex && npx convex dev   # start Convex dev server
npm run validate-procedure    # validate procedure JSON
npm test                      # Jest tests
```

## Key Docs
- `backend/START_HERE.md` — 5-minute executive overview
- `backend/ARCHITECTURE.md` — deep technical dive (489 lines)
- `backend/QUICKSTART.md` — setup guide
- `backend/examples/example-procedure.json` — example procedure definition
