/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 4e8a1c93-27d6-4b51-8f0a-63b9d4e7205c
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Annotation
 * 📜 PURPOSE: Callout, arrow and highlight overlays for the dynamic canvas.
 *    Plain inline SVG — no canvas context, no observer, no engine — so an
 *    annotation stays trivial under the mount budget.
 *
 *    Built AFTER the Surface contract and only against its public API, as the
 *    second proof that the contract needs no private hooks (ADR-141).
 * 🔗 RELATES: [[DynamicCanvas]], [[StickyNote]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [createAnnotation()] -> [inline SVG] -> [change channel]
 * 🔒 SECURITY: Labels are user content and are set through textContent only;
 *    no SVG markup is ever assembled from a string.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker annotation
// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[Annotation]";

/** Root CSS class. */
const CLS = "annotation";

/** SVG namespace. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** Annotation kinds. Anything else falls back to the first entry. */
const KINDS = ["callout", "arrow", "highlight"] as const;

/** Palette an annotation may use. */
const COLORS = ["amber", "blue", "green", "red", "grey"] as const;

/**
 * Hover dwell before an annotation expands, in milliseconds.
 *
 * Long enough that sweeping the pointer across a canvas of twenty annotations
 * opens none of them; short enough that deliberately resting on one feels
 * immediate. Matches the HoverCard convention (ADR-125).
 */
const HOVER_OPEN_MS = 400;

/** Grace period before collapsing again, so a wobbling pointer does not flicker. */
const HOVER_CLOSE_MS = 150;

/** Resting-state glyph per kind. */
const MARKER_GLYPH: Readonly<Record<string, string>> =
{
    callout: "\u201C",
    arrow: "\u2197",
    highlight: "\u25A3",
};

// ============================================================================
// TYPES
// ============================================================================

/** Kind of overlay drawn. */
export type AnnotationKind = typeof KINDS[number];

/** A colour from the annotation palette. */
export type AnnotationColor = typeof COLORS[number];

/** What an annotation is attached to. Mirrors the runtime's Anchor union. */
export type AnnotationAnchor =
    | { kind: "canvas" }
    | { kind: "node"; nodeId: string }
    | { kind: "entity"; entityId: string };

/** Options for an annotation. */
export interface AnnotationOptions
{
    /** Overlay kind. Defaults to "callout". */
    kind?: string;

    /** Text shown by a callout, and the accessible name for every kind. */
    label?: string;

    /** Alias for `label`, for DynamicFormSwitcher convention (ADR-134). */
    value?: string;

    /** Palette colour. Defaults to "amber". */
    color?: string;

    /** What the annotation is attached to. Defaults to the canvas. */
    anchor?: AnnotationAnchor;

    /**
     * Allow the text to be edited in place when expanded. Default true.
     *
     * An annotation carries user-authored text, so it is editable for the same
     * reason a sticky note is. Set false for a read-only or shared canvas.
     */
    editable?: boolean;

    /**
     * Start expanded rather than collapsed to a marker. Default false.
     *
     * An annotation is a mark ON something. Twenty expanded callouts would
     * bury the very thing they annotate, so the resting state is a marker and
     * the content appears on demand.
     */
    expanded?: boolean;

    /**
     * Expand on sustained hover as well as on click. Default true.
     *
     * Set false where hover is unavailable or unwanted; click always works.
     */
    expandOnHover?: boolean;

    /** Fires when the annotation expands or collapses. */
    onToggle?: (expanded: boolean) => void;

    /** Fires whenever the label, kind or colour changes. */
    onChange?: (state: Record<string, unknown>) => void;

    /** Fires when the anchor changes. */
    onAnchorChange?: (anchor: AnnotationAnchor) => void;
}

/** Handle returned by createAnnotation. */
export interface AnnotationHandle
{
    // -- Surface contract (ADR-141)

    /** Fills a declared slot. The annotation declares one slot, "label". */
    setData(slot: string, value: unknown): void;

    /** Subscribes to "change" or "anchor". Returns an unsubscribe function. */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restores state produced by getState(). Partial input allowed. */
    setState(state: Record<string, unknown>): void;

    /** Tears down the annotation. Idempotent. */
    destroy(): void;

    // -- Field aliases (ADR-134)

    /** Current label. */
    getValue(): string;

    /** Replaces the label. */
    setValue(label: string): void;

    // -- Domain surface

    /** What the annotation is attached to. */
    getAnchor(): AnnotationAnchor;

    /** Re-attaches the annotation and emits on the "anchor" channel. */
    setAnchor(anchor: AnnotationAnchor): void;

    /** Whether the annotation is currently showing its content. */
    isExpanded(): boolean;

    /** Expands or collapses, emitting on the "toggle" channel. */
    setExpanded(expanded: boolean): void;

    /** Root element, or null once destroyed. */
    getElement(): HTMLElement | null;
}

// ============================================================================
// LOGGING
// ============================================================================

/** Emits a structured info log. */
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

/** Emits a structured warning. */
function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

/** Emits a structured error. */
function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Creates an SVG element with attributes.
 *
 * @param tag   - SVG tag name.
 * @param attrs - Attributes to set.
 * @returns The element.
 */
function svg(
    tag: string,
    attrs: Record<string, string> = {}): SVGElement
{
    const node = document.createElementNS(SVG_NS, tag);

    for (const [key, value] of Object.entries(attrs))
    {
        node.setAttribute(key, value);
    }

    return node;
}

/**
 * Normalises a requested kind.
 *
 * @param value - Requested kind.
 * @returns A supported kind.
 */
function normaliseKind(value: unknown): AnnotationKind
{
    return KINDS.includes(value as AnnotationKind)
        ? value as AnnotationKind
        : KINDS[0];
}

/**
 * Normalises a requested colour.
 *
 * @param value - Requested colour.
 * @returns A palette colour.
 */
function normaliseColor(value: unknown): AnnotationColor
{
    return COLORS.includes(value as AnnotationColor)
        ? value as AnnotationColor
        : COLORS[0];
}

/**
 * Validates an anchor.
 *
 * @param anchor - Candidate anchor.
 * @returns The anchor, unchanged.
 * @throws Error naming the legal kinds.
 */
function assertAnchor(anchor: AnnotationAnchor): AnnotationAnchor
{
    const kind = (anchor ?? {}).kind;

    if (kind === "canvas"
        || (kind === "node" && typeof (anchor as { nodeId?: string }).nodeId === "string")
        || (kind === "entity" && typeof (anchor as { entityId?: string }).entityId === "string"))
    {
        return anchor;
    }

    throw new Error(
        `${LOG_PREFIX} Unrecognised anchor ${JSON.stringify(anchor)}. Use `
        + "{ kind: \"canvas\" }, { kind: \"node\", nodeId } or "
        + "{ kind: \"entity\", entityId }.");
}

// ============================================================================
// DRAWING
// ============================================================================

/**
 * Builds the expanded body for a kind.
 *
 * Callout and highlight are HTML, not SVG. An SVG box stretched to the node's
 * aspect ratio distorts its own corners and any text inside it, which is what
 * made these look crude. Only the arrow is genuinely a drawing.
 *
 * @param kind  - Overlay kind.
 * @param label - Label text.
 * @returns The body element.
 */
function buildBody(
    kind: AnnotationKind,
    label: string,
    editable: boolean,
    onEdit: (text: string) => void): HTMLElement
{
    if (kind === "arrow")
    {
        return buildArrow(label);
    }

    if (kind === "highlight")
    {
        return buildHighlight(label);
    }

    return buildCallout(label, editable, onEdit);
}

/**
 * A popover card, modelled on the CommentOverlay thread popover: surface
 * background, hairline border, theme shadow, and a small tail pointing back at
 * whatever is being annotated.
 *
 * @param label - Label text.
 * @returns The card element.
 */
function buildCallout(
    label: string,
    editable: boolean,
    onEdit: (text: string) => void): HTMLElement
{
    const card = document.createElement("div");
    card.className = `${CLS}-card`;

    if (!editable)
    {
        const text = elementWithClass("div", `${CLS}-card-text`);
        text.textContent = label;
        card.appendChild(text);

        return card;
    }

    // A textarea, not contenteditable. Pasting into contenteditable inserts
    // MARKUP, which would drive a hole straight through this library's
    // textContent-only discipline. A textarea cannot carry markup at all.
    const field = document.createElement("textarea");
    field.className = `${CLS}-card-input`;
    field.value = label;
    field.rows = 2;
    field.setAttribute("aria-label", "Annotation text");

    field.addEventListener("input", () => onEdit(field.value));

    // Clicks inside the editor must not reach the marker's toggle.
    field.addEventListener("click", (e) => e.stopPropagation());

    card.appendChild(field);

    return card;
}

/**
 * A translucent wash over the region being marked.
 *
 * @param label - Label text, shown as a small caption when present.
 * @returns The highlight element.
 */
function buildHighlight(label: string): HTMLElement
{
    const wash = document.createElement("div");
    wash.className = `${CLS}-wash`;

    if (label.length > 0)
    {
        const caption = document.createElement("span");
        caption.className = `${CLS}-caption`;
        caption.textContent = label;
        wash.appendChild(caption);
    }

    return wash;
}

/**
 * An arrow drawn as SVG, with its stroke exempted from scaling so the line
 * weight stays even however the box is stretched.
 *
 * @param label - Label text, shown beside the arrow when present.
 * @returns The arrow element.
 */
function buildArrow(label: string): HTMLElement
{
    const wrap = elementWithClass("div", `${CLS}-arrow`);

    const root = svg("svg", {
        class: `${CLS}-svg`,
        viewBox: "0 0 100 100",
        preserveAspectRatio: "none",
    });

    root.appendChild(svg("line", {
        class: `${CLS}-shape`,
        x1: "6", y1: "94", x2: "82", y2: "18",
    }));

    root.appendChild(svg("polygon", {
        class: `${CLS}-head`,
        points: "94,6 74,14 86,26",
    }));

    applyAccessibleName(root, label);
    wrap.appendChild(root);

    if (label.length > 0)
    {
        const caption = document.createElement("span");
        caption.className = `${CLS}-caption`;
        caption.textContent = label;
        wrap.appendChild(caption);
    }

    return wrap;
}

/**
 * Creates an element with a class name.
 *
 * @param tag - Tag name.
 * @param cls - Class name.
 * @returns The element.
 */
function elementWithClass(tag: string, cls: string): HTMLElement
{
    const node = document.createElement(tag);
    node.className = cls;

    return node;
}

/**
 * Gives an overlay an accessible name, or hides it when it carries no text.
 *
 * @param root  - Element to name.
 * @param label - Label text.
 */
function applyAccessibleName(root: Element, label: string): void
{
    if (label.length > 0)
    {
        root.setAttribute("role", "img");
        root.setAttribute("aria-label", label);
        return;
    }

    root.setAttribute("aria-hidden", "true");
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * ⚓ FUNCTION: createAnnotation
 * Creates an annotation overlay inside a host element.
 *
 * @param containerId - Id of an element already in the DOM.
 * @param options     - Annotation options.
 * @returns The annotation handle.
 */
export function createAnnotation(
    containerId: string,
    options: AnnotationOptions = {}): AnnotationHandle
{
    const host = document.getElementById(containerId);

    if (!host)
    {
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. Insert `
            + "the element before creating the annotation.");
    }

    return build(host, options);
}

/**
 * Assembles an annotation against a resolved host element.
 *
 * @param host    - Host element.
 * @param options - Annotation options.
 * @returns The annotation handle.
 */
function build(
    host: HTMLElement,
    options: AnnotationOptions): AnnotationHandle
{
    const handlers = new Map<string, Set<(payload: unknown) => void>>();

    let kind = normaliseKind(options.kind);
    let color = normaliseColor(options.color);
    let label = String(options.label ?? options.value ?? "");
    let anchor: AnnotationAnchor =
        assertAnchor(options.anchor ?? { kind: "canvas" });
    let expanded = options.expanded === true;
    let destroyed = false;
    let openTimer = 0;
    let closeTimer = 0;

    const root = document.createElement("div");
    root.className = `${CLS} ${CLS}-${color}`;

    // The pin is permanent, like CommentOverlay's. The body opens beside it.
    const markerEl = document.createElement("button");
    markerEl.type = "button";
    markerEl.className = `${CLS}-marker`;
    markerEl.addEventListener("click", (e) =>
    {
        e.stopPropagation();
        setExpandedState(!expanded);
    });

    const bodyEl = elementWithClass("div", `${CLS}-body`);

    root.appendChild(markerEl);
    root.appendChild(bodyEl);
    host.appendChild(root);

    repaint();
    attachHoverBehaviour();

    /** Replaces the SVG with one drawn for the current state. */
    function repaint(): void
    {
        // Content only. The marker element is NEVER rebuilt — replacing the
        // element under the pointer made pointerleave fire, which collapsed,
        // which put the marker back under the pointer, which re-expanded. A
        // self-sustaining flicker.
        bodyEl.replaceChildren(
            buildBody(kind, label, options.editable !== false, onInlineEdit));
        markerEl.textContent = MARKER_GLYPH[kind];

        const name = label.length > 0 ? label : `${kind} annotation`;
        markerEl.setAttribute("aria-label", name);
        markerEl.setAttribute("title", name);
        markerEl.setAttribute("aria-expanded", String(expanded));

        applyClasses();
    }

    /** Reflects kind, colour and expansion in the class list. */
    function applyClasses(): void
    {
        root.classList.toggle(`${CLS}-labelled`, label.length > 0);
        root.classList.toggle(`${CLS}-expanded`, expanded);
        root.classList.toggle(`${CLS}-collapsed`, !expanded);

        for (const candidate of KINDS)
        {
            root.classList.toggle(`${CLS}-kind-${candidate}`, candidate === kind);
        }

        for (const candidate of COLORS)
        {
            root.classList.toggle(`${CLS}-${candidate}`, candidate === color);
        }
    }

    /**
     * Wires hover-to-expand with a dwell, and pointer-out to collapse.
     *
     * Handlers live on the ROOT and the marker persists across states, so the
     * pointer never loses its target mid-interaction.
     */
    function attachHoverBehaviour(): void
    {
        root.addEventListener("pointerenter", () =>
        {
            window.clearTimeout(closeTimer);

            if (options.expandOnHover === false || expanded)
            {
                return;
            }

            // A dwell, not a hover: sweeping across twenty annotations must
            // open none of them.
            openTimer = window.setTimeout(
                () => setExpandedState(true), HOVER_OPEN_MS);
        });

        root.addEventListener("pointerleave", () =>
        {
            window.clearTimeout(openTimer);

            if (!expanded || root.contains(document.activeElement))
            {
                return;
            }

            closeTimer = window.setTimeout(
                () => setExpandedState(false), HOVER_CLOSE_MS);
        });
    }

    /**
     * Applies an expansion change and announces it.
     *
     * @param next - Whether the annotation should show its content.
     */
    function setExpandedState(next: boolean): void
    {
        if (destroyed || expanded === next)
        {
            return;
        }

        expanded = next;
        applyClasses();
        markerEl.setAttribute("aria-expanded", String(expanded));
        emit("toggle", () => options.onToggle?.(expanded), expanded);
    }

    /**
     * Applies an inline edit without rebuilding the card.
     *
     * Repainting here would replace the textarea the user is typing into and
     * lose the caret, so the label is updated in place and only announced.
     *
     * @param next - The edited text.
     */
    function onInlineEdit(next: string): void
    {
        label = next;

        const name = label.length > 0 ? label : `${kind} annotation`;
        markerEl.setAttribute("aria-label", name);
        markerEl.setAttribute("title", name);
        root.classList.toggle(`${CLS}-labelled`, label.length > 0);

        const snapshot = { kind, label, color };
        emit("change", () => options.onChange?.(snapshot), snapshot);
    }

    /** Delivers a payload: legacy callback first, then channel subscribers. */
    function emit(channel: string, legacy: () => void, payload: unknown): void
    {
        legacy();

        for (const handler of handlers.get(channel) ?? [])
        {
            try
            {
                handler(payload);
            }
            catch (err)
            {
                logError(`Channel "${channel}" handler threw`, err);
            }
        }
    }

    /** Re-renders and announces a change. */
    function changed(): void
    {
        repaint();

        const snapshot = { kind, label, color };
        emit("change", () => options.onChange?.(snapshot), snapshot);
    }

    logInfo("Created in container:", host.id);

    return {
        setData(slot, value)
        {
            if (slot !== "label")
            {
                logWarn(`setData: unknown slot "${slot}" — expected "label".`);
                return;
            }

            label = value === null || value === undefined ? "" : String(value);
            changed();
        },

        on(channel, handler)
        {
            let subscribers = handlers.get(channel);

            if (!subscribers)
            {
                subscribers = new Set();
                handlers.set(channel, subscribers);
            }

            subscribers.add(handler);

            return (): void =>
            {
                handlers.get(channel)?.delete(handler);
            };
        },

        getState()
        {
            return { kind, label, color };
        },

        setState(state)
        {
            if (state.kind !== undefined)
            {
                kind = normaliseKind(state.kind);
            }

            if (state.color !== undefined)
            {
                color = normaliseColor(state.color);
            }

            if (typeof state.label === "string")
            {
                label = state.label;
            }

            repaint();
        },

        getValue: () => label,

        setValue(next)
        {
            label = String(next ?? "");
            changed();
        },

        isExpanded: () => expanded,

        setExpanded: (next) => setExpandedState(next === true),

        getAnchor: () => anchor,

        setAnchor(next)
        {
            anchor = assertAnchor(next);
            emit("anchor", () => options.onAnchorChange?.(anchor), anchor);
        },

        getElement: () => (destroyed ? null : root),

        destroy()
        {
            if (destroyed)
            {
                return;
            }

            destroyed = true;
            window.clearTimeout(openTimer);
            window.clearTimeout(closeTimer);
            handlers.clear();
            root.remove();
            logInfo("Destroyed");
        },
    };
}

// ============================================================================
// WINDOW REGISTRATION
// ============================================================================

(window as unknown as Record<string, unknown>)["createAnnotation"] =
    createAnnotation;
