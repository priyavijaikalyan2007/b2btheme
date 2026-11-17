<!-- AGENT: Gap analysis, 2026-11-14. Which of this repo's canvases can replace maxGraph and Cytoscape in the apps (Diagrams, Thinker, Strukture, the ontology visualizer), and what each lacks for notes and whiteboards. Findings only, no decision yet. -->

# One canvas for diagrams, Strukture, notes and whiteboards: what is missing

**Date**: 2026-11-14
**Status**: Analysis for the owner. Nothing here is decided. Tracked in #176 (pre-launch).
**Question**: GraphCanvas was built to replace maxGraph and Cytoscape. What does it still need to serve Diagrams, Strukture, note-taking and whiteboards?

---

## 1. The short answer

1. **GraphCanvas is not a wrapper.** It draws its own SVG and imports no graph library. Its only outside dependency is an optional `window.dagre` for one layout.
2. **The maxGraph wrapper was GraphCanvasMx.** It was added on 2026-03-04 (ADR-052) with the same API as GraphCanvas, and deleted on 2026-03-19 (commit 26bc3472). `MASTER_COMPONENT_INDEX.md` still lists it as 10.6, and DiagramEngine's header still links it.
3. **DiagramEngine is the superset.** It is also its own SVG renderer, with no maxGraph or Cytoscape. It already has editing, shapes, connectors, groups, layers, undo, read-only mode and a layout hook.
4. **GraphCanvas is a graph explorer, not an editor.** It has the layouts, filtering and highlighting that Strukture and the ontology visualizer need, and DiagramEngine lacks them.
5. **So the one canvas should be DiagramEngine.** GraphCanvas's graph features would move into it, or sit on top of it as a graph view.
6. **The largest gaps are not drawing features.** They are touch and pen input, collaboration hooks, scale, and accessibility. Neither canvas has them today.

---

## 2. What the apps ask of a canvas today

Measured in `~/Work/knobby/apps` on 2026-11-14.

| App | Engine today | What it uses |
|---|---|---|
| Diagrams | maxGraph 0.22.0 | Vertices and edges with styles. Nine custom shape classes on maxGraph's `Shape` (cloud services, database, queue, server), registered through `CellRenderer.registerShape`. Groups and ungroup. Grid and snap. Undo. Label editing. Zoom, fit and centre. Change events. Dagre and ELK layouts, run in the app (`LayoutService.ts`), which then sets positions. Live collaboration over SignalR: `BroadcastChange`, `UpdateCursor`, `UpdateSelection`, `UpdateViewport`. |
| Thinker | maxGraph 0.22.0 | The same `BaseGraphCanvas` as Diagrams, for brainstorming. Calls `setTooltips`, which maxGraph 0.23 moved. |
| Strukture | Cytoscape 3.26.0 | An org-unit hierarchy. A `breadthfirst` layout. Two edge kinds, hierarchy and relationship. Tap, double-tap and hover popovers. Selection kept in step with a tree sidebar. |
| Ontology visualizer | GraphCanvas | Schema and instance views, 12 `createGraphCanvas` calls. |

No app uses DiagramEngine yet.

The maxGraph surface the apps call is small. `setSelectionCells`, `insertVertex`, `getSelectionCells`, `getDefaultParent`, `getView`, `addListener` and `removeCells` make up most calls. The rest are styles, groups, grid, zoom, fit, geometry, `beginUpdate` and `endUpdate`, and label changes.

---

## 3. What each canvas has

| Capability | DiagramEngine | GraphCanvas |
|---|---|---|
| Read-only viewer | Yes: `editable: false`, plus separate switches for connecting, text, resizing and rotating | Partly: separate switches for drag, select and edge creation. There is no single read-only switch. |
| Shapes | 38+ shapes in 7 stencil packs (flowchart, UML, BPMN, ER, network). Custom shapes through the shape registry. | One node box, with an icon, label, sublabel, badge and status |
| Connectors | Straight, orthogonal, curved, manhattan, elbow and entity routing. Seven arrow kinds. Labels. Ports. | Straight and fanned Bézier edges. Labels with density control on hub nodes. |
| Freehand, text, images | Pen, brush, highlighter, paint inside shapes. Rich text. Images. Page frames. | No |
| Groups and layers | Nested groups with collapse. Layers with lock and opacity. | `group-by-namespace` layout only |
| Undo, save | Undo and redo. `toJSON` and `fromJSON`. Dirty tracking. | `exportJSON` only |
| Comments, links | Comments on objects. `diagram://` deep links. | No |
| Built-in layouts | `grid`, and a `force` that places every object on one circle. `registerLayout` adds more. | `force` (boxes kept apart), `hierarchical` in four directions, `radial`, `dagre`, `group-by-namespace` |
| Graph exploration | Shortest path and connected components | Type and depth filters. Path, neighbour and blast-radius highlights. Expand on request. Hover cards. |
| Typed graph data | Semantic and presentation split | Node and edge types, schema and instance modes, edge provenance and confidence |
| Embeds GraphCanvas | Yes, as an embed type | — |

---

## 4. What is missing

### 4.1 Gaps in both canvases

1. **Touch and pen input.** DiagramEngine listens for mouse events only: no pointer events, no touch, no pressure, no pointer capture. GraphCanvas uses pointer events but has no touch gestures. A whiteboard or a note on a tablet needs pinch zoom, two-finger pan, palm rejection and pen pressure. This is the largest gap for whiteboards.
2. **Collaboration hooks.** Diagrams sends live changes over SignalR today. DiagramEngine was designed for this but never wired up. It declares an `Operation` type (id, `userId`, timestamp, type, path, payload) and an `onChange(ops)` option, but nothing calls `onChange`. Its events carry whole objects, with no diff and no origin. Applying a remote change through the public API would add it to undo and emit it again, which loops. What is needed:
   - `onChange` called with real `Operation`s, carrying a small diff and the change's origin;
   - an "apply remote change" call that skips undo and does not re-emit;
   - a layer for other users' cursors and selections.
   There is no `connector:change` event either.
3. **Scale.** Both canvases draw one SVG element per object. Neither skips objects outside the viewport. DiagramEngine's `getVisibleObjects` filters by the visible and locked flags, not by the viewport. DiagramEngine's manifest states a 5,000-object ceiling and says plainly that nobody measured it. An org chart or an ontology can pass a few thousand nodes. We need a measured limit, and probably viewport culling and level-of-detail drawing.
4. **Accessibility.** DiagramEngine sets no `aria-` attribute and two `role`s. GraphCanvas sets three. Neither lets a keyboard user move from node to node along edges, or tells a screen reader what is selected. A canvas that replaces whole apps needs both.

### 4.2 Gaps in DiagramEngine for Strukture and the ontology visualizer

These are the GraphCanvas features DiagramEngine lacks:

1. **Layered and tree layouts.** DiagramEngine has only `force` and `grid`. Strukture needs a tree or layered layout, and Diagrams uses ELK layered and ELK tree today. GraphCanvas's `hierarchical`, `radial` and `group-by-namespace` could become `registerLayout` entries. ELK can plug in the same way, from the host.
2. **A real force layout.** DiagramEngine's `layoutForce` is not a simulation. It places every object at an equal angle on one circle, ignoring connectors and sizes. GraphCanvas has a working force layout, which keeps boxes apart since #172 (`separateOverlaps`).
3. **Filtering and highlighting.** Type and depth filters, plus path, neighbour and blast-radius highlights, exist only in GraphCanvas.
4. **Expand on request.** Strukture and the ontology load a graph a piece at a time. GraphCanvas has `expandable` nodes and `onExpandRequest`.
5. **Edge label density.** Hub nodes with many labelled edges stay readable only in GraphCanvas.
6. **A graph data model.** Typed nodes and edges, with provenance and confidence, would map onto DiagramEngine's semantic layer. That mapping does not exist yet.

### 4.3 Gaps in DiagramEngine for Diagrams and Thinker (the maxGraph replacement)

Most of what Diagrams calls already has a match. To confirm before any migration:

1. **Custom shapes as code: already there.** The apps draw nine cloud shapes by subclassing maxGraph's `Shape`. A DiagramEngine shape is a `render(ctx)` function with its own handles and ports, registered through `registerStencilPack`. So the nine shapes can be ported as they are.
2. **Batched changes.** maxGraph's `beginUpdate` and `endUpdate` group many changes into one undo step and one render. DiagramEngine has an undo merge window. It needs an explicit batch, for layouts and for remote changes.
3. **Tooltips: already there.** Thinker uses maxGraph tooltips. DiagramEngine has a shared hover card for objects and connectors (ADR-126).

### 4.4 Gaps for note-taking and whiteboards

1. Touch and pen input (see 4.1).
2. **Sticky notes as notes.** The UI-components stencil pack has a `stickynote` shape, but it is a wireframe drawing of one. A whiteboard needs an editable note with quick create, and connectors that follow it when it moves.
3. **Embedding other components: mostly there.** DiagramEngine's embed registry already holds GraphCanvas, MarkdownEditor and MarkdownRenderer. This repo has no checklist component to embed yet.
4. **Ink to shape**, turning a hand-drawn box into a rectangle. This is optional, and later.

---

## 5. A possible order of work

For discussion only:

1. **Measure first.** Load 1,000, 5,000 and 10,000 nodes in each canvas and record frame times for pan, zoom and drag. This decides whether culling comes first.
2. **Pointer events in DiagramEngine.** Moving from mouse events to pointer events unblocks touch, pen and whiteboards. It also matches GraphCanvas.
3. **Collaboration hooks.** Origin-tagged change events, an "apply remote change" call and a presence layer. Diagrams cannot leave maxGraph without these.
4. **GraphCanvas layouts and exploration into DiagramEngine.** Layouts through `registerLayout`. Filters, highlights and expand on request as a graph view. Then Strukture can leave Cytoscape.
5. **Accessibility.** Keyboard movement along edges, and announcements of selection.
6. **Decide GraphCanvas's future.** It could stay as the light, read-only graph view. Or it could become a thin preset over DiagramEngine with the same API. GraphCanvasMx once did that over maxGraph. The ontology visualizer's 12 calls are its only users.

Stale references to clean up whichever way this goes:
- `MASTER_COMPONENT_INDEX.md` 10.6 lists GraphCanvasMx;
- DiagramEngine's header links `[[GraphCanvasMx]]`.

---

## 6. What this analysis did not check

- Real performance. Section 5 step 1 is still to do.
- Whether DiagramEngine's canvas is unbounded, with no page frame, as a whiteboard needs.
- How Thinker uses maxGraph beyond `BaseGraphCanvas`.
- The apps' Dagre and ELK code in detail. They run in the app, so a canvas only has to accept the positions.
