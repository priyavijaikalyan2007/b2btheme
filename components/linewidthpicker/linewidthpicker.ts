/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: LineWidthPicker
 * 📜 PURPOSE: A dropdown picker that displays line widths with visual CSS
 *    border previews, letting users select stroke thickness for graph/drawing
 *    tools.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[FontDropdown]],
 *    [[LineTypePicker]], [[GraphCanvas]]
 * ⚡ FLOW: [Consumer App] -> [createLineWidthPicker()] -> [DOM trigger + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single width entry in the dropdown. */
export interface LineWidthItem
{
    /** Display label (e.g. "2px"). */
    label: string;
    /** Numeric width value in pixels. */
    value: number;
}

/** Configuration options for LineWidthPicker. */
export interface LineWidthPickerOptions
{
    /** Custom width list; defaults to 13 common widths if omitted. */
    widths?: LineWidthItem[];
    /** Initially selected width value. */
    value?: number;
    /** Size variant. */
    size?: "mini" | "sm" | "default" | "lg";
    /** Disable the picker. */
    disabled?: boolean;
    /** Max visible items before scrolling. Default: 8. */
    maxVisibleItems?: number;
    /** Fires when the selected width changes. */
    onChange?: (width: LineWidthItem) => void;
    /** Fires when the dropdown opens. */
    onOpen?: () => void;
    /** Fires when the dropdown closes. */
    onClose?: () => void;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[LineWidthPicker]";
const CLS = "linewidthpicker";
const DEFAULT_MAX_VISIBLE = 8;
const ITEM_HEIGHT_PX = 34;
let instanceCounter = 0;

const DEFAULT_WIDTHS: LineWidthItem[] =
[
    { label: "0.5px", value: 0.5 },
    { label: "1px",   value: 1 },
    { label: "1.5px", value: 1.5 },
    { label: "2px",   value: 2 },
    { label: "2.5px", value: 2.5 },
    { label: "3px",   value: 3 },
    { label: "4px",   value: 4 },
    { label: "5px",   value: 5 },
    { label: "6px",   value: 6 },
    { label: "8px",   value: 8 },
    { label: "10px",  value: 10 },
    { label: "15px",  value: 15 },
    { label: "20px",  value: 20 },
];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    openOrMoveDown: "ArrowDown",
    openOrMoveUp: "ArrowUp",
    confirmSelection: "Enter",
    closeDropdown: "Escape",
    jumpToFirst: "Home",
    jumpToLast: "End",
};

// ============================================================================
// S3: DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
{
    const el = document.createElement(tag);
    if (classes.length > 0) { el.classList.add(...classes); }
    if (text) { el.textContent = text; }
    return el;
}

function setAttr(
    el: HTMLElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ============================================================================
// S4: CLASS
// ============================================================================

export class LineWidthPicker
{
    private readonly instanceId: string;
    private opts: LineWidthPickerOptions;
    private widths: LineWidthItem[];
    private selectedWidth: LineWidthItem | null = null;
    private highlightedIndex = -1;
    private isOpen = false;
    private destroyed = false;

    // DOM refs
    private rootEl: HTMLElement | null = null;
    private triggerEl: HTMLElement | null = null;
    private triggerPreview: HTMLElement | null = null;
    private triggerLabel: HTMLElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private listEl: HTMLElement | null = null;

    // Bound handlers for cleanup
    private readonly boundDocClick: (e: MouseEvent) => void;
    private readonly boundDocKey: (e: KeyboardEvent) => void;

    constructor(containerId: string, options: LineWidthPickerOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = { ...options };
        this.widths = options.widths
            ? [...options.widths]
            : [...DEFAULT_WIDTHS];
        this.boundDocClick = (e: MouseEvent) => this.onDocumentClick(e);
        this.boundDocKey = (e: KeyboardEvent) => this.onDocumentKey(e);
        if (options.value !== undefined)
        {
            this.selectedWidth = this.findWidth(options.value);
        }
        this.render(containerId);
        console.log(LOG_PREFIX, "created", this.instanceId);
    }

    // ── Public API ──

    /** Get the currently selected numeric width value. */
    public getValue(): number
    {
        return this.selectedWidth?.value ?? 0;
    }

    /** Get the full selected LineWidthItem or null. */
    public getSelectedWidth(): LineWidthItem | null
    {
        return this.selectedWidth;
    }

    /** Programmatically select a width by value. */
    public setValue(value: number): void
    {
        const item = this.findWidth(value);
        if (item) { this.selectWidth(item, false); }
    }

    /** Replace the available widths list. */
    public setWidths(widths: LineWidthItem[]): void
    {
        this.widths = [...widths];
        if (this.isOpen) { this.renderListItems(); }
    }

    /** Open the dropdown. */
    public open(): void
    {
        if (!this.isOpen) { this.openDropdown(); }
    }

    /** Close the dropdown. */
    public close(): void
    {
        if (this.isOpen) { this.closeDropdown(); }
    }

    /** Enable the picker. */
    public enable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.remove(`${CLS}-disabled`);
        this.opts.disabled = false;
    }

    /** Disable the picker. */
    public disable(): void
    {
        if (!this.rootEl) { return; }
        this.rootEl.classList.add(`${CLS}-disabled`);
        this.opts.disabled = true;
        if (this.isOpen) { this.closeDropdown(); }
    }

    /** Return the root DOM element. */
    public getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    /** Tear down all DOM and listeners. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.removeGlobalListeners();
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.parentElement.removeChild(this.rootEl);
        }
        this.rootEl = null;
        console.log(LOG_PREFIX, "destroyed", this.instanceId);
    }

    // ── Private: rendering ──

    private render(containerId: string): void
    {
        const container = document.getElementById(containerId);
        if (!container)
        {
            console.warn(LOG_PREFIX, "container not found:", containerId);
            return;
        }
        this.rootEl = this.buildWrapper();
        container.appendChild(this.rootEl);
    }

    private buildWrapper(): HTMLElement
    {
        const wrap = createElement("div", [CLS]);
        wrap.id = this.instanceId;
        this.applySizeClass(wrap);
        if (this.opts.disabled) { wrap.classList.add(`${CLS}-disabled`); }
        this.triggerEl = this.buildTrigger();
        this.dropdownEl = this.buildDropdown();
        wrap.appendChild(this.triggerEl);
        wrap.appendChild(this.dropdownEl);
        return wrap;
    }

    private applySizeClass(el: HTMLElement): void
    {
        if (this.opts.size === "mini") { el.classList.add(`${CLS}-mini`); }
        else if (this.opts.size === "sm") { el.classList.add(`${CLS}-sm`); }
        else if (this.opts.size === "lg") { el.classList.add(`${CLS}-lg`); }
    }

    private buildTrigger(): HTMLElement
    {
        const trigger = createElement("div", [`${CLS}-trigger`]);
        setAttr(trigger, {
            "role": "combobox",
            "aria-expanded": "false",
            "aria-haspopup": "listbox",
            "tabindex": "0",
            "aria-label": "Line width selector",
        });
        this.triggerPreview = createElement("div", [`${CLS}-trigger-preview`]);
        this.triggerLabel = createElement("span", [`${CLS}-trigger-label`]);
        this.updateTriggerDisplay();
        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);
        trigger.appendChild(this.triggerPreview);
        trigger.appendChild(this.triggerLabel);
        trigger.appendChild(caret);
        trigger.addEventListener("click", () => this.onTriggerClick());
        trigger.addEventListener("keydown", (e) => this.onTriggerKeydown(e));
        return trigger;
    }

    private updateTriggerDisplay(): void
    {
        if (!this.triggerPreview || !this.triggerLabel) { return; }
        if (this.selectedWidth)
        {
            this.triggerPreview.style.borderBottomWidth =
                `${this.selectedWidth.value}px`;
            this.triggerPreview.classList.remove(`${CLS}-trigger-preview--empty`);
            this.triggerLabel.textContent = this.selectedWidth.label;
            this.triggerLabel.classList.remove(`${CLS}-trigger-placeholder`);
        }
        else
        {
            this.triggerPreview.style.borderBottomWidth = "0";
            this.triggerPreview.classList.add(`${CLS}-trigger-preview--empty`);
            this.triggerLabel.textContent = "Select width\u2026";
            this.triggerLabel.classList.add(`${CLS}-trigger-placeholder`);
        }
    }

    private buildDropdown(): HTMLElement
    {
        const dd = createElement("div", [`${CLS}-dropdown`]);
        dd.style.display = "none";
        this.listEl = createElement("ul", [`${CLS}-list`]);
        setAttr(this.listEl, {
            "role": "listbox",
            "aria-label": "Line widths",
        });
        this.setListMaxHeight();
        dd.appendChild(this.listEl);
        return dd;
    }

    private setListMaxHeight(): void
    {
        if (!this.listEl) { return; }
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        this.listEl.style.maxHeight = `${max * ITEM_HEIGHT_PX}px`;
    }

    // ── Private: list rendering ──

    private renderListItems(): void
    {
        if (!this.listEl) { return; }
        while (this.listEl.firstChild)
        {
            this.listEl.removeChild(this.listEl.firstChild);
        }
        this.highlightedIndex = -1;
        for (let i = 0; i < this.widths.length; i++)
        {
            this.listEl.appendChild(this.buildWidthItem(this.widths[i], i));
        }
    }

    private buildWidthItem(item: LineWidthItem, index: number): HTMLElement
    {
        const li = createElement("li", [`${CLS}-item`]);
        const optId = `${this.instanceId}-opt-${index}`;
        setAttr(li, {
            "id": optId,
            "role": "option",
            "aria-selected": "false",
            "data-index": String(index),
            "data-value": String(item.value),
        });
        if (this.selectedWidth && this.selectedWidth.value === item.value)
        {
            li.classList.add(`${CLS}-item-selected`);
            setAttr(li, { "aria-selected": "true" });
        }
        this.appendItemContent(li, item);
        li.addEventListener("click", () => this.selectWidth(item, true));
        li.addEventListener("mouseenter", () => this.setHighlight(index));
        return li;
    }

    private appendItemContent(
        li: HTMLElement, item: LineWidthItem
    ): void
    {
        const preview = createElement("div", [`${CLS}-item-preview`]);
        preview.style.borderBottomWidth = `${item.value}px`;
        const label = createElement("span", [`${CLS}-item-label`], item.label);
        li.appendChild(preview);
        li.appendChild(label);
    }

    // ── Private: dropdown state ──

    private openDropdown(): void
    {
        if (this.opts.disabled || !this.dropdownEl) { return; }
        this.dropdownEl.style.display = "";
        this.isOpen = true;
        this.positionDropdown();
        this.renderListItems();
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "true" });
        }
        this.addGlobalListeners();
        safeCallback(this.opts.onOpen);
    }

    private closeDropdown(): void
    {
        if (!this.dropdownEl) { return; }
        this.dropdownEl.style.display = "none";
        this.isOpen = false;
        this.highlightedIndex = -1;
        if (this.triggerEl)
        {
            setAttr(this.triggerEl, { "aria-expanded": "false" });
            this.triggerEl.focus();
        }
        this.removeGlobalListeners();
        safeCallback(this.opts.onClose);
    }

    private positionDropdown(): void
    {
        if (!this.dropdownEl || !this.rootEl) { return; }
        const rect = this.rootEl.getBoundingClientRect();
        const max = this.opts.maxVisibleItems || DEFAULT_MAX_VISIBLE;
        const ddHeight = max * ITEM_HEIGHT_PX + 8;
        const spaceBelow = window.innerHeight - rect.bottom;
        const openAbove = spaceBelow < ddHeight && rect.top > spaceBelow;
        this.dropdownEl.style.position = "fixed";
        this.dropdownEl.style.left = `${rect.left}px`;
        this.dropdownEl.style.width = `${rect.width}px`;
        if (openAbove)
        {
            this.dropdownEl.style.top = "";
            this.dropdownEl.style.bottom =
                `${window.innerHeight - rect.top + 2}px`;
        }
        else
        {
            this.dropdownEl.style.bottom = "";
            this.dropdownEl.style.top = `${rect.bottom + 2}px`;
        }
        this.clampToViewport();
    }

    private clampToViewport(): void
    {
        if (!this.dropdownEl) { return; }
        requestAnimationFrame(() =>
        {
            if (!this.dropdownEl) { return; }
            const pr = this.dropdownEl.getBoundingClientRect();
            if (pr.right > window.innerWidth)
            {
                this.dropdownEl.style.left =
                    `${window.innerWidth - pr.width - 4}px`;
            }
            if (pr.left < 0) { this.dropdownEl.style.left = "4px"; }
        });
    }

    // ── Private: selection ──

    private selectWidth(item: LineWidthItem, fireEvent: boolean): void
    {
        this.selectedWidth = item;
        this.updateTriggerDisplay();
        if (this.isOpen) { this.closeDropdown(); }
        if (fireEvent) { safeCallback(this.opts.onChange, item); }
    }

    // ── Private: highlight navigation ──

    private setHighlight(index: number): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        items.forEach(el => el.classList.remove(`${CLS}-item-highlighted`));
        this.highlightedIndex = index;
        const target = items[index];
        if (!target) { return; }
        target.classList.add(`${CLS}-item-highlighted`);
        target.scrollIntoView({ block: "nearest" });
    }

    private moveHighlight(delta: number): void
    {
        if (!this.listEl) { return; }
        const items = this.listEl.querySelectorAll(`.${CLS}-item`);
        const count = items.length;
        if (count === 0) { return; }
        let next = this.highlightedIndex + delta;
        if (next < 0) { next = count - 1; }
        else if (next >= count) { next = 0; }
        this.setHighlight(next);
    }

    private getHighlightedWidth(): LineWidthItem | null
    {
        if (this.highlightedIndex < 0 ||
            this.highlightedIndex >= this.widths.length)
        {
            return null;
        }
        return this.widths[this.highlightedIndex];
    }

    // ── Private: keyboard ──

    private onTriggerClick(): void
    {
        if (this.opts.disabled) { return; }
        if (this.isOpen) { this.closeDropdown(); }
        else { this.openDropdown(); }
    }

    private onTriggerKeydown(e: KeyboardEvent): void
    {
        if (this.opts.disabled) { return; }
        if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveDown ||
            e.key === DEFAULT_KEY_BINDINGS.openOrMoveUp ||
            e.key === " ")
        {
            e.preventDefault();
            this.openDropdown();
        }
    }

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.rootEl || !this.isOpen) { return; }
        if (!this.rootEl.contains(e.target as Node))
        {
            this.closeDropdown();
        }
    }

    private onDocumentKey(e: KeyboardEvent): void
    {
        if (!this.isOpen) { return; }
        if (e.key === "Escape")
        {
            e.stopPropagation();
            this.closeDropdown();
            return;
        }
        if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveDown)
        {
            e.preventDefault();
            this.moveHighlight(1);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.openOrMoveUp)
        {
            e.preventDefault();
            this.moveHighlight(-1);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.confirmSelection)
        {
            e.preventDefault();
            const w = this.getHighlightedWidth();
            if (w) { this.selectWidth(w, true); }
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToFirst)
        {
            e.preventDefault();
            this.setHighlight(0);
        }
        else if (e.key === DEFAULT_KEY_BINDINGS.jumpToLast)
        {
            e.preventDefault();
            if (this.widths.length > 0)
            {
                this.setHighlight(this.widths.length - 1);
            }
        }
    }

    // ── Private: global listeners ──

    private addGlobalListeners(): void
    {
        document.addEventListener("mousedown", this.boundDocClick, true);
        document.addEventListener("keydown", this.boundDocKey, true);
    }

    private removeGlobalListeners(): void
    {
        document.removeEventListener("mousedown", this.boundDocClick, true);
        document.removeEventListener("keydown", this.boundDocKey, true);
    }

    // ── Private: helpers ──

    private findWidth(value: number): LineWidthItem | null
    {
        return this.widths.find(w => w.value === value) || null;
    }
}

// ============================================================================
// S5: FACTORY & GLOBAL EXPORTS
// ============================================================================

/** Create a LineWidthPicker and mount it in the given container. */
export function createLineWidthPicker(
    containerId: string, options: LineWidthPickerOptions
): LineWidthPicker
{
    return new LineWidthPicker(containerId, options);
}

(window as unknown as Record<string, unknown>)["LineWidthPicker"] = LineWidthPicker;
(window as unknown as Record<string, unknown>)["createLineWidthPicker"] = createLineWidthPicker;
