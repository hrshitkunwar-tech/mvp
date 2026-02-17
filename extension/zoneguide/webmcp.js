/**
 * ZoneGuide WebMCP Bridge v1.0.0
 *
 * Detects native WebMCP tools exposed by the page through the proposed
 * navigator.modelContext API (Google/Microsoft / W3C WebML CG draft).
 *
 * Chrome early preview: chrome://flags → "WebMCP for testing" → Enable
 *
 * Three capabilities:
 *  1. Detection  – check if page exposes native AI tools
 *  2. Export     – convert a recorded Navigator workflow into a WebMCP tool def
 *  3. Register   – live-register a workflow replay handler as a WebMCP tool
 */

(function () {
    'use strict';

    var VERSION = '1.0.0';

    // ── 1. Detection helpers ──────────────────────────────────────────────────

    function isSupported() {
        return 'modelContext' in navigator;
    }

    /** Returns array of {name, description, inputSchema} or [] */
    function listTools() {
        if (!isSupported()) return Promise.resolve([]);
        try {
            var result = navigator.modelContext.listTools
                ? navigator.modelContext.listTools()
                : [];
            return Promise.resolve(result).then(function (tools) {
                return Array.isArray(tools) ? tools : [];
            });
        } catch (e) {
            console.warn('[WebMCP] listTools failed:', e.message);
            return Promise.resolve([]);
        }
    }

    /** Directly invoke a named WebMCP tool */
    function callTool(name, params) {
        if (!isSupported()) return Promise.reject(new Error('WebMCP not supported on this page'));
        try {
            return Promise.resolve(navigator.modelContext.callTool(name, params || {}));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    // ── 2. Export workflow → WebMCP tool definition ───────────────────────────

    /**
     * Converts a Navigator recorded workflow into a WebMCP tool definition.
     * Input parameters are inferred from recorded <input> events.
     *
     * @param  {Object} workflow  – from window.__ZONEGUIDE_RECORDER__.getCurrentWorkflow()
     * @returns {Object|null}     – {name, description, inputSchema, _navigatorWorkflowId}
     */
    function exportWorkflowAsToolDef(workflow) {
        if (!workflow || !workflow.steps) return null;

        var properties = {};
        var required   = [];

        (workflow.steps || []).forEach(function (step) {
            if (step.action !== 'input' || !step.element) return;
            var raw = step.element.name || step.element.id || ('field_' + required.length);
            var key = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
            if (properties[key]) return; // already added

            properties[key] = {
                type: 'string',
                description: step.element.label ||
                             step.element.placeholder ||
                             ('Value for ' + raw)
            };
            required.push(key);
        });

        var safeName = (workflow.name || 'navigator_workflow')
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 60);

        return {
            name:        safeName,
            description: workflow.description || ('Navigator recorded: ' + (workflow.name || 'Unnamed')),
            inputSchema: { type: 'object', properties: properties, required: required },
            _navigatorWorkflowId: workflow.id,
            _navigatorVersion:    VERSION
        };
    }

    // ── 3. Register workflow as a live WebMCP tool ────────────────────────────

    /**
     * Registers a Navigator recorded workflow as a callable WebMCP tool.
     * When the tool is invoked, Navigator's visual replay fires with the params.
     *
     * @param  {Object} workflow
     * @returns {Promise<{success: boolean, toolName?: string, reason?: string}>}
     */
    function registerWorkflowAsTool(workflow) {
        if (!isSupported()) {
            return Promise.resolve({ success: false, reason: 'WebMCP not available on this page' });
        }
        if (typeof navigator.modelContext.registerTool !== 'function') {
            return Promise.resolve({ success: false, reason: 'registerTool not in this WebMCP version' });
        }

        var def = exportWorkflowAsToolDef(workflow);
        if (!def) return Promise.resolve({ success: false, reason: 'Invalid workflow' });

        try {
            var p = navigator.modelContext.registerTool({
                name:        def.name,
                description: def.description,
                inputSchema: def.inputSchema,
                handler: function (params) {
                    // Trigger Navigator replay engine
                    window.postMessage({
                        type:       'ZONEGUIDE_REPLAY_WITH_PARAMS',
                        workflowId: workflow.id,
                        params:     params
                    }, '*');
                    return Promise.resolve({ status: 'replaying', workflowId: workflow.id });
                }
            });
            return Promise.resolve(p).then(function () {
                return { success: true, toolName: def.name };
            });
        } catch (e) {
            return Promise.resolve({ success: false, reason: e.message });
        }
    }

    // ── 4. Compatibility snapshot ─────────────────────────────────────────────

    /**
     * @returns {Promise<{supported, toolCount, tools, mode}>}
     *   mode: 'native' | 'hybrid' | 'visual'
     */
    function getCompatibilityInfo() {
        if (!isSupported()) {
            return Promise.resolve({ supported: false, toolCount: 0, tools: [], mode: 'visual' });
        }
        return listTools().then(function (tools) {
            return {
                supported: true,
                toolCount: tools.length,
                tools: tools.map(function (t) {
                    return { name: t.name || '?', description: t.description || '' };
                }),
                mode: tools.length > 0 ? 'native' : 'hybrid'
            };
        });
    }

    // ── 5. Init & auto-discovery ──────────────────────────────────────────────

    function init() {
        getCompatibilityInfo().then(function (info) {
            // Broadcast to content-script (which relays to background → sidepanel)
            window.postMessage({ type: 'WEBMCP_STATUS_REPORT', payload: info }, '*');

            if (info.supported && info.toolCount > 0) {
                console.log('[WebMCP] ' + info.toolCount + ' native tool(s): ' +
                    info.tools.map(function (t) { return t.name; }).join(', '));
            } else if (info.supported) {
                console.log('[WebMCP] navigator.modelContext present – no tools registered yet');
            } else {
                console.log('[WebMCP] Not available – Navigator using visual mode');
            }
        });
    }

    // ── Public API ────────────────────────────────────────────────────────────
    window.__ZONEGUIDE_WEBMCP__ = {
        isSupported:             isSupported,
        listTools:               listTools,
        callTool:                callTool,
        getCompatibilityInfo:    getCompatibilityInfo,
        exportWorkflowAsToolDef: exportWorkflowAsToolDef,
        registerWorkflowAsTool:  registerWorkflowAsTool,
        VERSION:                 VERSION
    };

    // Slight delay so page scripts can register tools before we probe
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 200); });
    } else {
        setTimeout(init, 200);
    }

})();
