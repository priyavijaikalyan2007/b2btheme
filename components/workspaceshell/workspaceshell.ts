/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 5c0e14b7-63a9-42df-8b1e-97d206f4ca38
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: WorkspaceShell
 * 📜 PURPOSE: Chrome for the workspace tier of a dynamic UI — canvas tabs with
 *    pinning, a new-canvas control, a content region for the canvas to mount
 *    into, and a history scrubber.
 *
 *    Presentation only. It holds no storage and knows nothing about how a
 *    canvas is loaded; every control emits and the host decides.
 *
 *    NOT to be confused with WorkspaceSwitcher, which switches TENANTS. This
 *    switches CANVASES within one workspace. Different concept, unfortunate
 *    collision of the word.
 * 🔗 RELATES: [[DynamicCanvas]], [[ChatDock]], [[WorkspaceSwitcher]]
 * ⚡ FLOW: [tab click] -> [selectCanvas channel] -> [host loads] -> [canvas]
 * 🔒 SECURITY: Canvas titles are user content and are only ever assigned
 *    through textContent.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker workspaceshell
// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[WorkspaceShell]";

/** Root CSS class. */
const CLS = "workspaceshell";

/** Counter for unique content-region ids. */
let shellCounter = 0;

// ============================================================================
// TYPES
// ============================================================================

/** One canvas in the workspace. */
export interface WorkspaceCanvas
{
    /** Stable canvas identifier. */
    id: string;

    /** Display title. Untrusted — rendered via textContent only. */
    title: string;

    /** Pinned canvases sort first and are visually marked. */
    pinned?: boolean;
}

/** Options for the workspace shell. */
export interface WorkspaceShellOptions
{
    /** Initial canvases. */
    canvases?: WorkspaceCanvas[];

    /** Canvas to mark active on first render. */
    activeCanvasId?: string;

    /** Fires when a canvas tab is selected. */
    onSelectCanvas?: (canvas: WorkspaceCanvas) => void;

    /** Fires when a canvas is pinned or unpinned. */
    onPinCanvas?: (canvas: WorkspaceCanvas) => void;

    /** Fires when a canvas is closed. */
    onCloseCanvas?: (canvas: WorkspaceCanvas) => void;

    /** Fires when the new-canvas control is used. */
    onNewCanvas?: () => void;

    /** Fires when the history scrubber moves. */
    onScrub?: (revision: number) => void;
}

/** Handle returned by createWorkspaceShell. */
export interface WorkspaceShellHandle
{
    // -- Surface contract (ADR-141)

    /** Fills a declared slot. The shell declares one slot, "canvases". */
    setData(slot: string, value: unknown): void;

    /** Subscribes to a declared channel. */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restores state produced by getState(). */
    setState(state: Record<string, unknown>): void;

    /** Tears down the shell. Idempotent. */
    destroy(): void;

    // -- Domain surface

    /** The element a canvas should mount into. */
    getContentElement(): HTMLElement | null;

    /** The currently active canvas id, or null. */
    getActiveCanvasId(): string | null;

    /** Shows the history scrubber over a revision range. */
    setRevisionRange(min: number, max: number): void;

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
 * Creates an element with a class and optional text.
 *
 * @param tag  - Tag name.
 * @param cls  - Class name.
 * @param text - Text content, assigned via textContent, never as HTML.
 * @returns The element.
 */
function createElement(tag: string, cls: string, text?: string): HTMLElement
{
    const node = document.createElement(tag);
    node.className = cls;

    if (text !== undefined)
    {
        node.textContent = text;
    }

    return node;
}

/**
 * Coerces an arbitrary payload into a canvas list, pinned entries first.
 *
 * Sorting here rather than at render time means `getState()` and the DOM can
 * never disagree about order.
 *
 * @param value - Candidate canvases.
 * @returns A usable canvas array, possibly empty.
 */
function toCanvases(value: unknown): WorkspaceCanvas[]
{
    if (!Array.isArray(value))
    {
        return [];
    }

    return value
        .filter((c) => c && typeof c === "object")
        .map((c, i) =>
        {
            const canvas = c as Partial<WorkspaceCanvas>;

            return {
                id: String(canvas.id ?? `canvas-${i}`),
                title: String(canvas.title ?? "Untitled"),
                pinned: canvas.pinned === true,
            };
        })
        .sort((a, b) =>
        {
            if (a.pinned !== b.pinned)
            {
                return a.pinned ? -1 : 1;
            }

            return 0;
        });
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * ⚓ FUNCTION: createWorkspaceShell
 * Creates a workspace shell inside a host element.
 *
 * @param containerId - Id of an element already in the DOM.
 * @param options     - Shell options.
 * @returns The shell handle.
 */
export function createWorkspaceShell(
    containerId: string,
    options: WorkspaceShellOptions = {}): WorkspaceShellHandle
{
    const host = document.getElementById(containerId);

    if (!host)
    {
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. Insert `
            + "the element before creating the shell.");
    }

    return build(host, options);
}

/**
 * Assembles a shell against a resolved host element.
 *
 * @param host    - Host element.
 * @param options - Shell options.
 * @returns The shell handle.
 */
function build(
    host: HTMLElement,
    options: WorkspaceShellOptions): WorkspaceShellHandle
{
    const handlers = new Map<string, Set<(payload: unknown) => void>>();

    shellCounter += 1;

    let canvases = toCanvases(options.canvases);
    let activeId = options.activeCanvasId ?? null;
    let revision = 0;
    let destroyed = false;

    const root = createElement("div", CLS);
    const tabBar = createElement("div", `${CLS}-tabs`);
    const content = createElement("div", `${CLS}-content`);
    const scrubberSlot = createElement("div", `${CLS}-scrubber-slot`);

    content.id = `${CLS}-content-${shellCounter}`;
    tabBar.setAttribute("role", "tablist");

    const newBtn = createElement("button", `${CLS}-new`, "+");
    newBtn.setAttribute("type", "button");
    newBtn.setAttribute("aria-label", "New canvas");
    newBtn.setAttribute("title", "New canvas");
    newBtn.addEventListener("click", () =>
        emit("newCanvas", () => options.onNewCanvas?.(), null));

    root.appendChild(tabBar);
    root.appendChild(content);
    root.appendChild(scrubberSlot);
    host.appendChild(root);

    renderTabs();

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

    /** Rebuilds the tab bar, keeping the new-canvas control last. */
    function renderTabs(): void
    {
        tabBar.replaceChildren();

        for (const canvas of canvases)
        {
            tabBar.appendChild(buildTab(canvas));
        }

        tabBar.appendChild(newBtn);
    }

    /**
     * Builds one canvas tab.
     *
     * Select, pin and close are three separate controls because they are three
     * different acts; folding pin or close into the tab body would make an
     * accidental click destructive.
     */
    function buildTab(canvas: WorkspaceCanvas): HTMLElement
    {
        const active = canvas.id === activeId;
        const tab = createElement("div",
            `${CLS}-tab${active ? ` ${CLS}-tab-active` : ""}`
            + `${canvas.pinned ? ` ${CLS}-tab-pinned` : ""}`);

        tab.setAttribute("data-canvas-id", canvas.id);
        tab.setAttribute("role", "tab");
        tab.setAttribute("tabindex", "0");
        tab.setAttribute("aria-selected", String(active));

        tab.appendChild(createElement("span", `${CLS}-tab-title`, canvas.title));
        tab.appendChild(iconButton(`${CLS}-pin`, canvas.pinned ? "★" : "☆",
            canvas.pinned ? "Unpin canvas" : "Pin canvas",
            () => emit("pinCanvas", () => options.onPinCanvas?.(canvas), canvas)));
        tab.appendChild(iconButton(`${CLS}-close`, "×", "Close canvas",
            () => emit("closeCanvas", () => options.onCloseCanvas?.(canvas), canvas)));

        const select = (): void =>
        {
            activeId = canvas.id;
            renderTabs();
            emit("selectCanvas", () => options.onSelectCanvas?.(canvas), canvas);
        };

        tab.addEventListener("click", select);
        tab.addEventListener("keydown", (e) =>
        {
            if ((e as KeyboardEvent).key === "Enter")
            {
                select();
            }
        });

        return tab;
    }

    /**
     * Builds a small icon button that does not trigger its parent tab.
     *
     * @param cls     - Class name.
     * @param glyph   - Icon character.
     * @param label   - Accessible label.
     * @param onClick - Click handler.
     * @returns The button.
     */
    function iconButton(
        cls: string,
        glyph: string,
        label: string,
        onClick: () => void): HTMLElement
    {
        const btn = createElement("button", cls, glyph);
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    /** Builds or rebuilds the history scrubber. */
    function renderScrubber(min: number, max: number): void
    {
        scrubberSlot.replaceChildren();

        if (max <= min)
        {
            return;
        }

        const wrap = createElement("div", `${CLS}-scrubber`);
        const slider = document.createElement("input");

        slider.type = "range";
        slider.min = String(min);
        slider.max = String(max);
        slider.value = String(revision || max);
        slider.setAttribute("aria-label", "Canvas history");

        slider.addEventListener("input", () =>
        {
            revision = Number(slider.value);
            emit("scrub", () => options.onScrub?.(revision), revision);
        });

        wrap.appendChild(slider);
        scrubberSlot.appendChild(wrap);
    }

    logInfo("Created in container:", host.id);

    return {
        setData(slot, value)
        {
            if (slot !== "canvases")
            {
                logWarn(`setData: unknown slot "${slot}" — expected "canvases".`);
                return;
            }

            canvases = toCanvases(value);
            renderTabs();
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
            return { activeCanvasId: activeId, revision };
        },

        setState(state)
        {
            if (state.activeCanvasId === null
                || typeof state.activeCanvasId === "string")
            {
                activeId = state.activeCanvasId as string | null;
                renderTabs();
            }

            if (typeof state.revision === "number")
            {
                revision = state.revision;
            }
        },

        getContentElement: () => (destroyed ? null : content),

        getActiveCanvasId: () => activeId,

        setRevisionRange: (min, max) => renderScrubber(min, max),

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

(window as unknown as Record<string, unknown>)["createWorkspaceShell"] =
    createWorkspaceShell;
