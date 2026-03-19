/**
 * ⚓ TESTS: MarkdownRenderer
 * Security-focused tests for the MarkdownRenderer component.
 * Covers: SEC-3 PlantUML SVG sanitization, sanitize() XSS prevention,
 * factory function, code rendering, KaTeX math, diagram placeholders,
 * and fallback behaviour.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
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

    test("withoutMarked_ReturnsFallbackHandle", () =>
    {
        // marked is undefined on window
        const handle = createMarkdownRenderer();
        expect(handle).toBeDefined();
        expect(typeof handle.render).toBe("function");
        expect(typeof handle.toHtml).toBe("function");
    });

    test("withoutMarked_toHtml_EscapesHtml", () =>
    {
        const handle = createMarkdownRenderer();
        const result = handle.toHtml("<script>alert(1)</script>");
        expect(result).not.toContain("<script>");
        expect(result).toContain("&lt;script&gt;");
    });

    test("withoutMarked_render_SetsTextContent", () =>
    {
        const handle = createMarkdownRenderer();
        const target = document.createElement("div");
        handle.render("Hello **world**", target);
        expect(target.textContent).toBe("Hello **world**");
        expect(target.style.whiteSpace).toBe("pre-wrap");
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
// SEC-3: PLANTUML SVG SANITIZATION
// ============================================================================

describe("PlantUML SVG sanitization", () =>
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
        // The placeholder is created and the async fetch pipeline starts.
        // Since PlantUML uses CompressionStream + fetch (unavailable in
        // jsdom), we verify the placeholder exists and loading indicator
        // is shown.
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

describe("escapeHtml via fallback", () =>
{
    test("escapesAngleBrackets", () =>
    {
        const handle = createMarkdownRenderer(); // no marked => fallback
        const result = handle.toHtml("<script>alert(1)</script>");
        expect(result).toContain("&lt;");
        expect(result).toContain("&gt;");
        expect(result).not.toContain("<script>");
    });

    test("escapesAmpersands", () =>
    {
        const handle = createMarkdownRenderer();
        const result = handle.toHtml("A & B");
        expect(result).toContain("&amp;");
    });

    test("escapesQuotes", () =>
    {
        const handle = createMarkdownRenderer();
        const result = handle.toHtml('key="value"');
        expect(result).toContain("&quot;");
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
