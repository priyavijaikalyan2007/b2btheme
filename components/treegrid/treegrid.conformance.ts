/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TreeGrid / ConformanceGlue
 * 📜 PURPOSE: The mount fixture the conformance gate needs. ERR-2 made
 *    label, nodes and columns required, and the gate had been mounting
 *    this component with no options at all. The fixture lives here rather
 *    than in the manifest, because manifest defaultOptions ship to
 *    consumers and this is placeholder content. The trigger drives each
 *    channel with a real gesture (readiness step 2 B6).
 * 🔗 RELATES: [[TreeGrid]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker treegrid-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface TreeGridLike
{
    getElement(): HTMLElement;
    selectNode(id: string): void;
    setNodes(nodes: unknown[]): void;
    expandNode(id: string): void;
}

/** Two rows, an editable column, a context menu and drag-and-drop, so every channel has a gesture. */
const FIXTURE = {
    label: "Fixture grid",
    columns: [{ id: "size", label: "Size", editable: true }],
    nodes: [{ id: "n1", label: "Root", data: { size: "1 KB" } }, { id: "n2", label: "Other", data: { size: "2 KB" } }],
    enableContextMenu: true,
    contextMenuItems: [{ id: "open", label: "Open" }],
    enableDragDrop: true,
};

/** A row's cells: the tree column (the label) first, then the data columns. */
function cells(root: HTMLElement, id: string): HTMLElement[]
{
    return Array.from(root.querySelectorAll<HTMLElement>(`.treegrid-row[data-node-id="${id}"] .treegrid-cell`));
}

export const CONFORMANCE_GLUE =
{
    options: FIXTURE,

    // What an agent sets for a grid the user can edit, act on and rearrange.
    eventProps: FIXTURE,

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const grid = handle as unknown as TreeGridLike;
        const root = grid.getElement();

        // jsdom has no scrollIntoView, which a row gesture reaches through the focused cell.
        Element.prototype.scrollIntoView ??= () => undefined;

        switch (channel)
        {
            case "selection":
                grid.selectNode("n1");
                return true;
            case "activate":
                cells(root, "n1")[0]?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
                return cells(root, "n1").length > 0;
            case "editCommit":
            {
                cells(root, "n1")[1]?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
                const input = cells(root, "n1")[1]?.querySelector("input");
                if (!input) { return false; }
                input.value = "3 KB";
                input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
                return true;
            }
            case "contextMenuAction":
            {
                root.querySelector(`.treegrid-row[data-node-id="n1"]`)
                    ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
                const item = root.ownerDocument.querySelector<HTMLElement>(".treegrid-context-item");
                item?.click();
                return item !== null;
            }
            case "drop":
            {
                const target = root.querySelector(`.treegrid-row[data-node-id="n1"]`);
                const e = new Event("drop", { bubbles: true, cancelable: true });
                Object.defineProperty(e, "clientY", { value: 0 });
                Object.defineProperty(e, "dataTransfer", { value: { getData: () => "n2" } });
                target?.dispatchEvent(e);
                return target !== null;
            }
            default:
                return false;
        }
    },

    // Expanding a lazy node asks the agent for its children (ADR-225).
    request: (
        request: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (request !== "loadChildren") { return false; }

        const grid = handle as unknown as TreeGridLike;
        grid.setNodes([{ id: "lazy", label: "Lazy", lazy: true, children: null }]);
        grid.expandNode("lazy");

        return true;
    },
};
