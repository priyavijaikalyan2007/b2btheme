/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: AgentUiNoManifest. Every component directory has a manifest or a
 *    recorded reason for having none (readiness step 5, ADR-243).
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

import { NO_MANIFEST, manifestCoverageProblems } from "./no-manifest.mjs";

const COMPONENTS = join(__dirname, "..", "..", "components");

describe("manifest coverage (ADR-243)", () =>
{
    test("the fleet: every component has a manifest or exactly one entry", () =>
    {
        const dirs = readdirSync(COMPONENTS, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
        const withManifest = new Set(dirs.filter((d) => existsSync(join(COMPONENTS, d, `${d}.manifest.ts`))));

        expect(manifestCoverageProblems(dirs, withManifest)).toEqual([]);
    });

    test("a component with neither a manifest nor an entry is reported", () =>
    {
        expect(manifestCoverageProblems(["newthing"], new Set()))
            .toContainEqual(expect.stringMatching(/components\/newthing has no manifest/));
    });

    test("an entry for a component that has a manifest, or no directory, is reported", () =>
    {
        expect(manifestCoverageProblems(["toast"], new Set(["toast"])))
            .toContainEqual(expect.stringMatching(/toast has a manifest and is still listed/));
        expect(manifestCoverageProblems([], new Set()))
            .toContainEqual(expect.stringMatching(/toast is listed .* does not exist/));
    });

    test("every reason is a sentence", () =>
    {
        expect(NO_MANIFEST.size).toBe(14);
        expect([...NO_MANIFEST].filter(([, reason]) => !/^[A-Z].{10,}\.$/.test(reason))).toEqual([]);
    });
});
