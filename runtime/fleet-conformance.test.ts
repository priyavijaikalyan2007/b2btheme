/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * TESTS: The fleet conformance gate.
 *
 * Enumerates every component directory and enforces the Dynamic UI contract:
 * a component is either explicitly EXEMPT (not yet migrated) or it carries a
 * valid manifest and passes the conformance suite.
 *
 * (CRITICAL) This is the enforcement mechanism for ADR-141 and ADR-142. The
 * prose in AGENTS.md documents it; THIS is the gate. A new component that is
 * not canvas-capable cannot land without also editing the exemption list,
 * which is deliberately conspicuous.
 *
 * The exemption list shrinks to empty over plan phases 7-9. Its contents are
 * logged on every run so the outstanding work is never silent.
 *
 * Covers PRD §16.2 and plan Phase 6.
 */

import { describe, test, expect } from "vitest";

import {
    blockingFailures,
    formatConformance,
    runConformance,
    type ConformanceTarget,
} from "./src/conformance";

import { validateManifest } from "./src/registry";
import { formatIssues } from "./src/errors";

import type { CapabilityManifest } from "./src/types";

// ============================================================================
// EXEMPTION LIST
// ============================================================================

/**
 * Components not yet migrated to the Dynamic UI contract.
 *
 * Remove a name from this list as part of the commit that gives the component
 * its manifest. Nothing else needs to change — the gate picks it up
 * automatically and will then hold it to the contract forever.
 *
 * Seeded with the full fleet as of 2026-08-03. DO NOT add new entries for
 * newly written components: a component authored after this gate landed is
 * expected to be canvas-capable from its first commit.
 */
const EXEMPT: ReadonlySet<string> = new Set([
    // Requires a live GraphCanvas handle; needs .conformance.ts glue that builds one.
    "graphminimap",
    // Requires the Toolbar component to be loaded first; needs a peer-loading glue.
    "graphtoolbar",
    // Factory returns null under jsdom; needs investigation.
    "guidedtour",
    // Required option shape not yet determined.
    "multiselectcombo",
    // Required option shape not yet determined.
    "permissionmatrix",
    // Required option shape not yet determined.
    "stacklayout",
    // Required option shape not yet determined.
    "statusbar",
    // Required option shape not yet determined (needs date-bearing items).
    "timeline",
    // Required option shape not yet determined.
    "usermenu",
    // Non-standard factory signature (containerOrId: string | HTMLElement); frozen Keycloak-parity contract (ADR-138) needs care before any change.
    "authcard",
    // No exported create* factory found; entry point needs identifying.
    "commandpalette",
    // 25k-line engine with its own embed registry; migrate after phase 10 extracts that registry.
    "diagramengine",
    // Non-standard signature; it is the ADR-134 form host, so its manifest needs design rather than generation.
    "dynamicformswitcher",
    // Non-standard factory signature (containerOrId union).
    "fileexplorer",
    // Non-standard signature (target: HTMLElement first).
    "helptooltip",
    // No exported create* factory found; entry point needs identifying.
    "markdowneditor",
]);

// ============================================================================
// PERMANENT EXCLUSIONS
// ============================================================================

/**
 * Entries in `components/` that are NOT canvas-mountable components, with the
 * reason each is excluded.
 *
 * This is distinct from EXEMPT, which means "migration pending". These are
 * permanent: they will never carry a manifest because they are not components
 * in the sense the canvas means. Discovered during the Phase 7 pilot, when
 * MarkdownRenderer turned out to be a stateless service rather than a
 * component with a host and a lifecycle.
 *
 * Every entry MUST carry a rationale, asserted below, so this cannot become a
 * dumping ground for anything inconvenient to retrofit.
 */
const NOT_MOUNTABLE: Readonly<Record<string, string>> =
{
    markdownrenderer:
        "Stateless rendering service. createMarkdownRenderer(opts) returns "
        + "{render(md, target), toHtml(md)} — it has no host, owns no DOM, and "
        + "has no lifecycle. Consumers call it; the canvas cannot mount it.",

    logutility:
        "Logging service. Returns a logger, not a rendered surface.",

    typebadge:
        "Element builder. createTypeBadge(options) returns an HTMLElement for "
        + "the caller to place; there is no handle and nothing to destroy.",

    themeinit:
        "Pre-paint boot script (ADR-137). Runs once before render and exposes "
        + "no factory at all.",

    toast:
        "Transient overlay surface. Self-dismissing and globally positioned, "
        + "so it is not placed on a canvas. Excluded for the same reason "
        + "ADR-134 excludes dialogs.",

    confirmdialog:
        "Modal workflow surface, not a field or a canvas citizen. Already "
        + "excluded by ADR-134; the canvas consumes it for destructive "
        + "actions rather than mounting it.",

    errordialog:
        "Modal workflow surface. See confirmdialog.",

    progressmodal:
        "Modal workflow surface. See confirmdialog.",


    bannerbar:
        "Viewport-docked app chrome. See toolbar.",

    contextmenu:
        "Transient overlay positioned at the pointer. Opened on demand and self-dismissing, so it is never placed on a canvas.",

    formdialog:
        "Modal workflow surface. See confirmdialog.",

    hovercard:
        "Transient hover overlay anchored to another element (ADR-125). It decorates a component rather than being one.",

    magnifier:
        "Transient pointer-following overlay. It magnifies whatever is beneath "
        + "the pointer rather than rendering content of its own, so there is "
        + "nothing for a canvas to mount or restore.",

    sharedialog:
        "Modal workflow surface. See confirmdialog.",

    sidebar:
        "Viewport-docked app chrome. See toolbar.",

    smarttextinput:
        "Multi-shape AI input excluded by ADR-134: it carries several content formats (plain, serialized, cursor-context) so the right 'value' is consumer-dependent. Its factory also builds no DOM of its own.",

    toolbar:
        "Viewport-docked app chrome. createToolbar() calls show() with no argument, attaching to document.body — it docks to the window edge, not into a container. A toolbar inside a canvas node is meaningless. ADR-134 already excludes it as chrome rather than a field.",

    dynamiccanvas:
        "The canvas HOST, not a canvas citizen — it is the surface other "
        + "components are mounted onto. Mounting a canvas inside a canvas is "
        + "not a v1 capability, and it consumes the runtime via the "
        + "window.EnterpriseRuntime global rather than being resolved through "
        + "the registry.",
};

// ============================================================================
// DISCOVERY
// ============================================================================

/**
 * Module loaders, NOT eagerly evaluated.
 *
 * Eager evaluation would execute every component module — and every sibling
 * `.test.ts` the glob matched — at import time, re-running the whole suite
 * inside this one. Lazy loaders let the gate touch only what it checks.
 */
const COMPONENT_LOADERS = import.meta.glob<Record<string, unknown>>(
    "../components/*/*.ts");

const MANIFEST_LOADERS = import.meta.glob<Record<string, unknown>>(
    "../components/*/*.manifest.ts");

const GLUE_LOADERS = import.meta.glob<Record<string, unknown>>(
    "../components/*/*.conformance.ts");

/** Path of a component's own entry module. */
function entryPath(name: string): string
{
    return `../components/${name}/${name}.ts`;
}

/**
 * Component directory names, derived from the glob keys rather than the file
 * system so the gate behaves identically under any bundler.
 */
const COMPONENT_DIRS: readonly string[] = [...new Set(
    Object.keys(COMPONENT_LOADERS)
        .map((k) => k.split("/")[2]))]
    .sort();

/** True when a component is permanently outside the canvas contract. */
function isExcluded(name: string): boolean
{
    return name in NOT_MOUNTABLE;
}

/** Components carrying a manifest file. */
const WITH_MANIFEST: readonly string[] = COMPONENT_DIRS.filter(
    (name) => `../components/${name}/${name}.manifest.ts` in MANIFEST_LOADERS);

/**
 * Pulls the single exported manifest out of a manifest module, whatever it is
 * named — authors should not have to remember an export name.
 *
 * @param name - Component directory name.
 * @returns The manifest, or null when absent or malformed.
 */
async function loadManifest(name: string): Promise<CapabilityManifest | null>
{
    const load = MANIFEST_LOADERS[`../components/${name}/${name}.manifest.ts`];

    if (!load)
    {
        return null;
    }

    const mod = await load();
    const candidate = Object.values(mod).find(
        (v) => v && typeof v === "object" && "factory" in (v as object));

    return (candidate as CapabilityManifest) ?? null;
}

/**
 * Builds a conformance target, applying optional per-component glue from
 * `<name>.conformance.ts` when the component needs a non-canonical invocation
 * or a way to trigger its channels.
 *
 * @param name     - Component directory name.
 * @param manifest - The component's manifest.
 * @returns The target, or null when the factory could not be resolved.
 */
async function buildTarget(
    name: string,
    manifest: CapabilityManifest): Promise<ConformanceTarget | null>
{
    const load = COMPONENT_LOADERS[entryPath(name)];

    if (!load)
    {
        return null;
    }

    const mod = await load();
    const factory = mod[manifest.factory];

    if (typeof factory !== "function")
    {
        return null;
    }

    const glueLoad = GLUE_LOADERS[`../components/${name}/${name}.conformance.ts`];
    const glue = glueLoad ? await glueLoad() : {};

    return {
        manifest,
        factory,
        ...(glue.CONFORMANCE_GLUE as object ?? {}),
    };
}

// ============================================================================
// EXEMPTION HYGIENE
// ============================================================================

describe("fleet gate — exemption hygiene", () =>
{
    test("logs the outstanding migration count on every run", () =>
    {
        const remaining = COMPONENT_DIRS.filter((n) => EXEMPT.has(n)).length;
        const excluded = COMPONENT_DIRS.filter(isExcluded).length;
        const inScope = COMPONENT_DIRS.length - excluded;

        console.log(
            `[fleet-conformance] ${WITH_MANIFEST.length} of ${inScope} `
            + `in-scope components migrated; ${remaining} still exempt; `
            + `${excluded} permanently excluded.`);

        expect(remaining + WITH_MANIFEST.length + excluded)
            .toBeGreaterThanOrEqual(COMPONENT_DIRS.length);
    });

    test("every permanent exclusion carries a rationale", () =>
    {
        const empty = Object.entries(NOT_MOUNTABLE)
            .filter(([, why]) => !why || why.trim().length < 40)
            .map(([name]) => name);

        expect(
            empty,
            "A permanent exclusion must explain why the component is not "
            + `canvas-mountable: ${empty.join(", ")}`)
            .toEqual([]);
    });

    test("every permanent exclusion names a real directory", () =>
    {
        const dirs = new Set(COMPONENT_DIRS);
        const stale = Object.keys(NOT_MOUNTABLE).filter((n) => !dirs.has(n));

        expect(stale, `Stale exclusions: ${stale.join(", ")}`).toEqual([]);
    });

    test("exclusions and exemptions are disjoint", () =>
    {
        const both = Object.keys(NOT_MOUNTABLE).filter((n) => EXEMPT.has(n));

        expect(
            both,
            "A component is either permanently excluded or pending migration, "
            + `never both: ${both.join(", ")}`)
            .toEqual([]);
    });

    test("no exemption names a directory that does not exist", () =>
    {
        const dirs = new Set(COMPONENT_DIRS);
        const stale = [...EXEMPT].filter((n) => !dirs.has(n));

        expect(stale, `Stale exemptions — these directories are gone: ${stale.join(", ")}`)
            .toEqual([]);
    });

    test("no exemption names a component that already has a manifest", () =>
    {
        const redundant = WITH_MANIFEST.filter((n) => EXEMPT.has(n));

        expect(
            redundant,
            "These components have manifests but are still exempt. Remove them "
            + `from EXEMPT so the gate holds them to the contract: ${redundant.join(", ")}`)
            .toEqual([]);
    });
});

// ============================================================================
// SHIPPED-DATA HYGIENE
// ============================================================================

describe("fleet gate — manifest defaults are production data", () =>
{
    /**
     * Vocabulary that betrays a test fixture. `defaultOptions` is aggregated
     * into dist/capability-manifest.json and published — it is what the canvas
     * passes when a host supplies nothing, so a fixture there puts placeholder
     * content in front of real users. Mount fixtures belong in
     * `<name>.conformance.ts` under `options`.
     */
    const FIXTURE_WORDS = [
        "sample", "fixture", "lorem ipsum", "placeholder",
        "test user", "john doe", "jane doe", "example.com", "about:blank",
    ];

    test.each(WITH_MANIFEST)(
        "%s defaultOptions carry no fixture data",
        async (name: string) =>
        {
            const manifest = await loadManifest(name);
            const encoded = JSON.stringify(manifest?.defaultOptions ?? {})
                .toLowerCase();

            const found = FIXTURE_WORDS.filter((w) => encoded.includes(w));

            expect(
                found,
                `${name}.manifest.ts defaultOptions looks like a test fixture `
                + `(${found.join(", ")}). defaultOptions is shipped to `
                + "consumers — move mount fixtures into "
                + `components/${name}/${name}.conformance.ts under "options".`)
                .toEqual([]);
        });
});

// ============================================================================
// THE GATE
// ============================================================================

describe("fleet gate — manifest coverage", () =>
{
    test("every component is either exempt or carries a manifest", () =>
    {
        const missing = COMPONENT_DIRS.filter(
            (n) => !EXEMPT.has(n) && !isExcluded(n)
                && !WITH_MANIFEST.includes(n));

        expect(
            missing,
            "These components have neither a manifest nor an exemption. Every "
            + "component must be canvas-capable — add <name>.manifest.ts. See "
            + `AGENTS.md and ADR-142: ${missing.join(", ")}`)
            .toEqual([]);
    });
});

describe("fleet gate — conformance", () =>
{
    const migrated = COMPONENT_DIRS.filter(
        (n) => !EXEMPT.has(n) && !isExcluded(n));

    test("discovery found the fleet", () =>
    {
        // Guards against the gate passing vacuously if the glob silently
        // matches nothing, which would make every other assertion trivial.
        expect(COMPONENT_DIRS.length).toBeGreaterThan(100);
    });

    test("every discovered component has an entry module", () =>
    {
        const missing = COMPONENT_DIRS.filter(
            (n) => !(entryPath(n) in COMPONENT_LOADERS));

        expect(missing, `Components with no <name>.ts: ${missing.join(", ")}`)
            .toEqual([]);
    });

    test.runIf(migrated.length > 0).each(migrated)(
        "%s conforms to its declared level",
        async (name: string) =>
        {
            const manifest = await loadManifest(name);

            expect(manifest, `${name}.manifest.ts exports no manifest`).toBeTruthy();

            const res = validateManifest(manifest);
            expect(res.ok, formatIssues(res, `${name} manifest`)).toBe(true);

            const target = await buildTarget(name, manifest!);

            expect(
                target,
                `Could not resolve factory "${manifest!.factory}" from `
                + `components/${name}/${name}.ts`)
                .toBeTruthy();

            const findings = runConformance(target!);
            const blocking = blockingFailures(findings);

            expect(blocking, formatConformance(name, findings)).toEqual([]);
        });
});
