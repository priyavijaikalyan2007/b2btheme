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

/** Top-level keys compared section by section; every other top-level key is compared whole. */
const SECTIONS = new Set(["components", "functions", "$defs", "description"]);

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
    diffTopLevel(previous, next, out);

    return out;
}

/** Every top-level key outside SECTIONS ($id, catalogId, title, $schema, ...): any change is breaking. */
function diffTopLevel(previous, next, out)
{
    const keys = [...new Set([...Object.keys(previous), ...Object.keys(next)])].filter((k) => !SECTIONS.has(k));

    for (const k of keys.sort())
    {
        if (!sameish(previous[k], next[k])) { out.breaking.push(`catalog ${k} changed`); }
    }
}

/** Removed keys are breaking, added keys additive, shared keys compared by `onShared`. */
function diffMap(prev, next, format, out, onShared)
{
    for (const n of Object.keys(prev).filter((k) => !(k in next))) { out.breaking.push(`${format(n)} removed`); }
    for (const n of Object.keys(next).filter((k) => !(k in prev))) { out.additive.push(`${format(n)} added`); }
    for (const n of Object.keys(prev).filter((k) => k in next)) { onShared(n); }
}

/**
 * Compares one component: the entry outside its properties and required
 * (type, unevaluatedProperties, every allOf member), then props, then
 * required. Re-exports compare whole.
 */
function diffComponent(name, prev, next, out)
{
    const p = ownBlock(prev);
    const n = ownBlock(next);

    if (!p || !n)
    {
        if (!sameish(prev, next)) { out.breaking.push(`${name} changed`); }
        return;
    }

    if (!sameish(entryShape(prev), entryShape(next))) { out.breaking.push(`${name} changed`); }

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

/** An own entry with allOf[2].properties and allOf[2].required removed; diffComponent compares those itself. */
function entryShape(entry)
{
    const allOf = entry.allOf.map((part, i) =>
    {
        if (i !== 2) { return part; }

        const { properties, required, ...rest } = part;
        void properties;
        void required;

        return rest;
    });

    return { ...entry, allOf };
}

/** Component defs: removed or changed is breaking, added additive. */
function diffDefs(prev, next, out)
{
    const keep = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => !DERIVED_DEFS.has(k)));

    diffMap(keep(prev), keep(next), (k) => `$defs.${k}`, out, (k) =>
        sameish(prev[k], next[k]) || out.breaking.push(`$defs.${k} changed`));
}

/**
 * Whether description text differs anywhere both catalogs have the same node:
 * a description edited, added or removed on a node that exists in both. A
 * description that arrives with a new node is part of that addition, not a
 * description change. A property NAMED "description" is a schema, not text.
 *
 * @param a - The committed baseline (or any node of it).
 * @param b - The freshly generated catalog (or the matching node).
 * @returns True when some shared node's description differs.
 */
export function descriptionsDiffer(a, b, parentKey = "")
{
    if (!isNode(a) || !isNode(b)) { return false; }

    return Object.keys({ ...a, ...b }).some((k) => ((k === "description" && parentKey !== "properties")
        ? a[k] !== b[k]
        : (k in a && k in b && descriptionsDiffer(a[k], b[k], k))));
}

function isNode(value)
{
    return value !== null && typeof value === "object";
}

/** Equal once descriptions are ignored (a description is not a contract). */
function sameish(a, b)
{
    return canonical(a) === canonical(b);
}

function canonical(node, parentKey = "")
{
    if (Array.isArray(node))
    {
        const members = node.map((n) => canonical(n));

        return `[${(isUnorderedSet(parentKey, node) ? members.sort() : members).join(",")}]`;
    }

    if (node === null || typeof node !== "object") { return JSON.stringify(node); }

    // { type: "null" } and { const: null } are one schema (normalise.mjs emits the latter since B2).
    if (node.type === "null" && !("const" in node))
    {
        const { type, ...rest } = node;
        void type;
        return canonical({ const: null, ...rest }, parentKey);
    }

    const keys = Object.keys(node).filter((k) => parentKey === "properties" || k !== "description").sort();

    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(node[k], k)}`).join(",")}}`;
}

/**
 * An enum, or a oneOf/anyOf whose members are all scalar arms: a set, where
 * order carries no meaning. TypeScript orders a union by internal type id,
 * which any file in the program can shift (readiness step 2 B1, B5).
 */
function isUnorderedSet(key, members)
{
    if (key === "enum") { return true; }

    return (key === "oneOf" || key === "anyOf") && members.length > 0 && members.every(isScalarArm);
}

/** Bare primitive types: arms no validator transforms, so their order cannot change an outcome. */
const PRIMITIVE_TYPES = ["string", "number", "integer", "boolean", "null"];

/**
 * `{ const }`, or a bare primitive type such as `{ type: "number" }`, each
 * ignoring a description. An object arm is not one: two can overlap, and a
 * validator that tries arms in order may keep the first one's shape.
 */
export function isScalarArm(m)
{
    if (isConstMember(m)) { return true; }

    return m !== null && typeof m === "object" && !Array.isArray(m) && PRIMITIVE_TYPES.includes(m.type)
        && Object.keys(m).every((k) => k === "type" || k === "description");
}

/** `{ const }`, ignoring a description (a description is not a contract). */
export function isConstMember(m)
{
    return m !== null && typeof m === "object" && !Array.isArray(m) && "const" in m
        && Object.keys(m).every((k) => k === "const" || k === "description");
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
