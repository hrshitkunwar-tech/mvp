# ZoneGuide Phase 1 Testing Guide

## What Was Built

Phase 1 implements the **foundation** of ZoneGuide:
- ✅ Zone detection algorithm (5-zone system)
- ✅ Zone heatmap overlays with gradients
- ✅ CSS animations (GPU-accelerated)
- ✅ Public API for testing
- ✅ Chrome extension integration

## How to Test

### Step 1: Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `/home/user/mvp/extension` folder
5. Verify "Navigator: Contextual AI v2.1.0" appears

### Step 2: Verify No Console Errors

1. Visit any website (e.g., https://github.com)
2. Open DevTools (F12 or Right-click → Inspect)
3. Go to **Console** tab
4. Look for these messages (green ✓ = good):
   ```
   ✓ [ZoneGuide] zones.js loaded
   ✓ [ZoneGuide] index.js loaded - API available at window.__ZONEGUIDE__
   ✓ [ZoneGuide] Module initialized v1.0.0
   ```
5. **No red errors should appear**

### Step 3: Test Zone Visualization

In the DevTools Console, run these commands:

#### Test 1: Show Top-Right Zone (3 seconds)
```javascript
window.__ZONEGUIDE__.test.showZone('arc-tr', 3000);
```
**Expected:** Orange gradient appears in top-right corner, fades out after 3 seconds

#### Test 2: Show Center Zone (2 seconds)
```javascript
window.__ZONEGUIDE__.test.showZone('center', 2000);
```
**Expected:** Orange gradient in center of screen, fades out after 2 seconds

#### Test 3: Show All 5 Zones (one at a time)
```javascript
// Top-left
window.__ZONEGUIDE__.test.showZone('arc-tl', 2000);

// Wait 3 seconds, then run:
window.__ZONEGUIDE__.test.showZone('arc-tr', 2000);

// Wait 3 seconds, then run:
window.__ZONEGUIDE__.test.showZone('arc-bl', 2000);

// Wait 3 seconds, then run:
window.__ZONEGUIDE__.test.showZone('arc-br', 2000);

// Wait 3 seconds, then run:
window.__ZONEGUIDE__.test.showZone('center', 2000);
```

#### Test 4: Manual Hide
```javascript
// Show permanent zone (duration 0 = permanent)
window.__ZONEGUIDE__.test.showZone('arc-tl', 0);

// Manually hide it
window.__ZONEGUIDE__.test.hideZone();
```
**Expected:** Zone appears and stays until hideZone() is called

### Step 4: Test Zone Detection on Elements

Click around the page while running this in console:

```javascript
document.addEventListener('click', (e) => {
  const zone = window.__ZONEGUIDE__.getZone(e.target);
  console.log('Clicked element is in zone:', zone);
}, { capture: true });
```

Then click elements in different parts of the page:
- Click something in top-left → should log `arc-tl`
- Click something in top-right → should log `arc-tr`
- Click something in center → should log `center`
- Click something in bottom-left → should log `arc-bl`
- Click something in bottom-right → should log `arc-br`

### Step 5: Test Message Passing (Optional)

This tests the communication between background and content script:

```javascript
chrome.runtime.sendMessage({
  type: 'ZONEGUIDE_SHOW_ZONE',
  payload: { zone: 'arc-tr', duration: 2000 }
}, (response) => {
  console.log('Response:', response);
});
```
**Expected:** Zone appears and response is `{ success: true }`

### Step 6: Test State Access

```javascript
console.log(window.__ZONEGUIDE__.getState());
```
**Expected output:**
```javascript
{
  mode: "idle",
  version: "1.0.0",
  initialized: true
}
```

### Step 7: Verify CSS Isolation (No Conflicts)

Test on different websites to ensure ZoneGuide doesn't break their styling:

1. **GitHub**: https://github.com
2. **Google**: https://google.com
3. **New Relic** (if you have access): https://one.newrelic.com
4. **Any complex SaaS UI**

For each site:
- Show a zone overlay
- Verify the website's UI is NOT affected
- Verify you can still click through the overlay (pointer-events: none working)
- Verify overlay is ALWAYS on top (max z-index working)

## Success Criteria

✅ **Phase 1 is complete when:**

- [ ] Extension loads without errors
- [ ] Console shows 3 green ZoneGuide initialization messages
- [ ] All 5 zones can be visualized
- [ ] Zone detection correctly identifies element positions
- [ ] Overlays don't break host page CSS
- [ ] Overlays have pointer-events: none (can click through them)
- [ ] Fade in/out animations are smooth
- [ ] No visual jank or layout thrashing

## Common Issues & Fixes

### Issue: "Cannot read properties of undefined (__ZONEGUIDE_ZONES__)"
**Fix:** zones.js didn't load before index.js. Check manifest.json - zones.js must be listed BEFORE index.js

### Issue: No gradient visible
**Fix:** Check if CSS file loaded. Go to DevTools → Sources → zoneguide/styles.css should be there

### Issue: Console error "Extension context invalidated"
**Fix:** Extension was reloaded. Refresh the page to re-inject content scripts

### Issue: Zones appear in wrong position
**Fix:** This is a bug - check if zone detection math is correct in zones.js

## Next Steps

After Phase 1 testing passes:
- **Phase 2:** Recording engine (capture clicks, save to Convex)
- **Phase 3:** Playback engine (guided walkthrough)
- **Phase 4:** AI fallback (element finding)

---

**Phase 1 Status:** ✅ COMPLETE - Ready for Testing

Created: 2026-02-13
Last Updated: 2026-02-13
