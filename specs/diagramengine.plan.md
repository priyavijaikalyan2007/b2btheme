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
| 9 | Comprehensive Playwright tests: 100% functionality coverage from spec, investigate failures as test/spec/code bugs | TESTS EXIST AND NOW RUN (2026-08-10) — see checkpoint; coverage vs. spec not yet audited |
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
- **e2e harness repaired: 2026-08-10** — all 67 tests in `tests/diagramengine.spec.ts` had been failing
  on `createDiagramEngine not found on window`. Cause was one URL: the spec navigated to
  `/docs/demo.html`, the component **gallery index**, which links to every component page and loads
  none of them. The bundle's `window.createDiagramEngine` assignment was correct throughout, so the
  suite asserted nothing while appearing to be full PRD cover. Repointed at
  `/demo/components/diagramengine.html` with a readiness wait on the global. **All 67 pass with no
  engine changes** — there were no hidden engine bugs. Verified the suite is not vacuous by mutating
  the built default-shape path (`shape: n.shape ?? "rectangle"` → `"ellipse"`), which fails
  `addObject fills defaults` with the expected diff; bundle restored byte-identical. Note: a first
  mutation attempt hit two unrelated `shape:"rectangle"` literals and nothing failed, which is
  indistinguishable from a toothless suite until you find the line the assertion depends on.
  Outstanding for Phase 9: audit what the 67 tests actually cover against the PRD, since nothing has
  been forcing that coverage to be real.
- UI stencils + page frames: 2026-03-22 — 93 UI component placeholder shapes (7 visual variants), 11 icon sizes, 5 mobile, 5 tablet, 3 laptop page frame sizes

## Current Stats

- **Source modules**: 29 files in `components/diagramengine/src/`
- **Bundled output**: 25,000+ lines in `diagramengine.ts`
- **Shapes**: 38 core + 12 device + 119 ui-component + 15 Bootstrap = 184 total across 9 stencil packs
- **Tools**: 12 (select, draw, text, connect, pen, brush, highlighter, paintbrush, measure, pan, zoom)
- **Tests**: 240 DiagramEngine-specific unit tests + 67 Playwright e2e (running since 2026-08-10) + 4773 total project unit tests across 140 files
- **Public API methods**: 100+
- **Embed registry**: 104 embeddable components
- **ADRs**: 088, 089, 090 (gradient rendering, text/image/connector features, painting tools)
