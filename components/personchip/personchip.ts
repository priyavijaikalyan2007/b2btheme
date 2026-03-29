/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PersonChip
 * 📜 PURPOSE: Compact inline person-identity element showing avatar (image or
 *             initials), name, status dot, and optional detail text. Visual
 *             style matches the UserMenu trigger (collapsed state).
 * 🔗 RELATES: [[UserMenu]], [[PeoplePicker]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [createPersonChip()] -> [PersonChip DOM element]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[PersonChip]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }

/** Deterministic palette for initials avatars — copied from UserMenu (IIFE constraint). */
const INITIALS_COLORS: string[] = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#862e9c",
    "#c92a2a", "#0b7285", "#5c940d", "#d6336c",
];

/** Avatar diameter in pixels per size variant. */
const AVATAR_SIZES: Record<string, number> = {
    sm: 20,
    md: 28,
    lg: 36,
};

/** Valid size keys. */
const VALID_SIZES = ["sm", "md", "lg"] as const;

/** Valid status keys. */
const VALID_STATUSES = ["online", "offline", "busy", "away"] as const;

/** CSS class root prefix. */
const CLS = "personchip";

// ============================================================================
// TYPES
// ============================================================================

/** Size variant type. */
export type PersonChipSize = typeof VALID_SIZES[number];

/** Status variant type. */
export type PersonChipStatus = typeof VALID_STATUSES[number];

/** Configuration options for a PersonChip instance. */
export interface PersonChipOptions
{
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    status?: PersonChipStatus;
    size?: PersonChipSize;
    clickable?: boolean;
    href?: string;
    tooltip?: string;
    avatarOnly?: boolean;
    cssClass?: string;
    metadata?: Record<string, string>;
    onClick?: (chip: PersonChip) => void;
    onHover?: (chip: PersonChip, event: MouseEvent) => void;
    onHoverOut?: (chip: PersonChip, event: MouseEvent) => void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Create an HTML element with optional CSS classes and text content.
 */
function createElement(tag: string, classes: string[], text?: string): HTMLElement
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
 * Set an attribute on an element if the value is truthy.
 */
function setAttr(el: HTMLElement, attr: string, value: string | undefined): void
{
    if (value)
    {
        el.setAttribute(attr, value);
    }
}

// ============================================================================
// INITIALS HELPERS (copied from UserMenu — IIFE constraint)
// ============================================================================

/**
 * Extract first letters of first and last name for avatar initials.
 */
function getInitialsFromName(name: string): string
{
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2)
    {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return (parts[0] || "?").substring(0, 2).toUpperCase();
}

/**
 * Deterministic background colour from a name via simple hash.
 */
function getInitialsColor(name: string): string
{
    let hash = 0;

    for (let i = 0; i < name.length; i++)
    {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

// ============================================================================
// TOOLTIP HELPER
// ============================================================================

/**
 * Build auto-generated tooltip from email and role.
 */
function buildTooltip(email?: string, role?: string): string
{
    const parts: string[] = [];

    if (email)
    {
        parts.push(email);
    }

    if (role)
    {
        parts.push(role);
    }

    return parts.join(" \u00b7 ");
}

/**
 * Build tooltip for avatar-only mode — includes name since it is hidden.
 */
function buildAvatarOnlyTooltip(name: string, email?: string, role?: string): string
{
    const parts: string[] = [name];
    const detail = buildTooltip(email, role);

    if (detail)
    {
        parts.push(detail);
    }

    return parts.join(" \u00b7 ");
}

// ============================================================================
// CLASS: PersonChip
// ============================================================================

export class PersonChip
{
    // --- State ---
    private opts: PersonChipOptions;
    private size: PersonChipSize;

    // --- DOM references (nullable for destroy) ---
    private rootEl: HTMLElement | null = null;
    private avatarEl: HTMLElement | null = null;
    private avatarContentEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private nameEl: HTMLElement | null = null;
    private detailEl: HTMLElement | null = null;

    // --- Bound handlers ---
    private boundClick: ((e: Event) => void) | null = null;
    private boundKeydown: ((e: Event) => void) | null = null;
    private boundHover: ((e: Event) => void) | null = null;
    private boundHoverOut: ((e: Event) => void) | null = null;

    constructor(options: PersonChipOptions)
    {
        this.opts = { ...options };
        this.size = this.resolveSize(options.size);
        this.rootEl = this.buildDom();
        this.attachListeners();

        logInfo("Created chip for:", options.name);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Return the root DOM element. */
    public getElement(): HTMLElement
    {
        if (!this.rootEl)
        {
            throw new Error(LOG_PREFIX + " Component has been destroyed");
        }

        return this.rootEl;
    }

    /** Update display name, initials, and tooltip. */
    public setName(name: string): void
    {
        this.opts.name = name;
        this.updateName();
        this.updateAvatar();
        this.updateTooltip();
    }

    /** Update email — tooltip and lg detail. */
    public setEmail(email: string | undefined): void
    {
        this.opts.email = email;
        this.updateDetail();
        this.updateTooltip();
    }

    /** Swap avatar URL or fall back to initials. */
    public setAvatarUrl(url: string | undefined): void
    {
        this.opts.avatarUrl = url;
        this.updateAvatar();
    }

    /** Change or remove status dot. */
    public setStatus(status: PersonChipStatus | undefined): void
    {
        this.opts.status = status;
        this.updateStatus();
    }

    /** Update role — tooltip and lg detail. */
    public setRole(role: string | undefined): void
    {
        this.opts.role = role;
        this.updateDetail();
        this.updateTooltip();
    }

    /** Remove listeners, DOM, null refs. */
    public destroy(): void
    {
        this.detachListeners();

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.nullifyReferences();

        logInfo("Destroyed chip");
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the complete DOM tree and return the root element. */
    private buildDom(): HTMLElement
    {
        const tag = this.opts.href ? "a" : "span";
        const root = this.buildRoot(tag);

        this.avatarEl = this.buildAvatarContainer();
        this.avatarContentEl = this.buildAvatarContent();
        this.avatarEl.appendChild(this.avatarContentEl);

        this.statusEl = this.buildStatusDot();

        if (this.statusEl)
        {
            this.avatarEl.appendChild(this.statusEl);
        }

        this.nameEl = this.buildNameElement();
        this.detailEl = this.buildDetailElement();

        root.appendChild(this.avatarEl);

        if (!this.opts.avatarOnly)
        {
            root.appendChild(this.nameEl);

            if (this.detailEl)
            {
                root.appendChild(this.detailEl);
            }
        }

        return root;
    }

    /** Build the root element with classes, attributes, and tooltip. */
    private buildRoot(tag: string): HTMLElement
    {
        const classes = [CLS, `${CLS}-${this.size}`];

        if (this.opts.avatarOnly)
        {
            classes.push(`${CLS}-avatar-only`);
        }

        if (this.opts.clickable || this.opts.href || this.opts.onClick)
        {
            classes.push(`${CLS}-clickable`);
        }

        if (this.opts.cssClass)
        {
            classes.push(this.opts.cssClass);
        }

        const root = createElement(tag, classes);

        if (this.opts.href)
        {
            (root as HTMLAnchorElement).href = this.opts.href;
        }

        this.applyTooltip(root);
        this.applyMetadata(root);
        this.applyAccessibility(root);

        return root;
    }

    /** Apply tooltip title attribute to root element. */
    private applyTooltip(root: HTMLElement): void
    {
        const tip = this.opts.tooltip || this.resolveAutoTooltip();

        if (tip)
        {
            root.setAttribute("title", tip);
        }
    }

    /** Resolve auto-generated tooltip based on mode. */
    private resolveAutoTooltip(): string
    {
        if (this.opts.avatarOnly)
        {
            return buildAvatarOnlyTooltip(this.opts.name, this.opts.email, this.opts.role);
        }

        return buildTooltip(this.opts.email, this.opts.role);
    }

    /** Apply data-* metadata attributes. */
    private applyMetadata(root: HTMLElement): void
    {
        if (!this.opts.metadata)
        {
            return;
        }

        const keys = Object.keys(this.opts.metadata);

        for (let i = 0; i < keys.length; i++)
        {
            const key = keys[i];
            root.setAttribute("data-" + key, this.opts.metadata[key]);
        }
    }

    /** Apply accessibility attributes for clickable/href chips. */
    private applyAccessibility(root: HTMLElement): void
    {
        const isClickable = this.opts.clickable || this.opts.onClick;

        if (isClickable && !this.opts.href)
        {
            root.setAttribute("tabindex", "0");
            root.setAttribute("role", "button");
        }
    }

    // ========================================================================
    // AVATAR BUILDING
    // ========================================================================

    /** Build the avatar wrapper. */
    private buildAvatarContainer(): HTMLElement
    {
        return createElement("span", [`${CLS}-avatar`]);
    }

    /** Build either an image or initials avatar. */
    private buildAvatarContent(): HTMLElement
    {
        if (this.opts.avatarUrl)
        {
            return this.buildAvatarImage(this.opts.avatarUrl);
        }

        return this.buildAvatarInitials();
    }

    /** Build an image avatar element. */
    private buildAvatarImage(url: string): HTMLElement
    {
        const img = document.createElement("img") as HTMLImageElement;

        img.classList.add(`${CLS}-avatar-img`);
        img.src = url;
        img.alt = getInitialsFromName(this.opts.name);
        img.setAttribute("aria-hidden", "true");

        return img;
    }

    /** Build an initials avatar element with deterministic colour. */
    private buildAvatarInitials(): HTMLElement
    {
        const initials = getInitialsFromName(this.opts.name);
        const color = getInitialsColor(this.opts.name);
        const el = createElement("span", [`${CLS}-avatar-initials`], initials);

        el.style.backgroundColor = color;
        el.setAttribute("aria-hidden", "true");

        return el;
    }

    // ========================================================================
    // STATUS DOT
    // ========================================================================

    /** Build status dot element or return null. */
    private buildStatusDot(): HTMLElement | null
    {
        if (!this.opts.status)
        {
            return null;
        }

        return createElement("span", [
            `${CLS}-status`,
            `${CLS}-status-${this.opts.status}`,
        ]);
    }

    // ========================================================================
    // NAME AND DETAIL
    // ========================================================================

    /** Build name element. */
    private buildNameElement(): HTMLElement
    {
        return createElement("span", [`${CLS}-name`], this.opts.name);
    }

    /** Build detail element (email/role for lg). */
    private buildDetailElement(): HTMLElement | null
    {
        const detail = this.opts.email || this.opts.role;

        if (!detail)
        {
            return null;
        }

        return createElement("span", [`${CLS}-detail`], detail);
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    /** Attach click, keyboard, and hover listeners. */
    private attachListeners(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const isClickable = this.opts.clickable || this.opts.onClick || this.opts.href;

        if (isClickable && this.opts.onClick)
        {
            this.boundClick = this.handleClick.bind(this);
            this.rootEl.addEventListener("click", this.boundClick);
        }

        if (isClickable && !this.opts.href)
        {
            this.boundKeydown = this.handleKeydown.bind(this);
            this.rootEl.addEventListener("keydown", this.boundKeydown);
        }

        if (this.opts.onHover)
        {
            this.boundHover = this.handleHover.bind(this);
            this.rootEl.addEventListener("mouseenter", this.boundHover);
        }

        if (this.opts.onHoverOut)
        {
            this.boundHoverOut = this.handleHoverOut.bind(this);
            this.rootEl.addEventListener("mouseleave", this.boundHoverOut);
        }
    }

    /** Detach all event listeners. */
    private detachListeners(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.boundClick)
        {
            this.rootEl.removeEventListener("click", this.boundClick);
        }

        if (this.boundKeydown)
        {
            this.rootEl.removeEventListener("keydown", this.boundKeydown);
        }

        if (this.boundHover)
        {
            this.rootEl.removeEventListener("mouseenter", this.boundHover);
        }

        if (this.boundHoverOut)
        {
            this.rootEl.removeEventListener("mouseleave", this.boundHoverOut);
        }
    }

    /** Handle click event. */
    private handleClick(e: Event): void
    {
        e.preventDefault();

        if (this.opts.onClick)
        {
            this.opts.onClick(this);
        }
    }

    /** Handle keyboard activation (Enter/Space). */
    private handleKeydown(e: Event): void
    {
        const key = (e as KeyboardEvent).key;

        if (key !== "Enter" && key !== " ")
        {
            return;
        }

        e.preventDefault();

        if (this.opts.onClick)
        {
            this.opts.onClick(this);
        }
    }

    /** Handle mouseenter event. */
    private handleHover(e: Event): void
    {
        if (this.opts.onHover)
        {
            this.opts.onHover(this, e as MouseEvent);
        }
    }

    /** Handle mouseleave event. */
    private handleHoverOut(e: Event): void
    {
        if (this.opts.onHoverOut)
        {
            this.opts.onHoverOut(this, e as MouseEvent);
        }
    }

    // ========================================================================
    // UPDATE HELPERS
    // ========================================================================

    /** Update name text in the DOM. */
    private updateName(): void
    {
        if (this.nameEl)
        {
            this.nameEl.textContent = this.opts.name;
        }
    }

    /** Update avatar (image vs initials) in the DOM. */
    private updateAvatar(): void
    {
        if (!this.avatarEl || !this.avatarContentEl)
        {
            return;
        }

        const newContent = this.buildAvatarContent();

        this.avatarEl.replaceChild(newContent, this.avatarContentEl);
        this.avatarContentEl = newContent;
    }

    /** Update detail text (email or role) in the DOM. */
    private updateDetail(): void
    {
        const detail = this.opts.email || this.opts.role;

        if (this.detailEl && detail)
        {
            this.detailEl.textContent = detail;
        }
        else if (!this.detailEl && detail && this.rootEl)
        {
            this.detailEl = createElement("span", [`${CLS}-detail`], detail);
            this.rootEl.appendChild(this.detailEl);
        }
        else if (this.detailEl && !detail)
        {
            this.detailEl.remove();
            this.detailEl = null;
        }
    }

    /** Update tooltip on the root element. */
    private updateTooltip(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const tip = this.opts.tooltip || this.resolveAutoTooltip();

        if (tip)
        {
            this.rootEl.setAttribute("title", tip);
        }
        else
        {
            this.rootEl.removeAttribute("title");
        }
    }

    /** Update status dot in the DOM. */
    private updateStatus(): void
    {
        if (!this.avatarEl)
        {
            return;
        }

        // Remove existing status dot
        if (this.statusEl)
        {
            this.statusEl.remove();
            this.statusEl = null;
        }

        // Add new status dot if needed
        this.statusEl = this.buildStatusDot();

        if (this.statusEl)
        {
            this.avatarEl.appendChild(this.statusEl);
        }
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /** Resolve size with fallback to "md". */
    private resolveSize(size?: string): PersonChipSize
    {
        if (size && (VALID_SIZES as readonly string[]).indexOf(size) !== -1)
        {
            return size as PersonChipSize;
        }

        return "md";
    }

    /** Nullify all internal references for garbage collection. */
    private nullifyReferences(): void
    {
        this.rootEl = null;
        this.avatarEl = null;
        this.avatarContentEl = null;
        this.statusEl = null;
        this.nameEl = null;
        this.detailEl = null;
        this.boundClick = null;
        this.boundKeydown = null;
        this.boundHover = null;
        this.boundHoverOut = null;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory function: create a PersonChip instance.
 *
 * @param options - PersonChip configuration
 * @returns The created PersonChip instance
 */
export function createPersonChip(options: PersonChipOptions): PersonChip
{
    return new PersonChip(options);
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["PersonChip"] = PersonChip;
(window as unknown as Record<string, unknown>)["createPersonChip"] = createPersonChip;
