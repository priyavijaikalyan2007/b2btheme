/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiLeanCatalog
 * 📜 PURPOSE: The agent-facing rendering of the catalog (#49, ADR-233): the
 *    same components, props, required flags, enum values and descriptions,
 *    without the binding and function-call alternatives every data prop
 *    repeats. Those are stated once, in the catalog's own description. A
 *    prompt aid only: messages are still validated against the full catalog.
 * 🔗 RELATES: [[AgentUiCatalog]], [[A2uiReferenceAgent]]
 * ⚡ FLOW: [catalog + common types] -> [leanCatalog] -> [a2ui/catalog/v<major>.agent.json]
 */

import { BASIC_CATALOG_ID, COMMON_TYPES_ID } from "./catalog.mjs";
import { mapRefs, pruneDefs } from "./normalise.mjs";

const COMMON_REF = `${COMMON_TYPES_ID}#/$defs/`;
const BINDING_REF = `${COMMON_REF}DataBinding`;
const FUNCTION_CALL_REF = `${COMMON_REF}FunctionCall`;
const ACTION_REF = `${COMMON_REF}Action`;
const BASIC_REF = `${BASIC_CATALOG_ID}#/`;

const NOTATION = "This is a rendering of the catalog for prompts; validate messages against the full catalog at "
    + "catalogId. Each component property shows its literal schema only. As the description says, a data "
    + "binding or function call may stand in its place: a property whose schema is $defs/DataBinding takes "
    + "only a binding, and one whose schema is $defs/Action takes only an action. Every component also takes "
    + "the properties under componentCommon, and id is required. The components and functions under "
    + "reexports are defined in the catalog reexports.catalogId names, which you need alongside this one.";

/**
 * Builds the lean rendering of a catalog.
 *
 * @param input - { catalog, basic, commonTypes }: the built catalog, the
 *     vendored basic catalog and the vendored A2UI common types.
 * @returns The lean document, serialisable as JSON.
 */
// @entrypoint
export function leanCatalog({ catalog, basic, commonTypes })
{
    const reexported = (entry) => entry.allOf?.length === 1 && entry.allOf[0].$ref?.startsWith(BASIC_REF);
    const entries = Object.entries(catalog.components);
    const common = commonDefs(commonTypes);
    const clash = Object.keys(catalog.$defs).find((k) => k in common);

    if (clash)
    {
        throw new Error(`The catalog's $defs/${clash} has the name of an A2UI common type; the lean catalog would `
            + "lose one of them. Rename the catalog's definition.");
    }

    // Unreferenced defs drop out: the re-export wrappers, the anyComponent and anyFunction unions, unused common types.
    return pruneDefs({
        catalogId: catalog.catalogId,
        description: catalog.description,
        notation: NOTATION,
        reexports: {
            catalogId: basic.catalogId,
            components: entries.filter(([, e]) => reexported(e)).map(([n]) => n),
            functions: Object.keys(catalog.functions),
        },
        componentCommon: componentCommon(commonTypes, basic),
        components: Object.fromEntries(entries.filter(([, e]) => !reexported(e))
            .map(([n, e]) => [n, leanComponent(n, e)])),
        $defs: { ...common, ...collapseConsts(catalog.$defs) },
    });
}

/** One of our component entries: description, literal props and required, without the common parts. */
function leanComponent(name, entry)
{
    const own = entry.allOf.find((part) => part.properties);
    const unexpected = entry.allOf.filter((part) => part !== own
        && part.$ref !== `${COMMON_REF}ComponentCommon` && part.$ref !== "#/$defs/CatalogComponentCommon");

    if (unexpected.length > 0)
    {
        throw new Error(`${name}: the lean catalog does not know the catalog part ${JSON.stringify(unexpected[0])}; `
            + "teach scripts/agentui/agent-catalog.mjs to render it.");
    }

    const { component, ...props } = own.properties;
    void component;
    const required = own.required.filter((n) => n !== "component");

    return {
        description: entry.description,
        properties: Object.fromEntries(Object.entries(props).map(([n, s]) => [n, leanProp(s)])),
        ...(required.length > 0 ? { required } : {}),
    };
}

/** A top-level prop: the binding and function-call arms dropped, common refs made local. */
function leanProp(schema)
{
    const literal = schema.anyOf?.filter((arm) => arm.$ref !== BINDING_REF && arm.$ref !== FUNCTION_CALL_REF);
    const bindable = literal && literal.length === schema.anyOf.length - 2;
    const { anyOf, description, ...rest } = schema;
    void anyOf;
    const lean = !bindable ? schema
        : literal.length === 1 ? { ...(description ? { description } : {}), ...rest, ...literal[0] }
            : { ...(description ? { description } : {}), ...rest, anyOf: literal };

    return collapseConsts(mapRefs(lean, localCommonRef));
}

/** id and accessibility from the A2UI common types, weight from the basic catalog: what every component takes. */
function componentCommon(commonTypes, basic)
{
    const common = commonTypes.$defs.ComponentCommon;

    return { ...common, properties: { ...common.properties, ...basic.$defs.CatalogComponentCommon.properties } };
}

/** The A2UI common types, with FunctionCall's union of every function dropped: reexports names them. */
function commonDefs(commonTypes)
{
    const { oneOf, ...functionCall } = commonTypes.$defs.FunctionCall;
    void oneOf;

    return { ...commonTypes.$defs, FunctionCall: functionCall };
}

function localCommonRef(ref)
{
    if (ref === ACTION_REF || ref === BINDING_REF) { return `#/$defs/${ref.slice(COMMON_REF.length)}`; }

    if (ref.startsWith(COMMON_REF) || ref.startsWith(BASIC_REF))
    {
        throw new Error(`The lean catalog does not know the reference ${ref}; teach scripts/agentui/agent-catalog.mjs `
            + "to render it.");
    }

    return ref;
}

/** {"oneOf": [{"const": a}, {"const": b}]} becomes {"enum": [a, b]}, at every depth, order kept. */
function collapseConsts(node)
{
    if (Array.isArray(node)) { return node.map(collapseConsts); }

    if (node === null || typeof node !== "object") { return node; }

    const out = Object.fromEntries(Object.entries(node).map(([k, v]) => [k, collapseConsts(v)]));
    const allConsts = Array.isArray(out.oneOf)
        && out.oneOf.every((arm) => Object.keys(arm).length === 1 && "const" in arm);

    if (!allConsts) { return out; }

    const { oneOf, ...rest } = out;

    return { ...rest, enum: oneOf.map((arm) => arm.const) };
}

/**
 * Proves the lean rendering lossless: each lean component, expanded back by
 * the notation's rules, equals its catalog entry, and each kept definition
 * equals the catalog's, up to {"oneOf": consts} being written as {"enum"}.
 * Every catalog component is either rendered or listed under reexports, and
 * every reference resolves inside the lean catalog.
 *
 * @param catalog - The full catalog.
 * @param lean    - leanCatalog's result for it.
 * @returns One message per difference, naming where it is; empty when lossless.
 */
export function leanProblems(catalog, lean)
{
    const listed = new Set([...Object.keys(lean.components), ...lean.reexports.components]);
    const unlisted = Object.keys(catalog.components).filter((n) => !listed.has(n))
        .map((n) => `${n}: in the catalog but neither rendered nor re-exported in the lean catalog.`);
    const components = Object.entries(lean.components).flatMap(([n, entry]) =>
        differences(`components/${n}`, expandComponent(n, entry), catalog.components[n]));
    const defs = Object.keys(lean.$defs).filter((k) => k in catalog.$defs)
        .flatMap((k) => differences(`$defs/${k}`, lean.$defs[k], catalog.$defs[k]));
    const dangling = [...new Set([...JSON.stringify(lean).matchAll(/"\$ref":"([^"]+)"/g)].map((m) => m[1]))]
        .filter((ref) => !(ref.startsWith("#/$defs/") && ref.slice("#/$defs/".length) in lean.$defs))
        .map((ref) => `The lean catalog refers to ${ref}, which it does not define.`);

    return [...unlisted, ...components, ...defs, ...dangling];
}

/** A lean component as the catalog writes it. */
function expandComponent(name, entry)
{
    const properties = Object.fromEntries(Object.entries(entry.properties).map(([n, s]) => [n, expandProp(s)]));

    return {
        type: "object",
        description: entry.description,
        allOf: [
            { $ref: `${COMMON_REF}ComponentCommon` },
            { $ref: "#/$defs/CatalogComponentCommon" },
            { type: "object", properties: { component: { const: name }, ...properties },
                required: ["component", ...(entry.required ?? [])] },
        ],
        unevaluatedProperties: false,
    };
}

/** A lean prop as the catalog writes it: binding-only and action props as they are, others with both arms back. */
function expandProp(schema)
{
    const full = mapRefs(schema, (ref) => (ref === "#/$defs/DataBinding" || ref === "#/$defs/Action"
        ? `${COMMON_REF}${ref.slice("#/$defs/".length)}` : ref));

    if (full.$ref === BINDING_REF || full.$ref === ACTION_REF) { return full; }

    const { description, anyOf, ...literal } = full;
    const arms = [...(anyOf ?? [literal]), { $ref: BINDING_REF }, { $ref: FUNCTION_CALL_REF }];

    return { ...(description ? { description } : {}), ...(anyOf ? literal : {}), anyOf: arms };
}

/** Where `lean` and `full` differ once both are canonical: the first differing path, or nothing. */
function differences(where, lean, full)
{
    const path = firstDifference(canonical(lean), canonical(full));

    return path === null ? [] : [`${where}${path}: the lean catalog does not render the catalog's schema here `
        + "faithfully. Fix leanCatalog in scripts/agentui/agent-catalog.mjs."];
}

/** Keys sorted and const unions written as enum, so that equal schemas compare equal. */
function canonical(node)
{
    const collapsed = collapseConsts(node);
    const sort = (n) =>
    {
        if (Array.isArray(n)) { return n.map(sort); }
        if (n === null || typeof n !== "object") { return n; }
        return Object.fromEntries(Object.keys(n).sort().map((k) => [k, sort(n[k])]));
    };

    return sort(collapsed);
}

function firstDifference(a, b, at = "")
{
    if (a === b) { return null; }

    const objects = a !== null && b !== null && typeof a === "object" && typeof b === "object";

    if (!objects || Array.isArray(a) !== Array.isArray(b))
    {
        return at || "/";
    }

    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];

    for (const k of keys)
    {
        const d = firstDifference(a[k], b[k], `${at}/${k}`);
        if (d !== null) { return d; }
    }

    return null;
}
