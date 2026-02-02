// Navigator Background Service Worker
// Coordinates tool detection, guidance generation, and overlay injection

import { CONVEX_URL } from './config.js';

// State
let currentTool = null;
let currentContext = null;
let currentOfflinePlan = null; // Store offline plan if backend fails

// Listen for extension icon clicks
// COMMENTED OUT: Popup now handles icon clicks instead
// chrome.action.onClicked.addListener(async (tab) => {
//     console.log('[Navigator] Extension clicked, activating guidance...');

//     try {
//         const screenshot = await captureCurrentTab(tab.id);
//         const analysis = await detectToolAndUI(screenshot);  // Uses n8n or fallback
//         console.log('[Navigator] Tool detected:', analysis.tool);

//         currentTool = analysis.tool;
//         currentContext = analysis.context;

//         await showGuidancePrompt(tab.id, analysis);

//     } catch (error) {
//         console.error('[Navigator] Error activating guidance:', error);
//         // Fallback
//         const fallbackAnalysis = { tool: 'Unknown Tool', page: 'Home' };
//         await showGuidancePrompt(tab.id, fallbackAnalysis);
//     }
// });

// Capture Screenshot (Optimized for performance)
async function captureCurrentTab(tabId) {
    try {
        const dataUrl = await chrome.tabs.captureVisibleTab(null, {
            format: 'jpeg', // Use JPEG to reduce payload size
            quality: 50     // 50% quality is sufficient for Vision
        });

        // Convert data URL to base64
        const base64 = dataUrl.split(',')[1];
        return base64;
    } catch (error) {
        console.error('[Navigator] Error capturing screenshot:', error);
        return null;
    }
}

// Global Message Listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // async wrapper
    (async () => {
        try {
            if (request.action === 'contentScriptReady') {
                sendResponse({ success: true });
            }
            else if (request.action === 'requestGuidance') {
                const result = await handleGuidanceRequest({ ...request, tabId: sender.tab?.id });
                sendResponse(result);
            }
            else if (request.action === 'stepComplete') {
                const result = await handleStepComplete(request.stepIndex, sender.tab?.id);
                sendResponse(result);
            }
            else {
                sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (e) {
            sendResponse({ success: false, error: e.message });
        }
    })();
    return true; // Keep channel open
});

/**
 * Handle guidance request
 * Connects to local Python Brain (http://127.0.0.1:8000).
 */
async function handleGuidanceRequest(request) {
    const { query, tool, context, tabId } = request;

    // capture screenshot for context
    const screenshot = await captureCurrentTab(tabId);

    // Smarter Tool Detection: Use passed tool, or fall back to stored currentTool
    const qLower = (query || '').toLowerCase();
    let activeTool = tool;

    // If tool is unknown, try to use currentTool or detect from query
    if (!activeTool || activeTool === 'Unknown Tool' || activeTool === 'Unknown App') {
        if (currentTool && currentTool !== 'Unknown Tool' && currentTool !== 'Unknown App') {
            activeTool = currentTool;
        }
    }

    // Refine based on query keywords
    if (!activeTool || activeTool === 'Unknown Tool' || activeTool === 'Unknown App') {
        if (qLower.includes('notion')) activeTool = 'Notion';
        else if (qLower.includes('github')) activeTool = 'GitHub';
        else if (qLower.includes('openai')) activeTool = 'OpenAI';
        else if (qLower.includes('convex')) activeTool = 'Convex';
    }

    currentTool = activeTool; // Sync global state

    console.log(`[Navigator] Requesting guidance for ${activeTool}: "${query}"`);

    try {
        console.log('[Navigator] Requesting guidance from Local Brain (127.0.0.1:8000)...');

        // Use 127.0.0.1 and keepalive for reliability
        const response = await fetch('http://127.0.0.1:8000/query', {
            method: 'POST',
            mode: 'cors',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: query,
                tool_name: activeTool !== 'Unknown App' ? activeTool : null,
                top_k: 3
            })
        });

        if (!response.ok) throw new Error(`Server returned ${response.status} ${response.statusText}`);

        const data = await response.json();

        // Check if we got an answer
        if (!data || !data.answer) throw new Error('Brain returned empty response');

        // Parse Answer into Steps
        const steps = parseAnswerToSteps(data.answer, activeTool);
        console.log('[Navigator] Brain generated steps:', steps.length);

        // Success - Store plan for next/prev navigation
        currentOfflinePlan = steps;

        // Show first step
        if (steps.length > 0) {
            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: steps[0] });
        }
        return { success: true, guidance: { steps } };

    } catch (error) {
        console.warn('[Navigator] Brain offline. Switching to Simple Mode.', error);
        console.error('[Navigator] Error Details:', error);

        // 1. Try "Expert System" (Curated Plans) FIRST
        // Pass the error message so we can show it to the user
        let steps = generateOfflinePlan(currentTool, query, error.message || String(error));

        currentOfflinePlan = steps;
        await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: steps[0] });
        return { success: true, guidance: { steps } };
    }
}

function parseAnswerToSteps(answer, toolName) {
    // 1. Robust Split (handle windows/unix newlines)
    let textSegments = answer.split(/\r?\n/);

    // 2. Filter Preamble and Noise
    textSegments = textSegments
        .map(line => line.trim())
        .filter(line => {
            if (!line) return false;
            // Drop "Based on..." lines from RAG response
            if (line.toLowerCase().startsWith('based on')) return false;
            if (line.toLowerCase().startsWith('here is')) return false;
            if (line.toLowerCase().startsWith('i found')) return false;

            if (line.length < 5) return false;
            return true;
        })
        .map(line => line.replace(/^\d+\.\s*/, '').replace(/[*#`]/g, '').trim());

    // 3. Convert to Steps (Max 6)
    const parsedSteps = textSegments.slice(0, 6).map((segment, index) => ({
        stepNumber: index + 1,
        totalSteps: Math.min(textSegments.length, 6),
        instruction: segment,
        reassurance: index === 0 ? `Source: ${toolName || 'Knowledge Base'}` : "",
        targetSelector: null
    }));

    return parsedSteps;
}

/**
 * Handle step completion
 */
async function handleStepComplete(stepIndex, tabId) {
    // Always use the stored plan (Offline OR Online)
    if (currentOfflinePlan) {
        // stepIndex comes from content script as the 1-based Step Number that just finished.
        // e.g. Finished Step 1. We want array index 1 (which is Step 2).
        const nextIndex = stepIndex;

        if (nextIndex < currentOfflinePlan.length) {
            // Show next card in sequence
            const nextStep = currentOfflinePlan[nextIndex];
            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: nextStep });
            return { success: true, nextStep };
        } else {
            // End of steps: Don't close, go back to Input (Step 0)
            console.log('[Navigator] Plan complete. Resetting to input mode.');
            const resetStep = {
                stepNumber: 0,
                totalSteps: 1,
                instruction: "Is there anything else I can help you with?",
                reassurance: "Ask another question..."
            };

            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: resetStep });
            return { success: true, nextStep: resetStep };
        }
    }

    // Fallback if no plan found (shouldn't happen with above logic)
    await chrome.tabs.sendMessage(tabId, { action: 'hideGuidance' });
    return { success: true, nextStep: { complete: true } };
}

/**
 * Detect Tool (Mockable)
 */
async function detectToolAndUI(screenshot) {
    // 1. Try AI Vision (Backend with Ollama)
    try {
        console.log('[Navigator] Sending screenshot to Ollama Vision (127.0.0.1:8000)...');
        const response = await fetch('http://127.0.0.1:8000/webhook/detect-tool', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ screenshot })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.tool && data.tool !== 'Unknown App') {
                console.log('[Navigator] Vision Detected:', data.tool);
                return data;
            }
        }
    } catch (e) {
        console.warn('[Navigator] Vision detection failed, falling back to URL.', e);
    }

    // 2. Fallback Detection based on URL (Primary for now)
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tabs[0]?.url || '';
    let tool = 'Unknown App';

    if (url.includes('notion.so')) tool = 'Notion';
    else if (url.includes('github.com')) tool = 'GitHub';
    else if (url.includes('figma.com')) tool = 'Figma';
    else if (url.includes('convex.dev')) tool = 'Convex';

    return { tool, context: { url } };
}

/**
 * Generate Offline Plan (The "Embedded Brain")
 * Now accepts errorMsg to display connectivity issues cleanly
 */
function generateOfflinePlan(tool, query, errorMsg = "") {
    const q = query.toLowerCase();
    const plans = [];

    // NOTION PLANS
    if (tool === 'Notion') {
        if ((q.includes('page') || q.includes('new') || q.includes('create')) && !q.includes('database') && !q.includes('data base') && !q.includes('table')) {
            plans.push({ stepNumber: 1, totalSteps: 2, instruction: "Click the '+ New Page' button in sidebar.", reassurance: "It's usually at the bottom left.", targetSelector: ".notion-sidebar-container" });
            plans.push({ stepNumber: 2, totalSteps: 2, instruction: "Type a title for your page.", reassurance: "Press Enter to start writing.", targetSelector: "[contenteditable='true']" });
        } else if (q.includes('database') || q.includes('data base') || q.includes('table')) {
            // DETAILED 6-STEP GUIDE FOR DATABASES
            plans.push({
                stepNumber: 1,
                totalSteps: 6,
                instruction: "Click anywhere on the open page.",
                reassurance: "We need to focus the cursor here.",
                targetSelector: ".notion-page-content"
            });
            plans.push({
                stepNumber: 2,
                totalSteps: 6,
                instruction: "Type '/database' instantly.",
                reassurance: "Don't pause! A menu will pop up.",
                targetSelector: ".notion-text-block" // Approximate
            });
            plans.push({
                stepNumber: 3,
                totalSteps: 6,
                instruction: "Press 'Enter' to select 'Database - Inline'.",
                reassurance: "This inserts a new table grid.",
                targetSelector: null
            });
            plans.push({
                stepNumber: 4,
                totalSteps: 6,
                instruction: "Name your database.",
                reassurance: "Click 'Untitled' and type a name.",
                targetSelector: ".notion-collection-view-path" // Varies by view
            });
            plans.push({
                stepNumber: 5,
                totalSteps: 6,
                instruction: "Add a new column.",
                reassurance: "Click the '+' icon on the right.",
                targetSelector: ".notion-collection-view-item-add"
            });
            plans.push({
                stepNumber: 6,
                totalSteps: 6,
                instruction: "Add your first row of data.",
                reassurance: "Click 'New' at the bottom.",
                targetSelector: ".notion-collection-item-add" // 'New' button
            });
        } else {
            // Generic Notion
            plans.push({ stepNumber: 1, totalSteps: 1, instruction: "I can't see the screen clearly.", reassurance: "Try rephrasing your request.", targetSelector: null });
        }
    }
    // VISION / IMAGES PLANS
    else if (q.includes('vision') || q.includes('image') || q.includes('picture') || q.includes('see')) {
        plans.push({
            stepNumber: 1,
            totalSteps: 3,
            instruction: "Use 'gpt-4o' for all vision tasks.",
            reassurance: "It has native multimodal capabilities.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 2,
            totalSteps: 3,
            instruction: "Pass images as base64 URLs.",
            reassurance: "In the 'user' message content content array.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 3,
            totalSteps: 3,
            instruction: "Set 'max_tokens' to at least 300.",
            reassurance: "Vision responses can be verbose.",
            targetSelector: null
        });
    }
    // CREATIVE WRITING PLANS
    else if (q.includes('writing') || q.includes('creative') || q.includes('story') || q.includes('blog')) {
        plans.push({
            stepNumber: 1,
            totalSteps: 3,
            instruction: "Use 'gpt-4o' for creative writing.",
            reassurance: "It offers the best nuance and style.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 2,
            totalSteps: 3,
            instruction: "Set 'temperature' to 0.7 - 0.9.",
            reassurance: "Higher temperature = more creativity.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 3,
            totalSteps: 3,
            instruction: "Provide style guides in 'system' prompt.",
            reassurance: "e.g., 'Write in the style of Hemingway'.",
            targetSelector: null
        });
    }
    // OPENAI / CODING PLANS (Specific)
    else if (q.includes('coding') || q.includes('python') || (q.includes('code') && !q.includes('no code'))) {
        plans.push({
            stepNumber: 1,
            totalSteps: 3,
            instruction: "For coding, use 'gpt-4o' or 'o1-preview'.",
            reassurance: "These (and o1-mini) are optimized for reasoning.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 2,
            totalSteps: 3,
            instruction: "Install the library: 'pip install openai'",
            reassurance: "Ensure you have Python 3.9+.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 3,
            totalSteps: 3,
            instruction: "Use 'AsyncOpenAI' for better performance.",
            reassurance: "See docs for async usage examples.",
            targetSelector: null
        });
    }
    // GITHUB PLANS
    else if (tool === 'GitHub') {
        if (q.includes('repo') || q.includes('new')) {
            plans.push({ stepNumber: 1, totalSteps: 2, instruction: "Click the '+' icon in header.", reassurance: "Top right corner.", targetSelector: "header" });
            plans.push({ stepNumber: 2, totalSteps: 2, instruction: "Select 'New repository'.", reassurance: "", targetSelector: null });
        } else {
            plans.push({ stepNumber: 1, totalSteps: 1, instruction: "Check the GitHub navigation bar.", reassurance: "Most actions are there.", targetSelector: "header" });
        }
    }
    // CONVEX PLANS
    else if (tool === 'Convex') {
        plans.push({
            stepNumber: 1,
            totalSteps: 2,
            instruction: "Connection Failed: " + (errorMsg.slice(0, 50) || "Check Server"),
            reassurance: "Ensure localhost:8000 is reachable.",
            targetSelector: null
        });
        plans.push({
            stepNumber: 2,
            totalSteps: 2,
            instruction: "Run 'python -m uvicorn server.api:app'",
            reassurance: "Available in your ScrapeData folder.",
            targetSelector: null
        });
    }
    // FALLBACK (Generic)
    else {
        plans.push({
            stepNumber: 1,
            totalSteps: 2,
            instruction: "Brain not connected.",
            reassurance: "Error: " + (errorMsg.slice(0, 30) || "Unknown"),
            targetSelector: null
        });
        plans.push({
            stepNumber: 2,
            totalSteps: 2,
            instruction: "Or check your n8n logs.",
            reassurance: "The backend refused to connect.",
            targetSelector: null
        });
    }

    // Normalize valid Plan
    return plans;
}

async function showGuidancePrompt(tabId, analysis) {
    try {
        await ensureContentScriptInjected(tabId);
        await chrome.tabs.sendMessage(tabId, {
            action: 'toggleGuidance',
            step: {
                stepNumber: 0,
                totalSteps: 1,
                instruction: `I see you are on ${analysis.tool}. How can I help?`,
                reassurance: 'Online Mode Ready'
            }
        });
    } catch (e) { console.error(e); }
}

async function ensureContentScriptInjected(tabId) {
    try { await chrome.tabs.sendMessage(tabId, { action: 'ping' }); }
    catch (e) {
        await chrome.scripting.executeScript({ target: { tabId }, files: ['content-script.js'] });
        await new Promise(r => setTimeout(r, 200));
    }
}

function showSuccessNotification(msg) {
    chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png', title: 'Navigator', message: msg });
}
