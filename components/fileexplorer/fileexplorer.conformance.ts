/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: FileExplorer / ConformanceGlue
 * PURPOSE: Supplies the minimum options this component needs to MOUNT during
 *    the conformance run.
 *
 *    These are test fixtures and deliberately do NOT live in the manifest's
 *    defaultOptions: that field is shipped to consumers via
 *    capability-manifest.json and is what the canvas passes when a host
 *    supplies nothing. A fixture there would put placeholder content in front
 *    of real users.
 *
 *    Every option is optional. MEASURED 2026-10-10: the gate passes with `{}`
 *    too, because the explorer's toolbar and panes are chrome and
 *    renders-content is satisfied by chrome. So this fixture is not what
 *    makes the check pass — it is what makes the check exercise the node
 *    tree instead of an empty shell. Deleting it would not turn the gate
 *    red, which is the reason to say so here.
 *
 * RELATES: [[FileExplorer]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fileexplorer-conformance-glue

/** The slice of the handle the triggers drive. */
interface FileExplorerLike
{
    getElement(): HTMLElement | null;
    setData(slot: string, value: unknown): void;
    navigate(folderId: string): void;
    selectItem(id: string): void;
    startRenamePublic(nodeId?: string): void;
}

/** A folder and a file at the top level, so the listing shows a file to select and open. */
const ROOTS = [
    { id: "root", name: "Conformance", type: "folder", children: [] },
    { id: "readme", name: "readme.md", type: "file" },
];

/** A tree for the provider requests (#68): a folder with no children, which loads when opened, and a file. */
const REQUEST_ROOTS = [
    { id: "lazy", name: "Lazy", type: "folder" },
    { id: "readme", name: "readme.md", type: "file" },
];

export const CONFORMANCE_GLUE =
{
    options: { roots: ROOTS },

    // The tree to browse, and a flat listing of a folder and the file, which shows in place of the tree when set.
    // The breadcrumb's first segment is a link (#68).
    eventProps: {
        roots: ROOTS,
        items: [{ id: "flatdir", name: "Docs", type: "folder" }, { id: "readme", name: "readme.md", type: "file" }],
        breadcrumb: [{ id: null, label: "Home" }, { id: "flatdir", label: "Docs" }],
    },

    // A rewrite that keeps both and adds a file, and a flat listing (readiness step 3).
    slotSamples: {
        roots: [...ROOTS, { id: "notes", name: "notes.txt", type: "file" }],
        items: [{ id: "flat", name: "flat.txt", type: "file" }],
    },

    /**
     * Clicks the file (select) or double-clicks it (open), double-clicks the folder (navigate) in the listing,
     * or clicks the first breadcrumb (breadcrumb, #68).
     */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as FileExplorerLike).getElement();
        const pick = (selector: string): HTMLElement | null => root?.querySelector<HTMLElement>(selector) ?? null;
        const target = channel === "navigate" ? pick(".fileexplorer-listing [data-id='flatdir']")
            : channel === "breadcrumb" ? pick("a.fileexplorer-breadcrumb-item")
                : channel === "select" || channel === "open" ? pick(".fileexplorer-listing [data-id='readme']")
                    : null;

        if (!target) { return false; }

        const type = channel === "select" || channel === "breadcrumb" ? "click" : "dblclick";
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));

        return true;
    },

    /**
     * Makes the explorer ask each provider (#68), on the tree above: renames the file, deletes it with the
     * Delete key, presses New Folder, and opens the folder that has no children.
     */
    request: (request: string, handle: Record<string, unknown>): boolean =>
    {
        const explorer = handle as unknown as FileExplorerLike;
        explorer.setData("items", undefined);
        explorer.setData("roots", REQUEST_ROOTS);
        const root = explorer.getElement();

        if (!root) { return false; }

        if (request === "rename")
        {
            explorer.startRenamePublic("readme");
            const input = root.querySelector<HTMLInputElement>(".fileexplorer-rename-input");
            if (!input) { return false; }
            input.value = "renamed.md";
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
            return true;
        }
        if (request === "delete")
        {
            explorer.selectItem("readme");
            const listing = root.querySelector<HTMLElement>(".fileexplorer-listing");
            listing?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, cancelable: true }));
            return listing !== null;
        }
        if (request === "createFolder")
        {
            const button = root.querySelector<HTMLElement>(".fileexplorer-toolbar-btn[aria-label='New Folder']");
            button?.click();
            return button !== null;
        }
        if (request === "loadChildren")
        {
            explorer.navigate("lazy");
            return true;
        }

        return false;
    },
};
