/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: every component of ours in the built A2UI catalog renders in a
 *    real browser from catalog sample values, with no surface errors and no
 *    console errors (readiness spec §6.1). Generated from dist, so a component
 *    that joins the catalog is covered with no edit here. A component that
 *    cannot render from generic samples gets an OVERRIDES entry with its
 *    reason; nothing is ever skipped.
 */

import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

import { sampleProp } from "../a2ui/sample-values";
import { errors, open, send, surface, useHarness } from "./a2ui/adapter-page";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const DIST = path.join(__dirname, "..", "dist");

function readDist(rel: string): Any
{
    const file = path.join(DIST, rel);

    if (!fs.existsSync(file)) { throw new Error(`${file} is missing; run \`npm run build\` first.`); }

    return JSON.parse(fs.readFileSync(file, "utf8"));
}

const CATALOG = readDist(path.join("a2ui", "catalog", "v1.json"));
const DESCRIPTORS: { name: string; tagName: string }[] = readDist("agentui-report.json").adapter.descriptors;

/** Props a component needs beyond generic samples to render, each with its reason. Empty is the goal. */
const OVERRIDES: Record<string, Record<string, unknown>> = {
    // width and height are CSS lengths, which a generic string sample is not. The first preset sampled
    // is "avatar" (const unions are sorted since B1), the one preset that sizes itself from them.
    SkeletonLoader: { width: "3rem", height: "3rem" },
    // avatarUrl is an image URL, which a generic string sample is not: "a" would 404 and log a console error.
    PersonChip: { avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" },
    // initialVariant must name one of the variants, which independent samples cannot arrange.
    DynamicFormSwitcher: { initialVariant: "a", variants: { a: { label: "A",
        fields: [{ name: "a", label: "A", type: "text" }] } } },
};

/**
 * Components that cannot render in a surface today, each with its issue. They
 * are run as expected failures, so each goes red the day it is fixed and has
 * to be removed from here. Empty is the goal.
 */
const KNOWN_BROKEN: Record<string, string> = {};

/** A literal sample for every data prop; action props and eventData are left unset. */
function sampleProps(name: string): Record<string, unknown>
{
    const own: Record<string, Any> = CATALOG.components[name].allOf[2].properties;

    return Object.fromEntries(Object.entries(own).filter(([, schema]) => Array.isArray(schema.anyOf))
        .map(([prop, schema]) => [prop, sampleProp(prop, schema.anyOf[0], 0, CATALOG, `#/components/${name}/${prop}`)]));
}

useHarness();

for (const d of DESCRIPTORS)
{
    test(`${d.name}: renders from catalog samples in a real browser`, async ({ page }) =>
    {
        test.fail(d.name in KNOWN_BROKEN, KNOWN_BROKEN[d.name]);
        const consoleErrors: string[] = [];

        page.on("console", (m) => { if (m.type() === "error") { consoleErrors.push(m.text()); } });
        await open(page, "lit");
        await send(page, surface("s", { id: "root", component: d.name, ...sampleProps(d.name), ...OVERRIDES[d.name] }));

        const host = page.locator(`${d.tagName} .outcrop-host`).first();

        await expect(host).toBeAttached();
        await expect.poll(async () => { const b = await host.boundingBox(); return b ? b.width * b.height : 0; },
            { message: `${d.name} rendered nothing visible` }).toBeGreaterThan(0);
        expect(await errors(page)).toEqual([]);
        expect(consoleErrors).toEqual([]);
    });
}
