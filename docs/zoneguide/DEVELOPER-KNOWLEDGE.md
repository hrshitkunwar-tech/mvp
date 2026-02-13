# ZoneGuide Developer Knowledge - Quick Reference

## Zone Detection (5-Zone System)

```javascript
const ZONES = {
  CENTER: 'center',      // Inner 40% of viewport (0.3-0.7 on both axes)
  ARC_TL: 'arc-tl',     // Top-left quadrant (excluding center)
  ARC_TR: 'arc-tr',     // Top-right quadrant
  ARC_BL: 'arc-bl',     // Bottom-left quadrant  
  ARC_BR: 'arc-br'      // Bottom-right quadrant
};

function getZone(element) {
  const rect = element.getBoundingClientRect();
  const cx = (rect.left + rect.width / 2) / window.innerWidth;
  const cy = (rect.top + rect.height / 2) / window.innerHeight;
  
  // Center star: inner 40%
  if (cx > 0.3 && cx < 0.7 && cy > 0.3 && cy < 0.7) return ZONES.CENTER;
  
  // Four corner arcs
  if (cx <= 0.5) return cy <= 0.5 ? ZONES.ARC_TL : ZONES.ARC_BL;
  return cy <= 0.5 ? ZONES.ARC_TR : ZONES.ARC_BR;
}
```

## Selector Generation (Priority Order)

1. **data-testid** (most stable)
2. **ID** (if not dynamic like "react-123")  
3. **aria-label** (accessible)
4. **CSS path** (tag + meaningful classes + nth-child)
5. **XPath** (fallback)

```javascript
function getUniqueSelector(element) {
  // Priority 1: data-testid
  if (element.dataset.testid) {
    return `[data-testid="${CSS.escape(element.dataset.testid)}"]`;
  }
  
  // Priority 2: ID (if stable)
  if (element.id && !isDynamicId(element.id)) {
    return `#${CSS.escape(element.id)}`;
  }
  
  // Priority 3: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    const selector = `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
    if (isUnique(selector)) return selector;
  }
  
  // Priority 4: Build CSS path
  return buildCSSPath(element);
}

function isDynamicId(id) {
  return /^\d/.test(id) || /^:/.test(id) || 
         /^(react|ng|cdk|ember)/.test(id) ||
         /[-_]\d{3,}/.test(id);
}
```

## CSS Animation Rules (GPU Only!)

```css
/* ✅ GOOD - GPU accelerated */
transform: scale(1.02);
transform: translateX(10px);
opacity: 0.5;

/* ❌ BAD - Triggers layout/paint (causes jank) */
width: 100px;
height: 100px;
top: 10px;
left: 10px;
background-color: red;
```

## Message Passing Architecture

```
┌──────────────┐                    ┌────────────────┐
│  Side Panel  │ ──sendMessage──►   │  Background.js │
└──────────────┘                    │  (relay only)  │
                                    └───────┬────────┘
                                            │
                                    tabs.sendMessage(activeTab)
                                            │
                                    ┌───────▼────────┐
                                    │  ZoneGuide     │
                                    │  (content.js)  │
                                    └────────────────┘
```

**Example:**
```javascript
// Side panel sends:
chrome.runtime.sendMessage({ type: 'ZONEGUIDE_START_RECORDING' });

// Background.js relays:
chrome.tabs.sendMessage(activeTabId, message);

// ZoneGuide receives:
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'ZONEGUIDE_START_RECORDING') {
    recorder.start();
  }
});
```

## Storage Strategy

```javascript
// Dual write: Convex (primary) + IndexedDB (cache)
async function saveWorkflow(workflow) {
  // 1. Try Convex
  try {
    await chrome.runtime.sendMessage({
      type: 'CONVEX_SAVE_WORKFLOW',
      payload: { workflow }
    });
  } catch (e) {
    console.warn('Convex unavailable, local-only save');
  }
  
  // 2. Always cache locally
  await indexedDB.put(workflow);
}

// Dual read: Convex first, fallback to IndexedDB
async function loadWorkflow(id) {
  try {
    const workflow = await chrome.runtime.sendMessage({
      type: 'CONVEX_GET_WORKFLOW',
      payload: { id }
    });
    if (workflow) return workflow;
  } catch (e) {
    console.warn('Convex unavailable, using cache');
  }
  
  return await indexedDB.get(id);
}
```

## Event Handling (Capture Phase)

```javascript
// Use capture phase to intercept BEFORE page handlers
document.addEventListener('click', handleClick, { 
  capture: true,  // ← CRITICAL
  passive: true   // ← Performance
});

function handleClick(event) {
  // NEVER call event.stopPropagation() - we're observers, not interceptors
  // NEVER call event.preventDefault() - don't break the page
  
  const target = event.target;
  recordStep(target);
  
  // Event continues to page normally
}
```

## DOM Performance Rules

1. **Batch reads before writes**
```javascript
// ❌ BAD - causes layout thrashing
for (let el of elements) {
  const rect = el.getBoundingClientRect(); // read
  el.style.top = rect.top + 'px';          // write
}

// ✅ GOOD - batch reads, then writes
const rects = elements.map(el => el.getBoundingClientRect());
elements.forEach((el, i) => {
  el.style.top = rects[i].top + 'px';
});
```

2. **Use requestAnimationFrame for reposition**
```javascript
let rafId = null;

function scheduleReposition() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = null;
    repositionOverlays(); // One batch update per frame
  });
}

window.addEventListener('scroll', scheduleReposition, { passive: true });
```

## IndexedDB Minimal API

```javascript
const DB_NAME = 'ZoneGuideCache';
const STORE = 'workflows';

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(workflow) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(workflow);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function get(id) {
  const db = await openDB();
  return new Promise((resolve) => {
    const request = db.transaction(STORE).objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => resolve(null);
  });
}
```

## Testing Commands (DevTools Console)

```javascript
// Test zone detection on any page:
document.addEventListener('click', (e) => {
  const zone = window.__ZONEGUIDE__.getZone(e.target);
  console.log('Zone:', zone);
  e.stopPropagation();
}, { capture: true });

// Test selector generation:
document.addEventListener('click', (e) => {
  const selector = window.__ZONEGUIDE__.getSelector(e.target);
  console.log('Selector:', selector);
  console.log('Unique?', document.querySelectorAll(selector).length === 1);
  e.stopPropagation();
}, { capture: true });

// Manually show zone heatmap:
window.__ZONEGUIDE__.showZoneHeatmap('arc-tr', 3000);
```

## Common Gotchas

1. **Extension context invalidation** - Always check `chrome.runtime.id` exists
2. **getBoundingClientRect() is viewport-relative** - Changes on scroll!
3. **CSS.escape() required for special chars** - Don't use raw IDs in selectors
4. **Passive listeners can't preventDefault()** - Fine for observers
5. **Content scripts can't access page JS** - Isolated world
6. **MV3 service workers terminate** - Never store state in background.js

---

**Upload this file to Claude before any coding session for instant context.**
