/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * ⚓ COMPONENT: McpViewBuild
 * 📜 PURPOSE: Builds the MCP Apps view (#19 M2): mcp/src/view.ts as one
 *    ESM file, and renderer.html, the thin page a server returns as its
 *    ui:// resource text (spec §5.3). Both are gated (#36), so they go to
 *    gated/mcp/, never dist/.
 * 🔗 RELATES: [[McpView]], [[PublicationGate]], [[VendorClosure]]
 * ⚡ FLOW: [gated/lib-manifest.json] -> [rendererHtml] -> [gated/mcp/renderer.html]
 *          [mcp/src/view.ts] -> [esbuild] -> [gated/mcp/view/v1.js]
 *
 * The view bundles only mcp/src/: the runtime arrives as the pinned /lib/
 * globals and the adapter by import() from its own CDN path, so a view
 * that bundled either would serve a second, unpinned copy. The metafile
 * proves it.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

import { CATALOG_ORIGIN } from "../scripts/agentui/catalog.mjs";
import { GATED_DIR } from "../scripts/gated.mjs";

const SRC = "mcp/src";
const VIEW_OUT = join(GATED_DIR, "mcp/view/v1.js");
const PAGE_OUT = join(GATED_DIR, "mcp/renderer.html");
const MANIFEST = join(GATED_DIR, "lib-manifest.json");
/** The runtime, in load order: the host bridge, then A2UI. */
const RUNTIME = ["mcp-ext-apps", "a2ui-runtime"];
const FONTS = "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;"
    + "1,14..32,100..900&family=JetBrains+Mono:wght@400;700&display=swap";

/**
 * The renderer page. URLs are absolute: hosts load these bytes by srcdoc,
 * where a root-relative URL would resolve against the host. It sets no
 * theme; the view applies the host's after ui/initialize (spec §6).
 *
 * @param {string} origin The CDN origin, no trailing slash.
 * @param {Array<{url: string, integrity: string}>} libs The runtime, in load order.
 * @returns {string} The HTML.
 */
export function rendererHtml(origin, libs)
{
    const scripts = libs.map(({ url, integrity }) =>
        `<script src="${origin}${url}" integrity="${integrity}" crossorigin="anonymous"></script>`);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Outcrop</title>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="${origin}/css/custom.css">
<link rel="stylesheet" href="${origin}/icons/bootstrap-icons.css">
<style>
body { margin: 0; padding: 0.5rem; background: var(--theme-surface-bg); color: var(--theme-text-primary); }
.outcrop-mcp-surface + .outcrop-mcp-surface { margin-top: 0.75rem; }
</style>
${scripts.join("\n")}
<script type="module" src="${origin}/mcp/view/v1.js"></script>
</head>
<body>
<main id="outcrop-mcp"></main>
</body>
</html>
`;
}

/** Builds both files; fails if the gated runtime is not built or the view bundled anything outside mcp/src. */
async function main()
{
    if (!existsSync(MANIFEST)) { throw new Error(`${MANIFEST} is absent. Run npm run build:gated.`); }

    const assets = JSON.parse(readFileSync(MANIFEST, "utf8")).assets;
    const libs = RUNTIME.map((name) =>
    {
        if (!assets[name]) { throw new Error(`${MANIFEST} has no ${name}. Run npm run build:gated.`); }

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
