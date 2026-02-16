/**
 * ZoneGuide Workflow Storage
 * Handles local persistence (IndexedDB) and cloud sync (Convex)
 *
 * Features:
 * - IndexedDB for offline-first storage
 * - Chrome storage for settings
 * - Convex sync (coming soon)
 * - Import/Export workflows as JSON
 */

(function() {
  'use strict';

  // IndexedDB configuration
  const DB_NAME = 'ZoneGuideDB';
  const DB_VERSION = 1;
  const WORKFLOWS_STORE = 'workflows';
  const RECORDINGS_STORE = 'recordings';

  let db = null;

  /**
   * Initialize IndexedDB
   */
  function initDB(callback) {
    if (db) {
      callback(null, db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = function(event) {
      console.error('[ZoneGuide Storage] IndexedDB error:', event.target.error);
      callback(event.target.error);
    };

    request.onsuccess = function(event) {
      db = event.target.result;
      console.log('[ZoneGuide Storage] IndexedDB initialized');
      callback(null, db);
    };

    request.onupgradeneeded = function(event) {
      const db = event.target.result;

      // Create workflows store
      if (!db.objectStoreNames.contains(WORKFLOWS_STORE)) {
        const workflowStore = db.createObjectStore(WORKFLOWS_STORE, {
          keyPath: 'id'
        });

        // Create indexes
        workflowStore.createIndex('domain', 'domain', { unique: false });
        workflowStore.createIndex('createdAt', 'createdAt', { unique: false });
        workflowStore.createIndex('name', 'name', { unique: false });

        console.log('[ZoneGuide Storage] Workflows store created');
      }

      // Create recordings store (for in-progress recordings)
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        db.createObjectStore(RECORDINGS_STORE, {
          keyPath: 'id'
        });

        console.log('[ZoneGuide Storage] Recordings store created');
      }
    };
  }

  /**
   * Save workflow to IndexedDB
   */
  function saveWorkflow(workflow, callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);

      // Add timestamps
      workflow.updatedAt = new Date().toISOString();
      if (!workflow.createdAt) {
        workflow.createdAt = workflow.updatedAt;
      }

      const request = store.put(workflow);

      request.onsuccess = function() {
        console.log('[ZoneGuide Storage] Workflow saved:', workflow.id);
        callback(null, workflow);

        // Also save to Chrome storage as backup
        saveToChromeStorage(workflow);
      };

      request.onerror = function(event) {
        console.error('[ZoneGuide Storage] Save failed:', event.target.error);
        callback(event.target.error);
      };
    });
  }

  /**
   * Get workflow by ID
   */
  function getWorkflow(workflowId, callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.get(workflowId);

      request.onsuccess = function(event) {
        callback(null, event.target.result);
      };

      request.onerror = function(event) {
        callback(event.target.error);
      };
    });
  }

  /**
   * Get all workflows
   */
  function getAllWorkflows(callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.getAll();

      request.onsuccess = function(event) {
        const workflows = event.target.result || [];
        // Sort by creation date (newest first)
        workflows.sort(function(a, b) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        callback(null, workflows);
      };

      request.onerror = function(event) {
        callback(event.target.error);
      };
    });
  }

  /**
   * Get workflows by domain
   */
  function getWorkflowsByDomain(domain, callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readonly');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const index = store.index('domain');
      const request = index.getAll(domain);

      request.onsuccess = function(event) {
        callback(null, event.target.result || []);
      };

      request.onerror = function(event) {
        callback(event.target.error);
      };
    });
  }

  /**
   * Delete workflow
   */
  function deleteWorkflow(workflowId, callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.delete(workflowId);

      request.onsuccess = function() {
        console.log('[ZoneGuide Storage] Workflow deleted:', workflowId);
        callback(null);

        // Also remove from Chrome storage
        deleteFromChromeStorage(workflowId);
      };

      request.onerror = function(event) {
        callback(event.target.error);
      };
    });
  }

  /**
   * Update workflow
   */
  function updateWorkflow(workflowId, updates, callback) {
    getWorkflow(workflowId, function(err, workflow) {
      if (err || !workflow) {
        callback(err || new Error('Workflow not found'));
        return;
      }

      // Merge updates
      Object.assign(workflow, updates);
      workflow.updatedAt = new Date().toISOString();

      saveWorkflow(workflow, callback);
    });
  }

  /**
   * Save to Chrome storage (backup)
   */
  function saveToChromeStorage(workflow) {
    try {
      chrome.storage.local.get(['workflows'], function(result) {
        const workflows = result.workflows || [];

        // Find and update or append
        const index = workflows.findIndex(function(wf) {
          return wf.id === workflow.id;
        });

        if (index >= 0) {
          workflows[index] = workflow;
        } else {
          workflows.push(workflow);
        }

        chrome.storage.local.set({ workflows: workflows }, function() {
          console.log('[ZoneGuide Storage] Chrome storage backup updated');
        });
      });
    } catch (e) {
      console.warn('[ZoneGuide Storage] Chrome storage backup failed:', e);
    }
  }

  /**
   * Delete from Chrome storage
   */
  function deleteFromChromeStorage(workflowId) {
    try {
      chrome.storage.local.get(['workflows'], function(result) {
        const workflows = result.workflows || [];
        const filtered = workflows.filter(function(wf) {
          return wf.id !== workflowId;
        });

        chrome.storage.local.set({ workflows: filtered });
      });
    } catch (e) {
      console.warn('[ZoneGuide Storage] Chrome storage delete failed:', e);
    }
  }

  /**
   * Export workflow as JSON
   */
  function exportWorkflow(workflow) {
    const json = JSON.stringify(workflow, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const filename = (workflow.name || 'workflow')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${workflow.id.substring(0, 8)}.json`;
    a.click();

    URL.revokeObjectURL(url);

    console.log('[ZoneGuide Storage] Workflow exported:', workflow.id);
  }

  /**
   * Import workflow from JSON
   */
  function importWorkflow(file, callback) {
    const reader = new FileReader();

    reader.onload = function(event) {
      try {
        const workflow = JSON.parse(event.target.result);

        // Validate workflow structure
        if (!workflow.id || !workflow.steps || !Array.isArray(workflow.steps)) {
          callback(new Error('Invalid workflow format'));
          return;
        }

        // Generate new ID to avoid conflicts
        workflow.id = `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        workflow.importedAt = new Date().toISOString();

        saveWorkflow(workflow, callback);
      } catch (error) {
        callback(error);
      }
    };

    reader.onerror = function(error) {
      callback(error);
    };

    reader.readAsText(file);
  }

  /**
   * Clear all workflows (for testing/reset)
   */
  function clearAllWorkflows(callback) {
    initDB(function(err, db) {
      if (err) {
        callback(err);
        return;
      }

      const transaction = db.transaction([WORKFLOWS_STORE], 'readwrite');
      const store = transaction.objectStore(WORKFLOWS_STORE);
      const request = store.clear();

      request.onsuccess = function() {
        console.log('[ZoneGuide Storage] All workflows cleared');
        callback(null);

        // Clear Chrome storage too
        chrome.storage.local.set({ workflows: [] });
      };

      request.onerror = function(event) {
        callback(event.target.error);
      };
    });
  }

  /**
   * Get storage statistics
   */
  function getStats(callback) {
    getAllWorkflows(function(err, workflows) {
      if (err) {
        callback(err);
        return;
      }

      const stats = {
        totalWorkflows: workflows.length,
        totalSteps: 0,
        domains: {},
        oldestWorkflow: null,
        newestWorkflow: null
      };

      workflows.forEach(function(workflow) {
        stats.totalSteps += workflow.steps.length;

        // Count by domain
        if (!stats.domains[workflow.domain]) {
          stats.domains[workflow.domain] = 0;
        }
        stats.domains[workflow.domain]++;

        // Track oldest/newest
        const created = new Date(workflow.createdAt);
        if (!stats.oldestWorkflow || created < new Date(stats.oldestWorkflow.createdAt)) {
          stats.oldestWorkflow = workflow;
        }
        if (!stats.newestWorkflow || created > new Date(stats.newestWorkflow.createdAt)) {
          stats.newestWorkflow = workflow;
        }
      });

      callback(null, stats);
    });
  }

  /**
   * Sync to Convex (TODO)
   */
  function syncToConvex(workflow, callback) {
    // TODO: Implement Convex sync
    console.log('[ZoneGuide Storage] Convex sync not yet implemented');
    if (callback) callback(new Error('Convex sync not implemented'));
  }

  // Export public API
  window.__ZONEGUIDE_STORAGE__ = {
    save: saveWorkflow,
    get: getWorkflow,
    getAll: getAllWorkflows,
    getByDomain: getWorkflowsByDomain,
    delete: deleteWorkflow,
    update: updateWorkflow,
    export: exportWorkflow,
    import: importWorkflow,
    clear: clearAllWorkflows,
    stats: getStats,
    syncToConvex: syncToConvex
  };

  // Auto-initialize
  initDB(function(err) {
    if (err) {
      console.error('[ZoneGuide Storage] Failed to initialize:', err);
    } else {
      console.log('[ZoneGuide Storage] Module loaded and ready');
    }
  });

})();
