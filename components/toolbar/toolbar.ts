/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Toolbar
 * 📜 PURPOSE: Programmable action bar component for grouping tools and actions
 *    into labelled regions. Supports docked/floating modes, horizontal/vertical
 *    orientation, split buttons, gallery controls, overflow, KeyTips, resize,
 *    drag-to-dock, and layout persistence.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[StatusBar]],
 *    [[SidebarPanel]], [[BannerBar]]
 * ⚡ FLOW: [Consumer App] -> [createToolbar()] -> [DOM fixed toolbar]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: TYPES, INTERFACES, CONSTANTS
// ============================================================================

/** Toolbar orientation. */
export type ToolbarOrientation = "horizontal" | "vertical";

/** Toolbar positioning mode. */
export type ToolbarMode = "docked" | "floating";

/** Docking edge. Horizontal: top/bottom. Vertical: left/right. */
export type ToolbarDockPosition = "top" | "bottom" | "left" | "right";

/** Tool button style variant. */
export type ToolStyle = "icon" | "icon-label" | "label";

/** Tool overflow priority. */
export type ToolOverflowPriority = "never" | "high" | "low" | "always";

/** Gallery item layout direction. */
export type GalleryLayout = "grid" | "list";

/** Region alignment within the toolbar.
 *  "left" = leading side (top in vertical). "right" = trailing side (bottom in vertical). */
export type ToolbarRegionAlign = "left" | "right";

/** Toolbar title configuration. Always rendered leftmost, non-interactive. */
export interface ToolbarTitle
{
    /** Display text. */
    text?: string;

    /** Bootstrap Icons class (e.g., "bi-app"). */
    icon?: string;

    /** Background colour (CSS value). */
    backgroundColor?: string;

    /** Text / icon colour (CSS value). */
    color?: string;

    /** Additional CSS class(es). */
    cssClass?: string;

    /** Explicit width (CSS value, e.g. "200px", "12rem").
     *  When set, the title area is given a fixed width rather than
     *  sizing to its content. Useful for branding areas that must
     *  match a sidebar or logo width. */
    width?: string;
}

/** A single tool (action button) within a region. */
export interface ToolItem
{
    /** Unique identifier for this tool. */
    id: string;

    /** Bootstrap Icons class (e.g., "bi-bold"). */
    icon?: string;

    /** Text label (shown beside icon in "icon-label" style). */
    label?: string;

    /** Tooltip text shown on hover. Required for accessibility. */
    tooltip: string;

    /** Display style. Default: inherits from region or toolbar. */
    style?: ToolStyle;

    /** Whether the tool is a toggle (stays pressed). Default: false. */
    toggle?: boolean;

    /** Initial toggle state. Default: false. */
    active?: boolean;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Click handler. Receives the tool item and current active state. */
    onClick?: (tool: ToolItem, active: boolean) => void;

    /** KeyTip letter(s) for keyboard shortcut badge (shown on Alt press). */
    keyTip?: string;

    /** Additional CSS class(es) for the button element. */
    cssClass?: string;

    /** Arbitrary data attached to this tool for consumer use. */
    data?: Record<string, unknown>;
}

/** A split button — primary action button with an attached dropdown arrow. */
export interface SplitButtonItem
{
    /** Must be "split-button" to distinguish from ToolItem. */
    type: "split-button";

    /** Unique identifier for this split button. */
    id: string;

    /** Bootstrap Icons class for the primary button. */
    icon?: string;

    /** Text label for the primary button. */
    label?: string;

    /** Tooltip for the primary button. */
    tooltip: string;

    /** Display style. Default: inherits from region or toolbar. */
    style?: ToolStyle;

    /** Whether the primary button is a toggle. Default: false. */
    toggle?: boolean;

    /** Initial toggle state. Default: false. */
    active?: boolean;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Click handler for the primary button. */
    onClick?: (tool: SplitButtonItem, active: boolean) => void;

    /** Dropdown menu items. */
    menuItems: SplitMenuItem[];

    /** KeyTip letter(s) for keyboard shortcut badge. */
    keyTip?: string;

    /** Additional CSS class(es). */
    cssClass?: string;

    /** Arbitrary consumer data. */
    data?: Record<string, unknown>;
}

/** A single item within a split button's dropdown menu. */
export interface SplitMenuItem
{
    /** Unique identifier. */
    id: string;

    /** Bootstrap Icons class. */
    icon?: string;

    /** Menu item label (required — always shown in dropdown). */
    label: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Click handler. */
    onClick?: (item: SplitMenuItem) => void;
}

/** A gallery control — visual grid/list picker. */
export interface GalleryItem
{
    /** Must be "gallery" to distinguish from ToolItem. */
    type: "gallery";

    /** Unique identifier for this gallery. */
    id: string;

    /** Tooltip for the gallery trigger button. */
    tooltip: string;

    /** Bootstrap Icons class for the collapsed trigger button. */
    icon?: string;

    /** Text label for the trigger button. */
    label?: string;

    /** Display style for the trigger button. Default: inherits. */
    style?: ToolStyle;

    /** Gallery popup layout. Default: "grid". */
    layout?: GalleryLayout;

    /** Number of columns in grid layout. Default: 4. */
    columns?: number;

    /** Gallery option items. */
    options: GalleryOption[];

    /** Currently selected option ID. */
    selectedId?: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Called when a gallery option is selected. */
    onSelect?: (option: GalleryOption, gallery: GalleryItem) => void;

    /** KeyTip letter(s) for keyboard shortcut badge. */
    keyTip?: string;

    /** Additional CSS class(es). */
    cssClass?: string;
}

/** A single option within a gallery picker. */
export interface GalleryOption
{
    /** Unique identifier. */
    id: string;

    /** Display label. */
    label: string;

    /** Bootstrap Icons class. */
    icon?: string;

    /** CSS colour value for colour-swatch galleries. */
    color?: string;

    /** HTML preview content (sanitised before insertion). */
    preview?: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;
}

/** A separator between tools within a region. */
export interface ToolSeparator
{
    /** Must be "separator" to distinguish from ToolItem. */
    type: "separator";
}

/** An input field embedded in the toolbar (search, filter, etc.). */
export interface ToolInputItem
{
    /** Must be "input" to distinguish from ToolItem. */
    type: "input";

    /** Unique identifier. */
    id: string;

    /** Placeholder text. */
    placeholder?: string;

    /** Input width (CSS value). Default: "160px". */
    width?: string;

    /** Icon shown inside the input (e.g. "bi-search"). */
    icon?: string;

    /** Called on each input event with the current value. */
    onInput?: (value: string) => void;

    /** Called when Enter is pressed. */
    onSubmit?: (value: string) => void;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Additional CSS class(es). */
    cssClass?: string;
}

/** A dropdown (select) embedded in the toolbar. */
export interface ToolDropdownItem
{
    /** Must be "dropdown" to distinguish from ToolItem. */
    type: "dropdown";

    /** Unique identifier. */
    id: string;

    /** Tooltip text. */
    tooltip?: string;

    /** Dropdown options. */
    options: Array<{ value: string; label: string; }>;

    /** Initially selected value. */
    value?: string;

    /** Called when selection changes. */
    onChange?: (value: string) => void;

    /** Dropdown width (CSS value). Default: "120px". */
    width?: string;

    /** Disabled state. Default: false. */
    disabled?: boolean;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Additional CSS class(es). */
    cssClass?: string;
}

/** A static label embedded in the toolbar. Non-interactive. */
export interface ToolLabelItem
{
    /** Must be "label" to distinguish from ToolItem. */
    type: "label";

    /** Unique identifier. */
    id: string;

    /** Label text. */
    text: string;

    /** Bootstrap Icons class (shown before text). */
    icon?: string;

    /** Text colour (CSS value). */
    color?: string;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Overflow priority. Default: "low". */
    overflowPriority?: ToolOverflowPriority;

    /** Additional CSS class(es). */
    cssClass?: string;
}

/** Serialisable toolbar layout state for persistence. */
export interface ToolbarLayoutState
{
    /** Toolbar ID. */
    id: string;

    /** Current mode. */
    mode: ToolbarMode;

    /** Current orientation. */
    orientation: ToolbarOrientation;

    /** Dock position (if docked). */
    dockPosition?: ToolbarDockPosition;

    /** Floating coordinates (if floating). */
    floatX?: number;
    floatY?: number;

    /** Current size in orientation axis (px). */
    size?: number;

    /** IDs of tools currently in the overflow menu. */
    overflowedToolIds?: string[];

    /** IDs of hidden regions. */
    hiddenRegionIds?: string[];

    /** Timestamp of when the state was saved (ISO 8601). */
    savedAt: string;
}

/** A region (group) of related tools. */
export interface ToolbarRegion
{
    /** Unique identifier for this region. */
    id: string;

    /** Region title text. */
    title?: string;

    /** Whether to show the region title. Default: true if title is set. */
    showTitle?: boolean;

    /** Tool items, split buttons, galleries, and separators. */
    items: Array<ToolItem | SplitButtonItem | GalleryItem | ToolInputItem | ToolDropdownItem | ToolLabelItem | ToolSeparator>;

    /** Default tool style for items in this region. */
    style?: ToolStyle;

    /** Hidden state. Default: false. */
    hidden?: boolean;

    /** Additional CSS class(es) for the region element. */
    cssClass?: string;

    /** Alignment within the toolbar. "left" (default) places the region
     *  on the leading side; "right" places it on the trailing side with
     *  flexible space separating left and right groups. In vertical
     *  orientation, "left" maps to top and "right" maps to bottom. */
    align?: ToolbarRegionAlign;
}

/** Configuration options for the Toolbar component. */
export interface ToolbarOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Descriptive label for accessibility. Required. */
    label: string;

    /** Visible title displayed at the left edge of the toolbar.
     *  Pass a string for text-only, or a ToolbarTitle object for
     *  icon, custom colours, and CSS class. Non-interactive. */
    title?: string | ToolbarTitle;

    /** Regions containing tool items. */
    regions: ToolbarRegion[];

    /** Toolbar orientation. Default: "horizontal". */
    orientation?: ToolbarOrientation;

    /** Positioning mode. Default: "docked". */
    mode?: ToolbarMode;

    /** Dock edge. Default: "top" for horizontal, "left" for vertical. */
    dockPosition?: ToolbarDockPosition;

    /** Default tool style for all items. Default: "icon". */
    style?: ToolStyle;

    /** Tool button size in pixels. Default: 32. */
    toolSize?: number;

    /** Icon size within tool buttons in pixels. Default: 16. */
    iconSize?: number;

    /** Enable overflow menu. Default: true. */
    overflow?: boolean;

    /** Enable resize handle. Default: true. */
    resizable?: boolean;

    /** Minimum size in orientation axis (px). Default: 120. */
    minSize?: number;

    /** Maximum size in orientation axis (px). Default: none (viewport). */
    maxSize?: number;

    /** Enable floating drag via the grip area. Default: true when floating. */
    draggable?: boolean;

    /** Enable drag-to-dock. Default: true. */
    dragToDock?: boolean;

    /** Distance in px from viewport edge to trigger dock zone. Default: 40. */
    dragToDockThreshold?: number;

    /** Enable KeyTips on Alt press. Default: true. */
    keyTips?: boolean;

    /** Enable layout persistence. Default: false. */
    persistLayout?: boolean;

    /** Storage key prefix. Default: "toolbar-layout-". */
    persistKey?: string;

    /** Initial floating X position (px). */
    floatX?: number;

    /** Initial floating Y position (px). */
    floatY?: number;

    /** Background colour (CSS value). */
    backgroundColor?: string;

    /** Text / icon colour (CSS value). */
    textColor?: string;

    /** Border colour (CSS value). */
    borderColor?: string;

    /** Font family (CSS value). */
    fontFamily?: string;

    /** Font size for labels and titles (CSS value). */
    fontSize?: string;

    /** CSS z-index override. */
    zIndex?: number;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Custom HTML element rendered right-aligned in the toolbar, after
     *  all regions and before the overflow button. Useful for app metadata
     *  (session name, document info, access level, etc.). */
    rightContent?: HTMLElement;

    /** Contained mode — toolbar flows inside a parent container instead of
     *  being fixed to the viewport. Disables drag, clears fixed positioning,
     *  and sets width to 100%. Default: false. */
    contained?: boolean;

    /** Called when a tool is clicked. Global handler. */
    onToolClick?: (tool: ToolItem, active: boolean) => void;

    /** Called when the toolbar is resized. */
    onResize?: (size: number) => void;

    /** Called when mode changes. */
    onModeChange?: (mode: ToolbarMode) => void;

    /** Called when orientation changes. */
    onOrientationChange?: (orientation: ToolbarOrientation) => void;
}

// Bootstrap tooltip API (optional dependency)
declare var bootstrap: any;

const LOG_PREFIX = "[Toolbar]";

// Z-index values matching spec section 8.4
const Z_DOCKED = 1032;
const Z_FLOATING = 1033;
const Z_DROPDOWN = 1060;

// Default option values
const DEFAULT_TOOL_SIZE = 32;
const DEFAULT_ICON_SIZE = 16;
const DEFAULT_MIN_SIZE = 120;
const DEFAULT_DOCK_THRESHOLD = 40;
const DEFAULT_PERSIST_KEY = "toolbar-layout-";
const KEYBOARD_RESIZE_STEP = 10;
const DEBOUNCE_RESIZE_MS = 150;
const DEBOUNCE_PERSIST_MS = 500;

/** Priority sort order for overflow: always-overflow first, never last. */
const PRIORITY_ORDER: Record<ToolOverflowPriority, number> = {
    "always": 0, "low": 1, "high": 2, "never": 3,
};

/** Instance counter for auto-generated IDs */
let instanceCounter = 0;

// ============================================================================
// S2: DOM HELPERS
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and attributes.
 *
 * @param tag - The HTML tag name
 * @param classes - CSS class names to add
 * @param text - Optional text content
 * @returns The created element
 */
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

/**
 * Sets multiple attributes on an HTML element.
 *
 * @param el - Target element
 * @param attrs - Attribute key-value pairs
 */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

/**
 * Clamps a number between a minimum and maximum value.
 *
 * @param value - The value to clamp
 * @param min - Minimum bound
 * @param max - Maximum bound
 * @returns The clamped value
 */
function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

/**
 * Returns a debounced version of the given function.
 *
 * @param fn - Function to debounce
 * @param ms - Debounce delay in milliseconds
 * @returns Debounced function
 */
function debounce(fn: () => void, ms: number): () => void
{
    let timer: number | undefined;

    return () =>
    {
        if (timer !== undefined)
        {
            clearTimeout(timer);
        }

        timer = window.setTimeout(() =>
        {
            timer = undefined;
            fn();
        }, ms);
    };
}

/**
 * Sanitises HTML content for gallery previews.
 * Uses DOMPurify if available, otherwise strips to textContent.
 *
 * @param html - The raw HTML string
 * @returns Sanitised HTML string
 */
function sanitiseHTML(html: string): string
{
    // SECURITY: Use DOMPurify when available for safe HTML rendering
    if (typeof (window as any).DOMPurify !== "undefined")
    {
        return (window as any).DOMPurify.sanitize(html);
    }

    // Fallback: strip all HTML tags via temporary element
    const temp = document.createElement("div");
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Generates a unique ID string for auto-identification.
 *
 * @param prefix - ID prefix
 * @returns Unique ID string
 */
function genId(prefix: string): string
{
    instanceCounter += 1;
    return `${prefix}-${instanceCounter}`;
}

// ============================================================================
// S3: CLASS SHELL + LIFECYCLE
// ============================================================================

// @entrypoint
/**
 * Toolbar renders a programmable action bar with labelled regions of tool
 * buttons. Supports docked/floating modes, horizontal/vertical orientation,
 * split buttons, gallery controls, overflow, KeyTips, resize, drag-to-dock,
 * and layout persistence.
 *
 * @example
 * const tb = new Toolbar({
 *     label: "Document formatting",
 *     regions: [{ id: "fmt", title: "Formatting", items: [...] }]
 * });
 * tb.show();
 */
export class Toolbar
{
    private readonly toolbarId: string;
    private regions: ToolbarRegion[];
    private readonly opts: ToolbarOptions;

    // Current state
    private currentOrientation: ToolbarOrientation;
    private currentMode: ToolbarMode;
    private currentDockPosition: ToolbarDockPosition;
    private currentStyle: ToolStyle;
    private currentToolSize: number;
    private currentIconSize: number;
    private currentSize: number;
    private visible = false;
    private contained = false;

    // Floating position
    private floatX: number;
    private floatY: number;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private gripEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private regionsContainerEl: HTMLElement | null = null;
    private spacerEl: HTMLElement | null = null;
    private rightContentEl: HTMLElement | null = null;
    private leftOverflowBtnEl: HTMLElement | null = null;
    private rightOverflowBtnEl: HTMLElement | null = null;
    private leftOverflowMenuEl: HTMLElement | null = null;
    private rightOverflowMenuEl: HTMLElement | null = null;
    private resizeHandleEl: HTMLElement | null = null;

    // O(1) lookup maps
    private toolElements: Map<string, HTMLElement> = new Map();
    private regionElements: Map<string, HTMLElement> = new Map();
    private toolConfigs: Map<string, ToolItem | SplitButtonItem | GalleryItem> = new Map();
    private regionConfigs: Map<string, ToolbarRegion> = new Map();
    private splitMenuEls: Map<string, HTMLElement> = new Map();
    private galleryPopupEls: Map<string, HTMLElement> = new Map();

    // Drag state
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private dragOrigX = 0;
    private dragOrigY = 0;

    // Bound event handlers for cleanup
    private boundDragMove: ((e: PointerEvent) => void) | null = null;
    private boundDragEnd: ((e: PointerEvent) => void) | null = null;
    private boundClickOutside: ((e: PointerEvent) => void) | null = null;
    private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
    private boundWindowResize: (() => void) | null = null;

    // Dock zone elements (created lazily during drag)
    private dockZones: HTMLElement[] = [];

    // ResizeObserver for overflow detection
    private resizeObserver: ResizeObserver | null = null;

    // KeyTip state
    private keyTipActive = false;
    private keyTipBadges: HTMLElement[] = [];

    // Overflow state — IDs of overflowed tools
    private overflowedIds: Set<string> = new Set();

    // Open popup tracking
    private openPopupType: "split" | "gallery" | "overflow" | null = null;
    private openPopupId: string | null = null;

    // Debounced helpers
    private debouncedOverflow: () => void;
    private debouncedPersist: () => void;

    // Tooltip instances for cleanup
    private tooltipInstances: any[] = [];

    constructor(options: ToolbarOptions)
    {
        if (!options.label)
        {
            console.error(LOG_PREFIX, "Label is required for accessibility.");
        }

        if (!options.regions || options.regions.length === 0)
        {
            console.warn(LOG_PREFIX, "No regions provided; toolbar will be empty.");
        }

        this.toolbarId = options.id || genId("toolbar");
        this.opts = options;

        // Deep-copy regions to avoid external mutation
        this.regions = JSON.parse(JSON.stringify(options.regions || []));

        // Resolve defaults
        this.currentOrientation = options.orientation || "horizontal";
        this.currentMode = options.mode || "docked";
        this.currentStyle = options.style || "icon";
        this.currentToolSize = options.toolSize || DEFAULT_TOOL_SIZE;
        this.currentIconSize = options.iconSize || DEFAULT_ICON_SIZE;

        // Default dock position: top for horizontal, left for vertical
        this.currentDockPosition = options.dockPosition ||
            (this.currentOrientation === "horizontal" ? "top" : "left");

        // Contained mode
        this.contained = this.opts.contained || false;

        // Ensure orientation matches dock position
        this.autoCorrectOrientation();

        this.floatX = options.floatX ?? 100;
        this.floatY = options.floatY ?? 100;
        this.currentSize = 0; // Measured after show

        // Build region/tool config maps
        this.indexRegionsAndTools();

        // Build DOM
        this.buildRoot();

        // Debounced functions
        this.debouncedOverflow = debounce(
            () => this.recalculateOverflow(), DEBOUNCE_RESIZE_MS
        );
        this.debouncedPersist = debounce(
            () => this.autoSave(), DEBOUNCE_PERSIST_MS
        );

        console.log(LOG_PREFIX, "Initialised:", this.toolbarId);
        console.debug(LOG_PREFIX, "Options:", {
            orientation: this.currentOrientation,
            mode: this.currentMode,
            dockPosition: this.currentDockPosition,
            style: this.currentStyle
        });
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    /**
     * Appends the toolbar to a container (or document.body), initialises
     * tooltips, attaches ResizeObserver, recalculates overflow, and sets
     * CSS custom properties.
     *
     * @param container - Optional parent element. When omitted the toolbar
     *                    is appended to document.body.
     */
    public show(container?: HTMLElement): void
    {
        if (this.visible)
        {
            console.warn(LOG_PREFIX, "Already visible:", this.toolbarId);
            return;
        }

        if (!this.rootEl)
        {
            console.error(LOG_PREFIX, "DOM not built; cannot show.");
            return;
        }

        const target = container || document.body;
        target.appendChild(this.rootEl);
        this.visible = true;

        this.applyModeClasses();
        this.applyPositionStyles();
        this.initTooltips(this.rootEl);
        this.attachGlobalListeners();
        this.attachResizeObserver();
        this.recalculateOverflow();
        this.updateCssCustomProperties();

        // Restore layout if persistence is enabled
        if (this.opts.persistLayout)
        {
            this.restoreLayout();
        }

        console.debug(LOG_PREFIX, "Shown:", this.toolbarId);
    }

    /**
     * Removes the toolbar from the DOM without destroying state.
     */
    public hide(): void
    {
        if (!this.visible)
        {
            return;
        }

        this.closeAllPopups();
        this.hideKeyTips();
        this.rootEl?.remove();
        this.visible = false;

        this.detachResizeObserver();
        this.detachGlobalListeners();
        this.clearCssCustomProperties();

        if (this.opts.persistLayout)
        {
            this.debouncedPersist();
        }

        console.debug(LOG_PREFIX, "Hidden:", this.toolbarId);
    }

    /**
     * Hides the toolbar, disposes tooltips, removes all event listeners,
     * and releases internal references.
     */
    public destroy(): void
    {
        this.closeAllPopups();
        this.hideKeyTips();
        this.removeDockZones();
        this.hide();
        this.disposeTooltips();

        this.rootEl = null;
        this.gripEl = null;
        this.regionsContainerEl = null;
        this.leftOverflowBtnEl = null;
        this.rightOverflowBtnEl = null;
        this.leftOverflowMenuEl = null;
        this.rightOverflowMenuEl = null;
        this.resizeHandleEl = null;
        this.toolElements.clear();
        this.regionElements.clear();
        this.toolConfigs.clear();
        this.regionConfigs.clear();
        this.splitMenuEls.clear();
        this.galleryPopupEls.clear();
        this.boundDragMove = null;
        this.boundDragEnd = null;

        console.debug(LOG_PREFIX, "Destroyed:", this.toolbarId);
    }

    // ========================================================================
    // S4: PUBLIC — REGION + TOOL MANAGEMENT
    // ========================================================================

    /**
     * Adds a new region at an optional position index.
     *
     * @param region - The region configuration
     * @param index - Optional insertion index
     */
    public addRegion(region: ToolbarRegion, index?: number): void
    {
        const copy: ToolbarRegion = JSON.parse(JSON.stringify(region));

        if (index !== undefined && index >= 0 && index <= this.regions.length)
        {
            this.regions.splice(index, 0, copy);
        }
        else
        {
            this.regions.push(copy);
        }

        this.regionConfigs.set(copy.id, copy);
        this.indexToolsInRegion(copy);

        // Rebuild regions DOM
        this.rebuildRegionsDOM();
        this.recalculateOverflow();

        console.debug(LOG_PREFIX, "Region added:", copy.id);
    }

    /**
     * Removes a region by ID.
     *
     * @param regionId - The region ID to remove
     */
    public removeRegion(regionId: string): void
    {
        const idx = this.regions.findIndex((r) => r.id === regionId);

        if (idx === -1)
        {
            console.warn(LOG_PREFIX, "Region not found:", regionId);
            return;
        }

        // Remove tool configs for tools in this region
        const region = this.regions[idx];

        for (const item of region.items)
        {
            if ("id" in item && item.id)
            {
                this.toolConfigs.delete(item.id);
                this.toolElements.delete(item.id);
            }
        }

        this.regions.splice(idx, 1);
        this.regionConfigs.delete(regionId);

        const el = this.regionElements.get(regionId);

        if (el)
        {
            el.remove();
            this.regionElements.delete(regionId);
        }

        this.rebuildRegionsDOM();
        this.recalculateOverflow();

        console.debug(LOG_PREFIX, "Region removed:", regionId);
    }

    /**
     * Returns a region configuration by ID.
     *
     * @param regionId - The region ID
     * @returns The region configuration or undefined
     */
    public getRegion(regionId: string): ToolbarRegion | undefined
    {
        return this.regionConfigs.get(regionId);
    }

    /**
     * Adds a tool to a region at an optional position index.
     *
     * @param regionId - The target region ID
     * @param tool - The tool configuration
     * @param index - Optional insertion index
     */
    public addTool(
        regionId: string,
        tool: ToolItem | SplitButtonItem | GalleryItem,
        index?: number
    ): void
    {
        const region = this.regionConfigs.get(regionId);

        if (!region)
        {
            console.error(LOG_PREFIX, "Region not found:", regionId);
            return;
        }

        const copy = JSON.parse(JSON.stringify(tool));

        if (index !== undefined && index >= 0 && index <= region.items.length)
        {
            region.items.splice(index, 0, copy);
        }
        else
        {
            region.items.push(copy);
        }

        this.toolConfigs.set(copy.id, copy);

        // Restore callback references from the original tool object
        this.restoreCallbacks(copy, tool);

        this.rebuildRegionsDOM();
        this.recalculateOverflow();

        // Init tooltips on the new element
        const el = this.toolElements.get(copy.id);

        if (el && this.visible)
        {
            this.initTooltips(el);
        }

        console.debug(LOG_PREFIX, "Tool added:", copy.id, "to region:", regionId);
    }

    /**
     * Removes a tool by ID from any region.
     *
     * @param toolId - The tool ID to remove
     */
    public removeTool(toolId: string): void
    {
        // Find containing region
        for (const region of this.regions)
        {
            const idx = region.items.findIndex(
                (item) => "id" in item && item.id === toolId
            );

            if (idx !== -1)
            {
                region.items.splice(idx, 1);
                this.toolConfigs.delete(toolId);

                const el = this.toolElements.get(toolId);

                if (el)
                {
                    this.disposeTooltipOnElement(el);
                    el.remove();
                    this.toolElements.delete(toolId);
                }

                this.rebuildRegionsDOM();
                this.recalculateOverflow();
                console.debug(LOG_PREFIX, "Tool removed:", toolId);
                return;
            }
        }

        console.warn(LOG_PREFIX, "Tool not found:", toolId);
    }

    /**
     * Returns the tool configuration by ID.
     *
     * @param toolId - The tool ID
     * @returns The tool configuration or undefined
     */
    public getTool(
        toolId: string
    ): ToolItem | SplitButtonItem | GalleryItem | undefined
    {
        return this.toolConfigs.get(toolId);
    }

    /**
     * Updates properties on a tool (active, disabled, hidden, icon, label,
     * tooltip).
     *
     * @param toolId - The tool ID
     * @param state - Partial state to apply
     */
    public setToolState(
        toolId: string,
        state: Partial<{
            active: boolean;
            disabled: boolean;
            hidden: boolean;
            icon: string;
            label: string;
            tooltip: string;
        }>
    ): void
    {
        const config = this.toolConfigs.get(toolId);

        if (!config)
        {
            console.warn(LOG_PREFIX, "Tool not found:", toolId);
            return;
        }

        const el = this.toolElements.get(toolId);

        // Update config
        if (state.active !== undefined)
        {
            (config as any).active = state.active;
        }

        if (state.disabled !== undefined)
        {
            (config as any).disabled = state.disabled;
        }

        if (state.hidden !== undefined)
        {
            (config as any).hidden = state.hidden;
        }

        if (state.icon !== undefined)
        {
            (config as any).icon = state.icon;
        }

        if (state.label !== undefined)
        {
            (config as any).label = state.label;
        }

        if (state.tooltip !== undefined)
        {
            (config as any).tooltip = state.tooltip;
        }

        // Update DOM
        if (!el)
        {
            return;
        }

        this.applyToolStateToDOM(el, config);

        if (state.hidden !== undefined)
        {
            this.recalculateOverflow();
        }
    }

    /**
     * Returns the current state of a tool.
     *
     * @param toolId - The tool ID
     * @returns Current state or undefined
     */
    public getToolState(toolId: string): {
        active: boolean;
        disabled: boolean;
        hidden: boolean;
    } | undefined
    {
        const config = this.toolConfigs.get(toolId);

        if (!config)
        {
            return undefined;
        }

        return {
            active: !!(config as any).active,
            disabled: !!(config as any).disabled,
            hidden: !!(config as any).hidden,
        };
    }

    /**
     * Changes the default tool display style.
     *
     * @param style - New default style
     */
    public setStyle(style: ToolStyle): void
    {
        this.currentStyle = style;
        this.rebuildRegionsDOM();
        this.recalculateOverflow();
    }

    /**
     * Changes tool button size.
     *
     * @param size - New size in pixels
     */
    public setToolSize(size: number): void
    {
        this.currentToolSize = size;

        if (this.rootEl)
        {
            this.rootEl.style.setProperty(
                "--toolbar-tool-size", `${size}px`
            );
        }

        this.recalculateOverflow();
    }

    // ========================================================================
    // S5: PUBLIC — SPLIT / GALLERY / KEYTIPS / PERSIST
    // ========================================================================

    /**
     * Programmatically selects a gallery option.
     *
     * @param galleryId - The gallery tool ID
     * @param optionId - The option ID to select
     */
    public setGallerySelection(galleryId: string, optionId: string): void
    {
        const config = this.toolConfigs.get(galleryId) as GalleryItem | undefined;

        if (!config || (config as any).type !== "gallery")
        {
            console.warn(LOG_PREFIX, "Gallery not found:", galleryId);
            return;
        }

        const option = config.options.find((o) => o.id === optionId);

        if (!option)
        {
            console.warn(LOG_PREFIX, "Gallery option not found:", optionId);
            return;
        }

        config.selectedId = optionId;
        this.updateGalleryDOM(galleryId);

        if (config.onSelect)
        {
            config.onSelect(option, config);
        }
    }

    /**
     * Returns the currently selected gallery option ID.
     *
     * @param galleryId - The gallery tool ID
     * @returns Selected option ID or undefined
     */
    public getGallerySelection(galleryId: string): string | undefined
    {
        const config = this.toolConfigs.get(galleryId) as GalleryItem | undefined;

        if (!config || (config as any).type !== "gallery")
        {
            return undefined;
        }

        return config.selectedId;
    }

    /**
     * Updates the dropdown menu items of a split button.
     *
     * @param splitId - The split button ID
     * @param items - New menu items
     */
    public setSplitMenuItems(splitId: string, items: SplitMenuItem[]): void
    {
        const config = this.toolConfigs.get(splitId) as SplitButtonItem | undefined;

        if (!config || config.type !== "split-button")
        {
            console.warn(LOG_PREFIX, "Split button not found:", splitId);
            return;
        }

        config.menuItems = JSON.parse(JSON.stringify(items));
        this.rebuildSplitMenu(splitId);
    }

    /**
     * Activates KeyTip badge display.
     */
    public showKeyTips(): void
    {
        if (this.keyTipActive || !this.visible || !this.rootEl)
        {
            return;
        }

        this.keyTipActive = true;
        this.rootEl.classList.add("toolbar-keytips-active");

        const rootRect = this.rootEl.getBoundingClientRect();

        // Create badges for each visible tool with a keyTip
        this.toolConfigs.forEach((config, id) =>
        {
            if (!(config as any).keyTip || (config as any).hidden || (config as any).disabled)
            {
                return;
            }

            if (this.overflowedIds.has(id))
            {
                return;
            }

            const el = this.toolElements.get(id);

            if (!el)
            {
                return;
            }

            const badge = this.buildKeyTipBadge(
                ((config as any).keyTip as string).toUpperCase(),
                el.getBoundingClientRect(),
                rootRect
            );

            this.rootEl!.appendChild(badge);
            this.keyTipBadges.push(badge);
        });

        console.debug(LOG_PREFIX, "KeyTips shown:",
            this.keyTipBadges.length, "badges");
    }

    /**
     * Hides KeyTip badges.
     */
    public hideKeyTips(): void
    {
        if (!this.keyTipActive)
        {
            return;
        }

        this.keyTipActive = false;

        for (const badge of this.keyTipBadges)
        {
            badge.remove();
        }

        this.keyTipBadges = [];

        if (this.rootEl)
        {
            this.rootEl.classList.remove("toolbar-keytips-active");
        }
    }

    /**
     * Serialises current layout state to localStorage.
     *
     * @returns The layout state object
     */
    public saveLayout(): ToolbarLayoutState
    {
        const state = this.getLayoutState();

        try
        {
            const key = (this.opts.persistKey || DEFAULT_PERSIST_KEY) +
                this.toolbarId;
            localStorage.setItem(key, JSON.stringify(state));
            console.debug(LOG_PREFIX, "Layout saved:", key);
        }
        catch (e)
        {
            console.warn(LOG_PREFIX, "Failed to save layout:", e);
        }

        return state;
    }

    /**
     * Reads layout state from localStorage and applies it.
     *
     * @returns true if state was found and applied
     */
    public restoreLayout(): boolean
    {
        try
        {
            const key = (this.opts.persistKey || DEFAULT_PERSIST_KEY) +
                this.toolbarId;
            const raw = localStorage.getItem(key);

            if (!raw)
            {
                return false;
            }

            const state = JSON.parse(raw) as ToolbarLayoutState;

            if (!state.mode || !state.orientation)
            {
                console.warn(LOG_PREFIX, "Invalid layout state; ignoring.");
                return false;
            }

            this.applyLayoutState(state);
            console.debug(LOG_PREFIX, "Layout restored:", key);
            return true;
        }
        catch (e)
        {
            console.warn(LOG_PREFIX, "Failed to restore layout:", e);
            return false;
        }
    }

    /**
     * Returns the current layout state without persisting.
     *
     * @returns Current ToolbarLayoutState
     */
    public getLayoutState(): ToolbarLayoutState
    {
        return {
            id: this.toolbarId,
            mode: this.currentMode,
            orientation: this.currentOrientation,
            dockPosition: this.currentDockPosition,
            floatX: this.floatX,
            floatY: this.floatY,
            size: this.currentSize,
            overflowedToolIds: Array.from(this.overflowedIds),
            hiddenRegionIds: this.regions
                .filter((r) => r.hidden)
                .map((r) => r.id),
            savedAt: new Date().toISOString(),
        };
    }

    /**
     * Applies a ToolbarLayoutState object (e.g., from server storage).
     *
     * @param state - The layout state to apply
     */
    public applyLayoutState(state: ToolbarLayoutState): void
    {
        if (state.orientation)
        {
            this.currentOrientation = state.orientation;
        }

        if (state.dockPosition)
        {
            this.currentDockPosition = state.dockPosition;
        }

        if (state.floatX !== undefined)
        {
            this.floatX = state.floatX;
        }

        if (state.floatY !== undefined)
        {
            this.floatY = state.floatY;
        }

        if (state.size)
        {
            this.currentSize = state.size;
        }

        if (state.mode === "floating")
        {
            this.floatInternal();
        }
        else
        {
            this.dockInternal();
        }

        this.recalculateOverflow();
    }

    // ========================================================================
    // PUBLIC — MODE / ORIENTATION / POSITION
    // ========================================================================

    /**
     * Switches to docked mode at the given edge.
     *
     * @param position - Dock edge
     */
    public dock(position: ToolbarDockPosition): void
    {
        this.currentDockPosition = position;
        this.currentMode = "docked";

        // Auto-correct orientation
        this.autoCorrectOrientation();

        this.dockInternal();

        if (this.opts.onModeChange)
        {
            this.opts.onModeChange("docked");
        }

        if (this.opts.persistLayout)
        {
            this.debouncedPersist();
        }

        console.debug(LOG_PREFIX, "Docked to:", position);
    }

    /**
     * Switches to floating mode at optional coordinates.
     *
     * @param x - Horizontal position in pixels
     * @param y - Vertical position in pixels
     */
    public float(x?: number, y?: number): void
    {
        if (x !== undefined)
        {
            this.floatX = x;
        }

        if (y !== undefined)
        {
            this.floatY = y;
        }

        this.currentMode = "floating";
        this.floatInternal();

        if (this.opts.onModeChange)
        {
            this.opts.onModeChange("floating");
        }

        if (this.opts.persistLayout)
        {
            this.debouncedPersist();
        }

        console.debug(LOG_PREFIX, "Floating at:", this.floatX, this.floatY);
    }

    /**
     * Changes orientation (horizontal/vertical).
     *
     * @param o - New orientation
     */
    public setOrientation(o: ToolbarOrientation): void
    {
        if (o === this.currentOrientation) { return; }

        this.closeAllPopups();
        this.currentOrientation = o;
        this.currentSize = 0;

        if (this.currentMode === "docked")
        {
            this.autoCorrectDockPosition();
        }

        this.applyModeClasses();
        this.applyPositionStyles();
        this.rebuildRegionsDOM();
        this.recalculateOverflow();

        if (this.opts.onOrientationChange)
        {
            this.opts.onOrientationChange(o);
        }

        if (this.opts.persistLayout) { this.debouncedPersist(); }
        console.debug(LOG_PREFIX, "Orientation set to:", o);
    }

    /**
     * Forces overflow recalculation.
     */
    public recalculateOverflow(): void
    {
        if (!this.rootEl || !this.visible)
        {
            console.debug(LOG_PREFIX, "Overflow skipped: not ready");
            return;
        }

        if (this.opts.overflow === false)
        {
            console.debug(LOG_PREFIX, "Overflow skipped: disabled");
            return;
        }

        this.calculateOverflow();
    }

    // ========================================================================
    // PUBLIC — STATE QUERIES
    // ========================================================================

    /** Returns current mode. */
    public getMode(): ToolbarMode
    {
        return this.currentMode;
    }

    /** Returns current orientation. */
    public getOrientation(): ToolbarOrientation
    {
        return this.currentOrientation;
    }

    /** Returns current dock position. */
    public getDockPosition(): ToolbarDockPosition
    {
        return this.currentDockPosition;
    }

    /** Returns whether the toolbar is in the DOM. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    /** Returns the root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns whether the toolbar is in contained mode. */
    public isContained(): boolean
    {
        return this.contained;
    }

    /** Sets contained mode programmatically. */
    public setContained(value: boolean): void
    {
        this.contained = value;
        this.applyModeClasses();
        this.applyPositionStyles();
        console.debug(LOG_PREFIX, "Contained mode:", value);
    }

    /**
     * Sets or removes the visible toolbar title.
     * Pass null to remove, a string for text-only, or a ToolbarTitle
     * object for icon, custom colours, and CSS class.
     */
    public setTitle(cfg: string | ToolbarTitle | null): void
    {
        if (!this.rootEl) { return; }

        if (cfg === null)
        {
            if (this.titleEl && this.titleEl.parentNode)
            {
                this.titleEl.parentNode.removeChild(this.titleEl);
            }
            this.titleEl = null;
            this.recalculateOverflow();
            console.debug(LOG_PREFIX, "Title removed");
            return;
        }

        if (this.titleEl)
        {
            this.applyTitleContent(this.titleEl, cfg);
        }
        else
        {
            this.titleEl = this.buildTitle(cfg);
            // Insert after grip, before regions container
            if (this.regionsContainerEl)
            {
                this.rootEl.insertBefore(
                    this.titleEl, this.regionsContainerEl
                );
            }
            else
            {
                this.rootEl.appendChild(this.titleEl);
            }
        }
        this.recalculateOverflow();
        console.debug(LOG_PREFIX, "Title updated");
    }

    /**
     * Returns the current title configuration, or null if none.
     */
    public getTitle(): string | ToolbarTitle | null
    {
        return this.opts.title ?? null;
    }

    /**
     * Sets or replaces the right-content slot. Pass null to remove.
     */
    public setRightContent(el: HTMLElement | null): void
    {
        if (!this.rootEl) { return; }

        if (el === null)
        {
            if (this.rightContentEl)
            {
                this.rightContentEl.remove();
                this.rightContentEl = null;
            }
            return;
        }

        const slot = this.ensureRightContentSlot();
        slot.innerHTML = "";
        slot.appendChild(el);
    }

    /** Creates the right-content container if it doesn't exist. */
    private ensureRightContentSlot(): HTMLElement
    {
        if (!this.rightContentEl)
        {
            this.rightContentEl = createElement(
                "div", ["toolbar-right-content"]
            );
            if (this.leftOverflowMenuEl)
            {
                this.rootEl!.insertBefore(
                    this.rightContentEl, this.leftOverflowMenuEl
                );
            }
            else
            {
                this.rootEl!.appendChild(this.rightContentEl);
            }
        }
        return this.rightContentEl;
    }

    /** Returns the right-content container, or null if none. */
    public getRightContent(): HTMLElement | null
    {
        return this.rightContentEl;
    }

    // ========================================================================
    // S6: PRIVATE — DOM BUILDING
    // ========================================================================

    /**
     * Builds the root element and all children.
     */
    private buildRoot(): void
    {
        this.rootEl = createElement("div", ["toolbar"]);

        setAttr(this.rootEl, {
            "id": this.toolbarId,
            "role": "toolbar",
            "aria-label": this.opts.label || "Toolbar",
            "aria-orientation": this.currentOrientation,
        });

        // CSS custom properties for tool sizing
        this.rootEl.style.setProperty(
            "--toolbar-tool-size", `${this.currentToolSize}px`
        );
        this.rootEl.style.setProperty(
            "--toolbar-icon-size", `${this.currentIconSize}px`
        );

        if (this.opts.cssClass)
        {
            this.rootEl.classList.add(...this.opts.cssClass.split(" "));
        }

        this.applyStyleOverrides(this.rootEl);

        // Grip (drag handle — visible in all modes for undock/reposition)
        this.gripEl = this.buildGrip();
        this.rootEl.appendChild(this.gripEl);

        // Title (non-interactive label, always after grip)
        if (this.opts.title)
        {
            this.titleEl = this.buildTitle(this.opts.title);
            this.rootEl.appendChild(this.titleEl);
        }

        // Regions container
        this.regionsContainerEl = createElement(
            "div", ["toolbar-regions-container"]
        );
        this.rootEl.appendChild(this.regionsContainerEl);

        // Overflow buttons and menus (created before buildAllRegions
        // so buttons can be inserted inline into the container)
        this.leftOverflowBtnEl = this.buildOverflowButton("left");
        this.rightOverflowBtnEl = this.buildOverflowButton("right");
        this.leftOverflowMenuEl = this.buildOverflowMenuEl();
        this.rightOverflowMenuEl = this.buildOverflowMenuEl();

        // Build region elements (inserts overflow buttons into container)
        this.buildAllRegions();

        // Portal all popup menus to rootEl (position: fixed, escapes
        // overflow:hidden on regionsContainerEl)
        this.appendPortaledPopups();

        // Right content slot (custom HTML, e.g. metadata)
        if (this.opts.rightContent)
        {
            this.rightContentEl = createElement(
                "div", ["toolbar-right-content"]
            );
            this.rightContentEl.appendChild(this.opts.rightContent);
            this.rootEl.appendChild(this.rightContentEl);
        }

        // Resize handle
        if (this.opts.resizable !== false)
        {
            this.resizeHandleEl = this.buildResizeHandle();
            this.rootEl.appendChild(this.resizeHandleEl);
        }
    }

    /**
     * Builds the grip drag strip for floating mode.
     */
    private buildGrip(): HTMLElement
    {
        const grip = createElement("div", ["toolbar-grip"]);

        setAttr(grip, {
            "aria-hidden": "true",
            "title": "Drag to move",
        });

        if (this.opts.draggable !== false)
        {
            this.attachGripDrag(grip);
        }

        return grip;
    }

    /**
     * Builds the non-interactive title element.
     */
    private buildTitle(cfg: string | ToolbarTitle): HTMLElement
    {
        const title = createElement("div", ["toolbar-title"]);
        setAttr(title, { "aria-hidden": "true" });
        this.applyTitleContent(title, cfg);
        return title;
    }

    /**
     * Applies content and styles to a title element from config.
     */
    private applyTitleContent(
        el: HTMLElement, cfg: string | ToolbarTitle
    ): void
    {
        // Clear existing content
        while (el.firstChild) { el.removeChild(el.firstChild); }

        const resolved: ToolbarTitle = typeof cfg === "string"
            ? { text: cfg }
            : cfg;

        if (resolved.icon)
        {
            const icon = createElement("i", [resolved.icon]);
            icon.classList.add("toolbar-title-icon");
            el.appendChild(icon);
        }

        if (resolved.text)
        {
            const span = createElement("span", ["toolbar-title-text"],
                resolved.text);
            el.appendChild(span);
        }

        // Custom colours
        el.style.backgroundColor = resolved.backgroundColor || "";
        el.style.color = resolved.color || "";

        // Custom CSS class
        el.className = "toolbar-title";
        if (resolved.cssClass)
        {
            el.classList.add(...resolved.cssClass.split(" "));
        }

        this.applyTitleDimensions(el, resolved);
    }

    /**
     * Applies dimensional styles (width) to the title element.
     */
    private applyTitleDimensions(
        el: HTMLElement, cfg: ToolbarTitle
    ): void
    {
        if (cfg.width)
        {
            el.style.width = cfg.width;
            el.style.minWidth = cfg.width;
        }
        else
        {
            el.style.width = "";
            el.style.minWidth = "";
        }
    }

    /** Partitions regions into left-aligned and right-aligned groups. */
    private partitionRegionsByAlign(): { left: ToolbarRegion[]; right: ToolbarRegion[] }
    {
        const left = this.regions.filter(
            (r) => (r.align || "left") === "left"
        );
        const right = this.regions.filter(
            (r) => r.align === "right"
        );
        return { left, right };
    }

    /** Returns regions ordered left-first then right for iteration. */
    private getOrderedRegions(): ToolbarRegion[]
    {
        const { left, right } = this.partitionRegionsByAlign();
        return [...left, ...right];
    }

    /**
     * Builds all region elements into the regions container.
     */
    private buildAllRegions(): void
    {
        if (!this.regionsContainerEl) { return; }

        this.regionsContainerEl.innerHTML = "";
        this.toolElements.clear();
        this.regionElements.clear();
        this.splitMenuEls.clear();
        this.galleryPopupEls.clear();
        this.spacerEl = null;

        const { left, right } = this.partitionRegionsByAlign();
        this.buildRegionGroup(left);

        if (left.length > 0 && this.leftOverflowBtnEl)
        {
            this.regionsContainerEl.appendChild(this.leftOverflowBtnEl);
        }

        if (right.length > 0)
        {
            this.appendRightGroupElements(right);
        }
    }

    /** Appends spacer, right overflow button, and right regions. */
    private appendRightGroupElements(right: ToolbarRegion[]): void
    {
        this.spacerEl = createElement("div", ["toolbar-regions-spacer"]);
        this.regionsContainerEl!.appendChild(this.spacerEl);

        if (this.rightOverflowBtnEl)
        {
            this.regionsContainerEl!.appendChild(this.rightOverflowBtnEl);
        }

        this.buildRegionGroup(right);
    }

    /**
     * Builds a group of regions with dividers between them.
     */
    private buildRegionGroup(regions: ToolbarRegion[]): void
    {
        if (!this.regionsContainerEl) { return; }

        for (let i = 0; i < regions.length; i++)
        {
            if (i > 0)
            {
                const divider = createElement(
                    "div", ["toolbar-divider"]
                );
                setAttr(divider, { "role": "separator" });
                this.regionsContainerEl.appendChild(divider);
            }

            const regionEl = this.buildRegionElement(regions[i]);
            this.regionsContainerEl.appendChild(regionEl);
            this.regionElements.set(regions[i].id, regionEl);
        }
    }

    /**
     * Builds a single region element with title and items.
     */
    private buildRegionElement(region: ToolbarRegion): HTMLElement
    {
        const el = createElement("div", ["toolbar-region"]);
        setAttr(el, { "data-region-id": region.id });

        if (region.hidden)
        {
            el.style.display = "none";
        }

        if (region.cssClass)
        {
            el.classList.add(...region.cssClass.split(" "));
        }

        // Region title
        const showTitle = region.showTitle !== false && !!region.title;

        if (showTitle)
        {
            const title = createElement(
                "span", ["toolbar-region-title"], region.title
            );
            el.appendChild(title);
        }

        // Items container
        const itemsEl = createElement("div", ["toolbar-region-items"]);
        el.appendChild(itemsEl);

        // Build each item
        for (const item of region.items)
        {
            const itemEl = this.buildItemElement(item, region);

            if (itemEl)
            {
                itemsEl.appendChild(itemEl);
            }
        }

        return el;
    }

    /**
     * Builds a single item element (tool, split, gallery, or separator).
     */
    private buildItemElement(
        item: ToolItem | SplitButtonItem | GalleryItem | ToolInputItem | ToolDropdownItem | ToolLabelItem | ToolSeparator,
        region: ToolbarRegion
    ): HTMLElement | null
    {
        if ("type" in item && item.type === "separator")
        {
            return this.buildSeparator();
        }

        if ("type" in item && item.type === "split-button")
        {
            return this.buildSplitButton(item as SplitButtonItem, region);
        }

        if ("type" in item && item.type === "gallery")
        {
            return this.buildGalleryControl(item as GalleryItem, region);
        }

        if ("type" in item && item.type === "input")
        {
            return this.buildInputItem(item as ToolInputItem);
        }

        if ("type" in item && item.type === "dropdown")
        {
            return this.buildDropdownItem(item as ToolDropdownItem);
        }

        if ("type" in item && item.type === "label")
        {
            return this.buildLabelItem(item as ToolLabelItem);
        }

        // Standard tool button
        return this.buildToolButton(item as ToolItem, region);
    }

    /**
     * Builds a standard tool button element.
     */
    private buildToolButton(
        tool: ToolItem, region: ToolbarRegion
    ): HTMLElement
    {
        const effectiveStyle = tool.style || region.style || this.currentStyle;

        const btn = createElement("button", ["toolbar-tool", `toolbar-${effectiveStyle}`]);

        setAttr(btn, {
            "type": "button",
            "data-tool-id": tool.id,
            "aria-label": tool.tooltip,
            "data-bs-toggle": "tooltip",
            "data-bs-placement": this.currentOrientation === "horizontal"
                ? "bottom" : "right",
            "title": tool.tooltip,
        });

        // Roving tabindex — first tool gets 0, rest get -1
        const isFirst = (this.toolElements.size === 0);
        setAttr(btn, { "tabindex": isFirst ? "0" : "-1" });

        if (tool.toggle)
        {
            setAttr(btn, {
                "aria-pressed": tool.active ? "true" : "false"
            });
        }

        if (tool.cssClass)
        {
            btn.classList.add(...tool.cssClass.split(" "));
        }

        // Icon
        if (tool.icon && (effectiveStyle === "icon" || effectiveStyle === "icon-label"))
        {
            const icon = createElement("i", ["bi", tool.icon, "toolbar-tool-icon"]);
            btn.appendChild(icon);
        }

        // Label
        if (tool.label && (effectiveStyle === "icon-label" || effectiveStyle === "label"))
        {
            const label = createElement("span", ["toolbar-tool-label"], tool.label);
            btn.appendChild(label);
        }

        // State
        this.applyToolStateToDOM(btn, tool);

        // Click handler
        btn.addEventListener("click", () => this.handleToolClick(tool));

        this.toolElements.set(tool.id, btn);
        return btn;
    }

    /**
     * Builds a split button element (primary + arrow + dropdown menu).
     */
    private buildSplitButton(
        split: SplitButtonItem, region: ToolbarRegion
    ): HTMLElement
    {
        const effectiveStyle = split.style || region.style || this.currentStyle;
        const container = createElement("div", ["toolbar-split"]);
        setAttr(container, { "data-tool-id": split.id });

        // Primary button
        const primary = createElement(
            "button", ["toolbar-split-primary", "toolbar-tool", `toolbar-${effectiveStyle}`]
        );
        setAttr(primary, {
            "type": "button",
            "tabindex": "-1",
            "aria-label": split.tooltip,
        });

        if (split.toggle)
        {
            setAttr(primary, {
                "aria-pressed": split.active ? "true" : "false"
            });
        }

        if (split.icon && (effectiveStyle === "icon" || effectiveStyle === "icon-label"))
        {
            const icon = createElement("i", ["bi", split.icon, "toolbar-tool-icon"]);
            primary.appendChild(icon);
        }

        if (split.label && (effectiveStyle === "icon-label" || effectiveStyle === "label"))
        {
            const label = createElement(
                "span", ["toolbar-tool-label"], split.label
            );
            primary.appendChild(label);
        }

        // Primary click
        primary.addEventListener("click", () =>
        {
            this.handleSplitPrimaryClick(split);
        });

        container.appendChild(primary);

        // Arrow button
        const arrow = createElement("button", ["toolbar-split-arrow"]);
        setAttr(arrow, {
            "type": "button",
            "tabindex": "-1",
            "aria-haspopup": "true",
            "aria-expanded": "false",
            "aria-label": `${split.tooltip} options`,
        });

        const chevron = createElement("i", ["bi", "bi-chevron-down"]);
        arrow.appendChild(chevron);

        arrow.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleSplitMenu(split.id);
        });

        container.appendChild(arrow);

        // Dropdown menu (portaled to rootEl, not appended to container)
        const menu = createElement("div", ["toolbar-split-menu"]);
        setAttr(menu, { "role": "menu", "data-split-id": split.id });
        this.buildSplitMenuItems(menu, split.menuItems);
        this.splitMenuEls.set(split.id, menu);

        // Apply state
        this.applyToolStateToDOM(container, split);

        this.toolElements.set(split.id, container);
        return container;
    }

    /**
     * Builds menu items for a split button dropdown.
     */
    private buildSplitMenuItems(
        menu: HTMLElement, items: SplitMenuItem[]
    ): void
    {
        menu.innerHTML = "";

        for (const item of items)
        {
            const btn = createElement("button", ["toolbar-split-menu-item"]);
            setAttr(btn, {
                "role": "menuitem",
                "data-item-id": item.id,
                "type": "button",
            });

            if (item.disabled)
            {
                btn.classList.add("toolbar-tool-disabled");
                setAttr(btn, { "aria-disabled": "true" });
            }

            if (item.icon)
            {
                const icon = createElement("i", ["bi", item.icon]);
                btn.appendChild(icon);
            }

            const label = createElement("span", [], item.label);
            btn.appendChild(label);

            btn.addEventListener("click", (e) =>
            {
                e.stopPropagation();

                if (!item.disabled && item.onClick)
                {
                    item.onClick(item);
                }

                this.closeAllPopups();
            });

            menu.appendChild(btn);
        }
    }

    /**
     * Builds a gallery control element (trigger + popup).
     */
    private buildGalleryControl(
        gallery: GalleryItem, region: ToolbarRegion
    ): HTMLElement
    {
        const effectiveStyle = gallery.style || region.style || this.currentStyle;
        const container = createElement("div", ["toolbar-gallery"]);
        setAttr(container, { "data-tool-id": gallery.id });

        if (gallery.cssClass)
        {
            container.classList.add(...gallery.cssClass.split(" "));
        }

        // Trigger button
        const trigger = createElement(
            "button", ["toolbar-gallery-trigger", "toolbar-tool", `toolbar-${effectiveStyle}`]
        );
        setAttr(trigger, {
            "type": "button",
            "tabindex": "-1",
            "aria-haspopup": "true",
            "aria-expanded": "false",
            "aria-label": gallery.tooltip,
            "data-bs-toggle": "tooltip",
            "data-bs-placement": this.currentOrientation === "horizontal"
                ? "bottom" : "right",
            "title": gallery.tooltip,
        });

        if (gallery.icon && (effectiveStyle === "icon" || effectiveStyle === "icon-label"))
        {
            const icon = createElement("i", ["bi", gallery.icon, "toolbar-tool-icon"]);
            trigger.appendChild(icon);
        }

        if (gallery.label && (effectiveStyle === "icon-label" || effectiveStyle === "label"))
        {
            const label = createElement(
                "span", ["toolbar-tool-label"], gallery.label
            );
            trigger.appendChild(label);
        }

        const chevron = createElement(
            "i", ["bi", "bi-chevron-down", "toolbar-gallery-chevron"]
        );
        trigger.appendChild(chevron);

        trigger.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleGalleryPopup(gallery.id);
        });

        container.appendChild(trigger);

        // Popup panel (portaled to rootEl, not appended to container)
        const popup = this.buildGalleryPopup(gallery);
        setAttr(popup, { "data-gallery-id": gallery.id });
        this.galleryPopupEls.set(gallery.id, popup);

        // Apply state
        this.applyToolStateToDOM(container, gallery);

        this.toolElements.set(gallery.id, container);
        return container;
    }

    /**
     * Builds the gallery popup panel with options.
     */
    private buildGalleryPopup(gallery: GalleryItem): HTMLElement
    {
        const popup = createElement("div", ["toolbar-gallery-popup"]);
        setAttr(popup, {
            "role": "listbox",
            "aria-label": gallery.tooltip + " options",
        });

        const layout = gallery.layout || "grid";
        const columns = gallery.columns || 4;

        if (layout === "grid")
        {
            const grid = createElement("div", ["toolbar-gallery-grid"]);
            grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
            this.buildGalleryOptions(grid, gallery);
            popup.appendChild(grid);
        }
        else
        {
            const list = createElement("div", ["toolbar-gallery-list"]);
            this.buildGalleryOptions(list, gallery);
            popup.appendChild(list);
        }

        return popup;
    }

    /**
     * Builds gallery option buttons into a container.
     */
    private buildGalleryOptions(
        container: HTMLElement, gallery: GalleryItem
    ): void
    {
        for (const option of gallery.options)
        {
            const btn = createElement("button", ["toolbar-gallery-option"]);
            setAttr(btn, {
                "role": "option",
                "data-option-id": option.id,
                "aria-selected": option.id === gallery.selectedId
                    ? "true" : "false",
                "title": option.label,
                "type": "button",
            });

            if (option.id === gallery.selectedId)
            {
                btn.classList.add("toolbar-gallery-option-selected");
            }

            if (option.disabled)
            {
                btn.classList.add("toolbar-tool-disabled");
                setAttr(btn, { "aria-disabled": "true" });
            }

            // Render option content
            if (option.color)
            {
                const swatch = createElement("span", ["toolbar-gallery-swatch"]);
                swatch.style.backgroundColor = option.color;
                btn.appendChild(swatch);
            }
            else if (option.icon)
            {
                const icon = createElement("i", ["bi", option.icon]);
                btn.appendChild(icon);
            }
            else if (option.preview)
            {
                // @agent:security — Preview content is sanitised
                const preview = createElement("span", ["toolbar-gallery-preview"]);
                preview.innerHTML = sanitiseHTML(option.preview);
                btn.appendChild(preview);
            }

            // Label in list layout
            if (gallery.layout === "list")
            {
                const label = createElement("span", [], option.label);
                btn.appendChild(label);
            }

            btn.addEventListener("click", (e) =>
            {
                e.stopPropagation();

                if (!option.disabled)
                {
                    this.handleGalleryOptionClick(gallery, option);
                }
            });

            container.appendChild(btn);
        }
    }

    /**
     * Builds a separator element.
     */
    private buildSeparator(): HTMLElement
    {
        const sep = createElement("div", ["toolbar-separator"]);
        setAttr(sep, { "role": "separator" });
        return sep;
    }

    /** Registers a tool element in tracking maps and applies common props. */
    private registerToolItem(
        el: HTMLElement, id: string, config: any,
        cssClass?: string, hidden?: boolean
    ): void
    {
        if (cssClass)
        {
            el.classList.add(...cssClass.split(" "));
        }
        if (hidden) { el.style.display = "none"; }
        this.toolElements.set(id, el);
        this.toolConfigs.set(id, config);
    }

    /** Attaches onInput and onSubmit listeners to an input element. */
    private attachInputListeners(
        input: HTMLInputElement, item: ToolInputItem
    ): void
    {
        if (item.onInput)
        {
            const handler = item.onInput;
            input.addEventListener("input", () => handler(input.value));
        }
        if (item.onSubmit)
        {
            const handler = item.onSubmit;
            input.addEventListener("keydown", (e: KeyboardEvent) =>
            {
                if (e.key === "Enter") { handler(input.value); }
            });
        }
    }

    /** Builds an embedded text input (search, filter). */
    private buildInputItem(item: ToolInputItem): HTMLElement
    {
        const wrap = createElement("div", ["toolbar-input-wrap"]);
        wrap.style.width = item.width || "160px";

        if (item.icon)
        {
            const icon = createElement("i", [item.icon, "toolbar-input-icon"]);
            wrap.appendChild(icon);
        }

        const input = createElement("input", ["toolbar-input"]) as HTMLInputElement;
        setAttr(input, {
            "type": "text",
            "placeholder": item.placeholder || "",
            "data-tool-id": item.id,
        });
        if (item.disabled) { input.disabled = true; }

        this.attachInputListeners(input, item);
        wrap.appendChild(input);
        this.registerToolItem(wrap, item.id, item, item.cssClass, item.hidden);
        return wrap;
    }

    /** Configures dropdown attributes, tooltip, and populates options. */
    private configureDropdown(
        select: HTMLSelectElement, item: ToolDropdownItem
    ): void
    {
        setAttr(select, { "data-tool-id": item.id });
        select.style.width = item.width || "120px";

        if (item.tooltip)
        {
            setAttr(select, {
                "title": item.tooltip,
                "data-bs-toggle": "tooltip",
                "data-bs-placement": "bottom",
            });
        }

        for (const opt of item.options)
        {
            const optEl = createElement("option", [], opt.label) as HTMLOptionElement;
            optEl.value = opt.value;
            select.appendChild(optEl);
        }
        if (item.value) { select.value = item.value; }
    }

    /** Builds an embedded dropdown (select). */
    private buildDropdownItem(item: ToolDropdownItem): HTMLElement
    {
        const select = createElement(
            "select", ["toolbar-dropdown"]
        ) as HTMLSelectElement;

        this.configureDropdown(select, item);
        if (item.disabled) { select.disabled = true; }

        if (item.onChange)
        {
            const handler = item.onChange;
            select.addEventListener("change", () => handler(select.value));
        }

        this.registerToolItem(select, item.id, item, item.cssClass, item.hidden);
        return select;
    }

    /** Builds a static label element. */
    private buildLabelItem(item: ToolLabelItem): HTMLElement
    {
        const wrap = createElement("span", ["toolbar-label"]);
        setAttr(wrap, { "data-tool-id": item.id });

        if (item.icon)
        {
            const icon = createElement("i", [item.icon, "toolbar-label-icon"]);
            wrap.appendChild(icon);
        }

        const text = createElement("span", ["toolbar-label-text"], item.text);
        wrap.appendChild(text);
        if (item.color) { wrap.style.color = item.color; }

        this.registerToolItem(wrap, item.id, item, item.cssClass, item.hidden);
        return wrap;
    }

    /**
     * Builds an inline overflow button for a region group.
     */
    private buildOverflowButton(group: "left" | "right"): HTMLElement
    {
        const btn = createElement("button", ["toolbar-overflow-btn"]);
        setAttr(btn, {
            "type": "button", "aria-haspopup": "true",
            "aria-expanded": "false", "data-group": group,
            "aria-label": `More ${group} tools`, "tabindex": "-1",
        });
        const icon = createElement(
            "i", ["bi", "bi-three-dots", "toolbar-tool-icon"]
        );
        btn.appendChild(icon);
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleOverflowMenu(group);
        });
        btn.style.display = "none";
        return btn;
    }

    /**
     * Builds an overflow dropdown menu (portaled to rootEl).
     */
    private buildOverflowMenuEl(): HTMLElement
    {
        const menu = createElement("div", ["toolbar-overflow-menu"]);
        setAttr(menu, { "role": "menu" });
        menu.style.display = "none";
        return menu;
    }

    /**
     * Builds the resize handle element.
     */
    private buildResizeHandle(): HTMLElement
    {
        const handle = createElement("div", ["toolbar-resize-handle"]);

        setAttr(handle, {
            "role": "separator",
            "aria-orientation": this.currentOrientation === "horizontal"
                ? "vertical" : "horizontal",
            "tabindex": "0",
            "aria-valuenow": "0",
            "aria-valuemin": String(this.opts.minSize || DEFAULT_MIN_SIZE),
            "aria-valuemax": String(
                this.opts.maxSize || window.innerWidth
            ),
        });

        this.attachResizeHandler(handle);

        return handle;
    }

    /**
     * Builds a KeyTip badge span at a calculated position.
     */
    private buildKeyTipBadge(
        letter: string,
        toolRect: DOMRect,
        rootRect: DOMRect
    ): HTMLElement
    {
        const badge = createElement("span", ["toolbar-keytip"], letter);
        setAttr(badge, { "aria-hidden": "true" });

        // Position at bottom-centre of the tool button
        const left = (toolRect.left - rootRect.left) +
            (toolRect.width / 2) - 8;
        const top = (toolRect.top - rootRect.top) + toolRect.height - 4;

        badge.style.left = `${left}px`;
        badge.style.top = `${top}px`;

        return badge;
    }

    // ========================================================================
    // S7: PRIVATE — EVENT HANDLING
    // ========================================================================

    /**
     * Handles a standard tool button click.
     */
    private handleToolClick(tool: ToolItem): void
    {
        if (tool.disabled)
        {
            return;
        }

        // Toggle active state
        if (tool.toggle)
        {
            tool.active = !tool.active;
            const el = this.toolElements.get(tool.id);

            if (el)
            {
                this.applyToolStateToDOM(el, tool);
            }
        }

        // Fire per-tool handler
        if (tool.onClick)
        {
            tool.onClick(tool, !!tool.active);
        }

        // Fire global handler
        if (this.opts.onToolClick)
        {
            this.opts.onToolClick(tool, !!tool.active);
        }
    }

    /**
     * Handles a split button primary click.
     */
    private handleSplitPrimaryClick(split: SplitButtonItem): void
    {
        if (split.disabled)
        {
            return;
        }

        if (split.toggle)
        {
            split.active = !split.active;
            const el = this.toolElements.get(split.id);

            if (el)
            {
                this.applyToolStateToDOM(el, split);
            }
        }

        if (split.onClick)
        {
            split.onClick(split, !!split.active);
        }
    }

    /**
     * Toggles a split button dropdown menu.
     */
    private toggleSplitMenu(splitId: string): void
    {
        if (this.openPopupType === "split" && this.openPopupId === splitId)
        {
            this.closeAllPopups();
            return;
        }
        this.closeAllPopups();

        const el = this.toolElements.get(splitId);
        const menu = this.splitMenuEls.get(splitId);
        if (!el || !menu) { return; }

        menu.style.display = "flex";
        this.positionPopup(el, menu);

        const arrow = el.querySelector(".toolbar-split-arrow") as HTMLElement;
        if (arrow) { arrow.setAttribute("aria-expanded", "true"); }

        this.openPopupType = "split";
        this.openPopupId = splitId;
    }

    /**
     * Toggles a gallery popup.
     */
    private toggleGalleryPopup(galleryId: string): void
    {
        if (this.openPopupType === "gallery" && this.openPopupId === galleryId)
        {
            this.closeAllPopups();
            return;
        }
        this.closeAllPopups();

        const el = this.toolElements.get(galleryId);
        const popup = this.galleryPopupEls.get(galleryId);
        if (!el || !popup) { return; }

        popup.style.display = "block";
        this.positionPopup(el, popup);

        const trigger = el.querySelector(
            ".toolbar-gallery-trigger"
        ) as HTMLElement;
        if (trigger) { trigger.setAttribute("aria-expanded", "true"); }

        this.openPopupType = "gallery";
        this.openPopupId = galleryId;
    }

    /**
     * Toggles an overflow menu for the given region group.
     */
    private toggleOverflowMenu(group: "left" | "right"): void
    {
        const popupId = `overflow-${group}`;

        if (this.openPopupType === "overflow"
            && this.openPopupId === popupId)
        {
            this.closeAllPopups();
            return;
        }

        this.closeAllPopups();
        this.openOverflowGroup(group, popupId);
    }

    /** Opens the overflow menu for a specific group. */
    private openOverflowGroup(
        group: "left" | "right", popupId: string
    ): void
    {
        const btnEl = group === "left"
            ? this.leftOverflowBtnEl : this.rightOverflowBtnEl;
        const menuEl = group === "left"
            ? this.leftOverflowMenuEl : this.rightOverflowMenuEl;

        if (!btnEl || !menuEl) { return; }

        this.rebuildOverflowMenu(group, menuEl);
        this.positionOverflowMenu(btnEl, menuEl);
        menuEl.style.display = "flex";
        btnEl.setAttribute("aria-expanded", "true");

        this.openPopupType = "overflow";
        this.openPopupId = popupId;
    }

    /**
     * Positions an overflow menu below (horizontal) or beside
     * (vertical) its trigger button using fixed positioning.
     */
    private positionOverflowMenu(
        btnEl: HTMLElement, menuEl: HTMLElement
    ): void
    {
        const rect = btnEl.getBoundingClientRect();
        const isH = (this.currentOrientation === "horizontal");

        if (isH)
        {
            menuEl.style.top = `${rect.bottom + 2}px`;
            menuEl.style.left = `${rect.left}px`;
        }
        else
        {
            menuEl.style.top = `${rect.top}px`;
            menuEl.style.left = `${rect.right + 2}px`;
        }
    }

    /**
     * Closes all open popups (split, gallery, overflow).
     */
    private closeAllPopups(): void
    {
        // Close portaled split menus
        this.splitMenuEls.forEach((m) => { m.style.display = "none"; });
        this.closeSplitArrows();

        // Close portaled gallery popups
        this.galleryPopupEls.forEach((p) => { p.style.display = "none"; });
        this.closeGalleryTriggers();

        // Close overflow menus (both groups)
        [this.leftOverflowMenuEl, this.rightOverflowMenuEl].forEach((m) =>
        {
            if (m) { m.style.display = "none"; }
        });

        [this.leftOverflowBtnEl, this.rightOverflowBtnEl].forEach((b) =>
        {
            if (b) { b.setAttribute("aria-expanded", "false"); }
        });

        this.openPopupType = null;
        this.openPopupId = null;
    }

    /** Resets aria-expanded on all split button arrows. */
    private closeSplitArrows(): void
    {
        if (!this.rootEl) { return; }

        this.rootEl.querySelectorAll(".toolbar-split-arrow").forEach((a) =>
        {
            a.setAttribute("aria-expanded", "false");
        });
    }

    /** Resets aria-expanded on all gallery triggers. */
    private closeGalleryTriggers(): void
    {
        if (!this.rootEl) { return; }

        this.rootEl.querySelectorAll(".toolbar-gallery-trigger").forEach((t) =>
        {
            t.setAttribute("aria-expanded", "false");
        });
    }

    /**
     * Handles a gallery option click.
     */
    private handleGalleryOptionClick(
        gallery: GalleryItem, option: GalleryOption
    ): void
    {
        gallery.selectedId = option.id;
        this.updateGalleryDOM(gallery.id);
        this.closeAllPopups();

        if (gallery.onSelect)
        {
            gallery.onSelect(option, gallery);
        }
    }

    /**
     * Handles click outside open popups to close them.
     */
    private handleClickOutside(e: PointerEvent): void
    {
        if (!this.openPopupType)
        {
            return;
        }

        const target = e.target as HTMLElement;

        // Check if click is inside the toolbar
        if (this.rootEl && this.rootEl.contains(target))
        {
            return;
        }

        this.closeAllPopups();
    }

    /**
     * Handles global keydown for KeyTips and keyboard navigation.
     */
    private handleKeyDown(e: KeyboardEvent): void
    {
        // KeyTip activation on Alt press
        if (e.key === "Alt" && (this.opts.keyTips !== false))
        {
            if (this.keyTipActive)
            {
                this.hideKeyTips();
            }
            else if (this.visible && this.hasKeyTips())
            {
                e.preventDefault();
                this.showKeyTips();
            }

            return;
        }

        // KeyTip letter matching
        if (this.keyTipActive)
        {
            if (e.key === "Escape")
            {
                this.hideKeyTips();
                return;
            }

            this.matchKeyTip(e.key);
            this.hideKeyTips();
            return;
        }

        // Escape closes open popups
        if (e.key === "Escape" && this.openPopupType)
        {
            this.closeAllPopups();
            return;
        }
    }

    /**
     * Attaches the grip drag handler for floating mode.
     */
    private attachGripDrag(grip: HTMLElement): void
    {
        grip.addEventListener("pointerdown", (e) =>
        {
            // No drag in contained mode
            if (this.contained)
            {
                return;
            }

            if (e.button !== 0 || this.opts.draggable === false)
            {
                return;
            }

            e.preventDefault();

            // If docked, undock to floating at pointer position first
            if (this.currentMode === "docked")
            {
                const rect = this.rootEl!.getBoundingClientRect();

                this.floatX = clamp(
                    e.clientX - 20, 0,
                    window.innerWidth - rect.width
                );
                this.floatY = clamp(
                    e.clientY - 10, 0,
                    window.innerHeight - 40
                );
                this.currentSize = 0;
                this.float(this.floatX, this.floatY);
            }

            this.isDragging = true;
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
            this.dragOrigX = this.floatX;
            this.dragOrigY = this.floatY;

            grip.setPointerCapture(e.pointerId);
            grip.style.cursor = "grabbing";

            // Show dock zones if drag-to-dock is enabled
            if (this.opts.dragToDock !== false)
            {
                this.showDockZones();
            }

            this.boundDragMove = (ev: PointerEvent) =>
            {
                this.handleDragMove(ev);
            };

            this.boundDragEnd = (ev: PointerEvent) =>
            {
                this.handleDragEnd(ev, grip);
            };

            grip.addEventListener("pointermove", this.boundDragMove);
            grip.addEventListener("pointerup", this.boundDragEnd);
        });
    }

    /**
     * Handles pointer movement during floating drag.
     */
    private handleDragMove(e: PointerEvent): void
    {
        if (!this.isDragging)
        {
            return;
        }

        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        // Constrain to viewport
        this.floatX = clamp(
            this.dragOrigX + dx, 0,
            window.innerWidth - (this.currentToolSize + 20)
        );
        this.floatY = clamp(
            this.dragOrigY + dy, 0,
            window.innerHeight - (this.currentToolSize + 20)
        );

        this.applyPositionStyles();

        // Update dock zone proximity
        if (this.opts.dragToDock !== false)
        {
            this.updateDockZones(e.clientX, e.clientY);
        }
    }

    /**
     * Ends a drag operation and checks for dock zone snap.
     */
    private handleDragEnd(e: PointerEvent, grip: HTMLElement): void
    {
        if (!this.isDragging)
        {
            return;
        }

        this.isDragging = false;
        grip.releasePointerCapture(e.pointerId);
        grip.style.cursor = "";

        if (this.boundDragMove)
        {
            grip.removeEventListener("pointermove", this.boundDragMove);
        }

        if (this.boundDragEnd)
        {
            grip.removeEventListener("pointerup", this.boundDragEnd);
        }

        // Check for dock zone snap
        const dockTarget = this.getDockTarget(e.clientX, e.clientY);
        this.removeDockZones();

        if (dockTarget)
        {
            this.dock(dockTarget);
        }
        else if (this.opts.persistLayout)
        {
            this.debouncedPersist();
        }
    }

    /**
     * Attaches resize handler to the resize handle element.
     */
    private attachResizeHandler(handle: HTMLElement): void
    {
        handle.addEventListener("pointerdown", (e) =>
        {
            if (e.button !== 0)
            {
                return;
            }

            e.preventDefault();
            e.stopPropagation();
            handle.setPointerCapture(e.pointerId);

            const startPos = this.currentOrientation === "horizontal"
                ? e.clientX : e.clientY;
            const startSize = this.currentSize || this.getMeasuredSize();

            const onMove = (ev: PointerEvent) =>
            {
                const currentPos = this.currentOrientation === "horizontal"
                    ? ev.clientX : ev.clientY;
                const delta = currentPos - startPos;
                const minSize = this.opts.minSize || DEFAULT_MIN_SIZE;
                const maxSize = this.opts.maxSize || this.getViewportSize();

                this.currentSize = clamp(startSize + delta, minSize, maxSize);
                this.applySizeStyle();
                this.recalculateOverflow();
            };

            const onUp = (ev: PointerEvent) =>
            {
                handle.releasePointerCapture(ev.pointerId);
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);

                if (this.opts.onResize)
                {
                    this.opts.onResize(this.currentSize);
                }

                if (this.opts.persistLayout)
                {
                    this.debouncedPersist();
                }
            };

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
        });

        // Keyboard resize
        handle.addEventListener("keydown", (e) =>
        {
            this.handleResizeKeyboard(e);
        });
    }

    /**
     * Handles keyboard arrow keys for accessible resize.
     */
    private handleResizeKeyboard(e: KeyboardEvent): void
    {
        const isH = (this.currentOrientation === "horizontal");
        let delta = 0;

        if (isH && e.key === "ArrowRight")
        {
            delta = KEYBOARD_RESIZE_STEP;
        }
        else if (isH && e.key === "ArrowLeft")
        {
            delta = -KEYBOARD_RESIZE_STEP;
        }
        else if (!isH && e.key === "ArrowDown")
        {
            delta = KEYBOARD_RESIZE_STEP;
        }
        else if (!isH && e.key === "ArrowUp")
        {
            delta = -KEYBOARD_RESIZE_STEP;
        }

        if (delta === 0)
        {
            return;
        }

        e.preventDefault();

        const minSize = this.opts.minSize || DEFAULT_MIN_SIZE;
        const maxSize = this.opts.maxSize || this.getViewportSize();
        const size = this.currentSize || this.getMeasuredSize();

        this.currentSize = clamp(size + delta, minSize, maxSize);
        this.applySizeStyle();
        this.recalculateOverflow();

        if (this.opts.onResize)
        {
            this.opts.onResize(this.currentSize);
        }
    }

    /**
     * Attaches global event listeners (click outside, keydown, window resize).
     */
    private attachGlobalListeners(): void
    {
        this.boundClickOutside = (e: PointerEvent) =>
        {
            this.handleClickOutside(e);
        };

        this.boundKeyDown = (e: KeyboardEvent) =>
        {
            this.handleKeyDown(e);
        };

        this.boundWindowResize = this.debouncedOverflow;

        document.addEventListener("pointerdown", this.boundClickOutside);
        document.addEventListener("keydown", this.boundKeyDown);
        window.addEventListener("resize", this.boundWindowResize);
    }

    /**
     * Detaches global event listeners.
     */
    private detachGlobalListeners(): void
    {
        if (this.boundClickOutside)
        {
            document.removeEventListener("pointerdown", this.boundClickOutside);
        }

        if (this.boundKeyDown)
        {
            document.removeEventListener("keydown", this.boundKeyDown);
        }

        if (this.boundWindowResize)
        {
            window.removeEventListener("resize", this.boundWindowResize);
        }
    }

    /**
     * Attaches a ResizeObserver to the regions container for overflow detection.
     */
    private attachResizeObserver(): void
    {
        if (!this.regionsContainerEl)
        {
            return;
        }

        this.resizeObserver = new ResizeObserver(() =>
        {
            this.debouncedOverflow();
        });

        this.resizeObserver.observe(this.regionsContainerEl);
    }

    /**
     * Detaches the ResizeObserver.
     */
    private detachResizeObserver(): void
    {
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // ========================================================================
    // S8: PRIVATE — CSS HELPERS, OVERFLOW, POSITIONING
    // ========================================================================

    /**
     * Applies CSS mode classes to the root element.
     */
    private applyModeClasses(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Clear mode classes
        this.rootEl.classList.remove(
            "toolbar-horizontal", "toolbar-vertical",
            "toolbar-docked", "toolbar-floating",
            "toolbar-docked-top", "toolbar-docked-bottom",
            "toolbar-docked-left", "toolbar-docked-right",
            "toolbar-contained"
        );

        // Add contained class if in contained mode
        if (this.contained)
        {
            this.rootEl.classList.add("toolbar-contained");
        }

        // Orientation
        this.rootEl.classList.add(
            `toolbar-${this.currentOrientation}`
        );

        // Mode
        if (this.currentMode === "docked")
        {
            this.rootEl.classList.add("toolbar-docked");
            this.rootEl.classList.add(
                `toolbar-docked-${this.currentDockPosition}`
            );
        }
        else
        {
            this.rootEl.classList.add("toolbar-floating");
        }

        // ARIA orientation
        this.rootEl.setAttribute(
            "aria-orientation", this.currentOrientation
        );

        // Grip visibility — hidden when dragging is disabled or contained.
        if (this.gripEl)
        {
            const showGrip = this.opts.draggable !== false
                && !this.contained;
            this.gripEl.style.display = showGrip ? "" : "none";
        }
    }

    /**
     * Applies positioning styles based on current mode.
     */
    private applyPositionStyles(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Contained mode: parent controls position via CSS layout
        if (this.contained)
        {
            this.rootEl.style.width = "100%";
            this.rootEl.style.top = "";
            this.rootEl.style.bottom = "";
            this.rootEl.style.left = "";
            this.rootEl.style.right = "";
            this.rootEl.style.height = "";
            return;
        }

        // Clear inline positioning
        this.rootEl.style.top = "";
        this.rootEl.style.bottom = "";
        this.rootEl.style.left = "";
        this.rootEl.style.right = "";
        this.rootEl.style.width = "";
        this.rootEl.style.height = "";

        if (this.currentMode === "floating")
        {
            this.rootEl.style.top = `${this.floatY}px`;
            this.rootEl.style.left = `${this.floatX}px`;

            const zIdx = this.opts.zIndex || Z_FLOATING;
            this.rootEl.style.zIndex = String(zIdx);
        }
        else
        {
            const zIdx = this.opts.zIndex || Z_DOCKED;
            this.rootEl.style.zIndex = String(zIdx);
        }

        // Apply size if set explicitly
        if (this.currentSize > 0)
        {
            this.applySizeStyle();
        }
    }

    /**
     * Applies the current size to the appropriate dimension.
     */
    private applySizeStyle(): void
    {
        if (!this.rootEl || this.currentSize <= 0)
        {
            return;
        }

        if (this.currentOrientation === "horizontal")
        {
            this.rootEl.style.width = `${this.currentSize}px`;
        }
        else
        {
            this.rootEl.style.height = `${this.currentSize}px`;
        }

        // Update ARIA on resize handle
        if (this.resizeHandleEl)
        {
            this.resizeHandleEl.setAttribute(
                "aria-valuenow", String(this.currentSize)
            );
        }
    }

    /**
     * Applies optional style overrides from options.
     */
    private applyStyleOverrides(root: HTMLElement): void
    {
        if (this.opts.backgroundColor)
        {
            root.style.backgroundColor = this.opts.backgroundColor;
        }

        if (this.opts.textColor)
        {
            root.style.color = this.opts.textColor;
        }

        if (this.opts.borderColor)
        {
            root.style.borderColor = this.opts.borderColor;
        }

        if (this.opts.fontFamily)
        {
            root.style.fontFamily = this.opts.fontFamily;
        }

        if (this.opts.fontSize)
        {
            root.style.fontSize = this.opts.fontSize;
        }
    }

    /**
     * Updates tool DOM element to reflect current config state.
     */
    private applyToolStateToDOM(
        el: HTMLElement,
        config: ToolItem | SplitButtonItem | GalleryItem
    ): void
    {
        const isActive = !!(config as any).active;
        const isDisabled = !!(config as any).disabled;
        const isHidden = !!(config as any).hidden;

        // Active state
        if (isActive)
        {
            el.classList.add("toolbar-tool-active");
        }
        else
        {
            el.classList.remove("toolbar-tool-active");
        }

        // Disabled state
        if (isDisabled)
        {
            el.classList.add("toolbar-tool-disabled");
            el.setAttribute("aria-disabled", "true");
        }
        else
        {
            el.classList.remove("toolbar-tool-disabled");
            el.removeAttribute("aria-disabled");
        }

        // Hidden state
        if (isHidden)
        {
            el.style.display = "none";
        }
        else
        {
            el.style.display = "";
        }

        // Toggle aria-pressed
        if ((config as any).toggle)
        {
            const btn = el.tagName === "BUTTON" ? el :
                el.querySelector(".toolbar-tool") as HTMLElement;

            if (btn)
            {
                btn.setAttribute("aria-pressed", isActive ? "true" : "false");
            }
        }

        // Update icon
        if ((config as any).icon)
        {
            const iconEl = el.querySelector(".toolbar-tool-icon");

            if (iconEl)
            {
                // Remove old bi-* classes except "bi" and "toolbar-tool-icon"
                const toRemove: string[] = [];

                iconEl.classList.forEach((cls) =>
                {
                    if (cls.startsWith("bi-"))
                    {
                        toRemove.push(cls);
                    }
                });

                toRemove.forEach((cls) => iconEl.classList.remove(cls));
                iconEl.classList.add((config as any).icon);
            }
        }

        // Update label
        if ((config as any).label)
        {
            const labelEl = el.querySelector(".toolbar-tool-label");

            if (labelEl)
            {
                labelEl.textContent = (config as any).label;
            }
        }

        // Update tooltip
        if ((config as any).tooltip)
        {
            const btn = el.tagName === "BUTTON" ? el :
                el.querySelector(".toolbar-tool") as HTMLElement;

            if (btn)
            {
                btn.setAttribute("title", (config as any).tooltip);
                btn.setAttribute("aria-label", (config as any).tooltip);
            }
        }
    }

    /**
     * Updates gallery DOM after selection change.
     */
    private updateGalleryDOM(galleryId: string): void
    {
        const el = this.toolElements.get(galleryId);
        const config = this.toolConfigs.get(galleryId) as GalleryItem;

        if (!el || !config)
        {
            return;
        }

        // Update option selected states
        const options = el.querySelectorAll(".toolbar-gallery-option");

        options.forEach((optEl) =>
        {
            const optId = optEl.getAttribute("data-option-id");
            const isSelected = (optId === config.selectedId);

            if (isSelected)
            {
                optEl.classList.add("toolbar-gallery-option-selected");
                optEl.setAttribute("aria-selected", "true");
            }
            else
            {
                optEl.classList.remove("toolbar-gallery-option-selected");
                optEl.setAttribute("aria-selected", "false");
            }
        });
    }

    /**
     * Rebuilds the split menu DOM for a specific split button.
     */
    private rebuildSplitMenu(splitId: string): void
    {
        const config = this.toolConfigs.get(splitId) as SplitButtonItem;
        const menu = this.splitMenuEls.get(splitId);

        if (!config || !menu)
        {
            return;
        }

        this.buildSplitMenuItems(menu, config.menuItems);
    }

    /**
     * Rebuilds all region DOM elements.
     */
    private rebuildRegionsDOM(): void
    {
        this.buildAllRegions();
        this.appendPortaledPopups();

        if (this.visible && this.rootEl)
        {
            this.initTooltips(this.rootEl);
        }
    }

    /**
     * Appends all portaled popup elements to rootEl.
     * Overflow menus, split menus, and gallery popups all use
     * position:fixed to escape overflow:hidden on regionsContainerEl.
     */
    private appendPortaledPopups(): void
    {
        if (!this.rootEl) { return; }

        if (this.leftOverflowMenuEl)
        {
            this.rootEl.appendChild(this.leftOverflowMenuEl);
        }
        if (this.rightOverflowMenuEl)
        {
            this.rootEl.appendChild(this.rightOverflowMenuEl);
        }

        this.splitMenuEls.forEach((el) => this.rootEl!.appendChild(el));
        this.galleryPopupEls.forEach((el) => this.rootEl!.appendChild(el));
    }

    /**
     * Calculates which tools overflow and hides/shows accordingly.
     * Sums direct-child sizes for accurate measurement.
     */
    private calculateOverflow(): void
    {
        if (!this.regionsContainerEl || !this.rootEl)
        {
            return;
        }

        this.resetOverflowState();

        const isH = (this.currentOrientation === "horizontal");
        const excess = this.measureOverflowExcess(isH);

        if (excess <= 0) { return; }

        const measurements = this.buildToolMeasurements(isH);
        const btnSize = this.currentToolSize + 8;
        this.hideExcessTools(measurements, excess + btnSize);
        this.showOverflowButtons();
        this.updateRegionVisibility();
    }

    /**
     * Resets all tools to visible and hides overflow buttons.
     */
    private resetOverflowState(): void
    {
        this.overflowedIds.clear();

        this.toolElements.forEach((el) =>
        {
            if (!el.closest(".toolbar-overflow-menu"))
            {
                el.style.display = "";
            }
        });

        // Reset regions hidden by updateRegionVisibility(); preserve
        // explicitly hidden regions (region.hidden = true).
        this.regionElements.forEach((el, id) =>
        {
            const cfg = this.regionConfigs.get(id);
            el.style.display = (cfg && cfg.hidden) ? "none" : "";
        });

        this.hideOverflowButtons();
    }

    /** Hides both overflow buttons. */
    private hideOverflowButtons(): void
    {
        if (this.leftOverflowBtnEl)
        {
            this.leftOverflowBtnEl.style.display = "none";
        }
        if (this.rightOverflowBtnEl)
        {
            this.rightOverflowBtnEl.style.display = "none";
        }
    }

    /**
     * Measures how much content exceeds available space.
     * Sums direct-child sizes (including margins) for reliable
     * measurement on flex containers where scrollWidth may be
     * clamped to clientWidth.
     */
    private measureOverflowExcess(isH: boolean): number
    {
        const el = this.regionsContainerEl!;
        const available = isH ? el.clientWidth : el.clientHeight;
        let content = 0;

        for (let i = 0; i < el.children.length; i++)
        {
            const child = el.children[i] as HTMLElement;
            if (child.style.display === "none") { continue; }
            content += this.measureChildOuterSize(child, isH);
        }

        return content - available;
    }

    /** Returns an element's outer size including margins. */
    private measureChildOuterSize(
        child: HTMLElement, isH: boolean
    ): number
    {
        const style = getComputedStyle(child);

        if (isH)
        {
            return child.offsetWidth
                + parseFloat(style.marginLeft)
                + parseFloat(style.marginRight);
        }

        return child.offsetHeight
            + parseFloat(style.marginTop)
            + parseFloat(style.marginBottom);
    }

    /**
     * Builds sorted tool measurements for the overflow algorithm.
     * Tools sorted by: priority (always→low→high→never), then
     * reverse registration order.
     */
    private buildToolMeasurements(
        isH: boolean
    ): Array<{ id: string; size: number; priority: ToolOverflowPriority }>
    {
        const tools: Array<{
            id: string; size: number; priority: ToolOverflowPriority;
        }> = [];

        this.toolConfigs.forEach((config, id) =>
        {
            if ((config as any).hidden) { return; }
            const el = this.toolElements.get(id);
            if (!el) { return; }
            const size = isH ? el.offsetWidth : el.offsetHeight;
            tools.push({
                id, size,
                priority: (config as any).overflowPriority || "low",
            });
        });

        return tools.reverse().sort(
            (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        );
    }

    /**
     * Hides tools by priority until excess space is recovered.
     * Reserves extra space for a second overflow button if both
     * groups have overflowed tools.
     */
    private hideExcessTools(
        tools: Array<{ id: string; size: number; priority: ToolOverflowPriority }>,
        excess: number
    ): void
    {
        const leftIds = this.buildGroupIdSet("left");
        const btnSize = this.currentToolSize + 8;
        let remaining = excess;
        let hasLeft = false;
        let hasRight = false;
        let reservedSecond = false;

        for (const tool of tools)
        {
            if (remaining <= 0) { break; }
            if (tool.priority === "never") { continue; }
            this.overflowTool(tool.id);
            remaining -= tool.size;
            if (leftIds.has(tool.id)) { hasLeft = true; }
            else { hasRight = true; }
            if (hasLeft && hasRight && !reservedSecond)
            {
                remaining += btnSize;
                reservedSecond = true;
            }
        }
    }

    /** Hides a single tool element and marks it as overflowed. */
    private overflowTool(id: string): void
    {
        this.overflowedIds.add(id);
        const el = this.toolElements.get(id);
        if (el) { el.style.display = "none"; }
    }

    /** Builds a Set of tool IDs belonging to regions of the given alignment. */
    private buildGroupIdSet(align: "left" | "right"): Set<string>
    {
        const ids = new Set<string>();

        for (const r of this.regions)
        {
            if ((r.align || "left") === align)
            {
                for (const item of r.items)
                {
                    if ("id" in item && (item as any).id)
                    {
                        ids.add((item as any).id);
                    }
                }
            }
        }

        return ids;
    }

    /**
     * Shows overflow buttons for groups that have overflowed tools.
     */
    private showOverflowButtons(): void
    {
        if (this.overflowedIds.size === 0) { return; }

        const leftIds = this.buildGroupIdSet("left");
        let hasLeft = false;
        let hasRight = false;

        this.overflowedIds.forEach((id) =>
        {
            if (leftIds.has(id)) { hasLeft = true; }
            else { hasRight = true; }
        });

        if (hasLeft && this.leftOverflowBtnEl)
        {
            this.leftOverflowBtnEl.style.display = "";
        }
        if (hasRight && this.rightOverflowBtnEl)
        {
            this.rightOverflowBtnEl.style.display = "";
        }
    }

    /**
     * Hides region titles and dividers when all tools in a region are overflowed.
     */
    private updateRegionVisibility(): void
    {
        for (const region of this.regions)
        {
            if (region.hidden) { continue; }

            const allOverflowed = region.items
                .filter((item) => "id" in item && (item as any).id)
                .every((item) => this.overflowedIds.has((item as any).id));

            const regionEl = this.regionElements.get(region.id);

            if (regionEl)
            {
                regionEl.style.display = allOverflowed ? "none" : "";
            }
        }
    }

    /**
     * Rebuilds the overflow dropdown menu for a specific group.
     */
    private rebuildOverflowMenu(
        group: "left" | "right", menuEl: HTMLElement
    ): void
    {
        menuEl.innerHTML = "";

        const { left, right } = this.partitionRegionsByAlign();
        const regions = (group === "left") ? left : right;
        let isFirst = true;

        for (const region of regions)
        {
            isFirst = this.appendOverflowRegionSection(
                region, isFirst, menuEl
            );
        }
    }

    /** Appends one region's overflowed items to a menu element. */
    private appendOverflowRegionSection(
        region: ToolbarRegion, isFirst: boolean, menuEl: HTMLElement
    ): boolean
    {
        const items = region.items.filter(
            (item) => "id" in item && this.overflowedIds.has((item as any).id)
        );
        if (items.length === 0) { return isFirst; }

        if (!isFirst)
        {
            const d = createElement("div", ["toolbar-overflow-divider"]);
            setAttr(d, { "role": "separator" });
            menuEl.appendChild(d);
        }
        if (region.title)
        {
            menuEl.appendChild(createElement(
                "span", ["toolbar-overflow-region-title"], region.title
            ));
        }
        this.appendOverflowItems(items, menuEl);
        return false;
    }

    /** Appends individual overflowed items to a menu element. */
    private appendOverflowItems(
        items: Array<ToolItem | SplitButtonItem | GalleryItem | ToolInputItem | ToolDropdownItem | ToolLabelItem | ToolSeparator>,
        menuEl: HTMLElement
    ): void
    {
        for (const item of items)
        {
            if ("type" in item && item.type === "separator") { continue; }
            const menuItem = this.buildOverflowItem(
                item as ToolItem | SplitButtonItem | GalleryItem
            );
            menuEl.appendChild(menuItem);
        }
    }

    /**
     * Builds a single overflow menu item for a tool.
     */
    private buildOverflowItem(
        config: ToolItem | SplitButtonItem | GalleryItem
    ): HTMLElement
    {
        const btn = createElement("button", ["toolbar-overflow-item"]);

        setAttr(btn, {
            "role": "menuitem",
            "data-tool-id": (config as any).id,
            "type": "button",
        });

        if ((config as any).disabled)
        {
            btn.classList.add("toolbar-tool-disabled");
            setAttr(btn, { "aria-disabled": "true" });
        }

        if ((config as any).icon)
        {
            const icon = createElement("i", ["bi", (config as any).icon]);
            btn.appendChild(icon);
        }

        const label = (config as any).label || (config as any).tooltip || "";
        const span = createElement("span", [], label);
        btn.appendChild(span);

        btn.addEventListener("click", () =>
        {
            this.closeAllPopups();

            if ("type" in config && config.type === "split-button")
            {
                this.handleSplitPrimaryClick(config);
            }
            else if ("type" in config && config.type === "gallery")
            {
                // Open gallery popup from overflow position
                this.toggleGalleryPopup(config.id);
            }
            else
            {
                this.handleToolClick(config as ToolItem);
            }
        });

        return btn;
    }

    /**
     * Positions a fixed popup below (horizontal) or beside (vertical) trigger.
     */
    private positionPopup(trigger: HTMLElement, popup: HTMLElement): void
    {
        const rect = trigger.getBoundingClientRect();
        const isH = (this.currentOrientation === "horizontal");

        if (isH)
        {
            popup.style.top = `${rect.bottom + 2}px`;
            popup.style.left = `${rect.left}px`;
        }
        else
        {
            popup.style.top = `${rect.top}px`;
            popup.style.left = `${rect.right + 2}px`;
        }

        this.flipPopupIfOffscreen(popup);
    }

    /** Flips a fixed popup if it exceeds viewport bounds. */
    private flipPopupIfOffscreen(popup: HTMLElement): void
    {
        const pr = popup.getBoundingClientRect();

        if (pr.bottom > window.innerHeight)
        {
            const top = parseFloat(popup.style.top) || 0;
            popup.style.top = `${top - (pr.bottom - window.innerHeight)}px`;
        }

        if (pr.right > window.innerWidth)
        {
            const left = parseFloat(popup.style.left) || 0;
            popup.style.left = `${left - (pr.right - window.innerWidth)}px`;
        }
    }

    /**
     * Sets the --toolbar-<position>-size CSS custom property on <html>.
     */
    private updateCssCustomProperties(): void
    {
        if (this.currentMode !== "docked" || !this.visible)
        {
            this.clearCssCustomProperties();
            return;
        }

        const root = document.documentElement;
        const size = this.getMeasuredCrossAxisSize();
        const prop = `--toolbar-${this.currentDockPosition}-size`;

        root.style.setProperty(prop, `${size}px`);
    }

    /**
     * Clears the toolbar CSS custom property from <html>.
     */
    private clearCssCustomProperties(): void
    {
        const root = document.documentElement;
        const positions: ToolbarDockPosition[] = [
            "top", "bottom", "left", "right"
        ];

        for (const pos of positions)
        {
            root.style.removeProperty(`--toolbar-${pos}-size`);
        }
    }

    /**
     * Returns the measured cross-axis size of the toolbar.
     */
    private getMeasuredCrossAxisSize(): number
    {
        if (!this.rootEl)
        {
            return 0;
        }

        if (this.currentOrientation === "horizontal")
        {
            return this.rootEl.offsetHeight;
        }

        return this.rootEl.offsetWidth;
    }

    /**
     * Returns the measured size along the orientation axis.
     */
    private getMeasuredSize(): number
    {
        if (!this.rootEl)
        {
            return 0;
        }

        if (this.currentOrientation === "horizontal")
        {
            return this.rootEl.offsetWidth;
        }

        return this.rootEl.offsetHeight;
    }

    /**
     * Returns the viewport size along the orientation axis.
     */
    private getViewportSize(): number
    {
        if (this.currentOrientation === "horizontal")
        {
            return window.innerWidth;
        }

        return window.innerHeight;
    }

    /**
     * Initialises Bootstrap tooltips on tool buttons within a container.
     */
    private initTooltips(container: HTMLElement): void
    {
        try
        {
            if (typeof bootstrap === "undefined" || !bootstrap.Tooltip)
            {
                return;
            }

            const triggers = container.querySelectorAll(
                '[data-bs-toggle="tooltip"]'
            );

            triggers.forEach((el) =>
            {
                const instance = new bootstrap.Tooltip(el);
                this.tooltipInstances.push(instance);
            });
        }
        catch (e)
        {
            // Bootstrap JS not available — tooltips degrade to title attribute
            console.debug(LOG_PREFIX, "Tooltip init skipped; Bootstrap JS not available.");
        }
    }

    /**
     * Disposes all Bootstrap tooltip instances.
     */
    private disposeTooltips(): void
    {
        for (const instance of this.tooltipInstances)
        {
            try
            {
                instance.dispose();
            }
            catch (e)
            {
                // Ignore disposal errors
            }
        }

        this.tooltipInstances = [];
    }

    /**
     * Disposes tooltip on a specific element.
     */
    private disposeTooltipOnElement(el: HTMLElement): void
    {
        try
        {
            if (typeof bootstrap !== "undefined" && bootstrap.Tooltip)
            {
                const instance = bootstrap.Tooltip.getInstance(el);

                if (instance)
                {
                    instance.dispose();
                }
            }
        }
        catch (e)
        {
            // Ignore
        }
    }

    /**
     * Internal dock implementation (no callbacks or persist).
     */
    private dockInternal(): void
    {
        this.currentMode = "docked";
        this.applyModeClasses();
        this.applyPositionStyles();

        if (this.visible)
        {
            this.recalculateOverflow();
            this.updateCssCustomProperties();
        }
    }

    /**
     * Internal float implementation (no callbacks or persist).
     */
    private floatInternal(): void
    {
        this.currentMode = "floating";
        this.applyModeClasses();
        this.applyPositionStyles();

        if (this.visible)
        {
            this.clearCssCustomProperties();
            this.recalculateOverflow();
        }
    }

    /**
     * Auto-corrects orientation to match dock position.
     */
    private autoCorrectOrientation(): void
    {
        if (this.currentMode !== "docked")
        {
            return;
        }

        const pos = this.currentDockPosition;

        if ((pos === "top" || pos === "bottom") &&
            this.currentOrientation !== "horizontal")
        {
            this.currentOrientation = "horizontal";
        }

        if ((pos === "left" || pos === "right") &&
            this.currentOrientation !== "vertical")
        {
            this.currentOrientation = "vertical";
        }
    }

    /**
     * Auto-corrects dock position to match orientation.
     */
    private autoCorrectDockPosition(): void
    {
        if (this.currentOrientation === "horizontal" &&
            (this.currentDockPosition === "left" || this.currentDockPosition === "right"))
        {
            this.currentDockPosition = "top";
        }

        if (this.currentOrientation === "vertical" &&
            (this.currentDockPosition === "top" || this.currentDockPosition === "bottom"))
        {
            this.currentDockPosition = "left";
        }
    }

    /**
     * Indexes all regions and their tools into lookup maps.
     */
    private indexRegionsAndTools(): void
    {
        for (const region of this.regions)
        {
            this.regionConfigs.set(region.id, region);
            this.indexToolsInRegion(region);
        }
    }

    /**
     * Indexes tools within a single region into the tool config map.
     */
    private indexToolsInRegion(region: ToolbarRegion): void
    {
        for (const item of region.items)
        {
            if ("id" in item && item.id)
            {
                this.toolConfigs.set(item.id, item as any);

                // Restore callbacks from original options
                this.restoreCallbacksFromOptions(item as any);
            }
        }
    }

    /**
     * Restores callback functions from the original options (lost in JSON copy).
     */
    private restoreCallbacksFromOptions(
        config: ToolItem | SplitButtonItem | GalleryItem
    ): void
    {
        if (!this.opts.regions)
        {
            return;
        }

        for (const region of this.opts.regions)
        {
            for (const item of region.items)
            {
                if ("id" in item && item.id === (config as any).id)
                {
                    this.restoreCallbacks(config, item as any);
                    return;
                }
            }
        }
    }

    /**
     * Copies callback references from source to target config.
     */
    private restoreCallbacks(
        target: any, source: any
    ): void
    {
        if (source.onClick)
        {
            target.onClick = source.onClick;
        }

        if (source.onSelect)
        {
            target.onSelect = source.onSelect;
        }

        // Restore split menu item callbacks
        if (source.menuItems && target.menuItems)
        {
            for (let i = 0; i < source.menuItems.length; i++)
            {
                if (source.menuItems[i].onClick && target.menuItems[i])
                {
                    target.menuItems[i].onClick = source.menuItems[i].onClick;
                }
            }
        }

        // Input/dropdown callbacks
        if (source.onInput)  { target.onInput  = source.onInput;  }
        if (source.onSubmit) { target.onSubmit = source.onSubmit; }
        if (source.onChange)  { target.onChange  = source.onChange;  }
    }

    /**
     * Checks whether any tool has a keyTip assigned.
     */
    private hasKeyTips(): boolean
    {
        for (const [, config] of this.toolConfigs)
        {
            if ((config as any).keyTip)
            {
                return true;
            }
        }

        return false;
    }

    /**
     * Attempts to match a pressed key against visible KeyTip badges.
     */
    private matchKeyTip(key: string): void
    {
        const upperKey = key.toUpperCase();
        const seen = new Set<string>();

        for (const [id, config] of this.toolConfigs)
        {
            const tip = ((config as any).keyTip || "").toUpperCase();

            if (!tip || tip !== upperKey)
            {
                continue;
            }

            if (seen.has(tip))
            {
                console.warn(LOG_PREFIX, "Duplicate KeyTip:", tip);
                continue;
            }

            seen.add(tip);

            if ((config as any).hidden || (config as any).disabled)
            {
                continue;
            }

            if (this.overflowedIds.has(id))
            {
                continue;
            }

            // Activate the tool
            if ("type" in config && config.type === "split-button")
            {
                this.toggleSplitMenu(id);
            }
            else if ("type" in config && config.type === "gallery")
            {
                this.toggleGalleryPopup(id);
            }
            else
            {
                this.handleToolClick(config as ToolItem);
            }

            return;
        }
    }

    /**
     * Auto-saves layout state if persistLayout is enabled.
     */
    private autoSave(): void
    {
        if (this.opts.persistLayout)
        {
            this.saveLayout();
        }
    }

    // ========================================================================
    // DOCK ZONE MANAGEMENT
    // ========================================================================

    /**
     * Creates and shows dock zone indicator overlays.
     */
    private showDockZones(): void
    {
        const positions: Array<{
            pos: ToolbarDockPosition;
            cls: string;
        }> = [
            { pos: "top", cls: "toolbar-dock-zone-top" },
            { pos: "bottom", cls: "toolbar-dock-zone-bottom" },
            { pos: "left", cls: "toolbar-dock-zone-left" },
            { pos: "right", cls: "toolbar-dock-zone-right" },
        ];

        for (const { cls } of positions)
        {
            const zone = createElement("div", ["toolbar-dock-zone", cls]);
            setAttr(zone, { "aria-hidden": "true" });
            document.body.appendChild(zone);
            this.dockZones.push(zone);
        }
    }

    /**
     * Updates dock zone active states based on pointer position.
     */
    private updateDockZones(clientX: number, clientY: number): void
    {
        const threshold = this.opts.dragToDockThreshold || DEFAULT_DOCK_THRESHOLD;

        // Calculate distance to each edge
        const distTop = clientY;
        const distBottom = window.innerHeight - clientY;
        const distLeft = clientX;
        const distRight = window.innerWidth - clientX;

        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        for (const zone of this.dockZones)
        {
            zone.classList.remove("toolbar-dock-zone-active");
        }

        if (minDist > threshold)
        {
            return;
        }

        // Activate nearest edge
        let activeIdx = -1;

        if (minDist === distTop)
        {
            activeIdx = 0;
        }
        else if (minDist === distBottom)
        {
            activeIdx = 1;
        }
        else if (minDist === distLeft)
        {
            activeIdx = 2;
        }
        else
        {
            activeIdx = 3;
        }

        if (activeIdx >= 0 && activeIdx < this.dockZones.length)
        {
            this.dockZones[activeIdx].classList.add("toolbar-dock-zone-active");
        }
    }

    /**
     * Returns the dock target position based on pointer proximity to edges.
     */
    private getDockTarget(
        clientX: number, clientY: number
    ): ToolbarDockPosition | null
    {
        const threshold = this.opts.dragToDockThreshold || DEFAULT_DOCK_THRESHOLD;
        const distTop = clientY;
        const distBottom = window.innerHeight - clientY;
        const distLeft = clientX;
        const distRight = window.innerWidth - clientX;
        const minDist = Math.min(distTop, distBottom, distLeft, distRight);

        if (minDist > threshold)
        {
            return null;
        }

        if (minDist === distTop)
        {
            return "top";
        }

        if (minDist === distBottom)
        {
            return "bottom";
        }

        if (minDist === distLeft)
        {
            return "left";
        }

        return "right";
    }

    /**
     * Removes all dock zone indicator elements from the DOM.
     */
    private removeDockZones(): void
    {
        for (const zone of this.dockZones)
        {
            zone.remove();
        }

        this.dockZones = [];
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates, shows, and returns a Toolbar instance.
 *
 * @param options - Toolbar configuration
 * @returns The created Toolbar instance
 */
export function createToolbar(options: ToolbarOptions): Toolbar
{
    const toolbar = new Toolbar(options);
    toolbar.show();
    return toolbar;
}

/**
 * Creates a docked toolbar. Defaults mode to "docked".
 *
 * @param options - Toolbar configuration (mode defaults to "docked")
 * @returns The created Toolbar instance
 */
export function createDockedToolbar(options: ToolbarOptions): Toolbar
{
    return createToolbar({ mode: "docked", ...options });
}

/**
 * Creates a floating toolbar. Defaults mode to "floating".
 *
 * @param options - Toolbar configuration (mode defaults to "floating")
 * @returns The created Toolbar instance
 */
export function createFloatingToolbar(options: ToolbarOptions): Toolbar
{
    return createToolbar({ mode: "floating", ...options });
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["Toolbar"] = Toolbar;
    (window as any)["createToolbar"] = createToolbar;
    (window as any)["createDockedToolbar"] = createDockedToolbar;
    (window as any)["createFloatingToolbar"] = createFloatingToolbar;
}
