/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: SiteFooter
 * 📜 PURPOSE: Semantic public-site footer — organization details, grouped
 *             navigation, contact details, legal links, and optional build
 *             information, in one to four responsive columns.
 * 🔗 RELATES: [[EnterpriseTheme]], [[MarketingHero]], [[AuthCard]]
 * ⚡ FLOW: [Static page] -> [sitefooter.css] -> [Rendered footer]
 *         [Consumer App] -> [createSiteFooter()] -> [Rendered footer]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this component. */
const LOG_PREFIX = "[SiteFooter]";

const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
const LOCAL_HOSTS = /^(localhost|127\.0\.0\.1|\[::1\]|.+\.localhost)$/;
// LOG-6. Read per call, never captured. A const freezes the flag at script
// evaluation, so a console toggle on a live page did nothing. The semantics
// match isGlobalFlagSet in logutility.ts: unset means "decide from the host"
// for debug and "off" for trace. See FRONTEND_LOGGING.md section 1.3.
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

// LOG-4a DECLARES THE SHIM PREAMBLE IN EVERY COMPONENT, whether it calls
// every level or not, so a developer adding a log line never has to wire
// one up. `noUnusedLocals` is on (UNUSED-1), and this reference is what
// says that uniformity is deliberate rather than an oversight. Deleting a
// shim to silence the compiler is the wrong repair: `dynamicVerboseShims`
// holds the logDebug and logTrace population as a floor, and the preamble
// is the contract FRONTEND_LOGGING.md section 1.1 states.
void [logInfo, logWarn, logError, logDebug];

/** Widest column count the stylesheet defines a rule for. */
const MAX_COLUMNS = 4;

/** Heading level used for a navigation group when the caller says nothing. */
const DEFAULT_HEADING_LEVEL = 2;

/** Instance counter for unique IDs. */
let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** One footer link. */
export interface SiteFooterLink
{
    /** Visible label. Rendered as text. */
    text: string;
    /**
     * Destination. Without it the link renders as a button whose click only
     * reaches linkClick subscribers (B8); over A2UI an agent's href is left
     * out by the link rule, so it listens for linkClick and answers with
     * openUrl.
     */
    href?: string;
}

/** One named group of navigation links. */
export interface SiteFooterGroup
{
    /** Group heading. Also supplies the group's accessible name. */
    title: string;
    /**
     * Heading level for the group title. Default: 2.
     *
     * Configurable because a footer that hardcodes `h2` can break the heading
     * outline of a page whose main content stops at `h3`.
     */
    headingLevel?: 2 | 3 | 4 | 5 | 6;
    /** Links in the group. */
    links: SiteFooterLink[];
}

/** Configuration options for the SiteFooter component. */
export interface SiteFooterOptions
{
    /** Organization block. `logo` is appended as a node, never parsed. */
    organization?: { name: string; description?: string; logo?: HTMLElement };
    /** Contact details. Rendered inside an `<address>`. */
    contact?: { email?: string; phone?: string; address?: string };
    /** Navigation groups. */
    groups?: SiteFooterGroup[];
    /** Legal row. */
    legal?: { copyright?: string; links?: SiteFooterLink[] };
    /**
     * Build information, e.g. "2026.09.01 · a1b2c3d".
     *
     * A string the caller passes. This component performs no fetch and reads
     * no global — the value is produced at build time by `npm run build:info`.
     */
    buildInfo?: string;
    /** Column count. Default: derived from the number of rendered blocks. */
    columns?: 1 | 2 | 3 | 4;
    /** Additional CSS class(es) on the root. */
    cssClass?: string;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/** Create an element with optional class name. */
function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className)
    {
        el.className = className;
    }
    return el;
}

/**
 * Create an anchor with text and destination, both set safely; a link with
 * no destination is a button (B8).
 */
function createLink(link: SiteFooterLink): HTMLElement
{
    if (link.href === undefined)
    {
        const button = createElement("button");
        button.setAttribute("type", "button");
        button.textContent = link.text;
        return button;
    }

    const a = createElement("a");
    a.textContent = link.text;
    a.setAttribute("href", link.href);
    return a;
}

/** Create a paragraph holding one anchor, for a contact line. */
function createContactLine(scheme: string, value: string): HTMLElement
{
    const p = createElement("p");
    p.appendChild(createLink({ text: value, href: `${scheme}:${value}` }));
    return p;
}

/**
 * Build a list of links as a `<ul>` with the given class, telling `register`
 * about each link element so a click on it can be reported.
 */
function createLinkList(
    links: SiteFooterLink[], className: string, register: (el: HTMLElement, link: SiteFooterLink) => void
): HTMLElement
{
    const list = createElement("ul", className);

    for (const link of links)
    {
        const item = createElement("li");
        const el = createLink(link);
        register(el, link);
        item.appendChild(el);
        list.appendChild(item);
    }

    return list;
}

// ============================================================================
// COMPONENT CLASS
// ============================================================================

/**
 * ⚓ COMPONENT: SiteFooter
 *
 * The footer for a public page.
 *
 * The stylesheet is the contract: this factory renders exactly the markup the
 * README documents, so a static page can hand-author the same HTML and load no
 * script at all. `sitefooter.test.ts` asserts that equality.
 *
 * @example
 * var footer = createSiteFooter("footer-host", {
 *     organization: { name: "Outcrop Inc", description: "Enterprise software." },
 *     groups: [{ title: "Product", links: [{ text: "Overview", href: "/overview" }] }],
 *     legal: { copyright: "© 2026 Outcrop Inc" }
 * });
 */
/**
 * The SiteFooter surface a factory caller receives.
 *
 * PAT-1. `implements` below is what keeps this in step with the
 * class: remove a member there and the typecheck fails here. Adding
 * one to the class does NOT add it here, which is the point — a new
 * method is API when somebody writes it into this interface.
 */
export interface SiteFooterHandle
{
    show(containerId?: string): void;
    hide(): void;
    destroy(): void;
    getElement(): HTMLElement | null;

    /** The surface contract (additive, B8): SiteFooter has no data slots, so this throws. */
    setData(slot: string, value: unknown): void;
    /**
     * Subscribes to "linkClick": { text, group } for a click on a group or
     * legal link, group being the group's title, or null for the legal row.
     * Links with and without an href emit; contact lines do not. Returns the
     * unsubscribe.
     */
    on(channel: string, handler: (payload: unknown) => void): () => void;
    /** Nothing to report (ADR-229): always {}. */
    getState(): Record<string, unknown>;
    /** Nothing to restore (ADR-229). */
    setState(state: Record<string, unknown>): void;
}

/** What a linkClick reports about the link clicked (B8). */
interface LinkClick
{
    text: string;
    group: string | null;
}

export class SiteFooter implements SiteFooterHandle
{
    private readonly instanceId: string;
    private readonly options: SiteFooterOptions;

    private rootEl: HTMLElement | null = null;
    private destroyed = false;

    /** Each group and legal link element, with what its click reports (B8). */
    private readonly linkClicks = new WeakMap<Element, LinkClick>();
    private readonly linkClickHandlers = new Set<(payload: unknown) => void>();
    private readonly onRootClick = (e: MouseEvent): void => { this.handleRootClick(e); };

    constructor(options: SiteFooterOptions)
    {
        instanceCounter++;
        this.instanceId = `sitefooter-${instanceCounter}`;
        this.options = options;
        this.rootEl = this.buildRoot();
        logInfo("Created instance", this.instanceId);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /** Append to the container element, or to body when no id is given. */
    show(containerId?: string): void
    {
        if (this.destroyed || !this.rootEl) { return; }

        const container = containerId
            ? document.getElementById(containerId)
            : document.body;

        if (!container)
        {
            // ERR-1. This logged and carried on, so the caller got a
            // handle to a component that was never mounted.
            throw new Error(
                `${LOG_PREFIX} Container "${containerId}" was not found. `
                + "Insert the element before showing it.");
        }

        container.appendChild(this.rootEl);
    }

    /** Remove from the DOM but keep state. */
    hide(): void
    {
        if (this.rootEl?.parentNode)
        {
            this.rootEl.parentNode.removeChild(this.rootEl);
        }
    }

    /** Tear down the DOM and the one delegated click listener. Idempotent. */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
        this.rootEl?.removeEventListener("click", this.onRootClick);
        this.linkClickHandlers.clear();
        this.hide();
        this.rootEl = null;
        logInfo("Destroyed", this.instanceId);
    }

    /** Return the root DOM element. */
    getElement(): HTMLElement | null
    {
        return this.rootEl;
    }

    // ========================================================================
    // SURFACE CONTRACT (additive, readiness step 2 B8)
    // ========================================================================

    /** SiteFooter has no data slots: its content is options. */
    setData(slot: string, _value: unknown): void
    {
        throw new Error(
            `${LOG_PREFIX} setData("${slot}"): SiteFooter has no data slots. Its content is options.`);
    }

    /** Subscribes to "linkClick"; returns the unsubscribe. */
    on(channel: string, handler: (payload: unknown) => void): () => void
    {
        if (channel !== "linkClick")
        {
            throw new Error(`${LOG_PREFIX} on("${channel}"): the only channel is "linkClick".`);
        }

        this.linkClickHandlers.add(handler);

        return () => { this.linkClickHandlers.delete(handler); };
    }

    /** Nothing to report (ADR-229). */
    getState(): Record<string, unknown>
    {
        return {};
    }

    /** Nothing to restore (ADR-229). */
    setState(_state: Record<string, unknown>): void
    {
    }

    /**
     * Reports a click on a group or legal link to every subscriber, each
     * isolated so one throw cannot starve the rest. An anchor still follows
     * its href: the click is only reported.
     */
    private handleRootClick(e: MouseEvent): void
    {
        const target = e.target instanceof Element ? e.target.closest("a, button") : null;
        const click = target ? this.linkClicks.get(target) : undefined;

        if (!click) { return; }

        for (const handler of this.linkClickHandlers)
        {
            try
            {
                handler({ ...click });
            }
            catch (err)
            {
                logError("Channel \"linkClick\" handler threw:", err);
            }
        }
    }

    // ========================================================================
    // DOM CONSTRUCTION
    // ========================================================================

    /** Build the root element tree. */
    private buildRoot(): HTMLElement
    {
        const parts = ["sitefooter"];
        if (this.options.cssClass)
        {
            parts.push(this.options.cssClass);
        }

        const root = createElement("footer", parts.join(" "));
        root.id = this.instanceId;
        root.addEventListener("click", this.onRootClick);
        root.appendChild(this.buildGrid());

        const legal = this.buildLegal();
        if (legal)
        {
            root.appendChild(legal);
        }

        return root;
    }

    /** Build the column grid: the organization block, then one nav per group. */
    private buildGrid(): HTMLElement
    {
        const grid = createElement(
            "div", `sitefooter-grid sitefooter-cols-${this.columnCount()}`);

        if (this.options.organization)
        {
            grid.appendChild(this.buildOrg());
        }

        const groups = this.options.groups ?? [];
        groups.forEach((group, index) =>
        {
            grid.appendChild(this.buildGroup(group, index));
        });

        return grid;
    }

    /**
     * Decide how many columns the grid gets.
     *
     * An explicit `columns` wins. Otherwise count the blocks that will
     * actually render and clamp to what the stylesheet defines, so a footer
     * with six groups does not ask for a `sitefooter-cols-6` class that has
     * no rule behind it.
     */
    private columnCount(): number
    {
        if (this.options.columns)
        {
            return this.options.columns;
        }

        const blocks = (this.options.organization ? 1 : 0)
            + (this.options.groups?.length ?? 0);

        return Math.min(Math.max(blocks, 1), MAX_COLUMNS);
    }

    /** Build the organization block. */
    private buildOrg(): HTMLElement
    {
        const org = this.options.organization!;
        const block = createElement("div", "sitefooter-org");

        if (org.logo)
        {
            block.appendChild(org.logo);
        }

        const name = createElement("p", "sitefooter-orgname");
        name.textContent = org.name;
        block.appendChild(name);

        if (org.description)
        {
            const desc = createElement("p", "sitefooter-orgdesc");
            desc.textContent = org.description;
            block.appendChild(desc);
        }

        const contact = this.buildContact();
        if (contact)
        {
            block.appendChild(contact);
        }

        return block;
    }

    /** Build the contact block, or null when there is nothing to show. */
    private buildContact(): HTMLElement | null
    {
        const contact = this.options.contact;
        if (!contact) { return null; }

        const address = createElement("address", "sitefooter-contact");

        if (contact.email)
        {
            address.appendChild(createContactLine("mailto", contact.email));
        }

        if (contact.phone)
        {
            address.appendChild(createContactLine("tel", contact.phone));
        }

        if (contact.address)
        {
            const line = createElement("p");
            line.textContent = contact.address;
            address.appendChild(line);
        }

        return address;
    }

    /**
     * Build one navigation group.
     *
     * The `<nav>` takes its accessible name from its own heading through
     * `aria-labelledby`, which is what distinguishes several footer navs from
     * each other for assistive technology. The heading id carries the instance
     * counter so two footers on one page cannot collide.
     */
    private buildGroup(group: SiteFooterGroup, index: number): HTMLElement
    {
        const nav = createElement("nav", "sitefooter-group");
        const headingId = `${this.instanceId}-group-${index}`;
        const level = group.headingLevel ?? DEFAULT_HEADING_LEVEL;

        const heading = createElement(`h${level}`, "sitefooter-grouptitle");
        heading.id = headingId;
        heading.textContent = group.title;
        nav.setAttribute("aria-labelledby", headingId);
        nav.appendChild(heading);
        nav.appendChild(createLinkList(group.links, "sitefooter-links",
            (el, link) => { this.linkClicks.set(el, { text: link.text, group: group.title }); }));

        return nav;
    }

    /** Build the legal row, or null when there is nothing to show. */
    private buildLegal(): HTMLElement | null
    {
        const legal = this.options.legal;
        const hasLegal = Boolean(legal?.copyright || legal?.links?.length);

        if (!hasLegal && !this.options.buildInfo) { return null; }

        const row = createElement("div", "sitefooter-legal");

        if (legal?.copyright)
        {
            const copyright = createElement("p", "sitefooter-copyright");
            copyright.textContent = legal.copyright;
            row.appendChild(copyright);
        }

        if (legal?.links?.length)
        {
            row.appendChild(createLinkList(legal.links, "sitefooter-legallinks",
                (el, link) => { this.linkClicks.set(el, { text: link.text, group: null }); }));
        }

        if (this.options.buildInfo)
        {
            const build = createElement("p", "sitefooter-build");
            build.textContent = this.options.buildInfo;
            row.appendChild(build);
        }

        return row;
    }
}

// ============================================================================
// CONVENIENCE FUNCTION
// ============================================================================

/**
 * ⚓ FUNCTION: createSiteFooter
 * Create, show, and return a SiteFooter in one call.
 */
export function createSiteFooter(
    containerId: string, options: SiteFooterOptions
): SiteFooterHandle
{
    const footer = new SiteFooter(options);
    footer.show(containerId);
    return footer;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

window.createSiteFooter = createSiteFooter;
