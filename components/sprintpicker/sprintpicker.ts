/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SprintPicker
 * 📜 PURPOSE: Agile sprint selector with list view and calendar view, computed
 *    from anchor date, sprint length, and week start day configuration.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[DatePicker]]
 * ⚡ FLOW: [Consumer App] -> [createSprintPicker()] -> [DOM input + dropdown]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Sprint naming mode: built-in modes or a custom callback.
 */
export type SprintNaming =
    | "sprint"
    | "short"
    | "monthly"
    | ((index: number, startDate: Date, endDate: Date) => string);

/**
 * View mode for the dropdown.
 */
export type SprintViewMode = "list" | "calendar";

/**
 * Represents a computed sprint.
 */
export interface SprintInfo
{
    index: number;
    name: string;
    startDate: Date;
    endDate: Date;
}

/**
 * Represents a selected sprint value.
 */
export interface SprintValue
{
    sprintIndex: number;
    sprintName: string;
    startDate: Date;
    endDate: Date;
    date: Date;
}

/**
 * Configuration options for SprintPicker.
 */
export interface SprintPickerOptions
{
    anchorDate: Date | string;
    sprintLength?: number;
    weekStartDay?: number;
    mode?: "start" | "end";
    maxSprints?: number;
    sprintNaming?: SprintNaming;
    viewMode?: SprintViewMode;
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
    onSelect?: (value: SprintValue) => void;
    onChange?: (value: SprintValue | null) => void;
    onOpen?: () => void;
    onClose?: () => void;
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[SprintPicker]";

const SPRINT_COLORS: string[] = [
    "#4dabf7", "#51cf66", "#fcc419", "#ff8787",
    "#845ef7", "#22b8cf", "#ff922b", "#f06595"
];

const SHORT_MONTH_NAMES: string[] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_HEADERS: string[] = [
    "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"
];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    open: "ArrowDown",
    escape: "Escape",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    select: "Enter",
    selectSpace: " ",
    toggleView: "v",
    prevMonth: "PageUp",
    nextMonth: "PageDown",
    home: "Home",
    end: "End",
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
// PRIVATE HELPERS — DATE UTILITIES
// ============================================================================

function addDays(d: Date, days: number): Date
{
    const result = new Date(d.getTime());
    result.setDate(result.getDate() + days);
    return result;
}

function isSameDay(a: Date, b: Date): boolean
{
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function formatShortDate(d: Date): string
{
    return `${SHORT_MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

function formatDateRange(start: Date, end: Date): string
{
    return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}

function daysInMonth(year: number, month: number): number
{
    return new Date(year, month + 1, 0).getDate();
}

function parseAnchorDate(input: Date | string): Date
{
    if (input instanceof Date)
    {
        return new Date(
            input.getFullYear(), input.getMonth(), input.getDate()
        );
    }
    const d = new Date(input);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ============================================================================
// PRIVATE HELPERS — SPRINT COMPUTATION
// ============================================================================

function computeSprintName(
    naming: SprintNaming,
    index: number,
    startDate: Date,
    endDate: Date
): string
{
    if (typeof naming === "function")
    {
        return naming(index, startDate, endDate);
    }
    const num = index + 1;
    switch (naming)
    {
        case "short":
            return `S${num}`;
        case "monthly":
            return `${SHORT_MONTH_NAMES[startDate.getMonth()]} Sprint ${num}`;
        default:
            return `Sprint ${num}`;
    }
}

function computeSprints(
    anchor: Date,
    sprintLength: number,
    maxSprints: number,
    naming: SprintNaming
): SprintInfo[]
{
    const sprints: SprintInfo[] = [];
    const sprintDays = sprintLength * 7;

    for (let i = 0; i < maxSprints; i++)
    {
        const startDate = addDays(anchor, i * sprintDays);
        const endDate = addDays(startDate, sprintDays - 3);
        const name = computeSprintName(naming, i, startDate, endDate);
        sprints.push({ index: i, name, startDate, endDate });
    }
    return sprints;
}

// ============================================================================
// PRIVATE HELPERS — CALENDAR GRID
// ============================================================================

/**
 * Returns ordered weekday headers for the configured week start day.
 */
function getWeekdayHeaders(weekStartDay: number): string[]
{
    const headers: string[] = [];
    for (let i = 0; i < 7; i++)
    {
        headers.push(WEEKDAY_HEADERS[(weekStartDay + i) % 7]);
    }
    return headers;
}

/**
 * Returns the grid start date (first cell of the month grid).
 */
function getGridStartDate(year: number, month: number, weekStartDay: number): Date
{
    const firstOfMonth = new Date(year, month, 1);
    const dayOfWeek = firstOfMonth.getDay();
    const offset = (dayOfWeek - weekStartDay + 7) % 7;
    return addDays(firstOfMonth, -offset);
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * SprintPicker renders an agile sprint selector with list and calendar views.
 *
 * @example
 * const picker = new SprintPicker("sprint-container", {
 *     anchorDate: new Date(2026, 0, 5),
 *     sprintLength: 2
 * });
 */
export class SprintPicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: SprintPickerOptions;

    // State
    private sprints: SprintInfo[] = [];
    private selectedValue: SprintValue | null = null;
    private currentView: SprintViewMode;
    private calendarMonth: number;
    private calendarYear: number;
    private isOpen = false;
    private focusedListIndex = 0;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private dropdownEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // Bound event handlers
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnDropdownKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options: SprintPickerOptions)
    {
        instanceCounter++;
        this.instanceId = `sprintpicker-${instanceCounter}`;
        this.containerId = containerId;

        this.options = {
            sprintLength: 2,
            weekStartDay: 1,
            mode: "start",
            maxSprints: 26,
            sprintNaming: "sprint",
            viewMode: "list",
            size: "md",
            disabled: false,
            readonly: false,
            placeholder: "Select sprint…",
            ...options,
        };

        this.currentView = this.options.viewMode ?? "list";
        const anchor = parseAnchorDate(this.options.anchorDate);
        this.calendarMonth = anchor.getMonth();
        this.calendarYear = anchor.getFullYear();

        this.computeAllSprints();

        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);
        this.boundOnDropdownKeydown = (e) => this.onDropdownKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public getValue(): SprintValue | null
    {
        return this.selectedValue ? { ...this.selectedValue } : null;
    }

    public setValue(value: SprintValue | null): void
    {
        this.selectedValue = value ? { ...value } : null;
        this.updateInput();
        this.options.onChange?.(this.getValue());
    }

    public getFormattedValue(): string
    {
        if (!this.selectedValue)
        {
            return "";
        }
        return `${this.selectedValue.sprintName} (${formatDateRange(
            this.selectedValue.startDate,
            this.selectedValue.endDate
        )})`;
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
        this.wrapperEl?.classList.remove("sprintpicker-disabled");
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
    }

    public disable(): void
    {
        this.options.disabled = true;
        this.hideDropdown();
        this.wrapperEl?.classList.add("sprintpicker-disabled");
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

    public setMode(mode: "start" | "end"): void
    {
        this.options.mode = mode;
        if (this.selectedValue)
        {
            this.selectedValue.date = mode === "start"
                ? new Date(this.selectedValue.startDate.getTime())
                : new Date(this.selectedValue.endDate.getTime());
            this.updateInput();
            this.options.onChange?.(this.getValue());
        }
    }

    public setSprintLength(weeks: number): void
    {
        this.options.sprintLength = Math.max(1, Math.min(8, weeks));
        this.computeAllSprints();
        if (this.isOpen)
        {
            this.renderDropdownContent();
        }
    }

    public setAnchorDate(date: Date | string): void
    {
        this.options.anchorDate = date;
        this.computeAllSprints();
        if (this.isOpen)
        {
            this.renderDropdownContent();
        }
    }

    public getSprintAtDate(date: Date): SprintInfo | null
    {
        for (const sprint of this.sprints)
        {
            if (date >= sprint.startDate && date <= sprint.endDate)
            {
                return { ...sprint };
            }
        }
        return null;
    }

    public getSprints(): SprintInfo[]
    {
        return this.sprints.map(s => ({ ...s }));
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
    // PRIVATE — SPRINT COMPUTATION
    // ========================================================================

    private computeAllSprints(): void
    {
        const anchor = parseAnchorDate(this.options.anchorDate);
        this.sprints = computeSprints(
            anchor,
            this.options.sprintLength!,
            this.options.maxSprints!,
            this.options.sprintNaming!
        );
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

        this.wrapperEl = createElement("div", ["sprintpicker"]);
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
            this.wrapperEl.classList.add("sprintpicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("sprintpicker-lg");
        }
    }

    private applyDisabledClass(): void
    {
        if (this.options.disabled && this.wrapperEl)
        {
            this.wrapperEl.classList.add("sprintpicker-disabled");
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
        this.inputEl.className = "form-control sprintpicker-input";
        this.inputEl.readOnly = true;
        this.inputEl.placeholder = this.options.placeholder ?? "Select sprint…";
        this.inputEl.disabled = this.options.disabled ?? false;
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(this.inputEl, "aria-haspopup", "listbox");
        setAttr(this.inputEl, "aria-label", "Sprint picker");
        setAttr(this.inputEl, "id", this.instanceId + "-input");

        this.inputEl.addEventListener("keydown", this.boundOnInputKeydown);
        this.inputEl.addEventListener("click", () => this.toggleDropdown());

        const toggleBtn = createElement("button", [
            "btn", "btn-outline-secondary", "sprintpicker-toggle"
        ]);
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "aria-label", "Toggle sprint picker");
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
        this.dropdownEl = createElement("div", ["sprintpicker-dropdown"]);
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
        this.buildDropdownHeader();

        if (this.currentView === "list")
        {
            this.buildListView();
        }
        else
        {
            this.buildCalendarView();
        }
    }

    // ========================================================================
    // PRIVATE — DROPDOWN HEADER
    // ========================================================================

    private buildDropdownHeader(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const header = createElement("div", ["sprintpicker-header"]);

        const label = createElement("span", ["sprintpicker-header-label"]);
        label.textContent = `${this.sprints.length} Sprints`;

        const toggleBtn = createElement("button", [
            "sprintpicker-view-toggle"
        ]);
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "aria-label", "Toggle view mode");
        toggleBtn.textContent = this.currentView === "list"
            ? "\u{1F4C5}" : "\u{1F4CB}";
        toggleBtn.addEventListener("click", () => this.toggleViewMode());

        header.appendChild(label);
        header.appendChild(toggleBtn);
        this.dropdownEl.appendChild(header);
    }

    // ========================================================================
    // PRIVATE — LIST VIEW
    // ========================================================================

    private buildListView(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const list = createElement("div", ["sprintpicker-list"]);
        setAttr(list, "role", "listbox");

        for (const sprint of this.sprints)
        {
            list.appendChild(this.buildListItem(sprint));
        }
        this.dropdownEl.appendChild(list);
    }

    private buildListItem(sprint: SprintInfo): HTMLElement
    {
        const item = createElement("div", ["sprintpicker-list-item"]);
        setAttr(item, "role", "option");
        setAttr(item, "tabindex", "-1");
        setAttr(item, "data-index", String(sprint.index));
        setAttr(item, "aria-label",
            `${sprint.name}, ${formatDateRange(sprint.startDate, sprint.endDate)}`
        );

        const colorIdx = sprint.index % SPRINT_COLORS.length;
        item.style.borderLeftColor = SPRINT_COLORS[colorIdx];

        const isSelected = this.selectedValue?.sprintIndex === sprint.index;
        if (isSelected)
        {
            item.classList.add("sprintpicker-list-item-selected");
        }

        const nameEl = createElement("span", ["sprintpicker-list-item-name"]);
        nameEl.textContent = sprint.name;

        const dateEl = createElement("span", ["sprintpicker-list-item-dates"]);
        dateEl.textContent = formatDateRange(sprint.startDate, sprint.endDate);

        item.appendChild(nameEl);
        item.appendChild(dateEl);
        item.addEventListener("click", () => this.selectSprint(sprint));

        return item;
    }

    // ========================================================================
    // PRIVATE — CALENDAR VIEW
    // ========================================================================

    private buildCalendarView(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const calWrap = createElement("div", ["sprintpicker-calendar"]);
        calWrap.appendChild(this.buildCalendarHeader());
        calWrap.appendChild(this.buildCalendarGrid());
        calWrap.appendChild(this.buildCalendarLegend());
        this.dropdownEl.appendChild(calWrap);
    }

    private buildCalendarHeader(): HTMLElement
    {
        const header = createElement("div", ["sprintpicker-calendar-header"]);

        const prevBtn = createElement("button", ["sprintpicker-calendar-nav"], "\u25C0");
        setAttr(prevBtn, "type", "button");
        setAttr(prevBtn, "aria-label", "Previous month");
        setAttr(prevBtn, "tabindex", "-1");
        prevBtn.addEventListener("click", () => this.navigateCalendar(-1));

        const label = createElement("span", ["sprintpicker-calendar-label"]);
        label.textContent =
            `${SHORT_MONTH_NAMES[this.calendarMonth]} ${this.calendarYear}`;

        const nextBtn = createElement("button", ["sprintpicker-calendar-nav"], "\u25B6");
        setAttr(nextBtn, "type", "button");
        setAttr(nextBtn, "aria-label", "Next month");
        setAttr(nextBtn, "tabindex", "-1");
        nextBtn.addEventListener("click", () => this.navigateCalendar(1));

        header.appendChild(prevBtn);
        header.appendChild(label);
        header.appendChild(nextBtn);
        return header;
    }

    private buildCalendarGrid(): HTMLElement
    {
        const table = document.createElement("table");
        table.className = "sprintpicker-calendar-grid";
        table.appendChild(this.buildCalendarWeekdayRow());
        this.appendCalendarDayRows(table);
        return table;
    }

    private buildCalendarWeekdayRow(): HTMLElement
    {
        const thead = document.createElement("thead");
        const tr = document.createElement("tr");
        const headers = getWeekdayHeaders(this.options.weekStartDay!);
        for (const hdr of headers)
        {
            const th = document.createElement("th");
            th.className = "sprintpicker-calendar-weekday";
            th.textContent = hdr;
            tr.appendChild(th);
        }
        thead.appendChild(tr);
        return thead;
    }

    private appendCalendarDayRows(table: HTMLElement): void
    {
        const tbody = document.createElement("tbody");
        const gridStart = getGridStartDate(
            this.calendarYear, this.calendarMonth, this.options.weekStartDay!
        );

        for (let row = 0; row < 6; row++)
        {
            const tr = document.createElement("tr");
            for (let col = 0; col < 7; col++)
            {
                const cellDate = addDays(gridStart, row * 7 + col);
                tr.appendChild(this.buildCalendarDayCell(cellDate));
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
    }

    private buildCalendarDayCell(date: Date): HTMLElement
    {
        const td = document.createElement("td");
        td.className = "sprintpicker-calendar-day";

        const isOutside = date.getMonth() !== this.calendarMonth;
        if (isOutside)
        {
            td.classList.add("sprintpicker-calendar-day-outside");
        }

        const sprint = this.findSprintForDate(date);
        if (sprint)
        {
            this.applySprintBand(td, date, sprint);
        }

        this.applySelectedState(td, date);

        const btn = createElement("button", ["sprintpicker-calendar-day-num"]);
        setAttr(btn, "type", "button");
        setAttr(btn, "tabindex", "-1");
        btn.textContent = String(date.getDate());
        setAttr(btn, "aria-label",
            `${SHORT_MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
        );
        setAttr(btn, "data-date", date.toISOString().slice(0, 10));
        btn.addEventListener("click", () => this.selectDateInCalendar(date));

        td.appendChild(btn);
        return td;
    }

    private applySprintBand(
        td: HTMLElement, date: Date, sprint: SprintInfo
    ): void
    {
        const colorIdx = sprint.index % SPRINT_COLORS.length;
        const band = createElement("div", ["sprintpicker-calendar-day-band"]);
        band.style.backgroundColor = SPRINT_COLORS[colorIdx];
        band.style.borderColor = SPRINT_COLORS[colorIdx];

        if (isSameDay(date, sprint.startDate))
        {
            td.classList.add("sprintpicker-calendar-day-sprint-start");
        }
        if (isSameDay(date, sprint.endDate))
        {
            td.classList.add("sprintpicker-calendar-day-sprint-end");
        }

        td.appendChild(band);
    }

    private applySelectedState(td: HTMLElement, date: Date): void
    {
        if (!this.selectedValue)
        {
            return;
        }
        const selStart = this.selectedValue.startDate;
        const selEnd = this.selectedValue.endDate;
        if (date >= selStart && date <= selEnd)
        {
            td.classList.add("sprintpicker-calendar-day-selected");
        }
    }

    private buildCalendarLegend(): HTMLElement
    {
        const legend = createElement("div", ["sprintpicker-legend"]);
        const visibleSprints = this.getVisibleSprints();

        for (const sprint of visibleSprints)
        {
            const item = createElement("div", ["sprintpicker-legend-item"]);
            const swatch = createElement("span", ["sprintpicker-legend-swatch"]);
            const colorIdx = sprint.index % SPRINT_COLORS.length;
            swatch.style.backgroundColor = SPRINT_COLORS[colorIdx];
            const nameEl = createElement("span", [], sprint.name);
            item.appendChild(swatch);
            item.appendChild(nameEl);
            legend.appendChild(item);
        }
        return legend;
    }

    // ========================================================================
    // PRIVATE — SPRINT LOOKUP
    // ========================================================================

    private findSprintForDate(date: Date): SprintInfo | null
    {
        for (const sprint of this.sprints)
        {
            if (date >= sprint.startDate && date <= sprint.endDate)
            {
                return sprint;
            }
        }
        return null;
    }

    private getVisibleSprints(): SprintInfo[]
    {
        const monthStart = new Date(this.calendarYear, this.calendarMonth, 1);
        const monthEnd = new Date(
            this.calendarYear, this.calendarMonth,
            daysInMonth(this.calendarYear, this.calendarMonth)
        );
        return this.sprints.filter(s =>
            s.endDate >= monthStart && s.startDate <= monthEnd
        );
    }

    // ========================================================================
    // PRIVATE — SELECTION
    // ========================================================================

    private selectSprint(sprint: SprintInfo): void
    {
        const mode = this.options.mode ?? "start";
        const date = mode === "start"
            ? new Date(sprint.startDate.getTime())
            : new Date(sprint.endDate.getTime());

        this.selectedValue = {
            sprintIndex: sprint.index,
            sprintName: sprint.name,
            startDate: new Date(sprint.startDate.getTime()),
            endDate: new Date(sprint.endDate.getTime()),
            date,
        };

        this.updateInput();
        this.hideDropdown();
        this.announceSelection();
        this.options.onSelect?.(this.getValue()!);
        this.options.onChange?.(this.getValue());
        console.log(`${LOG_PREFIX} Selected:`, sprint.name);
    }

    private selectDateInCalendar(date: Date): void
    {
        const sprint = this.findSprintForDate(date);
        if (sprint)
        {
            this.selectSprint(sprint);
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
            this.inputEl.value = `${this.selectedValue.sprintName} (${formatDateRange(
                this.selectedValue.startDate,
                this.selectedValue.endDate
            )})`;
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
            `Selected ${this.selectedValue.sprintName}`;
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

        this.focusFirstItem();
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
        const dropH = this.dropdownEl.offsetHeight || 350;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropH && rect.top > dropH;

        this.dropdownEl.style.left = `${rect.left}px`;
        this.dropdownEl.style.width = `${Math.max(rect.width, 320)}px`;

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
    // PRIVATE — VIEW TOGGLE
    // ========================================================================

    private toggleViewMode(): void
    {
        this.currentView = this.currentView === "list" ? "calendar" : "list";
        this.renderDropdownContent();
        this.focusFirstItem();
    }

    // ========================================================================
    // PRIVATE — CALENDAR NAVIGATION
    // ========================================================================

    private navigateCalendar(delta: number): void
    {
        this.calendarMonth += delta;
        if (this.calendarMonth > 11)
        {
            this.calendarMonth = 0;
            this.calendarYear++;
        }
        else if (this.calendarMonth < 0)
        {
            this.calendarMonth = 11;
            this.calendarYear--;
        }
        this.renderDropdownContent();
    }

    // ========================================================================
    // PRIVATE — KEYBOARD FOCUS
    // ========================================================================

    private focusFirstItem(): void
    {
        if (this.currentView === "list")
        {
            this.focusListItem(0);
        }
        else
        {
            this.focusFirstCalendarDay();
        }
    }

    private focusListItem(index: number): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const items = this.dropdownEl.querySelectorAll<HTMLElement>(
            ".sprintpicker-list-item"
        );
        if (items.length === 0)
        {
            return;
        }
        const clampedIdx = Math.max(0, Math.min(items.length - 1, index));
        this.focusedListIndex = clampedIdx;
        items[clampedIdx].focus();
    }

    private focusFirstCalendarDay(): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const firstBtn = this.dropdownEl.querySelector<HTMLElement>(
            ".sprintpicker-calendar-day-num"
        );
        firstBtn?.focus();
    }

    private focusCalendarDayByOffset(offset: number): void
    {
        if (!this.dropdownEl)
        {
            return;
        }
        const cells = Array.from(
            this.dropdownEl.querySelectorAll<HTMLElement>(
                ".sprintpicker-calendar-day-num"
            )
        );
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
        if (this.matchesKeyCombo(e, "escape"))
        {
            e.preventDefault();
            this.hideDropdown();
            return;
        }
        if (this.matchesKeyCombo(e, "toggleView"))
        {
            e.preventDefault();
            this.toggleViewMode();
            return;
        }

        if (this.currentView === "list")
        {
            this.handleListKeydown(e);
        }
        else
        {
            this.handleCalendarKeydown(e);
        }
    }

    private handleListKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "up"))
        {
            e.preventDefault();
            this.focusListItem(this.focusedListIndex - 1);
            return;
        }
        if (this.matchesKeyCombo(e, "down"))
        {
            e.preventDefault();
            this.focusListItem(this.focusedListIndex + 1);
            return;
        }
        if (this.matchesKeyCombo(e, "home"))
        {
            e.preventDefault();
            this.focusListItem(0);
            return;
        }
        if (this.matchesKeyCombo(e, "end"))
        {
            e.preventDefault();
            this.focusListItem(this.sprints.length - 1);
            return;
        }
        if (this.matchesSelectKey(e))
        {
            e.preventDefault();
            this.selectFocusedListItem();
        }
    }

    private handleCalendarKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "left"))
        {
            e.preventDefault();
            this.focusCalendarDayByOffset(-1);
            return;
        }
        if (this.matchesKeyCombo(e, "right"))
        {
            e.preventDefault();
            this.focusCalendarDayByOffset(1);
            return;
        }
        if (this.matchesKeyCombo(e, "up"))
        {
            e.preventDefault();
            this.focusCalendarDayByOffset(-7);
            return;
        }
        if (this.matchesKeyCombo(e, "down"))
        {
            e.preventDefault();
            this.focusCalendarDayByOffset(7);
            return;
        }
        if (this.matchesKeyCombo(e, "prevMonth"))
        {
            e.preventDefault();
            this.navigateCalendar(-1);
            return;
        }
        if (this.matchesKeyCombo(e, "nextMonth"))
        {
            e.preventDefault();
            this.navigateCalendar(1);
            return;
        }
        if (this.matchesSelectKey(e))
        {
            e.preventDefault();
            this.selectFocusedCalendarDay();
        }
    }

    private matchesSelectKey(e: KeyboardEvent): boolean
    {
        return this.matchesKeyCombo(e, "select")
            || this.matchesKeyCombo(e, "selectSpace");
    }

    private selectFocusedListItem(): void
    {
        if (this.focusedListIndex >= 0 && this.focusedListIndex < this.sprints.length)
        {
            this.selectSprint(this.sprints[this.focusedListIndex]);
        }
    }

    private selectFocusedCalendarDay(): void
    {
        const active = document.activeElement as HTMLElement;
        if (!active || !active.classList.contains("sprintpicker-calendar-day-num"))
        {
            return;
        }
        const dateStr = active.getAttribute("data-date");
        if (!dateStr)
        {
            return;
        }
        const parts = dateStr.split("-");
        const date = new Date(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10)
        );
        this.selectDateInCalendar(date);
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a SprintPicker in a single call.
 */
export function createSprintPicker(
    containerId: string,
    options: SprintPickerOptions
): SprintPicker
{
    return new SprintPicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["SprintPicker"] = SprintPicker;
    (window as unknown as Record<string, unknown>)["createSprintPicker"] = createSprintPicker;
}
