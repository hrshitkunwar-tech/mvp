# Getting Started with Navigator Backend

## Quick Setup (5 minutes)

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- OpenAI API key (or Anthropic/Google)
- Convex account (free at convex.dev)

### Step 1: Run Setup Script

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
./scripts/setup.sh
```

This will:
- ✅ Check Node.js version
- ✅ Install all dependencies
- ✅ Create .env file from template
- ✅ Verify configuration

### Step 2: Configure Environment

Edit `.env` and add your API keys:

```bash
# Required
OPENAI_API_KEY=sk-your-key-here

# Optional (for other providers)
ANTHROPIC_API_KEY=sk-ant-your-key-here
GOOGLE_API_KEY=your-google-key
```

### Step 3: Start Convex

```bash
cd convex
npx convex dev
```

**First time?** You'll be prompted to:
1. Create a Convex account (free)
2. Create a new project
3. Deploy the schema

**Copy the deployment URL** - you'll need it!

### Step 4: Update .env with Convex URL

```bash
CONVEX_URL=https://your-deployment-name.convex.cloud
```

### Step 5: Start Services

Open **3 terminals**:

**Terminal 1: Vision Service**
```bash
cd services
npm run dev
```

**Terminal 2: Agent Service**
```bash
cd agents
npm run dev
```

**Terminal 3: Convex (if not already running)**
```bash
cd convex
npx convex dev
```

You should see:
```
✅ Vision Service running on http://localhost:3001
✅ Agent Service running on http://localhost:3002
✅ Convex running and synced
```

### Step 6: Test the System

**Test Vision Service:**
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "vision-service",
  "provider": "openai",
  "timestamp": 1706140800000
}
```

**Test Agent Service:**
```bash
curl http://localhost:3002/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "agent-service",
  "agents": ["intent_inference", "procedure_reasoning", "guidance", "recovery"],
  "timestamp": 1706140800000
}
```

## What You Have Running

### 1. Vision Service (Port 3001)
- Analyzes screenshots
- Extracts UI elements
- Returns structured data

### 2. Agent Service (Port 3002)
- 4 specialized AI agents
- Intent inference
- Procedure selection
- Guidance generation
- Recovery recommendations

### 3. Convex Database
- 7 tables for state management
- Real-time queries
- Automatic sync

## Next Steps

### Option A: Use with n8n (Recommended)

1. **Install n8n:**
   ```bash
   npm install -g n8n
   n8n start
   ```

2. **Import workflows:**
   - Open http://localhost:5678
   - Import `n8n-workflows/main-orchestrator.json`
   - Import `n8n-workflows/intent-inference-workflow.json`
   - Import `n8n-workflows/procedure-execution-workflow.json`

3. **Configure environment variables in n8n:**
   - `VISION_SERVICE_URL` = http://localhost:3001
   - `AGENT_SERVICE_URL` = http://localhost:3002
   - `CONVEX_URL` = your Convex URL

4. **Activate workflows**

5. **Send test event:**
   ```bash
   curl -X POST http://localhost:5678/webhook/navigator-screenshot-event \
     -H "Content-Type: application/json" \
     -d @test/sample-screenshot-event.json
   ```

### Option B: Test Services Directly

See `QUICKSTART.md` for API examples and test scripts.

## Common Issues

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules services/node_modules agents/node_modules convex/node_modules
npm install
```

### "Port already in use"

```bash
# Kill processes on ports 3001, 3002
lsof -ti:3001 | xargs kill
lsof -ti:3002 | xargs kill
```

### Convex not syncing

```bash
# Re-authenticate
cd convex
npx convex logout
npx convex dev
```

### Vision service API errors

Check your API key:
```bash
echo $OPENAI_API_KEY
# Should show your key, not "sk-..."
```

## Development Workflow

### Make Changes

1. Edit files in `services/src/` or `agents/src/`
2. Service automatically reloads (watch mode)
3. Test your changes

### Add New Procedures

```bash
# Edit or create new procedure JSON
vim examples/my-new-procedure.json

# Upload to Convex
curl -X POST $CONVEX_URL/api/mutations/procedures/create \
  -d @examples/my-new-procedure.json
```

### View Logs

**Vision Service:**
```bash
cd services && npm run dev
# Logs show interpretation details
```

**Agent Service:**
```bash
cd agents && npm run dev
# Logs show agent reasoning
```

**Convex:**
```bash
cd convex && npx convex logs
# Shows database operations
```

## Architecture Overview

```
Screenshot Event
       ↓
Vision Service (localhost:3001)
       ↓
Convex Database (stores UI state)
       ↓
Agent Service (localhost:3002)
  - Intent Agent
  - Procedure Agent
  - Guidance Agent
  - Recovery Agent
       ↓
n8n Orchestration (localhost:5678)
       ↓
Guidance to User
```

## File Structure

```
backend/
├── services/          Vision service
│   ├── src/
│   │   ├── index.ts           HTTP server
│   │   └── vision-service.ts   Vision logic
│   └── package.json
│
├── agents/            Agent service
│   ├── src/
│   │   ├── index.ts            HTTP server
│   │   ├── agent-service.ts     4 agents
│   │   └── agent-contracts.ts   Interfaces
│   └── package.json
│
├── convex/            Database
│   ├── schema.ts              7 tables
│   ├── ui_states.ts           CRUD operations
│   ├── procedures.ts
│   └── executions.ts
│
├── n8n-workflows/     Orchestration
│   ├── main-orchestrator.json
│   ├── intent-inference-workflow.json
│   └── procedure-execution-workflow.json
│
├── schemas/           TypeScript types (shared)
├── tools/             Validation tools (shared)
└── examples/          Sample procedures
```

## Further Reading

- **ARCHITECTURE.md** - Deep technical dive
- **QUICKSTART.md** - API examples and testing
- **DEPLOYMENT_CHECKLIST.md** - Production deployment guide

## Success! 🎉

You now have:
- ✅ Vision service analyzing screenshots
- ✅ 4 AI agents providing guidance
- ✅ Database storing all state
- ✅ Complete audit trail
- ✅ Ready for n8n orchestration

**Next:** Follow the n8n setup above or explore the API documentation in QUICKSTART.md
