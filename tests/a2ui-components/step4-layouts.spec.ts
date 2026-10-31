/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: layouts with A2UI children (readiness step 4, ADR-238), under
 * @a2ui/lit and @a2ui/react. A layout's panels hold other A2UI components by
 * id; the agent changing the panels rebuilds the layout and keeps every
 * child's element and the layout's own state.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const CATALOG = "https://static.outcrop.us/a2ui/catalog/v1.json";

/** Opens `renderer` and sends a surface with every component in `components` (the first is the root). */
async function mount(page: Page, renderer: "lit" | "react", components: Record<string, unknown>[]): Promise<void>
{
    await open(page, renderer);
    await send(page, [
        { version: V, createSurface: { surfaceId: "s", catalogId: CATALOG } },
        { version: V, updateComponents: { surfaceId: "s", components } },
        { version: V, updateDataModel: { surfaceId: "s", path: "/", value: {} } },
    ]);
    await page.waitForFunction(() =>
        (window as unknown as { handleOf(x: string): unknown }).handleOf("outcrop-stack-layout") !== undefined);
}

/** A stack of a Text panel and a TextField panel, as an agent writes it. */
const PANELS = [{ id: "notes", title: "Notes", content: "note" }, { id: "form", title: "Form", content: "field" }];
const STACK = { id: "root", component: "StackLayout", panels: PANELS };
const CHILDREN = [{ id: "note", component: "Text", text: "Hello from a child" },
    { id: "field", component: "TextField", label: "Name", value: "" }];

/** Renders the stack, collapses Notes, adds a third panel, and checks the children and the collapse survived. */
async function addAPanelKeepingChildren(page: Page, renderer: "lit" | "react"): Promise<void>
{
    await mount(page, renderer, [STACK, ...CHILDREN]);

    const stack = page.locator(".stacklayout");
    await expect(stack.getByText("Hello from a child")).toBeVisible();
    await expect(stack.locator("a2ui-basic-textfield")).toHaveCount(1);
    await page.evaluate(() => { document.querySelector<HTMLElement>("a2ui-basic-textfield")!.dataset.kept = "yes"; });
    await stack.locator(".stacklayout-header", { hasText: "Notes" }).click();
    await expect(stack.locator(".stacklayout-panel-collapsed")).toHaveCount(1);

    await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [
        { ...STACK, panels: [...PANELS, { id: "more", title: "More", content: "extra" }] },
        { id: "extra", component: "Text", text: "A third child" }] } }]);

    await expect(stack.getByText("A third child")).toBeVisible();
    await expect(page.locator("a2ui-basic-textfield[data-kept='yes']")).toHaveCount(1);
    await expect(page.locator(".stacklayout-panel-collapsed")).toHaveCount(1);
    expect(await errors(page)).toEqual([]);
}

test.describe("Layouts with A2UI children", () =>
{
    test("StackLayout: panels render their A2UI children, and adding a panel keeps them and the collapse (Lit)",
        async ({ page }) => { await addAPanelKeepingChildren(page, "lit"); });

    test("StackLayout: panels render their A2UI children, and adding a panel keeps them and the collapse (React)",
        async ({ page }) => { await addAPanelKeepingChildren(page, "react"); });

    test("StackLayout: a child that arrives after the layout fills its panel", async ({ page }) =>
    {
        await mount(page, "lit", [STACK, CHILDREN[0]]);
        await expect(page.locator(".outcrop-child-pending")).toHaveCount(1);

        await send(page, [{ version: V, updateComponents: { surfaceId: "s", components: [CHILDREN[1]] } }]);

        await expect(page.locator(".stacklayout a2ui-basic-textfield")).toHaveCount(1);
        await expect(page.locator(".outcrop-child-pending")).toHaveCount(0);
        expect(await errors(page)).toEqual([]);
    });

    test("StackLayout: collapsing a panel sends onCollapse, and dragging a divider sends onResize", async ({ page }) =>
    {
        await mount(page, "lit", [{ ...STACK, eventData: { path: "/ev" },
            onCollapse: { event: { name: "fold", context: { p: { path: "/ev/collapse" } } } },
            onResize: { event: { name: "size", context: { p: { path: "/ev/resize" } } } } }, ...CHILDREN]);

        await page.locator(".stacklayout-header", { hasText: "Notes" }).click();
        await expect.poll(async () => (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]))
            .toEqual([["fold", { panelId: "notes", collapsed: true }]]);

        await page.locator(".stacklayout-header", { hasText: "Notes" }).click();
        const box = (await page.locator(".stacklayout-divider").boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 40, { steps: 4 });
        await page.mouse.up();

        await expect.poll(async () => (await actions(page)).filter((a) => a.name === "size").length)
            .toBeGreaterThan(0);
        const size = (await actions(page)).find((a) => a.name === "size")!;
        expect((size.context as { p: number[] }).p).toHaveLength(2);
        expect(await errors(page)).toEqual([]);
    });

    test("StackLayout: two layouts that hold each other are reported, not built forever", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, [
            { version: V, createSurface: { surfaceId: "s", catalogId: CATALOG } },
            { version: V, updateComponents: { surfaceId: "s", components: [
                { id: "root", component: "StackLayout", panels: [{ id: "a", title: "A", content: "inner" }] },
                { id: "inner", component: "StackLayout", panels: [{ id: "b", title: "B", content: "root" }] }] } },
        ]);

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            message: expect.stringMatching(/lists "root", which contains it, as a child/) })]);
        await expect(page.locator(".stacklayout")).toHaveCount(2);
    });
});
