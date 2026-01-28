# ✅ n8n Automation Pipelines - Setup Complete!

## 🎉 What We Built

Complete n8n automation infrastructure for your Navigator Procedural Intelligence Platform!

---

## 📦 What's Included

### 1. **n8n Workflows** (3 Complete Pipelines)

#### Workflow 1: Screenshot Processing
- **File**: `n8n/workflows/01-screenshot-processing.json`
- **Trigger**: New screenshot uploaded to Convex
- **Output**: Structured UI state ready for agents

#### Workflow 2: Procedure Execution
- **File**: `n8n/workflows/02-procedure-execution.json`
- **Trigger**: User intent detected
- **Output**: Execution started with initial guidance

#### Workflow 3: Guidance Generation
- **File**: `n8n/workflows/03-guidance-generation.json`
- **Trigger**: Guidance request from UI
- **Output**: Real-time, context-aware guidance

### 2. **Convex Integration**
- **File**: `convex-backend/convex/n8n_integration.ts`
- Functions to trigger all workflows from Convex

### 3. **Configuration Files**
- `.env.template` - Environment variables
- `start-n8n.sh` - Quick start script
- Complete documentation

---

## 🚀 Quick Start Guide

### Step 1: Configure Environment

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n

# Copy template
cp .env.template .env

# Edit .env and add your API keys
nano .env
```

**Required variables:**
- `OPENAI_API_KEY` - Your OpenAI API key
- `CONVEX_URL` - Already set to your Convex deployment
- `N8N_BASIC_AUTH_PASSWORD` - Set a secure password

### Step 2: Start n8n

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint

# Run the quick start script
./n8n/start-n8n.sh
```

Or manually:
```bash
cd n8n
n8n start
```

### Step 3: Access n8n UI

Open in browser:
```
http://localhost:5678
```

Default credentials (change in .env):
- Username: `admin`
- Password: (set in .env)

### Step 4: Import Workflows

1. Open http://localhost:5678
2. Click **"Workflows"** in sidebar
3. Click **"Import from File"**
4. Select each workflow file:
   - `01-screenshot-processing.json`
   - `02-procedure-execution.json`
   - `03-guidance-generation.json`
   - `04-tool-detection.json`
   - `05-next-step.json`
   - `06-generate-guidance-enhanced.json`
5. Click **"Import"**

### Step 5: Configure Credentials

For each workflow, configure:

#### OpenAI Credentials:
1. Click on any OpenAI node
2. Click **"Create New Credential"**
3. Enter your OpenAI API key
4. Save

#### HTTP Request Credentials (if needed):
- Most requests use public Convex endpoints
- No additional auth required

### Step 6: Activate Workflows

1. Open each imported workflow
2. Click the **toggle switch** at top right
3. Workflow status should show **"Active"**

---

## 🧪 Testing the Pipelines

### Test 1: Screenshot Processing

```bash
curl -X POST http://localhost:5678/webhook/screenshot-uploaded \
  -H "Content-Type: application/json" \
  -d '{
    "screenshot_id": "test_123",
    "screenshot_url": "https://abundant-porpoise-181.convex.cloud/api/storage/...",
    "timestamp": 1706400000000
  }'
```

**Expected**: Vision API analyzes screenshot, UI state stored in Convex

### Test 2: Procedure Execution

```bash
curl -X POST http://localhost:5678/webhook/execute-procedure \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "Create a new GitHub repository",
    "user_id": "test_user"
  }'
```

**Expected**: Knowledge queried, procedure selected, execution created

### Test 3: Guidance Generation

```bash
curl -X POST http://localhost:5678/webhook/generate-guidance \
  -H "Content-Type: application/json" \
  -d '{
    "execution_id": "exec_123",
    "procedure": "create_github_repo",
    "step_index": 0,
    "current_step": "Click New Repository button"
  }'
```

**Expected**: Contextual guidance generated and returned

### Test 4: Tool Detection

```bash
curl -X POST http://localhost:5678/webhook/detect-tool \
  -H "Content-Type: application/json" \
  -d '{
    "screenshot": "base64_image_data_here",
    "timestamp": 1706400000000
  }'
```

**Expected**: Tool identified ("GitHub", "Notion") with UI elements

### Test 5: Next Step

```bash
curl -X POST http://localhost:5678/webhook/next-step \
  -H "Content-Type: application/json" \
  -d '{
    "stepIndex": 1,
    "tool": "GitHub",
    "context": {"url": "https://github.com/..."}
  }'
```

**Expected**: Next step instruction returned or completion status

---

## 🔗 Integration with Navigator

### From Convex (After Screenshot Upload):

```typescript
// In your screenshot upload mutation
import { api } from "./_generated/api";

// After saving screenshot
await ctx.runAction(api.n8n_integration.triggerScreenshotProcessing, {
  screenshot_id: screenshotId,
  screenshot_url: url,
  timestamp: Date.now()
});
```

### From Navigator UI (Request Guidance):

```typescript
// In your React component
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api';

function GuidanceInterface() {
  const requestGuidance = useAction(api.n8n_integration.requestGuidance);
  
  const handleRequestGuidance = async () => {
    const result = await requestGuidance({
      execution_id: currentExecution.id,
      procedure: currentProcedure.name,
      step_index: currentStepIndex,
      current_step: currentStep.description
    });
    
    if (result.success) {
      setGuidance(result.guidance);
    }
  };
  
  // ...
}
```

### Health Check:

```typescript
// Check if n8n is available
const checkHealth = useAction(api.n8n_integration.checkN8nHealth);

const status = await checkHealth();
console.log('n8n available:', status.available);
```

---

## 📊 Monitoring & Debugging

### View Execution Logs:

1. Open n8n UI: http://localhost:5678
2. Click **"Executions"** in sidebar
3. See all workflow runs with:
   - Status (success/error)
   - Duration
   - Input/output data
   - Error messages

### Enable Debug Mode:

```bash
N8N_LOG_LEVEL=debug n8n start
```

### Check Webhook URLs:

```bash
# List all active webhooks
curl http://localhost:5678/rest/webhooks
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Navigator System                        │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ VisionGuide  │  │   Convex DB  │  │ Navigator UI │
│  Extension   │  │              │  │              │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       │ Screenshot      │ Trigger         │ Request
       │ Upload          │ Workflow        │ Guidance
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                  ┌──────────────┐
                  │  n8n Server  │
                  │  localhost:  │
                  │     5678     │
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Workflow 1  │  │  Workflow 2  │  │  Workflow 3  │
│ Screenshot   │  │  Procedure   │  │  Guidance    │
│ Processing   │  │  Execution   │  │  Generation  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         ▼
                  ┌──────────────┐
                  │  OpenAI API  │
                  │  GPT-4 Vision│
                  │  GPT-4 Turbo │
                  └──────────────┘
```

---

## 📁 File Structure

```
Navigator_Ultimate_Blueprint/
├── n8n/
│   ├── workflows/
│   │   ├── 01-screenshot-processing.json
│   │   ├── 02-procedure-execution.json
│   │   └── 03-guidance-generation.json
│   ├── .env.template
│   ├── .env (create from template)
│   ├── start-n8n.sh
│   └── database.sqlite (created on first run)
├── visionguide-extension/convex-backend/convex/
│   └── n8n_integration.ts
└── N8N_AUTOMATION_GUIDE.md
```

---

## 🎯 Next Steps

### 1. **Deploy to Production**

Use n8n Cloud or Docker:

```bash
# Docker deployment
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -e OPENAI_API_KEY=$OPENAI_API_KEY \
  -e CONVEX_URL=$CONVEX_URL \
  n8nio/n8n
```

### 2. **Add More Workflows**

Create workflows for:
- Error recovery and retry logic
- Continuous learning from executions
- User feedback collection
- Performance monitoring

### 3. **Enhance Existing Workflows**

- Add error handling nodes
- Implement retry logic
- Add notification systems (email, Slack)
- Create workflow templates

### 4. **Monitor Performance**

- Track execution times
- Monitor success rates
- Analyze bottlenecks
- Optimize slow nodes

---

## 🆘 Troubleshooting

### n8n Won't Start

```bash
# Check if port 5678 is in use
lsof -i :5678

# Kill existing process
kill -9 <PID>

# Start n8n again
n8n start
```

### Webhooks Not Working

1. Check n8n is running: http://localhost:5678
2. Verify workflow is activated (toggle on)
3. Check webhook URL in workflow settings
4. Test with curl command

### OpenAI API Errors

1. Verify API key in credentials
2. Check API quota/billing
3. Review error in execution logs
4. Try with different model

### Convex Connection Issues

1. Verify CONVEX_URL in .env
2. Check Convex deployment status
3. Test Convex queries directly
4. Review CORS settings if needed

---

## 📞 Quick Commands Reference

```bash
# Start n8n
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n
n8n start

# Start with debug logging
N8N_LOG_LEVEL=debug n8n start

# Export workflow
n8n export:workflow --id=<workflow-id> --output=backup.json

# Import workflow
n8n import:workflow --input=workflow.json

# List all workflows
n8n list:workflow

# Check n8n version
n8n --version
```

---

## ✅ Setup Checklist

- [ ] n8n installed globally
- [ ] Environment variables configured (.env)
- [ ] n8n started successfully
- [ ] Accessed n8n UI (http://localhost:5678)
- [ ] Imported all 3 workflows
- [ ] Configured OpenAI credentials
- [ ] Activated all workflows
- [ ] Tested screenshot processing webhook
- [ ] Tested procedure execution webhook
- [ ] Tested guidance generation webhook
- [ ] Integrated with Convex (n8n_integration.ts)
- [ ] Tested from Navigator UI
- [ ] Reviewed execution logs

---

## 🎊 Success!

Your complete n8n automation pipeline is ready!

**What you can do now:**
- ✅ Automatically process screenshots with Vision API
- ✅ Execute procedures based on user intent
- ✅ Generate real-time contextual guidance
- ✅ Orchestrate complex multi-step workflows
- ✅ Monitor all executions in one place

**Your Navigator system is now fully automated!** 🚀

---

For detailed workflow documentation, see: `N8N_AUTOMATION_GUIDE.md`
