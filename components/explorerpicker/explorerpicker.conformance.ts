/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ExplorerPicker / ConformanceGlue
 * 📜 PURPOSE: The mount fixture, channel triggers and provider requests for
 *    the conformance gate and A2UI G3: clicking a row, the confirm and
 *    Cancel buttons, expanding a folder whose children are not given, and
 *    typing a search (readiness step 2 B7). The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to consumers
 *    and this is placeholder content.
 * 🔗 RELATES: [[ExplorerPicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker explorerpicker-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface ExplorerPickerLike
{
    getElement(): HTMLElement | null;
    expandNode(nodeId: string): Promise<void>;
}

/** A node as an agent sends it: every field ExplorerNode requires. */
function node(id: string, name: string, nodeType: string, parentId: string | null, hasChildren = false):
    Record<string, unknown>
{
    const resource = nodeType === "ASSET_REF";

    return {
        id, name, nodeType, parentId, hasChildren,
        resourceId: resource ? `res-${id}` : null, resourceType: resource ? "doc" : null,
        sourceId: null, url: null, linkType: null,
    };
}

/**
 * A folder with its child, a root resource to pick, and a folder whose children are not given, so expanding it
 * asks onLoadChildren (children staticNodes gives count as loaded).
 */
const NODES = [
    node("docs", "Docs", "FOLDER", null, true),
    node("readme", "README", "ASSET_REF", "docs"),
    node("spec", "Spec", "ASSET_REF", null),
    node("archive", "Archive", "FOLDER", null, true),
];

/** What an agent sets: the top of the tree, and the Cancel button (no callback is passed over A2UI). */
const FIXTURE = { staticNodes: NODES, cancellable: true };

/** The root element; every gesture re-renders rows, so elements are looked up afresh. */
function rootOf(handle: Record<string, unknown>): HTMLElement
{
    return (handle as unknown as ExplorerPickerLike).getElement()!;
}

/** Clicks the row of node `id`. */
function clickRow(root: HTMLElement, id: string): boolean
{
    const row = Array.from(root.querySelectorAll<HTMLElement>(".explorerpicker-node-row"))
        .find((r) => r.dataset.nodeId === id);

    row?.click();

    return row !== undefined;
}

export const CONFORMANCE_GLUE =
{
    options: FIXTURE,

    // What an agent sets for a picker the user confirms or cancels.
    eventProps: FIXTURE,

    // With both providers bound, the roots come from staticNodes, so no roots request is outstanding when the
    // request triggers run.
    requestProps: { staticNodes: NODES },

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = rootOf(handle);

        switch (channel)
        {
            case "selection":
                return clickRow(root, "spec");
            case "confirm":
            {
                // The gate drives every channel on one mount: a second click on the row selected for "selection"
                // would deselect it in single mode, so the row is clicked only when nothing is selected.
                const confirm = root.querySelector<HTMLButtonElement>(".explorerpicker-btn-confirm");
                if (!confirm) { return false; }
                if (confirm.disabled && !clickRow(root, "spec")) { return false; }
                confirm.click();
                return true;
            }
            case "cancel":
            {
                const cancel = root.querySelector<HTMLElement>(".explorerpicker-btn-cancel");
                cancel?.click();
                return cancel !== null;
            }
            default:
                return false;
        }
    },

    /** Makes the component ask its providers (ADR-225): expand a folder not given, and type a search. */
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request === "loadChildren")
        {
            void (handle as unknown as ExplorerPickerLike).expandNode("archive");
            return true;
        }

        if (request === "search")
        {
            const input = rootOf(handle).querySelector<HTMLInputElement>(".explorerpicker-search-input");
            if (!input) { return false; }
            input.value = "read";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
        }

        return false;
    },
};
