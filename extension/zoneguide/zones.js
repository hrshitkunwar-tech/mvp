/**
 * ZoneGuide - Zone Detection & Heatmap Rendering
 *
 * Divides the viewport into 5 zones for progressive disclosure:
 * - CENTER: Inner 40% of viewport (0.3-0.7 on both axes)
 * - ARC_TL: Top-left quadrant (excluding center)
 * - ARC_TR: Top-right quadrant (excluding center)
 * - ARC_BL: Bottom-left quadrant (excluding center)
 * - ARC_BR: Bottom-right quadrant (excluding center)
 *
 * Loaded as classic script (no ES6 modules) for MV3 content script compatibility.
 */

(function() {
  'use strict';

  const ZONES = Object.freeze({
    CENTER: 'center',
    ARC_TL: 'arc-tl',
    ARC_TR: 'arc-tr',
    ARC_BL: 'arc-bl',
    ARC_BR: 'arc-br'
  });

  /**
   * Determine which zone an element occupies based on its center point.
   * Uses normalized coordinates (0.0 to 1.0) relative to viewport.
   *
   * @param {Element} element - DOM element to check
   * @returns {string} Zone identifier (ZONES.CENTER, ZONES.ARC_TL, etc.)
   */
  function getZone(element) {
    const rect = element.getBoundingClientRect();

    // Calculate element's center point, normalized to viewport (0.0 - 1.0)
    const cx = (rect.left + rect.width / 2) / window.innerWidth;
    const cy = (rect.top + rect.height / 2) / window.innerHeight;

    // Clamp to 0-1 range (element might be partially off-screen)
    const x = Math.max(0, Math.min(1, cx));
    const y = Math.max(0, Math.min(1, cy));

    // Center star: inner 40% of viewport (0.3 to 0.7 on both axes)
    if (x > 0.3 && x < 0.7 && y > 0.3 && y < 0.7) {
      return ZONES.CENTER;
    }

    // Four corner arcs (remaining quadrants)
    if (x <= 0.5) {
      return y <= 0.5 ? ZONES.ARC_TL : ZONES.ARC_BL;
    } else {
      return y <= 0.5 ? ZONES.ARC_TR : ZONES.ARC_BR;
    }
  }

  /**
   * Show a zone heatmap overlay to guide the user's attention to a region.
   * Displays a radial gradient that fades out after the specified duration.
   *
   * @param {string} zone - Zone identifier (from ZONES constant)
   * @param {number} duration - How long to show (ms). 0 = permanent until manually removed
   * @returns {HTMLElement} The created overlay element
   */
  function showZoneHeatmap(zone, duration) {
    if (typeof duration === 'undefined') duration = 1500;

    // Remove any existing zone overlays first
    hideZoneHeatmap();

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'zg-zone-overlay zg-zone-' + zone;
    overlay.setAttribute('data-zoneguide', 'zone-overlay');
    overlay.setAttribute('aria-hidden', 'true');

    // Inject into DOM
    document.body.appendChild(overlay);

    // Auto-remove after duration (if specified)
    if (duration > 0) {
      setTimeout(function() {
        overlay.classList.add('zg-zone-fade-out');
        setTimeout(function() {
          if (overlay.parentNode) {
            overlay.remove();
          }
        }, 500); // Match fade-out animation duration
      }, duration);
    }

    return overlay;
  }

  /**
   * Remove all zone heatmap overlays from the page.
   */
  function hideZoneHeatmap() {
    const overlays = document.querySelectorAll('.zg-zone-overlay');
    overlays.forEach(function(overlay) {
      if (overlay.parentNode) {
        overlay.remove();
      }
    });
  }

  /**
   * Get the visual center point of a zone (for future arrow/pointer features).
   * Returns normalized coordinates (0.0 to 1.0).
   *
   * @param {string} zone - Zone identifier
   * @returns {{x: number, y: number}} Normalized center point
   */
  function getZoneCenter(zone) {
    const centers = {
      'center':  { x: 0.5, y: 0.5 },
      'arc-tl':  { x: 0.25, y: 0.25 },
      'arc-tr':  { x: 0.75, y: 0.25 },
      'arc-bl':  { x: 0.25, y: 0.75 },
      'arc-br':  { x: 0.75, y: 0.75 }
    };

    return centers[zone] || { x: 0.5, y: 0.5 };
  }

  /**
   * Check if an element is currently visible in the viewport.
   * Useful for determining if we need to scroll before highlighting.
   *
   * @param {Element} element - DOM element to check
   * @returns {boolean} True if element is at least partially visible
   */
  function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();

    return (
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  }

  /**
   * Smoothly scroll an element into view, centering it in the viewport.
   * Returns a promise that resolves when scroll is complete.
   *
   * @param {Element} element - DOM element to scroll to
   * @returns {Promise<void>}
   */
  function scrollToElement(element) {
    return new Promise(function(resolve) {
      // Check if already in view
      if (isElementInViewport(element)) {
        resolve();
        return;
      }

      // Scroll with smooth animation
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });

      // Wait for scroll to complete (estimate 500ms)
      setTimeout(resolve, 500);
    });
  }

  // Expose to global namespace for index.js
  window.__ZONEGUIDE_ZONES__ = {
    ZONES: ZONES,
    getZone: getZone,
    showZoneHeatmap: showZoneHeatmap,
    hideZoneHeatmap: hideZoneHeatmap,
    getZoneCenter: getZoneCenter,
    isElementInViewport: isElementInViewport,
    scrollToElement: scrollToElement
  };

  console.log('[ZoneGuide] zones.js loaded');

})();
