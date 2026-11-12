/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / BasicRefs. inlineBasicRefs replaces our catalog's
 *    $refs into Google's basic catalog with that document's definitions, so
 *    web_core 0.15, which resolves no cross-catalog $ref, still enforces them.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { Catalog } from "@a2ui/web_core/v0_9";
import { basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import { BASIC_CATALOG_REF, inlineBasicRefs, inlineRefsFrom } from "./basic-refs.mjs";

const CATALOG = JSON.parse(fs.readFileSync(
    path.join(__dirname, "..", "..", "specs", "agentui", "published", "catalog-v1.json"), "utf8"));
const BASIC_JSON = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "scripts", "agentui", "vendor",
    "a2ui-v0_9_1", "catalogs", "basic", "catalog.json"), "utf8"));
const CORE_BASIC_JSON = (basicCatalog as unknown as { toJson(): Record<string, unknown> }).toJson();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** Every $ref string in a JSON value. */
function refs(value: unknown): string[]
{
    if (Array.isArray(value)) { return value.flatMap(refs); }

    if (value === null || typeof value !== "object") { return []; }

    return Object.entries(value).flatMap(([key, child]) =>
        (key === "$ref" && typeof child === "string" ? [child] : refs(child)));
}

describe("inlineBasicRefs", () =>
{
    test("the published catalog refers to the basic catalog, so there is something to inline", () =>
    {
        expect(refs(CATALOG).some((ref) => ref.startsWith(BASIC_CATALOG_REF))).toBe(true);
    });

    test("leaves no $ref into the basic catalog", () =>
    {
        expect(refs(inlineBasicRefs(CATALOG)).filter((ref) => ref.startsWith(BASIC_CATALOG_REF)))
            .toEqual([]);
    });

    test("puts the basic definition where its $ref was", () =>
    {
        const linked = inlineBasicRefs(CATALOG) as Any;

        expect(linked.$defs.CatalogComponentCommon.allOf[0]).toEqual((BASIC_JSON as Any).$defs.CatalogComponentCommon);
        expect(linked.components.Button.allOf[0]).toEqual((BASIC_JSON as Any).components.Button);
    });

    test("the vendored basic catalog is the one this web_core enforces", () =>
    {
        expect(Object.keys(BASIC_JSON.components)).toHaveLength(18);
        expect(BASIC_JSON.components).toEqual(CORE_BASIC_JSON.components);
        expect(BASIC_JSON.functions).toEqual(CORE_BASIC_JSON.functions);
        expect(BASIC_JSON.$defs).toEqual(CORE_BASIC_JSON.$defs);
    });

    test("does not change its input", () =>
    {
        const before = JSON.stringify(CATALOG);

        inlineBasicRefs(CATALOG);
        expect(JSON.stringify(CATALOG)).toBe(before);
    });

    test("web_core then enforces a basic component's schema", () =>
    {
        const button = (Catalog as Any).fromJson(inlineBasicRefs(CATALOG)).components.get("Button");

        expect(button.schema.safeParse({ child: "label", action: { event: { name: "go" } } }).success).toBe(true);
        expect(button.schema.safeParse({ child: 5, action: { event: { name: "go" } } }).success).toBe(false);
    });

    test("a $ref to a definition the basic catalog does not have is a literate error", () =>
    {
        const catalog = { components: { X: { allOf: [{ $ref: `${BASIC_CATALOG_REF}/components/Nope` }] } } };

        expect(() => inlineBasicRefs(catalog)).toThrow(/\/components\/Nope.*basic catalog/);
    });

    test("a basic $ref with sibling keys is a literate error, since it would drop them", () =>
    {
        const catalog = { components: { X: { $ref: `${BASIC_CATALOG_REF}/components/Text`, description: "d" } } };

        expect(() => inlineBasicRefs(catalog)).toThrow(/beside a basic-catalog \$ref/);
    });

    test("an inlined definition whose local $ref our catalog cannot resolve is a literate error", () =>
    {
        const basic = { components: { Y: { allOf: [{ $ref: "#/$defs/Missing" }] } } };
        const catalog = { components: { X: { allOf: [{ $ref: `${BASIC_CATALOG_REF}/components/Y` }] } } };

        expect(() => inlineRefsFrom(catalog, basic)).toThrow(/#\/\$defs\/Missing/);
    });
});
