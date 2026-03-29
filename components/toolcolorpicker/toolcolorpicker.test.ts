/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d2f84c19-6a3b-4e5d-9c71-8b0f3a1e6d42
 * Created: 2026-03-24
 */

/**
 * Tests: ToolColorPicker
 * Comprehensive Vitest unit tests for the ToolColorPicker component.
 * Covers: creation, default colours, setValue, getValue, onChange,
 * setTool, setColors, layout modes, built-in colour packs, destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createToolColorPicker,
    PEN_COLORS,
    MARKER_COLORS,
    HIGHLIGHTER_COLORS,
    PENCIL_COLORS,
    BRUSH_COLORS,
} from "./toolcolorpicker";
import type {
    ToolColorPickerOptions,
    ToolColor,
    ToolColorPickerAPI,
} from "./toolcolorpicker";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function createContainer(): HTMLDivElement
{
    const el = document.createElement("div");
    el.id = "test-tcp-container";
    document.body.appendChild(el);
    return el;
}

function removeContainer(): void
{
    if (container && container.parentNode)
    {
        container.parentNode.removeChild(container);
    }
}

function defaultOpts(
    overrides?: Partial<ToolColorPickerOptions>
): ToolColorPickerOptions
{
    return {
        container: "test-tcp-container",
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = createContainer();
});

afterEach(() =>
{
    removeContainer();
});

// ============================================================================
// CREATION
// ============================================================================

describe("createToolColorPicker", () =>
{
    test("Factory_WithContainerId_ReturnsApi", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        expect(picker).toBeDefined();
        expect(picker.getValue).toBeDefined();
        picker.destroy();
    });

    test("Factory_MountsElementInContainer", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        expect(container.children.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("Factory_WithHTMLElement_MountsCorrectly", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ container })
        );
        expect(container.querySelector(".toolcolorpicker")).not.toBeNull();
        picker.destroy();
    });

    test("Factory_InvalidContainer_ReturnsNullApi", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ container: "nonexistent-id" })
        );
        expect(picker.getElement()).toBeNull();
    });

    test("Factory_SetsRoleRadiogroup", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        expect(el?.getAttribute("role")).toBe("radiogroup");
        picker.destroy();
    });
});

// ============================================================================
// DEFAULT PEN COLORS
// ============================================================================

describe("default pen colors", () =>
{
    test("DefaultTool_IsPen", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBe(PEN_COLORS.length);
        picker.destroy();
    });

    test("DefaultValue_IsFirstColor", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const value = picker.getValue();
        expect(value.hex).toBe(PEN_COLORS[0].hex);
        picker.destroy();
    });

    test("FirstSwatch_IsSelectedByDefault", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const selected = el?.querySelector(".toolcolorpicker-swatch--selected");
        expect(selected).not.toBeNull();
        expect(selected?.getAttribute("data-hex")).toBe(PEN_COLORS[0].hex);
        picker.destroy();
    });
});

// ============================================================================
// setValue / getValue
// ============================================================================

describe("setValue and getValue", () =>
{
    test("setValue_ValidHex_UpdatesValue", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setValue("#dc3545");
        expect(picker.getValue().hex).toBe("#dc3545");
        picker.destroy();
    });

    test("setValue_UpdatesSelectedVisual", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setValue("#0d6efd");
        const el = picker.getElement();
        const selected = el?.querySelector(".toolcolorpicker-swatch--selected");
        expect(selected?.getAttribute("data-hex")).toBe("#0d6efd");
        picker.destroy();
    });

    test("setValue_DeselectsPrevious", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setValue("#dc3545");
        const el = picker.getElement();
        const allSelected = el?.querySelectorAll(
            ".toolcolorpicker-swatch--selected"
        );
        expect(allSelected?.length).toBe(1);
        picker.destroy();
    });

    test("getValue_ReturnsToolColorObject", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ value: "#198754" })
        );
        const value = picker.getValue();
        expect(value.hex).toBe("#198754");
        expect(value.label).toBe("Green");
        picker.destroy();
    });

    test("getValue_UnknownHex_ReturnsFallback", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setValue("#abcdef");
        const value = picker.getValue();
        // Falls back to first colour since #abcdef is not in PEN_COLORS
        expect(value.hex).toBe(PEN_COLORS[0].hex);
        picker.destroy();
    });
});

// ============================================================================
// onChange
// ============================================================================

describe("onChange callback", () =>
{
    test("ClickSwatch_FiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = createToolColorPicker(
            defaultOpts({ onChange })
        );
        const el = picker.getElement();
        const secondSwatch = el?.querySelectorAll(
            ".toolcolorpicker-swatch"
        )[1] as HTMLElement;
        secondSwatch?.click();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(PEN_COLORS[1]);
        picker.destroy();
    });

    test("ClickSameSwatch_StillFiresOnChange", () =>
    {
        const onChange = vi.fn();
        const picker = createToolColorPicker(
            defaultOpts({ onChange, value: PEN_COLORS[0].hex })
        );
        const el = picker.getElement();
        const firstSwatch = el?.querySelector(
            ".toolcolorpicker-swatch"
        ) as HTMLElement;
        firstSwatch?.click();
        expect(onChange).toHaveBeenCalledTimes(1);
        picker.destroy();
    });
});

// ============================================================================
// setTool — changes icon shapes
// ============================================================================

describe("setTool", () =>
{
    test("SetTool_ToMarker_RebuildsSvgs", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setTool("marker");
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        // After setTool, swatches should still exist
        expect(swatches?.length).toBeGreaterThan(0);
        // Each swatch should have an SVG icon
        const firstSvg = swatches?.[0]?.querySelector("svg");
        expect(firstSvg).not.toBeNull();
        picker.destroy();
    });

    test("SetTool_ToPencil_KeepsCurrentColors", () =>
    {
        const customColors: ToolColor[] =
        [
            { hex: "#ff0000", label: "Red" },
            { hex: "#00ff00", label: "Green" },
        ];
        const picker = createToolColorPicker(
            defaultOpts({ colors: customColors })
        );
        picker.setTool("pencil");
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBe(2);
        picker.destroy();
    });

    test("SetTool_ToBrush_RendersToolIcons", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setTool("brush");
        const el = picker.getElement();
        const icons = el?.querySelectorAll(".toolcolorpicker-icon");
        expect(icons?.length).toBeGreaterThan(0);
        picker.destroy();
    });

    test("SetTool_ToHighlighter_RendersCorrectly", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.setTool("highlighter");
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBeGreaterThan(0);
        picker.destroy();
    });
});

// ============================================================================
// setColors
// ============================================================================

describe("setColors", () =>
{
    test("SetColors_NewArray_UpdatesSwatchCount", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const newColors: ToolColor[] =
        [
            { hex: "#111111", label: "One" },
            { hex: "#222222", label: "Two" },
            { hex: "#333333", label: "Three" },
        ];
        picker.setColors(newColors);
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBe(3);
        picker.destroy();
    });

    test("SetColors_ResetsSelectionToFirst", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const newColors: ToolColor[] =
        [
            { hex: "#aaaaaa", label: "Alpha" },
            { hex: "#bbbbbb", label: "Beta" },
        ];
        picker.setColors(newColors);
        expect(picker.getValue().hex).toBe("#aaaaaa");
        picker.destroy();
    });

    test("SetColors_KeepsSelectionIfHexExists", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ value: "#dc3545" })
        );
        const newColors: ToolColor[] =
        [
            { hex: "#000000", label: "Black" },
            { hex: "#dc3545", label: "Red" },
        ];
        picker.setColors(newColors);
        expect(picker.getValue().hex).toBe("#dc3545");
        picker.destroy();
    });
});

// ============================================================================
// LAYOUT MODES
// ============================================================================

describe("layout modes", () =>
{
    test("Layout_Row_AppliesRowClass", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ layout: "row" })
        );
        const el = picker.getElement();
        const swatches = el?.querySelector(".toolcolorpicker-swatches--row");
        expect(swatches).not.toBeNull();
        picker.destroy();
    });

    test("Layout_Grid_AppliesGridClass", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ layout: "grid" })
        );
        const el = picker.getElement();
        const swatches = el?.querySelector(".toolcolorpicker-swatches--grid");
        expect(swatches).not.toBeNull();
        picker.destroy();
    });

    test("Layout_Grid_SetsColumnTemplate", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ layout: "grid", gridColumns: 4 })
        );
        const el = picker.getElement();
        const swatches = el?.querySelector(
            ".toolcolorpicker-swatches--grid"
        ) as HTMLElement;
        expect(swatches?.style.gridTemplateColumns).toBe("repeat(4, 1fr)");
        picker.destroy();
    });

    test("Layout_Default_IsRow", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const row = el?.querySelector(".toolcolorpicker-swatches--row");
        expect(row).not.toBeNull();
        picker.destroy();
    });
});

// ============================================================================
// BUILT-IN COLOR PACKS
// ============================================================================

describe("built-in color packs", () =>
{
    test("PEN_COLORS_Has7Entries", () =>
    {
        expect(PEN_COLORS.length).toBe(7);
    });

    test("MARKER_COLORS_Has6Entries", () =>
    {
        expect(MARKER_COLORS.length).toBe(6);
    });

    test("HIGHLIGHTER_COLORS_Has6Entries", () =>
    {
        expect(HIGHLIGHTER_COLORS.length).toBe(6);
    });

    test("PENCIL_COLORS_Has6Entries", () =>
    {
        expect(PENCIL_COLORS.length).toBe(6);
    });

    test("BRUSH_COLORS_Has8Entries", () =>
    {
        expect(BRUSH_COLORS.length).toBe(8);
    });

    test("StaticProperties_AvailableOnFactory", () =>
    {
        expect(createToolColorPicker.PEN_COLORS).toBe(PEN_COLORS);
        expect(createToolColorPicker.MARKER_COLORS).toBe(MARKER_COLORS);
        expect(createToolColorPicker.HIGHLIGHTER_COLORS).toBe(HIGHLIGHTER_COLORS);
        expect(createToolColorPicker.PENCIL_COLORS).toBe(PENCIL_COLORS);
        expect(createToolColorPicker.BRUSH_COLORS).toBe(BRUSH_COLORS);
    });

    test("MarkerTool_DefaultsToMarkerColors", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ tool: "marker" })
        );
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBe(MARKER_COLORS.length);
        picker.destroy();
    });

    test("HighlighterTool_DefaultsToHighlighterColors", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ tool: "highlighter" })
        );
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        expect(swatches?.length).toBe(HIGHLIGHTER_COLORS.length);
        picker.destroy();
    });

    test("HighlighterColors_HaveAlpha", () =>
    {
        for (const color of HIGHLIGHTER_COLORS)
        {
            expect(color.alpha).toBe(0.4);
        }
    });

    test("MarkerColors_HaveAlpha", () =>
    {
        for (const color of MARKER_COLORS)
        {
            expect(color.alpha).toBe(0.6);
        }
    });
});

// ============================================================================
// TOOLTIPS
// ============================================================================

describe("tooltips", () =>
{
    test("ShowTooltips_True_SetsTitleAttribute", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ showTooltips: true })
        );
        const el = picker.getElement();
        const firstSwatch = el?.querySelector(
            ".toolcolorpicker-swatch"
        ) as HTMLElement;
        expect(firstSwatch?.title).toBe(PEN_COLORS[0].label);
        picker.destroy();
    });

    test("ShowTooltips_False_NoTitleAttribute", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ showTooltips: false })
        );
        const el = picker.getElement();
        const firstSwatch = el?.querySelector(
            ".toolcolorpicker-swatch"
        ) as HTMLElement;
        expect(firstSwatch?.title).toBe("");
        picker.destroy();
    });
});

// ============================================================================
// DESTROY
// ============================================================================

describe("destroy", () =>
{
    test("Destroy_RemovesFromDOM", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        expect(container.querySelector(".toolcolorpicker")).not.toBeNull();
        picker.destroy();
        expect(container.querySelector(".toolcolorpicker")).toBeNull();
    });

    test("Destroy_GetElementReturnsNull", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.destroy();
        expect(picker.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_DoesNotThrow", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.destroy();
        expect(() => picker.destroy()).not.toThrow();
    });

    test("Destroy_SetValueAfter_NoOp", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        picker.destroy();
        expect(() => picker.setValue("#000000")).not.toThrow();
    });
});

// ============================================================================
// ALL 5 TOOL ICON RENDERERS
// ============================================================================

describe("all 5 tool icon renderers", () =>
{
    test("PenTool_RendersSvgWithBodyAndNib", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "pen" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        expect(icon).not.toBeNull();
        // Pen has 3 children: body path, nib path, clip rect
        const children = icon?.children;
        expect(children?.length).toBe(3);
        picker.destroy();
    });

    test("MarkerTool_RendersSvgWithBodyAndTip", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "marker" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        expect(icon).not.toBeNull();
        // Marker has 3 children: body path, tip path, ridge line
        const children = icon?.children;
        expect(children?.length).toBe(3);
        picker.destroy();
    });

    test("PencilTool_RendersSvgWithEraserAndBody", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "pencil" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        expect(icon).not.toBeNull();
        // Pencil has 5 children: eraser, ferrule, body, wood, tip
        const children = icon?.children;
        expect(children?.length).toBe(5);
        picker.destroy();
    });

    test("HighlighterTool_RendersSvgWithGripAndTip", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "highlighter" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        expect(icon).not.toBeNull();
        // Highlighter has 3 children: body path, grip rect, tip path
        const children = icon?.children;
        expect(children?.length).toBe(3);
        picker.destroy();
    });

    test("BrushTool_RendersSvgWithHandleAndBristles", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "brush" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        expect(icon).not.toBeNull();
        // Brush has 3 children: handle rect, ferrule rect, bristles path
        const children = icon?.children;
        expect(children?.length).toBe(3);
        picker.destroy();
    });
});

// ============================================================================
// ALPHA-AWARE COLORS (highlighter with alpha)
// ============================================================================

describe("alpha-aware colors", () =>
{
    test("HighlighterColors_SwatchFillUsesAlpha", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ tool: "highlighter" })
        );
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        // The body fill should contain the alpha value (0.4)
        const body = icon?.children[0];
        const fill = body?.getAttribute("fill") ?? "";
        expect(fill).toContain("0.4");
        picker.destroy();
    });

    test("PenColors_SwatchFillIsFullyOpaque", () =>
    {
        const picker = createToolColorPicker(defaultOpts({ tool: "pen" }));
        const el = picker.getElement();
        const icon = el?.querySelector(".toolcolorpicker-icon");
        const body = icon?.children[0];
        const fill = body?.getAttribute("fill") ?? "";
        // Pen colours have no alpha, so rgba uses 1
        expect(fill).toContain(", 1)");
        picker.destroy();
    });
});

// ============================================================================
// GRID LAYOUT WITH CUSTOM COLUMNS
// ============================================================================

describe("grid layout with custom columns", () =>
{
    test("Grid_5Columns_SetsCorrectTemplate", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ layout: "grid", gridColumns: 5 })
        );
        const el = picker.getElement();
        const grid = el?.querySelector(
            ".toolcolorpicker-swatches--grid"
        ) as HTMLElement;
        expect(grid?.style.gridTemplateColumns).toBe("repeat(5, 1fr)");
        picker.destroy();
    });

    test("Grid_DefaultColumns_Uses6", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ layout: "grid" })
        );
        const el = picker.getElement();
        const grid = el?.querySelector(
            ".toolcolorpicker-swatches--grid"
        ) as HTMLElement;
        expect(grid?.style.gridTemplateColumns).toBe("repeat(6, 1fr)");
        picker.destroy();
    });
});

// ============================================================================
// BUILT-IN COLOR PACK STATIC PROPERTIES
// ============================================================================

describe("built-in color pack static properties", () =>
{
    test("PEN_COLORS_FirstIsBlack", () =>
    {
        expect(PEN_COLORS[0].hex).toBe("#000000");
        expect(PEN_COLORS[0].label).toBe("Black");
    });

    test("MARKER_COLORS_AllHaveAlpha06", () =>
    {
        for (const color of MARKER_COLORS)
        {
            expect(color.alpha).toBe(0.6);
        }
    });

    test("HIGHLIGHTER_COLORS_AllHaveAlpha04", () =>
    {
        for (const color of HIGHLIGHTER_COLORS)
        {
            expect(color.alpha).toBe(0.4);
        }
    });

    test("PENCIL_COLORS_NoneHaveAlpha", () =>
    {
        for (const color of PENCIL_COLORS)
        {
            expect(color.alpha).toBeUndefined();
        }
    });

    test("BRUSH_COLORS_NoneHaveAlpha", () =>
    {
        for (const color of BRUSH_COLORS)
        {
            expect(color.alpha).toBeUndefined();
        }
    });
});

// ============================================================================
// TOOLTIP RENDERING — ADDITIONAL COVERAGE
// ============================================================================

describe("tooltip rendering additional coverage", () =>
{
    test("ShowTooltips_Default_HasTitle", () =>
    {
        // Default is showTooltips: true
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(
            ".toolcolorpicker-swatch"
        );
        for (const swatch of swatches!)
        {
            expect((swatch as HTMLElement).title).not.toBe("");
        }
        picker.destroy();
    });

    test("ShowTooltips_False_NoTitleOnAnySwatches", () =>
    {
        const picker = createToolColorPicker(
            defaultOpts({ showTooltips: false })
        );
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(
            ".toolcolorpicker-swatch"
        );
        for (const swatch of swatches!)
        {
            expect((swatch as HTMLElement).title).toBe("");
        }
        picker.destroy();
    });
});

// ============================================================================
// SWATCH ARIA LABELS
// ============================================================================

describe("swatch aria labels", () =>
{
    test("EachSwatch_HasAriaLabel", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        for (const swatch of swatches!)
        {
            expect(swatch.getAttribute("aria-label")).not.toBe("");
        }
        picker.destroy();
    });

    test("EachSwatch_HasDataHex", () =>
    {
        const picker = createToolColorPicker(defaultOpts());
        const el = picker.getElement();
        const swatches = el?.querySelectorAll(".toolcolorpicker-swatch");
        for (const swatch of swatches!)
        {
            const hex = swatch.getAttribute("data-hex");
            expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
        }
        picker.destroy();
    });
});
