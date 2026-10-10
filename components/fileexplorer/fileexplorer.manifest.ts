/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: f449934c-adb0-4d2a-961d-3af19820747d
 * Created: 2026-10-10
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: File Explorer / CapabilityManifest
 * PURPOSE: Declares what File Explorer can render, so the Dynamic UI canvas can
 *    resolve, mount, and budget it. See ADR-142.
 * RELATES: [[File Explorer]], [[TreeView]], [[DynamicUIRuntime]]
 * FLOW: [build aggregation] -> [capability-manifest.json] -> [registry]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker fileexplorer-manifest

import type { CapabilityManifest } from "../../runtime/src/types";

/**
 * Declared at `display` conformance: the canvas can mount and tear this
 * component down. Promotion to `field` or `surface` is a change to the
 * component's own public API, not to this file, and the conformance suite
 * proves the level rather than taking its word for it.
 *
 * The 2026-08-03 seed recorded a "non-standard factory signature
 * (containerOrId union)". The union accepts the host id string the gate passes,
 * so container-first resolves it and the signature was never the obstacle
 * (ADR-160).
 */
export const FILEEXPLORER_MANIFEST: CapabilityManifest =
{
    name: "fileexplorer",
    factory: "createFileExplorer",
    factoryStyle: "container-first",
    label: "File Explorer",
    icon: "bi-folder2-open",
    category: "data",

    affords: [
        {
            shape: "hierarchy",
            intents: ["browse", "navigate", "inspect"],
            // Per folder. The explorer renders a folder's children in
            // full -- the only "virtual" thing in it is the synthetic
            // multi-root node, not a windowed list.
            cardinality: { min: 0, max: 5000 },
            minViewport: { w: 320, h: 240 },
        },
    ],

    emits: [
        // TWO legacy callbacks fire for this one event: `onSelect` and
        // `onSelectionChange`, from adjacent lines in the same method. The
        // documented one wins here; whoever promotes this to `surface` will
        // have to decide what the other does, because `legacy-callback-fires`
        // checks one name and the duplicate would go unobserved.
        { name: "select", payload: "collection", multi: false, legacyOption: "onSelectionChange" },
        { name: "open", payload: "record", multi: false, legacyOption: "onOpen" },
    ],

    accepts: [],
    actions: [],
    stateKeys: [],

    // weight.js is overwritten by the build from the compiled bundle size.
    weight: { js: 37407, mountCost: "moderate", holdsResources: false },

    defaultSize: { w: 720, h: 480 },
    defaultOptions: { roots: [] },

    conformance: "display",
    priority: 50,
};
