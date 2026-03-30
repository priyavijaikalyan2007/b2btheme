/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ⚓ COMPONENT: CommandPalette
 * 📜 PURPOSE: Keyboard-first command palette (Ctrl+K omnibar) for searching
 *    and executing registered commands with fuzzy matching, categories,
 *    recent history, and match highlighting.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[Toolbar]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface PaletteCommand
{
    id: string;
    label: string;
    icon?: string;
    category?: string;
    shortcut?: string;
    keywords?: string[];
    description?: string;
    disabled?: boolean;
    hidden?: boolean;
    action: () => void | Promise<void>;
}

export interface CommandPaletteOptions
{
    commands?: PaletteCommand[];
    placeholder?: string;
    hotkey?: string;
    maxResults?: number;
    showRecent?: boolean;
    maxRecent?: number;
    showShortcuts?: boolean;
    showCategories?: boolean;
    width?: string;
    zIndex?: number;
    backdropOpacity?: number;
    cssClass?: string;
    onOpen?: () => void;
    onClose?: () => void;
    onSelect?: (command: PaletteCommand) => void;
    onSearch?: (query: string) => void;

    /** Override default key combos. Keys are action names, values are combo strings. */
    keyBindings?: Partial<Record<string, string>>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[CommandPalette]";
const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const CLS = "commandpalette";
const RECENT_KEY = "commandpalette-recent";
const DEFAULT_MAX_RESULTS = 20;
const DEFAULT_MAX_RECENT = 5;
const DEFAULT_Z_INDEX = 1080;
const DEFAULT_WIDTH = "600px";
const DEFAULT_BACKDROP_OPACITY = 0.5;
const DEBOUNCE_THRESHOLD = 500;
const DEBOUNCE_MS = 100;
const COOLDOWN_MS = 100;

/** Default key bindings for command palette keyboard actions. */
const DEFAULT_KEY_BINDINGS: Record<string, string> = {
    close: "Escape",
    moveDown: "ArrowDown",
    moveUp: "ArrowUp",
    select: "Enter",
    jumpToStart: "Home",
    jumpToEnd: "End",
    trapFocus: "Tab",
};

// ============================================================================
// HELPERS
// ============================================================================

function createElement(tag: string, cls?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (cls) { el.className = cls; }
    return el;
}

function setAttr(el: HTMLElement, key: string, value: string): void
{
    el.setAttribute(key, value);
}

function isMac(): boolean
{
    return typeof navigator !== "undefined" &&
        /Mac|iPhone|iPad|iPod/i.test(navigator.platform || "");
}

function safeCallback(fn: () => void): void
{
    try { fn(); }
    catch (e) { logError("Callback error:", e); }
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

interface MatchResult
{
    score: number;
    positions: number[];
}

function fuzzyScore(query: string, text: string): MatchResult
{
    const lq = query.toLowerCase();
    const lt = text.toLowerCase();
    if (lq.length === 0) { return { score: 0, positions: [] }; }

    // Exact prefix
    if (lt.startsWith(lq))
    {
        const pos: number[] = [];
        for (let i = 0; i < lq.length; i++) { pos.push(i); }
        return { score: 100 + (lq.length / lt.length) * 50, positions: pos };
    }

    // Substring
    const subIdx = lt.indexOf(lq);
    if (subIdx >= 0)
    {
        const pos: number[] = [];
        for (let i = 0; i < lq.length; i++) { pos.push(subIdx + i); }
        return { score: 80 - subIdx, positions: pos };
    }

    // Character-skip
    return charSkipMatch(lq, lt);
}

function charSkipMatch(lq: string, lt: string): MatchResult
{
    let sc = 0;
    let qi = 0;
    let consecutive = 0;
    const pos: number[] = [];
    for (let i = 0; i < lt.length && qi < lq.length; i++)
    {
        if (lt[i] === lq[qi])
        {
            qi++;
            consecutive++;
            sc += consecutive * 2;
            pos.push(i);
        }
        else
        {
            consecutive = 0;
        }
    }
    return qi === lq.length ? { score: sc, positions: pos } : { score: 0, positions: [] };
}

interface ScoredCommand
{
    command: PaletteCommand;
    score: number;
    positions: number[];
}

function scoreCommand(query: string, cmd: PaletteCommand): ScoredCommand
{
    const labelResult = fuzzyScore(query, cmd.label);
    let best = labelResult;

    if (cmd.keywords)
    {
        for (let i = 0; i < cmd.keywords.length; i++)
        {
            const r = fuzzyScore(query, cmd.keywords[i]);
            if (r.score > 0 && (r.score * 0.7) > best.score)
            {
                best = { score: r.score * 0.7, positions: labelResult.positions };
            }
        }
    }
    if (cmd.description)
    {
        const r = fuzzyScore(query, cmd.description);
        if (r.score > 0 && (r.score * 0.5) > best.score)
        {
            best = { score: r.score * 0.5, positions: labelResult.positions };
        }
    }
    return { command: cmd, score: best.score, positions: best.positions };
}

// ============================================================================
// RECENT COMMANDS
// ============================================================================

function loadRecent(): string[]
{
    try
    {
        const raw = localStorage.getItem(RECENT_KEY);
        if (!raw) { return []; }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch (e)
    {
        logWarn("Failed to load recent:", e);
        return [];
    }
}

function saveRecent(ids: string[]): void
{
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); }
    catch (e) { logWarn("Failed to save recent:", e); }
}

// ============================================================================
// MATCH HIGHLIGHTING
// ============================================================================

function buildHighlightedLabel(text: string, positions: number[]): HTMLElement
{
    const span = createElement("span", CLS + "-item-label");
    if (positions.length === 0) { span.textContent = text; return span; }
    const posSet = new Set(positions);
    let seg = "";
    let inMatch = false;
    for (let i = 0; i <= text.length; i++)
    {
        const isMatch = i < text.length && posSet.has(i);
        if (i === text.length || isMatch !== inMatch)
        {
            if (seg.length > 0)
            {
                appendLabelSegment(span, seg, inMatch);
            }
            seg = "";
            inMatch = isMatch;
        }
        if (i < text.length) { seg += text[i]; }
    }
    return span;
}

function appendLabelSegment(
    parent: HTMLElement, text: string, isMatch: boolean
): void
{
    if (isMatch)
    {
        const mark = createElement("mark", CLS + "-match");
        mark.textContent = text;
        parent.appendChild(mark);
    }
    else
    {
        parent.appendChild(document.createTextNode(text));
    }
}

// ============================================================================
// COMMAND PALETTE CLASS
// ============================================================================

export class CommandPalette
{
    private static inst: CommandPalette | null = null;
    private opts: Required<Pick<CommandPaletteOptions,
        "placeholder" | "maxResults" | "maxRecent" |
        "showRecent" | "showShortcuts" | "showCategories">> &
        CommandPaletteOptions;
    private commands: Map<string, PaletteCommand> = new Map();
    private recentIds: string[] = [];
    private backdropEl: HTMLElement | null = null;
    private containerEl: HTMLElement | null = null;
    private inputEl: HTMLInputElement | null = null;
    private resultsEl: HTMLElement | null = null;
    private footerEl: HTMLElement | null = null;
    private open_ = false;
    private showAll = false;
    private highlightIdx = 0;
    private visibleItems: HTMLElement[] = [];
    private previousFocus: HTMLElement | null = null;
    private hotkeyHandler: ((e: KeyboardEvent) => void) | null = null;
    private paletteAbort: AbortController | null = null;
    private lastOpenTime = 0;
    private destroyed = false;
    private debounceTimer: number | null = null;

    // ── Singleton ──────────────────────────────────────────────────

    static getInstance(): CommandPalette
    {
        if (!CommandPalette.inst)
        {
            CommandPalette.inst = new CommandPalette({});
        }
        return CommandPalette.inst;
    }

    static configure(options: CommandPaletteOptions): CommandPalette
    {
        if (!CommandPalette.inst)
        {
            CommandPalette.inst = new CommandPalette(options);
        }
        else
        {
            Object.assign(CommandPalette.inst.opts, options);
            if (options.commands)
            {
                CommandPalette.inst.setCommands(options.commands);
            }
        }
        return CommandPalette.inst;
    }

    // ── Constructor ────────────────────────────────────────────────

    constructor(options: CommandPaletteOptions)
    {
        this.opts = {
            placeholder: options.placeholder || "Type a command...",
            maxResults: options.maxResults || DEFAULT_MAX_RESULTS,
            maxRecent: options.maxRecent || DEFAULT_MAX_RECENT,
            showRecent: options.showRecent !== false,
            showShortcuts: options.showShortcuts !== false,
            showCategories: options.showCategories !== false,
            ...options
        };
        this.recentIds = loadRecent();
        if (options.commands)
        {
            this.setCommands(options.commands);
        }
        this.bindGlobalHotkey();
        logInfo("Created with", this.commands.size, "commands");
    }

    // ── Command Registry ───────────────────────────────────────────

    registerCommand(cmd: PaletteCommand): void
    {
        this.commands.set(cmd.id, cmd);
    }

    registerCommands(cmds: PaletteCommand[]): void
    {
        for (let i = 0; i < cmds.length; i++)
        {
            this.commands.set(cmds[i].id, cmds[i]);
        }
    }

    unregisterCommand(id: string): void
    {
        this.commands.delete(id);
    }

    setCommands(cmds: PaletteCommand[]): void
    {
        this.commands.clear();
        this.registerCommands(cmds);
    }

    getCommand(id: string): PaletteCommand | undefined
    {
        return this.commands.get(id);
    }

    getCommands(): PaletteCommand[]
    {
        return Array.from(this.commands.values());
    }

    // ── Open / Close ───────────────────────────────────────────────

    open(): void
    {
        if (this.destroyed || this.open_) { return; }
        if (Date.now() - this.lastOpenTime < COOLDOWN_MS) { return; }
        this.open_ = true;
        this.showAll = false;
        this.previousFocus = document.activeElement as HTMLElement;
        this.buildPalette();
        document.body.appendChild(this.backdropEl!);
        document.body.appendChild(this.containerEl!);
        requestAnimationFrame(() =>
        {
            this.backdropEl!.classList.add(CLS + "-entering");
            this.containerEl!.classList.add(CLS + "-entering");
        });
        this.inputEl!.focus();
        this.renderResults();
        if (this.opts.onOpen)
        {
            safeCallback(() => { this.opts.onOpen!(); });
        }
        logInfo("Opened");
    }

    close(): void
    {
        if (!this.open_) { return; }
        this.open_ = false;
        this.lastOpenTime = Date.now();
        this.teardownPaletteListeners();
        if (this.backdropEl) { this.backdropEl.remove(); }
        if (this.containerEl) { this.containerEl.remove(); }
        this.backdropEl = null;
        this.containerEl = null;
        this.inputEl = null;
        this.resultsEl = null;
        this.footerEl = null;
        this.visibleItems = [];
        if (this.previousFocus && typeof this.previousFocus.focus === "function")
        {
            this.previousFocus.focus();
        }
        if (this.opts.onClose)
        {
            safeCallback(() => { this.opts.onClose!(); });
        }
        logInfo("Closed");
    }

    isOpen(): boolean { return this.open_; }

    // ── Recent ─────────────────────────────────────────────────────

    clearRecent(): void
    {
        this.recentIds = [];
        saveRecent([]);
    }

    private pushRecent(id: string): void
    {
        this.recentIds = this.recentIds.filter(function(r) { return r !== id; });
        this.recentIds.unshift(id);
        if (this.recentIds.length > this.opts.maxRecent)
        {
            this.recentIds = this.recentIds.slice(0, this.opts.maxRecent);
        }
        saveRecent(this.recentIds);
    }

    // ── Destroy ────────────────────────────────────────────────────

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.close();
        this.unbindGlobalHotkey();
        if (CommandPalette.inst === this)
        {
            CommandPalette.inst = null;
        }
        logInfo("Destroyed");
    }

    // ── Hotkey ─────────────────────────────────────────────────────

    private bindGlobalHotkey(): void
    {
        const self = this;
        const hk = this.parseHotkey();
        this.hotkeyHandler = function(e: KeyboardEvent)
        {
            if (self.matchesHotkey(e, hk))
            {
                e.preventDefault();
                if (self.open_) { self.close(); }
                else { self.open(); }
            }
        };
        document.addEventListener("keydown", this.hotkeyHandler);
    }

    private unbindGlobalHotkey(): void
    {
        if (this.hotkeyHandler)
        {
            document.removeEventListener("keydown", this.hotkeyHandler);
            this.hotkeyHandler = null;
        }
    }

    private parseHotkey(): { key: string; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }
    {
        const raw = this.opts.hotkey || (isMac() ? "meta+k" : "ctrl+k");
        const parts = raw.toLowerCase().split("+");
        return {
            key: parts[parts.length - 1],
            ctrl: parts.indexOf("ctrl") >= 0,
            meta: parts.indexOf("meta") >= 0,
            shift: parts.indexOf("shift") >= 0,
            alt: parts.indexOf("alt") >= 0
        };
    }

    private matchesHotkey(
        e: KeyboardEvent,
        hk: { key: string; ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }
    ): boolean
    {
        return e.key.toLowerCase() === hk.key &&
            e.ctrlKey === hk.ctrl &&
            e.metaKey === hk.meta &&
            e.shiftKey === hk.shift &&
            e.altKey === hk.alt;
    }

    // ── Build Palette ──────────────────────────────────────────────

    private buildPalette(): void
    {
        const z = this.opts.zIndex || DEFAULT_Z_INDEX;
        this.backdropEl = this.buildBackdrop(z);
        this.containerEl = this.buildContainer(z + 1);
        this.bindPaletteListeners();
    }

    private buildBackdrop(z: number): HTMLElement
    {
        const el = createElement("div", CLS + "-backdrop");
        setAttr(el, "aria-hidden", "true");
        el.style.zIndex = String(z);
        const opacity = this.opts.backdropOpacity ?? DEFAULT_BACKDROP_OPACITY;
        el.style.setProperty("--cp-backdrop-opacity", String(opacity));
        return el;
    }

    private buildContainer(z: number): HTMLElement
    {
        const el = createElement("div", CLS + "-container");
        setAttr(el, "role", "dialog");
        setAttr(el, "aria-modal", "true");
        setAttr(el, "aria-label", "Command palette");
        el.style.zIndex = String(z);
        el.style.width = this.opts.width || DEFAULT_WIDTH;
        if (this.opts.cssClass) { el.classList.add(this.opts.cssClass); }
        el.appendChild(this.buildSearchRow());
        this.resultsEl = createElement("div", CLS + "-results");
        this.resultsEl.id = CLS + "-results";
        setAttr(this.resultsEl, "role", "listbox");
        setAttr(this.resultsEl, "aria-label", "Command results");
        el.appendChild(this.resultsEl);
        return el;
    }

    private buildSearchRow(): HTMLElement
    {
        const row = createElement("div", CLS + "-search");
        const icon = createElement("i", "bi bi-search " + CLS + "-search-icon");
        setAttr(icon, "aria-hidden", "true");
        row.appendChild(icon);
        this.inputEl = document.createElement("input");
        this.inputEl.className = CLS + "-input";
        this.inputEl.type = "text";
        setAttr(this.inputEl, "role", "combobox");
        setAttr(this.inputEl, "aria-autocomplete", "list");
        setAttr(this.inputEl, "aria-expanded", "true");
        setAttr(this.inputEl, "aria-controls", CLS + "-results");
        setAttr(this.inputEl, "aria-activedescendant", "");
        setAttr(this.inputEl, "placeholder", this.opts.placeholder);
        setAttr(this.inputEl, "autocomplete", "off");
        setAttr(this.inputEl, "spellcheck", "false");
        row.appendChild(this.inputEl);
        return row;
    }

    // ── Event Listeners ────────────────────────────────────────────

    private bindPaletteListeners(): void
    {
        this.paletteAbort = new AbortController();
        const sig = { signal: this.paletteAbort.signal };
        const self = this;
        this.backdropEl!.addEventListener("click", function()
        {
            self.close();
        }, sig);
        this.inputEl!.addEventListener("input", function()
        {
            self.onInputChange();
        }, sig);
        this.containerEl!.addEventListener("keydown", function(e)
        {
            self.onPaletteKeydown(e as KeyboardEvent);
        }, sig);
    }

    private teardownPaletteListeners(): void
    {
        if (this.paletteAbort)
        {
            this.paletteAbort.abort();
            this.paletteAbort = null;
        }
        if (this.debounceTimer !== null)
        {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    // ── Input Handling ─────────────────────────────────────────────

    private onInputChange(): void
    {
        this.showAll = false;
        const query = this.inputEl ? this.inputEl.value : "";
        if (this.opts.onSearch)
        {
            safeCallback(() => { this.opts.onSearch!(query); });
        }
        if (this.commands.size > DEBOUNCE_THRESHOLD)
        {
            this.debounceRender();
        }
        else
        {
            this.renderResults();
        }
    }

    private debounceRender(): void
    {
        if (this.debounceTimer !== null) { clearTimeout(this.debounceTimer); }
        const self = this;
        this.debounceTimer = window.setTimeout(function()
        {
            self.debounceTimer = null;
            self.renderResults();
        }, DEBOUNCE_MS);
    }

    // ── Key Binding Helpers ─────────────────────────────────────────

    /**
     * Resolves the key combo string for the given action name.
     */
    private resolveKeyCombo(action: string): string
    {
        return this.opts.keyBindings?.[action]
            ?? DEFAULT_KEY_BINDINGS[action] ?? "";
    }

    /**
     * Tests whether a keyboard event matches the combo for an action.
     */
    private matchesKeyCombo(
        e: KeyboardEvent, action: string
    ): boolean
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

    // ── Keyboard ───────────────────────────────────────────────────

    private onPaletteKeydown(e: KeyboardEvent): void
    {
        if (this.matchesKeyCombo(e, "close"))
        {
            e.preventDefault();
            this.close();
        }
        else if (this.matchesKeyCombo(e, "moveDown"))
        {
            e.preventDefault();
            this.moveHighlight(1);
        }
        else if (this.matchesKeyCombo(e, "moveUp"))
        {
            e.preventDefault();
            this.moveHighlight(-1);
        }
        else if (this.matchesKeyCombo(e, "select"))
        {
            e.preventDefault();
            this.executeHighlighted();
        }
        else if (this.matchesKeyCombo(e, "jumpToStart"))
        {
            e.preventDefault();
            this.setHighlight(0);
        }
        else if (this.matchesKeyCombo(e, "jumpToEnd"))
        {
            e.preventDefault();
            this.setHighlight(this.visibleItems.length - 1);
        }
        else if (this.matchesKeyCombo(e, "trapFocus"))
        {
            e.preventDefault(); // trap focus
        }
    }

    // ── Highlight ──────────────────────────────────────────────────

    private moveHighlight(delta: number): void
    {
        let next = this.highlightIdx + delta;
        if (next < 0) { next = this.visibleItems.length - 1; }
        if (next >= this.visibleItems.length) { next = 0; }
        this.setHighlight(next);
    }

    private setHighlight(idx: number): void
    {
        if (idx < 0 || idx >= this.visibleItems.length) { return; }
        this.clearHighlight();
        this.highlightIdx = idx;
        const el = this.visibleItems[idx];
        el.classList.add(CLS + "-item-highlighted");
        setAttr(el, "aria-selected", "true");
        el.scrollIntoView({ block: "nearest" });
        if (this.inputEl) { setAttr(this.inputEl, "aria-activedescendant", el.id); }
    }

    private clearHighlight(): void
    {
        for (let i = 0; i < this.visibleItems.length; i++)
        {
            this.visibleItems[i].classList.remove(CLS + "-item-highlighted");
            setAttr(this.visibleItems[i], "aria-selected", "false");
        }
    }

    // ── Execute ────────────────────────────────────────────────────

    private executeHighlighted(): void
    {
        const el = this.visibleItems[this.highlightIdx];
        if (!el) { return; }
        const cmdId = el.getAttribute("data-command-id") || "";
        const cmd = this.commands.get(cmdId);
        if (!cmd || cmd.disabled) { return; }
        if (this.opts.onSelect)
        {
            safeCallback(() => { this.opts.onSelect!(cmd); });
        }
        this.pushRecent(cmd.id);
        this.close();
        this.executeAction(cmd);
    }

    private executeAction(cmd: PaletteCommand): void
    {
        try
        {
            const result = cmd.action();
            if (result && typeof (result as Promise<void>).catch === "function")
            {
                (result as Promise<void>).catch(function(e)
                {
                    logError("Action rejected:", cmd.id, e);
                });
            }
        }
        catch (e)
        {
            logError("Action threw:", cmd.id, e);
        }
    }

    // ── Render Results ─────────────────────────────────────────────

    private renderResults(): void
    {
        if (!this.resultsEl) { return; }
        const query = this.inputEl ? this.inputEl.value.trim() : "";
        const frag = document.createDocumentFragment();
        this.visibleItems = [];

        if (query.length === 0)
        {
            this.renderEmptyQuery(frag);
        }
        else
        {
            this.renderSearchResults(frag, query);
        }

        while (this.resultsEl.firstChild)
        {
            this.resultsEl.removeChild(this.resultsEl.firstChild);
        }
        this.resultsEl.appendChild(frag);
        this.renderFooter();
        this.highlightIdx = 0;
        if (this.visibleItems.length > 0) { this.setHighlight(0); }
    }

    private renderEmptyQuery(frag: DocumentFragment): void
    {
        this.cleanRecentIds();
        if (this.opts.showRecent && this.recentIds.length > 0)
        {
            this.appendCategoryHeader(frag, "Recent");
            for (let i = 0; i < this.recentIds.length; i++)
            {
                const cmd = this.commands.get(this.recentIds[i]);
                if (cmd && !cmd.hidden)
                {
                    this.appendItem(frag, cmd, [], true);
                }
            }
        }
        const all = this.getSortedCommands();
        this.appendGroupedItems(frag, all);
    }

    private renderSearchResults(frag: DocumentFragment, query: string): void
    {
        const scored = this.searchCommands(query);
        if (scored.length === 0)
        {
            this.appendEmpty(frag, query);
            return;
        }
        const limit = this.showAll ? scored.length : this.opts.maxResults;
        const visible = scored.slice(0, limit);
        this.appendGroupedScored(frag, visible);
    }

    // ── Search ─────────────────────────────────────────────────────

    private searchCommands(query: string): ScoredCommand[]
    {
        const results: ScoredCommand[] = [];
        this.commands.forEach(function(cmd)
        {
            if (cmd.hidden) { return; }
            const sc = scoreCommand(query, cmd);
            if (sc.score > 0) { results.push(sc); }
        });
        results.sort(function(a, b) { return b.score - a.score; });
        return results;
    }

    private getSortedCommands(): PaletteCommand[]
    {
        const arr: PaletteCommand[] = [];
        this.commands.forEach(function(cmd)
        {
            if (!cmd.hidden) { arr.push(cmd); }
        });
        arr.sort(function(a, b) { return a.label.localeCompare(b.label); });
        return arr;
    }

    // ── Grouped Rendering ──────────────────────────────────────────

    private appendGroupedItems(frag: DocumentFragment, cmds: PaletteCommand[]): void
    {
        if (!this.opts.showCategories)
        {
            for (let i = 0; i < cmds.length; i++)
            {
                this.appendItem(frag, cmds[i], []);
            }
            return;
        }
        const groups = this.groupByCategory(cmds);
        for (let g = 0; g < groups.length; g++)
        {
            this.appendCategoryHeader(frag, groups[g].category);
            for (let i = 0; i < groups[g].items.length; i++)
            {
                this.appendItem(frag, groups[g].items[i], []);
            }
        }
    }

    private appendGroupedScored(frag: DocumentFragment, scored: ScoredCommand[]): void
    {
        if (!this.opts.showCategories)
        {
            for (let i = 0; i < scored.length; i++)
            {
                this.appendItem(frag, scored[i].command, scored[i].positions);
            }
            return;
        }
        const groups = this.groupScoredByCategory(scored);
        for (let g = 0; g < groups.length; g++)
        {
            this.appendCategoryHeader(frag, groups[g].category);
            for (let i = 0; i < groups[g].items.length; i++)
            {
                const sc = groups[g].items[i];
                this.appendItem(frag, sc.command, sc.positions);
            }
        }
    }

    private groupByCategory(cmds: PaletteCommand[]): { category: string; items: PaletteCommand[] }[]
    {
        const map = new Map<string, PaletteCommand[]>();
        for (let i = 0; i < cmds.length; i++)
        {
            const cat = cmds[i].category || "Other";
            if (!map.has(cat)) { map.set(cat, []); }
            map.get(cat)!.push(cmds[i]);
        }
        const result: { category: string; items: PaletteCommand[] }[] = [];
        map.forEach(function(items, cat) { result.push({ category: cat, items: items }); });
        return result;
    }

    private groupScoredByCategory(scored: ScoredCommand[]): { category: string; items: ScoredCommand[] }[]
    {
        const map = new Map<string, ScoredCommand[]>();
        const order: string[] = [];
        for (let i = 0; i < scored.length; i++)
        {
            const cat = scored[i].command.category || "Other";
            if (!map.has(cat)) { map.set(cat, []); order.push(cat); }
            map.get(cat)!.push(scored[i]);
        }
        const result: { category: string; items: ScoredCommand[] }[] = [];
        for (let i = 0; i < order.length; i++)
        {
            result.push({ category: order[i], items: map.get(order[i])! });
        }
        return result;
    }

    // ── DOM Item Builders ──────────────────────────────────────────

    private appendCategoryHeader(frag: DocumentFragment, text: string): void
    {
        const el = createElement("div", CLS + "-category");
        setAttr(el, "role", "presentation");
        el.textContent = text;
        frag.appendChild(el);
    }

    private appendItem(
        frag: DocumentFragment,
        cmd: PaletteCommand,
        positions: number[],
        isRecent?: boolean
    ): void
    {
        const el = this.buildItem(cmd, positions, isRecent);
        frag.appendChild(el);
        this.visibleItems.push(el);
    }

    private buildItem(
        cmd: PaletteCommand,
        positions: number[],
        isRecent?: boolean
    ): HTMLElement
    {
        const el = createElement("div", CLS + "-item");
        el.id = CLS + "-item-" + cmd.id;
        setAttr(el, "role", "option");
        setAttr(el, "aria-selected", "false");
        setAttr(el, "data-command-id", cmd.id);
        if (cmd.disabled)
        {
            el.classList.add(CLS + "-item-disabled");
            setAttr(el, "aria-disabled", "true");
        }
        if (isRecent) { this.appendRecentIcon(el); }
        if (cmd.icon) { this.appendIcon(el, cmd.icon); }
        this.appendContent(el, cmd, positions);
        if (this.opts.showShortcuts && cmd.shortcut)
        {
            this.appendShortcut(el, cmd.shortcut);
        }
        const self = this;
        el.addEventListener("click", function()
        {
            const idx = self.visibleItems.indexOf(el);
            if (idx >= 0)
            {
                self.highlightIdx = idx;
                self.executeHighlighted();
            }
        });
        el.addEventListener("mouseenter", function()
        {
            const idx = self.visibleItems.indexOf(el);
            if (idx >= 0) { self.setHighlight(idx); }
        });
        return el;
    }

    private appendRecentIcon(parent: HTMLElement): void
    {
        const ic = createElement("i",
            "bi bi-arrow-counterclockwise " + CLS + "-recent-icon");
        setAttr(ic, "aria-hidden", "true");
        parent.appendChild(ic);
    }

    private appendIcon(parent: HTMLElement, iconCls: string): void
    {
        const ic = createElement("i", "bi " + iconCls + " " + CLS + "-item-icon");
        setAttr(ic, "aria-hidden", "true");
        parent.appendChild(ic);
    }

    private appendContent(
        parent: HTMLElement, cmd: PaletteCommand, positions: number[]
    ): void
    {
        const content = createElement("div", CLS + "-item-content");
        content.appendChild(buildHighlightedLabel(cmd.label, positions));
        if (cmd.description)
        {
            const desc = createElement("span", CLS + "-item-description");
            desc.textContent = cmd.description;
            content.appendChild(desc);
        }
        parent.appendChild(content);
    }

    private appendShortcut(parent: HTMLElement, shortcut: string): void
    {
        const kbd = createElement("kbd", CLS + "-item-shortcut");
        setAttr(kbd, "aria-hidden", "true");
        kbd.textContent = shortcut;
        parent.appendChild(kbd);
    }

    private appendEmpty(frag: DocumentFragment, query: string): void
    {
        const el = createElement("div", CLS + "-empty");
        setAttr(el, "role", "status");
        el.textContent = "No commands found for \"" + query + "\"";
        frag.appendChild(el);
    }

    // ── Footer ─────────────────────────────────────────────────────

    private renderFooter(): void
    {
        if (this.footerEl) { this.footerEl.remove(); this.footerEl = null; }
        if (!this.containerEl || !this.inputEl) { return; }
        const query = this.inputEl.value.trim();
        if (query.length === 0 || this.showAll) { return; }
        const total = this.countMatches(query);
        if (total <= this.opts.maxResults) { return; }
        this.footerEl = createElement("div", CLS + "-footer");
        const text = document.createTextNode(
            "Showing " + this.opts.maxResults + " of " + total + " results  "
        );
        this.footerEl.appendChild(text);
        const link = createElement("a", CLS + "-footer-link");
        setAttr(link, "href", "#");
        setAttr(link, "role", "button");
        link.textContent = "Show all";
        const self = this;
        link.addEventListener("click", function(e)
        {
            e.preventDefault();
            self.showAll = true;
            self.renderResults();
        });
        this.footerEl.appendChild(link);
        this.containerEl.appendChild(this.footerEl);
    }

    private countMatches(query: string): number
    {
        let count = 0;
        this.commands.forEach(function(cmd)
        {
            if (cmd.hidden) { return; }
            if (scoreCommand(query, cmd).score > 0) { count++; }
        });
        return count;
    }

    // ── Recent Cleanup ─────────────────────────────────────────────

    private cleanRecentIds(): void
    {
        const self = this;
        this.recentIds = this.recentIds.filter(function(id)
        {
            return self.commands.has(id);
        });
    }
}

// ============================================================================
// GLOBAL CONVENIENCE FUNCTIONS
// ============================================================================

export function openCommandPalette(): void
{
    CommandPalette.getInstance().open();
}

export function registerCommand(cmd: PaletteCommand): void
{
    CommandPalette.getInstance().registerCommand(cmd);
}

export function registerCommands(cmds: PaletteCommand[]): void
{
    CommandPalette.getInstance().registerCommands(cmds);
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).CommandPalette = CommandPalette;
(window as unknown as Record<string, unknown>).openCommandPalette = openCommandPalette;
(window as unknown as Record<string, unknown>).registerCommand = registerCommand;
(window as unknown as Record<string, unknown>).registerCommands = registerCommands;
