/**
 * TESTS: Ribbon
 * Vitest unit tests for the Ribbon component.
 * Covers: factory, options, DOM structure, ARIA, tab switching,
 * control state, collapse/expand, backstage, callbacks, and edge cases.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    createRibbon,
} from "./ribbon";
import type
{
    RibbonOptions,
    RibbonTab,
    RibbonGroup,
    RibbonButton,
    Ribbon,
} from "./ribbon";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeButton(overrides?: Partial<RibbonButton>): RibbonButton
{
    return {
        type: "button",
        id: "btn-" + Math.random().toString(36).slice(2, 6),
        label: "Action",
        icon: "bi-circle",
        ...overrides,
    };
}

function makeGroup(overrides?: Partial<RibbonGroup>): RibbonGroup
{
    return {
        id: "grp-" + Math.random().toString(36).slice(2, 6),
        label: "Group",
        controls: [
            makeButton({ id: "btn-bold", label: "Bold" }),
            makeButton({ id: "btn-italic", label: "Italic" }),
        ],
        ...overrides,
    };
}

function makeTab(overrides?: Partial<RibbonTab>): RibbonTab
{
    return {
        id: "tab-" + Math.random().toString(36).slice(2, 6),
        label: "Home",
        groups: [makeGroup()],
        ...overrides,
    };
}

function makeOptions(overrides?: Partial<RibbonOptions>): RibbonOptions
{
    return {
        tabs: [
            makeTab({ id: "home", label: "Home" }),
            makeTab({ id: "insert", label: "Insert" }),
        ],
        activeTabId: "home",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-ribbon";
    document.body.appendChild(container);
});

afterEach(() =>
{
    document.body.innerHTML = "";
});

// ============================================================================
// FACTORY — createRibbon
// ============================================================================

describe("createRibbon", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });

    test("withoutContainerId_ReturnsUnmountedInstance", () =>
    {
        const ribbon = createRibbon(makeOptions());
        expect(container.querySelector(".ribbon")).toBeNull();
        ribbon.destroy();
    });

    test("returnsRibbonHandle", () =>
    {
        const ribbon = createRibbon(makeOptions());
        expect(typeof ribbon.show).toBe("function");
        expect(typeof ribbon.setActiveTab).toBe("function");
        ribbon.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("rootElement_HasRibbonClass", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });

    test("rendersTabButtons", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const tabs = container.querySelectorAll("[role='tab']");
        expect(tabs.length).toBe(2);
        ribbon.destroy();
    });

    test("rendersGroupLabels", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(container.textContent).toContain("Group");
        ribbon.destroy();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("tabListHasTablistRole", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const tablist = container.querySelector("[role='tablist']");
        expect(tablist).not.toBeNull();
        ribbon.destroy();
    });

    test("activeTabHasAriaSelected", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const activeTab = container.querySelector(
            "[role='tab'][aria-selected='true']"
        );
        expect(activeTab).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// TAB SWITCHING
// ============================================================================

describe("tab switching", () =>
{
    test("setActiveTab_SwitchesPanel", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.setActiveTab("insert");
        expect(ribbon.getActiveTab()).toBe("insert");
        ribbon.destroy();
    });

    test("getActiveTab_ReturnsCurrentTab", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(ribbon.getActiveTab()).toBe("home");
        ribbon.destroy();
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("collapse and expand", () =>
{
    test("collapse_SetsCollapsedState", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        expect(ribbon.isCollapsed()).toBe(true);
        ribbon.destroy();
    });

    test("expand_SetsExpandedState", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        ribbon.expand();
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });

    test("toggleCollapse_TogglesState", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        const initial = ribbon.isCollapsed();
        ribbon.toggleCollapse();
        expect(ribbon.isCollapsed()).toBe(!initial);
        ribbon.destroy();
    });
});

// ============================================================================
// CONTROL STATE
// ============================================================================

describe("control state", () =>
{
    test("setControlDisabled_DisablesControl", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "ctl-1" })],
                })],
            })],
        }), "test-ribbon");
        ribbon.setControlDisabled("ctl-1", true);
        const state = ribbon.getControlState("ctl-1");
        expect(state?.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("callbacks", () =>
{
    test("onTabChange_FiresOnTabSwitch", () =>
    {
        const onTabChange = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ onTabChange }), "test-ribbon"
        );
        ribbon.setActiveTab("insert");
        expect(onTabChange).toHaveBeenCalledWith("insert");
        ribbon.destroy();
    });

    test("onCollapse_FiresOnCollapseToggle", () =>
    {
        const onCollapse = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ collapsible: true, onCollapse }), "test-ribbon"
        );
        ribbon.collapse();
        expect(onCollapse).toHaveBeenCalledWith(true);
        ribbon.destroy();
    });
});

// ============================================================================
// LIFECYCLE
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsIntoContainer", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show("test-ribbon");
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });

    test("destroy_RemovesDOMElements", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.destroy();
        expect(container.querySelector(".ribbon")).toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyTabs_RendersWithoutCrash", () =>
    {
        expect(() =>
        {
            const ribbon = createRibbon(
                makeOptions({ tabs: [] }), "test-ribbon"
            );
            ribbon.destroy();
        }).not.toThrow();
    });

    test("setActiveTab_InvalidId_DoesNotCrash", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(() => ribbon.setActiveTab("nonexistent")).not.toThrow();
        ribbon.destroy();
    });
});
