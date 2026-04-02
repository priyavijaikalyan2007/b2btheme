/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: theme
 * File GUID: 877fa754-87dd-4960-844c-9b75c367a225
 * Created: 2026
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LatexEditor
 * 📜 PURPOSE: WYSIWYG + source LaTeX equation editor with symbol palette,
 *    live KaTeX preview, styling controls, and DiagramEngine embeddability.
 * 🔗 RELATES: [[EnterpriseTheme]], [[KaTeX]], [[MathLive]], [[DiagramEngine]]
 * ⚡ FLOW: [Consumer] -> [createLatexEditor(opts)] -> [textarea + KaTeX preview]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS + LOGGING
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[LatexEditor]";

const _lu = (typeof (window as any).createLogUtility === "function")
    ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
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
    _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

/** Default minimum width in px. */
const DEFAULT_MIN_WIDTH = 400;

/** Default minimum height in px. */
const DEFAULT_MIN_HEIGHT = 300;

/** Debounce interval for preview updates in source mode (ms). */
const PREVIEW_DEBOUNCE_MS = 150;

/** Instance counter for unique IDs. */
let _instanceId = 0;

// ============================================================================
// EXPORTED INTERFACES
// ============================================================================

/** Configuration options for the LatexEditor component. */
export interface LatexEditorOptions
{
    /** Container element or CSS selector. */
    container: HTMLElement | string;

    /** Initial LaTeX expression. Default: "". */
    expression?: string;

    /** Initial editing mode. Default: "visual". */
    editMode?: "visual" | "source";

    /** Display mode (block) or inline mode. Default: true (display). */
    displayMode?: boolean;

    /** Show the styling toolbar. Default: true. */
    showToolbar?: boolean;

    /** Show the symbol palette. Default: true. */
    showSymbolPalette?: boolean;

    /** Show the live preview pane. Default: true. */
    showPreview?: boolean;

    /** Contained mode (for DiagramEngine embedding). Default: false. */
    contained?: boolean;

    /** Minimum width in px. Default: 400. */
    minWidth?: number;

    /** Minimum height in px. Default: 300. */
    minHeight?: number;

    /** Additional CSS class on root element. */
    cssClass?: string;

    /** Read-only mode. Default: false. */
    readOnly?: boolean;

    /** Enable mhchem chemistry extension. Default: true. */
    enableChemistry?: boolean;

    /** Enable cancel/strikethrough commands. Default: true. */
    enableCancel?: boolean;

    /** Callback when expression changes. */
    onChange?: (latex: string) => void;

    /** Callback when user confirms (e.g. Ctrl+Enter). */
    onConfirm?: (latex: string, mathml: string) => void;
}

/** Public API surface for the LatexEditor component. */
export interface LatexEditor
{
    /** Get current LaTeX expression. */
    getLatex(): string;

    /** Get MathML output (converted from current LaTeX). */
    getMathML(): string;

    /** Get both formats at once. */
    getValue(): { latex: string; mathml: string };

    /** Set LaTeX expression programmatically. */
    setExpression(latex: string): void;

    /** Switch editing mode. */
    setEditMode(mode: "visual" | "source"): void;

    /** Get current editing mode. */
    getEditMode(): "visual" | "source";

    /** Insert LaTeX at cursor position. */
    insertAtCursor(latex: string): void;

    /** Set read-only state. */
    setReadOnly(readOnly: boolean): void;

    /** Focus the editor. */
    focus(): void;

    /** Destroy the component and clean up. */
    destroy(): void;

    /** Get the root DOM element. */
    getElement(): HTMLElement;
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Internal mutable state for the editor instance. */
interface InternalState
{
    /** Unique instance ID. */
    id: number;

    /** Resolved options with defaults applied. */
    options: Required<Pick<LatexEditorOptions, "displayMode" | "showToolbar" |
        "showSymbolPalette" | "showPreview" | "contained" | "minWidth" |
        "minHeight" | "readOnly" | "enableChemistry" | "enableCancel">> &
        Pick<LatexEditorOptions, "cssClass" | "onChange" | "onConfirm">;

    /** Current LaTeX expression. */
    expression: string;

    /** Current editing mode. */
    editMode: "visual" | "source";

    /** Root DOM element. */
    rootEl: HTMLElement | null;

    /** Container that was resolved. */
    containerEl: HTMLElement | null;

    /** Source textarea element. */
    sourceEl: HTMLTextAreaElement | null;

    /** Preview pane element. */
    previewEl: HTMLElement | null;

    /** Editor area wrapper. */
    editorEl: HTMLElement | null;

    /** Debounce timer for preview updates. */
    previewTimer: ReturnType<typeof setTimeout> | null;

    /** Whether the component has been destroyed. */
    destroyed: boolean;
}

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.classList.add(...className.split(" "));
    }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(
    el: HTMLElement,
    attrs: Record<string, string>): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/** Resolve a container element from a string selector or HTMLElement. */
function resolveContainer(input: HTMLElement | string): HTMLElement | null
{
    if (typeof input === "string")
    {
        return document.querySelector(input) as HTMLElement | null;
    }
    return input;
}

// ============================================================================
// PRIVATE HELPERS — KATEX
// ============================================================================

/** Reference to KaTeX global, if available. */
function getKaTeX(): any
{
    return (window as unknown as Record<string, unknown>)["katex"] || null;
}

/** Render LaTeX to HTML string using KaTeX. */
function renderKaTeX(
    latex: string,
    displayMode: boolean): string
{
    const katex = getKaTeX();
    if (!katex)
    {
        return escapeHtml(latex);
    }
    try
    {
        return katex.renderToString(latex, {
            displayMode,
            throwOnError: false,
            output: "html",
        });
    }
    catch (err)
    {
        logDebug("KaTeX render error:", err);
        return buildErrorHtml(latex, String(err));
    }
}

/** Build error display HTML for preview. */
function buildErrorHtml(latex: string, error: string): string
{
    const escaped = escapeHtml(latex);
    const msg = escapeHtml(error);
    return "<div class=\"le-preview-error\">" + msg + "</div>" +
           "<div class=\"le-preview-raw\">" + escaped + "</div>";
}

/** Escape HTML special characters. */
function escapeHtml(text: string): string
{
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// PRIVATE HELPERS — STATE
// ============================================================================

/** Apply default values to options. */
function resolveOptions(
    opts: LatexEditorOptions): InternalState["options"]
{
    return {
        displayMode: opts.displayMode !== false,
        showToolbar: opts.showToolbar !== false,
        showSymbolPalette: opts.showSymbolPalette !== false,
        showPreview: opts.showPreview !== false,
        contained: opts.contained === true,
        minWidth: opts.minWidth || DEFAULT_MIN_WIDTH,
        minHeight: opts.minHeight || DEFAULT_MIN_HEIGHT,
        readOnly: opts.readOnly === true,
        enableChemistry: opts.enableChemistry !== false,
        enableCancel: opts.enableCancel !== false,
        cssClass: opts.cssClass,
        onChange: opts.onChange,
        onConfirm: opts.onConfirm,
    };
}

/** Create initial internal state. */
function createState(opts: LatexEditorOptions): InternalState
{
    return {
        id: ++_instanceId,
        options: resolveOptions(opts),
        expression: opts.expression || "",
        editMode: "source",
        rootEl: null,
        containerEl: null,
        sourceEl: null,
        previewEl: null,
        editorEl: null,
        previewTimer: null,
        destroyed: false,
    };
}

// ============================================================================
// RENDER — ROOT
// ============================================================================

/** Build the root DOM structure. */
function renderRoot(state: InternalState): void
{
    const root = createElement("div", "le-root");
    setAttr(root, {
        role: "group",
        "aria-label": "LaTeX Equation Editor",
    });

    applyRootStyles(state, root);
    renderEditorArea(state, root);
    renderPreview(state, root);

    state.rootEl = root;
    if (state.containerEl)
    {
        state.containerEl.appendChild(root);
    }
}

/** Apply styles and classes to the root element. */
function applyRootStyles(state: InternalState, root: HTMLElement): void
{
    if (state.options.cssClass)
    {
        root.classList.add(state.options.cssClass);
    }

    if (state.options.contained)
    {
        root.classList.add("le-root--contained");
    }
    else
    {
        root.style.minWidth = state.options.minWidth + "px";
        root.style.minHeight = state.options.minHeight + "px";
    }
}

// ============================================================================
// RENDER — EDITOR AREA
// ============================================================================

/** Build the editor area with source textarea. */
function renderEditorArea(state: InternalState, root: HTMLElement): void
{
    const editor = createElement("div", "le-editor");
    root.appendChild(editor);
    state.editorEl = editor;

    renderSourceTextarea(state, editor);
}

/** Build the source mode textarea. */
function renderSourceTextarea(
    state: InternalState,
    parent: HTMLElement): void
{
    const textarea = document.createElement("textarea");
    textarea.classList.add("le-source");
    textarea.value = state.expression;
    textarea.readOnly = state.options.readOnly;
    textarea.spellcheck = false;

    setAttr(textarea, {
        "aria-label": "LaTeX equation source",
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
    });

    textarea.addEventListener("input", () => handleSourceInput(state));
    textarea.addEventListener("keydown", (e) => handleKeyDown(state, e));

    parent.appendChild(textarea);
    state.sourceEl = textarea;
}

// ============================================================================
// RENDER — PREVIEW
// ============================================================================

/** Build the live preview pane. */
function renderPreview(state: InternalState, root: HTMLElement): void
{
    if (!state.options.showPreview)
    {
        return;
    }

    const preview = createElement("div", "le-preview");
    setAttr(preview, {
        role: "status",
        "aria-live": "polite",
        "aria-label": "Equation preview",
    });

    root.appendChild(preview);
    state.previewEl = preview;

    updatePreview(state);
}

/** Update the KaTeX preview from the current expression. */
function updatePreview(state: InternalState): void
{
    if (!state.previewEl || state.destroyed)
    {
        return;
    }

    const html = renderKaTeX(state.expression, state.options.displayMode);
    state.previewEl.innerHTML = html;
    logTrace("Preview updated");
}

/** Debounced preview update for source mode. */
function schedulePreviewUpdate(state: InternalState): void
{
    if (state.previewTimer)
    {
        clearTimeout(state.previewTimer);
    }

    state.previewTimer = setTimeout(
        () => updatePreview(state),
        PREVIEW_DEBOUNCE_MS
    );
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/** Handle input in the source textarea. */
function handleSourceInput(state: InternalState): void
{
    if (!state.sourceEl || state.destroyed)
    {
        return;
    }

    state.expression = state.sourceEl.value;
    schedulePreviewUpdate(state);
    fireOnChange(state);
}

/** Handle keydown events in the source textarea. */
function handleKeyDown(state: InternalState, e: KeyboardEvent): void
{
    if (state.destroyed)
    {
        return;
    }

    if (e.key === "Enter" && e.ctrlKey)
    {
        e.preventDefault();
        fireOnConfirm(state);
    }
}

/** Fire the onChange callback. */
function fireOnChange(state: InternalState): void
{
    if (state.options.onChange)
    {
        state.options.onChange(state.expression);
    }
}

/** Fire the onConfirm callback. */
function fireOnConfirm(state: InternalState): void
{
    if (state.options.onConfirm)
    {
        state.options.onConfirm(state.expression, getMathMLInternal(state));
    }
}

// ============================================================================
// MATHML CONVERSION
// ============================================================================

/** Get MathML from current expression (stub until MathLive Phase 4). */
function getMathMLInternal(_state: InternalState): string
{
    // MathML conversion requires MathLive (Phase 4).
    // For now, return empty string.
    return "";
}

// ============================================================================
// PUBLIC API — INSERT AT CURSOR
// ============================================================================

/** Insert LaTeX at the current cursor position in source mode. */
function insertAtCursorInternal(
    state: InternalState,
    latex: string): void
{
    if (!state.sourceEl || state.destroyed)
    {
        return;
    }

    const ta = state.sourceEl;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.substring(0, start);
    const after = ta.value.substring(end);

    ta.value = before + latex + after;
    state.expression = ta.value;

    // Position cursor after inserted text
    const newPos = start + latex.length;
    ta.selectionStart = newPos;
    ta.selectionEnd = newPos;

    updatePreview(state);
    fireOnChange(state);
    logDebug("Inserted at cursor:", latex);
}

// ============================================================================
// PUBLIC API — FACTORY
// ============================================================================

// @entrypoint

/** Create a new LatexEditor instance. */
export function createLatexEditor(opts: LatexEditorOptions): LatexEditor
{
    const state = createState(opts);

    state.containerEl = resolveContainer(opts.container);
    if (!state.containerEl)
    {
        logWarn("Container not found:", opts.container);
    }

    renderRoot(state);
    logInfo("Initialised", { id: state.id, mode: state.editMode });

    return buildPublicHandle(state);
}

/** Build the public API handle. */
function buildPublicHandle(state: InternalState): LatexEditor
{
    return {
        getLatex(): string
        {
            return state.expression;
        },

        getMathML(): string
        {
            return getMathMLInternal(state);
        },

        getValue(): { latex: string; mathml: string }
        {
            return {
                latex: state.expression,
                mathml: getMathMLInternal(state),
            };
        },

        setExpression(latex: string): void
        {
            state.expression = latex;
            if (state.sourceEl)
            {
                state.sourceEl.value = latex;
            }
            updatePreview(state);
            fireOnChange(state);
            logDebug("Expression set:", latex);
        },

        setEditMode(mode: "visual" | "source"): void
        {
            state.editMode = mode;
            logDebug("Edit mode set:", mode);
        },

        getEditMode(): "visual" | "source"
        {
            return state.editMode;
        },

        insertAtCursor(latex: string): void
        {
            insertAtCursorInternal(state, latex);
        },

        setReadOnly(readOnly: boolean): void
        {
            state.options.readOnly = readOnly;
            if (state.sourceEl)
            {
                state.sourceEl.readOnly = readOnly;
            }
            logDebug("Read-only:", readOnly);
        },

        focus(): void
        {
            if (state.sourceEl && !state.destroyed)
            {
                state.sourceEl.focus();
            }
        },

        destroy(): void
        {
            if (state.destroyed)
            {
                return;
            }
            state.destroyed = true;
            if (state.previewTimer)
            {
                clearTimeout(state.previewTimer);
            }
            if (state.rootEl && state.rootEl.parentNode)
            {
                state.rootEl.parentNode.removeChild(state.rootEl);
            }
            state.rootEl = null;
            state.sourceEl = null;
            state.previewEl = null;
            state.editorEl = null;
            state.containerEl = null;
            state.expression = "";
            logInfo("Destroyed", { id: state.id });
        },

        getElement(): HTMLElement
        {
            return state.rootEl!;
        },
    };
}

// ⚓ LatexEditor — register on window for IIFE consumers
(window as unknown as Record<string, unknown>)["createLatexEditor"] = createLatexEditor;
