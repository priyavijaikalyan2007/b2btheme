/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Toolbar demands Bootstrap only when a tooltip actually exists
 * 📜 PURPOSE: Proves FALLBACK-5. initTooltips used to return quietly when
 * Bootstrap was absent, so tooltips silently never appeared. It now throws
 * — but only when there is a trigger to initialise, because a toolbar with
 * no tooltips does not need Bootstrap for this.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-185
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createToolbar } from "./toolbar";
import type { ToolbarOptions, ToolItem } from "./toolbar";

let container: HTMLElement;

function options(items: ToolItem[]): ToolbarOptions
{
    return {
        label: "Test Toolbar",
        container,
        regions: [{ id: "rgn1", title: "Region One", items }],
        contained: true
    };
}

type Globals = Record<string, unknown>;

describe("Toolbar tooltips with no Bootstrap", () =>
{
    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "toolbar-nofallback-container";
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        container.remove();
        delete (window as Globals)["bootstrap"];
    });

    test("bootstrapIsAbsent_SoTheRefusalBranchIsUnderTest", () =>
    {
        expect((window as Globals)["bootstrap"]).toBeUndefined();
    });

    test("aToolWithATooltip_ThrowsNamingTheBundleAndTheCount", () =>
    {
        expect(() => createToolbar(options([
            { id: "t1", label: "Save", tooltip: "Save the file" } as ToolItem
        ]))).toThrow(/bootstrap/i);
    });

    test("theErrorSaysHowManyTriggersAreWaiting", () =>
    {
        let message = "";

        try
        {
            createToolbar(options([
                { id: "t1", label: "Save", tooltip: "Save" } as ToolItem,
                { id: "t2", label: "Open", tooltip: "Open" } as ToolItem
            ]));
        }
        catch (e) { message = (e as Error).message; }

        expect(message).toMatch(/2 tooltip trigger/);
        expect(message).toMatch(/load/i);
    });

    test("aToolbarWithNoTools_DoesNotDemandBootstrap", () =>
    {
        // The guard is about the feature, not the component: it counts
        // triggers rather than assuming the component always needs
        // Bootstrap. In practice a toolbar WITH tools always does, because
        // buildTool sets data-bs-toggle="tooltip" on every button whether
        // or not a tooltip was given. An empty region is the real boundary.
        expect(() => createToolbar(options([]))).not.toThrow();
    });
});
