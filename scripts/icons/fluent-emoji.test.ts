// @vitest-environment node
/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: FluentEmojiAdapter. How skin-tone folders become variants, groups
 *    become categories, and each upstream asset becomes a named icon.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { toneVariant, groupCategory, collect, CATEGORIES } from "./fluent-emoji.mjs";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M0 0h1v1z"/></svg>';
const TONES = ["Default", "Light", "Medium-Light", "Medium", "Medium-Dark", "Dark"];

describe("toneVariant", () =>
{
    test.each([
        ["Default", "color"], ["Light", "color-tone-light"], ["Medium-Light", "color-tone-medium-light"],
        ["Medium", "color-tone-medium"], ["Medium-Dark", "color-tone-medium-dark"], ["Dark", "color-tone-dark"],
    ])("%s -> %s", (folder, variant) =>
    {
        expect(toneVariant(folder)).toBe(variant);
    });

    test("an unknown tone throws", () =>
    {
        expect(() => toneVariant("Purple")).toThrow(/unknown skin-tone/);
    });
});

describe("groupCategory", () =>
{
    test.each([
        ["Smileys & Emotion", "smileys-emotion"], ["People & Body", "people-body"],
        ["Animals & Nature", "animals-nature"], ["Food & Drink", "food-drink"],
        ["Travel & Places", "travel-places"], ["Activities", "activities"], ["Objects", "objects"],
        ["Symbols", "symbols"], ["Flags", "flags"],
    ])("%s -> %s", (group, category) =>
    {
        expect(groupCategory(group)).toBe(category);
        expect(CATEGORIES).toContain(category);
    });

    test("an unknown group throws", () =>
    {
        expect(() => groupCategory("Component")).toThrow(/unknown emoji group/);
    });
});

describe("collect", () =>
{
    /** Writes an asset folder: metadata plus Color/ or one <Tone>/Color/ per tone. */
    function asset(root: string, folder: string, meta: object, tones: string[] | null): void
    {
        const dir = path.join(root, folder);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(meta));
        const stem = folder.toLowerCase().replace(/ /g, "_");
        for (const tone of tones ?? [null])
        {
            const colorDir = tone ? path.join(dir, tone, "Color") : path.join(dir, "Color");
            fs.mkdirSync(colorDir, { recursive: true });
            const suffix = tone ? `_${tone.toLowerCase()}` : "";
            fs.writeFileSync(path.join(colorDir, `${stem}_color${suffix}.svg`), SVG);
        }
    }

    function fixture(): string
    {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), "fluent-emoji-"));
        asset(root, "1st place medal", { cldr: "1st place medal", group: "Activities", glyph: "🥇",
            unicode: "1f947", keywords: ["1st place medal", "gold", "Medal"], tts: "1st place medal" }, null);
        asset(root, "Artist", { cldr: "artist", group: "People & Body", glyph: "🧑‍🎨",
            unicode: "1f9d1 200d 1f3a8", keywords: ["artist", "palette"], tts: "artist" }, TONES);
        return root;
    }

    test("names, categorises and keys plain and toned emoji", () =>
    {
        const icons = collect(fixture(), { exclude: {} });
        expect(icons.map((i) => i.id)).toEqual(["activities/1st-place-medal", "people-body/artist"]);
        const [medal, artist] = icons;
        expect(medal.files["32-color"].rel).toBe("activities/1st-place-medal-32-color.svg");
        expect(medal.keywords).toEqual(["1st place medal", "gold", "medal"]);
        expect(medal.glyph).toBe("🥇");
        expect(Object.keys(artist.files).sort()).toEqual([
            "32-color", "32-color-tone-dark", "32-color-tone-light", "32-color-tone-medium",
            "32-color-tone-medium-dark", "32-color-tone-medium-light",
        ]);
        expect(artist.files["32-color-tone-dark"].src).toMatch(/Artist\/Dark\/Color\/artist_color_dark\.svg$/);
    });

    test("an excluded file is left out, and a stale exclusion throws", () =>
    {
        const root = fixture();
        const icons = collect(root, { exclude: { "Artist/Dark/Color/artist_color_dark.svg": "off grid" } });
        expect(icons[1].files["32-color-tone-dark"]).toBeUndefined();
        expect(Object.keys(icons[1].files)).toHaveLength(5);
        expect(() => collect(root, { exclude: { "Gone/Color/gone_color.svg": "x" } })).toThrow(/names no upstream/);
    });

    test("a tone folder without exactly one Color SVG throws", () =>
    {
        const root = fixture();
        fs.rmSync(path.join(root, "Artist", "Light", "Color", "artist_color_light.svg"));
        expect(() => collect(root, { exclude: {} })).toThrow(/Artist\/Light\/Color holds 0 SVGs/);
    });

    test("two emoji with the same name throw", () =>
    {
        const root = fixture();
        asset(root, "Artist 2", { cldr: "Artist", group: "People & Body", glyph: "x", unicode: "1",
            keywords: [], tts: "artist" }, null);
        expect(() => collect(root, { exclude: {} })).toThrow(/both name "artist"/);
    });
});
