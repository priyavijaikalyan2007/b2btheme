/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the B9 canvas components under @a2ui/lit (readiness step 2 B9,
 * ADR-236). Each sends its gestures with the payload under eventData.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** The agent writes `value` at `path`. */
const write = (page: Page, path: string, value: unknown) =>
    send(page, [{ version: V, updateDataModel: { surfaceId: "s", path, value } }]);

/** A small graph, as an agent writes it. */
const GRAPH = { nodes: [{ id: "a", label: "Alpha", type: "service" }, { id: "b", label: "Beta", type: "service" }],
    edges: [{ id: "ab", sourceId: "a", targetId: "b", type: "calls" }] };

test.describe("B9 canvas components under @a2ui/lit", () =>
{
    test("Annotation: editing the expanded note sends onChange with its state", async ({ page }) =>
    {
        await mount(page, "Annotation", { ...EV, label: "Check this", onChange: act("edit", "change") });

        await page.locator(".annotation-marker").click();
        await page.locator(".annotation-card-input").fill("Checked");

        await expect.poll(async () => (await actions(page)).at(-1)).toEqual(expect.objectContaining({ name: "edit",
            context: { p: expect.objectContaining({ label: "Checked" }) } }));
        expect(await errors(page)).toEqual([]);
    });

    test("GraphCanvas: clicking a node sends onNodeClick and onSelection", async ({ page }) =>
    {
        await mount(page, "GraphCanvas", { ...EV, nodes: { path: "/nodes" }, edges: { path: "/edges" },
            onNodeClick: act("node", "nodeClick"), onSelection: act("sel", "selection") }, GRAPH);

        await page.locator(".gc-node[data-node-id='b']").dispatchEvent("click");

        await expect.poll(async () => (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]))
            .toEqual([["sel", { nodeIds: ["b"], edgeIds: [] }], ["node", { id: "b", label: "Beta", type: "service" }]]);
        expect(await errors(page)).toEqual([]);
    });

    test("GraphCanvas: the agent's rewrite of nodes updates it in place, keeping the selection", async ({ page }) =>
    {
        await mount(page, "GraphCanvas", { nodes: { path: "/nodes" }, edges: { path: "/edges" } }, GRAPH);
        await page.locator(".gc-node[data-node-id='a']").dispatchEvent("click");

        await write(page, "/nodes", [...GRAPH.nodes, { id: "c", label: "Gamma", type: "service" }]);

        await expect(page.locator(".gc-node")).toHaveCount(3);
        await expect(page.locator(".gc-node[data-node-id='a']")).toHaveClass(/gc-node-selected/);
        expect(await errors(page)).toEqual([]);
    });
});
