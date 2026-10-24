/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TOOL: aggregates the rendered-contrast run. DEBT-VR-11.
 *
 * `tests/contrast-rendered.spec.ts` writes one file per page and theme
 * because Playwright workers are separate processes: a module-level
 * array in the spec looks like it aggregates and silently holds one
 * worker's share. This reads them all back.
 *
 * Usage: node scripts/contrast-report.mjs [--verify]
 *
 * `--verify` is the GATE. DEBT-VR-11 brought the rendered fleet to zero
 * elements below 3.0 — everything legible — and the 3.0 floor is what
 * this holds. It is not 4.5: 182 elements sit between 3.0 and 4.5 and
 * are recorded in the tracker with their ratios, because closing that
 * band is a design argument and this is a regression stop.
 *
 * IT FAILS ON A MISSING OR PARTIAL RUN (ADR-196). A gate that passes
 * because nothing was measured has not been written. The expected page
 * count comes from git, doubled for the two themes, and anything short
 * of it is a failure rather than a smaller number.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename } from "node:path";

const DIR = "coverage/contrast";

export function aggregate()
{
    if (!existsSync(DIR)) { return null; }

    const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
    const findings = [];
    const unmeasurable = [];
    const exempt = [];
    let considered = 0;
    let skipped = 0;
    let svgComposited = 0;

    for (const file of files)
    {
        const row = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8"));
        considered += row.considered;
        skipped += row.skipped;
        svgComposited += row.svgComposited ?? 0;
        findings.push(...row.findings);
        unmeasurable.push(...(row.unmeasurable ?? []));
        exempt.push(...(row.exempt ?? []));
    }

    return { runs: files.length, considered, skipped, svgComposited,
        findings, unmeasurable, exempt };
}

/** The 3.0 regression floor. See the header. */
const FLOOR = 3.0;

function expectedRuns()
{
    const pages = execFileSync(
        "git", ["ls-files", "demo/*.html", "demo/**/*.html"],
        { encoding: "utf8" })
        .split("\n")
        .filter(Boolean)
        .filter((p) => !basename(p).startsWith("_"));
    return pages.length * 2;
}

function verify(result)
{
    const want = expectedRuns();
    let ok = true;

    if (result.runs !== want)
    {
        console.error(`PARTIAL RUN: ${result.runs} page/theme results in `
            + `${DIR}, expected ${want}. A floor measured over part of `
            + "the fleet is not a floor. Clear the directory and run the "
            + "whole spec.");
        ok = false;
    }

    // The claim in the spec's docstring was "the report fails loudly on
    // zero". It logged loudly and exited 0, which is the shape of gate
    // this whole item exists to find. An SVG `fill` is read by a helper
    // that can stop matching silently, and when it does every diagram
    // label goes back to being measured against the canvas.
    if (result.svgComposited === 0)
    {
        console.error("no SVG fill was composited across the whole fleet "
            + "— the shape walk is not matching, and every diagram label "
            + "is being measured against the canvas instead of its "
            + "shape. This is a broken instrument, not a clean run.");
        ok = false;
    }

    const below = result.findings.filter((f) => f.ratio < FLOOR);
    if (below.length > 0)
    {
        console.error(`\n${below.length} element(s) below ${FLOOR}:`);
        for (const f of below.slice(0, 20))
        {
            console.error(`  ${f.ratio.toFixed(2)}  ${f.theme}  ${f.page}`
                + `  ${f.fg} on ${f.bg}\n      ${f.path}`);
        }
        if (below.length > 20) { console.error(`  … ${below.length - 20} more`); }
        ok = false;
    }

    if (!ok) { process.exit(1); }
    console.log(`\nPASS: ${result.considered} text elements, none below `
        + `${FLOOR}, across ${result.runs} page/theme runs.`);
}

function main()
{
    const result = aggregate();

    if (!result)
    {
        console.error(`${DIR} is absent — run `
            + "`npx playwright test tests/contrast-rendered.spec.ts` first");
        process.exit(1);
    }

    if (result.runs < 2)
    {
        console.error(`only ${result.runs} page/theme run(s) in ${DIR} — `
            + "this is a PARTIAL run, not the fleet. Clear the directory "
            + "and run the whole spec before quoting a total.");
    }

    writeFileSync("coverage/contrast-rendered.json",
        JSON.stringify(result, null, 2));

    console.log(`page/theme runs : ${result.runs}`);
    console.log(`text elements   : ${result.considered}`);
    console.log(`skipped         : ${result.skipped}`);
    console.log(`AA failures     : ${result.findings.length}`);

    // Not a skip and not a pass. Text on a gradient or pattern fill has
    // no single background, so no ratio describes it. It is printed on
    // its own line so the number cannot be mistaken for either column.
    console.log(`exempt          : ${result.exempt.length}`
        + "  (WCAG 1.4.3: inactive controls)");
    console.log(`unmeasurable    : ${result.unmeasurable.length}`
        + "  (no single background to measure against)");

    // An SVG `fill` is not a `background-color`, so the climb reads it
    // separately. If that helper ever stops matching, every diagram
    // label quietly gets measured against the canvas again and the run
    // still looks clean. A zero here is the alarm.
    console.log(`svg fills read  : ${result.svgComposited}`);

    // Group by the thing a fix would touch: the element's own class and
    // the colour it is painted in. 400 rows of the same defect is one
    // defect, and listing them individually is how a real second defect
    // hides in the scroll.
    const groups = new Map();

    for (const f of result.findings)
    {
        const leaf = f.path.split(" > ").pop();
        const key = `${f.theme}\t${leaf}\t${f.fg}\ton ${f.bg}`;
        const g = groups.get(key) ?? { n: 0, worst: 99, pages: new Set() };
        g.n += 1;
        g.worst = Math.min(g.worst, f.ratio);
        g.pages.add(f.page);
        groups.set(key, g);
    }

    console.log(`distinct defects: ${groups.size}\n`);

    const rows = [...groups.entries()]
        .sort((a, b) => a[1].worst - b[1].worst);

    for (const [key, g] of rows.slice(0, 40))
    {
        const [theme, leaf, fg, bg] = key.split("\t");
        console.log(`${g.worst.toFixed(2)}  ${theme.padEnd(5)} `
            + `${leaf}  ${fg} ${bg}  `
            + `(${g.n} elements, ${g.pages.size} pages)`);
    }

    if (rows.length > 40) { console.log(`… ${rows.length - 40} more`); }

    if (process.argv.includes("--verify")) { verify(result); }
}

if (process.argv[1] && process.argv[1].endsWith("contrast-report.mjs"))
{
    main();
}
