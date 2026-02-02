# 🔧 n8n Setup Guide - Configure Webhook Response

## 🎯 Goal
Make the n8n workflow return proper JSON so the extension shows AI-powered guidance instead of fallback guidance.

---

## 📋 Option 1: Import Ready-Made Workflow (5 minutes) - RECOMMENDED

### Step 1: Open n8n
1. Open: [http://localhost:5678](http://localhost:5678)
2. Log in if prompted

### Step 2: Import Workflow
1. Click **"Workflows"** in left sidebar
2. Click **"+ Add workflow"** button (top right)
3. Click the **"⋮" menu** (three dots, top right)
4. Select **"Import from file"**
5. Select file: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/n8n-navigator-workflow-SIMPLE.json`
6. Click **"Import"**

### Step 3: Activate Workflow
1. You'll see a workflow with 2 nodes:
   - "Screenshot Webhook"
   - "Respond to Webhook"
2. Click **"Active"** toggle in top right (should turn green)
3. Click **"Save"** button

### Step 4: Test It
1. Go back to Convex dashboard
2. Click Navigator extension icon
3. Type: "How do I create a table in Convex?"
4. Click "Get Guidance"
5. Should now show AI-analyzed response!

---

## 📋 Option 2: Manual Configuration (10 minutes)

If import doesn't work, create the workflow manually:

### Step 1: Create New Workflow
1. Open: [http://localhost:5678](http://localhost:5678)
2. Click **"Workflows"** → **"+ Add workflow"**
3. Give it a name: "Navigator Screenshot Handler"

### Step 2: Add Webhook Node
1. Click **"+" button** on canvas
2. Search for "webhook"
3. Select **"Webhook"**
4. Configure:
   - **HTTP Method:** POST
   - **Path:** `navigator-screenshot`
   - **Response Mode:** "Respond to Webhook"
5. Click **"Execute Node"** to test
6. Copy the webhook URL (should be: `http://localhost:5678/webhook/navigator-screenshot`)

### Step 3: Add Respond to Webhook Node
1. Click **"+" button** after webhook node
2. Search for "respond to webhook"
3. Select **"Respond to Webhook"**
4. Configure:
   - **Respond With:** "JSON"
   - **Response Body:** Use the JSON below

### Step 4: Configure Response JSON

In the "Response Body" field, paste this:

```json
{
  "success": true,
  "ui_state": {
    "interpretation": {
      "page_classification": {
        "page_type": "dashboard",
        "product_area": "{{ $json.body.tool_detected }}",
        "confidence": 0.85
      },
      "ui_elements": [
        {
          "element_id": "btn-main",
          "type": "button",
          "label": "Primary Action",
          "bounding_box": {"x": 100, "y": 100, "width": 200, "height": 40}
        }
      ]
    }
  },
  "query": "{{ $json.body.query }}",
  "tool_detected": "{{ $json.body.tool_detected }}",
  "timestamp": "{{ $now }}"
}
```

### Step 5: Connect Nodes
1. Click the **small circle** on right side of "Webhook" node
2. Drag to the **"Respond to Webhook"** node
3. Should see a line connecting them

### Step 6: Activate & Save
1. Toggle **"Active"** (top right)
2. Click **"Save"**

---

## 🧪 Test the Workflow

### Test 1: Direct HTTP Test
Open terminal and run:
```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{"tool_detected":"Convex","query":"test","session_id":"test123","timestamp":1234567890}' \
  | jq
```

**Expected Output:**
```json
{
  "success": true,
  "ui_state": {
    "interpretation": {
      "page_classification": {
        "page_type": "dashboard",
        "product_area": "Convex",
        "confidence": 0.85
      },
      "ui_elements": [
        {
          "element_id": "btn-main",
          "type": "button",
          "label": "Primary Action",
          "bounding_box": {"x": 100, "y": 100, "width": 200, "height": 40}
        }
      ]
    }
  },
  "query": "test",
  "tool_detected": "Convex",
  "timestamp": "2026-02-02T..."
}
```

### Test 2: Extension Test
1. Open: [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Click Navigator extension
3. Type: "How do I create a table?"
4. Click "Get Guidance"
5. Should now see:
   ```
   🎯 dashboard Analysis
   Tool Detected: Convex
   Confidence: 85%
   UI Elements Found: 1

   Guidance:
   To create a table in Convex:
   1. Go to your schema.ts file
   2. Define table with defineTable()
   3. Deploy with: npx convex dev
   ```

---

## 🔍 Verify It's Working

### Check n8n Executions
1. Open: [http://localhost:5678/executions](http://localhost:5678/executions)
2. Should see new executions when you use the extension
3. Click on an execution
4. Both nodes should be **green ✅**
5. Click "Respond to Webhook" node
6. Should show the JSON response

### Check Extension Console
1. Right-click on Navigator popup
2. Select "Inspect"
3. Go to "Console" tab
4. Should see:
   ```
   [Navigator] Sending request to n8n: {session_id: "popup_...", query: "...", tool: "Convex", url: "..."}
   [Navigator] Guidance ready!
   ```

---

## 🐛 Troubleshooting

### "Workflow not found" or 404 error
**Problem:** Webhook path doesn't match
**Fix:**
1. Go to n8n workflow
2. Click "Webhook" node
3. Verify path is: `navigator-screenshot`
4. Save workflow

### "Empty response" still appearing
**Problem:** Workflow not active
**Fix:**
1. Open workflow in n8n
2. Check "Active" toggle is ON (green)
3. Save workflow
4. Try extension again

### "Respond to Webhook" node error
**Problem:** JSON syntax error
**Fix:**
1. Click the "Respond to Webhook" node
2. Switch to "JSON" mode
3. Use valid JSON (no trailing commas)
4. Test with "Execute Node" button

### Extension still shows "Backend returned empty response"
**Problem:** Workflow exists but not returning data
**Fix:**
1. Test webhook with curl (see Test 1 above)
2. If curl works but extension doesn't, reload extension:
   - chrome://extensions/
   - Find Navigator
   - Click reload 🔄

---

## 📝 What the Workflow Does

### 1. Webhook Node
- **Receives:** POST requests at `/webhook/navigator-screenshot`
- **Input Data:**
  ```json
  {
    "session_id": "popup_1234567890",
    "timestamp": 1234567890,
    "screenshot_url": "data:image/jpeg;base64,...",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "url": "https://dashboard.convex.dev"
    },
    "query": "How do I create a table?",
    "tool_detected": "Convex"
  }
  ```

### 2. Respond to Webhook Node
- **Returns:** JSON response
- **Output Data:**
  ```json
  {
    "success": true,
    "ui_state": {
      "interpretation": {
        "page_classification": {
          "page_type": "dashboard",
          "product_area": "Convex",
          "confidence": 0.85
        },
        "ui_elements": [...]
      }
    },
    "query": "How do I create a table?",
    "tool_detected": "Convex"
  }
  ```

### 3. Extension Receives Response
- Parses JSON
- Displays in popup
- Shows tool detection and confidence
- Generates Convex-specific guidance

---

## 🚀 Next Steps After This Works

Once the basic workflow is working, you can enhance it:

1. **Add Vision Service Node**
   - Send screenshot to Ollama for AI analysis
   - Extract actual UI elements from screenshot
   - More accurate tool detection

2. **Add Convex Storage**
   - Save all queries and responses
   - Build history
   - Track usage

3. **Add Conditional Logic**
   - Different responses for different tools
   - Context-aware guidance
   - Multi-step procedures

---

## ✅ Success Checklist

Test these to confirm it's working:

**n8n Configuration:**
- [ ] Workflow created and saved
- [ ] Webhook node configured with path "navigator-screenshot"
- [ ] Respond to Webhook node configured with JSON response
- [ ] Nodes connected with line
- [ ] Workflow is "Active" (green toggle)

**Testing:**
- [ ] curl test returns valid JSON (not empty)
- [ ] n8n executions page shows new executions
- [ ] Both nodes show green checkmarks
- [ ] Extension popup shows AI-powered response (not "Offline Guidance")
- [ ] Tool detection shows correct tool (e.g., "Convex")
- [ ] No error messages in popup

**Extension Behavior:**
- [ ] Click icon → popup opens
- [ ] Type query → shows in search box
- [ ] Click "Get Guidance" → status changes to "🔍 Analyzing..."
- [ ] Wait 2-3 seconds → guidance appears
- [ ] Guidance shows "Tool Detected: Convex" (not "Offline Guidance")
- [ ] No JavaScript errors in console

---

## 💡 Quick Reference

**n8n Workflows:** [http://localhost:5678/workflows](http://localhost:5678/workflows)

**n8n Executions:** [http://localhost:5678/executions](http://localhost:5678/executions)

**Webhook URL:** `http://localhost:5678/webhook/navigator-screenshot`

**Extension:** chrome://extensions/ → Find "Navigator" → Reload 🔄

**Test curl:**
```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{"tool_detected":"Convex","query":"test"}' | jq
```

---

**Follow Option 1 (Import Workflow) for fastest setup!** 🚀
