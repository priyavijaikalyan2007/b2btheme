/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the seven B2 date and time pickers under @a2ui/lit (readiness step 2
 * B2, ADR-227). Each is used like a user; the value written back must match
 * what the component shows and pass the catalog schema. The clearable four
 * (DatePicker, TimePicker, PeriodPicker, SprintPicker) mount empty on an
 * absent path and clear when the agent deletes it; DatePicker and TimePicker,
 * whose inputs a user can empty, delete the path when the user clears them.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, dm, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";
import { expectCatalogValid } from "../a2ui/catalog-valid";

useHarness();

/** The component's own getValue(), with Dates as ISO strings, as the wire carries them. */
function shown(page: Page, tag: string): Promise<unknown>
{
    return page.evaluate((t) => JSON.parse(JSON.stringify(
        (window as unknown as { handleOf(x: string): { getValue(): unknown } }).handleOf(t).getValue() ?? null)), tag);
}

async function deletePath(page: Page): Promise<void>
{
    await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/v" } }]);
}

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with value bound to /v and `data` in the model, and waits for its handle. */
async function mount(page: Page, name: string, data: Record<string, unknown>, more: Record<string, unknown> = {}):
    Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, value: { path: "/v" }, ...more }, data));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

test.describe("B2 date and time pickers under @a2ui/lit", () =>
{
    test("DatePicker: mounts empty on an absent path; a picked day writes an ISO date", async ({ page }) =>
    {
        await mount(page, "DatePicker", {});
        expect(await shown(page, "outcrop-date-picker")).toBeNull();

        await page.locator("outcrop-date-picker .datepicker-toggle").click();
        await page.locator(".datepicker-day:not(.datepicker-day-disabled)").nth(10).click();

        await expect.poll(() => dm(page, "s", "/v")).toEqual(expect.any(String));
        expect(await dm(page, "s", "/v")).toEqual(await shown(page, "outcrop-date-picker"));
        await expectCatalogValid("DatePicker", "value", await dm(page, "s", "/v"));
        expect(await errors(page)).toEqual([]);
    });

    test("DatePicker: the user emptying the input deletes the path; the agent deleting it clears", async ({ page }) =>
    {
        await mount(page, "DatePicker", { v: "2026-03-10T00:00:00.000Z" });

        await page.locator("outcrop-date-picker .datepicker-input").fill("");
        await page.locator("outcrop-date-picker .datepicker-input").blur();
        await expect.poll(() => dm(page, "s", "/v")).toBeUndefined();

        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/v", value: "2026-04-01T00:00:00.000Z" } }]);
        await expect.poll(() => shown(page, "outcrop-date-picker")).not.toBeNull();
        await deletePath(page);
        await expect.poll(() => shown(page, "outcrop-date-picker")).toBeNull();
        expect(await errors(page)).toEqual([]);
    });

    test("TimePicker: a typed time writes its hours, minutes and seconds", async ({ page }) =>
    {
        await mount(page, "TimePicker", { v: { hours: 9, minutes: 30, seconds: 0 } });

        await page.locator("outcrop-time-picker .timepicker-input").fill("10:45:15");
        await page.locator("outcrop-time-picker .timepicker-input").blur();

        await expect.poll(() => dm(page, "s", "/v")).toEqual({ hours: 10, minutes: 45, seconds: 15 });
        await expectCatalogValid("TimePicker", "value", await dm(page, "s", "/v"));
        expect(await errors(page)).toEqual([]);
    });

    test("TimePicker: the user emptying the input deletes the path; an absent path mounts empty", async ({ page }) =>
    {
        await mount(page, "TimePicker", { v: { hours: 9, minutes: 30, seconds: 0 } });

        await page.locator("outcrop-time-picker .timepicker-input").fill("");
        await page.locator("outcrop-time-picker .timepicker-input").blur();

        await expect.poll(() => dm(page, "s", "/v")).toBeUndefined();
        expect(await shown(page, "outcrop-time-picker")).toBeNull();
        expect(await errors(page)).toEqual([]);
    });

    test("TimePicker: choosing a timezone sends onTimezone with its IANA name", async ({ page }) =>
    {
        await mount(page, "TimePicker", { v: { hours: 9, minutes: 30, seconds: 0 } }, { showTimezone: true,
            eventData: { path: "/ev" }, onTimezone: { event: { name: "tz", context: { zone: { path: "/ev/timezone" } } } } });

        await page.locator("outcrop-time-picker .timepicker-tz-input").click();
        await page.locator(".timepicker-tz-option").nth(1).dispatchEvent("pointerdown");

        const zone = await page.evaluate(() =>
            (window as unknown as { handleOf(t: string): { getTimezone(): string } }).handleOf("outcrop-time-picker")
                .getTimezone());
        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "tz", context: { zone } })]);
        expect(await errors(page)).toEqual([]);
    });

    test("PeriodPicker: mounts empty; a picked period writes it; the agent deleting the path clears", async ({ page }) =>
    {
        await mount(page, "PeriodPicker", {});
        expect(await shown(page, "outcrop-period-picker")).toBeNull();

        await page.locator("outcrop-period-picker input").click();
        await page.locator(".periodpicker-cell").first().click();

        await expect.poll(() => dm(page, "s", "/v")).toEqual(expect.objectContaining({ year: expect.any(Number) }));
        expect(await dm(page, "s", "/v")).toEqual(await shown(page, "outcrop-period-picker"));
        await expectCatalogValid("PeriodPicker", "value", await dm(page, "s", "/v"));

        await deletePath(page);
        await expect.poll(() => shown(page, "outcrop-period-picker")).toBeNull();
        expect(await errors(page)).toEqual([]);
    });

    test("SprintPicker: mounts empty; a picked sprint writes it; the agent deleting the path clears", async ({ page }) =>
    {
        await mount(page, "SprintPicker", {}, { anchorDate: "2026-01-05" });
        expect(await shown(page, "outcrop-sprint-picker")).toBeNull();

        await page.locator("outcrop-sprint-picker input").click();
        await page.locator(".sprintpicker-list-item").nth(1).click();

        await expect.poll(() => dm(page, "s", "/v")).toEqual(expect.objectContaining({ sprintIndex: expect.any(Number) }));
        expect(await dm(page, "s", "/v")).toEqual(await shown(page, "outcrop-sprint-picker"));
        await expectCatalogValid("SprintPicker", "value", await dm(page, "s", "/v"));

        await deletePath(page);
        await expect.poll(() => shown(page, "outcrop-sprint-picker")).toBeNull();
        expect(await errors(page)).toEqual([]);
    });

    test("DurationPicker: a typed duration writes its units", async ({ page }) =>
    {
        await mount(page, "DurationPicker", { v: { h: 1, m: 30 } });

        await page.locator("outcrop-duration-picker .durationpicker-input").fill("2h 15m");
        await page.locator("outcrop-duration-picker .durationpicker-input").blur();

        await expect.poll(() => dm(page, "s", "/v")).toEqual(expect.objectContaining({ h: 2, m: 15 }));
        expect(await dm(page, "s", "/v")).toEqual(await shown(page, "outcrop-duration-picker"));
        await expectCatalogValid("DurationPicker", "value", await dm(page, "s", "/v"));
        expect(await errors(page)).toEqual([]);
    });

    test("CronPicker: choosing a preset writes its expression", async ({ page }) =>
    {
        await mount(page, "CronPicker", { v: "0 * * * * *" });

        await page.locator("outcrop-cron-picker .cronpicker-presets select").selectOption("0 0 12 * * *");

        await expect.poll(() => dm(page, "s", "/v")).toBe("0 0 12 * * *");
        await expectCatalogValid("CronPicker", "value", "0 0 12 * * *");
        expect(await errors(page)).toEqual([]);
    });

    test("TimezonePicker: choosing a zone writes its IANA name", async ({ page }) =>
    {
        await mount(page, "TimezonePicker", { v: "UTC" });

        await page.locator("outcrop-timezone-picker .timezonepicker-toggle").click();
        await page.locator(".timezonepicker-option:not(.timezonepicker-option-selected)").nth(1).click();

        await expect.poll(() => dm(page, "s", "/v")).not.toBe("UTC");
        expect(await dm(page, "s", "/v")).toEqual(await shown(page, "outcrop-timezone-picker"));
        await expectCatalogValid("TimezonePicker", "value", await dm(page, "s", "/v"));
        expect(await errors(page)).toEqual([]);
    });
});
