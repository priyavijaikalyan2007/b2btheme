/**
 * TESTS: HelpDrawer
 * Spec-based tests for the HelpDrawer sliding documentation panel.
 * Tests cover: factory function, singleton behaviour, options/defaults,
 * DOM structure, ARIA, handle methods, callbacks, keyboard, edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createHelpDrawer, getHelpDrawer } from "./helpdrawer";
import type { HelpTopic, HelpDrawerHandle } from "./helpdrawer";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

const topic1: HelpTopic = {
    id: "topic-1",
    title: "Getting Started",
    markdown: "# Getting Started\n\nWelcome to the help system.",
};

const topic2: HelpTopic = {
    id: "topic-2",
    title: "Advanced Usage",
    markdown: "# Advanced\n\nDeep details here.",
};

function getDrawer(): HTMLElement | null
{
    return document.querySelector(".helpdrawer");
}

function getTitle(): string
{
    const t = document.querySelector(".helpdrawer-title");
    return t?.textContent ?? "";
}

function getBackBtn(): HTMLElement | null
{
    return document.querySelector(".helpdrawer-back") as HTMLElement | null;
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
});

afterEach(() =>
{
    // Destroy singleton between tests
    const existing = getHelpDrawer();
    if (existing) { existing.destroy(); }
    const drawers = document.querySelectorAll(".helpdrawer");
    drawers.forEach((d) => d.remove());
    container.remove();
    vi.useRealTimers();
});

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

describe("createHelpDrawer", () =>
{
    test("withNoOptions_ReturnsHandle", () =>
    {
        const handle = createHelpDrawer();
        expect(handle).toBeDefined();
        expect(typeof handle.open).toBe("function");
        expect(typeof handle.close).toBe("function");
        expect(typeof handle.destroy).toBe("function");
        handle.destroy();
    });

    test("withValidOptions_CreatesDrawerElement", () =>
    {
        const handle = createHelpDrawer({ width: 350 });
        expect(getDrawer()).not.toBeNull();
        handle.destroy();
    });

    test("calledTwice_ReturnsSameInstance", () =>
    {
        const h1 = createHelpDrawer();
        const h2 = createHelpDrawer();
        expect(h1).toBe(h2);
        h1.destroy();
    });
});

describe("getHelpDrawer", () =>
{
    test("beforeCreation_ReturnsNull", () =>
    {
        expect(getHelpDrawer()).toBeNull();
    });

    test("afterCreation_ReturnsSingleton", () =>
    {
        const handle = createHelpDrawer();
        expect(getHelpDrawer()).toBe(handle);
        handle.destroy();
    });
});

// ============================================================================
// OPTIONS & DEFAULTS
// ============================================================================

describe("HelpDrawer options", () =>
{
    test("withCustomWidth_SetsDrawerWidth", () =>
    {
        const handle = createHelpDrawer({ width: 500 });
        const el = getDrawer();
        expect(el?.style.width).toBe("500px");
        handle.destroy();
    });

    test("withOnClose_CallbackInvokedOnClose", () =>
    {
        const onClose = vi.fn();
        const handle = createHelpDrawer({ onClose });
        handle.open(topic1);
        handle.close();
        expect(onClose).toHaveBeenCalled();
        handle.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("HelpDrawer DOM structure", () =>
{
    test("createsDrawerInBody", () =>
    {
        const handle = createHelpDrawer();
        const drawer = getDrawer();
        expect(drawer).not.toBeNull();
        expect(drawer?.parentElement).toBe(document.body);
        handle.destroy();
    });

    test("drawerHasHeaderAndBody", () =>
    {
        const handle = createHelpDrawer();
        const drawer = getDrawer();
        expect(drawer?.querySelector(".helpdrawer-header")).not.toBeNull();
        expect(drawer?.querySelector(".helpdrawer-body")).not.toBeNull();
        handle.destroy();
    });

    test("drawerHasResizeHandle", () =>
    {
        const handle = createHelpDrawer();
        const drawer = getDrawer();
        expect(drawer?.querySelector(".helpdrawer-resize-handle")).not.toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// ARIA
// ============================================================================

describe("HelpDrawer ARIA", () =>
{
    test("drawer_HasRoleComplementary", () =>
    {
        const handle = createHelpDrawer();
        const drawer = getDrawer();
        expect(drawer?.getAttribute("role")).toBe("complementary");
        handle.destroy();
    });

    test("drawer_HasAriaLabel", () =>
    {
        const handle = createHelpDrawer();
        const drawer = getDrawer();
        expect(drawer?.getAttribute("aria-label")).toBe("Help drawer");
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("HelpDrawer handle methods", () =>
{
    test("open_SetsOpenState", () =>
    {
        const handle = createHelpDrawer();
        expect(handle.isOpen()).toBe(false);
        handle.open(topic1);
        expect(handle.isOpen()).toBe(true);
        handle.destroy();
    });

    test("close_ClearsOpenState", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        handle.close();
        expect(handle.isOpen()).toBe(false);
        handle.destroy();
    });

    test("open_DisplaysTopicTitle", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        expect(getTitle()).toBe("Getting Started");
        handle.destroy();
    });

    test("back_NavigatesToPreviousTopic", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        handle.open(topic2);
        expect(getTitle()).toBe("Advanced Usage");
        handle.back();
        expect(getTitle()).toBe("Getting Started");
        handle.destroy();
    });

    test("canGoBack_FalseWithOneTopic", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        expect(handle.canGoBack()).toBe(false);
        handle.destroy();
    });

    test("canGoBack_TrueWithTwoTopics", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        handle.open(topic2);
        expect(handle.canGoBack()).toBe(true);
        handle.destroy();
    });

    test("getElement_ReturnsDrawerElement", () =>
    {
        const handle = createHelpDrawer();
        const el = handle.getElement();
        expect(el).toBeInstanceOf(HTMLElement);
        expect(el.classList.contains("helpdrawer")).toBe(true);
        handle.destroy();
    });

    test("destroy_RemovesDrawerFromDOM", () =>
    {
        const handle = createHelpDrawer();
        handle.destroy();
        expect(getDrawer()).toBeNull();
    });
});

// ============================================================================
// KEYBOARD
// ============================================================================

describe("HelpDrawer keyboard", () =>
{
    test("escapeKey_ClosesOpenDrawer", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        expect(handle.isOpen()).toBe(true);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(handle.isOpen()).toBe(false);
        handle.destroy();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("HelpDrawer edge cases", () =>
{
    test("closeWhenNotOpen_DoesNotThrow", () =>
    {
        const handle = createHelpDrawer();
        expect(() => handle.close()).not.toThrow();
        handle.destroy();
    });

    test("backWithNoHistory_DoesNotThrow", () =>
    {
        const handle = createHelpDrawer();
        handle.open(topic1);
        expect(() => handle.back()).not.toThrow();
        handle.destroy();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const handle = createHelpDrawer();
        expect(() =>
        {
            handle.destroy();
            handle.destroy();
        }).not.toThrow();
    });

    test("openWithoutMarkdownOrUrl_DoesNotOpen", () =>
    {
        const handle = createHelpDrawer();
        handle.open({ id: "empty", title: "Empty" } as HelpTopic);
        expect(handle.isOpen()).toBe(false);
        handle.destroy();
    });
});
