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
var toggleOverlays = document.getElementById('toggle-overlays');
var settingsBtn = document.getElementById('btn-settings');
var settingsPanel = document.getElementById('settings-panel');

var port = null;
var currentTabId = null;
var currentAiMessageDiv = null;
var overlaysEnabled = true;

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

    // Settings panel toggle
    if (settingsBtn) {
        settingsBtn.addEventListener('click', function () {
            settingsPanel.classList.toggle('hidden');
        });
    }

    // Overlay toggle
    if (toggleOverlays) {
        // Load saved preference
        chrome.storage.local.get(['overlaysEnabled'], function(result) {
            overlaysEnabled = result.overlaysEnabled !== false; // Default to true
            if (!overlaysEnabled) {
                toggleOverlays.classList.remove('active');
            }
        });

        toggleOverlays.addEventListener('click', function () {
            overlaysEnabled = !overlaysEnabled;
            toggleOverlays.classList.toggle('active');

            // Save preference
            chrome.storage.local.set({ overlaysEnabled: overlaysEnabled });
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

        // Detect step-by-step instructions
        var text = currentAiMessageDiv.rawText || currentAiMessageDiv.textContent;
        console.log('[Navigator] Checking for steps in response:', text.substring(0, 200));

        var hasSteps = detectStepByStepInstructions(text);
        console.log('[Navigator] Step detection result:', hasSteps);

        if (hasSteps) {
            console.log('[Navigator] Adding navigation prompt');
            // Add navigation prompt
            var promptDiv = document.createElement('div');
            promptDiv.className = 'navigation-prompt';
            promptDiv.innerHTML = `
                <div class="navigation-prompt-text">Should I navigate you on the screen?</div>
                <div class="navigation-prompt-buttons">
                    <button class="nav-btn nav-btn-yes">Yes, guide me</button>
                    <button class="nav-btn nav-btn-no">No, thanks</button>
                </div>
            `;

            currentAiMessageDiv.appendChild(promptDiv);

            // Add event listeners
            var yesBtn = promptDiv.querySelector('.nav-btn-yes');
            var noBtn = promptDiv.querySelector('.nav-btn-no');

            yesBtn.addEventListener('click', function() {
                console.log('[Navigator] User clicked "Yes, guide me"');
                startNavigationGuidance(text);
                promptDiv.remove();
            });

            noBtn.addEventListener('click', function() {
                console.log('[Navigator] User clicked "No, thanks"');
                promptDiv.remove();
            });
        }

        currentAiMessageDiv = null;
    }
}

/**
 * Detect if the text contains step-by-step instructions
 */
function detectStepByStepInstructions(text) {
    if (!text) return false;

    var lowerText = text.toLowerCase();

    // Pattern 1: Numbered lists (1. 2. 3. or Step 1: Step 2:)
    var hasNumberedList = /(?:\n|^)\s*(?:\d+\.|step \d+:)/i.test(text);

    // Pattern 2: Multiple numbered items (at least 2)
    var numberedItems = text.match(/(?:\n|^)\s*\d+\./g);
    var hasMultipleNumbers = numberedItems && numberedItems.length >= 2;

    // Pattern 3: Sequential action words
    var actionWords = ['first', 'then', 'next', 'after that', 'finally', 'lastly', 'second', 'third'];
    var hasMultipleActions = 0;
    for (var i = 0; i < actionWords.length; i++) {
        if (lowerText.indexOf(actionWords[i]) > -1) {
            hasMultipleActions++;
        }
    }

    // Pattern 4: Click/navigate instructions
    var hasClickInstructions = /click|navigate|go to|select|choose|open|tap|press/i.test(text);

    // Pattern 5: "How to" or instructional language
    var hasInstructionalLanguage = /how to|here's how|follow these|here are the steps/i.test(text);

    console.log('[Navigator] Detection patterns:', {
        hasNumberedList: hasNumberedList,
        hasMultipleNumbers: hasMultipleNumbers,
        actionWordsCount: hasMultipleActions,
        hasClickInstructions: hasClickInstructions,
        hasInstructionalLanguage: hasInstructionalLanguage
    });

    // Return true if we detect clear step-by-step patterns
    return hasNumberedList || hasMultipleNumbers ||
           (hasMultipleActions >= 2 && hasClickInstructions) ||
           (hasInstructionalLanguage && hasClickInstructions);
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

/**
 * Start interactive navigation guidance
 * Parse steps and show zone highlights/arrows for each step
 */
function startNavigationGuidance(text) {
    if (!overlaysEnabled) {
        addMessage('Navigation overlays are disabled. Enable them in settings.', 'error');
        return;
    }

    if (!currentTabId) {
        addMessage('Cannot navigate: no active tab', 'error');
        return;
    }

    // Parse steps from the text
    var steps = parseSteps(text);

    if (steps.length === 0) {
        addMessage('Could not parse navigation steps', 'error');
        return;
    }

    // Show navigation in progress message
    var navMsg = addMessage('🧭 Starting navigation guidance... (Step 1 of ' + steps.length + ')', 'ai');

    // Navigate through steps
    navigateSteps(steps, 0, navMsg);
}

/**
 * Parse steps from instructional text
 */
function parseSteps(text) {
    var steps = [];

    // Split by numbered lines (1. 2. 3. or Step 1: Step 2:)
    var lines = text.split('\n');
    var currentStep = '';

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();

        // Check if line starts with a number or "Step"
        var stepMatch = line.match(/^(\d+\.|Step \d+:)\s*(.+)/i);

        if (stepMatch) {
            // Save previous step
            if (currentStep) {
                steps.push(parseStepAction(currentStep));
            }
            // Start new step
            currentStep = stepMatch[2];
        } else if (currentStep) {
            // Continue current step
            currentStep += ' ' + line;
        }
    }

    // Save last step
    if (currentStep) {
        steps.push(parseStepAction(currentStep));
    }

    return steps.filter(function(s) { return s !== null; });
}

/**
 * Parse a single step to extract action and target element
 */
function parseStepAction(stepText) {
    // Extract action words and targets
    var clickMatch = stepText.match(/click\s+(?:on\s+)?(?:the\s+)?["']?([^"'.,]+)["']?/i);
    var navigateMatch = stepText.match(/(?:go to|navigate to|open)\s+(?:the\s+)?["']?([^"'.,]+)["']?/i);
    var selectMatch = stepText.match(/select\s+(?:the\s+)?["']?([^"'.,]+)["']?/i);

    var target = null;
    var action = 'click';

    if (clickMatch) {
        target = clickMatch[1].trim();
    } else if (navigateMatch) {
        target = navigateMatch[1].trim();
        action = 'navigate';
    } else if (selectMatch) {
        target = selectMatch[1].trim();
    }

    if (!target) {
        // Generic step without specific element
        return {
            text: stepText,
            target: null,
            action: 'show',
            zone: 'center'
        };
    }

    return {
        text: stepText,
        target: target,
        action: action,
        zone: 'center' // Default to center, could be refined with AI
    };
}

/**
 * Navigate through steps with visual guidance
 */
function navigateSteps(steps, currentIndex, messageDiv) {
    if (currentIndex >= steps.length) {
        messageDiv.textContent = '✅ Navigation complete!';
        return;
    }

    var step = steps[currentIndex];

    // Update message
    messageDiv.textContent = '🧭 Step ' + (currentIndex + 1) + ' of ' + steps.length + ': ' + step.text;

    // Show zone highlight
    if (overlaysEnabled) {
        chrome.tabs.sendMessage(currentTabId, {
            type: 'ZONEGUIDE_SHOW_ZONE',
            payload: {
                zone: step.zone,
                duration: 3000,
                selector: step.target ? findElementSelector(step.target) : null
            }
        }, function(response) {
            if (chrome.runtime.lastError) {
                console.warn('Failed to show zone:', chrome.runtime.lastError.message);
            }
        });
    }

    // Auto-advance to next step after 3.5 seconds
    setTimeout(function() {
        navigateSteps(steps, currentIndex + 1, messageDiv);
    }, 3500);
}

/**
 * Try to find a CSS selector for a target element description
 * This is a simple heuristic - could be enhanced with AI/ML
 */
function findElementSelector(targetDescription) {
    // Common patterns
    var lowerTarget = targetDescription.toLowerCase();

    // Try to match common UI elements
    if (lowerTarget.includes('button')) {
        return 'button';
    } else if (lowerTarget.includes('link')) {
        return 'a';
    } else if (lowerTarget.includes('menu')) {
        return '[role="menu"], nav';
    } else if (lowerTarget.includes('search')) {
        return 'input[type="search"], [role="search"]';
    }

    // Try to find by text content (approximate)
    return null; // Let ZoneGuide show zone only
}

init();
