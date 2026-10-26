/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiAdapter / Catalog. createOutcropCatalog turns the published
 *    catalog into a runtime web_core Catalog: Google's basic components keep
 *    the host's implementations, ours get outcrop-* elements, and the result
 *    enforces the catalog's schemas in a real MessageProcessor (spec §7).
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import { createOutcropCatalogFrom, resetCatalogStateForTests, type Embedded } from "./catalog";
import type { AdapterDescriptor } from "./types";
import { tagFor } from "../../scripts/agentui/adapter-descriptors.mjs";

const CATALOG_TEXT = fs.readFileSync(path.join(__dirname, "..", "..", "specs", "agentui", "published", "catalog-v1.json"), "utf8");
const CATALOG = JSON.parse(CATALOG_TEXT);
const OURS = Object.keys(CATALOG.components).filter((n) => !(basicCatalog as unknown as { components: Map<string, unknown> }).components.has(n));
const WEB_CORE = { Catalog, basicCatalog, BASIC_FUNCTIONS };
const OPTIONS = { assetBaseUrl: "https://cdn.test" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function descriptor(name: string): AdapterDescriptor
{
    return { name, tagName: tagFor(name), factory: `create${name}`, factoryStyle: "container-first", mountMethod: "auto",
        conformance: "display", assets: { js: "x.js" }, props: {}, twoWay: false, events: [], dates: [] };
}

function embedded(names: string[] = OURS): Embedded
{
    return { catalogText: CATALOG_TEXT, descriptors: names.map(descriptor), validators: {} };
}

beforeEach(() => { resetCatalogStateForTests(); });
afterEach(() => { resetCatalogStateForTests(); });

describe("createOutcropCatalog — webCore check", () =>
{
    test.each([
        ["Catalog", { ...WEB_CORE, Catalog: undefined }, /webCore\.Catalog is missing or not a class with fromJson/],
        ["basicCatalog", { ...WEB_CORE, basicCatalog: {} }, /webCore\.basicCatalog is missing or not a catalog/],
        ["BASIC_FUNCTIONS", { ...WEB_CORE, BASIC_FUNCTIONS: "x" }, /webCore\.BASIC_FUNCTIONS is missing or not an array/],
    ])("a missing %s is a literate error", (_n, webCore, message) =>
    {
        expect(() => createOutcropCatalogFrom(embedded(), webCore as Any, OPTIONS)).toThrow(message);
    });

    test("an unusable assetBaseUrl is rejected at creation", () =>
    {
        expect(() => createOutcropCatalogFrom(embedded(), WEB_CORE as Any, { assetBaseUrl: "https://cdn.test/" }))
            .toThrow(/trailing slash/);
        expect(() => createOutcropCatalogFrom(embedded(), WEB_CORE as Any, { assetBaseUrl: "" }))
            .toThrow(/absolute http\(s\): or file: URL/);
    });

    test("a non-boolean injectBaseTheme is a literate error", () =>
    {
        expect(() => createOutcropCatalogFrom(embedded(), WEB_CORE as Any, { ...OPTIONS, injectBaseTheme: "yes" as Any }))
            .toThrow(/injectBaseTheme must be a boolean/);
    });

    test("a catalog component with no descriptor is a literate error", () =>
    {
        expect(() => createOutcropCatalogFrom(embedded(OURS.slice(1)), WEB_CORE as Any, OPTIONS))
            .toThrow(new RegExp(`${OURS[0]} has no adapter descriptor`));
    });
});

describe("createOutcropCatalog — entries", () =>
{
    test("ours get outcrop-* elements; basic components keep the host's implementation", () =>
    {
        const cat = createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS) as Any;
        const basicText = (basicCatalog as Any).components.get("Text");

        expect(cat.id).toBe("https://static.outcrop.us/a2ui/catalog/v1.json");
        expect(cat.components.get("StickyNote").tagName).toBe("outcrop-sticky-note");
        expect(typeof cat.components.get("StickyNote").element).toBe("function");
        expect(cat.components.get("Text").tagName).toBe(basicText.tagName);
    });

    test("no entry carries a render key (React would treat it as a React component)", () =>
    {
        const cat = createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS) as Any;

        expect([...cat.components.values()].filter((e: Any) => "render" in e)).toEqual([]);
    });

    test("two calls share one element class per tag", () =>
    {
        const a = createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS) as Any;
        const b = createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS) as Any;

        expect(a.components.get("StickyNote").element).toBe(b.components.get("StickyNote").element);
    });

    test("a later call with a different assetBaseUrl or injectBaseTheme throws, naming both", () =>
    {
        createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS);

        expect(() => createOutcropCatalogFrom(embedded(), WEB_CORE as Any, { assetBaseUrl: "https://other.test" }))
            .toThrow(/https:\/\/cdn\.test.*https:\/\/other\.test/);
        expect(() => createOutcropCatalogFrom(embedded(), WEB_CORE as Any, { ...OPTIONS, injectBaseTheme: true }))
            .toThrow(/injectBaseTheme.*false.*true/);
    });
});

describe("createOutcropCatalog — in a real MessageProcessor", () =>
{
    function processor(): Any
    {
        return new (MessageProcessor as Any)([createOutcropCatalogFrom(embedded(), WEB_CORE as Any, OPTIONS)], () => undefined);
    }

    const create = { version: "v0.9.1", createSurface: { surfaceId: "s", catalogId: "https://static.outcrop.us/a2ui/catalog/v1.json" } };

    test("accepts our component with a binding inside a basic Column", () =>
    {
        const mp = processor();

        expect(() => mp.processMessages([create, { version: "v0.9.1", updateComponents: { surfaceId: "s", components: [
            { id: "root", component: "Column", children: ["n"] },
            { id: "n", component: "StickyNote", text: { path: "/t" } },
        ] } }])).not.toThrow();
    });

    test("rejects a prop the catalog does not declare", () =>
    {
        const mp = processor();

        expect(() => mp.processMessages([create, { version: "v0.9.1", updateComponents: { surfaceId: "s", components: [
            { id: "root", component: "StickyNote", noSuchProp: 1 },
        ] } }])).toThrow();
    });
});
