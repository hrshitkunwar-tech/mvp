# 🔄 Navigator n8n Automation Pipelines

## Overview

This document describes the complete n8n automation pipelines for the Navigator Procedural Intelligence Platform.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    n8n Automation Hub                        │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Workflow 1  │  │  Workflow 2  │  │  Workflow 3  │
│  Screenshot  │  │  Procedure   │  │  Guidance    │
│  Processing  │  │  Execution   │  │  Generation  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Workflow 1: Screenshot Processing Pipeline

**Trigger**: New screenshot uploaded to Convex
**Purpose**: Process screenshots and extract UI state

### Nodes:

1. **Convex Webhook Trigger**
   - Listen for new screenshots
   - Get screenshot URL and metadata

2. **Download Screenshot**
   - Fetch image from Convex storage
   - Prepare for Vision API

3. **Vision API Analysis**
   - Send to OpenAI Vision API
   - Extract UI elements, text, layout

4. **Parse UI State**
   - Structure the vision response
   - Identify clickable elements
   - Extract text content

5. **Store UI State**
   - Save to Convex `ui_states` table
   - Link to original screenshot

6. **Trigger Procedure Selection**
   - Call Workflow 2 if user intent detected

### Configuration:

```json
{
  "name": "Screenshot Processing",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "New Screenshot",
      "parameters": {
        "path": "screenshot-uploaded",
        "method": "POST"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Download Screenshot",
      "parameters": {
        "url": "={{ $json.screenshot_url }}",
        "method": "GET"
      }
    },
    {
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "name": "Vision Analysis",
      "parameters": {
        "model": "gpt-4-vision-preview",
        "prompt": "Analyze this screenshot and extract all UI elements, text, and interactive components. Return as structured JSON."
      }
    },
    {
      "type": "n8n-nodes-base.code",
      "name": "Parse UI State",
      "parameters": {
        "jsCode": "// Parse vision response into structured UI state"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Store in Convex",
      "parameters": {
        "url": "https://abundant-porpoise-181.convex.cloud/api/mutation",
        "method": "POST",
        "body": {
          "path": "ui_states:create",
          "args": "={{ $json }}"
        }
      }
    }
  ]
}
```

---

## Workflow 2: Procedure Selection & Execution

**Trigger**: User intent detected or manual trigger
**Purpose**: Select and execute appropriate procedure

### Nodes:

1. **Intent Webhook**
   - Receive user intent
   - Get current UI state

2. **Query Knowledge Base**
   - Search tool documentation
   - Find relevant procedures

3. **LLM Procedure Selection**
   - Use GPT-4 to select best procedure
   - Consider context and user goal

4. **Retrieve Procedure**
   - Get procedure from Convex
   - Load step-by-step instructions

5. **Initialize Execution**
   - Create execution record
   - Set up tracking

6. **Execute Steps Loop**
   - For each step in procedure:
     - Analyze current UI state
     - Determine next action
     - Generate guidance
     - Wait for user action
     - Verify completion

7. **Store Results**
   - Save execution history
   - Update metrics

### Configuration:

```json
{
  "name": "Procedure Execution",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "Intent Trigger",
      "parameters": {
        "path": "execute-procedure",
        "method": "POST"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Query Knowledge",
      "parameters": {
        "url": "https://abundant-porpoise-181.convex.cloud/api/query",
        "method": "POST",
        "body": {
          "path": "knowledge:searchKnowledge",
          "args": {
            "query": "={{ $json.intent }}",
            "limit": 5
          }
        }
      }
    },
    {
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "name": "Select Procedure",
      "parameters": {
        "model": "gpt-4-turbo",
        "prompt": "Based on user intent and available documentation, select the best procedure to execute."
      }
    },
    {
      "type": "n8n-nodes-base.loop",
      "name": "Execute Steps",
      "parameters": {
        "loopMode": "forEach"
      }
    }
  ]
}
```

---

## Workflow 3: Real-time Guidance Generation

**Trigger**: User needs guidance on current step
**Purpose**: Generate contextual, real-time guidance

### Nodes:

1. **Guidance Request**
   - Receive current step
   - Get UI state

2. **Fetch Context**
   - Get procedure details
   - Get relevant documentation
   - Get previous steps

3. **LLM Guidance Generation**
   - Use GPT-4 to generate guidance
   - Include screenshots
   - Provide clear instructions

4. **Format Response**
   - Structure guidance
   - Add confidence score
   - Include fallback options

5. **Send to UI**
   - Push to Navigator UI
   - Update guidance interface

### Configuration:

```json
{
  "name": "Guidance Generation",
  "nodes": [
    {
      "type": "n8n-nodes-base.webhook",
      "name": "Guidance Request",
      "parameters": {
        "path": "generate-guidance",
        "method": "POST"
      }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Fetch Context",
      "parameters": {
        "url": "https://abundant-porpoise-181.convex.cloud/api/query",
        "method": "POST"
      }
    },
    {
      "type": "@n8n/n8n-nodes-langchain.openAi",
      "name": "Generate Guidance",
      "parameters": {
        "model": "gpt-4-turbo",
        "prompt": "Generate step-by-step guidance for the user based on current UI state and procedure step."
      }
    }
  ]
}
```

---

## Workflow 4: Error Recovery & Fallback

**Trigger**: Error detected or step fails
**Purpose**: Recover from errors and provide alternatives

### Nodes:

1. **Error Detection**
   - Monitor execution status
   - Detect failures

2. **Analyze Error**
   - Get error context
   - Search documentation for solutions

3. **Generate Recovery Steps**
   - Use LLM to suggest fixes
   - Provide alternative approaches

4. **Update Execution**
   - Mark step as failed
   - Add recovery guidance

---

## Workflow 5: Continuous Learning

**Trigger**: Execution completed
**Purpose**: Learn from successful/failed executions

### Nodes:

1. **Execution Complete**
   - Get execution results
   - Collect metrics

2. **Analyze Performance**
   - Calculate success rate
   - Identify bottlenecks

3. **Update Procedures**
   - Improve step descriptions
   - Add common pitfalls

4. **Store Insights**
   - Save to knowledge base
   - Update documentation

---

## Environment Variables

Create `.env` file in n8n directory:

```bash
# Convex
CONVEX_URL=https://abundant-porpoise-181.convex.cloud
CONVEX_DEPLOY_KEY=your_deploy_key

# OpenAI
OPENAI_API_KEY=your_openai_key

# n8n
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http

# Webhooks
WEBHOOK_URL=http://localhost:5678/webhook

# Database
DB_TYPE=sqlite
DB_SQLITE_DATABASE=/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n/database.sqlite
```

---

## Installation & Setup

### 1. Install n8n
```bash
npm install -g n8n
```

### 2. Create n8n Directory
```bash
mkdir -p ~/Downloads/Navigator_Ultimate_Blueprint/n8n
cd ~/Downloads/Navigator_Ultimate_Blueprint/n8n
```

### 3. Start n8n
```bash
n8n start
```

### 4. Access n8n UI
```
http://localhost:5678
```

### 5. Import Workflows
- Open n8n UI
- Click "Import from File"
- Select workflow JSON files

---

## Webhook Endpoints

Once n8n is running, configure these webhooks:

### Convex → n8n
```typescript
// In Convex, after screenshot upload:
await fetch('http://localhost:5678/webhook/screenshot-uploaded', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    screenshot_id: screenshotId,
    screenshot_url: url,
    timestamp: Date.now()
  })
});
```

### Navigator UI → n8n
```typescript
// When user requests guidance:
const guidance = await fetch('http://localhost:5678/webhook/generate-guidance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    step_id: currentStep.id,
    ui_state: currentUIState,
    user_intent: userIntent
  })
});
```

---

## Testing Workflows

### Test Screenshot Processing:
```bash
curl -X POST http://localhost:5678/webhook/screenshot-uploaded \
  -H "Content-Type: application/json" \
  -d '{
    "screenshot_id": "test123",
    "screenshot_url": "https://example.com/screenshot.png",
    "timestamp": 1234567890
  }'
```

### Test Procedure Execution:
```bash
curl -X POST http://localhost:5678/webhook/execute-procedure \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "Create a new GitHub repository",
    "user_id": "user123"
  }'
```

---

## Monitoring & Debugging

### View Execution Logs:
- Open n8n UI
- Go to "Executions"
- Filter by workflow
- View detailed logs

### Enable Debug Mode:
```bash
N8N_LOG_LEVEL=debug n8n start
```

### Check Webhook Status:
```bash
curl http://localhost:5678/webhook-test/screenshot-uploaded
```

---

## Production Deployment

### Option 1: Docker
```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

### Option 2: PM2
```bash
pm2 start n8n --name navigator-n8n
pm2 save
pm2 startup
```

### Option 3: Cloud (n8n.cloud)
- Sign up at n8n.cloud
- Import workflows
- Configure credentials
- Set up webhooks

---

## Next Steps

1. ✅ Install n8n
2. ✅ Import workflow templates
3. ✅ Configure credentials (OpenAI, Convex)
4. ✅ Test each workflow
5. ✅ Connect to Navigator UI
6. ✅ Monitor executions
7. ✅ Iterate and improve

---

## Workflow Files

All workflow JSON files are in:
```
/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n/workflows/
```

- `01-screenshot-processing.json`
- `02-procedure-execution.json`
- `03-guidance-generation.json`
- `04-error-recovery.json`
- `05-continuous-learning.json`

---

**Your complete automation pipeline is ready!** 🚀
