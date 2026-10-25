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
    const defs = closeObjects(mapRefs(unit.components?.schemas ?? {}, toDefs));
    const root = inlineRoot(closeObjects(mapRefs(unit.schema, toDefs)), defs);

    return { $schema: DRAFT_2020_12, ...root, ...(Object.keys(defs).length > 0 ? { $defs: defs } : {}) };
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
