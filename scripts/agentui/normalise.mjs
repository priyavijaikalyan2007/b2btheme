/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiNormalise
 * 📜 PURPOSE: Turn a typia OpenAPI 3.1 unit into a standalone JSON Schema
 *    2020-12 document: refs under $defs, the root inlined, objects closed.
 *    Spec §4.
 * 🔗 RELATES: [[AgentUiSchemaEmitter]], [[AgentUiPostChecks]]
 * ⚡ FLOW: [typia unit] -> [mapRefs] -> [closeObjects] -> [inlineRoot]
 *          -> [2020-12 schema]
 */

import { isConstMember, isScalarArm } from "./catalog-diff.mjs";

export const DRAFT_2020_12 = "https://json-schema.org/draft/2020-12/schema";

const TYPIA_PREFIX = "#/components/schemas/";
const DEFS_PREFIX = "#/$defs/";

/**
 * Rewrites every `$ref` string in a JSON value.
 *
 * @param node - Any JSON value.
 * @param fn   - Maps an old ref to a new one.
 * @returns A rewritten copy.
 */
export function mapRefs(node, fn)
{
    if (Array.isArray(node)) { return node.map((n) => mapRefs(n, fn)); }

    if (node === null || typeof node !== "object") { return node; }

    return Object.fromEntries(Object.entries(node).map(([k, v]) =>
        [k, k === "$ref" && typeof v === "string" ? fn(v) : mapRefs(v, fn)]));
}

/** Keeps the $defs reachable from the rest of the schema; drops $defs when none are. */
export function pruneDefs(schema)
{
    if (!schema.$defs) { return schema; }

    const { $defs, ...root } = schema;
    const kept = new Set();
    const visit = (node) =>
    {
        for (const [, key] of JSON.stringify(node).matchAll(/"\$ref":"#\/\$defs\/([^"]+)"/g))
        {
            if (!kept.has(key) && key in $defs) { kept.add(key); visit($defs[key]); }
        }
    };

    visit(root);

    const defs = Object.fromEntries(Object.entries($defs).filter(([key]) => kept.has(key)));

    return Object.keys(defs).length > 0 ? { ...root, $defs: defs } : root;
}

/**
 * Normalises a typia 12 `json.schema<T, "3.1">()` unit (spec §4).
 *
 * @param unit - `{ version: "3.1", components: { schemas }, schema }`.
 * @returns A standalone draft 2020-12 schema with `$defs`.
 */
// @entrypoint
export function normaliseTypiaUnit(unit)
{
    if (!unit || unit.version !== "3.1" || !unit.schema)
    {
        throw new Error("Expected a typia 3.1 JSON schema unit, got "
            + `${JSON.stringify(unit)?.slice(0, 200)}. The typia output shape changed; `
            + "see specs/agentui-schema.prd.md §4 before adapting this function.");
    }

    const toDefs = (ref) => (ref.startsWith(TYPIA_PREFIX) ? DEFS_PREFIX + ref.slice(TYPIA_PREFIX.length) : ref);
    const tidy = (node) =>
        sortConstUnions(dropCoveredArms(nullAsConst(dropReadOnly(closeObjects(mapRefs(node, toDefs))))));
    const defs = tidy(unit.components?.schemas ?? {});
    const root = inlineRoot(tidy(unit.schema), defs);

    return { $schema: DRAFT_2020_12, ...root, ...(Object.keys(defs).length > 0 ? { $defs: defs } : {}) };
}

/**
 * Drops the `readOnly` keyword typia emits for a TypeScript `readonly`
 * member. In TypeScript it means "not reassigned"; in JSON Schema it tells
 * an agent the value is owned elsewhere and not its to set, which is the
 * opposite of an option (readiness step 2 P1). Only a boolean is the keyword:
 * a property named readOnly holds a schema, and stays.
 */
function dropReadOnly(node)
{
    if (Array.isArray(node)) { return node.map(dropReadOnly); }

    if (node === null || typeof node !== "object") { return node; }

    return Object.fromEntries(Object.entries(node).filter(([k, v]) => !(k === "readOnly" && typeof v === "boolean"))
        .map(([k, v]) => [k, dropReadOnly(v)]));
}

/**
 * Rewrites `{ type: "null" }` as `{ const: null }`, the same schema in JSON
 * Schema. web_core converts a type it does not know, "null" included, to
 * z.unknown(), which matches everything, so oneOf [null, X] rejected every
 * literal X; it reads `const` as z.literal (readiness step 2 B2).
 */
function nullAsConst(node)
{
    if (Array.isArray(node)) { return node.map(nullAsConst); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, nullAsConst(v)]));

    if (out.type !== "null") { return out; }

    const { type, ...rest } = out;
    void type;

    return { const: null, ...rest };
}

/**
 * Drops a `{ type: T, format: F }` oneOf arm when a plain `{ type: T }` arm is
 * also there, and unwraps a oneOf left with one arm. TypeScript's `Date | string`
 * becomes exactly that pair; every date string matches both arms, and oneOf
 * demands exactly one, so a validator rejected every value (readiness step 2 B2).
 */
function dropCoveredArms(node)
{
    if (Array.isArray(node)) { return node.map(dropCoveredArms); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, dropCoveredArms(v)]));

    if (!Array.isArray(out.oneOf)) { return out; }

    const plain = new Set(out.oneOf.filter((a) => Object.keys(a).length === 1 && typeof a.type === "string")
        .map((a) => a.type));
    const arms = out.oneOf.filter((a) => !(typeof a.format === "string" && plain.has(a.type)));

    if (arms.length !== 1) { return { ...out, oneOf: arms }; }

    const { oneOf, ...rest } = out;
    void oneOf;

    return { ...rest, ...arms[0] };
}

/**
 * Sorts every oneOf/anyOf made only of scalar arms (`{ const }` members and
 * bare primitive types): consts first, grouped by type (booleans, numbers,
 * strings), numbers in numeric order and the rest in code-point order, then
 * primitive types by name. TypeScript orders a union by internal type id,
 * which any file in the program can shift, so without this an unrelated
 * change reorders a published enum (readiness step 2 B1, B5). A union with an
 * object arm keeps its order: object arms can overlap.
 */
function sortConstUnions(node)
{
    if (Array.isArray(node)) { return node.map(sortConstUnions); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, sortConstUnions(v)]));

    for (const key of ["oneOf", "anyOf"])
    {
        if (Array.isArray(out[key]) && out[key].length > 0 && out[key].every(isScalarArm))
        {
            out[key] = [...out[key]].sort(byScalarArm);
        }
    }

    return out;
}

/** Consts first, in value order, then bare primitive types by name (readiness step 2 B5). */
function byScalarArm(a, b)
{
    const [ca, cb] = [isConstMember(a), isConstMember(b)];

    if (ca !== cb) { return ca ? -1 : 1; }

    if (ca) { return byConst(a, b); }

    return a.type < b.type ? -1 : (a.type > b.type ? 1 : 0);
}

function byConst(a, b)
{
    const [x, y] = [a.const, b.const];

    if (typeof x !== typeof y) { return typeof x < typeof y ? -1 : 1; }

    if (typeof x === "number") { return x - y; }

    const [sx, sy] = [String(x), String(y)];

    return sx < sy ? -1 : (sx > sy ? 1 : 0);
}

/** Replaces a bare root `$ref` by its definition, dropping the definition if nothing else uses it. */
function inlineRoot(root, defs)
{
    const keys = Object.keys(root);

    if (keys.length !== 1 || typeof root.$ref !== "string" || !root.$ref.startsWith(DEFS_PREFIX))
    {
        return root;
    }

    const name = root.$ref.slice(DEFS_PREFIX.length);

    if (!(name in defs))
    {
        throw new Error(`typia's root ref ${root.$ref} names no definition. Its output shape changed; see spec §4.`);
    }

    const inlined = defs[name];

    if (!JSON.stringify(defs).includes(JSON.stringify(DEFS_PREFIX + name)))
    {
        delete defs[name];
    }

    return inlined;
}

/** Adds `additionalProperties: false` to every object schema that leaves it unset. */
function closeObjects(node)
{
    if (Array.isArray(node)) { return node.map(closeObjects); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, closeObjects(v)]));

    if (out.type === "object" && out.properties && !("additionalProperties" in out))
    {
        out.additionalProperties = false;
    }

    return out;
}
