document.addEventListener("DOMContentLoaded", () => {
  const screenshotBtn = document.getElementById("screenshot");
  const statusEl = document.getElementById("status");

  if (!screenshotBtn || !statusEl) {
    console.error("Popup elements not found");
    return;
  }

  screenshotBtn.addEventListener("click", () => {
    statusEl.innerText = "Capturing...";

    chrome.runtime.sendMessage({ type: "TAKE_SCREENSHOT" }, (response) => {
      if (response?.image) {
        chrome.storage.local.set({
          lastScreenshot: response.image,
          timestamp: Date.now()
        });

        // Upload to Convex using 3-step storage flow
        const convexSiteUrl = "https://abundant-porpoise-181.convex.cloud";
        console.log("Starting upload flow to:", convexSiteUrl);

        (async () => {
          try {
            // Convert Data URL to Blob
            const base64Data = response.image.replace(/^data:image\/\w+;base64,/, "");
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: "image/png" });

            // Step 1: Get Upload URL
            const urlResponse = await fetch(`${convexSiteUrl}/api/mutation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "screenshots:generateUploadUrl",
                args: {},
                format: "json",
              }),
            });
            if (!urlResponse.ok) throw new Error(`Failed to get upload URL: ${await urlResponse.text()}`);
            const urlJson = await urlResponse.json();
            const uploadUrl = urlJson.value;

            // Step 2: Upload Image
            const uploadResponse = await fetch(uploadUrl, {
              method: "POST",
              headers: { "Content-Type": "image/png" },
              body: blob,
            });
            if (!uploadResponse.ok) throw new Error(`Failed to upload image: ${await uploadResponse.text()}`);
            const uploadJson = await uploadResponse.json();
            const storageId = uploadJson.storageId;

            // Step 3: Save Record
            const saveResponse = await fetch(`${convexSiteUrl}/api/mutation`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                path: "screenshots:create",
                args: {
                  storageId: storageId,
                  timestamp: Date.now(),
                },
                format: "json",
              }),
            });
            if (!saveResponse.ok) throw new Error(`Failed to save record: ${await saveResponse.text()}`);

            statusEl.innerText = "Screenshot saved to Convex ✅";
            console.log("Upload successful!");

          } catch (error) {
            statusEl.innerText = "Upload error ❌";
            console.error("Upload error:", error);
          }
        })();

        statusEl.innerText = "Uploading...";
      } else {
        statusEl.innerText = "Failed ❌";
      }
    });
  });
});

