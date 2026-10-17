#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: FactoryCensus
 * 📜 PURPOSE: Enumerate every published `create*` factory, say where its
 *    container is (a parameter for 76, an options field for 31), and build
 *    a minimal options stub so the factory can be called. ERR-1 / ADR-192.
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
 * WHY A CONTAINER IS NOT ALWAYS A PARAMETER
 * -------------------------------------------
 * The first census asked "which PARAMETER is the container", and that
 * question has no answer for `createLatexEditor(opts)`, which carries its
 * container as `opts.container`. Thirty-one factories do it that way, and
 * all thirty-one fell out of the scan before the probe ran, so a ceiling of
 * zero was measured over seventy-six of the hundred and seven factories
 * that take a container at all. A container is located here in either
 * place, and the probe writes to whichever one the factory declares.
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

/**
 * An empty value of the right shape, or undefined to leave the field out.
 *
 * `src` is optional and lets a named type alias be resolved. `GaugeShape`
 * says nothing on its own, and `type GaugeShape = "arc" | "dial"` says
 * which values exist. Seven required fields across six components are
 * declared that way, and without the lookup they read as unfillable.
 */
export function emptyFor(type, src = null)
{
    const t = type.trim();

    if (/\[\]$/.test(t) || /^(Array|ReadonlyArray)</.test(t)) { return []; }
    if (/^string\b/.test(t)) { return "x"; }
    if (/^number\b/.test(t)) { return 0; }
    if (/^boolean\b/.test(t)) { return false; }
    if (/^Record</.test(t) || /^\{/.test(t)) { return {}; }
    if (/^Map</.test(t)) { return new Map(); }
    if (/^Date\b/.test(t)) { return new Date(0); }

    // A union of string literals. The first member is as good as any,
    // and a component that rejects it has said something worth knowing.
    const literal = /^"([^"]*)"/.exec(t);
    if (literal !== null && /^(\s*"[^"]*"\s*\|?)+$/.test(t)) { return literal[1]; }

    if (src !== null && /^[A-Z]\w*$/.test(t))
    {
        const alias = new RegExp(`type ${t}\\s*=\\s*([^;]+);`).exec(src);
        if (alias !== null) { return emptyFor(alias[1], null); }
    }
    return undefined;
}

/**
 * The declared fields of `interface <name>`, in source order, including
 * the ones it inherits. `AttachHoverCardOptions extends HoverCardOptions`
 * carries HoverCardOptions.container without restating it, and a scan that
 * stops at the brace would call that factory container-less.
 */
export function interfaceFields(src, name, seen = new Set())
{
    if (seen.has(name)) { return []; }
    seen.add(name);

    const m = new RegExp(`(?:export )?interface ${name}\\s*(extends ([^{]*))?\\{`).exec(src);
    if (m === null) { return []; }

    const block = balanced(src, src.indexOf("{", m.index), "{", "}");
    if (block === null) { return []; }

    const fields = [];

    for (const base of splitParams(m[2] ?? "").map((b) => b.trim()).filter(Boolean))
    {
        // `extends Omit<TenantSwitcherOptions, "tenants" | "activeTenantId">`
        // inherits the base minus the named keys, and reading the base
        // name as "Omit" inherits nothing at all.
        const omit = /^Omit\s*<\s*(\w+)\s*,([\s\S]*)>$/.exec(base);
        const name = omit !== null ? omit[1] : base.replace(/<.*$/, "");
        const dropped = omit === null ? [] : omittedKeys(omit[2]);

        fields.push(...interfaceFields(src, name, seen)
            .filter((f) => !dropped.includes(f.name)));
    }

    for (const line of block.text.split("\n"))
    {
        const f = /^\s*(?:readonly\s+)?([A-Za-z_]\w*)(\??)\s*:\s*([^;]+);/.exec(line);
        if (f === null) { continue; }

        fields.push({ name: f[1], optional: f[2] === "?", type: f[3].trim() });
    }

    // A derived interface may restate a field of its base. The nearer
    // declaration is the one that applies, and counting both reported
    // WorkspaceSwitcherOptions.activeWorkspaceId twice.
    const names = fields.map((f) => f.name);
    return fields.filter((f, i) => names.lastIndexOf(f.name) === i);
}

/** The key names inside an `Omit<X, "a" | "b">` second argument. */
export function omittedKeys(text)
{
    return [...text.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/** Every required field of `interface <name>`, filled with an empty value. */
export function stubFromInterface(src, name)
{
    const stub = {};

    for (const f of interfaceFields(src, name))
    {
        if (f.optional) { continue; }

        const v = emptyFor(f.type, src);
        if (v !== undefined) { stub[f.name] = v; }
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

            // A parameter default belongs to the value, not to the type.
            // `options: Omit<ActionItemsOptions, "container"> = {}` kept
            // the ` = {}`, and the Omit match is anchored at the end, so
            // createActionItems was reported as not validating an option
            // its own signature removes.
            const types = parts.map(
                (p) => (p.split(":")[1] ?? "").replace(/=[\s\S]*$/, "").trim());
            const ci = names.findIndex((n) => CONTAINER_PARAM.test(n));
            const oi = names.findIndex((n, i) => i !== ci && /opt/i.test(n));
            const optionType = oi >= 0 ? (/([A-Z]\w*Options)/.exec(types[oi]) ?? [])[1] ?? null : null;

            // `createTileGauge(options: Omit<GaugeOptions, "shape">)` means
            // the caller must NOT pass shape, and reading GaugeOptions
            // whole reported three gauges as missing an option they are
            // declared never to receive.
            const omitted = oi < 0
                ? []
                : omittedKeys((/^Omit\s*<\s*\w+\s*,([\s\S]*)>$/.exec(types[oi].trim()) ?? [])[1] ?? "");

            // A container the factory never names as a parameter. See the
            // header: thirty-one factories declare it on their options.
            const field = ci >= 0 || optionType === null
                ? null
                : interfaceFields(src, optionType).find((f) => CONTAINER_PARAM.test(f.name)) ?? null;

            rows.push({
                component: dir,
                name,
                published: published.has(name),
                paramNames: names,
                containerIndex: ci,
                containerType: ci >= 0 ? types[ci] : null,
                containerField: field === null ? null : field.name,
                containerFieldType: field === null ? null : field.type,
                optionsIndex: oi,
                optionsType: optionType,
                optionsOmits: omitted,
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
    const byParam = pub.filter((r) => r.containerIndex >= 0);
    const byField = pub.filter((r) => r.containerIndex < 0 && r.containerField !== null);
    const neither = pub.length - byParam.length - byField.length;

    console.log(`  ${rows.length} exported create* factories, ${pub.length} published`);
    console.log(`  ${byParam.length} name a container parameter, ${byField.length} carry one on their options`);
    console.log(`  ${neither} take no container at all`);
    return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    process.exit(main());
}
