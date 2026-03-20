/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: GradientPicker
 * 📜 PURPOSE: Gradient colour picker with draggable stops, live CSS preview,
 *             linear/radial modes, and composition with ColorPicker + AnglePicker.
 * 🔗 RELATES: [[ColorPicker]], [[AnglePicker]], [[DiagramEngine]]
 * ⚡ FLOW: [Consumer App] -> [createGradientPicker()] -> [Gradient Editing UI]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[GradientPicker]";

/** Popup z-index (same level as modals). */
const POPUP_Z_INDEX = 1050;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

/** Minimum drag distance between stops in normalised units. */
const MIN_STOP_GAP = 0.01;

/** Default two-stop gradient (black to white). */
const DEFAULT_STOPS: GradientStop[] = [
    { position: 0, color: "#000000", alpha: 1 },
    { position: 1, color: "#FFFFFF", alpha: 1 }
];

// ============================================================================
// INTERFACES
// ============================================================================

/** A single colour stop in the gradient. */
export interface GradientStop
{
    /** Position along the gradient axis. 0.0 = start, 1.0 = end. */
    position: number;

    /** Colour in hex (#RRGGBB) or rgba string. */
    color: string;

    /** Opacity for this stop. 0.0 = transparent, 1.0 = opaque. Default: 1.0. */
    alpha: number;
}

/** Full gradient definition including type, stops, angle, and radial params. */
export interface GradientValue
{
    /** Gradient interpolation type. */
    type: "linear" | "radial";

    /** Ordered colour stops (minimum 2). */
    stops: GradientStop[];

    /** Angle in degrees for linear gradients (0 = right, 90 = down). */
    angle: number;

    /** Centre point for radial gradients (0-1 normalised). */
    center: { x: number; y: number };

    /** Radius for radial gradients (0-1 normalised). */
    radius: number;
}

/** Configuration options for the GradientPicker component. */
export interface GradientPickerOptions
{
    /** Initial gradient value. */
    value?: Partial<GradientValue>;

    /** Display mode. Default: "popup". */
    mode?: "inline" | "popup";

    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";

    /** Popup position relative to trigger. Default: "bottom-start". */
    popupPosition?: "bottom-start" | "bottom-end" | "top-start" | "top-end";

    /** Minimum number of stops. Default: 2. */
    minStops?: number;

    /** Maximum number of stops. Default: 8. */
    maxStops?: number;

    /** Show gradient type toggle (linear/radial). Default: true. */
    showTypeToggle?: boolean;

    /** Show angle control (linear mode). Default: true. */
    showAngle?: boolean;

    /** Show centre/radius controls (radial mode). Default: true. */
    showRadialControls?: boolean;

    /** Show reverse button. Default: true. */
    showReverse?: boolean;

    /** Show clear button. Default: true. */
    showClear?: boolean;

    /** Preset gradient swatches. */
    presets?: GradientPreset[];

    /** Disable the component. Default: false. */
    disabled?: boolean;

    /** Label text above the picker. */
    label?: string;

    /** Fires on any gradient change (stops, angle, type, center, radius). */
    onChange?: (value: GradientValue) => void;

    /** Fires continuously during drag operations. */
    onInput?: (value: GradientValue) => void;

    /** Fires when gradient is cleared. */
    onClear?: () => void;

    /** Fires when popup opens. */
    onOpen?: () => void;

    /** Fires when popup closes. */
    onClose?: () => void;
}

/** A preset gradient swatch for quick selection. */
export interface GradientPreset
{
    /** Display name for tooltip. */
    name: string;

    /** Gradient definition for this preset. */
    value: GradientValue;
}

/**
 * DiagramEngine gradient definition format.
 * Used for conversion helpers toGradientDefinition / fromGradientDefinition.
 */
export interface GradientDefinition
{
    type: "linear" | "radial";
    stops: Array<{ offset: number; color: string }>;
    angle: number;
    center: { x: number; y: number };
    radius: number;
}

// ============================================================================
// DEFAULT PRESETS
// ============================================================================

/** Built-in preset gradients shown when no custom presets provided. */
const DEFAULT_PRESETS: GradientPreset[] = [
    {
        name: "Sunset",
        value: {
            type: "linear", angle: 90,
            stops: [
                { position: 0, color: "#FF512F", alpha: 1 },
                { position: 0.5, color: "#F09819", alpha: 1 },
                { position: 1, color: "#DD2476", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    },
    {
        name: "Ocean",
        value: {
            type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#2193B0", alpha: 1 },
                { position: 1, color: "#6DD5ED", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    },
    {
        name: "Grayscale",
        value: {
            type: "linear", angle: 90,
            stops: [
                { position: 0, color: "#000000", alpha: 1 },
                { position: 1, color: "#FFFFFF", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    },
    {
        name: "Forest",
        value: {
            type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#134E5E", alpha: 1 },
                { position: 1, color: "#71B280", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    },
    {
        name: "Berry",
        value: {
            type: "linear", angle: 135,
            stops: [
                { position: 0, color: "#8E2DE2", alpha: 1 },
                { position: 1, color: "#4A00E0", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    },
    {
        name: "Fire",
        value: {
            type: "linear", angle: 0,
            stops: [
                { position: 0, color: "#F83600", alpha: 1 },
                { position: 1, color: "#F9D423", alpha: 1 }
            ],
            center: { x: 0.5, y: 0.5 }, radius: 0.5
        }
    }
];

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

/** Clamp a number between min and max. */
function clamp(val: number, min: number, max: number): number
{
    return Math.min(Math.max(val, min), max);
}

/** Deep-clone a GradientStop array to avoid mutation. */
function cloneStops(stops: GradientStop[]): GradientStop[]
{
    return stops.map((s) => ({ ...s }));
}

/** Parse hex colour to RGBA components. Returns null on invalid input. */
function hexToRgba(hex: string): { r: number; g: number; b: number; a: number } | null
{
    const clean = hex.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(clean))
    {
        return null;
    }

    return {
        r: parseInt(clean.substring(0, 2), 16),
        g: parseInt(clean.substring(2, 4), 16),
        b: parseInt(clean.substring(4, 6), 16),
        a: clean.length === 8 ? parseInt(clean.substring(6, 8), 16) / 255 : 1
    };
}

/** Convert a stop colour + alpha into an rgba() CSS string. */
function stopToRgba(stop: GradientStop): string
{
    const parsed = hexToRgba(stop.color);
    if (!parsed)
    {
        return `rgba(0, 0, 0, ${stop.alpha})`;
    }

    return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${stop.alpha})`;
}

/** Build a CSS linear-gradient string from a GradientValue. */
function buildLinearGradientCSS(value: GradientValue): string
{
    const sorted = [...value.stops].sort((a, b) => a.position - b.position);
    const stopStrings = sorted.map(
        (s) => `${stopToRgba(s)} ${Math.round(s.position * 100)}%`
    );

    return `linear-gradient(${value.angle}deg, ${stopStrings.join(", ")})`;
}

/** Build a CSS radial-gradient string from a GradientValue. */
function buildRadialGradientCSS(value: GradientValue): string
{
    const sorted = [...value.stops].sort((a, b) => a.position - b.position);
    const stopStrings = sorted.map(
        (s) => `${stopToRgba(s)} ${Math.round(s.position * 100)}%`
    );
    const cx = Math.round(value.center.x * 100);
    const cy = Math.round(value.center.y * 100);
    const shape = `circle at ${cx}% ${cy}%`;

    return `radial-gradient(${shape}, ${stopStrings.join(", ")})`;
}

/** Build the appropriate CSS gradient string based on type. */
function buildGradientCSS(value: GradientValue): string
{
    if (value.type === "radial")
    {
        return buildRadialGradientCSS(value);
    }
    return buildLinearGradientCSS(value);
}

/**
 * Interpolate colour at a given position between two stops.
 * Returns hex string of the interpolated colour.
 */
function interpolateColor(
    leftStop: GradientStop, rightStop: GradientStop, position: number
): { color: string; alpha: number }
{
    const range = rightStop.position - leftStop.position;
    const t = range > 0 ? (position - leftStop.position) / range : 0;
    const lc = hexToRgba(leftStop.color);
    const rc = hexToRgba(rightStop.color);

    if (!lc || !rc)
    {
        return { color: "#808080", alpha: 1 };
    }

    const r = Math.round(lc.r + (rc.r - lc.r) * t);
    const g = Math.round(lc.g + (rc.g - lc.g) * t);
    const b = Math.round(lc.b + (rc.b - lc.b) * t);
    const a = lc.a + (rc.a - lc.a) * t;
    const toHex = (n: number) => n.toString(16).padStart(2, "0");

    return {
        color: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
        alpha: Math.round((leftStop.alpha + (rightStop.alpha - leftStop.alpha) * t) * 100) / 100
    };
}

/** Build a default GradientValue from partial input. */
function buildDefaultValue(partial?: Partial<GradientValue>): GradientValue
{
    return {
        type: partial?.type ?? "linear",
        stops: partial?.stops ? cloneStops(partial.stops) : cloneStops(DEFAULT_STOPS),
        angle: partial?.angle ?? 90,
        center: partial?.center ? { ...partial.center } : { x: 0.5, y: 0.5 },
        radius: partial?.radius ?? 0.5
    };
}

// ============================================================================
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: GradientPicker
 *
 * Gradient colour picker with draggable stops, live CSS preview, linear/radial
 * types, and composition with ColorPicker and AnglePicker.
 *
 * @example
 * var picker = createGradientPicker("container", {
 *     mode: "inline",
 *     onChange: (value) => console.log("Gradient:", value)
 * });
 */
export class GradientPicker
{
    private readonly instanceId: string;
    private readonly options: GradientPickerOptions;

    // Gradient state
    private gradientValue: GradientValue;
    private selectedStopIndex = 0;
    private isOpen = false;
    private isDisabled = false;

    // Stop constraints
    private readonly minStops: number;
    private readonly maxStops: number;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private triggerSwatch: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private previewGradient: HTMLElement | null = null;
    private trackEl: HTMLElement | null = null;
    private stopEditorEl: HTMLElement | null = null;
    private stopSwatchBtn: HTMLElement | null = null;
    private stopPositionInput: HTMLInputElement | null = null;
    private typeSelect: HTMLSelectElement | null = null;
    private angleContainer: HTMLElement | null = null;
    private radialContainer: HTMLElement | null = null;
    private radialXInput: HTMLInputElement | null = null;
    private radialYInput: HTMLInputElement | null = null;
    private radialRInput: HTMLInputElement | null = null;
    private colorPickerContainer: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;
    private presetsContainer: HTMLElement | null = null;

    // Composed component instances
    private colorPickerInstance: unknown = null;
    private anglePickerInstance: unknown = null;
    private angleFallbackInput: HTMLInputElement | null = null;

    // Bound event handlers for cleanup
    private boundOutsideClick: ((e: MouseEvent) => void) | null = null;
    private boundEscapeKey: ((e: KeyboardEvent) => void) | null = null;
    private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

    // Drag state
    private isDragging = false;
    private dragMoved = false;
    private dragPointerId: number | null = null;

    constructor(containerId: string, options?: GradientPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `gradientpicker-${instanceCounter}`;
        this.options = options ?? {};
        this.isDisabled = this.options.disabled ?? false;
        this.minStops = this.options.minStops ?? 2;
        this.maxStops = this.options.maxStops ?? 8;
        this.gradientValue = buildDefaultValue(this.options.value);

        this.rootEl = this.buildRoot();
        this.mountToContainer(containerId);
        this.updateAllUI();

        console.log(LOG_PREFIX, "Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Get the current gradient value (deep copy). */
    getValue(): GradientValue
    {
        return this.cloneValue();
    }

    /** Set the gradient programmatically. */
    setValue(value: Partial<GradientValue>): void
    {
        this.gradientValue = buildDefaultValue(value);
        this.selectedStopIndex = 0;
        this.updateAllUI();
        this.emitChange();
    }

    /** Get stops only (deep copy). */
    getStops(): GradientStop[]
    {
        return cloneStops(this.gradientValue.stops);
    }

    /** Set stops only (preserves type, angle, etc.). */
    setStops(stops: GradientStop[]): void
    {
        if (stops.length < this.minStops)
        {
            console.warn(LOG_PREFIX, "Too few stops, minimum is", this.minStops);
            return;
        }

        this.gradientValue.stops = cloneStops(stops);
        this.selectedStopIndex = clamp(this.selectedStopIndex, 0, stops.length - 1);
        this.updateAllUI();
        this.emitChange();
    }

    /** Get the angle (linear mode). */
    getAngle(): number
    {
        return this.gradientValue.angle;
    }

    /** Set the angle (linear mode). */
    setAngle(angle: number): void
    {
        this.gradientValue.angle = ((angle % 360) + 360) % 360;
        this.updateAllUI();
        this.emitChange();
    }

    /** Get the gradient type. */
    getType(): "linear" | "radial"
    {
        return this.gradientValue.type;
    }

    /** Set the gradient type. */
    setType(type: "linear" | "radial"): void
    {
        this.gradientValue.type = type;
        this.updateAllUI();
        this.emitChange();
    }

    /** Reverse all stop positions (1 - position). */
    reverse(): void
    {
        for (const stop of this.gradientValue.stops)
        {
            stop.position = Math.round((1 - stop.position) * 100) / 100;
        }
        this.gradientValue.stops.sort((a, b) => a.position - b.position);
        this.updateAllUI();
        this.emitChange();
    }

    /** Clear gradient (reset to default two-stop). */
    clear(): void
    {
        this.gradientValue = buildDefaultValue();
        this.selectedStopIndex = 0;
        this.updateAllUI();
        this.options.onClear?.();
        this.emitChange();
    }

    /** Convert current value to DiagramEngine GradientDefinition. */
    toGradientDefinition(): GradientDefinition
    {
        return convertToDefinition(this.gradientValue);
    }

    /** Load from a DiagramEngine GradientDefinition. */
    fromGradientDefinition(def: GradientDefinition): void
    {
        this.gradientValue = convertFromDefinition(def);
        this.selectedStopIndex = 0;
        this.updateAllUI();
        this.emitChange();
    }

    /** Open popup (popup mode only). */
    open(): void
    {
        if (this.isInlineMode() || this.isDisabled || this.isOpen)
        {
            return;
        }
        this.isOpen = true;
        this.showPanel();
        this.addGlobalListeners();
        this.updateTriggerAria();
        this.options.onOpen?.();
    }

    /** Close popup (popup mode only). */
    close(): void
    {
        if (this.isInlineMode() || !this.isOpen)
        {
            return;
        }
        this.isOpen = false;
        this.hidePanel();
        this.removeGlobalListeners();
        this.updateTriggerAria();
        this.hideColorPicker();
        this.options.onClose?.();
    }

    /** Enable the component. */
    enable(): void
    {
        this.isDisabled = false;
        this.rootEl?.classList.remove("gradientpicker-disabled");
    }

    /** Disable the component. Closes popup if open. */
    disable(): void
    {
        this.isDisabled = true;
        this.close();
        this.rootEl?.classList.add("gradientpicker-disabled");
    }

    /** Get root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Tear down and clean up all resources. */
    destroy(): void
    {
        this.close();
        this.removeGlobalListeners();
        this.destroyComposedComponents();
        this.removeRootFromDOM();
        this.rootEl = null;
        console.log(LOG_PREFIX, "Destroyed", this.instanceId);
    }

    // ========================================================================
    // INITIALISATION
    // ========================================================================

    /** Mount the root element into the specified container. */
    private mountToContainer(containerId: string): void
    {
        if (!containerId)
        {
            console.warn(LOG_PREFIX, "No container ID provided");
            return;
        }

        const container = document.getElementById(containerId);
        if (!container)
        {
            console.warn(LOG_PREFIX, "Container not found:", containerId);
            return;
        }

        if (this.rootEl)
        {
            container.appendChild(this.rootEl);
        }
    }

    /** Whether inline mode is active. */
    private isInlineMode(): boolean
    {
        return this.options.mode === "inline";
    }

    /** Deep clone the current gradient value. */
    private cloneValue(): GradientValue
    {
        return {
            type: this.gradientValue.type,
            stops: cloneStops(this.gradientValue.stops),
            angle: this.gradientValue.angle,
            center: { ...this.gradientValue.center },
            radius: this.gradientValue.radius
        };
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const sizeClass = this.getSizeClass();
        const root = createElement("div", `gradientpicker ${sizeClass}`.trim());
        root.id = this.instanceId;

        this.appendLabel(root);
        this.appendModeContent(root);
        this.appendLiveRegion(root);

        if (this.isDisabled)
        {
            root.classList.add("gradientpicker-disabled");
        }

        return root;
    }

    /** Append an optional label element to the root. */
    private appendLabel(root: HTMLElement): void
    {
        if (!this.options.label) { return; }
        const labelEl = createElement("label", "gradientpicker-label");
        labelEl.textContent = this.options.label;
        setAttr(labelEl, { "for": this.instanceId });
        root.appendChild(labelEl);
    }

    /** Append panel (inline) or trigger + panel (popup) to the root. */
    private appendModeContent(root: HTMLElement): void
    {
        if (this.isInlineMode())
        {
            this.panelEl = this.buildPanel();
            root.appendChild(this.panelEl);
        }
        else
        {
            this.triggerEl = this.buildTrigger();
            root.appendChild(this.triggerEl);
            this.panelEl = this.buildPanel();
            this.panelEl.style.display = "none";
            root.appendChild(this.panelEl);
        }
    }

    /** Append the ARIA live region for screen reader announcements. */
    private appendLiveRegion(root: HTMLElement): void
    {
        this.liveRegion = createElement("div", "gradientpicker-sr-only");
        setAttr(this.liveRegion, {
            "aria-live": "polite",
            "aria-atomic": "true"
        });
        root.appendChild(this.liveRegion);
    }

    /** Get CSS class for size variant. */
    private getSizeClass(): string
    {
        const size = this.options.size ?? "default";
        if (size === "default") { return ""; }
        return `gradientpicker-${size}`;
    }

    /** Build the popup trigger button. */
    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("button", "gradientpicker-trigger");
        setAttr(trigger, {
            type: "button",
            "aria-haspopup": "dialog",
            "aria-expanded": "false",
            "aria-label": "Open gradient picker"
        });

        this.triggerSwatch = createElement("span", "gradientpicker-trigger-swatch");
        const chevron = createElement("i", "bi bi-chevron-down gradientpicker-chevron");

        trigger.appendChild(this.triggerSwatch);
        trigger.appendChild(chevron);
        trigger.addEventListener("click", () => this.handleTriggerClick());

        return trigger;
    }

    /** Build the picker panel (shared by popup and inline modes). */
    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", "gradientpicker-panel");
        if (!this.isInlineMode())
        {
            panel.style.position = "absolute";
            panel.style.zIndex = String(POPUP_Z_INDEX);
        }

        panel.appendChild(this.buildHeader());
        panel.appendChild(this.buildPreviewBar());
        panel.appendChild(this.buildTrack());
        panel.appendChild(this.buildStopEditor());
        panel.appendChild(this.buildControls());
        panel.appendChild(this.buildPresetsRow());
        panel.appendChild(this.buildColorPickerContainer());

        return panel;
    }

    // ========================================================================
    // HEADER (TYPE TOGGLE + ACTIONS)
    // ========================================================================

    /** Build the header row: type toggle, reverse, clear. */
    private buildHeader(): HTMLElement
    {
        const header = createElement("div", "gradientpicker-header");

        if (this.options.showTypeToggle !== false)
        {
            header.appendChild(this.buildTypeSelect());
        }

        const spacer = createElement("div", "gradientpicker-header-spacer");
        header.appendChild(spacer);

        header.appendChild(this.buildAddStopButton());

        if (this.options.showReverse !== false)
        {
            header.appendChild(this.buildReverseButton());
        }
        if (this.options.showClear !== false)
        {
            header.appendChild(this.buildClearButton());
        }

        return header;
    }

    /** Build the gradient type select dropdown. */
    private buildTypeSelect(): HTMLElement
    {
        this.typeSelect = document.createElement("select");
        this.typeSelect.className = "gradientpicker-type form-select form-select-sm";
        setAttr(this.typeSelect, { "aria-label": "Gradient type" });

        const linearOpt = document.createElement("option");
        linearOpt.value = "linear";
        linearOpt.textContent = "Linear";
        this.typeSelect.appendChild(linearOpt);

        const radialOpt = document.createElement("option");
        radialOpt.value = "radial";
        radialOpt.textContent = "Radial";
        this.typeSelect.appendChild(radialOpt);

        this.typeSelect.value = this.gradientValue.type;
        this.typeSelect.addEventListener("change", () => this.handleTypeChange());

        return this.typeSelect;
    }

    /** Build the reverse button. */
    /** Build the add stop button. */
    private buildAddStopButton(): HTMLElement
    {
        const btn = createElement("button", "gradientpicker-add btn btn-sm");
        setAttr(btn, { type: "button", title: "Add colour stop" });
        const icon = createElement("i", "bi bi-plus-lg");
        btn.appendChild(icon);
        btn.addEventListener("click", () => this.addStopAtMidpoint());
        return btn;
    }

    /** Add a stop at the midpoint of the largest gap. */
    private addStopAtMidpoint(): void
    {
        const stops = this.gradientValue.stops;
        if (stops.length >= this.maxStops) { return; }

        let maxGap = 0;
        let gapMid = 0.5;

        for (let i = 0; i < stops.length - 1; i++)
        {
            const gap = stops[i + 1].position - stops[i].position;
            if (gap > maxGap)
            {
                maxGap = gap;
                gapMid = (stops[i].position + stops[i + 1].position) / 2;
            }
        }

        const interp = this.interpolateAtPosition(gapMid);
        const newStop: GradientStop = { position: gapMid, color: interp.color, alpha: interp.alpha };

        stops.push(newStop);
        this.sortStopsAndUpdateIndex();
        this.selectedStopIndex = stops.indexOf(newStop);
        this.updateAllUI();
        this.showColorPickerForStop();
        this.emitChange();
    }

    /** Build the reverse button. */
    private buildReverseButton(): HTMLElement
    {
        const btn = createElement("button", "gradientpicker-reverse btn btn-sm");
        setAttr(btn, { type: "button", title: "Reverse gradient" });
        const icon = createElement("i", "bi bi-arrow-left-right");
        btn.appendChild(icon);
        btn.addEventListener("click", () => this.reverse());
        return btn;
    }

    /** Build the clear button. */
    private buildClearButton(): HTMLElement
    {
        const btn = createElement("button", "gradientpicker-clear btn btn-sm");
        setAttr(btn, { type: "button", title: "Clear gradient" });
        const icon = createElement("i", "bi bi-x-lg");
        btn.appendChild(icon);
        btn.addEventListener("click", () => this.clear());
        return btn;
    }

    // ========================================================================
    // PREVIEW BAR
    // ========================================================================

    /** Build the gradient preview bar with checkerboard background. */
    private buildPreviewBar(): HTMLElement
    {
        const preview = createElement("div", "gradientpicker-preview");
        const checker = createElement("div", "gradientpicker-preview-checker");
        this.previewGradient = createElement("div", "gradientpicker-preview-gradient");

        preview.appendChild(checker);
        preview.appendChild(this.previewGradient);

        return preview;
    }

    // ========================================================================
    // STOP HANDLES TRACK
    // ========================================================================

    /** Build the stop handles track below the preview bar. */
    private buildTrack(): HTMLElement
    {
        this.trackEl = createElement("div", "gradientpicker-track");
        setAttr(this.trackEl, {
            role: "listbox",
            "aria-label": "Gradient stops",
            tabindex: "0"
        });

        this.trackEl.addEventListener("click", (e) => this.handleTrackClick(e));
        this.trackEl.addEventListener("keydown", (e) => this.handleTrackKeyDown(e));

        this.renderHandles();
        return this.trackEl;
    }

    /** Render all stop handles into the track. */
    private renderHandles(): void
    {
        if (!this.trackEl) { return; }

        // Remove existing handles
        const existing = this.trackEl.querySelectorAll(".gradientpicker-handle");
        existing.forEach((el) => el.remove());

        for (let i = 0; i < this.gradientValue.stops.length; i++)
        {
            this.trackEl.appendChild(this.buildHandle(i));
        }
    }

    /** Update handle positions and colours without destroying DOM elements. */
    private updateHandlePositions(): void
    {
        if (!this.trackEl) { return; }

        const handles = this.trackEl.querySelectorAll(".gradientpicker-handle");

        handles.forEach((el, i) =>
        {
            const stop = this.gradientValue.stops[i];
            if (!stop) { return; }

            (el as HTMLElement).style.left = `${stop.position * 100}%`;
            (el as HTMLElement).style.backgroundColor = stop.color;
        });
    }

    /** Update selected state on existing handles without rebuilding. */
    private updateHandleSelection(): void
    {
        if (!this.trackEl) { return; }

        const handles = this.trackEl.querySelectorAll(".gradientpicker-handle");

        handles.forEach((el, i) =>
        {
            const isSelected = (i === this.selectedStopIndex);

            el.classList.toggle("gradientpicker-handle-selected", isSelected);
            el.setAttribute("aria-selected", isSelected ? "true" : "false");
            (el as HTMLElement).tabIndex = isSelected ? 0 : -1;
        });
    }

    /** Build a single stop handle element. */
    private buildHandle(index: number): HTMLElement
    {
        const stop = this.gradientValue.stops[index];
        const handle = createElement("div", "gradientpicker-handle");
        const isSelected = (index === this.selectedStopIndex);

        if (isSelected)
        {
            handle.classList.add("gradientpicker-handle-selected");
        }

        setAttr(handle, {
            role: "option",
            "aria-selected": isSelected ? "true" : "false",
            "aria-label": `Stop ${index + 1} at ${Math.round(stop.position * 100)}%`,
            "data-index": String(index),
            tabindex: isSelected ? "0" : "-1"
        });

        handle.style.left = `${stop.position * 100}%`;
        handle.style.backgroundColor = stop.color;

        this.addHandleListeners(handle, index);
        return handle;
    }

    /** Add pointer and context menu listeners to a stop handle. */
    private addHandleListeners(handle: HTMLElement, index: number): void
    {
        handle.addEventListener("pointerdown", (e) =>
        {
            e.stopPropagation();
            this.startHandleDrag(e, index);
        });

        handle.addEventListener("contextmenu", (e) =>
        {
            e.preventDefault();
            e.stopPropagation();
            this.removeStop(index);
        });

        handle.addEventListener("dblclick", (e) =>
        {
            e.stopPropagation();
            this.selectedStopIndex = index;
            this.updateAllUI();
            this.showColorPickerForStop();
        });
    }

    // ========================================================================
    // HANDLE DRAG
    // ========================================================================

    /** Begin dragging a stop handle. */
    private startHandleDrag(e: PointerEvent, index: number): void
    {
        if (this.isDisabled) { return; }
        e.preventDefault();

        this.selectedStopIndex = index;
        this.isDragging = true;
        this.dragPointerId = e.pointerId;
        this.dragMoved = false;

        const handle = e.currentTarget as HTMLElement;
        handle.setPointerCapture(e.pointerId);

        const onMove = (ev: PointerEvent) => this.handleDragMove(ev);
        const onUp = (ev: PointerEvent) =>
        {
            this.handleDragEnd(ev, handle, onMove, onUp);
        };

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);

        // Mark selected visually without full rebuild (which destroys handles)
        this.updateHandleSelection();
        this.updateStopEditor();
    }

    /** Handle pointer movement during stop drag. */
    private handleDragMove(e: PointerEvent): void
    {
        if (!this.trackEl) { return; }
        this.dragMoved = true;
        const rect = this.trackEl.getBoundingClientRect();
        const rawPos = (e.clientX - rect.left) / rect.width;
        const clamped = this.clampStopPosition(rawPos, this.selectedStopIndex);

        this.gradientValue.stops[this.selectedStopIndex].position = clamped;

        // Lightweight update — move handle + refresh preview without destroying DOM
        this.updateHandlePositions();
        this.updatePreviewBar();
        this.updateStopEditor();
        this.emitInput();
    }

    /** Finalise drag and re-sort stops. */
    private handleDragEnd(
        _e: PointerEvent,
        handle: HTMLElement,
        onMove: (ev: PointerEvent) => void,
        onUp: (ev: PointerEvent) => void
    ): void
    {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        const wasClick = !this.dragMoved;
        this.isDragging = false;
        this.dragPointerId = null;
        this.dragMoved = false;
        this.sortStopsAndUpdateIndex();
        this.updateAllUI();

        if (wasClick)
        {
            this.showColorPickerForStop();
        }
        else
        {
            this.emitChange();
        }
    }

    /**
     * Clamp a stop position so it cannot overlap adjacent stops.
     * Enforces MIN_STOP_GAP between neighbouring stops.
     */
    private clampStopPosition(rawPos: number, index: number): number
    {
        const stops = this.gradientValue.stops;
        let minPos = 0;
        let maxPos = 1;

        // Find adjacent stops by scanning sorted order excluding current
        const sorted = stops
            .map((s, i) => ({ pos: s.position, idx: i }))
            .filter((s) => s.idx !== index)
            .sort((a, b) => a.pos - b.pos);

        for (const s of sorted)
        {
            if (s.pos < rawPos && (s.pos + MIN_STOP_GAP) > minPos)
            {
                minPos = s.pos + MIN_STOP_GAP;
            }
            if (s.pos > rawPos && (s.pos - MIN_STOP_GAP) < maxPos)
            {
                maxPos = s.pos - MIN_STOP_GAP;
            }
        }

        return clamp(rawPos, minPos, maxPos);
    }

    /** Sort stops by position and update the selected index to track the same stop. */
    private sortStopsAndUpdateIndex(): void
    {
        const selectedStop = this.gradientValue.stops[this.selectedStopIndex];
        this.gradientValue.stops.sort((a, b) => a.position - b.position);

        const newIndex = this.gradientValue.stops.indexOf(selectedStop);
        this.selectedStopIndex = newIndex >= 0 ? newIndex : 0;
    }

    // ========================================================================
    // TRACK INTERACTIONS
    // ========================================================================

    /** Handle click on the track background to add a new stop. */
    private handleTrackClick(e: MouseEvent): void
    {
        if (this.isDisabled) { return; }

        // Ignore clicks on handles (they handle their own events)
        const target = e.target as HTMLElement;
        if (target.classList.contains("gradientpicker-handle"))
        {
            return;
        }

        this.addStopAtPosition(e);
    }

    /** Add a new stop at the clicked position with interpolated colour. */
    private addStopAtPosition(e: MouseEvent): void
    {
        if (this.gradientValue.stops.length >= this.maxStops)
        {
            console.warn(LOG_PREFIX, "Maximum stops reached:", this.maxStops);
            return;
        }

        if (!this.trackEl) { return; }

        const rect = this.trackEl.getBoundingClientRect();
        const position = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        const interpolated = this.interpolateAtPosition(position);
        const newStop: GradientStop = {
            position: Math.round(position * 100) / 100,
            color: interpolated.color,
            alpha: interpolated.alpha
        };

        this.gradientValue.stops.push(newStop);
        this.gradientValue.stops.sort((a, b) => a.position - b.position);
        this.selectedStopIndex = this.gradientValue.stops.indexOf(newStop);

        this.updateAllUI();
        this.emitChange();
    }

    /** Interpolate colour at a normalised position across all stops. */
    private interpolateAtPosition(pos: number): { color: string; alpha: number }
    {
        const sorted = [...this.gradientValue.stops].sort(
            (a, b) => a.position - b.position
        );
        if (sorted.length === 0)
        {
            return { color: "#808080", alpha: 1 };
        }
        if (pos <= sorted[0].position)
        {
            return { color: sorted[0].color, alpha: sorted[0].alpha };
        }
        if (pos >= sorted[sorted.length - 1].position)
        {
            const last = sorted[sorted.length - 1];
            return { color: last.color, alpha: last.alpha };
        }

        return this.findAndInterpolate(sorted, pos);
    }

    /** Find the bracketing stops and interpolate the colour. */
    private findAndInterpolate(
        sorted: GradientStop[], pos: number
    ): { color: string; alpha: number }
    {
        for (let i = 0; i < sorted.length - 1; i++)
        {
            if (pos >= sorted[i].position && pos <= sorted[i + 1].position)
            {
                return interpolateColor(sorted[i], sorted[i + 1], pos);
            }
        }
        return { color: "#808080", alpha: 1 };
    }

    /** Remove a stop by index if above minimum count. */
    private removeStop(index: number): void
    {
        if (this.gradientValue.stops.length <= this.minStops)
        {
            console.warn(LOG_PREFIX, "Cannot remove stop, minimum reached:", this.minStops);
            return;
        }

        this.gradientValue.stops.splice(index, 1);
        this.selectedStopIndex = clamp(
            this.selectedStopIndex, 0, this.gradientValue.stops.length - 1
        );

        this.updateAllUI();
        this.emitChange();
    }

    // ========================================================================
    // STOP EDITOR
    // ========================================================================

    /** Build the selected stop editor (colour swatch + position input). */
    private buildStopEditor(): HTMLElement
    {
        this.stopEditorEl = createElement("div", "gradientpicker-stop-editor");

        this.stopSwatchBtn = this.buildStopSwatchButton();
        const posLabel = this.buildPositionLabel();

        this.stopEditorEl.appendChild(this.stopSwatchBtn);
        this.stopEditorEl.appendChild(posLabel);

        return this.stopEditorEl;
    }

    /** Build the colour swatch button for the stop editor. */
    private buildStopSwatchButton(): HTMLElement
    {
        const btn = createElement("button", "gradientpicker-stop-swatch");
        setAttr(btn, {
            type: "button",
            title: "Edit colour",
            "aria-label": "Edit stop colour"
        });
        btn.addEventListener("click", () => this.showColorPickerForStop());
        return btn;
    }

    /** Build the position label with numeric input and % suffix. */
    private buildPositionLabel(): HTMLElement
    {
        const wrapper = createElement("div", "gradientpicker-stop-pos-group");
        const posLabel = createElement("label", "gradientpicker-stop-label");
        posLabel.textContent = "Position ";

        this.stopPositionInput = this.buildPositionInput();
        const suffix = createElement("span", "gradientpicker-stop-suffix");
        suffix.textContent = "%";

        posLabel.appendChild(this.stopPositionInput);
        posLabel.appendChild(suffix);
        wrapper.appendChild(posLabel);

        const hint = createElement("div", "gradientpicker-hint");
        hint.textContent = "Where this colour sits along the gradient (0% = start, 100% = end).";
        wrapper.appendChild(hint);

        return wrapper;
    }

    /** Build the numeric position input element. */
    private buildPositionInput(): HTMLInputElement
    {
        const input = document.createElement("input");
        input.className =
            "gradientpicker-stop-position form-control form-control-sm";
        setAttr(input, {
            type: "number",
            min: "0",
            max: "100",
            step: "1",
            "aria-label": "Stop position percentage"
        });

        input.addEventListener("change", () => this.handlePositionInputChange());
        input.addEventListener("keydown", (e) => this.handlePositionInputKey(e));
        return input;
    }

    /** Handle position input change event. */
    private handlePositionInputChange(): void
    {
        if (!this.stopPositionInput) { return; }

        const raw = parseInt(this.stopPositionInput.value, 10);
        if (isNaN(raw)) { return; }

        const normalised = clamp(raw / 100, 0, 1);
        const clamped = this.clampStopPosition(normalised, this.selectedStopIndex);
        this.gradientValue.stops[this.selectedStopIndex].position = clamped;

        this.sortStopsAndUpdateIndex();
        this.updateAllUI();
        this.emitChange();
    }

    /** Handle arrow keys in the position input for fine adjustment. */
    private handlePositionInputKey(e: KeyboardEvent): void
    {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown")
        {
            return;
        }

        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const direction = e.key === "ArrowUp" ? 1 : -1;
        const current = this.gradientValue.stops[this.selectedStopIndex].position;
        const raw = current + (step * direction) / 100;
        const clamped = this.clampStopPosition(raw, this.selectedStopIndex);

        this.gradientValue.stops[this.selectedStopIndex].position = clamped;
        this.sortStopsAndUpdateIndex();
        this.updateAllUI();
        this.emitChange();
    }

    // ========================================================================
    // COLORPICKER COMPOSITION
    // ========================================================================

    /** Build the container for the embedded ColorPicker. */
    private buildColorPickerContainer(): HTMLElement
    {
        this.colorPickerContainer = createElement("div", "gradientpicker-colorpicker");
        this.colorPickerContainer.id = `${this.instanceId}-cp`;
        this.colorPickerContainer.style.display = "none";
        return this.colorPickerContainer;
    }

    /** Show the ColorPicker for editing the selected stop's colour. */
    private showColorPickerForStop(): void
    {
        if (!this.colorPickerContainer) { return; }

        const stop = this.gradientValue.stops[this.selectedStopIndex];
        if (!stop) { return; }

        this.colorPickerContainer.style.display = "block";
        this.initOrUpdateColorPicker(stop);
    }

    /** Initialise the ColorPicker or update its value. */
    private initOrUpdateColorPicker(stop: GradientStop): void
    {
        const factory = this.lookupColorPickerFactory();

        if (factory && !this.colorPickerInstance)
        {
            this.createComposedColorPicker(factory, stop);
        }
        else if (factory && this.colorPickerInstance)
        {
            this.updateComposedColorPicker(stop);
        }
        else
        {
            this.createFallbackColorInput(stop);
        }
    }

    /** Look up the ColorPicker factory from the global window scope. */
    private lookupColorPickerFactory(): ((
        containerId: string,
        options?: Record<string, unknown>
    ) => unknown) | null
    {
        const win = window as unknown as Record<string, unknown>;
        const factory = win["createColorPicker"];
        if (typeof factory === "function")
        {
            return factory as (
                containerId: string,
                options?: Record<string, unknown>
            ) => unknown;
        }
        return null;
    }

    /** Create the composed ColorPicker instance. */
    private createComposedColorPicker(
        factory: (id: string, opts?: Record<string, unknown>) => unknown,
        stop: GradientStop
    ): void
    {
        if (!this.colorPickerContainer) { return; }

        // Clear container before creating
        this.colorPickerContainer.textContent = "";

        this.colorPickerInstance = factory(this.colorPickerContainer.id, {
            inline: true,
            showOpacity: true,
            showFormatTabs: false,
            size: "sm",
            value: stop.color,
            onInput: (color: string, alpha?: number) =>
            {
                this.updateStopColor(color, alpha);
                this.emitInput();
            },
            onChange: (color: string, alpha?: number) =>
            {
                this.updateStopColor(color, alpha);
                this.emitChange();
            }
        });
    }

    /** Update the existing ColorPicker with a new stop's colour. */
    private updateComposedColorPicker(stop: GradientStop): void
    {
        const picker = this.colorPickerInstance as Record<string, unknown>;
        if (typeof picker["setValue"] === "function")
        {
            (picker["setValue"] as (c: string) => void)(stop.color);
        }
        if (typeof picker["setAlpha"] === "function")
        {
            (picker["setAlpha"] as (a: number) => void)(stop.alpha);
        }
    }

    /** Create a fallback colour input when ColorPicker is not available. */
    private createFallbackColorInput(stop: GradientStop): void
    {
        if (!this.colorPickerContainer) { return; }
        this.colorPickerContainer.textContent = "";

        const wrapper = createElement("div", "gradientpicker-color-fallback");

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.value = stop.color;
        setAttr(colorInput, { "aria-label": "Stop colour" });
        colorInput.addEventListener("input", () =>
        {
            this.updateStopColor(colorInput.value, undefined);
            this.emitInput();
        });
        colorInput.addEventListener("change", () =>
        {
            this.updateStopColor(colorInput.value, undefined);
            this.emitChange();
        });

        wrapper.appendChild(this.buildFallbackAlphaSlider(stop));
        wrapper.appendChild(colorInput);
        this.colorPickerContainer.appendChild(wrapper);
    }

    /** Build a fallback alpha slider for when ColorPicker is not loaded. */
    private buildFallbackAlphaSlider(stop: GradientStop): HTMLElement
    {
        const label = createElement("label", "gradientpicker-alpha-label");
        label.textContent = "Alpha: ";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "100";
        slider.value = String(Math.round(stop.alpha * 100));
        setAttr(slider, { "aria-label": "Stop alpha" });

        slider.addEventListener("input", () =>
        {
            const alpha = parseInt(slider.value, 10) / 100;
            this.updateStopColor(undefined, alpha);
            this.emitInput();
        });

        label.appendChild(slider);
        return label;
    }

    /** Update the selected stop's colour and/or alpha. */
    private updateStopColor(color?: string, alpha?: number): void
    {
        const stop = this.gradientValue.stops[this.selectedStopIndex];
        if (!stop) { return; }

        if (color !== undefined)
        {
            stop.color = color;
        }
        if (alpha !== undefined)
        {
            stop.alpha = clamp(alpha, 0, 1);
        }

        this.updateAllUI();
    }

    /** Hide the ColorPicker panel. */
    private hideColorPicker(): void
    {
        if (this.colorPickerContainer)
        {
            this.colorPickerContainer.style.display = "none";
        }
    }

    // ========================================================================
    // GRADIENT TYPE CONTROLS
    // ========================================================================

    /** Handle gradient type change from the select dropdown. */
    private handleTypeChange(): void
    {
        if (!this.typeSelect) { return; }
        const newType = this.typeSelect.value as "linear" | "radial";
        this.gradientValue.type = newType;
        this.updateControlsVisibility();
        this.updateAllUI();
        this.emitChange();
    }

    /** Build the controls section (angle + radial). */
    private buildControls(): HTMLElement
    {
        const controls = createElement("div", "gradientpicker-controls");

        this.angleContainer = this.buildAngleControl();
        controls.appendChild(this.angleContainer);

        this.radialContainer = this.buildRadialControls();
        controls.appendChild(this.radialContainer);

        this.updateControlsVisibility();
        return controls;
    }

    /** Update visibility of angle vs radial controls based on gradient type. */
    private updateControlsVisibility(): void
    {
        if (this.angleContainer)
        {
            const showAngle = (
                this.gradientValue.type === "linear"
                && this.options.showAngle !== false
            );
            this.angleContainer.style.display = showAngle ? "" : "none";
        }

        if (this.radialContainer)
        {
            const showRadial = (
                this.gradientValue.type === "radial"
                && this.options.showRadialControls !== false
            );
            this.radialContainer.style.display = showRadial ? "" : "none";
        }

        if (this.typeSelect)
        {
            this.typeSelect.value = this.gradientValue.type;
        }
    }

    // ========================================================================
    // ANGLE CONTROL (LINEAR)
    // ========================================================================

    /** Build the angle control — composes AnglePicker or falls back to numeric. */
    private buildAngleControl(): HTMLElement
    {
        const container = createElement("div", "gradientpicker-angle");
        container.id = `${this.instanceId}-angle`;

        // Defer AnglePicker init until after mount
        requestAnimationFrame(() => this.initAnglePicker(container));
        return container;
    }

    /** Initialise the AnglePicker or create a fallback numeric input. */
    private initAnglePicker(container: HTMLElement): void
    {
        const factory = this.lookupAnglePickerFactory();
        if (factory)
        {
            this.createComposedAnglePicker(factory, container);
        }
        else
        {
            this.createAngleFallbackInput(container);
        }
    }

    /** Look up the AnglePicker factory from the global window scope. */
    private lookupAnglePickerFactory(): ((
        containerId: string,
        options?: Record<string, unknown>
    ) => unknown) | null
    {
        const win = window as unknown as Record<string, unknown>;
        const factory = win["createAnglePicker"];
        if (typeof factory === "function")
        {
            return factory as (
                containerId: string,
                options?: Record<string, unknown>
            ) => unknown;
        }
        return null;
    }

    /** Create the composed AnglePicker instance. */
    private createComposedAnglePicker(
        factory: (id: string, opts?: Record<string, unknown>) => unknown,
        container: HTMLElement
    ): void
    {
        this.anglePickerInstance = factory(container.id, {
            mode: "dropdown",
            size: "sm",
            showTicks: true,
            showInput: true,
            value: this.gradientValue.angle,
            onChange: (angle: number) =>
            {
                this.gradientValue.angle = angle;
                this.updateAllUI();
                this.emitChange();
            }
        });
    }

    /** Create a fallback numeric input for angle when AnglePicker is unavailable. */
    private createAngleFallbackInput(container: HTMLElement): void
    {
        const label = createElement("label", "gradientpicker-angle-label");
        label.textContent = "Angle: ";

        this.angleFallbackInput = document.createElement("input");
        this.angleFallbackInput.className = "form-control form-control-sm";
        setAttr(this.angleFallbackInput, {
            type: "number",
            min: "0",
            max: "359",
            step: "1",
            "aria-label": "Gradient angle in degrees"
        });
        this.angleFallbackInput.value = String(this.gradientValue.angle);

        this.angleFallbackInput.addEventListener("change", () =>
            this.handleAngleFallbackChange()
        );

        const suffix = createElement("span", "gradientpicker-angle-suffix");
        suffix.textContent = "\u00B0";

        label.appendChild(this.angleFallbackInput);
        label.appendChild(suffix);
        container.appendChild(label);

        const hint = createElement("div", "gradientpicker-hint");
        hint.textContent = "0\u00B0 = left\u2192right, 90\u00B0 = top\u2192bottom, 180\u00B0 = right\u2192left, 270\u00B0 = bottom\u2192top.";
        container.appendChild(hint);
    }

    /** Handle angle fallback input change. */
    private handleAngleFallbackChange(): void
    {
        if (!this.angleFallbackInput) { return; }
        const raw = parseInt(this.angleFallbackInput.value, 10);
        if (isNaN(raw)) { return; }

        this.gradientValue.angle = ((raw % 360) + 360) % 360;
        this.updateAllUI();
        this.emitChange();
    }

    // ========================================================================
    // RADIAL CONTROLS
    // ========================================================================

    /** Build the radial gradient controls (origin + spread, percentage-based). */
    private buildRadialControls(): HTMLElement
    {
        const container = createElement("div", "gradientpicker-radial");

        const desc = createElement("div", "gradientpicker-hint");
        desc.textContent = "Origin: where the gradient radiates from. Spread: how far it extends.";
        container.appendChild(desc);

        const row = createElement("div", "gradientpicker-radial-row");
        row.appendChild(this.buildRadialInput("Origin X", "center-x", this.gradientValue.center.x));
        row.appendChild(this.buildRadialInput("Origin Y", "center-y", this.gradientValue.center.y));
        row.appendChild(this.buildRadialInput("Spread", "radius", this.gradientValue.radius));
        container.appendChild(row);

        return container;
    }

    /** Build a single radial control input with %-based range (0–100). */
    private buildRadialInput(
        labelText: string, field: string, value: number
    ): HTMLElement
    {
        const wrapper = createElement("label", "gradientpicker-radial-label");
        const text = createElement("span", "gradientpicker-radial-text");
        text.textContent = labelText;
        wrapper.appendChild(text);

        const input = this.createRadialInputElement(field, value);
        input.addEventListener("change", () =>
            this.handleRadialInputChange(input, field)
        );
        this.storeRadialInputRef(input, field);

        wrapper.appendChild(input);
        const suffix = createElement("span", "gradientpicker-radial-suffix");
        suffix.textContent = "%";
        wrapper.appendChild(suffix);
        return wrapper;
    }

    /** Create a percentage-based input element for a radial control. */
    private createRadialInputElement(
        field: string, value: number
    ): HTMLInputElement
    {
        const input = document.createElement("input");
        input.className = "form-control form-control-sm gradientpicker-radial-input";
        const minVal = field === "radius" ? "1" : "0";
        setAttr(input, {
            type: "number",
            min: minVal,
            max: "100",
            step: "1",
            "aria-label": `Radial gradient ${field}`,
            "data-field": field
        });
        input.value = String(Math.round(value * 100));
        return input;
    }

    /** Store a reference to the radial input for later UI updates. */
    private storeRadialInputRef(input: HTMLInputElement, field: string): void
    {
        if (field === "center-x") { this.radialXInput = input; }
        if (field === "center-y") { this.radialYInput = input; }
        if (field === "radius") { this.radialRInput = input; }
    }

    /** Handle change on a radial control input (percentage → 0-1). */
    private handleRadialInputChange(input: HTMLInputElement, field: string): void
    {
        const raw = parseInt(input.value, 10);
        if (isNaN(raw)) { return; }

        const minPct = field === "radius" ? 1 : 0;
        const pct = clamp(raw, minPct, 100);
        const val = pct / 100;

        if (field === "center-x") { this.gradientValue.center.x = val; }
        else if (field === "center-y") { this.gradientValue.center.y = val; }
        else if (field === "radius") { this.gradientValue.radius = val; }

        this.updateAllUI();
        this.emitChange();
    }

    // ========================================================================
    // PRESET SWATCHES
    // ========================================================================

    /** Build the preset swatches row. */
    private buildPresetsRow(): HTMLElement
    {
        this.presetsContainer = createElement("div", "gradientpicker-presets");
        setAttr(this.presetsContainer, {
            role: "listbox",
            "aria-label": "Preset gradients"
        });

        const presets = this.options.presets ?? DEFAULT_PRESETS;
        for (const preset of presets)
        {
            this.presetsContainer.appendChild(this.buildPresetSwatch(preset));
        }

        return this.presetsContainer;
    }

    /** Build a single preset swatch button. */
    private buildPresetSwatch(preset: GradientPreset): HTMLElement
    {
        const btn = createElement("button", "gradientpicker-preset");
        setAttr(btn, {
            type: "button",
            role: "option",
            title: preset.name,
            "aria-label": `Preset: ${preset.name}`
        });

        btn.style.background = buildGradientCSS(preset.value);

        btn.addEventListener("click", () => this.applyPreset(preset));
        return btn;
    }

    /** Apply a preset gradient, replacing all current values. */
    private applyPreset(preset: GradientPreset): void
    {
        this.gradientValue = buildDefaultValue(preset.value);
        this.selectedStopIndex = 0;
        this.updateAllUI();
        this.emitChange();
    }

    // ========================================================================
    // KEYBOARD NAVIGATION
    // ========================================================================

    /** Handle keydown on the stop track for keyboard navigation. */
    private handleTrackKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight")
        {
            this.handleArrowKey(e, e.key === "ArrowLeft" ? -1 : 1);
            return;
        }

        if (e.key === "Delete" || e.key === "Backspace")
        {
            e.preventDefault();
            this.removeStop(this.selectedStopIndex);
            return;
        }

        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.showColorPickerForStop();
            return;
        }

        if (e.key === "Escape")
        {
            e.preventDefault();
            this.handleEscapeKey();
        }
    }

    /** Handle arrow key — move selected stop or navigate between stops. */
    private handleArrowKey(e: KeyboardEvent, direction: number): void
    {
        e.preventDefault();

        if (e.ctrlKey || e.metaKey)
        {
            // Navigate between stops
            this.navigateStops(direction);
            return;
        }

        // Move the selected stop position
        const step = e.shiftKey ? 0.05 : 0.01;
        const current = this.gradientValue.stops[this.selectedStopIndex];
        if (!current) { return; }

        const raw = current.position + (step * direction);
        const clamped = this.clampStopPosition(raw, this.selectedStopIndex);
        current.position = Math.round(clamped * 100) / 100;

        this.sortStopsAndUpdateIndex();
        this.updateAllUI();
        this.emitChange();
    }

    /** Navigate to the next or previous stop handle. */
    private navigateStops(direction: number): void
    {
        const count = this.gradientValue.stops.length;
        this.selectedStopIndex = (
            (this.selectedStopIndex + direction + count) % count
        );
        this.updateAllUI();
        this.focusSelectedHandle();
    }

    /** Focus the currently selected stop handle element. */
    private focusSelectedHandle(): void
    {
        if (!this.trackEl) { return; }
        const handle = this.trackEl.querySelector(
            `.gradientpicker-handle[data-index="${this.selectedStopIndex}"]`
        ) as HTMLElement | null;
        handle?.focus();
    }

    /** Handle Escape key — close ColorPicker or popup. */
    private handleEscapeKey(): void
    {
        if (this.colorPickerContainer?.style.display !== "none")
        {
            this.hideColorPicker();
            return;
        }
        if (!this.isInlineMode())
        {
            this.close();
        }
    }

    // ========================================================================
    // POPUP MANAGEMENT
    // ========================================================================

    /** Handle trigger button click — toggle popup. */
    private handleTriggerClick(): void
    {
        if (this.isDisabled) { return; }
        if (this.isOpen)
        {
            this.close();
        }
        else
        {
            this.open();
        }
    }

    /** Show the panel element and position it (popup mode). */
    private showPanel(): void
    {
        if (!this.panelEl) { return; }
        this.panelEl.style.display = "block";
        this.positionPanel();
        this.updateAllUI();
    }

    /** Hide the panel element (popup mode). */
    private hidePanel(): void
    {
        if (!this.panelEl) { return; }
        this.panelEl.style.display = "none";
    }

    /** Position the panel relative to the trigger element. */
    private positionPanel(): void
    {
        if (!this.panelEl || !this.triggerEl) { return; }
        const triggerRect = this.triggerEl.getBoundingClientRect();
        const pos = this.options.popupPosition ?? "bottom-start";
        const coords = this.calculatePanelPosition(triggerRect, pos);

        this.applyViewportCorrection(coords.top, coords.left);
    }

    /** Calculate the initial panel position based on popup alignment. */
    private calculatePanelPosition(
        triggerRect: DOMRect,
        pos: string
    ): { top: number; left: number }
    {
        let top: number;
        let left: number;

        if (pos.startsWith("bottom"))
        {
            top = triggerRect.bottom + 4;
        }
        else
        {
            top = triggerRect.top - (this.panelEl?.offsetHeight ?? 0) - 4;
        }

        if (pos.endsWith("start"))
        {
            left = triggerRect.left;
        }
        else
        {
            left = triggerRect.right - (this.panelEl?.offsetWidth ?? 0);
        }

        return { top, left };
    }

    /** Apply viewport overflow correction to panel position. */
    private applyViewportCorrection(top: number, left: number): void
    {
        if (!this.panelEl) { return; }
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const pw = this.panelEl.offsetWidth;
        const ph = this.panelEl.offsetHeight;

        if (left < 4) { left = 4; }
        if ((left + pw) > (vw - 4)) { left = vw - pw - 4; }
        if ((top + ph) > (vh - 4)) { top = top - ph - 40; }
        if (top < 4) { top = 4; }

        this.panelEl.style.position = "fixed";
        this.panelEl.style.top = `${top}px`;
        this.panelEl.style.left = `${left}px`;
    }

    /** Update aria-expanded on the trigger element. */
    private updateTriggerAria(): void
    {
        if (this.triggerEl)
        {
            this.triggerEl.setAttribute(
                "aria-expanded", this.isOpen ? "true" : "false"
            );
        }
    }

    // ========================================================================
    // GLOBAL EVENT LISTENERS (POPUP MODE)
    // ========================================================================

    /** Add outside-click and escape listeners for popup dismissal. */
    private addGlobalListeners(): void
    {
        this.boundOutsideClick = (e: MouseEvent) =>
        {
            if (this.rootEl && !this.rootEl.contains(e.target as Node))
            {
                this.close();
            }
        };

        this.boundEscapeKey = (e: KeyboardEvent) =>
        {
            if (e.key === "Escape")
            {
                this.close();
                this.triggerEl?.focus();
            }
        };

        // Defer to avoid the opening click from closing immediately
        setTimeout(() =>
        {
            document.addEventListener("mousedown", this.boundOutsideClick!);
            document.addEventListener("keydown", this.boundEscapeKey!);
        }, 0);
    }

    /** Remove global listeners for popup dismissal. */
    private removeGlobalListeners(): void
    {
        if (this.boundOutsideClick)
        {
            document.removeEventListener("mousedown", this.boundOutsideClick);
            this.boundOutsideClick = null;
        }
        if (this.boundEscapeKey)
        {
            document.removeEventListener("keydown", this.boundEscapeKey);
            this.boundEscapeKey = null;
        }
    }

    // ========================================================================
    // UI UPDATE
    // ========================================================================

    /** Update all visual elements to reflect the current gradient state. */
    private updateAllUI(): void
    {
        this.updatePreviewBar();
        this.updateTriggerSwatch();
        this.renderHandles();
        this.updateStopEditor();
        this.updateControlsVisibility();
        this.updateAngleUI();
        this.updateRadialUI();
        this.announceState();
    }

    /** Update the gradient preview bar CSS background. */
    private updatePreviewBar(): void
    {
        if (!this.previewGradient) { return; }
        this.previewGradient.style.background = buildGradientCSS(this.gradientValue);
    }

    /** Update the trigger swatch in popup mode. */
    private updateTriggerSwatch(): void
    {
        if (!this.triggerSwatch) { return; }
        this.triggerSwatch.style.background = buildGradientCSS(this.gradientValue);
    }

    /** Update the selected stop editor panel. */
    private updateStopEditor(): void
    {
        const stop = this.gradientValue.stops[this.selectedStopIndex];
        if (!stop) { return; }

        if (this.stopSwatchBtn)
        {
            this.stopSwatchBtn.style.backgroundColor = stop.color;
            this.stopSwatchBtn.style.opacity = String(stop.alpha);
        }

        this.updatePositionInput(stop);
    }

    /** Update the position input value. */
    private updatePositionInput(stop: GradientStop): void
    {
        if (!this.stopPositionInput) { return; }
        if (document.activeElement === this.stopPositionInput) { return; }
        this.stopPositionInput.value = String(Math.round(stop.position * 100));
    }

    /** Update the angle control UI (AnglePicker or fallback). */
    private updateAngleUI(): void
    {
        if (this.anglePickerInstance)
        {
            const picker = this.anglePickerInstance as Record<string, unknown>;
            if (typeof picker["setValue"] === "function")
            {
                (picker["setValue"] as (v: number) => void)(this.gradientValue.angle);
            }
        }
        else if (this.angleFallbackInput)
        {
            if (document.activeElement !== this.angleFallbackInput)
            {
                this.angleFallbackInput.value = String(this.gradientValue.angle);
            }
        }
    }

    /** Update the radial control input values. */
    private updateRadialUI(): void
    {
        this.updateRadialInput(this.radialXInput, this.gradientValue.center.x);
        this.updateRadialInput(this.radialYInput, this.gradientValue.center.y);
        this.updateRadialInput(this.radialRInput, this.gradientValue.radius);
    }

    /** Update a single radial input if not focused (value is 0-1, display is %). */
    private updateRadialInput(input: HTMLInputElement | null, value: number): void
    {
        if (!input) { return; }
        if (document.activeElement === input) { return; }
        input.value = String(Math.round(value * 100));
    }

    /** Announce the gradient state to screen readers via the live region. */
    private announceState(): void
    {
        if (!this.liveRegion) { return; }
        const type = this.gradientValue.type;
        const stopCount = this.gradientValue.stops.length;
        this.liveRegion.textContent =
            `${type} gradient with ${stopCount} stops`;
    }

    // ========================================================================
    // EVENT EMISSION
    // ========================================================================

    /** Emit the onChange callback with a deep copy of the current value. */
    private emitChange(): void
    {
        this.options.onChange?.(this.cloneValue());
    }

    /** Emit the onInput callback with a deep copy of the current value. */
    private emitInput(): void
    {
        this.options.onInput?.(this.cloneValue());
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /** Destroy composed ColorPicker and AnglePicker instances. */
    private destroyComposedComponents(): void
    {
        this.destroyInstance(this.colorPickerInstance);
        this.colorPickerInstance = null;

        this.destroyInstance(this.anglePickerInstance);
        this.anglePickerInstance = null;
    }

    /** Safely destroy a composed component instance. */
    private destroyInstance(instance: unknown): void
    {
        if (!instance) { return; }
        const obj = instance as Record<string, unknown>;
        if (typeof obj["destroy"] === "function")
        {
            (obj["destroy"] as () => void)();
        }
    }

    /** Remove root element from the DOM. */
    private removeRootFromDOM(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }
}

// ============================================================================
// CONVERSION HELPERS
// ============================================================================

/**
 * Convert a GradientValue to a DiagramEngine GradientDefinition.
 * Maps position -> offset and merges colour + alpha into an rgba string.
 */
function convertToDefinition(value: GradientValue): GradientDefinition
{
    const stops = value.stops.map((s) => ({
        offset: s.position,
        color: stopToRgba(s)
    }));

    return {
        type: value.type,
        stops,
        angle: value.angle,
        center: { ...value.center },
        radius: value.radius
    };
}

/**
 * Convert a DiagramEngine GradientDefinition to a GradientValue.
 * Parses rgba strings back into separate colour + alpha fields.
 */
function convertFromDefinition(def: GradientDefinition): GradientValue
{
    const stops = def.stops.map((s) => parseDefinitionStop(s));

    return {
        type: def.type,
        stops,
        angle: def.angle,
        center: def.center ? { ...def.center } : { x: 0.5, y: 0.5 },
        radius: def.radius ?? 0.5
    };
}

/** Parse a single definition stop (offset + rgba colour) into a GradientStop. */
function parseDefinitionStop(
    s: { offset: number; color: string }
): GradientStop
{
    const rgbaMatch = s.color.match(
        /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/
    );

    if (rgbaMatch)
    {
        return parseRgbaStop(s.offset, rgbaMatch);
    }

    // Assume hex format
    return {
        position: s.offset,
        color: s.color,
        alpha: 1
    };
}

/** Parse an rgba match array into a GradientStop with hex colour and alpha. */
function parseRgbaStop(offset: number, match: RegExpMatchArray): GradientStop
{
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
    const toHex = (n: number) => n.toString(16).padStart(2, "0");

    return {
        position: offset,
        color: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
        alpha: a
    };
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createGradientPicker
 * Create and return a GradientPicker instance mounted in the given container.
 *
 * @param containerId - The DOM element ID where the picker will be mounted
 * @param options - Configuration options for the gradient picker
 * @returns GradientPicker instance
 */
export function createGradientPicker(
    containerId: string, options?: GradientPickerOptions
): GradientPicker
{
    return new GradientPicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["GradientPicker"] = GradientPicker;
(window as unknown as Record<string, unknown>)["createGradientPicker"] = createGradientPicker;
