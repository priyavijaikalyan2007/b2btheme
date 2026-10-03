/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LayoutPickerTests
 * 📜 PURPOSE: Tests for LayoutPicker, created by ADR-148. The component had no
 *    test file at all, which is why its null-object defect went unnoticed by
 *    both the apps-team bug report and the repository's own suite.
 * 🔗 RELATES: [[LayoutPicker]], [[NoFabricatedReads]]
 * ----------------------------------------------------------------------------
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createLayoutPicker } from "./layoutpicker";

describe("LayoutPicker", () =>
{
    let container: HTMLElement;

    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "layoutpicker-host";
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        container.remove();
    });

    // ------------------------------------------------------------------
    // FACTORY
    // ------------------------------------------------------------------

    describe("Factory", () =>
    {
        test("Factory_WithElement_Mounts", () =>
        {
            const picker = createLayoutPicker({ container });

            expect(container.children.length).toBeGreaterThan(0);

            picker.destroy();
        });

        test("Factory_WithIdString_Mounts", () =>
        {
            const picker = createLayoutPicker({ container: "layoutpicker-host" });

            expect(container.children.length).toBeGreaterThan(0);

            picker.destroy();
        });

        test("Factory_InvalidContainer_Throws", () =>
        {
            // ADR-148 D1. LayoutPicker was listed in the bug report under
            // "not a problem" because its null object fabricates only
            // getElement(). It also answered `getValue: () => null` — and
            // its contract is `LayoutAlgorithm | null`, so null is a
            // LEGITIMATE value meaning "no layout selected". The null object
            // was therefore indistinguishable from a real user choice, which
            // is more insidious than orientationpicker's "portrait".
            expect(() => createLayoutPicker({ container: "nonexistent-id" }))
                .toThrow(/\[LayoutPicker\].*nonexistent-id/s);
        });

        test("Factory_InvalidContainer_ProducesNoReadableObject", () =>
        {
            let escaped: unknown = null;

            try { escaped = createLayoutPicker({ container: "nonexistent-id" }); }
            catch { /* expected */ }

            expect(escaped).toBeNull();
        });
    });

    // ------------------------------------------------------------------
    // VALUE ROUND-TRIP
    // ------------------------------------------------------------------

    describe("Value", () =>
    {
        test("GetValue_FreshPicker_ReturnsNullOrAlgorithm", () =>
        {
            const picker = createLayoutPicker({ container });

            const value = picker.getValue();

            // null here means "nothing selected" — a real answer from a
            // mounted picker, which is exactly why the null object's null
            // was indistinguishable from it.
            expect(value === null || typeof value === "object").toBe(true);

            picker.destroy();
        });

        test("Destroy_IsIdempotent", () =>
        {
            const picker = createLayoutPicker({ container });

            picker.destroy();

            expect(() => picker.destroy()).not.toThrow();
        });
    });
});
