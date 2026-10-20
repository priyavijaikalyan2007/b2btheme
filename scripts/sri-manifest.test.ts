/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-FileCopyrightText: 2026 Outcrop Inc
 * SPDX-License-Identifier: MIT
 */
/**
 * ⚓ TESTS: the third-party SRI manifest
 *
 * DEBT-SEC-5 (ADR-189). Tests for scripts/sri-manifest.mjs and the data in
 * scripts/third-party-sri.json.
 *
 * NOTHING HERE TOUCHES THE NETWORK. Verifying a hash against the live build
 * is what `npm run sri:verify` is for, and it is deliberately outside the
 * default gate: a test that fetches nine URLs turns a third party being
 * unreachable into a red suite. These cases prove the computation and the
 * shape of the data, which are the parts this repository owns.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { sriOf, readManifest, assetList } from "./sri-manifest.mjs";

describe("sriOf", () =>
{
    // Computed independently with `openssl dgst -sha384 -binary | base64`
    // before this file existed, so the case does not grade the function
    // against itself.
    test("hashes known bytes to the published form", () =>
    {
        expect(sriOf(Buffer.from("hello")))
            .toBe("sha384-WeF0h3dEjGnea4ANejO7+5/xtGPkQ1TDVTvNucZm+pASWjx5+QOXvfX2oT3oKGhP");
    });

    test("the empty buffer has a hash, and it is not the empty string", () =>
    {
        expect(sriOf(Buffer.from("")))
            .toBe("sha384-OLBgp1GsljhM2TJ+sbHjaiH9txEUvgdDTAzHv2P24donTt6/529l+9Ua0vFImLlb");
    });

    test("one changed byte changes the hash", () =>
    {
        expect(sriOf(Buffer.from("hello"))).not.toBe(sriOf(Buffer.from("hellp")));
    });

    test("every hash carries the algorithm prefix a browser requires", () =>
    {
        expect(sriOf(Buffer.from("integrity"))).toMatch(/^sha384-[A-Za-z0-9+/]+=*$/);
    });
});

describe("third-party-sri.json", () =>
{
    const manifest = readManifest();
    const assets = assetList(manifest);

    test("records at least the libraries DEBT-SEC-5 named", () =>
    {
        const names = assets.map((a: { name: string }) => a.name);

        for (const required of ["marked", "highlight.js", "katex", "mermaid", "viz"])
        {
            expect(names).toContain(required);
        }
    });

    test("every asset carries a well-formed sha384 hash", () =>
    {
        for (const asset of assets)
        {
            expect(asset.integrity, asset.name).toMatch(/^sha384-[A-Za-z0-9+/]{64}=*$/);
        }
    });

    test("every URL is https and names an exact version", () =>
    {
        for (const asset of assets)
        {
            expect(asset.url, asset.name).toMatch(/^https:\/\//);
            expect(asset.url, asset.name).toContain(asset.version);
            expect(asset.version, asset.name).toMatch(/^\d+\.\d+/);
        }
    });

    test("no two assets share a URL", () =>
    {
        const urls = assets.map((a: { url: string }) => a.url);

        expect(new Set(urls).size).toBe(urls.length);
    });

    test("a byte count is recorded, so a truncated fetch is visible", () =>
    {
        for (const asset of assets)
        {
            expect(asset.bytes, asset.name).toBeGreaterThan(0);
        }
    });

    // WAS: "CodeMirror 6 is recorded as unhashable, with a reason".
    //
    // THAT TEST PINNED A WORKAROUND AS THOUGH IT WERE AN INVARIANT, and it
    // is the reason this file failed in CI on 2026-10-20 while the change
    // that made it false was correct. codemirror6 sat in `unhashable`
    // because it arrived as fourteen esm.sh import specifiers and an
    // integrity attribute cannot attach to one. ADR-211 bundled the
    // fourteen packages into one hashed file on this origin, so CodeMirror
    // is no longer loaded from a third-party CDN at all and has left the
    // population this manifest describes.
    //
    // The lesson is worth keeping next to the assertion: a test that
    // asserts a limitation still exists will fail on the commit that
    // removes the limitation, and that failure looks exactly like a
    // regression. Assert the INVARIANT, which is that nothing sits in
    // `unhashable` without a recorded reason.
    test("unhashable holds no asset, and says why", () =>
    {
        const entries = Object.keys(manifest.unhashable)
            .filter((k) => !k.startsWith("$"));

        expect(entries).toEqual([]);
        expect(manifest.unhashable.$comment.join(" ")).toMatch(/ADR-211/);
    });

    test("codemirror6 is not a third-party CDN asset any more", () =>
    {
        expect(Object.keys(manifest.assets)).not.toContain("codemirror6");
        expect(Object.keys(manifest.unhashable)).not.toContain("codemirror6");
    });

    test("nothing is both hashed and unhashable", () =>
    {
        const names = assets.map((a: { name: string }) => a.name);

        for (const name of Object.keys(manifest.unhashable))
        {
            expect(names).not.toContain(name);
        }
    });
});

/**
 * The manifest is data the documentation copies from. If the two drift,
 * the hash a consumer pastes stops matching the build they fetch, and the
 * failure lands on them rather than here.
 */
describe("the documentation agrees with the manifest", () =>
{
    const assets = assetList(readManifest());

    test("every hashed build named in a README carries its recorded hash", () =>
    {
        const readme = readFileSync("components/markdownrenderer/README.md", "utf8");

        for (const asset of assets.filter((a: { url: string }) => readme.includes(a.url)))
        {
            expect(readme, asset.name).toContain(`integrity="${asset.integrity}"`);
        }
    });

    test("KaTeX is named at one version across the repository", () =>
    {
        const katex = assets.find((a: { name: string }) => a.name === "katex");

        expect(katex.version).toBe("0.16.22");
    });
});
