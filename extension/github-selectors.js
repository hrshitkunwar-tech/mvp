/**
 * GitHub UI Element Selectors
 * Common patterns for GitHub navigation elements
 *
 * This library provides CSS selectors for common GitHub UI elements
 * to enable accurate visual guidance highlighting.
 */

(function() {
  'use strict';

  window.__GITHUB_SELECTORS__ = {
    // Navigation tabs (repository header)
    'pull_requests_tab': '.UnderlineNav-item[data-tab-item="pull-requests-tab"], .tabnav-tab[href*="/pulls"], nav[aria-label="Repository"] a[href*="/pulls"]',
    'issues_tab': '.UnderlineNav-item[data-tab-item="issues-tab"], .tabnav-tab[href*="/issues"], nav[aria-label="Repository"] a[href*="/issues"]',
    'code_tab': '.UnderlineNav-item[data-tab-item="code-tab"], nav[aria-label="Repository"] a[data-selected-links*="repo_source"]',
    'actions_tab': '.UnderlineNav-item[data-tab-item="actions-tab"], nav[aria-label="Repository"] a[href*="/actions"]',
    'projects_tab': '.UnderlineNav-item[data-tab-item="projects-tab"], nav[aria-label="Repository"] a[href*="/projects"]',
    'wiki_tab': '.UnderlineNav-item[data-tab-item="wiki-tab"], nav[aria-label="Repository"] a[href*="/wiki"]',
    'security_tab': '.UnderlineNav-item[data-tab-item="security-tab"], nav[aria-label="Repository"] a[href*="/security"]',
    'insights_tab': '.UnderlineNav-item[data-tab-item="insights-tab"], nav[aria-label="Repository"] a[href*="/pulse"]',
    'settings_tab': '.UnderlineNav-item[data-tab-item="settings-tab"], nav[aria-label="Repository"] a[href*="/settings"]',

    // Action buttons (primary CTAs)
    'new_pull_request': 'a[href*="/compare"], a.btn-primary[href*="/pull"]',
    'new_issue': 'a[href*="/issues/new"], a.btn-primary:contains("New issue")',
    'fork_button': 'button[data-hydro-click*="fork"], form[action*="/fork"] button',
    'star_button': 'button[data-hydro-click*="star"], form[action*="/star"] button',
    'watch_button': 'button[data-hydro-click*="watch"], details[data-view-component="true"] > summary',

    // Code navigation
    'add_file': 'button:contains("Add file"), details summary:contains("Add file")',
    'create_branch': 'button[data-hotkey="b"]',
    'find_file': 'button[data-hotkey="t"]',
    'code_button': 'button:contains("Code"), details summary:contains("Code")',

    // Pull Request / Issue specific
    'pr_commits_tab': '.tabnav-tab[href*="/commits"]',
    'pr_files_tab': '.tabnav-tab[href*="/files"]',
    'pr_checks_tab': '.tabnav-tab[href*="/checks"]',
    'pr_merge_button': 'button[data-disable-with*="Merging"], button:contains("Merge pull request")',
    'pr_close_button': 'button[name="comment_and_close"]',

    // Repository settings
    'settings_branches': 'a[href*="/settings/branches"]',
    'settings_webhooks': 'a[href*="/settings/hooks"]',
    'settings_collaborators': 'a[href*="/settings/access"]',

    /**
     * Get zone for a given element key
     * @param {string} elementKey - Key from this selector map
     * @returns {string} Zone identifier (center, arc-tl, arc-tr, arc-bl, arc-br)
     */
    getZone: function(elementKey) {
      var zoneMap = {
        // Top-left: navigation tabs
        'pull_requests_tab': 'arc-tl',
        'issues_tab': 'arc-tl',
        'code_tab': 'arc-tl',
        'actions_tab': 'arc-tl',
        'projects_tab': 'arc-tl',
        'wiki_tab': 'arc-tl',
        'security_tab': 'arc-tl',
        'insights_tab': 'arc-tl',
        'settings_tab': 'arc-tl',

        // Top-right: action buttons
        'fork_button': 'arc-tr',
        'star_button': 'arc-tr',
        'watch_button': 'arc-tr',
        'code_button': 'arc-tr',

        // Center: primary CTAs
        'new_pull_request': 'center',
        'new_issue': 'center',
        'add_file': 'center',
        'create_branch': 'center',
        'find_file': 'center',
        'pr_merge_button': 'center',
        'pr_close_button': 'center',

        // Bottom-left: sub-navigation
        'pr_commits_tab': 'arc-bl',
        'pr_files_tab': 'arc-bl',
        'pr_checks_tab': 'arc-bl',

        // Bottom-left: settings
        'settings_branches': 'arc-bl',
        'settings_webhooks': 'arc-bl',
        'settings_collaborators': 'arc-bl'
      };

      return zoneMap[elementKey] || 'center';
    },

    /**
     * Find an element using multiple selector fallbacks
     * @param {string} elementKey - Key from this selector map
     * @returns {Element|null} Found element or null
     */
    findElement: function(elementKey) {
      var selectorString = this[elementKey];
      if (!selectorString) return null;

      var selectors = selectorString.split(',').map(function(s) { return s.trim(); });

      for (var i = 0; i < selectors.length; i++) {
        try {
          var element = document.querySelector(selectors[i]);
          if (element) return element;
        } catch (e) {
          // Invalid selector, try next
          continue;
        }
      }

      return null;
    }
  };

  console.log('[Navigator] GitHub selectors loaded (' + Object.keys(window.__GITHUB_SELECTORS__).length + ' patterns)');
})();
