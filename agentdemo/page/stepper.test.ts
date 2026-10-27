/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: A2uiPlayground / Stepper. A scenario cursor (#30 spec §5.2):
 *    forward one line at a time; back means "reset, then re-apply up to the
 *    previous step", so `back` returns the lines to re-apply.
 */

import { describe, expect, test } from "vitest";

import { Stepper } from "./stepper";
import type { ScenarioLine } from "./scenario";

const LINES: ScenarioLine[] = [{ kind: "user", text: "a" }, { kind: "say", text: "b" }, { kind: "say", text: "c" }];

describe("Stepper", () =>
{
    test("next walks the lines in order and returns null at the end", () =>
    {
        const s = new Stepper(LINES);

        expect([s.next(), s.next(), s.next(), s.next()]).toEqual([...LINES, null]);
        expect(s.done).toBe(true);
    });

    test("back moves the cursor back one and returns the lines before it", () =>
    {
        const s = new Stepper(LINES);

        s.next();
        s.next();

        expect(s.back()).toEqual([LINES[0]]);
        expect(s.cursor).toBe(1);
        expect(s.next()).toEqual(LINES[1]);
    });

    test("back at the start returns nothing and stays at 0", () =>
    {
        const s = new Stepper(LINES);

        expect(s.back()).toEqual([]);
        expect(s.cursor).toBe(0);
    });

    test("reset returns to the start", () =>
    {
        const s = new Stepper(LINES);

        s.next();
        s.reset();

        expect(s.cursor).toBe(0);
        expect(s.done).toBe(false);
    });
});
