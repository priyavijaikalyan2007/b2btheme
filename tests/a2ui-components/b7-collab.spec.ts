/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the B7 collaboration and AI components under @a2ui/lit (readiness
 * step 2 B7). Each event reaches the agent with its payload under eventData,
 * and an agent rewriting a component's list through its slot keeps what the
 * user was in the middle of (B7-1).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Checks the agent received exactly `expected` (name and payload, in order) and nothing failed. */
async function sent(page: Page, expected: [string, unknown][]): Promise<void>
{
    await expect.poll(() => actions(page)).toEqual(expected.map(([name, p]) =>
        expect.objectContaining({ name, context: { p } })));
    expect(await errors(page)).toEqual([]);
}

/** Two prompt templates, the first selected when the manager is shown. */
const TEMPLATES = [
    { id: "t1", name: "Greeting", content: "Hello {{name}}, welcome to {{place}}.", category: "General" },
    { id: "t2", name: "Farewell", content: "Goodbye {{name}}.", category: "General" },
];

/** The manager with its templates in the slot at /templates. */
const PTM = { ...EV, templates: { path: "/templates" }, categories: ["General"] };

test.describe("B7 collaboration and AI under @a2ui/lit", () =>
{
    test("PromptTemplateManager: clicking a template sends onSelect with its id", async ({ page }) =>
    {
        await mount(page, "PromptTemplateManager", { ...PTM, onSelect: act("pick", "select") },
            { templates: TEMPLATES });

        await page.locator('.promptmanager-list-item[data-template-id="t2"]').click();

        await sent(page, [["pick", "t2"]]);
    });

    test("PromptTemplateManager: renaming a template and saving sends onSave with it", async ({ page }) =>
    {
        await mount(page, "PromptTemplateManager", { ...PTM, onSave: act("saved", "save") },
            { templates: TEMPLATES });

        await page.locator(".promptmanager-name-input").fill("Welcome");
        await page.locator(".promptmanager-btn-save").click();

        await sent(page, [["saved", expect.objectContaining({ id: "t1", name: "Welcome", version: 1,
            content: "Hello {{name}}, welcome to {{place}}." })]]);
    });

    test("PromptTemplateManager: deleting a template sends onDelete with its id", async ({ page }) =>
    {
        await mount(page, "PromptTemplateManager", { ...PTM, onDelete: act("gone", "delete") },
            { templates: TEMPLATES });

        await page.locator(".promptmanager-btn-delete").click();

        await sent(page, [["gone", "t1"]]);
        await expect(page.locator('.promptmanager-list-item[data-template-id="t1"]')).toHaveCount(0);
    });

    test("PromptTemplateManager: duplicating a template sends onDuplicate with the copy", async ({ page }) =>
    {
        await mount(page, "PromptTemplateManager", { ...PTM, onDuplicate: act("copy", "duplicate") },
            { templates: TEMPLATES });

        await page.locator(".promptmanager-btn-duplicate").click();

        await sent(page, [["copy", expect.objectContaining({ id: expect.stringMatching(/^tpl-/),
            name: "Greeting (Copy)", content: "Hello {{name}}, welcome to {{place}}." })]]);
    });

    test("PromptTemplateManager: the agent's new templates keep the user's selection, variables and preview",
        async ({ page }) =>
        {
            await mount(page, "PromptTemplateManager", { ...PTM, onSelect: act("pick", "select") },
                { templates: TEMPLATES });

            await page.locator('.promptmanager-list-item[data-template-id="t2"]').click();
            await page.locator('.promptmanager-variable-input[data-variable="name"]').fill("Ada");
            await page.locator(".promptmanager-btn-preview").click();
            await expect(page.locator(".promptmanager-preview-panel")).toHaveText("Goodbye Ada.");

            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/templates", value: [
                { id: "t0", name: "Intro", content: "Hi {{name}}." }, TEMPLATES[0],
                { ...TEMPLATES[1], name: "Farewell (edited)", content: "Goodbye {{name}}, see you soon." }] } }]);

            await expect(page.locator('.promptmanager-list-item[data-template-id="t0"]')).toHaveCount(1);
            await expect(page.locator('.promptmanager-list-item[data-template-id="t2"]'))
                .toHaveAttribute("aria-selected", "true");
            await expect(page.locator(".promptmanager-name-input")).toHaveValue("Farewell (edited)");
            await expect(page.locator('.promptmanager-variable-input[data-variable="name"]')).toHaveValue("Ada");
            await expect(page.locator(".promptmanager-preview-panel")).toHaveText("Goodbye Ada, see you soon.");
            await sent(page, [["pick", "t2"]]);
        });
});
