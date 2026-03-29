/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: ActivityFeed
 * 📜 PURPOSE: Social-style feed of user and system activity events with date
 *    grouping, infinite scroll via IntersectionObserver, real-time additions,
 *    compact mode, and rich content with truncation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ActivityActor
{
    id: string;
    name: string;
    avatar?: string;
}

export interface ActivityEvent
{
    id: string;
    actor: ActivityActor;
    action: string;
    target?: string;
    targetUrl?: string;
    timestamp: Date;
    eventType?: "comment" | "status_change" | "assignment" |
                "creation" | "deletion" | "upload" | "custom";
    content?: string;
    icon?: string;
    color?: string;
    metadata?: Record<string, unknown>;
}

export interface ActivityFeedOptions
{
    events?: ActivityEvent[];
    groupByDate?: boolean;
    showAvatars?: boolean;
    compact?: boolean;
    maxInitialEvents?: number;
    emptyStateOptions?: { icon?: string; heading?: string; description?: string };
    height?: string;
    cssClass?: string;
    onLoadMore?: () => Promise<ActivityEvent[]>;
    onEventClick?: (event: ActivityEvent) => void;
    onActorClick?: (actor: ActivityActor) => void;
    onTargetClick?: (event: ActivityEvent) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ActivityFeed]";
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

const CLS = "activityfeed";
const CONTENT_MAX_LINES = 3;
const CONTENT_CHAR_LIMIT = 200;

const EVENT_ICONS: Record<string, string> =
{
    comment:       "bi-chat-left-text",
    status_change: "bi-arrow-repeat",
    assignment:    "bi-person-plus",
    creation:      "bi-plus-circle",
    deletion:      "bi-trash",
    upload:        "bi-cloud-upload",
    custom:        "bi-circle",
};

const EVENT_COLORS: Record<string, string> =
{
    comment:       "#1c7ed6",
    status_change: "#7c3aed",
    assignment:    "#0d9488",
    creation:      "#52b788",
    deletion:      "#dc2626",
    upload:        "#0891b2",
    custom:        "#64748b",
};

const INITIALS_PALETTE = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

// ============================================================================
// HELPERS
// ============================================================================

function createElement(tag: string, cls?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (cls) { el.className = cls; }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function hashString(str: string): number
{
    let hash = 0;
    for (let i = 0; i < str.length; i++)
    {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

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
// DATE / TIME HELPERS
// ============================================================================

function getDateGroup(date: Date): string
{
    const now = new Date();
    const today = stripTime(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);

    const d = stripTime(date);
    if (d.getTime() === today.getTime()) { return "Today"; }
    if (d.getTime() === yesterday.getTime()) { return "Yesterday"; }
    if (d >= weekAgo) { return "This Week"; }
    return "Earlier";
}

function stripTime(d: Date): Date
{
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function relativeTime(date: Date): string
{
    const now = Date.now();
    const diff = now - date.getTime();
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const days = Math.floor(hr / 24);
    const weeks = Math.floor(days / 7);

    if (sec < 60) { return "just now"; }
    if (min === 1) { return "1 minute ago"; }
    if (min < 60) { return `${min} minutes ago`; }
    if (hr === 1) { return "1 hour ago"; }
    if (hr < 24) { return `${hr} hours ago`; }
    if (days === 1) { return "yesterday"; }
    if (days < 7) { return `${days} days ago`; }
    if (weeks === 1) { return "1 week ago"; }
    if (days < 30) { return `${weeks} weeks ago`; }

    return formatAbsDate(date);
}

function formatAbsDate(date: Date): string
{
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatFullDate(date: Date): string
{
    return date.toLocaleString(undefined, {
        year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "2-digit"
    });
}

// ============================================================================
// CLASS
// ============================================================================

export class ActivityFeed
{
    // -- Options -------------------------------------------------------------
    private groupByDate: boolean;
    private showAvatars: boolean;
    private compact: boolean;
    private maxInitial: number;
    private opts: ActivityFeedOptions;

    // -- Data ----------------------------------------------------------------
    private events: ActivityEvent[] = [];

    // -- DOM -----------------------------------------------------------------
    private rootEl: HTMLElement | null = null;
    private feedEl: HTMLElement | null = null;
    private sentinelEl: HTMLElement | null = null;
    private liveEl: HTMLElement | null = null;
    private emptyEl: HTMLElement | null = null;

    // -- State ---------------------------------------------------------------
    private destroyed = false;
    private loading = false;
    private endReached = false;
    private observer: IntersectionObserver | null = null;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    constructor(options: ActivityFeedOptions)
    {
        this.opts = options;
        this.groupByDate = options.groupByDate !== false;
        this.showAvatars = options.showAvatars !== false;
        this.compact = options.compact === true;
        this.maxInitial = options.maxInitialEvents ?? 20;

        const initial = options.events ?? [];
        this.events = initial.slice(0, this.maxInitial);

        this.rootEl = this.buildRoot();
        this.feedEl = this.buildFeed();
        this.rootEl.appendChild(this.feedEl);

        this.liveEl = this.buildLive();
        this.rootEl.appendChild(this.liveEl);

        this.renderEvents();

        if (this.events.length < this.maxInitial || !options.onLoadMore)
        {
            this.endReached = this.events.length === initial.length;
        }

        logInfo(`Initialised with ${this.events.length} events`);
    }

    // ========================================================================
    // LIFECYCLE
    // ========================================================================

    show(containerId: string | HTMLElement): void
    {
        if (this.destroyed) { logWarn("Already destroyed"); return; }
        const container = typeof containerId === "string"
            ? document.getElementById(containerId) : containerId;
        if (!container) { logError("Container not found:", containerId); return; }
        container.appendChild(this.rootEl!);
        this.setupObserver();
        logInfo("Shown in container");
    }

    hide(): void
    {
        if (this.destroyed) { return; }
        this.disconnectObserver();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
    }

    destroy(): void
    {
        if (this.destroyed) { logWarn("Already destroyed"); return; }
        this.destroyed = true;
        this.disconnectObserver();
        this.rootEl?.parentElement?.removeChild(this.rootEl);
        this.rootEl = null;
        this.feedEl = null;
        this.sentinelEl = null;
        this.liveEl = null;
        this.emptyEl = null;
        this.events = [];
        logInfo("Destroyed");
    }

    getElement(): HTMLElement | null { return this.rootEl; }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    addEvent(event: ActivityEvent): void
    {
        if (this.destroyed) { return; }
        this.events.unshift(event);
        this.prependEventEl(event);
        this.hideEmpty();
    }

    addEvents(events: ActivityEvent[]): void
    {
        if (this.destroyed) { return; }
        this.events.push(...events);
        this.appendEventsEl(events);
        this.hideEmpty();
    }

    setEvents(events: ActivityEvent[]): void
    {
        if (this.destroyed) { return; }
        this.events = [...events];
        this.endReached = false;
        this.renderEvents();
    }

    getEvents(): ActivityEvent[]
    {
        return [...this.events];
    }

    clear(): void
    {
        if (this.destroyed) { return; }
        this.events = [];
        this.endReached = false;
        this.renderEvents();
    }

    refresh(): void
    {
        if (this.destroyed) { return; }
        this.renderEvents();
    }

    scrollToTop(): void
    {
        if (this.feedEl) { this.feedEl.scrollTop = 0; }
    }

    // ========================================================================
    // BUILD — ROOT & FEED
    // ========================================================================

    private buildRoot(): HTMLElement
    {
        const root = createElement("div", CLS);
        if (this.compact) { root.classList.add(`${CLS}-compact`); }
        if (this.opts.cssClass) { root.classList.add(...this.opts.cssClass.split(" ")); }
        if (this.opts.height)
        {
            root.style.height = this.opts.height;
            root.style.overflow = "hidden";
        }
        return root;
    }

    private buildFeed(): HTMLElement
    {
        const feed = createElement("div", `${CLS}-feed`);
        setAttr(feed, "role", "feed");
        setAttr(feed, "aria-label", "Activity feed");
        return feed;
    }

    private buildLive(): HTMLElement
    {
        const el = createElement("div", "visually-hidden");
        setAttr(el, "aria-live", "polite");
        setAttr(el, "aria-atomic", "true");
        return el;
    }

    // ========================================================================
    // RENDER EVENTS
    // ========================================================================

    private renderEvents(): void
    {
        if (!this.feedEl) { return; }
        this.feedEl.textContent = "";

        if (this.events.length === 0)
        {
            this.showEmpty();
            return;
        }

        if (this.groupByDate)
        {
            this.renderGrouped();
        }
        else
        {
            this.events.forEach(ev => this.feedEl!.appendChild(this.buildEventEl(ev)));
        }

        this.appendSentinel();
    }

    private renderGrouped(): void
    {
        const groups = this.groupEvents();
        const order = ["Today", "Yesterday", "This Week", "Earlier"];

        for (const label of order)
        {
            const evts = groups.get(label);
            if (!evts || evts.length === 0) { continue; }

            const groupEl = createElement("div", `${CLS}-group`);
            groupEl.appendChild(this.buildGroupHeader(label));
            evts.forEach(ev => groupEl.appendChild(this.buildEventEl(ev)));
            this.feedEl!.appendChild(groupEl);
        }
    }

    private groupEvents(): Map<string, ActivityEvent[]>
    {
        const map = new Map<string, ActivityEvent[]>();
        for (const ev of this.events)
        {
            const label = getDateGroup(ev.timestamp);
            if (!map.has(label)) { map.set(label, []); }
            map.get(label)!.push(ev);
        }
        return map;
    }

    private buildGroupHeader(label: string): HTMLElement
    {
        const h = createElement("div", `${CLS}-group-header`);
        setAttr(h, "role", "heading");
        setAttr(h, "aria-level", "3");
        h.textContent = label;
        return h;
    }

    // ========================================================================
    // BUILD — SINGLE EVENT
    // ========================================================================

    private buildEventEl(ev: ActivityEvent): HTMLElement
    {
        const card = createElement("div", `${CLS}-event`);
        setAttr(card, "role", "article");
        const actionId = `action-${ev.id}`;
        setAttr(card, "aria-labelledby", actionId);

        if (this.opts.onEventClick)
        {
            setAttr(card, "tabindex", "0");
            card.addEventListener("click", () =>
                safeCallback(this.opts.onEventClick, ev));
        }

        if (this.showAvatars && !this.compact)
        {
            card.appendChild(this.buildAvatar(ev));
        }
        else if (this.compact)
        {
            card.appendChild(this.buildTypeIcon(ev));
        }

        card.appendChild(this.buildBody(ev, actionId));
        return card;
    }

    private buildAvatar(ev: ActivityEvent): HTMLElement
    {
        const wrap = createElement("div", `${CLS}-avatar`);
        setAttr(wrap, "aria-hidden", "true");

        if (ev.actor.avatar)
        {
            const img = document.createElement("img") as HTMLImageElement;
            img.className = `${CLS}-avatar-img`;
            img.src = ev.actor.avatar;
            img.alt = "";
            wrap.appendChild(img);
        }
        else
        {
            wrap.appendChild(this.buildInitials(ev.actor.name));
        }

        if (!this.compact)
        {
            wrap.appendChild(this.buildBadge(ev));
        }
        return wrap;
    }

    private buildInitials(name: string): HTMLElement
    {
        const el = createElement("span", `${CLS}-avatar-initials`);
        el.textContent = name.charAt(0).toUpperCase();
        const idx = hashString(name) % INITIALS_PALETTE.length;
        el.style.backgroundColor = INITIALS_PALETTE[idx];
        return el;
    }

    private buildBadge(ev: ActivityEvent): HTMLElement
    {
        const badge = createElement("span", `${CLS}-avatar-badge`);
        const iconCls = ev.icon ?? EVENT_ICONS[ev.eventType ?? "custom"];
        const color = ev.color ?? EVENT_COLORS[ev.eventType ?? "custom"];
        badge.style.backgroundColor = color;
        const i = createElement("i", `bi ${iconCls}`);
        setAttr(i, "aria-hidden", "true");
        badge.appendChild(i);
        return badge;
    }

    private buildTypeIcon(ev: ActivityEvent): HTMLElement
    {
        const wrap = createElement("span", `${CLS}-type-icon`);
        setAttr(wrap, "aria-hidden", "true");
        const iconCls = ev.icon ?? EVENT_ICONS[ev.eventType ?? "custom"];
        const color = ev.color ?? EVENT_COLORS[ev.eventType ?? "custom"];
        wrap.style.color = color;
        const i = createElement("i", `bi ${iconCls}`);
        wrap.appendChild(i);
        return wrap;
    }

    // ========================================================================
    // BUILD — EVENT BODY
    // ========================================================================

    private buildBody(ev: ActivityEvent, actionId: string): HTMLElement
    {
        const body = createElement("div", `${CLS}-body`);
        body.appendChild(this.buildActionLine(ev, actionId));

        if (ev.content && !this.compact)
        {
            body.appendChild(this.buildContent(ev.content));
        }
        return body;
    }

    private buildActionLine(ev: ActivityEvent, actionId: string): HTMLElement
    {
        const line = createElement("div", `${CLS}-action`);
        line.id = actionId;

        const actor = this.buildActorEl(ev.actor);
        line.appendChild(actor);

        const actionText = document.createTextNode(" " + ev.action + " ");
        line.appendChild(actionText);

        if (ev.target)
        {
            line.appendChild(this.buildTargetEl(ev));
        }

        line.appendChild(this.buildTimestamp(ev.timestamp));
        return line;
    }

    private buildActorEl(actor: ActivityActor): HTMLElement
    {
        const el = createElement("span", `${CLS}-actor`);
        el.textContent = actor.name;

        if (this.opts.onActorClick)
        {
            el.style.cursor = "pointer";
            el.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                safeCallback(this.opts.onActorClick, actor);
            });
        }
        return el;
    }

    private buildTargetEl(ev: ActivityEvent): HTMLElement
    {
        if (ev.targetUrl)
        {
            const a = document.createElement("a") as HTMLAnchorElement;
            a.className = `${CLS}-target`;
            a.href = ev.targetUrl;
            a.textContent = ev.target!;
            a.addEventListener("click", (e) =>
            {
                if (this.opts.onTargetClick)
                {
                    e.preventDefault();
                    e.stopPropagation();
                    safeCallback(this.opts.onTargetClick, ev);
                }
            });
            return a;
        }

        const span = createElement("span", `${CLS}-target`);
        span.textContent = ev.target!;
        if (this.opts.onTargetClick)
        {
            span.style.cursor = "pointer";
            span.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                safeCallback(this.opts.onTargetClick, ev);
            });
        }
        return span;
    }

    private buildTimestamp(date: Date): HTMLElement
    {
        const time = document.createElement("time");
        time.className = `${CLS}-timestamp`;
        time.dateTime = date.toISOString();
        time.title = formatFullDate(date);
        time.textContent = relativeTime(date);
        return time;
    }

    // ========================================================================
    // BUILD — RICH CONTENT
    // ========================================================================

    private buildContent(text: string): HTMLElement
    {
        const wrap = createElement("div", `${CLS}-content`);
        const truncated = text.length > CONTENT_CHAR_LIMIT;

        if (!truncated)
        {
            wrap.textContent = text;
            return wrap;
        }

        const preview = text.substring(0, CONTENT_CHAR_LIMIT);
        wrap.textContent = preview + "...";

        const toggle = createElement("button", `${CLS}-show-more`);
        toggle.textContent = "Show more";
        setAttr(toggle, "aria-expanded", "false");

        toggle.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleContent(wrap, toggle, text, preview);
        });

        wrap.appendChild(toggle);
        return wrap;
    }

    private toggleContent(
        wrap: HTMLElement,
        btn: HTMLElement,
        full: string,
        preview: string
    ): void
    {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        if (expanded)
        {
            wrap.textContent = preview + "...";
            btn.textContent = "Show more";
            setAttr(btn, "aria-expanded", "false");
        }
        else
        {
            wrap.textContent = full;
            btn.textContent = "Show less";
            setAttr(btn, "aria-expanded", "true");
            wrap.classList.add(`${CLS}-content-expanded`);
        }
        wrap.appendChild(btn);
    }

    // ========================================================================
    // EMPTY STATE
    // ========================================================================

    private showEmpty(): void
    {
        if (!this.feedEl) { return; }
        const opts = this.opts.emptyStateOptions ?? {};
        const empty = createElement("div", `${CLS}-empty`);

        const icon = createElement("i", `bi ${opts.icon ?? "bi-journal-text"}`);
        setAttr(icon, "aria-hidden", "true");
        empty.appendChild(icon);

        const heading = createElement("div", `${CLS}-empty-heading`);
        heading.textContent = opts.heading ?? "No activity yet";
        empty.appendChild(heading);

        const desc = createElement("div", `${CLS}-empty-desc`);
        desc.textContent = opts.description ?? "Activity will appear here as events occur.";
        empty.appendChild(desc);

        this.emptyEl = empty;
        this.feedEl.appendChild(empty);
    }

    private hideEmpty(): void
    {
        if (this.emptyEl)
        {
            this.emptyEl.parentElement?.removeChild(this.emptyEl);
            this.emptyEl = null;
        }
    }

    // ========================================================================
    // SENTINEL & INFINITE SCROLL
    // ========================================================================

    private appendSentinel(): void
    {
        if (!this.feedEl || !this.opts.onLoadMore || this.endReached) { return; }

        this.sentinelEl = createElement("div", `${CLS}-sentinel`);
        setAttr(this.sentinelEl, "aria-label", "Loading more events");
        this.feedEl.appendChild(this.sentinelEl);
    }

    private setupObserver(): void
    {
        if (!this.sentinelEl || !this.opts.onLoadMore) { return; }
        this.observer = new IntersectionObserver(
            (entries) => this.onSentinelVisible(entries),
            { threshold: 0.1 }
        );
        this.observer.observe(this.sentinelEl);
    }

    private disconnectObserver(): void
    {
        if (this.observer)
        {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    private async onSentinelVisible(
        entries: IntersectionObserverEntry[]
    ): Promise<void>
    {
        if (this.loading || this.endReached || this.destroyed) { return; }
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) { return; }

        this.loading = true;
        this.showLoadingIndicator();
        this.setBusy(true);

        try
        {
            const newEvents = await this.opts.onLoadMore!();
            if (newEvents.length === 0)
            {
                this.endReached = true;
                this.showEndMessage();
                this.disconnectObserver();
            }
            else
            {
                this.addEvents(newEvents);
            }
        }
        catch (err)
        {
            logWarn("Load more failed:", err);
            this.showRetry();
        }
        finally
        {
            this.loading = false;
            this.hideLoadingIndicator();
            this.setBusy(false);
        }
    }

    private showLoadingIndicator(): void
    {
        if (!this.sentinelEl) { return; }
        this.sentinelEl.className = `${CLS}-loading`;
        this.sentinelEl.textContent = "Loading...";
    }

    private hideLoadingIndicator(): void
    {
        if (!this.sentinelEl) { return; }
        this.sentinelEl.className = `${CLS}-sentinel`;
        this.sentinelEl.textContent = "";
    }

    private showEndMessage(): void
    {
        if (!this.sentinelEl) { return; }
        this.sentinelEl.className = `${CLS}-end`;
        this.sentinelEl.textContent = "";
    }

    private showRetry(): void
    {
        if (!this.sentinelEl) { return; }
        this.sentinelEl.className = `${CLS}-error`;
        this.sentinelEl.textContent = "";

        const msg = createElement("span", "");
        msg.textContent = "Failed to load. ";
        this.sentinelEl.appendChild(msg);

        const btn = createElement("button", `${CLS}-retry-btn`);
        btn.textContent = "Retry";
        btn.addEventListener("click", () =>
        {
            this.sentinelEl!.className = `${CLS}-sentinel`;
            this.sentinelEl!.textContent = "";
            this.onSentinelVisible([{
                isIntersecting: true
            } as IntersectionObserverEntry]);
        });
        this.sentinelEl.appendChild(btn);
    }

    private setBusy(busy: boolean): void
    {
        if (!this.feedEl) { return; }
        setAttr(this.feedEl, "aria-busy", String(busy));
    }

    // ========================================================================
    // PREPEND / APPEND EVENTS
    // ========================================================================

    private prependEventEl(ev: ActivityEvent): void
    {
        if (!this.feedEl) { return; }
        const el = this.buildEventEl(ev);
        el.classList.add(`${CLS}-event-entering`);

        if (this.groupByDate)
        {
            this.prependIntoGroup(el, ev);
        }
        else
        {
            this.feedEl.insertBefore(el, this.feedEl.firstChild);
        }

        requestAnimationFrame(() =>
        {
            requestAnimationFrame(() => el.classList.remove(`${CLS}-event-entering`));
        });
    }

    private prependIntoGroup(el: HTMLElement, ev: ActivityEvent): void
    {
        const label = getDateGroup(ev.timestamp);
        let groupEl = this.findGroupEl(label);

        if (!groupEl)
        {
            groupEl = createElement("div", `${CLS}-group`);
            setAttr(groupEl, "data-group", label);
            groupEl.appendChild(this.buildGroupHeader(label));
            this.feedEl!.insertBefore(groupEl, this.feedEl!.firstChild);
        }

        const header = groupEl.querySelector(`.${CLS}-group-header`);
        const after = header ? header.nextSibling : groupEl.firstChild;
        groupEl.insertBefore(el, after);
    }

    private findGroupEl(label: string): HTMLElement | null
    {
        if (!this.feedEl) { return null; }
        const groups = this.feedEl.querySelectorAll(`.${CLS}-group`);
        for (const g of groups)
        {
            const h = g.querySelector(`.${CLS}-group-header`);
            if (h && h.textContent === label) { return g as HTMLElement; }
        }
        return null;
    }

    private appendEventsEl(events: ActivityEvent[]): void
    {
        if (!this.feedEl) { return; }
        for (const ev of events)
        {
            if (this.groupByDate)
            {
                this.appendIntoGroup(ev);
            }
            else
            {
                const sentinel = this.sentinelEl;
                const el = this.buildEventEl(ev);
                if (sentinel)
                {
                    this.feedEl.insertBefore(el, sentinel);
                }
                else
                {
                    this.feedEl.appendChild(el);
                }
            }
        }
    }

    private appendIntoGroup(ev: ActivityEvent): void
    {
        const label = getDateGroup(ev.timestamp);
        let groupEl = this.findGroupEl(label);

        if (!groupEl)
        {
            groupEl = createElement("div", `${CLS}-group`);
            setAttr(groupEl, "data-group", label);
            groupEl.appendChild(this.buildGroupHeader(label));
            const sentinel = this.sentinelEl;
            if (sentinel)
            {
                this.feedEl!.insertBefore(groupEl, sentinel);
            }
            else
            {
                this.feedEl!.appendChild(groupEl);
            }
        }

        groupEl.appendChild(this.buildEventEl(ev));
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    private announce(msg: string): void
    {
        if (!this.liveEl) { return; }
        this.liveEl.textContent = msg;
    }
}

// ============================================================================
// FACTORY & GLOBALS
// ============================================================================

export function createActivityFeed(
    options: ActivityFeedOptions,
    containerId?: string
): ActivityFeed
{
    const instance = new ActivityFeed(options);
    if (containerId) { instance.show(containerId); }
    return instance;
}

(window as unknown as Record<string, unknown>).ActivityFeed = ActivityFeed;
(window as unknown as Record<string, unknown>).createActivityFeed = createActivityFeed;
