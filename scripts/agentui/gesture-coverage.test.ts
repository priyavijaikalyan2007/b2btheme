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

function descriptors(): Descriptor[]
{
    if (!fs.existsSync(REPORT)) { throw new Error(`${REPORT} is missing; run \`npm run build\` first.`); }

    return JSON.parse(fs.readFileSync(REPORT, "utf8")).adapter.descriptors;
}

/** The component name each gesture test's title starts with, as in test("ChatDock: …"). */
function testedComponents(): Set<string>
{
    const titles = fs.readdirSync(SPECS).filter((f) => f.endsWith(".spec.ts"))
        .flatMap((f) => [...fs.readFileSync(path.join(SPECS, f), "utf8").matchAll(/\btest\("([A-Za-z0-9]+): /g)]);

    return new Set(titles.map((m) => m[1]));
}

describe("every interactive catalog component has a gesture test", () =>
{
    const tested = testedComponents();
    const interactive = descriptors().filter((d) => d.twoWay || d.events.length > 0);

    test("the catalog has interactive components to check", () => { expect(interactive.length).toBeGreaterThan(0); });

    for (const d of interactive)
    {
        test(d.name, () =>
        {
            expect(tested.has(d.name), `${d.name} has a two-way value or events but no test("${d.name}: …") `
                + "in tests/a2ui-components/. Drive it like a user there (readiness spec §6.2).").toBe(true);
        });
    }
});
