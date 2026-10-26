/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiMcpDescriptors. The MCP renderer CSP metadata: origins
 *    (host-neutral static.outcrop.us + Google Fonts), no connect domains,
 *    no paths. Spec §6, #17.
 */

import { describe, expect, test } from "vitest";

import { rendererMeta } from "./mcp-descriptors.mjs";

describe("rendererMeta", () =>
{
    test("names the host-neutral origin first", () =>
    {
        expect(rendererMeta().csp.resourceDomains[0]).toBe("https://static.outcrop.us");
    });
    test("names both Google Fonts origins", () =>
    {
        expect(rendererMeta().csp.resourceDomains.slice(1)).toEqual(["https://fonts.googleapis.com", "https://fonts.gstatic.com"]);
    });
    test("declares no network access", () => { expect("connectDomains" in rendererMeta().csp).toBe(false); });
    test("carries origins, never paths", () =>
    {
        expect(rendererMeta().csp.resourceDomains.every((d: string) => new URL(d).pathname === "/")).toBe(true);
    });
});
