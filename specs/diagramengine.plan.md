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
| 1 | Document Model + SVG Render + Basic Shapes + SelectTool + PanTool + Undo/Redo + Serialization + Grid | COMPLETE |
| 2 | Extended shapes (11) + DrawTool + TextTool + Groups + Clipboard + Flip + Align + Layers | COMPLETE |
| 3 | Connectors (4 routing algorithms) + 7 arrow markers + ConnectorTool + Labels | COMPLETE |
| 4 | PenTool + BrushTool + MeasureTool + Alignment + Spacing guides | COMPLETE |
| 5 | Flowchart (7) + UML (5) + BPMN/ER/Network (9) stencil packs | COMPLETE |
| 6 | Templates + Layouts + PNG/PDF export + Find/Replace + Format painter + Graph analysis + Comments | COMPLETE |
| 7 | Demo page (DiagramEngine + Shape Builder) | IN PROGRESS |
| 8 | Quality pass: move phase6 methods into engine class, remove casts, verify all interactions | NOT STARTED |
| 9 | Comprehensive Playwright tests: 100% functionality coverage from spec, investigate failures as test/spec/code bugs | NOT STARTED |
| 10 | Per-edge stroke rendering + Vitest unit test suite (183 tests across 4 files) | COMPLETE |
| 11 | Gradient fills/strokes, gradient text, image rendering, text editor fix, GradientPicker integration | COMPLETE |
| 12 | Port hover indicators, connector selectability, text along path, PNG export deprecated | COMPLETE |
| 13 | Highlighter tool, Pen close-shape, Paintable shapes, Paintbrush tool, Ultra Zoom (32x), brush hardness | COMPLETE |
| 14 | Embed infrastructure + Enterprise Theme Embed Pack (93 components) | COMPLETE |
| 15 | Device Frame Stencils (12 shapes) + Spatial Containment | COMPLETE |
| 16 | UI Component Stencils (93 shapes) + Additional Page Frames (icons, tablets, laptops) | COMPLETE |

## Checkpoint Notes

- Previous code deleted: 2026-03-15
- Rebuild starting from: Phase 1
- Per-edge stroke + unit tests: 2026-03-19 (renderPerEdgeStroke, applyEdgeStrokeColor, renderShapeContent integration)
- Unit test files: diagramengine.test.ts (per-edge+gradient), diagramengine-core.test.ts (66), diagramengine-features.test.ts (65), diagramengine-advanced.test.ts (44)
- Gradient/image/text: 2026-03-21 — shape render reorder (ADR-088), parseStopColor, gradient strokes, connector gradient strokes, gradient text via CSS background-clip, SVG image rendering with auth headers, text editor canvasToContainer fix, GradientPicker demo integration (ADR-089)
- Port indicators + connectors + textPath: 2026-03-22 — port hover circles during connect drag, connector selectability with hit-test + dashed outline, text along SVG path (WordArt), PNG export deprecated (ADR-090)
- Writing tools + painting: 2026-03-22 — HighlighterTool (6 preset colours), PenTool close-shape (Z + fill), PaintableStyle + paintable shape, PaintbrushTool (size/shape/colour/alpha/hardness), Ultra Zoom (MAX_ZOOM=32.0), getToolInstance API, tool cursor management
- Embed system: 2026-03-22 — EmbedDefinition + EmbeddableComponentEntry types, registerEmbeddableComponent(), foreignObject rendering, interaction mode toggle, state persistence, Enterprise Theme Embed Pack (93 components), Device Frame Stencils (12 shapes), Spatial Containment (drop-inside, move-with-parent)
- UI stencils + page frames: 2026-03-22 — 93 UI component placeholder shapes (7 visual variants), 11 icon sizes, 5 mobile, 5 tablet, 3 laptop page frame sizes

## Current Stats

- **Source modules**: 29 files in `components/diagramengine/src/`
- **Bundled output**: 25,000+ lines in `diagramengine.ts`
- **Shapes**: 38 core + 12 device + 93 ui-component = 143 total across 8 stencil packs
- **Tools**: 12 (select, draw, text, connect, pen, brush, highlighter, paintbrush, measure, pan, zoom)
- **Tests**: 238 DiagramEngine-specific tests + 2533 total project tests
- **Public API methods**: 100+
- **ADRs**: 088, 089, 090 (gradient rendering, text/image/connector features, painting tools)
