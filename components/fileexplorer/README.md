# FileExplorer

Two-pane file navigation component with a folder tree sidebar, breadcrumb navigation, three view modes (grid, list, detail), multi-selection, context menu, inline rename, sorting, drag-and-drop, and callback-driven file operations. Supports both tree mode (sidebar + hierarchy) and flat mode (host-driven items + breadcrumbs).

## Quick Start

### Tree Mode (Default)

```html
<link rel="stylesheet" href="components/fileexplorer/fileexplorer.css">
<script src="components/fileexplorer/fileexplorer.js"></script>
<script>
    var explorer = createFileExplorer("my-container", {
        roots: [
            {
                id: "root", name: "Documents", type: "folder",
                children: [
                    { id: "f1", name: "Report.pdf", type: "file", size: 245000 },
                    { id: "f2", name: "Budget.xlsx", type: "file", size: 89000 },
                    {
                        id: "sub", name: "Images", type: "folder",
                        children: [
                            { id: "f3", name: "logo.png", type: "file", size: 34000 }
                        ]
                    }
                ]
            }
        ],
        onOpen: function(file) { console.log("Open:", file.name); },
        onNavigate: function(folder) { console.log("Navigate:", folder.name); }
    });
</script>
```

### Flat Mode (Host-Driven)

```html
<script>
    var explorer = createFileExplorer(document.getElementById("panel"), {
        showTreePane: false,
        items: [
            { id: "d1", name: "Projects", type: "folder" },
            { id: "d2", name: "Design.fig", type: "file", typeLabel: "Diagram", iconColor: "#e74c3c" },
        ],
        breadcrumb: [
            { id: null, label: "Home" },
            { id: "org1", label: "My Org" },
        ],
        onBreadcrumbNavigate: function(segmentId) { loadFolder(segmentId); },
        onOpen: function(node) { openItem(node); },
    });
</script>
```

See `docs/fileexplorer-flat-mode-guide.md` for the full Apps Team Integration Guide.

## Assets

| Asset | Path |
|-------|------|
| CSS   | `components/fileexplorer/fileexplorer.css` |
| JS    | `components/fileexplorer/fileexplorer.js` |
| Types | `components/fileexplorer/fileexplorer.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## FileNode Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `type` | `"file" \| "folder"` | Node type |
| `icon` | `string` | Bootstrap Icons class override |
| `iconColor` | `string` | Icon color (CSS color value) |
| `size` | `number` | File size in bytes |
| `modified` | `Date` | Last modified date |
| `mimeType` | `string` | MIME type string |
| `typeLabel` | `string` | Type label for display (e.g. "Diagram") |
| `owner` | `string` | Display name of the item owner |
| `readOnly` | `boolean` | Disables rename/delete |
| `isSystem` | `boolean` | Disables most actions |
| `parentId` | `string` | Parent folder ID |
| `children` | `FileNode[]` | Child nodes (folders) |
| `data` | `Record<string, unknown>` | Custom data |

## BreadcrumbSegment Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string \| null` | Segment ID. `null` = root. |
| `label` | `string` | Display label |

## FileExplorerColumn Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Column identifier used in sort callbacks |
| `label` | `string` | Column header label |
| `width` | `string` | Fixed width (CSS value). Omit for flex. |
| `sortable` | `boolean` | Whether clicking sorts. Default: `true` |
| `render` | `(node: FileNode) => string \| HTMLElement` | Custom cell renderer |

## Options (`FileExplorerOptions`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `roots` | `FileNode[]` | `[]` | Root-level nodes for tree mode |
| `items` | `FileNode[]` | -- | Initial flat items (enables flat mode) |
| `breadcrumb` | `BreadcrumbSegment[]` | -- | Initial breadcrumb path |
| `viewMode` | `"grid" \| "list" \| "detail"` | `"detail"` | Initial view mode |
| `columns` | `FileExplorerColumn[]` | defaults | Detail view column definitions |
| `showBreadcrumbs` | `boolean` | `true` | Show breadcrumb bar |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `showTreePane` | `boolean` | `true` | Show tree sidebar |
| `treePaneWidth` | `number` | `250` | Initial tree pane width (px) |
| `selectable` | `"single" \| "multi"` | `"multi"` | Selection mode |
| `multiSelect` | `boolean` | -- | Sugar for `selectable: "multi"` |
| `contextMenuItems` | `FileContextMenuItem[] \| ((node) => FileContextMenuItem[])` | `[]` | Right-click menu items (static or dynamic) |
| `height` | `string` | `"500px"` | Explorer height |
| `showStatusLine` | `boolean` | `true` | Show status line |
| `sortField` | `string` | `"name"` | Initial sort field |
| `sortDirection` | `string` | `"asc"` | Initial sort direction |
| `groupBy` | `"type-first" \| "none" \| function` | -- | Grouping strategy |
| `emptyState` | `{ icon?, title?, description? }` | -- | Empty state configuration |
| `onNavigate` | `(folder) => void` | -- | Folder navigation callback |
| `onSelect` | `(files) => void` | -- | Selection change callback |
| `onSelectionChange` | `(nodes) => void` | -- | Selection change (multi) |
| `onOpen` | `(file) => void` | -- | File open callback |
| `onRename` | `(file, name) => Promise<boolean>` | -- | Rename callback |
| `onDelete` | `(files) => Promise<boolean>` | -- | Delete callback |
| `onMove` | `(files, target) => Promise<boolean>` | -- | Move callback |
| `onCreateFolder` | `(parent, name) => Promise<FileNode>` | -- | New folder callback |
| `onLoadChildren` | `(folder) => Promise<FileNode[]>` | -- | Lazy load callback |
| `onUpload` | `(folder, files) => Promise<void>` | -- | Upload callback |
| `onSort` | `(field, direction) => void` | -- | Sort change callback |
| `onViewModeChange` | `(mode) => void` | -- | View mode change callback |
| `onBreadcrumbNavigate` | `(segmentId) => void` | -- | Breadcrumb click callback (flat mode) |
| `onContextMenuAction` | `(actionId, node) => void` | -- | Context menu action callback |
| `onDragStart` | `(nodes) => void` | -- | Drag start callback |
| `onDrop` | `(target, ids) => void` | -- | Drop on folder callback |
| `onExternalDrop` | `(target, dataTransfer) => void` | -- | External drop callback |

## API Methods

| Method | Description |
|--------|-------------|
| `show(containerOrId)` | Render into container (HTMLElement or string ID) |
| `hide()` | Remove from DOM, keep state |
| `destroy()` | Full teardown |
| `navigate(folderId)` | Navigate to a folder (tree mode) |
| `setItems(items)` | Replace displayed items (flat mode) |
| `getItems()` | Get current items |
| `setBreadcrumb(segments)` | Update breadcrumb path (flat mode) |
| `getSelectedFiles()` | Get selected nodes |
| `getSelectedIds()` | Get selected IDs |
| `selectItem(id)` | Select a single item |
| `selectItems(ids)` | Select multiple items |
| `deselectAll()` | Clear selection |
| `refresh()` | Re-render current view |
| `setViewMode(mode)` | Switch view mode |
| `getViewMode()` | Get current view mode |
| `getCurrentFolder()` | Get current folder node |
| `getPath()` | Get breadcrumb path array |
| `addFile(file, parentId)` | Add a file node |
| `removeFile(fileId)` | Remove a file node |
| `updateFile(fileId, changes)` | Update a file node |
| `setSort(field, direction)` | Change sort |
| `showLoading()` | Show skeleton loading state |
| `showEmpty(config?)` | Show configurable empty state |
| `startRenamePublic(nodeId?)` | Start inline rename |
| `focus()` | Focus listing for keyboard nav |

## View Modes

- **Grid**: Thumbnail-style cards with large icons and file names in a CSS grid
- **List**: Compact single-line rows with icon, name, and size
- **Detail**: Table-like layout with sortable column headers (customizable via `columns`)

## Grouping

- **`type-first`**: Folders group, then files grouped by `typeLabel` or extension
- **`none`**: No visual grouping
- **Custom function**: `(items) => Array<{ label: string; items: FileNode[] }>`

## Keyboard

| Key | Action |
|-----|--------|
| **ArrowDown/Up** | Navigate items |
| **Enter** | Open file or navigate folder |
| **F2** | Start inline rename (guarded by `readOnly`/`isSystem`) |
| **Delete** | Delete selected items (filters out `readOnly`/`isSystem`) |
| **Escape** | Cancel rename, close menu, deselect |
| **Backspace** | Navigate to parent (tree) or fire `onBreadcrumbNavigate` (flat) |
| **Ctrl+A** | Select all (multi mode) |

## CSS Custom Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--file-explorer-bg` | `var(--theme-surface-bg)` | Background color |
| `--file-explorer-border` | `var(--theme-border-subtle)` | Border color |
| `--file-explorer-font-size` | `$font-size-sm` | Base font size |
| `--file-explorer-toolbar-bg` | `var(--theme-surface-raised-bg)` | Toolbar background |
| `--file-explorer-row-hover-bg` | `var(--theme-hover-bg)` | Row hover background |
| `--file-explorer-row-selected-bg` | `rgba($blue-100, 0.5)` | Selected row background |
| `--file-explorer-group-color` | `var(--theme-text-muted)` | Group header text color |
| `--file-explorer-group-font-size` | `$font-size-2xs` | Group header font size |

Override on `.fileexplorer`:
```css
.fileexplorer {
    --file-explorer-bg: #1a1a2e;
    --file-explorer-border: #2d2d44;
    --file-explorer-row-selected-bg: rgba(59, 130, 246, 0.2);
}
```

## File Type Icons

Extensions are auto-mapped to Bootstrap Icons (PDF, Word, Excel, images, video, audio, code, text, markdown, archives). Set `FileNode.icon` to override. Set `FileNode.iconColor` for custom icon colors.

See `specs/fileexplorer.component.prd.md` for the full specification.
