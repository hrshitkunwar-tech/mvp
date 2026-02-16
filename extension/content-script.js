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
    this.init();
}

ContentAgent.prototype.init = function () {
    var self = this;

    // NEW: Inject ZoneGuide into page context (not isolated world)
    if (window.top === window && !window.__ZONEGUIDE_INJECTED__) {
        try {
            // CRITICAL FIX: Inject CSS first (Chrome doesn't auto-inject content_scripts CSS reliably)
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('zoneguide/styles.css');
            link.onload = function() {
                console.log('[Navigator] styles.css injected');
            };
            link.onerror = function(e) {
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
                'zoneguide/recorder.js'
            ];

            function injectNext(index) {
                if (index >= scripts.length) {
                    console.log('[Navigator] All ZoneGuide scripts loaded');
                    return;
                }

                var script = document.createElement('script');
                script.src = chrome.runtime.getURL(scripts[index]);
                script.onload = function() {
                    console.log('[Navigator] ' + scripts[index] + ' injected');
                    injectNext(index + 1);
                };
                script.onerror = function(e) {
                    console.error('[Navigator] Failed to load ' + scripts[index] + ':', e);
                };
                (document.head || document.documentElement).appendChild(script);
            }

            injectNext(0);
            window.__ZONEGUIDE_INJECTED__ = true;
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
    chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
        if (req.type && req.type.startsWith('ZONEGUIDE_')) {
            // First check if zoneguide is ready by sending PING
            var pingTimeout = null;

            var readyHandler = function (event) {
                if (event.source !== window) return;

                // Received PONG - zoneguide is ready
                if (event.data && event.data.type === 'ZONEGUIDE_PONG') {
                    clearTimeout(pingTimeout);
                    window.removeEventListener('message', readyHandler);

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
                }
            };

            window.addEventListener('message', readyHandler);

            // Send PING to check readiness
            window.postMessage({ type: 'ZONEGUIDE_PING' }, '*');

            // Timeout after 1 second if no PONG received
            pingTimeout = setTimeout(function () {
                window.removeEventListener('message', readyHandler);
                console.error('[Navigator] ZoneGuide not ready - timeout');
                sendResponse({ error: 'ZoneGuide not loaded' });
            }, 1000);

            return true; // Keep channel open for async response
        }
    });

    console.log('[Navigator] Quantum Sensor Online (' + (window.top === window ? 'Top' : 'Frame') + '). ID:', this.contextId);
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
