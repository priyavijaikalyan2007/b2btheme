/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DocViewer
 * 📜 PURPOSE: Full-page three-column documentation layout with hierarchical
 *             TOC, markdown-rendered content, "On This Page" outline with
 *             IntersectionObserver scroll tracking, and prev/next navigation.
 * 🔗 RELATES: [[HelpDrawer]], [[TreeView]], [[MarkdownEditor]]
 * ⚡ FLOW: [Consumer] -> [createDocViewer(opts)] -> [Three-column layout]
 * 🔒 SECURITY: Markdown rendered via marked.parse() with HTML sanitisation.
 *    Falls back to textContent when marked unavailable.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[DocViewer]";
const DEFAULT_TOC_WIDTH = 260;
const DEFAULT_OUTLINE_WIDTH = 220;
const RESPONSIVE_OUTLINE_BP = 1200;
const RESPONSIVE_TOC_BP = 768;

let instanceCounter = 0;

// ============================================================================
// INTERFACES
// ============================================================================

/** A single documentation page in the TOC tree. */
export interface DocPage
{
    /** Unique page identifier. */
    readonly id: string;
    /** Display title in TOC. */
    readonly title: string;
    /** Inline markdown content. */
    readonly markdown?: string;
    /** URL to fetch markdown from. */
    readonly url?: string;
    /** Nested child pages. */
    readonly children?: DocPage[];
    /** Bootstrap Icons class for TOC icon. */
    readonly icon?: string;
}

/** Configuration for the DocViewer component. */
export interface DocViewerOptions
{
    /** Container element. Required. */
    readonly container: HTMLElement;
    /** Documentation page tree. Required. */
    readonly pages: DocPage[];
    /** Initial active page ID. */
    readonly activePage?: string;
    /** Show left TOC panel. Default: true. */
    readonly showToc?: boolean;
    /** Show right outline panel. Default: true. */
    readonly showOutline?: boolean;
    /** TOC panel width in px. Default: 260. */
    readonly tocWidth?: number;
    /** Outline panel width in px. Default: 220. */
    readonly outlineWidth?: number;
    /** Called when page changes. */
    readonly onPageChange?: (pageId: string) => void;
    /** Called when content is ready. */
    readonly onReady?: () => void;
}

/** Public handle for controlling the DocViewer. */
export interface DocViewerHandle
{
    navigateTo(pageId: string): void;
    getActivePage(): string;
    expandTocNode(pageId: string): void;
    collapseTocNode(pageId: string): void;
    searchToc(query: string): void;
    getElement(): HTMLElement;
    destroy(): void;
}

/** Internal heading extracted from rendered content. */
interface HeadingEntry
{
    id: string;
    text: string;
    level: number;
    element: HTMLElement;
}

// ============================================================================
// DOM HELPERS
// ============================================================================

function createElement(tag: string, className?: string): HTMLElement
{
    const el = document.createElement(tag);
    if (className) { el.className = className; }
    return el;
}

function setAttr(el: HTMLElement, attrs: Record<string, string>): void
{
    for (const [key, value] of Object.entries(attrs))
    {
        el.setAttribute(key, value);
    }
}

// ============================================================================
// MARKDOWN RENDERER PROBE
// ============================================================================

// @dependency: markdownrenderer (window.createMarkdownRenderer)

interface MdRendererHandle
{
    render: (md: string, target: HTMLElement) => void;
    toHtml: (md: string) => string;
}

type MdRendererFactory = () => MdRendererHandle;

/** Get or create the shared markdown renderer. */
function getMdRenderer(): MdRendererHandle | null
{
    const factory = (window as unknown as Record<string, unknown>)
        ["createMarkdownRenderer"] as MdRendererFactory | undefined;
    if (typeof factory === "function")
    {
        return factory();
    }
    return null;
}

// ============================================================================
// DOC VIEWER CLASS
// ============================================================================

/**
 * Three-column documentation layout with hierarchical TOC, markdown content,
 * and IntersectionObserver-tracked outline. Manages page navigation,
 * content enhancements (code copy, image shadows, video wrappers), and
 * responsive column collapse.
 */
class DocViewer
{
    private readonly id: string;
    private readonly container: HTMLElement;
    private readonly options: DocViewerOptions;
    private readonly flatPages: DocPage[];

    private activePageId: string;
    private expandedNodes = new Set<string>();
    private tocSearchQuery = "";
    private destroyed = false;

    private rootEl: HTMLElement | null = null;
    private tocEl: HTMLElement | null = null;
    private tocListEl: HTMLElement | null = null;
    private tocSearchInput: HTMLInputElement | null = null;
    private contentEl: HTMLElement | null = null;
    private outlineEl: HTMLElement | null = null;
    private outlineListEl: HTMLElement | null = null;
    private tocToggleBtn: HTMLElement | null = null;

    private headings: HeadingEntry[] = [];
    private observer: IntersectionObserver | null = null;
    private boundResize: () => void;

    constructor(options: DocViewerOptions)
    {
        instanceCounter++;
        this.id = `docviewer-${instanceCounter}`;
        this.container = options.container;
        this.options = options;
        this.flatPages = this.flattenPages(options.pages);
        this.activePageId = options.activePage ?? this.flatPages[0]?.id ?? "";

        this.expandAncestors(this.activePageId);
        this.boundResize = () => this.handleResize();
        window.addEventListener("resize", this.boundResize);

        this.buildLayout();
        this.navigateToPage(this.activePageId);

        console.log(LOG_PREFIX, "Created", this.id);
    }

    // ====================================================================
    // PUBLIC API
    // ====================================================================

    navigateTo(pageId: string): void
    {
        this.navigateToPage(pageId);
    }

    getActivePage(): string
    {
        return this.activePageId;
    }

    expandTocNode(pageId: string): void
    {
        this.expandedNodes.add(pageId);
        this.renderTocTree();
    }

    collapseTocNode(pageId: string): void
    {
        this.expandedNodes.delete(pageId);
        this.renderTocTree();
    }

    searchToc(query: string): void
    {
        this.tocSearchQuery = query.toLowerCase().trim();
        this.renderTocTree();
    }

    getElement(): HTMLElement
    {
        return this.rootEl as HTMLElement;
    }

    destroy(): void
    {
        if (this.destroyed) { return; }
        this.destroyed = true;

        window.removeEventListener("resize", this.boundResize);
        this.destroyObserver();
        this.rootEl?.parentNode?.removeChild(this.rootEl);
        console.log(LOG_PREFIX, "Destroyed", this.id);
    }

    // ====================================================================
    // PRIVATE: FLATTEN PAGES
    // ====================================================================

    private flattenPages(pages: DocPage[]): DocPage[]
    {
        const result: DocPage[] = [];
        const walk = (list: DocPage[]) =>
        {
            for (const p of list)
            {
                result.push(p);
                if (p.children) { walk(p.children); }
            }
        };
        walk(pages);
        return result;
    }

    // ====================================================================
    // PRIVATE: BUILD LAYOUT
    // ====================================================================

    /** Constructs the three-column CSS Grid layout and appends to container. */
    private buildLayout(): void
    {
        this.rootEl = createElement("div", "docviewer");
        this.rootEl.id = this.id;

        const showToc = this.options.showToc !== false;
        const showOutline = this.options.showOutline !== false;
        const tocW = this.options.tocWidth ?? DEFAULT_TOC_WIDTH;
        const outW = this.options.outlineWidth ?? DEFAULT_OUTLINE_WIDTH;

        this.applyGridTemplate(showToc, showOutline, tocW, outW);
        this.assemblePanels(showToc, showOutline);

        this.container.appendChild(this.rootEl);
        this.handleResize();

        console.debug(LOG_PREFIX, "Layout built:", {
            toc: showToc, outline: showOutline
        });
    }

    /** Assembles TOC, content, outline panels and toggle button into root. */
    private assemblePanels(
        showToc: boolean, showOutline: boolean
    ): void
    {
        if (!this.rootEl) { return; }

        if (showToc)
        {
            this.tocEl = this.buildTocPanel();
            this.rootEl.appendChild(this.tocEl);
        }

        this.contentEl = createElement("div", "docviewer-content");
        this.rootEl.appendChild(this.contentEl);

        if (showOutline)
        {
            this.outlineEl = this.buildOutlinePanel();
            this.rootEl.appendChild(this.outlineEl);
        }

        this.tocToggleBtn = this.buildTocToggle();
        this.rootEl.appendChild(this.tocToggleBtn);
    }

    private applyGridTemplate(
        showToc: boolean, showOutline: boolean,
        tocW: number, outW: number
    ): void
    {
        if (!this.rootEl) { return; }

        const cols: string[] = [];
        if (showToc) { cols.push(`${tocW}px`); }
        cols.push("1fr");
        if (showOutline) { cols.push(`${outW}px`); }

        this.rootEl.style.display = "grid";
        this.rootEl.style.gridTemplateColumns = cols.join(" ");
        this.rootEl.style.height = "100%";
    }

    // ====================================================================
    // PRIVATE: TOC PANEL
    // ====================================================================

    private buildTocPanel(): HTMLElement
    {
        const toc = createElement("nav", "docviewer-toc");
        setAttr(toc, { "aria-label": "Table of contents" });

        const header = createElement("div", "docviewer-toc-header");
        const title = createElement("span", "docviewer-toc-title");
        title.textContent = "Contents";
        header.appendChild(title);
        toc.appendChild(header);

        this.tocSearchInput = document.createElement("input");
        this.tocSearchInput.type = "search";
        this.tocSearchInput.className = "docviewer-toc-search form-control form-control-sm";
        this.tocSearchInput.placeholder = "Search...";
        this.tocSearchInput.addEventListener("input", () =>
        {
            this.searchToc(this.tocSearchInput?.value ?? "");
        });
        toc.appendChild(this.tocSearchInput);

        this.tocListEl = createElement("div", "docviewer-toc-list");
        setAttr(this.tocListEl, { role: "tree" });
        toc.appendChild(this.tocListEl);

        this.renderTocTree();
        return toc;
    }

    private renderTocTree(): void
    {
        if (!this.tocListEl) { return; }
        this.tocListEl.innerHTML = "";
        this.renderTocNodes(this.options.pages, this.tocListEl, 0);
    }

    private renderTocNodes(
        pages: DocPage[], parent: HTMLElement, depth: number
    ): void
    {
        for (const page of pages)
        {
            if (!this.matchesSearch(page)) { continue; }

            const item = this.buildTocItem(page, depth);
            parent.appendChild(item);

            if (page.children && page.children.length > 0)
            {
                this.renderTocChildren(page, parent, depth);
            }
        }
    }

    private renderTocChildren(
        page: DocPage, parent: HTMLElement, depth: number
    ): void
    {
        const isExpanded = this.expandedNodes.has(page.id);
        if (isExpanded && page.children)
        {
            this.renderTocNodes(page.children, parent, depth + 1);
        }
    }

    /** Builds a single TOC tree item with expand toggle, icon, label, and events. */
    private buildTocItem(page: DocPage, depth: number): HTMLElement
    {
        const hasChildren = (page.children?.length ?? 0) > 0;
        const isActive = page.id === this.activePageId;
        const isExpanded = this.expandedNodes.has(page.id);

        const item = createElement("div", "docviewer-toc-item");
        if (isActive) { item.classList.add("active"); }
        item.style.paddingLeft = `${12 + (depth * 16)}px`;
        setAttr(item, {
            role: "treeitem",
            "aria-selected": String(isActive)
        });

        if (hasChildren)
        {
            item.appendChild(this.buildExpandToggle(page.id, isExpanded));
        }

        this.appendTocItemContent(item, page);
        this.attachTocItemEvents(item, page);

        return item;
    }

    /** Appends icon and label to a TOC item element. */
    private appendTocItemContent(
        item: HTMLElement, page: DocPage
    ): void
    {
        if (page.icon)
        {
            const icon = createElement("i", `bi ${page.icon}`);
            setAttr(icon, { "aria-hidden": "true" });
            item.appendChild(icon);
        }

        const label = createElement("span", "docviewer-toc-label");
        label.textContent = page.title;
        item.appendChild(label);
    }

    /** Attaches click and keyboard event listeners to a TOC item. */
    private attachTocItemEvents(
        item: HTMLElement, page: DocPage
    ): void
    {
        item.addEventListener("click", () => this.navigateToPage(page.id));
        item.addEventListener("keydown", (e) =>
        {
            this.handleTocKeyDown(e, page);
        });
        setAttr(item, { tabindex: "0" });
    }

    private buildExpandToggle(
        pageId: string, isExpanded: boolean
    ): HTMLElement
    {
        const toggle = createElement("span", "docviewer-toc-expand");
        const iconClass = isExpanded
            ? "bi bi-chevron-down" : "bi bi-chevron-right";
        const icon = createElement("i", iconClass);
        setAttr(icon, { "aria-hidden": "true" });
        toggle.appendChild(icon);

        toggle.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            if (this.expandedNodes.has(pageId))
            {
                this.expandedNodes.delete(pageId);
            }
            else
            {
                this.expandedNodes.add(pageId);
            }
            this.renderTocTree();
        });

        return toggle;
    }

    private handleTocKeyDown(e: KeyboardEvent, page: DocPage): void
    {
        if (e.key === "Enter")
        {
            this.navigateToPage(page.id);
        }
        else if (e.key === "ArrowRight" && page.children?.length)
        {
            this.expandedNodes.add(page.id);
            this.renderTocTree();
        }
        else if (e.key === "ArrowLeft")
        {
            this.expandedNodes.delete(page.id);
            this.renderTocTree();
        }
    }

    private matchesSearch(page: DocPage): boolean
    {
        if (!this.tocSearchQuery) { return true; }
        if (page.title.toLowerCase().includes(this.tocSearchQuery))
        {
            return true;
        }
        if (page.children)
        {
            return page.children.some(c => this.matchesSearch(c));
        }
        return false;
    }

    private expandAncestors(pageId: string): void
    {
        const walk = (pages: DocPage[], path: string[]): boolean =>
        {
            for (const p of pages)
            {
                if (p.id === pageId)
                {
                    for (const id of path)
                    {
                        this.expandedNodes.add(id);
                    }
                    return true;
                }
                if (p.children)
                {
                    if (walk(p.children, [...path, p.id]))
                    {
                        return true;
                    }
                }
            }
            return false;
        };
        walk(this.options.pages, []);
    }

    // ====================================================================
    // PRIVATE: TOC TOGGLE (mobile)
    // ====================================================================

    private buildTocToggle(): HTMLElement
    {
        const btn = createElement("button", "docviewer-toc-toggle");
        setAttr(btn, {
            type: "button",
            "aria-label": "Toggle table of contents"
        });

        const icon = createElement("i", "bi bi-list");
        setAttr(icon, { "aria-hidden": "true" });
        btn.appendChild(icon);
        btn.style.display = "none";

        btn.addEventListener("click", () =>
        {
            this.tocEl?.classList.toggle("docviewer-toc-visible");
        });

        return btn;
    }

    // ====================================================================
    // PRIVATE: CONTENT AREA
    // ====================================================================

    private navigateToPage(pageId: string): void
    {
        const page = this.flatPages.find(p => p.id === pageId);
        if (!page)
        {
            console.warn(LOG_PREFIX, "Page not found:", pageId);
            return;
        }

        this.activePageId = pageId;
        this.expandAncestors(pageId);
        this.renderTocTree();

        if (page.markdown)
        {
            this.renderContent(page.markdown);
        }
        else if (page.url)
        {
            this.fetchAndRenderContent(page.url);
        }

        if (this.options.onPageChange)
        {
            this.options.onPageChange(pageId);
        }
        console.log(LOG_PREFIX, "Navigated to:", pageId);
    }

    /** Renders markdown into the content area via MarkdownRenderer. */
    private renderContent(md: string): void
    {
        if (!this.contentEl) { return; }
        this.contentEl.innerHTML = "";

        const article = createElement("article", "docviewer-article");
        const renderer = getMdRenderer();

        if (renderer)
        {
            renderer.render(md, article);
            console.debug(LOG_PREFIX, "Rendered markdown");
        }
        else
        {
            console.warn(LOG_PREFIX, "MarkdownRenderer not available; plain text");
            article.textContent = md;
            article.style.whiteSpace = "pre-wrap";
        }

        this.contentEl.appendChild(article);
        this.contentEl.appendChild(this.buildPrevNextNav());
        this.onContentRendered(article);
    }

    private async fetchAndRenderContent(url: string): Promise<void>
    {
        if (!this.contentEl) { return; }
        this.contentEl.innerHTML = "";

        const spinner = createElement("div", "docviewer-loading");
        spinner.innerHTML =
            '<div class="spinner-border spinner-border-sm" role="status">' +
            '<span class="visually-hidden">Loading...</span></div>';
        this.contentEl.appendChild(spinner);

        try
        {
            const response = await fetch(url);
            if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
            const md = await response.text();
            this.renderContent(md);
        }
        catch (err)
        {
            console.error(LOG_PREFIX, "Fetch failed:", url, err);
            this.contentEl.innerHTML = "";
            const errEl = createElement("div", "docviewer-error");
            errEl.textContent = `Could not load: ${url}`;
            this.contentEl.appendChild(errEl);
        }
    }

    // ====================================================================
    // PRIVATE: CONTENT ENHANCEMENTS
    // ====================================================================

    private onContentRendered(article: HTMLElement): void
    {
        this.assignHeadingIds(article);
        this.addCodeCopyButtons(article);
        this.enhanceImages(article);
        this.enhanceVideos(article);
        this.buildOutline(article);

        if (this.options.onReady) { this.options.onReady(); }
    }

    private assignHeadingIds(article: HTMLElement): void
    {
        const headings = article.querySelectorAll("h1, h2, h3, h4, h5, h6");
        for (let i = 0; i < headings.length; i++)
        {
            const h = headings[i] as HTMLElement;
            if (!h.id)
            {
                h.id = this.slugify(h.textContent ?? `heading-${i}`);
            }
        }
    }

    private slugify(text: string): string
    {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    private addCodeCopyButtons(article: HTMLElement): void
    {
        const blocks = article.querySelectorAll("pre > code");
        for (let i = 0; i < blocks.length; i++)
        {
            const pre = blocks[i].parentElement;
            if (!pre) { continue; }
            pre.style.position = "relative";
            pre.appendChild(this.buildCopyButton(blocks[i] as HTMLElement));
        }
    }

    private buildCopyButton(codeEl: HTMLElement): HTMLElement
    {
        const btn = createElement("button", "docviewer-copy-btn");
        setAttr(btn, { type: "button", "aria-label": "Copy code" });
        btn.textContent = "Copy";

        btn.addEventListener("click", () =>
        {
            const text = codeEl.textContent ?? "";
            navigator.clipboard.writeText(text).then(() =>
            {
                btn.textContent = "Copied!";
                setTimeout(() => { btn.textContent = "Copy"; }, 2000);
            }).catch(() =>
            {
                console.warn(LOG_PREFIX, "Clipboard write failed");
            });
        });
        return btn;
    }

    private enhanceImages(article: HTMLElement): void
    {
        const imgs = article.querySelectorAll("img");
        for (let i = 0; i < imgs.length; i++)
        {
            imgs[i].classList.add("docviewer-img");
        }
    }

    private enhanceVideos(article: HTMLElement): void
    {
        const iframes = article.querySelectorAll("iframe");
        for (let i = 0; i < iframes.length; i++)
        {
            const wrapper = createElement("div", "docviewer-video-wrapper");
            iframes[i].parentNode?.insertBefore(wrapper, iframes[i]);
            wrapper.appendChild(iframes[i]);
        }
    }

    // ====================================================================
    // PRIVATE: OUTLINE PANEL
    // ====================================================================

    private buildOutlinePanel(): HTMLElement
    {
        const outline = createElement("aside", "docviewer-outline");
        setAttr(outline, { "aria-label": "On this page" });

        const title = createElement("div", "docviewer-outline-title");
        title.textContent = "On This Page";
        outline.appendChild(title);

        this.outlineListEl = createElement("ul", "docviewer-outline-list");
        outline.appendChild(this.outlineListEl);

        return outline;
    }

    private buildOutline(article: HTMLElement): void
    {
        this.destroyObserver();
        this.headings = [];

        if (!this.outlineListEl) { return; }
        this.outlineListEl.innerHTML = "";

        const els = article.querySelectorAll("h2, h3");
        for (let i = 0; i < els.length; i++)
        {
            const h = els[i] as HTMLElement;
            const entry: HeadingEntry = {
                id: h.id,
                text: h.textContent ?? "",
                level: parseInt(h.tagName.charAt(1), 10),
                element: h
            };
            this.headings.push(entry);
            this.outlineListEl.appendChild(this.buildOutlineItem(entry));
        }

        this.setupScrollObserver();
    }

    private buildOutlineItem(entry: HeadingEntry): HTMLElement
    {
        const li = createElement("li", "docviewer-outline-item");
        if (entry.level === 3)
        {
            li.classList.add("docviewer-outline-sub");
        }

        const link = createElement("a", "docviewer-outline-link");
        link.textContent = entry.text;
        setAttr(link, { href: `#${entry.id}` });

        link.addEventListener("click", (e) =>
        {
            e.preventDefault();
            entry.element.scrollIntoView({ behavior: "smooth" });
        });

        li.appendChild(link);
        return li;
    }

    private setupScrollObserver(): void
    {
        if (this.headings.length === 0) { return; }

        this.observer = new IntersectionObserver(
            (entries) => this.onIntersection(entries),
            {
                root: this.contentEl,
                rootMargin: "-10% 0px -80% 0px",
                threshold: 0
            }
        );

        for (const h of this.headings)
        {
            this.observer.observe(h.element);
        }
    }

    private onIntersection(entries: IntersectionObserverEntry[]): void
    {
        for (const entry of entries)
        {
            if (entry.isIntersecting)
            {
                this.highlightOutlineItem(
                    (entry.target as HTMLElement).id
                );
            }
        }
    }

    private highlightOutlineItem(headingId: string): void
    {
        if (!this.outlineListEl) { return; }
        const links = this.outlineListEl.querySelectorAll(
            ".docviewer-outline-link"
        );

        for (let i = 0; i < links.length; i++)
        {
            const href = links[i].getAttribute("href");
            links[i].classList.toggle("active", href === `#${headingId}`);
        }
    }

    private destroyObserver(): void
    {
        if (this.observer)
        {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    // ====================================================================
    // PRIVATE: PREV/NEXT NAVIGATION
    // ====================================================================

    private buildPrevNextNav(): HTMLElement
    {
        const nav = createElement("nav", "docviewer-prevnext");
        setAttr(nav, { "aria-label": "Page navigation" });

        const idx = this.flatPages.findIndex(
            p => p.id === this.activePageId
        );

        if (idx > 0)
        {
            nav.appendChild(this.buildNavLink(
                this.flatPages[idx - 1], "prev"
            ));
        }
        else
        {
            nav.appendChild(createElement("div"));
        }

        if (idx < this.flatPages.length - 1)
        {
            nav.appendChild(this.buildNavLink(
                this.flatPages[idx + 1], "next"
            ));
        }

        return nav;
    }

    private buildNavLink(page: DocPage, direction: string): HTMLElement
    {
        const link = createElement("button", `docviewer-nav-${direction}`);
        setAttr(link, {
            type: "button",
            "aria-label": direction === "prev"
                ? `Previous: ${page.title}`
                : `Next: ${page.title}`
        });
        link.addEventListener("click", () =>
        {
            this.navigateToPage(page.id);
        });

        const label = createElement("span", "docviewer-nav-label");
        label.textContent = direction === "prev"
            ? "\u2190 Previous" : "Next \u2192";

        const title = createElement("span", "docviewer-nav-title");
        title.textContent = page.title;

        link.appendChild(label);
        link.appendChild(title);
        return link;
    }

    // ====================================================================
    // PRIVATE: RESPONSIVE
    // ====================================================================

    private handleResize(): void
    {
        const w = window.innerWidth;

        if (this.outlineEl)
        {
            this.outlineEl.style.display = w < RESPONSIVE_OUTLINE_BP
                ? "none" : "";
        }

        if (this.tocEl && this.tocToggleBtn)
        {
            if (w < RESPONSIVE_TOC_BP)
            {
                this.tocEl.classList.add("docviewer-toc-collapsible");
                this.tocToggleBtn.style.display = "";
            }
            else
            {
                this.tocEl.classList.remove(
                    "docviewer-toc-collapsible",
                    "docviewer-toc-visible"
                );
                this.tocToggleBtn.style.display = "none";
            }
        }

        this.updateGridColumns();
    }

    private updateGridColumns(): void
    {
        if (!this.rootEl) { return; }

        const w = window.innerWidth;
        const showToc = this.options.showToc !== false;
        const showOutline = this.options.showOutline !== false;
        const tocW = this.options.tocWidth ?? DEFAULT_TOC_WIDTH;
        const outW = this.options.outlineWidth ?? DEFAULT_OUTLINE_WIDTH;

        const cols: string[] = [];

        if (showToc && w >= RESPONSIVE_TOC_BP) { cols.push(`${tocW}px`); }
        cols.push("1fr");
        if (showOutline && w >= RESPONSIVE_OUTLINE_BP)
        {
            cols.push(`${outW}px`);
        }

        this.rootEl.style.gridTemplateColumns = cols.join(" ");
    }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

// @entrypoint

/**
 * Creates a DocViewer three-column documentation layout.
 */
export function createDocViewer(
    options: DocViewerOptions
): DocViewerHandle
{
    if (!options.container)
    {
        console.error(LOG_PREFIX, "No container provided");
        throw new Error(`${LOG_PREFIX} container is required`);
    }

    if (!options.pages || options.pages.length === 0)
    {
        console.error(LOG_PREFIX, "No pages provided");
        throw new Error(`${LOG_PREFIX} pages are required`);
    }

    const inst = new DocViewer(options);

    return {
        navigateTo: (id) => inst.navigateTo(id),
        getActivePage: () => inst.getActivePage(),
        expandTocNode: (id) => inst.expandTocNode(id),
        collapseTocNode: (id) => inst.collapseTocNode(id),
        searchToc: (q) => inst.searchToc(q),
        getElement: () => inst.getElement(),
        destroy: () => inst.destroy()
    };
}

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

(window as unknown as Record<string, unknown>).createDocViewer =
    createDocViewer;
