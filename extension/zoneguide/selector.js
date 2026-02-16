/**
 * CSS Selector Generator for ZoneGuide Recording
 * Generates unique, robust CSS selectors for any DOM element
 *
 * Strategy Priority:
 * 1. ID (if unique and meaningful)
 * 2. Data attributes (data-testid, data-id, etc.)
 * 3. Semantic attributes (aria-label, name, type)
 * 4. Class combinations (if unique)
 * 5. Tag + nth-child (fallback)
 */

(function() {
  'use strict';

  /**
   * Generate optimal CSS selector for element
   * @param {HTMLElement} element - Target element
   * @param {Object} options - Configuration options
   * @returns {string} CSS selector
   */
  function generateSelector(element, options = {}) {
    const config = {
      maxClassNames: 3,
      ignoreClasses: ['active', 'hover', 'focus', 'selected', 'open', 'closed'],
      preferDataAttributes: true,
      ...options
    };

    // Try strategies in order of preference
    const strategies = [
      () => tryId(element),
      () => tryDataAttributes(element),
      () => tryAriaLabel(element),
      () => tryUniqueClasses(element, config),
      () => tryTagWithAttributes(element),
      () => tryNthChild(element)
    ];

    for (const strategy of strategies) {
      const selector = strategy();
      if (selector && isUnique(selector)) {
        return optimizeSelector(selector);
      }
    }

    // Fallback: build path from root
    return buildPathFromRoot(element, config);
  }

  /**
   * Try using element ID
   */
  function tryId(element) {
    if (!element.id) return null;

    // Skip generic/dynamic IDs
    const dynamicPatterns = /^(ember|react|vue|angular|ng)-\d+/i;
    if (dynamicPatterns.test(element.id)) return null;

    return `#${CSS.escape(element.id)}`;
  }

  /**
   * Try data attributes (data-testid, data-qa, etc.)
   */
  function tryDataAttributes(element) {
    const dataAttrs = [
      'data-testid',
      'data-test-id',
      'data-qa',
      'data-cy',
      'data-test',
      'data-id'
    ];

    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        return `[${attr}="${CSS.escape(value)}"]`;
      }
    }

    return null;
  }

  /**
   * Try ARIA labels
   */
  function tryAriaLabel(element) {
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length < 50) {
      const tag = element.tagName.toLowerCase();
      return `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;
    }

    return null;
  }

  /**
   * Try unique class combinations
   */
  function tryUniqueClasses(element, config) {
    const classes = Array.from(element.classList)
      .filter(cls => !config.ignoreClasses.includes(cls))
      .filter(cls => !/^(is-|has-|active|hover|focus)/.test(cls))
      .slice(0, config.maxClassNames);

    if (classes.length === 0) return null;

    const tag = element.tagName.toLowerCase();
    const classSelector = classes.map(cls => `.${CSS.escape(cls)}`).join('');

    return `${tag}${classSelector}`;
  }

  /**
   * Try tag with unique attributes
   */
  function tryTagWithAttributes(element) {
    const tag = element.tagName.toLowerCase();
    const attrs = [];

    // Check common identifying attributes
    const identifyingAttrs = ['name', 'type', 'role', 'href', 'value'];

    for (const attr of identifyingAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.length < 50) {
        attrs.push(`[${attr}="${CSS.escape(value)}"]`);
      }
    }

    if (attrs.length > 0) {
      return `${tag}${attrs.join('')}`;
    }

    return null;
  }

  /**
   * Fallback: nth-child selector
   */
  function tryNthChild(element) {
    const parent = element.parentElement;
    if (!parent) return element.tagName.toLowerCase();

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element) + 1;
    const tag = element.tagName.toLowerCase();

    return `${tag}:nth-child(${index})`;
  }

  /**
   * Build selector path from root
   */
  function buildPathFromRoot(element, config, maxDepth = 5) {
    const path = [];
    let current = element;
    let depth = 0;

    while (current && current !== document.body && depth < maxDepth) {
      // Try to get a good selector for this level
      let selector = tryId(current) ||
                    tryDataAttributes(current) ||
                    tryUniqueClasses(current, config) ||
                    tryNthChild(current);

      path.unshift(selector);

      // If we found a unique ID, stop here
      if (selector && selector.startsWith('#')) {
        break;
      }

      current = current.parentElement;
      depth++;
    }

    return path.join(' > ');
  }

  /**
   * Check if selector is unique
   */
  function isUnique(selector) {
    try {
      const matches = document.querySelectorAll(selector);
      return matches.length === 1;
    } catch (e) {
      return false;
    }
  }

  /**
   * Optimize selector for brevity
   */
  function optimizeSelector(selector) {
    // Remove redundant parent-child operators
    selector = selector.replace(/\s*>\s*>/g, ' >');

    // Simplify if possible
    selector = selector.trim();

    return selector;
  }

  /**
   * Get text content for element (for display purposes)
   */
  function getElementText(element, maxLength = 50) {
    let text = '';

    // Try various text sources
    if (element.getAttribute('aria-label')) {
      text = element.getAttribute('aria-label');
    } else if (element.getAttribute('title')) {
      text = element.getAttribute('title');
    } else if (element.getAttribute('placeholder')) {
      text = element.getAttribute('placeholder');
    } else if (element.value && element.value.length < maxLength) {
      text = element.value;
    } else if (element.textContent) {
      text = element.textContent.trim();
    }

    // Truncate long text
    if (text.length > maxLength) {
      text = text.substring(0, maxLength) + '...';
    }

    return text;
  }

  /**
   * Get element metadata for recording
   */
  function getElementMetadata(element) {
    return {
      selector: generateSelector(element),
      tagName: element.tagName.toLowerCase(),
      text: getElementText(element),
      type: element.type || null,
      href: element.href || null,
      id: element.id || null,
      classes: Array.from(element.classList),
      attributes: getRelevantAttributes(element)
    };
  }

  /**
   * Get relevant attributes for element
   */
  function getRelevantAttributes(element) {
    const attrs = {};
    const relevantAttrs = [
      'role', 'aria-label', 'data-testid', 'data-qa',
      'name', 'type', 'placeholder', 'title'
    ];

    for (const attr of relevantAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        attrs[attr] = value;
      }
    }

    return attrs;
  }

  /**
   * Validate selector works correctly
   */
  function validateSelector(selector, expectedElement) {
    try {
      const found = document.querySelector(selector);
      return found === expectedElement;
    } catch (e) {
      return false;
    }
  }

  // Export public API
  window.__ZONEGUIDE_SELECTOR__ = {
    generate: generateSelector,
    getMetadata: getElementMetadata,
    validate: validateSelector,
    isUnique: isUnique,
    getText: getElementText
  };

  console.log('[ZoneGuide Selector] Module loaded');

})();
