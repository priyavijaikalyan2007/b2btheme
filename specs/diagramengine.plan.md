# DiagramEngine Implementation Plan — REBUILD

**Status:** In Progress (Rebuild from scratch)
**Started:** 2026-03-15
**Spec:** `./specs/diagramengine.prd.md`
**Component:** `./components/diagramengine/`
**Quality Bar:** Production-grade, matching GraphCanvas/GraphCanvasMx quality

---

## Previous Attempt

The first implementation (6,686 lines) was rushed and produced a non-functional
prototype. It is being discarded entirely and rebuilt from scratch following
CODING_STYLE.md, COMMENTING.md, MARKERS.md, and using graphcanvas.ts as the
quality reference.

## Rebuild Principles

1. **Every feature complete before moving to the next phase** — no stubs
2. **Allman brace style** — opening brace on its own line, always
3. **Functions under 30 lines** — extract helpers aggressively
4. **JSDoc on all public API** — @param, @returns, what/why not how
5. **Test via demo** — each phase has a working demo section
6. **Production SVG rendering** — proper fills, strokes, transforms
7. **Every tool works end-to-end** — draw, select, move, resize, connect, etc.

## Phase Plan

| Phase | Description | Status |
|---|---|---|
| 1 | Document Model + SVG Render Engine + Basic Shapes (rect, ellipse, diamond, triangle, text) + SelectTool (click, multi-select, move, resize, rotate) + PanTool + ZoomTool + Undo/Redo + Serialization + Grid + Theme observer + Demo | NOT STARTED |
| 2 | Extended shapes (hexagon, star, cross, parallelogram, donut, arrow, chevron, callout, image, icon, path) + DrawTool + TextTool + Group/Ungroup + Copy/Paste/Cut/Duplicate + Flip + Alignment/Distribution + Layers + Demo | NOT STARTED |
| 3 | Connectors with real routing (straight, orthogonal, manhattan) + Arrow markers (7 types + ER) + Connector labels + Freestanding lines + ConnectorTool + Waypoints + Re-render on object move + Demo | NOT STARTED |
| 4 | PenTool + BrushTool + MeasureTool + Real alignment guides + Spacing guides + Size guides + Grid snap + Object snap + Ruler integration + Demo | NOT STARTED |
| 5 | Flowchart stencil pack (23 shapes) + UML stencil pack (14 shapes) + BPMN stencil pack (20 shapes) + ER stencil pack (9 shapes) + Network stencil pack (11 shapes) + Demo | NOT STARTED |
| 6 | Template engine ({{variable}}) + Data binding + Title blocks + Control points (scalar + point) + Sketch render style + Per-edge stroke + Demo | NOT STARTED |
| 7 | Layout engine (force, grid, hierarchical via maxGraph/ELK/Dagre, custom, async/AI) + Animated transitions + PNG/SVG/JSON/PDF export + Find/Replace + Format painter + Demo | NOT STARTED |
| 8 | Collaboration model (operations, presence, comments) + Deep linking + Graph analysis (shortest path, components) + Collapse/expand groups + Lock/unlock + Spatial queries + Boolean path ops + Demo | NOT STARTED |
| 9 | Full demo page (all tools, all shapes, all stencils, connectors, templates, export) + Shape Builder demo + README + Final quality pass | NOT STARTED |

## Checkpoint Notes

- Previous code deleted: 2026-03-15
- Rebuild starting from: Phase 1
