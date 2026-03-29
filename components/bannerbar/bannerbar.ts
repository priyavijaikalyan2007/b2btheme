/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: BannerBar
 * 📜 PURPOSE: A fixed-to-top viewport banner for announcing significant events
 *    such as service status updates, critical issues, maintenance windows, and
 *    success confirmations. Only one banner is visible at a time.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[StatusBar]], [[SidebarPanel]]
 * ⚡ FLOW: [Consumer App] -> [createBannerBar()] -> [DOM fixed banner]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// TYPES
// ============================================================================

/** Severity variants for the banner bar. */
export type BannerBarVariant = "info" | "warning" | "critical" | "success";

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the BannerBar component.
 */
export interface BannerBarOptions
{
    /** Unique identifier. Auto-generated if omitted. */
    id?: string;

    /** Bold title text displayed before the message. */
    title?: string;

    /** Main message text (required). */
    message: string;

    /** Severity variant. Default: "info". */
    variant?: BannerBarVariant;

    /** Bootstrap Icons class (e.g., "bi-info-circle-fill"). Uses variant default if omitted. */
    icon?: string;

    /** Text for the action link/button. */
    actionLabel?: string;

    /** If set, action renders as an anchor with this href. */
    actionHref?: string;

    /** Click handler for the action button. */
    onAction?: () => void;

    /** Show the close X button. Default: true. */
    closable?: boolean;

    /** Auto-close after N milliseconds. 0 = no auto-dismiss. Default: 0. */
    autoDismissMs?: number;

    /** Max height in pixels before scrolling. Default: 200. */
    maxHeight?: number;

    /** CSS background colour override (overrides variant). */
    backgroundColor?: string;

    /** CSS text colour override (overrides variant). */
    textColor?: string;

    /** CSS border-bottom colour override (overrides variant). */
    borderColor?: string;

    /** CSS z-index. Default: 1045. */
    zIndex?: number;

    /** Additional CSS class(es) to add to the root element. */
    cssClass?: string;

    /** Called after the banner is closed or destroyed. */
    onClose?: () => void;

    /** Contained mode: relative positioning for embedding within a parent container. */
    contained?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[BannerBar]";

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

/** CSS custom property name set on <html>. */
const CSS_PROP_HEIGHT = "--bannerbar-height";

/** Default max height in pixels before the body becomes scrollable. */
const DEFAULT_MAX_HEIGHT = 200;

/** Default z-index for the banner bar. */
const DEFAULT_Z_INDEX = 1045;

/** Transition duration in ms — must match SCSS $bannerbar-transition-duration. */
const TRANSITION_MS = 300;

/** Default icons per variant. */
const VARIANT_ICONS: Record<BannerBarVariant, string> =
{
    info: "bi-info-circle-fill",
    warning: "bi-exclamation-triangle-fill",
    critical: "bi-exclamation-octagon-fill",
    success: "bi-check-circle-fill",
};

/** Variants that use assertive aria-live (urgent announcements). */
const ASSERTIVE_VARIANTS: Set<BannerBarVariant> = new Set(["critical", "warning"]);

let instanceCounter = 0;

// ============================================================================
// MODULE STATE
// ============================================================================

/** The currently active banner instance (only one visible at a time). */
let activeBanner: BannerBar | null = null;

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
 * BannerBar renders a fixed-top viewport banner for announcing significant
 * events. Only one banner is visible at a time; showing a new one replaces
 * the previous.
 *
 * @example
 * const banner = new BannerBar({
 *     message: "Scheduled maintenance tonight at 02:00 UTC.",
 *     variant: "warning"
 * });
 * banner.show();
 */
export class BannerBar
{
    private readonly instanceId: string;
    private readonly options: Required<Pick<BannerBarOptions, "message">> & BannerBarOptions;

    // State
    private visible = false;
    private destroyed = false;
    private contained = false;

    // Timers
    private autoDismissTimer: ReturnType<typeof setTimeout> | null = null;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private messageEl: HTMLElement | null = null;
    private iconEl: HTMLElement | null = null;

    constructor(options: BannerBarOptions)
    {
        if (!options.message)
        {
            logError("Message is required.");
        }

        instanceCounter += 1;
        this.instanceId = options.id || `bannerbar-${instanceCounter}`;

        this.options = {
            variant: "info",
            closable: true,
            autoDismissMs: 0,
            maxHeight: DEFAULT_MAX_HEIGHT,
            zIndex: DEFAULT_Z_INDEX,
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
     * Shows the banner by appending to the given container (or document.body).
     * If another banner is already visible, it is destroyed first.
     *
     * @param container - Optional parent element; defaults to document.body
     */
    public show(container?: HTMLElement): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot show destroyed banner:", this.instanceId);
            return;
        }

        if (this.visible)
        {
            logDebug("Already visible:", this.instanceId);
            return;
        }

        this.replaceActiveBanner();

        if (!this.rootEl)
        {
            logError("DOM not built; cannot show.");
            return;
        }

        const parent = container || document.body;
        parent.appendChild(this.rootEl);
        this.visible = true;
        activeBanner = this;

        this.triggerSlideIn();
        this.startAutoDismiss();

        logInfo("Shown:", this.instanceId);
    }

    /**
     * Hides the banner by removing it from the DOM. Clears timers and
     * the CSS custom property.
     */
    public hide(): void
    {
        if (!this.visible || !this.rootEl)
        {
            return;
        }

        this.clearAutoDismiss();

        // Slide out, then remove from DOM
        this.rootEl.classList.remove("bannerbar-visible");

        setTimeout(() =>
        {
            if (this.rootEl && this.rootEl.parentNode)
            {
                this.rootEl.parentNode.removeChild(this.rootEl);
            }

            this.visible = false;

            if (activeBanner === this)
            {
                activeBanner = null;
            }

            this.clearCssCustomProperty();

            logInfo("Hidden:", this.instanceId);
        }, TRANSITION_MS);
    }

    /**
     * Destroys the banner: hides it, releases references, and fires onClose.
     */
    public destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.destroyed = true;
        this.clearAutoDismiss();
        this.removeFromDOM();
        this.releaseReferences();
        this.fireOnClose();

        logInfo("Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PUBLIC — CONTENT UPDATES
    // ========================================================================

    /**
     * Updates the message text.
     *
     * @param msg - New message string
     */
    public setMessage(msg: string): void
    {
        if (this.messageEl)
        {
            this.messageEl.textContent = msg;
        }

        this.options.message = msg;

        logDebug("Message updated.");
    }

    /**
     * Updates the title text. Pass empty string to remove the title.
     *
     * @param title - New title string
     */
    public setTitle(title: string): void
    {
        if (!this.titleEl)
        {
            return;
        }

        this.titleEl.textContent = title;
        this.titleEl.style.display = title ? "" : "none";
        this.options.title = title;

        logDebug("Title updated.");
    }

    /**
     * Switches the banner to a different severity variant. Updates the
     * CSS class and icon.
     *
     * @param variant - The new variant
     */
    public setVariant(variant: BannerBarVariant): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const oldVariant = this.options.variant || "info";

        // Swap variant class
        this.rootEl.classList.remove(`bannerbar-${oldVariant}`);
        this.rootEl.classList.add(`bannerbar-${variant}`);

        // Update aria-live based on variant urgency
        const liveValue = ASSERTIVE_VARIANTS.has(variant) ? "assertive" : "polite";
        setAttr(this.rootEl, "aria-live", liveValue);

        // Update icon to new variant default (unless consumer set a custom icon)
        if (this.iconEl && !this.options.icon)
        {
            this.updateIconClass(VARIANT_ICONS[variant]);
        }

        this.options.variant = variant;

        logDebug("Variant changed to:", variant);
    }

    /**
     * Returns whether the banner is currently visible in the DOM.
     */
    public isVisible(): boolean
    {
        return this.visible;
    }

    /**
     * Enables or disables contained mode. In contained mode the banner uses
     * relative positioning so it flows within a parent container instead
     * of being fixed to the viewport top.
     *
     * @param value - true to enable contained mode, false to disable
     */
    public setContained(value: boolean): void
    {
        this.contained = value;

        if (this.rootEl)
        {
            if (value)
            {
                this.rootEl.classList.add("bannerbar-contained");
            }
            else
            {
                this.rootEl.classList.remove("bannerbar-contained");
            }
        }

        logDebug("Contained:", value);
    }

    /**
     * Returns whether the banner is in contained mode.
     */
    public isContained(): boolean
    {
        return this.contained;
    }

    // ========================================================================
    // PRIVATE — LIFECYCLE HELPERS
    // ========================================================================

    /**
     * Destroys the currently active banner if one exists and is not this instance.
     */
    private replaceActiveBanner(): void
    {
        if (activeBanner && activeBanner !== this)
        {
            logDebug("Replacing active banner.");
            activeBanner.destroy();
        }
    }

    /**
     * Triggers the CSS slide-in transition and schedules height measurement.
     * In contained mode the element is in document flow, so the translateY
     * animation is skipped.
     */
    private triggerSlideIn(): void
    {
        if (this.contained)
        {
            if (this.rootEl)
            {
                this.rootEl.classList.add("bannerbar-visible");
            }

            this.measureAndSetHeight();
            return;
        }

        requestAnimationFrame(() =>
        {
            if (this.rootEl)
            {
                this.rootEl.classList.add("bannerbar-visible");
            }

            // Measure height after transition completes
            setTimeout(() => this.measureAndSetHeight(), TRANSITION_MS);
        });
    }

    /**
     * Removes the root element from the DOM immediately and clears
     * the active banner reference and CSS custom property.
     */
    private removeFromDOM(): void
    {
        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.visible = false;

        if (activeBanner === this)
        {
            activeBanner = null;
        }

        this.clearCssCustomProperty();
    }

    /**
     * Releases all DOM element references to allow garbage collection.
     */
    private releaseReferences(): void
    {
        this.rootEl = null;
        this.titleEl = null;
        this.messageEl = null;
        this.iconEl = null;
    }

    /**
     * Invokes the onClose callback if configured, catching any errors.
     */
    private fireOnClose(): void
    {
        if (!this.options.onClose)
        {
            return;
        }

        try
        {
            this.options.onClose();
        }
        catch (err)
        {
            logError("onClose callback error:", err);
        }
    }

    // ========================================================================
    // PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /**
     * Builds the complete banner bar DOM tree.
     */
    private buildDOM(): void
    {
        this.rootEl = this.buildRoot();

        const body = this.buildBody();
        this.rootEl.appendChild(body);

        if (this.options.closable !== false)
        {
            const closeBtn = this.buildCloseButton();
            this.rootEl.appendChild(closeBtn);
        }
    }

    /**
     * Builds the root container element with variant class, ARIA attributes,
     * and optional style overrides.
     */
    private buildRoot(): HTMLElement
    {
        const variant = this.options.variant || "info";
        const root = createElement("div", ["bannerbar", `bannerbar-${variant}`]);

        setAttr(root, "id", this.instanceId);
        setAttr(root, "role", "alert");

        // Urgent variants use assertive; info/success use polite
        const liveValue = ASSERTIVE_VARIANTS.has(variant) ? "assertive" : "polite";
        setAttr(root, "aria-live", liveValue);

        // Contained mode
        if (this.contained)
        {
            root.classList.add("bannerbar-contained");
        }

        // Max height
        const maxH = this.options.maxHeight || DEFAULT_MAX_HEIGHT;
        root.style.maxHeight = `${maxH}px`;

        // Optional style overrides
        this.applyStyleOverrides(root);

        // Additional CSS classes
        if (this.options.cssClass)
        {
            root.classList.add(...this.options.cssClass.split(" "));
        }

        return root;
    }

    /**
     * Applies optional colour and z-index overrides from options.
     */
    private applyStyleOverrides(root: HTMLElement): void
    {
        if (this.options.backgroundColor)
        {
            root.style.backgroundColor = this.options.backgroundColor;
        }

        if (this.options.textColor)
        {
            root.style.color = this.options.textColor;
        }

        if (this.options.borderColor)
        {
            root.style.borderBottomColor = this.options.borderColor;
        }

        if (this.options.zIndex !== undefined)
        {
            root.style.zIndex = String(this.options.zIndex);
        }
    }

    /**
     * Builds the body flex container with icon, text, and optional action.
     */
    private buildBody(): HTMLElement
    {
        const body = createElement("div", ["bannerbar-body"]);

        // Icon
        const variant = this.options.variant || "info";
        const iconClass = this.options.icon || VARIANT_ICONS[variant];
        this.iconEl = createElement("i", ["bi", iconClass, "bannerbar-icon"]);
        body.appendChild(this.iconEl);

        // Text container (title + message)
        const textContainer = this.buildTextContainer();
        body.appendChild(textContainer);

        // Action link/button
        if (this.options.actionLabel)
        {
            const action = this.buildAction();
            body.appendChild(action);
        }

        return body;
    }

    /**
     * Builds the text container with optional title and message.
     */
    private buildTextContainer(): HTMLElement
    {
        const container = createElement("div", ["bannerbar-text"]);

        // Title (optional)
        this.titleEl = createElement("strong", ["bannerbar-title"]);
        this.titleEl.textContent = this.options.title || "";

        if (!this.options.title)
        {
            this.titleEl.style.display = "none";
        }

        container.appendChild(this.titleEl);

        // Message
        this.messageEl = createElement(
            "span", ["bannerbar-message"], this.options.message
        );
        container.appendChild(this.messageEl);

        return container;
    }

    /**
     * Builds the action element as either an anchor (if actionHref is set)
     * or a button.
     */
    // @agent:security — actionHref is sanitised to block javascript: URIs
    private buildAction(): HTMLElement
    {
        const label = this.options.actionLabel || "";

        if (this.options.actionHref)
        {
            const href = this.sanitiseHref(this.options.actionHref);
            const anchor = createElement("a", ["bannerbar-action"], label);
            setAttr(anchor, "href", href);
            this.bindActionHandler(anchor);
            return anchor;
        }

        const btn = createElement("button", ["bannerbar-action"], label);
        setAttr(btn, "type", "button");
        this.bindActionHandler(btn);
        return btn;
    }

    /**
     * Sanitises an href value to prevent javascript: URI injection.
     * Returns "#" if the URI uses a dangerous protocol.
     *
     * @param href - The raw href value
     * @returns The sanitised href
     */
    // SECURITY: Block javascript:, data:, and vbscript: URIs to prevent XSS
    private sanitiseHref(href: string): string
    {
        const normalised = href.trim().toLowerCase();

        if (
            normalised.startsWith("javascript:") ||
            normalised.startsWith("data:") ||
            normalised.startsWith("vbscript:")
        )
        {
            logWarn("Blocked unsafe href:", href);
            return "#";
        }

        return href;
    }

    /**
     * Binds the onAction click handler to an action element.
     */
    private bindActionHandler(el: HTMLElement): void
    {
        if (this.options.onAction)
        {
            const handler = this.options.onAction;

            el.addEventListener("click", (e: Event) =>
            {
                // Prevent default only for button actions, not links
                if (!this.options.actionHref)
                {
                    e.preventDefault();
                }

                try
                {
                    handler();
                }
                catch (err)
                {
                    logError("onAction callback error:", err);
                }
            });
        }
    }

    /**
     * Builds the close (X) button element.
     */
    private buildCloseButton(): HTMLElement
    {
        const btn = createElement("button", ["bannerbar-close"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Close banner");

        const icon = createElement("i", ["bi", "bi-x-lg"]);
        btn.appendChild(icon);

        // <- Handles: click (close banner)
        btn.addEventListener("click", () =>
        {
            this.destroy();
        });

        return btn;
    }

    // ========================================================================
    // PRIVATE — AUTO-DISMISS
    // ========================================================================

    /**
     * Starts the auto-dismiss timer if configured.
     */
    private startAutoDismiss(): void
    {
        const ms = this.options.autoDismissMs;

        if (!ms || ms <= 0)
        {
            return;
        }

        this.autoDismissTimer = setTimeout(() =>
        {
            logDebug(`Auto-dismiss triggered after ${ms}ms.`);
            this.hide();
        }, ms);
    }

    /**
     * Clears any running auto-dismiss timer.
     */
    private clearAutoDismiss(): void
    {
        if (this.autoDismissTimer !== null)
        {
            clearTimeout(this.autoDismissTimer);
            this.autoDismissTimer = null;
        }
    }

    // ========================================================================
    // PRIVATE — CSS CUSTOM PROPERTY
    // ========================================================================

    /**
     * Measures the banner's rendered height and sets --bannerbar-height
     * on <html> so other components can offset accordingly.
     */
    private measureAndSetHeight(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const height = this.rootEl.offsetHeight;

        document.documentElement.style.setProperty(
            CSS_PROP_HEIGHT, `${height}px`
        );

        logDebug("Height set:", `${height}px`);
    }

    /**
     * Removes the --bannerbar-height CSS custom property from <html>.
     */
    private clearCssCustomProperty(): void
    {
        document.documentElement.style.removeProperty(CSS_PROP_HEIGHT);
    }

    // ========================================================================
    // PRIVATE — ICON HELPER
    // ========================================================================

    /**
     * Replaces the current icon class with a new one.
     *
     * @param newClass - The new Bootstrap Icons class
     */
    private updateIconClass(newClass: string): void
    {
        if (!this.iconEl)
        {
            return;
        }

        // Remove all bi-* classes except the base "bi" class
        const toRemove: string[] = [];

        this.iconEl.classList.forEach((cls) =>
        {
            if (cls.startsWith("bi-"))
            {
                toRemove.push(cls);
            }
        });

        for (const cls of toRemove)
        {
            this.iconEl.classList.remove(cls);
        }

        this.iconEl.classList.add(newClass);
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates, shows, and returns a BannerBar instance in a single call.
 *
 * @param options - BannerBar configuration
 * @returns The created BannerBar instance
 */
export function createBannerBar(options: BannerBarOptions): BannerBar
{
    const banner = new BannerBar(options);
    banner.show();
    return banner;
}

/**
 * Ergonomic alias for createBannerBar.
 *
 * @param options - BannerBar configuration
 * @returns The created BannerBar instance
 */
export function showBanner(options: BannerBarOptions): BannerBar
{
    return createBannerBar(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["BannerBar"] = BannerBar;
    (window as any)["createBannerBar"] = createBannerBar;
    (window as any)["showBanner"] = showBanner;
}
