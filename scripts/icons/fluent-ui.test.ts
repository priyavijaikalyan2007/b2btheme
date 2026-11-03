// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: FluentUiAdapter. Which upstream files the fluent-ui pack keeps,
 *    and how each becomes a named, categorised icon.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { parseNpmName, keep, collect } from "./fluent-ui.mjs";

const SVG16 = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path d="M0 0h1v1z"/></svg>';
const SVG24 = SVG16.replace(/16/g, "24");

describe("parseNpmName", () =>
{
    test("splits stem, size and style", () =>
    {
        expect(parseNpmName("access_time_20_filled.svg")).toEqual({ stem: "access_time", size: 20, style: "filled" });
        expect(parseNpmName("text_align_left_rtl_16_regular.svg"))
            .toEqual({ stem: "text_align_left_rtl", size: 16, style: "regular" });
    });

    test.each(["README.md", "access_time.svg", "access_time_20_bold.svg", "RTL"])(
        "rejects %s", (f) => expect(parseNpmName(f)).toBeNull());
});

describe("keep", () =>
{
    test.each([
        [16, "regular", true], [24, "filled", true], [20, "regular", false], [32, "filled", false],
        [48, "color", true], [32, "light", false], [12, "color", true],
    ])("%i %s -> %s", (size, style, out) => expect(keep({ size, style })).toBe(out));
});

describe("collect", () =>
{
    function fixture(): { svgDir: string, metaDir: string }
    {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluent-ui-"));
        const svgDir = path.join(root, "icons");
        const metaDir = path.join(root, "assets");
        fs.mkdirSync(path.join(svgDir, "RTL"), { recursive: true });
        fs.writeFileSync(path.join(svgDir, "table_16_regular.svg"), SVG16);
        fs.writeFileSync(path.join(svgDir, "table_24_filled.svg"), SVG24);
        fs.writeFileSync(path.join(svgDir, "table_20_regular.svg"), SVG16);
        fs.writeFileSync(path.join(svgDir, "add_starburst_24_color.svg"), SVG24);
        fs.writeFileSync(path.join(svgDir, "RTL", "table_16_regular.svg"), SVG16);
        fs.mkdirSync(path.join(metaDir, "Table"), { recursive: true });
        fs.writeFileSync(path.join(metaDir, "Table", "metadata.json"), JSON.stringify({
            name: "Table", keyword: "fluent-icon, excel", description: "A data table.", metaphor: ["cell", "row"],
        }));
        return { svgDir, metaDir };
    }

    const catalog = {
        rules: [{ category: "data-charts", pattern: "\\btable\\b" }, { category: "ai", pattern: "\\bstarburst\\b" }],
        overrides: {},
    };

    test("keeps the subset, reads metadata where upstream publishes it, and skips subfolders", () =>
    {
        const { svgDir, metaDir } = fixture();
        const icons = collect(svgDir, metaDir, catalog);
        expect(icons.map((i) => i.id)).toEqual(["ai/add-starburst", "data-charts/table"]);
        const table = icons.find((i) => i.name === "table");
        expect(table.files).toEqual({
            "16-regular": { src: path.join(svgDir, "table_16_regular.svg"), rel: "data-charts/table-16-regular.svg" },
            "24-filled": { src: path.join(svgDir, "table_24_filled.svg"), rel: "data-charts/table-24-filled.svg" },
        });
        expect(table.keywords).toEqual(["table", "cell", "row", "excel"]);
        expect(table.description).toBe("A data table.");
        const star = icons.find((i) => i.name === "add-starburst");
        expect(star.keywords).toEqual(["add", "starburst"]);
        expect(star.description).toBeUndefined();
    });

    test("excluded files are left out, and a stale exclusion throws", () =>
    {
        const { svgDir, metaDir } = fixture();
        const icons = collect(svgDir, metaDir, { ...catalog, exclude: { "table_24_filled.svg": "off-grid" } });
        expect(Object.keys(icons.find((i) => i.name === "table").files)).toEqual(["16-regular"]);
        expect(() => collect(svgDir, metaDir, { ...catalog, exclude: { "gone_16_regular.svg": "x" } })).toThrow(/gone/);
    });

    test("an override naming an unknown category throws", () =>
    {
        const { svgDir, metaDir } = fixture();
        expect(() => collect(svgDir, metaDir, { ...catalog, overrides: { table: "nope" } })).toThrow(/nope/);
    });
});
