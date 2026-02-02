# n8n Workflow Fix & Vision Proxy Implementation

## Problem Fixed
The n8n workflow was failing with: **"Missing required fields: screenshot_url and viewport"**

### Root Cause
The HTTP Request nodes in n8n were using the wrong configuration:
- Using `bodyParameters` with `parameters` array (query string format)
- Should use `body` with JSON format
- Vision service expected JSON POST body, not query strings

## Solution Implemented

### 1. **N8N Workflow Fixed** (`backend/n8n-workflows/main-orchestrator.json`)
- ✅ Updated "Vision Interpretation" HTTP node: use `contentType: application/json` and `body` with proper JSON structure
- ✅ Updated "Store UI State" HTTP node: same fix
- ✅ Updated webhook node: corrected `webhookId` and `webhookPath`
- ✅ Added "Send Response" node to return immediate feedback (status 200 with queued message)
- ✅ Fixed connections to route through response node

### 2. **Vision Proxy Server** (`backend/vision_proxy.py`)
Created a lightweight Python proxy server to work around n8n workflow issues:
- Listens on `http://localhost:5680`
- Forwards screenshot requests to Vision service (`http://localhost:3001/interpret`)
- Returns Vision results directly to extension
- No external dependencies (uses only stdlib)

### 3. **Extension Updated** (`extension/popup.js`)
- Changed webhook URL from `http://localhost:5678/webhook/navigator-screenshot` 
- To: `http://localhost:5680/webhook/navigator-screenshot`
- Extension now posts directly to Vision Proxy (bypasses n8n temporarily)

## Architecture (Current)

```
Extension (popup.js)
    ↓ POST screenshot + query
    ↓
Vision Proxy (port 5680)
    ↓ Validates & forwards
    ↓
Vision Service (port 3001)
    ↓ Processes screenshot
    ↓
Vision Proxy returns result
    ↓
Extension displays guidance
```

## Testing

### Check Vision Proxy is Running
```bash
curl http://localhost:5680/health
```

Should return:
```json
{"status": "healthy", "service": "vision-proxy", "vision_url": "http://localhost:3001"}
```

### Test Webhook
```bash
curl -X POST http://localhost:5680/webhook/navigator-screenshot \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test",
    "timestamp": 1234567890000,
    "screenshot_url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABA",
    "viewport": {"width": 1920, "height": 1080, "url": "https://github.com"},
    "query": "create a repository"
  }'
```

## What to Do Next

### 1. **Reload Extension** (chrome://extensions)
   - Click Reload on Navigator extension
   - Open any website
   - Click "Get Guidance"
   - Should see real guidance instead of "Processing"

### 2. **Keep Vision Proxy Running**
```bash
# Run in terminal or background
python3 /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/vision_proxy.py
```

### 3. **Long-term: Fix n8n Workflow**
Once the n8n workflow JSON is properly corrected and reloaded in n8n UI, we can:
- Remove the Vision Proxy
- Use n8n directly as orchestrator
- Route guidance back through n8n to extension

## Files Changed

1. `backend/n8n-workflows/main-orchestrator.json` — Fixed HTTP node configs and added response node
2. `backend/vision_proxy.py` — NEW: lightweight Python webhook proxy
3. `extension/popup.js` — Updated webhook URL to use Vision Proxy
4. `backend/test_n8n_fix.py` — NEW: test script
5. `backend/import_workflow.py` — NEW: workflow import utility

## Error Handling

Vision Proxy returns proper HTTP codes:
- `200` — Guidance generated successfully
- `400` — Missing required fields
- `502` — Vision service error
- `504` — Vision service timeout

Extension will display errors gracefully.

