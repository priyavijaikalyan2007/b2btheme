/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d2a7c3e1-8f4b-4a19-bc6d-3e9f0a1b7c52
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: ColumnsPicker
 * PURPOSE: Dropdown showing column layout presets with SVG page thumbnails.
 *    Each option displays a page with vertical column dividers and horizontal
 *    placeholder lines illustrating the layout.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[SpacingPicker]],
 *    [[RibbonBuilder]]
 * FLOW: [Consumer App] -> [createColumnsPicker()] -> [Dropdown with SVG previews]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** A single column layout preset. */
export interface ColumnPreset
{
    /** Display name (e.g. "Two", "Left"). */
    name: string;
    /** Number of columns. */
    columns: number;
    /** Column widths as ratios (e.g. [1, 1] for equal, [2, 1] for wide-narrow). */
    widths?: number[];
    /** Gap between columns in px. Default: 12. */
    gap?: number;
}

/** Configuration for ColumnsPicker. */
export interface ColumnsPickerOptions
{
    /** Container element or string ID. */
    container: HTMLElement | string;
    /** Initial selected preset name. Default: "One". */
    value?: string;
    /** Custom presets. Overrides defaults if provided. */
    presets?: ColumnPreset[];
    /** Show "Custom Columns..." link at bottom. Default: true. */
    showCustom?: boolean;
    /** Callback when a preset is selected. */
    onChange?: (preset: ColumnPreset) => void;
    /** Callback when "Custom Columns..." is clicked. */
    onCustom?: () => void;
    /** Render as ribbon-compatible dropdown. Default: true. */
    ribbonMode?: boolean;
}

/** Public API returned by the factory. */
export interface ColumnsPicker
{
    getValue(): ColumnPreset;
    setValue(presetName: string): void;
    setPresets(presets: ColumnPreset[]): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ColumnsPicker]";
const CLS = "columnspicker";
const SVG_NS = "http://www.w3.org/2000/svg";
let instanceCounter = 0;

const DEFAULT_PRESETS: ColumnPreset[] =
[
    { name: "One",   columns: 1, widths: [1] },
    { name: "Two",   columns: 2, widths: [1, 1] },
    { name: "Three", columns: 3, widths: [1, 1, 1] },
    { name: "Left",  columns: 2, widths: [1, 2] },
    { name: "Right", columns: 2, widths: [2, 1] },
];

const THUMB_W = 40;
const THUMB_H = 52;
const PAGE_PAD = 4;

// ============================================================================
// S3: DOM HELPERS
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

function setAttr(
    el: HTMLElement | SVGElement, attrs: Record<string, string>
): void
{
    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }
}

function createSvgElement(
    tag: string, attrs: Record<string, string>
): SVGElement
{
    const el = document.createElementNS(SVG_NS, tag);

    for (const key of Object.keys(attrs))
    {
        el.setAttribute(key, attrs[key]);
    }

    return el;
}

function resolveContainer(
    container: HTMLElement | string
): HTMLElement | null
{
    if (typeof container === "string")
    {
        return document.getElementById(container);
    }

    return container;
}

// ============================================================================
// S4: SVG THUMBNAIL BUILDER
// ============================================================================

/** Build a column layout thumbnail SVG (40x52). */
function buildThumbnail(preset: ColumnPreset): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": String(THUMB_W),
        "height": String(THUMB_H),
        "viewBox": `0 0 ${THUMB_W} ${THUMB_H}`,
        "class": `${CLS}-thumb`,
        "aria-hidden": "true",
    });

    appendPageRect(svg);
    appendColumns(svg, preset);
    return svg;
}

/** Draw the outer page rectangle. */
function appendPageRect(svg: SVGElement): void
{
    svg.appendChild(createSvgElement("rect", {
        "x": "0.5", "y": "0.5",
        "width": String(THUMB_W - 1),
        "height": String(THUMB_H - 1),
        "rx": "1",
        "class": `${CLS}-thumb-page`,
    }));
}

/** Draw column dividers and placeholder lines. */
function appendColumns(svg: SVGElement, preset: ColumnPreset): void
{
    const widths = preset.widths || Array(preset.columns).fill(1);
    const totalRatio = widths.reduce((a, b) => a + b, 0);
    const contentW = THUMB_W - (PAGE_PAD * 2);
    const gapPx = 2;
    const totalGaps = (widths.length - 1) * gapPx;
    const usableW = contentW - totalGaps;

    let xOffset = PAGE_PAD;

    for (let i = 0; i < widths.length; i++)
    {
        const colW = (widths[i] / totalRatio) * usableW;

        appendColumnLines(svg, xOffset, colW);

        xOffset += colW;

        if (i < widths.length - 1)
        {
            appendDivider(svg, xOffset + (gapPx / 2));
            xOffset += gapPx;
        }
    }
}

/** Draw horizontal placeholder lines within a single column. */
function appendColumnLines(
    svg: SVGElement, x: number, colW: number
): void
{
    const lineCount = 5;
    const yStart = PAGE_PAD + 2;
    const ySpacing = (THUMB_H - (PAGE_PAD * 2) - 4) / lineCount;

    for (let j = 0; j < lineCount; j++)
    {
        const y = yStart + (j * ySpacing) + (ySpacing / 2);
        const lineW = colW * (j % 2 === 0 ? 0.85 : 0.6);

        svg.appendChild(createSvgElement("line", {
            "x1": String(x + 1),
            "y1": String(Math.round(y * 10) / 10),
            "x2": String(x + lineW),
            "y2": String(Math.round(y * 10) / 10),
            "class": `${CLS}-thumb-line`,
        }));
    }
}

/** Draw a vertical column divider. */
function appendDivider(svg: SVGElement, x: number): void
{
    svg.appendChild(createSvgElement("line", {
        "x1": String(Math.round(x * 10) / 10),
        "y1": String(PAGE_PAD),
        "x2": String(Math.round(x * 10) / 10),
        "y2": String(THUMB_H - PAGE_PAD),
        "class": `${CLS}-thumb-divider`,
    }));
}

// ============================================================================
// S5: DROPDOWN COMPONENT
// ============================================================================

/** Create the ColumnsPicker and return its public API. */
export function createColumnsPicker(
    options: ColumnsPickerOptions
): ColumnsPicker
{
    const instanceId = `${CLS}-${++instanceCounter}`;
    const presets = options.presets || [...DEFAULT_PRESETS];
    const showCustom = options.showCustom !== false;
    let selectedName = options.value || "One";
    let isOpen = false;
    let destroyed = false;

    // DOM references
    let rootEl: HTMLElement | null = null;
    let triggerEl: HTMLElement | null = null;
    let panelEl: HTMLElement | null = null;
    let focusedIndex = -1;

    // Bound handlers for cleanup
    const boundDocClick = (e: MouseEvent) => onDocumentClick(e);
    const boundDocKey = (e: KeyboardEvent) => onDocumentKey(e);

    // ── Initialise ──

    const containerEl = resolveContainer(options.container);

    if (!containerEl)
    {
        console.warn(LOG_PREFIX, "container not found:", options.container);
        return buildNullApi();
    }

    rootEl = buildRoot();
    containerEl.appendChild(rootEl);
    console.log(LOG_PREFIX, "created", instanceId);

    // ── Build DOM ──

    function buildRoot(): HTMLElement
    {
        const root = createElement("div", [CLS]);
        root.id = instanceId;

        triggerEl = buildTrigger();
        panelEl = buildPanel();

        root.appendChild(triggerEl);
        // Panel is appended to document.body on open, not to root
        return root;
    }

    function buildTrigger(): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-trigger`]);

        setAttr(btn, {
            "type": "button",
            "aria-expanded": "false",
            "aria-haspopup": "listbox",
            "aria-label": "Column layout",
        });

        const label = createElement("span", [`${CLS}-trigger-label`]);
        label.textContent = selectedName;

        const caret = createElement("i", [
            "bi", "bi-chevron-down", `${CLS}-trigger-caret`,
        ]);

        btn.appendChild(label);
        btn.appendChild(caret);
        btn.addEventListener("click", () => toggleDropdown());
        btn.addEventListener("keydown", (e) => onTriggerKey(e));
        return btn;
    }

    function buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);

        setAttr(panel, {
            "role": "listbox",
            "aria-label": "Column layout presets",
        });

        panel.style.display = "none";
        rebuildItems(panel);

        if (showCustom)
        {
            appendCustomLink(panel);
        }

        return panel;
    }

    function rebuildItems(panel: HTMLElement): void
    {
        const existing = panel.querySelectorAll(`.${CLS}-item`);

        existing.forEach((el) => el.remove());

        for (let i = 0; i < presets.length; i++)
        {
            panel.appendChild(buildItem(presets[i], i));
        }
    }

    function buildItem(preset: ColumnPreset, index: number): HTMLElement
    {
        const item = createElement("div", [`${CLS}-item`]);
        const isSelected = preset.name === selectedName;

        setAttr(item, {
            "role": "option",
            "aria-selected": String(isSelected),
            "data-index": String(index),
            "tabindex": "-1",
        });

        if (isSelected)
        {
            item.classList.add(`${CLS}-item--selected`);
        }

        item.appendChild(buildThumbnail(preset) as unknown as Node);

        const label = createElement("span", [`${CLS}-item-label`]);
        label.textContent = preset.name;
        item.appendChild(label);

        item.addEventListener("click", () => selectPreset(preset));
        return item;
    }

    function appendCustomLink(panel: HTMLElement): void
    {
        const link = createElement("div", [`${CLS}-custom`]);
        link.textContent = "Custom Columns\u2026";

        setAttr(link, { "role": "option", "tabindex": "-1" });

        link.addEventListener("click", () =>
        {
            closeDropdown();

            if (options.onCustom)
            {
                try { options.onCustom(); }
                catch (err) { console.error(LOG_PREFIX, "onCustom error:", err); }
            }
        });

        panel.appendChild(link);
    }

    // ── Dropdown open / close ──

    function toggleDropdown(): void
    {
        if (isOpen)
        {
            closeDropdown();
        }
        else
        {
            openDropdown();
        }
    }

    /** Position the panel below the trigger using fixed coordinates. */
    function positionPanel(): void
    {
        if (!triggerEl || !panelEl) { return; }

        const rect = triggerEl.getBoundingClientRect();
        panelEl.style.position = "fixed";
        panelEl.style.left = rect.left + "px";
        panelEl.style.top = (rect.bottom + 2) + "px";
        panelEl.style.minWidth = rect.width + "px";
        panelEl.style.zIndex = "1050";
    }

    function openDropdown(): void
    {
        if (!panelEl || !triggerEl) { return; }

        isOpen = true;
        if (panelEl.parentElement !== document.body)
        {
            document.body.appendChild(panelEl);
        }
        panelEl.style.display = "";
        triggerEl.setAttribute("aria-expanded", "true");
        rootEl?.classList.add(`${CLS}--open`);
        positionPanel();
        focusedIndex = findSelectedIndex();
        updateFocusHighlight();
        addGlobalListeners();
        console.debug(LOG_PREFIX, "opened");
    }

    function closeDropdown(): void
    {
        if (!panelEl || !triggerEl) { return; }

        isOpen = false;
        panelEl.style.display = "none";
        triggerEl.setAttribute("aria-expanded", "false");
        rootEl?.classList.remove(`${CLS}--open`);
        removeGlobalListeners();
        triggerEl.focus();
        console.debug(LOG_PREFIX, "closed");
    }

    // ── Selection ──

    function selectPreset(preset: ColumnPreset): void
    {
        selectedName = preset.name;
        updateTriggerLabel();
        updateSelectedState();
        closeDropdown();

        if (options.onChange)
        {
            try { options.onChange(preset); }
            catch (err) { console.error(LOG_PREFIX, "onChange error:", err); }
        }
    }

    function updateTriggerLabel(): void
    {
        if (!triggerEl) { return; }

        const label = triggerEl.querySelector(`.${CLS}-trigger-label`);

        if (label)
        {
            label.textContent = selectedName;
        }
    }

    function updateSelectedState(): void
    {
        if (!panelEl) { return; }

        const items = panelEl.querySelectorAll(`.${CLS}-item`);

        items.forEach((item, i) =>
        {
            const isSelected = presets[i]?.name === selectedName;
            item.classList.toggle(`${CLS}-item--selected`, isSelected);
            item.setAttribute("aria-selected", String(isSelected));
        });
    }

    // ── Keyboard navigation ──

    function onTriggerKey(e: KeyboardEvent): void
    {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();

            if (!isOpen) { openDropdown(); }
        }
    }

    function onDocumentClick(e: MouseEvent): void
    {
        if (!rootEl || !isOpen) { return; }
        const target = e.target as Node;
        if (!rootEl.contains(target) && !(panelEl && panelEl.contains(target)))
        {
            closeDropdown();
        }
    }

    function onDocumentKey(e: KeyboardEvent): void
    {
        if (!isOpen) { return; }

        if (e.key === "Escape")
        {
            e.preventDefault();
            closeDropdown();
            return;
        }

        if (e.key === "ArrowDown")
        {
            e.preventDefault();
            moveFocus(1);
            return;
        }

        if (e.key === "ArrowUp")
        {
            e.preventDefault();
            moveFocus(-1);
            return;
        }

        if (e.key === "Enter")
        {
            e.preventDefault();
            confirmFocused();
        }
    }

    function moveFocus(delta: number): void
    {
        const total = presets.length + (showCustom ? 1 : 0);
        focusedIndex = ((focusedIndex + delta) + total) % total;
        updateFocusHighlight();
    }

    function updateFocusHighlight(): void
    {
        if (!panelEl) { return; }

        const items = panelEl.querySelectorAll(
            `.${CLS}-item, .${CLS}-custom`
        );

        items.forEach((el, i) =>
        {
            el.classList.toggle(`${CLS}-item--focused`, i === focusedIndex);

            if (i === focusedIndex)
            {
                (el as HTMLElement).focus();
            }
        });
    }

    function confirmFocused(): void
    {
        if (focusedIndex >= 0 && focusedIndex < presets.length)
        {
            selectPreset(presets[focusedIndex]);
        }
    }

    function findSelectedIndex(): number
    {
        return presets.findIndex((p) => p.name === selectedName);
    }

    // ── Global listeners ──

    function addGlobalListeners(): void
    {
        document.addEventListener("mousedown", boundDocClick, true);
        document.addEventListener("keydown", boundDocKey, true);
    }

    function removeGlobalListeners(): void
    {
        document.removeEventListener("mousedown", boundDocClick, true);
        document.removeEventListener("keydown", boundDocKey, true);
    }

    // ── Null API for missing container ──

    function buildNullApi(): ColumnsPicker
    {
        const noop = (): void => {};
        const nullPreset: ColumnPreset =
            { name: "One", columns: 1, widths: [1] };

        return {
            getValue: () => nullPreset,
            setValue: noop,
            setPresets: noop,
            show: noop,
            hide: noop,
            destroy: noop,
            getElement: () => document.createElement("div"),
        };
    }

    // ── Public API ──

    const api: ColumnsPicker =
    {
        getValue(): ColumnPreset
        {
            const found = presets.find((p) => p.name === selectedName);
            return found || presets[0];
        },

        setValue(presetName: string): void
        {
            const found = presets.find((p) => p.name === presetName);

            if (found)
            {
                selectedName = presetName;
                updateTriggerLabel();
                updateSelectedState();
            }
            else
            {
                console.warn(LOG_PREFIX, "preset not found:", presetName);
            }
        },

        setPresets(newPresets: ColumnPreset[]): void
        {
            presets.length = 0;
            presets.push(...newPresets);

            if (panelEl)
            {
                rebuildItems(panelEl);
            }

            if (!presets.find((p) => p.name === selectedName) && presets.length > 0)
            {
                selectedName = presets[0].name;
                updateTriggerLabel();
            }
        },

        show(): void
        {
            if (!isOpen) { openDropdown(); }
        },

        hide(): void
        {
            if (isOpen) { closeDropdown(); }
        },

        destroy(): void
        {
            if (destroyed) { return; }

            destroyed = true;
            removeGlobalListeners();

            if (panelEl && panelEl.parentElement)
            {
                panelEl.parentElement.removeChild(panelEl);
            }

            if (rootEl && rootEl.parentElement)
            {
                rootEl.parentElement.removeChild(rootEl);
            }

            rootEl = null;
            triggerEl = null;
            panelEl = null;
            console.log(LOG_PREFIX, "destroyed", instanceId);
        },

        getElement(): HTMLElement
        {
            return rootEl as HTMLElement;
        },
    };

    return api;
}

// ============================================================================
// S6: WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["createColumnsPicker"] = createColumnsPicker;
