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
 * 🔗 RELATES: [[DynamicUIRuntime]], [[Packer]], [[Lifecycle]], [[Wiring]]
 * ⚡ FLOW: [CanvasPatch] -> [fold] -> [pack] -> [lifecycle.sync] -> [DOM]
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
        options?: { width?: number }): Map<string, PackedRect>;
    getManifest(component: string): (FactoryShape & {
        label: string;
        defaultOptions: Record<string, unknown>;
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

    const root = el("div", CLS);
    const world = el("div", `${CLS}-world`);
    const chipRail = el("div", `${CLS}-chiprail`);

    root.appendChild(world);
    root.appendChild(chipRail);
    host.appendChild(root);

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

        // Pack against the real canvas width. With a fixed assumption a node
        // placed in the side region landed off-screen on a narrower canvas —
        // mounted, correct, and invisible, with nothing logged.
        const packed = rt().packDocument(doc, {
            width: root.clientWidth || undefined,
        });

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
        frame.classList.toggle(`${CLS}-frame-pinned`, node.pinned);
        refreshChrome(frame, node);
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

            destroyed = true;
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
