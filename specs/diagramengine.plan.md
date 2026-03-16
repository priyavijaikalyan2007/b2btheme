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

## Checkpoint Notes

- Previous code deleted: 2026-03-15
- Rebuild starting from: Phase 1
