/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: VditorIntegrity. The hash table covers the tree's scripts and
 *    stylesheets in a fixed order, and each patch matches Vditor's entry
 *    exactly once or the build fails. tests/vditor-integrity.spec.ts checks
 *    the patched loaders in a browser.
 *
 * @vitest-environment node
 */

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { PATCHES, hashTable, patchEntry } from "./vditor-integrity.mjs";

const ENTRY = readFileSync("node_modules/vditor/dist/index.min.js", "utf8");

const sri = (text: string) => "sha384-" + createHash("sha384").update(text).digest("base64");

/** A tree with each file written. */
function tree(files: Record<string, string>)
{
    const base = mkdtempSync(join(tmpdir(), "vditor-integrity-"));

    for (const [file, text] of Object.entries(files))
    {
        mkdirSync(join(base, file, ".."), { recursive: true });
        writeFileSync(join(base, file), text);
    }

    return base;
}

describe("hashTable", () =>
{
    test("hashes the scripts and stylesheets under dist/js and dist/css, sorted by path", () =>
    {
        const base = tree({
            "dist/js/b/b.min.js": "b",
            "dist/js/a/a.min.js": "a",
            "dist/css/content-theme/light.css": "light",
            "dist/js/a/readme.md": "not fetched",
            "dist/index.min.js": "the entry itself",
            "dist/images/emoji/smile.png": "not a script",
        });

        const table = hashTable(base);

        expect(Object.keys(table)).toEqual([
            "dist/css/content-theme/light.css", "dist/js/a/a.min.js", "dist/js/b/b.min.js",
        ]);
        expect(table["dist/js/a/a.min.js"]).toBe(sri("a"));
    });

    test("refuses a name a URL path would encode, since its key would never match", () =>
    {
        const base = tree({ "dist/js/a/a b.js": "", "dist/css/x.css": "" });

        expect(() => hashTable(base)).toThrow("dist/js/a/a b.js has a character a URL path encodes");
    });
});

describe("patchEntry", () =>
{
    test("applies each patch to vditor 3.11.2's entry", () =>
    {
        const patched = patchEntry(ENTRY, { "dist/js/a.js": "sha384-$&x" }, "3.11.2");

        expect(patched.split("i.integrity=__vditorIntegrity(e)").length).toBe(2);
        expect(patched.split("n.integrity=__vditorIntegrity(e)").length).toBe(2);
        expect(patched).not.toContain("n.open(\"GET\",e,!1)");
        expect(patched).toContain("[vditor-integrity] MathJax cannot be loaded");
        // The table is inserted as text: a `$&` in it is not a replacement pattern.
        expect(patched).toContain("{\"dist/js/a.js\":\"sha384-$&x\"}");
    });

    test("fails, naming each patch, when an anchor is missing or doubled", () =>
    {
        const [prelude, script] = PATCHES;
        const changed = ENTRY.replace(prelude.find, "").replace(script.find, script.find + script.find);

        expect(() => patchEntry(changed, {}, "3.11.2")).toThrow(
            /prelude: found 0 times, not once\n {2}script loader: found 2 times, not once/);
    });
});
