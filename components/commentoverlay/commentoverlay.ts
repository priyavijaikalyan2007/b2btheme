/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: CommentOverlay
 * 📜 PURPOSE: Transparent overlay system for anchoring comment pins to DOM elements,
 *    enabling inline annotation with threaded discussions, @mentions, resolve/unresolve.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface MentionUser
{
    id: string;
    name: string;
    avatarUrl?: string;
    email?: string;
}

export interface CommentData
{
    id: string;
    author: MentionUser;
    text: string;
    createdAt: string;
    editedAt?: string;
    edited: boolean;
    mentions: string[];
}

export interface CommentThread
{
    id: string;
    rootComment: CommentData;
    replies: CommentData[];
    resolved: boolean;
    resolvedBy?: MentionUser;
    resolvedAt?: string;
    metadata?: Record<string, unknown>;
}

export interface CommentPinData
{
    id: string;
    anchorElement: HTMLElement;
    anchorSelector?: string;
    offsetX: number;
    offsetY: number;
    thread: CommentThread;
    icon?: string;
    colour?: string;
    showConnector?: boolean;
    visible?: boolean;
}

export interface CommentOverlayOptions
{
    container?: HTMLElement;
    pins?: CommentPinData[];
    mentionUsers?: MentionUser[];
    currentUser: MentionUser;
    showConnectors?: boolean;
    draggablePins?: boolean;
    allowResolve?: boolean;
    resolvedDisplay?: "muted" | "hidden" | "normal";
    enableMentions?: boolean;
    maxReplyDepth?: number;
    defaultPinIcon?: string;
    defaultPinColour?: string;
    zIndex?: number;
    timestampFormat?: "relative" | "absolute";
    panelWidth?: number;
    panelMaxHeight?: number;
    pinSize?: number;
    cssClass?: string;
    onCommentCreate?: (threadId: string, comment: CommentData, parentCommentId?: string) => void;
    onCommentEdit?: (threadId: string, commentId: string, newText: string) => void;
    onCommentDelete?: (threadId: string, commentId: string) => void;
    onThreadResolve?: (threadId: string, resolvedBy: MentionUser) => void;
    onThreadUnresolve?: (threadId: string) => void;
    onPinCreate?: (pin: CommentPinData) => void;
    onPinMove?: (pinId: string, newOffsetX: number, newOffsetY: number) => void;
    onPinDelete?: (pinId: string) => void;
    onMention?: (userId: string, threadId: string, commentId: string) => void;
    onMentionSearch?: (query: string) => Promise<MentionUser[]>;
    onPinClick?: (pinId: string) => void;
    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

interface PinState
{
    data: CommentPinData;
    el: HTMLElement;
    connector: SVGLineElement | null;
    lastX: number;
    lastY: number;
    dragActive: boolean;
    dragStartX: number;
    dragStartY: number;
    dragOffsetX: number;
    dragOffsetY: number;
    pressTimer: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CommentOverlay]";

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    escape: "Escape",
    submit: "Enter",
    saveEdit: "Ctrl+Enter",
    openPin: "Enter",
    openPinSpace: " ",
};

const CLS = "commentoverlay";
const DEFAULT_PIN_SIZE = 24;
const DEFAULT_PANEL_WIDTH = 320;
const DEFAULT_PANEL_MAX_HEIGHT = 400;
const DEFAULT_Z_INDEX = 1075;
const DRAG_THRESHOLD_MS = 150;
const MENTION_DEBOUNCE_MS = 200;
const REPOSITION_DEBOUNCE_MS = 16;
const RESIZE_DEBOUNCE_MS = 100;
const MUTATION_DEBOUNCE_MS = 100;
const TIMESTAMP_UPDATE_MS = 60000;
const MAX_MENTION_RESULTS = 8;
const PIN_GAP = 8;

// ============================================================================
// HELPERS
// ============================================================================

function createElement(tag: string, cls?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (cls) { el.className = cls; }
    return el;
}

function setAttr(el: HTMLElement | SVGElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function createSvgElement(tag: string): SVGElement
{
    return document.createElementNS("http://www.w3.org/2000/svg", tag);
}

function getInitials(name: string): string
{
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
    {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
}

function formatRelativeTime(iso: string): string
{
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) { return "just now"; }
    if (diffMin < 60) { return diffMin + "m ago"; }
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) { return diffH + "h ago"; }
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) { return diffD + "d ago"; }
    return formatShortDate(new Date(iso));
}

function formatShortDate(date: Date): string
{
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const m = months[date.getMonth()];
    const d = date.getDate();
    if (date.getFullYear() === new Date().getFullYear())
    {
        return m + " " + d;
    }
    return m + " " + d + ", " + date.getFullYear();
}

function generateId(): string
{
    return "co-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 8);
}

function debounce(fn: () => void, ms: number): () => void
{
    let timer = 0;
    return function(): void
    {
        clearTimeout(timer);
        timer = window.setTimeout(fn, ms);
    };
}

function clamp(val: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, val));
}

function clearChildren(el: HTMLElement): void
{
    while (el.firstChild) { el.removeChild(el.firstChild); }
}

// ============================================================================
// MENTION TEXT PARSING
// ============================================================================

type MentionSegment =
    | { type: "text"; value: string }
    | { type: "mention"; user: MentionUser };

function parseMentionSegments(text: string, users: MentionUser[]): MentionSegment[]
{
    const result: MentionSegment[] = [];
    const regex = /@\[([^\]]+)\]/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null)
    {
        if (match.index > lastIdx)
        {
            result.push({ type: "text", value: text.slice(lastIdx, match.index) });
        }
        const uid = match[1];
        const user = users.find(function(u) { return u.id === uid; });
        if (user) { result.push({ type: "mention", user: user }); }
        else { result.push({ type: "text", value: match[0] }); }
        lastIdx = regex.lastIndex;
    }

    if (lastIdx < text.length)
    {
        result.push({ type: "text", value: text.slice(lastIdx) });
    }
    return result;
}

// ============================================================================
// COMMENTOVERLAY CLASS
// ============================================================================

export class CommentOverlay
{
    private opts: CommentOverlayOptions;
    private containerEl: HTMLElement;
    private overlayEl: HTMLElement | null = null;
    private svgEl: SVGSVGElement | null = null;
    private liveRegion: HTMLElement | null = null;
    private pinMap: Map<string, PinState> = new Map();
    private activeThreadId: string | null = null;
    private threadPopoverEl: HTMLElement | null = null;
    private placementActive = false;
    private mentionUsers: MentionUser[];
    private tsInterval = 0;
    private resizeObs: ResizeObserver | null = null;
    private mutationObs: MutationObserver | null = null;
    private scrollFn: (() => void) | null = null;
    private resizeFn: (() => void) | null = null;
    private clickOutFn: ((e: MouseEvent) => void) | null = null;
    private placementClickFn: ((e: MouseEvent) => void) | null = null;
    private placementEscFn: ((e: KeyboardEvent) => void) | null = null;
    private disposed = false;
    private resolvedFilter: "all" | "resolved" | "unresolved" = "all";
    private pendingPinId: string | null = null;

    // Mention autocomplete state (shared across instances of reply input)
    private mDropdown: HTMLElement | null = null;
    private mActiveIdx = -1;
    private mStart = -1;
    private mItems: MentionUser[] = [];
    private mTextarea: HTMLTextAreaElement | null = null;
    private mThreadId = "";
    private mDebounce = 0;

    constructor(options: CommentOverlayOptions)
    {
        this.opts = options;
        this.containerEl = options.container || document.body;
        this.mentionUsers = options.mentionUsers
            ? options.mentionUsers.slice() : [];
        this.init();
    }

    // ── Initialization ─────────────────────────────────────────────

    private init(): void
    {
        this.ensureContainerPositioned();
        this.buildOverlay();
        this.buildSvgLayer();
        this.buildLiveRegion();
        this.setupObservers();
        this.setupClickOutside();
        this.startTimestampUpdater();
        this.loadInitialPins();
        console.log(LOG_PREFIX, "Initialised on", this.containerEl.tagName);
    }

    private ensureContainerPositioned(): void
    {
        const pos = getComputedStyle(this.containerEl).position;
        if (pos === "static")
        {
            this.containerEl.style.position = "relative";
        }
    }

    private buildOverlay(): void
    {
        this.overlayEl = createElement("div", CLS + "-container");
        setAttr(this.overlayEl, "role", "region");
        setAttr(this.overlayEl, "aria-label", "Comment annotations");
        const z = this.opts.zIndex ?? DEFAULT_Z_INDEX;
        this.overlayEl.style.zIndex = String(z);
        if (this.opts.cssClass)
        {
            this.overlayEl.classList.add(this.opts.cssClass);
        }
        this.containerEl.appendChild(this.overlayEl);
    }

    private buildSvgLayer(): void
    {
        if (this.opts.showConnectors === false) { return; }
        const svg = createSvgElement("svg") as SVGSVGElement;
        svg.classList.add(CLS + "-svg-layer");
        setAttr(svg, "aria-hidden", "true");
        this.svgEl = svg;
        this.overlayEl!.appendChild(svg);
    }

    private buildLiveRegion(): void
    {
        this.liveRegion = createElement("div", "visually-hidden");
        setAttr(this.liveRegion, "aria-live", "polite");
        setAttr(this.liveRegion, "aria-atomic", "true");
        this.overlayEl!.appendChild(this.liveRegion);
    }

    private loadInitialPins(): void
    {
        const pins = this.opts.pins;
        if (!pins || pins.length === 0) { return; }
        for (let i = 0; i < pins.length; i++)
        {
            this.addPin(pins[i]);
        }
        console.log(LOG_PREFIX, "Loaded", pins.length, "initial pins");
    }

    // ── Key Binding Helpers ──────────────────────────────────────────

    /**
     * Resolves the combo string for a named action.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Returns true if the keyboard event matches the named action combo.
     */
    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
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

    // ── Pin Management (Public) ────────────────────────────────────

    addPin(pin: CommentPinData): void
    {
        if (this.pinMap.has(pin.id))
        {
            console.warn(LOG_PREFIX, "Pin", pin.id, "already exists");
            return;
        }
        const state = this.createPinState(pin);
        this.pinMap.set(pin.id, state);
        this.overlayEl!.appendChild(state.el);
        this.createConnector(state);
        this.positionPin(state);
        if (this.opts.draggablePins !== false)
        {
            this.setupPinDrag(state);
        }
        this.applyResolvedStyle(state);
        this.applyVisibilityFilter(state);
    }

    removePin(pinId: string): void
    {
        const state = this.pinMap.get(pinId);
        if (!state)
        {
            console.warn(LOG_PREFIX, "Pin", pinId, "not found");
            return;
        }
        if (this.activeThreadId === pinId)
        {
            this.closeAllThreads();
        }
        state.el.remove();
        if (state.connector) { state.connector.remove(); }
        this.pinMap.delete(pinId);
    }

    updatePin(pinId: string, updates: Partial<CommentPinData>): void
    {
        const state = this.pinMap.get(pinId);
        if (!state) { return; }
        Object.assign(state.data, updates);
        this.refreshPinVisual(state);
        this.positionPin(state);
        this.applyResolvedStyle(state);
    }

    getPin(pinId: string): CommentPinData | undefined
    {
        const s = this.pinMap.get(pinId);
        return s ? s.data : undefined;
    }

    getAllPins(): CommentPinData[]
    {
        const out: CommentPinData[] = [];
        this.pinMap.forEach(function(s) { out.push(s.data); });
        return out;
    }

    // ── Pin State + Rendering ──────────────────────────────────────

    private createPinState(pin: CommentPinData): PinState
    {
        return {
            data: pin,
            el: this.renderPin(pin),
            connector: null,
            lastX: 0,
            lastY: 0,
            dragActive: false,
            dragStartX: 0,
            dragStartY: 0,
            dragOffsetX: 0,
            dragOffsetY: 0,
            pressTimer: 0
        };
    }

    private renderPin(pin: CommentPinData): HTMLElement
    {
        const size = this.opts.pinSize ?? DEFAULT_PIN_SIZE;
        const icon = pin.icon || this.opts.defaultPinIcon || "bi-chat-dots-fill";
        const colour = pin.colour || this.opts.defaultPinColour || "";
        const el = createElement("button", CLS + "-pin");
        setAttr(el, "type", "button");
        setAttr(el, "tabindex", "0");
        setAttr(el, "aria-haspopup", "dialog");
        setAttr(el, "aria-expanded", "false");
        setAttr(el, "data-pin-id", pin.id);
        el.style.width = size + "px";
        el.style.height = size + "px";
        if (colour) { el.style.backgroundColor = colour; }
        this.setPinAriaLabel(el, pin);
        el.appendChild(createElement("i", "bi " + icon));
        this.appendPinBadge(el, pin);
        this.bindPinEvents(el, pin.id);
        return el;
    }

    private bindPinEvents(el: HTMLElement, pinId: string): void
    {
        const self = this;
        el.addEventListener("click", function(e)
        {
            e.stopPropagation();
            if (self.opts.onPinClick) { self.opts.onPinClick(pinId); }
            self.openThread(pinId);
        });
        el.addEventListener("keydown", function(e)
        {
            if (self.matchesKeyCombo(e, "openPin") ||
                self.matchesKeyCombo(e, "openPinSpace"))
            {
                e.preventDefault();
                self.openThread(pinId);
            }
        });
    }

    private setPinAriaLabel(el: HTMLElement, pin: CommentPinData): void
    {
        const author = pin.thread.rootComment.author.name;
        const n = pin.thread.replies.length;
        const st = pin.thread.resolved ? "resolved" : "open";
        setAttr(el, "aria-label",
            "Comment by " + author + ", " + n + " replies, " + st);
    }

    private appendPinBadge(el: HTMLElement, pin: CommentPinData): void
    {
        const count = pin.thread.replies.length;
        if (count === 0) { return; }
        const badge = createElement("span", CLS + "-pin-badge");
        badge.textContent = String(count);
        el.appendChild(badge);
    }

    private refreshPinBadge(state: PinState): void
    {
        const old = state.el.querySelector("." + CLS + "-pin-badge");
        if (old) { old.remove(); }
        this.appendPinBadge(state.el, state.data);
        this.setPinAriaLabel(state.el, state.data);
    }

    private refreshPinVisual(state: PinState): void
    {
        const c = state.data.colour || this.opts.defaultPinColour || "";
        if (c) { state.el.style.backgroundColor = c; }
        this.refreshPinBadge(state);
    }

    private applyResolvedStyle(state: PinState): void
    {
        const resolved = state.data.thread.resolved;
        const mode = this.opts.resolvedDisplay || "muted";
        state.el.classList.toggle(CLS + "-pin-resolved", resolved);
        const hide = resolved && mode === "hidden";
        state.el.style.display = hide ? "none" : "";
        if (state.connector)
        {
            state.connector.style.display = hide ? "none" : "";
        }
    }

    private applyVisibilityFilter(state: PinState): void
    {
        const resolved = state.data.thread.resolved;
        const vis = state.data.visible !== false;
        let show = vis;
        if (this.resolvedFilter === "resolved") { show = vis && resolved; }
        if (this.resolvedFilter === "unresolved") { show = vis && !resolved; }
        if (!show)
        {
            state.el.style.display = "none";
            if (state.connector) { state.connector.style.display = "none"; }
        }
    }

    // ── Connector Lines ────────────────────────────────────────────

    private createConnector(state: PinState): void
    {
        if (this.opts.showConnectors === false) { return; }
        if (state.data.showConnector === false || !this.svgEl) { return; }
        const line = createSvgElement("line") as SVGLineElement;
        line.classList.add(CLS + "-connector");
        const c = state.data.colour || this.opts.defaultPinColour || "#2563eb";
        setAttr(line, "stroke", c);
        setAttr(line, "stroke-opacity", "0.4");
        setAttr(line, "stroke-width", "1.5");
        setAttr(line, "stroke-dasharray", "4 3");
        this.svgEl.appendChild(line);
        state.connector = line;
    }

    private positionConnector(state: PinState): void
    {
        if (!state.connector) { return; }
        const ar = this.getAnchorRect(state);
        if (!ar) { return; }
        const cr = this.containerEl.getBoundingClientRect();
        const ps = this.opts.pinSize ?? DEFAULT_PIN_SIZE;
        const pCX = state.lastX + ps / 2;
        const pCY = state.lastY + ps / 2;
        const aX = ar.right - cr.left + this.containerEl.scrollLeft;
        const aY = ar.top + ar.height / 2 - cr.top + this.containerEl.scrollTop;
        setAttr(state.connector, "x1", String(pCX));
        setAttr(state.connector, "y1", String(pCY));
        setAttr(state.connector, "x2", String(aX));
        setAttr(state.connector, "y2", String(aY));
    }

    // ── Pin Positioning ────────────────────────────────────────────

    private getAnchorRect(state: PinState): DOMRect | null
    {
        let anchor = state.data.anchorElement;
        if (!anchor.isConnected && state.data.anchorSelector)
        {
            const found = document.querySelector(
                state.data.anchorSelector
            ) as HTMLElement | null;
            if (found) { state.data.anchorElement = found; anchor = found; }
            else
            {
                console.warn(LOG_PREFIX, "Anchor for pin",
                    state.data.id, "not found");
                return null;
            }
        }
        if (!anchor.isConnected)
        {
            console.warn(LOG_PREFIX, "Anchor for pin",
                state.data.id, "no longer in DOM");
            return null;
        }
        return anchor.getBoundingClientRect();
    }

    private positionPin(state: PinState): void
    {
        const ar = this.getAnchorRect(state);
        if (!ar) { return; }
        const cr = this.containerEl.getBoundingClientRect();
        const x = ar.right + state.data.offsetX - cr.left +
            this.containerEl.scrollLeft;
        const y = ar.top + state.data.offsetY - cr.top +
            this.containerEl.scrollTop;
        state.lastX = x;
        state.lastY = y;
        state.el.style.left = x + "px";
        state.el.style.top = y + "px";
        this.positionConnector(state);
    }

    reposition(): void
    {
        if (this.disposed) { return; }
        const self = this;
        this.pinMap.forEach(function(s) { self.positionPin(s); });
        if (this.svgEl)
        {
            this.svgEl.style.width = this.containerEl.scrollWidth + "px";
            this.svgEl.style.height = this.containerEl.scrollHeight + "px";
        }
    }

    // ── Pin Drag ───────────────────────────────────────────────────

    private setupPinDrag(state: PinState): void
    {
        const self = this;
        state.el.addEventListener("pointerdown", function(e: PointerEvent)
        {
            self.onPinDragDown(state, e);
        });
        state.el.addEventListener("pointermove", function(e: PointerEvent)
        {
            self.onPinDragMove(state, e);
        });
        state.el.addEventListener("pointerup", function(e: PointerEvent)
        {
            self.onPinDragUp(state, e);
        });
        state.el.addEventListener("pointercancel", function()
        {
            clearTimeout(state.pressTimer);
            state.dragActive = false;
            state.el.classList.remove(CLS + "-pin-dragging");
        });
    }

    private onPinDragDown(state: PinState, e: PointerEvent): void
    {
        if (e.button !== 0) { return; }
        state.dragStartX = e.clientX;
        state.dragStartY = e.clientY;
        state.dragOffsetX = state.lastX;
        state.dragOffsetY = state.lastY;
        const el = state.el;
        state.pressTimer = window.setTimeout(function()
        {
            state.dragActive = true;
            el.classList.add(CLS + "-pin-dragging");
            el.setPointerCapture(e.pointerId);
        }, DRAG_THRESHOLD_MS);
    }

    private onPinDragMove(state: PinState, e: PointerEvent): void
    {
        if (!state.dragActive) { return; }
        e.preventDefault();
        const ps = this.opts.pinSize ?? DEFAULT_PIN_SIZE;
        const dx = e.clientX - state.dragStartX;
        const dy = e.clientY - state.dragStartY;
        const sw = this.containerEl.scrollWidth - ps;
        const sh = this.containerEl.scrollHeight - ps;
        state.lastX = clamp(state.dragOffsetX + dx, 0, sw);
        state.lastY = clamp(state.dragOffsetY + dy, 0, sh);
        state.el.style.left = state.lastX + "px";
        state.el.style.top = state.lastY + "px";
        this.positionConnector(state);
    }

    private onPinDragUp(state: PinState, e: PointerEvent): void
    {
        clearTimeout(state.pressTimer);
        if (!state.dragActive) { return; }
        state.dragActive = false;
        state.el.classList.remove(CLS + "-pin-dragging");
        state.el.releasePointerCapture(e.pointerId);
        this.updateDragOffset(state);
    }

    private updateDragOffset(state: PinState): void
    {
        const ar = this.getAnchorRect(state);
        if (!ar) { return; }
        const cr = this.containerEl.getBoundingClientRect();
        const ancR = ar.right - cr.left + this.containerEl.scrollLeft;
        const ancT = ar.top - cr.top + this.containerEl.scrollTop;
        state.data.offsetX = state.lastX - ancR;
        state.data.offsetY = state.lastY - ancT;
        console.log(LOG_PREFIX, "Pin", state.data.id, "moved to",
            state.data.offsetX, state.data.offsetY);
        if (this.opts.onPinMove)
        {
            this.opts.onPinMove(
                state.data.id, state.data.offsetX, state.data.offsetY
            );
        }
    }

    // ── Placement Mode ─────────────────────────────────────────────

    enterPlacementMode(): void
    {
        if (this.placementActive) { return; }
        this.placementActive = true;
        this.overlayEl!.classList.add(CLS + "-placement-mode");
        this.announce("New comment mode. Click to place a comment pin.");
        console.log(LOG_PREFIX, "Placement mode enabled");
        const self = this;
        this.placementClickFn = function(e) { self.handlePlaceClick(e); };
        this.placementEscFn = function(e)
        {
            if (self.matchesKeyCombo(e, "escape")) { self.exitPlacementMode(); }
        };
        this.overlayEl!.addEventListener("click", this.placementClickFn);
        document.addEventListener("keydown", this.placementEscFn);
    }

    exitPlacementMode(): void
    {
        if (!this.placementActive) { return; }
        this.placementActive = false;
        this.overlayEl!.classList.remove(CLS + "-placement-mode");
        this.removePlacementListeners();
        this.cancelPendingPin();
        this.announce("New comment mode disabled.");
        console.log(LOG_PREFIX, "Placement mode disabled");
    }

    private removePlacementListeners(): void
    {
        if (this.placementClickFn)
        {
            this.overlayEl!.removeEventListener("click", this.placementClickFn);
            this.placementClickFn = null;
        }
        if (this.placementEscFn)
        {
            document.removeEventListener("keydown", this.placementEscFn);
            this.placementEscFn = null;
        }
    }

    private handlePlaceClick(e: MouseEvent): void
    {
        const target = e.target as HTMLElement;
        if (target.closest("." + CLS + "-pin") ||
            target.closest("." + CLS + "-thread"))
        {
            return;
        }
        const cr = this.containerEl.getBoundingClientRect();
        const x = e.clientX - cr.left + this.containerEl.scrollLeft;
        const y = e.clientY - cr.top + this.containerEl.scrollTop;
        const elems = document.elementsFromPoint(e.clientX, e.clientY);
        const anchor = this.findBestAnchor(elems) || this.containerEl;
        const ar = anchor.getBoundingClientRect();
        const offX = x - (ar.right - cr.left + this.containerEl.scrollLeft);
        const offY = y - (ar.top - cr.top + this.containerEl.scrollTop);
        this.createNewPin(anchor, offX, offY);
        this.exitPlacementMode();
    }

    private findBestAnchor(elems: Element[]): HTMLElement | null
    {
        for (let i = 0; i < elems.length; i++)
        {
            const el = elems[i] as HTMLElement;
            if (el === this.overlayEl) { continue; }
            if (el.closest("." + CLS + "-container")) { continue; }
            if (this.containerEl.contains(el) && el !== this.containerEl)
            {
                return el;
            }
        }
        return null;
    }

    private createNewPin(anchor: HTMLElement, offX: number, offY: number): void
    {
        const pinId = generateId();
        const now = new Date().toISOString();
        const thread: CommentThread = {
            id: pinId,
            rootComment: this.makeStubComment(now),
            replies: [],
            resolved: false
        };
        const pin: CommentPinData = {
            id: pinId,
            anchorElement: anchor,
            offsetX: offX,
            offsetY: offY,
            thread: thread
        };
        this.addPin(pin);
        this.pendingPinId = pinId;
        if (this.opts.onPinCreate) { this.opts.onPinCreate(pin); }
        this.announce("Comment pin placed");
        this.openThread(pinId);
    }

    private makeStubComment(now: string): CommentData
    {
        return {
            id: generateId(),
            author: this.opts.currentUser,
            text: "",
            createdAt: now,
            edited: false,
            mentions: []
        };
    }

    private cancelPendingPin(): void
    {
        if (!this.pendingPinId) { return; }
        const state = this.pinMap.get(this.pendingPinId);
        if (state && state.data.thread.rootComment.text === "")
        {
            this.removePin(this.pendingPinId);
        }
        this.pendingPinId = null;
    }

    // ── Thread Popover ─────────────────────────────────────────────

    openThread(pinId: string): void
    {
        const state = this.pinMap.get(pinId);
        if (!state) { return; }
        this.closeAllThreads();
        this.activeThreadId = pinId;
        state.el.classList.add(CLS + "-pin-active");
        setAttr(state.el, "aria-expanded", "true");
        this.threadPopoverEl = this.buildThreadPopover(state);
        this.overlayEl!.appendChild(this.threadPopoverEl);
        this.positionPopover(this.threadPopoverEl, state);
        this.focusFirstInPopover();
    }

    closeAllThreads(): void
    {
        if (this.threadPopoverEl)
        {
            this.threadPopoverEl.remove();
            this.threadPopoverEl = null;
        }
        if (this.activeThreadId)
        {
            const s = this.pinMap.get(this.activeThreadId);
            if (s)
            {
                s.el.classList.remove(CLS + "-pin-active");
                setAttr(s.el, "aria-expanded", "false");
                s.el.focus();
            }
            this.activeThreadId = null;
        }
        this.closeMentionDropdown();
    }

    private focusFirstInPopover(): void
    {
        if (!this.threadPopoverEl) { return; }
        const input = this.threadPopoverEl.querySelector(
            "." + CLS + "-reply-input"
        ) as HTMLElement;
        if (input) { input.focus(); }
    }

    private buildThreadPopover(state: PinState): HTMLElement
    {
        const thread = state.data.thread;
        const w = this.opts.panelWidth ?? DEFAULT_PANEL_WIDTH;
        const maxH = this.opts.panelMaxHeight ?? DEFAULT_PANEL_MAX_HEIGHT;
        const el = createElement("div", CLS + "-thread");
        setAttr(el, "role", "dialog");
        setAttr(el, "aria-label", "Comment thread");
        setAttr(el, "aria-modal", "false");
        el.style.width = w + "px";
        el.style.maxHeight = maxH + "px";
        el.style.zIndex = String((this.opts.zIndex ?? DEFAULT_Z_INDEX) + 1);
        el.appendChild(this.buildThreadHeader(thread));
        el.appendChild(this.buildThreadBody(thread));
        el.appendChild(this.buildThreadFooter(thread));
        this.bindPopoverEscape(el);
        return el;
    }

    private bindPopoverEscape(el: HTMLElement): void
    {
        const self = this;
        el.addEventListener("keydown", function(e)
        {
            if (self.matchesKeyCombo(e, "escape"))
            {
                e.stopPropagation();
                self.closeAllThreads();
            }
        });
    }

    private buildThreadHeader(thread: CommentThread): HTMLElement
    {
        const header = createElement("div", CLS + "-thread-header");
        const title = createElement("span", CLS + "-thread-header-title");
        title.textContent = "Thread #" + thread.id.slice(0, 6);
        header.appendChild(title);
        const acts = createElement("div", CLS + "-thread-header-actions");
        acts.appendChild(this.buildCloseButton());
        header.appendChild(acts);
        return header;
    }

    private buildCloseButton(): HTMLElement
    {
        const btn = createElement("button", CLS + "-thread-close-btn");
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Close thread");
        btn.appendChild(createElement("i", "bi bi-x-lg"));
        const self = this;
        btn.addEventListener("click", function() { self.closeAllThreads(); });
        return btn;
    }

    private buildThreadBody(thread: CommentThread): HTMLElement
    {
        const body = createElement("div", CLS + "-thread-body");
        setAttr(body, "role", "list");
        if (thread.resolved && thread.resolvedBy)
        {
            body.appendChild(this.buildResolvedBanner(thread));
        }
        if (thread.rootComment.text !== "")
        {
            body.appendChild(
                this.buildCommentCard(thread.rootComment, thread.id, false)
            );
        }
        for (let i = 0; i < thread.replies.length; i++)
        {
            body.appendChild(
                this.buildCommentCard(thread.replies[i], thread.id, true)
            );
        }
        return body;
    }

    private buildResolvedBanner(thread: CommentThread): HTMLElement
    {
        const el = createElement("div", CLS + "-thread-resolved-banner");
        const by = thread.resolvedBy ? thread.resolvedBy.name : "Someone";
        let txt = "Resolved by " + by;
        if (thread.resolvedAt)
        {
            txt += " on " + formatRelativeTime(thread.resolvedAt);
        }
        el.textContent = txt;
        return el;
    }

    private buildCommentCard(
        comment: CommentData, threadId: string, isReply: boolean
    ): HTMLElement
    {
        const cls = CLS + "-comment" +
            (isReply ? " " + CLS + "-reply" : "");
        const card = createElement("div", cls);
        setAttr(card, "role", "listitem");
        setAttr(card, "tabindex", "-1");
        setAttr(card, "aria-label", "Comment by " + comment.author.name);
        setAttr(card, "data-comment-id", comment.id);
        card.appendChild(this.buildCommentHeader(comment, threadId));
        card.appendChild(this.buildCommentText(comment));
        return card;
    }

    private buildCommentHeader(
        comment: CommentData, threadId: string
    ): HTMLElement
    {
        const header = createElement("div", CLS + "-comment-header");
        header.appendChild(this.buildAvatar(comment.author));
        header.appendChild(this.buildCommentMeta(comment));
        const isOwn = comment.author.id === this.opts.currentUser.id;
        if (isOwn)
        {
            header.appendChild(this.buildCommentActions(comment, threadId));
        }
        return header;
    }

    private buildCommentMeta(comment: CommentData): HTMLElement
    {
        const meta = createElement("div", CLS + "-comment-meta");
        const author = createElement("span", CLS + "-comment-author");
        author.textContent = comment.author.name;
        meta.appendChild(author);
        const ts = createElement("span", CLS + "-comment-timestamp");
        ts.textContent = this.fmtTs(comment.createdAt);
        setAttr(ts, "title", comment.createdAt);
        setAttr(ts, "data-ts", comment.createdAt);
        meta.appendChild(ts);
        if (comment.edited)
        {
            const ed = createElement("span", CLS + "-comment-edited");
            ed.textContent = "(edited)";
            meta.appendChild(ed);
        }
        return meta;
    }

    private buildAvatar(user: MentionUser): HTMLElement
    {
        const av = createElement("span", CLS + "-comment-avatar");
        if (user.avatarUrl)
        {
            const img = document.createElement("img");
            img.src = user.avatarUrl;
            img.alt = user.name;
            av.appendChild(img);
        }
        else
        {
            av.textContent = getInitials(user.name);
        }
        return av;
    }

    private buildCommentText(comment: CommentData): HTMLElement
    {
        const el = createElement("div", CLS + "-comment-text");
        if (!comment.text) { return el; }
        const segs = parseMentionSegments(comment.text, this.mentionUsers);
        for (let i = 0; i < segs.length; i++)
        {
            if (segs[i].type === "text")
            {
                el.appendChild(
                    document.createTextNode((segs[i] as { type: "text"; value: string }).value)
                );
            }
            else
            {
                const chip = createElement("span", CLS + "-mention-chip");
                chip.textContent = "@" + (segs[i] as { type: "mention"; user: MentionUser }).user.name;
                el.appendChild(chip);
            }
        }
        return el;
    }

    private buildCommentActions(
        comment: CommentData, threadId: string
    ): HTMLElement
    {
        const wrap = createElement("div", CLS + "-comment-actions");
        const trigger = createElement("button", CLS + "-comment-actions-trigger");
        setAttr(trigger, "type", "button");
        setAttr(trigger, "aria-label", "Comment actions");
        trigger.appendChild(createElement("i", "bi bi-three-dots"));
        wrap.appendChild(trigger);
        const menu = this.buildActionsMenu(comment, threadId);
        menu.style.display = "none";
        wrap.appendChild(menu);
        trigger.addEventListener("click", function(e)
        {
            e.stopPropagation();
            menu.style.display = menu.style.display === "none" ? "" : "none";
        });
        return wrap;
    }

    private buildActionsMenu(
        comment: CommentData, threadId: string
    ): HTMLElement
    {
        const menu = createElement("div", CLS + "-comment-actions-menu");
        const self = this;
        const editBtn = createElement("button", CLS + "-comment-action-item");
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", function()
        {
            menu.style.display = "none";
            self.startEdit(comment, threadId);
        });
        menu.appendChild(editBtn);
        const delBtn = createElement("button", CLS + "-comment-action-item");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", function()
        {
            menu.style.display = "none";
            self.confirmDelete(comment, threadId);
        });
        menu.appendChild(delBtn);
        return menu;
    }

    private buildThreadFooter(thread: CommentThread): HTMLElement
    {
        const footer = createElement("div", CLS + "-thread-footer");
        footer.appendChild(this.buildReplyInput(thread.id));
        if (this.opts.allowResolve !== false)
        {
            footer.appendChild(this.buildResolveBtn(thread));
        }
        return footer;
    }

    // ── Reply Input ────────────────────────────────────────────────

    private buildReplyInput(threadId: string): HTMLElement
    {
        const wrap = createElement("div", CLS + "-reply-input-wrap");
        const ta = document.createElement("textarea");
        ta.className = CLS + "-reply-input";
        setAttr(ta, "placeholder", "Type a reply... @mention");
        setAttr(ta, "aria-label", "Reply to thread");
        setAttr(ta, "aria-multiline", "true");
        setAttr(ta, "rows", "1");
        wrap.appendChild(ta);
        const sendBtn = createElement("button", CLS + "-reply-send");
        setAttr(sendBtn, "type", "button");
        sendBtn.textContent = "Send";
        wrap.appendChild(sendBtn);
        const self = this;
        sendBtn.addEventListener("click", function()
        {
            self.handleSendReply(ta, threadId);
        });
        ta.addEventListener("keydown", function(e)
        {
            if (self.matchesKeyCombo(e, "submit"))
            {
                e.preventDefault();
                self.handleSendReply(ta, threadId);
            }
        });
        if (this.opts.enableMentions !== false)
        {
            this.setupMention(ta, threadId);
        }
        return wrap;
    }

    private handleSendReply(ta: HTMLTextAreaElement, threadId: string): void
    {
        const text = ta.value.trim();
        if (!text) { return; }
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        // If root comment is empty, fill it instead of adding reply
        if (state.data.thread.rootComment.text === "")
        {
            this.setRootCommentText(state, text);
        }
        else
        {
            this.addReplyComment(threadId, text);
        }
        ta.value = "";
        this.pendingPinId = null;
    }

    private setRootCommentText(state: PinState, text: string): void
    {
        const root = state.data.thread.rootComment;
        root.text = text;
        root.mentions = this.extractMentionIds(text);
        if (this.opts.onCommentCreate)
        {
            this.opts.onCommentCreate(state.data.thread.id, root);
        }
        this.announce(this.opts.currentUser.name + " commented");
        this.refreshThread(state);
    }

    private addReplyComment(threadId: string, text: string): void
    {
        const comment: CommentData = {
            id: generateId(),
            author: this.opts.currentUser,
            text: text,
            createdAt: new Date().toISOString(),
            edited: false,
            mentions: this.extractMentionIds(text)
        };
        this.addComment(threadId, comment);
        if (this.opts.onCommentCreate)
        {
            this.opts.onCommentCreate(threadId, comment);
        }
        this.announce(this.opts.currentUser.name + " replied");
    }

    private extractMentionIds(text: string): string[]
    {
        const ids: string[] = [];
        const re = /@\[([^\]]+)\]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) { ids.push(m[1]); }
        return ids;
    }

    // ── Comment Management (Public) ────────────────────────────────

    addComment(threadId: string, comment: CommentData): void
    {
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        state.data.thread.replies.push(comment);
        this.refreshPinBadge(state);
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    updateComment(
        threadId: string, commentId: string, newText: string
    ): void
    {
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        const c = this.findComment(state.data.thread, commentId);
        if (!c) { return; }
        c.text = newText;
        c.edited = true;
        c.editedAt = new Date().toISOString();
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    removeComment(threadId: string, commentId: string): void
    {
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        const thread = state.data.thread;
        if (thread.rootComment.id === commentId)
        {
            this.handleRootCommentDelete(state);
        }
        else
        {
            this.handleReplyDelete(state, commentId);
        }
        this.announce("Comment deleted");
    }

    private handleRootCommentDelete(state: PinState): void
    {
        const thread = state.data.thread;
        if (thread.replies.length === 0)
        {
            this.removePin(state.data.id);
            return;
        }
        thread.rootComment.text = "[Deleted]";
        thread.rootComment.author = { id: "", name: "Deleted" };
        this.refreshPinBadge(state);
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    private handleReplyDelete(state: PinState, commentId: string): void
    {
        state.data.thread.replies = state.data.thread.replies.filter(
            function(r) { return r.id !== commentId; }
        );
        this.refreshPinBadge(state);
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    private findPinByThread(threadId: string): PinState | undefined
    {
        let found: PinState | undefined;
        this.pinMap.forEach(function(s)
        {
            if (s.data.thread.id === threadId) { found = s; }
        });
        return found;
    }

    private findComment(
        thread: CommentThread, cId: string
    ): CommentData | null
    {
        if (thread.rootComment.id === cId) { return thread.rootComment; }
        for (let i = 0; i < thread.replies.length; i++)
        {
            if (thread.replies[i].id === cId) { return thread.replies[i]; }
        }
        return null;
    }

    private refreshThread(state: PinState): void
    {
        if (!this.threadPopoverEl) { return; }
        const body = this.threadPopoverEl.querySelector(
            "." + CLS + "-thread-body"
        );
        const saved = body ? body.scrollTop : 0;
        this.threadPopoverEl.remove();
        this.threadPopoverEl = this.buildThreadPopover(state);
        this.overlayEl!.appendChild(this.threadPopoverEl);
        this.positionPopover(this.threadPopoverEl, state);
        const newBody = this.threadPopoverEl.querySelector(
            "." + CLS + "-thread-body"
        );
        if (newBody) { newBody.scrollTop = saved; }
    }

    // ── Edit / Delete ──────────────────────────────────────────────

    private startEdit(comment: CommentData, threadId: string): void
    {
        if (!this.threadPopoverEl) { return; }
        const card = this.threadPopoverEl.querySelector(
            '[data-comment-id="' + comment.id + '"]'
        );
        if (!card) { return; }
        const textEl = card.querySelector("." + CLS + "-comment-text");
        if (!textEl) { return; }
        const ta = document.createElement("textarea");
        ta.className = CLS + "-edit-textarea";
        ta.value = comment.text;
        textEl.replaceWith(ta);
        card.appendChild(this.buildEditActions(comment, threadId, ta));
        ta.focus();
        this.bindEditKeys(ta, comment, threadId);
    }

    private buildEditActions(
        comment: CommentData, threadId: string, ta: HTMLTextAreaElement
    ): HTMLElement
    {
        const wrap = createElement("div", CLS + "-edit-actions");
        const saveBtn = createElement("button", CLS + "-edit-save");
        saveBtn.textContent = "Save";
        const cancelBtn = createElement("button", CLS + "-edit-cancel");
        cancelBtn.textContent = "Cancel";
        wrap.appendChild(saveBtn);
        wrap.appendChild(cancelBtn);
        const self = this;
        saveBtn.addEventListener("click", function()
        {
            self.saveEdit(comment, threadId, ta.value);
        });
        cancelBtn.addEventListener("click", function()
        {
            self.refreshActiveThread();
        });
        return wrap;
    }

    private bindEditKeys(
        ta: HTMLTextAreaElement, comment: CommentData, threadId: string
    ): void
    {
        const self = this;
        ta.addEventListener("keydown", function(e)
        {
            if (self.matchesKeyCombo(e, "saveEdit"))
            {
                e.preventDefault();
                self.saveEdit(comment, threadId, ta.value);
            }
            if (self.matchesKeyCombo(e, "escape"))
            {
                self.refreshActiveThread();
            }
        });
    }

    private saveEdit(
        comment: CommentData, threadId: string, newText: string
    ): void
    {
        const trimmed = newText.trim();
        if (!trimmed) { return; }
        this.updateComment(threadId, comment.id, trimmed);
        if (this.opts.onCommentEdit)
        {
            this.opts.onCommentEdit(threadId, comment.id, trimmed);
        }
    }

    private confirmDelete(comment: CommentData, threadId: string): void
    {
        if (!this.threadPopoverEl) { return; }
        const card = this.threadPopoverEl.querySelector(
            '[data-comment-id="' + comment.id + '"]'
        );
        if (!card) { return; }
        const box = createElement("div", CLS + "-confirm-delete");
        box.appendChild(document.createTextNode("Delete this comment? "));
        const self = this;
        const cancelBtn = createElement("button", CLS + "-confirm-cancel");
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", function() { box.remove(); });
        box.appendChild(cancelBtn);
        const delBtn = createElement("button", CLS + "-confirm-delete-btn");
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", function()
        {
            self.removeComment(threadId, comment.id);
            if (self.opts.onCommentDelete)
            {
                self.opts.onCommentDelete(threadId, comment.id);
            }
        });
        box.appendChild(delBtn);
        card.appendChild(box);
    }

    private refreshActiveThread(): void
    {
        if (!this.activeThreadId) { return; }
        const s = this.pinMap.get(this.activeThreadId);
        if (s) { this.refreshThread(s); }
    }

    // ── Resolve / Unresolve ────────────────────────────────────────

    private buildResolveBtn(thread: CommentThread): HTMLElement
    {
        const btn = createElement("button", CLS + "-resolve-btn");
        setAttr(btn, "type", "button");
        const resolved = thread.resolved;
        btn.textContent = resolved ? "Reopen" : "Resolve";
        setAttr(btn, "aria-label",
            resolved ? "Reopen thread" : "Resolve thread");
        setAttr(btn, "aria-pressed", resolved ? "true" : "false");
        const self = this;
        btn.addEventListener("click", function()
        {
            if (thread.resolved)
            {
                self.unresolveThread(thread.id);
            }
            else
            {
                self.resolveThread(thread.id, self.opts.currentUser);
            }
        });
        return btn;
    }

    resolveThread(threadId: string, resolvedBy: MentionUser): void
    {
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        const t = state.data.thread;
        t.resolved = true;
        t.resolvedBy = resolvedBy;
        t.resolvedAt = new Date().toISOString();
        this.applyResolvedStyle(state);
        this.announce("Thread resolved");
        console.log(LOG_PREFIX, "Thread", threadId, "resolved by",
            resolvedBy.name);
        if (this.opts.onThreadResolve)
        {
            this.opts.onThreadResolve(threadId, resolvedBy);
        }
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    unresolveThread(threadId: string): void
    {
        const state = this.findPinByThread(threadId);
        if (!state) { return; }
        state.data.thread.resolved = false;
        state.data.thread.resolvedBy = undefined;
        state.data.thread.resolvedAt = undefined;
        this.applyResolvedStyle(state);
        this.announce("Thread reopened");
        console.log(LOG_PREFIX, "Thread", threadId, "reopened");
        if (this.opts.onThreadUnresolve)
        {
            this.opts.onThreadUnresolve(threadId);
        }
        if (this.activeThreadId === state.data.id)
        {
            this.refreshThread(state);
        }
    }

    // ── @Mention Autocomplete ──────────────────────────────────────

    setMentionUsers(users: MentionUser[]): void
    {
        this.mentionUsers = users.slice();
    }

    private setupMention(ta: HTMLTextAreaElement, threadId: string): void
    {
        const self = this;
        ta.addEventListener("input", function()
        {
            self.mTextarea = ta;
            self.mThreadId = threadId;
            self.handleMentionInput(ta);
        });
        ta.addEventListener("keydown", function(e)
        {
            self.handleMentionKeydown(e);
        });
        ta.addEventListener("blur", function()
        {
            setTimeout(function() { self.closeMentionDropdown(); }, 200);
        });
    }

    private handleMentionInput(ta: HTMLTextAreaElement): void
    {
        const val = ta.value;
        const pos = ta.selectionStart || 0;
        const trigger = this.detectMentionTrigger(val, pos);
        if (!trigger)
        {
            this.closeMentionDropdown();
            return;
        }
        this.mStart = trigger.start;
        clearTimeout(this.mDebounce);
        const self = this;
        const query = trigger.query;
        if (this.opts.onMentionSearch)
        {
            this.mDebounce = window.setTimeout(function()
            {
                self.opts.onMentionSearch!(query)
                    .then(function(u) { self.showMentionResults(u); })
                    .catch(function() { self.showMentionResults([]); });
            }, MENTION_DEBOUNCE_MS);
        }
        else
        {
            this.showMentionResults(this.filterMentionUsers(query));
        }
    }

    private detectMentionTrigger(
        val: string, pos: number
    ): { start: number; query: string } | null
    {
        let i = pos - 1;
        while (i >= 0 && val[i] !== "@" && val[i] !== " " &&
            val[i] !== "\n") { i--; }
        if (i < 0 || val[i] !== "@") { return null; }
        if (i > 0 && val[i - 1] !== " " && val[i - 1] !== "\n")
        {
            return null;
        }
        return { start: i, query: val.slice(i + 1, pos) };
    }

    private filterMentionUsers(query: string): MentionUser[]
    {
        const q = query.toLowerCase();
        return this.mentionUsers.filter(function(u)
        {
            return u.name.toLowerCase().indexOf(q) >= 0;
        });
    }

    private showMentionResults(users: MentionUser[]): void
    {
        this.mItems = users.slice(0, MAX_MENTION_RESULTS);
        this.mActiveIdx = this.mItems.length > 0 ? 0 : -1;
        if (this.mItems.length === 0)
        {
            this.closeMentionDropdown();
            return;
        }
        this.ensureMentionDropdown();
        this.renderMentionItems();
        this.highlightMentionItem();
    }

    private ensureMentionDropdown(): void
    {
        if (this.mDropdown) { return; }
        this.mDropdown = createElement("div", CLS + "-mention-dropdown");
        setAttr(this.mDropdown, "role", "listbox");
        setAttr(this.mDropdown, "aria-label", "Mention suggestions");
        const z = (this.opts.zIndex ?? DEFAULT_Z_INDEX) + 2;
        this.mDropdown.style.zIndex = String(z);
        if (this.mTextarea && this.mTextarea.parentElement)
        {
            this.mTextarea.parentElement.appendChild(this.mDropdown);
        }
    }

    private renderMentionItems(): void
    {
        if (!this.mDropdown) { return; }
        clearChildren(this.mDropdown);
        const self = this;
        for (let i = 0; i < this.mItems.length; i++)
        {
            const item = this.buildMentionItem(this.mItems[i]);
            const idx = i;
            item.addEventListener("mousedown", function(e)
            {
                e.preventDefault();
                self.selectMentionItem(self.mItems[idx]);
            });
            this.mDropdown.appendChild(item);
        }
    }

    private buildMentionItem(user: MentionUser): HTMLElement
    {
        const item = createElement("div", CLS + "-mention-item");
        setAttr(item, "role", "option");
        setAttr(item, "aria-selected", "false");
        const av = this.buildAvatar(user);
        av.classList.add(CLS + "-mention-avatar");
        item.appendChild(av);
        const name = createElement("span", CLS + "-mention-name");
        name.textContent = user.name;
        item.appendChild(name);
        if (user.email)
        {
            const em = createElement("span", CLS + "-mention-email");
            em.textContent = user.email;
            item.appendChild(em);
        }
        return item;
    }

    private highlightMentionItem(): void
    {
        if (!this.mDropdown) { return; }
        const children = this.mDropdown.children;
        for (let i = 0; i < children.length; i++)
        {
            const active = i === this.mActiveIdx;
            children[i].classList.toggle(
                CLS + "-mention-item-active", active
            );
            setAttr(children[i] as HTMLElement, "aria-selected",
                active ? "true" : "false");
        }
    }

    private selectMentionItem(user: MentionUser): void
    {
        if (!this.mTextarea) { return; }
        const val = this.mTextarea.value;
        const before = val.slice(0, this.mStart);
        const pos = this.mTextarea.selectionStart || val.length;
        const after = val.slice(pos);
        const insert = "@[" + user.id + "] ";
        this.mTextarea.value = before + insert + after;
        this.mTextarea.focus();
        const np = before.length + insert.length;
        this.mTextarea.setSelectionRange(np, np);
        this.closeMentionDropdown();
        if (this.opts.onMention)
        {
            this.opts.onMention(user.id, this.mThreadId, "");
        }
    }

    private handleMentionKeydown(e: KeyboardEvent): void
    {
        if (!this.mDropdown) { return; }
        if (e.key === "ArrowDown")
        {
            e.preventDefault();
            this.mActiveIdx = Math.min(
                this.mActiveIdx + 1, this.mItems.length - 1
            );
            this.highlightMentionItem();
        }
        else if (e.key === "ArrowUp")
        {
            e.preventDefault();
            this.mActiveIdx = Math.max(this.mActiveIdx - 1, 0);
            this.highlightMentionItem();
        }
        else if (e.key === "Enter" && this.mActiveIdx >= 0)
        {
            e.preventDefault();
            e.stopPropagation();
            this.selectMentionItem(this.mItems[this.mActiveIdx]);
        }
        else if (e.key === "Escape")
        {
            this.closeMentionDropdown();
        }
    }

    private closeMentionDropdown(): void
    {
        if (this.mDropdown)
        {
            this.mDropdown.remove();
            this.mDropdown = null;
        }
        this.mActiveIdx = -1;
        this.mStart = -1;
        this.mItems = [];
    }

    // ── Popover Positioning ────────────────────────────────────────

    private positionPopover(pop: HTMLElement, state: PinState): void
    {
        const ps = this.opts.pinSize ?? DEFAULT_PIN_SIZE;
        const gap = PIN_GAP;
        const pW = pop.offsetWidth ||
            (this.opts.panelWidth ?? DEFAULT_PANEL_WIDTH);
        const pH = pop.offsetHeight ||
            (this.opts.panelMaxHeight ?? DEFAULT_PANEL_MAX_HEIGHT);
        const cW = this.containerEl.scrollWidth;
        const cH = this.containerEl.scrollHeight;
        let x = state.lastX + ps + gap;
        let y = state.lastY;
        if (x + pW > cW) { x = state.lastX - pW - gap; }
        if (x < 0) { x = state.lastX; }
        if (y + pH > cH) { y = cH - pH - gap; }
        y = Math.max(gap, y);
        x = Math.max(gap, x);
        pop.style.left = x + "px";
        pop.style.top = y + "px";
    }

    // ── Timestamp ──────────────────────────────────────────────────

    private fmtTs(iso: string): string
    {
        if (this.opts.timestampFormat === "absolute")
        {
            return new Date(iso).toLocaleString();
        }
        return formatRelativeTime(iso);
    }

    private startTimestampUpdater(): void
    {
        const self = this;
        this.tsInterval = window.setInterval(function()
        {
            if (!self.threadPopoverEl) { return; }
            const els = self.threadPopoverEl.querySelectorAll("[data-ts]");
            for (let i = 0; i < els.length; i++)
            {
                const el = els[i] as HTMLElement;
                const iso = el.getAttribute("data-ts");
                if (iso) { el.textContent = self.fmtTs(iso); }
            }
        }, TIMESTAMP_UPDATE_MS);
    }

    // ── Observers ──────────────────────────────────────────────────

    private setupObservers(): void
    {
        const self = this;
        const dScroll = debounce(function()
        {
            self.reposition();
        }, REPOSITION_DEBOUNCE_MS);
        const dResize = debounce(function()
        {
            self.reposition();
        }, RESIZE_DEBOUNCE_MS);
        const dMutate = debounce(function()
        {
            self.reposition();
        }, MUTATION_DEBOUNCE_MS);
        this.scrollFn = dScroll;
        this.resizeFn = dResize;
        this.containerEl.addEventListener("scroll", dScroll);
        window.addEventListener("scroll", dScroll);
        window.addEventListener("resize", dResize);
        this.resizeObs = new ResizeObserver(dResize);
        this.resizeObs.observe(this.containerEl);
        this.mutationObs = new MutationObserver(dMutate);
        this.mutationObs.observe(this.containerEl, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style", "class"]
        });
    }

    private teardownObservers(): void
    {
        if (this.scrollFn)
        {
            this.containerEl.removeEventListener("scroll", this.scrollFn);
            window.removeEventListener("scroll", this.scrollFn);
        }
        if (this.resizeFn)
        {
            window.removeEventListener("resize", this.resizeFn);
        }
        if (this.resizeObs) { this.resizeObs.disconnect(); }
        if (this.mutationObs) { this.mutationObs.disconnect(); }
    }

    // ── Click Outside ──────────────────────────────────────────────

    private setupClickOutside(): void
    {
        const self = this;
        this.clickOutFn = function(e: MouseEvent)
        {
            if (!self.activeThreadId) { return; }
            const t = e.target as HTMLElement;
            if (t.closest("." + CLS + "-thread")) { return; }
            if (t.closest("." + CLS + "-pin")) { return; }
            self.closeAllThreads();
        };
        document.addEventListener("mousedown", this.clickOutFn);
    }

    // ── Announce ───────────────────────────────────────────────────

    private announce(msg: string): void
    {
        if (!this.liveRegion) { return; }
        this.liveRegion.textContent = "";
        const r = this.liveRegion;
        requestAnimationFrame(function() { r.textContent = msg; });
    }

    // ── UI Control (Public) ────────────────────────────────────────

    setVisible(visible: boolean): void
    {
        if (this.overlayEl)
        {
            this.overlayEl.style.display = visible ? "" : "none";
        }
    }

    setResolvedFilter(show: "all" | "resolved" | "unresolved"): void
    {
        this.resolvedFilter = show;
        const self = this;
        this.pinMap.forEach(function(state)
        {
            const r = state.data.thread.resolved;
            let vis = true;
            if (show === "resolved") { vis = r; }
            else if (show === "unresolved") { vis = !r; }
            state.el.style.display = vis ? "" : "none";
            if (state.connector)
            {
                state.connector.style.display = vis ? "" : "none";
            }
        });
    }

    getElement(): HTMLElement
    {
        return this.overlayEl!;
    }

    exportComments(): string
    {
        const data = this.getAllPins().map(function(p)
        {
            return {
                id: p.id,
                anchorSelector: p.anchorSelector || "",
                offsetX: p.offsetX,
                offsetY: p.offsetY,
                thread: p.thread,
                icon: p.icon,
                colour: p.colour
            };
        });
        return JSON.stringify(data, null, 2);
    }

    // ── Destroy ────────────────────────────────────────────────────

    destroy(): void
    {
        if (this.disposed) { return; }
        this.disposed = true;
        this.exitPlacementMode();
        this.closeAllThreads();
        this.teardownObservers();
        if (this.clickOutFn)
        {
            document.removeEventListener("mousedown", this.clickOutFn);
        }
        if (this.tsInterval) { clearInterval(this.tsInterval); }
        if (this.overlayEl) { this.overlayEl.remove(); }
        this.pinMap.clear();
        console.log(LOG_PREFIX, "Destroyed");
    }
}

// ============================================================================
// FACTORY + GLOBAL EXPORTS
// ============================================================================

export function createCommentOverlay(
    containerId: string,
    options: CommentOverlayOptions
): CommentOverlay
{
    const el = document.getElementById(containerId);
    if (el) { options.container = el; }
    return new CommentOverlay(options);
}

(window as unknown as Record<string, unknown>).CommentOverlay = CommentOverlay;
(window as unknown as Record<string, unknown>).createCommentOverlay = createCommentOverlay;
