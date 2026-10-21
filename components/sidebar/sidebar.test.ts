/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Sidebar
 * Comprehensive Vitest unit tests for the Sidebar component.
 * Covers: factory, options, rendering, collapse/expand, mode switching,
 * title/icon updates, content element, contained mode, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { destroyProbe } from "../../tests/destroy-probe";
import
{
    Sidebar,
    createSidebar,
    createDockedSidebar,
} from "./sidebar";
import type { SidebarOptions } from "./sidebar";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(overrides?: Partial<SidebarOptions>): SidebarOptions
{
    return {
        title: "Navigator",
        icon: "bi-folder",
        contained: true,
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "sidebar-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createSidebar
// ============================================================================

describe("createSidebar", () =>
{
    test("createSidebar_ValidOptions_ReturnsSidebarInstance", () =>
    {
        const sb = createSidebar(makeOptions());
        expect(sb).toBeInstanceOf(Sidebar);
        sb.destroy();
    });

    test("createSidebar_ValidOptions_IsVisible", () =>
    {
        const sb = createSidebar(makeOptions());
        expect(sb.isVisible()).toBe(true);
        sb.destroy();
    });

    // PAT-1b. Three studio demos built their chrome with
    // `new Sidebar(...)` followed by `show(studioBody)`, and this factory
    // could not replace that call because it showed into document.body
    // and `show()` returns early once visible. The later `show(el)` then
    // logged "Already visible" and left the sidebar in the wrong parent.
    // `isVisible()` is true in both the right and the wrong case, so each
    // test below reads the PARENT instead.
    test("createSidebar_WithElement_MountsIntoThatElement", () =>
    {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const sb = createSidebar(makeOptions(), host);
        expect(sb.getRootElement()?.parentElement).toBe(host);

        sb.destroy();
        host.remove();
    });

    test("createSidebar_WithElementId_MountsIntoThatElement", () =>
    {
        const host = document.createElement("div");
        host.id = "sidebar-host";
        document.body.appendChild(host);

        const sb = createSidebar(makeOptions(), "sidebar-host");
        expect(sb.getRootElement()?.parentElement).toBe(host);

        sb.destroy();
        host.remove();
    });

    test("createSidebar_NoContainer_MountsIntoBody", () =>
    {
        const sb = createSidebar(makeOptions());
        expect(sb.getRootElement()?.parentElement).toBe(document.body);
        sb.destroy();
    });

    test("createSidebar_UnknownElementId_Throws", () =>
    {
        expect(() => createSidebar(makeOptions(), "no-such-host"))
            .toThrow(/was not\s+found/);
    });

    test("createDockedSidebar_WithElement_ForwardsTheContainer", () =>
    {
        const host = document.createElement("div");
        document.body.appendChild(host);

        const sb = createDockedSidebar(makeOptions(), host);
        expect(sb.getRootElement()?.parentElement).toBe(host);

        sb.destroy();
        host.remove();
    });
});

// ============================================================================
// CONSTRUCTOR OPTIONS
// ============================================================================

describe("Sidebar constructor options", () =>
{
    test("Constructor_DefaultMode_IsDocked", () =>
    {
        const sb = new Sidebar(makeOptions());
        expect(sb.getMode()).toBe("docked");
        sb.destroy();
    });

    test("Constructor_DefaultDockPosition_IsLeft", () =>
    {
        const sb = new Sidebar(makeOptions());
        expect(sb.getDockPosition()).toBe("left");
        sb.destroy();
    });

    test("Constructor_CustomWidth_SetsWidth", () =>
    {
        const sb = new Sidebar(makeOptions({ width: 350 }));
        expect(sb.getWidth()).toBe(350);
        sb.destroy();
    });

    test("Constructor_WithId_SetsCustomId", () =>
    {
        const sb = new Sidebar(makeOptions({ id: "my-sidebar" }));
        expect(sb.getId()).toBe("my-sidebar");
        sb.destroy();
    });

    test("Constructor_RightDockPosition_SetsRight", () =>
    {
        const sb = new Sidebar(makeOptions({ dockPosition: "right" }));
        expect(sb.getDockPosition()).toBe("right");
        sb.destroy();
    });
});

// ============================================================================
// RENDERING
// ============================================================================

describe("Sidebar rendering", () =>
{
    test("Show_ValidOptions_AppendsToDOMContainer", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        expect(container.querySelector(".sidebar-container")).not.toBeNull();
        sb.destroy();
    });

    test("Show_WithTitle_RendersTitleText", () =>
    {
        const sb = new Sidebar(makeOptions({ title: "My Panel" }));
        sb.show(container);
        expect(sb.getTitle()).toBe("My Panel");
        sb.destroy();
    });

    test("Show_WithIcon_RendersIconElement", () =>
    {
        const sb = new Sidebar(makeOptions({ icon: "bi-folder" }));
        sb.show(container);
        expect(sb.getIcon()).toBe("bi-folder");
        sb.destroy();
    });

    test("Show_CallGetRootElement_ReturnsHTMLElement", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        expect(sb.getRootElement()).toBeInstanceOf(HTMLElement);
        sb.destroy();
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("Sidebar collapse/expand", () =>
{
    test("Collapse_WhenExpanded_SetsCollapsedTrue", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.collapse();
        expect(sb.isCollapsed()).toBe(true);
        sb.destroy();
    });

    test("Expand_WhenCollapsed_SetsCollapsedFalse", () =>
    {
        const sb = new Sidebar(makeOptions({ collapsed: true }));
        sb.show(container);
        expect(sb.isCollapsed()).toBe(true);
        sb.expand();
        expect(sb.isCollapsed()).toBe(false);
        sb.destroy();
    });

    test("ToggleCollapse_WhenExpanded_Collapses", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.toggleCollapse();
        expect(sb.isCollapsed()).toBe(true);
        sb.destroy();
    });

    test("ToggleCollapse_WhenCollapsed_Expands", () =>
    {
        const sb = new Sidebar(makeOptions({ collapsed: true }));
        sb.show(container);
        sb.toggleCollapse();
        expect(sb.isCollapsed()).toBe(false);
        sb.destroy();
    });

    test("Constructor_CollapsedTrue_StartsCollapsed", () =>
    {
        const sb = new Sidebar(makeOptions({ collapsed: true }));
        expect(sb.isCollapsed()).toBe(true);
        sb.destroy();
    });

    test("OnCollapseToggle_Collapse_FiresCallback", () =>
    {
        const onCollapseToggle = vi.fn();
        const sb = new Sidebar(makeOptions({ onCollapseToggle }));
        sb.show(container);
        sb.collapse();
        expect(onCollapseToggle).toHaveBeenCalledWith(true, sb);
        sb.destroy();
    });
});

// ============================================================================
// TITLE AND ICON UPDATES
// ============================================================================

describe("Sidebar title and icon", () =>
{
    test("SetTitle_NewTitle_UpdatesTitleInDOM", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.setTitle("Updated Title");
        const titleEl = sb.getRootElement()?.querySelector(".sidebar-titlebar-text");
        expect(titleEl?.textContent).toBe("Updated Title");
        sb.destroy();
    });

    test("SetIcon_NewIcon_UpdatesIconInDOM", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.setIcon("bi-gear");
        const iconEl = sb.getRootElement()?.querySelector(".sidebar-titlebar-icon");
        expect(iconEl?.classList.contains("bi-gear")).toBe(true);
        sb.destroy();
    });
});

// ============================================================================
// CONTENT ELEMENT
// ============================================================================

describe("Sidebar content element", () =>
{
    test("GetContentElement_AfterShow_ReturnsHTMLElement", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        expect(sb.getContentElement()).toBeInstanceOf(HTMLElement);
        sb.destroy();
    });

    test("GetContentElement_AppendChild_InsertsContent", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        const child = document.createElement("p");
        child.textContent = "Hello content";
        sb.getContentElement()!.appendChild(child);
        expect(sb.getContentElement()!.textContent).toContain("Hello content");
        sb.destroy();
    });
});

// ============================================================================
// WIDTH AND HEIGHT
// ============================================================================

describe("Sidebar width and height", () =>
{
    test("SetWidth_NewValue_UpdatesWidth", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.setWidth(400);
        expect(sb.getWidth()).toBe(400);
        sb.destroy();
    });

    test("SetHeight_NewValue_UpdatesHeight", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.setHeight(500);
        expect(sb.getHeight()).toBe(500);
        sb.destroy();
    });
});

// ============================================================================
// CONTAINED MODE
// ============================================================================

describe("Sidebar contained mode", () =>
{
    test("SetContained_True_SetsContainedState", () =>
    {
        const sb = new Sidebar(makeOptions({ contained: false }));
        sb.show(container);
        sb.setContained(true);
        expect(sb.isContained()).toBe(true);
        sb.destroy();
    });

    test("Constructor_ContainedTrue_StartsContained", () =>
    {
        const sb = new Sidebar(makeOptions({ contained: true }));
        expect(sb.isContained()).toBe(true);
        sb.destroy();
    });
});

// ============================================================================
// BUTTON VISIBILITY — draggable / closable
// ============================================================================

describe("Sidebar button visibility", () =>
{
    test("DraggableTrue_Default_RendersFloatButton", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        const floatBtn = sb.getRootElement()?.querySelector(".sidebar-float-btn");
        expect(floatBtn).not.toBeNull();
        sb.destroy();
    });

    test("DraggableFalse_HidesFloatButton", () =>
    {
        const sb = new Sidebar(makeOptions({ draggable: false }));
        sb.show(container);
        const floatBtn = sb.getRootElement()?.querySelector(".sidebar-float-btn");
        expect(floatBtn).toBeNull();
        sb.destroy();
    });

    test("ClosableTrue_Default_RendersCloseButton", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        const closeBtn = sb.getRootElement()?.querySelector(".sidebar-close-btn");
        expect(closeBtn).not.toBeNull();
        sb.destroy();
    });

    test("ClosableFalse_HidesCloseButton", () =>
    {
        const sb = new Sidebar(makeOptions({ closable: false }));
        sb.show(container);
        const closeBtn = sb.getRootElement()?.querySelector(".sidebar-close-btn");
        expect(closeBtn).toBeNull();
        sb.destroy();
    });

    test("CollapsibleFalse_HidesCollapseButton", () =>
    {
        const sb = new Sidebar(makeOptions({ collapsible: false }));
        sb.show(container);
        const collapseBtn = sb.getRootElement()?.querySelector(
            ".sidebar-collapse-btn"
        );
        expect(collapseBtn).toBeNull();
        sb.destroy();
    });

    test("AllButtonsDisabled_OnlyTitleBarTextRendered", () =>
    {
        const sb = new Sidebar(makeOptions({
            draggable: false,
            closable: false,
            collapsible: false,
        }));
        sb.show(container);
        const actions = sb.getRootElement()?.querySelector(
            ".sidebar-titlebar-actions"
        );
        expect(actions?.children.length).toBe(0);
        sb.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("Sidebar destroy", () =>
{
    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        expect(sb.isVisible()).toBe(true);
        sb.destroy();
        expect(sb.isVisible()).toBe(false);
    });

    test("Destroy_AfterShow_GetRootElementReturnsNull", () =>
    {
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.destroy();
        expect(sb.getRootElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const onBeforeClose = vi.fn(() => true);
        const onClose = vi.fn();
        const sb = new Sidebar(makeOptions({ onBeforeClose, onClose }));
        sb.show(container);
        const probe = destroyProbe();

        sb.destroy();
        const first = probe.total();
        sb.destroy();

        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onBeforeClose).toHaveBeenCalledTimes(1);
        expect(first).toBeGreaterThan(0);
        expect(probe.total()).toBe(first);
        probe.restore();
    });

    test("Destroy_WithOnClose_FiresCallback", () =>
    {
        const onClose = vi.fn();
        const sb = new Sidebar(makeOptions({ onClose }));
        sb.show(container);
        sb.destroy();
        expect(onClose).toHaveBeenCalledWith(sb);
    });
});
