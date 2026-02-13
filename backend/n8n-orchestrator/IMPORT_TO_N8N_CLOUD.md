# Import Navigator Workflows to n8n Cloud

## 🚨 Important: Local Services + Cloud n8n

You're using **n8n Cloud** (mindlyft.app.n8n.cloud) but your services are running **locally** (localhost:3001, localhost:3002).

**Problem**: n8n Cloud cannot directly access `localhost` services.

**Solutions**:

### Option A: Use ngrok/cloudflare tunnel (Recommended for Testing)
### Option B: Use local n8n instead of cloud
### Option C: Deploy services to cloud

Let's do **Option A** for quick testing:

---

## 🚀 Quick Setup with ngrok

### Step 1: Install ngrok

```bash
# Install ngrok
brew install ngrok

# Or download from https://ngrok.com/download
```

### Step 2: Create Tunnels for Your Services

Open **3 new terminal windows**:

**Terminal 1: Vision Service Tunnel**
```bash
ngrok http 3001
```

Copy the **Forwarding URL** (e.g., `https://abc123.ngrok.io`)

**Terminal 2: Agent Service Tunnel**
```bash
ngrok http 3002
```

Copy the **Forwarding URL** (e.g., `https://def456.ngrok.io`)

**Terminal 3: Keep your services running**
```bash
# Your services are already running, just keep them running
```

### Step 3: Update Environment Variables

Create a file `ngrok-urls.txt` with your URLs:
```
VISION_SERVICE_URL=https://abc123.ngrok.io
AGENT_SERVICE_URL=https://def456.ngrok.io
```

---

## 📥 Import Workflow to n8n Cloud

### Method 1: Import via File (Easiest)

1. **In your n8n cloud interface**, look at the **top-left corner**
2. Click the **hamburger menu** (three horizontal lines) or your workspace name
3. Select **"Import from File"** or go to **Workflows** → **"Import"**
4. Navigate to:
   ```
   /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/n8n-orchestrator/workflows/navigator-main-simple.json
   ```
5. Click **Open** → **Import**

### Method 2: Copy-Paste JSON

1. In n8n cloud, click **"+"** to create new workflow
2. Click the **"..."** menu (three dots) in top right
3. Select **"Import from Clipboard"**
4. Copy the entire content of `navigator-main-simple.json` and paste
5. Click **Import**

---

## 🔧 Configure the Workflow

### Step 1: Update Service URLs

After importing:

1. Click on the **"Vision Service"** node
2. In the **URL** field, replace `http://localhost:3001` with your ngrok URL:
   ```
   https://YOUR-NGROK-ID.ngrok.io/interpret
   ```
3. Click away to save

### Step 2: Activate the Workflow

1. In the top-right corner, toggle **"Inactive"** → **"Active"**
2. The workflow is now listening for webhooks!

### Step 3: Get Your Webhook URL

1. Click on the **"Screenshot Webhook"** node
2. Copy the **Production Webhook URL**
   - It will be something like: `https://mindlyft.app.n8n.cloud/webhook/navigator-screenshot`

---

## 🧪 Test the Workflow

### From Your Terminal:

```bash
# Replace <YOUR-N8N-WEBHOOK-URL> with the URL you copied
curl -X POST <YOUR-N8N-WEBHOOK-URL> \
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

### Expected Response:

```json
{
  "success": true,
  "message": "Screenshot processed",
  "session_id": "test_001"
}
```

### View Execution in n8n:

1. Click **"Executions"** in the left sidebar
2. See your test execution
3. Click to view the flow and data!

---

## 🎯 Alternative: Use Local n8n Instead

If you want to avoid ngrok and keep everything local:

### Stop n8n Cloud, Start Local n8n:

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend

# Start local n8n
./scripts/start-all.sh

# Or just n8n:
cd n8n-orchestrator
./start-n8n.sh
```

Then:
1. Open **http://localhost:5678** (your local n8n)
2. Import the workflow (file paths work directly)
3. No tunneling needed!

---

## 📋 Quick Reference

### Your Services:
- ✅ Vision Service: `http://localhost:3001`
- ✅ Agent Service: `http://localhost:3002`
- ✅ n8n Cloud: `https://mindlyft.app.n8n.cloud`

### What You Need:
- 🔗 ngrok tunnels to expose local services to cloud n8n
- 📥 Import workflow JSON into n8n cloud
- 🔧 Update URLs in workflow to use ngrok URLs
- ✅ Activate and test!

---

## 🆘 Troubleshooting

### "Connection refused" errors
- Make sure ngrok tunnels are running
- Verify the ngrok URL in the workflow matches the terminal output

### Workflow import fails
- Make sure you're using the `navigator-main-simple.json` file
- Try copy-paste method instead of file import

### Webhook doesn't respond
- Check that workflow is **Active** (toggle in top-right)
- Verify webhook URL is correct
- Check "Executions" tab for errors

---

## ✅ Success Checklist

- [ ] ngrok installed and running for both services
- [ ] ngrok URLs copied
- [ ] Workflow imported into n8n cloud
- [ ] Vision Service URL updated with ngrok URL
- [ ] Workflow activated
- [ ] Webhook URL copied
- [ ] Test curl sent successfully
- [ ] Execution visible in n8n

---

**Next**: Once this works, you can import the other workflows (Intent Inference, Procedure Execution) using the same process!
