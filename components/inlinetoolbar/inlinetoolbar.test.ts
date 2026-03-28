/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: InlineToolbar
 * Spec-based tests for the InlineToolbar component.
 * Tests cover: creation, item rendering, click handlers, toggle active state,
 * disabled state, separators, sizes, compact mode, alignment, show/hide, destroy.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { createInlineToolbar } from "./inlinetoolbar";
import type { InlineToolbarItem } from "./inlinetoolbar";

// ============================================================================
// HELPERS
// ============================================================================

function makeContainer(): HTMLElement
{
    const container = document.createElement("div");
    container.id = "test-container";
    document.body.appendChild(container);
    return container;
}

function getButtons(container: HTMLElement): HTMLElement[]
{
    return Array.from(container.querySelectorAll(".inlinetoolbar-btn"));
}

function getSeparators(container: HTMLElement): HTMLElement[]
{
    return Array.from(container.querySelectorAll(".inlinetoolbar-separator"));
}

function sampleItems(): InlineToolbarItem[]
{
    return [
        { id: "filter", icon: "funnel", tooltip: "Filter", type: "toggle" },
        { id: "sep1", icon: "", tooltip: "", type: "separator" },
        { id: "expand", icon: "arrows-expand", tooltip: "Expand All" },
        { id: "refresh", icon: "arrow-clockwise", tooltip: "Refresh" },
    ];
}

// ============================================================================
// SETUP
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    document.body.innerHTML = "";
    container = makeContainer();
});

// ============================================================================
// CREATION
// ============================================================================

describe("createInlineToolbar", () =>
{
    test("withValidOptions_RendersToolbarInContainer", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const toolbar = container.querySelector(".inlinetoolbar");
        expect(toolbar).not.toBeNull();
    });

    test("withValidOptions_ReturnsHandleWithGetElement", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(handle.getElement()).toBeInstanceOf(HTMLElement);
        expect(handle.getElement().classList.contains("inlinetoolbar")).toBe(true);
    });

    test("withNoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createInlineToolbar({
                container: null as unknown as HTMLElement,
                items: [],
            });
        }).toThrow("InlineToolbar requires a container element");
    });

    test("withEmptyItems_RendersEmptyToolbar", () =>
    {
        const handle = createInlineToolbar({ container, items: [] });
        const buttons = getButtons(container);
        expect(buttons.length).toBe(0);
        expect(handle.getElement()).toBeTruthy();
    });

    test("toolbarHasRoleAttribute", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(handle.getElement().getAttribute("role")).toBe("toolbar");
    });
});

// ============================================================================
// ITEM RENDERING
// ============================================================================

describe("item rendering", () =>
{
    test("rendersButtonForEachNonSeparatorItem", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const buttons = getButtons(container);
        // sampleItems has 3 buttons + 1 separator
        expect(buttons.length).toBe(3);
    });

    test("buttonHasCorrectIconClass", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const buttons = getButtons(container);
        const icon = buttons[0].querySelector("i");
        expect(icon?.classList.contains("bi-funnel")).toBe(true);
    });

    test("buttonHasTooltipViaTitle", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const buttons = getButtons(container);
        expect(buttons[0].getAttribute("title")).toBe("Filter");
    });

    test("buttonHasAriaLabel", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const buttons = getButtons(container);
        expect(buttons[0].getAttribute("aria-label")).toBe("Filter");
    });

    test("buttonHasDataItemId", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const buttons = getButtons(container);
        expect(buttons[0].getAttribute("data-item-id")).toBe("filter");
    });
});

// ============================================================================
// CLICK HANDLERS
// ============================================================================

describe("click handlers", () =>
{
    test("buttonClick_CallsOnClick", () =>
    {
        const onClick = vi.fn();
        const items: InlineToolbarItem[] = [
            { id: "btn1", icon: "star", tooltip: "Star", onClick },
        ];
        createInlineToolbar({ container, items });

        const btn = getButtons(container)[0];
        btn.click();

        expect(onClick).toHaveBeenCalledOnce();
    });

    test("buttonClick_PassesItemAndActiveState", () =>
    {
        const onClick = vi.fn();
        const items: InlineToolbarItem[] = [
            { id: "btn1", icon: "star", tooltip: "Star", onClick },
        ];
        createInlineToolbar({ container, items });

        getButtons(container)[0].click();

        expect(onClick).toHaveBeenCalledWith(
            expect.objectContaining({ id: "btn1" }),
            false
        );
    });

    test("disabledButton_DoesNotFireCallback", () =>
    {
        const onClick = vi.fn();
        const items: InlineToolbarItem[] = [
            { id: "btn1", icon: "star", tooltip: "Star", disabled: true, onClick },
        ];
        createInlineToolbar({ container, items });

        // Disabled buttons have pointer-events: none, but we force the click
        // via the event delegation path — handler checks disabled flag
        const btn = getButtons(container)[0];
        btn.click();

        expect(onClick).not.toHaveBeenCalled();
    });
});

// ============================================================================
// TOGGLE ACTIVE STATE
// ============================================================================

describe("toggle active state", () =>
{
    test("toggleClick_TogglesActiveClass", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "t1", icon: "funnel", tooltip: "Filter", type: "toggle" },
        ];
        createInlineToolbar({ container, items });

        const btn = getButtons(container)[0];
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(false);

        btn.click();
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(true);

        btn.click();
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(false);
    });

    test("toggleInitiallyActive_HasActiveClass", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "t1", icon: "funnel", tooltip: "Filter", type: "toggle", active: true },
        ];
        createInlineToolbar({ container, items });

        const btn = getButtons(container)[0];
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(true);
    });

    test("setItemActive_SetsActiveClass", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "t1", icon: "funnel", tooltip: "Filter", type: "toggle" },
        ];
        const handle = createInlineToolbar({ container, items });

        handle.setItemActive("t1", true);
        const btn = getButtons(container)[0];
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(true);

        handle.setItemActive("t1", false);
        expect(btn.classList.contains("inlinetoolbar-btn-active")).toBe(false);
    });
});

// ============================================================================
// DISABLED STATE
// ============================================================================

describe("disabled state", () =>
{
    test("disabledItem_HasDisabledClassAndAttribute", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "d1", icon: "star", tooltip: "Star", disabled: true },
        ];
        createInlineToolbar({ container, items });

        const btn = getButtons(container)[0] as HTMLButtonElement;
        expect(btn.classList.contains("inlinetoolbar-btn-disabled")).toBe(true);
        expect(btn.disabled).toBe(true);
    });

    test("setItemDisabled_TogglesDisabledState", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "d1", icon: "star", tooltip: "Star" },
        ];
        const handle = createInlineToolbar({ container, items });

        handle.setItemDisabled("d1", true);
        const btn = getButtons(container)[0] as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        expect(btn.classList.contains("inlinetoolbar-btn-disabled")).toBe(true);

        handle.setItemDisabled("d1", false);
        expect(btn.disabled).toBe(false);
        expect(btn.classList.contains("inlinetoolbar-btn-disabled")).toBe(false);
    });
});

// ============================================================================
// SEPARATORS
// ============================================================================

describe("separators", () =>
{
    test("separatorItem_RendersVerticalDivider", () =>
    {
        createInlineToolbar({ container, items: sampleItems() });
        const separators = getSeparators(container);
        expect(separators.length).toBe(1);
    });

    test("separatorItem_DoesNotRenderButton", () =>
    {
        const items: InlineToolbarItem[] = [
            { id: "sep1", icon: "", tooltip: "", type: "separator" },
        ];
        createInlineToolbar({ container, items });

        expect(getButtons(container).length).toBe(0);
        expect(getSeparators(container).length).toBe(1);
    });
});

// ============================================================================
// SIZE VARIANTS
// ============================================================================

describe("size variants", () =>
{
    test("defaultSize_IsSm", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(handle.getElement().classList.contains("inlinetoolbar-sm")).toBe(true);
    });

    test("xsSize_SetsXsClass", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems(), size: "xs" });
        expect(handle.getElement().classList.contains("inlinetoolbar-xs")).toBe(true);
    });

    test("mdSize_SetsMdClass", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems(), size: "md" });
        expect(handle.getElement().classList.contains("inlinetoolbar-md")).toBe(true);
    });
});

// ============================================================================
// COMPACT MODE
// ============================================================================

describe("compact mode", () =>
{
    test("compactTrue_SetsCompactClass", () =>
    {
        const handle = createInlineToolbar({
            container,
            items: sampleItems(),
            compact: true,
        });
        expect(handle.getElement().classList.contains("inlinetoolbar-compact")).toBe(true);
    });

    test("compactDefault_NoCompactClass", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(handle.getElement().classList.contains("inlinetoolbar-compact")).toBe(false);
    });
});

// ============================================================================
// ALIGNMENT
// ============================================================================

describe("alignment", () =>
{
    test("defaultAlign_IsLeft", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(handle.getElement().classList.contains("inlinetoolbar-align-left")).toBe(true);
    });

    test("centerAlign_SetsCenterClass", () =>
    {
        const handle = createInlineToolbar({
            container, items: sampleItems(), align: "center",
        });
        expect(handle.getElement().classList.contains("inlinetoolbar-align-center")).toBe(true);
    });

    test("rightAlign_SetsRightClass", () =>
    {
        const handle = createInlineToolbar({
            container, items: sampleItems(), align: "right",
        });
        expect(handle.getElement().classList.contains("inlinetoolbar-align-right")).toBe(true);
    });
});

// ============================================================================
// SHOW / HIDE
// ============================================================================

describe("show and hide", () =>
{
    test("hide_SetsDisplayNone", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        handle.hide();
        expect(handle.getElement().style.display).toBe("none");
    });

    test("show_RestoresDisplay", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        handle.hide();
        handle.show();
        expect(handle.getElement().style.display).toBe("");
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("removesToolbarFromDOM", () =>
    {
        const handle = createInlineToolbar({ container, items: sampleItems() });
        expect(container.querySelector(".inlinetoolbar")).not.toBeNull();

        handle.destroy();
        expect(container.querySelector(".inlinetoolbar")).toBeNull();
    });
});
