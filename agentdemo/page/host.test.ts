/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlaygroundHost. The playground's A2UI host (#30 spec §5.2,
 *    §5.3): one labelled frame per surface, all-or-nothing on schema
 *    findings, processing errors reported per message, actions and errors
 *    as the A2UI messages an agent receives. Real web_core and the real Lit
 *    renderer; only Google's basic components, so no adapter assets load.
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { Catalog } from "@a2ui/web_core/v0_9";
import { BASIC_FUNCTIONS } from "@a2ui/web_core/v0_9/basic_catalog";
import { basicCatalog } from "@a2ui/lit/v0_9";

import { linkSchemaOnly } from "../../scripts/agentui/a2ui-check.mjs";
import { Host } from "./host";
import type { A2uiActionMessage, A2uiErrorMessage, Finding } from "./types";

const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const CATALOG = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "specs", "agentui", "published",
    "catalog-v1.json"), "utf8"));
const surface = (surfaceId = "s") => ({ version: V, createSurface: { surfaceId, catalogId: ID } });
const components = (list: unknown[], surfaceId = "s") =>
    ({ version: V, updateComponents: { surfaceId, components: list } });
const flush = () => new Promise((r) => setTimeout(r, 0));

let host: Host | undefined;

function makeHost(checkSchema = (_m: readonly unknown[]): Finding[] => []): { host: Host; el: HTMLElement }
{
    const el = document.createElement("div");

    document.body.append(el);
    host = new Host({ surfacesEl: el, checkSchema,
        catalog: linkSchemaOnly(CATALOG, { Catalog, basicCatalog, BASIC_FUNCTIONS }) });

    return { host, el };
}

afterEach(() =>
{
    host?.reset();
    host = undefined;
    document.body.replaceChildren();
});

describe("Host", () =>
{
    test("a valid batch creates one labelled frame per surface", () =>
    {
        const { host, el } = makeHost();
        const result = host.apply([surface("s"), surface("t")]);

        expect(result).toEqual({ applied: true, findings: [], errors: [] });
        expect([...el.querySelectorAll("[data-surface]")].map((f) => f.getAttribute("data-surface")))
            .toEqual(["s", "t"]);
        expect(el.querySelector('[data-surface="s"] header')?.textContent).toBe('surface "s"');
        expect(host.surfaces()).toEqual(["s", "t"]);
    });

    test("a batch with schema findings applies nothing", () =>
    {
        const finding: Finding = { index: 1, path: "", layer: "schema", message: "bad" };
        const { host, el } = makeHost(() => [finding]);
        const result = host.apply([surface(), components([{ id: "root", component: "Nope" }])]);

        expect(result).toEqual({ applied: false, findings: [finding], errors: [] });
        expect(el.querySelectorAll("[data-surface]")).toHaveLength(0);
    });

    test("a message web_core rejects is an A2UI error, and the rest of the batch still applies", () =>
    {
        const { host } = makeHost();
        const result = host.apply([components([{ id: "root", component: "Text", text: "x" }], "nope"), surface()]);

        expect(result.applied).toBe(true);
        expect(result.errors).toEqual([{ version: V, error: expect.objectContaining({ code: "MESSAGE_REJECTED",
            message: expect.stringContaining("Surface not found") }) }]);
        expect(host.surfaces()).toEqual(["s"]);
    });

    test("deleteSurface removes the frame", () =>
    {
        const { host, el } = makeHost();

        host.apply([surface()]);
        host.apply([{ version: V, deleteSurface: { surfaceId: "s" } }]);

        expect(el.querySelectorAll("[data-surface]")).toHaveLength(0);
        expect(host.surfaces()).toEqual([]);
    });

    test("dataModel returns the surface's data", () =>
    {
        const { host } = makeHost();

        host.apply([surface(), { version: V, updateDataModel: { surfaceId: "s", path: "/",
            value: { o: "portrait" } } }]);

        expect(host.dataModel("s")).toEqual({ o: "portrait" });
    });

    test("a button's action reaches onAction as the A2UI action message", async () =>
    {
        const { host, el } = makeHost();
        const seen: A2uiActionMessage[] = [];

        host.onAction((a) => seen.push(a));
        host.apply([surface(), components([
            { id: "root", component: "Button", child: "label", action: { event: { name: "go", context: {} } } },
            { id: "label", component: "Text", text: "Go" },
        ])]);
        await flush();
        await flush();
        el.querySelector("button")?.click();
        await flush();

        expect(seen).toEqual([{ version: V, action: expect.objectContaining({ name: "go", surfaceId: "s",
            sourceComponentId: "root" }) }]);
    });

    test("onError receives errors as A2UI error messages, marked as raised during apply, until unsubscribed", () =>
    {
        const { host } = makeHost();
        const seen: Array<[A2uiErrorMessage, boolean]> = [];
        const off = host.onError((e, duringApply) => seen.push([e, duringApply]));

        host.apply([components([], "nope")]);
        off();
        host.apply([components([], "nope")]);

        expect(seen).toHaveLength(1);
        expect(seen[0][0].error.code).toBe("MESSAGE_REJECTED");
        expect(seen[0][1]).toBe(true);
    });

    test("reset deletes every surface", () =>
    {
        const { host, el } = makeHost();

        host.apply([surface("s"), surface("t")]);
        host.reset();

        expect(el.querySelectorAll("[data-surface]")).toHaveLength(0);
        expect(host.surfaces()).toEqual([]);
    });
});
