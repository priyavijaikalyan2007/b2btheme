/*
 * ⚓ COMPONENT: Ribbon
 * 📜 PURPOSE: Microsoft Office-style tabbed toolbar with adaptive groups,
 *    multi-level KeyTips, optional menu bar, Quick Access Toolbar, backstage
 *    panel, gallery controls, 13 control types, and configurable colours.
 * 🔗 RELATES: [[EnterpriseTheme]], [[Toolbar]], [[CommandPalette]], [[Sidebar]]
 */

// ============================================================================
// S1: TYPES, INTERFACES, CONSTANTS
// ============================================================================

/** Ribbon button size variant. */
export type RibbonButtonSize = "large" | "small" | "mini";

/** Ribbon control type discriminator. */
export type RibbonControlType =
    | "button" | "split-button" | "gallery" | "dropdown"
    | "input" | "color" | "number" | "checkbox" | "toggle"
    | "separator" | "row-break" | "label" | "custom";

/** Collapse stage for adaptive layout. */
export type RibbonCollapseStage =
    "full" | "medium" | "small" | "mini" | "overflow";

/** Gallery layout direction. */
export type RibbonGalleryLayout = "grid" | "list";

/** QAT position relative to tabs. */
export type RibbonQATPosition = "above" | "below";

// ── Control interfaces ──

export interface RibbonControlBase
{
    type: RibbonControlType;
    id: string;
    label?: string;
    icon?: string;
    tooltip?: string;
    size?: RibbonButtonSize;
    disabled?: boolean;
    hidden?: boolean;
    keyTip?: string;
    cssClass?: string;
}

export interface RibbonButton extends RibbonControlBase
{
    type: "button";
    toggle?: boolean;
    active?: boolean;
    onClick?: (btn: RibbonButton, active: boolean) => void;
}

export interface RibbonSplitMenuItem
{
    id: string;
    label: string;
    icon?: string;
    disabled?: boolean;
    onClick?: (item: RibbonSplitMenuItem) => void;
}

export interface RibbonSplitButton extends RibbonControlBase
{
    type: "split-button";
    toggle?: boolean;
    active?: boolean;
    menuItems: RibbonSplitMenuItem[];
    onClick?: (btn: RibbonSplitButton, active: boolean) => void;
}

export interface RibbonGalleryOption
{
    id: string;
    label: string;
    icon?: string;
    color?: string;
    preview?: string;
    disabled?: boolean;
}

export interface RibbonGallery extends RibbonControlBase
{
    type: "gallery";
    options: RibbonGalleryOption[];
    selectedId?: string;
    columns?: number;
    layout?: RibbonGalleryLayout;
    inlineCount?: number;
    onSelect?: (option: RibbonGalleryOption) => void;
}

export interface RibbonDropdown extends RibbonControlBase
{
    type: "dropdown";
    options: { value: string; label: string }[];
    value?: string;
    width?: string;
    onChange?: (value: string) => void;
}

export interface RibbonInput extends RibbonControlBase
{
    type: "input";
    placeholder?: string;
    width?: string;
    value?: string;
    onInput?: (value: string) => void;
    onSubmit?: (value: string) => void;
}

export interface RibbonColorPicker extends RibbonControlBase
{
    type: "color";
    value?: string;
    showLabel?: boolean;
    onChange?: (value: string) => void;
    onInput?: (value: string) => void;
}

export interface RibbonNumberSpinner extends RibbonControlBase
{
    type: "number";
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    width?: string;
    onChange?: (value: number) => void;
}

export interface RibbonCheckbox extends RibbonControlBase
{
    type: "checkbox";
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

export interface RibbonToggleSwitch extends RibbonControlBase
{
    type: "toggle";
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

export interface RibbonSeparator extends RibbonControlBase
{
    type: "separator";
}

/** Invisible row break — forces the stacking algorithm to start a new stack. */
export interface RibbonRowBreak extends RibbonControlBase
{
    type: "row-break";
}

export interface RibbonLabel extends RibbonControlBase
{
    type: "label";
    text?: string;
    color?: string;
}

export interface RibbonCustom extends RibbonControlBase
{
    type: "custom";
    element: HTMLElement | (() => HTMLElement);
    width?: string;
}

/** Union of all ribbon control types. */
export type RibbonControl =
    | RibbonButton | RibbonSplitButton | RibbonGallery
    | RibbonDropdown | RibbonInput | RibbonColorPicker
    | RibbonNumberSpinner | RibbonCheckbox | RibbonToggleSwitch
    | RibbonSeparator | RibbonRowBreak | RibbonLabel | RibbonCustom;

// ── Organisation interfaces ──

export interface RibbonGroup
{
    id: string;
    label: string;
    controls: RibbonControl[];
    collapsePriority?: number;
    collapseStages?: RibbonCollapseStage[];
}

export interface RibbonBackstageItem
{
    id: string;
    label: string;
    icon?: string;
    onClick?: () => void;
    content?: HTMLElement | (() => HTMLElement);
}

export interface RibbonTab
{
    id: string;
    label: string;
    groups: RibbonGroup[];
    contextual?: boolean;
    accentColor?: string;
    backstage?: boolean;
    backstageContent?: HTMLElement | (() => HTMLElement);
    backstageSidebar?: RibbonBackstageItem[];
    keyTip?: string;
}

export interface RibbonMenuItem
{
    id: string;
    label: string;
    icon?: string;
    shortcut?: string;
    disabled?: boolean;
    type?: "item" | "separator" | "header";
    children?: RibbonMenuItem[];
    onClick?: () => void;
}

export interface RibbonMenuBarItem
{
    id: string;
    label: string;
    keyTip?: string;
    items: RibbonMenuItem[];
}

export interface RibbonQATItem
{
    id: string;
    icon: string;
    tooltip: string;
    keyTip?: string;
    disabled?: boolean;
    onClick?: () => void;
}

/** Colour options subset for setColors(). */
export interface RibbonColorOptions
{
    backgroundColor?: string;
    tabBarBackgroundColor?: string;
    tabTextColor?: string;
    tabActiveTextColor?: string;
    tabActiveBackgroundColor?: string;
    panelBackgroundColor?: string;
    groupLabelColor?: string;
    groupBorderColor?: string;
    controlColor?: string;
    controlHoverColor?: string;
    controlActiveColor?: string;
    qatBackgroundColor?: string;
    menuBarBackgroundColor?: string;
}

export interface RibbonOptions extends RibbonColorOptions
{
    tabs: RibbonTab[];
    activeTabId?: string;

    menuBar?: RibbonMenuBarItem[];
    qat?: RibbonQATItem[];
    qatPosition?: RibbonQATPosition;

    panelHeight?: number;
    groupOverflow?: "visible" | "hidden";

    collapsible?: boolean;
    collapsed?: boolean;
    adaptive?: boolean;
    keyTips?: boolean;

    onTabChange?: (tabId: string) => void;
    onCollapse?: (collapsed: boolean) => void;
    onQATCustomize?: (items: RibbonQATItem[]) => void;
    onControlClick?: (controlId: string) => void;

    /** Right-aligned status area in the tab bar (user info, entity name, etc.). */
    statusBar?: HTMLElement | (() => HTMLElement);

    /** Auto-collapse delay in ms after temp-expanding. 0 = disabled (default). Min 5000. */
    autoCollapseDelay?: number;

    cssClass?: string;
    keyBindings?: Partial<Record<string, string>>;
}

export interface Ribbon
{
    show(containerId?: string): void;
    hide(): void;
    destroy(): void;

    setActiveTab(tabId: string): void;
    getActiveTab(): string;
    addTab(tab: RibbonTab, index?: number): void;
    removeTab(tabId: string): void;
    showContextualTab(tabId: string): void;
    hideContextualTab(tabId: string): void;

    setControlDisabled(id: string, disabled: boolean): void;
    setControlHidden(id: string, hidden: boolean): void;
    setControlActive(id: string, active: boolean): void;
    getControlValue(id: string): string | number | boolean;
    setControlValue(id: string, value: string | number | boolean): void;

    addQATItem(item: RibbonQATItem): void;
    removeQATItem(id: string): void;

    collapse(): void;
    expand(): void;
    toggleCollapse(): void;
    isCollapsed(): boolean;

    openBackstage(): void;
    closeBackstage(): void;

    setStatusBar(element: HTMLElement | (() => HTMLElement) | null): void;
    getStatusBarElement(): HTMLElement | null;

    setAutoCollapseDelay(ms: number): void;
    getAutoCollapseDelay(): number;

    getState(): RibbonState;
    restoreState(state: Partial<RibbonState>): void;

    setColors(colors: Partial<RibbonColorOptions>): void;
    getElement(): HTMLElement;
}

/** Serialisable snapshot of ribbon UI state for persistence. */
export interface RibbonState
{
    activeTabId: string;
    collapsed: boolean;
    contextualTabs: Record<string, boolean>;
    controlValues: Record<string, string | number | boolean>;
    autoCollapseDelay: number;
}

// ── Constants ──

const LOG_PREFIX = "[Ribbon]";
const CLS = "ribbon";
let instanceCounter = 0;

const DEFAULT_PANEL_HEIGHT = 96;
const DEFAULT_QAT_POSITION: RibbonQATPosition = "above";
const DEBOUNCE_RESIZE_MS = 150;
const SUBMENU_DELAY_MS = 300;
const TRANSITION_MS = 200;

const Z_RIBBON_DROPDOWN = 1060;
const Z_RIBBON_BACKSTAGE = 1070;

const FOCUSABLE_SELECTOR =
    "button:not([disabled]):not([tabindex='-1']):not([aria-hidden='true']),"
    + "input:not([disabled]):not([type='hidden']),"
    + "select:not([disabled]),"
    + "[tabindex='0']";

const DEFAULT_COLLAPSE_STAGES: RibbonCollapseStage[] =
    ["full", "medium", "small", "mini", "overflow"];

const DEFAULT_KEY_BINDINGS: Record<string, string> =
{
    toggleKeyTips: "Alt",
    dismissKeyTips: "Escape",
    closePopup: "Escape",
    collapseRibbon: "Ctrl+F1",
};

/** Maps colour option keys to CSS custom property names. */
const COLOR_MAP: Record<string, string> =
{
    backgroundColor:          "--ribbon-bg",
    tabBarBackgroundColor:    "--ribbon-tab-bar-bg",
    tabTextColor:             "--ribbon-tab-color",
    tabActiveTextColor:       "--ribbon-tab-active-color",
    tabActiveBackgroundColor: "--ribbon-tab-active-bg",
    panelBackgroundColor:     "--ribbon-panel-bg",
    groupLabelColor:          "--ribbon-group-label-color",
    groupBorderColor:         "--ribbon-group-border-color",
    controlColor:             "--ribbon-control-color",
    controlHoverColor:        "--ribbon-control-hover-bg",
    controlActiveColor:       "--ribbon-control-active-bg",
    qatBackgroundColor:       "--ribbon-qat-bg",
    menuBarBackgroundColor:   "--ribbon-menubar-bg",
};

// ============================================================================
// S2: DOM HELPERS (inlined — no cross-module imports with IIFE)
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

function addIconClasses(el: HTMLElement, iconStr: string): void
{
    const parts = iconStr.trim().split(/\s+/);
    for (const p of parts) { if (p) { el.classList.add(p); } }
}

function clamp(value: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, value));
}

function debounce(fn: () => void, ms: number): () => void
{
    let timer: number | undefined;
    return () =>
    {
        if (timer !== undefined) { clearTimeout(timer); }
        timer = window.setTimeout(() => { timer = undefined; fn(); }, ms);
    };
}

function safeCallback<T extends unknown[]>(
    fn: ((...args: T) => void) | undefined, ...args: T
): void
{
    if (!fn) { return; }
    try { fn(...args); }
    catch (err) { console.error(LOG_PREFIX, "callback error:", err); }
}

function genId(prefix: string): string
{
    return prefix + "-" + (++instanceCounter);
}

function prefersReducedMotion(): boolean
{
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearChildren(el: HTMLElement): void
{
    while (el.firstChild) { el.removeChild(el.firstChild); }
}

function sanitiseHTML(html: string): string
{
    const w = window as unknown as Record<string, unknown>;
    if (typeof w["DOMPurify"] === "object" && w["DOMPurify"] !== null)
    {
        const dp = w["DOMPurify"] as { sanitize: (h: string) => string };
        return dp.sanitize(html);
    }
    // Fallback: strip scripts/events but allow safe inline tags
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\bon\w+\s*=/gi, "data-removed=");
}

// ============================================================================
// S3: CLASS — LIFECYCLE
// ============================================================================

export class RibbonImpl implements Ribbon
{
    private readonly ribbonId: string;
    private readonly opts: Required<Pick<RibbonOptions,
        "collapsible" | "adaptive" | "keyTips" | "panelHeight" | "groupOverflow" | "qatPosition" | "autoCollapseDelay"
    >> & RibbonOptions;

    private tabs: RibbonTab[];
    private activeTabId: string;
    private collapsed: boolean;
    private tempExpanded: boolean;
    private visible: boolean;
    private destroyed: boolean;
    private backstageOpen: boolean;

    // DOM
    private rootEl: HTMLElement | null = null;
    private qatEl: HTMLElement | null = null;
    private menuBarEl: HTMLElement | null = null;
    private tabBarEl: HTMLElement | null = null;
    private panelEl: HTMLElement | null = null;
    private backstageEl: HTMLElement | null = null;
    private keyTipLayerEl: HTMLElement | null = null;
    private statusBarEl: HTMLElement | null = null;
    private statusBarContent: HTMLElement | (() => HTMLElement) | null = null;

    // Maps for O(1) lookups
    private controlEls = new Map<string, HTMLElement>();
    private controlConfigs = new Map<string, RibbonControl>();
    private groupEls = new Map<string, HTMLElement>();
    private tabEls = new Map<string, HTMLElement>();
    private tabContentEls = new Map<string, HTMLElement>();
    private splitMenuEls = new Map<string, HTMLElement>();
    private galleryPopupEls = new Map<string, HTMLElement>();
    private overflowPopupEls = new Map<string, HTMLElement>();

    // Adaptive collapse
    private groupStages = new Map<string, number>();

    // KeyTip state
    private keyTipLevel: "none" | "tabs" | "groups" = "none";
    private keyTipBadges: HTMLElement[] = [];

    // Menu bar state
    private openMenuId: string | null = null;
    private submenuTimers = new Map<string, number>();
    private menuDropdownEls = new Map<string, HTMLElement>();

    // Popup tracking
    private openPopupType: string | null = null;
    private openPopupId: string | null = null;

    // Auto-collapse timer
    private autoCollapseTimer: number | undefined;
    private boundAutoCollapseReset: (() => void) | null = null;

    // Bound handlers
    private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
    private boundClickOutside: ((e: PointerEvent) => void) | null = null;
    private boundResize: (() => void) | null = null;

    // ResizeObserver
    private resizeObserver: ResizeObserver | null = null;
    private previousFocusEl: HTMLElement | null = null;

    // QAT items (mutable copy)
    private qatItems: RibbonQATItem[];

    constructor(options: RibbonOptions)
    {
        this.ribbonId = genId("ribbon");
        this.tabs = [...options.tabs];
        this.qatItems = options.qat ? [...options.qat] : [];

        this.opts = {
            ...options,
            collapsible: options.collapsible ?? true,
            adaptive: options.adaptive ?? true,
            keyTips: options.keyTips ?? true,
            panelHeight: options.panelHeight ?? DEFAULT_PANEL_HEIGHT,
            groupOverflow: options.groupOverflow ?? "visible",
            qatPosition: options.qatPosition ?? DEFAULT_QAT_POSITION,
            autoCollapseDelay: options.autoCollapseDelay ?? 0,
        };

        this.statusBarContent = options.statusBar ?? null;

        this.activeTabId = options.activeTabId
            || this.firstVisibleTabId() || "";
        this.collapsed = options.collapsed ?? false;
        this.tempExpanded = false;
        this.visible = false;
        this.destroyed = false;
        this.backstageOpen = false;

        console.log(LOG_PREFIX, "created", this.ribbonId);
    }

    // ── Public lifecycle ──

    public show(containerId?: string): void
    {
        if (this.destroyed) { return; }
        if (this.visible && this.rootEl) { return; }

        this.buildDOM();
        this.mountTo(containerId);
        this.attachListeners();
        this.applyColors(this.opts);
        this.visible = true;

        if (this.opts.adaptive)
        {
            this.initResizeObserver();
            // Run immediately to prevent flash of overflowed layout
            requestAnimationFrame(() => this.runAdaptiveCollapse());
        }

        console.log(LOG_PREFIX, "shown", this.ribbonId);
    }

    public hide(): void
    {
        if (!this.visible || !this.rootEl) { return; }
        this.rootEl.style.display = "none";
        this.visible = false;
    }

    public destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.clearAutoCollapseTimer();
        this.detachListeners();
        this.destroyResizeObserver();
        this.clearSubmenuTimers();
        this.rootEl?.remove();
        this.rootEl = null;
        this.controlEls.clear();
        this.controlConfigs.clear();
        this.groupEls.clear();
        this.tabEls.clear();
        this.tabContentEls.clear();
        this.splitMenuEls.clear();
        this.galleryPopupEls.clear();
        this.overflowPopupEls.clear();
        this.menuDropdownEls.clear();
        this.statusBarEl = null;
        this.statusBarContent = null;
        console.log(LOG_PREFIX, "destroyed", this.ribbonId);
    }

    // ============================================================================
    // S4: PUBLIC API — TABS
    // ============================================================================

    public setActiveTab(tabId: string): void
    {
        if (this.destroyed) { return; }
        const tab = this.findTab(tabId);
        if (!tab) { return; }

        if (tab.backstage)
        {
            this.openBackstage();
            return;
        }

        if (this.backstageOpen) { this.closeBackstage(); }

        const prev = this.activeTabId;
        this.activeTabId = tabId;
        this.updateTabBar();
        this.swapTabContent(tabId);

        if (this.collapsed && !this.tempExpanded)
        {
            this.tempExpanded = true;
            this.showPanel();
            this.startAutoCollapseTimer();
        }

        if (prev !== tabId)
        {
            safeCallback(this.opts.onTabChange, tabId);
        }
    }

    public getActiveTab(): string
    {
        return this.activeTabId;
    }

    public addTab(tab: RibbonTab, index?: number): void
    {
        if (this.destroyed) { return; }
        if (index !== undefined)
        {
            this.tabs.splice(index, 0, tab);
        }
        else
        {
            this.tabs.push(tab);
        }
        this.rebuildTabBar();
    }

    public removeTab(tabId: string): void
    {
        if (this.destroyed) { return; }
        this.tabs = this.tabs.filter(t => t.id !== tabId);
        if (this.activeTabId === tabId)
        {
            this.activeTabId = this.firstVisibleTabId() || "";
        }
        this.rebuildTabBar();
        this.swapTabContent(this.activeTabId);
    }

    public showContextualTab(tabId: string): void
    {
        if (this.destroyed) { return; }
        const el = this.tabEls.get(tabId);
        if (el) { el.style.display = ""; }
    }

    public hideContextualTab(tabId: string): void
    {
        if (this.destroyed) { return; }
        const el = this.tabEls.get(tabId);
        if (el) { el.style.display = "none"; }
        if (this.activeTabId === tabId)
        {
            this.activeTabId = this.firstVisibleTabId() || "";
            this.updateTabBar();
            this.swapTabContent(this.activeTabId);
        }
    }

    // ============================================================================
    // S5: PUBLIC API — CONTROL STATE
    // ============================================================================

    public setControlDisabled(id: string, disabled: boolean): void
    {
        const el = this.controlEls.get(id);
        if (!el) { return; }
        if (disabled)
        {
            el.classList.add(`${CLS}-control-disabled`);
            setAttr(el, { "aria-disabled": "true" });
            const btn = el.querySelector("button, input, select") as HTMLElement;
            if (btn) { (btn as HTMLButtonElement).disabled = true; }
        }
        else
        {
            el.classList.remove(`${CLS}-control-disabled`);
            el.removeAttribute("aria-disabled");
            const btn = el.querySelector("button, input, select") as HTMLElement;
            if (btn) { (btn as HTMLButtonElement).disabled = false; }
        }
    }

    public setControlHidden(id: string, hidden: boolean): void
    {
        const el = this.controlEls.get(id);
        if (el) { el.style.display = hidden ? "none" : ""; }
    }

    public setControlActive(id: string, active: boolean): void
    {
        const el = this.controlEls.get(id);
        if (!el) { return; }
        if (active)
        {
            el.classList.add(`${CLS}-control-active`);
            el.setAttribute("aria-pressed", "true");
        }
        else
        {
            el.classList.remove(`${CLS}-control-active`);
            el.setAttribute("aria-pressed", "false");
        }
    }

    public getControlValue(id: string): string | number | boolean
    {
        const el = this.controlEls.get(id);
        if (!el) { return ""; }
        const input = el.querySelector("input, select") as
            HTMLInputElement | HTMLSelectElement | null;
        if (!input) { return ""; }
        if (input.type === "checkbox") { return (input as HTMLInputElement).checked; }
        if (input.type === "number") { return parseFloat(input.value) || 0; }
        return input.value;
    }

    public setControlValue(
        id: string, value: string | number | boolean
    ): void
    {
        const el = this.controlEls.get(id);
        if (!el) { return; }
        const input = el.querySelector("input, select") as
            HTMLInputElement | HTMLSelectElement | null;
        if (!input) { return; }
        if (input.type === "checkbox")
        {
            (input as HTMLInputElement).checked = !!value;
        }
        else
        {
            input.value = String(value);
        }
    }

    // ============================================================================
    // S6: PUBLIC API — QAT, COLLAPSE, BACKSTAGE, COLORS
    // ============================================================================

    public addQATItem(item: RibbonQATItem): void
    {
        this.qatItems.push(item);
        this.rebuildQAT();
    }

    public removeQATItem(id: string): void
    {
        this.qatItems = this.qatItems.filter(q => q.id !== id);
        this.rebuildQAT();
    }

    public collapse(): void
    {
        if (!this.opts.collapsible || this.collapsed) { return; }
        this.collapsed = true;
        this.tempExpanded = false;
        this.clearAutoCollapseTimer();
        this.hidePanel();
        this.updateCollapseBtn();
        safeCallback(this.opts.onCollapse, true);
    }

    public expand(): void
    {
        if (!this.collapsed) { return; }
        this.collapsed = false;
        this.tempExpanded = false;
        this.clearAutoCollapseTimer();
        this.showPanel();
        this.updateCollapseBtn();
        safeCallback(this.opts.onCollapse, false);
    }

    public toggleCollapse(): void
    {
        if (this.collapsed) { this.expand(); } else { this.collapse(); }
    }

    public isCollapsed(): boolean
    {
        return this.collapsed;
    }

    public openBackstage(): void
    {
        if (this.destroyed || this.backstageOpen) { return; }
        this.previousFocusEl = document.activeElement as HTMLElement;
        this.backstageOpen = true;
        this.buildBackstage();
        if (this.backstageEl)
        {
            this.backstageEl.style.display = "flex";
            this.focusFirstInBackstage();
        }
    }

    public closeBackstage(): void
    {
        if (!this.backstageOpen) { return; }
        this.backstageOpen = false;
        if (this.backstageEl)
        {
            this.backstageEl.style.display = "none";
        }
        if (this.previousFocusEl)
        {
            this.previousFocusEl.focus();
            this.previousFocusEl = null;
        }
    }

    public setColors(colors: Partial<RibbonColorOptions>): void
    {
        this.applyColors(colors);
    }

    public getElement(): HTMLElement
    {
        return this.rootEl!;
    }

    // ============================================================================
    // S7: PRIVATE — DOM BUILD
    // ============================================================================

    private buildDOM(): void
    {
        const root = createElement("div", [CLS]);
        root.id = this.ribbonId;
        if (this.opts.cssClass) { root.classList.add(this.opts.cssClass); }

        this.appendQAT(root, "above");
        this.appendMenuBar(root);

        this.tabBarEl = this.buildTabBar();
        root.appendChild(this.tabBarEl);

        this.appendQAT(root, "below");
        this.appendPanel(root);
        this.appendBackstageShell(root);
        this.appendKeyTipLayer(root);

        this.rootEl = root;
        this.swapTabContent(this.activeTabId);
    }

    private appendQAT(root: HTMLElement, position: RibbonQATPosition): void
    {
        if (this.qatItems.length > 0 && this.opts.qatPosition === position)
        {
            this.qatEl = this.buildQAT();
            root.appendChild(this.qatEl);
        }
    }

    private appendMenuBar(root: HTMLElement): void
    {
        if (this.opts.menuBar && this.opts.menuBar.length > 0)
        {
            this.menuBarEl = this.buildMenuBar();
            root.appendChild(this.menuBarEl);
        }
    }

    private appendPanel(root: HTMLElement): void
    {
        this.panelEl = this.buildPanel();
        root.appendChild(this.panelEl);
        if (this.collapsed) { this.hidePanel(); }
    }

    private appendBackstageShell(root: HTMLElement): void
    {
        this.backstageEl = createElement("div", [`${CLS}-backstage`]);
        this.backstageEl.style.display = "none";
        setAttr(this.backstageEl, {
            "role": "dialog", "aria-modal": "true", "aria-label": "Backstage",
        });
        root.appendChild(this.backstageEl);
    }

    private appendKeyTipLayer(root: HTMLElement): void
    {
        this.keyTipLayerEl = createElement("div", [`${CLS}-keytip-layer`]);
        setAttr(this.keyTipLayerEl, { "aria-hidden": "true" });
        root.appendChild(this.keyTipLayerEl);
    }

    private mountTo(containerId?: string): void
    {
        if (!this.rootEl) { return; }
        let container: HTMLElement | null = null;
        if (containerId)
        {
            container = typeof containerId === "string"
                ? document.getElementById(containerId)
                : null;
        }
        if (!container) { container = document.body; }
        container.appendChild(this.rootEl);
    }

    // ── QAT ──

    private buildQAT(): HTMLElement
    {
        const qat = createElement("div", [`${CLS}-qat`]);
        setAttr(qat, { "role": "toolbar", "aria-label": "Quick Access" });
        this.populateQAT(qat);
        return qat;
    }

    private populateQAT(qat: HTMLElement): void
    {
        clearChildren(qat);
        for (const item of this.qatItems)
        {
            const btn = createElement("button", [`${CLS}-qat-btn`]);
            setAttr(btn, {
                "type": "button",
                "aria-label": item.tooltip,
                "title": item.tooltip,
            });
            if (item.disabled) { (btn as HTMLButtonElement).disabled = true; }
            const icon = createElement("i", []);
            addIconClasses(icon, item.icon);
            btn.appendChild(icon);
            btn.addEventListener("click", () =>
            {
                safeCallback(item.onClick);
                safeCallback(this.opts.onControlClick, item.id);
            });
            if (item.keyTip) { btn.dataset.keyTip = item.keyTip; }
            qat.appendChild(btn);
        }
    }

    private rebuildQAT(): void
    {
        if (!this.qatEl) { return; }
        this.populateQAT(this.qatEl);
    }

    // ── Menu bar ──

    private buildMenuBar(): HTMLElement
    {
        const bar = createElement("div", [`${CLS}-menubar`]);
        setAttr(bar, { "role": "menubar" });

        for (const menuItem of this.opts.menuBar!)
        {
            const item = this.buildMenuBarItem(menuItem);
            bar.appendChild(item);
        }

        return bar;
    }

    private buildMenuBarItem(menuDef: RibbonMenuBarItem): HTMLElement
    {
        const wrapper = createElement("div", [`${CLS}-menu-item`]);
        const trigger = createElement("button", [`${CLS}-menu-trigger`], menuDef.label);
        setAttr(trigger, { "type": "button", "aria-haspopup": "true", "aria-expanded": "false" });
        if (menuDef.keyTip) { trigger.dataset.keyTip = menuDef.keyTip; }
        const dropdown = this.buildMenuDropdown(menuDef.items);
        dropdown.style.display = "none";
        this.menuDropdownEls.set(menuDef.id, dropdown);
        this.attachMenuBarTriggers(menuDef, trigger, dropdown);
        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);
        return wrapper;
    }

    private attachMenuBarTriggers(
        menuDef: RibbonMenuBarItem, trigger: HTMLElement, dropdown: HTMLElement
    ): void
    {
        trigger.addEventListener("click", () =>
        {
            this.toggleMenu(menuDef.id, trigger, dropdown);
        });
        trigger.addEventListener("mouseenter", () =>
        {
            if (this.openMenuId && this.openMenuId !== menuDef.id)
            {
                this.closeAllMenus();
                this.openMenu(menuDef.id, trigger, dropdown);
            }
        });
    }

    private buildMenuDropdown(items: RibbonMenuItem[]): HTMLElement
    {
        const menu = createElement("div", [`${CLS}-menu-dropdown`]);
        setAttr(menu, { "role": "menu" });

        for (const item of items)
        {
            menu.appendChild(this.buildMenuEntry(item, menu));
        }
        return menu;
    }

    private buildMenuEntry(
        item: RibbonMenuItem, _parentMenu: HTMLElement
    ): HTMLElement
    {
        if (item.type === "separator")
        {
            return createElement("div", [`${CLS}-menu-separator`]);
        }
        if (item.type === "header")
        {
            return createElement("div", [`${CLS}-menu-header`], item.label);
        }

        const entry = this.buildMenuEntryButton(item);
        this.appendMenuEntryContent(entry, item);

        if (item.children && item.children.length > 0)
        {
            this.attachSubmenuBehaviour(entry, item);
        }
        else
        {
            this.attachMenuItemClick(entry, item);
        }
        return entry;
    }

    private buildMenuEntryButton(item: RibbonMenuItem): HTMLElement
    {
        const entry = createElement("button", [`${CLS}-menu-entry`]);
        setAttr(entry, { "type": "button", "role": "menuitem" });
        if (item.disabled)
        {
            (entry as HTMLButtonElement).disabled = true;
            setAttr(entry, { "aria-disabled": "true" });
        }
        return entry;
    }

    private appendMenuEntryContent(
        entry: HTMLElement, item: RibbonMenuItem
    ): void
    {
        if (item.icon)
        {
            const icon = createElement("i", [`${CLS}-menu-entry-icon`]);
            addIconClasses(icon, item.icon);
            entry.appendChild(icon);
        }
        entry.appendChild(createElement("span", [`${CLS}-menu-entry-label`], item.label));
        if (item.shortcut)
        {
            entry.appendChild(createElement("span", [`${CLS}-menu-entry-shortcut`], item.shortcut));
        }
    }

    private attachSubmenuBehaviour(
        entry: HTMLElement, item: RibbonMenuItem
    ): void
    {
        const arrow = createElement("i", [`${CLS}-menu-submenu-arrow`]);
        addIconClasses(arrow, "bi bi-chevron-right");
        entry.appendChild(arrow);

        const sub = this.buildMenuDropdown(item.children!);
        sub.classList.add(`${CLS}-menu-submenu`);
        sub.style.display = "none";

        entry.addEventListener("mouseenter", () => this.scheduleSubmenu(item.id, sub, true));
        entry.addEventListener("mouseleave", () => this.scheduleSubmenu(item.id, sub, false));
        entry.addEventListener("keydown", (e: KeyboardEvent) =>
        {
            if (e.key === "ArrowRight")
            {
                e.preventDefault();
                sub.style.display = "flex";
                this.focusFirstMenuItem(sub);
            }
        });
        entry.appendChild(sub);
    }

    private attachMenuItemClick(
        entry: HTMLElement, item: RibbonMenuItem
    ): void
    {
        entry.addEventListener("click", () =>
        {
            if (!item.disabled)
            {
                safeCallback(item.onClick);
                this.closeAllMenus();
            }
        });
    }

    private scheduleSubmenu(
        id: string, sub: HTMLElement, show: boolean
    ): void
    {
        const existing = this.submenuTimers.get(id);
        if (existing !== undefined) { clearTimeout(existing); }

        if (show)
        {
            const timer = window.setTimeout(() =>
            {
                sub.style.display = "flex";
                this.submenuTimers.delete(id);
            }, SUBMENU_DELAY_MS);
            this.submenuTimers.set(id, timer);
        }
        else
        {
            const timer = window.setTimeout(() =>
            {
                sub.style.display = "none";
                this.submenuTimers.delete(id);
            }, SUBMENU_DELAY_MS);
            this.submenuTimers.set(id, timer);
        }
    }

    private clearSubmenuTimers(): void
    {
        for (const t of this.submenuTimers.values()) { clearTimeout(t); }
        this.submenuTimers.clear();
    }

    private toggleMenu(
        id: string, trigger: HTMLElement, dropdown: HTMLElement
    ): void
    {
        if (this.openMenuId === id)
        {
            this.closeAllMenus();
        }
        else
        {
            this.closeAllMenus();
            this.openMenu(id, trigger, dropdown);
        }
    }

    private openMenu(
        id: string, trigger: HTMLElement, dropdown: HTMLElement
    ): void
    {
        this.openMenuId = id;
        dropdown.style.display = "flex";
        trigger.setAttribute("aria-expanded", "true");
        this.positionMenuDropdown(trigger, dropdown);
    }

    private closeAllMenus(): void
    {
        this.openMenuId = null;
        this.clearSubmenuTimers();
        for (const dd of this.menuDropdownEls.values())
        {
            dd.style.display = "none";
            const subs = dd.querySelectorAll(`.${CLS}-menu-submenu`);
            subs.forEach(s => (s as HTMLElement).style.display = "none");
        }
        if (this.menuBarEl)
        {
            const triggers = this.menuBarEl.querySelectorAll(`.${CLS}-menu-trigger`);
            triggers.forEach(t => t.setAttribute("aria-expanded", "false"));
        }
    }

    private positionMenuDropdown(
        trigger: HTMLElement, dropdown: HTMLElement
    ): void
    {
        const tr = trigger.getBoundingClientRect();
        dropdown.style.position = "fixed";
        dropdown.style.top = `${tr.bottom}px`;
        dropdown.style.left = `${tr.left}px`;
        dropdown.style.zIndex = String(Z_RIBBON_DROPDOWN);
    }

    private focusFirstMenuItem(menu: HTMLElement): void
    {
        const first = menu.querySelector(
            `button.${CLS}-menu-entry:not([disabled])`
        ) as HTMLElement | null;
        if (first) { first.focus(); }
    }

    // ── Tab bar ──

    private buildTabBar(): HTMLElement
    {
        const bar = createElement("div", [`${CLS}-tabbar`]);
        setAttr(bar, { "role": "tablist" });
        this.populateTabBar(bar);
        return bar;
    }

    private populateTabBar(bar: HTMLElement): void
    {
        clearChildren(bar);
        this.tabEls.clear();
        this.statusBarEl = null;

        for (const tab of this.tabs)
        {
            const btn = this.buildTabButton(tab);
            this.tabEls.set(tab.id, btn);
            bar.appendChild(btn);
        }

        if (this.statusBarContent)
        {
            bar.appendChild(this.buildStatusBar());
        }

        if (this.opts.collapsible)
        {
            bar.appendChild(this.buildCollapseButton());
        }
    }

    private buildTabButton(tab: RibbonTab): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-tab`], tab.label);
        setAttr(btn, {
            "type": "button", "role": "tab",
            "aria-selected": tab.id === this.activeTabId ? "true" : "false",
            "aria-controls": `${this.ribbonId}-panel`,
            "data-tab-id": tab.id,
        });
        if (tab.contextual)
        {
            btn.classList.add(`${CLS}-tab-contextual`);
            if (tab.accentColor)
            {
                btn.style.setProperty("--ribbon-contextual-accent", tab.accentColor);
            }
            btn.style.display = "none";
        }
        if (tab.id === this.activeTabId) { btn.classList.add(`${CLS}-tab-active`); }
        if (tab.keyTip) { btn.dataset.keyTip = tab.keyTip; }
        btn.addEventListener("click", () => this.handleTabClick(tab));
        return btn;
    }

    private buildCollapseButton(): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-collapse-btn`]);
        const label = this.collapsed ? "Expand ribbon" : "Collapse ribbon";
        setAttr(btn, { "type": "button", "aria-label": label, "title": label });
        const icon = createElement("i", []);
        addIconClasses(icon, this.collapsed ? "bi bi-chevron-down" : "bi bi-chevron-up");
        btn.appendChild(icon);
        btn.addEventListener("click", () => this.toggleCollapse());
        btn.dataset.collapseBtn = "true";
        return btn;
    }

    /** Creates the .ribbon-tabbar-status wrapper and resolves the content. */
    private buildStatusBar(): HTMLElement
    {
        const wrapper = createElement("div", [`${CLS}-tabbar-status`]);
        const content = this.resolveStatusBarContent();
        if (content)
        {
            wrapper.appendChild(content);
        }
        this.statusBarEl = wrapper;
        return wrapper;
    }

    /** Resolves statusBarContent — calls factory once or returns the element. */
    private resolveStatusBarContent(): HTMLElement | null
    {
        if (!this.statusBarContent) { return null; }
        if (typeof this.statusBarContent === "function")
        {
            return this.statusBarContent();
        }
        return this.statusBarContent;
    }

    public setStatusBar(
        element: HTMLElement | (() => HTMLElement) | null
    ): void
    {
        if (this.destroyed) { return; }
        this.statusBarContent = element;

        // Remove existing status bar wrapper
        if (this.statusBarEl)
        {
            this.statusBarEl.remove();
            this.statusBarEl = null;
        }

        // Insert new wrapper if content provided
        if (element && this.tabBarEl)
        {
            const wrapper = this.buildStatusBar();
            const collapseBtn = this.tabBarEl.querySelector(
                `[data-collapse-btn]`
            );
            if (collapseBtn)
            {
                this.tabBarEl.insertBefore(wrapper, collapseBtn);
            }
            else
            {
                this.tabBarEl.appendChild(wrapper);
            }
        }
        console.log(LOG_PREFIX, "statusBar updated");
    }

    public getStatusBarElement(): HTMLElement | null
    {
        return this.statusBarEl;
    }

    private rebuildTabBar(): void
    {
        if (this.tabBarEl) { this.populateTabBar(this.tabBarEl); }
    }

    private updateTabBar(): void
    {
        for (const [id, el] of this.tabEls)
        {
            const isActive = id === this.activeTabId;
            el.classList.toggle(`${CLS}-tab-active`, isActive);
            el.setAttribute("aria-selected", isActive ? "true" : "false");
        }
    }

    private updateCollapseBtn(): void
    {
        if (!this.tabBarEl) { return; }
        const btn = this.tabBarEl.querySelector(`[data-collapse-btn]`) as HTMLElement;
        if (!btn) { return; }
        const label = this.collapsed ? "Expand ribbon" : "Collapse ribbon";
        setAttr(btn, { "aria-label": label, "title": label });
        const icon = btn.querySelector("i");
        if (icon)
        {
            icon.className = "";
            addIconClasses(icon, this.collapsed ? "bi bi-chevron-down" : "bi bi-chevron-up");
        }
    }

    private handleTabClick(tab: RibbonTab): void
    {
        if (tab.backstage)
        {
            this.openBackstage();
            return;
        }

        if (this.collapsed && this.tempExpanded && this.activeTabId === tab.id)
        {
            this.tempExpanded = false;
            this.clearAutoCollapseTimer();
            this.hidePanel();
            return;
        }

        this.setActiveTab(tab.id);
    }

    // ── Panel ──

    private buildPanel(): HTMLElement
    {
        const panel = createElement("div", [`${CLS}-panel`]);
        setAttr(panel, {
            "role": "tabpanel",
            "id": `${this.ribbonId}-panel`,
        });
        panel.style.height = `${this.opts.panelHeight}px`;
        return panel;
    }

    private showPanel(): void
    {
        if (this.panelEl) { this.panelEl.style.display = ""; }
    }

    private hidePanel(): void
    {
        if (this.panelEl) { this.panelEl.style.display = "none"; }
    }

    // ============================================================================
    // S8: PRIVATE — TAB CONTENT & GROUPS
    // ============================================================================

    private swapTabContent(tabId: string): void
    {
        if (!this.panelEl) { return; }

        // Detach current content
        while (this.panelEl.firstChild)
        {
            this.panelEl.removeChild(this.panelEl.firstChild);
        }

        // Check cache
        let content = this.tabContentEls.get(tabId);
        if (!content)
        {
            const tab = this.findTab(tabId);
            if (!tab) { return; }
            content = this.buildTabContent(tab);
            this.tabContentEls.set(tabId, content);
        }

        this.panelEl.appendChild(content);

        if (this.opts.adaptive)
        {
            this.runAdaptiveCollapse();
        }
    }

    private buildTabContent(tab: RibbonTab): HTMLElement
    {
        const wrapper = createElement("div", [`${CLS}-tab-content`]);

        for (let i = 0; i < tab.groups.length; i++)
        {
            if (i > 0)
            {
                wrapper.appendChild(
                    createElement("div", [`${CLS}-group-separator`])
                );
            }
            const groupEl = this.buildGroup(tab.groups[i]);
            wrapper.appendChild(groupEl);
        }

        return wrapper;
    }

    private buildGroup(group: RibbonGroup): HTMLElement
    {
        const el = createElement("div", [`${CLS}-group`]);
        setAttr(el, { "role": "group", "aria-label": group.label, "data-group-id": group.id });

        const content = createElement("div", [`${CLS}-group-content`]);
        if (this.opts.groupOverflow === "visible")
        {
            content.style.overflow = "visible";
        }

        this.buildGroupControls(content, group.controls);

        const label = createElement("div", [`${CLS}-group-label`], group.label);
        el.appendChild(content);
        el.appendChild(label);

        this.groupEls.set(group.id, el);
        this.groupStages.set(group.id, 0);
        return el;
    }

    private buildGroupControls(
        container: HTMLElement, controls: RibbonControl[]
    ): void
    {
        const ctx = { stack: null as HTMLElement | null, count: 0,
            rowParent: null as HTMLElement | null, row: null as HTMLElement | null };

        for (const ctrl of controls)
        {
            if (ctrl.hidden) { continue; }
            if (ctrl.type === "row-break")
            {
                this.handleRowBreak(container, ctx);
                continue;
            }
            const size = ctrl.size || "small";
            const stackable = (size === "small" || size === "mini") && ctrl.type !== "separator";
            if (ctx.row && stackable) { ctx.row.appendChild(this.buildControl(ctrl)); }
            else if (stackable)       { this.appendToStack(container, ctx, ctrl); }
            else                      { this.appendDirect(container, ctx, ctrl); }
        }
    }

    private handleRowBreak(
        container: HTMLElement, ctx: { stack: HTMLElement | null; count: number;
            rowParent: HTMLElement | null; row: HTMLElement | null }
    ): void
    {
        if (!ctx.rowParent)
        {
            ctx.rowParent = createElement("div", [`${CLS}-stack`]);
            container.appendChild(ctx.rowParent);
        }
        ctx.row = createElement("div", [`${CLS}-row`]);
        ctx.rowParent.appendChild(ctx.row);
        ctx.stack = null; ctx.count = 0;
    }

    private appendToStack(
        container: HTMLElement, ctx: { stack: HTMLElement | null; count: number },
        ctrl: RibbonControl
    ): void
    {
        if (!ctx.stack || ctx.count >= 3)
        {
            ctx.stack = createElement("div", [`${CLS}-stack`]);
            container.appendChild(ctx.stack);
            ctx.count = 0;
        }
        ctx.stack.appendChild(this.buildControl(ctrl));
        ctx.count++;
    }

    private appendDirect(
        container: HTMLElement, ctx: { stack: HTMLElement | null; count: number;
            rowParent: HTMLElement | null; row: HTMLElement | null },
        ctrl: RibbonControl
    ): void
    {
        ctx.stack = null; ctx.count = 0;
        ctx.row = null; ctx.rowParent = null;
        container.appendChild(this.buildControl(ctrl));
    }


    // ============================================================================
    // S9: PRIVATE — CONTROL BUILDERS
    // ============================================================================

    private buildControl(ctrl: RibbonControl): HTMLElement
    {
        let el: HTMLElement;

        switch (ctrl.type)
        {
            case "button":       el = this.buildButton(ctrl); break;
            case "split-button": el = this.buildSplitButton(ctrl); break;
            case "gallery":      el = this.buildGalleryControl(ctrl); break;
            case "dropdown":     el = this.buildDropdown(ctrl); break;
            case "input":        el = this.buildInput(ctrl); break;
            case "color":        el = this.buildColorPicker(ctrl); break;
            case "number":       el = this.buildNumberSpinner(ctrl); break;
            case "checkbox":     el = this.buildCheckboxControl(ctrl); break;
            case "toggle":       el = this.buildToggleControl(ctrl); break;
            case "separator":    el = this.buildSeparator(); break;
            case "row-break":    el = createElement("div", []); break;
            case "label":        el = this.buildLabelControl(ctrl); break;
            case "custom":       el = this.buildCustomControl(ctrl); break;
            default:             el = createElement("div", []); break;
        }

        if (ctrl.cssClass) { el.classList.add(ctrl.cssClass); }
        if (ctrl.disabled) { el.classList.add(`${CLS}-control-disabled`); }

        this.controlEls.set(ctrl.id, el);
        this.controlConfigs.set(ctrl.id, ctrl);
        return el;
    }

    private buildButton(btn: RibbonButton): HTMLElement
    {
        const size = btn.size || "small";
        const el = createElement("button", [`${CLS}-btn`, `${CLS}-btn-${size}`]);
        setAttr(el, { "type": "button", "data-control-id": btn.id });
        if (btn.tooltip) { setAttr(el, { "title": btn.tooltip, "aria-label": btn.tooltip }); }
        if (btn.toggle) { setAttr(el, { "aria-pressed": btn.active ? "true" : "false" }); }
        if (btn.disabled) { (el as HTMLButtonElement).disabled = true; }
        if (btn.keyTip) { el.dataset.keyTip = btn.keyTip; }
        if (btn.active) { el.classList.add(`${CLS}-control-active`); }
        this.appendButtonContent(el, btn, size);
        el.addEventListener("click", () => this.handleButtonClick(btn, el));
        return el;
    }

    private handleButtonClick(btn: RibbonButton, el: HTMLElement): void
    {
        if (btn.toggle)
        {
            btn.active = !btn.active;
            el.classList.toggle(`${CLS}-control-active`, btn.active);
            el.setAttribute("aria-pressed", btn.active ? "true" : "false");
        }
        safeCallback(btn.onClick, btn, btn.active || false);
        safeCallback(this.opts.onControlClick, btn.id);
    }

    private appendButtonContent(
        el: HTMLElement, ctrl: RibbonControlBase, size: RibbonButtonSize
    ): void
    {
        if (ctrl.icon)
        {
            const icon = createElement("i", [`${CLS}-btn-icon`]);
            addIconClasses(icon, ctrl.icon);
            el.appendChild(icon);
        }
        if (ctrl.label && size !== "mini")
        {
            el.appendChild(createElement("span", [`${CLS}-btn-label`], ctrl.label));
        }
    }

    private buildSplitButton(split: RibbonSplitButton): HTMLElement
    {
        const size = split.size || "small";
        const container = createElement("div", [
            `${CLS}-split`, `${CLS}-split-${size}`,
        ]);
        setAttr(container, { "data-control-id": split.id });

        const primary = this.buildSplitPrimary(split, size);
        const arrow = this.buildSplitArrow(split);
        const menu = this.buildSplitDropdown(split);

        arrow.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleSplitMenu(split.id, arrow, menu);
        });

        container.appendChild(primary);
        container.appendChild(arrow);
        container.appendChild(menu);
        return container;
    }

    private buildSplitPrimary(
        split: RibbonSplitButton, size: RibbonButtonSize
    ): HTMLElement
    {
        const primary = createElement("button", [`${CLS}-split-primary`]);
        setAttr(primary, { "type": "button" });
        if (split.tooltip) { setAttr(primary, { "title": split.tooltip, "aria-label": split.tooltip }); }
        if (split.toggle) { setAttr(primary, { "aria-pressed": split.active ? "true" : "false" }); }
        if (split.disabled) { (primary as HTMLButtonElement).disabled = true; }
        if (split.active) { primary.classList.add(`${CLS}-control-active`); }
        if (split.keyTip) { primary.dataset.keyTip = split.keyTip; }
        this.appendButtonContent(primary, split, size);

        primary.addEventListener("click", () =>
        {
            if (split.toggle)
            {
                split.active = !split.active;
                primary.classList.toggle(`${CLS}-control-active`, split.active);
                primary.setAttribute("aria-pressed", split.active ? "true" : "false");
            }
            safeCallback(split.onClick, split, split.active || false);
            safeCallback(this.opts.onControlClick, split.id);
        });
        return primary;
    }

    private buildSplitArrow(split: RibbonSplitButton): HTMLElement
    {
        const arrow = createElement("button", [`${CLS}-split-arrow`]);
        setAttr(arrow, {
            "type": "button", "aria-haspopup": "true", "aria-expanded": "false",
            "aria-label": `${split.tooltip || split.label || ""} options`,
        });
        if (split.disabled) { (arrow as HTMLButtonElement).disabled = true; }
        const chevron = createElement("i", []);
        addIconClasses(chevron, "bi bi-chevron-down");
        arrow.appendChild(chevron);
        return arrow;
    }

    private buildSplitDropdown(split: RibbonSplitButton): HTMLElement
    {
        const menu = createElement("div", [`${CLS}-split-menu`]);
        setAttr(menu, { "role": "menu" });
        menu.style.display = "none";
        this.buildSplitMenuItems(menu, split.menuItems);
        this.splitMenuEls.set(split.id, menu);
        return menu;
    }

    private buildSplitMenuItems(
        menu: HTMLElement, items: RibbonSplitMenuItem[]
    ): void
    {
        for (const item of items)
        {
            const btn = createElement("button", [`${CLS}-split-menu-item`]);
            setAttr(btn, { "role": "menuitem", "type": "button" });
            if (item.disabled)
            {
                (btn as HTMLButtonElement).disabled = true;
                setAttr(btn, { "aria-disabled": "true" });
            }
            if (item.icon)
            {
                const icon = createElement("i", []);
                addIconClasses(icon, item.icon);
                btn.appendChild(icon);
            }
            btn.appendChild(createElement("span", [], item.label));
            btn.addEventListener("click", () =>
            {
                if (!item.disabled) { safeCallback(item.onClick, item); }
                this.closeAllPopups();
            });
            menu.appendChild(btn);
        }
    }

    private toggleSplitMenu(
        id: string, arrow: HTMLElement, menu: HTMLElement
    ): void
    {
        if (this.openPopupType === "split" && this.openPopupId === id)
        {
            this.closeAllPopups();
            return;
        }
        this.closeAllPopups();
        menu.style.display = "flex";
        this.positionPopup(arrow, menu);
        arrow.setAttribute("aria-expanded", "true");
        this.openPopupType = "split";
        this.openPopupId = id;
    }

    private buildGalleryControl(gallery: RibbonGallery): HTMLElement
    {
        const el = createElement("div", [`${CLS}-gallery`]);
        setAttr(el, { "data-control-id": gallery.id });

        const inlineCount = gallery.inlineCount || 3;
        const inline = createElement("div", [`${CLS}-gallery-inline`]);
        for (const opt of gallery.options.slice(0, inlineCount))
        {
            inline.appendChild(this.buildGalleryOptionBtn(gallery, opt));
        }
        el.appendChild(inline);

        if (gallery.options.length > inlineCount)
        {
            this.appendGalleryMoreBtn(el, gallery);
        }
        return el;
    }

    private appendGalleryMoreBtn(
        el: HTMLElement, gallery: RibbonGallery
    ): void
    {
        const moreBtn = createElement("button", [`${CLS}-gallery-more`]);
        setAttr(moreBtn, { "type": "button", "aria-label": "More options" });
        const chevron = createElement("i", []);
        addIconClasses(chevron, "bi bi-chevron-down");
        moreBtn.appendChild(chevron);

        const popup = this.buildGalleryPopup(gallery);
        popup.style.display = "none";
        this.galleryPopupEls.set(gallery.id, popup);

        moreBtn.addEventListener("click", () =>
        {
            this.toggleGalleryPopup(gallery.id, moreBtn, popup);
        });
        el.appendChild(moreBtn);
        el.appendChild(popup);
    }

    private buildGalleryOptionBtn(
        gallery: RibbonGallery, opt: RibbonGalleryOption
    ): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-gallery-option`]);
        setAttr(btn, { "type": "button", "role": "option", "title": opt.label });
        if (opt.disabled) { (btn as HTMLButtonElement).disabled = true; }
        if (gallery.selectedId === opt.id)
        {
            btn.classList.add(`${CLS}-gallery-option-selected`);
        }

        this.appendGalleryOptionContent(btn, opt);

        btn.addEventListener("click", () =>
        {
            if (!opt.disabled)
            {
                gallery.selectedId = opt.id;
                this.updateGallerySelection(gallery);
                safeCallback(gallery.onSelect, opt);
                this.closeAllPopups();
            }
        });
        return btn;
    }

    private appendGalleryOptionContent(
        btn: HTMLElement, opt: RibbonGalleryOption
    ): void
    {
        if (opt.color)
        {
            const swatch = createElement("span", [`${CLS}-gallery-swatch`]);
            swatch.style.backgroundColor = opt.color;
            btn.appendChild(swatch);
        }
        else if (opt.icon)
        {
            const icon = createElement("i", []);
            addIconClasses(icon, opt.icon);
            btn.appendChild(icon);
        }
        else if (opt.preview)
        {
            const prev = createElement("span", [`${CLS}-gallery-preview`]);
            prev.innerHTML = sanitiseHTML(opt.preview);
            btn.appendChild(prev);
        }
        else
        {
            btn.textContent = opt.label;
        }
    }

    private buildGalleryPopup(gallery: RibbonGallery): HTMLElement
    {
        const popup = createElement("div", [`${CLS}-gallery-popup`]);
        const layout = gallery.layout || "grid";
        const cols = gallery.columns || 4;

        if (layout === "grid")
        {
            const grid = createElement("div", [`${CLS}-gallery-grid`]);
            grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            for (const opt of gallery.options)
            {
                grid.appendChild(this.buildGalleryOptionBtn(gallery, opt));
            }
            popup.appendChild(grid);
        }
        else
        {
            for (const opt of gallery.options)
            {
                const row = this.buildGalleryOptionBtn(gallery, opt);
                row.classList.add(`${CLS}-gallery-list-item`);
                const lbl = createElement("span", [], opt.label);
                row.appendChild(lbl);
                popup.appendChild(row);
            }
        }

        return popup;
    }

    private toggleGalleryPopup(
        id: string, trigger: HTMLElement, popup: HTMLElement
    ): void
    {
        if (this.openPopupType === "gallery" && this.openPopupId === id)
        {
            this.closeAllPopups();
            return;
        }
        this.closeAllPopups();
        popup.style.display = "block";
        this.positionPopup(trigger, popup);
        this.openPopupType = "gallery";
        this.openPopupId = id;
    }

    private updateGallerySelection(gallery: RibbonGallery): void
    {
        const el = this.controlEls.get(gallery.id);
        if (!el) { return; }
        const opts = el.querySelectorAll(`.${CLS}-gallery-option`);
        opts.forEach(o =>
        {
            const optEl = o as HTMLElement;
            const title = optEl.getAttribute("title") || "";
            const matchOpt = gallery.options.find(go => go.label === title);
            optEl.classList.toggle(
                `${CLS}-gallery-option-selected`,
                matchOpt?.id === gallery.selectedId
            );
        });
    }

    private buildDropdown(dropdown: RibbonDropdown): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-dropdown-wrap`]);
        setAttr(wrap, { "data-control-id": dropdown.id });
        if (dropdown.label)
        {
            wrap.appendChild(createElement("label", [`${CLS}-dropdown-label`], dropdown.label));
        }

        const sel = document.createElement("select") as HTMLSelectElement;
        sel.className = `${CLS}-dropdown`;
        if (dropdown.width) { sel.style.width = dropdown.width; }
        if (dropdown.disabled) { sel.disabled = true; }
        if (dropdown.tooltip) { sel.title = dropdown.tooltip; }
        this.populateSelectOptions(sel, dropdown.options, dropdown.value);
        sel.addEventListener("change", () =>
        {
            safeCallback(dropdown.onChange, sel.value);
            safeCallback(this.opts.onControlClick, dropdown.id);
        });
        wrap.appendChild(sel);
        return wrap;
    }

    private populateSelectOptions(
        sel: HTMLSelectElement,
        options: { value: string; label: string }[],
        selected?: string
    ): void
    {
        for (const opt of options)
        {
            const option = document.createElement("option");
            option.value = opt.value;
            option.textContent = opt.label;
            if (selected === opt.value) { option.selected = true; }
            sel.appendChild(option);
        }
    }

    private buildInput(input: RibbonInput): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-input-wrap`]);
        setAttr(wrap, { "data-control-id": input.id });
        if (input.label)
        {
            wrap.appendChild(createElement("label", [`${CLS}-input-label`], input.label));
        }
        const inp = document.createElement("input") as HTMLInputElement;
        inp.type = "text";
        inp.className = `${CLS}-input`;
        if (input.placeholder) { inp.placeholder = input.placeholder; }
        if (input.value) { inp.value = input.value; }
        if (input.width) { inp.style.width = input.width; }
        if (input.disabled) { inp.disabled = true; }
        if (input.tooltip) { inp.title = input.tooltip; }
        inp.addEventListener("input", () => safeCallback(input.onInput, inp.value));
        inp.addEventListener("keydown", (e) =>
        {
            if (e.key === "Enter") { safeCallback(input.onSubmit, inp.value); }
        });
        wrap.appendChild(inp);
        return wrap;
    }

    private buildColorPicker(color: RibbonColorPicker): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-color-wrap`]);
        setAttr(wrap, { "data-control-id": color.id });
        if (color.label)
        {
            wrap.appendChild(createElement("label", [`${CLS}-color-label`], color.label));
        }
        const inp = document.createElement("input") as HTMLInputElement;
        inp.type = "color";
        inp.className = `${CLS}-color`;
        inp.value = color.value || "#000000";
        if (color.disabled) { inp.disabled = true; }
        if (color.tooltip) { inp.title = color.tooltip; }
        inp.addEventListener("input", () => safeCallback(color.onInput, inp.value));
        inp.addEventListener("change", () =>
        {
            safeCallback(color.onChange, inp.value);
            safeCallback(this.opts.onControlClick, color.id);
        });
        wrap.appendChild(inp);
        if (color.showLabel)
        {
            const hex = createElement("span", [`${CLS}-color-hex`], inp.value);
            inp.addEventListener("input", () => { hex.textContent = inp.value; });
            wrap.appendChild(hex);
        }
        return wrap;
    }

    private buildNumberSpinner(num: RibbonNumberSpinner): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-number-wrap`]);
        setAttr(wrap, { "data-control-id": num.id });
        if (num.label)
        {
            wrap.appendChild(createElement("label", [`${CLS}-number-label`], num.label));
        }
        const inp = document.createElement("input") as HTMLInputElement;
        inp.type = "number";
        inp.className = `${CLS}-number`;
        inp.value = String(num.value ?? 0);
        if (num.min !== undefined) { inp.min = String(num.min); }
        if (num.max !== undefined) { inp.max = String(num.max); }
        if (num.step !== undefined) { inp.step = String(num.step); }
        if (num.width) { inp.style.width = num.width; }
        if (num.disabled) { inp.disabled = true; }
        if (num.tooltip) { inp.title = num.tooltip; }
        inp.addEventListener("change", () =>
        {
            safeCallback(num.onChange, parseFloat(inp.value) || 0);
            safeCallback(this.opts.onControlClick, num.id);
        });
        wrap.appendChild(inp);
        if (num.suffix)
        {
            wrap.appendChild(createElement("span", [`${CLS}-number-suffix`], num.suffix));
        }
        return wrap;
    }

    private buildCheckboxControl(chk: RibbonCheckbox): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-checkbox-wrap`]);
        setAttr(wrap, { "data-control-id": chk.id });

        const inp = document.createElement("input") as HTMLInputElement;
        inp.type = "checkbox";
        inp.className = `${CLS}-checkbox`;
        inp.checked = chk.checked ?? false;
        if (chk.disabled) { inp.disabled = true; }

        const lbl = createElement("label", [`${CLS}-checkbox-label`]);
        lbl.appendChild(inp);
        if (chk.label)
        {
            lbl.appendChild(createElement("span", [], chk.label));
        }

        inp.addEventListener("change", () =>
        {
            safeCallback(chk.onChange, inp.checked);
            safeCallback(this.opts.onControlClick, chk.id);
        });

        wrap.appendChild(lbl);
        return wrap;
    }

    private buildToggleControl(tog: RibbonToggleSwitch): HTMLElement
    {
        const wrap = createElement("div", [`${CLS}-toggle-wrap`]);
        setAttr(wrap, { "data-control-id": tog.id });

        const inp = document.createElement("input") as HTMLInputElement;
        inp.type = "checkbox";
        inp.className = `${CLS}-toggle`;
        inp.checked = tog.checked ?? false;
        if (tog.disabled) { inp.disabled = true; }

        const lbl = createElement("label", [`${CLS}-toggle-label`]);
        lbl.appendChild(inp);
        if (tog.label)
        {
            lbl.appendChild(createElement("span", [], tog.label));
        }

        inp.addEventListener("change", () =>
        {
            safeCallback(tog.onChange, inp.checked);
            safeCallback(this.opts.onControlClick, tog.id);
        });

        wrap.appendChild(lbl);
        return wrap;
    }

    private buildSeparator(): HTMLElement
    {
        return createElement("div", [`${CLS}-separator`]);
    }

    private buildLabelControl(label: RibbonLabel): HTMLElement
    {
        const el = createElement("span", [`${CLS}-label-ctrl`]);
        setAttr(el, { "data-control-id": label.id });

        if (label.icon)
        {
            const icon = createElement("i", []);
            addIconClasses(icon, label.icon);
            el.appendChild(icon);
        }
        if (label.text || label.label)
        {
            el.appendChild(createElement("span", [], label.text || label.label || ""));
        }
        if (label.color)
        {
            el.style.color = label.color;
        }
        return el;
    }

    private buildCustomControl(custom: RibbonCustom): HTMLElement
    {
        const sizeKey = custom.size || "small";
        const wrap = createElement("div", [
            `${CLS}-custom`,
            `${CLS}-custom-${sizeKey}`
        ]);
        setAttr(wrap, { "data-control-id": custom.id });

        if (custom.width)
        {
            wrap.style.minWidth = custom.width;
        }

        const el = typeof custom.element === "function"
            ? custom.element()
            : custom.element;

        // Small/mini: label LEFT (row layout); large: label BELOW (column)
        const labelBefore = sizeKey === "small" || sizeKey === "mini";

        if (custom.label && labelBefore)
        {
            wrap.appendChild(
                createElement("span", [`${CLS}-custom-label`], custom.label)
            );
        }

        wrap.appendChild(el);

        if (custom.label && !labelBefore)
        {
            wrap.appendChild(
                createElement("span", [`${CLS}-custom-label`], custom.label)
            );
        }

        return wrap;
    }

    // ============================================================================
    // S10: PRIVATE — POPUP MANAGEMENT
    // ============================================================================

    private closeAllPopups(): void
    {
        // Split menus
        for (const menu of this.splitMenuEls.values())
        {
            menu.style.display = "none";
        }
        // Gallery popups
        for (const popup of this.galleryPopupEls.values())
        {
            popup.style.display = "none";
        }
        // Overflow popups — move content back to group
        if (this.openPopupType === "overflow" && this.openPopupId)
        {
            this.returnOverflowContent(this.openPopupId);
        }
        for (const popup of this.overflowPopupEls.values())
        {
            popup.style.display = "none";
        }
        // Reset aria-expanded
        if (this.rootEl)
        {
            const expanded = this.rootEl.querySelectorAll("[aria-expanded='true']");
            expanded.forEach(el => el.setAttribute("aria-expanded", "false"));
        }
        this.openPopupType = null;
        this.openPopupId = null;
    }

    private positionPopup(
        trigger: HTMLElement, popup: HTMLElement
    ): void
    {
        const tr = trigger.getBoundingClientRect();
        popup.style.position = "fixed";
        popup.style.top = `${tr.bottom + 2}px`;
        popup.style.left = `${tr.left}px`;
        popup.style.zIndex = String(Z_RIBBON_DROPDOWN);

        // Clamp to viewport
        requestAnimationFrame(() =>
        {
            const pr = popup.getBoundingClientRect();
            if (pr.right > window.innerWidth)
            {
                popup.style.left = `${window.innerWidth - pr.width - 4}px`;
            }
            if (pr.bottom > window.innerHeight)
            {
                popup.style.top = `${tr.top - pr.height - 2}px`;
            }
        });
    }

    // ============================================================================
    // S11: PRIVATE — ADAPTIVE COLLAPSE
    // ============================================================================

    private initResizeObserver(): void
    {
        if (!this.panelEl) { return; }
        const debouncedFn = debounce(() => this.runAdaptiveCollapse(), DEBOUNCE_RESIZE_MS);
        this.resizeObserver = new ResizeObserver(debouncedFn);
        this.resizeObserver.observe(this.panelEl);
    }

    private destroyResizeObserver(): void
    {
        if (this.resizeObserver)
        {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private runAdaptiveCollapse(): void
    {
        if (!this.panelEl || this.collapsed) { return; }

        const tab = this.findTab(this.activeTabId);
        if (!tab) { return; }

        // Reset all groups to full
        this.resetAllGroupStages(tab);

        const available = this.panelEl.clientWidth;
        let needed = this.measureTabContentWidth();
        let safety = 50;

        while (needed > available && safety-- > 0)
        {
            const advanced = this.collapseNextGroup(tab);
            if (!advanced) { break; }
            needed = this.measureTabContentWidth();
        }
    }

    private resetAllGroupStages(tab: RibbonTab): void
    {
        for (const group of tab.groups)
        {
            const el = this.groupEls.get(group.id);
            if (el)
            {
                // Clean up overflow state: move content back and remove button/popup
                this.cleanupGroupOverflow(group.id, el);
                el.classList.remove(
                    `${CLS}-group-medium`, `${CLS}-group-small`,
                    `${CLS}-group-mini`, `${CLS}-group-overflow`
                );
            }
            this.groupStages.set(group.id, 0);
        }
    }

    private collapseNextGroup(tab: RibbonTab): boolean
    {
        // Find group with lowest priority that can still collapse
        let best: RibbonGroup | null = null;
        let bestStage = -1;

        for (const group of tab.groups)
        {
            const stages = group.collapseStages || DEFAULT_COLLAPSE_STAGES;
            const current = this.groupStages.get(group.id) || 0;
            if (current >= stages.length - 1) { continue; }

            const priority = group.collapsePriority ?? 50;
            if (!best || priority < (best.collapsePriority ?? 50))
            {
                best = group;
                bestStage = current;
            }
        }

        if (!best) { return false; }

        const stages = best.collapseStages || DEFAULT_COLLAPSE_STAGES;
        const newStage = bestStage + 1;
        this.groupStages.set(best.id, newStage);
        this.applyGroupStage(best.id, stages[newStage]);
        return true;
    }

    private applyGroupStage(
        groupId: string, stage: RibbonCollapseStage
    ): void
    {
        const el = this.groupEls.get(groupId);
        if (!el) { return; }

        // Remove old stage classes
        el.classList.remove(
            `${CLS}-group-medium`, `${CLS}-group-small`,
            `${CLS}-group-mini`, `${CLS}-group-overflow`
        );

        if (stage !== "full")
        {
            el.classList.add(`${CLS}-group-${stage}`);
        }

        // For overflow, replace content with dropdown button
        if (stage === "overflow")
        {
            this.buildGroupOverflow(groupId, el);
        }
    }

    private buildGroupOverflow(
        groupId: string, groupEl: HTMLElement
    ): void
    {
        // CSS .ribbon-group-overflow .ribbon-group-content { display: none }
        // handles hiding — do NOT remove the content element from the DOM

        const overflowBtn = createElement("button", [`${CLS}-group-overflow-btn`]);
        setAttr(overflowBtn, {
            "type": "button",
            "aria-haspopup": "true",
            "aria-expanded": "false",
        });
        const label = groupEl.getAttribute("aria-label") || "";
        overflowBtn.textContent = label;
        const chevron = createElement("i", []);
        addIconClasses(chevron, "bi bi-chevron-down");
        overflowBtn.appendChild(chevron);

        // Build popup container (portaled to rootEl)
        const popup = createElement("div", [`${CLS}-overflow-popup`]);
        popup.style.display = "none";
        popup.style.minHeight = `${this.opts.panelHeight - 8}px`;
        this.rootEl?.appendChild(popup);
        this.overflowPopupEls.set(groupId, popup);

        overflowBtn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            this.toggleOverflowPopup(groupId, overflowBtn);
        });

        groupEl.insertBefore(overflowBtn, groupEl.firstChild);
    }

    /** Toggles the overflow dropdown for a collapsed group. */
    private toggleOverflowPopup(
        groupId: string, trigger: HTMLElement
    ): void
    {
        if (this.openPopupType === "overflow" && this.openPopupId === groupId)
        {
            this.closeAllPopups();
            return;
        }
        this.closeAllPopups();

        const popup = this.overflowPopupEls.get(groupId);
        const groupEl = this.groupEls.get(groupId);
        if (!popup || !groupEl) { return; }

        // Move group-content into the popup so controls display normally
        const content = groupEl.querySelector(
            `.${CLS}-group-content`
        ) as HTMLElement;
        if (content)
        {
            popup.appendChild(content);
            content.style.display = "flex";
        }

        popup.style.display = "flex";
        this.positionPopup(trigger, popup);
        trigger.setAttribute("aria-expanded", "true");

        this.openPopupType = "overflow";
        this.openPopupId = groupId;
    }

    /** Moves group-content back from popup into the group element. */
    private returnOverflowContent(groupId: string): void
    {
        const popup = this.overflowPopupEls.get(groupId);
        const groupEl = this.groupEls.get(groupId);
        if (!popup || !groupEl) { return; }

        const content = popup.querySelector(
            `.${CLS}-group-content`
        ) as HTMLElement;
        if (content)
        {
            content.style.display = "";
            const label = groupEl.querySelector(`.${CLS}-group-label`);
            if (label) { groupEl.insertBefore(content, label); }
            else { groupEl.appendChild(content); }
        }
    }

    /** Removes overflow button and popup for a group being reset. */
    private cleanupGroupOverflow(
        groupId: string, groupEl: HTMLElement
    ): void
    {
        // Move content back if it's currently in the popup
        this.returnOverflowContent(groupId);

        // Remove overflow button
        const btn = groupEl.querySelector(`.${CLS}-group-overflow-btn`);
        if (btn) { btn.remove(); }

        // Remove popup from DOM
        const popup = this.overflowPopupEls.get(groupId);
        if (popup) { popup.remove(); }
        this.overflowPopupEls.delete(groupId);
    }

    private measureTabContentWidth(): number
    {
        const content = this.panelEl?.firstChild as HTMLElement | null;
        if (!content) { return 0; }
        // scrollWidth captures total content width including overflow
        return content.scrollWidth;
    }

    // ============================================================================
    // S12: PRIVATE — KEYTIPS
    // ============================================================================

    private showTabKeyTips(): void
    {
        if (!this.opts.keyTips || !this.rootEl) { return; }
        this.hideKeyTips();
        this.keyTipLevel = "tabs";
        const rootRect = this.rootEl.getBoundingClientRect();

        for (const [, el] of this.tabEls)
        {
            const tip = el.dataset.keyTip;
            if (tip && el.style.display !== "none")
            {
                this.addKeyTipBadge(tip, el, rootRect);
            }
        }
        this.scanKeyTipsInContainer(this.qatEl, rootRect);
        this.scanKeyTipsInContainer(this.menuBarEl, rootRect);
        this.rootEl.classList.add(`${CLS}-keytips-active`);
    }

    private scanKeyTipsInContainer(
        container: HTMLElement | null, rootRect: DOMRect
    ): void
    {
        if (!container) { return; }
        const els = container.querySelectorAll("[data-key-tip]");
        els.forEach(el =>
        {
            const tip = (el as HTMLElement).dataset.keyTip;
            if (tip) { this.addKeyTipBadge(tip, el as HTMLElement, rootRect); }
        });
    }

    private showGroupKeyTips(): void
    {
        if (!this.opts.keyTips || !this.rootEl) { return; }
        this.hideKeyTips();
        this.keyTipLevel = "groups";
        const rootRect = this.rootEl.getBoundingClientRect();

        // Controls in active tab
        for (const [, el] of this.controlEls)
        {
            const tip = el.dataset.keyTip
                || el.querySelector("[data-key-tip]")?.getAttribute("data-key-tip");
            if (tip && el.offsetParent !== null)
            {
                this.addKeyTipBadge(tip, el, rootRect);
            }
        }

        this.rootEl.classList.add(`${CLS}-keytips-active`);
    }

    private hideKeyTips(): void
    {
        for (const badge of this.keyTipBadges)
        {
            badge.remove();
        }
        this.keyTipBadges = [];
        this.keyTipLevel = "none";
        this.rootEl?.classList.remove(`${CLS}-keytips-active`);
    }

    private addKeyTipBadge(
        letter: string, el: HTMLElement, rootRect: DOMRect
    ): void
    {
        if (!this.keyTipLayerEl) { return; }
        const rect = el.getBoundingClientRect();
        const badge = createElement("span", [`${CLS}-keytip`], letter.toUpperCase());
        badge.style.left = `${(rect.left - rootRect.left) + (rect.width / 2) - 8}px`;
        badge.style.top = `${(rect.top - rootRect.top) + rect.height - 4}px`;
        this.keyTipLayerEl.appendChild(badge);
        this.keyTipBadges.push(badge);
    }

    private matchKeyTip(key: string): boolean
    {
        const upper = key.toUpperCase();
        if (this.keyTipLevel === "tabs")
        {
            return this.matchTabKeyTip(upper);
        }
        if (this.keyTipLevel === "groups")
        {
            return this.matchGroupKeyTip(upper);
        }
        return false;
    }

    private matchTabKeyTip(upper: string): boolean
    {
        for (const [id, el] of this.tabEls)
        {
            if (el.dataset.keyTip?.toUpperCase() === upper)
            {
                this.hideKeyTips();
                this.setActiveTab(id);
                requestAnimationFrame(() => this.showGroupKeyTips());
                return true;
            }
        }
        return this.matchKeyTipInContainer(this.qatEl, upper)
            || this.matchKeyTipInContainer(this.menuBarEl, upper);
    }

    private matchGroupKeyTip(upper: string): boolean
    {
        for (const [, el] of this.controlEls)
        {
            const tip = el.dataset.keyTip
                || el.querySelector("[data-key-tip]")?.getAttribute("data-key-tip");
            if (tip?.toUpperCase() === upper && el.offsetParent !== null)
            {
                this.hideKeyTips();
                const btn = el.querySelector("button, input, select") as HTMLElement;
                if (btn) { btn.click(); } else { el.click(); }
                return true;
            }
        }
        return false;
    }

    private matchKeyTipInContainer(
        container: HTMLElement | null, upper: string
    ): boolean
    {
        if (!container) { return false; }
        const match = container.querySelector(
            `[data-key-tip="${upper}"], [data-key-tip="${upper.toLowerCase()}"]`
        ) as HTMLElement | null;
        if (match) { match.click(); this.hideKeyTips(); return true; }
        return false;
    }

    // ============================================================================
    // S13: PRIVATE — BACKSTAGE
    // ============================================================================

    private buildBackstage(): void
    {
        if (!this.backstageEl) { return; }
        clearChildren(this.backstageEl);

        const tab = this.tabs.find(t => t.backstage);
        if (!tab) { return; }

        this.backstageEl.appendChild(this.buildBackstageBackBtn(tab));
        this.backstageEl.appendChild(this.buildBackstageLayout(tab));
    }

    private buildBackstageBackBtn(tab: RibbonTab): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-backstage-back`]);
        setAttr(btn, { "type": "button", "aria-label": "Close backstage" });
        const icon = createElement("i", []);
        addIconClasses(icon, "bi bi-arrow-left");
        btn.appendChild(icon);
        btn.appendChild(createElement("span", [], tab.label));
        btn.addEventListener("click", () => this.closeBackstage());
        return btn;
    }

    private buildBackstageLayout(tab: RibbonTab): HTMLElement
    {
        const layout = createElement("div", [`${CLS}-backstage-layout`]);
        const sidebar = createElement("div", [`${CLS}-backstage-sidebar`]);
        const contentArea = createElement("div", [`${CLS}-backstage-content`]);

        if (tab.backstageSidebar)
        {
            this.populateBackstageSidebar(sidebar, contentArea, tab.backstageSidebar);
        }
        if (tab.backstageContent)
        {
            const el = typeof tab.backstageContent === "function"
                ? tab.backstageContent() : tab.backstageContent;
            contentArea.appendChild(el);
        }

        layout.appendChild(sidebar);
        layout.appendChild(contentArea);
        return layout;
    }

    private populateBackstageSidebar(
        sidebar: HTMLElement, contentArea: HTMLElement, items: RibbonBackstageItem[]
    ): void
    {
        for (const item of items)
        {
            sidebar.appendChild(this.buildBackstageSidebarBtn(sidebar, contentArea, item));
        }
        if (items.length > 0)
        {
            this.setBackstageContent(contentArea, items[0]);
            const first = sidebar.firstElementChild as HTMLElement;
            if (first) { first.classList.add(`${CLS}-backstage-item-active`); }
        }
    }

    private buildBackstageSidebarBtn(
        sidebar: HTMLElement, contentArea: HTMLElement, item: RibbonBackstageItem
    ): HTMLElement
    {
        const btn = createElement("button", [`${CLS}-backstage-item`]);
        setAttr(btn, { "type": "button" });
        if (item.icon)
        {
            const icon = createElement("i", []);
            addIconClasses(icon, item.icon);
            btn.appendChild(icon);
        }
        btn.appendChild(createElement("span", [], item.label));
        btn.addEventListener("click", () =>
        {
            this.setBackstageContent(contentArea, item);
            sidebar.querySelectorAll(`.${CLS}-backstage-item`).forEach(
                b => b.classList.remove(`${CLS}-backstage-item-active`)
            );
            btn.classList.add(`${CLS}-backstage-item-active`);
            safeCallback(item.onClick);
        });
        return btn;
    }

    private setBackstageContent(
        area: HTMLElement, item: RibbonBackstageItem
    ): void
    {
        clearChildren(area);
        if (item.content)
        {
            const el = typeof item.content === "function"
                ? item.content()
                : item.content;
            area.appendChild(el);
        }
    }

    private focusFirstInBackstage(): void
    {
        if (!this.backstageEl) { return; }
        const first = this.backstageEl.querySelector(
            "button:not([disabled])"
        ) as HTMLElement | null;
        if (first) { first.focus(); }
    }

    // ============================================================================
    // S14: PRIVATE — EVENT HANDLING
    // ============================================================================

    private attachListeners(): void
    {
        this.boundKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
        this.boundClickOutside = (e: PointerEvent) => this.handleClickOutside(e);
        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("pointerdown", this.boundClickOutside);

        if (this.opts.autoCollapseDelay > 0 && this.rootEl)
        {
            this.boundAutoCollapseReset = () =>
            {
                if (this.tempExpanded) { this.startAutoCollapseTimer(); }
            };
            this.rootEl.addEventListener("pointerdown", this.boundAutoCollapseReset);
        }
    }

    private detachListeners(): void
    {
        if (this.boundKeyDown)
        {
            document.removeEventListener("keydown", this.boundKeyDown);
        }
        if (this.boundClickOutside)
        {
            document.removeEventListener("pointerdown", this.boundClickOutside);
        }
        if (this.boundAutoCollapseReset && this.rootEl)
        {
            this.rootEl.removeEventListener("pointerdown", this.boundAutoCollapseReset);
            this.boundAutoCollapseReset = null;
        }
    }

    private handleKeyDown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "collapseRibbon"))
        {
            e.preventDefault();
            this.toggleCollapse();
            return;
        }
        if (this.handleAltKeyTip(e)) { return; }
        if (this.handleEscapeKey(e)) { return; }

        if (this.keyTipLevel !== "none" && e.key.length === 1 && !e.ctrlKey && !e.altKey)
        {
            e.preventDefault();
            this.matchKeyTip(e.key);
            return;
        }
        if (this.isTabBarFocused()) { this.handleTabBarKeyDown(e); }
    }

    private handleAltKeyTip(e: KeyboardEvent): boolean
    {
        if (e.key !== "Alt" || e.ctrlKey || e.shiftKey) { return false; }
        if (this.keyTipLevel === "none")
        {
            e.preventDefault();
            this.showTabKeyTips();
        }
        else
        {
            this.hideKeyTips();
        }
        return true;
    }

    private handleEscapeKey(e: KeyboardEvent): boolean
    {
        if (e.key !== "Escape") { return false; }
        if (this.backstageOpen)
        {
            e.preventDefault(); this.closeBackstage(); return true;
        }
        if (this.keyTipLevel === "groups")
        {
            e.preventDefault(); this.showTabKeyTips(); return true;
        }
        if (this.keyTipLevel === "tabs")
        {
            e.preventDefault(); this.hideKeyTips(); return true;
        }
        if (this.openPopupType || this.openMenuId)
        {
            e.preventDefault(); this.closeAllPopups(); this.closeAllMenus(); return true;
        }
        if (this.tempExpanded)
        {
            e.preventDefault();
            this.tempExpanded = false;
            this.clearAutoCollapseTimer();
            this.hidePanel();
            return true;
        }
        return false;
    }

    private handleTabBarKeyDown(e: KeyboardEvent): void
    {
        const tabs = Array.from(this.tabEls.values()).filter(
            el => el.style.display !== "none"
        );
        const focused = document.activeElement as HTMLElement;
        const idx = tabs.indexOf(focused);
        if (idx < 0) { return; }

        if (e.key === "ArrowRight")
        {
            e.preventDefault();
            const next = (idx + 1) % tabs.length;
            tabs[next].focus();
        }
        else if (e.key === "ArrowLeft")
        {
            e.preventDefault();
            const prev = (idx - 1 + tabs.length) % tabs.length;
            tabs[prev].focus();
        }
        else if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            focused.click();
        }
    }

    private isTabBarFocused(): boolean
    {
        if (!this.tabBarEl) { return false; }
        return this.tabBarEl.contains(document.activeElement);
    }

    private handleClickOutside(e: PointerEvent): void
    {
        if (!this.rootEl) { return; }
        const target = e.target as HTMLElement;

        // Close menus if clicking outside menubar
        if (this.openMenuId && this.menuBarEl && !this.menuBarEl.contains(target))
        {
            this.closeAllMenus();
        }

        // Close popups if clicking outside
        if (this.openPopupType && !this.rootEl.contains(target))
        {
            this.closeAllPopups();
        }

        // Temp expand: clicking outside ribbon collapses
        if (this.tempExpanded && !this.rootEl.contains(target))
        {
            this.tempExpanded = false;
            this.clearAutoCollapseTimer();
            this.hidePanel();
        }
    }

    // ============================================================================
    // S15: PRIVATE — COLOR CONFIGURATION
    // ============================================================================

    private applyColors(colors: Partial<RibbonColorOptions>): void
    {
        if (!this.rootEl) { return; }
        for (const [key, prop] of Object.entries(COLOR_MAP))
        {
            const value = (colors as Record<string, string | undefined>)[key];
            if (value)
            {
                this.rootEl.style.setProperty(prop, value);
            }
        }
    }

    // ============================================================================
    // S16: PRIVATE — HELPERS
    // ============================================================================

    private findTab(tabId: string): RibbonTab | undefined
    {
        return this.tabs.find(t => t.id === tabId);
    }

    private firstVisibleTabId(): string | undefined
    {
        const tab = this.tabs.find(t => !t.contextual);
        return tab?.id;
    }

    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    private matchesKeyCombo(e: KeyboardEvent, action: string): boolean
    {
        const combo = this.resolveKeyCombo(action);
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
    // S16: AUTO-COLLAPSE TIMER
    // ============================================================================

    private startAutoCollapseTimer(): void
    {
        this.clearAutoCollapseTimer();
        const delay = this.opts.autoCollapseDelay;
        if (delay <= 0 || !this.tempExpanded) { return; }
        this.autoCollapseTimer = window.setTimeout(() =>
        {
            this.autoCollapseTimer = undefined;
            if (this.tempExpanded)
            {
                this.tempExpanded = false;
                this.hidePanel();
                console.log(LOG_PREFIX, "auto-collapsed after", delay, "ms");
            }
        }, delay);
    }

    private clearAutoCollapseTimer(): void
    {
        if (this.autoCollapseTimer !== undefined)
        {
            clearTimeout(this.autoCollapseTimer);
            this.autoCollapseTimer = undefined;
        }
    }

    public setAutoCollapseDelay(ms: number): void
    {
        this.opts.autoCollapseDelay = ms < 0 ? 0 : ms;
        if (this.opts.autoCollapseDelay <= 0)
        {
            this.clearAutoCollapseTimer();
        }
    }

    public getAutoCollapseDelay(): number
    {
        return this.opts.autoCollapseDelay;
    }

    // ============================================================================
    // S17: STATE PERSISTENCE
    // ============================================================================

    public getState(): RibbonState
    {
        const contextualTabs: Record<string, boolean> = {};
        for (const tab of this.tabs)
        {
            if (tab.contextual)
            {
                const el = this.tabEls.get(tab.id);
                contextualTabs[tab.id] = el
                    ? el.style.display !== "none"
                    : false;
            }
        }

        const controlValues: Record<string, string | number | boolean> = {};
        for (const id of this.controlConfigs.keys())
        {
            controlValues[id] = this.getControlValue(id);
        }

        return {
            activeTabId: this.activeTabId,
            collapsed: this.collapsed,
            contextualTabs,
            controlValues,
            autoCollapseDelay: this.opts.autoCollapseDelay,
        };
    }

    public restoreState(state: Partial<RibbonState>): void
    {
        if (this.destroyed) { return; }

        if (state.autoCollapseDelay !== undefined)
        {
            this.setAutoCollapseDelay(state.autoCollapseDelay);
        }

        if (state.collapsed !== undefined)
        {
            if (state.collapsed) { this.collapse(); }
            else { this.expand(); }
        }

        if (state.contextualTabs)
        {
            for (const [id, visible] of Object.entries(state.contextualTabs))
            {
                if (visible) { this.showContextualTab(id); }
                else { this.hideContextualTab(id); }
            }
        }

        if (state.activeTabId)
        {
            this.setActiveTab(state.activeTabId);
        }

        if (state.controlValues)
        {
            for (const [id, value] of Object.entries(state.controlValues))
            {
                this.setControlValue(id, value);
            }
        }

        console.log(LOG_PREFIX, "state restored");
    }
}

// ============================================================================
// FACTORY & WINDOW EXPORTS
// ============================================================================

export function createRibbon(
    options: RibbonOptions, containerId?: string
): Ribbon
{
    const ribbon = new RibbonImpl(options);
    if (containerId !== undefined)
    {
        ribbon.show(containerId);
    }
    return ribbon;
}

(window as unknown as Record<string, unknown>)["Ribbon"] = RibbonImpl;
(window as unknown as Record<string, unknown>)["createRibbon"] = createRibbon;
