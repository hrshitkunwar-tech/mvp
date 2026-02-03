# Navigator Extension Debugging Guide

## How to Check If It's Working

### 1. Open Chrome DevTools for the Extension
- Go to `chrome://extensions/`
- Find "Navigator: Contextual AI"
- Click "Details" → "Inspect views" → "service worker"
- This opens the Background Service Worker console

### 2. Check the Console Logs

**In the Service Worker console, you should see:**
```
[Background] Received message: CONTEXT_UPDATED from tab: 123
[Background] Stored context for tab 123 - blocks: 5
```

**If you DON'T see these messages:**
- The content-script isn't running on the page
- Check that the page loaded AFTER the extension was installed
- Try refreshing the page

### 3. Open the Side Panel
- Click the extension icon (puzzle piece)
- The side panel should say "● Linked to [Page Title]"
- If it says "✕ No active tab", there's a tab detection issue

### 4. Open DevTools for the Side Panel
- Right-click in the side panel
- Click "Inspect"
- Look for messages like:
  ```
  [SidePanel] Initialized with tab ID: 123 title: Example Page
  [SidePanel] Refreshing debug for tab: 123
  [SidePanel] Debug response: {context: {...}}
  ```

### 5. Click Debug Button (🐞)
- Look for console logs showing the debug data being fetched
- If the Context ID is still "-", the background worker hasn't received page context

## Common Issues & Solutions

### Issue: "Waiting for page context... Try asking again."
**Cause:** Content-script hasn't sent context yet
**Solution:**
1. Check the Service Worker console for CONTEXT_UPDATED messages
2. If none appear, try refreshing the page
3. Check that you're on a regular website (not chrome://, extension://, etc.)

### Issue: Context ID shows "-" in debug panel
**Cause:** Background worker has no stored context for this tab
**Solution:**
1. Open the Service Worker console
2. Refresh the page you're asking about
3. You should see `[Background] Stored context for tab X - blocks: Y`
4. If blocks: 0, the page has no readable content

### Issue: "Ollama unavailable (HTTP 404)"
**Cause:** Ollama server isn't running on localhost:11434
**Solution:**
1. Install Ollama: https://ollama.ai
2. Run: `ollama serve`
3. In another terminal, run: `ollama pull llama3.2`
4. Keep the `ollama serve` running while using the extension

### Issue: Chrome DevTools shows warnings about content-script
**Check:**
- Make sure the page is fully loaded before opening the side panel
- Try refreshing the page after the extension loads
- Check that manifest.json includes `"content_scripts"` configuration

## Message Flow Diagram

```
1. Page loads
   ↓
2. Content-script injects (checks manifest.json "content_scripts")
   ↓
3. ContentAgent scans DOM
   ↓
4. Sends "CONTEXT_UPDATED" message to background
   ↓
5. Background stores in TAB_CONTEXTS[tabId]
   ↓
6. Side panel asks background for context
   ↓
7. Background returns stored context
   ↓
8. Side panel displays it & user can ask questions
```

## Checking Console Output

**Content-Script Console** (page you're visiting):
- Right-click → Inspect → Console tab
- Filter by "Navigator"
- Should see: `[Navigator] Content Script Loaded`
- Then: `[Navigator] Context sent (INIT): 5 blocks`

**Service Worker Console** (chrome://extensions → Details → Inspect views):
- Should mirror the content-script messages
- Shows what contexts are stored
- Shows when side panel requests debug info

**Side Panel Console** (right-click in panel → Inspect → Console):
- Shows `[SidePanel] Initialized with tab ID: 123`
- Shows `[SidePanel] Debug response:` when you click debug button
- Shows connection errors if any

## Extension Architecture

```
content-script.js (runs in page context)
    ↓ chrome.runtime.sendMessage()
    ↓
background.js (service worker)
    ↓ chrome.runtime.sendMessage() back
    ↓
sidepanel.js (runs in panel context)
```

Each context has its own console. Check all three for full visibility.
