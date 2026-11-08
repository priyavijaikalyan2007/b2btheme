/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiBaselineAnchor. A published baseline can grow, but not be
 *    deleted or broken (#28).
 */

import { describe, expect, test } from "vitest";

import published from "../../specs/agentui/published/catalog-v1.json";
import { ACCEPTED_NARROWINGS, anchorProblems } from "./check-baseline-anchor.mjs";

const FILE = "catalog-v1.json";
const copy = () => structuredClone(published) as typeof published & { components: Record<string, unknown> };

describe("anchorProblems (#28)", () =>
{
    test("an unchanged baseline passes", () =>
    {
        expect(anchorProblems(new Map([[FILE, published]]), new Map([[FILE, copy()]]))).toEqual([]);
    });

    test("an additive change passes", () =>
    {
        const next = copy();
        next.components.Extra = { type: "object", allOf: [] };

        expect(anchorProblems(new Map([[FILE, published]]), new Map([[FILE, next]]))).toEqual([]);
    });

    test("a deleted baseline fails", () =>
    {
        expect(anchorProblems(new Map([[FILE, published]]), new Map()))
            .toEqual([expect.stringMatching(/catalog-v1\.json was deleted/)]);
    });

    test("a breaking edit fails, naming the change", () =>
    {
        const next = copy();
        delete next.components.UserMenu;

        expect(anchorProblems(new Map([[FILE, published]]), new Map([[FILE, next]])))
            .toEqual([expect.stringMatching(/catalog-v1\.json changed in ways that break[\s\S]*UserMenu/)]);
    });

    test("a major the base branch did not have is not compared", () =>
    {
        expect(anchorProblems(new Map([[FILE, published]]), new Map([[FILE, copy()], ["catalog-v2.json", {}]])))
            .toEqual([]);
    });

    describe("a recorded narrowing", () =>
    {
        const [narrowing] = ACCEPTED_NARROWINGS;
        const iconPattern = (catalog: unknown) => (catalog as { components: { TypeBadge: { allOf: { properties:
            { icon: { anyOf: { pattern?: string; description?: string }[] } } }[] } } }).components.TypeBadge.allOf[2]
            .properties.icon.anyOf[0];
        const withIcon = (pattern: string) => { const c = copy(); iconPattern(c).pattern = pattern; return c; };

        test("passes exactly the recorded change", () =>
        {
            const base = new Map([[FILE, withIcon(narrowing.from)]]);

            expect(anchorProblems(base, new Map([[FILE, withIcon(narrowing.to)]]))).toEqual([]);
        });

        test("does not pass another pattern", () =>
        {
            expect(anchorProblems(new Map([[FILE, withIcon(narrowing.from)]]), new Map([[FILE, withIcon("^[a-z]+$")]])))
                .toEqual([expect.stringMatching(/TypeBadge\.icon changed/)]);
        });

        test("does not pass the recorded change alongside another edit to the property", () =>
        {
            const next = withIcon(narrowing.to);
            iconPattern(next).description = "changed";

            expect(anchorProblems(new Map([[FILE, withIcon(narrowing.from)]]), new Map([[FILE, next]])))
                .toEqual([expect.stringMatching(/TypeBadge\.icon changed/)]);
        });

        test("does not pass the change in another file", () =>
        {
            const file = "catalog-v2.json";

            const base = new Map([[file, withIcon(narrowing.from)]]);

            expect(anchorProblems(base, new Map([[file, withIcon(narrowing.to)]])))
                .toEqual([expect.stringMatching(/TypeBadge\.icon changed/)]);
        });
    });
});
