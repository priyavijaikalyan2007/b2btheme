// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiAdapterBundle. The real a2ui/src entry bundles with the
 *    generated modules into ESM that imports in Node without a DOM, exports
 *    createOutcropCatalog and catalogJson, and serves only Ajv's runtime
 *    helpers; anything else fails the closure gate (spec §3.4, §9 G2).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "./vendor/a2ui-v0_9_1/common_types.json";
import catalog from "../../specs/agentui/published/catalog-v1.json";
import { ALLOWED_PACKAGES, bundleAdapter } from "./adapter-bundle.mjs";
import { compileValidators } from "./adapter-validators.mjs";
import { addAdapter } from "./generate.mjs";

const REPO = path.resolve(__dirname, "..", "..");
const DESCRIPTORS = [{ name: "StickyNote", tagName: "outcrop-sticky-note", factory: "createStickyNote",
    factoryStyle: "container-first", mountMethod: "auto", conformance: "surface", assets: { js: "components/stickynote/stickynote.js" },
    props: { text: { route: "slot", slot: "text" } }, twoWay: false, events: [], dates: [] }];
const CATALOG_TEXT = `${JSON.stringify(catalog, null, 2)}\n`;

async function bundle(validatorsSource = compileValidators({ catalog, basic, commonTypes, descriptors: DESCRIPTORS }))
{
    return bundleAdapter({ catalogText: CATALOG_TEXT, descriptors: DESCRIPTORS, validatorsSource, repoRoot: REPO });
}

describe("bundleAdapter", () =>
{
    test("serves only the allowed packages and imports in Node with no DOM", async () =>
    {
        const out = await bundle();
        const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agentui-adapter-")), "v1.js");
        fs.writeFileSync(file, out.js);
        const mod = await import(pathToFileURL(file).href);

        expect(out.packages.every((p: string) => ALLOWED_PACKAGES.includes(p))).toBe(true);
        expect(typeof mod.createOutcropCatalog).toBe("function");
        expect(`${JSON.stringify(mod.catalogJson, null, 2)}\n`).toBe(CATALOG_TEXT);
    }, 60_000);

    test("the .d.ts is the hand-written public types", async () =>
    {
        expect((await bundle()).dts).toBe(fs.readFileSync(path.join(REPO, "a2ui", "src", "public.d.ts"), "utf8"));
    }, 60_000);

    test("a validators source that pulls in another package fails the closure gate", async () =>
    {
        await expect(bundle(`import "zod"; export const validators = {};`))
            .rejects.toThrow(/would serve zod.*must not import @a2ui/);
    }, 60_000);
});

describe("addAdapter", () =>
{
    test("adds v1.js, v1.d.ts and the report's adapter section to the outputs", async () =>
    {
        const outputs = new Map<string, unknown>([["agentui-report.json", { catalogId: "x" }]]);
        const seen: Record<string, unknown>[] = [];
        const stub = async (arg: Record<string, unknown>) => { seen.push(arg); return { js: "JS", dts: "DTS", packages: ["ajv"] }; };

        await addAdapter({ catalog, descriptors: DESCRIPTORS, outputs }, { basic, commonTypes, major: 1, repoRoot: REPO }, stub);

        expect(outputs.get("a2ui/adapter/v1.js")).toBe("JS");
        expect(outputs.get("a2ui/adapter/v1.d.ts")).toBe("DTS");
        expect(outputs.get("agentui-report.json")).toEqual({ catalogId: "x", adapter: { descriptors: DESCRIPTORS, packages: ["ajv"] } });
        expect(seen[0].catalogText).toBe(CATALOG_TEXT);
        expect(String(seen[0].validatorsSource)).toContain('"StickyNote.text"');
    });
});
