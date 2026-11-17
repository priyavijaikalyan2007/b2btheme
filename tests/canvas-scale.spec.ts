/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: how DiagramEngine and GraphCanvas behave at 1,000, 5,000 and
 *    10,000 nodes (#176, step 1). This is a measurement, not a gate. It
 *    asserts nothing and runs only under `npm run bench:canvas`.
 *
 * WHAT IS MEASURED
 * ----------------
 * Each scene is a grid of nodes, one row per level. Each node has an edge
 * from the node above it and, in every second column, one from the node
 * above and to the left. Both canvases get the same grid. GraphCanvas
 * spreads a short last row across the full width.
 *
 * - Build: from the create call to the first painted frame.
 * - Pan at the widest zoom: the whole scene, or as much as zoom 0.1 shows.
 * - Pan at zoom 1, centered on one node: a few dozen nodes on screen and
 *   the rest off it. If only the first pan is slow, the fix is drawing less
 *   detail when zoomed out. If both are slow, the fix is skipping what is
 *   off the screen.
 * - `Ctrl` + wheel zoom, and dragging one node.
 *
 * Input is real: `page.mouse` sends both pointer and mouse events. After
 * each step the test waits for two frames. A recorder logs the time of
 * every frame and every input event. A step costs the longest gap between
 * frames from its input to the next one.
 *
 * Headless Chromium draws in software, so the numbers are worse than on a
 * real screen. Compare canvas with canvas and size with size.
 *
 * GraphCanvas lays out from the size of its host and has no resize
 * observer. So the host starts as large as the grid, which makes the
 * hierarchical layout put the nodes on the grid. Then the host shrinks to
 * the window. Its force layout compares every pair of nodes, so it is timed
 * only at 1,000 nodes.
 */

import fs from "node:fs";
import path from "node:path";

import { test, type Page } from "@playwright/test";

const SIZES = [1000, 5000, 10000];
const GAP_X = 200;
const GAP_Y = 100;
const NODE_W = 160;
const NODE_H = 48;
const STEPS = 30;
const WHEEL_STEPS = 20;
const OUT = "coverage/canvas-scale";
const PAGE = "/__canvas-bench.html";

const BENCH_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Canvas bench</title>
<link rel="stylesheet" href="/css/custom.css">
<link rel="stylesheet" href="/icons/bootstrap-icons.css">
<link rel="stylesheet" href="/components/graphcanvas/graphcanvas.css">
<link rel="stylesheet" href="/components/diagramengine/diagramengine.css">
<style>html, body { margin: 0; overflow: hidden; }
#host { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; }</style>
</head><body><div id="host"></div>
<script src="/components/graphcanvas/graphcanvas.js"></script>
<script src="/components/gesturerecognizer/gesturerecognizer.js"></script>
<script src="/components/diagramengine/diagramengine.js"></script>
</body></html>`;

type Canvas = "GraphCanvas" | "DiagramEngine";

/** The cost of each step in milliseconds, summarized. */
interface Frames { p50: number; p95: number; max: number; over50: number; steps: number }

interface Result
{
    canvas: Canvas;
    nodes: number;
    edges: number;
    elements: number;
    buildMs: number;
    /** Time spent in the layout or document load, inside build. */
    loadMs: number;
    idle: Frames;
    panFit: Frames;
    panOne: Frames;
    zoom: Frames;
    drag: Frames;
    /** GraphCanvas force layout at this size, when timed. */
    forceMs?: number;
    /** DiagramEngine: one addObject or addConnector call per item, when timed. */
    addLoopMs?: number;
    viewFit: View;
    viewOne: View;
}

interface View { zoom: number; onScreen: number }

/** The grid: `cols` nodes a row, and the edges between rows. */
function scene(n: number): { cols: number; rows: number; edges: Array<[number, number]> }
{
    const cols = Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const edges: Array<[number, number]> = [];

    for (let i = cols; i < n; i++)
    {
        edges.push([i - cols, i]);

        if (i % cols % 2 === 1) { edges.push([i - cols - 1, i]); }
    }

    return { cols, rows, edges };
}

async function openBench(page: Page): Promise<void>
{
    await page.route(`**${PAGE}`, (route) => route.fulfill({ contentType: "text/html", body: BENCH_HTML }));
    // Debug logging is on by default on localhost. Production hosts are not
    // localhost, so the bench turns it off to measure what users get.
    await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__ebt_debug_logging = false; });
    await page.goto(PAGE);
    await page.waitForFunction(() => typeof (window as unknown as Record<string, unknown>).createDiagramEngine === "function"
        && typeof (window as unknown as Record<string, unknown>).createGraphCanvas === "function");
}

/** Starts the frame recorder, and logs the time of each input event. */
async function startFrames(page: Page): Promise<void>
{
    await page.evaluate(() =>
    {
        const w = window as unknown as { __frames: number[]; __inputs: number[]; __recording: boolean;
            __onInput: (e: Event) => void };
        w.__frames = [];
        w.__inputs = [];
        w.__recording = true;
        w.__onInput = (e: Event): void => { w.__inputs.push(e.timeStamp); };

        for (const type of ["pointerdown", "pointermove", "pointerup", "wheel"])
        {
            window.addEventListener(type, w.__onInput, { capture: true });
        }

        const tick = (t: number): void =>
        {
            if (!w.__recording) { return; }
            w.__frames.push(t);
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    });
}

/** Waits for two frames, so the work of the last step has been painted. */
async function settle(page: Page): Promise<void>
{
    await page.evaluate(() => new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

/**
 * The cost of each step: the longest gap between two frames from its input
 * to the next input. A step that costs nothing reads 16.7 ms, one frame.
 * With no input, each gap is its own step.
 */
async function stopFrames(page: Page): Promise<Frames>
{
    await settle(page);
    const { frames, inputs } = await page.evaluate(() =>
    {
        const w = window as unknown as { __frames: number[]; __inputs: number[]; __recording: boolean;
            __onInput: (e: Event) => void };
        w.__recording = false;

        for (const type of ["pointerdown", "pointermove", "pointerup", "wheel"])
        {
            window.removeEventListener(type, w.__onInput, { capture: true });
        }

        return { frames: w.__frames, inputs: w.__inputs };
    });
    const gaps = frames.slice(1).map((end, i) => ({ start: frames[i], end, ms: end - frames[i] }));
    const steps = inputs.length === 0
        ? gaps.map((g) => g.ms)
        : inputs.map((t, i) =>
        {
            const next = inputs[i + 1] ?? Infinity;
            return Math.max(0, ...gaps.filter((g) => g.end > t && g.start < next).map((g) => g.ms));
        });
    const sorted = [...steps].sort((a, b) => a - b);
    const at = (q: number): number => sorted.length === 0 ? 0 : sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

    return { p50: round(at(0.5)), p95: round(at(0.95)), max: round(sorted[sorted.length - 1] ?? 0),
        over50: steps.filter((ms) => ms > 50).length, steps: steps.length };
}

function round(ms: number): number
{
    return Math.round(ms * 10) / 10;
}

/**
 * One step per frame: move, then wait for two frames. `track` must move by
 * (dx, dy). `other` must move with it for a pan and stay put for a drag,
 * because a pan that started on a node is a drag, and both move `track`.
 * Both are found again after the gesture, since GraphCanvas redraws its
 * nodes during a drag.
 */
async function gesture(page: Page, kind: "pan" | "drag", from: { x: number; y: number }, dx: number, dy: number,
    button: "left" | "middle", track: string, other: string): Promise<Frames>
{
    const before = [await rectOf(page, track), await rectOf(page, other)];

    await page.mouse.move(from.x, from.y);
    await startFrames(page);
    await page.mouse.down({ button });

    for (let i = 1; i <= STEPS; i++)
    {
        await page.mouse.move(from.x + (dx * i) / STEPS, from.y + (dy * i) / STEPS);
        await settle(page);
    }

    await page.mouse.up({ button });
    const frames = await stopFrames(page);
    const after = [await rectOf(page, track), await rectOf(page, other)];
    const expected = [{ x: dx, y: dy }, kind === "pan" ? { x: dx, y: dy } : { x: 0, y: 0 }];

    [track, other].forEach((sel, i) =>
    {
        const moved = { x: after[i].x - before[i].x, y: after[i].y - before[i].y };

        if (Math.abs(moved.x - expected[i].x) > 2 || Math.abs(moved.y - expected[i].y) > 2)
        {
            throw new Error(`A ${kind} moved ${sel} by (${round(moved.x)}, ${round(moved.y)}), `
                + `not (${expected[i].x}, ${expected[i].y}).`);
        }
    });

    return frames;
}

async function wheel(page: Page): Promise<Frames>
{
    const vp = page.viewportSize()!;

    await page.mouse.move(vp.width / 2, vp.height / 2);
    // A plain wheel pans both canvases (#183, #181). `Ctrl` makes it zoom (#200).
    await page.keyboard.down("Control");
    await startFrames(page);

    for (let i = 0; i < WHEEL_STEPS; i++)
    {
        await page.mouse.wheel(0, i < WHEEL_STEPS / 2 ? -100 : 100);
        await settle(page);
    }

    const frames = await stopFrames(page);

    await page.keyboard.up("Control");
    return frames;
}

async function idle(page: Page): Promise<Frames>
{
    await startFrames(page);

    for (let i = 0; i < STEPS; i++) { await settle(page); }

    return stopFrames(page);
}

async function rectOf(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }>
{
    return page.evaluate((sel) =>
    {
        const el = document.querySelector(sel);

        if (!el) { throw new Error(`${sel} is not in the page.`); }

        const r = el.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
    }, selector);
}

async function centerOf(page: Page, selector: string): Promise<{ x: number; y: number }>
{
    const r = await rectOf(page, selector);
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}

/**
 * A point on the empty canvas beside a node: half a row below its center
 * and a quarter of a column to the right. That is clear of the node, of the
 * vertical edges at column centers, and of the diagonals, which cross at
 * half a column.
 */
async function gapBeside(page: Page, selector: string): Promise<{ x: number; y: number }>
{
    const r = await rectOf(page, selector);
    const scale = r.height / NODE_H;

    return { x: r.x + r.width / 2 + (GAP_X * scale) / 4, y: r.y + r.height / 2 + (GAP_Y * scale) / 2 };
}

/** What the screen shows: the zoom, and how many nodes are inside the window. */
async function view(page: Page, nodes: string, zoom: number): Promise<View>
{
    const vp = page.viewportSize()!;
    const onScreen = await page.evaluate(({ sel, w, h }) =>
        [...document.querySelectorAll(sel)].filter((el) =>
        {
            const r = el.getBoundingClientRect();
            return r.right > 0 && r.bottom > 0 && r.left < w && r.top < h;
        }).length, { sel: nodes, w: vp.width, h: vp.height });

    return { zoom: Math.round(zoom * 1000) / 1000, onScreen };
}

/** The node nearest the middle of the grid. */
function middleNode(n: number): number
{
    const { cols, rows } = scene(n);
    return Math.min(n - 1, Math.floor(rows / 2) * cols + Math.floor(cols / 2));
}

async function measureGraphCanvas(page: Page, n: number): Promise<Result>
{
    const { cols, rows, edges } = scene(n);
    const built = await page.evaluate(({ n, cols, rows, edges, gx, gy }) =>
    {
        type Gc = { zoomToFit(): void; setZoomLevel(z: number): void; zoomToNode(id: string): void };
        const host = document.getElementById("host")!;
        const nodes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, label: `Node ${i}`, type: "entity" }));
        const links = edges.map(([s, t], i) => ({ id: `e${i}`, sourceId: `n${s}`, targetId: `n${t}`, type: "has" }));

        // Large enough that the hierarchical layout spaces the nodes GAP_X and GAP_Y apart.
        host.style.width = `${(cols + 1) * gx}px`;
        host.style.height = `${(rows + 1) * gy}px`;

        const t0 = performance.now();
        const create = (window as unknown as { createGraphCanvas(o: object): Gc }).createGraphCanvas;
        const gc = create({ container: host, nodes, edges: links, layout: "hierarchical", layoutDirection: "TB" });
        const loadMs = performance.now() - t0;

        host.style.width = "";
        host.style.height = "";
        gc.zoomToFit();
        (window as unknown as { __gc: Gc }).__gc = gc;

        return new Promise<{ buildMs: number; loadMs: number }>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() =>
                resolve({ buildMs: performance.now() - t0, loadMs }))));
    }, { n, cols, rows, edges, gx: GAP_X, gy: GAP_Y });

    const elements = await page.evaluate(() => document.getElementById("host")!.querySelectorAll("*").length);
    const result: Partial<Result> = { canvas: "GraphCanvas", nodes: n, edges: edges.length, elements,
        buildMs: round(built.buildMs), loadMs: round(built.loadMs) };
    const mid = `.gc-node[data-node-id="n${middleNode(n)}"]`;
    const first = '.gc-node[data-node-id="n0"]';
    const zoom = (): Promise<number> => page.evaluate(() =>
        (window as unknown as { __gc: { getZoomLevel(): number } }).__gc.getZoomLevel());
    const centerOn = async (): Promise<void> =>
    {
        await page.evaluate((id) =>
        {
            const gc = (window as unknown as { __gc: { centerOnNode(id: string): void; setZoomLevel(z: number): void } }).__gc;
            // Zoom first: zoomToNode centers at the old zoom and then scales about the origin.
            gc.setZoomLevel(1);
            gc.centerOnNode(id);
        }, `n${middleNode(n)}`);
        await settle(page);
    };

    result.idle = await idle(page);
    result.viewFit = await view(page, ".gc-node", await zoom());
    result.panFit = await gesture(page, "pan", await gapBeside(page, mid), 300, 200, "left", mid, first);

    await centerOn();
    result.viewOne = await view(page, ".gc-node", await zoom());
    result.panOne = await gesture(page, "pan", await gapBeside(page, mid), 300, 200, "left", mid, first);
    result.zoom = await wheel(page);

    await centerOn();
    result.drag = await gesture(page, "drag", await centerOf(page, mid), 150, 100, "left", mid, first);

    if (n === SIZES[0])
    {
        result.forceMs = round(await page.evaluate(({ n, edges }) =>
        {
            const host = document.createElement("div");
            host.style.cssText = "position:fixed;inset:0;visibility:hidden";
            document.body.appendChild(host);
            const nodes = Array.from({ length: n }, (_, i) => ({ id: `f${i}`, label: `F${i}`, type: "entity" }));
            const links = edges.map(([s, t], i) => ({ id: `fe${i}`, sourceId: `f${s}`, targetId: `f${t}`, type: "has" }));
            const t0 = performance.now();
            const create = (window as unknown as { createGraphCanvas(o: object): { destroy(): void } }).createGraphCanvas;
            const gc = create({ container: host, nodes, edges: links, layout: "force", layoutSeed: 1 });
            const ms = performance.now() - t0;
            gc.destroy();
            host.remove();
            return ms;
        }, { n, edges }));
    }

    return result as Result;
}

async function measureDiagramEngine(page: Page, n: number): Promise<Result>
{
    const { cols, edges } = scene(n);
    const built = await page.evaluate(({ n, cols, edges, gx, gy, w, h }) =>
    {
        type Doc = { objects: Array<Record<string, unknown>>; connectors: Array<Record<string, unknown>> };
        type De = {
            addObject(o: object): { id: string }; addConnector(c: object): { id: string };
            getDocument(): Doc; setDocument(d: Doc): void; zoomToFit(): void;
        };
        const host = document.getElementById("host")!;
        const create = (window as unknown as { createDiagramEngine(el: HTMLElement, o: object): De }).createDiagramEngine;
        const t0 = performance.now();
        const de = create(host, { editable: true });

        // One object and one connector, so the document has the real shape of each.
        const a = de.addObject({ semantic: { type: "entity", data: { label: "Node 0" } },
            presentation: { shape: "rectangle", bounds: { x: 0, y: 0, width: w, height: h } } });
        const b = de.addObject({ semantic: { type: "entity", data: { label: "Node 1" } },
            presentation: { shape: "rectangle", bounds: { x: gx, y: 0, width: w, height: h } } });
        de.addConnector({ presentation: { sourceId: a.id, targetId: b.id, routing: "straight",
            style: { color: "black", width: 1 }, labels: [], waypoints: [] } });

        const doc = de.getDocument();
        const object = doc.objects[0];
        const connector = doc.connectors[0];
        const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

        doc.objects = Array.from({ length: n }, (_, i) =>
        {
            const o = clone(object) as Record<string, any>;
            o.id = `n${i}`;
            o.semantic.data.label = `Node ${i}`;
            o.presentation.bounds = { x: (i % cols) * gx, y: Math.floor(i / cols) * gy, width: w, height: h };
            return o;
        });
        doc.connectors = edges.map(([s, t], i) =>
        {
            const c = clone(connector) as Record<string, any>;
            c.id = `e${i}`;
            c.presentation.sourceId = `n${s}`;
            c.presentation.targetId = `n${t}`;
            return c;
        });

        const t1 = performance.now();
        de.setDocument(doc);
        const loadMs = performance.now() - t1;

        de.zoomToFit();
        (window as unknown as { __de: De }).__de = de;

        return new Promise<{ buildMs: number; loadMs: number }>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() =>
                resolve({ buildMs: performance.now() - t0, loadMs }))));
    }, { n, cols, edges, gx: GAP_X, gy: GAP_Y, w: NODE_W, h: NODE_H });

    const elements = await page.evaluate(() => document.getElementById("host")!.querySelectorAll("*").length);
    const result: Partial<Result> = { canvas: "DiagramEngine", nodes: n, edges: edges.length, elements,
        buildMs: round(built.buildMs), loadMs: round(built.loadMs) };
    const vp = page.viewportSize()!;

    const id = `n${middleNode(n)}`;
    const mid = `[data-id="${id}"]`;
    const first = '[data-id="n0"]';
    const zoom = (): Promise<number> => page.evaluate(() =>
        (window as unknown as { __de: { getZoomLevel(): number } }).__de.getZoomLevel());
    const centerOn = async (): Promise<void> =>
    {
        await page.evaluate(({ id, vw, vh }) =>
        {
            const de = (window as unknown as { __de: { setZoomLevel(z: number): void;
                getObject(id: string): { presentation: { bounds: { x: number; y: number; width: number; height: number } } };
                getViewport(): { x: number; y: number; zoom: number }; panCanvas(dx: number, dy: number): void;
                clearSelection(): void } }).__de;
            de.setZoomLevel(1);
            const b = de.getObject(id).presentation.bounds;
            const v = de.getViewport();
            // At zoom 1, a point's screen position is its canvas position plus the viewport offset.
            de.panCanvas(vw / 2 - (b.x + b.width / 2 + v.x), vh / 2 - (b.y + b.height / 2 + v.y));
            de.clearSelection();
        }, { id, vw: vp.width, vh: vp.height });
        await settle(page);
    };

    result.idle = await idle(page);
    result.viewFit = await view(page, '[data-id^="n"]', await zoom());
    result.panFit = await gesture(page, "pan", await gapBeside(page, mid), 300, 200, "middle", mid, first);

    await centerOn();
    result.viewOne = await view(page, '[data-id^="n"]', await zoom());
    result.panOne = await gesture(page, "pan", await gapBeside(page, mid), 300, 200, "middle", mid, first);
    result.zoom = await wheel(page);

    await centerOn();
    result.drag = await gesture(page, "drag", await centerOf(page, mid), 150, 100, "left", mid, first);

    if (n === SIZES[0])
    {
        result.addLoopMs = round(await page.evaluate(({ n, cols, edges, gx, gy, w, h }) =>
        {
            const host = document.createElement("div");
            host.style.cssText = "position:fixed;inset:0;visibility:hidden";
            document.body.appendChild(host);
            type De = { addObject(o: object): { id: string }; addConnector(c: object): unknown; destroy(): void };
            const create = (window as unknown as { createDiagramEngine(el: HTMLElement, o: object): De }).createDiagramEngine;
            const de = create(host, { editable: true });
            const t0 = performance.now();
            const ids = Array.from({ length: n }, (_, i) => de.addObject({
                semantic: { type: "entity", data: { label: `Node ${i}` } },
                presentation: { shape: "rectangle",
                    bounds: { x: (i % cols) * gx, y: Math.floor(i / cols) * gy, width: w, height: h } } }).id);

            for (const [s, t] of edges)
            {
                de.addConnector({ presentation: { sourceId: ids[s], targetId: ids[t], routing: "straight",
                    style: { color: "black", width: 1 }, labels: [], waypoints: [] } });
            }

            const ms = performance.now() - t0;
            de.destroy();
            host.remove();
            return ms;
        }, { n, cols, edges, gx: GAP_X, gy: GAP_Y, w: NODE_W, h: NODE_H }));
    }

    return result as Result;
}

function save(result: Result): void
{
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `${result.canvas}-${result.nodes}.json`), JSON.stringify(result, null, 2) + "\n");
}

function frameCell(f: Frames): string
{
    return `${f.p50} / ${f.p95} / ${f.max} (${f.over50})`;
}

/** Writes the table of every result on disk, and prints it. */
function report(): void
{
    if (!fs.existsSync(OUT)) { return; }

    const results: Result[] = fs.readdirSync(OUT).filter((f) => f.endsWith(".json") && f !== "results.json")
        .map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")))
        .sort((a, b) => a.canvas.localeCompare(b.canvas) || a.nodes - b.nodes);
    const lines = [
        "Cost of each step, as the longest frame gap after its input, in ms: median / 95th percentile / max "
            + "(steps over 50 ms). One frame is 16.7 ms. Headless, software drawing.",
        "",
        "| Canvas | Nodes | Edges | Elements | Build ms | Load ms | Idle | Widest: zoom, nodes on screen | Pan, widest "
            + "| Zoom 1: nodes on screen | Pan, zoom 1 | Wheel zoom | Drag one node |",
        "|---|---:|---:|---:|---:|---:|---|---|---|---:|---|---|---|",
        ...results.map((r) => `| ${r.canvas} | ${r.nodes} | ${r.edges} | ${r.elements} | ${r.buildMs} | ${r.loadMs} | `
            + `${frameCell(r.idle)} | ${r.viewFit.zoom}, ${r.viewFit.onScreen} | ${frameCell(r.panFit)} | ${r.viewOne.onScreen} | `
            + `${frameCell(r.panOne)} | ${frameCell(r.zoom)} | ${frameCell(r.drag)} |`),
        "",
        ...results.filter((r) => r.forceMs !== undefined).map((r) => `GraphCanvas force layout, ${r.nodes} nodes: ${r.forceMs} ms.`),
        ...results.filter((r) => r.addLoopMs !== undefined)
            .map((r) => `DiagramEngine, ${r.nodes} addObject calls and ${r.edges} addConnector calls: ${r.addLoopMs} ms.`),
    ];

    fs.writeFileSync(path.join(OUT, "results.md"), lines.join("\n") + "\n");
    fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2) + "\n");
    console.log(lines.join("\n"));
}

test.describe("canvas scale", () =>
{
    test.skip(!process.env.CANVAS_BENCH, "A measurement. Run it with `npm run bench:canvas`.");

    test.afterAll(() => { if (process.env.CANVAS_BENCH) { report(); } });

    for (const n of SIZES)
    {
        test(`GraphCanvas, ${n} nodes`, async ({ page }) =>
        {
            test.setTimeout(600_000);
            await openBench(page);
            save(await measureGraphCanvas(page, n));
        });

        test(`DiagramEngine, ${n} nodes`, async ({ page }) =>
        {
            test.setTimeout(600_000);
            await openBench(page);
            save(await measureDiagramEngine(page, n));
        });
    }
});
