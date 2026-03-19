/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
 *
 * ⚓ TESTS: AnchorLayout
 * Vitest unit tests for the AnchorLayout component.
 * Covers: factory, options, DOM structure, child management, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    AnchorLayout,
    createAnchorLayout,
} from "./anchorlayout";
import type { AnchorLayoutOptions, AnchorChildConfig } from "./anchorlayout";

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
    overrides?: Partial<AnchorLayoutOptions>
): AnchorLayoutOptions
{
    return {
        id: "test-anchor",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "anchor-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("AnchorLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createAnchorLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createAnchorLayout(
            makeOptions(), "anchor-test-container"
        );
        expect(container.querySelector(".anchorlayout")).not.toBeNull();
        layout.destroy();
    });

    test("createAnchorLayout_NoContainerId_MountsToBody", () =>
    {
        const layout = createAnchorLayout(makeOptions());
        expect(document.body.querySelector(".anchorlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("AnchorLayout DOM structure", () =>
{
    test("RootElement_HasCorrectId", () =>
    {
        const layout = new AnchorLayout(makeOptions({ id: "my-anchor" }));
        layout.show(container);
        expect(layout.getRootElement()?.id).toBe("my-anchor");
        layout.destroy();
    });

    test("RootElement_HasAnchorLayoutClass", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        layout.show(container);
        const root = layout.getRootElement();
        expect(root?.classList.contains("anchorlayout")).toBe(true);
        layout.destroy();
    });
});

// ============================================================================
// CHILD MANAGEMENT
// ============================================================================

describe("AnchorLayout child management", () =>
{
    test("AddChild_SingleChild_ChildAppearsInDOM", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        layout.show(container);
        const child = makeChild();
        layout.addChild({ child, anchorTop: 10, anchorLeft: 10 });
        expect(layout.getRootElement()?.children.length).toBeGreaterThan(0);
        layout.destroy();
    });

    test("InitialChildren_TwoChildren_BothMounted", () =>
    {
        const children: AnchorChildConfig[] = [
            { child: makeChild(), anchorTop: 0, anchorLeft: 0 },
            { child: makeChild(), anchorBottom: 0, anchorRight: 0 },
        ];
        const layout = new AnchorLayout(makeOptions({ children }));
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".anchorlayout-child"
            ).length
        ).toBe(2);
        layout.destroy();
    });
});

// ============================================================================
// SHOW / HIDE / DESTROY
// ============================================================================

describe("AnchorLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Hide_RemovesFromDOMButPreservesState", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        layout.show(container);
        layout.hide();
        expect(layout.isVisible()).toBe(false);
        expect(layout.getRootElement()).not.toBeNull();
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new AnchorLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
