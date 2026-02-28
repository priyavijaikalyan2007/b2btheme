<!-- AGENT: PRD specification for the SpineMap component — interactive capability/feature map with SVG rendering, multiple layout algorithms, and integrated editing. -->

# SpineMap — Product Requirements Document

## Overview

SpineMap is an interactive, SVG-rendered capability map that visualizes hierarchical feature/capability data along a central spine with branching sub-nodes. It supports four layout algorithms (vertical, horizontal, radial, winding/serpentine), color-coded availability status, cross-branch dependency connections, zoom/pan for large datasets, and three integrated editing modes (sidebar TreeGrid, popover, visual drag). Nodes are interactive — compact labels on the canvas with PersonChip-style popover cards showing metadata, links, status, and timeframe.

## Problem Statement

Enterprise SaaS products need a way to communicate feature availability, roadmap status, and capability dependencies — both internally (product/engineering alignment) and externally (customer-facing feature matrices). Today this is typically done with static PNG images (produced by PlantUML, PowerPoint, or diagram editors), which suffer from three problems:

1. **Not data-driven**: Every change requires someone to manually rebuild the image.
2. **Not linkable**: Elements in a PNG cannot link to work items, OKRs, or Jira tickets.
3. **Not interactive**: Users cannot filter, search, drill into details, or edit the map.

SpineMap solves all three: it renders from structured data, every node carries metadata with external links, and it supports full interactive editing.

## Goals

1. SVG-rendered capability map with a central spine and branching sub-nodes.
2. Four layout algorithms: vertical, horizontal, radial, winding (serpentine).
3. Color-coded node status: available, in-progress, planned, not-supported, deprecated, custom.
4. Cross-branch dependency/conjunction connections with distinct visual styles.
5. Zoom and pan for maps with up to ~1,500 nodes (50 hubs x 30 branches).
6. Interactive node popovers showing title, status, timeframe, link, description, dependencies.
7. Sidebar editing via composed TreeGrid for power-user bulk editing.
8. Popover editing for quick inline metadata changes.
9. Visual editing: drag-to-reposition, drag-to-reparent, shift-drag to create connections.
10. Export: SVG, PNG, JSON data.
11. Import: programmatic API for ingesting external data (UI import deferred to v2).
12. Accessible: keyboard-navigable nodes, ARIA roles, screen reader announcements.

## Non-Goals

- Full diagramming editor (Visio/draw.io replacement). SpineMap is for semantic editing, not freeform drawing.
- Minimap navigator (deferred to v2).
- Animated layout transitions when switching between layout modes.
- Collaborative real-time editing (multi-user).
- Server-side rendering or SSR support.
- Import UI (file picker, paste-from-clipboard). Import is API-only in v1.

## User Stories

1. **As a product manager**, I want to define capability areas and their features in a sidebar tree so I can quickly build a feature map.
2. **As a product manager**, I want to set each feature's status (available, planned, etc.) so stakeholders can see what's ready and what's coming.
3. **As a product manager**, I want to link features to Jira tickets or OKRs so teams can trace from the map to the actual work.
4. **As an engineer**, I want to draw dependency connections between features so the team understands sequencing.
5. **As a user**, I want to click on any node and see its details (status, timeframe, link, description) in a popover.
6. **As a user**, I want to zoom in/out and pan across large maps so I can navigate 50+ capability areas.
7. **As a user**, I want to switch between vertical, horizontal, radial, and winding layouts to find the best visual representation.
8. **As a user**, I want to drag nodes to reposition them when the auto-layout doesn't look right.
9. **As a user**, I want to export the map as SVG/PNG for embedding in presentations, or JSON for backup/sharing.
10. **As a developer**, I want to load map data from my API and render it without manual construction.
11. **As a developer**, I want to listen for node changes and sync them back to my backend.

## Interfaces

### NodeStatus

```typescript
type NodeStatus = "available" | "in-progress" | "planned"
    | "not-supported" | "deprecated" | "custom";
```

### SpineHub

```typescript
interface SpineHub
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;       // custom label when status is "custom"
    statusColor?: string;       // custom color when status is "custom"
    link?: string;              // external URL (Jira, OKR, etc.)
    timeframe?: string;         // e.g. "Q3 2026", "2026-H2"
    description?: string;
    metadata?: Record<string, string>;
    branches: SpineBranch[];
}
```

### SpineBranch

```typescript
interface SpineBranch
{
    id: string;
    label: string;
    status?: NodeStatus;
    statusLabel?: string;
    statusColor?: string;
    link?: string;
    timeframe?: string;
    description?: string;
    metadata?: Record<string, string>;
    children?: SpineBranch[];   // recursive for sub-sub-branches
}
```

### SpineConnection

```typescript
interface SpineConnection
{
    from: string;               // node id (hub or branch)
    to: string;                 // node id (hub or branch)
    type: "depends-on" | "works-with" | "blocks" | "enhances";
    label?: string;             // optional inline label on the path
}
```

### SpineMapData

```typescript
interface SpineMapData
{
    hubs: SpineHub[];
    connections?: SpineConnection[];
}
```

### SpineMapOptions

```typescript
interface SpineMapOptions
{
    // Required
    container: HTMLElement;

    // Data
    data?: SpineMapData;        // initial data; can also use loadData()

    // Layout
    layout?: "vertical" | "horizontal" | "radial" | "winding";
                                // Default: "vertical"
    hubSpacing?: number;        // pixels between hub centers. Default: 180
    branchSpacing?: number;     // pixels between branch nodes. Default: 60
    branchLength?: number;      // pixels from hub center to first branch. Default: 120

    // Editing
    editable?: boolean;         // enables all editing modes. Default: false
    sidebarPosition?: "left" | "right" | "none";
                                // Default: "right"
    sidebarWidth?: number;      // pixels. Default: 320

    // Status colors (override defaults)
    statusColors?: Partial<Record<NodeStatus, string>>;

    // Zoom
    minZoom?: number;           // Default: 0.1
    maxZoom?: number;           // Default: 3.0
    initialZoom?: number;       // Default: 1.0

    // Display
    showToolbar?: boolean;      // Default: true
    showConnections?: boolean;  // Default: true
    showStatusLegend?: boolean; // Default: true
    fitOnLoad?: boolean;        // auto-fit to container on initial render. Default: true

    // Size
    size?: "sm" | "md" | "lg"; // affects node sizes and font. Default: "md"
    cssClass?: string;

    // Callbacks — node interaction
    onNodeClick?: (node: SpineHub | SpineBranch) => void;
    onNodeDoubleClick?: (node: SpineHub | SpineBranch) => void;
    onNodeHover?: (node: SpineHub | SpineBranch | null) => void;

    // Callbacks — editing
    onNodeAdd?: (node: SpineHub | SpineBranch, parentId: string | null) => void;
    onNodeChange?: (nodeId: string, changes: Partial<SpineHub | SpineBranch>) => void;
    onNodeRemove?: (nodeId: string) => void;
    onNodeReparent?: (nodeId: string, newParentId: string | null) => void;
    onConnectionAdd?: (conn: SpineConnection) => void;
    onConnectionRemove?: (connId: string) => void;

    // Callbacks — layout
    onLayoutChange?: (layout: string) => void;
    onZoomChange?: (zoom: number) => void;
}
```

### SpineMap (class)

```typescript
class SpineMap
{
    constructor(options: SpineMapOptions);

    // Data
    loadData(data: SpineMapData): void;
    getData(): SpineMapData;

    // Nodes
    addHub(hub: SpineHub, index?: number): void;
    addBranch(branch: SpineBranch, parentId: string): void;
    updateNode(nodeId: string, changes: Partial<SpineHub | SpineBranch>): void;
    removeNode(nodeId: string): void;
    reparentNode(nodeId: string, newParentId: string | null): void;
    getNode(nodeId: string): SpineHub | SpineBranch | null;

    // Connections
    addConnection(conn: SpineConnection): void;
    removeConnection(fromId: string, toId: string): void;
    getConnections(): SpineConnection[];

    // Layout
    setLayout(layout: "vertical" | "horizontal" | "radial" | "winding"): void;
    getLayout(): string;
    relayout(): void;           // recompute positions

    // Zoom & Pan
    zoomIn(): void;
    zoomOut(): void;
    zoomTo(level: number): void;
    fitToView(): void;
    panTo(nodeId: string): void;
    getZoom(): number;

    // Selection
    selectNode(nodeId: string): void;
    clearSelection(): void;
    getSelectedNode(): string | null;

    // Export
    exportSVG(): string;        // returns SVG markup string
    exportPNG(): Promise<Blob>; // renders via offscreen canvas
    exportJSON(): string;       // returns SpineMapData as JSON string

    // Import (API-level)
    importJSON(json: string): void;

    // Lifecycle
    refresh(): void;
    destroy(): void;
    getElement(): HTMLElement;
}
```

### Factory Function

```typescript
function createSpineMap(options: SpineMapOptions): SpineMap;
```

## DOM Structure

```
div.spinemap.spinemap-{size} [cssClass]
    div.spinemap-toolbar [optional, showToolbar]
        div.spinemap-toolbar-group
            select.spinemap-layout-select [Vertical/Horizontal/Radial/Winding]
        div.spinemap-toolbar-group
            button.spinemap-btn-zoom-in [+]
            button.spinemap-btn-zoom-out [-]
            button.spinemap-btn-fit [Fit]
        div.spinemap-toolbar-group
            button.spinemap-btn-legend [Legend]
            button.spinemap-btn-export [Export ▾]
                div.spinemap-export-menu
                    button [Export SVG]
                    button [Export PNG]
                    button [Export JSON]
        div.spinemap-toolbar-group [editable only]
            button.spinemap-btn-sidebar [Sidebar]
    div.spinemap-body
        div.spinemap-canvas-wrap
            svg.spinemap-canvas [main SVG, handles zoom/pan]
                g.spinemap-transform [translate + scale group]
                    g.spinemap-connections [dependency/conjunction paths]
                        path.spinemap-conn.spinemap-conn-{type} x N
                    g.spinemap-spine [main spine path]
                        path.spinemap-spine-path
                    g.spinemap-branches [hub-to-branch connector paths]
                        path.spinemap-branch-path x N
                    g.spinemap-nodes [all node elements]
                        g.spinemap-hub x N
                            circle.spinemap-hub-ring
                            circle.spinemap-hub-ring-inner
                            text.spinemap-hub-label
                            circle.spinemap-hub-status-dot
                        g.spinemap-leaf x N
                            rect.spinemap-leaf-rect
                            text.spinemap-leaf-label
                            circle.spinemap-leaf-status-dot
            div.spinemap-popover [HTML overlay, positioned over SVG]
                div.spinemap-popover-header
                    span.spinemap-popover-title
                    button.spinemap-popover-close
                div.spinemap-popover-body
                    div.spinemap-popover-status
                    div.spinemap-popover-timeframe
                    div.spinemap-popover-link
                    div.spinemap-popover-desc
                    div.spinemap-popover-deps
                div.spinemap-popover-actions [editable only]
                    button [Edit]
                    button [Add Child]
                    button [Remove]
        div.spinemap-sidebar [optional, editable only]
            div.spinemap-sidebar-header
                span.spinemap-sidebar-title ["Map Structure"]
                button.spinemap-sidebar-close
            div.spinemap-sidebar-toolbar
                button.spinemap-btn-add-hub [+ Add Hub]
            div.spinemap-sidebar-tree [TreeGrid mounts here]
            div.spinemap-sidebar-footer
    div.spinemap-legend [optional overlay, showStatusLegend]
        div.spinemap-legend-item x N
            span.spinemap-legend-dot
            span.spinemap-legend-label
```

## Layout Algorithms

### Vertical Layout (default)

The spine is a straight vertical line. Hubs are placed at equal intervals along the Y-axis, centered horizontally. Branches fan out alternately to the left and right of each hub:

```
         [Settings]──[FGAC]
             │
             ├──[RBAC]
             │
    [Billing]──[Tenant Admin]──[Logs]
                    │
               [Apps]──[Diagrams]
                    │
                   ...
```

- Hub positions: `(centerX, i * hubSpacing)`
- Left branches: `(centerX - branchLength - j * branchSpacing, hubY + offset)`
- Right branches: `(centerX + branchLength + j * branchSpacing, hubY + offset)`
- Sub-branches extend further from their parent branch node.

### Horizontal Layout

Same as vertical but rotated 90 degrees. Spine flows left to right; branches fan up and down.

- Hub positions: `(i * hubSpacing, centerY)`
- Up branches: `(hubX + offset, centerY - branchLength - j * branchSpacing)`
- Down branches: `(hubX + offset, centerY + branchLength + j * branchSpacing)`

### Radial Layout

Hubs are placed in a circle (or ellipse). Branches radiate outward from each hub, fanning within a sector arc allocated to that hub.

- Hub angle: `i * (2 * PI / hubCount)`
- Hub position: `(cx + radius * cos(angle), cy + radius * sin(angle))`
- Branches radiate outward from hub at sub-angles within the hub's sector.
- The spine path is an ellipse or smooth closed curve through all hubs.

### Winding (Serpentine) Layout

The spine follows an S-curve, alternating direction on each tier. Hubs sit at the bends and midpoints of each curve segment. Branches extend perpendicular to the spine's tangent at each hub.

- Row height: `hubSpacing`
- Hubs per row: determined by container width and `hubSpacing`
- Odd rows flow left-to-right; even rows flow right-to-left
- Spine path: cubic Bezier curves connecting row endpoints
- Branch direction: perpendicular to the local spine tangent

### Collision Resolution

After initial layout placement, a collision resolution pass runs:

1. Compute bounding box for each node (label width + padding).
2. For each pair of overlapping boxes, compute a repulsion vector along the shorter axis.
3. Apply nudge to the node farther from the spine (preserve hub positions).
4. Repeat for a fixed number of iterations (default: 5, configurable internally).
5. For sub-branches, check parent branch clearance and shift outward if overlapping.

This is a simple iterative displacement, not a full force-directed simulation.

## Connections

### Structural Connections (parent-child)

Drawn automatically from the data hierarchy. Style:

| Segment | SVG |
|---------|-----|
| Spine (hub-to-hub) | Thick line/curve, `stroke-width: 3`, solid, $gray-500 |
| Branch (hub-to-leaf) | Medium line, `stroke-width: 2`, solid, $gray-400, arrowhead at leaf |
| Sub-branch (leaf-to-leaf) | Thin line, `stroke-width: 1.5`, solid, $gray-400, arrowhead at child |

### Cross-Branch Connections (dependency/conjunction)

Defined in `SpineMapData.connections`. Routed between arbitrary nodes:

| Type | SVG Dash | Color | Arrowhead | Meaning |
|------|----------|-------|-----------|---------|
| `depends-on` | `stroke-dasharray: 6,3` | $orange-500 | Filled triangle at target | B requires A |
| `works-with` | `stroke-dasharray: 2,4` | $blue-500 | None (bidirectional) | Complementary |
| `blocks` | Solid | $red-500 | Filled triangle at target | A blocks B |
| `enhances` | `stroke-dasharray: 8,3,2,3` | $green-500 | Open diamond at target | A enhances B |

Connection paths use quadratic Bezier curves routed to avoid crossing the spine where feasible. If both nodes are on the same side of the spine, the path arcs outward. If on opposite sides, it arcs over/under the spine with a clearance offset.

Optional `label` is rendered as a small `<text>` element at the path midpoint with a white background rect for readability.

## Zoom & Pan

### Implementation

- All renderable content is inside `g.spinemap-transform`.
- Zoom/pan manipulates a `transform` attribute: `translate(tx, ty) scale(s)`.
- State: `{ tx: number, ty: number, scale: number }`.

### Interactions

| Input | Action |
|-------|--------|
| Mouse wheel | Zoom in/out centered on cursor position |
| Click + drag on background | Pan |
| Click + drag on node | Move node (when editable) |
| Pinch gesture (touch) | Zoom |
| Two-finger drag (touch) | Pan |

### Constraints

- `minZoom` (default 0.1) to `maxZoom` (default 3.0).
- `fitToView()` computes the bounding box of all nodes and sets scale/translate to fit within the container with 40px padding.
- `panTo(nodeId)` centers the viewport on the given node with a smooth scroll (CSS transition on transform, ~200ms).

### Performance at Scale

At 1,500 nodes:
- Each node is a lightweight SVG `<g>` with 2-3 child elements (shape + text + dot).
- No virtual scrolling needed for SVG — browsers handle thousands of SVG elements efficiently.
- Connection paths are the most expensive; limit to `< 200` connections for smooth interaction.
- Node labels use `text-overflow` via `textLength` and `lengthAdjust` SVG attributes, or clip with a `<clipPath>`.

## Editing

### Mode 1: Sidebar TreeGrid (power-user bulk editing)

The sidebar contains a composed TreeGrid (runtime bridge via `window.createTreeGrid`) showing the full hub-branch hierarchy with editable columns:

| Column | Type | Editable | Width |
|--------|------|----------|-------|
| Name | tree (label) | Yes — inline text | flex |
| Status | select | Yes — dropdown | 100px |
| Timeframe | text | Yes — inline text | 90px |
| Link | text | Yes — inline text | 120px |

TreeGrid features used:
- **addNode / removeNode** for add/remove hubs and branches.
- **Inline editing** (F2, Tab, Escape) for fast metadata entry.
- **Drag-drop** for reparenting nodes within the tree.
- **Selection** syncs with canvas: selecting a sidebar row highlights and pans-to the node on the canvas.
- **Context menu** (right-click): Add Hub, Add Branch, Add Sub-branch, Delete, Add Connection.

The "Add Hub" button above the TreeGrid creates a new hub at the end of the spine with a default label ("New Hub") ready for inline rename.

### Mode 2: Popover Editor (quick inline edits)

Clicking a node on the canvas shows the popover. In editable mode, the popover footer has [Edit], [Add Child], and [Remove] buttons:

- **[Edit]**: Replaces the popover body with form fields (label input, status select, timeframe input, link input, description textarea). Save/Cancel buttons. Changes are committed on Save and fire `onNodeChange`.
- **[Add Child]**: Creates a new branch under the clicked node with default label, opens the popover on the new node in edit mode.
- **[Remove]**: Removes the node (and all children) after a confirm prompt (window.confirm). Fires `onNodeRemove`.

### Mode 3: Visual Editor (spatial/canvas editing)

- **Drag node**: Click and drag a node to override its auto-layout position. The node stores a `manualOffset` which is applied on top of the computed layout position. Double-click resets to auto-layout.
- **Reparent node**: Drag a node onto a hub or branch; if the target glows (valid drop target), releasing reparents the node. Invalid targets (e.g., dropping a hub onto a leaf) are rejected.
- **Create connection**: Shift + drag from a node draws a temporary dashed line. Releasing on another node opens a small dropdown to select the connection type (depends-on, works-with, blocks, enhances). ESC cancels.
- **Delete connection**: Click a connection path to select it (highlighted). Press Delete/Backspace to remove.
- **Context menu** (right-click on canvas background): Add Hub at position, Fit to View, Change Layout.
- **Context menu** (right-click on node): Edit, Add Child, Add Connection, Delete, Reset Position.

## Keyboard Navigation

### Canvas Focus

| Key | Action |
|-----|--------|
| Tab | Move focus to next node (follows spine order, then branches depth-first) |
| Shift+Tab | Move focus to previous node |
| Enter / Space | Open popover for focused node |
| Escape | Close popover if open; deselect node |
| Arrow keys | Pan the viewport (10px per press, 50px with Shift) |
| + / = | Zoom in |
| - | Zoom out |
| 0 | Fit to view |
| Delete / Backspace | Remove selected node or connection (when editable) |
| F2 | Open popover in edit mode for focused node (when editable) |

### Popover Focus

| Key | Action |
|-----|--------|
| Tab | Cycle through popover fields and buttons |
| Escape | Close popover |
| Enter | Activate focused button |

### Sidebar Focus

Delegated to TreeGrid's keyboard handling (ArrowUp/Down, Enter, F2, Tab, etc.).

## Accessibility

- `role="img"` on the SVG element with `aria-label` describing the map (e.g., "Capability map with N hubs and M features").
- Each node `<g>` has `role="button"`, `tabindex="0"`, `aria-label` with node label and status.
- `aria-live="polite"` region announces node additions, removals, and status changes.
- Popover has `role="dialog"`, `aria-labelledby` linked to the node title.
- Sidebar TreeGrid provides its own ARIA (role="treegrid", etc.).
- Toolbar buttons have `aria-label` attributes.
- Focus indicators: 2px $blue-600 outline on focused nodes.
- Color is not the only status indicator — status dots also have distinct shapes per status (circle for available, triangle for planned, square for in-progress, diamond for not-supported, X for deprecated) for color-blind users.

## Visual Design

### Canvas

- SVG background: $gray-50 (matches other component backgrounds)
- Grid dots pattern (optional, subtle): $gray-200, 20px spacing, 1px dots
- Default canvas size: fills container width and height

### Hub Nodes (on spine)

- Double-ringed circle: outer ring stroke $gray-400 2px, inner ring stroke colored by status 2.5px
- Fill: $gray-50
- Radius: sm=24px, md=32px, lg=40px
- Label: centered inside circle, $font-size-sm (sm), $font-size-base (md), $font-size-lg (lg)
- Label color: $gray-900
- Label truncation: clip to circle width with ellipsis
- Hover: outer ring stroke $gray-600, subtle scale(1.05) on the `<g>`
- Selected: outer ring stroke $primary, glow filter

### Branch/Leaf Nodes

- Rounded rectangle: 1px $gray-300 border, $gray-50 fill, border-radius 4px
- Status dot: 8px circle at left edge, colored by status, shape varies by status
- Padding: 6px 10px 6px 18px (space for status dot)
- Label: $font-size-sm, $gray-900, single-line truncated with ellipsis
- Max width: 160px (sm), 200px (md), 240px (lg)
- Hover: border $gray-400, fill $gray-100
- Selected: border $primary, fill rgba($primary, 0.05)

### Status Colors (defaults)

| Status | Color | Shape |
|--------|-------|-------|
| available | $green-600 | Circle |
| in-progress | $blue-600 | Square |
| planned | $yellow-500 | Triangle |
| not-supported | $gray-400 | Diamond |
| deprecated | $red-600 | X mark |
| custom | user-provided | Circle |

### Spine Path

- Stroke: $gray-400
- Stroke-width: 3px
- Dashed: no (solid)
- Vertical/Horizontal: straight line with rounded corners at direction changes
- Winding: smooth cubic Bezier S-curves
- Radial: smooth elliptical arc

### Branch Connector Paths

- Stroke: $gray-300
- Stroke-width: 1.5px
- Routing: right-angle with a small radius turn from hub, then straight to leaf
- Arrowhead: small filled triangle at the leaf end, $gray-400

### Toolbar

- Background: $gray-100, bottom border 1px $gray-200
- Height: 36px
- Buttons: $gray-600 text, $gray-200 border, hover $gray-100 background
- Dropdowns: native `<select>` for layout, custom dropdown for export

### Sidebar

- Width: configurable (default 320px)
- Background: $gray-50
- Left border: 1px $gray-200 (when position=right)
- Header: $font-size-base, $font-weight-semibold, $gray-900, bottom border $gray-200
- TreeGrid fills remaining height below header+toolbar

### Popover

- Background: $gray-50
- Border: 1px $gray-300
- Box-shadow: 0 4px 12px rgba(0,0,0,0.15)
- Border-radius: $border-radius
- Width: 260px (sm), 300px (md), 340px (lg)
- Positioned above or below the node, avoiding viewport edges
- Arrow/caret pointing to the source node
- Fields: label/value pairs, $font-size-sm
- Status badge: colored pill with status label
- Link: truncated URL with external-link icon, clickable
- Actions: small buttons, $font-size-sm

### Legend

- Positioned: bottom-left overlay, semi-transparent $gray-50 background
- Status items: dot + shape + label, $font-size-sm, horizontal layout
- Toggleable via toolbar button

### Size Variants

| Element | sm | md | lg |
|---------|----|----|-----|
| Hub radius | 24px | 32px | 40px |
| Hub label font | $font-size-sm | $font-size-base | $font-size-lg |
| Leaf max-width | 160px | 200px | 240px |
| Leaf font | 0.75rem | $font-size-sm | $font-size-base |
| Leaf padding | 4px 8px 4px 14px | 6px 10px 6px 18px | 8px 12px 8px 22px |
| Status dot size | 6px | 8px | 10px |
| Popover width | 260px | 300px | 340px |

## Export

### exportSVG()

Serializes the SVG element (without zoom/pan transform) to a string. The consumer can save as `.svg` or embed inline.

### exportPNG()

Renders the SVG to an offscreen `<canvas>` via `canvg` or `new Image()` with `data:image/svg+xml` source. Returns a `Promise<Blob>` that the consumer can download via `URL.createObjectURL()`.

### exportJSON()

Returns `JSON.stringify(getData())` — the full `SpineMapData` structure including hubs, branches, connections, and any manual position overrides.

### importJSON(json)

Parses the JSON string as `SpineMapData` and calls `loadData()`. Validates structure, logs warnings for malformed entries, and skips invalid nodes gracefully.

## Technical Notes

- TreeGrid resolved at runtime via `window.createTreeGrid` (IIFE-safe bridge pattern, same as ShareDialog's PeoplePicker bridge).
- Fallback: if TreeGrid JS is not loaded, the sidebar shows a simple flat list with add/remove buttons instead of the full tree editor.
- All node positions are computed by the layout engine and stored in an internal position map (not on the data model). Manual overrides stored separately.
- SVG namespace: all SVG elements created with `document.createElementNS("http://www.w3.org/2000/svg", ...)`.
- Popover is an HTML `<div>` overlaid on the SVG, positioned using the node's screen-space coordinates from `getBoundingClientRect()` on the SVG `<g>` element plus the current zoom/pan transform.
- Popover uses `position: fixed` for overflow-safe rendering (same pattern as ADR-040 dropdown fix).
- Connection path routing: for same-side nodes, arc outward with control point offset = 40px. For cross-spine nodes, route via a midpoint above/below the spine with clearance = 20px.
- PNG export uses a temporary full-scale SVG (zoom=1, no pan offset) serialized to a data URL, loaded into an `Image`, drawn to a `<canvas>`, then `canvas.toBlob()`.
- `LOG_PREFIX = "[SpineMap]"` per project convention.
- Window global: `window.createSpineMap` for IIFE consumers.
