# 🖥️ Setup Local Vision with Ollama + LLaVA

Run vision models completely free on your Mac with **zero API costs**.

---

## Why Ollama?

- ✅ **Completely FREE** - No API keys, no credits, no limits
- ✅ **Fast setup** - 10-15 minutes total
- ✅ **Offline** - Works without internet
- ✅ **Privacy** - Screenshots never leave your machine
- ✅ **Good quality** - LLaVA is surprisingly accurate for UI analysis

---

## 📦 Step 1: Install Ollama (2 minutes)

### On macOS:
```bash
# Option 1: Homebrew (recommended)
brew install ollama

# Option 2: Download installer
# Visit: https://ollama.ai/download
```

### On Linux:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### On Windows:
Download from: https://ollama.ai/download/windows

---

## 🤖 Step 2: Download LLaVA Model (5 minutes)

```bash
# Pull the LLaVA 7B model (~4GB download)
ollama pull llava

# Wait for download to complete...
# Should see: "success" when done
```

**Available LLaVA versions:**
- `llava` - 7B model (4GB, recommended)
- `llava:13b` - 13B model (7.4GB, better quality, slower)
- `llava:34b` - 34B model (19GB, best quality, much slower)

---

## 🚀 Step 3: Start Ollama Server (30 seconds)

```bash
# Start Ollama API server
ollama serve

# Server runs at: http://localhost:11434
# Leave this terminal running
```

**Test it works:**
```bash
# In a new terminal:
curl http://localhost:11434/api/tags

# Should return list of installed models
```

---

## 🧪 Step 4: Test LLaVA with an Image (1 minute)

```bash
# Download a test image
curl -o /tmp/test.jpg https://picsum.photos/800/600

# Test LLaVA
ollama run llava "Describe what you see in this image" < /tmp/test.jpg

# Should return a description of the image
```

---

## 🔧 Step 5: Integrate with Navigator (5 minutes)

I'll create a new Ollama provider for your Vision service:

### Create Ollama Provider File:

```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/services/src
```

I'll create: `vision-service-ollama.ts`

**Key changes needed:**
1. New API endpoint: `http://localhost:11434/api/generate`
2. Different request format (Ollama's API)
3. Image handling (base64 encoding)

### Update .env:

```bash
echo "VISION_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
PORT=3001" > /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/services/.env
```

---

## 📊 Performance Expectations

### On Apple Silicon (M1/M2/M3):
- **Speed**: 5-10 seconds per image
- **Quality**: ⭐⭐⭐⭐ Very good for UI analysis
- **RAM usage**: ~4-6GB

### On Intel Mac:
- **Speed**: 10-20 seconds per image
- **Quality**: Same
- **RAM usage**: ~4-6GB

### Minimum Requirements:
- **RAM**: 8GB (16GB recommended)
- **Disk**: 5GB free space
- **CPU**: Any modern CPU (GPU optional but faster)

---

## 🎯 Ollama API Format

**Request to Ollama:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llava",
  "prompt": "Describe this UI screenshot in detail",
  "images": ["<base64-encoded-image>"],
  "stream": false
}'
```

**Response:**
```json
{
  "model": "llava",
  "created_at": "2024-01-01T00:00:00.000Z",
  "response": "This is a dashboard interface with...",
  "done": true
}
```

---

## 🔄 Integration Code

Here's what I need to add to `vision-service.ts`:

```typescript
// Add to createVisionService function:
case 'ollama':
  return new OllamaVisionService({
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llava',
  });
```

**New class: OllamaVisionService**
- Handles base64 image encoding
- Formats prompts for LLaVA
- Parses Ollama responses
- Falls back to mock data if Ollama is down

---

## ✅ Verification Steps

### 1. Check Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

### 2. Test with a real image:
```bash
# Download test screenshot
curl -o /tmp/github.png https://github.com/favicon.ico

# Convert to base64
IMAGE_BASE64=$(base64 -i /tmp/github.png)

# Test LLaVA
curl http://localhost:11434/api/generate -d "{
  \"model\": \"llava\",
  \"prompt\": \"What is this?\",
  \"images\": [\"$IMAGE_BASE64\"],
  \"stream\": false
}"
```

### 3. Test Navigator workflow:
```bash
cd /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend
node n8n-orchestrator/scripts/test-webhook.js
```

---

## 🆚 Ollama vs Cloud APIs

| Feature | Ollama (Local) | OpenAI GPT-4o | Google Gemini |
|---------|---------------|---------------|---------------|
| **Cost** | FREE | $0.005/img | FREE (limited) |
| **Speed** | 5-20s | 1-2s | 1-2s |
| **Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Privacy** | 100% local | Cloud | Cloud |
| **Offline** | ✅ Yes | ❌ No | ❌ No |
| **Setup** | 15 min | 2 min | 2 min |
| **Limits** | Unlimited | Pay-per-use | 60 RPM |

---

## 🎛️ Advanced: Run Multiple Models

```bash
# Install different vision models
ollama pull llava          # 7B - Fast, good quality
ollama pull llava:13b      # 13B - Better quality, slower
ollama pull bakllava       # Alternative architecture

# List installed models
ollama list

# Switch models in .env
OLLAMA_MODEL=llava:13b
```

---

## 🐛 Troubleshooting

### Ollama not found:
```bash
# Check installation
which ollama

# If not found, reinstall:
brew reinstall ollama
```

### Model not responding:
```bash
# Restart Ollama
pkill ollama
ollama serve &

# Re-pull model
ollama pull llava
```

### Slow performance:
```bash
# Use smaller model
ollama pull llava  # Instead of llava:13b

# Check system resources
top  # Look for ollama process

# Close other apps to free RAM
```

### Port 11434 already in use:
```bash
# Kill existing Ollama
pkill ollama

# Restart
ollama serve
```

---

## 📝 Next Steps

After Ollama is running:

1. **I'll integrate it** into your Vision service
2. **Test the workflow** with real local vision
3. **Compare quality** to mock data
4. **Optimize prompts** for better UI detection

---

## 💡 Quick Start (All Commands)

```bash
# 1. Install Ollama
brew install ollama

# 2. Download LLaVA
ollama pull llava

# 3. Start server (in background)
ollama serve &

# 4. Update .env
echo "VISION_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
PORT=3001" > /Users/harshit/Downloads/Navigator_Ultimate_Blueprint/backend/services/.env

# 5. Tell me you're ready and I'll integrate it!
```

---

**Ready to try Ollama? Let me know and I'll integrate it into your Vision service!**
