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
function _trc(): boolean { return !!window.__ebt_trace_logging; }
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
function logTrace(...a: unknown[]): void
{
    _lu ? _lu.trace(...a) : _trc() && console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a);
}

// LOG-4a DECLARES ALL FIVE SHIMS IN EVERY COMPONENT, used or not, so a
// developer adding a log line never has to wire one up. `noUnusedLocals`
// is on (UNUSED-1), and this reference is what says that uniformity is
// deliberate rather than an oversight. Deleting a shim to silence the
// compiler is the wrong repair: `dynamicVerboseShims` holds the logDebug
// and logTrace population as a floor, and the preamble is the contract
// FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug, logTrace];

/** Deterministic palette for initials avatars — copied from UserMenu (IIFE constraint). */
const INITIALS_COLORS: string[] = [
    "#1a77c9", "#2a853c", "#b55e00", "#862e9c",
    "#c92a2a", "#0b7285", "#50810b", "#d6336c",
];


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

// `setAttr` LEFT ON 2026-10-21 (UNUSED-1): a local attribute
// helper with no caller in this module.

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
/**
 * A foreground that is readable on an arbitrary caller-supplied fill.
 *
 * DEBT-VR-11. `getInitialsColor` hashes the person's NAME into a
 * background, so the avatar colour is data and no fixed foreground can
 * be right for every input. White measured 4.43 on the blue a hash
 * produced and 4.47 on the olive.
 *
 * Duplicated per component on purpose: each is bundled as a standalone
 * IIFE and cannot import a shared module.
 *
 * @param background - The fill the text will sit on, as a hex string.
 * @returns `#000000` or `#ffffff`, whichever carries on that fill.
 */
function readableOn(background: string): string
{
    const hex = background.trim().replace("#", "");

    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex))
    {
        return "#ffffff";   // not a hex we can read; keep the previous default
    }

    const full = hex.length === 3
        ? hex.split("").map(function (c) { return c + c; }).join("")
        : hex;

    const channel = function (v: number): number
    {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };

    const r = channel(parseInt(full.slice(0, 2), 16));
    const g = channel(parseInt(full.slice(2, 4), 16));
    const b = channel(parseInt(full.slice(4, 6), 16));
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Contrast against white is (1.05)/(L+0.05); against near-black
    // (L+0.05)/0.0947. They cross at L ~= 0.179.
    return luminance > 0.179 ? "#0f172a" : "#ffffff";
}

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

/**
 * The PersonChip surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface PersonChipHandle
{
    getElement(): HTMLElement;
    setName(name: string): void;
    setEmail(email: string | undefined): void;
    setAvatarUrl(url: string | undefined): void;
    setStatus(status: PersonChipStatus | undefined): void;
    setRole(role: string | undefined): void;
    destroy(): void;
}

export class PersonChip implements PersonChipHandle
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
        el.style.color = readableOn(color);
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
        logTrace("keydown handler");
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
export function createPersonChip(options: PersonChipOptions): PersonChipHandle
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.name === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.name is required. `
            + "Pass it when creating the PersonChip.");
    }

    return new PersonChip(options);
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

window["createPersonChip"] = createPersonChip;
