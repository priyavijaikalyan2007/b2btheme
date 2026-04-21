# Feature Request: GraphCanvas Hover Card Styling + Customization API

**Date**: 2026-04-20
**Component**: CDN GraphCanvas (also affects Cytoscape-based Strukture graph)
**Severity**: UX improvement
**Reporter**: Ontology Visualizer team

## Problem

Hovering over a node or edge in GraphCanvas (ontology visualizer) and hovering over an org-unit node in the Strukture graph both produce a **very basic tooltip** — plain text, browser-native styling, no brand look, no hierarchy of information. This is the primary way users get information about a graph element without committing to clicking it; it deserves to feel like a proper Bootstrap card (title, subtitle, icon, footer), not a browser's default `title=` tooltip.

Screenshots from production testing showed hover boxes with:
- No icon or color swatch for the node type.
- No hierarchy — single-line text blob.
- No secondary/metadata section (status, type key, properties count, etc.).
- No description / tooltip text.
- Inconsistent with the rest of the Knobby UI where information cards follow the `.card` Bootstrap pattern.

## Current GraphCanvasOptions API

`typescript/shared/types/component-library.d.ts` → `GraphCanvasOptions` has **no** hover-related hooks:

```typescript
interface GraphCanvasOptions {
    container: HTMLElement;
    // ... layout, selection, click, double-click, edge-creation callbacks ...
    onNodeClick?: (node: GraphCanvasNode) => void;
    onNodeDoubleClick?: (node: GraphCanvasNode) => void;
    onEdgeClick?: (edge: GraphCanvasEdge) => void;
    // NO onNodeHover, NO onEdgeHover, NO renderNodeTooltip
}
```

So hosts can't override the tooltip content or styling even if they wanted to.

## Requested API

Option A — **Built-in card with sensible defaults (preferred)**

Internally render hover content as a Bootstrap-styled card. Fields come from existing `GraphCanvasNode` / `GraphCanvasEdge` properties already available:

- **Title** — `node.label` (or `edge.label`)
- **Icon** — colored dot using `node.color` + optional `node.icon` (bi-* class)
- **Subtitle** — `node.sublabel` or `node.type` (type key in dimmer text)
- **Badge** — `node.status` rendered as `.badge bg-success|bg-warning|bg-secondary|bg-info`
- **Properties preview** — first 3-5 entries of `node.properties` as key/value rows
- **Description** — new optional `node.tooltip` or `node.description` field

Use the existing `.card` Bootstrap class tree so the tooltip automatically adapts to `data-bs-theme="dark"` and matches the Property Inspector styling.

Option B — **Render-override hook**

```typescript
interface GraphCanvasOptions {
    // ...
    /** Returns an HTMLElement to be shown as the hover card. If omitted,
     *  the component's default tooltip is used. */
    renderNodeTooltip?: (node: GraphCanvasNode) => HTMLElement | string | null;
    renderEdgeTooltip?: (edge: GraphCanvasEdge) => HTMLElement | string | null;

    /** Fires when hover starts/ends so hosts can drive their own tooltips. */
    onNodeHover?: (node: GraphCanvasNode | null) => void;
    onEdgeHover?: (edge: GraphCanvasEdge | null) => void;

    /** Disable built-in tooltip entirely (host provides via onNodeHover). */
    tooltipMode?: 'builtin' | 'off';
}
```

Option B is the more flexible answer and lets hosts implement Option A themselves. Option A is the "right default" — most hosts want the same thing, so bake it in.

**Recommended: ship both.** Default to Option A's nicer card; hosts that need full control use the render-override.

## Expected Behavior

- Hovering a node pops a card over the graph canvas showing title + icon + type + up to 5 properties, styled like the Property Inspector.
- Hovering an edge pops a similar card showing relationship display name, source/target labels, any edge properties (confidence, provenance).
- Hover cards respect `data-bs-theme` — dark-mode tooltips use `bg-body-tertiary` / `color-body-emphasis` variables.
- Hovering an empty canvas area closes any open hover card.
- Keyboard focus on a node also surfaces the card (accessibility parity).

## Current Workaround (not great)

None satisfactory. The host could wrap the canvas in its own mouseover/mousemove listeners and overlay a custom card, but the CDN doesn't expose which node/edge the cursor is currently over (no hover callback), so we can't map position → node. Attempting this would require duplicating the CDN's hit-testing logic.

## References

- The existing PropertyInspector CDN component already renders node details as a card — hover tooltip should reuse the same visual treatment for consistency.
- Mermaid, draw.io, yEd all ship graph hover-cards with icon + metadata as the default behavior.
- Strukture graph (Cytoscape-based, separate component) has the same issue — see `typescript/apps/strukture/strukture-graph.ts`. If Cytoscape provides a tooltip plugin we can adopt, document it here.

## Priority

Medium. Hover is a primary exploration affordance in enterprise data visualizers; polished hover cards materially change how "complete" the product feels in demos.
