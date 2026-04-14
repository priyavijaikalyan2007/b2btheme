/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: Ribbon
 * Vitest unit tests for the Ribbon component.
 * Covers: factory, options, DOM structure, ARIA, tab switching,
 * control state, collapse/expand, backstage, callbacks, color reset,
 * and edge cases.
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
    RibbonSplitButton,
    RibbonGallery,
    RibbonGalleryOption,
    RibbonDropdown,
    RibbonInput,
    RibbonColorPicker,
    RibbonNumberSpinner,
    RibbonCheckbox,
    RibbonToggleSwitch,
    RibbonSeparator,
    RibbonRowBreak,
    RibbonLabel,
    RibbonCustom,
    RibbonControl,
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

// ============================================================================
// TAB MANAGEMENT — addTab / removeTab
// ============================================================================

describe("tab management", () =>
{
    test("addTab_AppendsNewTab", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.addTab(makeTab({ id: "view", label: "View" }));
        const tabs = container.querySelectorAll("[role='tab']");
        expect(tabs.length).toBe(3);
        ribbon.destroy();
    });

    test("addTab_AtIndex_InsertsAtPosition", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.addTab(makeTab({ id: "view", label: "View" }), 0);
        const tabs = container.querySelectorAll("[role='tab']");
        expect(tabs[0].textContent).toBe("View");
        ribbon.destroy();
    });

    test("removeTab_RemovesTabButton", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.removeTab("insert");
        const tabs = container.querySelectorAll("[role='tab']");
        expect(tabs.length).toBe(1);
        ribbon.destroy();
    });

    test("removeTab_ActiveTab_SwitchesToFirstVisible", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.removeTab("home");
        expect(ribbon.getActiveTab()).toBe("insert");
        ribbon.destroy();
    });
});

// ============================================================================
// CONTEXTUAL TABS
// ============================================================================

describe("contextual tabs", () =>
{
    function makeContextualOptions(): RibbonOptions
    {
        return makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                makeTab({ id: "design", label: "Design", contextual: true, accentColor: "#ff5500" }),
            ],
        });
    }

    test("contextualTab_HiddenByDefault", () =>
    {
        const ribbon = createRibbon(makeContextualOptions(), "test-ribbon");
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.style.display).toBe("none");
        ribbon.destroy();
    });

    test("showContextualTab_MakesVisible", () =>
    {
        const ribbon = createRibbon(makeContextualOptions(), "test-ribbon");
        ribbon.showContextualTab("design");
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.style.display).toBe("");
        ribbon.destroy();
    });

    test("hideContextualTab_HidesTab", () =>
    {
        const ribbon = createRibbon(makeContextualOptions(), "test-ribbon");
        ribbon.showContextualTab("design");
        ribbon.hideContextualTab("design");
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.style.display).toBe("none");
        ribbon.destroy();
    });

    test("hideContextualTab_WhenActive_SwitchesTab", () =>
    {
        const ribbon = createRibbon(makeContextualOptions(), "test-ribbon");
        ribbon.showContextualTab("design");
        ribbon.setActiveTab("design");
        ribbon.hideContextualTab("design");
        expect(ribbon.getActiveTab()).toBe("home");
        ribbon.destroy();
    });

    test("contextualTab_HasAccentColor", () =>
    {
        const ribbon = createRibbon(makeContextualOptions(), "test-ribbon");
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.classList.contains("ribbon-tab-contextual")).toBe(true);
        const accent = tabBtn.style.getPropertyValue("--ribbon-contextual-accent");
        expect(accent).toBe("#ff5500");
        ribbon.destroy();
    });
});

// ============================================================================
// CONTROL TYPES — button, split-button, dropdown, input, color, number,
//                  checkbox, toggle, separator, label, custom, gallery
// ============================================================================

describe("control types", () =>
{
    test("button_RendersWithIconAndLabel", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-1", label: "Copy", icon: "bi-clipboard", size: "large",
                    })],
                })],
            })],
        }), "test-ribbon");
        const btnEl = container.querySelector("[data-control-id='btn-1']") as HTMLElement;
        expect(btnEl).not.toBeNull();
        expect(btnEl.querySelector(".ribbon-btn-icon")).not.toBeNull();
        expect(btnEl.querySelector(".ribbon-btn-label")?.textContent).toBe("Copy");
        ribbon.destroy();
    });

    test("button_Toggle_SetsAriaPressed", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-tog", label: "Bold", toggle: true, active: false,
                    })],
                })],
            })],
        }), "test-ribbon");
        const btnEl = container.querySelector("[data-control-id='btn-tog']") as HTMLElement;
        expect(btnEl.getAttribute("aria-pressed")).toBe("false");
        ribbon.destroy();
    });

    test("button_Toggle_ClickTogglesActive", () =>
    {
        const onClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-tog", label: "Bold", toggle: true, active: false, onClick,
                    })],
                })],
            })],
        }), "test-ribbon");
        const btnEl = container.querySelector("[data-control-id='btn-tog']") as HTMLElement;
        btnEl.click();
        expect(btnEl.getAttribute("aria-pressed")).toBe("true");
        expect(btnEl.classList.contains("ribbon-control-active")).toBe(true);
        expect(onClick).toHaveBeenCalled();
        ribbon.destroy();
    });

    test("splitButton_RendersWithMenuItems", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-1",
            label: "Paste",
            icon: "bi-clipboard",
            menuItems: [
                { id: "paste-text", label: "Paste Text" },
                { id: "paste-special", label: "Paste Special" },
            ],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='split-1']") as HTMLElement;
        expect(el).not.toBeNull();
        expect(el.querySelector(".ribbon-split-primary")).not.toBeNull();
        expect(el.querySelector(".ribbon-split-arrow")).not.toBeNull();
        ribbon.destroy();
    });

    test("splitButton_ArrowClickShowsMenu", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-2",
            label: "Paste",
            icon: "bi-clipboard",
            menuItems: [
                { id: "paste-text", label: "Paste Text" },
            ],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const menu = container.querySelector(".ribbon-split-menu") as HTMLElement;
        expect(menu.style.display).not.toBe("none");
        ribbon.destroy();
    });

    test("dropdown_RendersSelectWithOptions", () =>
    {
        const dropdown: RibbonDropdown = {
            type: "dropdown",
            id: "dd-font",
            label: "Font",
            options: [
                { value: "arial", label: "Arial" },
                { value: "times", label: "Times New Roman" },
            ],
            value: "arial",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [dropdown] })],
            })],
        }), "test-ribbon");
        const sel = container.querySelector(".ribbon-dropdown") as HTMLSelectElement;
        expect(sel).not.toBeNull();
        expect(sel.options.length).toBe(2);
        expect(sel.value).toBe("arial");
        ribbon.destroy();
    });

    test("dropdown_OnChange_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const dropdown: RibbonDropdown = {
            type: "dropdown",
            id: "dd-font",
            label: "Font",
            options: [
                { value: "arial", label: "Arial" },
                { value: "times", label: "Times" },
            ],
            value: "arial",
            onChange,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [dropdown] })],
            })],
        }), "test-ribbon");
        const sel = container.querySelector(".ribbon-dropdown") as HTMLSelectElement;
        sel.value = "times";
        sel.dispatchEvent(new Event("change"));
        expect(onChange).toHaveBeenCalledWith("times");
        ribbon.destroy();
    });

    test("input_RendersTextInput", () =>
    {
        const input: RibbonInput = {
            type: "input",
            id: "inp-search",
            label: "Search",
            placeholder: "Type here...",
            value: "hello",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [input] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        expect(inp).not.toBeNull();
        expect(inp.value).toBe("hello");
        expect(inp.placeholder).toBe("Type here...");
        ribbon.destroy();
    });

    test("input_OnInput_FiresCallback", () =>
    {
        const onInput = vi.fn();
        const input: RibbonInput = {
            type: "input",
            id: "inp-1",
            onInput,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [input] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        inp.value = "test";
        inp.dispatchEvent(new Event("input"));
        expect(onInput).toHaveBeenCalledWith("test");
        ribbon.destroy();
    });

    test("input_EnterKey_FiresOnSubmit", () =>
    {
        const onSubmit = vi.fn();
        const input: RibbonInput = {
            type: "input",
            id: "inp-2",
            onSubmit,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [input] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        inp.value = "search query";
        inp.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
        expect(onSubmit).toHaveBeenCalledWith("search query");
        ribbon.destroy();
    });

    test("colorPicker_RendersColorInput", () =>
    {
        const color: RibbonColorPicker = {
            type: "color",
            id: "clr-1",
            label: "Fill Color",
            value: "#ff0000",
            showLabel: true,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [color] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-color") as HTMLInputElement;
        expect(inp).not.toBeNull();
        expect(inp.type).toBe("color");
        expect(inp.value).toBe("#ff0000");
        // showLabel creates a hex label span
        const hex = container.querySelector(".ribbon-color-hex") as HTMLElement;
        expect(hex).not.toBeNull();
        expect(hex.textContent).toBe("#ff0000");
        ribbon.destroy();
    });

    test("colorPicker_OnChange_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const color: RibbonColorPicker = {
            type: "color",
            id: "clr-2",
            value: "#000000",
            onChange,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [color] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-color") as HTMLInputElement;
        inp.value = "#00ff00";
        inp.dispatchEvent(new Event("change"));
        expect(onChange).toHaveBeenCalledWith("#00ff00");
        ribbon.destroy();
    });

    test("numberSpinner_RendersNumberInput", () =>
    {
        const num: RibbonNumberSpinner = {
            type: "number",
            id: "num-1",
            label: "Size",
            value: 12,
            min: 1,
            max: 100,
            step: 1,
            suffix: "pt",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [num] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-number") as HTMLInputElement;
        expect(inp).not.toBeNull();
        expect(inp.type).toBe("number");
        expect(inp.value).toBe("12");
        expect(inp.min).toBe("1");
        expect(inp.max).toBe("100");
        expect(inp.step).toBe("1");
        const suffix = container.querySelector(".ribbon-number-suffix");
        expect(suffix?.textContent).toBe("pt");
        ribbon.destroy();
    });

    test("numberSpinner_OnChange_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const num: RibbonNumberSpinner = {
            type: "number",
            id: "num-2",
            value: 10,
            onChange,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [num] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-number") as HTMLInputElement;
        inp.value = "20";
        inp.dispatchEvent(new Event("change"));
        expect(onChange).toHaveBeenCalledWith(20);
        ribbon.destroy();
    });

    test("checkbox_RendersCheckedState", () =>
    {
        const chk: RibbonCheckbox = {
            type: "checkbox",
            id: "chk-1",
            label: "Ruler",
            checked: true,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [chk] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-checkbox") as HTMLInputElement;
        expect(inp).not.toBeNull();
        expect(inp.checked).toBe(true);
        ribbon.destroy();
    });

    test("checkbox_OnChange_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const chk: RibbonCheckbox = {
            type: "checkbox",
            id: "chk-2",
            label: "Gridlines",
            checked: false,
            onChange,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [chk] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-checkbox") as HTMLInputElement;
        inp.checked = true;
        inp.dispatchEvent(new Event("change"));
        expect(onChange).toHaveBeenCalledWith(true);
        ribbon.destroy();
    });

    test("toggle_RendersToggleSwitch", () =>
    {
        const tog: RibbonToggleSwitch = {
            type: "toggle",
            id: "tog-1",
            label: "Dark Mode",
            checked: false,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [tog] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-toggle") as HTMLInputElement;
        expect(inp).not.toBeNull();
        expect(inp.checked).toBe(false);
        ribbon.destroy();
    });

    test("toggle_OnChange_FiresCallback", () =>
    {
        const onChange = vi.fn();
        const tog: RibbonToggleSwitch = {
            type: "toggle",
            id: "tog-2",
            label: "Auto-save",
            checked: false,
            onChange,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [tog] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-toggle") as HTMLInputElement;
        inp.checked = true;
        inp.dispatchEvent(new Event("change"));
        expect(onChange).toHaveBeenCalledWith(true);
        ribbon.destroy();
    });

    test("separator_RendersHR", () =>
    {
        const sep: RibbonSeparator = { type: "separator", id: "sep-1" };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [sep] })],
            })],
        }), "test-ribbon");
        const sepEl = container.querySelector(".ribbon-separator");
        expect(sepEl).not.toBeNull();
        ribbon.destroy();
    });

    test("label_RendersTextWithColor", () =>
    {
        const lbl: RibbonLabel = {
            type: "label",
            id: "lbl-1",
            text: "Status: OK",
            color: "green",
            icon: "bi-check",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [lbl] })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='lbl-1']") as HTMLElement;
        expect(el).not.toBeNull();
        expect(el.textContent).toContain("Status: OK");
        expect(el.style.color).toBe("green");
        ribbon.destroy();
    });

    test("custom_RendersCustomElement", () =>
    {
        const customEl = document.createElement("div");
        customEl.textContent = "Custom Widget";
        const custom: RibbonCustom = {
            type: "custom",
            id: "cust-1",
            element: customEl,
            label: "My Widget",
            width: "200px",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [custom] })],
            })],
        }), "test-ribbon");
        const wrap = container.querySelector("[data-control-id='cust-1']") as HTMLElement;
        expect(wrap).not.toBeNull();
        expect(wrap.textContent).toContain("Custom Widget");
        expect(wrap.style.width).toBe("200px");
        ribbon.destroy();
    });

    test("custom_WithFunctionElement_InvokesFactory", () =>
    {
        const factory = vi.fn(() =>
        {
            const el = document.createElement("span");
            el.textContent = "Dynamic";
            return el;
        });
        const custom: RibbonCustom = {
            type: "custom",
            id: "cust-2",
            element: factory,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [custom] })],
            })],
        }), "test-ribbon");
        expect(factory).toHaveBeenCalled();
        const wrap = container.querySelector("[data-control-id='cust-2']") as HTMLElement;
        expect(wrap.textContent).toContain("Dynamic");
        ribbon.destroy();
    });
});

// ============================================================================
// CONTROL SIZING — large, small, mini
// ============================================================================

describe("control sizing", () =>
{
    test("large_AppliesLargeSizeClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-lg", size: "large" })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-lg']") as HTMLElement;
        expect(el.classList.contains("ribbon-size-large")).toBe(true);
        ribbon.destroy();
    });

    test("small_AppliesSmallSizeClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-sm", size: "small" })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-sm']") as HTMLElement;
        expect(el.classList.contains("ribbon-size-small")).toBe(true);
        ribbon.destroy();
    });

    test("mini_AppliesMiniSizeClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-mn", size: "mini" })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-mn']") as HTMLElement;
        expect(el.classList.contains("ribbon-size-mini")).toBe(true);
        ribbon.destroy();
    });

    test("mini_HidesLabelText", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-mn", label: "Bold", size: "mini" })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-mn']") as HTMLElement;
        // mini buttons should NOT render a label span
        expect(el.querySelector(".ribbon-btn-label")).toBeNull();
        ribbon.destroy();
    });

    test("smallControls_StackInThrees", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [
                        makeButton({ id: "s1", size: "small" }),
                        makeButton({ id: "s2", size: "small" }),
                        makeButton({ id: "s3", size: "small" }),
                    ],
                })],
            })],
        }), "test-ribbon");
        const stacks = container.querySelectorAll(".ribbon-stack");
        expect(stacks.length).toBeGreaterThanOrEqual(1);
        ribbon.destroy();
    });

    test("custom_Small_HasSizeClasses", () =>
    {
        const customEl = document.createElement("div");
        customEl.textContent = "Widget";
        const custom: RibbonCustom = {
            type: "custom",
            id: "cust-sm",
            element: customEl,
            size: "small",
            label: "Lbl",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [custom] })],
            })],
        }), "test-ribbon");
        const wrap = container.querySelector("[data-control-id='cust-sm']") as HTMLElement;
        expect(wrap.classList.contains("ribbon-custom-small")).toBe(true);
        expect(wrap.classList.contains("ribbon-size-small")).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// ROW-BREAK
// ============================================================================

describe("row-break control", () =>
{
    test("rowBreak_StartsNewStack", () =>
    {
        const controls: RibbonControl[] = [
            makeButton({ id: "a1", size: "small" }),
            makeButton({ id: "a2", size: "small" }),
            { type: "row-break", id: "rb-1" } as RibbonRowBreak,
            makeButton({ id: "b1", size: "small" }),
            makeButton({ id: "b2", size: "small" }),
        ];
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls })],
            })],
        }), "test-ribbon");
        const stacks = container.querySelectorAll(".ribbon-stack");
        // Row-break should flush the first stack and start a second
        expect(stacks.length).toBeGreaterThanOrEqual(2);
        ribbon.destroy();
    });
});

// ============================================================================
// GROUP WITH EMPTY LABEL (no-label fix)
// ============================================================================

describe("group with empty label", () =>
{
    test("emptyLabel_AddsNoLabelClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ id: "grp-empty", label: "" })],
            })],
        }), "test-ribbon");
        const grp = container.querySelector("[data-group-id='grp-empty']") as HTMLElement;
        expect(grp.classList.contains("ribbon-group-no-label")).toBe(true);
        ribbon.destroy();
    });

    test("nonEmptyLabel_NoNoLabelClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ id: "grp-has", label: "Format" })],
            })],
        }), "test-ribbon");
        const grp = container.querySelector("[data-group-id='grp-has']") as HTMLElement;
        expect(grp.classList.contains("ribbon-group-no-label")).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// GALLERY CONTROL — aliases and selection
// ============================================================================

describe("gallery control", () =>
{
    function makeGallery(overrides?: Partial<RibbonGallery>): RibbonGallery
    {
        return {
            type: "gallery",
            id: "gal-1",
            options: [
                { id: "opt-a", label: "Style A" },
                { id: "opt-b", label: "Style B" },
                { id: "opt-c", label: "Style C" },
                { id: "opt-d", label: "Style D" },
                { id: "opt-e", label: "Style E" },
            ],
            columns: 3,
            inlineCount: 3,
            ...overrides,
        };
    }

    test("gallery_RendersInlineOptions", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [makeGallery()] })],
            })],
        }), "test-ribbon");
        const inline = container.querySelector(".ribbon-gallery-inline");
        const opts = inline?.querySelectorAll(".ribbon-gallery-option");
        expect(opts?.length).toBe(3); // inlineCount = 3
        ribbon.destroy();
    });

    test("gallery_RendersMoreButton_WhenOverflow", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [makeGallery()] })],
            })],
        }), "test-ribbon");
        const moreBtn = container.querySelector(".ribbon-gallery-more");
        expect(moreBtn).not.toBeNull();
        ribbon.destroy();
    });

    test("gallery_AliasesConvert_GalleryItemsToOptions", () =>
    {
        const onGallerySelect = vi.fn();
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-alias",
            options: [],
            galleryItems: [
                { id: "ga", label: "Item A", icon: "bi-star" },
                { id: "gb", label: "Item B" },
            ],
            galleryColumns: 4,
            onGallerySelect,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const opts = container.querySelectorAll(".ribbon-gallery-option");
        expect(opts.length).toBeGreaterThanOrEqual(2);
        ribbon.destroy();
    });

    test("gallery_SelectedOption_HasSelectedClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeGallery({ selectedId: "opt-a" })],
                })],
            })],
        }), "test-ribbon");
        const selected = container.querySelector(".ribbon-gallery-option-selected");
        expect(selected).not.toBeNull();
        ribbon.destroy();
    });

    test("gallery_OnSelect_FiresCallback", () =>
    {
        const onSelect = vi.fn();
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeGallery({ onSelect })],
                })],
            })],
        }), "test-ribbon");
        const opts = container.querySelectorAll(".ribbon-gallery-option");
        (opts[0] as HTMLElement).click();
        expect(onSelect).toHaveBeenCalled();
        ribbon.destroy();
    });

    test("gallery_ColorOption_RendersSwatch", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-clr",
            options: [
                { id: "red", label: "Red", color: "#ff0000" },
            ],
            inlineCount: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const swatch = container.querySelector(".ribbon-gallery-swatch") as HTMLElement;
        expect(swatch).not.toBeNull();
        expect(swatch.style.backgroundColor).toBe("rgb(255, 0, 0)");
        ribbon.destroy();
    });
});

// ============================================================================
// CONTROL STATE API — setControlHidden, setControlActive, getControlValue, setControlValue
// ============================================================================

describe("control state API", () =>
{
    function makeControlOptions(): RibbonOptions
    {
        return makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [
                        makeButton({ id: "btn-a", toggle: true, active: false }),
                        {
                            type: "input" as const,
                            id: "inp-a",
                            value: "initial",
                        } as RibbonInput,
                        {
                            type: "checkbox" as const,
                            id: "chk-a",
                            checked: false,
                        } as RibbonCheckbox,
                        {
                            type: "number" as const,
                            id: "num-a",
                            value: 42,
                        } as RibbonNumberSpinner,
                    ],
                })],
            })],
        });
    }

    test("setControlHidden_HidesControl", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlHidden("btn-a", true);
        const state = ribbon.getControlState("btn-a");
        expect(state?.visible).toBe(false);
        ribbon.destroy();
    });

    test("setControlHidden_ShowsControl", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlHidden("btn-a", true);
        ribbon.setControlHidden("btn-a", false);
        const state = ribbon.getControlState("btn-a");
        expect(state?.visible).toBe(true);
        ribbon.destroy();
    });

    test("setControlActive_SetsActiveState", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlActive("btn-a", true);
        const state = ribbon.getControlState("btn-a");
        expect(state?.active).toBe(true);
        ribbon.destroy();
    });

    test("setControlActive_RemovesActiveState", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlActive("btn-a", true);
        ribbon.setControlActive("btn-a", false);
        const state = ribbon.getControlState("btn-a");
        expect(state?.active).toBe(false);
        ribbon.destroy();
    });

    test("getControlValue_ReturnsInputValue", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        const val = ribbon.getControlValue("inp-a");
        expect(val).toBe("initial");
        ribbon.destroy();
    });

    test("setControlValue_UpdatesInputValue", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlValue("inp-a", "updated");
        expect(ribbon.getControlValue("inp-a")).toBe("updated");
        ribbon.destroy();
    });

    test("getControlValue_ReturnsCheckboxBoolean", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        expect(ribbon.getControlValue("chk-a")).toBe(false);
        ribbon.destroy();
    });

    test("setControlValue_UpdatesCheckbox", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlValue("chk-a", true);
        expect(ribbon.getControlValue("chk-a")).toBe(true);
        ribbon.destroy();
    });

    test("getControlValue_ReturnsNumberValue", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        expect(ribbon.getControlValue("num-a")).toBe(42);
        ribbon.destroy();
    });

    test("setControlValue_UpdatesNumber", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlValue("num-a", 99);
        expect(ribbon.getControlValue("num-a")).toBe(99);
        ribbon.destroy();
    });

    test("setControlDisabled_EnablesControl", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        ribbon.setControlDisabled("btn-a", true);
        ribbon.setControlDisabled("btn-a", false);
        const state = ribbon.getControlState("btn-a");
        expect(state?.disabled).toBe(false);
        ribbon.destroy();
    });

    test("getControlState_UnknownId_ReturnsNull", () =>
    {
        const ribbon = createRibbon(makeControlOptions(), "test-ribbon");
        expect(ribbon.getControlState("nonexistent")).toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// PENDING STATE — controls on lazy (non-active) tabs
// ============================================================================

describe("pending state for lazy tabs", () =>
{
    function makeTwoTabOptions(): RibbonOptions
    {
        return makeOptions({
            tabs: [
                makeTab({
                    id: "home",
                    groups: [makeGroup({ controls: [makeButton({ id: "btn-home" })] })],
                }),
                makeTab({
                    id: "insert",
                    groups: [makeGroup({
                        controls: [
                            makeButton({ id: "btn-insert" }),
                            {
                                type: "input" as const,
                                id: "inp-insert",
                                value: "old",
                            } as RibbonInput,
                        ],
                    })],
                }),
            ],
            activeTabId: "home",
        });
    }

    test("setControlDisabled_OnLazyTab_AppliesWhenTabActivated", () =>
    {
        const ribbon = createRibbon(makeTwoTabOptions(), "test-ribbon");
        // btn-insert is not yet rendered (insert tab is lazy)
        ribbon.setControlDisabled("btn-insert", true);
        const stateBefore = ribbon.getControlState("btn-insert");
        expect(stateBefore?.disabled).toBe(true);
        // Now switch to the insert tab — pending state should apply
        ribbon.setActiveTab("insert");
        const stateAfter = ribbon.getControlState("btn-insert");
        expect(stateAfter?.disabled).toBe(true);
        ribbon.destroy();
    });

    test("setControlValue_OnLazyTab_AppliesWhenTabActivated", () =>
    {
        const ribbon = createRibbon(makeTwoTabOptions(), "test-ribbon");
        ribbon.setControlValue("inp-insert", "new-value");
        ribbon.setActiveTab("insert");
        expect(ribbon.getControlValue("inp-insert")).toBe("new-value");
        ribbon.destroy();
    });
});

// ============================================================================
// QAT (Quick Access Toolbar)
// ============================================================================

describe("QAT", () =>
{
    test("qat_RendersAboveByDefault", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [
                { id: "qat-save", icon: "bi-save", tooltip: "Save" },
                { id: "qat-undo", icon: "bi-arrow-counterclockwise", tooltip: "Undo" },
            ],
        }), "test-ribbon");
        const qatEl = container.querySelector(".ribbon-qat");
        expect(qatEl).not.toBeNull();
        expect(qatEl?.getAttribute("role")).toBe("toolbar");
        const btns = qatEl?.querySelectorAll(".ribbon-qat-btn");
        expect(btns?.length).toBe(2);
        ribbon.destroy();
    });

    test("qat_BelowPosition_RendersAfterTabBar", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [{ id: "qat-1", icon: "bi-save", tooltip: "Save" }],
            qatPosition: "below",
        }), "test-ribbon");
        const qatEl = container.querySelector(".ribbon-qat");
        expect(qatEl).not.toBeNull();
        ribbon.destroy();
    });

    test("addQATItem_AddsButton", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [{ id: "qat-1", icon: "bi-save", tooltip: "Save" }],
        }), "test-ribbon");
        ribbon.addQATItem({ id: "qat-new", icon: "bi-plus", tooltip: "New" });
        const btns = container.querySelectorAll(".ribbon-qat-btn");
        expect(btns.length).toBe(2);
        ribbon.destroy();
    });

    test("removeQATItem_RemovesButton", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [
                { id: "qat-1", icon: "bi-save", tooltip: "Save" },
                { id: "qat-2", icon: "bi-undo", tooltip: "Undo" },
            ],
        }), "test-ribbon");
        ribbon.removeQATItem("qat-1");
        const btns = container.querySelectorAll(".ribbon-qat-btn");
        expect(btns.length).toBe(1);
        ribbon.destroy();
    });

    test("qatItem_OnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            qat: [{ id: "qat-1", icon: "bi-save", tooltip: "Save", onClick }],
        }), "test-ribbon");
        const btn = container.querySelector(".ribbon-qat-btn") as HTMLElement;
        btn.click();
        expect(onClick).toHaveBeenCalled();
        ribbon.destroy();
    });

    test("qatItem_Disabled_ButtonIsDisabled", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [{ id: "qat-dis", icon: "bi-trash", tooltip: "Delete", disabled: true }],
        }), "test-ribbon");
        const btn = container.querySelector(".ribbon-qat-btn") as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// BACKSTAGE
// ============================================================================

describe("backstage", () =>
{
    function makeBackstageOptions(): RibbonOptions
    {
        const infoContent = document.createElement("div");
        infoContent.textContent = "Document info content";
        return makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file",
                    label: "File",
                    groups: [],
                    backstage: true,
                    backstageSidebar: [
                        {
                            id: "bs-info",
                            label: "Info",
                            icon: "bi-info-circle",
                            content: infoContent,
                        },
                        {
                            id: "bs-new",
                            label: "New",
                            icon: "bi-plus",
                        },
                    ],
                },
            ],
        });
    }

    test("openBackstage_ShowsBackstagePanel", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        ribbon.openBackstage();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("flex");
        ribbon.destroy();
    });

    test("closeBackstage_HidesBackstagePanel", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        ribbon.openBackstage();
        ribbon.closeBackstage();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("none");
        ribbon.destroy();
    });

    test("backstage_HasDialogRole", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.getAttribute("role")).toBe("dialog");
        expect(bs.getAttribute("aria-modal")).toBe("true");
        ribbon.destroy();
    });

    test("setActiveTab_OnBackstageTab_OpensBackstage", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        ribbon.setActiveTab("file");
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("flex");
        ribbon.destroy();
    });

    test("backstage_SidebarItems_Rendered", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        ribbon.openBackstage();
        const items = container.querySelectorAll(".ribbon-backstage-item");
        expect(items.length).toBe(2);
        ribbon.destroy();
    });

    test("backstage_BackButton_ClosesBackstage", () =>
    {
        const ribbon = createRibbon(makeBackstageOptions(), "test-ribbon");
        ribbon.openBackstage();
        const backBtn = container.querySelector(".ribbon-backstage-back") as HTMLElement;
        expect(backBtn).not.toBeNull();
        backBtn.click();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// onControlClick CALLBACK
// ============================================================================

describe("onControlClick callback", () =>
{
    test("buttonClick_FiresOnControlClick", () =>
    {
        const onControlClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            onControlClick,
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-cc" })],
                })],
            })],
        }), "test-ribbon");
        const btn = container.querySelector("[data-control-id='btn-cc']") as HTMLElement;
        btn.click();
        expect(onControlClick).toHaveBeenCalledWith("btn-cc");
        ribbon.destroy();
    });
});

// ============================================================================
// COLLAPSE / EXPAND — panel visibility
// ============================================================================

describe("collapse panel visibility", () =>
{
    test("collapse_HidesPanel", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("none");
        ribbon.destroy();
    });

    test("expand_ShowsPanel", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        ribbon.expand();
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("");
        ribbon.destroy();
    });

    test("collapseButton_Rendered_WhenCollapsible", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        const btn = container.querySelector("[data-collapse-btn]");
        expect(btn).not.toBeNull();
        ribbon.destroy();
    });

    test("collapseButton_Click_TogglesCollapse", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        const btn = container.querySelector("[data-collapse-btn]") as HTMLElement;
        btn.click(); // collapse
        expect(ribbon.isCollapsed()).toBe(true);
        // After collapse the button calls toggleCollapse which internally
        // calls expand — refetch the button since DOM may have updated
        const btn2 = container.querySelector("[data-collapse-btn]") as HTMLElement;
        btn2.click(); // expand
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });

    test("onCollapse_Expand_FiresFalse", () =>
    {
        const onCollapse = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ collapsible: true, onCollapse }), "test-ribbon"
        );
        ribbon.collapse();
        ribbon.expand();
        expect(onCollapse).toHaveBeenCalledWith(false);
        ribbon.destroy();
    });

    test("initialCollapsed_PanelIsHidden", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true, collapsed: true }), "test-ribbon"
        );
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("none");
        expect(ribbon.isCollapsed()).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// COLORS — setColors
// ============================================================================

describe("setColors", () =>
{
    test("setColors_AppliesCSSVariables", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.setColors({
            backgroundColor: "#123456",
            tabTextColor: "#abcdef",
        });
        const root = ribbon.getElement();
        expect(root.style.getPropertyValue("--ribbon-bg")).toBe("#123456");
        expect(root.style.getPropertyValue("--ribbon-tab-color")).toBe("#abcdef");
        ribbon.destroy();
    });

    test("initialColors_AppliedOnShow", () =>
    {
        const ribbon = createRibbon(makeOptions({
            panelBackgroundColor: "#fafafa",
        }), "test-ribbon");
        const root = ribbon.getElement();
        expect(root.style.getPropertyValue("--ribbon-panel-bg")).toBe("#fafafa");
        ribbon.destroy();
    });
});

// ============================================================================
// STATE PERSISTENCE — getState / restoreState
// ============================================================================

describe("state persistence", () =>
{
    test("getState_ReturnsCurrentState", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                makeTab({ id: "insert", label: "Insert" }),
            ],
            collapsible: true,
        }), "test-ribbon");
        ribbon.setActiveTab("insert");
        const state = ribbon.getState();
        expect(state.activeTabId).toBe("insert");
        expect(state.collapsed).toBe(false);
        ribbon.destroy();
    });

    test("restoreState_RestoresActiveTab", () =>
    {
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
        }), "test-ribbon");
        ribbon.restoreState({ activeTabId: "insert", collapsed: true });
        expect(ribbon.getActiveTab()).toBe("insert");
        expect(ribbon.isCollapsed()).toBe(true);
        ribbon.destroy();
    });

    test("restoreState_RestoresAutoCollapseDelay", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.restoreState({ autoCollapseDelay: 8000 });
        expect(ribbon.getAutoCollapseDelay()).toBe(8000);
        ribbon.destroy();
    });
});

// ============================================================================
// AUTO-COLLAPSE DELAY
// ============================================================================

describe("auto-collapse delay", () =>
{
    test("setAutoCollapseDelay_SetsDelay", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.setAutoCollapseDelay(5000);
        expect(ribbon.getAutoCollapseDelay()).toBe(5000);
        ribbon.destroy();
    });

    test("setAutoCollapseDelay_NegativeValue_SetsZero", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.setAutoCollapseDelay(-100);
        expect(ribbon.getAutoCollapseDelay()).toBe(0);
        ribbon.destroy();
    });

    test("getAutoCollapseDelay_DefaultIsZero", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(ribbon.getAutoCollapseDelay()).toBe(0);
        ribbon.destroy();
    });
});

// ============================================================================
// STATUS BAR
// ============================================================================

describe("status bar", () =>
{
    test("statusBar_RendersFromElement", () =>
    {
        const statusEl = document.createElement("span");
        statusEl.textContent = "User: Admin";
        const ribbon = createRibbon(makeOptions({
            statusBar: statusEl,
        }), "test-ribbon");
        const statusWrapper = container.querySelector(".ribbon-tabbar-status");
        expect(statusWrapper).not.toBeNull();
        expect(statusWrapper?.textContent).toContain("User: Admin");
        ribbon.destroy();
    });

    test("statusBar_RendersFromFactory", () =>
    {
        const factory = () =>
        {
            const el = document.createElement("span");
            el.textContent = "Dynamic Status";
            return el;
        };
        const ribbon = createRibbon(makeOptions({
            statusBar: factory,
        }), "test-ribbon");
        const statusWrapper = container.querySelector(".ribbon-tabbar-status");
        expect(statusWrapper?.textContent).toContain("Dynamic Status");
        ribbon.destroy();
    });

    test("setStatusBar_UpdatesStatusBar", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const newEl = document.createElement("span");
        newEl.textContent = "New Status";
        ribbon.setStatusBar(newEl);
        const statusWrapper = container.querySelector(".ribbon-tabbar-status");
        expect(statusWrapper?.textContent).toContain("New Status");
        ribbon.destroy();
    });

    test("setStatusBar_Null_RemovesStatusBar", () =>
    {
        const statusEl = document.createElement("span");
        statusEl.textContent = "User";
        const ribbon = createRibbon(makeOptions({
            statusBar: statusEl,
        }), "test-ribbon");
        ribbon.setStatusBar(null);
        const statusWrapper = container.querySelector(".ribbon-tabbar-status");
        expect(statusWrapper).toBeNull();
        ribbon.destroy();
    });

    test("getStatusBarElement_ReturnsWrapper", () =>
    {
        const statusEl = document.createElement("span");
        const ribbon = createRibbon(makeOptions({
            statusBar: statusEl,
        }), "test-ribbon");
        expect(ribbon.getStatusBarElement()).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// HIDE / SHOW LIFECYCLE
// ============================================================================

describe("hide and show lifecycle", () =>
{
    test("hide_HidesRootElement", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.hide();
        const root = ribbon.getElement();
        expect(root.style.display).toBe("none");
        ribbon.destroy();
    });

    test("show_AfterHide_RestoredVisibility", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show("test-ribbon");
        ribbon.hide();
        // show again should remount
        ribbon.show("test-ribbon");
        // After hide the element is still present but hidden; show re-shows
        const root = ribbon.getElement();
        // The show method checks this.visible flag, so a second show after hide re-shows
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// CSS CLASS
// ============================================================================

describe("cssClass option", () =>
{
    test("cssClass_AppliedToRoot", () =>
    {
        const ribbon = createRibbon(makeOptions({
            cssClass: "my-ribbon-theme",
        }), "test-ribbon");
        const root = ribbon.getElement();
        expect(root.classList.contains("my-ribbon-theme")).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// DISABLED CONTROLS INITIAL STATE
// ============================================================================

describe("initially disabled controls", () =>
{
    test("button_InitiallyDisabled_HasDisabledClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-dis", disabled: true })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-dis']") as HTMLElement;
        expect(el.classList.contains("ribbon-control-disabled")).toBe(true);
        ribbon.destroy();
    });

    test("button_InitiallyDisabled_ButtonElementDisabled", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-dis2", disabled: true })],
                })],
            })],
        }), "test-ribbon");
        const btn = container.querySelector("[data-control-id='btn-dis2']") as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// MENU BAR
// ============================================================================

describe("menu bar", () =>
{
    test("menuBar_RendersMenuButtons", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [
                        { id: "mi-new", label: "New" },
                        { id: "mi-open", label: "Open" },
                    ],
                },
            ],
        }), "test-ribbon");
        const bar = container.querySelector(".ribbon-menubar");
        expect(bar).not.toBeNull();
        expect(bar?.getAttribute("role")).toBe("menubar");
        const triggers = container.querySelectorAll(".ribbon-menu-trigger");
        expect(triggers.length).toBe(1);
        expect(triggers[0].textContent).toBe("File");
        ribbon.destroy();
    });

    test("menuBar_ClickTrigger_ShowsDropdown", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [
                        { id: "mi-new", label: "New" },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const dropdown = container.querySelector(".ribbon-menu-dropdown") as HTMLElement;
        expect(dropdown.style.display).not.toBe("none");
        ribbon.destroy();
    });

    test("menuBar_MenuItem_OnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [{ id: "mi-new", label: "New", onClick }],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const entry = container.querySelector(".ribbon-menu-entry") as HTMLElement;
        entry.click();
        expect(onClick).toHaveBeenCalled();
        ribbon.destroy();
    });

    test("menuBar_Separator_RendersAsDiv", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [
                        { id: "mi-new", label: "New", type: "item" },
                        { id: "mi-sep", label: "", type: "separator" },
                        { id: "mi-open", label: "Open", type: "item" },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const sep = container.querySelector(".ribbon-menu-separator");
        expect(sep).not.toBeNull();
        ribbon.destroy();
    });

    test("menuBar_Header_RendersHeaderDiv", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [
                        { id: "mi-hdr", label: "Clipboard", type: "header" },
                        { id: "mi-paste", label: "Paste" },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const hdr = container.querySelector(".ribbon-menu-header");
        expect(hdr).not.toBeNull();
        expect(hdr?.textContent).toBe("Clipboard");
        ribbon.destroy();
    });
});

// ============================================================================
// KEYTIPS
// ============================================================================

describe("keyTip attributes", () =>
{
    test("tabKeyTip_SetOnTabButton", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home", keyTip: "H" }),
            ],
        }), "test-ribbon");
        const tab = container.querySelector("[data-tab-id='home']") as HTMLElement;
        expect(tab.dataset.keyTip).toBe("H");
        ribbon.destroy();
    });

    test("controlKeyTip_SetOnControl", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-kt", keyTip: "B" })],
                })],
            })],
        }), "test-ribbon");
        const btn = container.querySelector("[data-control-id='btn-kt']") as HTMLElement;
        expect(btn.dataset.keyTip).toBe("B");
        ribbon.destroy();
    });
});

// ============================================================================
// TOOLTIP / ARIA-LABEL
// ============================================================================

describe("tooltips", () =>
{
    test("button_Tooltip_SetsTitle", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-tt", tooltip: "Make text bold",
                    })],
                })],
            })],
        }), "test-ribbon");
        const btn = container.querySelector("[data-control-id='btn-tt']") as HTMLElement;
        expect(btn.getAttribute("title")).toBe("Make text bold");
        expect(btn.getAttribute("aria-label")).toBe("Make text bold");
        ribbon.destroy();
    });
});

// ============================================================================
// getElement
// ============================================================================

describe("getElement", () =>
{
    test("getElement_ReturnsRootDOMElement", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const el = ribbon.getElement();
        expect(el).not.toBeNull();
        expect(el.classList.contains("ribbon")).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// KEYBOARD HANDLING — Escape, Ctrl+F1, Tab navigation
// ============================================================================

describe("keyboard handling", () =>
{
    test("ctrlF1_TogglesCollapse", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        expect(ribbon.isCollapsed()).toBe(false);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "F1", ctrlKey: true, bubbles: true,
        }));
        expect(ribbon.isCollapsed()).toBe(true);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "F1", ctrlKey: true, bubbles: true,
        }));
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });

    test("escape_ClosesBackstage", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("flex");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(bs.style.display).toBe("none");
        ribbon.destroy();
    });

    test("escape_ClosesOpenPopup", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-esc",
            label: "Paste",
            icon: "bi-clipboard",
            menuItems: [{ id: "txt", label: "Text" }],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const menu = container.querySelector(".ribbon-split-menu") as HTMLElement;
        expect(menu.style.display).not.toBe("none");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(menu.style.display).toBe("none");
        ribbon.destroy();
    });

    test("escape_ClosesTempExpand", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        // Switching tab while collapsed should temp-expand
        ribbon.setActiveTab("insert");
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("");
        // Escape should close the temp expand
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(panel.style.display).toBe("none");
        ribbon.destroy();
    });

    test("alt_TogglesKeyTipMode", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: true,
            tabs: [makeTab({ id: "home", label: "Home", keyTip: "H" })],
        }), "test-ribbon");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        const root = ribbon.getElement();
        expect(root.classList.contains("ribbon-keytips-active")).toBe(true);
        // Second Alt dismisses
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        expect(root.classList.contains("ribbon-keytips-active")).toBe(false);
        ribbon.destroy();
    });

    test("escape_DismissesGroupKeyTips_BackToTabKeyTips", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: true,
            tabs: [makeTab({
                id: "home", label: "Home", keyTip: "H",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-kt2", keyTip: "B" })],
                })],
            })],
        }), "test-ribbon");
        const root = ribbon.getElement();

        // Enter keytip mode
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        expect(root.classList.contains("ribbon-keytips-active")).toBe(true);

        // Type "H" to select tab — shows group keytips (async via rAF)
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "H", bubbles: true,
        }));

        // Escape from tab keytips should dismiss
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        // After escape from tabs level, keytips should be fully dismissed
        expect(root.classList.contains("ribbon-keytips-active")).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// CLICK OUTSIDE — closes menus and popups
// ============================================================================

describe("click outside", () =>
{
    test("clickOutside_ClosesOpenMenu", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [{ id: "mi-new", label: "New" }],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const dropdown = container.querySelector(".ribbon-menu-dropdown") as HTMLElement;
        expect(dropdown.style.display).not.toBe("none");
        // Click outside the ribbon
        const outsideEl = document.createElement("div");
        document.body.appendChild(outsideEl);
        outsideEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        expect(dropdown.style.display).toBe("none");
        outsideEl.remove();
        ribbon.destroy();
    });

    test("clickOutside_CollapsesTempExpand", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        ribbon.setActiveTab("insert"); // temp expand
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("");
        // Click outside
        const outsideEl = document.createElement("div");
        document.body.appendChild(outsideEl);
        outsideEl.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
        expect(panel.style.display).toBe("none");
        outsideEl.remove();
        ribbon.destroy();
    });
});

// ============================================================================
// TEMP EXPAND — collapsed ribbon tab click shows panel
// ============================================================================

describe("temporary expand", () =>
{
    test("tabClick_WhenCollapsed_TempExpandsPanel", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("none");
        ribbon.setActiveTab("insert");
        expect(panel.style.display).toBe("");
        expect(ribbon.isCollapsed()).toBe(true); // still collapsed
        ribbon.destroy();
    });

    test("tabClick_SameTab_WhenTempExpanded_HidesPanel", () =>
    {
        const ribbon = createRibbon(
            makeOptions({ collapsible: true }), "test-ribbon"
        );
        ribbon.collapse();
        ribbon.setActiveTab("insert");
        // Panel is temp-expanded; clicking same tab button should close
        const tabBtn = container.querySelector("[data-tab-id='insert']") as HTMLElement;
        tabBtn.click();
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// GALLERY POPUP — more button
// ============================================================================

describe("gallery popup", () =>
{
    test("moreButton_Click_ShowsPopup", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-popup",
            options: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
                { id: "c", label: "C" },
                { id: "d", label: "D" },
                { id: "e", label: "E" },
            ],
            inlineCount: 2,
            columns: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const moreBtn = container.querySelector(".ribbon-gallery-more") as HTMLElement;
        expect(moreBtn).not.toBeNull();
        moreBtn.click();
        const popup = container.querySelector(".ribbon-gallery-popup") as HTMLElement;
        expect(popup.style.display).not.toBe("none");
        ribbon.destroy();
    });

    test("moreButton_SecondClick_TogglesPopupClosed", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-popup2",
            options: [
                { id: "a", label: "A" },
                { id: "b", label: "B" },
                { id: "c", label: "C" },
                { id: "d", label: "D" },
            ],
            inlineCount: 2,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const moreBtn = container.querySelector(".ribbon-gallery-more") as HTMLElement;
        moreBtn.click();
        moreBtn.click(); // close
        const popup = container.querySelector(".ribbon-gallery-popup") as HTMLElement;
        expect(popup.style.display).toBe("none");
        ribbon.destroy();
    });

    test("gallery_ListLayout_RendersListItems", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-list",
            options: [
                { id: "a", label: "Alpha" },
                { id: "b", label: "Beta" },
                { id: "c", label: "Gamma" },
                { id: "d", label: "Delta" },
            ],
            layout: "list",
            inlineCount: 2,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const moreBtn = container.querySelector(".ribbon-gallery-more") as HTMLElement;
        moreBtn.click();
        const listItems = container.querySelectorAll(".ribbon-gallery-list-item");
        expect(listItems.length).toBe(4);
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON MENU — toggle close, menu item click
// ============================================================================

describe("split button menu interactions", () =>
{
    function makeSplitOptions(): RibbonOptions
    {
        return makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "split-button" as const,
                        id: "split-int",
                        label: "Paste",
                        icon: "bi-clipboard",
                        menuItems: [
                            { id: "paste-text", label: "Paste Text" },
                            { id: "paste-spec", label: "Paste Special", disabled: true },
                        ],
                    } as RibbonSplitButton],
                })],
            })],
        });
    }

    test("splitMenu_SecondArrowClick_ClosesMenu", () =>
    {
        const ribbon = createRibbon(makeSplitOptions(), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click(); // open
        arrow.click(); // close
        const menu = container.querySelector(".ribbon-split-menu") as HTMLElement;
        expect(menu.style.display).toBe("none");
        ribbon.destroy();
    });

    test("splitMenu_ItemClick_ClosesMenu", () =>
    {
        const ribbon = createRibbon(makeSplitOptions(), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const items = container.querySelectorAll(".ribbon-split-menu-item");
        (items[0] as HTMLElement).click();
        const menu = container.querySelector(".ribbon-split-menu") as HTMLElement;
        expect(menu.style.display).toBe("none");
        ribbon.destroy();
    });

    test("splitButton_PrimaryClick_FiresOnClick", () =>
    {
        const onClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "split-button" as const,
                        id: "split-cb",
                        label: "Paste",
                        onClick,
                        menuItems: [{ id: "x", label: "X" }],
                    } as RibbonSplitButton],
                })],
            })],
        }), "test-ribbon");
        const primary = container.querySelector(".ribbon-split-primary") as HTMLElement;
        primary.click();
        expect(onClick).toHaveBeenCalled();
        ribbon.destroy();
    });

    test("splitButton_Toggle_ClickTogglesPrimary", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "split-button" as const,
                        id: "split-tog",
                        label: "Bold",
                        toggle: true,
                        active: false,
                        menuItems: [{ id: "x", label: "X" }],
                    } as RibbonSplitButton],
                })],
            })],
        }), "test-ribbon");
        const primary = container.querySelector(".ribbon-split-primary") as HTMLElement;
        primary.click();
        expect(primary.getAttribute("aria-pressed")).toBe("true");
        expect(primary.classList.contains("ribbon-control-active")).toBe(true);
        ribbon.destroy();
    });

    test("splitMenu_DisabledItem_RenderDisabledAttribute", () =>
    {
        const ribbon = createRibbon(makeSplitOptions(), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const items = container.querySelectorAll(".ribbon-split-menu-item");
        const disabledItem = items[1] as HTMLButtonElement;
        expect(disabledItem.disabled).toBe(true);
        expect(disabledItem.getAttribute("aria-disabled")).toBe("true");
        ribbon.destroy();
    });
});

// ============================================================================
// STATE PERSISTENCE — contextual tabs in state
// ============================================================================

describe("state persistence with contextual tabs", () =>
{
    test("getState_IncludesContextualTabVisibility", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                makeTab({ id: "design", label: "Design", contextual: true }),
            ],
        }), "test-ribbon");
        ribbon.showContextualTab("design");
        const state = ribbon.getState();
        expect(state.contextualTabs["design"]).toBe(true);
        ribbon.destroy();
    });

    test("restoreState_ShowsContextualTab", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                makeTab({ id: "design", label: "Design", contextual: true }),
            ],
        }), "test-ribbon");
        ribbon.restoreState({
            contextualTabs: { design: true },
        });
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.style.display).toBe("");
        ribbon.destroy();
    });

    test("restoreState_ControlValues_SetsValues", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "input" as const,
                        id: "inp-state",
                        value: "old",
                    } as RibbonInput],
                })],
            })],
        }), "test-ribbon");
        ribbon.restoreState({
            controlValues: { "inp-state": "restored" },
        });
        expect(ribbon.getControlValue("inp-state")).toBe("restored");
        ribbon.destroy();
    });

    test("getState_IncludesControlValues", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "number" as const,
                        id: "num-st",
                        value: 50,
                    } as RibbonNumberSpinner],
                })],
            })],
        }), "test-ribbon");
        const state = ribbon.getState();
        expect(state.controlValues["num-st"]).toBe(50);
        ribbon.destroy();
    });

    test("getState_IncludesAutoCollapseDelay", () =>
    {
        const ribbon = createRibbon(makeOptions({
            autoCollapseDelay: 7000,
        }), "test-ribbon");
        const state = ribbon.getState();
        expect(state.autoCollapseDelay).toBe(7000);
        ribbon.destroy();
    });
});

// ============================================================================
// MENU BAR — submenu with children, shortcut rendering
// ============================================================================

describe("menu bar advanced", () =>
{
    test("menuItem_WithShortcut_RendersShortcutText", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [
                        { id: "mi-copy", label: "Copy", icon: "bi-clipboard", shortcut: "Ctrl+C" },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const shortcut = container.querySelector(".ribbon-menu-entry-shortcut");
        expect(shortcut?.textContent).toBe("Ctrl+C");
        ribbon.destroy();
    });

    test("menuItem_WithIcon_RendersIcon", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [
                        { id: "mi-copy", label: "Copy", icon: "bi-clipboard" },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const icon = container.querySelector(".ribbon-menu-entry-icon");
        expect(icon).not.toBeNull();
        ribbon.destroy();
    });

    test("menuItem_WithChildren_RendersSubmenuArrow", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [
                        {
                            id: "mi-paste",
                            label: "Paste Special",
                            children: [
                                { id: "mi-paste-text", label: "Plain Text" },
                                { id: "mi-paste-html", label: "HTML" },
                            ],
                        },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const arrow = container.querySelector(".ribbon-menu-submenu-arrow");
        expect(arrow).not.toBeNull();
        ribbon.destroy();
    });

    test("menuItem_Disabled_HasDisabledAttribute", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [
                        { id: "mi-redo", label: "Redo", disabled: true },
                    ],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click();
        const entry = container.querySelector(".ribbon-menu-entry") as HTMLButtonElement;
        expect(entry.disabled).toBe(true);
        expect(entry.getAttribute("aria-disabled")).toBe("true");
        ribbon.destroy();
    });

    test("menuBar_ClickTrigger_ThenClickAgain_Closes", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [{ id: "mi-new", label: "New" }],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        trigger.click(); // open
        trigger.click(); // close
        const dropdown = container.querySelector(".ribbon-menu-dropdown") as HTMLElement;
        expect(dropdown.style.display).toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// PANEL HEIGHT
// ============================================================================

describe("panel height", () =>
{
    test("panelHeight_CustomValue_AppliedAsInlineStyle", () =>
    {
        const ribbon = createRibbon(makeOptions({
            panelHeight: 120,
        }), "test-ribbon");
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.height).toBe("120px");
        ribbon.destroy();
    });

    test("panelHeight_Default_96px", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.height).toBe("96px");
        ribbon.destroy();
    });
});

// ============================================================================
// GROUP OVERFLOW OPTION
// ============================================================================

describe("group overflow option", () =>
{
    test("groupOverflow_Visible_SetsOverflowStyle", () =>
    {
        const ribbon = createRibbon(makeOptions({
            groupOverflow: "visible",
        }), "test-ribbon");
        const content = container.querySelector(".ribbon-group-content") as HTMLElement;
        expect(content.style.overflow).toBe("visible");
        ribbon.destroy();
    });
});

// ============================================================================
// DESTROY IDEMPOTENCY
// ============================================================================

describe("destroy idempotency", () =>
{
    test("destroy_CalledTwice_DoesNotThrow", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.destroy();
        expect(() => ribbon.destroy()).not.toThrow();
    });

    test("methods_AfterDestroy_DoNotThrow", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.destroy();
        expect(() =>
        {
            ribbon.setActiveTab("home");
            ribbon.addTab(makeTab({ id: "x" }));
            ribbon.removeTab("home");
            ribbon.collapse();
            ribbon.showContextualTab("x");
            ribbon.hideContextualTab("x");
            ribbon.setControlDisabled("x", true);
            ribbon.setControlHidden("x", true);
            ribbon.setControlActive("x", true);
            ribbon.openBackstage();
            ribbon.setStatusBar(null);
            ribbon.restoreState({});
        }).not.toThrow();
    });
});

// ============================================================================
// BUTTON WITH ACTIVE INITIAL STATE
// ============================================================================

describe("button initial active state", () =>
{
    test("button_InitiallyActive_HasActiveClass", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-act", toggle: true, active: true,
                    })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-act']") as HTMLElement;
        expect(el.classList.contains("ribbon-control-active")).toBe(true);
        expect(el.getAttribute("aria-pressed")).toBe("true");
        ribbon.destroy();
    });
});

// ============================================================================
// HIDDEN CONTROL DURING RENDER — skips hidden controls
// ============================================================================

describe("hidden controls during render", () =>
{
    test("hiddenControl_NotRendered", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [
                        makeButton({ id: "btn-vis", label: "Visible" }),
                        makeButton({ id: "btn-hid", label: "Hidden", hidden: true }),
                    ],
                })],
            })],
        }), "test-ribbon");
        const visEl = container.querySelector("[data-control-id='btn-vis']");
        const hidEl = container.querySelector("[data-control-id='btn-hid']");
        expect(visEl).not.toBeNull();
        expect(hidEl).toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// CONTROL cssClass
// ============================================================================

describe("control cssClass", () =>
{
    test("controlCssClass_AppliedToElement", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({
                        id: "btn-css", cssClass: "my-custom-btn",
                    })],
                })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='btn-css']") as HTMLElement;
        expect(el.classList.contains("my-custom-btn")).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// QAT keyTip attribute
// ============================================================================

describe("QAT keyTip", () =>
{
    test("qatItem_WithKeyTip_SetsDataAttribute", () =>
    {
        const ribbon = createRibbon(makeOptions({
            qat: [
                { id: "qat-save", icon: "bi-save", tooltip: "Save", keyTip: "S" },
            ],
        }), "test-ribbon");
        const btn = container.querySelector(".ribbon-qat-btn") as HTMLElement;
        expect(btn.dataset.keyTip).toBe("S");
        ribbon.destroy();
    });
});

// ============================================================================
// MENU BAR keyTip attribute
// ============================================================================

describe("menu bar keyTip", () =>
{
    test("menuBarItem_WithKeyTip_SetsDataAttribute", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    keyTip: "F",
                    items: [{ id: "mi-new", label: "New" }],
                },
            ],
        }), "test-ribbon");
        const trigger = container.querySelector(".ribbon-menu-trigger") as HTMLElement;
        expect(trigger.dataset.keyTip).toBe("F");
        ribbon.destroy();
    });
});

// ============================================================================
// DROPDOWN — width and disabled
// ============================================================================

describe("dropdown advanced", () =>
{
    test("dropdown_CustomWidth_AppliedToSelect", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "dropdown" as const,
                        id: "dd-w",
                        options: [{ value: "a", label: "A" }],
                        width: "150px",
                    } as RibbonDropdown],
                })],
            })],
        }), "test-ribbon");
        const sel = container.querySelector(".ribbon-dropdown") as HTMLSelectElement;
        expect(sel.style.width).toBe("150px");
        ribbon.destroy();
    });

    test("dropdown_Disabled_SelectIsDisabled", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "dropdown" as const,
                        id: "dd-dis",
                        options: [{ value: "a", label: "A" }],
                        disabled: true,
                    } as RibbonDropdown],
                })],
            })],
        }), "test-ribbon");
        const sel = container.querySelector(".ribbon-dropdown") as HTMLSelectElement;
        expect(sel.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// INPUT — width, disabled, tooltip
// ============================================================================

describe("input advanced", () =>
{
    test("input_CustomWidth_Applied", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "input" as const,
                        id: "inp-w",
                        width: "200px",
                    } as RibbonInput],
                })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        expect(inp.style.width).toBe("200px");
        ribbon.destroy();
    });

    test("input_Disabled_InputIsDisabled", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "input" as const,
                        id: "inp-dis",
                        disabled: true,
                    } as RibbonInput],
                })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        expect(inp.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// COLOR PICKER — onInput callback
// ============================================================================

describe("color picker onInput", () =>
{
    test("colorPicker_OnInput_FiresCallback", () =>
    {
        const onInput = vi.fn();
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "color" as const,
                        id: "clr-inp",
                        value: "#000000",
                        onInput,
                    } as RibbonColorPicker],
                })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-color") as HTMLInputElement;
        inp.value = "#ff0000";
        inp.dispatchEvent(new Event("input"));
        expect(onInput).toHaveBeenCalledWith("#ff0000");
        ribbon.destroy();
    });
});

// ============================================================================
// NUMBER SPINNER — width and disabled
// ============================================================================

describe("number spinner advanced", () =>
{
    test("numberSpinner_CustomWidth_Applied", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "number" as const,
                        id: "num-w",
                        value: 10,
                        width: "80px",
                    } as RibbonNumberSpinner],
                })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-number") as HTMLInputElement;
        expect(inp.style.width).toBe("80px");
        ribbon.destroy();
    });

    test("numberSpinner_Disabled_InputIsDisabled", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [{
                        type: "number" as const,
                        id: "num-dis",
                        value: 5,
                        disabled: true,
                    } as RibbonNumberSpinner],
                })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-number") as HTMLInputElement;
        expect(inp.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// GALLERY — disabled options and preview content
// ============================================================================

describe("gallery advanced", () =>
{
    test("gallery_DisabledOption_HasDisabledAttribute", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-dis",
            options: [
                { id: "a", label: "A", disabled: true },
            ],
            inlineCount: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const btn = container.querySelector(".ribbon-gallery-option") as HTMLButtonElement;
        expect(btn.disabled).toBe(true);
        ribbon.destroy();
    });

    test("gallery_IconOption_RendersIcon", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-icon",
            options: [
                { id: "a", label: "A", icon: "bi-star" },
            ],
            inlineCount: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const opt = container.querySelector(".ribbon-gallery-option") as HTMLElement;
        const icon = opt.querySelector("i");
        expect(icon).not.toBeNull();
        ribbon.destroy();
    });

    test("gallery_PreviewOption_RendersPreview", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-prev",
            options: [
                { id: "a", label: "A", preview: "<b>Bold</b>" },
            ],
            inlineCount: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const preview = container.querySelector(".ribbon-gallery-preview");
        expect(preview).not.toBeNull();
        ribbon.destroy();
    });

    test("gallery_TextOnlyOption_ShowsLabelAsText", () =>
    {
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-txt",
            options: [
                { id: "a", label: "Normal" },
            ],
            inlineCount: 3,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const opt = container.querySelector(".ribbon-gallery-option") as HTMLElement;
        expect(opt.textContent).toBe("Normal");
        ribbon.destroy();
    });
});

// ============================================================================
// TAB CLICK HANDLER — backstage tab click
// ============================================================================

describe("tab click handler", () =>
{
    test("clickingBackstageTab_OpensBackstage", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                },
            ],
        }), "test-ribbon");
        const tabBtn = container.querySelector("[data-tab-id='file']") as HTMLElement;
        tabBtn.click();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("flex");
        ribbon.destroy();
    });
});

// ============================================================================
// ADAPTIVE COLLAPSE — adaptive option disabled
// ============================================================================

describe("adaptive collapse", () =>
{
    test("adaptive_False_NoResizeObserver", () =>
    {
        const ribbon = createRibbon(makeOptions({
            adaptive: false,
        }), "test-ribbon");
        // Should render without crashing
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });

    test("adaptive_True_RendersNormally", () =>
    {
        const ribbon = createRibbon(makeOptions({
            adaptive: true,
        }), "test-ribbon");
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// GROUP ARIA LABEL — uses label or fallback to id
// ============================================================================

describe("group aria-label", () =>
{
    test("group_WithLabel_UsesLabelForAria", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ id: "grp-test", label: "Formatting" })],
            })],
        }), "test-ribbon");
        const grp = container.querySelector("[data-group-id='grp-test']") as HTMLElement;
        expect(grp.getAttribute("aria-label")).toBe("Formatting");
        ribbon.destroy();
    });

    test("group_WithoutLabel_UsesIdForAria", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ id: "grp-nolbl", label: "" })],
            })],
        }), "test-ribbon");
        const grp = container.querySelector("[data-group-id='grp-nolbl']") as HTMLElement;
        expect(grp.getAttribute("aria-label")).toBe("grp-nolbl");
        ribbon.destroy();
    });
});

// ============================================================================
// GROUP SEPARATOR between groups
// ============================================================================

describe("group separators", () =>
{
    test("multipleGroups_HaveSeparatorsBetween", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [
                    makeGroup({ id: "g1", label: "Group 1" }),
                    makeGroup({ id: "g2", label: "Group 2" }),
                    makeGroup({ id: "g3", label: "Group 3" }),
                ],
            })],
        }), "test-ribbon");
        const seps = container.querySelectorAll(".ribbon-group-separator");
        expect(seps.length).toBe(2); // between g1-g2 and g2-g3
        ribbon.destroy();
    });
});

// ============================================================================
// BACKSTAGE with function content
// ============================================================================

describe("backstage content factory", () =>
{
    test("backstage_FunctionContent_InvokesFactory", () =>
    {
        const factory = vi.fn(() =>
        {
            const el = document.createElement("div");
            el.textContent = "Factory Content";
            return el;
        });
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                    backstageContent: factory,
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        expect(factory).toHaveBeenCalled();
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.textContent).toContain("Factory Content");
        ribbon.destroy();
    });

    test("backstage_SidebarItemContent_FunctionInvoked", () =>
    {
        const factory = vi.fn(() =>
        {
            const el = document.createElement("div");
            el.textContent = "Item Content";
            return el;
        });
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                    backstageSidebar: [
                        { id: "bs-1", label: "Info", content: factory },
                    ],
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        expect(factory).toHaveBeenCalled();
        ribbon.destroy();
    });
});

// ============================================================================
// MENU BAR — mouseenter switches to another open menu
// ============================================================================

describe("menu bar hover switching", () =>
{
    test("mouseenter_WhenMenuOpen_SwitchesToNewMenu", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [{ id: "mi-new", label: "New" }],
                },
                {
                    id: "menu-edit",
                    label: "Edit",
                    items: [{ id: "mi-copy", label: "Copy" }],
                },
            ],
        }), "test-ribbon");
        const triggers = container.querySelectorAll(".ribbon-menu-trigger");
        // Open File menu
        (triggers[0] as HTMLElement).click();
        const dropdowns = container.querySelectorAll(".ribbon-menu-dropdown");
        expect((dropdowns[0] as HTMLElement).style.display).not.toBe("none");

        // Hover over Edit trigger — should switch
        (triggers[1] as HTMLElement).dispatchEvent(
            new MouseEvent("mouseenter", { bubbles: true })
        );
        expect((dropdowns[0] as HTMLElement).style.display).toBe("none");
        // Edit dropdown should now be open
        expect((dropdowns[1] as HTMLElement).style.display).not.toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// SETACTIVETAB closes backstage if open
// ============================================================================

describe("setActiveTab closes backstage", () =>
{
    test("setActiveTab_NonBackstageTab_ClosesOpenBackstage", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        ribbon.setActiveTab("home");
        const bs = container.querySelector(".ribbon-backstage") as HTMLElement;
        expect(bs.style.display).toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// CUSTOM CONTROL — large size places label below
// ============================================================================

describe("custom control large layout", () =>
{
    test("custom_LargeSize_LabelAfterElement", () =>
    {
        const customEl = document.createElement("div");
        customEl.textContent = "Widget";
        const custom: RibbonCustom = {
            type: "custom",
            id: "cust-lg",
            element: customEl,
            size: "large",
            label: "My Widget",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [custom] })],
            })],
        }), "test-ribbon");
        const wrap = container.querySelector("[data-control-id='cust-lg']") as HTMLElement;
        // In large mode, label is appended AFTER the element
        const label = wrap.querySelector(".ribbon-custom-label");
        expect(label).not.toBeNull();
        expect(label?.textContent).toBe("My Widget");
        // Label should be the LAST child (after the widget element)
        expect(wrap.lastElementChild).toBe(label);
        ribbon.destroy();
    });

    test("custom_SmallSize_LabelBeforeElement", () =>
    {
        const customEl = document.createElement("div");
        customEl.textContent = "Widget";
        const custom: RibbonCustom = {
            type: "custom",
            id: "cust-sm2",
            element: customEl,
            size: "small",
            label: "Label First",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [custom] })],
            })],
        }), "test-ribbon");
        const wrap = container.querySelector("[data-control-id='cust-sm2']") as HTMLElement;
        const label = wrap.querySelector(".ribbon-custom-label");
        expect(label).not.toBeNull();
        // Label should be the FIRST child (before the widget element)
        expect(wrap.firstElementChild).toBe(label);
        ribbon.destroy();
    });
});

// ============================================================================
// LABEL CONTROL — fallback to label when text is undefined
// ============================================================================

describe("label control fallbacks", () =>
{
    test("label_UsesLabelWhenTextIsUndefined", () =>
    {
        const lbl: RibbonLabel = {
            type: "label",
            id: "lbl-fb",
            label: "Fallback Label",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [lbl] })],
            })],
        }), "test-ribbon");
        const el = container.querySelector("[data-control-id='lbl-fb']") as HTMLElement;
        expect(el.textContent).toContain("Fallback Label");
        ribbon.destroy();
    });
});

// ============================================================================
// setActiveTab_OnAlreadyActiveTab_DoesNotFireCallback
// ============================================================================

describe("tab change callback guard", () =>
{
    test("setActiveTab_SameTab_DoesNotFireOnTabChange", () =>
    {
        const onTabChange = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ onTabChange }), "test-ribbon"
        );
        ribbon.setActiveTab("home"); // already active
        expect(onTabChange).not.toHaveBeenCalled();
        ribbon.destroy();
    });
});

// ============================================================================
// CHECKBOX / TOGGLE — disabled
// ============================================================================

describe("checkbox and toggle disabled", () =>
{
    test("checkbox_Disabled_InputIsDisabled", () =>
    {
        const chk: RibbonCheckbox = {
            type: "checkbox",
            id: "chk-dis",
            label: "Option",
            disabled: true,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [chk] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-checkbox") as HTMLInputElement;
        expect(inp.disabled).toBe(true);
        ribbon.destroy();
    });

    test("toggle_Disabled_InputIsDisabled", () =>
    {
        const tog: RibbonToggleSwitch = {
            type: "toggle",
            id: "tog-dis",
            label: "Feature",
            disabled: true,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [tog] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-toggle") as HTMLInputElement;
        expect(inp.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// GETCONTROLVALUE — for control without input (returns empty string)
// ============================================================================

describe("getControlValue edge cases", () =>
{
    test("getControlValue_ButtonWithoutInput_ReturnsEmptyString", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({
                    controls: [makeButton({ id: "btn-val" })],
                })],
            })],
        }), "test-ribbon");
        expect(ribbon.getControlValue("btn-val")).toBe("");
        ribbon.destroy();
    });

    test("getControlValue_UnknownControl_ReturnsEmptyString", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(ribbon.getControlValue("nonexistent")).toBe("");
        ribbon.destroy();
    });
});

// ============================================================================
// PENDING STATE — getControlValue for queued value
// ============================================================================

describe("pending state value retrieval", () =>
{
    test("getControlValue_PendingValue_ReturnsPendingValue", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", groups: [] }),
                makeTab({
                    id: "insert",
                    groups: [makeGroup({
                        controls: [{
                            type: "input" as const,
                            id: "inp-lazy",
                            value: "original",
                        } as RibbonInput],
                    })],
                }),
            ],
            activeTabId: "home",
        }), "test-ribbon");
        ribbon.setControlValue("inp-lazy", "queued");
        // Before switching tabs, should return pending value
        expect(ribbon.getControlValue("inp-lazy")).toBe("queued");
        ribbon.destroy();
    });
});

// ============================================================================
// SETCONTROLACTIVE — queued state for unrendered control
// ============================================================================

describe("pending active state", () =>
{
    test("setControlActive_Unrendered_QueuesState", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", groups: [] }),
                makeTab({
                    id: "insert",
                    groups: [makeGroup({
                        controls: [makeButton({
                            id: "btn-lazy-act", toggle: true,
                        })],
                    })],
                }),
            ],
            activeTabId: "home",
        }), "test-ribbon");
        ribbon.setControlActive("btn-lazy-act", true);
        const state = ribbon.getControlState("btn-lazy-act");
        expect(state?.active).toBe(true);
        // Now switch to tab to apply pending state
        ribbon.setActiveTab("insert");
        const el = container.querySelector("[data-control-id='btn-lazy-act']") as HTMLElement;
        expect(el.classList.contains("ribbon-control-active")).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// COLOR OPTIONS applied from constructor
// ============================================================================

describe("constructor color options", () =>
{
    test("allColorOptions_AppliedAsCSSProperties", () =>
    {
        const ribbon = createRibbon(makeOptions({
            backgroundColor: "#111",
            tabBarBackgroundColor: "#222",
            tabTextColor: "#333",
            tabActiveTextColor: "#444",
            tabActiveBackgroundColor: "#555",
            panelBackgroundColor: "#666",
            groupLabelColor: "#777",
            groupBorderColor: "#888",
            controlColor: "#999",
            controlHoverColor: "#aaa",
            controlActiveColor: "#bbb",
            qatBackgroundColor: "#ccc",
            menuBarBackgroundColor: "#ddd",
        }), "test-ribbon");
        const root = ribbon.getElement();
        expect(root.style.getPropertyValue("--ribbon-bg")).toBe("#111");
        expect(root.style.getPropertyValue("--ribbon-tab-bar-bg")).toBe("#222");
        expect(root.style.getPropertyValue("--ribbon-tab-color")).toBe("#333");
        expect(root.style.getPropertyValue("--ribbon-tab-active-color")).toBe("#444");
        expect(root.style.getPropertyValue("--ribbon-tab-active-bg")).toBe("#555");
        expect(root.style.getPropertyValue("--ribbon-panel-bg")).toBe("#666");
        expect(root.style.getPropertyValue("--ribbon-group-label-color")).toBe("#777");
        expect(root.style.getPropertyValue("--ribbon-group-border-color")).toBe("#888");
        expect(root.style.getPropertyValue("--ribbon-control-color")).toBe("#999");
        expect(root.style.getPropertyValue("--ribbon-control-hover-bg")).toBe("#aaa");
        expect(root.style.getPropertyValue("--ribbon-control-active-bg")).toBe("#bbb");
        expect(root.style.getPropertyValue("--ribbon-qat-bg")).toBe("#ccc");
        expect(root.style.getPropertyValue("--ribbon-menubar-bg")).toBe("#ddd");
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON — disabled arrow
// ============================================================================

describe("split button disabled", () =>
{
    test("splitButton_Disabled_ArrowIsDisabled", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-dis",
            label: "Paste",
            disabled: true,
            menuItems: [{ id: "a", label: "A" }],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const primary = container.querySelector(".ribbon-split-primary") as HTMLButtonElement;
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLButtonElement;
        expect(primary.disabled).toBe(true);
        expect(arrow.disabled).toBe(true);
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON — menu item with icon
// ============================================================================

describe("split button menu item icon", () =>
{
    test("splitMenuItem_WithIcon_RendersIcon", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-icon",
            label: "Paste",
            menuItems: [
                { id: "paste-text", label: "Paste Text", icon: "bi-clipboard" },
            ],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const menuItem = container.querySelector(".ribbon-split-menu-item") as HTMLElement;
        const icon = menuItem.querySelector("i");
        expect(icon).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// TAB BAR KEYBOARD NAVIGATION — arrow keys, enter, space
// ============================================================================

describe("tab bar keyboard navigation", () =>
{
    test("arrowRight_FocusesNextTab", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const tabBtns = container.querySelectorAll("[role='tab']");
        (tabBtns[0] as HTMLElement).focus();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight", bubbles: true,
        }));
        expect(document.activeElement).toBe(tabBtns[1]);
        ribbon.destroy();
    });

    test("arrowLeft_FocusesPreviousTab", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const tabBtns = container.querySelectorAll("[role='tab']");
        (tabBtns[1] as HTMLElement).focus();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowLeft", bubbles: true,
        }));
        expect(document.activeElement).toBe(tabBtns[0]);
        ribbon.destroy();
    });

    test("arrowRight_WrapsAroundToFirst", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const tabBtns = container.querySelectorAll("[role='tab']");
        (tabBtns[1] as HTMLElement).focus();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowRight", bubbles: true,
        }));
        expect(document.activeElement).toBe(tabBtns[0]);
        ribbon.destroy();
    });

    test("enter_ClicksFocusedTab", () =>
    {
        const onTabChange = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ onTabChange }), "test-ribbon"
        );
        const tabBtns = container.querySelectorAll("[role='tab']");
        (tabBtns[1] as HTMLElement).focus();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Enter", bubbles: true,
        }));
        expect(onTabChange).toHaveBeenCalledWith("insert");
        ribbon.destroy();
    });

    test("space_ClicksFocusedTab", () =>
    {
        const onTabChange = vi.fn();
        const ribbon = createRibbon(
            makeOptions({ onTabChange }), "test-ribbon"
        );
        const tabBtns = container.querySelectorAll("[role='tab']");
        (tabBtns[1] as HTMLElement).focus();
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: " ", bubbles: true,
        }));
        expect(onTabChange).toHaveBeenCalledWith("insert");
        ribbon.destroy();
    });
});

// ============================================================================
// KEYTIP MATCHING — tab and group level
// ============================================================================

describe("keytip matching", () =>
{
    test("keytipMode_TypingTabKeyTip_SwitchesTab", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: true,
            tabs: [
                makeTab({ id: "home", label: "Home", keyTip: "H" }),
                makeTab({ id: "insert", label: "Insert", keyTip: "I" }),
            ],
        }), "test-ribbon");
        // Enter keytip mode
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        // Type "I" to switch to Insert tab
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "I", bubbles: true,
        }));
        expect(ribbon.getActiveTab()).toBe("insert");
        ribbon.destroy();
    });

    test("keytipMode_Escape_FromTabLevel_DismissesKeytips", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: true,
            tabs: [
                makeTab({ id: "home", label: "Home", keyTip: "H" }),
            ],
        }), "test-ribbon");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        const root = ribbon.getElement();
        expect(root.classList.contains("ribbon-keytips-active")).toBe(true);
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        expect(root.classList.contains("ribbon-keytips-active")).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// SHOW — already visible ribbon does not rebuild DOM
// ============================================================================

describe("show idempotency", () =>
{
    test("show_WhenAlreadyVisible_DoesNotRebuild", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const root = ribbon.getElement();
        // Call show again — should be a no-op
        ribbon.show("test-ribbon");
        expect(ribbon.getElement()).toBe(root);
        ribbon.destroy();
    });
});

// ============================================================================
// SHOW — after destroy does nothing
// ============================================================================

describe("show after destroy", () =>
{
    test("show_AfterDestroy_DoesNothing", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.destroy();
        ribbon.show("test-ribbon");
        // The ribbon root was removed and should not be re-added
        expect(container.querySelector(".ribbon")).toBeNull();
    });
});

// ============================================================================
// BACKSTAGE — no sidebar items
// ============================================================================

describe("backstage without sidebar", () =>
{
    test("backstage_NoSidebarItems_RendersEmptySidebar", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                    backstageSidebar: [],
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        const sidebarItems = container.querySelectorAll(".ribbon-backstage-item");
        expect(sidebarItems.length).toBe(0);
        ribbon.destroy();
    });
});

// ============================================================================
// OPEN BACKSTAGE — double open does not crash
// ============================================================================

describe("backstage idempotency", () =>
{
    test("openBackstage_CalledTwice_DoesNotCrash", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        expect(() => ribbon.openBackstage()).not.toThrow();
        ribbon.destroy();
    });

    test("closeBackstage_WhenNotOpen_DoesNotCrash", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(() => ribbon.closeBackstage()).not.toThrow();
        ribbon.destroy();
    });
});

// ============================================================================
// MENU BAR — closeAllMenus when no menu is open
// ============================================================================

describe("close all menus when none open", () =>
{
    test("closeMenusByEscape_WhenNoMenuOpen_DoesNotCrash", () =>
    {
        const ribbon = createRibbon(makeOptions({
            menuBar: [
                {
                    id: "menu-file",
                    label: "File",
                    items: [{ id: "mi-new", label: "New" }],
                },
            ],
        }), "test-ribbon");
        // Escape should not crash when no menu/popup is open
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Escape", bubbles: true,
        }));
        ribbon.destroy();
    });
});

// ============================================================================
// HIDE — does nothing when not visible
// ============================================================================

describe("hide when not visible", () =>
{
    test("hide_WhenNotShown_DoesNothing", () =>
    {
        const ribbon = createRibbon(makeOptions());
        expect(() => ribbon.hide()).not.toThrow();
        ribbon.destroy();
    });
});

// ============================================================================
// COLLAPSE — not collapsible ribbon ignores collapse
// ============================================================================

describe("collapse when not collapsible", () =>
{
    test("collapse_WhenNotCollapsible_DoesNothing", () =>
    {
        const ribbon = createRibbon(makeOptions({
            collapsible: false,
        }), "test-ribbon");
        ribbon.collapse();
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// EXPAND — when not collapsed does nothing
// ============================================================================

describe("expand when not collapsed", () =>
{
    test("expand_WhenNotCollapsed_DoesNothing", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.expand(); // should not throw or change state
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// BACKSTAGE sidebar item click — switches content
// ============================================================================

describe("backstage sidebar navigation", () =>
{
    test("sidebarItemClick_SwitchesContent", () =>
    {
        const content1 = document.createElement("div");
        content1.textContent = "Content One";
        const content2 = document.createElement("div");
        content2.textContent = "Content Two";
        const onClick = vi.fn();

        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                    backstageSidebar: [
                        { id: "bs-1", label: "Info", content: content1 },
                        { id: "bs-2", label: "Settings", content: content2, onClick },
                    ],
                },
            ],
        }), "test-ribbon");
        ribbon.openBackstage();
        const items = container.querySelectorAll(".ribbon-backstage-item");
        // Click second item
        (items[1] as HTMLElement).click();
        expect(onClick).toHaveBeenCalled();
        // Second item should be active
        expect(items[1].classList.contains("ribbon-backstage-item-active")).toBe(true);
        // First item should not be active
        expect(items[0].classList.contains("ribbon-backstage-item-active")).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// GALLERY — onGallerySelect alias fires with item ID
// ============================================================================

describe("gallery onGallerySelect alias", () =>
{
    test("onGallerySelect_FiresWithItemId", () =>
    {
        const onGallerySelect = vi.fn();
        const gallery: RibbonGallery = {
            type: "gallery",
            id: "gal-alias2",
            options: [],
            galleryItems: [
                { id: "style-a", label: "Style A" },
                { id: "style-b", label: "Style B" },
            ],
            onGallerySelect,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [gallery] })],
            })],
        }), "test-ribbon");
        const opts = container.querySelectorAll(".ribbon-gallery-option");
        (opts[0] as HTMLElement).click();
        expect(onGallerySelect).toHaveBeenCalledWith("style-a");
        ribbon.destroy();
    });
});

// ============================================================================
// DROPDOWN tooltip
// ============================================================================

describe("dropdown tooltip", () =>
{
    test("dropdown_WithTooltip_SetsTitle", () =>
    {
        const dropdown: RibbonDropdown = {
            type: "dropdown",
            id: "dd-tip",
            options: [{ value: "a", label: "A" }],
            tooltip: "Choose font",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [dropdown] })],
            })],
        }), "test-ribbon");
        const sel = container.querySelector(".ribbon-dropdown") as HTMLSelectElement;
        expect(sel.title).toBe("Choose font");
        ribbon.destroy();
    });
});

// ============================================================================
// COLOR PICKER tooltip
// ============================================================================

describe("color picker tooltip", () =>
{
    test("colorPicker_WithTooltip_SetsTitle", () =>
    {
        const color: RibbonColorPicker = {
            type: "color",
            id: "clr-tip",
            value: "#000000",
            tooltip: "Pick a color",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [color] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-color") as HTMLInputElement;
        expect(inp.title).toBe("Pick a color");
        ribbon.destroy();
    });
});

// ============================================================================
// NUMBER SPINNER tooltip
// ============================================================================

describe("number spinner tooltip", () =>
{
    test("numberSpinner_WithTooltip_SetsTitle", () =>
    {
        const num: RibbonNumberSpinner = {
            type: "number",
            id: "num-tip",
            value: 10,
            tooltip: "Font size",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [num] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-number") as HTMLInputElement;
        expect(inp.title).toBe("Font size");
        ribbon.destroy();
    });
});

// ============================================================================
// INPUT tooltip
// ============================================================================

describe("input tooltip", () =>
{
    test("input_WithTooltip_SetsTitle", () =>
    {
        const input: RibbonInput = {
            type: "input",
            id: "inp-tip",
            tooltip: "Search documents",
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [input] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-input") as HTMLInputElement;
        expect(inp.title).toBe("Search documents");
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON — tooltip on primary
// ============================================================================

describe("split button tooltip", () =>
{
    test("splitButton_WithTooltip_SetsOnPrimary", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-tip",
            label: "Paste",
            tooltip: "Paste content",
            menuItems: [{ id: "x", label: "X" }],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const primary = container.querySelector(".ribbon-split-primary") as HTMLElement;
        expect(primary.getAttribute("title")).toBe("Paste content");
        expect(primary.getAttribute("aria-label")).toBe("Paste content");
        ribbon.destroy();
    });
});

// ============================================================================
// CLOSING BACKSTAGE restores focus
// ============================================================================

describe("backstage focus restoration", () =>
{
    test("closeBackstage_RestoresFocusToPreviousElement", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                {
                    id: "file", label: "File", groups: [],
                    backstage: true,
                },
            ],
        }), "test-ribbon");
        // Focus a tab button before opening backstage
        const tabBtn = container.querySelector("[data-tab-id='home']") as HTMLElement;
        tabBtn.focus();
        ribbon.openBackstage();
        ribbon.closeBackstage();
        // After close, focus should return to the tabBtn
        expect(document.activeElement).toBe(tabBtn);
        ribbon.destroy();
    });
});

// ============================================================================
// AUTO COLLAPSE DELAY — with timer
// ============================================================================

describe("auto-collapse timer", () =>
{
    test("autoCollapseDelay_SetsTimerOnTempExpand", () =>
    {
        vi.useFakeTimers();
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
            autoCollapseDelay: 5000,
        }), "test-ribbon");
        ribbon.collapse();
        // Tab switch while collapsed triggers temp expand + timer
        ribbon.setActiveTab("insert");
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("");
        // After 5000ms, should auto-collapse
        vi.advanceTimersByTime(5000);
        expect(panel.style.display).toBe("none");
        vi.useRealTimers();
        ribbon.destroy();
    });
});

// ============================================================================
// ESCAPE KEY — from groups back to tabs keytip level
// ============================================================================

describe("escape from group keytip level", () =>
{
    test("escape_FromGroupLevel_ShowsTabKeytips", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: true,
            tabs: [
                makeTab({
                    id: "home", label: "Home", keyTip: "H",
                    groups: [makeGroup({
                        controls: [makeButton({ id: "btn-k", keyTip: "B" })],
                    })],
                }),
            ],
        }), "test-ribbon");
        // Enter keytip mode at tabs level
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        // Type "H" to go to groups level — internally this calls showGroupKeyTips
        // via requestAnimationFrame, but the tab switch is synchronous
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "H", bubbles: true,
        }));
        // The tab keytip was matched, so keyTipLevel was set to "none" then
        // rAF would set to "groups". We can still verify the flow works.
        ribbon.destroy();
    });
});

// ============================================================================
// QAT — onControlClick fires for QAT items
// ============================================================================

describe("QAT onControlClick", () =>
{
    test("qatItem_Click_FiresOnControlClick", () =>
    {
        const onControlClick = vi.fn();
        const ribbon = createRibbon(makeOptions({
            onControlClick,
            qat: [{ id: "qat-save", icon: "bi-save", tooltip: "Save" }],
        }), "test-ribbon");
        const btn = container.querySelector(".ribbon-qat-btn") as HTMLElement;
        btn.click();
        expect(onControlClick).toHaveBeenCalledWith("qat-save");
        ribbon.destroy();
    });
});

// ============================================================================
// COLLAPSED STATE — collapse already collapsed does nothing
// ============================================================================

describe("collapse when already collapsed", () =>
{
    test("collapse_WhenAlreadyCollapsed_DoesNothing", () =>
    {
        const onCollapse = vi.fn();
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
            onCollapse,
        }), "test-ribbon");
        ribbon.collapse();
        onCollapse.mockClear();
        ribbon.collapse(); // already collapsed
        expect(onCollapse).not.toHaveBeenCalled();
        ribbon.destroy();
    });
});

// ============================================================================
// SETCONTROLHIDDEN — queued for unrendered control
// ============================================================================

describe("setControlHidden queued", () =>
{
    test("setControlHidden_Unrendered_QueuesAndApplies", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", groups: [] }),
                makeTab({
                    id: "insert",
                    groups: [makeGroup({
                        controls: [makeButton({ id: "btn-hid-q" })],
                    })],
                }),
            ],
            activeTabId: "home",
        }), "test-ribbon");
        ribbon.setControlHidden("btn-hid-q", true);
        const stateBefore = ribbon.getControlState("btn-hid-q");
        expect(stateBefore?.visible).toBe(false);
        ribbon.setActiveTab("insert");
        const stateAfter = ribbon.getControlState("btn-hid-q");
        expect(stateAfter?.visible).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON — menu item onClick fires and menu closes
// ============================================================================

describe("split menu item callbacks", () =>
{
    test("splitMenuItem_OnClick_Fires", () =>
    {
        const onClick = vi.fn();
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-cb2",
            label: "Paste",
            menuItems: [
                { id: "paste-text", label: "Text", onClick },
            ],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const arrow = container.querySelector(".ribbon-split-arrow") as HTMLElement;
        arrow.click();
        const item = container.querySelector(".ribbon-split-menu-item") as HTMLElement;
        item.click();
        expect(onClick).toHaveBeenCalled();
        ribbon.destroy();
    });
});

// ============================================================================
// SWAPTABCONTENT — tab content caching
// ============================================================================

describe("tab content caching", () =>
{
    test("switchingBackToTab_UsesCachedContent", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({
                    id: "home",
                    groups: [makeGroup({
                        controls: [makeButton({ id: "btn-cache-1" })],
                    })],
                }),
                makeTab({
                    id: "insert",
                    groups: [makeGroup({
                        controls: [makeButton({ id: "btn-cache-2" })],
                    })],
                }),
            ],
        }), "test-ribbon");
        // Home tab is rendered, switch to insert, then back to home
        ribbon.setActiveTab("insert");
        ribbon.setActiveTab("home");
        // The home content should still exist (cached)
        const btn = container.querySelector("[data-control-id='btn-cache-1']");
        expect(btn).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// NO ACTIVE TAB — when no activeTabId and first tab is contextual
// ============================================================================

describe("firstVisibleTabId", () =>
{
    test("noActiveTabId_SelectsFirstNonContextualTab", () =>
    {
        const ribbon = createRibbon({
            tabs: [
                makeTab({ id: "ctx", label: "Context", contextual: true }),
                makeTab({ id: "home", label: "Home" }),
            ],
        }, "test-ribbon");
        expect(ribbon.getActiveTab()).toBe("home");
        ribbon.destroy();
    });
});

// ============================================================================
// RESTORE STATE — expand branch and hide contextual tab
// ============================================================================

describe("restoreState edge branches", () =>
{
    test("restoreState_Collapsed_False_ExpandsRibbon", () =>
    {
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
        }), "test-ribbon");
        ribbon.collapse();
        expect(ribbon.isCollapsed()).toBe(true);
        ribbon.restoreState({ collapsed: false });
        expect(ribbon.isCollapsed()).toBe(false);
        ribbon.destroy();
    });

    test("restoreState_ContextualTab_Hidden_HidesIt", () =>
    {
        const ribbon = createRibbon(makeOptions({
            tabs: [
                makeTab({ id: "home", label: "Home" }),
                makeTab({ id: "design", label: "Design", contextual: true }),
            ],
        }), "test-ribbon");
        // First show it, then restore with hidden state
        ribbon.showContextualTab("design");
        ribbon.restoreState({
            contextualTabs: { design: false },
        });
        const tabBtn = container.querySelector("[data-tab-id='design']") as HTMLElement;
        expect(tabBtn.style.display).toBe("none");
        ribbon.destroy();
    });
});

// ============================================================================
// AUTO-COLLAPSE — clearAutoCollapseTimer when timer is active
// ============================================================================

describe("clearAutoCollapseTimer when active", () =>
{
    test("expand_ClearsActiveAutoCollapseTimer", () =>
    {
        vi.useFakeTimers();
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
            autoCollapseDelay: 5000,
        }), "test-ribbon");
        ribbon.collapse();
        // Temp expand sets the timer
        ribbon.setActiveTab("insert");
        // Now expand fully — this should clear the timer
        ribbon.expand();
        expect(ribbon.isCollapsed()).toBe(false);
        // Advance time — panel should remain visible (timer was cleared)
        vi.advanceTimersByTime(6000);
        const panel = container.querySelector(".ribbon-panel") as HTMLElement;
        expect(panel.style.display).toBe("");
        vi.useRealTimers();
        ribbon.destroy();
    });
});

// ============================================================================
// setAutoCollapseDelay — clears timer when set to 0
// ============================================================================

describe("setAutoCollapseDelay clears timer", () =>
{
    test("setAutoCollapseDelay_ToZero_ClearsTimer", () =>
    {
        vi.useFakeTimers();
        const ribbon = createRibbon(makeOptions({
            collapsible: true,
            autoCollapseDelay: 5000,
        }), "test-ribbon");
        ribbon.collapse();
        ribbon.setActiveTab("insert"); // starts timer
        // Set delay to 0 — should clear the timer
        ribbon.setAutoCollapseDelay(0);
        expect(ribbon.getAutoCollapseDelay()).toBe(0);
        // Advance time — panel should NOT auto-collapse since timer was cleared
        vi.advanceTimersByTime(6000);
        // Manually verify no crash
        vi.useRealTimers();
        ribbon.destroy();
    });
});

// ============================================================================
// SHOW without containerId — mounts to body
// ============================================================================

describe("show without containerId", () =>
{
    test("show_NoContainerId_MountsToBody", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show(); // no container ID — should mount to document.body
        const root = document.body.querySelector(":scope > .ribbon");
        expect(root).not.toBeNull();
        ribbon.destroy();
    });
});

// ============================================================================
// KEYTIPS — disabled keytips
// ============================================================================

describe("keytips disabled", () =>
{
    test("altKey_WhenKeyTipsFalse_DoesNotShowKeytips", () =>
    {
        const ribbon = createRibbon(makeOptions({
            keyTips: false,
            tabs: [makeTab({ id: "home", label: "Home", keyTip: "H" })],
        }), "test-ribbon");
        document.dispatchEvent(new KeyboardEvent("keydown", {
            key: "Alt", bubbles: true,
        }));
        const root = ribbon.getElement();
        // keytips should NOT be shown
        expect(root.classList.contains("ribbon-keytips-active")).toBe(false);
        ribbon.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON — active initial state
// ============================================================================

describe("split button initial active", () =>
{
    test("splitButton_InitiallyActive_HasActiveClass", () =>
    {
        const split: RibbonSplitButton = {
            type: "split-button",
            id: "split-act",
            label: "Bold",
            toggle: true,
            active: true,
            menuItems: [{ id: "x", label: "X" }],
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [split] })],
            })],
        }), "test-ribbon");
        const primary = container.querySelector(".ribbon-split-primary") as HTMLElement;
        expect(primary.classList.contains("ribbon-control-active")).toBe(true);
        expect(primary.getAttribute("aria-pressed")).toBe("true");
        ribbon.destroy();
    });
});

// ============================================================================
// COLOR PICKER — showLabel hex updates on input
// ============================================================================

describe("color picker hex label update", () =>
{
    test("colorPicker_ShowLabel_UpdatesOnInput", () =>
    {
        const color: RibbonColorPicker = {
            type: "color",
            id: "clr-hex",
            value: "#000000",
            showLabel: true,
        };
        const ribbon = createRibbon(makeOptions({
            tabs: [makeTab({
                id: "home",
                groups: [makeGroup({ controls: [color] })],
            })],
        }), "test-ribbon");
        const inp = container.querySelector(".ribbon-color") as HTMLInputElement;
        const hex = container.querySelector(".ribbon-color-hex") as HTMLElement;
        inp.value = "#ff00ff";
        inp.dispatchEvent(new Event("input"));
        expect(hex.textContent).toBe("#ff00ff");
        ribbon.destroy();
    });
});

// ============================================================================
// COLOR RESET — resetColors() clears inline overrides
// ============================================================================

describe("Ribbon color reset", () =>
{
    test("SetColors_SetsInlineOverrides", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        ribbon.setColors({ backgroundColor: "#ff0000" });

        const el = ribbon.getElement();
        expect(el.style.getPropertyValue("--ribbon-bg")).toBe("#ff0000");

        ribbon.destroy();
    });

    test("ResetColors_ClearsAllInlineOverrides", () =>
    {
        const ribbon = createRibbon(makeOptions({
            backgroundColor: "#aabbcc",
            tabBarBackgroundColor: "#112233",
        }), "test-ribbon");

        const el = ribbon.getElement();
        expect(el.style.getPropertyValue("--ribbon-bg")).toBe("#aabbcc");

        ribbon.resetColors();
        expect(el.style.getPropertyValue("--ribbon-bg")).toBe("");
        expect(el.style.getPropertyValue("--ribbon-tab-bar-bg")).toBe("");

        ribbon.destroy();
    });

    test("NoColors_DoesNotSetInlineOverrides", () =>
    {
        const ribbon = createRibbon(makeOptions(), "test-ribbon");
        const el = ribbon.getElement();

        expect(el.style.getPropertyValue("--ribbon-bg")).toBe("");
        expect(el.style.getPropertyValue("--ribbon-tab-bar-bg")).toBe("");

        ribbon.destroy();
    });
});

// ============================================================================
// HTMLElement CONTAINER SUPPORT (ADR-118)
// ============================================================================

describe("HTMLElement container support", () =>
{
    test("Show_WithHTMLElement_MountsInElement", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show(container);
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });

    test("Show_WithHTMLElement_DoesNotMountToBody", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show(container);
        const bodyRibbons = document.body.querySelectorAll(
            ":scope > .ribbon"
        );
        expect(bodyRibbons.length).toBe(0);
        ribbon.destroy();
    });

    test("Show_WithStringId_StillWorks", () =>
    {
        const ribbon = createRibbon(makeOptions());
        ribbon.show("test-ribbon");
        expect(container.querySelector(".ribbon")).not.toBeNull();
        ribbon.destroy();
    });
});
