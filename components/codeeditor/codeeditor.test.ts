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
import { installCodeMirrorMock, removeCodeMirrorMock } from "./codeeditor.cm.mock";

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

    test("destroyTwice_LeavesTheEditorDestroyedAndRefusing", () =>
    {
        // DEBT-TEST-1b. Idempotency is the weakest claim a test can make
        // and the old block made only half of it. The second call is a
        // no-op AND the handle stays refusing, which is what ADR-200
        // made the contract after destroy.
        const ce = new CodeEditor({});
        ce.destroy();
        ce.destroy();

        expect(() => ce.getValue()).toThrow();
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

    test("toggleWordWrap_WithNoCM_ThrowsAndLeavesTheButtonAlone", () =>
    {
        // DEBT-CE-1, closed. This block previously asserted that the
        // button flipped, which it did, over an editor that had wrapped
        // nothing. The pressed state WAS the defect.
        //
        // The second half is the part worth pinning: a refusal must not
        // leave the flag inverted, or the next call undoes a change the
        // editor never made.
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");
        const btn = document.querySelector(
            "#test-codeeditor [data-action=\"wordwrap\"]");

        if (btn === null) { throw new Error("the word-wrap button did not render"); }

        const before = btn.getAttribute("aria-pressed");

        expect(() => ce.toggleWordWrap()).toThrow(/toggleWordWrap\(\).*CodeMirror/s);
        expect(btn.getAttribute("aria-pressed")).toBe(before);
    });

    test("toggleLineNumbers_WithNoCM_Throws", () =>
    {
        // The quieter half of DEBT-CE-1. This one wrote no attribute,
        // so a caller received nothing at all, not even a wrong signal.
        const ce = new CodeEditor({});
        ce.show("test-codeeditor");

        expect(() => ce.toggleLineNumbers()).toThrow(/toggleLineNumbers\(\).*CodeMirror/s);
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
/**
 * The mock's EditorView, minus the one static that word wrap needs.
 *
 * A subclass keeps every other static and the constructor, so the
 * editor still mounts. That is the condition under test: everything
 * looks fine and one export is gone.
 */
function stripLineWrapping(EV: unknown): unknown
{
    const Base = EV as { new(cfg: unknown): unknown };
    class NoWrap extends (Base as new (cfg: unknown) => object) { }
    (NoWrap as unknown as Record<string, unknown>).lineWrapping = undefined;
    return NoWrap;
}

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

    test("toggleWordWrap_Mounted_PressesTheButtonAndRebuildsTheView", () =>
    {
        // DEBT-CE-1. The pressed state is only honest here, where an
        // editor exists to wrap. `reconfigureCMWordWrap` rebuilds the
        // view, so a NEW EditorView instance is the evidence that the
        // wrap reached CodeMirror rather than only the button.
        const ce = mounted();
        const btn = document.querySelector(
            "#test-codeeditor [data-action=\"wordwrap\"]");

        if (btn === null) { throw new Error("the word-wrap button did not render"); }

        const firstView = ce.getEditorInstance();

        expect(btn.getAttribute("aria-pressed")).toBe("false");

        ce.toggleWordWrap();

        expect(btn.getAttribute("aria-pressed")).toBe("true");
        expect(ce.getEditorInstance()).not.toBe(firstView);
    });

    test("toggleLineNumbers_Mounted_RebuildsTheView", () =>
    {
        const ce = mounted();
        const firstView = ce.getEditorInstance();

        ce.toggleLineNumbers();

        expect(ce.getEditorInstance()).not.toBe(firstView);
    });

    test("wordWrap_WithNoLineWrappingExport_NamesTheExtension", () =>
    {
        // DEBT-CE-1's third edit, and the dangerous one. The guard was
        // `if (EV.lineWrapping)`, so a view bundle missing that one
        // export mounted a normal-looking editor with the button
        // pressed and the lines unwrapped. Nothing said so.
        installCodeMirrorMock({
            EditorView: stripLineWrapping(
                (window as unknown as Record<string, unknown>).EditorView)
        });
        const ce = new CodeEditor({ wordWrap: true });

        expect(() => ce.show("test-codeeditor"))
            .toThrow(/"lineWrapping".*@codemirror\/view/s);
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

// ============================================================================
// KEY BINDINGS — UNUSED-1
// ============================================================================

describe("keyBindings reaches the CodeMirror keymap", () =>
{
    /** The keymap entries CodeEditor handed `keymap.of`. */
    function capturedMaps(): { key: string }[]
    {
        const captured: unknown[][] = [];
        installCodeMirrorMock({
            keymap: {
                of: (maps: unknown[]) =>
                {
                    captured.push(maps);
                    return { keymap: maps };
                },
            },
        });
        createCodeEditor("test-codeeditor", { onSave: vi.fn() });

        return captured.flat() as { key: string }[];
    }

    afterEach(() => { removeCodeMirrorMock(); });

    // KEYBOARD.md: "every interactive component accepts an optional
    // `keyBindings` property ... to override the defaults".
    // `getCMKeyBindings` hard-coded `Mod-s`, so a caller remapping
    // save got the documented type and the original shortcut.
    // `matchesKeyCombo` was a complete combo matcher with no caller
    // -- CodeMirror owns the keymap, so an event matcher was never
    // the way in -- and the compiler had been reporting it unused
    // since it was written.
    test("the default save binding is Mod-s", () =>
    {
        expect(capturedMaps().map((m) => m.key)).toContain("Mod-s");
    });

    test("an override replaces it, translated to CodeMirror's separator", () =>
    {
        const captured: unknown[][] = [];
        installCodeMirrorMock({
            keymap: {
                of: (maps: unknown[]) => { captured.push(maps); return { keymap: maps }; },
            },
        });

        createCodeEditor("test-codeeditor", {
            onSave: vi.fn(),
            keyBindings: { save: "Ctrl+Shift+s" },
        });

        const keys = (captured.flat() as { key: string }[]).map((m) => m.key);
        expect(keys).toContain("Ctrl-Shift-s");
        expect(keys).not.toContain("Mod-s");
    });
});

// ============================================================================
// SURFACE CONTRACT (readiness step 2 B5): additive on("save"),
// getState/setState and setData. onSave keeps firing first, exactly once.
// ============================================================================

describe("surface contract (B5)", () =>
{
    /** A CodeMirror whose document the component can read and replace. */
    function installEditableMock(initial = ""): { keyMaps: { key: string; run: () => boolean }[] }
    {
        const keyMaps: { key: string; run: () => boolean }[] = [];
        const text = { value: initial };
        const doc = { toString: () => text.value, get length() { return text.value.length; } };

        installCodeMirrorMock({
            EditorState: { create: (cfg: { doc?: string }) => { text.value = cfg.doc ?? ""; return { doc }; } },
            EditorView: class
            {
                public state = { doc };
                public contentDOM = document.createElement("div");
                constructor(cfg: { parent: HTMLElement })
                {
                    const scroller = document.createElement("div");
                    scroller.className = "cm-scroller";
                    cfg.parent.appendChild(scroller);
                }
                public dispatch(tr: { changes: { insert: string } }): void { text.value = tr.changes.insert; }
                public destroy(): void { /* nothing to release */ }
                public focus(): void { /* the toolbar refocuses the editor after an action */ }
                public static updateListener = { of: (fn: unknown) => ({ fn }) };
                public static theme = (spec: unknown): unknown => ({ spec });
                public static lineWrapping = { ext: "lineWrapping" };
            },
            keymap: {
                of: (maps: { key: string; run: () => boolean }[]) =>
                {
                    keyMaps.push(...maps);
                    return { keymap: maps };
                },
            },
        });

        return { keyMaps };
    }

    function saveButton(): HTMLButtonElement
    {
        return container.querySelector("[data-action='save']") as HTMLButtonElement;
    }

    function pressModS(keyMaps: { key: string; run: () => boolean }[]): void
    {
        keyMaps.find((m) => m.key === "Mod-s")!.run();
    }

    beforeEach(() => { installEditableMock("let a = 1;"); });
    afterEach(() => { removeCodeMirrorMock(); });

    test("on(save)_ToolbarSave_HearsTheCode_AfterOnSave", () =>
    {
        const order: string[] = [];
        const ce = createCodeEditor("test-codeeditor", {
            value: "let a = 1;",
            onSave: (v) => order.push(`option:${v}`),
        });
        const off = ce.on("save", (v) => order.push(`channel:${String(v)}`));

        saveButton().click();
        off();
        saveButton().click();

        expect(order).toEqual(["option:let a = 1;", "channel:let a = 1;", "option:let a = 1;"]);
    });

    test("on(save)_ModS_HearsTheCode_AfterOnSave", () =>
    {
        const { keyMaps } = installEditableMock("x");
        const order: string[] = [];
        const ce = createCodeEditor("test-codeeditor", {
            value: "x",
            onSave: (v) => order.push(`option:${v}`),
        });
        ce.on("save", (v) => order.push(`channel:${String(v)}`));

        pressModS(keyMaps);

        expect(order).toEqual(["option:x", "channel:x"]);
    });

    test("on(save)_WithNoOnSave_StillEmits", () =>
    {
        const { keyMaps } = installEditableMock("y");
        const heard = vi.fn();
        const ce = createCodeEditor("test-codeeditor", { value: "y" });
        ce.on("save", heard);

        pressModS(keyMaps);
        saveButton().click();

        expect(heard).toHaveBeenCalledTimes(2);
        expect(heard).toHaveBeenCalledWith("y");
    });

    test("on(save)_PayloadIsPlainJson", () =>
    {
        const heard = vi.fn();
        const ce = createCodeEditor("test-codeeditor", { value: "let a = 1;" });
        ce.on("save", heard);

        saveButton().click();

        const payload = heard.mock.calls[0][0];
        expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
        expect(payload).toBe("let a = 1;");
    });

    test("on(save)_AThrowingHandler_DoesNotStopTheNext", () =>
    {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const next = vi.fn();
        const ce = createCodeEditor("test-codeeditor", { value: "z" });
        ce.on("save", () => { throw new Error("boom"); });
        ce.on("save", next);

        saveButton().click();

        expect(next).toHaveBeenCalledWith("z");
        errSpy.mockRestore();
    });

    test("saveButton_WithNoOnSave_FollowsSubscription", () =>
    {
        const ce = createCodeEditor("test-codeeditor", {});
        expect(saveButton().disabled).toBe(true);

        const off = ce.on("save", () => undefined);
        expect(saveButton().disabled).toBe(false);
        expect(saveButton().hasAttribute("aria-disabled")).toBe(false);

        off();
        expect(saveButton().disabled).toBe(true);
        expect(saveButton().getAttribute("aria-disabled")).toBe("true");
    });

    test("saveButton_WithNoOnSave_StaysEnabledUntilTheLastSubscriberLeaves", () =>
    {
        const ce = createCodeEditor("test-codeeditor", {});
        const offA = ce.on("save", () => undefined);
        const offB = ce.on("save", () => undefined);

        offA();
        expect(saveButton().disabled).toBe(false);
        offB();
        expect(saveButton().disabled).toBe(true);
    });

    test("saveButton_WithOnSave_IsUnchangedBySubscription", () =>
    {
        const ce = createCodeEditor("test-codeeditor", { onSave: vi.fn() });
        expect(saveButton().disabled).toBe(false);

        const off = ce.on("save", () => undefined);
        expect(saveButton().disabled).toBe(false);

        off();
        expect(saveButton().disabled).toBe(false);
    });

    test("saveButton_ReadOnlyRuleIsTheSameAsWithOnSave", () =>
    {
        const withOnSave = createCodeEditor("test-codeeditor", { onSave: vi.fn(), readOnly: true });
        const enabledWithOnSave = saveButton().disabled === false;
        withOnSave.destroy();
        container.innerHTML = "";

        const ce = createCodeEditor("test-codeeditor", { readOnly: true });
        ce.on("save", () => undefined);

        expect(saveButton().disabled).toBe(!enabledWithOnSave);
    });

    test("on_Unsubscribe_StopsDelivery", () =>
    {
        const heard = vi.fn();
        const ce = createCodeEditor("test-codeeditor", { value: "q" });
        const off = ce.on("save", heard);
        saveButton().click();

        off();
        ce.on("save", () => undefined); // keeps the button enabled
        saveButton().click();

        expect(heard).toHaveBeenCalledTimes(1);
    });

    test("destroy_ClearsTheHandlers", () =>
    {
        const { keyMaps } = installEditableMock("q");
        const heard = vi.fn();
        const ce = createCodeEditor("test-codeeditor", { value: "q" });
        ce.on("save", heard);

        ce.destroy();
        pressModS(keyMaps);

        expect(heard).not.toHaveBeenCalled();
    });

    test("on_UnknownChannel_Throws", () =>
    {
        const ce = createCodeEditor("test-codeeditor", {});

        expect(() => ce.on("bogus", () => undefined)).toThrow('"save"');
    });

    test("setData_Throws", () =>
    {
        const ce = createCodeEditor("test-codeeditor", {});

        expect(() => ce.setData("value", "x")).toThrow("no data slots");
        expect(() => ce.setData("value", "x")).toThrow("setValue()");
    });

    test("getState_SetState_RoundTripValue", () =>
    {
        const ce = createCodeEditor("test-codeeditor", { value: "first" });
        const captured = ce.getState();
        expect(captured).toEqual({ value: "first" });

        ce.setValue("second");
        expect(ce.getState()).toEqual({ value: "second" });

        ce.setState(captured);
        expect(ce.getValue()).toBe("first");
        expect(JSON.parse(JSON.stringify(captured))).toEqual(captured);
    });

    test("setState_WithoutValue_ChangesNothing", () =>
    {
        const ce = createCodeEditor("test-codeeditor", { value: "keep" });

        ce.setState({});

        expect(ce.getValue()).toBe("keep");
    });
});
