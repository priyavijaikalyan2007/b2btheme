#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DynamicUIRuntime / BuildPipeline
 * PURPOSE: Aggregates every components/<name>/<name>.manifest.ts into a single
 *    dist/capability-manifest.json, filling weight.js from the compiled bundle
 *    size so the canvas mount budget uses real numbers rather than the
 *    placeholders authors write.
 *
 *    This is the artefact ADR-142 promises and that DYNAMIC_UI_GUIDE.md,
 *    CAPABILITY_MANIFEST.md and DYNAMIC_UI_MIGRATION.md all reference.
 * RELATES: [[CapabilityManifest]], [[DynamicUIRuntime]], [[BuildPipeline]]
 * FLOW: [components/*.manifest.ts] -> [build-manifest] -> [capability-manifest.json]
 * SECURITY: Manifests are transpiled with the TypeScript compiler and loaded
 *    as real ES modules. No string is ever evaluated as code.
 * ----------------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const ts = require("typescript");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const COMPONENTS = path.join(ROOT, "components");
const DIST = path.join(ROOT, "dist");
const OUT = path.join(DIST, "capability-manifest.json");

/**
 * Transpiles a manifest to an ES module and imports it.
 *
 * Type-only imports are erased by the compiler, so the emitted module has no
 * runtime dependencies and loads standalone. Using the real compiler and a
 * real import keeps this free of string evaluation.
 *
 * @param {string} file    - Absolute path to the manifest.
 * @param {string} tempDir - Directory for the transpiled output.
 * @returns {Promise<object>} The exported manifest object.
 */
async function loadManifest(file, tempDir)
{
    const source = fs.readFileSync(file, "utf-8");

    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020,
            isolatedModules: true,
        },
        fileName: file,
    });

    const out = path.join(tempDir, `${path.basename(file, ".ts")}.mjs`);
    fs.writeFileSync(out, outputText, "utf-8");

    const loaded = await import(pathToFileURL(out).href);
    const manifest = Object.values(loaded).find(
        (v) => v && typeof v === "object" && "factory" in v);

    if (!manifest)
    {
        throw new Error(
            `[build-manifest] ${path.relative(ROOT, file)} exports no manifest. `
            + "It must export one object literal with a `factory` field.");
    }

    return manifest;
}

/**
 * Returns the compiled bundle size for a component, in bytes.
 *
 * @param {string} name - Component directory name.
 * @returns {number} Byte count, or 0 when the component has not been built.
 */
function builtSize(name)
{
    const file = path.join(DIST, "components", name, `${name}.js`);

    return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

/**
 * Validates the fields the runtime depends on.
 *
 * Full validation lives in runtime/src/registry.ts; this catches the
 * aggregation-time mistakes that would otherwise ship a malformed artefact.
 *
 * @param {object} manifest - Candidate manifest.
 * @param {string} dir      - Component directory name.
 * @returns {string[]} Problems found.
 */
function check(manifest, dir)
{
    const problems = [];

    if (manifest.name !== dir)
    {
        problems.push(
            `${dir}: manifest.name is "${manifest.name}" but the folder is `
            + `"${dir}" — they must match, the folder name is the registry key`);
    }

    for (const key of ["factory", "label", "icon", "category", "conformance"])
    {
        if (typeof manifest[key] !== "string" || manifest[key].length === 0)
        {
            problems.push(`${dir}: ${key} must be a non-empty string`);
        }
    }

    for (const key of ["affords", "emits", "accepts", "actions", "stateKeys"])
    {
        if (!Array.isArray(manifest[key]))
        {
            problems.push(`${dir}: ${key} must be an array`);
        }
    }

    return problems;
}

/** Aggregates every manifest and writes the artefact. */
async function main()
{
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "manifest-"));

    try
    {
        const dirs = fs.readdirSync(COMPONENTS, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .sort();

        const manifests = [];
        const problems = [];
        let missingBuild = 0;

        for (const dir of dirs)
        {
            const file = path.join(COMPONENTS, dir, `${dir}.manifest.ts`);

            if (!fs.existsSync(file))
            {
                continue;
            }

            const manifest = await loadManifest(file, tempDir);

            problems.push(...check(manifest, dir));

            // Real bytes beat the authored placeholder.
            const size = builtSize(dir);

            if (size > 0)
            {
                manifest.weight = { ...manifest.weight, js: size };
            }
            else
            {
                missingBuild += 1;
            }

            manifests.push(manifest);
        }

        if (problems.length > 0)
        {
            console.error(`[build-manifest] ${problems.length} problem(s):`);
            problems.forEach((p) => console.error(`  - ${p}`));
            process.exit(1);
        }

        fs.mkdirSync(DIST, { recursive: true });
        fs.writeFileSync(OUT, `${JSON.stringify({
            schemaVersion: 1,
            components: manifests,
        }, null, 2)}\n`, "utf-8");

        console.log(
            `[build-manifest] wrote ${manifests.length} manifests -> `
            + path.relative(ROOT, OUT));

        if (missingBuild > 0)
        {
            console.log(
                `[build-manifest] ${missingBuild} component(s) had no compiled `
                + "bundle; their authored weight.js was kept.");
        }
    }
    finally
    {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

main().catch((err) =>
{
    console.error(err.message);
    process.exit(1);
});
