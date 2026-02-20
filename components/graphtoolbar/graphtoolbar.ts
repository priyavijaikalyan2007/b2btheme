/*
 * ⚓ COMPONENT: GraphToolbar
 * 📜 PURPOSE: Factory function that creates a preconfigured Toolbar instance
 *    for graph visualization applications (ADR-030). Assembles standard regions
 *    for graph editing, layout selection, zoom controls, export, and search.
 * 🔗 RELATES: [[EnterpriseTheme]], [[Toolbar]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GraphToolbarLayout
{
    id: string;
    label: string;
    icon?: string;
}

export interface GraphToolbarOptions
{
    layouts?: GraphToolbarLayout[];
    defaultLayout?: string;
    showUndo?: boolean;
    showRedo?: boolean;
    showDelete?: boolean;
    showLayoutSelector?: boolean;
    showZoomControls?: boolean;
    showGridSnap?: boolean;
    showMinimap?: boolean;
    showExport?: boolean;
    showSearch?: boolean;
    exportFormats?: Array<"png" | "svg" | "json" | "pdf">;
    initialZoom?: number;
    gridSnapEnabled?: boolean;
    minimapEnabled?: boolean;
    enableKeyboardShortcuts?: boolean;
    toolbarOptions?: Record<string, unknown>;
    onUndo?: () => void;
    onRedo?: () => void;
    onDelete?: () => void;
    onLayoutChange?: (layoutId: string) => void;
    onApplyLayout?: (layoutId: string) => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onZoomToFit?: () => void;
    onZoomChange?: (zoom: number) => void;
    onGridSnapToggle?: (enabled: boolean) => void;
    onMinimapToggle?: (enabled: boolean) => void;
    onExport?: (format: string) => void;
    onSearch?: (query: string) => void;
    onSearchSubmit?: (query: string) => void;
}

export interface GraphToolbarHandle
{
    toolbar: unknown;
    setZoomLabel(zoom: number): void;
    setGridSnapState(enabled: boolean): void;
    setMinimapState(enabled: boolean): void;
    setUndoEnabled(enabled: boolean): void;
    setRedoEnabled(enabled: boolean): void;
    setDeleteEnabled(enabled: boolean): void;
    setLayout(layoutId: string): void;
    destroy(): void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[GraphToolbar]";

const DEFAULT_LAYOUTS: GraphToolbarLayout[] = [
    { id: "hierarchical", label: "Hierarchical" },
    { id: "force-directed", label: "Force-Directed" },
    { id: "circular", label: "Circular" },
    { id: "tree", label: "Tree" },
    { id: "grid", label: "Grid" },
    { id: "custom", label: "Custom" },
];

const EXPORT_FORMAT_LABELS: Record<string, string> = {
    png: "Export as PNG",
    svg: "Export as SVG",
    json: "Export as JSON",
    pdf: "Export as PDF",
};

// ============================================================================
// HELPERS
// ============================================================================

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "Callback error:", err); }
}

// ============================================================================
// REGION BUILDERS
// ============================================================================

function buildActionsRegion(opts: GraphToolbarOptions): Record<string, unknown> | null
{
    const showUndo = opts.showUndo !== false;
    const showRedo = opts.showRedo !== false;
    const showDelete = opts.showDelete !== false;

    if (!showUndo && !showRedo && !showDelete) { return null; }

    const items: Record<string, unknown>[] = [];

    if (showUndo)
    {
        items.push({
            id: "gt-undo", icon: "bi-arrow-counterclockwise",
            tooltip: "Undo", overflowPriority: "high",
            disabled: false,
            onClick: () => safeCallback(opts.onUndo),
        });
    }

    if (showRedo)
    {
        items.push({
            id: "gt-redo", icon: "bi-arrow-clockwise",
            tooltip: "Redo", overflowPriority: "high",
            disabled: false,
            onClick: () => safeCallback(opts.onRedo),
        });
    }

    if (showDelete)
    {
        items.push({
            id: "gt-delete", icon: "bi-trash",
            tooltip: "Delete selected", overflowPriority: "low",
            disabled: false,
            onClick: () => safeCallback(opts.onDelete),
        });
    }

    return { id: "gt-actions", title: "Graph Actions", items, align: "left" };
}

function buildLayoutRegion(opts: GraphToolbarOptions): Record<string, unknown> | null
{
    if (opts.showLayoutSelector === false) { return null; }

    const layouts = opts.layouts && opts.layouts.length > 0
        ? opts.layouts : DEFAULT_LAYOUTS;

    if (layouts.length === 0)
    {
        console.warn(LOG_PREFIX, "Empty layouts array; hiding layout region");
        return null;
    }

    const defaultId = resolveDefaultLayout(opts.defaultLayout, layouts);
    let currentLayout = defaultId;

    const items: Record<string, unknown>[] = [
        {
            type: "dropdown", id: "gt-layout-select",
            tooltip: "Layout algorithm",
            options: layouts.map(l => ({ value: l.id, label: l.label })),
            value: defaultId, width: "140px",
            overflowPriority: "low",
            onChange: (value: string) =>
            {
                currentLayout = value;
                safeCallback(opts.onLayoutChange, value);
            },
        },
        {
            id: "gt-layout-apply", icon: "bi-play-fill",
            tooltip: "Apply layout", overflowPriority: "low",
            onClick: () => safeCallback(opts.onApplyLayout, currentLayout),
        },
    ];

    return { id: "gt-layout", title: "Layout", items, align: "left" };
}

function resolveDefaultLayout(
    defaultId: string | undefined,
    layouts: GraphToolbarLayout[]
): string
{
    if (defaultId)
    {
        const found = layouts.find(l => l.id === defaultId);
        if (found) { return found.id; }
        console.warn(LOG_PREFIX, "defaultLayout not found:", defaultId,
            "- falling back to first");
    }
    return layouts[0].id;
}

function buildViewRegion(opts: GraphToolbarOptions): Record<string, unknown> | null
{
    const showZoom = opts.showZoomControls !== false;
    const showGrid = opts.showGridSnap !== false;
    const showMap = opts.showMinimap !== false;

    if (!showZoom && !showGrid && !showMap) { return null; }

    const items: Record<string, unknown>[] = [];
    const zoom = clampZoom(opts.initialZoom);

    if (showZoom)
    {
        items.push(
            {
                id: "gt-zoom-out", icon: "bi-dash-lg",
                tooltip: "Zoom out", overflowPriority: "high",
                onClick: () => safeCallback(opts.onZoomOut),
            },
            {
                type: "label", id: "gt-zoom-label",
                text: zoom + "%", overflowPriority: "low",
            },
            {
                id: "gt-zoom-in", icon: "bi-plus-lg",
                tooltip: "Zoom in", overflowPriority: "high",
                onClick: () => safeCallback(opts.onZoomIn),
            },
            {
                id: "gt-zoom-fit", icon: "bi-fullscreen",
                tooltip: "Zoom to fit", overflowPriority: "low",
                onClick: () => safeCallback(opts.onZoomToFit),
            }
        );
    }

    if (showGrid)
    {
        items.push({
            id: "gt-grid-snap", icon: "bi-grid-3x3",
            tooltip: "Grid snap", toggle: true,
            active: !!opts.gridSnapEnabled, overflowPriority: "low",
            onClick: (_tool: unknown, active: boolean) =>
                safeCallback(opts.onGridSnapToggle, active),
        });
    }

    if (showMap)
    {
        items.push({
            id: "gt-minimap", icon: "bi-map",
            tooltip: "Minimap", toggle: true,
            active: !!opts.minimapEnabled, overflowPriority: "low",
            onClick: (_tool: unknown, active: boolean) =>
                safeCallback(opts.onMinimapToggle, active),
        });
    }

    return { id: "gt-view", title: "View", items, align: "left" };
}

function clampZoom(val: number | undefined): number
{
    if (val === undefined || val === null) { return 100; }
    if (isNaN(val) || val <= 0)
    {
        console.warn(LOG_PREFIX, "Invalid initialZoom:", val, "- clamping to 1");
        return 1;
    }
    return Math.round(val);
}

function buildExportRegion(opts: GraphToolbarOptions): Record<string, unknown> | null
{
    if (opts.showExport === false) { return null; }

    const formats = opts.exportFormats && opts.exportFormats.length > 0
        ? opts.exportFormats : ["png", "svg", "json"] as const;

    if (formats.length === 0)
    {
        console.warn(LOG_PREFIX, "Empty exportFormats; hiding export region");
        return null;
    }

    const dropdownOpts = formats.map(f => ({
        value: f,
        label: EXPORT_FORMAT_LABELS[f] || ("Export as " + f.toUpperCase()),
    }));

    const items: Record<string, unknown>[] = [
        {
            type: "dropdown", id: "gt-export",
            tooltip: "Export", icon: "bi-download",
            options: [{ value: "", label: "Export..." }, ...dropdownOpts],
            value: "", width: "140px",
            overflowPriority: "low",
            onChange: (value: string) =>
            {
                if (value) { safeCallback(opts.onExport, value); }
            },
        },
    ];

    return { id: "gt-export", title: "Export", items, align: "right" };
}

function buildSearchRegion(opts: GraphToolbarOptions): Record<string, unknown> | null
{
    if (opts.showSearch === false) { return null; }

    const items: Record<string, unknown>[] = [
        {
            type: "input", id: "gt-search",
            placeholder: "Search nodes...",
            icon: "bi-search", width: "180px",
            overflowPriority: "low",
            onInput: (value: string) => safeCallback(opts.onSearch, value),
            onSubmit: (value: string) => safeCallback(opts.onSearchSubmit, value),
        },
    ];

    return { id: "gt-search", title: "Search", items, align: "right" };
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

interface ShortcutContext
{
    handler: (e: KeyboardEvent) => void;
    destroyed: boolean;
}

function registerShortcuts(
    opts: GraphToolbarOptions,
    ctx: ShortcutContext
): void
{
    ctx.handler = (e: KeyboardEvent) =>
    {
        if (ctx.destroyed) { return; }
        if (isInputFocused()) { return; }
        if (isModalOpen()) { return; }

        const key = e.key.toLowerCase();
        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && key === "z" && !e.shiftKey && opts.showUndo !== false)
        {
            e.preventDefault();
            safeCallback(opts.onUndo);
        }
        else if (ctrl && (key === "y" || (key === "z" && e.shiftKey))
            && opts.showRedo !== false)
        {
            e.preventDefault();
            safeCallback(opts.onRedo);
        }
        else if (key === "delete" && opts.showDelete !== false)
        {
            safeCallback(opts.onDelete);
        }
        else if (ctrl && (key === "=" || key === "+")
            && opts.showZoomControls !== false)
        {
            e.preventDefault();
            safeCallback(opts.onZoomIn);
        }
        else if (ctrl && key === "-" && opts.showZoomControls !== false)
        {
            e.preventDefault();
            safeCallback(opts.onZoomOut);
        }
        else if (ctrl && key === "0" && opts.showZoomControls !== false)
        {
            e.preventDefault();
            safeCallback(opts.onZoomToFit);
        }
    };

    document.addEventListener("keydown", ctx.handler);
}

function isInputFocused(): boolean
{
    const el = document.activeElement;
    if (!el) { return false; }
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
        || (el as HTMLElement).isContentEditable;
}

function isModalOpen(): boolean
{
    return !!document.querySelector(".modal-backdrop");
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createGraphToolbar(
    options: GraphToolbarOptions,
    containerId?: string
): GraphToolbarHandle
{
    console.log(LOG_PREFIX, "Creating graph toolbar");

    const regions: Record<string, unknown>[] = [];

    const actionsRegion = buildActionsRegion(options);
    if (actionsRegion) { regions.push(actionsRegion); }

    const layoutRegion = buildLayoutRegion(options);
    if (layoutRegion) { regions.push(layoutRegion); }

    const viewRegion = buildViewRegion(options);
    if (viewRegion) { regions.push(viewRegion); }

    const exportRegion = buildExportRegion(options);
    if (exportRegion) { regions.push(exportRegion); }

    const searchRegion = buildSearchRegion(options);
    if (searchRegion) { regions.push(searchRegion); }

    if (regions.length === 0)
    {
        console.warn(LOG_PREFIX, "All regions disabled; creating empty toolbar");
    }

    console.log(LOG_PREFIX, "Built", regions.length, "regions");

    // Merge with consumer toolbar options
    const consumerOpts = (options.toolbarOptions || {}) as Record<string, unknown>;
    const consumerRegions = (consumerOpts.regions || []) as Record<string, unknown>[];

    const toolbarConfig: Record<string, unknown> = {
        label: "Graph toolbar",
        orientation: "horizontal",
        mode: "docked",
        dockPosition: "top",
        style: "icon",
        overflow: true,
        cssClass: "graphtoolbar",
        ...consumerOpts,
        regions: [...regions, ...consumerRegions],
    };

    // Access the global createToolbar
    const win = window as unknown as Record<string, unknown>;
    const createToolbarFn = win["createToolbar"] as
        ((opts: Record<string, unknown>) => unknown) | undefined;

    if (!createToolbarFn)
    {
        console.error(LOG_PREFIX, "Toolbar component not loaded.",
            "Ensure toolbar.js is loaded before graphtoolbar.js.");
        throw new Error("Toolbar component not loaded");
    }

    // If containerId is specified, use contained mode
    let toolbarInstance: unknown;

    if (containerId)
    {
        toolbarConfig.contained = true;
        const ToolbarClass = win["Toolbar"] as
            (new (opts: Record<string, unknown>) => {
                show(container?: HTMLElement): void;
                destroy(): void;
                setToolState(id: string, state: Record<string, unknown>): void;
                getElement(): HTMLElement | null;
            }) | undefined;

        if (ToolbarClass)
        {
            const container = document.getElementById(containerId);
            if (!container)
            {
                console.error(LOG_PREFIX, "Container not found:", containerId);
                throw new Error("Container not found: " + containerId);
            }
            const tb = new ToolbarClass(toolbarConfig);
            tb.show(container);
            toolbarInstance = tb;
        }
        else
        {
            toolbarInstance = createToolbarFn(toolbarConfig);
        }
    }
    else
    {
        toolbarInstance = createToolbarFn(toolbarConfig);
    }

    // Keyboard shortcuts
    const shortcutCtx: ShortcutContext = {
        handler: () => {},
        destroyed: false,
    };

    if (options.enableKeyboardShortcuts !== false)
    {
        registerShortcuts(options, shortcutCtx);
    }

    // Build handle
    const handle = buildHandle(toolbarInstance, options, shortcutCtx);

    console.log(LOG_PREFIX, "Graph toolbar created successfully");
    return handle;
}

// ============================================================================
// HANDLE BUILDER
// ============================================================================

function buildHandle(
    toolbar: unknown,
    options: GraphToolbarOptions,
    shortcutCtx: ShortcutContext
): GraphToolbarHandle
{
    const tb = toolbar as {
        setToolState(id: string, state: Record<string, unknown>): void;
        destroy(): void;
        getElement(): HTMLElement | null;
    };

    let destroyed = false;

    return {
        toolbar,

        setZoomLabel(zoom: number): void
        {
            const display = isNaN(zoom) ? "\u2014" : Math.round(zoom) + "%";
            if (isNaN(zoom))
            {
                console.warn(LOG_PREFIX, "setZoomLabel called with NaN");
            }
            tb.setToolState("gt-zoom-label", { label: display });
            safeCallback(options.onZoomChange, isNaN(zoom) ? 0 : zoom);
        },

        setGridSnapState(enabled: boolean): void
        {
            tb.setToolState("gt-grid-snap", { active: enabled });
        },

        setMinimapState(enabled: boolean): void
        {
            tb.setToolState("gt-minimap", { active: enabled });
        },

        setUndoEnabled(enabled: boolean): void
        {
            tb.setToolState("gt-undo", { disabled: !enabled });
        },

        setRedoEnabled(enabled: boolean): void
        {
            tb.setToolState("gt-redo", { disabled: !enabled });
        },

        setDeleteEnabled(enabled: boolean): void
        {
            tb.setToolState("gt-delete", { disabled: !enabled });
        },

        setLayout(layoutId: string): void
        {
            const layouts = options.layouts && options.layouts.length > 0
                ? options.layouts : DEFAULT_LAYOUTS;
            const found = layouts.find(l => l.id === layoutId);
            if (!found)
            {
                console.warn(LOG_PREFIX, "setLayout: unknown ID:", layoutId);
                return;
            }
            // Update the dropdown value via setToolState
            tb.setToolState("gt-layout-select", { label: found.label });
        },

        destroy(): void
        {
            if (destroyed) { return; }
            destroyed = true;
            shortcutCtx.destroyed = true;

            if (shortcutCtx.handler)
            {
                document.removeEventListener("keydown", shortcutCtx.handler);
            }

            tb.destroy();
            console.log(LOG_PREFIX, "Destroyed");
        },
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["createGraphToolbar"] = createGraphToolbar;
