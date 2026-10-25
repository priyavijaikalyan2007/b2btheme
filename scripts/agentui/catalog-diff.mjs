/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiCatalogDiff
 * 📜 PURPOSE: Classify catalog changes as breaking or additive so hosts we cannot
 *    see are never broken without a version bump. Spec §5.3.
 * 🔗 RELATES: [[AgentUiCatalog]], [[VersionRule]]
 * ⚡ FLOW: [committed baseline] -> [diffCatalogs] -> [breaking/additive changes]
 *          -> [versionProblem] -> [CATALOG_MAJOR validation]
 */

/** Derived unions, rebuilt from components every time. */
const DERIVED_DEFS = new Set(["anyComponent", "anyFunction"]);

/**
 * Compares two catalog files.
 *
 * @param previous - The committed baseline.
 * @param next     - The freshly generated catalog.
 * @returns Human-readable breaking and additive changes.
 */
// @entrypoint
export function diffCatalogs(previous, next)
{
    const out = { breaking: [], additive: [] };

    diffMap(previous.components, next.components, (n) => `component ${n}`, out, (n) =>
        diffComponent(n, previous.components[n], next.components[n], out));
    diffMap(previous.functions ?? {}, next.functions ?? {}, (n) => `function ${n}`, out, (n) =>
        sameish(previous.functions[n], next.functions[n]) || out.breaking.push(`function ${n} changed`));
    diffDefs(previous.$defs ?? {}, next.$defs ?? {}, out);

    return out;
}

/** Removed keys are breaking, added keys additive, shared keys compared by `onShared`. */
function diffMap(prev, next, format, out, onShared)
{
    for (const n of Object.keys(prev).filter((k) => !(k in next))) { out.breaking.push(`${format(n)} removed`); }
    for (const n of Object.keys(next).filter((k) => !(k in prev))) { out.additive.push(`${format(n)} added`); }
    for (const n of Object.keys(prev).filter((k) => k in next)) { onShared(n); }
}

/** Compares one component: props, then required. Re-exports compare whole. */
function diffComponent(name, prev, next, out)
{
    const p = ownBlock(prev);
    const n = ownBlock(next);

    if (!p || !n)
    {
        if (!sameish(prev, next)) { out.breaking.push(`${name} changed`); }
        return;
    }

    diffMap(p.properties ?? {}, n.properties ?? {}, (prop) => `${name}.${prop}`, out, (prop) =>
        sameish(p.properties[prop], n.properties[prop]) || out.breaking.push(`${name}.${prop} changed`));

    for (const r of (n.required ?? []).filter((k) => !(p.required ?? []).includes(k)))
    {
        out.breaking.push(`${name}.${r} became required`);
    }
}

/** Our own entries carry their properties in allOf[2]; re-exports have none. */
function ownBlock(entry)
{
    return entry?.allOf?.[2]?.properties ? entry.allOf[2] : null;
}

/** Component defs: removed or changed is breaking, added additive. */
function diffDefs(prev, next, out)
{
    const keep = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => !DERIVED_DEFS.has(k)));

    diffMap(keep(prev), keep(next), (k) => `$defs.${k}`, out, (k) =>
        sameish(prev[k], next[k]) || out.breaking.push(`$defs.${k} changed`));
}

/** Equal once descriptions are ignored (a description is not a contract). */
function sameish(a, b)
{
    return canonical(a) === canonical(b);
}

function canonical(node, parentKey = "")
{
    if (Array.isArray(node)) { return `[${node.map((n) => canonical(n)).join(",")}]`; }

    if (node === null || typeof node !== "object") { return JSON.stringify(node); }

    const keys = Object.keys(node).filter((k) => parentKey === "properties" || k !== "description").sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(node[k], k)}`).join(",")}}`;
}

/**
 * The version rule (spec §5.3).
 *
 * @param diff          - Result of diffCatalogs.
 * @param previousMajor - Highest committed baseline major.
 * @param nextMajor     - CATALOG_MAJOR.
 * @returns A literate problem, or null.
 */
export function versionProblem(diff, previousMajor, nextMajor)
{
    if (nextMajor !== previousMajor && nextMajor !== previousMajor + 1)
    {
        return `CATALOG_MAJOR is ${nextMajor} but the highest published catalog is v${previousMajor}. `
            + "A major moves one step at a time, and only forward.";
    }

    if (diff.breaking.length > 0 && nextMajor === previousMajor)
    {
        return `The catalog changed in ways that break hosts that hard-coded v${previousMajor}:\n  `
            + `${diff.breaking.join("\n  ")}\nIncrement CATALOG_MAJOR in scripts/agentui/catalog.mjs `
            + `(v${previousMajor} stays published), or undo the change.`;
    }

    return null;
}
