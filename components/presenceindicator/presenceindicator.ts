/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PresenceIndicator
 * 📜 PURPOSE: Compact overlapping avatar stack showing who is actively viewing
 *             or editing a shared resource. Composes PersonChip in avatarOnly
 *             mode (collapsed) and full PersonChip (expanded).
 * 🔗 RELATES: [[PersonChip]], [[PeoplePicker]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> [createPresenceIndicator()] -> [PresenceIndicator DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[PresenceIndicator]";

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

/** CSS class root prefix. */
const CLS = "presence-indicator";

/** Valid size keys. */
const VALID_SIZES = ["sm", "md", "lg"] as const;

/** Default maximum visible avatars before overflow badge. */
const DEFAULT_MAX_VISIBLE = 4;

/** Deterministic palette for initials — copied from PersonChip (IIFE constraint). */
const INITIALS_COLORS: string[] = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#862e9c",
    "#c92a2a", "#0b7285", "#5c940d", "#d6336c",
];

/** PersonChip size mapping for PresenceIndicator sizes. */
const CHIP_SIZE_MAP: Record<string, string> = {
    sm: "sm",
    md: "sm",
    lg: "md",
};

// ============================================================================
// TYPES
// ============================================================================

/** Size variant type. */
export type PresenceSize = typeof VALID_SIZES[number];

/** Data for a single person — reuses PeoplePicker PersonData shape. */
export interface PersonData
{
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    role?: string;
    status?: "online" | "offline" | "busy" | "away";
    metadata?: Record<string, string>;
}

/** Configuration options for a PresenceIndicator instance. */
export interface PresenceIndicatorOptions
{
    people?: PersonData[];
    maxVisible?: number;
    size?: PresenceSize;
    expandable?: boolean;
    expanded?: boolean;
    cssClass?: string;
    disabled?: boolean;
    onClick?: (person: PersonData) => void;
    onExpand?: () => void;
    onCollapse?: () => void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Create an HTML element with optional CSS classes and text content.
 */
function createElement(tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);

    if (classes.length > 0)
    {
        el.classList.add(...classes);
    }

    if (text)
    {
        el.textContent = text;
    }

    return el;
}

// ============================================================================
// INITIALS HELPERS (copied from PersonChip — IIFE constraint)
// ============================================================================

/**
 * Extract first letters of first and last name for avatar initials.
 */
function getInitialsFromName(name: string): string
{
    const parts = name.trim().split(/\s+/);

    if (parts.length >= 2)
    {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    return (parts[0] || "?").substring(0, 2).toUpperCase();
}

/**
 * Deterministic background colour from a name via simple hash.
 */
function getInitialsColor(name: string): string
{
    let hash = 0;

    for (let i = 0; i < name.length; i++)
    {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

// ============================================================================
// PERSONCHIP RUNTIME BRIDGE
// ============================================================================

/** PersonChip factory function shape from window global. */
type ChipFactory = (opts: Record<string, unknown>) => { getElement: () => HTMLElement; destroy: () => void };

/**
 * Resolve window.createPersonChip if available.
 */
function resolveChipFactory(): ChipFactory | null
{
    const factory = (window as unknown as Record<string, unknown>)[
        "createPersonChip"
    ] as ChipFactory | undefined;

    return factory || null;
}

/**
 * Build a fallback avatar span when PersonChip JS is not loaded.
 */
function buildFallbackAvatar(person: PersonData, diameter: number): HTMLElement
{
    const span = createElement("span", [`${CLS}-fallback`]);
    const initials = getInitialsFromName(person.name);
    const color = getInitialsColor(person.name);

    span.style.width = diameter + "px";
    span.style.height = diameter + "px";
    span.style.borderRadius = "50%";
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.backgroundColor = color;
    span.style.color = "#f8f9fa";
    span.style.fontSize = (diameter * 0.35) + "px";
    span.style.fontWeight = "600";
    span.textContent = initials;
    span.title = person.name;

    return span;
}

// ============================================================================
// CLASS: PresenceIndicator
// ============================================================================

export class PresenceIndicator
{
    // --- State ---
    private opts: PresenceIndicatorOptions;
    private people: PersonData[];
    private size: PresenceSize;
    private maxVisible: number;
    private expanded: boolean;
    private expandable: boolean;

    // --- DOM references ---
    private rootEl: HTMLElement | null = null;
    private innerEl: HTMLElement | null = null;
    private liveEl: HTMLElement | null = null;

    // --- PersonChip instances for cleanup ---
    private chipInstances: Array<{ destroy: () => void }> = [];

    // --- Bound handlers ---
    private boundStackClick: ((e: Event) => void) | null = null;
    private boundStackKeydown: ((e: Event) => void) | null = null;
    private boundDocKeydown: ((e: Event) => void) | null = null;

    constructor(options: PresenceIndicatorOptions)
    {
        this.opts = { ...options };
        this.people = options.people ? [...options.people] : [];
        this.size = this.resolveSize(options.size);
        this.maxVisible = options.maxVisible ?? DEFAULT_MAX_VISIBLE;
        this.expandable = options.expandable !== false;
        this.expanded = options.expanded === true;

        this.rootEl = this.buildRoot();
        this.innerEl = this.expanded ? this.buildExpandedList() : this.buildCollapsedStack();
        this.liveEl = this.buildLiveRegion();

        this.rootEl.appendChild(this.innerEl);
        this.rootEl.appendChild(this.liveEl);

        this.attachDocumentListeners();
        this.updateAriaLabel();

        logInfo("Created with", this.people.length, "people");
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Mount into a container by ID. */
    public show(containerId: string): void
    {
        const container = document.getElementById(containerId);

        if (!container)
        {
            logError("Container not found:", containerId);
            return;
        }

        container.appendChild(this.getElement());
    }

    /** Return the root DOM element. */
    public getElement(): HTMLElement
    {
        if (!this.rootEl)
        {
            throw new Error(LOG_PREFIX + " Component has been destroyed");
        }

        return this.rootEl;
    }

    /** Remove listeners, DOM, null refs. */
    public destroy(): void
    {
        this.destroyChips();
        this.detachDocumentListeners();

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }

        this.rootEl = null;
        this.innerEl = null;
        this.liveEl = null;

        logInfo("Destroyed");
    }

    /** Replace all people. */
    public setPeople(people: PersonData[]): void
    {
        this.people = [...people];
        this.rebuild();
    }

    /** Add one person. */
    public addPerson(person: PersonData): void
    {
        this.people.push(person);
        this.rebuild();
    }

    /** Remove a person by ID. */
    public removePerson(id: string): void
    {
        this.people = this.people.filter(function(p) { return p.id !== id; });
        this.rebuild();
    }

    /** Get current people list. */
    public getPeople(): PersonData[]
    {
        return [...this.people];
    }

    /** Switch to expanded view. */
    public expand(): void
    {
        if (this.expanded || !this.expandable)
        {
            return;
        }

        this.expanded = true;
        this.rebuild();
        this.announce("Expanded, showing " + this.people.length + " people");

        if (this.opts.onExpand)
        {
            this.opts.onExpand();
        }
    }

    /** Switch to collapsed view. */
    public collapse(): void
    {
        if (!this.expanded)
        {
            return;
        }

        this.expanded = false;
        this.rebuild();
        this.announce("Collapsed");

        if (this.opts.onCollapse)
        {
            this.opts.onCollapse();
        }
    }

    /** Toggle expanded/collapsed. */
    public toggle(): void
    {
        if (this.expanded)
        {
            this.collapse();
        }
        else
        {
            this.expand();
        }
    }

    /** Query expanded state. */
    public isExpanded(): boolean
    {
        return this.expanded;
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root container element. */
    private buildRoot(): HTMLElement
    {
        const classes = [CLS, `${CLS}-${this.size}`];

        if (this.opts.cssClass)
        {
            classes.push(this.opts.cssClass);
        }

        if (this.opts.disabled)
        {
            classes.push(`${CLS}-disabled`);
        }

        const root = createElement("div", classes);

        root.setAttribute("role", "group");

        return root;
    }

    /** Build the collapsed stack of overlapping avatars. */
    private buildCollapsedStack(): HTMLElement
    {
        const stack = createElement("div", [`${CLS}-stack`]);
        const visible = this.people.slice(0, this.maxVisible);
        const overflow = this.people.length - this.maxVisible;

        if (this.expandable)
        {
            stack.setAttribute("tabindex", "0");
            stack.setAttribute("role", "button");
            stack.setAttribute("aria-label", "Show all people");
            this.attachStackListeners(stack);
        }

        this.buildAvatarElements(visible, stack);
        this.appendOverflowBadge(stack, overflow);

        return stack;
    }

    /** Build avatar elements for visible people and append to parent. */
    private buildAvatarElements(visible: PersonData[], parent: HTMLElement): void
    {
        const total = visible.length;
        const factory = resolveChipFactory();

        for (let i = 0; i < total; i++)
        {
            const person = visible[i];
            const wrapper = createElement("span", [`${CLS}-avatar`]);

            wrapper.style.zIndex = String(total - i);

            if (person.id)
            {
                wrapper.setAttribute("data-person-id", person.id);
            }

            const avatar = this.buildPersonAvatar(factory, person);

            wrapper.appendChild(avatar);
            parent.appendChild(wrapper);
        }
    }

    /** Append overflow badge if needed. */
    private appendOverflowBadge(parent: HTMLElement, overflow: number): void
    {
        if (overflow <= 0)
        {
            return;
        }

        const badge = createElement("span", [`${CLS}-overflow`], "+" + overflow);

        badge.style.zIndex = "0";
        parent.appendChild(badge);
    }

    /** Build avatar for a single person using PersonChip or fallback. */
    private buildPersonAvatar(factory: ChipFactory | null, person: PersonData): HTMLElement
    {
        if (!factory)
        {
            return this.buildFallbackForSize(person);
        }

        const chipSize = CHIP_SIZE_MAP[this.size] || "sm";
        const chip = factory({
            name: person.name,
            email: person.email,
            avatarUrl: person.avatarUrl,
            role: person.role,
            status: person.status,
            size: chipSize,
            avatarOnly: true,
            metadata: person.metadata,
        });

        this.chipInstances.push(chip);

        return chip.getElement();
    }

    /** Build the expanded list of full PersonChip instances. */
    private buildExpandedList(): HTMLElement
    {
        const list = createElement("div", [`${CLS}-list`]);
        const factory = resolveChipFactory();

        for (let i = 0; i < this.people.length; i++)
        {
            const person = this.people[i];
            const row = createElement("div", [`${CLS}-person`]);

            if (person.id)
            {
                row.setAttribute("data-person-id", person.id);
            }

            const el = this.buildExpandedPerson(factory, person);

            row.appendChild(el);
            list.appendChild(row);
        }

        return list;
    }

    /** Build a single expanded person element. */
    private buildExpandedPerson(factory: ChipFactory | null, person: PersonData): HTMLElement
    {
        if (!factory)
        {
            return this.buildFallbackExpanded(person);
        }

        const chipSize = CHIP_SIZE_MAP[this.size] || "sm";
        const hasClick = !!this.opts.onClick;

        const chip = factory({
            name: person.name,
            email: person.email,
            avatarUrl: person.avatarUrl,
            role: person.role,
            status: person.status,
            size: chipSize,
            clickable: hasClick,
            metadata: person.metadata,
            onClick: hasClick ? this.createPersonClickHandler(person) : undefined,
        });

        this.chipInstances.push(chip);

        return chip.getElement();
    }

    /** Build a live region for announcing state changes. */
    private buildLiveRegion(): HTMLElement
    {
        const el = createElement("div", ["visually-hidden"]);

        el.setAttribute("aria-live", "polite");

        return el;
    }

    // ========================================================================
    // FALLBACK BUILDERS
    // ========================================================================

    /** Build a fallback avatar for a given size. */
    private buildFallbackForSize(person: PersonData): HTMLElement
    {
        const diameters: Record<string, number> = { sm: 20, md: 28, lg: 36 };
        const d = diameters[this.size] || 28;

        return buildFallbackAvatar(person, d);
    }

    /** Build a fallback expanded row when PersonChip is unavailable. */
    private buildFallbackExpanded(person: PersonData): HTMLElement
    {
        const row = createElement("span", []);
        const avatar = this.buildFallbackForSize(person);
        const nameEl = createElement("span", [], person.name);

        nameEl.style.marginLeft = "8px";
        nameEl.style.fontSize = "0.875rem";

        row.style.display = "inline-flex";
        row.style.alignItems = "center";

        row.appendChild(avatar);
        row.appendChild(nameEl);

        return row;
    }

    // ========================================================================
    // EVENT LISTENERS
    // ========================================================================

    /** Attach click and keyboard listeners to the collapsed stack. */
    private attachStackListeners(stack: HTMLElement): void
    {
        this.boundStackClick = this.handleStackClick.bind(this);
        stack.addEventListener("click", this.boundStackClick);

        this.boundStackKeydown = this.handleStackKeydown.bind(this);
        stack.addEventListener("keydown", this.boundStackKeydown);
    }

    /** Attach document-level Escape listener. */
    private attachDocumentListeners(): void
    {
        this.boundDocKeydown = this.handleDocKeydown.bind(this);
        document.addEventListener("keydown", this.boundDocKeydown);
    }

    /** Detach document-level listeners. */
    private detachDocumentListeners(): void
    {
        if (this.boundDocKeydown)
        {
            document.removeEventListener("keydown", this.boundDocKeydown);
            this.boundDocKeydown = null;
        }
    }

    /** Handle click on collapsed stack. */
    private handleStackClick(): void
    {
        this.toggle();
    }

    /** Handle keyboard on collapsed stack. */
    private handleStackKeydown(e: Event): void
    {
        const key = (e as KeyboardEvent).key;

        if (key === "Enter" || key === " ")
        {
            e.preventDefault();
            this.toggle();
        }
    }

    /** Handle document Escape to collapse. */
    private handleDocKeydown(e: Event): void
    {
        const key = (e as KeyboardEvent).key;

        if (key !== "Escape" || !this.expanded)
        {
            return;
        }

        if (!this.rootEl || !this.rootEl.contains(document.activeElement))
        {
            return;
        }

        e.preventDefault();
        this.collapse();
    }

    // ========================================================================
    // UPDATE HELPERS
    // ========================================================================

    /** Destroy all PersonChip instances. */
    private destroyChips(): void
    {
        for (let i = 0; i < this.chipInstances.length; i++)
        {
            try
            {
                this.chipInstances[i].destroy();
            }
            catch (err)
            {
                logWarn("Chip destroy error:", err);
            }
        }

        this.chipInstances = [];
    }

    /** Rebuild inner content after state change. */
    private rebuild(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        this.destroyChips();

        if (this.innerEl)
        {
            this.rootEl.removeChild(this.innerEl);
        }

        this.innerEl = this.expanded ? this.buildExpandedList() : this.buildCollapsedStack();
        this.rootEl.insertBefore(this.innerEl, this.liveEl);

        this.updateExpandedClass();
        this.updateAriaLabel();
    }

    /** Toggle the expanded CSS class on root. */
    private updateExpandedClass(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        if (this.expanded)
        {
            this.rootEl.classList.add(`${CLS}-expanded`);
        }
        else
        {
            this.rootEl.classList.remove(`${CLS}-expanded`);
        }
    }

    /** Update the aria-label on root. */
    private updateAriaLabel(): void
    {
        if (!this.rootEl)
        {
            return;
        }

        const count = this.people.length;
        const label = count + " active " + (count === 1 ? "person" : "people");

        this.rootEl.setAttribute("aria-label", label);
    }

    /** Announce a message via the live region. */
    private announce(message: string): void
    {
        if (!this.liveEl)
        {
            return;
        }

        this.liveEl.textContent = message;
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /** Resolve size with fallback to "md". */
    private resolveSize(size?: string): PresenceSize
    {
        if (size && (VALID_SIZES as readonly string[]).indexOf(size) !== -1)
        {
            return size as PresenceSize;
        }

        return "md";
    }

    /** Create a click handler bound to a specific person. */
    private createPersonClickHandler(person: PersonData): () => void
    {
        const self = this;

        return function(): void
        {
            if (self.opts.onClick)
            {
                self.opts.onClick(person);
            }
        };
    }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Factory function: create a PresenceIndicator and optionally mount it.
 *
 * @param containerId - Container element ID to mount into (optional if null)
 * @param options - PresenceIndicator configuration
 * @returns The created PresenceIndicator instance
 */
export function createPresenceIndicator(
    containerId: string | null,
    options: PresenceIndicatorOptions): PresenceIndicator
{
    const indicator = new PresenceIndicator(options);

    if (containerId)
    {
        indicator.show(containerId);
    }

    return indicator;
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["PresenceIndicator"] = PresenceIndicator;
(window as unknown as Record<string, unknown>)["createPresenceIndicator"] = createPresenceIndicator;
