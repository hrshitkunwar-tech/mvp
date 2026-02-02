# ⚡ Quick Start - Test Navigator in 5 Minutes

## 1. Start All Services (2 minutes)

```bash
# Terminal 1: Start n8n (if not running)
n8n start

# Terminal 2: Start Vision Service
cd ~/Downloads/Navigator_Ultimate_Blueprint/backend/services
npm run dev

# Terminal 3: Start Ollama (if not running)
ollama serve
```

**Verify all running:**
```bash
curl http://localhost:5678 && echo "✅ n8n"
curl http://localhost:3001/health && echo "✅ Vision Service"
curl http://localhost:11434/api/version && echo "✅ Ollama"
```

---

## 2. Install Chrome Extension (1 minute)

1. Open Chrome: `chrome://extensions/`
2. Enable **"Developer mode"** (top-right toggle)
3. Click **"Load unpacked"**
4. Select folder: `/Users/harshit/Downloads/Navigator_Ultimate_Blueprint/extension`
5. Done! You should see **Navigator v2.0.0**

---

## 3. Test It! (2 minutes)

### Test on GitHub:
1. Go to: https://github.com
2. Click the **Navigator extension icon** (or press `Cmd+Shift+N`)
3. Wait 10-30 seconds (Ollama processing)
4. Check Chrome Console (F12) for logs:
   ```
   [Navigator] Extension clicked
   [Navigator] Tool detected: GitHub
   ```

### Verify Backend:
1. Open: http://localhost:5678/executions
2. See your test execution at the top
3. Click it to view the data flow
4. All nodes should have ✅ green checkmarks

---

## ✅ Success Checklist

- [ ] All 3 services running (n8n, Vision, Ollama)
- [ ] Extension installed in Chrome
- [ ] Clicked extension on a website
- [ ] Saw execution in n8n
- [ ] Processing took 10-60 seconds
- [ ] No errors in console

---

## 🐛 Quick Troubleshooting

**Extension does nothing:**
- Check browser console (F12) for errors
- Verify extension has permissions

**"Connection refused" errors:**
- Make sure all services are running (see step 1)
- Check ports: 5678 (n8n), 3001 (Vision), 11434 (Ollama)

**Taking too long:**
- First request loads Ollama model (slow)
- Subsequent requests faster (~15-20s)
- Consider switching to Gemini for speed

---

## 📚 Full Guide

For detailed testing scenarios and troubleshooting:
**See:** `USER_TESTING_GUIDE.md`

---

**That's it! You're now testing Navigator as a user! 🎉**
