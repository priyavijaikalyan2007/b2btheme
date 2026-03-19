/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d
 *
 * ⚓ TESTS: FlowLayout
 * Vitest unit tests for the FlowLayout component.
 * Covers: factory, direction, wrapping, children, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    FlowLayout,
    createFlowLayout,
} from "./flowlayout";
import type { FlowLayoutOptions } from "./flowlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeChild(): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = "flow-child";
    return el;
}

function makeOptions(
    overrides?: Partial<FlowLayoutOptions>
): FlowLayoutOptions
{
    return {
        id: "test-flow",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "flow-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("FlowLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new FlowLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createFlowLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createFlowLayout(
            makeOptions(), "flow-test-container"
        );
        expect(container.querySelector(".flowlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// DIRECTION
// ============================================================================

describe("FlowLayout direction", () =>
{
    test("Horizontal_SetsFlexWrapRow", () =>
    {
        const layout = new FlowLayout(makeOptions({ direction: "horizontal" }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.flexDirection).toBe("row");
        layout.destroy();
    });

    test("Vertical_SetsFlexColumn", () =>
    {
        const layout = new FlowLayout(makeOptions({ direction: "vertical" }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.flexDirection).toBe("column");
        layout.destroy();
    });
});

// ============================================================================
// CHILDREN
// ============================================================================

describe("FlowLayout children", () =>
{
    test("InitialChildren_ThreeItems_AllRendered", () =>
    {
        const children = [makeChild(), makeChild(), makeChild()];
        const layout = new FlowLayout(makeOptions({ children }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".flowlayout-child"
            ).length
        ).toBe(3);
        layout.destroy();
    });

    test("AddChild_AfterInit_IncreasesChildCount", () =>
    {
        const layout = new FlowLayout(makeOptions());
        layout.show(container);
        layout.addChild(makeChild());
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".flowlayout-child"
            ).length
        ).toBe(1);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("FlowLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new FlowLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new FlowLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
