/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 1d7b45e0-9a3c-4e62-b0f8-5c9127da3e41
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: StickyNote
 * 📜 PURPOSE: A pinnable note for the dynamic canvas — the knowledge worker's
 *    margin scribble. Deliberately plain DOM: a note must cost a textarea and
 *    nothing more, so that fifty of them stay cheap.
 *
 *    Built AFTER the Surface contract and only against its public API, as the
 *    proof that a new component can conform without private hooks (ADR-141).
 * 🔗 RELATES: [[DynamicCanvas]], [[Annotation]], [[DynamicUIRuntime]]
 * ⚡ FLOW: [createStickyNote()] -> [textarea] -> [change channel]
 * 🔒 SECURITY: Note text is user content and is only ever assigned through
 *    textarea.value / textContent — never innerHTML.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker stickynote
// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[StickyNote]";

/** Root CSS class. */
const CLS = "stickynote";

/** Palette a note may use. Anything else falls back to the first entry. */
const COLORS = ["yellow", "blue", "green", "pink", "grey"] as const;

/** Default note colour. */
const DEFAULT_COLOR: NoteColor = "yellow";

// ============================================================================
// TYPES
// ============================================================================

/** A colour from the note palette. */
export type NoteColor = typeof COLORS[number];

/** What a note is attached to. Mirrors the runtime's Anchor union. */
export type NoteAnchor =
    | { kind: "canvas" }
    | { kind: "node"; nodeId: string }
    | { kind: "entity"; entityId: string };

/** Options for a sticky note. */
export interface StickyNoteOptions
{
    /** Initial note text. */
    text?: string;

    /** Alias for `text`, for DynamicFormSwitcher convention (ADR-134). */
    value?: string;

    /** Palette colour. Unknown values fall back to yellow. */
    color?: string;

    /** Start collapsed to its title bar. */
    collapsed?: boolean;

    /** Render the note but disallow editing. */
    readOnly?: boolean;

    /**
     * Allow the user to resize the note from its corner. Default true.
     *
     * A note is the one canvas citizen whose right size is unknowable in
     * advance — it depends entirely on what gets written in it — so it is
     * resizable unless a host says otherwise.
     */
    resizable?: boolean;

    /** What the note is attached to. Defaults to the canvas. */
    anchor?: NoteAnchor;

    /** Accessible label for the editing surface. */
    ariaLabel?: string;

    /** Fires whenever the text changes, from typing or from setData. */
    onChange?: (text: string) => void;

    /** Fires when the anchor changes. */
    onAnchorChange?: (anchor: NoteAnchor) => void;
}

/** Handle returned by createStickyNote. */
export interface StickyNoteHandle
{
    // -- Surface contract (ADR-141)

    /** Fills a declared slot. The note declares one slot, "text". */
    setData(slot: string, value: unknown): void;

    /** Subscribes to "change" or "anchor". Returns an unsubscribe function. */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restores state produced by getState(). Partial input allowed. */
    setState(state: Record<string, unknown>): void;

    /** Tears down the note. Idempotent. */
    destroy(): void;

    // -- Field aliases (ADR-134)

    /** Current note text. */
    getValue(): string;

    /** Replaces the note text. */
    setValue(text: string): void;

    // -- Domain surface

    /** What the note is attached to. */
    getAnchor(): NoteAnchor;

    /** Re-attaches the note and emits on the "anchor" channel. */
    setAnchor(anchor: NoteAnchor): void;

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
 * Creates an element with a class name.
 *
 * @param tag - Tag name.
 * @param cls - Class name.
 * @returns The element.
 */
function createElement(tag: string, cls: string): HTMLElement
{
    const node = document.createElement(tag);
    node.className = cls;

    return node;
}

/**
 * Sets an attribute.
 *
 * @param node  - Target element.
 * @param name  - Attribute name.
 * @param value - Attribute value.
 */
function setAttr(node: Element, name: string, value: string): void
{
    node.setAttribute(name, value);
}

/**
 * Normalises a requested colour to one in the palette.
 *
 * @param value - Requested colour.
 * @returns A palette colour.
 */
function normaliseColor(value: unknown): NoteColor
{
    return COLORS.includes(value as NoteColor)
        ? value as NoteColor
        : DEFAULT_COLOR;
}

/**
 * Validates an anchor, rejecting anything the canvas could not resolve.
 *
 * @param anchor - Candidate anchor.
 * @returns The anchor, unchanged.
 * @throws Error naming the legal kinds.
 */
function assertAnchor(anchor: NoteAnchor): NoteAnchor
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
// FACTORY
// ============================================================================

/**
 * ⚓ FUNCTION: createStickyNote
 * Creates a sticky note inside a host element.
 *
 * @param containerId - Id of an element already in the DOM.
 * @param options     - Note options.
 * @returns The note handle.
 */
export function createStickyNote(
    containerId: string,
    options: StickyNoteOptions = {}): StickyNoteHandle
{
    const host = document.getElementById(containerId);

    if (!host)
    {
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. Insert `
            + "the element before creating the note.");
    }

    return build(host, options);
}

/**
 * Assembles a note against a resolved host element.
 *
 * @param host    - Host element.
 * @param options - Note options.
 * @returns The note handle.
 */
function build(
    host: HTMLElement,
    options: StickyNoteOptions): StickyNoteHandle
{
    const handlers = new Map<string, Set<(payload: unknown) => void>>();

    let text = String(options.text ?? options.value ?? "");
    let color = normaliseColor(options.color);
    let collapsed = options.collapsed === true;
    let anchor: NoteAnchor = assertAnchor(options.anchor ?? { kind: "canvas" });
    let destroyed = false;

    const root = createElement("div", `${CLS} ${CLS}-${color}`);
    const bar = createElement("div", `${CLS}-bar`);
    const area = document.createElement("textarea");

    area.className = `${CLS}-text`;
    area.value = text;
    area.readOnly = options.readOnly === true;

    // The textarea's own resize grip is the honest control here: it is native,
    // keyboard-reachable, and needs no pointer maths of ours.
    area.style.resize = options.resizable === false || options.readOnly === true
        ? "none"
        : "vertical";
    setAttr(area, "aria-label", options.ariaLabel ?? "Sticky note");
    setAttr(root, "role", "note");

    bar.appendChild(createElement("span", `${CLS}-grip`));
    root.appendChild(bar);
    root.appendChild(area);
    host.appendChild(root);

    applyCollapsed();

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

    /** Applies the current text to the DOM and announces the change. */
    function setText(next: string): void
    {
        text = next;

        if (area.value !== next)
        {
            area.value = next;
        }

        emit("change", () => options.onChange?.(text), text);
    }

    /** Reflects the collapsed flag in the DOM. */
    function applyCollapsed(): void
    {
        root.classList.toggle(`${CLS}-collapsed`, collapsed);
        area.hidden = collapsed;
    }

    /** Reflects the current colour in the DOM. */
    function applyColor(): void
    {
        for (const candidate of COLORS)
        {
            root.classList.toggle(`${CLS}-${candidate}`, candidate === color);
        }
    }

    const onInput = (): void => setText(area.value);
    area.addEventListener("input", onInput);

    logInfo("Created in container:", host.id);

    return {
        setData(slot, value)
        {
            if (slot !== "text")
            {
                logWarn(`setData: unknown slot "${slot}" — expected "text".`);
                return;
            }

            setText(value === null || value === undefined ? "" : String(value));
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
            return { text, color, collapsed };
        },

        setState(state)
        {
            if (typeof state.text === "string")
            {
                setText(state.text);
            }

            if (state.color !== undefined)
            {
                color = normaliseColor(state.color);
                applyColor();
            }

            if (typeof state.collapsed === "boolean")
            {
                collapsed = state.collapsed;
                applyCollapsed();
            }
        },

        getValue: () => text,

        setValue: (next) => setText(String(next ?? "")),

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
            area.removeEventListener("input", onInput);
            handlers.clear();
            root.remove();
            logInfo("Destroyed");
        },
    };
}

// ============================================================================
// WINDOW REGISTRATION
// ============================================================================

(window as unknown as Record<string, unknown>)["createStickyNote"] =
    createStickyNote;
