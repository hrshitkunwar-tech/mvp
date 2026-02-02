# Copilot Instructions for Navigator Ultimate Blueprint

## System Overview
- **Navigator** is a deterministic procedural intelligence platform that converts screenshots into step-by-step, verifiable product guidance.
- **Architecture:**
  - **Vision Layer:** Converts screenshots to structured UI state (no reasoning, only perception). See `backend/03_Vision_Interpretation_Layer.md`.
  - **Agents:** Perform reasoning on UI state to infer user intent. See `backend/04_Vision_Agent_Contract.md`.
  - **Orchestration:** Decides next steps based on agent output. See `backend/05_Orchestration_n8n.md`.
  - **Tools:** Validate and execute steps, ensuring deterministic, auditable outcomes. See `backend/07_Tool_Framework.md`.
- **Frontend:** Modern, modular React/TypeScript UI in `frontend/`, with real-time guidance and admin dashboards.

## Key Developer Workflows
- **Backend:**
  - Run scripts and utilities from `backend/` (e.g., `python fetch_convex_images.py`).
  - See `backend/README.md` for architecture and workflow details.
- **Frontend:**
  - Install dependencies: `npm install` in `frontend/`
  - Start dev server: `npm run dev`
  - Build: `npm run build`
  - Preview: `npm run preview`
- **n8n Integration:**
  - Orchestration and automation via n8n workflows in `backend/n8n-orchestrator/` and `n8n/`.

## Project-Specific Conventions
- **Procedures as Data:** Product knowledge is encoded as data/procedures, not prompts or code generation.
- **No Hallucination:** All guidance must be deterministic and verifiable. Avoid LLM-style open-ended generation.
- **Logs & Monitoring:** Agent and tool logs are critical for debugging. See admin dashboard in frontend.
- **Component Structure:** Frontend uses modular, type-safe components. See `frontend/src/components/`.

## Integration Points
- **Vision Models:** Integrate with GPT-4V, Claude Vision, Gemini via adapters in `backend/`.
- **Cross-Component Communication:** Data flows from browser extension → backend vision → agent → orchestration → frontend UI.
- **External Automation:** n8n workflows automate orchestration and tool execution.

## References
- See `backend/README.md` and `frontend/README.md` for detailed architecture and workflow.
- Key files: `backend/03_Vision_Interpretation_Layer.md`, `backend/04_Vision_Agent_Contract.md`, `backend/05_Orchestration_n8n.md`, `backend/07_Tool_Framework.md`, `frontend/src/components/`, `n8n/`.

---

**For AI agents:**
- Always prefer deterministic, auditable logic over generative solutions.
- Reference the above files for architecture and workflow details before making major changes.
- If unsure about a workflow or integration, check the relevant `*_COMPLETE.md` or `*_GUIDE.md` files for step-by-step instructions.
