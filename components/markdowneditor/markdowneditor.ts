/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: MarkdownEditor
 * PURPOSE: Bootstrap 5-themed wrapper around the Vditor markdown editor with
 *    tab/side-by-side layout modes, collapsible panes, inline selection
 *    toolbar, export, and optional modal hosting.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * FLOW: [Consumer App] -> [createMarkdownEditor()] -> [Vditor instance]
 * SECURITY: DOMPurify sanitises all HTML output before DOM insertion or export.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the MarkdownEditor component.
 */
export interface MarkdownEditorOptions
{
    /** Initial markdown content. */
    value?: string;

    /** Layout mode. Default "tabs".
     *  "display" renders read-only markdown with no chrome. Suitable for hovers/popovers.
     *  "naked" renders an editable Vditor surface with no chrome — feels like a textarea
     *  that understands markdown. Has form-control border and CSS resize. */
    mode?: "tabs" | "sidebyside" | "display" | "naked";

    /** Editing mode: true = readwrite, false = readonly. Default true. */
    editable?: boolean;

    /** Editor title shown in header bar. */
    title?: string;

    /** Default height (CSS value). Default "70vh". */
    height?: string;

    /** Default width (CSS value). Default "100%". */
    width?: string;

    /** Minimum height in pixels. Default 300. */
    minHeight?: number;

    /** Minimum width in pixels. Default 400. */
    minWidth?: number;

    /** Show export dropdown. Default true. */
    showExport?: boolean;

    /** Show fullscreen toggle. Default true. */
    showFullscreen?: boolean;

    /** Show inline selection toolbar. Default true. */
    showInlineToolbar?: boolean;

    /** Show character counter. Default false. */
    showCounter?: boolean;

    /** Placeholder text for empty editor. */
    placeholder?: string;

    /** Vditor editing mode. Default "ir". */
    vditorMode?: "ir" | "wysiwyg" | "sv";

    /** Bootstrap size variant. */
    size?: "sm" | "md" | "lg";

    /** Disabled state. Default false. */
    disabled?: boolean;

    /** Scope display-mode styles to prevent CSS bleed. Default false. */
    isolated?: boolean;

    /** Tighter vertical spacing for embedded/sidebar contexts. Default false. */
    compact?: boolean;

    /** Color theme for display mode. Default "light". */
    theme?: "light" | "dark";

    /** Custom Vditor toolbar items. */
    toolbar?: string[];

    /** Custom Vditor options (merged with defaults). */
    vditorOptions?: Record<string, unknown>;

    /** Contained mode: use "100%" default height instead of "70vh" for embedding. */
    contained?: boolean;

    /** Callback: content changed. */
    onChange?: (value: string) => void;

    /** Callback: editor ready. */
    onReady?: () => void;

    /** Callback: save triggered (Ctrl+Enter or Save button). */
    onSave?: (value: string) => void;

    /** Callback: mode switched. */
    onModeChange?: (mode: "tabs" | "sidebyside" | "display" | "naked") => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

/**
 * Options for opening the editor in a Bootstrap modal.
 */
export interface MarkdownEditorModalOptions extends MarkdownEditorOptions
{
    /** Modal title. */
    modalTitle?: string;

    /** Show Save button in modal footer. Default true. */
    showSave?: boolean;

    /** Save button label. Default "Save". */
    saveLabel?: string;

    /** Cancel button label. Default "Cancel". */
    cancelLabel?: string;

    /** Callback: modal closed (returns content or null if cancelled). */
    onClose?: (value: string | null) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[MarkdownEditor]";

/**
 * Origin-relative base for Vditor's lazily-fetched sub-resources (ADR-149).
 *
 * Vditor builds these as `${cdn}/dist/js/...`, so this must be the directory
 * CONTAINING vditor's own `dist/`, not `dist/` itself. Derived from the
 * script's own origin so the mirror works on any host serving this library —
 * static.knobby.io, a local build, or a fork — rather than hardcoding one
 * domain into a component other people deploy.
 *
 * Pinned to the version this component was built against. A Vditor upgrade
 * must bump BOTH this constant and the vendored tree in
 * `scripts/vendor-closure.mjs`, or the editor silently fetches a mismatched
 * engine.
 */
const VDITOR_VERSION = "3.11.2";

const VDITOR_CDN = ((): string =>
{
    try
    {
        const self = document.currentScript as HTMLScriptElement | null;
        const origin = self?.src
            ? new URL(self.src).origin
            : window.location.origin;

        return `${origin}/lib/vditor-${VDITOR_VERSION}`;
    }
    catch
    {
        // Same-origin relative path. Never fall through to a public CDN:
        // that is the behaviour this constant exists to remove.
        return `/lib/vditor-${VDITOR_VERSION}`;
    }
})();

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
function _trc(): boolean { return !!window.__ebt_trace_logging; }
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
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

const DEFAULT_TOOLBAR: string[] = [
    "headings", "bold", "italic", "strike", "|",
    "line", "quote", "list", "ordered-list", "check", "|",
    "code", "inline-code", "link", "table", "|",
    "undo", "redo", "|",
    "fullscreen",
];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    escape: "Escape",
};

const DEFAULT_HEIGHT = "70vh";
const DEFAULT_MIN_HEIGHT = 300;
const DEFAULT_MIN_WIDTH = 400;

const INLINE_TOOLBAR_ITEMS: { label: string; icon: string; prefix: string; suffix: string }[] = [
    { label: "Bold",          icon: "bi-type-bold",          prefix: "**",   suffix: "**" },
    { label: "Italic",        icon: "bi-type-italic",        prefix: "*",    suffix: "*" },
    { label: "Underline",     icon: "bi-type-underline",     prefix: "<u>",  suffix: "</u>" },
    { label: "Strikethrough", icon: "bi-type-strikethrough", prefix: "~~",   suffix: "~~" },
    { label: "Superscript",   icon: "bi-superscript",        prefix: "^",    suffix: "^" },
    { label: "Subscript",     icon: "bi-subscript",          prefix: "~",    suffix: "~" },
    { label: "Code",          icon: "bi-code",               prefix: "`",    suffix: "`" },
];

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Post-render fix: Vditor injects inline/scoped styles on table cells
 * that CSS cannot reliably override. Walk the rendered DOM and force
 * theme-aware colours directly on each element.
 */
function fixRenderedTableStyles(container: HTMLElement): void
{
    const isDark = document.documentElement
        .getAttribute("data-bs-theme") === "dark";
    if (!isDark) { return; }

    const tables = container.querySelectorAll("table");
    for (const table of tables)
    {
        (table as HTMLElement).style
            .setProperty("background-color", "transparent", "important");
        fixVditorTableRows(table);
        fixVditorTableHeaders(table);
        fixVditorTableCells(table);
    }
}

function fixVditorTableRows(table: Element): void
{
    const trs = table.querySelectorAll("tr");
    for (const tr of trs)
    {
        (tr as HTMLElement).style
            .setProperty("background-color", "transparent", "important");
    }
}

function fixVditorTableHeaders(table: Element): void
{
    const ths = table.querySelectorAll("th");
    for (const th of ths)
    {
        const s = (th as HTMLElement).style;
        s.setProperty("background-color",
            "var(--theme-surface-raised-bg)", "important");
        s.setProperty("color",
            "var(--theme-text-primary)", "important");
        s.setProperty("border-color",
            "var(--theme-border-color)", "important");
    }
}

function fixVditorTableCells(table: Element): void
{
    const tds = table.querySelectorAll("td");
    for (const td of tds)
    {
        const s = (td as HTMLElement).style;
        s.setProperty("background-color", "transparent", "important");
        s.setProperty("color",
            "var(--theme-text-secondary)", "important");
        s.setProperty("border-color",
            "var(--theme-border-color)", "important");
    }
}

/**
 * Creates an HTML element with optional class names.
 */
function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    ...classNames: string[]
): HTMLElementTagNameMap[K]
{
    const el = document.createElement(tag);
    if (classNames.length > 0)
    {
        el.classList.add(...classNames);
    }
    return el;
}

/**
 * Sets multiple attributes on an element.
 */
function setAttr(
    el: HTMLElement,
    attrs: Record<string, string>
): void
{
    for (const [key, val] of Object.entries(attrs))
    {
        el.setAttribute(key, val);
    }
}

/**
 * Sanitises HTML using DOMPurify if available, otherwise returns as-is.
 */
function sanitiseHTML(html: string): string
{
    const dp = window["DOMPurify"] as
        { sanitize: (h: string, o: Record<string, unknown>) => string } | undefined;
    if (dp && typeof dp.sanitize === "function")
    {
        return dp.sanitize(html, {
            ADD_TAGS: [
                // Core SVG structure
                "svg", "g", "defs", "symbol", "use",
                // SVG shapes
                "path", "circle", "rect", "ellipse", "line",
                "polyline", "polygon",
                // SVG text
                "text", "tspan", "textPath",
                // SVG paint / clip / mask (required by Mermaid diagrams)
                "clipPath", "mask", "pattern",
                "linearGradient", "radialGradient", "stop",
                // SVG markers (arrow-heads in Mermaid)
                "marker",
                // SVG misc
                "foreignObject", "image", "title", "desc",
            ],
            ADD_ATTR: [
                // SVG geometry
                "viewBox", "d", "x", "y", "cx", "cy", "r", "rx", "ry",
                "x1", "y1", "x2", "y2", "points", "width", "height",
                "dx", "dy",
                // SVG presentation
                "fill", "fill-opacity", "stroke", "stroke-width",
                "stroke-opacity", "stroke-dasharray", "stroke-dashoffset",
                "stroke-linecap", "stroke-linejoin", "opacity",
                // SVG transform & layout
                "transform", "preserveAspectRatio",
                // SVG text
                "dominant-baseline", "text-anchor", "font-size",
                "font-family", "font-weight",
                // SVG markers (Mermaid arrow-heads)
                "marker-end", "marker-start", "marker-mid",
                "markerWidth", "markerHeight", "refX", "refY",
                "orient", "markerUnits",
                // SVG gradient stops
                "offset", "stop-color", "stop-opacity",
                "gradientTransform", "gradientUnits",
                // SVG clip / mask
                "clip-path", "clip-rule", "mask",
                // Common attributes
                "xmlns", "xmlns:xlink", "xlink:href", "href",
                "class", "id", "style", "data-*",
            ],
            ALLOW_DATA_ATTR: true,
        });
    }

    logWarn("DOMPurify not found — using Vditor built-in sanitisation");
    return html;
}

/**
 * Triggers a file download in the browser.
 */
function downloadFile(
    filename: string,
    content: string,
    mimeType: string
): void
{
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ============================================================================
// MARKDOWN EDITOR CLASS
// ============================================================================

/**
 * Bootstrap 5-themed Markdown editor wrapping Vditor.
 */
/**
 * The MarkdownEditor surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface MarkdownEditorHandle
{
    getValue(): string;
    setValue(md: string): void;
    getHTML(): string;
    setMode(mode: "tabs" | "sidebyside" | "display" | "naked"): void;
    setEditable(editable: boolean): void;
    setTitle(title: string): void;
    exportMarkdown(): void;
    exportHTML(): void;
    exportPDF(): void;
    toggleFullscreen(): void;
    focus(): void;
    enable(): void;
    disable(): void;
    destroy(): void;
}

export class MarkdownEditor implements MarkdownEditorHandle
{
    private container: HTMLElement;
    private options: Required<
        Pick<MarkdownEditorOptions,
            "mode" | "editable" | "height" | "width" |
            "minHeight" | "minWidth" | "showExport" |
            "showFullscreen" | "showInlineToolbar" |
            "showCounter" | "vditorMode" | "disabled"
        >
    > & MarkdownEditorOptions;
    /** The Vditor instance, typed from the global this library declares. */
    private vditor: InstanceType<NonNullable<Window["Vditor"]>> | null = null;
    private wrapper: HTMLElement | null = null;
    private headerEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private editorArea: HTMLElement | null = null;
    private previewArea: HTMLElement | null = null;
    private inlineToolbar: HTMLElement | null = null;
    private resizeHandle: HTMLElement | null = null;
    private displayValue = "";
    private activeTab: "edit" | "preview" = "edit";
    private isFullscreen = false;
    private editorCollapsed = false;
    private previewCollapsed = false;
    private hasDOMPurify = false;
    private boundHandlers: Record<string, EventListener> = {};
    private themeObserver: MutationObserver | null = null;

    /**
     * Whether Vditor has finished loading its own lazy modules.
     *
     * A Vditor INSTANCE exists the moment the constructor returns, and it
     * cannot answer getValue() until its `after` hook has run: the IR
     * serialiser arrives in a separate chunk. `if (this.vditor)` reads as
     * a readiness check and is only an existence check. ADR-205.
     */
    private vditorReady = false;

    /** A theme change that arrived while Vditor was still loading. */
    private themeChangeDeferred = false;

    /**
     * Content to restore into the NEXT Vditor once it reports ready.
     *
     * A re-init reads the document out of the old instance and has to put
     * it back into the new one, and the new one cannot take it until its
     * `after` hook runs. ADR-205.
     */
    private pendingValue: string | null = null;

    constructor(container: HTMLElement, options: MarkdownEditorOptions = {})
    {
        this.container = container;
        const resolvedHeight = options.height
            ?? ((options.contained) ? "100%" : DEFAULT_HEIGHT);

        this.options = {
            ...options,
            mode: options.mode ?? "tabs",
            editable: options.editable ?? true,
            height: resolvedHeight,
            width: options.width ?? "100%",
            minHeight: options.minHeight ?? DEFAULT_MIN_HEIGHT,
            minWidth: options.minWidth ?? DEFAULT_MIN_WIDTH,
            showExport: options.showExport ?? true,
            showFullscreen: options.showFullscreen ?? true,
            showInlineToolbar: options.showInlineToolbar ?? true,
            showCounter: options.showCounter ?? false,
            vditorMode: options.vditorMode ?? "ir",
            disabled: options.disabled ?? false,
        };

        this.hasDOMPurify = !!window["DOMPurify"];
        if (!this.hasDOMPurify)
        {
            logWarn("DOMPurify not loaded — HTML output will use Vditor built-in sanitisation only");
        }

        this.build();
    }

    // ========================================================================
    // BUILD
    // ========================================================================

    /**
     * Builds the entire component DOM structure.
     */
    private build(): void
    {
        logInfo("Initialising");

        this.wrapper = createElement("div", "mde-wrapper");
        // Canvas anchors name this region rather than counting it (ADR-162). `mde-display`
        // is a MODE class toggled on this same wrapper, not a separate
        // element, so the wrapper is what scrolls when it is set.
        this.wrapper.setAttribute(
            "data-dui-region", "markdowneditor:display");

        if (this.options.mode === "display")
        {
            this.buildDisplayMode();
            return;
        }

        if (this.options.mode === "naked")
        {
            this.buildNakedMode();
            return;
        }

        this.applySize();
        this.applySizeClass();
        this.buildHeader();
        this.buildBody();
        this.buildResizeHandle();

        this.container.appendChild(this.wrapper);

        this.initVditor();
        this.bindGlobalEvents();
        this.observeThemeChanges();

        if (this.options.disabled)
        {
            this.disable();
        }

        logInfo("DOM built, Vditor initialising...");
    }

    private applySizeClass(): void
    {
        if (!this.wrapper) { return; }
        if (this.options.size === "sm")
        {
            this.wrapper.classList.add("mde-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapper.classList.add("mde-lg");
        }
    }

    /**
     * Builds display-only mode: just a preview area with no chrome.
     */
    private buildDisplayMode(): void
    {
        if (!this.wrapper) { return; }
        this.wrapper.classList.add("mde-display");
        this.applyDisplayClasses();
        this.applySizeClass();
        this.displayValue = this.options.value ?? "";
        this.previewArea = createElement("div", "mde-preview-area");
        // Canvas anchors name this region rather than counting it (ADR-162).
        this.previewArea.setAttribute("data-dui-region", "markdowneditor:preview-area");
        this.wrapper.appendChild(this.previewArea);
        this.container.appendChild(this.wrapper);
        this.renderDisplayPreview();
        this.observeThemeChanges();
        logInfo("Display mode built");
    }

    /** Apply isolated, compact, and theme classes for display mode. */
    private applyDisplayClasses(): void
    {
        if (!this.wrapper) { return; }
        if (this.options.isolated)
        {
            this.wrapper.classList.add("mde-display-isolated");
        }
        if (this.options.compact)
        {
            this.wrapper.classList.add("mde-display-compact");
        }
        if (this.options.theme === "dark")
        {
            this.wrapper.classList.add("mde-display-dark");
        }
    }

    /**
     * Renders markdown in display mode using Vditor.preview() or
     * DOMPurify-based fallback (no Vditor editor instance needed).
     */
    private renderDisplayPreview(): void
    {
        if (!this.previewArea) { return; }
        const isDark = this.options.theme === "dark"
            || document.documentElement.getAttribute("data-bs-theme") === "dark";
        const VditorClass = window.Vditor;
        if (VditorClass && typeof VditorClass.preview === "function")
        {
            VditorClass.preview(this.previewArea, this.displayValue, {
                mode: isDark ? "dark" : "light",
                hljs: {
                    enable: true,
                    // DEBT-VR-11. Was "native", whose body text is #cccccc
                    // on #585858 — 4.43 against a 4.5 floor, a near-miss
                    // that fails on every code block in a dark preview.
                    // "github-dark" is the counterpart of the light value
                    // beside it, so the pair is one theme rather than two
                    // choices: #c9d1d9 on #0d1117 measures 12.63.
                    style: isDark ? "github-dark" : "github",
                    lineNumber: true,
                },
                markdown: {
                    toc: true, mark: true, footnotes: true,
                    autoSpace: true, sanitize: true,
                },
                math: { engine: "KaTeX" },
                after: () =>
                {
                    if (this.previewArea)
                    {
                        fixRenderedTableStyles(this.previewArea);
                    }
                    this.fireDisplayReady();
                },
            });
        }
        else
        {
            // FALLBACK-5. This used to inject displayValue, which is
            // MARKDOWN, straight into innerHTML, so the reader saw literal
            // asterisks and hashes. It then called fireDisplayReady(),
            // which is ADR-148 clause 1 exactly: a degraded component
            // reported success, and the host had no way to tell.
            logError(
                "Cannot render display mode, because Vditor.preview is "
                + "not available.");

            throw new Error(
                "MarkdownEditor needs Vditor to render markdown. Load the "
                + "Vditor bundle before markdowneditor.js.");
        }
    }

    /** Fires onReady callback for display mode. */
    private fireDisplayReady(): void
    {
        if (this.options.onReady)
        {
            this.options.onReady();
        }
    }

    /**
     * Builds naked mode: editable Vditor surface with no chrome.
     * Feels like a textarea that understands markdown.
     */
    private buildNakedMode(): void
    {
        if (!this.wrapper) { return; }

        this.wrapper.classList.add("mde-naked");
        this.applySize();
        this.applySizeClass();

        this.editorArea = createElement("div", "mde-editor-area");
        this.wrapper.appendChild(this.editorArea);
        this.container.appendChild(this.wrapper);

        this.initVditor();
        this.bindGlobalEvents();
        this.observeThemeChanges();

        logInfo("Naked mode built");
    }

    /**
     * Applies width/height/min sizing to the wrapper.
     */
    private applySize(): void
    {
        if (!this.wrapper) { return; }
        this.wrapper.style.height = this.options.height;
        this.wrapper.style.width = this.options.width;
        this.wrapper.style.minHeight = `${this.options.minHeight}px`;
        this.wrapper.style.minWidth = `${this.options.minWidth}px`;
    }

    // ========================================================================
    // HEADER
    // ========================================================================

    /**
     * Builds the header bar with title, mode toggle, and action buttons.
     */
    private buildHeader(): void
    {
        this.headerEl = createElement("div", "mde-header");

        const left = createElement("div", "mde-header-left");
        const centre = createElement("div", "mde-header-centre");
        const right = createElement("div", "mde-header-right");

        // Title
        if (this.options.title)
        {
            const titleEl = createElement("span", "mde-title");
            titleEl.textContent = this.options.title;
            left.appendChild(titleEl);
        }

        // Mode toggle
        this.buildModeToggle(centre);

        // Actions
        this.buildActions(right);

        this.headerEl.appendChild(left);
        this.headerEl.appendChild(centre);
        this.headerEl.appendChild(right);
        this.wrapper!.appendChild(this.headerEl);
    }

    /**
     * Builds the Tabs / Side-by-Side toggle button group.
     */
    private buildModeToggle(parent: HTMLElement): void
    {
        const group = createElement("div", "btn-group", "mde-mode-toggle");
        setAttr(group, { role: "group", "aria-label": "Layout mode" });

        const tabsBtn = createElement("button", "btn", "btn-outline-secondary", "btn-sm");
        tabsBtn.textContent = "Tabs";
        setAttr(tabsBtn, { type: "button" });
        if (this.options.mode === "tabs")
        {
            tabsBtn.classList.add("active");
        }

        const sxsBtn = createElement("button", "btn", "btn-outline-secondary", "btn-sm");
        sxsBtn.textContent = "Side by Side";
        setAttr(sxsBtn, { type: "button" });
        if (this.options.mode === "sidebyside")
        {
            sxsBtn.classList.add("active");
        }

        tabsBtn.addEventListener("click", () => this.setMode("tabs"));
        sxsBtn.addEventListener("click", () => this.setMode("sidebyside"));

        group.appendChild(tabsBtn);
        group.appendChild(sxsBtn);
        parent.appendChild(group);
    }

    /**
     * Builds the export dropdown and fullscreen toggle.
     */
    private buildActions(parent: HTMLElement): void
    {
        if (this.options.showExport)
        {
            this.buildExportDropdown(parent);
        }

        if (this.options.showFullscreen)
        {
            const fsBtn = createElement("button", "btn", "btn-outline-secondary", "btn-sm", "mde-action-btn");
            fsBtn.innerHTML = '<i class="bi bi-arrows-fullscreen"></i>';
            setAttr(fsBtn, { type: "button", title: "Fullscreen", "aria-label": "Toggle fullscreen" });
            fsBtn.addEventListener("click", () => this.toggleFullscreen());
            parent.appendChild(fsBtn);
        }
    }

    /**
     * Builds the export dropdown button.
     */
    private buildExportDropdown(parent: HTMLElement): void
    {
        const dropdown = createElement("div", "dropdown", "d-inline-block");

        const btn = createElement("button", "btn", "btn-outline-secondary", "btn-sm", "dropdown-toggle", "mde-action-btn");
        btn.textContent = "Export";
        setAttr(btn, {
            type: "button",
            "data-bs-toggle": "dropdown",
            "aria-expanded": "false",
        });

        const menu = createElement("ul", "dropdown-menu");

        const items = [
            { label: "Markdown (.md)", handler: () => this.exportMarkdown() },
            { label: "HTML (.html)", handler: () => this.exportHTML() },
            { label: "PDF (Print)", handler: () => this.exportPDF() },
        ];

        for (const item of items)
        {
            const li = createElement("li");
            const a = createElement("a", "dropdown-item");
            a.textContent = item.label;
            setAttr(a, { href: "#" });
            a.addEventListener("click", (e) =>
            {
                e.preventDefault();
                item.handler();
            });
            li.appendChild(a);
            menu.appendChild(li);
        }

        dropdown.appendChild(btn);
        dropdown.appendChild(menu);
        parent.appendChild(dropdown);
    }

    // ========================================================================
    // BODY
    // ========================================================================

    /**
     * Builds the main body area (tabs or side-by-side panes).
     */
    private buildBody(): void
    {
        this.bodyEl = createElement("div", "mde-body");

        if (this.options.mode === "tabs")
        {
            this.buildTabMode();
        }
        else
        {
            this.buildSxSMode();
        }

        this.wrapper!.appendChild(this.bodyEl);
    }

    /**
     * Builds tab mode layout with Edit and Preview tabs.
     */
    private buildTabMode(): void
    {
        // In readonly mode, default to the Preview tab
        const startOnPreview = !this.options.editable;

        // Tab bar
        const tabBar = createElement("div", "mde-tabs");
        setAttr(tabBar, { role: "tablist" });

        const editTab = this.createTab("edit", "Edit", !startOnPreview);
        const previewTab = this.createTab("preview", "Preview", startOnPreview);

        tabBar.appendChild(editTab);
        tabBar.appendChild(previewTab);
        this.bodyEl!.appendChild(tabBar);

        // Editor area
        this.editorArea = createElement("div", "mde-editor-area");
        setAttr(this.editorArea, { role: "tabpanel", "aria-label": "Editor" });
        if (startOnPreview)
        {
            this.editorArea.style.display = "none";
        }
        this.bodyEl!.appendChild(this.editorArea);

        // Preview area
        this.previewArea = createElement("div", "mde-preview-area");
        setAttr(this.previewArea, { role: "tabpanel", "aria-label": "Preview" });
        if (!startOnPreview)
        {
            this.previewArea.style.display = "none";
        }
        this.bodyEl!.appendChild(this.previewArea);

        if (startOnPreview)
        {
            this.activeTab = "preview";
        }
    }

    /**
     * Creates a single tab button.
     */
    private createTab(
        id: "edit" | "preview",
        label: string,
        active: boolean
    ): HTMLElement
    {
        const tab = createElement("button", "mde-tab");
        if (active) tab.classList.add("mde-tab-active");
        tab.textContent = label;
        setAttr(tab, {
            type: "button",
            role: "tab",
            "aria-selected": active ? "true" : "false",
        });

        tab.addEventListener("click", () => this.switchTab(id));
        return tab;
    }

    /**
     * Switches between Edit and Preview tabs.
     */
    private switchTab(tabId: "edit" | "preview"): void
    {
        if (this.activeTab === tabId) { return; }
        this.activeTab = tabId;

        const tabs = this.bodyEl!.querySelectorAll(".mde-tab");
        tabs.forEach((t) =>
        {
            const isActive = t.textContent?.toLowerCase() === tabId;
            t.classList.toggle("mde-tab-active", isActive);
            (t as HTMLElement).setAttribute("aria-selected", isActive ? "true" : "false");
        });

        if (tabId === "edit")
        {
            this.editorArea!.style.display = "";
            this.previewArea!.style.display = "none";
        }
        else
        {
            this.editorArea!.style.display = "none";
            this.previewArea!.style.display = "";
            this.renderPreview();
        }

        logDebug("Switched to tab:", tabId);
    }

    /**
     * Renders the current markdown content in the preview pane.
     * Uses Vditor.preview() which handles all rendering (diagrams,
     * math, code highlighting) automatically and more reliably
     * than manual getHTML() + individual render calls.
     *
     * NOTE: We do NOT sanitise via innerHTML replacement in the
     * after callback because Mermaid (and other diagram renderers)
     * execute asynchronously after the callback fires.  Replacing
     * innerHTML destroys the DOM nodes those renderers reference,
     * causing diagrams to silently fail.  Vditor's own sanitise
     * option (markdown.sanitize = true) provides content safety;
     * DOMPurify is still applied in getHTML() and all export paths.
     */
    private renderPreview(): void
    {
        if (!this.previewArea || !this.vditor) { return; }

        const VditorClass = window.Vditor;
        const markdown = this.vditor.getValue();

        const previewRef = this.previewArea;
        const isDark = document.documentElement
            .getAttribute("data-bs-theme") === "dark";
        if (VditorClass && typeof VditorClass.preview === "function")
        {
            VditorClass.preview(this.previewArea, markdown, {
                mode: isDark ? "dark" : "light",
                hljs: {
                    enable: true,
                    style: isDark ? "native" : "github",
                    lineNumber: true,
                },
                markdown: {
                    toc: true,
                    mark: true,
                    footnotes: true,
                    autoSpace: true,
                    sanitize: true,
                },
                math: {
                    engine: "KaTeX",
                },
                after: () =>
                {
                    fixRenderedTableStyles(previewRef);
                    logDebug("Preview rendered");
                },
            });
        }
        else
        {
            // Fallback: use getHTML() if Vditor.preview is unavailable
            const rawHTML = this.vditor.getHTML();
            this.previewArea.innerHTML = sanitiseHTML(rawHTML);
        }
    }

    /**
     * Builds side-by-side layout with collapsible editor and preview panes.
     */
    private buildSxSMode(): void
    {
        const panes = createElement("div", "mde-panes");

        // Editor pane
        const editorPane = createElement("div", "mde-pane-editor");
        const editorHeader = this.buildPaneHeader("Editor", "editor");
        this.editorArea = createElement("div", "mde-editor-area");
        editorPane.appendChild(editorHeader);
        editorPane.appendChild(this.editorArea);

        // Preview pane
        const previewPane = createElement("div", "mde-pane-preview");
        const previewHeader = this.buildPaneHeader("Preview", "preview");
        this.previewArea = createElement("div", "mde-preview-area");
        previewPane.appendChild(previewHeader);
        previewPane.appendChild(this.previewArea);

        panes.appendChild(editorPane);
        panes.appendChild(previewPane);
        this.bodyEl!.appendChild(panes);
    }

    /**
     * Builds a pane header with a label and collapse button.
     */
    private buildPaneHeader(
        label: string,
        pane: "editor" | "preview"
    ): HTMLElement
    {
        const header = createElement("div", "mde-pane-header");

        const labelEl = createElement("span", "mde-pane-label");
        labelEl.textContent = label;

        const collapseBtn = createElement("button", "mde-collapse-btn", "btn", "btn-sm");
        const icon = pane === "editor" ? "bi-chevron-left" : "bi-chevron-right";
        collapseBtn.innerHTML = `<i class="bi ${icon}"></i>`;
        setAttr(collapseBtn, {
            type: "button",
            title: `Collapse ${label}`,
            "aria-expanded": "true",
            "aria-label": `Collapse ${label} pane`,
        });

        collapseBtn.addEventListener("click", () =>
        {
            this.togglePaneCollapse(pane);
        });

        header.appendChild(labelEl);
        header.appendChild(collapseBtn);
        return header;
    }

    /**
     * Toggles collapse of a side-by-side pane.
     */
    private togglePaneCollapse(pane: "editor" | "preview"): void
    {
        const panes = this.bodyEl?.querySelector(".mde-panes");
        if (!panes) { return; }

        const editorPane = panes.querySelector(".mde-pane-editor") as HTMLElement;
        const previewPane = panes.querySelector(".mde-pane-preview") as HTMLElement;

        if (pane === "editor")
        {
            this.editorCollapsed = !this.editorCollapsed;
            editorPane.classList.toggle("mde-pane-collapsed", this.editorCollapsed);

            // If collapsing editor, ensure preview is not collapsed
            if (this.editorCollapsed)
            {
                this.previewCollapsed = false;
                previewPane.classList.remove("mde-pane-collapsed");
            }
        }
        else
        {
            this.previewCollapsed = !this.previewCollapsed;
            previewPane.classList.toggle("mde-pane-collapsed", this.previewCollapsed);

            if (this.previewCollapsed)
            {
                this.editorCollapsed = false;
                editorPane.classList.remove("mde-pane-collapsed");
            }
        }

        // Update collapse button icons and aria
        this.updateCollapseButtons(editorPane, previewPane);

        logDebug("Pane collapse toggled:", pane);
    }

    /**
     * Updates collapse button icons and ARIA attributes.
     */
    private updateCollapseButtons(
        editorPane: HTMLElement,
        previewPane: HTMLElement
    ): void
    {
        const editorBtn = editorPane.querySelector(".mde-collapse-btn");
        const previewBtn = previewPane.querySelector(".mde-collapse-btn");

        if (editorBtn)
        {
            const icon = this.editorCollapsed ? "bi-chevron-right" : "bi-chevron-left";
            editorBtn.innerHTML = `<i class="bi ${icon}"></i>`;
            editorBtn.setAttribute("aria-expanded", this.editorCollapsed ? "false" : "true");
            editorBtn.setAttribute("title", this.editorCollapsed ? "Expand Editor" : "Collapse Editor");
        }

        if (previewBtn)
        {
            const icon = this.previewCollapsed ? "bi-chevron-left" : "bi-chevron-right";
            previewBtn.innerHTML = `<i class="bi ${icon}"></i>`;
            previewBtn.setAttribute("aria-expanded", this.previewCollapsed ? "false" : "true");
            previewBtn.setAttribute("title", this.previewCollapsed ? "Expand Preview" : "Collapse Preview");
        }
    }

    // ========================================================================
    // RESIZE HANDLE
    // ========================================================================

    /**
     * Builds the vertical resize drag handle.
     */
    private buildResizeHandle(): void
    {
        this.resizeHandle = createElement("div", "mde-resize-handle");
        this.resizeHandle.title = "Drag to resize";

        let startY = 0;
        let startHeight = 0;

        const onPointerMove = (e: PointerEvent): void =>
        {
            logTrace("pointermove handler:", { x: e.clientX, y: e.clientY });
            const deltaY = e.clientY - startY;
            const newHeight = Math.max(
                this.options.minHeight,
                startHeight + deltaY
            );
            this.wrapper!.style.height = `${newHeight}px`;
        };

        const onPointerUp = (e: PointerEvent): void =>
        {
            this.resizeHandle!.releasePointerCapture(e.pointerId);
            this.resizeHandle!.removeEventListener("pointermove", onPointerMove);
            this.resizeHandle!.removeEventListener("pointerup", onPointerUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        this.resizeHandle.addEventListener("pointerdown", (e: PointerEvent) =>
        {
            e.preventDefault();
            this.resizeHandle!.setPointerCapture(e.pointerId);
            startY = e.clientY;
            startHeight = this.wrapper!.offsetHeight;
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
            this.resizeHandle!.addEventListener("pointermove", onPointerMove);
            this.resizeHandle!.addEventListener("pointerup", onPointerUp);
        });

        this.wrapper!.appendChild(this.resizeHandle);
    }

    // ========================================================================
    // VDITOR INITIALISATION
    // ========================================================================

    /**
     * Initialises the Vditor editor instance.
     */
    /**
     * Creates the Vditor instance, and RETURNS it as well as storing it.
     *
     * The return value exists for `observeThemeChanges`, which nulls the
     * field before re-initializing. TypeScript follows that assignment and
     * narrows the field to `null` for the rest of the block, so reading it
     * back after this call needs either an assertion or this return. The
     * return is the honest one: the caller wants the instance this call
     * made, not whatever the field happens to hold.
     */
    private initVditor(): VditorInstance | null
    {
        const VditorClass = window.Vditor;
        if (!VditorClass)
        {
            logError("Vditor library not found. Load vditor JS/CSS before this component.");
            this.buildMissingDependencyNotice();
            return null;
        }

        if (!this.editorArea) { return null; }

        // Ensure editor area has an ID for Vditor
        if (!this.editorArea.id)
        {
            this.editorArea.id = `mde-vditor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        const vditorMode = this.resolveVditorMode();
        const vditorOptions = this.buildVditorOptions(vditorMode);

        // Cleared BEFORE the constructor, because the `after` hook that
        // sets it can fire synchronously on a warm cache. ADR-205.
        this.vditorReady = false;
        this.vditor = new VditorClass(this.editorArea.id, vditorOptions);
        return this.vditor;
    }

    /**
     * Resolves the Vditor editing mode based on component options.
     */
    private resolveVditorMode(): "ir" | "wysiwyg" | "sv"
    {
        // Always use ir mode. In side-by-side layout, our wrapper manages
        // the split and renders preview in the right pane manually.
        // Vditor's built-in sv mode creates its own internal split which
        // conflicts with our pane layout.
        return this.options.vditorMode ?? "ir";
    }

    /** Resolves the Vditor toolbar items. Naked mode uses no toolbar. */
    private resolveToolbar(): string[]
    {
        if (this.options.mode === "naked") { return []; }
        if (!this.options.editable) { return []; }
        return this.options.toolbar ?? DEFAULT_TOOLBAR;
    }

    /**
     * Builds the Vditor constructor options object.
     */
    private buildVditorOptions(mode: "ir" | "wysiwyg" | "sv"): Record<string, unknown>
    {
        const isDark = document.documentElement
            .getAttribute("data-bs-theme") === "dark";
        const opts: Record<string, unknown> = {
            mode,
            value: this.options.value ?? "",
            placeholder: this.options.placeholder ?? "",
            height: "100%",
            width: "100%",
            theme: isDark ? "dark" : "classic",
            lang: "en_US",

            // (CRITICAL) Without this, Vditor fetches its markdown engine
            // (lute), icon set, language pack and every optional renderer —
            // mermaid, katex, mathjax, graphviz — from `unpkg.com` at
            // runtime, as script tags it injects itself. That is executable
            // third-party code arriving on a page that may be showing an
            // admin session, from an origin nobody here controls.
            //
            // VDITOR_CDN points at this library's own mirror of the full
            // tree (ADR-149). A consumer that must override it can still
            // pass `cdn` through `vditorOptions`, which Object.assign()s
            // over these defaults below.
            cdn: VDITOR_CDN,
            icon: "ant",
            toolbar: this.resolveToolbar(),
            tab: "\t",

            counter: {
                enable: this.options.showCounter,
            },

            preview: {
                markdown: {
                    toc: true,
                    mark: true,
                    footnotes: true,
                    autoSpace: true,
                },
                hljs: {
                    enable: true,
                    lineNumber: true,
                    style: isDark ? "native" : "github",
                },
            },

            cache: {
                enable: false,
            },

            after: () =>
            {
                logInfo("Vditor ready");
                this.vditorReady = true;

                // Restore the document a re-init took out of the previous
                // instance. This used to be a synchronous setValue() on a
                // Vditor that had just been constructed, which reached for
                // `currentMode` on an editor that did not have one yet.
                // ADR-205.
                if (this.pendingValue !== null)
                {
                    const restore = this.pendingValue;
                    this.pendingValue = null;
                    this.vditor?.setValue(restore);
                }

                if (!this.options.editable)
                {
                    this.vditor?.disabled();
                }

                // A theme change that arrived mid-load is applied now
                // rather than dropped. The instance below was built with
                // the palette that was current when the constructor ran,
                // so without this the editor keeps the old one. ADR-205.
                if (this.themeChangeDeferred)
                {
                    this.themeChangeDeferred = false;
                    this.reinitVditorForTheme();
                    return;
                }

                // Render initial preview when visible on load:
                // side-by-side mode always, or tab mode starting on Preview
                if (this.previewArea &&
                    (this.options.mode === "sidebyside" || this.activeTab === "preview"))
                {
                    this.renderPreview();
                }

                if (this.options.onReady)
                {
                    this.options.onReady();
                }
            },

            input: (value: string) =>
            {
                if (this.options.mode === "sidebyside" && this.previewArea)
                {
                    this.renderPreview();
                }

                if (this.options.onChange)
                {
                    this.options.onChange(value);
                }
            },

            select: (_value: string) =>
            {
                if (this.options.showInlineToolbar && this.options.editable)
                {
                    this.showInlineToolbar();
                }
            },

            ctrlEnter: (value: string) =>
            {
                if (this.options.onSave)
                {
                    this.options.onSave(value);
                }
            },
        };

        // Merge custom options (shallow)
        if (this.options.vditorOptions)
        {
            Object.assign(opts, this.options.vditorOptions);
        }

        return opts;
    }

    /**
     * Builds the visible missing-dependency notice shown when Vditor did not
     * load.
     *
     * This REPLACED a fallback textarea (FALLBACK-15). The textarea carried
     * the caller's markdown, accepted typing, and read back through
     * `getValue()`, so an editor with no toolbar, no preview, no shortcuts
     * and no markdown awareness looked like a deliberate minimal mode. The
     * only signal was a console line the user never sees.
     *
     * Same shape and same remedy as CodeEditor's CodeMirror notice
     * (`buildMissingDependencyError`) and ChartPanel's Chart.js notice. A
     * notice DECLARES the failure; a textarea SUBSTITUTES for the component.
     */
    private buildMissingDependencyNotice(): void
    {
        if (!this.editorArea) { return; }

        const notice = createElement("div", "markdowneditor-error");
        notice.textContent =
            "Vditor is required but did not load. Add the vditor bundle "
            + "to the page before creating the markdown editor.";

        this.editorArea.appendChild(notice);
    }

    // ========================================================================
    // INLINE SELECTION TOOLBAR
    // ========================================================================

    /**
     * Shows the floating inline toolbar above the current selection.
     */
    private showInlineToolbar(): void
    {
        this.hideInlineToolbar();

        if (!this.vditor) { return; }

        const pos = this.vditor.getCursorPosition();
        if (!pos) { return; }

        this.inlineToolbar = createElement("div", "mde-inline-toolbar");
        setAttr(this.inlineToolbar, { role: "toolbar", "aria-label": "Text formatting" });

        for (const item of INLINE_TOOLBAR_ITEMS)
        {
            const btn = createElement("button", "mde-inline-btn", "btn", "btn-sm");
            btn.innerHTML = `<i class="bi ${item.icon}"></i>`;
            setAttr(btn, {
                type: "button",
                title: item.label,
                "aria-label": item.label,
            });

            btn.addEventListener("pointerdown", (e) =>
            {
                e.preventDefault();
                this.applyInlineFormat(item.prefix, item.suffix);
            });

            this.inlineToolbar.appendChild(btn);
        }

        // Position relative to the wrapper
        const wrapperRect = this.wrapper!.getBoundingClientRect();
        const top = pos.top - wrapperRect.top - 40;
        const left = pos.left - wrapperRect.left;

        this.inlineToolbar.style.top = `${Math.max(0, top)}px`;
        this.inlineToolbar.style.left = `${Math.max(0, left)}px`;

        this.wrapper!.appendChild(this.inlineToolbar);

        logDebug("Inline toolbar shown");
    }

    /**
     * Hides the inline selection toolbar.
     */
    private hideInlineToolbar(): void
    {
        if (this.inlineToolbar)
        {
            this.inlineToolbar.remove();
            this.inlineToolbar = null;
        }
    }

    /**
     * Applies inline formatting to the current selection.
     */
    private applyInlineFormat(prefix: string, suffix: string): void
    {
        if (!this.vditor) { return; }

        const selection = this.vditor.getSelection();
        if (!selection) { return; }

        const formatted = prefix + selection + suffix;
        this.vditor.updateValue(formatted);
        this.hideInlineToolbar();
    }

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
    // GLOBAL EVENT HANDLERS
    // ========================================================================

    /**
     * Binds global event listeners.
     */
    private bindGlobalEvents(): void
    {
        // Click outside hides inline toolbar
        this.boundHandlers.clickOutside = (e: Event) =>
        {
            if (this.inlineToolbar && !this.inlineToolbar.contains(e.target as Node))
            {
                this.hideInlineToolbar();
            }
        };
        document.addEventListener("pointerdown", this.boundHandlers.clickOutside);

        // Escape closes inline toolbar and fullscreen
        this.boundHandlers.keydown = (e: Event) =>
        {
            logTrace("keydown handler");
            const ke = e as KeyboardEvent;
            if (this.matchesKeyCombo(ke, "escape"))
            {
                if (this.inlineToolbar)
                {
                    this.hideInlineToolbar();
                }
                else if (this.isFullscreen)
                {
                    this.toggleFullscreen();
                }
            }
        };
        document.addEventListener("keydown", this.boundHandlers.keydown);
    }

    /**
     * Removes global event listeners.
     */
    private unbindGlobalEvents(): void
    {
        for (const [, handler] of Object.entries(this.boundHandlers))
        {
            document.removeEventListener("pointerdown", handler);
            document.removeEventListener("keydown", handler);
        }
        this.boundHandlers = {};
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Refuses a public request that needs the editor, when the editor never
     * loaded.
     *
     * FALLBACK-15, second pass. ADR-200's discriminator decides which methods
     * belong here: a request the CALLER NAMED must refuse, because the caller
     * is owed either the effect or an error. `focus()`, `enable()`,
     * `disable()` and `setEditable()` each returned normally having done
     * nothing, which is the shape FALLBACK-11 removed from CodeEditor nine
     * methods at a time. The first pass of this fix removed the substitute
     * SURFACE and left the silent methods behind it.
     *
     * @param what - The method name, so the message says what was refused.
     */
    private requireVditor(what: string): void
    {
        if (!this.vditor)
        {
            throw new Error(
                `${LOG_PREFIX} ${what} needs Vditor, which did not load. `
                + "Load the vditor bundle before creating the editor.");
        }
    }

    /**
     * Returns the current markdown content.
     */
    public getValue(): string
    {
        if (this.options.mode === "display") { return this.displayValue; }

        if (!this.vditor)
        {
            // FALLBACK-15. This used to read the fallback textarea, and
            // before that textarea existed it returned "". Both are reads a
            // caller cannot distinguish from an empty document. The editor
            // never loaded, so there is no content to report.
            throw new Error(
                `${LOG_PREFIX} getValue() needs Vditor, which did not load. `
                + "Load the vditor bundle before creating the editor.");
        }

        return this.vditor.getValue();
    }

    /**
     * Sets the markdown content.
     */
    public setValue(md: string): void
    {
        if (this.options.mode === "display")
        {
            this.displayValue = md;
            this.renderDisplayPreview();
            return;
        }

        if (!this.vditor)
        {
            // FALLBACK-15. Writing into the fallback textarea returned
            // normally, so a caller who set content and never read it back
            // believed the write had landed in an editor.
            throw new Error(
                `${LOG_PREFIX} setValue() needs Vditor, which did not load. `
                + "Load the vditor bundle before creating the editor.");
        }

        this.vditor.setValue(md, true);

        logDebug("Content set, length:", md.length);
    }

    /**
     * Returns the rendered and sanitised HTML.
     */
    public getHTML(): string
    {
        // ADR-201. "" is what an empty document returns, so a caller
        // could not tell that from Vditor never having loaded.
        if (!this.vditor)
        {
            throw new Error(
                `${LOG_PREFIX} getHTML() needs Vditor, which did not load. `
                + "Load the vditor bundle before creating the editor.");
        }

        const rawHTML = this.vditor.getHTML();
        return sanitiseHTML(rawHTML);
    }

    /**
     * Switches between tab, side-by-side, display, and naked layout modes.
     */
    public setMode(mode: "tabs" | "sidebyside" | "display" | "naked"): void
    {
        if (this.options.mode === mode) { return; }

        const currentValue = this.getValue();
        const wasNonEditor = (this.options.mode === "display") ||
                             (this.options.mode === "naked");
        this.options.mode = mode;
        this.options.value = currentValue;

        // Tear down current state
        if (this.vditor) { this.vditor.destroy(); this.vditor = null; }
        if (this.bodyEl) { this.bodyEl.remove(); this.bodyEl = null; }

        this.wrapper?.classList.remove("mde-display", "mde-naked");

        if (mode === "display")
        {
            this.rebuildAsDisplay(currentValue);
        }
        else if (mode === "naked")
        {
            this.rebuildAsNaked();
        }
        else
        {
            this.rebuildAsEditor(wasNonEditor);
        }

        if (this.options.onModeChange) { this.options.onModeChange(mode); }
        logInfo("Mode switched to:", mode);
    }

    private rebuildAsDisplay(currentValue: string): void
    {
        this.wrapper?.classList.add("mde-display");
        this.applyDisplayClasses();
        if (this.headerEl) { this.headerEl.style.display = "none"; }
        if (this.resizeHandle) { this.resizeHandle.style.display = "none"; }
        this.unbindGlobalEvents();
        this.displayValue = currentValue;
        this.previewArea = createElement("div", "mde-preview-area");
        this.wrapper!.appendChild(this.previewArea);
        this.renderDisplayPreview();
    }

    /** Rebuild as naked mode: tear down chrome, create editor-only surface. */
    private rebuildAsNaked(): void
    {
        this.wrapper?.classList.add("mde-naked");
        if (this.headerEl) { this.headerEl.style.display = "none"; }
        if (this.resizeHandle) { this.resizeHandle.style.display = "none"; }
        if (this.previewArea) { this.previewArea.remove(); this.previewArea = null; }
        this.applySize();

        this.editorArea = createElement("div", "mde-editor-area");
        this.wrapper!.appendChild(this.editorArea);

        this.initVditor();
        this.bindGlobalEvents();
    }

    private rebuildAsEditor(wasNonEditor: boolean): void
    {
        if (wasNonEditor && this.previewArea)
        {
            this.previewArea.remove();
            this.previewArea = null;
        }
        if (wasNonEditor && this.editorArea)
        {
            this.editorArea.remove();
            this.editorArea = null;
        }
        this.restoreOrBuildChrome();
        this.applySize();
        this.editorCollapsed = false;
        this.previewCollapsed = false;
        this.buildBody();
        this.wrapper!.insertBefore(this.bodyEl!, this.resizeHandle);
        this.initVditor();
        this.bindGlobalEvents();
        this.updateModeToggle(this.options.mode as "tabs" | "sidebyside");
    }

    private restoreOrBuildChrome(): void
    {
        if (this.headerEl) { this.headerEl.style.display = ""; }
        else { this.buildHeader(); }
        if (this.resizeHandle) { this.resizeHandle.style.display = ""; }
        else { this.buildResizeHandle(); }
    }

    /**
     * Updates the active state of mode toggle buttons.
     */
    private updateModeToggle(mode: "tabs" | "sidebyside"): void
    {
        const buttons = this.headerEl?.querySelectorAll(".mde-mode-toggle button");
        if (!buttons) { return; }

        buttons.forEach((btn) =>
        {
            const text = (btn as HTMLElement).textContent?.toLowerCase() ?? "";
            const isActive =
                (mode === "tabs" && text === "tabs") ||
                (mode === "sidebyside" && text.includes("side"));
            btn.classList.toggle("active", isActive);
        });
    }

    /**
     * Switches between readonly and readwrite modes.
     */
    public setEditable(editable: boolean): void
    {
        this.requireVditor("setEditable()");

        this.options.editable = editable;

        if (editable)
        {
            this.vditor?.enable();
        }
        else
        {
            this.vditor?.disabled();
        }

        logDebug("Editable:", editable);
    }

    /**
     * Updates the header title.
     */
    public setTitle(title: string): void
    {
        this.options.title = title;
        const titleEl = this.headerEl?.querySelector(".mde-title");
        if (titleEl)
        {
            titleEl.textContent = title;
        }
    }

    /**
     * Exports content as a Markdown file download.
     */
    public exportMarkdown(): void
    {
        const md = this.getValue();
        downloadFile("document.md", md, "text/markdown;charset=utf-8");
        logInfo("Exported Markdown");
    }

    /**
     * Exports content as an HTML file download.
     */
    public exportHTML(): void
    {
        const html = this.getHTML();
        const fullHTML = this.wrapHTMLDocument(html);
        downloadFile("document.html", fullHTML, "text/html;charset=utf-8");
        logInfo("Exported HTML");
    }

    /**
     * Wraps HTML content in a complete HTML document for export.
     */
    private wrapHTMLDocument(bodyHTML: string): string
    {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.options.title ?? "Document"}</title>
    <style>
        body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
        pre { background: #f6f8fa; padding: 1rem; overflow-x: auto; }
        code { font-family: monospace; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
        img { max-width: 100%; }
    </style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
    }

    /**
     * Opens the browser print dialog for PDF export.
     */
    public exportPDF(): void
    {
        const html = this.getHTML();
        const fullHTML = this.wrapHTMLDocument(html);

        const iframe = createElement("iframe");
        iframe.style.cssText = "position:fixed;left:-9999px;width:800px;height:600px;";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc)
        {
            iframeDoc.open();
            iframeDoc.write(fullHTML);
            iframeDoc.close();

            // Wait for content to render before printing
            setTimeout(() =>
            {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
        }

        logInfo("PDF export (print dialog)");
    }

    /**
     * Toggles fullscreen mode.
     */
    public toggleFullscreen(): void
    {
        this.isFullscreen = !this.isFullscreen;
        this.wrapper?.classList.toggle("mde-fullscreen", this.isFullscreen);

        if (this.isFullscreen)
        {
            this.wrapper!.style.height = "100vh";
            this.wrapper!.style.width = "100vw";
        }
        else
        {
            this.applySize();
        }

        logDebug("Fullscreen:", this.isFullscreen);
    }

    /**
     * Focuses the editor.
     */
    public focus(): void
    {
        this.requireVditor("focus()");
        this.vditor?.focus();
    }

    /**
     * Enables the editor.
     */
    public enable(): void
    {
        this.requireVditor("enable()");
        this.options.disabled = false;
        this.vditor?.enable();
        this.wrapper?.classList.remove("mde-disabled");
    }

    /**
     * Disables the editor.
     */
    public disable(): void
    {
        this.requireVditor("disable()");
        this.options.disabled = true;
        this.vditor?.disabled();
        this.wrapper?.classList.add("mde-disabled");
    }

    /**
     * Destroys the component and cleans up.
     */
    /**
     * Watches for data-bs-theme changes and re-initialises Vditor
     * with the correct light/dark palette.
     */
    private observeThemeChanges(): void
    {
        this.themeObserver = new MutationObserver(() =>
        {
            logInfo("Theme changed, re-initialising Vditor");

            // ADR-205. This used to read `if (this.vditor)` and then call
            // getValue(). A page that sets data-bs-theme on load fires the
            // observer while Vditor is still fetching its IR serialiser,
            // and getValue() threw an uncaught TypeError out of a
            // MutationObserver callback, once per editor on the page.
            // Found by the demo-page smoke gate, four times on one page.
            if (this.vditor && !this.vditorReady)
            {
                this.themeChangeDeferred = true;
            }
            else if (this.vditor)
            {
                this.reinitVditorForTheme();
            }

            if (this.previewArea && this.displayValue)
            {
                this.renderDisplayPreview();
            }
        });
        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
        });
    }

    /**
     * Rebuilds Vditor so it picks up the current light or dark palette.
     *
     * Only safe once `after` has run, because it reads the document back
     * out of the instance it is about to destroy. ADR-205.
     */
    private reinitVditorForTheme(): void
    {
        if (!this.vditor) { return; }

        const currentValue = this.vditor.getValue();
        this.vditor.destroy();
        this.vditor = null;
        this.vditorReady = false;

        // Handed to the new instance's `after` hook rather than written
        // straight into a constructor's return value. ADR-205.
        this.pendingValue = currentValue ? currentValue : null;
        this.initVditor();
    }

    public destroy(): void
    {
        logInfo("Destroying");

        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }
        this.hideInlineToolbar();
        this.unbindGlobalEvents();

        if (this.vditor)
        {
            this.vditor.destroy();
            this.vditor = null;
        }
        this.vditorReady = false;
        this.themeChangeDeferred = false;
        this.pendingValue = null;

        if (this.wrapper)
        {
            this.wrapper.remove();
            this.wrapper = null;
        }

        this.headerEl = null;
        this.bodyEl = null;
        this.editorArea = null;
        this.previewArea = null;
        this.resizeHandle = null;
    }
}

// ============================================================================
// MODAL WRAPPER
// ============================================================================

/**
 * Opens a MarkdownEditor in a Bootstrap modal dialog.
 */
function showMarkdownEditorModalFn(
    options: MarkdownEditorModalOptions = {}
): MarkdownEditor
{
    logInfo("Opening modal editor");

    const modalTitle = options.modalTitle ?? options.title ?? "Edit Markdown";
    const saveLabel = options.saveLabel ?? "Save";
    const cancelLabel = options.cancelLabel ?? "Cancel";
    const showSave = options.showSave !== false;

    // Build modal DOM
    const backdrop = createElement("div", "modal", "fade");
    setAttr(backdrop, { tabindex: "-1", "aria-hidden": "true" });

    const dialog = createElement("div", "modal-dialog", "modal-xl", "modal-dialog-scrollable", "mde-modal-dialog");
    dialog.setAttribute("data-dui-region", "markdowneditor:modal-dialog");
    const content = createElement("div", "modal-content");

    // Header
    const header = createElement("div", "modal-header");
    const title = createElement("h5", "modal-title");
    title.textContent = modalTitle;
    const closeBtn = createElement("button", "btn-close");
    setAttr(closeBtn, { type: "button", "data-bs-dismiss": "modal", "aria-label": "Close" });
    header.appendChild(title);
    header.appendChild(closeBtn);

    // Body
    const body = createElement("div", "modal-body");
    const editorContainer = createElement("div");
    editorContainer.id = `mde-modal-${Date.now()}`;
    body.appendChild(editorContainer);

    // Footer
    const footer = createElement("div", "modal-footer");

    const cancelBtn = createElement("button", "btn", "btn-secondary");
    cancelBtn.textContent = cancelLabel;
    setAttr(cancelBtn, { type: "button", "data-bs-dismiss": "modal" });
    footer.appendChild(cancelBtn);

    if (showSave)
    {
        const saveBtn = createElement("button", "btn", "btn-primary");
        saveBtn.textContent = saveLabel;
        setAttr(saveBtn, { type: "button" });
        footer.appendChild(saveBtn);

        saveBtn.addEventListener("click", () =>
        {
            const value = editor.getValue();
            if (options.onSave)
            {
                options.onSave(value);
            }
            if (options.onClose)
            {
                options.onClose(value);
            }
            hideModal();
        });
    }

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    dialog.appendChild(content);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Adjust editor options for modal context
    const editorOptions: MarkdownEditorOptions = {
        ...options,
        height: "60vh",
        showFullscreen: false,
    };

    // Map Ctrl+Enter to save in modal
    editorOptions.onSave = (value: string) =>
    {
        if (options.onSave)
        {
            options.onSave(value);
        }
        if (options.onClose)
        {
            options.onClose(value);
        }
        hideModal();
    };

    // Create editor
    const editor = new MarkdownEditor(editorContainer, editorOptions);

    // Show modal using Bootstrap API
    let bsModal: BootstrapInstance | null = null;

    const hideModal = (): void =>
    {
        if (bsModal)
        {
            bsModal.hide();
        }
    };

    const BootstrapLib = window.bootstrap;
    if (BootstrapLib && BootstrapLib.Modal)
    {
        bsModal = new BootstrapLib.Modal(backdrop);
        bsModal.show();

        // Clean up on hidden
        backdrop.addEventListener("hidden.bs.modal", () =>
        {
            editor.destroy();
            backdrop.remove();

            // If closed without save, callback with null
            if (options.onClose)
            {
                options.onClose(null);
            }

            logInfo("Modal closed and cleaned up");
        });
    }
    else
    {
        // FALLBACK-5. A hand-rolled modal with none of Bootstrap's focus
        // trapping, escape handling or scroll locking is not the modal
        // this component documents, and nothing told the host which one
        // they got.
        logError("Cannot show the editor modal, because Bootstrap JS is "
            + "not loaded.");

        throw new Error(
            "MarkdownEditor needs the Bootstrap JavaScript bundle to show "
            + "a modal. Load dist/js/bootstrap.bundle.min.js before "
            + "markdowneditor.js.");

        closeBtn.addEventListener("click", () =>
        {
            editor.destroy();
            backdrop.remove();
            if (options.onClose)
            {
                options.onClose(null);
            }
        });

        cancelBtn.addEventListener("click", () =>
        {
            editor.destroy();
            backdrop.remove();
            if (options.onClose)
            {
                options.onClose(null);
            }
        });
    }

    return editor;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a MarkdownEditor instance in the given container.
 *
 * `export` is not a widening of the public surface. `createMarkdownEditor`
 * has been the documented entry point since this component shipped — it is
 * on `window`, in COMPONENT_INDEX.md and COMPONENTS.md, and seven demo pages
 * call it — and module exports do not survive into the IIFE bundle at all.
 * The keyword is here because the fleet conformance gate resolves a factory
 * through the module (`mod[manifest.factory]`), and without it the gate could
 * not see a function every consumer already uses (ADR-214).
 */
export function createMarkdownEditor(
    containerId: string | HTMLElement,
    options?: MarkdownEditorOptions
): MarkdownEditorHandle
{
    // PAT-1. An element is accepted as well as an id, because the
    // CONSTRUCTOR always took one and only the class exposed that. A
    // caller holding an element it just created — SpineMap builds a
    // wrapper per popover field — had to reach for `window.MarkdownEditor`
    // to use it. The class is no longer on `window`, so the factory
    // offers what the class offered.
    const container = typeof containerId === "string"
        ? document.getElementById(containerId)
        : containerId;

    if (!container)
    {
        // ERR-1. This logged and returned null, and the census could not see
        // it: the function was not a module export, so the factory was
        // invisible to the scan that holds every sibling to a throw. The
        // export made it visible on its first run, and the ceiling is zero.
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. `
            + "Insert the element before creating the editor.");
    }

    return new MarkdownEditor(container, options);
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

window["createMarkdownEditor"] = createMarkdownEditor;
window["showMarkdownEditorModal"] = showMarkdownEditorModalFn;
