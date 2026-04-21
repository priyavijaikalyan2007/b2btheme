/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: HoverCard
 * 📜 PURPOSE: Informational floating card for rich-on-hover detail previews.
 *    Drop-in replacement for ad-hoc per-component tooltips (GraphCanvas,
 *    Timeline, TreeView). role="tooltip" + aria-describedby + pointer-events
 *    none. Yields to ContextMenu via native contextmenu DOM event.
 * 🔗 RELATES: [[ContextMenu]], [[PropertyInspector]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer] -> [createHoverCard] -> [show/hide] -> [HoverCardHandle]
 * 📎 SPEC: specs/hovercard.prd.md · ADR-125
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[HoverCard]";

const _lu = (typeof (window as unknown as Record<string, unknown>)["createLogUtility"] === "function")
    ? ((window as unknown as Record<string, () => { getLogger: (p: string) => unknown }>)["createLogUtility"]()).getLogger(LOG_PREFIX.slice(1, -1))
    : null;

function logDebug(...a: unknown[]): void
{
    const l = _lu as { debug?: (...args: unknown[]) => void } | null;
    if (l && typeof l.debug === "function")
    {
        l.debug(...a);
    }
    else
    {
        console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
    }
}

function logWarn(...a: unknown[]): void
{
    const l = _lu as { warn?: (...args: unknown[]) => void } | null;
    if (l && typeof l.warn === "function")
    {
        l.warn(...a);
    }
    else
    {
        console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
    }
}

/** Default delay before opening (ms). */
const DEFAULT_OPEN_DELAY = 250;

/** Default delay before closing (ms). */
const DEFAULT_CLOSE_DELAY = 100;

/** Default maximum property rows shown before "+N more" summary. */
const DEFAULT_MAX_PROPERTIES = 5;

/** Default offset between anchor and card (px). */
const DEFAULT_OFFSET = 8;

/** Default maximum height of the card. */
const DEFAULT_MAX_HEIGHT = 320;

/** Viewport edge margin for clamping (px). */
const VIEWPORT_MARGIN = 8;

/** Character cap for property values before ellipsis truncation. */
const PROPERTY_VALUE_CAP = 160;

/** Description line clamp. */
const DESCRIPTION_LINE_CLAMP = 3;

/** Monotonic id counter for aria-describedby wiring. */
let hoverCardIdSeq = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** Structured content for the default card renderer. */
export interface HoverCardContent
{
    /** Header title line. Omitted when absent. */
    title?: string;
    /** Secondary dimmer line below the title (e.g. type key). */
    subtitle?: string;
    /** Bootstrap Icons class (e.g. "bi-diagram-3") or empty for color dot only. */
    icon?: string;
    /** CSS color for the icon/colored dot. */
    iconColor?: string;
    /** Optional status badge. */
    badge?: { text: string; variant?: "success" | "warning" | "danger" | "info" | "secondary" };
    /** Key/value rows. First `maxProperties` shown; remainder summarized. */
    properties?: Array<{ key: string; value: string }>;
    /** Free-form multi-line description. Rendered via textContent. */
    description?: string;
    /** Optional footer — string or caller-owned HTMLElement. */
    footer?: string | HTMLElement;
}

/** Union of supported content inputs. */
export type HoverCardInput = HoverCardContent | HTMLElement | string;

/**
 * Anchor can be an element (preferred — HTMLElement or SVGElement, anything
 * with getBoundingClientRect) or a rect-like for synthetic anchors.
 */
export type HoverCardAnchor =
    | Element
    | DOMRect
    | { x: number; y: number; width: number; height: number };

/** Configuration for a HoverCard instance. */
export interface HoverCardOptions
{
    /** Portal root for the card element. Default: document.body. */
    container?: HTMLElement;
    /** Placement relative to the anchor. Default: "auto". */
    placement?: "auto" | "top" | "bottom" | "left" | "right";
    /** Cross-axis alignment relative to the anchor. Default: "center". */
    align?: "start" | "center" | "end";
    /** Gap between anchor and card (px). Default: 8. */
    offset?: number;
    /** Delay before opening (ms). Default: 250. */
    openDelay?: number;
    /** Delay before closing (ms). Default: 100. */
    closeDelay?: number;
    /** Maximum property rows rendered. Default: 5. */
    maxProperties?: number;
    /** Maximum card height. Default: 320 (px). Accepts number or CSS value. */
    maxHeight?: number | string;
    /** Overflow cue when content exceeds maxHeight. Default: "fade". */
    overflowHint?: "fade" | "none";
    /** Extra class name appended to root. */
    className?: string;
    /** Fires when the card becomes visible. */
    onShow?: (anchor: HoverCardAnchor) => void;
    /** Fires when the card hides. */
    onHide?: () => void;
}

/** Public handle returned by createHoverCard. */
export interface HoverCardHandle
{
    /** Show or update the card anchored to `anchor` with `content`. */
    show(anchor: HoverCardAnchor, content: HoverCardInput): void;
    /** Hide the card (after closeDelay). */
    hide(): void;
    /** Replace content without moving the card. */
    update(content: HoverCardInput): void;
    /** Recompute position against current anchor. */
    reposition(): void;
    /** Whether the card is currently visible. */
    isOpen(): boolean;
    /** Returns the root element (creating it if needed). Escape hatch for tests. */
    getElement(): HTMLElement;
    /** Tear down all listeners and remove the card from the DOM. */
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with an optional class name. */
function createEl(tag: string, className?: string): HTMLElement
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
    for (const [k, v] of Object.entries(attrs))
    {
        el.setAttribute(k, v);
    }
}

/** Detect touch-primary devices where pointer-hover is unreliable. */
function isHoverCoarse(): boolean
{
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    {
        return false;
    }

    return window.matchMedia("(hover: none)").matches;
}

/** Truncate long strings with a single-ellipsis tail. Returns original if short. */
function ellipsize(value: string, cap: number): string
{
    if (value.length <= cap)
    {
        return value;
    }

    return value.slice(0, Math.max(0, cap - 1)) + "\u2026";
}

/** Walk parents collecting scroll ancestors. */
function scrollAncestors(el: Element): Array<EventTarget>
{
    const result: Array<EventTarget> = [];
    let node: Element | null = el.parentElement;

    while (node && node !== document.body)
    {
        const style = getComputedStyle(node);
        const overflow = style.overflow + style.overflowY + style.overflowX;

        if (/auto|scroll|overlay/.test(overflow))
        {
            result.push(node);
        }

        node = node.parentElement;
    }

    result.push(window);
    return result;
}

// ============================================================================
// CONTENT RENDERING
// ============================================================================

/**
 * Render a HoverCardContent object into DOM. Caller owns the returned root
 * and must replace the body element when `update` is called.
 */
export function renderCardContent(
    content: HoverCardContent,
    maxProperties: number
): HTMLElement
{
    const body = createEl("div", "hovercard-body");

    appendHeader(body, content);
    appendBadge(body, content);
    appendProperties(body, content, maxProperties);
    appendDescription(body, content);
    appendFooter(body, content);

    return body;
}

/** Header row: icon + title + optional subtitle. */
function appendHeader(body: HTMLElement, content: HoverCardContent): void
{
    if (!content.title && !content.subtitle && !content.icon)
    {
        return;
    }

    const header = createEl("div", "hovercard-header");

    if (content.icon || content.iconColor)
    {
        header.appendChild(buildHeaderIcon(content));
    }

    header.appendChild(buildTitleBlock(content));
    body.appendChild(header);
}

/** Icon swatch (colored dot or Bootstrap Icons glyph) for the header. */
function buildHeaderIcon(content: HoverCardContent): HTMLElement
{
    const icon = createEl("span", "hovercard-icon");

    if (content.iconColor)
    {
        icon.style.color = content.iconColor;
    }

    if (content.icon)
    {
        const inner = createEl("i", content.icon);
        setAttr(inner, { "aria-hidden": "true" });
        icon.appendChild(inner);
    }
    else
    {
        icon.classList.add("hovercard-icon-dot");
    }

    return icon;
}

/** Title + subtitle column for the header. */
function buildTitleBlock(content: HoverCardContent): HTMLElement
{
    const titleBlock = createEl("div", "hovercard-title-block");

    if (content.title)
    {
        const title = createEl("div", "hovercard-title");
        title.textContent = content.title;
        titleBlock.appendChild(title);
    }

    if (content.subtitle)
    {
        const sub = createEl("div", "hovercard-subtitle");
        sub.textContent = content.subtitle;
        titleBlock.appendChild(sub);
    }

    return titleBlock;
}

/** Badge row: status pill. */
function appendBadge(body: HTMLElement, content: HoverCardContent): void
{
    if (!content.badge || !content.badge.text)
    {
        return;
    }

    const variant = content.badge.variant ?? "secondary";
    const badge = createEl("span", `hovercard-badge badge bg-${variant}`);
    badge.textContent = content.badge.text;
    body.appendChild(badge);
}

/** Properties block: key/value rows with truncation. */
function appendProperties(
    body: HTMLElement,
    content: HoverCardContent,
    maxProperties: number
): void
{
    if (!content.properties || content.properties.length === 0)
    {
        return;
    }

    const list = createEl("dl", "hovercard-properties");
    const visible = content.properties.slice(0, maxProperties);

    for (const entry of visible)
    {
        list.appendChild(renderPropertyRow(entry));
    }

    const overflow = content.properties.length - visible.length;
    if (overflow > 0)
    {
        list.appendChild(renderPropertyOverflow(overflow));
    }

    body.appendChild(list);
}

/** One dt/dd pair for a properties-block row. */
function renderPropertyRow(entry: { key: string; value: string }): HTMLElement
{
    const row = createEl("div", "hovercard-property");
    const dt = createEl("dt", "hovercard-property-key");
    const dd = createEl("dd", "hovercard-property-value");

    dt.textContent = entry.key;
    dd.textContent = ellipsize(entry.value, PROPERTY_VALUE_CAP);
    setAttr(dd, { title: entry.value });

    row.appendChild(dt);
    row.appendChild(dd);
    return row;
}

/** "+N more" trailer row for properties that exceeded maxProperties. */
function renderPropertyOverflow(overflow: number): HTMLElement
{
    const more = createEl("div", "hovercard-property-more");
    more.textContent = `+${overflow} more`;
    return more;
}

/** Description paragraph — multi-line, CSS-clamped. */
function appendDescription(body: HTMLElement, content: HoverCardContent): void
{
    if (!content.description)
    {
        return;
    }

    const desc = createEl("p", "hovercard-description");
    setAttr(desc, { style: `--hovercard-desc-clamp: ${DESCRIPTION_LINE_CLAMP};` });
    desc.textContent = content.description;
    body.appendChild(desc);
}

/** Footer row: string or caller-owned HTMLElement. */
function appendFooter(body: HTMLElement, content: HoverCardContent): void
{
    if (!content.footer)
    {
        return;
    }

    const footer = createEl("div", "hovercard-footer");

    if (typeof content.footer === "string")
    {
        footer.textContent = content.footer;
    }
    else
    {
        footer.appendChild(content.footer);
    }

    body.appendChild(footer);
}

/** Build a body node for the escape-hatch path (HTMLElement or string). */
function renderEscapeBody(content: HTMLElement | string): HTMLElement
{
    const wrap = createEl("div", "hovercard-body hovercard-body-custom");

    if (typeof content === "string")
    {
        const p = createEl("div", "hovercard-body-plain");
        p.textContent = content;
        wrap.appendChild(p);
    }
    else
    {
        wrap.appendChild(content);
    }

    return wrap;
}

// ============================================================================
// POSITIONING
// ============================================================================

/** A rect usable by the positioning engine. */
interface Rect { x: number; y: number; width: number; height: number }

/** Pure placement result (viewport-space). */
export interface PositionResult
{
    x: number;
    y: number;
    placement: "top" | "bottom" | "left" | "right";
}

/** Normalize any anchor into a Rect in viewport coordinates. */
export function resolveAnchorRect(anchor: HoverCardAnchor): Rect
{
    // Covers HTMLElement AND SVGElement — both descend from Element and both
    // implement getBoundingClientRect(). Important for GraphCanvas/DiagramEngine,
    // where the hovered anchor is an SVG <g> node.
    if (anchor instanceof Element)
    {
        const r = anchor.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
    }

    const maybeRect = anchor as DOMRect;
    if (typeof maybeRect.left === "number" && typeof maybeRect.top === "number")
    {
        return { x: maybeRect.left, y: maybeRect.top, width: maybeRect.width, height: maybeRect.height };
    }

    const plain = anchor as { x: number; y: number; width: number; height: number };
    return { x: plain.x, y: plain.y, width: plain.width, height: plain.height };
}

/**
 * Try a specific placement. The primary axis (vertical for top/bottom,
 * horizontal for left/right) must fit; the cross axis is clamped into the
 * viewport. Returns null only when the primary axis can't fit at all.
 */
function tryPlace(
    anchor: Rect,
    card: { width: number; height: number },
    placement: "top" | "bottom" | "left" | "right",
    align: "start" | "center" | "end",
    offset: number,
    viewport: { width: number; height: number }
): PositionResult | null
{
    const raw = rawPlacement(anchor, card, placement, align, offset);
    const fits = primaryFits(raw, placement, card, viewport);

    if (!fits)
    {
        return null;
    }

    return clampToViewport({ x: raw.x, y: raw.y, placement }, card, viewport);
}

/** Unclamped (x,y) candidate for the requested placement + alignment. */
function rawPlacement(
    anchor: Rect,
    card: { width: number; height: number },
    placement: "top" | "bottom" | "left" | "right",
    align: "start" | "center" | "end",
    offset: number
): { x: number; y: number }
{
    if (placement === "bottom" || placement === "top")
    {
        return verticalPlacement(anchor, card, placement, align, offset);
    }

    return horizontalPlacement(anchor, card, placement, align, offset);
}

function verticalPlacement(
    anchor: Rect,
    card: { width: number; height: number },
    placement: "top" | "bottom",
    align: "start" | "center" | "end",
    offset: number
): { x: number; y: number }
{
    const x = alignAcross(anchor.x, anchor.width, card.width, align);
    const y = placement === "bottom"
        ? anchor.y + anchor.height + offset
        : anchor.y - card.height - offset;
    return { x, y };
}

function horizontalPlacement(
    anchor: Rect,
    card: { width: number; height: number },
    placement: "left" | "right",
    align: "start" | "center" | "end",
    offset: number
): { x: number; y: number }
{
    const y = alignAcross(anchor.y, anchor.height, card.height, align);
    const x = placement === "right"
        ? anchor.x + anchor.width + offset
        : anchor.x - card.width - offset;
    return { x, y };
}

/** Whether the primary axis for a placement fits in the viewport. */
function primaryFits(
    raw: { x: number; y: number },
    placement: "top" | "bottom" | "left" | "right",
    card: { width: number; height: number },
    viewport: { width: number; height: number }
): boolean
{
    if (placement === "bottom") { return raw.y + card.height <= viewport.height - VIEWPORT_MARGIN; }
    if (placement === "top")    { return raw.y >= VIEWPORT_MARGIN; }
    if (placement === "right")  { return raw.x + card.width <= viewport.width - VIEWPORT_MARGIN; }
    return raw.x >= VIEWPORT_MARGIN;
}

/** Compute cross-axis offset for a given alignment. */
function alignAcross(
    anchorStart: number,
    anchorSize: number,
    cardSize: number,
    align: "start" | "center" | "end"
): number
{
    if (align === "start")
    {
        return anchorStart;
    }

    if (align === "end")
    {
        return anchorStart + anchorSize - cardSize;
    }

    return anchorStart + (anchorSize - cardSize) / 2;
}

/** Clamp a candidate into the viewport, preserving placement. */
function clampToViewport(
    pos: PositionResult,
    card: { width: number; height: number },
    viewport: { width: number; height: number }
): PositionResult
{
    const x = Math.max(
        VIEWPORT_MARGIN,
        Math.min(pos.x, viewport.width - card.width - VIEWPORT_MARGIN)
    );
    const y = Math.max(
        VIEWPORT_MARGIN,
        Math.min(pos.y, viewport.height - card.height - VIEWPORT_MARGIN)
    );

    return { x, y, placement: pos.placement };
}

/** Pure compute: returns viewport-space x/y and the chosen placement. */
export function computePosition(
    anchor: Rect,
    card: { width: number; height: number },
    placement: HoverCardOptions["placement"],
    align: "start" | "center" | "end",
    offset: number,
    viewport: { width: number; height: number }
): PositionResult
{
    const order = placementChain(placement);

    for (const candidate of order)
    {
        const hit = tryPlace(anchor, card, candidate, align, offset, viewport);
        if (hit)
        {
            return hit;
        }
    }

    const fallback: PositionResult = {
        x: anchor.x + anchor.width / 2 - card.width / 2,
        y: anchor.y + anchor.height + offset,
        placement: "bottom",
    };

    return clampToViewport(fallback, card, viewport);
}

/** Resolve placement preference into an ordered attempt chain. */
function placementChain(
    pref: HoverCardOptions["placement"]
): Array<"top" | "bottom" | "left" | "right">
{
    if (pref === "top")
    {
        return ["top", "bottom", "right", "left"];
    }

    if (pref === "bottom" || !pref || pref === "auto")
    {
        return ["bottom", "top", "right", "left"];
    }

    if (pref === "left")
    {
        return ["left", "right", "bottom", "top"];
    }

    return ["right", "left", "bottom", "top"];
}

// ============================================================================
// INTERNAL STATE
// ============================================================================

interface CardState
{
    options: Required<Omit<HoverCardOptions, "container" | "className" | "onShow" | "onHide">>
        & Pick<HoverCardOptions, "container" | "className" | "onShow" | "onHide">;
    rootEl: HTMLElement | null;
    bodyEl: HTMLElement | null;
    anchor: HoverCardAnchor | null;
    content: HoverCardInput | null;
    open: boolean;
    destroyed: boolean;
    openTimer: number;
    closeTimer: number;
    anchorRafId: number;
    attachedAnchorEl: HTMLElement | null;
    id: string;
    listeners: Array<{ target: EventTarget; type: string; fn: EventListener; opts?: AddEventListenerOptions }>;
    globalListeners: Array<{ target: EventTarget; type: string; fn: EventListener; opts?: AddEventListenerOptions }>;
}

function buildState(options: HoverCardOptions | undefined): CardState
{
    return {
        options: resolveOptions(options ?? {}),
        rootEl: null,
        bodyEl: null,
        anchor: null,
        content: null,
        open: false,
        destroyed: false,
        openTimer: 0,
        closeTimer: 0,
        anchorRafId: 0,
        attachedAnchorEl: null,
        id: `hovercard-${++hoverCardIdSeq}`,
        listeners: [],
        globalListeners: [],
    };
}

/** Fill in defaults for any omitted HoverCardOptions fields. */
function resolveOptions(opts: HoverCardOptions): CardState["options"]
{
    return {
        container: opts.container,
        placement: opts.placement ?? "auto",
        align: opts.align ?? "center",
        offset: opts.offset ?? DEFAULT_OFFSET,
        openDelay: opts.openDelay ?? DEFAULT_OPEN_DELAY,
        closeDelay: opts.closeDelay ?? DEFAULT_CLOSE_DELAY,
        maxProperties: opts.maxProperties ?? DEFAULT_MAX_PROPERTIES,
        maxHeight: opts.maxHeight ?? DEFAULT_MAX_HEIGHT,
        overflowHint: opts.overflowHint ?? "fade",
        className: opts.className,
        onShow: opts.onShow,
        onHide: opts.onHide,
    };
}

// ============================================================================
// FACTORY
// ============================================================================

// ⚓ createHoverCard
/**
 * Create a HoverCard instance. The card DOM is lazily created on first show.
 * Hosts managing many anchors (e.g. GraphCanvas) should create one handle
 * and wire multiple anchors via attachHoverCard(..., { shared }).
 */
export function createHoverCard(options?: HoverCardOptions): HoverCardHandle
{
    const state = buildState(options);
    attachGlobalListeners(state);
    logDebug("created", state.id);

    return {
        show: (anchor, content) => showCard(state, anchor, content),
        hide: () => hideCard(state, "api"),
        update: (content) => updateCard(state, content),
        reposition: () => repositionCard(state),
        isOpen: () => state.open,
        getElement: () => ensureRoot(state),
        destroy: () => destroyCard(state),
    };
}

// ============================================================================
// LIFECYCLE
// ============================================================================

/** Build the root card element on first use. */
function ensureRoot(state: CardState): HTMLElement
{
    if (state.rootEl)
    {
        return state.rootEl;
    }

    if (state.destroyed)
    {
        throw new Error(`${LOG_PREFIX} handle is destroyed`);
    }

    const root = buildRootElement(state);
    const body = createEl("div", "hovercard-body-slot");
    root.appendChild(body);
    state.bodyEl = body;

    const container = state.options.container ?? document.body;
    container.appendChild(root);
    state.rootEl = root;

    return root;
}

/** Construct the bare root element with attrs, classes, and inline style. */
function buildRootElement(state: CardState): HTMLElement
{
    const root = createEl("div", "hovercard");
    setAttr(root, {
        role: "tooltip",
        "aria-live": "polite",
        id: state.id,
    });

    if (state.options.className)
    {
        root.classList.add(state.options.className);
    }

    if (state.options.overflowHint === "none")
    {
        root.classList.add("hovercard-no-fade");
    }

    root.style.position = "fixed";
    root.style.visibility = "hidden";
    root.style.maxHeight = normalizeCssSize(state.options.maxHeight);
    return root;
}

function normalizeCssSize(value: number | string): string
{
    if (typeof value === "number")
    {
        return `${value}px`;
    }

    return value;
}

/**
 * Show or update the card. If already open for a different anchor, the card
 * updates in place (no close/reopen flash).
 */
function showCard(state: CardState, anchor: HoverCardAnchor, content: HoverCardInput): void
{
    if (state.destroyed)
    {
        logWarn("show() on destroyed handle");
        return;
    }

    state.anchor = anchor;
    state.content = content;

    if (state.closeTimer)
    {
        clearTimeout(state.closeTimer);
        state.closeTimer = 0;
    }

    if (state.open)
    {
        renderAndPosition(state);
        return;
    }

    if (state.openTimer)
    {
        clearTimeout(state.openTimer);
    }

    const delay = state.options.openDelay;
    state.openTimer = window.setTimeout(() => openNow(state), delay);
}

/** Perform the actual open — render, position, show. */
function openNow(state: CardState): void
{
    state.openTimer = 0;

    if (state.destroyed || !state.anchor || state.content == null)
    {
        return;
    }

    renderAndPosition(state);
    const root = ensureRoot(state);
    root.classList.add("hovercard-open");
    root.style.visibility = "visible";
    state.open = true;

    attachOpenListeners(state);
    startAnchorWatch(state);
    state.options.onShow?.(state.anchor);
    logDebug("show", state.id);
}

/** Render current content and apply position. */
function renderAndPosition(state: CardState): void
{
    ensureRoot(state);

    if (state.bodyEl)
    {
        state.bodyEl.replaceChildren();
        const rendered = renderContent(state.content as HoverCardInput, state.options.maxProperties);
        state.bodyEl.appendChild(rendered);
    }

    applyPlacement(state);
}

/** Dispatch rendering to the correct path (declarative vs escape hatch). */
function renderContent(input: HoverCardInput, maxProperties: number): HTMLElement
{
    if (input instanceof HTMLElement || typeof input === "string")
    {
        return renderEscapeBody(input);
    }

    return renderCardContent(input, maxProperties);
}

/** Compute and apply position against the current anchor. */
function applyPlacement(state: CardState): void
{
    if (!state.rootEl || !state.anchor)
    {
        return;
    }

    const anchorRect = resolveAnchorRect(state.anchor);
    const cardSize = { width: state.rootEl.offsetWidth || 280, height: state.rootEl.offsetHeight || 120 };
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    const pos = computePosition(
        anchorRect,
        cardSize,
        state.options.placement,
        state.options.align,
        state.options.offset,
        viewport
    );

    state.rootEl.style.left = `${Math.round(pos.x)}px`;
    state.rootEl.style.top = `${Math.round(pos.y)}px`;
    state.rootEl.dataset.placement = pos.placement;
}

/** Hide the card (after closeDelay unless immediate). */
function hideCard(state: CardState, reason: string, immediate = false): void
{
    if (state.openTimer)
    {
        clearTimeout(state.openTimer);
        state.openTimer = 0;
    }

    if (!state.open && !state.openTimer)
    {
        return;
    }

    if (immediate)
    {
        closeNow(state, reason);
        return;
    }

    if (state.closeTimer)
    {
        return;
    }

    state.closeTimer = window.setTimeout(() => closeNow(state, reason), state.options.closeDelay);
}

function closeNow(state: CardState, reason: string): void
{
    state.closeTimer = 0;

    if (!state.rootEl)
    {
        return;
    }

    state.rootEl.classList.remove("hovercard-open");
    state.rootEl.style.visibility = "hidden";
    state.open = false;
    stopAnchorWatch(state);
    detachOpenListeners(state);
    state.options.onHide?.();
    logDebug("hide", state.id, reason);
}

/** Replace content in-place without moving. */
function updateCard(state: CardState, content: HoverCardInput): void
{
    state.content = content;

    if (!state.open)
    {
        return;
    }

    renderAndPosition(state);
}

/** Recompute position without changing content. */
function repositionCard(state: CardState): void
{
    if (!state.open)
    {
        return;
    }

    applyPlacement(state);
}

function destroyCard(state: CardState): void
{
    if (state.destroyed)
    {
        return;
    }

    closeNow(state, "destroy");
    detachGlobalListeners(state);

    if (state.rootEl && state.rootEl.parentElement)
    {
        state.rootEl.parentElement.removeChild(state.rootEl);
    }

    state.rootEl = null;
    state.bodyEl = null;
    state.destroyed = true;
    logDebug("destroy", state.id);
}

// ============================================================================
// LISTENERS
// ============================================================================

/** Listeners always present for the handle's lifetime. */
function attachGlobalListeners(state: CardState): void
{
    const onNativeContext = (): void => hideCard(state, "native-contextmenu", true);
    const onYield = (): void => hideCard(state, "yield-event", true);

    addTracked(state.globalListeners, document, "contextmenu", onNativeContext, { capture: true });
    addTracked(state.globalListeners, document, "hovercard:yield", onYield, {});
}

/** Listeners installed on show, removed on hide. */
function attachOpenListeners(state: CardState): void
{
    detachOpenListeners(state);

    const onKey = (ev: Event): void =>
    {
        const ke = ev as KeyboardEvent;
        if (ke.key === "Escape")
        {
            hideCard(state, "escape", true);
        }
    };
    const onScroll = (): void => hideCard(state, "scroll", true);
    const onResize = (): void => hideCard(state, "resize", true);

    addTracked(state.listeners, document, "keydown", onKey, {});
    addTracked(state.listeners, window, "resize", onResize, { passive: true });

    if (state.anchor instanceof Element)
    {
        for (const target of scrollAncestors(state.anchor))
        {
            addTracked(state.listeners, target, "scroll", onScroll, { passive: true, capture: true });
        }
    }
    else
    {
        addTracked(state.listeners, window, "scroll", onScroll, { passive: true, capture: true });
    }
}

function detachOpenListeners(state: CardState): void
{
    for (const l of state.listeners)
    {
        l.target.removeEventListener(l.type, l.fn, l.opts);
    }
    state.listeners = [];
}

function detachGlobalListeners(state: CardState): void
{
    for (const l of state.globalListeners)
    {
        l.target.removeEventListener(l.type, l.fn, l.opts);
    }
    state.globalListeners = [];
}

function addTracked(
    bucket: CardState["listeners"],
    target: EventTarget,
    type: string,
    fn: EventListener,
    opts: AddEventListenerOptions
): void
{
    target.addEventListener(type, fn, opts);
    bucket.push({ target, type, fn, opts });
}

// ============================================================================
// ANCHOR WATCH
// ============================================================================

/** Poll (via rAF) so the card hides if the anchor element is detached. */
function startAnchorWatch(state: CardState): void
{
    stopAnchorWatch(state);

    const tick = (): void =>
    {
        if (!state.open)
        {
            return;
        }

        const el = state.anchor instanceof Element ? state.anchor : null;
        if (el && !document.contains(el))
        {
            hideCard(state, "anchor-detached", true);
            return;
        }

        state.anchorRafId = requestAnimationFrame(tick);
    };

    state.anchorRafId = requestAnimationFrame(tick);
}

function stopAnchorWatch(state: CardState): void
{
    if (state.anchorRafId)
    {
        cancelAnimationFrame(state.anchorRafId);
        state.anchorRafId = 0;
    }
}

// ============================================================================
// attachHoverCard HELPER
// ============================================================================

/** Options for attachHoverCard. */
export interface AttachHoverCardOptions extends HoverCardOptions
{
    /** Reuse an existing handle across many anchors (recommended for large graphs). */
    shared?: HoverCardHandle;
}

// ⚓ attachHoverCard
/**
 * Wire an anchor element to a HoverCard via mouseenter / mouseleave / focusin /
 * focusout. Returns a detach() function that cleans up listeners and, if the
 * handle was owned internally, destroys it.
 *
 * Touch-primary devices are no-opped per §4.7 (hover: none).
 */
export function attachHoverCard(
    anchor: HTMLElement,
    getContent: () => HoverCardInput | null,
    options?: AttachHoverCardOptions
): () => void
{
    if (isHoverCoarse())
    {
        return () => { /* no-op */ };
    }

    const owned = !options?.shared;
    const handle = options?.shared ?? createHoverCard(options);

    const onEnter = (): void => openOnAnchor(handle, anchor, getContent);
    const onLeave = (): void => closeOnAnchor(handle, anchor);

    const types: Array<keyof HTMLElementEventMap> = ["mouseenter", "mouseleave", "focusin", "focusout"];
    const listeners: Array<[string, EventListener]> = [
        ["mouseenter", onEnter], ["mouseleave", onLeave],
        ["focusin", onEnter],    ["focusout", onLeave],
    ];
    for (const [type, fn] of listeners)
    {
        anchor.addEventListener(type, fn);
    }
    void types;

    return () => detachAnchorListeners(anchor, listeners, handle, owned);
}

/** Show + wire aria-describedby. Skips when getContent returns null. */
function openOnAnchor(
    handle: HoverCardHandle,
    anchor: HTMLElement,
    getContent: () => HoverCardInput | null
): void
{
    const content = getContent();
    if (content == null) { return; }

    handle.show(anchor, content);
    setAttr(anchor, { "aria-describedby": handle.getElement().id });
}

/** Hide + clear aria-describedby. */
function closeOnAnchor(handle: HoverCardHandle, anchor: HTMLElement): void
{
    handle.hide();
    anchor.removeAttribute("aria-describedby");
}

/** Remove listeners and optionally destroy the owned handle. */
function detachAnchorListeners(
    anchor: HTMLElement,
    listeners: Array<[string, EventListener]>,
    handle: HoverCardHandle,
    owned: boolean
): void
{
    for (const [type, fn] of listeners)
    {
        anchor.removeEventListener(type, fn);
    }
    anchor.removeAttribute("aria-describedby");

    if (owned) { handle.destroy(); }
}

// ============================================================================
// WINDOW GLOBALS (IIFE runtime access)
// ============================================================================
// IIFE-wrapped component files share state only through window. Other
// components (GraphCanvas, Timeline, etc.) call createHoverCard via
// (window as any).createHoverCard. See scripts/wrap-iife.sh.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).createHoverCard = createHoverCard;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).attachHoverCard = attachHoverCard;
