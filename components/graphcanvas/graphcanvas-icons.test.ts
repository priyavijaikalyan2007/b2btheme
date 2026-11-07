/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GraphCanvas node icons from class strings
 *    (specs/bugreports/2026-11-06-inlinetoolbar-contextmenu-icon-classes.md,
 *    "GraphCanvas"). jsdom computes no pseudo-element or mask styles, so the
 *    page's stylesheets are stood in for by getComputedStyle; the real
 *    stylesheets are checked in tests/icon-packs-components.spec.ts.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createGraphCanvas } from "./graphcanvas";
import type { GraphCanvas, GraphNode } from "./graphcanvas";

interface FakeIconCss
{
    content?: string;
    fontFamily?: string;
    fontWeight?: string;
    mask?: string;
    background?: string;
}

/** What the page's stylesheets would compute, by the probe's class string. */
const css = new Map<string, FakeIconCss>();
let container: HTMLElement;
let gc: GraphCanvas | null = null;

function fakeStyles(): void
{
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((el, pseudo) =>
    {
        const rule = css.get((el as Element).className);
        if (!rule) { return real(el, pseudo); }
        if (pseudo)
        {
            return { content: rule.content ?? "none", fontFamily: rule.fontFamily ?? "Inter",
                fontWeight: rule.fontWeight ?? "400" } as CSSStyleDeclaration;
        }
        return { maskImage: rule.mask ?? "none", backgroundImage: rule.background ?? "none",
            getPropertyValue: () => "" } as unknown as CSSStyleDeclaration;
    });
}

function render(nodes: GraphNode[]): SVGElement
{
    gc = createGraphCanvas({ container, nodes, edges: [] });
    return container.querySelector("svg.gc-svg") as SVGElement;
}

function node(svg: SVGElement, id: string): Element
{
    return svg.querySelector(`[data-node-id="${id}"]`)!;
}

beforeEach(() =>
{
    container = document.createElement("div");
    document.body.appendChild(container);
    fakeStyles();
});

afterEach(() =>
{
    gc?.destroy();
    gc = null;
    container.remove();
    css.clear();
    vi.restoreAllMocks();
});

describe("GraphCanvas node icons", () =>
{
    test("bareName_DrawsBootstrapGlyph_AsBefore", () =>
    {
        css.set("bi bi-bullseye", { content: "\"\"", fontFamily: "bootstrap-icons" });
        const text = node(render([{ id: "a", label: "A", type: "t", icon: "bullseye" }]), "a").querySelector("text")!;

        expect(text.getAttribute("font-family")).toBe("bootstrap-icons");
        expect(text.hasAttribute("font-weight")).toBe(false);
        expect(text.textContent).toBe("");
    });

    test("fontAwesomeClass_DrawsGlyphInItsOwnFontAndWeight", () =>
    {
        css.set("fa-solid fa-user", { content: "\"\"", fontFamily: "\"Font Awesome 6 Free\"", fontWeight: "900" });
        const svg = render([{ id: "a", label: "A", type: "t", icon: "  fa-solid   fa-user " }]);
        const text = node(svg, "a").querySelector("text")!;

        expect(text.getAttribute("font-family")).toBe("\"Font Awesome 6 Free\"");
        expect(text.getAttribute("font-weight")).toBe("900");
        expect(text.textContent).toBe("");
    });

    test("colourPackClass_DrawsItsImage", () =>
    {
        css.set("fluent-ui-table-16-color", { background: "url(\"https://cdn.test/fluent-ui/table-16-color.svg\")" });
        const image = node(render([{ id: "a", label: "A", type: "t", icon: "fluent-ui-table-16-color" }]), "a")
            .querySelector("image.gc-node-icon")!;

        expect(image.getAttribute("href")).toBe("https://cdn.test/fluent-ui/table-16-color.svg");
        expect([image.getAttribute("width"), image.getAttribute("height")]).toEqual(["14", "14"]);
    });

    test("monochromePackClass_DrawsAnAlphaMaskOverTheTextColour_OneMaskPerImage", () =>
    {
        css.set("fluent-ui-person-16-regular", { mask: "url(\"https://cdn.test/fluent-ui/person-16-regular.svg\")" });
        const svg = render([
            { id: "a", label: "A", type: "t", icon: "fluent-ui-person-16-regular" },
            { id: "b", label: "B", type: "t", icon: "fluent-ui-person-16-regular" },
        ]);
        const masks = svg.querySelectorAll("defs mask");
        const rects = [node(svg, "a"), node(svg, "b")].map((n) => n.querySelector("rect.gc-node-icon")!);

        expect(masks).toHaveLength(1);
        expect(masks[0].getAttribute("style")).toBe("mask-type:alpha");
        expect(masks[0].querySelector("image")!.getAttribute("href"))
            .toBe("https://cdn.test/fluent-ui/person-16-regular.svg");
        expect(rects.map((r) => r.getAttribute("mask"))).toEqual([`url(#${masks[0].id})`, `url(#${masks[0].id})`]);
        expect(rects[0].getAttribute("fill")).toBeTruthy();
    });

    test("classWithNoStylesheetYet_DrawsNothing_ThenResolvesOnceItLoads", () =>
    {
        const icon = "fluent-ui-late-16-regular";
        let svg = render([{ id: "a", label: "A", type: "t", icon }]);
        expect(node(svg, "a").querySelector(".gc-node-icon, text[font-family]")).toBeNull();
        gc!.destroy();

        css.set(icon, { mask: "url(\"https://cdn.test/late.svg\")" });
        svg = render([{ id: "a", label: "A", type: "t", icon }]);
        expect(node(svg, "a").querySelector("rect.gc-node-icon")).not.toBeNull();
    });
});
