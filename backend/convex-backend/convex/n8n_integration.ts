import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Trigger n8n workflow when new screenshot is uploaded
 */
export const triggerScreenshotProcessing = action({
    args: {
        screenshot_id: v.string(),
        screenshot_url: v.string(),
        timestamp: v.number(),
    },
    handler: async (ctx, args) => {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";

        try {
            const response = await fetch(`${n8nWebhookUrl}/screenshot-uploaded`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    screenshot_id: args.screenshot_id,
                    screenshot_url: args.screenshot_url,
                    timestamp: args.timestamp,
                }),
            });

            if (!response.ok) {
                throw new Error(`n8n webhook failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, result };
        } catch (error) {
            console.error("Failed to trigger n8n workflow:", error);
            return { success: false, error: error.message };
        }
    },
});

/**
 * Trigger procedure execution workflow
 */
export const triggerProcedureExecution = action({
    args: {
        intent: v.string(),
        user_id: v.optional(v.string()),
        context: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";

        try {
            const response = await fetch(`${n8nWebhookUrl}/execute-procedure`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    intent: args.intent,
                    user_id: args.user_id || "anonymous",
                    context: args.context || {},
                    triggered_at: Date.now(),
                }),
            });

            if (!response.ok) {
                throw new Error(`n8n webhook failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, result };
        } catch (error) {
            console.error("Failed to trigger procedure execution:", error);
            return { success: false, error: error.message };
        }
    },
});

/**
 * Request real-time guidance from n8n
 */
export const requestGuidance = action({
    args: {
        execution_id: v.string(),
        procedure: v.string(),
        step_index: v.number(),
        current_step: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";

        try {
            const response = await fetch(`${n8nWebhookUrl}/generate-guidance`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    execution_id: args.execution_id,
                    procedure: args.procedure,
                    step_index: args.step_index,
                    current_step: args.current_step,
                    requested_at: Date.now(),
                }),
            });

            if (!response.ok) {
                throw new Error(`n8n webhook failed: ${response.statusText}`);
            }

            const result = await response.json();
            return { success: true, guidance: result };
        } catch (error) {
            console.error("Failed to request guidance:", error);
            return { success: false, error: error.message };
        }
    },
});

/**
 * Health check for n8n connection
 */
export const checkN8nHealth = action({
    args: {},
    handler: async (ctx) => {
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook";

        try {
            const response = await fetch(`${n8nWebhookUrl}/health`, {
                method: "GET",
            });

            return {
                available: response.ok,
                status: response.status,
                url: n8nWebhookUrl,
            };
        } catch (error) {
            return {
                available: false,
                error: error.message,
                url: n8nWebhookUrl,
            };
        }
    },
});
