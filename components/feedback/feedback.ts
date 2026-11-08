/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * Created: 2026-11-08
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: Feedback
 * 📜 PURPOSE: A rating (thumbs or stars), an optional comment and problem
 *    reports for anything a page shows: an AI result, a document, a page.
 *    Inline (createFeedback) or as a dialog (showFeedbackDialog). It never
 *    sends anything itself: it hands the caller a value, and shows it saved
 *    only when the caller's promise resolves. One call per rating
 *    (specs/feedback.prd.md, F3).
 * 🔗 RELATES: [[FormDialog]], [[InlineToolbar]], [[Conversation]]
 * ⚡ FLOW: [pick] -> [Submit, or at once when commit is "once"] -> [busy]
 *          -> [onFeedback / onSave] -> [resolve: locked, "Saved"]
 *                                      [reject: error in place, input kept]
 * 🔒 SECURITY: No innerHTML. Labels and categories are set as text; icon
 *    classes go through classList.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[Feedback]";

const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. See FRONTEND_LOGGING.md section 1.3.
function _dbg(): boolean
{
    const f = window.__ebt_debug_logging;
    return f === undefined ? LOCAL_HOSTS.test(location.hostname) : !!f;
}
function logInfo(...a: unknown[]): void
{
    _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a);
}
function logWarn(...a: unknown[]): void
{
    _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a);
}
function logError(...a: unknown[]): void
{
    _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a);
}
function logDebug(...a: unknown[]): void
{
    _lu ? _lu.debug(...a) : _dbg() && console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a);
}

// LOG-4a: the shim preamble is uniform across components; see InlineToolbar.
void [logInfo, logWarn, logError, logDebug];

/** How long the Copy button shows its "copied" state. */
const COPIED_MS = 2000;

/** Classes whose value is used as given, as GraphCanvas and TypeBadge use them (docs/ICON_PACKS.md). */
const ICON_PACK_PREFIXES = ["fluent-ui-", "fluent-emoji-", "aws-", "azure-", "gcp-"];

// ============================================================================
// INTERFACES
// ============================================================================

/** "thumbs": helpful or not. "stars": 1 to max. */
export type FeedbackScale = "thumbs" | "stars";

/** What the person did, handed to onFeedback or onSave. */
export interface FeedbackData
{
    /** A rating (with or without a comment), or a problem report. */
    kind: "rating" | "report";
    /** Thumbs scale: the rating. */
    sentiment?: "positive" | "negative";
    /** Stars scale: the score, 1 to maxScore. */
    score?: number;
    /** Stars scale: the scale's maximum, 5 or 10. */
    maxScore?: number;
    /** Report: one of the caller's categories. */
    category?: string;
    /** The optional comment, or the report's description. */
    comment?: string;
    /** When the person acted (UTC). */
    timestamp: Date;
}

/** One save, for onSave: the target and what the person did. */
export interface FeedbackEntry
{
    /** The caller's id for what was rated, as passed in targetId. */
    targetId: string;
    /** What the person did. */
    feedback: FeedbackData;
}

/** A rating already stored: a sentiment on the thumbs scale, a score on the stars scale. */
export interface FeedbackRating
{
    /** Thumbs scale. */
    sentiment?: "positive" | "negative";
    /** Stars scale, 1 to max. */
    score?: number;
}

/** Thumbs: how many people rated each way. Stars: the average score and how many ratings it is over. */
export type FeedbackSummary =
    | { positive: number; negative: number }
    | { average: number; count: number };

/**
 * Every text the component shows, set with textContent. "{n}", "{max}",
 * "{average}", "{count}" and "{message}" are filled in where they appear.
 */
export interface FeedbackLabels
{
    /** The toolbar's accessible name. */
    toolbar: string;
    /** The thumbs-up button. */
    positive: string;
    /** The thumbs-down button. */
    negative: string;
    /** The star group's accessible name. */
    stars: string;
    /** Each star's accessible name, such as "3 of 5 stars". */
    star: string;
    /** The Comment button. */
    comment: string;
    /** The comment box's placeholder. */
    commentPlaceholder: string;
    /** The Submit button. */
    submit: string;
    /** The Report button. */
    report: string;
    /** The Report button once a report has saved. */
    reported: string;
    /** The Copy button. */
    copy: string;
    /** The Copy button just after a copy. */
    copied: string;
    /** Announced when a save resolves. */
    saved: string;
    /** Shown when a save rejects. */
    saveFailed: string;
    /** Thumbs summary, one person. */
    likeOne: string;
    /** Thumbs summary, any other count. */
    likeMany: string;
    /** Thumbs summary, one person. */
    dislikeOne: string;
    /** Thumbs summary, any other count. */
    dislikeMany: string;
    /** Stars summary over one rating. */
    averageOne: string;
    /** Stars summary over any other count. */
    averageMany: string;
    /** The rating dialog's title. */
    ratingTitle: string;
    /** The report dialog's title. */
    reportTitle: string;
    /** The rating dialog's rating field. */
    ratingField: string;
    /** The rating dialog's comment field. */
    commentField: string;
    /** The report dialog's category field. */
    categoryField: string;
    /** The report dialog's description field. */
    descriptionField: string;
    /** The dialogs' cancel button. */
    cancel: string;
    /** Shown when the rating dialog is submitted empty. */
    nothingToSend: string;
}

/** Every icon: a Bootstrap Icons name ("flag"), or a full class string ("fa-solid fa-flag"). */
export interface FeedbackIcons
{
    /** Thumbs up. */
    positive: string;
    /** Thumbs up, chosen. */
    positiveActive: string;
    /** Thumbs down. */
    negative: string;
    /** Thumbs down, chosen. */
    negativeActive: string;
    /** A star. */
    star: string;
    /** A filled star. */
    starActive: string;
    /** The Comment button. */
    comment: string;
    /** The Report button. */
    report: string;
    /** The Copy button. */
    copy: string;
    /** The Copy button just after a copy. */
    copied: string;
}

/** Options for createFeedback. */
export interface FeedbackOptions
{
    /** The element the toolbar renders into. */
    container: HTMLElement;
    /** The caller's id for what is being rated; passed back on every save. */
    targetId: string;
    /**
     * Called once per rating, and once per report, with the target's id and
     * what the person did. The control shows it saved only when the promise
     * resolves; on reject it shows the error and keeps the person's input.
     * Give this or onSave, not both.
     */
    onFeedback?: (targetId: string, feedback: FeedbackData) => Promise<void>;
    /** The same save as onFeedback, as one object; over A2UI the agent answers it. Give this or onFeedback. */
    onSave?: (entry: FeedbackEntry) => Promise<void>;
    /**
     * "submit" (default): picks stay local, so a new pick replaces the last,
     * until the person presses Submit. "once": the first pick is sent at once.
     * Either way the rating then locks.
     */
    commit?: "submit" | "once";
    /** "thumbs" (default) or "stars". */
    scale?: FeedbackScale;
    /** Stars only: 5 (default) or 10. */
    max?: 5 | 10;
    /** Show the rating. Default true. */
    showRating?: boolean;
    /** Show the Comment button; with commit "submit" only. Default true. */
    showComment?: boolean;
    /** Show the Report button. Default true. */
    showReport?: boolean;
    /** Show the Copy button. Default false. */
    showCopy?: boolean;
    /** Called when the person presses Copy. */
    onCopy?: (targetId: string) => void;
    /** The report categories. Default: Inaccurate, Not what I asked for, Harmful or unsafe, Other. */
    reportCategories?: string[];
    /** A rating already stored, which shows saved and locked. */
    initial?: FeedbackRating;
    /** Everyone's ratings, shown beside the control. The caller supplies the numbers. */
    summary?: FeedbackSummary;
    /** Text overrides. */
    labels?: Partial<FeedbackLabels>;
    /** Icon overrides. */
    icons?: Partial<FeedbackIcons>;
    /** "sm" (default) or "md". */
    size?: "sm" | "md";
    /** Extra classes on the root element. */
    cssClass?: string;
}

/** Options for showFeedbackDialog. */
export interface FeedbackDialogOptions
{
    /** The caller's id for what is being rated. */
    targetId: string;
    /** As FeedbackOptions.onFeedback. Give this or onSave. */
    onFeedback?: (targetId: string, feedback: FeedbackData) => Promise<void>;
    /** As FeedbackOptions.onSave. Give this or onFeedback. */
    onSave?: (entry: FeedbackEntry) => Promise<void>;
    /** "rating" (default): a rating and a comment. "report": a category and a description. */
    kind?: "rating" | "report";
    /** The dialog's title. Default: the ratingTitle or reportTitle label. */
    title?: string;
    /** As FeedbackOptions.scale. */
    scale?: FeedbackScale;
    /** As FeedbackOptions.max. */
    max?: 5 | 10;
    /** As FeedbackOptions.reportCategories. */
    reportCategories?: string[];
    /** A rating to start from. */
    initial?: FeedbackRating;
    /** Text overrides. */
    labels?: Partial<FeedbackLabels>;
    /** Icon overrides. */
    icons?: Partial<FeedbackIcons>;
}

/** The handle createFeedback returns. */
export interface FeedbackHandle
{
    /** Shows a stored rating, saved and locked; null clears it and unlocks the rating. */
    setFeedback(rating: FeedbackRating | null): void;
    /** Shows everyone's ratings; null hides them. */
    setSummary(summary: FeedbackSummary | null): void;
    /** Disables or enables every control. */
    setDisabled(disabled: boolean): void;
    /** Clears the pick, the comment and the Reported state, and unlocks the control. */
    reset(): void;
    /** The root element. */
    getElement(): HTMLElement;
    /** Subscribes to "copy"; returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** The saved rating and whether a report was sent, so a rebuilt control stays locked. */
    getState(): { saved: FeedbackRating | null; reported: boolean };
    /** Restores getState(). */
    setState(state: Record<string, unknown>): void;
    /** Feedback has no data slots; its options are its data. */
    setData(slot: string, value: unknown): void;
    /** Removes the control. Idempotent. */
    destroy(): void;
}

/** FormDialog's slice that the dialogs use; FormDialog is a separate component, read through window. */
interface FormDialogLike
{
    show(): void;
    on(channel: "submit" | "cancel", handler: () => void): () => void;
}

type Sink = (feedback: FeedbackData) => Promise<void>;

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_LABELS: FeedbackLabels = {
    toolbar: "Feedback",
    positive: "Helpful",
    negative: "Not helpful",
    stars: "Rating",
    star: "{n} of {max} stars",
    comment: "Add a comment",
    commentPlaceholder: "Tell us more (optional)",
    submit: "Submit",
    report: "Report a problem",
    reported: "Reported",
    copy: "Copy",
    copied: "Copied",
    saved: "Saved",
    saveFailed: "Could not save: {message}",
    likeOne: "{n} like",
    likeMany: "{n} likes",
    dislikeOne: "{n} dislike",
    dislikeMany: "{n} dislikes",
    averageOne: "{average} ({count} rating)",
    averageMany: "{average} ({count} ratings)",
    ratingTitle: "Rate this",
    reportTitle: "Report a problem",
    ratingField: "Your rating",
    commentField: "Comment (optional)",
    categoryField: "What went wrong?",
    descriptionField: "Details (optional)",
    cancel: "Cancel",
    nothingToSend: "Pick a rating or write a comment.",
};

const DEFAULT_ICONS: FeedbackIcons = {
    positive: "hand-thumbs-up",
    positiveActive: "hand-thumbs-up-fill",
    negative: "hand-thumbs-down",
    negativeActive: "hand-thumbs-down-fill",
    star: "star",
    starActive: "star-fill",
    comment: "chat-left-text",
    report: "flag",
    copy: "clipboard",
    copied: "clipboard-check",
};

const DEFAULT_CATEGORIES = ["Inaccurate", "Not what I asked for", "Harmful or unsafe", "Other"];

// ============================================================================
// HELPERS
// ============================================================================

/** A Bootstrap Icons name becomes "bi bi-<name>"; a class string or a pack class is used as given. */
function iconClasses(icon: string): string[]
{
    const trimmed = icon.trim();

    if (/\s/.test(trimmed) || ICON_PACK_PREFIXES.some((p) => trimmed.startsWith(p)))
    {
        return trimmed.split(/\s+/);
    }

    return ["bi", `bi-${trimmed}`];
}

/** An <i> for an icon, hidden from assistive technology; the button carries the name. */
function iconElement(icon: string): HTMLElement
{
    const i = document.createElement("i");
    i.classList.add(...iconClasses(icon), "feedback-icon");
    i.setAttribute("aria-hidden", "true");
    return i;
}

/** Swaps an icon element's classes for another icon's. */
function setIcon(el: HTMLElement, icon: string): void
{
    el.className = "";
    el.classList.add(...iconClasses(icon), "feedback-icon");
}

/** A label with its placeholders filled. */
function fill(template: string, values: Record<string, string>): string
{
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);
}

/** A whole number in the page's locale. */
function count(n: number): string
{
    return new Intl.NumberFormat().format(n);
}

/** A button of the toolbar's kind. */
function button(cls: string, label: string, icon?: string): HTMLButtonElement
{
    const b = document.createElement("button");
    b.type = "button";
    b.className = `feedback-btn ${cls}`;
    b.setAttribute("aria-label", label);
    b.title = label;
    if (icon) { b.appendChild(iconElement(icon)); }
    return b;
}

/** Throws on an option the component cannot honour; a missing option is not given a silent default. */
function checkCommon(o: FeedbackOptions | FeedbackDialogOptions, where: string): void
{
    if (typeof o.targetId !== "string" || o.targetId === "")
    {
        throw new Error(`${LOG_PREFIX} ${where}: options.targetId is required. Pass the id of what is being rated.`);
    }

    if ((o.onFeedback === undefined) === (o.onSave === undefined))
    {
        throw new Error(`${LOG_PREFIX} ${where}: pass exactly one of options.onFeedback and options.onSave; `
            + `${o.onFeedback ? "both were" : "neither was"} given.`);
    }

    if (o.scale !== undefined && o.scale !== "thumbs" && o.scale !== "stars")
    {
        throw new Error(`${LOG_PREFIX} ${where}: options.scale is "${String(o.scale)}"; use "thumbs" or "stars".`);
    }

    if (o.max !== undefined && o.max !== 5 && o.max !== 10)
    {
        throw new Error(`${LOG_PREFIX} ${where}: options.max is ${String(o.max)}; use 5 or 10.`);
    }

    if (o.reportCategories !== undefined && o.reportCategories.length === 0)
    {
        throw new Error(`${LOG_PREFIX} ${where}: options.reportCategories is empty. Leave it out for the defaults.`);
    }

    checkRating(o.initial, o.scale ?? "thumbs", o.max ?? 5, where);
}

/** Throws on a rating that does not fit the scale. */
function checkRating(r: FeedbackRating | null | undefined, scale: FeedbackScale, max: number, where: string): void
{
    if (isEmpty(r)) { return; }

    const ok = scale === "thumbs"
        ? (r.sentiment === "positive" || r.sentiment === "negative") && r.score === undefined
        : Number.isInteger(r.score) && (r.score as number) >= 1 && (r.score as number) <= max
            && r.sentiment === undefined;

    if (!ok)
    {
        throw new Error(`${LOG_PREFIX} ${where}: the rating ${JSON.stringify(r)} does not fit the ${scale} scale; `
            + (scale === "thumbs" ? "give sentiment \"positive\" or \"negative\"." : `give a whole score from 1 to ${max}.`));
    }
}

/** No rating: absent, null, or neither a sentiment nor a score. */
function isEmpty(r: FeedbackRating | null | undefined): r is null | undefined
{
    return !r || (r.sentiment === undefined && r.score === undefined);
}

/** The save the options name, as one function of the feedback. */
function sinkOf(o: FeedbackOptions | FeedbackDialogOptions): Sink
{
    const { targetId, onFeedback, onSave } = o;

    return onFeedback
        ? (feedback) => onFeedback(targetId, feedback)
        : (feedback) => (onSave as (e: FeedbackEntry) => Promise<void>)({ targetId, feedback });
}

/** A rejection's message. */
function messageOf(err: unknown): string
{
    return err instanceof Error ? err.message : String(err);
}

// ============================================================================
// RATING CONTROL (shared by the inline form and the dialog)
// ============================================================================

/** Thumbs or stars, with an optional summary. Reports each pick; never saves. */
class RatingControl
{
    readonly element: HTMLElement;
    private value: FeedbackRating | null = null;
    private readonly buttons: HTMLButtonElement[] = [];
    private readonly summaryEls: HTMLElement[] = [];

    constructor(
        private readonly scale: FeedbackScale,
        private readonly max: number,
        private readonly labels: FeedbackLabels,
        private readonly icons: FeedbackIcons,
        private readonly onPick: (value: FeedbackRating) => void)
    {
        this.element = scale === "thumbs" ? this.buildThumbs() : this.buildStars();
    }

    getValue(): FeedbackRating | null
    {
        return this.value;
    }

    setValue(value: FeedbackRating | null): void
    {
        this.value = value;
        this.render();
    }

    setDisabled(disabled: boolean): void
    {
        this.buttons.forEach((b) => { b.disabled = disabled; });
    }

    setSummary(summary: FeedbackSummary | null): void
    {
        this.summaryEls.forEach((el) => { el.textContent = ""; el.hidden = true; });

        if (!summary) { return; }

        if (this.scale === "thumbs" && "positive" in summary)
        {
            this.showCount(0, summary.positive, this.labels.likeOne, this.labels.likeMany);
            this.showCount(1, summary.negative, this.labels.dislikeOne, this.labels.dislikeMany);
        }
        else if (this.scale === "stars" && "average" in summary)
        {
            const average = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                .format(summary.average);
            const template = summary.count === 1 ? this.labels.averageOne : this.labels.averageMany;
            this.summaryEls[0].textContent = fill(template, { average, count: count(summary.count) });
            this.summaryEls[0].hidden = false;
        }
        else
        {
            throw new Error(`${LOG_PREFIX} setSummary: ${JSON.stringify(summary)} is not a ${this.scale} summary; `
                + (this.scale === "thumbs" ? "give { positive, negative }." : "give { average, count }."));
        }
    }

    private showCount(i: number, n: number, one: string, many: string): void
    {
        this.summaryEls[i].textContent = fill(n === 1 ? one : many, { n: count(n) });
        this.summaryEls[i].hidden = false;
    }

    private summarySpan(): HTMLElement
    {
        const s = document.createElement("span");
        s.className = "feedback-summary";
        s.hidden = true;
        this.summaryEls.push(s);
        return s;
    }

    private buildThumbs(): HTMLElement
    {
        const group = document.createElement("span");
        group.className = "feedback-thumbs";

        for (const sentiment of ["positive", "negative"] as const)
        {
            const b = button(`feedback-thumb feedback-${sentiment}`, this.labels[sentiment], this.icons[sentiment]);
            b.setAttribute("aria-pressed", "false");
            b.dataset.sentiment = sentiment;
            b.addEventListener("click", () => this.pick({ sentiment }));
            this.buttons.push(b);
            group.append(b, this.summarySpan());
        }

        return group;
    }

    private buildStars(): HTMLElement
    {
        const wrap = document.createElement("span");
        wrap.className = "feedback-stars-wrap";
        const group = document.createElement("span");
        group.className = "feedback-stars";
        group.setAttribute("role", "radiogroup");
        group.setAttribute("aria-label", this.labels.stars);

        for (let n = 1; n <= this.max; n++)
        {
            const b = button("feedback-star", fill(this.labels.star, { n: String(n), max: String(this.max) }),
                this.icons.star);
            b.setAttribute("role", "radio");
            b.setAttribute("aria-checked", "false");
            b.tabIndex = n === 1 ? 0 : -1;
            b.dataset.score = String(n);
            b.addEventListener("click", () => this.pick({ score: n }));
            this.buttons.push(b);
            group.appendChild(b);
        }

        group.addEventListener("keydown", (e) => this.onStarKey(e));
        wrap.append(group, this.summarySpan());
        return wrap;
    }

    /**
     * Arrow keys, Home and End move focus among the stars; Space and Enter
     * pick (the buttons' own activation). Focus does not pick, so moving
     * through the stars with commit "once" sends nothing.
     */
    private onStarKey(e: KeyboardEvent): void
    {
        const at = this.buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (at === -1) { return; }

        const last = this.buttons.length - 1;
        const to = { ArrowRight: at + 1, ArrowUp: at + 1, ArrowLeft: at - 1, ArrowDown: at - 1, Home: 0, End: last }
            [e.key as "Home"];

        if (to === undefined) { return; }

        e.preventDefault();
        this.focusStar(Math.max(0, Math.min(last, to)));
    }

    private focusStar(i: number): void
    {
        this.buttons.forEach((b, j) => { b.tabIndex = j === i ? 0 : -1; });
        this.buttons[i].focus();
    }

    private pick(value: FeedbackRating): void
    {
        this.setValue(value);
        this.onPick(value);
    }

    private render(): void
    {
        if (this.scale === "thumbs")
        {
            for (const b of this.buttons)
            {
                const sentiment = b.dataset.sentiment as "positive" | "negative";
                const on = this.value?.sentiment === sentiment;
                b.setAttribute("aria-pressed", String(on));
                b.classList.toggle("feedback-btn-active", on);
                setIcon(b.firstElementChild as HTMLElement, this.icons[on ? `${sentiment}Active` as const : sentiment]);
            }
            return;
        }

        const score = this.value?.score ?? 0;

        this.buttons.forEach((b, i) =>
        {
            b.setAttribute("aria-checked", String(i + 1 === score));
            b.classList.toggle("feedback-btn-active", i < score);
            setIcon(b.firstElementChild as HTMLElement, i < score ? this.icons.starActive : this.icons.star);
            b.tabIndex = (score === 0 ? i === 0 : i + 1 === score) ? 0 : -1;
        });
    }
}

/** The rating's fields of FeedbackData. */
function ratingFields(r: FeedbackRating | null, scale: FeedbackScale, max: number): Partial<FeedbackData>
{
    if (!r) { return {}; }

    return scale === "thumbs" ? { sentiment: r.sentiment } : { score: r.score, maxScore: max };
}

// ============================================================================
// INLINE FORM
// ============================================================================

class FeedbackImpl implements FeedbackHandle
{
    private readonly opts: FeedbackOptions;
    private readonly labels: FeedbackLabels;
    private readonly icons: FeedbackIcons;
    private readonly scale: FeedbackScale;
    private readonly max: 5 | 10;
    private readonly commit: "submit" | "once";
    private readonly sink: Sink;
    private readonly root: HTMLElement;
    private readonly bar: HTMLElement;
    private readonly rating: RatingControl | null;
    private readonly commentBtn: HTMLButtonElement | null = null;
    private readonly submitBtn: HTMLButtonElement | null = null;
    private readonly reportBtn: HTMLButtonElement | null = null;
    private readonly copyBtn: HTMLButtonElement | null = null;
    private readonly panel: HTMLElement | null = null;
    private readonly textarea: HTMLTextAreaElement | null = null;
    private readonly status: HTMLElement;
    private readonly error: HTMLElement;
    private readonly handlers = new Set<(payload: unknown) => void>();
    private saved: FeedbackRating | null = null;
    private locked = false;
    private reported = false;
    private busy = false;
    private disabled = false;
    private destroyed = false;
    private copiedTimer: ReturnType<typeof setTimeout> | undefined;

    constructor(opts: FeedbackOptions)
    {
        this.opts = opts;
        this.labels = { ...DEFAULT_LABELS, ...opts.labels };
        this.icons = { ...DEFAULT_ICONS, ...opts.icons };
        this.scale = opts.scale ?? "thumbs";
        this.max = opts.max ?? 5;
        this.commit = opts.commit ?? "submit";
        this.sink = sinkOf(opts);

        this.root = document.createElement("div");
        this.root.className = `feedback feedback-${opts.size ?? "sm"}`;
        if (opts.cssClass) { this.root.classList.add(...opts.cssClass.trim().split(/\s+/)); }

        this.bar = document.createElement("div");
        this.bar.className = "feedback-bar";
        this.bar.setAttribute("role", "toolbar");
        this.bar.setAttribute("aria-label", this.labels.toolbar);
        this.root.appendChild(this.bar);

        this.rating = opts.showRating === false ? null
            : new RatingControl(this.scale, this.max, this.labels, this.icons, (v) => this.onPick(v));
        if (this.rating) { this.bar.appendChild(this.rating.element); }

        if (this.commit === "submit" && opts.showComment !== false)
        {
            this.commentBtn = button("feedback-comment", this.labels.comment, this.icons.comment);
            this.commentBtn.setAttribute("aria-expanded", "false");
            this.commentBtn.addEventListener("click", () => this.togglePanel());
            this.bar.appendChild(this.commentBtn);
            ({ panel: this.panel, textarea: this.textarea } = this.buildPanel());
        }

        if (this.commit === "submit")
        {
            this.submitBtn = button("feedback-submit", this.labels.submit);
            this.submitBtn.textContent = this.labels.submit;
            this.submitBtn.hidden = true;
            this.submitBtn.addEventListener("click", () => { void this.submit(); });
            this.bar.appendChild(this.submitBtn);
        }

        if (opts.showReport !== false)
        {
            this.reportBtn = button("feedback-report", this.labels.report, this.icons.report);
            this.reportBtn.addEventListener("click", () => { void this.openReport(); });
            this.bar.appendChild(this.reportBtn);
        }

        if (opts.showCopy === true)
        {
            this.copyBtn = button("feedback-copy", this.labels.copy, this.icons.copy);
            this.copyBtn.addEventListener("click", () => this.copy());
            this.bar.appendChild(this.copyBtn);
        }

        this.status = document.createElement("span");
        this.status.className = "feedback-status";
        this.status.setAttribute("role", "status");
        this.status.setAttribute("aria-live", "polite");
        this.bar.appendChild(this.status);

        if (this.panel) { this.root.appendChild(this.panel); }

        this.error = document.createElement("div");
        this.error.className = "feedback-error";
        this.error.setAttribute("role", "alert");
        this.error.hidden = true;
        this.root.appendChild(this.error);

        if (opts.summary) { this.setSummary(opts.summary); }
        if (!isEmpty(opts.initial)) { this.setFeedback(opts.initial); }

        opts.container.appendChild(this.root);
        logDebug("created for", opts.targetId, this.scale, this.commit);
    }

    // ── Public handle ──────────────────────────────────────────────────

    setFeedback(rating: FeedbackRating | null): void
    {
        checkRating(rating, this.scale, this.max, "setFeedback");
        const stored = isEmpty(rating) ? null : { ...rating };
        this.saved = stored;
        this.locked = stored !== null;
        this.rating?.setValue(stored);
        if (stored === null) { this.clearComment(); }
        this.refresh();
    }

    setSummary(summary: FeedbackSummary | null): void
    {
        this.rating?.setSummary(summary);
    }

    setDisabled(disabled: boolean): void
    {
        this.disabled = disabled;
        this.refresh();
    }

    reset(): void
    {
        this.saved = null;
        this.locked = false;
        this.reported = false;
        this.rating?.setValue(null);
        this.clearComment();
        this.showError(null);
        this.status.textContent = "";
        this.refresh();
    }

    getElement(): HTMLElement
    {
        return this.root;
    }

    on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (channel !== "copy")
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the only channel is "copy". `
                + "Saves reach onFeedback or onSave.");
        }
        this.handlers.add(handler);
        return () => { this.handlers.delete(handler); };
    }

    getState(): { saved: FeedbackRating | null; reported: boolean }
    {
        return { saved: this.saved ? { ...this.saved } : null, reported: this.reported };
    }

    setState(state: Record<string, unknown>): void
    {
        if ("saved" in state) { this.setFeedback((state.saved as FeedbackRating | null) ?? null); }
        if ("reported" in state) { this.reported = state.reported === true; this.refresh(); }
    }

    setData(slot: string): void
    {
        throw new Error(`${LOG_PREFIX} setData("${slot}"): Feedback has no data slots. Its options are its data.`);
    }

    destroy(): void
    {
        if (this.destroyed) { return; }

        this.destroyed = true;
        clearTimeout(this.copiedTimer);
        this.handlers.clear();
        this.root.remove();
    }

    // ── Rating and comment ─────────────────────────────────────────────

    private onPick(value: FeedbackRating): void
    {
        this.showError(null);

        if (this.commit === "once")
        {
            void this.save({ kind: "rating", ...ratingFields(value, this.scale, this.max), timestamp: new Date() },
                () => this.lock(value));
            return;
        }

        this.refresh();
    }

    private async submit(): Promise<void>
    {
        const pick = this.rating?.getValue() ?? null;
        const comment = this.textarea?.value.trim() ?? "";

        if (!pick && comment === "") { return; }

        const data: FeedbackData = { kind: "rating", ...ratingFields(pick, this.scale, this.max),
            ...(comment !== "" ? { comment } : {}), timestamp: new Date() };

        await this.save(data, () =>
        {
            this.lock(pick);
            this.clearComment();
        });
    }

    /** Sends one save; locks only when it resolves, and keeps everything when it rejects. */
    private async save(data: FeedbackData, onSaved: () => void): Promise<boolean>
    {
        if (this.busy) { return false; }

        this.setBusy(true);
        this.showError(null);
        this.status.textContent = "";

        try
        {
            await this.sink(data);
        }
        catch (err)
        {
            if (this.destroyed) { return false; }
            this.setBusy(false);
            logWarn("save rejected for", this.opts.targetId, err);
            this.showError(fill(this.labels.saveFailed, { message: messageOf(err) }));
            return false;
        }

        if (this.destroyed) { return true; }

        this.setBusy(false);
        onSaved();
        this.status.textContent = this.labels.saved;
        logInfo("saved", data.kind, "for", this.opts.targetId);
        return true;
    }

    private lock(rating: FeedbackRating | null): void
    {
        this.saved = rating;
        this.locked = true;
        this.refresh();
    }

    private buildPanel(): { panel: HTMLElement; textarea: HTMLTextAreaElement }
    {
        const panel = document.createElement("div");
        panel.className = "feedback-panel";
        panel.id = `feedback-panel-${Math.random().toString(36).slice(2, 10)}`;
        panel.hidden = true;

        const textarea = document.createElement("textarea");
        textarea.className = "form-control form-control-sm feedback-textarea";
        textarea.rows = 3;
        textarea.placeholder = this.labels.commentPlaceholder;
        textarea.setAttribute("aria-label", this.labels.comment);
        textarea.addEventListener("input", () => this.refresh());
        textarea.addEventListener("keydown", (e) =>
        {
            if (e.key !== "Escape") { return; }
            e.preventDefault();
            this.setPanelOpen(false);
            this.commentBtn?.focus();
        });

        panel.appendChild(textarea);
        this.commentBtn?.setAttribute("aria-controls", panel.id);
        return { panel, textarea };
    }

    private togglePanel(): void
    {
        this.setPanelOpen(this.panel?.hidden === true);
    }

    /** Opens or closes the comment panel; closing keeps the text. */
    private setPanelOpen(open: boolean): void
    {
        if (!this.panel) { return; }

        this.panel.hidden = !open;
        this.commentBtn?.setAttribute("aria-expanded", String(open));
        this.commentBtn?.classList.toggle("feedback-btn-active", open);
        if (open) { this.textarea?.focus(); }
    }

    private clearComment(): void
    {
        if (this.textarea) { this.textarea.value = ""; }
        this.setPanelOpen(false);
    }

    // ── Report and copy ────────────────────────────────────────────────

    private async openReport(): Promise<void>
    {
        const saved = await openDialog({
            targetId: this.opts.targetId,
            kind: "report",
            reportCategories: this.opts.reportCategories,
            labels: this.opts.labels,
            icons: this.opts.icons,
        }, this.sink);

        if (saved && !this.destroyed)
        {
            this.reported = true;
            this.status.textContent = this.labels.saved;
            this.refresh();
            this.reportBtn?.focus();
        }
    }

    private copy(): void
    {
        const payload = { targetId: this.opts.targetId };

        // SURFACE_CONTRACT §3: the legacy callback first, unguarded.
        this.opts.onCopy?.(this.opts.targetId);
        for (const handler of this.handlers)
        {
            try { handler(payload); }
            catch (err) { logError('Channel "copy" handler threw', err); }
        }

        if (!this.copyBtn) { return; }

        setIcon(this.copyBtn.firstElementChild as HTMLElement, this.icons.copied);
        this.copyBtn.setAttribute("aria-label", this.labels.copied);
        clearTimeout(this.copiedTimer);
        this.copiedTimer = setTimeout(() =>
        {
            if (!this.copyBtn) { return; }
            setIcon(this.copyBtn.firstElementChild as HTMLElement, this.icons.copy);
            this.copyBtn.setAttribute("aria-label", this.labels.copy);
        }, COPIED_MS);
    }

    // ── View ───────────────────────────────────────────────────────────

    private setBusy(busy: boolean): void
    {
        this.busy = busy;
        this.root.setAttribute("aria-busy", String(busy));
        this.refresh();
    }

    private showError(message: string | null): void
    {
        this.error.textContent = message ?? "";
        this.error.hidden = message === null;
    }

    /** Applies locked, busy, disabled and reported to every control. */
    private refresh(): void
    {
        const off = this.busy || this.disabled;
        const ratingOff = off || this.locked;
        const pick = this.rating?.getValue() ?? null;
        const text = this.textarea?.value.trim() ?? "";

        this.root.classList.toggle("feedback-locked", this.locked);
        this.rating?.setDisabled(ratingOff);

        if (this.commentBtn)
        {
            this.commentBtn.disabled = ratingOff;
            this.commentBtn.hidden = this.locked;
            if (this.locked) { this.setPanelOpen(false); }
        }
        if (this.textarea) { this.textarea.disabled = ratingOff; }
        if (this.submitBtn)
        {
            this.submitBtn.hidden = this.locked || (!pick && text === "");
            this.submitBtn.disabled = off;
        }
        if (this.reportBtn)
        {
            const label = this.reported ? this.labels.reported : this.labels.report;
            this.reportBtn.disabled = off || this.reported;
            this.reportBtn.setAttribute("aria-label", label);
            this.reportBtn.title = label;
            this.reportBtn.classList.toggle("feedback-btn-done", this.reported);
        }
        if (this.copyBtn) { this.copyBtn.disabled = this.disabled; }
    }
}

// ============================================================================
// DIALOG
// ============================================================================

/** Opens a rating or report dialog over FormDialog; resolves with what saved, or null on cancel. */
function openDialog(o: FeedbackDialogOptions | (FeedbackDialogOptions & { kind: "report" }), sink: Sink)
    : Promise<FeedbackData | null>
{
    const create = window.createFormDialog;

    if (typeof create !== "function")
    {
        throw new Error(`${LOG_PREFIX} showFeedbackDialog needs FormDialog. Load components/formdialog/formdialog.js `
            + "and its stylesheet before this one.");
    }

    const labels = { ...DEFAULT_LABELS, ...o.labels };
    const icons = { ...DEFAULT_ICONS, ...o.icons };
    const kind = o.kind ?? "rating";
    const scale = o.scale ?? "thumbs";
    const max = o.max ?? 5;
    const error = document.createElement("div");
    error.className = "feedback-error";
    error.setAttribute("role", "alert");
    error.hidden = true;

    const rating = kind === "rating" ? new RatingControl(scale, max, labels, icons, () => { error.hidden = true; }) : null;
    if (rating && !isEmpty(o.initial)) { rating.setValue({ ...o.initial }); }

    // The rating sits in a .feedback root, which sizes its buttons as the inline form does.
    const ratingRoot = document.createElement("div");
    ratingRoot.className = "feedback feedback-md";
    if (rating) { ratingRoot.appendChild(rating.element); }

    const categories = o.reportCategories ?? DEFAULT_CATEGORIES;
    const fields = rating
        ? [
            { name: "rating", label: labels.ratingField, type: "custom" as const, customElement: ratingRoot },
            { name: "comment", label: labels.commentField, type: "textarea" as const, rows: 3 },
        ]
        : [
            { name: "category", label: labels.categoryField, type: "select" as const, required: true,
                options: categories.map((c) => ({ value: c, label: c })), value: categories[0] },
            { name: "description", label: labels.descriptionField, type: "textarea" as const, rows: 3 },
        ];

    return new Promise((resolve) =>
    {
        let saved: FeedbackData | null = null;

        const dialog = create({
            title: o.title ?? (rating ? labels.ratingTitle : labels.reportTitle),
            size: "sm",
            fields,
            customContent: error,
            submitLabel: labels.submit,
            cancelLabel: labels.cancel,
            onSubmit: async (values: Record<string, string>) =>
            {
                const comment = (values.comment ?? values.description ?? "").trim();
                const data: FeedbackData = rating
                    ? { kind: "rating", ...ratingFields(rating.getValue(), scale, max),
                        ...(comment !== "" ? { comment } : {}), timestamp: new Date() }
                    : { kind: "report", category: values.category, ...(comment !== "" ? { comment } : {}),
                        timestamp: new Date() };

                error.hidden = true;

                if (rating && !rating.getValue() && comment === "")
                {
                    error.textContent = labels.nothingToSend;
                    error.hidden = false;
                    throw new Error(labels.nothingToSend);
                }

                try
                {
                    await sink(data);
                }
                catch (err)
                {
                    logWarn("dialog save rejected for", o.targetId, err);
                    error.textContent = fill(labels.saveFailed, { message: messageOf(err) });
                    error.hidden = false;
                    throw err;
                }

                saved = data;
                logInfo("saved", data.kind, "for", o.targetId);
            },
        }) as unknown as FormDialogLike;

        dialog.on("submit", () => resolve(saved));
        dialog.on("cancel", () => resolve(null));
        dialog.show();
    });
}

// ============================================================================
// FACTORIES
// ============================================================================

/**
 * Creates the inline feedback toolbar inside options.container.
 *
 * @param options - The target, the save callback and what to show.
 * @returns The control's handle.
 */
export function createFeedback(options: FeedbackOptions): FeedbackHandle
{
    if (!(options?.container instanceof HTMLElement))
    {
        throw new Error(`${LOG_PREFIX} createFeedback: options.container is required. Pass the element to render into.`);
    }

    checkCommon(options, "createFeedback");

    if (options.commit !== undefined && options.commit !== "submit" && options.commit !== "once")
    {
        throw new Error(`${LOG_PREFIX} createFeedback: options.commit is "${String(options.commit)}"; `
            + "use \"submit\" or \"once\".");
    }

    // The Report button opens a FormDialog; a page without it would fail on the first report, not here.
    if (options.showReport !== false && typeof window.createFormDialog !== "function")
    {
        throw new Error(`${LOG_PREFIX} createFeedback: the Report button needs FormDialog. Load `
            + "components/formdialog/formdialog.js before creating the control, or pass showReport: false.");
    }

    return new FeedbackImpl(options);
}

/**
 * Opens a rating or report dialog, built on FormDialog (which must be
 * loaded). The rating and comment, or the report, are saved in one call.
 *
 * @param options - The target, the save callback and the dialog's kind.
 * @returns What was saved, or null when the person cancels.
 */
export function showFeedbackDialog(options: FeedbackDialogOptions): Promise<FeedbackData | null>
{
    checkCommon(options, "showFeedbackDialog");

    if (options.kind !== undefined && options.kind !== "rating" && options.kind !== "report")
    {
        throw new Error(`${LOG_PREFIX} showFeedbackDialog: options.kind is "${String(options.kind)}"; `
            + "use \"rating\" or \"report\".");
    }

    return openDialog(options, sinkOf(options));
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createFeedback = createFeedback;
window.showFeedbackDialog = showFeedbackDialog;
