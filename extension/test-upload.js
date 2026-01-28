// Test script to verify Convex Storage Upload
const CONVEX_SITE_URL = "https://abundant-porpoise-181.convex.cloud";

const testUpload = async () => {
    // 1x1 red pixel PNG
    const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    const binaryString = atob(testImageBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "image/png" });

    console.log("Starting upload test via generateUploadUrl...");

    try {
        // Step 1: Get Upload URL
        console.log("1. getting upload URL...");
        const urlResponse = await fetch(`${CONVEX_SITE_URL}/api/mutation`, {
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
        console.log("   Full response:", JSON.stringify(urlJson));
        const uploadUrl = urlJson.value; // Convex returns { value: ... }
        console.log("   Upload URL:", uploadUrl);

        // Step 2: Upload Image
        console.log("2. Uploading image...");
        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: blob,
        });

        if (!uploadResponse.ok) throw new Error(`Failed to upload image: ${await uploadResponse.text()}`);
        const uploadJson = await uploadResponse.json();
        const storageId = uploadJson.storageId;
        console.log("   Storage ID:", storageId);

        // Step 3: Save Record
        console.log("3. Saving record...");
        const saveResponse = await fetch(`${CONVEX_SITE_URL}/api/mutation`, {
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
        console.log("✅ Upload successful!");

    } catch (error) {
        console.error("❌ Error:", error);
    }
};

testUpload();
