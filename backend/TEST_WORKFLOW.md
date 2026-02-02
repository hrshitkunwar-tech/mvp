# 🚀 Import Workflow to n8n - Quick Guide

## Your n8n is running at: http://localhost:5678/home/workflows

---

## ✅ Step-by-Step Import (2 minutes)

### Step 1: Import the Workflow

1. **In your browser** (already open at http://localhost:5678/home/workflows)
2. Look for a **"+ Add workflow"** button or **menu icon** (top right or top left)
3. Click it and select **"Import from file"** or **"Import"**
4. Navigate to this file:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json
   ```
5. Click **Open** → The workflow will appear in your canvas

### Step 2: Save the Workflow

1. Click **"Save"** button (top right)
2. The workflow is now saved!

### Step 3: Activate the Workflow

1. Find the **"Inactive"** toggle (top right corner)
2. Click it to turn it **"Active"**
3. The workflow is now listening for events!

### Step 4: Get the Webhook URL

1. Click on the **"Screenshot Webhook"** node (first node in the workflow)
2. You'll see a **"Webhook URL"** field
3. Copy the **Production URL** - it will look like:
   ```
   http://localhost:5678/webhook/navigator-screenshot
   ```

---

## 🧪 Test It!

### Option 1: Quick Test (Copy-Paste)

Open a new terminal and run:

```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "timestamp": 1706140800000,
    "screenshot_url": "https://picsum.photos/1920/1080",
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

### Option 2: Use the Test Script

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
node n8n-orchestrator/scripts/test-webhook.js
```

---

## 📊 View Results

1. In n8n, click **"Executions"** in the left sidebar
2. You should see your test execution
3. Click on it to see the full flow with data!

---

## 🎯 What the Workflow Does

```
Screenshot Webhook (receives event)
       ↓
Vision Service (analyzes screenshot at localhost:3001)
       ↓
Build UI State (structures the data)
       ↓
Respond to Webhook (confirms receipt)
```

---

## ✅ Success Checklist

- [ ] Workflow imported
- [ ] Workflow saved
- [ ] Workflow activated (toggle to "Active")
- [ ] Webhook URL copied
- [ ] Test curl sent
- [ ] Execution visible in n8n
- [ ] Can see vision service response in execution

---

## 🆘 Troubleshooting

### Can't find "Import" button
- Look for **"+"** icon in top navigation
- Or **three dots menu** (⋮) and select "Import"
- Or **"Workflows"** menu → "Import"

### Import fails
- Make sure you selected the `.json` file
- The file is at: `backend/n8n-orchestrator/workflows/navigator-main-simple.json`

### Test returns error
- Make sure workflow is **Active** (toggle switch)
- Check Vision service is running: `curl http://localhost:3001/health`
- Check webhook URL matches what you copied

### No execution shows up
- Click "Executions" in left sidebar
- Refresh the page
- Check workflow is Active

---

## 🎉 Next Steps After Success

Once this workflow works:

1. **Import the other workflows**:
   - `intent-inference-workflow.json`
   - `procedure-execution-workflow.json`

2. **Connect to Convex**:
   - Get your Convex URL: `cd convex && npx convex dev`
   - Add as environment variable in n8n

3. **Build your first procedure**:
   - Use the example in `examples/example-procedure.json`
   - Upload to Convex
   - Test end-to-end flow

---

**Need help?** Just let me know which step you're on and I'll guide you!
