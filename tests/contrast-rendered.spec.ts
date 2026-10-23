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
 * WHAT IT STILL CANNOT SEE. Text over an image or a gradient — it reads
 * `background-color` only, so a gradient reads as the colour beneath it.
 * Text over an SVG `fill` painted by an ancestor. Anything that needs a
 * pointer, since no state is exercised: `:hover`, `:focus-visible` and
 * `:active` are invisible here. The first of those is real coverage the
 * token check DOES have, so the two instruments are complements and
 * neither replaces the other.
 */

import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
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
    considered: number; skipped: number; }
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

    const findings: Omit<Finding, "page" | "theme">[] = [];
    let considered = 0;
    let skipped = 0;

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
        if (cs.visibility === "hidden" || cs.display === "none"
            || Number(cs.opacity) === 0)
        { skipped += 1; continue; }

        // Rendered boxes rather than one bounding rect: an inline element
        // whose own box collapses can still paint text through its line
        // boxes, and a width/height test drops it.
        if (el.getClientRects().length === 0) { skipped += 1; continue; }

        considered += 1;

        const fg = parse(cs.color);
        if (fg[3] === 0) { continue; }

        // Walk up compositing until opaque. `document.body` is the floor;
        // if everything above it is transparent the page background is
        // what shows, so seed with white and let the walk overwrite it.
        let bg: [number, number, number, number] = [255, 255, 255, 1];
        const stack: number[][] = [];
        let node: HTMLElement | null = el;
        while (node)
        {
            const layer = parse(getComputedStyle(node).backgroundColor);
            if (layer[3] > 0) { stack.push(layer); }
            if (layer[3] >= 1) { break; }
            node = node.parentElement;
        }
        if (stack.length > 0)
        {
            bg = stack[stack.length - 1] as [number, number, number, number];
            for (let i = stack.length - 2; i >= 0; i -= 1)
            { bg = over(stack[i], bg); }
        }

        const solidFg = fg[3] < 1 ? over(fg, bg) : fg;
        const size = parseFloat(cs.fontSize);
        const weight = Number(cs.fontWeight) || 400;
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        const threshold = large ? 3 : 4.5;
        const r = ratio(solidFg, bg);

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

    return { findings, considered, skipped };
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
                const slug = `${theme}__${page.replace(/[\\/.]/g, "_")}.json`;
                writeFileSync(`${OUT_DIR}/${slug}`, JSON.stringify({
                    page, theme,
                    considered: result.considered,
                    skipped: result.skipped,
                    findings: result.findings.map(
                        (f) => ({ page, theme, ...f })),
                }));
            });
        }
    }
});
