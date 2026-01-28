# Navigator Backend - Deployment Checklist

## Pre-Deployment Checklist

### ✅ Code Complete
- [x] Vision → UI State schema (`schemas/ui-state.schema.ts`)
- [x] Procedural Intelligence model (`schemas/procedure.schema.ts`)
- [x] Agent contracts and implementations (`agents/*.ts`)
- [x] Tool framework (`tools/*.ts`)
- [x] Vision service (`services/vision-service.ts`)
- [x] n8n workflows (`n8n-workflows/*.json`)
- [x] Convex schema and functions (`convex/*.ts`)
- [x] Example procedure (`examples/example-procedure.json`)
- [x] Complete documentation (6 MD files)

### 📋 Development Setup

#### Local Environment
- [ ] Node.js 18+ installed
- [ ] npm/yarn configured
- [ ] n8n instance accessible (cloud or local)
- [ ] Convex account created
- [ ] API keys obtained (OpenAI/Anthropic/Google)

#### Environment Variables
```bash
# Create .env file
OPENAI_API_KEY=sk-...               # Vision model
ANTHROPIC_API_KEY=sk-ant-...        # Alternative vision
GOOGLE_API_KEY=...                  # Alternative vision

CONVEX_URL=https://....convex.cloud # Convex deployment
VISION_SERVICE_URL=http://...       # Vision service endpoint
AGENT_SERVICE_URL=http://...        # Agent service endpoint
EXTENSION_SOCKET_URL=ws://...       # WebSocket for extension

N8N_WEBHOOK_URL=http://...          # n8n webhook endpoint
```

#### Install Dependencies
```bash
cd backend
npm install

cd convex
npm install

cd ../services
npm install

cd ../agents
npm install
```

### 🗄️ Database Setup

#### Convex
```bash
cd convex

# Development
npx convex dev

# Production
npx convex deploy --prod

# Verify deployment
npx convex status
```

**Expected output**:
- Deployment URL
- 7 tables created (ui_states, procedures, executions, agent_logs, tool_logs, sessions, intent_history)
- All functions deployed

#### Seed Example Procedure
```bash
curl -X POST $CONVEX_URL/api/mutations/procedures/create \
  -H "Content-Type: application/json" \
  -d @examples/example-procedure.json

# Verify
curl "$CONVEX_URL/api/queries/procedures/getByProduct?product=github"
```

### 🚀 Service Deployment

#### Vision Service
```bash
cd services

# Test locally first
npm run dev
# Verify: curl http://localhost:3001/health

# Deploy (example: Railway)
railway up

# Or Docker
docker build -t navigator-vision-service .
docker run -p 3001:3001 navigator-vision-service
```

**Verify**:
```bash
curl -X POST $VISION_SERVICE_URL/interpret \
  -d '{"screenshot_url": "...", "viewport": {...}}'
```

#### Agent Service
```bash
cd agents

# Test locally
npm run dev
# Verify: curl http://localhost:3002/health

# Deploy
railway up

# Or Docker
docker build -t navigator-agent-service .
docker run -p 3002:3002 navigator-agent-service
```

**Verify**:
```bash
curl -X POST $AGENT_SERVICE_URL/agents/intent-inference \
  -d @test/intent-inference-input.json
```

### 🔄 n8n Workflow Setup

#### Import Workflows
1. [ ] Open n8n dashboard
2. [ ] Import `main-orchestrator.json`
3. [ ] Import `intent-inference-workflow.json`
4. [ ] Import `procedure-execution-workflow.json`

#### Configure Environment Variables (in each workflow)
- [ ] `VISION_SERVICE_URL`
- [ ] `AGENT_SERVICE_URL`
- [ ] `CONVEX_URL`
- [ ] `EXTENSION_SOCKET_URL`

#### Activate Workflows
- [ ] Main Orchestrator - Set webhook URL
- [ ] Intent Inference - Activate
- [ ] Procedure Execution - Activate

#### Test Webhook
```bash
curl -X POST $N8N_WEBHOOK_URL/navigator-screenshot-event \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "timestamp": 1706140800000,
    "screenshot_url": "https://example.com/test.png",
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

### 🧪 Testing

#### Unit Tests (To Implement)
```bash
# Create test files
mkdir -p tests/unit tests/integration tests/fixtures

# Run tests
npm test
```

#### Integration Tests
- [ ] Test Vision Service with real screenshot
- [ ] Test Agent Service with sample UI states
- [ ] Test Tool Framework with fixtures
- [ ] Test n8n workflows end-to-end

#### End-to-End Test
```bash
# Full flow test
./scripts/test-e2e.sh

# Expected flow:
# 1. Screenshot event → Main orchestrator
# 2. Vision interpretation → UI state created
# 3. Intent inference → Intent detected
# 4. Procedure selection → Procedure chosen
# 5. Execution created → Step 1 guidance generated
# 6. Guidance sent to extension
```

### 📊 Monitoring Setup

#### Logging
- [ ] Set up centralized logging (e.g., Datadog, Logtail)
- [ ] Configure log levels (INFO for production)
- [ ] Set up log retention policies

#### Error Tracking
- [ ] Integrate Sentry for error tracking
- [ ] Set up error alerts (Slack/Email)
- [ ] Configure source maps for stack traces

#### Performance Monitoring
- [ ] Track vision service latency
- [ ] Track agent service latency
- [ ] Monitor Convex query performance
- [ ] Set up alerts for slow queries (>5s)

#### Metrics to Track
- [ ] Screenshot events per minute
- [ ] Vision interpretation success rate
- [ ] Intent inference confidence scores
- [ ] Procedure execution completion rate
- [ ] Step success/failure rates
- [ ] Recovery success rates
- [ ] Average guidance latency

### 🔒 Security

#### API Keys
- [ ] Store in environment variables (not code)
- [ ] Use secrets manager (AWS Secrets Manager, etc.)
- [ ] Rotate keys regularly
- [ ] Set up key usage alerts

#### Data Privacy
- [ ] Encrypt screenshots at rest
- [ ] Auto-delete screenshots after 24 hours
- [ ] Implement user consent flow
- [ ] GDPR compliance (if EU users)

#### Access Control
- [ ] Restrict Convex mutations to authenticated requests
- [ ] Rate limit n8n webhooks
- [ ] Implement API authentication
- [ ] Set up CORS policies

### 💰 Cost Optimization

#### Vision Service
- [ ] Cache UI states for identical screenshots (30s TTL)
- [ ] Use batch processing where possible
- [ ] Monitor token usage per screenshot
- [ ] Consider cheaper models for simple pages

#### Agent Service
- [ ] Use GPT-3.5-turbo for Guidance Agent (10x cheaper)
- [ ] Cache intent inference for similar UI sequences
- [ ] Set max tokens limits
- [ ] Monitor cost per execution

#### Database
- [ ] Archive old executions (>30 days)
- [ ] Compress audit logs
- [ ] Set up data retention policies
- [ ] Monitor Convex bandwidth usage

**Expected Costs** (per 1K events):
- Vision: $0.50
- Agents: $0.26
- Database: $0.05
- **Total: ~$0.81 per 1K events**

### 📈 Scaling Preparation

#### Horizontal Scaling
- [ ] Vision service: Deploy multiple instances
- [ ] Agent service: Deploy multiple instances
- [ ] Load balancer configured
- [ ] Auto-scaling rules set

#### Caching Strategy
- [ ] Redis for UI state caching
- [ ] CDN for static assets
- [ ] Procedure cache in memory

#### Rate Limiting
- [ ] Vision API: Max 100 req/min per user
- [ ] Agent API: Max 50 req/min per user
- [ ] n8n webhook: Max 200 req/min global

### 🚢 Production Deployment

#### Pre-Production Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented

#### Deployment Steps
1. [ ] Deploy Convex to production
2. [ ] Deploy Vision Service
3. [ ] Deploy Agent Service
4. [ ] Import n8n workflows to production instance
5. [ ] Configure production environment variables
6. [ ] Run smoke tests
7. [ ] Enable monitoring
8. [ ] Monitor for 24 hours

#### Post-Deployment
- [ ] Verify all workflows active
- [ ] Test with real user traffic (canary)
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify cost projections

### 📱 Browser Extension Integration

#### Extension Setup
- [ ] Extension captures screenshots on page load
- [ ] Extension sends events to n8n webhook
- [ ] Extension listens for guidance via WebSocket
- [ ] Extension displays guidance overlay

#### Test Integration
```javascript
// Extension test code
navigator.sendScreenshot({
  session_id: user.session_id,
  screenshot: canvas.toDataURL(),
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
    url: window.location.href,
    title: document.title
  }
});

// Listen for guidance
socket.on('guidance', (data) => {
  showGuidanceOverlay(data);
});
```

### 🎯 Success Criteria

#### Technical Metrics
- [ ] Vision interpretation success rate >95%
- [ ] Intent inference accuracy >85%
- [ ] Procedure selection accuracy >90%
- [ ] Step guidance accuracy >95%
- [ ] Recovery success rate >90%
- [ ] Average latency <5 seconds
- [ ] Error rate <1%

#### Business Metrics
- [ ] User satisfaction >4.5/5
- [ ] Guidance completion rate >80%
- [ ] Time saved per user >10 min/week
- [ ] Support ticket reduction >30%

### 🐛 Troubleshooting

#### Common Issues

**Vision service not responding**:
```bash
# Check service health
curl $VISION_SERVICE_URL/health

# Check logs
tail -f services/vision-service.log

# Verify API key
echo $OPENAI_API_KEY
```

**n8n workflow not triggering**:
```bash
# Check webhook URL
curl -X POST $N8N_WEBHOOK_URL/navigator-screenshot-event -d '{}'

# Check workflow activation in n8n dashboard
# Check environment variables in workflow
```

**Convex queries failing**:
```bash
# Check deployment status
npx convex status

# View logs
npx convex logs

# Test query directly
curl "$CONVEX_URL/api/queries/ui_states/getRecentBySession?session_id=test"
```

### 📚 Documentation Checklist

- [x] README.md - System overview
- [x] QUICKSTART.md - Setup guide
- [x] ARCHITECTURE.md - Deep dive
- [x] SYSTEM_DIAGRAM.md - Visual diagrams
- [x] IMPLEMENTATION_SUMMARY.md - Deliverables
- [x] FILE_INDEX.md - File reference
- [x] START_HERE.md - Quick start
- [x] DEPLOYMENT_CHECKLIST.md - This file

### 🎉 Launch Checklist

#### Pre-Launch (T-7 days)
- [ ] All code complete and tested
- [ ] Production environment configured
- [ ] Monitoring and alerts set up
- [ ] Documentation complete
- [ ] Team trained on system

#### Launch Day (T-0)
- [ ] Deploy all services
- [ ] Activate n8n workflows
- [ ] Monitor error rates (should be <1%)
- [ ] Monitor latency (should be <5s)
- [ ] Verify first successful execution

#### Post-Launch (T+1 week)
- [ ] Review metrics daily
- [ ] Address any issues
- [ ] Gather user feedback
- [ ] Optimize based on usage patterns

### 🔄 Maintenance

#### Daily
- [ ] Check error rates
- [ ] Review failed executions
- [ ] Monitor costs

#### Weekly
- [ ] Review performance metrics
- [ ] Check API usage
- [ ] Review agent logs for improvements

#### Monthly
- [ ] Update procedures based on usage
- [ ] Optimize prompts
- [ ] Review and archive old data
- [ ] Update documentation

---

## Final Sign-Off

- [ ] All code reviewed and approved
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Production environment ready
- [ ] Monitoring configured
- [ ] Team trained
- [ ] Go/No-Go decision: **GO** 🚀

**Deployment Date**: ________________

**Deployed By**: ________________

**Sign-Off**: ________________

---

**You're ready to deploy Navigator!** 🎉

Next: Follow `QUICKSTART.md` to set up your local environment, then use this checklist for production deployment.
