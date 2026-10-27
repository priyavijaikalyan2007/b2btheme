#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: A2uiPlaygroundBuild
 * 📜 PURPOSE: Build the A2UI playground into agentdemo/.out/ (#30 spec §4):
 *    the checker's generated validator, the page bundle, the HTML (with the
 *    vendored CodeMirror file name read from dist/lib-manifest.json), the
 *    styles, and the scenarios with their index. Never writes to dist/.
 * 🔗 RELATES: [[A2uiPlayground]], [[AgentUiMessageValidator]]
 * ⚡ FLOW: [dist/ + agentdemo/page + scenarios] -> [agentdemo/.out/]
 *
 * Usage: node agentdemo/build.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeMessageValidator } from "../scripts/agentui/message-validator.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the playground.
 *
 * @param {string} repoRoot - Repository root.
 * @returns {Promise<string>} The output directory.
 */
export async function buildPlayground(repoRoot)
{
    const out = path.join(repoRoot, "agentdemo", ".out");
    const page = path.join(repoRoot, "agentdemo", "page");
    const validator = await writeMessageValidator(repoRoot);
    // Imported here, not at the top: esbuild refuses to load under jsdom, where some tests run.
    const esbuild = await import("esbuild");

    await esbuild.build({ entryPoints: [path.join(page, "main.ts")], outfile: path.join(out, "main.js"),
        bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true, sourcemap: true,
        logLevel: "silent", alias: { "virtual:a2ui-message-validator": validator },
        define: { "process.env.NODE_ENV": '"development"' } });

    fs.writeFileSync(path.join(out, "index.html"), pageHtml(repoRoot, page));
    fs.copyFileSync(path.join(page, "playground.css"), path.join(out, "playground.css"));
    copyScenarios(path.join(repoRoot, "agentdemo", "scenarios"), path.join(out, "scenarios"));

    return out;
}

/** index.html with the vendored CodeMirror URL from dist/lib-manifest.json, never a hard-coded version. */
function pageHtml(repoRoot, page)
{
    const manifestPath = path.join(repoRoot, "dist", "lib-manifest.json");

    if (!fs.existsSync(manifestPath)) { throw new Error("dist/lib-manifest.json is absent. Run `npm run build`."); }

    const url = JSON.parse(fs.readFileSync(manifestPath, "utf8")).assets?.codemirror6?.url;

    if (typeof url !== "string") { throw new Error("dist/lib-manifest.json has no codemirror6 asset URL."); }

    return fs.readFileSync(path.join(page, "index.html"), "utf8").replace("{{CODEMIRROR_URL}}", url);
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
    console.log(`[playground] built ${await buildPlayground(path.resolve(HERE, ".."))}`);
}
