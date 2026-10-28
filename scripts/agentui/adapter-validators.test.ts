// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiAdapterValidators. Bound data-model values are not
 *    validated by the A2UI host, so the adapter ships one compiled validator
 *    per data prop, built from the prop's literal arm in the published
 *    catalog (spec §5.4). The compiled source is bundled and imported here
 *    exactly as the adapter bundle will use it.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as esbuild from "esbuild";
import { beforeAll, describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "./vendor/a2ui-v0_9_1/common_types.json";
import catalog from "../../specs/agentui/published/catalog-v1.json";
import { compileValidators, literalArmPointer, resultDefPointer } from "./adapter-validators.mjs";

const REPO = path.resolve(__dirname, "..", "..");
const STICKY = { name: "StickyNote", props: { text: { route: "slot", slot: "text" },
    collapsed: { route: "state", key: "collapsed" }, anchor: { route: "create" } } };

type Validators = Record<string, (v: unknown) => boolean>;

/** Bundles the generated source (it requires Ajv runtime helpers) and imports it. */
async function load(source: string): Promise<Validators>
{
    const out = await esbuild.build({ stdin: { contents: source, resolveDir: REPO, loader: "js" },
        bundle: true, format: "esm", platform: "neutral", write: false });
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "agentui-validators-")), "v.mjs");

    fs.writeFileSync(file, out.outputFiles[0].text);

    return (await import(pathToFileURL(file).href)).validators;
}

describe("literalArmPointer", () =>
{
    test("points at the first anyOf arm of the prop in the component's own allOf entry", () =>
    {
        expect(literalArmPointer("https://x/c.json", "StickyNote", "text"))
            .toBe("https://x/c.json#/components/StickyNote/allOf/2/properties/text/anyOf/0");
    });
});

describe("resultDefPointer", () =>
{
    test("points at the provider's answer def at the catalog root", () =>
    {
        expect(resultDefPointer("https://x/c.json", "TreeView", "loadChildrenResult"))
            .toBe("https://x/c.json#/$defs/TreeView__loadChildrenResult");
    });
});

describe("compileValidators — provider results", () =>
{
    const LOOKUP = { option: "onLookup", request: "lookup", actionProp: "onLookup", resultProp: "lookupResult",
        concurrency: "latest" };

    test("a descriptor provider gets a validator compiled from its $defs entry", async () =>
    {
        const withDef = { ...catalog, $defs: { ...catalog.$defs,
            StickyNote__lookupResult: { type: "array", items: { type: "string" } } } };
        const v = await load(compileValidators({ catalog: withDef, basic, commonTypes,
            descriptors: [{ ...STICKY, providers: [LOOKUP] }] }));

        expect(v["StickyNote.lookupResult"](["a"])).toBe(true);
        expect(v["StickyNote.lookupResult"]([1])).toBe(false);
    }, 60_000);

    test("a provider with no $defs entry is a literate build error", () =>
    {
        expect(() => compileValidators({ catalog, basic, commonTypes, descriptors: [{ ...STICKY, providers: [LOOKUP] }] }))
            .toThrow("StickyNote.lookupResult");
    });
});

describe("compileValidators", () =>
{
    let validators: Validators;

    beforeAll(async () =>
    {
        validators = await load(compileValidators({ catalog, basic, commonTypes, descriptors: [STICKY] }));
    }, 60_000);

    test("exports one validator per descriptor prop, keyed <Name>.<prop>", () =>
    {
        expect(Object.keys(validators).sort()).toEqual(["StickyNote.anchor", "StickyNote.collapsed", "StickyNote.text"]);
    });

    test("a string prop accepts strings and rejects numbers", () =>
    {
        expect(validators["StickyNote.text"]("hi")).toBe(true);
        expect(validators["StickyNote.text"](42)).toBe(false);
    });

    test("a boolean prop accepts booleans and rejects strings", () =>
    {
        expect(validators["StickyNote.collapsed"](true)).toBe(true);
        expect(validators["StickyNote.collapsed"]("yes")).toBe(false);
    });

    test("a oneOf object prop resolves inside the catalog", () =>
    {
        expect(validators["StickyNote.anchor"]({ kind: "canvas" })).toBe(true);
        expect(validators["StickyNote.anchor"]({ kind: "nope" })).toBe(false);
    });

    test("an unknown component or prop is a literate error naming the pointer", () =>
    {
        expect(() => compileValidators({ catalog, basic, commonTypes,
            descriptors: [{ name: "StickyNote", props: { nothing: { route: "create" } } }] }))
            .toThrow(/StickyNote\.nothing.*#\/components\/StickyNote\/allOf\/2\/properties\/nothing\/anyOf\/0/);
    });
});
