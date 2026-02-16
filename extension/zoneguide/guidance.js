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
    injectKeyframeAnimations();
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
   * Inject keyframe animations into page
   */
  function injectKeyframeAnimations() {
    if (document.getElementById('zg-guidance-keyframes')) return;

    const style = document.createElement('style');
    style.id = 'zg-guidance-keyframes';
    style.textContent = `
      @keyframes zg-spotlight-pulse {
        0%, 100% {
          box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.8), 0 0 0 8px rgba(255, 107, 53, 0.4), 0 0 20px 12px rgba(255, 107, 53, 0.6), 0 0 40px 20px rgba(255, 255, 255, 0.3);
        }
        50% {
          box-shadow: 0 0 0 6px rgba(255, 107, 53, 0.9), 0 0 0 12px rgba(255, 107, 53, 0.5), 0 0 30px 16px rgba(255, 107, 53, 0.7), 0 0 50px 25px rgba(255, 255, 255, 0.4);
        }
      }

      @keyframes zg-arrow-bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(8px); }
      }

      @keyframes zg-arrow-bounce-up {
        0%, 100% { transform: translateY(0) rotate(180deg); }
        50% { transform: translateY(-8px) rotate(180deg); }
      }

      @keyframes zg-arrow-bounce-left {
        0%, 100% { transform: translateX(0) rotate(90deg); }
        50% { transform: translateX(-8px) rotate(90deg); }
      }

      @keyframes zg-arrow-bounce-right {
        0%, 100% { transform: translateX(0) rotate(-90deg); }
        50% { transform: translateX(8px) rotate(-90deg); }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Create UI elements
   */
  function createUIElements() {
    // Dim overlay
    dimOverlay = document.createElement('div');
    dimOverlay.className = 'zg-guidance-dim';
    Object.assign(dimOverlay.style, {
      display: 'none',
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: '2147483645',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    });

    // Spotlight (reverse mask - shows element)
    spotlight = document.createElement('div');
    spotlight.className = 'zg-guidance-spotlight';
    Object.assign(spotlight.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '2147483646',
      pointerEvents: 'none',
      borderRadius: '8px',
      boxShadow: '0 0 0 4px rgba(255, 107, 53, 0.8), 0 0 0 8px rgba(255, 107, 53, 0.4), 0 0 20px 12px rgba(255, 107, 53, 0.6), 0 0 40px 20px rgba(255, 255, 255, 0.3)',
      opacity: '0',
      transform: 'scale(0.95)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      animation: 'zg-spotlight-pulse 2s ease-in-out infinite'
    });

    // Bouncing arrow
    arrow = document.createElement('div');
    arrow.className = 'zg-guidance-arrow';
    arrow.innerHTML = `
      <svg width="60" height="60" viewBox="0 0 60 60" class="zg-arrow-svg" style="display: block;">
        <path d="M30 10 L30 40 M30 40 L20 30 M30 40 L40 30"
              stroke="currentColor"
              stroke-width="4"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"/>
        <circle cx="30" cy="45" r="3" fill="currentColor"/>
      </svg>
    `;
    Object.assign(arrow.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      color: '#ff6b35',
      filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3))',
      opacity: '0',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      animation: 'zg-arrow-bounce 1.5s ease-in-out infinite'
    });

    // Floating tooltip
    tooltip = document.createElement('div');
    tooltip.className = 'zg-guidance-tooltip';
    Object.assign(tooltip.style, {
      display: 'none',
      position: 'fixed',
      zIndex: '2147483647',
      pointerEvents: 'none',
      maxWidth: '280px',
      padding: '12px 16px',
      background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
      opacity: '0',
      transform: 'translateY(-10px) scale(0.95)',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    });

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
