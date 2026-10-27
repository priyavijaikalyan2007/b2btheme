// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlayground / Scenarios. Every saved scenario is well formed
 *    (#30 spec §7.1–§7.3): a valid header, a director gesture for every
 *    action line and for nothing else, and a2ui lines that pass all three
 *    checker layers. A live scenario names its provider, model and date.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, test } from "vitest";
import { Catalog, MessageProcessor } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS, basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";

import basic from "../../scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json";
import commonTypes from "../../scripts/agentui/vendor/a2ui-v0_9_1/common_types.json";
import envelope from "../../scripts/agentui/vendor/a2ui-v0_9_1/server_to_client.json";
import catalog from "../../specs/agentui/published/catalog-v1.json";
import { check, formatFindings } from "../../scripts/agentui/a2ui-check.mjs";
import type { CheckDeps } from "../../scripts/agentui/a2ui-check.mjs";
import { bundleMessageValidator, compileMessageValidator } from "../../scripts/agentui/message-validator.mjs";
import { parseScenario } from "../page/scenario";

const NAMES = fs.readdirSync(__dirname).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -".jsonl".length));
let deps: CheckDeps;

beforeAll(async () =>
{
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "scenarios-")), "v.mjs");
    const source = compileMessageValidator({ catalog, basic, commonTypes, envelope });

    fs.writeFileSync(file, await bundleMessageValidator(source));
    deps = { validators: (await import(pathToFileURL(file).href)).messageValidators, catalogJson: catalog,
        webCore: { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS }, catalogs: { ours: catalog, basic,
            commonTypes } };
}, 60_000);

describe("scenarios", () =>
{
    test("there is at least one", () =>
    {
        expect(NAMES.length).toBeGreaterThan(0);
    });

    describe.each(NAMES)("%s", (name) =>
    {
        const text = () => fs.readFileSync(path.join(__dirname, `${name}.jsonl`), "utf8");
        const directorPath = path.join(__dirname, `${name}.director.json`);

        test("parses, with a valid header", () =>
        {
            expect(parseScenario(text()).header.kind).toBe("header");
        });

        test("has a director gesture for every action line and no other line", () =>
        {
            const actions = parseScenario(text()).lines.flatMap((l, i) => (l.kind === "action" ? [String(i)] : []));
            const director = JSON.parse(fs.readFileSync(directorPath, "utf8")) as Record<string, unknown[]>;

            expect(Object.keys(director).sort()).toEqual(actions.sort());
            expect(Object.values(director).every((g) => Array.isArray(g) && g.length > 0)).toBe(true);
        });

        test("its a2ui lines pass all three checker layers", () =>
        {
            const messages = parseScenario(text()).lines.flatMap((l) => (l.kind === "a2ui" ? [l.message] : []));
            const result = check(messages, deps);

            expect(formatFindings(result.findings)).toBe("");
        });
    });
});
