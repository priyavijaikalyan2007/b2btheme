/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: NotificationCenter
 * 📜 PURPOSE: Aggregated in-app notification panel with bell trigger, unread
 *             badge, category filters, read/unread state, dismiss, and
 *             deep-link navigation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[NotificationCenterSpec]], [[Toast]]
 * ⚡ FLOW: [Consumer App] -> [createNotificationCenter()] -> [Bell + Panel]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[NotificationCenter]";
const DEFAULT_PANEL_WIDTH = 380;
const DEFAULT_MAX_VISIBLE_BADGE = 99;
const PANEL_Z_INDEX = 1070;
const RELATIVE_TIME_THRESHOLDS: [number, string][] = [
    [60, "just now"],
    [3600, "m ago"],
    [86400, "h ago"],
    [604800, "d ago"]
];

let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** A single notification item. */
export interface NotificationItem
{
    /** Unique identifier. */
    id: string;
    /** Notification title. */
    title: string;
    /** Detail message text. */
    message?: string;
    /** Category key matching a configured category. */
    category?: string;
    /** Bootstrap Icons class for the notification icon. */
    icon?: string;
    /** Avatar image URL (alternative to icon). */
    avatarUrl?: string;
    /** ISO timestamp string or Date. */
    timestamp: string | Date;
    /** Whether the notification has been read. Default: false. */
    read?: boolean;
    /** Arbitrary data payload for click callbacks. */
    data?: unknown;
}

/** A category tab for filtering notifications. */
export interface NotificationCategory
{
    /** Unique key matching NotificationItem.category. */
    id: string;
    /** Display label. */
    label: string;
    /** Bootstrap Icons class. */
    icon?: string;
}

/** Configuration options for the NotificationCenter component. */
export interface NotificationCenterOptions
{
    /** Container element to mount the bell trigger into. Required. */
    container: HTMLElement;
    /** Initial notifications. */
    notifications?: NotificationItem[];
    /** Category filter tabs. Default: single "All" tab. */
    categories?: NotificationCategory[];
    /** Panel width in px. Default: 380. */
    panelWidth?: number;
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Additional CSS class(es) on root. */
    cssClass?: string;
    /** Callback when a notification is clicked. */
    onNotificationClick?: (notification: NotificationItem) => void;
    /** Callback when a notification is dismissed. */
    onDismiss?: (id: string) => void;
    /** Callback when unread count changes. */
    onUnreadCountChange?: (count: number) => void;
    /** Callback when "Mark all read" is clicked. */
    onMarkAllRead?: () => void;
    /** Empty state message. Default: "No notifications". */
    emptyMessage?: string;
}

/** Public handle for controlling a NotificationCenter instance. */
export interface NotificationCenterHandle
{
    addNotification(notification: NotificationItem): void;
    removeNotification(id: string): void;
    markRead(id: string): void;
    markAllRead(): void;
    getUnreadCount(): number;
    setNotifications(notifications: NotificationItem[]): void;
    getNotifications(): NotificationItem[];
    setCategories(categories: NotificationCategory[]): void;
    open(): void;
    close(): void;
    toggle(): void;
    getElement(): HTMLElement;
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// NOTIFICATION CENTER CLASS
// ============================================================================

class NotificationCenter
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly options: NotificationCenterOptions;

    private notifications: NotificationItem[] = [];
    private categories: NotificationCategory[] = [];
    private activeCategory = "all";
    private panelWidth: number;
    private size: string;
    private isOpen = false;
    private destroyed = false;

    private bellEl: HTMLElement | null = null;
    private badgeEl: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;
    private liveRegion: HTMLElement | null = null;

    private boundOutsideClick: (e: MouseEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;

    constructor(options: NotificationCenterOptions)
    {
        instanceCounter++;
        this.id = `notificationcenter-${instanceCounter}`;
        this.container = options.container;
        this.options = options;
        this.panelWidth = options.panelWidth ?? DEFAULT_PANEL_WIDTH;
        this.size = options.size ?? "md";

        this.notifications = [...(options.notifications ?? [])];
        this.categories = options.categories
            ? [{ id: "all", label: "All" }, ...options.categories]
            : [{ id: "all", label: "All" }];

        this.boundOutsideClick = (e) => this.handleOutsideClick(e);
        this.boundKeyDown = (e) => this.handleKeyDown(e);

        this.buildBell();
        this.buildPanel();
        this.buildLiveRegion();
        this.updateBadge();

        document.addEventListener("mousedown", this.boundOutsideClick, true);
        document.addEventListener("keydown", this.boundKeyDown, true);

        console.log(LOG_PREFIX, "Created", this.id);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    addNotification(notification: NotificationItem): void
    {
        this.notifications.unshift({ ...notification, read: notification.read ?? false });
        this.updateBadge();
        this.pulseBell();

        if (this.isOpen) { this.renderList(); }
        this.announce(`New notification: ${notification.title}`);
    }

    removeNotification(id: string): void
    {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.updateBadge();

        if (this.isOpen) { this.renderList(); }
    }

    markRead(id: string): void
    {
        const n = this.notifications.find(item => item.id === id);
        if (n && !n.read)
        {
            n.read = true;
            this.updateBadge();
            if (this.isOpen) { this.renderList(); }
        }
    }

    markAllRead(): void
    {
        for (const n of this.notifications)
        {
            n.read = true;
        }
        this.updateBadge();
        if (this.isOpen) { this.renderList(); }
        if (this.options.onMarkAllRead) { this.options.onMarkAllRead(); }
    }

    getUnreadCount(): number
    {
        return this.notifications.filter(n => !n.read).length;
    }

    setNotifications(notifications: NotificationItem[]): void
    {
        this.notifications = notifications.map(n => ({
            ...n, read: n.read ?? false
        }));
        this.updateBadge();
        if (this.isOpen) { this.renderList(); }
    }

    getNotifications(): NotificationItem[]
    {
        return [...this.notifications];
    }

    setCategories(categories: NotificationCategory[]): void
    {
        this.categories = [{ id: "all", label: "All" }, ...categories];
        this.activeCategory = "all";
        if (this.isOpen) { this.renderPanel(); }
    }

    open(): void
    {
        if (this.isOpen || this.destroyed) { return; }
        this.isOpen = true;
        this.renderPanel();
        this.panelEl?.classList.add("notificationcenter-panel-open");
        this.bellEl?.setAttribute("aria-expanded", "true");
    }

    close(): void
    {
        if (!this.isOpen) { return; }
        this.isOpen = false;
        this.panelEl?.classList.remove("notificationcenter-panel-open");
        this.bellEl?.setAttribute("aria-expanded", "false");
    }

    toggle(): void
    {
        if (this.isOpen) { this.close(); } else { this.open(); }
    }

    getElement(): HTMLElement
    {
        return this.bellEl as HTMLElement;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.close();

        document.removeEventListener("mousedown", this.boundOutsideClick, true);
        document.removeEventListener("keydown", this.boundKeyDown, true);

        this.bellEl?.parentNode?.removeChild(this.bellEl);
        this.panelEl?.parentNode?.removeChild(this.panelEl);
        this.liveRegion?.parentNode?.removeChild(this.liveRegion);
        console.log(LOG_PREFIX, "Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: BELL TRIGGER
    // ====================================================================

    private buildBell(): void
    {
        const sizeClass = this.size !== "md"
            ? ` notificationcenter-${this.size}` : "";
        const extra = this.options.cssClass
            ? ` ${this.options.cssClass}` : "";

        this.bellEl = createElement(
            "button",
            `notificationcenter-bell${sizeClass}${extra}`
        );
        setAttr(this.bellEl, {
            type: "button",
            "aria-label": "Notifications",
            "aria-haspopup": "true",
            "aria-expanded": "false"
        });

        const icon = createElement("i", "bi bi-bell");
        setAttr(icon, { "aria-hidden": "true" });
        this.bellEl.appendChild(icon);

        this.badgeEl = createElement("span", "notificationcenter-badge");
        this.badgeEl.style.display = "none";
        this.bellEl.appendChild(this.badgeEl);

        this.bellEl.addEventListener("click", () => this.toggle());
        this.container.appendChild(this.bellEl);
    }

    private updateBadge(): void
    {
        const count = this.getUnreadCount();
        if (!this.badgeEl) { return; }

        if (count === 0)
        {
            this.badgeEl.style.display = "none";
            this.badgeEl.textContent = "";
        }
        else
        {
            this.badgeEl.style.display = "";
            this.badgeEl.textContent = count > DEFAULT_MAX_VISIBLE_BADGE
                ? `${DEFAULT_MAX_VISIBLE_BADGE}+`
                : String(count);
        }

        if (this.options.onUnreadCountChange)
        {
            this.options.onUnreadCountChange(count);
        }
    }

    private pulseBell(): void
    {
        if (!this.bellEl) { return; }
        this.bellEl.classList.remove("notificationcenter-bell-pulse");
        void this.bellEl.offsetWidth;
        this.bellEl.classList.add("notificationcenter-bell-pulse");
    }

    // ====================================================================
    // PRIVATE: PANEL
    // ====================================================================

    private buildPanel(): void
    {
        this.panelEl = createElement("div", "notificationcenter-panel");
        this.panelEl.id = `${this.id}-panel`;
        this.panelEl.style.width = `${this.panelWidth}px`;
        this.panelEl.style.zIndex = String(PANEL_Z_INDEX);
        setAttr(this.panelEl, {
            role: "region",
            "aria-label": "Notifications"
        });

        document.body.appendChild(this.panelEl);
    }

    private renderPanel(): void
    {
        if (!this.panelEl) { return; }
        this.panelEl.innerHTML = "";

        this.panelEl.appendChild(this.buildPanelHeader());
        if (this.categories.length > 1)
        {
            this.panelEl.appendChild(this.buildCategoryTabs());
        }

        this.listEl = createElement("div", "notificationcenter-list");
        setAttr(this.listEl, { role: "list" });
        this.panelEl.appendChild(this.listEl);
        this.renderList();
    }

    private buildPanelHeader(): HTMLElement
    {
        const header = createElement("div", "notificationcenter-header");

        const title = createElement("span", "notificationcenter-title");
        title.textContent = "Notifications";
        header.appendChild(title);

        const actions = createElement("div", "notificationcenter-header-actions");

        const markAllBtn = createElement("button", "notificationcenter-mark-all");
        setAttr(markAllBtn, { type: "button" });
        markAllBtn.textContent = "Mark all read";
        markAllBtn.addEventListener("click", () => this.markAllRead());
        actions.appendChild(markAllBtn);

        const closeBtn = createElement("button", "notificationcenter-close");
        setAttr(closeBtn, { type: "button", "aria-label": "Close" });
        const closeIcon = createElement("i", "bi bi-x-lg");
        setAttr(closeIcon, { "aria-hidden": "true" });
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener("click", () => this.close());
        actions.appendChild(closeBtn);

        header.appendChild(actions);
        return header;
    }

    // ====================================================================
    // PRIVATE: CATEGORY TABS
    // ====================================================================

    private buildCategoryTabs(): HTMLElement
    {
        const tabs = createElement("div", "notificationcenter-tabs");
        setAttr(tabs, { role: "tablist" });

        for (const cat of this.categories)
        {
            const tab = this.buildCategoryTab(cat);
            tabs.appendChild(tab);
        }
        return tabs;
    }

    private buildCategoryTab(cat: NotificationCategory): HTMLElement
    {
        const isActive = cat.id === this.activeCategory;
        const tab = createElement("button",
            `notificationcenter-tab${isActive ? " active" : ""}`
        );
        setAttr(tab, {
            type: "button",
            role: "tab",
            "aria-selected": String(isActive)
        });

        if (cat.icon)
        {
            const icon = createElement("i", `bi ${cat.icon}`);
            setAttr(icon, { "aria-hidden": "true" });
            tab.appendChild(icon);
        }

        const label = createElement("span");
        label.textContent = cat.label;
        tab.appendChild(label);

        tab.addEventListener("click", () =>
        {
            this.activeCategory = cat.id;
            this.renderPanel();
        });

        return tab;
    }

    // ====================================================================
    // PRIVATE: NOTIFICATION LIST
    // ====================================================================

    private renderList(): void
    {
        if (!this.listEl) { return; }
        this.listEl.innerHTML = "";

        const filtered = this.getFilteredNotifications();

        if (filtered.length === 0)
        {
            this.listEl.appendChild(this.buildEmptyState());
            return;
        }

        const grouped = this.groupByDate(filtered);
        for (const [label, items] of grouped)
        {
            this.listEl.appendChild(this.buildDateGroup(label, items));
        }
    }

    private getFilteredNotifications(): NotificationItem[]
    {
        if (this.activeCategory === "all")
        {
            return this.notifications;
        }
        return this.notifications.filter(
            n => n.category === this.activeCategory
        );
    }

    private buildDateGroup(
        label: string,
        items: NotificationItem[]
    ): HTMLElement
    {
        const group = createElement("div", "notificationcenter-group");

        const heading = createElement("div", "notificationcenter-group-label");
        heading.textContent = label;
        group.appendChild(heading);

        for (const item of items)
        {
            group.appendChild(this.buildNotificationItem(item));
        }
        return group;
    }

    private buildNotificationItem(n: NotificationItem): HTMLElement
    {
        const row = createElement("div",
            `notificationcenter-item${n.read ? "" : " unread"}`
        );
        setAttr(row, { role: "listitem", "data-id": n.id, tabindex: "0" });

        row.appendChild(this.buildItemAvatar(n));
        row.appendChild(this.buildItemContent(n));
        row.appendChild(this.buildItemDismiss(n));

        row.addEventListener("click", () => this.handleNotificationClick(n));
        row.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter" || e.key === " ")
            {
                e.preventDefault();
                this.handleNotificationClick(n);
            }
            if (e.key === "Delete")
            {
                e.preventDefault();
                this.handleDismiss(n.id);
            }
        });

        return row;
    }

    /** Build avatar/icon for a notification item. */
    private buildItemAvatar(n: NotificationItem): HTMLElement
    {
        const avatar = createElement("div", "notificationcenter-item-avatar");

        if (n.avatarUrl)
        {
            const img = document.createElement("img");
            img.src = n.avatarUrl;
            img.alt = "";
            avatar.appendChild(img);
        }
        else
        {
            const icon = createElement("i",
                `bi ${n.icon ?? "bi-bell"}`
            );
            setAttr(icon, { "aria-hidden": "true" });
            avatar.appendChild(icon);
        }
        return avatar;
    }

    /** Build title + message + timestamp for a notification item. */
    private buildItemContent(n: NotificationItem): HTMLElement
    {
        const content = createElement("div", "notificationcenter-item-content");

        const title = createElement("div", "notificationcenter-item-title");
        title.textContent = n.title;
        content.appendChild(title);

        if (n.message)
        {
            const msg = createElement("div", "notificationcenter-item-message");
            msg.textContent = n.message;
            content.appendChild(msg);
        }

        const ts = createElement("div", "notificationcenter-item-time");
        ts.textContent = this.formatRelativeTime(n.timestamp);
        content.appendChild(ts);

        return content;
    }

    /** Build dismiss button for a notification item. */
    private buildItemDismiss(n: NotificationItem): HTMLElement
    {
        const btn = createElement("button", "notificationcenter-item-dismiss");
        setAttr(btn, {
            type: "button",
            "aria-label": "Dismiss notification"
        });
        const icon = createElement("i", "bi bi-x");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);

        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.handleDismiss(n.id);
        });
        return btn;
    }

    private buildEmptyState(): HTMLElement
    {
        const empty = createElement("div", "notificationcenter-empty");
        const icon = createElement("i", "bi bi-bell-slash");
        setAttr(icon, { "aria-hidden": "true" });
        empty.appendChild(icon);

        const msg = createElement("p");
        msg.textContent = this.options.emptyMessage ?? "No notifications";
        empty.appendChild(msg);
        return empty;
    }

    // ====================================================================
    // PRIVATE: DATE GROUPING
    // ====================================================================

    private groupByDate(
        items: NotificationItem[]
    ): [string, NotificationItem[]][]
    {
        const now = new Date();
        const todayStart = new Date(
            now.getFullYear(), now.getMonth(), now.getDate()
        ).getTime();
        const yesterdayStart = todayStart - 86400000;

        const groups = new Map<string, NotificationItem[]>();

        for (const item of items)
        {
            const ts = new Date(item.timestamp).getTime();
            let label: string;

            if (ts >= todayStart) { label = "Today"; }
            else if (ts >= yesterdayStart) { label = "Yesterday"; }
            else { label = "Earlier"; }

            if (!groups.has(label)) { groups.set(label, []); }
            (groups.get(label) as NotificationItem[]).push(item);
        }

        const order = ["Today", "Yesterday", "Earlier"];
        return order
            .filter(k => groups.has(k))
            .map(k => [k, groups.get(k) as NotificationItem[]]);
    }

    // ====================================================================
    // PRIVATE: TIME FORMATTING
    // ====================================================================

    private formatRelativeTime(timestamp: string | Date): string
    {
        const now = Date.now();
        const ts = new Date(timestamp).getTime();
        const diff = Math.floor((now - ts) / 1000);

        if (diff < 60) { return "just now"; }
        if (diff < 3600) { return `${Math.floor(diff / 60)}m ago`; }
        if (diff < 86400) { return `${Math.floor(diff / 3600)}h ago`; }
        if (diff < 604800) { return `${Math.floor(diff / 86400)}d ago`; }
        return new Date(ts).toLocaleDateString();
    }

    // ====================================================================
    // PRIVATE: EVENT HANDLERS
    // ====================================================================

    private handleNotificationClick(n: NotificationItem): void
    {
        this.markRead(n.id);
        if (this.options.onNotificationClick)
        {
            this.options.onNotificationClick(n);
        }
    }

    private handleDismiss(id: string): void
    {
        this.removeNotification(id);
        if (this.options.onDismiss) { this.options.onDismiss(id); }
    }

    private handleOutsideClick(e: MouseEvent): void
    {
        if (!this.isOpen) { return; }
        const target = e.target as HTMLElement;

        if (this.panelEl?.contains(target)) { return; }
        if (this.bellEl?.contains(target)) { return; }

        this.close();
    }

    private handleKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape" && this.isOpen)
        {
            e.preventDefault();
            this.close();
            this.bellEl?.focus();
            return;
        }

        if (!this.isOpen || !this.listEl) { return; }

        if (e.key === "ArrowDown" || e.key === "ArrowUp")
        {
            e.preventDefault();
            this.navigateList(e.key === "ArrowDown" ? 1 : -1);
        }
    }

    private navigateList(direction: number): void
    {
        if (!this.listEl) { return; }

        const items = Array.from(
            this.listEl.querySelectorAll(".notificationcenter-item")
        ) as HTMLElement[];
        if (items.length === 0) { return; }

        const current = document.activeElement as HTMLElement;
        const idx = items.indexOf(current);
        let next = idx + direction;

        if (next < 0) { next = items.length - 1; }
        if (next >= items.length) { next = 0; }

        items[next].focus();
    }

    // ====================================================================
    // PRIVATE: ACCESSIBILITY
    // ====================================================================

    private buildLiveRegion(): void
    {
        this.liveRegion = createElement("div", "notificationcenter-sr-live");
        setAttr(this.liveRegion, {
            "aria-live": "polite",
            "aria-atomic": "true"
        });
        this.liveRegion.style.cssText =
            "position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)";
        document.body.appendChild(this.liveRegion);
    }

    private announce(msg: string): void
    {
        if (!this.liveRegion) { return; }
        this.liveRegion.textContent = msg;
        setTimeout(() => {
            if (this.liveRegion) { this.liveRegion.textContent = ""; }
        }, 3000);
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

export function createNotificationCenter(
    options: NotificationCenterOptions
): NotificationCenterHandle
{
    if (!options.container)
    {
        console.error(LOG_PREFIX, "No container provided");
        throw new Error(`${LOG_PREFIX} container is required`);
    }

    const inst = new NotificationCenter(options);
    return {
        addNotification: (n) => inst.addNotification(n),
        removeNotification: (id) => inst.removeNotification(id),
        markRead: (id) => inst.markRead(id),
        markAllRead: () => inst.markAllRead(),
        getUnreadCount: () => inst.getUnreadCount(),
        setNotifications: (n) => inst.setNotifications(n),
        getNotifications: () => inst.getNotifications(),
        setCategories: (c) => inst.setCategories(c),
        open: () => inst.open(),
        close: () => inst.close(),
        toggle: () => inst.toggle(),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createNotificationCenter =
    createNotificationCenter;
