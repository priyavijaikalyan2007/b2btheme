/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: TypeBadge
 * 📜 PURPOSE: Small inline chip/badge that visually identifies an ontology
 *             type via icon, color, and label. Pure factory — no class handle.
 * 🔗 RELATES: [[RelationshipManager]], [[PropertyInspector]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer] -> [createTypeBadge()] -> [HTMLElement]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TypeBadge]";

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


// ============================================================================
// TYPES
// ============================================================================

/** Size variant for the badge. */
export type TypeBadgeSize = "sm" | "md" | "lg";

/** Visual variant for the badge. */
export type TypeBadgeVariant = "filled" | "outlined" | "subtle";

/** Configuration for a TypeBadge instance. */
export interface TypeBadgeOptions
{
    /** Ontology type key, e.g. "strategy.okr". */
    typeKey: string;
    /** Override display name. If omitted, extracted from typeKey. */
    displayName?: string;
    /** Bootstrap icon name (without "bi bi-" prefix), e.g. "crosshair". */
    icon?: string;
    /** Hex color for the badge, e.g. "#C0392B". */
    color?: string;
    /** Size: "sm" (20px), "md" (28px), "lg" (32px). Default "sm". */
    size?: TypeBadgeSize;
    /** Variant: "filled" | "outlined" | "subtle". Default "subtle". */
    variant?: TypeBadgeVariant;
    /** Show namespace prefix (e.g. "strategy.okr" vs "okr"). Default false. */
    showNamespace?: boolean;
    /** Make badge clickable. Default false. */
    clickable?: boolean;
    /** Click callback. Requires clickable: true. */
    onClick?: () => void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class. */
function htmlEl(
    tag: string,
    attrs?: Record<string, string>,
    text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (attrs)
    {
        for (const [k, v] of Object.entries(attrs))
        {
            el.setAttribute(k, v);
        }
    }
    if (text) { el.textContent = text; }
    return el;
}

// ============================================================================
// PURE HELPERS
// ============================================================================

/** Extract display name from typeKey (last segment after dot). */
function extractDisplayName(
    typeKey: string,
    showNamespace: boolean,
    displayName?: string
): string
{
    if (displayName) { return displayName; }
    if (showNamespace) { return typeKey; }

    const dotIdx = typeKey.lastIndexOf(".");
    return dotIdx >= 0 ? typeKey.substring(dotIdx + 1) : typeKey;
}

/**
 * The caller's colour, or `null` when they did not pick one.
 *
 * `null` matters: it is the difference between "paint it this hex" and
 * "use the theme's own neutral". This used to return a fixed #475569 so
 * that every badge carried an inline colour, which no dark-mode rule
 * can override. The stylesheet owns the default now.
 */
function resolveColor(color?: string): string | null
{
    return color && color.length > 0 ? color : null;
}

/**
 * Pick a foreground that stays readable on an arbitrary background.
 *
 * ADR-153. A caller-supplied colour cannot be vetted at build time, and
 * a fixed #fff fails on anything pale. Choosing by relative luminance
 * guarantees at least 4.61 against one of the two extremes.
 *
 * Duplicated per component on purpose: each is bundled as a standalone
 * IIFE and cannot import a shared module.
 */
function readableOn(background: string): string
{
    const hex = background.trim().replace("#", "");

    if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex))
    {
        throw new Error(
            `${LOG_PREFIX} options.color must be a hex colour, got `
            + `"${background}". A badge cannot pick a readable `
            + "foreground for a colour it cannot read.");
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

    // Contrast against white is (1.05)/(L+0.05); against black
    // (L+0.05)/0.05. They cross at L ~= 0.179. Both extremes are TRUE
    // extremes: #0f172a is L = 0.0088 and bottoms the guarantee out at
    // 4.23 on a mid grey, which DEBT-VR-11 found in five components.
    return luminance > 0.179 ? "#000000" : "#ffffff";
}

/** Convert hex (#RRGGBB or #RGB) to rgba string. */
function hexToRgba(hex: string, alpha: number): string
{
    let r = 0;
    let g = 0;
    let b = 0;
    const h = hex.replace("#", "");

    if (h.length === 3)
    {
        r = parseInt(h[0] + h[0], 16);
        g = parseInt(h[1] + h[1], 16);
        b = parseInt(h[2] + h[2], 16);
    }
    else if (h.length === 6)
    {
        r = parseInt(h.substring(0, 2), 16);
        g = parseInt(h.substring(2, 4), 16);
        b = parseInt(h.substring(4, 6), 16);
    }

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Build icon element with Bootstrap icon class. */
function buildIcon(icon: string, size: TypeBadgeSize): HTMLElement
{
    const sizeClass = `typebadge-icon-${size}`;
    const el = htmlEl("i", {
        class: `bi bi-${icon} typebadge-icon ${sizeClass}`,
        "aria-hidden": "true"
    });
    return el;
}

/** Build label span with textContent. */
function buildLabel(text: string): HTMLElement
{
    const span = htmlEl("span", { class: "typebadge-label" }, text);
    return span;
}

/** Attach click + keyboard behavior for clickable badges. */
function attachClickBehavior(
    el: HTMLElement,
    onClick?: () => void
): void
{
    if (!onClick) { return; }

    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.style.cursor = "pointer";

    el.addEventListener("click", () => { onClick(); });
    el.addEventListener("keydown", (e: KeyboardEvent) =>
    {
        logTrace("keydown handler:", { key: e.key.length > 1 ? e.key : "(char)", ctrl: e.ctrlKey });
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            onClick();
        }
    });
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a TypeBadge element.
 * Returns a plain HTMLElement (no class handle, no lifecycle).
 */
// @entrypoint
export function createTypeBadge(options: TypeBadgeOptions): HTMLElement
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.typeKey === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.typeKey is required. `
            + "Pass it when creating the TypeBadge.");
    }

    const size = options.size ?? "sm";
    const variant = options.variant ?? "subtle";
    const color = resolveColor(options.color);
    const label = extractDisplayName(
        options.typeKey,
        options.showNamespace === true,
        options.displayName
    );

    const classes = [
        "typebadge",
        `typebadge-${size}`,
        `typebadge-${variant}`
    ];
    if (options.clickable) { classes.push("typebadge-clickable"); }

    const root = htmlEl("span", {
        class: classes.join(" "),
        "aria-label": `Type: ${label}`
    });

    // Only a colour the caller actually chose goes inline. Without
    // one the stylesheet's theme-aware defaults stay in force and the
    // badge flips with the theme.
    if (color !== null)
    {
        root.style.setProperty("--tb-color", color);
        if (variant === "subtle")
        {
            root.style.setProperty("--tb-bg", hexToRgba(color, 0.1));
        }
        else if (variant === "filled")
        {
            root.style.setProperty("--tb-bg", color);
            root.style.setProperty("--tb-fg", readableOn(color));
        }
    }

    if (options.icon)
    {
        root.appendChild(buildIcon(options.icon, size));
    }
    root.appendChild(buildLabel(label));

    if (options.clickable)
    {
        attachClickBehavior(root, options.onClick);
    }

    logInfo("Created badge:", options.typeKey);
    return root;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createTypeBadge = createTypeBadge;
