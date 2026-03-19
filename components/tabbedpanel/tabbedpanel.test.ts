/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: TabbedPanel
 * Comprehensive Vitest unit tests for the TabbedPanel component.
 * Covers: factory, options, tab rendering, tab switching, close tab,
 * addTab, removeTab, setActiveTab, ARIA roles, collapse, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    TabbedPanel,
    createTabbedPanel,
} from "./tabbedpanel";
import type
{
    TabbedPanelOptions,
    TabDefinition,
} from "./tabbedpanel";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeTabs(): TabDefinition[]
{
    return [
        { id: "tab-output", title: "Output", icon: "bi-terminal" },
        { id: "tab-errors", title: "Errors", icon: "bi-exclamation-triangle" },
        { id: "tab-debug", title: "Debug", closable: true },
    ];
}

function makeOptions(overrides?: Partial<TabbedPanelOptions>): TabbedPanelOptions
{
    return {
        tabs: makeTabs(),
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
    container.id = "tabbed-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createTabbedPanel
// ============================================================================

describe("createTabbedPanel", () =>
{
    test("createTabbedPanel_ValidOptions_ReturnsTabbedPanelInstance", () =>
    {
        const panel = createTabbedPanel(makeOptions(), container);
        expect(panel).toBeInstanceOf(TabbedPanel);
        panel.destroy();
    });

    test("createTabbedPanel_ValidOptions_IsVisible", () =>
    {
        const panel = createTabbedPanel(makeOptions(), container);
        expect(panel.isVisible()).toBe(true);
        panel.destroy();
    });

    test("createTabbedPanel_ValidOptions_HasRootElement", () =>
    {
        const panel = createTabbedPanel(makeOptions(), container);
        expect(panel.getRootElement()).toBeInstanceOf(HTMLElement);
        panel.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR OPTIONS
// ============================================================================

describe("TabbedPanel constructor options", () =>
{
    test("Constructor_DefaultMode_IsDocked", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        expect(panel.getMode()).toBe("docked");
        panel.destroy();
    });

    test("Constructor_FloatingMode_SetsFloating", () =>
    {
        const panel = new TabbedPanel(makeOptions({ mode: "floating" }));
        expect(panel.getMode()).toBe("floating");
        panel.destroy();
    });

    test("Constructor_BottomDock_SetsBottom", () =>
    {
        const panel = new TabbedPanel(makeOptions({ dockPosition: "bottom" }));
        expect(panel.getDockPosition()).toBe("bottom");
        panel.destroy();
    });

    test("Constructor_WithId_SetsCustomId", () =>
    {
        const panel = new TabbedPanel(makeOptions({ id: "my-panel" }));
        expect(panel.getId()).toBe("my-panel");
        panel.destroy();
    });

    test("Constructor_WithTitle_SetsTitle", () =>
    {
        const panel = new TabbedPanel(makeOptions({ title: "Console" }));
        expect(panel.getTitle()).toBe("Console");
        panel.destroy();
    });
});

// ============================================================================
// TAB RENDERING
// ============================================================================

describe("TabbedPanel tab rendering", () =>
{
    test("Show_ThreeTabs_RendersThreeTabButtons", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const root = panel.getRootElement()!;
        const tabBtns = root.querySelectorAll("[role='tab']");
        expect(tabBtns.length).toBe(3);
        panel.destroy();
    });

    test("Show_FirstTab_IsActiveByDefault", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        expect(panel.getActiveTabId()).toBe("tab-output");
        panel.destroy();
    });

    test("Show_TabCount_ReturnsCorrectCount", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        expect(panel.getTabCount()).toBe(3);
        panel.destroy();
    });
});

// ============================================================================
// TAB SWITCHING
// ============================================================================

describe("TabbedPanel tab switching", () =>
{
    test("SelectTab_SecondTab_ChangesActiveTab", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.selectTab("tab-errors");
        expect(panel.getActiveTabId()).toBe("tab-errors");
        panel.destroy();
    });

    test("SelectTab_SameTab_NoError", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.selectTab("tab-output");
        expect(panel.getActiveTabId()).toBe("tab-output");
        panel.destroy();
    });

    test("OnTabSelect_SwitchTab_FiresCallback", () =>
    {
        const onTabSelect = vi.fn();
        const panel = new TabbedPanel(makeOptions({ onTabSelect }));
        panel.show(container);
        panel.selectTab("tab-errors");
        expect(onTabSelect).toHaveBeenCalledWith("tab-errors", panel);
        panel.destroy();
    });
});

// ============================================================================
// CLOSE TAB
// ============================================================================

describe("TabbedPanel close tab", () =>
{
    test("RemoveTab_ClosableTab_DecreasesTabCount", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.removeTab("tab-debug");
        expect(panel.getTabCount()).toBe(2);
        panel.destroy();
    });

    test("RemoveTab_ActiveTab_SwitchesToAnother", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.selectTab("tab-debug");
        panel.removeTab("tab-debug");
        expect(panel.getActiveTabId()).not.toBe("tab-debug");
        panel.destroy();
    });
});

// ============================================================================
// HANDLE — addTab
// ============================================================================

describe("TabbedPanel addTab", () =>
{
    test("AddTab_NewTab_IncreasesTabCount", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.addTab({ id: "tab-new", title: "New" });
        expect(panel.getTabCount()).toBe(4);
        panel.destroy();
    });

    test("AddTab_WithContent_ContentIsAccessible", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const content = document.createElement("div");
        content.textContent = "New tab content";
        panel.addTab({ id: "tab-new", title: "New", content });
        panel.selectTab("tab-new");
        const panelEl = panel.getTabContentElement("tab-new");
        expect(panelEl?.textContent).toContain("New tab content");
        panel.destroy();
    });
});

// ============================================================================
// HANDLE — removeTab
// ============================================================================

describe("TabbedPanel removeTab", () =>
{
    test("RemoveTab_ValidId_ReducesCount", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const before = panel.getTabCount();
        panel.removeTab("tab-errors");
        expect(panel.getTabCount()).toBe(before - 1);
        panel.destroy();
    });
});

// ============================================================================
// HANDLE — setTabTitle / setTabIcon / setTabDisabled
// ============================================================================

describe("TabbedPanel tab property updates", () =>
{
    test("SetTabTitle_ValidId_UpdatesTitle", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.setTabTitle("tab-output", "Console Output");
        const def = panel.getTabDefinition("tab-output");
        expect(def?.title).toBe("Console Output");
        panel.destroy();
    });

    test("SetTabDisabled_True_DisablesTab", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.setTabDisabled("tab-errors", true);
        const def = panel.getTabDefinition("tab-errors");
        expect(def?.disabled).toBe(true);
        panel.destroy();
    });
});

// ============================================================================
// ARIA ROLES
// ============================================================================

describe("TabbedPanel ARIA", () =>
{
    test("TabBar_HasTablistRole", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const root = panel.getRootElement()!;
        const tablist = root.querySelector("[role='tablist']");
        expect(tablist).not.toBeNull();
        panel.destroy();
    });

    test("TabButtons_HaveTabRole", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const root = panel.getRootElement()!;
        const tabs = root.querySelectorAll("[role='tab']");
        expect(tabs.length).toBe(3);
        panel.destroy();
    });

    test("TabPanels_HaveTabpanelRole", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        const root = panel.getRootElement()!;
        const panels = root.querySelectorAll("[role='tabpanel']");
        expect(panels.length).toBeGreaterThan(0);
        panel.destroy();
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("TabbedPanel collapse", () =>
{
    test("Collapse_WhenExpanded_SetsCollapsed", () =>
    {
        const panel = new TabbedPanel(makeOptions({ collapsible: true }));
        panel.show(container);
        panel.collapse();
        expect(panel.isCollapsed()).toBe(true);
        panel.destroy();
    });

    test("Expand_WhenCollapsed_SetsExpanded", () =>
    {
        const panel = new TabbedPanel(makeOptions({ collapsed: true }));
        panel.show(container);
        panel.expand();
        expect(panel.isCollapsed()).toBe(false);
        panel.destroy();
    });

    test("ToggleCollapse_WhenExpanded_Collapses", () =>
    {
        const panel = new TabbedPanel(makeOptions({ collapsible: true }));
        panel.show(container);
        panel.toggleCollapse();
        expect(panel.isCollapsed()).toBe(true);
        panel.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("TabbedPanel destroy", () =>
{
    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        expect(panel.isVisible()).toBe(true);
        panel.destroy();
        expect(panel.isVisible()).toBe(false);
    });

    test("Destroy_GetRootElement_ReturnsNull", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.destroy();
        expect(panel.getRootElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const panel = new TabbedPanel(makeOptions());
        panel.show(container);
        panel.destroy();
        expect(() => panel.destroy()).not.toThrow();
    });
});
