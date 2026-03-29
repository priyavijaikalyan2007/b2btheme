/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: InlineToolbar
 * PURPOSE: Compact inline toolbar that renders INSIDE a container as a flex
 *          row. Supports icon buttons, toggles, separators, and three sizes.
 * RELATES: [[EnterpriseTheme]], [[Explorer]], [[TabbedPanel]]
 * FLOW: [createInlineToolbar()] -> [container DOM] -> [flex button row]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[InlineToolbar]";

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

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration for a single toolbar item. */
export interface InlineToolbarItem
{
    /** Unique identifier for this item. */
    id: string;
    /** Bootstrap icon name without the bi- prefix. */
    icon: string;
    /** Tooltip text shown on hover. */
    tooltip: string;
    /** Item type. Default: "button". */
    type?: "button" | "toggle" | "separator";
    /** Whether the toggle is active. Only meaningful for type "toggle". */
    active?: boolean;
    /** Whether the item is disabled. */
    disabled?: boolean;
    /** Click callback. Receives the item config and current active state. */
    onClick?: (item: InlineToolbarItem, active: boolean) => void;
}

/** Configuration for the inline toolbar. */
export interface InlineToolbarOptions
{
    /** Container element to render inside. Required. */
    container: HTMLElement;
    /** Toolbar items to render. */
    items: InlineToolbarItem[];
    /** Button height: xs=24px, sm=28px, md=32px. Default: "sm". */
    size?: "xs" | "sm" | "md";
    /** Horizontal alignment. Default: "left". */
    align?: "left" | "center" | "right";
    /** Reduce gaps for tight spaces. Default: false. */
    compact?: boolean;
}

/** Public handle returned to the consumer. */
export interface InlineToolbar
{
    /** Enable or disable an item by id. */
    setItemDisabled(id: string, disabled: boolean): void;
    /** Set toggle active state by id. */
    setItemActive(id: string, active: boolean): void;
    /** Show the toolbar (remove display:none). */
    show(): void;
    /** Hide the toolbar (display:none). */
    hide(): void;
    /** Remove toolbar from DOM and clean up. */
    destroy(): void;
    /** Return the toolbar root element. */
    getElement(): HTMLElement;
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
// ITEM RENDERING
// ============================================================================

/** Build a separator element. */
function buildSeparator(): HTMLElement
{
    return createElement("span", "inlinetoolbar-separator");
}

/** Build a single button element for an item. */
function buildButton(item: InlineToolbarItem): HTMLElement
{
    const btn = createElement("button", "inlinetoolbar-btn");
    setAttr(btn, {
        type: "button",
        title: item.tooltip,
        "data-item-id": item.id,
        "aria-label": item.tooltip,
    });

    const icon = createElement("i", `bi bi-${item.icon}`);
    setAttr(icon, { "aria-hidden": "true" });
    btn.appendChild(icon);

    applyButtonState(btn, item);
    return btn;
}

/** Apply active and disabled state classes to a button. */
function applyButtonState(btn: HTMLElement, item: InlineToolbarItem): void
{
    if (item.disabled)
    {
        btn.classList.add("inlinetoolbar-btn-disabled");
        (btn as HTMLButtonElement).disabled = true;
    }

    if (item.type === "toggle" && item.active)
    {
        btn.classList.add("inlinetoolbar-btn-active");
    }
}

// ============================================================================
// TOOLBAR CONSTRUCTION
// ============================================================================

/** Build the toolbar root element with size and alignment classes. */
function buildToolbarRoot(options: InlineToolbarOptions): HTMLElement
{
    const size = options.size ?? "sm";
    const align = options.align ?? "left";
    const compact = options.compact ? " inlinetoolbar-compact" : "";
    const cls = `inlinetoolbar inlinetoolbar-${size} inlinetoolbar-align-${align}${compact}`;

    const root = createElement("div", cls);
    setAttr(root, { role: "toolbar", "aria-label": "Inline toolbar" });

    return root;
}

/** Render all items into the toolbar root. */
function renderItems(
    root: HTMLElement,
    items: InlineToolbarItem[]
): void
{
    for (const item of items)
    {
        if (item.type === "separator")
        {
            root.appendChild(buildSeparator());
            continue;
        }
        root.appendChild(buildButton(item));
    }
}

/** Bind click handlers for all items via event delegation. */
function bindClickHandlers(
    root: HTMLElement,
    items: InlineToolbarItem[]
): void
{
    root.addEventListener("click", (e: Event) =>
    {
        const btn = (e.target as HTMLElement).closest(
            ".inlinetoolbar-btn"
        ) as HTMLElement | null;

        if (!btn) { return; }
        handleButtonClick(btn, items);
    });
}

/** Handle a click on a toolbar button. */
function handleButtonClick(
    btn: HTMLElement,
    items: InlineToolbarItem[]
): void
{
    const itemId = btn.getAttribute("data-item-id");
    const item = items.find((i) => i.id === itemId);

    if (!item || item.disabled) { return; }

    if (item.type === "toggle")
    {
        item.active = !item.active;
        btn.classList.toggle("inlinetoolbar-btn-active", item.active);
    }

    item.onClick?.(item, item.active ?? false);
}

// ============================================================================
// FACTORY
// ============================================================================

/** Create an inline toolbar inside the given container. */
export function createInlineToolbar(options: InlineToolbarOptions): InlineToolbar
{
    if (!options.container)
    {
        logError("No container element provided");
        throw new Error("InlineToolbar requires a container element");
    }

    if (!options.items || options.items.length === 0)
    {
        logWarn("No items provided");
    }

    const root = buildToolbarRoot(options);

    renderItems(root, options.items);
    bindClickHandlers(root, options.items);
    options.container.appendChild(root);

    logInfo("Created with", options.items.length, "items");

    return buildHandle(root, options.items);
}

/** Build the public API handle. */
function buildHandle(
    root: HTMLElement,
    items: InlineToolbarItem[]
): InlineToolbar
{
    return {
        setItemDisabled(id: string, disabled: boolean): void
        {
            const btn = root.querySelector(
                `[data-item-id="${id}"]`
            ) as HTMLButtonElement | null;
            const item = items.find((i) => i.id === id);

            if (!btn || !item) { return; }

            item.disabled = disabled;
            btn.disabled = disabled;
            btn.classList.toggle("inlinetoolbar-btn-disabled", disabled);
        },

        setItemActive(id: string, active: boolean): void
        {
            const btn = root.querySelector(
                `[data-item-id="${id}"]`
            ) as HTMLElement | null;
            const item = items.find((i) => i.id === id);

            if (!btn || !item) { return; }

            item.active = active;
            btn.classList.toggle("inlinetoolbar-btn-active", active);
        },

        show(): void
        {
            root.style.display = "";
        },

        hide(): void
        {
            root.style.display = "none";
        },

        destroy(): void
        {
            root.remove();
            logInfo("Destroyed");
        },

        getElement(): HTMLElement
        {
            return root;
        },
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createInlineToolbar = createInlineToolbar;
