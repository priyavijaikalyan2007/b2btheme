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
        for (const { gate } of GATED) { expect(GATES[gate]).toMatch(/\S/); }
    });

    test("a dist path under a gated prefix is a leak; others are not", () =>
    {
        expect(gatedLeaks(["lib/a2ui-runtime-0.14.0.js", "lib/dompurify-3.4.17.js"]))
            .toEqual([{ path: "lib/a2ui-runtime-0.14.0.js", gate: "#36" }]);
    });
});
