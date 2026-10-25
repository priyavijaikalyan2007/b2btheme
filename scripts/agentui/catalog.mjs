/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiCatalog
 * 📜 PURPOSE: Assemble the A2UI v0.9.1 catalog file from manifests, surfaces
 *    and schemas: basic-catalog re-exports plus one entry per component,
 *    with channels and providers expanded to plain properties. Spec §5.
 * 🔗 RELATES: [[AgentProtocolSchema]], [[AgentUiResolver]], [[AgentUiNormaliser]]
 * ⚡ FLOW: [manifest + surface + schema] -> [entryFor] -> [buildCatalog]
 *          -> [catalog file + violations]
 */

import { DRAFT_2020_12, mapRefs } from "./normalise.mjs";
import { VIOLATION } from "./resolve.mjs";

// @config: CatalogIdentity — changing these changes a permanent public identifier (D7, D12).
export const CATALOG_ORIGIN = "https://static.outcrop.us";
export const CATALOG_MAJOR = 1;
export const BASIC_CATALOG_ID = "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json";
export const COMMON_TYPES_ID = "https://a2ui.org/specification/v0_9/common_types.json";

const TITLE = "Enterprise Bootstrap Theme";
const UAX31 = /^[\p{XID_Start}_][\p{XID_Continue}]*$/u;
const BINDING = { $ref: `${COMMON_TYPES_ID}#/$defs/DataBinding` };
const ACTION_REF = `${COMMON_TYPES_ID}#/$defs/Action`;
const PREAMBLE = "Components of the Enterprise Bootstrap Theme, plus the A2UI basic catalog's components and "
    + "functions, which this catalog re-exports. Every data property accepts a literal or a {\"path\": …} "
    + "binding. For each event a component emits, it has a binding property it writes each emission to, and an "
    + "on<Event> action property. Bind the first to a path and read that path in the action's context; the "
    + "context is resolved after the write.";

/** The permanent catalog ID for a catalog major version. */
export function catalogId(major)
{
    return `${CATALOG_ORIGIN}/a2ui/catalog/v${major}.json`;
}

/** Catalog name: protocol.name, else the factory without "create". */
export function catalogName(manifest)
{
    return manifest.protocol?.name ?? manifest.factory.replace(/^create/, "");
}

/**
 * Builds the catalog file (spec §5).
 *
 * @param input - { basic, components: { manifest, surface, schema }[], major }.
 * @returns { catalog, violations }.
 */
// @entrypoint
export function buildCatalog({ basic, components, major })
{
    const violations = nameViolations(basic, components);
    const ours = components.map(entryFor);
    const id = catalogId(major);
    const all = sortKeys({ ...reexport(basic.components, "components"), ...Object.fromEntries(ours.map((o) => [o.name, o.entry])) });
    const functions = sortKeys(reexportFunctions(basic.functions));

    return {
        catalog: {
            $schema: DRAFT_2020_12, $id: id, title: TITLE, description: guidance(components), catalogId: id,
            components: all, functions, $defs: rootDefs(all, functions, ours),
        },
        violations: [...violations, ...ours.flatMap((o) => o.violations)],
    };
}

/** Re-exports basic components through allOf (a bare $ref derives an empty strict object). */
function reexport(map, section)
{
    return Object.fromEntries(Object.keys(map).map((n) =>
        [n, { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/${section}/${n}` }] }]));
}

function reexportFunctions(map)
{
    return Object.fromEntries(Object.keys(map).map((n) => [n, { allOf: [{ $ref: `${BASIC_CATALOG_ID}#/functions/${n}` }] }]));
}

/** The catalog's $defs: basic common defs, the any* unions, and relocated component defs. */
function rootDefs(components, functions, ours)
{
    return {
        CatalogComponentCommon: { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/$defs/CatalogComponentCommon` }] },
        theme: { type: "object", allOf: [{ $ref: `${BASIC_CATALOG_ID}#/$defs/theme` }] },
        anyComponent: { oneOf: Object.keys(components).map((n) => ({ $ref: `#/components/${n}` })) },
        anyFunction: { oneOf: Object.keys(functions).map((n) => ({ $ref: `#/functions/${n}` })) },
        ...sortKeys(Object.assign({}, ...ours.map((o) => o.defs))),
    };
}

/** One component entry plus its relocated defs and prop-collision violations. */
function entryFor({ manifest, surface, schema })
{
    const name = catalogName(manifest);
    const { root, defs } = relocateDefs(schema, name);
    const groups = [dataProps(surface, root), channelProps(surface), providerProps(surface, root), actionProps(surface)];
    const props = Object.assign({ component: { const: name } }, ...groups);
    const dataNames = new Set(surface.dataProps.map((d) => d.name));

    return {
        name, defs,
        violations: propCollisions(manifest, groups),
        entry: {
            type: "object",
            description: describeComponent(manifest),
            allOf: [
                { $ref: `${COMMON_TYPES_ID}#/$defs/ComponentCommon` },
                { $ref: "#/$defs/CatalogComponentCommon" },
                { type: "object", properties: props,
                    required: ["component", ...(root.required ?? []).filter((n) => dataNames.has(n))] },
            ],
            unevaluatedProperties: false,
        },
    };
}

/**
 * Moves a standalone schema's $defs under `<prefix>__` keys so they can live
 * at the catalog root, rewriting refs to match.
 */
export function relocateDefs(schema, prefix)
{
    const { $schema, $defs = {}, ...root } = schema;
    void $schema;
    const rewrite = (node) => mapRefs(node, (ref) =>
        (ref.startsWith("#/$defs/") ? `#/$defs/${prefix}__${ref.slice("#/$defs/".length)}` : ref));

    return { root: rewrite(root), defs: Object.fromEntries(Object.entries($defs).map(([k, v]) => [`${prefix}__${k}`, rewrite(v)])) };
}

/** Data props: literal-or-binding, description outside the oneOf. */
function dataProps(surface, root)
{
    return Object.fromEntries(surface.dataProps.map((d) =>
    {
        const { description, ...schema } = root.properties[d.name];
        const twoWay = d.name === "value" && surface.twoWayValue
            ? " Two-way: when bound to a path, the component writes the user's changes there." : "";

        return [d.name, { description: `${description ?? d.jsdoc}${twoWay}`, oneOf: [schema, BINDING] }];
    }));
}

/** Each channel: a binding-only prop the component writes, and an on<Channel> Action. */
function channelProps(surface)
{
    return Object.fromEntries(surface.events.flatMap((e) => [
        [e.bindProp, { description: `Bind to a path. The component writes each "${e.channel}" emission `
            + `(a ${e.payload}) there before sending ${e.actionProp}.`, ...BINDING }],
        [e.actionProp, { description: `Sent when "${e.channel}" emits. Read the emission through the path `
            + `bound to ${e.bindProp}.`, $ref: ACTION_REF }],
    ]));
}

/** Each provider: params (component writes), on<Request> Action, response (agent answers). */
function providerProps(surface, root)
{
    return Object.fromEntries(surface.providers.flatMap((p) =>
    {
        const { description, ...response } = root.properties[p.response];
        void description;

        return [
            [p.params, { description: `Bind to a path. The component writes the "${p.request}" request there `
                + `before sending ${p.actionProp}.`, ...BINDING }],
            [p.actionProp, { description: `Sent when the component needs "${p.request}" answered.`, $ref: ACTION_REF }],
            [p.response, { description: `Bind to the path you will answer ${p.actionProp} at with updateDataModel.`,
                oneOf: [response, BINDING] }],
        ];
    }));
}

function actionProps(surface)
{
    return Object.fromEntries(surface.actions.map((a) =>
        [a.actionProp, { description: `Sent when the user invokes "${a.label}".`, $ref: ACTION_REF }]));
}

/** A generated prop name used twice within one component. */
function propCollisions(manifest, groups)
{
    const names = ["component", ...groups.flatMap((g) => Object.keys(g))];
    const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];

    return dupes.map((n) => ({
        component: manifest.name, member: n, code: VIOLATION.PROP_COLLISION,
        message: `${manifest.name}.${n}: two catalog properties would share the name "${n}". Rename the `
            + `channel's prop with protocol.bindAs, or the provider's params/response, in `
            + `components/${manifest.name}/${manifest.name}.manifest.ts`,
    }));
}

/** Invalid names, and names that collide with ours or the basic catalog's. */
function nameViolations(basic, components)
{
    const seen = new Set(Object.keys(basic.components));

    return components.flatMap(({ manifest }) =>
    {
        const name = catalogName(manifest);
        const where = `components/${manifest.name}/${manifest.name}.manifest.ts`;

        if (!UAX31.test(name))
        {
            return [{ component: manifest.name, member: "protocol.name", code: VIOLATION.NAME_INVALID,
                message: `${manifest.name}: catalog name "${name}" is not a UAX #31 identifier. Set protocol.name in ${where}` }];
        }

        if (seen.has(name))
        {
            return [{ component: manifest.name, member: "protocol.name", code: VIOLATION.NAME_COLLISION,
                message: `${manifest.name}: catalog name "${name}" is already taken. Set a distinct protocol.name in ${where}` }];
        }

        seen.add(name);
        return [];
    });
}

/** "Data Grid. Use it to browse, compare a collection of 2 to 100000 items. Actions: Export CSV." */
export function describeComponent(manifest)
{
    const uses = manifest.affords.map((a) =>
        `Use it to ${a.intents.join(", ")} a ${a.shape}${a.cardinality ? ` of ${a.cardinality.min} to ${a.cardinality.max} items` : ""}.`);
    const actions = manifest.actions.length > 0 ? [`Actions: ${manifest.actions.map((a) => a.label).join(", ")}.`] : [];

    return [`${manifest.label}.`, ...uses, ...actions].join(" ");
}

/** The catalog description: preamble, then one line per component. */
function guidance(components)
{
    const lines = components.map(({ manifest }) => `- ${catalogName(manifest)}: ${describeComponent(manifest)}`);

    return [PREAMBLE, "", ...lines.sort()].join("\n");
}

function sortKeys(obj)
{
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
