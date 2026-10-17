#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FactoryCensus
 * 📜 PURPOSE: Enumerate every published `create*` factory, say which
 *    parameter is its container, and build a minimal options stub so the
 *    factory can be called. ERR-1 / ADR-192.
 * 🔗 RELATES: [[DocGenerator]], [[NoFallbackCode]], [[LiterateErrors]]
 * ⚡ FLOW: [components/<name>/<name>.ts] -> [extractGlobals] -> [inventory]
 *          -> [factory-census.test.ts calls each one] -> [a ceiling]
 *
 * WHY THIS IS NOT A GREP
 * -----------------------
 * ERR-1 recorded "10 of 15 sampled factory functions have no container
 * validation", and a static read cannot check that claim. The factories are
 * thin. `createDatePicker` is one line that forwards to a constructor, and
 * `createColorPicker` forwards to `show()`. Whatever happens to a missing
 * container happens two hops away, in a class method, and the first attempt
 * at this census read the factory body and reported 2 of 46 validating,
 * which was wrong in both directions.
 *
 * So the census CALLS each factory, once with a container that exists and
 * once with one that does not, and records what the component actually did.
 * That is the thing the rule is about and the thing a consumer meets.
 *
 * WHY THE PARAMETER SPLIT IS NOT `split(",")`
 * --------------------------------------------
 * `createTileGauge(options: Omit<GaugeOptions, "shape">, container?: ...)`
 * has two parameters and one comma inside a type argument. Splitting on
 * every comma moved the container index one to the right for all four
 * gauge factories, so the census passed an options object where a container
 * belonged and read the resulting TypeError as a finding. Angle brackets,
 * parentheses and braces are tracked.
 *
 * WHY THE OPTIONS STUB EXISTS
 * ----------------------------
 * Calling a factory with `{}` makes components with required options throw
 * before they ever look at the container, which hides the container verdict
 * behind an unrelated one. The stub fills every NON-optional field of the
 * declared `<Name>Options` interface with an empty value of the right
 * shape. Callbacks are left absent deliberately, because a component that
 * needs one should say so.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { extractGlobals } = require("./generate-docs.js");

const ROOT = "components";

/** Names a container parameter can go by, as the fleet actually spells it. */
const CONTAINER_PARAM = /^(container|containerId|containerOrId|target|host|mount|el|element)$/i;

/** Split a parameter list on top-level commas only. */
export function splitParams(params)
{
    const parts = [];
    let buf = "";
    let ang = 0;
    let par = 0;
    let brk = 0;

    for (const ch of params)
    {
        if (ch === "<") { ang += 1; }
        else if (ch === ">") { ang -= 1; }
        else if (ch === "(") { par += 1; }
        else if (ch === ")") { par -= 1; }
        else if (ch === "[" || ch === "{") { brk += 1; }
        else if (ch === "]" || ch === "}") { brk -= 1; }

        if (ch === "," && ang === 0 && par === 0 && brk === 0)
        {
            parts.push(buf);
            buf = "";
            continue;
        }
        buf += ch;
    }

    if (buf.trim() !== "") { parts.push(buf); }
    return parts;
}

/** The text between the balanced delimiters that start at `from`. */
function balanced(src, from, open, close)
{
    let depth = 0;

    for (let i = from; i < src.length; i += 1)
    {
        if (src[i] === open) { depth += 1; }
        else if (src[i] === close)
        {
            depth -= 1;
            if (depth === 0) { return { text: src.slice(from + 1, i), end: i }; }
        }
    }
    return null;
}

/** An empty value of the right shape, or undefined to leave the field out. */
export function emptyFor(type)
{
    const t = type.trim();

    if (/\[\]$/.test(t) || /^(Array|ReadonlyArray)</.test(t)) { return []; }
    if (/^string\b/.test(t)) { return "x"; }
    if (/^number\b/.test(t)) { return 0; }
    if (/^boolean\b/.test(t)) { return false; }
    if (/^Record</.test(t) || /^\{/.test(t)) { return {}; }
    if (/^Map</.test(t)) { return new Map(); }
    return undefined;
}

/** Every required field of `interface <name>`, filled with an empty value. */
export function stubFromInterface(src, name)
{
    const m = new RegExp(`(?:export )?interface ${name}\\s*(?:extends [^{]*)?\\{`).exec(src);
    if (m === null) { return {}; }

    const block = balanced(src, src.indexOf("{", m.index), "{", "}");
    if (block === null) { return {}; }

    const stub = {};

    for (const line of block.text.split("\n"))
    {
        const f = /^\s*(?:readonly\s+)?([A-Za-z_]\w*)(\??)\s*:\s*([^;]+);/.exec(line);
        if (f === null || f[2] === "?") { continue; }

        const v = emptyFor(f[3]);
        if (v !== undefined) { stub[f[1]] = v; }
    }
    return stub;
}

/** Every published `create*` factory, with its container parameter located. */
export function factoryInventory(root = ROOT)
{
    const rows = [];

    for (const dir of readdirSync(root, { withFileTypes: true })
        .filter((d) => d.isDirectory()).map((d) => d.name))
    {
        const file = `${root}/${dir}/${dir}.ts`;
        if (!existsSync(file)) { continue; }

        const src = readFileSync(file, "utf8");
        const published = new Set(extractGlobals(src));

        for (const m of src.matchAll(/export function (create[A-Z]\w*)\s*\(/g))
        {
            const name = m[1];
            const sig = balanced(src, m.index + m[0].length - 1, "(", ")");
            if (sig === null) { continue; }

            const parts = splitParams(sig.text);
            const names = parts.map((p) => p.split(":")[0].trim().replace(/[?\s=].*$/, ""));
            const types = parts.map((p) => (p.split(":")[1] ?? "").trim());
            const ci = names.findIndex((n) => CONTAINER_PARAM.test(n));
            const oi = names.findIndex((n, i) => i !== ci && /opt/i.test(n));
            const optionType = oi >= 0 ? (/([A-Z]\w*Options)/.exec(types[oi]) ?? [])[1] ?? null : null;

            rows.push({
                component: dir,
                name,
                published: published.has(name),
                paramNames: names,
                containerIndex: ci,
                containerType: ci >= 0 ? types[ci] : null,
                optionsIndex: oi,
                optionsStub: optionType === null ? {} : stubFromInterface(src, optionType),
            });
        }
    }
    return rows;
}

function main()
{
    const rows = factoryInventory();
    const pub = rows.filter((r) => r.published);
    const withContainer = pub.filter((r) => r.containerIndex >= 0);

    console.log(`  ${rows.length} exported create* factories, ${pub.length} published`);
    console.log(`  ${withContainer.length} take a container, ${pub.length - withContainer.length} take options only`);
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    process.exit(main());
}
