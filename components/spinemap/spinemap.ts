/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SpineMap
 * 📜 PURPOSE: Interactive SVG capability/feature map with a central spine,
 *    branching sub-nodes, multiple layout algorithms, zoom/pan, status
 *    color coding, cross-branch connections, and integrated editing.
 * 🔗 RELATES: [[EnterpriseTheme]], [[TreeGrid]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer] -> [createSpineMap()] -> [SVG canvas + sidebar + popover]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type NodeStatus = "available" | "in-progress" | "planned"
    | "not-supported" | "deprecated" | "custom";

export type LayoutMode = "vertical" | "horizontal" | "radial" | "winding";

export type ConnectionType = "depends-on" | "works-with" | "blocks" | "enhances";

export type SpinePopoverFieldType =
    // HTML native
    | "text" | "number" | "email" | "url" | "tel"
    | "textarea" | "select" | "checkbox" | "range"
    // Library pickers
    | "datepicker" | "timepicker" | "durationpicker" | "cronpicker"
    | "timezonepicker" | "periodpicker" | "sprintpicker"
    | "colorpicker" | "symbolpicker" | "fontdropdown"
    // Library text/content
    | "richtextinput" | "maskedentry" | "editablecombobox"
    // Library multi-value
    | "multiselectcombo" | "tagger" | "peoplepicker"
    // Library editors
    | "codeeditor" | "markdowneditor"
    // Built-in special types
    | "status" | "connections" | "link"
    // Fully custom
    | "custom";

export interface SpinePopoverFieldConfig
{
    key: string;
    label: string;
    type: SpinePopoverFieldType;
    source?: "property" | "metadata";
    showInView?: boolean;
    showInEdit?: boolean;
    componentOptions?: Record<string, unknown>;
    selectOptions?: { value: string; label: string }[];
    serialize?: (value: unknown) => string;
    deserialize?: (stored: string) => unknown;
    renderView?: (
        value: unknown,
        node: SpineHub | SpineBranch
    ) => HTMLElement;
    required?: boolean;
    hint?: string;
    cssClass?: string;
    width?: "compact" | "full";
}

export interface SpineBranch
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    children?: SpineBranch[];
}

export interface SpineHub
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    branches: SpineBranch[];
}

export interface SpineConnection
{
    from: string;
    to: string;
    type: ConnectionType;
    label?: string;
}

export interface SpineMapData
{
    hubs: SpineHub[];
    connections?: SpineConnection[];
}

export interface SpineFieldAdapter
{
    mount(container: HTMLElement, value: unknown): void;
    getValue(): unknown;
    renderView(value: unknown): HTMLElement;
    destroy(): void;
}

interface DeferredMount
{
    adapter: SpineFieldAdapter;
    slot: HTMLElement;
    value: unknown;
}

export interface SpineMapOptions
{
    container: HTMLElement;
    data?: SpineMapData;
    layout?: LayoutMode;
    hubSpacing?: number;
    branchSpacing?: number;
    branchLength?: number;
    /** Max hubs per row in winding/serpentine layout. Default: 3. */
    windingHubsPerRow?: number;
    editable?: boolean;
    sidebarPosition?: "left" | "right" | "none";
    sidebarWidth?: number;
    statusColors?: Partial<Record<NodeStatus, string>>;
    minZoom?: number;
    maxZoom?: number;
    initialZoom?: number;
    showToolbar?: boolean;
    showConnections?: boolean;
    showStatusLegend?: boolean;
    fitOnLoad?: boolean;
    size?: "sm" | "md" | "lg";
    cssClass?: string;
    popoverFields?: SpinePopoverFieldConfig[];
    popoverWidth?: number;
    onNodeClick?: (node: SpineHub | SpineBranch) => void;
    onNodeDoubleClick?: (node: SpineHub | SpineBranch) => void;
    onNodeHover?: (node: SpineHub | SpineBranch | null) => void;
    onNodeAdd?: (node: SpineHub | SpineBranch, parentId: string | null) => void;
    onNodeChange?: (nodeId: string, changes: Partial<SpineHub | SpineBranch>) => void;
    onNodeRemove?: (nodeId: string) => void;
    onNodeReparent?: (nodeId: string, newParentId: string | null) => void;
    onConnectionAdd?: (conn: SpineConnection) => void;
    onConnectionRemove?: (connId: string) => void;
    onLayoutChange?: (layout: string) => void;
    onZoomChange?: (zoom: number) => void;
    /** Custom confirm callback for destructive actions (remove node/connection).
     *  Receives a message string, returns a Promise<boolean>.
     *  Default: uses ConfirmDialog component if available, else browser confirm(). */
    onConfirmRemove?: (message: string) => Promise<boolean>;
}

// Internal position type
interface NodePos
{
    x: number;
    y: number;
}

// Internal node entry for flat lookup
interface NodeEntry
{
    type: "hub" | "branch";
    data: SpineHub | SpineBranch;
    parentId: string | null;
    depth: number;
}

// Layout options subset
interface LayoutOpts
{
    hubSpacing: number;
    branchSpacing: number;
    branchLength: number;
    canvasWidth: number;
    canvasHeight: number;
    windingHubsPerRow: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SpineMap]";
const SVG_NS = "http://www.w3.org/2000/svg";

const DEFAULT_HUB_SPACING = 180;
const DEFAULT_BRANCH_SPACING = 50;
const DEFAULT_BRANCH_LENGTH = 140;
const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_MIN_ZOOM = 0.1;
const DEFAULT_MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.15;
const PAN_STEP = 40;
const FIT_PADDING = 60;
const CONN_CURVE_OFFSET = 40;
const COLLISION_ITERATIONS = 4;
const DEFAULT_WINDING_HUBS_PER_ROW = 3;

const NODE_PROPERTY_KEYS = new Set([
    "label", "status", "timeframe", "link",
    "description", "statusLabel", "statusColor"
]);

const DEFAULT_POPOVER_FIELDS: SpinePopoverFieldConfig[] =
[
    {
        key: "status", label: "Status", type: "status",
        showInView: true, showInEdit: true
    },
    {
        key: "timeframe", label: "Timeframe", type: "text",
        showInView: true, showInEdit: true
    },
    {
        key: "link", label: "Link", type: "link",
        showInView: true, showInEdit: true
    },
    {
        key: "description", label: "Description", type: "textarea",
        showInView: true, showInEdit: true
    },
    {
        key: "connections", label: "Connections", type: "connections",
        showInView: true, showInEdit: false
    }
];

const STATUS_COLORS: Record<string, string> =
{
    "available": "#198754",
    "in-progress": "#0d6efd",
    "planned": "#ffc107",
    "not-supported": "#adb5bd",
    "deprecated": "#dc3545",
    "custom": "#6f42c1"
};

const STATUS_LABELS: Record<string, string> =
{
    "available": "Available",
    "in-progress": "In Progress",
    "planned": "Planned",
    "not-supported": "Not Supported",
    "deprecated": "Deprecated"
};

const CONN_COLORS: Record<string, string> =
{
    "depends-on": "#fd7e14",
    "works-with": "#0d6efd",
    "blocks": "#dc3545",
    "enhances": "#198754"
};

const CONN_DASH: Record<string, string> =
{
    "depends-on": "6,3",
    "works-with": "2,4",
    "blocks": "none",
    "enhances": "8,3,2,3"
};

const SIZE_HUB_RADIUS: Record<string, number> =
    { sm: 24, md: 32, lg: 40 };
const SIZE_LEAF_WIDTH: Record<string, number> =
    { sm: 140, md: 180, lg: 220 };
const SIZE_LEAF_HEIGHT: Record<string, number> =
    { sm: 26, md: 30, lg: 36 };
const SIZE_FONT: Record<string, number> =
    { sm: 11, md: 13, lg: 15 };

// ============================================================================
// DOM HELPERS
// ============================================================================

function htmlEl(
    tag: string,
    attrs?: Record<string, string>,
    text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(
    el: Element,
    key: string,
    val: string
): void
{
    el.setAttribute(key, val);
}

function setAttrs(
    el: Element,
    attrs: Record<string, string>
): void
{
    for (const [k, v] of Object.entries(attrs))
    {
        el.setAttribute(k, v);
    }
}

// ============================================================================
// SVG HELPERS
// ============================================================================

function svgCreate(
    tag: string,
    attrs?: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);
    if (attrs) { setAttrs(el, attrs); }
    return el;
}

function svgPath(d: string, attrs?: Record<string, string>): SVGElement
{
    const p = svgCreate("path", { d, ...attrs });
    return p;
}

function resolveStatusColor(
    node: SpineHub | SpineBranch,
    custom?: Partial<Record<NodeStatus, string>>
): string
{
    if (node.statusColor) { return node.statusColor; }
    const s = node.status || "available";
    if (custom && custom[s]) { return custom[s]!; }
    return STATUS_COLORS[s] || STATUS_COLORS["available"];
}

function truncLabel(label: string, maxChars: number): string
{
    if (label.length <= maxChars) { return label; }
    return label.slice(0, maxChars - 1) + "\u2026";
}

function safeCallback<T>(fn: T | undefined, ...args: unknown[]): void
{
    if (typeof fn === "function")
    {
        try { (fn as Function)(...args); }
        catch (e) { console.error(`${LOG_PREFIX} callback error`, e); }
    }
}

// ============================================================================
// FIELD ADAPTER HELPERS
// ============================================================================

let adapterIdSeq = 0;

function nextAdapterId(): string
{
    adapterIdSeq++;
    return `spine-field-${adapterIdSeq}`;
}

// ── Source auto-detection ──

function resolveSource(
    cfg: SpinePopoverFieldConfig
): "property" | "metadata"
{
    if (cfg.source) { return cfg.source; }
    return NODE_PROPERTY_KEYS.has(cfg.key) ? "property" : "metadata";
}

// ── Read / write field values ──

function readFieldValue(
    node: SpineHub | SpineBranch,
    cfg: SpinePopoverFieldConfig
): string
{
    const src = resolveSource(cfg);
    if (src === "metadata")
    {
        return node.metadata?.[cfg.key] ?? "";
    }
    return ((node as unknown as Record<string, unknown>)[cfg.key] as string) ?? "";
}

function writeFieldValue(
    changes: Record<string, unknown>,
    cfg: SpinePopoverFieldConfig,
    adapter: SpineFieldAdapter
): void
{
    const raw = adapter.getValue();
    const serialized = cfg.serialize
        ? cfg.serialize(raw)
        : defaultSerialize(cfg.type, raw);
    const src = resolveSource(cfg);
    if (src === "metadata")
    {
        if (!changes["metadata"])
        {
            changes["metadata"] = {};
        }
        (changes["metadata"] as Record<string, string>)[cfg.key] =
            serialized;
    }
    else
    {
        changes[cfg.key] = serialized || undefined;
    }
}

// ── Default serializers / deserializers ──

function defaultSerialize(
    type: SpinePopoverFieldType,
    value: unknown
): string
{
    if (value == null) { return ""; }
    if (type === "checkbox")
    {
        return value ? "true" : "false";
    }
    if (type === "datepicker" && value instanceof Date)
    {
        return value.toISOString();
    }
    if (isStructuredType(type))
    {
        return typeof value === "string" ? value : JSON.stringify(value);
    }
    return String(value);
}

function defaultDeserialize(
    type: SpinePopoverFieldType,
    stored: string
): unknown
{
    if (!stored) { return stored; }
    if (type === "checkbox") { return stored === "true"; }
    if (type === "datepicker") { return new Date(stored); }
    if (isStructuredType(type))
    {
        try { return JSON.parse(stored); }
        catch { return stored; }
    }
    if (type === "number" || type === "range")
    {
        const n = Number(stored);
        return isNaN(n) ? stored : n;
    }
    return stored;
}

function isStructuredType(type: SpinePopoverFieldType): boolean
{
    return [
        "timepicker", "durationpicker", "periodpicker",
        "sprintpicker", "tagger", "peoplepicker",
        "multiselectcombo"
    ].indexOf(type) >= 0;
}

// ============================================================================
// NATIVE HTML ADAPTERS
// ============================================================================

class NativeInputAdapter implements SpineFieldAdapter
{
    private el: HTMLInputElement | null = null;
    private inputType: string;

    constructor(inputType: string)
    {
        this.inputType = inputType;
    }

    mount(container: HTMLElement, value: unknown): void
    {
        this.el = htmlEl("input", {
            type: this.inputType,
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        if (this.inputType === "checkbox")
        {
            (this.el as HTMLInputElement).checked = !!value;
        }
        container.appendChild(this.el);
    }

    getValue(): unknown
    {
        if (!this.el) { return ""; }
        if (this.inputType === "checkbox")
        {
            return this.el.checked;
        }
        if (this.inputType === "number" || this.inputType === "range")
        {
            return this.el.valueAsNumber;
        }
        return this.el.value;
    }

    renderView(value: unknown): HTMLElement
    {
        if (this.inputType === "checkbox")
        {
            return htmlEl("span", {
                class: "spinemap-popover-value"
            }, value ? "\u2713" : "\u2717");
        }
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, String(value ?? ""));
    }

    destroy(): void { this.el = null; }
}

class NativeTextareaAdapter implements SpineFieldAdapter
{
    private el: HTMLTextAreaElement | null = null;

    mount(container: HTMLElement, value: unknown): void
    {
        this.el = htmlEl("textarea", {
            class: "spinemap-edit-textarea",
            rows: "2"
        }) as HTMLTextAreaElement;
        this.el.value = String(value ?? "");
        container.appendChild(this.el);
    }

    getValue(): unknown
    {
        return this.el ? this.el.value : "";
    }

    renderView(value: unknown): HTMLElement
    {
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, String(value ?? ""));
    }

    destroy(): void { this.el = null; }
}

class NativeSelectAdapter implements SpineFieldAdapter
{
    private el: HTMLSelectElement | null = null;
    private options: { value: string; label: string }[];

    constructor(options: { value: string; label: string }[])
    {
        this.options = options;
    }

    mount(container: HTMLElement, value: unknown): void
    {
        this.el = htmlEl("select", {
            class: "spinemap-edit-select"
        }) as HTMLSelectElement;
        for (const opt of this.options)
        {
            const o = htmlEl("option", {
                value: opt.value
            }, opt.label) as HTMLOptionElement;
            if (opt.value === String(value)) { o.selected = true; }
            this.el.appendChild(o);
        }
        container.appendChild(this.el);
    }

    getValue(): unknown
    {
        return this.el ? this.el.value : "";
    }

    renderView(value: unknown): HTMLElement
    {
        const match = this.options.find(o => o.value === String(value));
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, match ? match.label : String(value ?? ""));
    }

    destroy(): void { this.el = null; }
}

// ============================================================================
// BUILT-IN SPECIAL ADAPTERS
// ============================================================================

class StatusFieldAdapter implements SpineFieldAdapter
{
    private el: HTMLSelectElement | null = null;
    private statusColors: Partial<Record<NodeStatus, string>> | undefined;

    constructor(
        statusColors?: Partial<Record<NodeStatus, string>>
    )
    {
        this.statusColors = statusColors;
    }

    mount(container: HTMLElement, value: unknown): void
    {
        this.el = htmlEl("select", {
            class: "spinemap-edit-select"
        }) as HTMLSelectElement;
        const statuses: NodeStatus[] = [
            "available", "in-progress", "planned",
            "not-supported", "deprecated"
        ];
        for (const s of statuses)
        {
            const o = htmlEl("option", { value: s },
                STATUS_LABELS[s]) as HTMLOptionElement;
            if (s === String(value)) { o.selected = true; }
            this.el.appendChild(o);
        }
        container.appendChild(this.el);
    }

    getValue(): unknown
    {
        return this.el ? this.el.value : "available";
    }

    renderView(value: unknown): HTMLElement
    {
        const s = String(value || "available") as NodeStatus;
        const color = this.statusColors?.[s]
            || STATUS_COLORS[s] || STATUS_COLORS["available"];
        const label = STATUS_LABELS[s] || s;
        return htmlEl("span", {
            class: "spinemap-status-badge",
            style: `background:${color}`
        }, label);
    }

    destroy(): void { this.el = null; }
}

class LinkFieldAdapter implements SpineFieldAdapter
{
    private el: HTMLInputElement | null = null;

    mount(container: HTMLElement, value: unknown): void
    {
        this.el = htmlEl("input", {
            type: "url",
            class: "spinemap-edit-input",
            value: String(value ?? ""),
            placeholder: "https://..."
        }) as HTMLInputElement;
        container.appendChild(this.el);
    }

    getValue(): unknown
    {
        return this.el ? this.el.value : "";
    }

    renderView(value: unknown): HTMLElement
    {
        const url = String(value ?? "");
        if (!url) { return htmlEl("span", {}, ""); }
        return htmlEl("a", {
            class: "spinemap-popover-link",
            href: url,
            target: "_blank",
            rel: "noopener"
        }, truncLabel(url, 30));
    }

    destroy(): void { this.el = null; }
}

class ConnectionsFieldAdapter implements SpineFieldAdapter
{
    mount(): void { /* view-only, no edit mount */ }
    getValue(): unknown { return ""; }

    renderView(): HTMLElement
    {
        return htmlEl("span", {}, "");
    }

    destroy(): void { /* no-op */ }
}

class CustomFieldAdapter implements SpineFieldAdapter
{
    private cfg: SpinePopoverFieldConfig;
    private compOpts: Record<string, unknown>;

    constructor(cfg: SpinePopoverFieldConfig)
    {
        this.cfg = cfg;
        this.compOpts = cfg.componentOptions || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        if (typeof this.compOpts["render"] === "function")
        {
            const el = (this.compOpts["render"] as
                (v: unknown) => HTMLElement)(value);
            container.appendChild(el);
        }
    }

    getValue(): unknown
    {
        if (typeof this.compOpts["getValue"] === "function")
        {
            return (this.compOpts["getValue"] as () => unknown)();
        }
        return "";
    }

    renderView(value: unknown): HTMLElement
    {
        if (this.cfg.renderView)
        {
            return this.cfg.renderView(
                value, {} as SpineHub
            );
        }
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, String(value ?? ""));
    }

    destroy(): void
    {
        if (typeof this.compOpts["destroy"] === "function")
        {
            (this.compOpts["destroy"] as () => void)();
        }
    }
}

// ============================================================================
// STANDARD LIBRARY COMPONENT ADAPTER
// ============================================================================

/**
 * Handles library components with consistent
 * create*(containerId, options?) + getValue()/destroy() API.
 */
const STANDARD_FACTORY_MAP: Record<string, string> =
{
    "datepicker": "createDatePicker",
    "timepicker": "createTimePicker",
    "durationpicker": "createDurationPicker",
    "cronpicker": "createCronPicker",
    "timezonepicker": "createTimezonePicker",
    "periodpicker": "createPeriodPicker",
    "colorpicker": "createColorPicker",
    "codeeditor": "createCodeEditor",
    "maskedentry": "createMaskedEntry"
};

class StandardComponentAdapter implements SpineFieldAdapter
{
    private factoryName: string;
    private instance: Record<string, Function> | null = null;
    private wrapperId: string = "";
    private compOpts: Record<string, unknown>;
    private fieldType: SpinePopoverFieldType;

    constructor(
        type: SpinePopoverFieldType,
        compOpts?: Record<string, unknown>
    )
    {
        this.fieldType = type;
        this.factoryName = STANDARD_FACTORY_MAP[type] || "";
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        this.wrapperId = nextAdapterId();
        const wrap = htmlEl("div", {
            id: this.wrapperId,
            class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const factory = this.resolveFactory();
        if (!factory)
        {
            this.mountFallbackInput(wrap, value);
            return;
        }
        this.invokeFactory(factory, wrap, value);
    }

    private resolveFactory(): Function | null
    {
        const win = window as unknown as
            Record<string, unknown>;
        const fn = win[this.factoryName];
        if (typeof fn !== "function")
        {
            console.warn(
                `${LOG_PREFIX} ${this.factoryName}` +
                " unavailable, falling back to text"
            );
            return null;
        }
        return fn as Function;
    }

    private invokeFactory(
        factory: Function,
        wrap: HTMLElement, value: unknown
    ): void
    {
        const opts = { ...this.compOpts };
        if (value != null && !this.isRawFallback(value))
        {
            opts["value"] = value;
        }
        try
        {
            this.instance = factory(
                this.wrapperId, opts
            ) as Record<string, Function>;
        }
        catch (e)
        {
            console.error(
                `${LOG_PREFIX} ${this.factoryName}` +
                " mount error", e
            );
            this.mountFallbackInput(wrap, value);
        }
    }

    /**
     * Returns true if value is a raw string that
     * failed deserialization — should not be passed
     * to library components expecting typed objects.
     */
    private isRawFallback(value: unknown): boolean
    {
        if (!isStructuredType(this.fieldType))
        {
            return false;
        }
        return typeof value === "string";
    }

    private mountFallbackInput(
        wrap: HTMLElement,
        value: unknown
    ): void
    {
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        if (typeof this.instance["getValue"] === "function")
        {
            return this.instance["getValue"]();
        }
        return "";
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType(this.fieldType, value);
    }

    destroy(): void
    {
        if (this.instance &&
            typeof this.instance["destroy"] === "function")
        {
            try { this.instance["destroy"](); }
            catch (e)
            {
                console.warn(
                    `${LOG_PREFIX} adapter destroy error`, e
                );
            }
        }
        this.instance = null;
    }
}

// ============================================================================
// NON-STANDARD LIBRARY ADAPTERS
// ============================================================================

class SprintPickerAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createSprintPicker"] !== "function")
        {
            this.fallback(wrap, value);
            return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance = (win["createSprintPicker"] as Function)(
                id, opts
            ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createSprintPicker unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        return typeof this.instance["getValue"] === "function"
            ? this.instance["getValue"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("sprintpicker", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class FontDropdownAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createFontDropdown"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance = (win["createFontDropdown"] as Function)(
                id, opts
            ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createFontDropdown unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        return typeof this.instance["getValue"] === "function"
            ? this.instance["getValue"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("fontdropdown", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class EditableComboBoxAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createEditableComboBox"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance =
                (win["createEditableComboBox"] as Function)(
                    id, opts
                ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createEditableComboBox unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        return typeof this.instance["getValue"] === "function"
            ? this.instance["getValue"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("editablecombobox", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class MultiselectComboAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createMultiselectCombo"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            // Inverted params: (opts, containerId)
            this.instance =
                (win["createMultiselectCombo"] as Function)(
                    opts, id
                ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createMultiselectCombo unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        // getSelected() instead of getValue()
        return typeof this.instance["getSelected"] === "function"
            ? this.instance["getSelected"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("multiselectcombo", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class TaggerAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createTagger"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance = (win["createTagger"] as Function)(
                id, opts
            ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createTagger unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return []; }
        // getTags() instead of getValue()
        return typeof this.instance["getTags"] === "function"
            ? this.instance["getTags"]() : [];
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("tagger", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class PeoplePickerAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createPeoplePicker"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance =
                (win["createPeoplePicker"] as Function)(
                    id, opts
                ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createPeoplePicker unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        wrap.appendChild(inp);
        this.instance = {
            getValue: () => inp.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return []; }
        // getSelected() instead of getValue()
        return typeof this.instance["getSelected"] === "function"
            ? this.instance["getSelected"]() : [];
    }

    renderView(value: unknown): HTMLElement
    {
        return renderViewForType("peoplepicker", value);
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class RichTextInputAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const wrap = htmlEl("div", {
            class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as
            Record<string, unknown>;
        const Ctor = win["RichTextInput"];
        if (typeof Ctor !== "function")
        {
            this.fallback(wrap, value); return;
        }
        this.invokeRTI(Ctor, wrap, value);
    }

    private invokeRTI(
        Ctor: unknown,
        wrap: HTMLElement, value: unknown
    ): void
    {
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            this.instance = new (Ctor as
                new (o: Record<string, unknown>) =>
                    Record<string, Function>)(opts);
            if (typeof this.instance["show"] ===
                "function")
            {
                this.instance["show"](wrap);
            }
        }
        catch (e)
        {
            console.error(
                `${LOG_PREFIX} RichTextInput mount` +
                " error", e
            );
            this.fallback(wrap, value);
        }
    }

    private fallback(
        wrap: HTMLElement,
        value: unknown
    ): void
    {
        console.warn(
            `${LOG_PREFIX} RichTextInput fallback`
        );
        const ta = htmlEl("textarea", {
            class: "spinemap-edit-textarea",
            rows: "3"
        }) as HTMLTextAreaElement;
        ta.value = String(value ?? "");
        wrap.appendChild(ta);
        this.instance = {
            getValue: () => ta.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        return typeof this.instance["getValue"] ===
            "function"
            ? this.instance["getValue"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        const raw = String(value ?? "");
        const plain = stripHtmlTags(raw);
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, truncLabel(plain, 80));
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class MarkdownEditorAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        const wrap = htmlEl("div", {
            class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["MarkdownEditor"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = { ...this.compOpts };
        if (value != null) { opts["value"] = value; }
        try
        {
            // new MarkdownEditor(element, opts)
            const Ctor = win["MarkdownEditor"] as
                new (
                    el: HTMLElement,
                    o: Record<string, unknown>
                ) => Record<string, Function>;
            this.instance = new Ctor(wrap, opts);
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} MarkdownEditor unavailable`
        );
        const ta = htmlEl("textarea", {
            class: "spinemap-edit-textarea",
            rows: "3"
        }) as HTMLTextAreaElement;
        ta.value = String(value ?? "");
        wrap.appendChild(ta);
        this.instance = {
            getValue: () => ta.value,
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown
    {
        if (!this.instance) { return ""; }
        return typeof this.instance["getValue"] === "function"
            ? this.instance["getValue"]() : "";
    }

    renderView(value: unknown): HTMLElement
    {
        const raw = String(value ?? "");
        const plain = stripHtmlTags(raw);
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, truncLabel(plain, 80));
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

class SymbolPickerAdapter implements SpineFieldAdapter
{
    private instance: Record<string, Function> | null = null;
    private selected: string = "";
    private compOpts: Record<string, unknown>;

    constructor(compOpts?: Record<string, unknown>)
    {
        this.compOpts = compOpts || {};
    }

    mount(container: HTMLElement, value: unknown): void
    {
        this.selected = String(value ?? "");
        const id = nextAdapterId();
        const wrap = htmlEl("div", {
            id, class: "spinemap-edit-widget"
        });
        container.appendChild(wrap);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win["createSymbolPicker"] !== "function")
        {
            this.fallback(wrap, value); return;
        }
        const opts = {
            ...this.compOpts,
            onSelect: (sym: string) => { this.selected = sym; }
        };
        try
        {
            this.instance =
                (win["createSymbolPicker"] as Function)(
                    id, opts
                ) as Record<string, Function>;
        }
        catch { this.fallback(wrap, value); }
    }

    private fallback(wrap: HTMLElement, value: unknown): void
    {
        console.warn(
            `${LOG_PREFIX} createSymbolPicker unavailable`
        );
        const inp = htmlEl("input", {
            type: "text",
            class: "spinemap-edit-input",
            value: String(value ?? "")
        }) as HTMLInputElement;
        inp.addEventListener("input", () =>
        {
            this.selected = inp.value;
        });
        wrap.appendChild(inp);
        this.instance = {
            destroy: () => { /* no-op */ }
        };
    }

    getValue(): unknown { return this.selected; }

    renderView(value: unknown): HTMLElement
    {
        return htmlEl("span", {
            class: "spinemap-popover-value"
        }, String(value ?? ""));
    }

    destroy(): void
    {
        if (this.instance?.["destroy"])
        {
            try { this.instance["destroy"](); }
            catch { /* safe */ }
        }
        this.instance = null;
    }
}

// ============================================================================
// VIEW RENDERING PER TYPE
// ============================================================================

function viewSpan(text: string): HTMLElement
{
    return htmlEl("span", {
        class: "spinemap-popover-value"
    }, text);
}

function viewLink(str: string): HTMLElement
{
    if (!str) { return htmlEl("span", {}, ""); }
    return htmlEl("a", {
        class: "spinemap-popover-link",
        href: str, target: "_blank", rel: "noopener"
    }, truncLabel(str, 30));
}

function viewColor(str: string): HTMLElement
{
    const wrap = viewSpan("");
    wrap.appendChild(htmlEl("span", {
        class: "spinemap-popover-color-swatch",
        style: `background-color:${str}`
    }));
    wrap.appendChild(
        document.createTextNode(" " + str)
    );
    return wrap;
}

function viewTags(
    value: unknown, str: string
): HTMLElement
{
    const wrap = viewSpan("");
    const items = Array.isArray(value) ? value : [];
    for (const t of items)
    {
        const lbl = extractLabel(t);
        wrap.appendChild(htmlEl("span", {
            class: "spinemap-popover-tag-pill"
        }, String(lbl)));
    }
    if (items.length === 0 && str)
    {
        wrap.textContent = str;
    }
    return wrap;
}

function viewPeople(
    value: unknown, str: string
): HTMLElement
{
    const items = Array.isArray(value) ? value : [];
    const names = items.map(p => extractLabel(p));
    return viewSpan(names.join(", ") || str);
}

function viewDate(
    value: unknown, str: string
): HTMLElement
{
    if (value instanceof Date)
    {
        return viewSpan(value.toLocaleDateString());
    }
    if (typeof value === "string" && value)
    {
        const d = new Date(value);
        if (!isNaN(d.getTime()))
        {
            return viewSpan(d.toLocaleDateString());
        }
    }
    return viewSpan(str);
}

function viewDuration(
    value: unknown, str: string
): HTMLElement
{
    if (typeof value !== "object" || !value)
    {
        return viewSpan(str);
    }
    const v = value as Record<string, number>;
    const parts: string[] = [];
    if (v["hours"]) { parts.push(`${v["hours"]}h`); }
    if (v["minutes"]) { parts.push(`${v["minutes"]}m`); }
    return viewSpan(parts.length > 0 ? parts.join(" ") : str);
}

function viewPeriod(
    value: unknown, str: string
): HTMLElement
{
    if (typeof value !== "object" || !value)
    {
        return viewSpan(str);
    }
    const v = value as Record<string, unknown>;
    if (v["period"] && v["year"])
    {
        return viewSpan(`${v["period"]} ${v["year"]}`);
    }
    return viewSpan(
        String(v["label"] || v["period"] || str)
    );
}

function viewObjectLabel(
    value: unknown, str: string
): HTMLElement
{
    if (typeof value !== "object" || !value)
    {
        return viewSpan(str);
    }
    const v = value as Record<string, unknown>;
    return viewSpan(
        String(v["label"] || v["name"] || str)
    );
}

function extractLabel(item: unknown): string
{
    if (typeof item === "object" && item)
    {
        const r = item as Record<string, unknown>;
        return String(r["label"] || r["name"] || item);
    }
    return String(item);
}

function renderViewForType(
    type: SpinePopoverFieldType,
    value: unknown
): HTMLElement
{
    const str = stringifyForView(value);
    switch (type)
    {
        case "url":
        case "link":
            return viewLink(str);
        case "checkbox":
            return viewSpan(value ? "\u2713" : "\u2717");
        case "colorpicker":
            return viewColor(str);
        case "tagger":
            return viewTags(value, str);
        case "peoplepicker":
            return viewPeople(value, str);
        case "codeeditor":
            return htmlEl("code", {
                class: "spinemap-popover-code"
            }, truncLabel(str, 120));
        case "datepicker":
            return viewDate(value, str);
        case "durationpicker":
            return viewDuration(value, str);
        case "periodpicker":
            return viewPeriod(value, str);
        case "sprintpicker":
            return viewObjectLabel(value, str);
        default:
            return viewSpan(str);
    }
}

function stringifyForView(value: unknown): string
{
    if (value == null) { return ""; }
    if (typeof value === "string") { return value; }
    if (typeof value === "number" || typeof value === "boolean")
    {
        return String(value);
    }
    try { return JSON.stringify(value); }
    catch { return String(value); }
}

function stripHtmlTags(html: string): string
{
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

// ============================================================================
// ADAPTER FACTORY
// ============================================================================

const NATIVE_INPUT_TYPES = new Set<string>([
    "text", "number", "email", "tel", "range",
    "url", "checkbox"
]);

const STANDARD_LIBRARY_TYPES = new Set<string>([
    "datepicker", "timepicker", "durationpicker",
    "cronpicker", "timezonepicker", "periodpicker",
    "colorpicker", "codeeditor", "maskedentry"
]);

type AdapterCtor = new (
    opts?: Record<string, unknown>
) => SpineFieldAdapter;

const NON_STANDARD_MAP: Record<string, AdapterCtor> = {
    sprintpicker: SprintPickerAdapter,
    fontdropdown: FontDropdownAdapter,
    editablecombobox: EditableComboBoxAdapter,
    multiselectcombo: MultiselectComboAdapter,
    tagger: TaggerAdapter,
    peoplepicker: PeoplePickerAdapter,
    richtextinput: RichTextInputAdapter,
    markdowneditor: MarkdownEditorAdapter,
    symbolpicker: SymbolPickerAdapter
};

function createFieldAdapter(
    cfg: SpinePopoverFieldConfig,
    statusColors?: Partial<Record<NodeStatus, string>>
): SpineFieldAdapter
{
    if (NATIVE_INPUT_TYPES.has(cfg.type))
    {
        return createNativeAdapter(cfg);
    }
    if (STANDARD_LIBRARY_TYPES.has(cfg.type))
    {
        return new StandardComponentAdapter(
            cfg.type, cfg.componentOptions
        );
    }
    const Ctor = NON_STANDARD_MAP[cfg.type];
    if (Ctor) { return new Ctor(cfg.componentOptions); }
    return createBuiltinAdapter(cfg, statusColors);
}

function createNativeAdapter(
    cfg: SpinePopoverFieldConfig
): SpineFieldAdapter
{
    if (cfg.type === "textarea")
    {
        return new NativeTextareaAdapter();
    }
    if (cfg.type === "select")
    {
        return new NativeSelectAdapter(
            cfg.selectOptions || []
        );
    }
    return new NativeInputAdapter(cfg.type);
}

function createBuiltinAdapter(
    cfg: SpinePopoverFieldConfig,
    statusColors?: Partial<Record<NodeStatus, string>>
): SpineFieldAdapter
{
    switch (cfg.type)
    {
        case "status":
            return new StatusFieldAdapter(statusColors);
        case "link":
            return new LinkFieldAdapter();
        case "connections":
            return new ConnectionsFieldAdapter();
        case "custom":
            return new CustomFieldAdapter(cfg);
        default:
            return new NativeInputAdapter("text");
    }
}

// ── Create field slot in form (no adapter mount yet) ──

function createFieldSlot(
    form: HTMLElement,
    cfg: SpinePopoverFieldConfig
): HTMLElement
{
    const cls = "spinemap-edit-field" +
        (cfg.width === "full"
            ? " spinemap-edit-field-full" : "") +
        (cfg.cssClass ? ` ${cfg.cssClass}` : "");
    const wrap = htmlEl("div", { class: cls });
    wrap.appendChild(htmlEl("label", {}, cfg.label));
    const widgetWrap = htmlEl("div", {
        class: "spinemap-edit-widget"
    });
    wrap.appendChild(widgetWrap);
    if (cfg.hint)
    {
        wrap.appendChild(htmlEl("small", {
            class: "spinemap-edit-hint"
        }, cfg.hint));
    }
    form.appendChild(wrap);
    return widgetWrap;
}

// ============================================================================
// LAYOUT ENGINE
// ============================================================================

/**
 * Collects all node IDs from a hub's branches recursively.
 */
function collectBranchIds(
    branches: SpineBranch[],
    parentId: string,
    out: Map<string, NodeEntry>,
    depth: number
): void
{
    for (const b of branches)
    {
        out.set(b.id, { type: "branch", data: b, parentId, depth });
        if (b.children && b.children.length > 0)
        {
            collectBranchIds(b.children, b.id, out, depth + 1);
        }
    }
}

/**
 * Build flat node map from hubs.
 */
function buildNodeMap(hubs: SpineHub[]): Map<string, NodeEntry>
{
    const map = new Map<string, NodeEntry>();
    for (const h of hubs)
    {
        map.set(h.id, { type: "hub", data: h, parentId: null, depth: 0 });
        collectBranchIds(h.branches, h.id, map, 1);
    }
    return map;
}

/**
 * Count total branches (including nested) for a hub.
 */
function countBranches(branches: SpineBranch[]): number
{
    let n = branches.length;
    for (const b of branches)
    {
        if (b.children) { n += countBranches(b.children); }
    }
    return n;
}

// ── Vertical Layout ──

function layoutVertical(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const cx = opts.canvasWidth / 2;
    let y = FIT_PADDING + 40;

    for (const hub of hubs)
    {
        pos.set(hub.id, { x: cx, y });
        layoutBranchesVertical(hub, cx, y, opts, pos);
        const clusterH = branchClusterHeight(hub.branches, opts);
        y += Math.max(opts.hubSpacing, clusterH + 40);
    }
    return pos;
}

function layoutBranchesVertical(
    hub: SpineHub,
    cx: number,
    hubY: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const left: SpineBranch[] = [];
    const right: SpineBranch[] = [];
    hub.branches.forEach((b, i) =>
    {
        if (i % 2 === 0) { left.push(b); }
        else
        {
            right.push(b);
        }
    });

    placeSide(left, cx, hubY, -1, opts, pos, 1);
    placeSide(right, cx, hubY, 1, opts, pos, 1);
}

function placeSide(
    branches: SpineBranch[],
    cx: number,
    hubY: number,
    dir: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>,
    depth: number
): void
{
    const startY = hubY - ((branches.length - 1) * opts.branchSpacing) / 2;
    for (let i = 0; i < branches.length; i++)
    {
        const b = branches[i];
        const bx = cx + dir * (opts.branchLength * depth);
        const by = startY + i * opts.branchSpacing;
        pos.set(b.id, { x: bx, y: by });
        if (b.children && b.children.length > 0)
        {
            placeSide(b.children, bx, by, dir, opts, pos, 1);
        }
    }
}

function branchClusterHeight(
    branches: SpineBranch[],
    opts: LayoutOpts
): number
{
    const leftCount = Math.ceil(branches.length / 2);
    const rightCount = Math.floor(branches.length / 2);
    const maxCount = Math.max(leftCount, rightCount, 1);
    return maxCount * opts.branchSpacing;
}

// ── Horizontal Layout ──

function layoutHorizontal(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const cy = opts.canvasHeight / 2;
    let x = FIT_PADDING + 40;

    for (const hub of hubs)
    {
        pos.set(hub.id, { x, y: cy });
        layoutBranchesHorizontal(hub, x, cy, opts, pos);
        const clusterH = branchClusterHeight(hub.branches, opts);
        x += Math.max(opts.hubSpacing, clusterH + 40);
    }
    return pos;
}

function layoutBranchesHorizontal(
    hub: SpineHub,
    hubX: number,
    cy: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const up: SpineBranch[] = [];
    const down: SpineBranch[] = [];
    hub.branches.forEach((b, i) =>
    {
        if (i % 2 === 0) { up.push(b); }
        else
        {
            down.push(b);
        }
    });

    placeHorizSide(up, hubX, cy, -1, opts, pos, 1);
    placeHorizSide(down, hubX, cy, 1, opts, pos, 1);
}

function placeHorizSide(
    branches: SpineBranch[],
    hubX: number,
    cy: number,
    dir: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>,
    depth: number
): void
{
    const startX = hubX - ((branches.length - 1) * opts.branchSpacing) / 2;
    for (let i = 0; i < branches.length; i++)
    {
        const b = branches[i];
        const bx = startX + i * opts.branchSpacing;
        const by = cy + dir * (opts.branchLength * depth);
        pos.set(b.id, { x: bx, y: by });
        if (b.children && b.children.length > 0)
        {
            placeHorizSide(b.children, bx, by, dir, opts, pos, 1);
        }
    }
}

// ── Radial Layout ──

function layoutRadial(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const n = Math.max(hubs.length, 1);
    const radius = Math.max(200, n * opts.hubSpacing / (2 * Math.PI));
    const cx = opts.canvasWidth / 2;
    const cy = radius + FIT_PADDING + 60;

    for (let i = 0; i < hubs.length; i++)
    {
        const angle = (i * 2 * Math.PI / n) - Math.PI / 2;
        const hx = cx + radius * Math.cos(angle);
        const hy = cy + radius * Math.sin(angle);
        pos.set(hubs[i].id, { x: hx, y: hy });
        layoutBranchesRadial(hubs[i], hx, hy, angle, cx, cy, opts, pos);
    }
    return pos;
}

function layoutBranchesRadial(
    hub: SpineHub,
    hx: number,
    hy: number,
    hubAngle: number,
    cx: number,
    cy: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    const nb = hub.branches.length;
    if (nb === 0) { return; }
    const sector = (2 * Math.PI / Math.max(1, nb)) * 0.6;

    for (let j = 0; j < nb; j++)
    {
        const off = (j - (nb - 1) / 2) * (sector / Math.max(nb - 1, 1));
        const a = hubAngle + off;
        const bx = hx + opts.branchLength * Math.cos(a);
        const by = hy + opts.branchLength * Math.sin(a);
        pos.set(hub.branches[j].id, { x: bx, y: by });
        placeRadialChildren(hub.branches[j], bx, by, a, opts, pos);
    }
}

function placeRadialChildren(
    branch: SpineBranch,
    px: number,
    py: number,
    angle: number,
    opts: LayoutOpts,
    pos: Map<string, NodePos>
): void
{
    if (!branch.children || branch.children.length === 0) { return; }
    const nc = branch.children.length;
    const fan = 0.4;

    for (let k = 0; k < nc; k++)
    {
        const off = (k - (nc - 1) / 2) * (fan / Math.max(nc - 1, 1));
        const a = angle + off;
        const cx = px + opts.branchSpacing * Math.cos(a);
        const cy = py + opts.branchSpacing * Math.sin(a);
        pos.set(branch.children[k].id, { x: cx, y: cy });
    }
}

// ── Winding (Serpentine) Layout ──

function layoutWinding(
    hubs: SpineHub[],
    opts: LayoutOpts
): Map<string, NodePos>
{
    const pos = new Map<string, NodePos>();
    const fitPerRow = Math.floor(
        (opts.canvasWidth - FIT_PADDING * 2) / opts.hubSpacing
    );
    const hubsPerRow = Math.max(2,
        Math.min(fitPerRow, opts.windingHubsPerRow));
    const rowHeight = opts.hubSpacing * 1.4;
    const pad = FIT_PADDING + 60;

    for (let i = 0; i < hubs.length; i++)
    {
        const row = Math.floor(i / hubsPerRow);
        const col = i % hubsPerRow;
        const ltr = row % 2 === 0;
        const x = ltr
            ? pad + col * opts.hubSpacing
            : pad + (hubsPerRow - 1 - col) * opts.hubSpacing;
        const y = pad + row * rowHeight;
        pos.set(hubs[i].id, { x, y });
        layoutBranchesVertical(hubs[i], x, y, opts, pos);
    }
    return pos;
}

// ── Collision Resolution ──

function resolveCollisions(
    pos: Map<string, NodePos>,
    nodeMap: Map<string, NodeEntry>,
    leafW: number,
    leafH: number,
    hubR: number
): void
{
    const ids = Array.from(pos.keys());
    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++)
    {
        for (let a = 0; a < ids.length; a++)
        {
            for (let b = a + 1; b < ids.length; b++)
            {
                nudgeIfOverlapping(
                    ids[a], ids[b], pos, nodeMap, leafW, leafH, hubR
                );
            }
        }
    }
}

function nudgeIfOverlapping(
    idA: string,
    idB: string,
    pos: Map<string, NodePos>,
    nodeMap: Map<string, NodeEntry>,
    leafW: number,
    leafH: number,
    hubR: number
): void
{
    const pa = pos.get(idA)!;
    const pb = pos.get(idB)!;
    const ea = nodeMap.get(idA);
    const eb = nodeMap.get(idB);
    const wa = ea?.type === "hub" ? hubR * 2 : leafW;
    const ha = ea?.type === "hub" ? hubR * 2 : leafH;
    const wb = eb?.type === "hub" ? hubR * 2 : leafW;
    const hb = eb?.type === "hub" ? hubR * 2 : leafH;

    const ox = (wa / 2 + wb / 2 + 8) - Math.abs(pa.x - pb.x);
    const oy = (ha / 2 + hb / 2 + 4) - Math.abs(pa.y - pb.y);
    if (ox <= 0 || oy <= 0) { return; }

    const moveB = eb?.type !== "hub";
    const target = moveB ? pb : pa;
    if (oy < ox)
    {
        target.y += (target.y >= (moveB ? pa : pb).y ? 1 : -1) * oy * 0.5;
    }
    else
    {
        target.x += (target.x >= (moveB ? pa : pb).x ? 1 : -1) * ox * 0.5;
    }
}

// ============================================================================
// CLASS: SpineMap
// ============================================================================

type ResolvedOptions = Required<Pick<SpineMapOptions,
    "layout" | "hubSpacing" | "branchSpacing"
    | "branchLength" | "editable" | "sidebarWidth"
    | "minZoom" | "maxZoom" | "showToolbar"
    | "showConnections" | "showStatusLegend"
    | "fitOnLoad" | "size"
>> & SpineMapOptions;

function normalizeOptions(
    o: SpineMapOptions
): ResolvedOptions
{
    return {
        ...o,
        layout: o.layout || "vertical",
        hubSpacing: o.hubSpacing || DEFAULT_HUB_SPACING,
        branchSpacing: o.branchSpacing || DEFAULT_BRANCH_SPACING,
        branchLength: o.branchLength || DEFAULT_BRANCH_LENGTH,
        editable: o.editable ?? false,
        sidebarWidth: o.sidebarWidth || DEFAULT_SIDEBAR_WIDTH,
        minZoom: o.minZoom ?? DEFAULT_MIN_ZOOM,
        maxZoom: o.maxZoom ?? DEFAULT_MAX_ZOOM,
        showToolbar: o.showToolbar ?? true,
        showConnections: o.showConnections ?? true,
        showStatusLegend: o.showStatusLegend ?? true,
        fitOnLoad: o.fitOnLoad ?? true,
        size: o.size || "md"
    };
}

export class SpineMap
{
    // ── Fields ──

    private opts: ResolvedOptions;

    private rootEl!: HTMLElement;
    private toolbarEl!: HTMLElement;
    private canvasWrapEl!: HTMLElement;
    private svgEl!: SVGSVGElement;
    private transformG!: SVGGElement;
    private spineG!: SVGGElement;
    private branchG!: SVGGElement;
    private nodeG!: SVGGElement;
    private connG!: SVGGElement;
    private defsEl!: SVGDefsElement;
    private popoverEl!: HTMLElement;
    private sidebarEl: HTMLElement | null = null;
    private legendEl: HTMLElement | null = null;

    private hubs: SpineHub[] = [];
    private connections: SpineConnection[] = [];
    private nodeMap = new Map<string, NodeEntry>();
    private positions = new Map<string, NodePos>();
    private manualOffsets = new Map<string, NodePos>();
    private svgNodes = new Map<string, SVGGElement>();
    private svgConns = new Map<string, SVGElement>();

    private zoom = { tx: 0, ty: 0, scale: 1 };
    private isPanning = false;
    private panStart = { x: 0, y: 0 };
    private panStartTx = 0;
    private panStartTy = 0;
    private isDragging = false;
    private dragNodeId: string | null = null;
    private dragStart = { x: 0, y: 0 };
    private isConnecting = false;
    private connectFromId: string | null = null;
    private tempConnLine: SVGElement | null = null;

    private selectedId: string | null = null;
    private popoverNodeId: string | null = null;
    private activeFieldAdapters: SpineFieldAdapter[] = [];
    private resolvedPopoverFields: SpinePopoverFieldConfig[] = [];
    private treeGridInstance: Record<string, Function> | null = null;
    private idCounter = 0;
    private liveRegion!: HTMLElement;
    private sidebarResizing = false;
    private sidebarResizeStartX = 0;
    private sidebarResizeStartW = 0;

    // Bound handlers for cleanup
    private boundWheel!: (e: WheelEvent) => void;
    private boundPointerDown!: (e: PointerEvent) => void;
    private boundPointerMove!: (e: PointerEvent) => void;
    private boundPointerUp!: (e: PointerEvent) => void;
    private boundKeyDown!: (e: KeyboardEvent) => void;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: SpineMapOptions)
    {
        this.opts = normalizeOptions(options);
        this.resolvedPopoverFields =
            options.popoverFields
                ? options.popoverFields
                : DEFAULT_POPOVER_FIELDS;
        this.buildRoot();
        this.bindEvents();
        if (options.popoverWidth)
        {
            this.popoverEl.style.setProperty(
                "--spinemap-popover-width",
                `${options.popoverWidth}px`
            );
        }
        if (options.data)
        {
            this.loadData(options.data);
        }
    }

    // ========================================================================
    // PUBLIC API — DATA
    // ========================================================================

    public loadData(data: SpineMapData): void
    {
        this.hubs = JSON.parse(JSON.stringify(data.hubs || []));
        this.connections = JSON.parse(
            JSON.stringify(data.connections || [])
        );
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
        this.syncSidebar();
        if (this.opts.fitOnLoad) { this.fitToView(); }
    }

    public getData(): SpineMapData
    {
        return {
            hubs: JSON.parse(JSON.stringify(this.hubs)),
            connections: JSON.parse(JSON.stringify(this.connections))
        };
    }

    // ========================================================================
    // PUBLIC API — NODES
    // ========================================================================

    public addHub(hub: SpineHub, index?: number): void
    {
        const h = JSON.parse(JSON.stringify(hub));
        if (!h.id) { h.id = this.genId(); }
        if (index !== undefined && index < this.hubs.length)
        {
            this.hubs.splice(index, 0, h);
        }
        else
        {
            this.hubs.push(h);
        }
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeAdd, h, null);
        this.announce(`Hub "${h.label}" added`);
    }

    public addBranch(branch: SpineBranch, parentId: string): void
    {
        const b = JSON.parse(JSON.stringify(branch));
        if (!b.id) { b.id = this.genId(); }
        const parent = this.findNodeData(parentId);
        if (!parent) { console.warn(`${LOG_PREFIX} Parent not found`); return; }

        if ("branches" in parent) { parent.branches.push(b); }
        else
        {
            if (!parent.children) { parent.children = []; }
            parent.children.push(b);
        }
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeAdd, b, parentId);
        this.announce(`Branch "${b.label}" added`);
    }

    public updateNode(
        nodeId: string,
        changes: Partial<SpineHub | SpineBranch>
    ): void
    {
        const node = this.findNodeData(nodeId);
        if (!node) { return; }
        Object.assign(node, changes);
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeChange, nodeId, changes);
    }

    public removeNode(nodeId: string): void
    {
        const entry = this.nodeMap.get(nodeId);
        if (!entry) { return; }
        if (entry.type === "hub")
        {
            this.hubs = this.hubs.filter(h => h.id !== nodeId);
        }
        else
        {
            this.removeBranchFromParent(nodeId, entry.parentId);
        }
        this.connections = this.connections.filter(
            c => c.from !== nodeId && c.to !== nodeId
        );
        this.refreshAfterEdit();
        safeCallback(this.opts.onNodeRemove, nodeId);
        this.announce(`Node removed`);
    }

    public reparentNode(nodeId: string, newParentId: string | null): void
    {
        const entry = this.nodeMap.get(nodeId);
        if (!entry || entry.type === "hub") { return; }
        const branchData = JSON.parse(JSON.stringify(entry.data));
        this.removeBranchFromParent(nodeId, entry.parentId);
        if (newParentId)
        {
            this.addBranch(branchData, newParentId);
        }
        safeCallback(this.opts.onNodeReparent, nodeId, newParentId);
    }

    public getNode(nodeId: string): SpineHub | SpineBranch | null
    {
        return this.findNodeData(nodeId) || null;
    }

    // ========================================================================
    // PUBLIC API — CONNECTIONS
    // ========================================================================

    public addConnection(conn: SpineConnection): void
    {
        this.connections.push({ ...conn });
        this.renderConnections();
        safeCallback(this.opts.onConnectionAdd, conn);
    }

    public removeConnection(fromId: string, toId: string): void
    {
        const idx = this.connections.findIndex(
            c => c.from === fromId && c.to === toId
        );
        if (idx >= 0)
        {
            const removed = this.connections.splice(idx, 1)[0];
            this.renderConnections();
            safeCallback(this.opts.onConnectionRemove,
                `${removed.from}-${removed.to}`);
        }
    }

    public getConnections(): SpineConnection[]
    {
        return JSON.parse(JSON.stringify(this.connections));
    }

    // ========================================================================
    // PUBLIC API — LAYOUT
    // ========================================================================

    public setLayout(layout: LayoutMode): void
    {
        this.opts.layout = layout;
        this.manualOffsets.clear();
        this.computeLayout();
        this.renderAll();
        this.fitToView();
        safeCallback(this.opts.onLayoutChange, layout);
    }

    public getLayout(): LayoutMode { return this.opts.layout; }

    public relayout(): void
    {
        this.computeLayout();
        this.renderAll();
    }

    // ========================================================================
    // PUBLIC API — ZOOM & PAN
    // ========================================================================

    public zoomIn(): void
    {
        this.zoomTo(this.zoom.scale * (1 + ZOOM_STEP));
    }

    public zoomOut(): void
    {
        this.zoomTo(this.zoom.scale * (1 - ZOOM_STEP));
    }

    public zoomTo(level: number): void
    {
        this.zoom.scale = Math.max(this.opts.minZoom,
            Math.min(this.opts.maxZoom, level));
        this.applyTransform();
        safeCallback(this.opts.onZoomChange, this.zoom.scale);
    }

    public fitToView(): void
    {
        const bbox = this.computeBBox();
        const cw = this.canvasWrapEl.clientWidth || 800;
        const ch = this.canvasWrapEl.clientHeight || 600;
        const sx = (cw - FIT_PADDING * 2) / (bbox.w || 1);
        const sy = (ch - FIT_PADDING * 2) / (bbox.h || 1);
        const s = Math.min(sx, sy, this.opts.maxZoom);

        this.zoom.scale = Math.max(this.opts.minZoom, s);
        this.zoom.tx = (cw - bbox.w * this.zoom.scale) / 2
            - bbox.x * this.zoom.scale;
        this.zoom.ty = (ch - bbox.h * this.zoom.scale) / 2
            - bbox.y * this.zoom.scale;
        this.applyTransform();
    }

    public panTo(nodeId: string): void
    {
        const p = this.positions.get(nodeId);
        if (!p) { return; }
        const cw = this.canvasWrapEl.clientWidth || 800;
        const ch = this.canvasWrapEl.clientHeight || 600;
        this.zoom.tx = cw / 2 - p.x * this.zoom.scale;
        this.zoom.ty = ch / 2 - p.y * this.zoom.scale;
        this.applyTransform();
    }

    public getZoom(): number { return this.zoom.scale; }

    // ========================================================================
    // PUBLIC API — SELECTION
    // ========================================================================

    public selectNode(nodeId: string): void
    {
        this.clearSelection();
        this.selectedId = nodeId;
        const g = this.svgNodes.get(nodeId);
        if (g) { g.classList.add("spinemap-node-selected"); }
    }

    public clearSelection(): void
    {
        if (this.selectedId)
        {
            const g = this.svgNodes.get(this.selectedId);
            if (g) { g.classList.remove("spinemap-node-selected"); }
        }
        this.selectedId = null;
    }

    public getSelectedNode(): string | null { return this.selectedId; }

    // ========================================================================
    // PUBLIC API — EXPORT / IMPORT
    // ========================================================================

    public exportSVG(): string
    {
        const clone = this.svgEl.cloneNode(true) as SVGSVGElement;
        const tg = clone.querySelector(".spinemap-transform") as SVGGElement;
        if (tg) { tg.removeAttribute("transform"); }
        const bbox = this.computeBBox();
        setAttrs(clone, {
            width: String(bbox.w + FIT_PADDING * 2),
            height: String(bbox.h + FIT_PADDING * 2),
            viewBox: `${bbox.x - FIT_PADDING} ${bbox.y - FIT_PADDING} `
                + `${bbox.w + FIT_PADDING * 2} ${bbox.h + FIT_PADDING * 2}`
        });
        return new XMLSerializer().serializeToString(clone);
    }

    public exportPNG(): Promise<Blob>
    {
        return new Promise((resolve, reject) =>
        {
            const svgStr = this.exportSVG();
            const img = new Image();
            img.onload = () =>
            {
                const c = document.createElement("canvas");
                c.width = img.naturalWidth * 2;
                c.height = img.naturalHeight * 2;
                const ctx = c.getContext("2d")!;
                ctx.scale(2, 2);
                ctx.drawImage(img, 0, 0);
                c.toBlob(b => b ? resolve(b) : reject(
                    new Error("toBlob failed")), "image/png");
            };
            img.onerror = reject;
            img.src = "data:image/svg+xml;charset=utf-8,"
                + encodeURIComponent(svgStr);
        });
    }

    public exportJSON(): string
    {
        return JSON.stringify(this.getData(), null, 2);
    }

    public importJSON(json: string): void
    {
        try
        {
            const data = JSON.parse(json) as SpineMapData;
            this.loadData(data);
        }
        catch (e)
        {
            console.error(`${LOG_PREFIX} Import failed`, e);
        }
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    public refresh(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
    }

    public destroy(): void
    {
        this.unbindEvents();
        this.clearPopoverContent();
        if (this.popoverEl.parentNode)
        {
            this.popoverEl.parentNode.removeChild(this.popoverEl);
        }
        if (this.treeGridInstance && this.treeGridInstance["destroy"])
        {
            this.treeGridInstance["destroy"]();
        }
        this.rootEl.remove();
    }

    public getElement(): HTMLElement { return this.rootEl; }

    // ========================================================================
    // PRIVATE — BUILD DOM
    // ========================================================================

    private buildRoot(): void
    {
        const sz = this.opts.size;
        const cls = ["spinemap", `spinemap-${sz}`];
        if (this.opts.cssClass) { cls.push(this.opts.cssClass); }
        if (this.opts.editable) { cls.push("spinemap-editable"); }

        this.rootEl = htmlEl("div", { class: cls.join(" ") });
        this.liveRegion = htmlEl("div", {
            class: "spinemap-live",
            "aria-live": "polite",
            "aria-atomic": "true"
        });
        this.rootEl.appendChild(this.liveRegion);

        if (this.opts.showToolbar) { this.buildToolbar(); }
        this.buildBody();
        if (this.opts.showStatusLegend) { this.buildLegend(); }
        this.opts.container.appendChild(this.rootEl);
    }

    private buildToolbar(): void
    {
        this.toolbarEl = htmlEl("div", { class: "spinemap-toolbar" });
        this.buildLayoutSelect();
        this.buildZoomButtons();
        this.buildExportMenu();
        if (this.opts.editable) { this.buildSidebarToggle(); }
        this.rootEl.appendChild(this.toolbarEl);
    }

    private buildLayoutSelect(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const sel = htmlEl("select", {
            class: "spinemap-layout-select",
            "aria-label": "Layout mode"
        }) as HTMLSelectElement;

        const modes: LayoutMode[] =
            ["vertical", "horizontal", "radial", "winding"];
        for (const m of modes)
        {
            const opt = htmlEl("option", { value: m },
                m.charAt(0).toUpperCase() + m.slice(1));
            if (m === this.opts.layout) { setAttr(opt, "selected", ""); }
            sel.appendChild(opt);
        }
        sel.addEventListener("change", () =>
        {
            this.setLayout(sel.value as LayoutMode);
        });
        grp.appendChild(sel);
        this.toolbarEl.appendChild(grp);
    }

    private buildZoomButtons(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const btnIn = this.toolbarBtn("+", "Zoom in", () => this.zoomIn());
        const btnOut = this.toolbarBtn("\u2212", "Zoom out",
            () => this.zoomOut());
        const btnFit = this.toolbarBtn("\u2922", "Fit to view",
            () => this.fitToView());
        grp.append(btnIn, btnOut, btnFit);
        this.toolbarEl.appendChild(grp);
    }

    private buildExportMenu(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const wrap = htmlEl("div", { class: "spinemap-export-wrap" });
        const btn = this.toolbarBtn("\u21E9", "Export", () =>
        {
            menu.style.display =
                menu.style.display === "none" ? "" : "none";
        });
        const menu = htmlEl("div", {
            class: "spinemap-export-menu",
            style: "display:none"
        });

        this.appendExportItems(menu);
        wrap.append(btn, menu);
        grp.appendChild(wrap);
        this.toolbarEl.appendChild(grp);
    }

    private appendExportItems(menu: HTMLElement): void
    {
        const items: [string, () => void][] = [
            ["SVG", () => this.downloadExport("svg")],
            ["PNG", () => this.downloadExport("png")],
            ["JSON", () => this.downloadExport("json")]
        ];
        for (const [label, handler] of items)
        {
            const b = htmlEl("button", {
                class: "spinemap-export-item",
                type: "button"
            }, `Export ${label}`);
            b.addEventListener("click", handler);
            menu.appendChild(b);
        }
    }

    private buildSidebarToggle(): void
    {
        const grp = htmlEl("div", { class: "spinemap-toolbar-group" });
        const btn = this.toolbarBtn("\u2630", "Toggle sidebar", () =>
        {
            if (this.sidebarEl)
            {
                const vis = this.sidebarEl.style.display !== "none";
                this.sidebarEl.style.display = vis ? "none" : "";
            }
        });
        grp.appendChild(btn);
        this.toolbarEl.appendChild(grp);
    }

    private toolbarBtn(
        text: string,
        label: string,
        handler: () => void
    ): HTMLElement
    {
        const b = htmlEl("button", {
            class: "spinemap-toolbar-btn",
            type: "button",
            "aria-label": label,
            title: label
        }, text);
        b.addEventListener("click", handler);
        return b;
    }

    private buildBody(): void
    {
        const body = htmlEl("div", { class: "spinemap-body" });
        const pos = this.opts.sidebarPosition ?? "right";

        this.buildCanvas();
        if (this.opts.editable && pos !== "none") { this.buildSidebar(); }

        if (pos === "left" && this.sidebarEl)
        {
            body.append(this.sidebarEl, this.canvasWrapEl);
        }
        else
        {
            body.appendChild(this.canvasWrapEl);
            if (this.sidebarEl) { body.appendChild(this.sidebarEl); }
        }
        this.rootEl.appendChild(body);
    }

    private buildCanvas(): void
    {
        this.canvasWrapEl = htmlEl("div", {
            class: "spinemap-canvas-wrap"
        });
        this.svgEl = svgCreate("svg", {
            class: "spinemap-canvas",
            width: "100%", height: "100%",
            "aria-label": "Capability map"
        }) as unknown as SVGSVGElement;

        this.defsEl = svgCreate("defs") as SVGDefsElement;
        this.buildMarkers();
        this.svgEl.appendChild(this.defsEl);
        this.buildSvgLayers();

        this.popoverEl = htmlEl("div", {
            class: "spinemap-popover",
            style: "display:none", role: "dialog"
        });
        this.canvasWrapEl.appendChild(this.svgEl);
        document.body.appendChild(this.popoverEl);
    }

    private buildSvgLayers(): void
    {
        this.transformG = svgCreate("g", {
            class: "spinemap-transform"
        }) as SVGGElement;
        this.connG = svgCreate("g", {
            class: "spinemap-connections"
        }) as SVGGElement;
        this.spineG = svgCreate("g", {
            class: "spinemap-spine"
        }) as SVGGElement;
        this.branchG = svgCreate("g", {
            class: "spinemap-branches"
        }) as SVGGElement;
        this.nodeG = svgCreate("g", {
            class: "spinemap-nodes"
        }) as SVGGElement;
        this.transformG.append(
            this.connG, this.spineG,
            this.branchG, this.nodeG
        );
        this.svgEl.appendChild(this.transformG);
    }

    private buildMarkers(): void
    {
        const makeArrow = (id: string, color: string): void =>
        {
            const m = svgCreate("marker", {
                id,
                viewBox: "0 0 10 10",
                refX: "10",
                refY: "5",
                markerWidth: "8",
                markerHeight: "8",
                orient: "auto-start-reverse"
            });
            m.appendChild(svgCreate("path", {
                d: "M 0 0 L 10 5 L 0 10 z",
                fill: color
            }));
            this.defsEl.appendChild(m);
        };

        makeArrow("sm-arrow", "#adb5bd");
        for (const [type, color] of Object.entries(CONN_COLORS))
        {
            makeArrow(`sm-arrow-${type}`, color);
        }
    }

    private buildSidebar(): void
    {
        const w = this.opts.sidebarWidth;
        this.sidebarEl = htmlEl("div", {
            class: "spinemap-sidebar",
            style: `width:${w}px`
        });
        const hdr = htmlEl("div", {
            class: "spinemap-sidebar-header"
        });
        hdr.appendChild(htmlEl("span", {
            class: "spinemap-sidebar-title"
        }, "Map Structure"));
        const treeWrap = htmlEl("div", {
            class: "spinemap-sidebar-tree",
            id: `spinemap-tree-${Date.now()}`
        });
        this.sidebarEl.append(
            this.buildSidebarResizeHandle(),
            hdr,
            this.buildSidebarToolbar(),
            treeWrap
        );
    }

    private buildSidebarToolbar(): HTMLElement
    {
        const tb = htmlEl("div", {
            class: "spinemap-sidebar-toolbar"
        });
        const addBtn = htmlEl("button", {
            class: "spinemap-sidebar-add " +
                "btn btn-sm btn-primary",
            type: "button"
        }, "+ Add Hub");
        addBtn.addEventListener("click", () =>
            this.addHubFromSidebar()
        );
        const childBtn = htmlEl("button", {
            class: "spinemap-sidebar-add " +
                "btn btn-sm btn-outline-primary",
            type: "button",
            title: "Select a node first, " +
                "then click to add a child"
        }, "+ Add Child");
        childBtn.addEventListener("click", () =>
            this.addChildFromSidebar()
        );
        tb.append(addBtn, childBtn);
        return tb;
    }

    private buildSidebarResizeHandle(): HTMLElement
    {
        const pos = this.opts.sidebarPosition ?? "right";
        const handle = htmlEl("div", {
            class: `spinemap-sidebar-resize ${
                pos === "left"
                    ? "spinemap-sidebar-resize-right"
                    : "spinemap-sidebar-resize-left"
            }`,
            role: "separator",
            "aria-label": "Resize sidebar",
            tabindex: "0"
        });

        this.bindResizePointerEvents(handle, pos);
        this.bindResizeKeyEvents(handle);
        return handle;
    }

    private bindResizePointerEvents(
        handle: HTMLElement, pos: string
    ): void
    {
        handle.addEventListener(
            "pointerdown",
            (e) => this.onResizeDown(handle, e)
        );
        handle.addEventListener(
            "pointermove",
            (e) => this.onResizeMove(e, pos)
        );
        const stop = (): void =>
        {
            this.sidebarResizing = false;
        };
        handle.addEventListener("pointerup", stop);
        handle.addEventListener("pointercancel", stop);
    }

    private onResizeDown(
        handle: HTMLElement, e: PointerEvent
    ): void
    {
        e.preventDefault();
        e.stopPropagation();
        this.sidebarResizing = true;
        this.sidebarResizeStartX = e.clientX;
        this.sidebarResizeStartW = this.sidebarEl
            ? this.sidebarEl.offsetWidth
            : this.opts.sidebarWidth;
        handle.setPointerCapture(e.pointerId);
    }

    private onResizeMove(
        e: PointerEvent, pos: string
    ): void
    {
        if (!this.sidebarResizing || !this.sidebarEl)
        {
            return;
        }
        const dx = e.clientX - this.sidebarResizeStartX;
        const dir = pos === "left" ? 1 : -1;
        const newW = Math.max(180, Math.min(
            600, this.sidebarResizeStartW + dx * dir
        ));
        this.sidebarEl.style.width = `${newW}px`;
    }

    private bindResizeKeyEvents(handle: HTMLElement): void
    {
        handle.addEventListener("keydown", (e: KeyboardEvent) =>
        {
            if (!this.sidebarEl) { return; }
            const step = 10;
            const cur = this.sidebarEl.offsetWidth;
            if (e.key === "ArrowLeft")
            {
                this.sidebarEl.style.width =
                    `${Math.max(180, cur - step)}px`;
            }
            else if (e.key === "ArrowRight")
            {
                this.sidebarEl.style.width =
                    `${Math.min(600, cur + step)}px`;
            }
        });
    }

    private buildLegend(): void
    {
        this.legendEl = htmlEl("div", { class: "spinemap-legend" });
        const statuses: NodeStatus[] = [
            "available", "in-progress", "planned",
            "not-supported", "deprecated"
        ];
        for (const s of statuses)
        {
            const item = htmlEl("div", { class: "spinemap-legend-item" });
            const dot = htmlEl("span", {
                class: "spinemap-legend-dot",
                style: `background:${
                    this.opts.statusColors?.[s] || STATUS_COLORS[s]
                }`
            });
            const lbl = htmlEl("span", {
                class: "spinemap-legend-label"
            }, STATUS_LABELS[s]);
            item.append(dot, lbl);
            this.legendEl.appendChild(item);
        }
        this.rootEl.appendChild(this.legendEl);
    }

    // ========================================================================
    // PRIVATE — SVG RENDERING
    // ========================================================================

    private renderAll(): void
    {
        this.clearSvgGroups();
        this.renderSpinePath();
        this.renderBranchPaths();
        this.renderNodes();
        if (this.opts.showConnections) { this.renderConnections(); }
    }

    private clearSvgGroups(): void
    {
        this.spineG.innerHTML = "";
        this.branchG.innerHTML = "";
        this.nodeG.innerHTML = "";
        this.connG.innerHTML = "";
        this.svgNodes.clear();
        this.svgConns.clear();
    }

    private renderSpinePath(): void
    {
        if (this.hubs.length < 2) { return; }
        const pts = this.hubs.map(h => this.positions.get(h.id)!);
        const d = this.buildSpinePathD(pts);
        const path = svgPath(d, {
            class: "spinemap-spine-path",
            fill: "none",
            stroke: "#adb5bd",
            "stroke-width": "3"
        });
        this.spineG.appendChild(path);
    }

    private buildSpinePathD(pts: NodePos[]): string
    {
        if (pts.length === 0) { return ""; }
        let d = `M ${pts[0].x},${pts[0].y}`;
        for (let i = 1; i < pts.length; i++)
        {
            d += ` L ${pts[i].x},${pts[i].y}`;
        }
        return d;
    }

    private renderBranchPaths(): void
    {
        for (const hub of this.hubs)
        {
            const hp = this.positions.get(hub.id);
            if (!hp) { continue; }
            this.renderBranchPathsForNode(hub.branches, hp);
        }
    }

    private renderBranchPathsForNode(
        branches: SpineBranch[],
        parentPos: NodePos
    ): void
    {
        for (const b of branches)
        {
            const bp = this.positions.get(b.id);
            if (!bp) { continue; }
            const d = this.orthogonalPath(
                parentPos.x, parentPos.y, bp.x, bp.y
            );
            const path = svgPath(d, {
                class: "spinemap-branch-path",
                fill: "none",
                stroke: "#ced4da",
                "stroke-width": "1.5",
                "marker-end": "url(#sm-arrow)"
            });
            this.branchG.appendChild(path);
            if (b.children && b.children.length > 0)
            {
                this.renderBranchPathsForNode(b.children, bp);
            }
        }
    }

    private orthogonalPath(
        x1: number, y1: number,
        x2: number, y2: number
    ): string
    {
        const mx = (x1 + x2) / 2;
        return `M ${x1},${y1} L ${mx},${y1} L ${mx},${y2} L ${x2},${y2}`;
    }

    private renderNodes(): void
    {
        for (const hub of this.hubs)
        {
            this.renderHubNode(hub);
            this.renderBranchNodes(hub.branches);
        }
    }

    private renderHubNode(hub: SpineHub): void
    {
        const p = this.positions.get(hub.id);
        if (!p) { return; }
        const r = SIZE_HUB_RADIUS[this.opts.size];
        const fs = SIZE_FONT[this.opts.size];
        const color = resolveStatusColor(
            hub, this.opts.statusColors
        );
        const g = this.createNodeGroup(
            "spinemap-hub", hub.id, hub.label,
            hub.status, p
        );
        this.appendHubCircles(g, r, color);
        const maxChars = Math.floor(
            (r * 2 - 8) / (fs * 0.6)
        );
        this.appendSvgLabel(
            g, "spinemap-hub-label",
            hub.label, maxChars, fs, { anchor: "middle" }
        );
        this.registerNode(g, hub.id);
    }

    private appendHubCircles(
        g: SVGGElement, r: number, color: string
    ): void
    {
        g.appendChild(svgCreate("circle", {
            class: "spinemap-hub-ring",
            r: String(r), fill: "#f8f9fa",
            stroke: "#adb5bd", "stroke-width": "2"
        }));
        g.appendChild(svgCreate("circle", {
            class: "spinemap-hub-ring-inner",
            r: String(r - 5), fill: "none",
            stroke: color, "stroke-width": "2.5"
        }));
    }

    private renderBranchNodes(branches: SpineBranch[]): void
    {
        for (const b of branches)
        {
            this.renderLeafNode(b);
            if (b.children && b.children.length > 0)
            {
                this.renderBranchNodes(b.children);
            }
        }
    }

    private renderLeafNode(branch: SpineBranch): void
    {
        const p = this.positions.get(branch.id);
        if (!p) { return; }
        const w = SIZE_LEAF_WIDTH[this.opts.size];
        const h = SIZE_LEAF_HEIGHT[this.opts.size];
        const fs = SIZE_FONT[this.opts.size];
        const color = resolveStatusColor(
            branch, this.opts.statusColors
        );
        const g = this.createNodeGroup(
            "spinemap-leaf", branch.id,
            branch.label, branch.status, p
        );
        this.appendLeafShape(g, w, h, color);
        const maxChars = Math.floor(
            (w - 28) / (fs * 0.6)
        );
        this.appendSvgLabel(
            g, "spinemap-leaf-label",
            branch.label, maxChars, fs,
            { x: String(-w / 2 + 20) }
        );
        this.registerNode(g, branch.id);
    }

    private appendLeafShape(
        g: SVGGElement,
        w: number, h: number, color: string
    ): void
    {
        g.appendChild(svgCreate("rect", {
            class: "spinemap-leaf-rect",
            x: String(-w / 2), y: String(-h / 2),
            width: String(w), height: String(h),
            rx: "4", fill: "#f8f9fa",
            stroke: "#ced4da", "stroke-width": "1"
        }));
        g.appendChild(svgCreate("circle", {
            class: "spinemap-leaf-status",
            cx: String(-w / 2 + 10), cy: "0",
            r: String(
                SIZE_FONT[this.opts.size] * 0.3
            ),
            fill: color
        }));
    }

    private createNodeGroup(
        cls: string, id: string, label: string,
        status: string | undefined, p: NodePos
    ): SVGGElement
    {
        return svgCreate("g", {
            class: cls, "data-id": id,
            tabindex: "0", role: "button",
            "aria-label": `${label}, ${status || "available"}`,
            transform: `translate(${p.x},${p.y})`
        }) as SVGGElement;
    }

    private appendSvgLabel(
        g: SVGGElement, cls: string,
        label: string, maxChars: number,
        fs: number,
        extra?: { anchor?: string; x?: string }
    ): void
    {
        const attrs: Record<string, string> = {
            class: cls,
            "dominant-baseline": "central",
            "font-size": `${fs}px`, fill: "#212529"
        };
        if (extra?.anchor)
        {
            attrs["text-anchor"] = extra.anchor;
        }
        if (extra?.x) { attrs["x"] = extra.x; }
        const txt = svgCreate("text", attrs);
        txt.textContent = truncLabel(label, maxChars);
        g.appendChild(txt);
    }

    private registerNode(
        g: SVGGElement, nodeId: string
    ): void
    {
        this.attachNodeEvents(g, nodeId);
        this.nodeG.appendChild(g);
        this.svgNodes.set(nodeId, g);
    }

    private renderConnections(): void
    {
        this.connG.innerHTML = "";
        this.svgConns.clear();
        for (const c of this.connections)
        {
            this.renderOneConnection(c);
        }
    }

    private renderOneConnection(
        conn: SpineConnection
    ): void
    {
        const pa = this.positions.get(conn.from);
        const pb = this.positions.get(conn.to);
        if (!pa || !pb) { return; }
        const d = this.curvedConnPath(
            pa.x, pa.y, pb.x, pb.y
        );
        const attrs = this.connAttrs(conn, d);
        const path = svgPath("", attrs);
        setAttr(path, "d", d);
        this.addConnClickHandler(path, conn);
        this.connG.appendChild(path);
        this.svgConns.set(
            `${conn.from}-${conn.to}`, path
        );
        if (conn.label)
        {
            this.renderConnLabel(conn, pa, pb);
        }
    }

    private connAttrs(
        conn: SpineConnection, d: string
    ): Record<string, string>
    {
        const color = CONN_COLORS[conn.type] || "#6c757d";
        const dash = CONN_DASH[conn.type] || "none";
        const a: Record<string, string> = {
            class: "spinemap-conn " +
                `spinemap-conn-${conn.type}`,
            "data-from": conn.from,
            "data-to": conn.to,
            d, fill: "none",
            stroke: color, "stroke-width": "2"
        };
        if (dash !== "none")
        {
            a["stroke-dasharray"] = dash;
        }
        if (conn.type !== "works-with")
        {
            a["marker-end"] =
                `url(#sm-arrow-${conn.type})`;
        }
        return a;
    }

    private curvedConnPath(
        x1: number, y1: number,
        x2: number, y2: number
    ): string
    {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        const dy = Math.abs(y2 - y1);
        const offset = Math.max(CONN_CURVE_OFFSET, dy * 0.3);
        return `M ${x1},${y1} Q ${mx},${my - offset} ${x2},${y2}`;
    }

    private renderConnLabel(
        conn: SpineConnection,
        pa: NodePos,
        pb: NodePos
    ): void
    {
        const mx = (pa.x + pb.x) / 2;
        const my = (pa.y + pb.y) / 2 - 12;
        const bg = svgCreate("rect", {
            x: String(mx - 30), y: String(my - 8),
            width: "60", height: "16", rx: "3",
            fill: "#f8f9fa", stroke: "#ced4da", "stroke-width": "0.5"
        });
        const txt = svgCreate("text", {
            x: String(mx), y: String(my + 3),
            "text-anchor": "middle",
            "font-size": "10",
            fill: "#6c757d"
        });
        txt.textContent = conn.label || "";
        this.connG.append(bg, txt);
    }

    private addConnClickHandler(
        path: SVGElement,
        conn: SpineConnection
    ): void
    {
        path.style.cursor = "pointer";
        path.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            if (this.opts.editable)
            {
                this.confirmRemove(
                    `Remove "${conn.type}" connection?`
                ).then((ok) =>
                {
                    if (ok) { this.removeConnection(conn.from, conn.to); }
                });
            }
        });
    }

    // ========================================================================
    // PRIVATE — LAYOUT COMPUTATION
    // ========================================================================

    private computeLayout(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        const cw = this.canvasWrapEl?.clientWidth || 800;
        const ch = this.canvasWrapEl?.clientHeight || 600;
        const lo: LayoutOpts = {
            hubSpacing: this.opts.hubSpacing,
            branchSpacing: this.opts.branchSpacing,
            branchLength: this.opts.branchLength,
            canvasWidth: Math.max(cw, 600),
            canvasHeight: Math.max(ch, 400),
            windingHubsPerRow: this.opts.windingHubsPerRow
                ?? DEFAULT_WINDING_HUBS_PER_ROW
        };

        this.positions = this.dispatchLayout(lo);
        this.applyManualOffsets();
        this.runCollisionPass();
    }

    private dispatchLayout(lo: LayoutOpts): Map<string, NodePos>
    {
        switch (this.opts.layout)
        {
            case "horizontal": return layoutHorizontal(this.hubs, lo);
            case "radial": return layoutRadial(this.hubs, lo);
            case "winding": return layoutWinding(this.hubs, lo);
            default: return layoutVertical(this.hubs, lo);
        }
    }

    private applyManualOffsets(): void
    {
        for (const [id, off] of this.manualOffsets)
        {
            const p = this.positions.get(id);
            if (p) { p.x += off.x; p.y += off.y; }
        }
    }

    private runCollisionPass(): void
    {
        resolveCollisions(
            this.positions,
            this.nodeMap,
            SIZE_LEAF_WIDTH[this.opts.size],
            SIZE_LEAF_HEIGHT[this.opts.size],
            SIZE_HUB_RADIUS[this.opts.size]
        );
    }

    // ========================================================================
    // PRIVATE — ZOOM / PAN HANDLERS
    // ========================================================================

    private applyTransform(): void
    {
        const { tx, ty, scale } = this.zoom;
        setAttr(this.transformG,
            "transform", `translate(${tx},${ty}) scale(${scale})`);
    }

    private onWheel(e: WheelEvent): void
    {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        const factor = 1 + dir * ZOOM_STEP;
        const rect = this.svgEl.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const oldScale = this.zoom.scale;
        const newScale = Math.max(this.opts.minZoom,
            Math.min(this.opts.maxZoom, oldScale * factor));

        this.zoom.tx = mx - (mx - this.zoom.tx) * (newScale / oldScale);
        this.zoom.ty = my - (my - this.zoom.ty) * (newScale / oldScale);
        this.zoom.scale = newScale;
        this.applyTransform();
        safeCallback(this.opts.onZoomChange, newScale);
    }

    private onPointerDown(e: PointerEvent): void
    {
        if (e.button !== 0) { return; }
        const target = (e.target as Element).closest("[data-id]");

        if (target && this.opts.editable && e.shiftKey)
        {
            this.startConnection(target.getAttribute("data-id")!, e);
            return;
        }
        if (target && this.opts.editable && !e.shiftKey)
        {
            this.startDrag(target.getAttribute("data-id")!, e);
            return;
        }
        this.startPan(e);
    }

    private onPointerMove(e: PointerEvent): void
    {
        if (this.isPanning) { this.doPan(e); }
        else if (this.isDragging) { this.doDrag(e); }
        else if (this.isConnecting) { this.doConnection(e); }
    }

    private onPointerUp(e: PointerEvent): void
    {
        if (this.isPanning) { this.endPan(); }
        else if (this.isDragging) { this.endDrag(e); }
        else if (this.isConnecting) { this.endConnection(e); }
    }

    private startPan(e: PointerEvent): void
    {
        this.isPanning = true;
        this.panStart = { x: e.clientX, y: e.clientY };
        this.panStartTx = this.zoom.tx;
        this.panStartTy = this.zoom.ty;
        this.svgEl.style.cursor = "grabbing";
    }

    private doPan(e: PointerEvent): void
    {
        this.zoom.tx = this.panStartTx + (e.clientX - this.panStart.x);
        this.zoom.ty = this.panStartTy + (e.clientY - this.panStart.y);
        this.applyTransform();
    }

    private endPan(): void
    {
        this.isPanning = false;
        this.svgEl.style.cursor = "";
    }

    // ========================================================================
    // PRIVATE — VISUAL EDITING (DRAG)
    // ========================================================================

    private startDrag(nodeId: string, e: PointerEvent): void
    {
        this.isDragging = true;
        this.dragNodeId = nodeId;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.selectNode(nodeId);
    }

    private doDrag(e: PointerEvent): void
    {
        if (!this.dragNodeId) { return; }
        const dx = (e.clientX - this.dragStart.x) / this.zoom.scale;
        const dy = (e.clientY - this.dragStart.y) / this.zoom.scale;
        const g = this.svgNodes.get(this.dragNodeId);
        const p = this.positions.get(this.dragNodeId);
        if (!g || !p) { return; }

        setAttr(g, "transform",
            `translate(${p.x + dx},${p.y + dy})`);
    }

    private endDrag(e: PointerEvent): void
    {
        if (!this.dragNodeId) { this.isDragging = false; return; }
        const dx = (e.clientX - this.dragStart.x) / this.zoom.scale;
        const dy = (e.clientY - this.dragStart.y) / this.zoom.scale;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5)
        {
            this.applyDragOffset(dx, dy);
        }
        else
        {
            this.handleNodeClick(this.dragNodeId);
        }
        this.isDragging = false;
        this.dragNodeId = null;
    }

    private applyDragOffset(dx: number, dy: number): void
    {
        const id = this.dragNodeId!;
        const existing = this.manualOffsets.get(id) || { x: 0, y: 0 };
        this.manualOffsets.set(id,
            { x: existing.x + dx, y: existing.y + dy });
        this.computeLayout();
        this.renderAll();
    }

    // ========================================================================
    // PRIVATE — VISUAL EDITING (CONNECTIONS)
    // ========================================================================

    private startConnection(nodeId: string, e: PointerEvent): void
    {
        this.isConnecting = true;
        this.connectFromId = nodeId;
        const p = this.positions.get(nodeId);
        if (!p) { return; }
        this.tempConnLine = svgPath(
            `M ${p.x},${p.y} L ${p.x},${p.y}`,
            { stroke: "#6c757d", "stroke-width": "2",
              "stroke-dasharray": "4,4", fill: "none" }
        );
        this.connG.appendChild(this.tempConnLine);
    }

    private doConnection(e: PointerEvent): void
    {
        if (!this.tempConnLine || !this.connectFromId) { return; }
        const rect = this.svgEl.getBoundingClientRect();
        const sx = (e.clientX - rect.left - this.zoom.tx) / this.zoom.scale;
        const sy = (e.clientY - rect.top - this.zoom.ty) / this.zoom.scale;
        const fp = this.positions.get(this.connectFromId)!;
        setAttr(this.tempConnLine, "d",
            `M ${fp.x},${fp.y} L ${sx},${sy}`);
    }

    private endConnection(e: PointerEvent): void
    {
        if (this.tempConnLine)
        {
            this.tempConnLine.remove();
            this.tempConnLine = null;
        }
        this.isConnecting = false;

        const target = (e.target as Element).closest("[data-id]");
        if (target && this.connectFromId)
        {
            const toId = target.getAttribute("data-id")!;
            if (toId !== this.connectFromId)
            {
                this.promptConnectionType(this.connectFromId, toId);
            }
        }
        this.connectFromId = null;
    }

    private promptConnectionType(fromId: string, toId: string): void
    {
        const types: ConnectionType[] =
            ["depends-on", "works-with", "blocks", "enhances"];
        const choice = prompt(
            "Connection type:\n1) depends-on\n2) works-with\n"
            + "3) blocks\n4) enhances\nEnter number (1-4):"
        );
        const idx = parseInt(choice || "", 10) - 1;
        if (idx >= 0 && idx < types.length)
        {
            this.addConnection({ from: fromId, to: toId, type: types[idx] });
        }
    }

    // ========================================================================
    // PRIVATE — NODE EVENTS
    // ========================================================================

    private attachNodeEvents(g: SVGGElement, nodeId: string): void
    {
        g.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            if (!this.isDragging && !this.isConnecting)
            {
                this.handleNodeClick(nodeId);
            }
        });
        g.addEventListener("dblclick", (e) =>
        {
            e.stopPropagation();
            this.handleNodeDblClick(nodeId);
        });
        g.addEventListener("mouseenter", () =>
        {
            const node = this.findNodeData(nodeId);
            safeCallback(this.opts.onNodeHover, node);
        });
        g.addEventListener("mouseleave", () =>
        {
            safeCallback(this.opts.onNodeHover, null);
        });
    }

    private handleNodeClick(nodeId: string): void
    {
        this.selectNode(nodeId);
        this.showPopover(nodeId);
        const node = this.findNodeData(nodeId);
        safeCallback(this.opts.onNodeClick, node);
    }

    private handleNodeDblClick(nodeId: string): void
    {
        if (this.opts.editable)
        {
            this.showPopover(nodeId, true);
        }
        const node = this.findNodeData(nodeId);
        safeCallback(this.opts.onNodeDoubleClick, node);
    }

    // ========================================================================
    // PRIVATE — POPOVER
    // ========================================================================

    private clearPopoverContent(): void
    {
        for (const adapter of this.activeFieldAdapters)
        {
            adapter.destroy();
        }
        this.activeFieldAdapters = [];
        this.popoverEl.replaceChildren();
    }

    private showPopover(nodeId: string, editMode = false): void
    {
        this.hidePopover();
        this.popoverNodeId = nodeId;
        const node = this.findNodeData(nodeId);
        if (!node) { return; }

        this.clearPopoverContent();
        this.popoverEl.style.display = "";

        if (editMode && this.opts.editable)
        {
            this.buildPopoverEdit(node, nodeId);
        }
        else
        {
            this.buildPopoverView(node, nodeId);
        }
        this.positionPopover(nodeId);
    }

    private hidePopover(): void
    {
        this.popoverEl.style.display = "none";
        this.clearPopoverContent();
        this.popoverNodeId = null;
    }

    private buildPopoverView(
        node: SpineHub | SpineBranch,
        nodeId: string
    ): void
    {
        const hdr = this.buildPopoverHeader(
            node.label
        );
        const body = htmlEl("div", {
            class: "spinemap-popover-body"
        });
        this.renderViewFields(body, node, nodeId);
        this.popoverEl.append(hdr, body);
        if (this.opts.editable)
        {
            this.appendPopoverActions(nodeId);
        }
    }

    private renderViewFields(
        body: HTMLElement,
        node: SpineHub | SpineBranch,
        nodeId: string
    ): void
    {
        for (const cfg of this.resolvedPopoverFields)
        {
            if (cfg.showInView === false) { continue; }
            if (cfg.type === "connections")
            {
                this.appendPopoverDeps(body, nodeId);
                continue;
            }
            this.renderOneViewField(body, node, cfg);
        }
    }

    private renderOneViewField(
        body: HTMLElement,
        node: SpineHub | SpineBranch,
        cfg: SpinePopoverFieldConfig
    ): void
    {
        const stored = readFieldValue(node, cfg);
        if (!stored && cfg.key !== "status") { return; }
        const deser = cfg.deserialize
            ? cfg.deserialize(stored)
            : defaultDeserialize(cfg.type, stored);
        const adapter = createFieldAdapter(
            cfg, this.opts.statusColors
        );
        const viewEl = cfg.renderView
            ? cfg.renderView(deser, node)
            : adapter.renderView(deser);
        this.appendPopoverField(
            body, cfg.label, viewEl
        );
    }

    private buildPopoverHeader(title: string): HTMLElement
    {
        const hdr = htmlEl("div", {
            class: "spinemap-popover-header"
        });
        hdr.appendChild(htmlEl("span", {
            class: "spinemap-popover-title"
        }, title));
        const closeBtn = htmlEl("button", {
            class: "spinemap-popover-close",
            type: "button",
            "aria-label": "Close"
        }, "\u00D7");
        closeBtn.addEventListener("click",
            () => this.hidePopover());
        hdr.appendChild(closeBtn);
        return hdr;
    }

    private appendPopoverField(
        body: HTMLElement,
        label: string,
        value: string | HTMLElement
    ): void
    {
        const row = htmlEl("div", {
            class: "spinemap-popover-field"
        });
        row.appendChild(htmlEl("span", {
            class: "spinemap-popover-label"
        }, label + ":"));
        if (typeof value === "string")
        {
            row.appendChild(htmlEl("span", {
                class: "spinemap-popover-value"
            }, value));
        }
        else
        {
            row.appendChild(value);
        }
        body.appendChild(row);
    }

    private appendPopoverDeps(
        body: HTMLElement,
        nodeId: string
    ): void
    {
        const deps = this.connections.filter(
            c => c.from === nodeId || c.to === nodeId
        );
        if (deps.length === 0) { return; }
        const wrap = htmlEl("div", {
            class: "spinemap-popover-deps"
        });
        wrap.appendChild(htmlEl("span", {
            class: "spinemap-popover-label"
        }, "Connections:"));
        for (const d of deps)
        {
            const otherId =
                d.from === nodeId ? d.to : d.from;
            const other = this.findNodeData(otherId);
            const txt =
                `${d.type}: ${other?.label || otherId}`;
            wrap.appendChild(htmlEl("div", {
                class: "spinemap-popover-dep"
            }, txt));
        }
        body.appendChild(wrap);
    }

    private appendPopoverActions(nodeId: string): void
    {
        const acts = htmlEl("div", {
            class: "spinemap-popover-actions"
        });
        acts.append(
            this.popoverBtn("Edit", () =>
                this.showPopover(nodeId, true)),
            this.popoverBtn("Add Child", () =>
                this.addChildFromPopover(nodeId)),
            this.popoverRemoveBtn(nodeId)
        );
        this.popoverEl.appendChild(acts);
    }

    private popoverBtn(
        label: string, handler: () => void
    ): HTMLElement
    {
        const btn = htmlEl("button", {
            class: "spinemap-popover-btn",
            type: "button"
        }, label);
        btn.addEventListener("click", handler);
        return btn;
    }

    private popoverRemoveBtn(
        nodeId: string
    ): HTMLElement
    {
        const btn = htmlEl("button", {
            class: "spinemap-popover-btn " +
                "spinemap-popover-btn-danger",
            type: "button"
        }, "Remove");
        btn.addEventListener("click", () =>
        {
            this.confirmRemove(
                "Remove this node and all children?"
            ).then((ok) =>
            {
                if (ok)
                {
                    this.removeNode(nodeId);
                    this.hidePopover();
                }
            });
        });
        return btn;
    }

    private buildPopoverEdit(
        node: SpineHub | SpineBranch,
        nodeId: string
    ): void
    {
        const hdr = this.buildPopoverHeader(
            "Edit: " + node.label
        );
        const form = htmlEl("div", {
            class: "spinemap-popover-form"
        });
        const adapterMap =
            new Map<string, SpineFieldAdapter>();
        const deferred = this.collectEditFields(
            node, form, adapterMap
        );
        const body = htmlEl("div", {
            class: "spinemap-popover-body"
        });
        body.appendChild(form);
        const foot = this.buildEditFooter(
            nodeId, adapterMap
        );
        this.popoverEl.append(hdr, body, foot);
        this.mountDeferredAdapters(deferred);
    }

    private collectEditFields(
        node: SpineHub | SpineBranch,
        form: HTMLElement,
        adapterMap: Map<string, SpineFieldAdapter>
    ): DeferredMount[]
    {
        const deferred: DeferredMount[] = [];
        const labelAdapter = new NativeInputAdapter("text");
        const labelSlot = createFieldSlot(form, {
            key: "label", label: "Label", type: "text"
        });
        deferred.push({
            adapter: labelAdapter,
            slot: labelSlot,
            value: node.label
        });
        adapterMap.set("label", labelAdapter);
        this.activeFieldAdapters.push(labelAdapter);

        for (const cfg of this.resolvedPopoverFields)
        {
            if (cfg.showInEdit === false) { continue; }
            if (cfg.type === "connections") { continue; }
            this.pushFieldDeferred(
                node, cfg, form, deferred, adapterMap
            );
        }
        return deferred;
    }

    private pushFieldDeferred(
        node: SpineHub | SpineBranch,
        cfg: SpinePopoverFieldConfig,
        form: HTMLElement,
        deferred: DeferredMount[],
        adapterMap: Map<string, SpineFieldAdapter>
    ): void
    {
        const adapter = createFieldAdapter(
            cfg, this.opts.statusColors
        );
        const stored = readFieldValue(node, cfg);
        const deser = cfg.deserialize
            ? cfg.deserialize(stored)
            : defaultDeserialize(cfg.type, stored);
        const slot = createFieldSlot(form, cfg);
        deferred.push({ adapter, slot, value: deser });
        adapterMap.set(cfg.key, adapter);
        this.activeFieldAdapters.push(adapter);
    }

    private mountDeferredAdapters(
        deferred: DeferredMount[]
    ): void
    {
        for (const d of deferred)
        {
            d.adapter.mount(d.slot, d.value);
        }
    }

    private buildEditFooter(
        nodeId: string,
        adapterMap: Map<string, SpineFieldAdapter>
    ): HTMLElement
    {
        const foot = htmlEl("div", {
            class: "spinemap-popover-actions"
        });
        const saveBtn = htmlEl("button", {
            class: "spinemap-popover-btn " +
                "spinemap-popover-btn-primary",
            type: "button"
        }, "Save");
        saveBtn.addEventListener("click", () =>
        {
            this.savePopoverEdit(nodeId, adapterMap);
        });
        const cancelBtn = htmlEl("button", {
            class: "spinemap-popover-btn",
            type: "button"
        }, "Cancel");
        cancelBtn.addEventListener("click", () =>
            this.showPopover(nodeId, false));
        foot.append(saveBtn, cancelBtn);
        return foot;
    }

    private savePopoverEdit(
        nodeId: string,
        adapterMap: Map<string, SpineFieldAdapter>
    ): void
    {
        const changes: Record<string, unknown> = {};
        const labelAdapter = adapterMap.get("label");
        if (labelAdapter)
        {
            changes["label"] = labelAdapter.getValue();
        }

        for (const cfg of this.resolvedPopoverFields)
        {
            if (cfg.showInEdit === false) { continue; }
            if (cfg.type === "connections") { continue; }
            const adapter = adapterMap.get(cfg.key);
            if (!adapter) { continue; }
            writeFieldValue(changes, cfg, adapter);
        }

        this.updateNode(
            nodeId,
            changes as Partial<SpineHub | SpineBranch>
        );
        this.showPopover(nodeId, false);
    }

    private addChildFromPopover(parentId: string): void
    {
        const newId = this.genId();
        const child: SpineBranch = {
            id: newId,
            label: "New Item",
            status: "planned",
            children: []
        };
        this.addBranch(child, parentId);
        this.hidePopover();
        requestAnimationFrame(
            () => this.showPopover(newId, true)
        );
    }

    private positionPopover(nodeId: string): void
    {
        const g = this.svgNodes.get(nodeId);
        if (!g) { return; }
        const gRect = g.getBoundingClientRect();
        const popW = this.opts.popoverWidth
            || this.popoverEl.offsetWidth || 300;
        const ddH = this.popoverEl.offsetHeight || 320;
        const below = window.innerHeight - gRect.bottom;
        const above = below < ddH && gRect.top > below;
        this.popoverEl.style.position = "fixed";
        this.popoverEl.style.left =
            `${gRect.left + gRect.width / 2 - popW / 2}px`;
        this.setPopoverVertical(gRect, above);
        this.clampPopover();
    }

    private setPopoverVertical(
        gRect: DOMRect, above: boolean
    ): void
    {
        if (above)
        {
            this.popoverEl.style.top = "";
            this.popoverEl.style.bottom =
                `${window.innerHeight - gRect.top + 4}px`;
        }
        else
        {
            this.popoverEl.style.bottom = "";
            this.popoverEl.style.top =
                `${gRect.bottom + 4}px`;
        }
    }

    private clampPopover(): void
    {
        requestAnimationFrame(() =>
        {
            if (!this.popoverEl) { return; }
            const pr =
                this.popoverEl.getBoundingClientRect();
            if (pr.right > window.innerWidth)
            {
                this.popoverEl.style.left =
                    `${window.innerWidth - pr.width - 4}px`;
            }
            if (pr.left < 0)
            {
                this.popoverEl.style.left = "4px";
            }
            if (pr.bottom > window.innerHeight)
            {
                this.popoverEl.style.maxHeight =
                    `${window.innerHeight - pr.top - 4}px`;
            }
        });
    }

    // ========================================================================
    // PRIVATE — SIDEBAR (TreeGrid Bridge)
    // ========================================================================

    private syncSidebar(): void
    {
        if (!this.sidebarEl) { return; }
        const treeWrap = this.sidebarEl.querySelector(
            ".spinemap-sidebar-tree"
        ) as HTMLElement;
        if (!treeWrap) { return; }

        if (this.treeGridInstance)
        {
            this.updateTreeGridData();
            return;
        }

        const createFn = (
            window as unknown as Record<string, unknown>
        ).createTreeGrid;
        if (createFn)
        {
            this.initTreeGrid(treeWrap);
        }
        else
        {
            this.buildFallbackTree(treeWrap);
        }
    }

    private initTreeGrid(container: HTMLElement): void
    {
        const createFn = (
            window as unknown as Record<string, unknown>
        ).createTreeGrid as
            ((o: Record<string, unknown>) => Record<string, Function>)
            | undefined;

        if (!createFn)
        {
            this.buildFallbackTree(container);
            return;
        }
        const cfg = this.treeGridConfig(container.id);
        this.treeGridInstance = createFn(cfg);
    }

    private treeGridConfig(
        containerId: string
    ): Record<string, unknown>
    {
        return {
            containerId,
            label: "SpineMap structure",
            nodes: this.buildTreeGridNodes(),
            columns: this.treeGridColumns(),
            treeColumnLabel: "Name",
            treeColumnWidth: 160,
            selectionMode: "single",
            enableDragDrop: true,
            enableContextMenu: true,
            contextMenuItems:
                this.treeGridContextItems(),
            ...this.treeGridCallbacks()
        };
    }

    private treeGridCallbacks(): Record<string, Function>
    {
        const id = (n: Record<string, unknown>) =>
            n["id"] as string;
        return {
            onRowSelect: (n: Record<string, unknown>) =>
            {
                this.selectNode(id(n));
                this.panTo(id(n));
            },
            onEditCommit: (
                n: Record<string, unknown>,
                col: Record<string, unknown>,
                _old: unknown, val: unknown
            ) => this.handleTreeEdit(
                id(n), id(col), val as string
            ),
            onDrop: (
                src: Record<string, unknown>,
                tgt: Record<string, unknown>
            ) => this.reparentNode(id(src), id(tgt)),
            onContextMenuAction: (
                actionId: string,
                n: Record<string, unknown>
            ) => this.handleTreeContextAction(
                actionId, id(n)
            )
        };
    }

    private treeGridContextItems(): Record<string, unknown>[]
    {
        return [
            {
                id: "add-child", label: "Add Child",
                icon: "bi-plus-circle"
            },
            { id: "sep1", label: "", separator: true },
            { id: "remove", label: "Remove", icon: "bi-trash" }
        ];
    }

    private treeGridColumns(): Record<string, unknown>[]
    {
        return [
            {
                id: "status", label: "Status", width: 100,
                editable: true, editorType: "select",
                editorOptions: [
                    { value: "available", label: "Available" },
                    { value: "in-progress", label: "In Progress" },
                    { value: "planned", label: "Planned" },
                    { value: "not-supported", label: "Not Supported" },
                    { value: "deprecated", label: "Deprecated" }
                ]
            },
            {
                id: "timeframe", label: "Timeframe", width: 90,
                editable: true, editorType: "text"
            }
        ];
    }

    private buildTreeGridNodes(): Record<string, unknown>[]
    {
        return this.hubs.map(h => ({
            id: h.id,
            label: h.label,
            data: {
                status: h.status || "available",
                timeframe: h.timeframe || ""
            },
            children: this.branchesToTreeNodes(h.branches)
        }));
    }

    private branchesToTreeNodes(
        branches: SpineBranch[]
    ): Record<string, unknown>[]
    {
        return branches.map(b => ({
            id: b.id,
            label: b.label,
            data: {
                status: b.status || "available",
                timeframe: b.timeframe || ""
            },
            children: b.children
                ? this.branchesToTreeNodes(b.children)
                : []
        }));
    }

    private updateTreeGridData(): void
    {
        if (!this.treeGridInstance) { return; }
        if (this.treeGridInstance["destroy"])
        {
            this.treeGridInstance["destroy"]();
        }
        this.treeGridInstance = null;
        const treeWrap = this.sidebarEl?.querySelector(
            ".spinemap-sidebar-tree"
        ) as HTMLElement;
        if (treeWrap)
        {
            treeWrap.innerHTML = "";
            this.initTreeGrid(treeWrap);
        }
    }

    private handleTreeContextAction(
        actionId: string,
        nodeId: string
    ): void
    {
        if (actionId === "add-child")
        {
            this.addChildFromPopover(nodeId);
        }
        else if (actionId === "remove")
        {
            this.confirmRemove(
                "Remove this node and all children?"
            ).then((ok) =>
            {
                if (ok)
                {
                    this.removeNode(nodeId);
                    this.hidePopover();
                }
            });
        }
    }

    private handleTreeEdit(
        nodeId: string,
        colId: string,
        value: string
    ): void
    {
        const changes: Record<string, unknown> = {};
        changes[colId] = value;
        this.updateNode(nodeId, changes as Partial<SpineHub | SpineBranch>);
    }

    private buildFallbackTree(container: HTMLElement): void
    {
        container.innerHTML = "";
        const list = htmlEl("div", { class: "spinemap-fallback-tree" });
        for (const hub of this.hubs)
        {
            this.buildFallbackHubRow(list, hub);
        }
        container.appendChild(list);
    }

    private buildFallbackHubRow(
        list: HTMLElement,
        hub: SpineHub
    ): void
    {
        const row = htmlEl("div", {
            class: "spinemap-fallback-row spinemap-fallback-hub"
        });
        row.appendChild(htmlEl("span", {}, hub.label));
        row.addEventListener("click", () =>
        {
            this.selectNode(hub.id);
            this.panTo(hub.id);
        });
        list.appendChild(row);

        for (const b of hub.branches)
        {
            this.buildFallbackBranchRow(list, b, 1);
        }
    }

    private buildFallbackBranchRow(
        list: HTMLElement,
        branch: SpineBranch,
        depth: number
    ): void
    {
        const row = htmlEl("div", {
            class: "spinemap-fallback-row",
            style: `padding-left:${depth * 16}px`
        });
        row.appendChild(htmlEl("span", {}, branch.label));
        row.addEventListener("click", () =>
        {
            this.selectNode(branch.id);
            this.panTo(branch.id);
        });
        list.appendChild(row);

        if (branch.children)
        {
            for (const c of branch.children)
            {
                this.buildFallbackBranchRow(list, c, depth + 1);
            }
        }
    }

    private addHubFromSidebar(): void
    {
        const newHub: SpineHub = {
            id: this.genId(),
            label: "New Hub",
            status: "planned",
            branches: []
        };
        this.addHub(newHub);
        requestAnimationFrame(() =>
            this.showPopover(newHub.id, true));
    }

    private addChildFromSidebar(): void
    {
        if (!this.selectedId)
        {
            this.announce("Select a node first");
            return;
        }
        this.addChildFromPopover(this.selectedId);
    }

    // ========================================================================
    // PRIVATE — EVENTS
    // ========================================================================

    private bindEvents(): void
    {
        this.boundWheel = (e) => this.onWheel(e);
        this.boundPointerDown = (e) => this.onPointerDown(e);
        this.boundPointerMove = (e) => this.onPointerMove(e);
        this.boundPointerUp = (e) => this.onPointerUp(e);
        this.boundKeyDown = (e) => this.onKeyDown(e);

        this.svgEl.addEventListener("wheel", this.boundWheel,
            { passive: false });
        this.svgEl.addEventListener("pointerdown", this.boundPointerDown);
        window.addEventListener("pointermove", this.boundPointerMove);
        window.addEventListener("pointerup", this.boundPointerUp);
        this.rootEl.addEventListener("keydown", this.boundKeyDown);

        this.svgEl.addEventListener("click", (e) =>
        {
            if (e.target === this.svgEl || e.target === this.transformG)
            {
                this.clearSelection();
                this.hidePopover();
            }
        });
    }

    private unbindEvents(): void
    {
        this.svgEl.removeEventListener("wheel", this.boundWheel);
        this.svgEl.removeEventListener("pointerdown",
            this.boundPointerDown);
        window.removeEventListener("pointermove", this.boundPointerMove);
        window.removeEventListener("pointerup", this.boundPointerUp);
        this.rootEl.removeEventListener("keydown", this.boundKeyDown);
    }

    private onKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape") { this.hidePopover(); return; }
        if (e.key === "+" || e.key === "=") { this.zoomIn(); return; }
        if (e.key === "-") { this.zoomOut(); return; }
        if (e.key === "0") { this.fitToView(); return; }
        this.handleArrowPan(e);
    }

    private handleArrowPan(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? PAN_STEP * 3 : PAN_STEP;
        let handled = true;
        switch (e.key)
        {
            case "ArrowLeft": this.zoom.tx += step; break;
            case "ArrowRight": this.zoom.tx -= step; break;
            case "ArrowUp": this.zoom.ty += step; break;
            case "ArrowDown": this.zoom.ty -= step; break;
            default: handled = false;
        }
        if (handled) { e.preventDefault(); this.applyTransform(); }
    }

    // ========================================================================
    // PRIVATE — UTILITIES
    // ========================================================================

    private findNodeData(
        nodeId: string
    ): (SpineHub | SpineBranch) | undefined
    {
        for (const h of this.hubs)
        {
            if (h.id === nodeId) { return h; }
            const found = this.findInBranches(h.branches, nodeId);
            if (found) { return found; }
        }
        return undefined;
    }

    private findInBranches(
        branches: SpineBranch[],
        nodeId: string
    ): SpineBranch | undefined
    {
        for (const b of branches)
        {
            if (b.id === nodeId) { return b; }
            if (b.children)
            {
                const found = this.findInBranches(b.children, nodeId);
                if (found) { return found; }
            }
        }
        return undefined;
    }

    private removeBranchFromParent(
        nodeId: string,
        parentId: string | null
    ): void
    {
        if (!parentId) { return; }
        const parent = this.findNodeData(parentId);
        if (!parent) { return; }

        if ("branches" in parent)
        {
            parent.branches = parent.branches.filter(b => b.id !== nodeId);
        }
        if ("children" in parent && parent.children)
        {
            parent.children = parent.children.filter(
                (c: SpineBranch) => c.id !== nodeId
            );
        }
    }

    private computeBBox(): { x: number; y: number; w: number; h: number }
    {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        for (const p of this.positions.values())
        {
            if (p.x < minX) { minX = p.x; }
            if (p.y < minY) { minY = p.y; }
            if (p.x > maxX) { maxX = p.x; }
            if (p.y > maxY) { maxY = p.y; }
        }
        if (!isFinite(minX)) { return { x: 0, y: 0, w: 400, h: 300 }; }
        return {
            x: minX - 80,
            y: minY - 80,
            w: maxX - minX + 160,
            h: maxY - minY + 160
        };
    }

    private genId(): string
    {
        return `sm-node-${++this.idCounter}-${Date.now().toString(36)}`;
    }

    private refreshAfterEdit(): void
    {
        this.nodeMap = buildNodeMap(this.hubs);
        this.computeLayout();
        this.renderAll();
        this.syncSidebar();
    }

    private downloadExport(format: string): void
    {
        if (format === "svg")
        {
            this.downloadBlob(
                new Blob([this.exportSVG()], { type: "image/svg+xml" }),
                "spinemap.svg"
            );
        }
        else if (format === "json")
        {
            this.downloadBlob(
                new Blob([this.exportJSON()],
                    { type: "application/json" }),
                "spinemap.json"
            );
        }
        else if (format === "png")
        {
            this.exportPNG().then(blob =>
                this.downloadBlob(blob, "spinemap.png"));
        }
    }

    private downloadBlob(blob: Blob, name: string): void
    {
        const url = URL.createObjectURL(blob);
        const a = htmlEl("a", { href: url, download: name });
        document.body.appendChild(a);
        (a as HTMLAnchorElement).click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /** Route destructive confirmations through configurable callback,
     *  ConfirmDialog component, or browser confirm() as fallback. */
    private confirmRemove(message: string): Promise<boolean>
    {
        if (this.opts.onConfirmRemove)
        {
            return this.opts.onConfirmRemove(message);
        }

        const win = window as unknown as Record<string, unknown>;
        if (typeof win["showDangerConfirmDialog"] === "function")
        {
            return (win["showDangerConfirmDialog"] as
                (msg: string) => Promise<boolean>)(message);
        }

        return Promise.resolve(confirm(message));
    }

    private announce(msg: string): void
    {
        this.liveRegion.textContent = msg;
        setTimeout(() => { this.liveRegion.textContent = ""; }, 3000);
    }
}

// ============================================================================
// FACTORY
// ============================================================================

export function createSpineMap(options: SpineMapOptions): SpineMap
{
    return new SpineMap(options);
}

(window as unknown as Record<string, unknown>).createSpineMap = createSpineMap;
