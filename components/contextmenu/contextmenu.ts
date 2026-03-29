/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ContextMenu
 * 📜 PURPOSE: Theme-aware, accessible context menu with icons, shortcuts,
 *    separators, sub-menus, keyboard navigation, and viewport edge detection.
 * 🔗 RELATES: [[EnterpriseTheme]], [[Explorer]]
 * ⚡ FLOW: [Consumer] -> [createContextMenu(opts)] -> [ContextMenu]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[ContextMenu]";

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

/** Fade-in animation duration in ms. */
const ANIMATION_DURATION = 150;

/** Default minimum width in px. */
const DEFAULT_MIN_WIDTH = 200;

/** Default maximum width in px. */
const DEFAULT_MAX_WIDTH = 320;

/** Sub-menu hover delay in ms. */
const SUBMENU_DELAY = 200;

// ============================================================================
// INTERFACES
// ============================================================================

/** Configuration for a single menu item. */
export interface ContextMenuItem
{
    /** Unique identifier. */
    id: string;
    /** Display label. */
    label: string;
    /** Bootstrap icon name (without bi- prefix). */
    icon?: string;
    /** Keyboard shortcut hint (e.g. "Ctrl+C"). */
    shortcut?: string;
    /** Whether the item is disabled. */
    disabled?: boolean;
    /** Checkmark state. */
    checked?: boolean;
    /** Radio-style active state. */
    active?: boolean;
    /** Item type: normal, separator, header, or sub-menu trigger. */
    type?: "item" | "separator" | "header" | "submenu";
    /** Red styling for destructive actions. */
    danger?: boolean;
    /** Child items for sub-menus. */
    children?: ContextMenuItem[];
    /** Click handler. */
    onClick?: (item: ContextMenuItem) => void;
}

/** Configuration for the context menu. */
export interface ContextMenuOptions
{
    /** Menu items. */
    items: ContextMenuItem[];
    /** Horizontal position in px. */
    x: number;
    /** Vertical position in px. */
    y: number;
    /** Theme preference. Default: "auto". */
    theme?: "light" | "dark" | "auto";
    /** Minimum width in px. Default: 200. */
    minWidth?: number;
    /** Maximum width in px. Default: 320. */
    maxWidth?: number;
    /** Callback when menu closes. */
    onClose?: () => void;
    /** Close on outside click. Default: true. */
    autoClose?: boolean;
    /** Close on Escape key. Default: true. */
    closeOnEscape?: boolean;
    /** Animation style. Default: "fade". */
    animation?: "fade" | "scale" | "none";
}

/** Public API handle for a context menu instance. */
export interface ContextMenu
{
    /** Close the menu. */
    close(): void;
    /** Whether the menu is currently visible. */
    isOpen(): boolean;
    /** Replace the menu items. */
    updateItems(items: ContextMenuItem[]): void;
    /** Tear down the menu and all listeners. */
    destroy(): void;
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
// FACTORY
// ============================================================================

/**
 * Create and display a context menu at the specified position.
 * Returns a handle for programmatic control.
 */
export function createContextMenu(options: ContextMenuOptions): ContextMenu
{
    if (!options.items || options.items.length === 0)
    {
        logWarn("No items provided");
    }

    const state = buildInitialState(options);

    state.menuEl = buildMenu(state);
    document.body.appendChild(state.menuEl);

    positionMenu(state);
    animateIn(state);
    focusFirstItem(state.menuEl);
    attachGlobalListeners(state);

    logInfo("Opened at", options.x, options.y);

    return buildHandle(state);
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

/** Internal mutable state for a context menu instance. */
interface MenuState
{
    options: ContextMenuOptions;
    menuEl: HTMLElement;
    open: boolean;
    destroyed: boolean;
    activeSubmenu: HTMLElement | null;
    submenuTimer: number;
    handleOutsideClick: (e: MouseEvent) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
}

/** Build the initial state object from options. */
function buildInitialState(options: ContextMenuOptions): MenuState
{
    const state: MenuState = {
        options,
        menuEl: null as unknown as HTMLElement,
        open: true,
        destroyed: false,
        activeSubmenu: null,
        submenuTimer: 0,
        handleOutsideClick: () => {},
        handleKeyDown: () => {},
    };

    state.handleOutsideClick = (e: MouseEvent) => onOutsideClick(state, e);
    state.handleKeyDown = (e: KeyboardEvent) => onKeyDown(state, e);

    return state;
}

/** Build the public API handle. */
function buildHandle(state: MenuState): ContextMenu
{
    return {
        close: () => closeMenu(state),
        isOpen: () => state.open,
        updateItems: (items: ContextMenuItem[]) => updateItems(state, items),
        destroy: () => destroyMenu(state),
    };
}

// ============================================================================
// MENU BUILDING
// ============================================================================

/** Build the root menu element with all items. */
function buildMenu(state: MenuState): HTMLElement
{
    const opts = state.options;
    const menu = createElement("div", "contextmenu");
    const minW = opts.minWidth ?? DEFAULT_MIN_WIDTH;
    const maxW = opts.maxWidth ?? DEFAULT_MAX_WIDTH;

    setAttr(menu, {
        role: "menu",
        "aria-label": "Context menu",
    });

    menu.style.minWidth = `${minW}px`;
    menu.style.maxWidth = `${maxW}px`;

    applyTheme(menu, opts.theme ?? "auto");
    renderItems(menu, state, opts.items);

    return menu;
}

/** Apply the theme class based on the preference. */
function applyTheme(menu: HTMLElement, theme: string): void
{
    if (theme === "dark")
    {
        menu.classList.add("contextmenu-dark");
    }
    else if (theme === "light")
    {
        menu.classList.add("contextmenu-light");
    }
}

/** Render all items into a container element. */
function renderItems(
    container: HTMLElement,
    state: MenuState,
    items: ContextMenuItem[]): void
{
    for (const item of items)
    {
        const el = buildItemElement(state, item);
        container.appendChild(el);
    }
}

/** Build a single menu item DOM element based on its type. */
function buildItemElement(state: MenuState, item: ContextMenuItem): HTMLElement
{
    const type = item.type ?? "item";

    if (type === "separator")
    {
        return buildSeparator();
    }

    if (type === "header")
    {
        return buildHeader(item);
    }

    if (type === "submenu")
    {
        return buildSubmenuTrigger(state, item);
    }

    return buildMenuItem(state, item);
}

/** Build a separator element. */
function buildSeparator(): HTMLElement
{
    const sep = createElement("div", "contextmenu-separator");
    setAttr(sep, { role: "separator" });
    return sep;
}

/** Build a non-clickable header element. */
function buildHeader(item: ContextMenuItem): HTMLElement
{
    const hdr = createElement("div", "contextmenu-header");
    hdr.textContent = item.label;
    return hdr;
}

/** Build a standard clickable menu item. */
function buildMenuItem(state: MenuState, item: ContextMenuItem): HTMLElement
{
    const el = createElement("div", buildItemClasses(item));

    setAttr(el, { role: "menuitem", tabindex: "-1" });
    applyItemState(el, item);
    appendItemContent(el, item);
    attachItemClick(el, state, item);

    return el;
}

/** Compute CSS classes for an item. */
function buildItemClasses(item: ContextMenuItem): string
{
    const classes = ["contextmenu-item"];

    if (item.disabled)
    {
        classes.push("contextmenu-item-disabled");
    }

    if (item.danger)
    {
        classes.push("contextmenu-item-danger");
    }

    if (item.checked || item.active)
    {
        classes.push("contextmenu-item-checked");
    }

    return classes.join(" ");
}

/** Apply ARIA state attributes to an item element. */
function applyItemState(el: HTMLElement, item: ContextMenuItem): void
{
    if (item.disabled)
    {
        setAttr(el, { "aria-disabled": "true" });
    }

    if (item.checked !== undefined)
    {
        setAttr(el, { "aria-checked": String(item.checked) });
    }

    if (item.active !== undefined)
    {
        setAttr(el, { "aria-checked": String(item.active) });
    }
}

/** Append icon, label, and shortcut elements to an item. */
function appendItemContent(el: HTMLElement, item: ContextMenuItem): void
{
    appendIcon(el, item);

    const label = createElement("span", "contextmenu-label");
    label.textContent = item.label;
    el.appendChild(label);

    if (item.shortcut)
    {
        const shortcut = createElement("span", "contextmenu-shortcut");
        shortcut.textContent = item.shortcut;
        el.appendChild(shortcut);
    }
}

/** Append an icon element (checkmark, custom icon, or spacer). */
function appendIcon(el: HTMLElement, item: ContextMenuItem): void
{
    const iconEl = createElement("span", "contextmenu-icon");

    if (item.checked || item.active)
    {
        const check = createElement("i", "bi bi-check-lg");
        iconEl.appendChild(check);
    }
    else if (item.icon)
    {
        const ico = createElement("i", `bi bi-${item.icon}`);
        iconEl.appendChild(ico);
    }

    el.appendChild(iconEl);
}

/** Attach click handler to a menu item. */
function attachItemClick(
    el: HTMLElement,
    state: MenuState,
    item: ContextMenuItem): void
{
    if (item.disabled)
    {
        return;
    }

    el.addEventListener("click", () =>
    {
        if (item.onClick)
        {
            item.onClick(item);
        }

        closeMenu(state);
    });
}

// ============================================================================
// SUB-MENU
// ============================================================================

/** Build a sub-menu trigger item with arrow indicator. */
function buildSubmenuTrigger(
    state: MenuState,
    item: ContextMenuItem): HTMLElement
{
    const el = createElement("div", buildItemClasses(item));

    setAttr(el, {
        role: "menuitem",
        tabindex: "-1",
        "aria-haspopup": "menu",
    });

    applyItemState(el, item);
    appendIcon(el, item);

    const label = createElement("span", "contextmenu-label");
    label.textContent = item.label;
    el.appendChild(label);

    const arrow = createElement("span", "contextmenu-arrow");
    arrow.textContent = "\u25B6";
    el.appendChild(arrow);

    attachSubmenuEvents(el, state, item);

    return el;
}

/** Attach hover and keyboard events for sub-menu opening. */
function attachSubmenuEvents(
    el: HTMLElement,
    state: MenuState,
    item: ContextMenuItem): void
{
    el.addEventListener("mouseenter", () =>
    {
        clearTimeout(state.submenuTimer);
        state.submenuTimer = window.setTimeout(
            () => openSubmenu(el, state, item),
            SUBMENU_DELAY
        );
    });

    el.addEventListener("mouseleave", () =>
    {
        clearTimeout(state.submenuTimer);
    });
}

/** Open a sub-menu panel next to its trigger element. */
function openSubmenu(
    trigger: HTMLElement,
    state: MenuState,
    item: ContextMenuItem): void
{
    closeActiveSubmenu(state);

    if (!item.children || item.children.length === 0)
    {
        return;
    }

    const sub = createElement("div", "contextmenu contextmenu-submenu");
    setAttr(sub, { role: "menu" });

    renderItems(sub, state, item.children);
    document.body.appendChild(sub);

    positionSubmenu(trigger, sub);
    state.activeSubmenu = sub;
}

/** Position a sub-menu relative to its trigger, with viewport clamping. */
function positionSubmenu(trigger: HTMLElement, sub: HTMLElement): void
{
    const rect = trigger.getBoundingClientRect();
    let left = rect.right;
    let top = rect.top;

    sub.style.position = "fixed";
    sub.style.left = `${left}px`;
    sub.style.top = `${top}px`;

    // Defer viewport check to allow rendering
    requestAnimationFrame(() =>
    {
        const subRect = sub.getBoundingClientRect();

        if ((left + subRect.width) > window.innerWidth)
        {
            left = rect.left - subRect.width;
        }

        if ((top + subRect.height) > window.innerHeight)
        {
            top = window.innerHeight - subRect.height;
        }

        sub.style.left = `${Math.max(0, left)}px`;
        sub.style.top = `${Math.max(0, top)}px`;
    });
}

/** Close the currently active sub-menu. */
function closeActiveSubmenu(state: MenuState): void
{
    if (state.activeSubmenu)
    {
        state.activeSubmenu.remove();
        state.activeSubmenu = null;
    }
}

// ============================================================================
// POSITIONING
// ============================================================================

/** Position the main menu at (x, y), flipping if near viewport edges. */
function positionMenu(state: MenuState): void
{
    const menu = state.menuEl;
    const { x, y } = state.options;

    menu.style.position = "fixed";
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // Defer viewport adjustment to allow layout
    requestAnimationFrame(() => adjustMenuPosition(menu, x, y));
}

/** Adjust menu position to stay within viewport bounds. */
function adjustMenuPosition(
    menu: HTMLElement,
    x: number,
    y: number): void
{
    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;

    if ((x + rect.width) > window.innerWidth)
    {
        left = x - rect.width;
    }

    if ((y + rect.height) > window.innerHeight)
    {
        top = y - rect.height;
    }

    menu.style.left = `${Math.max(0, left)}px`;
    menu.style.top = `${Math.max(0, top)}px`;
}

// ============================================================================
// ANIMATION
// ============================================================================

/** Fade-in the menu on open. */
function animateIn(state: MenuState): void
{
    const anim = state.options.animation ?? "fade";

    if (anim === "none")
    {
        state.menuEl.style.opacity = "1";
        return;
    }

    state.menuEl.style.opacity = "0";

    if (anim === "scale")
    {
        state.menuEl.style.transform = "scale(0.95)";
    }

    requestAnimationFrame(() =>
    {
        state.menuEl.style.transition =
            `opacity ${ANIMATION_DURATION}ms ease, transform ${ANIMATION_DURATION}ms ease`;
        state.menuEl.style.opacity = "1";

        if (anim === "scale")
        {
            state.menuEl.style.transform = "scale(1)";
        }
    });
}

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/** Focus the first non-disabled menu item. */
function focusFirstItem(container: HTMLElement): void
{
    const items = getFocusableItems(container);

    if (items.length > 0)
    {
        items[0].focus();
    }
}

/** Get all focusable (non-disabled) items within a container. */
function getFocusableItems(container: HTMLElement): HTMLElement[]
{
    const all = Array.from(
        container.querySelectorAll<HTMLElement>(".contextmenu-item")
    );

    return all.filter(
        el => !el.classList.contains("contextmenu-item-disabled")
    );
}

/** Move focus by the specified delta (-1 for up, +1 for down). */
function moveFocus(container: HTMLElement, delta: number): void
{
    const items = getFocusableItems(container);

    if (items.length === 0)
    {
        return;
    }

    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);
    const next = (idx + delta + items.length) % items.length;

    items[next].focus();
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/** Attach global event listeners for outside click and keyboard. */
function attachGlobalListeners(state: MenuState): void
{
    const autoClose = state.options.autoClose !== false;
    const closeOnEscape = state.options.closeOnEscape !== false;

    if (autoClose)
    {
        // Use setTimeout to avoid the opening click triggering immediate close
        setTimeout(() =>
        {
            document.addEventListener("mousedown", state.handleOutsideClick);
        }, 0);
    }

    if (closeOnEscape)
    {
        document.addEventListener("keydown", state.handleKeyDown);
    }
}

/** Remove global event listeners. */
function removeGlobalListeners(state: MenuState): void
{
    document.removeEventListener("mousedown", state.handleOutsideClick);
    document.removeEventListener("keydown", state.handleKeyDown);
}

/** Handle clicks outside the menu to close it. */
function onOutsideClick(state: MenuState, e: MouseEvent): void
{
    const target = e.target as HTMLElement;

    if (!state.menuEl.contains(target) &&
        !(state.activeSubmenu && state.activeSubmenu.contains(target)))
    {
        closeMenu(state);
    }
}

/** Handle keyboard navigation within the menu. */
function onKeyDown(state: MenuState, e: KeyboardEvent): void
{
    switch (e.key)
    {
        case "Escape":
            handleEscape(state, e);
            break;
        case "ArrowDown":
            e.preventDefault();
            moveFocus(state.menuEl, 1);
            break;
        case "ArrowUp":
            e.preventDefault();
            moveFocus(state.menuEl, -1);
            break;
        case "ArrowRight":
            handleArrowRight(state, e);
            break;
        case "ArrowLeft":
            handleArrowLeft(state, e);
            break;
        case "Enter":
            handleEnter(e);
            break;
    }
}

/** Handle Escape key: close sub-menu or main menu. */
function handleEscape(state: MenuState, e: KeyboardEvent): void
{
    e.preventDefault();

    if (state.activeSubmenu)
    {
        closeActiveSubmenu(state);
        return;
    }

    closeMenu(state);
}

/** Handle ArrowRight: open sub-menu on a sub-menu trigger. */
function handleArrowRight(state: MenuState, e: KeyboardEvent): void
{
    const focused = document.activeElement as HTMLElement;

    if (focused && focused.getAttribute("aria-haspopup") === "menu")
    {
        e.preventDefault();
        focused.dispatchEvent(new MouseEvent("mouseenter"));
    }
}

/** Handle ArrowLeft: close the active sub-menu. */
function handleArrowLeft(state: MenuState, e: KeyboardEvent): void
{
    if (state.activeSubmenu)
    {
        e.preventDefault();
        closeActiveSubmenu(state);
    }
}

/** Handle Enter: click the focused item. */
function handleEnter(e: KeyboardEvent): void
{
    const focused = document.activeElement as HTMLElement;

    if (focused && focused.classList.contains("contextmenu-item"))
    {
        e.preventDefault();
        focused.click();
    }
}

// ============================================================================
// LIFECYCLE
// ============================================================================

/** Close the menu and clean up. */
function closeMenu(state: MenuState): void
{
    if (!state.open)
    {
        return;
    }

    state.open = false;

    closeActiveSubmenu(state);
    removeGlobalListeners(state);

    if (state.menuEl.parentNode)
    {
        state.menuEl.remove();
    }

    if (state.options.onClose)
    {
        state.options.onClose();
    }

    logInfo("Closed");
}

/** Replace items in an open menu. */
function updateItems(state: MenuState, items: ContextMenuItem[]): void
{
    if (state.destroyed)
    {
        logWarn("Cannot update — menu is destroyed");
        return;
    }

    state.options.items = items;
    state.menuEl.innerHTML = "";
    renderItems(state.menuEl, state, items);
}

/** Destroy the menu instance permanently. */
function destroyMenu(state: MenuState): void
{
    if (state.destroyed)
    {
        return;
    }

    closeMenu(state);
    state.destroyed = true;

    logInfo("Destroyed");
}

// ============================================================================
// WINDOW GLOBAL
// ============================================================================

(window as unknown as Record<string, unknown>).createContextMenu = createContextMenu;
