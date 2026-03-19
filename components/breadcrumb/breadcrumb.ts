/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Breadcrumb
 * 📜 PURPOSE: Hierarchical path display with clickable segments, terminal
 *             dropdown actions, and overflow truncation for deep hierarchies.
 * 🔗 RELATES: [[EnterpriseTheme]], [[BreadcrumbSpec]]
 * ⚡ FLOW: [Consumer App] -> [createBreadcrumb()] -> [Breadcrumb DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Breadcrumb]";

/** Default maximum visible items before truncation. */
const DEFAULT_MAX_VISIBLE = 5;

/** Default separator character. */
const DEFAULT_SEPARATOR = "/";

/** Dropdown z-index (ADR-040). */
const DROPDOWN_Z_INDEX = 1060;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** A single breadcrumb path segment. */
export interface BreadcrumbItem
{
    /** Display label. Required. */
    label: string;
    /** Optional navigation URL. */
    href?: string;
    /** Bootstrap Icons class (e.g. "bi-house-fill"). */
    icon?: string;
    /** Arbitrary payload for callbacks. */
    data?: unknown;
}

/** An action in the terminal segment dropdown. */
export interface BreadcrumbAction
{
    /** Unique identifier. */
    id: string;
    /** Display label. */
    label: string;
    /** Bootstrap Icons class. */
    icon?: string;
    /** Render a separator line before this action. */
    separator?: boolean;
    /** Grey out and prevent click. */
    disabled?: boolean;
}

/** Configuration for the Breadcrumb component. */
export interface BreadcrumbOptions
{
    /** Container element to mount into. Required. */
    container: HTMLElement;
    /** Initial path segments. */
    items?: BreadcrumbItem[];
    /** Terminal segment dropdown actions. */
    actions?: BreadcrumbAction[];
    /** Max visible items before truncation. 0 = no truncation. Default: 5. */
    maxVisible?: number;
    /** Separator character (CSS content). Default: "/". */
    separator?: string;
    /** Size variant. Default: "md". */
    size?: "sm" | "md" | "lg";
    /** Additional CSS class(es) on root element. */
    cssClass?: string;
    /** Callback when a breadcrumb segment is clicked. */
    onItemClick?: (item: BreadcrumbItem, index: number) => void;
    /** Callback when a terminal action is clicked. */
    onActionClick?: (actionId: string, item: BreadcrumbItem) => void;
}

/** Public handle for controlling a Breadcrumb instance. */
export interface BreadcrumbHandle
{
    /** Replace all items. */
    setItems(items: BreadcrumbItem[]): void;
    /** Append a new segment. */
    addItem(item: BreadcrumbItem): void;
    /** Remove segment by index. */
    removeItem(index: number): void;
    /** Return current items. */
    getItems(): BreadcrumbItem[];
    /** Replace terminal actions. */
    setActions(actions: BreadcrumbAction[]): void;
    /** Return root DOM element. */
    getElement(): HTMLElement;
    /** Tear down DOM and listeners. */
    destroy(): void;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

/** Set multiple attributes on an element. */
function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// BREADCRUMB CLASS
// ============================================================================

class Breadcrumb
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly options: BreadcrumbOptions;

    private items: BreadcrumbItem[];
    private actions: BreadcrumbAction[];
    private maxVisible: number;
    private separator: string;
    private size: string;

    private rootEl: HTMLElement | null = null;
    private activeDropdown: HTMLElement | null = null;
    private boundCloseDropdown: (e: MouseEvent) => void;
    private boundKeyDown: (e: KeyboardEvent) => void;
    private destroyed = false;

    constructor(options: BreadcrumbOptions)
    {
        instanceCounter++;
        this.id = `breadcrumb-nav-${instanceCounter}`;
        this.container = options.container;
        this.options = options;

        this.items = [...(options.items ?? [])];
        this.actions = [...(options.actions ?? [])];
        this.maxVisible = options.maxVisible ?? DEFAULT_MAX_VISIBLE;
        this.separator = options.separator ?? DEFAULT_SEPARATOR;
        this.size = options.size ?? "md";

        this.boundCloseDropdown = (e: MouseEvent) => this.handleOutsideClick(e);
        this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);

        this.render();
        document.addEventListener("click", this.boundCloseDropdown, true);
        document.addEventListener("keydown", this.boundKeyDown, true);

        console.log(LOG_PREFIX, "Created", this.id, `(${this.items.length} items)`);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /** Replace all breadcrumb items and re-render. */
    setItems(items: BreadcrumbItem[]): void
    {
        this.items = [...items];
        this.render();
    }

    /** Append a new segment and re-render. */
    addItem(item: BreadcrumbItem): void
    {
        this.items.push(item);
        this.render();
    }

    /** Remove a segment by index and re-render. */
    removeItem(index: number): void
    {
        if (index < 0 || index >= this.items.length)
        {
            console.warn(LOG_PREFIX, "removeItem: index out of bounds", index);
            return;
        }

        this.items.splice(index, 1);
        this.render();
    }

    /** Return a copy of the current items. */
    getItems(): BreadcrumbItem[]
    {
        return [...this.items];
    }

    /** Replace terminal dropdown actions and re-render. */
    setActions(actions: BreadcrumbAction[]): void
    {
        this.actions = [...actions];
        this.render();
    }

    /** Return the root DOM element. */
    getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    /** Tear down DOM and event listeners. */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        this.closeDropdown();
        document.removeEventListener("click", this.boundCloseDropdown, true);
        document.removeEventListener("keydown", this.boundKeyDown, true);

        if (this.rootEl && this.rootEl.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
        this.rootEl = null;

        console.log(LOG_PREFIX, "Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: RENDER
    // ====================================================================

    /** Full re-render of the breadcrumb DOM. */
    private render(): void
    {
        this.closeDropdown();
        const oldRoot = this.rootEl;

        this.rootEl = this.buildRoot();
        const ol = this.buildList();
        this.rootEl.appendChild(ol);

        if (oldRoot && oldRoot.parentNode)
        {
            oldRoot.parentNode.replaceChild(this.rootEl, oldRoot);
        }
        else
        {
            this.container.appendChild(this.rootEl);
        }
    }

    /** Build the root `<nav>` element. */
    private buildRoot(): HTMLElement
    {
        const sizeClass = this.size !== "md"
            ? ` breadcrumb-nav-${this.size}` : "";
        const extra = this.options.cssClass
            ? ` ${this.options.cssClass}` : "";

        const nav = createElement(
            "nav", `breadcrumb-nav${sizeClass}${extra}`
        );
        nav.id = this.id;
        setAttr(nav, { "aria-label": "Breadcrumb" });

        if (this.separator !== DEFAULT_SEPARATOR)
        {
            nav.style.setProperty(
                "--breadcrumb-nav-divider", `"${this.separator}"`
            );
        }
        return nav;
    }

    /** Build the `<ol>` breadcrumb list with all visible segments. */
    private buildList(): HTMLElement
    {
        const ol = createElement("ol", "breadcrumb");
        const segments = this.computeVisibleSegments();

        for (const segment of segments)
        {
            ol.appendChild(this.buildSegment(segment));
        }
        return ol;
    }

    // ====================================================================
    // PRIVATE: SEGMENT COMPUTATION
    // ====================================================================

    /** Determine which segments to show (with ellipsis for overflow). */
    private computeVisibleSegments(): VisibleSegment[]
    {
        const total = this.items.length;

        if (this.maxVisible <= 0 || total <= this.maxVisible)
        {
            return this.items.map((item, i) => ({
                item, index: i,
                isLast: i === total - 1,
                isEllipsis: false
            }));
        }

        return this.buildTruncatedSegments(total);
    }

    /** Build segment list with ellipsis for truncated middle items. */
    private buildTruncatedSegments(total: number): VisibleSegment[]
    {
        const tailCount = Math.ceil(this.maxVisible / 2);
        const headCount = this.maxVisible - tailCount - 1;
        const segments: VisibleSegment[] = [];

        for (let i = 0; i < headCount; i++)
        {
            segments.push({
                item: this.items[i], index: i,
                isLast: false, isEllipsis: false
            });
        }

        const hiddenItems = this.items.slice(headCount, total - tailCount);
        segments.push({
            item: { label: "\u2026" },
            index: -1,
            isLast: false,
            isEllipsis: true,
            hiddenItems,
            hiddenStartIndex: headCount
        });

        for (let i = total - tailCount; i < total; i++)
        {
            segments.push({
                item: this.items[i], index: i,
                isLast: i === total - 1, isEllipsis: false
            });
        }
        return segments;
    }

    // ====================================================================
    // PRIVATE: SEGMENT DOM
    // ====================================================================

    /** Build a single `<li>` breadcrumb segment. */
    private buildSegment(segment: VisibleSegment): HTMLElement
    {
        if (segment.isEllipsis)
        {
            return this.buildEllipsisSegment(segment);
        }
        if (segment.isLast)
        {
            return this.buildTerminalSegment(segment);
        }
        return this.buildLinkSegment(segment);
    }

    /** Build a clickable (non-terminal) breadcrumb link segment. */
    private buildLinkSegment(segment: VisibleSegment): HTMLElement
    {
        const li = createElement("li", "breadcrumb-item");
        const link = this.createLinkElement(segment);
        li.appendChild(link);
        return li;
    }

    /** Create the `<a>` or `<button>` for a clickable segment. */
    private createLinkElement(segment: VisibleSegment): HTMLElement
    {
        const hasHref = !!segment.item.href;
        const tag = hasHref ? "a" : "button";
        const link = createElement(tag, "breadcrumb-nav-link");

        if (hasHref)
        {
            setAttr(link, { href: segment.item.href as string });
        }
        else
        {
            setAttr(link, { type: "button" });
        }

        this.appendIcon(link, segment.item.icon);
        const textSpan = createElement("span");
        textSpan.textContent = segment.item.label;
        link.appendChild(textSpan);

        link.addEventListener("click", (e: Event) =>
        {
            if (!hasHref) { e.preventDefault(); }
            this.handleItemClick(segment.item, segment.index, e);
        });

        return link;
    }

    /** Build the terminal (last) segment with optional actions caret. */
    private buildTerminalSegment(segment: VisibleSegment): HTMLElement
    {
        const li = createElement(
            "li", "breadcrumb-item active"
        );
        setAttr(li, { "aria-current": "page" });

        const wrapper = createElement("span", "breadcrumb-nav-terminal");

        this.appendIcon(wrapper, segment.item.icon);
        const textSpan = createElement("span");
        textSpan.textContent = segment.item.label;
        wrapper.appendChild(textSpan);

        if (this.actions.length > 0)
        {
            wrapper.appendChild(this.buildActionsCaret(segment));
        }

        li.appendChild(wrapper);
        return li;
    }

    /** Build the ellipsis segment with dropdown for hidden items. */
    private buildEllipsisSegment(segment: VisibleSegment): HTMLElement
    {
        const li = createElement("li", "breadcrumb-item");
        const btn = createElement("button", "breadcrumb-nav-ellipsis");
        setAttr(btn, {
            type: "button",
            "aria-label": "Show hidden breadcrumb items",
            "aria-haspopup": "true",
            "aria-expanded": "false"
        });
        btn.textContent = "\u2026";

        btn.addEventListener("click", (e: Event) =>
        {
            e.stopPropagation();
            this.toggleEllipsisDropdown(
                btn,
                segment.hiddenItems ?? [],
                segment.hiddenStartIndex ?? 0
            );
        });

        li.appendChild(btn);
        return li;
    }

    // ====================================================================
    // PRIVATE: ACTIONS CARET
    // ====================================================================

    /** Build the caret button for terminal actions dropdown. */
    private buildActionsCaret(segment: VisibleSegment): HTMLElement
    {
        const btn = createElement(
            "button", "breadcrumb-nav-actions-caret"
        );
        setAttr(btn, {
            type: "button",
            "aria-label": "Actions",
            "aria-haspopup": "true",
            "aria-expanded": "false"
        });

        const caret = createElement("i", "bi bi-chevron-down");
        setAttr(caret, { "aria-hidden": "true" });
        btn.appendChild(caret);

        btn.addEventListener("click", (e: Event) =>
        {
            e.stopPropagation();
            this.toggleActionsDropdown(btn, segment);
        });

        return btn;
    }

    // ====================================================================
    // PRIVATE: DROPDOWN — ACTIONS
    // ====================================================================

    /** Toggle the terminal actions dropdown. */
    private toggleActionsDropdown(
        anchor: HTMLElement, segment: VisibleSegment
    ): void
    {
        if (this.activeDropdown)
        {
            this.closeDropdown();
            return;
        }
        const menu = this.buildActionsMenu(segment);
        this.showDropdown(anchor, menu);
        anchor.setAttribute("aria-expanded", "true");
    }

    /** Build the actions dropdown menu DOM. */
    private buildActionsMenu(segment: VisibleSegment): HTMLElement
    {
        const menu = createElement("div", "breadcrumb-nav-dropdown");
        setAttr(menu, { role: "menu" });

        for (const action of this.actions)
        {
            if (action.separator)
            {
                menu.appendChild(createElement("div", "breadcrumb-nav-dropdown-divider"));
            }
            menu.appendChild(this.buildActionMenuItem(action, segment));
        }
        return menu;
    }

    /** Build a single action menu item. */
    private buildActionMenuItem(
        action: BreadcrumbAction, segment: VisibleSegment
    ): HTMLElement
    {
        const btn = createElement("button", "breadcrumb-nav-dropdown-item");
        setAttr(btn, {
            type: "button",
            role: "menuitem",
            "data-action-id": action.id
        });

        if (action.disabled)
        {
            btn.setAttribute("disabled", "true");
            btn.classList.add("disabled");
        }

        this.appendIcon(btn, action.icon);
        const label = createElement("span");
        label.textContent = action.label;
        btn.appendChild(label);

        if (!action.disabled)
        {
            btn.addEventListener("click", () =>
            {
                this.closeDropdown();
                if (this.options.onActionClick)
                {
                    this.options.onActionClick(action.id, segment.item);
                }
            });
        }
        return btn;
    }

    // ====================================================================
    // PRIVATE: DROPDOWN — ELLIPSIS
    // ====================================================================

    /** Toggle the ellipsis dropdown for hidden items. */
    private toggleEllipsisDropdown(
        anchor: HTMLElement,
        hiddenItems: BreadcrumbItem[],
        startIndex: number
    ): void
    {
        if (this.activeDropdown)
        {
            this.closeDropdown();
            return;
        }
        const menu = this.buildEllipsisMenu(hiddenItems, startIndex);
        this.showDropdown(anchor, menu);
        anchor.setAttribute("aria-expanded", "true");
    }

    /** Build the ellipsis dropdown listing hidden items. */
    private buildEllipsisMenu(
        hiddenItems: BreadcrumbItem[],
        startIndex: number
    ): HTMLElement
    {
        const menu = createElement("div", "breadcrumb-nav-dropdown");
        setAttr(menu, { role: "menu" });

        for (let i = 0; i < hiddenItems.length; i++)
        {
            const item = hiddenItems[i];
            const realIndex = startIndex + i;
            const btn = createElement("button", "breadcrumb-nav-dropdown-item");
            setAttr(btn, { type: "button", role: "menuitem" });

            this.appendIcon(btn, item.icon);
            const label = createElement("span");
            label.textContent = item.label;
            btn.appendChild(label);

            btn.addEventListener("click", () =>
            {
                this.closeDropdown();
                this.handleItemClick(item, realIndex, null);
            });
            menu.appendChild(btn);
        }
        return menu;
    }

    // ====================================================================
    // PRIVATE: DROPDOWN POSITIONING (ADR-040)
    // ====================================================================

    /** Show a dropdown menu below the anchor using position: fixed. */
    private showDropdown(anchor: HTMLElement, menu: HTMLElement): void
    {
        this.closeDropdown();
        menu.style.position = "fixed";
        menu.style.zIndex = String(DROPDOWN_Z_INDEX);
        document.body.appendChild(menu);
        this.activeDropdown = menu;

        this.positionDropdown(anchor, menu);
        this.focusFirstMenuItem(menu);
    }

    /** Position the dropdown below anchor, flipping above if needed. */
    private positionDropdown(
        anchor: HTMLElement, menu: HTMLElement
    ): void
    {
        const rect = anchor.getBoundingClientRect();
        const menuHeight = menu.offsetHeight;
        const viewportH = window.innerHeight;
        const viewportW = window.innerWidth;

        const spaceBelow = viewportH - rect.bottom;
        const placeAbove = (spaceBelow < menuHeight) && (rect.top > menuHeight);

        const top = placeAbove
            ? rect.top - menuHeight
            : rect.bottom + 2;

        let left = rect.left;
        const menuWidth = menu.offsetWidth;
        if ((left + menuWidth) > viewportW)
        {
            left = viewportW - menuWidth - 4;
        }
        if (left < 4) { left = 4; }

        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
    }

    /** Focus the first non-disabled menu item. */
    private focusFirstMenuItem(menu: HTMLElement): void
    {
        const first = menu.querySelector(
            ".breadcrumb-nav-dropdown-item:not([disabled])"
        ) as HTMLElement | null;
        if (first) { first.focus(); }
    }

    /** Close any active dropdown. */
    private closeDropdown(): void
    {
        if (!this.activeDropdown) { return; }

        if (this.activeDropdown.parentNode)
        {
            this.activeDropdown.parentNode.removeChild(this.activeDropdown);
        }
        this.activeDropdown = null;

        this.resetAriaExpanded();
    }

    /** Reset aria-expanded on all caret/ellipsis buttons. */
    private resetAriaExpanded(): void
    {
        if (!this.rootEl) { return; }

        const btns = this.rootEl.querySelectorAll("[aria-expanded]");
        for (let i = 0; i < btns.length; i++)
        {
            btns[i].setAttribute("aria-expanded", "false");
        }
    }

    // ====================================================================
    // PRIVATE: EVENT HANDLERS
    // ====================================================================

    /** Handle click on a breadcrumb item. */
    private handleItemClick(
        item: BreadcrumbItem,
        index: number,
        event: Event | null
    ): void
    {
        if (this.options.onItemClick)
        {
            if (event && !item.href) { event.preventDefault(); }
            this.options.onItemClick(item, index);
        }
    }

    /** Handle clicks outside the dropdown to close it. */
    private handleOutsideClick(e: MouseEvent): void
    {
        if (!this.activeDropdown) { return; }

        const target = e.target as HTMLElement;
        if (this.activeDropdown.contains(target)) { return; }

        const isToggle = target.closest(
            ".breadcrumb-nav-actions-caret, .breadcrumb-nav-ellipsis"
        );
        if (isToggle && this.rootEl && this.rootEl.contains(target))
        {
            return;
        }

        this.closeDropdown();
    }

    /** Handle keyboard events for dropdown navigation. */
    private handleKeyDown(e: KeyboardEvent): void
    {
        if (e.key === "Escape" && this.activeDropdown)
        {
            e.preventDefault();
            this.closeDropdown();
            return;
        }

        if (!this.activeDropdown) { return; }

        if (e.key === "ArrowDown" || e.key === "ArrowUp")
        {
            e.preventDefault();
            this.navigateDropdown(e.key === "ArrowDown" ? 1 : -1);
        }
    }

    /** Move focus within the dropdown menu. */
    private navigateDropdown(direction: number): void
    {
        if (!this.activeDropdown) { return; }

        const items = Array.from(
            this.activeDropdown.querySelectorAll(
                ".breadcrumb-nav-dropdown-item:not([disabled])"
            )
        ) as HTMLElement[];

        if (items.length === 0) { return; }

        const current = document.activeElement as HTMLElement;
        const currentIdx = items.indexOf(current);
        let nextIdx = currentIdx + direction;

        if (nextIdx < 0) { nextIdx = items.length - 1; }
        if (nextIdx >= items.length) { nextIdx = 0; }

        items[nextIdx].focus();
    }

    // ====================================================================
    // PRIVATE: HELPERS
    // ====================================================================

    /** Append a Bootstrap Icon `<i>` if the icon class is provided. */
    private appendIcon(parent: HTMLElement, iconClass?: string): void
    {
        if (!iconClass) { return; }

        const icon = createElement("i", `bi ${iconClass} breadcrumb-nav-icon`);
        setAttr(icon, { "aria-hidden": "true" });
        parent.appendChild(icon);
    }
}

// ============================================================================
// INTERNAL INTERFACES
// ============================================================================

/** Computed segment for rendering. */
interface VisibleSegment
{
    item: BreadcrumbItem;
    index: number;
    isLast: boolean;
    isEllipsis: boolean;
    hiddenItems?: BreadcrumbItem[];
    hiddenStartIndex?: number;
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

/** Create a Breadcrumb component. */
export function createBreadcrumb(options: BreadcrumbOptions): BreadcrumbHandle
{
    if (!options.container)
    {
        console.error(LOG_PREFIX, "No container provided");
        throw new Error(`${LOG_PREFIX} container is required`);
    }

    const instance = new Breadcrumb(options);
    return {
        setItems: (items) => instance.setItems(items),
        addItem: (item) => instance.addItem(item),
        removeItem: (index) => instance.removeItem(index),
        getItems: () => instance.getItems(),
        setActions: (actions) => instance.setActions(actions),
        getElement: () => instance.getElement(),
        destroy: () => instance.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createBreadcrumb = createBreadcrumb;
