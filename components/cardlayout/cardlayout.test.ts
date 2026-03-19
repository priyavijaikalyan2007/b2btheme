/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a
 *
 * ⚓ TESTS: CardLayout
 * Vitest unit tests for the CardLayout component.
 * Covers: factory, active key, card switching, DOM structure, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    CardLayout,
    createCardLayout,
} from "./cardlayout";
import type { CardLayoutOptions, CardConfig } from "./cardlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeCard(key: string, text: string): CardConfig
{
    const el = document.createElement("div");
    el.textContent = text;
    return { key, child: el };
}

function makeOptions(
    overrides?: Partial<CardLayoutOptions>
): CardLayoutOptions
{
    return {
        id: "test-card",
        cards: [
            makeCard("tab1", "Tab 1 content"),
            makeCard("tab2", "Tab 2 content"),
        ],
        activeKey: "tab1",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "card-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY
// ============================================================================

describe("CardLayout factory", () =>
{
    test("Constructor_ValidOptions_CreatesInstance", () =>
    {
        const layout = new CardLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getRootElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("createCardLayout_WithContainerId_MountsInContainer", () =>
    {
        const layout = createCardLayout(
            makeOptions(), "card-test-container"
        );
        expect(container.querySelector(".cardlayout")).not.toBeNull();
        layout.destroy();
    });
});

// ============================================================================
// ACTIVE KEY
// ============================================================================

describe("CardLayout active key", () =>
{
    test("InitialActiveKey_FirstCard_IsDisplayed", () =>
    {
        const layout = new CardLayout(makeOptions({ activeKey: "tab1" }));
        layout.show(container);
        expect(layout.getActiveCard()).toBe("tab1");
        layout.destroy();
    });

    test("SetActiveKey_SwitchToTab2_UpdatesActiveKey", () =>
    {
        const layout = new CardLayout(makeOptions());
        layout.show(container);
        layout.setActiveCard("tab2");
        expect(layout.getActiveCard()).toBe("tab2");
        layout.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("CardLayout DOM", () =>
{
    test("RootElement_HasCardLayoutClass", () =>
    {
        const layout = new CardLayout(makeOptions());
        layout.show(container);
        expect(
            layout.getRootElement()?.classList.contains("cardlayout")
        ).toBe(true);
        layout.destroy();
    });

    test("TwoCards_RendersCorrectNumberOfWrappers", () =>
    {
        const layout = new CardLayout(makeOptions());
        layout.show(container);
        expect(
            layout.getRootElement()?.querySelectorAll(
                ".cardlayout-card"
            ).length
        ).toBe(2);
        layout.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("CardLayout lifecycle", () =>
{
    test("Show_MakesVisible", () =>
    {
        const layout = new CardLayout(makeOptions());
        layout.show(container);
        expect(layout.isVisible()).toBe(true);
        layout.destroy();
    });

    test("Destroy_NullifiesRootElement", () =>
    {
        const layout = new CardLayout(makeOptions());
        layout.show(container);
        layout.destroy();
        expect(layout.getRootElement()).toBeNull();
    });
});
