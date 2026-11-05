/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 0b6f1d7e-4a52-4c1b-9f0e-3d8a7c2e5b14
 * Created: 2026-11-05
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExampleDeals
 * 📜 PURPOSE: The example MCP server's tools as plain functions (#19 M3).
 *    show_deal returns one A2UI surface and its routes; deal_action answers
 *    the actions the view routes to it. No MCP SDK here: the result shape
 *    is the whole server contract (spec §5).
 * 🔗 RELATES: [[ExampleServer]], docs/MCP_APPS_INTEGRATION_GUIDE.md
 * ⚡ FLOW: [view action] -> [deal_action] -> [A2UI messages] -> [view]
 * ----------------------------------------------------------------------------
 */

/** A2UI message version and the catalog the surface uses. */
const A2UI = "v0.9.1";
const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";
const SURFACE = "deal";

/** The view's tool arguments for a routed action (spec §5.2). */
export interface OutcropArgs
{
    outcrop: {
        version: 1;
        surfaceId: string;
        action: { version: string; action: { name: string; sourceComponentId: string; context: Record<string, unknown> } };
    };
}

export interface ToolResult
{
    [key: string]: unknown;
    content: Array<{ type: "text"; text: string }>;
    structuredContent?: { outcrop: { version: 1; messages: unknown[]; routes?: unknown } };
    isError?: boolean;
}

/** A result for the view, with the plain summary every result needs for models and UI-less hosts. */
function outcrop(summary: string, messages: unknown[], routes?: unknown): ToolResult
{
    return { content: [{ type: "text", text: summary }],
        structuredContent: { outcrop: { version: 1, messages, ...(routes === undefined ? {} : { routes }) } } };
}

function toolError(text: string): ToolResult
{
    return { content: [{ type: "text", text }], isError: true };
}

function status(text: string): unknown
{
    return { version: A2UI, updateComponents: { surfaceId: SURFACE, components: [
        { id: "status", component: "Text", text }] } };
}

/** Deal 7 awaiting approval, its documents in a lazy folder, Approve and Explain. */
export function showDeal(): ToolResult
{
    const components = [
        { id: "root", component: "Column", children: ["status", "documents", "buttons"] },
        { id: "status", component: "Text", text: "Deal 7: awaiting approval" },
        { id: "documents", component: "TreeView", eventData: { path: "/ev" },
            roots: [{ id: "contracts", label: "Contracts", kind: "folder", children: null, lazy: true }],
            onLoadChildren: { event: { name: "load", context: { node: { path: "/ev/loadChildren" } } } },
            loadChildrenResult: { path: "/answers/children" } },
        { id: "buttons", component: "Row", children: ["approve", "explain"] },
        { id: "approve", component: "Button", child: "approveLabel",
            action: { event: { name: "approve", context: { deal: 7 } } } },
        { id: "approveLabel", component: "Text", text: "Approve" },
        { id: "explain", component: "Button", child: "explainLabel",
            action: { event: { name: "explain", context: { deal: 7 } } } },
        { id: "explainLabel", component: "Text", text: "Explain" },
    ];

    // Approve and the folder's load go to deal_action, a fast deterministic call;
    // Explain goes to the model as a user turn.
    return outcrop("Deal 7 is awaiting approval.", [
        { version: A2UI, createSurface: { surfaceId: SURFACE, catalogId: CATALOG } },
        { version: A2UI, updateComponents: { surfaceId: SURFACE, components } },
    ], { default: { tool: "deal_action" }, byName: { explain: "message" } });
}

/** Answers an action the view routed here. A result without routes keeps the surface's routes. */
export function dealAction(args: OutcropArgs): ToolResult
{
    const { name, context } = args.outcrop.action.action;

    if (name === "approve") { return outcrop("Deal 7 approved.", [status("Deal 7: approved")]); }

    if (name === "load")
    {
        const node = context.node as { id?: string } | undefined;

        if (node?.id !== "contracts") { return toolError(`No folder ${JSON.stringify(node?.id)} in deal 7.`); }

        // The provider's answer: its result path, which TreeView bound with loadChildrenResult.
        return outcrop("Deal 7 has two contracts.", [{ version: A2UI, updateDataModel: { surfaceId: SURFACE,
            path: "/answers/children", value: [
                { id: "msa", label: "Master services agreement.pdf", kind: "item" },
                { id: "sow", label: "Statement of work.pdf", kind: "item" }] } }]);
    }

    return toolError(`deal_action does not handle the action ${JSON.stringify(name)}.`);
}
