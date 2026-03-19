/**
 * ⚓ TESTS: Sidebar
 * Comprehensive Vitest unit tests for the Sidebar component.
 * Covers: factory, options, rendering, collapse/expand, mode switching,
 * title/icon updates, content element, contained mode, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Sidebar,
    createSidebar,
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
        const sb = new Sidebar(makeOptions());
        sb.show(container);
        sb.destroy();
        expect(() => sb.destroy()).not.toThrow();
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
