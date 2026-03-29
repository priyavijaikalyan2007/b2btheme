/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: HelpTooltip
 * 📜 PURPOSE: Small ? icon that attaches to any element. Hover shows a
 *             plain-text tooltip; click opens the HelpDrawer with linked
 *             documentation. Multiple instances per page.
 * 🔗 RELATES: [[HelpDrawer]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [createHelpTooltip(target, opts)] -> [? icon]
 * 🔒 SECURITY: Tooltip text via textContent only. Never uses innerHTML.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[HelpTooltip]";
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

function logDebug(...args: unknown[]): void
{
    console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...args);
}

const HOVER_DELAY_MS = 400;
const ICON_SIZE_DEFAULT = 14;

let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** A documentation topic passed to HelpDrawer on click. */
export interface HelpTooltipTopic
{
    /** Unique topic identifier. */
    readonly id: string;
    /** Displayed in HelpDrawer header. */
    readonly title: string;
    /** Inline markdown content. */
    readonly markdown?: string;
    /** URL to fetch markdown from. */
    readonly url?: string;
}

/** Position of the ? icon relative to target element. */
export type HelpTooltipPosition =
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "inline-end";

/** Configuration for a HelpTooltip instance. */
export interface HelpTooltipOptions
{
    /** Plain text shown on hover (400ms delay). */
    readonly text?: string;
    /** Topic to open in HelpDrawer on click. */
    readonly topic?: HelpTooltipTopic;
    /** Position relative to target. Default: "top-right". */
    readonly position?: HelpTooltipPosition;
    /** Icon diameter in px. Default: 14. */
    readonly size?: number;
}

/** Public handle for controlling a HelpTooltip instance. */
export interface HelpTooltipHandle
{
    setText(text: string): void;
    setTopic(topic: HelpTooltipTopic): void;
    show(): void;
    hide(): void;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// HELP TOOLTIP CLASS
// ============================================================================

/**
 * Attaches a ? help icon to a target element.
 * Hover shows plain-text tooltip; click opens HelpDrawer via window bridge.
 */
class HelpTooltip
{
    private readonly id: string;
    private readonly target: HTMLElement;
    private readonly position: HelpTooltipPosition;
    private readonly size: number;

    private text: string;
    private topic: HelpTooltipTopic | null;
    private destroyed = false;

    private iconEl: HTMLElement;
    private tooltipEl: HTMLElement | null = null;
    private hoverTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(target: HTMLElement, options: HelpTooltipOptions)
    {
        instanceCounter++;
        this.id = `helptooltip-${instanceCounter}`;
        this.target = target;
        this.text = options.text ?? "";
        this.topic = options.topic ?? null;
        this.position = options.position ?? "top-right";
        this.size = options.size ?? ICON_SIZE_DEFAULT;

        this.ensureTargetPositioned();
        this.iconEl = this.buildIcon();
        this.target.appendChild(this.iconEl);

        logInfo("Created", this.id);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    setText(text: string): void
    {
        this.text = text;
    }

    setTopic(topic: HelpTooltipTopic): void
    {
        this.topic = topic;
    }

    show(): void
    {
        this.iconEl.style.display = "";
    }

    hide(): void
    {
        this.iconEl.style.display = "none";
        this.hideTooltip();
    }

    getElement(): HTMLElement
    {
        return this.iconEl;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        this.clearHoverTimer();
        this.hideTooltip();
        this.iconEl.parentNode?.removeChild(this.iconEl);
        logInfo("Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: BUILD
    // ====================================================================

    private ensureTargetPositioned(): void
    {
        const pos = getComputedStyle(this.target).position;
        if (pos === "static")
        {
            this.target.style.position = "relative";
        }
    }

    private buildIcon(): HTMLElement
    {
        const icon = createElement("button", "helptooltip-icon");
        icon.id = this.id;
        setAttr(icon, {
            type: "button",
            "aria-label": "Help",
            title: "",
            tabindex: "0"
        });

        icon.style.width = `${this.size}px`;
        icon.style.height = `${this.size}px`;
        icon.style.fontSize = `${Math.round(this.size * 0.65)}px`;
        icon.textContent = "?";

        this.applyPosition(icon);
        this.attachIconEvents(icon);

        return icon;
    }

    private applyPosition(icon: HTMLElement): void
    {
        icon.classList.add(`helptooltip-${this.position}`);
    }

    private attachIconEvents(icon: HTMLElement): void
    {
        icon.addEventListener("mouseenter", () => this.onMouseEnter());
        icon.addEventListener("mouseleave", () => this.onMouseLeave());
        icon.addEventListener("click", (e) => this.onIconClick(e));
        icon.addEventListener("keydown", (e) => this.onIconKeyDown(e));
    }

    // ====================================================================
    // PRIVATE: HOVER TOOLTIP
    // ====================================================================

    private onMouseEnter(): void
    {
        if (!this.text) { return; }

        this.clearHoverTimer();
        this.hoverTimer = setTimeout(() =>
        {
            this.showTooltip();
        }, HOVER_DELAY_MS);
    }

    private onMouseLeave(): void
    {
        this.clearHoverTimer();
        this.hideTooltip();
    }

    /** Creates and positions the hover tooltip popup element. */
    private showTooltip(): void
    {
        if (this.tooltipEl || !this.text) { return; }

        // SECURITY: textContent only — never innerHTML for user text
        this.tooltipEl = createElement("div", "helptooltip-popup");
        this.tooltipEl.textContent = this.text;
        document.body.appendChild(this.tooltipEl);

        this.positionTooltip();
    }

    private positionTooltip(): void
    {
        if (!this.tooltipEl) { return; }

        const iconRect = this.iconEl.getBoundingClientRect();
        const tipW = this.tooltipEl.offsetWidth;
        const tipH = this.tooltipEl.offsetHeight;

        let top = iconRect.bottom + 6;
        let left = iconRect.left + (iconRect.width / 2) - (tipW / 2);

        if ((top + tipH) > window.innerHeight)
        {
            top = iconRect.top - tipH - 6;
        }

        left = Math.max(4, Math.min(left, window.innerWidth - tipW - 4));
        top = Math.max(4, top);

        this.tooltipEl.style.top = `${top}px`;
        this.tooltipEl.style.left = `${left}px`;
    }

    private hideTooltip(): void
    {
        if (this.tooltipEl)
        {
            this.tooltipEl.parentNode?.removeChild(this.tooltipEl);
            this.tooltipEl = null;
        }
    }

    private clearHoverTimer(): void
    {
        if (this.hoverTimer !== null)
        {
            clearTimeout(this.hoverTimer);
            this.hoverTimer = null;
        }
    }

    // ====================================================================
    // PRIVATE: CLICK -> HELP DRAWER
    // ====================================================================

    private onIconClick(e: MouseEvent): void
    {
        e.preventDefault();
        e.stopPropagation();
        this.hideTooltip();
        this.openDrawer();
    }

    private onIconKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.hideTooltip();
            this.openDrawer();
        }
    }

    /**
     * Opens the HelpDrawer with the configured topic.
     * Lazy-creates the drawer if it does not exist yet.
     */
    // >> Delegates to: HelpDrawer (window.createHelpDrawer bridge)
    private openDrawer(): void
    {
        if (!this.topic)
        {
            logWarn("No topic configured");
            return;
        }

        const factory = (
            window as unknown as Record<string, unknown>
        )["createHelpDrawer"] as
            ((opts?: Record<string, unknown>) => {
                open: (t: HelpTooltipTopic) => void;
            }) | undefined;

        if (!factory)
        {
            logWarn("HelpDrawer not loaded");
            return;
        }

        const drawer = factory();
        drawer.open(this.topic);
        logDebug("Opened drawer for topic:", this.topic.id);
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

/**
 * Creates a HelpTooltip attached to the given target element.
 * Multiple instances per page are supported.
 */
export function createHelpTooltip(
    target: HTMLElement,
    options: HelpTooltipOptions
): HelpTooltipHandle
{
    if (!target)
    {
        logError("No target element provided");
        throw new Error(`${LOG_PREFIX} target is required`);
    }

    const inst = new HelpTooltip(target, options);

    return {
        setText: (t) => inst.setText(t),
        setTopic: (t) => inst.setTopic(t),
        show: () => inst.show(),
        hide: () => inst.hide(),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createHelpTooltip =
    createHelpTooltip;
