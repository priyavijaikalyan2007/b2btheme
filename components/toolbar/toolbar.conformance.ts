/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: Toolbar / ConformanceGlue
 * 📜 PURPOSE: Mount and event fixture. label and regions are required and
 *    have no production default, and a contained toolbar keeps the fixture
 *    off the viewport's edge. They live here rather than in the manifest
 *    because defaultOptions is shipped data.
 * 🔗 RELATES: [[Toolbar]], [[Conformance]]
 */

// @semantic-marker toolbar-conformance-glue

/** One region with one button, as an agent writes it (ADR-245). */
const REGIONS = [{ id: "fixture-region", items: [{ id: "fixture-tool", tooltip: "Fixture", icon: "bi-star" }] }];

/** The slice of the handle the trigger drives. */
interface ToolbarLike
{
    getElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    options: { label: "Fixture", regions: REGIONS, contained: true },

    eventProps: { label: "Fixture", regions: REGIONS },

    /** Clicks the fixture button (readiness step 5, ADR-245). */
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const root = (handle as unknown as ToolbarLike).getElement();
        const button = channel === "toolClick"
            ? root?.querySelector<HTMLElement>("[data-tool-id='fixture-tool']")
            : null;

        button?.click();

        return button != null;
    },
};
