/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 7fc7dafd-f4ce-4e23-955f-990504583844
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Constants
 * 📜 PURPOSE: Runtime-visible constants shared across the Dynamic UI layer —
 *    the closed vocabularies the validator checks against, packer geometry,
 *    and budget defaults. Single place to tune, single place to review.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[DocumentValidate]], [[Resolver]]
 * ⚡ FLOW: [validator, resolver, lifecycle] -> [reads constants]
 * 🔒 SECURITY: DATA_SHAPES and INTENT_VERBS are closed sets; the validator
 *    rejects any value outside them, so unknown vocabulary cannot reach the
 *    resolver or the registry.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-constants

import type { CardinalityPolicy, DataShape, IntentVerb, Region, SizeHint } from "./types";

/** Log prefix for all console output from the runtime. */
export const LOG_PREFIX = "[DynamicUIRuntime]";

/** Document schema version this runtime reads and writes. */
export const SCHEMA_VERSION = 1;

// ============================================================================
// CLOSED VOCABULARIES
// ============================================================================

/** Every legal DataShape. The validator rejects anything else. */
export const DATA_SHAPES: readonly DataShape[] =
[
    "scalar", "record", "collection", "hierarchy", "graph",
    "timeseries", "document", "media", "geo", "diff",
];

/** Every legal IntentVerb. */
export const INTENT_VERBS: readonly IntentVerb[] =
[
    "browse", "inspect", "compare", "monitor", "edit",
    "author", "navigate", "summarize", "relate", "schedule",
];

/** Every legal canvas region. */
export const REGIONS: readonly Region[] =
[
    "main", "side", "detail", "strip", "overlay",
];

/** Every legal size hint. */
export const SIZE_HINTS: readonly SizeHint[] =
[
    "compact", "standard", "wide", "tall", "full",
];

/** Every legal cardinality policy. */
export const CARDINALITY_POLICIES: readonly CardinalityPolicy[] =
[
    "replace", "fanout", "merge",
];

// ============================================================================
// WIRING
// ============================================================================

/** Cap on nodes spawned by a single fanout binding. */
export const DEFAULT_MAX_FANOUT = 6;

/** Hard ceiling a document may not raise maxFanout beyond. */
export const FANOUT_CEILING = 24;

// ============================================================================
// LIFECYCLE BUDGET
// ============================================================================

/** Default ceiling on simultaneously mounted nodes. */
export const DEFAULT_MOUNT_CAP = 24;

/** Default ceiling on total mounted weight, in JS bytes. */
export const DEFAULT_WEIGHT_BUDGET = 1_500_000;

/** Turns a node may go untouched before collapsing to a chip. */
export const DEFAULT_DECAY_TURNS = 12;

/** Viewport margin, in canvas pixels, within which nodes stay mounted. */
export const DEFAULT_MOUNT_MARGIN = 400;

// ============================================================================
// PACKER GEOMETRY
// ============================================================================

/** Gap between packed nodes, in canvas pixels. */
export const PACK_GUTTER = 16;

/** Pixel width each SizeHint requests from the packer. */
export const SIZE_HINT_WIDTH: Readonly<Record<SizeHint, number>> =
{
    compact: 280,
    standard: 420,
    wide: 720,
    tall: 420,
    full: 1080,
};

/** Pixel height each SizeHint requests from the packer. */
export const SIZE_HINT_HEIGHT: Readonly<Record<SizeHint, number>> =
{
    compact: 200,
    standard: 320,
    wide: 380,
    tall: 640,
    full: 720,
};

/** Left-edge origin, in canvas pixels, for each region's shelf. */
export const REGION_ORIGIN_X: Readonly<Record<Region, number>> =
{
    main: 0,
    side: 1160,
    detail: 0,
    strip: 0,
    overlay: 0,
};
