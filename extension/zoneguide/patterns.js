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

  // ============================================================
  // LINEAR PATTERNS
  // ============================================================

  const LINEAR_PATTERNS = {
    // ========== ISSUE MANAGEMENT ==========

    'create-issue': {
      keywords: ['create issue', 'new issue', 'add issue', 'make issue', 'create new issue'],
      selectors: [
        'button[aria-label*="Create issue"]',
        'button:has-text("New issue")',
        '[data-testid="create-issue-button"]',
        'button[data-hotkey="c"]'
      ],
      message: '✨ Click here to create a new issue',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    'view-my-issues': {
      keywords: ['my issues', 'assigned to me', 'my tasks', 'view my issues'],
      selectors: [
        'a[href*="/my-issues"]',
        'nav a:has-text("My Issues")',
        '[data-testid="my-issues-link"]'
      ],
      message: '📋 Click here to view your issues',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    'view-all-issues': {
      keywords: ['all issues', 'see all issues', 'view issues', 'issue list'],
      selectors: [
        'a[href*="/issues"]',
        'nav a:has-text("All issues")',
        '[data-testid="all-issues-link"]'
      ],
      message: '📋 Click here to view all issues',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    'search-issues': {
      keywords: ['search', 'find issue', 'search issues', 'find'],
      selectors: [
        'input[placeholder*="Search"]',
        'button[aria-label*="Search"]',
        '[data-testid="search-input"]',
        'input[data-hotkey="/"]'
      ],
      message: '🔍 Click here to search issues',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    // ========== PROJECTS & CYCLES ==========

    'view-projects': {
      keywords: ['projects', 'view projects', 'see projects', 'all projects'],
      selectors: [
        'a[href*="/projects"]',
        'nav a:has-text("Projects")',
        '[data-testid="projects-link"]'
      ],
      message: '📊 Click here to view projects',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    'create-project': {
      keywords: ['create project', 'new project', 'add project', 'make project'],
      selectors: [
        'button[aria-label*="Create project"]',
        'button:has-text("New project")',
        '[data-testid="create-project-button"]'
      ],
      message: '📊 Click here to create a new project',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    'view-cycles': {
      keywords: ['cycles', 'view cycles', 'sprints', 'iterations'],
      selectors: [
        'a[href*="/cycles"]',
        'nav a:has-text("Cycles")',
        '[data-testid="cycles-link"]'
      ],
      message: '🔄 Click here to view cycles',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    'active-cycle': {
      keywords: ['active cycle', 'current cycle', 'current sprint', 'active sprint'],
      selectors: [
        'a[href*="/cycle/current"]',
        'button:has-text("Active")',
        '[data-testid="active-cycle-link"]'
      ],
      message: '🔄 Click here to view active cycle',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    // ========== VIEWS & FILTERS ==========

    'board-view': {
      keywords: ['board view', 'kanban', 'board', 'show board'],
      selectors: [
        'button[aria-label*="Board"]',
        'button:has-text("Board")',
        '[data-testid="board-view-button"]'
      ],
      message: '📋 Click here to switch to board view',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    'list-view': {
      keywords: ['list view', 'list', 'show list', 'table view'],
      selectors: [
        'button[aria-label*="List"]',
        'button:has-text("List")',
        '[data-testid="list-view-button"]'
      ],
      message: '📋 Click here to switch to list view',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    'filter-issues': {
      keywords: ['filter', 'add filter', 'filter issues', 'show filters'],
      selectors: [
        'button[aria-label*="Filter"]',
        'button:has-text("Filter")',
        '[data-testid="filter-button"]'
      ],
      message: '🔍 Click here to filter issues',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    },

    'group-by': {
      keywords: ['group by', 'group issues', 'organize by', 'group'],
      selectors: [
        'button[aria-label*="Group"]',
        'button:has-text("Group")',
        '[data-testid="group-button"]'
      ],
      message: '📊 Click here to group issues',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    },

    // ========== ROADMAP & INSIGHTS ==========

    'view-roadmap': {
      keywords: ['roadmap', 'view roadmap', 'product roadmap', 'timeline'],
      selectors: [
        'a[href*="/roadmap"]',
        'nav a:has-text("Roadmap")',
        '[data-testid="roadmap-link"]'
      ],
      message: '🗺️ Click here to view roadmap',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    'view-insights': {
      keywords: ['insights', 'analytics', 'stats', 'metrics'],
      selectors: [
        'a[href*="/insights"]',
        'nav a:has-text("Insights")',
        '[data-testid="insights-link"]'
      ],
      message: '📈 Click here to view insights',
      action: 'click',
      confidence: 0.95,
      context: ['linear.app/*']
    },

    // ========== TEAM & SETTINGS ==========

    'team-settings': {
      keywords: ['team settings', 'settings', 'preferences', 'configure'],
      selectors: [
        'a[href*="/settings"]',
        'button[aria-label*="Settings"]',
        'nav a:has-text("Settings")',
        '[data-testid="settings-link"]'
      ],
      message: '⚙️ Click here to open settings',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    'notifications': {
      keywords: ['notifications', 'view notifications', 'alerts', 'inbox'],
      selectors: [
        'button[aria-label*="Notifications"]',
        'button[aria-label*="Inbox"]',
        '[data-testid="notifications-button"]'
      ],
      message: '🔔 Click here to view notifications',
      action: 'click',
      confidence: 0.90,
      context: ['linear.app/*']
    },

    // ========== LABELS & PRIORITIES ==========

    'add-label': {
      keywords: ['add label', 'label', 'tag', 'add tag'],
      selectors: [
        'button[aria-label*="Add label"]',
        'button:has-text("Add label")',
        '[data-testid="add-label-button"]'
      ],
      message: '🏷️ Click here to add labels',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    },

    'set-priority': {
      keywords: ['set priority', 'priority', 'change priority', 'urgency'],
      selectors: [
        'button[aria-label*="Priority"]',
        'button:has-text("Priority")',
        '[data-testid="priority-button"]'
      ],
      message: '⚡ Click here to set priority',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    },

    'assign-to': {
      keywords: ['assign', 'assign to', 'assignee', 'assign issue'],
      selectors: [
        'button[aria-label*="Assign"]',
        'button[aria-label*="Assignee"]',
        '[data-testid="assign-button"]'
      ],
      message: '👤 Click here to assign issue',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    },

    'set-status': {
      keywords: ['set status', 'change status', 'status', 'workflow'],
      selectors: [
        'button[aria-label*="Status"]',
        'button:has-text("Status")',
        '[data-testid="status-button"]'
      ],
      message: '📍 Click here to change status',
      action: 'click',
      confidence: 0.85,
      context: ['linear.app/*']
    }
  };

  // ============================================================
  // FIGMA PATTERNS
  // ============================================================

  const FIGMA_PATTERNS = {
    // ========== FILE OPERATIONS ==========

    'create-file': {
      keywords: ['create file', 'new file', 'new design', 'create design'],
      selectors: [
        'button:has-text("New file")',
        'button[aria-label*="New file"]',
        '[data-testid="new-file-button"]'
      ],
      message: '🎨 Click here to create a new file',
      action: 'click',
      confidence: 0.95,
      context: ['figma.com/*']
    },

    'import-file': {
      keywords: ['import', 'import file', 'upload file', 'upload'],
      selectors: [
        'button:has-text("Import")',
        'button[aria-label*="Import"]',
        '[data-testid="import-button"]'
      ],
      message: '📥 Click here to import a file',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/*']
    },

    'share': {
      keywords: ['share', 'share file', 'invite', 'collaborate'],
      selectors: [
        'button:has-text("Share")',
        'button[aria-label*="Share"]',
        '[data-testid="share-button"]'
      ],
      message: '🔗 Click here to share this file',
      action: 'click',
      confidence: 0.95,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    // ========== TOOLS ==========

    'move-tool': {
      keywords: ['move tool', 'select tool', 'move', 'select'],
      selectors: [
        'button[aria-label*="Move"]',
        'button[data-tooltip*="Move"]',
        '[data-testid="move-tool"]'
      ],
      message: '↖️ Click here to select move tool',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'frame-tool': {
      keywords: ['frame', 'frame tool', 'create frame', 'add frame'],
      selectors: [
        'button[aria-label*="Frame"]',
        'button[data-tooltip*="Frame"]',
        '[data-testid="frame-tool"]'
      ],
      message: '🖼️ Click here to create a frame',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'text-tool': {
      keywords: ['text', 'text tool', 'add text', 'type'],
      selectors: [
        'button[aria-label*="Text"]',
        'button[data-tooltip*="Text"]',
        '[data-testid="text-tool"]'
      ],
      message: '📝 Click here to add text',
      action: 'click',
      confidence: 0.95,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'rectangle-tool': {
      keywords: ['rectangle', 'rect', 'square', 'shape'],
      selectors: [
        'button[aria-label*="Rectangle"]',
        'button[data-tooltip*="Rectangle"]',
        '[data-testid="rectangle-tool"]'
      ],
      message: '▭ Click here to draw a rectangle',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'pen-tool': {
      keywords: ['pen', 'pen tool', 'vector', 'draw'],
      selectors: [
        'button[aria-label*="Pen"]',
        'button[data-tooltip*="Pen"]',
        '[data-testid="pen-tool"]'
      ],
      message: '✏️ Click here to use pen tool',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    // ========== LAYERS & COMPONENTS ==========

    'show-layers': {
      keywords: ['layers', 'show layers', 'layers panel', 'layer list'],
      selectors: [
        'button[aria-label*="Layers"]',
        '[data-testid="layers-panel"]',
        'button:has-text("Layers")'
      ],
      message: '📚 Click here to view layers',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'create-component': {
      keywords: ['create component', 'make component', 'component', 'create symbol'],
      selectors: [
        'button[aria-label*="Create component"]',
        '[data-testid="create-component"]',
        'button:has-text("Create component")'
      ],
      message: '🧩 Click here to create a component',
      action: 'click',
      confidence: 0.85,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'assets': {
      keywords: ['assets', 'components', 'show assets', 'component library'],
      selectors: [
        'button[aria-label*="Assets"]',
        '[data-testid="assets-panel"]',
        'button:has-text("Assets")'
      ],
      message: '🎨 Click here to view assets',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    // ========== PROPERTIES & STYLES ==========

    'design-panel': {
      keywords: ['design panel', 'properties', 'inspector', 'design'],
      selectors: [
        '[data-testid="design-panel"]',
        'button[aria-label*="Design"]',
        'button:has-text("Design")'
      ],
      message: '🎛️ Click here to view design properties',
      action: 'click',
      confidence: 0.85,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'prototype': {
      keywords: ['prototype', 'prototyping', 'interactions', 'prototype mode'],
      selectors: [
        'button[aria-label*="Prototype"]',
        '[data-testid="prototype-tab"]',
        'button:has-text("Prototype")'
      ],
      message: '🔗 Click here to add prototyping',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'inspect': {
      keywords: ['inspect', 'code', 'inspect mode', 'css'],
      selectors: [
        'button[aria-label*="Inspect"]',
        '[data-testid="inspect-tab"]',
        'button:has-text("Inspect")'
      ],
      message: '🔍 Click here to inspect code',
      action: 'click',
      confidence: 0.90,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    // ========== COLLABORATION ==========

    'comments': {
      keywords: ['comments', 'add comment', 'feedback', 'comment mode'],
      selectors: [
        'button[aria-label*="Comment"]',
        '[data-testid="comment-tool"]',
        'button:has-text("Comment")'
      ],
      message: '💬 Click here to add comments',
      action: 'click',
      confidence: 0.95,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'version-history': {
      keywords: ['version history', 'history', 'versions', 'revisions'],
      selectors: [
        'button[aria-label*="Version history"]',
        '[data-testid="version-history"]',
        'button:has-text("Version history")'
      ],
      message: '📜 Click here to view version history',
      action: 'click',
      confidence: 0.85,
      context: ['figma.com/file/*', 'figma.com/design/*']
    },

    'present': {
      keywords: ['present', 'presentation', 'present mode', 'preview'],
      selectors: [
        'button[aria-label*="Present"]',
        '[data-testid="present-button"]',
        'button:has-text("Present")'
      ],
      message: '▶️ Click here to present',
      action: 'click',
      confidence: 0.95,
      context: ['figma.com/file/*', 'figma.com/design/*']
    }
  };

  // ============================================================
  // NEW RELIC PATTERNS
  // ============================================================

  const NEWRELIC_PATTERNS = {
    // ========== MAIN NAVIGATION ==========

    'apm': {
      keywords: ['apm', 'application monitoring', 'app performance', 'services'],
      selectors: [
        'a[href*="/apm"]',
        'nav a:has-text("APM")',
        'button:has-text("APM")',
        '[data-testid="apm-link"]'
      ],
      message: '📊 Click here to view APM',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'browser': {
      keywords: ['browser', 'browser monitoring', 'rum', 'frontend'],
      selectors: [
        'a[href*="/browser"]',
        'nav a:has-text("Browser")',
        'button:has-text("Browser")',
        '[data-testid="browser-link"]'
      ],
      message: '🌐 Click here to view Browser monitoring',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'infrastructure': {
      keywords: ['infrastructure', 'infra', 'servers', 'hosts'],
      selectors: [
        'a[href*="/infrastructure"]',
        'nav a:has-text("Infrastructure")',
        'button:has-text("Infrastructure")',
        '[data-testid="infrastructure-link"]'
      ],
      message: '🖥️ Click here to view Infrastructure',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'logs': {
      keywords: ['logs', 'log management', 'view logs', 'log viewer'],
      selectors: [
        'a[href*="/logs"]',
        'nav a:has-text("Logs")',
        'button:has-text("Logs")',
        '[data-testid="logs-link"]'
      ],
      message: '📝 Click here to view Logs',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    // ========== DASHBOARDS & ALERTS ==========

    'dashboards': {
      keywords: ['dashboards', 'view dashboards', 'custom dashboards', 'charts'],
      selectors: [
        'a[href*="/dashboards"]',
        'nav a:has-text("Dashboards")',
        'button:has-text("Dashboards")',
        '[data-testid="dashboards-link"]'
      ],
      message: '📊 Click here to view Dashboards',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'create-dashboard': {
      keywords: ['create dashboard', 'new dashboard', 'add dashboard'],
      selectors: [
        'button:has-text("Create dashboard")',
        'button[aria-label*="Create dashboard"]',
        '[data-testid="create-dashboard"]'
      ],
      message: '➕ Click here to create a dashboard',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'alerts': {
      keywords: ['alerts', 'alert policies', 'notifications', 'incidents'],
      selectors: [
        'a[href*="/alerts"]',
        'nav a:has-text("Alerts")',
        'button:has-text("Alerts")',
        '[data-testid="alerts-link"]'
      ],
      message: '🚨 Click here to view Alerts',
      action: 'click',
      confidence: 0.95,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'create-alert': {
      keywords: ['create alert', 'new alert', 'add alert', 'alert policy'],
      selectors: [
        'button:has-text("Create alert")',
        'button[aria-label*="Create alert"]',
        '[data-testid="create-alert"]'
      ],
      message: '🚨 Click here to create an alert',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    // ========== QUERIES & EXPLORER ==========

    'query-builder': {
      keywords: ['query', 'nrql', 'query builder', 'data explorer'],
      selectors: [
        'a[href*="/query"]',
        'button:has-text("Query")',
        'nav a:has-text("Query your data")',
        '[data-testid="query-link"]'
      ],
      message: '🔍 Click here to query data',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'explorer': {
      keywords: ['explorer', 'entity explorer', 'services', 'entities'],
      selectors: [
        'a[href*="/explorer"]',
        'button:has-text("Explorer")',
        'nav a:has-text("Explorer")',
        '[data-testid="explorer-link"]'
      ],
      message: '🔎 Click here to explore entities',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    // ========== TRANSACTIONS & ERRORS ==========

    'transactions': {
      keywords: ['transactions', 'view transactions', 'transaction traces'],
      selectors: [
        'a[href*="/transactions"]',
        'button:has-text("Transactions")',
        'nav a:has-text("Transactions")',
        '[data-testid="transactions-link"]'
      ],
      message: '📈 Click here to view transactions',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'errors': {
      keywords: ['errors', 'error analytics', 'exceptions', 'error rate'],
      selectors: [
        'a[href*="/errors"]',
        'button:has-text("Errors")',
        'nav a:has-text("Errors")',
        '[data-testid="errors-link"]'
      ],
      message: '❌ Click here to view errors',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    'distributed-tracing': {
      keywords: ['distributed tracing', 'traces', 'tracing', 'trace'],
      selectors: [
        'a[href*="/distributed-tracing"]',
        'button:has-text("Distributed tracing")',
        'nav a:has-text("Distributed tracing")',
        '[data-testid="tracing-link"]'
      ],
      message: '🔗 Click here to view distributed tracing',
      action: 'click',
      confidence: 0.90,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    },

    // ========== TIME PICKER ==========

    'time-picker': {
      keywords: ['time range', 'change time', 'time picker', 'date range'],
      selectors: [
        'button[aria-label*="time"]',
        'button:has-text("Last 30")',
        '[data-testid="time-picker"]'
      ],
      message: '⏰ Click here to change time range',
      action: 'click',
      confidence: 0.85,
      context: ['one.newrelic.com/*', 'newrelic.com/*']
    }
  };

  // Export patterns
  window.__ZONEGUIDE_PATTERNS__ = {
    github: GITHUB_PATTERNS,
    linear: LINEAR_PATTERNS,
    figma: FIGMA_PATTERNS,
    newrelic: NEWRELIC_PATTERNS,

    /**
     * Get all patterns for current site
     */
    getPatterns: function() {
      const hostname = window.location.hostname;
      if (hostname.includes('github.com')) {
        return GITHUB_PATTERNS;
      } else if (hostname.includes('linear.app')) {
        return LINEAR_PATTERNS;
      } else if (hostname.includes('figma.com')) {
        return FIGMA_PATTERNS;
      } else if (hostname.includes('newrelic.com') || hostname.includes('one.newrelic.com')) {
        return NEWRELIC_PATTERNS;
      }
      return {};
    },

    /**
     * Get pattern by ID (searches all sites)
     */
    getPattern: function(id) {
      return GITHUB_PATTERNS[id] ||
             LINEAR_PATTERNS[id] ||
             FIGMA_PATTERNS[id] ||
             NEWRELIC_PATTERNS[id] ||
             null;
    },

    /**
     * Get all pattern IDs from current site
     */
    getPatternIds: function() {
      const patterns = this.getPatterns();
      return Object.keys(patterns);
    },

    /**
     * Get all pattern IDs from all sites
     */
    getAllPatternIds: function() {
      return [
        ...Object.keys(GITHUB_PATTERNS),
        ...Object.keys(LINEAR_PATTERNS),
        ...Object.keys(FIGMA_PATTERNS),
        ...Object.keys(NEWRELIC_PATTERNS)
      ];
    },

    /**
     * Get site-specific patterns by site name
     */
    getPatternsBySite: function(site) {
      const siteMap = {
        'github': GITHUB_PATTERNS,
        'linear': LINEAR_PATTERNS,
        'figma': FIGMA_PATTERNS,
        'newrelic': NEWRELIC_PATTERNS
      };
      return siteMap[site] || {};
    },

    /**
     * Get all supported sites
     */
    getSupportedSites: function() {
      return ['github', 'linear', 'figma', 'newrelic'];
    },

    /**
     * Detect current site
     */
    detectCurrentSite: function() {
      const hostname = window.location.hostname;
      if (hostname.includes('github.com')) return 'github';
      if (hostname.includes('linear.app')) return 'linear';
      if (hostname.includes('figma.com')) return 'figma';
      if (hostname.includes('newrelic.com') || hostname.includes('one.newrelic.com')) return 'newrelic';
      return null;
    },

    /**
     * Get total pattern count across all sites
     */
    getTotalPatternCount: function() {
      return Object.keys(GITHUB_PATTERNS).length +
             Object.keys(LINEAR_PATTERNS).length +
             Object.keys(FIGMA_PATTERNS).length +
             Object.keys(NEWRELIC_PATTERNS).length;
    }
  };

  console.log('[ZoneGuide Patterns] Pattern database loaded:',
    Object.keys(GITHUB_PATTERNS).length, 'GitHub,',
    Object.keys(LINEAR_PATTERNS).length, 'Linear,',
    Object.keys(FIGMA_PATTERNS).length, 'Figma,',
    Object.keys(NEWRELIC_PATTERNS).length, 'New Relic',
    '(' + window.__ZONEGUIDE_PATTERNS__.getTotalPatternCount(), 'total)');

})();
