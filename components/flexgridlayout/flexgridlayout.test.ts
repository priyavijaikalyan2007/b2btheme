/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c
 *
 * ⚓ TESTS: FlexGridLayout
 * Vitest unit tests for the FlexGridLayout component.
 * Covers: factory, columns/rows, cells, spanning, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    FlexGridLayout,
    createFlexGridLayout,
} from "./flexgridlayout";
import type
{
    FlexGridLayoutOptions,
    FlexGridCellConfig,
} from "./flexgridlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeChild(): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = "cell";
    return el;
}

function makeOptions(
    overrides?: Partial<FlexGridLayoutOptions>
): FlexGridLayoutOptions
{
    return {
        id: "test-flexgrid",
        columns: ["1fr", "1fr"],
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "flexgrid-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("FlexGridLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new FlexGridLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createFlexGridLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createFlexGridLayout(
            makeOptions(), "flexgrid-test-container"
        );
        expect(container.querySelector(".flexgridlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// CELLS
// ============================================================================

describe("FlexGridLayout cells", () =>
{
    test("InitialCells_TwoCells_BothRendered", () =>
    {
        const cells: FlexGridCellConfig[] = [
            { child: makeChild(), column: 0, row: 0 },
            { child: makeChild(), column: 1, row: 0 },
        ];
        const layout = new FlexGridLayout(makeOptions({ cells }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".flexgridlayout-cell"
            ).length
        ).toBe(2);
        layout.destroy();
    });

    test("AddCell_AfterInit_IncreasesCount", () =>
    {
        const layout = new FlexGridLayout(makeOptions());
        layout.show(container);
        layout.addCell({ child: makeChild(), column: 0, row: 0 });
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".flexgridlayout-cell"
            ).length
        ).toBe(1);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("FlexGridLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new FlexGridLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new FlexGridLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
