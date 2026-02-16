/**
 * ZoneGuide Pattern Database
 * Maps natural language queries to UI element selectors
 *
 * Pattern Structure:
 * - keywords: Array of trigger words/phrases
 * - selectors: Array of CSS selectors (tries in order)
 * - message: Instruction text for tooltip
 * - action: Expected user action (click, type, scroll)
 * - confidence: How confident we are in this match (0-1)
 * - context: Where this pattern applies (url patterns)
 */

(function() {
  'use strict';

  const GITHUB_PATTERNS = {
    // ========== REPOSITORY ACTIONS ==========

    'star-repo': {
      keywords: ['star', 'star this', 'star repo', 'star repository', 'add star'],
      selectors: [
        'button[data-hydro-click*="STAR"]',
        'button:has-text("Star")',
        'form[action*="/star"] button',
        '[aria-label*="Star this repository"]'
      ],
      message: '⭐ Click here to star this repository',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'unstar-repo': {
      keywords: ['unstar', 'remove star', 'unstar this'],
      selectors: [
        'button[data-hydro-click*="UNSTAR"]',
        'button:has-text("Starred")',
        'button:has-text("Unstar")',
        '[aria-label*="Unstar this repository"]'
      ],
      message: '⭐ Click here to unstar this repository',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'fork-repo': {
      keywords: ['fork', 'fork this', 'fork repo', 'fork repository', 'create fork'],
      selectors: [
        'button[data-hydro-click*="FORK"]',
        'a[href*="/fork"]',
        'button:has-text("Fork")',
        '[aria-label*="Fork this repository"]'
      ],
      message: '🍴 Click here to fork this repository',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'watch-repo': {
      keywords: ['watch', 'watch repo', 'watch repository', 'subscribe', 'get notifications'],
      selectors: [
        'button[data-hydro-click*="WATCH"]',
        'button:has-text("Watch")',
        'summary:has-text("Watch")',
        '[aria-label*="Watch this repository"]'
      ],
      message: '👁️ Click here to watch this repository and get notifications',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    // ========== FILE OPERATIONS ==========

    'create-file': {
      keywords: ['create file', 'new file', 'add file', 'make file', 'create new file'],
      selectors: [
        'button[data-hotkey="c"]',
        'summary:has-text("Add file")',
        'a[href*="/new"]',
        'button:has-text("Create new file")',
        '[aria-label*="Add file"]'
      ],
      message: '📄 Click here to create a new file',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*/tree/*', 'github.com/*/*']
    },

    'upload-file': {
      keywords: ['upload file', 'upload', 'add file from computer'],
      selectors: [
        'a[href*="/upload"]',
        'button:has-text("Upload files")',
        'summary:has-text("Add file")',
        '[aria-label*="Upload files"]'
      ],
      message: '📤 Click here to upload files',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*/tree/*', 'github.com/*/*']
    },

    'edit-file': {
      keywords: ['edit file', 'edit this file', 'modify file', 'change file'],
      selectors: [
        'button[aria-label*="Edit this file"]',
        'a[aria-label*="Edit"]',
        'button[data-hotkey="e"]',
        'button:has-text("Edit")'
      ],
      message: '✏️ Click here to edit this file',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*/blob/*']
    },

    'delete-file': {
      keywords: ['delete file', 'remove file', 'delete this file'],
      selectors: [
        'button[aria-label*="Delete this file"]',
        'button:has-text("Delete file")',
        '[aria-label*="Delete"]'
      ],
      message: '🗑️ Click here to delete this file',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*/blob/*']
    },

    // ========== PULL REQUESTS ==========

    'create-pr': {
      keywords: ['create pull request', 'new pull request', 'open pr', 'make pr', 'create pr'],
      selectors: [
        'a[href*="/compare"]',
        'button:has-text("Pull request")',
        'a:has-text("New pull request")',
        '[data-hotkey="p"]'
      ],
      message: '🔀 Click here to create a pull request',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    'view-prs': {
      keywords: ['view pull requests', 'see prs', 'pull requests', 'show prs'],
      selectors: [
        'a[data-selected-links*="pull_requests"]',
        'a[href*="/pulls"]',
        'nav a:has-text("Pull requests")'
      ],
      message: '🔀 Click here to view pull requests',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'merge-pr': {
      keywords: ['merge pull request', 'merge pr', 'merge this', 'merge'],
      selectors: [
        'button:has-text("Merge pull request")',
        'button[data-details-container=".js-merge-pull-request"]',
        'button:has-text("Squash and merge")',
        'button:has-text("Rebase and merge")'
      ],
      message: '✅ Click here to merge this pull request',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*/pull/*']
    },

    // ========== ISSUES ==========

    'create-issue': {
      keywords: ['create issue', 'new issue', 'open issue', 'report issue', 'make issue'],
      selectors: [
        'a[href*="/issues/new"]',
        'button:has-text("New issue")',
        '[data-hotkey="i"]',
        'a:has-text("New issue")'
      ],
      message: '🐛 Click here to create a new issue',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-issues': {
      keywords: ['view issues', 'see issues', 'issues', 'show issues'],
      selectors: [
        'a[data-selected-links*="issues"]',
        'a[href*="/issues"]',
        'nav a:has-text("Issues")'
      ],
      message: '📋 Click here to view issues',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'close-issue': {
      keywords: ['close issue', 'close this issue', 'mark as closed'],
      selectors: [
        'button:has-text("Close issue")',
        'button[name="comment_and_close"]',
        'form button:has-text("Close")'
      ],
      message: '✅ Click here to close this issue',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*/issues/*']
    },

    // ========== CODE NAVIGATION ==========

    'view-code': {
      keywords: ['view code', 'see code', 'browse code', 'code tab'],
      selectors: [
        'a[data-selected-links*="code"]',
        'a[href*="/tree/"]',
        'nav a:has-text("Code")'
      ],
      message: '💻 Click here to view the code',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'search-code': {
      keywords: ['search code', 'find in code', 'search repository', 'search this repo'],
      selectors: [
        'button[aria-label*="Search this repository"]',
        'input[placeholder*="Search"]',
        '[data-hotkey="s"]'
      ],
      message: '🔍 Click here to search the code',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*']
    },

    'go-to-file': {
      keywords: ['go to file', 'find file', 'search file', 'open file'],
      selectors: [
        'button[data-hotkey="t"]',
        'a:has-text("Go to file")',
        '[aria-label*="Go to file"]'
      ],
      message: '📂 Click here to search for a file',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    // ========== SETTINGS ==========

    'repo-settings': {
      keywords: ['settings', 'repository settings', 'repo settings', 'configure'],
      selectors: [
        'a[data-selected-links*="settings"]',
        'a[href*="/settings"]',
        'nav a:has-text("Settings")'
      ],
      message: '⚙️ Click here to open repository settings',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    // ========== CLONE/DOWNLOAD ==========

    'clone-repo': {
      keywords: ['clone', 'clone repo', 'clone repository', 'git clone', 'download code'],
      selectors: [
        'button:has-text("Code")',
        'summary:has-text("Code")',
        'button[data-hotkey="c"]',
        '[aria-label*="Clone"]'
      ],
      message: '📥 Click here to clone or download the repository',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    // ========== COMMITS ==========

    'view-commits': {
      keywords: ['view commits', 'see commits', 'commit history', 'commits'],
      selectors: [
        'a[href*="/commits"]',
        'a:has-text("commits")',
        'nav a:has-text("Commits")'
      ],
      message: '📝 Click here to view commit history',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    }
  };

  // Export patterns
  window.__ZONEGUIDE_PATTERNS__ = {
    github: GITHUB_PATTERNS,

    /**
     * Get all patterns for current site
     */
    getPatterns: function() {
      if (window.location.hostname.includes('github.com')) {
        return GITHUB_PATTERNS;
      }
      return {};
    },

    /**
     * Get pattern by ID
     */
    getPattern: function(id) {
      return GITHUB_PATTERNS[id];
    },

    /**
     * Get all pattern IDs
     */
    getPatternIds: function() {
      return Object.keys(GITHUB_PATTERNS);
    }
  };

  console.log('[ZoneGuide Patterns] Pattern database loaded:', Object.keys(GITHUB_PATTERNS).length, 'patterns');

})();
