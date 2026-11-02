/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiNoManifest
 * 📜 PURPOSE: The components with no manifest, each with its reason
 *    (readiness step 5, ADR-243, specs/agentui-step5.prd.md). Read by
 *    scripts/build-manifest.js, which fails when a component directory has
 *    neither a manifest nor an entry here, or has both.
 * 🔗 RELATES: [[AgentUiMigration]], [[CapabilityManifest]]
 * ⚡ FLOW: [components/<name>/] -> [manifest | NO_MANIFEST | AWAITING_MANIFEST] -> [build-manifest gate]
 */

/** Components an agent would not sensibly render, so they have no manifest: name -> reason. */
export const NO_MANIFEST = new Map([
    ["authcard", "It collects passwords and one-time codes, which must never reach an agent; sign-in belongs to "
        + "the host."],
    ["bannerbar", "A page-level notice fixed to the viewport; an agent's notice belongs in its surface (Text, "
        + "StatusBadge, EmptyState)."],
    ["commandpalette", "A page-wide shortcut and overlay over the host's commands."],
    ["contextmenu", "Anchored to a host page element and positioned over the page; an agent has no page element."],
    ["dynamiccanvas", "The Dynamic UI runtime's own canvas, which hosts components itself: a peer of an A2UI "
        + "surface, not something inside one."],
    ["guidedtour", "It walks through host page elements by selector."],
    ["helptooltip", "Anchored to a host page element and positioned over the page; an agent has no page element."],
    ["hovercard", "Anchored to a host page element and positioned over the page; an agent has no page element."],
    ["logutility", "Not UI: page logging."],
    ["magnifier", "It magnifies a host page element under the pointer; an agent has no page element."],
    ["markdownrenderer", "A library with no element of its own; an agent renders markdown with DocViewer, which "
        + "is in the catalog and renders through it."],
    ["smarttextinput", "Behaviour, not UI: it attaches to an input the host owns, and the host renders the "
        + "popover."],
    ["themeinit", "Not UI: theme start-up."],
    ["toast", "A page-level notice fixed to the viewport; an agent's notice belongs in its surface (Text, "
        + "StatusBadge, EmptyState)."],
]);

/**
 * Components step 5 gives a manifest in a later batch (spec §5). MAY ONLY
 * SHRINK, and is empty when step 5 is done; never add a name to make a new
 * component pass.
 */
export const AWAITING_MANIFEST = new Set([
    // S5-4: the dialogs, with a contained mode (D1).
    "formdialog",
    "progressmodal",
]);

/**
 * The gate: each component directory has a manifest or exactly one list
 * entry, and each entry names a directory without a manifest.
 *
 * @param {string[]} dirs - Every component directory name.
 * @param {Set<string>} withManifest - The directories that have <name>.manifest.ts.
 * @returns {string[]} One sentence per problem; empty when the fleet is covered.
 */
export function manifestCoverageProblems(dirs, withManifest)
{
    const problems = [];
    const listed = (name) => NO_MANIFEST.has(name) || AWAITING_MANIFEST.has(name);

    for (const name of dirs.filter((d) => !withManifest.has(d) && !listed(d)))
    {
        problems.push(`components/${name} has no manifest. Write components/${name}/${name}.manifest.ts, or, `
            + "if an agent would not sensibly render it, add it to NO_MANIFEST in scripts/agentui/no-manifest.mjs "
            + "with its reason.");
    }

    for (const name of [...NO_MANIFEST.keys(), ...AWAITING_MANIFEST].filter((n) => withManifest.has(n)))
    {
        problems.push(`${name} has a manifest and is still listed in scripts/agentui/no-manifest.mjs. Remove the `
            + "entry.");
    }

    for (const name of [...NO_MANIFEST.keys(), ...AWAITING_MANIFEST].filter((n) => !dirs.includes(n)))
    {
        problems.push(`${name} is listed in scripts/agentui/no-manifest.mjs, but components/${name} does not `
            + "exist. Remove the entry.");
    }

    return problems;
}
