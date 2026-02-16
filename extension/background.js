/**
 * Navigator Background Service Worker (VERSION 2.0.4 - UNIFIED BRIDGE)
 * -------------------------------------------------------------
 * FIXED PROPERLY: This version NEVER calls Ollama (11434) directly.
 * It routes EVERYTHING through the ScrapeData API (8000).
 * This eliminates the Ollama 403 Forbidden / CORS errors.
 */

console.log("Navigator Background 2.0.4: Unified Bridge Online");

var tabContexts = {};
var recordings = {}; // tabId -> actions[]

// Helper function to safely post messages to port
function safePostMessage(port, message) {
  try {
    if (port && port.postMessage) {
      port.postMessage(message);
      return true;
    }
  } catch (e) {
    console.warn("Port disconnected, cannot send message:", e.message);
    return false;
  }
  return false;
}

chrome.runtime.onInstalled.addListener(function () {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'CONTEXT_UPDATED' && sender.tab) {
    var tid = sender.tab.id;
    updateMemoryContext(tid, request.payload);
    sendResponse({ status: 'ok' });
  } else if (request.action === 'GET_DEBUG_CONTEXT') {
    sendResponse({ context: tabContexts[request.tabId] });
    return true;
  } else if (request.action === 'EXECUTE_ACTION') {
    handleAction(request.actionData, request.tabId);
    sendResponse({ status: 'ok' });
    return true;
  } else if (request.action === 'START_RECORDING') {
    recordings[request.tabId] = [];
    chrome.tabs.sendMessage(request.tabId, { action: 'SET_RECORDING', enabled: true });
    sendResponse({ status: 'ok' });
  } else if (request.action === 'STOP_RECORDING') {
    handleStopRecording(request.tabId, sendResponse);
    return true; // async
  } else if (request.action === 'RECORD_ACTION' && sender.tab) {
    if (recordings[sender.tab.id]) {
      recordings[sender.tab.id].push(request.payload);
    }
    sendResponse({ status: 'ok' });
  } else if (request.action === 'GET_PROCEDURE') {
    fetch('http://127.0.0.1:8000/get-procedure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: request.id })
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        sendResponse(data);
      })
      .catch(function (err) {
        sendResponse({ success: false, error: err.message });
      });
    return true; // async
  }
  return true;
});

function handleStopRecording(tabId, sendResponse) {
  var actions = recordings[tabId] || [];
  delete recordings[tabId];

  // Stop recording in content script
  chrome.tabs.sendMessage(tabId, { action: 'SET_RECORDING', enabled: false });

  if (actions.length === 0) {
    sendResponse({ success: false, error: 'No actions recorded' });
    return;
  }

  // Get tab context for metadata
  var context = tabContexts[tabId];
  var payload = {
    name: "Recorded Workflow - " + new Date().toLocaleString(),
    description: "User recorded workflow on " + (context ? context.meta.title : "unknown page"),
    product: context ? new URL(context.meta.url).hostname : "General",
    version: "1.0.0",
    intent_patterns: [context ? context.meta.title : "recorded workflow"],
    required_context: [],
    steps: actions.map(function (a, i) {
      return {
        step_id: "step_" + i,
        description: a.type + " on " + a.element,
        action: a.type === 'click' ? 'highlight_zone' : 'input',
        zone: 'center',
        selector: a.selector,
        value: a.value
      };
    }),
    author: "User",
    status: "active"
  };

  // Save to Convex via bridge
  fetch('http://127.0.0.1:8000/save-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.success) {
        var savedId = data.id || "unknown";
        console.log("Recording saved successfully. ID:", savedId);
        sendResponse({ success: true, id: savedId });
      } else {
        var error = (data && data.error) ? data.error : "Failed to save workflow (Bridge Error)";
        console.error("Recording save failed:", error);
        sendResponse({ success: false, error: error });
      }
    })
    .catch(function (err) {
      console.error("Failed to save workflow:", err);
      sendResponse({ success: false, error: err.message });
    });
}

function updateMemoryContext(tabId, payload) {
  var existing = tabContexts[tabId] || {
    meta: payload.meta,
    content: { headings: [], interaction: [], text: "", blocks: [] }
  };

  if (payload.meta.isTop && (!existing.meta || (payload.meta.timestamp - existing.meta.timestamp > 3000))) {
    existing = payload;
  } else {
    existing.content.headings = dedupe(existing.content.headings.concat(payload.content.headings || []), 'text');
    existing.content.interaction = dedupe(existing.content.interaction.concat(payload.content.interaction || []), 'text');

    if (existing.content.text.indexOf(payload.content.text.substring(0, 50)) === -1) {
      existing.content.text += "\n" + payload.content.text;
      existing.content.blocks = (existing.content.blocks || []).concat(payload.content.blocks || []);
    }
  }

  tabContexts[tabId] = existing;
}

function dedupe(arr, key) {
  var seen = {};
  return arr.filter(function (item) {
    if (!item) return false;
    var val = item[key];
    if (seen[val]) return false;
    seen[val] = true;
    return true;
  });
}

chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === 'sidepanel-connection') {
    port.onMessage.addListener(function (msg) {
      if (msg.action === 'ASK_LLM') handleAskLLM(port, msg.query, msg.tabId);
    });
  }
});

function handleAskLLM(port, query, tabId) {
  var context = tabContexts[tabId];
  console.log("Asking Unified Brain (Stream):", query);

  // STEP 1: Tool Detection
  fetch('http://127.0.0.1:8000/detect-tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: context ? context.meta.url : "",
      title: context ? context.meta.title : ""
    })
  })
    .then(function (res) {
      if (!res.ok) return { detected: false };
      return res.json();
    })
    .catch(function () { return { detected: false }; })
    .then(function (detectData) {
      var toolName = detectData.detected ? detectData.tool_name : null;

      // STEP 2: Unified Chat Stream
      return fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "SYSTEM: Act as a concise Navigator AI. Respond ONLY with a clean, numbered step-by-step guide. No preamble. No conversational filler. Use 'ACTION:highlight_zone:zone:selector' for navigation.\n\nUSER QUERY: " + query,
          tool_name: toolName,
          url: context ? context.meta.url : "Browser Tab",
          context_text: context ? context.content.text.substring(0, 15000) : "No text."
        })
      });
    })
    .then(function (response) {
      if (!response.ok) {
        response.text().then(function (t) {
          safePostMessage(port, { type: 'error', text: "Brain Error (" + response.status + "): " + t });
        });
        return;
      }

      // STREAM READER
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = "";

      function read() {
        reader.read().then(function (result) {
          if (result.done) {
            safePostMessage(port, { type: 'done' });
            return;
          }
          var chunk = decoder.decode(result.value, { stream: true });
          buffer += chunk;

          var lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            try {
              var json = JSON.parse(line);

              if (json.error) {
                safePostMessage(port, { type: 'error', text: json.error });
                return;
              }

              // Handle text messages
              if (json.message && json.message.content) {
                safePostMessage(port, { type: 'token', text: json.message.content });
              }

              // Handle action directives (NOW DEFERRED TO UI PROMPT)
              if (json.action) {
                // Modified: Send action to sidepanel immediately for visual execution
                safePostMessage(port, { type: 'action', data: json.action });

                // Also execute locally (optional, but sidepanel will request it anyway)
                // handleAction(json.action, tabId);
              }

              // Handle completion
              if (json.done) {
                safePostMessage(port, { type: 'done' });
              }
            } catch (e) {
              // Ignore parse errors for partial json
            }
          }
          read();
        }).catch(function (e) {
          safePostMessage(port, { type: 'error', text: "Stream Loss: " + e.message });
        });
      }
      read();
    })
    .catch(function (err) {
      safePostMessage(port, { type: 'error', text: "Connection Failed: " + err.message });
    });
}

/**
 * Handle action directives from LLM stream
 * @param {Object} action - Action object with type, zone, selector, duration
 * @param {number} tabId - Target tab ID
 */
function handleAction(action, tabId) {
  if (!action || !action.type) return;

  console.log('[Navigator] Executing action:', action.type, 'in zone:', action.zone);

  if (action.type === 'highlight_zone') {
    // CRITICAL: Verify tabId is valid before sending, fallback to active tab if needed
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError || !tab) {
        // TabId is invalid (closed/navigated) - fallback to active tab
        console.warn('[Navigator] Invalid tabId, using active tab');
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
          if (tabs[0]) {
            sendActionToTab(tabs[0].id, action);
          } else {
            console.error('[Navigator] No active tab found');
          }
        });
      } else {
        // TabId is valid - use it
        sendActionToTab(tabId, action);
      }
    });
  } else if (action.type === 'hide_zone') {
    chrome.tabs.sendMessage(tabId, { type: 'ZONEGUIDE_HIDE_ZONE' });
  }
}

/**
 * Send action to specific tab
 * @param {number} tabId - Target tab ID (must be valid)
 * @param {Object} action - Action object
 */
function sendActionToTab(tabId, action) {
  console.log('[Navigator] 📤 Sending action to tab:', tabId);
  console.log('[Navigator] 📤 Zone:', action.zone, 'Selector:', action.selector, 'Duration:', action.duration);

  chrome.tabs.sendMessage(tabId, {
    type: 'ZONEGUIDE_SHOW_ZONE',
    payload: {
      zone: action.zone,
      duration: action.duration || 2500,
      selector: action.selector || null,
      instruction: action.instruction || null
    }
  }, function (response) {
    if (chrome.runtime.lastError) {
      console.error('[Navigator] ✗ Action failed:', chrome.runtime.lastError.message);
      console.error('[Navigator] ✗ Possible issue: Content script not loaded on tab', tabId);
    } else {
      console.log('[Navigator] ✓ Action executed successfully:', response);
    }
  });
}
