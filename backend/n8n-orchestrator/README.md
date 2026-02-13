# Navigator n8n Orchestrator

## Overview

This directory contains the **n8n orchestration service** for Navigator - the deterministic control flow engine that coordinates Vision, Agents, Tools, and Database.

## What's Included

```
n8n-orchestrator/
├── workflows/                    # n8n workflow definitions
│   ├── main-orchestrator.json
│   ├── intent-inference-workflow.json
│   └── procedure-execution-workflow.json
│
├── scripts/
│   └── import-workflows.js       # Automated import tool
│
├── start-n8n.sh                  # n8n startup script
├── .env.example                  # Environment template
└── package.json                  # n8n dependencies
```

## Quick Start

### Option 1: Start Everything Together

From the backend root:
```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
./scripts/start-all.sh
```

This starts:
- ✅ Vision Service (Port 3001)
- ✅ Agent Service (Port 3002)
- ✅ Convex Database
- ✅ n8n Orchestrator (Port 5678)

### Option 2: Start n8n Separately

```bash
cd n8n-orchestrator

# First time setup
npm install
cp .env.example .env

# Start n8n
./start-n8n.sh
```

Then open http://localhost:5678

## First Time Setup

### 1. Create n8n Account

When you first open http://localhost:5678, you'll be prompted to create an account:

1. **Email**: your-email@example.com
2. **Password**: Choose a secure password
3. **First Name / Last Name**: Your name

This account is stored locally in the `.n8n` directory.

### 2. Import Workflows

**Automated Method** (Recommended):
```bash
# Make sure n8n is running first
npm run import

# Or from backend root:
npm run import:workflows
```

**Manual Method**:
1. Open http://localhost:5678
2. Click **"+"** → **"Import from File"**
3. Select workflow files from `./workflows/`:
   - `main-orchestrator.json`
   - `intent-inference-workflow.json`
   - `procedure-execution-workflow.json`
4. Click **Import**

### 3. Configure Environment Variables

Each workflow needs these environment variables configured:

**In n8n UI:**
1. Open a workflow
2. Click on any **HTTP Request** node
3. Look for **"Expression"** fields with `{{$env.VARIABLE_NAME}}`
4. Click **"Settings"** (gear icon in top right)
5. Go to **"Variables"**
6. Add the following variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `VISION_SERVICE_URL` | `http://localhost:3001` | Vision service endpoint |
| `AGENT_SERVICE_URL` | `http://localhost:3002` | Agent service endpoint |
| `CONVEX_URL` | `https://your-deployment.convex.cloud` | Convex database |
| `EXTENSION_SOCKET_URL` | `ws://localhost:3003` | WebSocket for extension |

**Alternative**: Set in `.env` file (loaded automatically):
```bash
# Edit .env
VISION_SERVICE_URL=http://localhost:3001
AGENT_SERVICE_URL=http://localhost:3002
CONVEX_URL=https://your-deployment.convex.cloud
```

### 4. Activate Workflows

For each workflow:
1. Open the workflow
2. Click **"Inactive"** toggle in top right → **"Active"**
3. Workflow is now running!

## Testing the System

### 1. Test Webhook

The **Main Orchestrator** workflow listens for screenshot events on a webhook.

Get the webhook URL:
1. Open **Main Orchestrator** workflow
2. Click on **"Webhook"** node
3. Copy the **Production URL**: `http://localhost:5678/webhook/navigator-screenshot-event`

### 2. Send Test Event

```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot-event \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_session_001",
    "timestamp": 1706140800000,
    "screenshot_url": "https://example.com/test-screenshot.png",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "device_pixel_ratio": 2,
      "url": "https://github.com",
      "title": "GitHub",
      "domain": "github.com"
    }
  }'
```

### 3. View Execution

1. In n8n, click **"Executions"** in left sidebar
2. See your test execution
3. Click on it to view the flow
4. Inspect each node's input/output

## Workflow Descriptions

### 1. Main Orchestrator

**Purpose**: Entry point for all screenshot events

**Flow**:
1. Receives screenshot event via webhook
2. Calls Vision Service to interpret screenshot
3. Stores UI state in Convex
4. Checks if active execution exists
   - YES → Continue Procedure Execution
   - NO → Start Intent Inference

**Webhook URL**: `http://localhost:5678/webhook/navigator-screenshot-event`

### 2. Intent Inference Workflow

**Purpose**: Detect user intent and select procedure

**Flow**:
1. Get recent UI states from Convex
2. Call Intent Inference Agent
3. Find matching procedures
4. Call Procedure Reasoning Agent
5. Create new execution if procedure found
6. Start Procedure Execution workflow

### 3. Procedure Execution Workflow

**Purpose**: Execute procedure step-by-step with validation

**Flow**:
1. Get current execution state
2. Get current step from procedure
3. Validate preconditions (Tools)
4. Generate guidance (Guidance Agent)
5. Send guidance to browser extension
6. Wait for user action
7. Validate success conditions (Tools)
8. If success → Move to next step
9. If failure → Call Recovery Agent
10. Repeat until complete or aborted

## Advanced Configuration

### Enable Webhook Tunnel

For testing with external services:

```bash
cd n8n-orchestrator
npm run tunnel
```

This creates a public URL like: `https://random-id.tunnel.n8n.cloud`

### Custom Port

Edit `.env`:
```bash
N8N_PORT=8080
```

### Enable Authentication

Edit `.env`:
```bash
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
```

### View Logs

```bash
# From backend root
tail -f logs/n8n.log

# Or directly
cd n8n-orchestrator
tail -f .n8n/logs/n8n.log
```

## Troubleshooting

### n8n won't start

```bash
# Check if port 5678 is in use
lsof -ti:5678

# Kill process
lsof -ti:5678 | xargs kill

# Restart
./start-n8n.sh
```

### Workflows not importing

```bash
# Check n8n is running
curl http://localhost:5678/healthz

# Try manual import via UI instead
```

### Environment variables not working

1. Make sure `.env` file exists
2. Restart n8n after changing `.env`
3. Or set variables in n8n UI (Settings → Variables)

### Execution fails

1. Click on failed execution
2. See which node failed
3. Check node's error message
4. Verify service URLs are correct
5. Check service logs:
   ```bash
   tail -f ../logs/vision.log
   tail -f ../logs/agents.log
   ```

## Production Deployment

### Using n8n Cloud

1. Sign up at https://n8n.io
2. Export workflows: `npm run export`
3. Import in n8n Cloud dashboard
4. Configure environment variables
5. Update webhook URLs to cloud URLs

### Self-Hosted (Docker)

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Then import workflows as usual.

## Workflow Development

### Create New Workflow

1. Open n8n UI
2. Click **"+"** → **"Blank workflow"**
3. Add nodes by clicking **"+"**
4. Connect nodes by dragging
5. Configure each node
6. Save and activate

### Export Workflows

```bash
npm run export

# Workflows saved to ./workflows/backup/
```

### Modify Existing Workflows

1. Open workflow in n8n UI
2. Edit nodes
3. Save
4. Re-export if you want to version control

## Integration with Browser Extension

The Procedure Execution workflow sends guidance to the browser extension via WebSocket.

**Expected flow**:
1. Extension sends screenshot → Main Orchestrator
2. System processes → Generates guidance
3. Guidance sent to `EXTENSION_SOCKET_URL`
4. Extension displays overlay to user

**Configure WebSocket URL** in workflow:
```
{{$env.EXTENSION_SOCKET_URL}}  # e.g., ws://localhost:3003
```

## n8n Resources

- **Official Docs**: https://docs.n8n.io
- **Community**: https://community.n8n.io
- **Templates**: https://n8n.io/workflows

## Summary

✅ **n8n Installed**: Self-hosted orchestration engine
✅ **3 Workflows Ready**: Main, Intent, Execution
✅ **Auto-Import Script**: One-command workflow import
✅ **Environment Config**: Service URLs configured
✅ **Integrated**: Works with Vision, Agents, Convex

**Next**: Start all services with `./scripts/start-all.sh` and test the system!
