<!-- AGENT: Product Requirements Document for the FileExplorer component — two-pane file navigation with tree sidebar, breadcrumbs, and grid/list/detail views for browsing hierarchical file structures. -->

# FileExplorer Component — Product Requirements

**Status:** Draft
**Component name:** FileExplorer
**Folder:** `./components/fileexplorer/`
**Spec author:** Agent
**Date:** 2026-02-20

---

## 1. Overview

### 1.1 What Is It

A two-pane file navigation component combining a folder tree on the left with a file listing on the right, separated by a draggable divider. The FileExplorer provides a desktop-class file browsing experience within enterprise SaaS applications, supporting three view modes (grid, list, detail), breadcrumb navigation, sorting, multi-selection, context menus, drag-and-drop file operations, and keyboard navigation.

The FileExplorer supports:

- **Two-pane layout** — a TreeView folder tree on the left pane and a file listing on the right pane, connected via SplitLayout.
- **View modes** — grid (thumbnails), list (compact rows), and detail (table-like with sortable columns) views for the right pane.
- **Breadcrumb navigation** — clickable path segments at the top of the content pane for quick navigation to ancestor folders.
- **Sorting** — sort files by name, date modified, size, or type in ascending or descending order.
- **File type icons** — Bootstrap Icons mapped to common file extensions and MIME types.
- **Selection** — single-click to select, double-click to open, Ctrl+Click and Shift+Click for multi-selection.
- **Context menu** — right-click menu with configurable actions per selection.
- **Drag and drop** — drag files between folders within the tree and the file listing.
- **Toolbar** — configurable action bar with view mode switcher, sort controls, new folder, and upload placeholder.
- **Lazy loading** — folders load children on demand via the `onLoadChildren` callback.
- **Callbacks only** — the component never modifies data; all file operations (open, rename, delete, copy, move, create folder, upload) are delegated to the consumer via callbacks.

### 1.2 Why Build It

Enterprise SaaS applications frequently need file browsing interfaces for:

- Document management systems (browse, organise, and manage files and folders)
- Content management systems (navigate media libraries, template hierarchies)
- Data catalogues (explore datasets, schemas, and data pipelines)
- Project file browsers (source files, assets, deliverables)
- Cloud storage integrations (S3 bucket browsers, Azure Blob explorers)
- Configuration management (navigate config files, environment settings)

No existing open-source library provides a Bootstrap 5 compatible, vanilla TypeScript, two-pane file explorer with TreeView integration, SplitLayout resizing, three view modes, and full keyboard accessibility. Building custom ensures alignment with the project's zero-dependency, IIFE-wrapped, Bootstrap 5 themed architecture and reuses the existing TreeView and SplitLayout components.

### 1.3 Design Inspiration

| Source | Key Pattern Adopted |
|--------|---------------------|
| Windows File Explorer | Two-pane layout, breadcrumb bar, detail/list/grid view modes, sort-by-column headers |
| macOS Finder | Grid thumbnails, list view with expandable rows, sidebar folder tree, breadcrumb path bar |
| VS Code Explorer | TreeView sidebar for folders, file icons by extension, context menus, inline rename |
| Google Drive | Grid card layout, breadcrumb navigation, right-click context menu, multi-select |
| Dropbox | Clean grid/list toggle, sort dropdown, drag-to-move, breadcrumb path |
| SharePoint Document Library | Detail view with sortable columns, view mode switcher, toolbar actions |

### 1.4 Open Source Evaluation

| Library | Verdict | Reason |
|---------|---------|--------|
| elFinder | Not recommended | jQuery dependency; PHP server coupling; no Bootstrap 5 theme |
| jsTree + custom grid | Not recommended | jQuery dependency; no built-in file listing, no view modes |
| FilePond | Not recommended | Upload-only; no browsing or navigation capability |
| React File Manager (@opuscapita) | Not recommended | React-only; no vanilla JS support |
| Angular File Manager | Not recommended | Angular-only; tight framework coupling |
| Syncfusion File Manager | Not recommended | Commercial licence; heavy framework dependency |
| DevExtreme FileManager | Not recommended | Commercial licence; jQuery/React/Vue/Angular dependency |

**Decision:** Build custom. No library covers more than 40% of the required feature set (two-pane layout + TreeView integration + SplitLayout + three view modes + Bootstrap 5 theming + callback-driven operations + keyboard accessibility). Reusing the existing TreeView and SplitLayout components covers approximately 40% of the implementation effort.

---

## 2. Use Cases

| # | Use Case | Description | Key Features Used |
|---|----------|-------------|-------------------|
| 1 | Document management | Browse and organise documents in a hierarchical folder structure | All view modes, sort, breadcrumbs, rename, delete, move |
| 2 | Media library | Navigate image and video assets with thumbnail previews | Grid view, file type icons, upload, context menu |
| 3 | Cloud storage browser | Browse S3 buckets or Azure Blob containers | Lazy loading, breadcrumbs, detail view, sort by size/date |
| 4 | Project file navigator | Explore project source files and assets | Tree pane, detail view, context menu, drag-and-drop |
| 5 | Configuration explorer | Navigate environment configs and settings files | Tree pane, list view, search, inline rename |
| 6 | Data catalogue browser | Explore datasets organised in folders | Detail view with size/date columns, breadcrumbs |

---

## 3. Anatomy

### 3.1 Full Explorer Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ [Grid][List][Detail]  Sort: [Name ▼]  [+ New Folder]  [↑ Upload]      │  <- Toolbar
├──────────────┬──┬───────────────────────────────────────────────────────┤
│              │▐│  📁 Home > Documents > Reports                        │  <- Breadcrumbs
│  📁 Home     │▐│┌─────────────────────────────────────────────────────┐│
│  ├─📁 Docs   │▐││  📁 Q1 Report    📁 Q2 Report    📄 Summary.pdf   ││  <- Grid view
│  │ ├─📁 Rpts │▐││                                                    ││
│  │ └─📁 Tmpl │▐││  📊 Chart.xlsx   🖼️ Logo.png     📄 Notes.md      ││
│  ├─📁 Images │▐││                                                    ││
│  └─📁 Config │▐│└─────────────────────────────────────────────────────┘│
│              │▐│                                                       │
│  Tree Pane   │▐│                  Content Pane                         │
├──────────────┴──┴───────────────────────────────────────────────────────┤
│ 6 items | 2 selected                                                   │  <- Status line
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Detail View Layout

```
┌───────────────────────────────────────────────────────────────┐
│  Name ▲          │  Modified           │  Size    │  Type     │  <- Column headers
├──────────────────┼─────────────────────┼──────────┼───────────┤
│  📁 Q1 Report    │  2026-01-15 09:30   │  --      │  Folder   │
│  📁 Q2 Report    │  2026-02-10 14:15   │  --      │  Folder   │
│  📄 Summary.pdf  │  2026-02-18 11:45   │  2.4 MB  │  PDF      │
│  📊 Chart.xlsx   │  2026-02-19 16:00   │  145 KB  │  Excel    │
│  🖼️ Logo.png     │  2026-01-05 08:00   │  89 KB   │  Image    │
│  📄 Notes.md     │  2026-02-20 10:30   │  12 KB   │  Markdown │
└──────────────────┴─────────────────────┴──────────┴───────────┘
```

### 3.3 List View Layout

```
┌───────────────────────────────────────────────┐
│  📁 Q1 Report                                  │
│  📁 Q2 Report                                  │
│  📄 Summary.pdf                    2.4 MB      │
│  📊 Chart.xlsx                     145 KB      │
│  🖼️ Logo.png                       89 KB       │
│  📄 Notes.md                       12 KB       │
└───────────────────────────────────────────────┘
```

### 3.4 Element Breakdown

| Element | Required | Description |
|---------|----------|-------------|
| Root container | Yes | `div.fileexplorer` wrapping the entire component |
| Toolbar | Optional | `div.fileexplorer-toolbar` — view mode switcher, sort, actions |
| SplitLayout | Yes | `SplitLayout` instance managing tree pane and content pane |
| Tree pane | Optional | `div.fileexplorer-tree-pane` — contains the TreeView folder tree |
| Content pane | Yes | `div.fileexplorer-content-pane` — breadcrumbs, file listing, status |
| Breadcrumb bar | Optional | `nav.fileexplorer-breadcrumbs` — path segments with separators |
| Breadcrumb item | Conditional | `a.fileexplorer-breadcrumb-item` — clickable path segment |
| File grid | Conditional | `div.fileexplorer-grid` — CSS grid of file cards (grid view mode) |
| File grid item | Conditional | `div.fileexplorer-grid-item` — icon + name card |
| File list | Conditional | `div.fileexplorer-list` — compact row listing (list view mode) |
| File list row | Conditional | `div.fileexplorer-list-row` — icon + name + size row |
| File detail table | Conditional | `div.fileexplorer-detail` — table-like layout with column headers |
| Detail header row | Conditional | `div.fileexplorer-detail-header` — sortable column headings |
| Detail data row | Conditional | `div.fileexplorer-detail-row` — icon + name + date + size + type |
| File icon | Yes | `span.fileexplorer-icon` — Bootstrap Icons `<i>` mapped by file type |
| File name | Yes | `span.fileexplorer-name` — file or folder display name |
| Rename input | Conditional | `input.fileexplorer-rename-input` — inline rename text field |
| Status line | Optional | `div.fileexplorer-status` — item count and selection count |
| Context menu | Optional | `div.fileexplorer-context-menu` with `role="menu"` |
| Empty state | Conditional | `div.fileexplorer-empty` — shown when folder has no children |

---

## 4. API

### 4.1 Interfaces

```typescript
/** Represents a file or folder node in the explorer data model. */
interface FileNode
{
    /** Unique identifier for this node. Must be unique across the entire tree. */
    id: string;

    /** Display name of the file or folder. */
    name: string;

    /** Node type: file or folder. */
    type: "file" | "folder";

    /** Bootstrap Icons class override (e.g., "bi-file-earmark-pdf"). Auto-mapped if omitted. */
    icon?: string;

    /** File size in bytes. Displayed in list and detail views. Not applicable to folders. */
    size?: number;

    /** Last modified date. Displayed in detail view. */
    modified?: Date;

    /** MIME type string (e.g., "application/pdf"). Used for icon mapping and type column. */
    mimeType?: string;

    /** Parent folder ID. Null or undefined for root-level items. */
    parentId?: string;

    /** Child nodes. For folders: array of children, null for lazy-loaded, undefined for leaf files. */
    children?: FileNode[];

    /** Arbitrary consumer data attached to this node. Not rendered. */
    data?: Record<string, unknown>;
}

/** A configurable item in the right-click context menu. */
interface FileContextMenuItem
{
    /** Unique identifier for this action. */
    id: string;

    /** Display label. */
    label: string;

    /** Bootstrap Icons class (e.g., "bi-pencil"). */
    icon?: string;

    /** Click handler. Receives the currently selected files. */
    action: (files: FileNode[]) => void;

    /** Whether this item is disabled. Default: false. */
    disabled?: boolean;

    /** If true, render a separator line after this item. Default: false. */
    separatorAfter?: boolean;

    /** Keyboard shortcut hint text (e.g., "Del", "F2"). Displayed right-aligned. */
    shortcut?: string;
}

/** Configuration options for the FileExplorer component. */
interface FileExplorerOptions
{
    /** Root-level file and folder nodes. Multiple roots are supported. */
    roots: FileNode[];

    /** Initial view mode for the content pane. Default: "detail". */
    viewMode?: "grid" | "list" | "detail";

    /** Whether to show the breadcrumb navigation bar. Default: true. */
    showBreadcrumbs?: boolean;

    /** Whether to show the toolbar above the explorer. Default: true. */
    showToolbar?: boolean;

    /** Whether to show the tree pane on the left. Default: true. */
    showTreePane?: boolean;

    /** Initial width of the tree pane in pixels. Default: 250. */
    treePaneWidth?: number;

    /** Minimum tree pane width in pixels. Default: 150. */
    treePaneMinWidth?: number;

    /** Maximum tree pane width in pixels. Default: 500. */
    treePaneMaxWidth?: number;

    /** Selection mode for the file listing. Default: "multi". */
    selectable?: "single" | "multi";

    /** Context menu items for the right-click menu. */
    contextMenuItems?: FileContextMenuItem[];

    /** CSS height of the entire explorer. Default: "500px". */
    height?: string;

    /** Additional CSS class(es) for the root element. */
    cssClass?: string;

    /** Whether to show the status line at the bottom. Default: true. */
    showStatusLine?: boolean;

    /** Initial sort field. Default: "name". */
    sortField?: "name" | "modified" | "size" | "type";

    /** Initial sort direction. Default: "asc". */
    sortDirection?: "asc" | "desc";

    // -- Callbacks ----------------------------------------------------------

    /** Called when the user navigates into a folder (click in tree or double-click folder in listing). */
    onNavigate?: (folder: FileNode) => void;

    /** Called when the selection changes in the file listing. */
    onSelect?: (files: FileNode[]) => void;

    /** Called when a file is opened (double-click on a file, or Enter on a selected file). */
    onOpen?: (file: FileNode) => void;

    /** Called when inline rename completes. Return true to accept, false to revert. */
    onRename?: (file: FileNode, newName: string) => Promise<boolean>;

    /** Called when delete is requested. Return true if deletion succeeded. */
    onDelete?: (files: FileNode[]) => Promise<boolean>;

    /** Called when files are moved via drag-and-drop. Return true if move succeeded. */
    onMove?: (files: FileNode[], targetFolder: FileNode) => Promise<boolean>;

    /** Called when a new folder is requested. Return the created node, or null on failure. */
    onCreateFolder?: (parentFolder: FileNode, name: string) => Promise<FileNode | null>;

    /** Called when a lazy folder is expanded. Must return the folder's children. */
    onLoadChildren?: (folder: FileNode) => Promise<FileNode[]>;

    /** Called when upload is triggered. Receives the target folder and browser FileList. */
    onUpload?: (folder: FileNode, files: FileList) => Promise<void>;
}
```

### 4.2 Class: FileExplorer

| Method | Signature | Description |
|--------|-----------|-------------|
| `constructor` | `(options: FileExplorerOptions)` | Creates the FileExplorer DOM tree but does not attach to the page. Initialises the internal SplitLayout and TreeView instances. |
| `show` | `(containerId: string)` | Appends the explorer to the container element identified by `containerId`. Renders the initial view. |
| `hide` | `()` | Removes the explorer from the DOM without destroying internal state. |
| `destroy` | `()` | Calls `hide()`, destroys the SplitLayout and TreeView instances, removes all event listeners, and nulls internal references. |
| `getElement` | `(): HTMLElement` | Returns the root `div.fileexplorer` DOM element. |
| `navigate` | `(folderId: string)` | Navigates the content pane to display the contents of the specified folder. Updates breadcrumbs and tree selection. |
| `getSelectedFiles` | `(): FileNode[]` | Returns an array of currently selected file/folder nodes in the content pane. |
| `refresh` | `()` | Re-renders the content pane from the current data model. Preserves selection if selected items still exist. |
| `setViewMode` | `(mode: "grid" \| "list" \| "detail")` | Switches the content pane view mode. Preserves selection and scroll position. |
| `getViewMode` | `(): string` | Returns the current view mode string. |
| `getCurrentFolder` | `(): FileNode` | Returns the FileNode for the currently displayed folder. |
| `getPath` | `(): FileNode[]` | Returns the array of FileNode ancestors from root to the current folder (breadcrumb path). |
| `addFile` | `(file: FileNode, parentId: string)` | Adds a file or folder node under the specified parent. Re-renders if the parent is the current folder. Updates the tree if the added node is a folder. |
| `removeFile` | `(fileId: string)` | Removes a file or folder node by ID. Re-renders the content pane and tree as needed. |
| `updateFile` | `(fileId: string, changes: Partial<FileNode>)` | Updates properties of an existing file node. Re-renders the affected item in the content pane. |
| `setSort` | `(field: string, direction: string)` | Changes the sort field and direction. Re-sorts and re-renders the content pane. |

### 4.3 Convenience Functions

| Function | Description |
|----------|-------------|
| `createFileExplorer(options)` | Creates and returns a FileExplorer instance. |

### 4.4 Global Exports

```
window.FileExplorer
window.createFileExplorer
```

---

## 5. Behaviour

### 5.1 Lifecycle

1. **Construction** -- Builds the DOM tree from `options`. Creates an internal SplitLayout (horizontal, two panes: tree and content). Creates an internal TreeView configured for folder-only display. Does not attach to the page.
2. **show(containerId)** -- Appends to the target container. Renders the initial view (root folder contents in the content pane, full folder tree in the tree pane).
3. **hide()** -- Removes from DOM without destroying state.
4. **destroy()** -- Calls `hide()`, destroys internal SplitLayout and TreeView instances, removes all event listeners, nulls all references.

### 5.2 Navigation

- **Tree pane click**: selecting a folder in the tree navigates the content pane to that folder. The breadcrumb bar updates. The `onNavigate` callback fires.
- **Content pane double-click on folder**: navigates into the folder. Equivalent to a tree pane click.
- **Breadcrumb click**: navigates to the clicked ancestor folder.
- **Navigate programmatically**: `navigate(folderId)` updates the content pane, breadcrumbs, and tree selection.
- The tree pane always highlights the currently displayed folder.

### 5.3 View Modes

#### 5.3.1 Grid View

- Files and folders are displayed as cards in a CSS grid layout.
- Each card shows a large icon (32px) above the file name.
- Cards are 120px wide and auto-wrap based on container width.
- Folders appear before files, each group sorted by the current sort field.
- Selected cards have a `$blue-50` background and `$blue-600` border.

#### 5.3.2 List View

- Files and folders are displayed as compact single-line rows.
- Each row shows a 16px icon, the file name, and optionally the file size (right-aligned).
- Row height is 28px for compact density.
- Folders appear before files.
- Selected rows have a `$blue-50` background.

#### 5.3.3 Detail View

- Files and folders are displayed in a table-like layout with column headers.
- Columns: Name, Modified, Size, Type.
- Column headers are clickable for sorting. The active sort column shows an up or down arrow indicator.
- Row height is 28px for compact density.
- Folders display "--" in the Size column.
- The Type column shows a human-readable file type string derived from `mimeType` or extension.

### 5.4 Sorting

- Sort applies to the content pane file listing only.
- Folders always sort before files regardless of the sort field.
- Within each group (folders, files), items are sorted by the active field and direction.
- Sort fields: `name` (case-insensitive string), `modified` (Date), `size` (number), `type` (string).
- Sort direction: `asc` (ascending, default) or `desc` (descending).
- In detail view, clicking a column header toggles sorting: first click sorts ascending, second click sorts descending, third click resets to name ascending.
- Sort state persists across navigation.

### 5.5 Selection

| Action | Single Mode | Multi Mode |
|--------|-------------|------------|
| Click | Select this item, deselect others | Select this item, deselect others |
| Ctrl+Click | (same as Click) | Toggle this item's selection |
| Shift+Click | (same as Click) | Select contiguous range from last-clicked to this item |
| Ctrl+A | (no effect) | Select all visible items |
| Double-click | Open the item (file: `onOpen`; folder: navigate) | Open the item |
| Click empty area | Deselect all | Deselect all |

- `onSelect` fires after every selection change with the full set of selected items.
- Selection state is cleared when navigating to a different folder.

### 5.6 Breadcrumb Navigation

- The breadcrumb bar renders the path from root to the current folder as clickable segments.
- Segments are separated by a chevron icon (`bi-chevron-right`).
- The last segment (current folder) is displayed as plain text (not clickable).
- Clicking a segment navigates to that folder.
- If `showBreadcrumbs` is false, the breadcrumb bar is not rendered.
- A home icon (`bi-house`) appears as the first segment, representing the root level.

### 5.7 Inline Rename

1. **Trigger**: press F2 while an item is focused, or select "Rename" from the context menu.
2. The file name text is replaced with a text input (`input.fileexplorer-rename-input`) pre-filled with the current name (without extension for files).
3. The input is auto-focused with the name portion selected (not the extension).
4. **Commit**: pressing Enter or blurring the input fires `onRename(file, newName)`.
   - If `onRename` returns `true`, the name updates in the DOM and data model.
   - If `onRename` returns `false`, the name reverts.
5. **Cancel**: pressing Escape reverts without firing `onRename`.
6. Empty names are treated as cancellation.

### 5.8 Context Menu

1. **Trigger**: right-click on a file/folder item, or press Menu / Shift+F10 on a focused item.
2. The context menu renders at the pointer position (or below the item for keyboard triggers).
3. Menu items come from `options.contextMenuItems`.
4. If multiple items are selected and the right-click target is within the selection, the menu applies to all selected items.
5. If the right-click target is not in the current selection, the selection changes to just that item before showing the menu.
6. The menu closes on click outside, Escape, or scroll.
7. The `action` callback on each menu item receives the currently selected `FileNode[]`.

### 5.9 Drag and Drop

1. **Drag start**: mousedown + move on a selected file or folder initiates a drag. Multi-selected items are dragged together.
2. **Drag over tree**: hovering over a folder in the tree pane highlights it as a drop target.
3. **Drag over content pane**: hovering over a folder in the file listing highlights it as a drop target.
4. **Drop**: releasing on a valid folder target fires `onMove(files, targetFolder)`. The consumer performs the data mutation and calls `refresh()`.
5. **Invalid drop targets**: a file cannot be dropped onto itself, its current parent, or any of its own descendants (for folders).
6. Files from the native file system (external drops) are not handled in v1. Only internal drag-and-drop between folders is supported.

### 5.10 Toolbar

When `showToolbar` is true:

- **View mode switcher**: three icon buttons (`bi-grid`, `bi-list-ul`, `bi-list-columns-reverse`) for grid, list, and detail views. The active mode button has `toolbar-tool-active` styling.
- **Sort dropdown**: a dropdown button showing the current sort field. Selecting a field changes the sort and re-renders.
- **New Folder button**: a `bi-folder-plus` button. Clicking fires `onCreateFolder` with the current folder and a default name ("New Folder"). The new folder appears in the listing with inline rename active.
- **Upload button**: a `bi-upload` button. Clicking opens a hidden `<input type="file" multiple>` element. Selected files are passed to `onUpload`.

### 5.11 Tree Pane Integration

The tree pane uses an internal TreeView instance configured as follows:

- `roots`: derived from `options.roots`, filtered to folder nodes only.
- `selectionMode`: `"single"` (only one folder selected at a time).
- `enableDragDrop`: true (for receiving file drops onto folders).
- `onActivate`: triggers `navigate()` to the activated folder.
- `onLoadChildren`: proxied to `options.onLoadChildren`, filtered to return folder children for the tree and all children for the content pane cache.
- The tree pane is rendered inside the left pane of the SplitLayout.

### 5.12 SplitLayout Integration

The component creates a SplitLayout instance with:

- `orientation`: `"horizontal"`.
- `panes`: two panes -- tree pane (initial width from `treePaneWidth`, min `treePaneMinWidth`, max `treePaneMaxWidth`, `collapsible: true`) and content pane (remaining space, min 200px).
- `dividerStyle`: `"line"`.
- When `showTreePane` is false, the tree pane is collapsed on construction.

### 5.13 File Type Icon Mapping

File extensions are mapped to Bootstrap Icons classes:

| Category | Extensions | Icon Class |
|----------|-----------|------------|
| Folder | (directory) | `bi-folder` / `bi-folder-fill` (open) |
| PDF | .pdf | `bi-file-earmark-pdf` |
| Word | .doc, .docx | `bi-file-earmark-word` |
| Excel | .xls, .xlsx, .csv | `bi-file-earmark-spreadsheet` |
| PowerPoint | .ppt, .pptx | `bi-file-earmark-slides` |
| Image | .png, .jpg, .jpeg, .gif, .svg, .webp | `bi-file-earmark-image` |
| Video | .mp4, .avi, .mov, .webm | `bi-file-earmark-play` |
| Audio | .mp3, .wav, .ogg, .flac | `bi-file-earmark-music` |
| Code | .js, .ts, .py, .java, .go, .rs, .c, .cpp, .html, .css | `bi-file-earmark-code` |
| Text | .txt, .log | `bi-file-earmark-text` |
| Markdown | .md | `bi-file-earmark-richtext` |
| Archive | .zip, .tar, .gz, .rar, .7z | `bi-file-earmark-zip` |
| JSON | .json | `bi-file-earmark-code` |
| XML | .xml, .yaml, .yml | `bi-file-earmark-code` |
| Unknown | (default) | `bi-file-earmark` |

If `FileNode.icon` is set, it overrides the auto-mapped icon.

### 5.14 File Size Formatting

File sizes are formatted as human-readable strings:

| Range | Format | Example |
|-------|--------|---------|
| < 1 KB | `N B` | `512 B` |
| 1 KB - 999 KB | `N.N KB` | `145.3 KB` |
| 1 MB - 999 MB | `N.N MB` | `2.4 MB` |
| >= 1 GB | `N.N GB` | `1.2 GB` |

Folders display "--" for size.

### 5.15 Empty State

When a folder has no children:

- The content pane displays an empty state message: "This folder is empty".
- An icon (`bi-folder2-open`) is shown above the message.
- If `onCreateFolder` or `onUpload` is configured, action links appear: "Create a folder" and "Upload files".

---

## 6. Keyboard Interaction

### 6.1 Content Pane Navigation

| Key | Action |
|-----|--------|
| **Tab** | Moves focus into the file listing (to the last-focused item or the first item) |
| **Shift+Tab** | Moves focus out of the file listing |
| **Arrow Down** | Move focus to the next item (list/detail view) or next row (grid view) |
| **Arrow Up** | Move focus to the previous item (list/detail view) or previous row (grid view) |
| **Arrow Right** | Move focus to the next item in the row (grid view only) |
| **Arrow Left** | Move focus to the previous item in the row (grid view only) |
| **Home** | Move focus to the first item |
| **End** | Move focus to the last item |
| **Enter** | Open the focused item (file: `onOpen`; folder: navigate) |
| **Space** | Toggle selection of the focused item (multi mode) |
| **F2** | Start inline rename of the focused item |
| **Delete** | Trigger delete on the selected items (fires `onDelete`) |
| **Ctrl+A** | Select all items (multi mode only) |
| **Escape** | Cancel inline rename or close context menu. Deselect all if no menu/rename is active. |
| **Backspace** | Navigate to the parent folder (breadcrumb back) |
| **Menu / Shift+F10** | Open context menu for the focused item |

### 6.2 Breadcrumb Navigation

| Key | Action |
|-----|--------|
| **Arrow Left** | Move focus to the previous breadcrumb segment |
| **Arrow Right** | Move focus to the next breadcrumb segment |
| **Enter** | Navigate to the focused breadcrumb folder |

### 6.3 Tree Pane

Keyboard navigation within the tree pane follows the TreeView keyboard spec (WAI-ARIA tree pattern). See the TreeView PRD for details.

---

## 7. Accessibility

### 7.1 ARIA Roles and Attributes

| Element | Attribute | Value |
|---------|-----------|-------|
| Root container | `role="region"` | Landmark for the explorer |
| Root container | `aria-label` | "File Explorer" |
| Toolbar | `role="toolbar"` | Toolbar pattern |
| Toolbar | `aria-label` | "File explorer actions" |
| Breadcrumb nav | `role="navigation"` | Navigation landmark |
| Breadcrumb nav | `aria-label` | "Breadcrumb" |
| Breadcrumb list | `role="list"` | Ordered breadcrumb path |
| Breadcrumb item | `role="listitem"` | Individual path segment |
| File listing (grid view) | `role="grid"` | Grid pattern |
| File listing (grid view) | `aria-label` | "Files and folders" |
| File listing (grid view) | `aria-multiselectable` | `"true"` if multi-select |
| Grid item | `role="gridcell"` | Individual file card |
| File listing (list/detail view) | `role="listbox"` | Listbox pattern |
| File listing (list/detail view) | `aria-label` | "Files and folders" |
| File listing (list/detail view) | `aria-multiselectable` | `"true"` if multi-select |
| List/detail row | `role="option"` | Individual file row |
| List/detail row | `aria-selected` | `"true"` or `"false"` |
| Detail column header | `role="columnheader"` | Sortable column |
| Detail column header | `aria-sort` | `"ascending"`, `"descending"`, or `"none"` |
| Context menu | `role="menu"` | Context menu container |
| Context menu item | `role="menuitem"` | Context menu action |
| Empty state | `role="status"` | Announces empty folder |
| Status line | `role="status"` | Item count announcement |
| Inline rename input | `aria-label` | "Rename file" |

### 7.2 Roving Tabindex

- Only one item in the file listing has `tabindex="0"` at a time (the currently focused item). All others have `tabindex="-1"`.
- Arrow keys move focus and update tabindex values.
- The tree pane uses its own roving tabindex (per TreeView spec).

### 7.3 Screen Reader Announcements

- When navigating into a folder: live region announces "Navigated to [folder name], N items".
- When selection changes: live region announces "N items selected".
- When view mode changes: live region announces "Switched to [mode] view".
- When sort changes: live region announces "Sorted by [field], [direction]".
- When a file is renamed: live region announces "Renamed to [new name]".
- When items are deleted: live region announces "N items deleted".
- When a folder is empty: live region announces "This folder is empty".

### 7.4 Focus Management

- After navigation: focus moves to the first item in the new folder listing.
- After delete: focus moves to the next item, or the previous item if the last item was deleted.
- After rename: focus returns to the renamed item.
- After context menu close: focus returns to the item the menu was opened on.
- After view mode change: focus stays on the same item if it still exists.

---

## 8. Styling

### 8.1 CSS Classes

| Class | Description |
|-------|-------------|
| `.fileexplorer` | Root container |
| `.fileexplorer-toolbar` | Toolbar container |
| `.fileexplorer-toolbar-btn` | Toolbar button |
| `.fileexplorer-toolbar-btn-active` | Active view mode button |
| `.fileexplorer-toolbar-separator` | Toolbar separator |
| `.fileexplorer-tree-pane` | Tree pane container |
| `.fileexplorer-content-pane` | Content pane container |
| `.fileexplorer-breadcrumbs` | Breadcrumb navigation bar |
| `.fileexplorer-breadcrumb-item` | Breadcrumb path segment |
| `.fileexplorer-breadcrumb-separator` | Chevron separator between segments |
| `.fileexplorer-breadcrumb-current` | Current folder (non-clickable) |
| `.fileexplorer-grid` | CSS grid container (grid view) |
| `.fileexplorer-grid-item` | File card in grid view |
| `.fileexplorer-grid-item-selected` | Selected file card |
| `.fileexplorer-grid-item-focused` | Focused file card (keyboard) |
| `.fileexplorer-grid-icon` | Large icon in grid card |
| `.fileexplorer-grid-name` | File name in grid card |
| `.fileexplorer-list` | List container (list view) |
| `.fileexplorer-list-row` | File row in list view |
| `.fileexplorer-list-row-selected` | Selected row |
| `.fileexplorer-list-row-focused` | Focused row (keyboard) |
| `.fileexplorer-detail` | Table container (detail view) |
| `.fileexplorer-detail-header` | Column header row |
| `.fileexplorer-detail-header-cell` | Individual column header |
| `.fileexplorer-detail-header-sort` | Sort indicator arrow |
| `.fileexplorer-detail-row` | File row in detail view |
| `.fileexplorer-detail-row-selected` | Selected detail row |
| `.fileexplorer-detail-row-focused` | Focused detail row (keyboard) |
| `.fileexplorer-detail-cell` | Individual cell in detail row |
| `.fileexplorer-icon` | File type icon (all views) |
| `.fileexplorer-name` | File name text (all views) |
| `.fileexplorer-rename-input` | Inline rename text input |
| `.fileexplorer-status` | Status line at bottom |
| `.fileexplorer-empty` | Empty folder state |
| `.fileexplorer-empty-icon` | Icon in empty state |
| `.fileexplorer-empty-message` | Message in empty state |
| `.fileexplorer-empty-action` | Action link in empty state |
| `.fileexplorer-context-menu` | Context menu container |
| `.fileexplorer-context-item` | Context menu button |
| `.fileexplorer-context-item-icon` | Icon within context menu item |
| `.fileexplorer-context-item-label` | Label within context menu item |
| `.fileexplorer-context-item-shortcut` | Shortcut hint in context menu item |
| `.fileexplorer-context-separator` | Context menu separator |
| `.fileexplorer-drop-target` | Drop target highlight on folder |

### 8.2 Theme Integration

| Property | Value | Source / Rationale |
|----------|-------|---------------------|
| Root background | `$gray-50` | Light content background |
| Toolbar background | `$gray-100` | Slightly elevated above content |
| Toolbar border | `1px solid $gray-200` bottom | Subtle separation |
| Toolbar button default | `transparent` background | Clean, icon-forward |
| Toolbar button hover | `$gray-200` background | Subtle highlight |
| Toolbar button active | `$blue-100` background, `$blue-700` icon | Active view mode |
| Breadcrumb background | `$gray-50` | Matches content pane |
| Breadcrumb text | `$gray-600` | Subdued path text |
| Breadcrumb current | `$gray-900`, `$font-weight-semibold` | Emphasised current folder |
| Breadcrumb separator | `$gray-400`, `bi-chevron-right` | Light separator |
| Breadcrumb hover | `$blue-600` text | Link affordance |
| Grid item background | `$gray-50` | Cards on content background |
| Grid item border | `1px solid $gray-200` | Subtle card boundary |
| Grid item hover | `$gray-100` background | Hover highlight |
| Grid item selected | `$blue-50` background, `2px solid $blue-600` border | Clear selection |
| Grid item focused | `2px solid $blue-400` outline | Keyboard focus ring |
| Grid icon colour | `$gray-600` | Neutral file icons |
| Grid icon folder colour | `$warning` (`#ffc107`) | Standard folder colour |
| List/detail row height | 28px | Compact enterprise density |
| List/detail row hover | `$gray-100` background | Subtle highlight |
| List/detail row selected | `$blue-50` background | Selection indicator |
| List/detail row focused | `1px dotted $gray-500` outline | Keyboard focus ring |
| Detail header background | `$gray-100` | Column header distinction |
| Detail header text | `$gray-600`, `$font-size-sm`, `$font-weight-semibold` | Subdued but readable |
| Detail header hover | `$gray-200` background | Sortable affordance |
| Sort indicator | `$gray-900` | Clear sort direction |
| File name text | `$gray-900`, `$font-size-sm` | Readable at compact size |
| File size text | `$gray-500`, `$font-size-sm` | Secondary information |
| File date text | `$gray-500`, `$font-size-sm` | Secondary information |
| File type text | `$gray-500`, `$font-size-sm` | Secondary information |
| Context menu background | `$gray-50` | Standard dropdown |
| Context menu border | `1px solid $gray-300` | Matches Bootstrap dropdown |
| Context menu shadow | `0 2px 8px rgba(0,0,0,0.15)` | Elevation |
| Context menu item hover | `$gray-100` background | Standard dropdown hover |
| Status line background | `$gray-100` | Footer distinction |
| Status line text | `$gray-500`, `$font-size-sm` | Subdued information |
| Empty state text | `$gray-500`, italic | Subtle empty feedback |
| Empty state icon | `$gray-300`, 48px | Large subdued icon |
| Empty state action link | `$blue-600` | Standard link colour |
| Drop target highlight | `2px dashed $blue-400` | Drag-and-drop affordance |
| Rename input | `form-control-sm`, `$blue-200` border | Editing state |

### 8.3 SCSS Import

```scss
@import '../../src/scss/variables';
```

### 8.4 Dimensions

| Element | Size | Notes |
|---------|------|-------|
| Toolbar height | 36px | Matches Toolbar component compact size |
| Breadcrumb bar height | 28px | Compact path display |
| Grid item width | 120px | Fixed-width cards, auto-wrap |
| Grid item height | 100px | Icon (32px) + padding + name |
| Grid icon size | 32px | Prominent file type indicator |
| List/detail row height | 28px | Compact density |
| List/detail icon size | 16px | Inline with text |
| Status line height | 24px | Minimal footer |
| Context menu min width | 160px | Readable menu items |
| Context menu max width | 280px | Prevents overly wide menus |
| Rename input height | 24px | Matches row height |

### 8.5 Z-Index

| Element | Z-Index | Rationale |
|---------|---------|-----------|
| Explorer container | Auto (flow) | Normal stacking context |
| Context menu | 1050 | Above tree content, above Bootstrap dropdowns (1000) |
| Drag ghost | 1051 | Above context menu during drag |
| Inline rename input | Auto | Within row flow |

---

## 9. Dependencies

| Dependency | Type | Purpose |
|------------|------|---------|
| SplitLayout | Hard (internal component) | Two-pane resizable layout for tree and content panes |
| TreeView | Hard (internal component) | Folder tree navigation in the left pane |
| Bootstrap 5 CSS | Soft (theme) | `$gray-*`, `$blue-*` variables, `form-control-sm` classes |
| Bootstrap Icons | Soft (icons) | File type and action icons (`bi-*` classes) |

No external JavaScript framework dependencies. No external file manager libraries.

---

## 10. Edge Cases

| Scenario | Behaviour |
|----------|-----------|
| Empty roots array | Content pane shows empty state. Tree pane shows empty tree message. |
| Single root folder | Root folder contents displayed. Breadcrumb shows home icon only. |
| Deeply nested folders (20+ levels) | Breadcrumb truncates with an ellipsis dropdown for middle segments. Tree pane scrolls normally. |
| Very long file names | Names are truncated with ellipsis in grid view. In list/detail views, the name column expands up to a maximum width, then truncates. Full name shown via `title` attribute tooltip. |
| Thousands of files in one folder | Content pane renders all items. Virtual scrolling is out of scope for v1 but documented as a future consideration. |
| Folder with only subfolders | No files displayed, only folders. Status line shows "N folders". |
| Folder with only files | No folders displayed, only files. Status line shows "N files". |
| Lazy load failure | Content pane shows an error message in the listing area. Console warning logged with `LOG_PREFIX`. |
| Rename to empty string | Treated as cancel. Original name restored. |
| Rename to name with forbidden characters | Consumer validates in `onRename` callback. Component does not enforce naming rules. |
| Delete last item in folder | Empty state displayed. Focus moves to breadcrumb or toolbar. |
| Drag folder onto its own descendant | Drop is rejected. No callback fired. |
| Drag onto a file (not a folder) | Drop is rejected. File items are not valid drop targets. |
| Tree pane hidden | SplitLayout tree pane is collapsed. Content pane takes full width. Breadcrumbs remain for navigation. |
| Context menu at viewport edge | Menu repositions to stay within viewport bounds. |
| Destroy while context menu open | Menu is removed. All event listeners cleaned up. |
| Destroy while rename is active | Rename is cancelled. DOM is cleaned up. |
| Container element not found | `show()` throws with a descriptive error message. |
| `navigate()` to non-existent folder ID | Console warning logged. No navigation occurs. |
| `addFile()` to current folder | Item appears immediately in the content pane listing. |
| `removeFile()` of selected item | Item is deselected before removal. `onSelect` fires. |
| View mode change during rename | Rename is cancelled. View mode switches. |
| Sort change during rename | Rename is committed or cancelled before re-sort. |

---

## 11. Logging

All log statements use the pattern:

```typescript
const LOG_PREFIX = "[FileExplorer]";
```

| Level | When | Example |
|-------|------|---------|
| `console.log` | Component lifecycle events | `[FileExplorer] Initialised with 3 roots in container #file-browser` |
| `console.log` | Navigation events | `[FileExplorer] Navigated to folder "Reports" (id: folder-123)` |
| `console.log` | View mode changes | `[FileExplorer] View mode changed to "detail"` |
| `console.warn` | Recoverable issues | `[FileExplorer] Lazy load failed for folder "Reports": timeout` |
| `console.warn` | Data issues | `[FileExplorer] Folder ID "xyz" not found for navigate()` |
| `console.error` | Unrecoverable errors | `[FileExplorer] Container element #file-browser not found` |
| `console.debug` | Verbose diagnostics | `[FileExplorer] Rendering 42 items in detail view` |

---

## 12. Testing Considerations

### 12.1 Unit Tests

| Area | Test Cases |
|------|------------|
| Rendering | Empty explorer, single root, multiple roots, nested folders |
| Navigation | Tree click navigates, breadcrumb click navigates, double-click folder navigates, `navigate()` API |
| View modes | Grid rendering, list rendering, detail rendering, view mode switch preserves selection |
| Sorting | Sort by each field, ascending/descending, detail header click toggle, folders before files |
| Selection (single) | Click selects, click another deselects first, `getSelectedFiles()` |
| Selection (multi) | Click, Ctrl+Click toggle, Shift+Click range, Ctrl+A, click empty deselects all |
| Breadcrumbs | Path segments correct, click navigates, current folder non-clickable, home icon |
| Inline rename | F2 trigger, Enter commit, Escape cancel, empty string cancel, `onRename` validation |
| Context menu | Right-click open, keyboard open, item click, Escape close, multi-selection context |
| Drag and drop | Drag file to folder in tree, drag file to folder in listing, invalid drop rejection |
| Toolbar | View mode buttons, sort dropdown, new folder button, upload button |
| Lazy loading | Folder expand triggers `onLoadChildren`, loading spinner, failure handling |
| File type icons | Extension mapping, mimeType mapping, custom icon override |
| File size formatting | Bytes, KB, MB, GB formatting |
| API methods | `addFile`, `removeFile`, `updateFile`, `navigate`, `refresh`, `setViewMode`, `setSort` |

### 12.2 Accessibility Tests

| Test | Expectation |
|------|-------------|
| ARIA roles present | Grid/listbox roles on file listing, region on root, toolbar on toolbar |
| `aria-selected` set | Present on selectable items with correct value |
| `aria-sort` set | Present on detail column headers with correct value |
| Roving tabindex | Only one item has `tabindex="0"` at a time |
| Keyboard navigation | All keys from section 6 work correctly |
| Screen reader announcements | Live region updates for navigation, selection, view mode, sort |
| Focus management | Focus moves correctly after navigation, delete, rename, menu close |

---

## 13. Files

| File | Purpose |
|------|---------|
| `specs/fileexplorer.prd.md` | This specification |
| `components/fileexplorer/fileexplorer.ts` | TypeScript source |
| `components/fileexplorer/fileexplorer.scss` | Styles |
| `components/fileexplorer/README.md` | Consumer documentation |

---

## 14. Implementation Notes

### 14.1 File Node Index Map

Maintain a `Map<string, FileNode>` mapping node IDs to their data objects. Built via iterative DFS on construction and `navigate()`. Enables O(1) lookups for `navigate()`, `addFile()`, `removeFile()`, `updateFile()`, and breadcrumb path construction.

### 14.2 Parent Map

Maintain a `Map<string, string>` mapping node IDs to parent IDs. Enables O(1) parent lookup for breadcrumb path construction (walk from current folder to root) and drag-and-drop ancestor validation.

### 14.3 Current Folder State

Track the currently displayed folder via `currentFolderId: string`. All content pane rendering reads children from `nodeMap.get(currentFolderId).children`. Navigation updates this state, clears selection, and re-renders.

### 14.4 Selection State

Maintain a `Set<string>` of selected file/folder IDs. Updated on click interactions and API calls. Cleared on navigation.

### 14.5 SplitLayout Initialisation

```typescript
const splitLayout = new SplitLayout({
    orientation: "horizontal",
    panes:
    [
        {
            id: "tree",
            initialSize: options.treePaneWidth ?? 250,
            minSize: options.treePaneMinWidth ?? 150,
            maxSize: options.treePaneMaxWidth ?? 500,
            collapsible: true,
            collapsed: !(options.showTreePane ?? true)
        },
        {
            id: "content",
            minSize: 200
        }
    ],
    dividerSize: 4,
    dividerStyle: "line"
});
```

### 14.6 TreeView Initialisation

```typescript
const treeView = new TreeView({
    containerId: treeContainerId,
    roots: buildFolderOnlyTree(options.roots),
    selectionMode: "single",
    enableDragDrop: true,
    showSearch: false,
    indentPx: 16,
    height: "100%",
    width: "100%",
    nodeTypes:
    {
        folder:
        {
            kind: "folder",
            icon: "bi-folder",
            isParent: true,
            droppable: true
        }
    },
    onActivate: (node) => this.navigate(node.id),
    onDrop: (sourceNodes, targetNode, position) =>
    {
        if (position === "inside" && options.onMove)
        {
            const files = sourceNodes.map(n => this.nodeMap.get(n.id)).filter(Boolean);
            const target = this.nodeMap.get(targetNode.id);
            if (target) options.onMove(files as FileNode[], target);
        }
    }
});
```

### 14.7 Context Menu Lifecycle

Follow the same pattern established in the TreeView component:
1. On `contextmenu` event, prevent the browser's native context menu.
2. Build menu items from `options.contextMenuItems`.
3. Position at pointer coordinates. Adjust for viewport overflow.
4. Register one-time `pointerdown` listener on `document` for click-outside (deferred via `setTimeout(0)`).
5. Register one-time `keydown` listener for Escape.
6. On item click or Escape, remove menu, deregister listeners, return focus.

### 14.8 Event Delegation

- Use a single `click` listener on the content pane container, delegating to items via `event.target.closest(".fileexplorer-grid-item")` or `.fileexplorer-list-row` or `.fileexplorer-detail-row`.
- Use a single `dblclick` listener on the content pane container.
- Use a single `contextmenu` listener on the content pane container.
- Use a single `keydown` listener on the content pane container.

### 14.9 Defensive Destroy

The `destroy()` method must:
1. Set an internal `destroyed` flag.
2. Destroy the internal SplitLayout instance.
3. Destroy the internal TreeView instance.
4. Close any open context menu.
5. Cancel any active inline rename.
6. Remove all event listeners.
7. Clear the node map, parent map, and selection set.
8. Remove all child DOM elements from the container.
9. Null internal references to prevent memory leaks.

---

## 15. Future Considerations (Out of Scope for v1)

These features are explicitly deferred:

- **Virtual scrolling** — for folders with 10,000+ files. Would render only visible items in the viewport.
- **Thumbnail previews** — actual image thumbnails in grid view instead of file type icons.
- **Search/filter** — text input to filter visible files by name within the current folder.
- **Column customisation** — show/hide/reorder columns in detail view.
- **External file drop** — accepting files dragged from the native file system.
- **Clipboard operations** — Cut/Copy/Paste with Ctrl+X/C/V keyboard shortcuts.
- **Batch operations** — progress indicator for bulk move/delete/copy operations.
- **Path input** — editable text field in the breadcrumb bar for direct path entry.
- **Favorites/bookmarks** — starred folders for quick access.
- **File preview pane** — third pane showing a preview of the selected file.
