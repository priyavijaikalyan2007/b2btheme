/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 *
 * TESTS: ChartPanel (ADR-130)
 * Vitest unit tests for the ChartPanel component.
 * Chart.js itself is mocked: tests assert wrapper behaviour, not Chart.js
 * internals.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";

// ============================================================================
// CHART.JS MOCK
// ============================================================================

interface MockChartConfig
{
    type: string;
    data: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
            borderColor?: string;
            backgroundColor?: string;
            fill?: boolean;
        }>;
    };
    options: Record<string, unknown>;
}

class MockChart
{
    public static instances: MockChart[] = [];
    public static lastCanvas: HTMLCanvasElement | null = null;
    public static updateAnimateCalls: Array<undefined | string> = [];

    public canvas: HTMLCanvasElement;
    public config: MockChartConfig;
    public destroyed = false;
    public resizes = 0;

    constructor(canvas: HTMLCanvasElement, config: MockChartConfig)
    {
        this.canvas = canvas;
        this.config = config;
        MockChart.lastCanvas = canvas;
        MockChart.instances.push(this);
    }

    public update(mode?: string): void
    {
        MockChart.updateAnimateCalls.push(mode);
    }

    public resize(): void
    {
        this.resizes += 1;
    }

    public destroy(): void
    {
        this.destroyed = true;
    }

    public toBase64Image(): string
    {
        return "data:image/png;base64,mock";
    }

    public static reset(): void
    {
        MockChart.instances = [];
        MockChart.lastCanvas = null;
        MockChart.updateAnimateCalls = [];
    }
}

function installMockChart(): void
{
    (window as unknown as Record<string, unknown>)["Chart"] = MockChart;
}

function uninstallMockChart(): void
{
    delete (window as unknown as Record<string, unknown>)["Chart"];
}

// ============================================================================
// HELPERS
// ============================================================================

let container: HTMLElement;

beforeEach(() =>
{
    container = document.createElement("div");
    container.id = "chart-test-container";
    Object.defineProperty(container, "clientWidth", { value: 400 });
    Object.defineProperty(container, "clientHeight", { value: 200 });
    document.body.appendChild(container);
    MockChart.reset();
    installMockChart();
});

afterEach(() =>
{
    container.remove();
    uninstallMockChart();
    document.documentElement.removeAttribute("data-bs-theme");
});

// Late import so window.Chart stub setup doesn't matter here, but we
// re-import in tests below where we need to verify missing-Chart behaviour.
async function loadModule(): Promise<typeof import("./chartpanel")>
{
    return await import("./chartpanel");
}

// ============================================================================
// LITERATE ERROR — missing window.Chart
// ============================================================================

describe("ChartPanel literate error", () =>
{
    test("MissingChartGlobal_RendersLiterateError_AndDoesNotThrow",
        async () =>
    {
        uninstallMockChart();
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "s", label: "S", data: [1] }],
        });
        const root = handle.getRootElement();
        expect(root).not.toBeNull();
        expect(root!.querySelector(".chartpanel-error")).not.toBeNull();
        expect(root!.textContent || "").toMatch(/Chart\.js/i);
        handle.destroy();
    });
});

// ============================================================================
// FACTORY + CANVAS
// ============================================================================

describe("ChartPanel factory", () =>
{
    test("CreateChartPanel_BarKind_MountsCanvasAndCallsChart",
        async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "Bar demo",
            categories: ["Mon", "Tue"],
            series: [{ id: "v", label: "Visits", data: [10, 20] }],
        });
        expect(container.querySelector(".chartpanel")).not.toBeNull();
        expect(container.querySelector("canvas")).not.toBeNull();
        expect(MockChart.instances.length).toBe(1);
        expect(MockChart.instances[0].config.type).toBe("bar");
        expect(MockChart.instances[0].config.data.labels).toEqual(
            ["Mon", "Tue"]);
        handle.destroy();
    });

    test("CreateChartPanel_LineKind_MapsToLineType", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "line",
            ariaLabel: "Line demo",
            categories: ["1", "2"],
            series: [{ id: "s", label: "S", data: [1, 2] }],
        });
        expect(MockChart.instances[0].config.type).toBe("line");
        // Line has fill: false on the dataset
        expect(MockChart.instances[0].config.data.datasets[0].fill)
            .toBe(false);
        handle.destroy();
    });

    test("CreateChartPanel_AreaKind_MapsToLineWithFill", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "area",
            ariaLabel: "Area demo",
            categories: ["1", "2"],
            series: [{ id: "s", label: "S", data: [1, 2] }],
        });
        expect(MockChart.instances[0].config.type).toBe("line");
        expect(MockChart.instances[0].config.data.datasets[0].fill)
            .toBe(true);
        handle.destroy();
    });

    test("CreateChartPanel_SparklineKind_HidesAxesAndLegend",
        async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "sparkline",
            ariaLabel: "spark",
            categories: ["1", "2"],
            series: [{ id: "s", label: "S", data: [1, 2] }],
        });
        const opts = MockChart.instances[0].config.options as Record<
            string, unknown>;
        const plugins = opts.plugins as Record<string, unknown>;
        expect((plugins.legend as Record<string, unknown>).display)
            .toBe(false);
        const scales = opts.scales as Record<string, Record<
            string, unknown>>;
        expect(scales.x.display).toBe(false);
        expect(scales.y.display).toBe(false);
        handle.destroy();
    });
});

// ============================================================================
// ARIA + FALLBACK TABLE
// ============================================================================

describe("ChartPanel accessibility", () =>
{
    test("AriaLabel_AppliedToRoot", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "Quarterly visits",
            categories: ["Q1"],
            series: [{ id: "v", label: "Visits", data: [10] }],
        });
        expect(handle.getRootElement()!.getAttribute("aria-label"))
            .toBe("Quarterly visits");
        handle.destroy();
    });

    test("FallbackTable_RenderedByDefault_AndContainsData", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A", "B"],
            series: [{ id: "v", label: "Visits", data: [10, 20] }],
        });
        const table = handle.getRootElement()!.querySelector("table");
        expect(table).not.toBeNull();
        expect(table?.classList.contains("chartpanel-sr-table"))
            .toBe(true);
        const cells = table!.querySelectorAll("td");
        const cellText = Array.from(cells).map(c => c.textContent);
        expect(cellText).toContain("10");
        expect(cellText).toContain("20");
        handle.destroy();
    });

    test("FallbackTable_DisabledByOption_OmitsTable", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            fallbackTable: false,
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        expect(handle.getRootElement()!.querySelector("table")).toBeNull();
        handle.destroy();
    });
});

// ============================================================================
// STATES
// ============================================================================

describe("ChartPanel states", () =>
{
    test("LoadingState_RendersSkeleton_AndDefersChart", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            state: "loading",
            ariaLabel: "demo",
            categories: ["A"],
            series: [],
        });
        expect(handle.getRootElement()!
            .querySelector(".chartpanel-skeleton")).not.toBeNull();
        expect(MockChart.instances.length).toBe(0);
        handle.destroy();
    });

    test("EmptyState_RendersEmptyText_NoChart", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            state: "empty",
            emptyText: "Nothing here yet",
            ariaLabel: "demo",
            categories: [],
            series: [],
        });
        const empty = handle.getRootElement()!
            .querySelector(".chartpanel-empty");
        expect(empty?.textContent).toBe("Nothing here yet");
        expect(MockChart.instances.length).toBe(0);
        handle.destroy();
    });

    test("ErrorState_RendersErrorText", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            state: "error",
            errorText: "Backend timeout",
            ariaLabel: "demo",
            categories: [],
            series: [],
        });
        const err = handle.getRootElement()!
            .querySelector(".chartpanel-error");
        expect(err?.textContent).toContain("Backend timeout");
        handle.destroy();
    });

    test("SetState_LoadingToReady_CreatesChart", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            state: "loading",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        expect(MockChart.instances.length).toBe(0);
        handle.setState("ready");
        expect(MockChart.instances.length).toBe(1);
        handle.destroy();
    });

    test("SetState_ReadyToError_DestroysChart", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        const inst = MockChart.instances[0];
        handle.setState("error", "x");
        expect(inst.destroyed).toBe(true);
        handle.destroy();
    });
});

// ============================================================================
// setData semantics
// ============================================================================

describe("ChartPanel setData", () =>
{
    test("SetData_SameSeriesIds_UpdatesWithoutAnimation", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        const inst = MockChart.instances[0];
        MockChart.updateAnimateCalls = [];
        handle.setData(["A", "B"],
            [{ id: "v", label: "V", data: [10, 20] }]);
        expect(MockChart.updateAnimateCalls.length).toBe(1);
        // "none" tells Chart.js to skip animation
        expect(MockChart.updateAnimateCalls[0]).toBe("none");
        // No new instance created
        expect(MockChart.instances.length).toBe(1);
        expect(inst.config.data.labels).toEqual(["A", "B"]);
        expect(inst.config.data.datasets[0].data).toEqual([10, 20]);
        handle.destroy();
    });

    test("SetData_DifferentSeriesIds_RebuildsChart", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        const first = MockChart.instances[0];
        handle.setData(["A"],
            [{ id: "different", label: "D", data: [2] }]);
        expect(first.destroyed).toBe(true);
        expect(MockChart.instances.length).toBe(2);
        handle.destroy();
    });
});

// ============================================================================
// THEME OBSERVER
// ============================================================================

describe("ChartPanel theme observer", () =>
{
    test("DataBsThemeChange_TriggersChartUpdate", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        MockChart.updateAnimateCalls = [];
        document.documentElement.setAttribute("data-bs-theme", "dark");
        // MutationObserver is async; wait a microtask.
        await Promise.resolve();
        await new Promise(r => setTimeout(r, 0));
        expect(MockChart.updateAnimateCalls.length).toBeGreaterThan(0);
        handle.destroy();
    });
});

// ============================================================================
// HANDLE METHODS
// ============================================================================

describe("ChartPanel handle methods", () =>
{
    test("Resize_DoesNotThrow", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        expect(() => handle.resize()).not.toThrow();
        handle.destroy();
    });

    test("ExportPNG_ReturnsBlob", async () =>
    {
        // Stub canvas.toBlob since jsdom doesn't paint pixels.
        HTMLCanvasElement.prototype.toBlob = function(cb: BlobCallback): void
        {
            cb(new Blob(["mock"], { type: "image/png" }));
        };
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        const blob = await handle.exportPNG();
        expect(blob).toBeInstanceOf(Blob);
        expect(blob.type).toBe("image/png");
        handle.destroy();
    });

    test("Destroy_DestroysChart_AndDetachesRoot", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        const inst = MockChart.instances[0];
        handle.destroy();
        expect(inst.destroyed).toBe(true);
        expect(container.querySelector(".chartpanel")).toBeNull();
    });

    test("Destroy_Twice_NoThrow", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1] }],
        });
        handle.destroy();
        expect(() => handle.destroy()).not.toThrow();
    });

    test("DestroyMany_NoMemoryLeak_OneInstancePerCall", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handles = [];
        for (let i = 0; i < 10; i += 1)
        {
            handles.push(createChartPanel({
                container,
                kind: "bar",
                ariaLabel: "demo",
                categories: ["A"],
                series: [{ id: "v", label: "V", data: [i] }],
            }));
        }
        expect(MockChart.instances.length).toBe(10);
        handles.forEach(h => h.destroy());
        for (let i = 0; i < 10; i += 1)
        {
            expect(MockChart.instances[i].destroyed).toBe(true);
        }
    });
});

// ============================================================================
// INTENT PALETTE
// ============================================================================

describe("ChartPanel intent palette", () =>
{
    test("IntentPrimary_AppliesNonEmptyColor", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "bar",
            ariaLabel: "demo",
            categories: ["A"],
            series: [{ id: "v", label: "V", data: [1],
                intent: "primary" }],
        });
        const ds = MockChart.instances[0].config.data.datasets[0];
        // Some non-empty colour string should be set (resolved from
        // CSS var; jsdom may return empty string, in which case the
        // wrapper falls back to a hard-coded safe value).
        expect(typeof ds.backgroundColor).toBe("string");
        expect((ds.backgroundColor as string).length).toBeGreaterThan(0);
        handle.destroy();
    });

    test("MultipleSeries_NoIntent_GetDistinctColors", async () =>
    {
        const { createChartPanel } = await loadModule();
        const handle = createChartPanel({
            container,
            kind: "line",
            ariaLabel: "demo",
            categories: ["A"],
            series: [
                { id: "a", label: "A", data: [1] },
                { id: "b", label: "B", data: [2] },
                { id: "c", label: "C", data: [3] },
            ],
        });
        const dsList = MockChart.instances[0].config.data.datasets;
        const colours = dsList.map(d => d.borderColor);
        expect(new Set(colours).size).toBe(3);
        handle.destroy();
    });
});
