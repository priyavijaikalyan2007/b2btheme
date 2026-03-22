<!-- AGENT: PRD for the DiagramEngine component — universal vector canvas for diagramming, graph visualization, technical drawing, poster creation, and embedded document surfaces. -->

# DiagramEngine Component

**Status:** Draft
**Component name:** DiagramEngine
**Folder:** `./components/diagramengine/`
**Spec author:** Agent + User
**Date:** 2026-03-15

---

## 1. Overview

### 1.1 What Is It

A universal vector canvas engine that serves as the rendering, interaction, and data foundation for diagramming, graph visualization, technical drawing, poster creation, typesetting, and any application requiring a rich, interactive 2D surface with structured objects.

DiagramEngine is **not** a diagramming app. It is a **headless engine with an API**. It provides:

- An SVG-based render engine with theme-native colors, shadows, filters, and rich text on every surface.
- A document model that separates **semantic data** (what objects mean in the domain) from **presentation data** (how they look on the canvas).
- A shape system with a registry of stencil packs that can be loaded additively.
- A tool system for selection, drawing, connecting, panning, zooming, measuring, and freeform path editing.
- A visual guide system with alignment, spacing, sizing, and ruler guides.
- A template engine with `{{variable}}` data binding for title blocks and dynamic content.
- Layout algorithm integration (pluggable, using maxGraph or custom implementations).
- Undo/redo, serialization, event bus, and layer management.

The engine does not provide toolbars, property panels, stencil palettes, or any other application chrome. Consuming applications compose their own UX around the engine using existing component library components (Toolbar, Ribbon, PropertyInspector, ColorPicker, FontDropdown, MarkdownEditor, etc.).

### 1.2 Why Build It

The current diagramming infrastructure relies on maxGraph (via the GraphCanvasMx component). After extensive use in the Diagrams app, maxGraph has proven to have fundamental limitations:

| Limitation | Impact |
|---|---|
| Shadow SVG filters destroyed on every `view.validate()` | Requires monkey-patching core maxGraph method across 17+ call sites |
| Style application inconsistency | Must apply styles 3 different ways per property change |
| No extensible property model | Custom properties hacked via prefixed cell attributes (`customShadow_color`, etc.) |
| Missing ER notation arrow markers | Fundamental diagramming primitives unavailable, mapped to fallbacks |
| Only one edge style supports draggable waypoints | Severe UX limitation for a drawing tool |
| Style string/object format duality | Constant conversion between incompatible formats |
| Freestanding lines require geometry hacking | Basic capability needs workarounds |
| No rich text in nodes/edges | Single-line plain labels only |
| No text-along-path | WordArt/decorative text impossible |
| No per-object shadow control | Shadows are all-or-nothing with manual SVG filter management |
| No semantic data layer | Domain meaning lost — objects are just shapes with strings |

A custom engine eliminates all of these by design, provides a cleaner API surface, integrates natively with the theme system (`var(--theme-*)` tokens), and serves as a single foundation for multiple apps (Diagrams, Thinker, graph viewers, embedded document surfaces).

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|---|---|
| Google Drawings | Simplicity, embeddability, collaboration-ready, smart guides |
| Microsoft Visio | Stencil libraries, connector routing, data-linked shapes, layers |
| Figma | Precise layout, constraints, vector editing, alignment/spacing guides, component instances |
| Harvard Graphics | Chart/data visualization integration in a drawing surface |
| Vexlio | Clean vector drawing, Boolean operations, path editing |
| AutoCAD | Measurements, snapping, precision, grid systems, dimension annotations |
| Draw.io | Diagram templates, shape libraries, export variety, connector routing |
| Canva | Templates, rich text, image handling, accessibility |
| Bentley MicroStation | Title blocks with variable binding, sheet composition |
| Google Slides | Smart spacing guides, equal-gap detection during drag |

### 1.4 Core Design Principles

1. **No personas, no modes.** All capabilities are available simultaneously. A user can place a UML class diagram, a WordArt title, measurement annotations, and a data-bound title block on the same canvas. Shape libraries are loaded additively, not exclusively.

2. **Engine is headless.** No embedded toolbars, property panels, or stencil palettes. The engine is a rendering and interaction surface with an API. Apps compose their own UX.

3. **All text is rich.** Every text surface — shape labels, connector labels, measurement annotations, title block fields — supports bold, italic, color, font, size, shadow. WordArt (text-along-path) is an additional decorative capability, not a separate text tier.

4. **Semantic + presentation split.** Every object carries domain meaning (what it represents) separate from visual appearance (how it looks). A sequence diagram arrow carries `{ messageName: "login", messageType: "synchronous" }` in its semantic layer, not just a label string.

5. **Capabilities are additive.** The engine exposes capabilities; apps choose which to use. If you don't enable the connector tool, there's no connector tool. If you don't load the UML stencil pack, there are no UML shapes. Nothing needs to be "turned off" — it's simply not activated.

6. **Theme-native.** All rendering uses `var(--theme-*)` CSS custom properties directly. No `resolveThemeColor()` hacks. No rebuild on theme change.

---

## 2. Architecture

### 2.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Consuming Applications                                 │
│  (Diagrams, Thinker, Graph Viewer, Poster Editor, ...)  │
│  Each app composes its own UI around the engine using   │
│  existing components (Toolbar, Ribbon, PropertyInspector,│
│  MarkdownEditor, ColorPicker, FontDropdown, etc.)       │
├─────────────────────────────────────────────────────────┤
│  DiagramEngine Public API                               │
│  create, configure, manipulate, observe, query, export  │
├─────────────────────────────────────────────────────────┤
│  Internal Layers (not exposed as separate APIs)         │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool System                                      │  │
│  │  SelectTool, DrawTool, ConnectorTool, TextTool,   │  │
│  │  PanTool, ZoomTool, MeasureTool, PenTool          │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Shape System                                     │  │
│  │  ShapeRegistry, stencil packs, resize behaviors,  │  │
│  │  connection ports, property schemas                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Visual Guide System                              │  │
│  │  Alignment, spacing, sizing, ruler guides,         │  │
│  │  grid snap, object snap, smart guides              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Template & Data Binding Engine                   │  │
│  │  {{variable}} resolution, filters, title blocks,  │  │
│  │  pinned regions, data context, live refresh        │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Render Engine (SVG DOM)                          │  │
│  │  Shape rendering, text engine (rich + WordArt),   │  │
│  │  shadow/filter pipeline, viewport transforms,      │  │
│  │  hit testing, theming                              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │  Document Model (Observable)                      │  │
│  │  Objects, connectors, groups, layers, properties, │  │
│  │  undo/redo, serialization, change events          │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Each internal layer depends only on the one below it. The public API is the sole interface for consuming applications.

### 2.2 Dependency Direction

```
Tool System → Shape System → Render Engine → Document Model
                    ↓
            Visual Guide System → Render Engine
                    ↓
            Template Engine → Document Model
```

No circular dependencies. The Document Model is the foundation with zero upward dependencies.

---

## 3. Document Model

### 3.1 Object Model

Every object on the canvas has a dual-layer structure:

```typescript
interface DiagramObject
{
    // ── Identity ──
    id: string;

    // ── Semantic Layer ──
    semantic:
    {
        /** Domain type (e.g., "uml.class", "bpmn.task", "sequence.actor",
         *  "network.server", "er.entity", "custom"). */
        type: string;

        /** Domain-specific structured data. Schema varies by type. */
        data: Record<string, unknown>;

        /** Links to external entities (APIs, databases, repos, tickets). */
        references?: ResourceReference[];

        /** Tags for filtering, search, categorization. */
        tags?: string[];

        /** Connector IDs this object participates in. */
        relationships?: string[];
    };

    // ── Presentation Layer ──
    presentation:
    {
        /** Shape type from the shape registry. */
        shape: string;

        /** Position and size on the canvas. */
        bounds: Rect;

        /** Rotation in degrees (0-360, clockwise). */
        rotation: number;

        /** Horizontal flip (mirror left-right). */
        flipX: boolean;

        /** Vertical flip (mirror top-bottom). */
        flipY: boolean;

        /** Visual styling. */
        style: ObjectStyle;

        /** Rich text content (applies to all text surfaces). */
        textContent?: TextContent;

        /** WordArt path for decorative text rendering. */
        textPath?: PathDefinition;

        /** Layer membership. */
        layer: string;

        /** Stacking order. */
        zIndex: number;

        /** Interaction state. */
        locked: boolean;
        visible: boolean;

        /** Pin to canvas edge (for title blocks). */
        anchor?: AnchorConstraint;

        /** Parent group ID. */
        groupId?: string;

        /** Data bindings for template variables. */
        dataBindings?: DataBinding[];

        /** Image properties (only for shape: "image"). */
        image?: ImageStyle;

        /** Render style override (clean or sketch). Inherits from document if omitted. */
        renderStyle?: "clean" | "sketch";

        /** Shape-specific parametric values (for control points). */
        parameters?: Record<string, number | Point>;
    };
}
```

### 3.2 Connector Model

Connectors are first-class objects with their own semantic and presentation layers:

```typescript
interface DiagramConnector
{
    id: string;

    // ── Semantic Layer ──
    semantic:
    {
        /** Domain type (e.g., "sequence.message", "er.relationship",
         *  "uml.association", "dependency", "data-flow"). */
        type: string;

        /** Structured domain data. */
        data: Record<string, unknown>;

        /** Source and target semantic references. */
        sourceRef: string;
        targetRef: string;

        /** Directionality. */
        direction: "forward" | "reverse" | "bidirectional" | "none";

        references?: ResourceReference[];
        tags?: string[];
    };

    // ── Presentation Layer ──
    presentation:
    {
        /** Visual source and target object IDs. */
        sourceId: string;
        targetId: string;

        /** Connection port identifiers. */
        sourcePort?: string;
        targetPort?: string;

        /** Terminal points for freestanding lines. */
        sourcePoint?: Point;
        targetPoint?: Point;

        /** User-placed intermediate control points. */
        waypoints: Point[];

        /** Routing algorithm. */
        routing: RoutingStyle;

        /** Visual styling (stroke, dash, arrows, shadow). */
        style: ConnectorStyle;

        /** Positioned labels (start, middle, end). */
        labels: ConnectorLabel[];
    };
}
```

### 3.3 Supporting Types

```typescript
interface Rect { x: number; y: number; width: number; height: number; }
interface Point { x: number; y: number; }

interface ObjectStyle
{
    fill?: FillStyle;
    stroke?: StrokeStyle;
    /** Independent per-edge stroke control. Overrides `stroke` for individual edges.
     *  Enables: three-sided boxes, accent borders, fade effects. */
    perEdgeStroke?: PerEdgeStroke;
    shadow?: ShadowStyle;
    opacity?: number;
    filters?: string[];             // SVG filter references
}

interface FillStyle
{
    type: "solid" | "gradient" | "pattern" | "none";
    color?: string;                 // var(--theme-*) or hex
    gradient?: GradientDefinition;
    pattern?: PatternDefinition;
}

interface GradientDefinition
{
    /** Gradient type. */
    type: "linear" | "radial";

    /** Gradient stops (position 0-1, color). */
    stops: { offset: number; color: string }[];

    /** Angle in degrees (linear only). Default: 0 (left to right). */
    angle?: number;

    /** Center point for radial gradients (0-1 normalized). */
    center?: { x: number; y: number };

    /** Radius for radial gradients (0-1 normalized). */
    radius?: number;
}

interface PatternDefinition
{
    /** Pattern type. */
    type: "hatch" | "cross-hatch" | "dots" | "checkerboard" | "custom";

    /** Foreground color. */
    color: string;

    /** Background color. */
    backgroundColor?: string;

    /** Pattern spacing. */
    spacing: number;

    /** Pattern angle (for hatch). */
    angle?: number;

    /** Custom SVG pattern content (for type: "custom"). */
    svg?: string;
}

interface StrokeStyle
{
    color: string | GradientDefinition;   // Solid color or gradient stroke
    width: number;
    dashPattern?: number[];         // e.g., [6, 3] for dashed
    lineCap?: "butt" | "round" | "square";
    lineJoin?: "miter" | "round" | "bevel";
}

/** Per-edge stroke control for shapes with independent edge styling. */
interface PerEdgeStroke
{
    top?: EdgeStroke;
    right?: EdgeStroke;
    bottom?: EdgeStroke;
    left?: EdgeStroke;
}

interface EdgeStroke
{
    /** Whether this edge is visible. */
    visible: boolean;

    /** Edge color. */
    color?: string | GradientDefinition;

    /** Edge width. */
    width?: number;

    /** Dash pattern. */
    dashPattern?: number[];
}

interface ShadowStyle
{
    enabled: boolean;
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
    opacity: number;
    spread?: number;
}

interface ImageStyle
{
    /** Image source (URL or data URI). */
    src: string;

    /** How the image fills its bounds. */
    fit: "cover" | "contain" | "stretch" | "original";

    /** Crop region within the source image (0-1 normalized). */
    crop?: { x: number; y: number; w: number; h: number };

    /** Clip mask shape. */
    mask?: "none" | "circle" | "ellipse" | "rounded-rect" | PathDefinition;

    /** Mask corner radius (for rounded-rect mask). */
    maskRadius?: number;

    /** Color adjustments via SVG feColorMatrix. */
    adjustments?:
    {
        brightness?: number;    // -1 to 1, default 0
        contrast?: number;      // -1 to 1, default 0
        saturation?: number;    // -1 to 1, default 0 (-1 = grayscale)
        hueRotate?: number;     // degrees
        tint?: string;          // overlay color with blend mode
        tintOpacity?: number;   // 0-1
    };
}

interface ConnectorStyle extends StrokeStyle
{
    startArrow?: ArrowType;
    endArrow?: ArrowType;
    shadow?: ShadowStyle;
}

type ArrowType = "none" | "block" | "classic" | "open" | "diamond"
    | "oval" | "dash" | "cross"
    | "er-one" | "er-many" | "er-one-or-many" | "er-zero-or-one"
    | "er-zero-or-many" | "er-mandatory-one";

type RoutingStyle = "straight" | "orthogonal" | "curved" | "segment"
    | "manhattan" | "elbow" | "entity";

type AlignmentType = "left" | "center" | "right"
    | "top" | "middle" | "bottom";

interface ConnectorLabel
{
    /** Position along the connector path. */
    position: "start" | "middle" | "end" | number;

    /** Rich text content. */
    textContent: TextContent;

    /** Background fill behind the label. */
    background?: FillStyle;

    /** Border around the label. */
    border?: StrokeStyle;

    /** Padding inside the label background. */
    padding?: number;
}

interface ResourceReference
{
    type: string;                   // "api-endpoint", "ticket", "repo", "diagram", etc.
    uri: string;
    label?: string;
}
```

### 3.4 Text Model

Every text surface uses the same model. There is no "simple" vs "rich" distinction — all text is rich.

```typescript
interface TextContent
{
    /** Formatted text as a flat sequence of styled runs (simple text). */
    runs?: ContentRun[];

    /** Block-structured text (paragraphs, lists, headings). Use instead
     *  of `runs` when block-level formatting is needed. */
    blocks?: TextBlock[];

    /** Overflow behavior when text exceeds its region. */
    overflow: "visible" | "clip" | "ellipsis" | "scroll";

    /** Vertical alignment within the text region. */
    verticalAlign: "top" | "middle" | "bottom";

    /** Horizontal alignment. */
    horizontalAlign: "left" | "center" | "right" | "justify";

    /** Padding inside the text region. */
    padding: number;
}

/** A run of styled text. */
interface TextRun
{
    /** Text content. May contain {{variable}} expressions. */
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    shadow?: ShadowStyle;
    superscript?: boolean;
    subscript?: boolean;

    /** Line height multiplier (1.0 = normal). */
    lineHeight?: number;

    /** Letter spacing in pixels. */
    letterSpacing?: number;
}

/** A block-level element within rich text (list, paragraph, heading). */
interface TextBlock
{
    /** Block type. */
    type: "paragraph" | "heading" | "ordered-list" | "unordered-list";

    /** Heading level (1-6, only for type: "heading"). */
    level?: number;

    /** Indentation level (0 = no indent). */
    indent: number;

    /** Runs within this block. */
    runs: ContentRun[];
}

/** An inline icon within a text flow. */
interface IconRun
{
    /** Icon identifier (e.g., "bi-star-fill", "fa-rocket"). */
    icon: string;

    /** Icon library. */
    library: "bootstrap-icons" | "font-awesome" | "custom";

    /** Size (inherits from surrounding text if omitted). */
    fontSize?: number;

    /** Color (inherits from surrounding text if omitted). */
    color?: string;
}

/** A content run is either a text run or an inline icon. */
type ContentRun = TextRun | IconRun;

/** WordArt extends TextContent with a path and decorative properties. */
interface WordArtContent extends TextContent
{
    /** Path the text follows. */
    path: PathDefinition;

    /** Decorative fill (gradient, pattern, solid). */
    fill?: FillStyle;

    /** Decorative stroke around letterforms. */
    stroke?: StrokeStyle;

    /** Letter spacing in pixels. */
    letterSpacing?: number;

    /** Offset along the path where text begins (0-1). */
    startOffset?: number;
}
```

### 3.5 Layers

```typescript
interface Layer
{
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    printable: boolean;
    opacity: number;                // 0-1
    order: number;                  // stacking order
}
```

### 3.6 Document Structure

```typescript
interface DiagramDocument
{
    /** Format version for forward compatibility. */
    version: string;

    /** Document metadata. */
    metadata:
    {
        title: string;
        description?: string;
        author?: string;
        created: string;            // ISO 8601
        modified: string;
        tags?: string[];
    };

    /** Data context for template variable binding. */
    data?: Record<string, unknown>;

    /** Layer definitions (ordered). */
    layers: Layer[];

    /** All objects on the canvas. */
    objects: DiagramObject[];

    /** All connectors on the canvas. */
    connectors: DiagramConnector[];

    /** Comments anchored to entities or canvas positions. */
    comments: Comment[];

    /** Persistent ruler guides. */
    guides: RulerGuide[];

    /** Default render style for all shapes. Overridable per object. */
    renderStyle?: "clean" | "sketch";

    /** Sketch style parameters (when renderStyle is "sketch"). */
    sketchStyle?: SketchStyle;

    /** Grid configuration. */
    grid:
    {
        size: number;
        style: "dots" | "lines" | "none";
        visible: boolean;
    };
}
```

### 3.7 Undo/Redo

Command pattern with a merge window for rapid sequential edits (e.g., dragging produces one undo step, not one per pixel):

```typescript
interface Command
{
    type: string;                   // "move", "resize", "style-change", etc.
    objectIds: string[];
    before: Partial<DiagramObject | DiagramConnector>[];
    after: Partial<DiagramObject | DiagramConnector>[];
    timestamp: number;
    mergeable: boolean;             // Can merge with previous command of same type
}
```

### 3.8 Collaboration Model

The document model is designed from the ground up to support real-time multi-user editing via CRDT or OT. This does not mean the engine implements CRDT/OT itself — that is the responsibility of the consuming application's collaboration service. But the model provides the primitives that make collaboration possible.

#### 3.8.1 Operations (Mutations as Structured Deltas)

Every mutation to the document is expressed as a structured **operation** with a path-level address. Operations are the unit of collaboration — they can be sent over the wire, applied by remote peers, and merged/rebased.

```typescript
interface Operation
{
    /** Unique operation ID (UUID or Lamport timestamp). */
    id: string;

    /** Author of this operation. */
    userId: string;

    /** Wall-clock timestamp. */
    timestamp: number;

    /** Logical clock (for CRDT ordering). */
    clock?: number;

    /** The mutation. */
    type: OperationType;

    /** Target entity path (e.g., "objects/obj-42/presentation/bounds"). */
    path: string;

    /** Operation-specific payload. */
    payload: Record<string, unknown>;
}

type OperationType =
    | "object:add" | "object:remove" | "object:update"
    | "connector:add" | "connector:remove" | "connector:update"
    | "comment:add" | "comment:remove" | "comment:update"
    | "layer:add" | "layer:remove" | "layer:update"
    | "guide:add" | "guide:remove";
```

**Path-level addressing**: Operations target specific properties, not whole objects. `"objects/obj-42/presentation/bounds"` means "change the bounds of object obj-42." This enables fine-grained merge: user A moving object 1 and user B changing object 2's color produce non-conflicting operations.

**Conflict resolution strategy**: The engine fires `operation` events that the collaboration service intercepts. The service is responsible for:
- Sending operations to remote peers
- Receiving remote operations and applying them via `engine.applyOperation(op)`
- Resolving conflicts (last-writer-wins, OT transform, or CRDT merge)

```typescript
// The engine exposes operation events for the collaboration service
engine.on("operation", (op: Operation) =>
{
    collaborationService.broadcast(op);
});

// Remote operations received from peers
collaborationService.onRemoteOperation((op: Operation) =>
{
    engine.applyOperation(op);
});
```

#### 3.8.2 Presence (Cursors and Selections)

Collaboration requires awareness of other users' cursors and selections:

```typescript
interface UserPresence
{
    /** User ID. */
    userId: string;

    /** Display name. */
    name: string;

    /** Avatar URL or color for cursor/selection rendering. */
    color: string;

    /** Current cursor position in canvas coordinates. */
    cursor?: Point;

    /** Currently selected object/connector IDs. */
    selection: string[];

    /** Current viewport (for "follow" mode). */
    viewport?: ViewportState;

    /** Currently editing text in this object (exclusive lock indicator). */
    editingObjectId?: string;
}
```

The engine renders remote presences as colored overlays:
- **Cursor**: A colored arrow with the user's name label, positioned at `cursor`
- **Selection**: Colored selection outlines (distinct from the local user's blue selection) around objects in `selection`
- **Text editing lock**: A colored border and user badge on objects being edited by another user, preventing concurrent text edits on the same object

```typescript
// App pushes presence updates into the engine
engine.setRemotePresences(presences: UserPresence[]): void;

// Engine fires local presence changes for the app to broadcast
engine.on("presence:change", (presence: UserPresence) => { ... });
```

#### 3.8.3 Comments

Comments are part of the document model — they persist with the document and are anchored to specific entities or canvas positions.

```typescript
interface Comment
{
    /** Unique comment ID. */
    id: string;

    /** What this comment is anchored to. */
    anchor: CommentAnchor;

    /** Comment thread (first entry is the root, rest are replies). */
    thread: CommentEntry[];

    /** Resolution state. */
    status: "open" | "resolved";

    /** Creation timestamp. */
    created: string;

    /** Last activity timestamp. */
    updated: string;
}

interface CommentAnchor
{
    /** Anchor type. */
    type: "object" | "connector" | "canvas";

    /** Target entity ID (for object/connector anchors). */
    entityId?: string;

    /** Canvas position (for canvas anchors or as fallback if entity is deleted). */
    position?: Point;
}

interface CommentEntry
{
    /** Entry ID. */
    id: string;

    /** Author. */
    userId: string;
    userName: string;

    /** Content (plain text or markdown). */
    content: string;

    /** Timestamp. */
    timestamp: string;

    /** Whether this entry has been edited. */
    edited: boolean;
}
```

Comments are stored in the document:

```typescript
interface DiagramDocument
{
    // ... existing fields ...

    /** Comments anchored to objects, connectors, or canvas positions. */
    comments: Comment[];
}
```

**Engine API for comments**:

```typescript
engine.addComment(anchor: CommentAnchor, content: string, userId: string, userName: string): Comment;
engine.replyToComment(commentId: string, content: string, userId: string, userName: string): CommentEntry;
engine.resolveComment(commentId: string): void;
engine.reopenComment(commentId: string): void;
engine.deleteComment(commentId: string): void;
engine.getComments(): Comment[];
engine.getCommentsForObject(objectId: string): Comment[];
```

**Rendering**: The engine renders small comment indicator badges (e.g., a speech bubble icon with a count) on objects that have comments. The actual comment thread UI is provided by the consuming app (e.g., using the existing CommentOverlay component). The engine fires `comment:click` events when a comment badge is clicked.

**Events**:
```
comment:add, comment:reply, comment:resolve, comment:reopen, comment:delete, comment:click
```

#### 3.8.4 Deep Linking (Entity URIs)

Every entity in the document has a stable, addressable URI that external systems can link to. The URI scheme is:

```
diagram://{documentId}/{entityType}/{entityId}
```

Examples:
- `diagram://doc-123/object/obj-45` — a specific shape
- `diagram://doc-123/connector/conn-7` — a specific connector
- `diagram://doc-123/comment/cmt-12` — a specific comment thread
- `diagram://doc-123/layer/layer-2` — a specific layer

The engine can resolve a URI to select and center on the target entity:

```typescript
engine.navigateToURI(uri: string): boolean;
// Returns true if the entity was found, false if not.
// Selects the entity, centers the viewport on it, and opens
// the comment thread if the URI points to a comment.
```

**Inbound linking**: External systems (issue trackers, wikis, chat) can embed diagram entity URIs. When the user clicks one, the app opens the diagram and calls `engine.navigateToURI()`.

**Outbound linking**: Objects can reference external entities via `semantic.references[]` (already in the model). The engine fires `reference:click` events when a reference link is activated.

```typescript
engine.on("reference:click", (ref: ResourceReference, object: DiagramObject) =>
{
    // App navigates to the referenced entity
    router.navigateTo(ref.uri);
});
```

### 3.9 Persistence

The engine provides a complete persistence contract for saving documents to any storage layer (database, file system, cloud storage, IndexedDB) and restoring them with full fidelity.

#### 3.9.1 Serialization Format

The canonical persistence format is JSON (see §15 for a full example). The `DiagramDocument` interface IS the serialization schema — `JSON.stringify(engine.getDocument())` produces a valid persistence payload, and `engine.setDocument(JSON.parse(payload))` restores it exactly.

**Fidelity guarantee**: Every property — semantic data, presentation styles, parameters, control point values, comments, layers, guides, grid settings, metadata — round-trips through serialization without loss.

**Format versioning**: Every serialized document includes a `version` field. When the format evolves, the engine applies migration transforms on load:

```typescript
interface DiagramDocument
{
    /** Format version. The engine writes the current version on save
     *  and migrates older versions on load. */
    version: string;    // e.g., "1.0", "1.1", "2.0"

    // ... rest of document ...
}
```

The engine maintains a registry of version migration functions:

```typescript
// Internal: version migrations applied automatically on load
const MIGRATIONS: Record<string, (doc: unknown) => DiagramDocument> =
{
    "1.0→1.1": (doc) => { /* add comments array if missing */ },
    "1.1→2.0": (doc) => { /* restructure semantic layer */ },
};
```

Old documents load in new engine versions without errors. The engine logs a warning when migrating: `"[DiagramEngine] Migrating document from v1.0 to v1.1"`.

#### 3.9.2 Save / Load API

```typescript
interface DiagramEngine
{
    // ── Full document persistence ──

    /** Returns the complete document as a serializable object.
     *  This is the primary persistence payload. */
    getDocument(): DiagramDocument;

    /** Loads a document from a previously serialized payload.
     *  Applies version migrations if needed. Validates structure.
     *  Replaces the entire canvas state. */
    setDocument(doc: DiagramDocument): void;

    /** Validates a document without loading it. Returns validation errors
     *  or an empty array if valid. Useful for import validation. */
    validateDocument(doc: unknown): ValidationError[];

    // ── JSON convenience ──

    /** Serializes the document to a JSON string.
     *  Equivalent to JSON.stringify(engine.getDocument(), null, indent). */
    toJSON(indent?: number): string;

    /** Loads a document from a JSON string.
     *  Equivalent to engine.setDocument(JSON.parse(json)). */
    fromJSON(json: string): void;

    // ── Dirty state tracking ──

    /** Returns true if the document has unsaved changes. */
    isDirty(): boolean;

    /** Marks the document as clean (call after successful save). */
    markClean(): void;

    /** Returns the number of operations since the last markClean(). */
    getChangeCount(): number;

    // ── Change stream (for incremental persistence) ──

    /** Returns all operations since the last call to getChangesSince()
     *  or since document load. For incremental/delta persistence. */
    getChangesSince(checkpoint?: string): OperationBatch;

    /** Returns a checkpoint token representing the current state.
     *  Pass to getChangesSince() to get subsequent changes. */
    getCheckpoint(): string;
}

interface OperationBatch
{
    /** Checkpoint token for this batch. */
    checkpoint: string;

    /** Operations in this batch (ordered). */
    operations: Operation[];
}

interface ValidationError
{
    /** Path to the invalid field. */
    path: string;

    /** Description of the error. */
    message: string;

    /** Severity. */
    severity: "error" | "warning";
}
```

#### 3.9.3 Persistence Patterns

**Full save (simple)**:
```typescript
// Save
const json = engine.toJSON();
await database.save(documentId, json);
engine.markClean();

// Load
const json = await database.load(documentId);
engine.fromJSON(json);
```

**Incremental save (efficient for large documents)**:
```typescript
// Initial save
await database.save(documentId, engine.toJSON());
let checkpoint = engine.getCheckpoint();

// Subsequent saves — only persist the delta
const batch = engine.getChangesSince(checkpoint);
if (batch.operations.length > 0)
{
    await database.appendOperations(documentId, batch.operations);
    checkpoint = batch.checkpoint;
}
```

**Auto-save (debounced)**:
```typescript
let saveTimer: number | null = null;

engine.on("operation", () =>
{
    if (saveTimer) { clearTimeout(saveTimer); }
    saveTimer = window.setTimeout(async () =>
    {
        await database.save(documentId, engine.toJSON());
        engine.markClean();
        console.log("Auto-saved");
    }, 2000);  // 2-second debounce
});
```

**Dirty state in UI**:
```typescript
engine.on("operation", () =>
{
    titleBar.setDirtyIndicator(engine.isDirty());
});

engine.on("document:save", () =>
{
    titleBar.setDirtyIndicator(false);
});
```

#### 3.9.4 Storage Agnosticism

The engine has **no opinion** about where documents are stored. It provides JSON payloads and change streams; the app chooses the storage layer:

| Storage Layer | Pattern |
|---|---|
| REST API / Database | `POST /api/diagrams/:id` with JSON body |
| IndexedDB (offline) | Store JSON blobs keyed by document ID |
| File system | Write JSON to `.diagram.json` files |
| Cloud storage (S3, GCS) | Upload JSON as a blob |
| Real-time database (Firebase, Supabase) | Write operations as records for live sync |
| CRDT store (Yjs, Automerge) | Map operations to CRDT document mutations |

The engine's operation format (§3.8.1) is deliberately compatible with common CRDT and OT frameworks. Each operation has a `path`, `type`, and `payload` that can be mapped to Yjs `Y.Map` mutations, Automerge `change()` calls, or OT operation transforms.

### 3.10 Event Bus

All mutations go through the model and fire events:

```
// Object lifecycle
object:add, object:remove, object:change, object:move, object:resize

// Connector lifecycle
connector:add, connector:remove, connector:change

// Selection
selection:change

// Viewport
viewport:change (pan, zoom)

// Layers
layer:add, layer:remove, layer:change

// History
history:push, history:undo, history:redo

// Document & persistence
document:load, document:save
dirty:change (isDirty state changed)

// Text editing
text:edit:start, text:edit:end

// Tools
tool:change

// Guides
guide:add, guide:remove

// Collaboration
operation (structured delta for broadcasting)
presence:change (local cursor/selection changed)

// Comments
comment:add, comment:reply, comment:resolve, comment:reopen, comment:delete, comment:click

// References
reference:click
```

### 3.11 Render Style (Clean / Sketch)

Every shape can be rendered in one of two visual styles:

| Style | Effect |
|---|---|
| `clean` (default) | Precise SVG paths — straight lines, smooth curves, sharp corners |
| `sketch` | Hand-drawn aesthetic — lines wobble, corners slightly overshoot, fills use hatching/crosshatch texture |

Sketch rendering is a **theme over existing shapes**, not a separate shape set. A rectangle is still a rectangle; it just renders with wobbly lines. A circle is still a circle; it just looks like it was drawn freehand on a whiteboard.

**Implementation**: A seeded PRNG perturbs SVG path control points. Each straight-line segment `M x1,y1 L x2,y2` becomes a multi-point cubic bezier with slight random offsets. The perturbation is **deterministic** — same shape, same seed, same wobbly rendering. This guarantees:
- Undo/redo doesn't change the wobble pattern
- Serialization/deserialization reproduces identically
- Collaboration shows the same rendering to all users
- Exporting to SVG/PNG preserves the exact sketch appearance

**Configuration levels** (cascading, most specific wins):
1. **Document-wide default**: `document.renderStyle = "sketch"` — everything looks hand-drawn
2. **Per-object override**: `presentation.renderStyle = "clean"` — this object is clean even if the document default is sketch

**Sketch parameters** (fine-tuning the hand-drawn feel):

```typescript
interface SketchStyle
{
    /** Roughness (0 = nearly clean, 1 = very rough). Default: 0.5. */
    roughness: number;

    /** Seed for deterministic randomization. Auto-assigned if omitted. */
    seed?: number;

    /** Fill style for closed shapes. */
    fillStyle: "solid" | "hachure" | "cross-hatch" | "dots" | "zigzag";

    /** Gap between hachure/cross-hatch lines. Default: 4. */
    fillGap?: number;

    /** Angle of hachure lines in degrees. Default: -41. */
    fillAngle?: number;

    /** Stroke bowing (how much lines curve). Default: 1. */
    bowing: number;
}
```

The `ShapeDefinition.render()` method receives the resolved render style in its context, and produces either clean or sketch SVG accordingly.

---

## 4. Render Engine

### 4.1 Ruler Integration

The engine integrates with the existing Ruler component to provide live dimension and position feedback.

**Selection indicators on rulers**: When objects are selected, highlighted regions appear on the horizontal and vertical rulers showing the bounding box of the selection:

```
Horizontal ruler:
  0    50   100  150  200  250  300  350
  |    |    |    |    |    |    |    |
  ───────────▓▓▓▓▓▓▓▓▓▓▓▓▓──────────   ← highlighted region (x to x+width)
             ▼                     ▼     ← position markers (triangles)

Vertical ruler:
  0 ─
 50 ─
100 ─ ▶ ━━━━  ← top edge marker
150 ─ ▓▓▓▓▓   ← highlighted region (y to y+height)
200 ─ ▓▓▓▓▓
250 ─ ▶ ━━━━  ← bottom edge marker
300 ─
```

**Behaviors**:
- **Object selected**: rulers show bounding box region highlighted in `var(--theme-primary)` at 15% opacity
- **Multiple selection**: shows combined bounding box of all selected objects
- **During drag**: highlighted region slides in real-time, position markers move with the object
- **During resize**: dimension region updates live, showing the new width/height
- **Guide creation**: clicking a ruler creates a guide line at that position (already specified in §7)
- **Ruler coordinates**: match canvas coordinates (adjusted by viewport zoom/pan)
- **No selection**: rulers show only grid ticks and existing guide lines

**Engine API**:

```typescript
interface RulerState
{
    /** Bounding box of the current selection in canvas coordinates. */
    selectionBounds: Rect | null;

    /** Current viewport transform (for coordinate mapping). */
    viewport: ViewportState;

    /** Guide lines (for rendering on rulers). */
    guides: RulerGuide[];
}

// Engine emits ruler state on every selection/viewport change
engine.on("ruler:update", (state: RulerState) => { ... });
```

The consuming app passes `RulerState` to the Ruler component instances for rendering.

### 4.2 SVG DOM Structure

```svg
<svg class="de-canvas" xmlns="http://www.w3.org/2000/svg">
    <defs>
        <!-- Reusable: arrow markers, shadow filters, gradients, patterns -->
        <marker id="de-arrow-block" ... />
        <filter id="de-shadow-obj42" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="3" dy="3" stdDeviation="4"
                flood-color="var(--theme-shadow-rgb)" flood-opacity="0.3" />
        </filter>
    </defs>
    <g class="de-viewport" transform="translate(x,y) scale(z)">
        <g class="de-grid" />           <!-- Grid dots/lines -->
        <g class="de-guides" />         <!-- Persistent ruler guides -->

        <!-- One group per layer, ordered by layer.order -->
        <g class="de-layer" data-layer="background">
            <g class="de-object" data-id="obj-1"> ... </g>
        </g>
        <g class="de-layer" data-layer="default">
            <g class="de-object" data-id="obj-2"> ... </g>
            <g class="de-object" data-id="obj-3"> ... </g>
        </g>

        <g class="de-connectors">      <!-- Connector paths -->
            <g class="de-connector" data-id="conn-1"> ... </g>
        </g>

        <g class="de-overlay">         <!-- Selection handles, hover states -->
            <!-- Resize handles, rotation handle, rubber band -->
        </g>
        <g class="de-tool-overlay">    <!-- Active tool visuals -->
            <!-- Smart guides, measurement lines, connector preview -->
        </g>
    </g>
</svg>
```

### 4.2 Shadow/Filter Pipeline

Shadows are defined in `<defs>` as named filters with deterministic IDs (`de-shadow-{objectId}`). They are created once and updated in place — never destroyed by object re-renders.

```svg
<defs>
    <filter id="de-shadow-obj42" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="3" dy="3" stdDeviation="4"
            flood-color="rgba(0,0,0,0.3)" flood-opacity="1" />
    </filter>
</defs>

<!-- Object references its shadow filter -->
<g class="de-object" data-id="obj42" filter="url(#de-shadow-obj42)">
    <rect ... />
    <foreignObject ...> <!-- rich text --> </foreignObject>
</g>
```

This eliminates the maxGraph problem where `view.validate()` destroys filter references.

### 4.3 Text Rendering

**Rich text** — Rendered via `<foreignObject>` containing an HTML div with styled spans. Supports full CSS formatting, `overflow: hidden; text-overflow: ellipsis` for truncation, and `contenteditable` for inline editing (when the app opts in).

**WordArt** — Rendered via SVG `<textPath>` on a `<path>` element defined in `<defs>`. Supports fill, stroke, gradient, shadow, letter spacing.

Both rendering strategies resolve `{{variable}}` expressions from the document's data context before rendering.

### 4.4 Theming

All rendering uses `var(--theme-*)` CSS custom properties. Grid lines, guide colors, selection handles, snap indicators — everything adapts to dark/light mode automatically.

A single `MutationObserver` on `document.documentElement` watches for `data-bs-theme` changes. On theme change, the engine invalidates cached computed colors (used only for SVG attribute values that can't reference CSS vars directly, such as gradient stops).

### 4.5 Viewport

- **Pan**: Click+drag on canvas, middle-mouse drag, Space+drag, touch drag
- **Zoom**: Scroll wheel with focal point, pinch-to-zoom, `+`/`-` keys, zoom-to-fit, zoom-to-selection
- **Zoom range**: Configurable min/max (default 0.1 to 4.0)
- **Viewport coordinates**: All API coordinates are in document space. The engine converts to/from screen space internally.

### 4.6 Hit Testing

SVG-based hit testing using `document.elementFromPoint()` for click targets and geometric intersection for rubber-band selection. Each shape provides a `hitTest(point, bounds)` method for precise hit detection (e.g., ellipses only hit inside the curve, not the bounding rect).

---

## 5. Shape System

### 5.1 Shape Definition Interface

```typescript
interface ShapeDefinition
{
    /** Unique type identifier (e.g., "rectangle", "uml-class"). */
    type: string;

    /** Category for stencil palette grouping. */
    category: string;

    /** Human-readable display name. */
    label: string;

    /** Icon for the stencil palette. */
    icon: string;

    /** Default dimensions when placed. */
    defaultSize: { w: number; h: number };

    /** Minimum dimensions for resize. */
    minSize?: { w: number; h: number };

    /** Render the shape's SVG content. */
    render(ctx: ShapeRenderContext): SVGElement;

    /** Resize handles — each can control different aspects of the shape. */
    getHandles(bounds: Rect): ResizeHandle[];

    /** Connection ports — where connectors can attach. */
    getPorts(bounds: Rect): ConnectionPort[];

    /** Property schema — drives property panel UI. */
    getPropertySchema(): PropertySchema[];

    /** Precise hit test. */
    hitTest(point: Point, bounds: Rect): boolean;

    /** Text regions — where text can be placed within the shape. */
    getTextRegions(bounds: Rect): TextRegion[];

    /** Outline path — for connector routing avoidance. */
    getOutlinePath(bounds: Rect): PathDefinition;
}
```

### 5.2 Resize Handles with Aspect Control

Different handles can control different aspects of a shape:

- A **UML class shape** has a horizontal handle at the divider line between attributes and methods compartments, controlling the compartment split ratio.
- A **callout shape** has a handle controlling the tail direction and length.
- A **rounded rectangle** has a corner handle controlling border radius.
- Standard **bounding box handles** (N, S, E, W, NE, NW, SE, SW) control overall size.

```typescript
interface ResizeHandle
{
    /** Position of the handle. */
    position: Point;

    /** Cursor to show on hover. */
    cursor: string;

    /** What dragging this handle controls. */
    aspect: "bounds" | "corner-radius" | "compartment-split"
        | "tail-direction" | "custom";

    /** Called during drag to compute new shape state. */
    onDrag(delta: Point, originalBounds: Rect): Partial<DiagramObject>;
}
```

### 5.3 Connection Ports

```typescript
interface ConnectionPort
{
    /** Unique port ID within the shape. */
    id: string;

    /** Position relative to the shape bounds (0-1). */
    position: { x: number; y: number };

    /** Allowed connector directions at this port. */
    direction: "north" | "south" | "east" | "west" | "any";

    /** Maximum connectors allowed at this port (0 = unlimited). */
    maxConnections: number;
}
```

### 5.4 Built-in Stencil Packs

Shipped as registerable stencil packs. Each is an array of `ShapeDefinition` objects:

| Pack | Shapes | Loaded By Default |
|---|---|---|
| `basic` | Rectangle, ellipse, triangle, diamond, hexagon, cross, trapezoid, inverted trapezoid, parallelogram, rhombus, star, arrow, line, text box, image, icon, group frame. Corner variants: snip-single, snip-two, snip-same-side, round-single, round-diagonal, fold-corner. Arcs: half-circle, quarter-circle, arc, pie-slice, donut. Decorative: frame, heart, lightning, sun, moon, smiley, gear, no-entry | Yes |
| `flowchart` | Process, decision, terminator, data, document, subprocess, predefined process, preparation, manual input, manual operation, display, connector, off-page connector, database, delay, internal storage, stored data, sequential data, collate, sort, extract, merge, sum junction, or | No |
| `uml` | Class (with compartments), interface, enumeration, package, component, node, artifact, actor, use case, state, activity, note, lifeline, interaction frame, sync/async/return/create/self-call messages | No |
| `bpmn` | Start/intermediate/end events (plain, timer, message, signal), tasks (user, service, script, send, receive), subprocess, gateways (exclusive, parallel, inclusive, event-based), pool, lane, data object, data store, sequence/message/association flows | No |
| `er` | Entity, weak entity, attribute, key attribute, multivalued attribute, derived attribute, relationship, weak relationship, ISA | No |
| `network` | Server, router, switch, firewall, load balancer, cloud, database, client, mobile, container, cluster | No |
| `c4` | Person, software system (internal/external), container (webapp, mobile, API, database, queue, filesystem), component | No |
| `orgchart` | Executive, manager, team lead, person, team member cards, department and division groupings | No |
| `arrows` | Right, left, up, down, left-right, up-down, bent-right, bent-up, U-turn, notched-right, chevron (left/right), striped, callout (4 directions), quad, corner, circular | No |
| `callouts` | Speech bubbles (rect, rounded, oval), thought bubble, stars (4/5/6-point), explosions (4/6-point), bursts (8/10/12/16/24/32-point), ribbons (horizontal, wave), banners (vertical, scroll) | No |
| `brackets` | Parentheses, brackets, braces (left/right), math symbols: plus, minus, multiply, divide, equal, not-equal | No |
| `drawing` | Freeform path, chevron shape, double arrow shape | No |
| `cloud-aws` | AWS service shapes: EC2, Lambda, S3, RDS, API Gateway, SQS, DynamoDB, CloudFront, SNS, ECS, EKS, and more (SVG-based icon shapes from AWS Architecture Icons) | No |
| `cloud-gcp` | GCP service shapes: Compute Engine, Cloud Functions, Cloud Storage, Cloud SQL, Pub/Sub, GKE, BigQuery, and more (SVG-based from Google Cloud Icons) | No |
| `cloud-azure` | Azure service shapes: Virtual Machines, Functions, Blob Storage, SQL Database, Service Bus, AKS, Cosmos DB, and more (SVG-based from Azure Architecture Icons) | No |

### 5.5 Custom Shape Registration

```typescript
engine.registerStencilPack("my-shapes", [
    {
        type: "my-widget",
        category: "Custom",
        label: "Widget",
        icon: "bi-box",
        defaultSize: { w: 120, h: 80 },
        render: (ctx) => { /* return SVGElement */ },
        getHandles: (bounds) => [ /* ... */ ],
        getPorts: (bounds) => [ /* ... */ ],
        getPropertySchema: () => [ /* ... */ ],
        hitTest: (point, bounds) => { /* ... */ },
        getTextRegions: (bounds) => [ /* ... */ ],
        getOutlinePath: (bounds) => { /* ... */ },
    },
]);
```

### 5.6 SVG-Based Shape Packs (Cloud Providers)

Cloud providers (AWS, GCP, Azure) publish official SVG icon sets for their services. These can be registered as stencil packs where each service icon becomes a shape on the canvas.

An SVG-based shape is an image-type shape with a fixed SVG source. It renders the provider's official icon at any size, with optional label text below.

```typescript
// Register AWS shapes from their official SVG icon set
engine.registerSVGStencilPack("cloud-aws", {
    category: "AWS",
    shapes: [
        { type: "aws-ec2", label: "EC2", svgUrl: "/icons/aws/ec2.svg" },
        { type: "aws-lambda", label: "Lambda", svgUrl: "/icons/aws/lambda.svg" },
        { type: "aws-s3", label: "S3", svgUrl: "/icons/aws/s3.svg" },
        { type: "aws-rds", label: "RDS", svgUrl: "/icons/aws/rds.svg" },
        // ... all AWS services
    ],
});
```

SVG shapes support:
- Scalable rendering at any size (vector, not rasterized)
- Connection ports (auto-generated: top, bottom, left, right, center)
- Text label below the icon
- Semantic data linking (`semantic.type: "aws.ec2"`, `semantic.data: { instanceType: "t3.micro" }`)
- Standard object operations: shadow, opacity, rotation, grouping
- Tinting/recoloring via SVG `<feColorMatrix>` filters

This enables technical architecture diagrams where users drag-and-drop official cloud service icons and connect them with labeled edges showing data flow, dependencies, and relationships.

### 5.7 Declarative Shape Authoring

Shapes can be defined declaratively via normalized SVG path data instead of programmatic render functions. This enables non-developers to create shapes with any SVG editor (Inkscape, Figma export) and register them:

```typescript
// Declarative: SVG path data with normalized 0-1 coordinates
registerDeclarativeShape({
    type: "block-arrow",
    category: "basic",
    label: "Block Arrow",
    icon: "bi-arrow-right",
    defaultSize: { w: 120, h: 60 },

    // Path coordinates are 0-1 normalized, scaled to bounds at render time
    path: "M 0 0.25 L 0.6 0.25 L 0.6 0 L 1 0.5 L 0.6 1 L 0.6 0.75 L 0 0.75 Z",

    ports: [
        { id: "left", position: { x: 0, y: 0.5 }, direction: "west" },
        { id: "right", position: { x: 1, y: 0.5 }, direction: "east" },
    ],
    textRegions: [
        { id: "label", bounds: { x: 0.05, y: 0.3, w: 0.5, h: 0.4 } },
    ],
    controlPoints: [
        { id: "head-depth", position: { x: 0.6, y: 0 }, constraint: "horizontal",
          min: 0.3, max: 0.9, parameter: "headDepth" },
    ],
});
```

Both declarative and programmatic shapes produce the same `ShapeDefinition` interface. The engine converts declarative definitions into render functions internally. Declarative shapes are the preferred authoring model for most shapes; programmatic shapes are reserved for complex shapes with conditional rendering (e.g., UML class diagrams with variable compartment counts).

### 5.7 Control Points (Edit Points)

Control points are parametric handles — distinct from resize handles — that modify specific geometric aspects of a shape without changing its bounding box. They appear as **yellow diamond handles** (as in Google Drawings) when the shape is selected.

There are two kinds of control points:

**Scalar control points** — Control a single numeric parameter along a constrained axis. Examples:
- **Rounded rectangle**: drag near the corner → controls `cornerRadius` (0-50)
- **Star**: drag inner vertex → controls `innerRadiusRatio` (0.1-0.9)
- **Trapezoid**: drag top edge corner → controls `topWidthRatio` (0.1-1.0)
- **Donut**: drag inner circle edge → controls `innerRadius` (0.1-0.45)
- **Circular arrow**: three control points — `arcLength` (how far the arc spans, 30°-350°), `headSize` (arrow head length), `stemThickness` (stem width)

**Point control points** — Control a 2D position that can be dragged freely anywhere on the canvas. The stored value is a `{x, y}` coordinate relative to the shape's bounds (0-1 normalized) or in absolute canvas coordinates. Examples:
- **Callout tail**: the tip of the callout tail can be dragged to any position on the canvas, pointing the callout at an arbitrary location or object. Stored as absolute canvas coordinates so the tail follows the target even when the callout is far away.
- **Curved arrow endpoint**: free-position handle at the end of a curved arrow shape.
- **Custom connector attachment**: a point on a shape where a custom visual connector originates.

```typescript
interface ControlPoint
{
    /** Unique ID within the shape. */
    id: string;

    /** Current position on the canvas. */
    position: Point;

    /** Cursor on hover. */
    cursor: string;

    /** How can this point be dragged? */
    constraint: "horizontal" | "vertical" | "free" | "radial" | "along-path";

    /** Whether the value is a scalar or a 2D point. */
    valueType: "scalar" | "point";

    /** Range limits (scalar only). */
    min?: number;
    max?: number;

    /** Name of the parametric value this point controls. */
    parameter: string;

    /** Whether this control point should snap to other objects on the canvas.
     *  When true, dragging near an object edge/center will snap to it.
     *  Useful for callout tails that "point at" another object. */
    snapToObjects?: boolean;

    /** Compute the new parameter value from the drag position. */
    computeValue(position: Point, bounds: Rect): number | Point;

    /** Compute the handle position from the current parameter value. */
    computePosition(value: number | Point, bounds: Rect): Point;
}
```

Each shape stores parametric values in `presentation.parameters`. Values can be numbers (scalar) or `{x, y}` objects (point):

```typescript
presentation: {
    shape: "callout-rect",
    bounds: { x: 200, y: 100, w: 180, h: 100 },
    parameters: {
        cornerRadius: 4,                // scalar — corner rounding
        tailTip: { x: 350, y: 400 },    // point — where the tail points (canvas coords)
        tailWidth: 20,                   // scalar — tail base width
    },
}

presentation: {
    shape: "circular-arrow",
    bounds: { x: 100, y: 100, w: 80, h: 80 },
    parameters: {
        arcLength: 270,      // scalar — degrees of arc (30-350)
        headSize: 12,        // scalar — arrow head length
        stemThickness: 8,    // scalar — stem width
    },
}
```

**Callout tail behavior**: When `snapToObjects: true` is set on the tail control point, dragging it near another object highlights that object and snaps the tail tip to its nearest edge. This creates a visual "pointing at" relationship. The tail dynamically adjusts its path from the callout body to the tip as the callout or target is moved.

```
                              snapToObjects: true
                              ┌─────────────┐
     ┌────────────────┐       │  Target Obj  │
     │  This is a     │       │             ◆│← tail tip snaps to edge
     │  callout note.  ├──────│              │
     │                │       └─────────────┘
     └────────────────┘
```

The shape's `render()` reads from `parameters`; the control point positions are computed from `parameters + bounds`. When a control point is dragged, the engine updates the parameter value, re-renders the shape, and pushes an undo command.

The `ShapeDefinition` interface includes:

```typescript
interface ShapeDefinition
{
    // ... existing methods ...

    /** Control points for parametric shape editing. */
    getControlPoints(
        bounds: Rect,
        parameters: Record<string, number | Point>
    ): ControlPoint[];
}
```

### 5.8 Compound Paths and Shapes with Holes

Shapes like donuts, frames, and hollow objects have transparent interior regions (holes). SVG handles this natively with compound paths and the `fill-rule` attribute:

```svg
<!-- Donut: outer circle + inner circle, evenodd fill creates the transparent hole -->
<path d="M 0,50 A 50,50 0 1,1 100,50 A 50,50 0 1,1 0,50 Z
         M 20,50 A 30,30 0 1,0 80,50 A 30,30 0 1,0 20,50 Z"
      fill="var(--theme-primary)" fill-rule="evenodd" />
```

The `ShapeDefinition` supports compound paths:

```typescript
interface ShapeDefinition
{
    // ... existing ...

    /** Fill rule for compound paths. Default: "nonzero". */
    fillRule?: "nonzero" | "evenodd";

    /** Multiple path segments for compound shapes. */
    paths?: ShapePath[];
}

interface ShapePath
{
    /** SVG path data (normalized 0-1 coordinates). */
    d: string;

    /** Role of this path segment. */
    role: "boundary" | "cutout" | "decoration";
}
```

**Hit testing** respects the fill rule: clicking inside a hole does not select the shape. The `hitTest()` implementation uses the even-odd or nonzero winding rule to determine if a point is inside the filled region. The outline path used for connector routing avoidance is the outer boundary only.

**Declarative example — Donut:**

```typescript
registerDeclarativeShape({
    type: "donut",
    category: "basic",
    label: "Donut",
    icon: "bi-circle",
    defaultSize: { w: 100, h: 100 },
    fillRule: "evenodd",
    paths: [
        { d: "M 0,0.5 A 0.5,0.5 0 1,1 1,0.5 A 0.5,0.5 0 1,1 0,0.5 Z", role: "boundary" },
        { d: "M 0.25,0.5 A 0.25,0.25 0 1,0 0.75,0.5 A 0.25,0.25 0 1,0 0.25,0.5 Z", role: "cutout" },
    ],
    controlPoints: [
        { id: "inner-radius", constraint: "radial", parameter: "innerRadius",
          min: 0.1, max: 0.45 },
    ],
    textRegions: [],
    ports: [
        { id: "top", position: { x: 0.5, y: 0 }, direction: "north" },
        { id: "bottom", position: { x: 0.5, y: 1 }, direction: "south" },
        { id: "left", position: { x: 0, y: 0.5 }, direction: "west" },
        { id: "right", position: { x: 1, y: 0.5 }, direction: "east" },
    ],
});
```

---

## 6. Tool System

### 6.1 Tool Interface

Tools are state machines. Only one tool is active at a time. The engine provides built-in tools; apps cannot define custom tools (they use event callbacks instead).

```typescript
interface Tool
{
    name: string;
    cursor: string;
    onActivate(): void;
    onDeactivate(): void;
    onMouseDown(e: CanvasPointerEvent): void;
    onMouseMove(e: CanvasPointerEvent): void;
    onMouseUp(e: CanvasPointerEvent): void;
    onKeyDown(e: KeyboardEvent): void;
}
```

### 6.2 Built-in Tools

| Tool | Purpose | Key Interactions |
|---|---|---|
| `select` | Default. Select, move, resize, rotate, multi-select, rubber band, nudge | Click, drag, Shift+click, Ctrl+A, arrow keys |
| `draw` | Create shapes. Click to place at default size, drag for custom size | Click, drag |
| `connect` | Draw connectors between connection ports | Click port → drag → release on port |
| `text` | Create standalone text objects or edit existing text | Click canvas to create, click object to edit |
| `pan` | Pan the viewport | Drag, middle-mouse, Space+drag |
| `zoom` | Zoom in/out | Click zoom in, Alt+click zoom out, scroll wheel |
| `measure` | Show distances, angles between points | Click two points for distance, three for angle |
| `pen` | Draw freeform vector paths | Click to add anchor points, drag for bezier curves, close path |
| `brush` | Freehand sketching | Draw continuous strokes, auto-smoothed, uses current stroke style |

### 6.3 Default Keyboard Shortcuts

**Tools:**

| Key | Action |
|---|---|
| `V` | Switch to select tool |
| `R` | Switch to draw tool (rectangle) |
| `L` | Switch to connector tool |
| `T` | Switch to text tool |
| `H` / Space (hold) | Switch to pan tool |
| `Z` | Switch to zoom tool |
| `M` | Switch to measure tool |
| `P` | Switch to pen tool |

**Viewport:**

| Key | Action |
|---|---|
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `0` | Zoom to fit |
| `Ctrl+1` | Zoom to 100% |
| `F` | Focus / center on selected |
| Scroll wheel | Zoom in/out at cursor |
| Middle-mouse drag | Pan |
| Space + drag | Pan |

**Selection & editing:**

| Key | Action |
|---|---|
| `Ctrl+A` | Select all |
| `Escape` | Deselect / cancel tool |
| `Delete` / `Backspace` | Delete selected |
| `Ctrl+C` | Copy selected |
| `Ctrl+X` | Cut selected |
| `Ctrl+V` | Paste |
| `Ctrl+D` | Duplicate in place |
| Arrow keys | Nudge selected (1px) |
| Shift + Arrow keys | Nudge selected (10px) |
| Enter / F2 | Edit text of selected object |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

**Grouping:**

| Key | Action |
|---|---|
| `Ctrl+G` | Group selected objects |
| `Ctrl+Shift+G` | Ungroup selected group |

**Z-ordering (stacking):**

| Key | Action |
|---|---|
| `Ctrl+Shift+]` | Bring to front (topmost) |
| `Ctrl+Shift+[` | Send to back (bottommost) |
| `Ctrl+]` | Bring forward (one step up) |
| `Ctrl+[` | Send backward (one step down) |

**Alignment (multi-select):**

| Key | Action |
|---|---|
| `Ctrl+Shift+L` | Align left |
| `Ctrl+Shift+R` | Align right |
| `Ctrl+Shift+C` | Align center (horizontal) |
| `Ctrl+Shift+T` | Align top |
| `Ctrl+Shift+B` | Align bottom |
| `Ctrl+Shift+M` | Align middle (vertical) |
| `Ctrl+Shift+H` | Distribute horizontally |
| `Ctrl+Shift+V` | Distribute vertically |

**Format painter:**

| Key | Action |
|---|---|
| `Ctrl+Shift+C` | Copy format from selected object |
| Click (while format active) | Apply format to clicked object |
| `Escape` | Exit format painter mode |

**Rotation & flipping:**

| Key | Action |
|---|---|
| Rotation handle drag | Rotate freely |
| Shift + rotation drag | Snap to rotation increment (default 15°) |
| Alt + rotation drag | Rotate in 1° increments |
| `Ctrl+Shift+F` | Flip horizontal |
| `Ctrl+Shift+D` | Flip vertical |

**Object state:**

| Key | Action |
|---|---|
| `Ctrl+L` | Lock / unlock selected |

### 6.4 Grouping

**Creating groups**: Select multiple objects → `Ctrl+G` or `engine.group(ids)`. Creates a new group object that contains the selected objects. The group has its own bounds (the bounding box of its children), style (optional fill/stroke for a visible group frame), and semantic data.

**Group behavior**:
- Clicking a group selects the group. Double-clicking enters the group (selects individual children).
- Moving a group moves all children.
- Resizing a group scales all children proportionally.
- Rotating a group rotates all children around the group center.
- Deleting a group deletes the group and all children (unless ungrouped first).
- Copy/paste of a group copies all children.

**Nested groups**: Groups can contain other groups. The hierarchy is maintained via `groupId` references. Entering a nested group (double-click) scopes selection to that level.

**Ungrouping**: Select a group → `Ctrl+Shift+G` or `engine.ungroup(groupId)`. Dissolves the group, promoting children to the parent level. Preserves children's absolute positions.

### 6.5 Rotation and Flipping

**Rotation** — Any object (shapes, images, icons, text boxes, groups, connectors) can be rotated to an arbitrary angle. Rotation is stored as `presentation.rotation` in degrees (0-360, clockwise from the top).

**Rotation handle**: When an object is selected and `rotatable: true`, a circular handle appears above the top-center resize handle, connected by a short stem. Dragging it rotates the object around its center point.

```
           ⟳          ← rotation handle (circle)
           │          ← stem
     ┌─────┼─────┐
     │     ●     │    ← top-center resize handle
     │           │
     │  Object   │
     │           │
     └───────────┘
```

**Rotation behavior**:
- Drag the rotation handle to rotate freely
- Hold `Shift` while rotating to snap to the configured `rotationSnap` increment (default 15°, so 0°, 15°, 30°, 45°, etc.)
- Hold `Alt` while rotating to rotate in 1° increments (precision mode)
- Rotation center is the geometric center of the object's bounds
- Child objects within a group rotate relative to the group center when the group is rotated
- Connectors attached to rotated objects follow their connection ports (ports rotate with the shape)
- Text within rotated objects remains axis-aligned by default (readable); opt-in to rotate with the shape via `textContent.rotateWithShape: true`

**Programmatic rotation**:
```typescript
engine.updateObject("obj-1", {
    presentation: { rotation: 38 },  // 38 degrees clockwise
});
```

**Flipping** — Mirror an object horizontally or vertically without changing its position:

| Operation | API | Keyboard | Effect |
|---|---|---|---|
| Flip horizontal | `flipHorizontal(ids)` | `Ctrl+Shift+F` | Mirror left ↔ right |
| Flip vertical | `flipVertical(ids)` | `Ctrl+Shift+D` | Mirror top ↔ bottom |

Flipping is implemented as an SVG `transform: scale(-1, 1)` (horizontal) or `scale(1, -1)` (vertical) combined with a position offset to keep the object in place. Text within flipped objects is NOT mirrored (remains readable) — only the shape geometry flips.

For **connectors**, flipping swaps the start/end arrows and reverses label positions.

For **groups**, flipping mirrors all child positions relative to the group center and flips each child's geometry.

SVG rendering:
```svg
<!-- Object rotated 38° around its center -->
<g class="de-object" data-id="obj-1"
   transform="translate(190, 260) rotate(38) translate(-90, -60)">
    <rect width="180" height="120" ... />
</g>

<!-- Object flipped horizontally -->
<g class="de-object" data-id="obj-2"
   transform="translate(180, 0) scale(-1, 1)">
    <path d="..." />    <!-- shape geometry is mirrored -->
    <foreignObject>     <!-- text is NOT mirrored -->
        <div style="transform: scale(-1, 1)">Label</div>
    </foreignObject>
</g>
```

### 6.6 Z-Ordering (Stacking)


Every object has a `zIndex` that determines its visual stacking order within its layer. Lower values render behind higher values.

| Operation | API | Keyboard | Behavior |
|---|---|---|---|
| Bring to front | `bringToFront(ids)` | `Ctrl+Shift+]` | Set zIndex above all other objects in the layer |
| Send to back | `sendToBack(ids)` | `Ctrl+Shift+[` | Set zIndex below all other objects in the layer |
| Bring forward | `bringForward(ids)` | `Ctrl+]` | Swap zIndex with the next object above |
| Send backward | `sendBackward(ids)` | `Ctrl+[` | Swap zIndex with the next object below |

Z-ordering operates within a layer. An object in layer 2 is always above all objects in layer 1, regardless of zIndex values.

### 6.7 Opacity and Transparency

Opacity is controlled at multiple levels:

| Level | Property | Effect |
|---|---|---|
| **Object** | `presentation.style.opacity` (0-1) | Entire object including text, fill, stroke, shadow |
| **Fill** | `presentation.style.fill.color` with alpha | Fill transparency independent of stroke/text (use `rgba()` or `hsla()`) |
| **Stroke** | `presentation.style.stroke.color` with alpha | Stroke transparency independent of fill |
| **Layer** | `layer.opacity` (0-1) | All objects in the layer rendered at this opacity |
| **Shadow** | `shadow.opacity` (0-1) | Shadow transparency independent of the object |

Object opacity and layer opacity multiply: an object at 0.5 opacity on a layer at 0.5 opacity renders at 0.25 effective opacity.

SVG rendering uses the `opacity` attribute on the object group element for object-level opacity, and on the layer group element for layer-level opacity. Per-property alpha is handled via `rgba()` / `hsla()` color values.

### 6.8 Per-Edge Stroke Control

Each edge of a rectangular shape (top, right, bottom, left) can be independently styled or hidden. This is controlled via `ObjectStyle.perEdgeStroke`, which overrides the uniform `stroke` for individual edges.

**Use cases:**
- **Three-sided box**: Top, left, right strokes visible; bottom hidden — creates an open-bottom container
- **Accent border**: Thick colored left stroke, thin gray other strokes — blockquote-style indicator
- **Fade effect**: Solid strokes on three sides + no bottom stroke + gradient fill fading to transparent at the bottom
- **Table cell borders**: Independent control of each edge, like spreadsheet cell formatting
- **Decorative**: Different colors per edge for visual interest

**Example:**

```typescript
engine.addObject({
    semantic: { type: "container", data: { label: "Open Bottom" } },
    presentation: {
        shape: "rectangle",
        bounds: { x: 100, y: 100, w: 200, h: 150 },
        style: {
            fill: {
                type: "gradient",
                gradient: {
                    type: "linear",
                    angle: 90,  // top to bottom
                    stops: [
                        { offset: 0, color: "var(--theme-surface-raised-bg)" },
                        { offset: 1, color: "transparent" },
                    ],
                },
            },
            stroke: { color: "var(--theme-border-color)", width: 1 },
            perEdgeStroke: {
                top: { visible: true, color: "var(--theme-primary)", width: 2 },
                left: { visible: true },     // inherits from stroke
                right: { visible: true },    // inherits from stroke
                bottom: { visible: false },  // hidden — open bottom
            },
        },
    },
});
```

SVG rendering splits the border into four `<line>` elements (top, right, bottom, left) instead of a single `<rect>` stroke, each independently styled or omitted.

### 6.9 Alignment and Distribution

When multiple objects are selected, alignment and distribution operations arrange them relative to each other:

**Alignment** — Aligns edges or centers of selected objects to a reference (the first-selected object or the bounding box of the selection):

| Operation | Behavior |
|---|---|
| Align left | Left edges of all selected objects align to the leftmost edge |
| Align center | Horizontal centers align to the center of the selection bounding box |
| Align right | Right edges align to the rightmost edge |
| Align top | Top edges align to the topmost edge |
| Align middle | Vertical centers align to the middle of the selection bounding box |
| Align bottom | Bottom edges align to the bottommost edge |

**Distribution** — Equalizes spacing between selected objects (requires 3+ objects):

| Operation | Behavior |
|---|---|
| Distribute horizontally | Equal horizontal gaps between objects (sorted by x position) |
| Distribute vertically | Equal vertical gaps between objects (sorted by y position) |

All alignment/distribution operations are undoable as a single command.

---

## 7. Visual Guide System

### 7.1 Guide Types

**Alignment Guides** — When dragging, thin lines appear showing edge and center alignment with other objects:

```
     ┌──────┐            ┌──────┐
     │  A   │            │  B   │
     └──────┘            └──────┘
         │                   │
         └───── ╌╌╌╌╌╌╌╌ ───┘   ← blue dashed line: centers aligned
```

Snap targets: left edge, right edge, top edge, bottom edge, horizontal center, vertical center.

**Spacing Guides** — When dragging, dimension indicators appear showing that the gap between the dragged object and its neighbors matches existing gaps:

```
     ┌──────┐   ←24px→   ┌──────┐   ←24px→   ┌──────┐
     │  A   │            │  B   │            │  C   │
     └──────┘            └──────┘            └──────┘
```

Pink/red dimension lines with tick marks and numeric labels. Snaps to the equidistant position. Works for both horizontal and vertical spacing. Also detects equal distribution across 4+ objects.

**Size Guides** — During resize, if the object's width or height matches another object on the canvas, a guide appears showing the matching dimension.

**Ruler Guides** — Persistent horizontal and vertical lines dragged from the ruler components. Stored in the document. Act as snap targets. Draggable to reposition, dragged off the ruler to delete.

### 7.2 Guide Engine

```typescript
interface GuideEngine
{
    /** Computes snap position and visual guides during drag/resize. */
    computeGuides(
        movingBounds: Rect,
        operation: "move" | "resize",
        allObjects: DiagramObject[],
        threshold: number
    ): GuideResult;
}

interface GuideResult
{
    /** Snap adjustment to apply to the dragged object. */
    snapDelta: { dx: number; dy: number };

    /** Visual guides to render as transient overlays. */
    guides: VisualGuide[];
}

interface VisualGuide
{
    type: "alignment" | "spacing" | "size" | "ruler";
    lines: LineSegment[];
    label?: { text: string; position: Point };
    color: string;                  // var(--theme-primary) for alignment,
                                    // var(--theme-danger) for spacing
}
```

### 7.3 Snapping Configuration

```typescript
interface SnappingConfig
{
    /** Snap to grid intersections. */
    grid: boolean;
    gridSize: number;

    /** Snap to other object edges and centers. */
    objects: boolean;

    /** Show alignment guide lines during drag. */
    guides: boolean;

    /** Show equal-spacing guides during drag. */
    spacing: boolean;

    /** Show size-match guides during resize. */
    sizing: boolean;

    /** Magnetic snap distance in pixels. */
    threshold: number;

    /** Allow dragging persistent guides from rulers. */
    rulerGuides: boolean;

    /** Angular snap increment for rotation (degrees). 0 = disabled. */
    rotationSnap: number;
}
```

---

## 8. Template & Data Binding Engine

### 8.1 Variable Expressions

Any text in any object can contain `{{variable}}` expressions. When the engine is instantiated with a data context, expressions resolve to values.

**Syntax:**
- **Dot notation**: `{{project.name}}`
- **Filters**: `{{date.now | format:"YYYY-MM-DD"}}`, `{{revision | uppercase}}`
- **Computed viewport**: `{{viewport.scale}}`, `{{viewport.width}}`
- **Semantic data**: `{{semantic.data.className}}`, `{{semantic.type}}`
- **Conditional**: `{{#if project.status === "Draft"}}DRAFT{{/if}}`
- **Iteration**: `{{#each team.members}}{{name}} — {{role}}{{/each}}`

### 8.2 Title Blocks

Title blocks are groups of objects pinned to the canvas edges via `anchor` constraints. They contain text objects with `{{variable}}` bindings.

```
┌─────────────────────────────────────────────────────────┐
│ {{project.name}}                        {{project.logo}}│
│─────────────────────────────────────────────────────────│
│                                                         │
│            (diagram content area)                       │
│                                                         │
│─────────────────────────────────────────────────────────│
│ Author: {{user.name}}    Date: {{date.now | format}}    │
│ Rev: {{revision}}        Scale: {{viewport.scale}}      │
│ Status: {{project.status}}                              │
└─────────────────────────────────────────────────────────┘
```

### 8.3 Templates

Any diagram document can be saved as a template. A template is a regular `DiagramDocument` JSON with `{{variable}}` expressions in text content. When instantiated with a data context, variables resolve.

```typescript
const engine = createDiagramEngine(container, {
    template: savedTemplateJson,
    data: {
        project: { name: "API Gateway", logo: "/img/logo.svg", status: "Draft" },
        user: { name: "Priya V." },
        revision: "3.2",
    },
});
```

---

## 9. Layout Engine

### 9.1 Pluggable Layout

The engine does not implement layout algorithms internally. Layouts are pluggable:

```typescript
engine.applyLayout("hierarchical", {
    direction: "TB",
    spacing: { rank: 80, node: 40 },
});
```

### 9.2 Layout Providers

The engine supports multiple layout algorithm providers. Each is optional — the engine uses whatever is available. Providers are detected via `window.*` globals at runtime.

**Built-in** (no dependencies):

| Layout | Algorithm | Notes |
|---|---|---|
| `force` | Spring-embedder | Same algorithm as current GraphCanvas |
| `radial` | Concentric rings | BFS-based level assignment from root nodes |
| `grid` | Row/column | Configurable columns, spacing, sort |

**maxGraph** (optional, `window.maxgraph`):

| Layout | Algorithm | Notes |
|---|---|---|
| `hierarchical` | Sugiyama | Barycenter ordering, edge crossing minimization |
| `circle` | Circular | Even distribution on a circle |
| `tree` | Compact tree | Space-efficient top-down tree |

**ELK.js** (optional, `window.ELK`):

| Layout | Algorithm | Notes |
|---|---|---|
| `elk-layered` | ELK Layered | Industry-grade Sugiyama, superior edge routing |
| `elk-force` | ELK Force | Force-directed with constraint support |
| `elk-mrtree` | ELK Mr. Tree | Orthogonal tree with edge routing |
| `elk-stress` | ELK Stress | Stress minimization for organic layouts |
| `elk-radial` | ELK Radial | Radial tree with configurable parameters |

**Dagre** (optional, `window.dagre`):

| Layout | Algorithm | Notes |
|---|---|---|
| `dagre` | Dagre | Sugiyama variant, excellent for flowcharts |

**Custom layouts** (registered by the consuming app):

```typescript
engine.registerLayout("my-layout", (objects, connectors, options) =>
{
    const positions = new Map<string, Point>();
    // ... compute positions ...
    return positions;
});
```

**AI-powered layouts** (async custom layouts):

```typescript
engine.registerLayout("ai-optimized", async (objects, connectors, options) =>
{
    const response = await fetch("/api/layout/optimize",
    {
        method: "POST",
        body: JSON.stringify({ nodes: objects, edges: connectors, ...options }),
    });
    return new Map(Object.entries(await response.json()));
});
```

Layout providers are prioritized: if the app requests `"hierarchical"` and both maxGraph and ELK are available, ELK is preferred (better algorithm quality). The priority order is: ELK > Dagre > maxGraph > Built-in.

### 9.3 Manual Layout Override

Users can manually position objects after a layout is applied. Manually positioned objects are marked as `pinned` and excluded from subsequent layout runs.

---

## 10. Public API

### 10.1 Factory Function

```typescript
function createDiagramEngine(
    container: string | HTMLElement,
    options: DiagramEngineOptions
): DiagramEngine;
```

### 10.2 Configuration

```typescript
interface DiagramEngineOptions
{
    // ── Content ──
    document?: DiagramDocument;         // Load existing document
    template?: DiagramDocument;         // Load as template with data binding
    data?: Record<string, unknown>;     // Data context for templates

    // ── Shape libraries ──
    stencils?: string[];                // Stencil packs to load: ["basic", "uml", ...]

    // ── Tools ──
    tools?: string[];                   // Enabled tools: ["select", "draw", "connect", ...]

    // ── Interaction policy ──
    editable?: boolean;                 // false = read-only viewer
    connectable?: boolean;              // Can create connectors
    textEditable?: boolean;             // Can edit text in-place
    resizable?: boolean;                // Can resize objects
    rotatable?: boolean;                // Can rotate objects

    // ── Visual options ──
    grid?: { visible: boolean; size: number; style: "dots" | "lines" | "none" };
    rulers?: { visible: boolean };
    measurements?: { visible: boolean };
    snapping?: Partial<SnappingConfig>;

    // ── Custom content rendering ──
    contentRenderer?: (obj: DiagramObject, container: HTMLElement, bounds: Rect) => boolean;

    // ── Event callbacks ──
    onObjectClick?: (obj: DiagramObject) => void;
    onObjectDoubleClick?: (obj: DiagramObject) => void;
    onConnectorClick?: (conn: DiagramConnector) => void;
    onSelectionChange?: (objects: DiagramObject[], connectors: DiagramConnector[]) => void;
    onTextEditRequest?: (obj: DiagramObject, region: TextRegion) => void;
    onChange?: (changeSet: ChangeSet) => void;
    onViewportChange?: (viewport: ViewportState) => void;
}
```

### 10.3 Engine Methods

```typescript
interface DiagramEngine
{
    // ── Document ──
    getDocument(): DiagramDocument;
    setDocument(doc: DiagramDocument): void;
    clear(): void;

    // ── Objects ──
    addObject(obj: Partial<DiagramObject>): DiagramObject;
    removeObject(id: string): void;
    updateObject(id: string, changes: Partial<DiagramObject>): void;
    getObject(id: string): DiagramObject | null;
    getObjects(): DiagramObject[];
    getObjectsBySemanticType(type: string): DiagramObject[];

    // ── Connectors ──
    addConnector(conn: Partial<DiagramConnector>): DiagramConnector;
    removeConnector(id: string): void;
    updateConnector(id: string, changes: Partial<DiagramConnector>): void;
    getConnector(id: string): DiagramConnector | null;
    getConnectors(): DiagramConnector[];
    getConnectorsBetween(objA: string, objB: string): DiagramConnector[];

    // ── Selection ──
    select(ids: string[]): void;
    clearSelection(): void;
    getSelectedObjects(): DiagramObject[];
    getSelectedConnectors(): DiagramConnector[];

    // ── Viewport ──
    zoomIn(): void;
    zoomOut(): void;
    zoomToFit(): void;
    zoomToSelection(): void;
    zoomToObject(id: string): void;
    setZoomLevel(level: number): void;
    getZoomLevel(): number;
    panTo(point: Point): void;
    centerOn(id: string): void;
    getViewport(): ViewportState;

    // ── Layout ──
    applyLayout(name: string, options?: Record<string, unknown>): void;

    // ── Layers ──
    addLayer(layer: Partial<Layer>): Layer;
    removeLayer(id: string): void;
    updateLayer(id: string, changes: Partial<Layer>): void;
    getLayers(): Layer[];

    // ── History ──
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;

    // ── Z-ordering (stacking) ──
    bringToFront(ids: string[]): void;
    sendToBack(ids: string[]): void;
    bringForward(ids: string[]): void;
    sendBackward(ids: string[]): void;

    // ── Grouping ──
    group(ids: string[]): DiagramObject;          // returns the group object
    ungroup(groupId: string): DiagramObject[];    // returns ungrouped children
    getGroupChildren(groupId: string): DiagramObject[];
    getGroupParent(objectId: string): DiagramObject | null;

    // ── Alignment & distribution (multi-select) ──
    alignObjects(ids: string[], alignment: AlignmentType): void;
    distributeObjects(ids: string[], axis: "horizontal" | "vertical"): void;

    // ── Rotation & flipping ──
    rotateObjects(ids: string[], degrees: number): void;
    flipHorizontal(ids: string[]): void;
    flipVertical(ids: string[]): void;

    // ── Object state ──
    lockObjects(ids: string[]): void;
    unlockObjects(ids: string[]): void;
    setObjectOpacity(ids: string[], opacity: number): void;
    setObjectVisible(ids: string[], visible: boolean): void;

    // ── Clipboard ──
    copy(): void;
    cut(): void;
    paste(): void;
    duplicate(): void;

    // ── Tools ──
    setActiveTool(name: string): void;
    getActiveTool(): string;

    // ── Text editing ──
    startInlineTextEdit(objectId: string, regionId?: string): void;
    endInlineTextEdit(): void;

    // ── Stencils ──
    loadStencilPack(name: string): void;
    registerStencilPack(name: string, shapes: ShapeDefinition[]): void;
    getAvailableShapes(): ShapeDefinition[];

    // ── Guides ──
    addRulerGuide(orientation: "horizontal" | "vertical", position: number): void;
    removeRulerGuide(id: string): void;
    getRulerGuides(): RulerGuide[];

    // ── Comments ──
    addComment(anchor: CommentAnchor, content: string,
        userId: string, userName: string): Comment;
    replyToComment(commentId: string, content: string,
        userId: string, userName: string): CommentEntry;
    resolveComment(commentId: string): void;
    reopenComment(commentId: string): void;
    deleteComment(commentId: string): void;
    getComments(): Comment[];
    getCommentsForObject(objectId: string): Comment[];

    // ── Collaboration ──
    applyOperation(op: Operation): void;
    setRemotePresences(presences: UserPresence[]): void;
    navigateToURI(uri: string): boolean;

    // ── Semantic queries ──
    query(filter: SemanticQuery): (DiagramObject | DiagramConnector)[];

    // ── Format painter ──
    pickFormat(objectId: string): void;
    applyFormat(targetIds: string[], continuous?: boolean): void;
    clearFormat(): void;
    hasFormat(): boolean;

    // ── Layout registration ──
    registerLayout(name: string, layoutFn: LayoutFunction): void;

    // ── Persistence ──
    toJSON(indent?: number): string;
    fromJSON(json: string): void;
    isDirty(): boolean;
    markClean(): void;
    getChangeCount(): number;
    getChangesSince(checkpoint?: string): OperationBatch;
    getCheckpoint(): string;
    validateDocument(doc: unknown): ValidationError[];

    // ── Export ──
    exportSVG(options?: ExportSVGOptions): string;
    exportPNG(options?: ExportPNGOptions): Promise<Blob>;
    exportASCII(options?: ExportASCIIOptions): string;

    // ── Lifecycle ──
    resize(): void;
    getElement(): HTMLElement;
    destroy(): void;

    // ── Events ──
    on(event: string, handler: (...args: unknown[]) => void): void;
    off(event: string, handler: (...args: unknown[]) => void): void;
}
```

---

## 11. Image and Icon Objects

### 11.1 Image Objects

Images are first-class objects on the canvas with their own shape definition in the `basic` stencil pack. They support all standard object capabilities (move, resize, rotate, flip, shadow, opacity, z-ordering, grouping) plus image-specific visual processing.

**Shape definition**: The `image` shape type is part of the `basic` stencil pack (always loaded). It renders an SVG `<image>` element with optional clip path, color adjustment filters, and border stroke.

**Adding images**:

```typescript
// Programmatic
engine.addObject({
    semantic: { type: "image", data: { alt: "Architecture diagram" } },
    presentation: {
        shape: "image",
        bounds: { x: 100, y: 100, w: 300, h: 200 },
        style: {
            stroke: { color: "var(--theme-border-color)", width: 1 },
            shadow: { enabled: true, offsetX: 2, offsetY: 2, blur: 6, color: "rgba(0,0,0,0.2)", opacity: 1 },
        },
        image: {
            src: "https://example.com/diagram.png",
            fit: "cover",
            mask: "rounded-rect",
            maskRadius: 4,
        },
    },
});

// Drag-and-drop: the app handles the drop event, reads the file,
// converts to data URI, and calls engine.addObject()
canvas.addEventListener("drop", (e) =>
{
    const file = e.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = () =>
    {
        engine.addObject({
            semantic: { type: "image", data: { filename: file.name } },
            presentation: {
                shape: "image",
                bounds: { x: dropX, y: dropY, w: 200, h: 150 },
                image: { src: reader.result as string, fit: "contain" },
            },
        });
    };
    reader.readAsDataURL(file);
});
```

**Image `presentation.image` property**: Every object with `shape: "image"` carries an `image` field in its presentation layer using the `ImageStyle` interface (defined in §3.3).

**SVG rendering**:

```svg
<g class="de-object" data-id="obj-img-1" filter="url(#de-shadow-obj-img-1)">
    <defs>
        <clipPath id="de-clip-obj-img-1">
            <circle cx="60" cy="60" r="60" />
        </clipPath>
        <filter id="de-imgfx-obj-img-1">
            <feColorMatrix type="saturate" values="0.5" />
        </filter>
    </defs>
    <image href="..." x="0" y="0" width="120" height="120"
        clip-path="url(#de-clip-obj-img-1)"
        filter="url(#de-imgfx-obj-img-1)"
        preserveAspectRatio="xMidYMid slice" />
    <rect width="120" height="120" fill="none"
        stroke="var(--theme-border-color)" stroke-width="1"
        clip-path="url(#de-clip-obj-img-1)" />
</g>
```

**Image capabilities**:

| Capability | Implementation |
|---|---|
| Place from URL, data URI, or file drop | `image.src` property |
| Resize (maintains aspect ratio with Shift) | Standard resize handles |
| Opacity | `ObjectStyle.opacity` (0-1) |
| Recoloring / tint | `image.adjustments.tint` + `tintOpacity` via SVG `<feColorMatrix>` |
| Grayscale | `image.adjustments.saturation: -1` |
| Brightness / contrast / saturation | Composable SVG filter chain |
| Masking (clip to shape) | `image.mask`: circle, ellipse, rounded-rect, custom path |
| Borders | Standard `StrokeStyle` around the clipped region |
| Shadow | Standard `ShadowStyle` via the stable filter pipeline |
| Crop | `image.crop` — normalized rect within the source |
| Fit modes | `cover` (fill + crop), `contain` (fit + letterbox), `stretch`, `original` |
| Rotation / flip | Standard rotation + flip operations |
| Replace image | Update `image.src` via `engine.updateObject()` |
| Text overlay | Optional `textContent` renders rich text on top of the image |

### 11.2 Icon / Symbol Objects

Icons from Bootstrap Icons or Font Awesome are placed as **standalone scalable objects** on the canvas. The `icon` shape type is part of the `basic` stencil pack (always loaded).

**Rendering**: Icons render as SVG `<text>` elements using the icon font family (e.g., `bootstrap-icons`), with the Unicode glyph as the text content. This makes them infinitely scalable, colorable via `fill`, and compatible with all standard object operations (shadow, rotation, flip, opacity, grouping).

```svg
<!-- Icon object: a star rendered via Bootstrap Icons font -->
<g class="de-object" data-id="obj-icon-1" filter="url(#de-shadow-obj-icon-1)">
    <text x="24" y="36" font-family="bootstrap-icons" font-size="48"
        fill="var(--theme-warning)" text-anchor="middle"
        dominant-baseline="central">&#xF586;</text>
</g>
```

**Adding icons**:

```typescript
// Programmatic
engine.addObject({
    semantic: { type: "icon", data: { icon: "bi-star-fill", library: "bootstrap-icons" } },
    presentation: {
        shape: "icon",
        bounds: { x: 200, y: 150, w: 48, h: 48 },
        style: {
            fill: { type: "solid", color: "var(--theme-warning)" },
            shadow: { enabled: true, offsetX: 1, offsetY: 1, blur: 3, color: "rgba(0,0,0,0.3)", opacity: 1 },
        },
    },
});

// Via SymbolPicker integration: the app opens SymbolPicker,
// user selects an icon, app calls engine.addObject() with the result
```

**Icon styling**:

| Capability | Implementation |
|---|---|
| Color | `ObjectStyle.fill.color` — any CSS color or `var(--theme-*)` token |
| Size | Controlled by `bounds.width` / `bounds.height` (icon scales to fill) |
| Stroke / outline | `ObjectStyle.stroke` — adds visible outline to the glyph |
| Shadow | Standard `ShadowStyle` |
| Opacity | Standard `ObjectStyle.opacity` |
| Rotation / flip | Standard rotation + flip operations |
| Background | Optional `ObjectStyle.fill` with a background shape behind the icon |

**Inline icons in text** — Icons can also be inserted inline within any rich text run using the `IconRun` type (see §3.4). The existing SymbolPicker component integrates naturally — it already discovers all BI + FA icons from loaded stylesheets at runtime. Inline icons inherit size and color from surrounding text unless overridden.

---

## 12. Export

### 12.1 SVG Export

The most natural format since the engine renders SVG internally. Produces a standalone SVG file that renders identically in any viewer.

```typescript
interface ExportSVGOptions
{
    /** Embed images as data URIs. Default: true. */
    embedImages?: boolean;

    /** Resolve CSS custom properties to computed values. Default: true. */
    resolveThemeVars?: boolean;

    /** Include only selected objects. Default: false (full canvas). */
    selectionOnly?: boolean;

    /** Inline referenced fonts (Google Fonts, etc.). Default: false. */
    embedFonts?: boolean;

    /** Add padding around content. Default: 20. */
    padding?: number;
}
```

### 12.2 PNG Export

Renders the SVG to a `<canvas>` element at a configurable scale factor, then exports as PNG blob. Supports transparent or colored background.

```typescript
interface ExportPNGOptions
{
    /** Scale factor (2 = 2x resolution for retina). Default: 2. */
    scale?: number;

    /** Background color. Default: transparent. */
    background?: string;

    /** Export selection only. Default: false. */
    selectionOnly?: boolean;

    /** Padding in canvas units. Default: 20. */
    padding?: number;

    /** Maximum dimension in pixels (prevents memory issues). Default: 8192. */
    maxDimension?: number;
}
```

### 12.3 ASCII Art Export

Converts the canvas to a character grid using box-drawing and line-drawing Unicode characters. Useful for documentation, terminal output, code comments, plain-text contexts (emails, tickets, READMEs), and accessibility.

```typescript
interface ExportASCIIOptions
{
    /** Characters per canvas unit (horizontal). Default: 1. */
    scaleX?: number;

    /** Characters per canvas unit (vertical). Default: 0.5. */
    scaleY?: number;

    /** Box style. */
    boxStyle?: "light" | "heavy" | "double" | "ascii";

    /** Maximum width in characters. Default: 120. */
    maxWidth?: number;

    /** Include connector labels. Default: true. */
    includeLabels?: boolean;
}
```

Example ASCII output (`boxStyle: "light"`):

```
┌──────────────┐         ┌──────────────┐
│    User      │────────→│ AuthService  │
└──────────────┘  login  └──────┬───────┘
                                │
                                │ validate
                                ▼
                         ┌──────────────┐
                         │   Database   │
                         └──────────────┘
```

### 12.4 JSON Export

Serializes the full `DiagramDocument` including semantic and presentation data. This is the canonical persistence format (see §15).

---

## 13. Use Case Examples

### 11.1 Diagrams App (Full Diagramming Tool)

```typescript
const engine = createDiagramEngine("canvas-container", {
    tools: ["select", "draw", "connect", "text", "pan", "zoom", "measure", "pen"],
    stencils: ["basic", "flowchart", "uml", "bpmn", "er", "network", "c4"],
    connectable: true,
    textEditable: true,
    resizable: true,
    rotatable: true,
    snapping: { grid: true, guides: true, spacing: true, sizing: true, rulerGuides: true },
    rulers: { visible: true },
    measurements: { visible: true },

    onSelectionChange: (objects) => { propertyInspector.setTarget(objects); },
    onTextEditRequest: (obj, region) => { engine.startInlineTextEdit(obj.id, region.id); },
    onChange: (changeSet) => { autosave(changeSet); },
});
```

### 11.2 Thinker App (Minimal Node Canvas with Markdown)

```typescript
const engine = createDiagramEngine("thinker-canvas", {
    tools: ["select", "draw", "pan", "zoom"],
    stencils: ["basic"],
    connectable: true,
    textEditable: false,

    onObjectDoubleClick: (obj) =>
    {
        showMarkdownEditorModal({
            value: obj.semantic.data.markdown || "",
            onSave: (md) =>
            {
                engine.updateObject(obj.id, {
                    semantic: { ...obj.semantic, data: { ...obj.semantic.data, markdown: md } },
                    presentation: {
                        ...obj.presentation,
                        textContent: { runs: [{ text: md }], overflow: "ellipsis", verticalAlign: "top", horizontalAlign: "left", padding: 8 },
                    },
                });
            },
        });
    },

    contentRenderer: (obj, container, bounds) =>
    {
        const md = obj.semantic.data.markdown;
        if (md) { renderMarkdownPreview(container, md, bounds); return true; }
        return false;
    },
});
```

### 11.3 Graph Viewer (Replacing GraphCanvas/GraphCanvasMx)

```typescript
const engine = createDiagramEngine("graph-container", {
    tools: ["select", "pan", "zoom"],
    editable: false,
    connectable: false,
});

engine.setDocument(buildGraphDocument(nodes, edges));
engine.applyLayout("hierarchical", { direction: "TB", spacing: 80 });
engine.zoomToFit();

engine.on("object:click", (obj) => {
    console.log("Node:", obj.semantic.data.label);
});
```

### 11.4 Conference Poster with Embedded Diagrams

```typescript
const engine = createDiagramEngine("poster-canvas", {
    stencils: ["basic", "uml"],
    tools: ["select", "draw", "text", "pan", "zoom"],
    data: {
        conference: { name: "KubeCon 2026", track: "Platform Engineering" },
        authors: [{ name: "Priya V.", affiliation: "Knobby Inc." }],
    },
    template: posterTemplateJson,    // Has title block with {{conference.name}}
});

// User places a WordArt title, a UML class diagram, and data tables
// on the same canvas — no mode switching needed
```

### 11.5 Technical Drawing with Measurements

```typescript
const engine = createDiagramEngine("technical-canvas", {
    tools: ["select", "draw", "connect", "measure", "pen", "pan", "zoom"],
    stencils: ["basic"],
    snapping: { grid: true, guides: true, spacing: true, rotationSnap: 15 },
    rulers: { visible: true },
    measurements: { visible: true },
    grid: { visible: true, size: 10, style: "lines" },
    data: {
        project: { name: "Floor Plan — Building A" },
        scale: "1:100",
    },
    template: titleBlockTemplate,
});
```

---

## 14. What This Replaces

| Current Component | Replacement |
|---|---|
| GraphCanvas (custom SVG) | DiagramEngine with `preset: graph viewer` config |
| GraphCanvasMx (maxGraph wrapper) | DiagramEngine with layout engine plugin |
| SpineMap | DiagramEngine with custom layout + viewer config |
| Diagrams app's MaxGraphCanvas module | Direct DiagramEngine usage |
| Diagrams app's custom shape registrations | Stencil packs |
| Diagrams app's shadow monkey-patching | Native ShadowStyle on every object |
| Diagrams app's custom property hacks | Semantic data layer |

maxGraph remains only as an optional **layout compute** dependency — its algorithms compute `{x, y}` positions, and DiagramEngine renders the results.

---

## 15. Serialization Format

```json
{
    "version": "1.0",
    "metadata": {
        "title": "Auth Sequence Diagram",
        "author": "Priya V.",
        "created": "2026-03-15T10:00:00Z",
        "modified": "2026-03-15T14:30:00Z",
        "tags": ["auth", "sequence"]
    },
    "data": {
        "project": { "name": "Knobby Platform" }
    },
    "layers": [
        { "id": "default", "name": "Default", "visible": true, "locked": false, "printable": true, "opacity": 1, "order": 0 }
    ],
    "objects": [
        {
            "id": "obj-1",
            "semantic": {
                "type": "sequence.actor",
                "data": { "name": "User", "role": "end-user" },
                "tags": ["external"]
            },
            "presentation": {
                "shape": "lifeline",
                "bounds": { "x": 100, "y": 50, "width": 80, "height": 400 },
                "rotation": 0,
                "style": {
                    "fill": { "type": "solid", "color": "var(--theme-surface-raised-bg)" },
                    "stroke": { "color": "var(--theme-border-color)", "width": 1.5 }
                },
                "textContent": {
                    "runs": [{ "text": "User", "bold": true }],
                    "overflow": "visible",
                    "verticalAlign": "top",
                    "horizontalAlign": "center",
                    "padding": 8
                },
                "layer": "default",
                "zIndex": 1,
                "locked": false,
                "visible": true
            }
        }
    ],
    "connectors": [
        {
            "id": "conn-1",
            "semantic": {
                "type": "sequence.message",
                "data": {
                    "messageName": "login",
                    "messageType": "synchronous",
                    "parameters": [{ "name": "credentials", "type": "LoginRequest" }],
                    "returnType": "AuthToken",
                    "sequence": 1
                },
                "sourceRef": "actor-user",
                "targetRef": "service-auth",
                "direction": "forward",
                "references": [
                    { "type": "api-endpoint", "uri": "/api/v2/auth/login" }
                ]
            },
            "presentation": {
                "sourceId": "obj-1",
                "targetId": "obj-2",
                "waypoints": [],
                "routing": "straight",
                "style": {
                    "color": "var(--theme-text-secondary)",
                    "width": 1.5,
                    "endArrow": "block"
                },
                "labels": [
                    {
                        "position": "middle",
                        "textContent": {
                            "runs": [
                                { "text": "login", "bold": true },
                                { "text": "(credentials)", "color": "var(--theme-text-muted)", "fontSize": 11 }
                            ],
                            "overflow": "visible",
                            "verticalAlign": "middle",
                            "horizontalAlign": "center",
                            "padding": 4
                        }
                    }
                ]
            }
        }
    ],
    "guides": [],
    "grid": { "size": 20, "style": "dots", "visible": true }
}
```

---

## 16. Additional Capabilities (from Competitive Audit)

The following capabilities were identified through competitive analysis against Google Drawings, Microsoft Visio, Figma, Draw.io, Lucidchart, Excalidraw, Miro, Canva, GoJS, JointJS, Cytoscape.js, Paper.js, D3.js, Fabric.js, Konva.js, and others. They are listed in priority order.

### 16.1 Minimap / Overview Panel

A small inset or external element showing the entire document with a draggable viewport rectangle. Essential for large canvases (1,000+ objects).

```typescript
/** Create a minimap in an external container element. */
engine.createOverview(container: HTMLElement, options?: {
    /** Width of the minimap. Default: 200. */
    width?: number;
    /** Height of the minimap. Default: 150. */
    height?: number;
}): void;

/** Destroy the minimap. */
engine.destroyOverview(): void;
```

The minimap renders a simplified view of all objects (shapes as filled rectangles, connectors as lines) with a semi-transparent viewport rectangle. Clicking/dragging the rectangle navigates the main canvas.

### 16.2 Transactions / Batch Updates

Group multiple operations into a single undoable unit and suppress intermediate re-renders:

```typescript
engine.beginTransaction(label?: string): void;
// ... multiple operations ...
engine.commitTransaction(): void;
engine.rollbackTransaction(): void;
```

All operations between `begin` and `commit` produce a single undo step and a single re-render. Rolling back discards all operations since `begin`. Transactions can be nested (inner transactions merge into the outer one).

### 16.3 Link Validation Callbacks

Domain-specific connection enforcement:

```typescript
interface DiagramEngineOptions
{
    // ... existing ...

    /** Validates whether a connection is allowed before it is created.
     *  Return true to allow, false to reject. */
    onLinkValidate?: (
        source: DiagramObject, sourcePort: string,
        target: DiagramObject, targetPort: string
    ) => boolean;
}
```

Example: "A BPMN gateway can only connect to tasks, not to other gateways."

### 16.4 Conditional Formatting Rules

Apply visual changes to objects automatically based on semantic data values:

```typescript
interface ConditionalFormatRule
{
    /** Rule name. */
    name: string;

    /** Predicate: which objects does this rule apply to? */
    match: (obj: DiagramObject) => boolean;

    /** Style overrides to apply when the rule matches. */
    styleOverrides: Partial<ObjectStyle>;
}

engine.addFormatRule(rule: ConditionalFormatRule): void;
engine.removeFormatRule(name: string): void;
engine.evaluateFormatRules(): void;
```

Example: "If `semantic.data.status === 'critical'`, set `fill.color` to `var(--theme-danger)` and `stroke.width` to 3."

### 16.5 Expand / Collapse Subgraphs

Groups can be collapsed to a compact representation, hiding their children:

```typescript
engine.collapseGroup(groupId: string): void;
engine.expandGroup(groupId: string): void;
engine.isGroupCollapsed(groupId: string): boolean;
engine.toggleGroupCollapse(groupId: string): void;
```

When collapsed:
- Child objects are hidden
- The group shrinks to show only its label and an expand indicator
- Connectors to/from children route to the group boundary instead
- Expanding restores the original layout

### 16.6 Swimlane / Container Shapes

Containers are shapes with automatic spatial membership. Dropping an object inside a container automatically parents it; dragging it out unparents it.

```typescript
interface ShapeDefinition
{
    // ... existing ...

    /** Whether this shape acts as a container (swimlane behavior). */
    isContainer?: boolean;

    /** Whether objects dropped inside are automatically added as children. */
    autoMembership?: boolean;
}
```

Containers differ from groups: groups require explicit `Ctrl+G`; containers use implicit spatial membership. Moving a shape into a swimlane's bounds automatically makes it a child. Moving it out removes the relationship.

### 16.7 Text Auto-Sizing

Shapes can automatically resize to fit their text content, or text can shrink to fit within fixed bounds:

```typescript
interface TextContent
{
    // ... existing ...

    /** Auto-sizing behavior. Default: "fixed". */
    autoSize?: "fixed" | "grow-to-fit" | "shrink-font";
}
```

- `fixed` — Shape bounds don't change; text overflows per `overflow` setting
- `grow-to-fit` — Shape bounds expand to accommodate text (width or height, constrained by min/max size)
- `shrink-font` — Font size decreases proportionally to fit text within fixed bounds (down to a minimum of 8px)

### 16.8 Find and Replace

Search for text content across all objects and connectors:

```typescript
engine.findText(query: string, options?: {
    caseSensitive?: boolean;
    wholeWord?: boolean;
    regex?: boolean;
    semanticData?: boolean;  // search semantic.data values too
}): SearchResult[];

engine.replaceText(
    query: string, replacement: string, options?: { /* same as find */ }
): number;  // returns count of replacements

interface SearchResult
{
    objectId: string;
    field: string;          // "textContent", "semantic.data.label", etc.
    matchIndex: number;
    matchLength: number;
}
```

### 16.9 Animated Layout Transitions

When `applyLayout()` is called, objects smoothly animate from their current positions to their new positions:

```typescript
engine.applyLayout(name: string, options?: {
    // ... existing layout options ...

    /** Animate the transition. Default: true. */
    animate?: boolean;

    /** Animation duration in ms. Default: 500. */
    duration?: number;

    /** Easing function. Default: "ease-in-out". */
    easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
});
```

### 16.10 Boolean Path Operations

Combine or subtract shapes interactively:

```typescript
engine.booleanUnion(idA: string, idB: string): DiagramObject;
engine.booleanSubtract(idA: string, idB: string): DiagramObject;
engine.booleanIntersect(idA: string, idB: string): DiagramObject;
engine.booleanExclude(idA: string, idB: string): DiagramObject;
```

Each operation produces a new compound path object and removes the source objects. Operations are undoable. Implementation uses SVG path algebra (equivalent to Paper.js boolean operations).

### 16.11 Diagram Import from Text

Parse text-based diagram descriptions into `DiagramDocument` objects:

```typescript
engine.importFromMermaid(mermaidSyntax: string): void;
engine.importFromPlantUML(plantUMLSyntax: string): void;
engine.importFromCSV(csv: string, options?: {
    nodeColumn: string;
    edgeSourceColumn?: string;
    edgeTargetColumn?: string;
}): void;
```

These are additive — imported objects are added to the current document. The engine applies a layout after import.

### 16.12 PDF Export

```typescript
engine.exportPDF(options?: {
    /** Page size. Default: "A4". */
    pageSize?: "A4" | "Letter" | "A3" | "Legal" | "custom";

    /** Custom page dimensions in mm (for pageSize: "custom"). */
    customSize?: { width: number; height: number };

    /** Orientation. Default: "landscape". */
    orientation?: "portrait" | "landscape";

    /** Margins in mm. */
    margins?: { top: number; right: number; bottom: number; left: number };

    /** Scale to fit page. Default: true. */
    fitToPage?: boolean;

    /** Include title block. Default: true. */
    includeTitleBlock?: boolean;
}): Promise<Blob>;
```

### 16.13 Spatial Queries

Query objects by canvas position, not just semantic data:

```typescript
engine.findObjectsInRect(rect: Rect): DiagramObject[];
engine.findObjectsAtPoint(point: Point): DiagramObject[];
engine.findNearestObject(point: Point, maxDistance?: number): DiagramObject | null;
engine.findObjectsIntersectingPath(path: PathDefinition): DiagramObject[];
```

### 16.14 Tooltip and Context Menu Anchoring

While the engine is headless, it provides anchor positions for consuming apps to attach tooltips and context menus:

```typescript
engine.on("object:hover", (obj: DiagramObject, screenPos: Point) => {
    tooltip.show(obj.semantic.data.description, screenPos);
});

engine.on("object:contextmenu", (obj: DiagramObject, screenPos: Point) => {
    contextMenu.show(menuItems, screenPos);
});

engine.on("canvas:contextmenu", (canvasPos: Point, screenPos: Point) => {
    contextMenu.show(canvasMenuItems, screenPos);
});
```

### 16.15 Drag-and-Drop from External Sources

Support for dragging shapes from an external stencil palette or files from the desktop:

```typescript
engine.on("canvas:dragover", (e: DragEvent, canvasPos: Point) => {
    // App decides whether to accept the drop
});

engine.on("canvas:drop", (e: DragEvent, canvasPos: Point) => {
    // App reads the dropped data and calls engine.addObject()
});

/** Convenience: begin a drag operation from an external palette. */
engine.beginExternalDrag(shapeType: string, previewSize?: { w: number; h: number }): void;
```

### 16.16 Freehand Brush Tool

A brush tool that captures mouse movement as a continuous freehand stroke (distinct from the precision `pen` tool):

Add `brush` to the tools list. The brush tool creates a path object from raw pointer positions, with optional smoothing. The stroke uses the current stroke style (color, width, dash pattern).

### 16.17 Graph Analysis Queries

For the graph visualization use case, provide analytical queries over the connector topology:

```typescript
engine.getShortestPath(fromId: string, toId: string): string[];  // object IDs
engine.getConnectedComponents(): string[][];                      // arrays of connected object IDs
engine.getNeighbors(objectId: string, depth?: number): string[];
engine.getIncomingConnectors(objectId: string): DiagramConnector[];
engine.getOutgoingConnectors(objectId: string): DiagramConnector[];
```

### 16.18 Component Instances (Master/Instance Pattern)

Reusable shape definitions with live inheritance (Figma-style components):

```typescript
engine.createMasterComponent(objectId: string): string;   // returns master ID
engine.createInstance(masterId: string, position: Point): DiagramObject;
engine.detachInstance(instanceId: string): void;           // breaks the link
```

Changes to a master propagate to all instances unless overridden. Instance overrides are preserved across master updates. Detaching an instance makes it an independent object.

---

### 16.19 Format Painter

Copy the visual style of one object and apply it to others:

```typescript
/** Copies the style of the specified object into the format clipboard. */
engine.pickFormat(objectId: string): void;

/** Applies the format clipboard to the specified objects.
 *  If `continuous` is true, remains in format-paint mode until Escape. */
engine.applyFormat(targetIds: string[], continuous?: boolean): void;

/** Clears the format clipboard and exits format-paint mode. */
engine.clearFormat(): void;

/** Returns true if a format is currently in the clipboard. */
engine.hasFormat(): boolean;
```

The format clipboard captures: fill, stroke, shadow, opacity, font family, font size, font color, bold/italic/underline, text alignment, and render style (clean/sketch). It does NOT capture: bounds, position, rotation, semantic data, text content, or shape type.

Keyboard: Select an object → `Ctrl+Shift+C` (copy format) → click target objects → `Escape` to exit.

### 16.20 Layout Algorithm Ecosystem

The layout engine supports multiple algorithm providers, loaded additively:

**Built-in layouts** (no dependencies):
- `force` — Spring-embedder (current GraphCanvas implementation)
- `radial` — Concentric rings from root nodes
- `grid` — Row/column arrangement

**maxGraph layouts** (optional, if `window.maxgraph` is present):
- `hierarchical` — Sugiyama algorithm with barycenter ordering
- `circle` — Circular arrangement
- `tree` — Compact tree layout

**ELK.js layouts** (optional, if `window.ELK` is present):
- `elk-layered` — Eclipse Layout Kernel layered algorithm (industry-grade Sugiyama)
- `elk-force` — ELK force-directed with constraint support
- `elk-mrtree` — ELK tree layout with orthogonal edges
- `elk-stress` — Stress minimization layout
- `elk-radial` — ELK radial layout

**Dagre layouts** (optional, if `window.dagre` is present):
- `dagre` — Dagre directed graph layout (Sugiyama variant with good edge routing)

**Custom layouts**:

```typescript
engine.registerLayout(name: string, layoutFn: LayoutFunction): void;

type LayoutFunction = (
    objects: DiagramObject[],
    connectors: DiagramConnector[],
    options: Record<string, unknown>
) => Map<string, Point>;  // object ID → new position
```

**AI-powered layouts**: Custom layout functions can call AI services to compute optimal positions. The layout function is async-capable:

```typescript
engine.registerLayout("ai-optimized", async (objects, connectors, options) =>
{
    const response = await fetch("/api/layout/optimize",
    {
        method: "POST",
        body: JSON.stringify({ objects, connectors, options }),
    });
    const positions = await response.json();
    return new Map(Object.entries(positions));
});

// Usage
engine.applyLayout("ai-optimized", { objective: "minimize-crossings" });
```

### 16.21 Embedded Content Objects (MathML, LaTeX, Data Tables, OLE)

Beyond images and icons, the engine supports **embedded content objects** — specialized shapes that render rich, non-vector content inside a node.

#### Math Equations (MathML / LaTeX)

A `math` shape type renders mathematical equations using MathML or LaTeX notation:

```typescript
engine.addObject({
    semantic: {
        type: "math",
        data: {
            notation: "latex",
            expression: "E = mc^{2}",
        },
    },
    presentation: {
        shape: "math",
        bounds: { x: 100, y: 200, w: 200, h: 60 },
    },
});
```

Rendering uses `<foreignObject>` with a math rendering library (KaTeX or MathJax, provided by the consuming app). The engine emits a `content:render` event; the app provides the renderer:

```typescript
const engine = createDiagramEngine(container, {
    contentRenderer: (obj, container, bounds) =>
    {
        if (obj.semantic.type === "math")
        {
            const expr = obj.semantic.data.expression as string;
            const notation = obj.semantic.data.notation as string;
            if (notation === "latex" && window.katex)
            {
                window.katex.render(expr, container, { displayMode: true });
                return true;
            }
        }
        return false;
    },
});
```

#### Data Tables

A `table` shape type renders structured tabular data inside a node:

```typescript
engine.addObject({
    semantic: {
        type: "table",
        data: {
            columns: [
                { key: "name", label: "Name", width: 120 },
                { key: "type", label: "Type", width: 80 },
                { key: "nullable", label: "Null?", width: 50 },
            ],
            rows: [
                { name: "id", type: "UUID", nullable: "NO" },
                { name: "email", type: "VARCHAR", nullable: "NO" },
                { name: "avatar_url", type: "TEXT", nullable: "YES" },
            ],
        },
    },
    presentation: {
        shape: "table",
        bounds: { x: 300, y: 100, w: 280, h: 140 },
        style: {
            stroke: { color: "var(--theme-border-color)", width: 1 },
        },
    },
});
```

Tables render as HTML inside `<foreignObject>`, styled with theme tokens. They support:
- Column headers with labels
- Row data with per-cell text styling
- Column resizing via drag handles
- Row highlight on hover
- Sort indicators (visual only — app handles sort logic via callbacks)

#### Generic Embedded Content (OLE-like)

For content types not yet anticipated, the engine supports a generic `embed` shape that delegates rendering entirely to the consuming app:

```typescript
engine.addObject({
    semantic: {
        type: "embed",
        data: {
            contentType: "application/vnd.knobby.chart",
            contentUri: "charts://revenue-q4-2026",
            // App-specific payload
            chartConfig: { type: "bar", dataSource: "api://metrics" },
        },
    },
    presentation: {
        shape: "embed",
        bounds: { x: 400, y: 200, w: 350, h: 250 },
    },
});
```

The `contentRenderer` callback receives this object and can render anything inside it: charts, videos, live data feeds, iframes, or custom visualizations. The engine handles the container (sizing, positioning, shadow, border); the app handles the content.

This is the **extensibility escape hatch** — any content type the engine doesn't natively understand can be rendered by the app through this mechanism, similar to OLE (Object Linking and Embedding) but without the COM/ActiveX baggage.

**Supported embedded content types** (app-provided renderers):

| Content Type | Renderer | Example |
|---|---|---|
| `math` | KaTeX / MathJax | LaTeX equations |
| `table` | Built-in HTML table | Database schemas, API parameters |
| `markdown` | Vditor / marked | Rich formatted text blocks |
| `chart` | App-specific | Bar/line/pie charts |
| `code` | Highlight.js / CodeMirror | Syntax-highlighted code blocks |
| `video` | HTML5 `<video>` | Instructional videos |
| `iframe` | Sandboxed `<iframe>` | Live web content |
| `custom` | App callback | Anything else |

---

### 16.22 Shape Designer (Self-Hosting)

The DiagramEngine can be used to build its own custom shapes. A "shape designer" is simply another consuming app that uses the engine configured for vector shape creation, then exports the result as a `ShapeDefinition` for use in stencil packs.

**Workflow:**

```
1. Open shape designer (a DiagramEngine instance with pen, draw, boolean tools)
2. Draw the shape geometry:
   - Basic shapes (rect, ellipse, triangle) + boolean operations (union, subtract)
   - Pen tool for freeform vector paths
   - Precise control via snapping, grid, measurements
3. Annotate the shape:
   - Place connection port markers (where connectors attach)
   - Define text regions (where text can be placed within the shape)
   - Place control point markers (yellow diamonds that parameterize geometry)
   - Set resize behavior (aspect-locked, free, custom handles per edge)
4. Set metadata: name, category, icon, default size, min size
5. Test: preview the shape at different sizes, with text, with connectors
6. Export as ShapeDefinition JSON
```

**Export API:**

```typescript
/** Exports the current canvas content as a ShapeDefinition. */
engine.exportAsShapeDefinition(options: {
    type: string;                   // e.g., "my-custom-arrow"
    category: string;               // e.g., "Custom Arrows"
    label: string;                  // e.g., "Curved Notched Arrow"
    icon: string;                   // e.g., "bi-arrow-right"
    defaultSize: { w: number; h: number };
    minSize?: { w: number; h: number };
}): ShapeDefinition;

/** Exports multiple shapes as a stencil pack JSON. */
engine.exportAsStencilPack(name: string, shapes: ShapeDefinition[]): string;
```

**Shape annotation objects** — Special object types used only in shape designer mode:

| Annotation | Purpose | Rendering |
|---|---|---|
| `port-marker` | Connection port definition | Small blue circle with direction arrow |
| `text-region-marker` | Text region boundary | Dashed rectangle with "T" icon |
| `control-point-marker` | Control point definition | Yellow diamond with parameter name |
| `resize-handle-marker` | Custom resize handle | Green square with drag direction |

These annotations are stripped from the exported shape — they only exist during design. The export process converts them into `ConnectionPort[]`, `TextRegion[]`, `ControlPoint[]`, and `ResizeHandle[]` in the `ShapeDefinition`.

**Example: Designing a custom 4-way arrow (like ex2.png)**

1. Draw a horizontal rectangle (the stem)
2. Draw a vertical rectangle (the cross-stem)
3. Boolean union → produces a plus/cross shape
4. Draw 4 triangles at each end for arrow heads
5. Boolean union all → produces the 4-way arrow outline
6. Add control points: `stemThickness` (horizontal drag on the stem edge), `headSize` (drag on the arrow head tip)
7. Add connection ports: one at each arrow tip
8. Add a text region: centered in the shape body
9. Set metadata: type `"arrow-4way"`, category `"Arrows"`, label `"4-Way Arrow"`
10. Export as ShapeDefinition → add to a custom stencil pack

This means all the complex arrow shapes in ex2.png — 4-way arrows, U-turn arrows, circular arrows, chevrons, notched block arrows, directional squares — can be designed within the engine itself and exported as a reusable stencil pack. No external tools needed.

#### Editing Existing Shapes

The shape designer can load, edit, and re-export shapes from existing stencil packs. This enables customization of built-in shapes without rebuilding from scratch.

**API:**

```typescript
/** Load a full stencil pack into the shape designer for browsing/editing.
 *  Each shape appears as an editable object with annotations visible. */
engine.importStencilPack(name: string): void;

/** Load a single shape from the registry onto the designer canvas
 *  with full annotations (ports, text regions, control points). */
engine.importShapeForEditing(shapeType: string): void;

/** Duplicate an existing shape definition with a new type name.
 *  The copy can be modified independently of the original. */
engine.duplicateShape(sourceType: string, newType: string): ShapeDefinition;
```

**Example: Customizing the rounded rectangle**

```
1. engine.importShapeForEditing("rectangle")
   → Canvas shows the rectangle with:
     - Yellow diamond at top-left corner (cornerRadius control point)
     - Blue circles at N/S/E/W (connection ports)
     - Dashed rectangle inside (text region)
     - Green squares at 8 edges (resize handles)

2. Designer modifies:
   - Adjusts default cornerRadius from 0 to 8
   - Adds 4 diagonal connection ports (NE, NW, SE, SW)
   - Changes default fill to gradient (subtle top-to-bottom)
   - Adds a default subtle shadow
   - Moves the text region to be offset from center

3. engine.exportAsShapeDefinition({
       type: "rounded-rect-branded",
       category: "Custom",
       label: "Branded Card",
       icon: "bi-card-heading",
       defaultSize: { w: 200, h: 120 },
   })
   → Produces a ShapeDefinition JSON, loadable in any engine instance
```

**Constraint**: Only **declarative shapes** (SVG path-based) are fully editable in the shape designer. **Programmatic shapes** (like UML class with compartment logic) can have their visual defaults (colors, stroke widths, font sizes, ports) edited, but not their render logic — that requires code changes.

**Stencil pack management API:**

```typescript
/** List all loaded stencil packs and their shapes. */
engine.getLoadedStencilPacks(): { name: string; shapes: ShapeDefinition[] }[];

/** Remove a stencil pack (does not affect objects already on the canvas). */
engine.unloadStencilPack(name: string): void;

/** Replace a shape in a loaded pack (for live customization). */
engine.replaceShapeInPack(packName: string, shape: ShapeDefinition): void;
```

---

## 17. Implementation Phases (Revised)

### Phase 1: Foundation — Document Model + Basic Rendering

- DiagramObject and DiagramConnector data structures with semantic/presentation split
- SVG render engine: rectangles, ellipses, lines, text (rich via foreignObject)
- Viewport: pan, zoom (wheel + keyboard), zoom-to-fit
- SelectTool: click select, rubber band, move, basic resize (8 handles)
- Undo/redo (command pattern)
- JSON serialization/deserialization
- Event bus
- Theme integration (var(--theme-*))
- Basic stencil pack (rectangle, ellipse, diamond, text, line)

### Phase 2: Rich Text, Shadows, Shapes

- Rich text engine: formatting runs, overflow/ellipsis, contenteditable inline editing
- WordArt: textPath rendering with decorative fill/stroke
- Shadow pipeline: stable SVG filters in `<defs>`, per-object shadow control
- Custom content renderer hook (for markdown-in-nodes)
- Extended shape system: resize handles with aspect control, connection ports
- Flowchart and UML stencil packs
- Layers (add, remove, visibility, lock, ordering)

### Phase 3: Connectors, Routing, Line Styling

- ConnectorTool: draw connectors between ports
- Routing algorithms: straight, orthogonal, curved, segment, manhattan
- User-draggable waypoints on all routing styles
- Line endings: full arrow type library including ER notation
- Dash patterns (12+ variants)
- Connector labels at start/middle/end positions
- Freestanding lines (no source/target object required)
- Connector shadows

### Phase 4: Visual Guides, Snapping, Measurement

- Alignment guides (edge and center snap lines during drag)
- Spacing guides (equal-gap detection with dimension labels)
- Size guides (matching dimension detection during resize)
- Grid snap
- Object snap (edges, centers, midpoints, ports)
- Ruler guide integration (draggable from Ruler component)
- Angular snap for rotation
- MeasureTool: distance, angle, area display
- Smart measurement display during drag

### Phase 5: Templates, Data Binding, Additional Stencils

- Template engine: `{{variable}}` resolution with dot notation, filters, conditionals, iteration
- Title block support: anchor constraints, pinned regions
- Data context integration
- BPMN, ER, Network, C4, OrgChart stencil packs
- PenTool: freeform vector path creation
- DrawTool: click-to-place and drag-to-size
- Copy/paste, duplicate
- Group/ungroup

### Phase 6: Layout Integration, Export, Polish

- Layout engine adapters (force, hierarchical, radial, tree, grid)
- maxGraph layout plugin (optional dependency)
- Export: SVG, PNG (with configurable scale and background), JSON
- Semantic queries: filter by type, data properties, tags
- Performance optimization: viewport culling for large documents
- Keyboard shortcut system
- Accessibility: ARIA attributes, keyboard navigation, screen reader announcements

---

## 18. Performance Targets

| Metric | Target |
|---|---|
| Objects on canvas (smooth interaction) | 1,000+ |
| Objects on canvas (acceptable with viewport culling) | 10,000+ |
| Render time for 100 objects | < 50ms |
| Drag/move frame rate | 60fps |
| Zoom animation | 60fps |
| Document save (1,000 objects, JSON) | < 100ms |
| Document load (1,000 objects, JSON → render) | < 500ms |

### 17.1 Performance Strategies

- **Viewport culling**: Only render objects within the visible viewport + margin. Off-screen objects are removed from the SVG DOM and re-added when scrolled into view.
- **Render batching**: Multiple rapid mutations (e.g., during drag) are batched into a single `requestAnimationFrame` render pass.
- **Spatial index**: R-tree or grid-based spatial index for fast hit testing and guide computation.
- **Incremental rendering**: Only re-render objects whose data changed, not the entire canvas.
- **Shadow filter reuse**: Common shadow configurations share a single `<filter>` definition in `<defs>`.

---

## 19. Accessibility

- Canvas container has `role="application"` with descriptive `aria-label`
- Selected objects announced via `aria-live` region
- Keyboard navigation: Tab into canvas, arrow keys to move between objects, Enter to select
- All tools operable via keyboard (see §6.3)
- High contrast mode: thicker selection handles, stronger guide colors
- Reduced motion: disable zoom animation, guide transitions when `prefers-reduced-motion` is set
- Screen reader: object count, selection state, tool state announced on change

---

## 20. Security

- No `innerHTML` for user-provided content — all text rendered via `textContent` or sanitized rich text
- SVG content sanitized — no `<script>`, `<foreignObject>` with untrusted HTML, or event handler attributes in imported SVG
- Template expressions sandboxed — `{{variable}}` resolution does not execute arbitrary code; only dot-notation property access and whitelisted filters
- Export sanitization — exported SVG stripped of event handlers and script elements
- Image objects: only data URIs and CORS-safe URLs; no cross-origin image loading without explicit opt-in

---

## 21. Page Frames

Page frames are non-exportable guide overlays that define print boundaries, presentation areas, or screen dimensions on the infinite canvas.

### 21.1 Concept

The canvas is infinite, but output is finite. Page frames show where content should be placed for a specific output size — a printed page, a business card, a phone screen, or a photo print. They are visual guides only; they do not clip content or act as containers.

### 21.2 Properties

```typescript
interface PageFrame
{
    id: string;
    number: number;              // auto-assigned 1-based
    x: number; y: number;        // canvas position
    width: number; height: number; // from preset (fixed, not resizable)
    sizeName: string;            // preset name for display
    locked: boolean;
    borderColor: string;
    borderWidth: number;         // 0.5–2px only
    margins: PageFrameMargins;
    backgroundColor: string;     // low alpha
    numberPosition: "above" | "below" | "top-left" | "top-right";
    label?: string;
}
```

### 21.3 Key Behaviours

- **Not exported**: Excluded from SVG, PNG, PDF exports. Preserved in JSON serialisation.
- **Fixed size**: Selected from presets, not resizable by dragging.
- **Lockable**: Once positioned, lock to prevent accidental movement.
- **Nestable**: A large frame can contain smaller frames (e.g., 4x6 photos tiled on A3).
- **Snappable**: Frames snap to each other's edges, margins, and centres.
- **Numbered**: Auto-assigned sequential numbers, re-numbered on delete.
- **Navigable**: Gallery with thumbnails; click to scroll/zoom to a frame.
- **Zoomable**: Frames scale with the canvas zoom.
- **Groupable**: Can participate in groups if the user explicitly groups them.

### 21.4 Predefined Sizes (40+ at 96 DPI)

| Category | Sizes |
|---|---|
| Paper (A-series) | A4 Portrait/Landscape, A3 Portrait |
| Paper (B-series) | B4, B5, B6 Portrait/Landscape |
| Paper (US) | Letter Portrait/Landscape, Legal Portrait |
| Cards | Business Card, Anki Card, Index 3x5, Index 4x6 |
| Photo | 4x6, 5x7, 8x10, 11x14, 16x20, 16x24 |
| Presentation | 16:9 HD (960x540), 4:3 Standard (960x720) |
| Social | Instagram Post (480x480), Twitter Header (576x192) |
| Mobile | iPhone 15, iPhone 15 Pro Max, Android, iPad, iPad Pro 12.9 |
| Screen | Full HD (1920x1080), QHD (2560x1440), 4K (3840x2160), MacBook Air/Pro |

### 21.5 Margin Presets

| Name | Top | Right | Bottom | Left |
|---|---|---|---|---|
| Normal | 72px | 72px | 72px | 72px |
| Narrow | 36px | 36px | 36px | 36px |
| Wide | 72px | 144px | 72px | 144px |
| None | 0 | 0 | 0 | 0 |

### 21.6 API

```typescript
addPageFrame(sizeName: string, position?: Point): PageFrame
removePageFrame(id: string): void
lockPageFrame(id: string): void
unlockPageFrame(id: string): void
scrollToPageFrame(id: string): void
setPageFrameMargins(id: string, margins: PageFrameMargins): void
setPageFrameBorder(id: string, color: string, width: number): void
setPageFrameBackground(id: string, color: string): void
getPageFrames(): PageFrame[]
getPageFrameSizes(): PageFrameSize[]
```

---

## 22. Dependencies

| Dependency | Required | Purpose |
|---|---|---|
| Bootstrap 5 | Yes | Theme tokens (var(--theme-*)), base typography |
| Bootstrap Icons | Yes | Tool icons, shape palette icons |
| maxGraph | Optional | Layout algorithm compute (hierarchical, circle, tree) |
| DOMPurify | Optional | HTML sanitization for rich text and imported content |

No other runtime dependencies. The engine is self-contained vanilla TypeScript compiled to JavaScript with IIFE wrapping, consistent with all other components in the library.

---

## 22. POST-SPEC ADDITIONS (Implemented 2026-03-19 through 2026-03-22)

The following capabilities were added after the original spec was written and are now part of the production engine.

### 22.1 Gradient System

**Gradient fills** — shapes accept `FillStyle.type = "gradient"` with a `GradientDefinition` containing linear or radial type, colour stops with offset (0-1) and colour (hex or rgba), angle for linear, and centre/radius for radial. SVG `<linearGradient>` or `<radialGradient>` elements are created in the shape's parent `<g>` container. The `parseStopColor()` function splits `rgba()` strings into separate `stop-color` and `stop-opacity` SVG attributes since SVG `<stop>` elements do not support `rgba()` directly.

**Gradient strokes** — `StrokeStyle.color` accepts `string | GradientDefinition`. Shape strokes, connector strokes, and per-edge strokes all support gradient colours. Connector gradient strokes use a shared `<defs>` element.

**Per-edge gradient strokes** — `PerEdgeStroke` entries accept `GradientDefinition` colours. The `buildEdgeGradientElement()` function uses `gradientUnits="userSpaceOnUse"` with the actual line coordinates to avoid the degenerate bounding box problem on zero-width/height lines.

**Gradient text** — `TextRun.color` accepts `string | GradientDefinition`. For `<foreignObject>` rendering, gradient text uses CSS `background-clip: text` technique. For SVG `<textPath>` rendering, gradient text uses `fill="url(#gradient-id)"` with gradient definitions in `<defs>`.

**Key implementation detail** — Shape render functions must call `g.appendChild(shapeElement)` BEFORE `applyFillToSvg()` and `applyStrokeToSvg()`. SVG non-container elements (`<rect>`, `<ellipse>`, `<path>`) cannot have `<defs>` children; the gradient defs must be inserted into the parent `<g>` via `el.parentNode.insertBefore()`. See ADR-088.

### 22.2 Image Rendering

The `renderObject()` method checks `presentation.image` and creates an SVG `<image>` element with `preserveAspectRatio` mapped from `ImageStyle.fit` (cover → `xMidYMid slice`, contain → `xMidYMid meet`, stretch → `none`). Image coordinates use local space `(0, 0)` since the parent `<g>` already applies `translate(bounds.x, bounds.y)`.

**Custom HTTP headers** — `ImageStyle.headers` (optional `Record<string, string>`) enables authenticated image loading. When headers are provided, the image is fetched via `XMLHttpRequest` with `responseType: "blob"`, the response is converted to a data URI via `FileReader.readAsDataURL()`, and the data URI is set as the `<image>` href. Transparent backgrounds (PNG/WebP/GIF alpha) are fully preserved.

### 22.3 Text Along Path (WordArt)

`TextContent.textPath` (optional `TextPathDefinition`) enables SVG `<textPath>` rendering instead of `<foreignObject>`. When set, the render engine creates a `<path>` definition in `<defs>` with a deterministic ID (`de-tp-{objectId}`), a `<text>` element with a `<textPath>` child referencing the path, and `<tspan>` elements for each text run.

**TextPathDefinition** — `path` (SVG d string in local coordinates), `startOffset` (0-1 normalised), `textAnchor` (start/middle/end), `letterSpacing`.

**SVG text attribute mapping** — bold → `font-weight`, italic → `font-style`, underline/strikethrough → `text-decoration`, solid colour → `fill`, gradient colour → `fill="url(#gradient-id)"` with deterministic gradient IDs (`de-tpgrad-{objectId}-{runIndex}`), superscript/subscript → `baseline-shift`.

### 22.4 Connector Enhancements

**Connector selectability** — `SelectTool.onMouseDown` checks `hitTestConnector()` after the object hit test. Hit testing uses `parsePathToPoints()` to convert SVG path `d` into a polyline, then `pointToSegmentDistance()` with 8px tolerance. An invisible 12px-wide transparent hit-area path is rendered behind each connector for easier clicking.

**Selection visual** — selected connectors show a 2px dashed blue outline (not a halo, which would interfere with shadows/glows/stroke styles).

**Port hover indicators** — during connect-tool drag, shapes within 80px of the cursor show blue circles (5px radius, primary colour at 30% opacity) at their 8 edge/corner ports. The source object and centre port (`port-c`) are excluded.

**Port resolution** — `findPortNormPosition()` maps all 9 ports (N, NE, E, SE, S, SW, W, NW, C). Centre port is excluded from connector attachment.

### 22.5 Writing Tools

**Highlighter tool** — freehand drawing with semi-transparent thick strokes (10px). Six preset colours at 40% alpha: yellow, pink, blue, green, orange, red. Configurable via `highlightColor` property. Creates path objects with `semantic.type = "highlighter"`.

**Pen tool close-shape** — clicking within 10px of the first anchor point (with ≥ 3 points) closes the path with a `Z` command. Closed shapes receive a default light fill (`rgba(200, 220, 255, 0.2)`) and are fully styleable.

**Paintable shapes** — `PaintableStyle` interface with `clipShape` (rectangle/circle/ellipse/triangle), `canvasData` (data URI for persistence), `clipToBounds`. Rendered via `<foreignObject>` containing an HTML `<canvas>` element with an SVG `<clipPath>` mask. The "paintable" shape type is registered in the extended shapes pack.

**Paintbrush tool** — raster painting inside paintable shapes only. Configurable `brushSize` (1-60px), `brushShape` (circle/square), `brushColor`, `brushAlpha` (0-1), `brushHardness` (0 = fully soft/airbrush via `shadowBlur`, 1 = hard edge). Stroke interpolation via `lineTo` with round `lineCap`. Canvas serialised to data URI on mouse-up, stored in `paintable.canvasData`. Full undo/redo with before/after canvas snapshots.

### 22.6 Other Additions

**Ultra Zoom** — `MAX_ZOOM` increased from 4.0 to 32.0 (3200%) for pixel-level precision with the paintbrush tool.

**Tool cursor management** — `ToolManager.activateTool()` sets `svg.style.cursor` to the tool's `cursor` property (select=default, connect/pen/brush/highlighter/paintbrush/measure=crosshair, pan=grab, text=text).

**Deep merge on updateObject** — `updateObject()` uses `mergePresentation()` which spreads existing style properties before applying changes: `{ ...obj.presentation.style, ...changes.style }`. This prevents property loss when setting shadow/fill/stroke independently.

**getToolInstance API** — `engine.getToolInstance(name)` returns the tool instance for direct property configuration (e.g. paintbrush size, highlighter colour).

**PNG export deprecated** — `exportPNG()` marked `@deprecated` with console warning due to CORS limitations with external images and cross-origin stylesheets. `exportSVG()` and `exportJSON()` are the supported formats.

**Inline text editor fix** — `canvasToContainer()` returns container-relative coordinates (without viewport offset) for correct absolute positioning of the contenteditable overlay.
