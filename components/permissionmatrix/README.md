# PermissionMatrix

Interactive RBAC permission matrix with roles as columns and grouped permissions as rows. Features tri-state checkboxes, inheritance resolution, bulk operations, search/filter, change tracking, sticky headers, and JSON export.

## Usage

```html
<link rel="stylesheet" href="dist/components/permissionmatrix/permissionmatrix.css">
<script src="dist/components/permissionmatrix/permissionmatrix.js"></script>
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
| `showReset` | `boolean` | `true` | Show reset button |
| `showChangeCounter` | `boolean` | `true` | Show pending changes counter |
| `showInheritance` | `boolean` | `true` | Resolve and display inherited permissions |
| `showChangeHighlight` | `boolean` | `true` | Highlight cells with pending changes |
| `enableGroupBulk` | `boolean` | `true` | Enable bulk grant/deny per group row |
| `height` | `string` | `"400px"` | Container height |

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount to container |
| `hide()` | Remove from DOM |
| `destroy()` | Full cleanup |
| `setRoles(roles)` | Replace role columns |
| `setGroups(groups)` | Replace permission groups |
| `setCells(cells)` | Replace cell states |
| `getState()` | Get current state map |
| `getPendingChanges()` | Get array of pending changes |
| `resetChanges()` | Revert all pending changes |
| `exportData(format)` | Export matrix data as JSON |
| `refresh()` | Re-render the grid |

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
