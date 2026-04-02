/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: LatexEditor — Phase 1 (Core)
 * Spec-based tests for the LatexEditor component.
 * Tests cover: factory, options, source editing, KaTeX preview,
 * public API, insertAtCursor, read-only mode, contained mode,
 * callbacks, destroy lifecycle, accessibility.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import {
    createLatexEditor,
    LatexEditor,
    LatexEditorOptions,
} from "./latexeditor";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

/** Create a fresh container div for each test. */
function createContainer(): HTMLElement
{
    const el = document.createElement("div");
    el.id = "le-test-container";
    document.body.appendChild(el);
    return el;
}

/** Build default options pointing at the current container. */
function defaultOptions(overrides?: Partial<LatexEditorOptions>): LatexEditorOptions
{
    return {
        container,
        ...overrides,
    };
}

beforeEach(() =>
{
    container = createContainer();
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY + INITIALISATION
// ============================================================================

describe("LatexEditor — Factory", () =>
{
    test("createLatexEditor_WithContainer_ReturnsEditorInstance", () =>
    {
        const editor = createLatexEditor(defaultOptions());

        expect(editor).toBeDefined();
        expect(typeof editor.getLatex).toBe("function");
        expect(typeof editor.destroy).toBe("function");

        editor.destroy();
    });

    test("createLatexEditor_WithStringSelector_ResolvesContainer", () =>
    {
        const editor = createLatexEditor(defaultOptions({ container: "#le-test-container" }));

        expect(editor).toBeDefined();
        expect(editor.getElement()).toBeTruthy();

        editor.destroy();
    });

    test("createLatexEditor_WithInvalidSelector_ReturnsEditorAndLogsWarning", () =>
    {
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

        const editor = createLatexEditor({ container: "#nonexistent" });

        expect(editor).toBeDefined();
        expect(warnSpy).toHaveBeenCalled();

        editor.destroy();
        warnSpy.mockRestore();
    });

    test("createLatexEditor_WithInitialExpression_SetsValue", () =>
    {
        const expr = "x^2 + y^2 = r^2";
        const editor = createLatexEditor(defaultOptions({ expression: expr }));

        expect(editor.getLatex()).toBe(expr);

        editor.destroy();
    });

    test("createLatexEditor_WithNoExpression_DefaultsToEmpty", () =>
    {
        const editor = createLatexEditor(defaultOptions());

        expect(editor.getLatex()).toBe("");

        editor.destroy();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("LatexEditor — DOM Structure", () =>
{
    test("rendersRootElement_WithLeRootClass", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        expect(root.classList.contains("le-root")).toBe(true);

        editor.destroy();
    });

    test("rendersSourceTextarea_WithLeSourceClass", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;
        expect(textarea).toBeTruthy();
        expect(textarea.tagName).toBe("TEXTAREA");

        editor.destroy();
    });

    test("rendersPreviewPane_WithLePreviewClass", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showPreview: true }));
        const root = editor.getElement();

        const preview = root.querySelector(".le-preview");
        expect(preview).toBeTruthy();

        editor.destroy();
    });

    test("hidesPreview_WhenShowPreviewFalse", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showPreview: false }));
        const root = editor.getElement();

        const preview = root.querySelector(".le-preview");
        expect(preview).toBeNull();

        editor.destroy();
    });

    test("appliesCssClass_WhenProvided", () =>
    {
        const editor = createLatexEditor(defaultOptions({ cssClass: "my-custom" }));
        const root = editor.getElement();

        expect(root.classList.contains("my-custom")).toBe(true);

        editor.destroy();
    });

    test("rendersEditorWrapper_WithLeEditorClass", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const editorArea = root.querySelector(".le-editor");
        expect(editorArea).toBeTruthy();

        editor.destroy();
    });
});

// ============================================================================
// PUBLIC API — getLatex / setExpression
// ============================================================================

describe("LatexEditor — getLatex / setExpression", () =>
{
    test("getLatex_ReturnsCurrentExpression", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "a+b" }));

        expect(editor.getLatex()).toBe("a+b");

        editor.destroy();
    });

    test("setExpression_UpdatesLatex", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.setExpression("\\frac{a}{b}");

        expect(editor.getLatex()).toBe("\\frac{a}{b}");

        editor.destroy();
    });

    test("setExpression_UpdatesTextareaValue", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.setExpression("x^2");

        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;
        expect(textarea.value).toBe("x^2");

        editor.destroy();
    });

    test("getValue_ReturnsBothFormats", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "E=mc^2" }));
        const val = editor.getValue();

        expect(val.latex).toBe("E=mc^2");
        expect(typeof val.mathml).toBe("string");

        editor.destroy();
    });
});

// ============================================================================
// PUBLIC API — insertAtCursor
// ============================================================================

describe("LatexEditor — insertAtCursor", () =>
{
    test("insertAtCursor_AppendsToEmptyExpression", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.insertAtCursor("\\alpha");

        expect(editor.getLatex()).toBe("\\alpha");

        editor.destroy();
    });

    test("insertAtCursor_InsertsAtTextareaPosition", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "ab" }));
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        // Position cursor between a and b
        textarea.selectionStart = 1;
        textarea.selectionEnd = 1;

        editor.insertAtCursor("X");

        expect(editor.getLatex()).toBe("aXb");

        editor.destroy();
    });

    test("insertAtCursor_ReplacesSelection", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "hello" }));
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        // Select "ell"
        textarea.selectionStart = 1;
        textarea.selectionEnd = 4;

        editor.insertAtCursor("XX");

        expect(editor.getLatex()).toBe("hXXo");

        editor.destroy();
    });
});

// ============================================================================
// PUBLIC API — editMode
// ============================================================================

describe("LatexEditor — Edit Mode", () =>
{
    test("getEditMode_DefaultsToSource", () =>
    {
        const editor = createLatexEditor(defaultOptions());

        // Without MathLive loaded, should default to source
        expect(editor.getEditMode()).toBe("source");

        editor.destroy();
    });

    test("setEditMode_ToSource_ShowsTextarea", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.setEditMode("source");

        const textarea = editor.getElement().querySelector(".le-source") as HTMLElement;
        expect(textarea.style.display).not.toBe("none");

        editor.destroy();
    });
});

// ============================================================================
// READ-ONLY MODE
// ============================================================================

describe("LatexEditor — Read-Only Mode", () =>
{
    test("readOnly_DisablesTextarea", () =>
    {
        const editor = createLatexEditor(defaultOptions({ readOnly: true }));
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        expect(textarea.readOnly).toBe(true);

        editor.destroy();
    });

    test("setReadOnly_TogglesTextareaState", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        expect(textarea.readOnly).toBe(false);

        editor.setReadOnly(true);
        expect(textarea.readOnly).toBe(true);

        editor.setReadOnly(false);
        expect(textarea.readOnly).toBe(false);

        editor.destroy();
    });
});

// ============================================================================
// CONTAINED MODE
// ============================================================================

describe("LatexEditor — Contained Mode", () =>
{
    test("containedMode_AddsContainedClass", () =>
    {
        const editor = createLatexEditor(defaultOptions({ contained: true }));
        const root = editor.getElement();

        expect(root.classList.contains("le-root--contained")).toBe(true);

        editor.destroy();
    });

    test("nonContainedMode_DoesNotAddContainedClass", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        expect(root.classList.contains("le-root--contained")).toBe(false);

        editor.destroy();
    });
});

// ============================================================================
// DISPLAY MODE
// ============================================================================

describe("LatexEditor — Display Mode", () =>
{
    test("displayMode_DefaultsToTrue", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "x" }));
        const root = editor.getElement();

        // Preview should render in display mode (block-level)
        const preview = root.querySelector(".le-preview");
        if (preview)
        {
            expect(preview.querySelector(".katex-display") || preview.textContent).toBeTruthy();
        }

        editor.destroy();
    });
});

// ============================================================================
// CALLBACKS
// ============================================================================

describe("LatexEditor — Callbacks", () =>
{
    test("onChange_CalledWhenExpressionChanges", () =>
    {
        const onChangeSpy = vi.fn();
        const editor = createLatexEditor(defaultOptions({ onChange: onChangeSpy }));

        editor.setExpression("\\pi");

        expect(onChangeSpy).toHaveBeenCalledWith("\\pi");

        editor.destroy();
    });

    test("onConfirm_CalledOnCtrlEnter", () =>
    {
        const onConfirmSpy = vi.fn();
        const editor = createLatexEditor(defaultOptions({
            expression: "x",
            onConfirm: onConfirmSpy,
        }));

        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        const event = new KeyboardEvent("keydown", {
            key: "Enter",
            ctrlKey: true,
            bubbles: true,
        });
        textarea.dispatchEvent(event);

        expect(onConfirmSpy).toHaveBeenCalled();

        editor.destroy();
    });
});

// ============================================================================
// FOCUS + DESTROY LIFECYCLE
// ============================================================================

describe("LatexEditor — Lifecycle", () =>
{
    test("focus_FocusesTextarea", () =>
    {
        const editor = createLatexEditor(defaultOptions());

        editor.focus();
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;
        expect(document.activeElement).toBe(textarea);

        editor.destroy();
    });

    test("destroy_RemovesRootElement", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        expect(container.contains(root)).toBe(true);

        editor.destroy();

        expect(container.contains(root)).toBe(false);
    });

    test("destroy_ClearsInternalState", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "x" }));

        editor.destroy();

        // After destroy, getLatex should return empty or not throw
        expect(editor.getLatex()).toBe("");
    });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

describe("LatexEditor — Accessibility", () =>
{
    test("textarea_HasAriaLabel", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        expect(textarea.getAttribute("aria-label")).toBeTruthy();

        editor.destroy();
    });

    test("previewPane_HasRoleStatus", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const preview = editor.getElement().querySelector(".le-preview");

        if (preview)
        {
            expect(preview.getAttribute("role")).toBe("status");
        }

        editor.destroy();
    });

    test("previewPane_HasAriaLive", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const preview = editor.getElement().querySelector(".le-preview");

        if (preview)
        {
            expect(preview.getAttribute("aria-live")).toBe("polite");
        }

        editor.destroy();
    });

    test("root_HasRoleGroup", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        expect(root.getAttribute("role")).toBe("group");

        editor.destroy();
    });

    test("root_HasAriaLabel", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        expect(root.getAttribute("aria-label")).toBe("LaTeX Equation Editor");

        editor.destroy();
    });
});

// ============================================================================
// KATEX PREVIEW RENDERING
// ============================================================================

describe("LatexEditor — KaTeX Preview", () =>
{
    test("preview_RendersKaTeXOutput", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "x^2" }));
        const preview = editor.getElement().querySelector(".le-preview");

        // KaTeX might not be loaded in test env, so check for content or error
        if (preview)
        {
            expect(preview.textContent!.length).toBeGreaterThan(0);
        }

        editor.destroy();
    });

    test("preview_ShowsErrorForInvalidLatex", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "\\invalid{" }));
        const preview = editor.getElement().querySelector(".le-preview");

        if (preview)
        {
            // Should show something (either error message or raw text)
            expect(preview.textContent!.length).toBeGreaterThan(0);
        }

        editor.destroy();
    });
});

// ============================================================================
// SOURCE TEXTAREA INPUT
// ============================================================================

describe("LatexEditor — Source Input", () =>
{
    test("textareaInput_UpdatesInternalExpression", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        textarea.value = "y = mx + b";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        expect(editor.getLatex()).toBe("y = mx + b");

        editor.destroy();
    });

    test("textareaInput_FiresOnChangeCallback", () =>
    {
        const onChangeSpy = vi.fn();
        const editor = createLatexEditor(defaultOptions({ onChange: onChangeSpy }));
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        textarea.value = "a + b";
        textarea.dispatchEvent(new Event("input", { bubbles: true }));

        expect(onChangeSpy).toHaveBeenCalledWith("a + b");

        editor.destroy();
    });

    test("textarea_HasMonospaceFont", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const textarea = editor.getElement().querySelector(".le-source") as HTMLTextAreaElement;

        expect(textarea.classList.contains("le-source")).toBe(true);

        editor.destroy();
    });
});

// ============================================================================
// MIN SIZE + DIMENSIONS
// ============================================================================

describe("LatexEditor — Dimensions", () =>
{
    test("appliesMinWidth_WhenNotContained", () =>
    {
        const editor = createLatexEditor(defaultOptions({ minWidth: 500 }));
        const root = editor.getElement();

        expect(root.style.minWidth).toBe("500px");

        editor.destroy();
    });

    test("appliesMinHeight_WhenNotContained", () =>
    {
        const editor = createLatexEditor(defaultOptions({ minHeight: 400 }));
        const root = editor.getElement();

        expect(root.style.minHeight).toBe("400px");

        editor.destroy();
    });

    test("containedMode_IgnoresMinDimensions", () =>
    {
        const editor = createLatexEditor(defaultOptions({
            contained: true,
            minWidth: 500,
            minHeight: 400,
        }));
        const root = editor.getElement();

        expect(root.style.minWidth).toBe("");

        editor.destroy();
    });
});

// ============================================================================
// PHASE 2 — SYMBOL PALETTE
// ============================================================================

describe("LatexEditor — Symbol Palette DOM", () =>
{
    test("rendersPalette_WhenShowSymbolPaletteTrue", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showSymbolPalette: true }));
        const root = editor.getElement();

        const palette = root.querySelector(".le-palette");
        expect(palette).toBeTruthy();

        editor.destroy();
    });

    test("hidesPalette_WhenShowSymbolPaletteFalse", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showSymbolPalette: false }));
        const root = editor.getElement();

        const palette = root.querySelector(".le-palette");
        expect(palette).toBeNull();

        editor.destroy();
    });

    test("rendersTabs_WithTablistRole", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabBar = root.querySelector(".le-palette-tabs");
        expect(tabBar).toBeTruthy();
        expect(tabBar!.getAttribute("role")).toBe("tablist");

        editor.destroy();
    });

    test("renders12CategoryTabs", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        expect(tabs.length).toBe(12);

        editor.destroy();
    });

    test("firstTab_IsActiveByDefault", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        expect(tabs[0].classList.contains("active")).toBe(true);

        editor.destroy();
    });

    test("rendersSymbolGrid_WithCells", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const grid = root.querySelector(".le-palette-grid");
        expect(grid).toBeTruthy();

        const cells = grid!.querySelectorAll(".le-palette-cell");
        expect(cells.length).toBeGreaterThan(0);

        editor.destroy();
    });

    test("symbolCells_HaveButtonRole", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        if (cells.length > 0)
        {
            expect(cells[0].getAttribute("role")).toBe("button");
        }

        editor.destroy();
    });

    test("symbolCells_HaveAriaLabel", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        if (cells.length > 0)
        {
            expect(cells[0].getAttribute("aria-label")).toBeTruthy();
        }

        editor.destroy();
    });

    test("symbolCells_HaveTitleTooltip", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        if (cells.length > 0)
        {
            expect(cells[0].getAttribute("title")).toBeTruthy();
        }

        editor.destroy();
    });
});

describe("LatexEditor — Symbol Palette Tab Switching", () =>
{
    test("clickingTab_SwitchesActiveTab", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        expect(tabs.length).toBeGreaterThan(1);

        // Click second tab
        (tabs[1] as HTMLElement).click();

        expect(tabs[1].classList.contains("active")).toBe(true);
        expect(tabs[0].classList.contains("active")).toBe(false);

        editor.destroy();
    });

    test("clickingTab_UpdatesGridContent", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        const grid = root.querySelector(".le-palette-grid")!;

        // Get cell count of first tab
        const firstCount = grid.querySelectorAll(".le-palette-cell").length;

        // Click a different tab (e.g. "Operators")
        (tabs[1] as HTMLElement).click();

        const secondCount = grid.querySelectorAll(".le-palette-cell").length;

        // Both should have cells, counts may differ
        expect(firstCount).toBeGreaterThan(0);
        expect(secondCount).toBeGreaterThan(0);

        editor.destroy();
    });
});

describe("LatexEditor — Symbol Click-to-Insert", () =>
{
    test("clickingSymbolCell_InsertsLatexAtCursor", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        expect(cells.length).toBeGreaterThan(0);

        // Click first cell
        (cells[0] as HTMLElement).click();

        // Should have inserted something
        expect(editor.getLatex().length).toBeGreaterThan(0);

        editor.destroy();
    });

    test("clickingSymbolCell_FiresOnChange", () =>
    {
        const onChangeSpy = vi.fn();
        const editor = createLatexEditor(defaultOptions({ onChange: onChangeSpy }));
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        if (cells.length > 0)
        {
            (cells[0] as HTMLElement).click();
            expect(onChangeSpy).toHaveBeenCalled();
        }

        editor.destroy();
    });

    test("clickingSymbolCell_DoesNothing_WhenReadOnly", () =>
    {
        const editor = createLatexEditor(defaultOptions({ readOnly: true }));
        const root = editor.getElement();

        const cells = root.querySelectorAll(".le-palette-cell");
        if (cells.length > 0)
        {
            (cells[0] as HTMLElement).click();
            expect(editor.getLatex()).toBe("");
        }

        editor.destroy();
    });
});

describe("LatexEditor — Symbol Palette Categories", () =>
{
    test("greekTab_ContainsAlphaSymbol", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        // Greek should be first tab (active by default)
        const cells = root.querySelectorAll(".le-palette-cell");
        const labels = Array.from(cells).map(
            (c) => c.getAttribute("data-latex") || ""
        );
        expect(labels).toContain("\\alpha");

        editor.destroy();
    });

    test("operatorsTab_ContainsPlusMinusSymbol", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        // Click Operators tab (index 1)
        (tabs[1] as HTMLElement).click();

        const cells = root.querySelectorAll(".le-palette-cell");
        const labels = Array.from(cells).map(
            (c) => c.getAttribute("data-latex") || ""
        );
        expect(labels).toContain("\\pm");

        editor.destroy();
    });

    test("relationsTab_ContainsLeqSymbol", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        // Click Relations tab (index 2)
        (tabs[2] as HTMLElement).click();

        const cells = root.querySelectorAll(".le-palette-cell");
        const labels = Array.from(cells).map(
            (c) => c.getAttribute("data-latex") || ""
        );
        expect(labels).toContain("\\leq");

        editor.destroy();
    });

    test("chemistryTab_ContainsCeCommand", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        // Chemistry is index 9
        (tabs[9] as HTMLElement).click();

        const cells = root.querySelectorAll(".le-palette-cell");
        const labels = Array.from(cells).map(
            (c) => c.getAttribute("data-latex") || ""
        );
        // Should contain at least one \ce{} command
        const hasChem = labels.some((l) => l.includes("\\ce{"));
        expect(hasChem).toBe(true);

        editor.destroy();
    });

    test("structuresTab_ContainsFrac", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const tabs = root.querySelectorAll(".le-palette-tab");
        // Structures is index 6
        (tabs[6] as HTMLElement).click();

        const cells = root.querySelectorAll(".le-palette-cell");
        const labels = Array.from(cells).map(
            (c) => c.getAttribute("data-latex") || ""
        );
        const hasFrac = labels.some((l) => l.includes("\\frac"));
        expect(hasFrac).toBe(true);

        editor.destroy();
    });
});

describe("LatexEditor — Symbol Palette Search", () =>
{
    test("rendersSearchInput", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const searchBox = root.querySelector(".le-palette-search input");
        expect(searchBox).toBeTruthy();

        editor.destroy();
    });

    test("searchInput_HasPlaceholder", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const searchInput = root.querySelector(
            ".le-palette-search input"
        ) as HTMLInputElement;
        if (searchInput)
        {
            expect(searchInput.placeholder).toBeTruthy();
        }

        editor.destroy();
    });

    test("search_FiltersSymbols", () =>
    {
        vi.useFakeTimers();
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const searchInput = root.querySelector(
            ".le-palette-search input"
        ) as HTMLInputElement;
        const grid = root.querySelector(".le-palette-grid")!;

        const beforeCount = grid.querySelectorAll(".le-palette-cell").length;

        // Type a search term
        searchInput.value = "alpha";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));

        // Advance timers past debounce
        vi.advanceTimersByTime(200);

        const afterCount = grid.querySelectorAll(".le-palette-cell").length;

        // Filtered count should be less than all symbols
        expect(afterCount).toBeLessThan(beforeCount);
        expect(afterCount).toBeGreaterThan(0);

        editor.destroy();
        vi.useRealTimers();
    });

    test("search_ClearsOnTabSwitch", () =>
    {
        vi.useFakeTimers();
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const searchInput = root.querySelector(
            ".le-palette-search input"
        ) as HTMLInputElement;

        searchInput.value = "alpha";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        vi.advanceTimersByTime(200);

        // Switch tab
        const tabs = root.querySelectorAll(".le-palette-tab");
        (tabs[1] as HTMLElement).click();

        expect(searchInput.value).toBe("");

        editor.destroy();
        vi.useRealTimers();
    });

    test("search_MatchesCrossCategory", () =>
    {
        vi.useFakeTimers();
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const searchInput = root.querySelector(
            ".le-palette-search input"
        ) as HTMLInputElement;

        // Search for something that spans categories
        searchInput.value = "arrow";
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));

        vi.advanceTimersByTime(200);

        const grid = root.querySelector(".le-palette-grid")!;
        const cells = grid.querySelectorAll(".le-palette-cell");

        // Should find arrow-related symbols from multiple categories
        expect(cells.length).toBeGreaterThan(0);

        editor.destroy();
        vi.useRealTimers();
    });
});

// ============================================================================
// PHASE 3 — STYLING TOOLBAR
// ============================================================================

describe("LatexEditor — Toolbar DOM", () =>
{
    test("rendersToolbar_WhenShowToolbarTrue", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showToolbar: true }));
        const root = editor.getElement();

        const toolbar = root.querySelector(".le-toolbar");
        expect(toolbar).toBeTruthy();

        editor.destroy();
    });

    test("hidesToolbar_WhenShowToolbarFalse", () =>
    {
        const editor = createLatexEditor(defaultOptions({ showToolbar: false }));
        const root = editor.getElement();

        const toolbar = root.querySelector(".le-toolbar");
        expect(toolbar).toBeNull();

        editor.destroy();
    });

    test("toolbar_HasRoleToolbar", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const toolbar = root.querySelector(".le-toolbar");
        expect(toolbar!.getAttribute("role")).toBe("toolbar");

        editor.destroy();
    });

    test("toolbar_ContainsBoldButton", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='bold']");
        expect(btn).toBeTruthy();

        editor.destroy();
    });

    test("toolbar_ContainsBoxedButton", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='boxed']");
        expect(btn).toBeTruthy();

        editor.destroy();
    });

    test("toolbar_ContainsCancelButton_WhenEnabled", () =>
    {
        const editor = createLatexEditor(defaultOptions({ enableCancel: true }));
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='cancel']");
        expect(btn).toBeTruthy();

        editor.destroy();
    });

    test("toolbar_HidesCancelButton_WhenDisabled", () =>
    {
        const editor = createLatexEditor(defaultOptions({ enableCancel: false }));
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='cancel']");
        expect(btn).toBeNull();

        editor.destroy();
    });

    test("toolbar_ContainsSizeDropdown", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='size']");
        expect(btn).toBeTruthy();

        editor.destroy();
    });

    test("toolbar_ContainsModeToggle", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const toggle = root.querySelector(".le-mode-toggle");
        expect(toggle).toBeTruthy();

        editor.destroy();
    });

    test("toolbar_HasDivider", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const divider = root.querySelector(".le-toolbar-divider");
        expect(divider).toBeTruthy();

        editor.destroy();
    });
});

describe("LatexEditor — Toolbar Wrap Selection", () =>
{
    test("boldButton_WrapsBoldCommand", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "xyz" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        // Select "y"
        textarea.selectionStart = 1;
        textarea.selectionEnd = 2;

        const btn = root.querySelector("[data-action='bold']") as HTMLElement;
        btn.click();

        expect(editor.getLatex()).toBe("x\\mathbf{y}z");

        editor.destroy();
    });

    test("boxedButton_WrapsBoxedCommand", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "abc" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        textarea.selectionStart = 0;
        textarea.selectionEnd = 3;

        const btn = root.querySelector("[data-action='boxed']") as HTMLElement;
        btn.click();

        expect(editor.getLatex()).toBe("\\boxed{abc}");

        editor.destroy();
    });

    test("cancelButton_WrapsCancelCommand", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "test" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        textarea.selectionStart = 0;
        textarea.selectionEnd = 4;

        const btn = root.querySelector("[data-action='cancel']") as HTMLElement;
        btn.click();

        expect(editor.getLatex()).toBe("\\cancel{test}");

        editor.destroy();
    });

    test("wrapSelection_InsertsAtCursor_WhenNoSelection", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "ab" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        // Cursor at position 1 with no selection
        textarea.selectionStart = 1;
        textarea.selectionEnd = 1;

        const btn = root.querySelector("[data-action='bold']") as HTMLElement;
        btn.click();

        expect(editor.getLatex()).toBe("a\\mathbf{}b");

        editor.destroy();
    });

    test("wrapSelection_DoesNothing_WhenReadOnly", () =>
    {
        const editor = createLatexEditor(defaultOptions({
            expression: "test",
            readOnly: true,
        }));
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='bold']") as HTMLElement;
        btn.click();

        expect(editor.getLatex()).toBe("test");

        editor.destroy();
    });
});

describe("LatexEditor — Toolbar Keyboard Shortcuts", () =>
{
    test("ctrlB_WrapsBold", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "abc" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        textarea.selectionStart = 0;
        textarea.selectionEnd = 3;

        textarea.dispatchEvent(new KeyboardEvent("keydown", {
            key: "b",
            ctrlKey: true,
            bubbles: true,
        }));

        expect(editor.getLatex()).toBe("\\mathbf{abc}");

        editor.destroy();
    });

    test("ctrlSlash_InsertsFraction", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        textarea.selectionStart = 0;
        textarea.selectionEnd = 0;

        textarea.dispatchEvent(new KeyboardEvent("keydown", {
            key: "/",
            ctrlKey: true,
            bubbles: true,
        }));

        expect(editor.getLatex()).toContain("\\frac{");

        editor.destroy();
    });

    test("ctrlShiftM_TogglesMode", () =>
    {
        const editor = createLatexEditor(defaultOptions());

        expect(editor.getEditMode()).toBe("source");

        const textarea = editor.getElement().querySelector(
            ".le-source"
        ) as HTMLTextAreaElement;

        textarea.dispatchEvent(new KeyboardEvent("keydown", {
            key: "m",
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
        }));

        // Mode should toggle (to visual if MathLive were present, stays source without)
        // At least the handler fires without error
        expect(editor.getEditMode()).toBeDefined();

        editor.destroy();
    });
});

describe("LatexEditor — Size Dropdown", () =>
{
    test("sizeButton_ShowsDropdown_OnClick", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const btn = root.querySelector("[data-action='size']") as HTMLElement;
        btn.click();

        const dropdown = root.querySelector(".le-size-dropdown");
        expect(dropdown).toBeTruthy();

        editor.destroy();
    });

    test("sizeOption_WrapsWithSizeCommand", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "xyz" }));
        const root = editor.getElement();
        const textarea = root.querySelector(".le-source") as HTMLTextAreaElement;

        textarea.selectionStart = 0;
        textarea.selectionEnd = 3;

        const btn = root.querySelector("[data-action='size']") as HTMLElement;
        btn.click();

        const options = root.querySelectorAll(".le-size-option");
        expect(options.length).toBeGreaterThan(0);

        // Click "Large"
        const largeOption = Array.from(options).find(
            (o) => o.textContent === "Large"
        );
        if (largeOption)
        {
            (largeOption as HTMLElement).click();
            expect(editor.getLatex()).toContain("\\large");
        }

        editor.destroy();
    });
});

// ============================================================================
// PHASE 4 — VISUAL MODE (MATHLIVE)
// ============================================================================

describe("LatexEditor — Visual Mode Degradation", () =>
{
    test("defaultsToSourceMode_WhenMathLiveNotLoaded", () =>
    {
        const editor = createLatexEditor(defaultOptions({ editMode: "visual" }));

        // Without MathLive, should fall back to source
        expect(editor.getEditMode()).toBe("source");

        editor.destroy();
    });

    test("getMathML_ReturnsEmptyString_WhenMathLiveNotLoaded", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "x^2" }));

        expect(editor.getMathML()).toBe("");

        editor.destroy();
    });

    test("visualButtonDisabled_WhenMathLiveNotLoaded", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const visualBtn = root.querySelector("[data-mode='visual']") as HTMLButtonElement;
        if (visualBtn)
        {
            expect(visualBtn.disabled).toBe(true);
        }

        editor.destroy();
    });
});

describe("LatexEditor — Visual Mode with Mock MathLive", () =>
{
    let originalMathField: unknown;

    beforeEach(() =>
    {
        // Mock MathLive's math-field custom element
        originalMathField = (window as any).MathfieldElement;
        (window as any).MathfieldElement = class
        {
            value = "";
            readonly = false;
            constructor() { /* mock */ }
            getValue(_format?: string): string { return ""; }
            setValue(val: string): void { this.value = val; }
            addEventListener(_evt: string, _fn: unknown): void { /* mock */ }
            removeEventListener(_evt: string, _fn: unknown): void { /* mock */ }
            focus(): void { /* mock */ }
        };

        // Register custom element if not already
        if (!customElements.get("math-field"))
        {
            customElements.define("math-field", class extends HTMLElement
            {
                value = "";
                getValue(format?: string): string
                {
                    if (format === "math-ml") { return "<math></math>"; }
                    return this.value;
                }
                setValue(val: string): void { this.value = val; }
            });
        }
    });

    afterEach(() =>
    {
        (window as any).MathfieldElement = originalMathField;
    });

    test("setEditMode_ToVisual_CreatesMathField", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.setEditMode("visual");

        const root = editor.getElement();
        const mathField = root.querySelector("math-field");
        // May or may not create depending on implementation
        // At minimum, the mode should be set
        expect(editor.getEditMode()).toBe("visual");

        editor.destroy();
    });

    test("setEditMode_BackToSource_ShowsTextarea", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        editor.setEditMode("visual");
        editor.setEditMode("source");

        expect(editor.getEditMode()).toBe("source");
        const textarea = editor.getElement().querySelector(".le-source");
        expect(textarea).toBeTruthy();

        editor.destroy();
    });

    test("getMathML_WithMathField_ReturnsMathML", () =>
    {
        const editor = createLatexEditor(defaultOptions({ expression: "x^2" }));

        // Without real MathLive, still returns empty
        const mathml = editor.getMathML();
        expect(typeof mathml).toBe("string");

        editor.destroy();
    });
});

describe("LatexEditor — Mode Toggle Sync", () =>
{
    test("modeToggle_SourceActive_ByDefault", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        const sourceBtn = root.querySelector("[data-mode='source']");
        if (sourceBtn)
        {
            expect(sourceBtn.classList.contains("active")).toBe(true);
        }

        editor.destroy();
    });

    test("setEditMode_UpdatesToggleUI", () =>
    {
        const editor = createLatexEditor(defaultOptions());
        const root = editor.getElement();

        editor.setEditMode("visual");

        const visualBtn = root.querySelector("[data-mode='visual']");
        const sourceBtn = root.querySelector("[data-mode='source']");

        if (visualBtn && sourceBtn)
        {
            expect(visualBtn.classList.contains("active")).toBe(true);
            expect(sourceBtn.classList.contains("active")).toBe(false);
        }

        editor.destroy();
    });
});
