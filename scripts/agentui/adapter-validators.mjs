/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiAdapterValidators
 * 📜 PURPOSE: Compile one validator per adapter data prop from the prop's
 *    literal arm in the published catalog, as Ajv standalone ESM source (spec
 *    §5.4). The A2UI host validates literals but never the data-model values
 *    a binding resolves to; these validators close that gap at runtime
 *    without shipping Ajv's compiler.
 * 🔗 RELATES: [[AgentUiAdapterDescriptors]], [[AgentUiCatalog]], [[A2uiAdapter]]
 * ⚡ FLOW: [catalog + descriptors] -> [compileValidators] -> [ESM source]
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const standaloneCode = require("ajv/dist/standalone").default;

/**
 * The JSON pointer of a data prop's literal arm: catalog data props are
 * `anyOf: [literal, DataBinding, FunctionCall]` inside allOf[2] (catalog.mjs).
 *
 * @param catalogId - The catalog's $id.
 * @param name      - Catalog component name.
 * @param prop      - Data prop name.
 * @returns The absolute schema reference.
 */
export function literalArmPointer(catalogId, name, prop)
{
    return `${catalogId}#/components/${name}/allOf/2/properties/${prop}/anyOf/0`;
}

/**
 * The JSON pointer of a provider's answer schema: catalog.mjs relocates it to
 * $defs["<Name>__<resultProp>"] (ADR-225).
 *
 * @param catalogId  - The catalog's $id.
 * @param name       - Catalog component name.
 * @param resultProp - The provider's <request>Result prop.
 * @returns The absolute schema reference.
 */
export function resultDefPointer(catalogId, name, resultProp)
{
    return `${catalogId}#/$defs/${name}__${resultProp}`;
}

/**
 * Ajv standalone ESM source exporting `validators`, keyed "<Name>.<prop>".
 *
 * @param input - { catalog, basic, commonTypes, descriptors }.
 * @returns The module source. It requires ajv/dist/runtime helpers, so it
 *          must be bundled before a browser can load it.
 * @throws When a descriptor prop has no literal arm in the catalog.
 */
// @entrypoint
export function compileValidators({ catalog, basic, commonTypes, descriptors })
{
    const ajv = new Ajv2020({ code: { source: true, esm: true }, strict: false, validateFormats: false });
    const keys = [...propKeys(catalog, descriptors), ...resultKeys(catalog, descriptors)];
    const exportNames = new Map(keys.map(({ key }, i) => [key, `v${i}_${key.replace(/[^A-Za-z0-9_]/g, "_")}`]));

    ajv.addSchema(commonTypes);
    ajv.addSchema(basic);
    ajv.addSchema(catalog);

    for (const k of keys) { k.check(); }

    const refs = Object.fromEntries(keys.map(({ key, pointer }) => [exportNames.get(key), pointer]));
    const table = keys.map(({ key }) => `    ${JSON.stringify(key)}: ${exportNames.get(key)},`).join("\n");

    return `${standaloneCode(ajv, refs)}\nexport const validators = {\n${table}\n};\n`;
}

/** One validator per data prop, compiled from its literal arm. */
function propKeys(catalog, descriptors)
{
    return descriptors.flatMap((d) => Object.keys(d.props).map((prop) => ({ key: `${d.name}.${prop}`,
        pointer: literalArmPointer(catalog.$id, d.name, prop),
        check: () => checkArm(catalog, `${d.name}.${prop}`, d.name, prop) })));
}

/**
 * One validator per provider answer, compiled from its $defs entry. `providers`
 * is optional only for descriptors written before ADR-225; every generated
 * descriptor carries the array.
 */
function resultKeys(catalog, descriptors)
{
    return descriptors.flatMap((d) => (d.providers ?? []).map((p) => ({ key: `${d.name}.${p.resultProp}`,
        pointer: resultDefPointer(catalog.$id, d.name, p.resultProp),
        check: () => checkDef(catalog, `${d.name}.${p.resultProp}`, `${d.name}__${p.resultProp}`) })));
}

function checkDef(catalog, key, def)
{
    if (catalog.$defs?.[def] === undefined)
    {
        throw new Error(`Cannot compile the adapter validator for ${key}: the catalog has no $defs entry "${def}". `
            + "The descriptor and the catalog disagree; rebuild both with `npm run build:agentui`.");
    }
}

function checkArm(catalog, key, name, prop)
{
    const arm = catalog.components?.[name]?.allOf?.[2]?.properties?.[prop]?.anyOf?.[0];

    if (arm === undefined || arm === null || typeof arm !== "object")
    {
        throw new Error(`Cannot compile the adapter validator for ${key}: the catalog has no literal arm at `
            + `${literalArmPointer(catalog.$id, name, prop)}. The descriptor and the catalog disagree; rebuild both with `
            + "`npm run build:agentui`.");
    }
}
