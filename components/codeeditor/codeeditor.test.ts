/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: CodeEditor
 * Spec-based tests for the CodeEditor CodeMirror wrapper component.
 * Tests cover: factory, options, DOM structure, ARIA, handle methods,
 * callbacks, language selection, and edge cases.
 *
 * NOTE: CodeMirror 6 is not available in the test environment, so tests
 * focus on the component shell, fallback behaviour, and public API contracts.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { CodeEditor, createCodeEditor } from "./codeeditor";

import type { CodeEditorOptions, CodeEditorLanguage } from "./codeeditor";

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLDivElement;

function queryRoot(): HTMLElement | null
{
    return container.querySelector("[class*='codeeditor']");
}

function queryToolbar(): HTMLElement | null
{
    return container.querySelector(
        ".codeeditor-toolbar"
    ) as HTMLElement | null;
}

function queryEditorContainer(): HTMLElement | null
{
    return container.querySelector(
        ".codeeditor-editor"
    ) as HTMLElement | null;
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "test-codeeditor";
    document.body.appendChild(container);
});

afterEach(() =>
{
    container.remove();
});

// ============================================================================
// FACTORY — createCodeEditor
// ============================================================================

describe("createCodeEditor", () =>
{
    test("withContainerId_MountsInContainer", () =>
    {
        createCodeEditor("test-codeeditor");
        expect(queryRoot()).not.toBeNull();
    });

    test("returnsCodeEditorInstance", () =>
    {
        const ce = createCodeEditor("test-codeeditor");
        expect(ce).toBeInstanceOf(CodeEditor);
    });

    test("withOptions_PassesConfig", () =>
    {
        const ce = createCodeEditor("test-codeeditor", {
            language: "typescript",
        });
        expect(ce.getLanguage()).toBe("typescript");
    });
});

// ============================================================================
// CONSTRUCTOR
// ============================================================================

describe("CodeEditor constructor", () =>
{
    test("defaultLanguage_IsJavascript", () =>
    {
        const ce = new CodeEditor({});
        expect(ce.getLanguage()).toBe("javascript");
    });

    test("customLanguage_IsStored", () =>
    {
        const ce = new CodeEditor({ language: "python" });
        expect(ce.getLanguage()).toBe("python");
    });

    test("getElement_ReturnsRootElement", () =>
    {
        const ce = new CodeEditor({});
        expect(ce.getElement()).toBeInstanceOf(HTMLElement);
    });
});

// ============================================================================
// PUBLIC METHODS — lifecycle
// ============================================================================

describe("lifecycle", () =>
{
    test("show_MountsInContainer", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(queryRoot()).not.toBeNull();
    });

    test("hide_RemovesFromDOM", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        ce.hide();
        expect(queryRoot()).toBeNull();
    });

    test("destroy_FullCleanup", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        ce.destroy();
        expect(queryRoot()).toBeNull();
    });

    test("destroyTwice_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.destroy();
        expect(() => ce.destroy()).not.toThrow();
    });
});

// ============================================================================
// PUBLIC METHODS — getValue / setValue
// ============================================================================

describe("getValue and setValue", () =>
{
    test("getValue_WithNoCM_ReturnsEmpty", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(ce.getValue()).toBe("");
    });

    test("setValue_OnDestroyedInstance_LogsWarning", () =>
    {
        const ce = new CodeEditor({});
        ce.destroy();
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        ce.setValue("test");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});

// ============================================================================
// PUBLIC METHODS — language
// ============================================================================

describe("language management", () =>
{
    test("getLanguage_ReturnsCurrentLanguage", () =>
    {
        const ce = new CodeEditor({ language: "css" });
        expect(ce.getLanguage()).toBe("css");
    });

    test("setLanguage_UpdatesLanguage", () =>
    {
        const ce = new CodeEditor({ language: "javascript" });
        ce.show("test-codeeditor");
        ce.setLanguage("python");
        expect(ce.getLanguage()).toBe("python");
    });

    test("onLanguageChange_Callback", () =>
    {
        const onLanguageChange = vi.fn();
        const ce = new CodeEditor({ onLanguageChange });
        ce.show("test-codeeditor");
        ce.setLanguage("sql");
        expect(onLanguageChange).toHaveBeenCalledWith("sql");
    });
});

// ============================================================================
// PUBLIC METHODS — theme
// ============================================================================

describe("theme management", () =>
{
    test("setTheme_SwitchesToDark", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        ce.setTheme("dark");
        const root = queryRoot();
        expect(root?.classList.contains("codeeditor-dark")).toBe(true);
    });

    test("setTheme_SwitchesToLight", () =>
    {
        const ce = new CodeEditor({ theme: "dark" });
        ce.show("test-codeeditor");
        ce.setTheme("light");
        const root = queryRoot();
        expect(root?.classList.contains("codeeditor-light")).toBe(true);
    });
});

// ============================================================================
// PUBLIC METHODS — readOnly
// ============================================================================

describe("readOnly", () =>
{
    test("setReadOnly_True_AddsClass", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        ce.setReadOnly(true);
        const root = queryRoot();
        expect(root?.classList.contains("codeeditor-readonly")).toBe(true);
    });

    test("setReadOnly_False_RemovesClass", () =>
    {
        const ce = new CodeEditor({ readOnly: true });
        ce.show("test-codeeditor");
        ce.setReadOnly(false);
        const root = queryRoot();
        expect(root?.classList.contains("codeeditor-readonly")).toBe(false);
    });
});

// ============================================================================
// PUBLIC METHODS — editing actions (no CM, no-op)
// ============================================================================

describe("editing actions without CodeMirror", () =>
{
    test("undo_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.undo()).not.toThrow();
    });

    test("redo_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.redo()).not.toThrow();
    });

    test("format_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.format()).not.toThrow();
    });

    test("toggleWordWrap_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.toggleWordWrap()).not.toThrow();
    });

    test("getSelection_WithNoCM_ReturnsEmpty", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(ce.getSelection()).toBe("");
    });

    test("focus_WithNoCM_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.focus()).not.toThrow();
    });
});

// ============================================================================
// DOM STRUCTURE
// ============================================================================

describe("DOM structure", () =>
{
    test("hasEditorContainer", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(queryEditorContainer()).not.toBeNull();
    });

    test("showToolbar_Default_RendersToolbar", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(queryToolbar()).not.toBeNull();
    });

    test("showToolbar_False_OmitsToolbar", () =>
    {
        const ce = new CodeEditor({ showToolbar: false });
        ce.show("test-codeeditor");
        expect(queryToolbar()).toBeNull();
    });
});

// ============================================================================
// ARIA / ACCESSIBILITY
// ============================================================================

describe("accessibility", () =>
{
    test("hasLiveRegion", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        const liveRegion = container.querySelector("[aria-live]");
        expect(liveRegion).not.toBeNull();
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_LogsError", () =>
    {
        const ce = new CodeEditor({});
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        ce.show("nonexistent-id");
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });

    test("diagnostics_WithNoCM_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() =>
        {
            ce.setDiagnostics([
                { line: 1, message: "Error", severity: "error" },
            ]);
        }).not.toThrow();
    });

    test("clearDiagnostics_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.clearDiagnostics()).not.toThrow();
    });

    test("cssClass_AddedToRoot", () =>
    {
        const ce = new CodeEditor({ cssClass: "my-editor" });
        ce.show("test-codeeditor");
        const root = queryRoot();
        expect(root?.classList.contains("my-editor")).toBe(true);
    });
});
