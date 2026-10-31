/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9b55b38b-1839-4f43-8092-4dc0a73c8705
 * Created: 2026-10-31
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: TabbedPanel / Conformance glue
 * PURPOSE: Mount fixtures and channel triggers for the fleet conformance and
 *    adapter gates (readiness step 4 L1, ADR-239).
 * RELATES: [[TabbedPanel]], [[CapabilityManifest]]
 * FLOW: [fleet gate] -> [CONFORMANCE_GLUE] -> [trigger] -> [on() channel]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker tabbedpanel-conformance-glue

/** The slice of the handle the trigger drives. */
interface TabbedPanelLike
{
    getRootElement(): HTMLElement | null;
}

/** Clicks or presses a key on the first element matching a selector inside the panel. */
function act(handle: Record<string, unknown>, selector: string, key?: string): boolean
{
    const el = (handle as unknown as TabbedPanelLike).getRootElement()?.querySelector<HTMLElement>(selector);

    if (key) { el?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })); }
    else { el?.click(); }

    return el != null;
}

export const CONFORMANCE_GLUE =
{
    // As the adapter mounts it: contained, docked, without the title bar (protocol.fixed).
    options: {
        contained: true,
        mode: "docked",
        showTitleBar: false,
        tabs: [
            { id: "first", title: "First", closable: true, content: document.createElement("div") },
            { id: "second", title: "Second", content: document.createElement("div") },
        ],
    },

    // Two tabs as an agent writes them: content is a component id, which the adapter renders (ADR-239).
    eventProps: { tabs: [{ id: "first", title: "First", closable: true, content: "first-child" },
        { id: "second", title: "Second", content: "second-child" }] },

    /** Closes the first tab, presses the tab bar's collapse button, or resizes with ArrowUp (step 4 L1). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel === "tabClose") { return act(handle, ".tabbedpanel-tab-close"); }
        if (channel === "collapse") { return act(handle, ".tabbedpanel-tabbar .tabbedpanel-collapse-btn"); }

        return channel === "resize" && act(handle, ".tabbedpanel-resize-handle-v", "ArrowUp");
    },
};
