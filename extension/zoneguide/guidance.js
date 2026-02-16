/**
 * ZoneGuide Enhanced Visual Guidance System
 * "Spotlight + Bouncing Arrow" approach
 *
 * Features:
 * - Page dimming overlay (moderate 60% opacity)
 * - Element spotlight (keeps target bright)
 * - Bouncing arrow pointing to target
 * - Optional floating instruction tooltip
 * - User can toggle text guidance on/off
 */

(function() {
  'use strict';

  // Guidance state
  let isActive = false;
  let currentTarget = null;
  let showTextGuidance = true; // User preference

  // UI elements
  let dimOverlay = null;
  let spotlight = null;
  let arrow = null;
  let tooltip = null;

  /**
   * Initialize guidance system
   */
  function init() {
    createUIElements();

    // Load user preferences
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['guidanceTextEnabled'], function(result) {
        showTextGuidance = result.guidanceTextEnabled !== false; // Default true
      });
    }

    console.log('[ZoneGuide Guidance] System initialized');
  }

  /**
   * Create UI elements
   */
  function createUIElements() {
    // Dim overlay
    dimOverlay = document.createElement('div');
    dimOverlay.className = 'zg-guidance-dim';
    dimOverlay.style.display = 'none';

    // Spotlight (reverse mask - shows element)
    spotlight = document.createElement('div');
    spotlight.className = 'zg-guidance-spotlight';
    spotlight.style.display = 'none';

    // Bouncing arrow
    arrow = document.createElement('div');
    arrow.className = 'zg-guidance-arrow';
    arrow.innerHTML = `
      <svg width="60" height="60" viewBox="0 0 60 60" class="zg-arrow-svg">
        <path d="M30 10 L30 40 M30 40 L20 30 M30 40 L40 30"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"/>
        <circle cx="30" cy="45" r="3" fill="currentColor"/>
      </svg>
    `;
    arrow.style.display = 'none';

    // Floating tooltip
    tooltip = document.createElement('div');
    tooltip.className = 'zg-guidance-tooltip';
    tooltip.style.display = 'none';

    // Append to body
    document.body.appendChild(dimOverlay);
    document.body.appendChild(spotlight);
    document.body.appendChild(arrow);
    document.body.appendChild(tooltip);
  }

  /**
   * Show guidance for specific element
   * @param {HTMLElement|string} target - Element or CSS selector
   * @param {Object} options - Configuration options
   */
  function showGuidance(target, options = {}) {
    // Get element
    const element = typeof target === 'string'
      ? document.querySelector(target)
      : target;

    if (!element) {
      console.warn('[ZoneGuide Guidance] Element not found:', target);
      return;
    }

    const config = {
      message: options.message || 'Click here to continue',
      arrowPosition: options.arrowPosition || 'top', // top, bottom, left, right, auto
      duration: options.duration || 0, // 0 = stay until dismissed
      hideOnClick: options.hideOnClick !== false,
      dimOpacity: options.dimOpacity || 0.6,
      ...options
    };

    currentTarget = element;
    isActive = true;

    // Position and show dim overlay
    showDimOverlay(config.dimOpacity);

    // Position and show spotlight on element
    showSpotlight(element);

    // Position and show arrow
    showArrow(element, config.arrowPosition);

    // Show tooltip if text guidance enabled
    if (showTextGuidance && config.message) {
      showTooltip(element, config.message, config.arrowPosition);
    }

    // Auto-hide after duration
    if (config.duration > 0) {
      setTimeout(() => hideGuidance(), config.duration);
    }

    // Hide on click
    if (config.hideOnClick) {
      element.addEventListener('click', handleTargetClick, { once: true });
    }

    // Hide on escape key
    document.addEventListener('keydown', handleEscapeKey);

    console.log('[ZoneGuide Guidance] Showing guidance for:', element);
  }

  /**
   * Show dim overlay
   */
  function showDimOverlay(opacity) {
    dimOverlay.style.opacity = opacity;
    dimOverlay.style.display = 'block';

    // Fade in
    setTimeout(() => {
      dimOverlay.classList.add('zg-guidance-active');
    }, 10);
  }

  /**
   * Show spotlight on element
   */
  function showSpotlight(element) {
    const rect = element.getBoundingClientRect();

    // Position spotlight
    spotlight.style.left = `${rect.left}px`;
    spotlight.style.top = `${rect.top}px`;
    spotlight.style.width = `${rect.width}px`;
    spotlight.style.height = `${rect.height}px`;
    spotlight.style.display = 'block';

    // Animate in
    setTimeout(() => {
      spotlight.classList.add('zg-guidance-active');
    }, 10);

    // Update on scroll/resize
    updateSpotlightOnScroll(element);
  }

  /**
   * Update spotlight position on scroll
   */
  function updateSpotlightOnScroll(element) {
    const updatePosition = () => {
      if (!isActive) return;

      const rect = element.getBoundingClientRect();
      spotlight.style.left = `${rect.left}px`;
      spotlight.style.top = `${rect.top}px`;

      // Update arrow and tooltip too
      if (arrow.style.display !== 'none') {
        const arrowPos = arrow.dataset.position || 'top';
        positionArrow(element, arrowPos);
      }

      if (tooltip.style.display !== 'none' && showTextGuidance) {
        const tooltipPos = tooltip.dataset.position || 'top';
        positionTooltip(element, tooltipPos);
      }
    };

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });
  }

  /**
   * Show bouncing arrow
   */
  function showArrow(element, position) {
    arrow.dataset.position = position;
    positionArrow(element, position);
    arrow.style.display = 'block';

    // Animate in
    setTimeout(() => {
      arrow.classList.add('zg-guidance-active');
    }, 10);
  }

  /**
   * Position arrow relative to element
   */
  function positionArrow(element, position) {
    const rect = element.getBoundingClientRect();
    const arrowSize = 60;
    const offset = 20;

    let left, top;

    if (position === 'auto') {
      // Auto-detect best position based on viewport
      position = detectBestArrowPosition(rect);
    }

    switch (position) {
      case 'top':
        left = rect.left + rect.width / 2 - arrowSize / 2;
        top = rect.top - arrowSize - offset;
        arrow.style.transform = 'rotate(0deg)';
        break;

      case 'bottom':
        left = rect.left + rect.width / 2 - arrowSize / 2;
        top = rect.bottom + offset;
        arrow.style.transform = 'rotate(180deg)';
        break;

      case 'left':
        left = rect.left - arrowSize - offset;
        top = rect.top + rect.height / 2 - arrowSize / 2;
        arrow.style.transform = 'rotate(-90deg)';
        break;

      case 'right':
        left = rect.right + offset;
        top = rect.top + rect.height / 2 - arrowSize / 2;
        arrow.style.transform = 'rotate(90deg)';
        break;

      default:
        left = rect.left + rect.width / 2 - arrowSize / 2;
        top = rect.top - arrowSize - offset;
        arrow.style.transform = 'rotate(0deg)';
    }

    arrow.style.left = `${left}px`;
    arrow.style.top = `${top}px`;
  }

  /**
   * Detect best arrow position based on available space
   */
  function detectBestArrowPosition(rect) {
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = viewportWidth - rect.right;

    // Find position with most space
    const spaces = {
      top: spaceTop,
      bottom: spaceBottom,
      left: spaceLeft,
      right: spaceRight
    };

    return Object.keys(spaces).reduce((a, b) =>
      spaces[a] > spaces[b] ? a : b
    );
  }

  /**
   * Show tooltip with instruction
   */
  function showTooltip(element, message, arrowPosition) {
    tooltip.textContent = message;
    tooltip.dataset.position = arrowPosition;
    positionTooltip(element, arrowPosition);
    tooltip.style.display = 'block';

    // Animate in
    setTimeout(() => {
      tooltip.classList.add('zg-guidance-active');
    }, 10);
  }

  /**
   * Position tooltip relative to element
   */
  function positionTooltip(element, arrowPosition) {
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const offset = 100; // Offset from arrow

    let left, top;

    switch (arrowPosition) {
      case 'top':
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.top - tooltipRect.height - offset;
        break;

      case 'bottom':
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.bottom + offset;
        break;

      case 'left':
        left = rect.left - tooltipRect.width - offset;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;

      case 'right':
        left = rect.right + offset;
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        break;

      default:
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        top = rect.top - tooltipRect.height - offset;
    }

    // Keep tooltip in viewport
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Hide guidance
   */
  function hideGuidance() {
    if (!isActive) return;

    isActive = false;
    currentTarget = null;

    // Fade out
    dimOverlay.classList.remove('zg-guidance-active');
    spotlight.classList.remove('zg-guidance-active');
    arrow.classList.remove('zg-guidance-active');
    tooltip.classList.remove('zg-guidance-active');

    // Hide after animation
    setTimeout(() => {
      dimOverlay.style.display = 'none';
      spotlight.style.display = 'none';
      arrow.style.display = 'none';
      tooltip.style.display = 'none';
    }, 300);

    // Remove event listeners
    document.removeEventListener('keydown', handleEscapeKey);

    console.log('[ZoneGuide Guidance] Hidden');
  }

  /**
   * Handle target element click
   */
  function handleTargetClick() {
    hideGuidance();
  }

  /**
   * Handle escape key
   */
  function handleEscapeKey(event) {
    if (event.key === 'Escape') {
      hideGuidance();
    }
  }

  /**
   * Toggle text guidance on/off
   */
  function toggleTextGuidance(enabled) {
    showTextGuidance = enabled;

    // Save preference
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ guidanceTextEnabled: enabled });
    }

    // Update current tooltip visibility
    if (isActive) {
      if (enabled && currentTarget) {
        const message = tooltip.textContent || 'Click here to continue';
        const position = arrow.dataset.position || 'top';
        showTooltip(currentTarget, message, position);
      } else {
        tooltip.style.display = 'none';
      }
    }

    console.log('[ZoneGuide Guidance] Text guidance:', enabled ? 'enabled' : 'disabled');
  }

  /**
   * Check if guidance is currently active
   */
  function isGuidanceActive() {
    return isActive;
  }

  /**
   * Quick highlight (no arrow, just spotlight)
   */
  function quickHighlight(target, duration = 2000) {
    showGuidance(target, {
      message: null,
      duration: duration,
      hideOnClick: false
    });

    // Hide arrow for quick highlights
    arrow.style.display = 'none';
  }

  // Export public API
  window.__ZONEGUIDE_GUIDANCE__ = {
    show: showGuidance,
    hide: hideGuidance,
    quickHighlight: quickHighlight,
    toggleText: toggleTextGuidance,
    isActive: isGuidanceActive
  };

  // Auto-initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[ZoneGuide Guidance] Module loaded');

})();
