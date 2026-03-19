/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: EmptyState
 * 📜 PURPOSE: Centered placeholder for empty views — icon, heading,
 *             description, primary CTA, and secondary link.
 * 🔗 RELATES: [[EnterpriseTheme]], [[EmptyStateSpec]]
 * ⚡ FLOW: [Consumer App] -> [createEmptyState()] -> [Centered Placeholder]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[EmptyState]";

/** Default icon when none specified. */
const DEFAULT_ICON = "bi-inbox";

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration options for the EmptyState component. */
export interface EmptyStateOptions
{
    /** Bootstrap Icons class. Default: "bi-inbox". */
    icon?: string;
    /** CSS colour for icon. Default: uses $gray-400 via class. */
    iconColor?: string;
    /** Primary heading text. Required. */
    heading: string;
    /** Descriptive text below the heading. */
    description?: string;
    /** Primary CTA button label. */
    actionLabel?: string;
    /** CTA button Bootstrap Icons class. */
    actionIcon?: string;
    /** Bootstrap button variant. Default: "primary". */
    actionVariant?: string;
    /** CTA click handler. */
    onAction?: () => void;
    /** Secondary link text. */
    secondaryLabel?: string;
    /** Secondary link handler. */
    onSecondary?: () => void;
    /** Custom illustration element (replaces icon). */
    illustration?: HTMLElement;
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Reduced padding for panels. Default: false. */
    compact?: boolean;
    /** Additional CSS class(es) on root. */
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
 * ⚓ COMPONENT: EmptyState
 *
 * Centered placeholder for empty views.
 *
 * @example
 * var empty = createEmptyState("container", {
 *     heading: "No projects found",
 *     description: "Create your first project to get started.",
 *     actionLabel: "Create Project",
 *     actionIcon: "bi-plus-lg",
 *     onAction: () => console.log("Create clicked")
 * });
 */
export class EmptyState
{
    private readonly instanceId!: string;
    private readonly options!: EmptyStateOptions;

    // DOM references
    private rootEl: HTMLElement | null = null;
    private iconEl: HTMLElement | null = null;
    private headingEl: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;
    private actionBtn: HTMLButtonElement | null = null;
    private secondaryBtn: HTMLButtonElement | null = null;

    // State
    private destroyed = false;
    private actionHandler: (() => void) | null = null;

    constructor(options: EmptyStateOptions)
    {
        if (!options.heading)
        {
            console.error(LOG_PREFIX, "heading is required");
            return;
        }

        instanceCounter++;
        this.instanceId = `emptystate-${instanceCounter}`;
        this.options = options;

        this.rootEl = this.buildRoot();
        console.log(LOG_PREFIX, "Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to container element or body. */
    show(containerId?: string): void
    {
        if (this.destroyed || !this.rootEl) { return; }
        const container = containerId
            ? document.getElementById(containerId)
            : document.body;
        if (!container)
        {
            console.warn(LOG_PREFIX, "Container not found:", containerId);
            return;
        }
        container.appendChild(this.rootEl);
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
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.hide();
        this.rootEl = null;
        this.iconEl = null;
        this.headingEl = null;
        this.descriptionEl = null;
        this.actionBtn = null;
        this.secondaryBtn = null;
        this.actionHandler = null;
        console.log(LOG_PREFIX, "Destroyed", this.instanceId);
    }

    /** Return root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Update heading text. */
    setHeading(text: string): void
    {
        if (this.headingEl)
        {
            this.headingEl.textContent = text;
        }
    }

    /** Update description text. */
    setDescription(text: string): void
    {
        if (this.descriptionEl)
        {
            this.descriptionEl.textContent = text;
        }
    }

    /** Replace the icon class. */
    setIcon(iconClass: string): void
    {
        if (this.iconEl)
        {
            this.iconEl.className = `bi ${iconClass} emptystate-icon`;
        }
    }

    /** Show or update the CTA button with label and handler. */
    showAction(label: string, callback: () => void): void
    {
        if (!this.actionBtn) { return; }
        this.actionBtn.textContent = label;
        this.actionBtn.style.display = "";
        this.rebindAction(callback);
    }

    /** Hide the primary CTA button. */
    hideAction(): void
    {
        if (this.actionBtn)
        {
            this.actionBtn.style.display = "none";
        }
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const size = this.options.size ?? "md";
        const classes = this.buildRootClasses(size);
        const root = createElement("div", classes);
        root.id = this.instanceId;

        this.appendIcon(root);
        this.appendHeading(root, size);
        this.appendDescription(root);
        this.appendAction(root);
        this.appendSecondary(root);

        return root;
    }

    /** Build CSS class string for root element. */
    private buildRootClasses(size: string): string
    {
        const parts = ["emptystate", `emptystate-${size}`];
        if (this.options.compact) { parts.push("emptystate-compact"); }
        if (this.options.cssClass) { parts.push(this.options.cssClass); }
        return parts.join(" ");
    }

    /** Append icon or illustration to root. */
    private appendIcon(root: HTMLElement): void
    {
        if (this.options.illustration)
        {
            const wrap = createElement("div", "emptystate-illustration");
            setAttr(wrap, { "aria-hidden": "true" });
            wrap.appendChild(this.options.illustration);
            root.appendChild(wrap);
            return;
        }

        const iconClass = this.options.icon ?? DEFAULT_ICON;
        this.iconEl = createElement("i", `bi ${iconClass} emptystate-icon`);
        setAttr(this.iconEl, { "aria-hidden": "true" });
        if (this.options.iconColor)
        {
            this.iconEl.style.color = this.options.iconColor;
        }
        root.appendChild(this.iconEl);
    }

    /** Append heading element. */
    private appendHeading(root: HTMLElement, size: string): void
    {
        const tag = size === "sm" ? "h5" : size === "lg" ? "h3" : "h4";
        this.headingEl = createElement(tag, "emptystate-heading");
        this.headingEl.textContent = this.options.heading;
        root.appendChild(this.headingEl);
    }

    /** Append description paragraph. */
    private appendDescription(root: HTMLElement): void
    {
        this.descriptionEl = createElement("p", "emptystate-description");
        const descId = `${this.instanceId}-desc`;
        this.descriptionEl.id = descId;

        if (this.options.description)
        {
            this.descriptionEl.textContent = this.options.description;
        }
        else
        {
            this.descriptionEl.style.display = "none";
        }
        root.appendChild(this.descriptionEl);
    }

    /** Append primary CTA button. */
    private appendAction(root: HTMLElement): void
    {
        const variant = this.options.actionVariant ?? "primary";
        this.actionBtn = document.createElement("button");
        this.actionBtn.className = `btn btn-${variant} emptystate-action`;
        this.actionBtn.type = "button";

        // Link to description for aria-describedby
        const descId = `${this.instanceId}-desc`;
        if (this.options.description)
        {
            this.actionBtn.setAttribute("aria-describedby", descId);
        }

        if (this.options.actionLabel)
        {
            this.buildActionContent(this.actionBtn);
            this.rebindAction(this.options.onAction ?? null);
        }
        else
        {
            this.actionBtn.style.display = "none";
        }
        root.appendChild(this.actionBtn);
    }

    /** Build action button content (icon + label). */
    private buildActionContent(btn: HTMLButtonElement): void
    {
        if (this.options.actionIcon)
        {
            const icon = createElement("i", `bi ${this.options.actionIcon}`);
            setAttr(icon, { "aria-hidden": "true" });
            btn.appendChild(icon);
            btn.appendChild(document.createTextNode(` ${this.options.actionLabel}`));
        }
        else
        {
            btn.textContent = this.options.actionLabel ?? "";
        }
    }

    /** Rebind the action button click handler. */
    private rebindAction(callback: (() => void) | null): void
    {
        if (!this.actionBtn) { return; }
        if (this.actionHandler)
        {
            this.actionBtn.removeEventListener("click", this.actionHandler);
        }
        if (callback)
        {
            this.actionHandler = callback;
            this.actionBtn.addEventListener("click", this.actionHandler);
        }
    }

    /** Append secondary link button. */
    private appendSecondary(root: HTMLElement): void
    {
        this.secondaryBtn = document.createElement("button");
        this.secondaryBtn.className = "emptystate-secondary";
        this.secondaryBtn.type = "button";

        if (this.options.secondaryLabel)
        {
            this.secondaryBtn.textContent = this.options.secondaryLabel;
            if (this.options.onSecondary)
            {
                this.secondaryBtn.addEventListener(
                    "click", this.options.onSecondary
                );
            }
        }
        else
        {
            this.secondaryBtn.style.display = "none";
        }
        root.appendChild(this.secondaryBtn);
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createEmptyState
 * Create, show, and return an EmptyState in one call.
 */
export function createEmptyState(
    containerId: string, options: EmptyStateOptions
): EmptyState
{
    const state = new EmptyState(options);
    state.show(containerId);
    return state;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).EmptyState = EmptyState;
(window as any).createEmptyState = createEmptyState;
