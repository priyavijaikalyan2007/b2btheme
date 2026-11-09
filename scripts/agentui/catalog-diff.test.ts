/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiCatalogDiff. The catalog diff module classifies breaking
 *    and additive changes between committed baseline and freshly generated
 *    catalogs, enforcing the one-step major-version rule. Spec §5.3, #17.
 */

import { describe, expect, test } from "vitest";

import { descriptionsDiffer, diffCatalogs, patternWidens, versionProblem } from "./catalog-diff.mjs";

function cat(props: Record<string, unknown>, required: string[] = ["component"], extra: Record<string, unknown> = {})
{
    return {
        components: {
            Text: { type: "object", allOf: [{ $ref: "basic#/components/Text" }] },
            Widget: { type: "object",
                allOf: [{}, {},
                    { type: "object", properties: { component: { const: "Widget" }, ...props }, required }] },
            ...extra,
        },
        functions: {},
        $defs: { anyComponent: { oneOf: [] }, anyFunction: { oneOf: [] } },
    };
}

const BASE = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });

describe("diffCatalogs", () =>
{
    test("an identical catalog has no changes", () =>
    {
        expect(diffCatalogs(BASE, BASE)).toEqual({ breaking: [], additive: [] });
    });
    test("a removed component is breaking", () =>
    {
        const next = { ...BASE, components: { Text: BASE.components.Text } };
        expect(diffCatalogs(BASE, next).breaking).toEqual(["component Widget removed"]);
    });
    test("an added component is additive", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } }, ["component"],
            { New: { type: "object" } });
        expect(diffCatalogs(BASE, next).additive).toEqual(["component New added"]);
    });
    test("a removed prop is breaking", () =>
    {
        expect(diffCatalogs(BASE, cat({})).breaking).toEqual(["Widget.pageSize removed"]);
    });
    test("a retyped prop is breaking", () =>
    {
        expect(diffCatalogs(BASE, cat({ pageSize: { description: "Rows.", oneOf: [{ type: "string" }] } })).breaking)
            .toEqual(["Widget.pageSize changed"]);
    });
    // A host that validated against the old pattern still sends values the new one accepts (TypeBadge.icon).
    test("a prop whose pattern only widens is additive", () =>
    {
        const before = cat({ icon: { anyOf: [{ type: "string", pattern: "^[A-Za-z0-9_-]+$" }] } });
        const after = cat({ icon: { description: "Now a class too.",
            anyOf: [{ type: "string", pattern: "^[A-Za-z0-9 _-]+$" }] } });

        expect(diffCatalogs(before, after)).toEqual({ breaking: [], additive: ["Widget.icon widened"] });
    });
    test("a prop whose pattern narrows is breaking", () =>
    {
        const before = cat({ icon: { anyOf: [{ type: "string", pattern: "^[A-Za-z0-9 _-]+$" }] } });
        const after = cat({ icon: { anyOf: [{ type: "string", pattern: "^[A-Za-z0-9_-]+$" }] } });

        expect(diffCatalogs(before, after).breaking).toEqual(["Widget.icon changed"]);
    });
    test("a def whose pattern only widens is additive", () =>
    {
        const node = (pattern: string) => ({ type: "object", properties: { icon: { type: "string", pattern } } });
        const withDef = (pattern: string) => ({ ...BASE, $defs: { ...BASE.$defs, Widget__Node: node(pattern) } });

        expect(diffCatalogs(withDef("^[a-z_-]+$"), withDef("^[a-z _-]+$")))
            .toEqual({ breaking: [], additive: ["$defs.Widget__Node widened"] });
        expect(diffCatalogs(withDef("^[a-z _-]+$"), withDef("^[a-z_-]+$")).breaking)
            .toEqual(["$defs.Widget__Node changed"]);
    });
    test("a widened pattern beside another change is breaking", () =>
    {
        const before = cat({ icon: { anyOf: [{ type: "string", pattern: "^[a-z]+$" }] } });
        const after = cat({ icon: { anyOf: [{ type: "string", pattern: "^[a-z ]+$", maxLength: 40 }] } });

        expect(diffCatalogs(before, after).breaking).toEqual(["Widget.icon changed"]);
    });
    // TypeScript orders a literal union by internal type id, which any file in
    // the program can shift (readiness step 2 B1). Order is not meaning.
    test("a reordered union of consts is not a change", () =>
    {
        const before = cat({ layout: { oneOf: [{ const: "row" }, { const: "grid" }] } });
        const after = cat({ layout: { oneOf: [{ const: "grid" }, { const: "row" }] } });

        expect(diffCatalogs(before, after)).toEqual({ breaking: [], additive: [] });
    });
    test("a union of consts that loses a member is breaking", () =>
    {
        const before = cat({ layout: { oneOf: [{ const: "row" }, { const: "grid" }] } });
        const after = cat({ layout: { oneOf: [{ const: "grid" }] } });

        expect(diffCatalogs(before, after).breaking).toEqual(["Widget.layout changed"]);
    });
    // Consts and bare primitive types are disjoint, so no validator's arm order can change the outcome
    // (Gauge.size, readiness step 2 B5). Objects can overlap, so their order stays meaningful.
    test("a reordered union of consts and bare primitive types is not a change", () =>
    {
        const before = cat({ size: { oneOf: [{ const: "sm" }, { const: "lg" }, { type: "number" }] } });
        const after = cat({ size: { oneOf: [{ type: "number" }, { const: "lg" }, { const: "sm" }] } });

        expect(diffCatalogs(before, after)).toEqual({ breaking: [], additive: [] });
    });
    test("a reordered union of objects is still a change", () =>
    {
        const a = { type: "object", properties: { x: { type: "string" } } };
        const b = { type: "object", properties: { y: { type: "string" } } };
        const before = cat({ v: { oneOf: [a, b] } });
        const after = cat({ v: { oneOf: [b, a] } });

        expect(diffCatalogs(before, after).breaking).toEqual(["Widget.v changed"]);
    });
    test("{ type: null } and { const: null } are the same schema", () =>
    {
        const before = cat({ kids: { oneOf: [{ type: "null" }, { type: "array" }] } });
        const after = cat({ kids: { oneOf: [{ const: null }, { type: "array" }] } });

        expect(diffCatalogs(before, after)).toEqual({ breaking: [], additive: [] });
    });
    test("a description-only change is not breaking", () =>
    {
        expect(diffCatalogs(BASE,
            cat({ pageSize: { description: "Rows per page.", oneOf: [{ type: "number" }] } })).breaking)
            .toEqual([]);
    });
    test("a newly required prop is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } },
            ["component", "pageSize"]);
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget.pageSize became required"]);
    });
    test("an added optional prop is additive", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] }, height: { oneOf: [] } });
        expect(diffCatalogs(BASE, next).additive).toEqual(["Widget.height added"]);
    });
    test("a flipped unevaluatedProperties is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });
        (next.components.Widget as Record<string, unknown>).unevaluatedProperties = true;
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget changed"]);
    });
    test("a swapped allOf[0] ref is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });
        next.components.Widget.allOf[0] = { $ref: "common#/$defs/Other" };
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget changed"]);
    });
    test("a changed allOf[1] is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });
        next.components.Widget.allOf[1] = { type: "object" };
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget changed"]);
    });
    test("a new key beside allOf[2].properties is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });
        (next.components.Widget.allOf[2] as Record<string, unknown>).additionalProperties = false;
        expect(diffCatalogs(BASE, next).breaking).toEqual(["Widget changed"]);
    });
    test("a changed component description is not breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });
        (next.components.Widget as Record<string, unknown>).description = "A widget.";
        expect(diffCatalogs(BASE, next)).toEqual({ breaking: [], additive: [] });
    });
    test("a changed top-level key is breaking", () =>
    {
        expect(diffCatalogs({ ...BASE, $id: "v1" }, { ...BASE, $id: "v2" }).breaking).toEqual(["catalog $id changed"]);
    });
    test("an added top-level key is breaking", () =>
    {
        expect(diffCatalogs(BASE, { ...BASE, title: "T" }).breaking).toEqual(["catalog title changed"]);
    });
    test("a changed top-level description is not breaking", () =>
    {
        expect(diffCatalogs({ ...BASE, description: "Old." }, { ...BASE, description: "New." }))
            .toEqual({ breaking: [], additive: [] });
    });
    test("a changed component def is breaking", () =>
    {
        const prev = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "object" } } };
        const next = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "array" } } };
        expect(diffCatalogs(prev, next).breaking).toEqual(["$defs.Widget__Col changed"]);
    });
});

describe("patternWidens", () =>
{
    test("a character class that gains characters widens", () =>
    {
        expect(patternWidens("^[A-Za-z0-9_-]+$", "^[A-Za-z0-9 _-]+$")).toBe(true);
    });
    test("+ to * widens, * to + does not", () =>
    {
        expect(patternWidens("^[a-z]+$", "^[a-z]*$")).toBe(true);
        expect(patternWidens("^[a-z]*$", "^[a-z]+$")).toBe(false);
    });
    test("an added alternative after the old pattern widens", () =>
    {
        const old = "^[A-Za-z0-9_-]+$";
        const wider = "^(?:[A-Za-z0-9_-]+|fa-(?:solid|regular|brands) fa-[a-z0-9-]+)$";

        expect(patternWidens(old, wider)).toBe(true);
        expect(patternWidens(wider, old)).toBe(false);
    });
    test("an added alternative is strict: the old pattern first, whole, and without a top-level |", () =>
    {
        expect(patternWidens("^[a-z]+$", "^(?:[0-9]+|[a-z]+)$")).toBe(false);
        expect(patternWidens("^a|b$", "^(?:a|b|c)$")).toBe(false);
        expect(patternWidens("^[a-z]+$", "^(?:[a-z]+)$")).toBe(false);
        expect(patternWidens("^[a-z]+$", "^(?:[a-z]+|(x)$")).toBe(false);
        expect(patternWidens("^(?:a|b)$", "^(?:(?:a|b)|c)$")).toBe(true);
    });
    test("a character class that loses characters does not widen", () =>
    {
        expect(patternWidens("^[a-z0-9]+$", "^[a-z]+$")).toBe(false);
    });
    // Regex containment cannot be decided in general, so the gate says breaking.
    test("any other pattern shape is never taken as widening", () =>
    {
        expect(patternWidens("^[a-z]+$", "^([a-z]+|x)$")).toBe(false);
        expect(patternWidens("^[^a]+$", "^[^ab]+$")).toBe(false);
        expect(patternWidens("^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", "^#[0-9a-fA-F]+$")).toBe(false);
    });
});

describe("descriptionsDiffer", () =>
{
    test("an identical catalog has no description change", () =>
    {
        expect(descriptionsDiffer(BASE, BASE)).toBe(false);
    });
    test("an edited prop description is a description change", () =>
    {
        expect(descriptionsDiffer(BASE,
            cat({ pageSize: { description: "Rows per page.", oneOf: [{ type: "number" }] } })))
            .toBe(true);
    });
    test("an edited top-level description is a description change", () =>
    {
        expect(descriptionsDiffer({ ...BASE, description: "Old." }, { ...BASE, description: "New." })).toBe(true);
    });
    test("a description arriving with an added prop is not a description change", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] },
            height: { description: "H.", oneOf: [] } });
        expect(descriptionsDiffer(BASE, next)).toBe(false);
    });
    test("a description added to an existing node is a description change", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number", description: "Count." }] } });
        expect(descriptionsDiffer(BASE, next)).toBe(true);
    });
    test("a property named description is compared as a schema, not as text", () =>
    {
        const prev = cat({ description: { oneOf: [{ type: "string" }] } });
        expect(descriptionsDiffer(prev, cat({ description: { oneOf: [{ type: "number" }] } }))).toBe(false);
    });
});

describe("versionProblem", () =>
{
    const breaking = { breaking: ["Widget.pageSize removed"], additive: [] };

    test("breaking without a bump is a problem", () =>
    {
        expect(versionProblem(breaking, 1, 1)).toMatch(/CATALOG_MAJOR/);
    });
    test("breaking with a bump is fine", () => { expect(versionProblem(breaking, 1, 2)).toBeNull(); });
    test("additive without a bump is fine", () =>
    {
        expect(versionProblem({ breaking: [], additive: ["x"] }, 1, 1)).toBeNull();
    });
    test("skipping a major is a problem", () => { expect(versionProblem(breaking, 1, 3)).toMatch(/one step/); });
    test("going back is a problem", () => { expect(versionProblem(breaking, 2, 1)).toMatch(/one step/); });
});

describe("$defs renames (#74)", () =>
{
    const withDefs = (defs: Record<string, unknown>) =>
    {
        const base = cat({});
        return { ...base, $defs: { ...base.$defs, ...defs } };
    };
    const ITEM = { type: "object", properties: { id: { type: "string" } } };

    test("a removed def with an added twin names the alias that keeps it", () =>
    {
        const diff = diffCatalogs(withDefs({ Widget__Item: ITEM }), withDefs({ Widget__ListItem: ITEM }));

        expect(diff.breaking).toEqual([expect.stringMatching(new RegExp("^\\$defs\\.Widget__Item removed\\. "
            + "\\$defs\\.Widget__ListItem was added with the same schema.*"
            + 'add "Widget__ListItem": "Widget__Item" to DEF_ALIASES'))]);
        expect(diff.additive).toEqual(["$defs.Widget__ListItem added"]);
    });

    test("a removed def with no twin is still breaking and points at DEF_ALIASES", () =>
    {
        const diff = diffCatalogs(withDefs({ Widget__Item: ITEM }), withDefs({}));

        expect(diff.breaking).toEqual([
            expect.stringMatching(/^\$defs\.Widget__Item removed\. If its type was renamed.*DEF_ALIASES/)]);
    });
});

describe("unions that widen (FacetSearch labelled values, apps report 2026-11-09)", () =>
{
    const LABELLED = { type: "object", properties: { value: { type: "string" }, label: { type: "string" } },
        required: ["value", "label"] };

    test("a string that may now also be an object is widened, also inside array items", () =>
    {
        const before = cat({ values: { type: "array", items: { type: "string" } } });
        const after = cat({ values: { type: "array", items: { oneOf: [{ type: "string" }, LABELLED] } } });

        expect(diffCatalogs(before, after)).toEqual({ breaking: [], additive: ["Widget.values widened"] });
    });

    test("a union that gains an arm and keeps the others is widened", () =>
    {
        const before = cat({ v: { anyOf: [{ type: "string" }, { type: "number" }] } });
        const after = cat({ v: { anyOf: [{ type: "number" }, { type: "string" }, LABELLED] } });

        expect(diffCatalogs(before, after).additive).toEqual(["Widget.v widened"]);
    });

    test("a union that drops or changes an old arm is still breaking", () =>
    {
        const before = cat({ v: { anyOf: [{ type: "string" }, { type: "number" }] } });

        expect(diffCatalogs(before, cat({ v: { anyOf: [{ type: "string" }, LABELLED] } })).breaking)
            .toEqual(["Widget.v changed"]);
        expect(diffCatalogs(cat({ v: { type: "string", maxLength: 5 } }),
            cat({ v: { oneOf: [{ type: "string" }, LABELLED] } })).breaking).toEqual(["Widget.v changed"]);
    });

    test("a union that widens while something else narrows is breaking", () =>
    {
        const before = cat({ v: { type: "array", items: { type: "string" } } });
        const after = cat({ v: { type: "array", maxItems: 3, items: { oneOf: [{ type: "string" }, LABELLED] } } });

        expect(diffCatalogs(before, after).breaking).toEqual(["Widget.v changed"]);
    });
});

describe("a widening union behind a new $ref", () =>
{
    test("an item that now refers to a new union keeping the old item is widened", () =>
    {
        const before = cat({ values: { type: "array", items: { type: "string" } } });
        const after = { ...cat({ values: { type: "array", items: { $ref: "#/$defs/Widget__Value" } } }) };
        after.$defs = { ...after.$defs, Widget__Value: { oneOf: [{ type: "string" },
            { type: "object", properties: { value: { type: "string" } } }] } } as never;

        expect(diffCatalogs(before, after)).toEqual({ breaking: [],
            additive: ["Widget.values widened", "$defs.Widget__Value added"] });
    });
});
