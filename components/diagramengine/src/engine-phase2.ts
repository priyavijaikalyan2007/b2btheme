/*
 * ----------------------------------------------------------------------------
 * COMPONENT: DiagramEngine Phase 2 Extensions
 * PURPOSE: Group/ungroup, clipboard (copy/cut/paste/duplicate), flip,
 *    rotation, alignment, distribution, layer management, lock/unlock,
 *    opacity, visibility, and draw-shape operations. Methods are added
 *    to DiagramEngineImpl.prototype so they become available on all
 *    engine instances without modifying the base engine file.
 * RELATES: [[DiagramEngine]], [[RenderEngine]], [[ToolManager]]
 * FLOW: [Consumer API] -> [Phase2 Methods] -> [Engine internals]
 * ----------------------------------------------------------------------------
 */

// @entrypoint

// ============================================================================
// CONSTANTS
// ============================================================================

/** Log prefix for phase 2 console messages. */
const P2_LOG = "[DiagramEngine:P2]";

/**
 * Accessor type for engine internals. Since phase 2 methods are added
 * to the prototype of DiagramEngineImpl, they need access to private
 * methods (markDirty, reRenderAll). TypeScript's private is compile-
 * time only; at runtime these are plain properties. This type enables
 * safe access without modifying the base class.
 */
type EngineInternals = DiagramEngineImpl & {
    markDirty(): void;
    reRenderAll(): void;
    toolManager: { get(name: string): (Tool & { setShapeType?: (t: string) => void }) | null };
};

/** Pixel offset applied to pasted objects for visual displacement. */
const PASTE_OFFSET = 20;

/** Minimum number of objects required for distribute operations. */
const MIN_DISTRIBUTE_COUNT = 3;

// ============================================================================
// HELPERS — GEOMETRY
// ============================================================================

/**
 * Computes the axis-aligned bounding box of multiple objects.
 *
 * @param objects - Array of diagram objects to bound.
 * @returns A Rect enclosing all objects.
 */
function computeBoundingBox(objects: DiagramObject[]): Rect
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
 * Returns the centre x coordinate of an object's bounds.
 *
 * @param obj - The diagram object.
 * @returns Horizontal centre in canvas coordinates.
 */
function centerX(obj: DiagramObject): number
{
    return obj.presentation.bounds.x + obj.presentation.bounds.width / 2;
}

/**
 * Returns the centre y coordinate of an object's bounds.
 *
 * @param obj - The diagram object.
 * @returns Vertical centre in canvas coordinates.
 */
function centerY(obj: DiagramObject): number
{
    return obj.presentation.bounds.y + obj.presentation.bounds.height / 2;
}

// ============================================================================
// HELPERS — OBJECT RESOLUTION
// ============================================================================

/**
 * Resolves an array of IDs to their DiagramObject references.
 * Skips IDs that do not match any object in the document.
 *
 * @param engine - The engine instance.
 * @param ids - Object IDs to resolve.
 * @returns Array of found DiagramObject instances.
 */
function resolveObjects(
    engine: DiagramEngineImpl,
    ids: string[]
): DiagramObject[]
{
    const result: DiagramObject[] = [];

    for (const id of ids)
    {
        const obj = engine.getObjectById(id);

        if (obj)
        {
            result.push(obj);
        }
    }

    return result;
}

/**
 * Computes the next available zIndex across all objects.
 *
 * @param engine - The engine instance.
 * @returns One above the current maximum zIndex.
 */
function maxZIndex(engine: DiagramEngineImpl): number
{
    const objects = engine.getObjects();

    if (objects.length === 0)
    {
        return 0;
    }

    let max = -Infinity;

    for (const obj of objects)
    {
        if (obj.presentation.zIndex > max)
        {
            max = obj.presentation.zIndex;
        }
    }

    return max;
}

/**
 * Computes the minimum zIndex across all objects.
 *
 * @param engine - The engine instance.
 * @returns The current minimum zIndex.
 */
function minZIndex(engine: DiagramEngineImpl): number
{
    const objects = engine.getObjects();

    if (objects.length === 0)
    {
        return 0;
    }

    let min = Infinity;

    for (const obj of objects)
    {
        if (obj.presentation.zIndex < min)
        {
            min = obj.presentation.zIndex;
        }
    }

    return min;
}

// ============================================================================
// HELPERS — DEEP CLONE
// ============================================================================

/**
 * Creates an independent deep copy of a diagram object via JSON round-trip.
 *
 * @param obj - Object to clone.
 * @returns A deep copy with no shared references.
 */
function deepCloneObject(obj: DiagramObject): DiagramObject
{
    return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// GROUP / UNGROUP
// ============================================================================

/**
 * Groups selected objects into a new group object. The group's bounds
 * are the bounding box of all children. Each child's groupId is set
 * to the new group's ID.
 *
 * @param ids - IDs of objects to group.
 * @returns The newly created group object.
 */
function engineGroup(this: DiagramEngineImpl, ids: string[]): DiagramObject
{
    const self = this as unknown as EngineInternals;
    const children = resolveObjects(this, ids);

    if (children.length === 0)
    {
        console.warn(P2_LOG, "group: no valid objects for given IDs");
        return this.addObject({});
    }

    const bounds = computeBoundingBox(children);
    const group = this.addObject({
        semantic: { type: "group", data: {} },
        presentation: { shape: "rectangle", bounds, visible: true },
    });

    for (const child of children)
    {
        child.presentation.groupId = group.id;
    }

    self.markDirty();
    console.log(P2_LOG, "Grouped", children.length, "objects into", group.id);
    return group;
}

/**
 * Removes a group object and clears the groupId on all its children.
 *
 * @param groupId - ID of the group to dissolve.
 * @returns Array of former child objects.
 */
function engineUngroup(
    this: DiagramEngineImpl,
    groupId: string
): DiagramObject[]
{
    const children = this.getObjects().filter(
        (o) => o.presentation.groupId === groupId
    );

    for (const child of children)
    {
        child.presentation.groupId = undefined;
    }

    this.removeObject(groupId);
    (this as unknown as EngineInternals).markDirty();
    console.log(P2_LOG, "Ungrouped", groupId, "->", children.length, "children");
    return children;
}

// ============================================================================
// FLIP
// ============================================================================

/**
 * Toggles horizontal flip on each specified object and re-renders.
 *
 * @param ids - Object IDs to flip horizontally.
 */
function engineFlipHorizontal(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.flipX = !obj.presentation.flipX;
    }

    self.reRenderAll();
    self.markDirty();
}

/**
 * Toggles vertical flip on each specified object and re-renders.
 *
 * @param ids - Object IDs to flip vertically.
 */
function engineFlipVertical(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.flipY = !obj.presentation.flipY;
    }

    self.reRenderAll();
    self.markDirty();
}

// ============================================================================
// ROTATION
// ============================================================================

/**
 * Adds a rotation delta to each specified object. The value wraps
 * within 0-360 degrees. Locked objects are skipped.
 *
 * @param ids - Object IDs to rotate.
 * @param degrees - Degrees to add (positive = clockwise).
 */
function engineRotateObjects(
    this: DiagramEngineImpl,
    ids: string[],
    degrees: number
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        if (obj.presentation.locked)
        {
            continue;
        }

        const raw = (obj.presentation.rotation + degrees) % 360;
        obj.presentation.rotation = (raw + 360) % 360;
    }

    self.reRenderAll();
    self.markDirty();
}

// ============================================================================
// CLIPBOARD — INTERNAL STATE
// ============================================================================

/**
 * Module-level clipboard storage. Holds deep-cloned objects between
 * copy and paste operations. Shared across all engine instances.
 */
let clipboardStore: DiagramObject[] = [];

// ============================================================================
// CLIPBOARD — COPY / CUT / PASTE / DUPLICATE
// ============================================================================

/**
 * Deep-clones the currently selected objects into the clipboard.
 */
function engineCopy(this: DiagramEngineImpl): void
{
    const selected = this.getSelectedObjects();
    clipboardStore = selected.map(deepCloneObject);
    console.log(P2_LOG, "Copied", clipboardStore.length, "objects");
}

/**
 * Copies selected objects to the clipboard then deletes them.
 */
function engineCut(this: DiagramEngineImpl): void
{
    engineCopy.call(this);
    this.deleteSelected();
    console.log(P2_LOG, "Cut", clipboardStore.length, "objects");
}

/**
 * Assigns a new unique ID to a cloned object for paste.
 *
 * @param obj - The cloned object to re-identify.
 * @returns The object with a fresh ID.
 */
function assignNewId(obj: DiagramObject): DiagramObject
{
    obj.id = generateId();
    return obj;
}

/**
 * Places clipboard contents onto the canvas with a positional offset.
 * Newly pasted objects are selected; previous selection is cleared.
 */
function enginePaste(this: DiagramEngineImpl): void
{
    if (clipboardStore.length === 0)
    {
        console.warn(P2_LOG, "paste: clipboard is empty");
        return;
    }

    const newIds: string[] = [];

    for (const template of clipboardStore)
    {
        const clone = assignNewId(deepCloneObject(template));
        clone.presentation.bounds.x += PASTE_OFFSET;
        clone.presentation.bounds.y += PASTE_OFFSET;
        const added = this.addObject({ ...clone, id: clone.id });
        newIds.push(added.id);
    }

    this.select(newIds);
    (this as unknown as EngineInternals).markDirty();
    console.log(P2_LOG, "Pasted", newIds.length, "objects");
}

/**
 * Copies then immediately pastes the selected objects.
 */
function engineDuplicate(this: DiagramEngineImpl): void
{
    engineCopy.call(this);
    enginePaste.call(this);
}

// ============================================================================
// ALIGNMENT
// ============================================================================

/**
 * Aligns objects along one axis edge relative to the collective
 * bounding box. Locked objects are skipped during positioning
 * but contribute to bounding box computation.
 *
 * @param ids - Object IDs to align.
 * @param alignment - Alignment edge or centre.
 */
function engineAlignObjects(
    this: DiagramEngineImpl,
    ids: string[],
    alignment: AlignmentType
): void
{
    const objects = resolveObjects(this, ids);

    if (objects.length < 2)
    {
        return;
    }

    const bbox = computeBoundingBox(objects);
    applyAlignment(this, objects, alignment, bbox);
    (this as unknown as EngineInternals).markDirty();
}

/**
 * Applies the computed alignment offset to each unlocked object.
 *
 * @param engine - The engine instance for re-rendering.
 * @param objects - Objects to reposition.
 * @param alignment - The target alignment.
 * @param bbox - Bounding box of all objects.
 */
function applyAlignment(
    engine: DiagramEngineImpl,
    objects: DiagramObject[],
    alignment: AlignmentType,
    bbox: Rect
): void
{
    for (const obj of objects)
    {
        if (obj.presentation.locked)
        {
            continue;
        }

        const b = obj.presentation.bounds;
        const pos = computeAlignedPosition(b, alignment, bbox);
        engine.moveObjectTo(obj.id, pos);
    }
}

/**
 * Computes the aligned x coordinate for horizontal alignments.
 *
 * @param bx - Object's current x position.
 * @param bw - Object's width.
 * @param alignment - Alignment type.
 * @param bbox - Collective bounding box.
 * @returns Aligned x coordinate.
 */
function alignedX(bx: number, bw: number, alignment: AlignmentType, bbox: Rect): number
{
    if (alignment === "left") { return bbox.x; }
    if (alignment === "center") { return bbox.x + (bbox.width - bw) / 2; }
    if (alignment === "right") { return bbox.x + bbox.width - bw; }
    return bx;
}

/**
 * Computes the aligned y coordinate for vertical alignments.
 *
 * @param by - Object's current y position.
 * @param bh - Object's height.
 * @param alignment - Alignment type.
 * @param bbox - Collective bounding box.
 * @returns Aligned y coordinate.
 */
function alignedY(by: number, bh: number, alignment: AlignmentType, bbox: Rect): number
{
    if (alignment === "top") { return bbox.y; }
    if (alignment === "middle") { return bbox.y + (bbox.height - bh) / 2; }
    if (alignment === "bottom") { return bbox.y + bbox.height - bh; }
    return by;
}

/**
 * Computes the new position for a single object given an alignment target.
 *
 * @param b - Object's current bounds.
 * @param alignment - Alignment type.
 * @param bbox - Collective bounding box.
 * @returns New position for the object.
 */
function computeAlignedPosition(
    b: Rect,
    alignment: AlignmentType,
    bbox: Rect
): { x: number; y: number }
{
    return {
        x: alignedX(b.x, b.width, alignment, bbox),
        y: alignedY(b.y, b.height, alignment, bbox),
    };
}

// ============================================================================
// DISTRIBUTION
// ============================================================================

/**
 * Distributes objects evenly along an axis. Requires at least three
 * objects; fewer than three is a no-op. Locked objects contribute
 * to spacing computation but are not moved.
 *
 * @param ids - Object IDs to distribute.
 * @param axis - Distribution axis.
 */
function engineDistributeObjects(
    this: DiagramEngineImpl,
    ids: string[],
    axis: "horizontal" | "vertical"
): void
{
    const objects = resolveObjects(this, ids);

    if (objects.length < MIN_DISTRIBUTE_COUNT)
    {
        return;
    }

    if (axis === "horizontal")
    {
        distributeHorizontal(this, objects);
    }
    else
    {
        distributeVertical(this, objects);
    }

    (this as unknown as EngineInternals).markDirty();
}

/**
 * Distributes objects horizontally with equal spacing between centres.
 *
 * @param engine - Engine instance for re-rendering.
 * @param objects - Objects to distribute.
 */
function distributeHorizontal(
    engine: DiagramEngineImpl,
    objects: DiagramObject[]
): void
{
    const sorted = [...objects].sort((a, b) => centerX(a) - centerX(b));
    const first = centerX(sorted[0]);
    const last = centerX(sorted[sorted.length - 1]);
    const step = (last - first) / (sorted.length - 1);

    for (let i = 1; i < sorted.length - 1; i++)
    {
        const obj = sorted[i];

        if (obj.presentation.locked)
        {
            continue;
        }

        const targetCx = first + step * i;
        const newX = targetCx - obj.presentation.bounds.width / 2;
        engine.moveObjectTo(obj.id, { x: newX, y: obj.presentation.bounds.y });
    }
}

/**
 * Distributes objects vertically with equal spacing between centres.
 *
 * @param engine - Engine instance for re-rendering.
 * @param objects - Objects to distribute.
 */
function distributeVertical(
    engine: DiagramEngineImpl,
    objects: DiagramObject[]
): void
{
    const sorted = [...objects].sort((a, b) => centerY(a) - centerY(b));
    const first = centerY(sorted[0]);
    const last = centerY(sorted[sorted.length - 1]);
    const step = (last - first) / (sorted.length - 1);

    for (let i = 1; i < sorted.length - 1; i++)
    {
        const obj = sorted[i];

        if (obj.presentation.locked)
        {
            continue;
        }

        const targetCy = first + step * i;
        const newY = targetCy - obj.presentation.bounds.height / 2;
        engine.moveObjectTo(obj.id, { x: obj.presentation.bounds.x, y: newY });
    }
}

// ============================================================================
// LAYER MANAGEMENT (Z-ORDER)
// ============================================================================

/**
 * Sets the zIndex of each specified object above all others.
 *
 * @param ids - Object IDs to bring to the front.
 */
function engineBringToFront(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);
    let top = maxZIndex(this) + 1;

    for (const obj of objects)
    {
        obj.presentation.zIndex = top++;
    }

    self.reRenderAll();
    self.markDirty();
}

/**
 * Sets the zIndex of each specified object below all others.
 *
 * @param ids - Object IDs to send to the back.
 */
function engineSendToBack(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);
    let bottom = minZIndex(this) - ids.length;

    for (const obj of objects)
    {
        obj.presentation.zIndex = bottom++;
    }

    self.reRenderAll();
    self.markDirty();
}

/**
 * Increments the zIndex of each specified object by one.
 *
 * @param ids - Object IDs to bring one step forward.
 */
function engineBringForward(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.zIndex += 1;
    }

    self.reRenderAll();
    self.markDirty();
}

/**
 * Decrements the zIndex of each specified object by one.
 *
 * @param ids - Object IDs to send one step backward.
 */
function engineSendBackward(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.zIndex -= 1;
    }

    self.reRenderAll();
    self.markDirty();
}

// ============================================================================
// LAYER MANAGEMENT (DOCUMENT LAYERS)
// ============================================================================

/**
 * Adds a new layer to the document. Missing fields are filled with
 * defaults. The renderer creates a corresponding SVG group element.
 *
 * @param partial - Partial layer definition.
 * @returns The fully constructed Layer.
 */
function engineAddLayer(
    this: DiagramEngineImpl,
    partial: Partial<Layer>
): Layer
{
    const doc = this.getDocument();
    const order = doc.layers.length;

    const layer: Layer = {
        id: partial.id ?? generateId(),
        name: partial.name ?? `Layer ${order + 1}`,
        visible: partial.visible ?? true,
        locked: partial.locked ?? false,
        printable: partial.printable ?? true,
        opacity: partial.opacity ?? 1,
        order: partial.order ?? order,
    };

    return addLayerToDoc(this, layer);
}

/**
 * Inserts a layer into the document and creates its SVG element.
 *
 * @param engine - The engine instance.
 * @param layer - The layer to insert.
 * @returns The inserted layer.
 */
function addLayerToDoc(
    engine: DiagramEngineImpl,
    layer: Layer
): Layer
{
    const doc = engine.getDocument();
    doc.layers.push(layer);
    engine.setDocument(doc);
    console.log(P2_LOG, "Layer added:", layer.id, layer.name);
    return layer;
}

/**
 * Removes a layer from the document. Objects on the removed layer
 * are reassigned to the default layer. The default layer itself
 * cannot be removed.
 *
 * @param id - ID of the layer to remove.
 */
function engineRemoveLayer(
    this: DiagramEngineImpl,
    id: string
): void
{
    if (id === DEFAULT_LAYER_ID)
    {
        console.warn(P2_LOG, "Cannot remove the default layer");
        return;
    }

    reassignLayerObjects(this, id);
    removeLayerFromDoc(this, id);
}

/**
 * Moves all objects from a layer to the default layer.
 *
 * @param engine - The engine instance.
 * @param layerId - Layer being removed.
 */
function reassignLayerObjects(
    engine: DiagramEngineImpl,
    layerId: string
): void
{
    const objects = engine.getObjects();

    for (const obj of objects)
    {
        if (obj.presentation.layer === layerId)
        {
            obj.presentation.layer = DEFAULT_LAYER_ID;
        }
    }
}

/**
 * Deletes the layer record from the document and its SVG element.
 *
 * @param engine - The engine instance.
 * @param layerId - Layer to delete.
 */
function removeLayerFromDoc(
    engine: DiagramEngineImpl,
    layerId: string
): void
{
    const doc = engine.getDocument();
    doc.layers = doc.layers.filter((l) => l.id !== layerId);
    engine.setDocument(doc);
    console.log(P2_LOG, "Layer removed:", layerId);
}

/**
 * Returns all layers in the document.
 *
 * @returns Array of Layer definitions.
 */
function engineGetLayers(this: DiagramEngineImpl): Layer[]
{
    return this.getDocument().layers;
}

// ============================================================================
// LOCK / UNLOCK
// ============================================================================

/**
 * Sets locked to true on each specified object. Locked objects
 * cannot be moved, resized, or edited via tool interactions.
 *
 * @param ids - Object IDs to lock.
 */
function engineLockObjects(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.locked = true;
    }

    (this as unknown as EngineInternals).markDirty();
    console.log(P2_LOG, "Locked", objects.length, "objects");
}

/**
 * Sets locked to false on each specified object.
 *
 * @param ids - Object IDs to unlock.
 */
function engineUnlockObjects(
    this: DiagramEngineImpl,
    ids: string[]
): void
{
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.locked = false;
    }

    (this as unknown as EngineInternals).markDirty();
    console.log(P2_LOG, "Unlocked", objects.length, "objects");
}

// ============================================================================
// OPACITY
// ============================================================================

/**
 * Clamps a value between 0 and 1 inclusive.
 *
 * @param v - The value to clamp.
 * @returns A number in the range [0, 1].
 */
function clampOpacity(v: number): number
{
    return Math.max(0, Math.min(1, v));
}

/**
 * Sets the opacity on each specified object's style, clamped to 0-1.
 * Re-renders affected objects immediately.
 *
 * @param ids - Object IDs to update.
 * @param opacity - Desired opacity value (0 = transparent, 1 = opaque).
 */
function engineSetObjectOpacity(
    this: DiagramEngineImpl,
    ids: string[],
    opacity: number
): void
{
    const self = this as unknown as EngineInternals;
    const clamped = clampOpacity(opacity);
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        if (!obj.presentation.style)
        {
            obj.presentation.style = {};
        }

        obj.presentation.style.opacity = clamped;
    }

    self.reRenderAll();
    self.markDirty();
}

// ============================================================================
// VISIBILITY
// ============================================================================

/**
 * Toggles object visibility. Hidden objects are removed from the SVG;
 * shown objects are re-rendered into their layer.
 *
 * @param ids - Object IDs to update.
 * @param visible - true to show, false to hide.
 */
function engineSetObjectVisible(
    this: DiagramEngineImpl,
    ids: string[],
    visible: boolean
): void
{
    const self = this as unknown as EngineInternals;
    const objects = resolveObjects(this, ids);

    for (const obj of objects)
    {
        obj.presentation.visible = visible;
    }

    self.reRenderAll();
    self.markDirty();
}

// ============================================================================
// DRAW SHAPE
// ============================================================================

/**
 * Switches the active tool to the draw tool and configures it to
 * draw the specified shape type. If no draw tool is registered,
 * logs a warning.
 *
 * @param type - Shape type string (e.g. "rectangle", "ellipse").
 */
function engineSetDrawShape(
    this: DiagramEngineImpl,
    type: string
): void
{
    const self = this as unknown as EngineInternals;
    this.setActiveTool("draw");
    const tool = self.toolManager.get("draw");

    if (tool && typeof tool.setShapeType === "function")
    {
        tool.setShapeType(type);
        console.log(P2_LOG, "Draw shape set to:", type);
    }
    else
    {
        console.warn(P2_LOG, "DrawTool not registered; cannot set shape:", type);
    }
}

// ============================================================================
// PROTOTYPE AUGMENTATION
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

const proto = DiagramEngineImpl.prototype as any;

// Group / ungroup
proto.group = engineGroup;
proto.ungroup = engineUngroup;

// Flip
proto.flipHorizontal = engineFlipHorizontal;
proto.flipVertical = engineFlipVertical;

// Rotation
proto.rotateObjects = engineRotateObjects;

// Clipboard
proto.copy = engineCopy;
proto.cut = engineCut;
proto.paste = enginePaste;
proto.duplicate = engineDuplicate;

// Alignment & distribution
proto.alignObjects = engineAlignObjects;
proto.distributeObjects = engineDistributeObjects;

// Z-order
proto.bringToFront = engineBringToFront;
proto.sendToBack = engineSendToBack;
proto.bringForward = engineBringForward;
proto.sendBackward = engineSendBackward;

// Layer management
proto.addLayer = engineAddLayer;
proto.removeLayer = engineRemoveLayer;
proto.getLayers = engineGetLayers;

// Lock / unlock
proto.lockObjects = engineLockObjects;
proto.unlockObjects = engineUnlockObjects;

// Opacity & visibility
proto.setObjectOpacity = engineSetObjectOpacity;
proto.setObjectVisible = engineSetObjectVisible;

// Draw shape
proto.setDrawShape = engineSetDrawShape;

/* eslint-enable @typescript-eslint/no-explicit-any */
