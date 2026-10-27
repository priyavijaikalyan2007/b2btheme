/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiMessageChecker / link parity. The checker's dry run links
 *    our catalog schema-only, because createOutcropCatalog builds element
 *    classes that plain Node cannot (#30 spec §3.1). This proves the two
 *    linkings expose the same components and schemas, so the dry run judges
 *    messages against exactly what hosts load.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import { linkSchemaOnly } from "../scripts/agentui/a2ui-check.mjs";

type Linked = { components: Map<string, { name: string; schema: unknown }> };

const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "dist", "a2ui", "catalog", "v1.json"), "utf8"));

function shape(catalog: Linked): Array<[string, string]>
{
    return [...catalog.components.values()].map((c): [string, string] => [c.name, JSON.stringify(c.schema)])
        .sort(([a], [b]) => a.localeCompare(b));
}

describe("linkSchemaOnly", () =>
{
    test("exposes the same component names and schemas as createOutcropCatalog", async () =>
    {
        const webCore = { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS };
        // @ts-expect-error — the built bundle has no declaration next to it in this tree
        const adapter = await import("../dist/a2ui/adapter/v1.js");
        const hosts = adapter.createOutcropCatalog(webCore, { assetBaseUrl: "https://static.example" }) as Linked;
        const checker = linkSchemaOnly(CATALOG, webCore) as Linked;

        expect(shape(checker).map(([name]) => name)).toEqual(shape(hosts).map(([name]) => name));
        expect(shape(checker)).toEqual(shape(hosts));
    });
});
