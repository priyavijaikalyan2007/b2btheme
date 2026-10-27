/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiMessageChecker
 * 📜 PURPOSE: Judge agent-written A2UI v0.9.1 server-to-client messages
 *    against our catalog (#30 spec §3). Three layers, and a list is valid
 *    only if every layer accepts it:
 *      1. schema: the precompiled validators of message-validator.mjs;
 *      2. web_core: a headless dry run through a real MessageProcessor;
 *      3. references: dangling child IDs and surfaces without a root.
 *    Plain ESM with no Node APIs: the CLI, the playground page and the
 *    reference agent all run this one module.
 * 🔗 RELATES: [[AgentUiMessageValidator]], [[A2uiPlayground]], [[A2uiAdapter]]
 * ⚡ FLOW: [messages] -> [schema | dry run | references] -> [findings] -> [formatFindings]
 *
 * WHY THE DRY RUN GOES ONE MESSAGE AT A TIME
 * ------------------------------------------
 * `processMessages` throws at the first bad message and stops. Feeding
 * messages singly records each failure against its own index and still
 * checks the rest against the surface state built so far.
 *
 * WHY THERE IS A REFERENCES LAYER
 * -------------------------------
 * web_core 0.14.0 accepts a child ID that no component defines, and only
 * the renderer ever notices. LLMs write such references often. Which props
 * hold references is read from the catalog schemas ($refs to common_types
 * ComponentId and ChildList), never listed by hand.
 */

export const MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];

const SCHEMA_ONLY = "schema rejects, web_core accepts: it would render but breaks the catalog contract";
const CORE_ONLY = "web_core rejects, schema accepts: the schema cannot see surface state or ordering";

function finding(index, path, layer, message)
{
    return { index, path, layer, message };
}

// ── Layer 1: schema ─────────────────────────────────────────────────────

/**
 * Schema findings: each message is dispatched on its single update key, and
 * each component is checked by its own catalog validator, so errors name
 * one prop rather than a whole oneOf of components.
 *
 * @param {unknown[]} messages - Server-to-client messages.
 * @param {{messages: object, components: object}} validators - From message-validator.mjs.
 * @returns {object[]} Findings.
 */
export function checkSchema(messages, validators)
{
    return messages.flatMap((message, index) => schemaFindings(message, index, validators));
}

function schemaFindings(message, index, validators)
{
    const keys = MESSAGE_TYPES.filter((t) => message !== null && typeof message === "object" && t in message);

    if (keys.length !== 1)
    {
        return [finding(index, "", "schema", `a message must contain exactly one of ${MESSAGE_TYPES.join(", ")}; `
            + `found ${keys.length === 0 ? "none" : keys.join(" and ")}`)];
    }

    if (keys[0] === "updateComponents") { return componentFindings(message, index, validators); }

    const validate = validators.messages[keys[0]];

    return validate(message) ? [] : ajvFindings(validate.errors, index, "", message, validators);
}

/** Envelope errors outside individual components, then each component by its own validator. */
function componentFindings(message, index, validators)
{
    const list = message.updateComponents?.components;
    const envelope = validators.messages.updateComponents;

    if (envelope(message)) { return []; }

    const outside = envelope.errors.filter((e) => !e.instancePath.startsWith("/updateComponents/components/"));
    const out = ajvFindings(outside, index, "", message, validators);

    if (!Array.isArray(list)) { return out; }

    list.forEach((component, i) => out.push(...oneComponent(component, index, i, validators)));

    return out;
}

function oneComponent(component, index, i, validators)
{
    const at = `updateComponents.components[${i}]`;
    const validate = validators.components[component?.component];

    if (!validate)
    {
        return [finding(index, `${at}.component`, "schema", `unknown component "${component?.component}"; this `
            + `catalog has ${Object.keys(validators.components).length} components, listed in its anyComponent`)];
    }

    return validate(component) ? [] : ajvFindings(validate.errors, index, at, component, validators);
}

/**
 * Groups Ajv errors by instance path. A path whose errors include an
 * anyOf/oneOf is one finding, described from the SHAPE of the value
 * received: Ajv's schema paths across $refs are too irregular to name the
 * arm that "should" have matched.
 */
function ajvFindings(errors, index, prefix, data, validators)
{
    const groups = new Map();

    for (const e of errors ?? []) { groups.set(e.instancePath, [...(groups.get(e.instancePath) ?? []), e]); }

    const unions = [...groups.keys()].filter((p) => groups.get(p).some(isUnion));
    const covered = (p) => unions.some((u) => u !== p && p.startsWith(`${u}/`));
    const paths = [...groups.keys()].filter((p) => !covered(p));

    return paths.map((p) => finding(index, joinPath(prefix, dotted(p)), "schema",
        unions.includes(p) ? describeUnion(p, groups, valueAt(data, p), validators) : groups.get(p)[0].message));
}

function isUnion(e)
{
    return e.keyword === "anyOf" || e.keyword === "oneOf";
}

function isObject(v)
{
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function describeUnion(p, groups, value, validators)
{
    if (isObject(value) && "call" in value) { return describeCall(value, validators); }

    if (isObject(value) && "path" in value)
    {
        const own = [...groups.entries()].filter(([q]) => q === p || q.startsWith(`${p}/`))
            .flatMap(([q, es]) => es.filter((e) => /DataBinding/.test(e.schemaPath) && !isUnion(e))
                .map((e) => `${dotted(q.slice(p.length)) || "binding"} ${e.message}`));

        return `as a data binding: ${unique(own).join("; ")}`;
    }

    return `expected ${literalHint(groups.get(p))}a data binding {"path": "/…"}, or a function call `
        + `{"call": "<name>", "args": {…}}; got ${preview(value)}`;
}

function literalHint(own)
{
    const consts = own.filter((e) => e.keyword === "const").map((e) => JSON.stringify(e.params.allowedValue));
    const enums = own.filter((e) => e.keyword === "enum").flatMap((e) => e.params.allowedValues.map((v) =>
        JSON.stringify(v)));
    const values = unique([...consts, ...enums]);
    const types = unique(own.filter((e) => e.keyword === "type" && e.params.type !== "object")
        .map((e) => e.params.type));

    if (values.length > 0) { return `a literal ${values.length === 1 ? values[0] : `one of ${values.join(", ")}`}, `; }

    return types.length > 0 ? `a literal ${types.join(" or ")}, ` : "";
}

function describeCall(value, validators)
{
    const validate = validators.functions?.[value.call];

    if (!validate)
    {
        return `unknown function "${value.call}"; this catalog's functions are `
            + `${Object.keys(validators.functions ?? {}).join(", ")}`;
    }

    if (validate(value)) { return `the function call "${value.call}" is valid, but its result does not fit here`; }

    const errors = validate.errors.filter((e) => !isUnion(e)).map((e) => `${dotted(e.instancePath) || "call"} `
        + `${e.message}`);

    return `function "${value.call}": ${unique(errors).slice(0, 6).join("; ")}`;
}

function valueAt(data, pointer)
{
    return pointer.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))
        .reduce((node, key) => (node !== null && typeof node === "object" ? node[key] : undefined), data);
}

function preview(value)
{
    const text = JSON.stringify(value) ?? String(value);

    return text.length > 60 ? `${text.slice(0, 57)}…` : text;
}

function unique(list)
{
    return [...new Set(list)];
}

/** `/updateComponents/components/0/value` -> `updateComponents.components[0].value`. */
function dotted(pointer)
{
    return pointer.split("/").slice(1).map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))
        .reduce((acc, s) => (/^\d+$/.test(s) ? `${acc}[${s}]` : acc ? `${acc}.${s}` : s), "");
}

function joinPath(prefix, rest)
{
    if (!prefix) { return rest; }

    return rest ? `${prefix}.${rest}` : prefix;
}

// ── Layer 2: web_core dry run ───────────────────────────────────────────

/**
 * Our catalog linked exactly as createOutcropCatalogFrom links it, minus
 * the element classes, which need a DOM.
 *
 * @param {object} catalogJson - Our published catalog.
 * @param {{Catalog: Function, basicCatalog: object, BASIC_FUNCTIONS: object}} webCore
 * @returns {object} A web_core catalog.
 */
export function linkSchemaOnly(catalogJson, webCore)
{
    const loaded = webCore.Catalog.fromJson(catalogJson).withPeerCatalogs([webCore.basicCatalog]);
    const entries = [...loaded.components.values()].map((api) =>
    {
        const basic = webCore.basicCatalog.components.get(api.name);

        return basic ? { ...basic, schema: api.schema } : api;
    });

    return loaded.withEntries(entries, webCore.BASIC_FUNCTIONS);
}

/**
 * Feeds the messages one at a time through a fresh MessageProcessor and
 * collects every throw and surface error against its message's index.
 *
 * @param {unknown[]} messages - Server-to-client messages.
 * @param {object} webCore - { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS }.
 * @param {object} catalogJson - Our published catalog.
 * @returns {object[]} Findings.
 */
export function dryRun(messages, webCore, catalogJson)
{
    const out = [];
    let current = 0;
    const processor = new webCore.MessageProcessor([linkSchemaOnly(catalogJson, webCore)], () => undefined);

    processor.onSurfaceCreated((surface) => surface.onError.subscribe((e) =>
        out.push(finding(current, e.path ?? "", "web_core", `${e.code}: ${e.message}`))));

    messages.forEach((message, index) =>
    {
        current = index;

        try { processor.processMessages([message]); }
        catch (err) { out.push(finding(index, "", "web_core", String(err?.message ?? err))); }
    });

    return out;
}

// ── Layer 3: references ─────────────────────────────────────────────────

/**
 * Where each catalog component holds component IDs, read from its schema.
 *
 * @param {{ours: object, basic: object}} catalogs - Our catalog and Google's basic catalog.
 * @returns {Map<string, {path: string[], kind: "id"|"childList"}[]>} Sites by component name.
 */
export function referenceProps(catalogs)
{
    const sites = new Map();

    for (const source of [catalogs.ours, catalogs.basic])
    {
        for (const [name, schema] of Object.entries(source.components ?? {}))
        {
            const found = [];

            walk(schema, [], found);
            if (found.length > 0) { sites.set(name, found); }
        }
    }

    return sites;
}

function walk(node, path, found)
{
    if (!node || typeof node !== "object") { return; }

    if (typeof node.$ref === "string" && /\/ComponentId$/.test(node.$ref)) { found.push({ path, kind: "id" }); }
    if (typeof node.$ref === "string" && /\/ChildList$/.test(node.$ref)) { found.push({ path, kind: "childList" }); }

    for (const [key, child] of Object.entries(node.properties ?? {})) { walk(child, [...path, key], found); }
    if (node.items) { walk(node.items, [...path, "*"], found); }
    for (const k of ["allOf", "anyOf", "oneOf"]) { (node[k] ?? []).forEach((child) => walk(child, path, found)); }
}

/**
 * Dangling references and missing roots, judged once the whole list has
 * been applied. Re-sending a component ID is an update, never a finding.
 *
 * @param {unknown[]} messages - Server-to-client messages.
 * @param {{ours: object, basic: object}} catalogs - For referenceProps.
 * @returns {object[]} Findings, with `index: null`.
 */
export function checkReferences(messages, catalogs)
{
    const sites = referenceProps(catalogs);
    const surfaces = collectSurfaces(messages);
    const out = [];

    for (const [surfaceId, byId] of surfaces)
    {
        if (byId.size === 0) { continue; }

        if (!byId.has("root"))
        {
            out.push(finding(null, "", "references", `surface "${surfaceId}" has components but none with id "root"`));
        }

        for (const [id, component] of byId) { out.push(...dangling(id, component, byId, surfaceId, sites)); }
    }

    return out;
}

function collectSurfaces(messages)
{
    const surfaces = new Map();

    for (const m of messages)
    {
        if (m?.createSurface) { surfaces.set(m.createSurface.surfaceId, new Map()); }
        if (m?.deleteSurface) { surfaces.delete(m.deleteSurface.surfaceId); }

        const update = m?.updateComponents;
        const byId = update ? surfaces.get(update.surfaceId) : undefined;

        if (byId && Array.isArray(update.components))
        {
            for (const c of update.components) { if (c && typeof c.id === "string") { byId.set(c.id, c); } }
        }
    }

    return surfaces;
}

function dangling(id, component, byId, surfaceId, sites)
{
    const referenced = (sites.get(component.component) ?? []).flatMap((site) => idsAt(component, site));

    return referenced.filter((ref) => !byId.has(ref)).map((ref) => finding(null, "", "references",
        `component "${id}" references "${ref}", which surface "${surfaceId}" never defines`));
}

function idsAt(component, site)
{
    const values = site.path.reduce((nodes, key) => nodes.flatMap((n) =>
        (key === "*" ? (Array.isArray(n) ? n : []) : n !== null && typeof n === "object" && key in n ? [n[key]] : [])),
    [component]);

    return values.flatMap((v) =>
    {
        if (site.kind === "id") { return typeof v === "string" ? [v] : []; }
        if (Array.isArray(v)) { return v.filter((x) => typeof x === "string"); }

        return v !== null && typeof v === "object" && typeof v.componentId === "string" ? [v.componentId] : [];
    });
}

// ── All three ───────────────────────────────────────────────────────────

/**
 * Runs all three layers. Where only one of schema and web_core objects to
 * a message, its findings say so: neither layer overrides the other.
 *
 * @param {unknown[]} messages - Server-to-client messages.
 * @param {{validators: object, webCore: object, catalogJson: object, catalogs: object}} deps
 * @returns {{ok: boolean, findings: object[]}} The verdict.
 */
export function check(messages, deps)
{
    const schema = checkSchema(messages, deps.validators);
    const core = dryRun(messages, deps.webCore, deps.catalogJson);
    const indices = (list) => new Set(list.map((f) => f.index));
    const [s, c] = [indices(schema), indices(core)];
    const mark = (list, other, note) => list.map((f) => (other.has(f.index) ? f : { ...f, disagreement: note }));
    const findings = [...mark(schema, c, SCHEMA_ONLY), ...mark(core, s, CORE_ONLY),
        ...checkReferences(messages, deps.catalogs)];

    return { ok: findings.length === 0, findings };
}

/**
 * The text a developer, the CLI and the model all see (spec §3.2).
 *
 * @param {object[]} findings - From check() or a single layer.
 * @returns {string} One line per finding.
 */
export function formatFindings(findings)
{
    return findings.map((f) =>
    {
        const where = f.index === null ? "end of list" : `#${f.index}`;
        const at = f.path ? ` ${f.path}` : "";
        const note = f.disagreement ? ` (${f.disagreement})` : "";

        return `${where}${at}: ${f.message} [${f.layer}]${note}`;
    }).join("\n");
}
