/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Feedback under @a2ui/lit, driven like a user (readiness spec §6.2).
 *    A save is an acknowledgement provider (specs/feedback.prd.md F13): the
 *    rating reaches the agent once as onFeedback, and the control shows it
 *    saved only when the agent writes true at feedbackResult. An unanswered
 *    save keeps the person's pick and shows the error. Report loads its
 *    FormDialog dependency, and Copy is the onCopy event.
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness, V } from "../a2ui/adapter-page";

useHarness();

/** Where the component writes its requests and event payloads. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the payload at /ev/`channel` as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

/** A Feedback with its save bound: the agent answers at /answers/feedback. */
const FEEDBACK = { ...EV, targetId: "gen-1", onFeedback: act("rate", "feedback"),
    feedbackResult: { path: "/answers/feedback" } };

/** Mounts Feedback with `props`, and waits for its handle. */
async function mount(page: Page, props: Record<string, unknown>, query: Record<string, string> = {}): Promise<void>
{
    await open(page, "lit", query);
    await send(page, surface("s", { id: "root", component: "Feedback", ...FEEDBACK, ...props }, {}));
    await page.waitForFunction(() =>
        (window as unknown as { handleOf(x: string): unknown }).handleOf("outcrop-feedback") !== undefined);
}

test.describe("Feedback under @a2ui/lit", () =>
{
    test("Feedback: a rating reaches the agent once, and shows saved only when the agent answers true",
        async ({ page }) =>
        {
            await mount(page, {});

            await page.getByRole("button", { name: "Helpful", exact: true }).click();
            await page.getByRole("button", { name: "Submit" }).click();

            await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "rate",
                context: { p: { targetId: "gen-1", feedback: { kind: "rating", sentiment: "positive",
                    timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/) } } } })]);
            await expect(page.locator(".feedback")).toHaveAttribute("aria-busy", "true");
            await expect(page.getByRole("status")).toHaveText("");

            await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/feedback",
                value: true } }]);

            await expect(page.getByRole("status")).toHaveText("Saved");
            await expect(page.getByRole("button", { name: "Not helpful" })).toBeDisabled();
            expect(await actions(page)).toHaveLength(1);
            expect(await errors(page)).toEqual([]);
        });

    test("Feedback: a save the agent never answers keeps the pick and shows the error", async ({ page }) =>
    {
        await mount(page, { commit: "once", scale: "stars" }, { providerTimeoutMs: "500" });

        await page.getByRole("radio", { name: "4 of 5 stars" }).click();

        await expect(page.getByRole("alert")).toContainText("Could not save");
        await expect(page.getByRole("radio", { name: "4 of 5 stars" })).toHaveAttribute("aria-checked", "true");
        await expect(page.getByRole("radio", { name: "5 of 5 stars" })).toBeEnabled();
        expect(await errors(page)).toEqual([expect.objectContaining({ code: "OUTCROP_PROVIDER_TIMEOUT" })]);
    });

    test("Feedback: Report opens its FormDialog and sends the report as one save", async ({ page }) =>
    {
        await mount(page, {});

        await page.getByRole("button", { name: "Report a problem" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("combobox").selectOption("Inaccurate");
        await dialog.getByRole("button", { name: "Submit" }).click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "rate",
            context: { p: expect.objectContaining({ feedback: expect.objectContaining({ kind: "report",
                category: "Inaccurate" }) }) } })]);
        await send(page, [{ version: V, updateDataModel: { surfaceId: "s", path: "/answers/feedback", value: true } }]);

        await expect(page.getByRole("button", { name: "Reported" })).toBeDisabled();
        expect(await errors(page)).toEqual([]);
    });

    test("Feedback: Copy sends onCopy with the targetId", async ({ page }) =>
    {
        await mount(page, { showCopy: true, onCopy: act("copied", "copy") });

        await page.getByRole("button", { name: "Copy" }).click();

        await expect.poll(() => actions(page)).toEqual([expect.objectContaining({ name: "copied",
            context: { p: { targetId: "gen-1" } } })]);
        expect(await errors(page)).toEqual([]);
    });
});
