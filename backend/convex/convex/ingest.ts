import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const VOYAGE_MODEL = "voyage-3";

// ─── Text Chunker ────────────────────────────────────────────────────────────
function chunkText(text: string, maxChars = 800): string[] {
    const chunks: string[] = [];
    let pos = 0;
    while (pos < text.length) {
        let end = pos + maxChars;
        if (end >= text.length) {
            const chunk = text.slice(pos).trim();
            if (chunk) chunks.push(chunk);
            break;
        }
        const nl = text.lastIndexOf("\n", end);
        if (nl > pos + maxChars * 0.5) end = nl;
        const chunk = text.slice(pos, end).trim();
        if (chunk) chunks.push(chunk);
        pos = end;
    }
    return chunks;
}

// ─── Voyage Embedding Helper ─────────────────────────────────────────────────
async function getEmbeddings(inputs: string[]): Promise<number[][] | null> {
    for (let attempt = 0; attempt < 3; attempt++) {
        const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${VOYAGE_API_KEY}`,
            },
            body: JSON.stringify({ input: inputs, model: VOYAGE_MODEL }),
        });

        if (resp.status === 429) {
            console.log(`Voyage rate-limited, waiting 60s (attempt ${attempt + 1}/3)...`);
            await new Promise(r => setTimeout(r, 60000));
            continue;
        }

        if (!resp.ok) {
            const err = await resp.text();
            console.error("Voyage API error:", err);
            return null;
        }

        const result = await resp.json();
        if (!result.data || !Array.isArray(result.data)) {
            console.error("Unexpected Voyage response:", JSON.stringify(result).slice(0, 200));
            return null;
        }
        return result.data.map((d: any) => d.embedding);
    }
    return null;
}

// ─── Create Chunks Action ─────────────────────────────────────────────────────
export const createChunks = action({
    args: { scrapedataId: v.id("scrapedata") },
    handler: async (ctx, args) => {
        const doc = await ctx.runQuery(api.scrapedata.getById, { id: args.scrapedataId });
        if (!doc) throw new Error("Document not found");

        const chunks = chunkText(doc.content);
        if (chunks.length === 0) return 0;

        // Batch into groups of 10 to stay within Voyage limits
        const BATCH = 10;
        let saved = 0;
        for (let i = 0; i < chunks.length; i += BATCH) {
            const batch = chunks.slice(i, i + BATCH);
            const embeddings = await getEmbeddings(batch);
            if (!embeddings) {
                console.log(`Skipping batch ${i}–${i + BATCH} for ${doc.tool_name} (embedding failed)`);
                continue;
            }
            for (let j = 0; j < batch.length; j++) {
                await ctx.runMutation(api.ingest.saveChunk, {
                    scrapedataId: args.scrapedataId,
                    tool_name: doc.tool_name,
                    text: batch[j],
                    embedding: embeddings[j],
                });
                saved++;
            }
        }
        return saved;
    },
});

// ─── Save Chunk Mutation ──────────────────────────────────────────────────────
export const saveChunk = mutation({
    args: {
        scrapedataId: v.id("scrapedata"),
        tool_name: v.string(),
        text: v.string(),
        embedding: v.array(v.float64()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("chunks", args);
    },
});

// ─── Delete all chunks for a tool (cleanup before re-ingestion) ───────────────
export const deleteChunksForTool = mutation({
    args: { tool_name: v.string() },
    handler: async (ctx, args) => {
        const chunks = await ctx.db
            .query("chunks")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .collect();
        for (const chunk of chunks) {
            await ctx.db.delete(chunk._id);
        }
        return chunks.length;
    },
});

// ─── Delete all scrapedata for a tool (cleanup before re-ingestion) ───────────
export const deleteScrapedataForTool = mutation({
    args: { tool_name: v.string() },
    handler: async (ctx, args) => {
        const docs = await ctx.db
            .query("scrapedata")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .collect();
        for (const doc of docs) {
            await ctx.db.delete(doc._id);
        }
        return docs.length;
    },
});

// Minimum relevance score — results below this are noise, not returned
// 0.30 = permissive enough for sparse data, strict enough to remove garbage
const MIN_SCORE = 0.30;

// ─── Vector Search Action ─────────────────────────────────────────────────────
export const vectorSearch = action({
    args: {
        query: v.string(),
        tool_name: v.optional(v.string()),
        limit: v.optional(v.number()),
        minScore: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<any[]> => {
        const embeddings = await getEmbeddings([args.query]);
        if (!embeddings) throw new Error("Failed to embed query");

        const threshold = args.minScore ?? MIN_SCORE;

        const results = await ctx.vectorSearch("chunks", "by_embedding", {
            vector: embeddings[0],
            limit: (args.limit ?? 10) * 3, // fetch 3x to allow score filtering
            filter: args.tool_name
                ? (q: any) => q.eq("tool_name", args.tool_name!)
                : undefined,
        });

        const full: any[] = [];
        for (const res of results) {
            if (res._score < threshold) continue; // ← filter out low-relevance results
            const chunk = await ctx.runQuery(api.ingest.getChunk, { id: res._id });
            if (chunk) full.push({ ...chunk, score: res._score });
            if (full.length >= (args.limit ?? 10)) break;
        }
        return full;
    },
});

// ─── Smart Search Action (NLU → Vector) ──────────────────────────────────────
export const smartSearch = action({
    args: {
        query: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<any> => {
        const limit = args.limit ?? 10;

        // 1. Identify tool + intent via LLM
        let analysis: any = { tool_name: null, intent: args.query, category: null };
        try {
            const llmResp = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{
                        role: "user",
                        content: `Analyze this search query: "${args.query}"\nIdentify:\n- tool_name: exact product/software name if mentioned (e.g. "Slack", "Figma"), or null\n- intent: the core task being asked (concise, action-oriented)\n- category: docs|support|onboarding|admin|null\n\nJSON only: {"tool_name": "string|null", "intent": "string", "category": "string|null"}`,
                    }],
                    response_format: { type: "json_object" },
                }),
            });
            if (llmResp.ok) {
                const res = await llmResp.json();
                analysis = JSON.parse(res.choices[0].message.content);
            }
        } catch { /* fall back to raw query */ }

        // 2. Check if detected tool is in our database
        let tool_in_db = true;
        if (analysis.tool_name) {
            tool_in_db = await ctx.runQuery(api.scrapedata.toolExists, {
                tool_name: analysis.tool_name
            });
        }

        // 3. Vector search — skip tool filter if tool not in DB
        const searchToolName = (analysis.tool_name && tool_in_db)
            ? analysis.tool_name : undefined;

        let results = await ctx.runAction(api.ingest.vectorSearch, {
            query: analysis.intent || args.query,
            tool_name: searchToolName,
            limit: limit + 5,
        });

        // 4. Deduplicate by tool_name + first 100 chars of text
        const seen = new Set<string>();
        results = results.filter((r: any) => {
            const key = `${r.tool_name}::${(r.text || '').slice(0, 100)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, limit);

        // 5. If tool-specific search returned < 3 results, supplement with broad search
        if (searchToolName && results.length < 3) {
            const broadResults = await ctx.runAction(api.ingest.vectorSearch, {
                query: analysis.intent || args.query,
                limit: limit,
            });
            const broadDeduped = broadResults.filter((r: any) => {
                const key = `${r.tool_name}::${(r.text || '').slice(0, 100)}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
            results = [...results, ...broadDeduped].slice(0, limit);
        }

        return { results, analysis, tool_in_db };
    },
});

// ─── Queries ──────────────────────────────────────────────────────────────────
export const getChunk = query({
    args: { id: v.id("chunks") },
    handler: async (ctx, args) => ctx.db.get(args.id),
});

export const listChunks = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => ctx.db.query("chunks").order("desc").take(args.limit ?? 10),
});
