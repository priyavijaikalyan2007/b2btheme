<!--
SPDX-FileCopyrightText: 2026 Priya Vijai Kalyan <priyavijai.kalyan2007@proton.me>
SPDX-License-Identifier: MIT
-->

# ExplorerPicker

A reusable resource-selection widget that renders an Explorer tree in "picker mode." Users browse the organisational hierarchy or search by name to select one or more resources, then confirm their selection. Self-contained — a single CSS + JS file pair deployable via CDN with no runtime dependency on other library components.

## Usage

### CDN

```html
<link rel="stylesheet" href="components/explorer-picker/explorer-picker.css">
<script src="components/explorer-picker/explorer-picker.js"></script>
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
| `resourceTypeFilter` | `string[]` | — | Only show matching resource types |
| `excludeNodeIds` | `string[]` | — | IDs of nodes that cannot be selected (dimmed) |
| `initialExpandedNodeId` | `string` | — | Auto-expand tree to this node on load |
| `preSelectedNodeIds` | `string[]` | — | Pre-selected nodes on render |
| `apiBase` | `string` | `"/api/v1/explorer"` | Base URL for Explorer API |
| `fetchFn` | `typeof fetch` | `window.fetch` | Custom fetch function |
| `showRecentItems` | `boolean` | `true` | Show recent items section |
| `showStarredItems` | `boolean` | `true` | Show starred items section |
| `quickAccessLimit` | `number` | `5` | Max items per quick-access section |
| `searchPlaceholder` | `string` | `"Search resources..."` | Search input placeholder |
| `height` | `string` | `"400px"` | Picker height |
| `cssClass` | `string` | — | Additional CSS class(es) |
| `iconResolver` | `(node) => string \| undefined` | — | Custom icon resolver callback |
| `ontologyApiBase` | `string` | `"/api/v1/ontology"` | Base URL for ontology API |
| `ontologyTypes` | `OntologyTypeEntry[]` | — | Pre-loaded ontology types (skips API) |
| `confirmButtonText` | `string \| (count) => string` | `"Select"` | Confirm button text |
| `cancelButtonText` | `string` | `"Cancel"` | Cancel button text |
| `onConfirm` | `(selections) => void` | — | Called on confirm (required) |
| `onCancel` | `() => void` | — | Called on cancel |
| `onSelectionChange` | `(selections) => void` | — | Called on every selection change |
| `onError` | `(error, context) => void` | — | Called on API errors |

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
npx vitest run components/explorer-picker/explorer-picker.test.ts
```
