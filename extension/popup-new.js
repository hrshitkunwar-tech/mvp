// Navigator Popup - Search Interface
// Connects to n8n backend for AI-powered guidance

const N8N_WEBHOOK = 'http://localhost:5678/webhook/navigator-screenshot';
const CONVEX_URL = 'https://abundant-porpoise-181.convex.cloud';

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
    showStatus('Please enter a question', 'error');
    return;
  }

  showStatus('🔍 Analyzing...', 'loading');
  searchBtn.disabled = true;

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
}

/**
 * Handle page capture (analyze without query)
 */
async function handleCapture() {
  showStatus('📸 Capturing page...', 'loading');

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
 */
function displayGuidance(data, query) {
  results.innerHTML = '';

  // Create guidance card
  const card = document.createElement('div');
  card.className = 'guidance-card';

  // If we have UI state from vision analysis
  if (data.ui_state && data.ui_state.interpretation) {
    const interp = data.ui_state.interpretation;

    card.innerHTML = `
      <div class="step-number">🎯 ${interp.page_classification.page_type || 'Page'} Analysis</div>
      <div class="guidance-text">
        <strong>Tool Detected:</strong> ${interp.page_classification.product_area || 'Unknown'}<br>
        <strong>Confidence:</strong> ${Math.round((interp.page_classification.confidence || 0) * 100)}%<br>
        <strong>UI Elements Found:</strong> ${interp.ui_elements ? interp.ui_elements.length : 0}
      </div>
    `;

    // Add specific guidance based on query
    const guidanceText = generateGuidanceFromQuery(query, interp);
    if (guidanceText) {
      card.innerHTML += `
        <hr style="margin: 12px 0; border: none; border-top: 1px solid rgba(255,255,255,0.2);">
        <div class="guidance-text"><strong>Guidance:</strong><br>${guidanceText}</div>
      `;
    }
  } else {
    // Fallback
    card.innerHTML = `
      <div class="step-number">💡 Quick Guidance</div>
      <div class="guidance-text">${generateFallbackText(query)}</div>
    `;
  }

  results.appendChild(card);

  // Inject overlay on the page
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showGuidance',
      step: {
        stepNumber: 1,
        instruction: generateGuidanceFromQuery(query, data.ui_state?.interpretation),
        targetSelector: null
      }
    }).catch(err => console.log('Could not inject overlay:', err));
  });
}

/**
 * Display page analysis
 */
function displayPageAnalysis(data) {
  results.innerHTML = '';

  if (data.ui_state && data.ui_state.interpretation) {
    const interp = data.ui_state.interpretation;

    const card = document.createElement('div');
    card.className = 'guidance-card';
    card.innerHTML = `
      <div class="step-number">📊 Page Analysis</div>
      <div class="guidance-text">
        <strong>Page Type:</strong> ${interp.page_classification.page_type}<br>
        <strong>Tool:</strong> ${interp.page_classification.product_area || 'Unknown'}<br>
        <strong>Buttons Found:</strong> ${countElementsByType(interp.ui_elements, 'button')}<br>
        <strong>Inputs Found:</strong> ${countElementsByType(interp.ui_elements, 'input')}<br>
        <strong>Links Found:</strong> ${countElementsByType(interp.ui_elements, 'link')}
      </div>
    `;
    results.appendChild(card);
  }
}

/**
 * Generate guidance from query and UI state
 */
function generateGuidanceFromQuery(query, interpretation) {
  const q = query.toLowerCase();

  // Convex-specific guidance
  if (q.includes('convex') || (interpretation?.page_classification.product_area === 'convex')) {
    if (q.includes('table') || q.includes('schema')) {
      return 'To create a table in Convex:<br>1. Go to your schema.ts file<br>2. Define table with defineTable()<br>3. Deploy with: npx convex dev';
    }
    if (q.includes('query') || q.includes('read')) {
      return 'To query data in Convex:<br>1. Create a query in convex/queries.ts<br>2. Use db.query() to fetch data<br>3. Call from frontend with useQuery()';
    }
    if (q.includes('mutation') || q.includes('write')) {
      return 'To write data in Convex:<br>1. Create mutation in convex/mutations.ts<br>2. Use db.insert() or db.patch()<br>3. Call from frontend with useMutation()';
    }
  }

  // GitHub-specific
  if (q.includes('github') || (interpretation?.page_classification.product_area === 'github')) {
    if (q.includes('repo')) {
      return 'To create a new repo:<br>1. Click the "+" button (top-right)<br>2. Select "New repository"<br>3. Fill in repo name and settings';
    }
    if (q.includes('pull request') || q.includes('pr')) {
      return 'To create a pull request:<br>1. Push your branch<br>2. Go to repository<br>3. Click "Compare & pull request"';
    }
  }

  // Generic guidance
  return `Based on your question about "${query}", look for relevant buttons or menus on the current page.`;
}

/**
 * Generate fallback text
 */
function generateFallbackText(query) {
  return `I'm analyzing your question: "${query}". The AI backend is processing your request. Check the page for visual highlights showing where to click.`;
}

/**
 * Display fallback guidance
 */
function displayFallbackGuidance(query) {
  results.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'guidance-card';
  card.innerHTML = `
    <div class="step-number">💡 Offline Guidance</div>
    <div class="guidance-text">
      Backend is offline. Here's general guidance:<br><br>
      ${generateGuidanceFromQuery(query, null)}
    </div>
  `;
  results.appendChild(card);
}

/**
 * Show status message
 */
function showStatus(message, type = '') {
  status.textContent = message;
  status.className = `status visible ${type}`;
  setTimeout(() => {
    if (type !== 'success') {
      status.className = 'status';
    }
  }, 3000);
}

/**
 * Detect tool from URL
 */
function detectToolFromUrl(url) {
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
 * Count elements by type
 */
function countElementsByType(elements, type) {
  if (!elements) return 0;
  return elements.filter(el => el.type === type).length;
}

/**
 * Save to history
 */
function saveToHistory(query, data) {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];
    history.unshift({
      query,
      data,
      timestamp: Date.now()
    });
    // Keep only last 10
    chrome.storage.local.set({ history: history.slice(0, 10) });
  });
}

/**
 * Show history
 */
function showHistory() {
  chrome.storage.local.get(['history'], (result) => {
    const history = result.history || [];

    results.innerHTML = '';

    if (history.length === 0) {
      const card = document.createElement('div');
      card.className = 'guidance-card';
      card.innerHTML = '<div class="guidance-text">No history yet. Try asking a question!</div>';
      results.appendChild(card);
      return;
    }

    history.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'guidance-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="step-number">${new Date(item.timestamp).toLocaleString()}</div>
        <div class="guidance-text">${item.query}</div>
      `;
      card.onclick = () => {
        queryInput.value = item.query;
        handleSearch();
      };
      results.appendChild(card);
    });
  });
}

// Initialize
console.log('[Navigator Popup] Ready');
