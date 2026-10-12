#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ CHECK: every API name the documentation publishes must exist.
 *
 * DEBT-DOC-1 (ADR-166). `scripts/generate-docs.js` built each component's
 * published "Exports" line by running `/(?:class|function)\s+\w+/` over its
 * README PROSE, so a sentence containing either word became an API name. Of
 * the 54 names it published across 32 components, exactly ONE was real. The
 * quick reference listed `class on` 17 times and `function greet` twice, and
 * `greet` is not a function this repository has.
 *
 * The generator now reads the component's source. This check exists so it
 * cannot drift back, and it deliberately does NOT reuse the generator's
 * extractors, because a check that shares its oracle with the thing it
 * checks passes by construction. It uses the BUILT ARTEFACTS instead:
 *
 *   - an `Exports:` name must be declared in `dist/<c>/<c>.d.ts`, which tsc
 *     writes from the real export keywords
 *   - a `Globals:` name must appear in the shipped bundle `dist/<c>/<c>.js`,
 *     which is what a CDN consumer actually loads
 *
 * WHAT IT CANNOT SEE: it asserts a published name exists, not that every
 * name that exists is published. A component that under-reports its surface
 * passes here. It also cannot run before a build, since dist is its oracle.
 * And it catches a fabricated name only when nothing of that name exists:
 * reverting the generator to the prose regex fails 37 of the 54 names it
 * emits, while the other 17 are prose words such as "names" or "mode" that
 * collide with a real declaration somewhere in that component's d.ts. That
 * is enough — the check's job is to stop the generator drifting back, and 37
 * failures fail the suite — but it is not a claim that every fabricated name
 * is detectable this way.
 *
 * Run: node scripts/check-published-api.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const QUICK_REF = join("docs", "AGENT_QUICK_REF.md");
const DIST = join("dist", "components");

/** Parse the quick reference into { component, globals[], exports[] }. */
function parsePublished(md)
{
    const blocks = [];
    let current = null;
    for (const line of md.split("\n"))
    {
        const heading = line.match(/^### ([a-z0-9]+)\s*$/);
        if (heading)
        {
            current = { name: heading[1], globals: [], exports: [] };
            blocks.push(current);
            continue;
        }
        if (!current) { continue; }
        const globals = line.match(/^- Globals: (.+)$/);
        if (globals && globals[1].trim() !== "none")
        {
            for (const m of globals[1].matchAll(/`([A-Za-z_$][\w$]*)\(\)`/g))
            {
                current.globals.push(m[1]);
            }
            continue;
        }
        const exports = line.match(/^- Exports: (.+)$/);
        if (exports && exports[1].trim() !== "none")
        {
            for (const m of exports[1].matchAll(/`(\w+) ([A-Za-z_$][\w$]*)`/g))
            {
                current.exports.push({ kind: m[1], name: m[2] });
            }
        }
    }
    return blocks.filter(b => b.globals.length || b.exports.length);
}

function main()
{
    if (!existsSync(QUICK_REF))
    {
        console.error(`  FAIL: ${QUICK_REF} not found`);
        process.exit(1);
    }

    const blocks = parsePublished(readFileSync(QUICK_REF, "utf8"));
    if (blocks.length === 0)
    {
        console.error("  FAIL: no component publishes an API name — the "
            + "quick reference lost its Globals and Exports lines");
        process.exit(1);
    }

    let names = 0;
    const problems = [];

    for (const b of blocks)
    {
        const dts = join(DIST, b.name, `${b.name}.d.ts`);
        const js = join(DIST, b.name, `${b.name}.js`);

        for (const e of b.exports)
        {
            names += 1;
            if (!existsSync(dts))
            {
                problems.push(`${b.name}: publishes "${e.kind} ${e.name}" `
                    + `but ${dts} does not exist`);
                continue;
            }
            const declared = new RegExp(
                `\\b(?:class|function|interface|type|const|enum|let|var)\\s+`
                + `${e.name}\\b`
            );
            if (!declared.test(readFileSync(dts, "utf8")))
            {
                problems.push(`${b.name}: publishes "${e.kind} ${e.name}" `
                    + `but ${b.name}.d.ts declares no such name`);
            }
        }

        for (const g of b.globals)
        {
            names += 1;
            if (!existsSync(js))
            {
                problems.push(`${b.name}: publishes the global "${g}" but `
                    + `${js} does not exist`);
                continue;
            }
            if (!new RegExp(`\\b${g}\\b`).test(readFileSync(js, "utf8")))
            {
                problems.push(`${b.name}: publishes the global "${g}" but `
                    + `the shipped bundle never mentions it`);
            }
        }
    }

    if (problems.length > 0)
    {
        console.error(`  FAIL: ${problems.length} published API name(s) do `
            + "not exist (DEBT-DOC-1)");
        for (const p of problems.slice(0, 20))
        {
            console.error(`    - ${p}`);
        }
        if (problems.length > 20)
        {
            console.error(`    … and ${problems.length - 20} more`);
        }
        process.exit(1);
    }

    console.log(`  PASS: ${names} published API name(s) across `
        + `${blocks.length} components all exist in the built artefacts`);
}

main();
