/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f
 *
 * ⚓ TESTS: BoxLayout
 * Vitest unit tests for the BoxLayout component.
 * Covers: factory, direction, children, flex factors, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    BoxLayout,
    createBoxLayout,
} from "./boxlayout";
import type { BoxLayoutOptions, BoxLayoutChildConfig } from "./boxlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeChild(): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = "child";
    return el;
}

function makeOptions(
    overrides?: Partial<BoxLayoutOptions>
): BoxLayoutOptions
{
    return {
        id: "test-box",
        direction: "horizontal",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "box-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("BoxLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new BoxLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createBoxLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createBoxLayout(
            makeOptions(), "box-test-container"
        );
        expect(container.querySelector(".boxlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// DIRECTION
// ============================================================================

describe("BoxLayout direction", () =>
{
    test("Horizontal_SetsFlexDirectionRow", () =>
    {
        const layout = new BoxLayout(makeOptions({ direction: "horizontal" }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.flexDirection).toBe("row");
        layout.destroy();
    });

    test("Vertical_SetsFlexDirectionColumn", () =>
    {
        const layout = new BoxLayout(makeOptions({ direction: "vertical" }));
        layout.show(container);
        const root = layout.getRootElement()!;
        expect(root.style.flexDirection).toBe("column");
        layout.destroy();
    });
});

// ============================================================================
// CHILDREN
// ============================================================================

describe("BoxLayout children", () =>
{
    test("InitialChildren_TwoChildren_BothRendered", () =>
    {
        const children: BoxLayoutChildConfig[] = [
            { child: makeChild(), flex: 1 },
            { child: makeChild(), flex: 2 },
        ];
        const layout = new BoxLayout(makeOptions({ children }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".boxlayout-child"
            ).length
        ).toBe(2);
        layout.destroy();
    });

    test("AddChild_AfterInit_IncreasesChildCount", () =>
    {
        const layout = new BoxLayout(makeOptions());
        layout.show(container);
        layout.addChild({ child: makeChild(), flex: 1 });
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".boxlayout-child"
            ).length
        ).toBe(1);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("BoxLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new BoxLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new BoxLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
