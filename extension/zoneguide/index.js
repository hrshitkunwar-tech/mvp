/**
 * ZoneGuide - AI-Powered Interactive UI Navigation
 * Entry Point & Public API
 *
 * This module integrates with Navigator extension to provide
 * visual step-by-step guidance through workflows.
 *
 * Loaded as classic script (no ES6 modules) for MV3 content script compatibility.
 */

(function () {
  'use strict';

  // Wait for zones.js to load
  if (!window.__ZONEGUIDE_ZONES__) {
    console.error('[ZoneGuide] zones.js must be loaded first');
    return;
  }

  var zones = window.__ZONEGUIDE_ZONES__;

  // Module state
  var state = {
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

    // Listen for messages via window.postMessage (from content-script bridge)
    window.addEventListener('message', function (event) {
      // Only accept messages from same origin
      if (event.source !== window) return;

      var message = event.data;
      if (!message || !message.type || !message.type.startsWith('ZONEGUIDE_')) return;

      console.log('[ZoneGuide] Received postMessage:', message.type);

      // Readiness check - respond to PING with PONG
      if (message.type === 'ZONEGUIDE_PING') {
        window.postMessage({ type: 'ZONEGUIDE_PONG' }, '*');
        return;
      }

      // Call handleMessage with mock sender and response callback
      handleMessage(message, {}, function (response) {
        // Send response back to content script
        window.postMessage({
          type: 'ZONEGUIDE_RESPONSE',
          payload: response
        }, '*');
      });
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
        if (message.payload && message.payload.zone) {
          var zone = message.payload.zone;
          var duration = typeof message.payload.duration !== 'undefined' ? message.payload.duration : 2500;
          var selector = message.payload.selector;
          var instruction = message.payload.instruction;

          // If selector provided, try to highlight specific element
          if (selector) {
            try {
              var element = null;
              try {
                element = document.querySelector(selector);
              } catch (e) {
                // Selector failed (likely invalid syntax from LLM). Try to auto-fix.
                console.warn('[ZoneGuide] Invalid selector:', selector, 'Trying fixes...');

                // Fix 1: attribute="value" -> [attribute="value"]
                if (selector.indexOf('=') > 0 && !selector.startsWith('[')) {
                  try { element = document.querySelector('[' + selector + ']'); } catch (err) { }
                }

                // Fix 3: AGGRESSIVE FALLBACK - Extract value from any selector like [x="val"] or x="val"
                if (!element && selector.indexOf('=') > 0) {
                  // Extract "issues-tab" from 'data-tab-item="issues-tab"'
                  var match = selector.match(/=["']?([^"']+)["']?/);
                  if (match && match[1]) {
                    var val = match[1];
                    console.log('[ZoneGuide] Selector fallback: trying #' + val);
                    try { element = document.querySelector('#' + val); } catch (err) { }
                    if (!element) try { element = document.querySelector('.' + val); } catch (err) { }
                    if (!element) try { element = document.querySelector('[id*="' + val + '"]'); } catch (err) { }
                  }
                }

                // Fix 4: ULTIMATE FALLBACK - Text Content Search
                if (!element) {
                  // Clean selector to get potential text (e.g. "Issues")
                  // If selector was 'data-tab="issues"', val is "issues".
                  // If selector was "Issues", we use that.
                  var textToFind = selector.replace(/[^a-zA-Z0-9 ]/g, " ").trim();
                  // If extract from attribute failed, use raw selector if it looks like text
                  if (match && match[1]) textToFind = match[1];

                  if (textToFind.length > 2) {
                    console.log('[ZoneGuide] Text fallback: searching for "' + textToFind + '"');
                    // Search specific tags first
                    var candidates = document.querySelectorAll('a, button, span, div[role="button"], li');
                    for (var i = 0; i < candidates.length; i++) {
                      if (candidates[i].textContent.trim().toLowerCase() === textToFind.toLowerCase()) {
                        element = candidates[i];
                        break;
                      }
                      // Partial match for longer text
                      if (candidates[i].textContent.trim().toLowerCase().includes(textToFind.toLowerCase()) && candidates[i].textContent.length < 50) {
                        element = candidates[i];
                        // Continue searching for exact match, but keep this as backup? No, first decent match.
                        break;
                      }
                    }
                  }
                }

                // Fix 2: "some-id" -> "#some-id" (if it looks like an ID)
                if (!element && /^[a-zA-Z0-9-_]+$/.test(selector)) {
                  try { element = document.querySelector('#' + selector); } catch (err) { }
                  if (!element) try { element = document.querySelector('.' + selector); } catch (err) { }
                }
              }

              if (element) {
                // AUTO-DETECT ZONE from actual element position (Fixes LLM hallucination)
                var realZone = zones.getZone(element);
                console.log('[ZoneGuide] Auto-detected zone:', realZone, 'for', selector);
                zone = realZone; // Override the passed zone

                // Scroll element into view if needed
                (zones.isElementInViewport(element) ? Promise.resolve() : zones.scrollToElement(element)).then(function () {
                  // Show zone overlay after scroll
                  zones.showZoneHeatmap(zone, duration);

                  // NEW: Show persistent pointer arrow
                  zones.showPointerArrow(zone, element, duration);

                  // Clear previous effects
                  document.querySelectorAll('.zg-element-highlight').forEach(function (el) {
                    el.classList.remove('zg-element-highlight');
                  });

                  // Add element highlight (boundary box)
                  element.classList.add('zg-element-highlight');

                  // Show tooltip if instruction provided
                  if (instruction) {
                    zones.showTooltip(element, instruction);
                  }

                  if (duration > 0) {
                    setTimeout(function () {
                      element.classList.remove('zg-element-highlight');
                      zones.hideTooltip();
                    }, duration);
                  }
                });

                sendResponse({ success: true, found_element: true });
                return true;
              }
            } catch (e) {
              console.warn('[ZoneGuide] Selector failed:', selector, e);
            }
          }

          // Fallback: just show zone overlay
          zones.showZoneHeatmap(zone, duration);
          sendResponse({ success: true, found_element: false });
        } else {
          sendResponse({ success: false, error: 'Missing zone parameter' });
        }
        break;

      case 'ZONEGUIDE_HIDE_ZONE':
        zones.hideZoneHeatmap();
        zones.hideTooltip();

        // Remove pointers
        var pointers = document.querySelectorAll('.zg-pointer-arrow');
        pointers.forEach(function (el) { el.remove(); });

        document.querySelectorAll('.zg-element-highlight').forEach(function (el) {
          el.classList.remove('zg-element-highlight');
        });
        document.querySelectorAll('.zg-element-pulse').forEach(function (el) {
          el.classList.remove('zg-element-pulse');
        });
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
  var ZoneGuide = {
    // Zone utilities
    ZONES: zones.ZONES,
    getZone: zones.getZone,
    showZoneHeatmap: zones.showZoneHeatmap,
    hideZoneHeatmap: zones.hideZoneHeatmap,
    getZoneCenter: zones.getZoneCenter,
    isElementInViewport: zones.isElementInViewport,
    scrollToElement: zones.scrollToElement,

    // State access
    getState: function () {
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
      showZone: function (zone, duration) {
        return zones.showZoneHeatmap(zone, duration);
      },
      hideZone: function () {
        return zones.hideZoneHeatmap();
      },
      getElementZone: function (element) {
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
