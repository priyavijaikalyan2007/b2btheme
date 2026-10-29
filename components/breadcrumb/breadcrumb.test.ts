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
import { destroyProbe } from "../../tests/destroy-probe";
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
        // DEBT-TEST-1b. With no handler supplied, the click has to
        // leave the trail exactly as it was — a breadcrumb that
        // quietly re-rendered or moved its active item would also not
        // throw (ADR-215).
        const handle = createBreadcrumb(makeOptions());
        const root = handle.getElement();
        const firstLink = root.querySelector(
            ".breadcrumb-nav-link"
        ) as HTMLElement;
        const before = root.innerHTML;

        expect(firstLink).not.toBeNull();

        firstLink.click();

        expect(root.innerHTML).toBe(before);

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
        const probe = destroyProbe();

        handle.destroy();
        const first = probe.total();
        handle.destroy();

        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });
});

// ============================================================================
// SURFACE CONTRACT (B4): additive on("itemClick" | "actionClick"), empty state
// and setData. The legacy callbacks keep firing first, exactly once.
// ============================================================================

describe("surface contract (B4)", () =>
{
    const ACTIONS = [
        { id: "rename", label: "Rename" },
        { id: "delete", label: "Delete", separator: true },
    ];

    function openActionsAndClick(handle: BreadcrumbHandle, actionId: string): void
    {
        const caret = handle.getElement().querySelector(".breadcrumb-nav-actions-caret") as HTMLElement;
        caret.click();
        const item = document.body.querySelector(`[data-action-id="${actionId}"]`) as HTMLElement;
        item.click();
    }

    test("on(itemClick)_HearsItemAndIndex_AfterOnItemClick", () =>
    {
        const order: string[] = [];
        const handle = createBreadcrumb(makeOptions({
            onItemClick: (item, index) => order.push(`option:${item.label}:${index}`),
        }));
        const heard: unknown[] = [];
        handle.on("itemClick", (payload) =>
        {
            order.push("channel");
            heard.push(payload);
        });

        (handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement).click();

        expect(order).toEqual(["option:Home:0", "channel"]);
        expect(heard).toEqual([{ item: { label: "Home", icon: "bi-house-fill" }, index: 0 }]);
        handle.destroy();
    });

    test("on(itemClick)_WithoutOnItemClick_StillEmits", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const heard = vi.fn();
        handle.on("itemClick", heard);

        const links = handle.getElement().querySelectorAll(".breadcrumb-nav-link");
        (links[1] as HTMLElement).click();

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith({ item: { label: "Projects", href: "/projects" }, index: 1 });
        handle.destroy();
    });

    test("on(itemClick)_ItemWithoutHrefAndNoCallback_IsClickableAndEmits", () =>
    {
        const handle = createBreadcrumb(makeOptions({ items: [{ label: "Root" }, { label: "Current" }] }));
        const heard = vi.fn();
        handle.on("itemClick", heard);

        const button = handle.getElement().querySelector("button.breadcrumb-nav-link") as HTMLElement;
        button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

        expect(heard).toHaveBeenCalledWith({ item: { label: "Root" }, index: 0 });
        handle.destroy();
    });

    test("on(itemClick)_PayloadOmitsData_AndIsJson", () =>
    {
        const handle = createBreadcrumb(makeOptions({
            items: [{ label: "Root", data: { fn: () => 1 } }, { label: "Current" }],
        }));
        const heard = vi.fn();
        handle.on("itemClick", heard);

        (handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement).click();

        const payload = heard.mock.calls[0][0] as { item: Record<string, unknown> };
        expect("data" in payload.item).toBe(false);
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        handle.destroy();
    });

    test("on(itemClick)_PayloadIsACopy_MutatingItDoesNotChangeTheItems", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        handle.on("itemClick", (payload) =>
        {
            (payload as { item: { label: string } }).item.label = "Mutated";
        });

        (handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement).click();

        expect(handle.getItems()[0].label).toBe("Home");
        handle.destroy();
    });

    test("on(itemClick)_EllipsisItem_HearsTheRealIndex", () =>
    {
        const items = Array.from({ length: 8 }, (_, i) => ({ label: `L${i}` }));
        const handle = createBreadcrumb(makeOptions({ items, maxVisible: 4 }));
        const heard = vi.fn();
        handle.on("itemClick", heard);

        (handle.getElement().querySelector(".breadcrumb-nav-ellipsis") as HTMLElement).click();
        (document.body.querySelector(".breadcrumb-nav-dropdown-item") as HTMLElement).click();

        expect(heard).toHaveBeenCalledTimes(1);
        const payload = heard.mock.calls[0][0] as { item: { label: string }; index: number };
        expect(items[payload.index].label).toBe(payload.item.label);
        expect(payload.index).toBeGreaterThan(0);
        handle.destroy();
    });

    test("on(itemClick)_PreventDefaultBehaviourIsUnchanged", () =>
    {
        const withCallback = createBreadcrumb(makeOptions({
            items: [{ label: "Root" }, { label: "Current" }],
            onItemClick: () => undefined,
        }));
        const withoutCallback = createBreadcrumb(makeOptions({ items: [{ label: "Root" }, { label: "Current" }] }));
        const withHref = createBreadcrumb(makeOptions({ onItemClick: () => undefined }));
        withHref.on("itemClick", () => undefined);

        const fire = (h: BreadcrumbHandle, selector: string): boolean =>
        {
            const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
            (h.getElement().querySelector(selector) as HTMLElement).dispatchEvent(ev);
            return ev.defaultPrevented;
        };

        expect(fire(withCallback, "button.breadcrumb-nav-link")).toBe(true);
        expect(fire(withoutCallback, "button.breadcrumb-nav-link")).toBe(true);
        expect(fire(withHref, "a.breadcrumb-nav-link")).toBe(false);
        withCallback.destroy();
        withoutCallback.destroy();
        withHref.destroy();
    });

    test("on(itemClick)_Unsubscribe_StopsDelivery", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const heard = vi.fn();
        const off = handle.on("itemClick", heard);
        const link = handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement;

        link.click();
        off();
        link.click();

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("on(itemClick)_ThrowingHandler_DoesNotStopTheNextOne", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const next = vi.fn();
        handle.on("itemClick", () => { throw new Error("boom"); });
        handle.on("itemClick", next);
        const errors = vi.spyOn(console, "error").mockImplementation(() => undefined);

        (handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement).click();

        expect(next).toHaveBeenCalledTimes(1);
        errors.mockRestore();
        handle.destroy();
    });

    test("on(actionClick)_HearsActionIdAndItem_AfterOnActionClick", () =>
    {
        const order: string[] = [];
        const handle = createBreadcrumb(makeOptions({
            actions: ACTIONS,
            onActionClick: (id, item) => order.push(`option:${id}:${item.label}`),
        }));
        const heard: unknown[] = [];
        handle.on("actionClick", (payload) =>
        {
            order.push("channel");
            heard.push(payload);
        });

        openActionsAndClick(handle, "delete");

        expect(order).toEqual(["option:delete:Alpha", "channel"]);
        expect(heard).toEqual([{ actionId: "delete", item: { label: "Alpha" } }]);
        expect(document.body.querySelector(".breadcrumb-nav-dropdown")).toBeNull();
        handle.destroy();
    });

    test("on(actionClick)_WithoutOnActionClick_StillEmitsAndClosesDropdown", () =>
    {
        const handle = createBreadcrumb(makeOptions({ actions: ACTIONS }));
        const heard = vi.fn();
        handle.on("actionClick", heard);

        openActionsAndClick(handle, "rename");

        expect(heard).toHaveBeenCalledTimes(1);
        expect(heard).toHaveBeenCalledWith({ actionId: "rename", item: { label: "Alpha" } });
        expect(document.body.querySelector(".breadcrumb-nav-dropdown")).toBeNull();
        handle.destroy();
    });

    test("on(actionClick)_PayloadOmitsData_AndIsJson", () =>
    {
        const handle = createBreadcrumb(makeOptions({
            items: [{ label: "Root" }, { label: "Current", data: { fn: () => 1 } }],
            actions: ACTIONS,
        }));
        const heard = vi.fn();
        handle.on("actionClick", heard);

        openActionsAndClick(handle, "rename");

        const payload = heard.mock.calls[0][0] as { item: Record<string, unknown> };
        expect("data" in payload.item).toBe(false);
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        handle.destroy();
    });

    test("on(actionClick)_DisabledAction_DoesNotEmit", () =>
    {
        const handle = createBreadcrumb(makeOptions({
            actions: [{ id: "locked", label: "Locked", disabled: true }, ...ACTIONS],
        }));
        const heard = vi.fn();
        handle.on("actionClick", heard);

        const caret = handle.getElement().querySelector(".breadcrumb-nav-actions-caret") as HTMLElement;
        caret.click();
        (document.body.querySelector('[data-action-id="locked"]') as HTMLElement).click();

        expect(heard).not.toHaveBeenCalled();
        handle.destroy();
    });

    test("on(actionClick)_Unsubscribe_StopsDelivery", () =>
    {
        const handle = createBreadcrumb(makeOptions({ actions: ACTIONS }));
        const heard = vi.fn();
        const off = handle.on("actionClick", heard);

        openActionsAndClick(handle, "rename");
        off();
        openActionsAndClick(handle, "rename");

        expect(heard).toHaveBeenCalledTimes(1);
        handle.destroy();
    });

    test("destroy_ClearsHandlers", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const heard = vi.fn();
        const link = handle.getElement().querySelector(".breadcrumb-nav-link") as HTMLElement;
        handle.on("itemClick", heard);

        handle.destroy();
        link.click();

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_ThrowsNamingTheValidChannels", () =>
    {
        const handle = createBreadcrumb(makeOptions());

        expect(() => handle.on("bogus", () => undefined)).toThrow(/itemClick.*actionClick/);
        handle.destroy();
    });

    test("setData_Throws_NamingTheComponentAndTheSetters", () =>
    {
        const handle = createBreadcrumb(makeOptions());

        expect(() => handle.setData("items", [])).toThrow(/Breadcrumb.*no data slots.*setItems\(\).*setActions\(\)/);
        handle.destroy();
    });

    test("getState_SetState_HaveNoKeys", () =>
    {
        const handle = createBreadcrumb(makeOptions());
        const before = handle.getElement().innerHTML;

        expect(handle.getState()).toEqual({});
        handle.setState({ anything: 1 });

        expect(handle.getState()).toEqual({});
        expect(handle.getElement().innerHTML).toBe(before);
        handle.destroy();
    });
});
