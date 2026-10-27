/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: A2uiAdapterPage
 * 📜 PURPOSE: The real-browser A2UI host page the adapter and component specs
 *    share: a harness served under /__a2ui/ next to the built dist tree,
 *    rendering with @a2ui/lit or @a2ui/react, and the helpers that drive it.
 * 🔗 RELATES: [[A2uiAdapter]], [[A2uiHarness]]
 * ----------------------------------------------------------------------------
 */

import fs from "node:fs";
import path from "node:path";
import { test, type Page } from "@playwright/test";

import { buildHarness } from "./build-harness";

export const ORIGIN = "http://localhost:8000";
export const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";
export const V = "v0.9.1";
let harnessDir = "";

/** Builds the harness once per spec file; call at the top level of a spec. */
export function useHarness(): void
{
    test.beforeAll(async () => { harnessDir = await buildHarness(); });
}

/** Opens a harness page served under /__a2ui/ next to the real dist tree. */
export async function open(page: Page, renderer: "lit" | "react", query: Record<string, string> = {}): Promise<void>
{
    const qs = new URLSearchParams({ base: ORIGIN, ...query }).toString();
    const themeLink = query.inject === "1" ? "" : `<link rel="stylesheet" href="/css/custom.css">`;

    await page.route(`${ORIGIN}/__a2ui/**`, async (route) =>
    {
        const name = new URL(route.request().url()).pathname.split("/").pop()!;

        if (name.endsWith(".html"))
        {
            await route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><meta charset="utf-8">`
                + `${themeLink}</head><body><script type="module" src="/__a2ui/${renderer}.js"></script></body></html>` });
            return;
        }

        await route.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(harnessDir, name), "utf8") });
    });
    await page.goto(`${ORIGIN}/__a2ui/${renderer}.html?${qs}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
}

/** Delivers messages to the page's MessageProcessor. */
export function send(page: Page, messages: Record<string, unknown>[]): Promise<void>
{
    return page.evaluate((m) => (window as unknown as { send(x: unknown): void }).send(m), messages);
}

/** createSurface, one root component, and a data model. */
export function surface(id: string, root: Record<string, unknown>, data: Record<string, unknown> = {}): Record<string, unknown>[]
{
    return [
        { version: V, createSurface: { surfaceId: id, catalogId: CATALOG } },
        { version: V, updateComponents: { surfaceId: id, components: [root] } },
        { version: V, updateDataModel: { surfaceId: id, path: "/", value: data } },
    ];
}

/** Errors the surfaces reported, in order. */
export const errors = (page: Page) => page.evaluate(() => (window as unknown as { __errors: unknown[] }).__errors);

/** Actions the surfaces sent to the agent, in order. */
export const actions = (page: Page) =>
    page.evaluate(() => (window as unknown as { __actions: { name: string; context: unknown }[] }).__actions);

/** The value at a data-model path. */
export const dm = (page: Page, sid: string, p: string) => page.evaluate(([s, q]) =>
    (window as unknown as { dm(a: string, b: string): unknown }).dm(s, q), [sid, p]);
