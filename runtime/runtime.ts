/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime
 * 📜 PURPOSE: Headless runtime for the Dynamic UI layer — CanvasDocument
 *    validation and folding, declarative wiring, intent resolution, the
 *    allowlisted component registry, deterministic packing, and mount
 *    lifecycle with virtualization.
 * 🔗 RELATES: [[DynamicCanvas]], [[WorkspaceShell]], [[ChatDock]]
 * ⚡ FLOW: [host] -> [window.EnterpriseRuntime] -> [canvas]
 * 🔒 SECURITY: Allowlist-only factory resolution (ADR-143). Documents are
 *    untrusted input and validated before any mount.
 * 📦 BUILD: Concatenated from runtime/src by scripts/bundle-runtime.sh
 * ----------------------------------------------------------------------------
 */

// @entrypoint


// ========================================================================
// SOURCE: types.ts
// ========================================================================

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
type DataShape =
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
type IntentVerb =
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
type ConformanceLevel = "display" | "field" | "surface";

// ============================================================================
// SURFACE CONTRACT
// ============================================================================

/** Detaches a previously registered channel handler. Idempotent. */
type Unsubscribe = () => void;

/** Receives a channel payload when a source component emits. */
type ChannelHandler = (payload: unknown) => void;

/**
 * The uniform contract a canvas-mounted component satisfies.
 *
 * Purely additive to existing components: constructor callbacks remain public
 * API and keep firing. `on()` adds a rebindable subscription surface that
 * constructor callbacks cannot provide.
 */
interface Surface
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
interface Affordance
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
interface ChannelSpec
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
interface SlotSpec
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
interface ActionSpec
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
interface WeightSpec
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
interface CapabilityManifest
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
     * How the component occupies the canvas.
     *
     * `framed` (default) is an ordinary widget: title bar, chrome, packed into
     * the layout, treated as an obstacle. `overlay` is a mark ON the canvas —
     * no chrome, never an obstacle, never displaces anything.
     *
     * This is a property of the COMPONENT, not of its anchor. An annotation is
     * an overlay whether or not it is bound to a node; rendering one as a
     * framed widget produced a titled box containing a dot, which is nobody's
     * idea of an annotation.
     */
    readonly presentation?: "framed" | "overlay";

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
type Region = "main" | "side" | "detail" | "strip" | "overlay";

/** Coarse size request resolved to pixels by the packer. */
type SizeHint = "compact" | "standard" | "wide" | "tall" | "full";

/**
 * Where a node sits. Authored as intent; promoted to fixed coordinates the
 * moment the user drags or resizes it.
 */
type Placement =
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
type Anchor =
    | { readonly kind: "canvas" }
    | {
        readonly kind: "node";
        readonly nodeId: string;

        /**
         * Where within the target to attach, as fractions of its box
         * (0..1 from its top-left). Omitted means the top-right corner, which
         * is the right default for "this node" but wrong for "this cell".
         *
         * This is what lets an annotation mark a PLACE rather than a whole
         * node. A canvas placement gesture supplies it from the pointer.
         */
        readonly spot?: { readonly x: number; readonly y: number };
    }
    | { readonly kind: "entity"; readonly entityId: string };

/**
 * How a node obtains its data. Records provenance, never rows.
 *
 * `live` re-runs the query on restore so the canvas reflects current reality.
 * `frozen` carries a snapshot, and is what pinned and shared canvases use so
 * that a restored canvas shows what the user actually saw.
 */
interface DataSource
{
    /** Opaque to the runtime; meaningful to the host's onFetch. */
    readonly query: Readonly<Record<string, unknown>>;

    /** Replay strategy on restore. */
    readonly dataMode: "live" | "frozen";

    /** Populated only when dataMode is "frozen". */
    readonly snapshot?: unknown;
}

/** Provenance and decay bookkeeping for a node. */
interface NodeProvenance
{
    /** Conversation turn that introduced this node. */
    readonly turnId: string;

    /** Monotonic turn counter at last interaction. Drives decay. */
    readonly lastTouched: number;
}

/** One mounted component on the canvas. */
interface CanvasNode
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
type CardinalityPolicy = "replace" | "fanout" | "merge";

/** A declarative wire between two nodes. */
interface Binding
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
interface Viewport
{
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
}

/** The materialised scene. Produced by folding a patch log. */
interface CanvasDocument
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
type PatchOp =
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
interface CanvasPatch
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
interface ResolveRequest
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
interface ScoreReason
{
    readonly factor: string;
    readonly delta: number;
}

/** A candidate component with its score and the reasons behind it. */
interface ScoredCandidate
{
    readonly component: string;
    readonly score: number;
    readonly reasons: readonly ScoreReason[];
}

/**
 * Always carries the full ranked list, never just the winner — the canvas
 * renders "why?" and "show as…" from it.
 */
interface ResolveResult
{
    /** Winning component name, or null when nothing afforded the request. */
    readonly chosen: string | null;

    /** All viable candidates, descending by score. */
    readonly candidates: readonly ScoredCandidate[];
}

/** Host-registered nudge toward a component for a (shape, intent) pair. */
interface PresentationPreference
{
    readonly prefer: string;
    readonly weight: number;
}

// ============================================================================
// HOST ADAPTERS
// ============================================================================

/** Context handed to the host when the user expresses an intent. */
interface ResolveContext
{
    /** Raw user utterance, unparsed. */
    readonly utterance: string;

    /** Current document, so the host can author a delta. */
    readonly document: CanvasDocument;

    /** Turn this utterance belongs to. */
    readonly turnId: string;
}

/** Result of dispatching a declared action. */
interface ActionResult
{
    readonly ok: boolean;

    /** Literate message shown to the user when ok is false. */
    readonly message?: string;
}

/** Executes a declared action. Where authorisation actually happens. */
type ActionDispatcher = (
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
interface DynamicUIHost
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

// ========================================================================
// SOURCE: constants.ts
// ========================================================================

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


/** Log prefix for all console output from the runtime. */
const LOG_PREFIX = "[DynamicUIRuntime]";

/** Document schema version this runtime reads and writes. */
const SCHEMA_VERSION = 1;

// ============================================================================
// CLOSED VOCABULARIES
// ============================================================================

/** Every legal DataShape. The validator rejects anything else. */
const DATA_SHAPES: readonly DataShape[] =
[
    "scalar", "record", "collection", "hierarchy", "graph",
    "timeseries", "document", "media", "geo", "diff",
];

/** Every legal IntentVerb. */
const INTENT_VERBS: readonly IntentVerb[] =
[
    "browse", "inspect", "compare", "monitor", "edit",
    "author", "navigate", "summarize", "relate", "schedule",
];

/** Every legal canvas region. */
const REGIONS: readonly Region[] =
[
    "main", "side", "detail", "strip", "overlay",
];

/** Every legal size hint. */
const SIZE_HINTS: readonly SizeHint[] =
[
    "compact", "standard", "wide", "tall", "full",
];

/** Every legal cardinality policy. */
const CARDINALITY_POLICIES: readonly CardinalityPolicy[] =
[
    "replace", "fanout", "merge",
];

// ============================================================================
// WIRING
// ============================================================================

/** Cap on nodes spawned by a single fanout binding. */
const DEFAULT_MAX_FANOUT = 6;

/** Hard ceiling a document may not raise maxFanout beyond. */
const FANOUT_CEILING = 24;

// ============================================================================
// LIFECYCLE BUDGET
// ============================================================================

/** Default ceiling on simultaneously mounted nodes. */
const DEFAULT_MOUNT_CAP = 24;

/** Default ceiling on total mounted weight, in JS bytes. */
const DEFAULT_WEIGHT_BUDGET = 1_500_000;

/** Turns a node may go untouched before collapsing to a chip. */
const DEFAULT_DECAY_TURNS = 12;

/** Viewport margin, in canvas pixels, within which nodes stay mounted. */
const DEFAULT_MOUNT_MARGIN = 400;

// ============================================================================
// PACKER GEOMETRY
// ============================================================================

/** Gap between packed nodes, in canvas pixels. */
const PACK_GUTTER = 16;

/** Pixel width each SizeHint requests from the packer. */
const SIZE_HINT_WIDTH: Readonly<Record<SizeHint, number>> =
{
    compact: 280,
    standard: 420,
    wide: 720,
    tall: 420,
    full: 1080,
};

/** Pixel height each SizeHint requests from the packer. */
const SIZE_HINT_HEIGHT: Readonly<Record<SizeHint, number>> =
{
    compact: 200,
    standard: 320,
    wide: 380,
    tall: 640,
    full: 720,
};

/** Left-edge origin, in canvas pixels, for each region's shelf. */
const REGION_ORIGIN_X: Readonly<Record<Region, number>> =
{
    main: 0,
    side: 1160,
    detail: 0,
    strip: 0,
    overlay: 0,
};

// ========================================================================
// SOURCE: errors.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c7a639ca-49d8-4d70-85e2-6bcad5583808
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Errors
 * 📜 PURPOSE: Literate error construction for the Dynamic UI layer. Every
 *    validation failure names the offending JSON path, states what was found,
 *    what was expected, and what the author should do about it.
 * 🔗 RELATES: [[DocumentValidate]], [[Registry]], [[LiterateErrors]]
 * ⚡ FLOW: [validator/registry] -> [issue()] -> [ValidationIssue[]] -> [host UI]
 * 🔒 SECURITY: Messages embed untrusted values via JSON.stringify and are
 *    rendered with textContent by consumers — never as HTML.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-errors


// ============================================================================
// TYPES
// ============================================================================

/**
 * A single validation failure. Carries enough structure that a host can
 * render it as a literate error without re-parsing a message string.
 */
interface ValidationIssue
{
    /** JSON path to the offending value, e.g. "nodes.n1.placement.region". */
    readonly path: string;

    /** What is wrong, in one sentence. */
    readonly problem: string;

    /** What the author should do instead. */
    readonly remedy: string;
}

/** Outcome of validating a document, patch, or manifest. */
interface ValidationResult
{
    readonly ok: boolean;
    readonly issues: readonly ValidationIssue[];
}

// ============================================================================
// CONSTRUCTION
// ============================================================================

/**
 * Builds a validation issue.
 *
 * @param path    - JSON path to the offending value.
 * @param problem - What is wrong, in one sentence.
 * @param remedy  - What the author should do instead.
 * @returns The issue.
 */
function issue(
    path: string,
    problem: string,
    remedy: string): ValidationIssue
{
    return { path, problem, remedy };
}

/**
 * Builds an issue for a value outside a closed vocabulary.
 *
 * @param path    - JSON path to the offending value.
 * @param found   - The value that was supplied.
 * @param allowed - Every legal value.
 * @returns The issue, listing the legal values.
 */
function enumIssue(
    path: string,
    found: unknown,
    allowed: readonly string[]): ValidationIssue
{
    return issue(
        path,
        `Found ${describe(found)}, which is not a recognised value.`,
        `Use one of: ${allowed.join(", ")}.`);
}

/**
 * Builds an issue for a missing or wrongly typed required field.
 *
 * @param path     - JSON path to the offending value.
 * @param expected - Human-readable description of the expected type.
 * @param found    - The value that was supplied.
 * @returns The issue.
 */
function typeIssue(
    path: string,
    expected: string,
    found: unknown): ValidationIssue
{
    return issue(
        path,
        `Expected ${expected} but found ${describe(found)}.`,
        `Supply a valid ${expected} at "${path}".`);
}

/**
 * Renders a value for inclusion in an error message, truncating long output
 * so a large payload cannot flood the message.
 *
 * @param value - The value to describe.
 * @returns A short, safe description.
 */
function describe(value: unknown): string
{
    if (value === undefined)
    {
        return "nothing";
    }

    if (value === null)
    {
        return "null";
    }

    const rendered = safeStringify(value);

    return rendered.length > 64
        ? `${rendered.slice(0, 61)}...`
        : rendered;
}

/**
 * Stringifies a value without throwing on cycles or exotic types.
 *
 * @param value - The value to stringify.
 * @returns A string representation, never a thrown error.
 */
function safeStringify(value: unknown): string
{
    try
    {
        return JSON.stringify(value) ?? String(value);
    }
    catch
    {
        return Object.prototype.toString.call(value);
    }
}

// ============================================================================
// RESULTS
// ============================================================================

/** A passing validation result. */
function valid(): ValidationResult
{
    return { ok: true, issues: [] };
}

/**
 * Builds a validation result from a list of issues.
 *
 * @param issues - Every issue found. An empty list yields a passing result.
 * @returns The result.
 */
function result(issues: readonly ValidationIssue[]): ValidationResult
{
    return { ok: issues.length === 0, issues };
}

/**
 * Formats a validation result as a single human-readable message, suitable
 * for a thrown Error or a literate error dialog body.
 *
 * @param res     - The validation result to format.
 * @param subject - What was being validated, e.g. "canvas document".
 * @returns A multi-line message. Empty string when the result passed.
 */
function formatIssues(
    res: ValidationResult,
    subject: string): string
{
    if (res.ok)
    {
        return "";
    }

    const lines = res.issues.map(
        (i) => `  • ${i.path}: ${i.problem} ${i.remedy}`);

    return `${LOG_PREFIX} Invalid ${subject} `
        + `(${res.issues.length} issue${res.issues.length === 1 ? "" : "s"}):\n`
        + lines.join("\n");
}

// ========================================================================
// SOURCE: predicates.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 8c41d70e-53b2-4a96-b8ef-7f0a2d951c63
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Predicates
 * 📜 PURPOSE: Type guards shared by the validators. Extracted because the
 *    browser bundle concatenates every runtime module into one scope, where
 *    two modules each defining `isObject` is a duplicate declaration — and
 *    because they were genuine copy-paste duplication in the source anyway.
 * 🔗 RELATES: [[Document]], [[Registry]]
 * ⚡ FLOW: [validators] -> [predicates]
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-predicates

/**
 * True when the value is a non-null, non-array object.
 *
 * @param v - Candidate value.
 * @returns Whether it is a plain object.
 */
function isObject(v: unknown): v is Record<string, unknown>
{
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * True when the value is a finite number.
 *
 * @param v - Candidate value.
 * @returns Whether it is a usable number.
 */
function isFiniteNumber(v: unknown): v is number
{
    return typeof v === "number" && Number.isFinite(v);
}

/**
 * True when the value is a non-empty string.
 *
 * @param v - Candidate value.
 * @returns Whether it is a non-empty string.
 */
function isNonEmptyString(v: unknown): v is string
{
    return typeof v === "string" && v.length > 0;
}

/**
 * True when the value is a usable identifier: a non-empty string free of
 * control characters.
 *
 * Control characters are rejected because the wiring engine composes node ids
 * and channel names into lookup keys with a NUL separator. An id carrying a
 * NUL could forge a key belonging to a different pair and silently deliver to
 * the wrong channel.
 *
 * @param v - Candidate value.
 * @returns Whether it is safe to use as an identifier.
 */
function isIdentifier(v: unknown): v is string
{
    // eslint-disable-next-line no-control-regex
    return isNonEmptyString(v) && !/[\u0000-\u001F]/.test(v);
}

// ========================================================================
// SOURCE: document.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 50fef56f-96f9-4cc0-835c-cff8832c090f
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Document
 * 📜 PURPOSE: The CanvasDocument scene format — validation with literate,
 *    path-named errors, and the pure patch fold that materialises a document
 *    from an append-only log. History scrubbing and branching fall out of the
 *    fold rather than needing machinery of their own.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[WiringEngine]], [[DynamicCanvas]]
 * ⚡ FLOW: [host patch log] -> [fold()] -> [CanvasDocument] -> [canvas]
 * 🔒 SECURITY: Documents are untrusted input. validateDocument() runs before
 *    any factory is resolved, and applyPatch({validate:true}) is atomic — a
 *    rejected patch never partially applies.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-document
// @entrypoint





/** Every legal PatchOp discriminator. */
const PATCH_OPS: readonly string[] =
[
    "setMeta", "addNode", "removeNode", "updateNode",
    "addBinding", "removeBinding", "setViewport",
];

// ============================================================================
// CONSTRUCTION
// ============================================================================

/**
 * Builds an empty, valid document at revision zero.
 *
 * @param id          - Canvas identifier.
 * @param workspaceId - Owning workspace identifier.
 * @param title       - Optional display title.
 * @returns A new empty document.
 */
function createEmptyDocument(
    id: string,
    workspaceId: string,
    title = "Untitled canvas"): CanvasDocument
{
    return {
        schemaVersion: SCHEMA_VERSION as 1,
        id,
        workspaceId,
        title,
        nodes: {},
        bindings: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        turnId: "",
        revision: 0,
    };
}

// ============================================================================
// VALIDATION — HEADER
// ============================================================================

/**
 * Validates the scalar header fields of a document.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateHeader(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (doc.schemaVersion !== SCHEMA_VERSION)
    {
        issues.push(issue(
            "schemaVersion",
            `Found ${String(doc.schemaVersion)}, but this runtime reads version ${SCHEMA_VERSION}.`,
            `Set schemaVersion to ${SCHEMA_VERSION}, or migrate the document.`));
    }

    for (const key of ["id", "workspaceId"])
    {
        if (!isIdentifier(doc[key]))
        {
            issues.push(typeIssue(key, "a non-empty string", doc[key]));
        }
    }

    if (typeof doc.title !== "string")
    {
        issues.push(typeIssue("title", "a string", doc.title));
    }

    if (!isFiniteNumber(doc.revision) || doc.revision < 0)
    {
        issues.push(typeIssue("revision", "a revision number of zero or more", doc.revision));
    }

    validateViewport(doc.viewport, "viewport", issues);
}

/**
 * Validates a viewport object.
 *
 * @param value  - The candidate viewport.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateViewport(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a viewport object", value));
        return;
    }

    for (const key of ["x", "y", "zoom"] as const)
    {
        if (!isFiniteNumber(value[key]))
        {
            issues.push(typeIssue(`${path}.${key}`, "a number", value[key]));
        }
    }
}

// ============================================================================
// VALIDATION — NODES
// ============================================================================

/**
 * Validates every node in the document, including key/id agreement and
 * anchor targets.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateNodes(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const nodes = doc.nodes;

    if (!isObject(nodes))
    {
        issues.push(typeIssue("nodes", "an object keyed by node id", nodes));
        return;
    }

    const ids = new Set(Object.keys(nodes));

    for (const [key, value] of Object.entries(nodes))
    {
        validateNode(key, value, ids, issues);
    }
}

/**
 * Validates one node.
 *
 * @param key    - The key the node is filed under.
 * @param value  - The candidate node.
 * @param ids    - Every node id in the document, for anchor resolution.
 * @param issues - Accumulator appended to in place.
 */
function validateNode(
    key: string,
    value: unknown,
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    const path = `nodes.${key}`;

    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a node object", value));
        return;
    }

    if (value.id !== key)
    {
        issues.push(issue(
            `${path}.id`,
            `Node id ${String(value.id)} does not match the key it is filed under.`,
            `Set id to "${key}", or move the node to key "${String(value.id)}".`));
    }

    if (!isIdentifier(value.component))
    {
        issues.push(typeIssue(`${path}.component`, "a component name", value.component));
    }

    if (typeof value.pinned !== "boolean")
    {
        issues.push(typeIssue(`${path}.pinned`, "a boolean", value.pinned));
    }

    validatePlacement(value.placement, `${path}.placement`, issues);
    validateAnchor(value.anchor, `${path}.anchor`, ids, issues);
    validateSource(value.source, `${path}.source`, issues);
}

/**
 * Validates a placement, which is either layout intent or fixed coordinates.
 *
 * @param value  - The candidate placement.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validatePlacement(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a placement object", value));
        return;
    }

    if (value.kind === "intent")
    {
        validateEnum(value.region, `${path}.region`, REGIONS, issues);
        validateEnum(value.size, `${path}.size`, SIZE_HINTS, issues);
        return;
    }

    if (value.kind === "fixed")
    {
        for (const key of ["x", "y", "w", "h", "z"] as const)
        {
            if (!isFiniteNumber(value[key]))
            {
                issues.push(typeIssue(`${path}.${key}`, "a number", value[key]));
            }
        }
        return;
    }

    issues.push(enumIssue(`${path}.kind`, value.kind, ["intent", "fixed"]));
}

/**
 * Validates an anchor and resolves a node anchor against the document.
 *
 * @param value  - The candidate anchor.
 * @param path   - JSON path for error reporting.
 * @param ids    - Every node id in the document.
 * @param issues - Accumulator appended to in place.
 */
function validateAnchor(
    value: unknown,
    path: string,
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "an anchor object", value));
        return;
    }

    if (value.kind === "canvas")
    {
        return;
    }

    if (value.kind === "node")
    {
        if (!ids.has(String(value.nodeId)))
        {
            issues.push(issue(
                `${path}.nodeId`,
                `Anchored to node "${String(value.nodeId)}", which is not in this document.`,
                "Anchor to an existing node, or use an entity or canvas anchor."));
        }
        return;
    }

    if (value.kind === "entity")
    {
        if (!isIdentifier(value.entityId))
        {
            issues.push(typeIssue(`${path}.entityId`, "an entity id", value.entityId));
        }
        return;
    }

    issues.push(enumIssue(`${path}.kind`, value.kind, ["canvas", "node", "entity"]));
}

/**
 * Validates a data source, enforcing that a frozen source carries a snapshot.
 *
 * @param value  - The candidate source, or null.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateSource(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (value === null || value === undefined)
    {
        return;
    }

    if (!isObject(value))
    {
        issues.push(typeIssue(path, "a data source object or null", value));
        return;
    }

    if (!isObject(value.query))
    {
        issues.push(typeIssue(`${path}.query`, "a query object", value.query));
    }

    if (value.dataMode !== "live" && value.dataMode !== "frozen")
    {
        issues.push(enumIssue(`${path}.dataMode`, value.dataMode, ["live", "frozen"]));
    }

    if (value.dataMode === "frozen" && !("snapshot" in value))
    {
        issues.push(issue(
            `${path}.snapshot`,
            "A frozen source carries no snapshot, so it cannot be restored.",
            "Capture a snapshot when freezing, or set dataMode to \"live\"."));
    }
}

// ============================================================================
// VALIDATION — BINDINGS
// ============================================================================

/**
 * Validates every binding, resolving both endpoints against the node set.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function validateBindings(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const bindings = doc.bindings;

    if (!Array.isArray(bindings))
    {
        issues.push(typeIssue("bindings", "an array of bindings", bindings));
        return;
    }

    const ids = isObject(doc.nodes) ? new Set(Object.keys(doc.nodes)) : new Set<string>();
    const seen = new Set<string>();

    for (let i = 0; i < bindings.length; i++)
    {
        validateBinding(bindings[i], i, ids, seen, issues);
    }
}

/**
 * Validates one binding.
 *
 * @param value  - The candidate binding.
 * @param index  - Array index, used when the binding has no usable id.
 * @param ids    - Every node id in the document.
 * @param seen   - Binding ids already encountered, for duplicate detection.
 * @param issues - Accumulator appended to in place.
 */
function validateBinding(
    value: unknown,
    index: number,
    ids: ReadonlySet<string>,
    seen: Set<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(`bindings.${index}`, "a binding object", value));
        return;
    }

    const id = isIdentifier(value.id) ? value.id : String(index);
    const path = `bindings.${id}`;

    if (!isIdentifier(value.id))
    {
        issues.push(typeIssue(`${path}.id`, "a non-empty string", value.id));
    }
    else if (seen.has(value.id))
    {
        issues.push(issue(
            `${path}.id`,
            `Binding id "${value.id}" appears more than once.`,
            "Give every binding a unique id."));
    }

    seen.add(id);

    validateEndpoint(value.from, `${path}.from`, "channel", ids, issues);
    validateEndpoint(value.to, `${path}.to`, "slot", ids, issues);
    validateEnum(value.cardinality, `${path}.cardinality`, CARDINALITY_POLICIES, issues);
    validateFanout(value.maxFanout, `${path}.maxFanout`, issues);
}

/**
 * Validates one end of a binding.
 *
 * @param value   - The candidate endpoint.
 * @param path    - JSON path for error reporting.
 * @param portKey - "channel" for a source, "slot" for a target.
 * @param ids     - Every node id in the document.
 * @param issues  - Accumulator appended to in place.
 */
function validateEndpoint(
    value: unknown,
    path: string,
    portKey: "channel" | "slot",
    ids: ReadonlySet<string>,
    issues: ValidationIssue[]): void
{
    if (!isObject(value))
    {
        issues.push(typeIssue(path, "an endpoint object", value));
        return;
    }

    if (!ids.has(String(value.node)))
    {
        issues.push(issue(
            `${path}.node`,
            `References node "${String(value.node)}", which is not in this document.`,
            "Bind to a node that exists, or add the node in the same patch."));
    }

    if (!isIdentifier(value[portKey]))
    {
        issues.push(typeIssue(`${path}.${portKey}`, `a ${portKey} name`, value[portKey]));
    }
}

/**
 * Validates a fanout cap against the hard ceiling.
 *
 * @param value  - The candidate cap, or undefined.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateFanout(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (value === undefined)
    {
        return;
    }

    if (!isFiniteNumber(value) || value < 1)
    {
        issues.push(typeIssue(path, "a positive number", value));
        return;
    }

    if (value > FANOUT_CEILING)
    {
        issues.push(issue(
            path,
            `A cap of ${value} exceeds the ceiling of ${FANOUT_CEILING}.`,
            `Lower maxFanout to ${FANOUT_CEILING} or less — an unbounded fanout `
            + "can mount arbitrarily many components."));
    }
}

/**
 * Validates a value against a closed vocabulary.
 *
 * @param value   - The candidate value.
 * @param path    - JSON path for error reporting.
 * @param allowed - Every legal value.
 * @param issues  - Accumulator appended to in place.
 */
function validateEnum(
    value: unknown,
    path: string,
    allowed: readonly string[],
    issues: ValidationIssue[]): void
{
    if (typeof value !== "string" || !allowed.includes(value))
    {
        issues.push(enumIssue(path, value, allowed));
    }
}

// ============================================================================
// VALIDATION — CYCLES
// ============================================================================

/**
 * Detects propagation cycles in the binding graph.
 *
 * A cycle is authored easily — `a.selection -> b.subject` alongside
 * `b.selection -> a.subject` — and must fail loudly at validation rather than
 * silently at runtime.
 *
 * @param doc    - The candidate document.
 * @param issues - Accumulator appended to in place.
 */
function detectCycles(
    doc: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const bindings = Array.isArray(doc.bindings) ? doc.bindings : [];
    const edges = buildAdjacency(bindings as readonly Binding[]);
    const state = new Map<string, "open" | "done">();

    for (const from of edges.keys())
    {
        const cycle = walk(from, edges, state, []);

        if (cycle.length > 0)
        {
            issues.push(issue(
                "bindings",
                `Bindings form a propagation cycle: ${cycle.join(" -> ")}.`,
                "Remove one binding in the loop, or introduce a transform that "
                + "terminates the chain."));
            return;
        }
    }
}

/**
 * Builds a node-to-node adjacency map from the binding list.
 *
 * @param bindings - Every binding in the document.
 * @returns Adjacency keyed by source node id.
 */
function buildAdjacency(
    bindings: readonly Binding[]): Map<string, Set<string>>
{
    const edges = new Map<string, Set<string>>();

    for (const b of bindings)
    {
        if (!isObject(b) || !isObject(b.from) || !isObject(b.to))
        {
            continue;
        }

        const from = String(b.from.node);
        const to = String(b.to.node);

        if (!edges.has(from))
        {
            edges.set(from, new Set());
        }

        edges.get(from)!.add(to);
    }

    return edges;
}

/**
 * Depth-first walk marking nodes open on the way down, returning the cycle
 * path when it re-enters an open node.
 *
 * @param at    - Node currently being visited.
 * @param edges - Adjacency map.
 * @param state - Visit state shared across walks.
 * @param path  - Nodes on the current descent.
 * @returns The cycle path, or an empty array when none was found.
 */
function walk(
    at: string,
    edges: ReadonlyMap<string, Set<string>>,
    state: Map<string, "open" | "done">,
    path: readonly string[]): readonly string[]
{
    const seen = state.get(at);

    if (seen === "done")
    {
        return [];
    }

    if (seen === "open")
    {
        const start = path.indexOf(at);

        return [...path.slice(start === -1 ? 0 : start), at];
    }

    state.set(at, "open");

    for (const next of edges.get(at) ?? [])
    {
        const cycle = walk(next, edges, state, [...path, at]);

        if (cycle.length > 0)
        {
            return cycle;
        }
    }

    state.set(at, "done");
    return [];
}

// ============================================================================
// PUBLIC — VALIDATION
// ============================================================================

/**
 * Validates a candidate canvas document in full.
 *
 * Runs every stage and collects all issues rather than stopping at the first,
 * so an author sees the complete picture in one pass.
 *
 * @param doc - The candidate document, from any source.
 * @returns The validation result.
 */
function validateDocument(doc: unknown): ValidationResult
{
    if (!isObject(doc))
    {
        return result([typeIssue("$", "a canvas document object", doc)]);
    }

    const issues: ValidationIssue[] = [];

    validateHeader(doc, issues);
    validateNodes(doc, issues);
    validateBindings(doc, issues);

    if (issues.length === 0)
    {
        detectCycles(doc, issues);
    }

    return result(issues);
}

/**
 * Validates a patch against the document it will be applied to.
 *
 * Checks revision continuity and op shape first; only when those pass does it
 * dry-run the fold and validate the resulting document.
 *
 * @param patch - The candidate patch.
 * @param doc   - The document the patch applies to.
 * @returns The validation result.
 */
function validatePatch(
    patch: unknown,
    doc: CanvasDocument): ValidationResult
{
    if (!isObject(patch))
    {
        return result([typeIssue("$", "a patch object", patch)]);
    }

    const issues = validatePatchShape(patch, doc);

    if (issues.length > 0)
    {
        return result(issues);
    }

    const next = reduceOps(doc, patch as unknown as CanvasPatch);

    return validateDocument(next);
}

/**
 * Validates a patch's own fields without applying it.
 *
 * @param patch - The candidate patch.
 * @param doc   - The document the patch applies to.
 * @returns Every issue found in the patch's shape.
 */
function validatePatchShape(
    patch: Record<string, unknown>,
    doc: CanvasDocument): ValidationIssue[]
{
    const issues: ValidationIssue[] = [];

    if (!isIdentifier(patch.turnId))
    {
        issues.push(typeIssue("turnId", "a non-empty string", patch.turnId));
    }

    if (patch.revision !== doc.revision + 1)
    {
        issues.push(issue(
            "revision",
            `Patch revision ${String(patch.revision)} does not follow document `
            + `revision ${doc.revision}.`,
            `Set revision to ${doc.revision + 1}, or reload the canvas — another `
            + "writer may have advanced it."));
    }

    if (!Array.isArray(patch.ops))
    {
        issues.push(typeIssue("ops", "an array of operations", patch.ops));
        return issues;
    }

    patch.ops.forEach((op: unknown, i: number) =>
    {
        if (!isObject(op) || typeof op.op !== "string" || !PATCH_OPS.includes(op.op))
        {
            issues.push(enumIssue(
                `ops.${i}.op`,
                isObject(op) ? op.op : op,
                PATCH_OPS));
        }
    });

    return issues;
}

// ============================================================================
// PUBLIC — FOLD
// ============================================================================

/** Options for applyPatch. */
interface ApplyOptions
{
    /** Validate before applying, and throw when the patch is rejected. */
    readonly validate?: boolean;
}

/**
 * Applies a patch, returning a new document. Pure — the input is never
 * mutated, and a rejected patch never partially applies.
 *
 * @param doc   - The document to apply onto.
 * @param patch - The patch to apply.
 * @param opts  - Set validate to reject invalid patches with a thrown error.
 * @returns The resulting document.
 * @throws Error when validate is set and the patch is invalid.
 */
function applyPatch(
    doc: CanvasDocument,
    patch: CanvasPatch,
    opts: ApplyOptions = {}): CanvasDocument
{
    if (opts.validate)
    {
        const res = validatePatch(patch, doc);

        if (!res.ok)
        {
            throw new Error(formatIssues(res, "canvas patch"));
        }
    }

    return reduceOps(doc, patch);
}

/**
 * Folds a patch's operations onto a document.
 *
 * @param doc   - The document to apply onto.
 * @param patch - The patch to apply.
 * @returns The resulting document.
 */
function reduceOps(
    doc: CanvasDocument,
    patch: CanvasPatch): CanvasDocument
{
    let nodes: Record<string, CanvasNode> = { ...doc.nodes };
    let bindings: Binding[] = [...doc.bindings];
    let viewport: Viewport = doc.viewport;
    let title = doc.title;
    let workspaceId = doc.workspaceId;

    for (const op of patch.ops ?? [])
    {
        switch (op.op)
        {
            case "setMeta":
                title = op.title ?? title;
                workspaceId = op.workspaceId ?? workspaceId;
                break;

            case "addNode":
                nodes[op.node.id] = op.node;
                break;

            case "removeNode":
                ({ nodes, bindings } = removeNode(nodes, bindings, op.id));
                break;

            case "updateNode":
                nodes = updateNode(nodes, op.id, op.changes);
                break;

            case "addBinding":
                bindings = upsertBinding(bindings, op.binding);
                break;

            case "removeBinding":
                bindings = bindings.filter((b) => b.id !== op.id);
                break;

            case "setViewport":
                viewport = op.viewport;
                break;
        }
    }

    return {
        ...doc,
        title,
        workspaceId,
        nodes,
        bindings,
        viewport,
        turnId: patch.turnId,
        revision: patch.revision,
    };
}

/**
 * Removes a node, dropping bindings that reference it and re-anchoring any
 * node anchored to it. This keeps the document valid by construction rather
 * than requiring the author to clean up after a removal.
 *
 * @param nodes    - Current node map.
 * @param bindings - Current binding list.
 * @param id       - Node to remove.
 * @returns The cleaned node map and binding list.
 */
function removeNode(
    nodes: Record<string, CanvasNode>,
    bindings: readonly Binding[],
    id: string): { nodes: Record<string, CanvasNode>; bindings: Binding[] }
{
    const next: Record<string, CanvasNode> = {};

    for (const [key, n] of Object.entries(nodes))
    {
        if (key === id)
        {
            continue;
        }

        next[key] = n.anchor.kind === "node" && n.anchor.nodeId === id
            ? { ...n, anchor: { kind: "canvas" } }
            : n;
    }

    return {
        nodes: next,
        bindings: bindings.filter(
            (b) => b.from.node !== id && b.to.node !== id),
    };
}

/**
 * Merges changes into an existing node. An update naming a node that is not
 * present is ignored rather than creating a partial node.
 *
 * @param nodes   - Current node map.
 * @param id      - Node to update.
 * @param changes - Fields to merge.
 * @returns The updated node map.
 */
function updateNode(
    nodes: Record<string, CanvasNode>,
    id: string,
    changes: Partial<CanvasNode>): Record<string, CanvasNode>
{
    const existing = nodes[id];

    if (!existing)
    {
        return nodes;
    }

    return { ...nodes, [id]: { ...existing, ...changes, id } };
}

/**
 * Adds a binding, replacing any existing binding with the same id so that
 * re-authoring a wire is idempotent.
 *
 * @param bindings - Current binding list.
 * @param binding  - The binding to add or replace.
 * @returns The updated binding list.
 */
function upsertBinding(
    bindings: readonly Binding[],
    binding: Binding): Binding[]
{
    const without = bindings.filter((b) => b.id !== binding.id);

    return [...without, binding];
}

// ============================================================================
// PUBLIC — HISTORY
// ============================================================================

/**
 * Materialises a document by folding a patch log.
 *
 * @param patches - The append-only log, in revision order.
 * @param base    - Optional starting document. Defaults to empty.
 * @returns The folded document.
 */
function fold(
    patches: readonly CanvasPatch[],
    base?: CanvasDocument): CanvasDocument
{
    const start = base ?? createEmptyDocument("canvas", "workspace");

    return patches.reduce<CanvasDocument>(
        (doc, patch) => reduceOps(doc, patch),
        start);
}

/**
 * Folds the log up to and including a revision. This is history scrubbing —
 * restoring turn N is folding to revision N.
 *
 * @param patches  - The append-only log.
 * @param revision - Revision to stop at. Zero yields an empty document.
 * @param base     - Optional starting document.
 * @returns The document as of that revision.
 */
function foldTo(
    patches: readonly CanvasPatch[],
    revision: number,
    base?: CanvasDocument): CanvasDocument
{
    return fold(patches.filter((p) => p.revision <= revision), base);
}

/**
 * Returns the log prefix up to a revision, ready to seed a new canvas. This
 * is branching — forking at turn N is copying the prefix.
 *
 * @param patches  - The append-only log.
 * @param revision - Revision to branch at.
 * @returns A new array containing the prefix. The source is not mutated.
 */
function branch(
    patches: readonly CanvasPatch[],
    revision: number): CanvasPatch[]
{
    return patches.filter((p) => p.revision <= revision);
}

// ========================================================================
// SOURCE: registry.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: ee4b5a87-5bd6-4593-8f62-727cf28e7710
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Registry
 * 📜 PURPOSE: The allowlist of components a canvas may mount, plus manifest
 *    validation. Factory resolution is allowlist-only: a component name that
 *    was never registered is never looked up, however plausible it looks.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Resolver]], [[Lifecycle]]
 * ⚡ FLOW: [manifest] -> [registerComponent()] -> [resolveFactory()] -> [mount]
 * 🔒 SECURITY: (CRITICAL) Scene documents are model-authored and untrusted.
 *    lookupFactory() reads exactly one property — the factory named by a
 *    REGISTERED manifest — and never scans the global scope for a matching
 *    name. Scanning would turn an untrusted string into arbitrary global
 *    invocation. See ADR-143.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-registry
// @entrypoint





// ============================================================================
// STATE
// ============================================================================

/** The allowlist. Nothing outside this map can be mounted. */
const registry = new Map<string, CapabilityManifest>();

/** Legal conformance levels. */
const CONFORMANCE_LEVELS: readonly string[] = ["display", "field", "surface"];

/** Legal factory argument orders. */
const FACTORY_STYLES: readonly string[] =
    ["container-first", "options-first", "options-only"];

/** Legal attachment methods. */
const MOUNT_METHODS: readonly string[] = ["auto", "show", "getElement"];

/** Legal mount cost classes. */
const MOUNT_COSTS: readonly string[] = ["trivial", "light", "moderate", "heavy"];

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates a capability manifest in full, collecting every issue.
 *
 * @param m - The candidate manifest.
 * @returns The validation result.
 */
function validateManifest(m: unknown): ValidationResult
{
    if (!isObject(m))
    {
        return result([typeIssue("$", "a capability manifest object", m)]);
    }

    const issues: ValidationIssue[] = [];

    validateIdentity(m, issues);
    validateAffordances(m, issues);
    validatePorts(m, issues);
    validateWeightAndSize(m, issues);
    validateConformance(m, issues);

    return result(issues);
}

/**
 * Validates the identity and presentation fields.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateIdentity(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    for (const key of ["name", "factory", "label", "icon", "category"])
    {
        if (!isNonEmptyString(m[key]))
        {
            issues.push(typeIssue(key, "a non-empty string", m[key]));
        }
    }

    if (!isFiniteNumber(m.priority))
    {
        issues.push(typeIssue("priority", "a number", m.priority));
    }

    if (m.factoryStyle !== undefined
        && !FACTORY_STYLES.includes(m.factoryStyle as string))
    {
        issues.push(enumIssue("factoryStyle", m.factoryStyle, FACTORY_STYLES));
    }

    if (m.containerAs !== undefined
        && m.containerAs !== "element" && m.containerAs !== "id")
    {
        issues.push(enumIssue("containerAs", m.containerAs, ["element", "id"]));
    }

    if (m.presentation !== undefined
        && m.presentation !== "framed" && m.presentation !== "overlay")
    {
        issues.push(enumIssue("presentation", m.presentation,
            ["framed", "overlay"]));
    }

    if (m.mountMethod !== undefined
        && !MOUNT_METHODS.includes(m.mountMethod as string))
    {
        issues.push(enumIssue("mountMethod", m.mountMethod, MOUNT_METHODS));
    }
}

/**
 * Validates every affordance, including shape and intent vocabularies.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateAffordances(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(m.affords))
    {
        issues.push(typeIssue("affords", "an array of affordances", m.affords));
        return;
    }

    m.affords.forEach((a: unknown, i: number) =>
    {
        validateAffordance(a, `affords.${i}`, issues);
    });
}

/**
 * Validates one affordance.
 *
 * @param a      - The candidate affordance.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateAffordance(
    a: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(a))
    {
        issues.push(typeIssue(path, "an affordance object", a));
        return;
    }

    if (typeof a.shape !== "string" || !DATA_SHAPES.includes(a.shape as never))
    {
        issues.push(enumIssue(`${path}.shape`, a.shape, DATA_SHAPES));
    }

    validateIntents(a.intents, `${path}.intents`, issues);
    validateRange(a.cardinality, `${path}.cardinality`, issues, true);
    validateRange(a.density, `${path}.density`, issues, false);
    validateExtent(a.minViewport, `${path}.minViewport`, issues);
}

/**
 * Validates an intent verb list.
 *
 * @param value  - The candidate list.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateIntents(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(value))
    {
        issues.push(typeIssue(path, "an array of intent verbs", value));
        return;
    }

    value.forEach((verb: unknown, i: number) =>
    {
        if (typeof verb !== "string" || !INTENT_VERBS.includes(verb as never))
        {
            issues.push(enumIssue(`${path}.${i}`, verb, INTENT_VERBS));
        }
    });
}

/**
 * Validates a min/max range, rejecting inverted bounds.
 *
 * @param value    - The candidate range, possibly undefined.
 * @param path     - JSON path for error reporting.
 * @param issues   - Accumulator appended to in place.
 * @param required - Whether the range must be present.
 */
function validateRange(
    value: unknown,
    path: string,
    issues: ValidationIssue[],
    required: boolean): void
{
    if (value === undefined)
    {
        if (required)
        {
            issues.push(typeIssue(path, "a { min, max } range", value));
        }
        return;
    }

    if (!isObject(value) || !isFiniteNumber(value.min) || !isFiniteNumber(value.max))
    {
        issues.push(typeIssue(path, "a { min, max } range of numbers", value));
        return;
    }

    if (value.min > value.max)
    {
        issues.push(issue(
            path,
            `Range minimum ${value.min} is greater than maximum ${value.max}.`,
            "Swap the bounds so that min is less than or equal to max."));
    }
}

/**
 * Validates a width/height extent.
 *
 * @param value  - The candidate extent.
 * @param path   - JSON path for error reporting.
 * @param issues - Accumulator appended to in place.
 */
function validateExtent(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!isObject(value) || !isFiniteNumber(value.w) || !isFiniteNumber(value.h))
    {
        issues.push(typeIssue(path, "a { w, h } extent of numbers", value));
    }
}

/**
 * Validates emitted channels and accepted slots, including uniqueness.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validatePorts(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    validatePortList(m.emits, "emits", issues);
    validatePortList(m.accepts, "accepts", issues);
}

/**
 * Validates one port list — either channels or slots.
 *
 * @param value  - The candidate list.
 * @param path   - "emits" or "accepts".
 * @param issues - Accumulator appended to in place.
 */
function validatePortList(
    value: unknown,
    path: string,
    issues: ValidationIssue[]): void
{
    if (!Array.isArray(value))
    {
        issues.push(typeIssue(path, "an array", value));
        return;
    }

    const seen = new Set<string>();

    value.forEach((port: unknown, i: number) =>
    {
        if (!isObject(port) || !isNonEmptyString(port.name))
        {
            issues.push(typeIssue(`${path}.${i}.name`, "a port name", port));
            return;
        }

        if (seen.has(port.name))
        {
            issues.push(issue(
                `${path}.${i}.name`,
                `Port name "${port.name}" is declared more than once.`,
                `Give every entry in ${path} a unique name.`));
        }

        seen.add(port.name);

        if (typeof port.payload !== "string"
            || !DATA_SHAPES.includes(port.payload as never))
        {
            issues.push(enumIssue(`${path}.${i}.payload`, port.payload, DATA_SHAPES));
        }
    });
}

/**
 * Validates the weight model and default size.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateWeightAndSize(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    const w = m.weight;

    if (!isObject(w))
    {
        issues.push(typeIssue("weight", "a weight object", w));
    }
    else
    {
        if (!isFiniteNumber(w.js) || w.js < 0)
        {
            issues.push(typeIssue("weight.js", "a byte count of zero or more", w.js));
        }

        if (typeof w.mountCost !== "string" || !MOUNT_COSTS.includes(w.mountCost))
        {
            issues.push(enumIssue("weight.mountCost", w.mountCost, MOUNT_COSTS));
        }

        if (typeof w.holdsResources !== "boolean")
        {
            issues.push(typeIssue("weight.holdsResources", "a boolean", w.holdsResources));
        }
    }

    validateExtent(m.defaultSize, "defaultSize", issues);
}

/**
 * Validates the conformance level and the obligations it implies.
 *
 * A manifest claiming `surface` must declare the state it can restore;
 * otherwise the canvas cannot virtualize it without losing the user's place.
 *
 * @param m      - The candidate manifest.
 * @param issues - Accumulator appended to in place.
 */
function validateConformance(
    m: Record<string, unknown>,
    issues: ValidationIssue[]): void
{
    if (typeof m.conformance !== "string"
        || !CONFORMANCE_LEVELS.includes(m.conformance))
    {
        issues.push(enumIssue("conformance", m.conformance, CONFORMANCE_LEVELS));
        return;
    }

    if (!Array.isArray(m.stateKeys))
    {
        issues.push(typeIssue("stateKeys", "an array of state key names", m.stateKeys));
        return;
    }

    if (m.conformance === "surface" && m.stateKeys.length === 0)
    {
        issues.push(issue(
            "stateKeys",
            "A surface-conformant component declares no state keys, so the "
            + "canvas cannot restore it after virtualizing it.",
            "Declare the keys getState() returns, or lower conformance to "
            + "\"display\"."));
    }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/**
 * Registers a component, adding it to the mount allowlist.
 *
 * @param m - The manifest to register. Replaces any manifest of the same name.
 * @throws Error when the manifest fails validation.
 */
function registerComponent(m: CapabilityManifest): void
{
    const res = validateManifest(m);

    if (!res.ok)
    {
        throw new Error(formatIssues(res, `capability manifest "${m?.name}"`));
    }

    registry.set(m.name, m);
}

/**
 * Registers a batch of components.
 *
 * @param manifests - The manifests to register.
 * @throws Error on the first manifest that fails validation.
 */
function registerComponents(
    manifests: readonly CapabilityManifest[]): void
{
    for (const m of manifests)
    {
        registerComponent(m);
    }
}

/**
 * Looks up a registered manifest.
 *
 * @param name - Component name.
 * @returns The manifest, or null when it is not registered.
 */
function getManifest(name: string): CapabilityManifest | null
{
    return registry.get(name) ?? null;
}

/**
 * Returns every registered manifest, sorted by name so that any consumer
 * iterating the registry behaves deterministically.
 *
 * @returns The manifests, ascending by name.
 */
function getAllManifests(): readonly CapabilityManifest[]
{
    return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reports whether a component is on the allowlist.
 *
 * @param name - Component name.
 * @returns True when registered.
 */
function isRegistered(name: string): boolean
{
    return registry.has(name);
}

/** Empties the registry. Intended for tests and host re-initialisation. */
function clearRegistry(): void
{
    registry.clear();
}

// ============================================================================
// ALLOWLIST RESOLUTION (SECURITY BOUNDARY)
// ============================================================================

/**
 * Resolves a component name to its factory name, allowlist-only.
 *
 * @param component - Component name from a scene document.
 * @returns The registered factory name.
 * @throws Error naming the component and how to register it.
 */
function resolveFactory(component: string): string
{
    const manifest = registry.get(component);

    if (!manifest)
    {
        throw new Error(
            `${LOG_PREFIX} Component "${component}" is not registered, so it `
            + "cannot be mounted. Register it with registerComponent(manifest) "
            + "before loading a document that references it. Components are "
            + "resolved against the registry only — a matching global is never "
            + "searched for.");
    }

    return manifest.factory;
}

/**
 * Resolves a component to its callable factory.
 *
 * (CRITICAL) Reads exactly one property from the supplied scope — the factory
 * named by a registered manifest. The scope is never enumerated or searched,
 * so an unregistered component name cannot reach any global, however closely
 * it resembles one that exists.
 *
 * @param component - Component name from a scene document.
 * @param scope     - Global scope to read from, typically `window`.
 * @returns The factory function.
 * @throws Error when the component is unregistered or the factory is missing.
 */
function lookupFactory(
    component: string,
    scope: Record<string, unknown>): (...args: unknown[]) => unknown
{
    const factoryName = resolveFactory(component);
    const candidate = scope[factoryName];

    if (typeof candidate !== "function")
    {
        throw new Error(
            `${LOG_PREFIX} Component "${component}" is registered against `
            + `factory "${factoryName}", but no such function is loaded. Add `
            + `the component's script tag, or correct the factory name in its `
            + "manifest.");
    }

    return candidate as (...args: unknown[]) => unknown;
}

// ========================================================================
// SOURCE: resolver.ts
// ========================================================================

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
const RESOLVER_WEIGHTS =
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
interface PreferenceKey
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
function registerPresentationPreference(
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
function recordUserChoice(
    key: PreferenceKey,
    component: string): void
{
    const k = prefKey(key, component);

    userChoices.set(k, (userChoices.get(k) ?? 0) + 1);
}

/** Clears host preferences and observed user choices. */
function clearPresentationPreferences(): void
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
function resolve(req: ResolveRequest): ResolveResult
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

// ========================================================================
// SOURCE: wiring.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 6b933fe2-2558-4ad4-96ae-70c6ba53f0c6
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Wiring
 * 📜 PURPOSE: The declarative wiring engine. Subscribes a document's bindings
 *    to mounted surfaces, propagates emissions in topological order, applies
 *    cardinality policies, and requests the structural changes that fanout
 *    implies. Bindings, not broadcast — every wire is explicit and typed.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Document]], [[DynamicCanvas]]
 * ⚡ FLOW: [surface emits] -> [enqueue] -> [flush in topo order] -> [setData]
 * 🔒 SECURITY: Transforms are registry-named, never expressions — a document
 *    cannot carry executable code. Fanout is capped by FANOUT_CEILING so a
 *    malicious document cannot mount unbounded components.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-wiring
// @entrypoint



// ============================================================================
// TRANSFORM REGISTRY
// ============================================================================

/** A pure, named payload transform. Never authored inline in a document. */
type Transform = (value: unknown) => unknown;

/** Transforms the runtime ships. Restored by clearTransforms(). */
const BUILT_IN_TRANSFORMS: Readonly<Record<string, Transform>> =
{
    identity: (v) => v,
    first: (v) => (Array.isArray(v) ? v[0] : v),
    last: (v) => (Array.isArray(v) ? v[v.length - 1] : v),
    count: (v) => (Array.isArray(v) ? v.length : v === undefined ? 0 : 1),
    toArray: (v) => (Array.isArray(v) ? v : [v]),
    toIds: (v) => toIds(v),
    unique: (v) => (Array.isArray(v) ? Array.from(new Set(v)) : v),
};

/** Live registry, seeded with the built-ins. */
const transforms = new Map<string, Transform>(Object.entries(BUILT_IN_TRANSFORMS));

/**
 * Extracts an id from each element of a collection.
 *
 * @param value - The candidate collection.
 * @returns The ids, or the input unchanged when it is not a collection.
 */
function toIds(value: unknown): unknown
{
    if (!Array.isArray(value))
    {
        return value;
    }

    return value.map((item) =>
        (item && typeof item === "object" && "id" in item)
            ? (item as { id: unknown }).id
            : item);
}

/**
 * Registers a named transform available to bindings.
 *
 * @param name - Name referenced by Binding.transform.
 * @param fn   - Pure transform function.
 */
function registerTransform(name: string, fn: Transform): void
{
    transforms.set(name, fn);
}

/**
 * Looks up a registered transform.
 *
 * @param name - The transform name.
 * @returns The transform, or null when it is not registered.
 */
function getTransform(name: string): Transform | null
{
    return transforms.get(name) ?? null;
}

/** Removes every host-registered transform, restoring the built-ins. */
function clearTransforms(): void
{
    transforms.clear();

    for (const [name, fn] of Object.entries(BUILT_IN_TRANSFORMS))
    {
        transforms.set(name, fn);
    }
}

// ============================================================================
// TYPES
// ============================================================================

/** Everything the wiring engine needs from its host. */
interface WiringDeps
{
    /** Resolve a mounted surface. Null when the node is not mounted. */
    getSurface(nodeId: string): Surface | null;

    /** Receive structural changes implied by a fanout policy. */
    requestOps?(ops: readonly PatchOp[]): void;

    /** Resolve a manifest, used to find a slot's custom setter. */
    getManifest?(component: string): CapabilityManifest | null;
}

/** The attached wiring engine. */
interface WiringEngine
{
    /** Subscribe every binding in the document. Detaches any prior document. */
    attach(doc: CanvasDocument): void;

    /** Unsubscribe everything and drop pending work. */
    detach(): void;

    /** Push a value as if the node had emitted it. */
    emit(nodeId: string, channel: string, value: unknown): void;

    /** Deliver all pending emissions synchronously. */
    flush(): void;

    /** Re-deliver the last value bound into each of a node's slots. */
    replay(nodeId: string): void;

    /** Drop cached deliveries for a node that has left the document. */
    forget(nodeId: string): void;
}

/** One queued emission, keyed by source node and channel. */
interface Emission
{
    readonly node: string;
    readonly channel: string;
    readonly value: unknown;
}

/**
 * Composite-key separator for the source lookup map.
 *
 * NUL is used because the document validator rejects control characters in
 * node ids and channel names, so two distinct pairs can never collide on one
 * key. Written as an escape rather than a literal so the source stays plain
 * ASCII -- an embedded NUL byte makes the file opaque to grep and diff tools.
 */
const KEY_SEP = "\u0000";

/** A source endpoint. Carried explicitly so composite keys are never parsed. */
interface SourcePort
{
    readonly node: string;
    readonly channel: string;
}

/**
 * Builds the queue and subscription key for a node/channel pair.
 *
 * @param node    - Source node id.
 * @param channel - Channel name.
 * @returns The composite key.
 */
function keyOf(node: string, channel: string): string
{
    return `${node}${KEY_SEP}${channel}`;
}

/**
 * Lists each distinct source endpoint in a binding set, so a node emitting one
 * channel into several targets is subscribed exactly once.
 *
 * @param bindings - Every binding in the document.
 * @returns The distinct endpoints, in first-seen order.
 */
function distinctSources(bindings: readonly Binding[]): SourcePort[]
{
    const seen = new Set<string>();
    const ports: SourcePort[] = [];

    for (const b of bindings)
    {
        const key = keyOf(b.from.node, b.from.channel);

        if (!seen.has(key))
        {
            seen.add(key);
            ports.push({ node: b.from.node, channel: b.from.channel });
        }
    }

    return ports;
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Creates a wiring engine bound to a host.
 *
 * @param deps - Surface resolution and structural-change callbacks.
 * @returns The engine. Call attach() with a document to start.
 */
function createWiringEngine(deps: WiringDeps): WiringEngine
{
    let doc: CanvasDocument | null = null;
    let unsubs: Unsubscribe[] = [];
    let bindingsBySource = new Map<string, Binding[]>();
    let rank = new Map<string, number>();
    let derived = new Map<string, string[]>();

    const pending = new Map<string, Emission>();
    const visited = new Set<string>();

    /**
     * Last value written into each (node, slot), whether or not the target
     * was mounted at the time. Replayed when a demoted node is promoted back.
     */
    const lastDelivered = new Map<string, unknown>();

    let scheduled = false;
    let flushing = false;

    /**
     * Queues an emission, coalescing repeats from the same node and channel
     * so a component emitting per-row does not deliver n times.
     */
    function emit(node: string, channel: string, value: unknown): void
    {
        pending.set(keyOf(node, channel), { node, channel, value });
        schedule();
    }

    /** Schedules a microtask flush unless one is already pending. */
    function schedule(): void
    {
        if (scheduled || flushing)
        {
            return;
        }

        scheduled = true;
        void Promise.resolve().then(() =>
        {
            scheduled = false;
            flush();
        });
    }

    /**
     * Delivers every pending emission in topological order. Re-entrant
     * emissions produced during delivery join the same pass; a per-pass
     * visited set guarantees termination even on a runtime cycle.
     */
    function flush(): void
    {
        if (flushing)
        {
            return;
        }

        flushing = true;
        visited.clear();

        try
        {
            while (pending.size > 0)
            {
                const next = takeLowestRank();

                if (next === null)
                {
                    break;
                }

                deliver(next);
            }
        }
        finally
        {
            flushing = false;
            visited.clear();
        }
    }

    /**
     * Removes and returns the pending emission whose source node sorts
     * earliest topologically, skipping any already delivered this pass.
     */
    function takeLowestRank(): Emission | null
    {
        let bestKey: string | null = null;
        let bestRank = Number.POSITIVE_INFINITY;

        for (const [key, emission] of pending)
        {
            const r = rank.get(emission.node) ?? 0;

            if (r < bestRank)
            {
                bestRank = r;
                bestKey = key;
            }
        }

        if (bestKey === null)
        {
            return null;
        }

        const chosen = pending.get(bestKey)!;
        pending.delete(bestKey);

        if (visited.has(bestKey))
        {
            return takeLowestRank();
        }

        visited.add(bestKey);
        return chosen;
    }

    /** Applies every binding attached to an emission's source channel. */
    function deliver(emission: Emission): void
    {
        const list = bindingsBySource.get(keyOf(emission.node, emission.channel));

        for (const binding of list ?? [])
        {
            applyBinding(binding, transformValue(binding, emission.value));
        }
    }

    /** Runs a binding's named transform, when it declares one. */
    function transformValue(binding: Binding, value: unknown): unknown
    {
        if (!binding.transform)
        {
            return value;
        }

        const fn = getTransform(binding.transform);

        return fn ? fn(value) : value;
    }

    /** Dispatches to the binding's cardinality policy. */
    function applyBinding(binding: Binding, value: unknown): void
    {
        if (binding.cardinality === "fanout")
        {
            applyFanout(binding, value);
            return;
        }

        setSlot(binding.to.node, binding.to.slot, value);
    }

    /**
     * Spreads a multi-item payload across one node per item, requesting the
     * structural changes needed to add or remove derived nodes.
     */
    function applyFanout(binding: Binding, value: unknown): void
    {
        const items = Array.isArray(value) ? value : [value];
        const cap = Math.min(binding.maxFanout ?? DEFAULT_MAX_FANOUT, FANOUT_CEILING);
        const used = items.slice(0, cap);

        reconcileDerived(binding, used.length);

        const targets = [binding.to.node, ...(derived.get(binding.id) ?? [])];

        used.forEach((item, i) =>
        {
            if (targets[i])
            {
                setSlot(targets[i], binding.to.slot, item);
            }
        });
    }

    /**
     * Brings the derived-node set for a binding to the required size,
     * emitting addNode and removeNode ops through the host.
     */
    function reconcileDerived(binding: Binding, count: number): void
    {
        const current = derived.get(binding.id) ?? [];
        const need = Math.max(0, count - 1);
        const ops: PatchOp[] = [];

        for (let i = current.length; i < need; i++)
        {
            const clone = cloneTarget(binding, i);

            if (clone)
            {
                current.push(clone.id);
                ops.push({ op: "addNode", node: clone });
            }
        }

        for (const id of current.splice(need))
        {
            ops.push({ op: "removeNode", id });
        }

        derived.set(binding.id, current);

        if (ops.length > 0)
        {
            deps.requestOps?.(ops);
        }
    }

    /**
     * Builds a derived node cloned from a binding's target, so a fanout
     * inspector matches the component the author chose.
     */
    function cloneTarget(binding: Binding, index: number): CanvasNode | null
    {
        const target = doc?.nodes[binding.to.node];

        if (!target)
        {
            return null;
        }

        return {
            ...target,
            id: `${binding.to.node}~${binding.id}~${index}`,
            anchor: { kind: "canvas" },
            pinned: false,
        };
    }

    /**
     * Writes a value into a target slot, honouring a manifest-declared custom
     * setter.
     *
     * The value is cached before delivery is attempted. A target that is not
     * mounted is expected rather than exceptional — the canvas virtualizes —
     * but simply dropping the write would leave the node showing stale data
     * when it is re-mounted, because setState() restores view state, not
     * bound data. The cache lets lifecycle replay() on promotion.
     */
    function setSlot(nodeId: string, slot: string, value: unknown): void
    {
        lastDelivered.set(keyOf(nodeId, slot), value);

        const surface = deps.getSurface(nodeId);

        if (!surface)
        {
            return;
        }

        deliverToSlot(nodeId, slot, value);
    }

    /**
     * Delivers a value to a mounted target, without touching the cache.
     *
     * @param nodeId - Target node id.
     * @param slot   - Slot name.
     * @param value  - Value to write.
     */
    function deliverToSlot(nodeId: string, slot: string, value: unknown): void
    {
        const surface = deps.getSurface(nodeId);

        if (!surface)
        {
            return;
        }

        const setter = customSetter(nodeId, slot);

        if (setter && typeof (surface as unknown as Record<string, unknown>)[setter] === "function")
        {
            (surface as unknown as Record<string, (v: unknown) => void>)[setter](value);
            return;
        }

        surface.setData(slot, value);
    }

    /** Resolves a slot's custom setter name from the target's manifest. */
    function customSetter(nodeId: string, slot: string): string | null
    {
        const component = doc?.nodes[nodeId]?.component;

        if (!component || !deps.getManifest)
        {
            return null;
        }

        const spec = deps.getManifest(component)?.accepts
            .find((a) => a.name === slot);

        return spec?.setter && spec.setter !== "setData" ? spec.setter : null;
    }

    /**
     * Subscribes every binding in a document, after verifying that every
     * named transform is registered.
     */
    function attach(next: CanvasDocument): void
    {
        detach();
        assertTransforms(next.bindings);

        doc = next;
        bindingsBySource = indexBindings(next.bindings);
        rank = rankNodes(next);

        for (const port of distinctSources(next.bindings))
        {
            subscribe(port);
        }
    }

    /**
     * Attaches one channel handler for a source endpoint.
     *
     * Takes the endpoint rather than a composite key so that no key is ever
     * parsed back apart — the separator is an implementation detail of the
     * lookup map, never a data format.
     */
    function subscribe(port: SourcePort): void
    {
        const surface = deps.getSurface(port.node);

        if (!surface)
        {
            return;
        }

        unsubs.push(surface.on(
            port.channel,
            (payload) => emit(port.node, port.channel, payload)));
    }

    /** Unsubscribes everything and clears pending and derived state. */
    function detach(): void
    {
        for (const off of unsubs)
        {
            off();
        }

        unsubs = [];
        doc = null;
        bindingsBySource = new Map();
        rank = new Map();
        derived = new Map();
        pending.clear();
        lastDelivered.clear();
    }

    /**
     * Re-delivers the last value bound into each of a node's slots.
     *
     * Called by lifecycle when a demoted node is promoted back so that it
     * shows current data rather than whatever it held when it was demoted.
     */
    function replay(nodeId: string): void
    {
        const prefix = `${nodeId}${KEY_SEP}`;

        for (const [key, value] of lastDelivered)
        {
            if (key.startsWith(prefix))
            {
                deliverToSlot(nodeId, key.slice(prefix.length), value);
            }
        }
    }

    /** Drops every cached delivery for a node that has left the document. */
    function forget(nodeId: string): void
    {
        const prefix = `${nodeId}${KEY_SEP}`;

        for (const key of [...lastDelivered.keys()])
        {
            if (key.startsWith(prefix))
            {
                lastDelivered.delete(key);
            }
        }
    }

    return { attach, detach, emit, flush, replay, forget };
}

// ============================================================================
// INDEXING
// ============================================================================

/**
 * Groups bindings by their source node and channel.
 *
 * @param bindings - Every binding in the document.
 * @returns Bindings keyed by composite source key.
 */
function indexBindings(
    bindings: readonly Binding[]): Map<string, Binding[]>
{
    const index = new Map<string, Binding[]>();

    for (const b of bindings)
    {
        const key = keyOf(b.from.node, b.from.channel);
        const list = index.get(key);

        if (list)
        {
            list.push(b);
        }
        else
        {
            index.set(key, [b]);
        }
    }

    return index;
}

/**
 * Assigns each node a topological rank so that a chain delivers in order.
 * Nodes left over by a cycle keep rank zero; the per-pass visited set is what
 * guarantees termination there.
 *
 * @param doc - The document to rank.
 * @returns Rank keyed by node id.
 */
function rankNodes(doc: CanvasDocument): Map<string, number>
{
    const incoming = new Map<string, number>();
    const out = new Map<string, string[]>();

    for (const id of Object.keys(doc.nodes))
    {
        incoming.set(id, 0);
        out.set(id, []);
    }

    for (const b of doc.bindings)
    {
        out.get(b.from.node)?.push(b.to.node);
        incoming.set(b.to.node, (incoming.get(b.to.node) ?? 0) + 1);
    }

    return kahn(incoming, out);
}

/**
 * Kahn's algorithm, recording the depth at which each node is discharged.
 *
 * @param incoming - In-degree per node.
 * @param out      - Adjacency per node.
 * @returns Rank keyed by node id.
 */
function kahn(
    incoming: Map<string, number>,
    out: Map<string, string[]>): Map<string, number>
{
    const rank = new Map<string, number>();
    let frontier = [...incoming.entries()]
        .filter(([, n]) => n === 0)
        .map(([id]) => id);
    let depth = 0;

    while (frontier.length > 0)
    {
        const next: string[] = [];

        for (const id of frontier)
        {
            rank.set(id, depth);

            for (const to of out.get(id) ?? [])
            {
                const left = (incoming.get(to) ?? 0) - 1;
                incoming.set(to, left);

                if (left === 0)
                {
                    next.push(to);
                }
            }
        }

        frontier = next;
        depth++;
    }

    return rank;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Fails fast when a binding names a transform that is not registered. A
 * silently ignored transform would deliver the wrong payload shape, which is
 * far harder to diagnose than a refusal to attach.
 *
 * @param bindings - Every binding in the document.
 * @throws Error naming the missing transform and the binding that wants it.
 */
function assertTransforms(bindings: readonly Binding[]): void
{
    for (const b of bindings)
    {
        if (b.transform && !getTransform(b.transform))
        {
            throw new Error(
                `${LOG_PREFIX} Binding "${b.id}" names transform `
                + `"${b.transform}", which is not registered. Register it with `
                + "registerTransform(name, fn) before attaching the document, "
                + "or remove the transform from the binding.");
        }
    }
}

// ========================================================================
// SOURCE: packer.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 3f1c8ad6-7b40-4c19-9a5e-2d6f0b83c714
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Packer
 * 📜 PURPOSE: Resolves layout INTENT into canvas coordinates. A model authors
 *    "main, wide" and never a pixel; the packer turns that into a rectangle,
 *    deterministically, flowing around anything the user has placed by hand.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[DynamicCanvas]], [[Document]]
 * ⚡ FLOW: [CanvasDocument] -> [packDocument()] -> [Map<nodeId, PackedRect>]
 * 🔒 SECURITY: Pure geometry over validated input; no DOM, no side effects.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-packer
// @entrypoint



// ============================================================================
// TYPES
// ============================================================================

/** Tuning for one packing pass. */
interface PackOptions
{
    /**
     * Visible canvas width in canvas pixels. Region geometry follows it, so a
     * narrow canvas never strands a node in an off-screen region.
     */
    readonly width?: number;

    /**
     * Reports whether a component presents as an overlay.
     *
     * Supplied by the host because the packer holds no registry. An overlay is
     * never an obstacle and never displaces anything, regardless of what it is
     * anchored to.
     */
    readonly isOverlay?: (component: string) => boolean;
}

/** A resolved rectangle in canvas coordinates. */
interface PackedRect
{
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
    readonly z: number;
}

/** Canvas width assumed when the caller does not supply one. */
const DEFAULT_CANVAS_WIDTH = 1600;

/** Edge length of an anchored overlay marker, in canvas pixels. */
const MARKER_SIZE = 30;

/** Stacking offset that lifts an overlay above whatever it annotates. */
const OVERLAY_Z_LIFT = 10;

/** Narrowest canvas at which a side region is still worth reserving. */
const SIDE_REGION_MIN_CANVAS = 900;

/** Fraction of the canvas the main region takes when a side region exists. */
const MAIN_FRACTION = 0.68;

/** Geometry of every region for one canvas width. */
interface RegionGeometry
{
    readonly width: Readonly<Record<Region, number>>;
    readonly originX: Readonly<Record<Region, number>>;
}

/**
 * Computes region geometry for the available canvas width.
 *
 * Region origins used to be fixed constants, which put the side region at
 * x=1160 regardless of how wide the canvas actually was. On a narrower canvas
 * anything placed there mounted correctly and rendered off-screen — no error,
 * nothing visible, which is the worst kind of failure. Geometry now follows
 * the canvas, and below SIDE_REGION_MIN_CANVAS the side region collapses onto
 * main so nothing can be stranded.
 *
 * @param canvasWidth - Visible canvas width in canvas pixels.
 * @returns Width and origin for every region.
 */
function geometryFor(canvasWidth: number): RegionGeometry
{
    const usable = Math.max(320, canvasWidth - PACK_GUTTER * 2);
    const hasSide = usable >= SIDE_REGION_MIN_CANVAS;

    const mainWidth = hasSide
        ? Math.floor(usable * MAIN_FRACTION)
        : usable;
    const sideWidth = hasSide
        ? usable - mainWidth - PACK_GUTTER
        : usable;
    const sideOrigin = hasSide ? mainWidth + PACK_GUTTER : 0;

    return {
        width: {
            main: mainWidth,
            side: sideWidth,
            detail: mainWidth,
            strip: usable,
            overlay: usable,
        },
        originX: {
            main: 0,
            side: sideOrigin,
            detail: 0,
            strip: 0,
            overlay: 0,
        },
    };
}

/** Base stacking order per region. Overlay always wins. */
const REGION_Z: Readonly<Record<Region, number>> =
{
    main: 1,
    side: 1,
    detail: 1,
    strip: 2,
    overlay: 100,
};

/** Vertical origin per region, keeping regions clear of one another. */
const REGION_ORIGIN_Y: Readonly<Record<Region, number>> =
{
    main: 0,
    side: 0,
    detail: 0,
    strip: 0,
    overlay: 0,
};

// ============================================================================
// PUBLIC
// ============================================================================

/**
 * Resolves every node's placement into a rectangle.
 *
 * Nodes with `fixed` placement are honoured exactly and treated as obstacles;
 * nodes with `intent` placement are packed around them. Ordering is pinned
 * first, then by node id, so an identical document always yields an identical
 * layout — which is what makes placement testable.
 *
 * @param doc - The document to lay out.
 * @returns Rectangles keyed by node id.
 */
function packDocument(
    doc: CanvasDocument,
    options: PackOptions = {}): Map<string, PackedRect>
{
    const isOverlayComponent = options.isOverlay ?? (() => false);

    const geometry = geometryFor(options.width ?? DEFAULT_CANVAS_WIDTH);

    const out = new Map<string, PackedRect>();
    const nodes = Object.values(doc.nodes);
    const obstacles: PackedRect[] = [];

    for (const node of nodes)
    {
        if (node.placement.kind === "fixed")
        {
            const rect = fixedRect(node);
            out.set(node.id, rect);
            obstacles.push(rect);
        }
    }

    const shelves = new Map<Region, Shelf>();

    for (const node of orderForPacking(nodes))
    {
        if (node.placement.kind !== "intent")
        {
            continue;
        }

        if (isAnchoredOverlay(node, doc) || isOverlayComponent(node.component))
        {
            continue;
        }

        const rect = placeIntent(node, shelves, obstacles, geometry);
        out.set(node.id, rect);
        obstacles.push(rect);
    }

    placeOverlays(doc, out, geometry, isOverlayComponent);

    return out;
}

/**
 * True when a node is an overlay bound to another node.
 *
 * An overlay ANNOTATES its target: it sits on top of it, and it must not
 * displace anything. A sticky note is unbound and behaves like any other
 * widget; an annotation attached to a grid is not a widget at all, it is a
 * mark on that grid. Treating the two the same made twenty annotations
 * rearrange the whole canvas.
 *
 * @param node - The node to classify.
 * @param doc  - The document, used to confirm the target exists.
 * @returns Whether the node is an anchored overlay.
 */
function isAnchoredOverlay(node: CanvasNode, doc: CanvasDocument): boolean
{
    return node.anchor.kind === "node"
        && Boolean(doc.nodes[node.anchor.nodeId]);
}

/**
 * Positions every anchored overlay against its target.
 *
 * Runs last, reads the already-packed rectangles, and adds NOTHING to the
 * obstacle list — which is what guarantees an annotation never moves the thing
 * it annotates, or anything near it.
 *
 * Several overlays on one target fan along its top edge rather than stacking
 * on top of each other.
 *
 * @param doc - The document being laid out.
 * @param out - Packed rectangles, mutated in place.
 */
function placeOverlays(
    doc: CanvasDocument,
    out: Map<string, PackedRect>,
    geometry: RegionGeometry,
    isOverlayComponent: (component: string) => boolean): void
{
    const perTarget = new Map<string, number>();
    let free = 0;

    for (const node of Object.values(doc.nodes).slice()
        .sort((a, b) => a.id.localeCompare(b.id)))
    {
        const anchored = isAnchoredOverlay(node, doc);

        if (!anchored && !isOverlayComponent(node.component))
        {
            continue;
        }

        if (anchored)
        {
            const targetId = (node.anchor as { nodeId: string }).nodeId;
            const target = out.get(targetId);

            if (target)
            {
                const spot = (node.anchor as {
                    spot?: { x: number; y: number };
                }).spot;

                if (spot)
                {
                    out.set(node.id, spotRect(target, spot));
                    continue;
                }

                const index = perTarget.get(targetId) ?? 0;
                perTarget.set(targetId, index + 1);
                out.set(node.id, overlayRect(target, index));
                continue;
            }
        }

        // An unanchored overlay still floats rather than being packed: it
        // marches along the top of the main region without pushing anything.
        out.set(node.id, freeOverlayRect(geometry, free));
        free += 1;
    }
}

/**
 * Places an overlay at a specific spot within its target.
 *
 * The spot is a fraction of the target's box, so it survives the target being
 * moved or resized — which a pixel offset would not.
 *
 * @param target - The target's packed rectangle.
 * @param spot   - Fractional position within the target.
 * @returns The overlay's rectangle.
 */
function spotRect(
    target: PackedRect,
    spot: { x: number; y: number }): PackedRect
{
    const clampedX = Math.min(Math.max(spot.x, 0), 1);
    const clampedY = Math.min(Math.max(spot.y, 0), 1);

    return {
        x: target.x + clampedX * target.w - MARKER_SIZE / 2,
        y: target.y + clampedY * target.h - MARKER_SIZE / 2,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        z: target.z + OVERLAY_Z_LIFT,
    };
}

/**
 * Places an overlay that is not bound to any node.
 *
 * @param geometry - Region geometry for the current canvas width.
 * @param index    - Position among unanchored overlays.
 * @returns The overlay's rectangle.
 */
function freeOverlayRect(
    geometry: RegionGeometry,
    index: number): PackedRect
{
    const step = MARKER_SIZE + 8;
    const perRow = Math.max(1, Math.floor(geometry.width.main / step));

    return {
        x: geometry.originX.main + (index % perRow) * step,
        y: Math.floor(index / perRow) * step,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        z: 50,
    };
}

/**
 * Computes an overlay's rectangle from its target's.
 *
 * Markers sit inside the target's top-right corner and march leftwards, so
 * they read as belonging to it without covering its content.
 *
 * @param target - The target's packed rectangle.
 * @param index  - Position among overlays sharing this target.
 * @returns The overlay's rectangle.
 */
function overlayRect(target: PackedRect, index: number): PackedRect
{
    const step = MARKER_SIZE + 4;
    const perRow = Math.max(1, Math.floor(target.w / step));
    const column = index % perRow;
    const row = Math.floor(index / perRow);

    return {
        x: target.x + target.w - step * (column + 1),
        y: target.y + row * step,
        w: MARKER_SIZE,
        h: MARKER_SIZE,
        z: target.z + OVERLAY_Z_LIFT,
    };
}

// ============================================================================
// INTERNALS
// ============================================================================

/** Cursor tracking the current row within one region. */
interface Shelf
{
    x: number;
    y: number;
    rowHeight: number;
}

/**
 * Reads a fixed placement straight through.
 *
 * @param node - A node whose placement is fixed.
 * @returns Its rectangle.
 */
function fixedRect(node: CanvasNode): PackedRect
{
    const p = node.placement as Extract<CanvasNode["placement"], { kind: "fixed" }>;

    return { x: p.x, y: p.y, w: p.w, h: p.h, z: p.z };
}

/**
 * Orders nodes for packing: pinned first, then by id.
 *
 * The id tie-break is what makes the result independent of insertion order,
 * which in turn is what lets a test assert an exact layout.
 *
 * @param nodes - Every node in the document.
 * @returns Intent-placed nodes in deterministic order.
 */
function orderForPacking(nodes: readonly CanvasNode[]): CanvasNode[]
{
    return nodes
        .filter((n) => n.placement.kind === "intent")
        .slice()
        .sort((a, b) =>
        {
            if (a.pinned !== b.pinned)
            {
                return a.pinned ? -1 : 1;
            }

            return a.id.localeCompare(b.id);
        });
}

/**
 * Places one intent-placed node on its region's shelf, wrapping when the row
 * is full and stepping down past any obstacle it would collide with.
 *
 * @param node      - The node to place.
 * @param shelves   - Per-region cursors, mutated in place.
 * @param obstacles - Rectangles already occupied.
 * @returns The node's rectangle.
 */
function placeIntent(
    node: CanvasNode,
    shelves: Map<Region, Shelf>,
    obstacles: readonly PackedRect[],
    geometry: RegionGeometry): PackedRect
{
    const p = node.placement as Extract<CanvasNode["placement"], { kind: "intent" }>;
    const shelf = shelfFor(p.region, shelves, geometry);
    const size = sizeOf(p.region, p.size, geometry);

    if (shelf.x + size.w
        > geometry.originX[p.region] + geometry.width[p.region])
    {
        wrap(shelf, p.region, geometry);
    }

    let rect: PackedRect = {
        x: shelf.x, y: shelf.y, w: size.w, h: size.h, z: REGION_Z[p.region],
    };

    rect = avoid(rect, obstacles, p.region, geometry);

    shelf.x = rect.x + rect.w + PACK_GUTTER;
    shelf.y = rect.y;
    shelf.rowHeight = Math.max(shelf.rowHeight, rect.h);

    return rect;
}

/**
 * Returns the cursor for a region, creating it at the region origin.
 *
 * @param region  - The region.
 * @param shelves - Cursor map, mutated in place.
 * @returns The cursor.
 */
function shelfFor(
    region: Region,
    shelves: Map<Region, Shelf>,
    geometry: RegionGeometry): Shelf
{
    let shelf = shelves.get(region);

    if (!shelf)
    {
        shelf = {
            x: geometry.originX[region],
            y: REGION_ORIGIN_Y[region],
            rowHeight: 0,
        };
        shelves.set(region, shelf);
    }

    return shelf;
}

/**
 * Moves a cursor to the start of the next row.
 *
 * @param shelf  - Cursor, mutated in place.
 * @param region - The region it belongs to.
 */
function wrap(shelf: Shelf, region: Region, geometry: RegionGeometry): void
{
    shelf.x = geometry.originX[region];
    shelf.y += shelf.rowHeight + PACK_GUTTER;
    shelf.rowHeight = 0;
}

/**
 * Steps a rectangle down past anything it collides with.
 *
 * A user who has dragged a node has expressed an intent the packer must never
 * override, so hand-placed nodes act as obstacles rather than being moved.
 *
 * @param rect      - Candidate rectangle.
 * @param obstacles - Rectangles already occupied.
 * @param region    - Region being packed, for the wrap origin.
 * @returns A rectangle clear of every obstacle.
 */
function avoid(
    rect: PackedRect,
    obstacles: readonly PackedRect[],
    region: Region,
    geometry: RegionGeometry): PackedRect
{
    let current = rect;
    let guard = 0;

    while (guard++ < 200)
    {
        const hit = obstacles.find((o) => intersects(current, o));

        if (!hit)
        {
            return current;
        }

        current = {
            ...current,
            x: geometry.originX[region],
            y: hit.y + hit.h + PACK_GUTTER,
        };
    }

    return current;
}

/**
 * Axis-aligned rectangle intersection.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns True when they overlap.
 */
function intersects(a: PackedRect, b: PackedRect): boolean
{
    return a.x < b.x + b.w && b.x < a.x + a.w
        && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Resolves a size hint to pixels, clamped to the region width.
 *
 * @param region - Region being packed.
 * @param hint   - Declared size hint.
 * @returns Width and height in canvas pixels.
 */
function sizeOf(
    region: Region,
    hint: SizeHint,
    geometry: RegionGeometry): { w: number; h: number }
{
    return {
        w: Math.min(SIZE_HINT_WIDTH[hint], geometry.width[region]),
        h: SIZE_HINT_HEIGHT[hint],
    };
}

// ========================================================================
// SOURCE: lifecycle.ts
// ========================================================================

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




// ============================================================================
// TYPES
// ============================================================================

/** Everything the lifecycle manager needs from its host. */
interface LifecycleDeps
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
interface LifecycleOptions
{
    /** Maximum simultaneously mounted nodes. */
    readonly mountCap?: number;

    /** Maximum total mounted weight, in JS bytes. */
    readonly weightBudget?: number;

    /** Turns a node may go untouched before collapsing to a chip. */
    readonly decayTurns?: number;
}

/** The mount policy engine. */
interface LifecycleManager
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
function createLifecycleManager(
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

// ========================================================================
// SOURCE: conformance.ts
// ========================================================================

/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: c0c46c8e-3c5a-4450-a7e7-69042b18584e
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicUIRuntime / Conformance
 * 📜 PURPOSE: The generic, manifest-driven conformance checker. One suite runs
 *    over every registered component and decides whether it may be mounted on
 *    a canvas. This is what turns a 118-component retrofit from 118 design
 *    problems into a mechanical burn-down.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Registry]], [[Surface]]
 * ⚡ FLOW: [manifest + factory] -> [runConformance()] -> [failures]
 * 🔒 SECURITY: Mounts into a detached host and always tears it down, so a
 *    misbehaving component cannot leak DOM into the test page.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamicui-conformance
// @entrypoint



// ============================================================================
// TYPES
// ============================================================================

/** Whether a finding blocks the gate or merely records a coverage gap. */
type CheckSeverity = "failure" | "warning";

/** One conformance finding. */
interface ConformanceFailure
{
    /** Stable check id, e.g. "destroy-idempotent". */
    readonly check: string;

    /** Failures block the gate; warnings record an untested obligation. */
    readonly severity: CheckSeverity;

    /** What went wrong, concretely enough to act on. */
    readonly detail: string;
}

/** A component under test, plus the glue needed to exercise it. */
interface ConformanceTarget
{
    /** The component's capability manifest. */
    readonly manifest: CapabilityManifest;

    /** The factory function itself, not its name. */
    readonly factory: unknown;

    /** Options merged over the manifest defaults. */
    readonly options?: Record<string, unknown>;

    /**
     * Calls the factory. Defaults to the canonical `factory(hostId, options)`
     * form from ADR-134. Supply this only for components that predate the
     * convention and take their arguments the other way round.
     */
    readonly invoke?: (
        factory: unknown,
        hostId: string,
        options: Record<string, unknown>) => unknown;

    /**
     * Causes a channel to emit, so the legacy-callback and channel-observable
     * checks can run. Without it those obligations are reported as warnings
     * rather than silently skipped.
     */
    readonly trigger?: (
        channel: string,
        handle: Record<string, unknown>) => boolean | void;
}

/** Declaration of one check, for documentation and coverage reporting. */
interface CheckDeclaration
{
    readonly id: string;
    readonly minLevel: ConformanceLevel;
    readonly description: string;
}

// ============================================================================
// CHECK REGISTRY
// ============================================================================

/**
 * Every check the suite performs. `minLevel` selects which components it
 * applies to: display checks run for all levels, field and surface checks run
 * only for components declaring that level.
 */
const CONFORMANCE_CHECKS: readonly CheckDeclaration[] =
[
    { id: "manifest-valid", minLevel: "display", description: "Manifest passes schema validation." },
    { id: "factory-callable", minLevel: "display", description: "Factory is a callable function." },
    { id: "mounts", minLevel: "display", description: "Mounts into a detached host and returns a handle." },
    { id: "display-methods", minLevel: "display", description: "Handle exposes destroy()." },
    { id: "field-methods", minLevel: "field", description: "Handle exposes getValue/setValue/destroy." },
    { id: "surface-methods", minLevel: "surface", description: "Handle exposes setData/on/getState/setState/destroy." },
    { id: "on-returns-unsubscribe", minLevel: "surface", description: "on() returns a working unsubscribe function." },
    { id: "slots-accept-data", minLevel: "surface", description: "Every declared slot accepts a sample of its payload shape." },
    { id: "state-keys-declared", minLevel: "surface", description: "getState() returns only declared stateKeys." },
    { id: "state-serialisable", minLevel: "surface", description: "getState() is JSON-serialisable." },
    { id: "state-round-trips", minLevel: "surface", description: "setState(getState()) restores the captured state." },
    { id: "channel-observable", minLevel: "surface", description: "Every declared channel reaches an on() subscriber." },
    { id: "legacy-callback-fires", minLevel: "surface", description: "The pre-existing constructor callback still fires, and fires first." },
    { id: "renders-content", minLevel: "display", description: "Mounting puts something in the host." },
    { id: "destroy-clears-dom", minLevel: "display", description: "destroy() removes everything the component added." },
    { id: "destroy-idempotent", minLevel: "display", description: "A second destroy() is a no-op." },
];

// ============================================================================
// SAMPLE DATA
// ============================================================================

/** Representative sample payloads, one per data shape. */
const SAMPLES: Readonly<Record<DataShape, () => unknown>> =
{
    scalar: () => 42,
    record: () => ({ id: "r1", name: "Sample" }),
    collection: () => [{ id: "r1", name: "One" }, { id: "r2", name: "Two" }],
    hierarchy: () => ({ id: "root", label: "Root", children: [{ id: "c1", label: "Child" }] }),
    graph: () => ({ nodes: [{ id: "n1" }, { id: "n2" }], edges: [{ source: "n1", target: "n2" }] }),
    timeseries: () => [{ t: "2026-01-01", v: 1 }, { t: "2026-01-02", v: 2 }],
    document: () => ({ id: "d1", title: "Sample", body: "Text" }),
    media: () => ({ id: "m1", url: "about:blank", kind: "image" }),
    geo: () => ({ type: "Point", coordinates: [0, 0] }),
    diff: () => ({ before: { a: 1 }, after: { a: 2 } }),
};

/**
 * Builds a representative sample value for a data shape, used to exercise a
 * component's declared slots.
 *
 * @param shape - The declared payload shape.
 * @returns A JSON-serialisable sample.
 */
function sampleFor(shape: DataShape): unknown
{
    return (SAMPLES[shape] ?? SAMPLES.record)();
}

// ============================================================================
// HELPERS
// ============================================================================

/** Monotonic counter so concurrent hosts cannot collide on an id. */
let hostSeq = 0;

/** Records a finding into the accumulator. */
function fail(
    out: ConformanceFailure[],
    check: string,
    detail: string,
    severity: CheckSeverity = "failure"): void
{
    out.push({ check, severity, detail });
}

/** True when a handle exposes every named method. */
function hasMethods(
    handle: Record<string, unknown>,
    names: readonly string[]): string[]
{
    return names.filter((n) => typeof handle[n] !== "function");
}

/**
 * Calls a handle method with `this` bound to the handle.
 *
 * Extracting a method and calling it detached silently breaks every
 * class-based component in the fleet — `this` becomes undefined and the call
 * throws deep inside the component. Always route through here.
 *
 * @param handle - The mounted handle.
 * @param method - Method name.
 * @param args   - Arguments to forward.
 * @returns Whatever the method returned.
 */
function call(
    handle: Record<string, unknown>,
    method: string,
    ...args: unknown[]): unknown
{
    return (handle[method] as (...a: unknown[]) => unknown)
        .apply(handle, args);
}

/** Calls a handle method, returning any thrown error rather than propagating. */
function attempt(fn: () => void): Error | null
{
    try
    {
        fn();
        return null;
    }
    catch (err)
    {
        return err instanceof Error ? err : new Error(String(err));
    }
}

/** Structural equality over JSON-serialisable values. */
function sameJson(a: unknown, b: unknown): boolean
{
    try
    {
        return JSON.stringify(a) === JSON.stringify(b);
    }
    catch
    {
        return false;
    }
}

// ============================================================================
// RUNNER
// ============================================================================

/**
 * Runs the conformance suite against one component.
 *
 * Returns findings rather than throwing, so the same routine can drive a
 * vitest assertion, the structural gate, and a coverage report.
 *
 * @param target - The component, its manifest, and any glue it needs.
 * @returns Every finding. An empty array means fully conformant.
 */
function runConformance(
    target: ConformanceTarget): ConformanceFailure[]
{
    const out: ConformanceFailure[] = [];
    const { manifest } = target;

    const res = validateManifest(manifest);

    if (!res.ok)
    {
        fail(out, "manifest-valid",
            res.issues.map((i) => `${i.path}: ${i.problem}`).join("; "));
    }

    if (typeof target.factory !== "function")
    {
        fail(out, "factory-callable",
            `Expected a function, found ${typeof target.factory}.`);
        return out;
    }

    return runMounted(target, out);
}

/**
 * Mounts the component and runs every check that needs a live instance,
 * guaranteeing the host is removed however the run ends.
 *
 * @param target - The component under test.
 * @param out    - Findings accumulated so far.
 * @returns Every finding.
 */
function runMounted(
    target: ConformanceTarget,
    out: ConformanceFailure[]): ConformanceFailure[]
{
    mountError = "";

    const host = document.createElement("div");
    host.id = `conformance-host-${++hostSeq}`;
    document.body.appendChild(host);

    try
    {
        const spies = new Map<string, unknown[]>();
        const handle = mount(target, host.id, spies);

        if (!handle)
        {
            fail(out, "mounts",
                `Factory did not produce a handle. ${mountError}`);
            return out;
        }

        checkMethods(target, handle, out);
        checkRendered(target, host, out);
        checkSurface(target, handle, spies, out);
        checkTeardown(handle, host, out);
    }
    finally
    {
        host.remove();
    }

    return out;
}

/**
 * Invokes the factory with spy callbacks injected for every channel that
 * declares a legacy option.
 *
 * @param target - The component under test.
 * @param hostId - Id of the host element.
 * @param spies  - Receives the values each legacy callback observed.
 * @returns The handle, or null when the factory failed.
 */
function mount(
    target: ConformanceTarget,
    hostId: string,
    spies: Map<string, unknown[]>): Record<string, unknown> | null
{
    const options: Record<string, unknown> = {
        ...target.manifest.defaultOptions,
        ...target.options,
    };

    for (const channel of target.manifest.emits)
    {
        if (!channel.legacyOption)
        {
            continue;
        }

        const seen: unknown[] = [];
        spies.set(channel.name, seen);
        options[channel.legacyOption] = (v: unknown) => seen.push(v);
    }

    try
    {
        const invoke = target.invoke ?? defaultInvoke(target.manifest);
        const handle = invoke(target.factory, hostId, options);

        if (handle && typeof handle === "object")
        {
            attachHandle(
                handle as Record<string, unknown>,
                target.manifest,
                document.getElementById(hostId));

            return handle as Record<string, unknown>;
        }

        mountError = `Factory returned ${handle === null ? "null" : typeof handle}, `
            + "expected a handle object.";
        return null;
    }
    catch (err)
    {
        mountError = err instanceof Error
            ? `${err.message}\n${(err.stack ?? "").split("\n").slice(1, 4).join("\n")}`
            : String(err);
        return null;
    }
}

/**
 * Attaches a component that does not attach itself.
 *
 * @param handle   - The freshly constructed handle.
 * @param manifest - Declares how attachment works.
 * @param host     - The host element.
 */
function attachHandle(
    handle: Record<string, unknown>,
    manifest: CapabilityManifest,
    host: HTMLElement | null): void
{
    if (!host || !manifest.mountMethod || manifest.mountMethod === "auto")
    {
        return;
    }

    if (manifest.mountMethod === "show" && typeof handle.show === "function")
    {
        (handle.show as (h: HTMLElement) => void).call(handle, host);
        return;
    }

    if (manifest.mountMethod === "getElement"
        && typeof handle.getElement === "function")
    {
        const el = (handle.getElement as () => unknown).call(handle);

        if (el instanceof Element)
        {
            host.appendChild(el);
        }
    }
}

/** Reason the most recent mount failed, surfaced in the finding. */
let mountError = "";

/**
 * Builds the factory invoker for a declared argument order.
 *
 * @param manifest - Declares factoryStyle and, for options-only, the option
 *                   key carrying the host element.
 * @returns An invoker matching that convention.
 */
function defaultInvoke(
    manifest: CapabilityManifest):
    (f: unknown, id: string, o: Record<string, unknown>) => unknown
{
    if (manifest.factoryStyle === "options-first")
    {
        return (f, id, o) =>
            (f as (a: unknown, b: string) => unknown)(o, id);
    }

    if (manifest.factoryStyle === "options-only")
    {
        const key = manifest.containerOption ?? "container";
        const asId = manifest.containerAs === "id";

        return (f, id, o) => (f as (a: unknown) => unknown)(
            { ...o, [key]: asId ? id : document.getElementById(id) });
    }

    return (f, id, o) =>
        (f as (a: string, b: unknown) => unknown)(id, o);
}

/**
 * Asserts that mounting actually put something in the host.
 *
 * Without this, a component handed the wrong container option constructs
 * successfully, renders nothing, and passes every other check — including
 * destroy-clears-dom, which is trivially satisfied when nothing was added.
 * That exact failure hid a wrong `containerOption` on TreeView.
 *
 * @param target - The component under test.
 * @param host   - The host element it was mounted into.
 * @param out    - Findings accumulator.
 */
function checkRendered(
    target: ConformanceTarget,
    host: HTMLElement,
    out: ConformanceFailure[]): void
{
    if (host.childNodes.length > 0)
    {
        return;
    }

    const m = target.manifest;
    const hint = m.factoryStyle === "options-only"
        ? ` Check containerOption ("${m.containerOption ?? "container"}"), `
            + `containerAs ("${m.containerAs ?? "element"}") and mountMethod `
            + `("${m.mountMethod ?? "auto"}") — the component `
            + "may be reading a different option, expecting an id where an "
            + "element was passed, or needing show()/getElement() to attach."
        : ` Check factoryStyle ("${m.factoryStyle ?? "container-first"}") and `
            + `mountMethod ("${m.mountMethod ?? "auto"}").`;

    fail(out, "renders-content",
        `Mounting produced a handle but left the host empty.${hint}`);
}

/**
 * Checks that the handle exposes the methods its conformance level requires.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkMethods(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const level = target.manifest.conformance;

    const missing = hasMethods(handle, methodsFor(level));

    if (missing.length > 0)
    {
        fail(out, `${level}-methods`,
            `Missing ${missing.join(", ")} on the handle.`);
    }
}

/**
 * The methods each conformance level requires.
 *
 * @param level - Declared conformance level.
 * @returns Required method names.
 */
function methodsFor(level: ConformanceLevel): readonly string[]
{
    if (level === "surface")
    {
        return ["setData", "on", "getState", "setState", "destroy"];
    }

    if (level === "field")
    {
        return ["getValue", "setValue", "destroy"];
    }

    return ["destroy"];
}

// ============================================================================
// SURFACE CHECKS
// ============================================================================

/**
 * Runs every surface-level check. Skipped entirely for display and field
 * components, which carry no wiring obligations.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param spies  - Legacy callback observations, keyed by channel.
 * @param out    - Findings accumulator.
 */
function checkSurface(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    spies: Map<string, unknown[]>,
    out: ConformanceFailure[]): void
{
    if (target.manifest.conformance !== "surface")
    {
        return;
    }

    if (typeof handle.on !== "function" || typeof handle.setData !== "function"
        || typeof handle.getState !== "function"
        || typeof handle.setState !== "function")
    {
        return;
    }

    checkUnsubscribe(target, handle, out);
    checkChannels(target, handle, spies, out);
    checkStateContract(target, handle, out);
}

/**
 * Asserts on() hands back a usable unsubscribe function.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkUnsubscribe(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const channel = target.manifest.emits[0]?.name ?? "probe";
    const off = call(handle, "on", channel, () => undefined);

    if (typeof off !== "function")
    {
        fail(out, "on-returns-unsubscribe",
            `on("${channel}") returned ${typeof off}, expected a function. `
            + "The canvas creates and tears down bindings continuously and "
            + "cannot retain handler references.");
        return;
    }

    const err = attempt(() => (off as () => void)());

    if (err)
    {
        fail(out, "on-returns-unsubscribe",
            `Unsubscribe threw: ${err.message}`);
    }
}

/**
 * Asserts every declared channel reaches an on() subscriber, and that the
 * pre-existing constructor callback still fires first.
 *
 * This is the ADDITIVE guarantee made verifiable: it is the regression net
 * that proves adding on() did not displace anyone's existing callback.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param spies  - Legacy callback observations, keyed by channel.
 * @param out    - Findings accumulator.
 */
function checkChannels(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    spies: Map<string, unknown[]>,
    out: ConformanceFailure[]): void
{
    if (!target.trigger)
    {
        for (const channel of target.manifest.emits)
        {
            fail(out, "channel-observable",
                `Channel "${channel.name}" was not exercised — the target `
                + "supplies no trigger(), so neither the on() path nor the "
                + "legacy callback could be verified.", "warning");
        }

        return;
    }

    for (const channel of target.manifest.emits)
    {
        exerciseChannel(target, handle, channel.name,
            spies.get(channel.name), out);
    }
}

/**
 * Triggers one channel and checks both delivery paths.
 *
 * @param target  - The component under test.
 * @param handle  - The mounted handle.
 * @param channel - Channel name.
 * @param seen    - Legacy callback observations, if the channel declares one.
 * @param out     - Findings accumulator.
 */
function exerciseChannel(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    channel: string,
    seen: unknown[] | undefined,
    out: ConformanceFailure[]): void
{
    const observed: unknown[] = [];

    call(handle, "on", channel, (v: unknown) => observed.push(v));

    const before = seen?.length ?? 0;
    let driven: boolean | void = undefined;
    let err: Error | null = null;

    try
    {
        driven = target.trigger!(channel, handle);
    }
    catch (caught)
    {
        err = caught instanceof Error ? caught : new Error(String(caught));
    }

    if (err)
    {
        fail(out, "channel-observable",
            `Triggering "${channel}" threw: ${err.message}`);
        return;
    }

    if (driven === false)
    {
        fail(out, "channel-observable",
            `Channel "${channel}" could not be driven programmatically, so `
            + "neither the on() path nor the legacy callback was verified. "
            + "Extend the component's .conformance.ts trigger when a way to "
            + "drive it exists.", "warning");
        return;
    }

    if (observed.length === 0)
    {
        fail(out, "channel-observable",
            `Channel "${channel}" is declared in the manifest but never `
            + "reached an on() subscriber after being triggered.");
    }

    if (seen && seen.length === before)
    {
        fail(out, "legacy-callback-fires",
            `The constructor callback for "${channel}" did not fire. Adding `
            + "on() must not displace it — existing consumers depend on it "
            + "and the Dynamic UI layer is additive by contract.");
    }
}

/**
 * Checks the state contract: declared keys only, JSON-serialisable, and a
 * faithful round trip.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function checkStateContract(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const captured = call(handle, "getState") as Record<string, unknown>;

    checkStateKeys(target.manifest, captured, out);
    checkStateSerialisable(captured, out);
    checkRoundTrip(target, handle, captured, out);
}

/**
 * Asserts getState() returns nothing the manifest did not declare.
 *
 * @param manifest - The component's manifest.
 * @param state    - The captured state.
 * @param out      - Findings accumulator.
 */
function checkStateKeys(
    manifest: CapabilityManifest,
    state: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    const declared = new Set(manifest.stateKeys);
    const extra = Object.keys(state ?? {}).filter((k) => !declared.has(k));

    if (extra.length > 0)
    {
        fail(out, "state-keys-declared",
            `getState() returned undeclared key(s): ${extra.join(", ")}. `
            + "Declare them in the manifest's stateKeys or stop returning them "
            + "— the canvas persists exactly what is declared.");
    }
}

/**
 * Asserts the captured state survives a JSON round trip, since it is
 * persisted by the host.
 *
 * @param state - The captured state.
 * @param out   - Findings accumulator.
 */
function checkStateSerialisable(
    state: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    let encoded: string | undefined;

    const err = attempt(() => { encoded = JSON.stringify(state); });

    if (err || encoded === undefined)
    {
        fail(out, "state-serialisable",
            `getState() is not JSON-serialisable: ${err?.message ?? "encoded to undefined"}.`);
        return;
    }

    const lost = findUnserialisable(state, "");

    if (lost.length > 0)
    {
        fail(out, "state-serialisable",
            `getState() contains value(s) that JSON silently discards: `
            + `${lost.join(", ")}. The host persists this state, so a dropped `
            + "value restores as missing rather than as an error.");
    }
}

/**
 * Walks a value and reports paths holding types JSON drops silently.
 *
 * Comparing JSON.stringify output before and after cannot catch these — both
 * sides discard the same values, so the comparison always agrees. The only
 * reliable check is a structural walk.
 *
 * @param value - The value to inspect.
 * @param path  - Accumulated path, for the report.
 * @returns Paths whose values would not survive persistence.
 */
function findUnserialisable(value: unknown, path: string): string[]
{
    const kind = typeof value;

    if (kind === "function" || kind === "symbol" || kind === "bigint"
        || value === undefined)
    {
        return [`${path || "$"} (${kind})`];
    }

    if (value === null || kind !== "object")
    {
        return [];
    }

    if (Array.isArray(value))
    {
        return value.flatMap((v, i) => findUnserialisable(v, `${path}[${i}]`));
    }

    return Object.entries(value as Record<string, unknown>)
        .flatMap(([k, v]) => findUnserialisable(v, path ? `${path}.${k}` : k));
}

/**
 * Asserts setState() restores a previously captured state.
 *
 * Mutates the component through a declared slot first, so a setState() that
 * silently does nothing cannot pass by leaving state coincidentally equal.
 * When no slot produces an observable change the check cannot conclude, and
 * says so as a warning rather than passing quietly.
 *
 * @param target   - The component under test.
 * @param handle   - The mounted handle.
 * @param captured - State captured before mutation.
 * @param out      - Findings accumulator.
 */
function checkRoundTrip(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    captured: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    fillSlots(target, handle, out);

    const mutated = call(handle, "getState") as Record<string, unknown>;

    if (sameJson(mutated, captured))
    {
        fail(out, "state-round-trips",
            "No declared slot produced an observable state change, so the "
            + "round trip could not be verified.", "warning");
        return;
    }

    const err = attempt(() => { call(handle, "setState", captured); });

    if (err)
    {
        fail(out, "state-round-trips", `setState() threw: ${err.message}`);
        return;
    }

    if (!sameJson(call(handle, "getState"), captured))
    {
        fail(out, "state-round-trips",
            "setState(getState()) did not restore the captured state. The "
            + "canvas virtualizes aggressively, so a lossy restore shows the "
            + "user a component that silently lost their place.");
    }
}

/**
 * Feeds a sample of the declared payload shape into every declared slot.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param out    - Findings accumulator.
 */
function fillSlots(
    target: ConformanceTarget,
    handle: Record<string, unknown>,
    out: ConformanceFailure[]): void
{
    for (const slot of target.manifest.accepts)
    {
        const custom = slot.setter && slot.setter !== "setData"
            && typeof handle[slot.setter] === "function"
            ? slot.setter
            : null;

        const err = attempt(() =>
        {
            if (custom)
            {
                call(handle, custom, sampleFor(slot.payload));
                return;
            }

            call(handle, "setData", slot.name, sampleFor(slot.payload));
        });

        if (err)
        {
            fail(out, "slots-accept-data",
                `Slot "${slot.name}" rejected a sample ${slot.payload}: `
                + `${err.message}`);
        }
    }
}

// ============================================================================
// TEARDOWN CHECKS
// ============================================================================

/**
 * Checks that destroy() cleans up completely and tolerates a second call.
 *
 * Both matter to the canvas specifically: it mounts and unmounts continuously
 * as the viewport moves, so a leak compounds and a throwing second destroy
 * breaks reconciliation for every other node.
 *
 * @param target - The component under test.
 * @param handle - The mounted handle.
 * @param host   - The host element the component was mounted into.
 * @param out    - Findings accumulator.
 */
function checkTeardown(
    handle: Record<string, unknown>,
    host: HTMLElement,
    out: ConformanceFailure[]): void
{
    if (typeof handle.destroy !== "function")
    {
        return;
    }

    const first = attempt(() => { call(handle, "destroy"); });

    if (first)
    {
        fail(out, "destroy-clears-dom", `destroy() threw: ${first.message}`);
        return;
    }

    if (host.childNodes.length > 0)
    {
        fail(out, "destroy-clears-dom",
            `destroy() left ${host.childNodes.length} node(s) in the host. `
            + "The canvas mounts and unmounts continuously, so anything left "
            + "behind compounds.");
    }

    const second = attempt(() => { call(handle, "destroy"); });

    if (second)
    {
        fail(out, "destroy-idempotent",
            `A second destroy() threw: ${second.message}. Lifecycle may call `
            + "destroy() on an already-demoted node; it must be a no-op.");
    }
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Formats findings for a test assertion message.
 *
 * @param component - Component name.
 * @param findings  - Findings from runConformance.
 * @returns A multi-line report, or an empty string when fully conformant.
 */
function formatConformance(
    component: string,
    findings: readonly ConformanceFailure[]): string
{
    if (findings.length === 0)
    {
        return "";
    }

    const lines = findings.map(
        (f) => `  [${f.severity}] ${f.check}: ${f.detail}`);

    return `${LOG_PREFIX} ${component} conformance:\n${lines.join("\n")}`;
}

/**
 * Filters findings down to the ones that block the gate.
 *
 * @param findings - Findings from runConformance.
 * @returns Only the blocking failures.
 */
function blockingFailures(
    findings: readonly ConformanceFailure[]): ConformanceFailure[]
{
    return findings.filter((f) => f.severity === "failure");
}

// ========================================================================
// GLOBAL REGISTRATION
// ========================================================================

(window as unknown as Record<string, unknown>)["EnterpriseRuntime"] = {
    createEmptyDocument, validateDocument, validatePatch, applyPatch,
    fold, foldTo, branch,
    registerComponent, registerComponents, getManifest, getAllManifests,
    isRegistered, clearRegistry, validateManifest, resolveFactory,
    lookupFactory,
    resolve, registerPresentationPreference, recordUserChoice,
    clearPresentationPreferences, RESOLVER_WEIGHTS,
    createWiringEngine, registerTransform, getTransform, clearTransforms,
    packDocument,
    createLifecycleManager,
    runConformance, blockingFailures, formatConformance, sampleFor,
};
