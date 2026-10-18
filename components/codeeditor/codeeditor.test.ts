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
import { installCodeMirrorMock, removeCodeMirrorMock } from "./codeeditor.cm-mock";

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
    test("getValue_WithNoCM_Throws", () =>
    {
        // ADR-201. "" is what a working editor says for an empty
        // document, so a caller could not tell the two apart. The
        // sibling refusals landed under ADR-200 and this one was
        // missed, because the stand-in is the fall-through of a
        // PRESENCE test rather than the body of an absence guard.
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.getValue()).toThrow(/getValue\(\)/);
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
    /*
     * ADR-200. These seven asserted that a public method does nothing
     * when CodeMirror is absent, and every one of them passed, because
     * doing nothing is exactly what the component did. AGENTS.md puts
     * this case in its table: a capability that is unavailable throws
     * or refuses the one feature loudly, and does not render a reduced
     * version.
     *
     * NOTE WHAT IS NOT MOCKED IN THIS FILE: CodeMirror. Every test here
     * runs against an editor that failed to mount and is displaying a
     * missing-dependency notice, which is why these were the natural
     * assertions to reach for.
     */

    test("undo_WithNoCM_Throws", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.undo()).toThrow(/undo\(\).*CodeMirror/s);
    });

    test("redo_WithNoCM_Throws", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.redo()).toThrow(/redo\(\).*CodeMirror/s);
    });

    test("format_WithNoCM_Throws", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.format()).toThrow(/format\(\).*CodeMirror/s);
    });

    test("toggleWordWrap_DoesNotThrow", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.toggleWordWrap()).not.toThrow();
    });

    test("getSelection_WithNoCM_Throws", () =>
    {
        // ADR-157, a fabricated read. "" is the same answer a working
        // editor gives for an empty selection, so the caller could not
        // tell the difference between no selection and no editor.
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.getSelection()).toThrow(/getSelection\(\)/);
    });

    test("focus_WithNoCM_Throws", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.focus()).toThrow(/focus\(\)/);
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
// MOUNTED WITH CODEMIRROR — THE MODULE-ABSENT REFUSALS
// ============================================================================

/**
 * ADR-200. NOTHING IN THIS FILE HAD EVER MOUNTED CODEEDITOR WITH
 * CODEMIRROR PRESENT. Every other test runs against an editor that
 * failed to detect it and is displaying a missing-dependency notice,
 * so the refusals below — the ones for a module that is absent while
 * the editor itself looks fine — were unreachable from the suite.
 *
 * That is the dangerous half. An editor with no `undo` export renders
 * perfectly, takes the keystroke, and does nothing.
 *
 * The mock is the smallest thing that mounts: EditorState.create,
 * an EditorView constructor, and the two view modules the extension
 * builder asks for by name. It deliberately does NOT publish undo,
 * redo, indentSelection or setDiagnostics, which is the condition
 * under test.
 */
describe("CodeEditor — mounted, with a module missing", () =>
{
    beforeEach(() => { installCodeMirrorMock(); });
    afterEach(() => { removeCodeMirrorMock(); });

    function mounted(): CodeEditor
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        return ce;
    }

    test("theMockActuallyMounts", () =>
    {
        // Without this the four cases below would pass by refusing for
        // the WRONG reason, which is the trap the latexeditor MathLive
        // mock fell into: it mocked a global no code path consulted.
        const ce = mounted();

        expect(ce.getEditorInstance()).not.toBeNull();
        expect(container.querySelector(".cm-scroller")).not.toBeNull();
    });

    test("undo_WithNoCommandsModule_NamesTheModule", () =>
    {
        const ce = mounted();

        expect(() => ce.undo()).toThrow(/"undo".*@codemirror\/commands/s);
    });

    test("redo_WithNoCommandsModule_NamesTheModule", () =>
    {
        const ce = mounted();

        expect(() => ce.redo()).toThrow(/"redo".*@codemirror\/commands/s);
    });

    test("format_WithNoCommandsModule_NamesTheModule", () =>
    {
        const ce = mounted();

        expect(() => ce.format()).toThrow(/"indentSelection".*@codemirror\/commands/s);
    });

    test("setDiagnostics_WithNoLintModule_NamesTheModule", () =>
    {
        const ce = mounted();

        expect(() => ce.setDiagnostics([{ line: 1, message: "x", severity: "error" }]))
            .toThrow(/"setDiagnostics".*@codemirror\/lint/s);
    });

    test("everyRefusalSaysWhatToLoad", () =>
    {
        // FALLBACK-9's wording: name the fault, then the remedy.
        const ce = mounted();
        const messages: string[] = [];

        for (const act of [() => ce.undo(), () => ce.redo(), () => ce.format()])
        {
            try { act(); } catch (e) { messages.push(String(e)); }
        }

        expect(messages).toHaveLength(3);
        for (const m of messages) { expect(m).toMatch(/Load @codemirror\//); }
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("showInMissingContainer_Throws", () =>
    {
        // ERR-1. This case asserted the defect: a container that is
        // not there used to be logged and walked past. AGENTS.md
        // calls that returning a null object.
        const ce = new CodeEditor({});
        expect(() => ce.show("nonexistent-id")).toThrow(/was not found/);
    });

    test("diagnostics_WithNoCM_Throws_AndAnnouncesNothing", () =>
    {
        // The worst of the seven. setDiagnostics discarded the list
        // when the lint module was absent, and then announced
        // "1 diagnostics" to the live region anyway. A screen reader
        // was told about diagnostics that had just been dropped.
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");

        expect(() =>
        {
            ce.setDiagnostics([
                { line: 1, message: "Error", severity: "error" },
            ]);
        }).toThrow(/setDiagnostics\(\)/);

        const live = document.getElementById("test-codeeditor")
            ?.querySelector("[aria-live]");
        expect(live?.textContent ?? "").not.toContain("diagnostic");
    });

    test("clearDiagnostics_WithNoCM_Throws", () =>
    {
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        expect(() => ce.clearDiagnostics()).toThrow(/setDiagnostics\(\)/);
    });

    test("cssClass_AddedToRoot", () =>
    {
        const ce = new CodeEditor({ cssClass: "my-editor" });
        ce.show("test-codeeditor");
        const root = queryRoot();
        expect(root?.classList.contains("my-editor")).toBe(true);
    });
});
