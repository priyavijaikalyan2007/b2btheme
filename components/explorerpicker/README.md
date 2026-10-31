<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

# ExplorerPicker

A reusable resource-selection widget that renders an Explorer tree in "picker mode." Users browse the organisational hierarchy or search by name to select one or more resources, then confirm their selection. Self-contained — a single CSS + JS file pair deployable via CDN with no runtime dependency on other library components.

## Usage

### CDN

```html
<link rel="stylesheet" href="components/explorerpicker/explorerpicker.css">
<script src="components/explorerpicker/explorerpicker.js"></script>
```

### Basic Example

```typescript
const picker = createExplorerPicker({
    container: "my-picker-container",
    mode: "single",
    selectionTarget: "resource",
    onConfirm: (selections) =>
    {
        console.log("Selected:", selections);
    },
    onCancel: () =>
    {
        console.log("Cancelled");
    },
});
```

### Modal via FormDialog

```typescript
const dialog = createFormDialog({
    title: "Link to Resource",
    size: "large",
    fields: [],
    customContent: (container) =>
    {
        createExplorerPicker({
            container,
            mode: "multi",
            height: "100%",
            onConfirm: (selections) =>
            {
                dialog.close();
                createRelationships(selections);
            },
            onCancel: () => dialog.close(),
        });
    },
    hideDefaultButtons: true,
});
dialog.open();
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | — | Container element or element ID (required) |
| `mode` | `"single" \| "multi"` | `"single"` | Selection mode |
| `selectionTarget` | `"resource" \| "container" \| "any"` | `"resource"` | What types of nodes are selectable |
| `resourceTypeFilter` | `string[]` | — | Only show matching resource types. Applied since 2026-10-21. Before then the option reached a field nothing read |
| `excludeNodeIds` | `string[]` | — | IDs of nodes that cannot be selected (dimmed) |
| `initialExpandedNodeId` | `string` | — | Auto-expand tree to this node on load |
| `preSelectedNodeIds` | `string[]` | — | Pre-selected nodes on render |
| `apiBase` | `string` | `"/api/v1/explorer"` | Base URL for Explorer API |
| `fetchFn` | `typeof fetch` | `window.fetch` | Custom fetch function |
| `showRecentItems` | `boolean` | `true` | Show recent items section |
| `showStarredItems` | `boolean` | `true` | Show starred items section |
| `showFooter` | `boolean` | `true` | Show the footer with Confirm (and Cancel). Set `false` inside a host dialog with its own buttons, and read the choice with `getSelection()` or `onSelectionChange` |
| `quickAccessLimit` | `number` | `5` | Max items per quick-access section |
| `searchPlaceholder` | `string` | `"Search resources..."` | Search input placeholder |
| `height` | `string` | `"400px"` | Picker height |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `iconResolver` | `(node) => string \| undefined` | — | Custom icon resolver callback |
| `ontologyApiBase` | `string` | `"/api/v1/ontology"` | Base URL for ontology API |
| `ontologyTypes` | `OntologyTypeEntry[]` | — | Pre-loaded ontology types (skips API) |
| `confirmButtonText` | `string \| (count) => string` | `"Select"` | Confirm button text |
| `cancelButtonText` | `string` | `"Cancel"` | Cancel button text |
| `onConfirm` | `(selections) => void` | — | Called on confirm. Optional since 2026-10-29: the `confirm` channel of `on()` delivers it too |
| `onCancel` | `() => void` | — | Called on cancel; passing it shows the Cancel button |
| `onSelectionChange` | `(selections) => void` | — | Called on every selection change |
| `onError` | `(error, context) => void` | — | Called when the initial load fails |
| `staticNodes` | `ExplorerNode[]` | — | The initial tree, flat, each node naming its `parentId`; the tree, ontology, recent and starred items are not requested |
| `onLoadChildren` | `({ nodeId }) => Promise<ExplorerNode[]>` | — | Loads one level: a node's children, or the roots when `nodeId` is `null`. With it nothing is requested from `apiBase` or `ontologyApiBase`: Recent and Starred are not shown, and search needs `onSearch`. Answers that list the node, an ancestor or another parent's child are cut to the real children |
| `onSearch` | `({ query, cursor }) => Promise<{ results, cursor }>` | — | Answers a search instead of `apiBase/search`; a non-null `cursor` shows "Load more results" |
| `cancellable` | `boolean` | `false` | Show the Cancel button without `onCancel` |
| `showSearch` | `boolean` | `true` | Show the search box |

### Hosted in a dialog with its own buttons

```typescript
const host = document.createElement("div");
const picker = createExplorerPicker({
    container: host,
    mode: "single",
    selectionTarget: "container",
    showRecentItems: false,
    showFooter: false,          // the dialog's Move/Cancel are the only buttons
    height: "320px",
    onSelectionChange: (s) => { target = s[0]?.nodeId ?? null; },
});
createFormDialog({ title: "Move", submitLabel: "Move",
    fields: [{ name: "destination", label: "Move to", type: "custom", customElement: host }],
    onSubmit: async () => { /* move to picker.getSelection()[0] */ } }).show();
```

### What it reads from `apiBase`

The Explorer API's responses, as they are (2026-10-31): every list is an object.

| Request | Response |
|---|---|
| `GET /tree`, `GET /nodes/{id}/children` | `{ nodes: [Node] }`; a node with `childCount > 0` gets an expand toggle |
| `GET /search?q=&pageSize=&pageToken=` | `{ hits: [{ node, breadcrumbs: [Node] }], totalCount, nextPageToken }`; the breadcrumb is `breadcrumbs`' names, root first, joined with " > ", and `nextPageToken` is sent back as `pageToken` |
| `GET /starred` | `{ items: [{ nodeId, starredAt, sortOrder, node }] }`; an item whose `node` is null is skipped |
| `GET /recent` | Requested only with `showRecentItems: true`. The API has no such endpoint today: a 404 leaves the section hidden and the tree renders |

A response of another shape is an error naming the endpoint, reported through `onError` with its context.

## Instance API

| Method | Returns | Description |
|--------|---------|-------------|
| `getSelection()` | `ExplorerPickerSelection[]` | Get current selection |
| `clearSelection()` | `void` | Clear all selections |
| `setSearchQuery(query)` | `void` | Programmatically search |
| `expandNode(nodeId)` | `Promise<void>` | Expand a tree node |
| `collapseNode(nodeId)` | `void` | Collapse a tree node |
| `scrollToNode(nodeId)` | `void` | Scroll node into view |
| `refresh()` | `Promise<void>` | Re-fetch all data |
| `exportState()` | `ExplorerPickerState` | Export UI state for persistence |
| `restoreState(state)` | `Promise<void>` | Restore exported state |
| `show(container?)` | `void` | Mount into container |
| `hide()` | `void` | Remove from DOM (preserves state) |
| `destroy()` | `void` | Full cleanup |
| `isLoading()` | `boolean` | Whether data is loading |
| `getElement()` | `HTMLElement \| null` | Root DOM element |
| `on(channel, handler)` | `() => void` | Subscribe to `"selection"`, `"confirm"` or `"cancel"`; each sends the selection records (cancel: the selection abandoned) after the matching callback |
| `getState()` / `setState(state)` | — | `{ expanded, selection }` node ids; `setState` restores them without firing anything |
| `setData(slot, value)` | `void` | Throws: there are no data slots |

## Data Types

### ExplorerNode

```typescript
interface ExplorerNode
{
    id: string;
    name: string;
    nodeType: "ORG_UNIT" | "FOLDER" | "ASSET_REF" | "LINK";
    resourceId: string | null;
    resourceType: string | null;
    sourceId: string | null;
    url: string | null;
    linkType: string | null;
    hasChildren: boolean;
    parentId: string | null;
}
```

### ExplorerPickerSelection

```typescript
interface ExplorerPickerSelection
{
    nodeId: string;
    resourceId: string | null;
    name: string;
    nodeType: ExplorerNodeType;
    resourceType: string | null;
    sourceId: string | null;
    breadcrumb: string;
    url: string | null;
}
```

## Features

- **Tree browsing** with lazy-loaded children
- **Search** with 300ms debounce, breadcrumb paths, pagination
- **Quick-access sections** for recent and starred items
- **Ontology-driven icons** with colour and external badges
- **Virtual scrolling** for trees with 200+ visible nodes
- **Keyboard navigation** (Arrow keys, Home/End, Enter, Space, Escape, /)
- **State export/restore** for session continuity
- **Chrome integration** with hover-glow, focus-glow, edge-shadow
- **Accessibility** with ARIA roles, live region announcements
- **Dark mode** with lightness-clamped ontology colours
- **Reduced motion** support

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `ArrowDown/Up` | Navigate nodes |
| `ArrowRight` | Expand node / move to first child |
| `ArrowLeft` | Collapse node / move to parent |
| `Home/End` | Jump to first/last node |
| `Enter` | Select (single) or toggle (multi) |
| `Space` | Toggle checkbox |
| `Escape` | Clear search or cancel |
| `/` | Focus search input |

## Chrome Effects

The component uses the Enterprise Theme chrome system:
- **Node rows**: `hover-glow` on hover
- **Search input**: `focus-glow` on focus
- **Buttons**: `focus-glow` on focus
- **Search bar**: `edge-shadow("bottom")` separator
- **Section headers**: `chrome-transition` for smooth state changes

## Tests

82 unit tests covering:
- Factory and lifecycle
- DOM structure and ARIA roles
- Single-select and multi-select
- Confirm/cancel callbacks
- API data layer (mock fetch)
- Search input and clear
- Quick-access sections
- Ontology integration
- Exclude nodes and pre-selection
- Breadcrumbs and selection change
- State export/restore
- Keyboard navigation
- Accessibility attributes

```bash
npx vitest run components/explorerpicker/explorerpicker.test.ts
```
