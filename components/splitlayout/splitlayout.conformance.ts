/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: SplitLayout / ConformanceGlue
 * 📜 PURPOSE: Mount fixture. A split layout with fewer than two panes renders
 *    nothing by design, so the shipped defaultOptions (an empty pane list)
 *    cannot exercise it. Two panes live here rather than in the manifest
 *    because defaultOptions is shipped data.
 * 🔗 RELATES: [[SplitLayout]], [[Conformance]]
 */

// @semantic-marker splitlayout-conformance-glue

/** The slice of the handle the trigger drives. */
interface SplitLayoutLike
{
    getElement(): HTMLElement | null;
}

/** Presses a key on the first divider: ArrowRight resizes, Home collapses the first (collapsible) pane. */
function pressOnDivider(handle: Record<string, unknown>, key: string): boolean
{
    const root = (handle as unknown as SplitLayoutLike).getElement();
    const divider = root?.querySelector<HTMLElement>(".splitlayout-divider");

    divider?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

    return divider != null;
}

export const CONFORMANCE_GLUE =
{
    options: {
        orientation: "horizontal",
        panes: [
            { id: "fixture-a", initialSize: "50%", collapsible: true, content: document.createElement("div") },
            { id: "fixture-b", initialSize: "50%", content: document.createElement("div") },
        ],
    },

    // Two panes as an agent writes them: content is a component id, which the adapter renders (ADR-239).
    eventProps: { orientation: "horizontal", panes: [{ id: "fixture-a", collapsible: true, content: "first-child" },
        { id: "fixture-b", content: "second-child" }] },

    /** Resizes with ArrowRight, or collapses the first pane with Home, on the first divider (readiness step 4 L1). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel === "resize") { return pressOnDivider(handle, "ArrowRight"); }

        return channel === "collapse" && pressOnDivider(handle, "Home");
    },
};
