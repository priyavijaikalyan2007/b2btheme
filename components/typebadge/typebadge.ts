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

/** Default color when none provided. Matches $gray-600. */
const DEFAULT_COLOR = "#475569";

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

/** Resolve color, defaulting to gray-600 hex. */
function resolveColor(color?: string): string
{
    return color && color.length > 0 ? color : DEFAULT_COLOR;
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

    // Apply color via CSS custom properties
    root.style.setProperty("--tb-color", color);
    if (variant === "subtle")
    {
        root.style.setProperty("--tb-bg", hexToRgba(color, 0.1));
    }
    else if (variant === "filled")
    {
        root.style.setProperty("--tb-bg", color);
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

    console.log(LOG_PREFIX, "Created badge:", options.typeKey);
    return root;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createTypeBadge = createTypeBadge;
