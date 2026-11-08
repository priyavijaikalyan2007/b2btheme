/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Feedback in a real browser (specs/feedback.prd.md §6), on its demo
 *    page: one call per rating in each commit mode, a failing save and its
 *    retry, locking and reset(), the stars by keyboard, the rating and report
 *    dialogs over FormDialog with focus returned, and Fluent icons drawn.
 */

import { test, expect, type Page } from "@playwright/test";

/** The lines the demo logged for one target. */
async function saves(page: Page, targetId: string): Promise<string[]>
{
    const log = await page.locator("#demo-feedback-log").textContent() ?? "";
    return log.split("\n").filter((l) => l.startsWith(`${targetId} `));
}

test.describe("Feedback", () =>
{
    test.beforeEach(async ({ page }) =>
    {
        await page.goto("/demo/components/feedback.html");
    });

    test("submit mode sends the last pick and the comment once, then locks", async ({ page }) =>
    {
        const root = page.locator("#demo-feedback-thumbs");
        await root.getByRole("button", { name: "Helpful", exact: true }).click();
        await root.getByRole("button", { name: "Not helpful" }).click();
        await root.getByRole("button", { name: "Add a comment" }).click();
        await root.getByRole("textbox").fill("The second table is missing.");
        await root.getByRole("button", { name: "Submit" }).click();

        await expect(root.locator(".feedback")).toHaveAttribute("aria-busy", "true");
        await expect(root.getByRole("status")).toHaveText("Saved");
        expect(await saves(page, "generation-1")).toHaveLength(1);
        expect((await saves(page, "generation-1"))[0]).toContain('"sentiment":"negative"');
        expect((await saves(page, "generation-1"))[0]).toContain('"comment":"The second table is missing."');
        await expect(root.getByRole("button", { name: "Not helpful" })).toBeDisabled();
        await expect(root.getByRole("button", { name: "Not helpful" })).toHaveAttribute("aria-pressed", "true");
        await expect(root.getByRole("button", { name: "Submit" })).toBeHidden();
    });

    test("once mode: arrows move between the stars, Space sends the rating, once", async ({ page }) =>
    {
        const root = page.locator("#demo-feedback-stars");
        await expect(root.locator(".feedback-summary")).toHaveText("4.3 (128 ratings)");
        await root.getByRole("radio", { name: "1 of 5 stars" }).focus();
        await page.keyboard.press("ArrowRight");
        await page.keyboard.press("ArrowRight");
        expect(await saves(page, "document-7")).toHaveLength(0);

        await page.keyboard.press("Space");
        await expect(root.getByRole("status")).toHaveText("Saved");
        expect(await saves(page, "document-7")).toEqual([expect.stringContaining('"score":3,"maxScore":5')]);
        await expect(root.getByRole("radio", { name: "3 of 5 stars" })).toHaveAttribute("aria-checked", "true");
        await expect(root.getByRole("radio", { name: "5 of 5 stars" })).toBeDisabled();
    });

    test("a failed save shows the error, keeps the input, and the retry saves", async ({ page }) =>
    {
        const root = page.locator("#demo-feedback-fail");
        await root.getByRole("button", { name: "Helpful", exact: true }).click();
        await root.getByRole("button", { name: "Add a comment" }).click();
        await root.getByRole("textbox").fill("Kept");
        await root.getByRole("button", { name: "Submit" }).click();

        await expect(root.getByRole("alert")).toHaveText("Could not save: the server did not answer");
        await expect(root.getByRole("button", { name: "Helpful", exact: true })).toHaveAttribute("aria-pressed", "true");
        await expect(root.getByRole("textbox")).toHaveValue("Kept");
        await expect(root.getByRole("status")).toHaveText("");

        await root.getByRole("button", { name: "Submit" }).click();
        await expect(root.getByRole("status")).toHaveText("Saved");
        await expect(root.getByRole("alert")).toBeHidden();
        expect(await saves(page, "generation-2")).toHaveLength(1);
    });

    test("a stored rating is locked until reset()", async ({ page }) =>
    {
        const root = page.locator("#demo-feedback-saved");
        await expect(root.getByRole("button", { name: "Helpful", exact: true })).toBeDisabled();
        await expect(root.locator(".feedback-summary")).toHaveText(["12 likes", "1 dislike"]);

        await page.locator("#demo-feedback-reset").click();
        await expect(root.getByRole("button", { name: "Helpful", exact: true })).toBeEnabled();
        await expect(root.getByRole("button", { name: "Helpful", exact: true })).toHaveAttribute("aria-pressed", "false");
    });

    test("the rating dialog saves the rating and comment together; Escape cancels and returns focus", async ({ page }) =>
    {
        const opener = page.locator("#demo-feedback-dialog");
        await opener.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();
        await expect(page.locator("#demo-feedback-dialog-result")).toHaveText("Cancelled");
        await expect(opener).toBeFocused();

        await opener.click();
        await dialog.getByRole("radio", { name: "7 of 10 stars" }).click();
        await dialog.getByRole("textbox").fill("Clear layout");
        await dialog.getByRole("button", { name: "Submit" }).click();
        await expect(page.locator("#demo-feedback-dialog-result")).toHaveText("Saved 7 of 10");
        expect(await saves(page, "diagram-9")).toEqual([expect.stringContaining('"comment":"Clear layout"')]);
    });

    test("Report opens a dialog; once saved the button reads Reported and is disabled", async ({ page }) =>
    {
        const root = page.locator("#demo-feedback-thumbs");
        await root.getByRole("button", { name: "Report a problem" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("combobox").selectOption("Harmful or unsafe");
        await dialog.getByRole("button", { name: "Submit" }).click();

        await expect(root.getByRole("button", { name: "Reported" })).toBeDisabled();
        expect(await saves(page, "generation-1")).toEqual([expect.stringContaining(
            '"kind":"report","category":"Harmful or unsafe"')]);
    });

    test("Fluent icons draw as masks over the text colour", async ({ page }) =>
    {
        const icon = page.locator("#demo-feedback-fluent i.fluent-ui-thumb-like-16-regular");
        await expect(icon).toBeVisible();
        const mask = await icon.evaluate((el) => getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage);
        expect(mask).toContain("thumb-like-16-regular.svg");
    });
});
