/**
 * ZoneGuide Knowledge Graph Connector
 * Connects pattern matching system to Convex knowledge graphs
 *
 * Flow:
 * 1. Detect current tool/website (github, linear, figma, etc.)
 * 2. Fetch tool knowledge from Convex DB
 * 3. Parse knowledge to extract UI patterns/selectors
 * 4. Merge with static patterns for hybrid matching
 * 5. Enable dynamic, intelligent guidance based on real tool knowledge
 */

(function() {
  'use strict';

  // Configuration
  const CONVEX_URL = 'https://abundant-porpoise-181.convex.cloud';
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const ENABLE_CONVEX = false; // Set to false to disable Convex integration
  const SUPPORTED_TOOLS = ['github', 'linear', 'figma', 'notion', 'slack']; // Only fetch KG for these

  // Cache
  let knowledgeCache = new Map();
  let currentTool = null;

  /**
   * Helper: Proxy Convex query through background script (bypasses CSP)
   */
  function convexQuery(path, args) {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(2);
      const timeout = setTimeout(() => reject(new Error('Convex query timeout')), 10000);

      // Listen for response
      const listener = (event) => {
        if (event.data.type === 'CONVEX_QUERY_RESPONSE' && event.data.requestId === requestId) {
          clearTimeout(timeout);
          window.removeEventListener('message', listener);

          if (event.data.response.success) {
            resolve(event.data.response.data);
          } else {
            reject(new Error(event.data.response.error));
          }
        }
      };

      window.addEventListener('message', listener);

      // Send request to content script (which proxies to background)
      window.postMessage({
        type: 'CONVEX_QUERY_REQUEST',
        requestId: requestId,
        url: `${CONVEX_URL}/api/query`,
        payload: { path, args }
      }, '*');
    });
  }

  /**
   * Detect current tool from URL
   */
  function detectTool() {
    const hostname = window.location.hostname;
    const url = window.location.href;

    // Tool detection patterns
    const toolPatterns = {
      'github': /github\.com/,
      'linear': /linear\.app/,
      'figma': /figma\.com/,
      'notion': /notion\.so/,
      'slack': /slack\.com/,
      'jira': /atlassian\.net/,
      'asana': /app\.asana\.com/,
      'trello': /trello\.com/,
      'confluence': /atlassian\.net.*\/wiki/,
      'gitlab': /gitlab\.com/,
      'bitbucket': /bitbucket\.org/,
      'clickup': /app\.clickup\.com/,
      'monday': /monday\.com/,
      'airtable': /airtable\.com/,
      'coda': /coda\.io/
    };

    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      if (pattern.test(url) || pattern.test(hostname)) {
        return tool;
      }
    }

    return null;
  }

  /**
   * Fetch knowledge from Convex for current tool
   */
  async function fetchToolKnowledge(toolName) {
    // Check if Convex is enabled
    if (!ENABLE_CONVEX) {
      console.log('[KG Connector] Convex integration disabled, using static patterns only');
      return [];
    }

    // Check if tool is supported
    if (!SUPPORTED_TOOLS.includes(toolName)) {
      console.log('[KG Connector] Tool not in supported list, skipping knowledge fetch:', toolName);
      return [];
    }

    // Check cache first
    const cached = knowledgeCache.get(toolName);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('[KG Connector] Using cached knowledge for:', toolName);
      return cached.data;
    }

    console.log('[KG Connector] Fetching knowledge from Convex for:', toolName);

    try {
      // Query via background proxy (bypasses CSP)
      const knowledge = await convexQuery('knowledge:getKnowledgeByTool', {
        tool_name: toolName,
        limit: 100
      });

      // Cache it
      knowledgeCache.set(toolName, {
        data: knowledge,
        timestamp: Date.now()
      });

      console.log('[KG Connector] ✓ Fetched', knowledge.length, 'knowledge docs for', toolName);
      return knowledge;

    } catch (error) {
      // Silent failure - knowledge graph is optional
      console.log('[KG Connector] Convex unavailable, continuing with static patterns');
      return [];
    }
  }

  /**
   * Parse knowledge documents to extract UI patterns
   *
   * Knowledge format can include:
   * - Selector patterns in metadata
   * - Natural language descriptions of UI elements
   * - Step-by-step instructions referencing UI
   */
  function parseKnowledgeToPatterns(knowledgeDocs) {
    const patterns = {};

    for (const doc of knowledgeDocs) {
      try {
        // Check if metadata contains pattern information
        if (doc.metadata && doc.metadata.ui_patterns) {
          Object.assign(patterns, doc.metadata.ui_patterns);
          continue;
        }

        // Try to extract patterns from content
        // Look for patterns like:
        // "To create a file, click the 'Add file' button"
        // "The star button is located at [selector]"

        const content = doc.content.toLowerCase();

        // Pattern extraction heuristics
        const actionPatterns = [
          {
            trigger: /to (create|make|add) (?:a |an )?(\w+)/g,
            type: 'action'
          },
          {
            trigger: /(?:click|press|select) (?:the )?['"]([^'"]+)['"]/g,
            type: 'clickable'
          },
          {
            trigger: /button (?:labeled|called|named) ['"]([^'"]+)['"]/g,
            type: 'button'
          }
        ];

        // Extract actions from knowledge content
        // This is a simple heuristic - in production, use NLP/LLM
        for (const { trigger, type } of actionPatterns) {
          let match;
          while ((match = trigger.exec(content)) !== null) {
            const action = match[1] || match[2];
            if (action) {
              console.log('[KG Connector] Extracted pattern:', action, type);
              // Store extracted pattern
              // (In production, this would be more sophisticated)
            }
          }
        }

      } catch (error) {
        console.warn('[KG Connector] Failed to parse knowledge doc:', error);
      }
    }

    return patterns;
  }

  /**
   * Merge static patterns with knowledge-derived patterns
   */
  function mergePatterns(staticPatterns, kgPatterns) {
    // KG patterns take precedence over static patterns
    return {
      ...staticPatterns,
      ...kgPatterns
    };
  }

  /**
   * Load knowledge for current tool and enhance pattern database
   */
  async function loadToolKnowledge() {
    const tool = detectTool();

    if (!tool) {
      console.log('[KG Connector] No recognized tool detected');
      return null;
    }

    if (tool === currentTool) {
      console.log('[KG Connector] Already loaded knowledge for:', tool);
      return currentTool;
    }

    console.log('[KG Connector] Loading knowledge for:', tool);
    currentTool = tool;

    try {
      // Fetch knowledge from Convex
      const knowledgeDocs = await fetchToolKnowledge(tool);

      // Parse knowledge to extract UI patterns
      const kgPatterns = parseKnowledgeToPatterns(knowledgeDocs);

      // Get static patterns
      const staticPatterns = window.__ZONEGUIDE_PATTERNS__?.getPatterns() || {};

      // Merge patterns
      const mergedPatterns = mergePatterns(staticPatterns, kgPatterns);

      // Store merged patterns
      if (window.__ZONEGUIDE_PATTERNS__) {
        window.__ZONEGUIDE_PATTERNS__._dynamicPatterns = kgPatterns;
        window.__ZONEGUIDE_PATTERNS__._mergedPatterns = mergedPatterns;
        console.log('[KG Connector] Patterns enhanced with knowledge graph data');
      }

      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('zoneguide:knowledge-loaded', {
        detail: {
          tool,
          knowledgeCount: knowledgeDocs.length,
          patternsCount: Object.keys(kgPatterns).length
        }
      }));

      return tool;

    } catch (error) {
      console.error('[KG Connector] Failed to load tool knowledge:', error);
      return null;
    }
  }

  /**
   * Search knowledge for specific query
   * This can be used as fallback when pattern matching fails
   */
  async function searchKnowledge(query, tool = null) {
    // Check if enabled and tool supported
    if (!ENABLE_CONVEX) return [];

    tool = tool || currentTool;
    if (!tool || !SUPPORTED_TOOLS.includes(tool)) return [];

    console.log('[KG Connector] Searching knowledge:', query, 'for tool:', tool);

    try {
      // Query via background proxy
      const results = await convexQuery('knowledge:searchKnowledge', {
        query,
        tool_name: tool,
        limit: 5
      });

      console.log('[KG Connector] ✓ Found', results.length, 'knowledge results');
      return results;

    } catch (error) {
      console.log('[KG Connector] Search unavailable, using patterns only');
      return [];
    }
  }

  /**
   * Get AI-enhanced guidance using knowledge graph
   * This is called when pattern matching fails
   */
  async function getAIGuidance(query) {
    console.log('[KG Connector] Getting AI guidance for:', query);

    // Search knowledge for relevant information
    const knowledgeResults = await searchKnowledge(query);

    if (knowledgeResults.length === 0) {
      return {
        success: false,
        reason: 'no_knowledge',
        message: 'No knowledge found for this query'
      };
    }

    // Extract relevant content
    const relevantContent = knowledgeResults
      .map(doc => doc.content)
      .join('\n\n');

    // In production, this would call an LLM to:
    // 1. Understand the query intent
    // 2. Find relevant UI elements from knowledge
    // 3. Generate guidance instructions
    //
    // For now, return the knowledge content
    return {
      success: true,
      source: 'knowledge_graph',
      content: relevantContent,
      docs: knowledgeResults
    };
  }

  /**
   * Clear knowledge cache
   */
  function clearCache() {
    knowledgeCache.clear();
    currentTool = null;
    console.log('[KG Connector] Cache cleared');
  }

  /**
   * Get current tool stats
   */
  function getStats() {
    return {
      currentTool,
      cacheSize: knowledgeCache.size,
      cachedTools: Array.from(knowledgeCache.keys())
    };
  }

  // Export public API
  window.__ZONEGUIDE_KG__ = {
    detectTool,
    loadToolKnowledge,
    searchKnowledge,
    getAIGuidance,
    clearCache,
    getStats,

    // Expose for debugging
    _cache: knowledgeCache,
    _getCurrentTool: () => currentTool
  };

  // Auto-load knowledge when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadToolKnowledge);
  } else {
    loadToolKnowledge();
  }

  console.log('[KG Connector] Knowledge Graph connector loaded');

})();
