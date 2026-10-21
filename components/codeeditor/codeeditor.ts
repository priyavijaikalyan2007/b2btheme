/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: CodeEditor
 * 📜 PURPOSE: Bootstrap 5-themed code editor wrapping CodeMirror 6 with
 *    syntax highlighting, toolbar, and diagnostics.
 *    Shows a clear error when CodeMirror is not loaded (ADR-028).
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [new CodeEditor()] -> [show()] -> [DOM editor]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Severity level for a diagnostic annotation. */
export type CodeEditorSeverity = "error" | "warning" | "info";

/** A single diagnostic annotation displayed in the gutter. */
export interface CodeEditorDiagnostic
{
    line: number;
    column?: number;
    message: string;
    severity: CodeEditorSeverity;
}

/** Supported language identifiers. */
export type CodeEditorLanguage =
    | "javascript" | "typescript" | "json" | "yaml"
    | "html" | "css" | "sql" | "python"
    | "markdown" | "plaintext";

/** Toolbar action identifiers. */
export type CodeEditorToolbarAction =
    | "language" | "undo" | "redo" | "wordwrap"
    | "copy" | "format" | "save";

/** Configuration options for the CodeEditor component. */
export interface CodeEditorOptions
{
    value?: string;
    language?: CodeEditorLanguage;
    readOnly?: boolean;
    lineNumbers?: boolean;
    wordWrap?: boolean;
    tabSize?: number;
    placeholder?: string;
    height?: string;
    maxHeight?: string;
    autoGrow?: boolean;
    theme?: "light" | "dark";
    showToolbar?: boolean;
    toolbarActions?: CodeEditorToolbarAction[];
    diagnostics?: CodeEditorDiagnostic[];
    disabled?: boolean;
    cssClass?: string;
    onChange?: (value: string) => void;
    onSave?: (value: string) => void;
    onLanguageChange?: (language: CodeEditorLanguage) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CodeEditor]";
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES THE SHIM PREAMBLE IN EVERY COMPONENT, whether it calls
// every level or not, so a developer adding a log line never has to wire
// one up. `noUnusedLocals` is on (UNUSED-1), and this reference is what
// says that uniformity is deliberate rather than an oversight. Deleting a
// shim to silence the compiler is the wrong repair: `dynamicVerboseShims`
// holds the logDebug and logTrace population as a floor, and the preamble
// is the contract FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug];

const ALL_LANGUAGES: CodeEditorLanguage[] = [
    "javascript", "typescript", "json", "yaml",
    "html", "css", "sql", "python", "markdown", "plaintext"
];
const DEFAULT_ACTIONS: CodeEditorToolbarAction[] = [
    "language", "undo", "redo", "wordwrap", "copy", "format", "save"
];
const LANGUAGE_LABELS: Record<CodeEditorLanguage, string> =
{
    javascript: "JavaScript", typescript: "TypeScript",
    json: "JSON", yaml: "YAML",
    html: "HTML", css: "CSS",
    sql: "SQL", python: "Python",
    markdown: "Markdown", plaintext: "Plain Text"
};
const TOOLBAR_ICONS: Record<string, string> =
{
    undo: "bi-arrow-counterclockwise",
    redo: "bi-arrow-clockwise",
    wordwrap: "bi-text-wrap",
    copy: "bi-clipboard",
    format: "bi-indent",
    save: "bi-floppy"
};
const COPY_FEEDBACK_MS = 1500;
const CHANGE_DEBOUNCE_MS = 100;
let instanceCounter = 0;

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/**
 * THE ONE UNTYPED WINDOW LOOKUP IN THIS COMPONENT, and it is here on purpose.
 *
 * CodeMirror 6 is not vendored into `dist/lib`. The host page supplies the
 * build, and which globals that build publishes is the page's choice, not
 * this library's. This component probes about thirty names and asks for
 * alternatives when the first is absent, as in `tryPush("cmHistory",
 * "history")`. A name the page may or may not have published under a
 * spelling we do not control is not something `components/globals.d.ts` can
 * declare, so the assertion stays and every other lookup in the file goes
 * through this one function.
 *
 * WIN-2 therefore closes above zero rather than at it. Declaring a global
 * that may not exist, so that the count can reach a round number, would
 * make the declaration a worse description of run time than the cast is.
 *
 * @param name - The CodeMirror global to read.
 * @returns The global, or `undefined` when the page did not publish it.
 */
function getCMGlobal(name: string): unknown
{
    return (window as unknown as Record<string, unknown>)[name];
}

/** Check if a CM6 global exists on window (function, object, or array). */
function hasCMGlobal(name: string): boolean
{
    const val = getCMGlobal(name);
    return typeof val === "function" || (typeof val === "object" && val !== null);
}

/**
 * The CodeMirror package that publishes each global this component asks
 * for by name. A refusal that says "undo is unavailable" tells a reader
 * nothing they did not just observe. CodeMirror 6 arrives here as
 * fifteen separate ESM specifiers, so the actionable part of the
 * message is WHICH ONE is missing.
 */
const CM_MODULE: Record<string, string> = {
    EditorState: "@codemirror/state",
    EditorView: "@codemirror/view",
    keymap: "@codemirror/view",
    lineNumbers: "@codemirror/view",
    undo: "@codemirror/commands",
    redo: "@codemirror/commands",
    indentSelection: "@codemirror/commands",
    setDiagnostics: "@codemirror/lint",
};

/**
 * A CM6 global this component was ASKED for, as opposed to one it
 * composes with when present.
 *
 * The difference is whether the caller named the thing. `undo()` is a
 * request and `bracketMatching` is not, so an absent `undo` refuses and
 * an absent `bracketMatching` is simply not composed in. See the
 * OPTIONAL EXTENSIONS note on getCMCoreExtensions.
 */
function requireCMGlobal(name: string, operation: string): unknown
{
    if (!hasCMGlobal(name))
    {
        throw new Error(
            `${LOG_PREFIX} ${operation} needs the CodeMirror "${name}" global, `
            + `and the host page did not publish it. Load `
            + `${CM_MODULE[name] ?? "the module that exports it"} before `
            + `creating the editor.`);
    }

    return getCMGlobal(name);
}

// ============================================================================
// PUBLIC API
// ============================================================================

export class CodeEditor
{
    // -- Configuration
    private readonly instanceId: string;
    private options: CodeEditorOptions;

    // -- State
    private destroyed = false;
    private cmAvailable = false;
    private cmView: unknown = null; // CodeMirror EditorView (typed as unknown)
    private currentLang: CodeEditorLanguage;
    private currentTheme: "light" | "dark";
    private wordWrapEnabled: boolean;
    private lineNumbersEnabled: boolean;

    // -- DOM
    private rootEl!: HTMLElement;
    private toolbarEl: HTMLElement | null = null;
    private editorContainerEl!: HTMLElement;
    private errorEl: HTMLElement | null = null;
    private langSelectEl: HTMLSelectElement | null = null;
    private liveRegionEl!: HTMLElement;
    private toolbarBtns = new Map<string, HTMLButtonElement>();

    // -- Timers
    private changeTimer: ReturnType<typeof setTimeout> | null = null;
    private copyTimer: ReturnType<typeof setTimeout> | null = null;


    constructor(options: CodeEditorOptions)
    {
        instanceCounter++;
        this.instanceId = `ce-${instanceCounter}`;
        this.options = { ...options };
        this.currentLang = options.language || "javascript";
        this.currentTheme = options.theme || "light";
        this.wordWrapEnabled = options.wordWrap || false;
        this.lineNumbersEnabled = options.lineNumbers !== false;

        this.rootEl = this.buildRoot();
        logInfo(`Initialised: ${this.instanceId}`);
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    public show(containerId: string): void
    {
        if (this.guardDestroyed("show")) { return; }

        const c = document.getElementById(containerId);

        if (!c)
        {
            // ERR-1. This logged and carried on, so the caller got a
            // handle to a component that was never mounted.
            throw new Error(
                `${LOG_PREFIX} Container "${containerId}" was not found. `
                + "Insert the element before showing it.");
        }

        c.appendChild(this.rootEl);
        this.initEditor();
    }

    public hide(): void
    {
        if (this.guardDestroyed("hide")) { return; }
        this.rootEl.remove();
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.hide();
        this.clearTimers();
        this.destroyCMView();
        this.destroyed = true;
        logDebug(`Destroyed: ${this.instanceId}`);
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PUBLIC — CONTENT
    // ========================================================================

    public getValue(): string
    {
        // ADR-201. "" is what a working editor says for an empty
        // document, so a caller could not tell that from an editor
        // that never loaded. The sibling refusals landed under ADR-200
        // and this one was missed, because it is the inverted form:
        // the stand-in is the fall-through of a PRESENCE test, not the
        // body of an absence guard, and structure check [16] reads
        // only the latter.
        this.requireView("getValue()");
        return this.getCMDoc();
    }

    public setValue(value: string): void
    {
        if (this.guardDestroyed("setValue")) { return; }
        if (this.cmView) { this.setCMDoc(value); }
        this.fireChange();
    }

    public getLanguage(): CodeEditorLanguage { return this.currentLang; }

    public setLanguage(lang: CodeEditorLanguage): void
    {
        if (this.guardDestroyed("setLanguage")) { return; }
        this.currentLang = lang;

        if (this.langSelectEl) { this.langSelectEl.value = lang; }
        if (this.cmView) { this.reconfigureCMLanguage(); }

        this.options.onLanguageChange?.(lang);
        this.announce(`Language changed to ${LANGUAGE_LABELS[lang]}`);
        logInfo(`Language changed to "${lang}"`);
    }

    // ========================================================================
    // PUBLIC — STATE
    // ========================================================================

    public setReadOnly(readOnly: boolean): void
    {
        if (this.guardDestroyed("setReadOnly")) { return; }
        this.options.readOnly = readOnly;
        this.rootEl.classList.toggle("codeeditor-readonly", readOnly);
        setAttr(this.rootEl, "aria-readonly", String(readOnly));

        if (this.cmView) { this.reconfigureCMReadOnly(); }
        this.updateToolbarDisabledStates();
    }

    public setTheme(theme: "light" | "dark"): void
    {
        if (this.guardDestroyed("setTheme")) { return; }
        this.rootEl.classList.remove(`codeeditor-${this.currentTheme}`);
        this.currentTheme = theme;
        this.rootEl.classList.add(`codeeditor-${theme}`);
        logDebug(`Theme switched to "${theme}"`);
    }

    public setDiagnostics(diagnostics: CodeEditorDiagnostic[]): void
    {
        if (this.guardDestroyed("setDiagnostics")) { return; }

        // The announce comes AFTER the apply, and the apply used to
        // return quietly when the lint module was absent. So a screen
        // reader heard "3 diagnostics" for three diagnostics that had
        // just been discarded. Same class as a tooltip reading
        // "undefined" out loud, and the order matters more than the
        // throw does.
        this.requireView("setDiagnostics()");
        this.applyCMDiagnostics(diagnostics);
        this.announce(`${diagnostics.length} diagnostics`);
    }

    public clearDiagnostics(): void
    {
        this.setDiagnostics([]);
    }

    public focus(): void
    {
        this.requireView("focus()");
        this.focusCM();
    }

    public blur(): void
    {
        this.requireView("blur()");
        this.blurCM();
    }

    public getSelection(): string
    {
        // ADR-157. Returning "" here is a fabricated read: it is the
        // same answer as a real editor with nothing selected, so the
        // caller cannot tell the difference.
        this.requireView("getSelection()");
        return this.getCMSelection();
    }

    public replaceSelection(text: string): void
    {
        if (this.guardDestroyed("replaceSelection")) { return; }
        if (this.options.readOnly) { return; }

        this.requireView("replaceSelection()");
        this.replaceCMSelection(text);
    }

    // ========================================================================
    // PUBLIC — EDITING ACTIONS
    // ========================================================================

    public undo(): void
    {
        // readOnly returns quietly on purpose: the caller configured
        // that, so refusing it would be refusing their own setting.
        if (this.guardDestroyed("undo") || this.options.readOnly) { return; }

        this.requireView("undo()");
        this.cmUndo();
    }

    public redo(): void
    {
        if (this.guardDestroyed("redo") || this.options.readOnly) { return; }

        this.requireView("redo()");
        this.cmRedo();
    }

    public format(): void
    {
        if (this.guardDestroyed("format") || this.options.readOnly) { return; }

        this.requireView("format()");
        this.cmFormat();
    }

    /**
     * DEBT-CE-1. This used to flip the flag, skip the reconfigure when
     * there was no view, and press the button anyway. The reader saw
     * `aria-pressed="true"` over an editor that had wrapped nothing.
     *
     * The refusal comes FIRST, so a refused call leaves the flag alone.
     * A toggle that refuses and still inverts its own state is worse
     * than one that does nothing, because the next call then undoes a
     * change the editor never made.
     */
    public toggleWordWrap(): void
    {
        if (this.guardDestroyed("toggleWordWrap")) { return; }

        this.requireView("toggleWordWrap()");
        this.wordWrapEnabled = !this.wordWrapEnabled;
        this.reconfigureCMWordWrap();
        this.updateWrapBtnState();
    }

    /**
     * DEBT-CE-1. The same shape as `toggleWordWrap`, and the quieter
     * half of it: this one writes no attribute, so a caller got no
     * signal at all. Fixing one and not the other would leave the
     * component answering the same question two ways.
     */
    public toggleLineNumbers(): void
    {
        if (this.guardDestroyed("toggleLineNumbers")) { return; }

        this.requireView("toggleLineNumbers()");
        this.lineNumbersEnabled = !this.lineNumbersEnabled;
        this.reconfigureCMLineNumbers();
    }

    public getEditorInstance(): unknown { return this.cmView; }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /**
     * The CodeMirror key for a named action, honouring `keyBindings`.
     *
     * (CRITICAL) `keyBindings` WAS ACCEPTED, TYPE-CHECKED AND IGNORED.
     * KEYBOARD.md says "every interactive component accepts an
     * optional `keyBindings` property ... to override the defaults",
     * and `getCMKeyBindings` hard-coded `Mod-s`. A caller remapping
     * save got the documented type and the original shortcut.
     *
     * This replaces `resolveKeyCombo` and `matchesKeyCombo`, which
     * were a complete combo matcher with no caller — CodeMirror owns
     * the keymap, so an event matcher was never the way in. The
     * compiler had reported `matchesKeyCombo` as unused since it was
     * written (UNUSED-1).
     *
     * THE DEAD TABLE WAS ALSO WRONG. `DEFAULT_KEY_BINDINGS` recorded
     * `save: "Ctrl+s"` and the live default is `Mod-s`, which is Cmd
     * on macOS. The live one is kept, because a mac user pressing
     * Cmd-s today would lose it otherwise, and the house `+`
     * separator is translated to CodeMirror's `-`.
     */
    private cmKeyFor(action: string, fallback: string): string
    {
        const combo = this.options.keyBindings?.[action];

        return combo ? combo.replace(/\+/g, "-") : fallback;
    }

    // ========================================================================
    // BUILDING — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", ["codeeditor", `codeeditor-${this.currentTheme}`]);
        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "group");
        setAttr(root, "aria-label", "Code editor");

        if (this.options.readOnly) { this.applyReadOnlyAttrs(root); }
        if (this.options.disabled) { this.applyDisabledAttrs(root); }
        if (this.options.cssClass) { root.classList.add(...this.options.cssClass.split(" ")); }

        if (this.options.showToolbar !== false)
        {
            this.toolbarEl = this.buildToolbar();
            root.appendChild(this.toolbarEl);
        }

        this.editorContainerEl = createElement("div", ["codeeditor-editor"]);
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.editorContainerEl.setAttribute("data-dui-region", "codeeditor:editor");
        this.applyEditorHeight();
        root.appendChild(this.editorContainerEl);

        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        root.appendChild(this.liveRegionEl);

        return root;
    }

    private applyReadOnlyAttrs(root: HTMLElement): void
    {
        root.classList.add("codeeditor-readonly");
        setAttr(root, "aria-readonly", "true");
    }

    private applyDisabledAttrs(root: HTMLElement): void
    {
        root.classList.add("codeeditor-disabled");
        setAttr(root, "aria-disabled", "true");
    }

    private applyEditorHeight(): void
    {
        this.editorContainerEl.style.height = this.options.height || "300px";

        if (this.options.maxHeight)
        {
            this.editorContainerEl.style.maxHeight = this.options.maxHeight;
        }
    }

    // ========================================================================
    // BUILDING — TOOLBAR
    // ========================================================================

    private buildToolbar(): HTMLElement
    {
        const bar = createElement("div", ["codeeditor-toolbar"]);
        setAttr(bar, "role", "toolbar");
        setAttr(bar, "aria-label", "Editor actions");

        const actions = this.options.toolbarActions || DEFAULT_ACTIONS;
        let needDivider = false;

        for (const action of actions)
        {
            if (action === "language")
            {
                if (needDivider) { bar.appendChild(this.buildDivider()); }
                bar.appendChild(this.buildLangSelector());
                needDivider = true;
            }
            else
            {
                if (needDivider && this.isDividerPoint(action, actions))
                {
                    bar.appendChild(this.buildDivider());
                }

                bar.appendChild(this.buildToolbarBtn(action));
                needDivider = true;
            }
        }

        bar.addEventListener("click", (e) => this.handleToolbarClick(e));
        return bar;
    }

    private isDividerPoint(
        action: CodeEditorToolbarAction,
        actions: CodeEditorToolbarAction[]
    ): boolean
    {
        const idx = actions.indexOf(action);
        if (idx <= 0) { return false; }
        const prev = actions[idx - 1];
        const groups = [["language"], ["undo", "redo"], ["wordwrap"], ["copy", "format", "save"]];
        const prevGroup = groups.findIndex(g => g.includes(prev));
        const curGroup = groups.findIndex(g => g.includes(action));
        return prevGroup !== curGroup;
    }

    private buildLangSelector(): HTMLSelectElement
    {
        const sel = document.createElement("select");
        sel.classList.add("codeeditor-lang-select", "form-select", "form-select-sm");
        setAttr(sel, "aria-label", "Programming language");

        for (const lang of ALL_LANGUAGES)
        {
            const opt = document.createElement("option");
            opt.value = lang;
            opt.textContent = LANGUAGE_LABELS[lang];
            if (lang === this.currentLang) { opt.selected = true; }
            sel.appendChild(opt);
        }

        sel.addEventListener("change", () => this.onLangChange(sel));
        this.langSelectEl = sel;
        return sel;
    }

    private buildDivider(): HTMLElement
    {
        const div = createElement("div", ["codeeditor-toolbar-divider"]);
        setAttr(div, "role", "separator");
        return div;
    }

    private buildToolbarBtn(action: string): HTMLButtonElement
    {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.classList.add("codeeditor-toolbar-btn");
        setAttr(btn, "data-action", action);
        setAttr(btn, "aria-label", this.getActionLabel(action));
        btn.tabIndex = -1;

        const icon = TOOLBAR_ICONS[action];
        if (icon)
        {
            const i = createElement("i", ["bi", icon]);
            btn.appendChild(i);
        }

        if (action === "wordwrap")
        {
            setAttr(btn, "aria-pressed", String(this.wordWrapEnabled));
            if (this.wordWrapEnabled) { btn.classList.add("codeeditor-toolbar-btn-active"); }
        }

        this.toolbarBtns.set(action, btn);
        return btn;
    }

    private getActionLabel(action: string): string
    {
        const labels: Record<string, string> =
        {
            undo: "Undo", redo: "Redo",
            wordwrap: "Toggle word wrap",
            copy: "Copy to clipboard",
            format: "Format code", save: "Save"
        };
        return labels[action] || action;
    }

    // ========================================================================
    // BUILDING — MISSING DEPENDENCY ERROR
    // ========================================================================

    private buildMissingDependencyError(): HTMLElement
    {
        const el = createElement("div", ["codeeditor-error"]);
        el.textContent =
            "CodeMirror 6 is required but not loaded. " +
            "Add EditorView, EditorState, and language extensions " +
            "to the page before initialising CodeEditor.";
        return el;
    }

    // ========================================================================
    // EDITOR INITIALISATION
    // ========================================================================

    private initEditor(): void
    {
        this.cmAvailable = this.detectCodeMirror();

        if (this.cmAvailable)
        {
            logInfo("CodeMirror 6 detected, initialising rich editor");
            this.initCodeMirror();
        }
        else
        {
            logError("CodeMirror 6 not loaded. " +
                "Ensure EditorView & EditorState globals are available."
            );
            this.showMissingDependencyError();
        }
    }

    private detectCodeMirror(): boolean
    {
        return hasCMGlobal("EditorView") && hasCMGlobal("EditorState");
    }

    // ========================================================================
    // MISSING DEPENDENCY — ERROR DISPLAY
    // ========================================================================

    private showMissingDependencyError(): void
    {
        this.errorEl = this.buildMissingDependencyError();
        this.editorContainerEl.appendChild(this.errorEl);
    }

    // ========================================================================
    // CODEMIRROR — INITIALISATION
    // ========================================================================

    private initCodeMirror(): void
    {
        const EV = getCMGlobal("EditorView") as { new(config: unknown): unknown };
        const ES = getCMGlobal("EditorState") as { create(config: unknown): unknown };

        const extensions = this.buildCMExtensions();

        const state = ES.create({
            doc: this.options.value || "",
            extensions
        });

        this.cmView = new EV({ state, parent: this.editorContainerEl });

        // Canvas anchors name this region rather than counting it (ADR-162). CodeMirror
        // creates `.cm-scroller`, so the attribute goes on after the view
        // exists rather than at build time. The element is third-party; the
        // integration is ours, which is what makes it nameable.
        this.editorContainerEl
            ?.querySelector(".cm-scroller")
            ?.setAttribute("data-dui-region", "codeeditor:cm-scroller");
        this.updateToolbarDisabledStates();

        if (this.options.diagnostics?.length)
        {
            this.applyCMDiagnostics(this.options.diagnostics);
        }
    }

    private buildCMExtensions(): unknown[]
    {
        const exts: unknown[] = [];

        exts.push(...this.getCMCoreExtensions());
        exts.push(...this.getCMKeyBindings());

        if (this.lineNumbersEnabled) { this.pushCMLineNumbers(exts); }
        if (this.wordWrapEnabled) { this.pushCMLineWrapping(exts); }

        const langExt = this.getCMLanguageExtension(this.currentLang);
        if (langExt) { exts.push(langExt); }

        exts.push(this.buildCMUpdateListener());
        exts.push(this.buildCMTheme());

        if (this.options.readOnly)
        {
            this.pushCMReadOnly(exts);
        }

        return exts;
    }

    private getCMCoreExtensions(): unknown[]
    {
        const exts: unknown[] = [];
        const tryPush = (...names: string[]): void =>
        {
            for (const name of names)
            {
                const val = getCMGlobal(name);
                if (typeof val === "function")
                {
                    exts.push((val as () => unknown)());
                    return;
                }
            }
        };

        tryPush("cmHistory", "history");
        tryPush("drawSelection");
        tryPush("dropCursor");
        tryPush("indentOnInput");
        tryPush("bracketMatching");
        tryPush("closeBrackets");
        tryPush("highlightActiveLine");
        tryPush("highlightSelectionMatches");
        tryPush("cmSearch", "search");

        if (hasCMGlobal("syntaxHighlighting") && hasCMGlobal("defaultHighlightStyle"))
        {
            const sh = getCMGlobal("syntaxHighlighting") as (style: unknown, opts?: unknown) => unknown;
            const dhs = getCMGlobal("defaultHighlightStyle");
            exts.push(sh(dhs, { fallback: true }));
        }
        else
        {
            logWarn("syntaxHighlighting or defaultHighlightStyle globals not found; token colours require SCSS rules");
        }

        return exts;
    }

    private getCMKeyBindings(): unknown[]
    {
        // The caller's own Mod-s binding rides on this keymap, so an
        // absent one loses `onSave` as well as every default shortcut.
        const km = requireCMGlobal("keymap", "key bindings") as
            { of(maps: unknown[]): unknown };
        const maps: unknown[] = [];
        const tryPush = (name: string): void =>
        {
            if (hasCMGlobal(name))
            {
                maps.push(...(getCMGlobal(name) as unknown[]));
            }
        };

        tryPush("defaultKeymap");
        tryPush("historyKeymap");
        tryPush("searchKeymap");
        tryPush("closeBracketsKeymap");

        maps.push({
            key: this.cmKeyFor("save", "Mod-s"),
            run: () =>
            {
                this.options.onSave?.(this.getValue());
                return true;
            }
        });

        return [km.of(maps)];
    }

    private pushCMLineNumbers(exts: unknown[]): void
    {
        // Only reached when `options.lineNumbers` asked for them, so an
        // absent module is a named request this component cannot meet.
        exts.push((requireCMGlobal("lineNumbers", "options.lineNumbers") as () => unknown)());
    }

    /**
     * DEBT-CE-1, found while fixing the toggle above. Reached only when
     * word wrap is ON, which `options.wordWrap` or `toggleWordWrap()`
     * asked for. The guard was `if (EV.lineWrapping)`, so a view bundle
     * that does not export it mounted a perfectly normal editor with
     * the button pressed and the lines unwrapped. Its sibling
     * `pushCMLineNumbers` has required its module since ADR-200.
     */
    private pushCMLineWrapping(exts: unknown[]): void
    {
        const EV = requireCMGlobal("EditorView", "word wrap") as Record<string, unknown>;

        if (!EV.lineWrapping)
        {
            throw new Error(
                `${LOG_PREFIX} word wrap needs the "lineWrapping" extension from `
                + "EditorView, and the @codemirror/view bundle on this page does "
                + "not export it. Load a complete @codemirror/view, or create the "
                + "editor with wordWrap false.");
        }

        exts.push(EV.lineWrapping);
    }

    private pushCMReadOnly(exts: unknown[]): void
    {
        const EV = getCMGlobal("EditorView") as Record<string, unknown>;
        const ES = getCMGlobal("EditorState") as Record<string, unknown>;

        if (EV.editable)
        {
            const editable = EV.editable as { of(val: boolean): unknown };
            exts.push(editable.of(false));
        }

        if (ES.readOnly)
        {
            const ro = ES.readOnly as { of(val: boolean): unknown };
            exts.push(ro.of(true));
        }
    }

    private getCMLanguageExtension(lang: CodeEditorLanguage): unknown
    {
        const langMap: Record<string, string> =
        {
            javascript: "javascript",
            typescript: "javascript",
            json: "json", yaml: "yaml",
            html: "html", css: "css",
            sql: "sql", python: "python",
            markdown: "markdown", plaintext: ""
        };

        const fn = langMap[lang];
        if (!fn || !hasCMGlobal(fn)) { return null; }

        const factory = getCMGlobal(fn) as (opts?: unknown) => unknown;

        if (lang === "typescript")
        {
            return factory({ typescript: true });
        }

        return factory();
    }

    private buildCMUpdateListener(): unknown
    {
        const EV = getCMGlobal("EditorView") as Record<string, unknown>;
        const updateListener = EV.updateListener as
            { of(fn: (update: Record<string, boolean>) => void): unknown } | undefined;

        // ADR-200. This used to call `.of` on whatever was there and
        // die with "Cannot read properties of undefined", which names
        // the line and not the build that is short a member. It is how
        // onChange, onFocus and onBlur are delivered, so all three
        // callbacks the caller passed go quiet with it.
        if (!updateListener)
        {
            throw new Error(
                `${LOG_PREFIX} the CodeMirror "EditorView" global has no `
                + "updateListener, which is how onChange, onFocus and onBlur "
                + "are delivered. Load a complete @codemirror/view before "
                + "creating the editor.");
        }

        return updateListener.of((update: Record<string, boolean>) =>
        {
            if (update.docChanged) { this.debouncedFireChange(); }

            if (update.focusChanged)
            {
                const view = this.cmView as Record<string, boolean>;
                if (view.hasFocus) { this.options.onFocus?.(); }
                else { this.options.onBlur?.(); }
            }
        });
    }

    private buildCMTheme(): unknown
    {
        if (!hasCMGlobal("EditorView")) { return []; }
        const EV = getCMGlobal("EditorView") as Record<string, unknown>;
        const themeFn = EV.theme as (spec: Record<string, Record<string, string>>) => unknown;

        if (!themeFn) { return []; }

        return themeFn({
            "&":
            {
                backgroundColor: "var(--codeeditor-bg)",
                color: "var(--codeeditor-text)"
            },
            ".cm-gutters":
            {
                backgroundColor: "var(--codeeditor-gutter-bg)",
                borderRight: "1px solid var(--codeeditor-border)"
            },
            ".cm-lineNumbers .cm-gutterElement":
            {
                color: "var(--codeeditor-line-number)"
            },
            "&.cm-focused .cm-selectionBackground, .cm-selectionBackground":
            {
                backgroundColor: "var(--codeeditor-selection)"
            },
            ".cm-cursor":
            {
                borderLeftColor: "var(--codeeditor-cursor)"
            }
        });
    }

    // ========================================================================
    // CODEMIRROR — OPERATIONS
    // ========================================================================

    private getCMDoc(): string
    {
        const view = this.cmView as Record<string, Record<string, Record<string, unknown>>>;
        return view.state.doc.toString() as string;
    }

    private setCMDoc(value: string): void
    {
        const view = this.cmView as Record<string, unknown>;
        const state = view.state as Record<string, Record<string, number>>;
        const dispatch = view.dispatch as (tr: unknown) => void;

        dispatch({
            changes: { from: 0, to: state.doc.length, insert: value }
        });
    }

    private getCMSelection(): string
    {
        const view = this.cmView as Record<string, Record<string, unknown>>;
        const state = view.state as Record<string, unknown>;
        const sliceDoc = state.sliceDoc as (from: number, to: number) => string;
        const sel = state.selection as Record<string, Array<Record<string, number>>>;
        const range = sel.ranges[0];

        if (!range || range.from === range.to) { return ""; }
        return sliceDoc(range.from, range.to);
    }

    private replaceCMSelection(text: string): void
    {
        const view = this.cmView as Record<string, unknown>;
        const dispatch = view.dispatch as (spec: unknown) => void;
        const state = view.state as Record<string, unknown>;
        const replaceSelection = state.replaceSelection as (text: string) => unknown;

        if (replaceSelection)
        {
            dispatch(replaceSelection(text));
        }
    }

    private focusCM(): void
    {
        const view = this.cmView as Record<string, unknown>;
        (view.focus as () => void)();
    }

    private blurCM(): void
    {
        const view = this.cmView as Record<string, Record<string, unknown>>;
        (view.contentDOM as unknown as HTMLElement).blur();
    }

    private cmUndo(): void
    {
        (requireCMGlobal("undo", "undo()") as (view: unknown) => void)(this.cmView);
    }

    private cmRedo(): void
    {
        (requireCMGlobal("redo", "redo()") as (view: unknown) => void)(this.cmView);
    }

    private cmFormat(): void
    {
        (requireCMGlobal("indentSelection", "format()") as
            (arg: { state: unknown; dispatch: unknown }) => void)(
            this.cmView as { state: unknown; dispatch: unknown }
        );
    }

    private destroyCMView(): void
    {
        if (!this.cmView) { return; }
        const view = this.cmView as Record<string, unknown>;
        (view.destroy as () => void)();
        this.cmView = null;
    }

    private reconfigureCMLanguage(): void
    {
        // Full reconfigure would require compartment pattern;
        // for simplicity, we rebuild the entire view
        this.rebuildCMView();
    }

    private reconfigureCMReadOnly(): void
    {
        this.rebuildCMView();
    }

    private reconfigureCMWordWrap(): void
    {
        this.rebuildCMView();
    }

    private reconfigureCMLineNumbers(): void
    {
        this.rebuildCMView();
    }

    private rebuildCMView(): void
    {
        if (!this.cmView) { return; }

        const value = this.getCMDoc();
        this.destroyCMView();
        this.editorContainerEl.innerHTML = "";
        this.options.value = value;
        this.initCodeMirror();
    }

    private applyCMDiagnostics(diagnostics: CodeEditorDiagnostic[]): void
    {
        const setDiagsFn = requireCMGlobal("setDiagnostics", "setDiagnostics()");

        const view = this.cmView as Record<string, Record<string, Record<string, unknown>>>;
        const doc = view.state.doc;
        const lines = doc.lines as number;

        const cmDiags = diagnostics
            .filter(d => d.line >= 1 && d.line <= lines)
            .map(d => this.toCMDiagnostic(d, doc));

        const setDiags = setDiagsFn as (state: unknown, diags: unknown[]) => unknown;
        const dispatch = (this.cmView as Record<string, (tr: unknown) => void>).dispatch;
        dispatch(setDiags(view.state, cmDiags));
    }

    private toCMDiagnostic(
        d: CodeEditorDiagnostic,
        doc: Record<string, unknown>
    ): Record<string, unknown>
    {
        const lineObj = (doc.line as (n: number) => Record<string, number>)(d.line);
        const from = lineObj.from + (d.column ? Math.min(d.column - 1, lineObj.length) : 0);

        return { from, to: from, severity: d.severity, message: d.message };
    }

    // ========================================================================
    // TOOLBAR — HANDLERS
    // ========================================================================

    private handleToolbarClick(e: Event): void
    {
        const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
        if (!btn) { return; }

        const action = btn.getAttribute("data-action");
        if (!action) { return; }

        this.executeToolbarAction(action);
    }

    private executeToolbarAction(action: string): void
    {
        switch (action)
        {
            case "undo": this.undo(); break;
            case "redo": this.redo(); break;
            case "wordwrap": this.toggleWordWrap(); break;
            case "copy": this.copyToClipboard(); break;
            case "format": this.format(); break;
            case "save": this.options.onSave?.(this.getValue()); break;
        }

        this.focus();
    }

    private onLangChange(sel: HTMLSelectElement): void
    {
        this.setLanguage(sel.value as CodeEditorLanguage);
        this.focus();
    }

    /**
     * FALLBACK-6. The removed execCommand path called showCopyFeedback()
     * unconditionally and never looked at the boolean execCommand returns,
     * so the tick appeared whether or not anything reached the clipboard.
     */
    private copyToClipboard(): void
    {
        const text = this.getValue();

        if (!navigator.clipboard?.writeText)
        {
            logError("Cannot copy, because the Clipboard API is "
                + "unavailable.");

            throw new Error(
                "CodeEditor cannot copy to the clipboard. The Clipboard "
                + "API needs a secure context, so serve the page over "
                + "https or localhost.");
        }

        navigator.clipboard.writeText(text)
            .then(() => this.showCopyFeedback())
            .catch(err =>
            {
                logError("The clipboard write failed, so nothing was "
                    + "copied:", err);
                throw err;
            });
    }

    private showCopyFeedback(): void
    {
        const btn = this.toolbarBtns.get("copy");
        if (!btn) { return; }

        const icon = btn.querySelector("i");
        if (!icon) { return; }

        icon.className = "bi bi-check";
        logDebug("Content copied to clipboard");

        if (this.copyTimer) { clearTimeout(this.copyTimer); }

        this.copyTimer = setTimeout(() =>
        {
            icon.className = `bi ${TOOLBAR_ICONS.copy}`;
            this.copyTimer = null;
        }, COPY_FEEDBACK_MS);
    }

    private updateToolbarDisabledStates(): void
    {
        const isReadOnly = this.options.readOnly || false;

        this.setToolbarBtnDisabled("undo", isReadOnly);
        this.setToolbarBtnDisabled("redo", isReadOnly);
        this.setToolbarBtnDisabled("format", isReadOnly || !this.cmAvailable);

        if (this.langSelectEl)
        {
            this.langSelectEl.disabled = this.options.disabled || false;
        }

        if (!this.options.onSave)
        {
            this.setToolbarBtnDisabled("save", true);
        }
    }

    private setToolbarBtnDisabled(action: string, disabled: boolean): void
    {
        const btn = this.toolbarBtns.get(action);
        if (!btn) { return; }

        btn.disabled = disabled;
        btn.classList.toggle("codeeditor-toolbar-btn-disabled", disabled);
    }

    private updateWrapBtnState(): void
    {
        const btn = this.toolbarBtns.get("wordwrap");
        if (!btn) { return; }

        setAttr(btn, "aria-pressed", String(this.wordWrapEnabled));
        btn.classList.toggle("codeeditor-toolbar-btn-active", this.wordWrapEnabled);
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * The view, or a refusal naming the operation that wanted it.
     *
     * Reached when CodeMirror never loaded. The mount already said so,
     * loudly and in the DOM, through showMissingDependencyError, so a
     * caller arriving here has acted on an editor that is displaying an
     * error. This used to be `if (this.cmView) { ... }` with no else in
     * nine public methods, so every one of them returned normally
     * having done nothing.
     */
    private requireView(method: string): unknown
    {
        if (!this.cmView)
        {
            throw new Error(
                `${LOG_PREFIX} ${method} needs CodeMirror, which did not load. `
                + "The editor is showing a missing-dependency notice in its "
                + "container. Load the CodeMirror 6 bundle before creating it.");
        }

        return this.cmView;
    }

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            logWarn(`Cannot ${method}: component destroyed`);
            return true;
        }

        return false;
    }

    private announce(message: string): void
    {
        if (!this.liveRegionEl) { return; }
        this.liveRegionEl.textContent = "";

        requestAnimationFrame(() =>
        {
            this.liveRegionEl.textContent = message;
        });
    }

    private fireChange(): void
    {
        this.options.onChange?.(this.getValue());
    }

    private debouncedFireChange(): void
    {
        if (this.changeTimer) { clearTimeout(this.changeTimer); }

        this.changeTimer = setTimeout(() =>
        {
            this.fireChange();
            this.changeTimer = null;
        }, CHANGE_DEBOUNCE_MS);
    }

    private clearTimers(): void
    {
        if (this.changeTimer) { clearTimeout(this.changeTimer); }
        if (this.copyTimer) { clearTimeout(this.copyTimer); }
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

export function createCodeEditor(
    containerId: string,
    options?: CodeEditorOptions): CodeEditor
{
    const instance = new CodeEditor(options || {});
    instance.show(containerId);
    return instance;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    window["CodeEditor"] = CodeEditor;
    window["createCodeEditor"] = createCodeEditor;
}
