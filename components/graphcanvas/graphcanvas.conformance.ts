/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GraphCanvas / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, its slot samples and the channel triggers for
 *    the conformance gate and A2UI G3 (readiness step 2 B9).
 * 🔗 RELATES: [[GraphCanvas]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker graphcanvas-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface GraphCanvasLike
{
    getNodes(): unknown[];
}

const NODES = [
    { id: "a", label: "A", type: "service", expandable: true },
    { id: "b", label: "B", type: "service" },
];
const EDGES = [{ id: "ab", sourceId: "a", targetId: "b", type: "calls" }];

/** Finds `selector` among the SVG the canvas drew; one fixture is mounted at a time. */
function find(selector: string): Element | null
{
    return document.querySelector(selector);
}

/** Dispatches a bubbling mouse event, which is what the canvas listens for on SVG groups. */
function fire(el: Element | null, type: string): boolean
{
    el?.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));

    return el != null;
}

export const CONFORMANCE_GLUE =
{
    options: { nodes: NODES, edges: EDGES, edgeCreationEnabled: true },

    // The graph the gestures come from; an agent sets these too.
    eventProps: { nodes: NODES, edges: EDGES, edgeCreationEnabled: true },

    // A complete node and edge, which the generic sample is not.
    slotSamples: { nodes: NODES, edges: EDGES },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if ((handle as unknown as GraphCanvasLike).getNodes().length === 0) { return false; }

        switch (channel)
        {
            case "nodeClick":
            case "selection":
                return fire(find(".gc-node[data-node-id='b']"), "click");
            case "nodeDoubleClick":
                return fire(find(".gc-node[data-node-id='b']"), "dblclick");
            case "edgeClick":
                return fire(find(".gc-edge[data-edge-id='ab']"), "click");
            case "expandRequest":
                return fire(find(".gc-node[data-node-id='a'] .gc-expand-indicator"), "click");
            case "edgeCreated":
            {
                fire(find(".gc-node[data-node-id='a']"), "contextmenu");
                const item = Array.from(document.querySelectorAll<HTMLElement>(".gc-context-menu-item"))
                    .find((b) => b.textContent === "Create edge from here");
                item?.click();
                find(".gc-node[data-node-id='b']")?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
                return item != null;
            }
            default:
                return false;
        }
    },
};
