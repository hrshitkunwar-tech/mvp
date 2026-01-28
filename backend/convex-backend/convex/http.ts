import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
    path: "/uploadScreenshot",
    method: "POST",
    handler: httpAction(async (ctx, req) => {
        try {
            const { imageBase64, timestamp } = await req.json();

            const base64 = imageBase64.replace(/^data:image\/png;base64,/, "");
            const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: "image/png" });

            const storageId = await ctx.storage.store(blob);

            await ctx.runMutation(api.screenshots.create, {
                storageId,
                timestamp,
            });

            return new Response(JSON.stringify({ success: true, storageId }), {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        } catch (error) {
            console.error("Upload error:", error);
            return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    }),
});

// Handle CORS preflight requests
http.route({
    path: "/uploadScreenshot",
    method: "OPTIONS",
    handler: httpAction(async () => {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
        });
    }),
});

export default http;
