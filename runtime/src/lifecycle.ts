/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 954397ad-b211-4d0c-ada9-1aba75cb9bbb
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Lifecycle
 * 📜 PURPOSE: Decides what is mounted. Reconciles the mounted set against the
 *    document, the viewport, and a weight budget; captures and restores view
 *    state across demotion; and collapses untouched nodes to chips so the
 *    canvas cannot grow without bound.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Document]], [[Wiring]], [[DynamicCanvas]]
 * ⚡ FLOW: [sync(doc, visible, turn)] -> [plan] -> [mount / demote / chip]
 * 🔒 SECURITY: Validates the document and checks every component against the
 *    registry allowlist BEFORE any mount. A corrupted patch log folds into a
 *    plausible-looking document, so this is the last place to catch it.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-lifecycle
// @entrypoint

import {
    DEFAULT_DECAY_TURNS,
    DEFAULT_MOUNT_CAP,
    DEFAULT_WEIGHT_BUDGET,
    LOG_PREFIX,
} from "./constants";

import { validateDocument } from "./document";
import { formatIssues } from "./errors";
import { getManifest, resolveFactory } from "./registry";

import type { CanvasDocument, CanvasNode, Surface } from "./types";

// ============================================================================
// TYPES
// ============================================================================

/** Everything the lifecycle manager needs from its host. */
export interface LifecycleDeps
{
    /**
     * Instantiate a node's component and return its Surface.
     * Returning null marks the mount as failed; the node stays unmounted.
     */
    mount(node: CanvasNode): Surface | null;

    /** Tear down a node. Must tolerate a node that is already gone. */
    unmount(nodeId: string): void;

    /**
     * Called after a demoted node is promoted back and its state restored.
     * The canvas uses this to have the wiring engine replay bound data, which
     * setState() cannot supply.
     */
    onPromoted?(nodeId: string): void;
}

/** Budget and decay tuning. */
export interface LifecycleOptions
{
    /** Maximum simultaneously mounted nodes. */
    readonly mountCap?: number;

    /** Maximum total mounted weight, in JS bytes. */
    readonly weightBudget?: number;

    /** Turns a node may go untouched before collapsing to a chip. */
    readonly decayTurns?: number;
}

/** The mount policy engine. */
export interface LifecycleManager
{
    /**
     * Reconcile the mounted set against the document, the visible set, and
     * the current turn.
     *
     * @throws Error when the document is invalid or names an unregistered
     *         component — never partially mounts.
     */
    sync(
        doc: CanvasDocument,
        visible: ReadonlySet<string>,
        turn: number): void;

    /** The live Surface for a node, or null when it is not mounted. */
    getSurface(nodeId: string): Surface | null;

    /** Whether a node is currently mounted. */
    isMounted(nodeId: string): boolean;

    /** Nodes demoted for budget or viewport reasons, ascending by id. */
    getDemoted(): readonly string[];

    /** Nodes collapsed to chips by decay, ascending by id. */
    getChips(): readonly string[];

    /** View state captured from a demoted node, or null. */
    getStoredState(nodeId: string): Record<string, unknown> | null;

    /** Total weight of currently mounted nodes, in JS bytes. */
    getMountedWeight(): number;

    /** Unmount everything and clear stored state. Idempotent. */
    destroy(): void;
}

/** A node ranked for the mount budget. */
interface Ranked
{
    readonly node: CanvasNode;
    readonly weight: number;
    readonly holdsResources: boolean;
}

// ============================================================================
// MANAGER
// ============================================================================

/**
 * Creates a lifecycle manager.
 *
 * @param deps    - Mount, unmount, and promotion callbacks.
 * @param options - Budget and decay tuning.
 * @returns The manager.
 */
export function createLifecycleManager(
    deps: LifecycleDeps,
    options: LifecycleOptions = {}): LifecycleManager
{
    const mountCap = options.mountCap ?? DEFAULT_MOUNT_CAP;
    const weightBudget = options.weightBudget ?? DEFAULT_WEIGHT_BUDGET;
    const decayTurns = options.decayTurns ?? DEFAULT_DECAY_TURNS;

    const surfaces = new Map<string, Surface>();
    const stored = new Map<string, Record<string, unknown>>();
    const chips = new Set<string>();

    /** Weight of each mounted node, captured at mount time. */
    const weights = new Map<string, number>();

    /**
     * Reconciles the mounted set. Validation runs first and completes before
     * any mount, so a rejected document leaves the canvas untouched.
     */
    function sync(
        doc: CanvasDocument,
        visible: ReadonlySet<string>,
        turn: number): void
    {
        assertMountable(doc);

        const decayed = findDecayed(doc, turn, decayTurns);
        const wanted = planMounts(doc, visible, decayed);

        reconcileChips(decayed);
        releaseDeparted(doc);
        demoteUnwanted(wanted);
        promoteWanted(doc, wanted);
    }

    /**
     * Rejects a document that must not be mounted, before anything changes.
     *
     * @param doc - The document about to be synced.
     * @throws Error with a literate message naming the problem.
     */
    function assertMountable(doc: CanvasDocument): void
    {
        const res = validateDocument(doc);

        if (!res.ok)
        {
            throw new Error(formatIssues(res, "canvas document"));
        }

        for (const node of Object.values(doc.nodes))
        {
            resolveFactory(node.component);
        }
    }

    /**
     * Chooses which nodes should be mounted, honouring pins, the mount cap,
     * and the weight budget.
     *
     * @param doc     - The document being synced.
     * @param visible - Nodes within the viewport plus its margin.
     * @param decayed - Nodes collapsed to chips this turn.
     * @returns The node ids that should be mounted.
     */
    function planMounts(
        doc: CanvasDocument,
        visible: ReadonlySet<string>,
        decayed: ReadonlySet<string>): Set<string>
    {
        const candidates = Object.values(doc.nodes)
            .filter((n) => visible.has(n.id) && !decayed.has(n.id))
            .map(rank)
            .sort(byMountPriority);

        const wanted = new Set<string>();
        let weight = 0;

        for (const c of candidates)
        {
            if (!c.node.pinned
                && (wanted.size >= mountCap || weight + c.weight > weightBudget))
            {
                continue;
            }

            wanted.add(c.node.id);
            weight += c.weight;
        }

        return wanted;
    }

    /**
     * Attaches the weight model to a node for ranking.
     *
     * @param node - The node to rank.
     * @returns The ranked node.
     */
    function rank(node: CanvasNode): Ranked
    {
        const m = getManifest(node.component);

        return {
            node,
            weight: m?.weight.js ?? 0,
            holdsResources: m?.weight.holdsResources ?? false,
        };
    }

    /**
     * Orders mount candidates: pinned first, then resource-light before
     * resource-holding, then most recently touched, then by id so the plan is
     * deterministic for identical input.
     *
     * @param a - First candidate.
     * @param b - Second candidate.
     * @returns Standard comparator result.
     */
    function byMountPriority(a: Ranked, b: Ranked): number
    {
        if (a.node.pinned !== b.node.pinned)
        {
            return a.node.pinned ? -1 : 1;
        }

        if (a.holdsResources !== b.holdsResources)
        {
            return a.holdsResources ? 1 : -1;
        }

        const touched = b.node.provenance.lastTouched - a.node.provenance.lastTouched;

        return touched !== 0 ? touched : a.node.id.localeCompare(b.node.id);
    }

    /**
     * Brings the chip set in line with this turn's decay result, promoting a
     * chip back the moment its node is touched again.
     *
     * @param decayed - Nodes that should be chips this turn.
     */
    function reconcileChips(decayed: ReadonlySet<string>): void
    {
        for (const id of [...chips])
        {
            if (!decayed.has(id))
            {
                chips.delete(id);
            }
        }

        for (const id of decayed)
        {
            chips.add(id);
        }
    }

    /**
     * Drops surfaces and stored state for nodes no longer in the document.
     *
     * @param doc - The document being synced.
     */
    function releaseDeparted(doc: CanvasDocument): void
    {
        for (const id of [...surfaces.keys()])
        {
            if (!doc.nodes[id])
            {
                unmountNode(id, false);
            }
        }

        for (const id of [...stored.keys()])
        {
            if (!doc.nodes[id])
            {
                stored.delete(id);
                chips.delete(id);
            }
        }
    }

    /**
     * Demotes every mounted node that is no longer wanted, capturing its view
     * state first so promotion is lossless.
     *
     * @param wanted - Node ids that should remain mounted.
     */
    function demoteUnwanted(wanted: ReadonlySet<string>): void
    {
        for (const id of [...surfaces.keys()])
        {
            if (!wanted.has(id))
            {
                unmountNode(id, true);
            }
        }
    }

    /**
     * Mounts every wanted node that is not already mounted, restoring any
     * captured state and notifying the host so bound data can be replayed.
     *
     * @param doc    - The document being synced.
     * @param wanted - Node ids that should be mounted.
     */
    function promoteWanted(
        doc: CanvasDocument,
        wanted: ReadonlySet<string>): void
    {
        for (const id of wanted)
        {
            if (surfaces.has(id))
            {
                continue;
            }

            mountNode(doc.nodes[id]);
        }
    }

    /**
     * Mounts one node and restores its state when it was previously demoted.
     *
     * @param node - The node to mount.
     */
    function mountNode(node: CanvasNode): void
    {
        const surface = deps.mount(node);

        if (!surface)
        {
            logWarn(`Mount returned no surface for node "${node.id}".`);
            return;
        }

        surfaces.set(node.id, surface);
        weights.set(node.id, rank(node).weight);

        const state = stored.get(node.id);

        if (state)
        {
            surface.setState(state);
            stored.delete(node.id);
            deps.onPromoted?.(node.id);
        }
    }

    /**
     * Unmounts one node, optionally capturing its view state first.
     *
     * @param id      - Node to unmount.
     * @param capture - Whether to store getState() for later restore.
     */
    function unmountNode(id: string, capture: boolean): void
    {
        const surface = surfaces.get(id);

        if (!surface)
        {
            return;
        }

        if (capture)
        {
            stored.set(id, captureState(surface, id));
        }

        surface.destroy();
        surfaces.delete(id);
        weights.delete(id);
        deps.unmount(id);
    }

    /**
     * Reads a surface's state defensively — a component throwing during
     * capture must not prevent the rest of the canvas from reconciling.
     *
     * @param surface - The surface to read.
     * @param id      - Node id, for the warning message.
     * @returns The captured state, or an empty object on failure.
     */
    function captureState(
        surface: Surface,
        id: string): Record<string, unknown>
    {
        try
        {
            return surface.getState();
        }
        catch (err)
        {
            logWarn(`getState() failed for node "${id}":`, err);
            return {};
        }
    }

    return {
        sync,

        getSurface: (id) => surfaces.get(id) ?? null,

        isMounted: (id) => surfaces.has(id),

        getDemoted: () => [...stored.keys()].sort(),

        getChips: () => [...chips].sort(),

        getStoredState: (id) => stored.get(id) ?? null,

        getMountedWeight: () => [...weights.values()].reduce(
            (total, w) => total + w, 0),

        destroy()
        {
            for (const id of [...surfaces.keys()])
            {
                unmountNode(id, false);
            }

            stored.clear();
            chips.clear();
            weights.clear();
        },
    };
}

// ============================================================================
// DECAY
// ============================================================================

/**
 * Finds nodes that have gone untouched long enough to collapse to a chip.
 *
 * Nothing is destroyed — a chip keeps its captured state and restores on
 * click — so the canvas stays bounded without ever losing the user's work.
 *
 * @param doc        - The document being synced.
 * @param turn       - Current turn counter.
 * @param decayTurns - Turns of inactivity before collapsing.
 * @returns Node ids that should be chips.
 */
function findDecayed(
    doc: CanvasDocument,
    turn: number,
    decayTurns: number): Set<string>
{
    const decayed = new Set<string>();

    for (const node of Object.values(doc.nodes))
    {
        if (!node.pinned && turn - node.provenance.lastTouched > decayTurns)
        {
            decayed.add(node.id);
        }
    }

    return decayed;
}

// ============================================================================
// LOGGING
// ============================================================================

/**
 * Emits a structured warning.
 *
 * @param args - Message parts.
 */
function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}
