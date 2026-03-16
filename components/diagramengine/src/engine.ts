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
    private dirty = false;
    private changeCount = 0;
    private themeObserver: MutationObserver | null = null;
    private destroyed = false;

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
        const visible = this.getVisibleObjects();

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
     * Re-renders the object and any attached connectors.
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

        obj.presentation.bounds.x = pos.x;
        obj.presentation.bounds.y = pos.y;
        this.rerenderObject(obj);
        this.rerenderAttachedConnectors(id);
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
     * Deletes all selected objects and their attached connectors.
     */
    deleteSelected(): void
    {
        const ids = Array.from(this.selectedIds);

        for (const id of ids)
        {
            this.removeAttachedConnectors(id);
            this.removeObjectInternal(id);
        }

        this.selectedIds.clear();
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
     * Pans the canvas viewport by a screen-space delta.
     *
     * @param dx - Horizontal delta in screen pixels.
     * @param dy - Vertical delta in screen pixels.
     */
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
            Object.assign(obj.presentation, changes.presentation);
        }

        this.rerenderObject(obj);
        this.markDirty();
        this.events.emit("object:change", obj);
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
    // PUBLIC API — EXPORT
    // ========================================================================

    /**
     * Exports the canvas as an SVG string.
     *
     * @returns SVG markup string.
     */
    exportSVG(): string
    {
        return new XMLSerializer().serializeToString(
            this.renderer.getSvgElement()
        );
    }

    /**
     * Exports the document as a pretty-printed JSON string.
     *
     * @returns JSON string with 2-space indentation.
     */
    exportJSON(): string
    {
        return this.toJSON(2);
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
        this.toolManager.register(new MeasureTool(this));
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
     * Handles mousedown on the canvas. Dispatches to the active tool.
     * Middle-click activates the pan tool temporarily.
     */
    private onMouseDown(e: MouseEvent): void
    {
        this.endInlineTextEdit();

        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);

        if (e.button === 1)
        {
            this.toolManager.setActive("pan");
        }

        this.toolManager.dispatchMouseDown(e, pos);
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
     *
     * @param e - The keyboard event.
     * @returns true if a global shortcut was handled.
     */
    private handleGlobalShortcut(e: KeyboardEvent): boolean
    {
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
     * Handles double-click. Opens inline text editing or delegates
     * to the consumer's onObjectDoubleClick callback.
     */
    private onDoubleClick(e: MouseEvent): void
    {
        const pos = this.renderer.screenToCanvas(e.clientX, e.clientY);
        const obj = this.hitTestObject(pos);

        if (!obj)
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
     */
    private refreshSelectionVisuals(): void
    {
        const selected = this.getSelectedObjects();
        this.renderer.renderSelectionHandles(selected);
        safeCallback(this.opts.onSelectionChange, selected, []);
        this.events.emit("selection:change", selected);
    }

    // ========================================================================
    // PRIVATE — DOCUMENT HELPERS
    // ========================================================================

    /**
     * Returns all visible objects, sorted by z-index.
     *
     * @returns Array of visible objects in z-order.
     */
    private getVisibleObjects(): DiagramObject[]
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
