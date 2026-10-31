# Request: ExplorerPicker follow-ups for the Move dialog

> **Date:** 2026-10-31
> **Answers:** the apps team's copy of `2026-10-31-explorerpicker-final-report.md` (in knobbyio/apps `specs/`)
> **Component:** CDN ExplorerPicker (`static.knobby.io/components/explorerpicker/`)
> **From:** the knobby.io apps team
> **For:** the Move dialog (knobbyio/apps #349)

---

## Summary

The final report offered two follow-ups. The Move dialog needs both:

1. Exclusion covers a node's whole subtree, and an excluded row has a neutral tooltip.
2. `initialExpandedNodeId` opens the path to its node.

The first is a defect in the Move dialog without the change. The second makes the dialog start where a person expects it to start.

## 1. Exclude the subtree, with a neutral tooltip

**The problem.** A person who moves a folder can choose one of its subfolders, either by expanding the greyed-out folder or through search. The server refuses that move. From the next apps deploy the preview refuses it too, with a sentence such as: `"Q3 plans" cannot be moved into "Drafts", because "Drafts" is inside it.` So the result is correct, but the person learns of the mistake only after choosing. The tooltip "Cannot link to itself" is also wrong in a Move dialog, because nothing is being linked.

**The change.**
- A node in `excludeNodeIds` and every node below it render as excluded. They cannot be selected, in the tree or in search results.
- For a search hit, the picker can decide this from the hit's `breadcrumbs`. A hit is below an excluded node when one of its breadcrumbs is that node. So this needs no extra request.
- In the tree, an excluded node can still expand, so the person sees where they are. Its children render as excluded.
- The tooltip does not name a flow. We suggest "This is the item being moved, or is inside it." Alternatively, add an option `excludedReason?: string` that the host sets. The apps team prefers the option, because the link flow and the Move dialog need different sentences.

**Acceptance.**
1. Exclude folder M, which holds folder N. Neither M nor N can be selected, in the tree or in search results.
2. A folder beside M can be selected.
3. The tooltip on M and on N is the host's sentence, or the neutral default.

## 2. `initialExpandedNodeId` opens the path to its node

**The problem.** The Move dialog passes the item's current folder as `initialExpandedNodeId`. The report says the picker opens only ancestors it has already loaded, and it loads only the top level at first. So the dialog opens at the top of the tree, and the person must find their place again.

**The change.**
- When `initialExpandedNodeId` is set, call `GET {apiBase}/nodes/{id}`. The response carries `ancestors`, root first and immediate parent last, in the same node shape as the other endpoints.
- Load the children of each ancestor in that order, open each one, and then open the node itself.
- **An ancestor can be missing.** The API leaves out an ancestor the caller cannot see. Open the chain as far as it connects to nodes the picker has loaded, and stop there. Do not report this through `onError`, because it is normal: a person can see a folder whose parent is not shared with them.
- If the read fails (403 or 404), report it through `onError` with the context `"initialExpandedNodeId"`, and show the top level as today.

The option keeps its name, and only its behavior changes. No host uses it today, so no host changes.

**Acceptance.**
1. With `initialExpandedNodeId` set to a folder three levels deep, the picker opens with that folder expanded, its ancestors open, and the folder scrolled into view.
2. The same folder, for a caller who cannot see its middle ancestor, opens as far as the chain connects and reports nothing.
3. An id that does not exist calls `onError` with `"initialExpandedNodeId"` and shows the top level.

## What the apps team does next

- When #78 and these changes reach the CDN, the apps team builds the Move dialog with the configuration from the final report. It adds `initialExpandedNodeId: parentId`, and `excludedReason` if you add that option.
- Before that, the apps team deploys the API's `expandable` flag to production and checks acceptance criterion 5 of the original request there.
