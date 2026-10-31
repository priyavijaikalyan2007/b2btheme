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
import { anchorProblems } from "./check-baseline-anchor.mjs";

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
});
