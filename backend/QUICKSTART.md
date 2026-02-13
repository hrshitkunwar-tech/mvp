# Navigator Backend - Quick Start Guide

## Prerequisites

- Node.js 18+
- npm or yarn
- n8n instance (cloud or self-hosted)
- Convex account
- OpenAI API key (or Anthropic/Google for vision)

## 1. Install Dependencies

```bash
cd backend
npm install
```

## 2. Setup Convex Database

```bash
cd convex
npm install
npx convex dev
```

This will:
- Create a new Convex project (or link existing)
- Deploy schema and functions
- Start dev server

**Copy the deployment URL** - you'll need it for n8n.

## 3. Configure Environment Variables

Create `.env` file:

```bash
# Vision Service
OPENAI_API_KEY=sk-...
VISION_SERVICE_URL=http://localhost:3001

# Agent Service
AGENT_SERVICE_URL=http://localhost:3002

# Convex
CONVEX_URL=https://your-convex-deployment.convex.cloud

# Extension WebSocket
EXTENSION_SOCKET_URL=ws://localhost:3003
```

## 4. Start Vision Service

```bash
cd services
npm install
npm run dev
```

Runs on `http://localhost:3001`

**Test**:
```bash
curl -X POST http://localhost:3001/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "screenshot_url": "https://example.com/screenshot.png",
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

## 5. Start Agent Service

```bash
cd agents
npm install
npm run dev
```

Runs on `http://localhost:3002`

**Test Intent Inference**:
```bash
curl -X POST http://localhost:3002/agents/intent-inference \
  -H "Content-Type: application/json" \
  -d @test/intent-inference-input.json
```

## 6. Import n8n Workflows

### Option A: n8n Cloud

1. Go to https://n8n.io
2. Create account / login
3. Click "Workflows" → "Import from File"
4. Import each workflow from `n8n-workflows/`:
   - `main-orchestrator.json`
   - `intent-inference-workflow.json`
   - `procedure-execution-workflow.json`

### Option B: Self-hosted n8n

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n start

# Open http://localhost:5678
# Import workflows via UI
```

### Configure Workflow Environment Variables

For each workflow, set:
- `VISION_SERVICE_URL` = http://localhost:3001
- `AGENT_SERVICE_URL` = http://localhost:3002
- `CONVEX_URL` = your Convex deployment URL
- `EXTENSION_SOCKET_URL` = ws://localhost:3003

## 7. Seed Example Procedure

```bash
curl -X POST $CONVEX_URL/api/mutations/procedures/create \
  -H "Content-Type: application/json" \
  -d @examples/example-procedure.json
```

Verify:
```bash
curl -X GET "$CONVEX_URL/api/queries/procedures/getByProduct?product=github"
```

## 8. Test End-to-End

### Send Test Screenshot Event

```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot-event \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_session_001",
    "timestamp": 1706140800000,
    "screenshot_url": "https://example.com/github-dashboard.png",
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

### Expected Flow

1. ✅ Main orchestrator receives event
2. ✅ Calls vision service → UI state created
3. ✅ Stores UI state in Convex
4. ✅ Triggers intent inference workflow
5. ✅ Intent Inference Agent analyzes UI states
6. ✅ Finds matching procedures
7. ✅ Procedure Reasoning Agent selects best procedure
8. ✅ Creates procedure execution
9. ✅ Starts procedure execution loop
10. ✅ Validates preconditions for step 1
11. ✅ Guidance Agent generates user instruction
12. ✅ Sends guidance to extension (WebSocket)

### Check Logs

**Convex**:
```bash
# View UI states
curl "$CONVEX_URL/api/queries/ui_states/getRecentBySession?session_id=test_session_001"

# View executions
curl "$CONVEX_URL/api/queries/executions/getActiveBySession?session_id=test_session_001"

# View agent logs
curl "$CONVEX_URL/api/queries/agent_logs/getBySession?session_id=test_session_001"
```

**n8n**:
- Open n8n dashboard
- Click "Executions"
- View latest execution
- Inspect each node's input/output

## 9. Development Workflow

### Add a New Tool

1. Define contract:
```typescript
// tools/tool-contracts.ts
export interface MyNewToolInput { ... }
export interface MyNewToolOutput { ... }
```

2. Implement:
```typescript
// tools/observation-tools.ts
export class MyNewTool implements Tool<MyNewToolInput, MyNewToolOutput> {
  name = 'my_new_tool';
  category = 'observation';

  async execute(input: MyNewToolInput): Promise<ToolResult<MyNewToolOutput>> {
    // Implementation
  }
}
```

3. Use in n8n:
- Add HTTP Request node
- Call tool service endpoint
- Pass tool input as JSON body

### Add a New Procedure

1. Create JSON file following schema:
```json
{
  "id": "proc_002_...",
  "name": "...",
  "intent_patterns": [...],
  "steps": [...]
}
```

2. Validate:
```bash
npm run validate-procedure examples/my-procedure.json
```

3. Upload to Convex:
```bash
curl -X POST $CONVEX_URL/api/mutations/procedures/create \
  -d @examples/my-procedure.json
```

### Test a Procedure

```bash
# Create test execution
curl -X POST $CONVEX_URL/api/mutations/executions/create \
  -d '{
    "procedure_id": "proc_001_create_github_repo",
    "session_id": "test_session",
    "intent": { ... }
  }'

# Trigger procedure execution workflow manually in n8n
```

## 10. Troubleshooting

### Vision Service Issues

**Problem**: Vision interpretation failing

**Solution**:
```bash
# Check API key
echo $OPENAI_API_KEY

# Test API directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check vision service logs
tail -f services/vision-service.log
```

### Agent Service Issues

**Problem**: Agent not returning valid JSON

**Solution**:
- Ensure `response_format: { type: 'json_object' }` in LLM call
- Add JSON schema validation
- Use `temperature: 0` for determinism

### n8n Workflow Issues

**Problem**: Workflow not triggering

**Solution**:
- Check webhook URL is accessible
- Verify environment variables are set
- Test workflow manually (Execute Workflow button)
- Check n8n logs: `~/.n8n/logs`

### Convex Issues

**Problem**: Mutations/queries failing

**Solution**:
```bash
# Check Convex status
npx convex status

# View logs
npx convex logs

# Reset dev deployment (WARNING: deletes data)
npx convex dev --reset
```

## 11. Next Steps

### Integrate Browser Extension

1. Build extension that captures screenshots
2. Send events to n8n webhook
3. Listen for guidance via WebSocket
4. Display guidance overlay on page

### Deploy to Production

1. Deploy services to cloud (AWS/GCP/Azure)
2. Set up production Convex deployment
3. Configure n8n cloud instance
4. Set up monitoring (Sentry, Datadog)
5. Enable auth and rate limiting

### Add More Procedures

1. Analyze common user flows in your product
2. Author procedures using schema
3. Test with real UI states
4. Deploy to production

### Improve Vision Accuracy

1. Fine-tune vision prompts for your product
2. Add product-specific UI element patterns
3. Build vision model cache for common pages
4. A/B test different vision providers

### Scale Agent Performance

1. Use streaming for guidance generation
2. Cache agent responses for common scenarios
3. Optimize prompts to reduce tokens
4. Consider fine-tuned models for specific agents

## Resources

- **Full Architecture**: See `ARCHITECTURE.md`
- **Schema Reference**: See `schemas/`
- **Example Procedure**: See `examples/example-procedure.json`
- **API Docs**: See individual service README files
- **n8n Docs**: https://docs.n8n.io
- **Convex Docs**: https://docs.convex.dev

## Support

- GitHub Issues: [your-repo]/issues
- Documentation: [your-docs-site]
- Discord: [your-discord-invite]
