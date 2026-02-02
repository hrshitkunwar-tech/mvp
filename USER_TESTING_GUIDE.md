# 🧪 Navigator - Complete User Testing Guide

## Overview

This guide shows you how to test Navigator as an end user - from installation to getting AI-powered guidance on any web application.

---

## 🎯 What You're Testing

**Navigator** helps you use any web tool by:
1. **Taking screenshots** of your current page
2. **Detecting what tool** you're using (e.g., Jira, Figma, GitHub)
3. **Analyzing the UI** to understand where you are
4. **Providing step-by-step guidance** for your specific task

---

## 📋 Prerequisites Checklist

Before starting, ensure these are running:

```bash
# Check all services are running:

# 1. n8n (Workflow Orchestrator)
curl http://localhost:5678
# Should respond with HTML

# 2. Vision Service (Screenshot Analysis)
curl http://localhost:3001/health
# Should return: {"status":"healthy"...}

# 3. Ollama (Local Vision AI)
curl http://localhost:11434/api/version
# Should return: {"version":"0.15.4"}
```

**If any service is down:**
```bash
# Start n8n
cd ~/Downloads/Navigator_Ultimate_Blueprint
nohup n8n start &

# Start Vision Service
cd ~/Downloads/Navigator_Ultimate_Blueprint/backend/services
npm run dev &

# Start Ollama (if not running)
ollama serve &
```

---

## 🚀 Part 1: Install the Chrome Extension

### Step 1: Open Chrome Extensions

1. Open Google Chrome
2. Go to: `chrome://extensions/`
3. **Enable "Developer mode"** (toggle in top-right corner)

### Step 2: Load the Extension

1. Click **"Load unpacked"** button
2. Navigate to:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension
   ```
3. Select the `extension` folder
4. Click **"Select"** or **"Open"**

### Step 3: Verify Installation

You should see:
- ✅ **Navigator** extension card
- ✅ Version: 2.0.0
- ✅ No errors in the extension card

**Pin the extension** (optional):
- Click the puzzle icon 🧩 in Chrome toolbar
- Find "Navigator"
- Click the pin icon 📌

---

## 🎨 Part 2: Test the Chrome Extension

### Test 1: Activate on Any Website

1. **Go to any website** (e.g., https://github.com)
2. **Click the Navigator extension icon** in your toolbar (or press `Cmd+Shift+N` on Mac)
3. **Wait 10-30 seconds** (Ollama is processing the screenshot)

**What should happen:**
- Extension icon is clicked ✅
- Screenshot is captured ✅
- Vision analysis starts (check logs below)
- Guidance overlay should appear (if implemented)

**Check the logs:**
```bash
# In Chrome DevTools (F12 or Cmd+Option+I):
# 1. Go to "Console" tab
# 2. Look for:
[Navigator] Extension clicked, activating guidance...
[Navigator] Tool detected: <tool-name>
```

### Test 2: Test on Different Websites

Try Navigator on these popular tools:

**Test on GitHub:**
1. Go to: https://github.com
2. Click Navigator icon
3. Expected: Detects "GitHub" as the tool

**Test on Jira/Linear:**
1. Go to any project management tool
2. Click Navigator
3. Expected: Detects the tool name

**Test on Gmail:**
1. Go to: https://mail.google.com
2. Click Navigator
3. Expected: Detects "Gmail" or "Email client"

### Test 3: Check Backend Processing

**Open n8n executions:**
1. Go to: http://localhost:5678
2. Click **"Executions"** (left sidebar)
3. You should see new executions when you click Navigator
4. Click an execution to see the data flow

**Check Vision Service logs:**
```bash
tail -f /tmp/vision-service.log
```

You should see:
```
[Vision] Interpreting screenshot: data:image/jpeg;base64,...
[Vision] Interpretation complete in 15234ms
```

---

## 💻 Part 3: Run the Frontend Web App (Optional)

The frontend provides an admin dashboard to view screenshots, manage procedures, and test integrations.

### Step 1: Install Dependencies

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/frontend
npm install
```

### Step 2: Start the Dev Server

```bash
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3: Open the Frontend

1. Open browser: http://localhost:5173
2. You should see the Navigator admin dashboard

**Features to test:**
- 📊 **Dashboard** - View system status
- 📸 **Screenshot Gallery** - See captured screenshots
- 📚 **Knowledge Base** - Manage procedures
- 🔗 **Integration Status** - Check service health

---

## 🧪 Part 4: End-to-End User Testing Scenarios

### Scenario 1: "Help me create a new GitHub repo"

**User Story:**
> "I'm on GitHub and want to create a new repository, but I don't know where the button is."

**Test Steps:**
1. Go to: https://github.com
2. Click **Navigator extension icon**
3. Wait for processing (10-30s)
4. **Expected**: Navigator detects you're on GitHub homepage
5. **Expected**: Navigator shows guidance: "Click the '+' button → New repository"

**What to verify:**
- ✅ Screenshot captured successfully
- ✅ Tool detected as "GitHub"
- ✅ UI elements identified (buttons, navigation)
- ✅ Guidance provided (even if generic)

---

### Scenario 2: "Help me send an email in Gmail"

**User Story:**
> "I'm in Gmail but forgot how to compose a new email."

**Test Steps:**
1. Go to: https://mail.google.com (login if needed)
2. Click **Navigator icon**
3. Wait for processing
4. **Expected**: Detects Gmail
5. **Expected**: Shows "Compose" button location

**What to verify:**
- ✅ Works on authenticated pages
- ✅ Detects Gmail UI
- ✅ Identifies compose button
- ✅ Provides clear guidance

---

### Scenario 3: "Multi-step workflow"

**User Story:**
> "Guide me through creating a pull request on GitHub (multi-step task)"

**Test Steps:**
1. Go to a GitHub repository
2. Click Navigator
3. Ask: "How do I create a pull request?"
4. **Expected**: Shows step 1 of N
5. Complete step 1
6. **Expected**: Shows step 2
7. Continue until workflow complete

**What to verify:**
- ✅ Multi-step guidance works
- ✅ Can mark steps complete
- ✅ Progress tracking works
- ✅ Final confirmation shown

---

## 🔍 Part 5: Debugging & Verification

### Check if Extension is Capturing Screenshots

**Chrome DevTools Console:**
```javascript
// In any tab, open Console (F12) and type:
chrome.tabs.captureVisibleTab(null, {format: 'jpeg', quality: 50}, (dataUrl) => {
  console.log('Screenshot captured:', dataUrl.substring(0, 100));
});
```

Expected: Base64 image data starting with `data:image/jpeg;base64,...`

### Check if n8n Workflow Executed

1. Go to: http://localhost:5678/executions
2. Sort by date (most recent first)
3. Click the latest execution
4. Verify:
   - ✅ **Node 1 (Webhook)**: Received screenshot data
   - ✅ **Node 2 (Vision Service)**: Called successfully
   - ✅ **Node 3 (Build UI State)**: Generated UI state object
   - ✅ **Node 4 (Response)**: Sent back to extension

### Check Vision Service Processing

```bash
# Watch logs in real-time
tail -f /tmp/vision-service.log

# Then click Navigator extension
# You should see:
[Vision] Interpreting screenshot: https://...
[Vision] Interpretation complete in 23456ms
```

### Check Ollama Processing

```bash
# Check Ollama is using LLaVA
ollama ps

# Should show:
NAME    ID              SIZE      PROCESSOR
llava   8dd30f6b0cb1    7.3 GB    100% GPU
```

---

## 📊 Part 6: Performance Testing

### Test 1: Speed Test

Measure how long each step takes:

```bash
# Start timer
date

# 1. Click Navigator extension (note time)
# 2. Wait for guidance to appear (note time)
# 3. Calculate total time

# Expected times with Ollama:
# - Screenshot capture: ~0.5s
# - Ollama processing: ~10-30s
# - Total: ~15-35s
```

### Test 2: Accuracy Test

Test on 5 different tools and rate accuracy:

| Tool | Detected Correctly? | UI Elements Found? | Guidance Quality |
|------|---------------------|-------------------|------------------|
| GitHub | ✅ Yes / ❌ No | X / 10 | ⭐⭐⭐⭐⭐ |
| Gmail | ✅ Yes / ❌ No | X / 10 | ⭐⭐⭐⭐⭐ |
| Figma | ✅ Yes / ❌ No | X / 10 | ⭐⭐⭐⭐⭐ |
| Jira | ✅ Yes / ❌ No | X / 10 | ⭐⭐⭐⭐⭐ |
| Slack | ✅ Yes / ❌ No | X / 10 | ⭐⭐⭐⭐⭐ |

### Test 3: Stress Test

Test rapid succession:
1. Click Navigator on GitHub
2. Switch to Gmail tab
3. Click Navigator again (before first completes)
4. Switch to Slack tab
5. Click Navigator again

**Expected**: Should queue requests or handle gracefully

---

## 🐛 Troubleshooting

### Issue: Extension does nothing when clicked

**Solution:**
1. Open Chrome DevTools (F12)
2. Go to "Console" tab
3. Look for error messages
4. Check extension permissions:
   - Go to `chrome://extensions/`
   - Click "Details" on Navigator
   - Ensure all permissions are granted

### Issue: "No response from backend"

**Solution:**
```bash
# Check all services are running:
curl http://localhost:5678     # n8n
curl http://localhost:3001/health  # Vision Service
curl http://localhost:11434/api/version  # Ollama

# Restart services if needed (see Prerequisites section)
```

### Issue: Processing takes too long (>60s)

**Solution:**
- Ollama might be slow on first request (loading model)
- Check system resources: `top` (look for ollama process)
- Try smaller images (extension uses 50% JPEG quality)
- Consider switching to Gemini:
  ```bash
  # Edit: backend/services/.env
  VISION_PROVIDER=google
  ```

### Issue: Guidance doesn't appear

**Possible causes:**
1. Content script not injected
   - Reload the page
   - Check extension is enabled
2. Backend returned error
   - Check n8n execution for errors
   - Check Vision Service logs
3. Overlay not rendering
   - Check browser console for JS errors

---

## 📝 Part 7: Testing Checklist

Print this checklist and check off as you test:

### Installation
- [ ] Chrome extension installed without errors
- [ ] Extension appears in toolbar
- [ ] Extension icon is clickable
- [ ] Keyboard shortcut works (Cmd+Shift+N)

### Basic Functionality
- [ ] Screenshot captures when icon clicked
- [ ] n8n workflow executes (check executions page)
- [ ] Vision Service processes image (check logs)
- [ ] Ollama/LLaVA analyzes screenshot
- [ ] Response received by extension

### Tool Detection
- [ ] Correctly detects GitHub
- [ ] Correctly detects Gmail
- [ ] Correctly detects at least 3 different tools
- [ ] Falls back gracefully on unknown tools

### UI Analysis
- [ ] Identifies buttons on page
- [ ] Identifies input fields
- [ ] Identifies navigation elements
- [ ] Generates bounding boxes (coordinates)

### Guidance Delivery
- [ ] Guidance overlay appears
- [ ] Guidance text is readable
- [ ] Guidance is contextually relevant
- [ ] Can dismiss guidance
- [ ] Can request new guidance

### Performance
- [ ] Completes in <60s with Ollama
- [ ] Completes in <10s with Gemini/OpenAI
- [ ] Doesn't crash browser
- [ ] Doesn't freeze UI
- [ ] Handles multiple rapid clicks

### Edge Cases
- [ ] Works on authenticated pages (Gmail, etc.)
- [ ] Works on dynamic SPAs (React apps)
- [ ] Works on iframes (if applicable)
- [ ] Handles network errors gracefully
- [ ] Handles backend downtime gracefully

---

## 🔗 Quick Reference Links

### Local Services
- **n8n Dashboard**: http://localhost:5678
- **n8n Executions**: http://localhost:5678/executions
- **Vision Service Health**: http://localhost:3001/health
- **Frontend App**: http://localhost:5173 (after `npm run dev`)
- **Ollama API**: http://localhost:11434

### Chrome Extension
- **Extensions Page**: `chrome://extensions/`
- **Extension Path**: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension`

### Configuration Files
- **Extension Config**: `extension/config.js`
- **Vision Service Config**: `backend/services/.env`
- **n8n Workflows**: `backend/n8n-orchestrator/workflows/`

### Logs
- **Vision Service**: `tail -f /tmp/vision-service.log`
- **n8n**: Check n8n UI executions
- **Extension**: Chrome DevTools Console (F12)

---

## 📊 Success Metrics

**Your Navigator installation is successful if:**

✅ **Core Functionality:**
- Extension captures screenshots
- Backend processes images
- Tool detection works
- Basic guidance appears

✅ **Performance:**
- Processing completes in <60s (Ollama)
- No browser crashes
- Smooth user experience

✅ **Accuracy:**
- Detects tools correctly >70% of time
- Identifies UI elements >60% accurately
- Guidance is relevant >50% of time

---

## 🎯 Next Steps After Testing

Once testing is complete:

1. **Document bugs** - Note any issues found
2. **Collect feedback** - What worked? What didn't?
3. **Iterate on prompts** - Improve vision model prompts for better accuracy
4. **Add more procedures** - Expand knowledge base for common tasks
5. **Optimize performance** - Consider using Gemini or GPT-4V for speed

---

## 💡 Pro Tips

1. **Use Gemini during development** - Faster than Ollama (1-2s vs 10-30s)
2. **Test on real workflows** - Use tools you actually need help with
3. **Start simple** - Test basic tasks before complex multi-step workflows
4. **Check logs frequently** - Helps understand what's happening
5. **Reload extension after code changes** - Go to `chrome://extensions/` and click reload

---

**Ready to test? Start with Part 1 and work through each section! 🚀**

Questions or issues? Check the troubleshooting section or review the backend logs for detailed error messages.
