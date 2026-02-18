
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/upload-screenshot",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const { screenshot, metadata, tool_name } = await request.json();
      if (!screenshot) return new Response("No screenshot", { status: 400 });

      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      const storageId = await ctx.storage.store(new Blob([bytes]));

      await ctx.runMutation(api.screenshots.save, {
        storageId,
        tool_name: tool_name || "Unknown",
        type: "upload",
        timestamp: Date.now(),
        metadata: metadata || {},
      });

      return new Response(JSON.stringify({ success: true, storageId }), { status: 200 });
    } catch (error: any) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }),
});

export default http;
