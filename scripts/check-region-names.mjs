#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * File GUID: 9b2c7e41-3d58-4a06-8f17-5c0ae9d3b682
 */
/**
 * ⚓ CHECK: every scrolling region a component creates declares a name.
 *
 * DEBT-DUI-5, approach B of specs/2026-10-10-durable-anchors.prd.md. A canvas
 * anchor used to name a scrolling region by its INDEX in DOM order, and the
 * index moves: `isScrollable()` requires an element to be overflowing at the
 * time of the test, so a styled region whose content happens to fit is absent
 * from the list and every later index shifts. Same component, same version,
 * same session. A region that names itself cannot move.
 *
 * The check is STATIC, and that is a deliberate limit rather than an
 * oversight. The gate suite runs in jsdom, which has no layout and does not
 * load component stylesheets, so a mounted-DOM check cannot find a scrolling
 * region at all: `scrollHeight` and `clientHeight` are both zero and the
 * computed overflow is never the stylesheet's. So this reads the SCSS for
 * regions and the TypeScript for names.
 *
 * WHAT IT CANNOT SEE: it matches a region class to a `data-dui-region` call in
 * the same file, not to the same ELEMENT. A component that sets the attribute
 * on the wrong element passes here. Binding an attribute to an element needs
 * real layout, which is what tests/dynamic-ui.spec.ts is for.
 *
 * Run: node scripts/check-region-names.mjs
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const COMPONENTS = "components";

/**
 * Regions that cannot declare a name, with the reason each one cannot.
 *
 * Silence is a failure: a component that grows an unnameable scrolling region
 * and does not appear here fails the check until somebody writes down why. The
 * same discipline the fleet gate's NOT_MOUNTABLE list uses, for the same
 * reason — an exclusion is a claim, and a claim needs an argument.
 */
const UNNAMEABLE = {
    "conversation:pre": "A `pre` inside a rendered message. The CONTENT creates "
        + "it, not the component, so there is nothing to put an attribute on at "
        + "build time. Numbering them would be as unstable as the index this "
        + "work replaces: add a code block and every later number shifts.",
    "docviewer:pre": "A `pre` inside rendered document content. See "
        + "conversation:pre — content-created, so unnameable.",
    "helpdrawer:pre": "A `pre` inside rendered help content. See "
        + "conversation:pre — content-created, so unnameable.",
    "markdowneditor:pre": "A `pre` inside the rendered preview. See "
        + "conversation:pre — content-created, so unnameable.",
    "reasoningaccordion:pre": "A `pre` inside rendered reasoning text. See "
        + "conversation:pre — content-created, so unnameable.",
    "authcard:auth-main": "Page-level scaffolding the CONSUMING APPLICATION "
        + "provides, not AuthCard. The README says so explicitly, and the class "
        + "is part of the frozen Keycloak parity contract (ADR-138) that a "
        + "FreeMarker template mirrors verbatim. AuthCard never creates this "
        + "element, so it cannot label it.",
    "symbolpicker:symbolpicker-categories": "DEAD CSS, not a region. The tab "
        + "strip this styled was replaced by a `<select>`; the TypeScript "
        + "creates `symbolpicker-categories-wrap` holding a select element and "
        + "no `symbolpicker-categories` element exists. Recorded rather than "
        + "silently skipped, because the rule is deleted stylesheet, not "
        + "excluded region.",
};

/**
 * Components whose CSS class prefix is an abbreviation of their directory
 * name, so a region name derived mechanically would stutter.
 *
 * `promptmanager-list` inside `prompttemplatemanager` would publish
 * `prompttemplatemanager:promptmanager-list` in `capability-manifest.json`,
 * and a host would type that by hand. These names are PERSISTED in host
 * documents once an anchor records one, so the moment to decide is before the
 * first one is written and not after.
 *
 * Curated rather than inferred: `filter-panel` and `tree-pane` also differ
 * from their directory name and are proper region words. Only an abbreviation
 * of the component itself belongs here. CodeEditor's `cm-` is deliberately
 * absent — `cm-scroller` names CodeMirror's own element, and that is worth
 * saying.
 */
const CLASS_PREFIX_ALIASES = {
    auditlogviewer: "auditlog",
    dynamiccanvas: "dyncanvas",
    latexeditor: "le",
    markdowneditor: "mde",
    markdownrenderer: "md",
    prompttemplatemanager: "promptmanager",
    relationshipmanager: "rm",
    visualtableeditor: "vte",
};

/** Overflow values that make an element scroll its own content. */
const SCROLLS = /overflow(-x|-y)?\s*:\s*(auto|scroll)/;

/**
 * The elements a component's stylesheet gives a scrolling overflow.
 *
 * Walks brace depth rather than matching text, because the element a
 * declaration applies to is the innermost enclosing selector, and an `@media`
 * block is not a selector. The element styled by a descendant selector is its
 * LAST compound: `.a .b { overflow: auto }` scrolls `.b`.
 *
 * @param scss - Stylesheet source.
 * @returns Selectors that scroll, deduplicated.
 */
function scrollingSelectors(scss)
{
    const stack = [];
    const marked = new Map();
    let pending = "";
    let id = 0;

    for (const raw of scss.split("\n"))
    {
        const line = raw.split("//")[0];

        for (const ch of line)
        {
            if (ch === "{")
            {
                // The selector is what follows the last statement boundary,
                // not everything buffered since the last brace. Without the
                // `;` split, a file opening with `@use "..." as *;` had that
                // line glued to its first selector.
                const sel = pending.split(";").pop()?.trim()
                    .split("\n").pop()?.trim() ?? "";

                stack.push([sel, ++id]);
                pending = "";
            }
            else if (ch === "}")
            {
                stack.pop();
                pending = "";
            }
            else
            {
                pending += ch;
            }
        }

        if (!SCROLLS.test(line))
        {
            continue;
        }

        for (let i = stack.length - 1; i >= 0; i--)
        {
            if (!stack[i][0].startsWith("@"))
            {
                marked.set(stack[i][1], stack[i][0]);
                break;
            }
        }
    }

    const out = new Set();

    for (const sel of marked.values())
    {
        const last = sel.split(",")[0].trim().split(/\s+/).pop() ?? "";

        out.add(last.split(":")[0]);
    }

    return [...out].filter(Boolean);
}

/** A component's own source, excluding tests, manifests and glue. */
function sourceOf(dir)
{
    const path = join(COMPONENTS, dir);

    return readdirSync(path)
        .filter((f) => f.endsWith(".ts")
            && !f.endsWith(".test.ts")
            && !f.endsWith(".manifest.ts")
            && !f.endsWith(".conformance.ts"))
        .map((f) => readFileSync(join(path, f), "utf8"))
        .join("\n");
}

/**
 * The region names a component declares, read from its own source.
 *
 * Two spellings count, because components build DOM in two ways here: a
 * `setAttribute("data-dui-region", "...")` call, and the attribute written
 * into a markup template. MarkdownRenderer returns its diagram placeholder as
 * a string, so requiring the call form would have forced a rewrite to satisfy
 * the checker rather than the rule.
 *
 * @param ts - Component source.
 * @returns Declared names, qualified as `component:name`.
 */
function declaredNames(ts)
{
    const found = new Set();
    const forms = [
        /data-dui-region"\s*,\s*"([a-z0-9-]+:[a-z0-9-]+)"/g,
        /data-dui-region=\\?"([a-z0-9-]+:[a-z0-9-]+)\\?"/g,
    ];

    for (const re of forms)
    {
        let m;

        while ((m = re.exec(ts)) !== null)
        {
            found.add(m[1]);
        }
    }

    return [...found];
}

/** The `regions` array a migrated component's manifest declares. */
function manifestRegions(dir)
{
    const path = join(COMPONENTS, dir, `${dir}.manifest.ts`);

    if (!existsSync(path))
    {
        return null;
    }

    const src = readFileSync(path, "utf8");
    const block = /regions\s*:\s*\[([^\]]*)\]/.exec(src);

    if (!block)
    {
        return [];
    }

    return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

const problems = [];
const unusedExclusions = new Set(Object.keys(UNNAMEABLE));
let regionCount = 0;
let namedCount = 0;

for (const dir of readdirSync(COMPONENTS).sort())
{
    const scssPath = join(COMPONENTS, dir, `${dir}.scss`);

    if (!existsSync(scssPath))
    {
        continue;
    }

    const selectors = scrollingSelectors(readFileSync(scssPath, "utf8"));

    if (selectors.length === 0)
    {
        continue;
    }

    const ts = sourceOf(dir);
    const declared = declaredNames(ts);
    const manifest = manifestRegions(dir);
    const expected = [];

    for (const sel of selectors)
    {
        regionCount++;

        // The name is the class with the component's own prefix removed, so
        // `.docviewer-content` is `content` and `.mde-display` is `display`.
        // A bare element selector has no class to derive a name from.
        const cls = sel.startsWith(".") ? sel.slice(1) : sel;
        const alias = CLASS_PREFIX_ALIASES[dir];
        const strip = [`${dir}-`, alias ? `${alias}-` : null]
            .find((p) => p && cls.startsWith(p));
        const stripped = strip ? cls.slice(strip.length) : cls;
        const key = `${dir}:${cls}`;
        const qualified = `${dir}:${stripped}`;

        if (UNNAMEABLE[key] || UNNAMEABLE[qualified])
        {
            unusedExclusions.delete(UNNAMEABLE[key] ? key : qualified);

            if ((UNNAMEABLE[key] ?? UNNAMEABLE[qualified]).length < 40)
            {
                problems.push(`${dir}: the exclusion for "${cls}" is too short `
                    + "to be a reason");
            }

            continue;
        }

        expected.push(qualified);

        if (declared.includes(qualified))
        {
            namedCount++;
        }
        else
        {
            problems.push(`${dir}: "${sel}" scrolls and declares no name — `
                + `expected data-dui-region="${qualified}"`);
        }
    }

    if (manifest === null || expected.length === 0)
    {
        continue;
    }

    for (const name of expected)
    {
        if (!manifest.includes(name))
        {
            problems.push(`${dir}: manifest omits region "${name}" — a host `
                + "cannot anchor to a region it is not told about");
        }
    }

    for (const name of manifest)
    {
        if (!expected.includes(name))
        {
            problems.push(`${dir}: manifest declares region "${name}", which `
                + "no scrolling selector produces");
        }
    }
}

if (regionCount === 0)
{
    console.log("  FAIL: no scrolling regions found at all — the check would "
        + "pass vacuously");
    process.exit(1);
}

for (const left of unusedExclusions)
{
    problems.push(`the exclusion for "${left}" matches no region any more — `
        + "delete it, or the list stops describing the code");
}

if (problems.length > 0)
{
    console.log(`  FAIL: ${problems.length} region problem(s)\n`);

    for (const p of problems)
    {
        console.log(`    ${p}`);
    }

    console.log("\n  A region named by its position moves when an earlier");
    console.log("  sibling stops overflowing (DEBT-DUI-5). Give the element");
    console.log('  data-dui-region="<component>:<name>" and declare the name');
    console.log("  in the manifest. If it cannot be named, say why in");
    console.log("  UNNAMEABLE in this script.");
    process.exit(1);
}

console.log(`  PASS: ${namedCount} of ${regionCount} scrolling region(s) `
    + `declare a name, ${Object.keys(UNNAMEABLE).length} excluded with a `
    + "written reason");
