// Navigator Background Service Worker
// Coordinates tool detection, guidance generation, and overlay injection

import { CONVEX_URL } from './config.js';

// State
let currentTool = null;
let currentContext = null;
let currentOfflinePlan = null; // Store offline plan if backend fails

// Listen for extension icon clicks
chrome.action.onClicked.addListener(async (tab) => {
    console.log('[Navigator] Extension clicked, activating guidance...');

    try {
        const screenshot = await captureCurrentTab(tab.id);
        const analysis = await detectToolAndUI(screenshot);  // Uses n8n or fallback
        console.log('[Navigator] Tool detected:', analysis.tool);

        currentTool = analysis.tool;
        currentContext = analysis.context;

        await showGuidancePrompt(tab.id, analysis);

    } catch (error) {
        console.error('[Navigator] Error activating guidance:', error);
        // Fallback
        const fallbackAnalysis = { tool: 'Unknown Tool', page: 'Home' };
        await showGuidancePrompt(tab.id, fallbackAnalysis);
    }
});

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
                const result = await handleGuidanceRequest(request.query, sender.tab?.id);
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
 * Tries n8n first. If fails, uses Smart Offline Mode.
 */
async function handleGuidanceRequest(query, tabId) {
    // capture screenshot for context
    const screenshot = await captureCurrentTab(tabId);

    // 15-second timeout for n8n
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        console.log('[Navigator] Requesting guidance from Brain...');
        const response = await fetch('http://localhost:5678/webhook/generate-guidance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                query: query,
                tool: currentTool,
                context: currentContext,
                screenshot: screenshot, // optimized jpeg
                timestamp: Date.now()
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('n8n responded with error');

        const guidance = await response.json();

        // Check if empty response (common n8n failure)
        if (!guidance || Object.keys(guidance).length === 0) throw new Error('n8n returned empty response');

        // Success - Clear offline plan
        currentOfflinePlan = null;

        // Show first step
        if (guidance.steps && guidance.steps.length > 0) {
            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: guidance.steps[0] });
        }
        return { success: true, guidance };

    } catch (error) {
        clearTimeout(timeoutId);
        console.warn('[Navigator] Brain offline/error. Switching to Embedded Brain.', error);

        // --- SMART OFFLINE MODE ---
        // Generate a plausible plan locally so the user experience is smooth
        currentOfflinePlan = generateOfflinePlan(currentTool, query);

        const firstStep = currentOfflinePlan[0];

        await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: firstStep });

        return { success: true, guidance: { steps: currentOfflinePlan } };
    }
}

/**
 * Handle step completion
 */
async function handleStepComplete(stepIndex, tabId) {
    // If we are in Offline Mode, use the stored plan
    if (currentOfflinePlan) {
        const nextIndex = stepIndex + 1;
        if (nextIndex < currentOfflinePlan.length) {
            const nextStep = currentOfflinePlan[nextIndex];
            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: nextStep });
            return { success: true, nextStep };
        } else {
            // Done
            await chrome.tabs.sendMessage(tabId, { action: 'hideGuidance' });
            showSuccessNotification("Procedure complete!");
            return { success: true, nextStep: { complete: true } };
        }
    }

    // Otherwise, try n8n for dynamic next step
    try {
        const response = await fetch('http://localhost:5678/webhook/next-step', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stepIndex, tool: currentTool })
        });

        if (!response.ok) throw new Error('n8n error');
        const nextStep = await response.json();

        if (nextStep.complete) {
            await chrome.tabs.sendMessage(tabId, { action: 'hideGuidance' });
            showSuccessNotification('Workflow complete!');
        } else {
            await chrome.tabs.sendMessage(tabId, { action: 'showGuidance', step: nextStep });
        }
        return { success: true, nextStep };

    } catch (error) {
        console.warn('[Navigator] Next step failed. Falling back to simple completion.');
        // If n8n fails mid-flow, just finish gracefully
        await chrome.tabs.sendMessage(tabId, { action: 'hideGuidance' });
        showSuccessNotification("Task complete (Offline).");
        return { success: true, nextStep: { complete: true } };
    }
}

/**
 * Detect Tool (Mockable)
 */
async function detectToolAndUI(screenshot) {
    try {
        // Try n8n detection
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Fast timeout

        const response = await fetch('http://localhost:5678/webhook/detect-tool', {
            method: 'POST',
            body: JSON.stringify({ screenshot }),
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) return await response.json();
        throw new Error('Detection failed');
    } catch (e) {
        // Fallback Detection based on URL
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tabs[0]?.url || '';
        let tool = 'Unknown App';
        if (url.includes('notion.so')) tool = 'Notion';
        if (url.includes('github.com')) tool = 'GitHub';
        if (url.includes('figma.com')) tool = 'Figma';

        return { tool, context: { url } };
    }
}

/**
 * Generate Offline Plan (The "Embedded Brain")
 */
function generateOfflinePlan(tool, query) {
    const q = query.toLowerCase();
    const plans = [];

    // NOTION PLANS
    if (tool === 'Notion') {
        if (q.includes('page') || q.includes('new') || q.includes('create')) {
            plans.push({ stepNumber: 1, totalSteps: 2, instruction: "Click the '+ New Page' button in sidebar.", reassurance: "It's usually at the bottom left.", targetSelector: ".notion-sidebar-container" });
            plans.push({ stepNumber: 2, totalSteps: 2, instruction: "Type a title for your page.", reassurance: "Press Enter to start writing.", targetSelector: "[contenteditable='true']" });
        } else if (q.includes('database') || q.includes('table')) {
            plans.push({ stepNumber: 1, totalSteps: 2, instruction: "Type '/database' on the page.", reassurance: "This opens the block menu.", targetSelector: ".notion-page-content" });
            plans.push({ stepNumber: 2, totalSteps: 2, instruction: "Select 'Database - Inline'.", reassurance: "This creates a new table.", targetSelector: null });
        } else {
            // Generic Notion
            plans.push({ stepNumber: 1, totalSteps: 1, instruction: "I can't see the screen clearly.", reassurance: "Try rephrasing your request.", targetSelector: null });
        }
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
    // FALLBACK (Generic)
    else {
        plans.push({
            stepNumber: 1,
            totalSteps: 2,
            instruction: "I'm in Offline Mode.",
            reassurance: "Try asking: 'How to create a page'",
            targetSelector: ".notion-sidebar-container"
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
            action: 'showGuidance',
            step: {
                stepNumber: 0,
                totalSteps: 1,
                instruction: `I see you are on ${analysis.tool}. How can I help?`,
                reassurance: 'Offline Mode Ready'
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
