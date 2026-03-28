# Component Requirement: Graph Legend

**Date:** 2026-03-23
**Status:** Required for Ontology Visualizer (Phase 6)
**Priority:** P2 (lower than minimap — graph is usable without legend)
**Requested By:** Engineering (Ontology Visualizer implementation)
**CDN Slug:** `graphlegend`

---

## 1. Purpose

A collapsible legend panel that shows the color/icon/shape key for all visible node types and edge types in the graph canvas. Helps users understand what the colors and shapes mean without hovering over each node.

## 2. Design References

- **Neo4j Browser** — Side panel showing node labels with color chips
- **Datadog Service Map** — Floating legend with color-coded status indicators
- **Google Maps** — Collapsible legend box in the corner

## 3. Integration Point

The legend reads the current visible node types and edge types from the `GraphCanvas` instance (or is provided a static list). It uses `TypeBadge` internally for consistent type display.

## 4. Configuration Options

```typescript
interface GraphLegendOptions
{
    // Required
    container: HTMLElement;

    // Data
    nodeTypes: LegendNodeType[];
    edgeTypes?: LegendEdgeType[];

    // Optional
    title?: string;           // Default: 'Legend'
    collapsed?: boolean;      // Default: false
    showEdgeTypes?: boolean;  // Default: true
    showCounts?: boolean;     // Default: false (show count of each type in graph)
    position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'; // Default: 'bottom-left'
    maxHeight?: number;       // Default: 300 (scrollable if exceeded)
}

interface LegendNodeType
{
    typeKey: string;         // e.g., 'strategy.okr'
    displayName: string;     // e.g., 'OKR'
    icon: string;            // Bootstrap icon name
    color: string;           // Hex color
    count?: number;          // Number of this type in the graph
    status?: 'active' | 'planned' | 'deprecated' | 'external';
}

interface LegendEdgeType
{
    relationshipKey: string; // e.g., 'owned_by'
    displayName: string;     // e.g., 'owned by'
    color?: string;          // Edge color (default: #94a3b8)
    style?: 'solid' | 'dashed' | 'dotted';
    count?: number;
}
```

## 5. Public API

```typescript
interface GraphLegend
{
    // Data
    setNodeTypes(types: LegendNodeType[]): void;
    setEdgeTypes(types: LegendEdgeType[]): void;
    updateCounts(nodeCounts: Record<string, number>, edgeCounts: Record<string, number>): void;

    // Visibility
    show(): void;
    hide(): void;
    toggle(): void;
    isVisible(): boolean;
    setCollapsed(collapsed: boolean): void;

    // Interaction
    onTypeClick?: (typeKey: string) => void;  // Optional: click to filter graph to this type
    onTypeHover?: (typeKey: string | null) => void; // Optional: hover to highlight

    // Lifecycle
    destroy(): void;
}
```

## 6. Behavior

1. **Renders a vertical list** of node types, each showing: TypeBadge (icon + color + name) + optional count badge.
2. **Edge types section** below node types, showing: line sample (solid/dashed/dotted with color) + display name + optional count.
3. **Collapsible** via a toggle button in the header. Header shows title + collapse chevron.
4. **Scrollable** if content exceeds maxHeight.
5. **Interactive** (optional): clicking a type in the legend can trigger a filter on the graph (only show that type). Hovering highlights all nodes of that type.
6. **Status indicators**: PLANNED types show with dashed border, DEPRECATED with reduced opacity, EXTERNAL with a small external-link icon.

## 7. Rendering

- HTML-based (not SVG) for easy styling and accessibility
- Uses TypeBadge CDN component for node type entries
- Edge type entries use a small inline SVG line sample (30px wide)
- Container: card-like styling with subtle border, rounded corners, shadow
- Responsive: wraps gracefully in narrow containers

## 8. Accessibility

- `role="complementary"` with `aria-label="Graph legend"`
- Legend items are focusable with `tabindex="0"` if clickable
- Color information supplemented with icon and text (not color-only)

## 9. Size

Estimated: ~250 lines JS + ~80 lines CSS. Small-medium component.
