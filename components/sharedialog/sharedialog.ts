/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: ShareDialog
 * 📜 PURPOSE: Modal share dialog for enterprise SaaS — composes PeoplePicker and
 *    PersonChip for person selection and access level management. Promise-based
 *    API returns diff of added/changed/removed access. Follows FormDialog
 *    overlay pattern (z-index 2000) with ConfirmDialog simplicity.
 * 🔗 RELATES: [[EnterpriseTheme]], [[PeoplePicker]], [[PersonChip]], [[FormDialog]]
 * ⚡ FLOW: [Consumer] -> [showShareDialog()] -> [Promise<ShareDialogResult | null>]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// INTERFACES
// ============================================================================

/** Data for a single person (matches PeoplePicker PersonData). */
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

/** A configurable access level for the share dialog. */
export interface AccessLevel
{
    id: string;
    label: string;
    description?: string;
}

/** A person with their assigned access level. */
export interface SharedPerson
{
    person: PersonData;
    accessLevelId: string;
}

/** Result diff returned when the user clicks Done. */
export interface ShareDialogResult
{
    added: SharedPerson[];
    changed: SharedPerson[];
    removed: string[];
}

/** Configuration for the ShareDialog component. */
export interface ShareDialogOptions
{
    /** Dialog title text. */
    title: string;

    /** Available access levels (e.g. Viewer, Editor, Owner). */
    accessLevels: AccessLevel[];

    /** Default access level ID for new additions. Defaults to first level. */
    defaultAccessLevelId?: string;

    /** People who already have access. */
    existingAccess?: SharedPerson[];

    /** Frequent contacts to show in PeoplePicker dropdown. */
    frequentContacts?: PersonData[];

    /** Async search callback for PeoplePicker. */
    onSearch?: (query: string) => Promise<PersonData[]>;

    /** URL-based search for PeoplePicker. */
    searchUrl?: string;

    /** Callback fired when user clicks Done with changes. */
    onShare?: (result: ShareDialogResult) => void | Promise<void>;

    /** Callback fired when user cancels. */
    onCancel?: () => void;

    /** Dialog size variant. Default: "md". */
    size?: "sm" | "md" | "lg";

    /** Additional CSS class on the dialog element. */
    cssClass?: string;

    /** Close when clicking the backdrop. Default: true. */
    closeOnBackdrop?: boolean;

    /** Close when pressing Escape. Default: true. */
    closeOnEscape?: boolean;

    /** Override default key bindings. */
    keyBindings?: Record<string, string>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ShareDialog]";
const CLS = "sharedialog";
let instanceCounter = 0;

const DEFAULT_SIZE = "md";

/** Size map: dialog max-width per size variant. */
const SIZE_MAP: Record<string, string> = {
    sm: "400px",
    md: "550px",
    lg: "750px",
};

/**
 * Default keyboard bindings for dialog actions.
 * Available action names:
 * - "close": Close/cancel the dialog (default: Escape)
 */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    close: "Escape",
};

/** Deterministic palette for initials fallback — copied from PersonChip. */
const INITIALS_COLORS: string[] = [
    "#1c7ed6", "#2b8a3e", "#e67700", "#862e9c",
    "#c92a2a", "#0b7285", "#5c940d", "#d6336c",
];

/** Focusable elements selector for focus trap. */
const FOCUSABLE_SELECTOR =
    'input:not([type="hidden"]):not([disabled]),'
    + "select:not([disabled]),"
    + "textarea:not([disabled]),"
    + 'button:not([disabled]):not([style*="display: none"]),'
    + '[tabindex]:not([tabindex="-1"]):not([disabled])';

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    for (const c of classes)
    {
        if (c) { el.classList.add(c); }
    }
    if (text !== undefined) { el.textContent = text; }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

// ============================================================================
// KEY BINDING HELPERS
// ============================================================================

function resolveKeyCombo(
    action: string,
    overrides?: Record<string, string>): string
{
    return overrides?.[action] ?? DEFAULT_KEY_BINDINGS[action] ?? "";
}

function matchesKeyCombo(
    e: KeyboardEvent,
    action: string,
    overrides?: Record<string, string>): boolean
{
    const combo = resolveKeyCombo(action, overrides);
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

// ============================================================================
// INITIALS FALLBACK HELPERS
// ============================================================================

function getInitials(name: string): string
{
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) { return "?"; }
    if (parts.length === 1) { return parts[0].charAt(0).toUpperCase(); }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getInitialsColor(name: string): string
{
    let hash = 0;
    for (let i = 0; i < name.length; i++)
    {
        hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
    }
    return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length];
}

// ============================================================================
// RUNTIME BRIDGE HELPERS
// ============================================================================

/**
 * Resolve PeoplePicker factory from window global.
 * Returns null if PeoplePicker JS is not loaded.
 */
function resolvePeoplePicker(): ((containerId: string, opts?: unknown) => unknown) | null
{
    const win = window as unknown as Record<string, unknown>;
    const fn = win["createPeoplePicker"];
    return typeof fn === "function" ? fn as (id: string, opts?: unknown) => unknown : null;
}

/**
 * Resolve PersonChip factory from window global.
 * Returns null if PersonChip JS is not loaded.
 */
function resolvePersonChip(): ((opts: unknown) => { getElement(): HTMLElement; destroy(): void }) | null
{
    const win = window as unknown as Record<string, unknown>;
    const fn = win["createPersonChip"];
    if (typeof fn !== "function") { return null; }
    return fn as (opts: unknown) => { getElement(): HTMLElement; destroy(): void };
}

// ============================================================================
// SHAREDIALOG CLASS
// ============================================================================

// @entrypoint

/**
 * ShareDialog manages the lifecycle of a share modal.
 *
 * @example
 * const result = await showShareDialog({
 *     title: "Share Document",
 *     accessLevels: [
 *         { id: "viewer", label: "Viewer" },
 *         { id: "editor", label: "Editor" },
 *     ],
 *     existingAccess: [
 *         { person: { id: "1", name: "Alice" }, accessLevelId: "editor" }
 *     ],
 * });
 * if (result) { applyChanges(result); }
 */
export class ShareDialog
{
    private opts: ShareDialogOptions;
    private readonly instanceId: string;

    // DOM references
    private overlayEl: HTMLElement | null = null;
    private backdropEl: HTMLElement | null = null;
    private dialogEl: HTMLElement | null = null;
    private pickerWrapEl: HTMLElement | null = null;
    private accessSelectEl: HTMLSelectElement | null = null;
    private addBtnEl: HTMLElement | null = null;
    private accessListEl: HTMLElement | null = null;
    private statusEl: HTMLElement | null = null;
    private doneBtnEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // PeoplePicker bridge reference
    private pickerInstance: {
        getSelected(): PersonData[];
        clearSelection(): void;
        destroy(): void;
    } | null = null;

    // PersonChip instances for cleanup
    private chipInstances: Array<{ destroy(): void }> = [];

    // State
    private currentAccess: Map<string, SharedPerson> = new Map();
    private originalAccess: Map<string, string> = new Map();
    private resolvePromise: ((value: ShareDialogResult | null) => void) | null = null;
    private previousFocusEl: HTMLElement | null = null;
    private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private loading = false;
    private destroyed = false;

    constructor(options: ShareDialogOptions)
    {
        instanceCounter++;
        this.instanceId = `${CLS}-${instanceCounter}`;
        this.opts = options;
        this.initAccessMaps();
        console.debug(LOG_PREFIX, "Instance created:", this.instanceId);
    }

    // ====================================================================
    // INIT
    // ====================================================================

    /**
     * Snapshot existing access into current and original maps.
     * Original map stores person-id → access-level-id for diff computation.
     */
    private initAccessMaps(): void
    {
        const existing = this.opts.existingAccess ?? [];

        for (const sp of existing)
        {
            this.currentAccess.set(sp.person.id, {
                person: { ...sp.person },
                accessLevelId: sp.accessLevelId,
            });
            this.originalAccess.set(sp.person.id, sp.accessLevelId);
        }

        console.debug(
            LOG_PREFIX, `Initialized with ${existing.length} existing access entries.`
        );
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    /**
     * Show the dialog. Returns Promise resolving to result diff or null (cancelled).
     */
    public show(): Promise<ShareDialogResult | null>
    {
        return new Promise<ShareDialogResult | null>((resolve) =>
        {
            this.resolvePromise = resolve;
            this.previousFocusEl = document.activeElement as HTMLElement;
            this.buildDOM();
            this.mountAndAnimate();
            this.bindEvents();
            this.mountPeoplePicker();
            this.renderAccessList();
            this.updateAddButtonState();

            console.log(LOG_PREFIX, "Showing dialog:", this.opts.title);
        });
    }

    /** Close the dialog (cancel). */
    public close(): void
    {
        this.resolve(null);
    }

    /** Destroy the dialog and clean up all resources. */
    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.teardown();
        this.destroyed = true;
    }

    /** Get the root overlay element. */
    public getElement(): HTMLElement | null
    {
        return this.overlayEl;
    }

    /** Set loading state (disables interaction). */
    public setLoading(loading: boolean): void
    {
        this.loading = loading;

        if (this.dialogEl)
        {
            this.dialogEl.classList.toggle(`${CLS}-loading`, loading);
        }
    }

    // ====================================================================
    // DOM BUILDING
    // ====================================================================

    /** Construct the complete DOM tree. */
    private buildDOM(): void
    {
        this.overlayEl = createElement("div", [`${CLS}-overlay`]);
        this.backdropEl = createElement("div", [`${CLS}-backdrop`]);
        this.overlayEl.appendChild(this.backdropEl);

        this.dialogEl = this.buildDialog();
        this.overlayEl.appendChild(this.dialogEl);
    }

    /** Build the dialog container with ARIA attributes. */
    private buildDialog(): HTMLElement
    {
        const size = this.opts.size ?? DEFAULT_SIZE;
        const classes = [CLS, `${CLS}-${size}`];
        if (this.opts.cssClass) { classes.push(this.opts.cssClass); }

        const dialog = createElement("div", classes);
        setAttr(dialog, "role", "dialog");
        setAttr(dialog, "aria-modal", "true");
        setAttr(dialog, "aria-labelledby", `${this.instanceId}-title`);

        dialog.appendChild(this.buildHeader());
        dialog.appendChild(this.buildBody());
        dialog.appendChild(this.buildFooter());

        // Live region for screen reader announcements
        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "role", "status");
        dialog.appendChild(this.liveRegionEl);

        return dialog;
    }

    /** Build the header with title and close button. */
    private buildHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-header`]);

        const title = createElement("h2", [`${CLS}-title`], this.opts.title);
        setAttr(title, "id", `${this.instanceId}-title`);
        header.appendChild(title);

        const closeBtn = createElement("button", [`${CLS}-close`]);
        setAttr(closeBtn, "type", "button");
        setAttr(closeBtn, "aria-label", "Close");
        closeBtn.textContent = "\u00D7";
        header.appendChild(closeBtn);

        return header;
    }

    /** Build the body with add section and existing access section. */
    private buildBody(): HTMLElement
    {
        const body = createElement("div", [`${CLS}-body`]);
        body.appendChild(this.buildAddSection());
        body.appendChild(createElement("div", [`${CLS}-divider`]));
        body.appendChild(this.buildExistingSection());
        return body;
    }

    /** Build the add-people section: picker row + add button. */
    private buildAddSection(): HTMLElement
    {
        const section = createElement("div", [`${CLS}-add-section`]);

        const row = createElement("div", [`${CLS}-picker-row`]);
        this.pickerWrapEl = createElement("div", [`${CLS}-picker-wrap`]);
        setAttr(this.pickerWrapEl, "id", `${this.instanceId}-picker`);
        row.appendChild(this.pickerWrapEl);

        this.accessSelectEl = this.buildAccessLevelSelect(
            `${CLS}-access-select`
        );
        row.appendChild(this.accessSelectEl);
        section.appendChild(row);

        this.addBtnEl = createElement(
            "button", [`${CLS}-add-btn`, "btn", "btn-primary"], "Add"
        );
        setAttr(this.addBtnEl, "type", "button");
        setAttr(this.addBtnEl, "disabled", "true");
        section.appendChild(this.addBtnEl);

        return section;
    }

    /** Build a native <select> for access levels. */
    private buildAccessLevelSelect(extraClass: string): HTMLSelectElement
    {
        const select = document.createElement("select");
        select.classList.add("form-select", "form-select-sm", extraClass);
        const defaultId = this.opts.defaultAccessLevelId
            ?? this.opts.accessLevels[0]?.id;

        for (const level of this.opts.accessLevels)
        {
            const opt = document.createElement("option");
            opt.value = level.id;
            opt.textContent = level.label;
            if (level.id === defaultId) { opt.selected = true; }
            select.appendChild(opt);
        }

        return select;
    }

    /** Build the existing access section with scrollable list. */
    private buildExistingSection(): HTMLElement
    {
        const section = createElement("div", [`${CLS}-existing-section`]);

        const label = createElement(
            "h3", [`${CLS}-section-label`], "People with access"
        );
        section.appendChild(label);

        this.accessListEl = createElement("div", [`${CLS}-access-list`]);
        section.appendChild(this.accessListEl);

        return section;
    }

    /** Build the footer with status, cancel, and done buttons. */
    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", [`${CLS}-footer`]);

        this.statusEl = createElement("span", [`${CLS}-status`]);
        footer.appendChild(this.statusEl);

        const actions = createElement("div", [`${CLS}-actions`]);

        const cancelBtn = createElement(
            "button", [`${CLS}-cancel-btn`, "btn", "btn-secondary"], "Cancel"
        );
        setAttr(cancelBtn, "type", "button");
        actions.appendChild(cancelBtn);

        this.doneBtnEl = createElement(
            "button", [`${CLS}-done-btn`, "btn", "btn-primary"], "Done"
        );
        setAttr(this.doneBtnEl, "type", "button");
        actions.appendChild(this.doneBtnEl);

        footer.appendChild(actions);
        return footer;
    }

    // ====================================================================
    // ACCESS LIST RENDERING
    // ====================================================================

    /** Re-render the entire access list from currentAccess map. */
    private renderAccessList(): void
    {
        if (!this.accessListEl) { return; }
        this.destroyChipInstances();
        this.accessListEl.textContent = "";

        if (this.currentAccess.size === 0)
        {
            const empty = createElement(
                "div", [`${CLS}-access-empty`], "No people added yet."
            );
            this.accessListEl.appendChild(empty);
            return;
        }

        for (const [, sp] of this.currentAccess)
        {
            this.accessListEl.appendChild(this.buildAccessRow(sp));
        }

        this.updateStatusText();
    }

    /** Build a single access row: PersonChip + select + remove. */
    private buildAccessRow(sp: SharedPerson): HTMLElement
    {
        const row = createElement("div", [`${CLS}-access-row`]);
        setAttr(row, "data-person-id", sp.person.id);

        const personEl = this.buildPersonElement(sp.person);
        personEl.classList.add(`${CLS}-access-person`);
        row.appendChild(personEl);

        const select = this.buildAccessLevelSelect(`${CLS}-access-level`);
        select.value = sp.accessLevelId;
        this.bindAccessLevelChange(select, sp.person.id);
        row.appendChild(select);

        const removeBtn = createElement(
            "button", [`${CLS}-access-remove`], "\u00D7"
        );
        setAttr(removeBtn, "type", "button");
        setAttr(removeBtn, "aria-label", `Remove ${sp.person.name}`);
        this.bindRemoveButton(removeBtn, sp.person.id, sp.person.name);
        row.appendChild(removeBtn);

        return row;
    }

    /** Build a person display element using PersonChip or fallback. */
    private buildPersonElement(person: PersonData): HTMLElement
    {
        const factory = resolvePersonChip();

        if (factory)
        {
            const chip = factory({
                name: person.name,
                email: person.email,
                avatarUrl: person.avatarUrl,
                role: person.role,
                status: person.status,
                size: "md",
            });
            this.chipInstances.push(chip);
            return chip.getElement();
        }

        return this.buildFallbackPerson(person);
    }

    /** Fallback person display when PersonChip is not loaded. */
    private buildFallbackPerson(person: PersonData): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-person-fallback`]);

        const avatar = createElement("span", [`${CLS}-fallback-avatar`]);
        avatar.textContent = getInitials(person.name);
        avatar.style.backgroundColor = getInitialsColor(person.name);
        wrap.appendChild(avatar);

        const info = createElement("div", [`${CLS}-fallback-info`]);
        info.appendChild(createElement("span", [`${CLS}-fallback-name`], person.name));

        if (person.email)
        {
            info.appendChild(
                createElement("span", [`${CLS}-fallback-email`], person.email)
            );
        }

        wrap.appendChild(info);
        return wrap;
    }

    // ====================================================================
    // PEOPLE PICKER BRIDGE
    // ====================================================================

    /** Mount PeoplePicker inside the picker wrapper via runtime bridge. */
    private mountPeoplePicker(): void
    {
        const factory = resolvePeoplePicker();
        const containerId = `${this.instanceId}-picker`;

        if (!factory)
        {
            console.warn(LOG_PREFIX, "PeoplePicker not loaded — fallback.");
            this.showPickerFallback();
            return;
        }

        const pickerOpts = this.buildPickerOptions();
        const instance = factory(containerId, pickerOpts);

        this.pickerInstance = instance as {
            getSelected(): PersonData[];
            clearSelection(): void;
            destroy(): void;
        };

        console.debug(LOG_PREFIX, "PeoplePicker mounted.");
    }

    /** Build PeoplePicker configuration, filtering out already-shared people. */
    private buildPickerOptions(): Record<string, unknown>
    {
        const existingIds = new Set(this.currentAccess.keys());

        return {
            multiple: true,
            maxSelections: 0,
            frequentContacts: this.filterContacts(
                this.opts.frequentContacts, existingIds
            ),
            onSearch: this.opts.onSearch
                ? this.wrapSearchFilter(this.opts.onSearch, existingIds)
                : undefined,
            searchUrl: this.opts.searchUrl,
            placeholder: "Search people to add...",
            size: "sm",
            onChange: () => { this.updateAddButtonState(); },
        };
    }

    /** Filter frequent contacts to exclude already-shared people. */
    private filterContacts(
        contacts: PersonData[] | undefined,
        existingIds: Set<string>): PersonData[]
    {
        if (!contacts) { return []; }
        return contacts.filter(p => !existingIds.has(p.id));
    }

    /** Wrap onSearch callback to filter out already-shared people. */
    private wrapSearchFilter(
        onSearch: (q: string) => Promise<PersonData[]>,
        existingIds: Set<string>
    ): (q: string) => Promise<PersonData[]>
    {
        return async (query: string): Promise<PersonData[]> =>
        {
            const results = await onSearch(query);
            return results.filter(p => !existingIds.has(p.id));
        };
    }

    /** Show fallback message when PeoplePicker is not available. */
    private showPickerFallback(): void
    {
        if (!this.pickerWrapEl) { return; }

        const msg = createElement(
            "div",
            [`${CLS}-picker-fallback`],
            "PeoplePicker not available. Load peoplepicker.js."
        );
        this.pickerWrapEl.appendChild(msg);

        if (this.addBtnEl)
        {
            setAttr(this.addBtnEl, "disabled", "true");
        }
    }

    /** Enable/disable Add button based on PeoplePicker selection. */
    private updateAddButtonState(): void
    {
        if (!this.addBtnEl || !this.pickerInstance) { return; }

        const selected = this.pickerInstance.getSelected();

        if (selected.length > 0)
        {
            this.addBtnEl.removeAttribute("disabled");
        }
        else
        {
            setAttr(this.addBtnEl, "disabled", "true");
        }
    }

    // ====================================================================
    // EVENT BINDING
    // ====================================================================

    /** Wire up close, backdrop, keyboard, add, and footer button listeners. */
    private bindEvents(): void
    {
        this.bindCloseButton();
        this.bindBackdropClick();
        this.bindKeyboard();
        this.bindAddButton();
        this.bindFooterButtons();
        console.debug(LOG_PREFIX, "Event listeners bound.");
    }

    /** Bind the header close (x) button. */
    private bindCloseButton(): void
    {
        const closeBtn = this.dialogEl?.querySelector(`.${CLS}-close`);

        if (closeBtn)
        {
            closeBtn.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Close button clicked.");
                this.resolve(null);
            });
        }
    }

    /** Bind backdrop click to cancel when enabled. */
    private bindBackdropClick(): void
    {
        const closeOnBackdrop = this.opts.closeOnBackdrop ?? true;
        if (!closeOnBackdrop || !this.backdropEl) { return; }

        this.backdropEl.addEventListener("click", (e) =>
        {
            if (e.target === this.backdropEl)
            {
                console.debug(LOG_PREFIX, "Backdrop clicked — cancelling.");
                this.resolve(null);
            }
        });
    }

    /** Attach document-level keydown handler for Escape and focus trap. */
    private bindKeyboard(): void
    {
        this.boundKeyHandler = (e: KeyboardEvent) =>
        {
            this.handleKeydown(e);
        };
        document.addEventListener("keydown", this.boundKeyHandler);
    }

    /** Bind the Add button click handler. */
    private bindAddButton(): void
    {
        if (!this.addBtnEl) { return; }

        this.addBtnEl.addEventListener("click", () =>
        {
            this.handleAddPeople();
        });
    }

    /** Bind footer Cancel and Done buttons. */
    private bindFooterButtons(): void
    {
        const cancelBtn = this.dialogEl?.querySelector(`.${CLS}-cancel-btn`);

        if (cancelBtn)
        {
            cancelBtn.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Cancel button clicked.");
                this.resolve(null);
            });
        }

        if (this.doneBtnEl)
        {
            this.doneBtnEl.addEventListener("click", () =>
            {
                console.debug(LOG_PREFIX, "Done button clicked.");
                this.handleDone();
            });
        }
    }

    /** Bind change handler on an access-level select in a row. */
    private bindAccessLevelChange(
        select: HTMLSelectElement, personId: string): void
    {
        select.addEventListener("change", () =>
        {
            this.handleAccessLevelChange(personId, select.value);
        });
    }

    /** Bind remove button click for a specific person row. */
    private bindRemoveButton(
        btn: HTMLElement, personId: string, personName: string): void
    {
        btn.addEventListener("click", () =>
        {
            this.handleRemoveAccess(personId, personName);
        });
    }

    // ====================================================================
    // KEYBOARD HANDLING
    // ====================================================================

    /** Route keydown events to handlers. */
    private handleKeydown(e: KeyboardEvent): void
    {
        const closeOnEscape = this.opts.closeOnEscape ?? true;

        if (closeOnEscape
            && matchesKeyCombo(e, "close", this.opts.keyBindings))
        {
            e.preventDefault();
            console.debug(LOG_PREFIX, "Escape key — cancelling.");
            this.resolve(null);
            return;
        }

        if (e.key === "Tab" && this.dialogEl)
        {
            this.handleFocusTrap(e);
        }
    }

    /** Trap focus within the dialog on Tab. */
    private handleFocusTrap(e: KeyboardEvent): void
    {
        if (!this.dialogEl) { return; }

        const focusable = Array.from(
            this.dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) { return; }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement;

        if (e.shiftKey && active === first)
        {
            e.preventDefault();
            last.focus();
        }
        else if (!e.shiftKey && active === last)
        {
            e.preventDefault();
            first.focus();
        }
    }

    // ====================================================================
    // ACTION HANDLERS
    // ====================================================================

    /** Add people from PeoplePicker selection to the access list. */
    private handleAddPeople(): void
    {
        if (!this.pickerInstance || this.loading) { return; }

        const selected = this.pickerInstance.getSelected();
        if (selected.length === 0) { return; }

        const levelId = this.accessSelectEl?.value
            ?? this.opts.accessLevels[0]?.id ?? "";
        const addedCount = this.insertSelectedPeople(selected, levelId);

        this.pickerInstance.clearSelection();
        this.renderAccessList();
        this.updateAddButtonState();
        this.announceAddition(addedCount, levelId);
    }

    /** Insert selected people into currentAccess map; returns count added. */
    private insertSelectedPeople(
        selected: PersonData[], levelId: string): number
    {
        let count = 0;

        for (const person of selected)
        {
            if (this.currentAccess.has(person.id)) { continue; }

            this.currentAccess.set(person.id, {
                person: { ...person },
                accessLevelId: levelId,
            });
            count++;
        }

        return count;
    }

    /** Announce addition to screen reader and console. */
    private announceAddition(count: number, levelId: string): void
    {
        if (count === 0) { return; }

        const levelLabel = this.getAccessLevelLabel(levelId);
        const noun = count === 1 ? "person" : "people";
        this.announce(`Added ${count} ${noun} as ${levelLabel}.`);
        console.log(LOG_PREFIX, `Added ${count} people as ${levelLabel}.`);
    }

    /** Handle access level change for an existing person. */
    private handleAccessLevelChange(
        personId: string, newLevelId: string): void
    {
        const entry = this.currentAccess.get(personId);
        if (!entry) { return; }

        entry.accessLevelId = newLevelId;
        const levelLabel = this.getAccessLevelLabel(newLevelId);
        this.updateStatusText();
        this.announce(`Changed ${entry.person.name} to ${levelLabel}.`);

        console.debug(
            LOG_PREFIX, `Access level changed: ${entry.person.name} -> ${levelLabel}`
        );
    }

    /** Remove a person from the access list. */
    private handleRemoveAccess(personId: string, personName: string): void
    {
        if (this.loading) { return; }

        this.currentAccess.delete(personId);
        this.renderAccessList();
        this.announce(`Removed ${personName}.`);

        console.log(LOG_PREFIX, `Removed access for: ${personName}`);
    }

    /** Handle Done click — compute diff and resolve. */
    private async handleDone(): Promise<void>
    {
        if (this.loading) { return; }

        const result = this.computeResult();

        if (this.opts.onShare)
        {
            try
            {
                this.setLoading(true);
                await this.opts.onShare(result);
            }
            catch (err)
            {
                console.error(LOG_PREFIX, "onShare callback failed:", err);
                this.setLoading(false);
                return;
            }
        }

        this.setLoading(false);
        this.resolveWithResult(result);
    }

    // ====================================================================
    // DIFF COMPUTATION
    // ====================================================================

    /**
     * Compare current state vs original to produce the result diff.
     * Walks current map for additions/changes, original map for removals.
     */
    private computeResult(): ShareDialogResult
    {
        const { added, changed } = this.computeAddedAndChanged();
        const removed = this.computeRemoved();

        console.debug(
            LOG_PREFIX,
            `Diff: +${added.length}, ~${changed.length}, -${removed.length}`
        );

        return { added, changed, removed };
    }

    /** Find people added or whose access level changed vs original. */
    private computeAddedAndChanged(): { added: SharedPerson[]; changed: SharedPerson[] }
    {
        const added: SharedPerson[] = [];
        const changed: SharedPerson[] = [];

        for (const [id, sp] of this.currentAccess)
        {
            const originalLevel = this.originalAccess.get(id);
            const copy = { person: { ...sp.person }, accessLevelId: sp.accessLevelId };

            if (originalLevel === undefined) { added.push(copy); }
            else if (originalLevel !== sp.accessLevelId) { changed.push(copy); }
        }

        return { added, changed };
    }

    /** Find person IDs that were in original but removed from current. */
    private computeRemoved(): string[]
    {
        const removed: string[] = [];

        for (const [id] of this.originalAccess)
        {
            if (!this.currentAccess.has(id)) { removed.push(id); }
        }

        return removed;
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    /** Get the display label for an access level ID. */
    private getAccessLevelLabel(levelId: string): string
    {
        const level = this.opts.accessLevels.find(l => l.id === levelId);
        return level?.label ?? levelId;
    }

    /** Update the status text in the footer. */
    private updateStatusText(): void
    {
        if (!this.statusEl) { return; }
        const count = this.currentAccess.size;
        this.statusEl.textContent = count > 0
            ? `${count} ${count === 1 ? "person" : "people"}`
            : "";
    }

    /** Announce text to screen readers via the live region. */
    private announce(text: string): void
    {
        if (!this.liveRegionEl) { return; }
        this.liveRegionEl.textContent = "";

        requestAnimationFrame(() =>
        {
            if (this.liveRegionEl)
            {
                this.liveRegionEl.textContent = text;
            }
        });
    }

    /** Destroy all tracked PersonChip instances. */
    private destroyChipInstances(): void
    {
        for (const chip of this.chipInstances)
        {
            try { chip.destroy(); }
            catch { /* ignore — may already be removed */ }
        }
        this.chipInstances = [];
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    /** Resolve with a ShareDialogResult (Done path). */
    private resolveWithResult(result: ShareDialogResult): void
    {
        if (this.resolvePromise)
        {
            this.resolvePromise(result);
            this.resolvePromise = null;
        }

        this.teardown();
        this.restoreFocus();

        console.log(LOG_PREFIX, "Dialog resolved with result.");
    }

    /** Resolve with null (cancel path). */
    private resolve(value: null): void
    {
        if (this.resolvePromise)
        {
            this.resolvePromise(value);
            this.resolvePromise = null;
        }

        if (this.opts.onCancel)
        {
            this.opts.onCancel();
        }

        this.teardown();
        this.restoreFocus();

        console.log(LOG_PREFIX, "Dialog cancelled.");
    }

    /** Mount overlay into the document and trigger enter animation. */
    private mountAndAnimate(): void
    {
        if (!this.overlayEl || !this.backdropEl || !this.dialogEl) { return; }

        document.body.appendChild(this.overlayEl);

        // Trigger enter animation on next frame
        requestAnimationFrame(() =>
        {
            if (this.backdropEl)
            {
                this.backdropEl.classList.add(`${CLS}-entering`);
            }
            if (this.dialogEl)
            {
                this.dialogEl.classList.add(`${CLS}-entering`);
            }
        });
    }

    /** Remove DOM, detach listeners, destroy child components. */
    private teardown(): void
    {
        if (this.boundKeyHandler)
        {
            document.removeEventListener("keydown", this.boundKeyHandler);
            this.boundKeyHandler = null;
        }

        this.destroyChildComponents();
        this.removeOverlay();
        this.clearDOMRefs();

        console.debug(LOG_PREFIX, "Teardown complete:", this.instanceId);
    }

    /** Destroy PeoplePicker and PersonChip child instances. */
    private destroyChildComponents(): void
    {
        this.destroyChipInstances();

        if (this.pickerInstance)
        {
            try { this.pickerInstance.destroy(); }
            catch { /* ignore — may already be destroyed */ }
            this.pickerInstance = null;
        }
    }

    /** Remove the overlay element from the DOM. */
    private removeOverlay(): void
    {
        if (this.overlayEl)
        {
            this.overlayEl.remove();
            this.overlayEl = null;
        }
    }

    /** Clear all DOM element references to prevent leaks. */
    private clearDOMRefs(): void
    {
        this.backdropEl = null;
        this.dialogEl = null;
        this.pickerWrapEl = null;
        this.accessSelectEl = null;
        this.addBtnEl = null;
        this.accessListEl = null;
        this.statusEl = null;
        this.doneBtnEl = null;
        this.liveRegionEl = null;
    }

    /** Restore focus to the element that was active before the dialog. */
    private restoreFocus(): void
    {
        if (this.previousFocusEl
            && typeof this.previousFocusEl.focus === "function")
        {
            this.previousFocusEl.focus();
        }
        this.previousFocusEl = null;
    }
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

// @entrypoint

/**
 * Show a share dialog and return the result diff.
 * Resolves to ShareDialogResult on Done, null on Cancel.
 *
 * @example
 * const result = await showShareDialog({
 *     title: "Share Document",
 *     accessLevels: [
 *         { id: "viewer", label: "Viewer" },
 *         { id: "editor", label: "Editor" },
 *     ],
 * });
 * if (result) { console.log("Added:", result.added); }
 */
export function showShareDialog(
    options: ShareDialogOptions): Promise<ShareDialogResult | null>
{
    const dialog = new ShareDialog(options);
    return dialog.show();
}

/**
 * Create a share dialog instance for imperative control.
 * Call .show() to display; returns the instance for programmatic access.
 *
 * @example
 * const dialog = createShareDialog({ title: "Share", accessLevels: [...] });
 * const result = await dialog.show();
 */
export function createShareDialog(
    options: ShareDialogOptions): ShareDialog
{
    return new ShareDialog(options);
}

// ============================================================================
// WINDOW EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    (window as unknown as Record<string, unknown>)["ShareDialog"] = ShareDialog;
    (window as unknown as Record<string, unknown>)["showShareDialog"] = showShareDialog;
    (window as unknown as Record<string, unknown>)["createShareDialog"] = createShareDialog;
}
