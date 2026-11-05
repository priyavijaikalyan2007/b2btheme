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

/**
 * Each gate: the issue that holds files back, and why. Empty since gate #36
 * lifted (ADR-252); the mechanism stays for the next advisory that has no
 * exception (scripts/audit-exceptions.mjs).
 *
 * @type {Record<string, string>}
 */
export const GATES = {};

/**
 * dist-relative path prefixes that a gate holds back.
 *
 * @type {Array<{prefix: string, gate: string}>}
 */
export const GATED = [];

/**
 * The paths a gate holds back.
 *
 * @param {string[]} paths dist-relative paths, no leading slash.
 * @param {Array<{prefix: string, gate: string}>} gated The gated prefixes.
 * @returns {Array<{path: string, gate: string}>} One entry per match.
 */
export function gatedLeaks(paths, gated = GATED)
{
    return paths.flatMap((path) =>
        gated.filter(({ prefix }) => path.startsWith(prefix)).map(({ gate }) => ({ path, gate })));
}
