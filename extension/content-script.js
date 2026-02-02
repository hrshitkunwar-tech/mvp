// Navigator Content Script
// Injected into every webpage to provide on-demand guidance overlays

(function () {
  'use strict';

  // Configuration
  const CONFIG = {
    CONVEX_URL: 'https://abundant-porpoise-181.convex.cloud',
    POPUP_POSITION: 'top-right',
    HIGHLIGHT_COLOR: '#4C6FFF',
    ANIMATION_DURATION: 180
  };

  // State
  let cardStack = []; // Array of overlay elements
  let isActive = false;
  let highlightedElement = null;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Navigator] Received message:', request.action);

    switch (request.action) {
      case 'showGuidance':
        showGuidanceOverlay(request.step);
        sendResponse({ success: true });
        break;

      case 'toggleGuidance':
        if (isActive) {
          hideGuidanceOverlay();
        } else {
          showGuidanceOverlay(request.step);
        }
        sendResponse({ success: true });
        break;

      case 'hideGuidance':
        hideGuidanceOverlay();
        sendResponse({ success: true });
        break;

      case 'detectUI':
        const uiState = analyzeCurrentPage();
        sendResponse({ uiState });
        break;

      case 'highlightElement':
        highlightElement(request.selector);
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }

    return true; // Keep message channel open for async response
  });

  /**
   * Show guidance overlay (Stacked Card Style)
   */
  function showGuidanceOverlay(step) {
    // 1. Push existing cards back (3D stack effect)
    cardStack.forEach((card, index) => {
      const reverseIndex = cardStack.length - 1 - index;
      const offset = (reverseIndex + 1) * 12; // 12px vertical offset
      const scale = 1 - ((reverseIndex + 1) * 0.05); // slightly smaller
      const opacity = 1 - ((reverseIndex + 1) * 0.3); // fade out

      card.style.transform = `translateY(${offset}px) scale(${scale})`;
      card.style.opacity = Math.max(opacity, 0);
      card.style.zIndex = 2147483647 - (reverseIndex + 1);
      card.style.pointerEvents = 'none'; // Disable interaction with background cards
    });

    // 2. Create new card
    const overlay = createOverlayElement(step);
    document.body.appendChild(overlay);

    // 3. Add to stack
    cardStack.push(overlay);
    isActive = true;

    // 4. Highlight target
    if (step.targetSelector) {
      highlightElement(step.targetSelector);
    }

    // 5. Animate In & Type Text
    requestAnimationFrame(() => {
      overlay.classList.add('navigator-popup--visible');

      // Typing effect for instruction (only if not step 0, or if detailed instruction)
      const instructionEl = overlay.querySelector('.navigator-popup__instruction');
      if (instructionEl && step.instruction && step.stepNumber > 0) {
        typeText(instructionEl, step.instruction);
      }
    });

    console.log('[Navigator] Card added to stack. Total:', cardStack.length);
  }

  /**
   * Hide guidance overlay
   */
  function hideGuidanceOverlay() {
    // Close all
    cardStack.forEach(card => card.remove());
    cardStack = [];

    if (highlightedElement) {
      highlightedElement.classList.remove('navigator-highlight');
      highlightedElement = null;
    }
    isActive = false;
  }

  /**
   * Typewriter effect helper
   */
  function typeText(element, text) {
    if (!element) return;
    element.textContent = ''; // Clear initial text
    let i = 0;
    const speed = 20; // ms per char

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    type();
  }

  /**
   * Create overlay DOM element
   */
  function createOverlayElement(step) {
    const overlay = document.createElement('div');
    overlay.className = 'navigator-guidance-popup';
    overlay.setAttribute('role', 'complementary');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Step-by-step guidance');

    // Step indicator
    const stepIndicator = document.createElement('div');
    stepIndicator.className = 'navigator-popup__step-indicator';
    stepIndicator.textContent = `Step ${step.stepNumber} of ${step.totalSteps}`;

    // Instruction container
    const instruction = document.createElement('div');
    instruction.className = 'navigator-popup__instruction';
    // If typing effect is used, this starts empty or with full text depending on logic.
    // We'll set it to full text initially to prevent layout shift if typing fails, 
    // but typeText will clear it.
    instruction.textContent = step.instruction;

    // Optional reassurance
    let reassurance = null;
    if (step.reassurance) {
      reassurance = document.createElement('div');
      reassurance.className = 'navigator-popup__reassurance';
      reassurance.textContent = step.reassurance;
    }

    // Assemble base
    overlay.appendChild(stepIndicator);
    overlay.appendChild(instruction);
    if (reassurance) {
      overlay.appendChild(reassurance);
    }

    // Add Input Field for Step 0 (Initial Prompt)
    if (step.stepNumber === 0) {
      const inputContainer = document.createElement('div');
      inputContainer.className = 'navigator-input-container';

      const input = document.createElement('input');
      input.className = 'navigator-input';
      input.type = 'text';
      input.placeholder = 'Ask anything...';
      input.autofocus = true;

      const submitBtn = document.createElement('button');
      submitBtn.className = 'navigator-submit-btn';
      submitBtn.innerHTML = '➞';

      inputContainer.appendChild(input);
      inputContainer.appendChild(submitBtn);
      overlay.appendChild(inputContainer);

      // Handle Submit
      const handleSubmit = () => {
        const query = input.value.trim();
        if (query) {
          // Show loading state
          input.disabled = true;
          submitBtn.innerHTML = '...';
          instruction.textContent = 'Thinking...';
          stepIndicator.textContent = 'Processing request';

          chrome.runtime.sendMessage({
            action: 'requestGuidance',
            query: query
          }, (response) => {
            if (!response || !response.success) {
              // Error handling
              input.disabled = false;
              submitBtn.innerHTML = '➞';
              instruction.textContent = 'Something went wrong. Try again.'; // Check n8n logs
            }
          });
        }
      };

      submitBtn.onclick = handleSubmit;
      input.onkeydown = (e) => {
        if (e.key === 'Enter') handleSubmit();
      };

      // Focus input after animation
      setTimeout(() => input.focus(), 200);

    } else {
      // For normal steps, add a "Next" button
      const actionRow = document.createElement('div');
      actionRow.className = 'navigator-action-row';

      const nextBtn = document.createElement('button');
      nextBtn.className = 'navigator-next-btn';
      nextBtn.textContent = 'Next Step';
      nextBtn.onclick = () => {
        chrome.runtime.sendMessage({
          action: 'stepComplete',
          stepIndex: step.stepNumber
        });
      };

      actionRow.appendChild(nextBtn);
      overlay.appendChild(actionRow);
    }

    return overlay;
  }

  /**
   * Highlight a specific element on the page
   */
  function highlightElement(selector) {
    try {
      const element = document.querySelector(selector);

      if (element) {
        if (highlightedElement) {
          highlightedElement.classList.remove('navigator-highlight');
        }
        element.classList.add('navigator-highlight');
        highlightedElement = element;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[Navigator] Highlighted element:', selector);
      } else {
        console.warn('[Navigator] Element not found:', selector);
      }
    } catch (error) {
      console.error('[Navigator] Error highlighting element:', error);
    }
  }

  /**
   * Analyze current page UI state
   */
  function analyzeCurrentPage() {
    return {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      elements: {
        buttons: document.querySelectorAll('button').length,
        inputs: document.querySelectorAll('input').length,
        links: document.querySelectorAll('a').length
      },
      timestamp: Date.now()
    };
  }

  /**
   * Inject styles for guidance overlay
   */
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Navigator Guidance Popup */
      .navigator-guidance-popup {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        width: 320px;
        padding: 20px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0,0,0,0.05);
        opacity: 0;
        transform: translateY(-8px) scale(0.98);
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
        pointer-events: auto;
      }

      @media (prefers-color-scheme: dark) {
        .navigator-guidance-popup {
          background: rgba(30, 30, 35, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255,255,255,0.05);
        }
      }

      .navigator-guidance-popup.navigator-popup--visible {
        opacity: 1;
        transform: translateY(0) scale(1);
      }

      .navigator-popup__step-indicator {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.5);
        margin-bottom: 8px;
      }

      @media (prefers-color-scheme: dark) {
        .navigator-popup__step-indicator { color: rgba(255, 255, 255, 0.5); }
      }

      .navigator-popup__instruction {
        font-size: 15px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.95);
        line-height: 1.4;
        margin-bottom: 6px;
        min-height: 21px; /* prevent jumps */
      }

      @media (prefers-color-scheme: dark) {
        .navigator-popup__instruction { color: rgba(255, 255, 255, 0.95); }
      }

      .navigator-popup__reassurance {
        font-size: 13px;
        font-weight: 400;
        color: rgba(0, 0, 0, 0.6);
        line-height: 1.4;
      }

      @media (prefers-color-scheme: dark) {
        .navigator-popup__reassurance { color: rgba(255, 255, 255, 0.6); }
      }

      /* Input Field */
      .navigator-input-container {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }

      .navigator-input {
        flex: 1;
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid transparent;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 13px;
        color: inherit;
        outline: none;
        transition: all 0.2s;
      }
      
      .navigator-input:focus {
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 0 0 2px ${CONFIG.HIGHLIGHT_COLOR};
      }

      @media (prefers-color-scheme: dark) {
        .navigator-input {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .navigator-input:focus {
          background: rgba(0,0,0,0.5);
        }
      }

      .navigator-submit-btn, .navigator-next-btn {
        background: ${CONFIG.HIGHLIGHT_COLOR};
        color: white;
        border: none;
        border-radius: 8px;
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .navigator-submit-btn:hover, .navigator-next-btn:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      
      .navigator-submit-btn:active, .navigator-next-btn:active {
        transform: scale(0.96);
      }

      .navigator-action-row {
        margin-top: 16px;
        display: flex;
        justify-content: flex-end;
      }

      /* Element Highlighting */
      .navigator-highlight {
        outline: 3px solid ${CONFIG.HIGHLIGHT_COLOR} !important;
        outline-offset: 4px !important;
        border-radius: 4px !important;
        position: relative !important;
        animation: navigator-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        z-index: 2147483646 !important;
      }

      @keyframes navigator-pulse {
        0%, 100% { outline-color: ${CONFIG.HIGHLIGHT_COLOR}; outline-offset: 4px; }
        50% { outline-color: rgba(76, 111, 255, 0.4); outline-offset: 6px; }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .navigator-guidance-popup {
          width: 90%;
          left: 5%;
          right: 5%;
          top: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Initialize
  injectStyles();
  console.log('[Navigator] Content script loaded and ready');

  // Notify background script
  chrome.runtime.sendMessage({ action: 'contentScriptReady' });

})();
