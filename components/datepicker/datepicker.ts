/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DatePicker
 * 📜 PURPOSE: A calendar date picker with day/month/year views, configurable
 *    first day of week, week numbers, format hint, and locale support.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]]
 * ⚡ FLOW: [Consumer App] -> [createDatePicker()] -> [DOM input + calendar popup]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the DatePicker component.
 */
export interface DatePickerOptions
{
    /** Initial selected date. Defaults to today. */
    value?: Date;

    /** Date display format. Default: "yyyy-MM-dd". */
    format?: string;

    /** First day of the week: 0 = Sunday … 6 = Saturday. Default: 0. */
    firstDayOfWeek?: number;

    /** Show ISO week numbers in the left column. Default: false. */
    showWeekNumbers?: boolean;

    /** Show the "Today" button in the footer. Default: true. */
    showTodayButton?: boolean;

    /** Earliest selectable date. */
    minDate?: Date;

    /** Latest selectable date. */
    maxDate?: Date;

    /** Specific dates that cannot be selected. */
    disabledDates?: Date[];

    /** Function returning true if a date should be disabled. */
    isDateDisabled?: (date: Date) => boolean;

    /** When true, the component is disabled. Default: false. */
    disabled?: boolean;

    /** When true, input is not editable but calendar works. Default: false. */
    readonly?: boolean;

    /** Placeholder text. Default: format string. */
    placeholder?: string;

    /** Size variant. Default: "default". */
    size?: "sm" | "default" | "lg";

    /** Locale for month/day names. Default: "en-US". */
    locale?: string;

    /** Show format hint below input. Default: true. */
    showFormatHint?: boolean;

    /** Custom format hint text. */
    formatHint?: string;

    /** Show format help icon. Default: true. */
    showFormatHelp?: boolean;

    /** Custom help tooltip text. */
    formatHelpText?: string;

    /** Fired when the user selects a date. */
    onSelect?: (date: Date) => void;

    /** Fired when the date value changes. */
    onChange?: (date: Date | null) => void;

    /** Fired when the calendar opens. */
    onOpen?: () => void;

    /** Fired when the calendar closes. */
    onClose?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DatePicker]";
const DAYS_IN_GRID = 42; // 6 rows × 7 columns
const MONTHS_IN_GRID = 12;
const YEARS_IN_GRID = 12;

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

function cloneDate(d: Date): Date
{
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean
{
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

function isDateInArray(date: Date, arr: Date[]): boolean
{
    return arr.some(d => isSameDay(d, date));
}

function startOfDay(d: Date): Date
{
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, month: number): number
{
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Returns ISO 8601 week number for a given date.
 */
function getISOWeekNumber(date: Date): number
{
    const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(
        ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
    );
}

/**
 * Returns the day-of-week index for a date, adjusted for firstDayOfWeek.
 */
function adjustedDayIndex(date: Date, firstDayOfWeek: number): number
{
    return (date.getDay() - firstDayOfWeek + 7) % 7;
}

// ============================================================================
// PRIVATE HELPERS — FORMAT / PARSE
// ============================================================================

function getMonthNames(locale: string, style: "long" | "short"): string[]
{
    const names: string[] = [];
    for (let m = 0; m < 12; m++)
    {
        const d = new Date(2020, m, 1);
        names.push(
            d.toLocaleDateString(locale, { month: style })
        );
    }
    return names;
}

function getWeekdayNames(
    locale: string, firstDayOfWeek: number
): string[]
{
    const names: string[] = [];
    // Jan 4 2020 is a Saturday; find the correct starting day
    for (let i = 0; i < 7; i++)
    {
        const dayIndex = (firstDayOfWeek + i) % 7;
        // Use a known Sunday (Jan 5 2020) and offset
        const d = new Date(2020, 0, 5 + dayIndex);
        names.push(
            d.toLocaleDateString(locale, { weekday: "short" })
        );
    }
    return names;
}

function padTwo(n: number): string
{
    return n < 10 ? "0" + n : String(n);
}

function formatDate(date: Date, format: string, locale: string): string
{
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    const monthNames = getMonthNames(locale, "short");
    const monthNamesFull = getMonthNames(locale, "long");

    let result = format;
    result = result.replace("yyyy", String(y));
    result = result.replace("yy", String(y).slice(-2));
    result = result.replace("MMMM", monthNamesFull[m]);
    result = result.replace("MMM", monthNames[m]);
    result = result.replace("MM", padTwo(m + 1));
    result = result.replace(/(?<!M)M(?!M)/, String(m + 1));
    result = result.replace("dd", padTwo(d));
    result = result.replace(/(?<!d)d(?!d)/, String(d));
    return result;
}

function parseDate(text: string, format: string): Date | null
{
    let year = -1;
    let month = -1;
    let day = -1;

    // Build a regex from the format
    let pattern = format;
    const captures: string[] = [];

    const tokenMap: [string, string][] = [
        ["yyyy", "(\\d{4})"],
        ["yy", "(\\d{2})"],
        ["MM", "(\\d{2})"],
        ["dd", "(\\d{2})"],
        ["M", "(\\d{1,2})"],
        ["d", "(\\d{1,2})"],
    ];

    // Replace tokens with capture groups
    for (const [token, regex] of tokenMap)
    {
        const idx = pattern.indexOf(token);
        if (idx !== -1)
        {
            captures.push(token);
            pattern = pattern.replace(token, regex);
        }
    }

    // Escape remaining special chars
    // (already replaced tokens so just try to match)
    try
    {
        const re = new RegExp("^" + pattern + "$");
        const match = text.match(re);
        if (!match)
        {
            return null;
        }

        for (let i = 0; i < captures.length; i++)
        {
            const val = parseInt(match[i + 1], 10);
            switch (captures[i])
            {
                case "yyyy":
                    year = val;
                    break;
                case "yy":
                    year = val + 2000;
                    break;
                case "MM":
                case "M":
                    month = val - 1;
                    break;
                case "dd":
                case "d":
                    day = val;
                    break;
            }
        }
    }
    catch
    {
        return null;
    }

    if (year < 0 || month < 0 || day < 0)
    {
        return null;
    }

    const result = new Date(year, month, day);
    // Validate the date is real (e.g., Feb 30 would roll)
    if (
        result.getFullYear() !== year
        || result.getMonth() !== month
        || result.getDate() !== day
    )
    {
        return null;
    }

    return result;
}

/**
 * Generates an example date string for the help tooltip.
 */
function generateFormatExample(
    format: string, locale: string
): string
{
    const today = new Date();
    return formatDate(today, format, locale);
}

// ============================================================================
// PUBLIC API
// ============================================================================

// @entrypoint
/**
 * DatePicker renders a calendar date selector with day/month/year navigation.
 *
 * @example
 * const picker = new DatePicker("date-container");
 * picker.getValue(); // Returns selected Date or null
 */
export class DatePicker
{
    private readonly containerId: string;
    private readonly instanceId: string;
    private options: DatePickerOptions;

    // State
    private selectedDate: Date | null = null;
    private viewDate: Date; // The month/year currently displayed
    private viewMode: "day" | "month" | "year" = "day";
    private focusedDate: Date; // Date with keyboard focus in grid
    private isOpen = false;
    private previousValue: Date | null = null;

    // DOM references
    private wrapperEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private calendarEl: HTMLElement | null = null;
    private gridEl: HTMLElement | null = null;
    private headerLabelEl: HTMLElement | null = null;
    private todayBtnEl: HTMLElement | null = null;
    private hintEl: HTMLElement | null = null;
    private helpTooltipEl: HTMLElement | null = null;

    // Cached locale data
    private monthNamesShort: string[] = [];
    private monthNamesLong: string[] = [];
    private weekdayNames: string[] = [];

    // Bound event handlers
    private readonly boundOnDocumentClick: (e: MouseEvent) => void;
    private readonly boundOnInputKeydown: (e: KeyboardEvent) => void;
    private readonly boundOnCalendarKeydown: (e: KeyboardEvent) => void;

    constructor(containerId: string, options?: DatePickerOptions)
    {
        instanceCounter++;
        this.instanceId = `datepicker-${instanceCounter}`;
        this.containerId = containerId;

        this.options = {
            format: "yyyy-MM-dd",
            firstDayOfWeek: 0,
            showWeekNumbers: false,
            showTodayButton: true,
            disabled: false,
            readonly: false,
            size: "default",
            locale: "en-US",
            showFormatHint: true,
            showFormatHelp: true,
            ...options,
        };

        const today = startOfDay(new Date());
        this.selectedDate = this.options.value
            ? startOfDay(this.options.value)
            : today;
        this.viewDate = cloneDate(this.selectedDate);
        this.focusedDate = cloneDate(this.selectedDate);
        this.previousValue = this.selectedDate
            ? cloneDate(this.selectedDate)
            : null;

        // Clamp to range
        this.clampSelected();

        // Cache locale data
        this.monthNamesShort = getMonthNames(
            this.options.locale!, "short"
        );
        this.monthNamesLong = getMonthNames(
            this.options.locale!, "long"
        );
        this.weekdayNames = getWeekdayNames(
            this.options.locale!, this.options.firstDayOfWeek!
        );

        // Bind handlers
        this.boundOnDocumentClick = (e) => this.onDocumentClick(e);
        this.boundOnInputKeydown = (e) => this.onInputKeydown(e);
        this.boundOnCalendarKeydown = (e) => this.onCalendarKeydown(e);

        this.render();
        console.log(`${LOG_PREFIX} Initialised:`, this.instanceId);
    }

    // ========================================================================
    // PUBLIC METHODS
    // ========================================================================

    public getValue(): Date | null
    {
        return this.selectedDate ? cloneDate(this.selectedDate) : null;
    }

    public getFormattedValue(): string
    {
        if (!this.selectedDate)
        {
            return "";
        }
        return formatDate(
            this.selectedDate,
            this.options.format!,
            this.options.locale!
        );
    }

    public setValue(date: Date | null): void
    {
        if (date)
        {
            this.selectedDate = startOfDay(date);
            this.clampSelected();
            this.viewDate = cloneDate(this.selectedDate!);
            this.focusedDate = cloneDate(this.selectedDate!);
        }
        else
        {
            this.selectedDate = null;
        }
        this.updateInput();
        if (this.isOpen)
        {
            this.renderView();
        }
        this.options.onChange?.(this.getValue());
        console.debug(`${LOG_PREFIX} setValue:`, date);
    }

    public open(): void
    {
        if (this.options.disabled || this.isOpen)
        {
            return;
        }
        this.showCalendar();
    }

    public close(): void
    {
        if (this.isOpen)
        {
            this.hideCalendar();
        }
    }

    public navigateTo(year: number, month: number): void
    {
        this.viewDate = new Date(year, month, 1);
        this.focusedDate = new Date(year, month, 1);
        this.viewMode = "day";
        if (this.isOpen)
        {
            this.renderView();
        }
        console.debug(`${LOG_PREFIX} navigateTo:`, year, month);
    }

    public enable(): void
    {
        this.options.disabled = false;
        if (this.inputEl)
        {
            this.inputEl.disabled = false;
        }
        this.wrapperEl?.classList.remove("datepicker-disabled");
    }

    public disable(): void
    {
        this.options.disabled = true;
        if (this.inputEl)
        {
            this.inputEl.disabled = true;
        }
        this.wrapperEl?.classList.add("datepicker-disabled");
        if (this.isOpen)
        {
            this.hideCalendar();
        }
    }

    public setMinDate(date: Date | null): void
    {
        this.options.minDate = date || undefined;
        this.clampSelected();
        this.updateInput();
        if (this.isOpen)
        {
            this.renderView();
        }
    }

    public setMaxDate(date: Date | null): void
    {
        this.options.maxDate = date || undefined;
        this.clampSelected();
        this.updateInput();
        if (this.isOpen)
        {
            this.renderView();
        }
    }

    public destroy(): void
    {
        document.removeEventListener("click", this.boundOnDocumentClick);
        if (this.wrapperEl)
        {
            this.wrapperEl.remove();
            this.wrapperEl = null;
        }
        console.debug(`${LOG_PREFIX} Destroyed:`, this.instanceId);
    }

    // ========================================================================
    // PRIVATE — RENDERING
    // ========================================================================

    private render(): void
    {
        const container = document.getElementById(this.containerId);
        if (!container)
        {
            console.error(
                `${LOG_PREFIX} Container not found:`, this.containerId
            );
            return;
        }

        this.wrapperEl = createElement("div", ["datepicker"]);
        setAttr(this.wrapperEl, "id", this.instanceId);

        if (this.options.size === "sm")
        {
            this.wrapperEl.classList.add("datepicker-sm");
        }
        else if (this.options.size === "lg")
        {
            this.wrapperEl.classList.add("datepicker-lg");
        }
        if (this.options.disabled)
        {
            this.wrapperEl.classList.add("datepicker-disabled");
        }

        // Input group
        const inputGroup = this.buildInputGroup();
        this.wrapperEl.appendChild(inputGroup);

        // Format hint
        if (this.options.showFormatHint)
        {
            this.hintEl = this.buildFormatHint();
            this.wrapperEl.appendChild(this.hintEl);
        }

        // Calendar popup (hidden)
        this.calendarEl = this.buildCalendar();
        this.wrapperEl.appendChild(this.calendarEl);

        container.appendChild(this.wrapperEl);
        document.addEventListener("click", this.boundOnDocumentClick);
    }

    private buildInputGroup(): HTMLElement
    {
        const group = createElement("div", ["input-group"]);

        this.inputEl = document.createElement("input");
        this.inputEl.type = "text";
        this.inputEl.className = "form-control datepicker-input";
        setAttr(this.inputEl, "autocomplete", "off");
        setAttr(
            this.inputEl,
            "aria-haspopup", "dialog"
        );
        setAttr(this.inputEl, "aria-expanded", "false");
        setAttr(
            this.inputEl,
            "aria-controls", `${this.instanceId}-calendar`
        );

        if (this.options.showFormatHint)
        {
            setAttr(
                this.inputEl,
                "aria-describedby",
                `${this.instanceId}-format-hint`
            );
        }

        const placeholder = this.options.placeholder
            || this.options.format!;
        setAttr(this.inputEl, "placeholder", placeholder);

        if (this.options.disabled)
        {
            this.inputEl.disabled = true;
        }
        if (this.options.readonly)
        {
            this.inputEl.readOnly = true;
        }

        this.updateInput();

        this.inputEl.addEventListener(
            "keydown", this.boundOnInputKeydown
        );
        this.inputEl.addEventListener("click", () =>
        {
            if (!this.options.disabled)
            {
                this.showCalendar();
            }
        });
        this.inputEl.addEventListener("blur", () =>
        {
            this.onInputBlur();
        });

        group.appendChild(this.inputEl);

        const toggleBtn = createElement(
            "button",
            ["btn", "btn-outline-secondary", "datepicker-toggle"]
        );
        setAttr(toggleBtn, "type", "button");
        setAttr(toggleBtn, "tabindex", "-1");
        setAttr(toggleBtn, "aria-label", "Open calendar");

        const icon = createElement("i", ["bi", "bi-calendar3"]);
        toggleBtn.appendChild(icon);
        toggleBtn.addEventListener("mousedown", (e) =>
        {
            e.preventDefault();
            if (this.options.disabled)
            {
                return;
            }
            if (this.isOpen)
            {
                this.hideCalendar();
            }
            else
            {
                this.showCalendar();
            }
        });

        group.appendChild(toggleBtn);
        return group;
    }

    private buildFormatHint(): HTMLElement
    {
        const hint = createElement("div", ["datepicker-hint"]);
        setAttr(hint, "id", `${this.instanceId}-format-hint`);

        const hintText = this.options.formatHint
            || this.options.format!;
        const span = createElement(
            "span",
            ["datepicker-hint-text", "text-muted", "small"],
            hintText
        );
        hint.appendChild(span);

        if (this.options.showFormatHelp)
        {
            const helpBtn = createElement(
                "button", ["datepicker-help-icon"]
            );
            setAttr(helpBtn, "type", "button");
            setAttr(helpBtn, "aria-label", "Date format help");
            const helpIcon = createElement(
                "i", ["bi", "bi-question-circle"]
            );
            helpBtn.appendChild(helpIcon);
            hint.appendChild(helpBtn);

            const tooltip = createElement(
                "div", ["datepicker-help-tooltip"]
            );
            setAttr(tooltip, "role", "tooltip");
            const helpText = this.options.formatHelpText
                || `Enter a date in the format ${this.options.format} `
                + `(e.g., ${generateFormatExample(
                    this.options.format!, this.options.locale!
                )})`;
            tooltip.textContent = helpText;
            hint.appendChild(tooltip);
            this.helpTooltipEl = tooltip;

            helpBtn.addEventListener("click", (e) =>
            {
                e.stopPropagation();
                this.toggleHelpTooltip();
            });
            helpBtn.addEventListener("mouseenter", () =>
            {
                this.showHelpTooltip();
            });
            helpBtn.addEventListener("mouseleave", () =>
            {
                this.hideHelpTooltip();
            });
        }

        return hint;
    }

    private buildCalendar(): HTMLElement
    {
        const cal = createElement("div", ["datepicker-calendar"]);
        setAttr(cal, "id", `${this.instanceId}-calendar`);
        setAttr(cal, "role", "dialog");
        setAttr(cal, "aria-modal", "true");
        setAttr(cal, "aria-label", "Choose date");
        cal.style.display = "none";

        cal.addEventListener(
            "keydown", this.boundOnCalendarKeydown
        );

        return cal;
    }

    private renderView(): void
    {
        if (!this.calendarEl)
        {
            return;
        }
        this.calendarEl.innerHTML = "";

        switch (this.viewMode)
        {
            case "day":
                this.renderDayView();
                break;
            case "month":
                this.renderMonthView();
                break;
            case "year":
                this.renderYearView();
                break;
        }
    }

    // ========================================================================
    // PRIVATE — DAY VIEW
    // ========================================================================

    private renderDayView(): void
    {
        const header = this.buildDayHeader();
        this.calendarEl!.appendChild(header);

        this.gridEl = this.buildDayGrid();
        this.calendarEl!.appendChild(this.gridEl);

        const footer = this.buildFooter();
        this.calendarEl!.appendChild(footer);
    }

    private buildDayHeader(): HTMLElement
    {
        const header = createElement("div", ["datepicker-header"]);

        const prevBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(prevBtn, "type", "button");
        setAttr(prevBtn, "aria-label", "Previous month");
        prevBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-left"])
        );
        prevBtn.addEventListener("click", () =>
        {
            this.navigateMonth(-1);
        });
        header.appendChild(prevBtn);

        this.headerLabelEl = createElement(
            "button", ["datepicker-header-label"]
        );
        setAttr(this.headerLabelEl, "type", "button");
        setAttr(this.headerLabelEl, "aria-live", "polite");
        this.updateHeaderLabel();
        this.headerLabelEl.addEventListener("click", () =>
        {
            this.viewMode = "month";
            this.renderView();
        });
        header.appendChild(this.headerLabelEl);

        const nextBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(nextBtn, "type", "button");
        setAttr(nextBtn, "aria-label", "Next month");
        nextBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-right"])
        );
        nextBtn.addEventListener("click", () =>
        {
            this.navigateMonth(1);
        });
        header.appendChild(nextBtn);

        return header;
    }

    private buildDayGrid(): HTMLElement
    {
        const table = document.createElement("table");
        table.className = "datepicker-grid";
        setAttr(table, "role", "grid");

        // Weekday header row
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");

        if (this.options.showWeekNumbers)
        {
            const wkTh = document.createElement("th");
            wkTh.className = "datepicker-weeknumber-header";
            setAttr(wkTh, "aria-hidden", "true");
            wkTh.textContent = "Wk";
            headerRow.appendChild(wkTh);
        }

        for (const name of this.weekdayNames)
        {
            const th = document.createElement("th");
            th.className = "datepicker-weekday";
            setAttr(th, "scope", "col");
            th.textContent = name;
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Day cells
        const tbody = document.createElement("tbody");
        const cells = this.getDayCells();
        const today = startOfDay(new Date());

        for (let row = 0; row < 6; row++)
        {
            const tr = document.createElement("tr");

            if (this.options.showWeekNumbers)
            {
                const wkTd = document.createElement("td");
                wkTd.className = "datepicker-weeknumber";
                setAttr(wkTd, "aria-hidden", "true");
                wkTd.textContent = String(
                    getISOWeekNumber(cells[row * 7])
                );
                tr.appendChild(wkTd);
            }

            for (let col = 0; col < 7; col++)
            {
                const cellDate = cells[row * 7 + col];
                const td = document.createElement("td");
                setAttr(td, "role", "gridcell");

                const btn = document.createElement("button");
                setAttr(btn, "type", "button");
                btn.textContent = String(cellDate.getDate());
                btn.className = "datepicker-day";

                const isOutside =
                    cellDate.getMonth() !== this.viewDate.getMonth();
                const isToday = isSameDay(cellDate, today);
                const isSelected = this.selectedDate
                    && isSameDay(cellDate, this.selectedDate);
                const isFocused = isSameDay(
                    cellDate, this.focusedDate
                );
                const isDisabled = this.isDateDisabledCheck(cellDate);

                if (isOutside)
                {
                    btn.classList.add("datepicker-day-outside");
                }
                if (isToday)
                {
                    btn.classList.add("datepicker-day-today");
                }
                if (isSelected)
                {
                    btn.classList.add("datepicker-day-selected");
                    setAttr(btn, "aria-pressed", "true");
                }
                if (isDisabled)
                {
                    btn.classList.add("datepicker-day-disabled");
                    setAttr(btn, "aria-disabled", "true");
                    btn.disabled = true;
                }

                setAttr(
                    btn, "tabindex", isFocused ? "0" : "-1"
                );
                setAttr(
                    btn,
                    "aria-label",
                    cellDate.toLocaleDateString(
                        this.options.locale,
                        {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }
                    )
                );

                // Store date on the element
                (btn as any)._date = cellDate;

                btn.addEventListener("click", () =>
                {
                    if (!isDisabled)
                    {
                        this.selectDate(cellDate);
                    }
                });

                td.appendChild(btn);
                tr.appendChild(td);
            }

            tbody.appendChild(tr);
        }
        table.appendChild(tbody);

        return table;
    }

    private getDayCells(): Date[]
    {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const firstOfMonth = new Date(year, month, 1);
        const startOffset = adjustedDayIndex(
            firstOfMonth, this.options.firstDayOfWeek!
        );

        const cells: Date[] = [];
        const startDate = new Date(year, month, 1 - startOffset);

        for (let i = 0; i < DAYS_IN_GRID; i++)
        {
            cells.push(
                new Date(
                    startDate.getFullYear(),
                    startDate.getMonth(),
                    startDate.getDate() + i
                )
            );
        }
        return cells;
    }

    // ========================================================================
    // PRIVATE — MONTH VIEW
    // ========================================================================

    private renderMonthView(): void
    {
        const header = this.buildMonthHeader();
        this.calendarEl!.appendChild(header);

        const grid = this.buildMonthGrid();
        this.calendarEl!.appendChild(grid);

        const footer = this.buildFooter();
        this.calendarEl!.appendChild(footer);
    }

    private buildMonthHeader(): HTMLElement
    {
        const header = createElement("div", ["datepicker-header"]);

        const prevBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(prevBtn, "type", "button");
        setAttr(prevBtn, "aria-label", "Previous year");
        prevBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-left"])
        );
        prevBtn.addEventListener("click", () =>
        {
            this.viewDate.setFullYear(
                this.viewDate.getFullYear() - 1
            );
            this.renderView();
        });
        header.appendChild(prevBtn);

        const label = createElement(
            "button", ["datepicker-header-label"]
        );
        setAttr(label, "type", "button");
        setAttr(label, "aria-live", "polite");
        label.textContent = String(this.viewDate.getFullYear());
        label.addEventListener("click", () =>
        {
            this.viewMode = "year";
            this.renderView();
        });
        header.appendChild(label);

        const nextBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(nextBtn, "type", "button");
        setAttr(nextBtn, "aria-label", "Next year");
        nextBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-right"])
        );
        nextBtn.addEventListener("click", () =>
        {
            this.viewDate.setFullYear(
                this.viewDate.getFullYear() + 1
            );
            this.renderView();
        });
        header.appendChild(nextBtn);

        return header;
    }

    private buildMonthGrid(): HTMLElement
    {
        const grid = createElement(
            "div", ["datepicker-month-grid"]
        );
        const currentMonth = this.viewDate.getMonth();
        const today = new Date();

        for (let m = 0; m < MONTHS_IN_GRID; m++)
        {
            const btn = createElement(
                "button",
                ["datepicker-month"],
                this.monthNamesShort[m]
            );
            setAttr(btn, "type", "button");

            if (m === currentMonth)
            {
                btn.classList.add("datepicker-month-selected");
            }
            if (
                m === today.getMonth()
                && this.viewDate.getFullYear() === today.getFullYear()
            )
            {
                btn.classList.add("datepicker-month-today");
            }

            btn.addEventListener("click", () =>
            {
                this.viewDate.setMonth(m);
                this.focusedDate = new Date(
                    this.viewDate.getFullYear(), m, 1
                );
                this.viewMode = "day";
                this.renderView();
            });

            grid.appendChild(btn);
        }

        return grid;
    }

    // ========================================================================
    // PRIVATE — YEAR VIEW
    // ========================================================================

    private renderYearView(): void
    {
        const header = this.buildYearHeader();
        this.calendarEl!.appendChild(header);

        const grid = this.buildYearGrid();
        this.calendarEl!.appendChild(grid);

        const footer = this.buildFooter();
        this.calendarEl!.appendChild(footer);
    }

    private buildYearHeader(): HTMLElement
    {
        const header = createElement("div", ["datepicker-header"]);
        const startYear = this.getYearRangeStart();

        const prevBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(prevBtn, "type", "button");
        setAttr(prevBtn, "aria-label", "Previous year range");
        prevBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-left"])
        );
        prevBtn.addEventListener("click", () =>
        {
            this.viewDate.setFullYear(
                this.viewDate.getFullYear() - YEARS_IN_GRID
            );
            this.renderView();
        });
        header.appendChild(prevBtn);

        const label = createElement(
            "span", ["datepicker-header-label"]
        );
        label.textContent =
            `${startYear} \u2013 ${startYear + YEARS_IN_GRID - 1}`;
        header.appendChild(label);

        const nextBtn = createElement(
            "button", ["datepicker-nav-btn"]
        );
        setAttr(nextBtn, "type", "button");
        setAttr(nextBtn, "aria-label", "Next year range");
        nextBtn.appendChild(
            createElement("i", ["bi", "bi-chevron-right"])
        );
        nextBtn.addEventListener("click", () =>
        {
            this.viewDate.setFullYear(
                this.viewDate.getFullYear() + YEARS_IN_GRID
            );
            this.renderView();
        });
        header.appendChild(nextBtn);

        return header;
    }

    private buildYearGrid(): HTMLElement
    {
        const grid = createElement(
            "div", ["datepicker-year-grid"]
        );
        const startYear = this.getYearRangeStart();
        const currentYear = this.viewDate.getFullYear();
        const todayYear = new Date().getFullYear();

        for (let i = 0; i < YEARS_IN_GRID; i++)
        {
            const y = startYear + i;
            const btn = createElement(
                "button",
                ["datepicker-year"],
                String(y)
            );
            setAttr(btn, "type", "button");

            if (y === currentYear)
            {
                btn.classList.add("datepicker-year-selected");
            }
            if (y === todayYear)
            {
                btn.classList.add("datepicker-year-today");
            }

            btn.addEventListener("click", () =>
            {
                this.viewDate.setFullYear(y);
                this.viewMode = "month";
                this.renderView();
            });

            grid.appendChild(btn);
        }

        return grid;
    }

    private getYearRangeStart(): number
    {
        const y = this.viewDate.getFullYear();
        return y - (y % YEARS_IN_GRID);
    }

    // ========================================================================
    // PRIVATE — FOOTER
    // ========================================================================

    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", ["datepicker-footer"]);

        if (this.options.showTodayButton)
        {
            const today = startOfDay(new Date());
            this.todayBtnEl = createElement(
                "button",
                ["btn", "btn-sm", "btn-link", "datepicker-today-btn"],
                "Today"
            );
            setAttr(this.todayBtnEl, "type", "button");
            setAttr(
                this.todayBtnEl,
                "aria-label",
                `Today, ${today.toLocaleDateString(
                    this.options.locale,
                    {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }
                )}`
            );

            if (this.isDateDisabledCheck(today))
            {
                (this.todayBtnEl as HTMLButtonElement).disabled = true;
            }

            this.todayBtnEl.addEventListener("click", () =>
            {
                this.selectDate(today);
            });

            footer.appendChild(this.todayBtnEl);
        }

        return footer;
    }

    // ========================================================================
    // PRIVATE — CALENDAR OPEN / CLOSE
    // ========================================================================

    private showCalendar(): void
    {
        if (this.isOpen || !this.calendarEl)
        {
            return;
        }

        // Close other open datepickers
        document.querySelectorAll(
            ".datepicker-calendar[style*='display: block']"
        ).forEach((el) =>
        {
            (el as HTMLElement).style.display = "none";
        });

        this.isOpen = true;
        this.calendarEl.style.display = "block";
        setAttr(this.inputEl!, "aria-expanded", "true");

        // Set view to selected date or today
        if (this.selectedDate)
        {
            this.viewDate = cloneDate(this.selectedDate);
            this.focusedDate = cloneDate(this.selectedDate);
        }
        else
        {
            this.viewDate = startOfDay(new Date());
            this.focusedDate = startOfDay(new Date());
        }

        this.viewMode = "day";
        this.renderView();
        this.positionCalendar();

        // Focus the selected/today cell
        requestAnimationFrame(() =>
        {
            this.focusCurrentCell();
        });

        this.options.onOpen?.();
        console.debug(`${LOG_PREFIX} Calendar opened`);
    }

    private hideCalendar(): void
    {
        if (!this.isOpen || !this.calendarEl)
        {
            return;
        }
        this.isOpen = false;
        this.calendarEl.style.display = "none";
        this.calendarEl.classList.remove("datepicker-calendar-above");
        setAttr(this.inputEl!, "aria-expanded", "false");
        this.options.onClose?.();
        console.debug(`${LOG_PREFIX} Calendar closed`);
    }

    private positionCalendar(): void
    {
        if (!this.calendarEl || !this.wrapperEl)
        {
            return;
        }
        const rect = this.wrapperEl.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const calHeight = this.calendarEl.offsetHeight || 300;

        if (spaceBelow < calHeight && rect.top > calHeight)
        {
            this.calendarEl.classList.add(
                "datepicker-calendar-above"
            );
        }
        else
        {
            this.calendarEl.classList.remove(
                "datepicker-calendar-above"
            );
        }
    }

    // ========================================================================
    // PRIVATE — SELECTION & NAVIGATION
    // ========================================================================

    private selectDate(date: Date): void
    {
        if (this.isDateDisabledCheck(date))
        {
            return;
        }
        this.selectedDate = startOfDay(date);
        this.previousValue = cloneDate(this.selectedDate);
        this.updateInput();
        this.hideCalendar();
        this.inputEl?.focus();
        this.options.onSelect?.(cloneDate(this.selectedDate));
        this.options.onChange?.(cloneDate(this.selectedDate));
        console.debug(`${LOG_PREFIX} Date selected:`, date);
    }

    private navigateMonth(delta: number): void
    {
        this.viewDate.setMonth(this.viewDate.getMonth() + delta);
        this.focusedDate = new Date(
            this.viewDate.getFullYear(),
            this.viewDate.getMonth(),
            Math.min(
                this.focusedDate.getDate(),
                daysInMonth(
                    this.viewDate.getFullYear(),
                    this.viewDate.getMonth()
                )
            )
        );
        this.renderView();
    }

    private moveFocusDay(deltaDays: number): void
    {
        const newDate = new Date(
            this.focusedDate.getFullYear(),
            this.focusedDate.getMonth(),
            this.focusedDate.getDate() + deltaDays
        );
        this.focusedDate = newDate;

        // If moved to different month, update view
        if (
            newDate.getMonth() !== this.viewDate.getMonth()
            || newDate.getFullYear() !== this.viewDate.getFullYear()
        )
        {
            this.viewDate = new Date(
                newDate.getFullYear(), newDate.getMonth(), 1
            );
        }
        this.renderView();
        requestAnimationFrame(() => this.focusCurrentCell());
    }

    private focusCurrentCell(): void
    {
        if (!this.gridEl)
        {
            return;
        }
        const focusable = this.gridEl.querySelector(
            '[tabindex="0"]'
        ) as HTMLElement;
        focusable?.focus();
    }

    // ========================================================================
    // PRIVATE — VALIDATION
    // ========================================================================

    private isDateDisabledCheck(date: Date): boolean
    {
        if (this.options.minDate)
        {
            if (date < startOfDay(this.options.minDate))
            {
                return true;
            }
        }
        if (this.options.maxDate)
        {
            if (date > startOfDay(this.options.maxDate))
            {
                return true;
            }
        }
        if (this.options.disabledDates)
        {
            if (isDateInArray(date, this.options.disabledDates))
            {
                return true;
            }
        }
        if (this.options.isDateDisabled)
        {
            if (this.options.isDateDisabled(date))
            {
                return true;
            }
        }
        return false;
    }

    private clampSelected(): void
    {
        if (!this.selectedDate)
        {
            return;
        }
        if (
            this.options.minDate
            && this.selectedDate < startOfDay(this.options.minDate)
        )
        {
            console.warn(
                `${LOG_PREFIX} Value before minDate; clamped.`
            );
            this.selectedDate = startOfDay(this.options.minDate);
        }
        if (
            this.options.maxDate
            && this.selectedDate > startOfDay(this.options.maxDate)
        )
        {
            console.warn(
                `${LOG_PREFIX} Value after maxDate; clamped.`
            );
            this.selectedDate = startOfDay(this.options.maxDate);
        }
    }

    // ========================================================================
    // PRIVATE — INPUT
    // ========================================================================

    private updateInput(): void
    {
        if (!this.inputEl)
        {
            return;
        }
        if (this.selectedDate)
        {
            this.inputEl.value = formatDate(
                this.selectedDate,
                this.options.format!,
                this.options.locale!
            );
        }
        else
        {
            this.inputEl.value = "";
        }
    }

    private updateHeaderLabel(): void
    {
        if (!this.headerLabelEl)
        {
            return;
        }
        const m = this.monthNamesLong[this.viewDate.getMonth()];
        const y = this.viewDate.getFullYear();
        this.headerLabelEl.textContent = `${m} ${y}`;
    }

    private onInputBlur(): void
    {
        if (!this.inputEl || this.isOpen)
        {
            return;
        }
        const text = this.inputEl.value.trim();
        if (text === "")
        {
            this.selectedDate = null;
            this.options.onChange?.(null);
            return;
        }

        const parsed = parseDate(text, this.options.format!);
        if (parsed && !this.isDateDisabledCheck(parsed))
        {
            this.selectedDate = parsed;
            this.previousValue = cloneDate(parsed);
            this.viewDate = cloneDate(parsed);
            this.focusedDate = cloneDate(parsed);
            this.updateInput();
            this.options.onChange?.(cloneDate(parsed));
        }
        else
        {
            console.warn(
                `${LOG_PREFIX} Invalid date input: "${text}"; reverting.`
            );
            if (this.previousValue)
            {
                this.selectedDate = cloneDate(this.previousValue);
            }
            this.updateInput();
        }
    }

    // ========================================================================
    // PRIVATE — HELP TOOLTIP
    // ========================================================================

    private toggleHelpTooltip(): void
    {
        if (!this.helpTooltipEl)
        {
            return;
        }
        const visible =
            this.helpTooltipEl.classList.contains(
                "datepicker-help-tooltip-visible"
            );
        if (visible)
        {
            this.hideHelpTooltip();
        }
        else
        {
            this.showHelpTooltip();
        }
    }

    private showHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.add(
            "datepicker-help-tooltip-visible"
        );
    }

    private hideHelpTooltip(): void
    {
        this.helpTooltipEl?.classList.remove(
            "datepicker-help-tooltip-visible"
        );
    }

    // ========================================================================
    // PRIVATE — EVENT HANDLERS
    // ========================================================================

    private onDocumentClick(e: MouseEvent): void
    {
        if (!this.isOpen || !this.wrapperEl)
        {
            return;
        }
        // If the target was removed from the DOM during a re-render
        // (e.g., clicking the header label rebuilds the calendar),
        // it is no longer contained by anything — ignore this click.
        if (!document.contains(e.target as Node))
        {
            return;
        }
        if (!this.wrapperEl.contains(e.target as Node))
        {
            this.hideCalendar();
        }
    }

    private onInputKeydown(e: KeyboardEvent): void
    {
        if (this.options.disabled)
        {
            return;
        }

        switch (e.key)
        {
            case "ArrowDown":
            case "Down":
                e.preventDefault();
                this.showCalendar();
                break;
            case "Enter":
                e.preventDefault();
                this.onInputBlur();
                break;
            case "Escape":
                if (this.isOpen)
                {
                    e.preventDefault();
                    this.hideCalendar();
                }
                break;
        }
    }

    private onCalendarKeydown(e: KeyboardEvent): void
    {
        if (this.viewMode === "day")
        {
            this.onDayViewKeydown(e);
        }
        else if (this.viewMode === "month")
        {
            this.onMonthViewKeydown(e);
        }
        else if (this.viewMode === "year")
        {
            this.onYearViewKeydown(e);
        }
    }

    private onDayViewKeydown(e: KeyboardEvent): void
    {
        switch (e.key)
        {
            case "ArrowLeft":
                e.preventDefault();
                this.moveFocusDay(-1);
                break;
            case "ArrowRight":
                e.preventDefault();
                this.moveFocusDay(1);
                break;
            case "ArrowUp":
                e.preventDefault();
                this.moveFocusDay(-7);
                break;
            case "ArrowDown":
                e.preventDefault();
                this.moveFocusDay(7);
                break;
            case "Home":
                e.preventDefault();
                this.moveFocusDayToWeekStart();
                break;
            case "End":
                e.preventDefault();
                this.moveFocusDayToWeekEnd();
                break;
            case "PageUp":
                e.preventDefault();
                if (e.shiftKey)
                {
                    this.moveFocusYear(-1);
                }
                else
                {
                    this.moveFocusMonth(-1);
                }
                break;
            case "PageDown":
                e.preventDefault();
                if (e.shiftKey)
                {
                    this.moveFocusYear(1);
                }
                else
                {
                    this.moveFocusMonth(1);
                }
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                this.selectDate(this.focusedDate);
                break;
            case "Escape":
                e.preventDefault();
                this.hideCalendar();
                this.inputEl?.focus();
                break;
            case "t":
            case "T":
                e.preventDefault();
                this.goToToday();
                break;
        }
    }

    private onMonthViewKeydown(e: KeyboardEvent): void
    {
        const current = this.viewDate.getMonth();
        switch (e.key)
        {
            case "ArrowLeft":
                e.preventDefault();
                this.viewDate.setMonth(
                    (current - 1 + 12) % 12
                );
                this.renderView();
                break;
            case "ArrowRight":
                e.preventDefault();
                this.viewDate.setMonth((current + 1) % 12);
                this.renderView();
                break;
            case "ArrowUp":
                e.preventDefault();
                this.viewDate.setMonth(
                    (current - 4 + 12) % 12
                );
                this.renderView();
                break;
            case "ArrowDown":
                e.preventDefault();
                this.viewDate.setMonth((current + 4) % 12);
                this.renderView();
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                this.viewMode = "day";
                this.renderView();
                break;
            case "Escape":
                e.preventDefault();
                this.viewMode = "day";
                this.renderView();
                break;
        }
    }

    private onYearViewKeydown(e: KeyboardEvent): void
    {
        const current = this.viewDate.getFullYear();
        switch (e.key)
        {
            case "ArrowLeft":
                e.preventDefault();
                this.viewDate.setFullYear(current - 1);
                this.renderView();
                break;
            case "ArrowRight":
                e.preventDefault();
                this.viewDate.setFullYear(current + 1);
                this.renderView();
                break;
            case "ArrowUp":
                e.preventDefault();
                this.viewDate.setFullYear(current - 4);
                this.renderView();
                break;
            case "ArrowDown":
                e.preventDefault();
                this.viewDate.setFullYear(current + 4);
                this.renderView();
                break;
            case "PageUp":
                e.preventDefault();
                this.viewDate.setFullYear(
                    current - YEARS_IN_GRID
                );
                this.renderView();
                break;
            case "PageDown":
                e.preventDefault();
                this.viewDate.setFullYear(
                    current + YEARS_IN_GRID
                );
                this.renderView();
                break;
            case "Enter":
            case " ":
                e.preventDefault();
                this.viewMode = "month";
                this.renderView();
                break;
            case "Escape":
                e.preventDefault();
                this.viewMode = "month";
                this.renderView();
                break;
        }
    }

    // ========================================================================
    // PRIVATE — NAVIGATION HELPERS
    // ========================================================================

    private moveFocusDayToWeekStart(): void
    {
        const dayIdx = adjustedDayIndex(
            this.focusedDate, this.options.firstDayOfWeek!
        );
        this.moveFocusDay(-dayIdx);
    }

    private moveFocusDayToWeekEnd(): void
    {
        const dayIdx = adjustedDayIndex(
            this.focusedDate, this.options.firstDayOfWeek!
        );
        this.moveFocusDay(6 - dayIdx);
    }

    private moveFocusMonth(delta: number): void
    {
        const newDate = new Date(
            this.focusedDate.getFullYear(),
            this.focusedDate.getMonth() + delta,
            this.focusedDate.getDate()
        );
        // Clamp day if overflowed (e.g., Jan 31 + 1 month)
        const maxDay = daysInMonth(
            newDate.getFullYear(), newDate.getMonth()
        );
        if (this.focusedDate.getDate() > maxDay)
        {
            newDate.setDate(maxDay);
        }
        this.focusedDate = newDate;
        this.viewDate = new Date(
            newDate.getFullYear(), newDate.getMonth(), 1
        );
        this.renderView();
        requestAnimationFrame(() => this.focusCurrentCell());
    }

    private moveFocusYear(delta: number): void
    {
        this.focusedDate.setFullYear(
            this.focusedDate.getFullYear() + delta
        );
        const maxDay = daysInMonth(
            this.focusedDate.getFullYear(),
            this.focusedDate.getMonth()
        );
        if (this.focusedDate.getDate() > maxDay)
        {
            this.focusedDate.setDate(maxDay);
        }
        this.viewDate = new Date(
            this.focusedDate.getFullYear(),
            this.focusedDate.getMonth(),
            1
        );
        this.renderView();
        requestAnimationFrame(() => this.focusCurrentCell());
    }

    private goToToday(): void
    {
        const today = startOfDay(new Date());
        if (this.isDateDisabledCheck(today))
        {
            return;
        }
        this.focusedDate = today;
        this.viewDate = cloneDate(today);
        this.renderView();
        requestAnimationFrame(() => this.focusCurrentCell());
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * Creates a DatePicker in a single call.
 */
export function createDatePicker(
    containerId: string,
    options?: DatePickerOptions
): DatePicker
{
    return new DatePicker(containerId, options);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as any)["DatePicker"] = DatePicker;
    (window as any)["createDatePicker"] = createDatePicker;
}
