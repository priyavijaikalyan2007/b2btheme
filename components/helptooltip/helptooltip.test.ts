/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: HelpTooltip
 * Spec-based tests for the HelpTooltip hover/click help icon component.
 * Tests cover: factory function, options/defaults, DOM structure, ARIA,
 * handle methods, callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createHelpTooltip } from "./helptooltip";

// The REAL HelpDrawer, which registers `window.createHelpDrawer` on
// import -- the bridge HelpTooltip resolves a topic through.
// Importing it is what keeps this suite out of the stand-in census
// (ADR-203). `getHelpDrawer` reaches the singleton for teardown.
import { getHelpDrawer } from "../helpdrawer/helpdrawer";
import type { HelpTooltipOptions, HelpTooltipHandle, HelpTooltipTopic } from "./helptooltip";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;
let target: HTMLDivElement;

const sampleTopic: HelpTooltipTopic = {
    id: "sample",
    title: "Sample Help",
    markdown: "# Help\n\nThis is help content.",
};

function defaultOptions(overrides?: Partial<HelpTooltipOptions>): HelpTooltipOptions
{
    return {
        text: "This is helpful info",
        ...overrides,
    };
}

function getIcon(parent: HTMLElement): HTMLElement | null
{
    return parent.querySelector(".helptooltip-icon") as HTMLElement | null;
}

function getTooltipPopup(): HTMLElement | null
{
    return document.querySelector(".helptooltip-popup") as HTMLElement | null;
}

/** Opens the tooltip for a target and returns the popup's text. */
function popupTextFor(host: HTMLElement): string
{
    getIcon(host)?.dispatchEvent(
        new PointerEvent("pointerenter", { bubbles: true }));
    vi.advanceTimersByTime(500);

    return getTooltipPopup()?.textContent ?? "";
}

/**
 * Clicks the icon and returns the text of the drawer that opened.
 *
 * The REAL HelpDrawer, imported above so it registers its own
 * `window.createHelpDrawer`. A stub here would record the call and
 * prove nothing about whether the two components still fit: ADR-203
 * counts a stand-in for a component this repository owns, and the
 * only reason to plant one is when the claim IS the absence.
 */
function drawerTextAfterClick(host: HTMLElement): string
{
    getIcon(host)?.click();

    return document.querySelector(".helpdrawer-title")?.textContent ?? "";
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);

    target = document.createElement("div");
    target.id = "target-el";
    target.style.position = "relative";
    container.appendChild(target);
});

afterEach(() =>
{
    container.remove();

    // THE POPUP IS APPENDED TO document.body, NOT TO THE CONTAINER,
    // so removing the container leaves it behind and the next test's
    // `getTooltipPopup()` finds the previous test's popup. One failed
    // assertion that skipped its `destroy()` was enough to make two
    // later blocks fail for the wrong reason.
    document.querySelectorAll(".helptooltip-popup").forEach((n) => n.remove());

    // HelpDrawer IS A SINGLETON, so it has to be destroyed rather
    // than unlinked. Removing its element from the body left the
    // instance alive, and the next click got a handle onto a drawer
    // that was no longer in the document -- a title that read empty
    // for a topic that had in fact arrived.
    getHelpDrawer()?.destroy();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createHelpTooltip", () =>
{
    test("withValidTarget_ReturnsHandle", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        expect(handle).toBeDefined();
        expect(typeof handle.show).toBe("function");
        expect(typeof handle.hide).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("withValidTarget_AddsIconToTarget", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon).not.toBeNull();
        handle.destroy();
    });

    test("withNullTarget_ThrowsError", () =>
    {
        expect(() =>
        {
            createHelpTooltip(null as unknown as HTMLElement, defaultOptions());
        }).toThrow();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("HelpTooltip options", () =>
{
    // Four blocks here named a text or a topic and then asked the
    // HANDLE whether it existed. The text is only observable once the
    // popup opens, which is the thing the option is FOR, so each one
    // now opens it and reads what is in it.
    test("withText_SetsTooltipText", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            text: "Custom help text",
        }));

        expect(popupTextFor(target)).toContain("Custom help text");
        handle.destroy();
    });

    // THE POPUP IS THE WRONG PLACE TO LOOK FOR A TOPIC, and measuring
    // it is how that was settled: `showTooltip` renders `this.text`
    // and nothing else. A topic is what `openDrawer` hands to
    // HelpDrawer when the icon is CLICKED, so that is where the
    // option becomes observable.
    test("withTopic_SetsTopic", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            topic: sampleTopic,
        }));

        expect(drawerTextAfterClick(target)).toContain("Sample Help");
        handle.destroy();
    });

    test("withCustomSize_SetsIconSize", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({ size: 20 }));
        const icon = getIcon(target);
        expect(icon?.style.width).toBe("20px");
        handle.destroy();
    });

    test("withDefaultPosition_UsesTopRight", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon?.classList.contains("helptooltip-top-right")).toBe(true);
        handle.destroy();
    });

    test("withCustomPosition_AppliesPositionClass", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            position: "bottom-left",
        }));
        const icon = getIcon(target);
        expect(icon?.classList.contains("helptooltip-bottom-left")).toBe(true);
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("HelpTooltip DOM structure", () =>
{
    test("iconElement_IsInsideTarget", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon?.parentElement).toBe(target);
        handle.destroy();
    });

    test("icon_HasQuestionMarkContent", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon?.textContent).toBe("?");
        handle.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("HelpTooltip ARIA", () =>
{
    test("icon_HasButtonRole", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        // The icon is a native <button> element, which has an implicit button role
        expect(icon?.tagName.toLowerCase()).toBe("button");
        handle.destroy();
    });

    test("icon_HasAriaLabel", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon?.getAttribute("aria-label")).toBeTruthy();
        handle.destroy();
    });

    test("icon_HasTabIndex", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const icon = getIcon(target);
        expect(icon?.getAttribute("tabindex")).toBe("0");
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("HelpTooltip handle methods", () =>
{
    // "no error means success" was the whole assertion. The old text
    // is asserted absent as well, because a setText that APPENDS
    // would satisfy a check for the new one alone.
    test("setText_UpdatesTooltipText", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());

        handle.setText("New text");

        const shown = popupTextFor(target);
        expect(shown).toContain("New text");
        expect(shown).not.toContain("This is helpful info");
        handle.destroy();
    });

    test("setTopic_UpdatesTopic", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());

        handle.setTopic(sampleTopic);

        expect(drawerTextAfterClick(target)).toContain("Sample Help");
        handle.destroy();
    });

    test("show_MakesIconVisible", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        handle.hide();
        handle.show();
        const icon = getIcon(target);
        expect(icon?.style.display).not.toBe("none");
        handle.destroy();
    });

    test("hide_HidesIcon", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        handle.hide();
        const icon = getIcon(target);
        expect(icon?.style.display).toBe("none");
        handle.destroy();
    });

    test("getElement_ReturnsIconElement", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.classList.contains("helptooltip-icon")).toBe(true);
        handle.destroy();
    });

    test("destroy_RemovesIconFromTarget", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        handle.destroy();
        expect(getIcon(target)).toBeNull();
    });
});

// ============================================================================
// HOVER BEHAVIOUR
// ============================================================================

describe("HelpTooltip hover", () =>
{
    test("mouseEnter_ShowsTooltipAfterDelay", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            text: "Hover text",
        }));
        const icon = getIcon(target);
        icon?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        vi.advanceTimersByTime(500);
        const popup = getTooltipPopup();
        expect(popup).not.toBeNull();
        handle.destroy();
    });

    test("mouseLeave_HidesTooltip", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            text: "Hover text",
        }));
        const icon = getIcon(target);
        icon?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
        vi.advanceTimersByTime(500);
        icon?.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
        vi.advanceTimersByTime(100);
        const popup = getTooltipPopup();
        expect(popup).toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("HelpTooltip edge cases", () =>
{
    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        expect(() =>
        {
            handle.destroy();
            handle.destroy();
        }).not.toThrow();
    });

    test("multipleTooltipsOnSamePage_AllWork", () =>
    {
        const target2 = document.createElement("div");
        target2.style.position = "relative";
        container.appendChild(target2);

        const h1 = createHelpTooltip(target, defaultOptions({ text: "T1" }));
        const h2 = createHelpTooltip(target2, defaultOptions({ text: "T2" }));

        expect(getIcon(target)).not.toBeNull();
        expect(getIcon(target2)).not.toBeNull();

        h1.destroy();
        h2.destroy();
    });

    test("withEmptyText_DoesNotThrow", () =>
    {
        expect(() =>
        {
            const handle = createHelpTooltip(target, defaultOptions({ text: "" }));
            handle.destroy();
        }).not.toThrow();
    });
});
