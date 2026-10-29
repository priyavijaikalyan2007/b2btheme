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

/** A complete relationship, every field RelationshipInstance requires, as an agent sends it. */
const relationship = (id: string, name: string, group: string, extra: object = {}) => ({
    id, relationshipKey: group.toLowerCase().replace(/ /g, "_"), relationshipDisplayName: group,
    direction: "outbound", otherResourceId: `res-${id}`, otherResourceDisplayName: name, otherResourceType: "service",
    properties: {}, provenance: "manual", createdAt: "2026-10-29T09:00:00.000Z", ...extra,
});

/** Two manual groups and an AI suggestion. */
const RELATIONSHIPS = [
    relationship("r1", "Billing API", "Depends On"),
    relationship("r2", "Platform team", "Owned By"),
    relationship("r3", "Ledger", "Depends On", { provenance: "ai_inferred", confidence: 0.8 }),
];

/** One definition that creates as soon as a target is picked, and one with a properties form. */
const DEFINITIONS = [
    { key: "depends_on", displayName: "Depends On", targetTypeKeys: ["service"], sourceTypeKeys: null,
        cardinality: "many-to-many" },
    { key: "documented_by", displayName: "Documented By", targetTypeKeys: ["doc"], sourceTypeKeys: null,
        cardinality: "many-to-one", propertiesSchema: { section: { title: "Section", type: "string" } } },
];

/** The manager with its relationships in the slot at /relationships, the Add button, and the target search. */
const RM = { ...EV, resourceId: "svc-checkout", resourceType: "service", resourceDisplayName: "Checkout",
    relationshipDefinitions: DEFINITIONS, relationships: { path: "/relationships" }, showAddButton: true,
    onSearch: act("find", "search"), searchResult: { path: "/answers/search" } };

/** Clicks + Add, picks the definition named `def` and types `query` into the target search. */
async function searchTargets(page: Page, def: string, query: string): Promise<void>
{
    await page.locator(".rm-add-btn").click();
    await page.locator(".rm-def-item", { hasText: def }).click();
    await page.locator(".rm-search-input").fill(query);
}

/** The agent answers the target search. */
const answerSearch = (page: Page, value: unknown[]) =>
    send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/search", value } }]);

/** A button on the row for `name`. */
const rowButton = (page: Page, name: string, selector: string) =>
    page.locator(".rm-item", { has: page.locator(".rm-item-name", { hasText: name }) }).locator(selector);

/** A message as an agent sends it: an ISO timestamp, which the adapter turns into a Date. */
const chatMessage = (id: string, role: string, content: string) =>
    ({ id, role, content, timestamp: "2026-10-29T09:00:00.000Z" });

/** A session as an agent writes it, holding `messages`. */
const chatSession = (messages: Record<string, unknown>[]) => ({ id: "s1", title: "Support",
    createdAt: "2026-10-29T09:00:00.000Z", updatedAt: "2026-10-29T09:00:00.000Z", messages });

/** A question and its answer. */
const QA = [
    chatMessage("m1", "user", "What is the capital of France?"),
    chatMessage("m2", "assistant", "**Paris**."),
];

/** The chat with its transcript in the slot at /session. */
const CONV = { ...EV, session: { path: "/session" } };

/** Writes the agent's session to the slot. */
const writeSession = (page: Page, messages: Record<string, unknown>[]) =>
    send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/session", value: chatSession(messages) } }]);

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

    test("RelationshipManager: the agent answers a target search, and picking a result sends onCreateRelationship",
        async ({ page }) =>
        {
            await mount(page, "RelationshipManager", { ...RM,
                onCreateRelationship: act("create", "createRelationship") }, { relationships: RELATIONSHIPS });

            await searchTargets(page, "Depends On", "led");
            await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "find",
                context: { p: { query: "led", typeKeys: ["service"] } } })]);
            await answerSearch(page, [{ id: "svc-ledger", displayName: "Ledger", typeKey: "service",
                color: "#2E7D32" }]);
            await page.locator(".rm-search-item", { hasText: "Ledger" }).click();

            await sent(page, [["find", { query: "led", typeKeys: ["service"] }],
                ["create", { targetResourceId: "svc-ledger", relationshipKey: "depends_on", properties: {} }]]);
            await expect(page.locator(".rm-add-panel")).toBeHidden();
        });

    test("RelationshipManager: a definition's form sends its values with onCreateRelationship", async ({ page }) =>
    {
        await mount(page, "RelationshipManager", { ...RM,
            onCreateRelationship: act("create", "createRelationship") }, { relationships: RELATIONSHIPS });

        await searchTargets(page, "Documented By", "run");
        await expect.poll(async () => (await actions(page)).length).toBe(1);
        await answerSearch(page, [{ id: "doc-runbook", displayName: "Runbook", typeKey: "doc" }]);
        await page.locator(".rm-search-item", { hasText: "Runbook" }).click();
        await page.locator('.rm-props-form input[name="section"]').fill("Payments");
        await page.locator(".rm-create-btn").click();

        await sent(page, [["find", { query: "run", typeKeys: ["doc"] }], ["create", { targetResourceId: "doc-runbook",
            relationshipKey: "documented_by", properties: { section: "Payments" } }]]);
    });

    test("RelationshipManager: a search answer whose colour is not hex fails validation and renders nothing",
        async ({ page }) =>
        {
            await mount(page, "RelationshipManager", RM, { relationships: RELATIONSHIPS });

            await searchTargets(page, "Depends On", "led");
            await expect.poll(async () => (await actions(page)).length).toBe(1);
            await answerSearch(page, [{ id: "svc-ledger", displayName: "Ledger", typeKey: "service", color: "red" }]);

            await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED" })]);
            await expect(page.locator(".rm-search-item")).toHaveCount(0);
        });

    test("RelationshipManager: deleting asks ConfirmDialog, then sends onDeleteRelationship with the id",
        async ({ page }) =>
        {
            await mount(page, "RelationshipManager", { ...RM,
                onDeleteRelationship: act("delete", "deleteRelationship") }, { relationships: RELATIONSHIPS });

            await rowButton(page, "Billing API", ".rm-more-btn").click();
            await page.locator(".confirmdialog-cancel").click();
            await rowButton(page, "Platform team", ".rm-more-btn").click();
            await page.locator(".confirmdialog-confirm").click();

            await sent(page, [["delete", "r2"]]);
        });

    test("RelationshipManager: Navigate, Confirm and Dismiss send onNavigate, onConfirmInferred and onDismissInferred",
        async ({ page }) =>
        {
            await mount(page, "RelationshipManager", { ...RM, onNavigate: act("open", "navigate"),
                onConfirmInferred: act("confirm", "confirmInferred"),
                onDismissInferred: act("dismiss", "dismissInferred") }, { relationships: RELATIONSHIPS });

            await rowButton(page, "Billing API", '[aria-label="Navigate to resource"]').click();
            await rowButton(page, "Ledger", ".rm-confirm-btn").click();
            await rowButton(page, "Ledger", ".rm-dismiss-btn").click();

            await sent(page, [["open", "res-r1"], ["confirm", "r3"], ["dismiss", "r3"]]);
        });

    test("RelationshipManager: the agent's new relationships keep the open Add panel, sort, collapsed group and scroll",
        async ({ page }) =>
        {
            await mount(page, "RelationshipManager", { ...RM, showInlineToolbar: true,
                onCreateRelationship: act("create", "createRelationship") }, { relationships: RELATIONSHIPS });
            // A host that gives the manager a height, so its list scrolls.
            await page.addStyleTag({ content: ".rm-root { height: 260px; }" });
            const many = Array.from({ length: 12 }, (_, i) => relationship(`m${i}`, `Service ${i}`, "Depends On"));
            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/relationships",
                value: [...RELATIONSHIPS, ...many] } }]);

            await page.locator('[data-item-id="rm-sort-desc"]').click();
            await page.locator(".rm-group-header", { hasText: "Owned By" }).click();
            await searchTargets(page, "Depends On", "led");
            await expect.poll(async () => (await actions(page)).length).toBe(1);
            await answerSearch(page, [{ id: "svc-ledger", displayName: "Ledger", typeKey: "service" }]);
            await expect(page.locator(".rm-search-item")).toHaveCount(1);
            await page.locator(".rm-list").evaluate((list) => { list.scrollTop = 60; });

            // The agent drops Billing API and adds Audit Log.
            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/relationships", value: [
                ...RELATIONSHIPS.slice(1), ...many, relationship("r4", "Audit Log", "Depends On")] } }]);

            await expect(page.locator(".rm-item-name", { hasText: "Audit Log" })).toHaveCount(1);
            await expect(page.locator(".rm-item-name", { hasText: "Billing API" })).toHaveCount(0);
            await expect(page.locator(".rm-group-label")).toHaveText(
                ["Owned By (1)", "Depends On (13)", "AI Suggested (1)"]);
            await expect(page.locator(".rm-group-header", { hasText: "Owned By" }).locator(".rm-group-arrow"))
                .toHaveText("\u25b8");
            await expect(page.locator(".rm-add-step")).toHaveText("Step 2 of 3");
            await expect(page.locator(".rm-search-input")).toHaveValue("led");
            expect(await page.locator(".rm-list").evaluate((list) => list.scrollTop)).toBe(60);
            expect(await actions(page)).toHaveLength(1);

            // The Add flow is still live: picking the result creates against the definition the user chose.
            await page.locator(".rm-search-item", { hasText: "Ledger" }).click();
            await sent(page, [["find", { query: "led", typeKeys: ["service"] }],
                ["create", { targetResourceId: "svc-ledger", relationshipKey: "depends_on", properties: {} }]]);
        });

    test("Conversation: typing a message and sending it sends onSendMessage with the text", async ({ page }) =>
    {
        await mount(page, "Conversation", { ...CONV, onSendMessage: act("ask", "sendMessage") }, { session:
            chatSession(QA) });

        await page.locator(".conversation-textarea").fill("And Germany?");
        await page.locator(".conversation-send-btn").click();

        await sent(page, [["ask", "And Germany?"]]);
        await expect(page.locator(".conversation-message-user").last()).toContainText("And Germany?");
        await expect(page.locator(".conversation-textarea")).toHaveValue("");
    });

    test("Conversation: rating a reply sends onFeedback with its id, sentiment and comment", async ({ page }) =>
    {
        await mount(page, "Conversation", { ...CONV, onFeedback: act("rated", "feedback") }, { session:
            chatSession(QA) });

        await page.locator('.conversation-message[data-message-id="m2"] [aria-label="Rate as unhelpful"]').click();
        await page.locator(".conversation-feedback-textarea").fill("Say why");
        await page.locator(".conversation-feedback-submit").click();

        await sent(page, [["rated", { messageId: "m2", sentiment: "negative", comment: "Say why",
            timestamp: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) }]]);
    });

    test("Conversation: New conversation and Clear context send onNewSession and onClearSession with the session id",
        async ({ page }) =>
        {
            await mount(page, "Conversation", { ...CONV, onNewSession: act("fresh", "newSession"),
                onClearSession: act("cleared", "clearSession") }, { session: chatSession(QA) });

            await page.locator('.conversation-header-btn[aria-label="Clear context"]').click();
            await expect(page.locator(".conversation-message")).toHaveCount(0);
            await writeSession(page, [chatMessage("m5", "user", "Start again")]);
            await expect(page.locator(".conversation-message")).toHaveCount(1);
            await page.locator('.conversation-header-btn[aria-label="New conversation"]').click();

            await sent(page, [["cleared", "s1"], ["fresh", expect.stringMatching(/^session-/)]]);
            await expect(page.locator(".conversation-message")).toHaveCount(0);
        });

    test("Conversation: the agent's reply renders while the user's half-typed message, focus and scroll stay",
        async ({ page }) =>
        {
            const fetched: string[] = [];
            page.on("request", (r) => { fetched.push(r.url()); });
            // A height, so the messages scroll.
            await mount(page, "Conversation", { ...CONV, height: "320px", showTimestamps: true,
                onSendMessage: act("ask", "sendMessage") }, { session: chatSession(QA) });
            const earlier = Array.from({ length: 6 }, (_, i) => [chatMessage(`q${i}`, "user", `Question ${i}`),
                chatMessage(`a${i}`, "assistant", `Answer ${i}\n\n- one\n- two\n- three`)]).flat();
            await writeSession(page, [...earlier, ...QA]);
            await expect(page.locator('.conversation-message[data-message-id="a5"] li')).toHaveCount(3);

            await page.locator(".conversation-textarea").fill("And Germany?");
            await page.locator(".conversation-send-btn").click();
            await sent(page, [["ask", "And Germany?"]]);
            await page.locator(".conversation-textarea").fill("And Spain, while you are at it");
            const list = page.locator(".conversation-messages");
            // Scrolled up, and the list has heard it: scroll events are dispatched on the next frame.
            await list.evaluate((el) => new Promise((done) =>
            {
                el.addEventListener("scroll", done, { once: true });
                el.scrollTop = 200;
            }));
            expect(await list.evaluate((el) => el.scrollTop)).toBe(200);

            // The agent answers by writing the whole session: the user's question and its reply.
            await writeSession(page, [...earlier, ...QA, chatMessage("m3", "user", "And Germany?"),
                chatMessage("m4", "assistant", "**Berlin**.")]);

            const reply = page.locator('.conversation-message[data-message-id="m4"]');
            await expect(reply.locator(".conversation-message-content strong")).toHaveText("Berlin");
            // The agent's ISO timestamp arrived as a Date: the bubble shows its time.
            await expect(reply.locator(".conversation-message-time")).toHaveText(/^\d\d:\d\d$/);
            await expect(page.locator(".conversation-textarea")).toHaveValue("And Spain, while you are at it");
            await expect(page.locator(".conversation-textarea")).toBeFocused();
            // Every reply re-renders asynchronously; once they have, the user is back where they were.
            await expect(page.locator('.conversation-message[data-message-id="a5"] li')).toHaveCount(3);
            await expect.poll(() => list.evaluate((el) => el.scrollTop)).toBe(200);
            expect(await actions(page)).toHaveLength(1);
            expect(await errors(page)).toEqual([]);
            // The preview's renderers came from the library's own mirror, never from unpkg (B7-2).
            expect(fetched.filter((u) => u.includes("unpkg.com"))).toEqual([]);
            expect(fetched.some((u) => u.includes("/lib/vditor-3.11.2/dist/js/lute/"))).toBe(true);
        });

    test("Conversation: at the bottom, the agent's reply scrolls into view", async ({ page }) =>
    {
        await mount(page, "Conversation", { ...CONV, height: "320px" }, { session: chatSession(QA) });
        const earlier = Array.from({ length: 8 }, (_, i) => [chatMessage(`q${i}`, "user", `Question ${i}`),
            chatMessage(`a${i}`, "assistant", `Answer ${i}\n\n- one\n- two\n- three`)]).flat();
        await writeSession(page, earlier);
        const list = page.locator(".conversation-messages");
        await expect(page.locator('.conversation-message[data-message-id="a7"] li')).toHaveCount(3);
        await list.evaluate((el) => { el.scrollTop = el.scrollHeight; });
        expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight * 2)).toBe(true);

        await writeSession(page, [...earlier, chatMessage("q9", "user", "Last one?"),
            chatMessage("a9", "assistant", "Yes.\n\n- the\n- final\n- answer")]);

        await expect(page.locator('.conversation-message[data-message-id="a9"] li')).toHaveCount(3);
        await expect.poll(() => list.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight))
            .toBeLessThanOrEqual(5);
        expect(await errors(page)).toEqual([]);
    });
});
