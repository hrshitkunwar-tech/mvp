# 🚀 Navigator System - Quick Reference Card

## System Status: ✅ READY

### Services Running:
- ✅ Frontend: http://localhost:5173
- ✅ Convex: https://abundant-porpoise-181.convex.cloud  
- ✅ n8n: **INSTALLED** (ready to start)

---

## 🎯 Quick Start Commands

### Start All Services:
```bash
# Terminal 1: Frontend (already running)
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/frontend
npm run dev

# Terminal 2: Convex (already running)
cd /Users/harshit/Downloads/visionguide-extension/convex-backend
npx convex dev

# Terminal 3: n8n (NEW - start this now!)
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n
./start-n8n.sh
```

---

## 📊 System Overview

| Component | Status | URL/Location | Data |
|-----------|--------|--------------|------|
| Navigator UI | ✅ Running | http://localhost:5173 | 4 views |
| Convex DB | ✅ Live | abundant-porpoise-181 | 318 items |
| VisionGuide | ✅ Ready | Chrome Extension | 27 screenshots |
| Knowledge Base | ✅ Imported | Convex | 291 docs |
| n8n | ✅ Installed | localhost:5678 | 3 workflows |
| ScrapeData | ✅ Ready | Local SQLite | 5 tools |

---

## 🔑 Key URLs

- **Navigator UI**: http://localhost:5173
- **n8n Dashboard**: http://localhost:5678 (after starting)
- **Convex Dashboard**: https://dashboard.convex.dev

---

## 📁 Important Files

### Documentation:
- `COMPLETE_SYSTEM_SUMMARY.md` - Full system overview ⭐
- `N8N_SETUP_COMPLETE.md` - n8n quick start ⭐
- `KNOWLEDGE_IMPORT_COMPLETE.md` - Knowledge base guide
- `INTEGRATION_COMPLETE.md` - UI integration guide

### Configuration:
- `frontend/.env` - Frontend config
- `n8n/.env.template` - n8n config template
- `n8n/start-n8n.sh` - n8n startup script

### Workflows:
- `n8n/workflows/01-screenshot-processing.json`
- `n8n/workflows/02-procedure-execution.json`
- `n8n/workflows/03-guidance-generation.json`

---

## 🎯 Next Steps (In Order)

### 1. Start n8n (5 minutes)
```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n

# Copy environment template
cp .env.template .env

# Edit .env - add your OpenAI API key
nano .env

# Start n8n
./start-n8n.sh
```

### 2. Import Workflows (5 minutes)
1. Open http://localhost:5678
2. Create account/login
3. Click "Workflows" → "Import from File"
4. Import all 3 workflow files
5. Configure OpenAI credentials
6. Activate workflows

### 3. Test Integration (10 minutes)
```bash
# Test screenshot processing
curl -X POST http://localhost:5678/webhook/screenshot-uploaded \
  -H "Content-Type: application/json" \
  -d '{"screenshot_id":"test","screenshot_url":"https://...","timestamp":1706400000000}'

# Test procedure execution
curl -X POST http://localhost:5678/webhook/execute-procedure \
  -H "Content-Type: application/json" \
  -d '{"intent":"Create GitHub repo","user_id":"test"}'
```

---

## 💡 Common Tasks

### Capture Screenshot:
1. Open Chrome
2. Click VisionGuide extension
3. Click "Take Screenshot"
4. View in Navigator UI → Screenshots tab

### Search Knowledge:
1. Open http://localhost:5173
2. Click "Knowledge" tab
3. Search for "embeddings", "API", etc.
4. Filter by tool (OpenAI/LangChain)

### Add New Tool Documentation:
```bash
cd /Users/harshit/Downloads/ScrapeData
python3 main.py register "Anthropic" --website "https://anthropic.com"
python3 main.py ingest-github --tool Anthropic
python3 export_knowledge.py

cd ../visionguide-extension/convex-backend
node import_to_convex.js
```

---

## 🆘 Troubleshooting

### Frontend not loading?
```bash
cd frontend
npm install
npm run dev
```

### Convex not syncing?
```bash
cd visionguide-extension/convex-backend
npx convex dev
```

### n8n won't start?
```bash
# Check if port 5678 is in use
lsof -i :5678

# Kill existing process
kill -9 <PID>

# Start again
cd n8n && n8n start
```

---

## 📈 Current Statistics

- **Screenshots**: 27
- **Knowledge Chunks**: 291
- **Tools**: 2 (OpenAI, LangChain)
- **Workflows**: 3 (ready to activate)
- **UI Views**: 4 (all working)
- **Total Data**: 318 items

---

## 🎊 What You Built

✅ **Complete Procedural Intelligence Platform**
- Real-time screenshot capture & analysis
- AI-powered procedure execution
- Comprehensive knowledge base
- Automated workflow orchestration
- Beautiful, responsive UI

**Ready to automate complex procedures!** 🚀

---

## 📞 Quick Help

**Need to restart everything?**
```bash
# Kill all
pkill -f "npm run dev"
pkill -f "npx convex"
pkill -f "n8n"

# Start fresh
cd frontend && npm run dev &
cd visionguide-extension/convex-backend && npx convex dev &
cd n8n && n8n start &
```

**Check what's running:**
```bash
lsof -i :5173  # Frontend
lsof -i :5678  # n8n
ps aux | grep convex  # Convex
```

---

**System Architecture Diagram**: See `navigator_system_architecture.png`

**Full Documentation**: See `COMPLETE_SYSTEM_SUMMARY.md`

**You're all set!** 🎉
