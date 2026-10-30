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

/** A small roadmap, as an agent writes it. */
const SPINE = { hubs: [{ id: "now", label: "Now", status: "in-progress", branches: [{ id: "search", label: "Search" }] },
    { id: "next", label: "Next", status: "planned", branches: [] }] };

/** A one-box diagram, as the engine writes one (getDocument()). */
const DIAGRAM = {"version": "1.0", "metadata": {"title": "Untitled Diagram", "created": "2026-10-30T07:41:06.801Z", "modified": "2026-10-30T07:41:06.801Z"}, "layers": [{"id": "default", "name": "Default", "visible": true, "locked": false, "printable": true, "opacity": 1, "order": 0}], "objects": [{"id": "box", "semantic": {"type": "generic", "data": {}}, "presentation": {"shape": "rectangle", "bounds": {"x": 100, "y": 100, "width": 120, "height": 60}, "rotation": 0, "flipX": false, "flipY": false, "style": {"fill": {"type": "solid", "color": "var(--theme-surface-raised-bg)"}, "stroke": {"color": "var(--theme-border-color)", "width": 1.5}}, "layer": "default", "zIndex": 0, "locked": false, "visible": true, "renderStyle": "clean"}}], "connectors": [], "comments": [], "pageFrames": [], "guides": [], "grid": {"size": 20, "style": "dots", "visible": true}};

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

    test("SpineMap: clicking a node sends onNodeClick with it", async ({ page }) =>
    {
        await mount(page, "SpineMap", { ...EV, data: { path: "/map" }, onNodeClick: act("node", "nodeClick") },
            { map: SPINE });

        await page.locator("[data-id='search']").dispatchEvent("click");

        await expect.poll(async () => (await actions(page)).map((a) => [a.name, (a.context as { p: unknown }).p]))
            .toEqual([["node", { id: "search", label: "Search" }]]);
        expect(await errors(page)).toEqual([]);
    });

    test("SpineMap: the agent's rewrite of data updates it in place", async ({ page }) =>
    {
        await mount(page, "SpineMap", { data: { path: "/map" } }, { map: SPINE });

        await write(page, "/map", { hubs: [...SPINE.hubs, { id: "later", label: "Later", branches: [] }] });

        await expect(page.locator("[data-id='later']")).toHaveCount(1);
        expect(await errors(page)).toEqual([]);
    });

    test("DiagramEngine: the agent's document renders, and double-clicking its box sends onObjectDoubleClick",
        async ({ page }) =>
        {
            await mount(page, "DiagramEngine", { ...EV, document: { path: "/doc" },
                onObjectDoubleClick: act("open", "objectDoubleClick") }, { doc: DIAGRAM });

            await page.locator("[data-id='box']").dblclick();

            await expect.poll(async () => (await actions(page)).map((a) => [a.name,
                ((a.context as { p: { id?: string } }).p ?? {}).id])).toContainEqual(["open", "box"]);
            expect(await errors(page)).toEqual([]);
        });

    test("DiagramEngine: deleting the selected box sends onChange with the whole document", async ({ page }) =>
    {
        await mount(page, "DiagramEngine", { ...EV, document: { path: "/doc" }, onChange: act("edit", "change") },
            { doc: DIAGRAM });

        await page.locator("[data-id='box']").click();
        await page.keyboard.press("Delete");

        // The selecting click is itself reported (a move of zero marks the engine dirty); the delete comes last.
        await expect.poll(async () => (await actions(page)).filter((a) => a.name === "edit")
            .map((a) => (a.context as { p: { objects: unknown[] } }).p.objects.length).at(-1)).toBe(0);
        expect(await errors(page)).toEqual([]);
    });

    test("DiagramEngine: an embed in the agent's document is rejected", async ({ page }) =>
    {
        const embedded = structuredClone(DIAGRAM) as typeof DIAGRAM;
        (embedded.objects[0].presentation as Record<string, unknown>).embed =
            { component: "explorerpicker", options: { apiBase: "/api/v1/admin" } };
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: "DiagramEngine", document: { path: "/doc" } },
            { doc: embedded }));

        await expect.poll(() => errors(page)).toEqual([expect.objectContaining({ code: "VALIDATION_FAILED",
            path: "/doc" })]);
        await expect(page.locator(".explorerpicker")).toHaveCount(0);
    });
});
