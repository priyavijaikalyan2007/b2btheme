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

/** The slice of the handle the trigger drives. */
interface FileExplorerLike
{
    getElement(): HTMLElement | null;
}

/** A folder and a file at the top level, so the listing shows a file to select and open. */
const ROOTS = [
    { id: "root", name: "Conformance", type: "folder", children: [] },
    { id: "readme", name: "readme.md", type: "file" },
];

export const CONFORMANCE_GLUE =
{
    options: { roots: ROOTS },

    // The tree to browse, and the file as the flat listing, which shows in place of the tree when set.
    eventProps: { roots: ROOTS, items: [{ id: "readme", name: "readme.md", type: "file" }] },

    // A rewrite that keeps both and adds a file, and a flat listing (readiness step 3).
    slotSamples: {
        roots: [...ROOTS, { id: "notes", name: "notes.txt", type: "file" }],
        items: [{ id: "flat", name: "flat.txt", type: "file" }],
    },

    /** Clicks the file (select) or double-clicks it (open) in the listing (readiness step 3). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const file = (handle as unknown as FileExplorerLike).getElement()
            ?.querySelector<HTMLElement>(".fileexplorer-listing [data-id='readme']");

        if (!file || (channel !== "select" && channel !== "open")) { return false; }

        file.dispatchEvent(new MouseEvent(channel === "select" ? "click" : "dblclick", { bubbles: true }));

        return true;
    },
};
