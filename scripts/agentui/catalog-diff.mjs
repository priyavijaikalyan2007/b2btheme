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

    const defs = next.$defs ?? {};

    diffMap(previous.components, next.components, (n) => `component ${n}`, out, (n) =>
        diffComponent(n, previous.components[n], next.components[n], out, defs));
    diffMap(previous.functions ?? {}, next.functions ?? {}, (n) => `function ${n}`, out, (n) =>
        sameish(previous.functions[n], next.functions[n]) || out.breaking.push(`function ${n} changed`));
    diffDefs(previous.$defs ?? {}, defs, out);
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
function diffComponent(name, prev, next, out, defs)
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
        diffProp(`${name}.${prop}`, p.properties[prop], n.properties[prop], out, defs));

    for (const r of (n.required ?? []).filter((k) => !(p.required ?? []).includes(k)))
    {
        out.breaking.push(`${name}.${r} became required`);
    }
}

/**
 * Same prop: unchanged, widened (every value it accepted is still accepted) or changed. `defs` is the next
 * catalog's $defs, which a widened union may sit behind as a new $ref.
 */
function diffProp(label, prev, next, out, defs)
{
    if (sameish(prev, next)) { return; }

    if (onlyWidens(prev, next, defs)) { out.additive.push(`${label} widened`); }
    else { out.breaking.push(`${label} changed`); }
}

/** The union keys whose arms the widening rule understands. */
const UNION_KEYS = ["oneOf", "anyOf"];

/**
 * Whether `next` keeps every `prev` arm and adds some: a schema that became a union with it as one arm, such as a
 * string that may now also be { value, label }, or a union that gained arms. Every value the old schema accepted
 * is still accepted (FacetSearch's labelled values, apps report 2026-11-09).
 */
function unionWidens(a, given, defs)
{
    // The union may be a new definition the property now refers to, such as FacetSearch__FacetValue.
    const ref = typeof given.$ref === "string" && given.$ref.startsWith("#/$defs/") && !("$ref" in a)
        ? defs[given.$ref.slice("#/$defs/".length)] : undefined;
    const b = isNode(ref) ? ref : given;
    const key = UNION_KEYS.find((k) => Array.isArray(b[k]));
    if (!key) { return false; }

    const oldArms = Array.isArray(a[key]) ? a[key] : (UNION_KEYS.some((k) => k in a) ? null : [a]);
    if (!oldArms) { return false; }

    const rest = Object.keys(b).filter((k) => k !== key && k !== "description");
    const ownRest = Array.isArray(a[key]) ? rest.every((k) => sameish(a[k], b[k])) : rest.length === 0;

    return ownRest && b[key].length > oldArms.length
        && oldArms.every((arm) => b[key].some((candidate) => sameish(arm, candidate)));
}

/**
 * Whether the two schemas differ only in ways that widen: string `pattern`s
 * that widen, and unions that keep every old arm and add some. `next` is
 * copied with each widening put back to the old form, and the copy must
 * then equal `prev`.
 */
function onlyWidens(prev, next, defs = {})
{
    let widened = false;

    const align = (a, b) =>
    {
        if (!isNode(a) || !isNode(b)) { return b; }

        if (!Array.isArray(a) && !Array.isArray(b) && unionWidens(a, b, defs))
        {
            widened = true;
            return a;
        }

        const copy = Array.isArray(b) ? [] : {};

        for (const k of Object.keys(b))
        {
            const isPattern = k === "pattern" && typeof a[k] === "string" && typeof b[k] === "string";

            if (isPattern && a[k] !== b[k] && patternWidens(a[k], b[k]))
            {
                widened = true;
                copy[k] = a[k];
            }
            else { copy[k] = align(a[k], b[k]); }
        }

        return copy;
    };

    const aligned = align(prev, next);

    return widened && sameish(prev, aligned);
}

/** A pattern that is a whole string of one character class, `^[...]+$` or `^[...]*$`. */
const CHAR_CLASS_PATTERN = /^\^\[([^\]\\^]+)\]([+*])\$$/;

/**
 * Whether `next` accepts every string `prev` accepts. Two shapes are
 * understood: one character class that gains characters (or `+` becoming
 * `*`), and `^X$` becoming `^(?:X|Y)$`. Any other pattern change is
 * breaking, because regex containment cannot be decided in general.
 */
export function patternWidens(prev, next)
{
    return charClassWidens(prev, next) || alternativeAdded(prev, next);
}

/**
 * `^X$` to `^(?:X|Y)$`: the old pattern kept whole as the first
 * alternative. X must have no top-level `|`, since `^a|b$` means
 * `(^a)|(b$)`, which `^(?:a|b|c)$` does not contain.
 */
function alternativeAdded(prev, next)
{
    if (!prev.startsWith("^") || !prev.endsWith("$")) { return false; }

    const x = prev.slice(1, -1);
    const prefix = `^(?:${x}|`;

    if (!next.startsWith(prefix) || !next.endsWith(")$") || next.length <= prefix.length + 2) { return false; }
    if (!isAnchoredWhole(x)) { return false; }

    try
    {
        new RegExp(next);
    }
    catch
    {
        return false;
    }

    return true;
}

/** True when a pattern body has no top-level `|` and does not end in an escape that would swallow the `$`. */
function isAnchoredWhole(body)
{
    let depth = 0;
    let inClass = false;

    for (let i = 0; i < body.length; i++)
    {
        const c = body[i];

        if (c === "\\")
        {
            if (i === body.length - 1) { return false; }
            i++;
        }
        else if (inClass) { inClass = c !== "]"; }
        else if (c === "[") { inClass = true; }
        else if (c === "(") { depth++; }
        else if (c === ")") { depth--; }
        else if (c === "|" && depth === 0) { return false; }
    }

    return depth === 0 && !inClass;
}

/** One character class that gains characters, or whose `+` becomes `*`. */
function charClassWidens(prev, next)
{
    const a = CHAR_CLASS_PATTERN.exec(prev);
    const b = CHAR_CLASS_PATTERN.exec(next);

    if (!a || !b) { return false; }

    const quantifierWidens = a[2] === b[2] || (a[2] === "+" && b[2] === "*");
    const before = charClassSet(a[1]);
    const after = charClassSet(b[1]);

    return quantifierWidens && before !== null && after !== null && [...before].every((c) => after.has(c));
}

/** The code points a character class body names: single characters and `x-y` ranges; null for a reversed range. */
function charClassSet(body)
{
    const chars = Array.from(body);
    const set = new Set();

    for (let i = 0; i < chars.length; i++)
    {
        if (chars[i + 1] !== "-" || i + 2 >= chars.length)
        {
            set.add(chars[i].codePointAt(0));
            continue;
        }

        const lo = chars[i].codePointAt(0);
        const hi = chars[i + 2].codePointAt(0);

        if (hi < lo) { return null; }

        for (let c = lo; c <= hi; c++) { set.add(c); }

        i += 2;
    }

    return set;
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

/** Component defs: removed or changed is breaking, added or widened additive. */
function diffDefs(prev, next, out)
{
    const keep = (m) => Object.fromEntries(Object.entries(m).filter(([k]) => !DERIVED_DEFS.has(k)));
    const [p, n] = [keep(prev), keep(next)];
    const added = Object.keys(n).filter((k) => !(k in p));

    // A removed key is usually a renamed type (#74). Say how to keep its published name, and name the alias when
    // an added key has the same schema.
    for (const k of Object.keys(p).filter((key) => !(key in n)))
    {
        const twin = added.find((a) => sameish(p[k], n[a]));

        out.breaking.push(twin
            ? `$defs.${k} removed. $defs.${twin} was added with the same schema, so the type was probably `
                + `renamed: add "${twin}": "${k}" to DEF_ALIASES in scripts/agentui/def-aliases.mjs to keep the `
                + "published name"
            : `$defs.${k} removed. If its type was renamed, map the new key to it in DEF_ALIASES in `
                + "scripts/agentui/def-aliases.mjs to keep the published name");
    }
    for (const k of added) { out.additive.push(`$defs.${k} added`); }
    for (const k of Object.keys(p).filter((key) => key in n)) { diffProp(`$defs.${k}`, prev[k], next[k], out, next); }
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

/** True for an object or array. */
function isNode(value)
{
    return value !== null && typeof value === "object";
}

/** Equal once descriptions are ignored (a description is not a contract). */
function sameish(a, b)
{
    return canonical(a) === canonical(b);
}

/** A schema as a string with descriptions dropped, keys sorted and unordered sets sorted, for comparison. */
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
