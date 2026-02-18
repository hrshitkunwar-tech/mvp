import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EXTRACTION_MODEL = "gpt-4o-mini";
const MAX_CONTENT_CHARS = 16000;
const MAX_ATTEMPTS = 5;

const VALID_ACTIONS = [
  "navigate",
  "click",
  "select",
  "fill",
  "copy",
  "paste",
  "run_cli",
  "call_api",
  "verify",
  "wait",
] as const;

type WorkflowAction = (typeof VALID_ACTIONS)[number];

const VALID_ACTION_SET = new Set<string>(VALID_ACTIONS);

const MASTER_SYSTEM_PROMPT = `You are an Autonomous SaaS Knowledge Structuring Engine.

Your purpose is NOT to summarize documentation.

Your purpose is to convert messy SaaS content into executable, UI-grounded workflows that enable real user task completion.

Everything you output must help a real user finish a task inside the product UI.

CORE OPERATING PRINCIPLES
1) Execution > Information
- If content cannot directly help complete an action, discard it.
- Never store marketing language, conceptual fluff, duplicated navigation, or generic explanations without steps.

2) Atomic Knowledge Unit
- All valid knowledge must map to:
Intent -> Preconditions -> Steps -> UI Targets -> Outcome -> Errors -> Automation Surface
- If a section cannot be mapped, ignore it or discard the document.

3) Deterministic Structure
- Output strictly structured JSON only.
- No prose outside JSON.
- No hallucinated UI elements.
- If information is missing, use null or confidence < 0.6.

4) Anti-Gravity Self-Correction
- Detect ambiguity (multiple intents, unclear UI, partial steps).
- Infer safest minimal workflow and reduce scope instead of guessing.
- Emit:
  "needs_verification": true
  "missing_fields": []
  "assumptions": []

PIPELINE LOGIC (order is mandatory)
1. Structural cleaning: keep only blocks that influence behavior.
2. Intent detection: keep prerequisite, step, warning, error, api_reference, troubleshooting, outcome.
3. Workflow construction: smallest executable user goal.
4. Step normalization:
   allowed actions = navigate, click, select, fill, copy, paste, run_cli, call_api, verify, wait
   each step must include order, action, target_ref, value(optional)
5. UI grounding fields (if present): visible_text, css_selector, aria_label, url_pattern, screen_name.
6. Preconditions graph extraction.
7. Error mapping: error_text, probable_cause, fix_intent.
8. Automation surface detection with api_endpoint/method/cli_command when available.

CONFIDENCE RULES
- 0.9-1.0: full UI steps + selectors + clear outcome
- 0.7-0.89: clear steps, partial selectors
- 0.5-0.69: intent clear, steps incomplete
- <0.5: do not create workflow

If content is unusable, return:
{"discarded": true, "reason": "string"}

Return only valid JSON.`;

type NormalizedStep = {
  order: number;
  action: WorkflowAction;
  target_ref: string | null;
  value?: string | null;
};

type NormalizedUiTarget = {
  target_ref: string | null;
  visible_text?: string | null;
  css_selector?: string | null;
  aria_label?: string | null;
  url_pattern?: string | null;
  screen_name?: string | null;
};

type NormalizedError = {
  error_text: string;
  probable_cause?: string | null;
  fix_intent?: string | null;
};

type NormalizedAutomation = {
  ui: boolean;
  api: { api_endpoint?: string | null; method?: string | null } | null;
  cli: { cli_command?: string | null } | null;
};

type NormalizedWorkflow = {
  discarded: false;
  intent: string;
  feature: string | null;
  preconditions: string[];
  steps: NormalizedStep[];
  ui_targets: NormalizedUiTarget[];
  outcome: string | null;
  errors: NormalizedError[];
  automation: NormalizedAutomation;
  confidence: number;
  needs_verification: boolean;
  missing_fields: string[];
  assumptions: string[];
};

type DiscardedWorkflow = {
  discarded: true;
  reason: string;
  confidence: number;
  assumptions: string[];
  missing_fields: string[];
};

type ExtractionResult = NormalizedWorkflow | DiscardedWorkflow;

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0.55;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeAction(value: unknown): WorkflowAction {
  const action = asString(value)?.toLowerCase();
  if (action && VALID_ACTION_SET.has(action)) {
    return action as WorkflowAction;
  }
  return "verify";
}

function parseJsonResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
    throw new Error("Model output is not valid JSON");
  }
}

function normalizeExtraction(parsed: unknown): ExtractionResult {
  const root = asObject(parsed);
  const confidence = clampConfidence(root.confidence);
  const modelDiscarded = root.discarded === true;
  const discardReason = asString(root.reason) ?? "unusable_content";
  const assumptions = asArray(root.assumptions).map((s) => asString(s)).filter((s): s is string => !!s);
  const missingFields = asArray(root.missing_fields).map((s) => asString(s)).filter((s): s is string => !!s);

  if (modelDiscarded) {
    return {
      discarded: true,
      reason: discardReason,
      confidence,
      assumptions,
      missing_fields: missingFields,
    };
  }

  const intent = asString(root.intent);
  const feature = asString(root.feature);
  const preconditions = asArray(root.preconditions)
    .map((s) => asString(s))
    .filter((s): s is string => !!s);
  const outcome = asString(root.outcome);

  const steps = asArray(root.steps)
    .map((step, i): NormalizedStep => {
      const s = asObject(step);
      const orderRaw = s.order;
      const order = typeof orderRaw === "number" && Number.isFinite(orderRaw) ? orderRaw : i + 1;
      return {
        order,
        action: normalizeAction(s.action),
        target_ref: asString(s.target_ref),
        value: asString(s.value),
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((s, i) => ({ ...s, order: i + 1 }));

  const uiTargets = asArray(root.ui_targets).map((target): NormalizedUiTarget => {
    const t = asObject(target);
    return {
      target_ref: asString(t.target_ref),
      visible_text: asString(t.visible_text),
      css_selector: asString(t.css_selector),
      aria_label: asString(t.aria_label),
      url_pattern: asString(t.url_pattern),
      screen_name: asString(t.screen_name),
    };
  });

  const errors = asArray(root.errors)
    .map((entry): NormalizedError | null => {
      const e = asObject(entry);
      const errorText = asString(e.error_text);
      if (!errorText) return null;
      return {
        error_text: errorText,
        probable_cause: asString(e.probable_cause),
        fix_intent: asString(e.fix_intent),
      };
    })
    .filter((e): e is NormalizedError => e !== null);

  const automationRaw = asObject(root.automation);
  const apiRaw = automationRaw.api === null ? null : asObject(automationRaw.api);
  const cliRaw = automationRaw.cli === null ? null : asObject(automationRaw.cli);
  const automation: NormalizedAutomation = {
    ui: typeof automationRaw.ui === "boolean" ? automationRaw.ui : true,
    api: apiRaw
      ? {
          api_endpoint: asString(apiRaw.api_endpoint),
          method: asString(apiRaw.method),
        }
      : null,
    cli: cliRaw
      ? {
          cli_command: asString(cliRaw.cli_command),
        }
      : null,
  };

  const needsVerificationFromModel = root.needs_verification === true;
  if (!intent) missingFields.push("intent");
  if (steps.length === 0) missingFields.push("steps");
  if (!outcome) missingFields.push("outcome");
  if (uiTargets.length === 0) missingFields.push("ui_targets");

  const normalized: NormalizedWorkflow = {
    discarded: false,
    intent: intent ?? "unknown_intent",
    feature,
    preconditions,
    steps,
    ui_targets: uiTargets,
    outcome,
    errors,
    automation,
    confidence,
    needs_verification: needsVerificationFromModel || missingFields.length > 0,
    missing_fields: Array.from(new Set(missingFields)),
    assumptions,
  };

  if (normalized.confidence < 0.5 || normalized.steps.length === 0 || !intent) {
    return {
      discarded: true,
      reason: normalized.confidence < 0.5 ? "low_confidence" : "insufficient_actionability",
      confidence: normalized.confidence,
      assumptions: normalized.assumptions,
      missing_fields: normalized.missing_fields,
    };
  }

  return normalized;
}

async function callExtractionModel(payload: {
  toolName: string;
  sourceUrl: string;
  title: string | null;
  category: string | null;
  content: string;
}): Promise<ExtractionResult> {
  const userPrompt = [
    "Convert the following SaaS documentation into a single executable workflow JSON.",
    `tool=${payload.toolName}`,
    `source_url=${payload.sourceUrl}`,
    `title=${payload.title ?? "null"}`,
    `category=${payload.category ?? "null"}`,
    "",
    "CONTENT START",
    payload.content,
    "CONTENT END",
    "",
    "Return ONLY one JSON object matching the required schema.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EXTRACTION_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: MASTER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const raw = await response.json();
  if (!response.ok || !raw?.choices?.[0]?.message?.content) {
    throw new Error(`OpenAI extraction failed: ${response.status} ${response.statusText}`);
  }

  const content: string = raw.choices[0].message.content;
  const parsed = parseJsonResponse(content);
  return normalizeExtraction(parsed);
}

export const enqueueScrapedataForExtraction = mutation({
  args: { scrapedataId: v.id("scrapedata") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.scrapedataId);
    if (!doc) {
      return { enqueued: false, reason: "scrapedata_not_found" as const };
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("workflow_jobs")
      .withIndex("by_scrapedata", (q) => q.eq("scrapedataId", args.scrapedataId))
      .first();

    if (existing) {
      if (existing.status === "processing") {
        return { enqueued: false, reason: "already_processing" as const };
      }
      await ctx.db.patch(existing._id, {
        status: "pending",
        run_after: now,
        updated_at: now,
      });
      return { enqueued: true, jobId: existing._id };
    }

    const jobId = await ctx.db.insert("workflow_jobs", {
      scrapedataId: args.scrapedataId,
      tool_name: doc.tool_name,
      source_url: doc.url,
      status: "pending",
      attempts: 0,
      run_after: now,
      created_at: now,
      updated_at: now,
    });
    return { enqueued: true, jobId };
  },
});

export const claimNextJob = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const job = await ctx.db
      .query("workflow_jobs")
      .withIndex("by_status_run_after", (q) => q.eq("status", "pending").lte("run_after", now))
      .first();

    if (!job) return null;

    const attempts = job.attempts + 1;
    await ctx.db.patch(job._id, {
      status: "processing",
      attempts,
      updated_at: now,
      last_error: undefined,
    });

    return { ...job, attempts };
  },
});

export const finalizeJob = mutation({
  args: {
    jobId: v.id("workflow_jobs"),
    status: v.union(v.literal("pending"), v.literal("done"), v.literal("discarded"), v.literal("failed")),
    last_error: v.optional(v.string()),
    delay_ms: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.jobId, {
      status: args.status,
      last_error: args.last_error,
      run_after: now + (args.delay_ms ?? 0),
      updated_at: now,
    });
  },
});

export const deleteJob = mutation({
  args: { jobId: v.id("workflow_jobs") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.jobId);
  },
});

export const upsertWorkflow = mutation({
  args: {
    scrapedataId: v.id("scrapedata"),
    tool_name: v.string(),
    source_url: v.string(),
    intent: v.string(),
    feature: v.union(v.string(), v.null()),
    preconditions: v.array(v.string()),
    steps: v.array(
      v.object({
        order: v.number(),
        action: v.union(
          v.literal("navigate"),
          v.literal("click"),
          v.literal("select"),
          v.literal("fill"),
          v.literal("copy"),
          v.literal("paste"),
          v.literal("run_cli"),
          v.literal("call_api"),
          v.literal("verify"),
          v.literal("wait")
        ),
        target_ref: v.union(v.string(), v.null()),
        value: v.optional(v.union(v.string(), v.null())),
      })
    ),
    ui_targets: v.array(
      v.object({
        target_ref: v.union(v.string(), v.null()),
        visible_text: v.optional(v.union(v.string(), v.null())),
        css_selector: v.optional(v.union(v.string(), v.null())),
        aria_label: v.optional(v.union(v.string(), v.null())),
        url_pattern: v.optional(v.union(v.string(), v.null())),
        screen_name: v.optional(v.union(v.string(), v.null())),
      })
    ),
    outcome: v.union(v.string(), v.null()),
    errors: v.array(
      v.object({
        error_text: v.string(),
        probable_cause: v.optional(v.union(v.string(), v.null())),
        fix_intent: v.optional(v.union(v.string(), v.null())),
      })
    ),
    automation: v.object({
      ui: v.boolean(),
      api: v.union(
        v.object({
          api_endpoint: v.optional(v.union(v.string(), v.null())),
          method: v.optional(v.union(v.string(), v.null())),
        }),
        v.null()
      ),
      cli: v.union(
        v.object({
          cli_command: v.optional(v.union(v.string(), v.null())),
        }),
        v.null()
      ),
    }),
    confidence: v.number(),
    needs_verification: v.boolean(),
    missing_fields: v.array(v.string()),
    assumptions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("tool_workflows")
      .withIndex("by_scrapedata", (q) => q.eq("scrapedataId", args.scrapedataId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updated_at: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("tool_workflows", {
      ...args,
      extracted_at: now,
      updated_at: now,
    });
  },
});

export const extractForScrapedata = action({
  args: { scrapedataId: v.id("scrapedata") },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(api.scrapedata.getById, { id: args.scrapedataId });
    if (!doc) {
      throw new Error(`scrapedata not found: ${args.scrapedataId}`);
    }

    const extraction = await callExtractionModel({
      toolName: doc.tool_name,
      sourceUrl: doc.url,
      title: doc.title ?? null,
      category: doc.category ?? null,
      content: doc.content.slice(0, MAX_CONTENT_CHARS),
    });

    if (extraction.discarded) {
      return {
        discarded: true,
        reason: extraction.reason,
        confidence: extraction.confidence,
        assumptions: extraction.assumptions,
        missing_fields: extraction.missing_fields,
      };
    }

    const workflowId = await ctx.runMutation(api.workflows.upsertWorkflow, {
      scrapedataId: args.scrapedataId,
      tool_name: doc.tool_name,
      source_url: doc.url,
      intent: extraction.intent,
      feature: extraction.feature,
      preconditions: extraction.preconditions,
      steps: extraction.steps,
      ui_targets: extraction.ui_targets,
      outcome: extraction.outcome,
      errors: extraction.errors,
      automation: extraction.automation,
      confidence: extraction.confidence,
      needs_verification: extraction.needs_verification,
      missing_fields: extraction.missing_fields,
      assumptions: extraction.assumptions,
    });

    return {
      discarded: false,
      workflowId,
      confidence: extraction.confidence,
      needs_verification: extraction.needs_verification,
    };
  },
});

export const processNextJob = action({
  args: {},
  handler: async (ctx) => {
    const job = await ctx.runMutation(api.workflows.claimNextJob, {});
    if (!job) return { processed: false };

    try {
      const result = await ctx.runAction(api.workflows.extractForScrapedata, {
        scrapedataId: job.scrapedataId,
      });

      const status = result.discarded ? "discarded" : "done";
      await ctx.runMutation(api.workflows.finalizeJob, {
        jobId: job._id,
        status,
      });

      return {
        processed: true,
        status,
        tool_name: job.tool_name,
        scrapedataId: job.scrapedataId,
        workflowId: result.discarded ? null : result.workflowId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown_error";
      const shouldRetry = job.attempts < MAX_ATTEMPTS;
      const delayMs = Math.min(300000, Math.pow(2, job.attempts) * 15000);
      await ctx.runMutation(api.workflows.finalizeJob, {
        jobId: job._id,
        status: shouldRetry ? "pending" : "failed",
        last_error: message,
        delay_ms: shouldRetry ? delayMs : 0,
      });
      return {
        processed: true,
        status: shouldRetry ? "pending" : "failed",
        error: message,
        attempts: job.attempts,
      };
    }
  },
});

export const processBatch = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 5, 50));
    const results: Array<Record<string, unknown>> = [];
    for (let i = 0; i < limit; i++) {
      const result = await ctx.runAction(api.workflows.processNextJob, {});
      results.push(result);
      if (!result.processed) break;
    }
    return results;
  },
});

export const getByTool = query({
  args: { tool_name: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tool_workflows")
      .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
      .order("desc")
      .take(args.limit ?? 20);
  },
});

export const getByScrapedata = query({
  args: { scrapedataId: v.id("scrapedata") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tool_workflows")
      .withIndex("by_scrapedata", (q) => q.eq("scrapedataId", args.scrapedataId))
      .first();
  },
});

export const getJobStats = query({
  args: {},
  handler: async (ctx) => {
    const statuses: Array<"pending" | "processing" | "done" | "discarded" | "failed"> = [
      "pending",
      "processing",
      "done",
      "discarded",
      "failed",
    ];
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const jobs = await ctx.db
        .query("workflow_jobs")
        .withIndex("by_status_run_after", (q) => q.eq("status", status))
        .collect();
      counts[status] = jobs.length;
    }
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { total, counts };
  },
});

export const requeueByTool = mutation({
  args: { tool_name: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const docs = await ctx.db
      .query("scrapedata")
      .withIndex("by_tool", (q) => q.eq("tool_name", args.tool_name))
      .take(args.limit ?? 100);

    let enqueued = 0;
    for (const doc of docs) {
      const existing = await ctx.db
        .query("workflow_jobs")
        .withIndex("by_scrapedata", (q) => q.eq("scrapedataId", doc._id as Id<"scrapedata">))
        .first();

      if (existing) {
        if (existing.status === "processing") continue;
        await ctx.db.patch(existing._id, {
          status: "pending",
          run_after: now,
          updated_at: now,
        });
        enqueued += 1;
        continue;
      }

      await ctx.db.insert("workflow_jobs", {
        scrapedataId: doc._id as Id<"scrapedata">,
        tool_name: doc.tool_name,
        source_url: doc.url,
        status: "pending",
        attempts: 0,
        run_after: now,
        created_at: now,
        updated_at: now,
      });
      enqueued += 1;
    }
    return { scanned: docs.length, enqueued };
  },
});

export const requeueRecent = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    const docs = await ctx.db.query("scrapedata").order("desc").take(args.limit ?? 500);
    let enqueued = 0;

    for (const doc of docs) {
      const existing = await ctx.db
        .query("workflow_jobs")
        .withIndex("by_scrapedata", (q) => q.eq("scrapedataId", doc._id as Id<"scrapedata">))
        .first();

      if (existing) {
        if (existing.status === "processing") continue;
        await ctx.db.patch(existing._id, {
          status: "pending",
          run_after: now,
          updated_at: now,
        });
        enqueued += 1;
        continue;
      }

      await ctx.db.insert("workflow_jobs", {
        scrapedataId: doc._id as Id<"scrapedata">,
        tool_name: doc.tool_name,
        source_url: doc.url,
        status: "pending",
        attempts: 0,
        run_after: now,
        created_at: now,
        updated_at: now,
      });
      enqueued += 1;
    }

    return { scanned: docs.length, enqueued };
  },
});
