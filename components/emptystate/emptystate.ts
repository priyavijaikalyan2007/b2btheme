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
/**
 * The EmptyState surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface EmptyStateHandle
{
    show(containerId?: string): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement | null;
    setHeading(text: string): void;
    setDescription(text: string): void;
    setIcon(iconClass: string): void;
    showAction(label: string, callback: () => void): void;
    hideAction(): void;

    /** The surface contract (additive): EmptyState has no data slots, so this throws. */
    setData(slot: string, value: unknown): void;
    /** Subscribes to "action" or "secondary": the clicked button's label. Returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** Nothing to report (ADR-229): always {}. */
    getState(): Record<string, unknown>;
    /** Nothing to restore (ADR-229). */
    setState(state: Record<string, unknown>): void;
}

export class EmptyState implements EmptyStateHandle
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
    private actionCallback: (() => void) | null = null;
    private actionLabel = "";
    private readonly handlers: Record<"action" | "secondary", Set<(payload: unknown) => void>> = {
        action: new Set(),
        secondary: new Set(),
    };

    constructor(options: EmptyStateOptions)
    {
        if (!options.heading)
        {
            logError("heading is required");
            return;
        }

        instanceCounter++;
        this.instanceId = `emptystate-${instanceCounter}`;
        this.options = options;

        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
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
            // ERR-1. This logged and carried on, so the caller got a
            // handle to a component that was never mounted.
            throw new Error(
                `${LOG_PREFIX} Container "${containerId}" was not found. `
                + "Insert the element before showing it.");
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
        this.actionCallback = null;
        this.handlers.action.clear();
        this.handlers.secondary.clear();
        logInfo("Destroyed", this.instanceId);
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
        this.actionLabel = label;
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
    // SURFACE CONTRACT (additive, ADR-229)
    // ========================================================================

    /** EmptyState has no data slots; use setHeading(), setDescription(), setIcon() or showAction(). */
    setData(slot: string, _value: unknown): void
    {
        throw new Error(
            `${LOG_PREFIX} setData("${slot}"): EmptyState has no data slots. `
            + "Use setHeading(), setDescription(), setIcon() or showAction().");
    }

    /** Subscribes to "action" or "secondary"; returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (channel !== "action" && channel !== "secondary")
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the valid channels are "action" and "secondary".`);
        }

        this.handlers[channel].add(handler);

        return () => { this.handlers[channel].delete(handler); };
    }

    /** Nothing to report (ADR-229). */
    getState(): Record<string, unknown>
    {
        return {};
    }

    /** Nothing to restore (ADR-229). */
    setState(_state: Record<string, unknown>): void
    {
    }

    /** Call every handler on a channel, isolating each so one throw cannot starve the rest. */
    private emit(channel: "action" | "secondary", payload: string): void
    {
        for (const handler of this.handlers[channel])
        {
            try
            {
                handler(payload);
            }
            catch (err)
            {
                logError(`${channel} handler threw`, err);
            }
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
            this.actionLabel = this.options.actionLabel;
            this.rebindAction(this.options.onAction ?? null);
        }
        else
        {
            this.actionBtn.style.display = "none";
        }

        // One internal listener for the life of the button: showAction() swaps the
        // callback it calls, never the listener, so a rebind cannot duplicate it.
        this.actionBtn.addEventListener("click", () => this.handleActionClick());
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

    /** Replace the callback the action button's listener calls. */
    private rebindAction(callback: (() => void) | null): void
    {
        this.actionCallback = callback;
    }

    /** The callback runs first; the channel hears the label after it, even if the callback throws. */
    private handleActionClick(): void
    {
        try
        {
            this.actionCallback?.();
        }
        finally
        {
            this.emit("action", this.actionLabel);
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
            const label = this.options.secondaryLabel;
            this.secondaryBtn.textContent = label;
            this.secondaryBtn.addEventListener("click", () =>
            {
                try
                {
                    this.options.onSecondary?.();
                }
                finally
                {
                    this.emit("secondary", label);
                }
            });
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
): EmptyStateHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. Absent means undefined, so an empty
    // array and a zero are present and pass.
    if (options.heading === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.heading is required. `
            + "Pass it when creating the EmptyState.");
    }

    const state = new EmptyState(options);
    state.show(containerId);
    return state;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createEmptyState = createEmptyState;
