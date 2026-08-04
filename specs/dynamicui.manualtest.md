<!-- AGENT: Manual browser test plan for the Dynamic UI layer. Ordered so failures are diagnosable; each check names what it proves and where to look when it fails. -->

# Dynamic UI — Manual Test Plan

**Why this exists:** the layer has 4710 automated tests and has never run in a browser. jsdom does not lay out, does not paint, does not honour CSS, and does not run the real script load order. Everything below is a thing the automated suite structurally cannot tell you.

**Time:** ~25 minutes for the full pass. §1–§4 is the smoke test (~8 minutes) and is worth running first on its own.

---

## Setup

```bash
cd ~/work/pvk2007/theme
npm run build          # must exit 0
./run.sh 8000          # python3 -m http.server
```

Open **http://localhost:8000/demo/dynamic-ui.html** with the browser console visible. Keep it open throughout — several checks below are console checks, and a silent console is itself a result.

> Record failures with the section number. The layout is ordered so that an early failure explains later ones: don't chase a binding bug in §5 if §2 already failed.

---

## 1. The page loads at all

| # | Do | Expect |
|---|---|---|
| 1.1 | Load the page | No red errors in console |
| 1.2 | Console: type `EnterpriseRuntime` | An object with ~30 functions |
| 1.3 | Console: type `createDynamicCanvas` | A function |
| 1.4 | Look at the canvas area | A light grid background, empty, roughly 600px tall |
| 1.5 | Console | A line reading `[DynamicUIDemo] ready` |

**Proves:** script load order works — `runtime.js` before `dynamiccanvas.js` — and the IIFE wrapper did not swallow the global.

**If it fails:** a 404 on `dist/runtime/runtime.js` means the build did not emit it (check `tsconfig.runtime.build.json` ran). `EnterpriseRuntime is not defined` with no 404 means the IIFE wrapper hid it — check `scripts/wrap-iife.sh` covers `dist/runtime`.

---

## 2. First prompt — components actually mount and render

Click **"show me the tables in the sales database"**.

| # | Expect |
|---|---|
| 2.1 | Two framed panels appear side by side, each with a title bar |
| 2.2 | Left panel titled **Schema**, containing a **visible list of four table names** — orders, customers, products, regions |
| 2.3 | Right panel titled **Columns**, an empty grid with headers Column / Type / Nullable |
| 2.4 | Each title bar shows three small controls at the right: **?**, a pin, and **×** |
| 2.5 | The document panel shows two nodes and one binding |
| 2.6 | The patch-log panel shows one line, `r1  addNode, addNode, addBinding` |

> **2.2 is the single most important check on this page.** A TreeView that renders an empty box is exactly the bug the `renders-content` check was added for — it constructs cleanly and shows nothing. If the panel is empty but present, the container option is wrong again.

**If 2.2 fails:** check `components/treeview/treeview.manifest.ts` declares `containerOption: "containerId"` and `containerAs: "id"`, and that `dist/capability-manifest.json` carries the same (re-run `npm run build` if not). The demo fetches that artefact rather than keeping its own copy, so there is only one place this can be wrong.

**If nothing appears at all:** read the console. A literate error naming a missing component means the manifest was not registered; a mount error renders *inside* the frame rather than throwing.

---

## 3. The binding — the thing that makes this a canvas

Click **orders** in the Schema panel.

| # | Expect |
|---|---|
| 3.1 | The Columns grid **repaints** with four rows: order_id, customer_id, placed_at, total_cents |
| 3.2 | Click **customers** — the grid changes to three rows (customer_id, email, created_at) |
| 3.3 | Click **regions** — two rows |
| 3.4 | No console errors during any of it |

**Proves:** the whole spine end to end — TreeView emits on a channel, the wiring engine propagates, a named transform reshapes the payload, DataGrid receives it. This is the one interaction that distinguishes a dynamic canvas from a dashboard.

**If the grid never changes:** check the console for `Binding ... names transform "tableColumns", which is not registered`. If silent, the tree's `selection` channel is not firing — verify `onSelectionChange` still exists on TreeView and that `emitChannel` routes it.

**If the grid clears but shows nothing:** the transform is returning `[]` — the selected node's `id` does not match a key in the demo's `COLUMNS` map.

---

## 4. Node chrome

| # | Do | Expect |
|---|---|---|
| 4.1 | Click **?** on the Columns panel | The right-hand *Resolver* panel fills with a ranked candidate list and per-factor scores |
| 4.2 | Read that list | Each line shows a component, a score, and reasons like `intentAffinity 1.00, cardinalityFit 0.60` |
| 4.3 | Click the **pin** on Schema | The panel gains a visible accent stripe on its left edge |
| 4.4 | Click **×** on Columns | The panel disappears; the document panel drops to one node and **zero bindings** |

**Proves:** resolution explains itself, and `removeNode` cleans up dangling bindings rather than leaving the document invalid.

**If 4.4 leaves a binding behind:** that is a document-integrity bug — `removeNode` in `runtime/src/document.ts` is meant to drop bindings referencing the removed node.

---

## 5. Drag — intent becomes commitment

Reload the page and run the first prompt again.

| # | Do | Expect |
|---|---|---|
| 5.1 | Drag the **Schema** panel by its title bar to the lower right | It follows the pointer smoothly |
| 5.2 | Release | It stays where you dropped it |
| 5.3 | Look at the document panel | Schema's `placement.kind` has changed from `"intent"` to `"fixed"` with x/y/w/h |
| 5.4 | Look at the patch log | A new revision appeared with `updateNode` |
| 5.5 | Run the "leave a note" prompt | The new note is placed **without overlapping** the panel you moved |

**Proves:** the packer treats a user-placed node as an obstacle and never overrides a position the user chose, and that a gesture becomes part of the document rather than ephemeral DOM state.

**If 5.5 overlaps:** the packer is not seeing the fixed node as an obstacle — check `avoid()` in `runtime/src/packer.ts`.

---

## 6. Sticky note and annotation

| # | Do | Expect |
|---|---|---|
| 6.1 | Click **"leave a note on the orders table"** | A yellow note appears with a folded corner, grip bar, and readable text |
| 6.2 | Click into the note and type | Text edits; no console errors |
| 6.3 | Click **"call out the orders table"** | An amber callout with a box, a tail, and the label "Largest table" |
| 6.4 | Try to click *through* the callout onto whatever is beneath | The click reaches the element underneath |

**Proves:** the two components written against the public contract render correctly with real CSS, and `pointer-events: none` on annotations works.

**If 6.4 fails:** the annotation is swallowing clicks — check `.annotation { pointer-events: none }` survived the CSS build.

---

## 7. Zoom, pan, and CSS under stress

| # | Do | Expect |
|---|---|---|
| 7.1 | Console: `document.querySelector('#dui-canvas').__proto__` — or just resize the window narrower | Panels stay inside the canvas; the page itself never scrolls sideways |
| 7.2 | Add several notes (run the note prompt 5–6 times) | They tile without overlapping |
| 7.3 | Switch the theme with the toggle in the header | Canvas, frames, notes and chat all follow; no white-on-white or black-on-black |
| 7.4 | Read a sticky note in dark mode | Text is still legible against the yellow |

**Proves:** the dark-mode work holds for the new components, and sticky notes' deliberately-literal colours still meet contrast.

---

## 8. Chat dock behaviour

| # | Do | Expect |
|---|---|---|
| 8.1 | Type an unrecognised phrase and press Enter | The Resolver panel says no canned session matches; nothing breaks |
| 8.2 | Press Enter on an empty input | Nothing happens |
| 8.3 | Click **Clear** | All panels disappear; document shows zero nodes |

---

## 9. Console hygiene (do this last)

| # | Expect |
|---|---|
| 9.1 | Scroll the whole console. **Zero** uncaught errors |
| 9.2 | Warnings, if any, are the library's own structured `[WARN]` lines with a clear reason |
| 9.3 | No `Cannot read properties of undefined` anywhere |
| 9.4 | No React/Vue/framework errors (there should be no framework at all) |

---

## What I am least confident about

Stated plainly so you know where to look hardest:

1. **§2.2 and §3 — the TreeView container option.** I found and fixed this bug twice in one sitting: once in the manifest, once in DynamicCanvas's own mount path, which did not honour `containerAs` at all. The demo now fetches the built manifest instead of inlining copies, so there is one source of truth — but this is the area with the worst track record on this page.
2. **§5 — drag.** Pointer capture and the zoom-adjusted coordinate maths have never run against a real pointer. jsdom does not do pointer events meaningfully.
3. **§7.3 — dark mode on the five new components.** Never seen rendered. The SCSS compiles; that is all I know.
4. **§7.2 — the packer under real widths.** It assumes a 1120px main region; a narrower window may pack oddly.
5. **Anything involving actual layout.** jsdom reports every element as 0×0, so `visibleNodes()` — which decides what stays mounted — has never computed a meaningful answer.

---

## After the pass

- Anything broken: file it against the section number; I can usually name the owning module from the symptom.
- Nothing broken: the next real work is promoting components from `display` to `surface`, which is a per-component judgement about what its `stateKeys` genuinely are. The gate lists the remaining ones on every `npm test` run.
- Either way, worth adding a Playwright spec for §2.2 and §3 specifically — those are the two checks that would hurt most to regress silently, and this repo already runs Playwright as its tier-2 suite.
