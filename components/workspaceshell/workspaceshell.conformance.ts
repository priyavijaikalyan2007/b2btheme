/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: WorkspaceShell / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate.
 * 🔗 RELATES: [[WorkspaceShell]], [[Conformance]]
 */

// @semantic-marker workspaceshell-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface ShellLike
{
    setData(slot: string, value: unknown): void;
    setRevisionRange(min: number, max: number): void;
    getElement(): HTMLElement | null;
}

/** Maps a channel to the control that drives it. */
const TRIGGER_SELECTOR: Record<string, string> =
{
    selectCanvas: ".workspaceshell-tab",
    pinCanvas: ".workspaceshell-pin",
    closeCanvas: ".workspaceshell-close",
    newCanvas: ".workspaceshell-new",
};

export const CONFORMANCE_GLUE =
{
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const shell = handle as unknown as ShellLike;
        const root = shell.getElement();

        if (channel === "scrub")
        {
            shell.setRevisionRange(0, 5);

            const slider = root?.querySelector(
                ".workspaceshell-scrubber input") as HTMLInputElement | null;

            if (!slider)
            {
                return false;
            }

            slider.value = "3";
            slider.dispatchEvent(new Event("input", { bubbles: true }));
            return true;
        }

        shell.setData("canvases", [{ id: "fixture", title: "Fixture canvas" }]);

        const selector = TRIGGER_SELECTOR[channel];
        const target = selector
            ? root?.querySelector(selector) as HTMLElement | null
            : null;

        if (!target)
        {
            return false;
        }

        target.click();
        return true;
    },
};
