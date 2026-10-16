/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: DiagramEngine renders the embed's own content
 * 📜 PURPOSE: Proves FALLBACK-9 item 2. A render()-only embed such as
 * MarkdownRenderer was mounted by passing the literal string
 * "**Embedded content**". Every such embed on every diagram showed those
 * two words in place of what its author wrote. The content now comes
 * from options.content, and a missing one throws.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-187
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createDiagramEngine } from "./diagramengine";

type Globals = Record<string, unknown>;

let container: HTMLDivElement;
let engine: ReturnType<typeof createDiagramEngine>;
let rendered: string[];
let errors: unknown[];

/** A MarkdownRenderer stand-in: render(md, target) and nothing else. */
function stubMarkdownRenderer(): void
{
    (window as Globals)["createMarkdownRenderer"] =
        (): Record<string, unknown> =>
        {
            return {
                render: (md: string, target: HTMLElement): void =>
                {
                    rendered.push(md);
                    target.textContent = md;
                },
            };
        };
}

function addMarkdownEmbed(options: Record<string, unknown>): void
{
    engine.registerEmbeddableComponent("markdownrenderer", {
        factory: "createMarkdownRenderer",
        label: "Markdown Renderer",
        icon: "bi-file-richtext",
        category: "content",
        defaultOptions: {},
        defaultSize: { w: 200, h: 120 },
    });

    engine.addObject({
        id: "embed-under-test",
        presentation: {
            shape: "rectangle",
            bounds: { x: 0, y: 0, width: 200, height: 120 },
            style: {
                fill: { type: "solid", color: "#fff" },
                stroke: { color: "#000", width: 1 },
            },
            embed: { component: "markdownrenderer", options },
            layer: "default",
        },
    });
}

/**
 * Embeds mount from a requestAnimationFrame callback, so a refusal
 * arrives as an uncaught error rather than at the addObject call.
 */
function flushFrames(): Promise<void>
{
    return new Promise<void>((resolve) =>
    {
        requestAnimationFrame(() =>
        {
            requestAnimationFrame(() => resolve());
        });
    });
}

describe("DiagramEngine render() embeds", () =>
{
    beforeEach(() =>
    {
        rendered = [];
        errors = [];
        container = document.createElement("div");
        container.id = "de-nofallback-" + Math.random().toString(36).slice(2, 8);
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        engine = createDiagramEngine(container.id, {});

        window.addEventListener("error", onError);
    });

    afterEach(() =>
    {
        window.removeEventListener("error", onError);
        container.remove();
        delete (window as Globals)["createMarkdownRenderer"];
    });

    function onError(e: ErrorEvent): void
    {
        e.preventDefault();
        errors.push(e.error);
    }

    test("theStubIsTheOnlyRenderer_SoTheRenderPathIsUnderTest", async () =>
    {
        stubMarkdownRenderer();
        addMarkdownEmbed({ content: "# Real heading" });
        await flushFrames();

        expect(rendered.length).toBe(1);
    });

    test("theEmbedsOwnContentIsRendered_NotAnInventedString", async () =>
    {
        stubMarkdownRenderer();
        addMarkdownEmbed({ content: "# Real heading" });
        await flushFrames();

        expect(rendered[0]).toBe("# Real heading");
        expect(rendered[0]).not.toBe("**Embedded content**");
    });

    test("anEmptyContentIsHonoured_BecauseEmptyIsAnAnswer", async () =>
    {
        stubMarkdownRenderer();
        addMarkdownEmbed({ content: "" });
        await flushFrames();

        expect(rendered[0]).toBe("");
    });

    test("noContent_ThrowsNamingTheOptionToSet", async () =>
    {
        stubMarkdownRenderer();
        addMarkdownEmbed({});
        await flushFrames();

        expect(rendered.length).toBe(0);
        expect(errors.length).toBe(1);
        expect((errors[0] as Error).message).toMatch(/options\.content/);
        expect((errors[0] as Error).message).toMatch(/markdownrenderer/);
    });
});
