# ZoneGuide Implementation Checklist

## Phase 1: Foundation ✓ Week 1

### Files to Create
- [ ] `extension/zoneguide/index.js` - Entry point (50 lines)
- [ ] `extension/zoneguide/zones.js` - Zone detection + heatmap (120 lines)  
- [ ] `extension/zoneguide/styles.css` - Visual styles (200 lines)

### Files to Update
- [ ] `extension/manifest.json` - Add zoneguide to content_scripts

### Testing
- [ ] Load extension without errors
- [ ] Open DevTools console: `window.__ZONEGUIDE__.showZoneHeatmap('arc-tr')`
- [ ] Verify orange gradient appears top-right
- [ ] Verify fade out after 1.5s
- [ ] Test all 5 zones: center, arc-tl, arc-tr, arc-bl, arc-br

---

## Phase 2: Recording Engine ✓ Week 2

### Files to Create
- [ ] `extension/zoneguide/selector.js` - CSS selector generation (200 lines)
- [ ] `extension/zoneguide/recorder.js` - Event capture (250 lines)
- [ ] `extension/zoneguide/storage.js` - Dual storage (150 lines)
- [ ] `backend/convex/workflows.ts` - CRUD functions (150 lines)

### Files to Update
- [ ] `backend/convex/schema.ts` - Add workflows table
- [ ] `extension/background.js` - Add Convex message handlers
- [ ] `extension/manifest.json` - Add keyboard shortcut (Alt+Shift+R)

### Testing
- [ ] Press Alt+Shift+R - recording badge appears
- [ ] Click 5 elements on GitHub
- [ ] Press Alt+Shift+R - recording stops
- [ ] Check Convex dashboard - workflow exists with 5 steps
- [ ] Verify each step has: selector, zone, text, url
- [ ] Verify selectors are unique (test querySelectorAll)

---

## Phase 3: Playback Engine ✓ Week 3

### Files to Create
- [ ] `extension/zoneguide/overlay.js` - Highlights + tooltips (200 lines)
- [ ] `extension/zoneguide/player.js` - State machine (300 lines)

### Files to Update
- [ ] `extension/sidepanel.html` - Add ZoneGuide controls section
- [ ] `extension/sidepanel.js` - Wire Play/Stop/Exit buttons
- [ ] `extension/zoneguide/index.js` - Add playback message handlers

### Testing
- [ ] Click "Play" on recorded workflow
- [ ] Step 1: Zone heatmap appears for 1.5s
- [ ] Step 1: Element highlight + tooltip appears
- [ ] Step 1: Click correct element → success animation
- [ ] Step 2 starts automatically
- [ ] Try wrong click → shake animation + nudge message
- [ ] Complete all steps → "Guide Complete" message
- [ ] Press Escape mid-guide → all overlays removed

---

## Phase 4: Integration & Polish ✓ Week 4

### Tasks
- [ ] Add workflow list to sidepanel (name, steps, created date)
- [ ] Add delete workflow button
- [ ] Add export workflow (download .json)
- [ ] Add import workflow (upload .json)
- [ ] Style ZoneGuide section to match Navigator theme
- [ ] Add loading states during Convex operations
- [ ] Add error handling (network fail, element not found)
- [ ] Add keyboard shortcut help text

### Testing
- [ ] Delete workflow → removed from list + Convex
- [ ] Export workflow → valid JSON file downloads
- [ ] Import workflow → appears in list + playable
- [ ] Offline (disconnect network) → workflows load from IndexedDB cache
- [ ] Recording while playing → show error "Stop guide first"

---

## Phase 5: Cross-Site Testing ✓ Week 5

### Test Matrix
- [ ] **GitHub** (github.com)
  - [ ] Record: Profile → Settings → Profile
  - [ ] Play: All steps work
  - [ ] Element visibility: All elements scroll into view
  
- [ ] **New Relic** (one.newrelic.com)
  - [ ] Record: Alerts → Create Alert Policy
  - [ ] Play: Zone detection correct
  - [ ] Complex UI: No CSS conflicts

- [ ] **Salesforce** (salesforce.com)
  - [ ] Record: Any multi-step workflow
  - [ ] Play: Handles Lightning web components
  - [ ] Shadow DOM: composedPath() works

### Edge Cases
- [ ] Element below fold → scrolls into view
- [ ] Element in scrollable container → container scrolls
- [ ] Page navigation mid-guide → pauses or exits
- [ ] Element removed (SPA) → "Element not found" error
- [ ] Duplicate IDs on page → highlights first match
- [ ] Very long workflow (20+ steps) → stable performance

---

## Phase 6: Final QA ✓ Week 6

### Smoke Test (5 minutes)
- [ ] Extension loads without console errors
- [ ] Record 3-step workflow on any site
- [ ] Play workflow → full cycle completes
- [ ] Press Escape → all overlays removed
- [ ] Reload extension → workflows persist
- [ ] Delete workflow → successfully removed

### Performance Checks
- [ ] Zone overlay renders in <100ms
- [ ] No layout thrashing (check DevTools Performance)
- [ ] Scroll is 60fps with overlays active
- [ ] Memory stable (no DOM node leaks after 10 guides)

### Security Checks
- [ ] All CSS uses `zg-` prefix (no conflicts)
- [ ] z-index: 2147483647 (always on top)
- [ ] pointer-events: none on overlays (except step indicator)
- [ ] No innerHTML with user data (use textContent)
- [ ] Export JSON validated (no code execution)

### Browser Compatibility
- [ ] Chrome 120+ ✓
- [ ] Edge 120+ ✓

---

## Deployment Checklist

### Pre-Release
- [ ] Version bump in manifest.json
- [ ] All console.log statements removed or prefixed with `[ZoneGuide]`
- [ ] No hardcoded URLs or test data
- [ ] All event listeners cleaned up in exit functions
- [ ] No memory leaks (verify with Chrome Task Manager)

### Release
- [ ] Create git branch: `feature/zoneguide-mvp`
- [ ] Commit all changes with clear messages
- [ ] Push to origin
- [ ] Test extension from zip file on fresh Chrome profile
- [ ] Document any known issues in GitHub

### Post-Release
- [ ] Monitor for errors in extension console
- [ ] Collect user feedback
- [ ] Track success metrics:
  - Recording completion rate
  - Playback success rate
  - Average workflow length
  - Most common errors

---

## Success Criteria (MVP)

- [x] Can record a workflow by clicking through it
- [x] Can play recorded workflow with visual guidance
- [x] Zone system works (progressive disclosure)
- [x] Selectors are stable (>90% accuracy)
- [x] No CSS conflicts with host pages
- [x] Works offline (IndexedDB fallback)
- [x] Graceful error handling
- [x] Clean exit (all overlays removed)

**Ship when all boxes checked!** 🚀
