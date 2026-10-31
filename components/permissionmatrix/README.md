# PermissionMatrix

Interactive RBAC permission matrix with roles as columns and grouped permissions as rows. Features tri-state checkboxes, inheritance resolution, bulk operations, search/filter, change tracking, sticky headers, and JSON export.

## Usage

```html
<link rel="stylesheet" href="components/permissionmatrix/permissionmatrix.css">
<script src="components/permissionmatrix/permissionmatrix.js"></script>
```

```javascript
const matrix = createPermissionMatrix({
    roles: [
        { id: "admin", name: "Admin", description: "Full access" },
        { id: "editor", name: "Editor", inheritsFrom: "viewer" },
        { id: "viewer", name: "Viewer" }
    ],
    groups: [
        {
            id: "content",
            name: "Content",
            permissions: [
                { id: "content.read", name: "Read" },
                { id: "content.write", name: "Write" },
                { id: "content.delete", name: "Delete" }
            ]
        }
    ],
    cells: [
        { roleId: "admin", permissionId: "content.read", state: "granted" },
        { roleId: "admin", permissionId: "content.write", state: "granted" },
        { roleId: "viewer", permissionId: "content.read", state: "granted" }
    ],
    onChange: (change) => console.log("Changed:", change)
}, "my-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `roles` | `Role[]` | `[]` | Role columns |
| `groups` | `PermissionGroup[]` | `[]` | Permission groups with nested permissions |
| `cells` | `MatrixCell[]` | `[]` | Initial state for each role-permission pair |
| `readOnly` | `boolean` | `false` | Disable all editing |
| `showFilter` | `boolean` | `true` | Show search filter input |
| `filterDebounceMs` | `number` | `250` | Filter debounce delay (ms) |
| `showExport` | `boolean` | `true` | Show export button |
| `showReset` | `boolean` | `true` | Show the Reset button: it discards the unsaved edits, or calls `onReset` when given |
| `showChangeCounter` | `boolean` | `true` | Show pending changes counter |
| `showInheritance` | `boolean` | `true` | Resolve and display inherited permissions |
| `showChangeHighlight` | `boolean` | `true` | Highlight cells with pending changes |
| `enableGroupBulk` | `boolean` | `true` | Enable bulk grant/deny per group row |
| `enableRoleBulk` | `boolean` | `false` | A control under each role heading that grants or denies all its permissions |
| `enablePermissionBulk` | `boolean` | `false` | A control beside each permission that grants or denies it for every editable role |
| `stickyHeader` | `boolean` | `true` | Keep the role headings visible while scrolling vertically |
| `stickyFirstColumn` | `boolean` | `true` | Keep the permission names visible while scrolling horizontally |
| `height` | `string` | `"400px"` | Container height |

## API

| Method | Description |
|--------|-------------|
| `show(containerOrId)` | Mount into a container element or an element id |
| `hide()` | Remove from the DOM |
| `destroy()` | Full cleanup |
| `getElement()` | The root element, or `null` once destroyed |
| `setData(roles, groups, cells)` | Replace all three, clearing pending changes |
| `setData(slot, value)` | Replace `"roles"`, `"groups"` or `"cells"` alone; `"cells"` is a new baseline and clears pending changes (readiness step 3) |
| `setCellState(roleId, permissionId, state)` | Set one cell, tracked as a pending change; fires no callback |
| `getCellState(roleId, permissionId)` | The cell's explicit state |
| `getEffectiveState(roleId, permissionId)` | The state after inheritance |
| `getChanges()` | The pending changes |
| `clearChanges()` | Accept the pending changes as the new baseline (it does not revert them) |
| `expandGroup(id)` / `collapseGroup(id)` / `expandAllGroups()` / `collapseAllGroups()` | Show or hide group rows |
| `setFilter(text)` / `clearFilter()` | Filter the permissions by name |
| `exportData(format?)` | The matrix as `MatrixExportData`; only `"json"` is supported, and `"csv"` throws (ADR-200) |
| `setReadOnly(readOnly)` | Turn editing off or on |
| `refresh()` | Re-render the grid |
| `on(channel, handler)` | Subscribe to `change`, `bulkchange`, `export` or `reset`; returns the unsubscribe (readiness step 3) |
| `getState()` / `setState(state)` | The unsaved edits, expanded groups and filter; restored without firing callbacks (readiness step 3) |

## Permission States

| State | Icon | Colour | Description |
|-------|------|--------|-------------|
| `granted` | Check circle | Green | Explicitly granted |
| `denied` | X circle | Gray | Explicitly denied |
| `inherited` | Arrow down-right | Blue | Inherited from parent role |
| `none` | Dashed box | Gray | No explicit state |

## Keyboard

| Key | Action |
|-----|--------|
| `Arrow keys` | Navigate between cells |
| `Space` / `Enter` | Toggle cell state |
| `Tab` / `Shift+Tab` | Move focus between controls |

The grid is a roving tabindex: exactly one cell carries `tabindex="0"` and
the rest carry `-1`, so `Tab` enters the matrix once and the arrow keys move
within it. Before 2026-10-21 no cell was ever given the 0 at build time, so
Tab skipped the matrix entirely and it could not be reached by keyboard
(UNUSED-1).
