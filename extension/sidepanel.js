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
var overlaysEnabled = true;
var lastActions = []; // Store actions from the current response
var isRecording = false;
var currentProcedure = null;
var currentStepIndex = 0;
var webmcpState = null; // Current tab's WebMCP info

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

// ── WebMCP panel ───────────────────────────────────────────────────────────

function updateWebMCPPanel(info) {
    var panel  = document.getElementById('webmcp-panel');
    var badge  = document.getElementById('webmcp-badge');
    var list   = document.getElementById('webmcp-tools-list');
    var toggle = document.getElementById('webmcp-toggle');
    if (!panel || !badge || !list) return;

    webmcpState = info;

    if (!info || !info.supported) {
        // Visual mode — show a subtle indicator but keep panel minimal
        panel.classList.remove('hidden');
        badge.textContent = '⚪ Visual Mode';
        badge.className = 'webmcp-badge webmcp-visual';
        list.classList.add('hidden');
        if (toggle) toggle.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    if (info.toolCount > 0) {
        badge.textContent = '🟢 Native Tools (' + info.toolCount + ')';
        badge.className = 'webmcp-badge webmcp-native';
        if (toggle) toggle.classList.remove('hidden');

        // Build tool cards
        list.innerHTML = '';
        (info.tools || []).forEach(function (tool) {
            var card = document.createElement('div');
            card.className = 'webmcp-tool-card';
            card.innerHTML =
                '<span class="webmcp-tool-name">' + (tool.name || '') + '</span>' +
                '<span class="webmcp-tool-desc">' + (tool.description || '') + '</span>';
            list.appendChild(card);
        });

        // Toggle list visibility
        if (toggle) {
            toggle.onclick = function () {
                var hidden = list.classList.toggle('hidden');
                toggle.textContent = hidden ? '▾' : '▴';
            };
        }
    } else {
        // WebMCP present but no tools yet
        badge.textContent = '🟡 WebMCP Ready';
        badge.className = 'webmcp-badge webmcp-hybrid';
        list.classList.add('hidden');
        if (toggle) toggle.classList.add('hidden');
    }
}

function requestWebMCPStatus(tabId) {
    chrome.runtime.sendMessage({ action: 'GET_WEBMCP_STATUS', tabId: tabId }, function (response) {
        if (chrome.runtime.lastError) return;
        updateWebMCPPanel(response && response.webmcp ? response.webmcp : null);
    });
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        if (tabs && tabs.length > 0) {
            currentTabId = tabs[0].id;
            updateContextIndicator(tabs[0]);

            var dbgTab = document.getElementById('dbg-tab');
            if (dbgTab) dbgTab.textContent = currentTabId;

            // Trigger scan on startup
            requestImmediateScan();
            requestWebMCPStatus(currentTabId);

            // Update indicator when tab changes
            chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
                if (tabId === currentTabId && (changeInfo.title || changeInfo.status === 'complete')) {
                    updateContextIndicator(tab);
                    requestImmediateScan();
                    if (changeInfo.status === 'complete') requestWebMCPStatus(tabId);
                }
            });

            chrome.tabs.onActivated.addListener(function (activeInfo) {
                chrome.tabs.get(activeInfo.tabId, function (tab) {
                    if (chrome.runtime.lastError || !tab) return;
                    currentTabId = tab.id;
                    updateContextIndicator(tab);
                    requestImmediateScan();
                    requestWebMCPStatus(tab.id);

                    var dbgTab = document.getElementById('dbg-tab');
                    if (dbgTab) dbgTab.textContent = currentTabId;
                });
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

    // Toggle Overlays
    var toggleOverlays = document.getElementById('toggle-overlays');
    if (toggleOverlays) {
        chrome.storage.local.get(['overlaysEnabled'], function (result) {
            overlaysEnabled = result.overlaysEnabled !== false;
            toggleOverlays.checked = overlaysEnabled;
        });

        toggleOverlays.addEventListener('change', function () {
            overlaysEnabled = this.checked;
            chrome.storage.local.set({ overlaysEnabled: overlaysEnabled });
        });
    }

    // Navigation Prompt Actions
    var btnNavYes = document.getElementById('btn-nav-yes');
    var btnNavNo = document.getElementById('btn-nav-no');
    var navPrompt = document.getElementById('navigation-prompt');

    if (btnNavYes && btnNavNo && navPrompt) {
        btnNavYes.addEventListener('click', function () {
            navPrompt.classList.add('hidden');
            // Execute all stored actions
            lastActions.forEach(function (action) {
                chrome.runtime.sendMessage({ action: 'EXECUTE_ACTION', actionData: action, tabId: currentTabId });
            });
            lastActions = [];
        });

        btnNavNo.addEventListener('click', function () {
            navPrompt.classList.add('hidden');
            lastActions = [];
        });
    }

    var recordBtn = document.getElementById('btn-record');
    var recordingBadge = document.getElementById('recording-badge');
    if (recordBtn) {
        recordBtn.addEventListener('click', function () {
            isRecording = !isRecording;
            if (isRecording) {
                recordBtn.classList.replace('record-off', 'record-on');
                recordingBadge.classList.remove('hidden');
                chrome.runtime.sendMessage({ action: 'START_RECORDING', tabId: currentTabId });
                addMessage("Recording started. Perform your actions on the page.", "ai");
            } else {
                recordBtn.classList.replace('record-on', 'record-off');
                recordingBadge.classList.add('hidden');
                chrome.runtime.sendMessage({ action: 'STOP_RECORDING', tabId: currentTabId }, function (response) {
                    if (response && response.success) {
                        addMessage("Recording saved! ID: " + response.id, "ai");
                    } else {
                        var error = (response && response.error) ? response.error : "Unknown error";
                        addMessage("Recording failed: " + error, "ai");
                    }
                });
            }
        });
    }
    var stopPlaybackBtn = document.getElementById('btn-stop-playback');
    var nextStepBtn = document.getElementById('btn-next-step');
    var prevStepBtn = document.getElementById('btn-prev-step');

    if (stopPlaybackBtn) stopPlaybackBtn.addEventListener('click', stopPlayback);
    if (nextStepBtn) nextStepBtn.addEventListener('click', nextStep);
    if (prevStepBtn) prevStepBtn.addEventListener('click', prevStep);
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
            if (msg.type === 'token') {
                appendToken(msg.text);
            } else if (msg.type === 'action') {
                console.log("[Sidepanel] Received action:", msg.data);
                lastActions.push(msg.data);

                // execute immediately if possible to show visual guidance while streaming
                chrome.runtime.sendMessage({
                    action: 'EXECUTE_ACTION',
                    actionData: msg.data,
                    tabId: currentTabId
                }, function(response) {
                    // Check if execution failed
                    if (chrome.runtime.lastError) {
                        console.error("[Sidepanel] Action execution error:", chrome.runtime.lastError.message);
                        showToast('⚠️ Visual guidance unavailable', 'error');
                    } else if (response && response.fallback) {
                        // Using fallback mode
                        showToast('🎨 Using simplified visual mode', 'warning');
                    } else if (response && response.error) {
                        console.error("[Sidepanel] Action failed:", response.error);
                        showToast('⚠️ Could not highlight element', 'error');
                    }
                });
            } else if (msg.type === 'start_workflow') {
                startPlayback(msg.procedureId);
            } else if (msg.type === 'done') {
                finishStream();
            } else if (msg.type === 'error') {
                appendError(msg.text);
            }
        });

        port.onDisconnect.addListener(function () {
            console.log("Port disconnected, reconnecting in 1s...");
            port = null;

            // Update UI to show reconnection
            if (contextBadge) {
                contextBadge.textContent = "🔄 Reconnecting...";
                contextBadge.classList.remove('active');
            }

            setTimeout(function () {
                connect();
                // Restore context badge after reconnection
                if (currentTabId) {
                    chrome.tabs.get(currentTabId, function (tab) {
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

    // Hide prompt if visible
    var navPrompt = document.getElementById('navigation-prompt');
    if (navPrompt) navPrompt.classList.add('hidden');
    lastActions = [];

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

        // Clean text: strip technical directives from display
        var displayLines = currentAiMessageDiv.rawText.split('\n').filter(function (line) {
            var l = line.trim();
            if (l.startsWith('ACTION:') || l.startsWith('<thought>') || l.startsWith('</thought>')) return false;
            if (l.startsWith('[DEBUG]') || (l.startsWith('.') && l.length > 3) || (l.startsWith('#') && l.length > 3)) return false;
            return true;
        });

        // Convert to premium steps if formatted as "1. text"
        var html = "";
        displayLines.forEach(function (line) {
            var stepMatch = line.match(/^(\d+)\.\s*(.*)/);
            if (stepMatch) {
                html += '<div class="step-item"><div class="step-num">' + stepMatch[1] + '</div><div class="step-content">' + stepMatch[2] + '</div></div>';
            } else if (line.trim().length > 0) {
                // Regular prose
                var inner = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                html += '<div style="margin-bottom:8px;">' + inner + '</div>';
            }
        });

        currentAiMessageDiv.innerHTML = html || "...";
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'info', 'warning', 'error', 'success'
 */
function showToast(message, type) {
    type = type || 'info';
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = message;
    toast.style.cssText = 'position:fixed;top:10px;right:10px;background:' +
        (type === 'error' ? '#f44' : type === 'warning' ? '#fb8c00' : type === 'success' ? '#4caf50' : '#2196f3') +
        ';color:#fff;padding:12px 20px;border-radius:6px;z-index:99999;' +
        'box-shadow:0 4px 12px rgba(0,0,0,0.3);font-size:14px;font-weight:500;' +
        'animation:slideIn 0.3s ease;';

    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
}

function finishStream() {
    if (currentAiMessageDiv) {
        currentAiMessageDiv.classList.remove('streaming');

        // Check if there are any ACTION: lines that we should show a prompt for
        var lines = currentAiMessageDiv.rawText.split('\n');
        var hasActions = false;
        lines.forEach(function (line) {
            if (line.trim().startsWith('ACTION:')) {
                hasActions = true;
                // Parse the action if it's in string format
                // ACTION:type:zone:selector:duration
                var parts = line.trim().split(':');
                if (parts.length >= 3) {
                    lastActions.push({
                        type: parts[1],
                        zone: parts[2],
                        selector: parts[3] || null,
                        duration: parseInt(parts[4]) || 3000
                    });
                }
            }
        });

        if (hasActions && overlaysEnabled) {
            var navPrompt = document.getElementById('navigation-prompt');
            if (navPrompt) navPrompt.classList.remove('hidden');
        }

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

function startPlayback(procedureId) {
    chrome.runtime.sendMessage({ action: 'GET_PROCEDURE', id: procedureId }, function (response) {
        if (response && response.procedure) {
            currentProcedure = response.procedure;
            currentStepIndex = 0;

            document.getElementById('playback-panel').classList.remove('hidden');
            document.getElementById('playback-title').textContent = currentProcedure.name;
            showStep(0);

            // Hide input area during playback to focus on guidance
            document.getElementById('input-area').classList.add('hidden');
        } else {
            appendError("Failed to load workflow.");
        }
    });
}

function showStep(index) {
    if (!currentProcedure || !currentProcedure.steps[index]) return;

    currentStepIndex = index;
    var step = currentProcedure.steps[index];
    var total = currentProcedure.steps.length;

    // Update UI
    document.getElementById('step-instruction').textContent = step.description;
    document.getElementById('step-count').textContent = (index + 1) + " / " + total;
    document.getElementById('progress-bar').style.width = ((index + 1) / total * 100) + "%";

    // Controls
    document.getElementById('btn-prev-step').disabled = (index === 0);
    document.getElementById('btn-next-step').textContent = (index === total - 1) ? "Finish" : "Next";

    // Execute visual guidance
    chrome.runtime.sendMessage({
        action: 'EXECUTE_ACTION',
        actionData: {
            type: step.action || 'highlight_zone',
            zone: step.zone || 'center',
            selector: step.selector,
            instruction: step.description,
            duration: 0 // Keep highlighted until next step
        },
        tabId: currentTabId
    });
}

function nextStep() {
    if (currentStepIndex < currentProcedure.steps.length - 1) {
        showStep(currentStepIndex + 1);
    } else {
        stopPlayback();
    }
}

function prevStep() {
    if (currentStepIndex > 0) {
        showStep(currentStepIndex - 1);
    }
}

function stopPlayback() {
    currentProcedure = null;
    currentStepIndex = 0;
    document.getElementById('playback-panel').classList.add('hidden');
    document.getElementById('input-area').classList.remove('hidden');

    // Clear highlights
    chrome.runtime.sendMessage({ action: 'EXECUTE_ACTION', actionData: { type: 'hide_zone' }, tabId: currentTabId });
}
