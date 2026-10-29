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

    /** The surface contract (additive): InlineToolbar has no data slots, so this throws. */
    setData(slot: string, value: unknown): void;
    /** Subscribes to "itemClick": { id, active }, after the item's onClick. Returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** Nothing to restore (ADR-229): returns {}. */
    getState(): Record<string, unknown>;
    /** Nothing to restore (ADR-229): does nothing. */
    setState(state: Record<string, unknown>): void;
}

/** Subscribers of the "itemClick" channel. */
type ItemClickHandlers = Set<(payload: unknown) => void>;

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
        btn.setAttribute("aria-disabled", "true");
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
    items: InlineToolbarItem[],
    itemClickHandlers: ItemClickHandlers
): void
{
    root.addEventListener("click", (e: Event) =>
    {
        const btn = (e.target as HTMLElement).closest(
            ".inlinetoolbar-btn"
        ) as HTMLElement | null;

        if (!btn) { return; }
        handleButtonClick(btn, items, itemClickHandlers);
    });
}

/** Handle a click on a toolbar button. */
function handleButtonClick(
    btn: HTMLElement,
    items: InlineToolbarItem[],
    itemClickHandlers: ItemClickHandlers
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

    const active = item.active ?? false;

    item.onClick?.(item, active);

    // Fresh JSON object per handler, so no subscriber can mutate another's payload.
    for (const handler of itemClickHandlers)
    {
        try { handler({ id: item.id, active }); }
        catch (err) { logError("itemClick handler threw:", err); }
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/** Create an inline toolbar inside the given container. */
export function createInlineToolbar(options: InlineToolbarOptions): InlineToolbar
{
    // ERR-2. AGENTS.md: a missing option throws, it does not
    // get a silent default. This used to reach the field and
    // crash a frame later with a TypeError that names the line
    // rather than the thing the caller left out. Absent means
    // undefined, so an empty array or a zero is present.
    if (options.items === undefined)
    {
        throw new Error(
            `${LOG_PREFIX} options.items is required. `
            + "Pass it when creating the InlineToolbar.");
    }

    if (!options.container)
    {
        logError("No container element provided");
        throw new Error(
            `${LOG_PREFIX} options.container was not an element. `
            + "Pass the element to mount into, and check it for null before you do.");
    }

    if (!options.items || options.items.length === 0)
    {
        logWarn("No items provided");
    }

    const root = buildToolbarRoot(options);

    renderItems(root, options.items);

    const itemClickHandlers: ItemClickHandlers = new Set();

    bindClickHandlers(root, options.items, itemClickHandlers);
    options.container.appendChild(root);

    logInfo("Created with", options.items.length, "items");

    return buildHandle(root, options.items, itemClickHandlers);
}

/** Build the public API handle. */
function buildHandle(
    root: HTMLElement,
    items: InlineToolbarItem[],
    itemClickHandlers: ItemClickHandlers
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
            if (disabled) { btn.setAttribute("aria-disabled", "true"); }
            else { btn.removeAttribute("aria-disabled"); }
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
            itemClickHandlers.clear();
            root.remove();
            logInfo("Destroyed");
        },

        getElement(): HTMLElement
        {
            return root;
        },

        // ── Surface contract (additive, readiness step 2 B5) ──

        setData(slot: string, _value: unknown): void
        {
            throw new Error(
                `${LOG_PREFIX} setData("${slot}"): InlineToolbar has no data slots. `
                + "Use setItemDisabled() or setItemActive().");
        },

        on(channel: string, handler: (payload: unknown) => void): () => void
        {
            if (channel !== "itemClick")
            {
                throw new Error(`${LOG_PREFIX} on("${channel}"): the only channel is "itemClick".`);
            }

            itemClickHandlers.add(handler);

            return () => { itemClickHandlers.delete(handler); };
        },

        getState(): Record<string, unknown>
        {
            return {};
        },

        setState(_state: Record<string, unknown>): void
        {
            // No state keys to restore.
        },
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createInlineToolbar = createInlineToolbar;
