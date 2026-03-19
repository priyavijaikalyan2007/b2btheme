/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: Magnifier
 * PURPOSE: Cursor-following magnifying glass overlay that clones and scales
 *             the target element content within a circular lens.
 * RELATES: [[EnterpriseTheme]], [[MagnifierSpec]]
 * FLOW: [Consumer App] -> [createMagnifier()] -> [DOM Clone + Scale]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** Configuration options for the Magnifier component. */
export interface MagnifierOptions
{
    /** Element to magnify. String is treated as element ID. Default: document.body. */
    target?: HTMLElement | string;
    /** Magnification factor. Default: 2. */
    zoom?: number;
    /** Lens diameter in pixels. Default: 150. */
    diameter?: number;
    /** Lens border colour. Default: "#868e96" (gray-600). */
    borderColor?: string;
    /** Lens border width in pixels. Default: 2. */
    borderWidth?: number;
    /** Cursor offset for lens positioning. Default: { x: 20, y: 20 }. */
    offset?: { x: number; y: number };
    /** Show crosshair lines at the centre of the lens. Default: true. */
    showCrosshair?: boolean;
    /** Start in disabled state. Default: false. */
    disabled?: boolean;
    /** Called on each mouse move with cursor coordinates. */
    onMove?: (x: number, y: number) => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Magnifier]";

/** Base CSS class prefix. */
const CLS = "magnifier";

/** Default magnification factor. */
const DEFAULT_ZOOM = 2;

/** Default lens diameter in pixels. */
const DEFAULT_DIAMETER = 150;

/** Default lens border colour (gray-600 equivalent). */
const DEFAULT_BORDER_COLOR = "#868e96";

/** Default lens border width in pixels. */
const DEFAULT_BORDER_WIDTH = 2;

/** Default cursor offset for lens position. */
const DEFAULT_OFFSET = { x: 20, y: 20 };

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// S3: DOM HELPERS
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
// S4: MAGNIFIER CLASS
// ============================================================================

/** Cursor-following magnifying glass overlay component. */
export class Magnifier
{
    private containerId: string;
    private options: MagnifierOptions;
    private targetEl: HTMLElement | null = null;
    private lensEl: HTMLElement | null = null;
    private innerEl: HTMLElement | null = null;
    private cloneEl: HTMLElement | null = null;
    private crosshairEl: HTMLElement | null = null;
    private enabled: boolean;
    private zoom: number;
    private diameter: number;

    private boundMouseMove: (e: MouseEvent) => void;
    private boundMouseEnter: (e: MouseEvent) => void;
    private boundMouseLeave: (e: MouseEvent) => void;

    constructor(containerId: string, options: MagnifierOptions = {})
    {
        instanceCounter++;
        this.containerId = containerId;
        this.options = options;
        this.zoom = options.zoom ?? DEFAULT_ZOOM;
        this.diameter = options.diameter ?? DEFAULT_DIAMETER;
        this.enabled = !(options.disabled === true);

        this.boundMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
        this.boundMouseEnter = (e: MouseEvent) => this.handleMouseEnter(e);
        this.boundMouseLeave = () => this.handleMouseLeave();

        this.targetEl = this.resolveTarget(options.target);
        this.lensEl = this.buildLens();

        document.body.appendChild(this.lensEl);

        if (this.targetEl && this.enabled)
        {
            this.attachListeners();
        }

        console.log(LOG_PREFIX, "Initialised, zoom:", this.zoom, "diameter:", this.diameter);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /** Returns the lens DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.lensEl;
    }

    /** Enable magnification tracking. */
    public enable(): void
    {
        if (this.enabled)
        {
            return;
        }

        this.enabled = true;
        this.attachListeners();
        console.log(LOG_PREFIX, "Enabled");
    }

    /** Disable magnification tracking and hide the lens. */
    public disable(): void
    {
        if (!this.enabled)
        {
            return;
        }

        this.enabled = false;
        this.detachListeners();
        this.hideLens();
        console.log(LOG_PREFIX, "Disabled");
    }

    /** Update the magnification factor. */
    public setZoom(zoom: number): void
    {
        if (zoom <= 0)
        {
            console.warn(LOG_PREFIX, "Zoom must be positive, ignoring:", zoom);
            return;
        }

        this.zoom = zoom;
        console.debug(LOG_PREFIX, "Zoom updated to:", zoom);
    }

    /** Update the lens diameter. */
    public setDiameter(diameter: number): void
    {
        if (diameter <= 0)
        {
            console.warn(LOG_PREFIX, "Diameter must be positive, ignoring:", diameter);
            return;
        }

        this.diameter = diameter;
        this.applyLensSize();
        this.applyCrosshairPosition();
        console.debug(LOG_PREFIX, "Diameter updated to:", diameter);
    }

    /** Remove the lens from the DOM and detach all listeners. */
    public destroy(): void
    {
        this.detachListeners();
        this.removeLensFromDom();
        this.nullifyReferences();
        console.log(LOG_PREFIX, "Destroyed");
    }

    // ====================================================================
    // PRIVATE: TARGET RESOLUTION
    // ====================================================================

    /** Resolve the target element from a string ID, HTMLElement, or default to body. */
    private resolveTarget(target?: HTMLElement | string): HTMLElement | null
    {
        if (!target)
        {
            return document.body;
        }

        if (typeof target === "string")
        {
            const el = document.getElementById(target);

            if (!el)
            {
                console.error(LOG_PREFIX, "Target element not found:", target);
                return null;
            }

            return el;
        }

        return target;
    }

    // ====================================================================
    // PRIVATE: LENS DOM CONSTRUCTION
    // ====================================================================

    /** Build the complete lens element with inner container and optional crosshair. */
    private buildLens(): HTMLElement
    {
        const lens = this.createLensContainer();

        this.innerEl = createElement("div", `${CLS}-inner`);
        lens.appendChild(this.innerEl);

        if (this.options.showCrosshair !== false)
        {
            this.crosshairEl = this.buildCrosshair();
            lens.appendChild(this.crosshairEl);
        }

        return lens;
    }

    /** Create the circular lens container with styling. */
    private createLensContainer(): HTMLElement
    {
        const lens = createElement("div", `${CLS}-lens`);
        const borderColor = this.options.borderColor ?? DEFAULT_BORDER_COLOR;
        const borderWidth = this.options.borderWidth ?? DEFAULT_BORDER_WIDTH;

        setAttr(lens, {
            "aria-hidden": "true",
            id: `${CLS}-lens-${instanceCounter}`
        });

        lens.style.display = "none";
        lens.style.width = `${this.diameter}px`;
        lens.style.height = `${this.diameter}px`;
        lens.style.border = `${borderWidth}px solid ${borderColor}`;

        return lens;
    }

    /** Build the crosshair overlay with horizontal and vertical lines. */
    private buildCrosshair(): HTMLElement
    {
        const wrapper = createElement("div", `${CLS}-crosshair`);
        const hLine = createElement("div", `${CLS}-crosshair-h`);
        const vLine = createElement("div", `${CLS}-crosshair-v`);

        wrapper.appendChild(hLine);
        wrapper.appendChild(vLine);

        return wrapper;
    }

    // ====================================================================
    // PRIVATE: LENS SIZING
    // ====================================================================

    /** Apply the current diameter to the lens element. */
    private applyLensSize(): void
    {
        if (!this.lensEl)
        {
            return;
        }

        this.lensEl.style.width = `${this.diameter}px`;
        this.lensEl.style.height = `${this.diameter}px`;
    }

    /** Update crosshair positioning after a diameter change. */
    private applyCrosshairPosition(): void
    {
        // Crosshair uses CSS percentage positioning so no manual update needed.
        // This method exists as a hook for future customisation.
    }

    // ====================================================================
    // PRIVATE: LENS VISIBILITY
    // ====================================================================

    /** Show the lens and clone the target content into it. */
    private showLens(): void
    {
        if (!this.lensEl || !this.targetEl || !this.innerEl)
        {
            return;
        }

        this.removeExistingClone();
        this.cloneEl = this.targetEl.cloneNode(true) as HTMLElement;
        this.applyCloneStyles();
        this.innerEl.appendChild(this.cloneEl);
        this.lensEl.style.display = "block";
    }

    /** Apply initial styles to the cloned element for proper scaling. */
    private applyCloneStyles(): void
    {
        if (!this.cloneEl || !this.targetEl)
        {
            return;
        }

        const targetRect = this.targetEl.getBoundingClientRect();

        this.cloneEl.style.position = "absolute";
        this.cloneEl.style.width = `${targetRect.width}px`;
        this.cloneEl.style.height = `${targetRect.height}px`;
        this.cloneEl.style.pointerEvents = "none";
        this.cloneEl.style.transformOrigin = "0 0";
    }

    /** Hide the lens and remove the clone. */
    private hideLens(): void
    {
        if (!this.lensEl)
        {
            return;
        }

        this.lensEl.style.display = "none";
        this.removeExistingClone();
    }

    /** Remove any existing clone from the inner container. */
    private removeExistingClone(): void
    {
        if (this.cloneEl && this.innerEl)
        {
            this.innerEl.removeChild(this.cloneEl);
            this.cloneEl = null;
        }
    }

    // ====================================================================
    // PRIVATE: MOUSE EVENT HANDLERS
    // ====================================================================

    /** Handle mouse entering the target — show the lens. */
    private handleMouseEnter(_e: MouseEvent): void
    {
        if (!this.enabled)
        {
            return;
        }

        this.showLens();
    }

    /** Handle mouse leaving the target — hide the lens. */
    private handleMouseLeave(): void
    {
        this.hideLens();
    }

    /** Handle mouse movement over the target — reposition lens and offset clone. */
    private handleMouseMove(e: MouseEvent): void
    {
        if (!this.enabled || !this.lensEl || !this.cloneEl || !this.targetEl)
        {
            return;
        }

        this.positionLensAtCursor(e);
        this.offsetCloneToCenter(e);
        this.options.onMove?.(e.clientX, e.clientY);
    }

    /** Position the lens element near the cursor with offset. */
    private positionLensAtCursor(e: MouseEvent): void
    {
        if (!this.lensEl)
        {
            return;
        }

        const offset = this.options.offset ?? DEFAULT_OFFSET;

        this.lensEl.style.left = `${e.clientX + offset.x}px`;
        this.lensEl.style.top = `${e.clientY + offset.y}px`;
    }

    /** Offset the clone so the area under the cursor appears centred in the lens. */
    private offsetCloneToCenter(e: MouseEvent): void
    {
        if (!this.cloneEl || !this.targetEl)
        {
            return;
        }

        const targetRect = this.targetEl.getBoundingClientRect();
        const mouseRelX = e.clientX - targetRect.left;
        const mouseRelY = e.clientY - targetRect.top;
        const radius = this.diameter / 2;

        this.cloneEl.style.transform = `scale(${this.zoom})`;
        this.cloneEl.style.left = `${-mouseRelX * this.zoom + radius}px`;
        this.cloneEl.style.top = `${-mouseRelY * this.zoom + radius}px`;
    }

    // ====================================================================
    // PRIVATE: LISTENER MANAGEMENT
    // ====================================================================

    /** Attach mouse event listeners to the target element. */
    private attachListeners(): void
    {
        if (!this.targetEl)
        {
            return;
        }

        this.targetEl.addEventListener("mousemove", this.boundMouseMove);
        this.targetEl.addEventListener("mouseenter", this.boundMouseEnter);
        this.targetEl.addEventListener("mouseleave", this.boundMouseLeave);
    }

    /** Detach mouse event listeners from the target element. */
    private detachListeners(): void
    {
        if (!this.targetEl)
        {
            return;
        }

        this.targetEl.removeEventListener("mousemove", this.boundMouseMove);
        this.targetEl.removeEventListener("mouseenter", this.boundMouseEnter);
        this.targetEl.removeEventListener("mouseleave", this.boundMouseLeave);
    }

    // ====================================================================
    // PRIVATE: CLEANUP
    // ====================================================================

    /** Remove the lens element from the DOM. */
    private removeLensFromDom(): void
    {
        if (this.lensEl && this.lensEl.parentNode)
        {
            this.lensEl.parentNode.removeChild(this.lensEl);
        }
    }

    /** Nullify all DOM references for garbage collection. */
    private nullifyReferences(): void
    {
        this.lensEl = null;
        this.innerEl = null;
        this.cloneEl = null;
        this.crosshairEl = null;
        this.targetEl = null;
    }
}

// ============================================================================
// S5: FACTORY + GLOBAL EXPORTS
// ============================================================================

// @entrypoint

/**
 * Create a Magnifier instance.
 *
 * @param containerId - Logical owner container ID (lens is appended to body)
 * @param options - Configuration options
 * @returns Magnifier instance
 */
export function createMagnifier(
    containerId: string,
    options: MagnifierOptions = {}): Magnifier
{
    return new Magnifier(containerId, options);
}

(window as unknown as Record<string, unknown>)["Magnifier"] = Magnifier;
(window as unknown as Record<string, unknown>)["createMagnifier"] = createMagnifier;
