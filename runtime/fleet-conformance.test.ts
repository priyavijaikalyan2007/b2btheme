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
    "actionitems", "activityfeed", "anchorlayout", "anglepicker", "applauncher",
    "auditlogviewer", "authcard", "bannerbar", "borderlayout", "boxlayout",
    "breadcrumb", "cardlayout", "chartpanel", "codeeditor", "colorpicker",
    "columnspicker", "commandpalette", "commentoverlay", "confirmdialog",
    "contextmenu", "conversation", "cronpicker", "datagrid", "datepicker",
    "diagramengine", "docklayout", "docviewer", "durationpicker",
    "dynamicformswitcher", "editablecombobox", "emptystate", "errordialog",
    "explorerpicker", "facetsearch", "fileexplorer", "fileupload",
    "flexgridlayout", "flowlayout", "fontdropdown", "formdialog", "gauge",
    "gradientpicker", "graphcanvas", "graphlegend", "graphminimap",
    "graphtoolbar", "gridlayout", "guidedtour", "helpdrawer", "helptooltip",
    "hovercard", "inlinetoolbar", "latexeditor", "layerlayout", "layoutpicker",
    "lineendingpicker", "lineshapepicker", "linetypepicker", "linewidthpicker",
    "logconsole", "logutility", "magnifier", "marginspicker", "markdowneditor",
    "markdownrenderer", "maskedentry", "metriccard", "multiselectcombo",
    "navrail", "notificationcenter", "orientationpicker", "peoplepicker",
    "periodpicker", "permissionmatrix", "personchip", "pill",
    "presenceindicator", "progressmodal", "prompttemplatemanager",
    "propertyinspector", "reasoningaccordion", "relationshipmanager", "ribbon",
    "ribbonbuilder", "richtextinput", "ruler", "searchbox", "sharedialog",
    "sidebar", "sizespicker", "skeletonloader", "slider", "smarttextinput",
    "spacingpicker", "spinemap", "splitlayout", "sprintpicker", "stacklayout",
    "statusbadge", "statusbar", "stepper", "symbolpicker", "tabbedpanel",
    "tagger", "themeinit", "themetoggle", "timeline", "timepicker",
    "timezonepicker", "toast", "toolbar", "toolcolorpicker", "treegrid",
    "treeview", "typebadge", "usermenu", "visualtableeditor",
    "workspaceswitcher",
]);

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

        console.log(
            `[fleet-conformance] ${WITH_MANIFEST.length} of `
            + `${COMPONENT_DIRS.length} components migrated; `
            + `${remaining} still exempt.`);

        expect(remaining + WITH_MANIFEST.length)
            .toBeGreaterThanOrEqual(COMPONENT_DIRS.length);
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
// THE GATE
// ============================================================================

describe("fleet gate — manifest coverage", () =>
{
    test("every component is either exempt or carries a manifest", () =>
    {
        const missing = COMPONENT_DIRS.filter(
            (n) => !EXEMPT.has(n) && !WITH_MANIFEST.includes(n));

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
    const migrated = COMPONENT_DIRS.filter((n) => !EXEMPT.has(n));

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
