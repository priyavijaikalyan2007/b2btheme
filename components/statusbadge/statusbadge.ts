/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: StatusBadge
 * PURPOSE: Color-coded pills/dots communicating process or system state
 *    (Operational, Degraded, Down, In Progress, Failed, Maintenance, Unknown)
 *    with animated live pulse for active states and click-for-detail support.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * FLOW: [Consumer] -> [createStatusBadge()] -> [DOM badge element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the StatusBadge component.
 * Controls status type, visual variant, sizing, pulse animation,
 * and click behaviour.
 */
export interface StatusBadgeOptions
{
    /** The status state to display. Use "custom" with customColor for bespoke states. */
    status: "operational" | "degraded" | "down" | "in-progress"
        | "failed" | "maintenance" | "unknown" | "custom";

    /** Visual variant. Default: "indicator" (dot + label). */
    variant?: "dot" | "pill" | "indicator";

    /** Override the auto-generated label text. */
    label?: string;

    /** Background colour for status="custom". CSS colour value. */
    customColor?: string;

    /** Enable/disable pulse animation. Default: auto (true for operational/in-progress). */
    pulse?: boolean;

    /** Whether the badge responds to click events. Default: false. */
    clickable?: boolean;

    /** Callback invoked on click when clickable is true. */
    onClick?: () => void;

    /** Tooltip text shown on hover via the title attribute. */
    tooltip?: string;

    /** Size variant controlling dot and font dimensions. Default: "md". */
    size?: "xs" | "sm" | "md" | "lg";

    /** Additional CSS class(es) to add to the root element. */
    cssClass?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[StatusBadge]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

/** Maps each status to its CSS modifier class */
const STATUS_COLORS: Record<string, string> =
{
    operational: "statusbadge-operational",
    degraded: "statusbadge-degraded",
    down: "statusbadge-down",
    "in-progress": "statusbadge-in-progress",
    failed: "statusbadge-failed",
    maintenance: "statusbadge-maintenance",
    unknown: "statusbadge-unknown",
};

/** Maps each status to its default human-readable label */
const STATUS_LABELS: Record<string, string> =
{
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    "in-progress": "In Progress",
    failed: "Failed",
    maintenance: "Maintenance",
    unknown: "Unknown",
};

/** Statuses that pulse by default when pulse option is not specified */
const PULSE_STATUSES = new Set(["operational", "in-progress"]);

let instanceCounter = 0;

// ============================================================================
// PRIVATE HELPERS -- DOM
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
 * StatusBadge renders a colour-coded status indicator with optional dot,
 * label, pulse animation, and click-for-detail support.
 *
 * Supports seven built-in statuses plus a custom mode. Three visual
 * variants (dot, pill, indicator) and four sizes (xs, sm, md, lg).
 *
 * @example
 * const badge = new StatusBadge({
 *     status: "operational",
 *     variant: "indicator",
 *     clickable: true,
 *     onClick: () => console.log("Clicked!")
 * });
 * badge.show("my-container");
 */
export class StatusBadge
{
    private readonly instanceId: string;
    private readonly options: StatusBadgeOptions;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private dotEl: HTMLElement | null = null;
    private labelEl: HTMLElement | null = null;

    // Bound event handler for cleanup
    private boundClickHandler: (() => void) | null = null;

    constructor(options: StatusBadgeOptions)
    {
        instanceCounter += 1;
        this.instanceId = `statusbadge-${instanceCounter}`;

        this.options = {
            variant: "indicator",
            size: "md",
            clickable: false,
            ...options,
        };

        this.buildRoot();

        logInfo("Initialised:", this.instanceId);
        logDebug("Options:", this.options);
    }

    // ========================================================================
    // PUBLIC -- LIFECYCLE
    // ========================================================================

    /**
     * Appends the badge to the specified container element.
     *
     * @param containerId - The DOM id of the target container
     */
    public show(containerId: string): void
    {
        if (!this.rootEl)
        {
            logError("DOM not built; cannot show.");
            return;
        }

        const container = document.getElementById(containerId);

        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }

        container.appendChild(this.rootEl);

        logDebug("Shown in:", containerId);
    }

    /**
     * Removes the badge from the DOM without destroying internal state.
     */
    public hide(): void
    {
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.remove();
            logDebug("Hidden:", this.instanceId);
        }
    }

    /**
     * Removes the badge from the DOM and releases all internal references
     * and event listeners.
     */
    public destroy(): void
    {
        this.removeClickListener();
        this.hide();

        this.rootEl = null;
        this.dotEl = null;
        this.labelEl = null;

        logDebug("Destroyed:", this.instanceId);
    }

    /**
     * Returns the root DOM element, or null if destroyed.
     */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // PUBLIC -- MUTATORS
    // ========================================================================

    /**
     * Updates the displayed status, adjusting CSS classes, dot colour,
     * label text, and pulse animation accordingly.
     *
     * @param status - The new status value
     */
    public setStatus(
        status: StatusBadgeOptions["status"]
    ): void
    {
        this.options.status = status;

        this.applyStatusClasses();
        this.updateDotColor();
        this.updateLabelText();
        this.setPulse(this.shouldPulse());

        logDebug("Status changed to:", status);
    }

    /**
     * Updates the label text displayed beside the dot.
     *
     * @param label - The new label text
     */
    public setLabel(label: string): void
    {
        this.options.label = label;

        if (this.labelEl)
        {
            this.labelEl.textContent = label;
        }

        this.updateAriaLabel();

        logDebug("Label changed to:", label);
    }

    /**
     * Enables or disables the pulse animation on the dot element.
     *
     * @param enabled - True to enable pulse, false to disable
     */
    public setPulse(enabled: boolean): void
    {
        if (!this.dotEl)
        {
            return;
        }

        if (enabled)
        {
            this.dotEl.classList.add("statusbadge-pulse");
        }
        else
        {
            this.dotEl.classList.remove("statusbadge-pulse");
        }
    }

    // ========================================================================
    // PRIVATE -- DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete badge DOM tree: root container, dot, and label
     * elements according to the selected variant.
     */
    private buildRoot(): void
    {
        const size = this.options.size || "md";
        const variant = this.options.variant || "indicator";

        this.rootEl = createElement("div", [
            "statusbadge",
            `statusbadge-${size}`,
        ]);

        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "status");

        this.applyStatusClasses();
        this.applyVariantClass(variant);
        this.applyOptionalClasses();
        this.appendVariantChildren(variant);
        this.applyClickBehaviour();
        this.applyTooltip();
        this.updateAriaLabel();
    }

    /**
     * Creates the coloured dot span element with optional pulse animation.
     */
    private buildDot(): HTMLElement
    {
        const dotClasses = ["statusbadge-dot"];

        if (this.shouldPulse())
        {
            dotClasses.push("statusbadge-pulse");
        }

        const dot = createElement("span", dotClasses);

        this.applyCustomDotColor(dot);

        return dot;
    }

    /**
     * Creates the label span element with the resolved label text.
     */
    private buildLabel(): HTMLElement
    {
        const text = this.resolveLabel();
        return createElement("span", ["statusbadge-label"], text);
    }

    // ========================================================================
    // PRIVATE -- STATUS AND VARIANT HELPERS
    // ========================================================================

    /**
     * Returns the label text from options or from the STATUS_LABELS map.
     * Falls back to the raw status string for custom statuses.
     */
    private resolveLabel(): string
    {
        if (this.options.label)
        {
            return this.options.label;
        }

        return STATUS_LABELS[this.options.status] || this.options.status;
    }

    /**
     * Determines whether the dot should pulse based on the pulse option
     * or auto-detection from PULSE_STATUSES.
     */
    private shouldPulse(): boolean
    {
        if (this.options.pulse !== undefined)
        {
            return this.options.pulse;
        }

        return PULSE_STATUSES.has(this.options.status);
    }

    /**
     * Adds the status-specific CSS modifier class to the root element,
     * removing any previously applied status class.
     */
    private applyStatusClasses(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        // Remove all existing status classes
        for (const cls of Object.values(STATUS_COLORS))
        {
            this.rootEl.classList.remove(cls);
        }

        const statusClass = STATUS_COLORS[this.options.status];

        if (statusClass)
        {
            this.rootEl.classList.add(statusClass);
        }
    }

    /**
     * Adds the variant CSS class (dot, pill, indicator) to the root element.
     */
    private applyVariantClass(variant: string): void
    {
        if (this.rootEl)
        {
            this.rootEl.classList.add(`statusbadge-${variant}`);
        }
    }

    /**
     * Applies optional CSS classes and clickable class to the root element.
     */
    private applyOptionalClasses(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.options.cssClass)
        {
            const parts = this.options.cssClass.split(" ");
            this.rootEl.classList.add(...parts);
        }

        if (this.options.clickable)
        {
            this.rootEl.classList.add("statusbadge-clickable");
        }
    }

    /**
     * Appends the appropriate child elements (dot, label, or both)
     * based on the selected variant.
     */
    private appendVariantChildren(variant: string): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (variant === "dot" || variant === "indicator")
        {
            this.dotEl = this.buildDot();
            this.rootEl.appendChild(this.dotEl);
        }

        if (variant === "pill" || variant === "indicator")
        {
            this.labelEl = this.buildLabel();
            this.rootEl.appendChild(this.labelEl);
        }
    }

    /**
     * Applies the custom background colour to the dot element when
     * status is "custom" and customColor is provided.
     */
    private applyCustomDotColor(dot: HTMLElement): void
    {
        if (this.options.status === "custom" && this.options.customColor)
        {
            dot.style.backgroundColor = this.options.customColor;
        }
    }

    // ========================================================================
    // PRIVATE -- CLICK HANDLING
    // ========================================================================

    /**
     * Attaches click and keyboard event listeners when the badge is clickable.
     * Sets tabindex and button role for keyboard accessibility.
     */
    private applyClickBehaviour(): void
    {
        if (!this.options.clickable || !this.rootEl)
        {
            return;
        }

        setAttr(this.rootEl, "tabindex", "0");
        setAttr(this.rootEl, "role", "button");

        this.boundClickHandler = () => this.handleClick();
        this.rootEl.addEventListener("click", this.boundClickHandler);
        this.rootEl.addEventListener("keydown", (e: Event) =>
        {
            this.handleKeydown(e as KeyboardEvent);
        });
    }

    /**
     * Removes the click event listener from the root element.
     */
    private removeClickListener(): void
    {
        if (this.rootEl && this.boundClickHandler)
        {
            this.rootEl.removeEventListener("click", this.boundClickHandler);
            this.boundClickHandler = null;
        }
    }

    /**
     * Invokes the onClick callback safely within a try-catch.
     */
    private handleClick(): void
    {
        if (!this.options.onClick)
        {
            return;
        }

        try
        {
            this.options.onClick();
        }
        catch (err)
        {
            logError("onClick callback error:", err);
        }
    }

    /**
     * Handles keydown events to trigger click on Enter or Space,
     * following standard button keyboard semantics.
     */
    private handleKeydown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.handleClick();
        }
    }

    // ========================================================================
    // PRIVATE -- UPDATE HELPERS
    // ========================================================================

    /**
     * Updates the dot element background colour after a status change.
     * For custom status, applies the customColor; otherwise clears
     * inline styles so the CSS class takes effect.
     */
    private updateDotColor(): void
    {
        if (!this.dotEl)
        {
            return;
        }

        if (this.options.status === "custom" && this.options.customColor)
        {
            this.dotEl.style.backgroundColor = this.options.customColor;
        }
        else
        {
            this.dotEl.style.backgroundColor = "";
        }
    }

    /**
     * Updates the label element text content after a status change.
     */
    private updateLabelText(): void
    {
        if (this.labelEl)
        {
            this.labelEl.textContent = this.resolveLabel();
        }
    }

    /**
     * Sets the tooltip title attribute on the root element.
     */
    private applyTooltip(): void
    {
        if (this.rootEl && this.options.tooltip)
        {
            setAttr(this.rootEl, "title", this.options.tooltip);
        }
    }

    /**
     * Updates the aria-label attribute to reflect the current
     * human-readable status label.
     */
    private updateAriaLabel(): void
    {
        if (this.rootEl)
        {
            const label = this.resolveLabel();
            setAttr(this.rootEl, "aria-label", `Status: ${label}`);
        }
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a StatusBadge and appends it to the specified container
 * in a single call.
 *
 * @param containerId - The DOM id of the target container
 * @param options - StatusBadge configuration
 * @returns The created StatusBadge instance
 */
export function createStatusBadge(
    containerId: string,
    options: StatusBadgeOptions
): StatusBadge
{
    const badge = new StatusBadge(options);
    badge.show(containerId);
    return badge;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["StatusBadge"] = StatusBadge;
(window as unknown as Record<string, unknown>)["createStatusBadge"] = createStatusBadge;
