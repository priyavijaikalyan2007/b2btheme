/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: CardLayout
 * 📜 PURPOSE: Indexed-stack layout container. Stacks all children in the same
 *    space but displays only one at a time. Supports animated transitions
 *    (fade, slide) and lazy loading.
 * 🔗 RELATES: [[EnterpriseTheme]], [[LayoutContainers]], [[LayerLayout]]
 * ⚡ FLOW: [Consumer App] -> [createCardLayout()] -> [CSS absolute stack]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// 1. TYPES AND INTERFACES
// ============================================================================

/** Per-card configuration. */
export interface CardConfig
{
    /** Unique key for this card. */
    key: string;

    /** Child element or component. */
    child: HTMLElement | any;

    /** If true, defer DOM creation until first activation. */
    lazyLoad?: boolean;
}

/** Configuration options for CardLayout. */
export interface CardLayoutOptions
{
    /** Custom element ID. Auto-generated if omitted. */
    id?: string;

    /** Key of the initially active card. */
    activeKey?: string;

    /** Initial cards. */
    cards?: CardConfig[];

    /** Container sizing strategy. Default: "active". */
    sizing?: "largest" | "active" | "fixed";

    /** Transition type. Default: "none". */
    transition?: "none" | "fade" | "slide-left" | "slide-up";

    /** Transition duration in ms. Default: 200. */
    transitionDuration?: number;

    /** If true, inactive cards retain their state. Default: true. */
    preserveState?: boolean;

    /** Container padding (CSS value). */
    padding?: string;

    /** Additional CSS classes on root element. */
    cssClass?: string;

    /** Height CSS value. */
    height?: string;

    /** Width CSS value. */
    width?: string;

    /** Fired on any layout change event. */
    onLayoutChange?: (state: CardLayoutState) => void;

    /** Override default key combos. Keys are action names, values are
     *  combo strings like "ArrowRight" or "Ctrl+ArrowRight". */
    keyBindings?: Partial<Record<string, string>>;
}

/** Serialisable layout state snapshot. */
export interface CardLayoutState
{
    activeKey: string | null;
    cardCount: number;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CardLayout]";
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

let instanceCounter = 0;

const DEFAULT_DURATION = 200;

/** Default keyboard bindings per KEYBOARD.md §3 (Data Views). */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    "nextCard": "ArrowRight",
    "prevCard": "ArrowLeft",
};

// ============================================================================
// 3. DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[]
): HTMLElement
{
    const el = document.createElement(tag);

    for (const cls of classes)
    {
        if (cls) { el.classList.add(cls); }
    }

    return el;
}

function setAttr(
    el: HTMLElement, name: string, value: string
): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// 4. INTERNAL TRACKING TYPES
// ============================================================================

interface CardEntry
{
    config: CardConfig;
    wrapper: HTMLElement;
    mounted: boolean;
}

// ============================================================================
// 5. CARDLAYOUT CLASS
// ============================================================================

export class CardLayout
{
    private readonly instanceId: string;
    private readonly options: CardLayoutOptions;

    private visible = false;
    private contained = false;
    private rootEl: HTMLElement | null = null;

    private cards: CardEntry[] = [];
    private activeKey: string | null = null;
    private transitioning = false;

    private resizeObserver: ResizeObserver | null = null;

    constructor(options: CardLayoutOptions)
    {
        instanceCounter += 1;
        this.instanceId =
            options.id || `cardlayout-${instanceCounter}`;
        this.options = {
            sizing: "active",
            transition: "none",
            transitionDuration: DEFAULT_DURATION,
            preserveState: true,
            ...options,
        };

        this.buildDOM();
        this.mountInitialCards();
        this.activateInitialCard();

        logInfo("Initialised:", this.instanceId);
    }

    // ========================================================================
    // 6. PUBLIC — LIFECYCLE
    // ========================================================================

    /** Appends the layout to a container and makes it visible. */
    public show(container?: HTMLElement | string): void
    {
        if (this.visible)
        {
            logWarn("Already visible:", this.instanceId);
            return;
        }

        if (!this.rootEl) { return; }

        const target = this.resolveContainer(container);
        target.appendChild(this.rootEl);
        this.visible = true;
        this.setupResizeObserver();

        logDebug("Shown:", this.instanceId);
    }

    /** Removes from DOM without destroying state. */
    public hide(): void
    {
        if (!this.visible) { return; }

        this.teardownResizeObserver();
        this.rootEl?.remove();
        this.visible = false;

        logDebug("Hidden:", this.instanceId);
    }

    /** Removes from DOM, unhooks listeners, releases references. */
    public destroy(): void
    {
        this.teardownResizeObserver();
        this.destroyAllCards();
        this.rootEl?.remove();
        this.rootEl = null;
        this.visible = false;

        logDebug("Destroyed:", this.instanceId);
    }

    /** Returns the root DOM element. */
    public getRootElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Returns whether the layout is currently in the DOM. */
    public isVisible(): boolean
    {
        return this.visible;
    }

    // ========================================================================
    // 7. PUBLIC — CARD MANAGEMENT
    // ========================================================================

    /** Adds a new card. */
    public addCard(config: CardConfig): void
    {
        if (!this.rootEl) { return; }
        if (this.findCard(config.key))
        {
            logWarn("Duplicate key:", config.key);
            return;
        }

        const entry = this.createCardEntry(config);
        this.cards.push(entry);
        this.rootEl.appendChild(entry.wrapper);

        if (!this.activeKey)
        {
            this.setActiveCard(config.key);
        }

        this.fireOnLayoutChange();
    }

    /** Removes a card by key. */
    public removeCard(key: string): void
    {
        const idx = this.findCardIndex(key);
        if (idx === -1) { return; }

        this.removeCardByIndex(idx);
        this.fireOnLayoutChange();
    }

    /** Sets the active (visible) card by key. */
    public setActiveCard(key: string): void
    {
        if (key === this.activeKey) { return; }
        if (this.transitioning) { return; }

        const entry = this.findCard(key);
        if (!entry) { return; }

        const prev = this.findCard(this.activeKey || "");
        this.activeKey = key;

        this.ensureMounted(entry);
        this.performTransition(prev || null, entry);
        this.fireOnLayoutChange();
    }

    /** Returns the key of the active card. */
    public getActiveCard(): string | null
    {
        return this.activeKey;
    }

    /** Activates the next card (wraps around). */
    public next(): void
    {
        const key = this.getAdjacentKey(1);
        if (key) { this.setActiveCard(key); }
    }

    /** Activates the previous card (wraps around). */
    public previous(): void
    {
        const key = this.getAdjacentKey(-1);
        if (key) { this.setActiveCard(key); }
    }

    /** Returns the number of cards. */
    public getCardCount(): number
    {
        return this.cards.length;
    }

    // ========================================================================
    // 8. PUBLIC — STATE
    // ========================================================================

    /** Returns a serialisable state snapshot. */
    public getState(): CardLayoutState
    {
        return {
            activeKey: this.activeKey,
            cardCount: this.cards.length,
        };
    }

    /** Restores state from a snapshot. */
    public setState(state: CardLayoutState): void
    {
        if (state.activeKey && state.activeKey !== this.activeKey)
        {
            this.setActiveCard(state.activeKey);
        }
    }

    /** Sets or clears contained mode. */
    public setContained(value: boolean): void
    {
        this.contained = value;
    }

    // ========================================================================
    // 9. PRIVATE — DOM CONSTRUCTION
    // ========================================================================

    /** Builds the root stack container element. */
    private buildDOM(): void
    {
        this.rootEl = createElement("div", ["cardlayout"]);
        setAttr(this.rootEl, "id", this.instanceId);
        setAttr(this.rootEl, "role", "tablist");
        setAttr(this.rootEl, "tabindex", "0");

        if (this.options.cssClass)
        {
            this.rootEl.classList.add(
                ...this.options.cssClass.split(" ")
            );
        }

        this.applySizeProps();
        this.attachKeyboardHandler();
    }

    /** Applies height, width, and padding to root. */
    private applySizeProps(): void
    {
        if (!this.rootEl) { return; }
        const s = this.rootEl.style;

        if (this.options.padding) { s.padding = this.options.padding; }
        if (this.options.height) { s.height = this.options.height; }
        if (this.options.width) { s.width = this.options.width; }
    }

    // ========================================================================
    // 10. PRIVATE — CARD CREATION
    // ========================================================================

    /** Creates initial card entries from options. */
    private mountInitialCards(): void
    {
        if (!this.options.cards) { return; }

        for (const config of this.options.cards)
        {
            const entry = this.createCardEntry(config);
            this.cards.push(entry);
            this.rootEl!.appendChild(entry.wrapper);
        }
    }

    /** Activates the initial card. */
    private activateInitialCard(): void
    {
        if (this.cards.length === 0) { return; }

        const key = this.options.activeKey
            || this.cards[0].config.key;

        this.setActiveCard(key);
    }

    /** Creates a card entry with wrapper element. */
    private createCardEntry(config: CardConfig): CardEntry
    {
        const wrapper = createElement(
            "div", ["cardlayout-card"]
        );
        wrapper.style.display = "none";
        setAttr(wrapper, "data-card-key", config.key);

        const shouldMount = !config.lazyLoad;
        const entry: CardEntry = {
            config,
            wrapper,
            mounted: false,
        };

        if (shouldMount)
        {
            this.mountComponent(config.child, wrapper);
            entry.mounted = true;
        }

        return entry;
    }

    /** Ensures a card's child is mounted (for lazy loading). */
    private ensureMounted(entry: CardEntry): void
    {
        if (entry.mounted) { return; }

        this.mountComponent(entry.config.child, entry.wrapper);
        entry.mounted = true;
    }

    // ========================================================================
    // 11. PRIVATE — TRANSITIONS
    // ========================================================================

    /** Performs the transition between previous and next cards. */
    private performTransition(
        prev: CardEntry | null, next: CardEntry
    ): void
    {
        const type = this.getTransitionType();

        if (type === "none" || !prev)
        {
            this.switchImmediate(prev, next);
            return;
        }

        this.switchAnimated(prev, next, type);
    }

    /** Returns the effective transition type. */
    private getTransitionType(): string
    {
        if (this.prefersReducedMotion())
        {
            return "none";
        }
        return this.options.transition || "none";
    }

    /** Checks if user prefers reduced motion. */
    private prefersReducedMotion(): boolean
    {
        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }

    /** Immediate (no animation) card switch. */
    private switchImmediate(
        prev: CardEntry | null, next: CardEntry
    ): void
    {
        if (prev) { prev.wrapper.style.display = "none"; }
        next.wrapper.style.display = "block";
    }

    /** Animated card switch. */
    private switchAnimated(
        prev: CardEntry, next: CardEntry, type: string
    ): void
    {
        this.transitioning = true;
        const duration = this.options.transitionDuration
            || DEFAULT_DURATION;

        this.applyExitClass(prev.wrapper, type);
        this.applyEnterClass(next.wrapper, type);

        setTimeout(() =>
        {
            this.finishTransition(prev, next, type);
        }, duration);
    }

    /** Applies the exit animation class to a card wrapper. */
    private applyExitClass(
        wrapper: HTMLElement, type: string
    ): void
    {
        wrapper.classList.add(`cardlayout-exit-${type}`);
    }

    /** Applies the enter animation class to a card wrapper. */
    private applyEnterClass(
        wrapper: HTMLElement, type: string
    ): void
    {
        wrapper.style.display = "block";
        wrapper.classList.add(`cardlayout-enter-${type}`);
    }

    /** Cleans up after a transition completes. */
    private finishTransition(
        prev: CardEntry, next: CardEntry, type: string
    ): void
    {
        prev.wrapper.style.display = "none";
        prev.wrapper.classList.remove(`cardlayout-exit-${type}`);
        next.wrapper.classList.remove(`cardlayout-enter-${type}`);
        this.transitioning = false;
    }

    // ========================================================================
    // 12. PRIVATE — CHILD MOUNTING
    // ========================================================================

    /** Mounts a component or HTMLElement into a wrapper. */
    private mountComponent(child: any, cell: HTMLElement): void
    {
        if (typeof child.setContained === "function")
        {
            child.setContained(true);
        }

        this.hideIfVisible(child);
        this.showOrAppend(child, cell);
    }

    /** Hides a child if it is currently visible. */
    private hideIfVisible(child: any): void
    {
        if (typeof child.isVisible === "function"
            && child.isVisible()
            && typeof child.hide === "function")
        {
            child.hide();
        }
    }

    /** Shows a child in a cell, or appends its root element. */
    private showOrAppend(child: any, cell: HTMLElement): void
    {
        if (typeof child.show === "function")
        {
            child.show(cell);
        }
        else if (typeof child.getRootElement === "function")
        {
            const rootEl = child.getRootElement();
            if (rootEl) { cell.appendChild(rootEl); }
        }
        else if (child instanceof HTMLElement)
        {
            cell.appendChild(child);
        }
    }

    /** Calls destroy or removes the element from a child. */
    private unmountComponent(child: any): void
    {
        if (typeof child.destroy === "function")
        {
            child.destroy();
        }
        else if (child instanceof HTMLElement)
        {
            child.remove();
        }
    }

    // ========================================================================
    // 13. PRIVATE — CARD LOOKUP
    // ========================================================================

    /** Finds a card entry by key. */
    private findCard(key: string): CardEntry | null
    {
        return this.cards.find(
            c => c.config.key === key
        ) || null;
    }

    /** Finds a card index by key. */
    private findCardIndex(key: string): number
    {
        return this.cards.findIndex(
            c => c.config.key === key
        );
    }

    /** Returns the key of the card at offset from active. */
    private getAdjacentKey(offset: number): string | null
    {
        if (this.cards.length === 0) { return null; }

        const idx = this.findCardIndex(this.activeKey || "");
        if (idx === -1) { return null; }

        const next = (idx + offset + this.cards.length)
            % this.cards.length;
        return this.cards[next].config.key;
    }

    /** Removes a card by index and cleans up. */
    private removeCardByIndex(idx: number): void
    {
        const entry = this.cards[idx];

        if (entry.mounted)
        {
            this.unmountComponent(entry.config.child);
        }
        entry.wrapper.remove();
        this.cards.splice(idx, 1);

        if (this.activeKey === entry.config.key)
        {
            this.activateFirstAvailable();
        }
    }

    /** Activates the first available card after removal. */
    private activateFirstAvailable(): void
    {
        this.activeKey = null;

        if (this.cards.length > 0)
        {
            this.setActiveCard(this.cards[0].config.key);
        }
    }

    /** Destroys all card entries. */
    private destroyAllCards(): void
    {
        for (const entry of this.cards)
        {
            if (entry.mounted)
            {
                this.unmountComponent(entry.config.child);
            }
        }

        this.cards = [];
        this.activeKey = null;
    }

    // ========================================================================
    // 14. PRIVATE — KEYBOARD HANDLING
    // ========================================================================

    /** Attaches the keyboard event listener to the root element. */
    private attachKeyboardHandler(): void
    {
        if (!this.rootEl) { return; }

        this.rootEl.addEventListener("keydown", (e) =>
        {
            this.handleKeydown(e);
        });
    }

    /** Dispatches keyboard events to card navigation actions. */
    private handleKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "nextCard"))
        {
            e.preventDefault();
            this.next();
        }
        else if (this.matchesKeyCombo(e, "prevCard"))
        {
            e.preventDefault();
            this.previous();
        }
    }

    /** Resolves the key combo string for a named action. */
    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /** Tests whether a KeyboardEvent matches a named action. */
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

    // ========================================================================
    // 15. PRIVATE — RESIZE OBSERVATION
    // ========================================================================

    /** Sets up a ResizeObserver on the root element. */
    private setupResizeObserver(): void
    {
        if (!this.rootEl) { return; }

        this.resizeObserver = new ResizeObserver(() =>
        {
            this.fireOnLayoutChange();
        });

        this.resizeObserver.observe(this.rootEl);
    }

    /** Disconnects the ResizeObserver. */
    private teardownResizeObserver(): void
    {
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    // ========================================================================
    // 15. PRIVATE — CALLBACKS & UTILITIES
    // ========================================================================

    /** Fires the onLayoutChange callback. */
    private fireOnLayoutChange(): void
    {
        if (!this.options.onLayoutChange || !this.visible)
        {
            return;
        }
        this.options.onLayoutChange(this.getState());
    }

    /** Resolves a container argument to an HTMLElement. */
    private resolveContainer(
        container?: HTMLElement | string
    ): HTMLElement
    {
        if (!container) { return document.body; }

        if (typeof container === "string")
        {
            const el =
                document.querySelector(container) as HTMLElement;

            if (!el)
            {
                logWarn("Container not found:",
                    container
                );
                return document.body;
            }

            return el;
        }

        return container;
    }
}

// ============================================================================
// 16. CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Creates a CardLayout, optionally mounts it, and returns it.
 */
export function createCardLayout(
    options: CardLayoutOptions,
    containerId?: string
): CardLayout
{
    const layout = new CardLayout(options);

    if (containerId)
    {
        const el = document.getElementById(containerId);
        if (el) { layout.show(el); }
    }
    else
    {
        layout.show();
    }

    return layout;
}

// ============================================================================
// 17. GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const w = window as unknown as Record<string, unknown>;
    w["CardLayout"] = CardLayout;
    w["createCardLayout"] = createCardLayout;
}
