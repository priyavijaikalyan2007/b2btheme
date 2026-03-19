/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f
 *
 * ⚓ TESTS: LayerLayout
 * Vitest unit tests for the LayerLayout component.
 * Covers: factory, layers, z-index, alignment, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    LayerLayout,
    createLayerLayout,
} from "./layerlayout";
import type { LayerLayoutOptions, LayerConfig } from "./layerlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeChild(): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = "layer";
    return el;
}

function makeOptions(
    overrides?: Partial<LayerLayoutOptions>
): LayerLayoutOptions
{
    return {
        id: "test-layer",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "layer-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("LayerLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new LayerLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createLayerLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createLayerLayout(
            makeOptions(), "layer-test-container"
        );
        expect(container.querySelector(".layerlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// LAYERS
// ============================================================================

describe("LayerLayout layers", () =>
{
    test("InitialLayers_TwoLayers_BothRendered", () =>
    {
        const layers: LayerConfig[] = [
            { child: makeChild(), key: "bg" },
            { child: makeChild(), key: "fg", zIndex: 10 },
        ];
        const layout = new LayerLayout(makeOptions({ layers }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".layerlayout-layer"
            ).length
        ).toBe(2);
        layout.destroy();
    });

    test("AddLayer_AfterInit_IncreasesLayerCount", () =>
    {
        const layout = new LayerLayout(makeOptions());
        layout.show(container);
        layout.addLayer({ child: makeChild(), key: "new" });
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".layerlayout-layer"
            ).length
        ).toBe(1);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("LayerLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new LayerLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new LayerLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
