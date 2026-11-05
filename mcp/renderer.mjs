/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * ⚓ COMPONENT: McpRendererPage
 * 📜 PURPOSE: renderer.html, the thin page an MCP server returns as its
 *    ui:// resource text (spec §5.3, decision M2). Kept apart from the
 *    build so it can be tested without esbuild.
 * 🔗 RELATES: [[McpViewBuild]], [[McpView]]
 * ⚡ FLOW: [origin + pinned runtime with SRI] -> [rendererHtml] -> [HTML]
 */

/** The web fonts the theme names; renderer.meta.json allows these origins. */
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
