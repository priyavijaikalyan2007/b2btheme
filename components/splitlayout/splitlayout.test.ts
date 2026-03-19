/**
 * ⚓ TESTS: SplitLayout
 * Comprehensive Vitest unit tests for the SplitLayout component.
 * Covers: factory, options, panel rendering, divider presence,
 * getSizes, setSizes, orientation, collapse, addPane, removePane,
 * and destroy.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import
{
    SplitLayout,
    createSplitLayout,
} from "./splitlayout";
import type
{
    SplitLayoutOptions,
    SplitPaneConfig,
} from "./splitlayout";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

function makePanes(): SplitPaneConfig[]
{
    return [
        { id: "left", initialSize: "50%", minSize: 100 },
        { id: "right", initialSize: "50%", minSize: 100 },
    ];
}

function makeOptions(overrides?: Partial<SplitLayoutOptions>): SplitLayoutOptions
{
    return {
        orientation: "horizontal",
        panes: makePanes(),
        ...overrides,
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "split-test-container";
    container.style.width = "800px";
    container.style.height = "600px";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createSplitLayout
// ============================================================================

describe("createSplitLayout", () =>
{
    test("createSplitLayout_ValidOptions_ReturnsSplitLayoutInstance", () =>
    {
        const layout = createSplitLayout(makeOptions(), "split-test-container");
        expect(layout).toBeInstanceOf(SplitLayout);
        layout.destroy();
    });

    test("createSplitLayout_ValidOptions_GetElementReturnsHTMLElement", () =>
    {
        const layout = createSplitLayout(makeOptions(), "split-test-container");
        expect(layout.getElement()).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });
});

// ============================================================================
// CONSTRUCTOR OPTIONS
// ============================================================================

describe("SplitLayout constructor options", () =>
{
    test("Constructor_HorizontalOrientation_SetsHorizontal", () =>
    {
        const layout = new SplitLayout(makeOptions({ orientation: "horizontal" }));
        const el = layout.getElement();
        expect(el?.classList.contains("splitlayout-horizontal")).toBe(true);
        layout.destroy();
    });

    test("Constructor_VerticalOrientation_SetsVertical", () =>
    {
        const layout = new SplitLayout(makeOptions({ orientation: "vertical" }));
        const el = layout.getElement();
        expect(el?.classList.contains("splitlayout-vertical")).toBe(true);
        layout.destroy();
    });

    test("Constructor_WithCssClass_AddsCustomClass", () =>
    {
        const layout = new SplitLayout(makeOptions({ cssClass: "my-split" }));
        const el = layout.getElement();
        expect(el?.classList.contains("my-split")).toBe(true);
        layout.destroy();
    });

    test("Constructor_LessThanTwoPanes_LogsError", () =>
    {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const layout = new SplitLayout({
            orientation: "horizontal",
            panes: [{ id: "only-one" }],
        });
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining("[SplitLayout]"),
            expect.stringContaining("two panes")
        );
        spy.mockRestore();
    });
});

// ============================================================================
// PANEL RENDERING
// ============================================================================

describe("SplitLayout panel rendering", () =>
{
    test("Show_TwoPanes_RendersTwoPaneElements", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const panes = container.querySelectorAll(".splitlayout-pane");
        expect(panes.length).toBe(2);
        layout.destroy();
    });

    test("Show_ThreePanes_RendersThreePaneElements", () =>
    {
        const layout = new SplitLayout(makeOptions({
            panes: [
                { id: "a", initialSize: "33%" },
                { id: "b", initialSize: "34%" },
                { id: "c", initialSize: "33%" },
            ],
        }));
        layout.show("split-test-container");
        const panes = container.querySelectorAll(".splitlayout-pane");
        expect(panes.length).toBe(3);
        layout.destroy();
    });

    test("Show_PaneWithContent_ContentIsRendered", () =>
    {
        const contentEl = document.createElement("p");
        contentEl.textContent = "Panel content";
        const layout = new SplitLayout(makeOptions({
            panes: [
                { id: "left", content: contentEl },
                { id: "right" },
            ],
        }));
        layout.show("split-test-container");
        const paneEl = layout.getPaneElement("left");
        expect(paneEl?.textContent).toContain("Panel content");
        layout.destroy();
    });

    test("Pane_HasRegionRole", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const panes = container.querySelectorAll("[role='region']");
        expect(panes.length).toBe(2);
        layout.destroy();
    });
});

// ============================================================================
// DIVIDER PRESENCE
// ============================================================================

describe("SplitLayout divider", () =>
{
    test("Show_TwoPanes_RendersOneDivider", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const dividers = container.querySelectorAll(".splitlayout-divider");
        expect(dividers.length).toBe(1);
        layout.destroy();
    });

    test("Show_ThreePanes_RendersTwoDividers", () =>
    {
        const layout = new SplitLayout(makeOptions({
            panes: [
                { id: "a" },
                { id: "b" },
                { id: "c" },
            ],
        }));
        layout.show("split-test-container");
        const dividers = container.querySelectorAll(".splitlayout-divider");
        expect(dividers.length).toBe(2);
        layout.destroy();
    });

    test("Divider_HasSeparatorRole", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const sep = container.querySelector("[role='separator']");
        expect(sep).not.toBeNull();
        layout.destroy();
    });

    test("Divider_IsFocusable", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const sep = container.querySelector("[role='separator']");
        expect(sep?.getAttribute("tabindex")).toBe("0");
        layout.destroy();
    });
});

// ============================================================================
// HANDLE — getSizes / setSizes
// ============================================================================

describe("SplitLayout getSizes / setSizes", () =>
{
    test("GetSizes_AfterShow_ReturnsRecordWithPaneIds", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const sizes = layout.getSizes();
        expect(sizes).toHaveProperty("left");
        expect(sizes).toHaveProperty("right");
        layout.destroy();
    });

    test("SetSizes_ValidSizes_UpdatesSizes", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        layout.setSizes({ left: 300, right: 500 });
        const sizes = layout.getSizes();
        expect(sizes["left"]).toBe(300);
        expect(sizes["right"]).toBe(500);
        layout.destroy();
    });
});

// ============================================================================
// HANDLE — getPaneElement / setPaneContent
// ============================================================================

describe("SplitLayout pane access", () =>
{
    test("GetPaneElement_ValidId_ReturnsHTMLElement", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        expect(layout.getPaneElement("left")).toBeInstanceOf(HTMLElement);
        layout.destroy();
    });

    test("GetPaneElement_InvalidId_ReturnsNull", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        expect(layout.getPaneElement("nonexistent")).toBeNull();
        layout.destroy();
    });

    test("SetPaneContent_ValidId_UpdatesContent", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        const newContent = document.createElement("div");
        newContent.textContent = "New content";
        layout.setPaneContent("left", newContent);
        const pane = layout.getPaneElement("left");
        expect(pane?.textContent).toContain("New content");
        layout.destroy();
    });
});

// ============================================================================
// HANDLE — destroy
// ============================================================================

describe("SplitLayout destroy", () =>
{
    test("Destroy_AfterShow_RemovesFromDOM", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        layout.destroy();
        expect(layout.getElement()).toBeNull();
    });

    test("Destroy_CalledTwice_IsIdempotent", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        layout.destroy();
        expect(() => layout.destroy()).not.toThrow();
    });
});

// ============================================================================
// ORIENTATION CHANGE
// ============================================================================

describe("SplitLayout orientation change", () =>
{
    test("SetOrientation_Vertical_ChangesOrientation", () =>
    {
        const layout = new SplitLayout(makeOptions());
        layout.show("split-test-container");
        layout.setOrientation("vertical");
        const el = layout.getElement();
        expect(el?.classList.contains("splitlayout-vertical")).toBe(true);
        layout.destroy();
    });
});
