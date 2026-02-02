// Navigator Popup - Search Interface
// Connects to Background Service Worker (Central Brain)

const N8N_WEBHOOK = 'http://localhost:5678/webhook/navigator-screenshot';

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
 * Delegates to Background Script which manages the Brain connection.
 */
async function handleSearch() {
  const query = queryInput.value.trim();

  try {
    // Get current tab info
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Capture screenshot
    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 50
    });

    // Send to n8n workflow
    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: `popup_${Date.now()}`,
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
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();

    // Display results
    displayGuidance(data, query);
    showStatus('✅ Guidance ready!', 'success');

    // Save to history
    saveToHistory(query, data);

  } catch (error) {
    console.error('Search error:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');

    // Show fallback guidance
    displayFallbackGuidance(query);
  } finally {
    searchBtn.disabled = false;
  }
  } catch (error) {
    console.error('Search error:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
    displayFallbackGuidance(query);
  } finally {
    searchBtn.disabled = false;
  }
}

/**
 * Handle page capture (Analyze Page)
 * Uses Vision to identifying the current tool.
 */
async function handleCapture() {
  showStatus('📸 Analyzing Screen...', 'loading');
  results.innerHTML = '';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const screenshot = await chrome.tabs.captureVisibleTab(null, {
      format: 'jpeg',
      quality: 50
    });

    const response = await fetch(N8N_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: `capture_${Date.now()}`,
        timestamp: Date.now(),
        screenshot_url: screenshot,
        viewport: {
          width: tab.width || 1920,
          height: tab.height || 1080,
          url: tab.url
        }
      })
    });

    if (!response.ok) throw new Error(`Backend returned ${response.status}`);

    const data = await response.json();

    displayPageAnalysis(data);
    showStatus('✅ Page analyzed!', 'success');

  } catch (error) {
    console.error('Capture error:', error);
    showStatus(`❌ Error: ${error.message}`, 'error');
  }
}

/**
 * Display guidance results
 * Handles the "steps" format from background-enhanced.js
 */
function displayGuidance(data, query) {
  results.innerHTML = '';

  // Data structure from background: { guidance: { steps: [...] } }
  const steps = data.guidance?.steps || [];

  const card = document.createElement('div');
  card.className = 'guidance-card';

  if (steps.length > 0) {
    const firstStep = steps[0];
    card.innerHTML = `
        <div class="step-number">🧭 Navigation Guide</div>
        <div class="guidance-text">
          <strong>Step 1 of ${steps.length}:</strong><br>
          ${firstStep.instruction}
          <br><br>
          <div style="font-size: 0.9em; opacity: 0.8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
            ${firstStep.reassurance || 'Follow the overlay on screen.'}
          </div>
        </div>
      `;
  } else {
    // Logic for fallback or empty steps
    card.innerHTML = `
        <div class="step-number">💡 Quick Tip</div>
        <div class="guidance-text">${generateFallbackText(query)}</div>
      `;
  }

  results.appendChild(card);
}

// ... Helpers ...

function showStatus(msg, type) {
  status.textContent = msg;
  status.className = `status ${type}`;
  if (type === 'loading') {
    status.style.display = 'block';
  } else {
    setTimeout(() => { status.style.display = 'none'; }, 3000);
  }
}

function saveToHistory(query, data) {
  const history = JSON.parse(localStorage.getItem('nav_history') || '[]');
  history.unshift({ query, timestamp: Date.now() });
  localStorage.setItem('nav_history', JSON.stringify(history.slice(0, 50)));
}

function showHistory() {
  const history = JSON.parse(localStorage.getItem('nav_history') || '[]');
  results.innerHTML = '';

  if (history.length === 0) {
    results.innerHTML = '<div class="guidance-text">No history yet.</div>';
    return;
  }

  history.forEach(item => {
    const div = document.createElement('div');
    div.className = 'history-item'; // CSS assumed
    div.innerText = `🕒 ${new Date(item.timestamp).toLocaleTimeString()} - ${item.query}`;
    div.style.padding = '8px';
    div.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
    div.style.cursor = 'pointer';
    div.onclick = () => { queryInput.value = item.query; handleSearch(); };
    results.appendChild(div);
  });
}

function displayFallbackGuidance(query) {
  const card = document.createElement('div');
  card.className = 'guidance-card';
  card.innerHTML = `
      <div class="step-number">⚠️ Connection Issue</div>
      <div class="guidance-text">
        Could not connect to Brain.<br>
        Trying local fallback...<br>
        <strong>${generateFallbackText(query)}</strong>
      </div>
    `;
  results.appendChild(card);
}

function generateFallbackText(query) {
  const q = query.toLowerCase();
  if (q.includes('create')) return "Look for a '+' button or 'New' button.";
  if (q.includes('setting')) return "Check the top-right corner avatar or gear icon.";
  return "Try exploring the sidebar menu.";
}
