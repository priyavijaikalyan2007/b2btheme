/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * ⚓ COMPONENT: McpViewBuild
 * 📜 PURPOSE: Builds the MCP Apps view (#19 M2): mcp/src/view.ts as one
 *    ESM file, and renderer.html, the thin page a server returns as its
 *    ui:// resource text (spec §5.3). Served from dist/mcp/ since gate #36
 *    lifted (ADR-252).
 * 🔗 RELATES: [[McpView]], [[McpRendererPage]], [[VendorClosure]]
 * ⚡ FLOW: [dist/lib-manifest.json] -> [rendererHtml] -> [dist/mcp/renderer.html]
 *          [mcp/src/view.ts] -> [esbuild] -> [dist/mcp/view/v1.js]
 *
 * The view bundles only mcp/src/: the runtime arrives as the pinned /lib/
 * globals and the adapter by import() from its own CDN path, so a view
 * that bundled either would serve a second, unpinned copy. The metafile
 * proves it.
 *
 * It runs after build:agentui in `npm run build`: the generator swaps
 * dist/mcp/ in whole (for renderer.meta.json), which removes these files.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { CATALOG_ORIGIN } from "../scripts/agentui/catalog.mjs";
import { rendererHtml } from "./renderer.mjs";

const SRC = "mcp/src";
const VIEW_OUT = "dist/mcp/view/v1.js";
const PAGE_OUT = "dist/mcp/renderer.html";
const MANIFEST = "dist/lib-manifest.json";
/** The runtime, in load order: the host bridge, then A2UI. */
const RUNTIME = ["mcp-ext-apps", "a2ui-runtime"];
/** Builds both files; fails if the runtime is not vendored or the view bundled anything outside mcp/src. */
async function main()
{
    if (!existsSync(MANIFEST)) { throw new Error(`${MANIFEST} is absent. Run npm run build:vendor.`); }

    const assets = JSON.parse(readFileSync(MANIFEST, "utf8")).assets;
    const libs = RUNTIME.map((name) =>
    {
        if (!assets[name]) { throw new Error(`${MANIFEST} has no ${name}. Run npm run build:vendor.`); }

        return { url: assets[name].url, integrity: assets[name].integrity };
    });

    const result = await build({ entryPoints: [join(SRC, "view.ts")], bundle: true, format: "esm", target: "es2022",
        minify: true, legalComments: "eof", metafile: true, outfile: VIEW_OUT, logLevel: "warning" });
    const outside = Object.keys(result.metafile.inputs).filter((input) => relative(SRC, input).startsWith(".."));

    if (outside.length > 0) { throw new Error(`The view bundled code outside ${SRC}: ${outside.join(", ")}`); }

    mkdirSync(dirname(PAGE_OUT), { recursive: true });
    writeFileSync(PAGE_OUT, rendererHtml(CATALOG_ORIGIN, libs));
    console.log(`[mcp-build] ${VIEW_OUT} (${Object.keys(result.metafile.inputs).length} modules), ${PAGE_OUT}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    main().catch((err) => { console.error(`[mcp-build] ${err.message}`); process.exit(1); });
}
