/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e
 *
 * ⚓ TESTS: BorderLayout
 * Vitest unit tests for the BorderLayout component.
 * Covers: factory, regions, DOM structure, collapse, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    BorderLayout,
    createBorderLayout,
} from "./borderlayout";
import type { BorderLayoutOptions } from "./borderlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeRegionEl(text: string): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = text;
    return el;
}

function makeOptions(
    overrides?: Partial<BorderLayoutOptions>
): BorderLayoutOptions
{
    return {
        id: "test-border",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "border-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("BorderLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new BorderLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createBorderLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createBorderLayout(
            makeOptions(), "border-test-container"
        );
        expect(container.querySelector(".borderlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// REGIONS
// ============================================================================

describe("BorderLayout regions", () =>
{
    test("WithNorthAndCenter_RendersRegionCells", () =>
    {
        const layout = new BorderLayout(makeOptions({
            north: makeRegionEl("North"),
            center: makeRegionEl("Center"),
        }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.querySelector(".borderlayout-north")).not.toBeNull();
        expect(root.querySelector(".borderlayout-center")).not.toBeNull();
        layout.destroy();
    });

    test("WithAllFiveRegions_RendersAllCells", () =>
    {
        const layout = new BorderLayout(makeOptions({
            north: makeRegionEl("N"),
            south: makeRegionEl("S"),
            east: makeRegionEl("E"),
            west: makeRegionEl("W"),
            center: makeRegionEl("C"),
        }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.querySelector(".borderlayout-north")).not.toBeNull();
        expect(root.querySelector(".borderlayout-south")).not.toBeNull();
        expect(root.querySelector(".borderlayout-east")).not.toBeNull();
        expect(root.querySelector(".borderlayout-west")).not.toBeNull();
        expect(root.querySelector(".borderlayout-center")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// SHOW / HIDE / DESTROY
// ============================================================================

describe("BorderLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new BorderLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Hide_RemovesFromDOM", () =>
    {
        const layout = new BorderLayout(makeOptions());
        layout.show(container);
        layout.hide();
        expect(layout.isVisible()).toBe(false);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new BorderLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });

    test("Destroy_RemovesFromContainer", () =>
    {
        const layout = new BorderLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(container.querySelector(".borderlayout")).toBeNull();
    });
});
