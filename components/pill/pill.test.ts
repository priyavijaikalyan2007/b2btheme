/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f
 *
 * ⚓ TESTS: Pill
 * Vitest unit tests for the Pill component.
 * Covers: factory, label, colors, sizes, dismissible, clickable,
 * setLabel, setColor, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Pill,
    createPill,
} from "./pill";
import type { PillOptions } from "./pill";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<PillOptions>
): PillOptions
{
    return {
        label: "Test Pill",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "pill-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("Pill factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const pill = new Pill(makeOptions());
        expect(pill).toBeDefined();
        expect(pill.getElement()).toBeInstanceOf(HTMLElement);
        pill.destroy();
    });

    test("createPill_ReturnsPillInstance", () =>
    {
        const pill = createPill(makeOptions());
        expect(pill).toBeInstanceOf(Pill);
        pill.destroy();
    });
});

// ============================================================================
// LABEL
// ============================================================================

describe("Pill label", () =>
{
    test("Label_RendersCorrectText", () =>
    {
        const pill = new Pill(makeOptions({ label: "My Tag" }));
        const labelEl = pill.getElement().querySelector(".pill-label");
        expect(labelEl?.textContent).toBe("My Tag");
        pill.destroy();
    });

    test("SetLabel_UpdatesText", () =>
    {
        const pill = new Pill(makeOptions());
        pill.setLabel("Updated");
        const labelEl = pill.getElement().querySelector(".pill-label");
        expect(labelEl?.textContent).toBe("Updated");
        pill.destroy();
    });
});

// ============================================================================
// COLORS
// ============================================================================

describe("Pill colors", () =>
{
    test("BlueColor_HasBlueClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "blue" }));
        expect(pill.getElement().classList.contains("pill-blue")).toBe(true);
        pill.destroy();
    });

    test("GreenColor_HasGreenClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "green" }));
        expect(pill.getElement().classList.contains("pill-green")).toBe(true);
        pill.destroy();
    });

    test("SetColor_ChangesColorClass", () =>
    {
        const pill = new Pill(makeOptions({ color: "blue" }));
        pill.setColor("red");
        expect(pill.getElement().classList.contains("pill-red")).toBe(true);
        expect(pill.getElement().classList.contains("pill-blue")).toBe(false);
        pill.destroy();
    });
});

// ============================================================================
// SIZES
// ============================================================================

describe("Pill sizes", () =>
{
    test("SmallSize_HasSmClass", () =>
    {
        const pill = new Pill(makeOptions({ size: "sm" }));
        expect(pill.getElement().classList.contains("pill-sm")).toBe(true);
        pill.destroy();
    });
});

// ============================================================================
// DISMISSIBLE
// ============================================================================

describe("Pill dismissible", () =>
{
    test("Dismissible_HasCloseButton", () =>
    {
        const pill = new Pill(makeOptions({ dismissible: true }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss");
        expect(closeBtn).not.toBeNull();
        pill.destroy();
    });

    test("NotDismissible_NoCloseButton", () =>
    {
        const pill = new Pill(makeOptions({ dismissible: false }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss");
        expect(closeBtn).toBeNull();
        pill.destroy();
    });

    test("OnDismiss_FiresCallback", () =>
    {
        const onDismiss = vi.fn();
        const pill = new Pill(makeOptions({ dismissible: true, onDismiss }));
        const closeBtn = pill.getElement().querySelector(".pill-dismiss") as HTMLElement;
        closeBtn?.click();
        expect(onDismiss).toHaveBeenCalled();
        pill.destroy();
    });
});

// ============================================================================
// CLICKABLE
// ============================================================================

describe("Pill clickable", () =>
{
    test("Clickable_HasTabindex", () =>
    {
        const pill = new Pill(makeOptions({ clickable: true }));
        expect(pill.getElement().getAttribute("tabindex")).toBe("0");
        pill.destroy();
    });

    test("OnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const pill = new Pill(makeOptions({ clickable: true, onClick }));
        pill.getElement().click();
        expect(onClick).toHaveBeenCalled();
        pill.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("Pill destroy", () =>
{
    test("Destroy_CleanUpHandlers", () =>
    {
        const pill = new Pill(makeOptions({ clickable: true, onClick: vi.fn() }));
        expect(() => pill.destroy()).not.toThrow();
    });
});
