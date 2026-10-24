/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d
 *
 * ⚓ TESTS: TypeBadge
 * Vitest unit tests for the TypeBadge component.
 * Covers: factory, display name, icon, variants, colors, clickable, ARIA.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTypeBadge } from "./typebadge";
import type { TypeBadgeOptions } from "./typebadge";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<TypeBadgeOptions>
): TypeBadgeOptions
{
    return {
        typeKey: "strategy.okr",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "typebadge-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("createTypeBadge", () =>
{
    test("ValidOptions_ReturnsHTMLElement", () =>
    {
        const el = createTypeBadge(makeOptions());
        expect(el).toBeInstanceOf(HTMLElement);
    });

    test("HasTypeBadgeClass", () =>
    {
        const el = createTypeBadge(makeOptions());
        expect(el.classList.contains("typebadge")).toBe(true);
    });
});

// ============================================================================
// DISPLAY NAME
// ============================================================================

describe("TypeBadge display name", () =>
{
    test("TypeKey_ExtractsLastSegment", () =>
    {
        const el = createTypeBadge(makeOptions({ typeKey: "strategy.okr" }));
        const label = el.querySelector(".typebadge-label");
        expect(label?.textContent).toBe("okr");
    });

    test("DisplayNameOverride_UsesCustomName", () =>
    {
        const el = createTypeBadge(makeOptions({ displayName: "OKR" }));
        const label = el.querySelector(".typebadge-label");
        expect(label?.textContent).toBe("OKR");
    });

    test("ShowNamespace_ShowsFullKey", () =>
    {
        const el = createTypeBadge(makeOptions({ showNamespace: true }));
        const label = el.querySelector(".typebadge-label");
        expect(label?.textContent).toBe("strategy.okr");
    });
});

// ============================================================================
// ICON
// ============================================================================

describe("TypeBadge icon", () =>
{
    test("WithIcon_RendersIconElement", () =>
    {
        const el = createTypeBadge(makeOptions({ icon: "crosshair" }));
        const icon = el.querySelector(".typebadge-icon");
        expect(icon).not.toBeNull();
        expect(icon?.classList.contains("bi-crosshair")).toBe(true);
    });

    test("WithoutIcon_NoIconElement", () =>
    {
        const el = createTypeBadge(makeOptions());
        expect(el.querySelector(".typebadge-icon")).toBeNull();
    });
});

// ============================================================================
// VARIANTS
// ============================================================================

describe("TypeBadge variants", () =>
{
    test("Subtle_HasSubtleClass", () =>
    {
        const el = createTypeBadge(makeOptions({ variant: "subtle" }));
        expect(el.classList.contains("typebadge-subtle")).toBe(true);
    });

    test("Filled_HasFilledClass", () =>
    {
        const el = createTypeBadge(makeOptions({ variant: "filled" }));
        expect(el.classList.contains("typebadge-filled")).toBe(true);
    });

    test("Outlined_HasOutlinedClass", () =>
    {
        const el = createTypeBadge(makeOptions({ variant: "outlined" }));
        expect(el.classList.contains("typebadge-outlined")).toBe(true);
    });
});

// ============================================================================
// COLOUR
// ============================================================================

describe("TypeBadge colour", () =>
{
    // DEBT-VR-11. The default used to be the fixed hex #475569, written
    // inline. Nothing in a stylesheet overrides an inline property, so
    // the badge kept slate-600 in dark mode and the subtle variant put
    // that text on a 10 percent tint of itself: 2.05 against a 4.5
    // floor. The default has to be ABSENT here, not merely different.
    test("NoColour_SetsNoInlineColour", () =>
    {
        const el = createTypeBadge(makeOptions({ variant: "subtle" }));
        expect(el.style.getPropertyValue("--tb-color")).toBe("");
        expect(el.style.getPropertyValue("--tb-bg")).toBe("");
        expect(el.style.getPropertyValue("--tb-fg")).toBe("");
    });

    test("CallerColour_StillGoesInline", () =>
    {
        const el = createTypeBadge(
            makeOptions({ variant: "subtle", color: "#C0392B" }));
        expect(el.style.getPropertyValue("--tb-color")).toBe("#C0392B");
        expect(el.style.getPropertyValue("--tb-bg"))
            .toBe("rgba(192, 57, 43, 0.1)");
    });

    test("FilledCallerColour_PairsAReadableForeground", () =>
    {
        const pale = createTypeBadge(
            makeOptions({ variant: "filled", color: "#ffe066" }));
        expect(pale.style.getPropertyValue("--tb-fg")).toBe("#000000");

        const deep = createTypeBadge(
            makeOptions({ variant: "filled", color: "#1e293b" }));
        expect(deep.style.getPropertyValue("--tb-fg")).toBe("#ffffff");
    });

    test("NonHexColour_Throws", () =>
    {
        expect(() => createTypeBadge(
            makeOptions({ variant: "filled", color: "rebeccapurple" })))
            .toThrow(/must be a hex colour/);
    });
});

// ============================================================================
// CLICKABLE
// ============================================================================

describe("TypeBadge clickable", () =>
{
    test("Clickable_HasClickableClass", () =>
    {
        const el = createTypeBadge(makeOptions({ clickable: true }));
        expect(el.classList.contains("typebadge-clickable")).toBe(true);
    });

    test("Clickable_HasTabindex", () =>
    {
        const onClick = vi.fn();
        const el = createTypeBadge(makeOptions({ clickable: true, onClick }));
        expect(el.getAttribute("tabindex")).toBe("0");
    });

    test("ClickCallback_FiresOnClick", () =>
    {
        const onClick = vi.fn();
        const el = createTypeBadge(makeOptions({ clickable: true, onClick }));
        el.click();
        expect(onClick).toHaveBeenCalled();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("TypeBadge ARIA", () =>
{
    test("HasAriaLabel", () =>
    {
        const el = createTypeBadge(makeOptions());
        expect(el.getAttribute("aria-label")).toContain("Type:");
    });
});
