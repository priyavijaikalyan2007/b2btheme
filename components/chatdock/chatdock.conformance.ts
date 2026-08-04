/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ChatDock / ConformanceGlue
 * 📜 PURPOSE: Channel triggers for the conformance gate.
 * 🔗 RELATES: [[ChatDock]], [[Conformance]]
 */

// @semantic-marker chatdock-conformance-glue

/** Minimal view of the handle, limited to what the triggers need. */
interface DockLike
{
    setData(slot: string, value: unknown): void;
    submit(): void;
    getElement(): HTMLElement | null;
}

export const CONFORMANCE_GLUE =
{
    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        const dock = handle as unknown as DockLike;
        const root = dock.getElement();

        if (channel === "submit")
        {
            const field = root?.querySelector(".chatdock-input") as
                HTMLInputElement | null;

            if (!field)
            {
                return false;
            }

            field.value = "conformance fixture";
            dock.submit();
            return true;
        }

        if (channel === "selectTurn" || channel === "branch")
        {
            dock.setData("turns", [
                { id: "fixture", role: "user", text: "fixture turn" },
            ]);

            const selector = channel === "branch"
                ? ".chatdock-branch"
                : ".chatdock-turn";
            const target = root?.querySelector(selector) as HTMLElement | null;

            if (!target)
            {
                return false;
            }

            target.click();
            return true;
        }

        return false;
    },
};
