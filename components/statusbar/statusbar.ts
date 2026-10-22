/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: StatusBar
 * 📜 PURPOSE: A fixed-to-bottom viewport status bar with configurable
 *    label/value regions separated by pipe dividers. Text is natively
 *    selectable for Ctrl+C clipboard copying.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer App] -> [createStatusBar()] -> [DOM fixed bar]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Defines a single region within the status bar.
 * Each region can display an optional icon, label, and value.
 */
export interface StatusBarRegion
{
    /** Unique identifier for this region. */
    id: string;

    /** Optional label displayed before the value in semi-bold. */
    label?: string;

    /** The value text. */
    value?: string;

    /** Optional Bootstrap Icons class (e.g., "bi-circle-fill"). */
    icon?: string;

    /** Optional minimum width (CSS value, e.g., "100px"). */
    minWidth?: string;
}

/**
 * Configuration options for the StatusBar component.
 */
export interface StatusBarOptions
{
    /** The regions to display, in order. */
    regions: StatusBarRegion[];

    /** Height variant. Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Background colour (CSS value). Overrides default $gray-800. */
    backgroundColor?: string;

    /** Text colour (CSS value). Overrides default $gray-300. */
    textColor?: string;

    /** Label colour (CSS value). Overrides default $gray-400. */
    labelColor?: string;

    /** Font size (CSS value). Overrides the size-based default. */
    fontSize?: string;

    /** CSS z-index. Default: 1040. */
    zIndex?: number;

    /** Additional CSS class(es) to add to the root element. */
    cssClass?: string;

    /** Show pipe dividers between regions. Default: true. */
    showDividers?: boolean;

    /** Divider character. Default: "|". */
    dividerChar?: string;

    /** Contained mode: relative positioning for embedding within a parent container. */
    contained?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[StatusBar]";

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

// LOG-4a DECLARES THE SHIM PREAMBLE IN EVERY COMPONENT, whether it calls
// every level or not, so a developer adding a log line never has to wire
// one up. `noUnusedLocals` is on (UNUSED-1), and this reference is what
// says that uniformity is deliberate rather than an oversight. Deleting a
// shim to silence the compiler is the wrong repair: `dynamicVerboseShims`
// holds the logDebug and logTrace population as a floor, and the preamble
// is the contract FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug];

/** Height in pixels for each size variant */
const SIZE_HEIGHT_MAP: Record<string, number> =
{
    sm: 24,
    md: 28,
    lg: 34,
};

let instanceCounter = 0;

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

/**
 * Creates an HTML element with optional CSS classes and text content.
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
 * Sets an attribute on an HTML element.
 *
 * @param el - Target element
 * @param name - Attribute name
 * @param value - Attribute value
 */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * StatusBar renders a fixed-bottom viewport bar with configurable label/value
 * regions. Text is natively selectable so Ctrl+C captures all content
 * including pipe dividers.
 *
 * @example
 * const bar = new StatusBar({
 *     regions: [
 *         { id: "status", icon: "bi-circle-fill", value: "Connected" },
 *         { id: "env", label: "Environment:", value: "Production" },
 *         { id: "user", label: "User:", value: "jsmith" }
 *     ]
 * });
 * bar.show();
 * bar.setValue("user", "adoe");
 */
/**
 * The StatusBar surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface StatusBarHandle
{
    show(container?: HTMLElement): void;
    hide(): void;
    destroy(): void;
    setValue(regionId: string, value: string): void;
    getValue(regionId: string): string;
    setIcon(regionId: string, iconClass: string): void;
    getAllText(): string;
    addRegion(region: StatusBarRegion, index?: number): void;
    removeRegion(regionId: string): void;
    isVisible(): boolean;
    getElement(): HTMLElement | null;
    setContained(value: boolean): void;
    isContained(): boolean;
}

export class StatusBar implements StatusBarHandle
{
    private readonly instanceId: string;
    private readonly options: StatusBarOptions;

    // State
    private visible = false;
    private contained = false;

    // DOM references
    private barEl: HTMLElement | null = null;

    // O(1) region lookups: regionId -> region container element
    private regionMap: Map<string, HTMLElement> = new Map();

    // O(1) value element lookups: regionId -> value span
    private valueMap: Map<string, HTMLElement> = new Map();

    // O(1) icon element lookups: regionId -> icon element
    private iconMap: Map<string, HTMLElement> = new Map();

    // Ordered list of region IDs for getAllText and insertion
    private regionOrder: string[] = [];

    constructor(options: StatusBarOptions)
    {
        instanceCounter += 1;
        this.instanceId = `statusbar-${instanceCounter}`;

        this.options = {
            size: "md",
            zIndex: 1040,
            showDividers: true,
            dividerChar: "|",
            ...options,
        };

        this.contained = !!options.contained;

        this.buildDOM();

        logInfo("Initialised:", this.instanceId);
        logDebug("Options:", this.options);
    }

    // ========================================================================
    // PUBLIC — LIFECYCLE
    // ========================================================================

    /**
     * Appends the status bar to the given container (or document.body)
     * and sets the --statusbar-height CSS custom property on <html>.
     *
     * @param container - Optional parent element; defaults to document.body
     */
    public show(container?: HTMLElement): void
    {
        if (this.visible)
        {
            logWarn("Already visible.");
            return;
        }

        if (!this.barEl)
        {
            logError("DOM not built; cannot show.");
            return;
        }

        const parent = container || document.body;
        parent.appendChild(this.barEl);
        this.visible = true;

        this.setCssCustomProperty();

        logDebug("Shown:", this.instanceId);
    }

    /**
     * Removes the status bar from the DOM and clears
     * the --statusbar-height CSS custom property.
     */
    public hide(): void
    {
        if (!this.visible)
        {
            return;
        }

        this.barEl?.remove();
        this.visible = false;

        this.clearCssCustomProperty();

        logDebug("Hidden:", this.instanceId);
    }

    /**
     * Hides the bar and releases all internal references.
     */
    public destroy(): void
    {
        this.hide();

        this.barEl = null;
        this.regionMap.clear();
        this.valueMap.clear();
        this.iconMap.clear();
        this.regionOrder = [];

        logDebug("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC — CONTENT
    // ========================================================================

    /**
     * Updates the value text of a region by ID.
     *
     * @param regionId - The region identifier
     * @param value - New value text
     */
    public setValue(regionId: string, value: string): void
    {
        const valueEl = this.valueMap.get(regionId);

        if (!valueEl)
        {
            logWarn("Region not found:", regionId);
            return;
        }

        valueEl.textContent = value;
    }

    /**
     * Returns the current value text of a region.
     *
     * @param regionId - The region identifier
     * @returns The value text, or empty string if not found
     */
    public getValue(regionId: string): string
    {
        const valueEl = this.valueMap.get(regionId);

        if (!valueEl)
        {
            logWarn("Region not found:", regionId);
            return "";
        }

        return valueEl.textContent || "";
    }

    /**
     * Updates the Bootstrap Icons class on a region's icon element.
     *
     * @param regionId - The region identifier
     * @param iconClass - Bootstrap Icons class (e.g., "bi-circle-fill")
     */
    public setIcon(regionId: string, iconClass: string): void
    {
        const iconEl = this.iconMap.get(regionId);

        if (!iconEl)
        {
            logWarn("Icon element not found for region:",
                regionId
            );
            return;
        }

        // Clear existing icon classes (keep "bi" and "statusbar-icon")
        const keepClasses = ["bi", "statusbar-icon"];
        const toRemove: string[] = [];

        iconEl.classList.forEach((cls) =>
        {
            if (!keepClasses.includes(cls))
            {
                toRemove.push(cls);
            }
        });

        toRemove.forEach((cls) => iconEl.classList.remove(cls));
        iconEl.classList.add(iconClass);
    }

    /**
     * Returns a plain-text representation of the full status bar
     * including divider characters.
     */
    public getAllText(): string
    {
        const parts: string[] = [];
        const divider = this.options.dividerChar || "|";

        for (const regionId of this.regionOrder)
        {
            const regionEl = this.regionMap.get(regionId);

            if (!regionEl)
            {
                continue;
            }

            parts.push(regionEl.textContent?.trim() || "");
        }

        if (this.options.showDividers)
        {
            return parts.join(` ${divider} `);
        }

        return parts.join("  ");
    }

    // ========================================================================
    // PUBLIC — DYNAMIC REGIONS
    // ========================================================================

    /**
     * Adds a new region to the status bar.
     *
     * @param region - The region definition
     * @param index - Insert position (appends to end if omitted)
     */
    public addRegion(region: StatusBarRegion, index?: number): void
    {
        if (this.regionMap.has(region.id))
        {
            logWarn("Region already exists:", region.id);
            return;
        }

        if (!this.barEl)
        {
            logError("DOM not built; cannot add region.");
            return;
        }

        const regionEl = this.buildRegion(region);
        const insertIdx = (index !== undefined)
            ? Math.min(index, this.regionOrder.length)
            : this.regionOrder.length;

        this.insertRegionAtIndex(regionEl, region.id, insertIdx);

        logDebug("Region added:", region.id, "at index", insertIdx);
    }

    /**
     * Removes a region from the status bar by ID.
     *
     * @param regionId - The region identifier to remove
     */
    public removeRegion(regionId: string): void
    {
        const regionEl = this.regionMap.get(regionId);

        if (!regionEl)
        {
            logWarn("Region not found for removal:", regionId);
            return;
        }

        this.removeRegionAndDivider(regionEl, regionId);
        this.regionMap.delete(regionId);
        this.valueMap.delete(regionId);
        this.iconMap.delete(regionId);

        const idx = this.regionOrder.indexOf(regionId);

        if (idx >= 0)
        {
            this.regionOrder.splice(idx, 1);
        }

        logDebug("Region removed:", regionId);
    }

    /**
     * Returns whether the status bar is currently visible.
     */
    public isVisible(): boolean
    {
        return this.visible;
    }

    /** Returns the root DOM element, or null if not yet built. */
    public getElement(): HTMLElement | null
    {
        return this.barEl;
    }

    /**
     * Enables or disables contained mode. In contained mode the bar uses
     * relative positioning so it flows within a parent container instead
     * of being fixed to the viewport bottom.
     *
     * @param value - true to enable contained mode, false to disable
     */
    public setContained(value: boolean): void
    {
        this.contained = value;

        if (this.barEl)
        {
            if (value)
            {
                this.barEl.classList.add("statusbar-contained");
            }
            else
            {
                this.barEl.classList.remove("statusbar-contained");
            }
        }

        logDebug("Contained:", value);
    }

    /**
     * Returns whether the status bar is in contained mode.
     */
    public isContained(): boolean
    {
        return this.contained;
    }

    // ========================================================================
    // PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete status bar DOM tree from the configured regions.
     */
    private buildDOM(): void
    {
        this.barEl = this.buildBar();

        for (let i = 0; i < this.options.regions.length; i++)
        {
            const region = this.options.regions[i];

            // Insert divider before each region except the first
            if (i > 0 && this.options.showDividers)
            {
                this.barEl.appendChild(this.buildDivider());
            }

            const regionEl = this.buildRegion(region);
            this.barEl.appendChild(regionEl);
            this.regionOrder.push(region.id);
        }
    }

    /**
     * Builds the root bar element with size class, ARIA attributes,
     * and optional style overrides.
     */
    private buildBar(): HTMLElement
    {
        const size = this.options.size || "md";
        const bar = createElement("div", ["statusbar", `statusbar-${size}`]);

        setAttr(bar, "id", this.instanceId);
        setAttr(bar, "role", "status");
        setAttr(bar, "aria-live", "polite");

        if (this.contained)
        {
            bar.classList.add("statusbar-contained");
        }

        if (this.options.cssClass)
        {
            bar.classList.add(...this.options.cssClass.split(" "));
        }

        this.applyStyleOverrides(bar);

        return bar;
    }

    /**
     * Applies optional colour, font, and z-index overrides from options.
     */
    private applyStyleOverrides(bar: HTMLElement): void
    {
        if (this.options.backgroundColor)
        {
            bar.style.backgroundColor = this.options.backgroundColor;
        }

        if (this.options.textColor)
        {
            bar.style.color = this.options.textColor;
        }

        if (this.options.fontSize)
        {
            bar.style.fontSize = this.options.fontSize;
        }

        if (this.options.zIndex !== undefined)
        {
            bar.style.zIndex = String(this.options.zIndex);
        }
    }

    /**
     * Builds a single region element with icon, label, and value spans.
     */
    private buildRegion(region: StatusBarRegion): HTMLElement
    {
        const regionEl = createElement("span", ["statusbar-region"]);
        setAttr(regionEl, "data-region-id", region.id);

        if (region.minWidth)
        {
            regionEl.style.minWidth = region.minWidth;
        }

        // Icon
        if (region.icon)
        {
            const iconEl = createElement(
                "i", ["bi", region.icon, "statusbar-icon"]
            );
            regionEl.appendChild(iconEl);
            this.iconMap.set(region.id, iconEl);
        }

        // Label
        if (region.label)
        {
            const labelEl = createElement(
                "span", ["statusbar-label"], region.label
            );

            if (this.options.labelColor)
            {
                labelEl.style.color = this.options.labelColor;
            }

            regionEl.appendChild(labelEl);
        }

        // Value
        const valueEl = createElement(
            "span", ["statusbar-value"], region.value || ""
        );
        regionEl.appendChild(valueEl);

        // Register in lookup maps
        this.regionMap.set(region.id, regionEl);
        this.valueMap.set(region.id, valueEl);

        return regionEl;
    }

    /**
     * Builds a divider element with the configured character.
     */
    private buildDivider(): HTMLElement
    {
        return createElement(
            "span",
            ["statusbar-divider"],
            this.options.dividerChar || "|"
        );
    }

    // ========================================================================
    // PRIVATE — DYNAMIC REGION INSERTION / REMOVAL
    // ========================================================================

    /**
     * Inserts a region element at a specific index within the bar,
     * adding dividers as needed.
     */
    private insertRegionAtIndex(
        regionEl: HTMLElement,
        regionId: string,
        index: number
    ): void
    {
        if (!this.barEl)
        {
            return;
        }

        // Append at end
        if (index >= this.regionOrder.length)
        {
            if (this.regionOrder.length > 0 && this.options.showDividers)
            {
                this.barEl.appendChild(this.buildDivider());
            }

            this.barEl.appendChild(regionEl);
            this.regionOrder.push(regionId);
            return;
        }

        // Insert before existing region at index
        const existingId = this.regionOrder[index];
        const existingEl = this.regionMap.get(existingId);

        if (!existingEl)
        {
            this.barEl.appendChild(regionEl);
            this.regionOrder.push(regionId);
            return;
        }

        if (this.options.showDividers)
        {
            const divider = this.buildDivider();
            this.barEl.insertBefore(regionEl, existingEl);
            this.barEl.insertBefore(divider, existingEl);
        }
        else
        {
            this.barEl.insertBefore(regionEl, existingEl);
        }

        this.regionOrder.splice(index, 0, regionId);
    }

    /**
     * Removes a region element and its adjacent divider from the DOM.
     */
    private removeRegionAndDivider(
        regionEl: HTMLElement,
        regionId: string
    ): void
    {
        const idx = this.regionOrder.indexOf(regionId);

        // Remove adjacent divider (prefer the one before, else after)
        if (this.options.showDividers && this.barEl)
        {
            if (idx > 0 && regionEl.previousElementSibling)
            {
                const prev = regionEl.previousElementSibling;

                if (prev.classList.contains("statusbar-divider"))
                {
                    prev.remove();
                }
            }
            else if (regionEl.nextElementSibling)
            {
                const next = regionEl.nextElementSibling;

                if (next.classList.contains("statusbar-divider"))
                {
                    next.remove();
                }
            }
        }

        regionEl.remove();
    }

    // ========================================================================
    // PRIVATE — CSS CUSTOM PROPERTY
    // ========================================================================

    /**
     * Sets --statusbar-height on <html> so other components can offset
     * with bottom: var(--statusbar-height, 0px).
     */
    private setCssCustomProperty(): void
    {
        const size = this.options.size || "md";
        const height = SIZE_HEIGHT_MAP[size] || SIZE_HEIGHT_MAP["md"];

        document.documentElement.style.setProperty(
            "--statusbar-height", `${height}px`
        );
    }

    /**
     * Removes the --statusbar-height CSS custom property from <html>.
     */
    private clearCssCustomProperty(): void
    {
        document.documentElement.style.removeProperty("--statusbar-height");
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates and shows a status bar in a single call.
 * Returns the instance for further updates.
 *
 * @param options - StatusBar configuration
 * @returns The created StatusBar instance
 */
export function createStatusBar(
    options: StatusBarOptions
): StatusBarHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.regions === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.regions is required. `
            + "Pass it when creating the StatusBar.");
    }

    const bar = new StatusBar(options);
    bar.show();
    return bar;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    window["createStatusBar"] = createStatusBar;
}
