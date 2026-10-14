/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: MarkdownRenderer
 * 📜 PURPOSE: Shared markdown-to-HTML rendering utility using marked with
 *    optional extensions for code highlighting (highlight.js), math (KaTeX),
 *    diagrams (Mermaid), Graphviz/dot (@viz-js/viz), and PlantUML (server).
 *    No CSS injection — uses theme fonts natively.
 * 🔗 RELATES: [[HelpDrawer]], [[DocViewer]], [[EnterpriseTheme]]
 * ⚡ FLOW: [Consumer] -> createMarkdownRenderer(opts?) -> { render(md, el) }
 * 🔒 SECURITY: Two inputs, handled differently on purpose. Markdown output
 *    is sanitised by stripping scripts, iframes and event-handler attributes,
 *    because consumer-provided markdown is never trusted. A PlantUML reply is
 *    loaded as an image through a data URL and is never parsed as markup, so
 *    a hostile or compromised server cannot run script in the page (SEC-3,
 *    ADR-164). PlantUML server calls send only diagram source text, no
 *    credentials.
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[MarkdownRenderer]";
const _lu = (typeof window.createLogUtility === "function")
    ? window.createLogUtility().getLogger(LOG_PREFIX.slice(1, -1))
    : null;
function logInfo(...a: unknown[]): void { _lu ? _lu.info(...a) : console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...a); }
function logWarn(...a: unknown[]): void { _lu ? _lu.warn(...a) : console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...a); }
function logError(...a: unknown[]): void { _lu ? _lu.error(...a) : console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...a); }
function logDebug(...a: unknown[]): void { _lu ? _lu.debug(...a) : console.debug(new Date().toISOString(), "[DEBUG]", LOG_PREFIX, ...a); }
function logTrace(...a: unknown[]): void { _lu ? _lu.trace(...a) : console.debug(new Date().toISOString(), "[TRACE]", LOG_PREFIX, ...a); }

const PLANTUML_DEFAULT_SERVER = "https://www.plantuml.com/plantuml/svg/";

// ============================================================================
// INTERFACES
// ============================================================================

/** Options for the markdown renderer. */
export interface MarkdownRendererOptions
{
    /** Enable code syntax highlighting via highlight.js. Default: true. */
    highlight?: boolean;
    /** Enable KaTeX math rendering ($...$, $$...$$). Default: true. */
    math?: boolean;
    /** Enable Mermaid diagram rendering. Default: true. */
    mermaid?: boolean;
    /** Enable Graphviz/dot rendering via @viz-js/viz. Default: true. */
    graphviz?: boolean;
    /** Enable PlantUML rendering via server. Default: true. */
    plantuml?: boolean;
    /** PlantUML server URL. Default: "https://www.plantuml.com/plantuml/svg/". */
    plantumlServer?: string;
    /** Additional CSS class for the rendered wrapper. */
    className?: string;
}

/** Handle returned by createMarkdownRenderer. */
export interface MarkdownRendererHandle
{
    /** Render markdown string into a target element. */
    render: (md: string, target: HTMLElement) => void;
    /** Render markdown string and return HTML. */
    toHtml: (md: string) => string;
}

// ============================================================================
// THIRD-PARTY PROBES
// ============================================================================

export interface MarkedStatic
{
    parse: (md: string, opts?: Record<string, unknown>) => string;
    use: (ext: Record<string, unknown>) => void;
}

export interface HljsStatic
{
    highlight: (code: string, opts: { language: string }) =>
        { value: string };
    getLanguage: (lang: string) => unknown;
}

export interface KatexStatic
{
    renderToString: (tex: string, opts?: Record<string, unknown>) => string;
}

export interface MermaidStatic
{
    run: (opts: { nodes: NodeListOf<Element> }) => Promise<void>;
}

export interface VizInstance
{
    renderSVGElement: (src: string) => SVGSVGElement;
}

export interface VizStatic
{
    instance: () => Promise<VizInstance>;
}

/**
 * Probe window for one of the optional rendering libraries.
 *
 * The parameter is a union of the five names rather than `string`, which is
 * what lets the lookup read `window[name]` with no assertion. Each library
 * is declared in components/globals.d.ts using the interfaces above, and
 * each is OPTIONAL there because the host page supplies it. None of the
 * five is vendored into `dist/lib`.
 */
function probe<T>(name: "marked" | "hljs" | "katex" | "mermaid" | "Viz"): T | null
{
    const val = window[name];
    return val ? val as T : null;
}

// ============================================================================
// SANITISER
// ============================================================================

/** Strip scripts, iframes, and event-handler attributes from HTML. */
function sanitize(html: string): string
{
    const div = document.createElement("div");
    div.innerHTML = html;
    removeDangerousElements(div);
    removeDangerousAttributes(div);
    return div.innerHTML;
}

/** Remove script, iframe, object, embed, form elements. */
function removeDangerousElements(root: HTMLElement): void
{
    const els = root.querySelectorAll(
        "script, iframe, object, embed, form"
    );
    for (const el of els) { el.remove(); }
}

/** Remove on* event handlers and javascript: URLs. */
function removeDangerousAttributes(root: HTMLElement): void
{
    const all = root.querySelectorAll("*");
    for (const el of all)
    {
        const attrs = Array.from(el.attributes);
        for (const attr of attrs)
        {
            if (attr.name.startsWith("on")
                || attr.value.trim().toLowerCase().startsWith("javascript:"))
            {
                el.removeAttribute(attr.name);
            }
        }
    }
}

// ============================================================================
// ESCAPE UTILITY
// ============================================================================

/** Escape HTML entities for safe embedding. */
function escapeHtml(str: string): string
{
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// MARKED CONFIGURATION
// ============================================================================

/** Diagram languages handled by post-render, not highlight.js. */
const DIAGRAM_LANGS = new Set([
    "mermaid", "dot", "graphviz", "plantuml",
]);

/** Configure marked with available extensions. */
function configureMarked(
    marked: MarkedStatic,
    opts: MarkdownRendererOptions
): void
{
    const hljs = opts.highlight !== false
        ? probe<HljsStatic>("hljs") : null;
    const katex = opts.math !== false
        ? probe<KatexStatic>("katex") : null;

    const renderer: Record<string, unknown> = {};
    renderer["code"] = buildCodeRenderer(hljs);

    if (hljs)
    {
        logDebug("highlight.js enabled");
    }

    if (katex)
    {
        applyKatexExtension(marked, katex);
        logDebug("KaTeX enabled");
    }

    marked.use({ renderer });
}

// ============================================================================
// CODE RENDERER
// ============================================================================

/** Build a marked renderer for code blocks. */
function buildCodeRenderer(
    hljs: HljsStatic | null
): (token: { text: string; lang?: string }) => string
{
    return (token: { text: string; lang?: string }): string =>
    {
        const { text, lang } = token;

        if (lang && DIAGRAM_LANGS.has(lang))
        {
            return buildDiagramPlaceholder(lang, text);
        }

        return renderCodeBlock(hljs, text, lang);
    };
}

/** Build a placeholder div for async diagram rendering. */
function buildDiagramPlaceholder(lang: string, src: string): string
{
    const cls = `md-diagram md-diagram-${lang}`;
    const encoded = escapeHtml(src);
    // Canvas anchors name this region rather than counting it (ADR-162).
    return `<div class="${cls}" data-lang="${lang}" `
        + "data-dui-region=\"markdownrenderer:diagram\" "
        + `data-source="${encoded}"></div>`;
}

/** Render a code block with optional highlight.js. */
function renderCodeBlock(
    hljs: HljsStatic | null,
    text: string,
    lang?: string
): string
{
    if (hljs && lang && hljs.getLanguage(lang))
    {
        const hl = hljs.highlight(text, { language: lang }).value;
        return `<pre><code class="hljs language-${lang}">`
            + `${hl}</code></pre>`;
    }
    return `<pre><code>${escapeHtml(text)}</code></pre>`;
}

// ============================================================================
// KATEX EXTENSIONS
// ============================================================================

/** Add KaTeX tokenizer + renderer extensions to marked. */
function applyKatexExtension(
    marked: MarkedStatic,
    katex: KatexStatic
): void
{
    marked.use({
        extensions: [
            buildKatexBlock(katex),
            buildKatexInline(katex),
        ],
    });
}

/** Block-level math extension ($$...$$). */
function buildKatexBlock(katex: KatexStatic): Record<string, unknown>
{
    return {
        name: "mathBlock",
        level: "block",
        start: (src: string) => src.indexOf("$$"),
        tokenizer: (src: string) =>
        {
            const m = /^\$\$([\s\S]+?)\$\$/.exec(src);
            if (m)
            {
                return { type: "mathBlock", raw: m[0], text: m[1].trim() };
            }
            return undefined;
        },
        renderer: (token: { text: string }) =>
            renderKatex(katex, token.text, true),
    };
}

/** Inline math extension ($...$). */
function buildKatexInline(katex: KatexStatic): Record<string, unknown>
{
    return {
        name: "mathInline",
        level: "inline",
        start: (src: string) => src.indexOf("$"),
        tokenizer: (src: string) =>
        {
            const m = /^\$([^\n$]+?)\$/.exec(src);
            if (m)
            {
                return { type: "mathInline", raw: m[0], text: m[1].trim() };
            }
            return undefined;
        },
        renderer: (token: { text: string }) =>
            renderKatex(katex, token.text, false),
    };
}

/** Render a KaTeX expression with error fallback. */
function renderKatex(
    katex: KatexStatic,
    tex: string,
    displayMode: boolean
): string
{
    try
    {
        return katex.renderToString(tex, {
            displayMode,
            throwOnError: false,
        });
    }
    catch
    {
        const tag = displayMode ? "pre" : "code";
        return `<${tag} class="math-error">${escapeHtml(tex)}</${tag}>`;
    }
}

// ============================================================================
// POST-RENDER: MERMAID
// ============================================================================

/** Find Mermaid diagram placeholders and render. */
function postRenderMermaid(container: HTMLElement): void
{
    const mermaid = probe<MermaidStatic>("mermaid");
    if (!mermaid) { return; }

    const blocks = container.querySelectorAll(".md-diagram-mermaid");
    if (blocks.length === 0) { return; }

    for (const block of blocks)
    {
        const pre = document.createElement("pre");
        pre.className = "mermaid";
        pre.textContent = block.getAttribute("data-source") ?? "";
        block.innerHTML = "";
        block.appendChild(pre);
    }

    const pres = container.querySelectorAll("pre.mermaid");
    mermaid.run({ nodes: pres }).then(() =>
    {
        logDebug("Mermaid:", pres.length, "diagrams");
    }).catch((err: unknown) =>
    {
        logWarn("Mermaid failed:", err);
    });
}

// ============================================================================
// POST-RENDER: GRAPHVIZ / DOT
// ============================================================================

/** Find Graphviz/dot placeholders and render via @viz-js/viz. */
function postRenderGraphviz(container: HTMLElement): void
{
    const Viz = probe<VizStatic>("Viz");
    if (!Viz) { return; }

    const blocks = container.querySelectorAll(
        ".md-diagram-dot, .md-diagram-graphviz"
    );
    if (blocks.length === 0) { return; }

    Viz.instance().then((viz) =>
    {
        renderGraphvizBlocks(viz, blocks);
    }).catch((err: unknown) =>
    {
        logWarn("Graphviz init failed:", err);
    });
}

/** Render each Graphviz block using a Viz instance. */
function renderGraphvizBlocks(
    viz: VizInstance,
    blocks: NodeListOf<Element>
): void
{
    for (const block of blocks)
    {
        const src = block.getAttribute("data-source") ?? "";
        try
        {
            const svg = viz.renderSVGElement(src);
            svg.style.maxWidth = "100%";
            svg.style.height = "auto";
            block.innerHTML = "";
            block.appendChild(svg);
        }
        catch (err)
        {
            block.innerHTML = `<pre class="md-diagram-error">`
                + `${escapeHtml(String(err))}</pre>`;
        }
    }
    logDebug("Graphviz:", blocks.length, "diagrams");
}

// ============================================================================
// POST-RENDER: PLANTUML
// ============================================================================

/** Find PlantUML placeholders and render via server. */
function postRenderPlantUml(
    container: HTMLElement,
    serverUrl: string
): void
{
    const blocks = container.querySelectorAll(".md-diagram-plantuml");
    if (blocks.length === 0) { return; }

    for (const block of blocks)
    {
        const src = block.getAttribute("data-source") ?? "";
        renderPlantUmlBlock(block as HTMLElement, src, serverUrl);
    }
}

/** Render a single PlantUML block by fetching SVG from the server. */
function renderPlantUmlBlock(
    block: HTMLElement,
    src: string,
    serverUrl: string
): void
{
    block.innerHTML = `<span class="md-diagram-loading">Rendering...</span>`;
    encodePlantUml(src)
        .then((encoded) => fetch(serverUrl + encoded))
        .then((resp) => handlePlantUmlResponse(resp))
        .then((svg) => applyPlantUmlDiagram(block, svg))
        .catch((err) => showPlantUmlError(block, err));
}

/** Validate and extract text from PlantUML server response. */
function handlePlantUmlResponse(resp: Response): Promise<string>
{
    if (!resp.ok) { throw new Error(`HTTP ${resp.status}`); }
    return resp.text();
}

/**
 * Show a rendered diagram as an image, so its markup can never run (SEC-3).
 *
 * The reply comes from a PlantUML server, which is a third party under the
 * default option, and SVG is markup rather than pixels. Assigning that markup
 * to `innerHTML` parsed it into live elements, and an event-handler attribute
 * such as `onerror` runs as soon as the parser attaches it. A browser runs no
 * script in an SVG that it loads as an image. A data URL therefore removes
 * every variant of this defect, where a filter would remove only the vectors
 * somebody listed (ADR-164).
 *
 * The other two diagram paths need no equivalent change. Mermaid receives its
 * source through `textContent`, and Graphviz returns a DOM element that this
 * file appends. Neither inserts a markup string, and neither takes markup
 * from a remote server.
 *
 * @param block - Placeholder element for this diagram.
 * @param svg - SVG markup the server returned.
 */
function applyPlantUmlDiagram(block: HTMLElement, svg: string): void
{
    const img = document.createElement("img");
    const source = block.getAttribute("data-source") ?? "";

    img.src = svgDataUrl(svg);
    img.alt = "PlantUML diagram";
    img.className = "md-diagram-image";
    img.style.maxWidth = "100%";
    img.style.height = "auto";

    block.innerHTML = "";
    block.appendChild(img);

    if (source)
    {
        describePlantUmlDiagram(block, img, source);
    }
}

/**
 * A diagram as a data URL that an `img` element can load.
 *
 * Base64 rather than percent-encoding, for two reasons. An SVG carries many
 * characters that percent-encoding expands to three bytes each, such as the
 * `<`, `"` and `#` in `fill="#000"`, so the URL grows by about a third. And
 * base64 is the form browsers have always accepted for an SVG image, where
 * percent-encoded SVG has needed engine-specific escaping.
 *
 * `btoa` throws on a code point above 255 and a diagram can contain any
 * Unicode text, so the string becomes UTF-8 bytes first.
 *
 * @param svg - SVG markup.
 * @returns A data URL holding the same markup.
 */
function svgDataUrl(svg: string): string
{
    const bytes = new TextEncoder().encode(svg);
    let binary = "";

    for (const byte of bytes)
    {
        binary += String.fromCharCode(byte);
    }

    return `data:image/svg+xml;base64,${btoa(binary)}`;
}

/**
 * Give the image a long description holding the diagram source.
 *
 * An image exposes only its `alt` text to assistive technology, so rendering
 * the diagram as an image takes the diagram text out of the accessibility
 * tree. The source goes into a visually hidden element, and
 * `aria-describedby` points the image at it. This is the long-description
 * pattern for a complex image. The `data-source` attribute on the placeholder
 * is not enough on its own, because the accessibility tree does not read it.
 *
 * @param block - Placeholder element for this diagram.
 * @param img - Image this function describes.
 * @param source - Diagram source text.
 */
function describePlantUmlDiagram(
    block: HTMLElement,
    img: HTMLImageElement,
    source: string
): void
{
    const id = `md-diagram-source-${++diagramSeq}`;
    const desc = document.createElement("pre");

    desc.id = id;
    desc.className = "visually-hidden";
    desc.textContent = source;

    block.appendChild(desc);
    img.setAttribute("aria-describedby", id);
}

/** Show a PlantUML rendering error. */
function showPlantUmlError(block: HTMLElement, err: unknown): void
{
    block.innerHTML = `<pre class="md-diagram-error">`
        + `PlantUML error: ${escapeHtml(String(err))}</pre>`;
    logWarn("PlantUML failed:", err);
}

// ============================================================================
// PLANTUML ENCODING
// ============================================================================
// PlantUML servers expect: deflate-raw → custom base64 encoding.
// Uses native CompressionStream API (no library needed).

/** Encode PlantUML source for URL embedding. */
async function encodePlantUml(text: string): Promise<string>
{
    const utf8 = new TextEncoder().encode(text);
    const compressed = await deflateRaw(utf8);
    return plantUmlBase64(compressed);
}

/** Deflate-raw compress using native CompressionStream. */
async function deflateRaw(data: Uint8Array): Promise<Uint8Array>
{
    const stream = new Blob([data as BlobPart]).stream()
        .pipeThrough(new CompressionStream("deflate-raw"));
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done)
    {
        const result = await reader.read();
        done = result.done;
        if (result.value) { chunks.push(result.value); }
    }
    return concatUint8Arrays(chunks);
}

/** Concatenate multiple Uint8Arrays. */
function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array
{
    let total = 0;
    for (const a of arrays) { total += a.length; }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const a of arrays)
    {
        result.set(a, offset);
        offset += a.length;
    }
    return result;
}

/** PlantUML custom base64 encoding (3 bytes → 4 chars). */
function plantUmlBase64(data: Uint8Array): string
{
    let result = "";
    const len = data.length;
    for (let i = 0; i < len; i += 3)
    {
        const b1 = data[i];
        const b2 = i + 1 < len ? data[i + 1] : 0;
        const b3 = i + 2 < len ? data[i + 2] : 0;
        result += encodeTriple(b1, b2, b3);
    }
    return result;
}

/** Encode 3 bytes as 4 PlantUML base64 characters. */
function encodeTriple(b1: number, b2: number, b3: number): string
{
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return encode6bit(c1) + encode6bit(c2)
        + encode6bit(c3) + encode6bit(c4);
}

/** Map a 6-bit value to PlantUML's base64 alphabet. */
function encode6bit(b: number): string
{
    if (b < 10) { return String.fromCharCode(48 + b); }
    b -= 10;
    if (b < 26) { return String.fromCharCode(65 + b); }
    b -= 26;
    if (b < 26) { return String.fromCharCode(97 + b); }
    b -= 26;
    if (b === 0) { return "-"; }
    if (b === 1) { return "_"; }
    return "?";
}

// ============================================================================
// FACTORY
// ============================================================================

/** Counter for unique long-description ids, one per rendered diagram. */
let diagramSeq = 0;

let configured = false;

/**
 * Create a markdown renderer handle.
 * Requires `marked` to be loaded globally (`window.marked`).
 *
 * Optional globals detected automatically:
 *  - `window.hljs`    — highlight.js for code syntax highlighting
 *  - `window.katex`   — KaTeX for LaTeX math rendering
 *  - `window.mermaid` — Mermaid for diagram rendering
 *  - `window.Viz`     — @viz-js/viz for Graphviz/dot rendering
 *
 * PlantUML uses a configurable server (no client-side dependency).
 */
export function createMarkdownRenderer(
    opts: MarkdownRendererOptions = {}
): MarkdownRendererHandle
{
    const marked = probe<MarkedStatic>("marked");

    if (!marked)
    {
        logWarn("marked not found on window");
        return buildFallbackHandle();
    }

    if (!configured)
    {
        configureMarked(marked, opts);
        configured = true;
    }

    logCapabilities(opts);
    return buildHandle(marked, opts);
}

/** Build the renderer handle with marked and options. */
function buildHandle(
    marked: MarkedStatic,
    opts: MarkdownRendererOptions
): MarkdownRendererHandle
{
    const pumlServer = opts.plantumlServer ?? PLANTUML_DEFAULT_SERVER;
    return {
        toHtml: (md: string): string => sanitize(marked.parse(md)),
        render: (md: string, target: HTMLElement): void =>
        {
            target.innerHTML = sanitize(marked.parse(md));
            runPostRenderSteps(target, opts, pumlServer);
        },
    };
}

/** Run all async post-render steps (Mermaid, Graphviz, PlantUML). */
function runPostRenderSteps(
    target: HTMLElement,
    opts: MarkdownRendererOptions,
    pumlServer: string
): void
{
    if (opts.mermaid !== false) { postRenderMermaid(target); }
    if (opts.graphviz !== false) { postRenderGraphviz(target); }
    if (opts.plantuml !== false) { postRenderPlantUml(target, pumlServer); }
}

/** Log which capabilities are available. */
function logCapabilities(opts: MarkdownRendererOptions): void
{
    const caps: string[] = ["marked"];
    if (opts.highlight !== false && probe("hljs")) { caps.push("hljs"); }
    if (opts.math !== false && probe("katex")) { caps.push("katex"); }
    if (opts.mermaid !== false && probe("mermaid")) { caps.push("mermaid"); }
    if (opts.graphviz !== false && probe("Viz")) { caps.push("graphviz"); }
    if (opts.plantuml !== false) { caps.push("plantuml"); }
    logInfo("Created renderer —", caps.join(", "));
}

/** Fallback when marked is not available — plain text only. */
function buildFallbackHandle(): MarkdownRendererHandle
{
    return {
        toHtml: (md: string): string => escapeHtml(md),
        render: (md: string, target: HTMLElement): void =>
        {
            target.textContent = md;
            target.style.whiteSpace = "pre-wrap";
        },
    };
}

// ============================================================================
// WINDOW REGISTRATION
// ============================================================================

window["createMarkdownRenderer"] =
    createMarkdownRenderer;
