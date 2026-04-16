<!-- AGENT: PRD for the LayoutPicker component — visually rich dropdown for selecting graph layout algorithms with inline SVG previews. -->

# LayoutPicker Component

**Status:** Draft
**Component name:** LayoutPicker
**Folder:** `./components/layoutpicker/`
**Spec author:** Agent + User
**Date:** 2026-04-16

---

## 1. Overview

### 1.1 What Is It

A visually rich dropdown picker that presents graph layout algorithms with inline SVG thumbnail previews showing a schematic representation of each algorithm's output. Each option displays a small diagram of nodes connected by edges arranged in the pattern that algorithm produces (e.g., nodes in a circle for "Circle", a top-down tree for "Hierarchical", scattered clusters for "Force").

The component replaces the plain-text `<select>` dropdowns currently used in the Diagrams, Thinker, and Ontology Visualizer apps with a richer, more informative picker following the same visual language as MarginsPicker, SizesPicker, ColumnsPicker, and OrientationPicker.

### 1.2 Why Build It

The current layout selection UIs across three apps are plain HTML `<select>` elements with text-only labels. Users must already know what "ELK Stress" or "Dagre LR" means to choose the right algorithm. A visual preview immediately communicates the spatial arrangement each algorithm produces, reducing trial-and-error. Additionally, each app hardcodes its own subset of algorithms with inconsistent naming. A canonical component standardizes the identifiers and lets each consuming app declare exactly which algorithms are available.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|---|---|
| MarginsPicker | SVG thumbnail + text detail rows in a dropdown panel |
| SizesPicker | Proportionally-scaled page thumbnails, category grouping |
| ColumnsPicker | Schematic column-line previews, configurable presets |
| OrientationPicker | Icon-first selection, simple two-option picker pattern |
| Microsoft Visio Layout Gallery | Visual previews of layout algorithms |
| yEd Layout Options | Categorized algorithms with direction variants |

### 1.4 Core Design Principles

1. **Visual-first.** Every algorithm option shows a thumbnail SVG with dots-and-lines schematic of the layout pattern. The thumbnail is the primary affordance; text is secondary.

2. **Canonical identifiers.** The component defines a master enum of layout algorithm IDs. Consuming apps pick from this canonical set. No ad-hoc string identifiers.

3. **Configurable subset.** Apps pass an array of algorithm IDs (or category names) to show only the algorithms they support. The component never shows algorithms the app can't execute.

4. **Library-agnostic.** The component doesn't execute layouts. It returns a canonical ID. The consuming app maps that ID to its layout engine (ELK, Dagre, maxGraph, custom).

5. **Consistent with picker family.** Follows the same dropdown architecture as MarginsPicker: trigger button, fixed-position panel on `document.body`, close on outside click/Escape, z-index 1050.

---

## 2. Canonical Layout Algorithm Registry

### 2.1 Master Algorithm List

Every algorithm has a canonical `id`, `label`, `category`, `description`, and `thumbnail` specification. Apps select a subset by ID.

| ID | Label | Category | Description | Thumbnail Concept |
|---|---|---|---|---|
| `smart` | Smart (Auto) | Smart | Auto-detects diagram type and applies best algorithm | Gear/magic-wand icon with scattered nodes |
| `ai-driven` | AI-Driven | Smart | Uses AI to determine optimal layout | Brain icon with nodes |
| `elk-layered-tb` | ELK Layered ↓ | Hierarchical | Top-to-bottom layered layout (best for flowcharts) | 4 nodes in 3 layers, top-to-bottom edges |
| `elk-layered-lr` | ELK Layered → | Hierarchical | Left-to-right layered layout | 4 nodes in 3 layers, left-to-right edges |
| `elk-tree` | ELK Tree | Tree | Hierarchical tree layout (org charts) | Root node with branching children |
| `elk-force` | ELK Force | Force | Force-directed layout (network graphs) | 5 nodes scattered with spring-like edges |
| `elk-stress` | ELK Stress | Force | Stress-minimization (uniform edge lengths) | 5 nodes evenly spaced with edges |
| `elk-radial` | ELK Radial | Radial | Center-focused radial layout | Center node with ring of nodes around it |
| `dagre-tb` | Dagre ↓ | Hierarchical | Top-to-bottom directed graph | 3 nodes stacked vertically with down arrows |
| `dagre-lr` | Dagre → | Hierarchical | Left-to-right directed graph | 3 nodes horizontal with right arrows |
| `dagre-bt` | Dagre ↑ | Hierarchical | Bottom-to-top directed graph | 3 nodes stacked vertically with up arrows |
| `dagre-rl` | Dagre ← | Hierarchical | Right-to-left directed graph | 3 nodes horizontal with left arrows |
| `hierarchical` | Hierarchical | Hierarchical | General hierarchical/sitemap layout | Pyramid of connected nodes |
| `organic` | Organic (Force) | Force | Force-based organic layout | Loosely clustered nodes with edges |
| `circle` | Circle | Circular | Nodes arranged in a circle | 6 nodes on a ring, edges crossing center |
| `compact-tree` | Compact Tree | Tree | Compact tree with minimal spacing | Tight tree with parent-child edges |
| `radial-tree` | Radial Tree | Radial | Radial layout from center node outward | Concentric rings of nodes |
| `partition` | Partition | Grid | Grid-based partitioning layout | Nodes in grid cells |
| `stack-horizontal` | Stack → | Linear | Horizontal stacking (left to right) | Row of equally-spaced nodes |
| `stack-vertical` | Stack ↓ | Linear | Vertical stacking (top to bottom) | Column of equally-spaced nodes |
| `grid` | Grid | Grid | Simple grid arrangement | 2×3 grid of evenly placed nodes |
| `force` | Force | Force | Generic force-directed layout | Scattered nodes with tension edges |
| `radial` | Radial | Radial | Generic radial layout | Center node with radiating spokes |
| `dagre` | Dagre | Hierarchical | Default Dagre layout | Simple 3-level hierarchy |
| `group-by-namespace` | Group by Namespace | Custom | Groups nodes by namespace/category | Clustered boxes with labeled groups |

### 2.2 Category Definitions

| Category | Description | Thumbnail Accent Color |
|---|---|---|
| Smart | Auto-detection and AI-assisted | `var(--theme-primary)` |
| Hierarchical | Layered, directed, top-down/left-right | `var(--theme-info)` |
| Tree | Parent-child tree structures | `var(--theme-success)` |
| Force | Physics-based spring/stress layouts | `var(--theme-warning)` |
| Radial | Center-outward circular layouts | `var(--theme-purple, #7c3aed)` |
| Circular | Ring-based arrangements | `var(--theme-purple, #7c3aed)` |
| Linear | Row/column stacking | `var(--theme-text-secondary)` |
| Grid | Grid/partition layouts | `var(--theme-text-secondary)` |
| Custom | App-specific layouts | `var(--theme-text-muted)` |

### 2.3 App-to-Algorithm Mapping

Consuming apps declare their supported algorithms. The component renders only those.

**Diagrams App** (full set):
```
smart, ai-driven, elk-layered-tb, elk-layered-lr, elk-tree,
elk-force, elk-stress, elk-radial, dagre-tb, dagre-lr, dagre-bt,
dagre-rl, hierarchical, organic, circle, compact-tree, radial-tree,
partition, stack-horizontal, stack-vertical
```

**Thinker App** (subset):
```
grid, hierarchical, organic, circle, compact-tree
```

**Ontology Visualizer** (subset):
```
group-by-namespace, force, hierarchical, radial, dagre
```

---

## 3. SVG Thumbnail Specification

### 3.1 Dimensions and Styling

- **Viewport:** 48 × 48 px (square, unlike MarginsPicker's page-shaped thumbnails)
- **Node representation:** Small filled circles, radius 3–4px
- **Edge representation:** Thin lines (1px stroke) connecting nodes
- **Node fill:** `var(--theme-primary)` (or category accent color)
- **Edge stroke:** `var(--theme-border-color)`
- **Background:** transparent (inherits item hover/selected bg)
- **Selected state:** Node fill intensifies (full opacity vs 0.6 default)

### 3.2 Thumbnail Rendering Rules

Each algorithm has a deterministic SVG that uses 4–8 nodes and 3–7 edges to illustrate the spatial pattern. Thumbnails are statically computed (no animation). Node positions are hardcoded per algorithm — not dynamically computed by running the actual layout algorithm.

Example thumbnail for `circle`:
```
6 nodes at 60° intervals on a circle of radius 16px centered at (24, 24).
Edges connect adjacent nodes (ring topology).
```

Example thumbnail for `elk-layered-tb`:
```
Layer 0: 1 node at (24, 8)
Layer 1: 2 nodes at (14, 24), (34, 24)
Layer 2: 1 node at (24, 40)
Edges: top→left, top→right, left→bottom, right→bottom
```

Example thumbnail for `force`:
```
5 nodes at quasi-random but aesthetically balanced positions.
Edges form a partial mesh (not fully connected).
Positions hand-tuned to look "organic" but reproducible.
```

### 3.3 Smart/AI Thumbnails

The `smart` and `ai-driven` algorithms use a distinctive icon-style thumbnail rather than a node-edge graph:
- `smart`: A small gear icon or magic-wand with 3 tiny nodes orbiting it
- `ai-driven`: A small brain/sparkle icon with 3 tiny nodes nearby

---

## 4. Component API

### 4.1 TypeScript Interfaces

```typescript
export interface LayoutAlgorithm
{
    id: string;
    label: string;
    category: LayoutCategory;
    description: string;
}

export type LayoutCategory =
    | "smart"
    | "hierarchical"
    | "tree"
    | "force"
    | "radial"
    | "circular"
    | "linear"
    | "grid"
    | "custom";

export interface LayoutPickerOptions
{
    /** Container element or ID string */
    container: HTMLElement | string;

    /** Initial selected algorithm ID */
    value?: string;

    /** Array of algorithm IDs to include (default: all) */
    algorithms?: string[];

    /** Group items by category with headers (default: false) */
    groupByCategory?: boolean;

    /** Show category color accent on thumbnails (default: true) */
    showCategoryAccent?: boolean;

    /** Callback fired when selection changes */
    onChange?: (algorithm: LayoutAlgorithm) => void;

    /** Enable compact/ribbon mode (smaller trigger, no description) */
    ribbonMode?: boolean;

    /** Custom algorithms to register beyond the built-in set */
    customAlgorithms?: CustomAlgorithmDefinition[];
}

export interface CustomAlgorithmDefinition
{
    id: string;
    label: string;
    category: LayoutCategory;
    description: string;
    /** Custom SVG thumbnail (48×48 viewBox) as an SVG string or builder function */
    thumbnail?: string | ((svg: SVGSVGElement) => void);
}

export interface LayoutPickerAPI
{
    /** Get the currently selected algorithm */
    getValue(): LayoutAlgorithm | null;

    /** Set selection by algorithm ID */
    setValue(algorithmId: string): void;

    /** Replace the set of available algorithms */
    setAlgorithms(algorithmIds: string[]): void;

    /** Register additional custom algorithms */
    registerAlgorithm(def: CustomAlgorithmDefinition): void;

    /** Show the dropdown panel */
    show(): void;

    /** Hide the dropdown panel */
    hide(): void;

    /** Tear down the component and remove event listeners */
    destroy(): void;

    /** Get the root DOM element */
    getElement(): HTMLElement;
}
```

### 4.2 Factory Function

```typescript
export function createLayoutPicker(options: LayoutPickerOptions): LayoutPickerAPI;
```

### 4.3 Window Globals (IIFE)

```typescript
window["LayoutPicker"] = LayoutPicker;
window["createLayoutPicker"] = createLayoutPicker;
```

---

## 5. Visual Design

### 5.1 Trigger Button

Same as MarginsPicker trigger: inline-flex button showing:
- Selected algorithm's SVG thumbnail (24×24, scaled down)
- Selected algorithm label text
- Chevron caret (bi-chevron-down)

Height: 22px (ribbon mode) or 32px (standalone mode).

### 5.2 Dropdown Panel

- **Width:** 320px (same as MarginsPicker)
- **Max height:** 500px with overflow-y scroll
- **Position:** Fixed, below trigger via `getBoundingClientRect()`
- **z-index:** 1050

### 5.3 Item Layout

Each item in the list:

```
┌──────────────────────────────────────────┐
│ [48×48 SVG] │ Algorithm Name             │
│  thumbnail  │ Brief description text     │
│             │ Category: Hierarchical     │
└──────────────────────────────────────────┘
```

- **Thumbnail:** 48×48 SVG on the left (flex-shrink: 0)
- **Name:** Bold text (font-weight-medium)
- **Description:** Secondary text (font-size-xs, theme-text-secondary)
- **Category badge:** Optional small colored pill (font-size-2xs)

### 5.4 Category Headers (when groupByCategory: true)

```
┌──────────────────────────────────────────┐
│ ── Hierarchical ─────────────────────────│
│ [thumb] ELK Layered ↓                   │
│         Top-to-bottom layered layout     │
│ [thumb] ELK Layered →                   │
│         Left-to-right layered layout     │
│ ── Force ────────────────────────────────│
│ [thumb] ELK Force                        │
│         Force-directed layout            │
└──────────────────────────────────────────┘
```

Category headers are non-interactive separators with the category name and a thin horizontal rule.

### 5.5 Selected State

- Blue left border (3px solid `var(--theme-primary)`) — same as MarginsPicker
- `aria-selected="true"` on the item
- Background: `var(--theme-selected-bg)`

### 5.6 Dark Mode

All colors use `var(--theme-*)` CSS custom properties. SVG thumbnails use theme tokens for fills and strokes. No hardcoded colors.

---

## 6. Interaction

### 6.1 Mouse

- Click trigger → toggle panel open/close
- Click item → select algorithm, close panel, fire `onChange`
- Click outside panel → close panel

### 6.2 Keyboard

- **Enter / Space** on trigger → toggle panel
- **Enter / Space** on item → select algorithm
- **Arrow Up / Down** → move focus between items (with wrapping)
- **Escape** → close panel, return focus to trigger
- **Tab** → close panel
- **Home / End** → focus first/last item

### 6.3 Focus Management

- On panel open, focus the currently selected item (or first item if none)
- `focusedIndex` tracks keyboard navigation position
- Items have `tabindex="0"` and `role="option"`
- Panel has `role="listbox"`

---

## 7. Accessibility

- Trigger: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-label="Layout algorithm"`
- Panel: `role="listbox"`, `aria-label="Layout algorithms"`
- Items: `role="option"`, `aria-selected`
- Category headers: `role="separator"` (non-focusable)
- Focus visible outlines on all interactive elements
- `prefers-reduced-motion`: disable transitions

---

## 8. Logging and Metrics

### 8.1 Log Prefix

```typescript
const LOG_PREFIX = "[LayoutPicker]";
```

### 8.2 Logged Events

- Instance created: `"created, algorithms=%d, value=%s"`
- Selection changed: `"selected: %s (category=%s)"`
- Panel opened/closed: `"panel opened"` / `"panel closed"`
- Algorithm registered: `"registered custom algorithm: %s"`
- Destroyed: `"destroyed"`

### 8.3 Metrics

Integration with `window.createLogUtility` if available (same pattern as MarginsPicker).

---

## 9. File Structure

```
components/layoutpicker/
├── layoutpicker.ts        # Component source (~600-800 lines)
├── layoutpicker.scss       # Styles (~200-250 lines)
└── README.md               # Usage documentation
```

---

## 10. Usage Examples

### 10.1 Basic (Diagrams App — Full Set)

```typescript
const picker = createLayoutPicker({
    container: "#layout-picker-host",
    value: "elk-layered-tb",
    groupByCategory: true,
    onChange: (algo) => {
        console.log("Layout selected:", algo.id);
        diagramEngine.applyLayout(algo.id);
    }
});
```

### 10.2 Thinker App (Limited Subset)

```typescript
const picker = createLayoutPicker({
    container: "#thinker-layout",
    value: "hierarchical",
    algorithms: ["grid", "hierarchical", "organic", "circle", "compact-tree"],
    onChange: (algo) => thinkerApp.setLayout(algo.id)
});
```

### 10.3 Ontology Visualizer (Custom Algorithm)

```typescript
const picker = createLayoutPicker({
    container: "#onto-layout",
    value: "group-by-namespace",
    algorithms: ["group-by-namespace", "force", "hierarchical", "radial", "dagre"],
    customAlgorithms: [
        {
            id: "group-by-namespace",
            label: "Group by Namespace",
            category: "custom",
            description: "Groups types by their namespace",
            thumbnail: (svg) => {
                // Custom SVG rendering for namespace grouping
            }
        }
    ],
    onChange: (algo) => ontologyApp.applyLayout(algo.id)
});
```

### 10.4 Ribbon Mode

```typescript
const picker = createLayoutPicker({
    container: ribbonControlHost,
    value: "elk-layered-tb",
    algorithms: ["elk-layered-tb", "elk-layered-lr", "elk-force", "circle"],
    ribbonMode: true,
    onChange: (algo) => engine.applyLayout(algo.id)
});
```

---

## 11. Implementation Plan

### Phase 1: Core Component (~600 lines)

1. **Define canonical registry** — `LAYOUT_ALGORITHMS` constant array with all 25 algorithms, their metadata, and thumbnail node/edge coordinate data.

2. **SVG thumbnail builder** — `buildThumbnailSvg(algorithm)` function that renders the 48×48 SVG for each algorithm using the hardcoded node positions and edge connections.

3. **DOM structure** — Trigger button, dropdown panel, scrollable list, item rendering with thumbnail + text details. Follow MarginsPicker patterns exactly (createElement, setAttr, createSvgElement helpers).

4. **Selection logic** — `setValue()`, `getValue()`, `refreshSelection()` with `data-algorithm` attributes and `--selected` class toggling.

5. **Panel positioning** — Fixed-position panel on `document.body`, positioned below trigger via `getBoundingClientRect()`.

6. **Event handling** — Click, keyboard (Enter/Space/Escape/Arrow), outside-click, focus management.

7. **API surface** — Factory function returning `LayoutPickerAPI`, window globals for IIFE.

### Phase 2: Styling (~220 lines)

1. **SCSS** — Component-prefixed classes (`.layoutpicker-*`), theme CSS custom properties, MarginsPicker-consistent spacing/colors.

2. **Thumbnail styling** — SVG node/edge theming, category accent colors, selected state intensity.

3. **Category headers** — Separator styling with label and horizontal rule.

4. **Dark mode** — Verified via `var(--theme-*)` tokens.

5. **Reduced motion** — `@media (prefers-reduced-motion)` disables transitions.

### Phase 3: Documentation

1. **README.md** — Usage, configuration table, API reference, examples per app.

2. **Knowledge base updates** — `agentknowledge/concepts.yaml`, `decisions.yaml` (new ADR), `history.jsonl`.

3. **COMPONENT_INDEX.md** and `MASTER_COMPONENT_LIST.md` updates.

---

## 12. Thumbnail Coordinate Data

Hardcoded node/edge positions for each algorithm's 48×48 thumbnail. These are deterministic and hand-tuned for visual clarity.

### 12.1 Hierarchical Layouts

**elk-layered-tb / dagre-tb:**
```
Nodes: (24,6), (12,20), (36,20), (24,34), (12,42), (36,42)
       but simplified to 4 nodes for clarity:
       (24,8) → (14,24), (34,24) → (24,40)
Edges: (24,8)→(14,24), (24,8)→(34,24), (14,24)→(24,40), (34,24)→(24,40)
```

**elk-layered-lr / dagre-lr:**
```
Nodes: (8,24), (24,14), (24,34), (40,24)
Edges: (8,24)→(24,14), (8,24)→(24,34), (24,14)→(40,24), (24,34)→(40,24)
```

**dagre-bt:** Mirror of dagre-tb (y-inverted).
**dagre-rl:** Mirror of dagre-lr (x-inverted).

### 12.2 Tree Layouts

**elk-tree / compact-tree:**
```
Nodes: (24,6), (12,20), (36,20), (6,34), (18,34), (30,34), (42,34)
Edges: root→left, root→right, left→child1, left→child2, right→child3, right→child4
```

### 12.3 Force Layouts

**elk-force / organic / force:**
```
Nodes: (10,14), (38,10), (24,24), (8,38), (40,36)
Edges: 0→2, 1→2, 2→3, 2→4, 0→3, 1→4 (partial mesh)
```

**elk-stress:**
```
Nodes: (12,12), (36,12), (24,24), (12,36), (36,36)
Edges: Same partial mesh but more evenly spaced (stress-minimized look)
```

### 12.4 Radial / Circular

**circle:**
```
6 nodes at 60° intervals, radius 16, center (24,24):
  (24,8), (37.9,16), (37.9,32), (24,40), (10.1,32), (10.1,16)
Edges: ring topology (0→1, 1→2, 2→3, 3→4, 4→5, 5→0)
```

**elk-radial / radial / radial-tree:**
```
Center: (24,24)
Ring 1 (r=12): 3 nodes at 120° intervals
Ring 2 (r=20): 6 nodes at 60° intervals
Edges: center→ring1, ring1→ring2 children
```

### 12.5 Linear

**stack-horizontal:**
```
Nodes: (8,24), (20,24), (32,24), (44,24) — or 3 nodes evenly spaced
Edges: 0→1, 1→2, 2→3 (chain)
```

**stack-vertical:**
```
Nodes: (24,8), (24,20), (24,32), (24,44)
Edges: 0→1, 1→2, 2→3 (chain)
```

### 12.6 Grid

**grid / partition:**
```
Nodes: (12,12), (24,12), (36,12), (12,28), (24,28), (36,28)
Edges: none (grid has no inherent edges) — or thin grid lines as backdrop
```

### 12.7 Smart / AI

**smart:**
```
Gear-shaped path at center (16×16), 3 small nodes orbiting at (8,8), (40,12), (36,40)
Thin dashed edges from gear to nodes
```

**ai-driven:**
```
Sparkle/brain icon at center, 3 small nodes at (10,10), (38,14), (32,38)
Thin dashed edges from center to nodes
```

### 12.8 Custom

**group-by-namespace:**
```
Two rounded-rect groups (8,4,18,20) and (26,4,18,20) with 2 nodes each inside
A few cross-group edges
Group labels: not rendered (too small) — implied by rect boundaries
```

---

## 13. Edge Cases

1. **Empty algorithms array** — Show empty panel with "No algorithms available" message.
2. **Invalid value** — `setValue("nonexistent")` logs warning, selection unchanged.
3. **Single algorithm** — Still renders as dropdown (consistent UX).
4. **Custom algorithm with no thumbnail** — Falls back to a generic "nodes" placeholder thumbnail.
5. **Duplicate IDs** — Custom algorithm with same ID as built-in overwrites the built-in.
6. **Destroy while open** — Close panel, remove listeners, remove DOM.

---

## 14. Testing Strategy

### 14.1 Unit Tests

- Factory creates component with default options
- `getValue()` returns initial value
- `setValue()` updates selection and trigger label
- `setAlgorithms()` rebuilds list with correct items
- `registerAlgorithm()` adds custom algorithm to registry
- Clicking item fires `onChange` with correct `LayoutAlgorithm`
- Escape closes panel
- Arrow keys navigate items
- `groupByCategory: true` renders category headers
- `ribbonMode: true` uses compact trigger
- Empty algorithms shows "No algorithms available"
- Invalid `setValue()` logs warning, no change
- `destroy()` cleans up all listeners and DOM

### 14.2 Visual Tests

- Thumbnails render correctly for all 25 built-in algorithms
- Dark mode renders correctly (no hardcoded colors)
- Category accent colors visible on thumbnails
- Selected state shows blue left border
- Hover state highlights item

---

## 15. Dependencies

- Bootstrap Icons (for chevron caret)
- `../../src/scss/variables` (SCSS variables)
- No external layout library dependencies (thumbnails are hardcoded SVG, not computed)

---

## 16. Future Considerations

- **Animated thumbnails:** On hover, briefly animate nodes moving from random positions to the layout's final positions (deferred — adds complexity).
- **Layout preview on canvas:** Before committing, show a ghost preview of the layout on the actual diagram (app-level feature, not component-level).
- **Search/filter:** For apps with many algorithms, add a search input at top of panel (deferred until needed).
- **Algorithm recommendations:** Show a "Recommended" badge based on diagram type analysis (app-level feature using `smart` algorithm metadata).
