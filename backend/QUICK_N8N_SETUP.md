# 🚀 Quick n8n Setup for Navigator

## You Have 2 Options:

### Option A: Use n8n Cloud (What you're doing now)
**Pros**: Already set up, accessible anywhere
**Cons**: Need ngrok tunnels to connect to local services

### Option B: Use Local n8n
**Pros**: No tunnels needed, everything local
**Cons**: Only accessible on your machine

---

## 🎯 OPTION A: n8n Cloud Setup (5 Minutes)

### Step 1: Expose Services with ngrok

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
./scripts/setup-ngrok.sh
```

This will open 2 terminal windows showing ngrok URLs like:
```
Vision Service:  https://abc123.ngrok-free.app
Agent Service:   https://def456.ngrok-free.app
```

**Copy both URLs!**

### Step 2: Import Workflow to n8n Cloud

In your browser (https://mindlyft.app.n8n.cloud):

1. Click the **hamburger menu** (☰) in top-left
2. Select **"Import from File"**
3. Choose this file:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json
   ```
4. Click **Import**

### Step 3: Update URLs in Workflow

1. Click on the **"Vision Service"** node
2. Change URL from:
   ```
   http://localhost:3001/interpret
   ```
   To your ngrok URL:
   ```
   https://YOUR-NGROK-ID.ngrok-free.app/interpret
   ```
3. Click outside to save

### Step 4: Activate Workflow

1. Click the **"Inactive"** toggle in top-right
2. It should turn to **"Active"**
3. Click on **"Screenshot Webhook"** node
4. Copy the **Webhook URL** (e.g., `https://mindlyft.app.n8n.cloud/webhook/navigator-screenshot`)

### Step 5: Test It!

```bash
# Replace <WEBHOOK-URL> with your copied URL
curl -X POST <WEBHOOK-URL> \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "timestamp": 1706140800000,
    "screenshot_url": "https://picsum.photos/1920/1080",
    "viewport": {
      "width": 1920,
      "height": 1080,
      "url": "https://github.com"
    }
  }'
```

### Step 6: View Results

1. In n8n, click **"Executions"** (left sidebar)
2. See your execution
3. Click to view the flow! 🎉

---

## 🏠 OPTION B: Local n8n Setup (3 Minutes)

### Step 1: Start Everything Locally

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
./scripts/start-all.sh
```

### Step 2: Open Local n8n

Open your browser to: **http://localhost:5678**

### Step 3: Create Account (First Time Only)

- Email: your-email@example.com
- Password: (choose a password)
- Name: Your Name

### Step 4: Import Workflow

1. Click **"Import from File"**
2. Select:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json
   ```
3. Click **Import**

**No URL changes needed!** It already uses `localhost:3001` and `localhost:3002`

### Step 5: Activate & Test

1. Toggle **"Inactive"** → **"Active"**
2. Copy webhook URL (will be `http://localhost:5678/webhook/...`)
3. Test:

```bash
curl -X POST http://localhost:5678/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test_001",
    "screenshot_url": "https://picsum.photos/1920/1080",
    "viewport": {"width": 1920, "height": 1080, "url": "https://github.com"}
  }'
```

4. View execution in n8n! 🎉

---

## 📊 Comparison

| Feature | n8n Cloud | Local n8n |
|---------|-----------|-----------|
| **Setup** | Already done | Need to create account |
| **Access** | Anywhere | Only local machine |
| **Service Connection** | Needs ngrok | Direct connection |
| **Cost** | Free tier | Free, self-hosted |
| **Best For** | Production, team access | Development, testing |

---

## 🎯 My Recommendation

**For right now**: Use **Local n8n (Option B)**
- Faster to test
- No tunneling complexity
- Everything in one place

**For later**: Move to **n8n Cloud (Option A)**
- When you deploy services to cloud
- When you want team access
- For production use

---

## 🆘 Quick Troubleshooting

### n8n Cloud can't reach services
→ Make sure ngrok tunnels are running
→ Check you updated the URLs in the workflow

### Local n8n won't start
→ Check port 5678 is free: `lsof -ti:5678`
→ Kill if needed: `lsof -ti:5678 | xargs kill`
→ Run `./scripts/start-all.sh` again

### Workflow import fails
→ Make sure you're selecting the `.json` file
→ Try copy-paste method instead

### Test curl returns error
→ Check workflow is **Active** (toggle in top-right)
→ Verify services are running: `./scripts/test-services.sh`

---

## ✅ Quick Decision

**Choose one:**

**A) Use n8n Cloud** → Run `./scripts/setup-ngrok.sh` now

**B) Use Local n8n** → Run `./scripts/start-all.sh` now

Then follow the steps above! 🚀

---

## 📞 What to Do Next

After you decide and set up:
1. Import the workflow
2. Test it with curl
3. View execution in n8n
4. ✅ You're ready to build!

The other 2 workflows (Intent Inference, Procedure Execution) can be imported the same way once this works.
