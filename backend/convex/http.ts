import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Upload screenshot and auto-trigger n8n webhook
http.route({
  path: "/upload-screenshot",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse base64 image from request
      const { screenshot, metadata } = await request.json();
      
      if (!screenshot) {
        return new Response(
          JSON.stringify({ error: "No screenshot provided" }),
          { status: 400 }
        );
      }
      
      // Extract base64 data
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Store in Convex
      const blob = new Blob([buffer]);
      const storageId = await ctx.storage.store(blob);
      
      // Save to database
      await ctx.runMutation(api.screenshots.create, {
        storageId,
        metadata: metadata || {},
      });
      
      // Get file URL
      const fileUrl = await ctx.storage.getUrl(storageId);
      
      if (!fileUrl) {
        throw new Error("Failed to get file URL");
      }
      
      // Trigger n8n webhook
      const webhookResponse = await fetch(
        "http://localhost:5678/webhook/navigator-screenshot-event",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyze_ui",
            screenshot: screenshot,
            context: {
              storage_id: storageId,
              source: "http_upload",
              timestamp: new Date().toISOString(),
              metadata: metadata || {},
            },
          }),
        }
      );
      
      const webhookResult = await webhookResponse.text();
      
      // Mark as processed
      await ctx.runMutation(api.screenshots.markProcessed, {
        storageId,
        webhookStatus: webhookResponse.status,
      });
      
      return new Response(
        JSON.stringify({
          success: true,
          storageId,
          webhookStatus: webhookResponse.status,
          message: "Screenshot uploaded and processed",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
      
    } catch (error) {
      console.error("Upload error:", error);
      return new Response(
        JSON.stringify({
          error: error.message,
          success: false,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

export default http;
