/**
 * SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
 * SPDX-License-Identifier: MIT
 */
/**
 * DiagramEngine — Main engine implementation and factory function.
 *
 * This is the public-facing class that consumers interact with.
 * It owns the document model, render engine, tool manager, and
 * shape registry, and exposes the full public API defined in the spec.
 */

// ============================================================================
// HELPERS
// ============================================================================

let instanceCounter = 0;

/**
 * Generates a unique ID for objects, connectors, and layers.
 *
 * @returns A string combining a base-36 timestamp and a random suffix.
 */
function generateId(): string
{
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Constrains a number within a range.
 *
 * @param val - The value to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns The clamped value.
 */
function clamp(val: number, min: number, max: number): number
{
    return Math.max(min, Math.min(max, val));
}

/**
 * Invokes a callback safely, catching and logging errors.
 * Prevents one failing callback from blocking the engine.
 *
 * @param fn - The callback to invoke, or undefined.
 * @param args - Arguments to pass to the callback.
 */
function safeCallback<T extends unknown[]>(
    fn: ((...a: T) => void) | undefined,
    ...args: T
): void
{
    if (!fn)
    {
        return;
    }

    try
    {
        fn(...args);
    }
    catch (err)
    {
        console.error(LOG_PREFIX, "Callback error:", err);
    }
}

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

/**
 * Core engine implementation. Owns the document model, render engine,
 * tool manager, shape registry, event bus, and undo stack.
 *
 * This class implements the EngineForTools interface so that tools
 * can call back into the engine for operations like hit testing,
 * selection management, and rendering.
 */
class DiagramEngineImpl implements EngineForTools
{
    private readonly instanceId: string;
    private readonly opts: DiagramEngineOptions;
    private doc: DiagramDocument;
    private readonly renderer: RenderEngine;
    private readonly shapeRegistry: ShapeRegistry;
    private readonly toolManager: ToolManager;
    private readonly events: EventBus;
    private readonly undoStack: UndoStack;

    private readonly selectedIds: Set<string> = new Set();
    private readonly selectedConnectorIds: Set<string> = new Set();
    private dirty = false;
    private changeCount = 0;
    private themeObserver: MutationObserver | null = null;
    private destroyed = false;
    private layoutRegistry: Map<string, LayoutFunction> = new Map();
    private formatClipboard: ObjectStyle | null = null;
    private readonly embedRegistry: Map<string, EmbeddableComponentEntry> = new Map();
    private activeEmbedObjectId: string | null = null;

    /**
     * Creates a new DiagramEngine instance.
     *
     * @param container - The HTML element to mount the SVG canvas into.
     * @param opts - Engine configuration options.
     */
    constructor(container: HTMLElement, opts: DiagramEngineOptions)
    {
        this.instanceId = `${CLS}-${++instanceCounter}`;
        this.opts = opts;

        this.events = new EventBus();
        this.undoStack = new UndoStack();
        this.shapeRegistry = new ShapeRegistry();
        registerBasicShapes(this.shapeRegistry);
        registerExtendedShapes(this.shapeRegistry);

        container.classList.add(`${CLS}-container`);
        this.renderer = new RenderEngine(container);

        this.doc = opts.document
            ? this.cloneDoc(opts.document)
            : this.createEmptyDoc();

        this.toolManager = new ToolManager();
        this.toolManager.setSvgElement(this.renderer.getSvgElement());
        this.registerDefaultTools();
        this.toolManager.setActive("select");

        this.bindCanvasEvents();
        this.observeThemeChanges();
        this.performInitialRender();

        console.log(LOG_PREFIX, "Created:", this.instanceId);
    }

    // ========================================================================
    // TOOL INTERFACE (EngineForTools)
    // ========================================================================

    /**
     * Finds the topmost visible object under a canvas-space point.
     * Iterates in reverse z-order so top objects are tested first.
     *
     * @param canvasPos - Point in canvas coordinates.
     * @returns The topmost hit object, or null if nothing hit.
     */
    hitTestObject(canvasPos: Point): DiagramObject | null
    {
        const visible = this.getVisibleObjectsSorted();

        for (let i = visible.length - 1; i >= 0; i--)
        {
            const obj = visible[i];
            const b = obj.presentation.bounds;
            const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

            if (shapeDef && shapeDef.hitTest(canvasPos, b))
            {
                return obj;
            }
        }

        return null;
    }

    /**
     * Checks whether an object is in the current selection.
     *
     * @param id - Object ID to check.
     * @returns true if the object is selected.
     */
    isSelected(id: string): boolean
    {
        return this.selectedIds.has(id);
    }

    /**
     * Adds an object to the selection and updates visual indicators.
     *
     * @param id - Object ID to add to selection.
     */
    addToSelection(id: string): void
    {
        this.selectedIds.add(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Toggles an object's selection state. If selected, deselects it;
     * if not selected, adds it to the selection.
     *
     * @param id - Object ID to toggle.
     */
    toggleSelection(id: string): void
    {
        if (this.selectedIds.has(id))
        {
            this.selectedIds.delete(id);
        }
        else
        {
            this.selectedIds.add(id);
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Clears the entire selection without firing external callbacks.
     * Used by tools during interaction sequences.
     */
    clearSelectionInternal(): void
    {
        this.selectedIds.clear();
        this.selectedConnectorIds.clear();
        this.refreshSelectionVisuals();
    }

    /**
     * Returns all currently selected object IDs.
     *
     * @returns Array of selected object ID strings.
     */
    getSelectedIds(): string[]
    {
        return Array.from(this.selectedIds);
    }

    /**
     * Returns the DiagramObject instances for all selected objects.
     *
     * @returns Array of selected DiagramObject references.
     */
    getSelectedObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => this.selectedIds.has(o.id)
        );
    }

    /**
     * Finds an object by its ID.
     *
     * @param id - Object ID to look up.
     * @returns The matching object, or null if not found.
     */
    getObjectById(id: string): DiagramObject | null
    {
        return this.doc.objects.find((o) => o.id === id) ?? null;
    }

    /**
     * Moves an object to an absolute position. Skips locked objects.
     * Re-renders the object and any attached connectors. When the
     * object is a container, all contained children move by the
     * same delta.
     *
     * @param id - Object ID to move.
     * @param pos - New position (x, y) in canvas coordinates.
     */
    moveObjectTo(id: string, pos: { x: number; y: number }): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        const dx = pos.x - obj.presentation.bounds.x;
        const dy = pos.y - obj.presentation.bounds.y;

        obj.presentation.bounds.x = pos.x;
        obj.presentation.bounds.y = pos.y;
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.moveContainedChildren(id, dx, dy);
        this.refreshSelectionVisuals();
    }

    /**
     * Resizes an object to new bounds. Skips locked objects.
     *
     * @param id - Object ID to resize.
     * @param bounds - New bounding rectangle.
     */
    resizeObject(id: string, bounds: Rect): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        obj.presentation.bounds = { ...bounds };
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Sets an object's rotation to an absolute angle.
     *
     * @param id - Object ID.
     * @param degrees - Rotation angle in degrees (0–360).
     */
    rotateObjectTo(id: string, degrees: number): void
    {
        const obj = this.getObjectById(id);

        if (!obj || obj.presentation.locked)
        {
            return;
        }

        obj.presentation.rotation = degrees;
        this.rerenderObject(obj);
        this.refreshSelectionVisuals();
    }

    /**
     * Nudges all selected objects by a delta. Used for arrow key movement.
     *
     * @param dx - Horizontal displacement in pixels.
     * @param dy - Vertical displacement in pixels.
     */
    nudgeSelected(dx: number, dy: number): void
    {
        for (const id of this.selectedIds)
        {
            const obj = this.getObjectById(id);

            if (obj && !obj.presentation.locked)
            {
                obj.presentation.bounds.x += dx;
                obj.presentation.bounds.y += dy;
                this.rerenderObject(obj);
                this.rerenderAttachedConnectors(id);
            }
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Deletes all selected objects and their attached connectors,
     * plus any directly selected connectors.
     */
    deleteSelected(): void
    {
        const ids = Array.from(this.selectedIds);

        for (const id of ids)
        {
            this.removeAttachedConnectors(id);
            this.removeObjectInternal(id);
        }

        this.deleteSelectedConnectors();

        this.selectedIds.clear();
        this.selectedConnectorIds.clear();
        this.refreshSelectionVisuals();
    }

    /**
     * Selects all visible objects on the canvas.
     */
    selectAll(): void
    {
        for (const obj of this.doc.objects)
        {
            if (obj.presentation.visible)
            {
                this.selectedIds.add(obj.id);
            }
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Selects all objects whose bounds intersect the given rectangle.
     * Used by the rubber band selection in SelectTool.
     *
     * @param rect - Selection rectangle in canvas coordinates.
     */
    selectObjectsInRect(rect: Rect): void
    {
        for (const obj of this.doc.objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            const b = obj.presentation.bounds;

            if (rectsIntersect(b, rect))
            {
                this.selectedIds.add(obj.id);
            }
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Pushes an undo command for a move operation.
     * Captures start and end positions for all moved objects.
     *
     * @param startBounds - Map of object IDs to their pre-move bounds.
     */
    pushMoveUndo(startBounds: Map<string, Rect>): void
    {
        const endBounds = new Map<string, Rect>();

        for (const [id] of startBounds)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                endBounds.set(id, { ...obj.presentation.bounds });
            }
        }

        const clonedStart = new Map(startBounds);

        this.undoStack.push({
            type: "move",
            label: "Move objects",
            timestamp: Date.now(),
            mergeable: true,
            undo: () => this.restoreBounds(clonedStart),
            redo: () => this.restoreBounds(endBounds),
        });

        this.markDirty();
    }

    /**
     * Pushes an undo command for a resize operation.
     *
     * @param id - Object ID that was resized.
     * @param before - Bounds before the resize.
     * @param after - Bounds after the resize.
     */
    pushResizeUndo(id: string, before: Rect, after: Rect): void
    {
        this.undoStack.push({
            type: "resize",
            label: "Resize object",
            timestamp: Date.now(),
            mergeable: false,
            undo: () => this.resizeObject(id, before),
            redo: () => this.resizeObject(id, after),
        });

        this.markDirty();
    }

    /**
     * Renders a rubber band rectangle in the tool overlay.
     *
     * @param rect - Rectangle bounds in canvas coordinates.
     */
    renderRubberBand(rect: Rect): void
    {
        this.renderer.renderRubberBand(rect);
    }

    /**
     * Clears the tool overlay (rubber band, guides, etc.).
     */
    clearToolOverlay(): void
    {
        this.renderer.clearToolOverlay();
    }

    /**
     * Retrieves the HTML canvas element for a paintable shape
     * by its diagram object ID.
     *
     * @param objectId - The diagram object ID.
     * @returns The HTMLCanvasElement, or null.
     */
    getPaintableCanvas(objectId: string): HTMLCanvasElement | null
    {
        return this.renderer.getPaintableCanvas(objectId);
    }

    /**
     * Returns the tool overlay SVG group for direct guide rendering.
     *
     * @returns The tool overlay SVG group element.
     */
    private getToolOverlayElement(): SVGGElement
    {
        return this.renderer.getToolOverlayElement();
    }

    /**
     * Switches the active tool by name.
     *
     * @param name - Tool name (e.g. "select", "draw", "connect").
     */
    setActiveTool(name: string): void
    {
        this.toolManager.setActive(name);
        this.events.emit("tool:change", name);
    }

    /**
     * Computes and renders alignment guides for the moving bounds.
     * Called by SelectTool during drag operations.
     *
     * @param movingBounds - Current bounds of the dragged selection.
     */
    showAlignmentGuides(movingBounds: Rect): void
    {
        this.renderer.clearToolOverlay();

        const excludeIds = this.selectedIds;
        const threshold = DEFAULT_SNAP_THRESHOLD;
        const allObjects = this.doc.objects.filter(
            (o) => o.presentation.visible
        );

        const snap = computeAlignmentGuides(
            movingBounds, allObjects, excludeIds, threshold
        );

        const spacingGuides = computeSpacingGuides(
            movingBounds, allObjects, excludeIds, threshold
        );

        const allGuides = snap.guides.concat(spacingGuides);

        if (allGuides.length > 0)
        {
            const overlay = this.getToolOverlayElement();

            if (overlay)
            {
                renderGuides(overlay, allGuides);
            }
        }
    }

    /**
     * Opens the inline text editor for an object.
     *
     * @param objectId - Object ID to edit.
     */
    startInlineTextEdit(objectId: string): void
    {
        const obj = this.getObjectById(objectId);

        if (!obj)
        {
            return;
        }

        // Create default text content if none exists
        if (!obj.presentation.textContent)
        {
            obj.presentation.textContent = {
                runs: [{ text: "" }],
                overflow: "visible",
                verticalAlign: "middle",
                horizontalAlign: "center",
                padding: 8,
            };
        }

        this.renderer.startInlineEdit(obj);
        this.events.emit("text:edit:start", obj);
    }

    /**
     * Closes the inline text editor and saves the content.
     */
    endInlineTextEdit(): void
    {
        const text = this.renderer.endInlineEdit();

        if (text === null)
        {
            return;
        }

        const selected = this.getSelectedObjects();

        if (selected.length === 1)
        {
            this.updateObjectText(selected[0], text);
        }

        this.events.emit("text:edit:end");
    }

    /**
     * Returns a shape definition from the registry.
     *
     * @param type - Shape type string.
     * @returns The ShapeDefinition, or null.
     */
    getShapeDef(type: string): ShapeDefinition | null
    {
        return this.shapeRegistry.get(type);
    }

    /**
     * Returns all visible, unlocked objects for connect-tool port
     * rendering and other tool interactions.
     *
     * @returns Array of visible, unlocked DiagramObject instances.
     */
    getVisibleObjects(): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.presentation.visible && !o.presentation.locked
        );
    }

    /**
     * Hit-tests all connectors against a canvas position. Returns the
     * first connector whose path is within tolerance of the point.
     *
     * @param canvasPos - Point in canvas coordinates.
     * @returns The first hit connector, or null.
     */
    hitTestConnector(canvasPos: Point): DiagramConnector | null
    {
        for (const conn of this.doc.connectors)
        {
            if (hitTestConnectorPath(conn, canvasPos, this.doc.objects))
            {
                return conn;
            }
        }

        return null;
    }

    /**
     * Checks whether a connector is currently selected.
     *
     * @param id - Connector ID to check.
     * @returns true if the connector is selected.
     */
    isConnectorSelected(id: string): boolean
    {
        return this.selectedConnectorIds.has(id);
    }

    /**
     * Adds a connector to the current selection and refreshes visuals.
     *
     * @param id - Connector ID to add.
     */
    addConnectorToSelection(id: string): void
    {
        this.selectedConnectorIds.add(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Toggles a connector's selection state and refreshes visuals.
     *
     * @param id - Connector ID to toggle.
     */
    toggleConnectorSelection(id: string): void
    {
        if (this.selectedConnectorIds.has(id))
        {
            this.selectedConnectorIds.delete(id);
        }
        else
        {
            this.selectedConnectorIds.add(id);
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Pushes a raw undo command onto the stack.
     * Used by tools that manage their own undo logic.
     *
     * @param cmd - The undo command to push.
     */
    pushUndoCommand(cmd: UndoCommand): void
    {
        this.undoStack.push(cmd);
        this.markDirty();
    }

    /**
     * Pans the canvas viewport by a screen-space delta.
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
    panCanvas(dx: number, dy: number): void
    {
        this.renderer.pan(dx, dy);
        this.emitViewportChange();
    }

    // ========================================================================
    // PUBLIC API — DOCUMENT
    // ========================================================================

    /**
     * Returns a deep clone of the current document.
     * The returned object is safe to mutate without affecting the engine.
     *
     * @returns A deep copy of the DiagramDocument.
     */
    getDocument(): DiagramDocument
    {
        return this.cloneDoc(this.doc);
    }

    /**
     * Replaces the entire document, clearing selection and history.
     *
     * @param doc - The document to load.
     */
    setDocument(doc: DiagramDocument): void
    {
        this.doc = this.cloneDoc(doc);
        this.selectedIds.clear();
        this.undoStack.clear();
        this.dirty = false;
        this.changeCount = 0;
        this.performInitialRender();
        this.events.emit("document:load");
    }

    /** Resets the canvas to an empty document. */
    clear(): void
    {
        this.setDocument(this.createEmptyDoc());
    }

    // ========================================================================
    // PUBLIC API — OBJECTS
    // ========================================================================

    /**
     * Adds a new object to the document and renders it on the canvas.
     * Missing fields are populated with sensible defaults.
     *
     * @param partial - Partial object definition.
     * @returns The fully constructed DiagramObject with generated ID.
     */
    addObject(partial: DiagramObjectInput): DiagramObject
    {
        const obj = this.buildObject(partial);
        this.doc.objects.push(obj);
        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:add", obj);
        return obj;
    }

    /**
     * Removes an object and its attached connectors from the document.
     *
     * @param id - Object ID to remove.
     */
    removeObject(id: string): void
    {
        this.removeAttachedConnectors(id);
        this.removeObjectInternal(id);
        this.selectedIds.delete(id);
        this.refreshSelectionVisuals();
    }

    /**
     * Updates an existing object's properties and re-renders it.
     *
     * @param id - Object ID to update.
     * @param changes - Partial changes to merge into the object.
     */
    updateObject(id: string, changes: Partial<DiagramObject>): void
    {
        const obj = this.getObjectById(id);

        if (!obj)
        {
            return;
        }

        if (changes.semantic)
        {
            Object.assign(obj.semantic, changes.semantic);
        }

        if (changes.presentation)
        {
            this.mergePresentation(obj, changes.presentation);
        }

        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:change", obj);
    }

    /**
     * Deep-merge presentation changes, preserving existing style
     * properties that are not explicitly overridden.
     */
    private mergePresentation(
        obj: DiagramObject,
        changes: Partial<DiagramObject["presentation"]>
    ): void
    {
        // Deep-merge style: keep existing fill/stroke/shadow/etc.
        if (changes.style && obj.presentation.style)
        {
            changes.style = { ...obj.presentation.style, ...changes.style };
        }

        Object.assign(obj.presentation, changes);
    }

    /**
     * Finds an object by ID.
     *
     * @param id - Object ID.
     * @returns The object, or null if not found.
     */
    getObject(id: string): DiagramObject | null
    {
        return this.getObjectById(id);
    }

    /**
     * Returns all objects in the document.
     *
     * @returns Array of all DiagramObject instances.
     */
    getObjects(): DiagramObject[]
    {
        return [...this.doc.objects];
    }

    /**
     * Finds all objects matching a semantic type.
     *
     * @param type - Semantic type string to match.
     * @returns Array of matching objects.
     */
    getObjectsBySemanticType(type: string): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.semantic.type === type
        );
    }

    // ========================================================================
    // PUBLIC API — SELECTION
    // ========================================================================

    /**
     * Sets the selection to exactly the given IDs.
     *
     * @param ids - Array of object IDs to select.
     */
    select(ids: string[]): void
    {
        this.selectedIds.clear();

        for (const id of ids)
        {
            this.selectedIds.add(id);
        }

        this.refreshSelectionVisuals();
    }

    /** Clears the selection. */
    clearSelection(): void
    {
        this.clearSelectionInternal();
    }

    /**
     * Returns the currently selected objects.
     *
     * @returns Array of selected DiagramObject instances.
     */
    getSelectedObjectsPublic(): DiagramObject[]
    {
        return this.getSelectedObjects();
    }

    // ========================================================================
    // PUBLIC API — VIEWPORT
    // ========================================================================

    /** Zooms in by one step, centred on the canvas. */
    zoomIn(): void
    {
        this.zoomCentred(1 + ZOOM_STEP);
    }

    /** Zooms out by one step, centred on the canvas. */
    zoomOut(): void
    {
        this.zoomCentred(1 - ZOOM_STEP);
    }

    /** Zooms and pans to fit all objects with padding. */
    zoomToFit(): void
    {
        this.renderer.zoomToFit(this.doc.objects);
        this.emitViewportChange();
    }

    /**
     * Returns the current zoom level.
     *
     * @returns Zoom factor (1.0 = 100%).
     */
    getZoomLevel(): number
    {
        return this.renderer.getViewport().zoom;
    }

    /**
     * Sets the zoom level to an absolute value.
     *
     * @param level - Desired zoom factor.
     */
    setZoomLevel(level: number): void
    {
        const vp = this.renderer.getViewport();
        const factor = level / vp.zoom;
        this.zoomCentred(factor);
    }

    /**
     * Returns the current viewport state.
     *
     * @returns Viewport with x, y offset and zoom level.
     */
    getViewport(): ViewportState
    {
        return this.renderer.getViewport();
    }

    // ========================================================================
    // PUBLIC API — HISTORY
    // ========================================================================

    /** Undoes the last operation. */
    undo(): void
    {
        if (this.undoStack.undo())
        {
            this.refreshSelectionVisuals();
            this.events.emit("history:undo");
        }
    }

    /** Redoes the last undone operation. */
    redo(): void
    {
        if (this.undoStack.redo())
        {
            this.refreshSelectionVisuals();
            this.events.emit("history:redo");
        }
    }

    /**
     * @returns true if there is an operation to undo.
     */
    canUndo(): boolean
    {
        return this.undoStack.canUndo();
    }

    /**
     * @returns true if there is an operation to redo.
     */
    canRedo(): boolean
    {
        return this.undoStack.canRedo();
    }

    // ========================================================================
    // PUBLIC API — TOOLS
    // ========================================================================

    /**
     * Returns the name of the currently active tool.
     *
     * @returns Tool name string.
     */
    getActiveTool(): string
    {
        return this.toolManager.getActiveName();
    }

    /**
     * Returns the tool instance by name, or null if not registered.
     * Useful for configuring tool properties (e.g. paintbrush settings).
     *
     * @param name - The tool name.
     * @returns The tool instance, or null.
     */
    getToolInstance(name: string): unknown
    {
        return this.toolManager.getToolByName(name);
    }

    // ========================================================================
    // PUBLIC API — STENCILS
    // ========================================================================

    /**
     * Loads a named stencil pack, registering its shapes with
     * the engine's shape registry.
     *
     * @param name - Pack name (e.g. "flowchart", "uml", "bpmn").
     */
    loadStencilPack(name: string): void
    {
        const packs: Record<string, (r: ShapeRegistry) => void> = {
            flowchart: registerFlowchartPack,
            uml: registerUmlPack,
            bpmn: registerBpmnPack,
            er: registerErPack,
            network: registerNetworkPack,
            devices: registerDeviceStencils,
            "ui-components": registerUiComponentStencils,
        };

        const fn = packs[name];

        if (fn)
        {
            fn(this.shapeRegistry);
        }
        else
        {
            console.warn(LOG_PREFIX, "Unknown stencil pack:", name);
        }
    }

    /**
     * Registers a custom stencil pack with the shape registry.
     *
     * @param name - Pack name for logging.
     * @param shapes - Array of shape definitions to register.
     */
    registerStencilPack(name: string, shapes: ShapeDefinition[]): void
    {
        for (const shape of shapes)
        {
            this.shapeRegistry.register(shape);
        }

        console.log(
            LOG_PREFIX,
            `Registered stencil pack '${name}':`,
            shapes.length, "shapes"
        );
    }

    /**
     * Returns all registered shape definitions.
     *
     * @returns Array of ShapeDefinition instances.
     */
    getAvailableShapes(): ShapeDefinition[]
    {
        return this.shapeRegistry.getAll();
    }

    // ========================================================================
    // PUBLIC API — PERSISTENCE
    // ========================================================================

    /**
     * Serialises the document to a JSON string.
     *
     * @param indent - Optional indentation for pretty-printing.
     * @returns JSON string representation of the document.
     */
    toJSON(indent?: number): string
    {
        this.doc.metadata.modified = new Date().toISOString();
        return JSON.stringify(this.doc, null, indent);
    }

    /**
     * Loads a document from a JSON string.
     *
     * @param json - JSON string to parse and load.
     */
    fromJSON(json: string): void
    {
        const doc = JSON.parse(json) as DiagramDocument;
        this.setDocument(doc);
    }

    /**
     * @returns true if the document has unsaved changes.
     */
    isDirty(): boolean
    {
        return this.dirty;
    }

    /**
     * Marks the document as clean (call after a successful save).
     */
    markClean(): void
    {
        this.dirty = false;
        this.changeCount = 0;
        this.events.emit("dirty:change", false);
    }

    // ========================================================================
    // PUBLIC API — PAGE FRAMES
    // ========================================================================

    /**
     * Adds a page frame using a named size preset. The frame is placed
     * at the given position or centred in the current viewport.
     *
     * @param sizeName - Preset name (e.g. "A4 Portrait").
     * @param position - Optional canvas position for the frame.
     * @returns The newly created PageFrame.
     */
    addPageFrame(sizeName: string, position?: Point): PageFrame
    {
        const size = findPageFrameSize(sizeName);

        if (!size)
        {
            throw new Error(
                `${LOG_PREFIX} Unknown page frame size: ${sizeName}`
            );
        }

        const pos = position ?? this.computeViewportCenter(size);
        const frame = this.buildPageFrame(size, pos);

        this.doc.pageFrames.push(frame);
        this.renderer.renderPageFrame(frame);
        this.markDirty();
        this.events.emit("pageframe:add", frame);

        console.log(LOG_PREFIX, "Page frame added:", frame.id, sizeName);
        return frame;
    }

    /**
     * Removes a page frame by ID and re-numbers the remaining frames.
     *
     * @param id - Page frame ID to remove.
     */
    removePageFrame(id: string): void
    {
        const idx = this.doc.pageFrames.findIndex((f) => f.id === id);

        if (idx < 0)
        {
            console.warn(LOG_PREFIX, "removePageFrame: not found:", id);
            return;
        }

        this.doc.pageFrames.splice(idx, 1);
        this.renderer.removePageFrameEl(id);
        this.renumberPageFrames();
        this.markDirty();
        this.events.emit("pageframe:remove", id);
    }

    /**
     * Locks a page frame so it cannot be moved.
     *
     * @param id - Page frame ID to lock.
     */
    lockPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.locked = true;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Unlocks a page frame so it can be moved again.
     *
     * @param id - Page frame ID to unlock.
     */
    unlockPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.locked = false;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Returns all page frames in the document.
     *
     * @returns Array of PageFrame objects.
     */
    getPageFrames(): PageFrame[]
    {
        return [...this.doc.pageFrames];
    }

    /**
     * Centres the viewport on a page frame with appropriate zoom
     * so the frame is fully visible.
     *
     * @param id - Page frame ID to scroll to.
     */
    scrollToPageFrame(id: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        const fakeObj = this.frameToFakeObject(frame);

        this.renderer.zoomToFit([fakeObj], 60);
        this.emitViewportChange();
        console.log(LOG_PREFIX, "Scrolled to page frame:", id);
    }

    /**
     * Sets the inner margin guides for a page frame.
     *
     * @param id - Page frame ID.
     * @param margins - New margin specification.
     */
    setPageFrameMargins(id: string, margins: PageFrameMargins): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.margins = { ...margins };
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Sets the border colour and width for a page frame.
     *
     * @param id - Page frame ID.
     * @param color - Border colour string.
     * @param width - Border width (0.5–2px).
     */
    setPageFrameBorder(
        id: string,
        color: string,
        width: number
    ): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.borderColor = color;
        frame.borderWidth = clamp(width, 0.5, 2);
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Sets the background colour for a page frame.
     *
     * @param id - Page frame ID.
     * @param color - Background colour string (use low alpha).
     */
    setPageFrameBackground(id: string, color: string): void
    {
        const frame = this.findPageFrame(id);

        if (!frame)
        {
            return;
        }

        frame.backgroundColor = color;
        this.renderer.renderPageFrame(frame);
        this.markDirty();
    }

    /**
     * Returns the predefined page frame sizes.
     *
     * @returns Array of PageFrameSize definitions.
     */
    getPageFrameSizes(): PageFrameSize[]
    {
        return [...PAGE_FRAME_SIZES];
    }

    // ========================================================================
    // PUBLIC API — EXPORT
    // ========================================================================

    /**
     * Exports the canvas as an SVG string. Page frames are excluded
     * from the export by temporarily hiding the page frames layer.
     *
     * @returns SVG markup string without page frame overlays.
     */
    exportSVG(): string
    {
        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const result = new XMLSerializer().serializeToString(
            this.renderer.getSvgElement()
        );

        pfLayer.style.display = wasVisible;

        return result;
    }

    /**
     * Exports the document as a JSON string. Page frames are excluded
     * from the exported JSON payload.
     *
     * @returns JSON string with 2-space indentation, without page frames.
     */
    exportJSON(): string
    {
        const clone = this.cloneDoc(this.doc);

        clone.pageFrames = [];
        clone.metadata.modified = new Date().toISOString();

        return JSON.stringify(clone, null, 2);
    }

    // ========================================================================
    // PUBLIC API — EVENTS
    // ========================================================================

    /**
     * Registers an event handler.
     *
     * @param event - Event name (e.g. "object:add", "selection:change").
     * @param handler - Handler function.
     */
    on(event: string, handler: EventHandler): void
    {
        this.events.on(event, handler);
    }

    /**
     * Removes an event handler.
     *
     * @param event - Event name.
     * @param handler - Handler function to remove.
     */
    off(event: string, handler: EventHandler): void
    {
        this.events.off(event, handler);
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    /**
     * Notifies the engine that its container has been resized.
     * The SVG auto-sizes via CSS, but this can be used to trigger
     * re-layout of viewport-dependent elements.
     */
    resize(): void
    {
        // SVG auto-sizes via width/height 100%
    }

    /**
     * Returns the root SVG element.
     *
     * @returns The SVG element mounted in the container.
     */
    getElement(): HTMLElement
    {
        return this.renderer.getSvgElement() as unknown as HTMLElement;
    }

    // ========================================================================
    // PUBLIC API — GROUPING
    // ========================================================================

    /**
     * Groups the specified objects into a new group object.
     *
     * @param ids - Object IDs to group (minimum 2).
     * @returns The newly created group object.
     */
    group(ids: string[]): DiagramObject
    {
        const children = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (children.length < 2)
        {
            throw new Error(`${LOG_PREFIX} Need at least 2 objects to group`);
        }

        const bbox = this.computeBBoxOf(children);

        const groupObj = this.addObject({
            semantic: { type: "group", data: {} },
            presentation: {
                shape: "rectangle",
                bounds: bbox,
                style: { fill: { type: "none" } },
            },
        });

        for (const child of children)
        {
            child.presentation.groupId = groupObj.id;
        }

        this.markDirty();
        return groupObj;
    }

    /**
     * Ungroups a group, promoting its children to the top level.
     *
     * @param groupId - The group object ID.
     * @returns The ungrouped child objects.
     */
    ungroup(groupId: string): DiagramObject[]
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.groupId = undefined;
        }

        this.removeObjectInternal(groupId);
        this.markDirty();
        return children;
    }

    // ========================================================================
    // PUBLIC API — FLIP & ROTATE
    // ========================================================================

    /**
     * Flips objects horizontally (mirrors left-right).
     *
     * @param ids - Object IDs to flip.
     */
    flipHorizontal(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.flipX = !obj.presentation.flipX;
                this.rerenderObject(obj);
            }
        }

        this.markDirty();
    }

    /**
     * Flips objects vertically (mirrors top-bottom).
     *
     * @param ids - Object IDs to flip.
     */
    flipVertical(ids: string[]): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.flipY = !obj.presentation.flipY;
                this.rerenderObject(obj);
            }
        }

        this.markDirty();
    }

    /**
     * Rotates objects by a delta angle.
     *
     * @param ids - Object IDs to rotate.
     * @param degrees - Angle to add (in degrees).
     */
    rotateObjects(ids: string[], degrees: number): void
    {
        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.rotation =
                    (obj.presentation.rotation + degrees) % 360;
                this.rerenderObject(obj);
            }
        }

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — CLIPBOARD
    // ========================================================================

    private clipboard: DiagramObject[] = [];

    /** Copies the selected objects to the clipboard. */
    copy(): void
    {
        this.clipboard = this.getSelectedObjects().map(
            (o) => JSON.parse(JSON.stringify(o))
        );
    }

    /** Copies and then deletes the selected objects. */
    cut(): void
    {
        this.copy();
        this.deleteSelected();
    }

    /** Pastes the clipboard contents with a 20px offset. */
    paste(): void
    {
        if (this.clipboard.length === 0)
        {
            return;
        }

        this.clearSelectionInternal();

        for (const src of this.clipboard)
        {
            const obj = this.addObject({
                semantic: { ...src.semantic },
                presentation: {
                    ...src.presentation,
                    bounds: {
                        ...src.presentation.bounds,
                        x: src.presentation.bounds.x + 20,
                        y: src.presentation.bounds.y + 20,
                    },
                },
            });

            this.addToSelection(obj.id);
        }
    }

    /** Copies and immediately pastes (duplicate in place). */
    duplicate(): void
    {
        this.copy();
        this.paste();
    }

    // ========================================================================
    // PUBLIC API — Z-ORDERING
    // ========================================================================

    /**
     * Brings objects to the front of their layer.
     *
     * @param ids - Object IDs to bring to front.
     */
    bringToFront(ids: string[]): void
    {
        const maxZ = Math.max(
            ...this.doc.objects.map((o) => o.presentation.zIndex), 0
        );

        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.zIndex = maxZ + 1;
            }
        }

        this.reRenderAll();
        this.markDirty();
    }

    /**
     * Sends objects to the back of their layer.
     *
     * @param ids - Object IDs to send to back.
     */
    sendToBack(ids: string[]): void
    {
        const minZ = Math.min(
            ...this.doc.objects.map((o) => o.presentation.zIndex), 0
        );

        for (const id of ids)
        {
            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.zIndex = minZ - 1;
            }
        }

        this.reRenderAll();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — ALIGNMENT
    // ========================================================================

    /**
     * Aligns objects relative to the selection bounding box.
     *
     * @param ids - Object IDs to align.
     * @param alignment - Alignment type (left, center, right, top, middle, bottom).
     */
    alignObjects(ids: string[], alignment: AlignmentType): void
    {
        const objs = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (objs.length < 2)
        {
            return;
        }

        const bbox = this.computeBBoxOf(objs);

        for (const obj of objs)
        {
            this.applyAlignment(obj, alignment, bbox);
            this.rerenderObject(obj);
        }

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    /**
     * Distributes objects evenly along an axis.
     *
     * @param ids - Object IDs to distribute (requires 3+).
     * @param axis - Distribution axis.
     */
    distributeObjects(ids: string[], axis: "horizontal" | "vertical"): void
    {
        const objs = ids
            .map((id) => this.getObjectById(id))
            .filter((o): o is DiagramObject => o !== null);

        if (objs.length < 3)
        {
            return;
        }

        if (axis === "horizontal")
        {
            this.distributeH(objs);
        }
        else
        {
            this.distributeV(objs);
        }

        this.refreshSelectionVisuals();
        this.markDirty();
    }

    // ========================================================================
    // PUBLIC API — LAYERS
    // ========================================================================

    /**
     * Adds a new layer to the document.
     *
     * @param partial - Partial layer definition.
     * @returns The created Layer.
     */
    addLayer(partial: Partial<Layer>): Layer
    {
        const layer: Layer = {
            id: partial.id ?? generateId(),
            name: partial.name ?? `Layer ${this.doc.layers.length + 1}`,
            visible: partial.visible ?? true,
            locked: partial.locked ?? false,
            printable: partial.printable ?? true,
            opacity: partial.opacity ?? 1,
            order: partial.order ?? this.doc.layers.length,
        };

        this.doc.layers.push(layer);
        this.renderer.ensureLayerEl(layer.id, layer.order);
        this.markDirty();
        this.events.emit("layer:add", layer);
        return layer;
    }

    /**
     * Removes a layer. Objects on it move to the default layer.
     *
     * @param id - Layer ID to remove.
     */
    removeLayer(id: string): void
    {
        if (id === DEFAULT_LAYER_ID)
        {
            return;
        }

        const idx = this.doc.layers.findIndex((l) => l.id === id);

        if (idx < 0)
        {
            return;
        }

        this.doc.layers.splice(idx, 1);
        this.renderer.removeLayerEl(id);

        for (const obj of this.doc.objects)
        {
            if (obj.presentation.layer === id)
            {
                obj.presentation.layer = DEFAULT_LAYER_ID;
                this.rerenderObject(obj);
            }
        }

        this.markDirty();
    }

    /**
     * Returns all layers.
     *
     * @returns Array of Layer definitions.
     */
    getLayers(): Layer[]
    {
        return [...this.doc.layers];
    }

    // ========================================================================
    // PUBLIC API — DRAW SHAPE TYPE
    // ========================================================================

    /**
     * Sets the shape type for the draw tool.
     *
     * @param type - Shape type string (e.g. "ellipse", "diamond").
     */
    setDrawShape(type: string): void
    {
        const drawTool = this.toolManager.get("draw") as DrawTool | null;

        if (drawTool && typeof drawTool.setShapeType === "function")
        {
            drawTool.setShapeType(type);
        }
    }

    // ========================================================================
    // PUBLIC API — CONNECTORS
    // ========================================================================

    /**
     * Adds a new connector to the document and renders it on the canvas.
     * Missing fields are populated with sensible defaults.
     *
     * @param partial - Partial connector definition.
     * @returns The fully constructed DiagramConnector with generated ID.
     */
    addConnector(partial: Partial<DiagramConnector>): DiagramConnector
    {
        const conn = this.buildConnector(partial);

        this.doc.connectors.push(conn);
        this.rerenderConnector(conn);
        this.markDirty();
        this.events.emit("connector:add", conn);

        return conn;
    }

    /**
     * Removes a connector from the document and the canvas.
     *
     * @param id - Connector ID to remove.
     */
    removeConnector(id: string): void
    {
        const idx = this.doc.connectors.findIndex((c) => c.id === id);

        if (idx < 0)
        {
            return;
        }

        this.doc.connectors.splice(idx, 1);
        this.renderer.removeConnectorEl(id);
        this.markDirty();
        this.events.emit("connector:remove", id);
    }

    /**
     * Updates an existing connector's properties and re-renders it.
     *
     * @param id - Connector ID to update.
     * @param changes - Partial changes to merge into the connector.
     */
    updateConnector(id: string, changes: Partial<DiagramConnector>): void
    {
        const conn = this.getConnector(id);

        if (!conn)
        {
            return;
        }

        if (changes.semantic)
        {
            Object.assign(conn.semantic, changes.semantic);
        }

        if (changes.presentation)
        {
            Object.assign(conn.presentation, changes.presentation);
        }

        this.rerenderConnector(conn);
        this.markDirty();
        this.events.emit("connector:change", conn);
    }

    /**
     * Finds a connector by its ID.
     *
     * @param id - Connector ID to look up.
     * @returns The matching connector, or null if not found.
     */
    getConnector(id: string): DiagramConnector | null
    {
        return this.doc.connectors.find((c) => c.id === id) ?? null;
    }

    /**
     * Returns all connectors in the document.
     *
     * @returns Array of all DiagramConnector instances.
     */
    getConnectors(): DiagramConnector[]
    {
        return [...this.doc.connectors];
    }

    /**
     * Returns all connectors that link two specific objects,
     * regardless of direction.
     *
     * @param objIdA - First object ID.
     * @param objIdB - Second object ID.
     * @returns Array of connectors between the two objects.
     */
    getConnectorsBetween(objIdA: string, objIdB: string): DiagramConnector[]
    {
        return this.doc.connectors.filter((c) =>
        {
            const src = c.presentation.sourceId;
            const tgt = c.presentation.targetId;

            return (
                (src === objIdA && tgt === objIdB)
                || (src === objIdB && tgt === objIdA)
            );
        });
    }

    // ========================================================================
    // PRIVATE — ALIGNMENT HELPERS
    // ========================================================================

    private applyAlignment(
        obj: DiagramObject,
        alignment: AlignmentType,
        bbox: Rect
    ): void
    {
        const b = obj.presentation.bounds;

        switch (alignment)
        {
            case "left": b.x = bbox.x; break;
            case "right": b.x = bbox.x + bbox.width - b.width; break;
            case "center": b.x = bbox.x + (bbox.width - b.width) / 2; break;
            case "top": b.y = bbox.y; break;
            case "bottom": b.y = bbox.y + bbox.height - b.height; break;
            case "middle": b.y = bbox.y + (bbox.height - b.height) / 2; break;
        }
    }

    private distributeH(objs: DiagramObject[]): void
    {
        objs.sort((a, b) => a.presentation.bounds.x - b.presentation.bounds.x);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalW = objs.reduce((s, o) => s + o.presentation.bounds.width, 0);
        const gap = (last.x + last.width - first.x - totalW) / (objs.length - 1);
        let cx = first.x + first.width + gap;

        for (let i = 1; i < objs.length - 1; i++)
        {
            objs[i].presentation.bounds.x = cx;
            this.rerenderObject(objs[i]);
            cx += objs[i].presentation.bounds.width + gap;
        }
    }

    private distributeV(objs: DiagramObject[]): void
    {
        objs.sort((a, b) => a.presentation.bounds.y - b.presentation.bounds.y);
        const first = objs[0].presentation.bounds;
        const last = objs[objs.length - 1].presentation.bounds;
        const totalH = objs.reduce((s, o) => s + o.presentation.bounds.height, 0);
        const gap = (last.y + last.height - first.y - totalH) / (objs.length - 1);
        let cy = first.y + first.height + gap;

        for (let i = 1; i < objs.length - 1; i++)
        {
            objs[i].presentation.bounds.y = cy;
            this.rerenderObject(objs[i]);
            cy += objs[i].presentation.bounds.height + gap;
        }
    }

    private computeBBoxOf(objects: DiagramObject[]): Rect
    {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const obj of objects)
        {
            const b = obj.presentation.bounds;

            if (b.x < minX) { minX = b.x; }
            if (b.y < minY) { minY = b.y; }
            if (b.x + b.width > maxX) { maxX = b.x + b.width; }
            if (b.y + b.height > maxY) { maxY = b.y + b.height; }
        }

        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }

    // ========================================================================
    // PUBLIC API — LAYOUTS
    // ========================================================================

    /**
     * Registers a custom layout algorithm by name. Overwrites any
     * previously registered layout with the same name.
     *
     * @param name - Unique layout name.
     * @param fn - Layout function to register.
     */
    registerLayout(name: string, fn: LayoutFunction): void
    {
        this.layoutRegistry.set(name, fn);
        console.log(LOG_PREFIX, "Layout registered:", name);
    }

    /**
     * Dispatches a layout by name. Checks the custom registry first,
     * then falls back to built-in layouts. Applies the resulting
     * positions to objects and re-renders.
     *
     * @param name - Layout name (e.g. "force", "grid", or a custom name).
     * @param options - Layout-specific configuration.
     */
    async applyLayout(
        name: string,
        options?: Record<string, unknown>
    ): Promise<void>
    {
        const opts = options ?? {};
        const objects = this.getObjects();
        const connectors = this.getConnectors();

        const positions = await this.resolveLayoutPositions(
            name, objects, connectors, opts
        );

        if (!positions)
        {
            console.warn(LOG_PREFIX, "Unknown layout:", name);
            return;
        }

        this.applyLayoutPositions(positions);
    }

    /**
     * Resolves layout positions from a custom or built-in layout.
     *
     * @param name - Layout name.
     * @param objects - All document objects.
     * @param connectors - All document connectors.
     * @param opts - Layout options.
     * @returns A map of object ID to new position, or null.
     */
    private async resolveLayoutPositions(
        name: string,
        objects: DiagramObject[],
        connectors: DiagramConnector[],
        opts: Record<string, unknown>
    ): Promise<Map<string, Point> | null>
    {
        const custom = this.layoutRegistry.get(name);

        if (custom)
        {
            return await custom(objects, connectors, opts);
        }

        if (name === "force")
        {
            return layoutForce(objects, opts);
        }

        if (name === "grid")
        {
            return layoutGrid(objects, opts);
        }

        return null;
    }

    /**
     * Applies a position map to objects and re-renders the canvas.
     *
     * @param positions - Map of object ID to new position.
     */
    private applyLayoutPositions(positions: Map<string, Point>): void
    {
        for (const [id, pos] of positions)
        {
            this.moveObjectTo(id, pos);
        }

        this.reRenderAll();
        this.markDirty();
        console.log(LOG_PREFIX, "Layout applied,", positions.size, "objects positioned");
    }

    // ========================================================================
    // PUBLIC API — PNG / PDF EXPORT
    // ========================================================================

    /**
     * Exports the diagram as a PNG Blob via an SVG-to-canvas pipeline.
     *
     * @param options - Export options: scale factor and background colour.
     * @returns A Promise resolving to a PNG Blob.
     */
    /**
     * @deprecated Use exportSVG() instead. PNG export has CORS
     * limitations with external images and cross-origin stylesheets.
     * For high-fidelity raster export, use a server-side renderer
     * on the SVG output.
     */
    async exportPNG(
        options?: { scale?: number; background?: string }
    ): Promise<Blob>
    {
        console.warn(LOG_PREFIX,
            "exportPNG is deprecated — use exportSVG() and render server-side for PNG");

        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const svg = this.renderer.getSvgElement();
        const scale = options?.scale ?? PNG_DEFAULT_SCALE;
        const bg = options?.background ?? PNG_DEFAULT_BG;

        const svgData = serializeSvg(svg);
        const img = await loadSvgAsImage(svgData, svg, scale);
        const blob = renderImageToBlob(img, svg, scale, bg);

        pfLayer.style.display = wasVisible;

        console.log(LOG_PREFIX, "PNG exported, scale:", scale);
        return blob;
    }

    /**
     * Exports the diagram as a print-ready PDF-style HTML Blob.
     *
     * @returns A Promise resolving to an HTML Blob suitable for printing.
     */
    async exportPDF(): Promise<Blob>
    {
        const pfLayer = this.renderer.getPageFramesLayer();
        const wasVisible = pfLayer.style.display;

        pfLayer.style.display = "none";

        const svg = this.renderer.getSvgElement();
        const svgData = serializeSvg(svg);
        const title = this.doc.metadata?.title ?? "Diagram";
        const html = buildPdfHtml(title, svgData);

        pfLayer.style.display = wasVisible;

        console.log(LOG_PREFIX, "PDF HTML exported for:", title);
        return new Blob([html], { type: "text/html;charset=utf-8" });
    }

    // ========================================================================
    // PUBLIC API — FIND AND REPLACE
    // ========================================================================

    /**
     * Searches all objects for text content matching a query string.
     *
     * @param query - Search string.
     * @param options - Search options: caseSensitive (default false).
     * @returns Array of match results with objectId and text.
     */
    findText(
        query: string,
        options?: { caseSensitive?: boolean }
    ): { objectId: string; text: string }[]
    {
        const caseSensitive = options?.caseSensitive ?? false;
        const results: { objectId: string; text: string }[] = [];
        const objects = this.getObjects();

        for (const obj of objects)
        {
            findInObject(obj, query, caseSensitive, results);
        }

        console.log(LOG_PREFIX, "Find:", results.length, "matches for", JSON.stringify(query));
        return results;
    }

    /**
     * Replaces all occurrences of a query string in all objects' text
     * content. Returns the total number of replacements made.
     *
     * @param query - String to find.
     * @param replacement - Replacement string.
     * @param options - Search options: caseSensitive (default false).
     * @returns Total number of replacements made.
     */
    replaceText(
        query: string,
        replacement: string,
        options?: { caseSensitive?: boolean }
    ): number
    {
        const caseSensitive = options?.caseSensitive ?? false;
        const objects = this.getObjects();
        let count = 0;

        for (const obj of objects)
        {
            count += replaceInObject(obj, query, replacement, caseSensitive);
        }

        if (count > 0)
        {
            this.reRenderAll();
            this.markDirty();
        }

        console.log(LOG_PREFIX, "Replace:", count, "substitutions");
        return count;
    }

    // ========================================================================
    // PUBLIC API — FORMAT PAINTER
    // ========================================================================

    /**
     * Copies the style of the specified object to the format clipboard.
     *
     * @param objectId - ID of the object whose style to copy.
     */
    pickFormat(objectId: string): void
    {
        const obj = this.getObject(objectId);

        if (!obj)
        {
            console.warn(LOG_PREFIX, "pickFormat: object not found:", objectId);
            return;
        }

        const style = obj.presentation.style;

        this.formatClipboard = {
            fill: style.fill ? JSON.parse(JSON.stringify(style.fill)) : undefined,
            stroke: style.stroke ? JSON.parse(JSON.stringify(style.stroke)) : undefined,
            shadow: style.shadow ? JSON.parse(JSON.stringify(style.shadow)) : undefined,
            opacity: style.opacity,
        };

        console.log(LOG_PREFIX, "Format picked from:", objectId);
    }

    /**
     * Applies the captured format to each target object's style.
     *
     * @param targetIds - IDs of objects to apply the format to.
     */
    applyFormat(targetIds: string[]): void
    {
        if (!this.formatClipboard)
        {
            console.warn(LOG_PREFIX, "applyFormat: no format captured");
            return;
        }

        for (const id of targetIds)
        {
            this.applyFormatToSingle(id);
        }

        this.reRenderAll();
        this.markDirty();
        console.log(LOG_PREFIX, "Format applied to", targetIds.length, "objects");
    }

    /**
     * Applies the format clipboard to a single object's style.
     *
     * @param objectId - Object ID to update.
     */
    private applyFormatToSingle(objectId: string): void
    {
        const obj = this.getObject(objectId);

        if (!obj || !this.formatClipboard)
        {
            return;
        }

        const style = obj.presentation.style;
        const fmt = this.formatClipboard;

        if (fmt.fill)
        {
            style.fill = JSON.parse(JSON.stringify(fmt.fill));
        }

        if (fmt.stroke)
        {
            style.stroke = JSON.parse(JSON.stringify(fmt.stroke));
        }

        if (fmt.shadow)
        {
            style.shadow = JSON.parse(JSON.stringify(fmt.shadow));
        }

        if (fmt.opacity !== undefined)
        {
            style.opacity = fmt.opacity;
        }
    }

    /**
     * Clears the format painter clipboard.
     */
    clearFormat(): void
    {
        this.formatClipboard = null;
        console.log(LOG_PREFIX, "Format clipboard cleared");
    }

    /**
     * Checks whether the format painter clipboard holds a captured style.
     *
     * @returns true if a format is captured.
     */
    hasFormat(): boolean
    {
        return this.formatClipboard !== null;
    }

    // ========================================================================
    // PUBLIC API — SPATIAL QUERIES
    // ========================================================================

    /**
     * Finds all visible objects whose bounds intersect the given rectangle.
     *
     * @param rect - Query rectangle in canvas coordinates.
     * @returns Array of objects overlapping the rectangle.
     */
    findObjectsInRect(rect: Rect): DiagramObject[]
    {
        const objects = this.getObjects();
        const results: DiagramObject[] = [];

        for (const obj of objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            if (boundsIntersect(obj.presentation.bounds, rect))
            {
                results.push(obj);
            }
        }

        return results;
    }

    /**
     * Finds all visible objects whose bounds contain the given point.
     *
     * @param point - Query point in canvas coordinates.
     * @returns Array of objects containing the point.
     */
    findObjectsAtPoint(point: Point): DiagramObject[]
    {
        const objects = this.getObjects();
        const results: DiagramObject[] = [];

        for (const obj of objects)
        {
            if (!obj.presentation.visible)
            {
                continue;
            }

            if (pointInBounds(point, obj.presentation.bounds))
            {
                results.push(obj);
            }
        }

        return results;
    }

    // ========================================================================
    // PUBLIC API — GRAPH ANALYSIS
    // ========================================================================

    /**
     * Finds the shortest path between two objects using BFS on the
     * connector graph.
     *
     * @param fromId - Starting object ID.
     * @param toId - Destination object ID.
     * @returns Array of object IDs from source to destination (inclusive).
     */
    getShortestPath(fromId: string, toId: string): string[]
    {
        if (fromId === toId)
        {
            return [fromId];
        }

        const connectors = this.getConnectors();
        const adj = buildAdjacencyMap(connectors);

        return bfsPath(adj, fromId, toId);
    }

    /**
     * Finds all connected components in the diagram graph using DFS.
     *
     * @returns Array of connected components (each an array of object IDs).
     */
    getConnectedComponents(): string[][]
    {
        const connectors = this.getConnectors();
        const objects = this.getObjects();
        const adj = buildAdjacencyMap(connectors);
        const visited = new Set<string>();
        const components: string[][] = [];

        for (const obj of objects)
        {
            if (!visited.has(obj.id))
            {
                const component = dfsCollect(adj, obj.id, visited);
                components.push(component);
            }
        }

        return components;
    }

    /**
     * Returns all connectors whose target is the specified object.
     *
     * @param objectId - Object ID to query.
     * @returns Array of incoming connectors.
     */
    getIncomingConnectors(objectId: string): DiagramConnector[]
    {
        return this.getConnectors().filter(
            (c) => c.presentation.targetId === objectId
        );
    }

    /**
     * Returns all connectors whose source is the specified object.
     *
     * @param objectId - Object ID to query.
     * @returns Array of outgoing connectors.
     */
    getOutgoingConnectors(objectId: string): DiagramConnector[]
    {
        return this.getConnectors().filter(
            (c) => c.presentation.sourceId === objectId
        );
    }

    // ========================================================================
    // PUBLIC API — GROUP COLLAPSE / EXPAND
    // ========================================================================

    /**
     * Collapses a group by hiding all its child objects.
     *
     * @param groupId - ID of the group to collapse.
     */
    collapseGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.visible = false;
        }

        this.reRenderAll();
        this.markDirty();
        console.log(LOG_PREFIX, "Collapsed group:", groupId, "->", children.length, "children hidden");
    }

    /**
     * Expands a group by showing all its child objects.
     *
     * @param groupId - ID of the group to expand.
     */
    expandGroup(groupId: string): void
    {
        const children = this.doc.objects.filter(
            (o) => o.presentation.groupId === groupId
        );

        for (const child of children)
        {
            child.presentation.visible = true;
        }

        this.reRenderAll();
        this.markDirty();
        console.log(LOG_PREFIX, "Expanded group:", groupId, "->", children.length, "children shown");
    }

    // ========================================================================
    // PUBLIC API — COMMENTS
    // ========================================================================

    /**
     * Adds a comment anchored to an object, connector, or canvas position.
     *
     * @param anchor - Anchor specification (type + entityId or position).
     * @param content - Comment text.
     * @param userId - Author user ID.
     * @param userName - Author display name.
     * @returns The newly created DiagramComment.
     */
    addComment(
        anchor: DiagramComment["anchor"],
        content: string,
        userId: string,
        userName: string
    ): DiagramComment
    {
        const now = new Date().toISOString();
        const id = generateId();

        const comment: DiagramComment = {
            id,
            anchor,
            thread: [buildCommentEntry(userId, userName, content, now)],
            status: "open",
            created: now,
            updated: now,
        };

        this.doc.comments.push(comment);
        this.markDirty();
        console.log(LOG_PREFIX, "Comment added:", id, "by", userName);
        return comment;
    }

    /**
     * Returns all comments in the document.
     *
     * @returns Array of all DiagramComment objects.
     */
    getComments(): DiagramComment[]
    {
        return [...this.doc.comments];
    }

    /**
     * Returns comments anchored to a specific object.
     *
     * @param objectId - Object ID to filter by.
     * @returns Array of comments anchored to the object.
     */
    getCommentsForObject(objectId: string): DiagramComment[]
    {
        return this.doc.comments.filter(
            (c) => c.anchor.entityId === objectId
        );
    }

    /**
     * Marks a comment as resolved by setting its status and timestamp.
     *
     * @param commentId - ID of the comment to resolve.
     */
    resolveComment(commentId: string): void
    {
        const comment = this.doc.comments.find(
            (c) => c.id === commentId
        );

        if (!comment)
        {
            console.warn(LOG_PREFIX, "resolveComment: not found:", commentId);
            return;
        }

        comment.status = "resolved";
        comment.updated = new Date().toISOString();
        this.markDirty();
        console.log(LOG_PREFIX, "Comment resolved:", commentId);
    }

    // ========================================================================
    // PUBLIC API — DEEP LINKING
    // ========================================================================

    /**
     * Navigates to a diagram entity via a URI. Supported formats:
     * - `object://{id}` — selects the object
     * - `connector://{id}` — selects the connector's source
     * - `comment://{id}` — selects the comment's anchor object
     *
     * @param uri - Deep link URI.
     * @returns true if navigation succeeded.
     */
    navigateToURI(uri: string): boolean
    {
        const parts = uri.split("://");

        if (parts.length !== 2)
        {
            console.warn(LOG_PREFIX, "navigateToURI: invalid format:", uri);
            return false;
        }

        const scheme = parts[0];
        const id = parts[1];

        return this.dispatchNavigation(scheme, id);
    }

    /**
     * Dispatches navigation based on the URI scheme.
     *
     * @param scheme - URI scheme (object, connector, comment).
     * @param id - Entity ID.
     * @returns true if navigation succeeded.
     */
    private dispatchNavigation(scheme: string, id: string): boolean
    {
        if (scheme === "object")
        {
            return this.navigateToObject(id);
        }

        if (scheme === "connector")
        {
            return this.navigateToConnector(id);
        }

        if (scheme === "comment")
        {
            return this.navigateToComment(id);
        }

        console.warn(LOG_PREFIX, "navigateToURI: unknown scheme:", scheme);
        return false;
    }

    /**
     * Selects an object by ID for deep link navigation.
     *
     * @param id - Object ID.
     * @returns true if the object was found and selected.
     */
    private navigateToObject(id: string): boolean
    {
        const obj = this.getObject(id);

        if (!obj)
        {
            console.warn(LOG_PREFIX, "navigateToURI: object not found:", id);
            return false;
        }

        this.select([id]);
        console.log(LOG_PREFIX, "Navigated to object:", id);
        return true;
    }

    /**
     * Selects a connector's source object for navigation.
     *
     * @param id - Connector ID.
     * @returns true if the connector was found.
     */
    private navigateToConnector(id: string): boolean
    {
        const conn = this.getConnector(id);

        if (!conn)
        {
            console.warn(LOG_PREFIX, "navigateToURI: connector not found:", id);
            return false;
        }

        this.select([conn.presentation.sourceId]);
        console.log(LOG_PREFIX, "Navigated to connector:", id);
        return true;
    }

    /**
     * Navigates to a comment's anchor object.
     *
     * @param id - Comment ID.
     * @returns true if the comment and its anchor were found.
     */
    private navigateToComment(id: string): boolean
    {
        const comment = this.doc.comments.find(
            (c) => c.id === id
        );

        if (!comment)
        {
            console.warn(LOG_PREFIX, "navigateToURI: comment not found:", id);
            return false;
        }

        if (comment.anchor.entityId)
        {
            this.select([comment.anchor.entityId]);
        }

        console.log(LOG_PREFIX, "Navigated to comment:", id);
        return true;
    }

    // ========================================================================
    // PUBLIC API — EMBEDDABLE COMPONENTS
    // ========================================================================

    /**
     * Registers an embeddable component type in the engine's registry.
     * Once registered, objects with matching embed.component can be
     * instantiated on the canvas.
     *
     * @param name - Unique component name (e.g. "datagrid").
     * @param entry - Component registry entry with factory, label, etc.
     */
    registerEmbeddableComponent(
        name: string,
        entry: EmbeddableComponentEntry): void
    {
        this.embedRegistry.set(name, entry);

        console.log(LOG_PREFIX, "Embeddable component registered:", name);
    }

    /**
     * Returns a read-only copy of the embeddable component registry.
     *
     * @returns A new Map of registered component entries.
     */
    getEmbeddableComponents(): Map<string, EmbeddableComponentEntry>
    {
        return new Map(this.embedRegistry);
    }

    /**
     * Loads a named embed pack, bulk-registering all its components.
     * Currently supports "enterprise-theme" which registers the full
     * Enterprise Theme component library.
     *
     * @param name - Pack identifier (e.g. "enterprise-theme").
     * @throws Error if the pack name is not recognised.
     */
    loadEmbedPack(name: string): void
    {
        if (name === "enterprise-theme")
        {
            registerEnterpriseThemeEmbeds(this);
            return;
        }

        throw new Error(
            `${LOG_PREFIX} Unknown embed pack: "${name}"`
        );
    }

    /**
     * Toggles interactive mode on an embed object. When interactive,
     * the embedded component receives pointer events directly.
     *
     * @param objectId - The diagram object ID with an embed definition.
     */
    toggleEmbedInteractive(objectId: string): void
    {
        const obj = this.getObjectById(objectId);

        if (!obj?.presentation.embed)
        {
            return;
        }

        const embed = obj.presentation.embed;
        const wasInteractive = embed.interactive === true;

        if (wasInteractive)
        {
            this.deactivateEmbed(objectId, embed);
        }
        else
        {
            this.activateEmbed(objectId, embed);
        }
    }

    /**
     * Exits interactive mode on the currently active embed object,
     * if any. Called on click-outside and Escape key.
     */
    exitEmbedInteractive(): void
    {
        if (!this.activeEmbedObjectId)
        {
            return;
        }

        const obj = this.getObjectById(this.activeEmbedObjectId);

        if (obj?.presentation.embed)
        {
            this.deactivateEmbed(
                this.activeEmbedObjectId,
                obj.presentation.embed
            );
        }
    }

    // ========================================================================
    // PRIVATE — EMBED INTERACTION HELPERS
    // ========================================================================

    /**
     * Activates interactive mode on an embed object, exiting any
     * previously active embed first.
     *
     * @param objectId - The object ID to activate.
     * @param embed - The embed definition to update.
     */
    private activateEmbed(
        objectId: string,
        embed: EmbedDefinition): void
    {
        if (this.activeEmbedObjectId && this.activeEmbedObjectId !== objectId)
        {
            this.exitEmbedInteractive();
        }

        embed.interactive = true;
        this.activeEmbedObjectId = objectId;
        this.renderer.setEmbedInteractive(objectId, true);

        console.debug(LOG_PREFIX, "Embed interactive ON:", objectId);
    }

    /**
     * Deactivates interactive mode on an embed object, capturing
     * its state before disabling pointer events.
     *
     * @param objectId - The object ID to deactivate.
     * @param embed - The embed definition to update.
     */
    private deactivateEmbed(
        objectId: string,
        embed: EmbedDefinition): void
    {
        this.renderer.captureEmbedState(objectId, embed);
        embed.interactive = false;
        this.activeEmbedObjectId = null;
        this.renderer.setEmbedInteractive(objectId, false);

        console.debug(LOG_PREFIX, "Embed interactive OFF:", objectId);
    }

    // ========================================================================
    // PUBLIC API — LIFECYCLE
    // ========================================================================

    /**
     * Destroys the engine, removing all DOM elements and event listeners.
     * The engine cannot be used after calling this method.
     */
    destroy(): void
    {
        if (this.destroyed)
        {
            return;
        }

        this.destroyed = true;

        if (this.themeObserver)
        {
            this.themeObserver.disconnect();
            this.themeObserver = null;
        }

        this.renderer.destroy();
        console.log(LOG_PREFIX, "Destroyed:", this.instanceId);
    }

    // ========================================================================
    // PRIVATE — INITIALISATION
    // ========================================================================

    /**
     * Registers the default tools with the tool manager.
     */
    private registerDefaultTools(): void
    {
        this.toolManager.register(new SelectTool(this));
        this.toolManager.register(new PanTool(this));
        this.toolManager.register(new DrawTool(this as unknown as EngineForDrawTool));
        this.toolManager.register(new TextTool(this as unknown as EngineForDrawTool));
        this.toolManager.register(new ConnectorTool(this as unknown as EngineForConnectTool));
        this.toolManager.register(new PenTool(this as unknown as EngineForPenTool));
        this.toolManager.register(new BrushTool(this as unknown as EngineForBrushTool));
        this.toolManager.register(new HighlighterTool(this as unknown as EngineForHighlighterTool));
        this.toolManager.register(new MeasureTool(this));
        this.toolManager.register(new PaintbrushTool(this as unknown as EngineForPaintbrushTool));
    }

    /**
     * Binds mouse, wheel, keyboard, and double-click events to the SVG canvas.
     */
    private bindCanvasEvents(): void
    {
        const svg = this.renderer.getSvgElement();

        svg.addEventListener("mousedown", (e) => this.onMouseDown(e));
        svg.addEventListener("mousemove", (e) => this.onMouseMove(e));
        svg.addEventListener("mouseup", (e) => this.onMouseUp(e));
        svg.addEventListener("wheel", (e) => this.onWheel(e), { passive: false });
        svg.addEventListener("keydown", (e) => this.onKeyDown(e));
        svg.addEventListener("dblclick", (e) => this.onDoubleClick(e));
    }

    /**
     * Renders the initial state of the document: grid, layers, and objects.
     */
    private performInitialRender(): void
    {
        this.renderer.renderGrid(this.doc.grid);
        this.renderAllPageFrames();

        for (const layer of this.doc.layers)
        {
            this.renderer.ensureLayerEl(layer.id, layer.order);
        }

        for (const obj of this.doc.objects)
        {
            this.rerenderObject(obj);
        }

        for (const conn of this.doc.connectors)
        {
            this.rerenderConnector(conn);
        }
    }

    /**
     * Watches for dark/light theme changes and re-renders all objects.
     */
    private observeThemeChanges(): void
    {
        this.themeObserver = new MutationObserver(() =>
        {
            this.reRenderAll();
        });

        this.themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["data-bs-theme"],
        });
    }

    // ========================================================================
    // PRIVATE — EVENT HANDLERS
    // ========================================================================

    /**
     * Handles mousedown on the canvas. Exits embed interactive mode
     * when clicking outside. Dispatches to the active tool.
     * Middle-click activates the pan tool temporarily.
     */
    private onMouseDown(e: MouseEvent): void
    {
        this.endInlineTextEdit();
        this.exitEmbedOnClickOutside(e);

        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);

        if (e.button === 1)
        {
            this.toolManager.setActive("pan");
        }

        this.toolManager.dispatchMouseDown(e, pos);
    }

    /**
     * Exits embed interactive mode when clicking outside the active
     * embed object. Checks whether the click target is inside the
     * embed container for the currently interactive embed.
     *
     * @param e - The mousedown event.
     */
    private exitEmbedOnClickOutside(e: MouseEvent): void
    {
        if (!this.activeEmbedObjectId)
        {
            return;
        }

        const target = e.target as Element;
        const embedContainer = this.renderer.getSvgElement().querySelector(
            `[data-embed-id="${this.activeEmbedObjectId}"]`
        );

        if (!embedContainer || !embedContainer.contains(target))
        {
            this.exitEmbedInteractive();
        }
    }

    private onMouseMove(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseMove(e, pos);
    }

    private onMouseUp(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        this.toolManager.dispatchMouseUp(e, pos);

        if (e.button === 1)
        {
            this.toolManager.setActive("select");
        }
    }

    /**
     * Handles scroll wheel for zoom. Prevents default scroll behaviour.
     */
    private onWheel(e: WheelEvent): void
    {
        e.preventDefault();

        const factor = e.deltaY < 0
            ? (1 + ZOOM_STEP)
            : (1 - ZOOM_STEP);

        const rect = this.renderer.getSvgElement().getBoundingClientRect();
        const fx = e.clientX - rect.left;
        const fy = e.clientY - rect.top;

        this.renderer.zoomAt(factor, fx, fy);
        this.emitViewportChange();
    }

    /**
     * Handles keyboard shortcuts: undo/redo, zoom, and delegates to tools.
     */
    private onKeyDown(e: KeyboardEvent): void
    {
        if (this.handleGlobalShortcut(e))
        {
            return;
        }

        this.toolManager.dispatchKeyDown(e);
    }

    /**
     * Processes global keyboard shortcuts before tool dispatch.
     * Escape exits embed interactive mode if active.
     *
     * @param e - The keyboard event.
     * @returns true if a global shortcut was handled.
     */
    private handleGlobalShortcut(e: KeyboardEvent): boolean
    {
        if (e.key === "Escape" && this.activeEmbedObjectId)
        {
            this.exitEmbedInteractive();
            e.preventDefault();
            return true;
        }

        const ctrl = e.ctrlKey || e.metaKey;

        if (ctrl && e.key === "z" && !e.shiftKey)
        {
            this.undo();
            e.preventDefault();
            return true;
        }

        if ((ctrl && e.key === "y") || (ctrl && e.key === "z" && e.shiftKey))
        {
            this.redo();
            e.preventDefault();
            return true;
        }

        if (ctrl && e.key === "0")
        {
            this.zoomToFit();
            e.preventDefault();
            return true;
        }

        if (e.key === "=" || e.key === "+")
        {
            this.zoomIn();
            e.preventDefault();
            return true;
        }

        if (e.key === "-")
        {
            this.zoomOut();
            e.preventDefault();
            return true;
        }

        return false;
    }

    /**
     * Handles double-click. Activates embed interactive mode if the
     * object has an embed definition, otherwise opens inline text
     * editing or delegates to the consumer callback.
     */
    private onDoubleClick(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        const obj = this.hitTestObject(pos);

        if (!obj)
        {
            return;
        }

        if (this.handleEmbedDoubleClick(obj))
        {
            return;
        }

        if (this.opts.onObjectDoubleClick)
        {
            safeCallback(this.opts.onObjectDoubleClick, obj);
        }
        else if (this.opts.textEditable !== false)
        {
            this.startInlineTextEdit(obj.id);
        }
    }

    /**
     * Checks whether a double-clicked object has an embed definition
     * and toggles its interactive mode if so.
     *
     * @param obj - The double-clicked diagram object.
     * @returns true if the object had an embed and was handled.
     */
    private handleEmbedDoubleClick(obj: DiagramObject): boolean
    {
        const embed = obj.presentation.embed;

        if (!embed)
        {
            return false;
        }

        if (embed.interactiveOnDoubleClick === false)
        {
            return false;
        }

        this.toggleEmbedInteractive(obj.id);
        return true;
    }

    // ========================================================================
    // PRIVATE — RENDERING
    // ========================================================================

    /**
     * Re-renders a single object on the canvas.
     *
     * @param obj - The object to re-render.
     */
    private rerenderObject(obj: DiagramObject): void
    {
        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        if (!shapeDef)
        {
            console.warn(
                LOG_PREFIX,
                "Unknown shape type:",
                obj.presentation.shape
            );
            return;
        }

        this.renderer.renderObject(obj, shapeDef);
    }

    /**
     * Re-renders a connector between objects. Can be called publicly
     * to refresh a connector after property changes.
     *
     * @param conn - The connector to re-render.
     */
    rerenderConnector(conn: DiagramConnector): void
    {
        this.renderer.renderConnector(conn, this.doc.objects);
    }

    /**
     * Re-renders all connectors attached to an object.
     * Called after an object is moved, resized, or deleted.
     *
     * @param objectId - The object whose connectors need updating.
     */
    rerenderAttachedConnectors(objectId: string): void
    {
        for (const conn of this.doc.connectors)
        {
            const isSource = conn.presentation.sourceId === objectId;
            const isTarget = conn.presentation.targetId === objectId;

            if (isSource || isTarget)
            {
                this.rerenderConnector(conn);
            }
        }
    }

    /**
     * Re-renders all objects and connectors. Used after theme changes.
     */
    private reRenderAll(): void
    {
        for (const obj of this.doc.objects)
        {
            this.rerenderObject(obj);
        }

        for (const conn of this.doc.connectors)
        {
            this.rerenderConnector(conn);
        }

        this.refreshSelectionVisuals();
    }

    /**
     * Updates selection overlay and fires the selection change event.
     * Also renders highlights for selected connectors.
     */
    private refreshSelectionVisuals(): void
    {
        const selected = this.getSelectedObjects();

        this.renderer.renderSelectionHandles(selected);
        this.renderSelectedConnectorHighlights();

        safeCallback(this.opts.onSelectionChange, selected, []);
        this.events.emit("selection:change", selected);
    }

    /**
     * Renders highlight paths for all selected connectors in the
     * overlay layer.
     */
    private renderSelectedConnectorHighlights(): void
    {
        for (const connId of this.selectedConnectorIds)
        {
            const conn = this.getConnector(connId);

            if (conn)
            {
                this.renderer.renderConnectorHighlight(
                    conn, this.doc.objects
                );
            }
        }
    }

    // ========================================================================
    // SPATIAL CONTAINMENT
    // ========================================================================

    /**
     * Returns all objects whose groupId matches the given container ID.
     *
     * @param containerId - The container object's ID.
     * @returns Array of contained DiagramObject instances.
     */
    getContainedObjects(containerId: string): DiagramObject[]
    {
        return this.doc.objects.filter(
            (o) => o.presentation.groupId === containerId
        );
    }

    /**
     * Updates containment for a set of moved objects. For each object,
     * checks whether it landed inside a container's content area and
     * sets or clears the groupId accordingly.
     *
     * @param objectIds - IDs of objects that were moved.
     */
    updateContainment(objectIds: string[]): void
    {
        for (const id of objectIds)
        {
            const obj = this.getObjectById(id);

            if (!obj)
            {
                continue;
            }

            this.assignContainment(obj);
        }
    }

    /**
     * Assigns or clears containment for a single object based on
     * whether its centre falls inside a container's content area.
     *
     * @param obj - The object to evaluate for containment.
     */
    private assignContainment(obj: DiagramObject): void
    {
        const centre = this.objectCentre(obj);
        const container = this.findContainerAtPosition(
            centre, obj.id
        );

        if (container)
        {
            obj.presentation.groupId = container.id;
        }
        else if (obj.presentation.groupId)
        {
            obj.presentation.groupId = undefined;
        }
    }

    /**
     * Returns the centre point of an object's bounds.
     *
     * @param obj - The diagram object.
     * @returns The centre point.
     */
    private objectCentre(obj: DiagramObject): Point
    {
        const b = obj.presentation.bounds;

        return {
            x: b.x + (b.width / 2),
            y: b.y + (b.height / 2)
        };
    }

    /**
     * Finds the topmost container shape whose content area contains
     * the given position. Excludes the object being tested (so a
     * container cannot contain itself).
     *
     * @param pos - Canvas-space position to test.
     * @param excludeId - Object ID to exclude from the search.
     * @returns The container DiagramObject, or null if none found.
     */
    private findContainerAtPosition(
        pos: Point,
        excludeId: string): DiagramObject | null
    {
        const visible = this.getVisibleObjectsSorted();

        for (let i = visible.length - 1; i >= 0; i--)
        {
            const candidate = visible[i];

            if (candidate.id === excludeId)
            {
                continue;
            }

            if (this.isContainerHit(candidate, pos))
            {
                return candidate;
            }
        }

        return null;
    }

    /**
     * Tests whether a position falls inside a container object's
     * content area. Returns false for non-container shapes.
     *
     * @param obj - Candidate container object.
     * @param pos - Canvas-space position to test.
     * @returns true if the position is inside the content area.
     */
    private isContainerHit(obj: DiagramObject, pos: Point): boolean
    {
        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        if (!shapeDef || !shapeDef.isContainer)
        {
            return false;
        }

        const contentRect = this.resolveContentArea(
            obj.presentation.bounds, shapeDef
        );

        return rectHitTest(pos, contentRect);
    }

    /**
     * Resolves the absolute content area rectangle from a container's
     * bounds and its shape definition's normalised content area.
     * Falls back to the full bounds when no contentArea is defined.
     *
     * @param bounds - The container's bounding rectangle.
     * @param shapeDef - The container's shape definition.
     * @returns The absolute content area rectangle.
     */
    private resolveContentArea(
        bounds: Rect,
        shapeDef: ShapeDefinition): Rect
    {
        const area = shapeDef.contentArea
            ?? { x: 0, y: 0, w: 1, h: 1 };

        return {
            x: bounds.x + (area.x * bounds.width),
            y: bounds.y + (area.y * bounds.height),
            width: area.w * bounds.width,
            height: area.h * bounds.height
        };
    }

    /**
     * Moves all objects contained by a container by a given delta.
     * Skips the operation when the delta is zero or the object is
     * not a container shape.
     *
     * @param containerId - The container object's ID.
     * @param dx - Horizontal displacement.
     * @param dy - Vertical displacement.
     */
    private moveContainedChildren(
        containerId: string,
        dx: number,
        dy: number): void
    {
        if (dx === 0 && dy === 0)
        {
            return;
        }

        if (!this.isContainerObject(containerId))
        {
            return;
        }

        const children = this.getContainedObjects(containerId);

        for (const child of children)
        {
            this.moveChildByDelta(child, dx, dy);
        }
    }

    /**
     * Checks whether an object is a spatial container based on its
     * shape definition.
     *
     * @param objectId - The object ID to check.
     * @returns true if the object's shape has isContainer set.
     */
    private isContainerObject(objectId: string): boolean
    {
        const obj = this.getObjectById(objectId);

        if (!obj)
        {
            return false;
        }

        const shapeDef = this.shapeRegistry.get(obj.presentation.shape);

        return shapeDef?.isContainer === true;
    }

    /**
     * Moves a child object by a delta and re-renders it.
     *
     * @param child - The child object to move.
     * @param dx - Horizontal displacement.
     * @param dy - Vertical displacement.
     */
    private moveChildByDelta(
        child: DiagramObject,
        dx: number,
        dy: number): void
    {
        child.presentation.bounds.x += dx;
        child.presentation.bounds.y += dy;
        this.rerenderObject(child);
        this.rerenderAttachedConnectors(child.id);
    }

    // ========================================================================
    // PRIVATE — DOCUMENT HELPERS
    // ========================================================================

    /**
     * Returns all visible objects, sorted by z-index.
     * Used internally for hit testing.
     *
     * @returns Array of visible objects in z-order.
     */
    private getVisibleObjectsSorted(): DiagramObject[]
    {
        return this.doc.objects
            .filter((o) => o.presentation.visible)
            .sort((a, b) => a.presentation.zIndex - b.presentation.zIndex);
    }

    /**
     * Removes an object from the document and its SVG element.
     *
     * @param id - Object ID to remove.
     */
    private removeObjectInternal(id: string): void
    {
        const idx = this.doc.objects.findIndex((o) => o.id === id);

        if (idx < 0)
        {
            return;
        }

        this.doc.objects.splice(idx, 1);
        this.renderer.removeObjectEl(id);
        this.markDirty();
        this.events.emit("object:remove", id);
    }

    /**
     * Removes all connectors attached to an object.
     *
     * @param objectId - The object whose connectors should be removed.
     */
    private removeAttachedConnectors(objectId: string): void
    {
        const toRemove = this.doc.connectors.filter(
            (c) =>
                c.presentation.sourceId === objectId
                || c.presentation.targetId === objectId
        );

        for (const conn of toRemove)
        {
            const idx = this.doc.connectors.indexOf(conn);

            if (idx >= 0)
            {
                this.doc.connectors.splice(idx, 1);
                this.renderer.removeConnectorEl(conn.id);
            }
        }
    }

    /**
     * Deletes all connectors that are in the selected connectors set.
     */
    private deleteSelectedConnectors(): void
    {
        for (const connId of this.selectedConnectorIds)
        {
            this.removeConnector(connId);
        }
    }

    /**
     * Updates an object's text content after inline editing.
     *
     * @param obj - The object to update.
     * @param text - The new text content.
     */
    private updateObjectText(obj: DiagramObject, text: string): void
    {
        obj.presentation.textContent = {
            runs: [{ text }],
            overflow: "visible",
            verticalAlign: "middle",
            horizontalAlign: "center",
            padding: 8,
        };

        this.rerenderObject(obj);
        this.markDirty();
    }

    /**
     * Restores object bounds from a saved map. Used by undo/redo.
     *
     * @param boundsMap - Map of object IDs to bounds to restore.
     */
    private restoreBounds(boundsMap: Map<string, Rect>): void
    {
        for (const [id, b] of boundsMap)
        {
            this.moveObjectTo(id, { x: b.x, y: b.y });

            const obj = this.getObjectById(id);

            if (obj)
            {
                obj.presentation.bounds.width = b.width;
                obj.presentation.bounds.height = b.height;
                this.rerenderObject(obj);
            }
        }
    }

    // ========================================================================
    // PRIVATE — PAGE FRAME HELPERS
    // ========================================================================

    /**
     * Finds a page frame by its ID.
     *
     * @param id - Page frame ID.
     * @returns The matching PageFrame, or null if not found.
     */
    private findPageFrame(id: string): PageFrame | null
    {
        return this.doc.pageFrames.find((f) => f.id === id) ?? null;
    }

    /**
     * Builds a PageFrame from a size preset and position.
     *
     * @param size - The predefined size to use.
     * @param pos - Canvas position for the frame.
     * @returns A fully constructed PageFrame.
     */
    private buildPageFrame(size: PageFrameSize, pos: Point): PageFrame
    {
        const number = this.doc.pageFrames.length + 1;

        return {
            id: generateId(),
            number,
            x: pos.x,
            y: pos.y,
            width: size.width,
            height: size.height,
            sizeName: size.name,
            locked: false,
            borderColor: PF_DEFAULT_BORDER_COLOR,
            borderWidth: PF_DEFAULT_BORDER_WIDTH,
            margins: { ...PAGE_FRAME_MARGIN_PRESETS.normal },
            backgroundColor: PF_DEFAULT_BG_COLOR,
            numberPosition: "above",
        };
    }

    /**
     * Computes a viewport-centred position for a frame of the
     * given size.
     *
     * @param size - The frame size to centre.
     * @returns A Point at the top-left of the centred frame.
     */
    private computeViewportCenter(size: PageFrameSize): Point
    {
        const vp = this.renderer.getViewport();
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();

        const canvasCx = ((rect.width / 2) - vp.x) / vp.zoom;
        const canvasCy = ((rect.height / 2) - vp.y) / vp.zoom;

        return {
            x: canvasCx - size.width / 2,
            y: canvasCy - size.height / 2,
        };
    }

    /**
     * Re-numbers all page frames sequentially starting from 1.
     * Called after a frame is removed.
     */
    private renumberPageFrames(): void
    {
        for (let i = 0; i < this.doc.pageFrames.length; i++)
        {
            this.doc.pageFrames[i].number = i + 1;
        }

        this.renderer.renderAllPageFrames(this.doc.pageFrames);
    }

    /**
     * Renders all page frames in the document.
     */
    private renderAllPageFrames(): void
    {
        if (this.doc.pageFrames.length > 0)
        {
            this.renderer.renderAllPageFrames(this.doc.pageFrames);
        }
    }

    /**
     * Wraps a page frame as a fake DiagramObject for zoomToFit.
     *
     * @param frame - The page frame.
     * @returns A minimal DiagramObject with matching bounds.
     */
    private frameToFakeObject(frame: PageFrame): DiagramObject
    {
        return {
            id: frame.id,
            semantic: { type: "page-frame", data: {} },
            presentation: {
                shape: "rectangle",
                bounds: {
                    x: frame.x,
                    y: frame.y,
                    width: frame.width,
                    height: frame.height,
                },
                rotation: 0,
                flipX: false,
                flipY: false,
                style: {},
                layer: DEFAULT_LAYER_ID,
                zIndex: 0,
                locked: false,
                visible: true,
            },
        };
    }

    /** Marks the document as having unsaved changes. */
    private markDirty(): void
    {
        this.dirty = true;
        this.changeCount++;
        this.events.emit("dirty:change", true);
    }

    /** Emits a viewport change event with the current state. */
    private emitViewportChange(): void
    {
        const vp = this.renderer.getViewport();
        safeCallback(this.opts.onViewportChange, vp);
        this.events.emit("viewport:change", vp);
    }

    /**
     * Zooms by a factor, centred on the canvas midpoint.
     *
     * @param factor - Zoom multiplier.
     */
    private zoomCentred(factor: number): void
    {
        const svg = this.renderer.getSvgElement();
        const rect = svg.getBoundingClientRect();
        this.renderer.zoomAt(factor, rect.width / 2, rect.height / 2);
        this.emitViewportChange();
    }

    /**
     * Creates an empty document with default layer and grid.
     *
     * @returns A new empty DiagramDocument.
     */
    private createEmptyDoc(): DiagramDocument
    {
        const now = new Date().toISOString();

        return {
            version: VERSION,
            metadata: {
                title: "Untitled Diagram",
                created: now,
                modified: now,
            },
            layers: [{
                id: DEFAULT_LAYER_ID,
                name: DEFAULT_LAYER_NAME,
                visible: true,
                locked: false,
                printable: true,
                opacity: 1,
                order: 0,
            }],
            objects: [],
            connectors: [],
            comments: [],
            pageFrames: [],
            guides: [],
            grid: {
                size: this.opts.grid?.size ?? DEFAULT_GRID_SIZE,
                style: this.opts.grid?.style ?? "dots",
                visible: this.opts.grid?.visible ?? true,
            },
        };
    }

    /**
     * Deep-clones a document via JSON serialisation.
     *
     * @param doc - Document to clone.
     * @returns An independent copy.
     */
    private cloneDoc(doc: DiagramDocument): DiagramDocument
    {
        return JSON.parse(JSON.stringify(doc));
    }

    /**
     * Constructs a full DiagramConnector from a partial input,
     * filling in defaults for all missing fields.
     *
     * @param partial - Partial connector definition.
     * @returns A complete DiagramConnector.
     */
    private buildConnector(partial: Partial<DiagramConnector>): DiagramConnector
    {
        const id = partial.id ?? generateId();

        return {
            id,
            semantic: {
                type: partial.semantic?.type ?? "connector",
                data: partial.semantic?.data ?? {},
                references: partial.semantic?.references,
                tags: partial.semantic?.tags,
                relationships: partial.semantic?.relationships,
            },
            presentation: this.buildConnectorPresentation(partial.presentation),
        };
    }

    /**
     * Builds the presentation block for a connector with defaults.
     *
     * @param pres - Partial presentation data, or undefined.
     * @returns A complete connector presentation object.
     */
    private buildConnectorPresentation(
        pres: DiagramConnector["presentation"] | undefined
    ): DiagramConnector["presentation"]
    {
        return {
            sourceId: pres?.sourceId ?? "",
            targetId: pres?.targetId ?? "",
            sourcePort: pres?.sourcePort,
            targetPort: pres?.targetPort,
            sourcePoint: pres?.sourcePoint,
            targetPoint: pres?.targetPoint,
            waypoints: pres?.waypoints ?? [],
            routing: pres?.routing ?? "straight",
            style: pres?.style ?? { color: "var(--theme-text-color)", width: 1.5, endArrow: "classic" },
            labels: pres?.labels ?? [],
        };
    }

    /**
     * Constructs a full DiagramObject from a partial input,
     * filling in defaults for all missing fields.
     *
     * @param partial - Partial object definition.
     * @returns A complete DiagramObject.
     */
    private buildObject(partial: DiagramObjectInput): DiagramObject
    {
        const id = partial.id ?? generateId();
        const pres = partial.presentation ?? {};

        return {
            id,
            semantic: {
                type: partial.semantic?.type ?? "generic",
                data: partial.semantic?.data ?? {},
                references: partial.semantic?.references,
                tags: partial.semantic?.tags,
                relationships: partial.semantic?.relationships,
            },
            presentation: {
                shape: pres.shape ?? "rectangle",
                bounds: pres.bounds ?? { x: 100, y: 100, width: 160, height: 100 },
                rotation: pres.rotation ?? 0,
                flipX: pres.flipX ?? false,
                flipY: pres.flipY ?? false,
                style: pres.style ?? {
                    fill: { type: "solid", color: "var(--theme-surface-raised-bg)" },
                    stroke: { color: "var(--theme-border-color)", width: 1.5 },
                },
                textContent: pres.textContent,
                layer: pres.layer ?? DEFAULT_LAYER_ID,
                zIndex: pres.zIndex ?? this.doc.objects.length,
                locked: pres.locked ?? false,
                visible: pres.visible ?? true,
                groupId: pres.groupId,
                parameters: pres.parameters,
                renderStyle: pres.renderStyle,
                image: pres.image,
                paintable: pres.paintable,
                embed: pres.embed,
                dataBindings: pres.dataBindings,
                anchor: pres.anchor,
            },
        };
    }
}

// ============================================================================
// UTILITY — GEOMETRY
// ============================================================================

/**
 * Tests whether two axis-aligned rectangles overlap.
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if the rectangles intersect.
 */
function rectsIntersect(a: Rect, b: Rect): boolean
{
    return (
        a.x < b.x + b.width
        && a.x + a.width > b.x
        && a.y < b.y + b.height
        && a.y + a.height > b.y
    );
}

// ============================================================================
// LAYOUT — CONSTANTS
// ============================================================================

/** Default number of columns for the grid layout. */
const GRID_DEFAULT_COLUMNS = 4;

/** Default gap between cells in the grid layout (pixels). */
const GRID_DEFAULT_GAP = 40;

/** Default angular step for circular (force) layout (radians). */
const FORCE_DEFAULT_RADIUS = 300;

/** Default scale factor for PNG export. */
const PNG_DEFAULT_SCALE = 2;

/** Default background colour for PNG export. */
const PNG_DEFAULT_BG = "#ffffff";

// ============================================================================
// LAYOUT — BUILT-IN: FORCE (CIRCULAR)
// ============================================================================

/**
 * Places objects in a circular arrangement around a centre point.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `radius` (number) overrides default.
 * @returns A map of object ID to circular position.
 */
function layoutForce(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const radius = typeof opts.radius === "number"
        ? opts.radius
        : FORCE_DEFAULT_RADIUS;

    const cx = radius + 100;
    const cy = radius + 100;
    const positions = new Map<string, Point>();
    const step = (2 * Math.PI) / Math.max(objects.length, 1);

    for (let i = 0; i < objects.length; i++)
    {
        const angle = step * i;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        positions.set(objects[i].id, { x, y });
    }

    return positions;
}

// ============================================================================
// LAYOUT — BUILT-IN: GRID
// ============================================================================

/**
 * Arranges objects in a grid pattern with configurable columns and gap.
 *
 * @param objects - Objects to lay out.
 * @param opts - Options: `columns` (number), `gap` (number).
 * @returns A map of object ID to grid position.
 */
function layoutGrid(
    objects: DiagramObject[],
    opts: Record<string, unknown>
): Map<string, Point>
{
    const columns = typeof opts.columns === "number"
        ? opts.columns
        : GRID_DEFAULT_COLUMNS;

    const gap = typeof opts.gap === "number"
        ? opts.gap
        : GRID_DEFAULT_GAP;

    const positions = new Map<string, Point>();
    const cellW = computeMaxDimension(objects, "width") + gap;
    const cellH = computeMaxDimension(objects, "height") + gap;

    for (let i = 0; i < objects.length; i++)
    {
        const col = i % columns;
        const row = Math.floor(i / columns);
        positions.set(objects[i].id, { x: col * cellW + gap, y: row * cellH + gap });
    }

    return positions;
}

/**
 * Computes the maximum width or height across all objects.
 *
 * @param objects - Objects to measure.
 * @param dim - Dimension to measure ("width" or "height").
 * @returns The maximum value found, or 100 if no objects.
 */
function computeMaxDimension(
    objects: DiagramObject[],
    dim: "width" | "height"
): number
{
    if (objects.length === 0)
    {
        return 100;
    }

    let max = 0;

    for (const obj of objects)
    {
        const val = obj.presentation.bounds[dim];

        if (val > max)
        {
            max = val;
        }
    }

    return max || 100;
}

// ============================================================================
// EXPORT HELPERS — SVG / CANVAS PIPELINE
// ============================================================================

/**
 * Serialises an SVG element to an XML string.
 *
 * @param svg - The SVG element.
 * @returns Serialised SVG XML.
 */
function serializeSvg(svg: SVGElement): string
{
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
}

/**
 * Loads serialised SVG data into an Image element for canvas drawing.
 *
 * @param svgData - Serialised SVG XML.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @returns A Promise resolving to the loaded Image.
 */
function loadSvgAsImage(
    svgData: string,
    svg: SVGElement,
    scale: number
): Promise<HTMLImageElement>
{
    return new Promise((resolve, reject) =>
    {
        const img = new Image();
        const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        img.onload = () =>
        {
            URL.revokeObjectURL(url);
            resolve(img);
        };

        img.onerror = () =>
        {
            URL.revokeObjectURL(url);
            reject(new Error(`${LOG_PREFIX} Failed to load SVG as image`));
        };

        img.width = svg.clientWidth * scale;
        img.height = svg.clientHeight * scale;
        img.src = url;
    });
}

/**
 * Draws a loaded Image onto a Canvas and converts to a PNG Blob.
 *
 * @param img - The loaded Image element.
 * @param svg - The original SVG element (for dimensions).
 * @param scale - Scale multiplier.
 * @param bg - Background colour.
 * @returns A Promise resolving to the PNG Blob.
 */
function renderImageToBlob(
    img: HTMLImageElement,
    svg: SVGElement,
    scale: number,
    bg: string
): Promise<Blob>
{
    const canvas = createExportCanvas(svg, scale);
    const ctx = canvas.getContext("2d");

    if (!ctx)
    {
        return Promise.reject(new Error(`${LOG_PREFIX} Canvas 2D context unavailable`));
    }

    drawToCanvas(ctx, img, canvas.width, canvas.height, bg);
    return canvasToBlob(canvas);
}

/**
 * Creates a canvas element sized for SVG export.
 *
 * @param svg - The SVG element for dimensions.
 * @param scale - Scale multiplier.
 * @returns A canvas element.
 */
function createExportCanvas(svg: SVGElement, scale: number): HTMLCanvasElement
{
    const canvas = document.createElement("canvas");
    canvas.width = svg.clientWidth * scale;
    canvas.height = svg.clientHeight * scale;
    return canvas;
}

/**
 * Draws a background and image onto a canvas context.
 *
 * @param ctx - Canvas 2D rendering context.
 * @param img - The image to draw.
 * @param w - Canvas width.
 * @param h - Canvas height.
 * @param bg - Background colour.
 */
function drawToCanvas(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    w: number,
    h: number,
    bg: string
): void
{
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
}

/**
 * Converts a canvas to a PNG Blob via the toBlob API.
 *
 * @param canvas - The canvas to convert.
 * @returns A Promise resolving to the PNG Blob.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob>
{
    return new Promise((resolve, reject) =>
    {
        canvas.toBlob((blob) =>
        {
            if (blob)
            {
                resolve(blob);
            }
            else
            {
                reject(new Error(`${LOG_PREFIX} Canvas toBlob returned null`));
            }
        }, "image/png");
    });
}

// ============================================================================
// PDF EXPORT HELPERS
// ============================================================================

/**
 * Builds a print-ready HTML document embedding the SVG content.
 *
 * @param title - Document title.
 * @param svgContent - Serialised SVG XML.
 * @returns Complete HTML string.
 */
function buildPdfHtml(title: string, svgContent: string): string
{
    return [
        "<!DOCTYPE html>",
        "<html><head>",
        `<title>${escapeHtmlText(title)}</title>`,
        "<style>",
        "@media print { body { margin: 0; } }",
        "body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }",
        "svg { max-width: 100%; height: auto; }",
        "</style>",
        "</head><body>",
        svgContent,
        "</body></html>",
    ].join("\n");
}

/**
 * Escapes HTML special characters in text for safe embedding.
 *
 * @param text - Raw text.
 * @returns HTML-escaped text.
 */
function escapeHtmlText(text: string): string
{
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ============================================================================
// FIND / REPLACE HELPERS
// ============================================================================

/**
 * Checks a single object's text content for query matches.
 *
 * @param obj - Object to search.
 * @param query - Search string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @param results - Accumulator array for results.
 */
function findInObject(
    obj: DiagramObject,
    query: string,
    caseSensitive: boolean,
    results: { objectId: string; text: string }[]
): void
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return;
    }

    const runs = collectAllRuns(tc);

    for (const run of runs)
    {
        if (!("text" in run))
        {
            continue;
        }

        const text = (run as TextRun).text;

        if (textMatches(text, query, caseSensitive))
        {
            results.push({ objectId: obj.id, text });
        }
    }
}

/**
 * Collects all content runs from a TextContent, including both flat
 * runs and runs within blocks.
 *
 * @param tc - The text content to traverse.
 * @returns Flat array of all ContentRun instances.
 */
function collectAllRuns(tc: TextContent): ContentRun[]
{
    const all: ContentRun[] = [];

    if (tc.runs)
    {
        all.push(...tc.runs);
    }

    if (tc.blocks)
    {
        for (const block of tc.blocks)
        {
            all.push(...block.runs);
        }
    }

    return all;
}

/**
 * Tests whether a text string contains a query, respecting case.
 *
 * @param text - Text to search.
 * @param query - Query string.
 * @param caseSensitive - Whether to respect case.
 * @returns true if the text contains the query.
 */
function textMatches(
    text: string,
    query: string,
    caseSensitive: boolean
): boolean
{
    if (caseSensitive)
    {
        return text.includes(query);
    }

    return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Replaces matching text in a single object's content runs.
 *
 * @param obj - Object to process.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this object.
 */
function replaceInObject(
    obj: DiagramObject,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const tc = obj.presentation.textContent;

    if (!tc)
    {
        return 0;
    }

    const runs = collectAllRuns(tc);
    let count = 0;

    for (const run of runs)
    {
        if ("text" in run)
        {
            const result = replaceInRun(run as TextRun, query, replacement, caseSensitive);
            count += result;
        }
    }

    return count;
}

/**
 * Replaces matching text within a single text run.
 *
 * @param run - The text run to modify.
 * @param query - String to find.
 * @param replacement - Replacement string.
 * @param caseSensitive - Whether search is case-sensitive.
 * @returns Number of replacements made in this run.
 */
function replaceInRun(
    run: TextRun,
    query: string,
    replacement: string,
    caseSensitive: boolean
): number
{
    const flags = caseSensitive ? "g" : "gi";
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, flags);
    const matches = run.text.match(regex);
    const count = matches ? matches.length : 0;

    if (count > 0)
    {
        run.text = run.text.replace(regex, replacement);
    }

    return count;
}

// ============================================================================
// SPATIAL QUERY HELPERS
// ============================================================================

/**
 * Tests whether two rectangles overlap (axis-aligned).
 *
 * @param a - First rectangle.
 * @param b - Second rectangle.
 * @returns true if they intersect.
 */
function boundsIntersect(a: Rect, b: Rect): boolean
{
    return (
        a.x < (b.x + b.width)
        && (a.x + a.width) > b.x
        && a.y < (b.y + b.height)
        && (a.y + a.height) > b.y
    );
}

/**
 * Tests whether a point lies within a rectangle.
 *
 * @param p - Point to test.
 * @param b - Bounding rectangle.
 * @returns true if the point is inside the bounds.
 */
function pointInBounds(p: Point, b: Rect): boolean
{
    return (
        p.x >= b.x
        && p.x <= (b.x + b.width)
        && p.y >= b.y
        && p.y <= (b.y + b.height)
    );
}

// ============================================================================
// GRAPH ANALYSIS HELPERS
// ============================================================================

/**
 * Builds an adjacency list from connectors.
 *
 * @param connectors - All connectors in the document.
 * @returns Adjacency map.
 */
function buildAdjacencyMap(
    connectors: DiagramConnector[]
): Map<string, Set<string>>
{
    const adj = new Map<string, Set<string>>();

    for (const conn of connectors)
    {
        const src = conn.presentation.sourceId;
        const tgt = conn.presentation.targetId;

        if (!adj.has(src)) { adj.set(src, new Set()); }
        if (!adj.has(tgt)) { adj.set(tgt, new Set()); }

        adj.get(src)!.add(tgt);
        adj.get(tgt)!.add(src);
    }

    return adj;
}

/**
 * Performs BFS on an adjacency map to find the shortest path.
 *
 * @param adj - Adjacency map.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Path as array of node IDs, or empty if unreachable.
 */
function bfsPath(
    adj: Map<string, Set<string>>,
    fromId: string,
    toId: string
): string[]
{
    const visited = new Set<string>([fromId]);
    const parent = new Map<string, string>();
    const queue: string[] = [fromId];

    while (queue.length > 0)
    {
        const current = queue.shift()!;

        if (current === toId)
        {
            return reconstructPath(parent, fromId, toId);
        }

        bfsEnqueueNeighbours(adj, current, visited, parent, queue);
    }

    return [];
}

/**
 * Enqueues unvisited neighbours of a node during BFS traversal.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param parent - Parent map for path reconstruction.
 * @param queue - BFS queue.
 */
function bfsEnqueueNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    parent: Map<string, string>,
    queue: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            visited.add(n);
            parent.set(n, current);
            queue.push(n);
        }
    }
}

/**
 * Reconstructs the path from BFS parent pointers.
 *
 * @param parent - Map of child to parent node.
 * @param fromId - Start node.
 * @param toId - End node.
 * @returns Ordered path from start to end.
 */
function reconstructPath(
    parent: Map<string, string>,
    fromId: string,
    toId: string
): string[]
{
    const path: string[] = [toId];
    let current = toId;

    while (current !== fromId)
    {
        current = parent.get(current)!;
        path.push(current);
    }

    return path.reverse();
}

/**
 * Collects all nodes reachable from a start node via DFS.
 *
 * @param adj - Adjacency map.
 * @param startId - Starting node ID.
 * @param visited - Global visited set (updated in place).
 * @returns Array of IDs in this component.
 */
function dfsCollect(
    adj: Map<string, Set<string>>,
    startId: string,
    visited: Set<string>
): string[]
{
    const component: string[] = [];
    const stack: string[] = [startId];

    while (stack.length > 0)
    {
        const current = stack.pop()!;

        if (visited.has(current))
        {
            continue;
        }

        visited.add(current);
        component.push(current);
        dfsStackNeighbours(adj, current, visited, stack);
    }

    return component;
}

/**
 * Pushes unvisited neighbours of a node onto the DFS stack.
 *
 * @param adj - Adjacency map.
 * @param current - Current node being processed.
 * @param visited - Set of already-visited nodes.
 * @param stack - DFS stack.
 */
function dfsStackNeighbours(
    adj: Map<string, Set<string>>,
    current: string,
    visited: Set<string>,
    stack: string[]
): void
{
    const neighbours = adj.get(current);

    if (!neighbours)
    {
        return;
    }

    for (const n of neighbours)
    {
        if (!visited.has(n))
        {
            stack.push(n);
        }
    }
}

// ============================================================================
// COMMENT HELPERS
// ============================================================================

/**
 * Builds a single comment thread entry.
 *
 * @param userId - Author user ID.
 * @param userName - Author display name.
 * @param content - Comment text.
 * @param timestamp - ISO timestamp.
 * @returns A CommentEntry object.
 */
function buildCommentEntry(
    userId: string,
    userName: string,
    content: string,
    timestamp: string
): CommentEntry
{
    return {
        id: generateId(),
        userId,
        userName,
        content,
        timestamp,
        edited: false,
    };
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Creates a new DiagramEngine and mounts it into the given container.
 *
 * @param container - Container element or its ID string.
 * @param options - Engine configuration options.
 * @returns A DiagramEngineImpl instance with the full public API.
 * @throws Error if the container element is not found.
 */
export function createDiagramEngine(
    container: string | HTMLElement,
    options: DiagramEngineOptions = {}
): DiagramEngineImpl
{
    let el: HTMLElement;

    if (typeof container === "string")
    {
        const found = document.getElementById(container);

        if (!found)
        {
            throw new Error(
                `${LOG_PREFIX} Container not found: ${container}`
            );
        }

        el = found;
    }
    else
    {
        el = container;
    }

    return new DiagramEngineImpl(el, options);
}

// ============================================================================
// WINDOW GLOBALS
// ============================================================================

(window as unknown as Record<string, unknown>)["DiagramEngine"] =
    DiagramEngineImpl;
(window as unknown as Record<string, unknown>)["createDiagramEngine"] =
    createDiagramEngine;
