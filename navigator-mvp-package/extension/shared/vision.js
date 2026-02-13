/**
 * Navigator Vision Fallback v2 (Production-Ready)
 * 
 * Responsibilities:
 * - Call local Ollama
 * - Enforce DOM -> Vision hierarchy
 * - Apply strict acceptance gating
 * - Return structured, labeled context only
 */

// Note: crypto is not available in Service Worker, using subtle crypto or simple hash
// For this environment, we'll use a simple DJB2 hash implementation

var VISION_CONFIG = {
    OLLAMA_ENDPOINT: "http://localhost:11434/api/generate",
    DEFAULT_MODEL: "llava",
    VISION_PARAMS: {
        temperature: 0.1,
        top_p: 0.9,
        num_ctx: 2048,
        repeat_penalty: 1.2
    },
    VISION_SYSTEM_PROMPT: 'You are a fallback perception system.\n\nThis image is a screenshot of a webpage viewport.\n\nRules:\n- Extract ONLY clearly visible text.\n- Describe UI elements conservatively.\n- Flag uncertainty explicitly.\n- DO NOT infer hidden or off-screen content.\n- DO NOT explain meaning or intent.\n- DO NOT summarize.\n\nReturn ONLY valid JSON in this exact format:\n{\n  "visible_text_blocks": ["text1", "text2"],\n  "ui_elements": ["button: Submit", "input: Search"],\n  "uncertainty_flags": [],\n  "confidence": "low" | "medium" | "high"\n}'
};

/**
 * Vision fallback entry point.
 * Call ONLY if DOM context is empty or unusable.
 */
function runVisionFallback(screenshotBase64, model) {
    if (!model) model = VISION_CONFIG.DEFAULT_MODEL;
    
    // Remove data URL prefix if present for clean base64
    var base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");

    return fetch(VISION_CONFIG.OLLAMA_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: model,
            prompt: VISION_CONFIG.VISION_SYSTEM_PROMPT,
            images: [base64Data],
            stream: false,
            options: VISION_CONFIG.VISION_PARAMS,
            format: "json"
        })
    }).then(function(response) {
        if (!response.ok) {
            console.warn("[Vision] Ollama call failed", response.statusText);
            return null;
        }
        return response.json();
    }).then(function(raw) {
        if (!raw) return null;
        
        var parsed;
        try {
            parsed = JSON.parse(raw.response);
        } catch (e) {
            console.warn("[Vision] Invalid JSON returned", raw.response);
            return null;
        }

        // ---- Acceptance gating ----
        if (!isVisionOutputAcceptable(parsed)) {
            console.warn("[Vision] Output rejected by quality check", parsed);
            return null;
        }

        return {
            context_type: "vision_fallback",
            warning: "Vision-derived context may be incomplete or unreliable.",
            data: parsed,
            model: model,
            timestamp: Date.now()
        };
    }).catch(function(error) {
        console.error("[Vision] Execution error:", error);
        return null;
    });
}

/* ----------------- Helpers ----------------- */

function isVisionOutputAcceptable(output) {
    if (!output) return false;
    if (output.confidence === "low") return false;

    // Must have at least something visible
    const hasText = output.visible_text_blocks && output.visible_text_blocks.length > 0;
    const hasUI = output.ui_elements && output.ui_elements.length > 0;

    if (!hasText && !hasUI) {
        return false;
    }

    // If uncertainty outweighs confidence
    if (
        output.uncertainty_flags &&
        output.visible_text_blocks &&
        output.uncertainty_flags.length >= output.visible_text_blocks.length
    ) {
        return false;
    }

    return true;
}
