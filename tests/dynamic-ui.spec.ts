/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the Dynamic UI demo, in a real browser.
 *
 * Written because the same failure was mis-diagnosed twice from reasoning: a
 * node that mounts correctly and renders OFF-SCREEN produces no error and no
 * log, so neither the jsdom suite nor the console can see it. Only a real
 * browser with real layout can, which is exactly what these assertions use —
 * bounding boxes, not internal state.
 *
 * Run: npx playwright test tests/dynamic-ui.spec.ts
 */

import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

const DEMO = "/demo/dynamic-ui.html";

/** Collects console output so a silent failure is still visible in the report. */
function watchConsole(page: Page): { errors: string[]; logs: string[] }
{
    const errors: string[] = [];
    const logs: string[] = [];

    page.on("console", (msg: ConsoleMessage) =>
    {
        logs.push(`${msg.type()}: ${msg.text()}`);

        if (msg.type() === "error")
        {
            errors.push(msg.text());
        }
    });

    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

    return { errors, logs };
}

/** Opens the demo and waits for the manifest fetch to finish registering. */
async function open(page: Page): Promise<void>
{
    await page.goto(DEMO);

    // The prompt buttons are built from the script table after the manifest
    // fetch resolves, so their presence is the real readiness signal.
    await expect(page.locator("#dui-prompts button").first())
        .toBeVisible({ timeout: 5000 });
}

/** Clicks a suggested prompt by its visible label. */
async function runPrompt(page: Page, label: string): Promise<void>
{
    // Scoped to the prompt bar: the transcript echoes the same text as a
    // role=button turn, so an unscoped lookup is ambiguous.
    await page.locator("#dui-prompts").getByRole("button", { name: label }).click();
    await page.waitForTimeout(250);
}

/** Asserts a frame's box lies inside the canvas's box. */
async function expectOnScreen(page: Page, index: number): Promise<void>
{
    const canvas = await page.locator("#dui-canvas").boundingBox();
    const frame = await page.locator(".dyncanvas-frame").nth(index).boundingBox();

    expect(canvas, "canvas has no box").not.toBeNull();
    expect(frame, `frame ${index} has no box — it never rendered`).not.toBeNull();

    expect(frame!.x, `frame ${index} is off the left edge`)
        .toBeGreaterThanOrEqual(canvas!.x - 1);

    expect(
        frame!.x + frame!.width,
        `frame ${index} spans x=${Math.round(frame!.x)}..`
        + `${Math.round(frame!.x + frame!.width)} but the canvas ends at `
        + `${Math.round(canvas!.x + canvas!.width)} — it is OFF-SCREEN`)
        .toBeLessThanOrEqual(canvas!.x + canvas!.width + 1);
}

test.describe("Dynamic UI demo", () =>
{
    test("loads and registers components without errors", async ({ page }) =>
    {
        const seen = watchConsole(page);

        await open(page);

        // Three suggested prompts, built from the script table.
        await expect(page.locator("#dui-prompts button")).toHaveCount(3);
        expect(seen.errors, seen.errors.join("\n")).toEqual([]);
    });

    test("prompt 1 mounts two frames, both with content", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        await expect(page.locator(".dyncanvas-frame")).toHaveCount(2);

        // A frame whose body is empty is the silent-failure signature.
        await expect(page.locator(".dyncanvas-frame").nth(0)
            .locator(".dyncanvas-body > *")).not.toHaveCount(0);
        await expect(page.locator(".dyncanvas-frame").nth(1)
            .locator(".dyncanvas-body > *")).not.toHaveCount(0);
    });

    test("prompt 2 adds a note that is VISIBLE on screen", async ({ page }) =>
    {
        const seen = watchConsole(page);

        await open(page);
        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "leave a note on the orders table");

        await expect(
            page.locator(".dyncanvas-frame"),
            `frame count wrong. Console:\n${seen.logs.join("\n")}`)
            .toHaveCount(3);

        await expectOnScreen(page, 2);

        // And it must actually contain a note.
        await expect(page.locator(".stickynote")).toHaveCount(1);
    });

    test("prompt 3 overlays an annotation ON the grid, displacing nothing",
        async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        // Capture the grid's position BEFORE annotating it.
        const gridBefore = await page.locator(".dyncanvas-frame")
            .nth(1).boundingBox();
        const framesBefore = await page.locator(".dyncanvas-frame").count();

        await runPrompt(page, "call out the orders table");

        // An annotation is NOT another widget: no new frame appears.
        await expect(page.locator(".dyncanvas-frame")).toHaveCount(framesBefore);
        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(1);

        // And it must not have moved what it annotates.
        const gridAfter = await page.locator(".dyncanvas-frame")
            .nth(1).boundingBox();

        expect(gridAfter!.x, "the grid moved when annotated")
            .toBeCloseTo(gridBefore!.x, 0);
        expect(gridAfter!.y, "the grid moved when annotated")
            .toBeCloseTo(gridBefore!.y, 0);

        // The overlay sits on top of its target.
        const overlay = await page.locator(".dyncanvas-overlay").boundingBox();

        expect(overlay!.x).toBeGreaterThanOrEqual(gridAfter!.x - 1);
        expect(overlay!.x + overlay!.width)
            .toBeLessThanOrEqual(gridAfter!.x + gridAfter!.width + 1);
    });

    test("an annotation rests as a marker and expands on click", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");
        await runPrompt(page, "call out the orders table");

        // Resting state: a marker, not a callout burying the grid.
        await expect(page.locator(".annotation-marker")).toHaveCount(1);

        // The card stays mounted and hidden — rebuilding it under the pointer
        // caused expand/collapse to oscillate — so assert the STATE, and that
        // the content is not visible yet.
        await expect(page.locator(".annotation-collapsed")).toHaveCount(1);
        await expect(page.locator(".annotation-card-input")).toBeHidden();

        await page.locator(".annotation-marker").click();

        await expect(page.locator(".annotation-expanded")).toHaveCount(1);

        // The label is editable, so it lives in the editor's value rather
        // than as page text.
        await expect(page.locator(".annotation-card-input"))
            .toHaveValue("Largest table");
    });

    test("many annotations do not rearrange the canvas", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        const before = await page.locator(".dyncanvas-frame").nth(1).boundingBox();

        for (let i = 0; i < 6; i += 1)
        {
            await runPrompt(page, "call out the orders table");
        }

        await expect(page.locator(".dyncanvas-overlay")).toHaveCount(6);

        const after = await page.locator(".dyncanvas-frame").nth(1).boundingBox();

        expect(after!.x, "six annotations moved the grid").toBeCloseTo(before!.x, 0);
        expect(after!.y, "six annotations moved the grid").toBeCloseTo(before!.y, 0);
    });

    test("selecting a table repaints the grid through the binding", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        const rows = page.locator(".datagrid-row");
        const before = await rows.count();

        // Frame titles come from the BUILT manifest labels ("Tree View"), not
        // from the demo, so locate the tree by its own markup instead.
        await page.locator(".dyncanvas-frame .treeview")
            .getByText("orders", { exact: false }).first().click();
        await page.waitForTimeout(300);

        expect(await rows.count(),
            "the grid did not repaint after selecting a table")
            .toBeGreaterThan(before);
    });

    test("pin toggles both ways", async ({ page }) =>
    {
        await open(page);
        await runPrompt(page, "show me the tables in the sales database");

        const frame = page.locator(".dyncanvas-frame").first();

        await frame.locator('[data-role="pin"]').click();
        await expect(frame).toHaveClass(/dyncanvas-frame-pinned/);

        await page.locator('.dyncanvas-frame [data-role="pin"]').first().click();
        await expect(frame).not.toHaveClass(/dyncanvas-frame-pinned/);
    });
});

/**
 * Content anchors (ADR-161), measured where they can be measured.
 *
 * The state machine around the resolver is covered in
 * `components/dynamiccanvas/dynamiccanvas-anchors.test.ts`. Position is not,
 * because jsdom reports every bounding rectangle as zero and an assertion
 * there would pass against any arithmetic at all. These tests build their own
 * canvas from the globals the demo page already loaded, so the geometry is
 * real layout.
 */
test.describe("Dynamic UI — content anchors", () =>
{
    /**
     * Builds a canvas carrying one content node and one note anchored to a
     * row inside it, with a host resolver that finds the row by its id.
     */
    async function buildAnchoredCanvas(page: Page): Promise<void>
    {
        await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, any>;
            const holder = document.createElement("div");

            holder.id = "anchor-probe";
            holder.style.cssText =
                "position:fixed;left:0;top:0;width:900px;height:600px;"
                + "background:#fff;z-index:9999;";
            document.body.appendChild(holder);

            const canvas = w.createDynamicCanvas("anchor-probe", {
                onResolveAnchor: (anchor: { entityId?: string }) =>
                    document.querySelector(
                        `#anchor-probe [data-row-id="${anchor.entityId}"]`),
            });

            w.__probe = canvas;

            const node = (id: string, component: string, anchor: unknown) => ({
                id, component,
                placement: { kind: "intent", region: "main", size: "wide" },
                options: component === "stickynote"
                    ? { text: "content host" }
                    : { label: "Check this row" },
                source: null, state: {}, anchor,
                provenance: { turnId: "t1", lastTouched: 1 },
                pinned: false, grants: [],
            });

            canvas.apply({
                turnId: "t1", revision: 1,
                ops: [
                    { op: "addNode", node: node("host", "stickynote",
                        { kind: "canvas" }) },
                    { op: "addNode", node: node("note", "annotation",
                        { kind: "entity", entityId: "r-2" }) },
                ],
            });

            // Rows the host application would have rendered itself. The tall
            // list is what makes the region scroll, so a mark can leave it.
            const body = holder.querySelector(
                "[data-node-id='host'] .dyncanvas-body") as HTMLElement;
            const list = document.createElement("div");

            list.className = "probe-list";
            list.style.cssText = "height:120px;overflow-y:auto;";

            for (let i = 0; i < 40; i++)
            {
                const row = document.createElement("div");

                row.setAttribute("data-row-id", `r-${i}`);
                row.style.cssText = "height:24px;";
                row.textContent = `row ${i}`;
                list.appendChild(row);
            }

            body.appendChild(list);

            // Re-render so the resolver runs now that the rows exist.
            canvas.apply({ turnId: "t2", revision: 2, ops: [] });
        });
    }

    test("a note lands on the row the host resolved, not on the frame corner",
        async ({ page }) =>
    {
        await open(page);
        await buildAnchoredCanvas(page);

        const note = page.locator("#anchor-probe .dyncanvas-overlay");
        const row = page.locator('#anchor-probe [data-row-id="r-2"]');

        await expect(note).toHaveCount(1);
        await expect(note).not.toHaveClass(/dyncanvas-overlay-orphaned/);

        const noteBox = (await note.boundingBox())!;
        const rowBox = (await row.boundingBox())!;

        // The mark is centred on the row it marks. Half a marker of slack in
        // each direction, which is the same correction the spot path applies.
        const noteCx = noteBox.x + noteBox.width / 2;
        const noteCy = noteBox.y + noteBox.height / 2;

        expect(Math.abs(noteCy - (rowBox.y + rowBox.height / 2)),
            "the note is not on the row vertically").toBeLessThan(20);
        expect(Math.abs(noteCx - (rowBox.x + rowBox.width / 2)),
            "the note is not on the row horizontally").toBeLessThan(20);

        // And it is NOT merely sitting at the content frame's origin, which is
        // what a broken resolve path would look like.
        const frameBox = (await page
            .locator("#anchor-probe [data-node-id='host']").boundingBox())!;

        expect(Math.abs(noteCy - frameBox.y),
            "the note sits at the frame corner, so nothing was resolved")
            .toBeGreaterThan(20);
    });

    test("the note follows its row when the list scrolls, and hides when the "
        + "row leaves the list", async ({ page }) =>
    {
        await open(page);
        await buildAnchoredCanvas(page);

        const note = page.locator("#anchor-probe .dyncanvas-overlay");
        const before = (await note.boundingBox())!;

        await page.evaluate(() =>
        {
            const list = document.querySelector(
                "#anchor-probe .probe-list") as HTMLElement;

            list.scrollTop = 40;
            list.dispatchEvent(new Event("scroll", { bubbles: true }));
        });

        const after = (await note.boundingBox())!;

        expect(after.y, "the note did not follow the scrolled row")
            .toBeLessThan(before.y - 10);

        // Scrolled far enough and the row leaves the visible list. The note
        // is hidden, which is not the same state as orphaned: the content is
        // there, it is off screen.
        await page.evaluate(() =>
        {
            const list = document.querySelector(
                "#anchor-probe .probe-list") as HTMLElement;

            list.scrollTop = list.scrollHeight;
            list.dispatchEvent(new Event("scroll", { bubbles: true }));
        });

        await expect(note).toHaveClass(/dyncanvas-overlay-hidden/);
        await expect(note).not.toHaveClass(/dyncanvas-overlay-orphaned/);
    });

    test("deleting the content orphans the note and keeps it on the canvas",
        async ({ page }) =>
    {
        await open(page);
        await buildAnchoredCanvas(page);

        const note = page.locator("#anchor-probe .dyncanvas-overlay");

        await expect(note).not.toHaveClass(/dyncanvas-overlay-orphaned/);

        const kept = await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, any>;

            document.querySelector(
                '#anchor-probe [data-row-id="r-2"]')!.remove();
            w.__probe.apply({ turnId: "t3", revision: 3, ops: [] });

            return Boolean(w.__probe.getDocument().nodes.note);
        });

        // The decision this implements: a comment is not lost because the
        // data it discussed was deleted.
        expect(kept, "the note was removed from the document").toBe(true);
        await expect(note).toHaveClass(/dyncanvas-overlay-orphaned/);
        await expect(note).toBeVisible();
        await expect(note).not.toHaveClass(/dyncanvas-overlay-hidden/);

        // The glyph must actually draw. A class-only assertion cannot tell a
        // mapped icon from a misspelt class or a missing icon stylesheet,
        // which would leave the state carried by colour alone.
        const glyph = await page.evaluate(() =>
        {
            const i = document.querySelector(
                "#anchor-probe .dyncanvas-orphan-glyph") as HTMLElement;

            return {
                present: Boolean(i),
                content: i
                    ? getComputedStyle(i, "::before").content
                    : "none",
            };
        });

        expect(glyph.present, "no orphan glyph was rendered").toBe(true);
        expect(glyph.content, "the glyph class maps to no icon")
            .not.toBe("none");
    });
});

/**
 * Named scrolling regions (ADR-162, DEBT-DUI-5), in a real browser.
 *
 * This is the suite that can run the defect at all. The index DEBT-DUI-5
 * describes moves because `isScrollable()` requires an element to be
 * overflowing at the time of the test, and whether an element overflows is a
 * question about layout. jsdom reports every dimension as zero, so there the
 * region list is always empty and the bug is unreachable.
 */
test.describe("Dynamic UI — named scrolling regions", () =>
{
    /**
     * Builds a canvas whose content node has TWO scrolling regions, the first
     * of which can be made to stop overflowing on demand. A note is placed in
     * the second region.
     *
     * @param page   - The page.
     * @param named  - Whether the regions declare `data-dui-region`.
     */
    async function buildTwoRegions(page: Page, named: boolean): Promise<void>
    {
        await page.evaluate((useNames) =>
        {
            const w = window as unknown as Record<string, any>;
            const holder = document.createElement("div");

            holder.id = "region-probe";
            holder.style.cssText =
                "position:fixed;left:0;top:0;width:900px;height:700px;"
                + "background:#fff;z-index:9999;";
            document.body.appendChild(holder);

            const canvas = w.createDynamicCanvas("region-probe", {});

            w.__regionProbe = canvas;

            canvas.apply({
                turnId: "t1", revision: 1,
                ops: [{
                    op: "addNode",
                    node: {
                        id: "host", component: "stickynote",
                        placement: { kind: "intent", region: "main", size: "wide" },
                        options: { text: "two regions" },
                        source: null, state: {},
                        anchor: { kind: "canvas" },
                        provenance: { turnId: "t1", lastTouched: 1 },
                        pinned: false, grants: [],
                    },
                }],
            });

            const body = holder.querySelector(
                "[data-node-id='host'] .dyncanvas-body") as HTMLElement;

            // The probe's regions stand in for content the HOST renders, so
            // the component's own markup goes. Without this the regions are
            // pushed past the body's visible height, where they are not
            // hit-testable and a click lands on bare canvas instead.
            body.innerHTML = "";

            // Region A comes first in DOM order, so it owns index 1 while it
            // overflows. Region B is the one the note is placed in.
            for (const [key, rows] of [["a", 30], ["b", 30]] as const)
            {
                const region = document.createElement("div");

                region.id = `region-${key}`;
                region.style.cssText = "height:60px;overflow-y:auto;";

                if (useNames)
                {
                    region.setAttribute("data-dui-region", `probe:${key}`);
                }

                for (let i = 0; i < rows; i++)
                {
                    const row = document.createElement("div");

                    row.style.cssText = "height:24px;";
                    row.textContent = `${key} row ${i}`;
                    region.appendChild(row);
                }

                body.appendChild(region);
            }
        }, named);
    }

    /** Places a note by clicking inside region B. */
    async function placeInRegionB(page: Page): Promise<void>
    {
        await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, any>;

            w.__regionProbe.startPlacement({ options: { label: "in B" } });
        });

        const b = page.locator("#region-b");
        const box = (await b.boundingBox())!;

        await page.mouse.click(box.x + box.width / 2, box.y + 20);
    }

    test("a click in a named region records the name, not just the index",
        async ({ page }) =>
    {
        await open(page);
        await buildTwoRegions(page, true);
        await placeInRegionB(page);

        const anchor = await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, any>;
            const nodes = w.__regionProbe.getDocument().nodes;
            const note = Object.values(nodes).find((n: any) => n.id !== "host");

            return (note as any).anchor;
        });

        expect(anchor.region, "the region name was not captured")
            .toBe("probe:b");

        // The index is kept beside it as the fallback for a renamed region.
        expect(anchor.within, "the index fallback was dropped")
            .toBeGreaterThan(0);
        expect(anchor.spot).toBeTruthy();
    });

    test("the note stays in its own region when an earlier region stops "
        + "overflowing", async ({ page }) =>
    {
        await open(page);
        await buildTwoRegions(page, true);
        await placeInRegionB(page);

        const note = page.locator("#region-probe .dyncanvas-overlay");
        const before = (await note.boundingBox())!;
        const bBox = (await page.locator("#region-b").boundingBox())!;

        // The note starts inside region B.
        expect(before.y + before.height / 2).toBeGreaterThan(bBox.y - 1);
        expect(before.y + before.height / 2).toBeLessThan(bBox.y + bBox.height + 1);

        // THE DEFECT: region A stops overflowing, so it leaves the scrollable
        // list and every later index shifts down by one. An index-anchored
        // note silently re-anchors to a different region. Nothing about the
        // note changed, and nothing about region B changed.
        await page.evaluate(() =>
        {
            const a = document.querySelector("#region-a") as HTMLElement;

            while (a.children.length > 1)
            {
                a.lastElementChild!.remove();
            }

            const w = window as unknown as Record<string, any>;

            w.__regionProbe.apply({ turnId: "t2", revision: 2, ops: [] });
        });

        const after = (await note.boundingBox())!;
        const bAfter = (await page.locator("#region-b").boundingBox())!;
        const centre = after.y + after.height / 2;

        expect(centre, "the note left its region when a sibling stopped "
            + "overflowing — this is DEBT-DUI-5")
            .toBeGreaterThan(bAfter.y - 1);
        expect(centre).toBeLessThan(bAfter.y + bAfter.height + 1);
    });

    test("WITHOUT a name the same note leaves its region — the defect, "
        + "characterised", async ({ page }) =>
    {
        // The counterpart to the test above, and what makes it mean
        // something. Identical scenario, regions NOT named: the index the
        // anchor recorded now points at a different region, so the note moves
        // without anybody touching it. If this test ever passes by the note
        // staying put, the test above has stopped proving anything.
        await open(page);
        await buildTwoRegions(page, false);
        await placeInRegionB(page);

        const note = page.locator("#region-probe .dyncanvas-overlay");
        const before = (await note.boundingBox())!;

        await page.evaluate(() =>
        {
            const a = document.querySelector("#region-a") as HTMLElement;

            while (a.children.length > 1)
            {
                a.lastElementChild!.remove();
            }

            const w = window as unknown as Record<string, any>;

            w.__regionProbe.apply({ turnId: "t2", revision: 2, ops: [] });
        });

        const after = (await note.boundingBox())!;
        const bAfter = (await page.locator("#region-b").boundingBox())!;
        const centre = after.y + after.height / 2;
        const inB = centre > bAfter.y - 1
            && centre < bAfter.y + bAfter.height + 1;

        expect(inB || Math.abs(after.y - before.y) > 1,
            "an index-anchored note neither moved nor stayed — the probe is "
            + "not exercising the index path at all").toBe(true);
        expect(inB, "an INDEX-anchored note stayed in its region, so the "
            + "named-region test above proves nothing").toBe(false);
    });

    test("an unnamed region still resolves by index, unchanged",
        async ({ page }) =>
    {
        // Approach B is additive: a component that has not declared its
        // regions behaves exactly as it did before, including the fragility.
        await open(page);
        await buildTwoRegions(page, false);
        await placeInRegionB(page);

        const anchor = await page.evaluate(() =>
        {
            const w = window as unknown as Record<string, any>;
            const nodes = w.__regionProbe.getDocument().nodes;
            const note = Object.values(nodes).find((n: any) => n.id !== "host");

            return (note as any).anchor;
        });

        expect(anchor.region).toBeUndefined();
        expect(anchor.within).toBeGreaterThan(0);
    });
});
