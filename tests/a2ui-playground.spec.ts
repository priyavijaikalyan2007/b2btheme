/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the A2UI playground (#30 spec §5, §10.2) in a real browser, under
 * its real CSP: it loads with no policy violation, pasted messages are
 * checked and applied through one path, a rejected batch renders nothing,
 * and a scenario steps forward through the toolbar.
 */

import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

import { cspViolations, openPlayground } from "./a2ui/playground-route";

const V = "v0.9.1";
const ID = "https://static.outcrop.us/a2ui/catalog/v1.json";
const surface = { version: V, createSurface: { surfaceId: "s", catalogId: ID } };
const ruler = { version: V, updateComponents: { surfaceId: "s", components: [{ id: "root", component: "Ruler" }] } };

async function paste(page: Page, messages: unknown[]): Promise<void>
{
    await page.getByRole("button", { name: /^Paste:/ }).click();
    await page.locator("#a2ui-paste .cm-content").click();
    await page.keyboard.insertText(JSON.stringify(messages));
}

test.describe("A2UI playground", () =>
{
    test("loads every region with no CSP violation", async ({ page }) =>
    {
        await openPlayground(page);

        await expect(page.locator(".a2ui-toolbar")).toBeVisible();
        await expect(page.locator(".a2ui-log")).toBeAttached();
        await expect(page.locator(".a2ui-surfaces")).toBeVisible();
        await expect(page.locator("#a2ui-data")).toBeAttached();
        expect(await cspViolations(page)).toEqual([]);
    });

    test("pasted messages are checked, then applied into a labelled frame", async ({ page }) =>
    {
        await openPlayground(page);
        await paste(page, [surface, ruler]);

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Check" }).click();
        await expect(page.locator(".a2ui-paste-findings")).toHaveText("OK: 2 message(s), no findings");

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Apply" }).click();
        await expect(page.locator('[data-surface="s"] outcrop-ruler .ruler').first()).toBeVisible();
        await expect(page.locator(".a2ui-log li")).toHaveCount(2);
        await expect(page.locator('.a2ui-log li[data-status="applied"]')).toHaveCount(2);
        expect(await cspViolations(page)).toEqual([]);
    });

    test("a batch with an unknown component is rejected whole and renders nothing", async ({ page }) =>
    {
        await openPlayground(page);
        await paste(page, [surface, { version: V, updateComponents: { surfaceId: "s",
            components: [{ id: "root", component: "Nope" }] } }]);

        await page.locator("#a2ui-paste").locator("..").getByRole("button", { name: "Apply" }).click();

        await expect(page.locator('.a2ui-log li[data-status="rejected"]')).toHaveCount(2);
        await expect(page.locator("[data-surface]")).toHaveCount(0);
        await expect(page.locator(".a2ui-findings")).toContainText('unknown component "Nope"');
    });

    test("a scenario steps forward from the toolbar", async ({ page }) =>
    {
        await openPlayground(page);
        await page.locator(".a2ui-toolbar select").selectOption("pick-orientation");
        await expect(page.getByRole("button", { name: /^Step:/ })).not.toHaveAttribute("aria-disabled", "true");

        for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /^Step:/ }).click(); }

        await expect(page.locator('.a2ui-log li[data-status="applied"]')).toHaveCount(3);
        await expect(page.locator("outcrop-orientation-picker .orientationpicker-trigger")).toBeVisible();
        await expect.poll(() => page.evaluate(() => (window as unknown as { a2uiPlayground: { snapshot():
            { dataModels: Record<string, unknown> } } }).a2uiPlayground.snapshot().dataModels))
            .toEqual({ s: { orientation: "portrait" } });
        expect(await cspViolations(page)).toEqual([]);
    });
});

const SENTINEL = "sk-ant-SENTINEL-0123456789";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
        "x-api-key,anthropic-version,anthropic-dangerous-direct-browser-access,content-type" };
const BUTTON_UI = JSON.stringify({ say: "Here is a button.", messages: [surface,
    { version: V, updateComponents: { surfaceId: "s", components: [
        { id: "root", component: "Column", children: ["go"] },
        { id: "go", component: "Button", child: "goLabel", action: { event: { name: "go", context: {} } } },
        { id: "goLabel", component: "Text", text: "Go" }] } }] });
const UNKNOWN = JSON.stringify({ say: "Oops.", messages: [surface,
    { version: V, updateComponents: { surfaceId: "s", components: [{ id: "root", component: "Nope" }] } }] });

interface Sent
{
    headers: Record<string, string>;
    body: { system: { text: string }[]; messages: { role: string; content: string }[] };
}

/** Answers Anthropic's Messages API with `replies` in order, including the CORS preflight. */
async function mockAnthropic(page: Page, replies: string[]): Promise<Sent[]>
{
    const sent: Sent[] = [];

    await page.route("https://api.anthropic.com/v1/messages", async (route) =>
    {
        const req = route.request();

        if (req.method() === "OPTIONS") { await route.fulfill({ status: 204, headers: CORS }); return; }

        sent.push({ headers: req.headers(), body: JSON.parse(req.postData() ?? "{}") });
        await route.fulfill({ status: 200, headers: { ...CORS, "content-type": "application/json" },
            body: JSON.stringify({ content: [{ type: "text", text: replies.shift() ?? '{"say":"","messages":[]}' }],
                usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 80 } }) });
    });

    return sent;
}

async function ask(page: Page, text: string): Promise<void>
{
    await page.locator("#a2ui-key").fill(SENTINEL);
    await page.locator(".conversation-input-area textarea").fill(text);
    await page.getByRole("button", { name: "Send message" }).click();
}

test.describe("A2UI playground agent (mocked provider)", () =>
{
    test("a reply renders, and a click goes back to the model as the next turn", async ({ page }) =>
    {
        const sent = await mockAnthropic(page, [BUTTON_UI, '{"say":"Clicked.","messages":[]}']);

        await openPlayground(page);
        await ask(page, "Give me a button");
        await page.locator('[data-surface="s"] button:has-text("Go")').click();

        await expect.poll(() => sent.length).toBe(2);
        expect(sent[0].headers["x-api-key"]).toBe(SENTINEL);
        expect(sent[0].headers["anthropic-dangerous-direct-browser-access"]).toBe("true");
        expect(sent[1].body.messages.at(-1)?.content).toContain('"name":"go"');
        await expect(page.locator(".a2ui-usage").first()).toHaveText("in 100 · out 20 · cached 80");
        expect(await cspViolations(page)).toEqual([]);
    });

    test("the system prompt carries the lean agent catalog and the basic catalog, not the full catalog (#49)",
        async ({ page }) =>
        {
            const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", rel), "utf8"));
            const sent = await mockAnthropic(page, ['{"say":"Hello.","messages":[]}']);

            await openPlayground(page);
            await ask(page, "Hello");
            await expect.poll(() => sent.length).toBe(1);

            const system = sent[0].body.system[0].text;
            expect(system).toContain(JSON.stringify(read("dist/a2ui/catalog/v1.agent.json")));
            expect(system).toContain(JSON.stringify(read("scripts/agentui/vendor/a2ui-v0_9_1/catalogs/basic/catalog.json")));
            expect(system).not.toContain(JSON.stringify(read("dist/a2ui/catalog/v1.json").components.StatusBadge));
        });

    test("an invalid reply is repaired in view: rejected, then applied", async ({ page }) =>
    {
        const sent = await mockAnthropic(page, [UNKNOWN, BUTTON_UI]);

        await openPlayground(page);
        await ask(page, "Give me a button");

        await expect(page.locator('[data-surface="s"] button:has-text("Go")')).toBeVisible();
        expect(sent).toHaveLength(2);
        expect(sent[1].body.messages.at(-1)?.content).toContain('unknown component "Nope"');
        await expect(page.getByText("Repair 1 of 2")).toBeVisible();
        await expect(page.locator('.a2ui-log li[data-status="rejected"]')).toHaveCount(2);
        await expect(page.locator('.a2ui-log li[data-status="applied"]')).toHaveCount(2);
    });

    test("the key never reaches the DOM or a saved session", async ({ page }) =>
    {
        await mockAnthropic(page, [BUTTON_UI]);
        await openPlayground(page);
        await ask(page, "Give me a button");
        await expect(page.locator('[data-surface="s"] button:has-text("Go")')).toBeVisible();

        expect(await page.content()).not.toContain(SENTINEL);

        const [download] = await Promise.all([page.waitForEvent("download"),
            page.getByRole("button", { name: "Save session" }).click()]);
        const text = await new Response(await download.createReadStream() as unknown as ReadableStream).text();

        expect(text).not.toContain(SENTINEL);
        expect(text.split("\n")[0]).toContain('"provenance":"live"');
        expect(text).toContain('"kind":"a2ui"');
        expect(await cspViolations(page)).toEqual([]);
    });
});
