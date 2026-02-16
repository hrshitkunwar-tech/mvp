/**
 * ZoneGuide Pattern Matcher
 * Matches natural language queries to UI patterns
 *
 * Features:
 * - Keyword matching with fuzzy search
 * - Context-aware pattern selection
 * - Confidence scoring
 * - Fallback to AI when no pattern matches
 */

(function() {
  'use strict';

  /**
   * Normalize text for matching
   */
  function normalizeText(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Calculate similarity between two strings (simple word overlap)
   */
  function calculateSimilarity(query, keywords) {
    const queryWords = new Set(normalizeText(query).split(' '));

    let bestScore = 0;
    for (const keyword of keywords) {
      const keywordWords = normalizeText(keyword).split(' ');
      let matches = 0;

      for (const word of keywordWords) {
        if (queryWords.has(word)) {
          matches++;
        }
      }

      const score = keywordWords.length > 0 ? matches / keywordWords.length : 0;
      bestScore = Math.max(bestScore, score);
    }

    return bestScore;
  }

  /**
   * Check if pattern matches current URL context
   */
  function matchesContext(pattern) {
    if (!pattern.context || pattern.context.length === 0) {
      return true; // No context restriction
    }

    const currentUrl = window.location.href;

    for (const contextPattern of pattern.context) {
      // Convert glob pattern to regex
      const regex = new RegExp(
        '^' + contextPattern
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.') + '$'
      );

      if (regex.test(currentUrl)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find element using pattern selectors
   */
  function findElement(pattern) {
    for (const selector of pattern.selectors) {
      try {
        // Handle :has-text() pseudo-selector (not standard CSS)
        if (selector.includes(':has-text(')) {
          const match = selector.match(/^(.+?):has-text\("(.+?)"\)$/);
          if (match) {
            const [, baseSelector, text] = match;
            const elements = document.querySelectorAll(baseSelector);

            for (const element of elements) {
              if (element.textContent.includes(text)) {
                return element;
              }
            }
          }
          continue;
        }

        const element = document.querySelector(selector);
        if (element && isElementVisible(element)) {
          return element;
        }
      } catch (e) {
        console.warn('[Pattern Matcher] Invalid selector:', selector, e);
      }
    }

    return null;
  }

  /**
   * Check if element is visible
   */
  function isElementVisible(element) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      window.getComputedStyle(element).display !== 'none' &&
      window.getComputedStyle(element).visibility !== 'hidden'
    );
  }

  /**
   * Match query to patterns
   */
  function matchQuery(query) {
    const patterns = window.__ZONEGUIDE_PATTERNS__?.getPatterns() || {};
    const matches = [];

    for (const [id, pattern] of Object.entries(patterns)) {
      // Check context first
      if (!matchesContext(pattern)) {
        continue;
      }

      // Calculate similarity score
      const similarity = calculateSimilarity(query, pattern.keywords);

      if (similarity > 0.5) { // Threshold for considering a match
        const element = findElement(pattern);

        if (element) {
          matches.push({
            id,
            pattern,
            element,
            score: similarity * pattern.confidence,
            similarity,
            confidence: pattern.confidence
          });
        }
      }
    }

    // Sort by score (descending)
    matches.sort((a, b) => b.score - a.score);

    return matches;
  }

  /**
   * Get best match for query
   */
  function getBestMatch(query) {
    const matches = matchQuery(query);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Show guidance for query
   */
  function showGuidanceForQuery(query, options = {}) {
    console.log('[Pattern Matcher] Matching query:', query);

    const match = getBestMatch(query);

    if (!match) {
      console.log('[Pattern Matcher] No pattern match found');
      return {
        success: false,
        reason: 'no_match',
        message: 'Could not find a matching UI element for that query'
      };
    }

    console.log('[Pattern Matcher] Found match:', match.id, 'score:', match.score);

    // Show guidance using ZoneGuide
    if (window.__ZONEGUIDE_GUIDANCE__) {
      window.__ZONEGUIDE_GUIDANCE__.show(match.element, {
        message: match.pattern.message,
        arrowPosition: options.arrowPosition || 'top',
        hideOnClick: options.hideOnClick !== false,
        ...options
      });

      return {
        success: true,
        match,
        element: match.element
      };
    }

    return {
      success: false,
      reason: 'guidance_not_loaded',
      message: 'ZoneGuide guidance system not available'
    };
  }

  /**
   * Get all possible matches with scores
   */
  function getAllMatches(query) {
    return matchQuery(query);
  }

  // Export public API
  window.__ZONEGUIDE_MATCHER__ = {
    match: getBestMatch,
    matchAll: getAllMatches,
    showGuidance: showGuidanceForQuery,

    // Utility functions
    normalize: normalizeText,
    similarity: calculateSimilarity,
    findElement: findElement
  };

  console.log('[ZoneGuide Matcher] Pattern matcher loaded');

})();
