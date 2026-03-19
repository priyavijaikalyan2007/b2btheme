/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Breadcrumb
 * Comprehensive Vitest unit tests for the Breadcrumb component.
 * Covers: factory, options, trail rendering, click navigation,
 * ARIA attributes, setItems, addItem, removeItem, getItems, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createBreadcrumb,
} from "./breadcrumb";
import type
{
    BreadcrumbOptions,
    BreadcrumbItem,
    BreadcrumbHandle,
} from "./breadcrumb";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeItems(): BreadcrumbItem[]
{
    return [
        { label: "Home", icon: "bi-house-fill" },
        { label: "Projects", href: "/projects" },
        { label: "Alpha" },
    ];
}

function makeOptions(overrides?: Partial<BreadcrumbOptions>): BreadcrumbOptions
{
    return {
        container,
        items: makeItems(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "breadcrumb-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createBreadcrumb
// ============================================================================

describe("createBreadcrumb", () =>
{
    test("createBreadcrumb_ValidOptions_ReturnsHandle", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        expect(handle).toBeDefined();
        expect(handle.getElement()).toBeInstanceOf(HTMLElement);
        handle.destroy();
    });

    test("createBreadcrumb_NoContainer_ThrowsError", () =>
    {
        expect(() =>
        {
            createBreadcrumb({ container: null as unknown as HTMLElement, items: [] });
        }).toThrow();
    });

    test("createBreadcrumb_EmptyItems_RendersEmptyBreadcrumb", () =>
    {
        const handle = createBreadcrumb(makeOptions({ items: [] }));
        const ol = handle.getElement().querySelector("ol");
        expect(ol).not.toBeNull();
        expect(ol?.children.length).toBe(0);
        handle.destroy();
    });
});

// ============================================================================
// OPTIONS
// ============================================================================

describe("Breadcrumb options", () =>
{
    test("WithItems_RendersCorrectNumberOfSegments", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const items = handle.getElement().querySelectorAll(".breadcrumb-item");
        expect(items.length).toBe(3);
        handle.destroy();
    });

    test("WithSeparator_SetsCustomSeparator", () =>
    {
        const handle = createBreadcrumb(makeOptions({ separator: ">" }));
        const nav = handle.getElement();
        const cssVar = nav.style.getPropertyValue("--breadcrumb-nav-divider");
        expect(cssVar).toContain(">");
        handle.destroy();
    });

    test("WithCssClass_AddsCustomClass", () =>
    {
        const handle = createBreadcrumb(makeOptions({ cssClass: "my-custom" }));
        expect(handle.getElement().classList.contains("my-custom")).toBe(true);
        handle.destroy();
    });

    test("WithSizeSmall_AddsSizeClass", () =>
    {
        const handle = createBreadcrumb(makeOptions({ size: "sm" }));
        expect(handle.getElement().classList.contains("breadcrumb-nav-sm")).toBe(true);
        handle.destroy();
    });
});

// ============================================================================
// TRAIL RENDERING
// ============================================================================

describe("Breadcrumb trail rendering", () =>
{
    test("Render_ThreeItems_LastItemIsActive", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const items = handle.getElement().querySelectorAll(".breadcrumb-item");
        const lastItem = items[items.length - 1];
        expect(lastItem.classList.contains("active")).toBe(true);
        handle.destroy();
    });

    test("Render_WithHref_RendersAnchorElement", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const links = handle.getElement().querySelectorAll("a.breadcrumb-nav-link");
        expect(links.length).toBeGreaterThan(0);
        handle.destroy();
    });

    test("Render_WithoutHref_RendersButtonElement", () =>
    {
        const handle = createBreadcrumb(makeOptions({
            items: [
                { label: "Root" },
                { label: "Current" },
            ],
        }));
        const buttons = handle.getElement().querySelectorAll("button.breadcrumb-nav-link");
        expect(buttons.length).toBeGreaterThan(0);
        handle.destroy();
    });

    test("Render_WithIcon_RendersIconElement", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const icons = handle.getElement().querySelectorAll(".breadcrumb-nav-icon");
        expect(icons.length).toBeGreaterThan(0);
        handle.destroy();
    });
});

// ============================================================================
// CLICK NAVIGATION
// ============================================================================

describe("Breadcrumb click navigation", () =>
{
    test("OnItemClick_ClickFirstItem_FiresCallbackWithIndex0", () =>
    {
        const onItemClick = vi.fn();
        const handle = createBreadcrumb(makeOptions({ onItemClick }));

        const firstLink = handle.getElement().querySelector(
            ".breadcrumb-nav-link"
        ) as HTMLElement;
        firstLink?.click();
        expect(onItemClick).toHaveBeenCalledWith(
            expect.objectContaining({ label: "Home" }),
            0
        );
        handle.destroy();
    });

    test("OnItemClick_NotProvided_NoErrorOnClick", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const firstLink = handle.getElement().querySelector(
            ".breadcrumb-nav-link"
        ) as HTMLElement;
        expect(() => firstLink?.click()).not.toThrow();
        handle.destroy();
    });
});

// ============================================================================
// ARIA ACCESSIBILITY
// ============================================================================

describe("Breadcrumb ARIA", () =>
{
    test("Nav_HasAriaLabelBreadcrumb", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        expect(handle.getElement().getAttribute("aria-label")).toBe("Breadcrumb");
        handle.destroy();
    });

    test("Nav_IsNavElement", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        expect(handle.getElement().tagName.toLowerCase()).toBe("nav");
        handle.destroy();
    });

    test("LastItem_HasAriaCurrentPage", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const items = handle.getElement().querySelectorAll(".breadcrumb-item");
        const lastItem = items[items.length - 1];
        expect(lastItem.getAttribute("aria-current")).toBe("page");
        handle.destroy();
    });
});

// ============================================================================
// HANDLE — setItems
// ============================================================================

describe("Breadcrumb setItems", () =>
{
    test("SetItems_NewItems_UpdatesRenderedSegments", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        handle.setItems([
            { label: "Root" },
            { label: "Child" },
        ]);
        const items = handle.getElement().querySelectorAll(".breadcrumb-item");
        expect(items.length).toBe(2);
        handle.destroy();
    });

    test("SetItems_EmptyArray_ClearsAllSegments", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        handle.setItems([]);
        const items = handle.getElement().querySelectorAll(".breadcrumb-item");
        expect(items.length).toBe(0);
        handle.destroy();
    });
});

// ============================================================================
// HANDLE — addItem / removeItem / getItems
// ============================================================================

describe("Breadcrumb addItem / removeItem / getItems", () =>
{
    test("AddItem_SingleItem_IncreasesItemCount", () =>
    {
        const handle = createBreadcrumb(makeOptions({ items: [{ label: "Root" }] }));
        handle.addItem({ label: "Child" });
        expect(handle.getItems().length).toBe(2);
        handle.destroy();
    });

    test("RemoveItem_ValidIndex_DecreasesItemCount", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const before = handle.getItems().length;
        handle.removeItem(1);
        expect(handle.getItems().length).toBe(before - 1);
        handle.destroy();
    });

    test("RemoveItem_InvalidIndex_NoChange", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const before = handle.getItems().length;
        handle.removeItem(99);
        expect(handle.getItems().length).toBe(before);
        handle.destroy();
    });

    test("GetItems_ReturnsDefensiveCopy", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const items = handle.getItems();
        items.push({ label: "Extra" });
        expect(handle.getItems().length).toBe(3);
        handle.destroy();
    });
});

// ============================================================================
// HANDLE — destroy
// ============================================================================

describe("Breadcrumb destroy", () =>
{
    test("Destroy_RemovesFromContainer", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        expect(container.querySelector(".breadcrumb-nav")).not.toBeNull();
        handle.destroy();
        expect(container.querySelector(".breadcrumb-nav")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        handle.destroy();
        expect(() => handle.destroy()).not.toThrow();
    });
});
