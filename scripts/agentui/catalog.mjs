/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiCatalog
 * 📜 PURPOSE: Assemble the A2UI v0.9.1 catalog file from manifests, surfaces
 *    and schemas: basic-catalog re-exports plus one entry per component,
 *    with channels and providers expanded to plain properties by one naming
 *    rule: eventData, on<Channel>, on<Request>, <request>Result. Spec §5.4–5.5.
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
const FUNCTION_CALL = { $ref: `${COMMON_TYPES_ID}#/$defs/FunctionCall` };
const ACTION_REF = `${COMMON_TYPES_ID}#/$defs/Action`;

/** English plural of every DataShape (runtime/src/constants.ts DATA_SHAPES, a closed set). */
const SHAPE_PLURALS = Object.freeze({
    scalar: "scalars", record: "records", collection: "collections", hierarchy: "hierarchies", graph: "graphs",
    timeseries: "timeseries", document: "documents", media: "media", geo: "geos", diff: "diffs",
});
const PREAMBLE = "Components of the Enterprise Bootstrap Theme, plus the A2UI basic catalog's components and "
    + "functions, which this catalog re-exports. Every data property accepts a literal, a {\"path\": …} binding "
    + "or a {\"call\": …} function call to one of this catalog's functions; a <request>Result property accepts "
    + "only a binding. "
    + "Each event a component emits has an on<Event> action property. A component whose events or "
    + "requests carry a payload has one binding-only eventData property: bind it to a path, and the component "
    + "writes each event's payload to <path>/<channel>, and each request to <path>/<request>, before sending "
    + "the matching action, so read that path in the action's context; the context is resolved after the "
    + "write. A request's on<Request> action asks you for data: answer with updateDataModel at the path bound "
    + "to its <request>Result property, with a value matching the $defs entry its description names, once per "
    + "request. A two-way value property receives the user's changes at its bound "
    + "path. Some two-way components also send an action when the value changes; that action carries no "
    + "payload of its own, so read the new value through the path bound to value.";

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
        violations: [...violations, ...defCollisions(ours), ...ours.flatMap((o) => o.violations)],
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

/**
 * Relocated def keys shared by two components. UAX #31 allows "__" inside
 * names, so `A` + `B__C` and `A__B` + `C` both yield `A__B__C`.
 */
function defCollisions(ours)
{
    const owner = new Map();

    return ours.flatMap((o) => Object.keys(o.defs).flatMap((key) =>
    {
        const first = owner.get(key);
        owner.set(key, first ?? o.name);

        return first === undefined ? [] : [{
            component: o.name, member: key, code: VIOLATION.NAME_COLLISION,
            message: `${o.name}: relocated definition "${key}" is also produced by ${first}, so one would overwrite `
                + `the other and a $ref would point at the wrong schema. Set a distinct protocol.name on `
                + `${o.name} or ${first} (a name containing "__" makes the prefix ambiguous).`,
        }];
    }));
}

/** One component entry plus its relocated defs and prop-collision violations. */
function entryFor({ manifest, surface, schema })
{
    const name = catalogName(manifest);
    const { root, defs } = relocateDefs(schema, name);
    const entries = [...dataProps(surface, root, manifest.name), ...eventDataProp(surface),
        ...channelProps(surface, manifest.name),
        ...providerProps(surface, name), ...actionProps(surface)];
    const props = Object.fromEntries([["component", { const: name }], ...entries]);
    const dataNames = new Set(surface.dataProps.map((d) => d.name));

    return {
        name, defs: { ...defs, ...providerDefs(surface, root, manifest.name, name) },
        violations: [...propCollisions(manifest, ["component", ...entries.map(([n]) => n)]),
            ...commonCollisions(manifest, surface)],
        entry: {
            type: "object",
            description: describeComponent(manifest),
            allOf: [
                { $ref: `${COMMON_TYPES_ID}#/$defs/ComponentCommon` },
                { $ref: "#/$defs/CatalogComponentCommon" },
                { type: "object", properties: props,
                    required: ["component", ...(root.required ?? []).filter((n) => dataNames.has(n)),
                        ...requiredProviderProps(surface)] },
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

/** A schema property the surface lists; absent means surface and schema disagree. */
function requireProperty(root, component, kind, prop)
{
    const found = root.properties?.[prop];

    if (found === undefined)
    {
        throw new Error(`${component}: the surface lists ${kind} "${prop}" but the generated schema has no such `
            + "property. The surface and schema disagree; this means the post-check in generate.mjs did not run "
            + "or is broken.");
    }

    return found;
}

/**
 * A data prop's value: a literal of its generated schema, a binding, or a
 * function call (user decision, 2026-10-25). anyOf, not oneOf: an open object
 * schema also matches a binding, and oneOf would then reject every binding.
 */
function literalBindingOrCall(schema)
{
    return { anyOf: [schema, BINDING, FUNCTION_CALL] };
}

/** Data props: literal, binding or function call, description outside the anyOf. */
function dataProps(surface, root, component)
{
    const childSlots = new Set((surface.children ?? []).map((ch) => ch.path));

    return surface.dataProps.map((d) =>
    {
        const { description, ...schema } = requireProperty(root, component, "data prop", d.name);

        // A child slot is a component id (ADR-238), as the basic Card's child is: never bound or computed.
        if (childSlots.has(d.name))
        {
            return [d.name, { description, ...schema }];
        }
        const twoWay = d.name === "value" && surface.twoWayValue
            ? ` Two-way: when bound to a path, the component writes the user's changes there.${clearText(surface)}` : "";

        return [d.name, { description: `${description ?? d.jsdoc}${twoWay}`, ...literalBindingOrCall(schema) }];
    });
}

/**
 * A `{ cleared: null }` component can be emptied. An A2UI data model cannot
 * hold null (setting it deletes the key), so cleared is an absent path, in
 * both directions, and the description says so (ADR-222).
 */
function clearText(surface)
{
    return surface.change && "cleared" in surface.change
        ? " When the user clears it, the path is deleted; delete the path to clear it, or leave it absent to "
            + "start empty." : "";
}

/**
 * The one binding-only eventData prop, present only when some event or
 * provider carries a payload (a two-way field's change carries it in value).
 */
function eventDataProp(surface)
{
    const carries = surface.events.some((e) => !e.payloadInValue) || surface.providers.length > 0;

    return carries ? [["eventData", { description: "Bind to a path. The component writes each event's payload "
        + "to <path>/<channel>, and each request to <path>/<request>, before sending the matching action.",
    ...BINDING }]] : [];
}

/** Each channel: an on<Channel> Action whose description says what its payload is and where. */
function channelProps(surface, component)
{
    return surface.events.map((e) => [e.actionProp, { $ref: ACTION_REF, description: e.payloadInValue
        ? "Sent when the value changes. Read the new value through the path bound to `value`."
        : `Sent when "${e.channel}" emits. Its payload (${payloadPhrase(e, component)}) is at `
            + `<eventData path>/${e.channel}.` }]);
}

/** "a record", or "one or more records" for a multi-item channel. */
function payloadPhrase(e, component)
{
    const plural = SHAPE_PLURALS[e.payload];

    if (plural === undefined)
    {
        throw new Error(`${component}: channel "${e.channel}" has payload shape "${e.payload}", which is not a `
            + `DataShape (${Object.keys(SHAPE_PLURALS).join(", ")}). Manifest validation should have rejected it; `
            + `correct emits[${e.channel}].payload in components/${component}/${component}.manifest.ts, or add the `
            + "new shape to SHAPE_PLURALS in scripts/agentui/catalog.mjs.");
    }

    return e.multi ? `one or more ${plural}` : `a ${e.payload}`;
}

/**
 * Each provider: an on<Request> Action (request under eventData) and a
 * binding-only <request>Result. A literal cannot answer a request, so the
 * answer's schema lives at $defs["<Component>__<request>Result"] and the
 * description names it (ADR-225, spec S7).
 */
function providerProps(surface, name)
{
    return surface.providers.flatMap((p) => [
        [p.actionProp, { description: `Sent when the component needs "${p.request}" answered. Its request is `
            + `at <eventData path>/${p.request}. Answer with updateDataModel at the path bound to ${p.response}.`,
        $ref: ACTION_REF }],
        [p.response, { description: `Bind to the path you will answer ${p.actionProp} at with updateDataModel, and `
            + `write a value matching #/$defs/${name}__${p.response} there. A literal cannot answer a request.`,
        ...BINDING }],
    ]);
}

/**
 * What a required provider makes the catalog require (ADR-234): its on<Request>
 * action and <request>Result binding, and eventData, without which the adapter
 * wires no provider at all. A component that would otherwise fall back to
 * host-side behaviour an agent must not trigger then fails validation instead.
 */
function requiredProviderProps(surface)
{
    const required = surface.providers.filter((p) => p.required === true);

    return required.length === 0 ? [] : ["eventData", ...required.flatMap((p) => [p.actionProp, p.response])];
}

/** Each provider's answer schema, relocated to the catalog root as <Component>__<request>Result. */
function providerDefs(surface, root, component, name)
{
    return Object.fromEntries(surface.providers.map((p) =>
    {
        const { description, ...answer } = requireProperty(root, component, "provider response", p.response);
        void description;

        return [`${name}__${p.response}`, answer];
    }));
}

/** Each manifest action not merged into a same-named channel: an on<Id> Action. */
function actionProps(surface)
{
    return surface.actions.map((a) =>
        [a.actionProp, { description: `Sent when the user invokes "${a.label}".`, $ref: ACTION_REF }]);
}

/**
 * A generated prop name used twice within one component. Checked on the
 * name list, before Object.fromEntries could silently keep only the last.
 */
function propCollisions(manifest, names)
{
    const dupes = [...new Set(names.filter((n, i) => names.indexOf(n) !== i))];

    return dupes.map((n) => ({
        component: manifest.name, member: n, code: VIOLATION.PROP_COLLISION,
        message: `${manifest.name}.${n}: two catalog properties would share the name "${n}". Catalog names are `
            + "derived by one rule with no override (specs/agentui-schema.prd.md §5.4): eventData, on<Channel>, "
            + "on<Id>, on<Request> and <request>Result. Change the protocol.providers request or the actions[] id "
            + "that derives it, or declare the colliding data option in protocol.hostOnly, in "
            + `components/${manifest.name}/${manifest.name}.manifest.ts`,
    }));
}

/**
 * Properties A2UI gives every component: ComponentCommon's id and
 * accessibility (common_types.json) and CatalogComponentCommon's weight (the
 * basic catalog). A data option of the same name would be read as the
 * component's own id, label or flex weight, never reaching the component.
 */
const COMMON_PROPS = ["id", "accessibility", "weight"];

/** Data props named like a property every A2UI component already has (B4). */
function commonCollisions(manifest, surface)
{
    return surface.dataProps.filter((d) => COMMON_PROPS.includes(d.name)).map((d) => ({
        component: manifest.name, member: d.name, code: VIOLATION.PROP_COLLISION,
        message: `${manifest.name}.${d.name}: every A2UI component already has "${d.name}", so the option cannot be `
            + "set separately. Declare it in protocol.hostOnly with a reason, in "
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
        `Use it to ${a.intents.join(", ")} a ${a.shape}${a.cardinality ? cardinalityText(a.cardinality) : ""}.`);
    const hostOnly = manifest.protocol?.hostOnlyActions ?? {};
    const shown = manifest.actions.filter((a) => hostOnly[a.id] === undefined);
    const actions = shown.length > 0 ? [`Actions: ${shown.map((a) => a.label).join(", ")}.`] : [];

    const agent = manifest.agent ? [manifest.agent.useWhen, manifest.agent.avoidWhen] : [];

    return [`${manifest.label}.`, ...agent, ...uses, ...actions].join(" ");
}

/** " of 2 to 500 items"; " of exactly 1 item" when min equals max. */
function cardinalityText({ min, max })
{
    return min === max ? ` of exactly ${min} item${min === 1 ? "" : "s"}` : ` of ${min} to ${max} items`;
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
