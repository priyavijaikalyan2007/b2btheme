#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: VendorAudit
 * 📜 PURPOSE: Report advisories against the packages this origin actually
 *    serves, rather than against the packages npm calls production.
 *    DEBT-SEC-10.
 * 🔗 RELATES: [[VendorClosure]], [[ClosureGate]], [[CdnContract]]
 * ⚡ FLOW: [dist/lib-manifest.json packages] -> [npm audit --json]
 *          -> [intersection] -> [exit 1 on any hit]
 *
 * WHY `npm audit --omit=dev` IS THE WRONG QUESTION HERE
 * -----------------------------------------------------
 * This repository has no runtime dependencies at all. Every library it
 * serves sits in devDependencies, because the browser closure is built
 * from node_modules and vendored into dist/lib. So `npm audit
 * --omit=dev` reports zero while this origin serves the vulnerable file.
 *
 * That is not a hypothetical. On 2026-10-23 dompurify carried a CRITICAL
 * advisory, this origin was serving it, consumers were told to load it,
 * and the production-scoped audit reported zero the whole time.
 *
 * The right population is neither "production" nor "everything". It is
 * the set of packages inside the artifacts in dist/lib, and the manifest
 * states that set per asset because vendor-closure.mjs reads it from
 * esbuild's metafile. codemirror6 alone holds twenty-eight packages
 * behind one hash.
 *
 * WHAT A HIT MEANS, AND WHAT IT DOES NOT
 * ---------------------------------------
 * npm reports a DEPENDENT as well as the vulnerable package, linked by a
 * `via` chain. A served package can therefore appear because of a
 * dependency its browser build never includes. A node-only transport
 * reached through a Node entry point is one example.
 *
 * Those stay visible on purpose. A person reads the chain and dismisses
 * the finding. The alternative is a filter that decides for them, and a
 * filter wrong once hides the advisory this gate exists to surface.
 *
 * WHICH INSTALLED COPY AN ADVISORY IS ABOUT
 * -----------------------------------------
 * `npm audit` groups advisories by package NAME, and node_modules can hold
 * several copies of one name. A test-only devDependency may nest its own
 * older copy of a package this origin serves. On 2026-10-26
 * @a2ui/markdown-it nested dompurify 3.4.11 under itself, and a name-only
 * match failed CI against the served 3.4.17, which no advisory covered.
 *
 * Each entry's `nodes` names the install paths the advisory is about, so a
 * served package counts when one of those copies is at the version this
 * origin serves. That is not a filter deciding for a person. It is the
 * same identity vendor-closure.mjs records: the version of the copy esbuild
 * actually bundled, nested or not. Dependents reached through a `via`
 * chain still count, because npm lists the dependent's own install path.
 *
 * THIS GATE NEEDS THE NETWORK AND FAILS WITHOUT IT
 * -------------------------------------------------
 * `npm audit` asks the registry. When the registry is unreachable there
 * is no answer, and an audit that reports "no advisories" because it
 * asked nobody is worse than no audit. So an unparseable reply throws.
 * The same rule covers an absent manifest and an empty package set
 * (ADR-196).
 *
 * EXCEPTIONS, AND WHY EACH ASSET IS AUDITED ON ITS OWN
 * --------------------------------------------------
 * A hit passes only when everything its chain reaches is excused by a
 * recorded, exact, expiring entry in audit-exceptions.mjs (ADR-252), or
 * the asset serves a copy no advisory covers. A chain through a package
 * the asset does not bundle still fails until a person records why.
 *
 * One package may be served at two versions by two assets (web_core's
 * zod 3 in a2ui-runtime, the MCP SDK's zod 4 in mcp-ext-apps). One
 * name-to-version map would keep only one, so each asset is audited, and
 * checked fresh against the installed copies, on its own.
 *
 * Usage: node scripts/vendor-audit.mjs            the set dist/ serves (CI)
 *        node scripts/vendor-audit.mjs --gated    the set a publication gate
 *                                                 holds back (gated/, #19 M1)
 */

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { AUDIT_EXCEPTIONS, exceptionKey, findException, isExpired, validateExceptions } from "./audit-exceptions.mjs";
import { GATES } from "./gated.mjs";

const MANIFEST = "dist/lib-manifest.json";
const GATED_MANIFEST = "gated/lib-manifest.json";
const AGENTUI_REPORT = "dist/agentui-report.json";
const ADAPTER_ASSET = "a2ui/adapter (A2UI adapter bundle)";
const DECISIONS = "agentknowledge/decisions.yaml";
const LOCKFILE = "package-lock.json";

/**
 * The packages each asset serves, with the version it records.
 *
 * @param {string} manifestPath A lib-manifest.json.
 * @returns {Map<string, Map<string, string>>} Asset name to (package name to version).
 */
function manifestAssets(manifestPath)
{
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    return new Map(Object.entries(manifest.assets ?? {}).map(([assetName, asset]) =>
        [assetName, new Map(Object.entries(asset.packages ?? {}))]));
}

/**
 * Every asset dist/ serves, the A2UI adapter bundle included.
 *
 * @returns {Map<string, Map<string, string>>}
 */
function servedAssets()
{
    if (!existsSync(MANIFEST))
    {
        throw new Error(
            `${MANIFEST} is absent. Run \`npm run build:vendor\` first. ` +
            "An audit with no package list is not a clean audit.");
    }

    const assets = manifestAssets(MANIFEST);

    assets.set(ADAPTER_ASSET, adapterPackages());

    if ([...assets.values()].every((packages) => packages.size === 0))
    {
        throw new Error(
            `${MANIFEST} lists no packages. A gate that passes because it ` +
            "read an empty population has not been written (ADR-196).");
    }

    return assets;
}

/**
 * The packages the A2UI adapter bundle serves (Ajv's standalone runtime
 * helpers, when a validator needs them) at their installed versions. The
 * generator records them from esbuild's metafile in the agentui report.
 *
 * @returns {Map<string, string>}
 */
function adapterPackages()
{
    if (!existsSync(AGENTUI_REPORT))
    {
        throw new Error(`${AGENTUI_REPORT} is absent, so the packages the A2UI adapter serves are unknown. `
            + "Run `npm run build` first.");
    }

    const packages = JSON.parse(readFileSync(AGENTUI_REPORT, "utf8")).adapter?.packages;

    if (!Array.isArray(packages))
    {
        throw new Error(`${AGENTUI_REPORT} has no adapter.packages list. Run \`npm run build:agentui\`.`);
    }

    return new Map(packages.map((name) =>
        [name, JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version]));
}

/**
 * The versions installed for one package name, nested copies included.
 *
 * @param {string} name
 * @param {string[]} installPaths Every install path in the lockfile.
 * @param {(node: string) => string | undefined} versionAt Version at an install path; undefined when absent.
 * @returns {string[]}
 */
export function installedVersions(name, installPaths, versionAt)
{
    return installPaths
        .filter((path) => path === `node_modules/${name}` || path.endsWith(`/node_modules/${name}`))
        .map(versionAt)
        .filter((version) => version !== undefined);
}

/**
 * Assert that every asset's manifest describes what is installed now.
 *
 * A manifest written before an install audits the versions of a previous
 * build. The hashes would still verify, because the files on disk match
 * the manifest, and the audit would still ask about the wrong versions.
 * Nested copies count: a2ui-runtime serves the zod 3 nested under
 * @a2ui/web_core, not the top-level zod 4.
 *
 * @param {Map<string, Map<string, string>>} assets
 */
function assertFresh(assets)
{
    const installPaths = Object.keys(JSON.parse(readFileSync(LOCKFILE, "utf8")).packages ?? {});
    const stale = [];

    for (const [assetName, packages] of assets)
    {
        for (const [name, version] of packages)
        {
            const installed = installedVersions(name, installPaths,
                (path) => (existsSync(`${path}/package.json`) ? versionOnDisk(path) : undefined));

            if (!installed.includes(version))
            {
                stale.push(`${assetName}: ${name}@${version}, installed ${installed.join(", ") || "nowhere"}`);
            }
        }
    }

    if (stale.length > 0)
    {
        throw new Error(
            "the manifest does not describe what is installed, so this " +
            "audit would ask about the wrong versions. Run " +
            "`npm run build:vendor`.\n  " + stale.join("\n  "));
    }
}

/** Ask the registry. `npm audit` exits non-zero on findings, so read stdout. */
function auditReport()
{
    const run = spawnSync("npm", ["audit", "--json"],
        { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });

    if (run.error) { throw run.error; }

    try { return JSON.parse(run.stdout); }
    catch
    {
        throw new Error(
            "`npm audit --json` did not return JSON. The registry is " +
            "probably unreachable. An audit that asked nobody must not " +
            `report a clean result.\n${(run.stderr ?? "").slice(0, 400)}`);
    }
}

/** The ADR ids recorded in decisions.yaml. */
function adrIds()
{
    return new Set([...readFileSync(DECISIONS, "utf8").matchAll(/^- id: (ADR-\d+)$/gm)].map((match) => match[1]));
}

/** One advisory line per `via` entry, whether it names a chain or a CVE. */
function describe(via)
{
    if (typeof via === "string") { return `via ${via}`; }

    return `${via.title} [${via.severity}] ${via.url}`;
}

/** The version installed at an install path npm names in `nodes`. */
function versionOnDisk(node)
{
    return JSON.parse(readFileSync(`${node}/package.json`, "utf8")).version;
}

/**
 * The audit entries that are about a copy this asset serves.
 *
 * @param {Record<string, {nodes?: string[]}>} vulnerabilities `npm audit --json` vulnerabilities.
 * @param {Map<string, string>} served Package name to the version served.
 * @param {(node: string) => string} versionAt Version at an install path.
 * @returns {{name: string, entry: object}[]} One hit per served package.
 * @throws When an entry for a served package names no install paths.
 */
export function servedHits(vulnerabilities, served, versionAt = versionOnDisk)
{
    const hits = [];

    for (const [name, entry] of Object.entries(vulnerabilities))
    {
        if (!served.has(name)) { continue; }

        if (!Array.isArray(entry.nodes))
        {
            throw new Error(`npm audit's entry for ${name} has no \`nodes\` list, so which installed copy it `
                + "is about is unknown. Check the npm version's audit JSON format.");
        }

        if (entry.nodes.some((node) => versionAt(node) === served.get(name))) { hits.push({ name, entry }); }
    }

    return hits;
}

/**
 * Records one finding as excused by `exception`, or as a problem.
 *
 * @returns {void}
 */
function excuse(exception, finding, ctx, problems)
{
    if (!exception) { problems.push(finding); return; }

    if (isExpired(exception, ctx.today))
    {
        problems.push(`${finding} (its exception expired on ${exception.reviewBy}: re-decide with fresh evidence `
            + "or remove it)");
        return;
    }

    ctx.used.add(exceptionKey(exception));
}

/** Walks one served package's `via` list, collecting what no exception excuses. */
function chainProblems(name, entry, ctx, seen, problems)
{
    const version = ctx.served.get(name);

    for (const via of entry.via ?? [])
    {
        if (typeof via === "string") { linkProblems(name, version, via, ctx, seen, problems); continue; }

        const advisory = String(via.url ?? "").split("/").pop();

        excuse(findException(ctx.exceptions, { advisory }, name, version), `${name}@${version}: ${describe(via)}`,
            ctx, problems);
    }
}

/**
 * One `via` link from a served package to a dependency. A dependency the
 * asset also serves is followed to its own advisories; one it does not
 * bundle needs a recorded `via` exception, and an exception claiming a
 * served dependency is unbundled is itself a failure.
 */
function linkProblems(name, version, dep, ctx, seen, problems)
{
    const exception = findException(ctx.exceptions, { via: dep }, name, version);

    if (!ctx.served.has(dep))
    {
        excuse(exception, `${name}@${version}: via ${dep}, which this asset does not bundle`, ctx, problems);
        return;
    }

    if (exception)
    {
        problems.push(`${exceptionKey(exception)} says ${dep} is not bundled, but this asset serves `
            + `${dep}@${ctx.served.get(dep)}`);
        return;
    }

    if (seen.has(dep)) { return; }

    // The asset's own copy of the dependency: if no advisory covers it, the chain does not reach these bytes.
    const [hit] = servedHits({ [dep]: ctx.vulnerabilities[dep] ?? { nodes: [] } }, ctx.served, ctx.versionAt);

    if (hit) { chainProblems(dep, hit.entry, ctx, new Set([...seen, dep]), problems); }
}

/**
 * Audits one asset: each served package an advisory covers fails unless
 * everything its chain reaches is excused.
 *
 * @param {Record<string, object>} vulnerabilities `npm audit --json` vulnerabilities.
 * @param {Map<string, string>} served This asset's packages and versions.
 * @param {ReadonlyArray<import("./audit-exceptions.mjs").AuditException>} exceptions
 * @param {string} today YYYY-MM-DD.
 * @param {(node: string) => string} versionAt Version at an install path.
 * @returns {{failures: Array<{name: string, version: string, severity: string, problems: string[]}>,
 *   used: Set<string>}} The failing packages, and the keys of the exceptions applied.
 */
export function auditAsset(vulnerabilities, served, exceptions, today, versionAt = versionOnDisk)
{
    const ctx = { vulnerabilities, served, exceptions, today, versionAt, used: new Set() };
    const failures = [];

    for (const { name, entry } of servedHits(vulnerabilities, served, versionAt))
    {
        const problems = [];

        chainProblems(name, entry, ctx, new Set([name]), problems);

        if (problems.length > 0)
        {
            failures.push({ name, version: served.get(name), severity: entry.severity, problems: [...new Set(problems)] });
        }
    }

    return { failures, used: ctx.used };
}

/**
 * Audits every asset, prints what failed and what was excused.
 *
 * @param {Map<string, Map<string, string>>} assets
 * @param {string} label Printed before each asset.
 * @returns {{failed: number, used: Set<string>}}
 */
function auditAll(assets, label)
{
    validateExceptions(AUDIT_EXCEPTIONS, adrIds());
    assertFresh(assets);

    const report = auditReport();
    const today = new Date().toISOString().slice(0, 10);
    const used = new Set();
    let failed = 0;

    for (const [assetName, served] of assets)
    {
        const result = auditAsset(report.vulnerabilities ?? {}, served, AUDIT_EXCEPTIONS, today);

        result.used.forEach((key) => used.add(key));
        failed += result.failures.length;

        for (const { name, version, severity, problems } of result.failures)
        {
            console.error(`  ${name}@${version}  [${severity}]  ${label} ${assetName}`);
            problems.forEach((problem) => console.error(`      ${problem}`));
        }
    }

    for (const exception of AUDIT_EXCEPTIONS.filter((entry) => used.has(exceptionKey(entry))))
    {
        console.log(`EXCUSED: ${exceptionKey(exception)} (${exception.adr}, review by ${exception.reviewBy})`);
    }

    return { failed, used };
}

function main()
{
    const assets = servedAssets();
    const packages = [...assets.values()].reduce((sum, served) => sum + served.size, 0);

    console.log(`[vendor-audit] ${packages} package(s) served from ${assets.size} asset(s) in ${MANIFEST}`);

    const { failed, used } = auditAll(assets, "served in");
    const unused = AUDIT_EXCEPTIONS.filter((entry) => !used.has(exceptionKey(entry)));

    for (const exception of unused)
    {
        console.error(`UNUSED EXCEPTION: ${exceptionKey(exception)} matched nothing this origin serves. `
            + "The advisory was withdrawn or the version moved: remove it from scripts/audit-exceptions.mjs.");
    }

    if (failed === 0 && unused.length === 0)
    {
        console.log("PASS: no unexcused advisory against a served package.");
        return;
    }

    if (failed > 0)
    {
        console.error(`\nFAIL: ${failed} served package(s) carry an advisory no exception excuses. ` +
            "This origin publishes these files and consumers load them. A version bump here changes a " +
            "vendored filename and its SRI hash. Read test-local.sh [28] and CDN_CONTRACT.md before moving one.");
    }

    process.exit(1);
}

/**
 * Audits what a publication gate holds back, with the same exceptions.
 * A FAIL here is the gate's evidence, not a CI failure: a gate exists
 * because its files carry an advisory.
 */
function gatedMain()
{
    if (Object.keys(GATES).length === 0)
    {
        console.log("[vendor-audit] No publication gate is defined in scripts/gated.mjs; nothing is held back.");
        return;
    }

    if (!existsSync(GATED_MANIFEST))
    {
        throw new Error(`${GATED_MANIFEST} is absent. Run \`npm run build:gated\` first.`);
    }

    const assets = manifestAssets(GATED_MANIFEST);

    if (assets.size === 0) { throw new Error(`${GATED_MANIFEST} lists no assets.`); }

    const { failed } = auditAll(assets, "held in");

    if (failed > 0) { process.exit(1); }

    console.log("PASS: nothing the gate holds back carries an unexcused advisory. The gate can be reviewed for lifting.");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    try { if (process.argv.includes("--gated")) { gatedMain(); } else { main(); } }
    catch (err)
    {
        console.error(`[vendor-audit] ${String(err.message ?? err)}`);
        process.exit(1);
    }
}
