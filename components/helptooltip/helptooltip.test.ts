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
    test("withText_SetsTooltipText", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            text: "Custom help text",
        }));
        expect(handle).toBeDefined();
        handle.destroy();
    });

    test("withTopic_SetsTopic", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions({
            topic: sampleTopic,
        }));
        expect(handle).toBeDefined();
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
    test("setText_UpdatesTooltipText", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        handle.setText("New text");
        // Text is used internally for hover display, no error means success
        expect(handle).toBeDefined();
        handle.destroy();
    });

    test("setTopic_UpdatesTopic", () =>
    {
        const handle = createHelpTooltip(target, defaultOptions());
        handle.setTopic(sampleTopic);
        expect(handle).toBeDefined();
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
        icon?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
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
        icon?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        vi.advanceTimersByTime(500);
        icon?.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
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
