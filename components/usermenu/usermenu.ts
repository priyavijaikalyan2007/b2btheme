/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: UserMenu
 * 📜 PURPOSE: Avatar-triggered dropdown menu for user account actions. Shows
 *             user avatar (image or initials), name, role, status dot, and a
 *             dropdown menu with grouped items, dividers, headers, and sign-out.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer App] -> [createUserMenu()] -> [Dropdown Menu]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Single menu item, divider, or section header inside the dropdown. */
export interface UserMenuItem
{
    id: string;
    label: string;
    icon?: string;
    type?: "item" | "divider" | "header";
    disabled?: boolean;
    danger?: boolean;
}

/** Configuration options for the UserMenu component. */
export interface UserMenuOptions
{
    userName: string;
    userRole?: string;
    avatarUrl?: string;
    avatarInitials?: string;
    avatarColor?: string;
    status?: "online" | "offline" | "busy" | "away";
    menuItems: UserMenuItem[];
    onItemClick?: (itemId: string) => void;
    onSignOut?: () => void;
    size?: "sm" | "md" | "lg";
    cssClass?: string;
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[UserMenu]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

let instanceCounter = 0;

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    toggle: "Enter",
    toggleAlt: " ",
    close: "Escape",
    focusDown: "ArrowDown",
    focusUp: "ArrowUp",
    focusFirst: "Home",
    focusLast: "End",
    select: "Enter",
};

const STATUS_DOT_CLASSES: Record<string, string> = {
    online: "usermenu-status-online",
    offline: "usermenu-status-offline",
    busy: "usermenu-status-busy",
    away: "usermenu-status-away",
};

const AVATAR_SIZES: Record<string, number> = {
    sm: 28,
    md: 36,
    lg: 44,
};

const INITIALS_COLORS: string[] = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#862e9c",
    "#c92a2a", "#0b7285", "#5c940d", "#d6336c",
];

const CLS = "usermenu";

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Create an HTML element with optional CSS classes and text content.
 * Classes are provided as an array of individual class names.
 */
function createElement(tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

/** Set a single attribute on an element. */
function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

/** Safely invoke an optional callback, catching and logging errors. */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { logError("Callback error:", err); }
}

// ============================================================================
// CLASS: UserMenu
// ============================================================================

export class UserMenu
{
    // -- Instance ID ---------------------------------------------------------
    private readonly instanceId: number;

    // -- Options -------------------------------------------------------------
    private opts: UserMenuOptions;

    // -- DOM -----------------------------------------------------------------
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLButtonElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private headerNameEl: HTMLElement | null = null;
    private headerRoleEl: HTMLElement | null = null;
    private triggerNameEl: HTMLElement | null = null;
    private triggerAvatarEl: HTMLElement | null = null;
    private headerAvatarEl: HTMLElement | null = null;
    private statusDotTriggerEl: HTMLElement | null = null;
    private statusDotHeaderEl: HTMLElement | null = null;

    // -- State ---------------------------------------------------------------
    private opened = false;
    private destroyed = false;
    private focusedIndex = -1;

    // -- Bound handlers ------------------------------------------------------
    private boundOnTriggerClick = this.onTriggerClick.bind(this);
    private boundOnDocumentClick = this.onDocumentClick.bind(this);
    private boundOnTriggerKeydown = this.onTriggerKeydown.bind(this);
    private boundOnDropdownKeydown = this.onDropdownKeydown.bind(this);

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: UserMenuOptions)
    {
        instanceCounter++;
        this.instanceId = instanceCounter;

        this.opts = {
            size: "md",
            ...options,
        };

        this.rootEl = this.buildRoot();

        logInfo(`Instance ${this.instanceId} created for user "${this.opts.userName}"`);
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    /** Mount the component into a container element. */
    show(containerId: string): void
    {
        if (this.destroyed)
        {
            logWarn("Cannot show — already destroyed");
            return;
        }

        const container = document.getElementById(containerId);
        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }

        container.appendChild(this.rootEl!);
        this.attachListeners();
        logInfo(`Shown in container "${containerId}"`);
    }

    /** Remove the component from the DOM and detach listeners. */
    hide(): void
    {
        if (this.destroyed) { return; }
        this.close();
        this.detachListeners();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        logInfo("Hidden");
    }

    /** Full cleanup — removes from DOM and nullifies all references. */
    destroy(): void
    {
        if (this.destroyed)
        {
            logWarn("Already destroyed");
            return;
        }

        this.destroyed = true;
        this.close();
        this.detachListeners();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.nullifyReferences();
        logInfo(`Instance ${this.instanceId} destroyed`);
    }

    /** Return the root element, or null if destroyed. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // OPEN / CLOSE
    // ========================================================================

    /** Open the dropdown and focus the first actionable item. */
    open(): void
    {
        if (this.destroyed || this.opened) { return; }
        this.opened = true;
        this.rootEl?.classList.add(`${CLS}-open`);

        if (this.dropdownEl)
        {
            this.dropdownEl.style.display = "";
        }

        setAttr(this.triggerEl!, "aria-expanded", "true");
        this.focusItem(0);

        document.addEventListener("mousedown", this.boundOnDocumentClick, true);
        logDebug("Dropdown opened");
    }

    /** Close the dropdown and return focus to the trigger. */
    close(): void
    {
        if (!this.opened) { return; }
        this.opened = false;
        this.focusedIndex = -1;
        this.rootEl?.classList.remove(`${CLS}-open`);

        if (this.dropdownEl)
        {
            this.dropdownEl.style.display = "none";
        }

        if (this.triggerEl)
        {
            setAttr(this.triggerEl, "aria-expanded", "false");
        }

        this.clearItemHighlights();
        document.removeEventListener("mousedown", this.boundOnDocumentClick, true);
        logDebug("Dropdown closed");
    }

    /** Whether the dropdown is currently open. */
    isOpen(): boolean
    {
        return this.opened;
    }

    // ========================================================================
    // PUBLIC API — MUTATORS
    // ========================================================================

    /** Update the status dot on both trigger and header avatars. */
    setStatus(status: "online" | "offline" | "busy" | "away"): void
    {
        this.opts.status = status;
        this.replaceStatusDot(this.triggerAvatarEl, "trigger");
        this.replaceStatusDot(this.headerAvatarEl, "header");
        logDebug("Status updated to:", status);
    }

    /** Update the displayed user name in trigger and header. */
    setUserName(name: string): void
    {
        this.opts.userName = name;
        if (this.triggerNameEl) { this.triggerNameEl.textContent = name; }
        if (this.headerNameEl) { this.headerNameEl.textContent = name; }
        logDebug("User name updated to:", name);
    }

    /** Update the displayed role in the dropdown header. */
    setUserRole(role: string): void
    {
        this.opts.userRole = role;
        if (this.headerRoleEl) { this.headerRoleEl.textContent = role; }
        logDebug("User role updated to:", role);
    }

    /** Update the avatar image URL on trigger and header. */
    setAvatarUrl(url: string): void
    {
        this.opts.avatarUrl = url;
        this.rebuildTriggerAvatar();
        this.rebuildHeaderAvatar();
        logDebug("Avatar URL updated");
    }

    /** Replace the entire menu item list and rebuild the dropdown items. */
    setMenuItems(items: UserMenuItem[]): void
    {
        this.opts.menuItems = items;
        this.rebuildDropdownItems();
        logDebug("Menu items rebuilt:", items.length, "items");
    }

    // ========================================================================
    // BUILD — ROOT
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const size = this.opts.size ?? "md";
        const root = createElement("div", [CLS, `${CLS}-${size}`]);

        if (this.opts.cssClass)
        {
            root.classList.add(...this.opts.cssClass.split(" "));
        }

        this.triggerEl = this.buildTrigger() as HTMLButtonElement;
        root.appendChild(this.triggerEl);

        this.dropdownEl = this.buildDropdown();
        root.appendChild(this.dropdownEl);

        return root;
    }

    // ========================================================================
    // BUILD — TRIGGER
    // ========================================================================

    private buildTrigger(): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = `${CLS}-trigger`;
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-haspopup", "menu");
        setAttr(btn, "aria-expanded", "false");

        const size = this.opts.size ?? "md";
        this.triggerAvatarEl = this.buildAvatar(size);
        btn.appendChild(this.triggerAvatarEl);

        this.triggerNameEl = createElement(
            "span", [`${CLS}-trigger-name`], this.opts.userName
        );
        btn.appendChild(this.triggerNameEl);

        const chevron = this.buildChevronIcon();
        btn.appendChild(chevron);

        return btn;
    }

    private buildChevronIcon(): HTMLElement
    {
        const chevron = createElement("i", ["bi", "bi-chevron-down", `${CLS}-chevron`]);
        setAttr(chevron, "aria-hidden", "true");
        return chevron;
    }

    // ========================================================================
    // BUILD — AVATAR
    // ========================================================================

    private buildAvatar(size: string): HTMLElement
    {
        const container = createElement("div", [
            `${CLS}-avatar`, `${CLS}-avatar-${size}`,
        ]);

        if (this.opts.avatarUrl)
        {
            container.appendChild(this.buildAvatarImage(this.opts.avatarUrl));
        }
        else
        {
            const initials = this.resolveInitials();
            const color = this.resolveColor();
            container.appendChild(this.buildAvatarInitials(initials, color));
        }

        if (this.opts.status)
        {
            container.appendChild(this.buildStatusDot(this.opts.status));
        }

        return container;
    }

    private buildAvatarImage(url: string): HTMLElement
    {
        const img = document.createElement("img") as HTMLImageElement;
        img.className = `${CLS}-avatar-img`;
        img.src = url;
        img.alt = this.opts.userName;
        return img;
    }

    private buildAvatarInitials(initials: string, color: string): HTMLElement
    {
        const span = createElement("span", [`${CLS}-avatar-initials`], initials);
        span.style.backgroundColor = color;
        return span;
    }

    private buildStatusDot(status: string): HTMLElement
    {
        const dotClass = STATUS_DOT_CLASSES[status] ?? STATUS_DOT_CLASSES["offline"];
        const dot = createElement("span", [`${CLS}-status-dot`, dotClass]);
        return dot;
    }

    // ========================================================================
    // BUILD — DROPDOWN
    // ========================================================================

    private buildDropdown(): HTMLElement
    {
        const dropdown = createElement("div", [`${CLS}-dropdown`]);
        setAttr(dropdown, "role", "menu");
        setAttr(dropdown, "aria-label", "User menu");
        dropdown.style.display = "none";

        dropdown.appendChild(this.buildHeader());
        dropdown.appendChild(this.buildDivider());
        this.appendMenuItems(dropdown);

        return dropdown;
    }

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-header`]);

        this.headerAvatarEl = createElement("div", [
            `${CLS}-header-avatar`, `${CLS}-avatar`, `${CLS}-avatar-lg`,
        ]);
        this.rebuildAvatarContent(this.headerAvatarEl);
        header.appendChild(this.headerAvatarEl);

        const info = createElement("div", [`${CLS}-header-info`]);

        this.headerNameEl = createElement(
            "div", [`${CLS}-header-name`], this.opts.userName
        );
        info.appendChild(this.headerNameEl);

        this.headerRoleEl = createElement(
            "div", [`${CLS}-header-role`], this.opts.userRole ?? ""
        );
        info.appendChild(this.headerRoleEl);

        header.appendChild(info);
        return header;
    }

    private appendMenuItems(dropdown: HTMLElement): void
    {
        for (const item of this.opts.menuItems)
        {
            dropdown.appendChild(this.buildMenuEntry(item));
        }
    }

    private buildMenuEntry(item: UserMenuItem): HTMLElement
    {
        const type = item.type ?? "item";

        if (type === "divider")
        {
            return this.buildDivider();
        }

        if (type === "header")
        {
            return this.buildGroupHeader(item.label);
        }

        return this.buildMenuItem(item);
    }

    // ========================================================================
    // BUILD — MENU ITEM, DIVIDER, GROUP HEADER
    // ========================================================================

    private buildMenuItem(item: UserMenuItem): HTMLElement
    {
        const btn = document.createElement("button");
        btn.className = `${CLS}-item`;

        if (item.danger) { btn.classList.add(`${CLS}-item-danger`); }
        if (item.disabled) { btn.classList.add(`${CLS}-item-disabled`); }

        setAttr(btn, "role", "menuitem");
        setAttr(btn, "tabindex", "-1");
        setAttr(btn, "data-item-id", item.id);

        if (item.disabled)
        {
            setAttr(btn, "aria-disabled", "true");
        }

        if (item.icon)
        {
            btn.appendChild(this.buildItemIcon(item.icon));
        }

        const label = createElement("span", [`${CLS}-item-label`], item.label);
        btn.appendChild(label);

        btn.addEventListener("click", () =>
        {
            if (!item.disabled) { this.onItemClick(item.id); }
        });

        return btn;
    }

    private buildItemIcon(iconStr: string): HTMLElement
    {
        const iconClasses = ["bi"].concat(
            iconStr ? iconStr.split(" ") : []
        );
        iconClasses.push(`${CLS}-item-icon`);
        const icon = createElement("i", iconClasses);
        setAttr(icon, "aria-hidden", "true");
        return icon;
    }

    private buildDivider(): HTMLElement
    {
        return createElement("div", [`${CLS}-divider`]);
    }

    private buildGroupHeader(label: string): HTMLElement
    {
        return createElement("div", [`${CLS}-group-header`], label);
    }

    // ========================================================================
    // REBUILD HELPERS
    // ========================================================================

    /** Rebuild all dropdown menu items (items after the header+divider). */
    private rebuildDropdownItems(): void
    {
        if (!this.dropdownEl) { return; }

        // Remove everything after the header and the first divider (2 children).
        while (this.dropdownEl.children.length > 2)
        {
            this.dropdownEl.removeChild(this.dropdownEl.lastChild!);
        }

        this.appendMenuItems(this.dropdownEl);
    }

    /** Rebuild the trigger avatar element in-place. */
    private rebuildTriggerAvatar(): void
    {
        if (!this.triggerEl || !this.triggerAvatarEl) { return; }
        const size = this.opts.size ?? "md";
        const newAvatar = this.buildAvatar(size);
        this.triggerEl.replaceChild(newAvatar, this.triggerAvatarEl);
        this.triggerAvatarEl = newAvatar;
    }

    /** Rebuild the header avatar element in-place. */
    private rebuildHeaderAvatar(): void
    {
        if (!this.headerAvatarEl) { return; }
        const parent = this.headerAvatarEl.parentElement;
        if (!parent) { return; }

        const newAvatar = createElement("div", [
            `${CLS}-header-avatar`, `${CLS}-avatar`, `${CLS}-avatar-lg`,
        ]);
        this.rebuildAvatarContent(newAvatar);
        parent.replaceChild(newAvatar, this.headerAvatarEl);
        this.headerAvatarEl = newAvatar;
    }

    /** Populate an avatar container with either an image or initials + status dot. */
    private rebuildAvatarContent(container: HTMLElement): void
    {
        if (this.opts.avatarUrl)
        {
            container.appendChild(this.buildAvatarImage(this.opts.avatarUrl));
        }
        else
        {
            const initials = this.resolveInitials();
            const color = this.resolveColor();
            container.appendChild(this.buildAvatarInitials(initials, color));
        }

        if (this.opts.status)
        {
            container.appendChild(this.buildStatusDot(this.opts.status));
        }
    }

    /** Replace the status dot inside a given avatar container. */
    private replaceStatusDot(
        avatarContainer: HTMLElement | null,
        _context: string
    ): void
    {
        if (!avatarContainer) { return; }

        const existingDot = avatarContainer.querySelector(`.${CLS}-status-dot`);
        if (existingDot)
        {
            avatarContainer.removeChild(existingDot);
        }

        if (this.opts.status)
        {
            avatarContainer.appendChild(this.buildStatusDot(this.opts.status));
        }
    }

    // ========================================================================
    // LISTENERS
    // ========================================================================

    private attachListeners(): void
    {
        this.triggerEl?.addEventListener("click", this.boundOnTriggerClick);
        this.triggerEl?.addEventListener("keydown", this.boundOnTriggerKeydown);
        this.dropdownEl?.addEventListener("keydown", this.boundOnDropdownKeydown);
    }

    private detachListeners(): void
    {
        this.triggerEl?.removeEventListener("click", this.boundOnTriggerClick);
        this.triggerEl?.removeEventListener("keydown", this.boundOnTriggerKeydown);
        this.dropdownEl?.removeEventListener("keydown", this.boundOnDropdownKeydown);
        document.removeEventListener("mousedown", this.boundOnDocumentClick, true);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    private onTriggerClick(e: Event): void
    {
        e.preventDefault();
        e.stopPropagation();

        if (this.opened) { this.close(); }
        else { this.open(); }
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl) { return; }
        const target = e.target as Node;
        if (this.rootEl.contains(target)) { return; }
        this.close();
    }

    private onTriggerKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "toggle") || this.matchesKeyCombo(e, "toggleAlt"))
        {
            e.preventDefault();
            if (this.opened) { this.close(); }
            else { this.open(); }
        }
        else if (this.matchesKeyCombo(e, "focusDown"))
        {
            e.preventDefault();
            if (!this.opened) { this.open(); }
            else { this.focusItem(0); }
        }
    }

    private onDropdownKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "close"))
        {
            e.preventDefault();
            this.close();
            this.triggerEl?.focus();
            return;
        }

        this.handleDropdownNavigation(e);
    }

    /** Handle arrow, Home, End, and Enter keys within the dropdown. */
    private handleDropdownNavigation(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "focusDown"))
        {
            e.preventDefault();
            this.focusNextItem(1);
        }
        else if (this.matchesKeyCombo(e, "focusUp"))
        {
            e.preventDefault();
            this.focusNextItem(-1);
        }
        else if (this.matchesKeyCombo(e, "focusFirst"))
        {
            e.preventDefault();
            this.focusItem(0);
        }
        else if (this.matchesKeyCombo(e, "focusLast"))
        {
            e.preventDefault();
            const items = this.getMenuItemElements();
            this.focusItem(items.length - 1);
        }
        else if (this.matchesKeyCombo(e, "select"))
        {
            e.preventDefault();
            this.activateFocusedItem();
        }
    }

    private onItemClick(itemId: string): void
    {
        this.close();
        this.triggerEl?.focus();

        if (this.opts.onSignOut && itemId === "sign-out")
        {
            safeCallback(this.opts.onSignOut);
        }

        safeCallback(this.opts.onItemClick, itemId);
    }

    // ========================================================================
    // FOCUS MANAGEMENT
    // ========================================================================

    /** Focus the Nth actionable menuitem button. */
    private focusItem(index: number): void
    {
        const items = this.getMenuItemElements();
        if (index < 0 || index >= items.length) { return; }

        this.clearItemHighlights();
        this.focusedIndex = index;

        const target = items[index];
        target.classList.add(`${CLS}-item-highlighted`);
        target.focus();
    }

    /** Move focus forward or backward, skipping disabled items. */
    private focusNextItem(delta: number): void
    {
        const items = this.getMenuItemElements();
        if (items.length === 0) { return; }

        let next = this.focusedIndex + delta;

        // Wrap and skip disabled items (up to items.length attempts).
        for (let attempts = 0; attempts < items.length; attempts++)
        {
            if (next < 0) { next = items.length - 1; }
            if (next >= items.length) { next = 0; }

            if (!items[next].hasAttribute("aria-disabled"))
            {
                this.focusItem(next);
                return;
            }
            next += delta;
        }
    }

    /** Activate the currently focused menuitem. */
    private activateFocusedItem(): void
    {
        const items = this.getMenuItemElements();
        if (this.focusedIndex < 0 || this.focusedIndex >= items.length)
        {
            return;
        }

        const target = items[this.focusedIndex];
        const itemId = target.getAttribute("data-item-id");
        if (itemId && !target.hasAttribute("aria-disabled"))
        {
            this.onItemClick(itemId);
        }
    }

    /** Return all [role="menuitem"] buttons inside the dropdown. */
    private getMenuItemElements(): HTMLElement[]
    {
        if (!this.dropdownEl) { return []; }
        return Array.from(
            this.dropdownEl.querySelectorAll<HTMLElement>('[role="menuitem"]')
        );
    }

    /** Remove the highlighted class from all menu items. */
    private clearItemHighlights(): void
    {
        if (!this.dropdownEl) { return; }
        this.dropdownEl.querySelectorAll(`.${CLS}-item-highlighted`).forEach(el =>
        {
            el.classList.remove(`${CLS}-item-highlighted`);
        });
    }

    // ========================================================================
    // KEY BINDING HELPERS
    // ========================================================================

    /** Resolve the key combo string for a given action name. */
    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /** Check whether a keyboard event matches the combo for a given action. */
    private matchesKeyCombo(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo) { return false; }

        const parts = combo.split("+");
        const key = parts[parts.length - 1];
        const needCtrl = parts.includes("Ctrl");
        const needShift = parts.includes("Shift");
        const needAlt = parts.includes("Alt");

        return e.key === key
            && e.ctrlKey === needCtrl
            && e.shiftKey === needShift
            && e.altKey === needAlt;
    }

    // ========================================================================
    // AVATAR UTILITY
    // ========================================================================

    /** Resolve initials from options or derive from the user name. */
    private resolveInitials(): string
    {
        if (this.opts.avatarInitials)
        {
            return this.opts.avatarInitials;
        }
        return this.getInitialsFromName(this.opts.userName);
    }

    /** Resolve background color from options or derive from the user name. */
    private resolveColor(): string
    {
        if (this.opts.avatarColor)
        {
            return this.opts.avatarColor;
        }
        return this.getInitialsColor(this.opts.userName);
    }

    /** Extract first letters of first and last name for avatar initials. */
    private getInitialsFromName(name: string): string
    {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2)
        {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (parts[0] || "?").substring(0, 2).toUpperCase();
    }

    /** Deterministic background color from a name via simple hash. */
    private getInitialsColor(name: string): string
    {
        let hash = 0;
        for (let i = 0; i < name.length; i++)
        {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
    }

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /** Nullify all internal references for garbage collection. */
    private nullifyReferences(): void
    {
        this.rootEl = null;
        this.triggerEl = null;
        this.dropdownEl = null;
        this.headerNameEl = null;
        this.headerRoleEl = null;
        this.triggerNameEl = null;
        this.triggerAvatarEl = null;
        this.headerAvatarEl = null;
        this.statusDotTriggerEl = null;
        this.statusDotHeaderEl = null;
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory function: create a UserMenu and optionally mount it into a container.
 *
 * @param containerId - DOM ID of the container element
 * @param options - UserMenu configuration
 * @returns The created UserMenu instance
 */
export function createUserMenu(
    containerId: string,
    options: UserMenuOptions
): UserMenu
{
    const instance = new UserMenu(options);
    instance.show(containerId);
    return instance;
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["UserMenu"] = UserMenu;
(window as unknown as Record<string, unknown>)["createUserMenu"] = createUserMenu;
