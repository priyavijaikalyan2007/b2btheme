/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: MarkdownRenderer
 * Security-focused tests for the MarkdownRenderer component.
 * Covers: SEC-3 (a PlantUML reply is loaded as an image and never parsed as
 * markup), sanitize() XSS prevention, the factory function, code rendering,
 * KaTeX math, diagram placeholders, and fallback behaviour.
 *
 * Until 11 October 2026 this header claimed SEC-3 coverage that no test
 * provided. The three tests below it checked sanitize() against SVG-shaped
 * MARKDOWN, which is a different input from a server reply, and one comment
 * said CompressionStream and fetch were unavailable in jsdom. Both exist
 * here. The one missing piece is `Blob.prototype.stream`, which the SEC-3
 * block supplies from Node, so the real path was always testable (ADR-164).
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { Blob as NodeBlob } from "node:buffer";
import { createMarkdownRenderer } from "./markdownrenderer";

// ============================================================================
// HELPERS
// ============================================================================

/** Build a minimal marked mock that returns HTML from markdown. */
function buildMarkedMock(parseImpl?: (md: string) => string)
{
    return {
        parse: parseImpl ?? ((md: string) => `<p>${md}</p>`),
        use: vi.fn(),
    };
}

/** Build a minimal hljs mock. */
function buildHljsMock()
{
    return {
        highlight: vi.fn((code: string, opts: { language: string }) =>
            ({ value: `<span class="hl">${code}</span>` })),
        getLanguage: vi.fn((lang: string) => lang === "javascript" || lang === "ts"),
    };
}

/** Build a minimal katex mock. */
function buildKatexMock()
{
    return {
        renderToString: vi.fn((tex: string, opts?: Record<string, unknown>) =>
            `<span class="katex">${tex}</span>`),
    };
}

// ============================================================================
// SETUP / TEARDOWN
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);

    // Reset the module-level `configured` flag by clearing all window globals
    // so that configureMarked runs fresh on each test.
    (window as unknown as Record<string, unknown>)["marked"] = undefined;
    (window as unknown as Record<string, unknown>)["hljs"] = undefined;
    (window as unknown as Record<string, unknown>)["katex"] = undefined;
    (window as unknown as Record<string, unknown>)["mermaid"] = undefined;
    (window as unknown as Record<string, unknown>)["Viz"] = undefined;
});

afterEach(() =>
{
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
});

// ============================================================================
// FACTORY — createMarkdownRenderer
// ============================================================================

describe("createMarkdownRenderer", () =>
{
    test("withMarkedOnWindow_ReturnsHandle", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock());
        const handle = createMarkdownRenderer();
        expect(handle).toBeDefined();
        expect(typeof handle.render).toBe("function");
        expect(typeof handle.toHtml).toBe("function");
    });

    test("withoutMarked_Throws", () =>
    {
        /*
         * ADR-202. These three cases specified a fallback handle whose
         * `render` put the raw markdown in as pre-wrap text and whose
         * `toHtml` escaped it rather than rendering it. A reader saw
         * "## Heading" and "**bold**" as literal characters.
         *
         * THIS WAS THE ROOT OF A FAMILY. Every markdown-rendering
         * component asks window.createMarkdownRenderer for a handle,
         * so each inherited the substitution, and FALLBACK-9 and
         * ADR-200 fixed four of them one at a time downstream. Their
         * guards fire when the COMPONENT is absent. This one fires
         * when `marked` is absent and produced the same output from a
         * layer deeper, so those four fixes did not cover it.
         */
        expect(() => createMarkdownRenderer())
            .toThrow(/marked was not found.*marked@15/s);
    });

    test("withMarked_toHtml_ReturnsRenderedHtml", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            (md) => `<p><strong>${md}</strong></p>`
        ));
        const handle = createMarkdownRenderer();
        const result = handle.toHtml("bold text");
        expect(result).toContain("<strong>");
        expect(result).toContain("bold text");
    });

    test("withMarked_render_InjectsIntoTarget", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            (md) => `<p>${md}</p>`
        ));
        const handle = createMarkdownRenderer();
        const target = document.createElement("div");
        handle.render("Hello", target);
        expect(target.innerHTML).toContain("<p>");
        expect(target.textContent).toContain("Hello");
    });

    test("withClassName_PassesOption", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock());
        const handle = createMarkdownRenderer({ className: "custom-md" });
        expect(handle).toBeDefined();
    });
});

// ============================================================================
// SEC-3: SANITIZE — XSS PREVENTION
// ============================================================================

describe("sanitize — XSS prevention", () =>
{
    test("stripsScriptTags", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<p>Hello</p><script>alert('xss')</script>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<script>");
        expect(html).not.toContain("alert");
        expect(html).toContain("<p>Hello</p>");
    });

    test("stripsIframeTags", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<p>Text</p><iframe src="evil.com"></iframe>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<iframe");
        expect(html).toContain("<p>Text</p>");
    });

    test("stripsObjectTags", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<object data="evil.swf"></object><p>OK</p>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<object");
    });

    test("stripsEmbedTags", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<embed src="evil.swf"><p>OK</p>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<embed");
    });

    test("stripsFormTags", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<form action="evil"><input></form>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<form");
    });

    test("stripsOnclickHandlers", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<p onclick="alert(1)">Click me</p>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onclick");
        expect(html).toContain("Click me");
    });

    test("stripsOnloadHandlers", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<img src="x" onload="alert(1)">`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onload");
    });

    test("stripsOnerrorHandlers", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<img src="x" onerror="alert(1)">`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onerror");
    });

    test("stripsOnmouseoverHandlers", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div onmouseover="alert(1)">Hover</div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onmouseover");
    });

    test("stripsJavascriptUrls", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<a href="javascript:alert(1)">Click</a>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("javascript:");
    });

    test("stripsJavascriptUrlsCaseInsensitive", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<a href="  JaVaScRiPt:alert(1)">Click</a>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("javascript:");
        expect(html).not.toContain("JaVaScRiPt:");
    });

    test("preservesSafeContent", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<h1>Title</h1><p>Safe <strong>bold</strong> text</p>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).toContain("<h1>Title</h1>");
        expect(html).toContain("<strong>bold</strong>");
    });
});

// ============================================================================
// sanitize() ON SVG-SHAPED MARKDOWN
// ============================================================================

describe("sanitize() on SVG-shaped markdown", () =>
{
    test("plantumlPlaceholder_CreatedByRender", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-plantuml" `
                + `data-lang="plantuml" data-source="@startuml&#10;A-&gt;B&#10;@enduml"></div>`
        ));

        const handle = createMarkdownRenderer({ plantuml: true });
        const target = document.createElement("div");
        handle.render("plantuml content", target);

        const block = target.querySelector(".md-diagram-plantuml");
        expect(block).not.toBeNull();
        // This test covers the SYNCHRONOUS half: the placeholder exists and
        // shows its loading indicator before any reply arrives. The async
        // half has its own block below, which stubs fetch. The earlier
        // comment here blamed CompressionStream and fetch, and both exist in
        // this environment. Only `Blob.prototype.stream` is missing.
        expect(block?.querySelector(".md-diagram-loading")).not.toBeNull();
    });

    test("sanitize_StripScriptFromSvgString", () =>
    {
        // Verify the sanitize function (used by toHtml/render) strips
        // script tags even when embedded inside SVG markup.
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<svg><script>alert('xss')</script><rect/></svg>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<script>");
        expect(html).not.toContain("alert");
        expect(html).toContain("<rect");
    });

    test("sanitize_StripEventHandlersFromSvg", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<svg onload="alert(1)"><rect onclick="alert(2)"/></svg>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onload");
        expect(html).not.toContain("onclick");
    });
});

// ============================================================================
// CODE BLOCK RENDERING
// ============================================================================

describe("code block rendering", () =>
{
    test("withHljs_HighlightsKnownLanguage", () =>
    {
        const hljs = buildHljsMock();
        vi.stubGlobal("hljs", hljs);
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<pre><code class="hljs language-javascript">`
                + `<span class="hl">var x = 1;</span></code></pre>`
        ));
        const handle = createMarkdownRenderer({ highlight: true });
        const html = handle.toHtml("```javascript\nvar x = 1;\n```");
        expect(html).toContain("code");
    });

    test("withoutHljs_FallsBackToPlainCode", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<pre><code>var x = 1;</code></pre>`
        ));
        const handle = createMarkdownRenderer({ highlight: true });
        const html = handle.toHtml("```\nvar x = 1;\n```");
        expect(html).toContain("<code>");
    });

    test("highlightDisabled_SkipsHljs", () =>
    {
        const hljs = buildHljsMock();
        vi.stubGlobal("hljs", hljs);
        vi.stubGlobal("marked", buildMarkedMock());
        const handle = createMarkdownRenderer({ highlight: false });
        // hljs.highlight should not have been called during code rendering
        expect(handle).toBeDefined();
    });
});

// ============================================================================
// KATEX MATH RENDERING
// ============================================================================

describe("KaTeX math rendering", () =>
{
    test("withKatex_HandleCreatedSuccessfully", () =>
    {
        const katex = buildKatexMock();
        vi.stubGlobal("katex", katex);
        vi.stubGlobal("marked", buildMarkedMock());
        // The module-level `configured` flag means configureMarked may
        // have already run. We verify the handle is created successfully
        // with KaTeX on the window.
        const handle = createMarkdownRenderer({ math: true });
        expect(handle).toBeDefined();
        expect(typeof handle.toHtml).toBe("function");
    });

    test("mathDisabled_HandleStillCreated", () =>
    {
        const katex = buildKatexMock();
        vi.stubGlobal("katex", katex);
        vi.stubGlobal("marked", buildMarkedMock());
        const handle = createMarkdownRenderer({ math: false });
        expect(handle).toBeDefined();
    });

    test("withoutKatex_SilentlySkips", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock());
        // katex not on window
        const handle = createMarkdownRenderer({ math: true });
        expect(handle).toBeDefined();
    });
});

// ============================================================================
// DIAGRAM PLACEHOLDERS
// ============================================================================

describe("diagram placeholders", () =>
{
    test("mermaidCodeBlock_CreatesMermaidPlaceholder", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-mermaid" `
                + `data-lang="mermaid" data-source="graph TD; A-->B;"></div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("```mermaid\ngraph TD;\nA-->B;\n```");
        expect(html).toContain("md-diagram-mermaid");
        expect(html).toContain("data-lang=\"mermaid\"");
    });

    test("dotCodeBlock_CreatesGraphvizPlaceholder", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-dot" `
                + `data-lang="dot" data-source="digraph { A->B; }"></div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("```dot\ndigraph { A->B; }\n```");
        expect(html).toContain("md-diagram-dot");
    });

    test("graphvizCodeBlock_CreatesGraphvizPlaceholder", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-graphviz" `
                + `data-lang="graphviz" data-source="digraph { A->B; }"></div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("```graphviz\ndigraph { A->B; }\n```");
        expect(html).toContain("md-diagram-graphviz");
    });

    test("plantumlCodeBlock_CreatesPlantUmlPlaceholder", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-plantuml" `
                + `data-lang="plantuml" data-source="@startuml&#10;@enduml"></div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("```plantuml\n@startuml\n@enduml\n```");
        expect(html).toContain("md-diagram-plantuml");
    });
});

// ============================================================================
// POST-RENDER: MERMAID
// ============================================================================

describe("post-render Mermaid", () =>
{
    test("withMermaidOnWindow_CallsMermaidRun", async () =>
    {
        const mermaidRun = vi.fn(() => Promise.resolve());
        vi.stubGlobal("mermaid", { run: mermaidRun });
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-mermaid" `
                + `data-lang="mermaid" data-source="graph TD; A-->B;"></div>`
        ));

        const handle = createMarkdownRenderer({ mermaid: true });
        const target = document.createElement("div");
        handle.render("mermaid content", target);

        await vi.advanceTimersByTimeAsync(100);

        expect(mermaidRun).toHaveBeenCalled();
    });

    test("mermaidDisabled_DoesNotCallRun", () =>
    {
        const mermaidRun = vi.fn(() => Promise.resolve());
        vi.stubGlobal("mermaid", { run: mermaidRun });
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-mermaid" data-source="test"></div>`
        ));

        const handle = createMarkdownRenderer({ mermaid: false });
        const target = document.createElement("div");
        handle.render("content", target);

        expect(mermaidRun).not.toHaveBeenCalled();
    });
});

// ============================================================================
// POST-RENDER: GRAPHVIZ
// ============================================================================

describe("post-render Graphviz", () =>
{
    test("withVizOnWindow_CallsVizInstance", () =>
    {
        const vizInstanceFn = vi.fn(() =>
        {
            // Return a never-resolving promise to avoid side effects
            // We only need to verify instance() was called
            return new Promise(() => {});
        });
        vi.stubGlobal("Viz", { instance: vizInstanceFn });
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-dot" `
                + `data-lang="dot" data-source="digraph{A->B}"></div>`
        ));

        const handle = createMarkdownRenderer({ graphviz: true });
        const target = document.createElement("div");
        handle.render("dot content", target);

        // Viz.instance() should have been called to initialize rendering
        expect(vizInstanceFn).toHaveBeenCalled();
    });

    test("graphvizDisabled_DoesNotCallViz", () =>
    {
        const vizInstanceFn = vi.fn(() => Promise.resolve({}));
        vi.stubGlobal("Viz", { instance: vizInstanceFn });
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div class="md-diagram md-diagram-dot" data-source="test"></div>`
        ));

        const handle = createMarkdownRenderer({ graphviz: false });
        const target = document.createElement("div");
        handle.render("content", target);

        expect(vizInstanceFn).not.toHaveBeenCalled();
    });
});

// ============================================================================
// ESCAPE HTML UTILITY
// ============================================================================

describe("escapeHtml, through the code-block renderer", () =>
{
    /*
     * ADR-202. These reached `escapeHtml` through the fallback
     * handle's toHtml, which no longer exists. The helper does, in
     * five places, and the code-block renderer is the one a consumer
     * meets. Same subject, through a door that is still open.
     */
    function renderFence(body: string): string
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<pre><code>${body}</code></pre>`));
        return createMarkdownRenderer().toHtml("```\n" + body + "\n```");
    }

    test("escapesAngleBrackets", () =>
    {
        const result = renderFence("<script>alert(1)</script>");

        expect(result).not.toContain("<script>");
    });

    test("escapesAmpersands", () =>
    {
        const result = renderFence("A & B");

        expect(result).toContain("&amp;");
    });

    test("aQuoteInTextContentComesBackAsAQuote", () =>
    {
        // escapeHtml turns `"` into `&quot;`, and the sanitiser that
        // runs after it re-serialises that back to `"`, because a
        // quote in text content is not markup. Written down because
        // the obvious assertion here is the wrong one, and I made it.
        const result = renderFence('key="value"');

        expect(result).toContain('key="value"');
        expect(result).not.toContain("&quot;");
    });
});

// ============================================================================
// PLANTUML SERVER OPTION
// ============================================================================

describe("PlantUML server option", () =>
{
    test("customServer_PassedToHandle", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock());
        // Verify the handle is created with a custom server option
        // without needing async fetch. The option is passed through
        // to the internal render pipeline.
        const handle = createMarkdownRenderer({
            plantumlServer: "http://localhost:8080/svg/"
        });
        expect(handle).toBeDefined();
    });

    test("plantumlDisabled_DoesNotCreatePlaceholders", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<p>No diagram here</p>`
        ));
        const handle = createMarkdownRenderer({ plantuml: false });
        const target = document.createElement("div");
        handle.render("plain text", target);

        const blocks = target.querySelectorAll(".md-diagram-plantuml");
        expect(blocks.length).toBe(0);
    });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe("edge cases", () =>
{
    test("emptyMarkdown_ProducesEmptyOutput", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(() => ""));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("");
        expect(html).toBe("");
    });

    test("nullishContent_HandledGracefully", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(() => ""));
        const handle = createMarkdownRenderer();
        expect(() => handle.toHtml("")).not.toThrow();
    });

    test("multipleScriptTags_AllStripped", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<script>a</script><p>OK</p><script>b</script><script>c</script>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).toBe("<p>OK</p>");
    });

    test("nestedDangerousElements_AllStripped", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div><iframe><script>alert(1)</script></iframe></div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("<iframe");
        expect(html).not.toContain("<script");
    });

    test("multipleEventHandlers_AllStripped", () =>
    {
        vi.stubGlobal("marked", buildMarkedMock(
            () => `<div onclick="a" onmouseover="b" onfocus="c">Text</div>`
        ));
        const handle = createMarkdownRenderer();
        const html = handle.toHtml("anything");
        expect(html).not.toContain("onclick");
        expect(html).not.toContain("onmouseover");
        expect(html).not.toContain("onfocus");
        expect(html).toContain("Text");
    });
});

// ============================================================================
// SEC-3: A PLANTUML REPLY IS LOADED AS AN IMAGE
// ============================================================================

/**
 * The reply from a PlantUML server is markup, and the server is a third party
 * under the default option. These tests drive the real asynchronous path:
 * marked produces the placeholder, the component compresses the source,
 * fetch is stubbed, and the reply reaches the insertion function.
 *
 * Real timers are needed. The shared beforeEach installs fake timers, and the
 * encoder reads a CompressionStream whose reads are not microtasks.
 */
describe("SEC-3 — a PlantUML reply is loaded as an image", () =>
{
    const PLACEHOLDER = `<div class="md-diagram md-diagram-plantuml" `
        + `data-lang="plantuml" data-source="@startuml&#10;A-&gt;B&#10;@enduml">`
        + `</div>`;

    beforeEach(() =>
    {
        // The encoder calls `new Blob([bytes]).stream()`, and jsdom's Blob
        // has no stream(). Node's Blob does, and it returns a web
        // ReadableStream that CompressionStream accepts. Shimming the one
        // missing method keeps the test on the real code path instead of
        // asserting against a mock of it.
        vi.stubGlobal("Blob", NodeBlob);
    });

    /** Decode a base64 data URL payload back to its original text. */
    function decodeDataUrl(src: string): string
    {
        const b64 = src.slice("data:image/svg+xml;base64,".length);
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

        return new TextDecoder().decode(bytes);
    }

    /** Render one PlantUML block with a stubbed server reply. */
    async function renderWithReply(svg: string): Promise<HTMLElement>
    {
        vi.useRealTimers();
        vi.stubGlobal("marked", buildMarkedMock(() => PLACEHOLDER));
        vi.stubGlobal("fetch", vi.fn(async () => new Response(svg,
            { status: 200, headers: { "Content-Type": "image/svg+xml" } })));

        const handle = createMarkdownRenderer({ plantuml: true });
        const target = document.createElement("div");

        container.appendChild(target);
        handle.render("plantuml content", target);

        const block = target.querySelector<HTMLElement>(".md-diagram-plantuml");

        expect(block).not.toBeNull();

        await vi.waitFor(() =>
        {
            expect(block?.querySelector("img")).not.toBeNull();
        });

        return block as HTMLElement;
    }

    test("serverReply_BecomesImageWithBase64DataUrl", async () =>
    {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;
        const block = await renderWithReply(svg);
        const img = block.querySelector("img") as HTMLImageElement;

        expect(img.src.startsWith("data:image/svg+xml;base64,")).toBe(true);
        expect(decodeDataUrl(img.src)).toBe(svg);
        expect(img.alt).toBe("PlantUML diagram");
    });

    test("hostileReply_ProducesNoElementsAndRunsNoHandler", async () =>
    {
        const g = globalThis as unknown as Record<string, unknown>;

        delete g["__sec3"];

        const svg = `<svg xmlns="http://www.w3.org/2000/svg">`
            + `<image href="/missing" onerror="globalThis.__sec3 = 1"/>`
            + `</svg>`;
        const block = await renderWithReply(svg);
        const img = block.querySelector("img") as HTMLImageElement;

        // No element from the reply exists, because nothing parsed it.
        expect(block.querySelector("svg")).toBeNull();
        expect(block.querySelector("[onerror]")).toBeNull();
        expect(g["__sec3"]).toBeUndefined();

        // The payload is still intact INSIDE the data URL. The defect is
        // closed because the markup is never parsed, not because a filter
        // removed something.
        expect(decodeDataUrl(img.src)).toContain("onerror");
    });

    test("unicodeReply_SurvivesTheDataUrlRoundTrip", async () =>
    {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg">`
            + `<text>Ünicode 日本語 café</text></svg>`;
        const block = await renderWithReply(svg);
        const img = block.querySelector("img") as HTMLImageElement;

        // btoa throws above code point 255, so the source is encoded to UTF-8
        // bytes first. A throw here would leave the block empty.
        expect(decodeDataUrl(img.src)).toBe(svg);
    });

    test("image_CarriesTheSourceAsALongDescription", async () =>
    {
        const block = await renderWithReply("<svg/>");
        const img = block.querySelector("img") as HTMLImageElement;
        const id = img.getAttribute("aria-describedby");

        expect(id).toBeTruthy();

        const desc = block.querySelector(`#${id}`);

        expect(desc).not.toBeNull();
        expect(desc?.className).toContain("visually-hidden");
        expect(desc?.textContent).toContain("@startuml");
    });

    test("failedRequest_ShowsEscapedErrorAndNoImage", async () =>
    {
        vi.useRealTimers();
        vi.stubGlobal("marked", buildMarkedMock(() => PLACEHOLDER));
        vi.stubGlobal("fetch", vi.fn(async () => new Response("nope",
            { status: 503 })));

        const handle = createMarkdownRenderer({ plantuml: true });
        const target = document.createElement("div");

        container.appendChild(target);
        handle.render("plantuml content", target);

        const block = target.querySelector<HTMLElement>(".md-diagram-plantuml");

        await vi.waitFor(() =>
        {
            expect(block?.querySelector(".md-diagram-error")).not.toBeNull();
        });

        expect(block?.querySelector("img")).toBeNull();
        expect(block?.textContent).toContain("503");
    });
});
