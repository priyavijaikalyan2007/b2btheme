/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Repository: pvk2007/theme
 * File GUID: d3a7e9c1-5f28-4b6a-9e1c-8d2f0a4b7e31
 * Created: 2026-03-24
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: OrientationPicker
 * PURPOSE: Simple dropdown picker for page orientation (Portrait / Landscape)
 *    with SVG page icons and chevron trigger button.
 * RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[MarginsPicker]],
 *    [[SizesPicker]], [[RibbonBuilder]]
 * FLOW: [Consumer App] -> [createOrientationPicker()] -> [Dropdown with 2 options]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// S1: INTERFACES
// ============================================================================

/** Configuration options for OrientationPicker. */
export interface OrientationPickerOptions
{
    /** Container element or string ID. */
    container: HTMLElement | string;

    /** Initial orientation. Default: "portrait". */
    value?: "portrait" | "landscape";

    /** Callback when orientation changes. */
    onChange?: (orientation: "portrait" | "landscape") => void;

    /** Render as ribbon-compatible dropdown. Default: false. */
    ribbonMode?: boolean;
}

/** Public API for OrientationPicker. */
export interface OrientationPicker
{
    getValue(): "portrait" | "landscape";
    setValue(orientation: "portrait" | "landscape"): void;
    show(): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement;
}

// ============================================================================
// S2: CONSTANTS
// ============================================================================

const LOG_PREFIX = "[OrientationPicker]";
const CLS = "orientationpicker";
const SVG_NS = "http://www.w3.org/2000/svg";

const ORIENTATIONS: Array<{ value: "portrait" | "landscape"; label: string }> =
[
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" },
];

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

function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

// ============================================================================
// S4: SVG PAGE ICON BUILDERS
// ============================================================================

/** Build a portrait page icon: 24x32 white rect with border + corner fold. */
function buildPortraitIcon(): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": "24", "height": "32",
        "viewBox": "0 0 24 32",
        "class": `${CLS}-icon`,
    });

    appendPageRect(svg, 24, 32);
    appendCornerFold(svg, 24);
    return svg;
}

/** Build a landscape page icon: 32x24 white rect with border + corner fold. */
function buildLandscapeIcon(): SVGElement
{
    const svg = createSvgElement("svg", {
        "width": "32", "height": "24",
        "viewBox": "0 0 32 24",
        "class": `${CLS}-icon`,
    });

    appendPageRect(svg, 32, 24);
    appendCornerFold(svg, 32);
    return svg;
}

/** Append the main page rectangle to the SVG. */
function appendPageRect(svg: SVGElement, w: number, h: number): void
{
    const rect = createSvgElement("rect", {
        "x": "0.5", "y": "0.5",
        "width": String(w - 1), "height": String(h - 1),
        "fill": "var(--theme-surface-bg, #fff)",
        "stroke": "#dee2e6",
        "stroke-width": "1",
    });
    svg.appendChild(rect);
}

/** Append a small triangle fold in the top-right corner. */
function appendCornerFold(svg: SVGElement, w: number): void
{
    const foldSize = 6;
    const x0 = w - foldSize - 0.5;
    const y0 = 0.5;
    const path = createSvgElement("path", {
        "d": `M${x0},${y0} L${w - 0.5},${y0 + foldSize} L${x0},${y0 + foldSize} Z`,
        "fill": "#dee2e6",
        "stroke": "#dee2e6",
        "stroke-width": "0.5",
    });
    svg.appendChild(path);
}

// ============================================================================
// S5: FACTORY
// ============================================================================

/** Create an OrientationPicker and mount it in the given container. */
export function createOrientationPicker(
    options: OrientationPickerOptions
): OrientationPicker
{
    const container = resolveContainer(options.container);
    if (!container)
    {
        console.error(LOG_PREFIX, "container not found:", options.container);
        return createNullPicker();
    }

    const value: "portrait" | "landscape" = options.value ?? "portrait";
    const state = { value, isOpen: false, destroyed: false };
    const rootEl = buildRoot(state, options);

    container.appendChild(rootEl);
    addDocumentCloseListener(rootEl, state);
    console.log(LOG_PREFIX, "created");

    return buildApi(rootEl, state, options);
}

// ============================================================================
// S6: CONTAINER RESOLUTION
// ============================================================================

/** Resolve a container from string ID or HTMLElement. */
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
// S7: ROOT BUILDER
// ============================================================================

/** Build the root element with trigger and dropdown panel. */
function buildRoot(
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    options: OrientationPickerOptions
): HTMLElement
{
    const root = createElement("div", [CLS]);

    const trigger = buildTrigger(state, root);
    root.appendChild(trigger);

    const panel = buildPanel(state, root, options);
    root.appendChild(panel);

    return root;
}

// ============================================================================
// S8: TRIGGER BUILDER
// ============================================================================

/** Build the dropdown trigger button showing current selection + chevron. */
function buildTrigger(
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    root: HTMLElement
): HTMLElement
{
    const trigger = createElement("button", [`${CLS}-trigger`]);
    setAttr(trigger, {
        "type": "button",
        "aria-expanded": "false",
        "aria-haspopup": "listbox",
        "aria-label": "Orientation picker",
    });

    updateTriggerContent(trigger, state.value);
    trigger.addEventListener("click", () => togglePanel(root, state));
    trigger.addEventListener("keydown", (e) => onTriggerKeydown(e, root, state));

    return trigger;
}

/** Replace trigger inner content to match current orientation. */
function updateTriggerContent(
    trigger: HTMLElement, value: "portrait" | "landscape"
): void
{
    trigger.innerHTML = "";
    const icon = value === "portrait" ? buildPortraitIcon() : buildLandscapeIcon();
    trigger.appendChild(icon as unknown as Node);

    const label = createElement("span", [`${CLS}-trigger-label`]);
    label.textContent = value === "portrait" ? "Portrait" : "Landscape";
    trigger.appendChild(label);

    const caret = createElement("i", ["bi", "bi-chevron-down", `${CLS}-trigger-caret`]);
    trigger.appendChild(caret);
}

/** Handle keyboard events on the trigger button. */
function onTriggerKeydown(
    e: KeyboardEvent,
    root: HTMLElement,
    state: { value: "portrait" | "landscape"; isOpen: boolean }
): void
{
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")
    {
        e.preventDefault();
        if (!state.isOpen) { openPanel(root, state); }
    }
}

// ============================================================================
// S9: PANEL BUILDER
// ============================================================================

/** Build the dropdown panel containing orientation items. */
function buildPanel(
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    root: HTMLElement,
    options: OrientationPickerOptions
): HTMLElement
{
    const panel = createElement("div", [`${CLS}-panel`]);
    setAttr(panel, { "role": "listbox", "aria-label": "Page orientation" });

    for (const orient of ORIENTATIONS)
    {
        const item = buildItem(orient, state, root, options);
        panel.appendChild(item);
    }

    return panel;
}

/** Build a single orientation item (icon + label + optional checkmark). */
function buildItem(
    orient: { value: "portrait" | "landscape"; label: string },
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    root: HTMLElement,
    options: OrientationPickerOptions
): HTMLElement
{
    const item = createElement("div", [`${CLS}-item`]);
    setAttr(item, {
        "role": "option",
        "tabindex": "0",
        "data-value": orient.value,
        "aria-selected": String(state.value === orient.value),
    });

    const icon = orient.value === "portrait" ? buildPortraitIcon() : buildLandscapeIcon();
    item.appendChild(icon as unknown as Node);

    const label = createElement("span", [`${CLS}-item-label`], orient.label);
    item.appendChild(label);

    if (state.value === orient.value)
    {
        item.classList.add(`${CLS}-item--active`);
        appendCheckmark(item);
    }

    attachItemListeners(item, orient.value, state, root, options);
    return item;
}

/** Append a checkmark icon to an active item. */
function appendCheckmark(item: HTMLElement): void
{
    const check = createElement("i", ["bi", "bi-check-lg", `${CLS}-check`]);
    item.appendChild(check);
}

/** Attach click and keyboard listeners to a dropdown item. */
function attachItemListeners(
    item: HTMLElement,
    value: "portrait" | "landscape",
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    root: HTMLElement,
    options: OrientationPickerOptions
): void
{
    item.addEventListener("click", () =>
    {
        selectValue(value, state, root, options);
    });

    item.addEventListener("keydown", (e) =>
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            selectValue(value, state, root, options);
        }
        if (e.key === "Escape")
        {
            e.preventDefault();
            closePanel(root, state);
        }
    });
}

// ============================================================================
// S10: SELECTION LOGIC
// ============================================================================

/** Select an orientation value and update state + DOM. */
function selectValue(
    value: "portrait" | "landscape",
    state: { value: "portrait" | "landscape"; isOpen: boolean },
    root: HTMLElement,
    options: OrientationPickerOptions
): void
{
    state.value = value;
    refreshItems(root, state);
    updateTriggerFromRoot(root, value);
    closePanel(root, state);
    safeCallback(options.onChange, value);
    console.debug(LOG_PREFIX, "selected:", value);
}

/** Refresh all item active states after selection change. */
function refreshItems(
    root: HTMLElement,
    state: { value: "portrait" | "landscape" }
): void
{
    const items = root.querySelectorAll(`.${CLS}-item`);
    for (const item of items)
    {
        const el = item as HTMLElement;
        const val = el.getAttribute("data-value");
        const isActive = val === state.value;

        el.classList.toggle(`${CLS}-item--active`, isActive);
        el.setAttribute("aria-selected", String(isActive));

        const existing = el.querySelector(`.${CLS}-check`);
        if (isActive && !existing) { appendCheckmark(el); }
        if (!isActive && existing) { existing.remove(); }
    }
}

/** Update the trigger button content from the root element. */
function updateTriggerFromRoot(
    root: HTMLElement, value: "portrait" | "landscape"
): void
{
    const trigger = root.querySelector(`.${CLS}-trigger`) as HTMLElement;
    if (trigger) { updateTriggerContent(trigger, value); }
}

// ============================================================================
// S11: PANEL OPEN / CLOSE
// ============================================================================

/** Toggle the dropdown panel open or closed. */
function togglePanel(
    root: HTMLElement,
    state: { isOpen: boolean }
): void
{
    if (state.isOpen)
    {
        closePanel(root, state);
    }
    else
    {
        openPanel(root, state);
    }
}

/** Open the dropdown panel. */
function openPanel(
    root: HTMLElement,
    state: { isOpen: boolean }
): void
{
    state.isOpen = true;
    root.classList.add(`${CLS}--open`);
    const trigger = root.querySelector(`.${CLS}-trigger`);
    if (trigger) { trigger.setAttribute("aria-expanded", "true"); }
    console.debug(LOG_PREFIX, "panel opened");
}

/** Close the dropdown panel. */
function closePanel(
    root: HTMLElement,
    state: { isOpen: boolean }
): void
{
    state.isOpen = false;
    root.classList.remove(`${CLS}--open`);
    const trigger = root.querySelector(`.${CLS}-trigger`) as HTMLElement;
    if (trigger)
    {
        trigger.setAttribute("aria-expanded", "false");
        trigger.focus();
    }
    console.debug(LOG_PREFIX, "panel closed");
}

// ============================================================================
// S12: DOCUMENT CLOSE LISTENER
// ============================================================================

/** Close panel when clicking outside the root element. */
function addDocumentCloseListener(
    root: HTMLElement,
    state: { isOpen: boolean; destroyed: boolean }
): void
{
    const handler = (e: MouseEvent) =>
    {
        if (state.destroyed) { return; }
        if (!state.isOpen) { return; }
        if (!root.contains(e.target as Node))
        {
            closePanel(root, state);
        }
    };
    document.addEventListener("mousedown", handler, true);

    const keyHandler = (e: KeyboardEvent) =>
    {
        if (state.destroyed) { return; }
        if (!state.isOpen) { return; }
        if (e.key === "Escape")
        {
            e.preventDefault();
            closePanel(root, state);
        }
    };
    document.addEventListener("keydown", keyHandler, true);

    // Store handlers for cleanup on destroy
    (root as unknown as Record<string, unknown>)["_opDocClick"] = handler;
    (root as unknown as Record<string, unknown>)["_opDocKey"] = keyHandler;
}

/** Remove document-level listeners. */
function removeDocumentListeners(root: HTMLElement): void
{
    const click = (root as unknown as Record<string, unknown>)["_opDocClick"];
    const key = (root as unknown as Record<string, unknown>)["_opDocKey"];
    if (click) { document.removeEventListener("mousedown", click as EventListener, true); }
    if (key) { document.removeEventListener("keydown", key as EventListener, true); }
}

// ============================================================================
// S13: NULL PICKER (error fallback)
// ============================================================================

/** Return a no-op picker when container is not found. */
function createNullPicker(): OrientationPicker
{
    const noop = createElement("div", []);
    return {
        getValue: () => "portrait",
        setValue: () => {},
        show: () => {},
        hide: () => {},
        destroy: () => {},
        getElement: () => noop,
    };
}

// ============================================================================
// S14: PUBLIC API BUILDER
// ============================================================================

/** Build the public OrientationPicker API object. */
function buildApi(
    rootEl: HTMLElement,
    state: { value: "portrait" | "landscape"; isOpen: boolean; destroyed: boolean },
    options: OrientationPickerOptions
): OrientationPicker
{
    return {
        getValue(): "portrait" | "landscape"
        {
            return state.value;
        },

        setValue(orientation: "portrait" | "landscape"): void
        {
            if (orientation !== "portrait" && orientation !== "landscape")
            {
                console.warn(LOG_PREFIX, "invalid orientation:", orientation);
                return;
            }
            state.value = orientation;
            refreshItems(rootEl, state);
            updateTriggerFromRoot(rootEl, orientation);
        },

        show(): void
        {
            openPanel(rootEl, state);
        },

        hide(): void
        {
            closePanel(rootEl, state);
        },

        destroy(): void
        {
            if (state.destroyed) { return; }
            state.destroyed = true;
            removeDocumentListeners(rootEl);
            if (rootEl.parentElement)
            {
                rootEl.parentElement.removeChild(rootEl);
            }
            console.log(LOG_PREFIX, "destroyed");
        },

        getElement(): HTMLElement
        {
            return rootEl;
        },
    };
}

// ============================================================================
// S15: GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>)["createOrientationPicker"] = createOrientationPicker;
