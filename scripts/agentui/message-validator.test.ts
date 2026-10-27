// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiMessageValidator. The checker's schema layer, precompiled
 *    to standalone code so a page whose CSP forbids `unsafe-eval` can run it
 *    (#30 spec §3.3). One validator per message type and one per catalog
 *    component; the spec's `catalog.json` references resolve to ours.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "./vendor/a2ui-v0_9_1/common_types.json";
import envelope from "./vendor/a2ui-v0_9_1/server_to_client.json";
import catalog from "../../specs/agentui/published/catalog-v1.json";
import { bundleMessageValidator, CATALOG_ALIAS, compileMessageValidator, MESSAGE_TYPES } from "./message-validator.mjs";

type Validate = ((v: unknown) => boolean) & { errors?: unknown[] | null };
type Validators = { messages: Record<string, Validate>; components: Record<string, Validate> };

const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const inputs = { catalog, basic, commonTypes, envelope };

async function load(): Promise<Validators>
{
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "message-validator-")), "v.mjs");

    fs.writeFileSync(file, await bundleMessageValidator(compileMessageValidator(inputs)));

    return (await import(pathToFileURL(file).href)).messageValidators;
}

describe("compileMessageValidator", () =>
{
    let v: Validators;

    beforeAll(async () => { v = await load(); }, 60_000);

    test("exports one validator per message type", () =>
    {
        expect(Object.keys(v.messages)).toEqual(MESSAGE_TYPES);
    });

    test("accepts a createSurface for our catalog and rejects one without a surfaceId", () =>
    {
        expect(v.messages.createSurface({ version: V, createSurface: { surfaceId: "s", catalogId: ID } })).toBe(true);
        expect(v.messages.createSurface({ version: V, createSurface: { catalogId: ID } })).toBe(false);
    });

    test("exports one validator per catalog component, ours and the re-exported basic ones", () =>
    {
        expect(Object.keys(v.components).sort()).toEqual(Object.keys(catalog.components).sort());
        expect(Object.keys(v.components)).toEqual(expect.arrayContaining(["StickyNote", "Ruler", "Row", "Text"]));
    });

    test("a component validator checks that component's props", () =>
    {
        expect(v.components.Ruler({ id: "r", component: "Ruler", length: 100 })).toBe(true);
        expect(v.components.Ruler({ id: "r", component: "Ruler", length: "long" })).toBe(false);
    });

    test("an updateComponents naming an unknown component fails, because catalog.json resolves to our catalog", () =>
    {
        const message = (component: string) => ({ version: V, updateComponents:
            { surfaceId: "s", components: [{ id: "root", component }] } });

        expect(v.messages.updateComponents(message("Ruler"))).toBe(true);
        expect(v.messages.updateComponents(message("Nope"))).toBe(false);
    });

    test("an unknown function name in a FunctionCall fails, the stricter of the two validators", () =>
    {
        const text = { id: "root", component: "Text", text: { call: "noSuchFunction", args: {} } };

        expect(v.components.Text(text)).toBe(false);
    });
});

describe("the generated source", () =>
{
    test("compiles nothing at runtime and requires only Ajv's runtime helpers", () =>
    {
        const source = compileMessageValidator(inputs);
        const required = [...source.matchAll(/require\("([^"]+)"\)/g)].map((m) => m[1]);

        expect(source).not.toMatch(/new Function|\beval\(/);
        expect(required.every((s) => s.startsWith("ajv/dist/runtime/") || s === "fast-deep-equal")).toBe(true);
    });

    test("binds the spec's relative catalog.json to the alias the envelope schema resolves it to", () =>
    {
        expect(new URL("catalog.json", envelope.$id).href).toBe(CATALOG_ALIAS);
    });
});
