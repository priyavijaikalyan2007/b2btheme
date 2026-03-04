<!-- AGENT: Component PRD for the Ontology Visualizer. Specifies CDN components needed for Phase 6 of the Resource Model + Ontology + Explorer plan. Cross-references MASTER_COMPONENT_LIST.md section numbers. -->

# Component PRD: Ontology Visualizer

**Date:** March 3, 2026
**Status:** Design Complete
**For:** UI Team (CDN component implementation)
**Related:** `specs/ontology.prd.md` (Phase 6), `specs/resourcemodel+ontology+explorer.plan.md`

---

## 1. Overview

The Ontology Visualizer is a standalone sub-app and embeddable component set for browsing the ontology schema (type definitions + relationship definitions) and exploring the instance graph (actual resources + relationships between them). It is the visual interface for the Ontology Layer described in `specs/ontology.prd.md`.

The visualizer has three primary views:

1. **Schema Browser** — A graph of type definitions and valid relationship edges (the "meta-model")
2. **Instance Graph Explorer** — A navigable graph of actual resource instances and their relationships
3. **Relationship Editor** — A workflow for creating, editing, and deleting edges between resources

### Design References

- **Neo4j Browser** — Graph exploration with expand-on-click, relationship filtering, property panel
- **Palantir Foundry Ontology Manager** — Type hierarchy browser, relationship schema editor
- **Datadog Service Map** — Dependency topology with health overlays and grouping
- **Backstage System Model** — Service catalog with dependency visualization
- **draw.io / Lucidchart** — Canvas interaction patterns (zoom, pan, select, drag)

---

## 2. Component Decomposition

### 2.1 Component Map

```
Ontology Visualizer App
├── DockLayout (§21.9) ✅ EXISTS
│   ├── North: Graph Toolbar (§7.4) ✅ EXISTS (needs extension)
│   ├── West: Ontology Schema Sidebar ← uses TreeView (§6.1) ✅ EXISTS
│   │   ├── Namespace tree
│   │   ├── Type list per namespace
│   │   └── Search/filter
│   ├── Center: Graph Canvas ← NEW COMPONENT (this PRD)
│   │   ├── Schema mode (type graph)
│   │   └── Instance mode (resource graph)
│   ├── East: Property Inspector (§19.4) ← NEW COMPONENT
│   │   ├── Type detail view
│   │   ├── Relationship detail view
│   │   ├── Resource detail view
│   │   └── Edge detail view
│   ├── South: TabbedPanel (§8.1) ✅ EXISTS
│   │   ├── Tab: Relationship List ← uses DataGrid (§5.1) ✅ EXISTS
│   │   └── Tab: Log Console (§24.2.1) ✅ EXISTS
│   └── StatusBar (§7.2) ✅ EXISTS
│
├── Standalone Embeddable Components:
│   ├── Relationship / Link Manager (§22.1.5) ← NEW COMPONENT
│   ├── Graph Canvas (embeddable mode) ← same as above, constrained
│   ├── Type Badge ← NEW SMALL COMPONENT
│   └── Graph Minimap ← NEW SMALL COMPONENT
```

### 2.2 Reuse Matrix

| Component | MASTER_COMPONENT_LIST § | Status | Notes |
|-----------|------------------------|--------|-------|
| DockLayout | §21.9 | ✅ Exists | App shell — no changes needed |
| Toolbar | §7.1 | ✅ Exists | Base toolbar — no changes needed |
| Graph Toolbar | §7.4 | ✅ Exists | Needs: layout selector dropdown, filter toggles |
| Sidebar | §8.2 | ✅ Exists | Left panel — no changes needed |
| TabbedPanel | §8.1 | ✅ Exists | Bottom panel — no changes needed |
| StatusBar | §7.2 | ✅ Exists | No changes needed |
| TreeView | §6.1 | ✅ Exists | Namespace/type tree in sidebar |
| DataGrid | §5.1 | ✅ Exists | Relationship list table |
| SearchBox | §13.5 | ✅ Exists | Resource search in relationship editor |
| FormDialog | §2.4 | ✅ Exists | Edge property editing |
| Toast | §20.2 | ✅ Exists | Success/error feedback |
| ConfirmDialog | §2.3 | ✅ Exists | Delete confirmation |
| SkeletonLoader | §12.4 | ✅ Exists | Loading states |
| EmptyState | §12.5 | ✅ Exists | "No relationships" state |
| ColorPicker | §3.5 | ✅ Exists | Type color editing (tenant types) |
| **Graph Canvas** | — | **NEW** | Core visualization component |
| **Property Inspector** | §19.4 | **NEW** | Right-side detail/edit panel |
| **Relationship / Link Manager** | §22.1.5 | **NEW** | Entity-to-entity relationship CRUD |
| **Type Badge** | — | **NEW** | Small chip showing type icon + color + name |
| **Graph Minimap** | — | **NEW** | Overview minimap for graph canvas |
| **Graph Legend** | — | **NEW** | Color/shape key for visible types |

---

## 3. NEW COMPONENT: Graph Canvas

**CDN slug:** `graph-canvas`
**Factory:** `createGraphCanvas(options): GraphCanvas`

### 3.1 Description

An interactive, zoomable, pannable graph visualization component that renders nodes (resources or types) and edges (relationships) with configurable layout algorithms, styling, and interaction modes. This is a **general-purpose graph component** that works in both schema mode (type definitions) and instance mode (resource instances).

This component extends the capabilities described in **Dependency Topology Map (§23.5.4)** from the MASTER_COMPONENT_LIST but is designed as a more general-purpose graph canvas suitable for ontology visualization, service dependency maps, org charts, and any node-edge graph use case.

### 3.2 Rendering

The component renders a directed graph using an embedded graph layout engine. Implementation may use maxGraph (consistent with the platform's existing Diagrams and Thinker apps), D3-force, or Elkjs — the choice is an internal implementation detail as long as the public API is honored.

### 3.3 Configuration Options

```typescript
interface GraphCanvasOptions {
  // Container
  container: HTMLElement;

  // Mode
  mode: 'schema' | 'instance';  // Controls default styling and behavior

  // Data
  nodes: GraphNode[];
  edges: GraphEdge[];

  // Layout
  layout: 'force' | 'hierarchical' | 'radial' | 'dagre' | 'group-by-namespace';
  layoutDirection?: 'TB' | 'LR' | 'BT' | 'RL';  // For hierarchical/dagre

  // Appearance
  theme?: 'light' | 'dark';
  nodeSize?: { width: number; height: number };
  showEdgeLabels?: boolean;
  showNodeIcons?: boolean;
  showMinimap?: boolean;
  showLegend?: boolean;
  groupByField?: string;  // e.g., 'namespace' — clusters nodes into visual groups

  // Behavior
  zoomEnabled?: boolean;
  panEnabled?: boolean;
  selectEnabled?: boolean;
  multiSelectEnabled?: boolean;
  dragEnabled?: boolean;
  edgeCreationEnabled?: boolean;  // Drag from node to node to create edge

  // Filtering
  visibleNodeTypes?: string[];     // Filter: only show these type_keys
  visibleEdgeTypes?: string[];     // Filter: only show these relationship_keys
  maxDepth?: number;               // For instance mode: max traversal depth

  // Callbacks
  onNodeClick?: (node: GraphNode) => void;
  onNodeDoubleClick?: (node: GraphNode) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  onEdgeHover?: (edge: GraphEdge | null) => void;
  onSelectionChange?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  onEdgeCreated?: (sourceId: string, targetId: string) => void | Promise<void>;
  onExpandRequest?: (nodeId: string) => void | Promise<void>;  // Instance mode: load neighbors
  onLayoutComplete?: () => void;
}

interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;          // Secondary text below label
  type: string;               // type_key: 'strategy.okr', 'diagrams.diagram'
  namespace?: string;         // For grouping: 'strategy', 'diagrams'
  icon?: string;              // Icon name or URL
  color?: string;             // Hex color for the node
  status?: 'active' | 'planned' | 'deprecated' | 'external';  // Visual treatment
  badge?: string;             // Small badge text (e.g., count, status)
  properties?: Record<string, unknown>;  // Arbitrary metadata shown in tooltip/panel
  expandable?: boolean;       // Show expand indicator (instance mode)
  expanded?: boolean;         // Whether neighbors are loaded
  pinned?: boolean;           // Prevent layout from moving this node
  x?: number;                 // Manual position override
  y?: number;
}

interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;             // Relationship display name
  type: string;               // relationship_key: 'owns', 'aligns_to'
  style?: 'solid' | 'dashed' | 'dotted';  // Visual line style
  color?: string;             // Override edge color
  width?: number;             // Override edge width
  animated?: boolean;         // Animated flow direction indicator
  properties?: Record<string, unknown>;
  provenance?: 'manual' | 'system' | 'ai_inferred' | 'integration';
  confidence?: number;        // 0-1, shown for AI-inferred edges
}
```

### 3.4 Public API

```typescript
interface GraphCanvas {
  // Data
  setData(nodes: GraphNode[], edges: GraphEdge[]): void;
  addNode(node: GraphNode): void;
  addEdge(edge: GraphEdge): void;
  removeNode(nodeId: string): void;
  removeEdge(edgeId: string): void;
  updateNode(nodeId: string, updates: Partial<GraphNode>): void;
  updateEdge(edgeId: string, updates: Partial<GraphEdge>): void;
  getNodes(): GraphNode[];
  getEdges(): GraphEdge[];

  // Selection
  getSelectedNodes(): GraphNode[];
  getSelectedEdges(): GraphEdge[];
  selectNode(nodeId: string): void;
  selectEdge(edgeId: string): void;
  clearSelection(): void;

  // Viewport
  zoomIn(): void;
  zoomOut(): void;
  zoomToFit(): void;
  zoomToNode(nodeId: string): void;
  getZoomLevel(): number;
  setZoomLevel(level: number): void;
  centerOnNode(nodeId: string): void;

  // Layout
  setLayout(layout: string, direction?: string): void;
  relayout(): void;       // Re-run current layout

  // Filtering
  setNodeFilter(typeKeys: string[] | null): void;
  setEdgeFilter(relationshipKeys: string[] | null): void;
  setDepthFilter(maxDepth: number): void;

  // Highlighting
  highlightPath(nodeIds: string[]): void;
  highlightNeighbors(nodeId: string, depth?: number): void;
  highlightBlastRadius(nodeId: string): void;  // All downstream dependents
  clearHighlights(): void;

  // Export
  exportSVG(): string;
  exportPNG(): Promise<Blob>;
  exportJSON(): { nodes: GraphNode[]; edges: GraphEdge[] };

  // State
  setMode(mode: 'schema' | 'instance'): void;
  getMode(): string;

  // Lifecycle
  resize(): void;
  destroy(): void;
}
```

### 3.5 Visual Specifications

**Schema Mode:**

| Element | Appearance |
|---------|-----------|
| Type node | Rounded rectangle, colored by namespace. Icon top-left. Label centered. `status: PLANNED` → dashed border. `status: DEPRECATED` → 40% opacity. |
| Type node (abstract) | Italic label, lighter fill |
| Relationship edge | Directed arrow with label. Dashed for optional cardinality. Thickness indicates cardinality (ONE_TO_ONE thin, MANY_TO_MANY thick). |
| Namespace group | Light colored background enclosure with namespace label at top-left |

**Instance Mode:**

| Element | Appearance |
|---------|-----------|
| Resource node | Rounded rectangle, colored by resource_type's color. Display name as label. Type name as sublabel. |
| External resource | Dotted border + globe icon badge |
| Expandable node | "+" indicator at bottom-right; click to load neighbors |
| Expanded node | "-" indicator; click to collapse |
| Relationship edge | Directed arrow with relationship display_name. Color by category. |
| AI-inferred edge | Dashed line + sparkle icon + confidence percentage label |
| Selected node | Blue glow border, elevated shadow |
| Highlighted path | Bold, saturated colors; non-path elements fade to 30% opacity |

**Interactions:**

| Action | Behavior |
|--------|----------|
| Click node | Select node → triggers `onNodeClick` → Property Inspector shows details |
| Double-click node | Instance mode: navigate to resource in native app. Schema mode: expand/collapse group. |
| Hover node | Show tooltip with key properties (name, type, namespace, status) |
| Click edge | Select edge → triggers `onEdgeClick` → Property Inspector shows edge properties |
| Hover edge | Show tooltip with relationship name, source → target, properties |
| Drag node | Move node position (pin it) |
| Drag from node port to node | Edge creation mode (if `edgeCreationEnabled`) → triggers `onEdgeCreated` |
| Click expand indicator (+) | Load and render the node's neighbors → triggers `onExpandRequest` |
| Right-click node | Context menu: Expand, Collapse, Center, Highlight neighbors, Navigate to, Copy ID |
| Right-click edge | Context menu: Edit properties, Delete edge, Highlight path |
| Ctrl+click | Multi-select |
| Scroll wheel | Zoom in/out |
| Click+drag canvas | Pan |
| Shift+drag | Rubber-band selection |

**Keyboard Shortcuts:**

| Key | Action |
|-----|--------|
| `+` / `-` | Zoom in / out |
| `0` | Zoom to fit |
| `Delete` | Delete selected edge (with confirmation) |
| `Escape` | Clear selection |
| `Ctrl+A` | Select all visible nodes |
| `F` | Focus/center on selected node |
| Arrow keys | Nudge selected node position |

### 3.6 Minimap Sub-Component

The minimap is rendered inside the Graph Canvas when `showMinimap: true`. It shows a thumbnail of the entire graph with a viewport rectangle indicating the current visible area. Clicking/dragging the viewport rectangle pans the main canvas.

| Property | Spec |
|----------|------|
| Position | Bottom-right of canvas, 200×150px |
| Background | Semi-transparent white (light theme) or dark (dark theme) |
| Nodes | Colored dots matching node colors |
| Viewport | Blue semi-transparent rectangle |
| Interaction | Click to pan, drag viewport rectangle |
| Toggle | Via Graph Toolbar minimap button |

### 3.7 Legend Sub-Component

The legend is rendered inside the Graph Canvas when `showLegend: true`. It shows the color-to-type mapping for all visible node types.

| Property | Spec |
|----------|------|
| Position | Top-right of canvas, floating |
| Content | Color swatch + icon + type display_name for each visible namespace |
| Collapsible | Click title to toggle expand/collapse |
| Filterable | Click a legend entry to toggle that type's visibility on/off |

---

## 4. NEW COMPONENT: Property Inspector

**CDN slug:** `property-inspector`
**Factory:** `createPropertyInspector(options): PropertyInspector`

Corresponds to **MASTER_COMPONENT_LIST §19.4 — Property Inspector (Slide-out Drawer)**.

### 4.1 Description

A non-modal right-side panel for viewing and editing details of the selected graph element (type, relationship definition, resource instance, or edge instance). Auto-generates form fields from JSON Schema definitions.

### 4.2 Configuration Options

```typescript
interface PropertyInspectorOptions {
  container: HTMLElement;
  width?: number | string;       // Default: 320px
  resizable?: boolean;           // Default: true
  collapsible?: boolean;         // Default: true

  // Mode
  readOnly?: boolean;            // Default: false

  // Callbacks
  onPropertyChange?: (propertyKey: string, newValue: unknown) => void | Promise<void>;
  onNavigate?: (resourceId: string) => void;   // "Go to resource" click
  onClose?: () => void;
}
```

### 4.3 Public API

```typescript
interface PropertyInspector {
  // Display an entity's properties
  showTypeDefinition(typeDef: OntologyTypeDefinition): void;
  showRelationshipDefinition(relDef: OntologyRelationshipDefinition): void;
  showResourceInstance(resource: ResourceRegistryEntry, properties: Record<string, unknown>): void;
  showEdgeInstance(edge: ResourceRelationship, relDef: OntologyRelationshipDefinition): void;

  // State
  clear(): void;
  setReadOnly(readOnly: boolean): void;

  // Lifecycle
  collapse(): void;
  expand(): void;
  isCollapsed(): boolean;
  resize(): void;
  destroy(): void;
}
```

### 4.4 Visual Specifications

The Property Inspector renders differently based on what is selected:

**Type Definition View:**
```
┌─────────────────────────────┐
│ ■ strategy.okr              │  ← Type badge (color + icon + key)
│ Objective & Key Result      │  ← display_name
│ Status: PLANNED             │  ← status badge
├─────────────────────────────┤
│ Description                 │
│ An Objective with measurable│
│ Key Results for a specific  │
│ time period.                │
├─────────────────────────────┤
│ Properties Schema           │
│ ┌ title       string  req  ┐│
│ │ time_period string  enum ││
│ │ status      string  enum ││
│ │ progress    number  0-100││
│ └─────────────────────────┘│
├─────────────────────────────┤
│ Valid Relationships (5)     │
│ → has_key_result → key_result│
│ ← aligns_to ← work.project │
│ ← pursues ← org_unit       │
│ ...                         │
├─────────────────────────────┤
│ Instances: 0 (PLANNED)     │
└─────────────────────────────┘
```

**Resource Instance View:**
```
┌─────────────────────────────┐
│ ■ Q2 Revenue Growth OKR     │  ← display_name
│ strategy.okr                │  ← Type badge
│ [Open in App ↗]             │  ← Navigation link
├─────────────────────────────┤
│ Properties                  │
│ Status:    ● At Risk        │
│ Period:    Q2 2026          │
│ Progress:  ████░░░ 45%     │
│ Owner:     Platform Team    │  ← Clickable → navigates
├─────────────────────────────┤
│ Relationships (7)           │
│ → has_key_result (3)        │
│   • Increase MRR to $50K   │
│   • 200 active users       │
│   • NPS > 50               │
│ ← aligns_to (2)            │
│   • Payment Redesign       │
│   • Mobile App MVP         │
│ ← pursues (2)              │
│   • Platform Team          │
│   • Growth Team            │
├─────────────────────────────┤
│ Provenance: SYSTEM          │
│ Created: 2026-03-01         │
└─────────────────────────────┘
```

**Edge Instance View:**
```
┌─────────────────────────────┐
│ → aligns_to                 │  ← Relationship badge
│                             │
│ Payment Redesign            │  ← Source (clickable)
│        ↓ aligns to          │
│ Q2 Revenue Growth OKR       │  ← Target (clickable)
├─────────────────────────────┤
│ Edge Properties             │
│ Contribution: ████░ 0.7    │
│ Rationale: "Primary driver  │
│ of MRR key result"          │
├─────────────────────────────┤
│ Provenance: MANUAL          │
│ Created by: Jane Smith      │
│ Created: 2026-02-15         │
├─────────────────────────────┤
│ [Edit Properties]           │
│ [Delete Relationship]       │
└─────────────────────────────┘
```

### 4.5 JSON Schema Form Generation

When displaying editable properties, the Property Inspector auto-generates form fields from the JSON Schema in the type or relationship definition:

| JSON Schema Type | Rendered As |
|-----------------|-------------|
| `string` | Text input |
| `string` with `enum` | Dropdown select |
| `string` with `format: date` | DatePicker (§1.1) |
| `string` with `format: date-time` | DatePicker + TimePicker |
| `string` with `format: uri` | URL input with "Open" link |
| `number` | Number input (with min/max if specified) |
| `number` with min/max as progress | Progress bar with inline edit |
| `integer` | Integer input |
| `boolean` | Toggle switch |
| `array` of `string` | Tag input (chips with add/remove) |
| `uuid` with `ref` | Resource search/picker |
| `object` | Nested property group (accordion) |

---

## 5. NEW COMPONENT: Relationship / Link Manager

**CDN slug:** `relationship-manager`
**Factory:** `createRelationshipManager(options): RelationshipManager`

Corresponds to **MASTER_COMPONENT_LIST §22.1.5 — Relationship / Link Manager**.

### 5.1 Description

A component for creating, viewing, and managing typed relationships between entities. Designed to be embedded in any resource's detail view (Strukture sidebar, Diagram properties panel, Checklist detail, etc.) as a "Relationships" tab or section.

### 5.2 Configuration Options

```typescript
interface RelationshipManagerOptions {
  container: HTMLElement;

  // The resource whose relationships are being managed
  resourceId: string;
  resourceType: string;
  resourceDisplayName: string;

  // Available relationship types (from ontology schema)
  relationshipDefinitions: RelationshipDefinitionSummary[];

  // Existing relationships
  relationships: RelationshipInstance[];

  // Behavior
  readOnly?: boolean;             // Default: false
  allowedRelationshipKeys?: string[];  // Restrict which relationship types can be created
  showProvenance?: boolean;       // Show manual/system/AI badges. Default: true
  showConfidence?: boolean;       // Show confidence for AI-inferred. Default: true
  groupByType?: boolean;          // Group relationships by type. Default: true

  // Callbacks
  onCreateRelationship?: (request: CreateRelationshipRequest) => Promise<void>;
  onDeleteRelationship?: (relationshipId: string) => Promise<void>;
  onEditProperties?: (relationshipId: string, properties: Record<string, unknown>) => Promise<void>;
  onNavigate?: (resourceId: string) => void;
  onConfirmInferred?: (relationshipId: string) => Promise<void>;
  onDismissInferred?: (relationshipId: string) => Promise<void>;
  onSearchResources?: (query: string, typeKeys: string[]) => Promise<ResourceSearchResult[]>;
}

interface RelationshipDefinitionSummary {
  key: string;
  displayName: string;
  inverseName: string;
  targetTypeKeys: string[] | null;
  sourceTypeKeys: string[] | null;
  cardinality: string;
  propertiesSchema?: Record<string, unknown>;
}

interface RelationshipInstance {
  id: string;
  relationshipKey: string;
  relationshipDisplayName: string;
  direction: 'outbound' | 'inbound';  // Relative to the current resource
  otherResourceId: string;
  otherResourceDisplayName: string;
  otherResourceType: string;
  properties: Record<string, unknown>;
  provenance: string;
  confidence?: number;
  createdAt: string;
  createdBy?: string;
}

interface CreateRelationshipRequest {
  targetResourceId: string;
  relationshipKey: string;
  properties?: Record<string, unknown>;
}
```

### 5.3 Public API

```typescript
interface RelationshipManager {
  // Data
  setRelationships(relationships: RelationshipInstance[]): void;
  addRelationship(relationship: RelationshipInstance): void;
  removeRelationship(relationshipId: string): void;

  // UI State
  setReadOnly(readOnly: boolean): void;
  expandAll(): void;
  collapseAll(): void;

  // Lifecycle
  refresh(): void;
  destroy(): void;
}
```

### 5.4 Visual Specifications

```
┌─────────────────────────────────────────────────┐
│ Relationships (7)                    [+ Add]     │
├─────────────────────────────────────────────────┤
│ ▾ aligns to (2)                                  │  ← Grouped by relationship type
│   ■ Q2 Revenue Growth OKR                        │  ← Type badge + display name
│     strategy.okr  · MANUAL · 2026-02-15          │  ← Type, provenance, date
│     [↗] [⋯]                                      │  ← Navigate, more menu
│   ■ Engineering Excellence Goal                   │
│     strategy.goal  · SYSTEM · 2026-01-10         │
│     [↗] [⋯]                                      │
│                                                   │
│ ▾ owned by (1)                                    │
│   ■ Platform Team                                 │
│     strukture.org_unit  · SYSTEM · 2026-01-05    │
│     [↗] [⋯]                                      │
│                                                   │
│ ▾ assigned to (2)                                 │
│   ■ Jane Smith                                    │
│     strukture.person  · MANUAL  role: Tech Lead  │  ← Edge properties inline
│     [↗] [⋯]                                      │
│   ■ Bob Chen                                      │
│     strukture.person  · MANUAL  role: PM         │
│     [↗] [⋯]                                      │
│                                                   │
│ ▾ AI Suggested (2)                    ✨          │  ← Special section for AI-inferred
│   ■ Mobile App MVP                   87%          │  ← Confidence badge
│     work.project  · AI_INFERRED                  │
│     [✓ Confirm] [✗ Dismiss] [↗]                  │
│   ■ Scaling Strategy RFC             72%          │
│     knowledge.rfc  · AI_INFERRED                 │
│     [✓ Confirm] [✗ Dismiss] [↗]                  │
└─────────────────────────────────────────────────┘
```

**"+ Add" Flow:**

Clicking "+ Add" opens a multi-step inline panel (not a modal — stays in context):

```
Step 1: Select relationship type
┌─────────────────────────────────────────────┐
│ Select relationship type:                    │
│ ┌─────────────────────────────────────────┐ │
│ │ → aligns to         (→ OKR, Goal)       │ │
│ │ → owned by          (→ OrgUnit)         │ │
│ │ → assigned to       (→ Person)          │ │
│ │ → depends on        (→ Project, Task)   │ │
│ │ → documents         (→ Service, ...)    │ │
│ └─────────────────────────────────────────┘ │
│ Showing 5 of 12 valid types  [Show all]     │
└─────────────────────────────────────────────┘

Step 2: Search and select target
┌─────────────────────────────────────────────┐
│ aligns to → OKR or Goal                     │
│ [Search resources...                    🔍] │
│ ┌─────────────────────────────────────────┐ │
│ │ ■ Q2 Revenue Growth OKR                 │ │
│ │ ■ Engineering Excellence Goal            │ │
│ │ ■ Customer Satisfaction OKR              │ │
│ └─────────────────────────────────────────┘ │
│                              [Cancel] [Add] │
└─────────────────────────────────────────────┘

Step 3 (if edge has properties): Set properties
┌─────────────────────────────────────────────┐
│ aligns to → Q2 Revenue Growth OKR           │
│                                              │
│ Contribution weight: [0.7        ]           │
│ Rationale:          [Primary driver...]      │
│                                              │
│                        [Cancel] [Create]     │
└─────────────────────────────────────────────┘
```

---

## 6. NEW COMPONENT: Type Badge

**CDN slug:** `type-badge`
**Factory:** `createTypeBadge(options): HTMLElement`

### 6.1 Description

A small, inline chip/badge that visually identifies an ontology type. Used everywhere a resource type needs to be displayed — in the Property Inspector, Relationship Manager, search results, tooltips, and breadcrumbs.

### 6.2 Configuration

```typescript
interface TypeBadgeOptions {
  typeKey: string;          // 'strategy.okr'
  displayName?: string;     // 'OKR' (if not provided, extracted from typeKey)
  icon?: string;            // 'crosshair'
  color?: string;           // '#C0392B'
  size?: 'sm' | 'md' | 'lg';  // Default: 'sm'
  variant?: 'filled' | 'outlined' | 'subtle';  // Default: 'subtle'
  showNamespace?: boolean;  // Show 'strategy.' prefix. Default: false
  clickable?: boolean;      // Default: false
  onClick?: () => void;
}
```

### 6.3 Visual Specifications

```
Small (sm):   [■ OKR]           — 20px height, icon + label
Medium (md):  [■ OKR]           — 28px height, icon + label
Large (lg):   [■ strategy.okr]  — 32px height, icon + full type key

Variants:
  filled:   Background = type color, text = white
  outlined: Border = type color, background = transparent, text = type color
  subtle:   Background = type color at 10% opacity, text = type color
```

---

## 7. Graph Toolbar Extensions

The existing **Graph Toolbar (§7.4)** needs additional items for ontology visualization. These are **configuration extensions**, not new components:

### 7.1 Additional Toolbar Items

| Item | Type | Description |
|------|------|-------------|
| Layout selector | Dropdown | Force / Hierarchical / Radial / Dagre / Group by Namespace |
| Depth slider | Range input | 1-5 hops (instance mode only) |
| Type filter | Multi-select dropdown | Show/hide specific type namespaces |
| Edge filter | Multi-select dropdown | Show/hide specific relationship categories |
| Provenance filter | Toggle group | Show: Manual / System / AI / Integration |
| Expand all | Button | Expand all expandable nodes (instance mode) |
| Collapse all | Button | Collapse to starting node only |
| Highlight blast radius | Toggle button | Click a node → highlight all downstream |
| Mode toggle | Segmented control | Schema / Instance |

---

## 8. Component Interaction Flow

### 8.1 Schema Browser Flow

```
User opens Ontology Visualizer
  │
  ├─ App loads: GET /api/v1/ontology/schema
  │  Returns: all type definitions + relationship definitions
  │
  ├─ Left Sidebar: TreeView shows namespaces → types
  │  Click a type → Graph Canvas centers on that type node
  │                → Property Inspector shows type details
  │
  ├─ Graph Canvas: Schema mode
  │  Nodes = type definitions, colored by namespace
  │  Edges = valid relationship definitions
  │  PLANNED types have dashed borders
  │
  ├─ Click a node → Property Inspector: type schema, valid relationships, instance count
  │
  ├─ Click an edge → Property Inspector: relationship constraints, cardinality, properties schema
  │
  └─ Layout selector → re-arranges graph (force / hierarchical / grouped)
```

### 8.2 Instance Explorer Flow

```
User switches to Instance mode (or opens from another app's "View in Ontology" link)
  │
  ├─ Starting resource provided (e.g., resourceId from URL param)
  │
  ├─ App loads: GET /api/v1/ontology/graph/neighborhood/{resourceId}?depth=1
  │  Returns: starting resource + immediate neighbors + edges
  │
  ├─ Graph Canvas: Instance mode
  │  Starting node centered, neighbors arranged around it
  │  Expandable nodes show "+" indicator
  │
  ├─ Click "+" on a node → GET /api/v1/ontology/graph/neighborhood/{nodeId}?depth=1
  │  New neighbors animate into the graph
  │
  ├─ Click a resource node → Property Inspector: resource details, relationships list
  │                        → "Open in App" link to native sub-app
  │
  ├─ Click an edge → Property Inspector: edge properties, provenance, created by
  │
  ├─ Right-click node → Context menu: Expand, Center, Blast Radius, Navigate
  │
  └─ Depth slider → expands/collapses to N hops from starting resource
```

### 8.3 Relationship Creation Flow

```
From Instance Explorer or Relationship Manager:
  │
  ├─ User clicks "+ Add" or drags edge between nodes
  │
  ├─ Step 1: Select relationship type
  │  Filtered by: source resource's type → valid relationships from ontology schema
  │
  ├─ Step 2: Search target resource
  │  Calls: onSearchResources(query, validTargetTypeKeys)
  │  → GET /api/v1/resources/autocomplete?type={types}&q={query}
  │
  ├─ Step 3: Set edge properties (if relationship definition has properties_schema)
  │  Form auto-generated from JSON Schema
  │
  ├─ Calls: POST /api/v1/ontology/graph/edges
  │
  └─ Edge appears in Graph Canvas + Relationship Manager updates
```

---

## 9. Embeddable Usage

All three new components (Graph Canvas, Property Inspector, Relationship Manager) must work in **standalone app** mode and **embeddable panel** mode.

### 9.1 Embeddable in Other Apps

| Host App | Embedded Component | Where |
|----------|-------------------|-------|
| Strukture | Relationship Manager | Detail pane "Relationships" tab |
| Strukture | Graph Canvas (instance, small) | Detail pane "Graph" tab — shows org unit's neighborhood |
| Diagrams | Relationship Manager | Right sidebar "Relationships" tab |
| Checklists | Relationship Manager | Instance detail "Related" tab |
| Thinker | Relationship Manager | Session detail panel |
| Explorer | Graph Canvas (instance, small) | Resource detail "Graph" tab |
| Explorer | Relationship Manager | Resource detail "Related" tab |

### 9.2 Constrained Mode for Embedding

When embedded in a panel (not the full Ontology app), the Graph Canvas should:
- Disable minimap by default (too small)
- Use a simpler toolbar (zoom + fit + layout only)
- Limit initial depth to 1 hop
- Open "Navigate" actions in the main Ontology app (new tab/panel)

---

## 10. Implementation Priority

| Priority | Component | Reason |
|----------|-----------|--------|
| P0 | Graph Canvas | Core visualization — nothing works without it |
| P0 | Type Badge | Used everywhere — Property Inspector, Relationship Manager, search results |
| P1 | Property Inspector | Essential for understanding what you're looking at |
| P1 | Relationship Manager | Essential for creating and managing edges |
| P2 | Graph Minimap | Nice-to-have for large graphs |
| P2 | Graph Legend | Nice-to-have for readability |
| P2 | Graph Toolbar extensions | Can use basic toolbar initially |

---

## 11. Accessibility

| Requirement | Implementation |
|------------|----------------|
| Keyboard navigation | Arrow keys traverse nodes (Tab moves between nodes, Enter selects, Escape deselects). Full graph navigable without mouse. |
| Screen reader | Nodes announced as "{displayName}, {typeName}, {status}". Edges announced as "{source} {relationshipName} {target}". |
| Focus indicators | Visible focus ring on selected node/edge |
| Color contrast | Type colors meet WCAG AA contrast against node background (4.5:1 minimum) |
| Reduced motion | Respect `prefers-reduced-motion`: skip layout animations, disable animated edge flow |
| High contrast mode | Monochrome node borders with distinct shapes per namespace (circle, diamond, hexagon, rectangle) |

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Initial render (50 nodes, 80 edges) | < 500ms |
| Layout calculation (200 nodes) | < 1s |
| Smooth zoom/pan | 60fps on 100-node graph |
| Expand node (load 20 neighbors) | < 300ms (network) + 200ms (render) |
| Maximum practical graph size | ~500 nodes before suggesting filtering |
| Memory usage | < 50MB for 500-node graph |

---

## 13. Dependencies

| Component | Depends On |
|-----------|-----------|
| Graph Canvas | Graph layout engine (maxGraph, D3-force, or Elkjs) |
| Property Inspector | FormDialog (for edit mode), DatePicker, ColorPicker |
| Relationship Manager | SearchBox, Type Badge, FormDialog (for edge properties) |
| Type Badge | None (pure CSS + minimal JS) |
| Graph Minimap | Graph Canvas (sub-component) |
| Graph Legend | Graph Canvas (sub-component) |
