# 🚀 START HERE - Navigator Testing

## What is Navigator?

Navigator is an AI-powered guidance system that helps you use any web tool. Click the extension, and it:
- 📸 Takes a screenshot of your current page
- 🔍 Detects what tool you're using
- 🎯 Provides step-by-step guidance for your task

---

## ⚡ Quick Start (5 Minutes)

### 1. Make Sure Everything is Running

Open Terminal and run:

```bash
# Check all services
curl http://localhost:5678 > /dev/null 2>&1 && echo "✅ n8n running" || echo "❌ n8n not running - start with: n8n start"
curl http://localhost:3001/health > /dev/null 2>&1 && echo "✅ Vision Service running" || echo "❌ Vision Service not running"
curl http://localhost:11434/api/version > /dev/null 2>&1 && echo "✅ Ollama running" || echo "❌ Ollama not running - start with: ollama serve"
```

**If anything shows ❌, start it:**

```bash
# Start n8n (Background)
nohup n8n start > /tmp/n8n.log 2>&1 &

# Start Vision Service (Background)
cd ~/Downloads/Navigator_Ultimate_Blueprint/backend/services
npm run dev > /tmp/vision.log 2>&1 &

# Start Ollama (Background)
ollama serve > /tmp/ollama.log 2>&1 &
```

---

### 2. Install Chrome Extension

**Quick Install Steps:**

1. Open Chrome → Navigate to: `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right)
3. Click **"Load unpacked"** button
4. Select this folder:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension
   ```
5. Click **"Select"**

**You should see:**
```
✅ Navigator
   Version 2.0.0
   ID: [some ID]
   [Enabled checkbox should be checked]
```

---

### 3. Test It Now!

**Simple Test:**

1. Go to: **https://github.com**
2. **Click the Navigator extension icon** in your Chrome toolbar
   - (Or press `Cmd+Shift+N` on Mac / `Ctrl+Shift+N` on Windows)
3. **Wait 10-30 seconds** (first time is slower)
4. **Open Chrome DevTools** (Press F12 or `Cmd+Option+I`)
5. Check the Console tab for:
   ```
   [Navigator] Extension clicked, activating guidance...
   [Navigator] Tool detected: GitHub
   ```

**Verify Backend Processed It:**

1. Open: **http://localhost:5678/executions**
2. You should see a new execution at the top
3. Click on it to see the workflow execution details
4. All 4 nodes should show ✅ (green checkmarks)

---

## 📚 Full Documentation

### For Complete Testing Guide:
→ **[USER_TESTING_GUIDE.md](./USER_TESTING_GUIDE.md)**
- Detailed installation steps
- Multiple testing scenarios
- Troubleshooting guide
- Performance metrics
- Full feature checklist

### For 5-Minute Quick Test:
→ **[QUICK_START_TESTING.md](./QUICK_START_TESTING.md)**
- Minimal setup
- Single test scenario
- Quick verification

---

## 🔗 Important Links

### Local Services (Open These in Browser)
- **n8n Dashboard**: http://localhost:5678
- **n8n Workflow Executions**: http://localhost:5678/executions
- **Vision Service Health Check**: http://localhost:3001/health
- **Frontend App** (if running): http://localhost:5173

### Chrome Extension Management
- **Extensions Page**: `chrome://extensions/`
- **Extension Folder**: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension`

---

## 🧪 What to Test

### Must Test:
1. ✅ **Screenshot Capture** - Extension takes screenshot when clicked
2. ✅ **Tool Detection** - Correctly identifies the website/tool
3. ✅ **Backend Processing** - n8n workflow executes successfully
4. ✅ **Vision Analysis** - Ollama/LLaVA processes the image

### Should Test:
5. ✅ **Multiple Tools** - Try on GitHub, Gmail, Figma, etc.
6. ✅ **Performance** - Note how long processing takes
7. ✅ **Error Handling** - What happens if backend is down?

### Nice to Test:
8. ✅ **Guidance Quality** - Is the guidance helpful?
9. ✅ **UI Analysis** - Are UI elements detected correctly?
10. ✅ **Multi-step Workflows** - Complex tasks with multiple steps

---

## 🐛 Common Issues & Quick Fixes

### "Extension doesn't respond when clicked"
```bash
# 1. Check browser console (F12) for errors
# 2. Reload the extension:
#    - Go to chrome://extensions/
#    - Find Navigator
#    - Click the reload icon 🔄
```

### "Connection refused" or "Failed to fetch"
```bash
# Check all services are running:
curl http://localhost:5678
curl http://localhost:3001/health
curl http://localhost:11434/api/version

# If any fail, restart that service (see Step 1 above)
```

### "Processing takes forever (>60 seconds)"
```bash
# This is normal for the FIRST request (Ollama loads model)
# Subsequent requests should be 15-30 seconds

# To speed up, switch to Gemini:
# 1. Edit: backend/services/.env
# 2. Change: VISION_PROVIDER=google
# 3. Restart Vision Service
```

### "No execution appears in n8n"
```bash
# Check Navigator Main Orchestrator is Active:
# 1. Go to: http://localhost:5678/home/workflows
# 2. Find "Navigator Main Orchestrator"
# 3. Make sure toggle shows "Active" (not "Inactive")
```

---

## 📊 System Status Check

Run this to see everything at a glance:

```bash
#!/bin/bash
echo "🔍 Navigator System Status Check"
echo "================================"
echo ""

# n8n
if curl -s http://localhost:5678 > /dev/null 2>&1; then
    echo "✅ n8n: Running (http://localhost:5678)"
else
    echo "❌ n8n: Not running"
fi

# Vision Service
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Vision Service: Running (http://localhost:3001)"
    PROVIDER=$(curl -s http://localhost:3001/health | grep -o '"provider":"[^"]*"' | cut -d'"' -f4)
    echo "   Provider: $PROVIDER"
else
    echo "❌ Vision Service: Not running"
fi

# Ollama
if curl -s http://localhost:11434/api/version > /dev/null 2>&1; then
    VERSION=$(curl -s http://localhost:11434/api/version | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Ollama: Running (http://localhost:11434)"
    echo "   Version: $VERSION"
else
    echo "❌ Ollama: Not running"
fi

# Check if LLaVA is installed
if ollama list | grep -q llava; then
    echo "✅ LLaVA model: Installed"
else
    echo "⚠️  LLaVA model: Not installed (run: ollama pull llava)"
fi

echo ""
echo "================================"
```

Save this as `check-status.sh` and run: `bash check-status.sh`

---

## 🎯 Success Criteria

**Your installation is successful if:**

✅ All services running (n8n, Vision Service, Ollama)
✅ Extension installed and clickable in Chrome
✅ Clicking extension captures screenshot
✅ n8n workflow executes (visible in executions page)
✅ Processing completes in <60 seconds (Ollama) or <10s (Gemini)
✅ No errors in browser console or backend logs

---

## 🚀 Next Steps

After testing:

1. **Try different tools** - GitHub, Gmail, Figma, Jira, etc.
2. **Test real workflows** - "How do I create a PR?" "How do I send an email?"
3. **Monitor performance** - Note processing times
4. **Document bugs** - What doesn't work?
5. **Provide feedback** - What would make it better?

---

## 📝 Testing Checklist

Quick checklist to track your testing:

```
Installation:
[ ] All services running
[ ] Extension installed
[ ] Extension clickable

Basic Test:
[ ] Tested on GitHub
[ ] Screenshot captured
[ ] Workflow executed in n8n
[ ] Processing completed
[ ] No errors

Advanced Tests:
[ ] Tested on 3+ different tools
[ ] Verified tool detection accuracy
[ ] Checked guidance quality
[ ] Tested error handling
[ ] Measured performance

Ready for Production:
[ ] All tests passing
[ ] Performance acceptable (<60s)
[ ] Accuracy >70%
[ ] Documentation complete
```

---

## 💡 Pro Tips

1. **First request is slow** - Ollama loads model (~30s). Subsequent requests faster.
2. **Use Gemini for speed** - Switch provider in `.env` for 1-2s processing
3. **Check logs for debugging**:
   ```bash
   tail -f /tmp/vision-service.log  # Vision Service
   tail -f /tmp/n8n.log            # n8n
   ```
4. **Reload extension after changes** - Go to `chrome://extensions/` → Click reload
5. **Test on real workflows** - More valuable than toy examples

---

**Ready? Start with Step 1 above! 🎉**

Need help? Check `USER_TESTING_GUIDE.md` for detailed troubleshooting.
