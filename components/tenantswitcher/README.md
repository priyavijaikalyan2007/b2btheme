# TenantSwitcher

Dropdown or modal control for switching between organisational tenants and tenants.

## Usage

```html
<link rel="stylesheet" href="components/tenantswitcher/tenantswitcher.css">
<script src="components/tenantswitcher/tenantswitcher.js"></script>
```

```javascript
const switcher = createTenantSwitcher({
    tenants: [
        { id: "1", name: "Acme Corp", icon: "bi-building", role: "Owner" },
        { id: "2", name: "Beta Industries", role: "Admin", memberCount: 8 },
        { id: "3", name: "Gamma Retail", avatarUrl: "/img/gamma.png", role: "Member" },
    ],
    activeTenantId: "1",
    mode: "dropdown",
    onSwitch: (ws) => console.log("Switched to:", ws.name),
    onCreate: () => console.log("Create tenant"),
}, "my-container");
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tenants` | `Tenant[]` | Required | Available tenants |
| `activeTenantId` | `string` | Required | Currently active tenant ID |
| `mode` | `"dropdown" \| "modal"` | `"dropdown"` | Display mode |
| `showSearch` | `boolean` | Auto (>5) | Show search input |
| `showCreateButton` | `boolean` | `true` | Show create tenant button |
| `showMemberCount` | `boolean` | `false` | Show member count |
| `showRole` | `boolean` | `true` | Show user role badge |
| `showPlan` | `boolean` | `false` | Show plan badge |
| `size` | `"sm" \| "default" \| "lg"` | `"default"` | Size variant |
| `onSwitch` | `(ws) => void` | - | Tenant switched callback |
| `onCreate` | `() => void` | - | Create button callback |
| `onSearch` | `(q) => Promise<Tenant[]>` | - | Server-side search |

## API

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount to container |
| `hide()` | Remove from DOM |
| `destroy()` | Full cleanup |
| `open()` | Programmatic open |
| `close()` | Programmatic close |
| `isOpen()` | Check open state |
| `getActiveTenant()` | Get active tenant |
| `setActiveTenant(id)` | Set active tenant |
| `setTenants(ws[])` | Replace tenant list |
| `addTenant(ws)` | Add a tenant |
| `removeTenant(id)` | Remove a tenant |

## Keyboard

| Key | Action |
|-----|--------|
| Enter / Space | Open/select |
| Escape | Close |
| Arrow Up/Down | Navigate items |
| Home / End | First/last item |
