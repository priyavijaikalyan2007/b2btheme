// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: IconPackLib. Naming, SVG safety and categorisation rules every
 *    icon pack is built and checked with (specs/icon-packs.plan.md).
 */

import { describe, expect, test } from "vitest";
import { slugify, iconFileName, parseIconFileName, validateSvg, categorize } from "./lib.mjs";

const OK = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">'
    + '<path d="M0 0h24v24H0z"/></svg>';
const svg = (inner: string, attrs = "", viewBox = "0 0 24 24") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${attrs}>${inner}</svg>`;

describe("slugify", () =>
{
    test.each([
        ["Access Time", "access-time"], ["access_time", "access-time"],
        ["Flag: United States", "flag-united-states"], ["Piñata", "pinata"],
        ["keycap: #", "keycap-hash"], ["keycap: *", "keycap-asterisk"],
        ["Rock & Roll", "rock-and-roll"], ["1st place medal", "1st-place-medal"],
        ["AWS Fargate", "aws-fargate"],
    ])("%s -> %s", (input, out) =>
    {
        expect(slugify(input)).toBe(out);
    });

    test("throws when nothing is left", () =>
    {
        expect(() => slugify("!!!")).toThrow();
    });
});

describe("file names", () =>
{
    const V = ["regular", "filled", "color"];

    test("round-trips", () =>
    {
        expect(iconFileName("table", 24, "regular")).toBe("table-24-regular.svg");
        expect(parseIconFileName("table-24-regular.svg", V))
            .toEqual({ name: "table", size: 24, variant: "regular" });
    });

    test("a name may itself end in digits", () =>
    {
        expect(parseIconFileName("number-1-16-filled.svg", V))
            .toEqual({ name: "number-1", size: 16, variant: "filled" });
    });

    test.each([
        "Table-24-regular.svg", "table 24 regular.svg", "table-24-bold.svg",
        "table-regular.svg", "table-24-regular.png",
    ])("rejects %s", (f) =>
    {
        expect(parseIconFileName(f, V)).toBeNull();
    });

    test("multi-part variants match longest first", () =>
    {
        expect(parseIconFileName("artist-32-color-tone-medium-dark.svg",
            ["color", "color-tone-medium", "color-tone-medium-dark"]))
            .toEqual({ name: "artist", size: 32, variant: "color-tone-medium-dark" });
    });
});

describe("validateSvg", () =>
{
    test("accepts plain artwork and internal gradients", () =>
    {
        expect(validateSvg(OK, 24)).toEqual([]);
        const grad = '<defs><linearGradient id="a"/></defs><rect fill="url(#a)" width="1" height="1"/>';
        expect(validateSvg(svg(grad), 24)).toEqual([]);
    });

    test("sizes by the viewBox; width and height are only a display hint", () =>
    {
        expect(validateSvg(svg("<path/>", ' width="0.25in" height="18"', "0 0 24 24"), 24)).toEqual([]);
    });

    test("accepts px dimensions, decimal viewBoxes and an XML declaration", () =>
    {
        const text = '<?xml version="1.0" encoding="UTF-8"?>'
            + svg("<path/>", ' width="48px" height="48px"', "0 0 48.0 48.0");
        expect(validateSvg(text, 48)).toEqual([]);
    });

    test("non-square artwork needs { square: false } and is sized by its longer side", () =>
    {
        expect(validateSvg(svg("<path/>", "", "0 0 18 20"), 20, { square: false })).toEqual([]);
        expect(validateSvg(svg("<path/>", ' width="52.497" height="52.434"', "0 0 52.497 52.434"),
            52, { square: false })).toEqual([]);
        expect(validateSvg(svg("<path/>", "", "0 0 18 20"), 20).length).toBeGreaterThan(0);
    });

    test.each([
        ["script", svg("<script>alert(1)</script>")],
        ["foreignObject", svg("<foreignObject/>")],
        ["SMIL", svg('<animate attributeName="href" to="javascript:alert(1)"/>')],
        ["event handler", svg("<path/>", ' onload="x()"')],
        ["external href", svg('<use href="https://evil.example/a.svg#x"/>')],
        ["external xlink:href", svg('<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="a.svg#x"/>')],
        ["external url()", svg('<rect style="fill:url(https://evil.example/x)"/>')],
        ["@import", svg("<style>@import url(x.css);</style>")],
        ["doctype", '<!DOCTYPE svg [<!ENTITY x "y">]>' + OK],
        ["wrong size", OK.replace(/24/g, "20")],
        ["not square", svg("<path/>", "", "0 0 24 20")],
        ["not svg", "<html/>"],
        ["malformed", "<svg"],
    ])("rejects %s", (_label, text) =>
    {
        expect(validateSvg(text, 24).length).toBeGreaterThan(0);
    });
});

describe("categorize", () =>
{
    const rules = [
        { category: "media", pattern: "image|video" },
        { category: "data-charts", pattern: "table|chart" },
    ];

    test("first matching rule wins", () =>
    {
        expect(categorize("video-table", "video table", rules, {})).toBe("media");
    });

    test("override beats rules", () =>
    {
        expect(categorize("table", "table", rules, { table: "documents-files" })).toBe("documents-files");
    });

    test("no match is general", () =>
    {
        expect(categorize("zz", "zz", rules, {})).toBe("general");
    });
});
