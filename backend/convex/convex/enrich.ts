
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const VOYAGE_MODEL = "voyage-3";

export const extractKnowledge = action({
    args: { scrapedataId: v.id("scrapedata") },
    handler: async (ctx, args) => {
        const doc = await ctx.runQuery(api.scrapedata.getById, { id: args.scrapedataId });
        if (!doc) throw new Error("Document not found");

        const prompt = `
    Analyze the following documentation for the tool "${doc.tool_name}".
    Extract:
    1. Key Features/Components (NodesType: feature, component)
    2. UI Elements (NodesType: ui_element - e.g. buttons, menus, inputs)
    3. Relationships between them (e.g., Feature A part of Module B)
    4. Step-by-step Procedures/Workflows

    Documentation:
    ${doc.content.slice(0, 15000)}

    Output in strict JSON:
    {
      "nodes": [{"name": "string", "type": "feature|component|ui_element", "description": "string"}],
      "edges": [{"source": "string", "target": "string", "relation": "enables|part_of|triggers"}],
      "procedures": [{"name": "string", "description": "string", "steps": [{"action": "string", "description": "string"}]}]
    }
    `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
            }),
        });

        const llmResult = await response.json();
        if (!response.ok || !llmResult.choices || !llmResult.choices[0]) {
            console.error("OpenAI API Error:", JSON.stringify(llmResult, null, 2));
            throw new Error(`OpenAI API failed: ${response.status} ${response.statusText}`);
        }
        const data = JSON.parse(llmResult.choices[0].message.content);

        // Batch embed nodes
        const nodeTexts = data.nodes.map((n: any) => n.description);
        let nodeEmbeddings: number[][] = [];
        if (nodeTexts.length > 0) {
            const embResp = await fetch("https://api.voyageai.com/v1/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${VOYAGE_API_KEY}`,
                },
                body: JSON.stringify({ input: nodeTexts, model: VOYAGE_MODEL }),
            });
            const embResult = await embResp.json();
            if (embResult.data) {
                nodeEmbeddings = embResult.data.map((d: any) => d.embedding);
            }
        }

        for (let i = 0; i < data.nodes.length; i++) {
            if (nodeEmbeddings[i]) {
                await ctx.runMutation(api.enrich.saveNode, {
                    tool_name: doc.tool_name,
                    ...data.nodes[i],
                    embedding: nodeEmbeddings[i],
                });
            }
        }

        for (const edge of data.edges) {
            await ctx.runMutation(api.enrich.saveEdge, { tool_name: doc.tool_name, ...edge });
        }

        // Batch embed procedures
        const procTexts = data.procedures.map((p: any) => p.name + ": " + p.description);
        let procEmbeddings: number[][] = [];
        if (procTexts.length > 0) {
            const embResp = await fetch("https://api.voyageai.com/v1/embeddings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${VOYAGE_API_KEY}`,
                },
                body: JSON.stringify({ input: procTexts, model: VOYAGE_MODEL }),
            });
            const embResult = await embResp.json();
            if (embResult.data) {
                procEmbeddings = embResult.data.map((d: any) => d.embedding);
            }
        }

        for (let i = 0; i < data.procedures.length; i++) {
            if (procEmbeddings[i]) {
                const proc = data.procedures[i];
                await ctx.runMutation(api.enrich.saveProcedure, {
                    tool_name: doc.tool_name,
                    ...proc,
                    steps: proc.steps.map((s: any, j: number) => ({ order: j, ...s })),
                    embedding: procEmbeddings[i],
                });
            }
        }
        return { success: true };
    },
});

export const saveNode = mutation({
    args: {
        tool_name: v.string(),
        name: v.string(),
        type: v.string(),
        description: v.string(),
        embedding: v.array(v.float64()),
    },
    handler: async (ctx, args) => { await ctx.db.insert("nodes", args); },
});

export const saveEdge = mutation({
    args: {
        tool_name: v.string(),
        source_name: v.string(),
        target_name: v.string(),
        relation: v.string(),
    },
    handler: async (ctx, args) => { await ctx.db.insert("edges", args); },
});

export const saveProcedure = mutation({
    args: {
        tool_name: v.string(),
        name: v.string(),
        description: v.string(),
        steps: v.array(v.object({ order: v.number(), action: v.string(), description: v.string() })),
        embedding: v.array(v.float64()),
    },
    handler: async (ctx, args) => { await ctx.db.insert("tool_procedures", args); },
});

export const getProcedures = query({
    args: { tool_name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("tool_procedures")
            .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
            .collect();
    },
});

export const getProcedureById = query({
    args: { id: v.id("tool_procedures") },
    handler: async (ctx, args) => { return await ctx.db.get(args.id); }
});

export const vectorSearchProcedures = action({
    args: {
        query: v.string(),
        tool_name: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args): Promise<any[]> => {
        const response = await fetch("https://api.voyageai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${VOYAGE_API_KEY}`,
            },
            body: JSON.stringify({ input: [args.query], model: VOYAGE_MODEL }),
        });
        const result = await response.json();
        const queryEmbedding = result.data[0].embedding;

        const results = await ctx.vectorSearch("tool_procedures", "by_embedding", {
            vector: queryEmbedding,
            limit: args.limit ?? 5,
            filter: args.tool_name ? (q: any) => q.eq("tool_name", args.tool_name!) : undefined,
        });

        const fullResults = [];
        for (const res of results) {
            const proc = await ctx.runQuery(api.enrich.getProcedureById, { id: res._id });
            if (proc) fullResults.push({ ...proc, score: res._score });
        }
        return fullResults;
    },
});
