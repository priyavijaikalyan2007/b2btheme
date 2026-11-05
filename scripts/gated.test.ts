/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: PublicationGate. Which dist paths a gate holds back, and that
 *    every gate states its reason. No gate is defined since ADR-252.
 */

import { describe, expect, test } from "vitest";

import { GATED, GATES, gatedLeaks } from "./gated.mjs";

const FIXTURE = [{ prefix: "lib/held-", gate: "#1" }, { prefix: "mcp/view/", gate: "#1" }];

describe("publication gate", () =>
{
    test("every gated prefix names a gate with a reason", () =>
    {
        expect(GATED.filter(({ gate }) => !GATES[gate]?.trim())).toEqual([]);
    });

    test("no gate is defined since #36 lifted (ADR-252); the MCP Apps view is not held", () =>
    {
        expect(gatedLeaks(["lib/a2ui-runtime-0.14.0.js", "mcp/renderer.html", "mcp/view/v1.js"])).toEqual([]);
    });

    test("a dist path under a gated prefix is a leak; others are not", () =>
    {
        expect(gatedLeaks(["lib/held-1.0.0.js", "lib/dompurify-3.4.17.js", "mcp/view/v1.js"], FIXTURE))
            .toEqual([{ path: "lib/held-1.0.0.js", gate: "#1" }, { path: "mcp/view/v1.js", gate: "#1" }]);
    });
});
