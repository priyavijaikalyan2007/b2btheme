# UserMenu

Avatar-triggered dropdown menu for user account actions. Shows user avatar (image or initials), name, role, status dot, and a dropdown menu with grouped items, dividers, headers, and a sign-out action.

## Assets

| Asset | Path |
|-------|------|
| TypeScript source | `components/usermenu/usermenu.ts` |
| SCSS source | `components/usermenu/usermenu.scss` |
| Compiled JS | `dist/components/usermenu/usermenu.js` |
| Compiled CSS | `dist/components/usermenu/usermenu.css` |

## Quick Start

### Include Assets

```html
<link rel="stylesheet" href="dist/components/usermenu/usermenu.css">
<script src="dist/components/usermenu/usermenu.js"></script>
```

### With Image Avatar

```javascript
var menu = createUserMenu("my-container", {
    userName: "John Smith",
    userRole: "Administrator",
    avatarUrl: "/img/john.png",
    status: "online",
    menuItems: [
        { id: "settings", label: "Settings", icon: "bi-gear" },
        { id: "profile",  label: "Profile",  icon: "bi-person" },
        { id: "divider-1", label: "", type: "divider" },
        { id: "sign-out", label: "Sign Out", icon: "bi-box-arrow-right", danger: true },
    ],
    onItemClick: function(itemId) { console.log("Clicked:", itemId); },
    onSignOut: function() { console.log("Signing out"); },
});
```

### With Initials Avatar

```javascript
var menu = createUserMenu("my-container", {
    userName: "Jane Doe",
    userRole: "Developer",
    status: "busy",
    menuItems: [
        { id: "account-header", label: "Account", type: "header" },
        { id: "settings", label: "Settings", icon: "bi-gear" },
        { id: "profile",  label: "Profile",  icon: "bi-person" },
        { id: "divider-1", label: "", type: "divider" },
        { id: "help-header", label: "Help", type: "header" },
        { id: "docs",     label: "Documentation", icon: "bi-book" },
        { id: "support",  label: "Support",       icon: "bi-life-preserver" },
        { id: "divider-2", label: "", type: "divider" },
        { id: "sign-out", label: "Sign Out", icon: "bi-box-arrow-right", danger: true },
    ],
    onItemClick: function(itemId) { console.log("Clicked:", itemId); },
});
```

### Programmatic Status Change

```javascript
// Update status dot
menu.setStatus("away");

// Update name and role
menu.setUserName("John A. Smith");
menu.setUserRole("Senior Administrator");

// Switch to image avatar
menu.setAvatarUrl("/img/john-new.png");

// Replace menu items
menu.setMenuItems([
    { id: "settings", label: "Settings", icon: "bi-gear" },
    { id: "sign-out", label: "Sign Out", icon: "bi-box-arrow-right", danger: true },
]);
```

## API

### Factory Function

| Function | Description |
|----------|-------------|
| `createUserMenu(containerId, options)` | Create a UserMenu and mount it into the specified container |

### Public Methods

| Method | Description |
|--------|-------------|
| `show(containerId)` | Mount the component into a container element |
| `hide()` | Remove from DOM and detach listeners |
| `destroy()` | Full cleanup, nullify all references |
| `getElement()` | Return the root HTMLElement (or null if destroyed) |
| `open()` | Programmatically open the dropdown |
| `close()` | Programmatically close the dropdown |
| `isOpen()` | Returns true if the dropdown is currently open |
| `setStatus(status)` | Update the status dot ("online", "offline", "busy", "away") |
| `setUserName(name)` | Update the displayed user name |
| `setUserRole(role)` | Update the displayed role in the dropdown header |
| `setAvatarUrl(url)` | Switch the avatar to an image |
| `setMenuItems(items)` | Replace the entire menu item list |

## UserMenuOptions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `userName` | `string` | Required | Display name |
| `userRole` | `string` | `""` | Role label shown in dropdown header |
| `avatarUrl` | `string` | - | Image URL for avatar |
| `avatarInitials` | `string` | Auto-derived | Override initials text |
| `avatarColor` | `string` | Auto-derived | Override initials background colour |
| `status` | `string` | - | Status dot: "online", "offline", "busy", "away" |
| `menuItems` | `UserMenuItem[]` | Required | Array of menu items |
| `onItemClick` | `(itemId: string) => void` | - | Callback when any item is clicked |
| `onSignOut` | `() => void` | - | Convenience callback for the "sign-out" item ID |
| `size` | `"sm" \| "md" \| "lg"` | `"md"` | Size variant |
| `cssClass` | `string` | - | Additional CSS class(es) on root |
| `keyBindings` | `Partial<Record<string, string>>` | - | Override default key combos |

## UserMenuItem

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | `string` | Required | Unique identifier |
| `label` | `string` | Required | Display text |
| `icon` | `string` | - | Bootstrap icon class (e.g. "bi-gear") |
| `type` | `"item" \| "divider" \| "header"` | `"item"` | Entry type |
| `disabled` | `boolean` | `false` | Greyed out, non-interactive |
| `danger` | `boolean` | `false` | Red styling for destructive actions |

## Status Values

| Status | Dot Colour | Description |
|--------|------------|-------------|
| `online` | Green | User is active and available |
| `offline` | Grey | User is disconnected |
| `busy` | Red | User is occupied, do not disturb |
| `away` | Yellow | User is temporarily away |

## Keyboard Shortcuts

### When Trigger is Focused

| Key | Action |
|-----|--------|
| Enter / Space | Toggle dropdown open/close |
| Arrow Down | Open dropdown and focus first item |

### When Dropdown is Open

| Key | Action |
|-----|--------|
| Arrow Down | Focus next item (wraps, skips disabled) |
| Arrow Up | Focus previous item (wraps, skips disabled) |
| Home | Focus first item |
| End | Focus last item |
| Enter | Activate focused item |
| Escape | Close dropdown, return focus to trigger |

All key bindings can be overridden via the `keyBindings` option. See `DEFAULT_KEY_BINDINGS` in the source for action names.

## Accessibility

- Trigger button has `role` button with `aria-haspopup="menu"` and `aria-expanded`
- Dropdown container has `role="menu"` with `aria-label="User menu"`
- Each actionable item has `role="menuitem"` with `tabindex="-1"`
- Disabled items have `aria-disabled="true"`
- Full keyboard navigation: Enter/Space to toggle, arrows to navigate, Escape to close
- Focus is managed programmatically: opening focuses the first item, closing returns focus to trigger
- Icon elements have `aria-hidden="true"` to prevent screen reader noise
