# DiagramEngine Implementation Plan

**Status:** In Progress
**Started:** 2026-03-15
**Spec:** `./specs/diagramengine.prd.md`
**Component:** `./components/diagramengine/`

---

## Phase Overview

| Phase | Description | Status | Files |
|---|---|---|---|
| 1 | Foundation — Document Model + Basic Rendering | COMPLETE | diagramengine.ts, diagramengine.scss |
| 2 | Extended Shapes, Groups, Clipboard, Alignment | COMPLETE | |
| 3 | Connectors, Arrow Markers, Routing | COMPLETE | |
| 4 | Alignment Guides, Snap Engine | COMPLETE | |
| 5 | Template Engine, Draw/Text/Connector Tools | COMPLETE | |
| 6 | Layout Engine, PNG Export | COMPLETE | |
| 7 | Rotation Handle, Inline Text Editing | COMPLETE | |
| 8 | Pen/Measure/Brush Tools, Find/Replace, Format Painter | COMPLETE | |
| 9 | Flowchart + UML Stencil Packs | COMPLETE | |
| 10 | Demo Page (DiagramEngine + Shape Builder) | COMPLETE | |

---

## Phase 1: Foundation — COMPLETE

### Implemented (2026-03-15)
- [x] All type interfaces: DiagramObject, DiagramConnector, TextContent, TextRun, IconRun, TextBlock, Layer, DiagramDocument, Comment, CommentEntry, Operation, ViewportState, ShapeDefinition, ConnectionPort, etc.
- [x] EventBus (on/off/emit with error isolation)
- [x] UndoStack (command pattern with merge window, 200-entry max, trimming)
- [x] ShapeRegistry with 5 basic shapes: rectangle, ellipse, diamond, triangle, text
- [x] Each shape: render(), getHandles(), getPorts(), hitTest(), getTextRegions(), getOutlinePath()
- [x] RenderEngine: SVG DOM structure (defs, viewport, grid, layers, connectors, overlay, tool-overlay)
- [x] Viewport: pan, zoom (wheel with focal point, +/- keys, zoom-to-fit), screen↔canvas coordinate conversion
- [x] Object rendering: SVG groups with transforms (translate, rotate, flip), shadow filters in defs, text via foreignObject
- [x] Grid rendering (dot grid via SVG pattern)
- [x] Selection overlay: dashed outline + 8 resize handles
- [x] Rubber band selection visual
- [x] SelectTool: click select, Shift/Ctrl multi-select, move, resize (8 handles), rubber band, arrow nudge, delete, select all
- [x] PanTool: drag to pan, middle-mouse auto-activate
- [x] Keyboard: Ctrl+Z/Y undo/redo, +/- zoom, 0 zoom-to-fit, Delete, Ctrl+A, arrows
- [x] Public API: addObject, removeObject, updateObject, getObject, getObjects, select, clearSelection, zoomIn/Out/ToFit, bringToFront, sendToBack, undo/redo, setActiveTool, toJSON/fromJSON, isDirty/markClean, exportSVG/JSON, on/off events, resize, destroy
- [x] createDiagramEngine() factory with container string/element resolution
- [x] Window global exports
- [x] Theme observer (MutationObserver on data-bs-theme, re-renders all)
- [x] SCSS: container, canvas, objects, handles, overlay, grid, connectors, reduced motion
- [x] TypeScript compiles clean, build succeeds

### Line count: ~2,200 lines TypeScript + ~110 lines SCSS

### Checkpoint Notes
- Last completed step: Phase 1 complete, builds clean
- Architecture: Single-file IIFE pattern consistent with other components
- Decisions: Used foreignObject for text (enables rich text in Phase 2), SVG filter pipeline for shadows (stable IDs in defs), split overlays (selection vs tool) for clean z-ordering

---

## Phase 2: Rich Text, Shadows, Shapes (NEXT)

### TODO
- [ ] Rich text inline editing (contenteditable in foreignObject)
- [ ] TextBlock rendering (paragraphs, lists, headings)
- [ ] Shadow pipeline — full ShadowStyle rendering with filter updates
- [ ] Extended basic shapes: hexagon, star, cross, arc, pie-slice, donut (compound path)
- [ ] Control points (parametric yellow diamond handles)
- [ ] Shape parameters in render context
- [ ] Rotation handle visual + interaction
- [ ] Flip operations
- [ ] Layers: visibility, lock, opacity, ordering
- [ ] Group/ungroup operations
- [ ] Copy/paste/cut/duplicate
- [ ] Image shape type
- [ ] Icon shape type

---

## Phase 3: Connectors, Routing, Line Styling

### TODO
- [ ] ConnectorTool — draw connectors between ports
- [ ] Connector rendering (straight, orthogonal, curved)
- [ ] Waypoints (user-draggable)
- [ ] Arrow markers in defs (block, classic, open, diamond, etc.)
- [ ] Connector labels (start, middle, end)
- [ ] Freestanding lines
- [ ] Connector shadows
- [ ] Line dash patterns
- [ ] ER notation arrows

---

## Phase 4: Visual Guides, Snapping, Measurement

### TODO
- [ ] Alignment guides (edge/center snap lines)
- [ ] Spacing guides (equal-gap detection)
- [ ] Size guides (dimension matching)
- [ ] Grid snap
- [ ] Object snap
- [ ] Ruler guide integration
- [ ] MeasureTool
- [ ] Smart measurement display during drag

---

## Phase 5: Templates, Data Binding, Extended Stencils

### TODO
- [ ] Template engine ({{variable}} resolution)
- [ ] Title block support
- [ ] Data context
- [ ] DrawTool (click-to-place, drag-to-size)
- [ ] PenTool (vector path creation)
- [ ] BrushTool (freehand)
- [ ] TextTool (create text objects)
- [ ] ConnectorTool (draw connectors)
- [ ] Flowchart stencil pack
- [ ] UML stencil pack
- [ ] Arrow stencil pack
- [ ] Callout stencil pack

---

## Phase 6: Layout, Export, Polish, Demo Page

### TODO
- [ ] Layout engine adapters (force, hierarchical, radial, grid)
- [ ] Custom layout registration
- [ ] PNG export (canvas + blob)
- [ ] ASCII art export
- [ ] PDF export
- [ ] Find and replace
- [ ] Format painter
- [ ] Animated layout transitions
- [ ] Performance: viewport culling
- [ ] Minimap
- [ ] Spatial queries
- [ ] Keyboard shortcut system (full)
- [ ] Demo page: full DiagramEngine demo
- [ ] Demo page: Shape Builder demo
- [ ] README.md
