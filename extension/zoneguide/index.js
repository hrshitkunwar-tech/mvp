/**
 * ZoneGuide - AI-Powered Interactive UI Navigation
 * Entry Point & Public API
 *
 * This module integrates with Navigator extension to provide
 * visual step-by-step guidance through workflows.
 *
 * Loaded as classic script (no ES6 modules) for MV3 content script compatibility.
 */

(function() {
  'use strict';

  // Wait for zones.js to load
  if (!window.__ZONEGUIDE_ZONES__) {
    console.error('[ZoneGuide] zones.js must be loaded first');
    return;
  }

  const zones = window.__ZONEGUIDE_ZONES__;

  // Module state
  const state = {
    mode: 'idle', // 'idle' | 'recording' | 'playing'
    version: '1.0.0',
    initialized: false
  };

  /**
   * Initialize ZoneGuide module.
   * Called automatically when content script loads.
   */
  function init() {
    if (state.initialized) {
      console.warn('[ZoneGuide] Already initialized');
      return;
    }

    state.initialized = true;

    // Listen for messages from background/sidepanel
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async responses
    });

    console.log('[ZoneGuide] Module initialized v' + state.version);
  }

  /**
   * Handle messages from background script or sidepanel.
   *
   * @param {Object} message - Message object
   * @param {Object} sender - Sender info
   * @param {Function} sendResponse - Response callback
   */
  function handleMessage(message, sender, sendResponse) {
    if (!message.type || !message.type.startsWith('ZONEGUIDE_')) {
      return; // Not for us
    }

    console.log('[ZoneGuide] Received message:', message.type);

    switch (message.type) {
      case 'ZONEGUIDE_GET_STATE':
        sendResponse({ state: state });
        break;

      case 'ZONEGUIDE_SHOW_ZONE':
        // Test command for Phase 1
        if (message.payload && message.payload.zone) {
          zones.showZoneHeatmap(message.payload.zone, message.payload.duration || 1500);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Missing zone parameter' });
        }
        break;

      case 'ZONEGUIDE_HIDE_ZONE':
        zones.hideZoneHeatmap();
        sendResponse({ success: true });
        break;

      default:
        console.warn('[ZoneGuide] Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }

  /**
   * Public API exposed to window for testing and future phases.
   */
  const ZoneGuide = {
    // Zone utilities
    ZONES: zones.ZONES,
    getZone: zones.getZone,
    showZoneHeatmap: zones.showZoneHeatmap,
    hideZoneHeatmap: zones.hideZoneHeatmap,
    getZoneCenter: zones.getZoneCenter,
    isElementInViewport: zones.isElementInViewport,
    scrollToElement: zones.scrollToElement,

    // State access
    getState: function() {
      return {
        mode: state.mode,
        version: state.version,
        initialized: state.initialized
      };
    },

    // Version
    version: state.version,

    // Test helpers (for DevTools console testing)
    test: {
      showZone: function(zone, duration) {
        return zones.showZoneHeatmap(zone, duration);
      },
      hideZone: function() {
        return zones.hideZoneHeatmap();
      },
      getElementZone: function(element) {
        return zones.getZone(element);
      }
    }
  };

  // Expose to window for DevTools testing
  window.__ZONEGUIDE__ = ZoneGuide;

  // Initialize on load
  init();

  // Also expose init function for content-script.js integration
  window.__ZONEGUIDE_INIT__ = init;

  console.log('[ZoneGuide] index.js loaded - API available at window.__ZONEGUIDE__');

})();
