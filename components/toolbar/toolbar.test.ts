/**
 * ⚓ TESTS: Toolbar
 * Comprehensive Vitest unit tests for the Toolbar component.
 * Covers: factory, options, regions, tool items, split buttons,
 * tool state, visibility, orientation, mode, and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    Toolbar,
    createToolbar,
} from "./toolbar";
import type
{
    ToolbarOptions,
    ToolbarRegion,
    ToolItem,
    SplitButtonItem,
    SplitMenuItem,
} from "./toolbar";

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

/**
 * jsdom does not provide ResizeObserver. Provide a minimal mock so
 * Toolbar.attachResizeObserver() can succeed without throwing.
 */
if (typeof globalThis.ResizeObserver === "undefined")
{
    globalThis.ResizeObserver = class ResizeObserver
    {
        constructor(_cb: ResizeObserverCallback) {}
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    } as unknown as typeof globalThis.ResizeObserver;
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makeOptions(overrides?: Partial<ToolbarOptions>): ToolbarOptions
{
    return {
        label: "Test Toolbar",
        regions: [
            {
                id: "rgn1",
                title: "Region One",
                items: [
                    {
                        id: "tool-bold",
                        icon: "bi-type-bold",
                        tooltip: "Bold",
                        label: "Bold",
                    } as ToolItem,
                    {
                        id: "tool-italic",
                        icon: "bi-type-italic",
                        tooltip: "Italic",
                        label: "Italic",
                    } as ToolItem,
                ],
            },
        ],
        contained: true,
        ...overrides,
    };
}

function makeSplitButtonRegion(): ToolbarRegion
{
    return {
        id: "rgn-split",
        title: "Split Region",
        items: [
            {
                type: "split-button",
                id: "split-paste",
                icon: "bi-clipboard",
                tooltip: "Paste",
                label: "Paste",
                menuItems: [
                    { id: "paste-plain", label: "Paste Plain Text" },
                    { id: "paste-format", label: "Paste with Formatting" },
                ] as SplitMenuItem[],
            } as SplitButtonItem,
        ],
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "toolbar-test-container";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createToolbar
// ============================================================================

describe("createToolbar", () =>
{
    test("createToolbar_ValidOptions_ReturnsToolbarInstance", () =>
    {
        const tb = createToolbar(makeOptions());
        expect(tb).toBeInstanceOf(Toolbar);
        tb.destroy();
    });

    test("createToolbar_ValidOptions_ShowsToolbarInBody", () =>
    {
        const tb = createToolbar(makeOptions());
        expect(tb.isVisible()).toBe(true);
        tb.destroy();
    });

    test("createToolbar_ValidOptions_GetElementReturnsHTMLElement", () =>
    {
        const tb = createToolbar(makeOptions());
        expect(tb.getElement()).toBeInstanceOf(HTMLElement);
        tb.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR — Toolbar
// ============================================================================

describe("Toolbar constructor", () =>
{
    test("Constructor_WithId_SetsCustomId", () =>
    {
        const tb = new Toolbar(makeOptions({ id: "my-tb" }));
        tb.show(container);
        const el = tb.getElement();
        expect(el?.id).toBe("my-tb");
        tb.destroy();
    });

    test("Constructor_WithDefaultOptions_OrientationIsHorizontal", () =>
    {
        const tb = new Toolbar(makeOptions());
        expect(tb.getOrientation()).toBe("horizontal");
        tb.destroy();
    });

    test("Constructor_WithVerticalOrientation_SetsVertical", () =>
    {
        const tb = new Toolbar(makeOptions({ orientation: "vertical" }));
        expect(tb.getOrientation()).toBe("vertical");
        tb.destroy();
    });

    test("Constructor_WithDefaultOptions_ModeIsDocked", () =>
    {
        const tb = new Toolbar(makeOptions());
        expect(tb.getMode()).toBe("docked");
        tb.destroy();
    });

    test("Constructor_WithFloatingMode_SetsFloating", () =>
    {
        const tb = new Toolbar(makeOptions({ mode: "floating" }));
        expect(tb.getMode()).toBe("floating");
        tb.destroy();
    });
});

// ============================================================================
// RENDERING — Regions and Tools
// ============================================================================

describe("Toolbar rendering", () =>
{
    test("Show_SingleRegion_RendersRegionElement", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        const regionEl = container.querySelector("[data-region-id='rgn1']");
        expect(regionEl).not.toBeNull();
        tb.destroy();
    });

    test("Show_TwoToolItems_RendersTwoButtons", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        const buttons = container.querySelectorAll(
            "[data-tool-id='tool-bold'], [data-tool-id='tool-italic']"
        );
        expect(buttons.length).toBe(2);
        tb.destroy();
    });

    test("Show_WithRegionTitle_RendersRegionTitleText", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        const title = container.querySelector(".toolbar-region-title");
        expect(title).not.toBeNull();
        expect(title?.textContent).toContain("Region One");
        tb.destroy();
    });

    test("Show_WithToolbarLabel_SetsAriaLabel", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        const el = tb.getElement();
        expect(el?.getAttribute("role")).toBe("toolbar");
        expect(el?.getAttribute("aria-label")).toBe("Test Toolbar");
        tb.destroy();
    });
});

// ============================================================================
// TOOL CLICK CALLBACK
// ============================================================================

describe("Toolbar tool click", () =>
{
    test("ToolClick_WithOnClick_FiresCallback", () =>
    {
        const onClick = vi.fn();
        const opts = makeOptions({
            regions: [
                {
                    id: "r1",
                    items: [
                        {
                            id: "t1",
                            tooltip: "Tool 1",
                            icon: "bi-star",
                            onClick,
                        } as ToolItem,
                    ],
                },
            ],
        });
        const tb = new Toolbar(opts);
        tb.show(container);
        const btn = container.querySelector("[data-tool-id='t1']") as HTMLElement;
        btn?.click();
        expect(onClick).toHaveBeenCalled();
        tb.destroy();
    });

    test("ToolClick_ToggleTool_TogglesActiveState", () =>
    {
        const opts = makeOptions({
            regions: [
                {
                    id: "r1",
                    items: [
                        {
                            id: "t-toggle",
                            tooltip: "Toggle",
                            icon: "bi-star",
                            toggle: true,
                            active: false,
                        } as ToolItem,
                    ],
                },
            ],
        });
        const tb = new Toolbar(opts);
        tb.show(container);
        const btn = container.querySelector("[data-tool-id='t-toggle']") as HTMLElement;
        btn?.click();
        const state = tb.getToolState("t-toggle");
        expect(state.active).toBe(true);
        tb.destroy();
    });

    test("ToolClick_GlobalOnToolClick_FiresGlobalCallback", () =>
    {
        const globalCb = vi.fn();
        const opts = makeOptions({
            onToolClick: globalCb,
            regions: [
                {
                    id: "r1",
                    items: [
                        { id: "t1", tooltip: "T1", icon: "bi-star" } as ToolItem,
                    ],
                },
            ],
        });
        const tb = new Toolbar(opts);
        tb.show(container);
        const btn = container.querySelector("[data-tool-id='t1']") as HTMLElement;
        btn?.click();
        expect(globalCb).toHaveBeenCalled();
        tb.destroy();
    });
});

// ============================================================================
// SPLIT BUTTON
// ============================================================================

describe("Toolbar split button", () =>
{
    test("SplitButton_Rendered_HasDropdownArrow", () =>
    {
        const opts = makeOptions({ regions: [makeSplitButtonRegion()] });
        const tb = new Toolbar(opts);
        tb.show(container);
        const splitEl = container.querySelector("[data-tool-id='split-paste']");
        expect(splitEl).not.toBeNull();
        const arrow = container.querySelector(".toolbar-split-arrow");
        expect(arrow).not.toBeNull();
        tb.destroy();
    });

    test("SplitButton_PrimaryClick_FiresOnClick", () =>
    {
        const onClick = vi.fn();
        const region: ToolbarRegion = {
            id: "rgn-split",
            items: [
                {
                    type: "split-button",
                    id: "split-test",
                    icon: "bi-clipboard",
                    tooltip: "Paste",
                    label: "Paste",
                    onClick,
                    menuItems: [{ id: "m1", label: "Option 1" }],
                } as SplitButtonItem,
            ],
        };
        const opts = makeOptions({ regions: [region] });
        const tb = new Toolbar(opts);
        tb.show(container);
        const primaryBtn = container.querySelector(
            "[data-tool-id='split-test'] .toolbar-split-primary"
        ) as HTMLElement;
        primaryBtn?.click();
        expect(onClick).toHaveBeenCalled();
        tb.destroy();
    });
});

// ============================================================================
// HANDLE METHODS — setToolState / getToolState
// ============================================================================

describe("Toolbar setToolState / getToolState", () =>
{
    test("setToolState_Disabled_DisablesTool", () =>
    {
        const opts = makeOptions();
        const tb = new Toolbar(opts);
        tb.show(container);
        tb.setToolState("tool-bold", { disabled: true });
        const state = tb.getToolState("tool-bold");
        expect(state.disabled).toBe(true);
        tb.destroy();
    });

    test("setToolState_Active_SetsActiveState", () =>
    {
        const opts = makeOptions({
            regions: [
                {
                    id: "r1",
                    items: [
                        {
                            id: "t1",
                            tooltip: "T",
                            icon: "bi-star",
                            toggle: true,
                        } as ToolItem,
                    ],
                },
            ],
        });
        const tb = new Toolbar(opts);
        tb.show(container);
        tb.setToolState("t1", { active: true });
        const state = tb.getToolState("t1");
        expect(state.active).toBe(true);
        tb.destroy();
    });

    test("setToolState_Hidden_HidesTool", () =>
    {
        const opts = makeOptions();
        const tb = new Toolbar(opts);
        tb.show(container);
        tb.setToolState("tool-bold", { hidden: true });
        const state = tb.getToolState("tool-bold");
        expect(state.hidden).toBe(true);
        tb.destroy();
    });

    test("getToolState_UnknownId_ReturnsUndefined", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        const state = tb.getToolState("nonexistent");
        expect(state).toBeUndefined();
        tb.destroy();
    });
});

// ============================================================================
// HANDLE METHODS — destroy
// ============================================================================

describe("Toolbar destroy", () =>
{
    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        expect(tb.isVisible()).toBe(true);
        tb.destroy();
        expect(tb.isVisible()).toBe(false);
        expect(tb.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        tb.destroy();
        expect(() => tb.destroy()).not.toThrow();
    });
});

// ============================================================================
// MODE AND ORIENTATION
// ============================================================================

describe("Toolbar mode and orientation", () =>
{
    test("Dock_ToBottom_ChangesDockPosition", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        tb.dock("bottom");
        expect(tb.getDockPosition()).toBe("bottom");
        tb.destroy();
    });

    test("Float_WithCoords_SetsFloatingMode", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        tb.float(200, 300);
        expect(tb.getMode()).toBe("floating");
        tb.destroy();
    });

    test("SetOrientation_Vertical_ChangesOrientation", () =>
    {
        const tb = new Toolbar(makeOptions());
        tb.show(container);
        tb.setOrientation("vertical");
        expect(tb.getOrientation()).toBe("vertical");
        tb.destroy();
    });
});

// ============================================================================
// CONTAINED MODE
// ============================================================================

describe("Toolbar contained mode", () =>
{
    test("SetContained_True_SetsContainedState", () =>
    {
        const tb = new Toolbar(makeOptions({ contained: false }));
        tb.show(container);
        tb.setContained(true);
        expect(tb.isContained()).toBe(true);
        tb.destroy();
    });

    test("Constructor_ContainedTrue_StartsContained", () =>
    {
        const tb = new Toolbar(makeOptions({ contained: true }));
        tb.show(container);
        expect(tb.isContained()).toBe(true);
        tb.destroy();
    });
});
