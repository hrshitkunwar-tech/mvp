# 🎯 IMPORT WORKFLOW NOW - Visual Guide

## You're at: http://localhost:5678/home/workflows

---

## 👆 What to Click (Step-by-Step)

### 1️⃣ Find the Import Button

Look for one of these (usually top-right area):
- **"+ Add workflow"** button
- **"Import"** button
- **Three dots menu (⋮)** → "Import"
- **Plus icon (+)** → "Import from file"

### 2️⃣ Select Import Method

Click: **"Import from file"** or **"Import from URL"**

Choose: **"Import from file"**

### 3️⃣ Navigate to File

A file picker will open. Navigate to:

```
/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json
```

**Shortcut**:
- Press `Cmd + Shift + G` in the file picker
- Paste the full path above
- Press Enter
- Click on `navigator-main-simple.json`
- Click **"Open"**

### 4️⃣ Workflow Appears

You'll see a canvas with 4 connected nodes:
```
[Screenshot Webhook] → [Vision Service] → [Build UI State] → [Respond to Webhook]
```

### 5️⃣ Save It

Click the **"Save"** button (top-right corner)

### 6️⃣ Activate It

Toggle the switch from **"Inactive"** to **"Active"** (top-right)

It should turn green/blue!

### 7️⃣ Get Webhook URL

1. Click on the first node: **"Screenshot Webhook"**
2. Look in the node panel on the right
3. Find **"Webhook URLs"** section
4. Copy the **Production URL**

It will look like:
```
http://localhost:5678/webhook/navigator-screenshot
```

---

## ✅ You're Done! Now Test:

### Open Terminal and Run:

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend

# Run test
node n8n-orchestrator/scripts/test-webhook.js
```

### Or use curl:

```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "screenshot_url": "https://picsum.photos/1920/1080",
    "viewport": {"width": 1920, "height": 1080, "url": "https://github.com"}
  }'
```

---

## 👀 View Results

1. In n8n, click **"Executions"** (left sidebar)
2. See your execution at the top
3. Click it to view the flow!

You should see:
- ✅ Screenshot Webhook received data
- ✅ Vision Service processed it
- ✅ UI State built
- ✅ Response sent

---

## 🎉 Success Looks Like:

**Terminal output:**
```
✅ Webhook test successful!
Response:
{
  "success": true,
  "message": "Screenshot processed",
  "session_id": "test_001"
}
```

**In n8n Executions:**
- Green checkmarks on all nodes
- Can click each node to see data flow

---

## 🆘 Can't Find Import Button?

### Try These Locations:

**Top-Right Corner:**
- Look for `+` icon
- Look for "Add workflow" button
- Look for `⋮` (three dots) menu

**Top-Left Corner:**
- Menu button (☰ hamburger)
- "Workflows" section

**Main Area:**
- "Create new workflow" button
- "Import" link

---

## 📸 What You're Looking For:

When you click around, you should see:
- **"Import from file"** - THIS IS IT! ← Click this
- **"Import from URL"** - Not this one
- **"Create blank"** - Not this one

---

## ⚡ Quick Access Path:

1. File: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json`
2. Test: `node n8n-orchestrator/scripts/test-webhook.js`
3. View: http://localhost:5678 → Executions

---

**Stuck? Let me know which step and I'll help!** 🚀
