# FileExplorer

Two-pane file navigation component with a folder tree sidebar, breadcrumb navigation, three view modes (grid, list, detail), multi-selection, context menu, inline rename, sorting, and callback-driven file operations.

## Quick Start

```html
<link rel="stylesheet" href="dist/components/fileexplorer/fileexplorer.css">
<script src="dist/components/fileexplorer/fileexplorer.js"></script>
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

## Assets

| Asset | Path |
|-------|------|
| CSS   | `dist/components/fileexplorer/fileexplorer.css` |
| JS    | `dist/components/fileexplorer/fileexplorer.js` |
| Types | `dist/components/fileexplorer/fileexplorer.d.ts` |

**Requires:** Bootstrap CSS, Bootstrap Icons CSS.

## FileNode Interface

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `type` | `"file" \| "folder"` | Node type |
| `icon` | `string` | Bootstrap Icons class override |
| `size` | `number` | File size in bytes |
| `modified` | `Date` | Last modified date |
| `mimeType` | `string` | MIME type string |
| `parentId` | `string` | Parent folder ID |
| `children` | `FileNode[]` | Child nodes (folders) |
| `data` | `Record<string, unknown>` | Custom data |

## Options (`FileExplorerOptions`)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `roots` | `FileNode[]` | -- | Root-level nodes (required) |
| `viewMode` | `"grid" \| "list" \| "detail"` | `"detail"` | Initial view mode |
| `showBreadcrumbs` | `boolean` | `true` | Show breadcrumb bar |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `showTreePane` | `boolean` | `true` | Show tree sidebar |
| `treePaneWidth` | `number` | `250` | Initial tree pane width (px) |
| `selectable` | `"single" \| "multi"` | `"multi"` | Selection mode |
| `contextMenuItems` | `FileContextMenuItem[]` | `[]` | Right-click menu items |
| `height` | `string` | `"500px"` | Explorer height |
| `showStatusLine` | `boolean` | `true` | Show status line |
| `sortField` | `string` | `"name"` | Initial sort field |
| `sortDirection` | `string` | `"asc"` | Initial sort direction |
| `onNavigate` | `(folder) => void` | -- | Folder navigation callback |
| `onSelect` | `(files) => void` | -- | Selection change callback |
| `onOpen` | `(file) => void` | -- | File open callback |
| `onRename` | `(file, name) => Promise<boolean>` | -- | Rename callback |
| `onDelete` | `(files) => Promise<boolean>` | -- | Delete callback |
| `onMove` | `(files, target) => Promise<boolean>` | -- | Move callback |
| `onCreateFolder` | `(parent, name) => Promise<FileNode>` | -- | New folder callback |
| `onLoadChildren` | `(folder) => Promise<FileNode[]>` | -- | Lazy load callback |
| `onUpload` | `(folder, files) => Promise<void>` | -- | Upload callback |

## API Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Render into container |
| `hide()` | Remove from DOM, keep state |
| `destroy()` | Full teardown |
| `navigate(folderId)` | Navigate to a folder |
| `getSelectedFiles()` | Get selected nodes |
| `refresh()` | Re-render current view |
| `setViewMode(mode)` | Switch view mode |
| `getViewMode()` | Get current view mode |
| `getCurrentFolder()` | Get current folder node |
| `getPath()` | Get breadcrumb path array |
| `addFile(file, parentId)` | Add a file node |
| `removeFile(fileId)` | Remove a file node |
| `updateFile(fileId, changes)` | Update a file node |
| `setSort(field, direction)` | Change sort |

## View Modes

- **Grid**: Thumbnail-style cards with large icons and file names in a CSS grid
- **List**: Compact single-line rows with icon, name, and size
- **Detail**: Table-like layout with sortable column headers (Name, Modified, Size, Type)

## Keyboard

| Key | Action |
|-----|--------|
| **ArrowDown/Up** | Navigate items |
| **Enter** | Open file or navigate folder |
| **F2** | Start inline rename |
| **Delete** | Delete selected items |
| **Escape** | Cancel rename, close menu, deselect |
| **Backspace** | Navigate to parent folder |
| **Ctrl+A** | Select all (multi mode) |

## File Type Icons

Extensions are auto-mapped to Bootstrap Icons (PDF, Word, Excel, images, video, audio, code, text, markdown, archives). Set `FileNode.icon` to override.

See `specs/fileexplorer.prd.md` for the full specification.
