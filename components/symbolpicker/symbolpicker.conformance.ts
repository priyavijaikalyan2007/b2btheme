/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SymbolPicker / ConformanceGlue
 * 📜 PURPOSE: Channel trigger for the conformance gate and A2UI G3: inserts a symbol (readiness step 2 B3).
 * 🔗 RELATES: [[SymbolPicker]], [[Conformance]]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker symbolpicker-conformance-glue

/** Minimal view of the handle, limited to what the trigger needs. */
interface SymbolLike
{
    open(): void;
}

export const CONFORMANCE_GLUE =
{
    options: {},

    trigger: (
        channel: string,
        handle: Record<string, unknown>): boolean =>
    {
        if (channel !== "insert") { return false; }

        (handle as unknown as SymbolLike).open();
        const cell = document.querySelector<HTMLElement>(".symbolpicker-cell");
        cell?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

        return cell !== null;
    },
};
