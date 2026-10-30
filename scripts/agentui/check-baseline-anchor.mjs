#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiBaselineAnchor
 * 📜 PURPOSE: Anchors the published catalog baselines to the base branch (#28).
 *    The generator and check [29] compare the build with whatever baseline is
 *    committed, so deleting a baseline and writing it again re-opened its
 *    major to any change. A local check cannot anchor against itself; this one
 *    compares each baseline the base branch has with the working tree's, and
 *    fails on a deletion or a breaking edit. CI runs it on every pull request
 *    and push.
 * 🔗 RELATES: [[AgentUiCatalogDiff]], [[AgentUiDistCheck]]
 * ⚡ FLOW: [git show <base>:specs/agentui/published/*] + [working tree]
 *          -> [diffCatalogs] -> [problems] -> [exit code]
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { diffCatalogs } from "./catalog-diff.mjs";

const PUBLISHED = "specs/agentui/published";
const BASELINE = /^catalog-v\d+\.json$/;

/**
 * Problems with the working tree's baselines against the base branch's.
 *
 * @param base    - Baseline file name to its parsed content on the base branch.
 * @param current - Baseline file name to its parsed content in the working tree (absent when deleted).
 * @returns Problems; empty means pass.
 */
export function anchorProblems(base, current)
{
    return [...base].flatMap(([file, previous]) =>
    {
        const next = current.get(file);

        if (next === undefined)
        {
            return [`${PUBLISHED}/${file} was deleted. A published major stays served and frozen (CDN_CONTRACT §2c); `
                + "restore it from git."];
        }

        const { breaking } = diffCatalogs(previous, next);

        return breaking.length === 0 ? [] : [`${PUBLISHED}/${file} changed in ways that break hosts that `
            + `hard-coded it:\n  ${breaking.join("\n  ")}\nA breaking change needs a new major (CATALOG_MAJOR in `
            + "scripts/agentui/catalog.mjs); the published one stays as it was."];
    });
}

/** The base branch's baselines, read through git. */
function baseBaselines(repo, ref)
{
    const names = execFileSync("git", ["ls-tree", "--name-only", `${ref}:${PUBLISHED}`],
        { cwd: repo, encoding: "utf8" }).split("\n").filter((n) => BASELINE.test(n));

    return new Map(names.map((n) => [n, JSON.parse(execFileSync("git", ["show", `${ref}:${PUBLISHED}/${n}`],
        { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }))]));
}

/** The working tree's baselines. */
function currentBaselines(repo)
{
    const dir = path.join(repo, PUBLISHED);

    return new Map(fs.readdirSync(dir).filter((n) => BASELINE.test(n))
        .map((n) => [n, JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"))]));
}

/** CLI: check-baseline-anchor.mjs <base ref>. */
function main(argv)
{
    const ref = argv[0];

    if (!ref)
    {
        console.error("[baseline-anchor] Give the base ref to compare with, such as origin/main.");
        return 2;
    }

    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const problems = anchorProblems(baseBaselines(repo, ref), currentBaselines(repo));

    for (const p of problems) { console.error(`[baseline-anchor] ${p}`); }
    console.log(`[baseline-anchor] ${problems.length === 0 ? "PASS" : "FAIL"}: baselines compared with ${ref}.`);

    return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) { process.exitCode = main(process.argv.slice(2)); }
