# ✅ Test Navigator in 5 Steps

## ⚡ IMPORTANT: What to Expect

**Current Limitation:** The extension captures screenshots and sends them to the backend for AI analysis, but **the guidance overlay is not yet implemented**. You'll verify the backend is working by checking n8n executions.

**What Works:**
- ✅ Screenshot capture
- ✅ Backend AI processing (vision analysis)
- ✅ Tool detection
- ✅ Workflow execution in n8n

**What's Not Built Yet:**
- ❌ Guidance overlay display in browser
- ❌ Search interface in extension
- ❌ Visual guidance on web page

---

## 🎯 5 Steps to Test

### STEP 1: Load the Extension (30 seconds)

1. Open Chrome
2. Type in address bar: `chrome://extensions/`
3. Toggle **"Developer mode"** ON (top-right corner)
4. Click **"Load unpacked"** button
5. Navigate to: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension`
6. Click **"Select"**

**✅ Success**: You see "Navigator v2.0.0" extension card with no errors

---

### STEP 2: Go to GitHub (10 seconds)

1. Open a new tab
2. Go to: **https://github.com**
3. Make sure the page fully loads

---

### STEP 3: Activate Navigator (1 second)

**Press:** `Command + Shift + N` (Mac) or `Ctrl + Shift + N` (Windows)

**OR** click the Navigator extension icon in your toolbar

**What happens:**
- Nothing visible changes on the page (this is expected!)
- Behind the scenes: Screenshot taken → Sent to backend → AI analyzing

---

### STEP 4: Wait 15-30 Seconds (be patient!)

This is **normal** - Ollama (local AI) is processing your screenshot.

**While waiting, open another tab:**
- Go to: **http://localhost:5678/executions**

---

### STEP 5: Verify It Worked (check n8n)

In the n8n executions page:

1. **Look for a NEW execution** at the top (sorted by date)
2. **Click on it** to open details
3. **Check all 4 nodes have green ✅ checkmarks:**
   - ✅ Screenshot Webhook
   - ✅ Vision Service
   - ✅ Build UI State
   - ✅ Respond to Webhook

4. **Click on "Vision Service" node** to see what it detected:
   - Should show tool name, UI elements, page analysis

**✅ SUCCESS** = All nodes green + Vision Service shows analyzed data

---

## 🔍 What You're Testing

**This test verifies:**
1. Extension captures screenshots ✅
2. Backend receives screenshot ✅
3. AI vision analysis works (Ollama/LLaVA) ✅
4. n8n workflow executes correctly ✅
5. UI state is extracted from screenshot ✅

**This test does NOT show:**
- ❌ Guidance overlay (not implemented yet)
- ❌ Search results (not implemented yet)
- ❌ Visual hints on page (not implemented yet)

---

## 🧪 Quick Test Examples

### Test 1: GitHub Homepage
```
1. Go to: https://github.com
2. Press: Cmd+Shift+N
3. Check: http://localhost:5678/executions
4. Expected: Detects "GitHub" as tool
```

### Test 2: Gmail
```
1. Go to: https://mail.google.com
2. Press: Cmd+Shift+N
3. Check: http://localhost:5678/executions
4. Expected: Detects "Gmail" or "Email"
```

### Test 3: Any Website
```
1. Go to: any website
2. Press: Cmd+Shift+N
3. Check: http://localhost:5678/executions
4. Expected: Shows AI analysis of the page
```

---

## 📊 How to Read n8n Execution Results

Click on the "Vision Service" node to see:

```json
{
  "interpretation": {
    "page_classification": {
      "page_type": "dashboard",        // What kind of page
      "product_area": "github",        // What tool detected
      "confidence": 0.85               // How confident (0-1)
    },
    "ui_elements": [
      {
        "element_id": "btn-new-repo",
        "type": "button",
        "label": "New repository",
        "bounding_box": { "x": 120, "y": 50, "width": 100, "height": 40 }
      }
      // ... more UI elements
    ]
  },
  "processing_time_ms": 15234,         // How long it took
  "model_version": "llava"             // Which AI model used
}
```

---

## ⏱️ Expected Timing

**First Request:** 30-40 seconds (Ollama loads model)
**Subsequent Requests:** 15-25 seconds
**With Gemini:** 2-5 seconds (if you switch providers)

---

## 🐛 Troubleshooting

### Nothing happens when I press Cmd+Shift+N
**Fix:**
- Open Chrome DevTools (F12)
- Look in Console tab for errors
- Try clicking extension icon directly

### No new execution appears in n8n
**Fix:**
```bash
# Check Navigator workflow is ACTIVE:
# 1. Go to: http://localhost:5678/home/workflows
# 2. Find "Navigator Main Orchestrator"
# 3. Make sure toggle shows "Active" not "Inactive"
```

### Execution shows errors (red ❌)
**Fix:**
```bash
# Click the failed node to see error
# Check logs:
tail -f /tmp/vision-service.log
```

### Taking too long (>60 seconds)
**Fix:**
- First request is always slow (loading model)
- Try again - should be faster
- Or switch to Gemini for speed (tomorrow when quota resets)

---

## 💡 What You Should See in Logs

Open Chrome DevTools Console (F12) and look for:

```
[Navigator] Extension clicked, activating guidance...
[Navigator] Tool detected: GitHub
```

If you see errors, that's okay - the backend might still work. Check n8n executions.

---

## 🎯 Success Criteria

**✅ Your test is successful if:**

1. Extension loads without errors
2. Pressing Cmd+Shift+N captures screenshot
3. New execution appears in n8n within 30 seconds
4. All 4 nodes show green checkmarks
5. Vision Service node shows analyzed data

**You can ignore:**
- No visible guidance on the web page (not implemented yet)
- No search interface (not implemented yet)
- No overlay popup (not implemented yet)

---

## 📝 Quick Reference

**Extension Keyboard Shortcut:** `Cmd+Shift+N` (Mac) or `Ctrl+Shift+N` (Windows)

**Check Executions:** http://localhost:5678/executions

**Check Workflows:** http://localhost:5678/home/workflows

**Check Vision Health:** http://localhost:3001/health

**Extension Folder:** `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension`

---

## 🚀 After Testing

Once you verify the backend works:

1. **Test on different websites** (GitHub, Gmail, Figma, etc.)
2. **Note accuracy** - Does it correctly identify tools?
3. **Check UI element detection** - Are buttons/inputs found?
4. **Document bugs** - What doesn't work as expected?

---

**Ready to test? Start with STEP 1! ⚡**

Remember: You're testing the **backend intelligence**, not the UI overlay (which isn't built yet).
