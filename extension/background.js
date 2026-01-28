chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TAKE_SCREENSHOT") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ image: dataUrl });
    });
    return true;
  }
});
console.log("Background service worker loaded");
