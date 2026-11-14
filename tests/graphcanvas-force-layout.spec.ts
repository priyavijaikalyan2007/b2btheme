/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: GraphCanvas force layout (apps#249). In a real browser, every
 *    node of a 40-node tree is the element under the centre of its own box,
 *    on every random start, so a person can click each one. A node off the
 *    screen reports "under undefined".
 */

import { test, expect } from "@playwright/test";

test("GraphCanvas force layout leaves every node clickable", async ({ page }) =>
{
    await page.goto("/demo/components/graphcanvas.html");

    const hidden = await page.evaluate(() =>
    {
        type Canvas = { zoomToFit(): void; destroy(): void };
        const create = (window as unknown as { createGraphCanvas(o: object): Canvas }).createGraphCanvas;
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:9999;background:#fff";
        document.body.appendChild(host);

        const nodes = Array.from({ length: 40 }, (_, i) => ({ id: `c${i}`, label: `C${i}`, type: "entity" }));
        // A tree with three children a parent, the shape of an ontology instance view.
        const edges = nodes.slice(1).map((n, i) =>
            ({ id: `e${i}`, sourceId: `c${Math.floor(i / 3)}`, targetId: n.id, type: "has" }));
        const out: string[] = [];

        for (let run = 0; run < 10; run++)
        {
            const gc = create({ container: host, nodes, edges, layout: "force" });
            gc.zoomToFit();

            for (const g of host.querySelectorAll<SVGGElement>(".gc-node"))
            {
                const r = g.querySelector("rect")!.getBoundingClientRect();
                const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(".gc-node");

                if (top !== g) { out.push(`run ${run}: ${g.dataset.nodeId} under ${top?.getAttribute("data-node-id")}`); }
            }
            gc.destroy();
        }
        return out;
    });

    expect(hidden).toEqual([]);
});
