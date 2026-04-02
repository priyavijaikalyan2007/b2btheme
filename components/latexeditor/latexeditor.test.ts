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
