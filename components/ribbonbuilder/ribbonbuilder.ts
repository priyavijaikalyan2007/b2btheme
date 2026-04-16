/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: RibbonBuilder
 * 📜 PURPOSE: Visual WYSIWYG editor for composing Ribbon toolbar layouts via
 *    drag-and-drop. Exports Markdown specs consumable by coding agents and
 *    JSON configs for direct use with createRibbon().
 * 🔗 RELATES: [[Ribbon]], [[SymbolPicker]], [[TreeView]], [[SplitLayout]]
 * ⚡ FLOW: [Designer] -> [createRibbonBuilder()] -> [RibbonOptions JSON / Markdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, CONSTANTS
// ============================================================================

/** Ribbon types re-declared locally to avoid cross-module import issues. */
// >> Delegates to: [[Ribbon]] for the live preview

export type RibbonButtonSize = "large" | "small" | "mini";

export type RibbonControlType =
    | "button" | "split-button" | "gallery" | "dropdown"
    | "input" | "color" | "number" | "checkbox" | "toggle"
    | "separator" | "row-break" | "label" | "custom" | "component";

export interface RibbonControlBase
{
    type: RibbonControlType;
    id: string;
    label?: string;
    icon?: string;
    tooltip?: string;
    size?: RibbonButtonSize;
    disabled?: boolean;
    hidden?: boolean;
    keyTip?: string;
    cssClass?: string;
}

export interface RibbonGroup
{
    id: string;
    label: string;
    controls: RibbonControlBase[];
    collapsePriority?: number;
}

export interface RibbonTab
{
    id: string;
    label: string;
    groups: RibbonGroup[];
    keyTip?: string;
}

export interface RibbonOptions
{
    tabs: RibbonTab[];
    activeTabId?: string;
    panelHeight?: number;
    collapsible?: boolean;
    adaptive?: boolean;
    keyTips?: boolean;
    cssClass?: string;
}

/** Configuration for the RibbonBuilder component. */
export interface RibbonBuilderOptions
{
    /** Pre-loaded Ribbon config to edit. */
    initialConfig?: Partial<RibbonOptions>;
    /** Container element or selector. */
    container?: HTMLElement | string;
    /** Preview ribbon height in px. Default: 96. */
    previewHeight?: number;
    /** Structure tree panel width in px. Default: 240. */
    treeWidth?: number;
    /** Fires on every config mutation. */
    onChange?: (config: RibbonOptions) => void;
    /** Fires when Markdown is exported. */
    onExport?: (markdown: string) => void;
    /** Extra CSS class on root element. */
    cssClass?: string;
}

/** Public handle returned by createRibbonBuilder(). */
export interface RibbonBuilderHandle
{
    show(containerId?: string): void;
    destroy(): void;
    getConfig(): RibbonOptions;
    setConfig(config: RibbonOptions): void;
    exportMarkdown(): string;
    exportJSON(): string;
    importJSON(json: string): void;
    getElement(): HTMLElement;
}

/** Node types in the structure tree. */
type TreeNodeKind = "tab" | "group" | "control";

/** Internal node reference for tree selection. */
interface TreeNodeRef
{
    kind: TreeNodeKind;
    tabIndex: number;
    groupIndex?: number;
    controlIndex?: number;
}

const LOG_PREFIX = "[RibbonBuilder]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "ribbonbuilder";
const DEBOUNCE_MS = 250;
let instanceCounter = 0;

/** Default starter config for new RibbonBuilder instances. */
const DEFAULT_STARTER_CONFIG: RibbonOptions =
{
    tabs: [
        {
            id: "home",
            label: "Home",
            keyTip: "H",
            groups: [
                {
                    id: "clipboard",
                    label: "Clipboard",
                    collapsePriority: 30,
                    controls: [
                        { type: "button", id: "paste", label: "Paste", icon: "bi bi-clipboard", size: "large" },
                        { type: "button", id: "cut", label: "Cut", icon: "bi bi-scissors", size: "small" },
                        { type: "button", id: "copy", label: "Copy", icon: "bi bi-files", size: "small" },
                    ],
                },
            ],
        },
    ],
};

/** Control types available in the "Add Control" dropdown. */
const CONTROL_TYPES: { type: RibbonControlType; label: string }[] =
[
    { type: "button",       label: "Button" },
    { type: "split-button", label: "Split Button" },
    { type: "dropdown",     label: "Dropdown" },
    { type: "input",        label: "Text Input" },
    { type: "color",        label: "Color Picker" },
    { type: "number",       label: "Number Spinner" },
    { type: "checkbox",     label: "Checkbox" },
    { type: "toggle",       label: "Toggle Switch" },
    { type: "gallery",      label: "Gallery" },
    { type: "separator",    label: "Separator" },
    { type: "row-break",    label: "Row Break" },
    { type: "label",        label: "Label" },
];

/** Component type → window-global factory name mapping. */
type ComponentType =
    | "color-picker" | "font-dropdown" | "line-width-picker"
    | "line-type-picker" | "line-shape-picker" | "line-ending-picker"
    | "angle-picker" | "slider" | "date-picker" | "time-picker"
    | "duration-picker" | "timezone-picker" | "editable-combobox"
    | "search-box" | "symbol-picker" | "orientation-picker"
    | "sizes-picker" | "margins-picker" | "tool-color-picker"
    | "columns-picker" | "spacing-picker" | "layout-picker";

/** Component picker entries for the Add Control dropdown. */
const COMPONENT_PICKER_TYPES: { componentType: ComponentType; label: string; factory: string }[] =
[
    { componentType: "color-picker",       label: "ColorPicker",       factory: "createColorPicker" },
    { componentType: "font-dropdown",      label: "FontDropdown",      factory: "createFontDropdown" },
    { componentType: "line-width-picker",  label: "LineWidthPicker",   factory: "createLineWidthPicker" },
    { componentType: "line-type-picker",   label: "LineTypePicker",    factory: "createLineTypePicker" },
    { componentType: "line-shape-picker",  label: "LineShapePicker",   factory: "createLineShapePicker" },
    { componentType: "line-ending-picker", label: "LineEndingPicker",  factory: "createLineEndingPicker" },
    { componentType: "angle-picker",       label: "AnglePicker",       factory: "createAnglePicker" },
    { componentType: "slider",             label: "Slider",            factory: "createSlider" },
    { componentType: "date-picker",        label: "DatePicker",        factory: "createDatePicker" },
    { componentType: "time-picker",        label: "TimePicker",        factory: "createTimePicker" },
    { componentType: "duration-picker",    label: "DurationPicker",    factory: "createDurationPicker" },
    { componentType: "timezone-picker",    label: "TimezonePicker",    factory: "createTimezonePicker" },
    { componentType: "editable-combobox",  label: "EditableComboBox",  factory: "createEditableComboBox" },
    { componentType: "search-box",         label: "SearchBox",         factory: "createSearchBox" },
    { componentType: "symbol-picker",      label: "SymbolPicker",      factory: "createSymbolPicker" },
    { componentType: "orientation-picker", label: "OrientationPicker", factory: "createOrientationPicker" },
    { componentType: "sizes-picker",       label: "SizesPicker",       factory: "createSizesPicker" },
    { componentType: "margins-picker",     label: "MarginsPicker",     factory: "createMarginsPicker" },
    { componentType: "tool-color-picker",  label: "ToolColorPicker",   factory: "createToolColorPicker" },
    { componentType: "columns-picker",     label: "ColumnsPicker",     factory: "createColumnsPicker" },
    { componentType: "spacing-picker",     label: "SpacingPicker",     factory: "createSpacingPicker" },
    { componentType: "layout-picker",      label: "LayoutPicker",      factory: "createLayoutPicker" },
];

// ============================================================================
// S2: DOM HELPERS
// ============================================================================

/** Create an element with optional CSS classes and text. */
function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

/** Set multiple attributes on an element. */
function setAttr(
    el: HTMLElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

// ============================================================================
// S3: BOOTSTRAP ICON DATA (CURATED)
// ============================================================================

/** Icon category for the picker grid. */
interface IconCategory
{
    id: string;
    label: string;
    icons: string[];
}

/** Curated Bootstrap Icons grouped by category. */
const ICON_CATEGORIES: IconCategory[] =
[
    {
        id: "actions",
        label: "Actions",
        icons: [
            "bi-plus", "bi-dash", "bi-x", "bi-check", "bi-check2",
            "bi-pencil", "bi-trash", "bi-gear", "bi-sliders",
            "bi-funnel", "bi-search", "bi-zoom-in", "bi-zoom-out",
            "bi-download", "bi-upload", "bi-cloud-download",
            "bi-cloud-upload", "bi-share", "bi-link", "bi-pin",
            "bi-bookmark", "bi-star", "bi-heart", "bi-flag",
            "bi-bell", "bi-eye", "bi-eye-slash", "bi-lock",
            "bi-unlock", "bi-key", "bi-shield-check",
        ],
    },
    {
        id: "arrows",
        label: "Arrows",
        icons: [
            "bi-arrow-left", "bi-arrow-right", "bi-arrow-up",
            "bi-arrow-down", "bi-arrow-clockwise",
            "bi-arrow-counterclockwise", "bi-arrows-move",
            "bi-box-arrow-up-right", "bi-chevron-left",
            "bi-chevron-right", "bi-chevron-up", "bi-chevron-down",
            "bi-caret-left-fill", "bi-caret-right-fill",
            "bi-caret-up-fill", "bi-caret-down-fill",
            "bi-arrow-repeat", "bi-arrow-return-left",
            "bi-arrow-bar-up", "bi-arrow-bar-down",
        ],
    },
    {
        id: "files",
        label: "Files",
        icons: [
            "bi-file-earmark", "bi-file-earmark-text",
            "bi-file-earmark-code", "bi-file-earmark-image",
            "bi-file-earmark-pdf", "bi-file-earmark-spreadsheet",
            "bi-file-earmark-zip", "bi-file-earmark-plus",
            "bi-folder", "bi-folder-plus", "bi-folder2-open",
            "bi-clipboard", "bi-clipboard2", "bi-clipboard-check",
            "bi-clipboard-data", "bi-files", "bi-floppy",
            "bi-save", "bi-printer", "bi-archive",
        ],
    },
    {
        id: "communication",
        label: "Communication",
        icons: [
            "bi-envelope", "bi-chat", "bi-chat-dots",
            "bi-chat-left-text", "bi-telephone", "bi-camera-video",
            "bi-megaphone", "bi-broadcast", "bi-rss",
            "bi-globe", "bi-translate", "bi-at",
            "bi-send", "bi-reply", "bi-forward",
            "bi-people", "bi-person", "bi-person-plus",
            "bi-person-check", "bi-building",
        ],
    },
    {
        id: "media",
        label: "Media",
        icons: [
            "bi-image", "bi-camera", "bi-film", "bi-music-note",
            "bi-play-fill", "bi-pause-fill", "bi-stop-fill",
            "bi-skip-forward-fill", "bi-skip-backward-fill",
            "bi-volume-up", "bi-volume-mute", "bi-mic",
            "bi-record-circle", "bi-cast", "bi-fullscreen",
            "bi-aspect-ratio", "bi-crop", "bi-palette",
            "bi-paint-bucket", "bi-brush",
        ],
    },
    {
        id: "charts",
        label: "Charts",
        icons: [
            "bi-bar-chart", "bi-bar-chart-line", "bi-graph-up",
            "bi-graph-down", "bi-pie-chart", "bi-speedometer2",
            "bi-activity", "bi-clipboard-data",
            "bi-diagram-3", "bi-grid", "bi-grid-3x3",
            "bi-kanban", "bi-list-task", "bi-calendar",
            "bi-calendar-event", "bi-clock", "bi-hourglass",
            "bi-percent", "bi-hash", "bi-calculator",
        ],
    },
    {
        id: "text",
        label: "Text",
        icons: [
            "bi-type-bold", "bi-type-italic", "bi-type-underline",
            "bi-type-strikethrough", "bi-type-h1", "bi-type-h2",
            "bi-type-h3", "bi-text-left", "bi-text-center",
            "bi-text-right", "bi-justify", "bi-list-ul",
            "bi-list-ol", "bi-text-indent-left",
            "bi-text-indent-right", "bi-blockquote-left",
            "bi-code", "bi-code-slash", "bi-braces",
            "bi-quote", "bi-fonts", "bi-scissors",
        ],
    },
    {
        id: "misc",
        label: "Misc",
        icons: [
            "bi-house", "bi-box", "bi-truck", "bi-cart",
            "bi-bag", "bi-gift", "bi-cup-hot", "bi-lightning",
            "bi-sun", "bi-moon", "bi-cloud", "bi-snow",
            "bi-tree", "bi-bug", "bi-wrench", "bi-hammer",
            "bi-puzzle", "bi-joystick", "bi-trophy",
            "bi-emoji-smile", "bi-hand-thumbs-up",
            "bi-exclamation-triangle", "bi-info-circle",
            "bi-question-circle",
        ],
    },
];

/** Flat list of all icon names for search. */
function getAllIcons(): string[]
{
    const result: string[] = [];

    for (const cat of ICON_CATEGORIES)
    {
        for (const icon of cat.icons)
        {
            result.push(icon);
        }
    }

    return result;
}

// ============================================================================
// S4: CLASS SHELL & CONSTRUCTOR
// ============================================================================

class RibbonBuilderImpl
{
    private readonly instanceId: number;
    private readonly opts: Required<
        Pick<RibbonBuilderOptions, "previewHeight" | "treeWidth">
    > & RibbonBuilderOptions;
    private config: RibbonOptions;
    private rootEl: HTMLElement;
    private destroyed = false;

    // UI panel references
    private toolbarEl!: HTMLElement;
    private previewContainerEl!: HTMLElement;
    private treeEl!: HTMLElement;
    private propsEl!: HTMLElement;
    private iconPickerEl!: HTMLElement;

    // State
    private selectedNode: TreeNodeRef | null = null;
    private previewTimer: number | null = null;
    private previewInstance: { destroy(): void } | null = null;
    private expandedNodes: Set<string> = new Set();
    private controlTypeMenuEl: HTMLElement | null = null;
    private activeIconField = false;
    private symbolPickerInstance: Record<string, Function> | null = null;
    private symbolPickerHostEl!: HTMLElement;
    private symbolPickerOverlay!: HTMLElement;
    private activeIconInput: HTMLInputElement | null = null;
    private activeIconOnChange: ((v: string) => void) | null = null;
    private treeResizing = false;
    private currentTreeWidth: number;

    constructor(options: RibbonBuilderOptions)
    {
        this.instanceId = ++instanceCounter;
        this.opts = {
            previewHeight: 96,
            treeWidth: 240,
            ...options,
        };
        this.currentTreeWidth = this.opts.treeWidth;
        this.config = this.buildDefaultConfig(options.initialConfig);
        this.rootEl = this.buildRootElement();

        logInfo("instance", this.instanceId, "created");
    }

    // ========================================================================
    // S5: PUBLIC API
    // ========================================================================

    /** Mount into a container or the configured container. */
    public show(containerId?: string): void
    {
        const target = this.resolveContainer(containerId);

        if (!target)
        {
            return;
        }

        target.appendChild(this.rootEl);
        this.initSymbolPicker();
        this.schedulePreviewRefresh();

        logInfo("shown in container");
    }

    /** Tear down all DOM and timers. */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.destroyed = true;
        this.clearPreviewTimer();
        this.destroyPreview();
        this.destroySymbolPicker();
        this.rootEl.remove();
        this.dismissControlTypeMenu();

        logInfo("instance", this.instanceId, "destroyed");
    }

    /** Return a deep copy of the current config. */
    public getConfig(): RibbonOptions
    {
        return JSON.parse(JSON.stringify(this.config));
    }

    /** Replace the current config entirely. */
    public setConfig(config: RibbonOptions): void
    {
        this.config = JSON.parse(JSON.stringify(config));
        this.selectedNode = null;
        this.expandedNodes.clear();
        this.mutateConfig();
    }

    /** Export config as structured Markdown. */
    public exportMarkdown(): string
    {
        return this.generateMarkdown();
    }

    /** Export config as formatted JSON. */
    public exportJSON(): string
    {
        return JSON.stringify(this.config, null, 2);
    }

    /** Import a JSON string and replace current config. */
    public importJSON(json: string): void
    {
        try
        {
            const parsed = JSON.parse(json) as RibbonOptions;

            if (!parsed.tabs || !Array.isArray(parsed.tabs))
            {
                logError("Invalid JSON: missing tabs array");
                return;
            }

            this.setConfig(parsed);
            logInfo("JSON imported successfully");
        }
        catch (err)
        {
            logError("JSON parse error:", err);
        }
    }

    /** Return the root DOM element. */
    public getElement(): HTMLElement
    {
        return this.rootEl;
    }

    // ========================================================================
    // S6: ROOT ELEMENT + TOOLBAR
    // ========================================================================

    /** Build the complete root DOM structure. */
    private buildRootElement(): HTMLElement
    {
        const root = createElement("div", [CLS]);

        if (this.opts.cssClass)
        {
            root.classList.add(this.opts.cssClass);
        }

        this.toolbarEl = this.buildToolbar();
        this.previewContainerEl = this.buildPreviewContainer();
        const bottomPanel = this.buildBottomPanel();

        this.symbolPickerHostEl = createElement(
            "div", [`${CLS}-symbolpicker-host`]
        );
        this.symbolPickerHostEl.style.display = "none";

        // SymbolPicker renders in a modal overlay, not inline
        this.symbolPickerOverlay = createElement(
            "div", [`${CLS}-symbolpicker-overlay`]
        );
        this.symbolPickerOverlay.style.display = "none";
        this.symbolPickerOverlay.appendChild(this.symbolPickerHostEl);
        this.symbolPickerOverlay.addEventListener("click", (e) =>
        {
            if (e.target === this.symbolPickerOverlay)
            {
                this.deactivateIconPicker();
            }
        });

        root.appendChild(this.toolbarEl);
        root.appendChild(this.previewContainerEl);
        root.appendChild(bottomPanel);
        root.appendChild(this.symbolPickerOverlay);

        root.addEventListener("keydown", (e) => this.handleKeydown(e));

        return root;
    }

    /** Build the top toolbar with action buttons. */
    private buildToolbar(): HTMLElement
    {
        const bar = createElement("div", [`${CLS}-toolbar`]);

        bar.appendChild(this.buildToolbarLeftGroup());
        bar.appendChild(this.buildToolbarRightGroup());

        return bar;
    }

    /** Build the left toolbar group (add/delete actions). */
    private buildToolbarLeftGroup(): HTMLElement
    {
        const group = createElement("div", [`${CLS}-toolbar-left`]);

        group.appendChild(this.createToolbarBtn("bi-plus-lg", "Add Tab", () => this.addTab()));
        group.appendChild(this.createToolbarBtn("bi-collection", "Add Group", () => this.addGroup()));

        const addControlBtn = this.createToolbarBtn(
            "bi-ui-checks", "Add Control", () => this.showControlTypeMenu(addControlBtn)
        );
        const chevron = createElement("i", ["bi", "bi-chevron-down", `${CLS}-toolbar-chevron`]);
        addControlBtn.appendChild(chevron);
        group.appendChild(addControlBtn);

        group.appendChild(this.createToolbarBtn("bi-trash", "Delete", () => this.removeSelectedNode()));

        return group;
    }

    /** Build the right toolbar group (export/import actions). */
    private buildToolbarRightGroup(): HTMLElement
    {
        const group = createElement("div", [`${CLS}-toolbar-right`]);

        group.appendChild(this.createToolbarBtn("bi-markdown", "Export MD", () => this.handleExportMarkdown()));
        group.appendChild(this.createToolbarBtn("bi-braces", "Export JSON", () => this.handleExportJSON()));
        group.appendChild(this.createToolbarBtn("bi-box-arrow-in-down", "Import JSON", () => this.handleImportJSON()));

        return group;
    }

    /** Create a single toolbar button. */
    private createToolbarBtn(
        icon: string, label: string, onClick: () => void
    ): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-toolbar-btn`]);
        setAttr(btn, { type: "button", title: label });

        const iconEl = createElement("i", ["bi", icon]);
        btn.appendChild(iconEl);

        const labelEl = createElement("span", [], label);
        btn.appendChild(labelEl);

        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    // ========================================================================
    // S7: LIVE PREVIEW
    // ========================================================================

    /** Build the preview container. */
    private buildPreviewContainer(): HTMLElement
    {
        const wrapper = createElement("div", [`${CLS}-preview`]);
        wrapper.style.minHeight = `${this.opts.previewHeight}px`;

        const label = createElement("div", [`${CLS}-preview-label`], "Live Preview");
        wrapper.appendChild(label);

        const host = createElement("div", [`${CLS}-preview-host`]);
        setAttr(host, { id: `${CLS}-preview-${this.instanceId}` });
        wrapper.appendChild(host);

        return wrapper;
    }

    /** Schedule a debounced preview refresh. */
    private schedulePreviewRefresh(): void
    {
        this.clearPreviewTimer();

        this.previewTimer = window.setTimeout(() =>
        {
            this.rebuildPreview();
        }, DEBOUNCE_MS);
    }

    /** Clear the debounce timer. */
    private clearPreviewTimer(): void
    {
        if (this.previewTimer !== null)
        {
            clearTimeout(this.previewTimer);
            this.previewTimer = null;
        }
    }

    /** Destroy the current preview ribbon instance. */
    private destroyPreview(): void
    {
        if (this.previewInstance)
        {
            try
            {
                this.previewInstance.destroy();
            }
            catch (err)
            {
                logWarn("preview destroy error:", err);
            }

            this.previewInstance = null;
        }
    }

    /** Rebuild the live Ribbon preview from current config. */
    private rebuildPreview(): void
    {
        this.destroyPreview();

        const host = this.rootEl.querySelector(`.${CLS}-preview-host`) as HTMLElement;

        if (!host)
        {
            return;
        }

        host.innerHTML = "";

        const previewConfig = this.buildPreviewConfig();
        const containerId = host.id;

        const createRibbonFn = (window as unknown as Record<string, unknown>)[
            "createRibbon"
        ] as ((opts: unknown, id: string) => { destroy(): void }) | undefined;

        if (!createRibbonFn)
        {
            const msg = createElement("div", [`${CLS}-preview-empty`],
                "Ribbon component not loaded. Include ribbon.js to see live preview.");
            host.appendChild(msg);
            return;
        }

        try
        {
            this.previewInstance = createRibbonFn(previewConfig, containerId);
        }
        catch (err)
        {
            logError("preview build error:", err);

            const msg = createElement("div", [`${CLS}-preview-empty`],
                "Preview error. Check console for details.");
            host.appendChild(msg);
        }
    }

    /** Strip callbacks from config for preview rendering. */
    private buildPreviewConfig(): RibbonOptions
    {
        const clone: RibbonOptions = JSON.parse(JSON.stringify(this.config));

        clone.collapsible = false;
        clone.keyTips = false;

        // Attach element factories for component controls
        for (const tab of clone.tabs)
        {
            for (const group of tab.groups)
            {
                for (const ctrl of group.controls)
                {
                    this.attachComponentElement(ctrl);
                }
            }
        }

        return clone;
    }

    /** Attach a self-contained element factory for component picker controls. */
    private attachComponentElement(ctrl: RibbonControlBase): void
    {
        const anyCtrl = ctrl as unknown as Record<string, unknown>;

        if (ctrl.type !== "component" || !anyCtrl["componentFactory"])
        {
            return;
        }

        const factoryName = anyCtrl["componentFactory"] as string;
        const opts = (anyCtrl["componentOptions"] as Record<string, unknown>) || {};
        const win = window as unknown as Record<string, unknown>;
        const factory = win[factoryName] as
            ((id: string, o: unknown) => unknown) | undefined;

        if (!factory)
        {
            return;
        }

        // Ribbon calls `element()` with zero args (RibbonCustom interface).
        // We create our own container div and defer the factory call until
        // the div is mounted in the DOM via requestAnimationFrame.
        ctrl.type = "custom";
        anyCtrl["element"] = (): HTMLElement =>
        {
            const container = document.createElement("div");
            container.id = `${CLS}-comp-${ctrl.id}-${Date.now()}`;
            requestAnimationFrame(() =>
            {
                this.invokeComponentFactory(
                    factory, container, opts
                );
            });
            return container;
        };
    }

    /**
     * Invokes a component factory with the correct calling convention.
     * Uses Function.length: 1 param = options-only, 2+ = (id, opts).
     */
    private invokeComponentFactory(
        factory: Function,
        container: HTMLElement,
        opts: Record<string, unknown>
    ): void
    {
        const merged = { ...opts, container, containerId: container.id };

        logInfo("[INVOKE]",
            "factory:", factory.name || "(anon)",
            "fn.length:", factory.length,
            "container.id:", container.id,
            "container.parentNode:", container.parentNode ? "yes" : "NO",
            "container in DOM:", document.body.contains(container),
            "opts keys:", Object.keys(opts).join(",")
        );

        try
        {
            let instance: unknown;

            if (factory.length <= 1)
            {
                instance = factory(merged);
            }
            else
            {
                instance = factory(container.id, merged);
            }

            logInfo("[INVOKE OK]",
                factory.name || "(anon)",
                "children:", container.children.length,
                "innerHTML length:", container.innerHTML.length
            );
        }
        catch (err)
        {
            logError("[INVOKE FAIL]", factory.name || "(anon)", err);
        }
    }

    // ========================================================================
    // S8: BOTTOM PANEL (TREE + PROPERTIES)
    // ========================================================================

    /** Build the bottom split panel: tree + properties. */
    private buildBottomPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-bottom`]);

        this.treeEl = this.buildTreePanel();
        const divider = this.buildResizeDivider();
        const rightSide = this.buildRightPanel();

        panel.appendChild(this.treeEl);
        panel.appendChild(divider);
        panel.appendChild(rightSide);

        return panel;
    }

    /** Build the structure tree panel. */
    private buildTreePanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-tree`]);
        panel.style.width = `${this.currentTreeWidth}px`;

        const header = createElement("div", [`${CLS}-tree-header`], "Structure");
        panel.appendChild(header);

        const treeBody = createElement("div", [`${CLS}-tree-body`]);
        panel.appendChild(treeBody);

        this.renderTree(treeBody);

        return panel;
    }

    /** Build the resizable divider between tree and properties. */
    private buildResizeDivider(): HTMLElement
    {
        const divider = createElement("div", [`${CLS}-divider`]);

        divider.addEventListener("pointerdown", (e) =>
        {
            this.startTreeResize(e, divider);
        });

        return divider;
    }

    /** Build the right panel (properties + icon picker). */
    private buildRightPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-right`]);

        this.propsEl = createElement("div", [`${CLS}-props`]);
        this.iconPickerEl = createElement("div", [`${CLS}-iconpicker`]);
        this.iconPickerEl.style.display = "none";

        panel.appendChild(this.propsEl);
        panel.appendChild(this.iconPickerEl);

        this.renderProperties();

        return panel;
    }

    // ========================================================================
    // S8a: TREE RENDERING
    // ========================================================================

    /** Render the full structure tree into the body element. */
    private renderTree(body?: HTMLElement): void
    {
        const container = body || this.treeEl.querySelector(`.${CLS}-tree-body`) as HTMLElement | null;

        if (!container)
        {
            return;
        }

        container.innerHTML = "";

        for (let ti = 0; ti < this.config.tabs.length; ti++)
        {
            this.renderTabNode(container, ti);
        }
    }

    /** Render a single tab node and its children. */
    private renderTabNode(parent: HTMLElement, ti: number): void
    {
        const tab = this.config.tabs[ti];
        const ref: TreeNodeRef = { kind: "tab", tabIndex: ti };
        const nodeKey = `tab-${ti}`;
        const expanded = this.expandedNodes.has(nodeKey);

        const row = this.createTreeRow(
            0, "bi-window-stack", `Tab: ${tab.label}`, ref, expanded, true
        );

        row.addEventListener("click", () =>
        {
            this.toggleExpand(nodeKey);
            this.selectNode(ref);
        });

        this.attachDragHandlers(row, ref);
        parent.appendChild(row);

        if (!expanded)
        {
            return;
        }

        for (let gi = 0; gi < tab.groups.length; gi++)
        {
            this.renderGroupNode(parent, ti, gi);
        }
    }

    /** Render a single group node and its children. */
    private renderGroupNode(
        parent: HTMLElement, ti: number, gi: number
    ): void
    {
        const group = this.config.tabs[ti].groups[gi];
        const ref: TreeNodeRef = { kind: "group", tabIndex: ti, groupIndex: gi };
        const nodeKey = `group-${ti}-${gi}`;
        const expanded = this.expandedNodes.has(nodeKey);

        const row = this.createTreeRow(
            1, "bi-collection", `Group: ${group.label}`, ref, expanded, true
        );

        row.addEventListener("click", () =>
        {
            this.toggleExpand(nodeKey);
            this.selectNode(ref);
        });

        this.attachDragHandlers(row, ref);
        parent.appendChild(row);

        if (!expanded)
        {
            return;
        }

        for (let ci = 0; ci < group.controls.length; ci++)
        {
            this.renderControlNode(parent, ti, gi, ci);
        }
    }

    /** Render a single control leaf node. */
    private renderControlNode(
        parent: HTMLElement, ti: number, gi: number, ci: number
    ): void
    {
        const ctrl = this.config.tabs[ti].groups[gi].controls[ci];
        const ref: TreeNodeRef = {
            kind: "control", tabIndex: ti, groupIndex: gi, controlIndex: ci
        };

        const sizeLabel = ctrl.size ? ` (${ctrl.size})` : "";
        const displayLabel = ctrl.label || ctrl.id;
        const iconCls = ctrl.icon ? ctrl.icon.replace("bi ", "") : "bi-circle";

        const row = this.createTreeRow(
            2, iconCls, `${displayLabel}${sizeLabel}`, ref, false, false
        );

        row.addEventListener("click", () => this.selectNode(ref));
        this.attachDragHandlers(row, ref);
        parent.appendChild(row);
    }

    /** Create a tree row element. */
    private createTreeRow(
        indent: number,
        iconClass: string,
        label: string,
        ref: TreeNodeRef,
        expanded: boolean,
        hasChildren: boolean
    ): HTMLElement
    {
        const row = createElement("div", [`${CLS}-tree-row`]);
        row.style.paddingLeft = `${8 + (indent * 20)}px`;

        this.applyTreeRowAttrs(row, ref);

        row.appendChild(this.buildTreeChevron(hasChildren, expanded));
        row.appendChild(this.buildTreeIcon(iconClass));

        const labelEl = createElement("span", [`${CLS}-tree-label`], label);
        row.appendChild(labelEl);

        return row;
    }

    /** Set data attributes and selection state on a tree row. */
    private applyTreeRowAttrs(row: HTMLElement, ref: TreeNodeRef): void
    {
        setAttr(row, {
            "data-kind": ref.kind,
            "data-tab": String(ref.tabIndex),
            draggable: "true",
        });

        if (ref.groupIndex !== undefined)
        {
            setAttr(row, { "data-group": String(ref.groupIndex) });
        }

        if (ref.controlIndex !== undefined)
        {
            setAttr(row, { "data-control": String(ref.controlIndex) });
        }

        if (this.isNodeSelected(ref))
        {
            row.classList.add(`${CLS}-tree-row--selected`);
        }
    }

    /** Build the expand/collapse chevron or spacer for a tree row. */
    private buildTreeChevron(hasChildren: boolean, expanded: boolean): HTMLElement
    {
        if (hasChildren)
        {
            return createElement("i", [
                "bi",
                expanded ? "bi-chevron-down" : "bi-chevron-right",
                `${CLS}-tree-chevron`,
            ]);
        }

        return createElement("span", [`${CLS}-tree-chevron-spacer`]);
    }

    /** Build the icon element for a tree row. */
    private buildTreeIcon(iconClass: string): HTMLElement
    {
        const parts = iconClass.split(" ").filter(Boolean);

        if (!parts.includes("bi"))
        {
            parts.unshift("bi");
        }

        const icon = createElement("i", parts);
        icon.classList.add(`${CLS}-tree-icon`);
        return icon;
    }

    /** Check if a node ref matches the selected node. */
    private isNodeSelected(ref: TreeNodeRef): boolean
    {
        if (!this.selectedNode)
        {
            return false;
        }

        return (
            this.selectedNode.kind === ref.kind &&
            this.selectedNode.tabIndex === ref.tabIndex &&
            this.selectedNode.groupIndex === ref.groupIndex &&
            this.selectedNode.controlIndex === ref.controlIndex
        );
    }

    /** Toggle a node's expanded state. */
    private toggleExpand(nodeKey: string): void
    {
        if (this.expandedNodes.has(nodeKey))
        {
            this.expandedNodes.delete(nodeKey);
        }
        else
        {
            this.expandedNodes.add(nodeKey);
        }
    }

    /** Select a tree node and refresh panels. */
    private selectNode(ref: TreeNodeRef): void
    {
        this.selectedNode = ref;
        this.activeIconField = false;
        this.renderTree();
        this.renderProperties();
        this.hideIconPicker();
    }

    // ========================================================================
    // S9: TREE DRAG-AND-DROP
    // ========================================================================

    /** Attach HTML5 drag-and-drop handlers to a tree row. */
    private attachDragHandlers(row: HTMLElement, ref: TreeNodeRef): void
    {
        row.addEventListener("dragstart", (e) =>
        {
            if (!e.dataTransfer)
            {
                return;
            }

            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", JSON.stringify(ref));
            row.classList.add(`${CLS}-tree-row--dragging`);
        });

        row.addEventListener("dragend", () =>
        {
            row.classList.remove(`${CLS}-tree-row--dragging`);
            this.clearDropIndicators();
        });

        row.addEventListener("dragover", (e) =>
        {
            e.preventDefault();
            this.updateDropIndicator(row, e);
        });

        row.addEventListener("dragleave", () =>
        {
            row.classList.remove(
                `${CLS}-drop-before`,
                `${CLS}-drop-after`,
                `${CLS}-drop-inside`
            );
        });

        row.addEventListener("drop", (e) =>
        {
            e.preventDefault();
            this.handleDrop(row, e);
            this.clearDropIndicators();
        });
    }

    /** Determine drop position and show indicator. */
    private updateDropIndicator(row: HTMLElement, e: DragEvent): void
    {
        const rect = row.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const ratio = y / rect.height;

        row.classList.remove(
            `${CLS}-drop-before`,
            `${CLS}-drop-after`,
            `${CLS}-drop-inside`
        );

        if (ratio < 0.25)
        {
            row.classList.add(`${CLS}-drop-before`);
        }
        else if (ratio > 0.75)
        {
            row.classList.add(`${CLS}-drop-after`);
        }
        else
        {
            row.classList.add(`${CLS}-drop-inside`);
        }
    }

    /** Clear all drop indicators in the tree. */
    private clearDropIndicators(): void
    {
        const rows = this.treeEl.querySelectorAll(`.${CLS}-tree-row`);

        rows.forEach((row) =>
        {
            row.classList.remove(
                `${CLS}-drop-before`,
                `${CLS}-drop-after`,
                `${CLS}-drop-inside`
            );
        });
    }

    /** Handle drop event: validate and execute the move. */
    private handleDrop(targetRow: HTMLElement, e: DragEvent): void
    {
        if (!e.dataTransfer)
        {
            return;
        }

        const sourceData = e.dataTransfer.getData("text/plain");

        let sourceRef: TreeNodeRef;

        try
        {
            sourceRef = JSON.parse(sourceData) as TreeNodeRef;
        }
        catch
        {
            return;
        }

        const targetRef = this.getRefFromRow(targetRow);

        if (!targetRef)
        {
            return;
        }

        const rect = targetRow.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const ratio = y / rect.height;

        const position = ratio < 0.25 ? "before" : (ratio > 0.75 ? "after" : "inside");

        this.executeMoveNode(sourceRef, targetRef, position);
    }

    /** Extract TreeNodeRef from a tree row's data attributes. */
    private getRefFromRow(row: HTMLElement): TreeNodeRef | null
    {
        const kind = row.getAttribute("data-kind") as TreeNodeKind | null;
        const tabStr = row.getAttribute("data-tab");

        if (!kind || tabStr === null)
        {
            return null;
        }

        const ref: TreeNodeRef = { kind, tabIndex: parseInt(tabStr, 10) };

        const groupStr = row.getAttribute("data-group");

        if (groupStr !== null)
        {
            ref.groupIndex = parseInt(groupStr, 10);
        }

        const controlStr = row.getAttribute("data-control");

        if (controlStr !== null)
        {
            ref.controlIndex = parseInt(controlStr, 10);
        }

        return ref;
    }

    /** Execute a move operation with validation. */
    private executeMoveNode(
        source: TreeNodeRef,
        target: TreeNodeRef,
        position: "before" | "after" | "inside"
    ): void
    {
        if (!this.isValidMove(source, target, position))
        {
            logWarn("invalid move");
            return;
        }

        const extracted = this.extractNode(source);

        if (!extracted)
        {
            return;
        }

        this.insertNode(extracted, source.kind, target, position);
        this.mutateConfig();
    }

    /** Validate that a move operation is allowed. */
    private isValidMove(
        source: TreeNodeRef,
        target: TreeNodeRef,
        position: "before" | "after" | "inside"
    ): boolean
    {
        if (this.refsEqual(source, target))
        {
            return false;
        }

        if (source.kind === "control")
        {
            return this.isValidControlMove(target, position);
        }

        if (source.kind === "group")
        {
            return this.isValidGroupMove(target, position);
        }

        if (source.kind === "tab")
        {
            return this.isValidTabMove(target, position);
        }

        return true;
    }

    /** Controls can only move to/near groups. */
    private isValidControlMove(
        target: TreeNodeRef, position: string
    ): boolean
    {
        if (position === "inside" && target.kind !== "group")
        {
            return false;
        }

        return !(position !== "inside" && target.kind === "tab");
    }

    /** Groups can only move to/near tabs. */
    private isValidGroupMove(
        target: TreeNodeRef, position: string
    ): boolean
    {
        if (position === "inside" && target.kind !== "tab")
        {
            return false;
        }

        return !(position !== "inside" && target.kind === "control");
    }

    /** Tabs can only reorder among other tabs. */
    private isValidTabMove(
        target: TreeNodeRef, position: string
    ): boolean
    {
        return target.kind === "tab" && position !== "inside";
    }

    /** Check if two tree refs point to the same node. */
    private refsEqual(a: TreeNodeRef, b: TreeNodeRef): boolean
    {
        return (
            a.kind === b.kind &&
            a.tabIndex === b.tabIndex &&
            a.groupIndex === b.groupIndex &&
            a.controlIndex === b.controlIndex
        );
    }

    /** Extract a node from the config, returning the raw data. */
    private extractNode(
        ref: TreeNodeRef
    ): RibbonTab | RibbonGroup | RibbonControlBase | null
    {
        if (ref.kind === "tab")
        {
            return this.config.tabs.splice(ref.tabIndex, 1)[0];
        }

        if (ref.kind === "group" && ref.groupIndex !== undefined)
        {
            const tab = this.config.tabs[ref.tabIndex];
            return tab.groups.splice(ref.groupIndex, 1)[0];
        }

        if (ref.kind === "control" &&
            ref.groupIndex !== undefined &&
            ref.controlIndex !== undefined)
        {
            const group = this.config.tabs[ref.tabIndex].groups[ref.groupIndex];
            return group.controls.splice(ref.controlIndex, 1)[0];
        }

        return null;
    }

    /** Insert extracted node data at the target position. */
    private insertNode(
        data: RibbonTab | RibbonGroup | RibbonControlBase,
        kind: TreeNodeKind,
        target: TreeNodeRef,
        position: "before" | "after" | "inside"
    ): void
    {
        if (kind === "tab")
        {
            const idx = position === "after"
                ? target.tabIndex + 1
                : target.tabIndex;
            this.config.tabs.splice(idx, 0, data as RibbonTab);
            return;
        }

        if (kind === "group")
        {
            this.insertGroupNode(data as RibbonGroup, target, position);
            return;
        }

        if (kind === "control")
        {
            this.insertControlNode(data as RibbonControlBase, target, position);
        }
    }

    /** Insert a group node at target position. */
    private insertGroupNode(
        group: RibbonGroup,
        target: TreeNodeRef,
        position: "before" | "after" | "inside"
    ): void
    {
        if (position === "inside" && target.kind === "tab")
        {
            this.config.tabs[target.tabIndex].groups.push(group);
            return;
        }

        if (target.groupIndex === undefined)
        {
            return;
        }

        const tab = this.config.tabs[target.tabIndex];
        const idx = position === "after"
            ? target.groupIndex + 1
            : target.groupIndex;
        tab.groups.splice(idx, 0, group);
    }

    /** Insert a control node at target position. */
    private insertControlNode(
        control: RibbonControlBase,
        target: TreeNodeRef,
        position: "before" | "after" | "inside"
    ): void
    {
        if (position === "inside" && target.kind === "group")
        {
            const group = this.config.tabs[target.tabIndex]
                .groups[target.groupIndex!];
            group.controls.push(control);
            return;
        }

        if (target.groupIndex === undefined || target.controlIndex === undefined)
        {
            return;
        }

        const group = this.config.tabs[target.tabIndex]
            .groups[target.groupIndex];
        const idx = position === "after"
            ? target.controlIndex + 1
            : target.controlIndex;
        group.controls.splice(idx, 0, control);
    }

    // ========================================================================
    // S10: PROPERTY PANEL
    // ========================================================================

    /** Render the property form for the selected node. */
    private renderProperties(): void
    {
        this.propsEl.innerHTML = "";

        if (!this.selectedNode)
        {
            const hint = createElement("div", [`${CLS}-props-empty`],
                "Select an item in the tree to edit its properties.");
            this.propsEl.appendChild(hint);
            return;
        }

        const ref = this.selectedNode;

        if (ref.kind === "tab")
        {
            this.renderTabProps(ref);
        }
        else if (ref.kind === "group")
        {
            this.renderGroupProps(ref);
        }
        else if (ref.kind === "control")
        {
            this.renderControlProps(ref);
        }
    }

    /** Render tab properties form. */
    private renderTabProps(ref: TreeNodeRef): void
    {
        const tab = this.config.tabs[ref.tabIndex];

        if (!tab)
        {
            return;
        }

        const header = createElement("div", [`${CLS}-props-header`], "Tab Properties");
        this.propsEl.appendChild(header);

        this.addTextField("Label", tab.label, (v) =>
        {
            tab.label = v;
            this.mutateConfig();
        });

        this.addTextField("ID", tab.id, (v) =>
        {
            tab.id = v;
            this.mutateConfig();
        });

        this.addTextField("KeyTip", tab.keyTip || "", (v) =>
        {
            tab.keyTip = v || undefined;
            this.mutateConfig();
        });
    }

    /** Render group properties form. */
    private renderGroupProps(ref: TreeNodeRef): void
    {
        if (ref.groupIndex === undefined)
        {
            return;
        }

        const group = this.config.tabs[ref.tabIndex].groups[ref.groupIndex];

        if (!group)
        {
            return;
        }

        const header = createElement("div", [`${CLS}-props-header`], "Group Properties");
        this.propsEl.appendChild(header);

        this.addTextField("Label", group.label, (v) =>
        {
            group.label = v;
            this.mutateConfig();
        });

        this.addTextField("ID", group.id, (v) =>
        {
            group.id = v;
            this.mutateConfig();
        });

        this.addNumberField("Collapse Priority", group.collapsePriority ?? 50, (v) =>
        {
            group.collapsePriority = v;
            this.mutateConfig();
        });
    }

    /** Render control properties form. */
    private renderControlProps(ref: TreeNodeRef): void
    {
        if (ref.groupIndex === undefined || ref.controlIndex === undefined)
        {
            return;
        }

        const ctrl = this.config.tabs[ref.tabIndex]
            .groups[ref.groupIndex].controls[ref.controlIndex];

        if (!ctrl)
        {
            return;
        }

        const header = createElement("div", [`${CLS}-props-header`], "Control Properties");
        this.propsEl.appendChild(header);

        this.addReadonlyField("Type", ctrl.type);
        this.renderCommonControlFields(ctrl);
        this.renderTypeSpecificProps(ctrl);
    }

    /** Render shared property fields common to all control types. */
    private renderCommonControlFields(ctrl: RibbonControlBase): void
    {
        this.addTextField("ID", ctrl.id, (v) =>
        {
            ctrl.id = v;
            this.mutateConfig();
        });

        this.addTextField("Label", ctrl.label || "", (v) =>
        {
            ctrl.label = v || undefined;
            this.mutateConfig();
        });

        this.addIconField("Icon", ctrl.icon || "", (v) =>
        {
            ctrl.icon = v || undefined;
            this.mutateConfig();
        });

        this.addSelectField("Size", ctrl.size || "small",
            ["large", "small", "mini"], (v) =>
            {
                ctrl.size = v as RibbonButtonSize;
                this.mutateConfig();
            });

        this.renderCommonControlMeta(ctrl);
    }

    /** Render tooltip, keyTip, disabled, hidden fields for a control. */
    private renderCommonControlMeta(ctrl: RibbonControlBase): void
    {
        this.addTextField("Tooltip", ctrl.tooltip || "", (v) =>
        {
            ctrl.tooltip = v || undefined;
            this.mutateConfig();
        });

        this.addTextField("KeyTip", ctrl.keyTip || "", (v) =>
        {
            ctrl.keyTip = v || undefined;
            this.mutateConfig();
        });

        this.addCheckboxField("Disabled", ctrl.disabled || false, (v) =>
        {
            ctrl.disabled = v;
            this.mutateConfig();
        });

        this.addCheckboxField("Hidden", ctrl.hidden || false, (v) =>
        {
            ctrl.hidden = v;
            this.mutateConfig();
        });
    }

    /** Render properties specific to each control type. */
    private renderTypeSpecificProps(ctrl: RibbonControlBase): void
    {
        const anyCtrl = ctrl as unknown as Record<string, unknown>;
        const type = ctrl.type;

        if (type === "button" || type === "split-button")
        {
            this.renderToggleProps(anyCtrl);
        }
        else if (type === "dropdown")
        {
            this.renderDropdownProps(anyCtrl);
        }
        else if (type === "input")
        {
            this.renderInputProps(anyCtrl);
        }
        else if (type === "number")
        {
            this.renderNumberProps(anyCtrl);
        }
        else if (type === "color")
        {
            this.renderColorProps(anyCtrl);
        }
        else if (type === "checkbox" || type === "toggle")
        {
            this.renderCheckedProps(anyCtrl);
        }
        else if (type === "label")
        {
            this.renderLabelProps(anyCtrl);
        }
        else if (type === "component")
        {
            this.renderComponentProps(anyCtrl);
        }
    }

    /** Render toggle checkbox for button types. */
    private renderToggleProps(ctrl: Record<string, unknown>): void
    {
        this.addCheckboxField("Toggle", (ctrl["toggle"] as boolean) || false, (v) =>
        {
            ctrl["toggle"] = v;
            this.mutateConfig();
        });
    }

    /** Render dropdown-specific property fields. */
    private renderDropdownProps(ctrl: Record<string, unknown>): void
    {
        this.addTextField("Width", (ctrl["width"] as string) || "", (v) =>
        {
            ctrl["width"] = v || undefined;
            this.mutateConfig();
        });

        this.addTextAreaField("Options (value:label, one per line)",
            this.formatDropdownOptions(ctrl), (v) =>
            {
                ctrl["options"] = this.parseDropdownOptions(v);
                this.mutateConfig();
            });
    }

    /** Render input-specific property fields. */
    private renderInputProps(ctrl: Record<string, unknown>): void
    {
        this.addTextField("Placeholder", (ctrl["placeholder"] as string) || "", (v) =>
        {
            ctrl["placeholder"] = v || undefined;
            this.mutateConfig();
        });

        this.addTextField("Width", (ctrl["width"] as string) || "", (v) =>
        {
            ctrl["width"] = v || undefined;
            this.mutateConfig();
        });
    }

    /** Render number spinner property fields. */
    private renderNumberProps(ctrl: Record<string, unknown>): void
    {
        this.addNumberField("Min", (ctrl["min"] as number) ?? 0, (v) =>
        {
            ctrl["min"] = v;
            this.mutateConfig();
        });

        this.addNumberField("Max", (ctrl["max"] as number) ?? 100, (v) =>
        {
            ctrl["max"] = v;
            this.mutateConfig();
        });

        this.addNumberField("Step", (ctrl["step"] as number) ?? 1, (v) =>
        {
            ctrl["step"] = v;
            this.mutateConfig();
        });

        this.addTextField("Suffix", (ctrl["suffix"] as string) || "", (v) =>
        {
            ctrl["suffix"] = v || undefined;
            this.mutateConfig();
        });
    }

    /** Render color picker value field. */
    private renderColorProps(ctrl: Record<string, unknown>): void
    {
        this.addTextField("Value", (ctrl["value"] as string) || "#000000", (v) =>
        {
            ctrl["value"] = v;
            this.mutateConfig();
        });
    }

    /** Render checked state for checkbox/toggle types. */
    private renderCheckedProps(ctrl: Record<string, unknown>): void
    {
        this.addCheckboxField("Checked", (ctrl["checked"] as boolean) || false, (v) =>
        {
            ctrl["checked"] = v;
            this.mutateConfig();
        });
    }

    /** Render label text field. */
    private renderLabelProps(ctrl: Record<string, unknown>): void
    {
        this.addTextField("Text", (ctrl["text"] as string) || "", (v) =>
        {
            ctrl["text"] = v || undefined;
            this.mutateConfig();
        });
    }

    /** Render component picker property fields. */
    private renderComponentProps(ctrl: Record<string, unknown>): void
    {
        this.addReadonlyField("Component",
            (ctrl["componentType"] as string) || "unknown");

        this.addTextField("Width", (ctrl["width"] as string) || "", (v) =>
        {
            ctrl["width"] = v || undefined;
            this.mutateConfig();
        });

        const opts = ctrl["componentOptions"] as Record<string, unknown> || {};
        const optsJson = JSON.stringify(opts, null, 2);

        this.addTextAreaField("Component Options (JSON)", optsJson, (v) =>
        {
            try
            {
                ctrl["componentOptions"] = JSON.parse(v);
                this.mutateConfig();
            }
            catch (err)
            {
                logWarn("invalid component options JSON:", err);
            }
        });
    }

    // ========================================================================
    // S10a: PROPERTY FIELD HELPERS
    // ========================================================================

    /** Add a text input field to the properties panel. */
    private addTextField(
        label: string, value: string, onChange: (v: string) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);

        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const input = document.createElement("input");
        input.type = "text";
        input.className = `${CLS}-props-input`;
        input.value = value;

        input.addEventListener("change", () => onChange(input.value));

        row.appendChild(labelEl);
        row.appendChild(input);
        this.propsEl.appendChild(row);
    }

    /** Add a read-only display field. */
    private addReadonlyField(label: string, value: string): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const valueEl = createElement("span", [`${CLS}-props-readonly`], value);

        row.appendChild(labelEl);
        row.appendChild(valueEl);
        this.propsEl.appendChild(row);
    }

    /** Add a number input field. */
    private addNumberField(
        label: string, value: number, onChange: (v: number) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const input = document.createElement("input");
        input.type = "number";
        input.className = `${CLS}-props-input`;
        input.value = String(value);

        input.addEventListener("change", () =>
        {
            onChange(parseFloat(input.value) || 0);
        });

        row.appendChild(labelEl);
        row.appendChild(input);
        this.propsEl.appendChild(row);
    }

    /** Add a select dropdown field. */
    private addSelectField(
        label: string, value: string, options: string[],
        onChange: (v: string) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const select = document.createElement("select");
        select.className = `${CLS}-props-input`;

        for (const opt of options)
        {
            const optEl = document.createElement("option");
            optEl.value = opt;
            optEl.textContent = opt;
            optEl.selected = (opt === value);
            select.appendChild(optEl);
        }

        select.addEventListener("change", () => onChange(select.value));

        row.appendChild(labelEl);
        row.appendChild(select);
        this.propsEl.appendChild(row);
    }

    /** Add a checkbox field. */
    private addCheckboxField(
        label: string, checked: boolean, onChange: (v: boolean) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`, `${CLS}-props-field--check`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = `${CLS}-props-checkbox`;
        input.checked = checked;

        input.addEventListener("change", () => onChange(input.checked));

        row.appendChild(labelEl);
        row.appendChild(input);
        this.propsEl.appendChild(row);
    }

    /** Add a text area field. */
    private addTextAreaField(
        label: string, value: string, onChange: (v: string) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);
        const textarea = document.createElement("textarea");
        textarea.className = `${CLS}-props-textarea`;
        textarea.value = value;
        textarea.rows = 4;

        textarea.addEventListener("change", () => onChange(textarea.value));

        row.appendChild(labelEl);
        row.appendChild(textarea);
        this.propsEl.appendChild(row);
    }

    /** Add an icon field with picker trigger. */
    private addIconField(
        label: string, value: string, onChange: (v: string) => void
    ): void
    {
        const row = createElement("div", [`${CLS}-props-field`]);
        const labelEl = createElement("label", [`${CLS}-props-label`], label);

        const inputWrap = createElement("div", [`${CLS}-icon-input-wrap`]);

        const input = document.createElement("input");
        input.type = "text";
        input.className = `${CLS}-props-input`;
        input.value = value;
        input.placeholder = "bi bi-icon-name";

        input.addEventListener("change", () => onChange(input.value));

        const pickerBtn = createElement("button", [`${CLS}-icon-pick-btn`]);
        setAttr(pickerBtn, { type: "button", title: "Pick icon" });
        const pickerIcon = createElement("i", ["bi", "bi-grid-3x3-gap"]);
        pickerBtn.appendChild(pickerIcon);

        pickerBtn.addEventListener("click", () =>
        {
            this.activeIconField = true;
            this.showIconPicker(input, onChange);
        });

        inputWrap.appendChild(input);
        inputWrap.appendChild(pickerBtn);

        row.appendChild(labelEl);
        row.appendChild(inputWrap);
        this.propsEl.appendChild(row);
    }

    /** Format dropdown options for textarea display. */
    private formatDropdownOptions(ctrl: Record<string, unknown>): string
    {
        const options = ctrl["options"] as { value: string; label: string }[] || [];

        return options
            .map((o) => `${o.value}:${o.label}`)
            .join("\n");
    }

    /** Parse dropdown options from textarea text. */
    private parseDropdownOptions(
        text: string
    ): { value: string; label: string }[]
    {
        return text
            .split("\n")
            .filter((line) => line.trim().length > 0)
            .map((line) =>
            {
                const colonIndex = line.indexOf(":");
                if (colonIndex < 0)
                {
                    return { value: line.trim(), label: line.trim() };
                }
                return {
                    value: line.substring(0, colonIndex).trim(),
                    label: line.substring(colonIndex + 1).trim(),
                };
            });
    }

    // ========================================================================
    // S11: ICON PICKER
    // ========================================================================

    /** Initialize SymbolPicker once (stays visible, toggled via enable/disable). */
    private initSymbolPicker(): void
    {
        if (this.symbolPickerInstance) { return; }

        const win = window as unknown as Record<string, unknown>;

        if (typeof win["createSymbolPicker"] !== "function")
        {
            this.symbolPickerHostEl.style.display = "none";
            return;
        }

        const containerId = `${CLS}-symbolpicker-host-${this.instanceId}`;
        this.symbolPickerHostEl.id = containerId;

        try
        {
            const opts = this.buildSymbolPickerOpts();
            this.symbolPickerInstance =
                (win["createSymbolPicker"] as Function)(
                    containerId, opts
                ) as Record<string, Function>;
        }
        catch (err)
        {
            logWarn("SymbolPicker init failed:", err);
            this.symbolPickerHostEl.style.display = "none";
        }
    }

    /** Build SymbolPicker configuration object. */
    private buildSymbolPickerOpts(): Record<string, unknown>
    {
        return {
            mode: "icons",
            inline: true,
            showRecent: true,
            showPreview: false,
            showSearch: true,
            size: "sm",
            disabled: true,
            onSelect: (sym: Record<string, string>) =>
            {
                this.handleSymbolSelect(sym);
            },
            onInsert: (sym: Record<string, string>) =>
            {
                this.handleSymbolInsert(sym);
            },
        };
    }

    /** Handle SymbolPicker single-click (preview in input). */
    private handleSymbolSelect(sym: Record<string, string>): void
    {
        if (!this.activeIconInput) { return; }
        this.activeIconInput.value = this.buildFullIconClass(
            sym["char"] || ""
        );
    }

    /** Handle SymbolPicker double-click / Insert (commit + disable). */
    private handleSymbolInsert(sym: Record<string, string>): void
    {
        if (!this.activeIconInput || !this.activeIconOnChange) { return; }
        const cls = this.buildFullIconClass(sym["char"] || "");
        this.activeIconInput.value = cls;
        this.activeIconOnChange(cls);
        this.hideIconPicker();
    }

    /** Show the icon picker in a modal overlay. */
    private showIconPicker(
        input: HTMLInputElement,
        onChange: (v: string) => void
    ): void
    {
        if (this.symbolPickerInstance)
        {
            this.activeIconInput = input;
            this.activeIconOnChange = onChange;
            this.symbolPickerInstance["enable"]();
            this.symbolPickerHostEl.style.display = "";
            this.symbolPickerOverlay.style.display = "";
            this.iconPickerEl.style.display = "none";
            this.iconPickerEl.innerHTML = "";
            return;
        }

        // Fallback: curated BI-only picker
        this.iconPickerEl.style.display = "";
        this.iconPickerEl.innerHTML = "";
        this.buildIconPickerHeader(input, onChange);
        this.buildIconPickerGrid("", null, input, onChange);
    }

    /** Hide the icon picker (curated fallback) or deactivate SymbolPicker. */
    private hideIconPicker(): void
    {
        this.deactivateIconPicker();
        this.symbolPickerOverlay.style.display = "none";
        this.symbolPickerHostEl.style.display = "none";
        this.iconPickerEl.style.display = "none";
        this.iconPickerEl.innerHTML = "";
    }

    /** Deactivate the persistent SymbolPicker (disable, clear refs). */
    private deactivateIconPicker(): void
    {
        this.activeIconInput = null;
        this.activeIconOnChange = null;

        if (this.symbolPickerInstance)
        {
            try { this.symbolPickerInstance["disable"](); }
            catch (err)
            {
                logWarn("SymbolPicker disable error:", err);
            }
        }
    }

    /** Destroy the SymbolPicker instance permanently (used in destroy()). */
    private destroySymbolPicker(): void
    {
        if (this.symbolPickerInstance)
        {
            try { this.symbolPickerInstance["destroy"](); }
            catch (err)
            {
                logWarn("SymbolPicker destroy error:", err);
            }
            this.symbolPickerInstance = null;
        }

        this.activeIconInput = null;
        this.activeIconOnChange = null;
    }

    /** Build full CSS icon class from a SymbolItem char value. */
    private buildFullIconClass(char: string): string
    {
        if (char.startsWith("fa-"))
        {
            return `fa-solid ${char}`;
        }
        if (char.startsWith("bi-"))
        {
            return `bi ${char}`;
        }

        return char;
    }

    /** Build icon picker search + category filter header. */
    private buildIconPickerHeader(
        input: HTMLInputElement,
        onChange: (v: string) => void
    ): void
    {
        const header = createElement("div", [`${CLS}-iconpicker-header`]);

        const searchInput = document.createElement("input");
        searchInput.type = "text";
        searchInput.className = `${CLS}-iconpicker-search`;
        searchInput.placeholder = "Search icons...";

        let activeCategory: string | null = null;

        const catBar = this.buildCategoryBar((catId) =>
        {
            activeCategory = catId;
            this.buildIconPickerGrid(searchInput.value, activeCategory, input, onChange);
        });

        searchInput.addEventListener("input", () =>
        {
            this.buildIconPickerGrid(searchInput.value, activeCategory, input, onChange);
        });

        header.appendChild(searchInput);
        header.appendChild(catBar);
        this.iconPickerEl.appendChild(header);
    }

    /** Build category filter button bar for icon picker. */
    private buildCategoryBar(onSelect: (catId: string | null) => void): HTMLElement
    {
        const bar = createElement("div", [`${CLS}-iconpicker-cats`]);

        const allBtn = createElement("button", [`${CLS}-iconpicker-cat`, `${CLS}-iconpicker-cat--active`], "All");
        setAttr(allBtn, { type: "button", "data-cat": "" });
        bar.appendChild(allBtn);

        for (const cat of ICON_CATEGORIES)
        {
            const btn = createElement("button", [`${CLS}-iconpicker-cat`], cat.label);
            setAttr(btn, { type: "button", "data-cat": cat.id });
            bar.appendChild(btn);
        }

        bar.addEventListener("click", (e) =>
        {
            const target = (e.target as HTMLElement).closest(`.${CLS}-iconpicker-cat`) as HTMLElement | null;

            if (!target)
            {
                return;
            }

            bar.querySelectorAll(`.${CLS}-iconpicker-cat`).forEach((b) =>
            {
                b.classList.remove(`${CLS}-iconpicker-cat--active`);
            });
            target.classList.add(`${CLS}-iconpicker-cat--active`);
            onSelect(target.getAttribute("data-cat") || null);
        });

        return bar;
    }

    /** Build or rebuild the icon grid based on filters. */
    private buildIconPickerGrid(
        searchTerm: string,
        categoryId: string | null,
        input: HTMLInputElement,
        onChange: (v: string) => void
    ): void
    {
        const existingGrid = this.iconPickerEl.querySelector(`.${CLS}-iconpicker-grid`);

        if (existingGrid)
        {
            existingGrid.remove();
        }

        const grid = createElement("div", [`${CLS}-iconpicker-grid`]);
        const lowerSearch = searchTerm.toLowerCase();

        const categories = categoryId
            ? ICON_CATEGORIES.filter((c) => c.id === categoryId)
            : ICON_CATEGORIES;

        for (const cat of categories)
        {
            for (const iconName of cat.icons)
            {
                if (lowerSearch && !iconName.toLowerCase().includes(lowerSearch))
                {
                    continue;
                }

                const cell = this.createIconCell(iconName, input, onChange);
                grid.appendChild(cell);
            }
        }

        if (grid.children.length === 0)
        {
            const empty = createElement("div", [`${CLS}-iconpicker-empty`], "No icons found");
            grid.appendChild(empty);
        }

        this.iconPickerEl.appendChild(grid);
    }

    /** Create a single icon cell in the picker grid. */
    private createIconCell(
        iconName: string,
        input: HTMLInputElement,
        onChange: (v: string) => void
    ): HTMLElement
    {
        const cell = createElement("button", [`${CLS}-iconpicker-cell`]);
        setAttr(cell, { type: "button", title: iconName });

        const icon = createElement("i", ["bi", iconName]);
        cell.appendChild(icon);

        cell.addEventListener("click", () =>
        {
            const fullClass = `bi ${iconName}`;
            input.value = fullClass;
            onChange(fullClass);
        });

        return cell;
    }

    // ========================================================================
    // S12: CONFIG MUTATIONS
    // ========================================================================

    /** Central mutation handler: refreshes all UI after config change. */
    private mutateConfig(): void
    {
        this.renderTree();
        this.renderProperties();
        this.schedulePreviewRefresh();

        if (this.opts.onChange)
        {
            try
            {
                this.opts.onChange(this.getConfig());
            }
            catch (err)
            {
                logError("onChange callback error:", err);
            }
        }
    }

    /** Add a new tab to the config. */
    private addTab(): void
    {
        const idx = this.config.tabs.length;
        const id = `tab-${idx + 1}`;

        const newTab: RibbonTab = {
            id,
            label: `Tab ${idx + 1}`,
            groups: [],
        };

        this.config.tabs.push(newTab);

        const nodeKey = `tab-${idx}`;
        this.expandedNodes.add(nodeKey);

        this.selectedNode = { kind: "tab", tabIndex: idx };
        this.mutateConfig();

        logInfo("added tab:", id);
    }

    /** Add a new group to the selected tab. */
    private addGroup(): void
    {
        const tabIndex = this.resolveTargetTabIndex();

        if (tabIndex < 0)
        {
            this.showNoSelectionWarning("Select a tab first");
            return;
        }

        const tab = this.config.tabs[tabIndex];
        const gi = tab.groups.length;
        const id = `${tab.id}-group-${gi + 1}`;

        const newGroup: RibbonGroup = {
            id,
            label: `Group ${gi + 1}`,
            controls: [],
            collapsePriority: 50,
        };

        tab.groups.push(newGroup);

        const tabKey = `tab-${tabIndex}`;
        const groupKey = `group-${tabIndex}-${gi}`;
        this.expandedNodes.add(tabKey);
        this.expandedNodes.add(groupKey);

        this.selectedNode = { kind: "group", tabIndex, groupIndex: gi };
        this.mutateConfig();

        logInfo("added group:", id);
    }

    /** Add a new control of the given type. */
    private addControl(type: RibbonControlType): void
    {
        const target = this.resolveTargetGroup();

        if (!target)
        {
            this.showNoSelectionWarning("Select a group or control first");
            return;
        }

        const { tabIndex, groupIndex, insertIndex } = target;
        const group = this.config.tabs[tabIndex].groups[groupIndex];
        const id = `${group.id}-${type}-${group.controls.length + 1}`;

        const newControl = this.createDefaultControl(type, id);
        group.controls.splice(insertIndex, 0, newControl);

        const tabKey = `tab-${tabIndex}`;
        const groupKey = `group-${tabIndex}-${groupIndex}`;
        this.expandedNodes.add(tabKey);
        this.expandedNodes.add(groupKey);

        this.selectedNode = {
            kind: "control",
            tabIndex,
            groupIndex,
            controlIndex: insertIndex,
        };

        this.mutateConfig();
        logInfo("added control:", id);
    }

    /** Add a component picker control. */
    private addComponentControl(
        componentType: ComponentType, factory: string
    ): void
    {
        const target = this.resolveTargetGroup();

        if (!target)
        {
            this.showNoSelectionWarning("Select a group or control first");
            return;
        }

        const { tabIndex, groupIndex, insertIndex } = target;
        const group = this.config.tabs[tabIndex].groups[groupIndex];
        const id = `${group.id}-${componentType}-${group.controls.length + 1}`;

        const newControl = this.createComponentDefault(componentType, factory, id);
        group.controls.splice(insertIndex, 0, newControl);

        const tabKey = `tab-${tabIndex}`;
        const groupKey = `group-${tabIndex}-${groupIndex}`;
        this.expandedNodes.add(tabKey);
        this.expandedNodes.add(groupKey);

        this.selectedNode = {
            kind: "control",
            tabIndex,
            groupIndex,
            controlIndex: insertIndex,
        };

        this.mutateConfig();
        logInfo("added component control:", id);
    }

    /** Component type → display label. */
    private static readonly COMPONENT_LABELS: Record<string, string> =
    {
        "color-picker": "Color", "font-dropdown": "Font",
        "line-width-picker": "Width", "line-type-picker": "Type",
        "line-shape-picker": "Shape", "line-ending-picker": "Ending",
        "angle-picker": "Angle", "slider": "Slider",
        "date-picker": "Date", "time-picker": "Time",
        "duration-picker": "Duration", "timezone-picker": "Timezone",
        "editable-combobox": "ComboBox", "search-box": "Search",
        "symbol-picker": "Symbols",
        "orientation-picker": "Orientation",
        "sizes-picker": "Sizes",
        "margins-picker": "Margins",
        "tool-color-picker": "Colors",
        "columns-picker": "Columns",
        "spacing-picker": "Spacing",
        "layout-picker": "Layout",
    };

    /** Component type → fixed width override. */
    private static readonly COMPONENT_WIDTHS: Record<string, string> =
    {
        "font-dropdown": "120px", "slider": "100px",
        "search-box": "100px", "editable-combobox": "100px",
        "date-picker": "100px", "time-picker": "80px",
        "duration-picker": "100px", "timezone-picker": "100px",
    };

    /** Create a default component picker control. */
    private createComponentDefault(
        componentType: ComponentType, factory: string, id: string
    ): RibbonControlBase
    {
        const ctrl: RibbonControlBase = {
            type: "component",
            id,
            label: RibbonBuilderImpl.COMPONENT_LABELS[componentType] || componentType,
            size: "small",
        };
        const anyCtrl = ctrl as unknown as Record<string, unknown>;
        anyCtrl["componentType"] = componentType;
        anyCtrl["componentFactory"] = factory;
        anyCtrl["componentOptions"] = this.getDefaultComponentOptions(componentType);
        const w = RibbonBuilderImpl.COMPONENT_WIDTHS[componentType];
        if (w) { anyCtrl["width"] = w; }
        return ctrl;
    }

    /** Default options map for each component type. */
    private static readonly COMPONENT_DEFAULTS: Record<string, Record<string, unknown>> =
    {
        "color-picker":       { value: "#3B82F6", size: "mini" },
        "font-dropdown":      { size: "mini", placeholder: "Font..." },
        "line-width-picker":  { value: 2, size: "mini" },
        "line-type-picker":   { value: "solid", size: "mini" },
        "line-shape-picker":  { value: "straight", size: "mini" },
        "line-ending-picker": { value: "classic", size: "mini" },
        "angle-picker":       { value: 225, mode: "dropdown", size: "mini" },
        "slider":             { value: 50, size: "mini", showValue: true },
        "date-picker":        { size: "mini" },
        "time-picker":        { size: "mini" },
        "duration-picker":    { size: "mini" },
        "timezone-picker":    { size: "mini" },
        "editable-combobox":  { placeholder: "Select...", size: "mini", items: [{ label: "Option 1" }, { label: "Option 2" }, { label: "Option 3" }] },
        "search-box":         { placeholder: "Search...", size: "mini" },
        "symbol-picker":      { mode: "icons", size: "mini" },
        "orientation-picker": { value: "portrait", size: "mini" },
        "sizes-picker":       { value: "Letter", size: "mini" },
        "margins-picker":     { value: "Normal", size: "mini" },
        "tool-color-picker":  { tool: "pen", layout: "row", size: "mini" },
        "columns-picker":     { value: 1, size: "mini" },
        "spacing-picker":     { value: 1.15, size: "mini" },
        "layout-picker":      { value: "elk-layered-tb", ribbonMode: true, size: "mini" },
    };

    /** Get sensible default options for each component type. */
    private getDefaultComponentOptions(
        componentType: ComponentType
    ): Record<string, unknown>
    {
        const defaults = RibbonBuilderImpl.COMPONENT_DEFAULTS[componentType];
        return defaults ? { ...defaults } : {};
    }

    /** Create a default control with sensible defaults. */
    private createDefaultControl(
        type: RibbonControlType, id: string
    ): RibbonControlBase
    {
        const base: RibbonControlBase = {
            type,
            id,
            label: this.getDefaultLabel(type),
            icon: "bi bi-circle",
            size: "small",
        };

        return this.addTypeSpecificDefaults(base);
    }

    /** Get a default label for a control type. */
    private getDefaultLabel(type: RibbonControlType): string
    {
        const labels: Record<string, string> = {
            "button": "New Button",
            "split-button": "New Split",
            "dropdown": "New Dropdown",
            "input": "New Input",
            "color": "Color",
            "number": "Number",
            "checkbox": "Check",
            "toggle": "Toggle",
            "gallery": "Gallery",
            "separator": "",
            "row-break": "",
            "label": "Label",
            "component": "Component",
        };

        return labels[type] || type;
    }

    /** Add type-specific default properties. */
    private addTypeSpecificDefaults(ctrl: RibbonControlBase): RibbonControlBase
    {
        const anyCtrl = ctrl as unknown as Record<string, unknown>;
        const type = ctrl.type;

        if (type === "dropdown")
        {
            this.applyDropdownDefaults(anyCtrl);
        }
        else if (type === "number")
        {
            Object.assign(anyCtrl, { value: 0, min: 0, max: 100, step: 1 });
        }
        else if (type === "color")
        {
            anyCtrl["value"] = "#000000";
        }
        else if (type === "split-button")
        {
            this.applySplitButtonDefaults(anyCtrl, ctrl.id);
        }
        else if (type === "gallery")
        {
            this.applyGalleryDefaults(anyCtrl);
        }
        else if (type === "separator" || type === "row-break")
        {
            ctrl.label = undefined;
            ctrl.icon = undefined;
        }

        return ctrl;
    }

    /** Apply default options and width for a new dropdown control. */
    private applyDropdownDefaults(ctrl: Record<string, unknown>): void
    {
        ctrl["options"] = [
            { value: "opt1", label: "Option 1" },
            { value: "opt2", label: "Option 2" },
        ];
        ctrl["width"] = "100px";
    }

    /** Apply default menu items for a new split-button control. */
    private applySplitButtonDefaults(
        ctrl: Record<string, unknown>, id: string
    ): void
    {
        ctrl["menuItems"] = [
            { id: `${id}-item-1`, label: "Option 1" },
            { id: `${id}-item-2`, label: "Option 2" },
        ];
    }

    /** Apply default gallery options. */
    private applyGalleryDefaults(ctrl: Record<string, unknown>): void
    {
        ctrl["options"] = [
            { id: "g1", label: "Item 1" },
            { id: "g2", label: "Item 2" },
        ];
        ctrl["columns"] = 4;
    }

    /** Resolve which tab index to add a group to. */
    private resolveTargetTabIndex(): number
    {
        if (!this.selectedNode)
        {
            if (this.config.tabs.length > 0)
            {
                return 0;
            }
            return -1;
        }

        return this.selectedNode.tabIndex;
    }

    /** Resolve target group for adding a control. */
    private resolveTargetGroup(): {
        tabIndex: number;
        groupIndex: number;
        insertIndex: number;
    } | null
    {
        if (!this.selectedNode)
        {
            return this.findFirstGroup();
        }

        const ref = this.selectedNode;

        if (ref.kind === "control" &&
            ref.groupIndex !== undefined &&
            ref.controlIndex !== undefined)
        {
            return {
                tabIndex: ref.tabIndex,
                groupIndex: ref.groupIndex,
                insertIndex: ref.controlIndex + 1,
            };
        }

        if (ref.kind === "group" && ref.groupIndex !== undefined)
        {
            const group = this.config.tabs[ref.tabIndex].groups[ref.groupIndex];
            return {
                tabIndex: ref.tabIndex,
                groupIndex: ref.groupIndex,
                insertIndex: group.controls.length,
            };
        }

        if (ref.kind === "tab")
        {
            const tab = this.config.tabs[ref.tabIndex];

            if (tab.groups.length === 0)
            {
                return null;
            }

            return {
                tabIndex: ref.tabIndex,
                groupIndex: 0,
                insertIndex: tab.groups[0].controls.length,
            };
        }

        return null;
    }

    /** Find the first available group in the config. */
    private findFirstGroup(): {
        tabIndex: number;
        groupIndex: number;
        insertIndex: number;
    } | null
    {
        for (let ti = 0; ti < this.config.tabs.length; ti++)
        {
            if (this.config.tabs[ti].groups.length > 0)
            {
                return {
                    tabIndex: ti,
                    groupIndex: 0,
                    insertIndex: this.config.tabs[ti].groups[0].controls.length,
                };
            }
        }

        return null;
    }

    /** Remove the currently selected node from the config. */
    private removeSelectedNode(): void
    {
        if (!this.selectedNode)
        {
            return;
        }

        const ref = this.selectedNode;

        if (ref.kind === "tab")
        {
            this.config.tabs.splice(ref.tabIndex, 1);
        }
        else if (ref.kind === "group" && ref.groupIndex !== undefined)
        {
            this.config.tabs[ref.tabIndex].groups.splice(ref.groupIndex, 1);
        }
        else if (ref.kind === "control" &&
                 ref.groupIndex !== undefined &&
                 ref.controlIndex !== undefined)
        {
            this.config.tabs[ref.tabIndex]
                .groups[ref.groupIndex]
                .controls.splice(ref.controlIndex, 1);
        }

        this.selectedNode = null;
        this.mutateConfig();

        logInfo("removed node");
    }

    /** Show a tooltip-style warning near the toolbar. */
    private showNoSelectionWarning(message: string): void
    {
        logWarn(message);

        const existing = this.rootEl.querySelector(`.${CLS}-warning`);

        if (existing)
        {
            existing.remove();
        }

        const warning = createElement("div", [`${CLS}-warning`], message);
        this.toolbarEl.appendChild(warning);

        setTimeout(() => warning.remove(), 2000);
    }

    // ========================================================================
    // S12a: CONTROL TYPE DROPDOWN MENU
    // ========================================================================

    /** Show the control type selection dropdown. */
    private showControlTypeMenu(anchorBtn: HTMLElement): void
    {
        this.dismissControlTypeMenu();

        const menu = createElement("div", [`${CLS}-control-menu`]);

        for (const ct of CONTROL_TYPES)
        {
            const item = createElement("button", [`${CLS}-control-menu-item`], ct.label);
            setAttr(item, { type: "button" });
            item.addEventListener("click", () =>
            {
                this.addControl(ct.type);
                this.dismissControlTypeMenu();
            });
            menu.appendChild(item);
        }

        // Component Pickers section
        const sep = createElement("div", [`${CLS}-control-menu-separator`]);
        menu.appendChild(sep);
        const header = createElement("div", [`${CLS}-control-menu-header`], "Component Pickers");
        menu.appendChild(header);

        for (const cp of COMPONENT_PICKER_TYPES)
        {
            const item = createElement("button", [`${CLS}-control-menu-item`], cp.label);
            setAttr(item, { type: "button" });
            item.addEventListener("click", () =>
            {
                this.addComponentControl(cp.componentType, cp.factory);
                this.dismissControlTypeMenu();
            });
            menu.appendChild(item);
        }

        this.positionMenuBelowAnchor(menu, anchorBtn);
        this.controlTypeMenuEl = menu;
        this.setupClickAwayDismiss(menu, anchorBtn);
    }

    /** Position a dropdown menu below an anchor button. */
    private positionMenuBelowAnchor(menu: HTMLElement, anchor: HTMLElement): void
    {
        const rect = anchor.getBoundingClientRect();
        const rootRect = this.rootEl.getBoundingClientRect();

        menu.style.position = "absolute";
        menu.style.top = `${rect.bottom - rootRect.top}px`;
        menu.style.left = `${rect.left - rootRect.left}px`;
        this.rootEl.style.position = "relative";
        this.rootEl.appendChild(menu);
    }

    /** Set up click-away dismiss for a dropdown menu. */
    private setupClickAwayDismiss(menu: HTMLElement, anchor: HTMLElement): void
    {
        const handler = (e: MouseEvent) =>
        {
            if (!menu.contains(e.target as Node) && !anchor.contains(e.target as Node))
            {
                this.dismissControlTypeMenu();
                document.removeEventListener("click", handler);
            }
        };

        setTimeout(() => document.addEventListener("click", handler), 0);
    }

    /** Close the control type dropdown menu. */
    private dismissControlTypeMenu(): void
    {
        if (this.controlTypeMenuEl)
        {
            this.controlTypeMenuEl.remove();
            this.controlTypeMenuEl = null;
        }
    }

    // ========================================================================
    // S13: MARKDOWN EXPORT
    // ========================================================================

    /** Generate structured Markdown from the current config. */
    private generateMarkdown(): string
    {
        const lines: string[] = [];

        lines.push("# Ribbon Layout Specification");
        lines.push("> Generated by RibbonBuilder. Use with `createRibbon(config)`.");
        lines.push("");

        for (const tab of this.config.tabs)
        {
            this.generateTabMarkdown(tab, lines);
        }

        this.appendJsonBlock(lines);

        return lines.join("\n");
    }

    /** Generate Markdown for a single tab. */
    private generateTabMarkdown(tab: RibbonTab, lines: string[]): void
    {
        const keyTipStr = tab.keyTip ? `, keyTip: \`${tab.keyTip}\`` : "";
        lines.push(`## Tab: ${tab.label} (id: \`${tab.id}\`${keyTipStr})`);
        lines.push("");

        for (const group of tab.groups)
        {
            this.generateGroupMarkdown(group, lines);
        }
    }

    /** Generate Markdown for a single group. */
    private generateGroupMarkdown(group: RibbonGroup, lines: string[]): void
    {
        const priority = group.collapsePriority ?? 50;
        lines.push(`### Group: ${group.label} (id: \`${group.id}\`, priority: ${priority})`);
        lines.push("");
        lines.push("| # | Type | ID | Label | Icon | Size | Extra |");
        lines.push("|---|------|----|-------|------|------|-------|");

        let num = 0;

        for (const ctrl of group.controls)
        {
            num++;
            lines.push(this.generateControlRow(num, ctrl));
        }

        lines.push("");
    }

    /** Generate a single Markdown table row for a control. */
    private generateControlRow(num: number, ctrl: RibbonControlBase): string
    {
        const type = ctrl.type;
        const id = ctrl.id;
        const label = ctrl.label || "";
        const icon = ctrl.icon || "";
        const size = ctrl.size || "";
        const extra = this.buildExtraColumn(ctrl);

        return `| ${num} | ${type} | ${id} | ${label} | ${icon} | ${size} | ${extra} |`;
    }

    /** Build the Extra column for type-specific properties. */
    private buildExtraColumn(ctrl: RibbonControlBase): string
    {
        const parts: string[] = [];
        const anyCtrl = ctrl as unknown as Record<string, unknown>;

        this.collectBoolExtra(parts, anyCtrl, "toggle");
        this.collectStringExtra(parts, anyCtrl, "width");
        this.collectStringExtra(parts, anyCtrl, "placeholder");
        this.collectNumericExtra(parts, anyCtrl, "min");
        this.collectNumericExtra(parts, anyCtrl, "max");

        if (anyCtrl["step"] !== undefined && anyCtrl["step"] !== 1)
        {
            parts.push(`step: ${anyCtrl["step"]}`);
        }

        this.collectStringExtra(parts, anyCtrl, "suffix");

        if (anyCtrl["value"] !== undefined && ctrl.type === "color")
        {
            parts.push(`value: ${anyCtrl["value"]}`);
        }

        this.collectBoolExtra(parts, anyCtrl, "checked");
        this.collectDropdownOptionsExtra(parts, anyCtrl, ctrl.type);

        if (ctrl.type === "component" && anyCtrl["componentType"])
        {
            parts.push(`component: ${anyCtrl["componentType"]}`);
        }

        return parts.join("; ");
    }

    /** Collect a truthy boolean property for the Extra column. */
    private collectBoolExtra(
        parts: string[], obj: Record<string, unknown>, key: string
    ): void
    {
        if (obj[key])
        {
            parts.push(`${key}: true`);
        }
    }

    /** Collect a string property for the Extra column. */
    private collectStringExtra(
        parts: string[], obj: Record<string, unknown>, key: string
    ): void
    {
        if (obj[key])
        {
            parts.push(`${key}: ${obj[key]}`);
        }
    }

    /** Collect a numeric property for the Extra column. */
    private collectNumericExtra(
        parts: string[], obj: Record<string, unknown>, key: string
    ): void
    {
        if (obj[key] !== undefined)
        {
            parts.push(`${key}: ${obj[key]}`);
        }
    }

    /** Collect dropdown options for the Extra column. */
    private collectDropdownOptionsExtra(
        parts: string[], obj: Record<string, unknown>, type: string
    ): void
    {
        if (Array.isArray(obj["options"]) && type === "dropdown")
        {
            const opts = (obj["options"] as { value: string; label: string }[])
                .map((o) => o.label).join(", ");
            parts.push(`options: ${opts}`);
        }
    }

    /** Append a raw JSON block at the end of the Markdown. */
    private appendJsonBlock(lines: string[]): void
    {
        lines.push("---");
        lines.push("");
        lines.push("## JSON Configuration");
        lines.push("");
        lines.push("```json");
        lines.push(JSON.stringify(this.config, null, 2));
        lines.push("```");
    }

    // ========================================================================
    // S14: KEYBOARD NAVIGATION
    // ========================================================================

    /** Handle keydown events on the root element. */
    private handleKeydown(e: KeyboardEvent): void
    {
        if (e.key === "Delete" || e.key === "Backspace")
        {
            if (this.isInputFocused())
            {
                return;
            }

            e.preventDefault();
            this.removeSelectedNode();
            return;
        }

        if (e.key === "F2")
        {
            e.preventDefault();
            this.focusLabelInput();
            return;
        }

        if (e.key === "ArrowDown" || e.key === "ArrowUp")
        {
            if (this.isInputFocused())
            {
                return;
            }

            e.preventDefault();
            this.moveSelection(e.key === "ArrowDown" ? 1 : -1);
        }
    }

    /** Check if an input/textarea is currently focused. */
    private isInputFocused(): boolean
    {
        const active = document.activeElement;

        if (!active)
        {
            return false;
        }

        const tag = active.tagName.toLowerCase();
        return (tag === "input" || tag === "textarea" || tag === "select");
    }

    /** Focus the Label input in the properties panel. */
    private focusLabelInput(): void
    {
        const inputs = this.propsEl.querySelectorAll(`.${CLS}-props-input`);

        if (inputs.length >= 1)
        {
            (inputs[0] as HTMLInputElement).focus();
            (inputs[0] as HTMLInputElement).select();
        }
    }

    /** Move tree selection up or down by delta. */
    private moveSelection(delta: number): void
    {
        const allRefs = this.collectVisibleRefs();

        if (allRefs.length === 0)
        {
            return;
        }

        let currentIndex = -1;

        if (this.selectedNode)
        {
            currentIndex = allRefs.findIndex((r) => this.refsEqual(r, this.selectedNode!));
        }

        let nextIndex = currentIndex + delta;
        nextIndex = Math.max(0, Math.min(nextIndex, allRefs.length - 1));

        this.selectNode(allRefs[nextIndex]);
    }

    /** Collect all visible tree node refs in display order. */
    private collectVisibleRefs(): TreeNodeRef[]
    {
        const refs: TreeNodeRef[] = [];

        for (let ti = 0; ti < this.config.tabs.length; ti++)
        {
            refs.push({ kind: "tab", tabIndex: ti });

            if (this.expandedNodes.has(`tab-${ti}`))
            {
                this.collectGroupRefs(ti, refs);
            }
        }

        return refs;
    }

    /** Collect visible group and control refs for a tab. */
    private collectGroupRefs(ti: number, refs: TreeNodeRef[]): void
    {
        const groups = this.config.tabs[ti].groups;

        for (let gi = 0; gi < groups.length; gi++)
        {
            refs.push({ kind: "group", tabIndex: ti, groupIndex: gi });

            if (!this.expandedNodes.has(`group-${ti}-${gi}`))
            {
                continue;
            }

            for (let ci = 0; ci < groups[gi].controls.length; ci++)
            {
                refs.push({ kind: "control", tabIndex: ti, groupIndex: gi, controlIndex: ci });
            }
        }
    }

    // ========================================================================
    // S14a: TREE PANEL RESIZE
    // ========================================================================

    /** Start pointer-based tree panel resize. */
    private startTreeResize(
        e: PointerEvent, divider: HTMLElement
    ): void
    {
        e.preventDefault();
        this.treeResizing = true;
        divider.setPointerCapture(e.pointerId);

        const startX = e.clientX;
        const startWidth = this.currentTreeWidth;

        const onMove = (ev: PointerEvent) =>
        {
            if (!this.treeResizing)
            {
                return;
            }

            const delta = ev.clientX - startX;
            const newWidth = Math.max(160, Math.min(500, startWidth + delta));
            this.currentTreeWidth = newWidth;
            this.treeEl.style.width = `${newWidth}px`;
        };

        const onUp = () =>
        {
            this.treeResizing = false;
            divider.removeEventListener("pointermove", onMove);
            divider.removeEventListener("pointerup", onUp);
        };

        divider.addEventListener("pointermove", onMove);
        divider.addEventListener("pointerup", onUp);
    }

    // ========================================================================
    // S15: EXPORT / IMPORT HANDLERS
    // ========================================================================

    /** Handle Export MD button click. */
    private handleExportMarkdown(): void
    {
        const md = this.exportMarkdown();
        this.showExportDialog("Markdown Export", md);

        if (this.opts.onExport)
        {
            try
            {
                this.opts.onExport(md);
            }
            catch (err)
            {
                logError("onExport callback error:", err);
            }
        }
    }

    /** Handle Export JSON button click. */
    private handleExportJSON(): void
    {
        const json = this.exportJSON();
        this.showExportDialog("JSON Export", json);
    }

    /** Handle Import JSON button click. */
    private handleImportJSON(): void
    {
        const overlay = this.createImportOverlay();
        this.rootEl.appendChild(overlay);
    }

    /** Build the shared modal shell (overlay + dialog + header + textarea). */
    private buildModalShell(
        title: string
    ): { overlay: HTMLElement; dialog: HTMLElement; textarea: HTMLTextAreaElement }
    {
        const overlay = createElement("div", [`${CLS}-export-overlay`]);
        const dialog = createElement("div", [`${CLS}-export-dialog`]);

        const header = createElement("div", [`${CLS}-export-header`]);
        const titleEl = createElement("h3", [], title);
        const closeBtn = createElement("button", [`${CLS}-export-close`]);
        setAttr(closeBtn, { type: "button" });
        closeBtn.textContent = "\u00D7";
        closeBtn.addEventListener("click", () => overlay.remove());

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        const textarea = document.createElement("textarea");
        textarea.className = `${CLS}-export-content`;
        textarea.rows = 20;

        dialog.appendChild(header);
        dialog.appendChild(textarea);
        overlay.appendChild(dialog);

        overlay.addEventListener("click", (e) =>
        {
            if (e.target === overlay)
            {
                overlay.remove();
            }
        });

        return { overlay, dialog, textarea };
    }

    /** Show an export dialog with copyable text. */
    private showExportDialog(title: string, content: string): void
    {
        const { overlay, dialog, textarea } = this.buildModalShell(title);

        textarea.value = content;
        textarea.readOnly = true;

        const copyBtn = createElement("button", [`${CLS}-export-copy`], "Copy to Clipboard");
        setAttr(copyBtn, { type: "button" });
        copyBtn.addEventListener("click", () => this.copyToClipboard(content, copyBtn));

        dialog.appendChild(copyBtn);
        this.rootEl.appendChild(overlay);
    }

    /** Copy text to clipboard and update button label. */
    private copyToClipboard(content: string, btn: HTMLElement): void
    {
        navigator.clipboard.writeText(content).then(() =>
        {
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = "Copy to Clipboard"; }, 1500);
        }).catch(() =>
        {
            btn.textContent = "Copied!";
        });
    }

    /** Create the import JSON overlay with textarea. */
    private createImportOverlay(): HTMLElement
    {
        const { overlay, dialog, textarea } = this.buildModalShell("Import JSON");

        textarea.placeholder = "Paste Ribbon JSON configuration here...";

        const importBtn = createElement("button", [`${CLS}-export-copy`], "Import");
        setAttr(importBtn, { type: "button" });
        importBtn.addEventListener("click", () =>
        {
            this.importJSON(textarea.value);
            overlay.remove();
        });

        dialog.appendChild(importBtn);
        return overlay;
    }

    // ========================================================================
    // S16: HELPERS
    // ========================================================================

    /** Build a default config from partial options. */
    private buildDefaultConfig(
        partial?: Partial<RibbonOptions>
    ): RibbonOptions
    {
        if (partial && partial.tabs && partial.tabs.length > 0)
        {
            return JSON.parse(JSON.stringify(partial)) as RibbonOptions;
        }

        return JSON.parse(JSON.stringify(DEFAULT_STARTER_CONFIG));
    }

    /** Resolve a container from an ID or the configured option. */
    private resolveContainer(
        containerId?: string
    ): HTMLElement | null
    {
        if (containerId)
        {
            const el = document.getElementById(containerId);

            if (!el)
            {
                logError("container not found:", containerId);
            }

            return el;
        }

        if (this.opts.container)
        {
            if (typeof this.opts.container === "string")
            {
                const el = document.getElementById(this.opts.container);

                if (!el)
                {
                    logError("container not found:", this.opts.container);
                }

                return el;
            }

            return this.opts.container;
        }

        logError("no container specified");
        return null;
    }
}

// ============================================================================
// S17: FACTORY & WINDOW EXPORTS
// ============================================================================

// @entrypoint
export function createRibbonBuilder(
    options: RibbonBuilderOptions, containerId?: string
): RibbonBuilderHandle
{
    const impl = new RibbonBuilderImpl(options);

    const handle: RibbonBuilderHandle = {
        show: (id?: string) => impl.show(id || containerId),
        destroy: () => impl.destroy(),
        getConfig: () => impl.getConfig(),
        setConfig: (c) => impl.setConfig(c),
        exportMarkdown: () => impl.exportMarkdown(),
        exportJSON: () => impl.exportJSON(),
        importJSON: (j) => impl.importJSON(j),
        getElement: () => impl.getElement(),
    };

    if (containerId)
    {
        handle.show(containerId);
    }

    return handle;
}

(window as unknown as Record<string, unknown>)["RibbonBuilderImpl"] = RibbonBuilderImpl;
(window as unknown as Record<string, unknown>)["createRibbonBuilder"] = createRibbonBuilder;
