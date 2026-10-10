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
 *
 * (CRITICAL) Every blocker here was re-measured on 2026-10-10 (ADR-160) and
 * eleven of the sixteen did not survive. The seed was written before the
 * runtime grew `factoryStyle`, `containerOption`, `containerAs`, `mountMethod`
 * and the `invoke` glue hook, so six entries recorded as blocked by their
 * argument order were blocked by nothing, and five more were in the wrong list
 * entirely — they belong in NOT_MOUNTABLE. A blocker that names a mechanism
 * the runtime has since grown reads as work pending when the work is done.
 * State what was TRIED, not what looks hard.
 */
const EXEMPT: ReadonlySet<string> = new Set([
    // Requires a live GraphCanvas handle, and the blocker holds. Measured
    // 2026-10-10: `options.graphCanvas` is required and the minimap paints
    // through a 2D context, which jsdom does not implement — glue that stands
    // up a real GraphCanvas is the prerequisite, not the manifest.
    "graphminimap",
    // Its signature is NOT the blocker. `(containerOrId: string | HTMLElement,
    // options)` IS the canonical container-first form: the union accepts the
    // host id the gate passes, so the frozen ADR-138 contract never needed
    // touching. What is actually open is a disposition decision — AuthCard
    // renders Keycloak's pre-session login step, and a manifest would publish
    // it to consumers as canvas-mountable. Decide the category first.
    "authcard",
    // 25k-line engine with its own embed registry; migrate after phase 10
    // extracts that registry. Unchanged by the 2026-10-10 re-measurement.
    "diagramengine",
    // Its signature is NOT the blocker either — `(target, options)` is
    // container-first and resolves. It is the ADR-134 form host, so what its
    // manifest declares (one `affords` entry per field type it switches over?
    // one for the form?) is a design question with consumer-visible answers.
    "dynamicformswitcher",
    // Class-only entry point, and the blocker holds: `MarkdownEditor` is
    // exported but no `create*` factory is. Migration means ADDING one to the
    // public surface — additive, so permitted, but it is an API change rather
    // than a manifest, and it should land with the editor's own arc.
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

    commandpalette:
        "Global singleton overlay. CommandPalette.getInstance() appends its "
        + "backdrop and dialog straight to document.body and is opened by a "
        + "keyboard shortcut, so there is one per document and no container "
        + "to mount it into. Excluded for the same reason as contextmenu. "
        + "The seed recorded this as 'no create* factory found' — the entry "
        + "point is openCommandPalette(), and the singleton it reaches for is "
        + "the actual reason it cannot be a canvas citizen.",

    statusbar:
        "Viewport-docked app chrome. createStatusBar(options) calls show() "
        + "with no argument, which appends to document.body, and the options "
        + "carry a z-index rather than a container. See toolbar — this is "
        + "mechanically the same exclusion.",

    graphtoolbar:
        "Viewport-docked app chrome. It builds a preconfigured Toolbar "
        + "through window.createToolbar and throws without it, so it is a "
        + "wrapper around a component this list already excludes. See "
        + "toolbar.",

    guidedtour:
        "Transient full-viewport walkthrough. It paints a backdrop over the "
        + "whole page and steps a popover across elements that belong to "
        + "other components, so it decorates an application rather than "
        + "occupying a canvas node. It also returns null without third-party "
        + "Driver.js on window — which is what the seed's 'returns null under "
        + "jsdom' was seeing.",

    helptooltip:
        "Transient hover overlay anchored to another element. "
        + "createHelpTooltip(target, options) takes the element it decorates "
        + "as its first argument and throws without one. See hovercard — it "
        + "decorates a component rather than being one.",

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
