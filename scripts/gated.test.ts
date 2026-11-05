/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: PublicationGate. Which dist paths a gate holds back, and that
 *    every gate states its reason.
 */

import { describe, expect, test } from "vitest";

import { GATED, GATES, gatedLeaks } from "./gated.mjs";

describe("publication gate", () =>
{
    test("every gated prefix names a gate with a reason", () =>
    {
        expect(GATED.length).toBeGreaterThan(0);
        expect(GATED.filter(({ gate }) => !GATES[gate]?.trim())).toEqual([]);
    });

    test("a dist path under a gated prefix is a leak; others are not", () =>
    {
        expect(gatedLeaks(["lib/a2ui-runtime-0.14.0.js", "lib/dompurify-3.4.17.js"]))
            .toEqual([{ path: "lib/a2ui-runtime-0.14.0.js", gate: "#36" }]);
    });

    test("the MCP Apps view and its page are gated; renderer.meta.json is not (M2)", () =>
    {
        expect(gatedLeaks(["mcp/renderer.html", "mcp/view/v1.js", "mcp/renderer.meta.json"]))
            .toEqual([{ path: "mcp/renderer.html", gate: "#36" }, { path: "mcp/view/v1.js", gate: "#36" }]);
    });
});
