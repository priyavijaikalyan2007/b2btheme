/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiLeanCatalog. The agent-facing rendering of the published
 *    catalog keeps every component, prop, required flag, enum value and
 *    description, keeps binding-only and action props distinguishable, and
 *    the lossless check catches each way a rendering could drop something.
 *    #49, ADR-233.
 */

import { describe, expect, test } from "vitest";

import basic from "./vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "./vendor/a2ui-v0_9_1/common_types.json";
import published from "../../specs/agentui/published/catalog-v1.json";
import { COMMON_TYPES_ID } from "./catalog.mjs";
import { leanCatalog, leanProblems } from "./agent-catalog.mjs";

type Json = any;

const catalog = published as Json;
const lean = (): Json => leanCatalog({ catalog, basic, commonTypes });
const BINDING = `${COMMON_TYPES_ID}#/$defs/DataBinding`;
const ACTION = `${COMMON_TYPES_ID}#/$defs/Action`;

/** Each prop of each rendered component, by the class the notation describes. */
function propClasses(classify: (schema: Json) => string, components: Record<string, Json>, props: (e: Json) => Json)
{
    return Object.entries(components).flatMap(([n, e]) => Object.entries(props(e))
        .filter(([p]) => p !== "component").map(([p, s]) => `${n}.${p}: ${classify(s)}`)).sort();
}

describe("the lean rendering of catalog v1", () =>
{
    test("is lossless: every entry expands back to the catalog's, and every reference resolves", () =>
    {
        expect(leanProblems(catalog, lean())).toEqual([]);
    });

    test("renders each of our components and lists each basic re-export by name", () =>
    {
        const l = lean();
        const ours = Object.entries(catalog.components).filter(([, e]: [string, Json]) => e.allOf.length > 1)
            .map(([n]) => n);

        expect(Object.keys(l.components)).toEqual(ours);
        expect(l.reexports.catalogId).toBe(basic.catalogId);
        expect([...l.reexports.components].sort()).toEqual(Object.keys(basic.components).sort());
        expect([...l.reexports.functions].sort()).toEqual(Object.keys(basic.functions).sort());
    });

    test("keeps binding-only and action props apart from props that take a value", () =>
    {
        const full = (s: Json) => (s.$ref === BINDING ? "binding" : s.$ref === ACTION ? "action"
            : s.anyOf?.some((a: Json) => a.$ref === BINDING) ? "value" : "other");
        const rendered = (s: Json) => (s.$ref === "#/$defs/DataBinding" ? "binding" : s.$ref === "#/$defs/Action"
            ? "action" : "value");
        const l = lean();
        const ours = Object.fromEntries(Object.keys(l.components).map((n) => [n, catalog.components[n]]));

        expect(propClasses(rendered, l.components, (e) => e.properties))
            .toEqual(propClasses(full, ours, (e) => e.allOf[2].properties));
    });

    test("states the binding alternatives once, not per prop, and is under 60% of the catalog's size", () =>
    {
        const text = JSON.stringify(lean());

        expect(text).not.toContain(`${COMMON_TYPES_ID}#`);
        expect(text.length).toBeLessThan(JSON.stringify(catalog).length * 0.6);
    });
});

describe("the lossless check", () =>
{
    const broken = (edit: (l: Json) => void) => { const l = lean(); edit(l); return leanProblems(catalog, l); };

    test("catches a dropped description", () =>
    {
        expect(broken((l) => { delete l.components.StatusBadge.properties.label.description; }))
            .toEqual([expect.stringContaining("components/StatusBadge/allOf/2/properties/label/description")]);
    });
    test("catches a dropped enum value", () =>
    {
        expect(broken((l) => { l.components.StatusBadge.properties.status.enum.pop(); }))
            .toEqual([expect.stringContaining("components/StatusBadge/allOf/2/properties/status")]);
    });
    test("catches a dropped required flag", () =>
    {
        expect(broken((l) => { delete l.components.StatusBadge.required; }))
            .toEqual([expect.stringContaining("components/StatusBadge/allOf/2/required")]);
    });
    test("catches a binding-only prop rendered as one that takes a value", () =>
    {
        expect(broken((l) => { l.components.ActivityFeed.properties.eventData = { type: "object" }; }))
            .toEqual([expect.stringContaining("components/ActivityFeed/allOf/2/properties/eventData")]);
    });
    test("catches a changed definition", () =>
    {
        expect(broken((l) => { l.$defs.PeoplePicker__PersonData.required = ["id"]; }))
            .toEqual([expect.stringContaining("$defs/PeoplePicker__PersonData/required")]);
    });
    test("catches a missing definition", () =>
    {
        expect(broken((l) => { delete l.$defs.PeoplePicker__PersonData; }))
            .toEqual(["The lean catalog refers to #/$defs/PeoplePicker__PersonData, which it does not define."]);
    });
    test("catches a component neither rendered nor re-exported", () =>
    {
        expect(broken((l) => { delete l.components.Gauge; l.reexports.components.pop(); })).toEqual([
            "Gauge: in the catalog but neither rendered nor re-exported in the lean catalog.",
            "Video: in the catalog but neither rendered nor re-exported in the lean catalog."]);
    });
});

describe("leanCatalog refuses what it cannot render", () =>
{
    const withEntry = (entry: Json): Json => ({ ...catalog, components: { ...catalog.components, Odd: entry } });
    const own = { type: "object", properties: { component: { const: "Odd" } }, required: ["component"] };

    test("a component part other than the common ones and its own properties", () =>
    {
        const entry = { allOf: [{ $ref: `${COMMON_TYPES_ID}#/$defs/Checkable` }, own] };

        expect(() => leanCatalog({ catalog: withEntry(entry), basic, commonTypes }))
            .toThrow(/Odd: .*does not know the catalog part/);
    });
    test("a common type it has no rule for", () =>
    {
        const entry = { allOf: [{ ...own, properties: { ...own.properties,
            kids: { $ref: `${COMMON_TYPES_ID}#/$defs/ChildList` } } }] };

        expect(() => leanCatalog({ catalog: withEntry(entry), basic, commonTypes }))
            .toThrow(/does not know the reference .*ChildList/);
    });
});
