/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the gesture-test coverage gate (readiness spec §6.3). Every
 *    catalog component with a two-way value or an event must be driven like a
 *    user in tests/a2ui-components/, in a test whose title starts with its
 *    catalog name. A component that joins the catalog without one fails here,
 *    by name, so the testing bar cannot erode batch by batch.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
const REPORT = path.join(ROOT, "dist", "agentui-report.json");
const SPECS = path.join(ROOT, "tests", "a2ui-components");

type Descriptor = { name: string; twoWay: boolean; events: unknown[] };

/** A test title that starts with a catalog name and a colon; \x22 is a double quote (the [20] parser misreads them in patterns). */
const TITLE = new RegExp("\\btest\\(\\x22([A-Za-z0-9]+): ", "g");

function descriptors(): Descriptor[]
{
    if (!fs.existsSync(REPORT)) { throw new Error(`${REPORT} is missing; run \`npm run build\` first.`); }

    return JSON.parse(fs.readFileSync(REPORT, "utf8")).adapter.descriptors;
}

/** The component name each gesture test title starts with, such as ChatDock in a ChatDock title. */
function testedComponents(): Set<string>
{
    const titles = fs.readdirSync(SPECS).filter((f) => f.endsWith(".spec.ts"))
        .flatMap((f) => [...fs.readFileSync(path.join(SPECS, f), "utf8").matchAll(TITLE)]);

    return new Set(titles.map((m) => m[1]));
}

describe("every interactive catalog component has a gesture test", () =>
{
    const tested = testedComponents();
    const interactive = descriptors().filter((d) => d.twoWay || d.events.length > 0);

    test("the catalog has interactive components to check", () => { expect(interactive.length).toBeGreaterThan(0); });

    test.each(interactive.map((d) => d.name))("%s has a gesture test", (name) =>
    {
        expect(tested.has(name), `${name} has a two-way value or events but no gesture test titled `
            + `${name}: … in tests/a2ui-components/. Drive it like a user there (readiness spec §6.2).`).toBe(true);
    });
});
