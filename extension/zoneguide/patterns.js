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
      keywords: ['upload file', 'upload', 'add file from computer', 'upload files', 'upload a file', 'add files'],
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
      keywords: ['create pull request', 'new pull request', 'open pr', 'make pr', 'create pr', 'open a pull request', 'open pull request', 'start pr', 'start pull request'],
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
      keywords: ['create issue', 'new issue', 'open issue', 'report issue', 'make issue', 'create an issue', 'open an issue', 'report bug', 'submit issue'],
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
      keywords: ['go to file', 'find file', 'search file', 'open file', 'find a file', 'locate file', 'search for file'],
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
    },

    // ========== DOWNLOADS ==========

    'download-zip': {
      keywords: ['download zip', 'download as zip', 'download repository', 'download repo as zip', 'get zip'],
      selectors: [
        'a[href*="/archive/"]',
        'a:has-text("Download ZIP")',
        'button:has-text("Code")',
        'summary:has-text("Code")'
      ],
      message: '📦 Click here to download as ZIP',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*']
    },

    'view-releases': {
      keywords: ['view releases', 'see releases', 'releases', 'download release', 'latest release'],
      selectors: [
        'a[href*="/releases"]',
        'a:has-text("Releases")',
        'nav a:has-text("Releases")',
        'a[data-selected-links*="releases"]'
      ],
      message: '🚀 Click here to view releases',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    // ========== BRANCHES & TAGS ==========

    'view-branches': {
      keywords: ['view branches', 'see branches', 'branches', 'all branches', 'branch list'],
      selectors: [
        'a[href*="/branches"]',
        'summary:has-text("branches")',
        'button:has-text("branches")',
        '[data-hotkey="b"]'
      ],
      message: '🌿 Click here to view all branches',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    'create-branch': {
      keywords: ['create branch', 'new branch', 'make branch', 'add branch', 'create new branch'],
      selectors: [
        'summary:has-text("branches")',
        'button:has-text("branches")',
        'a[href*="/branches"]',
        '[aria-label*="branch"]'
      ],
      message: '🌿 Click here to create a new branch',
      action: 'click',
      confidence: 0.80,
      context: ['github.com/*/*']
    },

    'view-tags': {
      keywords: ['view tags', 'see tags', 'tags', 'all tags', 'tag list'],
      selectors: [
        'a[href*="/tags"]',
        'a:has-text("Tags")',
        'button:has-text("tags")'
      ],
      message: '🏷️ Click here to view all tags',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    // ========== COMPARISONS ==========

    'compare-branches': {
      keywords: ['compare branches', 'compare', 'diff branches', 'compare commits'],
      selectors: [
        'a[href*="/compare"]',
        'button:has-text("Compare")',
        'a:has-text("Compare")'
      ],
      message: '🔀 Click here to compare branches',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*']
    },

    // ========== TABS ==========

    'view-actions': {
      keywords: ['view actions', 'see actions', 'actions', 'ci', 'workflows', 'github actions'],
      selectors: [
        'a[data-selected-links*="actions"]',
        'a[href*="/actions"]',
        'nav a:has-text("Actions")'
      ],
      message: '⚡ Click here to view GitHub Actions',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-projects': {
      keywords: ['view projects', 'see projects', 'projects', 'project board', 'kanban'],
      selectors: [
        'a[data-selected-links*="projects"]',
        'a[href*="/projects"]',
        'nav a:has-text("Projects")'
      ],
      message: '📊 Click here to view projects',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-wiki': {
      keywords: ['view wiki', 'see wiki', 'wiki', 'documentation'],
      selectors: [
        'a[data-selected-links*="wiki"]',
        'a[href*="/wiki"]',
        'nav a:has-text("Wiki")'
      ],
      message: '📚 Click here to view the wiki',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-security': {
      keywords: ['view security', 'see security', 'security', 'security tab', 'vulnerabilities'],
      selectors: [
        'a[data-selected-links*="security"]',
        'a[href*="/security"]',
        'nav a:has-text("Security")'
      ],
      message: '🔒 Click here to view security',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-insights': {
      keywords: ['view insights', 'see insights', 'insights', 'analytics', 'stats'],
      selectors: [
        'a[data-selected-links*="insights"]',
        'a[href*="/pulse"]',
        'nav a:has-text("Insights")'
      ],
      message: '📈 Click here to view insights',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    'view-discussions': {
      keywords: ['view discussions', 'see discussions', 'discussions', 'community discussions'],
      selectors: [
        'a[data-selected-links*="discussions"]',
        'a[href*="/discussions"]',
        'nav a:has-text("Discussions")'
      ],
      message: '💬 Click here to view discussions',
      action: 'click',
      confidence: 0.95,
      context: ['github.com/*/*']
    },

    // ========== ADDITIONAL ACTIONS ==========

    'view-contributors': {
      keywords: ['view contributors', 'see contributors', 'contributors', 'who contributed'],
      selectors: [
        'a[href*="/graphs/contributors"]',
        'a:has-text("contributors")',
        'a:has-text("Contributors")'
      ],
      message: '👥 Click here to view contributors',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*']
    },

    'view-network': {
      keywords: ['view network', 'network graph', 'fork network', 'see forks'],
      selectors: [
        'a[href*="/network"]',
        'a:has-text("Network")',
        'nav a:has-text("Network")'
      ],
      message: '🕸️ Click here to view network graph',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*']
    },

    'blame-file': {
      keywords: ['blame', 'git blame', 'who wrote this', 'file blame', 'show blame'],
      selectors: [
        'button[aria-label*="Blame"]',
        'a:has-text("Blame")',
        'button:has-text("Blame")'
      ],
      message: '🔍 Click here to view blame',
      action: 'click',
      confidence: 0.85,
      context: ['github.com/*/*/blob/*']
    },

    'view-history': {
      keywords: ['file history', 'view history', 'commit history for file', 'history'],
      selectors: [
        'a[aria-label*="History"]',
        'a:has-text("History")',
        'button:has-text("History")'
      ],
      message: '📜 Click here to view file history',
      action: 'click',
      confidence: 0.90,
      context: ['github.com/*/*/blob/*']
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
