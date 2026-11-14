/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: LibLicenses. The license text of every package inside a /lib/
 *    asset, committed in cdn/licenses/ and served at /licenses/ (apps report
 *    2026-11-14, item 4).
 */
// @vitest-environment node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, test } from "vitest";

import {
    LICENSE_FILE, applyPlan, entryOf, licensePlan, licensesField, readIndex, readLicenseSource, treeProblems,
    unrecordedProblems,
} from "./lib-licenses.mjs";

const MIT = { license: "MIT", files: { LICENSE: Buffer.from("MIT text") } };
const NONE = { license: "MIT", files: {} };

describe("license file names", () =>
{
    test("match the forms packages ship, and not a script named after them", () =>
    {
        for (const name of ["LICENSE", "LICENSE.md", "LICENSE.txt", "LICENSE-MPL", "license", "LICENCE", "COPYING", "NOTICE"])
        {
            expect(LICENSE_FILE.test(name)).toBe(true);
        }

        for (const name of ["license-update.js", "LICENSE.js", "README.md", "package.json"])
        {
            expect(LICENSE_FILE.test(name)).toBe(false);
        }
    });

    test("readLicenseSource takes the SPDX expression and every license file, sorted", () =>
    {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lib-licenses-"));

        fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ license: "(MPL-2.0 OR Apache-2.0)" }));
        fs.writeFileSync(path.join(dir, "LICENSE-MPL"), "mpl");
        fs.writeFileSync(path.join(dir, "LICENSE"), "apache");
        fs.writeFileSync(path.join(dir, "license-update.js"), "code");

        const source = readLicenseSource(dir);

        expect(source.license).toBe("(MPL-2.0 OR Apache-2.0)");
        expect(Object.keys(source.files)).toEqual(["LICENSE", "LICENSE-MPL"]);
    });
});

describe("licensePlan", () =>
{
    test("a new package version is added, and an unused one is stray", () =>
    {
        const index = { "old@1.0.0": entryOf(MIT) };
        const plan = licensePlan(index, new Map([["new@2.0.0", MIT]]), new Set());

        expect(plan.problems).toEqual([]);
        expect([...plan.add.keys()]).toEqual(["new@2.0.0"]);
        expect(plan.stray).toEqual(["old@1.0.0"]);
        expect(unrecordedProblems(plan).join("\n")).toMatch(/new@2\.0\.0 is served.*lib:record[\s\S]*old@1\.0\.0 is in/);
    });

    test("a deprecated version keeps its text after node_modules moved on", () =>
    {
        const index = { "katex@0.19.0": entryOf(MIT), "katex@0.19.1": entryOf(MIT) };
        const plan = licensePlan(index, new Map([["katex@0.19.1", MIT]]), new Set(["katex@0.19.0"]));

        expect(plan).toEqual({ problems: [], add: new Map(), stray: [] });
    });

    test("a deprecated version with no text is a lost file, not something to add", () =>
    {
        const plan = licensePlan({}, new Map(), new Set(["katex@0.19.0"]));

        expect(plan.problems.join("\n")).toMatch(/katex@0\.19\.0 is in a deprecated entry.*Restore it from git/);
    });

    test("a package with no license file needs a saved text that names its source", () =>
    {
        expect(licensePlan({}, new Map([["@microsoft/signalr@8.0.0", NONE]]), new Set()).problems.join("\n"))
            .toContain("ships no license file. Save its source repository's license");

        const unsourced = { "@microsoft/signalr@8.0.0": entryOf(MIT) };

        expect(licensePlan(unsourced, new Map([["@microsoft/signalr@8.0.0", NONE]]), new Set()).problems.join("\n"))
            .toContain("must name its `source`");

        const sourced = { "@microsoft/signalr@8.0.0": { ...entryOf(MIT), source: "https://example.test/LICENSE.txt" } };

        expect(licensePlan(sourced, new Map([["@microsoft/signalr@8.0.0", NONE]]), new Set()).problems).toEqual([]);
    });

    test("a text or an SPDX expression that changed under the same version fails", () =>
    {
        const index = { "a@1.0.0": entryOf(MIT) };
        const changed = { license: "MIT", files: { LICENSE: Buffer.from("other") } };

        expect(licensePlan(index, new Map([["a@1.0.0", changed]]), new Set()).problems.join("\n"))
            .toContain("differ from the package's own");
        expect(licensePlan(index, new Map([["a@1.0.0", { ...MIT, license: "ISC" }]]), new Set()).problems.join("\n"))
            .toMatch(/records "MIT", but its package.json says "ISC"/);
    });
});

describe("committed tree", () =>
{
    test("treeProblems finds a missing file, a changed file and an unnamed file", () =>
    {
        const index = { "a@1.0.0": entryOf(MIT), "b@1.0.0": entryOf(MIT) };
        const bytes = { "a@1.0.0/LICENSE": Buffer.from("edited") };
        const problems = treeProblems(index, (key, file) => bytes[`${key}/${file}`] ?? null,
            ["a@1.0.0/LICENSE", "c@1.0.0/LICENSE"]);

        expect(problems).toEqual([
            "cdn/licenses/a@1.0.0/LICENSE does not match its hash in cdn/licenses.json.",
            "cdn/licenses/b@1.0.0/LICENSE is missing. cdn/licenses.json names it.",
            "cdn/licenses/c@1.0.0/LICENSE is not named in cdn/licenses.json.",
        ]);
    });

    test("applyPlan writes new texts, removes stray ones and their empty scope", () =>
    {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "lib-licenses-"));

        fs.mkdirSync(path.join(root, "cdn/licenses/@old/pkg@1.0.0"), { recursive: true });
        fs.writeFileSync(path.join(root, "cdn/licenses/@old/pkg@1.0.0/LICENSE"), "MIT text");

        const index = applyPlan({ "@old/pkg@1.0.0": entryOf(MIT) },
            { problems: [], add: new Map([["@new/pkg@2.0.0", MIT]]), stray: ["@old/pkg@1.0.0"] }, root);

        expect(Object.keys(index)).toEqual(["@new/pkg@2.0.0"]);
        expect(readIndex(root)).toEqual(index);
        expect(fs.readFileSync(path.join(root, "cdn/licenses/@new/pkg@2.0.0/LICENSE"), "utf8")).toBe("MIT text");
        expect(fs.existsSync(path.join(root, "cdn/licenses/@old"))).toBe(false);
    });
});

describe("manifest field", () =>
{
    test("names each package's SPDX expression and served files, keyed like packages", () =>
    {
        const index = { "@scope/a@1.0.0": { license: "(MPL-2.0 OR Apache-2.0)", files: { LICENSE: "x", "LICENSE-MPL": "y" } } };

        expect(licensesField({ "@scope/a": "1.0.0" }, index)).toEqual({ "@scope/a": {
            license: "(MPL-2.0 OR Apache-2.0)",
            files: ["/licenses/@scope/a@1.0.0/LICENSE", "/licenses/@scope/a@1.0.0/LICENSE-MPL"] } });
        expect(() => licensesField({ b: "1.0.0" }, index)).toThrow(/b@1\.0\.0 has no entry/);
    });

    test("the committed index covers every package of the committed record's deprecated entries", () =>
    {
        const index = readIndex();
        const record = JSON.parse(fs.readFileSync("cdn/lib-versions.json", "utf8"));
        const missing = record.deprecated
            .flatMap((entry: { packages: Record<string, string> }) => Object.entries(entry.packages))
            .map(([name, version]: [string, string]) => `${name}@${version}`)
            .filter((key: string) => !(key in index));

        expect(missing).toEqual([]);
    });
});
