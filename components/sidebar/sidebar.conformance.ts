/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: Sidebar / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. title is required and has no
 *    production default. A fixture title lives here rather than in the
 *    manifest because defaultOptions is shipped data.
 * 🔗 RELATES: [[Sidebar]], [[Conformance]]
 */

// @semantic-marker sidebar-conformance-glue

/** The slice of the handle the trigger drives. */
interface SidebarLike
{
    getRootElement(): HTMLElement | null;
}

/** The first element matching `selector` inside the sidebar. */
function inSidebar(handle: Record<string, unknown>, selector: string): HTMLElement | null
{
    return (handle as unknown as SidebarLike).getRootElement()?.querySelector<HTMLElement>(selector) ?? null;
}

export const CONFORMANCE_GLUE =
{
    options: { title: "Fixture", contained: true },

    // A sidebar holding one component, as an agent writes it (ADR-244).
    eventProps: { title: "Fixture", content: "fixture-child" },

    /** Widens with ArrowRight on the resize handle, or collapses with the title bar button (ADR-244). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel === "resize")
        {
            const grip = inSidebar(handle, ".sidebar-resize-handle-h");
            grip?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
            return grip != null;
        }

        const button = channel === "collapse" ? inSidebar(handle, ".sidebar-collapse-btn") : null;
        button?.click();

        return button != null;
    },
};
