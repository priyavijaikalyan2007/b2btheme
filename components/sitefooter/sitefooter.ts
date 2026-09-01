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

const _lu = (typeof (window as any).createLogUtility === "function") ? (window as any).createLogUtility().getLogger(LOG_PREFIX.slice(1, -1)) : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

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
    /** Destination. */
    href: string;
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

/** Create an anchor with text and destination, both set safely. */
function createLink(link: SiteFooterLink): HTMLElement
{
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

/** Build a list of links as a `<ul>` with the given class. */
function createLinkList(links: SiteFooterLink[], className: string): HTMLElement
{
    const list = createElement("ul", className);

    for (const link of links)
    {
        const item = createElement("li");
        item.appendChild(createLink(link));
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
export class SiteFooter
{
    private readonly instanceId: string;
    private readonly options: SiteFooterOptions;

    private rootEl: HTMLElement | null = null;
    private destroyed = false;

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
            logWarn("Container not found:", containerId);
            return;
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

    /**
     * Tear down the DOM. Idempotent.
     *
     * Every action in this component is a link, so there are no listeners to
     * detach — nothing here binds a handler.
     */
    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;
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
        nav.appendChild(createLinkList(group.links, "sitefooter-links"));

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
            row.appendChild(createLinkList(legal.links, "sitefooter-legallinks"));
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
): SiteFooter
{
    const footer = new SiteFooter(options);
    footer.show(containerId);
    return footer;
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as any).SiteFooter = SiteFooter;
(window as any).createSiteFooter = createSiteFooter;
