/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ColorPicker
 * 📜 PURPOSE: Canvas-based colour selection with hex/RGB/HSL formats, opacity
 *             slider, preset swatches, and popup/inline modes.
 * 🔗 RELATES: [[EnterpriseTheme]], [[ColorPickerSpec]]
 * ⚡ FLOW: [Consumer App] -> [createColorPicker()] -> [Canvas 2D Rendering]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[ColorPicker]";

/** Default colour when none specified. */
const DEFAULT_COLOR = "#3B82F6";

/** Canvas dimensions for saturation/brightness palette. */
const PALETTE_WIDTH = 220;
const PALETTE_HEIGHT = 160;

/** Canvas dimensions for the hue strip. */
const HUE_STRIP_WIDTH = 20;
const HUE_STRIP_HEIGHT = PALETTE_HEIGHT;

/** Popup z-index (same level as modals). */
const POPUP_Z_INDEX = 1050;

/** Copy confirmation duration in ms. */
const COPY_FEEDBACK_MS = 1500;

/** Crosshair cursor radius on palette. */
const CURSOR_RADIUS = 6;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

/** Default key bindings for keyboard navigation actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    paletteSatUp: "ArrowRight",
    paletteSatDown: "ArrowLeft",
    paletteBrightUp: "ArrowUp",
    paletteBrightDown: "ArrowDown",
    hueUp: "ArrowUp",
    hueDown: "ArrowDown",
    opacityUp: "ArrowRight",
    opacityDown: "ArrowLeft",
    closePopup: "Escape",
};

// ============================================================================
// INTERFACES
// ============================================================================

/** Red-Green-Blue-Alpha colour representation. */
interface ColorRGBA
{
    r: number;
    g: number;
    b: number;
    a: number;
}

/** Hue-Saturation-Lightness-Alpha colour representation. */
interface ColorHSLA
{
    h: number;
    s: number;
    l: number;
    a: number;
}

/** Configuration options for the ColorPicker component. */
export interface ColorPickerOptions
{
    /** Initial colour (hex string). Default: "#3B82F6". */
    value?: string;
    /** Output format for getValue(). Default: "hex". */
    format?: "hex" | "rgb" | "hsl";
    /** Show alpha/opacity slider. Default: false. */
    showOpacity?: boolean;
    /** Show hex/RGB/HSL format tabs. Default: true. */
    showFormatTabs?: boolean;
    /** Show text input fields. Default: true. */
    showInputs?: boolean;
    /** Preset swatch colours (hex strings). */
    swatches?: string[];
    /** Render inline (true) or popup (false). Default: false (popup). */
    inline?: boolean;
    /** Popup position relative to trigger. Default: "bottom-start". */
    popupPosition?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
    /** Custom trigger element (popup mode only). */
    triggerElement?: HTMLElement;
    /** Disable the component. Default: false. */
    disabled?: boolean;
    /** Size variant. Default: "default". */
    size?: "mini" | "sm" | "default" | "lg";
    /** Optional label displayed above the picker. */
    label?: string;
    /** Fired on colour change (commit: swatch click, Enter, popup close). */
    onChange?: (color: string, alpha?: number) => void;
    /** Fired continuously during drag and on every colour adjustment. */
    onInput?: (color: string, alpha?: number) => void;
    /** Fired when popup opens. */
    onOpen?: () => void;
    /** Fired when popup closes. */
    onClose?: () => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// COLOUR MATH UTILITIES
// ============================================================================

/** Parse hex string to RGB. Returns null on invalid input. */
function hexToRgb(hex: string): ColorRGBA | null
{
    const clean = hex.replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(clean))
    {
        return null;
    }
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    const a = clean.length === 8
        ? parseInt(clean.substring(6, 8), 16) / 255
        : 1;
    return { r, g, b, a };
}

/** Convert RGB (0-255) to HSL (h: 0-360, s/l: 0-100). */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number }
{
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    if (max === min)
    {
        return { h: 0, s: 0, l: Math.round(l * 100) };
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = computeHue(rn, gn, bn, max, d);
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Compute hue value from RGB components. */
function computeHue(
    rn: number, gn: number, bn: number,
    max: number, d: number
): number
{
    let h = 0;
    if (max === rn)
    {
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    }
    else if (max === gn)
    {
        h = ((bn - rn) / d + 2) * 60;
    }
    else
    {
        h = ((rn - gn) / d + 4) * 60;
    }
    return h;
}

/** Convert HSL (h: 0-360, s/l: 0-100) to RGB (0-255). */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number }
{
    const sn = s / 100;
    const ln = l / 100;
    if (sn === 0)
    {
        const v = Math.round(ln * 255);
        return { r: v, g: v, b: v };
    }
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    const hn = h / 360;
    return {
        r: Math.round(hueToChannel(p, q, hn + 1 / 3) * 255),
        g: Math.round(hueToChannel(p, q, hn) * 255),
        b: Math.round(hueToChannel(p, q, hn - 1 / 3) * 255)
    };
}

/** Helper to convert hue fraction to channel value. */
function hueToChannel(p: number, q: number, t: number): number
{
    let tn = t;
    if (tn < 0) { tn += 1; }
    if (tn > 1) { tn -= 1; }
    if (tn < 1 / 6) { return p + (q - p) * 6 * tn; }
    if (tn < 1 / 2) { return q; }
    if (tn < 2 / 3) { return p + (q - p) * (2 / 3 - tn) * 6; }
    return p;
}

/** Convert RGB to hex string (6-digit). */
function rgbToHex(r: number, g: number, b: number): string
{
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Convert HSL values to a canvas-usable full-saturation hue colour. */
function hueToRgbString(hue: number): string
{
    const { r, g, b } = hslToRgb(hue, 100, 50);
    return `rgb(${r},${g},${b})`;
}

/** Parse any supported colour string to HSLA. */
function parseColorString(input: string): ColorHSLA | null
{
    const trimmed = input.trim();
    const hexResult = hexToRgb(trimmed);
    if (hexResult)
    {
        const hsl = rgbToHsl(hexResult.r, hexResult.g, hexResult.b);
        return { ...hsl, a: hexResult.a };
    }
    return parseRgbOrHslString(trimmed);
}

/** Parse rgb() or hsl() CSS string. */
function parseRgbOrHslString(str: string): ColorHSLA | null
{
    const rgbMatch = str.match(
        /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/
    );
    if (rgbMatch)
    {
        const r = clamp(parseInt(rgbMatch[1], 10), 0, 255);
        const g = clamp(parseInt(rgbMatch[2], 10), 0, 255);
        const b = clamp(parseInt(rgbMatch[3], 10), 0, 255);
        const a = rgbMatch[4] !== undefined ? clamp(parseFloat(rgbMatch[4]), 0, 1) : 1;
        const hsl = rgbToHsl(r, g, b);
        return { ...hsl, a };
    }
    const hslMatch = str.match(
        /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?(?:\s*,\s*([\d.]+))?\s*\)$/
    );
    if (hslMatch)
    {
        return {
            h: clamp(parseFloat(hslMatch[1]), 0, 360),
            s: clamp(parseFloat(hslMatch[2]), 0, 100),
            l: clamp(parseFloat(hslMatch[3]), 0, 100),
            a: hslMatch[4] !== undefined ? clamp(parseFloat(hslMatch[4]), 0, 1) : 1
        };
    }
    return null;
}

/** Clamp a number between min and max. */
function clamp(val: number, min: number, max: number): number
{
    return Math.min(Math.max(val, min), max);
}

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

/** Create a canvas element with specified dimensions. */
function createCanvas(
    width: number, height: number, className: string
): HTMLCanvasElement
{
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.className = className;
    return canvas;
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
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: ColorPicker
 *
 * Canvas-based colour picker with hex/RGB/HSL support.
 *
 * @example
 * var picker = createColorPicker("container", {
 *     value: "#FF5733",
 *     showOpacity: true,
 *     onChange: (color) => console.log("Selected:", color)
 * });
 */
export class ColorPicker
{
    private readonly instanceId!: string;
    private readonly options!: ColorPickerOptions;

    // Current colour state (HSL + alpha)
    private hue = 0;
    private saturation = 100;
    private lightness = 50;
    private alpha = 1;
    private previousColor = DEFAULT_COLOR;

    // Active format tab
    private activeFormat: "hex" | "rgb" | "hsl" = "hex";

    // Popup state
    private isOpen = false;
    private isDisabled = false;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private labelEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private triggerSwatch: HTMLElement | null = null;
    private triggerLabel: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private paletteCanvas: HTMLCanvasElement | null = null;
    private paletteCtx: CanvasRenderingContext2D | null = null;
    private paletteCursor: HTMLElement | null = null;
    private hueCanvas: HTMLCanvasElement | null = null;
    private hueCtx: CanvasRenderingContext2D | null = null;
    private hueIndicator: HTMLElement | null = null;
    private opacityBar: HTMLElement | null = null;
    private opacityThumb: HTMLElement | null = null;
    private opacityTrack: HTMLElement | null = null;
    private previewNew: HTMLElement | null = null;
    private previewOld: HTMLElement | null = null;
    private inputRow: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;

    // Bound handlers
    private boundOutsideClick: ((e: MouseEvent) => void) | null = null;
    private boundEscapeKey: ((e: KeyboardEvent) => void) | null = null;

    // Animation frame IDs
    private paletteRafId = 0;
    private hueRafId = 0;

    constructor(options?: ColorPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `colorpicker-${instanceCounter}`;
        this.options = options ?? {};
        this.isDisabled = this.options.disabled ?? false;
        this.activeFormat = this.options.format ?? "hex";

        this.initColorFromValue(this.options.value ?? DEFAULT_COLOR);
        this.previousColor = this.formatCurrentColor("hex");

        this.rootEl = this.buildRoot();
        console.log(LOG_PREFIX, "Created instance", this.instanceId);
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /**
     * Resolves the combo string for a named action,
     * checking user overrides first, then defaults.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Returns true when the keyboard event matches the
     * resolved combo for the given action name.
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
    // PUBLIC API
    // ========================================================================

    /** Append to container element or body. */
    show(containerId?: string): void
    {
        if (!this.rootEl) { return; }
        const container = containerId
            ? document.getElementById(containerId)
            : document.body;
        if (!container)
        {
            console.warn(LOG_PREFIX, "Container not found:", containerId);
            return;
        }
        container.appendChild(this.rootEl);
        this.drawPalette();
        this.drawHueStrip();
        this.updateAllUI();
    }

    /** Remove from DOM, keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /** Clean up everything. */
    destroy(): void
    {
        this.close();
        this.removeGlobalListeners();
        this.hide();
        this.paletteCtx = null;
        this.hueCtx = null;
        this.rootEl = null;
        console.log(LOG_PREFIX, "Destroyed", this.instanceId);
    }

    /** Get colour in the configured format. */
    getValue(): string
    {
        return this.formatCurrentColor(this.options.format ?? "hex");
    }

    /** Get colour with alpha as rgba() string. */
    getValueWithAlpha(): string
    {
        const { r, g, b } = hslToRgb(this.hue, this.saturation, this.lightness);
        return `rgba(${r}, ${g}, ${b}, ${this.alpha})`;
    }

    /** Set colour programmatically. */
    setValue(color: string): void
    {
        this.initColorFromValue(color);
        this.updateAllUI();
        this.drawPalette();
    }

    /** Get current alpha. */
    getAlpha(): number
    {
        return this.alpha;
    }

    /** Set alpha (clamped 0-1). */
    setAlpha(a: number): void
    {
        this.alpha = clamp(a, 0, 1);
        this.updateAllUI();
    }

    /** Open popup (no-op in inline mode). */
    open(): void
    {
        if (this.options.inline || this.isDisabled || this.isOpen) { return; }
        this.isOpen = true;
        this.previousColor = this.formatCurrentColor("hex");
        if (this.panelEl)
        {
            this.panelEl.style.display = "block";
            this.positionPanel();
        }
        this.drawPalette();
        this.drawHueStrip();
        this.updateAllUI();
        this.addGlobalListeners();
        this.updateTriggerAria();
        this.options.onOpen?.();
    }

    /** Close popup (no-op in inline mode). */
    close(): void
    {
        if (this.options.inline || !this.isOpen) { return; }
        this.isOpen = false;
        if (this.panelEl)
        {
            this.panelEl.style.display = "none";
        }
        this.removeGlobalListeners();
        this.updateTriggerAria();
        this.options.onClose?.();
    }

    /** Return root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Return the popup panel element, or null if inline/closed. */
    getPopupElement(): HTMLElement | null
    {
        if (this.options.inline) { return null; }
        if (!this.isOpen) { return null; }
        return this.panelEl;
    }

    /** Update the label text. Creates the label element if needed. */
    setLabel(label: string): void
    {
        if (this.labelEl)
        {
            this.labelEl.textContent = label;
        }
        else if (this.rootEl)
        {
            this.labelEl = createElement("label", "colorpicker-label");
            this.labelEl.textContent = label;
            this.labelEl.setAttribute("for", this.instanceId);
            this.rootEl.insertBefore(this.labelEl, this.rootEl.firstChild);
        }
    }

    /** Enable the component. */
    enable(): void
    {
        this.isDisabled = false;
        this.rootEl?.classList.remove("colorpicker-disabled");
        this.triggerEl?.removeAttribute("aria-disabled");
    }

    /** Disable the component. Closes popup if open. */
    disable(): void
    {
        this.isDisabled = true;
        this.close();
        this.rootEl?.classList.add("colorpicker-disabled");
        this.triggerEl?.setAttribute("aria-disabled", "true");
    }

    // ========================================================================
    // INITIALISATION
    // ========================================================================

    /** Parse initial colour value into HSL components. */
    private initColorFromValue(value: string): void
    {
        const parsed = parseColorString(value);
        if (parsed)
        {
            this.hue = parsed.h;
            this.saturation = parsed.s;
            this.lightness = parsed.l;
            this.alpha = parsed.a;
        }
        else
        {
            console.warn(LOG_PREFIX, "Invalid colour, using default:", value);
            this.hue = 217;
            this.saturation = 91;
            this.lightness = 60;
            this.alpha = 1;
        }
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const sizeClass = this.getSizeClass();
        const root = createElement("div", `colorpicker ${sizeClass}`);
        root.id = this.instanceId;

        if (this.options.label)
        {
            this.labelEl = createElement("label", "colorpicker-label");
            this.labelEl.textContent = this.options.label;
            this.labelEl.setAttribute("for", this.instanceId);
            root.appendChild(this.labelEl);
        }

        if (this.options.inline)
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

        this.liveRegion = createElement("div", "colorpicker-sr-only");
        setAttr(this.liveRegion, { "aria-live": "polite", "aria-atomic": "true" });
        root.appendChild(this.liveRegion);

        if (this.isDisabled)
        {
            root.classList.add("colorpicker-disabled");
            this.triggerEl?.setAttribute("aria-disabled", "true");
        }
        return root;
    }

    /** Get CSS class for size variant. */
    private getSizeClass(): string
    {
        if (this.options.size === "mini") { return "colorpicker-mini"; }
        if (this.options.size === "sm") { return "colorpicker-sm"; }
        if (this.options.size === "lg") { return "colorpicker-lg"; }
        return "";
    }

    /** Build the popup trigger button. */
    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("button", "colorpicker-trigger");
        setAttr(trigger, {
            type: "button",
            "aria-haspopup": "dialog",
            "aria-expanded": "false"
        });

        this.triggerSwatch = createElement("span", "colorpicker-trigger-swatch");
        this.triggerLabel = createElement("span", "colorpicker-trigger-label");
        const caret = createElement("span", "colorpicker-trigger-caret");
        caret.innerHTML = "&#x25BE;";

        trigger.appendChild(this.triggerSwatch);
        trigger.appendChild(this.triggerLabel);
        trigger.appendChild(caret);

        trigger.addEventListener("click", () => this.handleTriggerClick());
        return trigger;
    }

    /** Build the picker panel (shared by popup and inline). */
    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", "colorpicker-panel");
        if (!this.options.inline)
        {
            panel.style.position = "absolute";
            panel.style.zIndex = String(POPUP_Z_INDEX);
        }

        panel.appendChild(this.buildCanvasArea());

        if (this.options.showOpacity !== false && this.options.showOpacity)
        {
            panel.appendChild(this.buildOpacityBar());
        }

        panel.appendChild(this.buildPreviewRow());

        if (this.options.showFormatTabs !== false)
        {
            panel.appendChild(this.buildFormatTabs());
        }

        if (this.options.showInputs !== false)
        {
            this.inputRow = this.buildInputRow();
            panel.appendChild(this.inputRow);
        }

        if (this.options.swatches && this.options.swatches.length > 0)
        {
            panel.appendChild(this.buildSwatches(this.options.swatches));
        }

        return panel;
    }

    /** Build the canvas area: palette + hue strip. */
    private buildCanvasArea(): HTMLElement
    {
        const area = createElement("div", "colorpicker-canvas-area");

        const paletteWrap = createElement("div", "colorpicker-palette-wrap");
        this.paletteCanvas = createCanvas(
            PALETTE_WIDTH, PALETTE_HEIGHT, "colorpicker-palette"
        );
        this.paletteCtx = this.paletteCanvas.getContext("2d");
        setAttr(this.paletteCanvas, {
            role: "slider",
            "aria-label": "Color saturation and brightness",
            tabindex: "0",
            "aria-valuemin": "0",
            "aria-valuemax": "100"
        });
        this.paletteCursor = createElement("div", "colorpicker-palette-cursor");
        paletteWrap.appendChild(this.paletteCanvas);
        paletteWrap.appendChild(this.paletteCursor);
        this.addPaletteListeners(this.paletteCanvas);

        const hueWrap = createElement("div", "colorpicker-hue-wrap");
        this.hueCanvas = createCanvas(
            HUE_STRIP_WIDTH, HUE_STRIP_HEIGHT, "colorpicker-hue-strip"
        );
        this.hueCtx = this.hueCanvas.getContext("2d");
        setAttr(this.hueCanvas, {
            role: "slider",
            "aria-label": "Hue",
            tabindex: "0",
            "aria-valuemin": "0",
            "aria-valuemax": "360"
        });
        this.hueIndicator = createElement("div", "colorpicker-hue-indicator");
        hueWrap.appendChild(this.hueCanvas);
        hueWrap.appendChild(this.hueIndicator);
        this.addHueListeners(this.hueCanvas);

        area.appendChild(paletteWrap);
        area.appendChild(hueWrap);
        return area;
    }

    /** Build the opacity slider bar. */
    private buildOpacityBar(): HTMLElement
    {
        this.opacityBar = createElement("div", "colorpicker-opacity-bar");
        setAttr(this.opacityBar, {
            role: "slider",
            "aria-label": "Opacity",
            tabindex: "0",
            "aria-valuemin": "0",
            "aria-valuemax": "100"
        });
        this.opacityTrack = createElement("div", "colorpicker-opacity-track");
        this.opacityThumb = createElement("div", "colorpicker-opacity-thumb");
        this.opacityBar.appendChild(this.opacityTrack);
        this.opacityBar.appendChild(this.opacityThumb);
        this.addOpacityListeners(this.opacityBar);
        return this.opacityBar;
    }

    /** Build the preview row (old vs new). */
    private buildPreviewRow(): HTMLElement
    {
        const row = createElement("div", "colorpicker-preview");

        this.previewOld = createElement("div", "colorpicker-preview-old");
        this.previewOld.title = "Previous colour (click to revert)";
        this.previewOld.addEventListener("click", () => this.revertToPrevious());

        this.previewNew = createElement("div", "colorpicker-preview-new");
        this.previewNew.title = "Current colour";

        row.appendChild(this.previewOld);
        row.appendChild(this.previewNew);
        return row;
    }

    /** Build the format tab row. */
    private buildFormatTabs(): HTMLElement
    {
        const tabs = createElement("div", "colorpicker-tabs");
        setAttr(tabs, { role: "tablist" });

        const formats: Array<"hex" | "rgb" | "hsl"> = ["hex", "rgb", "hsl"];
        for (const fmt of formats)
        {
            const tab = createElement("button", "colorpicker-tab");
            setAttr(tab, {
                type: "button",
                role: "tab",
                "aria-selected": fmt === this.activeFormat ? "true" : "false"
            });
            tab.textContent = fmt.toUpperCase();
            if (fmt === this.activeFormat)
            {
                tab.classList.add("colorpicker-tab-active");
            }
            tab.addEventListener("click", () => this.switchFormat(fmt, tabs));
            tabs.appendChild(tab);
        }
        return tabs;
    }

    /** Build the text input row for the active format. */
    private buildInputRow(): HTMLElement
    {
        const row = createElement("div", "colorpicker-input-row");
        this.rebuildInputFields(row);
        return row;
    }

    /** Rebuild input fields in the row for the active format. */
    private rebuildInputFields(row: HTMLElement): void
    {
        row.innerHTML = "";
        if (this.activeFormat === "hex")
        {
            this.buildHexInput(row);
        }
        else if (this.activeFormat === "rgb")
        {
            this.buildRgbInputs(row);
        }
        else
        {
            this.buildHslInputs(row);
        }
        this.addCopyButton(row);
    }

    /** Build hex text input. */
    private buildHexInput(row: HTMLElement): void
    {
        const prefix = createElement("span", "colorpicker-input-prefix");
        prefix.textContent = "#";
        row.appendChild(prefix);

        const input = document.createElement("input");
        input.className = "colorpicker-input";
        input.type = "text";
        input.maxLength = 6;
        setAttr(input, { "aria-label": "Hex color value" });
        input.value = this.formatCurrentColor("hex").replace("#", "");
        input.addEventListener("keydown", (e) => this.handleHexKey(e, input));
        input.addEventListener("blur", () => this.applyHexInput(input));
        row.appendChild(input);
    }

    /** Build RGB numeric inputs. */
    private buildRgbInputs(row: HTMLElement): void
    {
        const { r, g, b } = hslToRgb(this.hue, this.saturation, this.lightness);
        const channels: Array<{ label: string; value: number; max: number }> = [
            { label: "Red channel", value: r, max: 255 },
            { label: "Green channel", value: g, max: 255 },
            { label: "Blue channel", value: b, max: 255 }
        ];
        for (const ch of channels)
        {
            const input = this.createNumericInput(ch.label, ch.value, 0, ch.max);
            input.addEventListener("change", () =>
                this.applyRgbInputs(row)
            );
            row.appendChild(input);
        }
    }

    /** Build HSL numeric inputs. */
    private buildHslInputs(row: HTMLElement): void
    {
        const channels: Array<{ label: string; value: number; max: number }> = [
            { label: "Hue", value: Math.round(this.hue), max: 360 },
            { label: "Saturation", value: Math.round(this.saturation), max: 100 },
            { label: "Lightness", value: Math.round(this.lightness), max: 100 }
        ];
        for (const ch of channels)
        {
            const input = this.createNumericInput(ch.label, ch.value, 0, ch.max);
            input.addEventListener("change", () =>
                this.applyHslInputs(row)
            );
            row.appendChild(input);
        }
    }

    /** Create a numeric input element. */
    private createNumericInput(
        label: string, value: number, min: number, max: number
    ): HTMLInputElement
    {
        const input = document.createElement("input");
        input.className = "colorpicker-input colorpicker-input-numeric";
        input.type = "number";
        input.min = String(min);
        input.max = String(max);
        input.value = String(value);
        setAttr(input, { "aria-label": label });
        return input;
    }

    /** Add copy-to-clipboard button. */
    private addCopyButton(row: HTMLElement): void
    {
        const btn = createElement("button", "colorpicker-copy-btn");
        setAttr(btn, {
            type: "button",
            "aria-label": "Copy color value to clipboard"
        });
        btn.innerHTML = '<i class="bi bi-clipboard"></i>';
        btn.addEventListener("click", () => this.copyToClipboard(btn));
        row.appendChild(btn);
    }

    /** Build the preset swatch grid. */
    private buildSwatches(colors: string[]): HTMLElement
    {
        const grid = createElement("div", "colorpicker-swatches");
        setAttr(grid, { role: "listbox", "aria-label": "Preset colors" });

        for (const color of colors)
        {
            const swatch = createElement("button", "colorpicker-swatch");
            setAttr(swatch, {
                type: "button",
                role: "option",
                "aria-label": color,
                "aria-selected": "false"
            });
            swatch.style.backgroundColor = color;
            swatch.addEventListener("click", () => this.selectSwatch(color));
            grid.appendChild(swatch);
        }
        return grid;
    }

    // ========================================================================
    // CANVAS RENDERING
    // ========================================================================

    /** Draw the saturation/brightness palette canvas. */
    private drawPalette(): void
    {
        if (!this.paletteCtx || !this.paletteCanvas) { return; }
        if (this.paletteRafId)
        {
            cancelAnimationFrame(this.paletteRafId);
        }
        this.paletteRafId = requestAnimationFrame(() =>
            this.renderPalette()
        );
    }

    /** Render palette: hue fill + white gradient + black gradient + cursor. */
    private renderPalette(): void
    {
        const ctx = this.paletteCtx!;
        const w = PALETTE_WIDTH;
        const h = PALETTE_HEIGHT;

        ctx.fillStyle = hueToRgbString(this.hue);
        ctx.fillRect(0, 0, w, h);

        const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
        whiteGrad.addColorStop(0, "rgba(255,255,255,1)");
        whiteGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = whiteGrad;
        ctx.fillRect(0, 0, w, h);

        const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
        blackGrad.addColorStop(0, "rgba(0,0,0,0)");
        blackGrad.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = blackGrad;
        ctx.fillRect(0, 0, w, h);
    }

    /** Draw the hue strip canvas. */
    private drawHueStrip(): void
    {
        if (!this.hueCtx || !this.hueCanvas) { return; }
        if (this.hueRafId)
        {
            cancelAnimationFrame(this.hueRafId);
        }
        this.hueRafId = requestAnimationFrame(() =>
            this.renderHueStrip()
        );
    }

    /** Render vertical hue gradient 0-360. */
    private renderHueStrip(): void
    {
        const ctx = this.hueCtx!;
        const w = HUE_STRIP_WIDTH;
        const h = HUE_STRIP_HEIGHT;
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        for (let i = 0; i <= 6; i++)
        {
            grad.addColorStop(i / 6, hueToRgbString(i * 60));
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    // ========================================================================
    // INTERACTION HANDLERS
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

    /** Add pointer listeners to the palette canvas. */
    private addPaletteListeners(canvas: HTMLCanvasElement): void
    {
        canvas.addEventListener("pointerdown", (e) =>
            this.startPaletteDrag(e, canvas)
        );
        canvas.addEventListener("keydown", (e) =>
            this.handlePaletteKey(e)
        );
    }

    /** Start palette drag interaction. */
    private startPaletteDrag(e: PointerEvent, canvas: HTMLCanvasElement): void
    {
        if (this.isDisabled) { return; }
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        this.updatePaletteFromPointer(e, canvas);

        const onMove = (ev: PointerEvent) =>
            this.updatePaletteFromPointer(ev, canvas);
        const onUp = () =>
        {
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            this.onColorChanged();
        };
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
    }

    /** Update colour from palette pointer position. */
    private updatePaletteFromPointer(
        e: PointerEvent, canvas: HTMLCanvasElement
    ): void
    {
        const rect = canvas.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const y = clamp(e.clientY - rect.top, 0, rect.height);

        // Convert canvas position to HSV saturation (x) and value (y)
        const sv_s = x / rect.width;
        const sv_v = 1 - y / rect.height;

        // Convert HSV to HSL
        const hsl = hsvToHsl(this.hue, sv_s * 100, sv_v * 100);
        this.saturation = hsl.s;
        this.lightness = hsl.l;
        this.onColorDragged();
    }

    /** Add pointer listeners to the hue strip canvas. */
    private addHueListeners(canvas: HTMLCanvasElement): void
    {
        canvas.addEventListener("pointerdown", (e) =>
            this.startHueDrag(e, canvas)
        );
        canvas.addEventListener("keydown", (e) =>
            this.handleHueKey(e)
        );
    }

    /** Start hue strip drag interaction. */
    private startHueDrag(e: PointerEvent, canvas: HTMLCanvasElement): void
    {
        if (this.isDisabled) { return; }
        e.preventDefault();
        canvas.setPointerCapture(e.pointerId);
        this.updateHueFromPointer(e, canvas);

        const onMove = (ev: PointerEvent) =>
            this.updateHueFromPointer(ev, canvas);
        const onUp = () =>
        {
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerup", onUp);
            this.onColorChanged();
        };
        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerup", onUp);
    }

    /** Update hue from pointer position on strip. */
    private updateHueFromPointer(
        e: PointerEvent, canvas: HTMLCanvasElement
    ): void
    {
        const rect = canvas.getBoundingClientRect();
        const y = clamp(e.clientY - rect.top, 0, rect.height);
        this.hue = Math.round((y / rect.height) * 360);
        this.drawPalette();
        this.onColorDragged();
    }

    /** Add pointer listeners to the opacity bar. */
    private addOpacityListeners(bar: HTMLElement): void
    {
        bar.addEventListener("pointerdown", (e) =>
            this.startOpacityDrag(e, bar)
        );
        bar.addEventListener("keydown", (e) =>
            this.handleOpacityKey(e)
        );
    }

    /** Start opacity drag interaction. */
    private startOpacityDrag(e: PointerEvent, bar: HTMLElement): void
    {
        if (this.isDisabled) { return; }
        e.preventDefault();
        bar.setPointerCapture(e.pointerId);
        this.updateOpacityFromPointer(e, bar);

        const onMove = (ev: PointerEvent) =>
            this.updateOpacityFromPointer(ev, bar);
        const onUp = () =>
        {
            bar.removeEventListener("pointermove", onMove);
            bar.removeEventListener("pointerup", onUp);
            this.onColorChanged();
        };
        bar.addEventListener("pointermove", onMove);
        bar.addEventListener("pointerup", onUp);
    }

    /** Update alpha from pointer position on opacity bar. */
    private updateOpacityFromPointer(e: PointerEvent, bar: HTMLElement): void
    {
        const rect = bar.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        this.alpha = Math.round((x / rect.width) * 100) / 100;
        this.onColorDragged();
    }

    // ========================================================================
    // KEYBOARD HANDLERS
    // ========================================================================

    /** Handle keyboard on palette canvas. */
    private handlePaletteKey(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? 10 : 1;
        const hsv = hslToHsv(this.hue, this.saturation, this.lightness);
        let handled = true;

        if (this.matchesKeyCombo(e, "paletteSatUp"))
        {
            hsv.s = clamp(hsv.s + step, 0, 100);
        }
        else if (this.matchesKeyCombo(e, "paletteSatDown"))
        {
            hsv.s = clamp(hsv.s - step, 0, 100);
        }
        else if (this.matchesKeyCombo(e, "paletteBrightUp"))
        {
            hsv.v = clamp(hsv.v + step, 0, 100);
        }
        else if (this.matchesKeyCombo(e, "paletteBrightDown"))
        {
            hsv.v = clamp(hsv.v - step, 0, 100);
        }
        else
        {
            handled = false;
        }

        if (handled)
        {
            e.preventDefault();
            const hsl = hsvToHsl(this.hue, hsv.s, hsv.v);
            this.saturation = hsl.s;
            this.lightness = hsl.l;
            this.onColorChanged();
        }
    }

    /** Handle keyboard on hue strip. */
    private handleHueKey(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? 10 : 1;
        let handled = true;

        if (this.matchesKeyCombo(e, "hueUp"))
        {
            this.hue = (this.hue - step + 360) % 360;
        }
        else if (this.matchesKeyCombo(e, "hueDown"))
        {
            this.hue = (this.hue + step) % 360;
        }
        else
        {
            handled = false;
        }

        if (handled)
        {
            e.preventDefault();
            this.drawPalette();
            this.onColorChanged();
        }
    }

    /** Handle keyboard on opacity bar. */
    private handleOpacityKey(e: KeyboardEvent): void
    {
        const step = e.shiftKey ? 0.1 : 0.01;
        let handled = true;

        if (this.matchesKeyCombo(e, "opacityUp"))
        {
            this.alpha = clamp(this.alpha + step, 0, 1);
        }
        else if (this.matchesKeyCombo(e, "opacityDown"))
        {
            this.alpha = clamp(this.alpha - step, 0, 1);
        }
        else
        {
            handled = false;
        }

        if (handled)
        {
            e.preventDefault();
            this.onColorChanged();
        }
    }

    /** Handle Enter key on hex input. */
    private handleHexKey(e: KeyboardEvent, input: HTMLInputElement): void
    {
        if (e.key === "Enter")
        {
            e.preventDefault();
            this.applyHexInput(input);
        }
    }

    // ========================================================================
    // INPUT HANDLERS
    // ========================================================================

    /** Apply hex input value. */
    private applyHexInput(input: HTMLInputElement): void
    {
        const value = input.value.trim();
        const parsed = hexToRgb(`#${value}`);
        if (parsed)
        {
            const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
            this.hue = hsl.h;
            this.saturation = hsl.s;
            this.lightness = hsl.l;
            this.drawPalette();
            this.onColorChanged();
        }
        else
        {
            input.value = this.formatCurrentColor("hex").replace("#", "");
        }
    }

    /** Apply RGB inputs. */
    private applyRgbInputs(row: HTMLElement): void
    {
        const inputs = row.querySelectorAll<HTMLInputElement>(
            ".colorpicker-input-numeric"
        );
        if (inputs.length < 3) { return; }
        const r = clamp(parseInt(inputs[0].value, 10) || 0, 0, 255);
        const g = clamp(parseInt(inputs[1].value, 10) || 0, 0, 255);
        const b = clamp(parseInt(inputs[2].value, 10) || 0, 0, 255);
        const hsl = rgbToHsl(r, g, b);
        this.hue = hsl.h;
        this.saturation = hsl.s;
        this.lightness = hsl.l;
        this.drawPalette();
        this.onColorChanged();
    }

    /** Apply HSL inputs. */
    private applyHslInputs(row: HTMLElement): void
    {
        const inputs = row.querySelectorAll<HTMLInputElement>(
            ".colorpicker-input-numeric"
        );
        if (inputs.length < 3) { return; }
        this.hue = clamp(parseInt(inputs[0].value, 10) || 0, 0, 360);
        this.saturation = clamp(parseInt(inputs[1].value, 10) || 0, 0, 100);
        this.lightness = clamp(parseInt(inputs[2].value, 10) || 0, 0, 100);
        this.drawPalette();
        this.onColorChanged();
    }

    /** Select a swatch colour. */
    private selectSwatch(color: string): void
    {
        this.initColorFromValue(color);
        this.drawPalette();
        this.onColorChanged();
    }

    /** Revert to previous colour. */
    private revertToPrevious(): void
    {
        this.initColorFromValue(this.previousColor);
        this.drawPalette();
        this.onColorChanged();
    }

    /** Switch active format tab. */
    private switchFormat(
        format: "hex" | "rgb" | "hsl", tabsContainer: HTMLElement
    ): void
    {
        this.activeFormat = format;
        const tabs = tabsContainer.querySelectorAll(".colorpicker-tab");
        tabs.forEach((tab, i) =>
        {
            const fmt = ["hex", "rgb", "hsl"][i];
            tab.classList.toggle("colorpicker-tab-active", fmt === format);
            tab.setAttribute("aria-selected", fmt === format ? "true" : "false");
        });
        if (this.inputRow)
        {
            this.rebuildInputFields(this.inputRow);
        }
    }

    /** Copy current colour to clipboard. */
    private copyToClipboard(btn: HTMLElement): void
    {
        const value = this.formatCurrentColor(this.activeFormat);
        navigator.clipboard.writeText(value).then(() =>
        {
            btn.innerHTML = '<i class="bi bi-check2"></i>';
            setTimeout(() =>
            {
                btn.innerHTML = '<i class="bi bi-clipboard"></i>';
            }, COPY_FEEDBACK_MS);
        }).catch(() =>
        {
            console.warn(LOG_PREFIX, "Clipboard write failed");
        });
    }

    // ========================================================================
    // COLOUR STATE
    // ========================================================================

    /**
     * Called during drag moves. Updates UI and fires onInput only.
     * Does NOT fire onChange — the commit happens on pointer up.
     */
    private onColorDragged(): void
    {
        this.updateAllUI();
        const value = this.formatCurrentColor(this.options.format ?? "hex");
        this.options.onInput?.(value, this.alpha);
        this.announceColor(value);
    }

    /** Called on colour commit. Updates UI, fires onInput then onChange. */
    private onColorChanged(): void
    {
        this.updateAllUI();
        const value = this.formatCurrentColor(this.options.format ?? "hex");
        this.options.onInput?.(value, this.alpha);
        this.options.onChange?.(value, this.alpha);
        this.announceColor(value);
    }

    /** Format current colour in the specified format. */
    private formatCurrentColor(format: "hex" | "rgb" | "hsl"): string
    {
        const { r, g, b } = hslToRgb(this.hue, this.saturation, this.lightness);
        switch (format)
        {
            case "hex": return rgbToHex(r, g, b);
            case "rgb": return `rgb(${r}, ${g}, ${b})`;
            case "hsl":
                return `hsl(${Math.round(this.hue)}, ${Math.round(this.saturation)}%, ${Math.round(this.lightness)}%)`;
        }
    }

    /** Announce colour change to screen readers. */
    private announceColor(value: string): void
    {
        if (this.liveRegion)
        {
            this.liveRegion.textContent = `Selected colour: ${value}`;
        }
    }

    // ========================================================================
    // UI UPDATE
    // ========================================================================

    /** Update all visual elements to reflect current state. */
    private updateAllUI(): void
    {
        this.updateTrigger();
        this.updatePaletteCursor();
        this.updateHueIndicator();
        this.updateOpacity();
        this.updatePreview();
        this.updateInputs();
        this.updateAriaValues();
    }

    /** Update the trigger button colour swatch and label. */
    private updateTrigger(): void
    {
        if (!this.triggerSwatch || !this.triggerLabel) { return; }
        const hex = this.formatCurrentColor("hex");
        this.triggerSwatch.style.backgroundColor = hex;
        this.triggerLabel.textContent = hex;
        if (this.triggerEl)
        {
            this.triggerEl.setAttribute(
                "aria-label", `${hex}, open color picker`
            );
        }
    }

    /** Update trigger aria-expanded attribute. */
    private updateTriggerAria(): void
    {
        if (this.triggerEl)
        {
            this.triggerEl.setAttribute(
                "aria-expanded", this.isOpen ? "true" : "false"
            );
        }
    }

    /** Position the palette crosshair cursor. */
    private updatePaletteCursor(): void
    {
        if (!this.paletteCursor || !this.paletteCanvas) { return; }
        const hsv = hslToHsv(this.hue, this.saturation, this.lightness);
        const x = (hsv.s / 100) * PALETTE_WIDTH;
        const y = (1 - hsv.v / 100) * PALETTE_HEIGHT;
        this.paletteCursor.style.left = `${x}px`;
        this.paletteCursor.style.top = `${y}px`;
    }

    /** Position the hue indicator. */
    private updateHueIndicator(): void
    {
        if (!this.hueIndicator) { return; }
        const y = (this.hue / 360) * HUE_STRIP_HEIGHT;
        this.hueIndicator.style.top = `${y}px`;
    }

    /** Update opacity bar gradient and thumb position. */
    private updateOpacity(): void
    {
        if (!this.opacityTrack || !this.opacityThumb) { return; }
        const { r, g, b } = hslToRgb(this.hue, this.saturation, this.lightness);
        this.opacityTrack.style.background =
            `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1))`;
        this.opacityThumb.style.left = `${this.alpha * 100}%`;
    }

    /** Update the preview swatches. */
    private updatePreview(): void
    {
        if (this.previewNew)
        {
            this.previewNew.style.backgroundColor = this.getValueWithAlpha();
        }
        if (this.previewOld)
        {
            this.previewOld.style.backgroundColor = this.previousColor;
        }
    }

    /** Update text input values. */
    private updateInputs(): void
    {
        if (!this.inputRow) { return; }
        if (this.activeFormat === "hex")
        {
            const input = this.inputRow.querySelector<HTMLInputElement>(
                ".colorpicker-input:not(.colorpicker-input-numeric)"
            );
            if (input && document.activeElement !== input)
            {
                input.value = this.formatCurrentColor("hex").replace("#", "");
            }
        }
        else
        {
            this.updateNumericInputs();
        }
    }

    /** Update numeric input values for RGB or HSL. */
    private updateNumericInputs(): void
    {
        if (!this.inputRow) { return; }
        const inputs = this.inputRow.querySelectorAll<HTMLInputElement>(
            ".colorpicker-input-numeric"
        );
        if (inputs.length < 3) { return; }

        if (this.activeFormat === "rgb")
        {
            const { r, g, b } = hslToRgb(this.hue, this.saturation, this.lightness);
            if (document.activeElement !== inputs[0]) { inputs[0].value = String(r); }
            if (document.activeElement !== inputs[1]) { inputs[1].value = String(g); }
            if (document.activeElement !== inputs[2]) { inputs[2].value = String(b); }
        }
        else if (this.activeFormat === "hsl")
        {
            if (document.activeElement !== inputs[0])
            {
                inputs[0].value = String(Math.round(this.hue));
            }
            if (document.activeElement !== inputs[1])
            {
                inputs[1].value = String(Math.round(this.saturation));
            }
            if (document.activeElement !== inputs[2])
            {
                inputs[2].value = String(Math.round(this.lightness));
            }
        }
    }

    /** Update ARIA values on sliders. */
    private updateAriaValues(): void
    {
        if (this.paletteCanvas)
        {
            this.paletteCanvas.setAttribute(
                "aria-valuenow",
                String(Math.round(this.lightness))
            );
        }
        if (this.hueCanvas)
        {
            this.hueCanvas.setAttribute(
                "aria-valuenow", String(Math.round(this.hue))
            );
        }
        if (this.opacityBar)
        {
            this.opacityBar.setAttribute(
                "aria-valuenow", String(Math.round(this.alpha * 100))
            );
        }
    }

    // ========================================================================
    // POPUP POSITIONING
    // ========================================================================

    /** Position the panel relative to the trigger. */
    private positionPanel(): void
    {
        if (!this.panelEl || !this.triggerEl) { return; }
        const triggerRect = this.triggerEl.getBoundingClientRect();
        const pos = this.options.popupPosition ?? "bottom-start";

        let top = 0;
        let left = 0;

        if (pos.startsWith("bottom"))
        {
            top = triggerRect.bottom + 4;
        }
        else
        {
            top = triggerRect.top - this.panelEl.offsetHeight - 4;
        }

        if (pos.endsWith("start"))
        {
            left = triggerRect.left;
        }
        else
        {
            left = triggerRect.right - this.panelEl.offsetWidth;
        }

        // Viewport overflow correction
        this.applyViewportCorrection(top, left);
    }

    /** Apply viewport overflow correction to panel position. */
    private applyViewportCorrection(top: number, left: number): void
    {
        if (!this.panelEl) { return; }
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (left < 4) { left = 4; }
        if (left + this.panelEl.offsetWidth > vw - 4)
        {
            left = vw - this.panelEl.offsetWidth - 4;
        }
        if (top + this.panelEl.offsetHeight > vh - 4)
        {
            top = top - this.panelEl.offsetHeight - 40;
        }
        if (top < 4) { top = 4; }

        this.panelEl.style.position = "fixed";
        this.panelEl.style.top = `${top}px`;
        this.panelEl.style.left = `${left}px`;
    }

    // ========================================================================
    // GLOBAL LISTENERS
    // ========================================================================

    /** Add outside-click and escape listeners. */
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
            if (this.matchesKeyCombo(e, "closePopup"))
            {
                this.close();
                this.triggerEl?.focus();
            }
        };
        setTimeout(() =>
        {
            document.addEventListener("mousedown", this.boundOutsideClick!);
            document.addEventListener("keydown", this.boundEscapeKey!);
        }, 0);
    }

    /** Remove global listeners. */
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
}

// ============================================================================
// HSV <-> HSL CONVERSION UTILITIES
// ============================================================================

/**
 * Convert HSV (h: 0-360, s: 0-100, v: 0-100) to HSL.
 * The palette canvas operates in HSV space (saturation = x, value = y).
 */
function hsvToHsl(
    h: number, svS: number, svV: number
): { h: number; s: number; l: number }
{
    const s = svS / 100;
    const v = svV / 100;
    const l = v * (1 - s / 2);
    const newS = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
    return { h, s: Math.round(newS * 100), l: Math.round(l * 100) };
}

/** Convert HSL (h: 0-360, s: 0-100, l: 0-100) to HSV. */
function hslToHsv(
    h: number, hslS: number, hslL: number
): { h: number; s: number; v: number }
{
    const s = hslS / 100;
    const l = hslL / 100;
    const v = l + s * Math.min(l, 1 - l);
    const newS = v === 0 ? 0 : 2 * (1 - l / v);
    return { h, s: Math.round(newS * 100), v: Math.round(v * 100) };
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createColorPicker
 * Create, show, and return a ColorPicker in one call.
 */
export function createColorPicker(
    containerId: string, options?: ColorPickerOptions
): ColorPicker
{
    const picker = new ColorPicker(options);
    picker.show(containerId);
    return picker;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).ColorPicker = ColorPicker;
(window as any).createColorPicker = createColorPicker;
