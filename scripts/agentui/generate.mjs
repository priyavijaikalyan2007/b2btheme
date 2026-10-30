#!/usr/bin/env node
/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiGenerator
 * 📜 PURPOSE: Classify -> resolve -> emit -> check -> catalog -> diff, then
 *    write, rolled back on failure (not atomic under SIGKILL). Every problem
 *    is collected first and the run fails once, writing nothing to dist/
 *    (spec §8).
 * 🔗 RELATES: [[AgentUiClassifier]], [[AgentUiResolver]], [[AgentUiCatalog]],
 *    [[AgentUiMigration]], [[AgentProtocolSchema]]
 * ⚡ FLOW: [dist/capability-manifest.json] -> [runPipeline]
 *          -> [dist/schemas, dist/a2ui, dist/mcp, dist/agentui-report.json]
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { bundleAdapter } from "./adapter-bundle.mjs";
import { leanCatalog, leanProblems } from "./agent-catalog.mjs";
import { promptSizes } from "./catalog-size.mjs";
import { checkAgentDescription } from "./agent-description.mjs";
import { buildDescriptors } from "./adapter-descriptors.mjs";
import { compileValidators } from "./adapter-validators.mjs";
import { CATALOG_MAJOR, buildCatalog, catalogId } from "./catalog.mjs";
import { descriptionsDiffer, diffCatalogs, versionProblem } from "./catalog-diff.mjs";
import { defaultOptionsErrors, missingDataMembers, missingDescriptions } from "./checks.mjs";
import { classifyMembers, createClassifier, factoryOptionsType, optionsParameterIndex } from "./classify.mjs";
import { rendererMeta } from "./mcp-descriptors.mjs";
import { BELOW_REQUIRED, PENDING_CLASSIFICATION } from "./migration.mjs";
import { normaliseTypiaUnit, pruneDefs } from "./normalise.mjs";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
import { VIOLATION, isCovered, resolveSurface } from "./resolve.mjs";
import { emitSchemas } from "./schema.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUBLISHED = path.join(REPO, "specs", "agentui", "published");
const OUTPUT_ROOTS = ["schemas", "a2ui", "mcp", "agentui-report.json"];

/**
 * The measured backlog, by the check [20] count that ratchets it. These are
 * the ONLY codes PENDING_CLASSIFICATION excuses; countsFor() counts from the
 * same table, so what is excused and what is counted cannot drift. Any other
 * code (a stale declaration, a short reason, a provider's arity, a double
 * classification) fails the build for a pending component too.
 */
export const BACKLOG_COUNTS = Object.freeze({
    unclassifiedOptions: new Set([VIOLATION.UNCLASSIFIED, VIOLATION.UNDECLARED_MIXED,
        VIOLATION.UNDECLARED_HAZARD, VIOLATION.TOO_BROAD]),
    protocolPropsMissingJsdoc: new Set([VIOLATION.MISSING_JSDOC]),
    changeMismatches: new Set([VIOLATION.CHANGE_MISMATCH]),
});

/** Every code a PENDING_CLASSIFICATION entry excuses: the union of BACKLOG_COUNTS. */
export const PENDING_EXCUSABLE_CODES = new Set(Object.values(BACKLOG_COUNTS).flatMap((codes) => [...codes]));

/**
 * The whole generator, without touching dist (spec §§3–6, §8).
 *
 * @param input - See the Task 8 interface block.
 * @returns { errors, excluded, outputs, catalog, descriptors, counts }.
 */
// @entrypoint
export function runPipeline(input)
{
    const errors = [];
    const classified = classifyFleet(input, errors);
    const { included, excluded } = partition(classified, input, errors);
    const schemas = emitAndCheck(included, input, errors);
    const ready = included.filter((c) => schemas.has(c.manifest.name));
    const { catalog, violations } = buildCatalog({ basic: input.basic,
        components: ready.map((c) => ({ ...c, schema: schemas.get(c.manifest.name) })), major: input.major });

    errors.push(...violations.map((v) => v.message));
    errors.push(...ready.flatMap((c) => checkAgentDescription(c.manifest, Object.keys(catalog.components))));
    checkBaseline(catalog, input, errors);

    const lean = leanFor(catalog, input, errors);
    const adapter = buildDescriptors(ready, catalog, input.assetExists, input.libraries);
    errors.push(...adapter.problems);

    return { errors, excluded, catalog, descriptors: adapter.descriptors,
        outputs: outputsFor(ready, schemas, { catalog, lean }, excluded, input),
        counts: { ...countsFor(classified, ready, excluded), belowRequired: input.belowRequired.size } };
}

/** The agent-facing rendering (#49, ADR-233), with the problems that would make it lossy collected. */
function leanFor(catalog, input, errors)
{
    try
    {
        const lean = leanCatalog({ catalog, basic: input.basic, commonTypes: input.commonTypes });

        errors.push(...leanProblems(catalog, lean));
        return lean;
    }
    catch (err)
    {
        errors.push(err.message);
        return null;
    }
}

/** Classifies and resolves every manifest; a thrown literate error is collected. */
function classifyFleet(input, errors)
{
    const ctx = createClassifier(input.tsconfigPath, input.cacheDir);

    return input.manifests.flatMap((manifest) =>
    {
        try
        {
            const file = input.componentFile(manifest.name);
            const { type, location, handleType } = factoryOptionsType(ctx, file, manifest.factory,
                optionsParameterIndex(manifest));
            const members = classifyMembers(ctx, type, location, handleType);

            return [{ manifest, members, file, surface: resolveSurface(manifest, members) }];
        }
        catch (err)
        {
            errors.push(`${manifest.name}: ${err.message}`);
            return [];
        }
    });
}

/**
 * Splits into included / excluded per PENDING_CLASSIFICATION, and polices the
 * list. A pending component is excused only its backlog codes
 * (PENDING_EXCUSABLE_CODES); every other violation is an error for it too.
 */
function partition(classified, input, errors)
{
    const included = [];
    const excluded = [];

    for (const c of classified)
    {
        const violations = blockingViolations(c, input);
        const pending = input.pending.has(c.manifest.name);
        const excused = pending ? violations.filter((v) => PENDING_EXCUSABLE_CODES.has(v.code)) : [];

        errors.push(...violations.filter((v) => !excused.includes(v)).map((v) => v.message));
        if (pending && excused.length === 0) { errors.push(staleEntry(c.manifest.name)); }

        if (violations.length === 0) { included.push(c); continue; }

        if (pending) { excluded.push({ name: c.manifest.name, violations: violations.map((v) => v.message) }); }
    }

    return { included, excluded };
}

/** A PENDING_CLASSIFICATION entry with nothing left for the list to excuse. */
function staleEntry(name)
{
    return `${name} is in PENDING_CLASSIFICATION but has none of the backlog violations the list excuses `
        + `(${[...PENDING_EXCUSABLE_CODES].join(", ")}). Remove it from scripts/agentui/migration.mjs; `
        + "the list may only shrink.";
}

/** A component's violations, minus value-below-field while it is on BELOW_REQUIRED. */
function blockingViolations(c, input)
{
    return c.surface.violations.filter((v) =>
        !(v.code === VIOLATION.VALUE_BELOW_FIELD && input.belowRequired.has(c.manifest.name)));
}

/** typia entries for the included components; normalised, overridden, post-checked. */
function emitAndCheck(included, input, errors)
{
    const entries = included.map((c) => ({
        id: c.manifest.name, alias: `AgentUi_${c.manifest.name}`, file: c.file, factory: c.manifest.factory,
        paramIndex: optionsParameterIndex(c.manifest), pick: typiaPick(c),
        providers: c.surface.providers,
    }));
    const results = emitSchemas(entries, { tsconfigPath: input.tsconfigPath, cacheDir: input.cacheDir });
    const out = new Map();

    for (const c of included)
    {
        const schema = schemaFor(c, results.get(c.manifest.name), errors);
        if (schema) { out.set(c.manifest.name, schema); }
    }

    return out;
}

/**
 * The data props typia describes: all but those with a protocol.schemas
 * entry, whose generated schema would be replaced anyway, and whose type may
 * be one typia cannot describe at all (Stepper's steps hold elements, B5).
 */
export function typiaPick(c)
{
    const overridden = c.manifest.protocol?.schemas ?? {};

    // protocol.fixed (ADR-235) is described too, so its values can be checked, then taken out (withoutFixed).
    return [...c.surface.dataProps.map((d) => d.name).filter((n) => overridden[n] === undefined),
        ...Object.keys(c.surface.fixed ?? {})];
}

/** One component's schema, or null with its problems recorded. */
function schemaFor(c, result, errors)
{
    const name = c.manifest.name;

    if (result.error) { errors.push(`${name}: typia could not describe the options: ${result.error}`); return null; }

    const stripped = stripHostOnlyPaths(normaliseTypiaUnit(result.unit), c);
    const schema = applyOverrides(stripped.schema, c.manifest.protocol?.schemas ?? {}, c.surface.dataProps);
    const problems = [
        ...stripped.problems,
        ...missingDataMembers(schema, c.surface.dataProps.map((d) => d.name)).map((m) =>
            `${name}.${m}: the schema tool dropped this data member without saying so. Report it on #17.`),
        ...missingDescriptions(schema, c.surface.dataProps).map((m) =>
            `${name}.${m}: has JSDoc but the schema lost it; typia ignores a comment on the member's own line. `
            + "Move the /** … */ onto the line above."),
        ...defaultOptionsErrors(schema, c.manifest.defaultOptions ?? {}).map((e) =>
            `${name}: defaultOptions ${e} against the generated schema. One of them is wrong; fix the manifest or the options type.`),
        ...fixedProblems(schema, c),
        ...overrideProblems(c),
    ];

    errors.push(...problems);
    return problems.length === 0 ? withoutFixed(schema, c) : null;
}

/** The keywords that constrain a schema node; one without any accepts anything. */
const CONSTRAINING = ["type", "const", "enum", "oneOf", "anyOf", "allOf", "$ref"];

/**
 * The places a protocol.schemas override is unconstrained or open (#27). The
 * TOO_BROAD rule keeps the catalog from publishing a bag an agent can fill
 * with anything, and an override replaced the generated schema unchecked, so
 * `{}` or `{ type: "object" }` published exactly that. A typed record
 * (`additionalProperties: { type: "string" }`) is constrained, and allowed.
 */
function overrideProblems(c)
{
    return Object.entries(c.manifest.protocol?.schemas ?? {}).flatMap(([option, schema]) =>
        openPlaces(schema, option).map((place) => `${c.manifest.name}.${option}: the protocol.schemas override `
            + `${place}, so the catalog would publish a bag an agent can fill with anything. Close it in `
            + `components/${c.manifest.name}/${c.manifest.name}.manifest.ts.`));
}

/** Each unconstrained or open node under `node`, described by its path from the option. */
function openPlaces(node, at)
{
    if (node === null || typeof node !== "object" || Array.isArray(node))
    {
        return [`has a non-schema value at ${at}`];
    }

    const places = [];

    if (!CONSTRAINING.some((k) => k in node)) { places.push(`leaves ${at} unconstrained`); }

    if (node.type === "object" && node.additionalProperties !== false
        && (typeof node.additionalProperties !== "object" || node.additionalProperties === null))
    {
        places.push(`leaves the object at ${at} open (give it additionalProperties: false, or a schema for its `
            + "values)");
    }

    if (node.type === "array" && node.items === undefined)
    {
        places.push(`leaves the items of the array at ${at} unconstrained`);
    }

    for (const [key, child] of Object.entries(node.properties ?? {}))
    {
        places.push(...openPlaces(child, `${at}.${key}`));
    }

    if (typeof node.additionalProperties === "object" && node.additionalProperties !== null)
    {
        places.push(...openPlaces(node.additionalProperties, `${at}[]`));
    }

    if (node.items !== undefined) { places.push(...openPlaces(node.items, `${at}[]`)); }

    for (const key of ["oneOf", "anyOf", "allOf"])
    {
        (node[key] ?? []).forEach((arm, i) => { places.push(...openPlaces(arm, `${at}.${key}[${i}]`)); });
    }

    return places;
}

/**
 * A protocol.fixed value its option's schema rejects (ADR-235). The adapter
 * passes it on every mount, and nothing else would catch a value the
 * component cannot take.
 */
function fixedProblems(schema, c)
{
    const ajv = new Ajv2020({ strict: false, allErrors: true });

    return Object.entries(c.surface.fixed ?? {}).flatMap(([option, value]) =>
    {
        const validate = ajv.compile({ ...schema.properties[option], $defs: schema.$defs ?? {} });

        return validate(value) ? [] : [`${c.manifest.name}.${option}: protocol.fixed gives it ${JSON.stringify(value)}, `
            + `which its type rejects (${ajv.errorsText(validate.errors)}). The adapter passes this value on every `
            + "mount; give one the option accepts."];
    });
}

/** The schema without the fixed options, which no agent sees (ADR-235), and the defs only they used. */
function withoutFixed(schema, c)
{
    const fixed = new Set(Object.keys(c.surface.fixed ?? {}));

    if (fixed.size === 0) { return schema; }

    const properties = Object.fromEntries(Object.entries(schema.properties).filter(([k]) => !fixed.has(k)));
    const required = (schema.required ?? []).filter((k) => !fixed.has(k));
    const { required: _required, ...rest } = schema;

    return pruneDefs({ ...rest, properties, ...(required.length > 0 ? { required } : {}) });
}

/**
 * Removes the plain fields that nested protocol.hostOnly paths name, such as
 * Breadcrumb's items[].href (ADR-230): catalog objects are closed, so an
 * agent's value there is rejected. A path that covers a hazard is a
 * declaration only, as before; the schema tool already drops or opens it.
 */
function stripHostOnlyPaths(schema, c)
{
    const keys = Object.keys(c.manifest.protocol?.hostOnly ?? {}).filter((k) => /[.[]/.test(k));
    const hazards = c.members.flatMap((m) => m.hazards.map((h) => h.path));
    const covers = (k) => hazards.some((p) => isCovered(p, { [k]: "" }));
    const nested = keys.filter((k) => !covers(k));
    // A strict parent of hazards (DiagramEngine's presentation.embed, B9) names a field an agent must not write,
    // so it leaves the schema too. It may name nothing there (typia drops functions, and an overridden prop is
    // not described), which is not an error. A key that IS a hazard path keeps its published schema (ADR-230).
    const parents = keys.filter((k) => covers(k) && !hazards.includes(k));

    if (nested.length === 0 && parents.length === 0) { return { schema, problems: [] }; }

    const out = structuredClone(schema);
    const problems = nested.filter((k) => !removePath(out, k)).map((k) => `${c.manifest.name}.${k}: protocol.hostOnly `
        + "names nothing in the generated schema, so nothing was removed. Correct the path in "
        + `components/${c.manifest.name}/${c.manifest.name}.manifest.ts.`);

    for (const k of parents) { removePath(out, k); }

    return { schema: pruneDefs(out), problems };
}

/** Deletes the field `path` names ("pages[].url"), through $refs and union arms; false when it names nothing. */
function removePath(schema, path)
{
    const [root, ...rest] = path.split(/(?=\[\])|\.|(?<=\[\])/).filter(Boolean);
    const field = rest.pop();
    let nodes = [schema.properties[root]].filter(Boolean);

    for (const seg of rest)
    {
        nodes = nodes.flatMap((n) => arms(schema, n)).flatMap((n) => (seg === "[]" ? (n.items ? [n.items] : [])
            : (n.properties?.[seg] ? [n.properties[seg]] : [])));
    }

    const owners = nodes.flatMap((n) => arms(schema, n)).filter((n) => n.properties?.[field] !== undefined);

    for (const o of owners)
    {
        delete o.properties[field];
        if (Array.isArray(o.required)) { o.required = o.required.filter((r) => r !== field); }
    }

    return owners.length > 0;
}

/** A schema node, dereferenced, and every arm of its unions. */
function arms(schema, node)
{
    const n = node.$ref?.startsWith("#/$defs/") ? schema.$defs[node.$ref.slice("#/$defs/".length)] : node;

    return [n, ...[...(n.anyOf ?? []), ...(n.oneOf ?? [])].flatMap((a) => arms(schema, a))];
}

/**
 * Replaces generated property schemas with protocol.schemas entries, then
 * drops the $defs only a replaced schema used (B4): an orphan would still
 * describe, say, an href the override left out on purpose.
 */
function applyOverrides(schema, overrides, dataProps)
{
    const properties = { ...schema.properties };
    const jsdoc = new Map(dataProps.map((d) => [d.name, d.jsdoc]));

    for (const [name, override] of Object.entries(overrides))
    {
        // typia was not asked about an overridden prop (typiaPick), so its JSDoc is the description.
        properties[name] = { ...override, description: jsdoc.get(name) };
    }

    const required = [...new Set([...(schema.required ?? []),
        ...dataProps.filter((d) => overrides[d.name] !== undefined && !d.optional).map((d) => d.name)])];

    return pruneDefs({ ...schema, properties, ...(required.length > 0 ? { required } : {}) });
}

/** Breaking changes need a bump; any change needs the baseline committed. */
function checkBaseline(catalog, input, errors)
{
    const majors = [...input.baselines.keys()];

    if (majors.length === 0)
    {
        if (!input.writeBaseline) { errors.push("No published catalog baseline exists in specs/agentui/published/. Run `npm run build:agentui -- --write-baseline` and commit it."); }
        return;
    }

    const previousMajor = Math.max(...majors);
    const diff = diffCatalogs(input.baselines.get(previousMajor), catalog);
    const unwritten = versionProblem(diff, previousMajor, input.major) ?? unwrittenBaselineProblem(catalog, input, previousMajor, diff);

    if (unwritten) { errors.push(unwritten); }
}

/** The error for a baseline that must be (re)written and committed, or null. */
function unwrittenBaselineProblem(catalog, input, previousMajor, diff)
{
    if (input.writeBaseline) { return null; }

    if (input.major > previousMajor)
    {
        return `CATALOG_MAJOR is now ${input.major}. Commit its baseline with `
            + "`npm run build:agentui -- --write-baseline` in the same change; v" + previousMajor + " stays published.";
    }

    const baseline = input.baselines.get(previousMajor);

    if (input.major === previousMajor && JSON.stringify(baseline) !== JSON.stringify(catalog))
    {
        return `The catalog changed (${changeSummary(baseline, catalog, diff)}). Run `
            + "`npm run build:agentui -- --write-baseline` and commit specs/agentui/published/catalog-v"
            + `${input.major}.json in the same change.`;
    }

    return null;
}

/**
 * What a same-major, non-breaking change consists of: the additive changes,
 * then "description text" only if some description really changed. Anything
 * else the diff does not itemise is named as such rather than guessed at.
 */
function changeSummary(baseline, catalog, diff)
{
    const parts = [...diff.additive, ...(descriptionsDiffer(baseline, catalog) ? ["description text"] : [])];

    return parts.length > 0 ? parts.join(", ")
        : "nothing the diff itemises, such as key order or a dropped required entry; compare the files";
}

/** Every file to write, keyed by path relative to dist/. */
function outputsFor(ready, schemas, { catalog, lean }, excluded, input)
{
    const outputs = new Map(ready.map((c) => [`schemas/${c.manifest.name}.options.json`, schemas.get(c.manifest.name)]));

    outputs.set(`a2ui/catalog/v${input.major}.json`, catalog);
    outputs.set(`a2ui/catalog/v${input.major}.agent.json`, lean);

    for (const [major, older] of input.baselines)
    {
        if (major < input.major) { outputs.set(`a2ui/catalog/v${major}.json`, older); }
    }

    outputs.set("mcp/renderer.meta.json", rendererMeta());
    outputs.set("agentui-report.json", { catalogId: catalogId(input.major), excluded,
        hostOnly: Object.fromEntries(ready.map((c) => [c.manifest.name, c.surface.hostOnly])) });

    return outputs;
}

/**
 * Compiles the validators and bundles the A2UI adapter into the outputs, so
 * it is written in the same dist swap as the catalog it embeds (spec §3.4).
 * Call only when runPipeline returned no errors.
 *
 * @param result - runPipeline's result; its outputs are extended in place.
 * @param input  - Needs basic, commonTypes, major and repoRoot.
 * @param bundle - The bundler; injectable for tests.
 */
export async function addAdapter(result, input, bundle = bundleAdapter)
{
    const catalogText = `${JSON.stringify(result.catalog, null, 2)}\n`;
    const validatorsSource = compileValidators({ catalog: result.catalog, basic: input.basic,
        commonTypes: input.commonTypes, descriptors: result.descriptors });
    const out = await bundle({ catalogText, descriptors: result.descriptors, validatorsSource, repoRoot: input.repoRoot });
    const report = result.outputs.get("agentui-report.json");

    result.outputs.set(`a2ui/adapter/v${input.major}.js`, out.js);
    result.outputs.set(`a2ui/adapter/v${input.major}.d.ts`, out.dts);
    result.outputs.set("agentui-report.json", { ...report, adapter: { descriptors: result.descriptors, packages: out.packages } });
}

function countsFor(classified, ready, excluded)
{
    const all = classified.flatMap((c) => c.surface.violations);

    return {
        components: ready.length,
        excluded: excluded.length,
        dataProps: ready.reduce((n, c) => n + c.surface.dataProps.length, 0),
        events: ready.reduce((n, c) => n + c.surface.events.length, 0),
        providers: ready.reduce((n, c) => n + c.surface.providers.length, 0),
        hostOnly: ready.reduce((n, c) => n + Object.keys(c.surface.hostOnly).length, 0),
        ...Object.fromEntries(Object.entries(BACKLOG_COUNTS)
            .map(([count, codes]) => [count, all.filter((v) => codes.has(v.code)).length])),
    };
}

/**
 * Writes outputs into dist/, replacing each generated root wholesale.
 *
 * Guarantees (spec §8): everything is serialised in memory first, so a value
 * that cannot be serialised throws before dist/ is touched; the new files are
 * staged inside dist/ and swapped in per root, with the old roots parked in
 * the staging directory so that a failed swap is rolled back and dist/ is
 * left as it was (if the rollback itself fails, the staging directory is kept
 * and the error names where the old roots are). Content outside the generated roots is never touched.
 *
 * @param outputs - Map of dist-relative path to a JSON value, or to a string written verbatim.
 * @param distDir - The dist directory.
 * @param fsImpl - The file-system module; injectable so a test can fail a rename.
 */
export function writeOutputs(outputs, distDir, fsImpl = fs)
{
    const serialised = [...outputs].map(([rel, value]) =>
        [rel, typeof value === "string" ? value : `${JSON.stringify(value, null, 2)}\n`]);
    const staging = fsImpl.mkdtempSync(path.join(distDir, ".agentui-staging-"));
    let stranded = false;

    try
    {
        for (const [rel, text] of serialised)
        {
            fsImpl.mkdirSync(path.dirname(path.join(staging, rel)), { recursive: true });
            fsImpl.writeFileSync(path.join(staging, rel), text);
        }

        swapRoots(staging, distDir, fsImpl);
    }
    catch (err)
    {
        stranded = err.stranded === true;
        throw err;
    }
    finally
    {
        // A failed rollback leaves the previous roots in staging; deleting it would destroy them.
        if (!stranded) { fsImpl.rmSync(staging, { recursive: true, force: true }); }
    }
}

/** Parks the old roots, moves the new ones in, and rolls back if any move fails. */
function swapRoots(staging, distDir, fsImpl)
{
    const roots = OUTPUT_ROOTS.filter((t) => fsImpl.existsSync(path.join(staging, t)));
    const state = { staging, distDir, fsImpl, parked: [], placed: [], current: null };

    try
    {
        fsImpl.mkdirSync(path.join(staging, ".old"));
        roots.filter((r) => fsImpl.existsSync(path.join(distDir, r))).forEach((t) => move(state, t, "park"));
        roots.forEach((t) => move(state, t, "place"));
    }
    catch (err)
    {
        rollback(state);
        throw new Error(`Could not replace dist/${state.current}: ${err.message}. dist/ was restored to its previous `
            + "state and nothing was written. Check the permissions on dist/ and that no process holds it open, then rerun.",
        { cause: err });
    }
}

/** One rename of the swap: park an old root in staging/.old, or place a new root in dist. */
function move(state, root, step)
{
    const { staging, distDir, fsImpl } = state;

    state.current = root;

    if (step === "park")
    {
        fsImpl.renameSync(path.join(distDir, root), path.join(staging, ".old", root));
        state.parked.push(root);
        return;
    }

    fsImpl.renameSync(path.join(staging, root), path.join(distDir, root));
    state.placed.push(root);
}

/** Moves placed roots back out and parked roots back in; a failure here names what is stranded. */
function rollback({ staging, distDir, parked, placed, fsImpl })
{
    try
    {
        for (const t of placed) { fsImpl.renameSync(path.join(distDir, t), path.join(staging, t)); }
        for (const t of parked) { fsImpl.renameSync(path.join(staging, ".old", t), path.join(distDir, t)); }
    }
    catch (err)
    {
        const stranded = new Error(`Rollback of dist/ failed: ${err.message}. The previous generated roots (${parked.join(", ")}) `
            + `are in ${path.join(staging, ".old")}; move them back into ${distDir} by hand.`, { cause: err });

        stranded.stranded = true;
        throw stranded;
    }
}

/** Repo-level inputs: built manifests, vendored basic catalog, committed baselines. */
function repoInputs(repoRoot, writeBaseline)
{
    const manifestPath = path.join(repoRoot, "dist", "capability-manifest.json");

    if (!fs.existsSync(manifestPath))
    {
        throw new Error(`${manifestPath} does not exist. The generator reads the built manifests; run \`npm run build\` first.`);
    }

    return {
        manifests: JSON.parse(fs.readFileSync(manifestPath, "utf8")).components,
        componentFile: (n) => path.join(repoRoot, "components", n, `${n}.ts`),
        tsconfigPath: path.join(repoRoot, "tsconfig.json"),
        cacheDir: path.join(repoRoot, "node_modules", ".cache", "agentui"),
        pending: PENDING_CLASSIFICATION, belowRequired: BELOW_REQUIRED,
        basic: JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts", "agentui", "vendor", "a2ui-v0_9_1", "catalogs", "basic", "catalog.json"), "utf8")),
        commonTypes: JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts", "agentui", "vendor", "a2ui-v0_9_1", "common_types.json"), "utf8")),
        repoRoot,
        baselines: loadBaselines(), major: CATALOG_MAJOR, writeBaseline,
        assetExists: (rel) => fs.existsSync(path.join(repoRoot, "dist", rel)),
        libraries: libraryAssets(repoRoot),
    };
}

/** dist/lib-manifest.json's assets, which protocol.dependencies.libraries names (ADR-230). */
function libraryAssets(repoRoot)
{
    const libPath = path.join(repoRoot, "dist", "lib-manifest.json");

    if (!fs.existsSync(libPath))
    {
        throw new Error(`${libPath} does not exist. The generator resolves protocol.dependencies against it; run `
            + "`npm run build:vendor` first (npm run build runs it before build:agentui).");
    }

    return JSON.parse(fs.readFileSync(libPath, "utf8")).assets;
}

/** Committed baselines, keyed by major. */
function loadBaselines()
{
    if (!fs.existsSync(PUBLISHED)) { return new Map(); }

    return new Map(fs.readdirSync(PUBLISHED).flatMap((f) =>
    {
        const m = /^catalog-v(\d+)\.json$/.exec(f);
        return m ? [[Number(m[1]), JSON.parse(fs.readFileSync(path.join(PUBLISHED, f), "utf8"))]] : [];
    }));
}

/**
 * Fleet classification counts for scripts/audit-counts.mjs (check [20]).
 *
 * @param repoRoot - Repository root.
 * @returns { unclassifiedOptions, protocolPropsMissingJsdoc, changeMismatches }.
 */
export function measureClassification(repoRoot = REPO)
{
    const input = repoInputs(repoRoot, true);
    const errors = [];
    const classified = classifyFleet(input, errors);

    if (errors.length > 0) { throw new Error(`Classification failed:\n  ${errors.join("\n  ")}`); }

    const counts = countsFor(classified, [], []);

    return { unclassifiedOptions: counts.unclassifiedOptions, protocolPropsMissingJsdoc: counts.protocolPropsMissingJsdoc,
        changeMismatches: counts.changeMismatches };
}

/** CLI. */
async function main(argv)
{
    const writeBaseline = argv.includes("--write-baseline");
    const input = repoInputs(REPO, writeBaseline);

    if (argv.includes("--measure")) { return measure(input); }

    const result = runPipeline(input);

    if (result.errors.length > 0)
    {
        console.error(result.errors.map((e) => `[agentui] ${e}`).join("\n"));
        console.error(`[agentui] ${result.errors.length} problem(s); nothing was written to dist/.`);
        process.exit(1);
    }

    try
    {
        await addAdapter(result, input);
    }
    catch (err)
    {
        console.error(`[agentui] ${err.message}`);
        console.error("[agentui] The A2UI adapter could not be built; nothing was written to dist/.");
        process.exit(1);
    }

    if (writeBaseline)
    {
        fs.mkdirSync(PUBLISHED, { recursive: true });
        fs.writeFileSync(path.join(PUBLISHED, `catalog-v${input.major}.json`), `${JSON.stringify(result.catalog, null, 2)}\n`);
    }

    const prompt = addPromptSizes(result, input);
    writeOutputs(result.outputs, path.join(REPO, "dist"));
    const c = result.counts;
    console.log(`[agentui] ${c.components} components in the catalog (${c.excluded} pending classification), `
        + `${c.dataProps} data props, ${c.events} events, ${c.providers} providers, ${c.hostOnly} host-only members, `
        + `${c.belowRequired} below their required level (BELOW_REQUIRED)`);
    console.log(`[agentui] In a prompt (${prompt.tokenizer} tokens): `
        + Object.entries(prompt.sizes).map(([name, z]) => `${name} ${z.tokens.toLocaleString("en")} tokens `
            + `(${z.bytes.toLocaleString("en")} bytes)`).join(", "));
}

/**
 * What each catalog costs in an agent's prompt (#49), added to
 * agentui-report.json: the full catalog, the lean agent catalog, and the
 * basic catalog an agent needs beside the lean one for the re-exports.
 */
function addPromptSizes(result, input)
{
    const prompt = promptSizes({ catalog: result.catalog,
        agentCatalog: result.outputs.get(`a2ui/catalog/v${input.major}.agent.json`), basicCatalog: input.basic });

    result.outputs.set("agentui-report.json", { ...result.outputs.get("agentui-report.json"), prompt });
    return prompt;
}

/**
 * --measure: print `failing`, the components with a backlog violation the
 * PENDING_CLASSIFICATION list can excuse, and `notExcusable`, every violation
 * it cannot (each fails the build whatever the list says). Applies exactly
 * the filters partition() applies, so value-below-field on a BELOW_REQUIRED
 * component appears in neither.
 */
function measure(input)
{
    const errors = [];
    const classified = classifyFleet(input, errors);
    const blocking = classified.map((c) => ({ name: c.manifest.name, violations: blockingViolations(c, input) }));
    const failing = blocking.filter((b) => b.violations.some((v) => PENDING_EXCUSABLE_CODES.has(v.code)))
        .map((b) => b.name).sort();
    const notExcusable = blocking.flatMap((b) => b.violations.filter((v) => !PENDING_EXCUSABLE_CODES.has(v.code))
        .map((v) => ({ component: b.name, code: v.code, message: v.message })));

    console.log(JSON.stringify({ date: new Date().toISOString().slice(0, 10), errors,
        counts: countsFor(classified, [], []), failing, notExcusable }, null, 4));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    await main(process.argv.slice(2));
}
