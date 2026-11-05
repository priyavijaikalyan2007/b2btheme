#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiPlaygroundBuild
 * 📜 PURPOSE: Build the A2UI playground (#30 spec §4): the checker's
 *    generated validator, the page bundle, the HTML (with the vendored
 *    CodeMirror and A2UI runtime files read from dist/lib-manifest.json),
 *    the styles, and the scenarios with their index. Into agentdemo/.out/
 *    for local use, or with --publish into dist/demo/a2ui/ (ADR-253).
 *
 * The page bundles no npm package. Google's renderer arrives as the
 * vendored, audited /lib/a2ui-runtime global; the three @a2ui specifiers
 * the page imports resolve to it, and the metafile proves nothing else
 * from node_modules was bundled. Local and public are the same page.
 * 🔗 RELATES: [[A2uiPlayground]], [[AgentUiMessageValidator]]
 * ⚡ FLOW: [dist/ + agentdemo/page + scenarios] -> [agentdemo/.out/]
 *
 * Usage: node agentdemo/build.mjs              -> agentdemo/.out/
 *        node agentdemo/build.mjs --publish    -> dist/demo/a2ui/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeMessageValidator } from "../scripts/agentui/message-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Where a local build writes, and where `--publish` writes, relative to the repository root. */
const LOCAL_DIR = path.join("agentdemo", ".out");
export const PUBLISHED_DIR = path.join("dist", "demo", "a2ui");

/**
 * The @a2ui specifiers the page imports, each as a module reading the
 * vendored runtime's global (scripts/vendor-closure.mjs, a2ui-runtime).
 */
const RUNTIME_MODULES = {
    "@a2ui/web_core/v0_9": "export const { Catalog, MessageProcessor } = runtime();",
    "@a2ui/web_core/v0_9/basic_catalog":
        "const r = runtime(); export const BASIC_FUNCTIONS = r.BASIC_FUNCTIONS; export const basicCatalog = r.coreBasicCatalog;",
    "@a2ui/lit/v0_9": "export const { A2uiSurface, basicCatalog } = runtime();",
};

const RUNTIME_GLOBAL = `function runtime()
{
    if (!globalThis.A2uiRuntime) { throw new Error("A2uiRuntime is not loaded: index.html loads /lib/a2ui-runtime first."); }
    return globalThis.A2uiRuntime;
}
`;

/** Resolves the page's @a2ui imports to the vendored runtime; any other @a2ui specifier fails the build. */
const vendoredRuntime = {
    name: "vendored-a2ui-runtime",
    setup(build)
    {
        build.onResolve({ filter: /^@a2ui\// }, (args) =>
        {
            if (!(args.path in RUNTIME_MODULES))
            {
                return { errors: [{ text: `${args.path} is not in the vendored a2ui-runtime; add it to the asset first.` }] };
            }

            return { path: args.path, namespace: "a2ui-runtime" };
        });
        build.onLoad({ filter: /.*/, namespace: "a2ui-runtime" },
            (args) => ({ contents: RUNTIME_GLOBAL + RUNTIME_MODULES[args.path], loader: "js" }));
    },
};

/**
 * Builds the playground.
 *
 * @param {string} repoRoot - Repository root.
 * @param {string} [outRel] - Output directory relative to the root; agentdemo/.out by default. Only a
 *   local build gets a source map: the map is about 27 MB, over Workers' 25 MiB limit per file.
 * @returns {Promise<string>} The output directory.
 */
export async function buildPlayground(repoRoot, outRel = LOCAL_DIR)
{
    const out = path.join(repoRoot, outRel);
    const page = path.join(repoRoot, "agentdemo", "page");
    const validator = await writeMessageValidator(repoRoot);
    // Imported here, not at the top: esbuild refuses to load under jsdom, where some tests run.
    const esbuild = await import("esbuild");

    const result = await esbuild.build({ entryPoints: [path.join(page, "main.ts")], outfile: path.join(out, "main.js"),
        bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true,
        sourcemap: outRel === LOCAL_DIR, metafile: true, logLevel: "silent", alias: { "virtual:a2ui-message-validator": validator },
        plugins: [vendoredRuntime], define: { "process.env.NODE_ENV": '"development"' } });
    const bundled = Object.keys(result.metafile.inputs).filter((input) => input.includes("node_modules/"));

    if (bundled.length > 0)
    {
        throw new Error(`The playground bundled npm code, which the vendor audit does not see: ${bundled.join(", ")}`);
    }

    fs.writeFileSync(path.join(out, "index.html"), pageHtml(repoRoot, page));
    fs.copyFileSync(path.join(page, "playground.css"), path.join(out, "playground.css"));
    copyScenarios(path.join(repoRoot, "agentdemo", "scenarios"), path.join(out, "scenarios"));

    return out;
}

/** index.html with the vendored CodeMirror and A2UI runtime from dist/lib-manifest.json, never a hard-coded version. */
function pageHtml(repoRoot, page)
{
    const manifestPath = path.join(repoRoot, "dist", "lib-manifest.json");

    if (!fs.existsSync(manifestPath)) { throw new Error("dist/lib-manifest.json is absent. Run `npm run build`."); }

    const assets = JSON.parse(fs.readFileSync(manifestPath, "utf8")).assets ?? {};
    const codemirror = assets.codemirror6?.url;
    const runtime = assets["a2ui-runtime"];

    if (typeof codemirror !== "string") { throw new Error("dist/lib-manifest.json has no codemirror6 asset URL."); }
    if (typeof runtime?.url !== "string" || typeof runtime.integrity !== "string")
    {
        throw new Error("dist/lib-manifest.json has no a2ui-runtime URL and integrity. Run `npm run build:vendor`.");
    }

    return fs.readFileSync(path.join(page, "index.html"), "utf8").replace("{{CODEMIRROR_URL}}", codemirror)
        .replace("{{A2UI_RUNTIME_URL}}", runtime.url).replace("{{A2UI_RUNTIME_INTEGRITY}}", runtime.integrity);
}

/** Copies scenario and director files, and writes index.json: [{ name, title, provenance }]. */
function copyScenarios(from, to)
{
    fs.mkdirSync(to, { recursive: true });

    const names = fs.existsSync(from)
        ? fs.readdirSync(from).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -".jsonl".length)).sort()
        : [];
    const index = names.map((name) =>
    {
        const text = fs.readFileSync(path.join(from, `${name}.jsonl`), "utf8");
        const header = JSON.parse(text.split("\n")[0]);

        fs.writeFileSync(path.join(to, `${name}.jsonl`), text);
        fs.copyFileSync(path.join(from, `${name}.director.json`), path.join(to, `${name}.director.json`));

        return { name, title: header.title, provenance: header.provenance };
    });

    fs.writeFileSync(path.join(to, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    const outRel = process.argv.includes("--publish") ? PUBLISHED_DIR : undefined;

    console.log(`[playground] built ${await buildPlayground(path.resolve(HERE, ".."), outRel)}`);
}
