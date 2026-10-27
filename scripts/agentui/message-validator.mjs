/*
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 *
 * ⚓ COMPONENT: AgentUiMessageValidator
 * 📜 PURPOSE: Precompile the A2UI checker's schema layer (#30 spec §3.3):
 *    one validator per server-to-client message type and one per catalog
 *    component, as standalone ESM. A page whose CSP forbids `unsafe-eval`
 *    cannot let Ajv compile at runtime, and the CLI and the playground must
 *    run the same code, so both import the one file this writes.
 * 🔗 RELATES: [[AgentUiMessageChecker]], [[AgentUiAdapterValidators]], [[AgentUiCatalog]]
 * ⚡ FLOW: [spec envelope + common types + basic + our catalog] -> [Ajv standalone]
 *          -> [esbuild] -> [agentdemo/.out/gen/message-validator.mjs]
 *
 * WHY OUR CATALOG IS ADDED TWICE
 * ------------------------------
 * The spec's `server_to_client.json` refers to `catalog.json#/$defs/…`,
 * relative to its own $id, meaning "whichever concrete catalog this surface
 * uses". Registering our catalog again under that alias is how that
 * reference is meant to be bound; its own `#/…` references then resolve
 * inside the copy.
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020").default;
const standaloneCode = require("ajv/dist/standalone").default;

export const MESSAGE_TYPES = ["createSurface", "updateComponents", "updateDataModel", "deleteSurface"];
export const CATALOG_ALIAS = "https://a2ui.org/specification/v0_9/catalog.json";
export const MESSAGE_VALIDATOR_OUT = path.join("agentdemo", ".out", "gen", "message-validator.mjs");

const VENDOR = path.join("scripts", "agentui", "vendor", "a2ui-v0_9_1");

/** `updateComponents` -> `UpdateComponentsMessage`, the $def name in server_to_client.json. */
function defName(type)
{
    return `${type[0].toUpperCase()}${type.slice(1)}Message`;
}

/**
 * Standalone ESM source for the schema layer. It still `require`s Ajv's
 * runtime helpers; `bundleMessageValidator` inlines them.
 *
 * @param {{catalog: object, basic: object, commonTypes: object, envelope: object}} schemas
 * @returns {string} Source exporting `messageValidators = { messages, components }`.
 */
export function compileMessageValidator({ catalog, basic, commonTypes, envelope })
{
    const ajv = new Ajv2020({ code: { source: true, esm: true }, strict: false, validateFormats: false });

    ajv.addSchema(commonTypes);
    ajv.addSchema(basic);
    ajv.addSchema(catalog);
    ajv.addSchema({ ...catalog, $id: CATALOG_ALIAS });
    ajv.addSchema(envelope);

    const names = Object.keys(catalog.components);
    const refs = Object.fromEntries([
        ...MESSAGE_TYPES.map((t) => [`m_${t}`, `${envelope.$id}#/$defs/${defName(t)}`]),
        ...names.map((n, i) => [`c${i}`, `${catalog.$id}#/components/${n}`]),
    ]);
    const messages = MESSAGE_TYPES.map((t) => `${t}: m_${t}`).join(", ");
    const components = names.map((n, i) => `${JSON.stringify(n)}: c${i}`).join(", ");

    return `${standaloneCode(ajv, refs)}\nexport const messageValidators = { messages: { ${messages} }, `
        + `components: { ${components} } };\n`;
}

/**
 * Inlines Ajv's runtime helpers so the module imports nothing.
 *
 * @param {string} source - Output of compileMessageValidator.
 * @returns {Promise<string>} Self-contained ESM.
 */
export async function bundleMessageValidator(source)
{
    // Imported here, not at the top: esbuild refuses to load under jsdom, where some generator tests run.
    const esbuild = await import("esbuild");
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const out = await esbuild.build({ stdin: { contents: source, resolveDir: repoRoot, loader: "js" },
        bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent" });

    return out.outputFiles[0].text;
}

/**
 * Builds and writes the generated module the CLI and the playground import.
 *
 * @param {string} repoRoot - Repository root.
 * @returns {Promise<string>} The path written.
 * @throws When dist/a2ui/catalog/v1.json has not been built.
 */
export async function writeMessageValidator(repoRoot)
{
    const read = (rel) => JSON.parse(fs.readFileSync(path.join(repoRoot, rel), "utf8"));
    const catalogRel = path.join("dist", "a2ui", "catalog", "v1.json");

    if (!fs.existsSync(path.join(repoRoot, catalogRel)))
    {
        throw new Error(`${catalogRel} is absent, so there is no catalog to check messages against. `
            + "Run `npm run build:agentui` first.");
    }

    const source = compileMessageValidator({ catalog: read(catalogRel),
        basic: read(path.join(VENDOR, "catalogs", "basic", "catalog.json")),
        commonTypes: read(path.join(VENDOR, "common_types.json")),
        envelope: read(path.join(VENDOR, "server_to_client.json")) });
    const out = path.join(repoRoot, MESSAGE_VALIDATOR_OUT);

    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, await bundleMessageValidator(source));

    return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1])
{
    console.log(`[message-validator] wrote ${await writeMessageValidator(process.cwd())}`);
}
