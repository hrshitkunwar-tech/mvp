/**
 * ZoneGuide Workflow Recorder
 * Captures user interactions and builds replayable workflows
 *
 * Features:
 * - Click event capture with element metadata
 * - Zone detection integration
 * - Visual recording indicators
 * - Alt+Shift+R keyboard shortcut
 * - Workflow step management
 */

(function() {
  'use strict';

  // Recorder state
  let isRecording = false;
  let currentWorkflow = null;
  let recordingStartTime = null;
  let stepCounter = 0;

  // UI elements
  let recordingIndicator = null;
  let stepFeedback = null;

  /**
   * Initialize recorder
   */
  function init() {
    console.log('[ZoneGuide Recorder] Initializing...');

    // Create UI elements
    createRecordingIndicator();
    createStepFeedback();

    // Listen for recording toggle command
    document.addEventListener('keydown', handleKeyboardShortcut);

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);

    console.log('[ZoneGuide Recorder] Ready');
  }

  /**
   * Handle keyboard shortcut (Alt+Shift+R)
   */
  function handleKeyboardShortcut(event) {
    if (event.altKey && event.shiftKey && event.key === 'R') {
      event.preventDefault();
      toggleRecording();
    }
  }

  /**
   * Handle messages from extension
   */
  function handleMessage(message, sender, sendResponse) {
    if (message.action === 'toggleRecording') {
      toggleRecording();
      sendResponse({ success: true, isRecording });
    } else if (message.action === 'getRecordingState') {
      sendResponse({ isRecording, stepCount: stepCounter });
    }
    return true;
  }

  /**
   * Toggle recording on/off
   */
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  /**
   * Start recording workflow
   */
  function startRecording() {
    console.log('[ZoneGuide Recorder] Starting recording...');

    isRecording = true;
    recordingStartTime = Date.now();
    stepCounter = 0;

    // Initialize workflow object
    currentWorkflow = {
      id: generateWorkflowId(),
      name: `Workflow ${new Date().toLocaleString()}`,
      url: window.location.href,
      domain: window.location.hostname,
      steps: [],
      createdAt: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    };

    // Attach click listener
    document.addEventListener('click', captureClick, true);

    // Show recording indicator
    showRecordingIndicator();

    // Notify user
    showNotification('🔴 Recording started', 'Click on elements to record workflow');

    // Notify extension
    chrome.runtime.sendMessage({
      action: 'recordingStarted',
      workflow: currentWorkflow
    });
  }

  /**
   * Stop recording workflow
   */
  function stopRecording() {
    console.log('[ZoneGuide Recorder] Stopping recording...');

    isRecording = false;

    // Remove click listener
    document.removeEventListener('click', captureClick, true);

    // Hide recording indicator
    hideRecordingIndicator();

    // Finalize workflow
    if (currentWorkflow) {
      currentWorkflow.duration = Date.now() - recordingStartTime;
      currentWorkflow.stepCount = stepCounter;

      console.log('[ZoneGuide Recorder] Workflow recorded:', currentWorkflow);

      // Save workflow
      saveWorkflow(currentWorkflow);

      // Show success notification
      showNotification(
        '✅ Recording complete',
        `Captured ${stepCounter} steps`
      );

      // Notify extension
      chrome.runtime.sendMessage({
        action: 'recordingStopped',
        workflow: currentWorkflow
      });
    }

    // Reset state
    currentWorkflow = null;
    recordingStartTime = null;
    stepCounter = 0;
  }

  /**
   * Capture click event
   */
  function captureClick(event) {
    if (!isRecording) return;

    const element = event.target;

    // Skip clicks on recording UI
    if (element.closest('.zg-recording-indicator') ||
        element.closest('.zg-step-feedback')) {
      return;
    }

    // Prevent default for links during recording (optional)
    // event.preventDefault();

    // Get element metadata
    const metadata = window.__ZONEGUIDE_SELECTOR__.getMetadata(element);

    // Get zone information
    const zone = window.__ZONEGUIDE__.getZone(element);

    // Get click coordinates
    const rect = element.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Create workflow step
    const step = {
      stepNumber: ++stepCounter,
      timestamp: Date.now() - recordingStartTime,
      action: 'click',
      selector: metadata.selector,
      element: {
        tag: metadata.tagName,
        text: metadata.text,
        type: metadata.type,
        href: metadata.href,
        id: metadata.id,
        classes: metadata.classes,
        attributes: metadata.attributes
      },
      zone: zone,
      coordinates: {
        x: clickX,
        y: clickY,
        relativeX: clickX / rect.width,
        relativeY: clickY / rect.height
      },
      viewport: {
        scrollX: window.scrollX,
        scrollY: window.scrollY
      }
    };

    // Add step to workflow
    currentWorkflow.steps.push(step);

    console.log(`[ZoneGuide Recorder] Step ${stepCounter} captured:`, step);

    // Visual feedback
    showStepFeedback(element, stepCounter, zone);

    // Show zone overlay briefly
    if (window.__ZONEGUIDE__ && window.__ZONEGUIDE__.test) {
      window.__ZONEGUIDE__.test.showZone(zone, 1000);
    }
  }

  /**
   * Save workflow to storage
   */
  function saveWorkflow(workflow) {
    try {
      // Use ZoneGuide Storage API (IndexedDB + Chrome storage backup)
      if (window.__ZONEGUIDE_STORAGE__) {
        window.__ZONEGUIDE_STORAGE__.save(workflow, function(err, savedWorkflow) {
          if (err) {
            console.error('[ZoneGuide Recorder] Error saving workflow:', err);
          } else {
            console.log('[ZoneGuide Recorder] Workflow saved:', savedWorkflow.id);
          }
        });
      } else {
        // Fallback to Chrome storage if storage module not loaded
        chrome.storage.local.get(['workflows'], function(result) {
          const workflows = result.workflows || [];
          workflows.push(workflow);

          chrome.storage.local.set({ workflows: workflows }, function() {
            console.log('[ZoneGuide Recorder] Workflow saved (fallback)');
          });
        });
      }

    } catch (error) {
      console.error('[ZoneGuide Recorder] Error saving workflow:', error);
    }
  }

  /**
   * Generate unique workflow ID
   */
  function generateWorkflowId() {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create recording indicator UI
   */
  function createRecordingIndicator() {
    recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'zg-recording-indicator';
    recordingIndicator.innerHTML = `
      <div class="zg-rec-pulse"></div>
      <span class="zg-rec-text">Recording</span>
      <span class="zg-rec-counter">0 steps</span>
      <button class="zg-rec-stop" title="Stop Recording (Alt+Shift+R)">■</button>
    `;

    recordingIndicator.querySelector('.zg-rec-stop').addEventListener('click', stopRecording);

    document.body.appendChild(recordingIndicator);
  }

  /**
   * Create step feedback element
   */
  function createStepFeedback() {
    stepFeedback = document.createElement('div');
    stepFeedback.className = 'zg-step-feedback';
    document.body.appendChild(stepFeedback);
  }

  /**
   * Show recording indicator
   */
  function showRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.style.display = 'flex';
      updateStepCounter();

      // Update counter every second
      const interval = setInterval(() => {
        if (!isRecording) {
          clearInterval(interval);
          return;
        }
        updateStepCounter();
      }, 100);
    }
  }

  /**
   * Hide recording indicator
   */
  function hideRecordingIndicator() {
    if (recordingIndicator) {
      recordingIndicator.style.display = 'none';
    }
  }

  /**
   * Update step counter display
   */
  function updateStepCounter() {
    if (recordingIndicator) {
      const counter = recordingIndicator.querySelector('.zg-rec-counter');
      if (counter) {
        counter.textContent = `${stepCounter} step${stepCounter !== 1 ? 's' : ''}`;
      }
    }
  }

  /**
   * Show step feedback animation
   */
  function showStepFeedback(element, stepNumber, zone) {
    const rect = element.getBoundingClientRect();

    const feedback = document.createElement('div');
    feedback.className = 'zg-step-badge';
    feedback.textContent = stepNumber;
    feedback.style.left = `${rect.left + rect.width / 2}px`;
    feedback.style.top = `${rect.top + rect.height / 2}px`;

    document.body.appendChild(feedback);

    // Animate and remove
    setTimeout(() => {
      feedback.style.opacity = '0';
      feedback.style.transform = 'translate(-50%, -100px) scale(0.5)';
    }, 10);

    setTimeout(() => {
      feedback.remove();
    }, 500);
  }

  /**
   * Show notification toast
   */
  function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.className = 'zg-notification';
    notification.innerHTML = `
      <div class="zg-notification-title">${title}</div>
      <div class="zg-notification-message">${message}</div>
    `;

    document.body.appendChild(notification);

    // Show
    setTimeout(() => {
      notification.classList.add('zg-notification-show');
    }, 10);

    // Hide and remove
    setTimeout(() => {
      notification.classList.remove('zg-notification-show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  /**
   * Get all recorded workflows
   */
  function getWorkflows(callback) {
    if (window.__ZONEGUIDE_STORAGE__) {
      window.__ZONEGUIDE_STORAGE__.getAll(function(err, workflows) {
        if (err) {
          console.error('[ZoneGuide Recorder] Error getting workflows:', err);
          callback([]);
        } else {
          callback(workflows);
        }
      });
    } else {
      // Fallback to Chrome storage
      chrome.storage.local.get(['workflows'], function(result) {
        callback(result.workflows || []);
      });
    }
  }

  /**
   * Delete workflow by ID
   */
  function deleteWorkflow(workflowId, callback) {
    if (window.__ZONEGUIDE_STORAGE__) {
      window.__ZONEGUIDE_STORAGE__.delete(workflowId, function(err) {
        if (err) {
          console.error('[ZoneGuide Recorder] Error deleting workflow:', err);
        } else {
          console.log('[ZoneGuide Recorder] Workflow deleted:', workflowId);
        }
        if (callback) callback(err);
      });
    } else {
      // Fallback to Chrome storage
      chrome.storage.local.get(['workflows'], function(result) {
        const workflows = result.workflows || [];
        const filtered = workflows.filter(function(wf) { return wf.id !== workflowId; });

        chrome.storage.local.set({ workflows: filtered }, function() {
          console.log('[ZoneGuide Recorder] Workflow deleted:', workflowId);
          if (callback) callback();
        });
      });
    }
  }

  /**
   * Export workflow as JSON
   */
  function exportWorkflow(workflow) {
    if (window.__ZONEGUIDE_STORAGE__) {
      window.__ZONEGUIDE_STORAGE__.export(workflow);
    } else {
      // Fallback implementation
      const json = JSON.stringify(workflow, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflow.name.replace(/\s+/g, '_')}.json`;
      a.click();

      URL.revokeObjectURL(url);
    }
  }

  // Export public API
  window.__ZONEGUIDE_RECORDER__ = {
    start: startRecording,
    stop: stopRecording,
    toggle: toggleRecording,
    isRecording: () => isRecording,
    getCurrentWorkflow: () => currentWorkflow,
    getWorkflows: getWorkflows,
    deleteWorkflow: deleteWorkflow,
    exportWorkflow: exportWorkflow
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[ZoneGuide Recorder] Module loaded');

})();
