/*
 * ⚓ COMPONENT: FormDialog
 * 📜 PURPOSE: Modal dialog for form-based workflows with single-page and wizard
 *    modes, 12 field types, collapsible sections, resizable panel, validation,
 *    focus trapping, loading state, dirty tracking, and step transitions.
 * 🔗 RELATES: [[EnterpriseTheme]], [[ConfirmDialog]], [[SplitLayout]], [[CardLayout]]
 */

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================

export type FormFieldType =
    | "text" | "email" | "password" | "number"
    | "select" | "textarea" | "readonly" | "hidden"
    | "checkbox" | "toggle" | "date" | "custom";

export interface FormFieldDef
{
    name: string;
    label: string;
    type: FormFieldType;
    placeholder?: string;
    required?: boolean;
    value?: string;
    checked?: boolean;
    options?: { value: string; label: string }[];
    helpText?: string;
    rows?: number;
    disabled?: boolean;
    autocomplete?: string;
    width?: "full" | "half" | "third";
    section?: string;
    customElement?: HTMLElement;
    validate?: (value: string) => string | null;
}

export interface FormSection
{
    id: string;
    label: string;
    collapsed?: boolean;
    icon?: string;
}

export interface FormStep
{
    id: string;
    label: string;
    description?: string;
    icon?: string;
    fields: FormFieldDef[];
    sections?: FormSection[];
    validate?: (values: Record<string, string>) => string | null;
}

export interface FormDialogPanel
{
    content: HTMLElement | ((values: Record<string, string>) => HTMLElement);
    width?: number;
    minWidth?: number;
    maxWidth?: number;
    title?: string;
}

export interface FormDialogOptions
{
    title: string;
    description?: string;
    size?: "sm" | "md" | "lg" | "xl";

    fields?: FormFieldDef[];
    sections?: FormSection[];

    steps?: FormStep[];
    stepTransition?: "slide" | "fade" | "none";

    panel?: FormDialogPanel;

    submitLabel?: string;
    cancelLabel?: string;
    nextLabel?: string;
    backLabel?: string;

    onSubmit: (values: Record<string, string>) => Promise<void> | void;
    onCancel?: () => void;
    onStepChange?: (stepIndex: number, stepId: string) => void;
    onFieldChange?: (name: string, value: string) => void;

    customContent?: HTMLElement;
    autoClose?: boolean;
    closeOnBackdrop?: boolean;
    closeOnEscape?: boolean;
    warnOnDirty?: boolean;

    cssClass?: string;
    keyBindings?: Partial<Record<string, string>>;
}

export interface FormDialog
{
    show(): void;
    close(): void;
    destroy(): void;

    getValue(name: string): string;
    setValue(name: string, value: string): void;
    getValues(): Record<string, string>;
    setFieldError(name: string, message: string): void;
    clearFieldErrors(): void;

    setLoading(loading: boolean): void;
    setTitle(title: string): void;
    isDirty(): boolean;

    goToStep(index: number): void;
    nextStep(): void;
    prevStep(): void;
    getCurrentStep(): number;

    toggleSection(sectionId: string): void;
    setSectionCollapsed(sectionId: string, collapsed: boolean): void;

    updatePanel(content: HTMLElement): void;

    getElement(): HTMLElement;
    getContentElement(): HTMLElement;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[FormDialog]";
const CLS = "formdialog";
let instanceCounter = 0;

const DEFAULT_SIZE = "md";
const DEFAULT_SUBMIT_LABEL = "Submit";
const DEFAULT_CANCEL_LABEL = "Cancel";
const DEFAULT_NEXT_LABEL = "Next";
const DEFAULT_BACK_LABEL = "Back";
const DEFAULT_TEXTAREA_ROWS = 3;
const DEFAULT_PANEL_WIDTH = 300;
const DEFAULT_PANEL_MIN = 200;
const DEFAULT_PANEL_MAX = 500;
const TRANSITION_DURATION = 200;

const SIZE_MAP: Record<string, string> = {
    sm: "400px",
    md: "550px",
    lg: "750px",
    xl: "960px"
};

const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    close: "Escape",
    submit: "Enter"
};

const FOCUSABLE_SELECTOR =
    'input:not([type="hidden"]):not([disabled]):not([readonly]),'
    + "select:not([disabled]),"
    + "textarea:not([disabled]),"
    + 'button:not([disabled]):not([style*="display: none"]),'
    + '[tabindex]:not([tabindex="-1"]):not([disabled])';

// ============================================================================
// 3. DOM HELPERS
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

function addIconClasses(el: HTMLElement, iconStr: string): void
{
    const parts = iconStr.trim().split(/\s+/);
    for (const p of parts)
    {
        if (p) { el.classList.add(p); }
    }
}

function safeCallback<T extends unknown[]>(
    fn: ((...args: T) => void) | undefined, ...args: T): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "Callback error:", err); }
}

function clamp(v: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, v));
}

function prefersReducedMotion(): boolean
{
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ============================================================================
// 4. KEY BINDING HELPERS
// ============================================================================

function resolveKeyCombo(
    action: string,
    overrides?: Partial<Record<string, string>>): string
{
    return overrides?.[action] ?? DEFAULT_KEY_BINDINGS[action] ?? "";
}

function matchesKeyCombo(e: KeyboardEvent, combo: string): boolean
{
    if (!combo) { return false; }
    const parts = combo.split("+");
    const key = parts.pop()!;
    const needCtrl = parts.includes("Ctrl");
    const needShift = parts.includes("Shift");
    const needAlt = parts.includes("Alt");
    return (
        e.key === key &&
        e.ctrlKey === needCtrl &&
        e.shiftKey === needShift &&
        e.altKey === needAlt
    );
}

// ============================================================================
// 5. FORMDIALOG CLASS
// ============================================================================

class FormDialogImpl implements FormDialog
{
    private readonly id: string;
    private readonly opts: FormDialogOptions;
    private readonly isWizard: boolean;

    // DOM refs
    private overlayEl: HTMLElement | null = null;
    private backdropEl: HTMLElement | null = null;
    private dialogEl: HTMLElement | null = null;
    private titleEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private formEl: HTMLElement | null = null;
    private footerActionsEl: HTMLElement | null = null;
    private submitBtnEl: HTMLElement | null = null;
    private stepsBarEl: HTMLElement | null = null;
    private panelContentEl: HTMLElement | null = null;
    private dividerEl: HTMLElement | null = null;
    private liveRegionEl: HTMLElement | null = null;

    // State
    private mounted = false;
    private destroyed = false;
    private loading = false;
    private currentStepIndex = 0;
    private transitioning = false;
    private initialValues: Record<string, string> = {};
    private fieldMap: Map<string, HTMLElement> = new Map();
    private sectionMap: Map<string, { toggle: HTMLElement; body: HTMLElement }> = new Map();
    private previousFocusEl: HTMLElement | null = null;

    // Panel drag state
    private panelWidth = DEFAULT_PANEL_WIDTH;
    private dragStartX = 0;
    private dragStartWidth = 0;

    // Bound handlers
    private boundOnKeydown: (e: KeyboardEvent) => void;

    constructor(options: FormDialogOptions)
    {
        this.id = `${CLS}-${++instanceCounter}`;
        this.opts = options;
        this.isWizard = Array.isArray(options.steps) && options.steps.length > 0;

        if (this.isWizard && options.fields)
        {
            console.warn(LOG_PREFIX, "Both 'fields' and 'steps' provided; using wizard mode.");
        }

        if (options.panel)
        {
            this.panelWidth = options.panel.width ?? DEFAULT_PANEL_WIDTH;
        }

        this.boundOnKeydown = (e) => this.onKeydown(e);
    }

    // ====================================================================
    // LIFECYCLE
    // ====================================================================

    public show(): void
    {
        if (this.destroyed) { return; }
        if (this.mounted) { return; }

        this.previousFocusEl = document.activeElement as HTMLElement | null;
        this.buildDOM();
        document.body.appendChild(this.overlayEl!);
        this.mounted = true;

        // Snapshot initial values for dirty tracking
        this.initialValues = this.getValues();

        // Animate in
        requestAnimationFrame(() =>
        {
            this.backdropEl?.classList.add(`${CLS}-entering`);
            this.dialogEl?.classList.add(`${CLS}-entering`);
        });

        document.addEventListener("keydown", this.boundOnKeydown);
        this.focusFirstField();
    }

    public close(): void
    {
        if (!this.mounted || this.destroyed) { return; }

        if (this.opts.warnOnDirty && this.isDirty())
        {
            this.promptDirtyClose();
            return;
        }

        this.doClose();
    }

    private doClose(): void
    {
        safeCallback(this.opts.onCancel);
        this.teardown();
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.teardown();
        this.destroyed = true;
    }

    private teardown(): void
    {
        document.removeEventListener("keydown", this.boundOnKeydown);

        if (this.overlayEl && this.overlayEl.parentNode)
        {
            this.overlayEl.parentNode.removeChild(this.overlayEl);
        }

        this.mounted = false;
        this.overlayEl = null;
        this.backdropEl = null;
        this.dialogEl = null;
        this.titleEl = null;
        this.bodyEl = null;
        this.formEl = null;
        this.footerActionsEl = null;
        this.submitBtnEl = null;
        this.stepsBarEl = null;
        this.panelContentEl = null;
        this.dividerEl = null;
        this.liveRegionEl = null;
        this.fieldMap.clear();
        this.sectionMap.clear();

        if (this.previousFocusEl)
        {
            try { this.previousFocusEl.focus(); } catch (_) { /* noop */ }
            this.previousFocusEl = null;
        }
    }

    // ====================================================================
    // DOM BUILDING — OVERLAY & DIALOG
    // ====================================================================

    private buildDOM(): void
    {
        this.overlayEl = createElement("div", [`${CLS}-overlay`]);
        if (this.opts.cssClass) { this.overlayEl.classList.add(this.opts.cssClass); }

        this.backdropEl = createElement("div", [`${CLS}-backdrop`]);
        this.backdropEl.addEventListener("click", (e) => this.onBackdropClick(e));
        this.overlayEl.appendChild(this.backdropEl);

        this.dialogEl = this.buildDialog();
        this.overlayEl.appendChild(this.dialogEl);

        this.liveRegionEl = createElement("div", ["visually-hidden"]);
        setAttr(this.liveRegionEl, "aria-live", "polite");
        setAttr(this.liveRegionEl, "aria-atomic", "true");
        this.overlayEl.appendChild(this.liveRegionEl);
    }

    private buildDialog(): HTMLElement
    {
        const size = this.opts.size || DEFAULT_SIZE;
        const dialog = createElement("div", [`${CLS}-dialog`, `${CLS}-dialog-${size}`]);
        setAttr(dialog, "role", "dialog");
        setAttr(dialog, "aria-modal", "true");
        setAttr(dialog, "aria-labelledby", `${this.id}-title`);
        dialog.style.maxWidth = SIZE_MAP[size] || SIZE_MAP[DEFAULT_SIZE];

        dialog.appendChild(this.buildHeader());

        if (this.opts.description)
        {
            const desc = createElement("div", [`${CLS}-description`], this.opts.description);
            dialog.appendChild(desc);
        }

        if (this.isWizard)
        {
            this.stepsBarEl = this.buildStepIndicator();
            dialog.appendChild(this.stepsBarEl);
        }

        this.bodyEl = this.buildBody();
        dialog.appendChild(this.bodyEl);

        dialog.appendChild(this.buildFooter());

        return dialog;
    }

    // ====================================================================
    // DOM BUILDING — HEADER
    // ====================================================================

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", [`${CLS}-header`]);

        this.titleEl = createElement("h2", [`${CLS}-title`], this.opts.title);
        setAttr(this.titleEl, "id", `${this.id}-title`);
        header.appendChild(this.titleEl);

        const closeBtn = createElement("button", [`${CLS}-close`]);
        setAttr(closeBtn, "type", "button");
        setAttr(closeBtn, "aria-label", "Close");
        const closeIcon = createElement("i", []);
        addIconClasses(closeIcon, "bi bi-x-lg");
        closeBtn.appendChild(closeIcon);
        closeBtn.addEventListener("click", () => this.close());
        header.appendChild(closeBtn);

        return header;
    }

    // ====================================================================
    // DOM BUILDING — STEP INDICATOR (WIZARD)
    // ====================================================================

    private buildStepIndicator(): HTMLElement
    {
        const bar = createElement("div", [`${CLS}-steps`]);
        setAttr(bar, "role", "navigation");
        setAttr(bar, "aria-label", "Form steps");
        this.renderStepIndicator(bar);
        return bar;
    }

    private renderStepIndicator(bar: HTMLElement): void
    {
        while (bar.firstChild) { bar.removeChild(bar.firstChild); }

        const steps = this.opts.steps!;
        for (let i = 0; i < steps.length; i++)
        {
            if (i > 0)
            {
                const connector = createElement("div", [`${CLS}-step-connector`]);
                if (i <= this.currentStepIndex)
                {
                    connector.classList.add(`${CLS}-step-connector-done`);
                }
                bar.appendChild(connector);
            }

            const step = steps[i];
            const stepEl = createElement("button", [`${CLS}-step`]);
            setAttr(stepEl, "type", "button");

            if (i < this.currentStepIndex)
            {
                stepEl.classList.add(`${CLS}-step-complete`);
                stepEl.addEventListener("click", () => this.goToStep(i));
            }
            else if (i === this.currentStepIndex)
            {
                stepEl.classList.add(`${CLS}-step-active`);
                setAttr(stepEl, "aria-current", "step");
            }
            else
            {
                stepEl.classList.add(`${CLS}-step-pending`);
                stepEl.setAttribute("disabled", "");
            }

            const num = createElement("span", [`${CLS}-step-number`]);
            if (i < this.currentStepIndex)
            {
                const check = createElement("i", []);
                addIconClasses(check, "bi bi-check-lg");
                num.appendChild(check);
            }
            else
            {
                num.textContent = String(i + 1);
            }
            stepEl.appendChild(num);

            const label = createElement("span", [`${CLS}-step-label`], step.label);
            stepEl.appendChild(label);

            bar.appendChild(stepEl);
        }
    }

    // ====================================================================
    // DOM BUILDING — BODY
    // ====================================================================

    private buildBody(): HTMLElement
    {
        const body = createElement("div", [`${CLS}-body`]);
        const hasPanel = !!this.opts.panel;

        if (hasPanel)
        {
            body.classList.add(`${CLS}-body-split`);
        }

        this.formEl = createElement("div", [`${CLS}-form`]);
        this.renderFormContent();
        body.appendChild(this.formEl);

        if (hasPanel)
        {
            this.dividerEl = this.buildDivider();
            body.appendChild(this.dividerEl);

            const panel = this.buildPanel();
            body.appendChild(panel);
        }

        return body;
    }

    private renderFormContent(): void
    {
        if (!this.formEl) { return; }
        while (this.formEl.firstChild) { this.formEl.removeChild(this.formEl.firstChild); }

        if (this.isWizard)
        {
            this.renderWizardPage();
        }
        else
        {
            this.renderSinglePageFields();
        }
    }

    // ====================================================================
    // DOM BUILDING — SINGLE-PAGE FIELDS
    // ====================================================================

    private renderSinglePageFields(): void
    {
        const fields = this.opts.fields || [];
        const sections = this.opts.sections || [];

        if (sections.length > 0)
        {
            this.renderFieldsWithSections(fields, sections);
        }
        else
        {
            this.renderFieldRows(fields, this.formEl!);
        }

        if (this.opts.customContent)
        {
            const slot = createElement("div", [`${CLS}-custom`]);
            slot.appendChild(this.opts.customContent);
            this.formEl!.appendChild(slot);
        }
    }

    private renderFieldsWithSections(
        fields: FormFieldDef[], sections: FormSection[]): void
    {
        const sectionIds = new Set(sections.map(s => s.id));
        const unsectioned = fields.filter(f => !f.section || !sectionIds.has(f.section));

        // Render unsectioned fields first
        if (unsectioned.length > 0)
        {
            this.renderFieldRows(unsectioned, this.formEl!);
        }

        // Render each section
        for (const sec of sections)
        {
            const secFields = fields.filter(f => f.section === sec.id);
            if (secFields.length === 0) { continue; }

            const secEl = this.buildSection(sec, secFields);
            this.formEl!.appendChild(secEl);
        }
    }

    private buildSection(sec: FormSection, fields: FormFieldDef[]): HTMLElement
    {
        const wrapper = createElement("div", [`${CLS}-section`]);
        setAttr(wrapper, "data-section-id", sec.id);

        const collapsed = sec.collapsed === true;
        const bodyId = `${this.id}-sec-${sec.id}`;

        // Toggle button
        const toggle = createElement("button", [`${CLS}-section-toggle`]);
        setAttr(toggle, "type", "button");
        setAttr(toggle, "aria-expanded", String(!collapsed));
        setAttr(toggle, "aria-controls", bodyId);

        const chevron = createElement("i", [`${CLS}-section-chevron`]);
        addIconClasses(chevron, collapsed ? "bi bi-chevron-right" : "bi bi-chevron-down");
        toggle.appendChild(chevron);

        if (sec.icon)
        {
            const icon = createElement("i", [`${CLS}-section-icon`]);
            addIconClasses(icon, sec.icon);
            toggle.appendChild(icon);
        }

        toggle.appendChild(document.createTextNode(sec.label));
        wrapper.appendChild(toggle);

        // Section body
        const body = createElement("div", [`${CLS}-section-body`]);
        setAttr(body, "id", bodyId);
        if (collapsed) { body.style.display = "none"; }

        this.renderFieldRows(fields, body);
        wrapper.appendChild(body);

        // Store refs
        this.sectionMap.set(sec.id, { toggle, body });

        // Toggle handler
        toggle.addEventListener("click", () => this.toggleSection(sec.id));

        return wrapper;
    }

    // ====================================================================
    // DOM BUILDING — FIELD ROWS (MULTI-COLUMN LAYOUT)
    // ====================================================================

    private renderFieldRows(fields: FormFieldDef[], container: HTMLElement): void
    {
        let i = 0;
        while (i < fields.length)
        {
            const field = fields[i];
            const w = field.width || "full";

            if (w === "full" || field.type === "hidden")
            {
                container.appendChild(this.buildFieldGroup(field));
                i++;
                continue;
            }

            // Collect adjacent same-width fields for a row
            const rowFields: FormFieldDef[] = [field];
            const maxInRow = w === "half" ? 2 : 3;
            let j = i + 1;
            while (j < fields.length && rowFields.length < maxInRow)
            {
                const nw = fields[j].width || "full";
                if (nw !== w) { break; }
                rowFields.push(fields[j]);
                j++;
            }

            const row = createElement("div", [`${CLS}-row`, `${CLS}-row-${w}`]);
            for (const rf of rowFields)
            {
                row.appendChild(this.buildFieldGroup(rf));
            }
            container.appendChild(row);
            i = j;
        }
    }

    // ====================================================================
    // DOM BUILDING — INDIVIDUAL FIELD
    // ====================================================================

    private buildFieldGroup(field: FormFieldDef): HTMLElement
    {
        if (field.type === "hidden")
        {
            return this.buildHiddenField(field);
        }

        const group = createElement("div", [`${CLS}-group`]);
        setAttr(group, "data-field-name", field.name);

        // Label
        const label = this.buildLabel(field);
        group.appendChild(label);

        // Input element
        const input = this.buildInput(field);
        this.fieldMap.set(field.name, input);

        if (field.type === "checkbox" || field.type === "toggle")
        {
            const wrap = createElement("div", [`${CLS}-check-wrap`]);
            wrap.appendChild(input);
            const labelText = createElement("span", [`${CLS}-check-label`], field.label);
            wrap.appendChild(labelText);
            // Replace the block label with inline
            group.removeChild(label);
            group.appendChild(wrap);
        }
        else
        {
            group.appendChild(input);
        }

        // Help text
        if (field.helpText)
        {
            const help = createElement("span", [`${CLS}-help`], field.helpText);
            const helpId = `${this.id}-help-${field.name}`;
            setAttr(help, "id", helpId);
            group.appendChild(help);
            setAttr(input, "aria-describedby", helpId);
        }

        // Error placeholder
        const error = createElement("span", [`${CLS}-error`]);
        const errorId = `${this.id}-err-${field.name}`;
        setAttr(error, "id", errorId);
        setAttr(error, "role", "alert");
        error.style.display = "none";
        group.appendChild(error);

        return group;
    }

    private buildLabel(field: FormFieldDef): HTMLElement
    {
        const label = createElement("label", [`${CLS}-label`]);
        label.textContent = field.label;
        if (field.required)
        {
            const star = createElement("span", [`${CLS}-required`], " *");
            label.appendChild(star);
        }
        return label;
    }

    private buildInput(field: FormFieldDef): HTMLElement
    {
        switch (field.type)
        {
            case "select": return this.buildSelect(field);
            case "textarea": return this.buildTextarea(field);
            case "checkbox": return this.buildCheckbox(field);
            case "toggle": return this.buildToggle(field);
            case "custom": return this.buildCustomField(field);
            case "readonly": return this.buildReadonlyInput(field);
            case "date": return this.buildDateInput(field);
            default: return this.buildTextInput(field);
        }
    }

    private buildTextInput(field: FormFieldDef): HTMLElement
    {
        const input = document.createElement("input");
        input.classList.add(`${CLS}-input`);
        input.type = field.type === "email" ? "email"
            : field.type === "password" ? "password"
            : field.type === "number" ? "number"
            : "text";
        input.name = field.name;
        if (field.value) { input.value = field.value; }
        if (field.placeholder) { input.placeholder = field.placeholder; }
        if (field.disabled) { input.disabled = true; }
        if (field.required) { setAttr(input, "aria-required", "true"); }
        if (field.autocomplete) { input.setAttribute("autocomplete", field.autocomplete); }

        input.addEventListener("input", () => this.onFieldInput(field.name));
        return input;
    }

    private buildDateInput(field: FormFieldDef): HTMLElement
    {
        const input = document.createElement("input");
        input.classList.add(`${CLS}-input`);
        input.type = "date";
        input.name = field.name;
        if (field.value) { input.value = field.value; }
        if (field.disabled) { input.disabled = true; }
        if (field.required) { setAttr(input, "aria-required", "true"); }

        input.addEventListener("input", () => this.onFieldInput(field.name));
        return input;
    }

    private buildReadonlyInput(field: FormFieldDef): HTMLElement
    {
        const input = document.createElement("input");
        input.classList.add(`${CLS}-input`, `${CLS}-input-readonly`);
        input.type = "text";
        input.name = field.name;
        input.readOnly = true;
        if (field.value) { input.value = field.value; }

        return input;
    }

    private buildSelect(field: FormFieldDef): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add(`${CLS}-select`);
        sel.name = field.name;
        if (field.disabled) { sel.disabled = true; }
        if (field.required) { setAttr(sel, "aria-required", "true"); }

        for (const opt of (field.options || []))
        {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (field.value === opt.value) { o.selected = true; }
            sel.appendChild(o);
        }

        sel.addEventListener("change", () => this.onFieldInput(field.name));
        return sel;
    }

    private buildTextarea(field: FormFieldDef): HTMLElement
    {
        const ta = document.createElement("textarea");
        ta.classList.add(`${CLS}-textarea`);
        ta.name = field.name;
        ta.rows = field.rows ?? DEFAULT_TEXTAREA_ROWS;
        if (field.value) { ta.value = field.value; }
        if (field.placeholder) { ta.placeholder = field.placeholder; }
        if (field.disabled) { ta.disabled = true; }
        if (field.required) { setAttr(ta, "aria-required", "true"); }

        ta.addEventListener("input", () => this.onFieldInput(field.name));
        return ta;
    }

    private buildCheckbox(field: FormFieldDef): HTMLElement
    {
        const cb = document.createElement("input");
        cb.classList.add(`${CLS}-checkbox`, "form-check-input");
        cb.type = "checkbox";
        cb.name = field.name;
        cb.checked = field.checked === true;
        if (field.disabled) { cb.disabled = true; }

        cb.addEventListener("change", () => this.onFieldInput(field.name));
        return cb;
    }

    private buildToggle(field: FormFieldDef): HTMLElement
    {
        const cb = document.createElement("input");
        cb.classList.add(`${CLS}-toggle`, "form-check-input");
        cb.type = "checkbox";
        cb.name = field.name;
        cb.checked = field.checked === true;
        if (field.disabled) { cb.disabled = true; }
        setAttr(cb, "role", "switch");

        cb.addEventListener("change", () => this.onFieldInput(field.name));
        return cb;
    }

    private buildCustomField(field: FormFieldDef): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-custom-field`]);
        if (field.customElement)
        {
            wrap.appendChild(field.customElement);
        }
        return wrap;
    }

    private buildHiddenField(field: FormFieldDef): HTMLElement
    {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = field.name;
        if (field.value) { input.value = field.value; }
        this.fieldMap.set(field.name, input);
        return input;
    }

    // ====================================================================
    // DOM BUILDING — WIZARD PAGE
    // ====================================================================

    private renderWizardPage(): void
    {
        if (!this.formEl || !this.opts.steps) { return; }

        const step = this.opts.steps[this.currentStepIndex];
        if (!step) { return; }

        // Step description
        if (step.description)
        {
            const desc = createElement("div", [`${CLS}-step-description`], step.description);
            this.formEl.appendChild(desc);
        }

        // Fields with optional sections
        if (step.sections && step.sections.length > 0)
        {
            this.renderFieldsWithSections(step.fields, step.sections);
        }
        else
        {
            this.renderFieldRows(step.fields, this.formEl);
        }
    }

    // ====================================================================
    // DOM BUILDING — PANEL (RESIZABLE)
    // ====================================================================

    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);
        panel.style.width = `${this.panelWidth}px`;

        if (this.opts.panel!.title)
        {
            const header = createElement("div", [`${CLS}-panel-header`],
                this.opts.panel!.title);
            panel.appendChild(header);
        }

        this.panelContentEl = createElement("div", [`${CLS}-panel-content`]);
        this.renderPanelContent();
        panel.appendChild(this.panelContentEl);

        return panel;
    }

    private renderPanelContent(): void
    {
        if (!this.panelContentEl || !this.opts.panel) { return; }
        while (this.panelContentEl.firstChild)
        {
            this.panelContentEl.removeChild(this.panelContentEl.firstChild);
        }

        const content = this.opts.panel.content;
        if (typeof content === "function")
        {
            const el = content(this.getValues());
            this.panelContentEl.appendChild(el);
        }
        else
        {
            this.panelContentEl.appendChild(content);
        }
    }

    private buildDivider(): HTMLElement
    {
        const div = createElement("div", [`${CLS}-divider`]);
        setAttr(div, "role", "separator");
        setAttr(div, "aria-label", "Resize panel");

        div.addEventListener("pointerdown", (e) => this.onDividerDown(e));
        div.addEventListener("pointermove", (e) => this.onDividerMove(e));
        div.addEventListener("pointerup", (e) => this.onDividerUp(e));

        return div;
    }

    private onDividerDown(e: PointerEvent): void
    {
        e.preventDefault();
        this.dividerEl!.setPointerCapture(e.pointerId);
        this.dividerEl!.classList.add(`${CLS}-divider-active`);
        this.dragStartX = e.clientX;
        this.dragStartWidth = this.panelWidth;
    }

    private onDividerMove(e: PointerEvent): void
    {
        if (!this.dividerEl!.hasPointerCapture(e.pointerId)) { return; }

        const panel = this.opts.panel!;
        const minW = panel.minWidth ?? DEFAULT_PANEL_MIN;
        const maxW = panel.maxWidth ?? DEFAULT_PANEL_MAX;
        const delta = this.dragStartX - e.clientX;
        this.panelWidth = clamp(this.dragStartWidth + delta, minW, maxW);

        const panelEl = this.bodyEl?.querySelector(`.${CLS}-panel`) as HTMLElement;
        if (panelEl) { panelEl.style.width = `${this.panelWidth}px`; }
    }

    private onDividerUp(e: PointerEvent): void
    {
        this.dividerEl!.releasePointerCapture(e.pointerId);
        this.dividerEl!.classList.remove(`${CLS}-divider-active`);
    }

    // ====================================================================
    // DOM BUILDING — FOOTER
    // ====================================================================

    private buildFooter(): HTMLElement
    {
        const footer = createElement("div", [`${CLS}-footer`]);

        const left = createElement("div", [`${CLS}-footer-left`]);
        if (this.isWizard)
        {
            left.textContent = this.getStepInfoText();
        }
        footer.appendChild(left);

        this.footerActionsEl = createElement("div", [`${CLS}-actions`]);
        this.renderFooterButtons();
        footer.appendChild(this.footerActionsEl);

        return footer;
    }

    private renderFooterButtons(): void
    {
        if (!this.footerActionsEl) { return; }
        while (this.footerActionsEl.firstChild)
        {
            this.footerActionsEl.removeChild(this.footerActionsEl.firstChild);
        }

        if (this.isWizard)
        {
            this.renderWizardButtons();
        }
        else
        {
            this.renderSinglePageButtons();
        }
    }

    private renderSinglePageButtons(): void
    {
        const cancelBtn = createElement("button", [
            `${CLS}-btn-cancel`, "btn", "btn-secondary"
        ], this.opts.cancelLabel || DEFAULT_CANCEL_LABEL);
        setAttr(cancelBtn, "type", "button");
        cancelBtn.addEventListener("click", () => this.close());
        this.footerActionsEl!.appendChild(cancelBtn);

        this.submitBtnEl = this.buildSubmitButton(
            this.opts.submitLabel || DEFAULT_SUBMIT_LABEL);
        this.footerActionsEl!.appendChild(this.submitBtnEl);
    }

    private renderWizardButtons(): void
    {
        const steps = this.opts.steps!;
        const isFirst = this.currentStepIndex === 0;
        const isLast = this.currentStepIndex === steps.length - 1;

        // Cancel on first step only
        if (isFirst)
        {
            const cancelBtn = createElement("button", [
                `${CLS}-btn-cancel`, "btn", "btn-secondary"
            ], this.opts.cancelLabel || DEFAULT_CANCEL_LABEL);
            setAttr(cancelBtn, "type", "button");
            cancelBtn.addEventListener("click", () => this.close());
            this.footerActionsEl!.appendChild(cancelBtn);
        }
        else
        {
            const backBtn = createElement("button", [
                `${CLS}-btn-back`, "btn", "btn-secondary"
            ], this.opts.backLabel || DEFAULT_BACK_LABEL);
            setAttr(backBtn, "type", "button");
            backBtn.addEventListener("click", () => this.prevStep());
            this.footerActionsEl!.appendChild(backBtn);
        }

        if (isLast)
        {
            this.submitBtnEl = this.buildSubmitButton(
                this.opts.submitLabel || DEFAULT_SUBMIT_LABEL);
            this.footerActionsEl!.appendChild(this.submitBtnEl);
        }
        else
        {
            const nextBtn = createElement("button", [
                `${CLS}-btn-next`, "btn", "btn-primary"
            ], this.opts.nextLabel || DEFAULT_NEXT_LABEL);
            setAttr(nextBtn, "type", "button");
            nextBtn.addEventListener("click", () => this.nextStep());
            this.footerActionsEl!.appendChild(nextBtn);
        }
    }

    private buildSubmitButton(label: string): HTMLElement
    {
        const btn = createElement("button", [
            `${CLS}-btn-submit`, "btn", "btn-primary"
        ]);
        setAttr(btn, "type", "button");

        const spinner = createElement("span", [`${CLS}-spinner`]);
        spinner.style.display = "none";
        btn.appendChild(spinner);

        const text = createElement("span", [`${CLS}-btn-text`], label);
        btn.appendChild(text);

        btn.addEventListener("click", () => this.handleSubmit());
        return btn;
    }

    private getStepInfoText(): string
    {
        const total = this.opts.steps!.length;
        return `Step ${this.currentStepIndex + 1} of ${total}`;
    }

    // ====================================================================
    // VALIDATION
    // ====================================================================

    private validateFields(fields: FormFieldDef[]): boolean
    {
        this.clearFieldErrors();
        let firstInvalid: HTMLElement | null = null;

        for (const field of fields)
        {
            if (field.type === "hidden" || field.type === "custom") { continue; }

            const value = this.getValue(field.name);
            let error: string | null = null;

            if (field.required && !value.trim())
            {
                error = "This field is required";
            }
            else if (field.type === "email" && value.trim())
            {
                if (!value.includes("@") || !value.includes("."))
                {
                    error = "Please enter a valid email address";
                }
            }

            if (!error && field.validate)
            {
                error = field.validate(value);
            }

            if (error)
            {
                this.setFieldError(field.name, error);
                if (!firstInvalid)
                {
                    firstInvalid = this.fieldMap.get(field.name) || null;
                }
            }
        }

        if (firstInvalid)
        {
            try { firstInvalid.focus(); } catch (_) { /* noop */ }
            return false;
        }

        return true;
    }

    private validateCurrentStep(): boolean
    {
        if (!this.isWizard || !this.opts.steps) { return true; }

        const step = this.opts.steps[this.currentStepIndex];
        if (!step) { return true; }

        // Validate individual fields
        if (!this.validateFields(step.fields)) { return false; }

        // Step-level cross-field validation
        if (step.validate)
        {
            const values = this.getValues();
            const error = step.validate(values);
            if (error)
            {
                this.announce(error);
                return false;
            }
        }

        return true;
    }

    // ====================================================================
    // SUBMIT HANDLING
    // ====================================================================

    private handleSubmit(): void
    {
        if (this.loading) { return; }

        // Validate all fields (single-page) or current step fields (wizard last step)
        const fields = this.isWizard
            ? this.opts.steps![this.currentStepIndex].fields
            : (this.opts.fields || []);

        if (!this.validateFields(fields)) { return; }

        // For wizard, also run step-level validation
        if (this.isWizard)
        {
            const step = this.opts.steps![this.currentStepIndex];
            if (step.validate)
            {
                const error = step.validate(this.getValues());
                if (error)
                {
                    this.announce(error);
                    return;
                }
            }
        }

        const values = this.getValues();
        let result: Promise<void> | void;

        try
        {
            result = this.opts.onSubmit(values);
        }
        catch (err)
        {
            this.handleSubmitError(err);
            return;
        }

        if (result && typeof (result as Promise<void>).then === "function")
        {
            this.setLoading(true);
            (result as Promise<void>)
                .then(() =>
                {
                    this.setLoading(false);
                    if (this.opts.autoClose !== false)
                    {
                        this.teardown();
                    }
                })
                .catch((err) =>
                {
                    this.setLoading(false);
                    this.handleSubmitError(err);
                });
        }
        else if (this.opts.autoClose !== false)
        {
            this.teardown();
        }
    }

    private handleSubmitError(err: unknown): void
    {
        const msg = err instanceof Error ? err.message : String(err);
        const win = window as unknown as Record<string, unknown>;
        if (typeof win.showErrorToast === "function")
        {
            (win.showErrorToast as (m: string) => void)(msg);
        }
        else
        {
            console.error(LOG_PREFIX, "Submit error:", msg);
        }
    }

    // ====================================================================
    // FIELD ACCESS
    // ====================================================================

    public getValue(name: string): string
    {
        const el = this.fieldMap.get(name);
        if (!el) { return ""; }

        if (el instanceof HTMLInputElement)
        {
            if (el.type === "checkbox") { return el.checked ? "true" : "false"; }
            return el.value;
        }
        if (el instanceof HTMLSelectElement) { return el.value; }
        if (el instanceof HTMLTextAreaElement) { return el.value; }

        return "";
    }

    public setValue(name: string, value: string): void
    {
        const el = this.fieldMap.get(name);
        if (!el) { return; }

        if (el instanceof HTMLInputElement)
        {
            if (el.type === "checkbox")
            {
                el.checked = value === "true";
            }
            else
            {
                el.value = value;
            }
        }
        else if (el instanceof HTMLSelectElement)
        {
            el.value = value;
        }
        else if (el instanceof HTMLTextAreaElement)
        {
            el.value = value;
        }

        this.onFieldInput(name);
    }

    public getValues(): Record<string, string>
    {
        const values: Record<string, string> = {};
        for (const [name] of this.fieldMap)
        {
            values[name] = this.getValue(name);
        }
        return values;
    }

    public setFieldError(name: string, message: string): void
    {
        const group = this.overlayEl?.querySelector(
            `[data-field-name="${name}"]`) as HTMLElement;
        if (!group) { return; }

        const errorEl = group.querySelector(`.${CLS}-error`) as HTMLElement;
        const inputEl = this.fieldMap.get(name);

        if (message)
        {
            if (errorEl)
            {
                errorEl.textContent = message;
                errorEl.style.display = "";
            }
            if (inputEl)
            {
                setAttr(inputEl, "aria-invalid", "true");
                const errorId = errorEl?.id;
                if (errorId)
                {
                    const existing = inputEl.getAttribute("aria-describedby") || "";
                    if (!existing.includes(errorId))
                    {
                        setAttr(inputEl, "aria-describedby",
                            (existing + " " + errorId).trim());
                    }
                }
            }
            group.classList.add(`${CLS}-group-invalid`);
        }
        else
        {
            if (errorEl)
            {
                errorEl.textContent = "";
                errorEl.style.display = "none";
            }
            if (inputEl) { inputEl.removeAttribute("aria-invalid"); }
            group.classList.remove(`${CLS}-group-invalid`);
        }
    }

    public clearFieldErrors(): void
    {
        const groups = this.overlayEl?.querySelectorAll(`.${CLS}-group-invalid`);
        if (!groups) { return; }

        for (const g of Array.from(groups))
        {
            const name = (g as HTMLElement).getAttribute("data-field-name") || "";
            this.setFieldError(name, "");
        }
    }

    // ====================================================================
    // LOADING STATE
    // ====================================================================

    public setLoading(loading: boolean): void
    {
        this.loading = loading;

        // Toggle spinner
        const spinner = this.submitBtnEl?.querySelector(`.${CLS}-spinner`) as HTMLElement;
        const text = this.submitBtnEl?.querySelector(`.${CLS}-btn-text`) as HTMLElement;
        if (spinner) { spinner.style.display = loading ? "" : "none"; }
        if (text) { text.style.opacity = loading ? "0.5" : "1"; }

        // Disable/enable submit
        if (this.submitBtnEl)
        {
            if (loading) { this.submitBtnEl.setAttribute("disabled", ""); }
            else { this.submitBtnEl.removeAttribute("disabled"); }
        }

        // Disable/enable all fields
        for (const [, el] of this.fieldMap)
        {
            if (el instanceof HTMLInputElement ||
                el instanceof HTMLSelectElement ||
                el instanceof HTMLTextAreaElement)
            {
                (el as HTMLInputElement).disabled = loading;
            }
        }
    }

    // ====================================================================
    // DIRTY TRACKING
    // ====================================================================

    public isDirty(): boolean
    {
        const current = this.getValues();
        for (const key of Object.keys(this.initialValues))
        {
            if (current[key] !== this.initialValues[key]) { return true; }
        }
        return false;
    }

    private promptDirtyClose(): void
    {
        const win = window as unknown as Record<string, unknown>;
        if (typeof win.showConfirmDialog === "function")
        {
            const showConfirm = win.showConfirmDialog as (
                opts: Record<string, unknown>) => Promise<boolean>;
            showConfirm({
                title: "Unsaved Changes",
                message: "You have unsaved changes. Discard them?",
                confirmLabel: "Discard",
                variant: "warning"
            }).then((confirmed: boolean) =>
            {
                if (confirmed) { this.doClose(); }
            }).catch(() => { /* noop */ });
        }
        else
        {
            // Fallback: close without prompt
            this.doClose();
        }
    }

    // ====================================================================
    // WIZARD NAVIGATION
    // ====================================================================

    public goToStep(index: number): void
    {
        if (!this.isWizard || !this.opts.steps) { return; }
        if (index < 0 || index >= this.opts.steps.length) { return; }
        if (index === this.currentStepIndex) { return; }
        if (this.transitioning) { return; }

        // Can only jump back to completed steps or forward by one
        if (index > this.currentStepIndex)
        {
            if (!this.validateCurrentStep()) { return; }
        }

        const direction = index > this.currentStepIndex ? "forward" : "backward";
        this.transitionToStep(index, direction);
    }

    public nextStep(): void
    {
        if (!this.isWizard || !this.opts.steps) { return; }
        if (this.currentStepIndex >= this.opts.steps.length - 1) { return; }

        if (!this.validateCurrentStep()) { return; }
        this.transitionToStep(this.currentStepIndex + 1, "forward");
    }

    public prevStep(): void
    {
        if (!this.isWizard || !this.opts.steps) { return; }
        if (this.currentStepIndex <= 0) { return; }

        this.transitionToStep(this.currentStepIndex - 1, "backward");
    }

    public getCurrentStep(): number
    {
        return this.currentStepIndex;
    }

    private transitionToStep(index: number, direction: "forward" | "backward"): void
    {
        const transition = prefersReducedMotion()
            ? "none"
            : (this.opts.stepTransition || "slide");

        if (transition === "none" || !this.formEl)
        {
            this.switchStepImmediate(index);
            return;
        }

        this.switchStepAnimated(index, direction, transition);
    }

    private switchStepImmediate(index: number): void
    {
        this.currentStepIndex = index;
        this.fieldMap.clear();
        this.sectionMap.clear();
        this.renderFormContent();
        this.updateWizardUI();
        this.focusFirstField();
    }

    private switchStepAnimated(
        index: number, direction: "forward" | "backward", type: string): void
    {
        this.transitioning = true;
        const exitClass = type === "slide"
            ? (direction === "forward"
                ? `${CLS}-page-exit-left` : `${CLS}-page-exit-right`)
            : `${CLS}-page-exit-fade`;

        const enterClass = type === "slide"
            ? (direction === "forward"
                ? `${CLS}-page-enter-right` : `${CLS}-page-enter-left`)
            : `${CLS}-page-enter-fade`;

        // Exit current page
        this.formEl!.classList.add(exitClass);

        setTimeout(() =>
        {
            this.currentStepIndex = index;
            this.fieldMap.clear();
            this.sectionMap.clear();
            this.renderFormContent();
            this.formEl!.classList.remove(exitClass);
            this.formEl!.classList.add(enterClass);

            setTimeout(() =>
            {
                this.formEl!.classList.remove(enterClass);
                this.transitioning = false;
                this.focusFirstField();
            }, TRANSITION_DURATION);

            this.updateWizardUI();
        }, TRANSITION_DURATION);
    }

    private updateWizardUI(): void
    {
        // Update step indicator
        if (this.stepsBarEl)
        {
            this.renderStepIndicator(this.stepsBarEl);
        }

        // Update footer
        this.renderFooterButtons();

        // Update step info text
        const footerLeft = this.overlayEl?.querySelector(
            `.${CLS}-footer-left`) as HTMLElement;
        if (footerLeft) { footerLeft.textContent = this.getStepInfoText(); }

        // Callback
        if (this.opts.steps)
        {
            const step = this.opts.steps[this.currentStepIndex];
            safeCallback(this.opts.onStepChange, this.currentStepIndex, step.id);
        }
    }

    // ====================================================================
    // SECTIONS
    // ====================================================================

    public toggleSection(sectionId: string): void
    {
        const ref = this.sectionMap.get(sectionId);
        if (!ref) { return; }

        const isExpanded = ref.toggle.getAttribute("aria-expanded") === "true";
        this.setSectionCollapsed(sectionId, isExpanded);
    }

    public setSectionCollapsed(sectionId: string, collapsed: boolean): void
    {
        const ref = this.sectionMap.get(sectionId);
        if (!ref) { return; }

        setAttr(ref.toggle, "aria-expanded", String(!collapsed));
        ref.body.style.display = collapsed ? "none" : "";

        // Update chevron
        const chevron = ref.toggle.querySelector(`.${CLS}-section-chevron`);
        if (chevron)
        {
            chevron.className = `${CLS}-section-chevron`;
            addIconClasses(chevron as HTMLElement,
                collapsed ? "bi bi-chevron-right" : "bi bi-chevron-down");
        }
    }

    // ====================================================================
    // PANEL
    // ====================================================================

    public updatePanel(content: HTMLElement): void
    {
        if (!this.panelContentEl) { return; }
        while (this.panelContentEl.firstChild)
        {
            this.panelContentEl.removeChild(this.panelContentEl.firstChild);
        }
        this.panelContentEl.appendChild(content);
    }

    // ====================================================================
    // MISC PUBLIC METHODS
    // ====================================================================

    public setTitle(title: string): void
    {
        if (this.titleEl) { this.titleEl.textContent = title; }
    }

    public getElement(): HTMLElement
    {
        return this.overlayEl!;
    }

    public getContentElement(): HTMLElement
    {
        return this.formEl!;
    }

    // ====================================================================
    // KEYBOARD HANDLING
    // ====================================================================

    private onKeydown(e: KeyboardEvent): void
    {
        const closeCombo = resolveKeyCombo("close", this.opts.keyBindings);
        if (matchesKeyCombo(e, closeCombo))
        {
            if (this.opts.closeOnEscape !== false)
            {
                e.preventDefault();
                this.close();
            }
            return;
        }

        // Tab focus trap
        if (e.key === "Tab")
        {
            this.handleFocusTrap(e);
            return;
        }

        // Enter to submit (single-line fields)
        if (e.key === "Enter" && !e.shiftKey)
        {
            const target = e.target as HTMLElement;
            if (target instanceof HTMLTextAreaElement) { return; }
            if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement)
            {
                e.preventDefault();
                if (this.isWizard)
                {
                    const isLast = this.currentStepIndex ===
                        (this.opts.steps!.length - 1);
                    if (isLast) { this.handleSubmit(); }
                    else { this.nextStep(); }
                }
                else
                {
                    this.handleSubmit();
                }
            }
        }
    }

    private handleFocusTrap(e: KeyboardEvent): void
    {
        if (!this.dialogEl) { return; }

        const focusable = Array.from(
            this.dialogEl.querySelectorAll(FOCUSABLE_SELECTOR)
        ) as HTMLElement[];

        if (focusable.length === 0)
        {
            e.preventDefault();
            return;
        }

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
    // BACKDROP
    // ====================================================================

    private onBackdropClick(e: MouseEvent): void
    {
        if (this.opts.closeOnBackdrop === false) { return; }
        if (e.target !== this.backdropEl) { return; }
        this.close();
    }

    // ====================================================================
    // FIELD INPUT EVENTS
    // ====================================================================

    private onFieldInput(name: string): void
    {
        // Clear error on edit
        this.setFieldError(name, "");

        // Notify consumer
        const value = this.getValue(name);
        safeCallback(this.opts.onFieldChange, name, value);

        // Update reactive panel
        if (this.opts.panel && typeof this.opts.panel.content === "function")
        {
            this.renderPanelContent();
        }
    }

    // ====================================================================
    // FOCUS MANAGEMENT
    // ====================================================================

    private focusFirstField(): void
    {
        if (!this.dialogEl) { return; }

        requestAnimationFrame(() =>
        {
            const fields = this.dialogEl?.querySelectorAll(
                `.${CLS}-input:not([disabled]):not([readonly]),`
                + `.${CLS}-select:not([disabled]),`
                + `.${CLS}-textarea:not([disabled]),`
                + `.${CLS}-checkbox:not([disabled]),`
                + `.${CLS}-toggle:not([disabled])`
            );

            if (fields && fields.length > 0)
            {
                (fields[0] as HTMLElement).focus();
            }
        });
    }

    // ====================================================================
    // LIVE REGION
    // ====================================================================

    private announce(message: string): void
    {
        if (!this.liveRegionEl) { return; }
        this.liveRegionEl.textContent = "";
        requestAnimationFrame(() =>
        {
            if (this.liveRegionEl) { this.liveRegionEl.textContent = message; }
        });
    }
}

// ============================================================================
// 6. FACTORY FUNCTION
// ============================================================================

export function createFormDialog(options: FormDialogOptions): FormDialog
{
    return new FormDialogImpl(options);
}

// ============================================================================
// 7. WINDOW EXPORTS
// ============================================================================

(function register(): void
{
    const win = window as unknown as Record<string, unknown>;
    win.FormDialog = FormDialogImpl;
    win.createFormDialog = createFormDialog;
})();
