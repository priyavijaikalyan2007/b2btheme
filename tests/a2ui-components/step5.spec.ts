/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the components readiness step 5 gives a manifest (specs/agentui-step5.prd.md),
 * under @a2ui/lit. S5-1: TypeBadge (ADR-243). S5-2: StatusBar and Sidebar (ADR-244). S5-3: Toolbar and
 * GraphToolbar (ADR-245). S5-4: the dialogs, contained (ADR-246).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with `props`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>): Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, {}));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/**
 * Mounts a tree of components (the first is the root) over `data`, and waits for the handle of `waitFor`, the root by
 * default.
 */
async function mountTree(page: Page, components: Record<string, unknown>[],
    waitFor = String(components[0].component), data: Record<string, unknown> = {}): Promise<void>
{
    await open(page, "lit");
    await send(page, [
        { version: V, createSurface: { surfaceId: "s", catalogId: "https://static.outcrop.us/a2ui/catalog/v1.json" } },
        { version: V, updateComponents: { surfaceId: "s", components } },
        { version: V, updateDataModel: { surfaceId: "s", path: "/", value: data } },
    ]);
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(waitFor));
}

/** The actions sent so far, as [name, context.p]. */
async function sent(page: Page): Promise<unknown[][]>
{
    return (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]);
}

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

test.describe("Step 5 components under @a2ui/lit", () =>
{
    test("TypeBadge: renders its type, and clicking a clickable badge sends onClick with its typeKey",
        async ({ page }) =>
        {
            await mount(page, "TypeBadge", { ...EV, typeKey: "strategy.okr", icon: "crosshair", clickable: true,
                onClick: act("type", "click") });

            const badge = page.getByRole("button", { name: "Type: okr" });
            await expect(badge).toBeVisible();
            await badge.press("Enter");

            await expect.poll(() => actions(page)).toEqual([
                expect.objectContaining({ name: "type", context: { p: { typeKey: "strategy.okr" } } })]);
            expect(await errors(page)).toEqual([]);
        });

    test("StatusBar: renders its regions inside the surface, not pinned to the viewport", async ({ page }) =>
    {
        await mount(page, "StatusBar", { regions: [{ id: "ln", label: "Ln", value: "12" },
            { id: "enc", value: "UTF-8" }] });

        const bar = page.locator(".statusbar");
        await expect(bar).toContainText("Ln");
        await expect(bar).toContainText("UTF-8");
        expect(await bar.evaluate((el) => getComputedStyle(el).position)).not.toBe("fixed");
        expect(await bar.evaluate((el) => el.closest("outcrop-status-bar") !== null)).toBe(true);
        expect(await errors(page)).toEqual([]);
    });

    test("Sidebar: holds its A2UI child, resizing sends onResize, collapsing sends onCollapse, width updates in place",
        async ({ page }) =>
        {
            const SIDEBAR = { id: "root", component: "Sidebar", title: "Filters", width: 280, content: "note", ...EV,
                onResize: act("size", "resize"), onCollapse: act("fold", "collapse") };
            await mountTree(page, [SIDEBAR, { id: "note", component: "Text", text: "A sidebar child" }]);

            const sidebar = page.locator(".sidebar-container");
            await expect(sidebar).toHaveClass(/sidebar-contained/);
            await expect(sidebar.getByText("A sidebar child")).toBeVisible();
            await expect(sidebar.locator(".sidebar-close-btn:visible")).toHaveCount(0);

            await sidebar.locator(".sidebar-resize-handle-h").focus();
            await page.keyboard.press("ArrowRight");
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "size").length).toBe(1);

            await sidebar.locator(".sidebar-collapse-btn").click();
            await expect.poll(async () => (await sent(page)).filter(([n]) => n === "fold"))
                .toEqual([["fold", { collapsed: true }]]);

            // width is state, so an agent's change applies in place: the same root and child stay.
            await page.evaluate(() =>
            {
                document.querySelector<HTMLElement>(".sidebar-container")!.dataset.kept = "yes";
            });
            await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
                { ...SIDEBAR, width: 360, collapsed: false }] } }]);

            await expect(page.locator(".sidebar-container[data-kept='yes']")).toHaveCount(1);
            await expect(page.locator(".sidebar-container").getByText("A sidebar child")).toBeVisible();
            expect(await errors(page)).toEqual([]);
        });

    test("Toolbar: a tool click and a field change send onToolClick, it holds its A2UI child, and Alt is the page's",
        async ({ page }) =>
        {
            const TOOLBAR = { id: "root", component: "Toolbar", label: "Editor tools", rightContent: "note", ...EV,
                onToolClick: act("tool", "toolClick"), regions: [{ id: "fmt", items: [
                    { id: "bold", tooltip: "Bold", icon: "bi-type-bold", toggle: true, keyTip: "B" },
                    { type: "dropdown", id: "size", tooltip: "Size",
                        options: [{ value: "12", label: "12" }, { value: "14", label: "14" }] }] }] };
            await mountTree(page, [TOOLBAR, { id: "note", component: "Text", text: "A toolbar child" }]);

            const bar = page.locator(".toolbar");
            await expect(bar.first()).toBeVisible();
            await expect(page.getByText("A toolbar child")).toBeVisible();

            await page.locator("[data-tool-id='bold']").click();
            await page.locator("select.toolbar-dropdown").selectOption("14");
            await expect.poll(() => sent(page)).toEqual([["tool", { toolId: "bold", value: true }],
                ["tool", { toolId: "size", value: "14" }]]);

            // keyTips is off over A2UI, so Alt pressed on the page shows no badges.
            await page.locator("body").press("Alt");
            await expect(page.locator(".toolbar-keytips-active")).toHaveCount(0);
            expect(await errors(page)).toEqual([]);
        });

    test("GraphToolbar: clicking a tool sends onToolClick with its id",
        async ({ page }) =>
        {
            await mount(page, "GraphToolbar", { ...EV, onToolClick: act("tool", "toolClick") });

            await page.locator("[data-tool-id='gt-zoom-in']").click();
            await expect.poll(() => sent(page)).toEqual([["tool", { toolId: "gt-zoom-in", value: null }]]);

            expect(await errors(page)).toEqual([]);
        });

    test("ConfirmDialog: renders contained beside a sibling, and confirming sends onConfirm", async ({ page }) =>
    {
        await mountTree(page, [{ id: "root", component: "Column", children: ["ask", "field"] },
            { id: "ask", component: "ConfirmDialog", ...EV, message: "Delete 3 files?", variant: "danger",
                onConfirm: act("yes", "confirm"), onCancel: act("no", "cancel") },
            { id: "field", component: "TextField", label: "Name", value: "" }], "ConfirmDialog");
        await expectContained(page, ".confirmdialog-backdrop", "outcrop-confirm-dialog");

        await page.getByRole("button", { name: "Confirm" }).click();
        await expect.poll(() => sent(page)).toEqual([["yes", {}]]);
        await expect(page.locator(".confirmdialog")).toHaveCount(0);
        expect(await errors(page)).toEqual([]);
    });

    test("ErrorDialog: renders contained, opens its technical details, and Retry then Close send their actions",
        async ({ page }) =>
        {
            await mountTree(page, [{ id: "root", component: "Column", children: ["err", "field"] },
                { id: "err", component: "ErrorDialog", ...EV, title: "Sync failed", message: "The doc could not sync.",
                    technicalDetail: "HTTP 503 from /sync", showRetry: true,
                    onRetry: act("retry", "retry"), onClose: act("closed", "close") },
                { id: "field", component: "TextField", label: "Name", value: "" }], "ErrorDialog");
            await expectContained(page, ".modal.errordialog-contained", "outcrop-error-dialog");

            // Bootstrap's Collapse, loaded as the manifest's library, opens the details.
            await page.locator(".accordion-button").click();
            await expect(page.getByText("HTTP 503 from /sync")).toBeVisible();

            await page.getByRole("button", { name: "Retry" }).click();
            await page.locator(".modal-footer").getByRole("button", { name: "Close" }).click();
            await expect.poll(() => sent(page)).toEqual([["retry", {}], ["closed", {}]]);
            await expect(page.locator(".errordialog-contained")).toHaveCount(0);
            expect(await errors(page)).toEqual([]);
        });

    test("ShareDialog: renders contained, and removing a person then Done sends onShare with the diff",
        async ({ page }) =>
        {
            await mountTree(page, [{ id: "root", component: "Column", children: ["share", "field"] },
                { id: "share", component: "ShareDialog", ...EV, title: "Share Plan",
                    accessLevels: [{ id: "viewer", label: "Viewer" }, { id: "editor", label: "Editor" }],
                    existingAccess: [{ person: { id: "u1", name: "Alice Ng" }, accessLevelId: "editor" }],
                    onShare: act("shared", "share"), onCancel: act("no", "cancel") },
                { id: "field", component: "TextField", label: "Name", value: "" }], "ShareDialog");
            await expectContained(page, ".sharedialog-overlay.sharedialog-contained", "outcrop-share-dialog");

            await page.locator(".sharedialog-access-remove").click();
            await page.getByRole("button", { name: "Done" }).click();
            await expect.poll(() => sent(page)).toEqual([["shared", { added: [], changed: [], removed: ["u1"] }]]);
            await expect(page.locator(".sharedialog-contained")).toHaveCount(0);
            expect(await errors(page)).toEqual([]);
        });

    test("FormDialog: renders contained, and filling and submitting sends onSubmit with the values",
        async ({ page }) =>
        {
            await mountTree(page, [{ id: "root", component: "Column", children: ["form", "field"] },
                { id: "form", component: "FormDialog", ...EV, title: "Invite",
                    fields: [{ name: "email", label: "Email", type: "email", required: true },
                        { name: "role", label: "Role", type: "select", value: "viewer",
                            options: [{ value: "viewer", label: "Viewer" }, { value: "editor", label: "Editor" }] }],
                    onSubmit: act("invite", "submit"), onCancel: act("no", "cancel") },
                { id: "field", component: "TextField", label: "Name", value: "" }], "FormDialog");
            await expectContained(page, ".formdialog-overlay.formdialog-contained", "outcrop-form-dialog");

            const form = page.locator(".formdialog-contained");
            await form.locator("[name='email']").fill("dana@example.com");
            await form.locator("[name='role']").selectOption("editor");
            await form.getByRole("button", { name: "Submit" }).click();
            await expect.poll(() => sent(page)).toEqual([["invite",
                { values: { email: "dana@example.com", role: "editor" } }]]);
            await expect(page.locator(".formdialog-contained")).toHaveCount(0);
            expect(await errors(page)).toEqual([]);
        });

    test("ProgressModal: renders contained, follows the agent's progress, and Cancel sends onCancel",
        async ({ page }) =>
        {
            await mountTree(page, [{ id: "root", component: "Column", children: ["work", "field"] },
                { id: "work", component: "ProgressModal", ...EV, title: "Importing", totalSteps: 3, showCancel: true,
                    progress: { path: "/progress" }, onCancel: act("stop", "cancel") },
                { id: "field", component: "TextField", label: "Name", value: "" }], "ProgressModal",
            { progress: { status: "Starting" } });
            await expectContained(page, ".progressmodal.progressmodal-contained", "outcrop-progress-modal");

            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/progress",
                value: { status: "Reading rows", fraction: 0.5, step: 2, log: [{ message: "Opened file" }] } } }]);
            const modal = page.locator(".progressmodal-contained");
            await expect(modal.locator(".progressmodal-status")).toHaveText("Reading rows");
            await expect(modal.locator(".progressmodal-current-step")).toHaveText("2");
            await expect(modal.getByText("Opened file")).toBeVisible();

            await modal.getByRole("button", { name: "Cancel" }).click();
            await expect.poll(() => sent(page)).toEqual([["stop", {}]]);
            expect(await errors(page)).toEqual([]);
        });
});

/**
 * Asserts a dialog root sits in its surface element, dims nothing, and leaves
 * the sibling TextField usable (ADR-246).
 */
async function expectContained(page: Page, root: string, tag: string): Promise<void>
{
    const el = page.locator(root);
    await expect(el).toBeVisible();
    expect(await el.evaluate((e, t) => e.closest(t) !== null, tag)).toBe(true);
    expect(await el.evaluate((e) => getComputedStyle(e).position)).not.toBe("fixed");
    expect(await page.evaluate(() => document.querySelectorAll("body > .modal-backdrop, body.modal-open").length))
        .toBe(0);

    const field = page.locator("a2ui-basic-textfield input");
    await field.fill("still usable");
    await expect(field).toHaveValue("still usable");
}
