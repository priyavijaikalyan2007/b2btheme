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
    const keys = descriptors.flatMap((d) => Object.keys(d.props).map((prop) => ({ key: `${d.name}.${prop}`, name: d.name, prop })));
    const exportNames = new Map(keys.map(({ key }, i) => [key, `v${i}_${key.replace(/[^A-Za-z0-9_]/g, "_")}`]));

    ajv.addSchema(commonTypes);
    ajv.addSchema(basic);
    ajv.addSchema(catalog);

    for (const { key, name, prop } of keys) { checkArm(catalog, key, name, prop); }

    const refs = Object.fromEntries(keys.map(({ key, name, prop }) => [exportNames.get(key), literalArmPointer(catalog.$id, name, prop)]));
    const table = keys.map(({ key }) => `    ${JSON.stringify(key)}: ${exportNames.get(key)},`).join("\n");

    return `${standaloneCode(ajv, refs)}\nexport const validators = {\n${table}\n};\n`;
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
