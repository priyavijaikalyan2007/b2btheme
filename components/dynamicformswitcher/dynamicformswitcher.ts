/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * Repository: theme/components
 * File GUID: 8c1e3a2f-2c6e-4d1b-9c08-0d9b3a2f5a11
 * Created: 2026-05-13
 *
 * ⚓ COMPONENT: DynamicFormSwitcher
 * 📜 PURPOSE: A reusable container that holds N pre-defined form "variants"
 *    and shows exactly one at a time, retaining per-variant values across
 *    switches. Designed to be embedded as a `custom` field inside FormDialog,
 *    or used standalone with a built-in selector. Beyond built-in field types
 *    (text/url/select/…), any value-bearing CDN component conforming to the
 *    Form-field-capable Components Convention (AGENTS.md, ADR-134) is usable
 *    via `type: "<kebab-name>"` — DynamicFormSwitcher auto-discovers
 *    `window.create<PascalCase>` and adapts the returned handle. Non-conforming
 *    components are wired via `registerDynamicFormFieldProvider()`. One-off
 *    composite UIs use `type: "custom"` + `mount(host) => Adapter`.
 * 🔗 RELATES: [[FormDialog]], [[CodeEditor]], [[RichTextInput]], [[ColorPicker]],
 *    [[FieldCapableComponentsConvention]], [[ADR-132]], [[ADR-133]], [[ADR-134]]
 * ⚡ FLOW: [Consumer] -> [createDynamicFormSwitcher(host, opts)] -> [render() ->
 *    buildFieldGroup -> buildInput -> (built-in renderer | buildComponentField ->
 *    resolveFieldAdapter -> {mount | registry | tryAutoDiscover}) -> adapterMap] ->
 *    [getValues/getAllValues/setValues/validate/destroy through adapter protocol]
 *
 * SEE: specs/dynamicformswitcher.req.md, specs/dynamicformswitcher.md
 */

// ============================================================================
// 1. PUBLIC TYPES
// ============================================================================

/**
 * Built-in field types. Any other string is treated as a "component type"
 * and resolved at render time via the field-provider registry, or by
 * auto-discovery on `window.create<PascalCase>` — see the
 * "Form-field-capable Components Convention" in AGENTS.md.
 */
export type DynamicFormBuiltinFieldType =
    | "text" | "email" | "password" | "url" | "number" | "textarea"
    | "select" | "multiselect" | "radio" | "checkbox" | "toggle"
    | "date" | "datetime" | "time" | "file" | "color"
    | "code" | "richtext" | "custom";

export type DynamicFormFieldType = DynamicFormBuiltinFieldType | string;

/**
 * Contract returned by a `mount`-style custom field or a field-provider
 * factory. The component takes ownership of the host element and exposes
 * the four-method protocol that DynamicFormSwitcher drives.
 */
export interface DynamicFormFieldAdapter
{
    /** Current value of the field. Caller decides the shape. */
    getValue(): unknown;
    /** Apply a value programmatically. May be a no-op for read-only fields. */
    setValue?(value: unknown): void;
    /** Return null if valid, or a human-readable error string. */
    validate?(): string | null;
    /** Tear down event listeners and remove DOM. Called on switch / destroy. */
    destroy?(): void;
}

/**
 * Caller-supplied adapter factory for a `custom` field with `mount`.
 */
export type DynamicFormFieldMount =
    (host: HTMLElement, fieldName: string) => DynamicFormFieldAdapter;

/**
 * Registry factory signature. Given the host element and the field def,
 * the provider builds the component and returns an adapter.
 */
export type DynamicFormFieldProvider =
    (host: HTMLElement, field: DynamicFormField) => DynamicFormFieldAdapter;

export interface DynamicFormFieldOption
{
    value: string;
    label: string;
}

export interface DynamicFormField
{
    name: string;
    label: string;
    type: DynamicFormFieldType;
    placeholder?: string;
    required?: boolean;
    value?: unknown;
    options?: DynamicFormFieldOption[];
    helpText?: string;
    rows?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    autocomplete?: string;
    width?: "full" | "half" | "third";
    customElement?: HTMLElement;
    /**
     * Adapter factory for `type: "custom"` (or any registry-driven type).
     * Preferred over `customElement` because the returned adapter carries
     * `getValue` / `setValue` / `validate` / `destroy` — so the field
     * participates fully in `getValues()`, state retention across variant
     * switches, and lifecycle teardown.
     */
    mount?: DynamicFormFieldMount;
    /**
     * Options forwarded verbatim to an auto-discovered factory or to the
     * registered field provider (e.g. `{ showSeconds: true }` for
     * CronPicker). DynamicFormSwitcher merges `value` (from state) and
     * `onChange` (its own input hook) onto this object before calling
     * the factory — callers should not provide those themselves.
     */
    componentOptions?: Record<string, unknown>;
    validate?: (value: unknown) => string | null;
}

export interface DynamicFormVariant
{
    label: string;
    description?: string;
    icon?: string;
    fields: DynamicFormField[];
}

export interface DynamicFormSwitcherOptions
{
    variants: Record<string, DynamicFormVariant>;
    initialVariant: string;

    showSelector?: boolean;
    selectorLabel?: string;
    selectorStyle?: "dropdown" | "segmented" | "tabs";
    selectorHelpText?: string;

    value?: Record<string, unknown> | Record<string, Record<string, unknown>>;
    retainStateAcrossSwitches?: boolean;

    onChange?: (variantId: string, values: Record<string, unknown>) => void;
    onVariantChange?: (newVariantId: string, previousVariantId: string) => void;
    onValidate?: (variantId: string, values: Record<string, unknown>) => string | null;

    size?: "sm" | "md" | "lg" | "xl" | "auto";
    className?: string;
}

export interface DynamicFormSwitcherHandle
{
    getVariant(): string;
    setVariant(id: string): void;

    getValues(): Record<string, unknown>;
    getAllValues(): Record<string, Record<string, unknown>>;
    setValues(variantId: string, values: Record<string, unknown>): void;
    clearValues(variantId?: string): void;

    validate(): boolean;
    reset(): void;
    resetAll(): void;

    refresh(): void;
    destroy(): void;
}

// ============================================================================
// 2. CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DynamicFormSwitcher]";
const CLS = "dynamicformswitcher";

const SIZE_MAX_WIDTH: Record<string, string> = {
    sm: "400px",
    md: "550px",
    lg: "750px",
    xl: "960px",
};

const DEFAULT_TEXTAREA_ROWS = 3;
const DEFAULT_SELECTOR_LABEL = "Type";

let instanceCounter = 0;

const BUILTIN_FIELD_TYPES: ReadonlySet<string> = new Set([
    "text", "email", "password", "url", "number", "textarea",
    "select", "multiselect", "radio", "checkbox", "toggle",
    "date", "datetime", "time", "file", "color",
    "code", "richtext", "custom",
]);

/**
 * Module-level field-provider registry. Overrides auto-discovery for a
 * given type name. Apps register here once at boot (e.g. for components
 * that don't fit the convention) and from then on `type: "<name>"` resolves
 * to the registered factory.
 */
const PROVIDER_REGISTRY: Map<string, DynamicFormFieldProvider> = new Map();

export function registerDynamicFormFieldProvider(
    typeName: string, factory: DynamicFormFieldProvider): void
{
    PROVIDER_REGISTRY.set(typeName, factory);
}

export function unregisterDynamicFormFieldProvider(typeName: string): void
{
    PROVIDER_REGISTRY.delete(typeName);
}

/** Lowercase hyphen/underscore-separated → PascalCase. */
function toPascalCase(input: string): string
{
    return input
        .split(/[-_\s]+/)
        .filter((s) => s.length > 0)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join("");
}

/**
 * Auto-discovery factory-name resolver. Tries, in order:
 *   1. `create${PascalCase(typeName)}` — handles kebab/snake-case input.
 *   2. `create${typeName[0].toUpperCase() + typeName.slice(1)}` — handles
 *      camelCase input.
 *   3. Scans the window object for a `create*` global whose tail
 *      lowercases to the type name — handles single-token lowercase types
 *      like `"colorpicker"` matching `createColorPicker`.
 * Returns the first match's name, or null if nothing resolves. The expected
 * factory name surfaces in literate errors so consumers see exactly which
 * convention they need to follow.
 */
function resolveFactoryName(
    win: Record<string, unknown>, typeName: string): string | null
{
    const candidates: string[] = [
        `create${toPascalCase(typeName)}`,
        `create${typeName.charAt(0).toUpperCase()}${typeName.slice(1)}`,
    ];
    for (const name of candidates)
    {
        if (typeof win[name] === "function") { return name; }
    }
    // Fallback: scan window for createXxx where xxx.toLowerCase() === typeName.
    // Only triggered when the type is one indivisible token (no separators)
    // — keeps the scan focused. Window keys are enumerable in jsdom + most
    // real browsers; the scan is O(N) over globals, which is acceptable at
    // first-render only.
    if (/[-_\s]/.test(typeName)) { return null; }
    const lc = typeName.toLowerCase();
    for (const key of Object.keys(win))
    {
        if (!key.startsWith("create")) { continue; }
        if (typeof win[key] !== "function") { continue; }
        if (key.slice("create".length).toLowerCase() === lc) { return key; }
    }
    return null;
}

// ============================================================================
// 3. LOGGING
// ============================================================================

interface LogUtility
{
    info(...a: unknown[]): void;
    warn(...a: unknown[]): void;
    error(...a: unknown[]): void;
    debug(...a: unknown[]): void;
}

function getLogger(): LogUtility | null
{
    const w = window as unknown as { createLogUtility?: () => { getLogger: (n: string) => LogUtility } };
    if (typeof w.createLogUtility !== "function")
    {
        return null;
    }
    try
    {
        return w.createLogUtility().getLogger("DynamicFormSwitcher");
    }
    catch (_e)
    {
        return null;
    }
}

const _logger = getLogger();

function logInfo(...a: unknown[]): void
{
    if (_logger) { _logger.info(...a); return; }
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}

function logWarn(...a: unknown[]): void
{
    if (_logger) { _logger.warn(...a); return; }
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}

function logError(...a: unknown[]): void
{
    if (_logger) { _logger.error(...a); return; }
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}

// ============================================================================
// 4. DOM HELPERS
// ============================================================================

function createElement(
    tag: string, classes: string[], text?: string): HTMLElement
{
    const el = document.createElement(tag);
    for (const c of classes)
    {
        if (c) { el.classList.add(c); }
    }
    if (text !== undefined)
    {
        el.textContent = text;
    }
    return el;
}

function setAttr(el: Element, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function clearChildren(el: HTMLElement): void
{
    while (el.firstChild) { el.removeChild(el.firstChild); }
}

function resolveContainer(target: string | HTMLElement): HTMLElement
{
    if (typeof target === "string")
    {
        const el = document.getElementById(target);
        if (!el)
        {
            throw new Error(`${LOG_PREFIX} container '${target}' not found`);
        }
        return el;
    }
    return target;
}

// ============================================================================
// 5. VALUE TYPE — internal alias
// ============================================================================

type Values = Record<string, unknown>;

// ============================================================================
// 6. IMPLEMENTATION
// ============================================================================

class DynamicFormSwitcherImpl implements DynamicFormSwitcherHandle
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly opts: DynamicFormSwitcherOptions;
    private readonly retain: boolean;

    private rootEl: HTMLElement | null = null;
    private selectorEl: HTMLElement | null = null;
    private bodyEl: HTMLElement | null = null;
    private descriptionEl: HTMLElement | null = null;
    private fieldsEl: HTMLElement | null = null;

    private currentVariant: string;
    private destroyed: boolean = false;

    /** Per-variant value store. */
    private readonly store: Map<string, Values> = new Map();
    /** Field-name → input element, scoped to currently active variant. */
    private fieldMap: Map<string, HTMLElement> = new Map();
    /**
     * Field-name → adapter, scoped to currently active variant. Adapters
     * are returned by `mount` callbacks, registry providers, or the
     * auto-discovery path. Their `destroy()` is called on variant switch
     * and on DynamicFormSwitcher.destroy() so the embedded components
     * release listeners cleanly.
     */
    private adapterMap: Map<string, DynamicFormFieldAdapter> = new Map();

    constructor(target: string | HTMLElement, options: DynamicFormSwitcherOptions)
    {
        this.id = `${CLS}-${++instanceCounter}`;
        this.container = resolveContainer(target);
        this.opts = options;
        this.retain = options.retainStateAcrossSwitches !== false;

        this.validateOptionsAtConstruction();
        this.currentVariant = options.initialVariant;
        this.seedFromValueOption();
        this.build();
        this.render();
        logInfo("created", this.id, "variants=", Object.keys(options.variants).length);
    }

    // ------------------------------------------------------------------
    // Construction-time validation + value seeding
    // ------------------------------------------------------------------

    private validateOptionsAtConstruction(): void
    {
        const vs = this.opts.variants;
        if (!vs || typeof vs !== "object")
        {
            throw new Error(`${LOG_PREFIX} 'variants' is required`);
        }
        if (!Object.prototype.hasOwnProperty.call(vs, this.opts.initialVariant))
        {
            throw new Error(
                `${LOG_PREFIX} initialVariant '${this.opts.initialVariant}' `
                + `is not a key of variants`);
        }
    }

    private seedFromValueOption(): void
    {
        const seed = this.opts.value;
        if (!seed || typeof seed !== "object") { return; }

        if (this.looksNested(seed as Record<string, unknown>))
        {
            this.seedNested(seed as Record<string, Record<string, unknown>>);
            return;
        }
        this.seedFlat(seed as Values);
    }

    private looksNested(seed: Record<string, unknown>): boolean
    {
        for (const key of Object.keys(seed))
        {
            if (Object.prototype.hasOwnProperty.call(this.opts.variants, key))
            {
                const v = seed[key];
                if (v && typeof v === "object" && !Array.isArray(v))
                {
                    return true;
                }
            }
        }
        return false;
    }

    private seedNested(seed: Record<string, Record<string, unknown>>): void
    {
        for (const [variantId, values] of Object.entries(seed))
        {
            if (!Object.prototype.hasOwnProperty.call(this.opts.variants, variantId))
            {
                logWarn("seed ignored — unknown variant:", variantId);
                continue;
            }
            this.store.set(variantId, { ...values });
        }
    }

    private seedFlat(seed: Values): void
    {
        this.store.set(this.currentVariant, { ...seed });
    }

    // ------------------------------------------------------------------
    // Build DOM scaffold (selector + body shell, not the variant fields)
    // ------------------------------------------------------------------

    private build(): void
    {
        const root = createElement("div", [CLS]);
        if (this.opts.className) { root.classList.add(this.opts.className); }
        const size = this.opts.size ?? "auto";
        root.classList.add(`${CLS}-size-${size}`);
        if (size !== "auto" && SIZE_MAX_WIDTH[size])
        {
            root.style.maxWidth = SIZE_MAX_WIDTH[size];
        }
        setAttr(root, "role", "region");
        setAttr(root, "aria-live", "polite");
        this.updateRegionLabel(root);

        if (this.opts.showSelector === true)
        {
            this.selectorEl = this.buildSelector();
            root.appendChild(this.selectorEl);
            root.appendChild(createElement("hr", [`${CLS}-separator`]));
        }

        this.bodyEl = createElement("div", [`${CLS}-body`]);
        root.appendChild(this.bodyEl);
        this.container.appendChild(root);
        this.rootEl = root;
    }

    private updateRegionLabel(root: HTMLElement): void
    {
        const v = this.opts.variants[this.currentVariant];
        if (v)
        {
            setAttr(root, "aria-label", `${v.label} configuration`);
        }
    }

    // ------------------------------------------------------------------
    // Selector rendering — three styles
    // ------------------------------------------------------------------

    private buildSelector(): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-selector`]);
        const label = createElement("label", [`${CLS}-selector-label`]);
        label.textContent = this.opts.selectorLabel ?? DEFAULT_SELECTOR_LABEL;
        wrap.appendChild(label);

        const style = this.opts.selectorStyle ?? "dropdown";
        if (style === "dropdown")
        {
            wrap.appendChild(this.buildDropdownSelector());
        }
        else
        {
            wrap.appendChild(this.buildTabbedSelector(style));
        }

        if (this.opts.selectorHelpText)
        {
            const help = createElement("span",
                [`${CLS}-selector-help`], this.opts.selectorHelpText);
            wrap.appendChild(help);
        }
        return wrap;
    }

    private buildDropdownSelector(): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add(`${CLS}-selector-dropdown`);
        for (const [id, v] of Object.entries(this.opts.variants))
        {
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = v.label;
            if (id === this.currentVariant) { opt.selected = true; }
            sel.appendChild(opt);
        }
        sel.addEventListener("change", () =>
        {
            this.setVariant(sel.value);
        });
        return sel;
    }

    private buildTabbedSelector(style: "segmented" | "tabs"): HTMLElement
    {
        const tablist = createElement("div", [`${CLS}-selector-${style}`]);
        setAttr(tablist, "role", "tablist");
        const ids = Object.keys(this.opts.variants);
        for (const id of ids)
        {
            tablist.appendChild(this.buildTab(id, style));
        }
        tablist.addEventListener("keydown", (e: Event) =>
        {
            this.handleSelectorKeydown(e as KeyboardEvent, ids);
        });
        return tablist;
    }

    private buildTab(id: string, style: "segmented" | "tabs"): HTMLElement
    {
        const v = this.opts.variants[id];
        const segCls = style === "segmented" ? "segment" : "tab";
        const tab = createElement("button", [`${CLS}-${segCls}`]);
        (tab as HTMLButtonElement).type = "button";
        setAttr(tab, "role", "tab");
        setAttr(tab, "aria-selected", id === this.currentVariant ? "true" : "false");
        setAttr(tab, "tabindex", id === this.currentVariant ? "0" : "-1");
        setAttr(tab, "data-variant-id", id);
        if (id === this.currentVariant) { tab.classList.add(`${CLS}-${segCls}-active`); }
        if (v.icon)
        {
            const icon = createElement("i", ["bi", v.icon, `${CLS}-${segCls}-icon`]);
            tab.appendChild(icon);
        }
        tab.appendChild(document.createTextNode(v.label));
        tab.addEventListener("click", () => this.setVariant(id));
        return tab;
    }

    private handleSelectorKeydown(e: KeyboardEvent, ids: string[]): void
    {
        const current = ids.indexOf(this.currentVariant);
        let next = -1;
        if (e.key === "ArrowRight" || e.key === "ArrowDown")
        {
            next = (current + 1) % ids.length;
        }
        else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        {
            next = (current - 1 + ids.length) % ids.length;
        }
        else if (e.key === "Home") { next = 0; }
        else if (e.key === "End") { next = ids.length - 1; }
        if (next < 0) { return; }
        e.preventDefault();
        this.setVariant(ids[next]);
        const tab = this.selectorEl?.querySelector<HTMLElement>(
            `[data-variant-id="${ids[next]}"]`);
        tab?.focus();
    }

    private refreshSelector(): void
    {
        if (!this.selectorEl) { return; }
        const dropdown = this.selectorEl.querySelector<HTMLSelectElement>(
            `.${CLS}-selector-dropdown`);
        if (dropdown) { dropdown.value = this.currentVariant; return; }
        const tabs = this.selectorEl.querySelectorAll<HTMLElement>('[role="tab"]');
        tabs.forEach((tab) =>
        {
            const id = tab.getAttribute("data-variant-id") ?? "";
            const active = id === this.currentVariant;
            setAttr(tab, "aria-selected", active ? "true" : "false");
            setAttr(tab, "tabindex", active ? "0" : "-1");
            tab.classList.toggle(`${CLS}-segment-active`,
                active && tab.classList.contains(`${CLS}-segment`));
            tab.classList.toggle(`${CLS}-tab-active`,
                active && tab.classList.contains(`${CLS}-tab`));
        });
    }

    // ------------------------------------------------------------------
    // Variant body rendering
    // ------------------------------------------------------------------

    private render(): void
    {
        if (!this.bodyEl) { return; }
        this.tearDownActiveAdapters();
        clearChildren(this.bodyEl);
        this.fieldMap = new Map();
        this.adapterMap = new Map();

        const variant = this.opts.variants[this.currentVariant];
        if (variant.description)
        {
            this.descriptionEl = createElement(
                "div", [`${CLS}-description`], variant.description);
            this.bodyEl.appendChild(this.descriptionEl);
        }

        this.fieldsEl = createElement("div", [`${CLS}-fields`]);
        this.bodyEl.appendChild(this.fieldsEl);

        for (const field of variant.fields)
        {
            this.fieldsEl.appendChild(this.buildFieldGroup(field));
        }

        this.applyStoredValuesToActive();
        if (this.rootEl) { this.updateRegionLabel(this.rootEl); }
    }

    private buildFieldGroup(field: DynamicFormField): HTMLElement
    {
        const group = createElement("div", [`${CLS}-group`]);
        setAttr(group, "data-field-name", field.name);
        if (field.width) { group.classList.add(`${CLS}-group-${field.width}`); }

        const input = this.buildInput(field);
        this.fieldMap.set(field.name, input);
        this.appendLabelAndInput(group, field, input);
        this.appendHelpText(group, field, input);
        group.appendChild(this.buildErrorPlaceholder(field.name));
        return group;
    }

    private appendLabelAndInput(
        group: HTMLElement, field: DynamicFormField, input: HTMLElement): void
    {
        const isInlineLabel = field.type === "checkbox" || field.type === "toggle";
        if (isInlineLabel)
        {
            group.appendChild(this.buildInlineCheckRow(field, input));
            return;
        }
        group.appendChild(this.buildLabel(field));
        group.appendChild(input);
    }

    private appendHelpText(
        group: HTMLElement, field: DynamicFormField, input: HTMLElement): void
    {
        if (!field.helpText) { return; }
        const help = createElement("span", [`${CLS}-help`], field.helpText);
        const helpId = `${this.id}-help-${field.name}`;
        setAttr(help, "id", helpId);
        group.appendChild(help);
        setAttr(input, "aria-describedby", helpId);
    }

    private buildErrorPlaceholder(fieldName: string): HTMLElement
    {
        const error = createElement("span", [`${CLS}-error`]);
        setAttr(error, "id", `${this.id}-err-${fieldName}`);
        setAttr(error, "role", "alert");
        (error as HTMLElement).style.display = "none";
        return error;
    }

    private buildLabel(field: DynamicFormField): HTMLElement
    {
        const label = createElement("label", [`${CLS}-label`]);
        label.textContent = field.label;
        if (field.required)
        {
            label.appendChild(createElement("span", [`${CLS}-required`], " *"));
        }
        return label;
    }

    private buildInlineCheckRow(
        field: DynamicFormField, input: HTMLElement): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-check-wrap`]);
        wrap.appendChild(input);
        const lbl = createElement("span", [`${CLS}-check-label`], field.label);
        if (field.required) { lbl.appendChild(createElement("span", [`${CLS}-required`], " *")); }
        wrap.appendChild(lbl);
        return wrap;
    }

    private buildInput(field: DynamicFormField): HTMLElement
    {
        // Non-builtin → resolve via field-provider registry or auto-discovery.
        if (!BUILTIN_FIELD_TYPES.has(field.type))
        {
            return this.buildComponentField(field);
        }
        switch (field.type)
        {
            case "textarea":   return this.buildTextarea(field);
            case "select":     return this.buildSelect(field, false);
            case "multiselect":return this.buildSelect(field, true);
            case "radio":      return this.buildRadioGroup(field);
            case "checkbox":
            case "toggle":     return this.buildCheckbox(field);
            case "file":       return this.buildFileInput(field);
            case "color":      return this.buildColorInput(field);
            case "code":       return this.buildCodeInput(field);
            case "richtext":   return this.buildRichTextInput(field);
            case "custom":     return this.buildCustomField(field);
            default:           return this.buildBasicInput(field);
        }
    }

    /**
     * Builds a field whose type is NOT a built-in. Resolution order:
     *   1. `field.mount` — caller-supplied adapter factory (most flexible).
     *   2. `PROVIDER_REGISTRY[field.type]` — app-registered provider.
     *   3. Auto-discovery: `window.create<PascalCase(field.type)>`.
     *   4. Literate error rendered in-place.
     */
    private buildComponentField(field: DynamicFormField): HTMLElement
    {
        const host = createElement("div", [`${CLS}-component-host`]);
        setAttr(host, "data-field-input", "true");
        const adapter = this.resolveFieldAdapter(field, host);
        if (adapter)
        {
            this.adapterMap.set(field.name, adapter);
            return host;
        }
        return this.renderLiterateMissingFactoryError(field, host);
    }

    private resolveFieldAdapter(
        field: DynamicFormField, host: HTMLElement): DynamicFormFieldAdapter | null
    {
        if (field.mount)
        {
            try { return field.mount(host, field.name); }
            catch (err) { logError("mount threw for field:", field.name, err); return null; }
        }
        const provider = PROVIDER_REGISTRY.get(field.type);
        if (provider)
        {
            try { return provider(host, field); }
            catch (err) { logError("provider threw for field:", field.name, err); return null; }
        }
        return this.tryAutoDiscover(field, host);
    }

    /**
     * Look for `window.create<PascalCase>` and adapt the returned handle
     * to the field-adapter protocol. Components conforming to the
     * convention (getValue/setValue/destroy + value/onChange options)
     * work zero-config; non-conformant ones need a registry override.
     */
    private tryAutoDiscover(
        field: DynamicFormField, host: HTMLElement): DynamicFormFieldAdapter | null
    {
        const win = window as unknown as Record<string, unknown>;
        const factoryName = resolveFactoryName(win, field.type);
        if (!factoryName) { return null; }
        const factory = win[factoryName];
        if (typeof factory !== "function") { return null; }

        this.ensureHostInDom(host, field.name);
        const opts = this.buildAutoDiscoverOptions(field);

        let handle: unknown;
        try
        {
            handle = (factory as (id: string, o: Record<string, unknown>) => unknown)(host.id, opts);
        }
        catch (err)
        {
            logError("auto-discovered factory threw:", factoryName, err);
            return null;
        }
        return wrapHandleAsAdapter(handle, factoryName);
    }

    /**
     * Library convention: factories take a containerId STRING, not an
     * HTMLElement. Assign a stable id so getElementById() resolves to our
     * host, and attach the host into `fieldsEl` BEFORE invoking the factory
     * (buildFieldGroup re-parents it into its label/error wrapper later).
     */
    private ensureHostInDom(host: HTMLElement, fieldName: string): void
    {
        if (!host.id)
        {
            host.id = `${this.id}-host-${fieldName}`;
        }
        if (this.fieldsEl && !host.parentElement)
        {
            this.fieldsEl.appendChild(host);
        }
    }

    private buildAutoDiscoverOptions(field: DynamicFormField): Record<string, unknown>
    {
        const stored = this.store.get(this.currentVariant);
        const initialValue = stored && Object.prototype.hasOwnProperty.call(stored, field.name)
            ? stored[field.name]
            : field.value;
        return {
            ...(field.componentOptions ?? {}),
            value: initialValue,
            onChange: () => this.onFieldInput(field.name),
        };
    }

    private renderLiterateMissingFactoryError(
        field: DynamicFormField, host: HTMLElement): HTMLElement
    {
        const factoryName = `create${toPascalCase(field.type)}`;
        host.classList.add(`${CLS}-component-missing`);
        const heading = createElement("strong", [`${CLS}-component-missing-title`],
            `Field type "${field.type}" not available`);
        const body = createElement("div", [`${CLS}-component-missing-body`]);
        body.textContent =
            `Neither a registered field provider nor a window.${factoryName} `
            + `factory was found. Either load the matching CDN script for `
            + `"${field.type}" before this form renders, or register a `
            + `provider via registerDynamicFormFieldProvider("${field.type}", factoryFn).`;
        host.appendChild(heading);
        host.appendChild(body);
        logWarn("missing factory for type:", field.type,
            "(expected window." + factoryName + " or registered provider)");
        return host;
    }

    private buildBasicInput(field: DynamicFormField): HTMLElement
    {
        const el = document.createElement("input");
        el.classList.add(`${CLS}-input`);
        el.type = mapTypeToHtmlType(field.type);
        el.name = field.name;
        if (typeof field.value === "string") { el.value = field.value; }
        else if (typeof field.value === "number") { el.value = String(field.value); }
        if (field.placeholder) { el.placeholder = field.placeholder; }
        if (field.disabled) { el.disabled = true; }
        if (field.required) { setAttr(el, "aria-required", "true"); }
        if (field.autocomplete) { el.setAttribute("autocomplete", field.autocomplete); }
        if (field.type === "number")
        {
            if (typeof field.min === "number") { el.min = String(field.min); }
            if (typeof field.max === "number") { el.max = String(field.max); }
            if (typeof field.step === "number") { el.step = String(field.step); }
        }
        el.addEventListener("input", () => this.onFieldInput(field.name));
        el.addEventListener("change", () => this.onFieldInput(field.name));
        return el;
    }

    private buildTextarea(field: DynamicFormField): HTMLElement
    {
        const ta = document.createElement("textarea");
        ta.classList.add(`${CLS}-textarea`);
        ta.name = field.name;
        ta.rows = field.rows ?? DEFAULT_TEXTAREA_ROWS;
        if (typeof field.value === "string") { ta.value = field.value; }
        if (field.placeholder) { ta.placeholder = field.placeholder; }
        if (field.disabled) { ta.disabled = true; }
        if (field.required) { setAttr(ta, "aria-required", "true"); }
        ta.addEventListener("input", () => this.onFieldInput(field.name));
        return ta;
    }

    private buildSelect(field: DynamicFormField, multiple: boolean): HTMLElement
    {
        const sel = document.createElement("select");
        sel.classList.add(multiple ? `${CLS}-multiselect` : `${CLS}-select`);
        sel.name = field.name;
        sel.multiple = multiple;
        if (multiple) { sel.size = Math.min(6, (field.options?.length ?? 4)); }
        if (field.disabled) { sel.disabled = true; }
        if (field.required) { setAttr(sel, "aria-required", "true"); }

        const initial = Array.isArray(field.value)
            ? (field.value as unknown[]).map(String)
            : (typeof field.value === "string" ? [field.value] : []);

        for (const opt of (field.options ?? []))
        {
            const o = document.createElement("option");
            o.value = opt.value;
            o.textContent = opt.label;
            if (initial.includes(opt.value)) { o.selected = true; }
            sel.appendChild(o);
        }
        sel.addEventListener("change", () => this.onFieldInput(field.name));
        return sel;
    }

    private buildRadioGroup(field: DynamicFormField): HTMLElement
    {
        const group = createElement("div", [`${CLS}-radio-group`]);
        const initial = typeof field.value === "string" ? field.value : null;
        for (const opt of (field.options ?? []))
        {
            const wrap = createElement("label", [`${CLS}-radio-wrap`]);
            const r = document.createElement("input");
            r.classList.add(`${CLS}-radio`);
            r.type = "radio";
            r.name = field.name;
            r.value = opt.value;
            if (opt.value === initial) { r.checked = true; }
            if (field.disabled) { r.disabled = true; }
            r.addEventListener("change", () => this.onFieldInput(field.name));
            wrap.appendChild(r);
            wrap.appendChild(createElement("span", [`${CLS}-radio-label`], opt.label));
            group.appendChild(wrap);
        }
        return group;
    }

    private buildCheckbox(field: DynamicFormField): HTMLElement
    {
        const cb = document.createElement("input");
        cb.classList.add(field.type === "toggle" ? `${CLS}-toggle` : `${CLS}-checkbox`);
        cb.classList.add("form-check-input");
        cb.type = "checkbox";
        cb.name = field.name;
        cb.checked = field.value === true;
        if (field.disabled) { cb.disabled = true; }
        if (field.type === "toggle") { setAttr(cb, "role", "switch"); }
        cb.addEventListener("change", () => this.onFieldInput(field.name));
        return cb;
    }

    private buildFileInput(field: DynamicFormField): HTMLElement
    {
        const f = document.createElement("input");
        f.classList.add(`${CLS}-file`);
        f.type = "file";
        f.name = field.name;
        if (field.disabled) { f.disabled = true; }
        if (field.required) { setAttr(f, "aria-required", "true"); }
        f.addEventListener("change", () => this.onFieldInput(field.name));
        return f;
    }

    private buildColorInput(field: DynamicFormField): HTMLElement
    {
        const c = document.createElement("input");
        c.classList.add(`${CLS}-color`);
        c.type = "color";
        c.name = field.name;
        if (typeof field.value === "string") { c.value = field.value; }
        if (field.disabled) { c.disabled = true; }
        c.addEventListener("input", () => this.onFieldInput(field.name));
        c.addEventListener("change", () => this.onFieldInput(field.name));
        return c;
    }

    private buildCodeInput(field: DynamicFormField): HTMLElement
    {
        // Graceful degradation: textarea is the always-available fallback.
        // If the host has loaded CodeEditor at runtime, the consumer can
        // upgrade via `customElement` on a `custom` field.
        const ta = document.createElement("textarea");
        ta.classList.add(`${CLS}-code`);
        ta.name = field.name;
        ta.rows = field.rows ?? 6;
        ta.spellcheck = false;
        if (typeof field.value === "string") { ta.value = field.value; }
        if (field.placeholder) { ta.placeholder = field.placeholder; }
        if (field.disabled) { ta.disabled = true; }
        ta.addEventListener("input", () => this.onFieldInput(field.name));
        return ta;
    }

    private buildRichTextInput(field: DynamicFormField): HTMLElement
    {
        // Contenteditable fallback. Consumers needing rich text formatting
        // should embed RichTextInput via the `custom` field escape hatch.
        const div = document.createElement("div");
        div.classList.add(`${CLS}-richtext`);
        div.contentEditable = "true";
        setAttr(div, "role", "textbox");
        setAttr(div, "aria-multiline", "true");
        if (typeof field.value === "string") { div.textContent = field.value; }
        // Use a hidden mirror input so [name=...] selectors still find it.
        const mirror = document.createElement("input");
        mirror.type = "hidden";
        mirror.name = field.name;
        const wrap = createElement("div", [`${CLS}-richtext-wrap`]);
        wrap.appendChild(div);
        wrap.appendChild(mirror);
        div.addEventListener("input", () =>
        {
            mirror.value = div.innerHTML;
            this.onFieldInput(field.name);
        });
        // Mark wrap as the "input element" so it lives in fieldMap;
        // value reads from div.innerHTML.
        (wrap as unknown as { __dfsRichText: HTMLElement }).__dfsRichText = div;
        return wrap;
    }

    private buildCustomField(field: DynamicFormField): HTMLElement
    {
        if (field.mount)
        {
            return this.buildMountCustomField(field);
        }
        return this.buildLegacyCustomField(field);
    }

    private buildMountCustomField(field: DynamicFormField): HTMLElement
    {
        const host = createElement("div", [`${CLS}-custom`, `${CLS}-custom-mounted`]);
        setAttr(host, "data-field-input", "true");
        try
        {
            const adapter = field.mount!(host, field.name);
            this.adapterMap.set(field.name, adapter);
        }
        catch (err)
        {
            logError("mount threw for custom field:", field.name, err);
        }
        return host;
    }

    private buildLegacyCustomField(field: DynamicFormField): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-custom`]);
        setAttr(wrap, "data-field-input", "true");
        const mirror = document.createElement("input");
        mirror.type = "hidden";
        mirror.name = field.name;
        wrap.appendChild(mirror);
        if (field.customElement)
        {
            wrap.appendChild(field.customElement);
            (wrap as unknown as { __dfsCustom: HTMLElement }).__dfsCustom = field.customElement;
        }
        return wrap;
    }

    // ------------------------------------------------------------------
    // Value extraction (per-field) — returns the NATIVE type
    // ------------------------------------------------------------------

    private readFieldValue(field: DynamicFormField): unknown
    {
        const adapter = this.adapterMap.get(field.name);
        if (adapter)
        {
            try { return adapter.getValue(); }
            catch (err) { logError("adapter.getValue threw:", field.name, err); return undefined; }
        }
        const el = this.fieldMap.get(field.name);
        if (!el) { return this.fallbackDefault(field); }

        switch (field.type)
        {
            case "number":      return readNumber(el as HTMLInputElement);
            case "checkbox":
            case "toggle":      return (el as HTMLInputElement).checked;
            case "multiselect": return readMultiSelect(el as unknown as HTMLSelectElement);
            case "radio":       return readRadio(el, field.name);
            case "file":        return readFiles(el as HTMLInputElement);
            case "richtext":    return readRichText(el);
            case "custom":      return readCustom(el);
            default:            return readGenericValue(el);
        }
    }

    private fallbackDefault(field: DynamicFormField): unknown
    {
        switch (field.type)
        {
            case "number":      return field.value ?? null;
            case "checkbox":
            case "toggle":      return field.value === true;
            case "multiselect": return Array.isArray(field.value) ? field.value : [];
            case "file":        return [];
            default:            return field.value ?? "";
        }
    }

    private writeFieldValue(field: DynamicFormField, value: unknown): void
    {
        const adapter = this.adapterMap.get(field.name);
        if (adapter)
        {
            if (adapter.setValue)
            {
                try { adapter.setValue(value); }
                catch (err) { logError("adapter.setValue threw:", field.name, err); }
            }
            return;
        }
        const el = this.fieldMap.get(field.name);
        if (!el) { return; }
        switch (field.type)
        {
            case "checkbox":
            case "toggle":    (el as HTMLInputElement).checked = value === true; return;
            case "multiselect": writeMultiSelect(el as unknown as HTMLSelectElement, value); return;
            case "radio":     writeRadio(el, value); return;
            case "richtext":  writeRichText(el, value); return;
            case "custom":    writeCustom(el, value); return;
            case "file":      return;     // <input type=file> cannot be set programmatically
            case "number":    writeNumber(el as HTMLInputElement, value); return;
            default:          writeGeneric(el, value);
        }
    }

    // ------------------------------------------------------------------
    // Variant value commit + restore
    // ------------------------------------------------------------------

    private collectActiveValues(): Values
    {
        const variant = this.opts.variants[this.currentVariant];
        const out: Values = {};
        for (const field of variant.fields)
        {
            out[field.name] = this.readFieldValue(field);
        }
        return out;
    }

    private commitActiveToStore(): void
    {
        this.store.set(this.currentVariant, this.collectActiveValues());
    }

    private applyStoredValuesToActive(): void
    {
        const stored = this.store.get(this.currentVariant);
        if (!stored) { return; }
        const variant = this.opts.variants[this.currentVariant];
        for (const field of variant.fields)
        {
            if (Object.prototype.hasOwnProperty.call(stored, field.name))
            {
                this.writeFieldValue(field, stored[field.name]);
            }
        }
    }

    // ------------------------------------------------------------------
    // Input event hook — fires onChange + clears errors
    // ------------------------------------------------------------------

    private onFieldInput(name: string): void
    {
        if (this.destroyed) { return; }
        this.setFieldError(name, "");
        // Capture current values so getAllValues includes this variant.
        this.commitActiveToStore();
        try
        {
            this.opts.onChange?.(this.currentVariant, this.collectActiveValues());
        }
        catch (err)
        {
            logError("onChange callback threw:", err);
        }
    }

    // ------------------------------------------------------------------
    // Error rendering
    // ------------------------------------------------------------------

    private setFieldError(name: string, message: string): void
    {
        const group = this.rootEl?.querySelector<HTMLElement>(
            `[data-field-name="${name}"]`);
        if (!group) { return; }
        const err = group.querySelector<HTMLElement>(`.${CLS}-error`);
        const input = this.fieldMap.get(name);
        if (message)
        {
            if (err) { err.textContent = message; err.style.display = ""; }
            if (input)
            {
                setAttr(input, "aria-invalid", "true");
            }
            group.classList.add(`${CLS}-group-invalid`);
            return;
        }
        if (err) { err.textContent = ""; err.style.display = "none"; }
        if (input) { input.removeAttribute("aria-invalid"); }
        group.classList.remove(`${CLS}-group-invalid`);
    }

    private clearAllFieldErrors(): void
    {
        const groups = this.rootEl?.querySelectorAll<HTMLElement>(
            `.${CLS}-group-invalid`);
        if (!groups) { return; }
        groups.forEach((g) =>
        {
            const name = g.getAttribute("data-field-name") ?? "";
            this.setFieldError(name, "");
        });
    }

    // ==================================================================
    // PUBLIC API
    // ==================================================================

    public getVariant(): string
    {
        return this.currentVariant;
    }

    public setVariant(id: string): void
    {
        if (this.destroyed) { return; }
        if (!Object.prototype.hasOwnProperty.call(this.opts.variants, id))
        {
            throw new Error(`${LOG_PREFIX} unknown variant: '${id}'`);
        }
        if (id === this.currentVariant) { return; }

        const prev = this.currentVariant;
        if (this.retain) { this.commitActiveToStore(); }
        else { this.store.delete(prev); }

        this.currentVariant = id;
        this.render();
        this.refreshSelector();
        this.focusFirstField();

        try
        {
            this.opts.onVariantChange?.(id, prev);
        }
        catch (err)
        {
            logError("onVariantChange callback threw:", err);
        }
    }

    private focusFirstField(): void
    {
        const first = this.fieldsEl?.querySelector<HTMLElement>(
            "input:not([type=hidden]), select, textarea, [contenteditable=true]");
        try { first?.focus(); } catch (_e) { /* noop */ }
    }

    public getValues(): Values
    {
        return this.collectActiveValues();
    }

    public getAllValues(): Record<string, Values>
    {
        // Refresh active variant snapshot before returning.
        this.commitActiveToStore();
        const out: Record<string, Values> = {};
        for (const [id, vals] of this.store)
        {
            out[id] = { ...vals };
        }
        return out;
    }

    public setValues(variantId: string, values: Values): void
    {
        if (this.destroyed) { return; }
        if (!Object.prototype.hasOwnProperty.call(this.opts.variants, variantId))
        {
            throw new Error(`${LOG_PREFIX} unknown variant: '${variantId}'`);
        }
        this.store.set(variantId, { ...values });
        if (variantId === this.currentVariant) { this.render(); }
    }

    public clearValues(variantId?: string): void
    {
        if (variantId === undefined) { this.store.clear(); }
        else { this.store.delete(variantId); }
        if (variantId === undefined || variantId === this.currentVariant)
        {
            this.render();
        }
    }

    public validate(): boolean
    {
        if (this.destroyed) { return false; }
        this.clearAllFieldErrors();
        const firstInvalid = this.runFieldValidators();
        if (firstInvalid)
        {
            try { firstInvalid.focus(); } catch (_e) { /* noop */ }
            return false;
        }
        return this.runCrossFieldValidator();
    }

    private runFieldValidators(): HTMLElement | null
    {
        const variant = this.opts.variants[this.currentVariant];
        let firstInvalid: HTMLElement | null = null;
        for (const field of variant.fields)
        {
            const value = this.readFieldValue(field);
            const error = this.validateField(field, value);
            if (!error) { continue; }
            this.setFieldError(field.name, error);
            if (!firstInvalid)
            {
                firstInvalid = this.fieldMap.get(field.name) ?? null;
            }
        }
        return firstInvalid;
    }

    private runCrossFieldValidator(): boolean
    {
        if (!this.opts.onValidate) { return true; }
        const err = this.opts.onValidate(
            this.currentVariant, this.collectActiveValues());
        if (err)
        {
            logInfo("onValidate vetoed:", err);
            return false;
        }
        return true;
    }

    private validateField(field: DynamicFormField, value: unknown): string | null
    {
        const adapterErr = this.runAdapterValidate(field.name);
        if (adapterErr) { return adapterErr; }
        if (field.required && isEmpty(value)) { return "This field is required"; }
        const builtinErr = builtinTypeValidate(field.type, value);
        if (builtinErr) { return builtinErr; }
        return field.validate ? field.validate(value) : null;
    }

    private runAdapterValidate(fieldName: string): string | null
    {
        const adapter = this.adapterMap.get(fieldName);
        if (!adapter || !adapter.validate) { return null; }
        try { return adapter.validate(); }
        catch (e)
        {
            logError("adapter.validate threw:", fieldName, e);
            return null;
        }
    }

    public reset(): void
    {
        this.store.delete(this.currentVariant);
        this.render();
    }

    public resetAll(): void
    {
        this.store.clear();
        this.render();
    }

    public refresh(): void
    {
        if (this.destroyed) { return; }
        this.commitActiveToStore();
        this.render();
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.tearDownActiveAdapters();
        if (this.rootEl && this.rootEl.parentElement === this.container)
        {
            this.container.removeChild(this.rootEl);
        }
        this.rootEl = null;
        this.selectorEl = null;
        this.bodyEl = null;
        this.fieldsEl = null;
        this.descriptionEl = null;
        this.fieldMap.clear();
        this.adapterMap.clear();
        this.store.clear();
        logInfo("destroyed", this.id);
    }

    /**
     * Call `destroy()` on every adapter currently attached to the active
     * variant. Run before re-rendering (variant switch / refresh / reset)
     * and on full teardown so embedded components release listeners.
     */
    private tearDownActiveAdapters(): void
    {
        for (const [name, adapter] of this.adapterMap)
        {
            if (!adapter.destroy) { continue; }
            try { adapter.destroy(); }
            catch (err) { logError("adapter.destroy threw:", name, err); }
        }
        this.adapterMap.clear();
    }
}

// ============================================================================
// 7. FIELD VALUE HELPERS — kept module-level to keep the class compact
// ============================================================================

/**
 * Wrap a convention-compliant component handle in the field-adapter
 * protocol. Tolerates handles that omit setValue (read-only fields) or
 * destroy (rare); logs once per missing method for diagnostics.
 */
function wrapHandleAsAdapter(
    handle: unknown, factoryName: string): DynamicFormFieldAdapter | null
{
    if (!handle || typeof handle !== "object") { return null; }
    const h = handle as Record<string, unknown>;
    const getValue = typeof h.getValue === "function" ? h.getValue as () => unknown : null;
    if (!getValue)
    {
        logWarn("auto-discovered handle from",
            factoryName, "has no getValue() — treating as missing factory");
        return null;
    }
    const setValue = typeof h.setValue === "function"
        ? (h.setValue as (v: unknown) => void).bind(handle)
        : undefined;
    const destroy = typeof h.destroy === "function"
        ? (h.destroy as () => void).bind(handle)
        : undefined;
    const adapter: DynamicFormFieldAdapter = {
        getValue: getValue.bind(handle),
    };
    if (setValue) { adapter.setValue = setValue; }
    if (destroy) { adapter.destroy = destroy; }
    return adapter;
}

function mapTypeToHtmlType(t: DynamicFormFieldType): string
{
    switch (t)
    {
        case "email":    return "email";
        case "password": return "password";
        case "url":      return "url";
        case "number":   return "number";
        case "date":     return "date";
        case "datetime": return "datetime-local";
        case "time":     return "time";
        default:         return "text";
    }
}

function readNumber(el: HTMLInputElement): number | null
{
    if (el.value === "") { return null; }
    const n = el.valueAsNumber;
    return Number.isFinite(n) ? n : null;
}

function writeNumber(el: HTMLInputElement, value: unknown): void
{
    el.value = (value === null || value === undefined) ? "" : String(value);
}

function readMultiSelect(sel: HTMLSelectElement): string[]
{
    return Array.from(sel.selectedOptions).map((o) => o.value);
}

function writeMultiSelect(sel: HTMLSelectElement, value: unknown): void
{
    const arr = Array.isArray(value) ? value.map(String) : [];
    for (const o of Array.from(sel.options))
    {
        o.selected = arr.includes(o.value);
    }
}

function readRadio(groupEl: HTMLElement, name: string): string | null
{
    const checked = groupEl.querySelector<HTMLInputElement>(
        `input[type="radio"][name="${name}"]:checked`);
    return checked ? checked.value : null;
}

function writeRadio(groupEl: HTMLElement, value: unknown): void
{
    const radios = groupEl.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    radios.forEach((r) => { r.checked = (r.value === value); });
}

function readFiles(el: HTMLInputElement): File[]
{
    return el.files ? Array.from(el.files) : [];
}

function readRichText(wrap: HTMLElement): string
{
    const w = wrap as unknown as { __dfsRichText?: HTMLElement };
    return w.__dfsRichText ? w.__dfsRichText.innerHTML : "";
}

function writeRichText(wrap: HTMLElement, value: unknown): void
{
    const w = wrap as unknown as { __dfsRichText?: HTMLElement };
    if (w.__dfsRichText)
    {
        w.__dfsRichText.textContent = typeof value === "string" ? value : "";
    }
}

function readCustom(wrap: HTMLElement): unknown
{
    const w = wrap as unknown as { __dfsCustom?: { getValue?: () => unknown } };
    const target = w.__dfsCustom;
    if (target && typeof target.getValue === "function")
    {
        try { return target.getValue(); }
        catch (err) { logError("custom getValue threw:", err); return undefined; }
    }
    return undefined;
}

function writeCustom(wrap: HTMLElement, value: unknown): void
{
    const w = wrap as unknown as { __dfsCustom?: { setValue?: (v: unknown) => void } };
    const target = w.__dfsCustom;
    if (target && typeof target.setValue === "function")
    {
        try { target.setValue(value); }
        catch (err) { logError("custom setValue threw:", err); }
    }
}

function readGenericValue(el: HTMLElement): string
{
    if (el instanceof HTMLInputElement) { return el.value; }
    if (el instanceof HTMLSelectElement) { return el.value; }
    if (el instanceof HTMLTextAreaElement) { return el.value; }
    return "";
}

function writeGeneric(el: HTMLElement, value: unknown): void
{
    const str = value === null || value === undefined ? "" : String(value);
    if (el instanceof HTMLInputElement) { el.value = str; return; }
    if (el instanceof HTMLSelectElement) { el.value = str; return; }
    if (el instanceof HTMLTextAreaElement) { el.value = str; return; }
}

function isEmpty(value: unknown): boolean
{
    if (value === null || value === undefined) { return true; }
    if (typeof value === "string") { return value.trim() === ""; }
    if (Array.isArray(value)) { return value.length === 0; }
    return false;
}

/**
 * Built-in type-level validation (email, url). Returns an error message
 * or null. Field-level `validate` runs after this on non-empty values.
 */
function builtinTypeValidate(type: DynamicFormFieldType, value: unknown): string | null
{
    if (typeof value !== "string" || !value.trim()) { return null; }
    if (type === "email")
    {
        if (!value.includes("@") || !value.includes(".")) { return "Please enter a valid email address"; }
    }
    if (type === "url")
    {
        try { new URL(value); } catch (_e) { return "Please enter a valid URL"; }
    }
    return null;
}

// ============================================================================
// 8. FACTORY
// ============================================================================

export function createDynamicFormSwitcher(
    target: string | HTMLElement,
    options: DynamicFormSwitcherOptions,
): DynamicFormSwitcherHandle
{
    return new DynamicFormSwitcherImpl(target, options);
}

// ============================================================================
// 9. WINDOW EXPORTS
// ============================================================================

if (typeof window !== "undefined")
{
    const win = window as unknown as Record<string, unknown>;
    win.DynamicFormSwitcher = DynamicFormSwitcherImpl;
    win.createDynamicFormSwitcher = createDynamicFormSwitcher;
    // Expose the registry as a property on the factory (the idiomatic
    // shape — `createDynamicFormSwitcher.registerFieldProvider("cronpicker", …)`).
    (createDynamicFormSwitcher as unknown as Record<string, unknown>).registerFieldProvider
        = registerDynamicFormFieldProvider;
    (createDynamicFormSwitcher as unknown as Record<string, unknown>).unregisterFieldProvider
        = unregisterDynamicFormFieldProvider;
    win.registerDynamicFormFieldProvider = registerDynamicFormFieldProvider;
    win.unregisterDynamicFormFieldProvider = unregisterDynamicFormFieldProvider;
}
