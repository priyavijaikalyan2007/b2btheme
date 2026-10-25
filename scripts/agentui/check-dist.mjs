#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiDistCheck
 * 📜 PURPOSE: Structure check [29]. Reads only the emitted files, the vendored
 *    A2UI schemas and the committed baseline, and imports nothing from the
 *    generator: a check that shares an oracle with what it checks passes by
 *    construction. ADR-219, spec §10.
 * 🔗 RELATES: [[AgentUiGenerator]], [[AgentUiCatalog]]
 * ⚡ FLOW: [emitted dist + vendored schemas + committed baseline]
 *          -> [checkDist] -> [problems] -> [exit code]
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;

const ORIGIN = "https://static.outcrop.us";
// The id common_types.json's relative `catalog.json` resolves to.
const ACTIVE_CATALOG_SLOT = "https://a2ui.org/specification/v0_9/catalog.json";
const EMITTED = ["dist/a2ui", "dist/schemas", "dist/mcp", "dist/agentui-report.json"];
// Unambiguous fixture literals only. Ordinary words such as "placeholder" are legitimate prop names and prose.
const FIXTURE_WORDS = ["lorem ipsum", "test user", "john doe", "jane doe", "example.com", "about:blank"];
// The only keys whose values are shipped data rather than schema vocabulary.
const DATA_KEYS = new Set(["default", "const", "example", "examples", "enum"]);
const REPORT_FILE = "agentui-report.json";

/**
 * Every [29] problem in a built repository.
 *
 * @param root - Repository root.
 * @returns Problems; empty means pass.
 */
// @entrypoint
export function checkDist(root)
{
    const read = (rel) => readJson(root, rel);
    const major = highestBaseline(root);
    const catalogRel = `dist/a2ui/catalog/v${major}.json`;

    return [
        ...baselineProblems(root, major),
        ...layoutProblems(read(catalogRel), read("scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json")),
        ...refProblems(root, read(catalogRel)),
        ...coverageProblems(read("dist/capability-manifest.json"), read(catalogRel), read("dist/agentui-report.json")),
        ...textProblems(root),
        ...cspProblems(read("dist/mcp/renderer.meta.json")),
        ...stagingProblems(root),
    ];
}

function readJson(root, rel)
{
    try
    {
        return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
    }
    catch (err)
    {
        throw new Error(`[29] Cannot read ${rel} under ${root}: ${err.message}. Run \`npm run build:agentui\` first, and make sure the file is valid JSON.`);
    }
}

function highestBaseline(root)
{
    const dir = path.join(root, "specs", "agentui", "published");

    if (!fs.existsSync(dir)) { throw new Error(`[29] ${dir} does not exist; the catalog has never been published.`); }

    const majors = fs.readdirSync(dir).flatMap((f) => { const m = /^catalog-v(\d+)\.json$/.exec(f); return m ? [Number(m[1])] : []; });

    if (majors.length === 0) { throw new Error(`[29] No baseline in ${dir}; the catalog has never been published.`); }

    return Math.max(...majors);
}

/**
 * Every built catalog must have a byte-identical committed twin, and the
 * highest built major must be the highest committed one. Otherwise a new
 * major could ship with no baseline and the check would compare the old one.
 */
function baselineProblems(root, major)
{
    const dir = path.join(root, "dist", "a2ui", "catalog");
    const built = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^v\d+\.json$/.test(f)) : [];
    const problems = built.flatMap((f) =>
    {
        const twin = path.join(root, "specs", "agentui", "published", `catalog-${f}`);
        const same = fs.existsSync(twin) && fs.readFileSync(path.join(dir, f), "utf8") === fs.readFileSync(twin, "utf8");

        return same ? [] : [`dist/a2ui/catalog/${f} has no byte-identical committed baseline at specs/agentui/published/catalog-${f}. `
            + "Run `npm run build:agentui -- --write-baseline` and commit it."];
    });
    const highestBuilt = Math.max(0, ...built.map((f) => Number(f.slice(1, -5))));

    return highestBuilt === major ? problems : [...problems, `dist/ ships catalog v${highestBuilt} but the highest committed baseline is v${major}.`];
}

/** Top-level keys must equal the vendored basic catalog file's. */
function layoutProblems(catalog, basic)
{
    const want = Object.keys(basic).sort().join(",");
    const got = Object.keys(catalog).sort().join(",");

    return want === got ? [] : [`catalog layout is [${got}], but A2UI v0.9.1 catalog files are [${want}].`];
}

/**
 * Compiles the catalog as a schema with the vendored files registered, so every
 * $ref must resolve. common_types.json refers to the catalog in use as the
 * relative `catalog.json#/$defs/anyFunction`; the alias below binds that slot
 * to the catalog under test, as an A2UI client does.
 */
function refProblems(root, catalog)
{
    const vendor = path.join(root, "scripts", "agentui", "vendor", "a2ui-v0_9_1");
    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    const active = { $id: ACTIVE_CATALOG_SLOT, $defs: { anyFunction: { $ref: `${catalog.$id}#/$defs/anyFunction` } } };

    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(vendor, "common_types.json"), "utf8")));
    ajv.addSchema(JSON.parse(fs.readFileSync(path.join(vendor, "catalogs", "basic", "catalog.json"), "utf8")));
    ajv.addSchema(active);

    try
    {
        ajv.addSchema(catalog);
        for (const pointer of catalogPointers(catalog)) { ajv.getSchema(`${catalog.$id}${pointer}`); }
        return [];
    }
    catch (err)
    {
        return [`catalog does not compile: ${err.message}. Every $ref must resolve against the vendored A2UI files.`];
    }
}

/** A pointer to every component, function and $defs entry, since Ajv resolves lazily. */
function catalogPointers(catalog)
{
    return ["components", "functions", "$defs"].flatMap((section) =>
        Object.keys(catalog[section]).map((name) => `#/${section}/${name}`));
}

/** Every built manifest is in the catalog or listed as excluded. */
function coverageProblems(manifests, catalog, report)
{
    const excluded = new Set(report.excluded.map((e) => e.name));

    return manifests.components
        .filter((m) => !excluded.has(m.name))
        .map((m) => ({ m, name: m.protocol?.name ?? m.factory.replace(/^create/, "") }))
        .filter(({ name }) => !(name in catalog.components))
        .map(({ m, name }) => `${m.name}: neither in the catalog (as ${name}) nor in dist/agentui-report.json's excluded list.`);
}

/**
 * No host-specific text anywhere in anything emitted (D2), and no fixture
 * literal in a shipped data value (D13). Keys, descriptions, titles and the
 * report's diagnostics are prose or vocabulary, so only the former is scanned.
 */
function textProblems(root)
{
    return EMITTED.flatMap((rel) => filesUnder(path.join(root, rel))).flatMap((file) =>
    {
        const raw = fs.readFileSync(file, "utf8");
        const name = path.relative(root, file);
        const knobby = raw.toLowerCase().includes("knobby") ? [`${name} contains "knobby".`] : [];

        return [...knobby, ...(path.basename(file) === REPORT_FILE ? [] : fixtureProblems(name, raw))];
    });
}

function fixtureProblems(name, raw)
{
    let json;

    try { json = JSON.parse(raw); }
    catch (err) { throw new Error(`[29] Cannot parse ${name}: ${err.message}. Every emitted file under dist/ is JSON; rebuild with \`npm run build:agentui\`.`); }

    return dataStrings(json, false).flatMap((value) => FIXTURE_WORDS
        .filter((w) => value.toLowerCase().includes(w))
        .map((w) => `${name} has the fixture literal "${w}" in a data value: ${JSON.stringify(value)}.`));
}

/** Strings found under a default, const, enum or example(s) key, at any depth. */
function dataStrings(node, inData)
{
    if (typeof node === "string") { return inData ? [node] : []; }

    if (Array.isArray(node)) { return node.flatMap((n) => dataStrings(n, inData)); }

    if (node === null || typeof node !== "object") { return []; }

    return Object.entries(node).flatMap(([k, v]) => dataStrings(v, inData || DATA_KEYS.has(k)));
}

function filesUnder(p)
{
    if (!fs.existsSync(p)) { return []; }

    if (fs.statSync(p).isFile()) { return [p]; }

    return fs.readdirSync(p).flatMap((f) => filesUnder(path.join(p, f)));
}

/** The CSP names the host-neutral origin first. */
function cspProblems(meta)
{
    return meta.csp?.resourceDomains?.[0] === ORIGIN ? [] : [`dist/mcp/renderer.meta.json must name ${ORIGIN} first in csp.resourceDomains.`];
}

/**
 * A generator swap that fails to roll back keeps its staging directory, which
 * holds the previous outputs. `npm run deploy` uploads dist/ wholesale, so a
 * stranded one could ship.
 */
function stagingProblems(root)
{
    const dist = path.join(root, "dist");

    if (!fs.existsSync(dist)) { return []; }

    return fs.readdirSync(dist).filter((f) => f.startsWith(".agentui-staging-")).map((f) =>
        `dist/${f} is a stranded generator staging directory: a swap of the build outputs failed, and it holds the previous outputs. `
        + "Inspect it and remove it before deploying, because `npm run deploy` uploads dist/ wholesale.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const problems = checkDist(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));
    for (const p of problems) { console.log(`      ${p}`); }
    process.exit(problems.length === 0 ? 0 : 1);
}
