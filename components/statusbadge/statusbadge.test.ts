/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c
 *
 * ⚓ TESTS: StatusBadge
 * Vitest unit tests for the StatusBadge component.
 * Covers: factory, status variants, DOM structure, pulse, clickable,
 * setStatus, setLabel, ARIA, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    StatusBadge,
    createStatusBadge,
} from "./statusbadge";
import type { StatusBadgeOptions } from "./statusbadge";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(
    overrides?: Partial<StatusBadgeOptions>
): StatusBadgeOptions
{
    return {
        status: "operational",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "status-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("StatusBadge factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge).toBeDefined();
        expect(badge.getElement()).toBeInstanceOf(HTMLElement);
        badge.destroy();
    });

    test("createStatusBadge_WithContainerId_MountsInContainer", () =>
    {
        const badge = createStatusBadge(
            "status-test-container", makeOptions()
        );
        expect(
            container.querySelector(".statusbadge")
        ).not.toBeNull();
        badge.destroy();
    });
});

// ============================================================================
// STATUS VARIANTS
// ============================================================================

describe("StatusBadge status variants", () =>
{
    test("Operational_HasOperationalClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        expect(
            badge.getElement()?.classList.contains("statusbadge-operational")
        ).toBe(true);
        badge.destroy();
    });

    test("Failed_HasFailedClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "failed" }));
        badge.show("status-test-container");
        expect(
            badge.getElement()?.classList.contains("statusbadge-failed")
        ).toBe(true);
        badge.destroy();
    });

    test("Custom_WithCustomColor_AppliesBackgroundColor", () =>
    {
        const badge = new StatusBadge(makeOptions({
            status: "custom",
            customColor: "#ff0000",
        }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot") as HTMLElement;
        expect(dot?.style.backgroundColor).toBe("rgb(255, 0, 0)");
        badge.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("StatusBadge DOM", () =>
{
    test("IndicatorVariant_HasDotAndLabel", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "indicator" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).not.toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).not.toBeNull();
        badge.destroy();
    });

    test("DotVariant_HasDotOnly", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "dot" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).not.toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).toBeNull();
        badge.destroy();
    });

    test("PillVariant_HasLabelOnly", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "pill" }));
        badge.show("status-test-container");
        expect(badge.getElement()?.querySelector(".statusbadge-dot")).toBeNull();
        expect(badge.getElement()?.querySelector(".statusbadge-label")).not.toBeNull();
        badge.destroy();
    });
});

// ============================================================================
// PULSE
// ============================================================================

describe("StatusBadge pulse", () =>
{
    test("Operational_AutoPulses", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot");
        expect(dot?.classList.contains("statusbadge-pulse")).toBe(true);
        badge.destroy();
    });

    test("PulseExplicitlyDisabled_NoPulseClass", () =>
    {
        const badge = new StatusBadge(makeOptions({
            status: "operational",
            pulse: false,
        }));
        badge.show("status-test-container");
        const dot = badge.getElement()?.querySelector(".statusbadge-dot");
        expect(dot?.classList.contains("statusbadge-pulse")).toBe(false);
        badge.destroy();
    });
});

// ============================================================================
// MUTATORS
// ============================================================================

describe("StatusBadge mutators", () =>
{
    test("SetStatus_ChangeToDown_UpdatesClass", () =>
    {
        const badge = new StatusBadge(makeOptions({ status: "operational" }));
        badge.show("status-test-container");
        badge.setStatus("down");
        expect(
            badge.getElement()?.classList.contains("statusbadge-down")
        ).toBe(true);
        expect(
            badge.getElement()?.classList.contains("statusbadge-operational")
        ).toBe(false);
        badge.destroy();
    });

    test("SetLabel_UpdatesLabelText", () =>
    {
        const badge = new StatusBadge(makeOptions({ variant: "indicator" }));
        badge.show("status-test-container");
        badge.setLabel("Custom Label");
        const label = badge.getElement()?.querySelector(".statusbadge-label");
        expect(label?.textContent).toBe("Custom Label");
        badge.destroy();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("StatusBadge ARIA", () =>
{
    test("RootElement_HasRoleStatus", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge.getElement()?.getAttribute("role")).toBe("status");
        badge.destroy();
    });

    test("RootElement_HasAriaLabel", () =>
    {
        const badge = new StatusBadge(makeOptions());
        expect(badge.getElement()?.getAttribute("aria-label")).toContain("Status");
        badge.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("StatusBadge destroy", () =>
{
    test("Destroy_NullifiesElement", () =>
    {
        const badge = new StatusBadge(makeOptions());
        badge.show("status-test-container");
        badge.destroy();
        expect(badge.getElement()).toBeNull();
    });

    test("Destroy_RemovesFromContainer", () =>
    {
        const badge = new StatusBadge(makeOptions());
        badge.show("status-test-container");
        badge.destroy();
        expect(container.querySelector(".statusbadge")).toBeNull();
    });
});
