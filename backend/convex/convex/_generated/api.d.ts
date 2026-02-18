/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as enrich from "../enrich.js";
import type * as executions from "../executions.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as ingest from "../ingest.js";
import type * as procedures from "../procedures.js";
import type * as scrapedata from "../scrapedata.js";
import type * as screenshots from "../screenshots.js";
import type * as ui_states from "../ui_states.js";
import type * as workflows from "../workflows.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  enrich: typeof enrich;
  executions: typeof executions;
  files: typeof files;
  http: typeof http;
  ingest: typeof ingest;
  procedures: typeof procedures;
  scrapedata: typeof scrapedata;
  screenshots: typeof screenshots;
  ui_states: typeof ui_states;
  workflows: typeof workflows;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
