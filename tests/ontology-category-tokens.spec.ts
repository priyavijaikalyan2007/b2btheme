/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: Ontology relationship category tokens (apps#249). In a real
 *    browser, each `.theme-ontology-category-<name>` badge paints its slot's
 *    background, text and border, in light mode, in dark mode, and inside a
 *    dark subtree of a light page. The eight categories are eight colours.
 */

import { test, expect, type Page } from "@playwright/test";

const SLOTS: Record<string, number> = {
    structural: 1, lifecycle: 2, dependency: 3, custom: 4, strategic: 5, identity: 6, knowledge: 7, ownership: 8,
};

type Paint = { bg: string; fg: string; border: string };

/** Each category badge's paint and its slot's, read inside `scope` ("html" or a dark subtree). */
function paints(page: Page, subtree: boolean): Promise<Record<string, { badge: Paint; slot: Paint }>>
{
    return page.evaluate(({ slots, subtree }) =>
    {
        const host = document.createElement("div");
        if (subtree) { host.setAttribute("data-bs-theme", "dark"); }
        document.body.appendChild(host);

        const read = (cls: string): Paint =>
        {
            const el = document.createElement("span");
            el.className = `badge border ${cls}`;
            el.textContent = "x";
            host.appendChild(el);
            const s = getComputedStyle(el);
            return { bg: s.backgroundColor, fg: s.color, border: s.borderTopColor };
        };
        const out: Record<string, { badge: Paint; slot: Paint }> = {};

        for (const [name, slot] of Object.entries(slots))
        {
            const group = read(`theme-group-${slot}`);
            out[name] = { badge: read(`theme-ontology-category-${name}`), slot: { ...group, border: group.fg } };
        }
        host.remove();
        return out;
    }, { slots: SLOTS, subtree });
}

/** The badges' paint alone, after checking each matches its slot. */
function badges(seen: Record<string, { badge: Paint; slot: Paint }>): Record<string, Paint>
{
    const mismatched = Object.entries(seen).filter(([, p]) => JSON.stringify(p.badge) !== JSON.stringify(p.slot));

    expect(mismatched).toEqual([]);
    return Object.fromEntries(Object.entries(seen).map(([name, p]) => [name, p.badge]));
}

test("ontology category badges paint their slot in light, dark and a dark subtree", async ({ page }) =>
{
    await page.goto("/demo/components/ontologycategories.html");
    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "light"));

    const light = badges(await paints(page, false));
    const subtree = badges(await paints(page, true));

    await page.evaluate(() => document.documentElement.setAttribute("data-bs-theme", "dark"));
    const dark = badges(await paints(page, false));

    expect(new Set(Object.values(light).map((p) => p.bg)).size).toBe(8);
    expect(new Set(Object.values(dark).map((p) => p.bg)).size).toBe(8);
    expect(subtree).toEqual(dark);
    expect(Object.keys(dark).filter((name) => dark[name].bg === light[name].bg)).toEqual([]);
});
