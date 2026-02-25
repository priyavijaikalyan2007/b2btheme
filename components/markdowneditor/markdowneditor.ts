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

    /** Layout mode: "tabs", "sidebyside", or "display". Default "tabs".
     *  "display" renders read-only markdown with no chrome (no header,
     *  toolbar, tabs, or resize handle). Suitable for hovers/popovers. */
    mode?: "tabs" | "sidebyside" | "display";

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
    onModeChange?: (mode: "tabs" | "sidebyside" | "display") => void;

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

const DEFAULT_TOOLBAR: string[] = [
    "headings", "bold", "italic", "strike", "|",
    "line", "quote", "list", "ordered-list", "check", "|",
    "code", "inline-code", "link", "table", "|",
    "undo", "redo", "|",
    "fullscreen",
];

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
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
    const dp = (window as any).DOMPurify;
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

    console.warn(LOG_PREFIX, "DOMPurify not found — using Vditor built-in sanitisation");
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
export class MarkdownEditor
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
    private vditor: any = null;
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

        this.hasDOMPurify = !!(window as any).DOMPurify;
        if (!this.hasDOMPurify)
        {
            console.warn(LOG_PREFIX, "DOMPurify not loaded — HTML output will use Vditor built-in sanitisation only");
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
        console.log(LOG_PREFIX, "Initialising");

        this.wrapper = createElement("div", "mde-wrapper");

        if (this.options.mode === "display")
        {
            this.buildDisplayMode();
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

        if (this.options.disabled)
        {
            this.disable();
        }

        console.log(LOG_PREFIX, "DOM built, Vditor initialising...");
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
        this.applySizeClass();
        this.displayValue = this.options.value ?? "";
        this.previewArea = createElement("div", "mde-preview-area");
        this.wrapper.appendChild(this.previewArea);
        this.container.appendChild(this.wrapper);
        this.renderDisplayPreview();
        console.log(LOG_PREFIX, "Display mode built");
    }

    /**
     * Renders markdown in display mode using Vditor.preview() or
     * DOMPurify-based fallback (no Vditor editor instance needed).
     */
    private renderDisplayPreview(): void
    {
        if (!this.previewArea) { return; }
        const VditorClass = (window as any).Vditor;
        if (VditorClass && typeof VditorClass.preview === "function")
        {
            VditorClass.preview(this.previewArea, this.displayValue, {
                mode: "light",
                hljs: { enable: true, style: "github", lineNumber: true },
                markdown: {
                    toc: true, mark: true, footnotes: true,
                    autoSpace: true, sanitize: true,
                },
                math: { engine: "KaTeX" },
            });
        }
        else
        {
            this.previewArea.innerHTML = sanitiseHTML(this.displayValue);
        }
    }

    /**
     * Applies width/height/min sizing to the wrapper.
     */
    private applySize(): void
    {
        if (!this.wrapper) return;
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
        if (this.activeTab === tabId) return;
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

        console.debug(LOG_PREFIX, "Switched to tab:", tabId);
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
        if (!this.previewArea || !this.vditor) return;

        const VditorClass = (window as any).Vditor;
        const markdown = this.vditor.getValue();

        if (VditorClass && typeof VditorClass.preview === "function")
        {
            VditorClass.preview(this.previewArea, markdown, {
                mode: "light",
                hljs: {
                    enable: true,
                    style: "github",
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
                    console.debug(LOG_PREFIX, "Preview rendered");
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
        if (!panes) return;

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

        console.debug(LOG_PREFIX, "Pane collapse toggled:", pane);
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

        const onMouseMove = (e: MouseEvent): void =>
        {
            const deltaY = e.clientY - startY;
            const newHeight = Math.max(
                this.options.minHeight,
                startHeight + deltaY
            );
            this.wrapper!.style.height = `${newHeight}px`;
        };

        const onMouseUp = (): void =>
        {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };

        this.resizeHandle.addEventListener("mousedown", (e: MouseEvent) =>
        {
            e.preventDefault();
            startY = e.clientY;
            startHeight = this.wrapper!.offsetHeight;
            document.body.style.cursor = "row-resize";
            document.body.style.userSelect = "none";
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        this.wrapper!.appendChild(this.resizeHandle);
    }

    // ========================================================================
    // VDITOR INITIALISATION
    // ========================================================================

    /**
     * Initialises the Vditor editor instance.
     */
    private initVditor(): void
    {
        const VditorClass = (window as any).Vditor;
        if (!VditorClass)
        {
            console.error(LOG_PREFIX, "Vditor library not found. Load vditor JS/CSS before this component.");
            this.buildFallbackTextarea();
            return;
        }

        if (!this.editorArea) return;

        // Ensure editor area has an ID for Vditor
        if (!this.editorArea.id)
        {
            this.editorArea.id = `mde-vditor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        const vditorMode = this.resolveVditorMode();
        const vditorOptions = this.buildVditorOptions(vditorMode);

        this.vditor = new VditorClass(this.editorArea.id, vditorOptions);
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

    /**
     * Builds the Vditor constructor options object.
     */
    private buildVditorOptions(mode: "ir" | "wysiwyg" | "sv"): Record<string, unknown>
    {
        const opts: Record<string, unknown> = {
            mode,
            value: this.options.value ?? "",
            placeholder: this.options.placeholder ?? "",
            height: "100%",
            width: "100%",
            theme: "classic",
            lang: "en_US",
            icon: "ant",
            toolbar: this.options.editable
                ? (this.options.toolbar ?? DEFAULT_TOOLBAR)
                : [],
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
                    style: "github",
                },
            },

            cache: {
                enable: false,
            },

            after: () =>
            {
                console.log(LOG_PREFIX, "Vditor ready");

                if (!this.options.editable)
                {
                    this.vditor?.disabled();
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

            select: (value: string) =>
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
     * Builds a fallback textarea when Vditor is not available.
     */
    private buildFallbackTextarea(): void
    {
        if (!this.editorArea) return;

        const textarea = createElement("textarea");
        textarea.classList.add("form-control", "mde-fallback-textarea");
        textarea.value = this.options.value ?? "";
        textarea.placeholder = this.options.placeholder ?? "Enter markdown...";
        textarea.style.height = "100%";
        textarea.style.fontFamily = "var(--bs-font-monospace)";

        if (!this.options.editable)
        {
            textarea.readOnly = true;
        }

        this.editorArea.appendChild(textarea);
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

        if (!this.vditor) return;

        const pos = this.vditor.getCursorPosition();
        if (!pos) return;

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

            btn.addEventListener("mousedown", (e) =>
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

        console.debug(LOG_PREFIX, "Inline toolbar shown");
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
        if (!this.vditor) return;

        const selection = this.vditor.getSelection();
        if (!selection) return;

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
        document.addEventListener("mousedown", this.boundHandlers.clickOutside);

        // Escape closes inline toolbar and fullscreen
        this.boundHandlers.keydown = (e: Event) =>
        {
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
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("keydown", handler);
        }
        this.boundHandlers = {};
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Returns the current markdown content.
     */
    public getValue(): string
    {
        if (this.options.mode === "display") { return this.displayValue; }

        if (this.vditor)
        {
            return this.vditor.getValue();
        }

        // Fallback textarea
        const ta = this.editorArea?.querySelector("textarea") as HTMLTextAreaElement | null;
        return ta?.value ?? "";
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

        if (this.vditor)
        {
            this.vditor.setValue(md, true);
        }
        else
        {
            const ta = this.editorArea?.querySelector("textarea") as HTMLTextAreaElement | null;
            if (ta) ta.value = md;
        }

        console.debug(LOG_PREFIX, "Content set, length:", md.length);
    }

    /**
     * Returns the rendered and sanitised HTML.
     */
    public getHTML(): string
    {
        if (!this.vditor) return "";
        const rawHTML = this.vditor.getHTML();
        return sanitiseHTML(rawHTML);
    }

    /**
     * Switches between tab, side-by-side, and display layout modes.
     */
    public setMode(mode: "tabs" | "sidebyside" | "display"): void
    {
        if (this.options.mode === mode) { return; }

        const currentValue = this.getValue();
        const wasDisplay = this.options.mode === "display";
        this.options.mode = mode;
        this.options.value = currentValue;

        // Tear down current state
        if (this.vditor) { this.vditor.destroy(); this.vditor = null; }
        if (this.bodyEl) { this.bodyEl.remove(); this.bodyEl = null; }

        if (mode === "display")
        {
            this.rebuildAsDisplay(currentValue);
        }
        else
        {
            this.rebuildAsEditor(wasDisplay);
        }

        if (this.options.onModeChange) { this.options.onModeChange(mode); }
        console.log(LOG_PREFIX, "Mode switched to:", mode);
    }

    private rebuildAsDisplay(currentValue: string): void
    {
        this.wrapper?.classList.add("mde-display");
        if (this.headerEl) { this.headerEl.style.display = "none"; }
        if (this.resizeHandle) { this.resizeHandle.style.display = "none"; }
        this.unbindGlobalEvents();
        this.displayValue = currentValue;
        this.previewArea = createElement("div", "mde-preview-area");
        this.wrapper!.appendChild(this.previewArea);
        this.renderDisplayPreview();
    }

    private rebuildAsEditor(wasDisplay: boolean): void
    {
        this.wrapper?.classList.remove("mde-display");
        if (wasDisplay && this.previewArea)
        {
            this.previewArea.remove();
            this.previewArea = null;
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
        if (!buttons) return;

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
        this.options.editable = editable;

        if (this.vditor)
        {
            if (editable)
            {
                this.vditor.enable();
            }
            else
            {
                this.vditor.disabled();
            }
        }

        console.debug(LOG_PREFIX, "Editable:", editable);
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
        console.log(LOG_PREFIX, "Exported Markdown");
    }

    /**
     * Exports content as an HTML file download.
     */
    public exportHTML(): void
    {
        const html = this.getHTML();
        const fullHTML = this.wrapHTMLDocument(html);
        downloadFile("document.html", fullHTML, "text/html;charset=utf-8");
        console.log(LOG_PREFIX, "Exported HTML");
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

        console.log(LOG_PREFIX, "PDF export (print dialog)");
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

        console.debug(LOG_PREFIX, "Fullscreen:", this.isFullscreen);
    }

    /**
     * Focuses the editor.
     */
    public focus(): void
    {
        this.vditor?.focus();
    }

    /**
     * Enables the editor.
     */
    public enable(): void
    {
        this.options.disabled = false;
        this.vditor?.enable();
        this.wrapper?.classList.remove("mde-disabled");
    }

    /**
     * Disables the editor.
     */
    public disable(): void
    {
        this.options.disabled = true;
        this.vditor?.disabled();
        this.wrapper?.classList.add("mde-disabled");
    }

    /**
     * Destroys the component and cleans up.
     */
    public destroy(): void
    {
        console.log(LOG_PREFIX, "Destroying");

        this.hideInlineToolbar();
        this.unbindGlobalEvents();

        if (this.vditor)
        {
            this.vditor.destroy();
            this.vditor = null;
        }

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
): MarkdownEditor | null
{
    console.log(LOG_PREFIX, "Opening modal editor");

    const modalTitle = options.modalTitle ?? options.title ?? "Edit Markdown";
    const saveLabel = options.saveLabel ?? "Save";
    const cancelLabel = options.cancelLabel ?? "Cancel";
    const showSave = options.showSave !== false;

    // Build modal DOM
    const backdrop = createElement("div", "modal", "fade");
    setAttr(backdrop, { tabindex: "-1", "aria-hidden": "true" });

    const dialog = createElement("div", "modal-dialog", "modal-xl", "modal-dialog-scrollable", "mde-modal-dialog");
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
    let bsModal: any = null;

    const hideModal = (): void =>
    {
        if (bsModal)
        {
            bsModal.hide();
        }
    };

    const BootstrapLib = (window as any).bootstrap;
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

            console.log(LOG_PREFIX, "Modal closed and cleaned up");
        });
    }
    else
    {
        // Fallback: show modal manually
        console.warn(LOG_PREFIX, "Bootstrap JS not found — showing modal with basic CSS");
        backdrop.classList.add("show");
        backdrop.style.display = "block";

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
 */
function createMarkdownEditorFn(
    containerId: string,
    options?: MarkdownEditorOptions
): MarkdownEditor | null
{
    const container = document.getElementById(containerId);
    if (!container)
    {
        console.error(LOG_PREFIX, "Container element not found:", containerId);
        return null;
    }

    return new MarkdownEditor(container, options);
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

(window as any).MarkdownEditor = MarkdownEditor;
(window as any).createMarkdownEditor = createMarkdownEditorFn;
(window as any).showMarkdownEditorModal = showMarkdownEditorModalFn;
