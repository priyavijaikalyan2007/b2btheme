/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarketingHero
 * 📜 PURPOSE: Public-page introduction area — eyebrow, heading, lede, up to two
 *             actions, and an optional media slot, in stacked, centered, or
 *             split layouts.
 * 🔗 RELATES: [[EnterpriseTheme]], [[SiteFooter]], [[AuthCard]]
 * ⚡ FLOW: [Static page] -> [marketinghero.css] -> [Rendered hero]
 *         [Consumer App] -> [createMarketingHero()] -> [Rendered hero]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[MarketingHero]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** Breakpoint below which a split hero stacks, when the caller says nothing. */
const DEFAULT_STACK_BELOW = "lg";

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** One call to action. `href` renders an anchor; otherwise a button. */
export interface MarketingHeroAction
{
    /** Visible label. Rendered as text. */
    text: string;
    /** Destination. Present means the action navigates. */
    href?: string;
    /** Click handler. Used alone for in-page actions. */
    onClick?: () => void;
}

/** Configuration options for the MarketingHero component. */
export interface MarketingHeroOptions
{
    /** Heading text. Required. */
    title: string;
    /** Small label shown above the heading. */
    eyebrow?: string;
    /** Supporting paragraph below the heading. */
    lede?: string;
    /** Layout variant. Default: "stacked". */
    layout?: "stacked" | "centered" | "split";
    /** Breakpoint below which a split hero stacks. Default: "lg". */
    stackBelow?: "sm" | "md" | "lg" | "xl";
    /** Primary call to action. */
    primaryAction?: MarketingHeroAction;
    /** Secondary call to action. */
    secondaryAction?: MarketingHeroAction;
    /** Media, illustration, or callout. Appended as a node, never parsed. */
    aside?: HTMLElement;
    /** Additional CSS class(es) on the root. */
    cssClass?: string;
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

// ============================================================================
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: MarketingHero
 *
 * The introduction area for a public page.
 *
 * The stylesheet is the contract: this factory renders exactly the markup the
 * README documents, so a static page can hand-author the same HTML and load no
 * script at all. `marketinghero.test.ts` asserts that equality.
 *
 * @example
 * var hero = createMarketingHero("hero-host", {
 *     eyebrow: "New",
 *     title: "Ship enterprise UI faster",
 *     lede: "A compact Bootstrap 5 theme and component library.",
 *     layout: "split",
 *     primaryAction: { text: "Get started", href: "/signup" }
 * });
 */
export class MarketingHero
{
    private readonly instanceId!: string;
    private readonly options!: MarketingHeroOptions;

    private rootEl: HTMLElement | null = null;
    private destroyed = false;
    private readonly boundHandlers: Array<[HTMLElement, () => void]> = [];

    constructor(options: MarketingHeroOptions)
    {
        if (!options.title)
        {
            logError("title is required");
            return;
        }

        instanceCounter++;
        this.instanceId = `marketinghero-${instanceCounter}`;
        this.options = options;
        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to the container element, or to body when no id is given. */
    show(containerId?: string): void
    {
        if (this.destroyed || !this.rootEl) { return; }

        const container = containerId
            ? document.getElementById(containerId)
            : document.body;

        if (!container)
        {
            logWarn("Container not found:", containerId);
            return;
        }

        container.appendChild(this.rootEl);
    }

    /** Remove from the DOM but keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /** Tear down listeners and DOM. Idempotent. */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        for (const [el, handler] of this.boundHandlers)
        {
            el.removeEventListener("click", handler);
        }
        this.boundHandlers.length = 0;

        this.hide();
        this.rootEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    /** Return the root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const root = createElement("section", this.buildRootClasses());
        root.id = this.instanceId;

        root.appendChild(this.buildContent());

        if (this.options.aside)
        {
            const aside = createElement("aside", "marketinghero-aside");
            aside.appendChild(this.options.aside);
            root.appendChild(aside);
        }

        root.setAttribute("aria-labelledby", `${this.instanceId}-title`);
        return root;
    }

    /** Build the root class string from the layout options. */
    private buildRootClasses(): string
    {
        const parts = ["marketinghero"];
        const layout = this.options.layout ?? "stacked";

        if (layout === "centered")
        {
            parts.push("marketinghero-centered");
        }

        if (layout === "split")
        {
            const stackBelow = this.options.stackBelow ?? DEFAULT_STACK_BELOW;
            parts.push("marketinghero-split", `marketinghero-stack-${stackBelow}`);
        }

        if (this.options.cssClass)
        {
            parts.push(this.options.cssClass);
        }

        return parts.join(" ");
    }

    /**
     * Build the text column.
     *
     * The title is appended BEFORE the eyebrow deliberately. The eyebrow is
     * lifted above it with `order: -1` in the stylesheet, which keeps the
     * heading first in document order without nesting the eyebrow inside it
     * and polluting the heading's accessible name. Nothing here is focusable,
     * so displaced visual order carries no keyboard hazard. See ADR-146, D4.
     */
    private buildContent(): HTMLElement
    {
        const content = createElement("div", "marketinghero-content");

        const title = createElement("h1", "marketinghero-title");
        title.id = `${this.instanceId}-title`;
        title.textContent = this.options.title;
        content.appendChild(title);

        if (this.options.eyebrow)
        {
            const eyebrow = createElement("p", "marketinghero-eyebrow");
            eyebrow.textContent = this.options.eyebrow;
            content.appendChild(eyebrow);
        }

        if (this.options.lede)
        {
            const lede = createElement("p", "marketinghero-lede");
            lede.textContent = this.options.lede;
            content.appendChild(lede);
        }

        this.appendActions(content);
        return content;
    }

    /** Append the actions row, when there is at least one action. */
    private appendActions(content: HTMLElement): void
    {
        const { primaryAction, secondaryAction } = this.options;
        if (!primaryAction && !secondaryAction) { return; }

        const actions = createElement("div", "marketinghero-actions");

        if (primaryAction)
        {
            actions.appendChild(this.buildAction(primaryAction, "btn-primary"));
        }

        if (secondaryAction)
        {
            actions.appendChild(
                this.buildAction(secondaryAction, "btn-outline-secondary"));
        }

        content.appendChild(actions);
    }

    /** Build one action. An href renders an anchor; otherwise a button. */
    private buildAction(action: MarketingHeroAction, variant: string): HTMLElement
    {
        const tag = action.href ? "a" : "button";
        const el = createElement(tag, `btn ${variant}`);
        el.textContent = action.text;

        if (action.href)
        {
            el.setAttribute("href", action.href);
        }
        else
        {
            el.setAttribute("type", "button");
        }

        if (action.onClick)
        {
            const handler = action.onClick;
            el.addEventListener("click", handler);
            this.boundHandlers.push([el, handler]);
        }

        return el;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createMarketingHero
 * Create, show, and return a MarketingHero in one call.
 */
export function createMarketingHero(
    containerId: string, options: MarketingHeroOptions
): MarketingHero
{
    const hero = new MarketingHero(options);
    hero.show(containerId);
    return hero;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).MarketingHero = MarketingHero;
(window as any).createMarketingHero = createMarketingHero;
