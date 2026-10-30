/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SpineMap / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, its slot sample and the channel triggers for
 *    the conformance gate and A2UI G3 (readiness step 2 B9). Clicks go to
 *    the node; edits go through the handle methods the editor calls.
 * 🔗 RELATES: [[SpineMap]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker spinemap-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface SpineMapLike
{
    getElement(): HTMLElement;
    addBranch(branch: { id: string; label: string }, parentId: string): void;
    updateNode(nodeId: string, changes: Record<string, unknown>): void;
    removeNode(nodeId: string): void;
    reparentNode(nodeId: string, newParentId: string | null): void;
    addConnection(conn: { from: string; to: string; type: string }): void;
    removeConnection(fromId: string, toId: string): void;
}

const DATA = {
    hubs: [
        { id: "h1", label: "Now", branches: [{ id: "b1", label: "Search" }] },
        { id: "h2", label: "Next", branches: [{ id: "b2", label: "Reports" }] },
    ],
    connections: [{ from: "b1", to: "b2", type: "depends-on" }],
};

/** Dispatches a bubbling mouse event on the node the map drew for `id`. */
function onNode(handle: SpineMapLike, id: string, type: string): boolean
{
    const g = handle.getElement().querySelector(`[data-id="${id}"]`);

    g?.dispatchEvent(new MouseEvent(type, { bubbles: true }));

    return g != null;
}

export const CONFORMANCE_GLUE =
{
    options: { data: DATA },

    // The map the gestures come from; an agent sets it too.
    eventProps: { data: DATA },

    // A complete map, which the generic sample is not.
    slotSamples: { data: DATA },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const map = handle as unknown as SpineMapLike;

        switch (channel)
        {
            case "nodeClick": return onNode(map, "b1", "click");
            case "nodeDoubleClick": return onNode(map, "b1", "dblclick");
            case "nodeAdd": map.addBranch({ id: "b3", label: "Export" }, "h1"); return true;
            case "nodeChange": map.updateNode("b1", { label: "Search 2" }); return true;
            case "nodeRemove": map.removeNode("b2"); return true;
            case "nodeReparent": map.reparentNode("b1", "h2"); return true;
            case "connectionAdd": map.addConnection({ from: "h1", to: "h2", type: "blocks" }); return true;
            case "connectionRemove": map.removeConnection("h1", "h2"); return true;
            default: return false;
        }
    },
};
