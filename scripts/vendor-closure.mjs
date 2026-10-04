#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: VendorClosure
 * 📜 PURPOSE: Build the closure of third-party frontend libraries into single
 *    self-contained files at immutable versioned URLs, and publish an SRI
 *    manifest so consumers can emit integrity attributes without transcribing
 *    hashes by hand. DEBT-SEC-4 / ADR-149.
 * 🔗 RELATES: [[CdnContract]], [[NoFabricatedReads]]
 * ⚡ FLOW: [node_modules] -> [copy | esbuild bundle] -> [dist/lib/<name>-<ver>.js]
 *          -> [dist/lib-manifest.json] -> [consumer <script src integrity>]
 *
 * WHY A SINGLE FILE PER ASSET IS A HARD CONSTRAINT, NOT A PREFERENCE
 * ------------------------------------------------------------------
 * `integrity` attaches to a <script src> tag. It cannot attach to a bare
 * import specifier inside a module, so an artifact that resolves further
 * imports at runtime defeats the point — each of those arrives unverified.
 * Serving the closure and applying SRI are therefore ONE requirement.
 *
 * The closure claim is asserted from esbuild's metafile (which marks any
 * unresolved import as external), never from grepping the output. A regex
 * pass was tried first and reported three false positives from a class
 * method named `import`.
 */

import { createHash } from "node:crypto";
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { build } from "esbuild";

const OUT_DIR = "dist/lib";
const MANIFEST = "dist/lib-manifest.json";

/**
 * The assets we serve. `kind` decides the strategy:
 *
 *   "copy"   the package already ships a self-contained UMD/IIFE build.
 *   "bundle" the package is ESM; esbuild inlines its closure into an IIFE
 *            that assigns `global`.
 *
 * Versions are pinned as devDependencies so the lockfile pins them and
 * `npm audit` covers them — a vendored library with a known CVE becomes our
 * problem the moment we serve it.
 */
const ASSETS = [
    {
        name: "dompurify",
        kind: "copy",
        from: "node_modules/dompurify/dist/purify.min.js",
        global: "DOMPurify",
        // First, deliberately. Every other asset degrades when substituted;
        // a substituted sanitizer becomes the attack.
        note: "HTML sanitizer — highest-value asset to remove third-party trust from",
    },
    {
        name: "maxgraph",
        kind: "bundle",
        entry: 'export * from "@maxgraph/core";',
        global: "maxgraph",
        note: "ESM-only; the apps' canvas already reads window.maxgraph",
    },
    {
        name: "signalr",
        kind: "copy",
        from: "node_modules/@microsoft/signalr/dist/browser/signalr.min.js",
        global: "signalR",
    },
    {
        name: "cytoscape",
        kind: "copy",
        from: "node_modules/cytoscape/dist/cytoscape.min.js",
        global: "cytoscape",
        note: "absent from the original request; found by scanning the apps repo",
    },
    {
        name: "chart.js",
        kind: "copy",
        from: "node_modules/chart.js/dist/chart.umd.min.js",
        global: "Chart",
        note: "also served unversioned at /vendor/chart.js/ for existing consumers",
    },
    {
        // The stylesheet is copied VERBATIM — never rewritten to drop the
        // .ttf fallbacks it references, even though no browser that supports
        // woff2 will ever fetch one. Byte-identical output means anyone can
        // verify provenance by diffing against the npm package; editing it
        // to save ~700KB would trade that for nothing a user notices.
        //
        // CSS + webfonts, so it cannot be one file. The STYLESHEET carries an
        // SRI hash; the @font-face files it pulls cannot (CSS has no way to
        // express integrity for them). That residual is acceptable where it
        // would not be for executable code: a substituted font renders wrong
        // glyphs, it does not run.
        //
        // 6.5.1 over the 6.4.0 some pages use — verified a strict superset of
        // every fa- class the apps reference (2518 defined, 92 used, zero
        // missing), so consolidating loses nothing.
        name: "font-awesome",
        kind: "tree",
        version: "6.5.1",
        pkg: "@fortawesome/fontawesome-free",
        entry: "css/all.min.css",
        include: [
            { from: "node_modules/@fortawesome/fontawesome-free/css/all.min.css", to: "css/all.min.css" },
            { from: "node_modules/@fortawesome/fontawesome-free/webfonts", to: "webfonts" },
        ],
        note: "consolidates the two versions the apps load (6.4.0 and 6.5.1)",
    },
];

function versionOf(pkg)
{
    const path = `node_modules/${pkg}/package.json`;
    return JSON.parse(readFileSync(path, "utf8")).version;
}

function copyTree(asset, baseDir)
{
    let entryPath = null;

    for (const item of asset.include)
    {
        const dest = join(baseDir, item.to);

        if (statSync(item.from).isDirectory())
        {
            mkdirSync(dest, { recursive: true });

            for (const file of readdirSync(item.from))
            {
                copyFileSync(join(item.from, file), join(dest, file));
            }
        }
        else
        {
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(item.from, dest);
            if (item.to === asset.entry) { entryPath = dest; }
        }
    }

    return entryPath;
}

function packageOf(asset)
{
    if (asset.pkg) { return asset.pkg; }

    if (asset.kind === "copy")
    {
        // node_modules/<pkg...>/dist/... -> <pkg...>
        const parts = asset.from.split("/").slice(1);
        return parts[0].startsWith("@") ? `${parts[0]}/${parts[1]}` : parts[0];
    }
    return asset.pkg ?? `@${asset.name}/core`;
}

function sriOf(buffer)
{
    return "sha384-" + createHash("sha384").update(buffer).digest("base64");
}

/** Bundle an ESM package to a self-contained IIFE; assert the closure. */
async function bundleAsset(asset, outFile)
{
    const result = await build({
        stdin: {
            contents: asset.entry,
            resolveDir: process.cwd(),
            loader: "js",
        },
        bundle: true,
        format: "iife",
        globalName: asset.global,
        minify: true,
        outfile: outFile,
        metafile: true,
        logLevel: "silent",
    });

    // THE closure assertion. esbuild marks anything it could not resolve as
    // external; an external specifier means a second asset will arrive at
    // runtime, unverified, and the SRI on this file guarantees nothing about it.
    const externals = new Set();

    for (const input of Object.values(result.metafile.inputs))
    {
        for (const imp of input.imports ?? [])
        {
            if (imp.external) { externals.add(imp.path); }
        }
    }

    if (externals.size > 0)
    {
        throw new Error(
            `[vendor-closure] ${asset.name} is NOT closed — ` +
            `${externals.size} external specifier(s): ${[...externals].join(", ")}. ` +
            `Serving it would leave the same hole one level down, because ` +
            `integrity cannot attach to a runtime import.`);
    }

    return Object.keys(
        Object.values(result.metafile.outputs)[0].inputs).length;
}

async function main()
{
    mkdirSync(OUT_DIR, { recursive: true });

    const manifest = { generated: null, assets: {} };

    for (const asset of ASSETS)
    {
        const pkg = packageOf(asset);
        const version = versionOf(pkg);
        const fileName = `${asset.name}-${version}.js`;
        const outFile = join(OUT_DIR, fileName);

        let inputs = 1;

        if (asset.kind === "tree")
        {
            const baseDir = join(OUT_DIR, `${asset.name}-${version}`);
            const entryFile = copyTree(asset, baseDir);
            const bytes = readFileSync(entryFile);

            manifest.assets[asset.name] = {
                version,
                url: `/lib/${asset.name}-${version}/${asset.entry}`,
                integrity: sriOf(bytes),
                type: "stylesheet",
                bytes: bytes.length,
                // Honest: the stylesheet is hashed, the fonts it pulls are not.
                closure: "stylesheet-hashed; @font-face files are not SRI-able",
                ...(asset.note ? { note: asset.note } : {}),
            };

            const kb = String(Math.round(bytes.length / 1024)).padStart(4);
            console.log(`  ${asset.name.padEnd(12)} ${version.padEnd(9)} ${kb} KB (css + webfonts)`);
            continue;
        }

        if (asset.kind === "copy")
        {
            mkdirSync(dirname(outFile), { recursive: true });
            copyFileSync(asset.from, outFile);
        }
        else
        {
            inputs = await bundleAsset(asset, outFile);
        }

        const bytes = readFileSync(outFile);

        manifest.assets[asset.name] = {
            version,
            url: `/lib/${fileName}`,
            integrity: sriOf(bytes),
            global: asset.global,
            bytes: bytes.length,
            closure: "complete",
            ...(asset.note ? { note: asset.note } : {}),
        };

        const kb = String(Math.round(bytes.length / 1024)).padStart(4);
        const detail = asset.kind === "bundle" ? ` (${inputs} inputs, 0 external)` : "";
        console.log(`  ${asset.name.padEnd(12)} ${version.padEnd(9)} ${kb} KB${detail}`);
    }

    // Stamped last so a failed run leaves no manifest claiming success —
    // a degraded build must not report success (ADR-148, clause 1).
    manifest.generated = new Date().toISOString();
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");

    console.log(`  manifest -> ${MANIFEST}`);
}

main().catch((err) =>
{
    console.error(String(err.message ?? err));
    process.exit(1);
});
