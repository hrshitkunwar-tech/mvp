# 🚀 Navigator MVP - Quick Start Guide

Welcome! You're about to run the complete Navigator MVP on your local machine.

## What You're Setting Up

**Navigator** is a Chrome extension that provides contextual AI assistance for web pages using RAG (Retrieval-Augmented Generation).

**What it does:**
- Extracts context from the webpage you're viewing
- Answers questions about the page using Ollama LLM
- Supports 30+ tools (GitHub, AWS, Stack Overflow, etc.)
- Streams responses in real-time

**Architecture:**
```
Chrome Extension → FastAPI Server (port 8000) → Ollama (port 11434)
                                ↓
                         Knowledge Database (optional)
```

---

## ⚡ Quick Start (3 Steps)

### Prerequisites

✅ **Python 3.8+** installed
```bash
python3 --version  # Should show 3.8 or higher
```

✅ **Chrome browser** installed

✅ **Ollama** installed and running (optional but recommended)
```bash
# Install Ollama if you haven't:
# Visit: https://ollama.ai

# Start Ollama:
ollama serve

# In another terminal, pull the model:
ollama pull qwen2.5-coder:7b
```

---

### Step 1: Start the Backend Server

Open a terminal in this directory and run:

```bash
bash start_mvp.sh
```

**Expected output:**
```
====================================
Navigator Backend Server Starting...
====================================
✓ Python found
✓ Virtual environment ready
✓ Dependencies installed
✓ Ollama is running (port 11434)

Starting FastAPI server...
INFO: Uvicorn running on http://127.0.0.1:8000

====================================
✅ Backend is ready!
====================================

Next: Load the extension in Chrome
Extension path: /Users/harshit/Downloads/navigator-mvp/extension/
```

**Keep this terminal open!** The server must stay running.

---

### Step 2: Load the Extension in Chrome

#### 2.1 Open Chrome Extensions Page

In Chrome, go to:
```
chrome://extensions/
```

Or use menu: **Chrome Menu (⋮) → Extensions → Manage Extensions**

#### 2.2 Enable Developer Mode

Find the **"Developer mode"** toggle in the **top-right corner** and turn it **ON**.

After enabling, you'll see three new buttons appear.

#### 2.3 Load the Extension

1. Click **"Load unpacked"** button

2. Navigate to this extension folder:
   ```
   /Users/harshit/Downloads/navigator-mvp/extension/
   ```

3. Select the **`extension`** folder (the whole folder, not individual files)

4. Click **"Select"** or **"Open"**

#### 2.4 Verify Installation

You should see:

```
┌──────────────────────────────────┐
│ 🔵 Navigator: Contextual AI      │
│                                  │
│ Version: 2.0.4                   │
│ ID: [random letters]             │
│ ✓ Enabled                        │
└──────────────────────────────────┘
```

The Navigator icon (🔵) should appear in your Chrome toolbar (top-right).

**If you don't see it:**
- Click the puzzle piece icon (🧩) in the toolbar
- Find "Navigator: Contextual AI"
- Click the pin icon (📌) to keep it visible

---

### Step 3: Test It!

#### 3.1 Navigate to a Supported Tool

Open any of these sites in Chrome:
- **GitHub**: https://github.com/your-username/your-repo
- **AWS Console**: https://console.aws.amazon.com
- **Stack Overflow**: https://stackoverflow.com
- **React Docs**: https://react.dev
- **MDN**: https://developer.mozilla.org

*Full list of 30 tools in: `backend/tools_config.json`*

#### 3.2 Open Navigator Side Panel

Click the **Navigator icon (🔵)** in your toolbar.

A side panel opens on the right side of your browser window.

#### 3.3 Wait for Context Extraction

Navigator automatically scans the page. Wait **2-5 seconds**.

**To verify context was captured:**
1. Click the **"Debug Panel"** button at the bottom
2. You should see:
   - Context ID
   - Number of headings found
   - Interactive elements detected
   - Text content size

**If no context appears:**
- Click **"Force Scan"** button
- Or refresh the page (F5) and wait a few seconds

#### 3.4 Ask Questions!

**Generic questions (work on any page):**
```
What is Python?
Explain REST APIs
How do async functions work?
```
→ Ollama answers using its base knowledge

**Tool-specific questions (on supported sites):**

**On GitHub:**
```
How do I create a pull request?
What's the difference between merge and rebase?
How do I resolve merge conflicts?
```

**On AWS:**
```
How do I create an S3 bucket?
What are IAM roles?
How do I configure auto-scaling?
```

**On any tool page:**
```
What am I looking at on this page?
How do I get started?
What can I do here?
```

#### 3.5 Watch the Magic! ✨

Responses stream **token-by-token** in real-time with Markdown formatting:
- **Bold text**
- `Code blocks`
- Lists and headings

---

## 🔧 Troubleshooting

### "Cannot connect to Brain" Error

**Cause:** Backend server isn't running

**Fix:**
```bash
cd /Users/harshit/Downloads/navigator-mvp/
bash start_mvp.sh
```

Verify it's running:
```bash
curl http://127.0.0.1:8000
# Should return: {"service":"Navigator RAG API","status":"online"}
```

---

### "Connection refused" or No Responses

**Cause:** Ollama isn't running

**Fix:**
```bash
# Start Ollama in a new terminal
ollama serve

# Then in another terminal, verify it's running:
curl http://127.0.0.1:11434/api/tags
# Should return list of models
```

---

### Extension Won't Load

**Fix 1:** Verify folder selection
- You must select the `/extension/` **folder**, not individual files
- The folder should contain `manifest.json`

**Fix 2:** Check for errors
- In `chrome://extensions/`, look for **red error messages**
- Click **"Errors"** button to see details

**Fix 3:** Reload extension
- In `chrome://extensions/`, find Navigator
- Click the **reload icon (🔄)**

---

### No Context Captured (Debug Panel Empty)

**Fix:**
1. Click **"Force Scan"** button in side panel
2. Refresh the page (F5) and wait 5 seconds
3. Check browser console (F12) for JavaScript errors

---

### Responses are Generic (No Tool Knowledge)

**This is normal!** The MVP works without the knowledge database.

**Why it happens:**
- The extension detects tools correctly
- But the Convex knowledge database isn't populated yet
- Ollama answers from its base model only

**To add knowledge later:**
- Populate Convex database with tool knowledge
- See `backend/README.md` for details

---

## 📁 Directory Structure

```
navigator-mvp/
├── extension/              ← Load this in Chrome
│   ├── manifest.json       ← Extension config
│   ├── background.js       ← Service worker (RAG logic)
│   ├── content-script.js   ← Page context extraction
│   ├── sidepanel.*         ← Chat UI
│   └── shared/vision.js    ← Vision fallback
│
├── backend/                ← FastAPI server
│   ├── main.py             ← Server code (RAG + streaming)
│   ├── requirements.txt    ← Python dependencies
│   ├── tools_config.json   ← 30 tool patterns
│   └── .env.example        ← Configuration template
│
├── START_HERE.md           ← This file
└── start_mvp.sh            ← Quick start script
```

---

## 🎯 What's Next?

### Customize the Extension

**Add more tools:**
- Edit `backend/tools_config.json`
- Add your tool patterns and URLs
- Restart backend server

**Customize RAG prompts:**
- Edit `backend/main.py` (lines 140-170)
- See detailed guide: `extension/INSTALLATION_GUIDE.md` in main repo
- Change response style, add instructions, etc.

**Change Ollama model:**
- Edit `backend/main.py` line 183
- Replace `qwen2.5-coder:7b` with your preferred model
- Restart backend server

### Monitor Activity

**Backend logs:**
- Watch the terminal where you ran `start_mvp.sh`
- Shows all API requests and responses

**Extension logs:**
- Open `chrome://extensions/`
- Click **"service worker"** under Navigator
- Console shows background script activity

**Page logs:**
- Press **F12** on any page
- Console shows context extraction activity

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend server running (`http://127.0.0.1:8000` responds)
- [ ] Ollama running (`http://127.0.0.1:11434/api/tags` responds)
- [ ] Extension loaded in Chrome (Navigator icon visible)
- [ ] Can open side panel (click Navigator icon)
- [ ] Context extracted (Debug Panel shows headings/text)
- [ ] Generic query works ("What is Python?")
- [ ] Tool-specific query works (on GitHub: "How do I create a PR?")
- [ ] Responses stream token-by-token
- [ ] Markdown formatting displays correctly

---

## 🛑 Stopping the MVP

### Stop Backend Server
- Go to terminal running `start_mvp.sh`
- Press **Ctrl+C**

### Stop Ollama (optional)
- Go to terminal running `ollama serve`
- Press **Ctrl+C**

### Disable Extension (optional)
- Go to `chrome://extensions/`
- Toggle Navigator **OFF**
- Or click **"Remove"** to uninstall completely

---

## 📚 Additional Documentation

In the main repository (`/Users/harshit/Projects/mvp/`):

- **Extension docs:**
  - `extension/INSTALLATION_GUIDE.md` - Detailed setup guide
  - `extension/DEBUG_GUIDE.md` - Debugging help
  - `extension/RAG_ASSESSMENT.md` - RAG architecture explanation

- **Backend docs:**
  - `backend/api_server/README.md` - Server documentation
  - `backend/api_server/PROMPT_CUSTOMIZATION_GUIDE.md` - Customize RAG prompts

---

## 🚀 You're All Set!

Your Navigator MVP is ready to use!

**Quick recap:**
1. ✓ Start backend: `bash start_mvp.sh`
2. ✓ Load extension: `chrome://extensions/` → Load unpacked
3. ✓ Navigate to GitHub/AWS/etc.
4. ✓ Click Navigator icon
5. ✓ Ask questions!

**Enjoy your contextual AI assistant!** 🧭✨

---

**Questions or issues?**
- Check Troubleshooting section above
- Review extension logs (F12 console)
- Check backend logs (terminal output)
- Verify Ollama is running

**Happy navigating!** 🎉
