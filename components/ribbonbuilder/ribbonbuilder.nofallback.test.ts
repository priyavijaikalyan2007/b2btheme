/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: RibbonBuilder refuses to pick an icon without SymbolPicker
 * 📜 PURPOSE: Proves FALLBACK-9 item 1. When SymbolPicker was absent, the
 * icon button opened a second picker of 176 hand-listed icons. A designer
 * who searched outside that list read "No icons found". The curated picker
 * is gone and the button now refuses, naming the bundle to load.
 * 🔗 RELATED: AGENTS.md "No Fallback Code", ADR-186
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createRibbonBuilder } from "./ribbonbuilder";
import type { RibbonBuilderHandle, RibbonOptions } from "./ribbonbuilder";

type Globals = Record<string, unknown>;

let container: HTMLElement;

function makeConfig(): RibbonOptions
{
    return {
        tabs: [
            {
                id: "home",
                label: "Home",
                groups: [
                    {
                        id: "clipboard",
                        label: "Clipboard",
                        controls: [
                            {
                                type: "button",
                                id: "paste",
                                label: "Paste",
                                icon: "bi-clipboard"
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

/**
 * Expand tab then group, and select the control row, so the properties
 * panel renders the icon field the picker button lives in.
 */
function selectControlRow(el: HTMLElement): void
{
    const chevrons = (): HTMLElement[] =>
        Array.from(el.querySelectorAll<HTMLElement>(".ribbonbuilder-tree-chevron"));

    chevrons()[0].click();
    chevrons()[1].click();

    const rows = el.querySelectorAll<HTMLElement>(".ribbonbuilder-tree-row");
    expect(rows.length).toBe(3);
    rows[2].click();
}

function iconPickButton(el: HTMLElement): HTMLElement
{
    const btn = el.querySelector<HTMLElement>(".ribbonbuilder-icon-pick-btn");
    expect(btn).not.toBeNull();
    return btn as HTMLElement;
}

/**
 * A listener that throws does not propagate to the caller of click(), so
 * the error arrives as an uncaught one on window. Capturing it here is
 * what keeps a real refusal from being counted as a test-run failure.
 */
function clickAndCapture(el: HTMLElement): unknown
{
    let captured: unknown = null;

    const onError = (e: ErrorEvent): void =>
    {
        e.preventDefault();
        captured = e.error;
    };

    window.addEventListener("error", onError);

    try { el.click(); }
    finally { window.removeEventListener("error", onError); }

    return captured;
}

/** A SymbolPicker stand-in that records the calls the builder makes. */
function stubSymbolPicker(calls: string[]): void
{
    (window as Globals)["createSymbolPicker"] = (): Record<string, unknown> =>
    {
        return {
            enable: () => { calls.push("enable"); },
            disable: () => { calls.push("disable"); },
            destroy: () => { calls.push("destroy"); },
        };
    };
}

describe("RibbonBuilder icon picker with no SymbolPicker", () =>
{
    let builder: RibbonBuilderHandle | null = null;

    beforeEach(() =>
    {
        container = document.createElement("div");
        container.id = "ribbonbuilder-nofallback";
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        if (builder) { builder.destroy(); }
        builder = null;
        delete (window as Globals)["createSymbolPicker"];
        document.body.innerHTML = "";
    });

    test("symbolPickerIsAbsent_SoTheRefusalBranchIsUnderTest", () =>
    {
        expect((window as Globals)["createSymbolPicker"]).toBeUndefined();
    });

    test("mountingStillWorks_BecauseTheRefusalIsAtThePointOfUse", () =>
    {
        builder = createRibbonBuilder(
            { container, initialConfig: makeConfig() }, "ribbonbuilder-nofallback");

        expect(container.querySelector(".ribbonbuilder")).not.toBeNull();
    });

    test("clickingThePickButton_ThrowsNamingTheSymbolPickerBundle", () =>
    {
        builder = createRibbonBuilder(
            { container, initialConfig: makeConfig() }, "ribbonbuilder-nofallback");

        const el = builder.getElement();
        selectControlRow(el);

        const err = clickAndCapture(iconPickButton(el));

        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toMatch(/createSymbolPicker is not defined/);
        expect((err as Error).message).toMatch(/symbolpicker/);
    });

    test("noCuratedGridIsBuilt_WhereTheFallbackUsedToPutOne", () =>
    {
        builder = createRibbonBuilder(
            { container, initialConfig: makeConfig() }, "ribbonbuilder-nofallback");

        const el = builder.getElement();
        selectControlRow(el);
        clickAndCapture(iconPickButton(el));

        expect(el.querySelector(".ribbonbuilder-iconpicker")).toBeNull();
        expect(el.querySelector(".ribbonbuilder-iconpicker-grid")).toBeNull();
    });
});

describe("RibbonBuilder icon picker with SymbolPicker present", () =>
{
    let builder: RibbonBuilderHandle | null = null;
    let calls: string[];

    beforeEach(() =>
    {
        calls = [];
        container = document.createElement("div");
        container.id = "ribbonbuilder-symbolpicker";
        document.body.appendChild(container);
    });

    afterEach(() =>
    {
        if (builder) { builder.destroy(); }
        builder = null;
        delete (window as Globals)["createSymbolPicker"];
        document.body.innerHTML = "";
    });

    test("clickingThePickButton_EnablesTheRealPicker", () =>
    {
        stubSymbolPicker(calls);

        builder = createRibbonBuilder(
            { container, initialConfig: makeConfig() }, "ribbonbuilder-symbolpicker");

        const el = builder.getElement();
        selectControlRow(el);

        const err = clickAndCapture(iconPickButton(el));

        expect(err).toBeNull();
        expect(calls).toContain("enable");

        const host = el.querySelector<HTMLElement>(
            ".ribbonbuilder-symbolpicker-overlay");
        expect(host).not.toBeNull();
        expect((host as HTMLElement).style.display).toBe("");
    });

    test("aFactoryThatThrows_SurfacesAtShowInsteadOfBeingSwallowed", () =>
    {
        (window as Globals)["createSymbolPicker"] = (): never =>
        {
            throw new Error("symbolpicker exploded");
        };

        expect(() => createRibbonBuilder(
            { container, initialConfig: makeConfig() }, "ribbonbuilder-symbolpicker"))
            .toThrow(/symbolpicker exploded/);
    });
});
