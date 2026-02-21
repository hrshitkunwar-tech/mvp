/**
 * Navigator Content Script (Quantum Sensor - Multi-Frame + Shadow DOM)
 * ES5 Only.
 */

var CONFIG = {
    DEBOUNCE_MS: 500,
    MAX_TEXT: 60000,
    IGNORED: { 'SCRIPT': 1, 'STYLE': 1, 'NOSCRIPT': 1, 'IFRAME': 1, 'SVG': 1, 'LINK': 1 }
};

function ContentAgent() {
    this.contextId = Math.random().toString(36).substring(2, 12);
    this.recordingEnabled = false;
    this.init();
}

ContentAgent.prototype.init = function () {
    var self = this;

    // Analytics helper
    this.trackOverlayEvent = function(eventType, data) {
        chrome.storage.local.get(['overlayAnalytics'], function(result) {
            var analytics = result.overlayAnalytics || {
                totalAttempts: 0,
                successful: 0,
                failed: 0,
                fallbackUsed: 0,
                events: []
            };

            analytics.totalAttempts++;
            if (eventType === 'success') analytics.successful++;
            if (eventType === 'failed') analytics.failed++;
            if (eventType === 'fallback') analytics.fallbackUsed++;

            analytics.events.push({
                type: eventType,
                timestamp: Date.now(),
                url: window.location.href,
                selector: data.selector || null,
                error: data.error || null,
                retries: data.retries || 0
            });

            // Keep only last 1000 events
            if (analytics.events.length > 1000) {
                analytics.events = analytics.events.slice(-1000);
            }

            chrome.storage.local.set({ overlayAnalytics: analytics });
        });
    };

    // NEW: Inject ZoneGuide into page context (not isolated world)
    if (window.top === window && !window.__ZONEGUIDE_INJECTED__) {
        try {
            // CRITICAL FIX: Inject CSS first (Chrome doesn't auto-inject content_scripts CSS reliably)
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('zoneguide/styles.css');
            link.onload = function () {
                console.log('[Navigator] styles.css injected');
            };
            link.onerror = function (e) {
                console.error('[Navigator] Failed to load styles.css:', e);
            };
            (document.head || document.documentElement).appendChild(link);

            // Inject ZoneGuide scripts in sequence
            var scripts = [
                'zoneguide/zones.js',
                'zoneguide/index.js',
                'zoneguide/selector.js',
                'zoneguide/storage.js',
                'zoneguide/guidance.js',
                'zoneguide/recorder.js',
                'zoneguide/patterns.js',
                'zoneguide/matcher.js',
                'zoneguide/knowledge-connector.js',
                'zoneguide/hybrid-matcher.js',
                'zoneguide/webmcp.js'
            ];

            var scriptsLoaded = 0;

            function injectNext(index) {
                if (index >= scripts.length) {
                    console.log('[Navigator] All ZoneGuide scripts injected, waiting for init...');

                    // Wait for ZoneGuide to signal it's fully initialized
                    var initTimeout = setTimeout(function() {
                        console.warn('[Navigator] ZoneGuide init timeout, assuming ready');
                        window.__ZONEGUIDE_INJECTED__ = true;
                    }, 2000);

                    var initHandler = function(event) {
                        if (event.source !== window) return;
                        if (event.data && event.data.type === 'ZONEGUIDE_INITIALIZED') {
                            clearTimeout(initTimeout);
                            window.removeEventListener('message', initHandler);
                            window.__ZONEGUIDE_INJECTED__ = true;
                            console.log('[Navigator] ✅ ZoneGuide fully initialized and ready');
                        }
                    };
                    window.addEventListener('message', initHandler);

                    return;
                }

                var script = document.createElement('script');
                script.src = chrome.runtime.getURL(scripts[index]);
                script.onload = function() {
                    scriptsLoaded++;
                    console.log('[Navigator] [' + scriptsLoaded + '/' + scripts.length + '] ' + scripts[index] + ' loaded');
                    injectNext(index + 1);
                };
                script.onerror = function(e) {
                    console.error('[Navigator] Failed to load ' + scripts[index] + ':', e);
                    // Continue anyway
                    scriptsLoaded++;
                    injectNext(index + 1);
                };
                (document.head || document.documentElement).appendChild(script);
            }

            injectNext(0);
        } catch (e) {
            console.error('[Navigator] ZoneGuide injection error:', e);
        }
    }

    // Aggressive periodic scan to catch dynamic content (React/Next apps)
    this.pollInterval = setInterval(function () { self.scanAndSend('POLL'); }, 10000);

    var observer = new MutationObserver(function () {
        clearTimeout(self.timeout);
        self.timeout = setTimeout(function () { self.scanAndSend('SYNC'); }, CONFIG.DEBOUNCE_MS);
    });

    function startObserving() {
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            self.scanAndSend('START');
        } else {
            setTimeout(startObserving, 500);
        }
    }
    startObserving();

    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
        if (req.action === 'TRIGGER_SCAN') {
            self.scanAndSend('FORCE');
            sendResponse({ status: 'ok', size: (self.lastSize || 0) });
        }
        return true;
    });

    // NEW: Relay ZONEGUIDE messages from background to page context
    // FIX: Added retry logic, increased timeout, and direct CSS fallback
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
        if (req.type && req.type.startsWith('ZONEGUIDE_')) {
            var retries = 0;
            var maxRetries = 3;
            var pingTimeout = null;
            var readyHandler = null;
            var selector = (req.payload && req.payload.selector) || 'unknown';

            // Track attempt
            self.trackOverlayEvent('attempt', { selector: selector });

            // DIRECT CSS FALLBACK: If ZoneGuide fails, do basic highlighting anyway
            function directFallbackHighlight() {
                if (req.type !== 'ZONEGUIDE_SHOW_ZONE' || !req.payload || !req.payload.selector) return;

                console.log('[Navigator] 🎨 Using direct CSS fallback for:', req.payload.selector);

                try {
                    var selector = req.payload.selector;
                    var element = document.querySelector(selector);

                    if (!element) {
                        // Try fallback selectors
                        if (selector.indexOf('=') > 0) {
                            var match = selector.match(/=["']?([^"']+)["']?/);
                            if (match && match[1]) {
                                element = document.querySelector('#' + match[1]) ||
                                         document.querySelector('.' + match[1]);
                            }
                        }
                    }

                    if (element) {
                        // Track fallback success
                        self.trackOverlayEvent('fallback', { selector: selector, retries: maxRetries + 1 });

                        // Scroll into view
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

                        // Add highlight styles
                        element.style.outline = '3px solid #ff0080';
                        element.style.boxShadow = '0 0 20px rgba(255, 0, 128, 0.6), inset 0 0 20px rgba(255, 0, 128, 0.3)';
                        element.style.transition = 'all 0.3s ease';
                        element.style.position = 'relative';
                        element.style.zIndex = '9998';

                        // Create pulse animation
                        var pulseCount = 0;
                        var pulseInterval = setInterval(function() {
                            pulseCount++;
                            if (pulseCount > 3) {
                                clearInterval(pulseInterval);
                            } else {
                                element.style.boxShadow = pulseCount % 2 === 0
                                    ? '0 0 30px rgba(255, 0, 128, 0.8), inset 0 0 30px rgba(255, 0, 128, 0.5)'
                                    : '0 0 20px rgba(255, 0, 128, 0.6), inset 0 0 20px rgba(255, 0, 128, 0.3)';
                            }
                        }, 300);

                        // Remove after duration
                        var duration = req.payload.duration || 2500;
                        setTimeout(function() {
                            clearInterval(pulseInterval);
                            element.style.outline = '';
                            element.style.boxShadow = '';
                            element.style.zIndex = '';
                        }, duration);

                        // WebMCP FALLBACK: Try programmatic interaction if supported
                        if (req.payload.action === 'click' && typeof element.click === 'function') {
                            try {
                                console.log('[Navigator] 🖱️ WebMCP fallback: programmatic click');
                                setTimeout(function() {
                                    element.click();
                                    self.trackOverlayEvent('webmcp_click', { selector: selector });
                                }, 500); // Wait for visual feedback first
                            } catch (e) {
                                console.warn('[Navigator] WebMCP click failed:', e);
                            }
                        }

                        sendResponse({ success: true, fallback: true, found_element: true });
                        return true;
                    }
                } catch (e) {
                    console.error('[Navigator] Fallback highlight failed:', e);
                    self.trackOverlayEvent('failed', { selector: selector, error: e.message });
                }

                // Last resort: try WebMCP navigator.modelContext if available
                if ('modelContext' in navigator && navigator.modelContext.callTool) {
                    try {
                        console.log('[Navigator] 🤖 Trying WebMCP navigator.modelContext fallback');
                        navigator.modelContext.callTool('click_element', { selector: selector })
                            .then(function(result) {
                                console.log('[Navigator] WebMCP click succeeded:', result);
                                self.trackOverlayEvent('webmcp_native', { selector: selector });
                                sendResponse({ success: true, webmcp: true });
                            })
                            .catch(function(err) {
                                console.error('[Navigator] WebMCP callTool failed:', err);
                                self.trackOverlayEvent('failed', { selector: selector, error: 'Element not found' });
                                sendResponse({ error: 'Element not found', fallback: true });
                            });
                        return true;
                    } catch (e) {
                        console.warn('[Navigator] WebMCP not available:', e);
                    }
                }

                self.trackOverlayEvent('failed', { selector: selector, error: 'Element not found' });
                sendResponse({ error: 'Element not found', fallback: true });
                return false;
            }

            function tryPing() {
                readyHandler = function (event) {
                    if (event.source !== window) return;

                    // Received PONG - zoneguide is ready
                    if (event.data && event.data.type === 'ZONEGUIDE_PONG') {
                        clearTimeout(pingTimeout);
                        window.removeEventListener('message', readyHandler);

                        console.log('[Navigator] ✓ ZoneGuide PONG received, forwarding message');

                        // Track successful PONG
                        self.trackOverlayEvent('success', { selector: selector, retries: retries });

                        // Now forward the actual message
                        window.postMessage(req, '*');

                        // Listen for response
                        var responseHandler = function (event) {
                            if (event.source !== window) return;
                            if (event.data && event.data.type === 'ZONEGUIDE_RESPONSE') {
                                window.removeEventListener('message', responseHandler);
                                sendResponse(event.data.payload);
                            }
                        };
                        window.addEventListener('message', responseHandler);

                        // Timeout for response
                        setTimeout(function() {
                            window.removeEventListener('message', responseHandler);
                        }, 3000);
                    }
                };

                window.addEventListener('message', readyHandler);

                // Send PING to check readiness
                console.log('[Navigator] 📡 Sending PING (attempt ' + (retries + 1) + '/' + (maxRetries + 1) + ')');
                window.postMessage({ type: 'ZONEGUIDE_PING' }, '*');

                // Exponential backoff timeout
                var timeout = 1000 + (retries * 500);
                pingTimeout = setTimeout(function () {
                    window.removeEventListener('message', readyHandler);

                    if (retries < maxRetries) {
                        retries++;
                        console.warn('[Navigator] ⏱️ PING timeout, retry', retries + '/' + maxRetries);
                        tryPing();
                    } else {
                        console.error('[Navigator] ❌ ZoneGuide not ready after', maxRetries + 1, 'attempts. Using fallback.');
                        self.trackOverlayEvent('timeout', { selector: selector, retries: maxRetries + 1 });
                        // Use direct CSS fallback
                        directFallbackHighlight();
                    }
                }, timeout);
            }

            tryPing();
            return true; // Keep channel open for async response
        }

        if (req.action === 'SET_RECORDING') {
            self.recordingEnabled = req.enabled;
            if (self.recordingEnabled) {
                console.log('[Navigator] Action Recording Active');
            } else {
                console.log('[Navigator] Action Recording Disabled');
            }
            sendResponse({ status: 'ok' });
        }
    });

    // Capture Clicks
    document.addEventListener('click', function (e) {
        if (!self.recordingEnabled) return;

        var el = e.target;
        var payload = {
            type: 'click',
            element: el.tagName,
            text: (el.innerText || "").substring(0, 30),
            selector: self.getOptimizedSelector(el),
            timestamp: Date.now()
        };

        chrome.runtime.sendMessage({ action: 'RECORD_ACTION', payload: payload });
    }, true);

    // Capture Inputs
    document.addEventListener('change', function (e) {
        if (!self.recordingEnabled) return;

        var el = e.target;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            var payload = {
                type: 'input',
                element: el.tagName,
                value: el.value,
                selector: self.getOptimizedSelector(el),
                timestamp: Date.now()
            };
            chrome.runtime.sendMessage({ action: 'RECORD_ACTION', payload: payload });
        }
    }, true);

    // CONVEX PROXY: Listen for Convex queries from page context (knowledge-connector.js)
    // This bypasses CSP by routing through background script
    window.addEventListener('message', function (event) {
        if (event.source !== window) return;
        if (event.data.type === 'CONVEX_QUERY_REQUEST') {
            console.log('[Navigator] 📨 Received CONVEX_QUERY_REQUEST from page, ID:', event.data.requestId);
            console.log('[Navigator] 📤 Forwarding to background script...');
            chrome.runtime.sendMessage({
                action: 'CONVEX_QUERY',
                url: event.data.url,
                payload: event.data.payload
            }, function (response) {
                console.log('[Navigator] 📥 Got response from background:', response);
                console.log('[Navigator] 📮 Posting response back to page, ID:', event.data.requestId);
                window.postMessage({
                    type: 'CONVEX_QUERY_RESPONSE',
                    requestId: event.data.requestId,
                    response: response
                }, '*');
            });
        }
    });

    // WEBMCP BRIDGE: Relay WebMCP status from page context → background → sidepanel
    window.addEventListener('message', function (event) {
        if (event.source !== window) return;

        // webmcp.js broadcasts this after probing navigator.modelContext
        if (event.data && event.data.type === 'WEBMCP_STATUS_REPORT') {
            chrome.runtime.sendMessage({
                action:  'WEBMCP_STATUS',
                payload: event.data.payload
            });
        }

        // webmcp.js broadcasts this when a workflow export is requested
        if (event.data && event.data.type === 'WEBMCP_EXPORT_RESULT') {
            chrome.runtime.sendMessage({
                action:     'WEBMCP_EXPORT_RESULT',
                requestId:  event.data.requestId,
                toolDef:    event.data.toolDef
            });
        }
    });

    // Handle WEBMCP_* messages from background (list tools, call tool)
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
        if (req.action === 'WEBMCP_LIST_TOOLS') {
            window.postMessage({ type: 'WEBMCP_LIST_TOOLS_REQUEST' }, '*');
            var listHandler = function (event) {
                if (event.source !== window) return;
                if (event.data && event.data.type === 'WEBMCP_LIST_TOOLS_RESPONSE') {
                    window.removeEventListener('message', listHandler);
                    sendResponse({ tools: event.data.tools });
                }
            };
            window.addEventListener('message', listHandler);
            return true;
        }

        if (req.action === 'WEBMCP_CALL_TOOL') {
            window.postMessage({
                type:   'WEBMCP_CALL_TOOL_REQUEST',
                name:   req.name,
                params: req.params
            }, '*');
            var callHandler = function (event) {
                if (event.source !== window) return;
                if (event.data && event.data.type === 'WEBMCP_CALL_TOOL_RESPONSE') {
                    window.removeEventListener('message', callHandler);
                    sendResponse({ result: event.data.result, error: event.data.error });
                }
            };
            window.addEventListener('message', callHandler);
            return true;
        }
    });

    console.log('[Navigator] Quantum Sensor Online (' + (window.top === window ? 'Top' : 'Frame') + '). ID:', this.contextId);
};

ContentAgent.prototype.getOptimizedSelector = function (el) {
    if (el.id) return '#' + el.id;
    if (el.getAttribute('data-testid')) return '[data-testid="' + el.getAttribute('data-testid') + '"]';
    if (el.getAttribute('aria-label')) return '[aria-label="' + el.getAttribute('aria-label') + '"]';

    var selector = el.tagName.toLowerCase();
    if (el.className && typeof el.className === 'string') {
        var classes = el.className.trim().split(/\s+/);
        if (classes.length > 0 && classes[0] !== '') {
            selector += '.' + classes[0];
        }
    }
    return selector;
};

ContentAgent.prototype.scanAndSend = function (reason) {
    try {
        // Safety: Check if extension context is still valid
        if (!chrome.runtime || !chrome.runtime.id) {
            console.warn('[Navigator] Extension context invalidated. Stopping sensor.');
            if (this.pollInterval) clearInterval(this.pollInterval);
            return;
        }

        var ctx = this.extractContext();
        chrome.runtime.sendMessage({ action: 'CONTEXT_UPDATED', payload: ctx, reason: reason });
    } catch (e) {
        // Context invalidated (extension reloaded or disabled)
        if (e.message && (e.message.indexOf('context invalidated') > -1 || e.message.indexOf('Extension context') > -1)) {
            console.warn('[Navigator] Extension context lost. Stopping sensor.');
            if (this.pollInterval) clearInterval(this.pollInterval);
        } else {
            // Other error - log but don't crash
            console.warn('[Navigator] Scan error:', e.message);
        }
    }
};

ContentAgent.prototype.extractContext = function () {
    var textNodes = [];
    var interaction = [];
    var headings = [];

    function walk(root, isVisible) {
        if (!root) return;
        var tag = root.tagName;
        if (tag && CONFIG.IGNORED[tag]) return;

        var visible = isVisible;
        if (tag && (tag === 'BUTTON' || tag === 'A' || tag === 'H1' || tag === 'H2' || tag === 'H3' || tag === 'H4' || tag === 'H5' || tag === 'H6')) {
            var style = window.getComputedStyle(root);
            if (style.display === 'none' || style.visibility === 'hidden') return;
            visible = true;
        }

        if (root.nodeType === 3) {
            var val = root.nodeValue.trim();
            if (val.length > 2) textNodes.push(val);
            return;
        }

        if (root.nodeType === 1) {
            if (tag === 'BUTTON' || tag === 'A' || root.getAttribute('role') === 'button') {
                var itext = (root.innerText || "").trim();
                if (itext && itext.length < 200) interaction.push({ tag: tag, text: itext });
            }
            if (/^H[1-6]$/.test(tag)) {
                headings.push({ level: tag, text: root.innerText.trim() });
            }
            if (root.shadowRoot) walk(root.shadowRoot, visible);

            var child = root.firstChild;
            while (child) {
                walk(child, visible);
                child = child.nextSibling;
            }
        }
    }

    walk(document.body, true);

    var uniqueText = [];
    var seen = {};
    for (var i = 0; i < textNodes.length; i++) {
        var t = textNodes[i];
        if (!seen[t] && t.length > 2) {
            uniqueText.push(t);
            seen[t] = true;
        }
    }

    return {
        meta: {
            url: window.location.href,
            title: document.title,
            contextId: this.contextId,
            timestamp: Date.now(),
            isTop: window.top === window
        },
        content: {
            headings: headings.slice(0, 50),
            interaction: interaction.slice(0, 100),
            text: uniqueText.join('\n').substring(0, CONFIG.MAX_TEXT),
            blocks: uniqueText.slice(0, 150).map(function (t) { return { id: 't' + Math.random(), text: t }; })
        }
    };
};

new ContentAgent();
