/**
 * Navigator Reliability Logic
 * 
 * Responsibilities:
 * - Central definition for Reliability Scoring
 */

function computeContextReliability(opts) {
    var hasDomContext = opts.hasDomContext;
    var domTokenCount = opts.domTokenCount;
    var domDiffChurn = opts.domDiffChurn || 0;
    var visionUsed = opts.visionUsed;
    var visionConfidence = opts.visionConfidence;
    
    var score = 100;

    if (!hasDomContext) score -= 30;

    if (visionUsed) score -= 40;

    if (visionConfidence === "medium") score -= 15;
    if (visionConfidence === "low") score -= 40;

    if (domTokenCount < 300) score -= 20;
    if (domDiffChurn > 3) score -= 15;

    return Math.max(0, Math.min(100, score));
}
