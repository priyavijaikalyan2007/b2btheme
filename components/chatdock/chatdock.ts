/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 9b3f27ca-8d15-4e70-a2c6-14f8e0b93d5a
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ChatDock
 * 📜 PURPOSE: The conversation surface for a dynamic UI. Docks to the BOTTOM
 *    and hovers over the canvas, which slides behind it — deliberately not a
 *    pinned sidebar, because the canvas is the work and the chat is how you
 *    steer it.
 *
 *    Presentation only. It renders turns and emits submissions; it contains no
 *    model integration, and selecting a turn merely emits so the host can
 *    scrub the canvas to that revision.
 * 🔗 RELATES: [[DynamicCanvas]], [[WorkspaceShell]], [[Conversation]]
 * ⚡ FLOW: [user types] -> [submit channel] -> [host onResolve] -> [canvas]
 * 🔒 SECURITY: Turn text is untrusted (it may be model output) and is only
 *    ever assigned through textContent.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker chatdock
// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[ChatDock]";

/** Root CSS class. */
const CLS = "chatdock";

// ============================================================================
// TYPES
// ============================================================================

/** One conversation turn. */
export interface ChatTurn
{
    /** Stable turn identifier, linking the turn to a canvas revision. */
    id: string;

    /** Who spoke. */
    role: string;

    /** Turn text. Untrusted — rendered via textContent only. */
    text: string;

    /** Canvas revision this turn produced, when it produced one. */
    revision?: number;
}

/** Options for the chat dock. */
export interface ChatDockOptions
{
    /** Initial turns. */
    turns?: ChatTurn[];

    /** Input placeholder. */
    placeholder?: string;

    /** Accessible label for the input. */
    ariaLabel?: string;

    /** Start with the input disabled. */
    busy?: boolean;

    /** Fires when the user submits an utterance. */
    onSubmit?: (utterance: string) => void;

    /** Fires when a turn is selected, so the host can scrub the canvas. */
    onSelectTurn?: (turn: ChatTurn) => void;

    /** Fires when the user branches from a turn. */
    onBranch?: (turn: ChatTurn) => void;
}

/** Handle returned by createChatDock. */
export interface ChatDockHandle
{
    // -- Surface contract (ADR-141)

    /** Fills a declared slot. The dock declares one slot, "turns". */
    setData(slot: string, value: unknown): void;

    /** Subscribes to "submit", "selectTurn" or "branch". */
    on(channel: string, handler: (payload: unknown) => void): () => void;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restores state produced by getState(). */
    setState(state: Record<string, unknown>): void;

    /** Tears down the dock. Idempotent. */
    destroy(): void;

    // -- Domain surface

    /** Submits the current draft, if any. */
    submit(): void;

    /** Disables or re-enables input while a turn is in flight. */
    setBusy(busy: boolean): void;

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
 * Coerces an arbitrary payload into a turn list.
 *
 * @param value - Candidate turns.
 * @returns A usable turn array, possibly empty.
 */
function toTurns(value: unknown): ChatTurn[]
{
    if (!Array.isArray(value))
    {
        return [];
    }

    return value
        .filter((t) => t && typeof t === "object")
        .map((t, i) =>
        {
            const turn = t as Partial<ChatTurn>;

            return {
                id: String(turn.id ?? `turn-${i}`),
                role: String(turn.role ?? "user"),
                text: String(turn.text ?? ""),
                revision: typeof turn.revision === "number" ? turn.revision : undefined,
            };
        });
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * ⚓ FUNCTION: createChatDock
 * Creates a chat dock inside a host element.
 *
 * @param containerId - Id of an element already in the DOM.
 * @param options     - Dock options.
 * @returns The dock handle.
 */
export function createChatDock(
    containerId: string,
    options: ChatDockOptions = {}): ChatDockHandle
{
    const host = document.getElementById(containerId);

    if (!host)
    {
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. Insert `
            + "the element before creating the dock.");
    }

    return build(host, options);
}

/**
 * Assembles a dock against a resolved host element.
 *
 * @param host    - Host element.
 * @param options - Dock options.
 * @returns The dock handle.
 */
function build(
    host: HTMLElement,
    options: ChatDockOptions): ChatDockHandle
{
    const handlers = new Map<string, Set<(payload: unknown) => void>>();

    let turns = toTurns(options.turns);
    let busy = options.busy === true;
    let historyOpen = false;
    let destroyed = false;

    const root = createElement("div", CLS);
    const turnList = createElement("div", `${CLS}-turns`);
    const bar = createElement("div", `${CLS}-bar`);
    const field = document.createElement("input");
    const send = createElement("button", `${CLS}-send`, "Send");

    turnList.setAttribute("role", "log");
    turnList.setAttribute("aria-live", "polite");
    turnList.setAttribute("aria-label", "Conversation");

    field.type = "text";
    field.className = `${CLS}-input`;
    field.placeholder = options.placeholder ?? "Ask the canvas…";
    field.setAttribute("aria-label", options.ariaLabel ?? "Ask the canvas");

    send.setAttribute("type", "button");

    bar.appendChild(field);
    bar.appendChild(send);
    root.appendChild(turnList);
    root.appendChild(bar);
    host.appendChild(root);

    renderTurns();
    applyBusy();

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

    /** Rebuilds the turn list. */
    function renderTurns(): void
    {
        turnList.replaceChildren();

        for (const turn of turns)
        {
            turnList.appendChild(buildTurn(turn));
        }

        turnList.scrollTop = turnList.scrollHeight;
    }

    /**
     * Builds one turn row.
     *
     * Selecting a turn scrubs the canvas; branching from it forks. They are
     * separate controls because they are very different acts — one navigates,
     * the other creates.
     */
    function buildTurn(turn: ChatTurn): HTMLElement
    {
        const row = createElement("div",
            `${CLS}-turn ${CLS}-turn-${turn.role}`);
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");

        row.appendChild(createElement("span", `${CLS}-turn-text`, turn.text));

        const branch = createElement("button", `${CLS}-branch`, "⑂");
        branch.setAttribute("type", "button");
        branch.setAttribute("aria-label", "Branch from this turn");
        branch.setAttribute("title", "Branch from this turn");
        branch.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            emit("branch", () => options.onBranch?.(turn), turn);
        });

        row.appendChild(branch);

        const select = (): void =>
            emit("selectTurn", () => options.onSelectTurn?.(turn), turn);

        row.addEventListener("click", select);
        row.addEventListener("keydown", (e) =>
        {
            if ((e as KeyboardEvent).key === "Enter")
            {
                select();
            }
        });

        return row;
    }

    /** Reflects the busy flag in the DOM. */
    function applyBusy(): void
    {
        field.disabled = busy;
        (send as HTMLButtonElement).disabled = busy;
        root.classList.toggle(`${CLS}-busy`, busy);
    }

    /** Submits the current draft. */
    function submit(): void
    {
        const utterance = field.value.trim();

        if (busy || utterance.length === 0)
        {
            return;
        }

        field.value = "";
        emit("submit", () => options.onSubmit?.(utterance), utterance);
    }

    const onKeyDown = (e: KeyboardEvent): void =>
    {
        if (e.key === "Enter")
        {
            submit();
        }
    };

    field.addEventListener("keydown", onKeyDown);
    send.addEventListener("click", submit);

    logInfo("Created in container:", host.id);

    return {
        setData(slot, value)
        {
            if (slot !== "turns")
            {
                logWarn(`setData: unknown slot "${slot}" — expected "turns".`);
                return;
            }

            turns = toTurns(value);
            renderTurns();
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
            return { draft: field.value, historyOpen };
        },

        setState(state)
        {
            if (typeof state.draft === "string")
            {
                field.value = state.draft;
            }

            if (typeof state.historyOpen === "boolean")
            {
                historyOpen = state.historyOpen;
                root.classList.toggle(`${CLS}-history-open`, historyOpen);
            }
        },

        submit,

        setBusy(next)
        {
            busy = next === true;
            applyBusy();
        },

        getElement: () => (destroyed ? null : root),

        destroy()
        {
            if (destroyed)
            {
                return;
            }

            destroyed = true;
            field.removeEventListener("keydown", onKeyDown);
            send.removeEventListener("click", submit);
            handlers.clear();
            root.remove();
            logInfo("Destroyed");
        },
    };
}

// ============================================================================
// WINDOW REGISTRATION
// ============================================================================

(window as unknown as Record<string, unknown>)["createChatDock"] =
    createChatDock;
