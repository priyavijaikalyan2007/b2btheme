/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * @vitest-environment node
 *
 * ⚓ TESTS: the MCP Apps demo server (agentui-unblock §6). Every domain's
 *    surface, with each server answer applied, passes the same three-layer
 *    A2UI checker the playground scenarios pass, so a wrong prop name fails
 *    here rather than rendering nothing. Every button is answered, either
 *    by a "message" route or by demo_action. The server is read through a
 *    real Client, and the renderer page loads only from the local origin.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
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
import { parseResult } from "../src/result";
import { contrastOnWhiteText } from "./domains/branding.mjs";
import { createDemoServer, demoAction, DOMAINS, demoRenderer, RENDERER_URI } from "./server.mjs";

type Outcrop = { messages: Array<Record<string, any>>; routes?: { byName?: Record<string, string> } };
type Result = { content: Array<{ text: string }>; isError?: boolean; structuredContent?: { outcrop: Outcrop } };
type Event = { name: string; context: Record<string, unknown> };
type Component = { id: string; component: string; action?: { event: Event } };

const ORIGIN = "http://127.0.0.1:8125";
const MANIFEST = { assets: {
    "mcp-ext-apps": { url: "/lib/mcp-ext-apps-2.0.4.js", integrity: "sha384-ext" },
    "a2ui-runtime": { url: "/lib/a2ui-runtime-0.14.0.js", integrity: "sha384-a2ui" } } };
let deps: CheckDeps;

beforeAll(async () =>
{
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "mcp-demo-")), "v.mjs");
    const source = compileMessageValidator({ catalog, basic, commonTypes, envelope });

    fs.writeFileSync(file, await bundleMessageValidator(source));
    deps = { validators: (await import(pathToFileURL(file).href)).messageValidators, catalogJson: catalog,
        webCore: { Catalog, MessageProcessor, basicCatalog, BASIC_FUNCTIONS }, catalogs: { ours: catalog, basic,
            commonTypes } };
}, 60_000);

/** The view's arguments for an action on `surfaceId` (router.toolArguments). */
function actionArgs(surfaceId: string, name: string, context: Record<string, unknown>)
{
    return { outcrop: { version: 1 as const, surfaceId, action: { version: "v0.9.1", action: {
        name, surfaceId, sourceComponentId: name, timestamp: "2026-11-06T00:00:00Z", context } } } };
}

function messagesOf(result: Result): Array<Record<string, any>>
{
    return result.structuredContent?.outcrop.messages ?? [];
}

function componentsOf(result: Result): Component[]
{
    return messagesOf(result).flatMap((m) => m.updateComponents?.components ?? []);
}

/** Replaces each {path} in a context with its value in the data model, as the renderer does. */
function resolve(context: Record<string, unknown>, data: Record<string, unknown>): Record<string, unknown>
{
    const at = (pointer: string) => pointer.split("/").filter(Boolean)
        .reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], data);

    return Object.fromEntries(Object.entries(context).map(([key, value]) =>
        [key, typeof value === "object" && value !== null && "path" in value ? at(String(value.path)) : value]));
}

/** A valid action context for each server-answered action a component can raise. */
const SAMPLES: Record<string, Record<string, unknown>> = {
    orderSelected: { selection: [{ id: "SO-4473" }] },
    loadAisles: { node: { id: "reno" } },
    peopleSearch: { q: "ch" },
};

async function connect(): Promise<Client>
{
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });

    await createDemoServer(demoRenderer(ORIGIN, MANIFEST)).connect(serverSide);
    await client.connect(clientSide);

    return client;
}

describe.each(DOMAINS.map((d) => [d.tool, d] as const))("%s", (_tool, { domain }) =>
{
    const shown = () => domain.show() as Result;

    test("its result parses as the view parses it, on its own surface", () =>
    {
        expect(parseResult(shown() as never).surfaceIds).toEqual([domain.SURFACE]);
    });

    test("the surface and every server answer pass the A2UI checker", () =>
    {
        const answers = Object.entries(SAMPLES).flatMap(([name, context]) =>
        {
            const result = domain.act(name, context) as Result;

            return result.isError ? [] : messagesOf(result);
        });
        const buttons = componentsOf(shown()).filter((c) => c.action !== undefined);
        const routed = buttons.flatMap((b) =>
        {
            const result = domain.act(b.action!.event.name, b.action!.event.context) as Result;

            return result.isError ? [] : messagesOf(result);
        });

        expect(formatFindings(check([...messagesOf(shown()), ...answers, ...routed], deps).findings)).toBe("");
    });

    test("every button is answered: by the model, or by demo_action without an error", () =>
    {
        const result = shown();
        const data = messagesOf(result).find((m) => m.updateDataModel)?.updateDataModel.value ?? {};
        const byName = result.structuredContent?.outcrop.routes?.byName ?? {};
        const buttons = componentsOf(result).filter((c) => c.action !== undefined);
        const unanswered = buttons.filter((b) =>
        {
            const { name, context } = b.action!.event;

            return byName[name] !== "message" && (domain.act(name, resolve(context, data)) as Result).isError === true;
        });

        expect(buttons.length).toBeGreaterThan(0);
        expect(unanswered.map((b) => b.id)).toEqual([]);
    });

    test("an action it does not have is a tool error that names it", () =>
    {
        expect(domain.act("nope", {})).toEqual({ content: [{ type: "text", text: expect.stringContaining('"nope"') }],
            isError: true });
    });
});

describe("domain answers", () =>
{
    test("health: Refresh moves checkout to operational", () =>
    {
        const status = componentsOf(demoAction(actionArgs("health", "refresh", {})) as Result)
            .find((c) => c.id === "status") as Record<string, unknown>;

        expect(status.status).toBe("operational");
    });

    test("orders: a selected order gets its detail; an unknown one is an error", () =>
    {
        const detail = componentsOf(demoAction(actionArgs("orders", "orderSelected", SAMPLES.orderSelected)) as Result)
            .find((c) => c.id === "detail") as Record<string, unknown>;

        expect(detail.text).toContain("credit limit");
        expect((demoAction(actionArgs("orders", "orderSelected", { selection: [{ id: "SO-1" }] })) as Result).isError)
            .toBe(true);
    });

    test("orders: a warehouse's aisles answer the TreeGrid's load at its bound path", () =>
    {
        const [message] = messagesOf(demoAction(actionArgs("orders", "loadAisles", SAMPLES.loadAisles)) as Result);

        expect(message.updateDataModel.path).toBe("/answers/aisles");
        expect(message.updateDataModel.value.map((a: { id: string }) => a.id)).toEqual(["reno-a1", "reno-b3"]);
    });

    test("scheduling: people search matches name or role", () =>
    {
        const [message] = messagesOf(demoAction(actionArgs("meeting", "peopleSearch", { q: "design" })) as Result);

        expect(message.updateDataModel.value.map((p: { name: string }) => p.name)).toEqual(["Ben Okafor"]);
    });

    test("branding: the contrast check passes dark blue and fails yellow", () =>
    {
        const text = (hex: string) =>
            (demoAction(actionArgs("brand", "check", { primary: hex })) as Result).content[0].text;

        expect(text("#1D4ED8")).toContain("passes WCAG AA");
        expect(text("#FACC15")).toContain("fails WCAG AA");
        expect(contrastOnWhiteText("#000000")).toBeCloseTo(21, 5);
        expect((demoAction(actionArgs("brand", "check", { primary: "blue" })) as Result).isError).toBe(true);
    });

    test("an action on a surface no domain owns is a tool error", () =>
    {
        expect((demoAction(actionArgs("deal", "approve", {})) as Result).content[0].text)
            .toBe('No demo surface "deal".');
    });
});

describe("demo server", () =>
{
    test("lists one model tool per domain, linked to the renderer, and demo_action for apps only", async () =>
    {
        const { tools } = await (await connect()).listTools();
        const meta = Object.fromEntries(tools.map((t) => [t.name, t._meta?.ui]));

        expect(Object.keys(meta).sort()).toEqual([...DOMAINS.map((d) => d.tool), "demo_action"].sort());
        DOMAINS.forEach((d) => expect(meta[d.tool]).toEqual({ resourceUri: RENDERER_URI }));
        expect(meta.demo_action).toEqual({ resourceUri: RENDERER_URI, visibility: ["app"] });
    });

    test("a model tool and a routed action both answer over MCP", async () =>
    {
        const client = await connect();
        const shown = await client.callTool({ name: "plan_meeting", arguments: {} }) as Result;
        const routed = await client.callTool({ name: "demo_action",
            arguments: actionArgs("meeting", "peopleSearch", { q: "chen" }) }) as Result;

        expect(componentsOf(shown).map((c) => c.component)).toEqual(expect.arrayContaining(
            ["DatePicker", "TimePicker", "TimezonePicker", "DurationPicker", "CronPicker", "PeoplePicker"]));
        expect(routed.content[0].text).toBe('1 people match "chen".');
    });

    test("the ui:// resource loads everything from the local origin, which its CSP allows", async () =>
    {
        const read = await (await connect()).readResource({ uri: RENDERER_URI });
        type Content = { text: string; _meta: { ui: { csp: { resourceDomains: string[] } } } };
        const [content] = read.contents as Content[];

        expect(content.text).not.toContain("static.outcrop.us");
        expect(content.text).toContain(`<script type="module" src="${ORIGIN}/mcp/view/v1.js"></script>`);
        expect(content.text).toContain(`src="${ORIGIN}/lib/a2ui-runtime-0.14.0.js" integrity="sha384-a2ui"`);
        expect(content._meta.ui.csp.resourceDomains[0]).toBe(ORIGIN);
    });

    test("a manifest without the runtime is refused", () =>
    {
        expect(() => demoRenderer(ORIGIN, { assets: {} })).toThrow("dist/lib-manifest.json has no mcp-ext-apps");
    });
});
