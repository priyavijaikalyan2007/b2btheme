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
    let considered = 0;
    let skipped = 0;

    for (const file of files)
    {
        const row = JSON.parse(readFileSync(`${DIR}/${file}`, "utf8"));
        considered += row.considered;
        skipped += row.skipped;
        findings.push(...row.findings);
    }

    return { runs: files.length, considered, skipped, findings };
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

    writeFileSync("coverage/contrast-rendered.json",
        JSON.stringify(result, null, 2));

    console.log(`page/theme runs : ${result.runs}`);
    console.log(`text elements   : ${result.considered}`);
    console.log(`skipped         : ${result.skipped}`);
    console.log(`AA failures     : ${result.findings.length}`);

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
