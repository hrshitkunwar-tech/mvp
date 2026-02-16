# Multi-Site Pattern Expansion Summary

**Date:** 2026-02-16
**Branch:** `claude/setup-new-feature-z7Qnb`
**Phase:** Multi-Site Foundation

---

## 🎯 **What We Built**

Expanded ZoneGuide from **single-site** (GitHub only) to **multi-site** support with patterns for:
1. ✅ **GitHub** - 36 patterns
2. ✅ **Linear** - 22 patterns (NEW!)
3. ✅ **Figma** - 18 patterns (NEW!)
4. ✅ **New Relic** - 15 patterns (NEW!)

**Total: 91 patterns across 4 sites!** 📊

---

## 📋 **Linear Patterns (22)**

### Issue Management
- create-issue, view-my-issues, view-all-issues, search-issues

### Projects & Cycles
- view-projects, create-project, view-cycles, active-cycle

### Views & Filters
- board-view, list-view, filter-issues, group-by

### Roadmap & Insights
- view-roadmap, view-insights

### Team & Settings
- team-settings, notifications

### Labels & Workflow
- add-label, set-priority, assign-to, set-status

---

## 🎨 **Figma Patterns (18)**

### File Operations
- create-file, import-file, share

### Tools
- move-tool, frame-tool, text-tool, rectangle-tool, pen-tool

### Layers & Components
- show-layers, create-component, assets

### Properties & Styles
- design-panel, prototype, inspect

### Collaboration
- comments, version-history, present

---

## 📊 **New Relic Patterns (15)**

### Main Navigation
- apm, browser, infrastructure, logs

### Dashboards & Alerts
- dashboards, create-dashboard, alerts, create-alert

### Queries & Explorer
- query-builder, explorer

### Transactions & Errors
- transactions, errors, distributed-tracing

### Time Management
- time-picker

---

## 🔧 **Technical Improvements**

### New API Methods
```javascript
// Get patterns for current site (auto-detects)
window.__ZONEGUIDE_PATTERNS__.getPatterns()

// Detect which site we're on
window.__ZONEGUIDE_PATTERNS__.detectCurrentSite()
// Returns: 'github' | 'linear' | 'figma' | 'newrelic' | null

// Get patterns for specific site
window.__ZONEGUIDE_PATTERNS__.getPatternsBySite('linear')

// Get all supported sites
window.__ZONEGUIDE_PATTERNS__.getSupportedSites()
// Returns: ['github', 'linear', 'figma', 'newrelic']

// Get total pattern count
window.__ZONEGUIDE_PATTERNS__.getTotalPatternCount()
// Returns: 91
```

### Site Detection
Auto-detects current site based on hostname:
- `github.com` → GitHub patterns
- `linear.app` → Linear patterns
- `figma.com` → Figma patterns
- `newrelic.com` / `one.newrelic.com` → New Relic patterns

---

## 🧪 **Testing Checklist**

### Linear (linear.app)
- [ ] Test "create issue" query
- [ ] Test "view my issues" query
- [ ] Test "board view" query
- [ ] Test "view roadmap" query

### Figma (figma.com)
- [ ] Test "create file" query
- [ ] Test "text tool" query
- [ ] Test "share" query
- [ ] Test "comments" query

### New Relic (one.newrelic.com)
- [ ] Test "apm" query
- [ ] Test "view logs" query
- [ ] Test "dashboards" query
- [ ] Test "create alert" query

---

## 📦 **File Changes**

- `/home/user/mvp/extension/zoneguide/patterns.js`
  - Lines added: ~300
  - New pattern libraries: 3 (LINEAR, FIGMA, NEWRELIC)
  - New patterns: 55 (22 + 18 + 15)
  - New API methods: 4 (detectCurrentSite, getSupportedSites, getTotalPatternCount, getPatternsBySite)

---

## ⏭️ **Next Steps**

### Remaining Sites (User Requested)
- [ ] **ClaudeCode** - Need info about this tool
- [ ] **ClaudeCowork** - Need info about this tool
- [ ] **Codex** - Need info about this tool
- [ ] **Antigravity** - Need info about this tool

**Question for user:** Are these custom/internal tools? Please provide:
1. Website URL/hostname
2. Main features to support
3. Key UI elements to navigate

### Phase 2: Pattern Management UI
- [ ] Create options page (`chrome://extensions → Details → Options`)
- [ ] View all patterns (organized by site)
- [ ] Add new patterns (form)
- [ ] Edit existing patterns
- [ ] Usage analytics
- [ ] Export/import patterns

---

## 🚀 **Ready to Commit & Push**

Changes ready to be committed and pushed to branch.
