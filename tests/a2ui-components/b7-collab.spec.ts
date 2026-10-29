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

/** A complete action item, every field ActionItem requires, as an agent sends it. */
const actionItem = (id: string, order: number, content: string, status: string, extra: object = {}) => ({
    id, index: order, order, content, status, tags: [], commentCount: 0,
    createdAt: "2026-10-29T09:00:00.000Z", updatedAt: "2026-10-29T09:00:00.000Z", ...extra,
});

/** Two items to start, one in progress with an assignee, one done. */
const ITEMS = [
    actionItem("i1", 1, "Draft the agenda", "not-started"),
    actionItem("i2", 2, "Book the room", "not-started"),
    actionItem("i3", 3, "Collect the slides", "in-progress", { assignee: { id: "p1", name: "Ada Lovelace" } }),
    actionItem("i4", 4, "Send the invite", "done"),
];

/** The list with its items in the slot at /items. */
const AI = { ...EV, items: { path: "/items" } };

/** Clicks an item's number, which selects the row without starting an edit; Ctrl (Cmd on a Mac) adds to it. */
const pickRow = (page: Page, id: string, add = false) => page.locator(
    `.actionitems-item[data-id="${id}"] .actionitems-number`).click(add ? { modifiers: ["ControlOrMeta"] } : {});

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

    test("PromptTemplateManager: the agent's new templates keep the user's selection, draft, variables and preview",
        async ({ page }) =>
        {
            await mount(page, "PromptTemplateManager", { ...PTM, onSelect: act("pick", "select") },
                { templates: TEMPLATES });

            await page.locator('.promptmanager-list-item[data-template-id="t2"]').click();
            await page.locator('.promptmanager-variable-input[data-variable="name"]').fill("Ada");
            await page.locator(".promptmanager-btn-preview").click();
            await expect(page.locator(".promptmanager-preview-panel")).toHaveText("Goodbye Ada.");
            await page.locator(".promptmanager-desc-input").fill("For leaving users");

            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/templates", value: [
                { id: "t0", name: "Intro", content: "Hi {{name}}." }, TEMPLATES[0],
                { ...TEMPLATES[1], name: "Farewell (edited)", content: "Goodbye {{name}}, see you soon." }] } }]);

            await expect(page.locator('.promptmanager-list-item[data-template-id="t0"]')).toHaveCount(1);
            await expect(page.locator('.promptmanager-list-item[data-template-id="t2"]'))
                .toHaveAttribute("aria-selected", "true");
            // The unsaved edit is the user's draft: t2 keeps it and its marker over the agent's version.
            await expect(page.locator(".promptmanager-name-input")).toHaveValue("Farewell");
            await expect(page.locator(".promptmanager-desc-input")).toHaveValue("For leaving users");
            await expect(page.locator('.promptmanager-list-item[data-template-id="t2"]'))
                .toHaveClass(/promptmanager-list-item-dirty/);
            await expect(page.locator('.promptmanager-variable-input[data-variable="name"]')).toHaveValue("Ada");
            await expect(page.locator(".promptmanager-preview-panel")).toHaveText("Goodbye Ada.");
            await sent(page, [["pick", "t2"]]);
        });

    test("ActionItems: + Add sends onItemCreate with the empty item, then typing sends onItemUpdate with its text",
        async ({ page }) =>
        {
            await mount(page, "ActionItems", { ...AI, onItemCreate: act("created", "itemCreate"),
                onItemUpdate: act("updated", "itemUpdate") }, { items: ITEMS });

            await page.locator(".actionitems-add").click();
            const input = page.locator(".actionitems-edit-input");
            const id = await page.locator(".actionitems-item:has(.actionitems-edit-input)").getAttribute("data-id");
            await input.fill("Order lunch");
            await input.blur();

            await sent(page, [
                ["created", expect.objectContaining({ id, content: "", status: "not-started", commentCount: 0 })],
                ["updated", { itemId: id, changes: { content: "Order lunch" } }],
            ]);
        });

    test("ActionItems: leaving a new item empty sends onItemDelete with its id", async ({ page }) =>
    {
        await mount(page, "ActionItems", { ...AI, onItemDelete: act("gone", "itemDelete") }, { items: ITEMS });

        await page.locator(".actionitems-add").click();
        const id = await page.locator(".actionitems-item:has(.actionitems-edit-input)").getAttribute("data-id");
        await page.locator(".actionitems-edit-input").focus();
        await page.locator(".actionitems-edit-input").blur();

        await sent(page, [["gone", id]]);
        await expect(page.locator(".actionitems-item")).toHaveCount(4);
    });

    test("ActionItems: clicking an item's status icon sends onStatusChange with the old and new status",
        async ({ page }) =>
        {
            await mount(page, "ActionItems", { ...AI, onStatusChange: act("status", "statusChange") },
                { items: ITEMS });

            await page.locator('.actionitems-item[data-id="i1"] .actionitems-status-indicator').click();

            await sent(page, [["status", { itemId: "i1", oldStatus: "not-started", newStatus: "in-progress" }]]);
        });

    test("ActionItems: Ctrl+Shift+Down moves the focused item and sends onItemReorder with its new order",
        async ({ page }) =>
        {
            await mount(page, "ActionItems", { ...AI, onItemReorder: act("moved", "itemReorder") },
                { items: ITEMS });

            await pickRow(page, "i1");
            await page.locator(".actionitems").focus();
            await page.keyboard.press("Control+Shift+ArrowDown");

            await sent(page, [["moved", { itemId: "i1", newOrder: 2, newParentId: null }]]);
            await expect(page.locator(".actionitems-section").first().locator(".actionitems-item").first())
                .toHaveAttribute("data-id", "i2");
        });

    test("ActionItems: clicking an assignee sends onAssignmentRequest with the current assignee", async ({ page }) =>
    {
        await mount(page, "ActionItems", { ...AI, onAssignmentRequest: act("assign", "assignmentRequest") },
            { items: ITEMS });

        await page.locator('.actionitems-item[data-id="i3"] .actionitems-assignee').click();
        await page.locator('.actionitems-item[data-id="i1"] .actionitems-assignee').click();

        await sent(page, [
            ["assign", { itemId: "i3", currentAssignee: { id: "p1", name: "Ada Lovelace" } }],
            ["assign", { itemId: "i1", currentAssignee: null }],
        ]);
    });

    test("ActionItems: clicking items sends onSelection with the whole selection", async ({ page }) =>
    {
        await mount(page, "ActionItems", { ...AI, onSelection: act("picked", "selection") }, { items: ITEMS });

        await pickRow(page, "i1");
        await pickRow(page, "i4", true);

        await sent(page, [["picked", ["i1"]], ["picked", ["i1", "i4"]]]);
    });

    test("ActionItems: the bulk Assign and Delete buttons send onBulkAssign and onBulkDelete with the ids",
        async ({ page }) =>
        {
            await mount(page, "ActionItems", { ...AI, onBulkAssign: act("assignAll", "bulkAssign"),
                onBulkDelete: act("deleteAll", "bulkDelete") }, { items: ITEMS });
            page.on("dialog", (dialog) => dialog.accept());

            await pickRow(page, "i1");
            await pickRow(page, "i2", true);
            await page.locator(".actionitems-bulk-btn", { hasText: "Assign" }).click();
            await page.locator(".actionitems-bulk-btn-danger").click();

            await sent(page, [["assignAll", ["i1", "i2"]], ["deleteAll", ["i1", "i2"]]]);
            await expect(page.locator(".actionitems-item")).toHaveCount(2);
        });

    test("ActionItems: the agent's new items keep the user's selection, collapsed section and the item being typed",
        async ({ page }) =>
        {
            await mount(page, "ActionItems", { ...AI, onItemCreate: act("created", "itemCreate"),
                onItemUpdate: act("updated", "itemUpdate") }, { items: ITEMS });

            await pickRow(page, "i2");
            await page.locator(".actionitems-section-header", { hasText: "Done" }).click();
            await page.locator(".actionitems-add").click();
            const input = page.locator(".actionitems-edit-input");
            await input.fill("Order lu");
            const created = ((await actions(page))[0].context as { p: Record<string, unknown> }).p;

            // The agent drops i1, keeps the item it heard about (still empty, as itemCreate said) and adds i5.
            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/items", value: [
                ITEMS[1], ITEMS[2], ITEMS[3], created, actionItem("i5", 5, "Print the handouts", "in-progress")] } }]);

            await expect(page.locator('.actionitems-item[data-id="i5"]')).toHaveCount(1);
            await expect(page.locator('.actionitems-item[data-id="i1"]')).toHaveCount(0);
            await expect(page.locator(`.actionitems-item[data-id="${created.id}"] .actionitems-edit-input`))
                .toHaveValue("Order lu");
            await expect(input).toBeFocused();
            await expect(page.locator('.actionitems-item[data-id="i2"]')).toHaveClass(/actionitems-selected/);
            await expect(page.locator(".actionitems-section-header", { hasText: "Done" }))
                .toHaveAttribute("aria-expanded", "false");

            expect(await actions(page)).toHaveLength(1);

            // The edit is still live: finishing it reports the user's text.
            await input.pressSequentially("nch");
            await input.blur();
            await sent(page, [["created", created],
                ["updated", { itemId: created.id, changes: { content: "Order lunch" } }]]);
        });
});
