/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: b890dd8f-99ab-4a31-9e7c-440c066873df
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Resolver
 * 📜 PURPOSE: Maps an intent plus a data shape onto a component, so the host
 *    never has to know 118 component names or their competence boundaries.
 *    Every decision is explained: the result always carries the full ranked
 *    candidate list with per-factor contributions.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Registry]], [[DynamicCanvas]]
 * ⚡ FLOW: [ResolveRequest] -> [score every affordance] -> [ResolveResult]
 * 🔒 SECURITY: Only registered components are ever considered, so the resolver
 *    cannot surface a component outside the mount allowlist.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-resolver
// @entrypoint

import { getAllManifests } from "./registry";

import type {
    Affordance,
    CapabilityManifest,
    DataShape,
    IntentVerb,
    PresentationPreference,
    ResolveRequest,
    ResolveResult,
    ScoredCandidate,
    ScoreReason,
} from "./types";

// ============================================================================
// TUNING
// ============================================================================

/**
 * Scoring weights, in one place so that tuning is a single reviewable diff.
 *
 * Deliberate ordering of magnitudes: serving the requested intent outweighs
 * every other factor combined except cardinality, and the weight penalty can
 * never overturn an intent match.
 */
export const RESOLVER_WEIGHTS =
{
    intentAffinity: 1.00,
    cardinalityFit: 0.60,
    densityFit: 0.35,
    viewportFit: 0.30,
    appOverride: 0.50,
    preferHint: 0.50,
    userHistory: 0.25,
    weightPenalty: -0.20,
} as const;

/** Byte count at which the weight penalty saturates. */
const WEIGHT_SATURATION = 500_000;

/** User choices needed before history reaches full influence. */
const HISTORY_SATURATION = 3;

// ============================================================================
// PREFERENCES
// ============================================================================

/** Identifies a (shape, intent) pair for preference lookup. */
export interface PreferenceKey
{
    readonly shape: DataShape;
    readonly intent: IntentVerb;
}

/** Host-registered preferences, keyed by shape and intent. */
const preferences = new Map<string, PresentationPreference>();

/**
 * Observed user overrides, keyed by shape, intent, and component.
 *
 * Named userChoices rather than history: the runtime is concatenated into one
 * scope for the browser bundle, where a top-level `history` would shadow
 * window.history.
 */
const userChoices = new Map<string, number>();

/**
 * Builds the lookup key for a preference or history entry.
 *
 * @param key       - The shape and intent pair.
 * @param component - Optional component name, for history entries.
 * @returns The composite key.
 */
function prefKey(key: PreferenceKey, component?: string): string
{
    return component
        ? `${key.shape}|${key.intent}|${component}`
        : `${key.shape}|${key.intent}`;
}

/**
 * Registers a host nudge toward a component for a (shape, intent) pair.
 *
 * Mirrors registerDynamicFormFieldProvider (ADR-134) deliberately, so the
 * override idiom reads as familiar rather than novel.
 *
 * @param key  - The shape and intent the preference applies to.
 * @param pref - The preferred component and how strongly to weight it.
 */
export function registerPresentationPreference(
    key: PreferenceKey,
    pref: PresentationPreference): void
{
    preferences.set(prefKey(key), pref);
}

/**
 * Records that a user explicitly chose a component over the resolver's pick.
 * Repeated choices converge the resolver on the user's preference.
 *
 * @param key       - The shape and intent that was being resolved.
 * @param component - The component the user chose.
 */
export function recordUserChoice(
    key: PreferenceKey,
    component: string): void
{
    const k = prefKey(key, component);

    userChoices.set(k, (userChoices.get(k) ?? 0) + 1);
}

/** Clears host preferences and observed user choices. */
export function clearPresentationPreferences(): void
{
    preferences.clear();
    userChoices.clear();
}

// ============================================================================
// FIT FUNCTIONS
// ============================================================================

/**
 * Scores how well a value sits inside a range. Full marks inside; outside,
 * decays log-linearly with the order of magnitude of the overshoot so that a
 * near miss still beats a wild one.
 *
 * @param value - The observed value.
 * @param min   - Range minimum.
 * @param max   - Range maximum.
 * @returns A fit between just above zero and one.
 */
function rangeFit(value: number, min: number, max: number): number
{
    if (value >= min && value <= max)
    {
        return 1;
    }

    const overshoot = value < min
        ? min / Math.max(value, 1)
        : value / Math.max(max, 1);

    return 1 / (1 + Math.log10(Math.max(overshoot, 1)));
}

/**
 * Normalises a component's byte weight into a zero-to-one penalty basis.
 *
 * @param js - Minified JS bytes.
 * @returns The normalised weight, saturating at one.
 */
function weightBasis(js: number): number
{
    return Math.min(js / WEIGHT_SATURATION, 1);
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Scores one affordance against a request, accumulating the reasons as it
 * goes. Reasons are accumulated rather than reconstructed afterwards, so the
 * explanation can never drift from the score.
 *
 * @param manifest - The candidate component's manifest.
 * @param afford   - The affordance being scored.
 * @param req      - The resolve request.
 * @returns The scored candidate, or null when a hard exclusion applies.
 */
function scoreAffordance(
    manifest: CapabilityManifest,
    afford: Affordance,
    req: ResolveRequest): ScoredCandidate | null
{
    if (afford.shape !== req.shape)
    {
        return null;
    }

    if (afford.minViewport.w > req.viewport.w
        || afford.minViewport.h > req.viewport.h)
    {
        return null;
    }

    const reasons: ScoreReason[] = [];

    addIntentReason(reasons, afford, req);
    addFitReasons(reasons, afford, req);
    addPreferenceReasons(reasons, manifest, req);

    reasons.push({
        factor: "weightPenalty",
        delta: RESOLVER_WEIGHTS.weightPenalty * weightBasis(manifest.weight.js),
    });

    return {
        component: manifest.name,
        score: reasons.reduce((total, r) => total + r.delta, 0),
        reasons,
    };
}

/**
 * Adds the intent affinity contribution when the affordance serves the verb.
 *
 * @param reasons - Accumulator appended to in place.
 * @param afford  - The affordance being scored.
 * @param req     - The resolve request.
 */
function addIntentReason(
    reasons: ScoreReason[],
    afford: Affordance,
    req: ResolveRequest): void
{
    if (afford.intents.includes(req.intent))
    {
        reasons.push({
            factor: "intentAffinity",
            delta: RESOLVER_WEIGHTS.intentAffinity,
        });
    }
}

/**
 * Adds cardinality, density, and viewport contributions.
 *
 * @param reasons - Accumulator appended to in place.
 * @param afford  - The affordance being scored.
 * @param req     - The resolve request.
 */
function addFitReasons(
    reasons: ScoreReason[],
    afford: Affordance,
    req: ResolveRequest): void
{
    reasons.push({
        factor: "cardinalityFit",
        delta: RESOLVER_WEIGHTS.cardinalityFit * rangeFit(
            req.cardinality, afford.cardinality.min, afford.cardinality.max),
    });

    if (req.fieldCount !== undefined && afford.density)
    {
        reasons.push({
            factor: "densityFit",
            delta: RESOLVER_WEIGHTS.densityFit * rangeFit(
                req.fieldCount, afford.density.min, afford.density.max),
        });
    }

    reasons.push({ factor: "viewportFit", delta: RESOLVER_WEIGHTS.viewportFit });
}

/**
 * Adds host preference, request hint, and user history contributions.
 *
 * @param reasons  - Accumulator appended to in place.
 * @param manifest - The candidate component's manifest.
 * @param req      - The resolve request.
 */
function addPreferenceReasons(
    reasons: ScoreReason[],
    manifest: CapabilityManifest,
    req: ResolveRequest): void
{
    const key: PreferenceKey = { shape: req.shape, intent: req.intent };
    const pref = preferences.get(prefKey(key));

    if (pref && pref.prefer === manifest.name)
    {
        reasons.push({
            factor: "appOverride",
            delta: RESOLVER_WEIGHTS.appOverride * pref.weight,
        });
    }

    if (req.prefer === manifest.name)
    {
        reasons.push({ factor: "preferHint", delta: RESOLVER_WEIGHTS.preferHint });
    }

    const chosen = userChoices.get(prefKey(key, manifest.name)) ?? 0;

    if (chosen > 0)
    {
        reasons.push({
            factor: "userHistory",
            delta: RESOLVER_WEIGHTS.userHistory
                * Math.min(chosen / HISTORY_SATURATION, 1),
        });
    }
}

/**
 * Scores a component by its best-fitting affordance.
 *
 * @param manifest - The candidate component's manifest.
 * @param req      - The resolve request.
 * @returns The best scored candidate, or null when none applies.
 */
function scoreComponent(
    manifest: CapabilityManifest,
    req: ResolveRequest): ScoredCandidate | null
{
    let best: ScoredCandidate | null = null;

    for (const afford of manifest.affords)
    {
        const scored = scoreAffordance(manifest, afford, req);

        if (scored && (!best || scored.score > best.score))
        {
            best = scored;
        }
    }

    return best;
}

// ============================================================================
// PUBLIC
// ============================================================================

/**
 * Resolves an intent and data shape onto a component.
 *
 * Always returns the full ranked candidate list — the canvas renders the
 * "why?" breakdown and the "show as…" menu from it, so an automatic choice is
 * never opaque and never final.
 *
 * @param req - What the host wants shown.
 * @returns The winner and every viable candidate, descending by score.
 */
export function resolve(req: ResolveRequest): ResolveResult
{
    const candidates: ScoredCandidate[] = [];
    const byName = new Map<string, CapabilityManifest>();

    for (const manifest of getAllManifests())
    {
        const scored = scoreComponent(manifest, req);

        if (scored)
        {
            candidates.push(scored);
            byName.set(manifest.name, manifest);
        }
    }

    candidates.sort((a, b) => compareCandidates(a, b, byName));

    return {
        chosen: candidates.length > 0 ? candidates[0].component : null,
        candidates,
    };
}

/**
 * Orders two candidates: score descending, then manifest priority
 * descending, then name ascending. The last two make ties deterministic
 * regardless of registration order.
 *
 * @param a      - First candidate.
 * @param b      - Second candidate.
 * @param byName - Manifest lookup for priority.
 * @returns Standard comparator result.
 */
function compareCandidates(
    a: ScoredCandidate,
    b: ScoredCandidate,
    byName: ReadonlyMap<string, CapabilityManifest>): number
{
    if (a.score !== b.score)
    {
        return b.score - a.score;
    }

    const pa = byName.get(a.component)?.priority ?? 0;
    const pb = byName.get(b.component)?.priority ?? 0;

    if (pa !== pb)
    {
        return pb - pa;
    }

    return a.component.localeCompare(b.component);
}
