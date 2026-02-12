# Navigator Extension - Installation & Usage Guide

## 📍 Extension Location

**Path:** `/home/user/mvp/extension/`

**Contents:**
```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (RAG orchestration)
├── content-script.js      # DOM extraction
├── sidepanel.html         # Chat UI
├── sidepanel.js          # UI logic
├── sidepanel.css         # Styling
├── config.js             # Convex URL
├── icon.png              # Extension icon
└── shared/               # Utility modules
    ├── prompt.js         # System prompts
    ├── vision.js         # Vision fallback
    └── reliability.js    # Context scoring
```

---

## 🚀 Installation Steps

### Step 1: Open Chrome Extensions Page

**Option A:** Type in address bar:
```
chrome://extensions/
```

**Option B:** Menu navigation:
```
Chrome Menu (⋮) → Extensions → Manage Extensions
```

**Option C:** Keyboard shortcut (if available):
```
Ctrl+Shift+E (Windows/Linux)
Cmd+Shift+E (Mac)
```

---

### Step 2: Enable Developer Mode

In the top-right corner, toggle **"Developer mode"** ON:

```
┌─────────────────────────────────────┐
│ Extensions                  🔧 ☰    │
│                                      │
│ Developer mode          [ON]  ◄─────┤ Click here!
└─────────────────────────────────────┘
```

After enabling, you'll see three new buttons:
- **Load unpacked**
- **Pack extension**
- **Update**

---

### Step 3: Load the Extension

1. Click **"Load unpacked"** button

2. A file browser opens. Navigate to:
   ```
   /home/user/mvp/extension/
   ```

3. Select the **`extension`** folder (NOT individual files inside it)

4. Click **"Select Folder"** or **"Open"**

---

### Step 4: Verify Installation

You should see:

```
┌─────────────────────────────────────┐
│ 🔵 Navigator: Contextual AI         │
│                                      │
│ ID: abcdef123456...                  │
│ Version: 2.0.4                       │
│ ✓ Enabled                            │
│                                      │
│ Details | Remove | Errors (0)       │
└─────────────────────────────────────┘
```

The Navigator icon should also appear in your Chrome toolbar (top-right):

```
┌─────────────────┐
│ 🌐  🔵  ⋮  👤  │ ← Navigator icon appears here
└─────────────────┘
```

**If the icon is hidden:**
- Click the puzzle piece icon (🧩) in toolbar
- Find "Navigator: Contextual AI"
- Click the pin icon 📌 to keep it visible

---

## 🎮 Using the Extension

### Step 1: Start the Backend Server

**IMPORTANT:** The extension needs the FastAPI server running!

```bash
cd /home/user/mvp/backend/api_server
bash start.sh
```

**Expected output:**
```
✓ Ollama is running
Starting Navigator RAG API...
INFO: Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!** The extension will communicate with this server.

---

### Step 2: Navigate to a Supported Tool

Open any of these sites:
- **GitHub:** https://github.com/your-username/your-repo
- **AWS Console:** https://console.aws.amazon.com
- **Stack Overflow:** https://stackoverflow.com
- **React Docs:** https://react.dev
- **MDN:** https://developer.mozilla.org

Full list: See `/home/user/mvp/backend/api_server/tools_config.json`

---

### Step 3: Open the Side Panel

**Option A:** Click the Navigator icon in toolbar

**Option B:** Right-click on the page → "Navigator: Open Side Panel"

The side panel opens on the right side of your browser:

```
┌─────────────────┬──────────────┐
│                 │ Navigator    │
│                 │              │
│   Web Page      │ 💬 Chat      │
│                 │              │
│   (GitHub       │ Type your    │
│    or other     │ question...  │
│    tool)        │              │
│                 │ [Send]       │
│                 │              │
│                 │ Debug Panel  │
└─────────────────┴──────────────┘
```

---

### Step 4: Wait for Context Extraction

The extension automatically scans the page. Wait 2-5 seconds for:
- ✅ Headings extraction
- ✅ Button/link detection
- ✅ Text content analysis

**To verify context was captured:**
1. Click **"Debug Panel"** button
2. Check that context shows:
   - Context ID
   - Headings found
   - Interactive elements
   - Text length

**Force refresh (if needed):**
- Click **"Force Scan"** button at bottom of side panel

---

### Step 5: Ask Questions

**Generic questions (any page):**
```
"What is Python?"
"Explain REST APIs"
"How do async functions work?"
```
→ Ollama answers using base knowledge

**Tool-specific questions (on supported sites):**

**On GitHub:**
```
"How do I create a pull request?"
"What's the difference between merge and rebase?"
"How do I resolve merge conflicts?"
```

**On AWS:**
```
"How do I create an S3 bucket?"
"What are IAM roles?"
"How do I configure auto-scaling?"
```

**On Stack Overflow:**
```
"What am I looking at on this page?"
"Should I trust this answer?"
"What's the reputation system?"
```

---

### Step 6: Watch the Response Stream

Responses appear **token-by-token** (streaming):

```
To create a pull request...
              ↓
To create a pull request on GitHub...
              ↓
To create a pull request on GitHub, follow these steps:
1. Navigate to...
```

**Markdown formatting works:**
- `**bold**` → **bold**
- `` `code` `` → `code`
- `# Heading` → **Heading**
- Line breaks preserved

---

## 🐛 Troubleshooting

### "Cannot connect to Brain" Error

**Cause:** FastAPI server not running

**Fix:**
```bash
cd /home/user/mvp/backend/api_server
bash start.sh
```

Verify it's running:
```bash
curl http://127.0.0.1:8000
# Should return: {"service":"Navigator RAG API","status":"online"}
```

---

### "Ollama 403 Forbidden" Error

**This is fixed in v2.0.4!** The extension no longer calls Ollama directly.

If you see this, you're using an old version:
1. Remove the extension
2. Reload: `/home/user/mvp/extension/`
3. Verify version shows **2.0.4** in manifest

---

### No Context Captured (Debug Panel Empty)

**Causes:**
- Page loaded before extension
- Dynamic content not yet rendered
- Shadow DOM elements

**Fixes:**
1. Click **"Force Scan"** button
2. Refresh the page (F5)
3. Wait 5 seconds after page load
4. Check browser console for errors (F12)

---

### Side Panel Won't Open

**Fix 1:** Ensure extension is enabled
```
chrome://extensions/ → Verify Navigator is ON
```

**Fix 2:** Check permissions
```
chrome://extensions/ → Navigator → Details
Scroll to "Site access" → Ensure "On all sites" is enabled
```

**Fix 3:** Reload extension
```
chrome://extensions/ → Navigator → Reload icon (🔄)
```

---

### Responses are Generic (No Tool Knowledge)

**Cause:** Knowledge not populated in Convex database

**Current behavior:**
- Tool detection works
- But no knowledge chunks retrieved
- Ollama answers from base model only

**Fix (when you have ScrapeData export):**
```bash
cd /home/user/mvp/backend/convex-backend
node import_to_convex.js
```

**Verify knowledge exists:**
```bash
# In browser, open:
https://abundant-porpoise-181.convex.cloud

# Check tool_knowledge table
# Should show documents for each tool
```

---

## 🔧 Updating the Extension

After making code changes:

### Option 1: Reload Extension
```
chrome://extensions/ → Navigator → Reload icon (🔄)
```

### Option 2: Hard Reset
```
1. Remove extension
2. Load unpacked again
3. Navigate to test page
```

**Note:** Background service worker updates require full reload!

---

## 🧹 Uninstalling/Removing

### Temporary Disable
```
chrome://extensions/ → Navigator → Toggle OFF
```

### Permanent Remove
```
chrome://extensions/ → Navigator → Remove button
```

**Note:** Disabling stops all functionality. Removing deletes all extension data (conversations cleared).

---

## 📊 Monitoring Extension Activity

### View Background Service Worker Logs

1. Go to `chrome://extensions/`
2. Find Navigator extension
3. Click **"service worker"** link (under "Inspect views")
4. Console opens showing:
   - Context updates
   - RAG pipeline logs
   - API requests
   - Errors

### View Content Script Logs

1. Open the page where extension is active (e.g., GitHub)
2. Press **F12** to open DevTools
3. Console shows:
   - DOM scanning events
   - Context extraction
   - Message sending

### View Side Panel Logs

1. Open side panel
2. Right-click anywhere in side panel
3. Select **"Inspect"**
4. Console shows:
   - UI events
   - Token streaming
   - Debug panel updates

---

## 🎯 Testing Checklist

After installation, verify:

- [ ] Extension icon appears in toolbar
- [ ] Can open side panel
- [ ] Debug panel shows context after 2-5 seconds
- [ ] Generic query returns response
- [ ] Tool-specific query returns response
- [ ] Responses stream token-by-token
- [ ] Markdown formatting works
- [ ] Force scan button works
- [ ] Backend server logs show API calls

---

## 🔐 Permissions Explained

The extension requests these permissions (see `manifest.json`):

| Permission | Why? |
|------------|------|
| `sidePanel` | Opens chat interface |
| `storage` | Stores session context |
| `activeTab` | Gets current tab info |
| `scripting` | Injects content script |
| `tabs` | Manages tab context |
| `<all_urls>` | Works on all websites |

**Privacy:** All data stays local. No external tracking. Context sent only to:
- Your local Ollama (port 11434)
- Your FastAPI server (port 8000)
- Your Convex database (if configured)

---

## 📝 File Locations Summary

| What | Where |
|------|-------|
| Extension source | `/home/user/mvp/extension/` |
| FastAPI server | `/home/user/mvp/backend/api_server/` |
| Knowledge schema | `/home/user/mvp/backend/convex-backend/convex/` |
| Tool config | `/home/user/mvp/backend/api_server/tools_config.json` |
| Installation guide | This file |
| Prompt customization | `/home/user/mvp/backend/api_server/PROMPT_CUSTOMIZATION_GUIDE.md` |

---

## 🚀 Quick Reference

**Load extension:**
```
chrome://extensions/ → Developer mode ON → Load unpacked → Select /home/user/mvp/extension/
```

**Start backend:**
```bash
cd /home/user/mvp/backend/api_server && bash start.sh
```

**Test:**
```
1. Open GitHub/AWS/Stack Overflow
2. Click Navigator icon
3. Ask: "How do I [task]?"
```

**Debug:**
```
F12 → Console (content script logs)
chrome://extensions/ → service worker (background logs)
Side panel → Right-click → Inspect (UI logs)
```

---

**Your extension is ready! Happy navigating! 🧭✨**
