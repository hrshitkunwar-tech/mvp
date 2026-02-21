# 📋 Manual Testing Guide

This guide helps you test the visual overlay system in a real browser.

**What I tested:** API responses (JSON with ACTION directives)
**What YOU need to test:** Actual visual overlays in Chrome

---

## ⚙️ Setup (5 minutes)

### 1. Start the Backend API
```bash
cd /home/user/mvp/backend/api_server
./start.sh status  # should show "✓ Running"
```

If not running:
```bash
./start.sh restart
```

### 2. Load Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer mode** (toggle in top-right)
4. Click **Load unpacked**
5. Select `/home/user/mvp/extension/`
6. Pin the Navigator extension icon to toolbar

### 3. Verify Extension Loaded

1. Click Navigator icon → should show side panel
2. Open DevTools (F12) → Console tab
3. Refresh page → should see:
   ```
   [Navigator] All ZoneGuide scripts injected
   [Navigator] ✅ ZoneGuide fully initialized and ready
   ```

---

## 🧪 Test Plan (30-45 minutes)

Test each platform systematically. Check both:
- ✅ Visual overlay appears (pink highlight)
- ✅ Element scrolls into view
- ✅ Tooltip/toast notifications (if any fail)

---

## 📦 GitHub Tests (15 minutes)

### Setup:
1. Go to any GitHub repo (e.g., `github.com/microsoft/vscode`)
2. Open Navigator sidepanel

### Test Cases:

| # | Query | Expected Behavior |
|---|-------|-------------------|
| 1 | "how to create PR?" | Highlights "Pull requests" tab |
| 2 | "view pull requests" | Highlights "Pull requests" tab |
| 3 | "create issue" | Highlights "Issues" tab |
| 4 | "view issues" | Highlights "Issues" tab |
| 5 | "fork repo" | Highlights "Fork" button (top-right) |
| 6 | "star repo" | Highlights "Star" button (top-right) |
| 7 | "clone repo" | Highlights green "Code" button |
| 8 | "watch repo" | Highlights "Watch" button (top-right) |
| 9 | "view actions" | Highlights "Actions" tab |
| 10 | "view commits" | Highlights commit count link |
| 11 | "view branches" | Highlights branch selector dropdown |
| 12 | "view releases" | Highlights "Releases" link (right sidebar) |
| 13 | "view settings" | Highlights "Settings" tab ⚠️ (requires write access) |
| 14 | "view security" | Highlights "Security" tab |
| 15 | "view insights" | Highlights "Insights" tab |
| 16 | "view discussions" | Highlights "Discussions" tab (if enabled) |
| 17 | "view wiki" | Highlights "Wiki" tab (if enabled) |
| 18 | "view projects" | Highlights "Projects" tab |

### What to Check:
- [ ] Pink outline appears on correct element
- [ ] Element scrolls into view smoothly
- [ ] Pulse animation (3 pulses)
- [ ] Highlight disappears after ~2.5 seconds
- [ ] If fails: Toast notification appears

---

## 📋 Linear Tests (10 minutes)

### Setup:
1. Go to Linear workspace (e.g., `linear.app/team/issues`)
2. Log in if needed
3. Open Navigator sidepanel

### Test Cases:

| # | Query | Expected Behavior |
|---|-------|-------------------|
| 1 | "create issue" | Highlights "New issue" button |
| 2 | "view board" | Highlights "Board" view selector |
| 3 | "view backlog" | Highlights "Backlog" link |
| 4 | "view roadmap" | Highlights "Roadmap" link |
| 5 | "view cycles" | Highlights "Cycles" link |
| 6 | "view projects" | Highlights "Projects" link |
| 7 | "my issues" | Highlights "My Issues" link |
| 8 | "add task" | Highlights "New issue" button |

### What to Check:
- [ ] Element highlights correctly
- [ ] Sidebar navigation items are visible
- [ ] Fallback CSS works if ZoneGuide fails

---

## 🎨 Figma Tests (10 minutes)

### Setup:
1. Go to Figma (e.g., `figma.com/files`)
2. Log in if needed
3. Open Navigator sidepanel

### Test Cases:

| # | Query | Expected Behavior |
|---|-------|-------------------|
| 1 | "open file" | Highlights "Files" link (top-left) |
| 2 | "view comments" | Highlights comment button (speech bubble) |
| 3 | "share file" | Highlights "Share" button (top-right) |
| 4 | "view prototype" | Highlights "Present" button (top-right) |

### What to Check:
- [ ] Toolbar buttons highlight correctly
- [ ] Top-right area elements are accessible
- [ ] Icons vs. text buttons both work

---

## 📊 New Relic Tests (5 minutes)

### Setup:
1. Go to New Relic (e.g., `one.newrelic.com`)
2. Log in if needed
3. Open Navigator sidepanel

### Test Cases:

| # | Query | Expected Behavior |
|---|-------|-------------------|
| 1 | "view metrics" | Highlights "All Entities" nav link |
| 2 | "open dashboard" | Highlights "Dashboards" nav link |
| 3 | "view alerts" | Highlights "Alerts" nav link |
| 4 | "view logs" | Highlights "Logs" nav link |

### What to Check:
- [ ] Left sidebar navigation highlights
- [ ] Dark theme doesn't obscure pink highlight
- [ ] Scroll works if nav is below fold

---

## 🔍 Fallback Testing (CRITICAL)

Test what happens when things fail:

### 1. Slow Page Load
1. Go to GitHub
2. Open DevTools → Network tab → Set throttling to "Slow 3G"
3. Refresh page
4. Immediately ask: "create PR"
5. **Expected:** Retries (1, 2, 3), then direct CSS fallback

### 2. ZoneGuide Blocked
1. Open DevTools → Console
2. Type: `window.__ZONEGUIDE_INJECTED__ = false`
3. Ask: "view issues"
4. **Expected:** Direct CSS fallback after 3 PING timeouts

### 3. Element Not Found
1. Go to GitHub repo with no Discussions tab
2. Ask: "view discussions"
3. **Expected:** Toast notification "⚠️ Could not highlight element"

---

## 📊 Analytics Verification

After testing, check analytics data:

1. Right-click extension icon → Options
2. Go to **Analytics** tab
3. Check:
   - [ ] Total attempts > 0
   - [ ] Successful overlays > 0
   - [ ] Fallback count (should be low)
   - [ ] Failed count (should be minimal)
   - [ ] Recent activity log shows queries

---

## ❌ Common Issues & Fixes

### Issue: No highlight appears

**Possible causes:**
1. ZoneGuide not loaded → Check console for errors
2. Selector changed → GitHub/Linear updated their DOM
3. Element not visible → Scroll or navigate first

**Fix:**
- Reload extension
- Check console logs
- Report selector to update

### Issue: "Extension context invalidated"

**Cause:** Extension reloaded while page was open

**Fix:**
1. Close all tabs
2. Reload extension in `chrome://extensions`
3. Reopen tabs

### Issue: Toast notifications don't appear

**Cause:** sidepanel.js not loaded or CSS missing

**Fix:**
- Check if sidepanel is open
- Inspect sidepanel (right-click → Inspect)
- Check for CSS errors

---

## 📝 Test Results Template

Copy this and fill it out:

```markdown
## Test Results

**Date:** [DATE]
**Chrome Version:** [VERSION]
**Extension Version:** 2.1.0

### GitHub (25 tests)
- ✅ Passed: __/25
- ❌ Failed: __/25
- Notes:

### Linear (12 tests)
- ✅ Passed: __/12
- ❌ Failed: __/12
- Notes:

### Figma (8 tests)
- ✅ Passed: __/8
- ❌ Failed: __/8
- Notes:

### New Relic (5 tests)
- ✅ Passed: __/5
- ❌ Failed: __/5
- Notes:

### Fallback Testing
- ✅ Retry logic works: YES/NO
- ✅ Direct CSS works: YES/NO
- ✅ Toast notifications: YES/NO
- ✅ Analytics tracked: YES/NO

### Overall Rating
- Success Rate: __%
- Visual Quality: [1-10]
- User Experience: [1-10]

### Issues Found
1.
2.
3.

### Recommendations
1.
2.
3.
```

---

## 🎯 Success Criteria

For the extension to be considered "working":

- [ ] ≥90% of queries show visual highlight
- [ ] Fallback system activates when needed
- [ ] Toast notifications appear on failures
- [ ] No console errors (except expected warnings)
- [ ] Analytics data is tracked correctly

---

## 📞 Reporting Issues

When you find issues, report with:

1. **Query used:** "view issues"
2. **Platform:** GitHub, Linear, etc.
3. **Expected:** Highlights "Issues" tab
4. **Actual:** No highlight / wrong element / error
5. **Console logs:** (copy relevant lines)
6. **Screenshot:** (if possible)

---

## ⏱️ Estimated Time

| Task | Time |
|------|------|
| Setup | 5 min |
| GitHub tests | 15 min |
| Linear tests | 10 min |
| Figma tests | 10 min |
| New Relic tests | 5 min |
| Fallback testing | 10 min |
| Analytics check | 5 min |
| **TOTAL** | **~60 min** |

---

**Ready to start?** Begin with GitHub tests (easiest to access without login).

**Questions?** Check console logs first, then report issues with details above.
