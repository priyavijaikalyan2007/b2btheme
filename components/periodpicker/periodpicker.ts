/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: PeriodPicker
 * 📜 PURPOSE: Coarse time-period selector — months, quarters, halves, or years
 *    for enterprise project planning and timeline estimation.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[DatePicker]]
 * ⚡ FLOW: [Consumer App] -> [createPeriodPicker()] -> [DOM input + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Granularity levels for period selection.
 */
export type PeriodGranularity = "month" | "quarter" | "half" | "year";

/**
 * Whether the picker resolves to start or end of the period.
 */
export type PeriodMode = "start" | "end";

/**
 * Represents a selected period value.
 */
export interface PeriodValue
{
    year: number;
    period: string;
    type: PeriodGranularity;
    date: Date;
    monthIndex?: number;
}

/**
 * Configuration options for PeriodPicker.
 */
export interface PeriodPickerOptions
{
    mode?: PeriodMode;
    granularities?: PeriodGranularity[];
    value?: PeriodValue | null;
    minYear?: number;
    maxYear?: number;
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
    onSelect?: (value: PeriodValue) => void;
    onChange?: (value: PeriodValue | null) => void;
    onOpen?: () => void;
    onClose?: () => void;
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[PeriodPicker]";

const MONTH_NAMES: string[] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const QUARTER_NAMES: string[] = ["Q1", "Q2", "Q3", "Q4"];
const HALF_NAMES: string[] = ["H1", "H2"];

const QUARTER_START_MONTHS: number[] = [0, 3, 6, 9];
const HALF_START_MONTHS: number[] = [0, 6];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    open: "ArrowDown",
    escape: "Escape",
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    select: "Enter",
    selectSpace: " ",
    prevYear: "PageUp",
    nextYear: "PageDown",
};

let instanceCounter = 0;

// ============================================================================
// PRIVATE HELPERS — DOM
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string
): HTMLElement
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

function setAttr(el: HTMLElement, name: string, value: string): void
{
    el.setAttribute(name, value);
}

// ============================================================================
// PRIVATE HELPERS — DATE RESOLUTION
// ============================================================================

/**
 * Returns the last day of a given month.
 */
function lastDayOfMonth(year: number, month: number): number
{
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Resolves a period selection to a concrete Date based on mode.
 */
function resolvePeriodDate(
    year: number,
    type: PeriodGranularity,
    periodIndex: number,
    mode: PeriodMode
): Date
{
    if (mode === "start")
    {
        return resolveStartDate(year, type, periodIndex);
    }
    return resolveEndDate(year, type, periodIndex);
}

function resolveStartDate(
    year: number,
    type: PeriodGranularity,
    periodIndex: number
): Date
{
    switch (type)
    {
        case "month":
            return new Date(year, periodIndex, 1);
        case "quarter":
            return new Date(year, QUARTER_START_MONTHS[periodIndex], 1);
        case "half":
            return new Date(year, HALF_START_MONTHS[periodIndex], 1);
        case "year":
            return new Date(year, 0, 1);
    }
}

function resolveEndDate(
    year: number,
    type: PeriodGranularity,
    periodIndex: number
): Date
{
    switch (type)
    {
        case "month":
            return new Date(year, periodIndex, lastDayOfMonth(year, periodIndex));
        case "quarter":
        {
            const endMonth = QUARTER_START_MONTHS[periodIndex] + 2;
            return new Date(year, endMonth, lastDayOfMonth(year, endMonth));
        }
        case "half":
        {
            const endMonth = HALF_START_MONTHS[periodIndex] + 5;
            return new Date(year, endMonth, lastDayOfMonth(year, endMonth));
        }
        case "year":
            return new Date(year, 11, 31);
    }
}

/**
 * Returns a formatted display label for a period value.
 */
function formatPeriodLabel(value: PeriodValue): string
{
    if (value.type === "year")
    {
        return String(value.year);
    }
    return `${value.period} ${value.year}`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * PeriodPicker renders a coarse time-period selector dropdown.
 *
 * @example
 * const picker = new PeriodPicker("period-container", { mode: "start" });
 * picker.getValue(); // Returns selected PeriodValue or null
 */
export class PeriodPicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: PeriodPickerOptions;

    // State
    private selectedValue: PeriodValue | null = null;
    private displayYear: number;
    private isOpen = false;
    private focusedRow = 0;
    private focusedCol = 0;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private headerLabelEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // Bound event handlers
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnDropdownKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: PeriodPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `periodpicker-${instanceCounter}`;
        this.containerId = containerId;

        const currentYear = new Date().getFullYear();
        this.options = {
            mode: "start",
            granularities: ["month", "quarter", "half", "year"],
            minYear: currentYear - 10,
            maxYear: currentYear + 10,
            size: "md",
            disabled: false,
            readonly: false,
            placeholder: "Select period…",
            ...options,
        };

        this.displayYear = currentYear;
        this.selectedValue = this.options.value ?? null;

        if (this.selectedValue)
        {
            this.displayYear = this.selectedValue.year;
        }

        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);
        this.boundOnDropdownKeydown = (e) => this.onDropdownKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public getValue(): PeriodValue | null
    {
        return this.selectedValue ? { ...this.selectedValue } : null;
    }

    public setValue(value: PeriodValue | null): void
    {
        this.selectedValue = value ? { ...value } : null;
        if (value)
        {
            this.displayYear = value.year;
        }
        this.updateInput();
        this.options.onChange?.(this.getValue());
    }

    public getFormattedValue(): string
    {
        if (!this.selectedValue)
        {
            return "";
        }
        return formatPeriodLabel(this.selectedValue);
    }

    public open(): void
    {
        this.showDropdown();
    }

    public close(): void
    {
        this.hideDropdown();
    }

    public enable(): void
    {
        this.options.disabled = false;
        this.wrapperEl?.classList.remove("periodpicker-disabled");
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
    }

    public disable(): void
    {
        this.options.disabled = true;
        this.hideDropdown();
        this.wrapperEl?.classList.add("periodpicker-disabled");
        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }
    }

    public setReadonly(flag: boolean): void
    {
        this.options.readonly = flag;
        if (this.inputEl)
        {
            this.inputEl.readOnly = flag;
        }
    }

    public setMode(mode: PeriodMode): void
    {
        this.options.mode = mode;
        if (this.selectedValue)
        {
            this.selectedValue = this.buildValue(
                this.selectedValue.type,
                this.selectedValue.year,
                this.getPeriodIndex(this.selectedValue)
            );
            this.updateInput();
            this.options.onChange?.(this.getValue());
        }
    }

    public setYear(year: number): void
    {
        this.displayYear = year;
        if (this.isOpen)
        {
            this.renderDropdownContent();
        }
    }

    public destroy(): void
    {
        document.removeEventListener("mousedown", this.boundOnDocumentClick);
        if (this.dropdownEl && this.dropdownEl.parentNode)
        {
            this.dropdownEl.parentNode.removeChild(this.dropdownEl);
        }
        if (this.liveRegionEl && this.liveRegionEl.parentNode)
        {
            this.liveRegionEl.parentNode.removeChild(this.liveRegionEl);
        }
        const container = document.getElementById(this.containerId);
        if (container)
        {
            container.innerHTML = "";
        }
        console.log(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PRIVATE — RENDER
    // ========================================================================

    private render(): void
    {
        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error(`${LOG_PREFIX} Container not found:`, this.containerId);
            return;
        }

        this.wrapperEl = createElement("div", ["periodpicker"]);
        this.applySizeClass();
        this.applyDisabledClass();

        this.buildInputGroup();
        this.buildLiveRegion();
        this.buildDropdown();

        container.appendChild(this.wrapperEl);
        document.addEventListener("mousedown", this.boundOnDocumentClick);
    }

    private applySizeClass(): void
    {
        if (!this.wrapperEl)
        {
            return;
        }
        if (this.options.size === "sm")
        {
            this.wrapperEl.classList.add("periodpicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("periodpicker-lg");
        }
    }

    private applyDisabledClass(): void
    {
        if (this.options.disabled && this.wrapperEl)
        {
            this.wrapperEl.classList.add("periodpicker-disabled");
        }
    }

    // ========================================================================
    // PRIVATE — INPUT GROUP
    // ========================================================================

    private buildInputGroup(): void
    {
        if (!this.wrapperEl)
        {
            return;
        }
        const group = createElement("div", ["input-group"]);
        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.className = "form-control periodpicker-input";
        this.inputEl.readOnly = true;
        this.inputEl.placeholder = this.options.placeholder ?? "Select period…";
        this.inputEl.disabled = this.options.disabled ?? false;
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(this.inputEl, "aria-haspopup", "listbox");
        setAttr(this.inputEl, "aria-label", "Period picker");
        setAttr(this.inputEl, "id", this.instanceId + "-input");

        this.inputEl.addEventListener("keydown", this.boundOnInputKeydown);
        this.inputEl.addEventListener("click", () => this.toggleDropdown());

        const toggleBtn = createElement("button", [
            "btn", "btn-outline-secondary", "periodpicker-toggle"
        ]);
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "aria-label", "Toggle period picker");
        setAttr(toggleBtn, "tabindex", "-1");
        toggleBtn.innerHTML = "&#x25BC;";
        toggleBtn.addEventListener("click", () => this.toggleDropdown());

        group.appendChild(this.inputEl);
        group.appendChild(toggleBtn);
        this.wrapperEl.appendChild(group);

        this.updateInput();
    }

    private buildLiveRegion(): void
    {
        this.liveRegionEl = createElement("div", []);
        setAttr(this.liveRegionEl, "role", "status");
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        this.liveRegionEl.style.position = "absolute";
        this.liveRegionEl.style.width = "1px";
        this.liveRegionEl.style.height = "1px";
        this.liveRegionEl.style.overflow = "hidden";
        this.liveRegionEl.style.clip = "rect(0,0,0,0)";
        document.body.appendChild(this.liveRegionEl);
    }

    // ========================================================================
    // PRIVATE — DROPDOWN
    // ========================================================================

    private buildDropdown(): void
    {
        this.dropdownEl = createElement("div", ["periodpicker-dropdown"]);
        this.dropdownEl.style.display = "none";
        this.dropdownEl.style.position = "fixed";
        setAttr(this.dropdownEl, "role", "listbox");
        setAttr(this.dropdownEl, "id", this.instanceId + "-dropdown");
        this.dropdownEl.addEventListener("keydown", this.boundOnDropdownKeydown);
        document.body.appendChild(this.dropdownEl);
    }

    private renderDropdownContent(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        this.dropdownEl.innerHTML = "";
        this.buildHeader();
        this.buildBody();
    }

    private buildHeader(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const header = createElement("div", ["periodpicker-header"]);

        const prevBtn = createElement("button", ["periodpicker-nav-btn"], "\u25C0");
        setAttr(prevBtn, "type", "button");
        setAttr(prevBtn, "aria-label", "Previous year");
        setAttr(prevBtn, "tabindex", "-1");
        prevBtn.addEventListener("click", () => this.navigateYear(-1));

        this.headerLabelEl = createElement("span", ["periodpicker-header-label"]);
        this.headerLabelEl.textContent = String(this.displayYear);

        const nextBtn = createElement("button", ["periodpicker-nav-btn"], "\u25B6");
        setAttr(nextBtn, "type", "button");
        setAttr(nextBtn, "aria-label", "Next year");
        setAttr(nextBtn, "tabindex", "-1");
        nextBtn.addEventListener("click", () => this.navigateYear(1));

        header.appendChild(prevBtn);
        header.appendChild(this.headerLabelEl);
        header.appendChild(nextBtn);
        this.dropdownEl.appendChild(header);
    }

    private buildBody(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const body = createElement("div", ["periodpicker-body"]);
        const grans = this.options.granularities ?? [];

        if (grans.includes("year"))
        {
            body.appendChild(this.buildYearSection());
        }
        if (grans.includes("half"))
        {
            body.appendChild(this.buildHalfSection());
        }
        if (grans.includes("quarter"))
        {
            body.appendChild(this.buildQuarterSection());
        }
        if (grans.includes("month"))
        {
            body.appendChild(this.buildMonthSection());
        }

        this.dropdownEl.appendChild(body);
    }

    // ========================================================================
    // PRIVATE — SECTION BUILDERS
    // ========================================================================

    private buildYearSection(): HTMLElement
    {
        const section = createElement("div", ["periodpicker-section"]);
        const row = createElement("div", ["periodpicker-row", "periodpicker-row-year"]);
        const cell = this.buildCell(
            String(this.displayYear), "year", 0
        );
        row.appendChild(cell);
        section.appendChild(row);
        return section;
    }

    private buildHalfSection(): HTMLElement
    {
        const section = createElement("div", ["periodpicker-section"]);
        const label = createElement("div", ["periodpicker-section-label"], "Half");
        section.appendChild(label);
        const row = createElement("div", ["periodpicker-row", "periodpicker-row-half"]);
        for (let i = 0; i < HALF_NAMES.length; i++)
        {
            row.appendChild(this.buildCell(HALF_NAMES[i], "half", i));
        }
        section.appendChild(row);
        return section;
    }

    private buildQuarterSection(): HTMLElement
    {
        const section = createElement("div", ["periodpicker-section"]);
        const label = createElement("div", ["periodpicker-section-label"], "Quarter");
        section.appendChild(label);
        const row = createElement("div", ["periodpicker-row", "periodpicker-row-quarter"]);
        for (let i = 0; i < QUARTER_NAMES.length; i++)
        {
            row.appendChild(this.buildCell(QUARTER_NAMES[i], "quarter", i));
        }
        section.appendChild(row);
        return section;
    }

    private buildMonthSection(): HTMLElement
    {
        const section = createElement("div", ["periodpicker-section"]);
        const label = createElement("div", ["periodpicker-section-label"], "Month");
        section.appendChild(label);
        const row = createElement("div", ["periodpicker-row", "periodpicker-row-month"]);
        for (let i = 0; i < MONTH_NAMES.length; i++)
        {
            row.appendChild(this.buildCell(MONTH_NAMES[i], "month", i));
        }
        section.appendChild(row);
        return section;
    }

    // ========================================================================
    // PRIVATE — CELL BUILDER
    // ========================================================================

    private buildCell(
        label: string,
        type: PeriodGranularity,
        index: number
    ): HTMLElement
    {
        const cell = createElement("button", ["periodpicker-cell"], label);
        setAttr(cell, "type", "button");
        setAttr(cell, "data-type", type);
        setAttr(cell, "data-index", String(index));
        setAttr(cell, "aria-label", `${label} ${this.displayYear}`);
        setAttr(cell, "tabindex", "-1");

        if (this.isCellSelected(type, index))
        {
            cell.classList.add("periodpicker-cell-selected");
        }

        if (this.isCellCurrent(type, index))
        {
            cell.classList.add("periodpicker-cell-current");
        }

        cell.addEventListener("click", () =>
        {
            this.selectPeriod(type, index);
        });

        return cell;
    }

    private isCellSelected(type: PeriodGranularity, index: number): boolean
    {
        if (!this.selectedValue)
        {
            return false;
        }
        return this.selectedValue.type === type
            && this.selectedValue.year === this.displayYear
            && this.getPeriodIndex(this.selectedValue) === index;
    }

    private isCellCurrent(type: PeriodGranularity, index: number): boolean
    {
        const now = new Date();
        const currentYear = now.getFullYear();
        if (this.displayYear !== currentYear)
        {
            return false;
        }
        return this.matchesCurrent(type, index, now);
    }

    private matchesCurrent(
        type: PeriodGranularity,
        index: number,
        now: Date
    ): boolean
    {
        const currentMonth = now.getMonth();
        switch (type)
        {
            case "month":
                return index === currentMonth;
            case "quarter":
                return index === Math.floor(currentMonth / 3);
            case "half":
                return index === Math.floor(currentMonth / 6);
            case "year":
                return true;
        }
    }

    // ========================================================================
    // PRIVATE — SELECTION
    // ========================================================================

    private selectPeriod(type: PeriodGranularity, index: number): void
    {
        this.selectedValue = this.buildValue(type, this.displayYear, index);
        this.updateInput();
        this.hideDropdown();
        this.announceSelection();
        this.options.onSelect?.(this.getValue()!);
        this.options.onChange?.(this.getValue());
        console.log(`${LOG_PREFIX} Selected:`, formatPeriodLabel(this.selectedValue));
    }

    private buildValue(
        type: PeriodGranularity,
        year: number,
        index: number
    ): PeriodValue
    {
        const period = this.getPeriodName(type, index);
        const date = resolvePeriodDate(year, type, index, this.options.mode!);
        const monthIndex = type === "month" ? index : undefined;

        return { year, period, type, date, monthIndex };
    }

    private getPeriodName(type: PeriodGranularity, index: number): string
    {
        switch (type)
        {
            case "month":
                return MONTH_NAMES[index];
            case "quarter":
                return QUARTER_NAMES[index];
            case "half":
                return HALF_NAMES[index];
            case "year":
                return String(this.displayYear);
        }
    }

    private getPeriodIndex(value: PeriodValue): number
    {
        switch (value.type)
        {
            case "month":
                return value.monthIndex ?? MONTH_NAMES.indexOf(value.period);
            case "quarter":
                return QUARTER_NAMES.indexOf(value.period);
            case "half":
                return HALF_NAMES.indexOf(value.period);
            case "year":
                return 0;
        }
    }

    // ========================================================================
    // PRIVATE — INPUT UPDATE
    // ========================================================================

    private updateInput(): void
    {
        if (!this.inputEl)
        {
            return;
        }
        if (this.selectedValue)
        {
            this.inputEl.value = formatPeriodLabel(this.selectedValue);
        }
        else
        {
            this.inputEl.value = "";
        }
    }

    private announceSelection(): void
    {
        if (!this.liveRegionEl || !this.selectedValue)
        {
            return;
        }
        this.liveRegionEl.textContent =
            `Selected ${formatPeriodLabel(this.selectedValue)}`;
    }

    // ========================================================================
    // PRIVATE — DROPDOWN VISIBILITY
    // ========================================================================

    private toggleDropdown(): void
    {
        if (this.options.disabled || this.options.readonly)
        {
            return;
        }
        if (this.isOpen)
        {
            this.hideDropdown();
        }
        else
        {
            this.showDropdown();
        }
    }

    private showDropdown(): void
    {
        if (this.isOpen || this.options.disabled)
        {
            return;
        }
        this.isOpen = true;
        this.renderDropdownContent();
        this.positionDropdown();

        if (this.dropdownEl)
        {
            this.dropdownEl.style.display = "block";
        }
        if (this.inputEl)
        {
            setAttr(this.inputEl, "aria-expanded", "true");
        }

        this.focusFirstCell();
        this.options.onOpen?.();
        console.log(`${LOG_PREFIX} Opened:`, this.instanceId);
    }

    private hideDropdown(): void
    {
        if (!this.isOpen)
        {
            return;
        }
        this.isOpen = false;

        if (this.dropdownEl)
        {
            this.dropdownEl.style.display = "none";
        }
        if (this.inputEl)
        {
            setAttr(this.inputEl, "aria-expanded", "false");
            this.inputEl.focus();
        }

        this.options.onClose?.();
        console.log(`${LOG_PREFIX} Closed:`, this.instanceId);
    }

    // ========================================================================
    // PRIVATE — POSITIONING
    // ========================================================================

    private positionDropdown(): void
    {
        if (!this.inputEl || !this.dropdownEl)
        {
            return;
        }
        const rect = this.inputEl.getBoundingClientRect();
        const dropH = this.dropdownEl.offsetHeight || 300;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropH && rect.top > dropH;

        this.dropdownEl.style.left = `${rect.left}px`;
        this.dropdownEl.style.width = `${Math.max(rect.width, 280)}px`;

        if (showAbove)
        {
            this.dropdownEl.style.top = `${rect.top - dropH}px`;
        }
        else
        {
            this.dropdownEl.style.top = `${rect.bottom + 2}px`;
        }
    }

    // ========================================================================
    // PRIVATE — YEAR NAVIGATION
    // ========================================================================

    private navigateYear(delta: number): void
    {
        const newYear = this.displayYear + delta;
        if (newYear < this.options.minYear! || newYear > this.options.maxYear!)
        {
            return;
        }
        this.displayYear = newYear;
        this.renderDropdownContent();
        this.focusFirstCell();
    }

    // ========================================================================
    // PRIVATE — KEYBOARD FOCUS
    // ========================================================================

    private getAllCells(): HTMLElement[]
    {
        if (!this.dropdownEl)
        {
            return [];
        }
        return Array.from(
            this.dropdownEl.querySelectorAll<HTMLElement>(".periodpicker-cell")
        );
    }

    private focusFirstCell(): void
    {
        const cells = this.getAllCells();
        if (cells.length > 0)
        {
            cells[0].focus();
        }
    }

    private focusCellByOffset(offset: number): void
    {
        const cells = this.getAllCells();
        if (cells.length === 0)
        {
            return;
        }
        const active = document.activeElement as HTMLElement;
        const currentIdx = cells.indexOf(active);
        const nextIdx = Math.max(0, Math.min(cells.length - 1, currentIdx + offset));
        cells[nextIdx].focus();
    }

    // ========================================================================
    // PRIVATE — KEY BINDING HELPERS
    // ========================================================================

    private resolveKeyCombo(action: string): string
    {
        return this.options.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
    {
        const combo = this.resolveKeyCombo(action);
        if (!combo)
        {
            return false;
        }
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
    // PRIVATE — EVENT HANDLERS
    // ========================================================================

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.isOpen)
        {
            return;
        }
        if (!document.contains(e.target as Node))
        {
            return;
        }
        const inWrapper = this.wrapperEl?.contains(e.target as Node);
        const inDropdown = this.dropdownEl?.contains(e.target as Node);
        if (!inWrapper && !inDropdown)
        {
            this.hideDropdown();
        }
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }
        if (this.matchesKeyCombo(e, "open") && !this.isOpen)
        {
            e.preventDefault();
            this.showDropdown();
        }
        else if (this.matchesKeyCombo(e, "escape") && this.isOpen)
        {
            e.preventDefault();
            this.hideDropdown();
        }
    }

    private onDropdownKeydown(e: KeyboardEvent): void
    {
        if (this.handleDropdownNavKey(e))
        {
            return;
        }
        this.handleDropdownActionKey(e);
    }

    private handleDropdownNavKey(e: KeyboardEvent): boolean
    {
        if (this.matchesKeyCombo(e, "left"))
        {
            e.preventDefault();
            this.focusCellByOffset(-1);
            return true;
        }
        if (this.matchesKeyCombo(e, "right"))
        {
            e.preventDefault();
            this.focusCellByOffset(1);
            return true;
        }
        if (this.matchesKeyCombo(e, "up"))
        {
            e.preventDefault();
            this.focusCellByOffset(-4);
            return true;
        }
        if (this.matchesKeyCombo(e, "down"))
        {
            e.preventDefault();
            this.focusCellByOffset(4);
            return true;
        }
        return false;
    }

    private handleDropdownActionKey(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "escape"))
        {
            e.preventDefault();
            this.hideDropdown();
            return;
        }
        if (this.matchesKeyCombo(e, "prevYear"))
        {
            e.preventDefault();
            this.navigateYear(-1);
            return;
        }
        if (this.matchesKeyCombo(e, "nextYear"))
        {
            e.preventDefault();
            this.navigateYear(1);
            return;
        }
        if (
            this.matchesKeyCombo(e, "select")
            || this.matchesKeyCombo(e, "selectSpace")
        )
        {
            e.preventDefault();
            this.selectFocusedCell();
        }
    }

    private selectFocusedCell(): void
    {
        const active = document.activeElement as HTMLElement;
        if (!active || !active.classList.contains("periodpicker-cell"))
        {
            return;
        }
        const type = active.getAttribute("data-type") as PeriodGranularity;
        const index = parseInt(active.getAttribute("data-index") ?? "0", 10);
        this.selectPeriod(type, index);
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a PeriodPicker in a single call.
 */
export function createPeriodPicker(
    containerId: string,
    options?: PeriodPickerOptions
): PeriodPicker
{
    return new PeriodPicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["PeriodPicker"] = PeriodPicker;
    (window as unknown as Record<string, unknown>)["createPeriodPicker"] = createPeriodPicker;
}
