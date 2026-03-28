# Component Requirement: Graph Minimap

**Date:** 2026-03-23
**Status:** Required for Ontology Visualizer (Phase 6)
**Priority:** P1
**Requested By:** Engineering (Ontology Visualizer implementation)
**CDN Slug:** `graphminimap`

---

## 1. Purpose

A small, always-visible overview widget that shows a miniaturized view of the entire graph canvas and a viewport rectangle indicating the currently visible region. Users can click/drag the viewport rectangle to pan the main canvas. This is a standard UX pattern in graph editors (Neo4j Browser, draw.io, Figma).

## 2. Design References

- **Neo4j Browser** — Bottom-right minimap with blue viewport rectangle
- **draw.io** — Collapsible minimap panel with gray viewport rectangle
- **Figma** — Minimap with highlighted visible area

## 3. Integration Point

The minimap synchronizes with a `GraphCanvas` instance. It reads the graph's node positions and viewport bounds, and writes pan/zoom commands back to the canvas.

## 4. Configuration Options

```typescript
interface GraphMinimapOptions
{
    // Required
    container: HTMLElement;
    graphCanvas: GraphCanvasHandle;  // The GraphCanvas instance to synchronize with

    // Optional
    width?: number;          // Default: 200
    height?: number;         // Default: 150
    backgroundColor?: string; // Default: '#f8f9fa'
    viewportColor?: string;  // Default: 'rgba(59, 130, 246, 0.3)' (semi-transparent blue)
    viewportBorderColor?: string; // Default: '#3b82f6'
    nodeColor?: string;      // Default: '#94a3b8' (simplified node dots)
    edgeColor?: string;      // Default: '#cbd5e1' (simplified edge lines)
    showEdges?: boolean;     // Default: true (false for very dense graphs)
    collapsed?: boolean;     // Default: false
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'; // Default: 'bottom-right'
}
```

## 5. Public API

```typescript
interface GraphMinimap
{
    // Synchronization
    refresh(): void;         // Re-read positions from GraphCanvas and redraw

    // Visibility
    show(): void;
    hide(): void;
    toggle(): void;
    isVisible(): boolean;

    // Lifecycle
    destroy(): void;
}
```

## 6. Behavior

1. **Renders a simplified view** of all graph nodes as small dots (colored by node.color or a default) and edges as thin lines.
2. **Viewport rectangle** shows the currently visible region of the main canvas. Semi-transparent fill with a solid border.
3. **Click on minimap** → pan the main canvas to center on the clicked position.
4. **Drag viewport rectangle** → pan the main canvas in real-time.
5. **Auto-refresh** when the GraphCanvas fires `onLayoutComplete` or when `refresh()` is called.
6. **Collapse/expand** toggle button in the corner (saves space when not needed).
7. **Performance**: For graphs with >500 nodes, skip edge rendering (`showEdges: false` auto-applied) and use simplified node rendering (circles only, no labels).

## 7. Rendering

- SVG-based rendering for crisp scaling
- Nodes rendered as small filled circles (3-5px radius depending on minimap size)
- Edges rendered as 1px lines
- Viewport rectangle rendered as a rect with semi-transparent fill and 2px solid border
- No text labels (too small to read)
- Container has subtle border and rounded corners (matches platform card styling)

## 8. Accessibility

- `role="img"` with `aria-label="Graph minimap showing overview of the graph"`
- Keyboard: no keyboard interaction required (minimap is a visual aid, not primary navigation)

## 9. Size

Estimated: ~200 lines JS + ~50 lines CSS. Small component.
