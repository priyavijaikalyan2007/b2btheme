/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e
 *
 * ⚓ TESTS: GridLayout
 * Vitest unit tests for the GridLayout component.
 * Covers: factory, columns, auto mode, children, gap, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    GridLayout,
    createGridLayout,
} from "./gridlayout";
import type { GridLayoutOptions } from "./gridlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeChild(): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = "grid-child";
    return el;
}

function makeOptions(
    overrides?: Partial<GridLayoutOptions>
): GridLayoutOptions
{
    return {
        id: "test-grid",
        columns: 3,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "grid-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("GridLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new GridLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createGridLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createGridLayout(
            makeOptions(), "grid-test-container"
        );
        expect(container.querySelector(".gridlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// COLUMNS
// ============================================================================

describe("GridLayout columns", () =>
{
    test("FixedColumns_3_SetsGridTemplateColumns", () =>
    {
        const layout = new GridLayout(makeOptions({ columns: 3 }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.gridTemplateColumns).toContain("1fr");
        layout.destroy();
    });

    test("AutoColumns_SetsRepeatTemplate", () =>
    {
        // In jsdom, container has 0 width so auto-columns defaults to 1.
        // The template still uses repeat(N, 1fr) format.
        const layout = new GridLayout(makeOptions({ columns: "auto" }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.gridTemplateColumns).toContain("1fr");
        layout.destroy();
    });
});

// ============================================================================
// CHILDREN
// ============================================================================

describe("GridLayout children", () =>
{
    test("InitialChildren_FourItems_AllRendered", () =>
    {
        const children = [makeChild(), makeChild(), makeChild(), makeChild()];
        const layout = new GridLayout(makeOptions({ children }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".gridlayout-cell"
            ).length
        ).toBe(4);
        layout.destroy();
    });

    test("AddChild_AfterInit_IncreasesCount", () =>
    {
        const layout = new GridLayout(makeOptions());
        layout.show(container);
        layout.addChild(makeChild());
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".gridlayout-cell"
            ).length
        ).toBe(1);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("GridLayout lifecycle", () =>
{
    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new GridLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
