/**
 * Navigator Side Panel Logic (Quantum Mode)
 */

var chatContainer = document.getElementById('chat-container');
var inputField = document.getElementById('user-input');
var sendBtn = document.getElementById('btn-send');
var contextBadge = document.getElementById('context-indicator');
var debugBtn = document.getElementById('btn-debug');
var debugPanel = document.getElementById('debug-panel');
var forceScanBtn = document.getElementById('btn-force-scan');

var port = null;
var currentTabId = null;
var currentAiMessageDiv = null;

function updateContextIndicator(tab) {
    if (!tab || !contextBadge) return;

    // Extract clean display name
    var displayText = "";

    if (tab.title && tab.title !== "" && !tab.title.startsWith("data:")) {
        // Use page title, truncate if too long
        displayText = tab.title.substring(0, 35);
    } else if (tab.url) {
        // Extract domain from URL
        try {
            var url = new URL(tab.url);
            displayText = url.hostname.replace('www.', '');
        } catch (e) {
            displayText = "Unknown Page";
        }
    } else {
        displayText = "Page";
    }

    contextBadge.textContent = "● " + displayText;
    contextBadge.classList.add('active');
}

function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
            currentTabId = tabs[0].id;
            updateContextIndicator(tabs[0]);

            var dbgTab = document.getElementById('dbg-tab');
            if (dbgTab) dbgTab.textContent = currentTabId;

            // Trigger scan on startup
            requestImmediateScan();

            // Update indicator when tab changes
            chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
                if (tabId === currentTabId && changeInfo.title) {
                    updateContextIndicator(tab);
                }
            });
        }
    });

    connect();

    sendBtn.addEventListener('click', sendMessage);
    inputField.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    inputField.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    debugBtn.addEventListener('click', function () {
        debugPanel.classList.toggle('hidden');
        if (!debugPanel.classList.contains('hidden')) {
            refreshDebug();
            // Start auto-refresh for debug panel
            if (!window.debugInterval) {
                window.debugInterval = setInterval(refreshDebug, 3000);
            }
        } else {
            clearInterval(window.debugInterval);
            window.debugInterval = null;
        }
    });

    if (forceScanBtn) {
        forceScanBtn.addEventListener('click', function () {
            forceScanBtn.textContent = "SCANNING...";
            requestImmediateScan();
            setTimeout(function () {
                forceScanBtn.textContent = "FORCE SCAN";
                refreshDebug();
            }, 800);
        });
    }
}

function requestImmediateScan() {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: 'TRIGGER_SCAN' }, function (response) {
        if (chrome.runtime.lastError) console.log('Scan requested.');
    });
}

function connect() {
    if (port) return;

    console.log("Connecting to background service worker...");

    try {
        port = chrome.runtime.connect({ name: 'sidepanel-connection' });

        port.onMessage.addListener(function (msg) {
            if (msg.type === 'token') appendToken(msg.text);
            else if (msg.type === 'done') finishStream();
            else if (msg.type === 'error') appendError(msg.text);
        });

        port.onDisconnect.addListener(function () {
            console.log("Port disconnected, reconnecting in 1s...");
            port = null;

            // Update UI to show reconnection
            if (contextBadge) {
                contextBadge.textContent = "🔄 Reconnecting...";
                contextBadge.classList.remove('active');
            }

            setTimeout(function() {
                connect();
                // Restore context badge after reconnection
                if (currentTabId) {
                    chrome.tabs.get(currentTabId, function(tab) {
                        if (tab && contextBadge) {
                            updateContextIndicator(tab);
                        }
                    });
                }
            }, 1000);
        });

        console.log("✓ Connected to background service worker");

    } catch (e) {
        console.error("Connection error:", e);
        port = null;
        setTimeout(connect, 1000);
    }
}

function sendMessage() {
    var text = inputField.value.trim();
    if (!text) return;

    // Check if port is valid before sending
    if (!port) {
        appendError("Not connected to backend. Reconnecting...");
        connect();
        return;
    }

    addMessage(text, 'user');
    inputField.value = '';
    inputField.style.height = 'auto';

    currentAiMessageDiv = addMessage('', 'ai');
    currentAiMessageDiv.classList.add('streaming');
    currentAiMessageDiv.rawText = "";

    try {
        port.postMessage({ action: 'ASK_LLM', query: text, tabId: currentTabId });
    } catch (e) {
        console.error("Error sending message:", e);
        appendError("Connection lost. Please try again.");
        port = null;
        connect();
    }
}

function appendToken(text) {
    if (currentAiMessageDiv) {
        currentAiMessageDiv.rawText += text;
        // Basic Markdown Support
        var html = currentAiMessageDiv.rawText
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^# (.*)/gm, '<h3>$1</h3>')
            .replace(/\n\n/g, '<br><br>')
            .replace(/\n/g, '<br>');

        currentAiMessageDiv.innerHTML = html;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function finishStream() {
    if (currentAiMessageDiv) {
        currentAiMessageDiv.classList.remove('streaming');
        currentAiMessageDiv = null;
    }
}

function appendError(text) {
    finishStream();
    var div = document.createElement('div');
    div.className = 'message error';
    div.textContent = text;
    chatContainer.appendChild(div);
}

function addMessage(text, role) {
    var div = document.createElement('div');
    div.className = "message " + role;
    div.textContent = text;
    chatContainer.appendChild(div);

    // Smooth scroll with a slight delay to account for the entry animation
    setTimeout(function () {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 50);

    return div;
}

function refreshDebug() {
    if (!currentTabId) return;
    chrome.runtime.sendMessage({ action: 'GET_DEBUG_CONTEXT', tabId: currentTabId }, function (response) {
        if (response && response.context) {
            var dbgId = document.getElementById('dbg-id');
            var dbgTokens = document.getElementById('dbg-tokens');
            if (dbgId) dbgId.textContent = response.context.meta.contextId;
            if (dbgTokens) dbgTokens.textContent = (response.context.content.text || "").length + " chars";

            var structure = document.getElementById('dbg-structure');
            var interact = document.getElementById('dbg-interaction');
            if (structure) structure.textContent = JSON.stringify(response.context.content.headings || [], null, 2);
            if (interact) interact.textContent = JSON.stringify(response.context.content.interaction || [], null, 2);
        }
    });
}

init();
