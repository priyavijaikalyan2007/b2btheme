#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: IconPackCheck
 * 📜 PURPOSE: Structure check [30]. Re-reads the committed icon-packs/ from
 *    disk and checks every pack against its sources.json entry: layout,
 *    names, SVG safety, manifest-to-disk agreement, licence files and the
 *    file budgets. It imports no adapter or writer, only the naming and SVG
 *    rules in lib.mjs, which are the spec itself and are unit-tested against
 *    hostile input. specs/icon-packs.plan.md, Task 3.
 * 🔗 RELATES: [[IconPackLib]], [[IconPackWriter]]
 * ⚡ FLOW: [icon-packs/* + sources.json + category rules] -> [checkPack]
 *          -> [problems + budgets] -> [exit code]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseIconFileName, validateSvg } from "./lib.mjs";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const BUDGET = { packs: 15000, distFail: 19500, distWarn: 18000 };
const GENERAL_CAP = 0.05;

/** @returns {number} regular files under dir, recursively; 0 when it does not exist. */
export function countFiles(dir)
{
    if (!fs.existsSync(dir))
    {
        return 0;
    }
    return fs.readdirSync(dir, { recursive: true, withFileTypes: true }).filter((e) => e.isFile()).length;
}

function topLevelProblems(packDir, spec, allowedCategories)
{
    const problems = [];
    const required = ["ATTRIBUTION.md", "manifest.json", spec.licenseFile];
    if (spec.licenseFile === "TERMS.md")
    {
        required.push("legacy-map.json");
    }
    const categories = [];
    for (const e of fs.readdirSync(packDir, { withFileTypes: true }))
    {
        if (e.isDirectory())
        {
            categories.push(e.name);
            if (!SLUG.test(e.name) || (allowedCategories && !allowedCategories.has(e.name)))
            {
                problems.push(`unknown category folder ${e.name}`);
            }
        }
        else if (!required.includes(e.name))
        {
            problems.push(`unexpected top-level file ${e.name}`);
        }
    }
    for (const f of required)
    {
        if (!fs.existsSync(path.join(packDir, f)))
        {
            problems.push(`missing ${f}`);
        }
    }
    return { problems, categories };
}

function svgProblems(packDir, categories, spec)
{
    const problems = [];
    const files = new Set();
    for (const category of categories)
    {
        for (const e of fs.readdirSync(path.join(packDir, category), { withFileTypes: true }))
        {
            const rel = `${category}/${e.name}`;
            const parsed = e.isFile() ? parseIconFileName(e.name, spec.variants) : null;
            if (!parsed)
            {
                problems.push(`${rel}: not <name>-<size>-<variant>.svg`);
                continue;
            }
            files.add(rel);
            const text = fs.readFileSync(path.join(packDir, rel), "utf8");
            problems.push(...validateSvg(text, parsed.size, { square: spec.square }).map((p) => `${rel}: ${p}`));
            if (text.includes("knobby"))
            {
                problems.push(`${rel}: names a consumer host (knobby)`);
            }
        }
    }
    return { problems, files };
}

function manifestProblems(packDir, packId, spec, files)
{
    const problems = [];
    const manifest = JSON.parse(fs.readFileSync(path.join(packDir, "manifest.json"), "utf8"));
    if (manifest.pack !== packId)
    {
        problems.push(`manifest.pack is "${manifest.pack}"`);
    }
    const listed = new Set();
    const legacy = {};
    for (const icon of manifest.icons)
    {
        if (icon.id !== `${icon.category}/${icon.name}`)
        {
            problems.push(`manifest icon ${icon.id} does not match ${icon.category}/${icon.name}`);
        }
        for (const [key, rel] of Object.entries(icon.files))
        {
            const parsed = parseIconFileName(path.basename(rel), spec.variants);
            const consistent = rel.startsWith(`${icon.category}/`) && parsed?.name === icon.name
                && `${parsed.size}-${parsed.variant}` === key;
            if (!consistent)
            {
                problems.push(`manifest icon ${icon.id}: ${key} -> ${rel} is inconsistent`);
            }
            listed.add(rel);
            if (icon.legacyPaths?.[key])
            {
                legacy[icon.legacyPaths[key]] = rel;
            }
        }
    }
    for (const rel of files)
    {
        if (!listed.has(rel))
        {
            problems.push(`${rel}: on disk but not in manifest.json`);
        }
    }
    for (const rel of listed)
    {
        if (!files.has(rel))
        {
            problems.push(`${rel}: in manifest.json but not on disk`);
        }
    }
    if (manifest.fileCount !== files.size)
    {
        problems.push(`manifest.fileCount ${manifest.fileCount} != ${files.size} files`);
    }
    if (spec.licenseFile === "TERMS.md")
    {
        const onDisk = JSON.parse(fs.readFileSync(path.join(packDir, "legacy-map.json"), "utf8"));
        if (JSON.stringify(sortKeys(onDisk)) !== JSON.stringify(sortKeys(legacy)))
        {
            problems.push("legacy-map.json disagrees with the manifest's legacyPaths");
        }
    }
    return problems;
}

function sortKeys(o)
{
    return Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * @param {string} packDir icon-packs/<packId>
 * @param {string} packId
 * @param {object} spec The pack's sources.json entry.
 * @param {Set<string> | null} allowedCategories For rule-categorised packs; null
 *    when categories are the upstream's own folders (any slug).
 * @param {boolean} capGeneral Whether at most 5% of files may sit in "general".
 * @returns {string[]} Problems, each prefixed with the pack id; empty means sound.
 */
export function checkPack(packDir, packId, spec, allowedCategories, capGeneral)
{
    const top = topLevelProblems(packDir, spec, allowedCategories);
    const problems = [...top.problems];
    if (problems.some((p) => p.startsWith("missing manifest") || p.startsWith("missing legacy")))
    {
        return problems.map((p) => `${packId}: ${p}`);
    }
    const svgs = svgProblems(packDir, top.categories, spec);
    problems.push(...svgs.problems, ...manifestProblems(packDir, packId, spec, svgs.files));
    for (const f of ["ATTRIBUTION.md", spec.licenseFile])
    {
        const file = path.join(packDir, f);
        if (fs.existsSync(file) && fs.readFileSync(file, "utf8").includes("knobby"))
        {
            problems.push(`${f}: names a consumer host (knobby)`);
        }
    }
    const general = [...svgs.files].filter((rel) => rel.startsWith("general/")).length;
    if (capGeneral && general > GENERAL_CAP * svgs.files.size)
    {
        problems.push(`${general} of ${svgs.files.size} files are in general (cap ${GENERAL_CAP * 100}%)`);
    }
    return problems.map((p) => `${packId}: ${p}`);
}

/** Category rules for the rule-categorised packs; the others use their upstream folders. */
function ruleCategories(scriptsDir)
{
    const read = (f) => JSON.parse(fs.readFileSync(path.join(scriptsDir, f), "utf8"));
    const toSet = (rules) => new Set([...rules.map((r) => r.category), "general"]);
    return {
        "fluent-ui": toSet(read("fluent-ui.categories.json").rules),
        gcp: toSet(read("cloud.categories.json").gcp.rules),
    };
}

function main()
{
    const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
    const root = path.resolve(scriptsDir, "../..");
    const sources = JSON.parse(fs.readFileSync(path.join(scriptsDir, "sources.json"), "utf8"));
    const rules = ruleCategories(scriptsDir);
    const packsRoot = path.join(root, "icon-packs");
    const problems = [];
    for (const packId of fs.readdirSync(packsRoot).sort())
    {
        if (!sources[packId])
        {
            problems.push(`icon-packs/${packId} has no sources.json entry`);
            continue;
        }
        problems.push(...checkPack(path.join(packsRoot, packId), packId, sources[packId], rules[packId] ?? null,
            Boolean(rules[packId])));
        console.log(`  ${packId}: ${countFiles(path.join(packsRoot, packId))} files`);
    }
    const packFiles = countFiles(packsRoot);
    if (packFiles > BUDGET.packs)
    {
        problems.push(`icon-packs/ holds ${packFiles} files, over the ${BUDGET.packs} budget`);
    }
    const distFiles = countFiles(path.join(root, "dist"));
    console.log(`  icon-packs/: ${packFiles} files; dist/: ${distFiles} files (Cloudflare limit 20000)`);
    if (distFiles > BUDGET.distFail)
    {
        problems.push(`dist/ holds ${distFiles} files, over ${BUDGET.distFail}: too close to the 20000 limit`);
    }
    else if (distFiles > BUDGET.distWarn)
    {
        console.log(`  WARN: dist/ holds ${distFiles} files, over ${BUDGET.distWarn}`);
    }
    for (const p of problems)
    {
        console.error(`  ${p}`);
    }
    process.exit(problems.length > 0 ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
{
    main();
}
