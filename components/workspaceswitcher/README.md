# WorkspaceSwitcher

Dropdown or modal control for switching between organisational workspaces and tenants.

## Usage

```html
<link rel="stylesheet" href="dist/components/workspaceswitcher/workspaceswitcher.css">
<script src="dist/components/workspaceswitcher/workspaceswitcher.js"></script>
```

```javascript
const switcher = createWorkspaceSwitcher({
    workspaces: [
        { id: "1", name: "Acme Corp", icon: "bi-building", role: "Owner" },
        { id: "2", name: "Beta Industries", role: "Admin", memberCount: 8 },
        { id: "3", name: "Gamma Retail", avatarUrl: "/img/gamma.png", role: "Member" },
    ],
    activeWorkspaceId: "1",
    mode: "dropdown",
    onSwitch: (ws) => console.log("Switched to:", ws.name),
    onCreate: () => console.log("Create workspace"),
}, "my-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `workspaces` | `Workspace[]` | Required | Available workspaces |
| `activeWorkspaceId` | `string` | Required | Currently active workspace ID |
| `mode` | `"dropdown" \| "modal"` | `"dropdown"` | Display mode |
| `showSearch` | `boolean` | Auto (>5) | Show search input |
| `showCreateButton` | `boolean` | `true` | Show create workspace button |
| `showMemberCount` | `boolean` | `false` | Show member count |
| `showRole` | `boolean` | `true` | Show user role badge |
| `showPlan` | `boolean` | `false` | Show plan badge |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onSwitch` | `(ws) => void` | - | Workspace switched callback |
| `onCreate` | `() => void` | - | Create button callback |
| `onSearch` | `(q) => Promise<Workspace[]>` | - | Server-side search |

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount to container |
| `hide()` | Remove from DOM |
| `destroy()` | Full cleanup |
| `open()` | Programmatic open |
| `close()` | Programmatic close |
| `isOpen()` | Check open state |
| `getActiveWorkspace()` | Get active workspace |
| `setActiveWorkspace(id)` | Set active workspace |
| `setWorkspaces(ws[])` | Replace workspace list |
| `addWorkspace(ws)` | Add a workspace |
| `removeWorkspace(id)` | Remove a workspace |

## Keyboard

| Key | Action |
|-----|--------|
| Enter / Space | Open/select |
| Escape | Close |
| Arrow Up/Down | Navigate items |
| Home / End | First/last item |
