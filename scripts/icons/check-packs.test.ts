// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: IconPackCheck. Check [30] accepts a sound pack and names each kind
 *    of breakage.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { checkPack } from "./check-packs.mjs";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h1v1z"/></svg>';
const SPEC = { variants: ["regular", "filled"], square: true, licenseFile: "LICENSE" };
const CLOUD = { variants: ["color"], square: false, licenseFile: "TERMS.md" };
const ALLOWED = new Set(["data-charts", "general"]);

/** A sound pack of `n` data-charts icons plus `general` general ones; returns its dir. */
function pack(n = 20, general = 1, spec = SPEC): string
{
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pack-"));
    const icons = [];
    const variant = spec.variants[0];
    for (let i = 0; i < n + general; i++)
    {
        const category = i < n ? "data-charts" : "general";
        const name = `icon-${i}`;
        const rel = `${category}/${name}-24-${variant}.svg`;
        fs.mkdirSync(path.join(dir, category), { recursive: true });
        fs.writeFileSync(path.join(dir, rel), SVG);
        icons.push({ id: `${category}/${name}`, name, category, files: { [`24-${variant}`]: rel },
            ...(spec.licenseFile === "TERMS.md" ? { legacyPaths: { [`24-${variant}`]: `Old/${name}.svg` } } : {}) });
    }
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ pack: "p", fileCount: icons.length, icons }));
    fs.writeFileSync(path.join(dir, "ATTRIBUTION.md"), "# P\n");
    fs.writeFileSync(path.join(dir, spec.licenseFile), "terms\n");
    if (spec.licenseFile === "TERMS.md")
    {
        const map = Object.fromEntries(icons.map((i) => [Object.values(i.legacyPaths)[0], Object.values(i.files)[0]]));
        fs.writeFileSync(path.join(dir, "legacy-map.json"), JSON.stringify(map));
    }
    return dir;
}

const check = (dir: string, spec = SPEC, allowed: Set<string> | null = ALLOWED) =>
    checkPack(dir, "p", spec, allowed, allowed !== null);

describe("checkPack", () =>
{
    test("a sound pack has no problems", () =>
    {
        expect(check(pack())).toEqual([]);
        expect(check(pack(20, 1, CLOUD), CLOUD, null)).toEqual([]);
    });

    test.each([
        ["a file missing from the manifest",
            (d: string) => fs.writeFileSync(path.join(d, "data-charts/extra-24-regular.svg"), SVG), /not in manifest/],
        ["a manifest entry with no file", (d: string) => fs.rmSync(path.join(d, "data-charts/icon-0-24-regular.svg")),
            /not on disk/],
        ["a bad file name",
            (d: string) => fs.writeFileSync(path.join(d, "data-charts/Table 24.svg"), SVG), /not <name>/],
        ["an unknown category",
            (d: string) => fs.renameSync(path.join(d, "general"), path.join(d, "misc")), /unknown category/],
        ["a wrong viewBox", (d: string) => fs.writeFileSync(path.join(d, "data-charts/icon-0-24-regular.svg"),
            SVG.replace("0 0 24 24", "0 0 20 20")), /viewBox/],
        ["a script", (d: string) => fs.writeFileSync(path.join(d, "data-charts/icon-0-24-regular.svg"),
            SVG.replace("<path", "<script>x()</script><path")), /<script>/],
        ["a missing LICENSE", (d: string) => fs.rmSync(path.join(d, "LICENSE")), /missing LICENSE/],
        ["a consumer host name",
            (d: string) => fs.writeFileSync(path.join(d, "ATTRIBUTION.md"), "static.knobby.io"), /knobby/],
    ])("names %s", (_label, breakIt, expected) =>
    {
        const dir = pack();
        breakIt(dir);
        expect(check(dir).join("\n")).toMatch(expected);
    });

    test("more than 5% in general fails a rule-categorised pack only", () =>
    {
        expect(check(pack(10, 2)).join("\n")).toMatch(/in general/);
        expect(check(pack(10, 2, CLOUD), CLOUD, null)).toEqual([]);
    });

    test("a stylesheet that differs from what the manifest generates fails", () =>
    {
        const spec = { ...SPEC, title: "P", license: "MIT", copyright: "(c) P.",
            css: [{ file: "p.css", match: "-regular$", mask: true }] };
        const dir = pack();
        expect(check(dir, spec).join("\n")).toMatch(/missing p\.css/);
        fs.writeFileSync(path.join(dir, "p.css"), "/* stale */\n");
        expect(check(dir, spec).join("\n")).toMatch(/p\.css is not what the manifest generates/);
    });

    test("a legacy map that disagrees with the manifest fails", () =>
    {
        const dir = pack(3, 0, CLOUD);
        fs.writeFileSync(path.join(dir, "legacy-map.json"), "{}");
        expect(check(dir, CLOUD, null).join("\n")).toMatch(/legacy-map/);
    });
});
