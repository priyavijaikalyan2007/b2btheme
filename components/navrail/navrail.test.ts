/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: NavRail
 * Vitest unit tests for the NavRail component.
 * Covers: factory/handle, rendering, active state, collapse toggle, navigate
 * event, flyout open/close, badge updates, disabled/visibility, keyboard
 * navigation (arrows/Enter/Home/End/Escape), persistence round-trip,
 * CSS custom property publishing, destroy cleanup.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createNavRail,
} from "./navrail";
import type
{
    NavRailOptions,
    NavRailCategory,
} from "./navrail";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "navrail-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
    // Remove any stray manager-managed CSS custom properties.
    document.documentElement.style.removeProperty("--navrail-left-width");
    document.documentElement.style.removeProperty("--navrail-right-width");
    // Clean up any flyouts portaled to body.
    document.querySelectorAll(".navrail-flyout").forEach((el) => el.remove());
    // Reset localStorage between tests.
    localStorage.clear();
});

function makeCategories(): NavRailCategory[]
{
    return [
        {
            id: "workspace",
            label: "Workspace",
            items: [
                { id: "overview", icon: "bi-speedometer2", label: "Overview" },
                { id: "settings", icon: "bi-sliders", label: "Settings" },
            ],
        },
        {
            id: "people",
            label: "People",
            items: [
                { id: "users", icon: "bi-people", label: "Users", badge: 1 },
                { id: "roles", icon: "bi-shield", label: "Roles" },
            ],
        },
    ];
}

function makeOptions(over: Partial<NavRailOptions> = {}): NavRailOptions
{
    const onNavigate = over.onNavigate ?? vi.fn();
    const { onNavigate: _discard, ...rest } = over;
    return {
        container,
        categories: makeCategories(),
        onNavigate,
        ...rest,
    };
}

// ============================================================================
// FACTORY
// ============================================================================

describe("createNavRail", () =>
{
    test("createNavRail_ValidOptions_ReturnsHandle", () =>
    {
        const rail = createNavRail(makeOptions());
        expect(rail).toBeDefined();
        expect(typeof rail.destroy).toBe("function");
        rail.destroy();
    });

    test("createNavRail_MountsRootIntoContainer", () =>
    {
        createNavRail(makeOptions());
        const root = container.querySelector(".navrail-container");
        expect(root).not.toBeNull();
    });

    test("createNavRail_SetsNavRoleAndAriaLabel", () =>
    {
        createNavRail(makeOptions({ ariaLabel: "Primary navigation" }));
        const nav = container.querySelector("nav.navrail-container");
        expect(nav).not.toBeNull();
        expect(nav!.getAttribute("aria-label")).toBe("Primary navigation");
    });

    test("createNavRail_DefaultsToLeftPosition", () =>
    {
        createNavRail(makeOptions());
        const root = container.querySelector(".navrail-container");
        expect(root!.classList.contains("navrail-left")).toBe(true);
    });

    test("createNavRail_RightPosition_AppliesRightClass", () =>
    {
        createNavRail(makeOptions({ position: "right" }));
        const root = container.querySelector(".navrail-container");
        expect(root!.classList.contains("navrail-right")).toBe(true);
    });
});

// ============================================================================
// RENDERING
// ============================================================================

describe("rendering", () =>
{
    test("rendering_RendersAllCategories", () =>
    {
        createNavRail(makeOptions());
        const categories = container.querySelectorAll(".navrail-category");
        expect(categories.length).toBe(2);
    });

    test("rendering_RendersAllItemsAcrossCategories", () =>
    {
        createNavRail(makeOptions());
        const items = container.querySelectorAll(".navrail-item");
        expect(items.length).toBe(4);
    });

    test("rendering_EachItemHasIconAndLabel", () =>
    {
        createNavRail(makeOptions());
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"overview\"]"
        ) as HTMLElement;
        expect(item.querySelector(".navrail-item-icon")).not.toBeNull();
        expect(item.querySelector(".navrail-item-label")?.textContent).toBe(
            "Overview"
        );
    });

    test("rendering_CategoryLabelUsesTextContent", () =>
    {
        createNavRail(makeOptions());
        const label = container.querySelector(".navrail-category-label");
        expect(label!.textContent).toBe("Workspace");
    });

    test("rendering_BadgePillShownWhenExpanded", () =>
    {
        createNavRail(makeOptions());
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"users\"]"
        );
        const badge = item!.querySelector(".navrail-item-badge");
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe("1");
    });

    test("rendering_HeaderTitleAndSubtitle_UseTextContent", () =>
    {
        createNavRail(makeOptions({
            header: {
                brandInitials: "K",
                title: "Knobby IO",
                subtitle: "Pro plan · 12/25 seats",
            },
        }));
        const title = container.querySelector(".navrail-header-title");
        const sub = container.querySelector(".navrail-header-subtitle");
        expect(title!.textContent).toBe("Knobby IO");
        expect(sub!.textContent).toBe("Pro plan · 12/25 seats");
    });

    test("rendering_SearchRow_ShownWhenConfigured", () =>
    {
        const onActivate = vi.fn();
        createNavRail(makeOptions({
            search: { placeholder: "Jump to...", onActivate },
        }));
        const search = container.querySelector(".navrail-search");
        expect(search).not.toBeNull();
        (search as HTMLElement).click();
        expect(onActivate).toHaveBeenCalled();
    });

    test("rendering_InjectsScript_NeverViaInnerHtml", () =>
    {
        // Guard against XSS: labels must use textContent.
        createNavRail(makeOptions({
            categories: [{
                id: "c1", label: "<img src=x onerror=alert(1)>",
                items: [{
                    id: "i1", icon: "bi-x",
                    label: "<script>boom()</script>",
                }],
            }],
        }));
        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("img[onerror]")).toBeNull();
        const labelEl = container.querySelector(".navrail-item-label");
        expect(labelEl!.textContent).toContain("<script>");
    });
});

// ============================================================================
// ACTIVE STATE
// ============================================================================

describe("active state", () =>
{
    test("activeState_InitialActiveId_MarksItemActive", () =>
    {
        createNavRail(makeOptions({ activeId: "settings" }));
        const active = container.querySelector(".navrail-item-active");
        expect(active!.getAttribute("data-item-id")).toBe("settings");
    });

    test("activeState_ActiveItem_HasAriaCurrentPage", () =>
    {
        createNavRail(makeOptions({ activeId: "settings" }));
        const active = container.querySelector(".navrail-item-active");
        expect(active!.getAttribute("aria-current")).toBe("page");
    });

    test("activeState_SetActive_UpdatesHighlightAndAria", () =>
    {
        const rail = createNavRail(makeOptions({ activeId: "overview" }));
        rail.setActive("users");
        const active = container.querySelector(".navrail-item-active");
        expect(active!.getAttribute("data-item-id")).toBe("users");
        expect(rail.getActive()).toBe("users");
    });

    test("activeState_SetActive_UnknownId_NoCrashNoChange", () =>
    {
        const rail = createNavRail(makeOptions({ activeId: "overview" }));
        rail.setActive("does-not-exist");
        expect(rail.getActive()).toBe("overview");
    });
});

// ============================================================================
// NAVIGATE EVENT
// ============================================================================

describe("navigate event", () =>
{
    test("navigate_ClickItem_FiresOnNavigateWithItem", () =>
    {
        const onNavigate = vi.fn();
        createNavRail(makeOptions({ onNavigate }));
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"overview\"]"
        ) as HTMLElement;
        item.click();
        expect(onNavigate).toHaveBeenCalledTimes(1);
        expect(onNavigate.mock.calls[0][0]).toBe("overview");
        expect(onNavigate.mock.calls[0][1].id).toBe("overview");
    });

    test("navigate_ClickDisabledItem_DoesNotFire", () =>
    {
        const onNavigate = vi.fn();
        const cats = makeCategories();
        cats[0].items[0].disabled = true;
        createNavRail(makeOptions({ categories: cats, onNavigate }));
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"overview\"]"
        ) as HTMLElement;
        item.click();
        expect(onNavigate).not.toHaveBeenCalled();
    });

    test("navigate_EnterKey_FiresOnNavigate", () =>
    {
        const onNavigate = vi.fn();
        createNavRail(makeOptions({ onNavigate }));
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"overview\"]"
        ) as HTMLElement;
        item.focus();
        item.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));
        expect(onNavigate).toHaveBeenCalledTimes(1);
    });

    test("navigate_ClickCategoryHeader_DoesNotFire", () =>
    {
        const onNavigate = vi.fn();
        createNavRail(makeOptions({ onNavigate }));
        const label = container.querySelector(
            ".navrail-category-label"
        ) as HTMLElement;
        label.click();
        expect(onNavigate).not.toHaveBeenCalled();
    });
});

// ============================================================================
// COLLAPSE TOGGLE
// ============================================================================

describe("collapse toggle", () =>
{
    test("collapse_StartsExpandedByDefault", () =>
    {
        const rail = createNavRail(makeOptions());
        expect(rail.isCollapsed()).toBe(false);
        const root = container.querySelector(".navrail-container");
        expect(root!.classList.contains("navrail-expanded")).toBe(true);
    });

    test("collapse_StartsCollapsedWhenConfigured", () =>
    {
        const rail = createNavRail(makeOptions({ collapsed: true }));
        expect(rail.isCollapsed()).toBe(true);
        const root = container.querySelector(".navrail-container");
        expect(root!.classList.contains("navrail-collapsed")).toBe(true);
    });

    test("collapse_ToggleCollapse_FiresCallback", () =>
    {
        const onCollapseToggle = vi.fn();
        const rail = createNavRail(makeOptions({ onCollapseToggle }));
        rail.collapse();
        expect(rail.isCollapsed()).toBe(true);
        expect(onCollapseToggle).toHaveBeenCalledWith(true);
        rail.expand();
        expect(rail.isCollapsed()).toBe(false);
        expect(onCollapseToggle).toHaveBeenLastCalledWith(false);
    });

    test("collapse_HidesCategoryLabels", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.collapse();
        const root = container.querySelector(".navrail-container");
        expect(root!.classList.contains("navrail-collapsed")).toBe(true);
        // Labels still in DOM but CSS hides; verify state class.
        expect(root!.classList.contains("navrail-expanded")).toBe(false);
    });

    test("collapse_ToggleButton_TogglesState", () =>
    {
        const rail = createNavRail(makeOptions());
        const toggle = container.querySelector(
            ".navrail-toggle"
        ) as HTMLElement;
        expect(toggle).not.toBeNull();
        toggle.click();
        expect(rail.isCollapsed()).toBe(true);
        toggle.click();
        expect(rail.isCollapsed()).toBe(false);
    });
});

// ============================================================================
// BADGE UPDATES
// ============================================================================

describe("badge updates", () =>
{
    test("badge_SetBadge_UpdatesInPlace", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.setBadge("roles", 5, "danger");
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"roles\"]"
        );
        const badge = item!.querySelector(".navrail-item-badge");
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe("5");
        expect(badge!.classList.contains("navrail-item-badge-danger")).toBe(
            true
        );
    });

    test("badge_SetBadgeNull_RemovesBadge", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.setBadge("users", null);
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"users\"]"
        );
        expect(item!.querySelector(".navrail-item-badge")).toBeNull();
    });
});

// ============================================================================
// DISABLED / VISIBILITY
// ============================================================================

describe("disabled and visibility", () =>
{
    test("disabled_SetDisabled_AppliesClass", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.setDisabled("overview", true);
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"overview\"]"
        );
        expect(item!.classList.contains("navrail-item-disabled")).toBe(true);
        expect(item!.getAttribute("aria-disabled")).toBe("true");
    });

    test("visibility_SetVisible_False_HidesItem", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.setVisible("roles", false);
        const item = container.querySelector(
            ".navrail-item[data-item-id=\"roles\"]"
        ) as HTMLElement;
        expect(item.hidden).toBe(true);
    });
});

// ============================================================================
// CHILDREN / FLYOUT
// ============================================================================

describe("children and flyout", () =>
{
    function withChildren(): NavRailOptions
    {
        return makeOptions({
            categories: [{
                id: "billing", label: "Billing", items: [{
                    id: "billing-root", icon: "bi-credit-card", label: "Billing",
                    children: [
                        { id: "invoices", icon: "bi-receipt", label: "Invoices" },
                        {
                            id: "subs", icon: "bi-arrow-repeat",
                            label: "Subscriptions",
                        },
                    ],
                }],
            }],
        });
    }

    test("children_ExpandedClickParent_TogglesChildren", () =>
    {
        const rail = createNavRail(withChildren());
        const parent = container.querySelector(
            ".navrail-item[data-item-id=\"billing-root\"]"
        ) as HTMLElement;
        // Initially children are collapsed.
        expect(parent.getAttribute("aria-expanded")).toBe("false");
        parent.click();
        expect(parent.getAttribute("aria-expanded")).toBe("true");
        // Children become visible in DOM.
        const child = container.querySelector(
            ".navrail-item[data-item-id=\"invoices\"]"
        );
        expect(child).not.toBeNull();
        rail.destroy();
    });

    test("children_CollapsedHoverParent_OpensFlyout", () =>
    {
        const rail = createNavRail(
            { ...withChildren(), collapsed: true }
        );
        const parent = container.querySelector(
            ".navrail-item[data-item-id=\"billing-root\"]"
        ) as HTMLElement;
        parent.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        const flyout = document.querySelector(".navrail-flyout");
        expect(flyout).not.toBeNull();
        expect(flyout!.textContent).toContain("Invoices");
        rail.destroy();
    });

    test("children_FlyoutEscape_ClosesFlyout", () =>
    {
        const rail = createNavRail(
            { ...withChildren(), collapsed: true }
        );
        const parent = container.querySelector(
            ".navrail-item[data-item-id=\"billing-root\"]"
        ) as HTMLElement;
        parent.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
        expect(document.querySelector(".navrail-flyout")).not.toBeNull();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(document.querySelector(".navrail-flyout")).toBeNull();
        rail.destroy();
    });
});

// ============================================================================
// KEYBOARD NAVIGATION
// ============================================================================

describe("keyboard navigation", () =>
{
    function getFocusable(): HTMLElement[]
    {
        return Array.from(
            container.querySelectorAll<HTMLElement>(".navrail-item")
        ).filter((el) => !el.hasAttribute("aria-disabled")
            || el.getAttribute("aria-disabled") !== "true");
    }

    test("keyboard_ArrowDown_MovesFocusToNextItem", () =>
    {
        createNavRail(makeOptions({ activeId: "overview" }));
        const items = getFocusable();
        items[0].focus();
        items[0].dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown", bubbles: true,
        }));
        expect(document.activeElement).toBe(items[1]);
    });

    test("keyboard_ArrowUp_MovesFocusToPreviousItem", () =>
    {
        createNavRail(makeOptions({ activeId: "overview" }));
        const items = getFocusable();
        items[2].focus();
        items[2].dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowUp", bubbles: true,
        }));
        expect(document.activeElement).toBe(items[1]);
    });

    test("keyboard_Home_FocusesFirstItem", () =>
    {
        createNavRail(makeOptions({ activeId: "overview" }));
        const items = getFocusable();
        items[3].focus();
        items[3].dispatchEvent(new KeyboardEvent("keydown", {
            key: "Home", bubbles: true,
        }));
        expect(document.activeElement).toBe(items[0]);
    });

    test("keyboard_End_FocusesLastItem", () =>
    {
        createNavRail(makeOptions({ activeId: "overview" }));
        const items = getFocusable();
        items[0].focus();
        items[0].dispatchEvent(new KeyboardEvent("keydown", {
            key: "End", bubbles: true,
        }));
        expect(document.activeElement).toBe(items[items.length - 1]);
    });

    test("keyboard_CtrlBacktick_TogglesLeftNavRail", () =>
    {
        const rail = createNavRail(makeOptions({ position: "left" }));
        expect(rail.isCollapsed()).toBe(false);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "`", ctrlKey: true, bubbles: true,
        }));
        expect(rail.isCollapsed()).toBe(true);
    });
});

// ============================================================================
// PERSISTENCE
// ============================================================================

describe("persistence", () =>
{
    test("persistence_PersistsCollapsedState", () =>
    {
        const rail = createNavRail(
            makeOptions({ persistStateKey: "nv-test" })
        );
        rail.collapse();
        expect(localStorage.getItem("nv-test")).toBe("collapsed");
        rail.destroy();
    });

    test("persistence_RestoresCollapsedStateOnInit", () =>
    {
        localStorage.setItem("nv-test", "collapsed");
        const rail = createNavRail(
            makeOptions({ persistStateKey: "nv-test" })
        );
        expect(rail.isCollapsed()).toBe(true);
    });

    test("persistence_NoKey_DoesNotWriteLocalStorage", () =>
    {
        const rail = createNavRail(makeOptions());
        rail.collapse();
        // No persistStateKey → nothing should be written.
        expect(localStorage.length).toBe(0);
        rail.destroy();
    });
});

// ============================================================================
// CSS CUSTOM PROPERTIES
// ============================================================================

describe("CSS custom properties", () =>
{
    test("cssVars_LeftNavRail_SetsLeftWidthVar", () =>
    {
        createNavRail(makeOptions({ position: "left", width: 240 }));
        const val = document.documentElement.style.getPropertyValue(
            "--navrail-left-width"
        );
        expect(val).toBe("240px");
    });

    test("cssVars_CollapsedLeftNavRail_UsesCollapsedWidth", () =>
    {
        createNavRail(makeOptions({
            position: "left", collapsed: true, collapsedWidth: 48,
        }));
        const val = document.documentElement.style.getPropertyValue(
            "--navrail-left-width"
        );
        expect(val).toBe("48px");
    });

    test("cssVars_RightNavRail_SetsRightWidthVar", () =>
    {
        createNavRail(makeOptions({ position: "right", width: 260 }));
        const val = document.documentElement.style.getPropertyValue(
            "--navrail-right-width"
        );
        expect(val).toBe("260px");
    });

    test("cssVars_Destroy_RemovesWidthVar", () =>
    {
        const rail = createNavRail(makeOptions());
        expect(
            document.documentElement.style.getPropertyValue("--navrail-left-width")
        ).toBe("240px");
        rail.destroy();
        expect(
            document.documentElement.style.getPropertyValue("--navrail-left-width")
        ).toBe("");
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("destroy_RemovesRootFromDom", () =>
    {
        const rail = createNavRail(makeOptions());
        expect(container.querySelector(".navrail-container")).not.toBeNull();
        rail.destroy();
        expect(container.querySelector(".navrail-container")).toBeNull();
    });

    test("destroy_DetachesKeyboardListeners", () =>
    {
        const onCollapseToggle = vi.fn();
        const rail = createNavRail(makeOptions({ onCollapseToggle }));
        rail.destroy();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "`", ctrlKey: true, bubbles: true,
        }));
        expect(onCollapseToggle).not.toHaveBeenCalled();
    });
});
