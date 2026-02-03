/**
 * Navigator Prompt Engineering Logic
 * 
 * Responsibilities:
 * - Build the final system prompt sent to the LLM
 * - Inject Reliability Scores and Warning Directives
 */

/**
 * Builds dynamic system instructions based on reliability.
 */
function buildSystemPrompt(opts) {
    var contextReliability = opts.contextReliability;
    
    var reliabilityDirective;
    if (contextReliability < 50) {
        reliabilityDirective = 'IMPORTANT:\n- Page context is unreliable.\n- You MUST hedge, refuse, or say "I don\'t see that on the page."\n- Prefer saying you cannot determine the answer.';
    } else if (contextReliability < 80) {
        reliabilityDirective = 'IMPORTANT:\n- Page context may be partial.\n- Be cautious and avoid strong claims.';
    } else {
        reliabilityDirective = 'Page context is reliable.\nProceed normally, but do not infer missing content.';
    }

    return 'You are Navigator, a browser-native AI assistant.\n\nRules:\n- Answer ONLY using provided page context.\n- If information is missing, say: "I don\'t see that on the page."\n- Do NOT infer hidden or off-screen content.\n- Be concise.\n\nContext Reliability Score: ' + contextReliability + '/100\n' + reliabilityDirective;
}
