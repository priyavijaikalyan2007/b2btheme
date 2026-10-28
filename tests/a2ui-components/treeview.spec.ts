/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: TreeView under @a2ui/lit with the test playing the agent: a selection
 * event, lazy children answered through a queue provider, server-side search
 * through a latest provider, and a provider timeout (ADR-225).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const LOAD = { onLoadChildren: { event: { name: "load", context: { node: { path: "/ev/loadChildren" } } } },
    loadChildrenResult: { path: "/answers/children" }, eventData: { path: "/ev" } };

function folder(id: string, label: string): Record<string, unknown>
{
    return { id, label, kind: "folder", children: null, lazy: true };
}

async function answer(page: Page, path: string, value: unknown): Promise<void>
{
    await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path, value } }]);
}

/** Clicks the expand toggle on node `id`'s own row. */
async function expand(page: Page, id: string): Promise<void>
{
    await page.locator(`outcrop-tree-view li[data-node-id="${id}"] > .treeview-node-row .treeview-node-toggle`).click();
}

test.describe("TreeView under @a2ui/lit", () =>
{
    test("TreeView: clicking a row sends onSelection with the selected node", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", eventData: { path: "/ev" },
            roots: [{ id: "a", label: "Alpha", kind: "item" }, { id: "b", label: "Beta", kind: "item" }],
            onSelection: { event: { name: "select", context: { nodes: { path: "/ev/selection" } } } } }));

        await page.locator("outcrop-tree-view .treeview-node-label", { hasText: "Beta" }).click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "select",
            context: { nodes: [expect.objectContaining({ id: "b" })] } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: expanding a lazy node asks the agent, and its answer renders as children", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", roots: [folder("f", "Folder")], ...LOAD }));

        await expand(page, "f");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "load",
            context: { node: expect.objectContaining({ id: "f" }) } })]);

        await answer(page, "/answers/children", [{ id: "c1", label: "Child one", kind: "item" }]);

        await expect(page.locator("outcrop-tree-view").getByText("Child one")).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: a second lazy node is asked for only after the first is answered (queue)", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView",
            roots: [folder("f1", "First"), folder("f2", "Second")], ...LOAD }));

        await expand(page, "f1");
        await expand(page, "f2");
        await expect.poll(async () => (await actions(page)).length).toBe(1);

        await answer(page, "/answers/children", [{ id: "k1", label: "Kid of first", kind: "item" }]);
        await expect.poll(() => actions(page)).toEqual([expect.anything(), expect.objectContaining({ name: "load",
            context: { node: expect.objectContaining({ id: "f2" }) } })]);

        await answer(page, "/answers/children", [{ id: "k2", label: "Kid of second", kind: "item" }]);
        await expect(page.locator("outcrop-tree-view").getByText("Kid of first")).toBeVisible();
        await expect(page.locator("outcrop-tree-view").getByText("Kid of second")).toBeVisible();
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: typing in search asks the agent, and its answer marks the match", async ({ page }) =>
    {
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "TreeView", showSearch: true, searchAsyncThreshold: 1,
            eventData: { path: "/ev" },
            roots: [{ id: "a", label: "Alpha", kind: "item" }, { id: "b", label: "Beta", kind: "item" }],
            onSearch: { event: { name: "search", context: { q: { path: "/ev/search" } } } },
            searchResult: { path: "/answers/search" } }));

        await page.locator("outcrop-tree-view .treeview-search-input").fill("Bet");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "search",
            context: { q: "Bet" } })]);

        await answer(page, "/answers/search", ["b"]);

        await expect(page.locator(`outcrop-tree-view li[data-node-id="b"] mark.treeview-match`)).toBeVisible();
        await expect(page.locator(`outcrop-tree-view li[data-node-id="a"] mark.treeview-match`)).toHaveCount(0);
        expect(await errors(page)).toEqual([]);
    });

    test("TreeView: an unanswered request times out with OUTCROP_PROVIDER_TIMEOUT", async ({ page }) =>
    {
        await open(page, "lit", { providerTimeoutMs: "300" });
        await send(page, surface("s", { id: "root", component: "TreeView", roots: [folder("f", "Folder")], ...LOAD }));

        await expand(page, "f");

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "OUTCROP_PROVIDER_TIMEOUT",
            path: "/answers/children" })]);
    });
});
