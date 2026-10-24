/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: what text actually renders against what background. DEBT-VR-11.
 *
 * WHY THIS EXISTS, AND WHY `check-contrast.py` DOES NOT COVER IT
 * --------------------------------------------------------------
 * `scripts/check-contrast.py` is arithmetic over NAMED TOKEN PAIRS. It is
 * correct about what it measures and says so in its own docstring, which
 * lists three things it cannot see — including "component-level
 * translucent backgrounds — 73 of them, `rgba()` literals in component
 * SCSS that no theme token names".
 *
 * It has a fourth blind spot that nothing had written down: **a colour
 * that is not a token at all.** `components/gauge/gauge.scss` paints
 * `.gauge-ring-value` with `color: $gray-900` — a Sass variable, resolved
 * at compile time to one value, with no dark-mode block anywhere in the
 * file. In dark mode that is near-black text on a dark surface. Every
 * gate passed, because no token pair was involved: the stylesheet never
 * mentions `--theme-text-primary` here, so there was nothing for a
 * token-pair check to compare.
 *
 * The defect was reported from production on 2026-10-22 in the app's own
 * wizard (an inline `color:#1e293b`), and the same shape turned out to be
 * in this library.
 *
 * WHAT THIS DOES INSTEAD. It renders every demo page in both themes and
 * asks the browser what each piece of text is actually painted in, and
 * what is actually behind it. No model of Sass, no model of the cascade,
 * no list of tokens — `getComputedStyle` and the DOM.
 *
 * THE HARD PART IS THE BACKGROUND. `getComputedStyle(el).backgroundColor`
 * is `rgba(0,0,0,0)` for most text-bearing elements, so the effective
 * background is whatever shows through: each translucent ancestor
 * composited onto the one beneath it, bottom-up, until something opaque.
 * Getting this wrong reports every element inside a hover tint as a
 * failure, which is why a naive version of this check is worse than none.
 *
 * THE SKIP LIST, AUDITED 2026-10-23. A skip is where an audit hides its
 * own blind spots, so each one is counted by reason and the totals were
 * read rather than assumed. Across 274 page/theme runs, 15,446 skips:
 *
 *   14,056  no rendered box   — almost entirely `<option>`. A native
 *                               select popup is drawn by the operating
 *                               system, not from this stylesheet, so
 *                               there is nothing here to measure OR fix.
 *    1,310  display:none      — `<script>` and `<title>`.
 *       64  opacity:0         — hover-revealed controls, e.g. a drag
 *                               handle. Covered by the hover limitation
 *                               below rather than by this skip.
 *       14  visibility:hidden
 *        2  transparent text
 *
 * The one skip that was NOT legitimate is already gone: `aria-hidden`
 * subtrees were skipped until 2026-10-23, which removed 1,092 visible
 * elements and three real defects from the population.
 *
 * SVG FILLS, ADDED 2026-10-24. The climb above reads `background-color`,
 * and an SVG shape paints with `fill`. A diagram label lives in a
 * `<foreignObject>` that is a SIBLING of the shape it sits on, not a
 * descendant of it, so no amount of climbing reaches the shape: every
 * label on the canvas was measured against the canvas. That made 25 of
 * the 79 worst findings wrong in their background, and it hid real ones
 * — near-white text on a white shape fill, at 1.10, in dark mode.
 *
 * Shapes are now composited like any other layer, and a paint server is
 * resolved rather than guessed: a gradient is measured against EVERY
 * stop and judged on the worst, and a pattern contributes only when its
 * marks cover at least half the tile. The diagram grid is one 1.2px dot
 * per 20x20 tile, about one percent ink; calling that dot "the
 * background" would have manufactured a failure on every label.
 *
 * `svgComposited` counts how often a fill actually contributed. A
 * helper that stops matching leaves a clean-looking run behind it, so
 * the report fails loudly on zero. ADR-196.
 *
 * WHAT IT STILL CANNOT SEE. Text over a raster image. Anything that
 * needs a pointer, since no state is exercised: `:hover`,
 * `:focus-visible` and `:active` are invisible here. The last of those
 * is real coverage the token check DOES have, so the two instruments
 * are complements and neither replaces the other.
 */

import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { basename } from "node:path";

/** Every tracked demo page, the same population as demo-pages.spec.ts. */
const PAGES: string[] = execFileSync(
    "git", ["ls-files", "demo/*.html", "demo/**/*.html"],
    { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((p) => !basename(p).startsWith("_"));

type Finding = {
    page: string;
    theme: string;
    path: string;
    text: string;
    fg: string;
    bg: string;
    ratio: number;
    threshold: number;
};

/**
 * The walker, serialised into the page.
 *
 * Returns one row per text-bearing element that fails WCAG AA, plus the
 * number of elements considered and skipped — a check that silently
 * examines nothing passes, and ADR-196 is the entry about that.
 */
function auditScript(): { findings: Omit<Finding, "page" | "theme">[];
    considered: number; skipped: number;
    skipReasons: Record<string, number>;
    skipSamples: Record<string, string>;
    unmeasurable: { path: string; text: string; reason: string }[];
    svgComposited: number; }
{
    const parse = (c: string): [number, number, number, number] =>
    {
        const m = c.match(/rgba?\(([^)]+)\)/);
        if (!m) { return [0, 0, 0, 0]; }
        const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
        return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0, p[3] === undefined ? 1 : p[3]];
    };

    // `over` composites `top` (which may be translucent) onto `under`.
    const over = (top: number[], under: number[]): [number, number, number, number] =>
    {
        const a = top[3];
        return [
            top[0] * a + under[0] * (1 - a),
            top[1] * a + under[1] * (1 - a),
            top[2] * a + under[2] * (1 - a),
            1,
        ];
    };

    const luminance = (rgb: number[]): number =>
    {
        const f = (v: number): number =>
        {
            const s = v / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    };

    const ratio = (a: number[], b: number[]): number =>
    {
        const la = luminance(a);
        const lb = luminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    };

    const pathOf = (el: Element): string =>
    {
        const parts: string[] = [];
        let node: Element | null = el;
        while (node && parts.length < 4)
        {
            const cls = typeof node.className === "string" && node.className
                ? "." + node.className.trim().split(/\s+/).slice(0, 2).join(".")
                : "";
            parts.unshift(node.tagName.toLowerCase() + cls);
            node = node.parentElement;
        }
        return parts.join(" > ");
    };

    const SVG_NS = "http://www.w3.org/2000/svg";
    const SHAPES = "rect,circle,ellipse,polygon,path";
    const GROUPS = new Set(["g", "a", "switch", "svg"]);

    /**
     * The colours a paint server can present, worst case included.
     *
     * A `fill` of `url(#id)` is a gradient or a pattern, so the text over
     * it has no single background. Guessing one is how an audit invents a
     * pass; refusing to look is how it invents a blind spot. Neither is
     * acceptable, so each is resolved to the SET of colours it can show
     * and every one of them is measured.
     *
     *   gradient — every stop, at its own `stop-opacity`. If the text
     *              fails against any stop it fails somewhere on the run.
     *   pattern  — a tile is mostly its backdrop unless its marks cover
     *              it. The diagram grid is one 1.2px dot per 20x20 tile,
     *              about 1 percent ink, and treating that dot as "the
     *              background" would manufacture a failure on every
     *              label on the canvas. Below half coverage the layer is
     *              texture and contributes nothing; at or above it, the
     *              marks are measured like gradient stops.
     *
     * `null` means the reference does not resolve. That is a broken
     * document, not a colour, and it is reported rather than skipped.
     */
    const paintServer = (ref: string): number[][] | null =>
    {
        const id = ref.replace(/^url\(["']?#?/, "").replace(/["']?\)$/, "");
        const def = document.getElementById(id);
        if (!def) { return null; }

        const tag = def.tagName.toLowerCase();

        if (tag === "lineargradient" || tag === "radialgradient")
        {
            const stops = Array.from(def.querySelectorAll("stop"));
            if (stops.length === 0) { return null; }
            return stops.map((st) =>
            {
                const cs = getComputedStyle(st);
                const c = parse(cs.stopColor);
                const o = cs.stopOpacity === "" ? 1 : Number(cs.stopOpacity);
                return [c[0], c[1], c[2], c[3] * o];
            });
        }

        if (tag === "pattern")
        {
            const tw = Number(def.getAttribute("width") ?? 0);
            const th = Number(def.getAttribute("height") ?? 0);
            if (tw <= 0 || th <= 0) { return null; }

            let ink = 0;
            const marks: number[][] = [];
            for (const kid of Array.from(def.children))
            {
                const kt = kid.tagName.toLowerCase();
                if (kt === "circle")
                {
                    const r = Number(kid.getAttribute("r") ?? 0);
                    ink += Math.PI * r * r;
                }
                else if (kt === "rect")
                {
                    ink += Number(kid.getAttribute("width") ?? 0)
                        * Number(kid.getAttribute("height") ?? 0);
                }
                else { ink += tw * th; }

                const kcs = getComputedStyle(kid);
                const c = parse(kcs.fill === "none" ? kcs.stroke : kcs.fill);
                const o = kcs.opacity === "" ? 1 : Number(kcs.opacity);
                marks.push([c[0], c[1], c[2], c[3] * o]);
            }

            if (ink / (tw * th) < 0.5) { return []; }
            return marks;
        }

        return null;
    };

    /**
     * The fills painted beneath `node` by its own preceding siblings.
     *
     * An SVG shape paints with `fill`, not `background-color`, so a climb
     * that reads `background-color` alone walks straight past the
     * rectangle a diagram label sits on and reports the canvas behind it.
     * A `<foreignObject>` label and the shape it sits on are SIBLINGS
     * under one `<g>`, not ancestor and descendant, so no amount of
     * climbing finds the shape. A sibling is also often a `<g>` wrapping
     * the shape rather than the shape itself, which is why this descends.
     *
     * Each returned LAYER is a list of the colours that layer can show:
     * one for a solid fill, several for a gradient. Topmost first, to
     * match the compositing stack.
     */
    const fillsUnder = (node: Element, box: DOMRect): number[][][] | "broken" =>
    {
        const parent = node.parentElement;
        if (!parent || parent.namespaceURI !== SVG_NS) { return []; }

        const kids = Array.from(parent.children);
        const self = kids.indexOf(node);

        // Reverse document order: the last shape painted is the topmost,
        // and the stack this feeds is ordered top to bottom.
        const candidates: Element[] = [];
        for (let i = self - 1; i >= 0; i -= 1)
        {
            const sib = kids[i];
            if (sib.namespaceURI !== SVG_NS) { continue; }
            if (GROUPS.has(sib.tagName.toLowerCase()))
            {
                const inner = Array.from(sib.querySelectorAll(SHAPES));
                for (let k = inner.length - 1; k >= 0; k -= 1)
                { candidates.push(inner[k]); }
            }
            else { candidates.push(sib); }
        }

        const out: number[][][] = [];
        for (const sh of candidates)
        {
            if (!sh.matches(SHAPES)) { continue; }

            const r = sh.getBoundingClientRect();
            const overlaps = r.left < box.right && r.right > box.left
                && r.top < box.bottom && r.bottom > box.top;
            if (!overlaps) { continue; }

            const scs = getComputedStyle(sh);
            const fill = scs.fill;
            if (!fill || fill === "none") { continue; }

            const fo = scs.fillOpacity === "" ? 1 : Number(scs.fillOpacity);
            const op = scs.opacity === "" ? 1 : Number(scs.opacity);

            let colours: number[][];
            if (fill.indexOf("url(") === 0)
            {
                const served = paintServer(fill);
                if (served === null) { return "broken"; }
                if (served.length === 0) { continue; }
                colours = served;
            }
            else { colours = [parse(fill)]; }

            const layer = colours
                .map((c) => [c[0], c[1], c[2], c[3] * fo * op])
                .filter((c) => c[3] > 0);
            if (layer.length === 0) { continue; }

            out.push(layer);
            if (layer.every((c) => c[3] >= 1)) { break; }
        }
        return out;
    };

    const findings: Omit<Finding, "page" | "theme">[] = [];
    const unmeasurable: { path: string; text: string; reason: string }[] = [];
    const skipReasons: Record<string, number> = {};
    const skipSamples: Record<string, string> = {};
    let considered = 0;
    let skipped = 0;
    let svgComposited = 0;

    const skip = (why: string, el: Element): void =>
    {
        skipped += 1;
        skipReasons[why] = (skipReasons[why] ?? 0) + 1;
        if (!skipSamples[why])
        {
            skipSamples[why] = `${el.tagName.toLowerCase()}`
                + `${typeof el.className === "string" && el.className
                    ? "." + el.className.trim().split(/\s+/)[0] : ""}`
                + ` :: ${(el.textContent ?? "").trim().slice(0, 30)}`;
        }
    };

    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*")))
    {
        // Only elements with their OWN text. A wrapper inherits its
        // child's problem and would report the same defect twice.
        const own = Array.from(el.childNodes).some(
            (n) => n.nodeType === 3 && (n.textContent ?? "").trim().length > 0);
        if (!own) { continue; }

        // `aria-hidden="true"` is NOT skipped, and the first version of
        // this walker skipped it. It means "not exposed to assistive
        // technology", which is a different claim from "not visible" —
        // CodeMirror marks its line-number gutter aria-hidden because
        // the numbers are redundant to a screen reader, and a sighted
        // reader still reads them. Measured there: #64748b on #1e293b,
        // 3.07 against a 4.5 floor, invisible to this audit for as long
        // as the skip stood.
        const cs = getComputedStyle(el);
        if (cs.display === "none") { skip("display:none", el); continue; }
        if (cs.visibility === "hidden") { skip("visibility:hidden", el); continue; }
        if (Number(cs.opacity) === 0) { skip("opacity:0", el); continue; }

        // Rendered boxes rather than one bounding rect: an inline element
        // whose own box collapses can still paint text through its line
        // boxes, and a width/height test drops it.
        if (el.getClientRects().length === 0)
        { skip("no rendered box", el); continue; }

        considered += 1;

        const fg = parse(cs.color);
        if (fg[3] === 0) { skip("transparent text", el); continue; }

        // Walk up compositing until opaque. `document.body` is the floor;
        // if everything above it is transparent the page background is
        // what shows, so seed with white and let the walk overwrite it.
        // Each stack entry is a LAYER, and a layer is the list of colours
        // it can present: one for a solid, several for a gradient's stops.
        const stack: number[][][] = [];
        const box = el.getBoundingClientRect();
        let node: Element | null = el;
        let broken = false;
        let floor = false;
        while (node)
        {
            const layer = parse(getComputedStyle(node).backgroundColor);
            if (layer[3] > 0) { stack.push([layer]); }
            if (layer[3] >= 1) { break; }

            const fills = fillsUnder(node, box);
            if (fills === "broken") { broken = true; break; }
            for (const f of fills)
            {
                stack.push(f);
                svgComposited += 1;
                if (f.every((c) => c[3] >= 1)) { floor = true; }
            }
            if (floor) { break; }

            node = node.parentElement;
        }

        // A `fill="url(#id)"` whose target is not in the document is a
        // broken reference, not a colour. The browser paints nothing and
        // this instrument says so rather than measuring the void.
        if (broken) { unmeasurable.push({ path: pathOf(el),
            text: (el.textContent ?? "").trim().slice(0, 40),
            reason: "unresolved paint server" }); continue; }

        // Enumerate what the background can actually be. One variant for
        // ordinary text; a handful where a gradient is involved. The
        // element is judged on its WORST variant, because text that fails
        // at one end of a gradient fails on the page.
        let variants: number[][] = [[255, 255, 255, 1]];
        if (stack.length > 0)
        {
            variants = stack[stack.length - 1];
            for (let i = stack.length - 2; i >= 0; i -= 1)
            {
                const next: number[][] = [];
                for (const top of stack[i])
                {
                    for (const under of variants)
                    { next.push(over(top, under)); }
                }
                variants = next;
                if (variants.length > 64)
                {
                    unmeasurable.push({ path: pathOf(el),
                        text: (el.textContent ?? "").trim().slice(0, 40),
                        reason: "more than 64 background variants" });
                    variants = [];
                    break;
                }
            }
        }
        if (variants.length === 0) { continue; }

        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const threshold = large ? 3 : 4.5;

        let bg = variants[0] as [number, number, number, number];
        let r = Infinity;
        for (const v of variants)
        {
            const solid = fg[3] < 1 ? over(fg, v) : fg;
            const candidate = ratio(solid, v);
            if (candidate < r) { r = candidate; bg = v as [number, number, number, number]; }
        }

        if (r < threshold)
        {
            findings.push({
                path: pathOf(el),
                text: (el.textContent ?? "").trim().slice(0, 40),
                fg: cs.color,
                bg: `rgb(${bg.slice(0, 3).map(Math.round).join(", ")})`,
                ratio: Math.round(r * 100) / 100,
                threshold,
            });
        }
    }

    return { findings, considered, skipped, skipReasons, skipSamples,
        unmeasurable, svgComposited };
}

/**
 * Per-test output, one file each.
 *
 * A module-level array looks like it aggregates and does not: Playwright
 * runs workers in separate processes, each with its own copy of this
 * module, so an `afterAll` in one worker sees only that worker's
 * findings and writes a total that is quietly too small. The shape of a
 * count that stops measuring its population, from inside the instrument
 * built to find them. One file per page and theme, aggregated by
 * `scripts/contrast-report.mjs`, is parallel-safe by construction.
 */
const OUT_DIR = "coverage/contrast";

test.describe("rendered text contrast", () =>
{
    test("the page list is not empty", () =>
    {
        expect(PAGES.length).toBeGreaterThan(100);
    });

    for (const theme of ["light", "dark"] as const)
    {
        for (const page of PAGES)
        {
            test(`${theme} — ${basename(page)}`, async ({ page: bp }) =>
            {
                // The dark rules are written
                // `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) }`,
                // so the attribute ALONE selects nothing. Emulating the
                // media query is what makes this test measure dark mode
                // rather than light mode with a different attribute.
                await bp.emulateMedia({ colorScheme: theme });
                await bp.goto("/" + page, { waitUntil: "load" });
                await bp.evaluate((t: string) =>
                {
                    document.documentElement.setAttribute("data-bs-theme", t);
                    document.documentElement.setAttribute("data-theme", t);
                }, theme);
                await bp.waitForTimeout(350);

                const result = await bp.evaluate(auditScript);

                // A page that examined nothing is not a passing page.
                expect(result.considered,
                    `${page} (${theme}) examined no text`).toBeGreaterThan(0);

                mkdirSync(OUT_DIR, { recursive: true });

                // Delete the AGGREGATE the moment a fresh run starts
                // writing. It is produced by scripts/contrast-report.mjs
                // and I read it twice without regenerating it, reporting
                // a fix as having no effect when it had already worked.
                // A stale summary beside fresh data is the defect this
                // whole audit exists to find; it cannot sit there now.
                rmSync("coverage/contrast-rendered.json", { force: true });
                const slug = `${theme}__${page.replace(/[\\/.]/g, "_")}.json`;
                writeFileSync(`${OUT_DIR}/${slug}`, JSON.stringify({
                    page, theme,
                    considered: result.considered,
                    skipped: result.skipped,
                    skipReasons: result.skipReasons,
                    skipSamples: result.skipSamples,
                    svgComposited: result.svgComposited,
                    unmeasurable: result.unmeasurable.map(
                        (u) => ({ page, theme, ...u })),
                    findings: result.findings.map(
                        (f) => ({ page, theme, ...f })),
                }));
            });
        }
    }
});
