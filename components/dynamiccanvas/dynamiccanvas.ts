/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 * File GUID: 6ad2f9c1-04be-4f7d-9d3a-1c5e8b2740af
 * Created: 2026-08-03
 */
/*
 * ----------------------------------------------------------------------------
 * ⚓ COMPONENT: DynamicCanvas
 * 📜 PURPOSE: The rendered surface of the Dynamic UI layer. Mounts live
 *    components onto an infinite, pannable canvas from a CanvasDocument,
 *    wires them to each other, and virtualizes anything off screen.
 *
 *    It renders; runtime/ decides. Placement comes from the packer, mounting
 *    from lifecycle, delivery from the wiring engine, and component identity
 *    from the allowlisted registry.
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Packer]], [[Lifecycle]], [[Wiring]],
 *    [[ClickToPlace]]
 * ⚡ FLOW: [CanvasPatch] -> [fold] -> [pack] -> [lifecycle.sync] -> [DOM]
 * ⚡ FLOW: [startPlacement] -> [click] -> [captureSpot] -> [CanvasPatch]
 * 🔒 SECURITY: Components are resolved allowlist-only via the registry
 *    (ADR-143). No user or model content is ever assigned as HTML — every
 *    label goes through textContent.
 * ----------------------------------------------------------------------------
 */

// @semantic-marker dynamiccanvas
// @entrypoint

// ============================================================================
// RUNTIME ACCESS
// ============================================================================

/*
 * The Dynamic UI runtime is consumed as a WINDOW GLOBAL, not an import.
 *
 * The build wraps every component in its own IIFE and compiles the components
 * tree with rootDir "components", so a cross-tree import of runtime/src cannot
 * resolve. This is the same external-globals pattern the library already uses
 * for Chart.js, CodeMirror, marked and KaTeX (ADR-028). Load
 * `runtime/runtime.js` before this component.
 *
 * The structural types below are declared locally for the same reason: the
 * IIFE build cannot share type declarations across trees either. They are
 * intentionally minimal — only what this component touches.
 */

/** How a component's factory is called and how it attaches. */
interface FactoryShape
{
    readonly factoryStyle?: string;
    readonly containerOption?: string;
    readonly containerAs?: string;
    readonly mountMethod?: string;
}

/** Pan offset and zoom. */
interface Viewport
{
    readonly x: number;
    readonly y: number;
    readonly zoom: number;
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

/** The uniform contract a canvas-mounted component satisfies. */
interface Surface
{
    setData(slot: string, value: unknown): void;
    on(channel: string, handler: (payload: unknown) => void): () => void;
    getState(): Record<string, unknown>;
    setState(state: Record<string, unknown>): void;
    destroy(): void;
}

/** One mounted component on the canvas. */
interface CanvasNode
{
    readonly id: string;
    readonly component: string;
    readonly placement: Record<string, unknown> & { kind: string };
    readonly options: Record<string, unknown>;
    readonly state: Record<string, unknown>;
    readonly provenance: { readonly turnId: string; readonly lastTouched: number };
    readonly pinned: boolean;
    readonly anchor?: {
        readonly kind: string;
        readonly nodeId?: string;
        readonly spot?: { readonly x: number; readonly y: number };
        readonly within?: number;
    };
}

/** The materialised scene. */
interface CanvasDocument
{
    readonly id: string;
    readonly title: string;
    readonly nodes: Readonly<Record<string, CanvasNode>>;
    readonly viewport: Viewport;
    readonly turnId: string;
    readonly revision: number;
}

/** One mutation within a patch. */
type PatchOp = Record<string, unknown> & { op: string };

/** One turn's worth of change. */
interface CanvasPatch
{
    readonly turnId: string;
    readonly revision: number;
    readonly ops: readonly PatchOp[];
}

/** What this component uses from the runtime bundle. */
interface RuntimeApi
{
    createEmptyDocument(id: string, workspaceId: string): CanvasDocument;
    applyPatch(doc: CanvasDocument, patch: CanvasPatch): CanvasDocument;
    fold(patches: readonly CanvasPatch[]): CanvasDocument;
    packDocument(
        doc: CanvasDocument,
        options?: {
            width?: number;
            isOverlay?: (component: string) => boolean;
        }): Map<string, PackedRect>;
    getManifest(component: string): (FactoryShape & {
        label: string;
        defaultOptions: Record<string, unknown>;
        presentation?: string;
    }) | null;
    lookupFactory(
        component: string,
        scope: Record<string, unknown>): (...args: unknown[]) => unknown;
    createWiringEngine(deps: Record<string, unknown>): {
        attach(doc: CanvasDocument): void;
        detach(): void;
        replay(nodeId: string): void;
        forget(nodeId: string): void;
    };
    createLifecycleManager(
        deps: Record<string, unknown>,
        options: Record<string, unknown>): {
        sync(doc: CanvasDocument, visible: ReadonlySet<string>, turn: number): void;
        getSurface(nodeId: string): Surface | null;
        isMounted(nodeId: string): boolean;
        getChips(): readonly string[];
        destroy(): void;
    };
}

/**
 * Resolves the runtime bundle, failing with a literate error when it is not
 * loaded — a missing script tag is by far the likeliest cause.
 *
 * @returns The runtime API.
 */
function rt(): RuntimeApi
{
    const api = (window as unknown as Record<string, unknown>)
        ["EnterpriseRuntime"];

    if (!api)
    {
        throw new Error(
            "[DynamicCanvas] window.EnterpriseRuntime is not available. Load "
            + "runtime/runtime.js before components/dynamiccanvas/"
            + "dynamiccanvas.js.");
    }

    return api as unknown as RuntimeApi;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console output from this component. */
const LOG_PREFIX = "[DynamicCanvas]";

/** Root CSS class. */
const CLS = "dyncanvas";

/** Zoom bounds and step. */
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

/** Extra margin, in canvas pixels, within which nodes stay mounted. */
const MOUNT_MARGIN = 400;

/**
 * Marker box, in canvas pixels. MUST match the packer's MARKER_SIZE: the
 * packer sizes the marker, and this is what the canvas centres on when it
 * drops one at a chosen point. The e2e placement suite measures the centre
 * against the click, so the two drifting apart fails loudly rather than
 * quietly offsetting every mark by half a marker.
 */
const MARKER_BOX = 30;

// ============================================================================
// LOGGING
// ============================================================================

/** Emits a structured info log. */
function logInfo(...args: unknown[]): void
{
    console.log(new Date().toISOString(), "[INFO]", LOG_PREFIX, ...args);
}

/** Emits a structured warning. */
function logWarn(...args: unknown[]): void
{
    console.warn(new Date().toISOString(), "[WARN]", LOG_PREFIX, ...args);
}

/** Emits a structured error. */
function logError(...args: unknown[]): void
{
    console.error(new Date().toISOString(), "[ERROR]", LOG_PREFIX, ...args);
}

// ============================================================================
// DOM HELPERS
// ============================================================================

/**
 * Creates an element with a class and optional text.
 *
 * @param tag  - Tag name.
 * @param cls  - Class name.
 * @param text - Text content, assigned via textContent, never as HTML.
 * @returns The element.
 */
function el(tag: string, cls: string, text?: string): HTMLElement
{
    const node = document.createElement(tag);
    node.className = cls;

    if (text !== undefined)
    {
        node.textContent = text;
    }

    return node;
}

/**
 * Clamps a fraction into 0..1.
 *
 * @param v - The value to clamp.
 * @returns The clamped value.
 */
function clamp01(v: number): number
{
    return Math.min(Math.max(v, 0), 1);
}

// ============================================================================
// TYPES
// ============================================================================

/** Options for the dynamic canvas. */
export interface DynamicCanvasOptions
{
    /** Maximum simultaneously mounted nodes. */
    mountCap?: number;

    /** Maximum total mounted weight, in JS bytes. */
    weightBudget?: number;

    /** Turns a node may go untouched before collapsing to a chip. */
    decayTurns?: number;

    /** Global scope used for allowlisted factory lookup. Defaults to window. */
    scope?: Record<string, unknown>;

    /** Called when the canvas produces a patch of its own (drag, close, pin). */
    onPatch?: (patch: CanvasPatch) => void;

    /** Called when a node's "why?" affordance is activated. */
    onExplain?: (nodeId: string) => void;
}

/**
 * A placement armed by the host and completed by the user's next click.
 *
 * The host says WHAT to place; the canvas works out WHERE from the pointer and
 * records it in the document. An application never converts screen coordinates
 * into anchors — that translation is the library's job, and doing it in the app
 * would mean every app re-derived the same zoom, scroll and pan arithmetic.
 */
export interface PlacementSpec
{
    /** Component to place. Defaults to "annotation". */
    component?: string;

    /** Options passed to the placed component's factory. */
    options?: Record<string, unknown>;

    /** Called once the node exists, with the anchor the click resolved to. */
    onPlaced?: (nodeId: string, anchor: Record<string, unknown>) => void;
}

/** Handle returned by createDynamicCanvas. */
export interface DynamicCanvasHandle
{
    /** Replaces the document by folding a patch log. */
    load(patches: readonly CanvasPatch[]): void;

    /** Applies one patch and re-renders. */
    apply(patch: CanvasPatch): void;

    /** The current materialised document. */
    getDocument(): CanvasDocument;

    /** The live Surface for a mounted node, or null. */
    getSurface(nodeId: string): Surface | null;

    /** Node ids currently mounted. */
    getMountedIds(): readonly string[];

    /** Node ids collapsed to chips by decay. */
    getChipIds(): readonly string[];

    /** Pans the viewport by a delta in screen pixels. */
    panBy(dx: number, dy: number): void;

    /** Sets zoom, clamped to the supported range. */
    setZoom(zoom: number): void;

    /** Current viewport. */
    getViewport(): { x: number; y: number; zoom: number };

    /**
     * Arms placement: the user's next click on the canvas places the component
     * exactly where they clicked. Escape, or a second call to cancel, disarms.
     */
    startPlacement(spec?: PlacementSpec): void;

    /** Disarms placement without placing anything. */
    cancelPlacement(): void;

    /** Whether a placement is currently armed. */
    isPlacing(): boolean;

    /** Clears every node from the canvas via a patch. */
    clear(): void;

    /** Tears down the canvas. Idempotent. */
    destroy(): void;
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * ⚓ FUNCTION: createDynamicCanvas
 * Creates a dynamic canvas inside a host element.
 *
 * @param containerId - Id of an element already in the DOM.
 * @param options     - Budget, scope, and callbacks.
 * @returns The canvas handle.
 */
export function createDynamicCanvas(
    containerId: string,
    options: DynamicCanvasOptions = {}): DynamicCanvasHandle
{
    const host = document.getElementById(containerId);

    if (!host)
    {
        throw new Error(
            `${LOG_PREFIX} Container "${containerId}" was not found. Insert `
            + "the element before creating the canvas.");
    }

    return build(host, options);
}

/**
 * Assembles the canvas against a resolved host element.
 *
 * @param host    - Host element.
 * @param options - Canvas options.
 * @returns The canvas handle.
 */
function build(
    host: HTMLElement,
    options: DynamicCanvasOptions): DynamicCanvasHandle
{
    const scope = options.scope
        ?? (window as unknown as Record<string, unknown>);

    let doc: CanvasDocument = rt().createEmptyDocument("canvas", "workspace");
    let patches: CanvasPatch[] = [];
    let turn = 0;
    let destroyed = false;

    const frames = new Map<string, HTMLElement>();
    const bodies = new Map<string, HTMLElement>();

    /** Armed placement, or null. Set by startPlacement, cleared on the click. */
    let placing: PlacementSpec | null = null;

    /** Last packed layout, kept so a scroll can reposition without re-packing. */
    let packedRects: ReadonlyMap<string, PackedRect> = new Map();

    const root = el("div", CLS);
    const world = el("div", `${CLS}-world`);
    const chipRail = el("div", `${CLS}-chiprail`);

    root.appendChild(world);
    root.appendChild(chipRail);
    host.appendChild(root);

    // Capture phase: while a placement is armed, the click is the gesture and
    // must not also reach the component underneath.
    root.addEventListener("click", onCanvasClick, true);

    // Scroll does not bubble, but capture still runs it past every ancestor —
    // so one listener here tracks EVERY scrolling region, including the ones a
    // mounted component creates for itself long after this line runs.
    root.addEventListener("scroll", onRegionScroll, true);

    // ------------------------------------------------------------------
    // Runtime wiring
    // ------------------------------------------------------------------

    const wiring = rt().createWiringEngine({
        getSurface: (id: string) => lifecycle.getSurface(id),
        getManifest: (component: string) => rt().getManifest(component),
        requestOps: (ops: readonly PatchOp[]) => emitPatch(ops),
    });

    const lifecycle = rt().createLifecycleManager(
        {
            mount: (node: CanvasNode) => mountNode(node),
            unmount: (id: string) => unmountNode(id),
            onPromoted: (id: string) => wiring.replay(id),
        },
        {
            mountCap: options.mountCap,
            weightBudget: options.weightBudget,
            decayTurns: options.decayTurns,
        });

    /**
     * Instantiates a node's component into its frame body, honouring the
     * factory argument order declared in its manifest (ADR-144).
     */
    function mountNode(node: CanvasNode): Surface | null
    {
        const body = bodies.get(node.id);
        const manifest = rt().getManifest(node.component);

        if (!body || !manifest)
        {
            logWarn(`Cannot mount "${node.id}" — no frame or manifest.`);
            return null;
        }

        try
        {
            const factory = rt().lookupFactory(node.component, scope);
            const opts = { ...manifest.defaultOptions, ...node.options };

            return invokeFactory(factory, manifest, body, opts) as Surface;
        }
        catch (err)
        {
            logError(`Mount failed for "${node.id}":`, err);
            renderMountError(body, node, err);
            return null;
        }
    }

    /** Removes a node's rendered content without removing its frame. */
    function unmountNode(id: string): void
    {
        const body = bodies.get(id);

        if (body)
        {
            body.replaceChildren();
        }

        wiring.forget(id);
    }

    // ------------------------------------------------------------------
    // Patching
    // ------------------------------------------------------------------

    /**
     * Appends a canvas-authored patch, applies it, and notifies the host so
     * it can persist. User gestures become part of the document rather than
     * ephemeral DOM state, which is what makes them survive a reload.
     */
    function emitPatch(ops: readonly PatchOp[]): void
    {
        if (ops.length === 0 || destroyed)
        {
            return;
        }

        const patch: CanvasPatch = {
            turnId: doc.turnId || `canvas-${doc.revision + 1}`,
            revision: doc.revision + 1,
            ops,
        };

        apply(patch);
        options.onPatch?.(patch);
    }

    /** Applies a patch and re-renders. */
    function apply(patch: CanvasPatch): void
    {
        patches = [...patches, patch];
        doc = rt().applyPatch(doc, patch);
        turn++;
        render();
    }

    /** Replaces the document by folding a patch log. */
    function load(next: readonly CanvasPatch[]): void
    {
        patches = [...next];
        doc = rt().fold(patches);
        turn = doc.revision;
        render();
    }

    // ------------------------------------------------------------------
    // Rendering
    // ------------------------------------------------------------------

    /**
     * Reconciles the DOM against the document: packs, creates and removes
     * frames, then hands the visible set to lifecycle for mounting.
     */
    function render(): void
    {
        if (destroyed)
        {
            return;
        }

        const packed = packCurrent();

        packedRects = packed;
        removeDepartedFrames();

        for (const node of Object.values(doc.nodes))
        {
            const rect = packed.get(node.id);

            if (rect)
            {
                renderFrame(node, rect);
            }
        }

        lifecycle.sync(doc, visibleNodes(packed), turn);
        wiring.attach(doc);
        renderChips();
        applyViewport();

        // After sync, not before: an unmounted body has no content and so no
        // scroll extent, and refining against zero would collapse every mark
        // onto its target's top-left corner.
        refineOverlays();
    }

    /**
     * Packs the current document against the real canvas width.
     *
     * The width matters: with a fixed assumption, a node placed in the side
     * region landed off-screen on a narrower canvas — mounted, correct, and
     * invisible, with nothing logged.
     *
     * @returns Rectangles keyed by node id.
     */
    function packCurrent(): Map<string, PackedRect>
    {
        return rt().packDocument(doc, {
            width: root.clientWidth || undefined,
            isOverlay: (component: string) =>
                rt().getManifest(component)?.presentation === "overlay",
        });
    }

    /** Drops frames for nodes no longer in the document. */
    function removeDepartedFrames(): void
    {
        for (const [id, frame] of [...frames])
        {
            if (!doc.nodes[id])
            {
                frame.remove();
                frames.delete(id);
                bodies.delete(id);
            }
        }
    }

    /**
     * Creates or repositions one node's frame.
     *
     * @param node - The node to render.
     * @param rect - Its packed rectangle.
     */
    function renderFrame(node: CanvasNode, rect: PackedRect): void
    {
        let frame = frames.get(node.id);

        if (!frame)
        {
            frame = buildFrame(node);
            frames.set(node.id, frame);
            world.appendChild(frame);
        }

        frame.style.left = `${rect.x}px`;
        frame.style.top = `${rect.y}px`;
        frame.style.width = `${rect.w}px`;
        frame.style.height = `${rect.h}px`;
        frame.style.zIndex = String(rect.z);

        if (!isOverlay(node))
        {
            frame.classList.toggle(`${CLS}-frame-pinned`, node.pinned);
            refreshChrome(frame, node);
        }
    }

    /**
     * Builds the chrome for one node: title, why?, pin, close, and the body
     * the component mounts into.
     *
     * @param node - The node to build a frame for.
     * @returns The frame element.
     */
    function buildFrame(node: CanvasNode): HTMLElement
    {
        if (isOverlay(node))
        {
            return buildOverlayFrame(node);
        }

        const manifest = rt().getManifest(node.component);
        const frame = el("div", `${CLS}-frame`);
        frame.setAttribute("data-node-id", node.id);

        const bar = el("div", `${CLS}-titlebar`);
        bar.appendChild(el("span", `${CLS}-title`, manifest?.label ?? node.component));
        bar.appendChild(buildChromeButtons(node));

        const body = el("div", `${CLS}-body`);
        bodies.set(node.id, body);

        frame.appendChild(bar);
        frame.appendChild(body);
        attachDrag(frame, bar, node.id);

        return frame;
    }

    /**
     * True when a node is an overlay bound to another node.
     *
     * @param node - The node to classify.
     * @returns Whether it annotates another node.
     */
    function isOverlay(node: CanvasNode): boolean
    {
        // Presentation is a property of the COMPONENT. An annotation is an
        // overlay whether or not it is bound to a node; rendering one as a
        // framed widget produced a titled box containing a dot.
        if (rt().getManifest(node.component)?.presentation === "overlay")
        {
            return true;
        }

        return node.anchor?.kind === "node"
            && Boolean(doc.nodes[(node.anchor as { nodeId: string }).nodeId]);
    }

    /**
     * Builds a bare overlay container — no title bar, no chrome.
     *
     * An annotation is a mark ON something, not a widget beside it, so it gets
     * no frame furniture. Removal is the component's own affair; the canvas
     * offers no close button on a 30px marker.
     *
     * @param node - The overlay node.
     * @returns The container element.
     */
    function buildOverlayFrame(node: CanvasNode): HTMLElement
    {
        const frame = el("div", `${CLS}-overlay`);
        frame.setAttribute("data-node-id", node.id);

        const body = el("div", `${CLS}-body`);
        bodies.set(node.id, body);
        frame.appendChild(body);

        return frame;
    }

    /**
     * Builds the chrome button group.
     *
     * @param node - The node the buttons act on.
     * @returns The button container.
     */
    function buildChromeButtons(node: CanvasNode): HTMLElement
    {
        const group = el("div", `${CLS}-actions`);
        const id = node.id;

        group.appendChild(chromeButton("bi-question-circle", "Why this component?",
            () => options.onExplain?.(id)));

        // Reads the CURRENT node at click time. Closing over the node captured
        // when the frame was built meant `!node.pinned` was always true, so a
        // node could be pinned but never unpinned.
        const pin = chromeButton("bi-pin", "Pin", () =>
        {
            const current = doc.nodes[id];

            if (current)
            {
                emitPatch([{
                    op: "updateNode", id,
                    changes: { pinned: !current.pinned },
                }]);
            }
        });

        pin.setAttribute("data-role", "pin");
        group.appendChild(pin);

        group.appendChild(chromeButton("bi-x-lg", "Close",
            () => emitPatch([{ op: "removeNode", id }])));

        return group;
    }

    /**
     * Refreshes chrome that depends on node state, on every render.
     *
     * The frame itself is built once and reused, so anything reflecting state
     * has to be updated here or it silently goes stale.
     *
     * @param frame - The node's frame element.
     * @param node  - Current node state.
     */
    function refreshChrome(frame: HTMLElement, node: CanvasNode): void
    {
        const pin = frame.querySelector(`[data-role="pin"] i`);

        if (pin)
        {
            pin.className = node.pinned ? "bi-pin-fill" : "bi-pin";
        }

        const label = node.pinned ? "Unpin" : "Pin";
        const btn = frame.querySelector(`[data-role="pin"]`);

        btn?.setAttribute("aria-label", label);
        btn?.setAttribute("title", label);
    }

    /**
     * Builds one chrome button.
     *
     * @param icon    - Bootstrap Icon class.
     * @param label   - Accessible label.
     * @param onClick - Click handler.
     * @returns The button.
     */
    function chromeButton(
        icon: string,
        label: string,
        onClick: () => void): HTMLElement
    {
        const btn = el("button", `${CLS}-btn`);
        btn.setAttribute("type", "button");
        btn.setAttribute("aria-label", label);
        btn.setAttribute("title", label);
        btn.appendChild(el("i", icon));
        btn.addEventListener("click", (e) =>
        {
            e.stopPropagation();
            onClick();
        });

        return btn;
    }

    /**
     * Renders a literate error inside a frame whose component failed to mount.
     *
     * @param body - The frame body.
     * @param node - The node that failed.
     * @param err  - The thrown error.
     */
    function renderMountError(
        body: HTMLElement,
        node: CanvasNode,
        err: unknown): void
    {
        body.replaceChildren();

        const box = el("div", `${CLS}-error`);
        box.appendChild(el("strong", `${CLS}-error-title`,
            `Could not display "${node.component}"`));
        box.appendChild(el("p", `${CLS}-error-detail`,
            err instanceof Error ? err.message : String(err)));
        box.appendChild(el("p", `${CLS}-error-remedy`,
            "Check that the component is registered and its script is loaded."));

        body.appendChild(box);
    }

    // ------------------------------------------------------------------
    // Drag: intent becomes fixed
    // ------------------------------------------------------------------

    // @agent:refactor attachDrag is 36 lines, over the 30-line guidance in
    // CODING_STYLE.md. Pre-dates this file's placement work; tracked as DEBT-7.
    /**
     * Makes a frame draggable by its title bar.
     *
     * The moment a user drags, the node is promoted from layout intent to
     * fixed coordinates and the packer flows around it from then on — the
     * canvas never overrides a position the user chose.
     */
    function attachDrag(
        frame: HTMLElement,
        handleEl: HTMLElement,
        nodeId: string): void
    {
        let startX = 0;
        let startY = 0;
        let originX = 0;
        let originY = 0;

        const onMove = (e: PointerEvent): void =>
        {
            const zoom = doc.viewport.zoom || 1;
            frame.style.left = `${originX + (e.clientX - startX) / zoom}px`;
            frame.style.top = `${originY + (e.clientY - startY) / zoom}px`;
        };

        const onUp = (e: PointerEvent): void =>
        {
            handleEl.releasePointerCapture(e.pointerId);
            handleEl.removeEventListener("pointermove", onMove);
            handleEl.removeEventListener("pointerup", onUp);
            promoteToFixed(nodeId, frame);
        };

        handleEl.addEventListener("pointerdown", (e: PointerEvent) =>
        {
            if ((e.target as HTMLElement).closest(`.${CLS}-btn`))
            {
                return;
            }

            startX = e.clientX;
            startY = e.clientY;
            originX = parseFloat(frame.style.left) || 0;
            originY = parseFloat(frame.style.top) || 0;

            handleEl.setPointerCapture(e.pointerId);
            handleEl.addEventListener("pointermove", onMove);
            handleEl.addEventListener("pointerup", onUp);
        });
    }

    /**
     * Writes a dragged frame's position back into the document as a fixed
     * placement.
     *
     * @param nodeId - Node that moved.
     * @param frame  - Its frame element.
     */
    function promoteToFixed(nodeId: string, frame: HTMLElement): void
    {
        const node = doc.nodes[nodeId];

        if (!node)
        {
            return;
        }

        emitPatch([{
            op: "updateNode",
            id: nodeId,
            changes: {
                placement: {
                    kind: "fixed",
                    x: parseFloat(frame.style.left) || 0,
                    y: parseFloat(frame.style.top) || 0,
                    w: parseFloat(frame.style.width) || 320,
                    h: parseFloat(frame.style.height) || 240,
                    z: parseInt(frame.style.zIndex, 10) || 1,
                },
            },
        }]);
    }

    // ------------------------------------------------------------------
    // Placement: a click becomes an anchor
    // ------------------------------------------------------------------
    //
    // ⚓ ClickToPlace
    // @entrypoint startPlacement — the host arms; the canvas resolves the rest.
    //
    // captureSpot and spotOffset below are inverses of each other and are kept
    // ADJACENT deliberately. Capture starts from client coordinates and must
    // divide out zoom; restore works entirely in layout pixels. Housed apart,
    // they would drift, and a drifted pair puts the pin somewhere plausible
    // rather than throwing.

    /** Arms placement so the next canvas click positions a component. */
    function startPlacement(spec: PlacementSpec = {}): void
    {
        placing = spec;
        root.classList.add(`${CLS}-placing`);
        document.addEventListener("keydown", onPlacementKey);
        logInfo("Placement armed for:", spec.component ?? "annotation");
    }

    /** Disarms placement, leaving the document untouched. */
    function cancelPlacement(): void
    {
        placing = null;
        root.classList.remove(`${CLS}-placing`);
        document.removeEventListener("keydown", onPlacementKey);
    }

    /** Escape disarms, matching every other modal gesture in the library. */
    function onPlacementKey(e: KeyboardEvent): void
    {
        if (e.key === "Escape")
        {
            cancelPlacement();
        }
    }

    /**
     * Completes an armed placement at the clicked point.
     *
     * Runs in the CAPTURE phase so the click lands as a placement rather than
     * reaching the component underneath — clicking a grid row to annotate it
     * must not also select that row.
     */
    function onCanvasClick(e: MouseEvent): void
    {
        if (!placing || destroyed)
        {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const spec = placing;
        cancelPlacement();
        placeAt(spec, e.target, frameUnder(e.target), e.clientX, e.clientY);
    }

    /**
     * Adds the armed component, anchored to whatever lies under the pointer.
     *
     * @param spec    - What to place.
     * @param clientX - Pointer x, in client coordinates.
     * @param clientY - Pointer y, in client coordinates.
     */
    function placeAt(
        spec: PlacementSpec,
        hit: EventTarget | null,
        targetId: string | null,
        clientX: number,
        clientY: number): void
    {
        const component = spec.component ?? "annotation";
        const id = `${component}-${doc.revision + 1}-${Object.keys(doc.nodes).length}`;
        const anchor = targetId
            ? nodeAnchor(targetId, hit, clientX, clientY)
            : { kind: "canvas" };

        emitPatch([{
            op: "addNode",
            node: {
                id,
                component,
                placement: placementFor(targetId, clientX, clientY),
                options: spec.options ?? {},
                source: null,
                state: {},
                anchor,
                pinned: false,
                provenance: { turnId: doc.turnId || "placement", lastTouched: turn },
            },
        }]);

        spec.onPlaced?.(id, anchor);
    }

    /**
     * The id of the framed node the click landed in, or null for bare canvas.
     *
     * Reads the event's own target rather than probing coordinates: it is the
     * element the browser already resolved, and overlays drop out of it for
     * free because their boxes are click-through. Annotating an annotation is
     * not the gesture.
     *
     * @param target - The click's target element.
     * @returns The node id, or null.
     */
    function frameUnder(target: EventTarget | null): string | null
    {
        const frame = (target as HTMLElement | null)
            ?.closest?.(`.${CLS}-frame`);

        return frame?.getAttribute("data-node-id") ?? null;
    }

    /**
     * Builds a node anchor carrying the exact spot clicked, when one can be
     * measured, and falling back to the whole node when it cannot.
     */
    function nodeAnchor(
        targetId: string,
        hit: EventTarget | null,
        clientX: number,
        clientY: number): Record<string, unknown>
    {
        const scroller = scrollerFor(targetId, hit);
        const spot = scroller
            ? captureSpot(scroller.el, clientX, clientY)
            : null;

        if (!spot)
        {
            return { kind: "node", nodeId: targetId };
        }

        // `within` names WHICH scroller the fraction is measured against. A
        // component may own its own scrolling region — a grid's rows, a
        // document's text — and a fraction of the wrong box lands nowhere near
        // what the user pointed at.
        return scroller!.index === 0
            ? { kind: "node", nodeId: targetId, spot }
            : { kind: "node", nodeId: targetId, spot, within: scroller!.index };
    }

    /**
     * The scrolling region a click landed in, and its index within the frame.
     *
     * The frame body is index 0 and is always the fallback. A component that
     * scrolls internally contributes further regions in DOM order, which is
     * stable for a given component and survives a reload.
     *
     * @param targetId - The node clicked.
     * @param hit      - The clicked element.
     * @returns The scroller and its index, or null.
     */
    function scrollerFor(
        targetId: string,
        hit: EventTarget | null): { el: HTMLElement; index: number } | null
    {
        const frame = frames.get(targetId);
        const body = bodies.get(targetId);

        if (!frame || !body)
        {
            return null;
        }

        const regions = scrollRegions(body);

        // Walk out from the click to the first region that contains it. The
        // innermost wins: a grid inside a document scrolls independently of it.
        for (let el = hit as HTMLElement | null; el && el !== frame;
            el = el.parentElement)
        {
            const index = regions.indexOf(el);

            if (index >= 0)
            {
                return { el, index };
            }
        }

        return { el: body, index: 0 };
    }

    /**
     * Every scrolling region inside a frame body, the body first, in DOM order.
     *
     * The index into this list is what an anchor records, so it has to be
     * derived the same way in both directions.
     *
     * @param body - The frame's body.
     * @returns The regions, index 0 being the body.
     */
    function scrollRegions(body: HTMLElement): HTMLElement[]
    {
        return [body, ...Array.from(body.querySelectorAll<HTMLElement>("*"))
            .filter(isScrollable)];
    }

    /** True when an element scrolls its own content. */
    function isScrollable(el: HTMLElement): boolean
    {
        if (el.scrollHeight <= el.clientHeight
            && el.scrollWidth <= el.clientWidth)
        {
            return false;
        }

        const style = getComputedStyle(el);

        return /auto|scroll/.test(style.overflowY)
            || /auto|scroll/.test(style.overflowX);
    }

    /**
     * CAPTURE. Turns a pointer position into a fraction of a scrolling
     * region's CONTENT box.
     *
     * Fractions of content, not of the visible box: the content is what the
     * user pointed at, so a mark placed halfway down a document stays halfway
     * down it after scrolling, and after the frame is resized.
     *
     * @param scroller - The region the click landed in.
     * @param clientX  - Pointer x, in client coordinates.
     * @param clientY  - Pointer y, in client coordinates.
     * @returns Fractional spot, or null when the region cannot be measured.
     */
    function captureSpot(
        scroller: HTMLElement,
        clientX: number,
        clientY: number): { x: number; y: number } | null
    {
        const metrics = scrollMetrics(scroller);

        if (!metrics)
        {
            return null;
        }

        // getBoundingClientRect is measured AFTER the world's scale(); scroll
        // offsets are not. Mixing the two without dividing out zoom puts the
        // mark progressively further off the more the canvas is zoomed.
        const box = scroller.getBoundingClientRect();
        const zoom = doc.viewport.zoom || 1;
        const cx = (clientX - box.left) / zoom + scroller.scrollLeft;
        const cy = (clientY - box.top) / zoom + scroller.scrollTop;

        return {
            x: clamp01(cx / metrics.width),
            y: clamp01(cy / metrics.height),
        };
    }

    /**
     * RESTORE. The inverse of captureSpot: turns a recorded fraction back into
     * an offset within the target's frame, in layout pixels.
     *
     * @param targetId - Node the overlay is anchored to.
     * @param spot     - The recorded fraction.
     * @param within   - Index of the scrolling region it was measured against.
     * @param regions  - The target's scrolling regions.
     * @returns Offset and whether the point is scrolled into view, or null.
     */
    function spotOffset(
        targetId: string,
        spot: { x: number; y: number },
        within: number,
        regions: readonly HTMLElement[]):
        { dx: number; dy: number; visible: boolean } | null
    {
        const frame = frames.get(targetId);
        const body = bodies.get(targetId);

        if (!frame || !body)
        {
            return null;
        }

        const scroller = regions[within] ?? body;
        const metrics = scrollMetrics(scroller);

        if (!metrics)
        {
            return null;
        }

        const cx = spot.x * metrics.width - scroller.scrollLeft;
        const cy = spot.y * metrics.height - scroller.scrollTop;
        const origin = originWithin(frame, scroller);

        return {
            dx: origin.x + cx,
            dy: origin.y + cy,
            visible: cx >= 0 && cx <= scroller.clientWidth
                && cy >= 0 && cy <= scroller.clientHeight,
        };
    }

    /**
     * A scrolling region's top-left corner relative to its frame, in layout
     * pixels.
     *
     * Measured rather than accumulated through offsetParent: both rectangles
     * carry the same zoom, so dividing it out once gives untransformed pixels
     * without caring how the component nested its own boxes.
     *
     * @param frame    - The node's frame.
     * @param scroller - A scrolling region inside it.
     * @returns The offset.
     */
    function originWithin(
        frame: HTMLElement,
        scroller: HTMLElement): { x: number; y: number }
    {
        const zoom = doc.viewport.zoom || 1;
        const frameBox = frame.getBoundingClientRect();
        const box = scroller.getBoundingClientRect();

        return {
            x: (box.left - frameBox.left) / zoom,
            y: (box.top - frameBox.top) / zoom,
        };
    }

    /**
     * A body's content dimensions, or null when it has none to speak of.
     *
     * A demoted or not-yet-laid-out body reports zero, and dividing by that
     * silently collapses every mark onto the target's top-left corner. Both
     * directions bail instead, leaving the packer's own placement in force.
     *
     * @param body - The frame body to measure.
     * @returns Content width and height, or null.
     */
    function scrollMetrics(
        body: HTMLElement): { width: number; height: number } | null
    {
        const width = Math.max(body.scrollWidth, body.clientWidth);
        const height = Math.max(body.scrollHeight, body.clientHeight);

        if (width === 0 || height === 0)
        {
            return null;
        }

        return { width, height };
    }

    /**
     * The placement for a newly placed node.
     *
     * A node-anchored overlay is positioned by its anchor, so it only needs a
     * nominal placement. One dropped on bare canvas has nothing to anchor to
     * and is pinned to the world coordinates under the pointer.
     */
    function placementFor(
        targetId: string | null,
        clientX: number,
        clientY: number): Record<string, unknown>
    {
        if (targetId)
        {
            return { kind: "intent", region: "overlay", size: "compact" };
        }

        const box = root.getBoundingClientRect();
        const zoom = doc.viewport.zoom || 1;

        // Centred on the point, not hung below and right of it — the same
        // relationship a spot-anchored mark has to the place it marks.
        return {
            kind: "fixed",
            x: (clientX - box.left - doc.viewport.x) / zoom - MARKER_BOX / 2,
            y: (clientY - box.top - doc.viewport.y) / zoom - MARKER_BOX / 2,
            w: MARKER_BOX,
            h: MARKER_BOX,
            z: 5,
        };
    }

    // ------------------------------------------------------------------
    // Overlay refinement
    // ------------------------------------------------------------------

    /**
     * Repositions every spot-anchored overlay against its target's live
     * content box.
     *
     * The packer places a spot geometrically against the target's rectangle,
     * which is all a headless layout can know. Only the DOM knows how far the
     * content is scrolled, so the canvas refines afterwards — and this pass,
     * not the packer, is what a browser test measures.
     */
    function refineOverlays(): void
    {
        const regions = new Map<string, HTMLElement[]>();

        for (const node of Object.values(doc.nodes))
        {
            refineOverlay(node, regions);
        }
    }

    /**
     * Follows a scrolling region with the marks placed on its content.
     *
     * Repositioning only — never a render, which would re-pack, re-mount and
     * re-attach wiring on every frame of a scroll.
     *
     * @param e - The scroll event, captured on its way down.
     */
    function onRegionScroll(e: Event): void
    {
        const targetId = frameUnder(e.target);

        if (targetId)
        {
            refineOverlaysOf(targetId);
        }
    }

    /**
     * Repositions the overlays anchored to one target. Used by the scroll
     * handler, which must never re-pack or re-mount.
     *
     * @param targetId - The scrolled node.
     */
    function refineOverlaysOf(targetId: string): void
    {
        // The region list is computed ONCE for the pass. Recomputing it per
        // overlay walks the target's whole subtree per mark per scroll frame,
        // which is the jank this handler exists to avoid.
        const regions = new Map<string, HTMLElement[]>();

        for (const node of Object.values(doc.nodes))
        {
            if (anchorTarget(node) === targetId)
            {
                refineOverlay(node, regions);
            }
        }
    }

    /**
     * Positions one overlay against its target's content, hiding it when the
     * content it marks has been scrolled out of view.
     *
     * @param node    - The candidate overlay node.
     * @param regions  - Per-target scrolling regions, memoised for this pass.
     */
    function refineOverlay(
        node: CanvasNode,
        regions: Map<string, HTMLElement[]>): void
    {
        const spot = spotOf(node);
        const targetId = anchorTarget(node);
        const frame = frames.get(node.id);
        const targetRect = targetId ? packedRects.get(targetId) : undefined;

        if (!spot || !targetId || !frame || !targetRect)
        {
            return;
        }

        const offset = spotOffset(
            targetId, spot, withinOf(node), regionsOf(targetId, regions));

        if (!offset)
        {
            return;
        }

        // Half the marker's own box, so the mark is centred on the point that
        // was clicked rather than hanging below and right of it.
        const half = (packedRects.get(node.id)?.w ?? MARKER_BOX) / 2;

        frame.style.left = `${targetRect.x + offset.dx - half}px`;
        frame.style.top = `${targetRect.y + offset.dy - half}px`;
        frame.classList.toggle(`${CLS}-overlay-hidden`, !offset.visible);
    }

    /** The node id an overlay is anchored to, or null. */
    function anchorTarget(node: CanvasNode): string | null
    {
        return node.anchor?.kind === "node" && node.anchor.nodeId
            ? node.anchor.nodeId
            : null;
    }

    /**
     * The scrolling regions of one target, computed once per refinement pass.
     *
     * @param targetId - The anchored node.
     * @param cache    - The pass's memo.
     * @returns The regions, or an empty list when the node has no body.
     */
    function regionsOf(
        targetId: string,
        cache: Map<string, HTMLElement[]>): HTMLElement[]
    {
        const cached = cache.get(targetId);

        if (cached)
        {
            return cached;
        }

        const body = bodies.get(targetId);
        const found = body ? scrollRegions(body) : [];

        cache.set(targetId, found);

        return found;
    }

    /** The scrolling region index a spot was measured against. */
    function withinOf(node: CanvasNode): number
    {
        const within = node.anchor?.within;

        return typeof within === "number" && within >= 0 ? within : 0;
    }

    /** The fractional spot recorded on a node anchor, or null. */
    function spotOf(node: CanvasNode): { x: number; y: number } | null
    {
        const spot = node.anchor?.spot;

        return spot && isFinite(spot.x) && isFinite(spot.y) ? spot : null;
    }

    // ------------------------------------------------------------------
    // Viewport and virtualization
    // ------------------------------------------------------------------

    /**
     * Nodes within the viewport plus a margin. Everything else is demoted by
     * lifecycle, which is what keeps a large canvas affordable.
     *
     * @param packed - Packed rectangles.
     * @returns Ids of nodes near enough to stay mounted.
     */
    function visibleNodes(
        packed: ReadonlyMap<string, PackedRect>): Set<string>
    {
        const zoom = doc.viewport.zoom || 1;
        const left = -doc.viewport.x / zoom - MOUNT_MARGIN;
        const top = -doc.viewport.y / zoom - MOUNT_MARGIN;
        const right = left + root.clientWidth / zoom + MOUNT_MARGIN * 2;
        const bottom = top + root.clientHeight / zoom + MOUNT_MARGIN * 2;
        const visible = new Set<string>();

        for (const [id, r] of packed)
        {
            if (r.x < right && r.x + r.w > left
                && r.y < bottom && r.y + r.h > top)
            {
                visible.add(id);
            }
        }

        return withOverlaysOfVisibleTargets(visible);
    }

    /**
     * Ties an overlay's mounted-ness to its target's.
     *
     * An overlay's packed rectangle is a fallback that the refinement pass
     * overrides, so testing it against the viewport answers the wrong question.
     * A mark is worth mounting exactly when the thing it marks is.
     *
     * @param visible - Ids judged visible by their rectangles.
     * @returns The corrected set.
     */
    function withOverlaysOfVisibleTargets(visible: Set<string>): Set<string>
    {
        for (const node of Object.values(doc.nodes))
        {
            const targetId = anchorTarget(node);

            if (!targetId || !doc.nodes[targetId])
            {
                continue;
            }

            if (visible.has(targetId))
            {
                visible.add(node.id);
            }
            else
            {
                visible.delete(node.id);
            }
        }

        return visible;
    }

    /** Applies pan and zoom to the world layer. */
    function applyViewport(): void
    {
        const { x, y, zoom } = doc.viewport;
        world.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
    }

    /** Renders one chip per decayed node. */
    function renderChips(): void
    {
        chipRail.replaceChildren();

        for (const id of lifecycle.getChips())
        {
            const node = doc.nodes[id];

            if (!node)
            {
                continue;
            }

            const manifest = rt().getManifest(node.component);
            const chip = el("button", `${CLS}-chip`,
                manifest?.label ?? node.component);
            chip.setAttribute("type", "button");
            chip.setAttribute("title", "Restore to the canvas");
            chip.addEventListener("click", () => emitPatch([{
                op: "updateNode",
                id,
                changes: {
                    provenance: { turnId: node.provenance.turnId, lastTouched: turn },
                },
            }]));

            chipRail.appendChild(chip);
        }
    }

    // ------------------------------------------------------------------
    // Handle
    // ------------------------------------------------------------------

    logInfo("Created in container:", host.id);

    return {
        load,
        apply,

        getDocument: () => doc,

        getSurface: (id) => lifecycle.getSurface(id),

        getMountedIds: () => Object.keys(doc.nodes)
            .filter((id) => lifecycle.isMounted(id)),

        getChipIds: () => lifecycle.getChips(),

        panBy(dx, dy)
        {
            const v = doc.viewport;
            emitPatch([{
                op: "setViewport",
                viewport: { x: v.x + dx, y: v.y + dy, zoom: v.zoom },
            }]);
        },

        setZoom(zoom)
        {
            const v = doc.viewport;
            emitPatch([{
                op: "setViewport",
                viewport: {
                    x: v.x,
                    y: v.y,
                    zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)),
                },
            }]);
        },

        getViewport: () => ({ ...doc.viewport }),

        startPlacement,
        cancelPlacement,
        isPlacing: () => placing !== null,

        clear()
        {
            emitPatch(Object.keys(doc.nodes).map(
                (id) => ({ op: "removeNode" as const, id })));
        },

        destroy()
        {
            if (destroyed)
            {
                return;
            }

            cancelPlacement();
            destroyed = true;
            root.removeEventListener("click", onCanvasClick, true);
            root.removeEventListener("scroll", onRegionScroll, true);
            wiring.detach();
            lifecycle.destroy();
            frames.clear();
            bodies.clear();
            root.remove();
            logInfo("Destroyed");
        },
    };
}

/**
 * Calls a component factory using the argument order its manifest declares.
 *
 * @param factory  - The resolved factory function.
 * @param manifest - The component's manifest.
 * @param body     - The element to mount into.
 * @param opts     - Merged options.
 * @returns The component handle.
 */
function invokeFactory(
    factory: (...args: unknown[]) => unknown,
    manifest: FactoryShape,
    body: HTMLElement,
    opts: Record<string, unknown>): unknown
{
    if (!body.id)
    {
        body.id = `${CLS}-body-${Math.abs(hashCode(String(Date.now())))}`;
    }

    const handle = construct(factory, manifest, body, opts);

    attachHandle(handle, manifest, body);

    return handle;
}

/**
 * Calls the factory with the argument order the manifest declares.
 *
 * @param factory  - The resolved factory function.
 * @param manifest - Declares factoryStyle, containerOption and containerAs.
 * @param body     - The element to mount into.
 * @param opts     - Merged options.
 * @returns The component handle.
 */
function construct(
    factory: (...args: unknown[]) => unknown,
    manifest: FactoryShape,
    body: HTMLElement,
    opts: Record<string, unknown>): unknown
{
    if (manifest.factoryStyle === "options-only")
    {
        const key = manifest.containerOption ?? "container";

        // Some options-only factories want the host ELEMENT, others its ID.
        // Guessing wrong yields a component that constructs cleanly and
        // renders nothing, so the manifest states it.
        const value = manifest.containerAs === "id" ? body.id : body;

        return factory({ ...opts, [key]: value });
    }

    if (manifest.factoryStyle === "options-first")
    {
        return factory(opts, body.id);
    }

    return factory(body.id, opts);
}

/**
 * Attaches a component that does not attach itself.
 *
 * factoryStyle describes ARGUMENT ORDER; mountMethod describes ATTACHMENT,
 * and the fleet varies independently on both.
 *
 * @param handle   - The freshly constructed handle.
 * @param manifest - Declares mountMethod.
 * @param body     - The host element.
 */
function attachHandle(
    handle: unknown,
    manifest: FactoryShape,
    body: HTMLElement): void
{
    if (!handle || typeof handle !== "object"
        || !manifest.mountMethod || manifest.mountMethod === "auto")
    {
        return;
    }

    const h = handle as Record<string, unknown>;

    if (manifest.mountMethod === "show" && typeof h.show === "function")
    {
        (h.show as (host: HTMLElement) => void).call(h, body);
        return;
    }

    if (manifest.mountMethod === "getElement"
        && typeof h.getElement === "function")
    {
        const el = (h.getElement as () => unknown).call(h);

        if (el instanceof Element)
        {
            body.appendChild(el);
        }
    }
}

/**
 * Small string hash, used only to generate unique host element ids.
 *
 * @param value - Input string.
 * @returns A 32-bit hash.
 */
function hashCode(value: string): number
{
    let hash = 0;

    for (let i = 0; i < value.length; i++)
    {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }

    return hash + Math.floor(Math.random() * 1_000_000);
}

// ============================================================================
// WINDOW REGISTRATION
// ============================================================================

(window as unknown as Record<string, unknown>)["createDynamicCanvas"] =
    createDynamicCanvas;

/** Exposed so hosts can tune virtualization without importing constants. */
(window as unknown as Record<string, unknown>)["DYNAMIC_CANVAS_ZOOM_STEP"] =
    ZOOM_STEP;
