# ZoneGuide – Session Context

> This file preserves conversation context so it can be resumed without loss.

---

## Project Overview

**Extension name:** Navigator: Contextual AI
**Manifest version:** 3
**Version:** 2.1.0
**Working directory:** `/home/user/mvp`
**Extension root:** `/home/user/mvp/extension/`

The extension injects a ZoneGuide content-script system into all pages. It matches user queries (natural-language or keywords) against a library of 100+ CSS-selector patterns for GitHub, Linear, Figma, and New Relic, then highlights or clicks the matching UI element.

---

## Active Branch

```
claude/setup-new-feature-z7Qnb
```

Remote: `origin` → `http://127.0.0.1:42575/git/hrshitkunwar-tech/mvp`

---

## Work Completed This Session

### 1. Pattern Management UI (Options Page) — DONE ✅

All five tabs of `zoneguide/options.html` are now fully wired up.

**Files created / modified:**

| File | Status | Purpose |
|------|--------|---------|
| `extension/zoneguide/options.html` | Pre-existing skeleton | 5-tab HTML shell |
| `extension/zoneguide/options.css` | **Created** | Full modern UI styles |
| `extension/zoneguide/options.js` | **Created** | Complete tab logic |
| `extension/manifest.json` | **Modified** | Added `options_page`, exposed new assets in `web_accessible_resources` |

**Tab-by-tab features implemented:**

| Tab | Features |
|-----|----------|
| View Patterns | 100+ patterns grouped by site; live text search; site-filter dropdown; collapsible sections; per-pattern usage count; ✏️ edit button for custom patterns |
| Add/Edit | Validated CRUD form; ID format check; duplicate guard; custom site hostname field; persists to `chrome.storage.local` |
| Manage Sites | Toggle switches for GitHub / Linear / Figma / New Relic; state persisted; disabling a site greys patterns in tab 1 |
| Import/Export | Selective checkbox export to JSON; drag-and-drop + file-picker import; merge or replace mode |
| Analytics | Summary stat cards (total queries, matches, success %, top site); top-10 CSS bar chart; per-site usage bar chart; scrollable recent-activity log; reset + export buttons |

**Commit hash:** `ba67f1a`
**Commit message:**
```
feat(zoneguide): implement full Pattern Management UI options page
```

---

## Key Architecture Notes

### Pattern Data
- Built-in patterns live in `extension/zoneguide/patterns.js`
- They are exposed as `window.__ZONEGUIDE_PATTERNS__` — an object with keys `github`, `linear`, `figma`, `newrelic`
- Custom patterns are stored in `chrome.storage.local` under key `customPatterns`

### Storage keys (chrome.storage.local)
| Key | Type | Description |
|-----|------|-------------|
| `customPatterns` | `object` | `{ [id]: { site, keywords, selectors, message, action, confidence, _custom: true } }` |
| `siteStates` | `object` | `{ github: bool, linear: bool, figma: bool, newrelic: bool }` |
| `analytics` | `object` | `{ totalQueries, matches: { [patternId]: count }, recentActivity: [...] }` |

### Content scripts loaded on all pages
- `content-script.js`
- `github-selectors.js`
- `zoneguide/styles.css` (injected CSS)

### ZoneGuide modules (web-accessible)
```
zones.js, index.js, selector.js, storage.js, guidance.js,
recorder.js, patterns.js, matcher.js, knowledge-connector.js,
hybrid-matcher.js, styles.css, options.html, options.css, options.js
```

### Side panel
- Entry: `sidepanel.html`

---

## File Tree (extension/)
```
extension/
├── manifest.json          ← MV3, registers options_page
├── background.js
├── content-script.js
├── github-selectors.js
├── sidepanel.html
└── zoneguide/
    ├── options.html       ← 5-tab options page shell
    ├── options.css        ← ✨ NEW – modern UI styles
    ├── options.js         ← ✨ NEW – full tab logic
    ├── patterns.js        ← built-in 100+ patterns
    ├── styles.css         ← injected content-script styles
    ├── index.js
    ├── zones.js
    ├── selector.js
    ├── storage.js
    ├── guidance.js
    ├── recorder.js
    ├── matcher.js
    ├── hybrid-matcher.js
    └── knowledge-connector.js
```

---

## What To Do Next (potential backlog)

- Wire analytics writes: content scripts should call `chrome.storage.local` to increment `analytics.matches[patternId]` and push to `analytics.recentActivity` on each successful match.
- Add pattern count accuracy: the stat cards in `options.html` header hardcode `91` / `4` — `options.js` updates them dynamically on load via `updateStats()`, so the hardcoded HTML values are just initial placeholders.
- Custom-sites support in Manage Sites tab: the `#custom-sites-container` div is empty; could dynamically render cards for any non-builtin sites found in `customPatterns`.
- Keyboard shortcut `Ctrl+Shift+R` / `Cmd+Shift+R` triggers `toggle-zoneguide-recording` via `background.js`.
