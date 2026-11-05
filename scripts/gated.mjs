/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 * ⚓ COMPONENT: PublicationGate
 * 📜 PURPOSE: The files that are built and tested but must not be served
 *    yet, each with the issue that holds them back (#19, decision M1).
 * 🔗 RELATES: [[VendorClosure]], [[CdnContract]]
 * ⚡ FLOW: [build:gated] -> [gated/<dist path>] -> [tests serve gated/]
 *          [dist/] -> [check-gated.mjs, test-local.sh [31]] -> no leak
 *
 * WHY A DIRECTORY AND NOT A FLAG ON THE DEPLOY
 * -------------------------------------------
 * Cloudflare deploys whatever `npm run build` leaves in dist/. A file held
 * back by a gate therefore must never be written there at all; keeping it
 * in a git-ignored sibling whose layout mirrors dist/ means lifting a gate
 * is one reviewed change that moves the prefix, not a rewrite.
 */

/** Where gated files are built. Paths inside mirror dist/. */
export const GATED_DIR = "gated";

/** Each gate: the issue that holds files back, and why. */
export const GATES = {
    "#36": "@a2ui/web_core 0.14.0 and 0.15.0 require zod 3, and every zod 3 release is inside "
        + "GHSA-mrhx-c7xc-m3w5 (<4.6.6). The MCP Apps view serves web_core, so it waits for "
        + "web_core on zod 4 or the advisory's withdrawal (advisory-database#10750).",
};

/** dist-relative path prefixes that a gate holds back. */
export const GATED = [
    { prefix: "lib/a2ui-runtime-", gate: "#36" },
    { prefix: "lib/mcp-ext-apps-", gate: "#36" },
    { prefix: "mcp/renderer.html", gate: "#36" },
    { prefix: "mcp/view/", gate: "#36" },
];

/**
 * The paths a gate holds back.
 *
 * @param {string[]} paths dist-relative paths, no leading slash.
 * @returns {Array<{path: string, gate: string}>} One entry per match.
 */
export function gatedLeaks(paths)
{
    return paths.flatMap((path) =>
        GATED.filter(({ prefix }) => path.startsWith(prefix)).map(({ gate }) => ({ path, gate })));
}
