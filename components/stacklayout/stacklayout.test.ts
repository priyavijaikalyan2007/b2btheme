/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: StackLayout
 * Vitest unit tests for the StackLayout collapsible stacked panel component.
 * Covers: factory, panel rendering, collapse/expand, divider presence,
 * setSizes, getPanel, destroy, and accessibility attributes.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createStackLayout } from "./stacklayout";
import type { StackLayoutOptions, StackedPanelConfig, StackLayout } from "./stacklayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeContent(text: string): HTMLElement
{
    const el = document.createElement("div");
    el.textContent = text;
    return el;
}

function makePanels(): StackedPanelConfig[]
{
    return [
        { id: "props", title: "Properties", content: makeContent("Props content") },
        { id: "rels", title: "Relationships", content: makeContent("Rels content") },
    ];
}

function makeOptions(overrides?: Partial<StackLayoutOptions>): StackLayoutOptions
{
    return {
        container,
        panels: makePanels(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "stack-test-container";
    container.style.width = "400px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createStackLayout
// ============================================================================

describe("createStackLayout", () =>
{
    test("CreateStackLayout_ValidOptions_ReturnsStackLayout", () =>
    {
        const layout = createStackLayout(makeOptions());
        expect(layout).toBeDefined();
        expect(layout.getElement).toBeDefined();
        expect(layout.destroy).toBeDefined();
        layout.destroy();
    });

    test("CreateStackLayout_ValidOptions_GetElementReturnsHTMLElement", () =>
    {
        const layout = createStackLayout(makeOptions());
        expect(layout.getElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("CreateStackLayout_ValidOptions_MountsInContainer", () =>
    {
        const layout = createStackLayout(makeOptions());
        const root = layout.getElement();
        expect(container.contains(root)).toBe(true);
        layout.destroy();
    });
});

// ============================================================================
// PANEL RENDERING
// ============================================================================

describe("StackLayout panel rendering", () =>
{
    test("Render_TwoPanels_RendersTwoPanelElements", () =>
    {
        const layout = createStackLayout(makeOptions());
        const panels = container.querySelectorAll(".stacklayout-panel");
        expect(panels.length).toBe(2);
        layout.destroy();
    });

    test("Render_ThreePanels_RendersThreePanelElements", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", content: makeContent("A") },
                { id: "b", title: "B", content: makeContent("B") },
                { id: "c", title: "C", content: makeContent("C") },
            ],
        }));
        const panels = container.querySelectorAll(".stacklayout-panel");
        expect(panels.length).toBe(3);
        layout.destroy();
    });

    test("Render_PanelContent_ContentIsVisible", () =>
    {
        const layout = createStackLayout(makeOptions());
        const content = container.querySelector(".stacklayout-content");
        expect(content?.textContent).toContain("Props content");
        layout.destroy();
    });

    test("Render_PanelHeader_ShowsTitle", () =>
    {
        const layout = createStackLayout(makeOptions());
        const titles = container.querySelectorAll(".stacklayout-title");
        expect(titles[0]?.textContent).toBe("Properties");
        expect(titles[1]?.textContent).toBe("Relationships");
        layout.destroy();
    });

    test("Render_PanelWithIcon_IconElementPresent", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", icon: "bi-gear", content: makeContent("A") },
                { id: "b", title: "B", content: makeContent("B") },
            ],
        }));
        const icons = container.querySelectorAll(".stacklayout-icon");
        expect(icons.length).toBe(1);
        expect(icons[0]?.classList.contains("bi-gear")).toBe(true);
        layout.destroy();
    });

    test("Render_PanelHeader_HasChevron", () =>
    {
        const layout = createStackLayout(makeOptions());
        const chevrons = container.querySelectorAll(".stacklayout-chevron");
        expect(chevrons.length).toBe(2);
        layout.destroy();
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("StackLayout accessibility", () =>
{
    test("Panel_HasRegionRole", () =>
    {
        const layout = createStackLayout(makeOptions());
        const regions = container.querySelectorAll("[role='region']");
        expect(regions.length).toBe(2);
        layout.destroy();
    });

    test("Panel_HasAriaLabel", () =>
    {
        const layout = createStackLayout(makeOptions());
        const regions = container.querySelectorAll("[role='region']");
        expect(regions[0]?.getAttribute("aria-label")).toBe("Properties");
        expect(regions[1]?.getAttribute("aria-label")).toBe("Relationships");
        layout.destroy();
    });

    test("Header_IsFocusable", () =>
    {
        const layout = createStackLayout(makeOptions());
        const headers = container.querySelectorAll(".stacklayout-header");
        expect(headers[0]?.getAttribute("tabindex")).toBe("0");
        layout.destroy();
    });

    test("Header_HasAriaExpanded", () =>
    {
        const layout = createStackLayout(makeOptions());
        const headers = container.querySelectorAll(".stacklayout-header");
        expect(headers[0]?.getAttribute("aria-expanded")).toBe("true");
        layout.destroy();
    });

    test("Divider_HasSeparatorRole", () =>
    {
        const layout = createStackLayout(makeOptions());
        const sep = container.querySelector("[role='separator']");
        expect(sep).not.toBeNull();
        layout.destroy();
    });

    test("Divider_HasAriaOrientation", () =>
    {
        const layout = createStackLayout(makeOptions());
        const sep = container.querySelector("[role='separator']");
        expect(sep?.getAttribute("aria-orientation")).toBe("horizontal");
        layout.destroy();
    });

    test("Divider_IsFocusable", () =>
    {
        const layout = createStackLayout(makeOptions());
        const sep = container.querySelector("[role='separator']");
        expect(sep?.getAttribute("tabindex")).toBe("0");
        layout.destroy();
    });

    test("Header_NonCollapsible_NoTabindex", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", content: makeContent("A"), collapsible: false },
                { id: "b", title: "B", content: makeContent("B") },
            ],
        }));
        const headers = container.querySelectorAll(".stacklayout-header");
        expect(headers[0]?.hasAttribute("tabindex")).toBe(false);
        layout.destroy();
    });
});

// ============================================================================
// DIVIDER PRESENCE
// ============================================================================

describe("StackLayout divider", () =>
{
    test("Render_TwoPanels_RendersOneDivider", () =>
    {
        const layout = createStackLayout(makeOptions());
        const dividers = container.querySelectorAll(".stacklayout-divider");
        expect(dividers.length).toBe(1);
        layout.destroy();
    });

    test("Render_ThreePanels_RendersTwoDividers", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", content: makeContent("A") },
                { id: "b", title: "B", content: makeContent("B") },
                { id: "c", title: "C", content: makeContent("C") },
            ],
        }));
        const dividers = container.querySelectorAll(".stacklayout-divider");
        expect(dividers.length).toBe(2);
        layout.destroy();
    });

    test("Render_ResizableFalse_DividerNotFocusable", () =>
    {
        const layout = createStackLayout(makeOptions({ resizable: false }));
        const sep = container.querySelector(".stacklayout-divider");
        expect(sep?.hasAttribute("tabindex")).toBe(false);
        layout.destroy();
    });
});

// ============================================================================
// COLLAPSE / EXPAND
// ============================================================================

describe("StackLayout collapse and expand", () =>
{
    test("CollapsePanel_ById_PanelIsCollapsed", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.collapsePanel("props");
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });

    test("ExpandPanel_ById_PanelIsExpanded", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "props", title: "Properties", content: makeContent("P"), collapsed: true },
                { id: "rels", title: "Relationships", content: makeContent("R") },
            ],
        }));
        layout.expandPanel("props");
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(false);
        layout.destroy();
    });

    test("CollapsePanel_UpdatesChevron", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.collapsePanel("props");
        const chevron = container.querySelector("[data-panel-id='props'] .stacklayout-chevron");
        expect(chevron?.textContent).toBe("\u25B8");
        layout.destroy();
    });

    test("ExpandPanel_UpdatesChevron", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "props", title: "Properties", content: makeContent("P"), collapsed: true },
                { id: "rels", title: "Relationships", content: makeContent("R") },
            ],
        }));
        layout.expandPanel("props");
        const chevron = container.querySelector("[data-panel-id='props'] .stacklayout-chevron");
        expect(chevron?.textContent).toBe("\u25BE");
        layout.destroy();
    });

    test("CollapsePanel_UpdatesAriaExpanded", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.collapsePanel("props");
        const header = container.querySelector("[data-panel-id='props'] .stacklayout-header");
        expect(header?.getAttribute("aria-expanded")).toBe("false");
        layout.destroy();
    });

    test("CollapsePanel_OnCollapseCallback_Called", () =>
    {
        const onCollapse = vi.fn();
        const layout = createStackLayout(makeOptions({ onCollapse }));
        layout.collapsePanel("props");
        expect(onCollapse).toHaveBeenCalledWith("props", true);
        layout.destroy();
    });

    test("ExpandPanel_OnCollapseCallback_Called", () =>
    {
        const onCollapse = vi.fn();
        const layout = createStackLayout(makeOptions({
            onCollapse,
            panels: [
                { id: "props", title: "Properties", content: makeContent("P"), collapsed: true },
                { id: "rels", title: "Relationships", content: makeContent("R") },
            ],
        }));
        layout.expandPanel("props");
        expect(onCollapse).toHaveBeenCalledWith("props", false);
        layout.destroy();
    });

    test("InitialCollapsed_PanelStartsCollapsed", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "props", title: "Properties", content: makeContent("P"), collapsed: true },
                { id: "rels", title: "Relationships", content: makeContent("R") },
            ],
        }));
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });

    test("HeaderClick_TogglesCollapse", () =>
    {
        const layout = createStackLayout(makeOptions());
        const header = container.querySelector(
            "[data-panel-id='props'] .stacklayout-header"
        ) as HTMLElement;
        header.click();
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });

    test("HeaderEnterKey_TogglesCollapse", () =>
    {
        const layout = createStackLayout(makeOptions());
        const header = container.querySelector(
            "[data-panel-id='props'] .stacklayout-header"
        ) as HTMLElement;
        header.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });

    test("HeaderSpaceKey_TogglesCollapse", () =>
    {
        const layout = createStackLayout(makeOptions());
        const header = container.querySelector(
            "[data-panel-id='props'] .stacklayout-header"
        ) as HTMLElement;
        header.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });
});

// ============================================================================
// GET PANEL
// ============================================================================

describe("StackLayout getPanel", () =>
{
    test("GetPanel_ValidId_ReturnsHandle", () =>
    {
        const layout = createStackLayout(makeOptions());
        const handle = layout.getPanel("props");
        expect(handle).not.toBeNull();
        expect(handle?.setContent).toBeDefined();
        expect(handle?.collapse).toBeDefined();
        expect(handle?.expand).toBeDefined();
        layout.destroy();
    });

    test("GetPanel_InvalidId_ReturnsNull", () =>
    {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const layout = createStackLayout(makeOptions());
        const handle = layout.getPanel("nonexistent");
        expect(handle).toBeNull();
        spy.mockRestore();
        layout.destroy();
    });

    test("GetPanel_SetContent_UpdatesContent", () =>
    {
        const layout = createStackLayout(makeOptions());
        const handle = layout.getPanel("props");
        const newEl = document.createElement("p");
        newEl.textContent = "Updated content";
        handle?.setContent(newEl);
        const content = container.querySelector(
            "[data-panel-id='props'] .stacklayout-content"
        );
        expect(content?.textContent).toContain("Updated content");
        layout.destroy();
    });

    test("GetPanel_Collapse_CollapsesPanel", () =>
    {
        const layout = createStackLayout(makeOptions());
        const handle = layout.getPanel("props");
        handle?.collapse();
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(true);
        layout.destroy();
    });

    test("GetPanel_Expand_ExpandsPanel", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "props", title: "Properties", content: makeContent("P"), collapsed: true },
                { id: "rels", title: "Relationships", content: makeContent("R") },
            ],
        }));
        const handle = layout.getPanel("props");
        handle?.expand();
        const panel = container.querySelector("[data-panel-id='props']");
        expect(panel?.classList.contains("stacklayout-panel-collapsed")).toBe(false);
        layout.destroy();
    });
});

// ============================================================================
// SET SIZES
// ============================================================================

describe("StackLayout setSizes", () =>
{
    test("SetSizes_ValidPercentages_DoesNotThrow", () =>
    {
        const layout = createStackLayout(makeOptions());
        expect(() => layout.setSizes([60, 40])).not.toThrow();
        layout.destroy();
    });

    test("SetSizes_AppliesFlexToExpandedPanels", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.setSizes([70, 30]);
        const panels = container.querySelectorAll(".stacklayout-panel") as NodeListOf<HTMLElement>;
        expect(panels[0].style.flexGrow).toBe("70");
        expect(panels[1].style.flexGrow).toBe("30");
        layout.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("StackLayout destroy", () =>
{
    test("Destroy_RemovesFromDOM", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.destroy();
        expect(container.querySelector(".stacklayout")).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const layout = createStackLayout(makeOptions());
        layout.destroy();
        expect(() => layout.destroy()).not.toThrow();
    });
});

// ============================================================================
// MULTIPLE PANELS
// ============================================================================

describe("StackLayout multiple panels", () =>
{
    test("FourPanels_AllRendered", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", content: makeContent("A") },
                { id: "b", title: "B", content: makeContent("B") },
                { id: "c", title: "C", content: makeContent("C") },
                { id: "d", title: "D", content: makeContent("D") },
            ],
        }));
        const panels = container.querySelectorAll(".stacklayout-panel");
        expect(panels.length).toBe(4);
        const dividers = container.querySelectorAll(".stacklayout-divider");
        expect(dividers.length).toBe(3);
        layout.destroy();
    });

    test("FourPanels_CollapseTwo_RemainingExpand", () =>
    {
        const layout = createStackLayout(makeOptions({
            panels: [
                { id: "a", title: "A", content: makeContent("A") },
                { id: "b", title: "B", content: makeContent("B") },
                { id: "c", title: "C", content: makeContent("C") },
                { id: "d", title: "D", content: makeContent("D") },
            ],
        }));
        layout.collapsePanel("a");
        layout.collapsePanel("c");
        const panelB = container.querySelector("[data-panel-id='b']");
        const panelD = container.querySelector("[data-panel-id='d']");
        expect(panelB?.classList.contains("stacklayout-panel-collapsed")).toBe(false);
        expect(panelD?.classList.contains("stacklayout-panel-collapsed")).toBe(false);
        layout.destroy();
    });
});
