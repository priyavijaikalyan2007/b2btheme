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
 * Usage: node scripts/contrast-report.mjs [--json]
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const DIR = "coverage/contrast";

export function aggregate()
{
    if (!existsSync(DIR)) { return null; }

    const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
    const findings = [];
    const unmeasurable = [];
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
    }

    return { runs: files.length, considered, skipped, svgComposited,
        findings, unmeasurable };
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
    console.log(`unmeasurable    : ${result.unmeasurable.length}`
        + "  (no single background to measure against)");

    // An SVG `fill` is not a `background-color`, so the climb reads it
    // separately. If that helper ever stops matching, every diagram
    // label quietly gets measured against the canvas again and the run
    // still looks clean. A zero here is the alarm.
    console.log(`svg fills read  : ${result.svgComposited}`);
    if (result.svgComposited === 0)
    {
        console.error("no SVG fill was composited in the whole fleet — "
            + "the shape walk is not matching. Diagram labels are being "
            + "measured against the canvas, not against their shape.");
    }

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
}

if (process.argv[1] && process.argv[1].endsWith("contrast-report.mjs"))
{
    main();
}
