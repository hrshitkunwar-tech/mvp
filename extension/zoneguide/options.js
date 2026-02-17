/**
 * ZoneGuide Pattern Manager - Options Page Logic
 *
 * Handles all interactivity for the 5-tab options page:
 *   1. View Patterns  - browse all 100+ patterns organised by site
 *   2. Add / Edit     - create or modify custom patterns
 *   3. Manage Sites   - enable / disable site-level pattern matching
 *   4. Import/Export  - backup and restore patterns as JSON
 *   5. Analytics      - usage stats, top patterns, recent activity
 */

(function () {
  'use strict';

  // ============================================================
  // State
  // ============================================================
  let customPatterns = {};          // { id: { ...pattern, site, _custom: true } }
  let siteStates     = {            // per-site enabled flag
    github: true,
    linear: true,
    figma:  true,
    newrelic: true
  };
  let analytics = {                 // usage telemetry written by content scripts
    totalQueries:   0,
    matches:        {},             // { patternId: count }
    recentActivity: []              // [{ timestamp, site, patternId, matched }]
  };
  let editingPatternId = null;      // non-null while editing an existing custom pattern

  // Site display metadata
  const SITE_CONFIG = {
    github:   { label: 'GitHub',   color: '#24292e', icon: '🐙', url: 'github.com' },
    linear:   { label: 'Linear',   color: '#5e6ad2', icon: '📐', url: 'linear.app' },
    figma:    { label: 'Figma',    color: '#0acf83', icon: '🎨', url: 'figma.com' },
    newrelic: { label: 'New Relic',color: '#00b3a4', icon: '📊', url: 'one.newrelic.com' },
    custom:   { label: 'Custom',   color: '#f59e0b', icon: '⚙️', url: '' }
  };

  // ============================================================
  // Storage helpers (chrome.storage.local with localStorage fallback)
  // ============================================================
  const storage = {
    get(keys) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.get(keys, resolve));
      }
      const result = {};
      keys.forEach(k => {
        const v = localStorage.getItem('zoneguide_' + k);
        if (v !== null) {
          try { result[k] = JSON.parse(v); } catch (_) { /* ignore */ }
        }
      });
      return Promise.resolve(result);
    },

    set(obj) {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        return new Promise(resolve => chrome.storage.local.set(obj, resolve));
      }
      Object.entries(obj).forEach(([k, v]) => {
        localStorage.setItem('zoneguide_' + k, JSON.stringify(v));
      });
      return Promise.resolve();
    }
  };

  // ============================================================
  // Helpers
  // ============================================================
  function getBuiltinPatterns() {
    const P = window.__ZONEGUIDE_PATTERNS__;
    if (!P) return { github: {}, linear: {}, figma: {}, newrelic: {} };
    return {
      github:   P.github   || {},
      linear:   P.linear   || {},
      figma:    P.figma    || {},
      newrelic: P.newrelic || {}
    };
  }

  function getAllSites() {
    const base = ['github', 'linear', 'figma', 'newrelic'];
    // append any extra sites referenced in custom patterns
    Object.values(customPatterns).forEach(p => {
      const s = p.site;
      if (s && !base.includes(s)) base.push(s);
    });
    return base;
  }

  // ============================================================
  // Load persisted data
  // ============================================================
  async function loadData() {
    const data = await storage.get(['customPatterns', 'siteStates', 'analytics']);
    if (data.customPatterns) customPatterns = data.customPatterns;
    if (data.siteStates)     siteStates     = Object.assign({}, siteStates, data.siteStates);
    if (data.analytics)      analytics      = Object.assign({}, analytics,  data.analytics);
  }

  // ============================================================
  // Header stats
  // ============================================================
  function updateStats() {
    const builtins     = getBuiltinPatterns();
    const builtinCount = Object.values(builtins).reduce((s, p) => s + Object.keys(p).length, 0);
    const customCount  = Object.keys(customPatterns).length;
    const enabledCount = Object.values(siteStates).filter(Boolean).length;

    document.getElementById('total-patterns').textContent  = builtinCount + customCount;
    document.getElementById('enabled-sites').textContent   = enabledCount;
    document.getElementById('custom-patterns').textContent = customCount;
  }

  // ============================================================
  // Tab switching
  // ============================================================
  function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
      });
    });
  }

  function activateTab(name) {
    document.querySelectorAll('.tab').forEach(t =>
      t.classList.toggle('active', t.dataset.tab === name)
    );
    document.querySelectorAll('.tab-content').forEach(c =>
      c.classList.toggle('active', c.id === name + '-tab')
    );
  }

  // ============================================================
  // TAB 1 – View Patterns
  // ============================================================
  function renderPatterns(filterText, siteFilter) {
    filterText = (filterText || '').toLowerCase().trim();
    siteFilter = siteFilter || 'all';

    const builtins    = getBuiltinPatterns();
    const container   = document.getElementById('patterns-container');
    const allSites    = getAllSites();

    // Group custom patterns by site
    const customBySite = {};
    Object.entries(customPatterns).forEach(([id, p]) => {
      const s = p.site || 'custom';
      if (!customBySite[s]) customBySite[s] = {};
      customBySite[s][id] = p;
    });

    let html = '';

    allSites.forEach(site => {
      if (siteFilter !== 'all' && siteFilter !== site) return;

      const patterns = Object.assign({}, builtins[site] || {}, customBySite[site] || {});
      const cfg      = SITE_CONFIG[site] || { label: site, color: '#888', icon: '🌐', url: '' };
      const enabled  = siteStates[site] !== false;
      const totalForSite = Object.keys(patterns).length;

      let rows  = '';
      let count = 0;

      Object.entries(patterns).forEach(([id, p]) => {
        if (filterText) {
          const haystack = [id, p.message || ''].concat(p.keywords || []).join(' ').toLowerCase();
          if (!haystack.includes(filterText)) return;
        }
        count++;

        const isCustom   = p._custom || Object.prototype.hasOwnProperty.call(customPatterns, id);
        const usageCount = (analytics.matches && analytics.matches[id]) || 0;
        const confPct    = Math.round((p.confidence || 0) * 100);
        const keywords   = (p.keywords || []);
        const kwDisplay  = keywords.slice(0, 3).join(', ') + (keywords.length > 3 ? '…' : '');

        rows += `
          <div class="pattern-row${enabled ? '' : ' disabled'}" data-id="${id}" data-site="${site}">
            <div class="pattern-main">
              <span class="pattern-id">${escHtml(id)}</span>
              ${isCustom ? '<span class="badge badge-custom">Custom</span>' : ''}
              <span class="pattern-message">${escHtml(p.message || '')}</span>
            </div>
            <div class="pattern-meta">
              <span class="pattern-keywords" title="${escHtml(keywords.join(', '))}">
                ${escHtml(kwDisplay)}
              </span>
              <span class="pattern-confidence">${confPct}%</span>
              ${usageCount > 0 ? `<span class="pattern-usage">${usageCount} uses</span>` : ''}
              ${isCustom
                ? `<button class="btn-icon edit-btn" data-id="${id}" data-site="${site}" title="Edit pattern">✏️</button>`
                : ''}
            </div>
          </div>`;
      });

      // Skip site section if nothing matches the text filter
      if (filterText && count === 0) return;

      html += `
        <div class="site-section" id="site-section-${site}">
          <div class="site-section-header" style="--site-color: ${cfg.color}">
            <div class="site-section-title">
              <span class="site-icon">${cfg.icon}</span>
              <span class="site-name">${escHtml(cfg.label)}</span>
              <span class="pattern-count">
                ${filterText ? `${count} of ${totalForSite}` : count} pattern${count !== 1 ? 's' : ''}
              </span>
              ${!enabled ? '<span class="badge badge-disabled">Disabled</span>' : ''}
            </div>
            <button class="collapse-btn" data-site="${site}" title="Toggle collapse">▼</button>
          </div>
          <div class="patterns-list" id="patterns-list-${site}">
            ${rows || '<div class="no-patterns">No patterns match your search.</div>'}
          </div>
        </div>`;
    });

    container.innerHTML = html || '<div class="empty-state">No patterns found.</div>';

    // Attach edit buttons
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        openEditPattern(btn.dataset.id);
      });
    });

    // Attach collapse buttons
    container.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const list      = document.getElementById('patterns-list-' + btn.dataset.site);
        const collapsed = list.classList.toggle('collapsed');
        btn.textContent = collapsed ? '▶' : '▼';
      });
    });
  }

  function initPatternsTab() {
    renderPatterns();

    const searchInput = document.getElementById('pattern-search');
    const siteSelect  = document.getElementById('site-filter');

    searchInput.addEventListener('input',  () => renderPatterns(searchInput.value, siteSelect.value));
    siteSelect.addEventListener('change',  () => renderPatterns(searchInput.value, siteSelect.value));
  }

  // ============================================================
  // TAB 2 – Add / Edit Pattern
  // ============================================================
  function openEditPattern(id) {
    const p = customPatterns[id];
    if (!p) return;

    editingPatternId = id;
    activateTab('add-edit');

    const idField = document.getElementById('pattern-id');
    idField.value    = id;
    idField.disabled = true;

    document.getElementById('pattern-site').value       = p.site || 'custom';
    document.getElementById('pattern-keywords').value   = (p.keywords || []).join(', ');
    document.getElementById('pattern-selectors').value  = (p.selectors || []).join('\n');
    document.getElementById('pattern-message').value    = p.message  || '';
    document.getElementById('pattern-action').value     = p.action   || 'click';
    document.getElementById('pattern-confidence').value = p.confidence != null ? p.confidence : 0.85;
    document.getElementById('pattern-context').value    = (p.context || []).join('\n');

    const customGroup = document.getElementById('custom-hostname-group');
    customGroup.style.display = p.site === 'custom' ? 'block' : 'none';

    document.getElementById('delete-pattern').style.display = 'inline-flex';
    document.querySelector('#pattern-form button[type="submit"]').textContent = '💾 Update Pattern';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearForm() {
    editingPatternId = null;
    document.getElementById('pattern-form').reset();
    document.getElementById('pattern-id').disabled               = false;
    document.getElementById('custom-hostname-group').style.display = 'none';
    document.getElementById('delete-pattern').style.display      = 'none';
    document.querySelector('#pattern-form button[type="submit"]').textContent = '💾 Save Pattern';
    const msg = document.getElementById('form-message');
    msg.textContent = '';
    msg.className   = 'form-message';
  }

  function showFormMessage(text, type) {
    const el = document.getElementById('form-message');
    el.textContent = text;
    el.className   = 'form-message ' + type;
    setTimeout(() => {
      el.textContent = '';
      el.className   = 'form-message';
    }, 3500);
  }

  async function savePattern() {
    const id         = document.getElementById('pattern-id').value.trim();
    const site       = document.getElementById('pattern-site').value;
    const keywordsRaw= document.getElementById('pattern-keywords').value;
    const selectorsRaw = document.getElementById('pattern-selectors').value;
    const message    = document.getElementById('pattern-message').value.trim();
    const action     = document.getElementById('pattern-action').value;
    const confidence = parseFloat(document.getElementById('pattern-confidence').value);
    const contextRaw = document.getElementById('pattern-context').value;

    if (!/^[a-z0-9-]+$/.test(id)) {
      showFormMessage('Pattern ID must be lowercase letters, numbers, and hyphens only.', 'error');
      return;
    }

    if (!editingPatternId && customPatterns[id]) {
      showFormMessage('A pattern with this ID already exists. Edit it instead.', 'error');
      return;
    }

    const keywords  = keywordsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const selectors = selectorsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const context   = contextRaw.split('\n').map(s => s.trim()).filter(Boolean);

    if (!keywords.length) {
      showFormMessage('Please add at least one keyword.', 'error');
      return;
    }
    if (!selectors.length) {
      showFormMessage('Please add at least one CSS selector.', 'error');
      return;
    }

    customPatterns[id] = {
      site, keywords, selectors, message, action, confidence,
      ...(context.length ? { context } : {}),
      _custom: true
    };

    await storage.set({ customPatterns });
    showFormMessage('Pattern "' + id + '" saved!', 'success');
    clearForm();
    renderPatterns();
    updateStats();
    document.getElementById('custom-count').textContent = Object.keys(customPatterns).length;
  }

  function initAddEditTab() {
    const siteSelect    = document.getElementById('pattern-site');
    const customGroup   = document.getElementById('custom-hostname-group');

    siteSelect.addEventListener('change', () => {
      customGroup.style.display = siteSelect.value === 'custom' ? 'block' : 'none';
    });

    document.getElementById('clear-form').addEventListener('click', clearForm);

    document.getElementById('delete-pattern').addEventListener('click', async () => {
      if (!editingPatternId) return;
      if (!confirm('Delete pattern "' + editingPatternId + '"? This cannot be undone.')) return;
      delete customPatterns[editingPatternId];
      await storage.set({ customPatterns });
      showFormMessage('Pattern deleted.', 'success');
      clearForm();
      renderPatterns();
      updateStats();
      document.getElementById('custom-count').textContent = Object.keys(customPatterns).length;
    });

    document.getElementById('pattern-form').addEventListener('submit', async e => {
      e.preventDefault();
      await savePattern();
    });
  }

  // ============================================================
  // TAB 3 – Manage Sites
  // ============================================================
  function initSitesTab() {
    document.querySelectorAll('.site-toggle').forEach(toggle => {
      const site = toggle.dataset.site;
      toggle.checked = siteStates[site] !== false;

      toggle.addEventListener('change', async () => {
        siteStates[site] = toggle.checked;
        await storage.set({ siteStates });
        renderPatterns();
        updateStats();
      });
    });

    refreshSiteUsageBadges();
  }

  function refreshSiteUsageBadges() {
    const builtins = getBuiltinPatterns();
    ['github', 'linear', 'figma', 'newrelic'].forEach(site => {
      const el = document.getElementById(site + '-usage');
      if (!el) return;
      const total = Object.keys(builtins[site] || {}).reduce(
        (sum, id) => sum + ((analytics.matches && analytics.matches[id]) || 0), 0
      );
      el.textContent = total + ' use' + (total !== 1 ? 's' : '');
    });
  }

  // ============================================================
  // TAB 4 – Import / Export
  // ============================================================
  function initImportExportTab() {
    document.getElementById('export-btn').addEventListener('click', exportPatterns);

    document.getElementById('import-btn').addEventListener('click', () =>
      document.getElementById('import-file').click()
    );

    document.getElementById('import-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) processImportFile(file);
      e.target.value = '';
    });

    // Drag-and-drop
    const zone = document.getElementById('import-zone');
    zone.addEventListener('click', () => document.getElementById('import-file').click());
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processImportFile(file);
    });

    document.getElementById('custom-count').textContent = Object.keys(customPatterns).length;
  }

  function exportPatterns() {
    const builtins  = getBuiltinPatterns();
    const timestamp = new Date().toISOString();

    const payload = {
      version:  '1.0',
      exported: timestamp,
      patterns: {},
      settings: {},
      analytics: {}
    };

    if (document.getElementById('export-github').checked)   payload.patterns.github   = builtins.github;
    if (document.getElementById('export-linear').checked)   payload.patterns.linear   = builtins.linear;
    if (document.getElementById('export-figma').checked)    payload.patterns.figma    = builtins.figma;
    if (document.getElementById('export-newrelic').checked) payload.patterns.newrelic = builtins.newrelic;
    if (document.getElementById('export-custom').checked)   payload.patterns.custom   = customPatterns;
    if (document.getElementById('export-settings').checked) {
      payload.settings  = { siteStates };
      payload.analytics = analytics;
    }

    const json  = JSON.stringify(payload, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'zoneguide-patterns-' + timestamp.slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function processImportFile(file) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        await importPatterns(data);
      } catch (err) {
        showImportStatus('Invalid JSON: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  }

  async function importPatterns(data) {
    if (!data.patterns && !data.settings) {
      showImportStatus('Unrecognised format — missing "patterns" key.', 'error');
      return;
    }

    const mode = document.querySelector('input[name="import-mode"]:checked').value;
    if (mode === 'replace') {
      if (!confirm('This will replace ALL custom patterns. Are you sure?')) return;
      customPatterns = {};
    }

    let imported = 0;
    if (data.patterns && data.patterns.custom) {
      Object.entries(data.patterns.custom).forEach(([id, p]) => {
        customPatterns[id] = Object.assign({}, p, { _custom: true });
        imported++;
      });
    }

    if (data.settings && data.settings.siteStates) {
      siteStates = Object.assign({}, siteStates, data.settings.siteStates);
      // Sync toggle UI
      document.querySelectorAll('.site-toggle').forEach(t => {
        t.checked = siteStates[t.dataset.site] !== false;
      });
    }

    await storage.set({ customPatterns, siteStates });
    showImportStatus('Imported ' + imported + ' custom pattern' + (imported !== 1 ? 's' : '') + '.', 'success');
    renderPatterns();
    updateStats();
    document.getElementById('custom-count').textContent = Object.keys(customPatterns).length;
  }

  function showImportStatus(text, type) {
    const el = document.getElementById('import-status');
    el.textContent = text;
    el.className   = 'import-status ' + type;
    setTimeout(() => {
      el.textContent = '';
      el.className   = 'import-status';
    }, 4500);
  }

  // ============================================================
  // TAB 5 – Analytics
  // ============================================================
  function renderAnalytics() {
    const matches      = analytics.matches      || {};
    const totalQueries = analytics.totalQueries || 0;
    const totalMatches = Object.values(matches).reduce((s, v) => s + v, 0);
    const successRate  = totalQueries > 0 ? Math.round((totalMatches / totalQueries) * 100) : 0;

    document.getElementById('total-queries').textContent     = totalQueries;
    document.getElementById('successful-matches').textContent = totalMatches;
    document.getElementById('success-rate').textContent      = successRate + '%';

    // Most-used site
    const builtins   = getBuiltinPatterns();
    const siteCounts = {};
    Object.entries(builtins).forEach(([site, patterns]) => {
      siteCounts[site] = Object.keys(patterns).reduce((s, id) => s + (matches[id] || 0), 0);
    });
    const best = Object.entries(siteCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('most-used-site').textContent =
      best && best[1] > 0
        ? best[0].charAt(0).toUpperCase() + best[0].slice(1)
        : '-';

    renderTopPatternsChart(matches);
    renderSiteUsageChart(siteCounts);
    renderRecentActivity();
  }

  function renderTopPatternsChart(matches) {
    const container = document.getElementById('top-patterns-chart');
    const sorted    = Object.entries(matches).sort((a, b) => b[1] - a[1]).slice(0, 10);

    if (!sorted.length) {
      container.innerHTML = '<p class="no-data">No usage data yet. Start using ZoneGuide!</p>';
      return;
    }

    const max = sorted[0][1] || 1;
    container.innerHTML = sorted.map(([id, count]) => `
      <div class="chart-bar-row">
        <span class="chart-label" title="${escHtml(id)}">${escHtml(id)}</span>
        <div class="chart-bar-wrap">
          <div class="chart-bar" style="width:${Math.round((count / max) * 100)}%"></div>
          <span class="chart-value">${count}</span>
        </div>
      </div>`).join('');
  }

  function renderSiteUsageChart(siteCounts) {
    const container = document.getElementById('site-usage-chart');
    const sorted    = Object.entries(siteCounts).sort((a, b) => b[1] - a[1]);
    const max       = Math.max(...sorted.map(([, v]) => v), 1);

    const colors = {
      github: '#24292e', linear: '#5e6ad2', figma: '#0acf83', newrelic: '#00b3a4'
    };

    if (!sorted.some(([, v]) => v > 0)) {
      container.innerHTML = '<p class="no-data">No usage data yet. Start using ZoneGuide!</p>';
      return;
    }

    container.innerHTML = sorted.map(([site, count]) => {
      const label = (SITE_CONFIG[site] || { label: site }).label;
      const color = colors[site] || '#888';
      return `
        <div class="chart-bar-row">
          <span class="chart-label">${escHtml(label)}</span>
          <div class="chart-bar-wrap">
            <div class="chart-bar" style="width:${Math.round((count / max) * 100)}%;background:${color}"></div>
            <span class="chart-value">${count}</span>
          </div>
        </div>`;
    }).join('');
  }

  function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    const activity  = (analytics.recentActivity || []).slice().reverse().slice(0, 20);

    if (!activity.length) {
      container.innerHTML = '<p class="no-data">No recent activity</p>';
      return;
    }

    container.innerHTML = activity.map(item => {
      const time    = item.timestamp ? new Date(item.timestamp).toLocaleString() : '—';
      const site    = item.site     || 'unknown';
      const pattern = item.patternId || item.query || '—';
      const matched = item.matched;
      return `
        <div class="activity-item">
          <span class="activity-time">${time}</span>
          <span class="activity-site">${escHtml(site)}</span>
          <span class="activity-pattern">${escHtml(pattern)}</span>
          <span class="activity-status ${matched ? 'success' : 'fail'}">${matched ? '✓' : '✗'}</span>
        </div>`;
    }).join('');
  }

  function initAnalyticsTab() {
    document.getElementById('reset-analytics').addEventListener('click', async () => {
      if (!confirm('Reset all analytics? This cannot be undone.')) return;
      analytics = { totalQueries: 0, matches: {}, recentActivity: [] };
      await storage.set({ analytics });
      renderAnalytics();
      refreshSiteUsageBadges();
    });

    document.getElementById('export-analytics').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'zoneguide-analytics-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    renderAnalytics();
  }

  // ============================================================
  // XSS-safe HTML escaping
  // ============================================================
  function escHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  // ============================================================
  // Initialise
  // ============================================================
  async function init() {
    await loadData();
    initTabs();
    initPatternsTab();
    initAddEditTab();
    initSitesTab();
    initImportExportTab();
    initAnalyticsTab();
    updateStats();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
