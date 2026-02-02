// Navigator Popup - Search Interface
// Connects to n8n Orchestration Backend

const N8N_WEBHOOK = 'http://localhost:5678/webhook/navigator-screenshot';
const POLL_INTERVAL = 2000; // 2 seconds
const MAX_POLL_ATTEMPTS = 15; // ~30 seconds max

// DOM Elements
const queryInput = document.getElementById('queryInput');
const searchBtn = document.getElementById('searchBtn');
const captureBtn = document.getElementById('captureBtn');
const historyBtn = document.getElementById('historyBtn');
const status = document.getElementById('status');
const results = document.getElementById('results');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
queryInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});
captureBtn.addEventListener('click', handleCapture);
historyBtn.addEventListener('click', showHistory);

/**
 * Handle search query
 */
async function handleSearch() {
  const query = queryInput.value.trim();
  if (!query) {
    showStatus('⚠️ Please enter a search query', 'error');
    return;
  }

  searchBtn.disabled = true;
  results.innerHTML = '';

  try {
    showStatus('🔍 Searching...', 'loading');

    // Get current tab and screenshot
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 50
    });

    const sessionId = `popup_${Date.now()}`;

    // Send to n8n webhook
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        timestamp: Date.now(),
        screenshot_url: screenshot,
        viewport: {
          width: tab.width || 1920,
          height: tab.height || 1080,
          url: tab.url
        },
        query: query,
        tool_detected: detectToolFromUrl(tab.url)
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    // Read response body once
    const text = await response.text();
    let data = null;

    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('JSON parse error:', e, 'body:', text);
      }
    }

    // If no data returned, treat as queued and poll for results
    if (!data) {
      showStatus('✅ Request sent, checking for results...', 'success');
      displayQueuedNotice(query);
      saveToHistory(query, { queued: true, sessionId });
      pollForResults(sessionId, query);
      return;
    }

    // Display returned guidance
    displayGuidance(data, query);
    showStatus('✅ Guidance ready!', 'success');
    saveToHistory(query, data);

  } catch (error) {
    console.error('Search error:', error);
    showStatus(`❌ ${error.message}`, 'error');
    displayFallbackGuidance(query);
  } finally {
    searchBtn.disabled = false;
  }
}

/**
 * Handle page capture
 */
async function handleCapture() {
  captureBtn.disabled = true;
  results.innerHTML = '';

  try {
    showStatus('📸 Analyzing Screen...', 'loading');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 50
    });

    const sessionId = `capture_${Date.now()}`;

    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        timestamp: Date.now(),
        screenshot_url: screenshot,
        viewport: {
          width: tab.width || 1920,
          height: tab.height || 1080,
          url: tab.url
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }

    const text = await response.text();
    let data = null;

    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('JSON parse error:', e, 'body:', text);
      }
    }

    if (!data) {
      showStatus('✅ Capture queued, checking for results...', 'success');
      displayQueuedNotice('Page Analysis');
      saveToHistory('capture', { queued: true, sessionId });
      pollForResults(sessionId, 'capture');
      return;
    }

    displayPageAnalysis(data);
    showStatus('✅ Page analyzed!', 'success');

  } catch (error) {
    console.error('Capture error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    captureBtn.disabled = false;
  }
}

/**
 * Display guidance results
 */
function displayGuidance(data, query) {
  results.innerHTML = '';

  const steps = data.guidance?.steps || [];
  const card = document.createElement('div');
  card.className = 'guidance-card';

  if (steps.length > 0) {
    const firstStep = steps[0];
    card.innerHTML = `
      <div class="step-number">🧭 Navigation Guide</div>
      <div class="guidance-text">
        <strong>Step 1 of ${steps.length}:</strong><br>
        ${firstStep.instruction || 'Follow the guidance'}
        <br><br>
        <div style="font-size: 0.9em; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
          ${firstStep.reassurance || 'Follow the overlay on screen.'}
        </div>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="step-number">💡 Quick Tip</div>
      <div class="guidance-text">${generateFallbackText(query)}</div>
    `;
  }

  results.appendChild(card);
}

/**
 * Display queued notice
 */
function displayQueuedNotice(label) {
  results.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'guidance-card';
  card.innerHTML = `
    <div class="step-number">⏳ Processing</div>
    <div class="guidance-text">
      Your request for "<strong>${label}</strong>" has been sent to the server.<br>
      <br>
      <strong>What's happening:</strong>
      <ul style="margin: 8px 0; padding-left: 20px; font-size: 0.9em; line-height: 1.6;">
        <li>Vision AI is analyzing your screen</li>
        <li>Generating step-by-step guidance</li>
        <li>Building interactive overlays</li>
      </ul>
      <strong>Estimated time:</strong> 5-10 seconds
      <br><br>
      <strong style="font-size: 0.85em; opacity: 0.7;">Tip:</strong> Results will update here automatically when ready, or check the n8n dashboard at <code style="background: rgba(255,255,255,0.1); padding: 2px 4px; border-radius: 3px;">localhost:5678</code>
    </div>
  `;
  results.appendChild(card);
}

/**
 * Display fallback guidance
 */
function displayFallbackGuidance(query) {
  const card = document.createElement('div');
  card.className = 'guidance-card';
  card.innerHTML = `
    <div class="step-number">⚠️ Connection Issue</div>
    <div class="guidance-text">
      Could not connect to guidance service.<br>
      Trying local fallback...<br>
      <strong>${generateFallbackText(query)}</strong>
    </div>
  `;
  results.appendChild(card);
}

/**
 * Generate fallback text based on query
 */
function generateFallbackText(query) {
  const q = (query || '').toLowerCase();
  if (q.includes('create')) return "Look for a '+' button or 'New' button.";
  if (q.includes('setting')) return "Check the top-right corner avatar or gear icon.";
  if (q.includes('search')) return "Look for a search icon or magnifying glass.";
  return "Try exploring the sidebar menu.";
}

/**
 * Detect tool from URL
 */
function detectToolFromUrl(url) {
  if (!url) return 'Unknown';
  if (url.includes('github.com')) return 'GitHub';
  if (url.includes('convex.cloud') || url.includes('convex.dev')) return 'Convex';
  if (url.includes('mail.google.com')) return 'Gmail';
  if (url.includes('figma.com')) return 'Figma';
  if (url.includes('notion.so')) return 'Notion';
  if (url.includes('linear.app')) return 'Linear';
  if (url.includes('slack.com')) return 'Slack';
  return 'Unknown';
}

/**
 * Show status message
 */
function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  status.style.display = 'block';

  if (type !== 'loading') {
    setTimeout(() => {
      status.style.display = 'none';
    }, 3000);
  }
}

/**
 * Save search to history
 */
function saveToHistory(query, data) {
  const history = JSON.parse(localStorage.getItem('nav_history') || '[]');
  history.unshift({
    query: typeof query === 'string' ? query : 'capture',
    timestamp: Date.now(),
    data: data
  });
  localStorage.setItem('nav_history', JSON.stringify(history.slice(0, 50)));
}

/**
 * Show search history
 */
function showHistory() {
  const history = JSON.parse(localStorage.getItem('nav_history') || '[]');
  results.innerHTML = '';

  if (history.length === 0) {
    results.innerHTML = '<div class="guidance-text">No history yet.</div>';
    return;
  }

  history.forEach((item, idx) => {
    const div = document.createElement('div');
    div.style.padding = '8px';
    div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    div.style.cursor = 'pointer';
    div.textContent = `🕒 ${new Date(item.timestamp).toLocaleTimeString()} - ${item.query}`;
    div.onmouseover = () => (div.style.background = 'rgba(255,255,255,0.05)');
    div.onmouseout = () => (div.style.background = 'none');
    div.onclick = () => {
      if (item.query !== 'capture') {
        queryInput.value = item.query;
        handleSearch();
      }
    };
    results.appendChild(div);
  });
}

/**
 * Placeholder for polling (currently disabled)
 * n8n API requires auth; will implement callback mechanism in next phase
 */
function pollForResults(sessionId, label, attempts = 0) {
  console.log(`[ℹ️] Request queued: ${sessionId}`);
  console.log(`[ℹ️] Check n8n dashboard at http://localhost:5678 for execution status`);
  // Future: Implement callback webhook from n8n to popup instead of polling
}
