/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the ten B3 inputs under @a2ui/lit (readiness step 2 B3, ADR-228).
 * Two-way components write what they show, valid in the catalog; the surface
 * ones send their events with the payload under eventData; PeoplePicker's
 * search is asked of the agent and answered through searchResult.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";
import { expectCatalogValid } from "../a2ui/catalog-valid";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** The component's own getValue(), as JSON. */
function shown(page: Page, name: string): Promise<unknown>
{
    return page.evaluate((t) =>
    {
        const handle = (window as unknown as { handleOf(x: string): { getValue(): unknown } }).handleOf(t);
        return JSON.parse(JSON.stringify(handle.getValue() ?? null));
    }, tagOf(name));
}

/** Mounts `name` with `props` and `data`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>, data: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Checks that the bound value changed from `from`, equals what the component shows, and is valid. */
async function wrote(page: Page, name: string, from: unknown): Promise<void>
{
    await expect.poll(() => dm(page, "s", "/v")).not.toEqual(from);
    expect(await dm(page, "s", "/v")).toEqual(await shown(page, name));
    await expectCatalogValid(name, "value", await dm(page, "s", "/v"));
    expect(await errors(page)).toEqual([]);
}

const BOUND = { value: { path: "/v" } };
const GRADIENT = { type: "linear", angle: 90, center: { x: 0.5, y: 0.5 }, radius: 0.5,
    stops: [{ color: "#000000", position: 0, alpha: 1 }, { color: "#ff0000", position: 0.3, alpha: 1 },
        { color: "#ffffff", position: 1, alpha: 1 }] };

test.describe("B3 inputs under @a2ui/lit", () =>
{
    test("AnglePicker: a typed angle writes its degrees", async ({ page }) =>
    {
        await mount(page, "AnglePicker", BOUND, { v: 45 });

        await page.locator(".anglepicker-input").fill("120");
        await page.locator(".anglepicker-input").press("Enter");

        await wrote(page, "AnglePicker", 45);
        expect(await dm(page, "s", "/v")).toBe(120);
    });

    test("ColorPicker: a typed hex colour writes it", async ({ page }) =>
    {
        await mount(page, "ColorPicker", BOUND, { v: "#3B82F6" });

        await page.locator(".colorpicker-trigger").click();
        await page.locator(".colorpicker-input").fill("FF0000");
        await page.locator(".colorpicker-input").press("Enter");

        await wrote(page, "ColorPicker", "#3B82F6");
    });

    test("GradientPicker: reversing the stops writes the new gradient", async ({ page }) =>
    {
        await mount(page, "GradientPicker", BOUND, { v: GRADIENT });

        await page.locator(".gradientpicker-trigger").click();
        await page.locator(".gradientpicker-reverse").click();

        await wrote(page, "GradientPicker", GRADIENT);
    });

    test("MaskedEntry: typing a secret writes it", async ({ page }) =>
    {
        await mount(page, "MaskedEntry", BOUND, { v: "old" });

        await page.locator(".maskedentry-input").fill("new-secret");

        await wrote(page, "MaskedEntry", "old");
        expect(await dm(page, "s", "/v")).toBe("new-secret");
    });

    test("EditableComboBox: picking an item writes its label", async ({ page }) =>
    {
        const items = [{ label: "Alpha" }, { label: "Beta" }];
        await mount(page, "EditableComboBox", { ...BOUND, items }, { v: "Alpha" });

        await page.locator(".combobox-toggle").click();
        await page.getByRole("option", { name: "Beta" }).click();

        await wrote(page, "EditableComboBox", "Alpha");
        expect(await dm(page, "s", "/v")).toBe("Beta");
    });

    test("SymbolPicker: picking a symbol writes its code; inserting sends onInsert", async ({ page }) =>
    {
        await mount(page, "SymbolPicker", { ...BOUND, eventData: { path: "/ev" },
            onInsert: { event: { name: "insert", context: { symbol: { path: "/ev/insert" } } } } }, { v: "" });

        await page.locator(".symbolpicker-trigger").click();
        await page.locator(".symbolpicker-cell").nth(3).click();
        await wrote(page, "SymbolPicker", "");

        await page.locator(".symbolpicker-insert-btn").click();
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "insert",
            context: { symbol: expect.objectContaining({ code: await dm(page, "s", "/v") }) } })]);
    });

    test("RangeSlider: a keyboard step sends onChange with the new value", async ({ page }) =>
    {
        await mount(page, "RangeSlider", { value: 50, eventData: { path: "/ev" },
            onChange: { event: { name: "slid", context: { v: { path: "/ev/change" } } } } });

        await page.locator(`${tagOf("RangeSlider")} .slider-thumb`).press("ArrowRight");

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "slid", context: { v: 51 } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("SearchBox: typing sends onSearch, and Enter sends onSubmit, with the query", async ({ page }) =>
    {
        await mount(page, "SearchBox", { debounceMs: 50, eventData: { path: "/ev" },
            onSearch: { event: { name: "search", context: { q: { path: "/ev/search" } } } },
            onSubmit: { event: { name: "submit", context: { q: { path: "/ev/submit" } } } } });

        await page.locator(".searchbox-input").fill("quarterly");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "search",
            context: { q: "quarterly" } })]);

        await page.locator(".searchbox-input").press("Enter");
        await expect.poll(async () => (await actions(page)).at(-1)).toEqual(expect.objectContaining({ name: "submit",
            context: { q: "quarterly" } }));
        expect(await errors(page)).toEqual([]);
    });

    test("Tagger: adding a tag sends onChange with the whole tag list", async ({ page }) =>
    {
        await mount(page, "Tagger", { tags: [{ value: "first" }], eventData: { path: "/ev" },
            onChange: { event: { name: "tags", context: { tags: { path: "/ev/change" } } } } });

        await page.locator(".tagger-input").fill("second");
        await page.locator(".tagger-input").press("Enter");

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "tags",
            context: { tags: [expect.objectContaining({ value: "first" }),
                expect.objectContaining({ value: "second" })] } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("PeoplePicker: typing asks the agent to search; picking an answer writes the person", async ({ page }) =>
    {
        await mount(page, "PeoplePicker", { ...BOUND, debounceMs: 0, eventData: { path: "/ev" },
            onSearch: { event: { name: "search", context: { q: { path: "/ev/search" } } } },
            searchResult: { path: "/answers/people" } }, { v: [] });

        await page.locator(".peoplepicker-input").fill("al");
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "search",
            context: { q: "al" } })]);

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/people",
            value: [{ id: "1", name: "Alice Johnson", email: "alice@example.com" }] } }]);
        await page.getByRole("option", { name: /Alice Johnson/ }).click();

        await wrote(page, "PeoplePicker", []);
        expect(await dm(page, "s", "/v")).toEqual([expect.objectContaining({ id: "1", name: "Alice Johnson" })]);
    });
});
