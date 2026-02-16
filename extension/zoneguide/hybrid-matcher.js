/**
 * ZoneGuide Hybrid Matcher
 * Combines pattern matching + knowledge graph + AI fallback
 *
 * Matching Strategy:
 * 1. Try pattern matching (fast, instant)
 * 2. If no match, search knowledge graph (medium speed)
 * 3. If still no match, use AI inference (slower, most intelligent)
 *
 * This gives best of all worlds: speed + accuracy + coverage
 */

(function() {
  'use strict';

  /**
   * Hybrid matching with fallback chain
   */
  async function matchQuery(query, options = {}) {
    console.log('[Hybrid Matcher] Matching query:', query);

    const results = {
      query,
      timestamp: Date.now(),
      attempts: []
    };

    // === ATTEMPT 1: Pattern Matching (Instant) ===
    console.log('[Hybrid Matcher] Attempt 1: Pattern matching...');
    const patternMatch = window.__ZONEGUIDE_MATCHER__?.match(query);

    if (patternMatch && patternMatch.score > 0.7) {
      console.log('[Hybrid Matcher] ✓ Pattern match found:', patternMatch.id, 'score:', patternMatch.score);

      results.attempts.push({
        method: 'pattern',
        success: true,
        score: patternMatch.score,
        match: patternMatch
      });

      results.bestMatch = patternMatch;
      results.source = 'pattern';
      return results;
    } else if (patternMatch) {
      console.log('[Hybrid Matcher] ✗ Pattern match too weak:', patternMatch.score);
      results.attempts.push({
        method: 'pattern',
        success: false,
        reason: 'low_confidence',
        score: patternMatch.score
      });
    } else {
      console.log('[Hybrid Matcher] ✗ No pattern match found');
      results.attempts.push({
        method: 'pattern',
        success: false,
        reason: 'no_match'
      });
    }

    // === ATTEMPT 2: Knowledge Graph Search (Medium) ===
    console.log('[Hybrid Matcher] Attempt 2: Knowledge graph search...');

    if (window.__ZONEGUIDE_KG__) {
      try {
        const kgResults = await window.__ZONEGUIDE_KG__.searchKnowledge(query);

        if (kgResults && kgResults.length > 0) {
          console.log('[Hybrid Matcher] ✓ Knowledge graph results:', kgResults.length);

          // Try to extract actionable guidance from knowledge
          const guidance = extractGuidanceFromKnowledge(kgResults, query);

          if (guidance) {
            results.attempts.push({
              method: 'knowledge_graph',
              success: true,
              results: kgResults.length
            });

            results.bestMatch = guidance;
            results.source = 'knowledge_graph';
            return results;
          }

          console.log('[Hybrid Matcher] ✗ Knowledge found but no actionable guidance extracted');
          results.attempts.push({
            method: 'knowledge_graph',
            success: false,
            reason: 'no_guidance_extracted',
            results: kgResults.length
          });
        } else {
          console.log('[Hybrid Matcher] ✗ No knowledge graph results');
          results.attempts.push({
            method: 'knowledge_graph',
            success: false,
            reason: 'no_results'
          });
        }
      } catch (error) {
        console.error('[Hybrid Matcher] Knowledge graph error:', error);
        results.attempts.push({
          method: 'knowledge_graph',
          success: false,
          reason: 'error',
          error: error.message
        });
      }
    } else {
      console.log('[Hybrid Matcher] ✗ Knowledge graph connector not available');
      results.attempts.push({
        method: 'knowledge_graph',
        success: false,
        reason: 'not_available'
      });
    }

    // === ATTEMPT 3: AI Inference (Slower, Most Intelligent) ===
    if (options.enableAI !== false) {
      console.log('[Hybrid Matcher] Attempt 3: AI inference...');

      try {
        const aiGuidance = await getAIGuidance(query);

        if (aiGuidance && aiGuidance.success) {
          console.log('[Hybrid Matcher] ✓ AI guidance generated');

          results.attempts.push({
            method: 'ai',
            success: true
          });

          results.bestMatch = aiGuidance;
          results.source = 'ai';
          return results;
        } else {
          console.log('[Hybrid Matcher] ✗ AI guidance failed');
          results.attempts.push({
            method: 'ai',
            success: false,
            reason: aiGuidance?.reason || 'unknown'
          });
        }
      } catch (error) {
        console.error('[Hybrid Matcher] AI inference error:', error);
        results.attempts.push({
          method: 'ai',
          success: false,
          reason: 'error',
          error: error.message
        });
      }
    }

    // === NO MATCH FOUND ===
    console.log('[Hybrid Matcher] ✗ All methods failed');
    results.bestMatch = null;
    results.source = 'none';
    return results;
  }

  /**
   * Extract actionable guidance from knowledge graph results
   */
  function extractGuidanceFromKnowledge(kgResults, query) {
    // Simple heuristic extraction
    // In production, use LLM to understand and extract

    for (const doc of kgResults) {
      // Check if knowledge contains selector information
      if (doc.metadata && doc.metadata.selector) {
        const element = document.querySelector(doc.metadata.selector);
        if (element && isElementVisible(element)) {
          return {
            id: 'kg-' + doc._id,
            pattern: {
              selectors: [doc.metadata.selector],
              message: doc.metadata.message || doc.content.substring(0, 100),
              action: doc.metadata.action || 'click',
              confidence: 0.75
            },
            element,
            score: 0.75,
            source: 'knowledge_graph',
            knowledge: doc
          };
        }
      }

      // Try to extract selectors from content
      // Look for patterns like:
      // "selector: button.primary"
      // "click on [data-action='create']"

      const selectorMatch = doc.content.match(/selector:\s*([^\s\n]+)/i);
      if (selectorMatch) {
        const selector = selectorMatch[1];
        const element = document.querySelector(selector);

        if (element && isElementVisible(element)) {
          return {
            id: 'kg-extracted-' + doc._id,
            pattern: {
              selectors: [selector],
              message: 'From documentation: ' + doc.content.substring(0, 80) + '...',
              action: 'click',
              confidence: 0.65
            },
            element,
            score: 0.65,
            source: 'knowledge_graph_extracted',
            knowledge: doc
          };
        }
      }
    }

    return null;
  }

  /**
   * Get AI guidance (placeholder for LLM integration)
   */
  async function getAIGuidance(query) {
    // This would integrate with Navigator's AI brain
    // For now, return failure
    console.log('[Hybrid Matcher] AI guidance not yet implemented');
    return {
      success: false,
      reason: 'not_implemented',
      message: 'AI guidance will be integrated with Navigator sidepanel'
    };
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
   * Show guidance using hybrid matching
   */
  async function showGuidanceHybrid(query, options = {}) {
    console.log('[Hybrid Matcher] Showing guidance for:', query);

    const matchResult = await matchQuery(query, options);

    if (!matchResult.bestMatch) {
      console.log('[Hybrid Matcher] No match found after all attempts');
      return {
        success: false,
        reason: 'no_match',
        message: 'Could not find a way to perform that action',
        attempts: matchResult.attempts
      };
    }

    console.log('[Hybrid Matcher] Best match from:', matchResult.source);

    // Show guidance using ZoneGuide
    if (window.__ZONEGUIDE_GUIDANCE__) {
      window.__ZONEGUIDE_GUIDANCE__.show(matchResult.bestMatch.element, {
        message: matchResult.bestMatch.pattern.message,
        arrowPosition: options.arrowPosition || 'top',
        hideOnClick: options.hideOnClick !== false,
        ...options
      });

      return {
        success: true,
        source: matchResult.source,
        match: matchResult.bestMatch,
        attempts: matchResult.attempts
      };
    }

    return {
      success: false,
      reason: 'guidance_not_available',
      message: 'Visual guidance system not loaded'
    };
  }

  /**
   * Get match statistics
   */
  function getMatchStats() {
    return {
      patterns: Object.keys(window.__ZONEGUIDE_PATTERNS__?.getPatterns() || {}).length,
      knowledgeGraph: window.__ZONEGUIDE_KG__?._getCurrentTool() || 'not_loaded',
      aiEnabled: false // Will be true when integrated with Navigator
    };
  }

  // Export public API
  window.__ZONEGUIDE_HYBRID__ = {
    match: matchQuery,
    showGuidance: showGuidanceHybrid,
    getStats: getMatchStats
  };

  console.log('[Hybrid Matcher] Hybrid matcher loaded');

})();
