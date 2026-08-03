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
 * Draws the overlay for a kind into a fresh SVG root.
 *
 * @param kind  - Overlay kind.
 * @param label - Label text, drawn only by a callout.
 * @returns The SVG root.
 */
function draw(kind: AnnotationKind, label: string): SVGElement
{
    const root = svg("svg", {
        class: `${CLS}-svg`,
        viewBox: "0 0 100 100",
        preserveAspectRatio: "none",
    });

    if (kind === "arrow")
    {
        drawArrow(root);
    }
    else if (kind === "highlight")
    {
        root.appendChild(svg("rect", {
            class: `${CLS}-shape`,
            x: "2", y: "2", width: "96", height: "96",
        }));
    }
    else
    {
        drawCallout(root, label);
    }

    applyAccessibleName(root, label);

    return root;
}

/**
 * Draws an arrow with a head.
 *
 * @param root - SVG root to append into.
 */
function drawArrow(root: SVGElement): void
{
    root.appendChild(svg("line", {
        class: `${CLS}-shape`,
        x1: "6", y1: "94", x2: "84", y2: "16",
    }));

    root.appendChild(svg("polygon", {
        class: `${CLS}-head`,
        points: "94,6 74,14 86,26",
    }));
}

/**
 * Draws a callout box with its text.
 *
 * @param root  - SVG root to append into.
 * @param label - Text to render.
 */
function drawCallout(root: SVGElement, label: string): void
{
    root.appendChild(svg("rect", {
        class: `${CLS}-shape`,
        x: "2", y: "2", width: "96", height: "70",
    }));

    root.appendChild(svg("polygon", {
        class: `${CLS}-shape`,
        points: "18,72 18,94 40,72",
    }));

    const text = svg("text", {
        class: `${CLS}-label`,
        x: "50", y: "40",
        "text-anchor": "middle",
    });

    // User content: assigned as text, never assembled into markup.
    text.textContent = label;
    root.appendChild(text);
}

/**
 * Gives the overlay an accessible name, or hides it when it carries no text.
 *
 * A purely decorative highlight with no label is noise to a screen reader, so
 * it is hidden rather than announced as an unnamed graphic.
 *
 * @param root  - SVG root.
 * @param label - Label text.
 */
function applyAccessibleName(root: SVGElement, label: string): void
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
    let destroyed = false;

    const root = document.createElement("div");
    root.className = `${CLS} ${CLS}-${color}`;
    host.appendChild(root);

    repaint();

    /** Replaces the SVG with one drawn for the current state. */
    function repaint(): void
    {
        root.replaceChildren(draw(kind, label));

        for (const candidate of COLORS)
        {
            root.classList.toggle(`${CLS}-${candidate}`, candidate === color);
        }
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
