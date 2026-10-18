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
 * Also proves FALLBACK-9 item 3. A tool declares tooltip as required and
 * says why, but a host written in JavaScript could omit it and reach the
 * DOM as title="undefined". A missing one now throws, naming the item.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-185, ADR-188
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
        // Bootstrap. A toolbar WITH tools always does, because every tool
        // must declare a tooltip and every tooltip is a trigger. An empty
        // region is the real boundary.
        //
        // DEBT-TEST-1b. A bare not.toThrow() could not tell a toolbar
        // that mounted from one that refused quietly, so the control
        // asserts the region reached the DOM with no trigger in it.
        const tb = createToolbar(options([]));
        const root = tb.getElement() as HTMLElement;

        expect(root.querySelector("[data-region-id=\"rgn1\"]")).not.toBeNull();
        expect(root.querySelectorAll("[data-bs-toggle=\"tooltip\"]").length)
            .toBe(0);
        tb.destroy();
    });
});

describe("Toolbar items that omit a required tooltip", () =>
{
    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "toolbar-tooltip-contract";
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        container.remove();
        delete (window as Globals)["bootstrap"];
    });

    test("aToolWithNoTooltip_ThrowsNamingTheTool", () =>
    {
        // Thrown while the button is built, before initTooltips runs, so
        // the message is about the tooltip and not about Bootstrap.
        expect(() => createToolbar(options([
            { id: "t1", label: "Save" } as unknown as ToolItem
        ]))).toThrow(/Toolbar tool "t1" has no tooltip/);
    });

    test("anEmptyTooltipIsNotATooltip_BecauseItNamesNothing", () =>
    {
        expect(() => createToolbar(options([
            { id: "t1", label: "Save", tooltip: "   " } as ToolItem
        ]))).toThrow(/has no tooltip/);
    });

    test("aGalleryWithNoTooltip_ThrowsNamingTheGallery", () =>
    {
        expect(() => createToolbar(options([
            {
                type: "gallery",
                id: "g1",
                icon: "bi-palette",
                options: [{ id: "o1", label: "One" }]
            } as unknown as ToolItem
        ]))).toThrow(/Toolbar gallery "g1" has no tooltip/);
    });

    test("aSplitButtonWithNoTooltip_ThrowsNamingTheSplitButton", () =>
    {
        expect(() => createToolbar(options([
            {
                type: "split-button",
                id: "s1",
                icon: "bi-save",
                menuItems: [{ id: "m1", label: "One" }]
            } as unknown as ToolItem
        ]))).toThrow(/Toolbar split button "s1" has no tooltip/);
    });

    test("anItemWhoseTooltipIsOptional_StillMountsWithout", () =>
    {
        // ToolToggleSwitchItem declares tooltip?, and it carries its own
        // visible label, so there is no fabricated accessible name to
        // guard against. It also sets no trigger, so Bootstrap stays out.
        //
        // DEBT-TEST-1b. The claim is that the switch MOUNTS without one,
        // and only the absence of a throw was ever checked. The visible
        // label is what stands in for the tooltip, so assert it is there.
        const tb = createToolbar(options([
            {
                type: "switch",
                id: "sw1",
                label: "Live preview"
            } as unknown as ToolItem
        ]));
        const root = tb.getElement() as HTMLElement;
        const sw = root.querySelector("[data-tool-id=\"sw1\"]");

        expect(sw).not.toBeNull();
        expect(sw?.textContent).toContain("Live preview");
        expect(sw?.querySelector("[data-bs-toggle=\"tooltip\"]")).toBeNull();
        tb.destroy();
    });
});
