/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: VendorClosure's `bundled` proof. A tree's prebuilt libraries are
 *    listed only when the served files carry the declared versions, and every
 *    directory beside them is declared.
 *
 * @vitest-environment node
 */

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { bundledOf } from "./vendor-closure.mjs";

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

/** A tree with dist/js/<dir>/<file> for each entry. */
function tree(files: Record<string, string>)
{
    const base = mkdtempSync(join(tmpdir(), "vendor-closure-"));

    for (const [file, text] of Object.entries(files))
    {
        mkdirSync(join(base, file, ".."), { recursive: true });
        writeFileSync(join(base, file), text);
    }

    return base;
}

const asset = (bundled: object[], ownDirs = ["dist/js/i18n"]) =>
    ({ name: "lib", version: "1.0.0", bundled, ownDirs });

const FILES = {
    "dist/js/i18n/en.js": "",
    "dist/js/one/one.min.js": "/*! one v2.0.0 */",
    "dist/js/two/two.min.js": "no banner",
};
const ONE = { name: "one", version: "2.0.0", file: "dist/js/one/one.min.js", marker: "one v2.0.0" };
const TWO = { name: "two", version: "3.0.0", file: "dist/js/two/two.min.js", sha256: sha256("no banner"),
    source: "https://example.com/two" };

describe("bundledOf", () =>
{
    test("an asset with no bundled libraries has none", () =>
    {
        expect(bundledOf({ name: "lib" }, tree({}))).toBeNull();
    });

    test("lists each library with its version, url and source", () =>
    {
        expect(bundledOf(asset([ONE, TWO]), tree(FILES))).toEqual({
            one: { version: "2.0.0", url: "/lib/lib-1.0.0/dist/js/one/one.min.js" },
            two: { version: "3.0.0", url: "/lib/lib-1.0.0/dist/js/two/two.min.js", source: "https://example.com/two" },
        });
    });

    test("an unidentified release is listed with a null version and its note", () =>
    {
        const unknown = { ...TWO, version: null, source: undefined, note: "no release matches" };

        expect(bundledOf(asset([ONE, unknown]), tree(FILES))?.two)
            .toEqual({ version: null, url: "/lib/lib-1.0.0/dist/js/two/two.min.js", note: "no release matches" });
    });

    test("fails when a file no longer carries its marker", () =>
    {
        expect(() => bundledOf(asset([{ ...ONE, marker: "one v2.0.1" }, TWO]), tree(FILES)))
            .toThrow(/one: dist\/js\/one\/one\.min\.js no longer carries one v2\.0\.1/);
    });

    test("fails when a file no longer has its hash", () =>
    {
        expect(() => bundledOf(asset([ONE, { ...TWO, sha256: sha256("other") }]), tree(FILES)))
            .toThrow(/two: dist\/js\/two\/two\.min\.js no longer carries its hash/);
    });

    test("fails when a served directory is not declared", () =>
    {
        expect(() => bundledOf(asset([ONE]), tree(FILES)))
            .toThrow(/dist\/js\/two is served but no `bundled` entry names a file in it/);
    });
});
