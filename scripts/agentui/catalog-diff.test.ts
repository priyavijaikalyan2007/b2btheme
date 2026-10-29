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

import { descriptionsDiffer, diffCatalogs, versionProblem } from "./catalog-diff.mjs";

function cat(props: Record<string, unknown>, required: string[] = ["component"], extra: Record<string, unknown> = {})
{
    return {
        components: {
            Text: { type: "object", allOf: [{ $ref: "basic#/components/Text" }] },
            Widget: { type: "object", allOf: [{}, {}, { type: "object", properties: { component: { const: "Widget" }, ...props }, required }] },
            ...extra,
        },
        functions: {},
        $defs: { anyComponent: { oneOf: [] }, anyFunction: { oneOf: [] } },
    };
}

const BASE = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } });

describe("diffCatalogs", () =>
{
    test("an identical catalog has no changes", () => { expect(diffCatalogs(BASE, BASE)).toEqual({ breaking: [], additive: [] }); });
    test("a removed component is breaking", () =>
    {
        const next = { ...BASE, components: { Text: BASE.components.Text } };
        expect(diffCatalogs(BASE, next).breaking).toEqual(["component Widget removed"]);
    });
    test("an added component is additive", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } }, ["component"], { New: { type: "object" } });
        expect(diffCatalogs(BASE, next).additive).toEqual(["component New added"]);
    });
    test("a removed prop is breaking", () => { expect(diffCatalogs(BASE, cat({})).breaking).toEqual(["Widget.pageSize removed"]); });
    test("a retyped prop is breaking", () =>
    {
        expect(diffCatalogs(BASE, cat({ pageSize: { description: "Rows.", oneOf: [{ type: "string" }] } })).breaking)
            .toEqual(["Widget.pageSize changed"]);
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
        expect(diffCatalogs(BASE, cat({ pageSize: { description: "Rows per page.", oneOf: [{ type: "number" }] } })).breaking)
            .toEqual([]);
    });
    test("a newly required prop is breaking", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] } }, ["component", "pageSize"]);
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

describe("descriptionsDiffer", () =>
{
    test("an identical catalog has no description change", () => { expect(descriptionsDiffer(BASE, BASE)).toBe(false); });
    test("an edited prop description is a description change", () =>
    {
        expect(descriptionsDiffer(BASE, cat({ pageSize: { description: "Rows per page.", oneOf: [{ type: "number" }] } })))
            .toBe(true);
    });
    test("an edited top-level description is a description change", () =>
    {
        expect(descriptionsDiffer({ ...BASE, description: "Old." }, { ...BASE, description: "New." })).toBe(true);
    });
    test("a description arriving with an added prop is not a description change", () =>
    {
        const next = cat({ pageSize: { description: "Rows.", oneOf: [{ type: "number" }] }, height: { description: "H.", oneOf: [] } });
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

    test("breaking without a bump is a problem", () => { expect(versionProblem(breaking, 1, 1)).toMatch(/CATALOG_MAJOR/); });
    test("breaking with a bump is fine", () => { expect(versionProblem(breaking, 1, 2)).toBeNull(); });
    test("additive without a bump is fine", () => { expect(versionProblem({ breaking: [], additive: ["x"] }, 1, 1)).toBeNull(); });
    test("skipping a major is a problem", () => { expect(versionProblem(breaking, 1, 3)).toMatch(/one step/); });
    test("going back is a problem", () => { expect(versionProblem(breaking, 2, 1)).toMatch(/one step/); });
});
