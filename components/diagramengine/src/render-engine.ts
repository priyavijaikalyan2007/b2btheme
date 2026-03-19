/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/*
 * ----------------------------------------------------------------------------
 * COMPONENT: RenderEngine
 * PURPOSE: SVG DOM manager for the DiagramEngine. Creates and maintains the
 *    root SVG element, viewport transforms, layer management, object
 *    rendering, selection overlay, rubber band, grid, shadow filters,
 *    and inline text editing.
 * RELATES: [[DiagramEngine]], [[ShapeRegistry]], [[EventBus]]
 * FLOW: [DiagramEngine] -> [RenderEngine] -> [SVG DOM]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for all console messages from this module. */
const LOG_PREFIX = "[DiagramEngine]";

/** CSS class prefix for all DiagramEngine elements. */
const CLS = "de";

/** Engine version string embedded in generated SVG. */
const VERSION = "1.0";

/** Default zoom level (1 = 100%). */
const DEFAULT_ZOOM = 1;

/** Minimum allowed zoom level. */
const MIN_ZOOM = 0.1;

/** Maximum allowed zoom level. */
const MAX_ZOOM = 4.0;

/** Zoom increment per step (e.g. wheel tick). */
const ZOOM_STEP = 0.15;

/** Pixel size of selection resize handles. */
const HANDLE_SIZE = 8;

/** Extra hit-test margin around resize handles for easier clicking. */
const HANDLE_HIT_MARGIN = 4;

/** Default grid spacing in pixels. */
const DEFAULT_GRID_SIZE = 20;

/** Identifier for the default document layer. */
const DEFAULT_LAYER_ID = "default";

/** Display name for the default document layer. */
const DEFAULT_LAYER_NAME = "Default";

/** SVG namespace URI. */
const SVG_NS = "http://www.w3.org/2000/svg";

/** XHTML namespace URI for foreignObject content. */
const XHTML_NS = "http://www.w3.org/1999/xhtml";

/** Dot radius for the dot grid pattern. */
const DOT_GRID_RADIUS = 1.2;

/** Opacity for grid elements. */
const GRID_OPACITY = 0.4;

/** Rotation handle vertical offset above the top-centre of the object. */
const ROTATION_HANDLE_OFFSET = 24;

/** Rotation handle circle radius. */
const ROTATION_HANDLE_RADIUS = 5;

/** Length of the rotation handle stem line. */
const ROTATION_STEM_LENGTH = 16;

/** Default padding used when zooming to fit. */
const DEFAULT_FIT_PADDING = 40;

// ============================================================================
// INLINE EDIT STATE
// ============================================================================

/** Tracks the state of an active inline text edit overlay. */
interface InlineEditState
{
    /** The diagram object being edited. */
    objectId: string;

    /** The contentEditable overlay element. */
    overlay: HTMLDivElement;

    /** Blur event handler reference for cleanup. */
    blurHandler: () => void;

    /** Keydown event handler reference for cleanup. */
    keydownHandler: (e: KeyboardEvent) => void;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Manages the SVG DOM for the DiagramEngine. Creates the root SVG,
 * viewport group, layer groups, and provides methods for rendering
 * objects, selection handles, rubber bands, grids, and inline editing.
 */
export class RenderEngine
{
    /** Root SVG element appended to the container. */
    private readonly svg: SVGSVGElement;

    /** Reusable defs element for markers, filters, and gradients. */
    private readonly defs: SVGDefsElement;

    /** Viewport group with pan/zoom transform. */
    private readonly viewport: SVGGElement;

    /** Grid layer inside the viewport. */
    private readonly gridLayer: SVGGElement;

    /** Page frames layer inside the viewport (above grid, below objects). */
    private readonly pageFramesLayer: SVGGElement;

    /** Connectors layer inside the viewport. */
    private readonly connectorsLayer: SVGGElement;

    /** Selection overlay layer inside the viewport. */
    private readonly overlayLayer: SVGGElement;

    /** Tool overlay layer (rubber band etc.) inside the viewport. */
    private readonly toolOverlayLayer: SVGGElement;

    /** Map of layer IDs to their SVG group elements. */
    private readonly layerEls: Map<string, SVGGElement> = new Map();

    /** Container element that holds the SVG. */
    private readonly container: HTMLElement;

    /** Current viewport state. */
    private vp: ViewportState = { x: 0, y: 0, zoom: DEFAULT_ZOOM };

    /** Active inline text edit, or null if not editing. */
    private inlineEdit: InlineEditState | null = null;

    // ========================================================================
    // CONSTRUCTOR
    // ========================================================================

    /**
     * Create a new RenderEngine and build the SVG DOM structure.
     *
     * @param container - The HTML element to append the SVG canvas into.
     */
    constructor(container: HTMLElement)
    {
        this.container = container;

        this.svg = this.createRootSvg();
        this.defs = svgCreate("defs") as SVGDefsElement;
        this.svg.appendChild(this.defs);

        this.viewport = this.createViewportGroup();
        this.svg.appendChild(this.viewport);

        this.gridLayer = this.createNamedGroup("grid");
        this.viewport.appendChild(this.gridLayer);

        this.pageFramesLayer = this.createNamedGroup("page-frames");
        this.viewport.appendChild(this.pageFramesLayer);

        this.connectorsLayer = this.createNamedGroup("connectors");
        this.overlayLayer = this.createNamedGroup("overlay");
        this.toolOverlayLayer = this.createNamedGroup("tool-overlay");

        this.viewport.appendChild(this.connectorsLayer);
        this.viewport.appendChild(this.overlayLayer);
        this.viewport.appendChild(this.toolOverlayLayer);

        container.appendChild(this.svg);

        console.log(`${LOG_PREFIX} RenderEngine initialised`);
    }

    // ========================================================================
    // LAYER MANAGEMENT
    // ========================================================================

    /**
     * Ensure a layer group element exists. Creates one if absent and
     * inserts it in the correct stacking order within the viewport.
     *
     * @param layerId - Unique identifier for the layer.
     * @param order - Stacking order (lower values render first).
     * @returns The SVG group element for the layer.
     */
    public ensureLayerEl(layerId: string, order: number): SVGElement
    {
        const existing = this.layerEls.get(layerId);

        if (existing)
        {
            return existing;
        }

        const g = this.createLayerGroup(layerId, order);

        this.insertLayerInOrder(g, order);
        this.layerEls.set(layerId, g);

        console.debug(`${LOG_PREFIX} Layer created: ${layerId} (order ${order})`);

        return g;
    }

    /**
     * Remove a layer group element from the viewport.
     *
     * @param layerId - Identifier of the layer to remove.
     */
    public removeLayerEl(layerId: string): void
    {
        const g = this.layerEls.get(layerId);

        if (!g)
        {
            console.warn(`${LOG_PREFIX} Layer not found for removal: ${layerId}`);
            return;
        }

        g.remove();
        this.layerEls.delete(layerId);
    }

    // ========================================================================
    // VIEWPORT TRANSFORMS
    // ========================================================================

    /**
     * Return the current viewport state (pan offset and zoom level).
     *
     * @returns A copy of the current viewport state.
     */
    public getViewport(): ViewportState
    {
        return { ...this.vp };
    }

    /**
     * Set the viewport state and apply the transform to the viewport group.
     *
     * @param vp - The new viewport state.
     */
    public setViewport(vp: ViewportState): void
    {
        this.vp = {
            x: vp.x,
            y: vp.y,
            zoom: this.clampZoom(vp.zoom)
        };

        this.applyViewportTransform();
    }

    /**
     * Pan the viewport by the given delta in screen pixels.
     *
     * @param dx - Horizontal pan delta.
     * @param dy - Vertical pan delta.
     */
    public pan(dx: number, dy: number): void
    {
        this.vp.x += dx;
        this.vp.y += dy;

        this.applyViewportTransform();
    }

    /**
     * Zoom around a focal point in screen coordinates. The focal point
     * stays fixed on screen while the canvas scales around it.
     *
     * @param factor - Zoom multiplier (e.g. 1.15 to zoom in 15%).
     * @param focalX - Focal point X in screen coordinates.
     * @param focalY - Focal point Y in screen coordinates.
     */
    public zoomAt(factor: number, focalX: number, focalY: number): void
    {
        const oldZoom = this.vp.zoom;
        const newZoom = this.clampZoom(oldZoom * factor);

        if (newZoom === oldZoom)
        {
            return;
        }

        const ratio = newZoom / oldZoom;

        this.vp.x = focalX - ((focalX - this.vp.x) * ratio);
        this.vp.y = focalY - ((focalY - this.vp.y) * ratio);
        this.vp.zoom = newZoom;

        this.applyViewportTransform();
    }

    /**
     * Zoom and pan to fit all given objects within the viewport with
     * optional padding.
     *
     * @param objects - Objects to include in the fit calculation.
     * @param padding - Pixel padding around the bounding box.
     */
    public zoomToFit(objects: DiagramObject[], padding?: number): void
    {
        if (objects.length === 0)
        {
            return;
        }

        const pad = padding ?? DEFAULT_FIT_PADDING;
        const bbox = this.computeBoundingBox(objects);
        const svgRect = this.svg.getBoundingClientRect();

        this.applyFitTransform(bbox, svgRect, pad);
    }

    // ========================================================================
    // COORDINATE CONVERSION
    // ========================================================================

    /**
     * Convert screen coordinates to canvas coordinates using the
     * current viewport transform.
     *
     * @param sx - Screen X coordinate.
     * @param sy - Screen Y coordinate.
     * @returns The corresponding point in canvas space.
     */
    public screenToCanvas(sx: number, sy: number): Point
    {
        const rect = this.svg.getBoundingClientRect();

        return {
            x: ((sx - rect.left) - this.vp.x) / this.vp.zoom,
            y: ((sy - rect.top) - this.vp.y) / this.vp.zoom
        };
    }

    /**
     * Convert canvas coordinates to screen coordinates using the
     * current viewport transform.
     *
     * @param cx - Canvas X coordinate.
     * @param cy - Canvas Y coordinate.
     * @returns The corresponding point in screen space.
     */
    public canvasToScreen(cx: number, cy: number): Point
    {
        const rect = this.svg.getBoundingClientRect();

        return {
            x: (cx * this.vp.zoom) + this.vp.x + rect.left,
            y: (cy * this.vp.zoom) + this.vp.y + rect.top
        };
    }

    // ========================================================================
    // OBJECT RENDERING
    // ========================================================================

    /**
     * Render a diagram object into its layer. Removes any existing
     * element for the same object ID first, then creates a new SVG
     * group with the shape, text, and applied styles.
     *
     * @param obj - The diagram object to render.
     * @param shapeDef - The shape definition from the registry.
     */
    public renderObject(obj: DiagramObject, shapeDef: ShapeDefinition): void
    {
        this.removeObjectEl(obj.id);

        const pres = obj.presentation;
        const g = svgCreate("g") as SVGGElement;

        svgSetAttr(g, { "data-id": obj.id });

        this.applyObjectTransform(g, pres);
        this.applyObjectOpacity(g, pres.style.opacity);

        if (pres.style.shadow?.enabled)
        {
            this.applyShadowFilter(g, obj.id, pres.style.shadow);
        }

        const shapeEl = this.renderShapeContent(obj, shapeDef);

        g.appendChild(shapeEl);

        if (pres.textContent)
        {
            const textEl = this.createForeignObject(pres);

            g.appendChild(textEl);
        }

        const layerEl = this.findLayerEl(pres.layer);

        layerEl.appendChild(g);
    }

    /**
     * Remove the SVG element and any associated shadow filter for
     * the given object ID.
     *
     * @param id - The object ID whose element should be removed.
     */
    public removeObjectEl(id: string): void
    {
        const existing = this.svg.querySelector(`[data-id="${id}"]`);

        if (existing)
        {
            existing.remove();
        }

        this.removeShadowFilter(id);
    }

    // ========================================================================
    // SELECTION OVERLAY
    // ========================================================================

    /**
     * Render selection handles (resize + rotation) for the given
     * selected objects. Clears any previous overlay first.
     *
     * @param objects - The currently selected diagram objects.
     */
    public renderSelectionHandles(objects: DiagramObject[]): void
    {
        this.clearOverlay();

        for (const obj of objects)
        {
            this.renderSingleSelection(obj);
        }
    }

    /**
     * Clear all elements from the selection overlay layer.
     */
    public clearOverlay(): void
    {
        while (this.overlayLayer.firstChild)
        {
            this.overlayLayer.removeChild(this.overlayLayer.firstChild);
        }
    }

    // ========================================================================
    // RUBBER BAND
    // ========================================================================

    /**
     * Render a rubber band selection rectangle on the tool overlay.
     *
     * @param rect - The bounding rectangle for the rubber band.
     */
    public renderRubberBand(rect: Rect): void
    {
        this.clearToolOverlay();

        const rubberBand = svgCreate("rect", {
            x: String(rect.x),
            y: String(rect.y),
            width: String(rect.width),
            height: String(rect.height),
            fill: "rgba(0, 120, 215, 0.1)",
            stroke: "rgba(0, 120, 215, 0.6)",
            "stroke-width": "1",
            "stroke-dasharray": "4 2",
            "pointer-events": "none"
        });

        this.toolOverlayLayer.appendChild(rubberBand);
    }

    /**
     * Clear all elements from the tool overlay layer.
     */
    public clearToolOverlay(): void
    {
        while (this.toolOverlayLayer.firstChild)
        {
            this.toolOverlayLayer.removeChild(this.toolOverlayLayer.firstChild);
        }
    }

    // ========================================================================
    // GRID RENDERING
    // ========================================================================

    /**
     * Render the background grid using SVG patterns. Supports dot
     * and line grid styles. Removes any existing grid first.
     *
     * @param config - Grid configuration with size, style, and visibility.
     */
    public renderGrid(config: { size: number; style: string; visible: boolean }): void
    {
        this.clearGridLayer();

        if (!config.visible || config.style === "none")
        {
            return;
        }

        this.removeExistingGridPattern();

        if (config.style === "dots")
        {
            this.createDotGridPattern(config.size);
        }
        else
        {
            this.createLineGridPattern(config.size);
        }

        this.applyGridPatternToLayer(config.size);
    }

    // ========================================================================
    // SHADOW FILTER MANAGEMENT
    // ========================================================================

    /**
     * Apply a drop shadow SVG filter to an element. Creates or updates
     * the filter in the defs element using a deterministic ID.
     *
     * @param g - The SVG element to apply the shadow filter to.
     * @param objId - Object ID used to generate a deterministic filter ID.
     * @param shadow - Shadow style configuration. Omit to remove.
     */
    public applyShadowFilter(
        g: SVGElement,
        objId: string,
        shadow?: ShadowStyle): void
    {
        const filterId = `de-shadow-${objId}`;

        if (!shadow || !shadow.enabled)
        {
            this.removeShadowFilter(objId);
            g.removeAttribute("filter");
            return;
        }

        this.upsertShadowFilterDef(filterId, shadow);
        g.setAttribute("filter", `url(#${filterId})`);
    }

    // ========================================================================
    // INLINE TEXT EDITING
    // ========================================================================

    /**
     * Start inline text editing by creating a contentEditable overlay
     * positioned at the object's screen coordinates.
     *
     * @param obj - The diagram object to edit inline.
     */
    public startInlineEdit(obj: DiagramObject): void
    {
        if (this.inlineEdit)
        {
            this.endInlineEdit();
        }

        const bounds = obj.presentation.bounds;
        const screenTopLeft = this.canvasToScreen(bounds.x, bounds.y);
        const scaledW = bounds.width * this.vp.zoom;
        const scaledH = bounds.height * this.vp.zoom;

        const overlay = this.createEditOverlay(screenTopLeft, scaledW, scaledH);

        overlay.textContent = this.extractPlainText(obj);

        const handlers = this.attachEditHandlers(overlay, obj.id);

        this.inlineEdit = {
            objectId: obj.id,
            overlay: overlay,
            blurHandler: handlers.blur,
            keydownHandler: handlers.keydown
        };

        this.container.appendChild(overlay);
        overlay.focus();

        console.debug(`${LOG_PREFIX} Inline edit started for: ${obj.id}`);
    }

    /**
     * End the current inline text edit, remove the overlay, and
     * return the edited text content.
     *
     * @returns The edited text string, or null if no edit was active.
     */
    public endInlineEdit(): string | null
    {
        if (!this.inlineEdit)
        {
            return null;
        }

        const text = this.inlineEdit.overlay.textContent ?? "";

        this.detachEditHandlers(this.inlineEdit);
        this.inlineEdit.overlay.remove();
        this.inlineEdit = null;

        console.debug(`${LOG_PREFIX} Inline edit ended`);

        return text;
    }

    // ========================================================================
    // PAGE FRAMES
    // ========================================================================

    /**
     * Renders a single page frame into the page frames layer.
     * Removes any existing element for the same frame ID first.
     *
     * @param frame - The page frame to render.
     */
    public renderPageFrame(frame: PageFrame): void
    {
        this.removePageFrameEl(frame.id);

        const el = renderPageFrame(frame, this.defs);

        this.pageFramesLayer.appendChild(el);
    }

    /**
     * Removes a page frame's SVG element from the page frames layer.
     *
     * @param id - Page frame ID to remove.
     */
    public removePageFrameEl(id: string): void
    {
        const existing = this.pageFramesLayer.querySelector(
            `[data-page-frame-id="${id}"]`
        );

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Renders all page frames, clearing any existing ones first.
     *
     * @param frames - Array of page frames to render.
     */
    public renderAllPageFrames(frames: PageFrame[]): void
    {
        this.clearPageFramesLayer();

        for (const frame of frames)
        {
            const el = renderPageFrame(frame, this.defs);

            this.pageFramesLayer.appendChild(el);
        }

        console.debug(
            `${LOG_PREFIX} Rendered ${frames.length} page frame(s)`
        );
    }

    /**
     * Returns the page frames SVG layer group.
     *
     * @returns The page frames layer element.
     */
    public getPageFramesLayer(): SVGGElement
    {
        return this.pageFramesLayer;
    }

    /**
     * Clears all elements from the page frames layer.
     */
    private clearPageFramesLayer(): void
    {
        while (this.pageFramesLayer.firstChild)
        {
            this.pageFramesLayer.removeChild(
                this.pageFramesLayer.firstChild
            );
        }
    }

    // ========================================================================
    // ACCESSORS
    // ========================================================================

    /**
     * Return the root SVG element.
     *
     * @returns The root SVG element managed by this engine.
     */
    public getSvgElement(): SVGElement
    {
        return this.svg;
    }

    /**
     * Return the tool overlay SVG group element for direct access
     * by the guide rendering system.
     *
     * @returns The tool overlay SVG group element.
     */
    public getToolOverlayElement(): SVGGElement
    {
        return this.toolOverlayLayer;
    }

    /**
     * Renders a connector between objects. Removes any existing element
     * for the same connector, then creates a new SVG group via the
     * connector rendering system and appends it to the connectors layer.
     *
     * @param conn - The connector to render.
     * @param objects - All objects for endpoint resolution.
     */
    public renderConnector(
        conn: DiagramConnector,
        objects: DiagramObject[]
    ): void
    {
        this.removeConnectorEl(conn.id);

        const connEl = renderConnectorToSvg(conn, objects, this.defs);

        this.connectorsLayer.appendChild(connEl);
    }

    /**
     * Removes a connector's SVG element from the connectors layer.
     * Finds the element by its data-connector-id attribute.
     *
     * @param id - Connector ID to remove.
     */
    public removeConnectorEl(id: string): void
    {
        const existing = this.connectorsLayer.querySelector(
            `[data-connector-id="${id}"]`
        );

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Tear down the render engine, removing the SVG from the DOM
     * and cleaning up any active inline edit.
     */
    public destroy(): void
    {
        if (this.inlineEdit)
        {
            this.endInlineEdit();
        }

        this.svg.remove();

        console.log(`${LOG_PREFIX} RenderEngine destroyed`);
    }

    // ========================================================================
    // PRIVATE — SVG CONSTRUCTION
    // ========================================================================

    /**
     * Create the root SVG element with standard attributes.
     *
     * @returns A configured SVGSVGElement.
     */
    private createRootSvg(): SVGSVGElement
    {
        const svg = document.createElementNS(SVG_NS, "svg") as SVGSVGElement;

        svg.setAttribute("class", `${CLS}-canvas`);
        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("tabindex", "0");
        svg.setAttribute("role", "application");
        svg.setAttribute("data-version", VERSION);

        return svg;
    }

    /**
     * Create the viewport group element.
     *
     * @returns An SVG group element representing the viewport.
     */
    private createViewportGroup(): SVGGElement
    {
        const g = svgCreate("g", {
            class: `${CLS}-viewport`
        }) as SVGGElement;

        return g;
    }

    /**
     * Create a named group element for a structural layer.
     *
     * @param name - The layer name suffix (e.g. "grid", "overlay").
     * @returns An SVG group element.
     */
    private createNamedGroup(name: string): SVGGElement
    {
        return svgCreate("g", {
            class: `${CLS}-${name}`
        }) as SVGGElement;
    }

    /**
     * Create a layer group element with data attributes.
     *
     * @param layerId - Unique layer identifier.
     * @param order - Stacking order value.
     * @returns An SVG group element for the layer.
     */
    private createLayerGroup(layerId: string, order: number): SVGGElement
    {
        return svgCreate("g", {
            class: `${CLS}-layer`,
            "data-layer-id": layerId,
            "data-layer-order": String(order)
        }) as SVGGElement;
    }

    // ========================================================================
    // PRIVATE — LAYER INSERTION
    // ========================================================================

    /**
     * Insert a layer group into the viewport in the correct stacking
     * order, between the grid layer and the connectors layer.
     *
     * @param g - The layer group to insert.
     * @param order - The stacking order of the new layer.
     */
    private insertLayerInOrder(g: SVGGElement, order: number): void
    {
        let insertBefore: Node | null = this.connectorsLayer;

        for (const [, existing] of this.layerEls)
        {
            const existingOrder = Number(
                existing.getAttribute("data-layer-order") ?? "0"
            );

            if (existingOrder > order)
            {
                insertBefore = existing;
                break;
            }
        }

        this.viewport.insertBefore(g, insertBefore);
    }

    /**
     * Find the layer group element for the given layer ID. Falls back
     * to creating a default layer if the requested one does not exist.
     *
     * @param layerId - The layer ID to look up.
     * @returns The SVG group element for the layer.
     */
    private findLayerEl(layerId: string): SVGGElement
    {
        const el = this.layerEls.get(layerId);

        if (el)
        {
            return el;
        }

        return this.ensureLayerEl(
            DEFAULT_LAYER_ID,
            0
        ) as SVGGElement;
    }

    // ========================================================================
    // PRIVATE — VIEWPORT HELPERS
    // ========================================================================

    /**
     * Apply the current viewport state as an SVG transform on the
     * viewport group.
     */
    private applyViewportTransform(): void
    {
        const tx = `translate(${this.vp.x}, ${this.vp.y}) scale(${this.vp.zoom})`;

        this.viewport.setAttribute("transform", tx);
    }

    /**
     * Clamp a zoom value to the allowed range.
     *
     * @param zoom - The raw zoom value.
     * @returns The clamped zoom value.
     */
    private clampZoom(zoom: number): number
    {
        return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
    }

    /**
     * Compute the bounding box that encloses all given objects.
     *
     * @param objects - The objects to compute the bounding box for.
     * @returns A rectangle enclosing all objects.
     */
    private computeBoundingBox(objects: DiagramObject[]): Rect
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const obj of objects)
        {
            const b = obj.presentation.bounds;

            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.x + b.width);
            maxY = Math.max(maxY, b.y + b.height);
        }

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    /**
     * Apply a fit transform so the given bounding box fills the
     * available SVG area with padding.
     *
     * @param bbox - The bounding box to fit.
     * @param svgRect - The SVG element's client rectangle.
     * @param padding - Pixel padding around the content.
     */
    private applyFitTransform(
        bbox: Rect,
        svgRect: DOMRect,
        padding: number): void
    {
        const availW = svgRect.width - (padding * 2);
        const availH = svgRect.height - (padding * 2);

        if (availW <= 0 || availH <= 0)
        {
            return;
        }

        const scaleX = availW / bbox.width;
        const scaleY = availH / bbox.height;
        const zoom = this.clampZoom(Math.min(scaleX, scaleY));

        this.vp.zoom = zoom;
        this.vp.x = padding - (bbox.x * zoom) + ((availW - (bbox.width * zoom)) / 2);
        this.vp.y = padding - (bbox.y * zoom) + ((availH - (bbox.height * zoom)) / 2);

        this.applyViewportTransform();
    }

    // ========================================================================
    // PRIVATE — OBJECT RENDERING HELPERS
    // ========================================================================

    /**
     * Apply translation, rotation, and flip transforms to an object group.
     *
     * @param g - The SVG group element.
     * @param pres - The object's presentation data.
     */
    private applyObjectTransform(
        g: SVGGElement,
        pres: DiagramObject["presentation"]): void
    {
        const parts: string[] = [];
        const b = pres.bounds;

        parts.push(`translate(${b.x}, ${b.y})`);

        if (pres.rotation !== 0)
        {
            const cx = b.width / 2;
            const cy = b.height / 2;

            parts.push(`rotate(${pres.rotation}, ${cx}, ${cy})`);
        }

        this.appendFlipTransforms(parts, pres, b);

        g.setAttribute("transform", parts.join(" "));
    }

    /**
     * Append flip transforms if the object is mirrored.
     *
     * @param parts - The transform string parts array.
     * @param pres - The object's presentation data.
     * @param b - The object's bounding rectangle.
     */
    private appendFlipTransforms(
        parts: string[],
        pres: DiagramObject["presentation"],
        b: Rect): void
    {
        if (pres.flipX)
        {
            parts.push(`translate(${b.width}, 0) scale(-1, 1)`);
        }

        if (pres.flipY)
        {
            parts.push(`translate(0, ${b.height}) scale(1, -1)`);
        }
    }

    /**
     * Apply opacity to an object group if it is less than 1.
     *
     * @param g - The SVG group element.
     * @param opacity - The opacity value (0 to 1).
     */
    private applyObjectOpacity(g: SVGGElement, opacity?: number): void
    {
        if (opacity !== undefined && opacity < 1)
        {
            g.setAttribute("opacity", String(opacity));
        }
    }

    /**
     * Render the shape SVG content using the shape definition.
     *
     * @param obj - The diagram object.
     * @param shapeDef - The shape definition with the render function.
     * @returns The rendered SVG element.
     */
    private renderShapeContent(
        obj: DiagramObject,
        shapeDef: ShapeDefinition): SVGElement
    {
        const pres = obj.presentation;
        const b = pres.bounds;

        const ctx: ShapeRenderContext = {
            bounds: { x: 0, y: 0, width: b.width, height: b.height },
            style: pres.style,
            parameters: pres.parameters ?? {},
            renderStyle: pres.renderStyle ?? "clean",
            selected: false
        };

        return shapeDef.render(ctx);
    }

    // ========================================================================
    // PRIVATE — TEXT RENDERING (foreignObject)
    // ========================================================================

    /**
     * Create a foreignObject element for rich text rendering within
     * an object's bounds.
     *
     * @param pres - The object's presentation data.
     * @returns An SVG foreignObject element with styled HTML content.
     */
    private createForeignObject(pres: DiagramObject["presentation"]): SVGElement
    {
        const tc = pres.textContent!;
        const region = this.computeTextRegion(pres.bounds, tc.padding);

        const fo = svgCreate("foreignObject", {
            x: String(region.x),
            y: String(region.y),
            width: String(region.width),
            height: String(region.height)
        });

        const div = this.createTextContainer(tc);

        this.populateTextRuns(div, tc);

        fo.appendChild(div);

        return fo;
    }

    /**
     * Compute the text region within an object's bounds, accounting
     * for padding.
     *
     * @param bounds - The object's bounding rectangle.
     * @param padding - Inner padding in pixels.
     * @returns The usable text region rectangle.
     */
    private computeTextRegion(bounds: Rect, padding: number): Rect
    {
        return {
            x: padding,
            y: padding,
            width: Math.max(0, bounds.width - (padding * 2)),
            height: Math.max(0, bounds.height - (padding * 2))
        };
    }

    /**
     * Create the HTML container div for text content with flexbox
     * alignment and overflow handling.
     *
     * @param tc - The text content configuration.
     * @returns An HTML div element styled for text layout.
     */
    private createTextContainer(tc: TextContent): HTMLDivElement
    {
        const div = document.createElementNS(XHTML_NS, "div") as HTMLDivElement;

        div.setAttribute("xmlns", XHTML_NS);

        const styles = this.buildTextContainerStyles(tc);

        div.setAttribute("style", styles);

        return div;
    }

    /**
     * Build the inline CSS style string for a text container div.
     *
     * @param tc - The text content configuration.
     * @returns A CSS style string.
     */
    private buildTextContainerStyles(tc: TextContent): string
    {
        const parts: string[] = [
            "display: flex",
            "flex-direction: column",
            "width: 100%",
            "height: 100%",
            "box-sizing: border-box",
            "overflow: hidden",
            "word-wrap: break-word"
        ];

        parts.push(this.verticalAlignToStyle(tc.verticalAlign));
        parts.push(this.horizontalAlignToStyle(tc.horizontalAlign));

        if (tc.overflow === "ellipsis")
        {
            parts.push("text-overflow: ellipsis");
            parts.push("white-space: nowrap");
        }

        return parts.join("; ");
    }

    /**
     * Convert vertical alignment to a CSS flexbox justify-content value.
     *
     * @param align - The vertical alignment setting.
     * @returns A CSS style declaration string.
     */
    private verticalAlignToStyle(align: string): string
    {
        const map: Record<string, string> = {
            top: "flex-start",
            middle: "center",
            bottom: "flex-end"
        };

        return `justify-content: ${map[align] ?? "flex-start"}`;
    }

    /**
     * Convert horizontal alignment to a CSS text-align value.
     *
     * @param align - The horizontal alignment setting.
     * @returns A CSS style declaration string.
     */
    private horizontalAlignToStyle(align: string): string
    {
        return `text-align: ${align}`;
    }

    /**
     * Populate the text container div with styled spans for text runs
     * and icon elements for icon runs.
     *
     * @param div - The HTML container div.
     * @param tc - The text content configuration.
     */
    private populateTextRuns(div: HTMLDivElement, tc: TextContent): void
    {
        const runs = tc.runs ?? [];

        for (const run of runs)
        {
            if ("icon" in run)
            {
                div.appendChild(this.createIconElement(run as IconRun));
            }
            else
            {
                div.appendChild(this.createTextSpan(run as TextRun));
            }
        }
    }

    /**
     * Create a styled span element for a text run.
     *
     * @param run - The text run definition.
     * @returns An HTML span element with inline styles.
     */
    private createTextSpan(run: TextRun): HTMLSpanElement
    {
        const span = document.createElementNS(XHTML_NS, "span") as HTMLSpanElement;

        span.textContent = run.text;

        const style = this.buildTextRunStyle(run);

        if (style)
        {
            span.setAttribute("style", style);
        }

        return span;
    }

    /**
     * Build the inline CSS style string for a text run.
     *
     * @param run - The text run definition.
     * @returns A CSS style string, or empty string if no styles needed.
     */
    private buildTextRunStyle(run: TextRun): string
    {
        const parts: string[] = [];

        if (run.bold)
        {
            parts.push("font-weight: bold");
        }

        if (run.italic)
        {
            parts.push("font-style: italic");
        }

        if (run.underline)
        {
            parts.push("text-decoration: underline");
        }

        if (run.strikethrough)
        {
            parts.push("text-decoration: line-through");
        }

        this.appendOptionalRunStyles(parts, run);

        return parts.join("; ");
    }

    /**
     * Append optional style properties (font, colour, size, etc.)
     * from a text run to the style parts array.
     *
     * @param parts - The CSS style parts array.
     * @param run - The text run definition.
     */
    private appendOptionalRunStyles(parts: string[], run: TextRun): void
    {
        if (run.fontFamily)
        {
            parts.push(`font-family: ${run.fontFamily}`);
        }

        if (run.fontSize)
        {
            parts.push(`font-size: ${run.fontSize}px`);
        }

        if (run.color)
        {
            parts.push(`color: ${run.color}`);
        }

        if (run.backgroundColor)
        {
            parts.push(`background-color: ${run.backgroundColor}`);
        }

        this.appendScriptAndSpacingStyles(parts, run);
    }

    /**
     * Append superscript, subscript, line-height, and letter-spacing
     * styles from a text run.
     *
     * @param parts - The CSS style parts array.
     * @param run - The text run definition.
     */
    private appendScriptAndSpacingStyles(parts: string[], run: TextRun): void
    {
        if (run.superscript)
        {
            parts.push("vertical-align: super");
            parts.push("font-size: 0.75em");
        }

        if (run.subscript)
        {
            parts.push("vertical-align: sub");
            parts.push("font-size: 0.75em");
        }

        if (run.lineHeight)
        {
            parts.push(`line-height: ${run.lineHeight}`);
        }

        if (run.letterSpacing)
        {
            parts.push(`letter-spacing: ${run.letterSpacing}px`);
        }
    }

    /**
     * Create an icon element for an icon run.
     *
     * @param run - The icon run definition.
     * @returns An HTML <i> element with the icon class.
     */
    private createIconElement(run: IconRun): HTMLElement
    {
        const i = document.createElementNS(XHTML_NS, "i") as HTMLElement;

        i.setAttribute("class", run.icon);

        const parts: string[] = [];

        if (run.fontSize)
        {
            parts.push(`font-size: ${run.fontSize}px`);
        }

        if (run.color)
        {
            parts.push(`color: ${run.color}`);
        }

        if (parts.length > 0)
        {
            i.setAttribute("style", parts.join("; "));
        }

        return i;
    }

    // ========================================================================
    // PRIVATE — SELECTION HANDLES
    // ========================================================================

    /**
     * Render selection visuals for a single object: dashed outline,
     * 8 resize handles, and a rotation handle.
     *
     * @param obj - The selected diagram object.
     */
    private renderSingleSelection(obj: DiagramObject): void
    {
        const b = obj.presentation.bounds;
        const g = svgCreate("g", { "data-selection-id": obj.id }) as SVGGElement;

        g.setAttribute("transform", `translate(${b.x}, ${b.y})`);

        g.appendChild(this.createSelectionOutline(b));

        this.appendResizeHandles(g, b);
        this.appendRotationHandle(g, b);

        this.overlayLayer.appendChild(g);
    }

    /**
     * Create the dashed rectangle outline for a selected object.
     *
     * @param bounds - The object's bounding rectangle.
     * @returns An SVG rect element with dashed stroke.
     */
    private createSelectionOutline(bounds: Rect): SVGElement
    {
        return svgCreate("rect", {
            x: "0",
            y: "0",
            width: String(bounds.width),
            height: String(bounds.height),
            fill: "none",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            "stroke-dasharray": "4 2",
            "pointer-events": "none"
        });
    }

    /**
     * Append the 8 bounding-box resize handles to a selection group.
     *
     * @param g - The selection group element.
     * @param bounds - The object's bounding rectangle.
     */
    private appendResizeHandles(g: SVGGElement, bounds: Rect): void
    {
        const positions = this.computeHandlePositions(bounds);

        for (const pos of positions)
        {
            g.appendChild(this.createResizeHandle(pos.x, pos.y, pos.cursor));
        }
    }

    /**
     * Compute the 8 resize handle positions for a bounding rectangle.
     *
     * @param b - The bounding rectangle.
     * @returns An array of handle position objects.
     */
    private computeHandlePositions(
        b: Rect): Array<{ x: number; y: number; cursor: string }>
    {
        const w = b.width;
        const h = b.height;
        const mid = HANDLE_SIZE / 2;

        return [
            { x: -mid, y: -mid, cursor: "nw-resize" },
            { x: (w / 2) - mid, y: -mid, cursor: "n-resize" },
            { x: w - mid, y: -mid, cursor: "ne-resize" },
            { x: w - mid, y: (h / 2) - mid, cursor: "e-resize" },
            { x: w - mid, y: h - mid, cursor: "se-resize" },
            { x: (w / 2) - mid, y: h - mid, cursor: "s-resize" },
            { x: -mid, y: h - mid, cursor: "sw-resize" },
            { x: -mid, y: (h / 2) - mid, cursor: "w-resize" }
        ];
    }

    /**
     * Create a single resize handle (filled square).
     *
     * @param x - X position of the handle.
     * @param y - Y position of the handle.
     * @param cursor - CSS cursor style for the handle.
     * @returns An SVG rect element for the handle.
     */
    private createResizeHandle(x: number, y: number, cursor: string): SVGElement
    {
        return svgCreate("rect", {
            x: String(x),
            y: String(y),
            width: String(HANDLE_SIZE),
            height: String(HANDLE_SIZE),
            fill: "#ffffff",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            cursor: cursor
        });
    }

    /**
     * Append the rotation handle (circle and stem line) above the
     * top-centre of the object.
     *
     * @param g - The selection group element.
     * @param bounds - The object's bounding rectangle.
     */
    private appendRotationHandle(g: SVGGElement, bounds: Rect): void
    {
        const cx = bounds.width / 2;
        const stemTop = -ROTATION_HANDLE_OFFSET;
        const stemBottom = 0;

        const stem = svgCreate("line", {
            x1: String(cx),
            y1: String(stemBottom),
            x2: String(cx),
            y2: String(stemTop + ROTATION_HANDLE_RADIUS),
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1"
        });

        const circle = svgCreate("circle", {
            cx: String(cx),
            cy: String(stemTop),
            r: String(ROTATION_HANDLE_RADIUS),
            fill: "#ffffff",
            stroke: "var(--bs-primary, #0d6efd)",
            "stroke-width": "1",
            cursor: "grab"
        });

        g.appendChild(stem);
        g.appendChild(circle);
    }

    // ========================================================================
    // PRIVATE — GRID HELPERS
    // ========================================================================

    /**
     * Clear all child elements from the grid layer.
     */
    private clearGridLayer(): void
    {
        while (this.gridLayer.firstChild)
        {
            this.gridLayer.removeChild(this.gridLayer.firstChild);
        }
    }

    /**
     * Remove an existing grid pattern from the defs element.
     */
    private removeExistingGridPattern(): void
    {
        const existing = this.defs.querySelector("#de-grid-pattern");

        if (existing)
        {
            existing.remove();
        }
    }

    /**
     * Create a dot grid SVG pattern and add it to the defs element.
     *
     * @param size - Grid cell size in pixels.
     */
    private createDotGridPattern(size: number): void
    {
        const pattern = svgCreate("pattern", {
            id: "de-grid-pattern",
            width: String(size),
            height: String(size),
            patternUnits: "userSpaceOnUse"
        });

        const dot = svgCreate("circle", {
            cx: String(size / 2),
            cy: String(size / 2),
            r: String(DOT_GRID_RADIUS),
            fill: "currentColor",
            opacity: String(GRID_OPACITY)
        });

        pattern.appendChild(dot);
        this.defs.appendChild(pattern);
    }

    /**
     * Create a line grid SVG pattern and add it to the defs element.
     *
     * @param size - Grid cell size in pixels.
     */
    private createLineGridPattern(size: number): void
    {
        const pattern = svgCreate("pattern", {
            id: "de-grid-pattern",
            width: String(size),
            height: String(size),
            patternUnits: "userSpaceOnUse"
        });

        pattern.appendChild(this.createGridLine("0", String(size), String(size), String(size)));
        pattern.appendChild(this.createGridLine(String(size), "0", String(size), String(size)));

        this.defs.appendChild(pattern);
    }

    /**
     * Create a single grid line element with standard styling.
     *
     * @param x1 - Start X coordinate.
     * @param y1 - Start Y coordinate.
     * @param x2 - End X coordinate.
     * @param y2 - End Y coordinate.
     * @returns An SVG line element.
     */
    private createGridLine(x1: string, y1: string, x2: string, y2: string): SVGElement
    {
        return svgCreate("line", {
            x1: x1,
            y1: y1,
            x2: x2,
            y2: y2,
            stroke: "currentColor",
            "stroke-width": "0.5",
            opacity: String(GRID_OPACITY)
        });
    }

    /**
     * Apply the grid pattern to the grid layer as a full-coverage rect.
     *
     * @param size - Grid cell size, used to size the coverage rect.
     */
    private applyGridPatternToLayer(size: number): void
    {
        const gridRect = svgCreate("rect", {
            x: "-10000",
            y: "-10000",
            width: "20000",
            height: "20000",
            fill: "url(#de-grid-pattern)",
            "pointer-events": "none"
        });

        this.gridLayer.appendChild(gridRect);
    }

    // ========================================================================
    // PRIVATE — SHADOW FILTER HELPERS
    // ========================================================================

    /**
     * Create or update a drop shadow filter definition in the defs
     * element.
     *
     * @param filterId - The deterministic filter element ID.
     * @param shadow - The shadow style configuration.
     */
    private upsertShadowFilterDef(filterId: string, shadow: ShadowStyle): void
    {
        let filter = this.defs.querySelector(`#${filterId}`) as SVGElement | null;

        if (filter)
        {
            this.updateShadowFilterAttrs(filter, shadow);
            return;
        }

        filter = this.createShadowFilterEl(filterId, shadow);
        this.defs.appendChild(filter);
    }

    /**
     * Create a new SVG filter element with a feDropShadow child.
     *
     * @param filterId - The element ID for the filter.
     * @param shadow - The shadow style configuration.
     * @returns The SVG filter element.
     */
    private createShadowFilterEl(
        filterId: string,
        shadow: ShadowStyle): SVGElement
    {
        const filter = svgCreate("filter", {
            id: filterId,
            x: "-50%",
            y: "-50%",
            width: "200%",
            height: "200%"
        });

        const dropShadow = svgCreate("feDropShadow", {
            dx: String(shadow.offsetX),
            dy: String(shadow.offsetY),
            stdDeviation: String(shadow.blur),
            "flood-color": shadow.color,
            "flood-opacity": String(shadow.opacity)
        });

        filter.appendChild(dropShadow);

        return filter;
    }

    /**
     * Update an existing shadow filter element with new attributes.
     *
     * @param filter - The existing filter element.
     * @param shadow - The new shadow style configuration.
     */
    private updateShadowFilterAttrs(
        filter: SVGElement,
        shadow: ShadowStyle): void
    {
        const ds = filter.querySelector("feDropShadow");

        if (!ds)
        {
            return;
        }

        ds.setAttribute("dx", String(shadow.offsetX));
        ds.setAttribute("dy", String(shadow.offsetY));
        ds.setAttribute("stdDeviation", String(shadow.blur));
        ds.setAttribute("flood-color", shadow.color);
        ds.setAttribute("flood-opacity", String(shadow.opacity));
    }

    /**
     * Remove a shadow filter from the defs element by object ID.
     *
     * @param objId - The object ID whose shadow filter should be removed.
     */
    private removeShadowFilter(objId: string): void
    {
        const filterId = `de-shadow-${objId}`;
        const existing = this.defs.querySelector(`#${filterId}`);

        if (existing)
        {
            existing.remove();
        }
    }

    // ========================================================================
    // PRIVATE — INLINE EDIT HELPERS
    // ========================================================================

    /**
     * Create the contentEditable overlay div for inline text editing.
     *
     * @param pos - Screen position (top-left corner).
     * @param width - Overlay width in screen pixels.
     * @param height - Overlay height in screen pixels.
     * @returns A configured HTMLDivElement.
     */
    private createEditOverlay(
        pos: Point,
        width: number,
        height: number): HTMLDivElement
    {
        const overlay = document.createElement("div");

        overlay.contentEditable = "true";
        overlay.className = `${CLS}-inline-edit`;

        overlay.style.cssText = this.buildEditOverlayStyle(pos, width, height);

        return overlay;
    }

    /**
     * Build the CSS style string for the inline edit overlay.
     *
     * @param pos - Screen position for the overlay.
     * @param width - Width in screen pixels.
     * @param height - Height in screen pixels.
     * @returns A CSS style string.
     */
    private buildEditOverlayStyle(
        pos: Point,
        width: number,
        height: number): string
    {
        return [
            "position: absolute",
            `left: ${pos.x}px`,
            `top: ${pos.y}px`,
            `width: ${width}px`,
            `min-height: ${height}px`,
            "padding: 4px",
            "border: 2px solid var(--bs-primary, #0d6efd)",
            "background: var(--bs-body-bg, #ffffff)",
            "color: var(--bs-body-color, #212529)",
            "font-size: 14px",
            "outline: none",
            "z-index: 1000",
            "box-sizing: border-box",
            "overflow: auto",
            "white-space: pre-wrap"
        ].join("; ");
    }

    /**
     * Extract plain text from a diagram object's text content runs.
     *
     * @param obj - The diagram object.
     * @returns A plain text string, or empty string if no text.
     */
    private extractPlainText(obj: DiagramObject): string
    {
        const tc = obj.presentation.textContent;

        if (!tc || !tc.runs)
        {
            return "";
        }

        return tc.runs
            .filter((r: ContentRun) => "text" in r)
            .map((r: ContentRun) => (r as TextRun).text)
            .join("");
    }

    /**
     * Attach blur and keydown event handlers to the inline edit overlay.
     *
     * @param overlay - The contentEditable overlay element.
     * @param objectId - The ID of the object being edited.
     * @returns An object with the blur and keydown handler references.
     */
    private attachEditHandlers(
        overlay: HTMLDivElement,
        objectId: string): { blur: () => void; keydown: (e: KeyboardEvent) => void }
    {
        const blur = (): void =>
        {
            this.endInlineEdit();
        };

        const keydown = (e: KeyboardEvent): void =>
        {
            this.handleEditKeydown(e);
        };

        overlay.addEventListener("blur", blur);
        overlay.addEventListener("keydown", keydown);

        return { blur, keydown };
    }

    /**
     * Handle keydown events during inline text editing. Enter commits
     * the edit; Escape cancels it.
     *
     * @param e - The keyboard event.
     */
    private handleEditKeydown(e: KeyboardEvent): void
    {
        if (e.key === "Enter" && !e.shiftKey)
        {
            e.preventDefault();
            this.endInlineEdit();
        }
        else if (e.key === "Escape")
        {
            e.preventDefault();

            if (this.inlineEdit)
            {
                this.inlineEdit.overlay.textContent = "";
            }

            this.endInlineEdit();
        }
    }

    /**
     * Remove event handlers from an inline edit overlay.
     *
     * @param state - The inline edit state containing handler references.
     */
    private detachEditHandlers(state: InlineEditState): void
    {
        state.overlay.removeEventListener("blur", state.blurHandler);
        state.overlay.removeEventListener("keydown", state.keydownHandler);
    }
}
