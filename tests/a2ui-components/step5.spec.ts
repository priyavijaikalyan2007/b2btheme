/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * E2E: the components readiness step 5 gives a manifest (specs/agentui-step5.prd.md),
 * under @a2ui/lit. S5-1: TypeBadge (ADR-243).
 */

import { expect, test, type Page } from "@playwright/test";

import { actions, errors, open, send, surface, useHarness } from "../a2ui/adapter-page";

useHarness();

const tagOf = (name: string) => `outcrop-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}`;

/** Mounts `name` with `props`, and waits for its handle. */
async function mount(page: Page, name: string, props: Record<string, unknown>): Promise<void>
{
    await open(page, "lit");
    await send(page, surface("s", { id: "root", component: name, ...props }, {}));
    await page.waitForFunction((t) => (window as unknown as { handleOf(x: string): unknown }).handleOf(t) !== undefined,
        tagOf(name));
}

/** Where the surface components write each event's payload. */
const EV = { eventData: { path: "/ev" } };

/** An action prop that sends `name` with the channel's payload as `p`. */
const act = (name: string, channel: string) => ({ event: { name, context: { p: { path: `/ev/${channel}` } } } });

test.describe("Step 5 components under @a2ui/lit", () =>
{
    test("TypeBadge: renders its type, and clicking a clickable badge sends onClick with its typeKey",
        async ({ page }) =>
        {
            await mount(page, "TypeBadge", { ...EV, typeKey: "strategy.okr", icon: "crosshair", clickable: true,
                onClick: act("type", "click") });

            const badge = page.getByRole("button", { name: "Type: okr" });
            await expect(badge).toBeVisible();
            await badge.press("Enter");

            await expect.poll(() => actions(page)).toEqual([
                expect.objectContaining({ name: "type", context: { p: { typeKey: "strategy.okr" } } })]);
            expect(await errors(page)).toEqual([]);
        });
});
