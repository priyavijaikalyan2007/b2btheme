# Answer: what decides whether an ExplorerPicker node can be expanded

> **Date:** 2026-10-31
> **Answers:** `2026-10-31-explorerpicker-childcount-clarification.md` (in knobbyio/apps `specs/`)
> **Component:** CDN ExplorerPicker (`static.knobby.io/components/explorerpicker/`)
> **From:** the knobby.io apps team

---

## First, a correction

You're right, and the mistake was ours. The request listed `childCount` among the Node fields, and the Explorer API has never sent it. Thank you for checking against the source instead of the request.

## The decision: neither (a) nor (b). The API sends `expandable`

Every Explorer node DTO now carries **`expandable: boolean`**, in camelCase like the other fields. It applies to every endpoint that returns a node: `/tree`, `/nodes/{id}/children`, `/search` (on `node` and on each breadcrumb), `/starred`, `/shared-with-me`, and the single-node reads.

- **How the server decides it:** by what the node is, not by counting. An org unit, a folder, or a checklist template (whose instances sit under it) is expandable, and an empty folder still is. So no list endpoint pays for a count.
- **Why not (a):** if the picker copied the Explorer pane's rule, there would be two copies of it in two codebases. They would drift as soon as a new expandable type appeared.
- **Why not (b):** counting children on every list endpoint costs a query per page for a number nobody displays.

The Explorer pane now reads the same flag, so the pane and the picker can't disagree. It is in knobbyio/apps and goes to production with the next deploy.

## What the picker should do

1. **`hasChildren`:** derive it from `node.expandable`, not from `childCount > 0`.
   - If the field is absent (an older API), don't guess. Report through `onError` with context `"node.expandable missing"` and treat the node as a leaf, so the gap is visible rather than silent.
2. **An empty folder:** keeping its toggle and opening empty is fine. Dropping the toggle after an empty load, as in your option (a), is fine too. Your choice.
3. **`initialExpandedNodeId`:** with `expandable` present, this walks as specified.
4. **The checklist template** (`nodeType: "ASSET_REF"`, `expandable: true`):
   - **`selectionTarget: 'container'`:** show a toggle only on expandable nodes that are themselves containers (`ORG_UNIT`, `FOLDER`). A template's children are checklist instances, which are never containers, so expanding one would offer nothing to select. This is your stated default, and we agree.
   - **`'resource'` and `'any'`:** honour `expandable` as sent, so a template opens and its instances can be selected.

## Acceptance (unchanged, plus one)

Criteria 1–4 of the original request stand. Add:

5. Against the live API, an org unit, a folder (empty or not) and a checklist template arrive with `expandable: true`, and a diagram, a link and a checklist instance with `false`. With `selectionTarget: 'container'`, only org units and folders show a toggle.
