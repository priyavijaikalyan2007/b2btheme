/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: a2d84942-411d-4ade-9b85-935476c44f4f
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Types
 * 📜 PURPOSE: The shared vocabulary of the Dynamic UI layer — capability
 *    manifests, the Surface contract, the CanvasDocument scene format, wiring
 *    bindings, resolver requests, and the host adapter interface. Types only;
 *    no behaviour lives here.
 * 🔗 RELATES: [[DynamicCanvas]], [[CapabilityManifest]], [[CanvasDocument]]
 * ⚡ FLOW: [every runtime module] -> [imports from types]
 * 🔒 SECURITY: Documents are untrusted input. Every type here is validated at
 *    the boundary by document-validate before any factory is resolved.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-types
// @entrypoint

// ============================================================================
// VOCABULARY
// ============================================================================

/**
 * The shape of data a component can render or emit.
 * Drives resolver scoring and binding type-checking.
 */
export type DataShape =
    | "scalar"
    | "record"
    | "collection"
    | "hierarchy"
    | "graph"
    | "timeseries"
    | "document"
    | "media"
    | "geo"
    | "diff";

/**
 * What the user is trying to do. The host supplies an intent; the resolver
 * maps (intent, shape) onto a component.
 */
export type IntentVerb =
    | "browse"
    | "inspect"
    | "compare"
    | "monitor"
    | "edit"
    | "author"
    | "navigate"
    | "summarize"
    | "relate"
    | "schedule";

/**
 * How much of the Surface contract a component satisfies.
 * Verified by the conformance suite — never self-declared.
 */
export type ConformanceLevel = "display" | "field" | "surface";

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

/** Detaches a previously registered channel handler. Idempotent. */
export type Unsubscribe = () => void;

/** Receives a channel payload when a source component emits. */
export type ChannelHandler = (payload: unknown) => void;

/**
 * The uniform contract a canvas-mounted component satisfies.
 *
 * Purely additive to existing components: constructor callbacks remain public
 * API and keep firing. `on()` adds a rebindable subscription surface that
 * constructor callbacks cannot provide.
 */
export interface Surface
{
    /** Fill a declared slot. Must be idempotent for equal input. */
    setData(slot: string, value: unknown): void;

    /** Subscribe to a declared channel. Returns an unsubscribe function. */
    on(channel: string, handler: ChannelHandler): Unsubscribe;

    /** Serialisable view state, limited to the manifest's stateKeys. */
    getState(): Record<string, unknown>;

    /** Restore state produced by getState(). Partial input is allowed. */
    setState(state: Record<string, unknown>): void;

    /** Tear down listeners and remove DOM. MUST be idempotent. */
    destroy(): void;
}

// ============================================================================
// CAPABILITY MANIFEST
// ============================================================================

/** A data shape plus the intents a component serves well for that shape. */
export interface Affordance
{
    /** The data shape this affordance handles. */
    readonly shape: DataShape;

    /** Intent verbs this affordance serves well. */
    readonly intents: readonly IntentVerb[];

    /** Comfortable item count. Outside this range the score decays. */
    readonly cardinality: { readonly min: number; readonly max: number };

    /** Comfortable field or column count, where meaningful. */
    readonly density?: { readonly min: number; readonly max: number };

    /** Smallest viewport in which the affordance stays usable. */
    readonly minViewport: { readonly w: number; readonly h: number };
}

/** An event channel a component emits. */
export interface ChannelSpec
{
    /** Channel name, e.g. "selection". Namespaced by node id at runtime. */
    readonly name: string;

    /** Payload shape, used to type-check bindings. */
    readonly payload: DataShape;

    /** True when the channel can emit more than one item at a time. */
    readonly multi: boolean;

    /**
     * Name of the pre-existing constructor callback option that delivers this
     * same event, e.g. "onSelect" for the "selection" channel.
     *
     * Declaring it lets the conformance suite assert the ADDITIVE guarantee:
     * that the original callback still fires, and still fires first, after the
     * component gains `on()`. Omit only when the channel is genuinely new.
     */
    readonly legacyOption?: string;
}

/** A data slot a component accepts. */
export interface SlotSpec
{
    /** Slot name, referenced by Binding.to.slot. */
    readonly name: string;

    /** Payload shape this slot accepts. */
    readonly payload: DataShape;

    /** Handle method invoked to fill the slot. Defaults to "setData". */
    readonly setter?: string;

    /** True when the component cannot render without this slot filled. */
    readonly required: boolean;
}

/** A dispatchable action a component offers. */
export interface ActionSpec
{
    /** Stable identifier, unique within the component. */
    readonly id: string;

    /** Human-readable label for the node chrome. */
    readonly label: string;

    /** Bootstrap Icon class. */
    readonly icon?: string;

    /** Routed through ConfirmDialog before dispatch when true. */
    readonly destructive: boolean;

    /** Permission keys compared against CanvasNode.grants for display only. */
    readonly requires: readonly string[];
}

/** Cost model consumed by the canvas mount budget. */
export interface WeightSpec
{
    /** Minified JS bytes. Filled by the build from the compiled bundle. */
    readonly js: number;

    /** Rough mount cost class. */
    readonly mountCost: "trivial" | "light" | "moderate" | "heavy";

    /** True when the component holds a canvas, worker, or observer. */
    readonly holdsResources: boolean;
}

/**
 * The semantic layer above a raw component. Colocated in the component's own
 * folder as `<name>.manifest.ts` and aggregated at build time.
 */
export interface CapabilityManifest
{
    /** Registry key. Matches the component folder name. */
    readonly name: string;

    /** Window global factory name. The allowlist entry. */
    readonly factory: string;

    /**
     * Argument order the factory expects.
     *
     * ADR-134 declares `create<Name>(containerId, options)` canonical, but an
     * audit of the fleet found only 35 of 118 components follow it. The rest
     * take `(options, containerId)` or a single `(options)` carrying the host
     * element. Changing that many public signatures would break the additive
     * guarantee, so the convention is recorded as data and the runtime honours
     * all three. Defaults to "container-first".
     */
    readonly factoryStyle?:
        | "container-first"
        | "options-first"
        | "options-only";

    /**
     * For `options-only` factories, the option key carrying the host.
     * Defaults to "container".
     */
    readonly containerOption?: string;

    /**
     * How the component attaches to its host.
     *
     * `factoryStyle` describes ARGUMENT ORDER; this describes ATTACHMENT, and
     * the fleet varies independently on both. Most factories attach
     * themselves ("auto"). Some construct detached and attach when told
     * ("show"). Some build an element for the caller to place
     * ("getElement"). Guessing wrong yields a component that constructs
     * cleanly and renders nothing — see the renders-content conformance check.
     *
     * Defaults to "auto".
     */
    readonly mountMethod?: "auto" | "show" | "getElement";

    /**
     * Whether `containerOption` expects the host ELEMENT or its ID STRING.
     *
     * Both exist in the fleet — TreeView takes `options.containerId` (a
     * string) while GraphCanvas takes `options.container` (an element) — and
     * guessing wrong produces a component that constructs successfully and
     * renders nothing, which is far harder to spot than a thrown error.
     * Declared explicitly for that reason. Defaults to "element".
     */
    readonly containerAs?: "element" | "id";

    /** Human-readable label. */
    readonly label: string;

    /** Bootstrap Icon class. */
    readonly icon: string;

    /** Grouping for pickers and the Component Studio. */
    readonly category: string;

    /** What this component can render. Drives resolver scoring. */
    readonly affords: readonly Affordance[];

    /** Typed channels this component emits. */
    readonly emits: readonly ChannelSpec[];

    /** Typed slots this component accepts. */
    readonly accepts: readonly SlotSpec[];

    /** Declared, dispatchable actions. */
    readonly actions: readonly ActionSpec[];

    /** Keys returned by getState(), used for restore. */
    readonly stateKeys: readonly string[];

    /** Cost model for the mount budget. */
    readonly weight: WeightSpec;

    /** Default canvas size at mount time. */
    readonly defaultSize: { readonly w: number; readonly h: number };

    /** Default options passed to the factory. */
    readonly defaultOptions: Readonly<Record<string, unknown>>;

    /** Conformance level. Gated by the suite, not self-declared. */
    readonly conformance: ConformanceLevel;

    /** Deterministic tie-break for equal resolver scores. Higher wins. */
    readonly priority: number;
}

// ============================================================================
// CANVAS DOCUMENT
// ============================================================================

/** Named canvas regions the packer understands. */
export type Region = "main" | "side" | "detail" | "strip" | "overlay";

/** Coarse size request resolved to pixels by the packer. */
export type SizeHint = "compact" | "standard" | "wide" | "tall" | "full";

/**
 * Where a node sits. Authored as intent; promoted to fixed coordinates the
 * moment the user drags or resizes it.
 */
export type Placement =
    | { readonly kind: "intent"; readonly region: Region; readonly size: SizeHint }
    | {
        readonly kind: "fixed";
        readonly x: number;
        readonly y: number;
        readonly w: number;
        readonly h: number;
        readonly z: number;
    };

/** What a node is attached to. */
export type Anchor =
    | { readonly kind: "canvas" }
    | { readonly kind: "node"; readonly nodeId: string }
    | { readonly kind: "entity"; readonly entityId: string };

/**
 * How a node obtains its data. Records provenance, never rows.
 *
 * `live` re-runs the query on restore so the canvas reflects current reality.
 * `frozen` carries a snapshot, and is what pinned and shared canvases use so
 * that a restored canvas shows what the user actually saw.
 */
export interface DataSource
{
    /** Opaque to the runtime; meaningful to the host's onFetch. */
    readonly query: Readonly<Record<string, unknown>>;

    /** Replay strategy on restore. */
    readonly dataMode: "live" | "frozen";

    /** Populated only when dataMode is "frozen". */
    readonly snapshot?: unknown;
}

/** Provenance and decay bookkeeping for a node. */
export interface NodeProvenance
{
    /** Conversation turn that introduced this node. */
    readonly turnId: string;

    /** Monotonic turn counter at last interaction. Drives decay. */
    readonly lastTouched: number;
}

/** One mounted component on the canvas. */
export interface CanvasNode
{
    /** Unique within the document. */
    readonly id: string;

    /** Registry key. Resolved allowlist-only — never by scanning window. */
    readonly component: string;

    /** Where it sits. */
    readonly placement: Placement;

    /** Options passed to the factory at mount. */
    readonly options: Readonly<Record<string, unknown>>;

    /** How it obtains data, or null when the host feeds it directly. */
    readonly source: DataSource | null;

    /** View state captured from Surface.getState(). */
    readonly state: Readonly<Record<string, unknown>>;

    /** What it is attached to. */
    readonly anchor: Anchor;

    /** Provenance and decay. */
    readonly provenance: NodeProvenance;

    /** True when the user has pinned it against decay and eviction. */
    readonly pinned: boolean;

    /** Permission hints for affordance rendering only. NOT a security boundary. */
    readonly grants: readonly string[];
}

/** What happens when a bound source emits more than one item. */
export type CardinalityPolicy = "replace" | "fanout" | "merge";

/** A declarative wire between two nodes. */
export interface Binding
{
    /** Unique within the document. */
    readonly id: string;

    /** Source node and the channel it emits. */
    readonly from: { readonly node: string; readonly channel: string };

    /** Target node and the slot it fills. */
    readonly to: { readonly node: string; readonly slot: string };

    /** Structural behaviour on multi-item emission. */
    readonly cardinality: CardinalityPolicy;

    /** Optional named transform from the transform registry. Never code. */
    readonly transform?: string;

    /** Cap for fanout policy. Defaults to DEFAULT_MAX_FANOUT. */
    readonly maxFanout?: number;
}

/** Pan offset and zoom for the infinite canvas. */
export interface Viewport
{
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
}

/** The materialised scene. Produced by folding a patch log. */
export interface CanvasDocument
{
    readonly schemaVersion: 1;
    readonly id: string;
    readonly workspaceId: string;
    readonly title: string;

    /** Mounted components, keyed by node id. */
    readonly nodes: Readonly<Record<string, CanvasNode>>;

    /** Declarative wiring between nodes. */
    readonly bindings: readonly Binding[];

    /** Pan and zoom. */
    readonly viewport: Viewport;

    /** Conversation turn that produced this revision. */
    readonly turnId: string;

    /** Monotonic revision, incremented per applied patch. */
    readonly revision: number;
}

// ============================================================================
// PATCHES
// ============================================================================

/** A single mutation within a patch. */
export type PatchOp =
    | { readonly op: "setMeta"; readonly title?: string; readonly workspaceId?: string }
    | { readonly op: "addNode"; readonly node: CanvasNode }
    | { readonly op: "removeNode"; readonly id: string }
    | { readonly op: "updateNode"; readonly id: string; readonly changes: Partial<CanvasNode> }
    | { readonly op: "addBinding"; readonly binding: Binding }
    | { readonly op: "removeBinding"; readonly id: string }
    | { readonly op: "setViewport"; readonly viewport: Viewport };

/**
 * One turn's worth of change. The append-only patch log is the source of
 * truth; documents are materialised by folding it.
 */
export interface CanvasPatch
{
    /** Conversation turn that produced this patch. */
    readonly turnId: string;

    /** Monotonic, starting at 1 for the first patch. */
    readonly revision: number;

    /** Ordered mutations. Applied atomically — all or none. */
    readonly ops: readonly PatchOp[];
}

// ============================================================================
// RESOLVER
// ============================================================================

/** What the host knows about the data it wants shown. */
export interface ResolveRequest
{
    readonly intent: IntentVerb;
    readonly shape: DataShape;
    readonly cardinality: number;
    readonly fieldCount?: number;
    readonly viewport: { readonly w: number; readonly h: number };

    /** Explicit hint from the host or model. Boosts but does not force. */
    readonly prefer?: string;
}

/** One scoring contribution, surfaced in the "why?" affordance. */
export interface ScoreReason
{
    readonly factor: string;
    readonly delta: number;
}

/** A candidate component with its score and the reasons behind it. */
export interface ScoredCandidate
{
    readonly component: string;
    readonly score: number;
    readonly reasons: readonly ScoreReason[];
}

/**
 * Always carries the full ranked list, never just the winner — the canvas
 * renders "why?" and "show as…" from it.
 */
export interface ResolveResult
{
    /** Winning component name, or null when nothing afforded the request. */
    readonly chosen: string | null;

    /** All viable candidates, descending by score. */
    readonly candidates: readonly ScoredCandidate[];
}

/** Host-registered nudge toward a component for a (shape, intent) pair. */
export interface PresentationPreference
{
    readonly prefer: string;
    readonly weight: number;
}

// ============================================================================
// HOST ADAPTERS
// ============================================================================

/** Context handed to the host when the user expresses an intent. */
export interface ResolveContext
{
    /** Raw user utterance, unparsed. */
    readonly utterance: string;

    /** Current document, so the host can author a delta. */
    readonly document: CanvasDocument;

    /** Turn this utterance belongs to. */
    readonly turnId: string;
}

/** Result of dispatching a declared action. */
export interface ActionResult
{
    readonly ok: boolean;

    /** Literate message shown to the user when ok is false. */
    readonly message?: string;
}

/** Executes a declared action. Where authorisation actually happens. */
export type ActionDispatcher = (
    req: {
        readonly nodeId: string;
        readonly actionId: string;
        readonly payload: unknown;
    }
) => Promise<ActionResult>;

/**
 * The complete surface a consuming application implements. Six functions.
 * Everything intelligent — model, storage, queries, authorisation — lives
 * behind this interface and never inside the runtime.
 */
export interface DynamicUIHost
{
    /** Turn an intent plus context into a patch. Where the model lives. */
    onResolve(ctx: ResolveContext): Promise<CanvasPatch>;

    /** Execute a node's declared data source. Where queries live. */
    onFetch(source: DataSource, nodeId: string): Promise<unknown>;

    /** Persist a patch. Where storage lives. */
    onPersist(canvasId: string, patch: CanvasPatch): Promise<void>;

    /** Load a canvas patch log, optionally truncated at a revision. */
    onLoad(canvasId: string, revision?: number): Promise<readonly CanvasPatch[]>;

    /** Execute a declared action. Where authorisation lives. */
    actionDispatcher: ActionDispatcher;

    /** Optional: narrow or extend the component allowlist. */
    capabilitiesProvider?: () => readonly CapabilityManifest[];
}
