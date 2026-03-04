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
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    save: "Ctrl+s",
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

/** Check if a CM6 global function exists on window. */
function hasCMGlobal(name: string): boolean
{
    return typeof (window as unknown as Record<string, unknown>)[name] === "function";
}

/** Get a CM6 global from window. */
function getCMGlobal(name: string): unknown
{
    return (window as unknown as Record<string, unknown>)[name];
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
        console.log(`${LOG_PREFIX} Initialised: ${this.instanceId}`);
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
            console.error(`${LOG_PREFIX} Container not found: ${containerId}`);
            return;
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
        console.debug(`${LOG_PREFIX} Destroyed: ${this.instanceId}`);
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PUBLIC — CONTENT
    // ========================================================================

    public getValue(): string
    {
        if (this.cmView) { return this.getCMDoc(); }
        return "";
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
        console.log(`${LOG_PREFIX} Language changed to "${lang}"`);
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
        console.debug(`${LOG_PREFIX} Theme switched to "${theme}"`);
    }

    public setDiagnostics(diagnostics: CodeEditorDiagnostic[]): void
    {
        if (this.guardDestroyed("setDiagnostics")) { return; }

        if (!this.cmView) { return; }
        this.applyCMDiagnostics(diagnostics);
        this.announce(`${diagnostics.length} diagnostics`);
    }

    public clearDiagnostics(): void
    {
        this.setDiagnostics([]);
    }

    public focus(): void
    {
        if (this.cmView) { this.focusCM(); }
    }

    public blur(): void
    {
        if (this.cmView) { this.blurCM(); }
    }

    public getSelection(): string
    {
        if (this.cmView) { return this.getCMSelection(); }
        return "";
    }

    public replaceSelection(text: string): void
    {
        if (this.guardDestroyed("replaceSelection")) { return; }
        if (this.options.readOnly) { return; }

        if (this.cmView) { this.replaceCMSelection(text); }
    }

    // ========================================================================
    // PUBLIC — EDITING ACTIONS
    // ========================================================================

    public undo(): void
    {
        if (this.guardDestroyed("undo") || this.options.readOnly) { return; }

        if (this.cmView) { this.cmUndo(); }
    }

    public redo(): void
    {
        if (this.guardDestroyed("redo") || this.options.readOnly) { return; }

        if (this.cmView) { this.cmRedo(); }
    }

    public format(): void
    {
        if (this.guardDestroyed("format") || this.options.readOnly) { return; }

        if (this.cmView) { this.cmFormat(); }
    }

    public toggleWordWrap(): void
    {
        if (this.guardDestroyed("toggleWordWrap")) { return; }
        this.wordWrapEnabled = !this.wordWrapEnabled;

        if (this.cmView) { this.reconfigureCMWordWrap(); }

        this.updateWrapBtnState();
    }

    public toggleLineNumbers(): void
    {
        if (this.guardDestroyed("toggleLineNumbers")) { return; }
        this.lineNumbersEnabled = !this.lineNumbersEnabled;

        if (this.cmView) { this.reconfigureCMLineNumbers(); }
    }

    public getEditorInstance(): unknown { return this.cmView; }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the combo string for a named action.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Returns true if the keyboard event matches the named action combo.
     */
    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }
        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");
        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
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
            console.log(`${LOG_PREFIX} CodeMirror 6 detected, initialising rich editor`);
            this.initCodeMirror();
        }
        else
        {
            console.error(
                `${LOG_PREFIX} CodeMirror 6 not loaded. ` +
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
        const tryPush = (name: string): void =>
        {
            if (hasCMGlobal(name))
            {
                const fn = getCMGlobal(name) as () => unknown;
                exts.push(fn());
            }
        };

        tryPush("history");
        tryPush("drawSelection");
        tryPush("dropCursor");
        tryPush("indentOnInput");
        tryPush("bracketMatching");
        tryPush("closeBrackets");
        tryPush("highlightActiveLine");
        tryPush("highlightSelectionMatches");
        tryPush("search");

        if (hasCMGlobal("syntaxHighlighting") && hasCMGlobal("defaultHighlightStyle"))
        {
            const sh = getCMGlobal("syntaxHighlighting") as (style: unknown, opts?: unknown) => unknown;
            const dhs = getCMGlobal("defaultHighlightStyle");
            exts.push(sh(dhs, { fallback: true }));
        }
        else
        {
            console.warn(`${LOG_PREFIX} syntaxHighlighting or defaultHighlightStyle globals not found; token colours require SCSS rules`);
        }

        return exts;
    }

    private getCMKeyBindings(): unknown[]
    {
        if (!hasCMGlobal("keymap")) { return []; }

        const km = getCMGlobal("keymap") as { of(maps: unknown[]): unknown };
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
            key: "Mod-s",
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
        if (hasCMGlobal("lineNumbers"))
        {
            exts.push((getCMGlobal("lineNumbers") as () => unknown)());
        }
    }

    private pushCMLineWrapping(exts: unknown[]): void
    {
        if (hasCMGlobal("EditorView"))
        {
            const EV = getCMGlobal("EditorView") as Record<string, unknown>;
            if (EV.lineWrapping) { exts.push(EV.lineWrapping); }
        }
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
        const updateListener = EV.updateListener as { of(fn: (update: Record<string, boolean>) => void): unknown };

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
        if (hasCMGlobal("undo"))
        {
            (getCMGlobal("undo") as (view: unknown) => void)(this.cmView);
        }
    }

    private cmRedo(): void
    {
        if (hasCMGlobal("redo"))
        {
            (getCMGlobal("redo") as (view: unknown) => void)(this.cmView);
        }
    }

    private cmFormat(): void
    {
        if (hasCMGlobal("indentSelection"))
        {
            (getCMGlobal("indentSelection") as (arg: { state: unknown; dispatch: unknown }) => void)(
                this.cmView as { state: unknown; dispatch: unknown }
            );
        }
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
        if (!hasCMGlobal("setDiagnostics")) { return; }

        const view = this.cmView as Record<string, Record<string, Record<string, unknown>>>;
        const doc = view.state.doc;
        const lines = doc.lines as number;

        const cmDiags = diagnostics
            .filter(d => d.line >= 1 && d.line <= lines)
            .map(d => this.toCMDiagnostic(d, doc));

        const setDiags = getCMGlobal("setDiagnostics") as (state: unknown, diags: unknown[]) => unknown;
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

    private copyToClipboard(): void
    {
        const text = this.getValue();

        if (navigator.clipboard?.writeText)
        {
            navigator.clipboard.writeText(text)
                .then(() => this.showCopyFeedback())
                .catch(err => this.fallbackCopy(text, err));
        }
        else
        {
            this.fallbackCopy(text);
        }
    }

    private fallbackCopy(text: string, err?: unknown): void
    {
        if (err) { console.warn(`${LOG_PREFIX} Clipboard write failed:`, err); }

        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        this.showCopyFeedback();
    }

    private showCopyFeedback(): void
    {
        const btn = this.toolbarBtns.get("copy");
        if (!btn) { return; }

        const icon = btn.querySelector("i");
        if (!icon) { return; }

        icon.className = "bi bi-check";
        console.debug(`${LOG_PREFIX} Content copied to clipboard`);

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

    private guardDestroyed(method: string): boolean
    {
        if (this.destroyed)
        {
            console.warn(`${LOG_PREFIX} Cannot ${method}: component destroyed`);
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
    (window as unknown as Record<string, unknown>)["CodeEditor"] = CodeEditor;
    (window as unknown as Record<string, unknown>)["createCodeEditor"] = createCodeEditor;
}
