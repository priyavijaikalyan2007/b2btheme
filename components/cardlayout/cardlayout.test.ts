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

// ============================================================================
// SURFACE — on(), setState, setData (readiness step 4 L2, ADR-240)
// ============================================================================

describe("CardLayout surface", () =>
{
    test("setState_TakesActiveKeyAlone_AndShowsThatCard", () =>
    {
        const layout = createCardLayout(makeOptions(), container.id);

        layout.setState({ activeKey: "tab2" });

        expect(layout.getState()).toEqual({ activeKey: "tab2", cardCount: 2 });
        layout.destroy();
    });

    test("setState_RoundTripsThroughJson", () =>
    {
        const layout = createCardLayout(makeOptions(), container.id);
        layout.setActiveCard("tab2");
        const state = JSON.parse(JSON.stringify(layout.getState()));
        layout.destroy();

        const again = createCardLayout(makeOptions(), container.id);
        again.setState(state);

        expect(again.getState()).toEqual(state);
        again.destroy();
    });

    test("on_EmitsNothing_ButReturnsAnUnsubscribeAndWarns", () =>
    {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const layout = createCardLayout(makeOptions(), container.id);

        const off = layout.on("change", () => undefined);

        expect(typeof off).toBe("function");
        expect(() => off()).not.toThrow();
        warn.mockRestore();
        layout.destroy();
    });

    test("setData_Throws_BecauseTheCardsAreAnOption", () =>
    {
        const layout = createCardLayout(makeOptions(), container.id);

        expect(() => layout.setData("cards", [])).toThrow(/no data slots/);
        layout.destroy();
    });
});
