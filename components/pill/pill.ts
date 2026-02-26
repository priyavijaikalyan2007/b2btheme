/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Pill
 * 📜 PURPOSE: Reusable inline pill element for mentions, issues, documents,
 *             tags, and other entity references in text flows.
 * 🔗 RELATES: [[SmartTextInput]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [createPill()] -> [Pill DOM element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Pill]";

/** Valid colour preset names. */
const VALID_COLORS = ["blue", "gray", "green", "red", "purple", "orange"] as const;

// ============================================================================
// TYPES
// ============================================================================

/** Colour preset type. */
export type PillColor = typeof VALID_COLORS[number];

/** Configuration for a Pill instance. */
export interface PillOptions
{
    /** Display text (required). */
    label: string;
    /** Bootstrap icon class, e.g. "bi bi-person". */
    icon?: string;
    /** Preset: "blue" (default) | "gray" | "green" | "red" | "purple" | "orange". */
    color?: PillColor;
    /** CSS override for background — takes precedence over preset. */
    background?: string;
    /** CSS text colour override. */
    foreground?: string;
    /** CSS border-color override. */
    borderColor?: string;
    /** CSS border-radius override, default "9999px". */
    borderRadius?: string;
    /** Size variant. Default "md". */
    size?: "sm" | "md" | "lg";
    /** Show close button. */
    dismissible?: boolean;
    /** Pointer cursor + click/keyboard activation. */
    clickable?: boolean;
    /** Render as anchor instead of span. */
    href?: string;
    /** Native title attribute. */
    tooltip?: string;
    /** Additional CSS class(es). */
    cssClass?: string;
    /** data-* attributes. */
    metadata?: Record<string, string>;
    /** Called on click or keyboard activation. */
    onClick?: (pill: Pill) => void;
    /** Called when dismiss button is clicked. */
    onDismiss?: (pill: Pill) => void;
    /** Called on mouseenter. */
    onHover?: (pill: Pill, event: MouseEvent) => void;
    /** Called on mouseleave. */
    onHoverOut?: (pill: Pill, event: MouseEvent) => void;
}

/** Style overrides for setStyle(). */
export interface PillStyleOverrides
{
    background?: string;
    foreground?: string;
    borderColor?: string;
    borderRadius?: string;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
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
// PILL CLASS
// ============================================================================

/** Inline pill element for entity references. */
export class Pill
{
    private rootEl: HTMLElement | null = null;
    private labelEl: HTMLElement | null = null;
    private options: PillOptions;
    private boundHandlers: Array<{ el: HTMLElement; event: string; fn: EventListener }> = [];

    constructor(options: PillOptions)
    {
        this.options = { ...options };
        this.buildRoot();
        console.log(LOG_PREFIX, "Created pill:", options.label);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /** Return the root DOM element. */
    // @entrypoint
    public getElement(): HTMLElement
    {
        return this.rootEl!;
    }

    /** Update label text and aria-label. */
    public setLabel(text: string): void
    {
        this.options.label = text;

        if (this.labelEl)
        {
            this.labelEl.textContent = text;
        }
        if (this.rootEl)
        {
            this.rootEl.setAttribute("aria-label", text);
        }
    }

    /** Swap colour preset class. */
    public setColor(color: PillColor): void
    {
        if (!this.rootEl) { return; }

        this.removeColorClasses();
        this.options.color = color;
        this.rootEl.classList.add(`pill-${color}`);
    }

    /** Apply inline style overrides via CSS custom properties. */
    public setStyle(overrides: PillStyleOverrides): void
    {
        if (!this.rootEl) { return; }

        if (overrides.background !== undefined)
        {
            this.rootEl.style.setProperty("--pill-bg", overrides.background);
        }
        if (overrides.foreground !== undefined)
        {
            this.rootEl.style.setProperty("--pill-fg", overrides.foreground);
        }
        if (overrides.borderColor !== undefined)
        {
            this.rootEl.style.setProperty("--pill-border-color", overrides.borderColor);
        }
        if (overrides.borderRadius !== undefined)
        {
            this.rootEl.style.setProperty("--pill-border-radius", overrides.borderRadius);
        }
    }

    /** Remove listeners, remove from DOM, null refs. */
    public destroy(): void
    {
        for (const { el, event, fn } of this.boundHandlers)
        {
            el.removeEventListener(event, fn);
        }
        this.boundHandlers = [];

        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.rootEl = null;
        this.labelEl = null;
        console.log(LOG_PREFIX, "Destroyed pill:", this.options.label);
    }

    // ====================================================================
    // PRIVATE: DOM BUILD
    // ====================================================================

    /** Orchestrate DOM build. */
    private buildRoot(): void
    {
        const tag = this.options.href ? "a" : "span";
        const sizeClass = `pill-${this.options.size ?? "md"}`;
        const colorClass = `pill-${this.options.color ?? "blue"}`;
        const classes = this.assembleClasses(sizeClass, colorClass);

        this.rootEl = createElement(tag, classes);
        setAttr(this.rootEl, {
            role: "status",
            "aria-label": this.options.label
        });

        if (this.options.href)
        {
            (this.rootEl as HTMLAnchorElement).href = this.options.href;
        }
        if (this.options.tooltip)
        {
            this.rootEl.title = this.options.tooltip;
        }

        this.appendChildren();
        this.applyCustomStyles();
        this.applyMetadata();
        this.attachClickBehaviour();
        this.attachHoverBehaviour();
    }

    /** Assemble CSS class string from parts. */
    private assembleClasses(
        sizeClass: string, colorClass: string
    ): string
    {
        const parts = ["pill", colorClass, sizeClass];

        if (this.options.clickable) { parts.push("pill-clickable"); }
        if (this.options.dismissible) { parts.push("pill-dismissible"); }
        if (this.options.cssClass) { parts.push(this.options.cssClass); }

        return parts.join(" ");
    }

    /** Append icon, label, and dismiss children to root. */
    private appendChildren(): void
    {
        if (!this.rootEl) { return; }

        if (this.options.icon)
        {
            this.rootEl.appendChild(this.buildIcon());
        }

        this.labelEl = this.buildLabel();
        this.rootEl.appendChild(this.labelEl);

        if (this.options.dismissible)
        {
            this.rootEl.appendChild(this.buildDismissButton());
        }
    }

    /** Create icon element. */
    private buildIcon(): HTMLElement
    {
        const icon = createElement("i", `${this.options.icon} pill-icon`);
        setAttr(icon, { "aria-hidden": "true" });
        return icon;
    }

    /** Create label span. */
    private buildLabel(): HTMLElement
    {
        const span = createElement("span", "pill-label");
        span.textContent = this.options.label;
        return span;
    }

    /** Create close button with handler. */
    private buildDismissButton(): HTMLElement
    {
        const btn = createElement("button", "pill-dismiss");
        setAttr(btn, {
            type: "button",
            "aria-label": "Remove",
            tabindex: "-1"
        });

        const icon = createElement("i", "bi bi-x");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        const handler = (e: Event): void =>
        {
            e.stopPropagation();
            this.options.onDismiss?.(this);
            this.destroy();
        };

        btn.addEventListener("click", handler);
        this.boundHandlers.push(
            { el: btn, event: "click", fn: handler as EventListener }
        );

        return btn;
    }

    // ====================================================================
    // PRIVATE: STYLE & METADATA
    // ====================================================================

    /** Set CSS custom property overrides from options. */
    private applyCustomStyles(): void
    {
        if (!this.rootEl) { return; }

        const overrides: PillStyleOverrides = {};
        if (this.options.background) { overrides.background = this.options.background; }
        if (this.options.foreground) { overrides.foreground = this.options.foreground; }
        if (this.options.borderColor) { overrides.borderColor = this.options.borderColor; }
        if (this.options.borderRadius) { overrides.borderRadius = this.options.borderRadius; }

        this.setStyle(overrides);
    }

    /** Set data-* attributes from metadata. */
    private applyMetadata(): void
    {
        if (!this.rootEl || !this.options.metadata) { return; }

        for (const [key, value] of Object.entries(this.options.metadata))
        {
            this.rootEl.setAttribute(`data-${key}`, value);
        }
    }

    /** Remove all colour preset classes from root. */
    private removeColorClasses(): void
    {
        if (!this.rootEl) { return; }

        for (const c of VALID_COLORS)
        {
            this.rootEl.classList.remove(`pill-${c}`);
        }
    }

    // ====================================================================
    // PRIVATE: EVENT HANDLERS
    // ====================================================================

    /** Click + Enter/Space handlers for clickable pills. */
    private attachClickBehaviour(): void
    {
        if (!this.rootEl || !this.options.clickable) { return; }

        this.rootEl.setAttribute("tabindex", "0");

        const clickHandler = (): void =>
        {
            this.options.onClick?.(this);
        };

        const keyHandler = (e: Event): void =>
        {
            const key = (e as KeyboardEvent).key;
            if (key === "Enter" || key === " ")
            {
                e.preventDefault();
                this.options.onClick?.(this);
            }
        };

        this.rootEl.addEventListener("click", clickHandler);
        this.rootEl.addEventListener("keydown", keyHandler);
        this.boundHandlers.push(
            { el: this.rootEl, event: "click", fn: clickHandler as EventListener },
            { el: this.rootEl, event: "keydown", fn: keyHandler as EventListener }
        );
    }

    /** mouseenter/mouseleave handlers. */
    private attachHoverBehaviour(): void
    {
        if (!this.rootEl) { return; }
        if (!this.options.onHover && !this.options.onHoverOut) { return; }

        const enterHandler = (e: Event): void =>
        {
            this.options.onHover?.(this, e as MouseEvent);
        };

        const leaveHandler = (e: Event): void =>
        {
            this.options.onHoverOut?.(this, e as MouseEvent);
        };

        this.rootEl.addEventListener("mouseenter", enterHandler);
        this.rootEl.addEventListener("mouseleave", leaveHandler);
        this.boundHandlers.push(
            { el: this.rootEl, event: "mouseenter", fn: enterHandler as EventListener },
            { el: this.rootEl, event: "mouseleave", fn: leaveHandler as EventListener }
        );
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/** Create a Pill instance and return it. */
// @entrypoint
export function createPill(options: PillOptions): Pill
{
    return new Pill(options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).Pill = Pill;
(window as unknown as Record<string, unknown>).createPill = createPill;
