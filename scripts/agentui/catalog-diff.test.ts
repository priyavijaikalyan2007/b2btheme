import { describe, expect, test } from "vitest";

import { diffCatalogs, versionProblem } from "./catalog-diff.mjs";

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
    test("a changed component def is breaking", () =>
    {
        const prev = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "object" } } };
        const next = { ...BASE, $defs: { ...BASE.$defs, Widget__Col: { type: "array" } } };
        expect(diffCatalogs(prev, next).breaking).toEqual(["$defs.Widget__Col changed"]);
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
