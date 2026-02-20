/*
 * ⚓ COMPONENT: ReasoningAccordion
 * 📜 PURPOSE: Collapsible accordion for displaying AI chain-of-thought reasoning
 *    steps with status indicators, shimmer animation, timing, confidence bars,
 *    and Vditor markdown rendering.
 * 🔗 RELATES: [[EnterpriseTheme]], [[CustomComponents]], [[Conversation]]
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type ReasoningStepStatus = "pending" | "thinking" | "complete" | "error";
export type ReasoningAccordionSize = "sm" | "default" | "lg";

export interface ReasoningStep
{
    id: string;
    title: string;
    content?: string;
    status: ReasoningStepStatus;
    duration?: number;
    confidence?: number;
    icon?: string;
    metadata?: Record<string, unknown>;
}

export interface ReasoningAccordionOptions
{
    id?: string;
    steps?: ReasoningStep[];
    title?: string;
    expandAll?: boolean;
    showTimings?: boolean;
    showStepNumbers?: boolean;
    showConfidence?: boolean;
    showExpandAllButton?: boolean;
    autoExpandActive?: boolean;
    autoCollapseCompleted?: boolean;
    size?: ReasoningAccordionSize;
    cssClass?: string;
    onStepClick?: (step: ReasoningStep) => void;
    onExpandChange?: (stepId: string, expanded: boolean) => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[ReasoningAccordion]";
const CLS = "reasoning";
const STATUS_ICONS: Record<ReasoningStepStatus, string> = {
    pending: "bi-circle",
    thinking: "bi-arrow-repeat",
    complete: "bi-check-circle-fill",
    error: "bi-exclamation-triangle-fill"
};
const STATUS_LABELS: Record<ReasoningStepStatus, string> = {
    pending: "Pending",
    thinking: "Thinking",
    complete: "Complete",
    error: "Error"
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

function generateId(): string
{
    return CLS + "-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 6);
}

function formatDuration(ms: number): string
{
    if (ms < 1000) { return ms + "ms"; }
    if (ms < 60000) { return (ms / 1000).toFixed(1) + "s"; }
    const min = Math.floor(ms / 60000);
    const sec = Math.round((ms % 60000) / 1000);
    return min + "m " + sec + "s";
}

function clampConfidence(val: number): number
{
    if (val < 0) { console.warn(LOG_PREFIX, "Confidence < 0, clamped"); return 0; }
    if (val > 1) { console.warn(LOG_PREFIX, "Confidence > 1, clamped"); return 1; }
    return val;
}

function getConfidenceColor(val: number): string
{
    if (val >= 0.7) { return "high"; }
    if (val >= 0.4) { return "moderate"; }
    return "low";
}

function getOverallStatus(steps: ReasoningStep[]): string
{
    if (steps.length === 0) { return "pending"; }
    let hasThinking = false;
    let hasError = false;
    let hasPending = false;
    let hasComplete = false;
    for (let i = 0; i < steps.length; i++)
    {
        if (steps[i].status === "thinking") { hasThinking = true; }
        if (steps[i].status === "error") { hasError = true; }
        if (steps[i].status === "pending") { hasPending = true; }
        if (steps[i].status === "complete") { hasComplete = true; }
    }
    if (hasThinking) { return "thinking"; }
    if (hasError) { return "error"; }
    if (hasComplete && !hasPending) { return "complete"; }
    if (!hasComplete && hasPending) { return "pending"; }
    return "mixed";
}

function getOverallIcon(overall: string): string
{
    if (overall === "complete") { return "bi-check-circle-fill"; }
    if (overall === "thinking") { return "bi-arrow-repeat"; }
    if (overall === "error") { return "bi-exclamation-triangle-fill"; }
    if (overall === "mixed") { return "bi-circle-half"; }
    return "bi-circle";
}

function safeCallback(fn: () => void): void
{
    try { fn(); }
    catch (e) { console.error(LOG_PREFIX, "Callback error:", e); }
}

// ============================================================================
// REASONING ACCORDION CLASS
// ============================================================================

export class ReasoningAccordion
{
    private opts: ReasoningAccordionOptions;
    private compId: string;
    private rootEl: HTMLElement | null = null;
    private headerStatsEl: HTMLElement | null = null;
    private headerStatusEl: HTMLElement | null = null;
    private stepsContainerEl: HTMLElement | null = null;
    private expandBtnEl: HTMLElement | null = null;
    private steps: ReasoningStep[] = [];
    private stepElMap: Map<string, HTMLElement> = new Map();
    private expandedSet: Set<string> = new Set();
    private collapseTimers: Map<string, number> = new Map();
    private containerId: string | null = null;
    private destroyed = false;

    constructor(options: ReasoningAccordionOptions)
    {
        this.opts = options;
        this.compId = options.id || generateId();
        this.buildRoot();
        if (options.steps)
        {
            for (let i = 0; i < options.steps.length; i++)
            {
                this.addStep(options.steps[i]);
            }
        }
        console.log(LOG_PREFIX, "Created with", this.steps.length, "steps");
    }

    // ── Lifecycle ──────────────────────────────────────────────────

    show(containerId: string): void
    {
        if (this.destroyed)
        {
            console.warn(LOG_PREFIX, "Cannot show destroyed instance");
            return;
        }
        if (this.containerId)
        {
            console.warn(LOG_PREFIX, "Already shown in", this.containerId);
            return;
        }
        const container = document.getElementById(containerId);
        if (!container)
        {
            console.error(LOG_PREFIX, "Container not found:", containerId);
            return;
        }
        this.containerId = containerId;
        container.appendChild(this.rootEl!);
        this.renderAllContent();
    }

    hide(): void
    {
        if (this.rootEl && this.rootEl.parentElement)
        {
            this.rootEl.remove();
        }
        this.containerId = null;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.hide();
        this.collapseTimers.forEach(function(t) { clearTimeout(t); });
        this.collapseTimers.clear();
        this.stepElMap.clear();
        this.steps = [];
        this.rootEl = null;
        console.log(LOG_PREFIX, "Destroyed");
    }

    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ── Build Root ─────────────────────────────────────────────────

    private buildRoot(): void
    {
        const size = this.opts.size || "default";
        this.rootEl = createElement("div", CLS + " " + CLS + "-" + size);
        this.rootEl.id = this.compId;
        setAttr(this.rootEl, "role", "region");
        setAttr(this.rootEl, "aria-label", "Reasoning steps");
        if (this.opts.cssClass)
        {
            this.rootEl.classList.add(this.opts.cssClass);
        }
        this.rootEl.appendChild(this.buildHeader());
        this.stepsContainerEl = createElement("div", CLS + "-steps");
        setAttr(this.stepsContainerEl, "role", "list");
        this.rootEl.appendChild(this.stepsContainerEl);
    }

    private buildHeader(): HTMLElement
    {
        const header = createElement("div", CLS + "-header");
        header.appendChild(this.buildHeaderLeft());
        header.appendChild(this.buildHeaderRight());
        return header;
    }

    private buildHeaderLeft(): HTMLElement
    {
        const left = createElement("div", CLS + "-header-left");
        this.headerStatusEl = createElement("span", CLS + "-header-status");
        setAttr(this.headerStatusEl, "aria-hidden", "true");
        left.appendChild(this.headerStatusEl);
        const title = createElement("h3", CLS + "-header-title");
        title.textContent = this.opts.title || "Reasoning";
        left.appendChild(title);
        return left;
    }

    private buildHeaderRight(): HTMLElement
    {
        const right = createElement("div", CLS + "-header-right");
        this.headerStatsEl = createElement("span", CLS + "-header-stats");
        setAttr(this.headerStatsEl, "aria-live", "polite");
        right.appendChild(this.headerStatsEl);
        if (this.opts.showExpandAllButton !== false)
        {
            this.expandBtnEl = this.buildExpandAllBtn();
            right.appendChild(this.expandBtnEl);
        }
        return right;
    }

    private buildExpandAllBtn(): HTMLElement
    {
        const btn = createElement("button", CLS + "-btn " + CLS + "-btn-expand-all");
        setAttr(btn, "type", "button");
        setAttr(btn, "aria-label", "Expand all steps");
        setAttr(btn, "title", "Expand all steps");
        btn.appendChild(createElement("i", "bi bi-arrows-expand"));
        const self = this;
        btn.addEventListener("click", function()
        {
            if (self.expandedSet.size === self.steps.length)
            {
                self.collapseAll();
            }
            else
            {
                self.expandAll();
            }
        });
        return btn;
    }

    // ── Step CRUD ──────────────────────────────────────────────────

    addStep(step: ReasoningStep): void
    {
        if (this.stepElMap.has(step.id))
        {
            console.warn(LOG_PREFIX, "Duplicate step ID:", step.id);
            return;
        }
        this.steps.push(step);
        const index = this.steps.length;
        const el = this.buildStepElement(step, index);
        this.stepElMap.set(step.id, el);
        this.stepsContainerEl!.appendChild(el);
        const shouldExpand = this.opts.expandAll ||
            (this.opts.autoExpandActive !== false &&
                step.status === "thinking");
        if (shouldExpand) { this.expandStep(step.id); }
        this.updateSummary();
    }

    updateStep(stepId: string, changes: Partial<ReasoningStep>): void
    {
        const step = this.findStep(stepId);
        if (!step) { return; }
        if (changes.status !== undefined && changes.status !== step.status)
        {
            this.applyStatusChange(step, changes.status);
        }
        Object.assign(step, changes);
        this.rebuildStepEl(step);
        this.updateSummary();
    }

    removeStep(stepId: string): void
    {
        const idx = this.steps.findIndex(function(s) { return s.id === stepId; });
        if (idx < 0) { console.warn(LOG_PREFIX, "Step not found:", stepId); return; }
        this.steps.splice(idx, 1);
        const el = this.stepElMap.get(stepId);
        if (el) { el.remove(); }
        this.stepElMap.delete(stepId);
        this.expandedSet.delete(stepId);
        this.clearCollapseTimer(stepId);
        this.renumberSteps();
        this.updateSummary();
    }

    getSteps(): ReasoningStep[]
    {
        return this.steps.slice();
    }

    clear(): void
    {
        const ids = this.steps.map(function(s) { return s.id; });
        for (let i = 0; i < ids.length; i++) { this.removeStep(ids[i]); }
    }

    // ── Expand / Collapse ──────────────────────────────────────────

    expandStep(stepId: string): void
    {
        if (this.expandedSet.has(stepId)) { return; }
        this.toggleStep(stepId, true);
    }

    collapseStep(stepId: string): void
    {
        if (!this.expandedSet.has(stepId)) { return; }
        this.toggleStep(stepId, false);
    }

    expandAll(): void
    {
        for (let i = 0; i < this.steps.length; i++)
        {
            this.expandStep(this.steps[i].id);
        }
        this.updateExpandAllBtn();
    }

    collapseAll(): void
    {
        for (let i = 0; i < this.steps.length; i++)
        {
            this.collapseStep(this.steps[i].id);
        }
        this.updateExpandAllBtn();
    }

    private toggleStep(stepId: string, expand: boolean): void
    {
        const el = this.stepElMap.get(stepId);
        if (!el) { return; }
        const header = el.querySelector("." + CLS + "-step-header") as HTMLElement;
        const content = el.querySelector("." + CLS + "-step-content") as HTMLElement;
        if (!header || !content) { return; }
        if (expand)
        {
            this.expandedSet.add(stepId);
            content.style.display = "";
            content.style.maxHeight = content.scrollHeight + "px";
            setAttr(header, "aria-expanded", "true");
        }
        else
        {
            this.expandedSet.delete(stepId);
            content.style.maxHeight = "0";
            content.style.display = "none";
            setAttr(header, "aria-expanded", "false");
        }
        this.updateChevron(el, expand);
        this.updateExpandAllBtn();
        if (this.opts.onExpandChange)
        {
            safeCallback(function()
            {
                // Already guarded above
            });
            try { this.opts.onExpandChange(stepId, expand); }
            catch (e) { console.error(LOG_PREFIX, "Callback error:", e); }
        }
    }

    private updateChevron(el: HTMLElement, expanded: boolean): void
    {
        const chevron = el.querySelector("." + CLS + "-step-toggle");
        if (!chevron) { return; }
        chevron.className = "bi " +
            (expanded ? "bi-chevron-down" : "bi-chevron-right") +
            " " + CLS + "-step-toggle";
    }

    private updateExpandAllBtn(): void
    {
        if (!this.expandBtnEl) { return; }
        const allExpanded = this.expandedSet.size === this.steps.length &&
            this.steps.length > 0;
        const icon = this.expandBtnEl.querySelector("i");
        if (icon)
        {
            icon.className = "bi " +
                (allExpanded ? "bi-arrows-collapse" : "bi-arrows-expand");
        }
        setAttr(this.expandBtnEl,
            "aria-label",
            allExpanded ? "Collapse all steps" : "Expand all steps"
        );
    }

    // ── Status Management ──────────────────────────────────────────

    setStepStatus(stepId: string, status: ReasoningStepStatus): void
    {
        const step = this.findStep(stepId);
        if (!step || step.status === status) { return; }
        this.applyStatusChange(step, status);
        step.status = status;
        this.rebuildStepEl(step);
        this.updateSummary();
    }

    private applyStatusChange(step: ReasoningStep, newStatus: ReasoningStepStatus): void
    {
        if (newStatus === "thinking" && this.opts.autoExpandActive !== false)
        {
            this.expandStep(step.id);
        }
        if (newStatus === "complete" && this.opts.autoCollapseCompleted)
        {
            this.scheduleAutoCollapse(step.id);
        }
    }

    private scheduleAutoCollapse(stepId: string): void
    {
        this.clearCollapseTimer(stepId);
        const self = this;
        const timer = window.setTimeout(function()
        {
            self.collapseStep(stepId);
            self.collapseTimers.delete(stepId);
        }, 300);
        this.collapseTimers.set(stepId, timer);
    }

    private clearCollapseTimer(stepId: string): void
    {
        const t = this.collapseTimers.get(stepId);
        if (t !== undefined)
        {
            clearTimeout(t);
            this.collapseTimers.delete(stepId);
        }
    }

    // ── Content ────────────────────────────────────────────────────

    setStepContent(stepId: string, markdown: string): void
    {
        const step = this.findStep(stepId);
        if (!step) { return; }
        step.content = markdown;
        const el = this.stepElMap.get(stepId);
        if (!el) { return; }
        const body = el.querySelector("." + CLS + "-step-body") as HTMLElement;
        if (body) { this.renderMarkdown(body, markdown); }
    }

    private renderMarkdown(el: HTMLElement, md: string): void
    {
        const Vditor = (window as unknown as Record<string, unknown>).Vditor as
            { preview: (el: HTMLElement, md: string, opts: Record<string, unknown>) => void } | undefined;
        if (Vditor && typeof Vditor.preview === "function")
        {
            Vditor.preview(el, md, { mode: "dark", sanitize: true, cdn: "" });
            this.applySanitizer(el);
        }
        else
        {
            console.warn(LOG_PREFIX, "Vditor not loaded; plain text fallback");
            el.textContent = md;
            el.style.whiteSpace = "pre-wrap";
        }
    }

    private applySanitizer(el: HTMLElement): void
    {
        const DOMPurify = (window as unknown as Record<string, unknown>).DOMPurify as
            { sanitize: (html: string) => string } | undefined;
        if (DOMPurify && typeof DOMPurify.sanitize === "function")
        {
            el.innerHTML = DOMPurify.sanitize(el.innerHTML);
        }
    }

    private renderAllContent(): void
    {
        for (let i = 0; i < this.steps.length; i++)
        {
            const step = this.steps[i];
            if (!step.content) { continue; }
            const el = this.stepElMap.get(step.id);
            if (!el) { continue; }
            const body = el.querySelector("." + CLS + "-step-body") as HTMLElement;
            if (body) { this.renderMarkdown(body, step.content); }
        }
    }

    // ── Timing ─────────────────────────────────────────────────────

    getTotalDuration(): number
    {
        let total = 0;
        for (let i = 0; i < this.steps.length; i++)
        {
            if (this.steps[i].duration) { total += this.steps[i].duration!; }
        }
        return total;
    }

    // ── Build Step Element ─────────────────────────────────────────

    private buildStepElement(step: ReasoningStep, index: number): HTMLElement
    {
        const el = createElement("div",
            CLS + "-step " + CLS + "-step-" + step.status);
        setAttr(el, "role", "listitem");
        setAttr(el, "data-step-id", step.id);
        el.appendChild(this.buildStepHeader(step, index));
        el.appendChild(this.buildStepContent(step, index));
        return el;
    }

    private buildStepHeader(step: ReasoningStep, index: number): HTMLElement
    {
        const header = createElement("div", CLS + "-step-header");
        setAttr(header, "role", "button");
        setAttr(header, "tabindex", "0");
        const expanded = this.expandedSet.has(step.id);
        setAttr(header, "aria-expanded", expanded ? "true" : "false");
        setAttr(header, "aria-controls",
            this.compId + "-" + step.id + "-content");
        header.appendChild(this.buildChevron(expanded));
        if (this.opts.showStepNumbers !== false)
        {
            header.appendChild(this.buildStepNumber(index));
        }
        header.appendChild(this.buildStatusIcon(step));
        header.appendChild(this.buildStepTitle(step));
        if (this.opts.showConfidence && step.confidence !== undefined)
        {
            header.appendChild(this.buildConfidenceBar(step));
        }
        if (this.opts.showTimings !== false)
        {
            header.appendChild(this.buildTiming(step));
        }
        this.bindStepHeaderEvents(header, step);
        return header;
    }

    private buildChevron(expanded: boolean): HTMLElement
    {
        const cls = expanded ? "bi-chevron-down" : "bi-chevron-right";
        const el = createElement("i", "bi " + cls + " " + CLS + "-step-toggle");
        setAttr(el, "aria-hidden", "true");
        return el;
    }

    private buildStepNumber(index: number): HTMLElement
    {
        const el = createElement("span", CLS + "-step-number");
        setAttr(el, "aria-hidden", "true");
        el.textContent = index + ".";
        return el;
    }

    private buildStatusIcon(step: ReasoningStep): HTMLElement
    {
        const wrap = createElement("span", CLS + "-step-status");
        setAttr(wrap, "aria-label", STATUS_LABELS[step.status]);
        const iconCls = step.icon || STATUS_ICONS[step.status];
        const icon = createElement("i", "bi " + iconCls);
        if (step.status === "thinking" && !step.icon)
        {
            icon.classList.add(CLS + "-spin");
        }
        wrap.appendChild(icon);
        return wrap;
    }

    private buildStepTitle(step: ReasoningStep): HTMLElement
    {
        const el = createElement("span", CLS + "-step-title");
        el.textContent = step.title;
        return el;
    }

    private buildTiming(step: ReasoningStep): HTMLElement
    {
        const el = createElement("span", CLS + "-step-timing");
        el.textContent = step.duration !== undefined
            ? formatDuration(step.duration) : "--";
        return el;
    }

    private buildConfidenceBar(step: ReasoningStep): HTMLElement
    {
        const val = clampConfidence(step.confidence || 0);
        const pct = Math.round(val * 100);
        const wrap = createElement("div", CLS + "-step-confidence");
        setAttr(wrap, "role", "progressbar");
        setAttr(wrap, "aria-valuenow", String(pct));
        setAttr(wrap, "aria-valuemin", "0");
        setAttr(wrap, "aria-valuemax", "100");
        setAttr(wrap, "aria-label", "Confidence: " + pct + "%");
        const bar = createElement("div",
            CLS + "-step-confidence-bar " +
            CLS + "-confidence-" + getConfidenceColor(val));
        bar.style.width = pct + "%";
        wrap.appendChild(bar);
        return wrap;
    }

    private buildStepContent(step: ReasoningStep, index: number): HTMLElement
    {
        const el = createElement("div", CLS + "-step-content");
        el.id = this.compId + "-" + step.id + "-content";
        setAttr(el, "role", "region");
        setAttr(el, "aria-label", "Step " + index + " details");
        if (!this.expandedSet.has(step.id))
        {
            el.style.display = "none";
            el.style.maxHeight = "0";
        }
        const body = createElement("div", CLS + "-step-body");
        if (step.content)
        {
            body.textContent = step.content;
        }
        el.appendChild(body);
        return el;
    }

    // ── Step Header Events ─────────────────────────────────────────

    private bindStepHeaderEvents(header: HTMLElement, step: ReasoningStep): void
    {
        const self = this;
        header.addEventListener("click", function()
        {
            self.handleStepClick(step);
        });
        header.addEventListener("keydown", function(e)
        {
            self.handleStepKeydown(e, step);
        });
    }

    private handleStepClick(step: ReasoningStep): void
    {
        if (this.expandedSet.has(step.id))
        {
            this.collapseStep(step.id);
        }
        else
        {
            this.expandStep(step.id);
        }
        if (this.opts.onStepClick)
        {
            safeCallback(() => { this.opts.onStepClick!(step); });
        }
    }

    private handleStepKeydown(e: KeyboardEvent, step: ReasoningStep): void
    {
        if (e.key === "Enter" || e.key === " ")
        {
            e.preventDefault();
            this.handleStepClick(step);
        }
        else if (e.key === "ArrowDown")
        {
            e.preventDefault();
            this.focusNextStep(step.id, 1);
        }
        else if (e.key === "ArrowUp")
        {
            e.preventDefault();
            this.focusNextStep(step.id, -1);
        }
        else if (e.key === "Home")
        {
            e.preventDefault();
            this.focusStepByIndex(0);
        }
        else if (e.key === "End")
        {
            e.preventDefault();
            this.focusStepByIndex(this.steps.length - 1);
        }
    }

    private focusNextStep(currentId: string, delta: number): void
    {
        const idx = this.steps.findIndex(function(s) { return s.id === currentId; });
        if (idx < 0) { return; }
        const next = idx + delta;
        this.focusStepByIndex(next);
    }

    private focusStepByIndex(index: number): void
    {
        if (index < 0 || index >= this.steps.length) { return; }
        const el = this.stepElMap.get(this.steps[index].id);
        if (!el) { return; }
        const header = el.querySelector("." + CLS + "-step-header") as HTMLElement;
        if (header) { header.focus(); }
    }

    // ── Rebuild Step ───────────────────────────────────────────────

    private rebuildStepEl(step: ReasoningStep): void
    {
        const oldEl = this.stepElMap.get(step.id);
        if (!oldEl) { return; }
        const idx = this.steps.indexOf(step);
        const newEl = this.buildStepElement(step, idx + 1);
        oldEl.replaceWith(newEl);
        this.stepElMap.set(step.id, newEl);
        if (step.content)
        {
            const body = newEl.querySelector("." + CLS + "-step-body") as HTMLElement;
            if (body && this.containerId)
            {
                this.renderMarkdown(body, step.content);
            }
        }
    }

    private renumberSteps(): void
    {
        for (let i = 0; i < this.steps.length; i++)
        {
            const el = this.stepElMap.get(this.steps[i].id);
            if (!el) { continue; }
            const numEl = el.querySelector("." + CLS + "-step-number");
            if (numEl) { numEl.textContent = (i + 1) + "."; }
            const content = el.querySelector("." + CLS + "-step-content");
            if (content)
            {
                setAttr(content as HTMLElement, "aria-label",
                    "Step " + (i + 1) + " details");
            }
        }
    }

    // ── Summary Header ─────────────────────────────────────────────

    private updateSummary(): void
    {
        this.updateHeaderStats();
        this.updateHeaderStatus();
    }

    private updateHeaderStats(): void
    {
        if (!this.headerStatsEl) { return; }
        const n = this.steps.length;
        const countText = n + (n === 1 ? " step" : " steps");
        let html = "";
        const countEl = createElement("span", CLS + "-header-count");
        countEl.textContent = countText;
        while (this.headerStatsEl.firstChild)
        {
            this.headerStatsEl.removeChild(this.headerStatsEl.firstChild);
        }
        this.headerStatsEl.appendChild(countEl);
        if (this.opts.showTimings !== false)
        {
            const total = this.getTotalDuration();
            if (total > 0)
            {
                const sep = createElement("span", CLS + "-header-separator");
                setAttr(sep, "aria-hidden", "true");
                sep.textContent = " \u00b7 ";
                this.headerStatsEl.appendChild(sep);
                const dur = createElement("span", CLS + "-header-duration");
                dur.textContent = formatDuration(total);
                this.headerStatsEl.appendChild(dur);
            }
        }
    }

    private updateHeaderStatus(): void
    {
        if (!this.headerStatusEl) { return; }
        while (this.headerStatusEl.firstChild)
        {
            this.headerStatusEl.removeChild(this.headerStatusEl.firstChild);
        }
        const overall = getOverallStatus(this.steps);
        const iconCls = getOverallIcon(overall);
        const icon = createElement("i",
            "bi " + iconCls + " " + CLS + "-status-" + overall);
        if (overall === "thinking")
        {
            icon.classList.add(CLS + "-spin");
        }
        this.headerStatusEl.appendChild(icon);
    }

    // ── Helpers ────────────────────────────────────────────────────

    private findStep(stepId: string): ReasoningStep | null
    {
        for (let i = 0; i < this.steps.length; i++)
        {
            if (this.steps[i].id === stepId) { return this.steps[i]; }
        }
        console.warn(LOG_PREFIX, "Step not found:", stepId);
        return null;
    }
}

// ============================================================================
// FACTORY + GLOBAL EXPORTS
// ============================================================================

export function createReasoningAccordion(
    containerId: string,
    options: ReasoningAccordionOptions
): ReasoningAccordion
{
    const acc = new ReasoningAccordion(options);
    acc.show(containerId);
    return acc;
}

(window as unknown as Record<string, unknown>).ReasoningAccordion = ReasoningAccordion;
(window as unknown as Record<string, unknown>).createReasoningAccordion = createReasoningAccordion;
