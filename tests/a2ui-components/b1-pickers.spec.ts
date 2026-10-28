/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the ten B1 pickers under @a2ui/lit (readiness step 2 B1, ADR-226).
 * Each is opened and picked from like a user; the value written back must be
 * the property protocol.change names (value, name or id) of the item the
 * component now shows as selected, and must pass the catalog schema. The four
 * preset pickers' "Custom…" link sends onCustom with the current preset name.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness } from "../a2ui/adapter-page";
import { expectCatalogValid } from "../a2ui/catalog-valid";

useHarness();

interface Picker
{
    /** Catalog name. */
    name: string;
    /** CSS prefix, which is also the component's directory. */
    css: string;
    /** A valid starting value. */
    start: string | number;
    /** The item property protocol.change maps to value; omitted when getValue() already returns it. */
    from?: string;
}

const FONT: Picker = { name: "FontDropdown", css: "fontdropdown", start: "" };
const ENDING: Picker = { name: "LineEndingPicker", css: "lineendingpicker", start: "none" };
const SHAPE: Picker = { name: "LineShapePicker", css: "lineshapepicker", start: "straight" };
const TYPE: Picker = { name: "LineTypePicker", css: "linetypepicker", start: "solid" };
const WIDTH: Picker = { name: "LineWidthPicker", css: "linewidthpicker", start: 1 };
const MARGINS: Picker = { name: "MarginsPicker", css: "marginspicker", start: "Normal", from: "name" };
const SIZES: Picker = { name: "SizesPicker", css: "sizespicker", start: "Letter", from: "name" };
const SPACING: Picker = { name: "SpacingPicker", css: "spacingpicker", start: "1.15", from: "name" };
const COLUMNS: Picker = { name: "ColumnsPicker", css: "columnspicker", start: "One", from: "name" };
const LAYOUT: Picker = { name: "LayoutPicker", css: "layoutpicker", start: "smart", from: "id" };

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** The selection the component itself reports, mapped the way protocol.change maps it. */
function selected(page: Page, p: Picker): Promise<unknown>
{
    return page.evaluate(([tag, from]) =>
    {
        const v = (window as unknown as { handleOf(t: string): { getValue(): unknown } }).handleOf(tag).getValue();
        return from ? (v as Record<string, unknown>)[from] : v;
    }, [tagOf(p.name), p.from ?? ""] as const);
}

/** Opens the picker, picks its third item, and checks what was written to the bound value. */
async function pick(page: Page, p: Picker): Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: p.name, value: { path: "/v" } }, { v: p.start }));

    await page.locator(`${tagOf(p.name)} .${p.css}-trigger`).click();
    await page.locator(`.${p.css}-item`).nth(2).click();

    await expect.poll(() => dm(page, "s", "/v")).not.toEqual(p.start);
    const written = await dm(page, "s", "/v");

    expect(written).toEqual(await selected(page, p));
    await expectCatalogValid(p.name, "value", written);
    expect(await errors(page)).toEqual([]);
}

/** Chooses "Custom…" and checks the custom action carries the current preset name. */
async function custom(page: Page, p: Picker): Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: p.name, value: { path: "/v" }, eventData: { path: "/ev" },
        onCustom: { event: { name: "custom", context: { preset: { path: "/ev/custom" } } } } }, { v: p.start }));

    await page.locator(`${tagOf(p.name)} .${p.css}-trigger`).click();
    await page.locator(`.${p.css}-custom`).click();

    await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "custom",
        context: { preset: p.start } })]);
    expect(await errors(page)).toEqual([]);
}

test.describe("B1 pickers under @a2ui/lit", () =>
{
    test("FontDropdown: picking an item writes its value", async ({ page }) => { await pick(page, FONT); });
    test("LineEndingPicker: picking an item writes its value", async ({ page }) => { await pick(page, ENDING); });
    test("LineShapePicker: picking an item writes its value", async ({ page }) => { await pick(page, SHAPE); });
    test("LineTypePicker: picking an item writes its value", async ({ page }) => { await pick(page, TYPE); });
    test("LineWidthPicker: picking an item writes its value", async ({ page }) => { await pick(page, WIDTH); });
    test("MarginsPicker: picking a preset writes its name", async ({ page }) => { await pick(page, MARGINS); });
    test("SizesPicker: picking a size writes its name", async ({ page }) => { await pick(page, SIZES); });
    test("SpacingPicker: picking a preset writes its name", async ({ page }) => { await pick(page, SPACING); });
    test("ColumnsPicker: picking a preset writes its name", async ({ page }) => { await pick(page, COLUMNS); });
    test("LayoutPicker: picking an algorithm writes its id", async ({ page }) => { await pick(page, LAYOUT); });

    test("MarginsPicker: Custom… sends onCustom with the preset name", async ({ page }) =>
    {
        await custom(page, MARGINS);
    });
    test("SizesPicker: More Paper Sizes… sends onCustom with the size name", async ({ page }) =>
    {
        await custom(page, SIZES);
    });
    test("SpacingPicker: Custom… sends onCustom with the preset name", async ({ page }) =>
    {
        await custom(page, SPACING);
    });
    test("ColumnsPicker: Custom… sends onCustom with the preset name", async ({ page }) =>
    {
        await custom(page, COLUMNS);
    });
});
