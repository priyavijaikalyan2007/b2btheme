/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: The concatenated runtime bundle.
 *
 * The modular sources under runtime/src are covered by their own suites. This
 * file tests the ARTEFACT — the single-scope file produced by
 * scripts/bundle-runtime.sh — because concatenation has failure modes the
 * module tests cannot see: a stripped import taking a declaration with it, two
 * modules defining the same helper, or a top-level binding shadowing a DOM
 * global (`history` did exactly that).
 *
 * Covers PRD §2.3 and plan Phase 10.
 */

import { describe, test, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BUNDLE = resolve(__dirname, "runtime.ts");

let source = "";

beforeAll(() =>
{
    expect(
        existsSync(BUNDLE),
        "runtime/runtime.ts is missing — run scripts/bundle-runtime.sh")
        .toBe(true);

    source = readFileSync(BUNDLE, "utf-8");
});

// ============================================================================
// MODULE SYNTAX
// ============================================================================

describe("bundle — single scope", () =>
{
    test("contains no import statements", () =>
    {
        const imports = source.split("\n")
            .filter((l) => /^import\s/.test(l));

        expect(imports, `Leftover imports: ${imports.join(" | ")}`).toEqual([]);
    });

    test("contains no export keywords", () =>
    {
        const exports = source.split("\n")
            .filter((l) => /^export\s/.test(l));

        expect(exports, `Leftover exports: ${exports.join(" | ")}`).toEqual([]);
    });

    test("declares no top-level binding that shadows a DOM global", () =>
    {
        // `history` shadowed window.history before it was renamed. These are
        // the globals a UI bundle is most likely to collide with.
        const risky = [
            "history", "location", "status", "name", "length",
            "origin", "top", "self", "parent", "closed", "event",
        ];

        const declared = [...source.matchAll(
            /^(?:const|let|var|function|class)\s+(\w+)/gm)]
            .map((m) => m[1]);

        const clashes = risky.filter((r) => declared.includes(r));

        expect(
            clashes,
            `Top-level ${clashes.join(", ")} shadows a DOM global once `
            + "concatenated into one scope. Rename in the source module.")
            .toEqual([]);
    });

    test("declares each top-level function exactly once", () =>
    {
        const names = [...source.matchAll(/^function\s+(\w+)/gm)]
            .map((m) => m[1]);

        const seen = new Set<string>();
        const duplicates = names.filter(
            (n) => seen.has(n) ? true : (seen.add(n), false));

        expect(
            [...new Set(duplicates)],
            "Duplicate top-level functions collide in a single scope. Extract "
            + "the shared helper into runtime/src/predicates.ts or rename it.")
            .toEqual([]);
    });
});

// ============================================================================
// PUBLIC SURFACE
// ============================================================================

describe("bundle — public surface", () =>
{
    /** Everything a consuming page or component is entitled to use. */
    const EXPECTED = [
        "createEmptyDocument", "validateDocument", "validatePatch", "applyPatch",
        "fold", "foldTo", "branch",
        "registerComponent", "registerComponents", "getManifest",
        "getAllManifests", "isRegistered", "clearRegistry", "validateManifest",
        "resolveFactory", "lookupFactory",
        "resolve", "registerPresentationPreference", "recordUserChoice",
        "clearPresentationPreferences", "RESOLVER_WEIGHTS",
        "createWiringEngine", "registerTransform", "getTransform",
        "clearTransforms",
        "packDocument", "createLifecycleManager",
        "runConformance", "blockingFailures", "formatConformance", "sampleFor",
    ];

    test("registers window.EnterpriseRuntime", () =>
    {
        expect(source).toContain('["EnterpriseRuntime"]');
    });

    test.each(EXPECTED)("exposes %s", (name: string) =>
    {
        const block = source.slice(source.indexOf('["EnterpriseRuntime"]'));

        expect(
            block.includes(name),
            `${name} is not exported on window.EnterpriseRuntime. Add it to `
            + "the global registration block in scripts/bundle-runtime.sh.")
            .toBe(true);
    });

    test("every exposed name is actually declared in the bundle", () =>
    {
        const declarations = source.slice(0, source.indexOf('["EnterpriseRuntime"]'));

        const missing = EXPECTED.filter(
            (n) => !new RegExp(`\\b(?:function|const|let|class)\\s+${n}\\b`)
                .test(declarations));

        expect(
            missing,
            `Exposed but never declared: ${missing.join(", ")}. The global `
            + "registration block references something the concatenation "
            + "dropped.")
            .toEqual([]);
    });
});

// ============================================================================
// FRESHNESS
// ============================================================================

describe("bundle — freshness", () =>
{
    test("includes every module the bundler lists", () =>
    {
        const script = readFileSync(
            resolve(__dirname, "../scripts/bundle-runtime.sh"), "utf-8");

        const listed = [...script.matchAll(/^\s+"(\w[\w-]*\.ts)"/gm)]
            .map((m) => m[1]);

        expect(listed.length).toBeGreaterThan(5);

        const absent = listed.filter(
            (f) => !source.includes(`// SOURCE: ${f}`));

        expect(
            absent,
            `The bundle is stale — missing ${absent.join(", ")}. Re-run `
            + "scripts/bundle-runtime.sh.")
            .toEqual([]);
    });
});
