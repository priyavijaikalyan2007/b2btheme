# Agent UI readiness, step 5: the 24 components without a manifest

> **Date:** 2026-11-01
> **Epic:** #16. Steps 1–4 are on main. #85 adds PropertyInspector: 96 in catalog v1, 5 pending (#64).
> **Source:** `specs/agentui-readiness.prd.md` §4, step 5: "manifests for those an agent would sensibly render; the page-level ones are recorded as out of scope, with reasons."
> **Status:** decisions D1–D3 made by the user on 2026-11-01; ready for a plan.

## 1. Goal

Every component directory either has a manifest or a recorded reason for having none.

- Components an agent would sensibly render get a manifest and join catalog v1, with the same tests as steps 2–4.
- The rest are listed in one place, each with its reason.

## 2. Constraints

- **Nothing breaks for current users.** Component changes are additive options or methods, or labelled bug fixes. Over A2UI, a page-level default is replaced by `protocol.fixed`, as in ADR-235 and ADR-239.
- **Nothing an agent shouldn't see reaches one.** That covers credentials and the host page's DOM.
- **Run the full test suites** for every component change.
- **No subagents.**

## 3. Triage

### 3.1 Join (10)

| Component | What it is | How it joins |
|---|---|---|
| typebadge | An inline chip for an ontology type | `display`. Click is an event only if it expresses intent (B4 rule). |
| statusbar | Label/value regions with dividers, fixed to the bottom of the viewport | `protocol.fixed: { contained: true }`, so it stays inside its surface. Regions are data. |
| toolbar | A labelled action bar that can dock or float | `protocol.fixed` sets contained and docked. A tool click is an event (`toolClick`), as Ribbon's `controlClick` is (ADR-235). |
| graphtoolbar | A preset Toolbar for graph editors | The same rules as Toolbar, with the preset's regions. GraphCanvas already has its own controls, so this joins only if Toolbar does. |
| confirmdialog, errordialog, formdialog, progressmodal, sharedialog | Modal dialogs. Today each appends a Bootstrap modal to `document.body` (ErrorDialog to a given container) and blocks the page | D1 (user): an additive `contained` option, default `false`, which is today's behaviour. When it is `true`, the dialog renders inside its container, shows no page backdrop and blocks no part of the page outside its box. `protocol.fixed: { contained: true }` sets it over A2UI. A dialog whose only factory returns a Promise (`showConfirmDialog`, `showShareDialog`) or nothing (`showErrorDialog`) uses a handle-returning factory for the manifest: an additive `create…` where none exists. The user's answer is an event, such as `confirm`/`cancel`, `submit` or `share`. ProgressModal's progress is data the agent updates. |
| sidebar | A panel holding other components that can dock, float, collapse and resize | Contained over A2UI. Its content is a child slot (ADR-238). Collapse and resize are channels, and width and collapsed are state. NavRail stays pending because it has no contained mode. |

### 3.2 Out of scope, with reasons (14)

| Component | Reason |
|---|---|
| authcard | It collects passwords and one-time codes, which must never reach an agent. Sign-in belongs to the host. |
| toast, bannerbar | Page-level notices fixed to the viewport. A notice from an agent belongs in its surface, through Text, StatusBadge or EmptyState. |
| contextmenu, hovercard, helptooltip, magnifier | Anchored to host page elements and positioned over the page. An agent has no page element to anchor to. |
| commandpalette | A page-wide shortcut and overlay over the host's commands. |
| guidedtour | It walks through host page elements by selector. |
| smarttextinput | Behaviour, not UI: it attaches to an input the host owns, and the host renders the popover. |
| logutility, themeinit | Not UI: page logging and theme start-up. |
| markdownrenderer | A library with no element of its own: `createMarkdownRenderer` returns `render(md, target)` and `toHtml(md)`. An agent renders markdown with DocViewer, which is in the catalog and renders through it. This was triaged to join, and moved out in S5-1 (ADR-243). |
| dynamiccanvas | The Dynamic UI runtime's own canvas, which hosts components itself. It is a peer of an A2UI surface, not something inside one. |

The list lives in `scripts/agentui/no-manifest.mjs` as `NO_MANIFEST`, mapping each name to its reason. The components later batches will give a manifest are in `AWAITING_MANIFEST` there, a list that may only shrink. `scripts/build-manifest.js` fails when a component has neither a manifest nor an entry, has both, or when an entry names no directory.

## 4. Decisions (user, 2026-11-01)

- **D1. The dialogs join, with a contained mode.** That's five components of new, additive behaviour, so they get a batch of their own. Each one's contained rendering is checked in a real browser, inside a surface, alongside other components.
- **D2. Toolbar and GraphToolbar join:** contained and docked over A2UI, and a tool click is an event.
- **D3. Sidebar joins:** contained, with its content as a child slot. NavRail stays pending.

## 5. Batches

Each batch is one PR, with a manifest, glue, browser gesture tests and records. Every PR targets main, with no stacking, so no retargeting is needed.

| Batch | Components |
|---|---|
| S5-1 | `NO_MANIFEST` and its gate; typebadge (ADR-243) |
| S5-2 | statusbar and sidebar (ADR-244) |
| S5-3 | toolbar and graphtoolbar |
| S5-4 | confirmdialog, errordialog, formdialog, progressmodal and sharedialog, with the `contained` mode |

## 6. Done when

- Each of the 24 has a manifest in catalog v1 or an entry in `NO_MANIFEST`.
- The readiness spec's count of components without a manifest is 0, with 14 recorded as out of scope.
- #64 and the epic are updated.
- What remains for the epic is the docs, demos and README update (§ end-of-epic deliverables), CommentOverlay and the four pending components with recorded reasons.
